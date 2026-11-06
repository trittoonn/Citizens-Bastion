import { CardDefinition, DeckPreset, GameRulesConfig, ZoneID } from '../types/game';

const BOARD_ZONES: ZoneID[] = ['city', 'road', 'combat'];

export const DEFAULT_CARDS: CardDefinition[] = [
  {
    id: 'caballero_galardonado',
    name: 'Caballero Galardonado',
    type: 'citizen',
    vitality: 10,
    description: 'Sin habilidades.',
    artColor: '#d97706',
    artIcon: 'sword',
  },
  {
    id: 'entrenador_de_guerra',
    name: 'Entrenador de guerra',
    type: 'citizen',
    vitality: 8,
    description: 'Al Jugar: Invoca en esta fila un Recluta (1V).',
    artColor: '#b45309',
    artIcon: 'users',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_recluta',
              name: 'Recluta',
              vitality: 1,
              count: 1,
              artIcon: 'shield',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'reclutador',
    name: 'Reclutador',
    type: 'citizen',
    vitality: 6,
    description: 'Al final del turno: Invoca en esta fila un Recluta (1V).',
    artColor: '#059669',
    artIcon: 'flag',
    abilities: [
      {
        trigger: 'on_turn_end',
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_recluta',
              name: 'Recluta',
              vitality: 1,
              count: 1,
              artIcon: 'shield',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mago_de_las_tormentas',
    name: 'Mago de las Tormentas',
    type: 'citizen',
    vitality: 4,
    description: 'Al final del turno: hace 2 de daño a un ciudadano enemigo a elección.',
    artColor: '#4f46e5',
    artIcon: 'zap',
    abilities: [
      {
        trigger: 'on_turn_end',
        steps: [
          {
            op: 'deal_damage',
            amount: 2,
            target: {
              requirement: 'single_card',
              owner: 'enemy',
              zones: BOARD_ZONES,
              cardType: 'citizen',
              prompt: 'Mago de las Tormentas: Elegí un Ciudadano enemigo para hacerle 2 de daño.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mensajero',
    name: 'Mensajero',
    type: 'citizen',
    vitality: 2,
    description: 'Al jugar: Levanta una carta del mazo.',
    artColor: '#0284c7',
    artIcon: 'scroll',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'draw_cards',
            amount: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'rayo_vengativo',
    name: 'Rayo vengativo',
    type: 'event',
    vitality: 0,
    description: 'Hace 5 de daño a un objetivo a elección.',
    artColor: '#dc2626',
    artIcon: 'flame',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'deal_damage',
            amount: 5,
            target: {
              requirement: 'single_card',
              owner: 'any',
              zones: BOARD_ZONES,
              cardType: 'citizen',
              prompt: 'Rayo vengativo: Elegí un Ciudadano objetivo para hacerle 5 de daño.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'el_regreso_del_sobreviviente',
    name: 'El regreso del Sobreviviente',
    type: 'event',
    vitality: 0,
    description: 'Devolvé un Ciudadano de tu Descarte a tu mano.',
    artColor: '#16a34a',
    artIcon: 'heart',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'move_zone',
            destZone: 'hand',
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: ['discard'],
              cardType: 'citizen',
              prompt: 'El regreso del Sobreviviente: Elegí un Ciudadano de tu Descarte para devolver a tu mano.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mision_de_investigacion',
    name: 'Misión de Investigación',
    type: 'event',
    vitality: 0,
    description: 'Buscá una carta de tu mazo y agregala a tu mano. Mezclá tu mazo.',
    artColor: '#7c3aed',
    artIcon: 'search',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'move_zone',
            destZone: 'hand',
            shuffleDeck: true,
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: ['deck'],
              prompt: 'Misión de Investigación: Buscá una carta de tu Mazo para agregarla a tu mano.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'dado_de_baja',
    name: 'Dado de baja',
    type: 'event',
    vitality: 0,
    description: 'Devolvé un Ciudadano de una de tus zonas a tu mano.',
    artColor: '#0d9488',
    artIcon: 'undo',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'move_zone',
            destZone: 'hand',
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: BOARD_ZONES,
              cardType: 'citizen',
              prompt: 'Dado de baja: Elegí un Ciudadano propio en el tablero para devolverlo a tu mano.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'pacto_de_sacrificio',
    name: 'Pacto de Sacrificio',
    type: 'event',
    vitality: 0,
    description: 'Sacrificá un Ciudadano para destruir otro Ciudadano.',
    artColor: '#991b1b',
    artIcon: 'skull',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'destroy',
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: BOARD_ZONES,
              cardType: 'citizen',
              prompt: 'Pacto de Sacrificio (1/2): Elegí un Ciudadano propio para sacrificar.',
            },
          },
          {
            op: 'destroy',
            target: {
              requirement: 'single_card',
              owner: 'enemy',
              zones: BOARD_ZONES,
              cardType: 'citizen',
              prompt: 'Pacto de Sacrificio (2/2): Elegí un Ciudadano enemigo para destruir.',
            },
          },
        ],
      },
    ],
  },
];

function expandDeck(counts: Record<string, number>): CardDefinition[] {
  const result: CardDefinition[] = [];
  for (const card of DEFAULT_CARDS) {
    const c = counts[card.id] || 0;
    for (let i = 0; i < c; i++) {
      result.push(card);
    }
  }
  return result;
}

export const DEFAULT_DECKS: DeckPreset[] = [
  {
    id: 'bastion_imperial',
    name: 'Bastión Imperial (Expansión)',
    description:
      'Mazo enfocado en poblar las filas con Entrenadores, Reclutadores y Caballeros para dominar en puntos de Desarrollo.',
    cards: expandDeck({
      caballero_galardonado: 2,
      entrenador_de_guerra: 3,
      reclutador: 3,
      mago_de_las_tormentas: 2,
      mensajero: 3,
      rayo_vengativo: 2,
      el_regreso_del_sobreviviente: 2,
      mision_de_investigacion: 1,
      dado_de_baja: 1,
      pacto_de_sacrificio: 1,
    }),
  },
  {
    id: 'tormenta_tactica',
    name: 'Tormenta Táctica (Control)',
    description:
      'Mazo agresivo que utiliza Magos de las Tormentas, Rayos Vengativos y Pactos de Sacrificio para diezmar las filas rivales.',
    cards: expandDeck({
      caballero_galardonado: 2,
      entrenador_de_guerra: 2,
      reclutador: 2,
      mago_de_las_tormentas: 3,
      mensajero: 3,
      rayo_vengativo: 3,
      el_regreso_del_sobreviviente: 1,
      mision_de_investigacion: 2,
      dado_de_baja: 1,
      pacto_de_sacrificio: 1,
    }),
  },
];

export const DEFAULT_RULES_CONFIG: GameRulesConfig = {
  vitalityMode: 'dynamic',
  pointsToWin: 10,
  initialHandSize: 4,
  drawPerTurn: 2,
  firstTurnDraw: 1,
  maxPlaysPerTurn: 3,
  firstTurnMaxPlays: 2,
  maxMovesPerTurn: 1,
  deckConstraints: {
    enforced: false,
    minCards: 15,
    maxCards: 40,
    maxCopiesPerCard: 3,
  },
};
