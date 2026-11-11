export type ZoneID =
  | 'city'
  | 'road'
  | 'combat'
  | 'hand'
  | 'deck'
  | 'discard'
  | 'exile'
  | 'same_row'
  | 'leader'
  | 'any_row';

export type CardType = 'citizen' | 'event' | 'tool';

export type TriggerType =
  | 'on_play'
  | 'on_turn_start'
  | 'on_turn_end'
  | 'immediate'
  | 'on_death'
  | 'on_event_played'
  | 'on_discard'
  | 'on_any_discard'
  | 'activated_wear';

export type EffectOpType =
  | 'summon_token'
  | 'deal_damage'
  | 'draw_cards'
  | 'move_zone'
  | 'destroy'
  | 'modify_stat'
  | 'discard_cards'
  | 'summon_self'
  | 'mill_or_sacrifice'
  | 'exile_and_summon_by_v'
  | 'cycle_hand';

export type TargetRequirement =
  | 'none'
  | 'single_card'
  | 'all_matching'
  | 'self_card'
  | 'self'
  | 'right_neighbor'
  | 'weakest_enemy';

export type TargetOwner = 'self' | 'enemy' | 'any';

export interface TargetRule {
  requirement: TargetRequirement;
  owner?: TargetOwner;
  zones?: ZoneID[];
  cardType?: CardType | '';
  excludeCardType?: CardType | '';
  onlyLocations?: boolean;
  excludeSourceCard?: boolean;
  matchStoredCardType?: boolean;
  random?: boolean;
  prompt?: string;
}

export interface TokenTemplate {
  id: string;
  name: string;
  vitality: number;
  count?: number;
  bonusCountIfEnemyMorePoints?: number;
  artIcon?: string;
  description?: string;
  hasShield?: boolean;
  isDefender?: boolean;
  hasQuickAttack?: boolean;
  hasReach?: boolean;
  abilities?: Ability[];
}

export interface EffectStep {
  op: EffectOpType;
  amount?: number;
  statTarget?: 'vitality' | 'armor';
  target?: TargetRule;
  destZone?: ZoneID;
  shuffleDeck?: boolean;
  tokenDef?: TokenTemplate;
  storeVictimVitality?: boolean;
  useStoredVitality?: boolean;
  storeTargetCardType?: boolean;
  grantSelfShieldOnSuccess?: boolean;
  scaleByDiscardCitizens?: boolean;
  scaleCountByAlliedDeathsThisTurn?: boolean;
  sacrificeAtTurnEnd?: boolean;
  modifyBaseVitality?: boolean;
}

export interface Ability {
  trigger: TriggerType;
  wearCost?: number;
  oncePerTurn?: boolean;
  conditionAlliedDiedThisTurn?: boolean;
  conditionCardLeftDiscardThisTurn?: boolean;
  conditionEnemyMorePoints?: boolean;
  conditionDiscardMinCitizens?: number;
  steps: EffectStep[];
}

export interface CardLayoutConfig {
  cardWidthPx?: number;
  cardHeightPx?: number;
  artHeightPct?: number;
  imageFit?: 'cover' | 'contain' | 'fill';
  titleFontSizePx?: number;
  bodyFontSizePx?: number;
  bodyTextAlign?: 'left' | 'center' | 'justify';
  bodyFontFamily?: 'sans' | 'serif' | 'mono';
}

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  subtype?: string;
  vitality: number;
  armor?: number;
  description: string;
  abilities?: Ability[];
  isSpy?: boolean;
  hasShield?: boolean;
  isDefender?: boolean;
  hasQuickAttack?: boolean;
  hasReach?: boolean;
  isCommander?: boolean;
  isLocation?: boolean;
  planet?: string;
  borderColor?: string;
  layout?: CardLayoutConfig;
  playFromDiscard?: boolean;
  isToken?: boolean;
  isCustom?: boolean;
  artColor?: string;
  artIcon?: string;
  artImage?: string;
}

export const PLANET_COLORS: Record<string, string> = {
  Plutonio: '#a855f7',
  Vapor: '#f97316',
  'General / Bastión': '#38bdf8',
  Bastión: '#38bdf8',
  General: '#38bdf8',
};

export function resolveCardPlanetColor(card: Pick<CardDefinition, 'borderColor' | 'planet'>): string | undefined {
  if (card.borderColor && card.borderColor.trim() !== '') {
    return card.borderColor.trim();
  }
  if (card.planet && PLANET_COLORS[card.planet]) {
    return PLANET_COLORS[card.planet];
  }
  return undefined;
}

