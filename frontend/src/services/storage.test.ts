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
} from './storage';
import { CardDefinition, DeckPreset } from '../types/game';

describe('localStorage Card & Deck Studio Service', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('seeds the 10 canonical cards from Reglas 2026 v1.md by default', () => {
    const cards = getAllCards();
    expect(cards.length).toBe(10);
    expect(cards.some((c) => c.id === 'caballero_galardonado')).toBe(true);
    expect(cards.some((c) => c.id === 'pacto_de_sacrificio')).toBe(true);
  });

  it('creates and deletes custom cards in localStorage', () => {
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
    expect(afterSave.length).toBe(11);
    const saved = afterSave.find((c) => c.id === 'custom_arquero');
    expect(saved?.isCustom).toBe(true);
    expect(saved?.description).toContain('Al jugar: Hace 2 de daño');

    const afterDelete = deleteCustomCard('custom_arquero');
    expect(afterDelete.length).toBe(10);
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

    const codeA = exportCardToCode(cardA);
    expect(codeA.startsWith('CB1-CARD:')).toBe(true);

    const multiCode = exportCardsToCode([cardA, cardB]);

    // 1. Extend collection: adds cardA and cardB to the 10 canonical cards -> 12 cards
    const extendRes = importShareCode(multiCode, 'extend');
    expect(extendRes.addedCards).toBe(2);
    expect(extendRes.skippedCards).toBe(0);
    expect(extendRes.totalCards).toBe(12);
    expect(getAllCards().some((c) => c.id === 'custom_paladin')).toBe(true);

    // Pasting again in 'extend' mode skips existing cards
    const extendAgain = importShareCode(codeA, 'extend');
    expect(extendAgain.addedCards).toBe(0);
    expect(extendAgain.skippedCards).toBe(1);
    expect(extendAgain.totalCards).toBe(12);

    // 2. Overwrite collection: deletes previous 12 cards and keeps ONLY the newly pasted cards (cardA & cardB)
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
    expect(getAllCards().length).toBe(10);

    const deckImportRes = importShareCode(deckCode, 'extend');
    expect(deckImportRes.addedCards).toBe(2);
    expect(deckImportRes.importedDecks).toBe(1);
    expect(getAllCards().length).toBe(12);
    const reconstructedDeck = getAllDecks().find((d) => d.name === 'Orden del Alba');
    expect(reconstructedDeck).toBeDefined();
    expect(reconstructedDeck?.cards.length).toBe(3);
    expect(reconstructedDeck?.cards[0].abilities?.[0].steps[0].amount).toBe(2);

    // 4. Full Collection export & overwrite import
    const collCode = exportCollectionToCode(getAllCards(), getAllDecks());
    expect(collCode.startsWith('CB1-COLL:')).toBe(true);

    localStorage.clear();
    const collImport = importShareCode(collCode, 'overwrite');
    expect(collImport.totalCards).toBe(12);
    expect(collImport.importedDecks).toBeGreaterThanOrEqual(3);
  });
});
