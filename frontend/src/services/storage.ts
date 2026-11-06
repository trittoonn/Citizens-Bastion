import {
  Ability,
  CardDefinition,
  DeckConstraints,
  DeckPreset,
  EffectStep,
} from '../types/game';
import { DEFAULT_CARDS, DEFAULT_DECKS, DEFAULT_RULES_CONFIG } from './defaults';

const KEYS = {
  CUSTOM_CARDS: 'cb_custom_cards_v1',
  DECKS: 'cb_decks_v1',
  CONSTRAINTS: 'cb_deck_constraints_v1',
  SESSION: 'cb_player_session_v1',
};

export interface PlayerSession {
  playerId: string;
  playerName: string;
  activeLobbyId?: string;
}

export function getPlayerSession(): PlayerSession {
  try {
    // Use sessionStorage for playerId per browser tab/window so a user can open 2 tabs on the same browser to test multiplayer!
    const tabSession = sessionStorage.getItem(KEYS.SESSION);
    if (tabSession) {
      return JSON.parse(tabSession);
    }
    const storedName = localStorage.getItem('cb_last_player_name') || 'Comandante';
    const created: PlayerSession = {
      playerId: 'p_' + Math.random().toString(36).substring(2, 10),
      playerName: storedName,
    };
    sessionStorage.setItem(KEYS.SESSION, JSON.stringify(created));
    return created;
  } catch {
    return {
      playerId: 'p_fallback',
      playerName: 'Comandante',
    };
  }
}

export function savePlayerSession(session: PlayerSession): void {
  sessionStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  if (session.playerName) {
    localStorage.setItem('cb_last_player_name', session.playerName);
  }
}