export interface DeckPreset {
  id: string;
  name: string;
  description: string;
  cards: CardDefinition[];
}

export type VitalityMode = 'dynamic' | 'base_attack';

export type StartingPlayerMode = 'player' | 'ai' | 'random';

export type AnimationSpeed = 'slow' | 'medium' | 'fast';

export type AIDifficulty = '' | 'easy' | 'medium' | 'hard';

export interface DeckConstraints {
  enforced: boolean;
  minCards: number;
  maxCards: number;
  maxCopiesPerCard: number;
}

export interface GameRulesConfig {
  vitalityMode: VitalityMode;
  retaliationDamage: boolean;
  startingPlayer?: StartingPlayerMode;
  pointsToWin: number;
  pointsEveryTwoTurns?: boolean;
  maxUnitsPerZone?: number;
  maxHandSize?: number;
  initialHandSize: number;
  drawPerTurn: number;
  firstTurnDraw: number;
  maxPlaysPerTurn: number;
  firstTurnMaxPlays: number;
  maxMovesPerTurn: number;
  deckConstraints: DeckConstraints;
}

export type GamePhase =
  | 'WAITING_FOR_PLAYERS'
  | 'MULLIGAN'
  | 'START_OF_TURN'
  | 'MAIN'
  | 'END_OF_TURN'
  | 'AWAITING_INPUT'
  | 'GAME_OVER';

export interface CardInstance {
  instanceId: string;
  ownerId: string;
  definition: CardDefinition;
  baseVitality: number;
  currentVitality: number;
  baseArmor?: number;
  currentArmor?: number;
  zone: ZoneID;
  playedThisTurn: boolean;
  movedThisTurn?: boolean;
  attackedThisTurn: boolean;
  usedAbilityThisTurn?: boolean;
  sacrificeAtTurnEnd?: boolean;
  shieldActive?: boolean;
  faceDown?: boolean;
}

export interface PendingPrompt {
  playerId: string;
  sourceCardId: string;
  sourceCardName: string;
  promptText: string;
  promptType?: 'cards' | 'zone';
  originPhase: GamePhase;
  targetZones: ZoneID[];
  targetOwner: TargetOwner;
  validTargetIds: string[];
  candidateCards?: CardInstance[];
  multiSelect?: boolean;
  minTargets?: number;
  maxTargets?: number;
  allowSacrificeFallback?: boolean;
}

export interface LogEntry {
  turn: number;
  phase: GamePhase;
  message: string;
}

export type ActionAnimationType =
  | 'PLAY_CITIZEN'
  | 'PLAY_EVENT'
  | 'MOVE_CITIZEN'
  | 'ATTACK'
  | 'EFFECT'
  | 'TURN_START';

export interface ActionAnimationEvent {
  seq: number;
  type: ActionAnimationType;
  actorId: string;
  actorName: string;
  cardInstanceId?: string;
  cardName?: string;
  cardDefinition?: CardDefinition;
  fromZone?: ZoneID;
  toZone?: ZoneID;
  targetCardId?: string;
  targetCardName?: string;
  targetCardSnapshot?: CardInstance;
  amount?: number;
  destroyed?: boolean;
  attackerDamage?: number;
  attackerDestroyed?: boolean;
  attackerCardSnapshot?: CardInstance;
  bannerText: string;
}

export interface ActionStepSnapshot {
  event: ActionAnimationEvent;
  you: SanitizedPlayerView;
  opponent?: SanitizedPlayerView;
  turnNumber: number;
  phase: GamePhase;
  activePlayerId: string;
  isYourTurn: boolean;
}

export interface SanitizedPlayerView {
  id: string;
  name: string;
  developmentPoints: number;
  citizenCount: number;
  mulliganDone: boolean;
  deckCount: number;
  handCount: number;
  hand?: CardInstance[];
  leader?: CardInstance;
  discard: CardInstance[];
  exile: CardInstance[];
  board: Record<'city' | 'road' | 'combat', CardInstance[]>;
}

export interface MatchCardStatView {
  cardId: string;
  cardName: string;
  cardType: CardType;
  ownerId: string;
  ownerName: string;
  timesPlayed: number;
  damageDealt: number;
  kills: number;
}

