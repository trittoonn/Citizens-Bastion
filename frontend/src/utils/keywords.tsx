import React from 'react';
import { CardDefinition } from '../types/game';

export interface KeywordEntry {
  id: string;
  name: string;
  badge: string;
  description: string;
  patterns: string[];
}

export const GAME_KEYWORDS: KeywordEntry[] = [
  {
    id: 'comandante',
    name: 'Comandante',
    badge: '👑 Comandante',
    description:
      'Comienza la partida fuera del mazo y se agrega automáticamente a tu mano después del Mulligan.',
    patterns: ['Comandante'],
  },
  {
    id: 'defensor',
    name: 'Defensor',
    badge: '🏰 Defensor',
    description:
      'Los enemigos deben atacar a este Ciudadano antes que a otros Ciudadanos sin Defensor en su misma zona.',
    patterns: ['Defensor'],
  },
  {
    id: 'ataque_rapido',
    name: 'Ataque Rápido',
    badge: '⚡ Ataque Rápido',
    description:
      'Cuando este Ciudadano ataca, no recibe daño de contraataque del objetivo defensor.',
    patterns: ['Ataque rápido', 'Ataque Rápido'],
  },
  {
    id: 'rango',
    name: 'Rango',
    badge: '🏹 Rango',
    description:
      'Puede atacar a unidades enemigas en filas traseras (El Camino o La Ciudad) ignorando Ciudadanos en la Zona de Combate.',
    patterns: ['Rango'],
  },
  {
    id: 'escudo',
    name: 'Escudo',
    badge: '🛡️ Escudo',
    description:
      'Evita la primera instancia de daño que esta unidad fuera a recibir y luego pierde el Escudo.',
    patterns: ['Escudo', 'escudo'],
  },
  {
    id: 'espia',
    name: 'Espía',
    badge: '🗡️ Espía',
    description:
      'Se juega del lado del tablero perteneciente a tu oponente (cuenta como Ciudadano para él).',
    patterns: ['Espía'],
  },
  {
    id: 'locacion',
    name: 'Locación',
    badge: '🏛️ Locación',
    description:
      'Estructura con Armadura (A) que se despliega en tus zonas. No cuenta como Ciudadano ni ataca, y suele tener habilidades de Desgaste.',
    patterns: ['Locación'],
  },
  {
    id: 'desgaste',
    name: 'Desgaste X',
    badge: '🔥 Desgaste X',
    description:
      'Habilidad activable una vez por turno durante tu Fase Principal. Al activarla, esta carta sufre X de daño (y se destruye luego de resolver el efecto si llega a 0A).',
    patterns: ['Desgaste 1', 'Desgaste 2', 'Desgaste 3', 'Desgaste'],
  },
  {
    id: 'al_jugar',
    name: 'Al jugar',
    badge: '✨ Al jugar',
    description:
      'Habilidad que se dispara automáticamente en el momento en que jugás la carta desde tu mano (o descarte).',
    patterns: ['Al jugar', 'Al Jugar'],
  },
  {
    id: 'ultimo_deseo',
    name: 'Último deseo',
    badge: '💀 Último deseo',
    description:
      'Habilidad que se dispara automáticamente cuando esta unidad es destruida y enviada al Descarte.',
    patterns: ['Último deseo', 'Último Deseo'],
  },
  {
    id: 'al_comienzo_turno',
    name: 'Al comienzo del turno',
    badge: '🌅 Al comienzo del turno',
    description:
      'Se activa automáticamente al inicio de cada uno de tus turnos mientras esta carta permanezca en mesa.',
    patterns: ['Al comienzo del turno', 'Al inicio del turno'],
  },
  {
    id: 'al_final_turno',
    name: 'Al final del turno',
    badge: '🌙 Al final del turno',
    description:
      'Se activa automáticamente al cerrar cada uno de tus turnos mientras esta carta permanezca en mesa.',
    patterns: ['Al final del turno'],
  },
  {
    id: 'triturar',
    name: 'Triturar',
    badge: '⚙️ Triturar',
    description:
      'Envía una carta desde el Descarte hacia la Zona de Exilio (queda removida del resto de la partida).',
    patterns: ['Triturá', 'Triturar', 'triturá', 'triturar', 'trituradas', 'triturados'],
  },
  {
    id: 'sacrificar',
    name: 'Sacrificar',
    badge: '🩸 Sacrificar',
    description:
      'Destruye voluntariamente una unidad propia en mesa (activando su Último deseo si lo tuviera) para pagar o potenciar un efecto.',
    patterns: ['Sacrificá', 'Sacrificar', 'Sacrifica', 'sacrificá', 'sacrificar', 'sacrifica'],
  },
  {
    id: 'convocar',
    name: 'Convocar',
    badge: '📯 Convocar',
    description:
      'Pone en juego una ficha (Token) o unidad directamente en la zona indicada sin gastar jugadas del turno.',
    patterns: ['Convocá', 'Convoca', 'convocá', 'convoca', 'convocas'],
  },
];