export function getCustomCards(): CardDefinition[] {
  try {
    const raw = localStorage.getItem(KEYS.CUSTOM_CARDS);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function getAllCards(): CardDefinition[] {
  const custom = getCustomCards();
  const map = new Map<string, CardDefinition>();
  for (const c of DEFAULT_CARDS) {
    map.set(c.id, c);
  }
  for (const c of custom) {
    map.set(c.id, { ...c, isCustom: true });
  }
  return Array.from(map.values());
}

export function saveCustomCard(card: CardDefinition): CardDefinition[] {
  const custom = getCustomCards().filter((c) => c.id !== card.id);
  const updated = [...custom, { ...card, isCustom: true }];
  localStorage.setItem(KEYS.CUSTOM_CARDS, JSON.stringify(updated));
  return getAllCards();
}

export function deleteCustomCard(cardId: string): CardDefinition[] {
  const custom = getCustomCards().filter((c) => c.id !== cardId);
  localStorage.setItem(KEYS.CUSTOM_CARDS, JSON.stringify(custom));
  return getAllCards();
}

export function getAllDecks(): DeckPreset[] {
  try {
    const raw = localStorage.getItem(KEYS.DECKS);
    if (!raw) {
      localStorage.setItem(KEYS.DECKS, JSON.stringify(DEFAULT_DECKS));
      return DEFAULT_DECKS;
    }
    const parsed: DeckPreset[] = JSON.parse(raw);
    return parsed.length > 0 ? parsed : DEFAULT_DECKS;
  } catch {
    return DEFAULT_DECKS;
  }
}

export function saveDeck(deck: DeckPreset): DeckPreset[] {
  const current = getAllDecks();
  const idx = current.findIndex((d) => d.id === deck.id);
  let next: DeckPreset[];
  if (idx >= 0) {
    next = [...current];
    next[idx] = deck;
  } else {
    next = [...current, deck];
  }
  localStorage.setItem(KEYS.DECKS, JSON.stringify(next));
  return next;
}

export function deleteDeck(deckId: string): DeckPreset[] {
  const current = getAllDecks().filter((d) => d.id !== deckId);
  const next = current.length > 0 ? current : DEFAULT_DECKS;
  localStorage.setItem(KEYS.DECKS, JSON.stringify(next));
  return next;
}

export function getDeckConstraints(): DeckConstraints {
  try {
    const raw = localStorage.getItem(KEYS.CONSTRAINTS);
    if (!raw) return DEFAULT_RULES_CONFIG.deckConstraints;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_RULES_CONFIG.deckConstraints;
  }
}

export function saveDeckConstraints(constraints: DeckConstraints): void {
  localStorage.setItem(KEYS.CONSTRAINTS, JSON.stringify(constraints));
}

export interface DeckValidationResult {
  valid: boolean;
  warnings: string[];
  errors: string[];
}

export function validateDeckLocal(
  cards: CardDefinition[],
  constraints: DeckConstraints
): DeckValidationResult {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (cards.length === 0) {
    errors.push('El mazo debe tener al menos 1 carta.');
  }

  if (constraints.minCards > 0 && cards.length < constraints.minCards) {
    const msg = `El mazo tiene ${cards.length} cartas (mínimo sugerido: ${constraints.minCards}).`;
    if (constraints.enforced) errors.push(msg);
    else warnings.push(msg);
  }

  if (constraints.maxCards > 0 && cards.length > constraints.maxCards) {
    const msg = `El mazo tiene ${cards.length} cartas (máximo sugerido: ${constraints.maxCards}).`;
    if (constraints.enforced) errors.push(msg);
    else warnings.push(msg);
  }

  if (constraints.maxCopiesPerCard > 0) {
    const counts = new Map<string, { name: string; count: number }>();
    for (const c of cards) {
      const prev = counts.get(c.id) || { name: c.name, count: 0 };
      counts.set(c.id, { name: c.name, count: prev.count + 1 });
    }
    for (const [, info] of counts.entries()) {
      if (info.count > constraints.maxCopiesPerCard) {
        const msg = `"${info.name}" tiene ${info.count} copias (límite: ${constraints.maxCopiesPerCard}).`;
        if (constraints.enforced) errors.push(msg);
        else warnings.push(msg);
      }
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors,
  };
}

function describeStep(step: EffectStep): string {
  const ownerLabel =
    step.target?.owner === 'self'
      ? 'propio'
      : step.target?.owner === 'enemy'
      ? 'enemigo'
      : 'a elección';

  switch (step.op) {
    case 'summon_token': {
      const count = step.tokenDef?.count || 1;
      const name = step.tokenDef?.name || 'Recluta';
      const vit = step.tokenDef?.vitality || 1;
      const zoneLabel =
        step.destZone === 'city'
          ? 'La Ciudad'
          : step.destZone === 'road'
          ? 'El Camino'
          : step.destZone === 'combat'
          ? 'la Zona de Combate'
          : 'esta fila';
      return `Invoca ${count} ${name} (${vit}V) en ${zoneLabel}.`;
    }
    case 'deal_damage': {
      const amt = step.amount || 1;
      if (step.target?.requirement === 'all_matching') {
        return `Hace ${amt} de daño a todos los ciudadanos (${ownerLabel}).`;
      }
      return `Hace ${amt} de daño a un ciudadano ${ownerLabel}.`;
    }
    case 'draw_cards': {
      const amt = step.amount || 1;
      return `Levanta ${amt} carta${amt > 1 ? 's' : ''} del mazo.`;
    }
    case 'move_zone': {
      const src = step.target?.zones?.[0] || 'discard';
      const srcLabel =
        src === 'discard'
          ? 'tu Descarte'
          : src === 'deck'
          ? 'tu Mazo'
          : 'el tablero';
      const destLabel =
        step.destZone === 'exile'
          ? 'el Exilio'
          : step.destZone === 'discard'
          ? 'el Descarte'
          : 'tu mano';
      const shuffleText = step.shuffleDeck ? ' Mezclá tu mazo.' : '';
      return `Mueve una carta de ${srcLabel} a ${destLabel}.${shuffleText}`;
    }
    case 'destroy': {
      return `Destruye un ciudadano ${ownerLabel}.`;
    }
    case 'modify_stat': {
      const amt = step.amount || 1;
      const sign = amt >= 0 ? `+${amt}V` : `${amt}V`;
      if (step.target?.requirement === 'self_card') {
        return `Este ciudadano gana ${sign}.`;
      }
      return `Otorga ${sign} a un ciudadano ${ownerLabel}.`;
    }
    default:
      return '';
  }
}

export function generateCardDescription(abilities: Ability[]): string {
  if (!abilities || abilities.length === 0) {
    return 'Sin habilidades.';
  }
  const parts: string[] = [];
  for (const ab of abilities) {
    const prefix =
      ab.trigger === 'on_play'
        ? 'Al jugar: '
        : ab.trigger === 'on_turn_start'
        ? 'Al comienzo del turno: '
        : ab.trigger === 'on_turn_end'
        ? 'Al final del turno: '
        : '';
    const stepTexts = ab.steps.map(describeStep).filter(Boolean).join(' ');
    if (stepTexts) {
      parts.push(`${prefix}${stepTexts}`);
    }
  }
  return parts.length > 0 ? parts.join(' ') : 'Sin habilidades.';
}
