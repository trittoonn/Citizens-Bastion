import { CardDefinition, DeckPreset, EffectStep, GameRulesConfig, ZoneID } from '../types/game';

const BOARD_ZONES: ZoneID[] = ['city', 'road', 'combat'];

const WEAKEST_ENEMY_STEP: EffectStep = {
  op: 'deal_damage',
  amount: 1,
  target: {
    requirement: 'weakest_enemy',
    owner: 'enemy',
    zones: BOARD_ZONES,
    cardType: 'citizen',
  },
};

export const DEFAULT_CARDS: CardDefinition[] = [
  // =====================================================================
  // CARTAS BÁSICAS DE TESTEO / NEUTRALES
  // =====================================================================
  {
    id: 'caballero_galardonado',
    name: 'Caballero Galardonado',
    type: 'citizen',
    vitality: 8,
    planet: 'Neutral',
    description: 'Sin habilidades.',
    artColor: '#d97706',
    artIcon: 'sword',
  },
  {
    id: 'reclutador_de_guerra',
    name: 'Reclutador de guerra',
    type: 'citizen',
    vitality: 6,
    planet: 'Neutral',
    description: 'Al Jugar: Convoca en esta fila un Recluta (2V).',
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
              vitality: 2,
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
    planet: 'Neutral',
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
    planet: 'Neutral',
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
    planet: 'Neutral',
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
    planet: 'Maná',
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
    planet: 'Neutral',
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
    planet: 'Oro',
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
    isDefender: true,
    planet: 'Neutral',
    description: 'Escudo. Defensor.',
    artColor: '#0284c7',
    artIcon: 'shield',
  },
  {
    id: 'germinador',
    name: 'Germinador',
    type: 'citizen',
    vitality: 5,
    planet: 'Ki',
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
    id: 'cientifico_loco',
    name: 'Científico loco',
    type: 'citizen',
    vitality: 1,
    planet: 'Plutonio',
    description:
      'Al jugar: Tritura hasta dos Ciudadanos a elección de tu cementerio; convoca una Abominación en esta Zona con V igual a la suma de la V de las cartas trituradas.',
    artColor: '#16a34a',
    artIcon: 'skull',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'exile_and_summon_by_v',
            amount: 2,
            destZone: 'same_row',
            tokenDef: {
              id: 'token_abominacion',
              name: 'Abominación',
              vitality: 2,
              count: 1,
              artIcon: 'skull',
              description: 'Abominación creada con restos triturados.',
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
    planet: 'Vapor',
    description: 'Hace 4 de daño a un objetivo a elección.',
    artColor: '#dc2626',
    artIcon: 'flame',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'deal_damage',
            amount: 4,
            target: {
              requirement: 'single_card',
              owner: 'any',
              zones: BOARD_ZONES,
              prompt: 'Rayo vengativo: Elegí un objetivo para hacerle 4 de daño.',
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
    planet: 'Neutral',
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
    id: 'retirada',
    name: 'Retirada',
    type: 'event',
    vitality: 0,
    planet: 'Neutral',
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
              prompt: 'Retirada: Elegí un Ciudadano propio en el tablero para devolverlo a tu mano.',
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
    planet: 'Vapor',
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
    id: 'mercenarios_de_emergencia',
    name: 'Mercenarios de emergencia',
    type: 'event',
    vitality: 0,
    planet: 'Neutral',
    description:
      'Convoca 1 Mercenario (2V) con Ataque Rápido en la Zona de combate. Si el oponente tiene más puntos de Desarrollo, convoca 2.',
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
              count: 1,
              bonusCountIfEnemyMorePoints: 1,
              hasQuickAttack: true,
              artIcon: 'sword',
              description: 'Ataque Rápido.',
            },
          },
        ],
      },
    ],
  },

  // =====================================================================
  // PLANETA PLUTONIO (Verde — Sacrificio, Cementerio, Mutación)
  // =====================================================================
  {
    id: 'general_brazo_de_canon',
    name: 'General Brazo de cañón',
    type: 'citizen',
    vitality: 5,
    isCommander: true,
    planet: 'Plutonio',
    description:
      'Comandante. Al jugar: sacrifica un Ciudadano; hace daño igual al V del Ciudadano a cualquier objetivo.',
    artColor: '#15803d',
    artIcon: 'flame',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'destroy',
            storeVictimVitality: true,
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: BOARD_ZONES,
              cardType: 'citizen',
              excludeSourceCard: true,
              prompt: 'General Brazo de cañón (1/2): Elegí un Ciudadano propio para sacrificar.',
            },
          },
          {
            op: 'deal_damage',
            useStoredVitality: true,
            target: {
              requirement: 'single_card',
              owner: 'any',
              zones: BOARD_ZONES,
              prompt: 'General Brazo de cañón (2/2): Elegí un objetivo para infligirle daño igual al V sacrificado.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'lluvia_acida',
    name: 'Lluvia ácida',
    type: 'event',
    vitality: 0,
    planet: 'Plutonio',
    description: 'Hace 1 punto de daño a todas las cartas en juego.',
    artColor: '#4d7c0f',
    artIcon: 'flame',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'deal_damage',
            amount: 1,
            target: {
              requirement: 'all_matching',
              owner: 'any',
              zones: BOARD_ZONES,
            },
          },
        ],
      },
    ],
  },
  {
    id: 'supersoldado_de_elite',
    name: 'Supersoldado de Élite',
    type: 'citizen',
    vitality: 4,
    hasQuickAttack: true,
    planet: 'Plutonio',
    description: 'Ataque Rápido. Al jugar: sacrifica un Ciudadano; gana V igual al V del Ciudadano.',
    artColor: '#166534',
    artIcon: 'sword',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'destroy',
            storeVictimVitality: true,
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: BOARD_ZONES,
              cardType: 'citizen',
              excludeSourceCard: true,
              prompt: 'Supersoldado de Élite: Elegí un Ciudadano propio para sacrificar y absorber su V.',
            },
          },
          {
            op: 'modify_stat',
            useStoredVitality: true,
            target: {
              requirement: 'self_card',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'fuerza_antihuelga',
    name: 'Fuerza Antihuelga',
    type: 'citizen',
    vitality: 6,
    isDefender: true,
    planet: 'Plutonio',
    description: 'Defensor. Al final del turno: sacrifica el Ciudadano inmediatamente a su derecha y gana Escudo.',
    artColor: '#14532d',
    artIcon: 'shield',
    abilities: [
      {
        trigger: 'on_turn_end',
        steps: [
          {
            op: 'destroy',
            grantSelfShieldOnSuccess: true,
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
    id: 'cadetes_trillizos',
    name: 'Cadetes Trillizos',
    type: 'citizen',
    vitality: 3,
    planet: 'Plutonio',
    description:
      'Al morir: convoca un Policías Mellizos (2V) con “Al morir: convoca un Oficial Solitario (1V)”.',
    artColor: '#15803d',
    artIcon: 'users',
    abilities: [
      {
        trigger: 'on_death',
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_policias_mellizos',
              name: 'Policías Mellizos',
              vitality: 2,
              count: 1,
              artIcon: 'users',
              description: 'Al morir: convoca un Oficial Solitario (1V).',
              abilities: [
                {
                  trigger: 'on_death',
                  steps: [
                    {
                      op: 'summon_token',
                      destZone: 'same_row',
                      tokenDef: {
                        id: 'token_oficial_solitario',
                        name: 'Oficial Solitario',
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
    id: 'trillizos',
    name: 'Trillizos',
    type: 'citizen',
    vitality: 3,
    planet: 'Plutonio',
    description: 'Al morir: convoca un Mellizo (2V) con “Al morir: convoca un Hermano (1V)”.',
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
              description: 'Al morir: convoca un Hermano (1V).',
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
    id: 'pila_de_muertos',
    name: 'Pila de muertos',
    type: 'citizen',
    vitality: 1,
    planet: 'Plutonio',
    description: 'Al jugar: gana 1V por cada Ciudadano en tu Descarte.',
    artColor: '#365314',
    artIcon: 'skull',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'modify_stat',
            scaleByDiscardCitizens: true,
            target: {
              requirement: 'self_card',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'constructor_de_cementerios',
    name: 'Constructor de cementerios',
    type: 'citizen',
    vitality: 4,
    planet: 'Plutonio',
    description: 'Al jugar: Jugá una Locación de tu mazo.',
    artColor: '#3f6212',
    artIcon: 'search',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'move_zone',
            destZone: 'same_row',
            shuffleDeck: true,
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: ['deck'],
              cardType: 'tool',
              onlyLocations: true,
              prompt: 'Constructor de cementerios: Elegí una Locación de tu mazo para poner en juego.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'municiones_vivas',
    name: 'Municiones vivas',
    type: 'event',
    vitality: 0,
    planet: 'Plutonio',
    description: 'Sacrifica a un Ciudadano para destruir a otro Ciudadano.',
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
              prompt: 'Municiones vivas (1/2): Elegí un Ciudadano propio para sacrificar.',
            },
          },
          {
            op: 'destroy',
            target: {
              requirement: 'single_card',
              owner: 'enemy',
              zones: BOARD_ZONES,
              cardType: 'citizen',
              prompt: 'Municiones vivas (2/2): Elegí un Ciudadano enemigo para destruir.',
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
    planet: 'Plutonio',
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
    id: 'extension_artificial_de_vida',
    name: 'Extensión artificial de vida',
    type: 'event',
    vitality: 0,
    planet: 'Plutonio',
    description: 'Convoca a un Ciudadano de tu cementerio a la Zona de Combate. Sacrificalo al final del turno.',
    artColor: '#15803d',
    artIcon: 'zap',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'move_zone',
            destZone: 'combat',
            sacrificeAtTurnEnd: true,
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: ['discard'],
              cardType: 'citizen',
              prompt: 'Extensión artificial de vida: Elegí un Ciudadano de tu Descarte para convocar a la Zona de Combate.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'sujeto_de_prueba',
    name: 'Sujeto de prueba',
    type: 'citizen',
    vitality: 3,
    planet: 'Plutonio',
    description: 'Al morir: levanta una carta.',
    artColor: '#047857',
    artIcon: 'scroll',
    abilities: [
      {
        trigger: 'on_death',
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
    id: 'la_noche_de_los_muertos_vivos',
    name: 'La noche de los muertos vivos',
    type: 'event',
    vitality: 0,
    planet: 'Plutonio',
    description:
      'Convoca un Zombie (2V) en una zona a elección por cada Ciudadano aliado que haya muerto este turno.',
    artColor: '#14532d',
    artIcon: 'skull',
    abilities: [
      {
        trigger: 'immediate',
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            scaleCountByAlliedDeathsThisTurn: true,
            tokenDef: {
              id: 'token_zombie',
              name: 'Zombie',
              vitality: 2,
              count: 1,
              artIcon: 'skull',
              description: 'Zombie mutante de Plutonio.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'cementerio_infectado',
    name: 'Cementerio infectado',
    type: 'tool',
    vitality: 5,
    isLocation: true,
    planet: 'Plutonio',
    description: 'Locación. Al final del turno: si un Ciudadano aliado murió, crea un Zombie (2V) en esta zona.',
    artColor: '#365314',
    artIcon: 'skull',
    abilities: [
      {
        trigger: 'on_turn_end',
        conditionAlliedDiedThisTurn: true,
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_zombie',
              name: 'Zombie',
              vitality: 2,
              count: 1,
              artIcon: 'skull',
              description: 'Zombie mutante de Plutonio.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'cremadora_sospechosa',
    name: 'Cremadora Sospechosa',
    type: 'tool',
    vitality: 3,
    isLocation: true,
    planet: 'Plutonio',
    description:
      'Locación. Una vez por turno, Desgaste 1: Tritura un Ciudadano de tu cementerio. Convoca un Zombie (su V es igual a la V de la carta triturada) en esta zona.',
    artColor: '#3f6212',
    artIcon: 'flame',
    abilities: [
      {
        trigger: 'activated_wear',
        wearCost: 1,
        oncePerTurn: true,
        steps: [
          {
            op: 'exile_and_summon_by_v',
            amount: 1,
            destZone: 'same_row',
            tokenDef: {
              id: 'token_zombie',
              name: 'Zombie',
              vitality: 2,
              count: 1,
              artIcon: 'skull',
              description: 'Zombie mutante de Plutonio.',
            },
          },
        ],
      },
    ],
  },

  // =====================================================================
  // PLANETA VAPOR (Plateado — Robots, Descartes, Herramientas, Trampas)
  // =====================================================================
  {
    id: 'espidi',
    name: 'Espidi',
    type: 'citizen',
    vitality: 3,
    isCommander: true,
    hasQuickAttack: true,
    planet: 'Vapor',
    description:
      'Comandante. Ataque Rápido. Al jugar: Descarta cualquier cantidad de cartas de tu mano y levanta la misma cantidad.',
    artColor: '#475569',
    artIcon: 'zap',
    abilities: [
      {
        trigger: 'on_play',
        steps: [
          {
            op: 'cycle_hand',
          },
        ],
      },
    ],
  },
  {
    id: 'explorador_de_basura',
    name: 'Explorador de basura',
    type: 'citizen',
    vitality: 5,
    planet: 'Vapor',
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
    planet: 'Vapor',
    description: 'Al descartar: se convoca en el Camino.',
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
    planet: 'Vapor',
    description:
      'Al jugar: Tritura 3 cartas de tu Descarte o sacrifica esta carta. Podés jugar esta carta desde el Descarte.',
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
    id: 'guia_contratado',
    name: 'Guía Contratado',
    type: 'citizen',
    vitality: 9,
    isDefender: true,
    planet: 'Vapor',
    description: 'Defensor. Al jugar: descarta una carta.',
    artColor: '#64748b',
    artIcon: 'shield',
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
              prompt: 'Guía Contratado: Elegí una carta de tu mano para descartar.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'vendedor_ambulante',
    name: 'Vendedor ambulante',
    type: 'citizen',
    vitality: 6,
    planet: 'Vapor',
    description:
      'Al comienzo del turno: descarta una carta; devuelve una carta del mismo tipo de tu descarte a tu mano.',
    artColor: '#475569',
    artIcon: 'undo',
    abilities: [
      {
        trigger: 'on_turn_start',
        steps: [
          {
            op: 'discard_cards',
            amount: 1,
            storeTargetCardType: true,
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: ['hand'],
              prompt: 'Vendedor ambulante (1/2): Elegí una carta de tu mano para descartar.',
            },
          },
          {
            op: 'move_zone',
            destZone: 'hand',
            target: {
              requirement: 'single_card',
              owner: 'self',
              zones: ['discard'],
              matchStoredCardType: true,
              prompt: 'Vendedor ambulante (2/2): Elegí una carta del mismo tipo de tu Descarte para devolver a tu mano.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'lanzador_de_escombros',
    name: 'Lanzador de escombros',
    type: 'citizen',
    vitality: 5,
    planet: 'Vapor',
    description: 'Cuando descartas una carta: Hace 1 punto de daño al enemigo más débil.',
    artColor: '#9a3412',
    artIcon: 'flame',
    abilities: [
      {
        trigger: 'on_any_discard',
        steps: [WEAKEST_ENEMY_STEP],
      },
    ],
  },
  {
    id: 'camino_bifurcado',
    name: 'Camino bifurcado',
    type: 'event',
    vitality: 0,
    planet: 'Vapor',
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
              prompt: 'Camino bifurcado: Elegí una carta de tu mano para descartar.',
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
    planet: 'Vapor',
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
    id: 'busqueda_del_tesoro',
    name: 'Búsqueda del tesoro',
    type: 'event',
    vitality: 0,
    planet: 'Vapor',
    description: 'Devuelve un ciudadano o Herramienta de tu Descarte a tu mano.',
    artColor: '#ca8a04',
    artIcon: 'search',
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
              excludeCardType: 'event',
              prompt: 'Búsqueda del tesoro: Elegí un Ciudadano o Herramienta de tu Descarte para devolver a tu mano.',
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
    planet: 'Neutral',
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
    id: 'templo_antiguo',
    name: 'Templo Antiguo',
    type: 'tool',
    vitality: 7,
    isLocation: true,
    planet: 'Vapor',
    description:
      'Locación. Al final del turno si una carta se fue de tu Descarte, Desgaste 2: Convoca un Guardián del Templo (3V).',
    artColor: '#b45309',
    artIcon: 'shield',
    abilities: [
      {
        trigger: 'on_turn_end',
        wearCost: 2,
        conditionCardLeftDiscardThisTurn: true,
        steps: [
          {
            op: 'summon_token',
            destZone: 'same_row',
            tokenDef: {
              id: 'token_guardian_templo',
              name: 'Guardián del Templo',
              vitality: 3,
              count: 1,
              artIcon: 'shield',
              description: 'Autómata ancestral del Templo Antiguo.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'pala_neumatica',
    name: 'Pala neumática',
    type: 'tool',
    vitality: 5,
    planet: 'Vapor',
    description: 'Cuando descartas una carta, Desgaste 1: Levanta una carta del mazo.',
    artColor: '#475569',
    artIcon: 'zap',
    abilities: [
      {
        trigger: 'on_any_discard',
        wearCost: 1,
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
    id: 'trampa_defectuosa',
    name: 'Trampa defectuosa',
    type: 'tool',
    vitality: 4,
    planet: 'Vapor',
    description:
      'Al final del turno, Desgaste 1: hace 1 de daño al ciudadano enemigo más débil. Al morir y al descartar: hace 1 de daño al enemigo más débil 4 veces.',
    artColor: '#991b1b',
    artIcon: 'flame',
    abilities: [
      {
        trigger: 'on_turn_end',
        wearCost: 1,
        steps: [WEAKEST_ENEMY_STEP],
      },
      {
        trigger: 'on_death',
        steps: [
          WEAKEST_ENEMY_STEP,
          WEAKEST_ENEMY_STEP,
          WEAKEST_ENEMY_STEP,
          WEAKEST_ENEMY_STEP,
        ],
      },
      {
        trigger: 'on_discard',
        steps: [
          WEAKEST_ENEMY_STEP,
          WEAKEST_ENEMY_STEP,
          WEAKEST_ENEMY_STEP,
          WEAKEST_ENEMY_STEP,
        ],
      },
    ],
  },
  {
    id: 'fabrica_de_robots',
    name: 'Fábrica de robots',
    type: 'tool',
    vitality: 8,
    planet: 'Vapor',
    description: 'Al final del turno: Convoca un Robot (2V) con “Al morir: convoca un Dron (1V)”.',
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
              description: 'Al morir: convoca un Dron (1V).',
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
    id: 'planeta_plutonio',
    name: 'Planeta Plutonio (Mazo Inicial — 40 Cartas)',
    description:
      'Comandante: General Brazo de cañón. Sinergia de sacrificios, mutaciones del cementerio, Zombies y Locaciones contaminadas.',
    cards: expandDeck({
      general_brazo_de_canon: 1,
      mercenarios_de_emergencia: 2,
      mensajero: 2,
      lluvia_acida: 2,
      supersoldado_de_elite: 3,
      fuerza_antihuelga: 3,
      cadetes_trillizos: 3,
      pila_de_muertos: 3,
      constructor_de_cementerios: 3,
      municiones_vivas: 3,
      extension_artificial_de_vida: 3,
      sujeto_de_prueba: 3,
      la_noche_de_los_muertos_vivos: 3,
      cementerio_infectado: 3,
      cremadora_sospechosa: 3,
    }),
  },
  {
    id: 'planeta_vapor',
    name: 'Planeta Vapor (Mazo Inicial — 40 Cartas)',
    description:
      'Comandante: Espidi. Sinergia de descartes explosivos, Herramientas con Desgaste, Trampas defectuosas y exploradores del desierto.',
    cards: expandDeck({
      espidi: 1,
      mercenarios_de_emergencia: 1,
      dado_de_baja: 2,
      explorador_de_basura: 3,
      nadador_de_basura: 3,
      demoledor_de_basura: 3,
      guia_contratado: 3,
      vendedor_ambulante: 3,
      lanzador_de_escombros: 3,
      camino_bifurcado: 3,
      busqueda_del_tesoro: 3,
      rayo_vengativo: 3,
      templo_antiguo: 3,
      pala_neumatica: 3,
      trampa_defectuosa: 3,
    }),
  },
  {
    id: 'bastion_imperial',
    name: 'Bastión de Testeo (Clásico)',
    description:
      'Mazo equilibrado con las cartas básicas de testeo: Caballeros Galardonados, Reclutadores de guerra, Granjeros, Protector de los débiles y Científico loco.',
    cards: expandDeck({
      caballero_galardonado: 2,
      reclutador_de_guerra: 3,
      granjero: 3,
      mago_de_las_tormentas: 2,
      mensajero: 2,
      protector_de_los_debiles: 2,
      germinador: 2,
      cientifico_loco: 1,
      asesino: 1,
      rayo_vengativo: 2,
      mision_de_investigacion: 1,
      retirada: 1,
      mercenarios_de_emergencia: 2,
    }),
  },
];

export const DEFAULT_RULES_CONFIG: GameRulesConfig = {
  vitalityMode: 'dynamic',
  retaliationDamage: true,
  startingPlayer: 'player',
  pointsToWin: 5,
  pointsEveryTwoTurns: true,
  maxUnitsPerZone: 5,
  maxHandSize: 10,
  initialHandSize: 4,
  drawPerTurn: 2,
  firstTurnDraw: 2,
  maxPlaysPerTurn: 3,
  firstTurnMaxPlays: 3,
  maxMovesPerTurn: 5,
  deckConstraints: {
    enforced: false,
    minCards: 15,
    maxCards: 40,
    maxCopiesPerCard: 3,
  },
};
