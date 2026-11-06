import { describe, expect, it, beforeEach } from 'vitest';
import {
  getAllCards,
  saveCustomCard,
  deleteCustomCard,
  getAllDecks,
  saveDeck,
  validateDeckLocal,
  generateCardDescription,
} from './storage';
import { CardDefinition } from '../types/game';

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
});