export interface PlayerMatchStatsView {
  playerId: string;
  playerName: string;
  wentFirst: boolean;
  developmentPoints: number;
  citizensAtEnd: number;
  cardsPlayed: number;
  damageDealt: number;
  enemyUnitsKilled: number;
  cardsInHand: number;
  cardsInDeck: number;
  cardsInDiscard: number;
  cardsInExile: number;
  cardBreakdown: MatchCardStatView[];
}

export interface MatchStatsView {
  totalTurns: number;
  firstPlayerId: string;
  firstPlayerName: string;
  you: PlayerMatchStatsView;
  opponent: PlayerMatchStatsView;
  topDamageCard?: MatchCardStatView;
  mostPlayedCard?: MatchCardStatView;
  mostLethalCard?: MatchCardStatView;
}

export interface ActiveEventView {
  card: CardDefinition;
  actorId: string;
  actorName: string;
  promptText?: string;
}

export interface PlayerGameView {
  gameId: string;
  gameName: string;
  stateVersion: number;
  rules: GameRulesConfig;
  phase: GamePhase;
  originPhase: GamePhase;
  turnNumber: number;
  activePlayerId: string;
  isYourTurn: boolean;
  playsRemaining: number;
  movesRemaining: number;
  canPlayInCombatZone: boolean;
  validCombatTargets: string[];
  pendingPrompt?: PendingPrompt;
  activeEvent?: ActiveEventView;
  you: SanitizedPlayerView;
  opponent?: SanitizedPlayerView;
  winnerId?: string;
  winReason?: string;
  log: LogEntry[];
  recentSteps?: ActionStepSnapshot[];
  matchStats?: MatchStatsView;
}

export interface LobbySummary {
  id: string;
  gameName: string;
  phase: GamePhase;
  playerCount: number;
  playerNames: string[];
  playerIds: string[];
  vsAi?: boolean;
  aiDifficulty?: AIDifficulty;
  rules: GameRulesConfig;
  createdAt: string;
}

export type ActionType =
  | 'MULLIGAN'
  | 'PLAY_CARD'
  | 'MOVE_CITIZEN'
  | 'ATTACK'
  | 'ACTIVATE_ABILITY'
  | 'SELECT_TARGET'
  | 'END_TURN';

export interface ActionRequest {
  playerId: string;
  type: ActionType;
  cardInstanceIds?: string[];
  cardInstanceId?: string;
  targetZone?: ZoneID;
  targetIndex?: number;
  attackerId?: string;
  defenderId?: string;
  targetCardId?: string;
}

// ============================================================================
// AI vs AI Parallel Simulation Types
// ============================================================================

export type SimStartingMode = 'alternate' | 'random' | 'deckA' | 'deckB';

export interface SimulationRequest {
  deckAName: string;
  deckACards: CardDefinition[];
  deckBName: string;
  deckBCards: CardDefinition[];
  numGames: number;
  difficulty: Exclude<AIDifficulty, ''>;
  startingMode: SimStartingMode;
  rules: GameRulesConfig;
}

export interface StatSummary {
  total: number;
  average: number;
  min: number;
  max: number;
}

export interface DeckSimulationMetrics {
  deckName: string;
  wins: number;
  winRate: number;
  winsGoingFirst: number;
  winsGoingSecond: number;
  damageDealt: StatSummary;
  cardsPlayed: StatSummary;
  cardsInHandAtEnd: StatSummary;
  developmentPoints: StatSummary;
  citizensAtEnd: StatSummary;
}

export interface CardSimulationMetrics {
  cardId: string;
  cardName: string;
  cardType: CardType;
  timesPlayed: number;
  avgPlaysPerGame: number;
  gamesPlayedIn: number;
  winsWhenPlayed: number;
  winRateWhenPlayed: number;
  damagePerGame: StatSummary;
  avgDamagePerPlay: number;
  totalKills: number;
}

export interface SimulationReport {
  totalGames: number;
  durationMs: number;
  difficulty: AIDifficulty;
  startingMode: SimStartingMode;
  deckA: DeckSimulationMetrics;
  deckB: DeckSimulationMetrics;
  draws: number;
  firstPlayerWins: number;
  firstPlayerWinRate: number;
  secondPlayerWins: number;
  secondPlayerWinRate: number;
  turnsPerGame: StatSummary;
  mostUsedCard?: CardSimulationMetrics;
  leastUsedCard?: CardSimulationMetrics;
  topDamageCard?: CardSimulationMetrics;
  cardMetrics: CardSimulationMetrics[];
}
