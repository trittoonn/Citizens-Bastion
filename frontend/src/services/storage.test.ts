import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAllCards,
  saveCustomCard,
  deleteCustomCard,
  getAllDecks,
  saveDeck,
  validateDeckLocal,
  generateCardDescription,
  exportCardToCode,
  exportCardsToCode,
  exportDeckToCode,
  exportCollectionToCode,
  importShareCode,
  resetCollectionToDefaults,
  permanentlyDeleteCard,
  deleteDeck,
  getCardLayoutConfig,
  saveCardLayoutConfig,
  getLastSelectedDeckId,
  saveLastSelectedDeckId,
  getLastSelectedAiDeckId,
  saveLastSelectedAiDeckId,
} from './storage';
import { CardDefinition, DeckPreset } from '../types/game';

describe('localStorage Card & Deck Studio Service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('seeds the canonical cards from Citizens Bastion by default', () => {
    const cards = getAllCards();
    expect(cards.length).toBeGreaterThanOrEqual(45);
    expect(cards.some((c) => c.id === 'caballero_galardonado')).toBe(true);
    expect(cards.some((c) => c.id === 'pacto_de_sacrificio')).toBe(true);
    expect(cards.some((c) => c.id === 'asesino')).toBe(true);
    expect(cards.some((c) => c.id === 'fabrica_de_robots')).toBe(true);
    expect(cards.some((c) => c.id === 'general_brazo_de_canon')).toBe(true);
    expect(cards.some((c) => c.id === 'espidi')).toBe(true);
    expect(cards.some((c) => c.id === 'cientifico_loco')).toBe(true);
    expect(cards.some((c) => c.id === 'retirada')).toBe(true);
  });

  it('creates and deletes custom cards in localStorage', () => {
    const baseCount = getAllCards().length;
    const custom: CardDefinition = {
      id: 'custom_arquero',
      name: 'Arquero del Bastión',
      type: 'citizen',
      vitality: 5,
      description: generateCardDescription([
        {
          trigger: 'on_play',
          steps: [
            {
              op: 'deal_damage',
              amount: 2,
              target: { requirement: 'single_card', owner: 'enemy' },
            },
          ],
        },
      ]),
    };

    const afterSave = saveCustomCard(custom);
    expect(afterSave.length).toBe(baseCount + 1);
    const saved = afterSave.find((c) => c.id === 'custom_arquero');
    expect(saved?.isCustom).toBe(true);
    expect(saved?.description).toContain('Al jugar: Hace 2 de daño');

    const afterDelete = deleteCustomCard('custom_arquero');
    expect(afterDelete.length).toBe(baseCount);

    // Editing an existing canonical default card updates it in place and syncs decks
    const origCab = afterDelete.find((c) => c.id === 'caballero_galardonado')!;
    const editedCab: CardDefinition = {
      ...origCab,
      vitality: 14,
      hasShield: true,
      description: 'Escudo. Veterano del Bastión.',
    };
    const afterEditDefault = saveCustomCard(editedCab);
    expect(afterEditDefault.length).toBe(baseCount);
    const updatedCab = afterEditDefault.find((c) => c.id === 'caballero_galardonado');
    expect(updatedCab?.vitality).toBe(14);
    expect(updatedCab?.hasShield).toBe(true);

    const deckWithCab = getAllDecks().find((d) =>
      d.cards.some((c) => c.id === 'caballero_galardonado')
    );
    const deckCab = deckWithCab?.cards.find((c) => c.id === 'caballero_galardonado');
    expect(deckCab?.vitality).toBe(14);

    // Deleting/restoring an edited default card restores its canonical 8V version
    const afterRestoreDefault = deleteCustomCard('caballero_galardonado');
    expect(
      afterRestoreDefault.find((c) => c.id === 'caballero_galardonado')?.vitality
    ).toBe(8);
  });

  it('supports optional deck constraints (warnings when unenforced, errors when enforced)', () => {
    const decks = getAllDecks();
    expect(decks.length).toBeGreaterThanOrEqual(2);

    const tinyDeck = [getAllCards()[0]];
    const unenforced = validateDeckLocal(tinyDeck, {
      enforced: false,
      minCards: 15,
      maxCards: 40,
      maxCopiesPerCard: 3,
    });
    expect(unenforced.valid).toBe(true);
    expect(unenforced.warnings.length).toBeGreaterThan(0);

    const enforced = validateDeckLocal(tinyDeck, {
      enforced: true,
      minCards: 15,
      maxCards: 40,
      maxCopiesPerCard: 3,
    });
    expect(enforced.valid).toBe(false);
    expect(enforced.errors.length).toBeGreaterThan(0);

    const updatedDecks = saveDeck({
      id: 'custom_deck_1',
      name: 'Mi Mazo Personalizado',
      description: 'Mazo de prueba',
      cards: tinyDeck,
    });
    expect(updatedDecks.some((d) => d.id === 'custom_deck_1')).toBe(true);
  });

  it('exports and imports cards, decks, and collections with extend and overwrite modes', () => {
    const cardA: CardDefinition = {
      id: 'custom_paladin',
      name: 'Paladín del Alba',
      type: 'citizen',
      vitality: 7,
      description: 'Al jugar: Otorga +2V a un ciudadano propio.',
      abilities: [
        {
          trigger: 'on_play',
          steps: [
            {
              op: 'modify_stat',
              amount: 2,
              target: { requirement: 'single_card', owner: 'self' },
            },
          ],
        },
      ],
    };

    const cardB: CardDefinition = {
      id: 'custom_ catapulta',
      name: 'Catapulta de Asedio',
      type: 'citizen',
      vitality: 5,
      description: 'Al final del turno: Hace 3 de daño a un ciudadano enemigo.',
    };

    const baseCount = getAllCards().length;
    const codeA = exportCardToCode(cardA);
    expect(codeA.startsWith('CB1-CARD:')).toBe(true);

    const multiCode = exportCardsToCode([cardA, cardB]);

    // 1. Extend collection: adds cardA and cardB to the canonical cards
    const extendRes = importShareCode(multiCode, 'extend');
    expect(extendRes.addedCards).toBe(2);
    expect(extendRes.skippedCards).toBe(0);
    expect(extendRes.totalCards).toBe(baseCount + 2);
    expect(getAllCards().some((c) => c.id === 'custom_paladin')).toBe(true);

    // Pasting again in 'extend' mode skips existing cards
    const extendAgain = importShareCode(codeA, 'extend');
    expect(extendAgain.addedCards).toBe(0);
    expect(extendAgain.skippedCards).toBe(1);
    expect(extendAgain.totalCards).toBe(baseCount + 2);

    // 2. Overwrite collection: deletes previous cards and keeps ONLY the newly pasted cards (cardA & cardB)
    const overwriteRes = importShareCode(multiCode, 'overwrite');
    expect(overwriteRes.addedCards).toBe(2);
    expect(overwriteRes.totalCards).toBe(2);
    expect(getAllCards().map((c) => c.id)).toEqual([
      'custom_paladin',
      'custom_ catapulta',
    ]);

    // 3. Export & Import a full Deck onto another client (reconstructs both deck and custom cards)
    const customDeck: DeckPreset = {
      id: 'deck_paladines',
      name: 'Orden del Alba',
      description: 'Mazo de paladines y catapultas',
      cards: [cardA, cardA, cardB],
    };
    const deckCode = exportDeckToCode(customDeck);
    expect(deckCode.startsWith('CB1-DECK:')).toBe(true);

    // Simulate another browser client with default storage
    resetCollectionToDefaults();
    expect(getAllCards().length).toBe(baseCount);

    const deckImportRes = importShareCode(deckCode, 'extend');
    expect(deckImportRes.addedCards).toBe(2);
    expect(deckImportRes.importedDecks).toBe(1);
    expect(getAllCards().length).toBe(baseCount + 2);
    const reconstructedDeck = getAllDecks().find((d) => d.name === 'Orden del Alba');
    expect(reconstructedDeck).toBeDefined();
    expect(reconstructedDeck?.cards.length).toBe(3);
    expect(reconstructedDeck?.cards[0].abilities?.[0].steps[0].amount).toBe(2);

    // 4. Full Collection export & overwrite import
    const collCode = exportCollectionToCode(getAllCards(), getAllDecks());
    expect(collCode.startsWith('CB1-COLL:')).toBe(true);

    localStorage.clear();
    const collImport = importShareCode(collCode, 'overwrite');
    expect(collImport.totalCards).toBe(baseCount + 2);
    expect(collImport.importedDecks).toBeGreaterThanOrEqual(3);
  });

  it('supports permanent deletion of any card and deck, layout config, and persisted deck selection', () => {
    const initialCards = getAllCards();
    const initialDecks = getAllDecks();

    // Permanently delete a canonical card ('caballero_galardonado')
    const afterDelCard = permanentlyDeleteCard('caballero_galardonado');
    expect(afterDelCard.length).toBe(initialCards.length - 1);
    expect(afterDelCard.some((c) => c.id === 'caballero_galardonado')).toBe(false);
    // Also removed from all decks
    for (const d of getAllDecks()) {
      expect(d.cards.some((c) => c.id === 'caballero_galardonado')).toBe(false);
    }

    // Permanently delete a canonical deck
    const firstDeckId = initialDecks[0].id;
    const afterDelDeck = deleteDeck(firstDeckId);
    expect(afterDelDeck.some((d) => d.id === firstDeckId)).toBe(false);

    // Resetting collection restores deleted canonical cards and decks
    const resetRes = resetCollectionToDefaults();
    expect(resetRes.cards.some((c) => c.id === 'caballero_galardonado')).toBe(true);
    expect(resetRes.decks.some((d) => d.id === firstDeckId)).toBe(true);

    // Persist and read last selected deck & AI deck
    saveLastSelectedDeckId('deck_alpha');
    saveLastSelectedAiDeckId('deck_beta');
    expect(getLastSelectedDeckId()).toBe('deck_alpha');
    expect(getLastSelectedAiDeckId()).toBe('deck_beta');

    // Persist and read card layout configuration
    saveCardLayoutConfig({
      cardWidthPx: 230,
      cardHeightPx: 330,
      artHeightPct: 48,
      imageFit: 'contain',
      titleFontSizePx: 13,
      bodyFontSizePx: 11,
      bodyTextAlign: 'justify',
      bodyFontFamily: 'sans',
    });
    const layout = getCardLayoutConfig();
    expect(layout.cardWidthPx).toBe(230);
    expect(layout.imageFit).toBe('contain');
    expect(layout.bodyTextAlign).toBe('justify');

    // Conditional ability description generation
    const desc = generateCardDescription([
      {
        trigger: 'activated_wear',
        wearCost: 2,
        oncePerTurn: true,
        conditionEnemyMorePoints: true,
        conditionDiscardMinCitizens: 3,
        steps: [
          {
            op: 'modify_stat',
            statTarget: 'armor',
            amount: 2,
            target: { requirement: 'self', owner: 'self' },
          },
        ],
      },
    ]);
    expect(desc).toContain('Desgaste 2:');
    expect(desc).toContain('si el oponente tiene más puntos de Desarrollo');
    expect(desc).toContain('si tenés al menos 3 ciudadano(s) en tu descarte');
    expect(desc).toContain('+2A');
  });
});