// Build a single regex matching any keyword pattern (longest first so "Ataque rápido" matches before shorter words)
const SORTED_PATTERNS: { pattern: string; entry: KeywordEntry }[] = (() => {
  const list: { pattern: string; entry: KeywordEntry }[] = [];
  for (const entry of GAME_KEYWORDS) {
    for (const p of entry.patterns) {
      list.push({ pattern: p, entry });
    }
  }
  list.sort((a, b) => b.pattern.length - a.pattern.length);
  return list;
})();

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const KEYWORD_REGEX = new RegExp(
  `(${SORTED_PATTERNS.map((x) => escapeRegExp(x.pattern)).join('|')})`,
  'g'
);

/**
 * Renders card description text with interactive highlighted keywords and native tooltips.
 */
export function renderTextWithKeywords(text?: string): React.ReactNode {
  if (!text) return 'Sin habilidades especiales.';

  const parts = text.split(KEYWORD_REGEX);
  return parts.map((part, idx) => {
    const matched = SORTED_PATTERNS.find((x) => x.pattern === part);
    if (!matched) {
      return <React.Fragment key={idx}>{part}</React.Fragment>;
    }
    return (
      <span
        key={idx}
        title={`${matched.entry.name}: ${matched.entry.description}`}
        className="font-bold text-[#fde68a] underline decoration-dotted decoration-[#f3d46b]/85 underline-offset-2 cursor-help"
      >
        {part}
      </span>
    );
  });
}

/**
 * Extracts all unique KeywordEntry items present on a CardDefinition (via flags or description text).
 */
export function getCardKeywords(card: CardDefinition): KeywordEntry[] {
  const found = new Map<string, KeywordEntry>();
  const addById = (id: string) => {
    const entry = GAME_KEYWORDS.find((k) => k.id === id);
    if (entry && !found.has(entry.id)) {
      found.set(entry.id, entry);
    }
  };

  if (card.isCommander) addById('comandante');
  if (card.isDefender) addById('defensor');
  if (card.hasQuickAttack) addById('ataque_rapido');
  if (card.hasReach) addById('rango');
  if (card.hasShield) addById('escudo');
  if (card.isSpy) addById('espia');
  if (card.isLocation) addById('locacion');

  for (const ab of card.abilities || []) {
    if (ab.trigger === 'activated_wear') addById('desgaste');
    if (ab.trigger === 'on_play') addById('al_jugar');
    if (ab.trigger === 'on_death') addById('ultimo_deseo');
    if (ab.trigger === 'on_turn_start') addById('al_comienzo_turno');
    if (ab.trigger === 'on_turn_end') addById('al_final_turno');
  }

  const desc = card.description || '';
  for (const item of SORTED_PATTERNS) {
    if (desc.includes(item.pattern) && !found.has(item.entry.id)) {
      found.set(item.entry.id, item.entry);
    }
  }

  return Array.from(found.values());
}
