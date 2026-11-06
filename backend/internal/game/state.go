package game

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
	InstanceID       string         `json:"instanceId"`
	OwnerID          string         `json:"ownerId"`
	Definition       CardDefinition `json:"definition"`
	BaseVitality     int            `json:"baseVitality"`
	CurrentVitality  int            `json:"currentVitality"`
	Zone             ZoneID         `json:"zone"`
	PlayedThisTurn   bool           `json:"playedThisTurn"`
	AttackedThisTurn bool           `json:"attackedThisTurn"`
}

// AttackPower returns the damage this Citizen deals when attacking under the given VitalityMode.
func (c *CardInstance) AttackPower(mode VitalityMode) int {
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
	ID                string                     `json:"id"`
	Name              string                     `json:"name"`
	DevelopmentPoints int                        `json:"developmentPoints"`
	MulliganDone      bool                       `json:"mulliganDone"`
	Deck              []*CardInstance            `json:"deck"`
	Hand              []*CardInstance            `json:"hand"`
	Discard           []*CardInstance            `json:"discard"`
	Exile             []*CardInstance            `json:"exile"`
	Board             map[ZoneID][]*CardInstance `json:"board"`
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

// QueuedEffect is an atomic effect step waiting in the resolution queue.
type QueuedEffect struct {
	ControllerID   string     `json:"controllerId"`
	SourceCardID   string     `json:"sourceCardId"`
	SourceCardName string     `json:"sourceCardName"`
	SourceZone     ZoneID     `json:"sourceZone"`
	Step           EffectStep `json:"step"`
}

// PendingPrompt describes an interactive choice required from a player.
type PendingPrompt struct {
	PlayerID       string         `json:"playerId"`
	SourceCardID   string         `json:"sourceCardId"`
	SourceCardName string         `json:"sourceCardName"`
	PromptText     string         `json:"promptText"`
	OriginPhase    GamePhase      `json:"originPhase"`
	TargetZones    []ZoneID       `json:"targetZones"`
	TargetOwner    TargetOwner    `json:"targetOwner"`
	ValidTargetIDs []string       `json:"validTargetIds"`
	CandidateCards []CardInstance `json:"candidateCards"` // Populated so UI can show Deck/Discard modals
	QueuedStep     QueuedEffect   `json:"-"`
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
	Seq                int64               `json:"seq"`
	Type               ActionAnimationType `json:"type"`
	ActorID            string              `json:"actorId"`
	ActorName          string              `json:"actorName"`
	CardInstanceID     string              `json:"cardInstanceId,omitempty"`
	CardName           string              `json:"cardName,omitempty"`
	CardDefinition     *CardDefinition     `json:"cardDefinition,omitempty"`
	FromZone           ZoneID              `json:"fromZone,omitempty"`
	ToZone             ZoneID              `json:"toZone,omitempty"`
	TargetCardID       string              `json:"targetCardId,omitempty"`
	TargetCardName     string              `json:"targetCardName,omitempty"`
	TargetCardSnapshot *CardInstance       `json:"targetCardSnapshot,omitempty"`
	Amount             int                 `json:"amount,omitempty"`
	Destroyed          bool                `json:"destroyed,omitempty"`
	BannerText         string              `json:"bannerText"`
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

// GameState is the authoritative state of a match.
type GameState struct {
	ID              string          `json:"id"`
	GameName        string          `json:"gameName"`
	Rules           GameRulesConfig `json:"rules"`
	Phase           GamePhase       `json:"phase"`
	ResumePhase     GamePhase       `json:"resumePhase"` // Phase to resume after PhaseAwaitingInput finishes
	TurnNumber      int             `json:"turnNumber"`
	ActivePlayerIdx int             `json:"activePlayerIdx"`
	PlaysRemaining  int             `json:"playsRemaining"`
	MovesRemaining  int             `json:"movesRemaining"`
	Players         [2]*PlayerState `json:"players"`
	EffectQueue     []QueuedEffect  `json:"-"`
	PendingPrompt   *PendingPrompt  `json:"pendingPrompt,omitempty"`
	WinnerID        string          `json:"winnerId,omitempty"`
	WinReason       string          `json:"winReason,omitempty"`
	Log             []LogEntry      `json:"log"`
	StateVersion    int64           `json:"stateVersion"`
	nextInstanceSeq int
	nextAnimSeq     int64
	animSteps       []rawStepRecord
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
	You                 SanitizedPlayerView  `json:"you"`
	Opponent            *SanitizedPlayerView `json:"opponent,omitempty"`
	WinnerID            string               `json:"winnerId,omitempty"`
	WinReason           string               `json:"winReason,omitempty"`
	Log                 []LogEntry           `json:"log"`
	RecentSteps         []ActionStepSnapshot `json:"recentSteps,omitempty"`
}
