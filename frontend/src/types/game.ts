export type ZoneID =
  | 'city'
  | 'road'
  | 'combat'
  | 'hand'
  | 'deck'
  | 'discard'
  | 'exile'
  | 'same_row';

export type CardType = 'citizen' | 'event';

export type TriggerType =
  | 'on_play'
  | 'on_turn_start'
  | 'on_turn_end'
  | 'immediate';

export type EffectOpType =
  | 'summon_token'
  | 'deal_damage'
  | 'draw_cards'
  | 'move_zone'
  | 'destroy'
  | 'modify_stat';

export type TargetRequirement =
  | 'none'
  | 'single_card'
  | 'all_matching'
  | 'self_card';

export type TargetOwner = 'self' | 'enemy' | 'any';

export interface TargetRule {
  requirement: TargetRequirement;
  owner?: TargetOwner;
  zones?: ZoneID[];
  cardType?: CardType | '';
  prompt?: string;
}

export interface TokenTemplate {
  id: string;
  name: string;
  vitality: number;
  count?: number;
  artIcon?: string;
}

export interface EffectStep {
  op: EffectOpType;
  amount?: number;
  target?: TargetRule;
  destZone?: ZoneID;
  shuffleDeck?: boolean;
  tokenDef?: TokenTemplate;
}

export interface Ability {
  trigger: TriggerType;
  steps: EffectStep[];
}

export interface CardDefinition {
  id: string;
  name: string;
  type: CardType;
  vitality: number;
  description: string;
  abilities?: Ability[];
  isToken?: boolean;
  isCustom?: boolean;
  artColor?: string;
  artIcon?: string;
  artImage?: string;
}

export interface DeckPreset {
  id: string;
  name: string;
  description: string;
  cards: CardDefinition[];
}

export type VitalityMode = 'dynamic' | 'base_attack';

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
  pointsToWin: number;
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
  zone: ZoneID;
  playedThisTurn: boolean;
  attackedThisTurn: boolean;
}

export interface PendingPrompt {
  playerId: string;
  sourceCardId: string;
  sourceCardName: string;
  promptText: string;
  originPhase: GamePhase;
  targetZones: ZoneID[];
  targetOwner: TargetOwner;
  validTargetIds: string[];
  candidateCards?: CardInstance[];
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
  discard: CardInstance[];
  exile: CardInstance[];
  board: Record<'city' | 'road' | 'combat', CardInstance[]>;
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
  you: SanitizedPlayerView;
  opponent?: SanitizedPlayerView;
  winnerId?: string;
  winReason?: string;
  log: LogEntry[];
  recentSteps?: ActionStepSnapshot[];
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
  | 'SELECT_TARGET'
  | 'END_TURN';

export interface ActionRequest {
  playerId: string;
  type: ActionType;
  cardInstanceIds?: string[];
  cardInstanceId?: string;
  targetZone?: ZoneID;
  attackerId?: string;
  defenderId?: string;
  targetCardId?: string;
}
