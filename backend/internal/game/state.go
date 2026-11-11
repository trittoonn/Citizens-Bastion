package game

import "math/rand"

// GamePhase represents the explicit phase of a match and turn.
type GamePhase string

const (
	PhaseWaitingForPlayers GamePhase = "WAITING_FOR_PLAYERS"
	PhaseMulligan          GamePhase = "MULLIGAN"
	PhaseStartOfTurn       GamePhase = "START_OF_TURN"
	PhaseMain              GamePhase = "MAIN"
	PhaseEndOfTurn         GamePhase = "END_OF_TURN"
	PhaseAwaitingInput     GamePhase = "AWAITING_INPUT"
	PhaseGameOver          GamePhase = "GAME_OVER"
)

// CardInstance is an individual in-game instance of a CardDefinition.
type CardInstance struct {
	InstanceID          string         `json:"instanceId"`
	OwnerID             string         `json:"ownerId"`
	Definition          CardDefinition `json:"definition"`
	BaseVitality        int            `json:"baseVitality"`
	CurrentVitality     int            `json:"currentVitality"`
	BaseArmor           int            `json:"baseArmor,omitempty"`
	CurrentArmor        int            `json:"currentArmor,omitempty"`
	Zone                ZoneID         `json:"zone"`
	PlayedThisTurn      bool           `json:"playedThisTurn"`
	MovedThisTurn       bool           `json:"movedThisTurn"`
	AttackedThisTurn    bool           `json:"attackedThisTurn"`
	UsedAbilityThisTurn bool           `json:"usedAbilityThisTurn,omitempty"`
	SacrificeAtTurnEnd  bool           `json:"sacrificeAtTurnEnd,omitempty"`
	ShieldActive        bool           `json:"shieldActive"`
	FaceDown            bool           `json:"faceDown,omitempty"`
}

// AttackPower returns the damage this Citizen deals when attacking under the given VitalityMode.
// Tools (Herramientas) have 0 attack power.
func (c *CardInstance) AttackPower(mode VitalityMode) int {
	if c.Definition.Type == CardTypeTool {
		return 0
	}
	if mode == VitalityModeBaseAttack {
		return c.BaseVitality
	}
	return c.CurrentVitality
}

// Clone creates a deep copy of the CardInstance for safe view serialization.
func (c *CardInstance) Clone() CardInstance {
	if c == nil {
		return CardInstance{}
	}
	return *c
}

// PlayerState holds all zones and counters for one player.
type PlayerState struct {
	ID                       string                     `json:"id"`
	Name                     string                     `json:"name"`
	DevelopmentPoints        int                        `json:"developmentPoints"`
	MulliganDone             bool                       `json:"mulliganDone"`
	AlliedDeathsThisTurn     int                        `json:"alliedDeathsThisTurn,omitempty"`
	CardsLeftDiscardThisTurn int                        `json:"cardsLeftDiscardThisTurn,omitempty"`
	Leader                   *CardInstance              `json:"leader,omitempty"`
	Deck                     []*CardInstance            `json:"deck"`
	Hand                     []*CardInstance            `json:"hand"`
	Discard                  []*CardInstance            `json:"discard"`
	Exile                    []*CardInstance            `json:"exile"`
	Board                    map[ZoneID][]*CardInstance `json:"board"`
}

// TotalCitizensOnBoard returns the count of Citizens across City, Road, and Combat zones.
func (p *PlayerState) TotalCitizensOnBoard() int {
	total := 0
	for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
		for _, c := range p.Board[z] {
			if c.Definition.Type == CardTypeCitizen {
				total++
			}
		}
	}
	return total
}

// TotalUnitsOnBoard returns the count of all damageable units (Citizens + Tools) across City, Road, and Combat zones.
func (p *PlayerState) TotalUnitsOnBoard() int {
	total := 0
	for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
		total += len(p.Board[z])
	}
	return total
}

