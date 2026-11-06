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
    id: 'reclutador_de_guerra',
    name: 'Reclutador de guerra',
    type: 'citizen',
    vitality: 8,
    description: 'Al Jugar: Convoca en esta fila un Recluta (1V).',
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
    id: 'granjero',
    name: 'Granjero',
    type: 'citizen',
    vitality: 4,
    description: 'Al final del turno: Convoca en esta fila una Vaca (1V).',
    artColor: '#65a30d',
    artIcon: 'heart',
    abilities: [
      {
        trigger: 'on_turn_end',
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_vaca',
              name: 'Vaca',
              vitality: 1,
              count: 1,
              artIcon: 'heart',
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
    vitality: 6,
    description: 'Al comienzo del turno: hace 2 de daño a un ciudadano enemigo a elección.',
    artColor: '#4f46e5',
    artIcon: 'zap',
    abilities: [
      {
        trigger: 'on_turn_start',
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
    id: 'asesino',
    name: 'Asesino',
    type: 'citizen',
    vitality: 1,
    isSpy: true,
    description: 'Espía (se juega del lado del oponente). Al jugar: Destruí al ciudadano a la derecha de esta carta.',
    artColor: '#334155',
    artIcon: 'skull',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'destroy',
            target: {
              requirement: 'right_neighbor',
              cardType: 'citizen',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'protector_de_los_debiles',
    name: 'Protector de los débiles',
    type: 'citizen',
    vitality: 7,
    hasShield: true,
    description: 'Escudo (evita el primer daño que fuera a recibir y luego pierde el escudo).',
    artColor: '#0284c7',
    artIcon: 'shield',
  },
  {
    id: 'germinador',
    name: 'Germinador',
    type: 'citizen',
    vitality: 5,
    description: 'Cuando juegues un Evento, convoca un Treant (1V) en esta zona.',
    artColor: '#15803d',
    artIcon: 'flag',
    abilities: [
      {
        trigger: 'on_event_played',
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_treant',
              name: 'Treant',
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
    id: 'explorador_de_basura',
    name: 'Explorador de basura',
    type: 'citizen',
    vitality: 9,
    description: 'Al jugar: Descarta una carta y levanta una carta.',
    artColor: '#a16207',
    artIcon: 'search',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'discard_cards',
            amount: 1,
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: ['hand'],
              prompt: 'Explorador de basura: Elegí una carta de tu mano para descartar.',
            },
          },
          {
            op: 'draw_cards',
            amount: 1,
          },
        ],
      },
    ],
  },
  {
    id: 'nadador_de_basura',
    name: 'Nadador de basura',
    type: 'citizen',
    vitality: 3,
    description: 'Cuando descartas esta carta, la convocas al Camino.',
    artColor: '#0f766e',
    artIcon: 'undo',
    abilities: [
      {
        trigger: 'on_discard',
        steps: [
          {
            op: 'summon_self',
            destZone: 'road',
          },
        ],
      },
    ],
  },
  {
    id: 'demoledor_de_basura',
    name: 'Demoledor de basura',
    type: 'citizen',
    vitality: 8,
    playFromDiscard: true,
    description: 'Al jugar: Triturá 3 cartas de tu descarte o sacrificá esta carta. Podés jugar esta carta desde el descarte.',
    artColor: '#7c2d12',
    artIcon: 'flame',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'mill_or_sacrifice',
            amount: 3,
          },
        ],
      },
    ],
  },
  {
    id: 'trillizos',
    name: 'Trillizos',
    type: 'citizen',
    vitality: 3,
    description: 'Último deseo: convoca un Mellizo (2V) con “Último deseo: convoca un Hermano (1V)”.',
    artColor: '#6366f1',
    artIcon: 'users',
    abilities: [
      {
        trigger: 'on_death',
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_mellizo',
              name: 'Mellizo',
              vitality: 2,
              count: 1,
              artIcon: 'users',
              description: 'Último deseo: convoca un Hermano (1V).',
              abilities: [
                {
                  trigger: 'on_death',
                  steps: [
                    {
                      op: 'summon_token',
                      destZone: 'same_row',
                      tokenDef: {
                        id: 'token_hermano',
                        name: 'Hermano',
                        vitality: 1,
                        count: 1,
                        artIcon: 'users',
                        description: 'Sin habilidades.',
                      },
                    },
                  ],
                },
              ],
            },
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
  {
    id: 'una_puerta_se_abre',
    name: 'Una puerta se abre',
    type: 'event',
    vitality: 0,
    description: 'Levanta dos cartas y descarta una carta.',
    artColor: '#0369a1',
    artIcon: 'scroll',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'draw_cards',
            amount: 2,
          },
          {
            op: 'discard_cards',
            amount: 1,
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: ['hand'],
              prompt: 'Una puerta se abre: Elegí una carta de tu mano para descartar.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'mercenarios_de_emergencia',
    name: 'Mercenarios de emergencia',
    type: 'event',
    vitality: 0,
    description: 'Convoca 2 Mercenarios (2V) en la Zona de combate. Si el oponente tiene más puntos de Desarrollo, convoca 3.',
    artColor: '#b91c1c',
    artIcon: 'sword',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'summon_token',
            destZone: 'combat',
            tokenDef: {
              id: 'token_mercenario',
              name: 'Mercenario',
              vitality: 2,
              count: 2,
              bonusCountIfEnemyMorePoints: 1,
              artIcon: 'sword',
              description: 'Token Ciudadano invocado.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'fabrica_de_robots',
    name: 'Fábrica de robots',
    type: 'tool',
    vitality: 8,
    description: 'Al final del turno: Convoca un Robot (2V) con “Último Deseo: convoca un Dron (1V)”.',
    artColor: '#475569',
    artIcon: 'shield',
    abilities: [
      {
        trigger: 'on_turn_end',
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_robot',
              name: 'Robot',
              vitality: 2,
              count: 1,
              artIcon: 'shield',
              description: 'Último Deseo: convoca un Dron (1V).',
              abilities: [
                {
                  trigger: 'on_death',
                  steps: [
                    {
                      op: 'summon_token',
                      destZone: 'same_row',
                      tokenDef: {
                        id: 'token_dron',
                        name: 'Dron',
                        vitality: 1,
                        count: 1,
                        artIcon: 'zap',
                        description: 'Sin habilidades.',
                      },
                    },
                  ],
                },
              ],
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
      'Mazo enfocado en poblar las filas con Reclutadores de guerra, Granjeros y Caballeros para dominar en puntos de Desarrollo.',
    cards: expandDeck({
      caballero_galardonado: 2,
      reclutador_de_guerra: 3,
      granjero: 3,
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
      'Mazo agresivo que utiliza Magos de las Tormentas, Asesinos, Rayos Vengativos y Pactos de Sacrificio para diezmar las filas rivales.',
    cards: expandDeck({
      caballero_galardonado: 2,
      reclutador_de_guerra: 2,
      granjero: 2,
      mago_de_las_tormentas: 3,
      mensajero: 3,
      rayo_vengativo: 3,
      el_regreso_del_sobreviviente: 1,
      mision_de_investigacion: 2,
      dado_de_baja: 1,
      pacto_de_sacrificio: 1,
    }),
  },
  {
    id: 'ingenio_y_chatarra',
    name: 'Ingenio y Chatarra (Sinergia Descarte y Herramientas)',
    description:
      'Mazo táctico con Exploradores/Nadadores/Demoledores de basura, Trillizos, Protector de los débiles, Germinador y Fábrica de robots.',
    cards: expandDeck({
      asesino: 2,
      protector_de_los_debiles: 2,
      germinador: 2,
      explorador_de_basura: 2,
      nadador_de_basura: 3,
      demoledor_de_basura: 2,
      trillizos: 2,
      una_puerta_se_abre: 2,
      mercenarios_de_emergencia: 1,
      fabrica_de_robots: 2,
    }),
  },
];

export const DEFAULT_RULES_CONFIG: GameRulesConfig = {
  vitalityMode: 'dynamic',
  retaliationDamage: false,
  startingPlayer: 'player',
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
