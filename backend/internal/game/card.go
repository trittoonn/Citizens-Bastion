package game

import "fmt"

// ZoneID identifies a board or off-board card zone.
type ZoneID string

const (
	ZoneCity    ZoneID = "city"
	ZoneRoad    ZoneID = "road"
	ZoneCombat  ZoneID = "combat"
	ZoneHand    ZoneID = "hand"
	ZoneDeck    ZoneID = "deck"
	ZoneDiscard ZoneID = "discard"
	ZoneExile   ZoneID = "exile"
	ZoneSameRow ZoneID = "same_row" // Relative zone used by effects like summon_token
)

// IsBoardZone returns true if the zone is one of the 3 active battlefield rows.
func IsBoardZone(z ZoneID) bool {
	return z == ZoneCity || z == ZoneRoad || z == ZoneCombat
}

// AreZonesAdjacent returns true if a Citizen can move between from and to in one step.
// City <-> Road <-> Combat (City and Combat are NOT adjacent).
func AreZonesAdjacent(from, to ZoneID) bool {
	if from == ZoneCity && to == ZoneRoad {
		return true
	}
	if from == ZoneRoad && (to == ZoneCity || to == ZoneCombat) {
		return true
	}
	if from == ZoneCombat && to == ZoneRoad {
		return true
	}
	return false
}

// CardType distinguishes Citizens from Events.
type CardType string

const (
	CardTypeCitizen CardType = "citizen"
	CardTypeEvent   CardType = "event"
)

// TriggerType defines when an ability activates.
type TriggerType string

const (
	TriggerOnPlay    TriggerType = "on_play"       // Al jugar (not when summoned/invoked)
	TriggerTurnStart TriggerType = "on_turn_start" // Al comienzo del turno (after drawing)
	TriggerTurnEnd   TriggerType = "on_turn_end"   // Al final del turno (before Development Points)
	TriggerImmediate TriggerType = "immediate"     // Eventos (upon being played)
)

// EffectOpType defines the atomic action performed by an effect step.
type EffectOpType string

const (
	EffectSummonToken EffectOpType = "summon_token" // Invoca un ciudadano token en una fila
	EffectDealDamage  EffectOpType = "deal_damage"  // Hace X de daño a objetivo(s)
	EffectDrawCards   EffectOpType = "draw_cards"   // Levanta X cartas del mazo
	EffectMoveZone    EffectOpType = "move_zone"    // Mueve una carta de una zona a otra (ej. descarte/mazo/campo a mano/exilio)
	EffectDestroy     EffectOpType = "destroy"      // Destruye un ciudadano (sacrificio o destrucción directa)
	EffectModifyStat  EffectOpType = "modify_stat"  // Modifica Vitalidad (+V / curación o -V)
)

// TargetRequirement specifies how targets are chosen.
type TargetRequirement string

const (
	TargetReqNone        TargetRequirement = "none"         // No target needed (e.g. draw_cards, summon_token)
	TargetReqSingleCard  TargetRequirement = "single_card"  // Player chooses 1 matching card
	TargetReqAllMatching TargetRequirement = "all_matching" // Automatically affects all matching cards
	TargetReqSelfCard    TargetRequirement = "self_card"    // Automatically affects the source card itself
)

// TargetOwner filters targets by controller.
type TargetOwner string

const (
	TargetOwnerSelf  TargetOwner = "self"
	TargetOwnerEnemy TargetOwner = "enemy"
	TargetOwnerAny   TargetOwner = "any"
)

// TargetRule defines which cards are valid targets for an EffectStep.
type TargetRule struct {
	Requirement TargetRequirement `json:"requirement"`
	Owner       TargetOwner       `json:"owner,omitempty"`
	Zones       []ZoneID          `json:"zones,omitempty"`
	CardType    CardType          `json:"cardType,omitempty"` // "" means any card type
	Prompt      string            `json:"prompt,omitempty"`
}

// TokenTemplate defines a summoned Citizen token (such as Recluta 1V).
type TokenTemplate struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Vitality int    `json:"vitality"`
	Count    int    `json:"count,omitempty"` // Defaults to 1
	ArtIcon  string `json:"artIcon,omitempty"`
}

// EffectStep is a single atomic step inside an Ability.
type EffectStep struct {
	Op          EffectOpType   `json:"op"`
	Amount      int            `json:"amount,omitempty"`
	Target      TargetRule     `json:"target,omitempty"`
	DestZone    ZoneID         `json:"destZone,omitempty"`
	ShuffleDeck bool           `json:"shuffleDeck,omitempty"`
	TokenDef    *TokenTemplate `json:"tokenDef,omitempty"`
}

// Ability pairs a trigger with one or more sequential EffectSteps.
type Ability struct {
	Trigger TriggerType  `json:"trigger"`
	Steps   []EffectStep `json:"steps"`
}

// CardDefinition is the serializable blueprint of a card (base or custom).
type CardDefinition struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Type        CardType  `json:"type"`
	Vitality    int       `json:"vitality"` // Base Vitality (V) for Citizens; 0 for Events
	Description string    `json:"description"`
	Abilities   []Ability `json:"abilities,omitempty"`
	IsToken     bool      `json:"isToken,omitempty"`
	IsCustom    bool      `json:"isCustom,omitempty"`
	ArtColor    string    `json:"artColor,omitempty"`
	ArtIcon     string    `json:"artIcon,omitempty"`
	ArtImage    string    `json:"artImage,omitempty"`
}

// Validate checks that a CardDefinition is well-formed.
func (c CardDefinition) Validate() error {
	if c.Name == "" {
		return fmt.Errorf("el nombre de la carta es obligatorio")
	}
	if c.Type != CardTypeCitizen && c.Type != CardTypeEvent {
		return fmt.Errorf("tipo de carta inválido: %s", c.Type)
	}
	if c.Type == CardTypeCitizen && c.Vitality <= 0 {
		return fmt.Errorf("los Ciudadanos deben tener Vitalidad (V) mayor a 0")
	}
	return nil
}