// QueuedEffect is an atomic effect step waiting in the resolution queue.
type QueuedEffect struct {
	ControllerID      string     `json:"controllerId"`
	SourceCardID      string     `json:"sourceCardId"`
	SourceCardDefID   string     `json:"sourceCardDefId"`
	SourceCardName    string     `json:"sourceCardName"`
	SourceZone        ZoneID     `json:"sourceZone"`
	Step              EffectStep `json:"step"`
	DestroySourceCard bool       `json:"destroySourceCard,omitempty"`
	CheckCondition    *Ability   `json:"-"`
	AbilityGroupID    string     `json:"-"`
	ChosenTargetID    string     `json:"chosenTargetId,omitempty"`
	ChosenZone        ZoneID     `json:"chosenZone,omitempty"`
	ChosenIndex       *int       `json:"chosenIndex,omitempty"`
}

// PendingPrompt describes an interactive choice required from a player.
type PendingPrompt struct {
	PlayerID               string         `json:"playerId"`
	SourceCardID           string         `json:"sourceCardId"`
	SourceCardName         string         `json:"sourceCardName"`
	PromptText             string         `json:"promptText"`
	PromptType             string         `json:"promptType,omitempty"` // "cards" (default) or "zone"
	OriginPhase            GamePhase      `json:"originPhase"`
	TargetZones            []ZoneID       `json:"targetZones"`
	TargetOwner            TargetOwner    `json:"targetOwner"`
	ValidTargetIDs         []string       `json:"validTargetIds"`
	CandidateCards         []CardInstance `json:"candidateCards"` // Populated so UI can show Deck/Discard/Hand modals
	MultiSelect            bool           `json:"multiSelect,omitempty"`
	MinTargets             int            `json:"minTargets,omitempty"`
	MaxTargets             int            `json:"maxTargets,omitempty"`
	AllowSacrificeFallback bool           `json:"allowSacrificeFallback,omitempty"`
	QueuedStep             QueuedEffect   `json:"-"`
}

// LogEntry records an action or event in the match history.
type LogEntry struct {
	Turn    int       `json:"turn"`
	Phase   GamePhase `json:"phase"`
	Message string    `json:"message"`
}

// ActionAnimationType describes the visual action for step-by-step frontend playback.
type ActionAnimationType string

const (
	AnimPlayCitizen ActionAnimationType = "PLAY_CITIZEN"
	AnimPlayEvent   ActionAnimationType = "PLAY_EVENT"
	AnimMoveCitizen ActionAnimationType = "MOVE_CITIZEN"
	AnimAttack      ActionAnimationType = "ATTACK"
	AnimEffect      ActionAnimationType = "EFFECT"
	AnimTurnStart   ActionAnimationType = "TURN_START"
)

// ActionAnimationEvent carries metadata about a discrete game action or effect.
type ActionAnimationEvent struct {
	Seq                  int64               `json:"seq"`
	Type                 ActionAnimationType `json:"type"`
	ActorID              string              `json:"actorId"`
	ActorName            string              `json:"actorName"`
	CardInstanceID       string              `json:"cardInstanceId,omitempty"`
	CardName             string              `json:"cardName,omitempty"`
	CardDefinition       *CardDefinition     `json:"cardDefinition,omitempty"`
	FromZone             ZoneID              `json:"fromZone,omitempty"`
	ToZone               ZoneID              `json:"toZone,omitempty"`
	TargetCardID         string              `json:"targetCardId,omitempty"`
	TargetCardName       string              `json:"targetCardName,omitempty"`
	TargetCardSnapshot   *CardInstance       `json:"targetCardSnapshot,omitempty"`
	Amount               int                 `json:"amount,omitempty"`
	Destroyed            bool                `json:"destroyed,omitempty"`
	AttackerDamage       int                 `json:"attackerDamage,omitempty"`
	AttackerDestroyed    bool                `json:"attackerDestroyed,omitempty"`
	AttackerCardSnapshot *CardInstance       `json:"attackerCardSnapshot,omitempty"`
	BannerText           string              `json:"bannerText"`
}

type rawStepRecord struct {
	Event           ActionAnimationEvent
	PlayersSnapshot [2]SanitizedPlayerView
	TurnNumber      int
	Phase           GamePhase
	ActivePlayerID  string
}

