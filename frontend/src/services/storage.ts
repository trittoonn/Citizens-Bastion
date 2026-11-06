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
  COLLECTION_OVERRIDE: 'cb_collection_override_v1',
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
  let base: CardDefinition[] = DEFAULT_CARDS;
  try {
    const rawOverride = localStorage.getItem(KEYS.COLLECTION_OVERRIDE);
    if (rawOverride !== null) {
      const parsed = JSON.parse(rawOverride);
      if (Array.isArray(parsed)) {
        base = parsed;
      }
    }
  } catch {
    base = DEFAULT_CARDS;
  }

  const map = new Map<string, CardDefinition>();
  for (const c of base) {
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
  try {
    const rawOverride = localStorage.getItem(KEYS.COLLECTION_OVERRIDE);
    if (rawOverride !== null) {
      const parsed: CardDefinition[] = JSON.parse(rawOverride);
      if (Array.isArray(parsed)) {
        localStorage.setItem(
          KEYS.COLLECTION_OVERRIDE,
          JSON.stringify(parsed.filter((c) => c.id !== cardId))
        );
      }
    }
  } catch {
    // Ignore
  }
  return getAllCards();
}

export function resetCollectionToDefaults(): {
  cards: CardDefinition[];
  decks: DeckPreset[];
} {
  localStorage.removeItem(KEYS.COLLECTION_OVERRIDE);
  localStorage.removeItem(KEYS.CUSTOM_CARDS);
  localStorage.setItem(KEYS.DECKS, JSON.stringify(DEFAULT_DECKS));
  return {
    cards: getAllCards(),
    decks: getAllDecks(),
  };
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

// =============================================================================
// SERIALIZED TEXT CODES FOR EXPORTING & IMPORTING CARDS, DECKS & COLLECTIONS
// =============================================================================

const CODE_PREFIX_CARD = 'CB1-CARD:';
const CODE_PREFIX_DECK = 'CB1-DECK:';
const CODE_PREFIX_COLL = 'CB1-COLL:';

interface SerializedDeckCompact {
  id: string;
  name: string;
  description: string;
  entries: [string, number][];
}

interface SerializedDeckPayload {
  v: 1;
  k: 'deck';
  deck: SerializedDeckCompact;
  defs: CardDefinition[];
}

interface SerializedCollectionPayload {
  v: 1;
  k: 'coll';
  cards: CardDefinition[];
  decks: SerializedDeckCompact[];
}

function encodeBase64UrlUtf8(json: string): string {
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64UrlUtf8(b64url: string): string {
  const cleaned = b64url.trim().replace(/-/g, '+').replace(/_/g, '/');
  const pad = cleaned.length % 4 === 0 ? '' : '='.repeat(4 - (cleaned.length % 4));
  const binary = atob(cleaned + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

const DEFAULT_CARD_ID_SET = new Set(DEFAULT_CARDS.map((c) => c.id));

function sanitizeImportedCard(raw: any): CardDefinition | null {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;

  const type = raw.type === 'event' ? 'event' : 'citizen';
  const id =
    typeof raw.id === 'string' && raw.id.trim()
      ? raw.id.trim()
      : 'custom_' +
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '_')
          .replace(/^_+|_+$/g, '') +
        '_' +
        Math.random().toString(36).substring(2, 6);

  const vitality =
    type === 'citizen'
      ? Math.max(1, Number.isFinite(Number(raw.vitality)) ? Number(raw.vitality) : 1)
      : 0;

  const abilities: Ability[] | undefined = Array.isArray(raw.abilities)
    ? raw.abilities
    : undefined;

  const description =
    typeof raw.description === 'string' && raw.description.trim()
      ? raw.description.trim()
      : abilities && abilities.length > 0
      ? generateCardDescription(abilities)
      : 'Sin habilidades.';

  const isCanonicalDefault = DEFAULT_CARD_ID_SET.has(id) && raw.isCustom !== true;

  const card: CardDefinition = {
    id,
    name,
    type,
    vitality,
    description,
    ...(abilities && abilities.length > 0 ? { abilities } : {}),
    ...(raw.artColor ? { artColor: String(raw.artColor) } : {}),
    ...(raw.artIcon ? { artIcon: String(raw.artIcon) } : {}),
    ...(raw.artImage ? { artImage: String(raw.artImage) } : {}),
    isCustom: !isCanonicalDefault,
  };
  return card;
}

function compactDeck(deck: DeckPreset): {
  compact: SerializedDeckCompact;
  defs: CardDefinition[];
} {
  const defMap = new Map<string, CardDefinition>();
  const entries: [string, number][] = [];

  for (const c of deck.cards) {
    if (!defMap.has(c.id)) {
      defMap.set(c.id, c);
    }
    if (entries.length > 0 && entries[entries.length - 1][0] === c.id) {
      entries[entries.length - 1][1] += 1;
    } else {
      entries.push([c.id, 1]);
    }
  }

  return {
    compact: {
      id: deck.id,
      name: deck.name,
      description: deck.description || '',
      entries,
    },
    defs: Array.from(defMap.values()),
  };
}

function expandCompactDeck(
  compact: SerializedDeckCompact,
  cardMap: Map<string, CardDefinition>
): DeckPreset | null {
  if (!compact || typeof compact.name !== 'string') return null;
  const cards: CardDefinition[] = [];
  if (Array.isArray(compact.entries)) {
    for (const entry of compact.entries) {
      if (!Array.isArray(entry) || entry.length < 2) continue;
      const [cardId, count] = entry;
      const def = cardMap.get(String(cardId));
      if (!def) continue;
      const copies = Math.max(1, Math.min(100, Number(count) || 1));
      for (let i = 0; i < copies; i++) {
        cards.push(def);
      }
    }
  }
  return {
    id:
      typeof compact.id === 'string' && compact.id.trim()
        ? compact.id.trim()
        : 'deck_' + Math.random().toString(36).substring(2, 8),
    name: compact.name.trim() || 'Mazo Importado',
    description:
      typeof compact.description === 'string'
        ? compact.description
        : 'Mazo importado mediante código.',
    cards,
  };
}

/**
 * Serializes a single CardDefinition into a self-contained shareable text code (CB1-CARD:...).
 */
export function exportCardToCode(card: CardDefinition): string {
  const payload = sanitizeImportedCard(card) || card;
  return CODE_PREFIX_CARD + encodeBase64UrlUtf8(JSON.stringify(payload));
}

/**
 * Serializes multiple CardDefinitions into multi-line CB1-CARD:... codes (one per line).
 */
export function exportCardsToCode(cards: CardDefinition[]): string {
  return cards.map((c) => exportCardToCode(c)).join('\n');
}

/**
 * Serializes a DeckPreset (along with the full CardDefinitions of all its cards)
 * into a self-contained text code (CB1-DECK:...) so any client can reconstruct both the deck and its cards.
 */
export function exportDeckToCode(deck: DeckPreset): string {
  const { compact, defs } = compactDeck(deck);
  const payload: SerializedDeckPayload = {
    v: 1,
    k: 'deck',
    deck: compact,
    defs,
  };
  return CODE_PREFIX_DECK + encodeBase64UrlUtf8(JSON.stringify(payload));
}

/**
 * Serializes an entire collection of cards and decks into a single text code (CB1-COLL:...).
 */
export function exportCollectionToCode(
  cards: CardDefinition[] = getAllCards(),
  decks: DeckPreset[] = getAllDecks()
): string {
  const cardMap = new Map<string, CardDefinition>();
  for (const c of cards) {
    cardMap.set(c.id, c);
  }
  const compactDecks: SerializedDeckCompact[] = [];
  for (const d of decks) {
    const { compact, defs } = compactDeck(d);
    for (const def of defs) {
      if (!cardMap.has(def.id)) {
        cardMap.set(def.id, def);
      }
    }
    compactDecks.push(compact);
  }

  const payload: SerializedCollectionPayload = {
    v: 1,
    k: 'coll',
    cards: Array.from(cardMap.values()),
    decks: compactDecks,
  };
  return CODE_PREFIX_COLL + encodeBase64UrlUtf8(JSON.stringify(payload));
}

export interface ParsedSharePayload {
  kind: 'card' | 'cards' | 'deck' | 'collection';
  cards: CardDefinition[];
  decks: DeckPreset[];
}

/**
 * Parses one or more share codes (CB1-CARD:..., CB1-DECK:..., CB1-COLL:..., or raw JSON)
 * from a pasted text block. Supports pasting multiple CB1-CARD codes separated by newlines or spaces.
 */
export function parseShareCode(rawText: string): ParsedSharePayload {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    throw new Error('Pegá al menos un código de carta, mazo o colección.');
  }

  const cardMap = new Map<string, CardDefinition>();
  const decks: DeckPreset[] = [];
  let sawDeck = false;
  let sawCollection = false;

  const parseDecodedObject = (obj: any) => {
    if (!obj || typeof obj !== 'object') return;

    // 1. Collection payload
    if (obj.k === 'coll' || (Array.isArray(obj.cards) && Array.isArray(obj.decks))) {
      sawCollection = true;
      if (Array.isArray(obj.cards)) {
        for (const rawC of obj.cards) {
          const c = sanitizeImportedCard(rawC);
          if (c) cardMap.set(c.id, c);
        }
      }
      if (Array.isArray(obj.decks)) {
        for (const rawD of obj.decks) {
          if (rawD && Array.isArray(rawD.entries)) {
            const expanded = expandCompactDeck(rawD, cardMap);
            if (expanded) decks.push(expanded);
          } else if (rawD && Array.isArray(rawD.cards)) {
            const dCards: CardDefinition[] = [];
            for (const rc of rawD.cards) {
              const sc = sanitizeImportedCard(rc);
              if (sc) {
                cardMap.set(sc.id, sc);
                dCards.push(sc);
              }
            }
            decks.push({
              id: rawD.id || 'deck_' + Math.random().toString(36).substring(2, 8),
              name: rawD.name || 'Mazo Importado',
              description: rawD.description || '',
              cards: dCards,
            });
          }
        }
      }
      return;
    }

    // 2. Deck payload
    if (obj.k === 'deck' && obj.deck) {
      sawDeck = true;
      const localMap = new Map<string, CardDefinition>(cardMap);
      if (Array.isArray(obj.defs)) {
        for (const rawC of obj.defs) {
          const c = sanitizeImportedCard(rawC);
          if (c) {
            cardMap.set(c.id, c);
            localMap.set(c.id, c);
          }
        }
      }
      const expanded = expandCompactDeck(obj.deck, localMap);
      if (expanded) decks.push(expanded);
      return;
    }

    // 3. Raw DeckPreset object ({ name, cards: [...] })
    if (typeof obj.name === 'string' && Array.isArray(obj.cards)) {
      sawDeck = true;
      const dCards: CardDefinition[] = [];
      for (const rc of obj.cards) {
        const sc = sanitizeImportedCard(rc);
        if (sc) {
          cardMap.set(sc.id, sc);
          dCards.push(sc);
        }
      }
      decks.push({
        id: obj.id || 'deck_' + Math.random().toString(36).substring(2, 8),
        name: obj.name,
        description: obj.description || '',
        cards: dCards,
      });
      return;
    }

    // 4. Array of cards
    if (Array.isArray(obj)) {
      for (const item of obj) {
        parseDecodedObject(item);
      }
      return;
    }

    // 5. Single CardDefinition
    const singleCard = sanitizeImportedCard(obj);
    if (singleCard) {
      cardMap.set(singleCard.id, singleCard);
    }
  };

  // Match all CB1-(CARD|DECK|COLL):<token> occurrences in the text
  const tokenRegex = /CB1-(CARD|DECK|COLL):([A-Za-z0-9+/=_-]+)/g;
  const matches = Array.from(trimmed.matchAll(tokenRegex));

  if (matches.length > 0) {
    for (const match of matches) {
      const b64 = match[2];
      try {
        const jsonStr = decodeBase64UrlUtf8(b64);
        const parsed = JSON.parse(jsonStr);
        parseDecodedObject(parsed);
      } catch {
        throw new Error(
          `El código "${match[0].slice(0, 24)}..." está incompleto o corrupto.`
        );
      }
    }
  } else {
    // Fallback: try parsing as raw JSON (single object, array, or JSON lines)
    try {
      const parsed = JSON.parse(trimmed);
      parseDecodedObject(parsed);
    } catch {
      throw new Error(
        'Formato de código no reconocido. Pegá un código válido (CB1-CARD:..., CB1-DECK:... o CB1-COLL:...).'
      );
    }
  }

  const cards = Array.from(cardMap.values());
  if (cards.length === 0 && decks.length === 0) {
    throw new Error('No se encontraron cartas ni mazos válidos en el código ingresado.');
  }

  const kind: ParsedSharePayload['kind'] = sawCollection
    ? 'collection'
    : sawDeck
    ? 'deck'
    : cards.length === 1
    ? 'card'
    : 'cards';

  return { kind, cards, decks };
}

export type ImportCollectionMode = 'extend' | 'overwrite';

export interface ImportShareResult {
  mode: ImportCollectionMode;
  kind: ParsedSharePayload['kind'];
  addedCards: number;
  skippedCards: number;
  totalCards: number;
  importedDecks: number;
  cards: CardDefinition[];
  decks: DeckPreset[];
  activeDeckId?: string;
}

/**
 * Imports cards, decks, or an entire collection from a text code using the selected mode:
 * - 'extend': Adds imported cards that do not already exist in the collection (by ID), and appends imported decks.
 * - 'overwrite': Clears the previous card collection and leaves only the newly imported cards (and replaces decks if decks are included).
 */
export function importShareCode(
  rawText: string,
  mode: ImportCollectionMode
): ImportShareResult {
  const parsed = parseShareCode(rawText);

  let addedCards = 0;
  let skippedCards = 0;
  let finalCards: CardDefinition[] = [];

  if (mode === 'overwrite') {
    // Overwrite collection: delete previous cards and keep only the newly imported ones
    finalCards = parsed.cards;
    addedCards = finalCards.length;
    skippedCards = 0;
    localStorage.setItem(KEYS.COLLECTION_OVERRIDE, JSON.stringify(finalCards));
    localStorage.setItem(KEYS.CUSTOM_CARDS, JSON.stringify([]));
  } else {
    // Extend collection: keep existing cards and add any imported card whose ID does not exist yet
    const existing = getAllCards();
    const existingMap = new Map<string, CardDefinition>();
    for (const c of existing) {
      existingMap.set(c.id, c);
    }

    const newlyAdded: CardDefinition[] = [];
    for (const c of parsed.cards) {
      if (existingMap.has(c.id)) {
        skippedCards++;
      } else {
        existingMap.set(c.id, c);
        newlyAdded.push(c);
        addedCards++;
      }
    }

    const hasOverride = localStorage.getItem(KEYS.COLLECTION_OVERRIDE) !== null;
    if (hasOverride) {
      const merged = Array.from(existingMap.values());
      localStorage.setItem(KEYS.COLLECTION_OVERRIDE, JSON.stringify(merged));
    } else if (newlyAdded.length > 0) {
      const currentCustom = getCustomCards();
      const customMap = new Map<string, CardDefinition>();
      for (const c of currentCustom) {
        customMap.set(c.id, c);
      }
      for (const c of newlyAdded) {
        if (!DEFAULT_CARD_ID_SET.has(c.id) || c.isCustom) {
          customMap.set(c.id, { ...c, isCustom: true });
        }
      }
      localStorage.setItem(
        KEYS.CUSTOM_CARDS,
        JSON.stringify(Array.from(customMap.values()))
      );
    }
    finalCards = getAllCards();
  }

  let importedDecks = 0;
  let activeDeckId: string | undefined;
  let finalDecks = getAllDecks();

  if (parsed.decks.length > 0) {
    if (mode === 'overwrite') {
      finalDecks = parsed.decks;
      importedDecks = parsed.decks.length;
      activeDeckId = finalDecks[0]?.id;
      localStorage.setItem(KEYS.DECKS, JSON.stringify(finalDecks));
    } else {
      const existingDecks = getAllDecks();
      const deckList = [...existingDecks];
      for (const d of parsed.decks) {
        const collisionIdx = deckList.findIndex((ed) => ed.id === d.id);
        if (collisionIdx < 0) {
          deckList.push(d);
          importedDecks++;
          activeDeckId = d.id;
        } else if (parsed.kind === 'deck') {
          // When explicitly importing a single deck code in extend mode, ensure it's added even if ID existed
          const copyDeck: DeckPreset = {
            ...d,
            id: d.id + '_' + Math.random().toString(36).substring(2, 6),
          };
          deckList.push(copyDeck);
          importedDecks++;
          activeDeckId = copyDeck.id;
        }
      }
      finalDecks = deckList;
      localStorage.setItem(KEYS.DECKS, JSON.stringify(finalDecks));
    }
  }

  return {
    mode,
    kind: parsed.kind,
    addedCards,
    skippedCards,
    totalCards: finalCards.length,
    importedDecks,
    cards: finalCards,
    decks: finalDecks,
    activeDeckId,
  };
}