// ActionStepSnapshot is a player-perspective step sent in PlayerGameView.RecentSteps
// so the frontend can replay AI and opponent actions one by one with animations.
type ActionStepSnapshot struct {
	Event          ActionAnimationEvent `json:"event"`
	You            SanitizedPlayerView  `json:"you"`
	Opponent       *SanitizedPlayerView `json:"opponent,omitempty"`
	TurnNumber     int                  `json:"turnNumber"`
	Phase          GamePhase            `json:"phase"`
	ActivePlayerID string               `json:"activePlayerId"`
	IsYourTurn     bool                 `json:"isYourTurn"`
}

// MatchTelemetry collects per-match statistics for PvP, Player vs AI, and AI vs AI simulations.
type MatchTelemetry struct {
	FirstPlayerIdx    int
	CardsPlayedBySlot [2]int
	TotalDamageBySlot [2]int
	KillsBySlot       [2]int
	PlaysByCard       map[string]int
	DamageByCard      map[string]int
	KillsByCard       map[string]int
	PlaysBySlotCard   [2]map[string]int
	DamageBySlotCard  [2]map[string]int
	KillsBySlotCard   [2]map[string]int
	CardNames         map[string]string
	CardTypes         map[string]CardType
	PlayedByWinner    map[string]bool
	PlayedInMatch     map[string]bool
}

// NewMatchTelemetry initializes an empty MatchTelemetry tracker.
func NewMatchTelemetry() *MatchTelemetry {
	return &MatchTelemetry{
		FirstPlayerIdx: -1,
		PlaysByCard:    make(map[string]int),
		DamageByCard:   make(map[string]int),
		KillsByCard:    make(map[string]int),
		PlaysBySlotCard: [2]map[string]int{
			make(map[string]int),
			make(map[string]int),
		},
		DamageBySlotCard: [2]map[string]int{
			make(map[string]int),
			make(map[string]int),
		},
		KillsBySlotCard: [2]map[string]int{
			make(map[string]int),
			make(map[string]int),
		},
		CardNames:      make(map[string]string),
		CardTypes:      make(map[string]CardType),
		PlayedByWinner: make(map[string]bool),
		PlayedInMatch:  make(map[string]bool),
	}
}

// MatchCardStatView holds per-card telemetry for a single match.
type MatchCardStatView struct {
	CardID      string   `json:"cardId"`
	CardName    string   `json:"cardName"`
	CardType    CardType `json:"cardType"`
	OwnerID     string   `json:"ownerId"`
	OwnerName   string   `json:"ownerName"`
	TimesPlayed int      `json:"timesPlayed"`
	DamageDealt int      `json:"damageDealt"`
	Kills       int      `json:"kills"`
}

// PlayerMatchStatsView holds aggregated match telemetry for one player in a match.
type PlayerMatchStatsView struct {
	PlayerID          string              `json:"playerId"`
	PlayerName        string              `json:"playerName"`
	WentFirst         bool                `json:"wentFirst"`
	DevelopmentPoints int                 `json:"developmentPoints"`
	CitizensAtEnd     int                 `json:"citizensAtEnd"`
	CardsPlayed       int                 `json:"cardsPlayed"`
	DamageDealt       int                 `json:"damageDealt"`
	EnemyUnitsKilled  int                 `json:"enemyUnitsKilled"`
	CardsInHand       int                 `json:"cardsInHand"`
	CardsInDeck       int                 `json:"cardsInDeck"`
	CardsInDiscard    int                 `json:"cardsInDiscard"`
	CardsInExile      int                 `json:"cardsInExile"`
	CardBreakdown     []MatchCardStatView `json:"cardBreakdown"`
}

// MatchStatsView is the complete telemetry summary for a match.
type MatchStatsView struct {
	TotalTurns      int                  `json:"totalTurns"`
	FirstPlayerID   string               `json:"firstPlayerId"`
	FirstPlayerName string               `json:"firstPlayerName"`
	You             PlayerMatchStatsView `json:"you"`
	Opponent        PlayerMatchStatsView `json:"opponent"`
	TopDamageCard   *MatchCardStatView   `json:"topDamageCard,omitempty"`
	MostPlayedCard  *MatchCardStatView   `json:"mostPlayedCard,omitempty"`
	MostLethalCard  *MatchCardStatView   `json:"mostLethalCard,omitempty"`
}

// ActiveEventView describes an Event card that is currently being resolved (so the opponent can see it until it finishes).
type ActiveEventView struct {
	Card       CardDefinition `json:"card"`
	ActorID    string         `json:"actorId"`
	ActorName  string         `json:"actorName"`
	PromptText string         `json:"promptText,omitempty"`
}

// GameState is the authoritative state of a match.
type GameState struct {
	ID                  string           `json:"id"`
	GameName            string           `json:"gameName"`
	Rules               GameRulesConfig  `json:"rules"`
	Phase               GamePhase        `json:"phase"`
	ResumePhase         GamePhase        `json:"resumePhase"` // Phase to resume after PhaseAwaitingInput finishes
	TurnNumber          int              `json:"turnNumber"`
	ActivePlayerIdx     int              `json:"activePlayerIdx"`
	PlaysRemaining      int              `json:"playsRemaining"`
	MovesRemaining      int              `json:"movesRemaining"`
	Players             [2]*PlayerState  `json:"players"`
	EffectQueue         []QueuedEffect   `json:"-"`
	PendingPrompt       *PendingPrompt   `json:"pendingPrompt,omitempty"`
	ActiveEvent         *ActiveEventView `json:"activeEvent,omitempty"`
	WinnerID            string           `json:"winnerId,omitempty"`
	WinReason           string           `json:"winReason,omitempty"`
	Log                 []LogEntry       `json:"log"`
	StateVersion        int64            `json:"stateVersion"`
	Telemetry           *MatchTelemetry  `json:"-"`
	DisableAnimSteps    bool             `json:"-"`
	rng                 *rand.Rand
	lastStoredVitality  int
	lastStoredCardType  CardType
	lastStoredCardID    string
	nextInstanceSeq     int
	nextAbilityGroupSeq int
	nextAnimSeq         int64
	animSteps           []rawStepRecord
}

// SanitizedPlayerView is a player's state with hidden cards (Deck/Opponent Hand) masked as counts.
type SanitizedPlayerView struct {
	ID                string                    `json:"id"`
	Name              string                    `json:"name"`
	DevelopmentPoints int                       `json:"developmentPoints"`
	CitizenCount      int                       `json:"citizenCount"`
	MulliganDone      bool                      `json:"mulliganDone"`
	DeckCount         int                       `json:"deckCount"`
	HandCount         int                       `json:"handCount"`
	Leader            *CardInstance             `json:"leader,omitempty"`
	Hand              []CardInstance            `json:"hand,omitempty"` // Only populated for the viewing player
	Discard           []CardInstance            `json:"discard"`
	Exile             []CardInstance            `json:"exile"`
	Board             map[ZoneID][]CardInstance `json:"board"`
}

// PlayerGameView is the polling response tailored for a specific player.
type PlayerGameView struct {
	GameID              string               `json:"gameId"`
	GameName            string               `json:"gameName"`
	StateVersion        int64                `json:"stateVersion"`
	Rules               GameRulesConfig      `json:"rules"`
	Phase               GamePhase            `json:"phase"`
	OriginPhase         GamePhase            `json:"originPhase"`
	TurnNumber          int                  `json:"turnNumber"`
	ActivePlayerID      string               `json:"activePlayerId"`
	IsYourTurn          bool                 `json:"isYourTurn"`
	PlaysRemaining      int                  `json:"playsRemaining"`
	MovesRemaining      int                  `json:"movesRemaining"`
	CanPlayInCombatZone bool                 `json:"canPlayInCombatZone"`
	ValidCombatTargets  []string             `json:"validCombatTargets"`
	PendingPrompt       *PendingPrompt       `json:"pendingPrompt,omitempty"`
	ActiveEvent         *ActiveEventView     `json:"activeEvent,omitempty"`
	You                 SanitizedPlayerView  `json:"you"`
	Opponent            *SanitizedPlayerView `json:"opponent,omitempty"`
	WinnerID            string               `json:"winnerId,omitempty"`
	WinReason           string               `json:"winReason,omitempty"`
	Log                 []LogEntry           `json:"log"`
	RecentSteps         []ActionStepSnapshot `json:"recentSteps,omitempty"`
	MatchStats          *MatchStatsView      `json:"matchStats,omitempty"`
}
