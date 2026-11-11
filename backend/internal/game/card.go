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
	ZoneLeader  ZoneID = "leader"   // Zona de Líder (separada de la mano, a la izquierda del tablero)
	ZoneSameRow ZoneID = "same_row" // Relative zone used by effects like summon_token
	ZoneAnyRow  ZoneID = "any_row"  // Player chooses which board row (City, Road, or Combat)
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

// CardType distinguishes Citizens, Tools, and Events.
type CardType string

const (
	CardTypeCitizen CardType = "citizen"
	CardTypeEvent   CardType = "event"
	CardTypeTool    CardType = "tool"
)

// TriggerType defines when an ability activates.
type TriggerType string

const (
	TriggerOnPlay        TriggerType = "on_play"         // Al jugar (not when summoned/invoked)
	TriggerTurnStart     TriggerType = "on_turn_start"   // Al comienzo del turno (after drawing)
	TriggerTurnEnd       TriggerType = "on_turn_end"     // Al final del turno (before Development Points)
	TriggerImmediate     TriggerType = "immediate"       // Eventos (upon being played)
	TriggerOnDeath       TriggerType = "on_death"        // Al morir / Último deseo (when sent from board to discard)
	TriggerOnEventPlayed TriggerType = "on_event_played" // Cuando juegues un Evento (while on board)
	TriggerOnDiscard     TriggerType = "on_discard"      // Al descartar esta carta de tu mano
	TriggerOnAnyDiscard  TriggerType = "on_any_discard"  // Cuando descartas una carta (mientras esta carta está en juego)
	TriggerActivatedWear TriggerType = "activated_wear"  // Habilidad activable en mesa pagando Desgaste X
)

// EffectOpType defines the atomic action performed by an effect step.
type EffectOpType string

const (
	EffectSummonToken            EffectOpType = "summon_token"              // Invoca un ciudadano token en una fila
	EffectDealDamage             EffectOpType = "deal_damage"               // Hace X de daño a objetivo(s)
	EffectDrawCards              EffectOpType = "draw_cards"                // Levanta X cartas del mazo
	EffectMoveZone               EffectOpType = "move_zone"                 // Mueve una carta de una zona a otra (ej. descarte/mazo/campo a mano/exilio/campo)
	EffectDestroy                EffectOpType = "destroy"                   // Destruye/sacrifica una carta
	EffectModifyStat             EffectOpType = "modify_stat"               // Modifica Vitalidad (+V / curación o -V)
	EffectDiscard                EffectOpType = "discard_cards"             // Descarta carta(s) de la mano (dispara on_discard y on_any_discard)
	EffectSummonSelf             EffectOpType = "summon_self"               // Convoca esta misma carta desde el descarte al campo
	EffectMillOrSacrifice        EffectOpType = "mill_or_sacrifice"         // Tritura X cartas del descarte o sacrifica esta carta
	EffectExileAndSummonByV      EffectOpType = "exile_and_summon_by_v"     // Tritura hasta X Ciudadanos del descarte y convoca token con V = suma de V
	EffectCycleHand              EffectOpType = "cycle_hand"                // Descarta cartas de la mano y levanta la misma cantidad (Espidi)
)

// TargetRequirement specifies how targets are chosen.
type TargetRequirement string

const (
	TargetReqNone          TargetRequirement = "none"           // No target needed (e.g. draw_cards, summon_token)
	TargetReqSingleCard    TargetRequirement = "single_card"    // Player chooses 1 matching card
	TargetReqAllMatching   TargetRequirement = "all_matching"   // Automatically affects all matching cards
	TargetReqSelfCard      TargetRequirement = "self_card"      // Automatically affects the source card itself
	TargetReqRightNeighbor TargetRequirement = "right_neighbor" // Automatically affects the card immediately to the right in the same row
	TargetReqWeakestEnemy  TargetRequirement = "weakest_enemy"  // Automatically affects the enemy Citizen with lowest CurrentVitality
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
	Requirement         TargetRequirement `json:"requirement"`
	Owner               TargetOwner       `json:"owner,omitempty"`
	Zones               []ZoneID          `json:"zones,omitempty"`
	CardType            CardType          `json:"cardType,omitempty"`            // "" means any card type
	ExcludeCardType     CardType          `json:"excludeCardType,omitempty"`     // e.g. exclude "event" so both Citizen and Tool match
	OnlyLocations       bool              `json:"onlyLocations,omitempty"`       // Only match Tools with IsLocation == true
	ExcludeSourceCard   bool              `json:"excludeSourceCard,omitempty"`   // Exclude the source card itself (e.g. sacrifice another Citizen)
	MatchStoredCardType bool              `json:"matchStoredCardType,omitempty"` // Only match the CardType stored by a prior step
	Random              bool              `json:"random,omitempty"`              // Only select randomly if explicitly true
	Prompt              string            `json:"prompt,omitempty"`
}

// TokenTemplate defines a summoned Citizen token (such as Recluta 2V, Zombie 2V, etc.).
type TokenTemplate struct {
	ID                          string    `json:"id"`
	Name                        string    `json:"name"`
	Vitality                    int       `json:"vitality"`
	Count                       int       `json:"count,omitempty"`                       // Defaults to 1
	BonusCountIfEnemyMorePoints int       `json:"bonusCountIfEnemyMorePoints,omitempty"` // Extra tokens if opponent has more Development Points
	ArtIcon                     string    `json:"artIcon,omitempty"`
	Description                 string    `json:"description,omitempty"`
	HasShield                   bool      `json:"hasShield,omitempty"`
	IsDefender                  bool      `json:"isDefender,omitempty"`
	HasQuickAttack              bool      `json:"hasQuickAttack,omitempty"`
	HasReach                    bool      `json:"hasReach,omitempty"`
	Abilities                   []Ability `json:"abilities,omitempty"`
}

// EffectStep is a single atomic step inside an Ability.
type EffectStep struct {
	Op                               EffectOpType   `json:"op"`
	Amount                           int            `json:"amount,omitempty"`
	StatTarget                       string         `json:"statTarget,omitempty"`         // "vitality" (default) or "armor"
	ModifyBaseVitality               bool           `json:"modifyBaseVitality,omitempty"` // If true, permanently changes BaseVitality even outside the field
	Target                           TargetRule     `json:"target,omitempty"`
	DestZone                         ZoneID         `json:"destZone,omitempty"`
	ShuffleDeck                      bool           `json:"shuffleDeck,omitempty"`
	TokenDef                         *TokenTemplate `json:"tokenDef,omitempty"`
	StoreVictimVitality              bool           `json:"storeVictimVitality,omitempty"`              // Stores sacrificed target's V for the next step
	UseStoredVitality                bool           `json:"useStoredVitality,omitempty"`                // Uses stored V as Amount (damage or stat buff)
	StoreTargetCardType              bool           `json:"storeTargetCardType,omitempty"`              // Stores discarded target's CardType for the next step
	GrantSelfShieldOnSuccess         bool           `json:"grantSelfShieldOnSuccess,omitempty"`         // Grants Shield to source card if target was destroyed
	ScaleByDiscardCitizens           bool           `json:"scaleByDiscardCitizens,omitempty"`           // Scales Amount by count of Citizens in controller's Discard
	ScaleCountByAlliedDeathsThisTurn bool           `json:"scaleCountByAlliedDeathsThisTurn,omitempty"` // Summons 1 token per allied Citizen death this turn
	SacrificeAtTurnEnd               bool           `json:"sacrificeAtTurnEnd,omitempty"`               // Marks moved/summoned card to be sacrificed at end of turn
}

// Ability pairs a trigger with one or more sequential EffectSteps and optional Desgaste/condition metadata.
type Ability struct {
	Trigger                          TriggerType  `json:"trigger"`
	WearCost                         int          `json:"wearCost,omitempty"`                         // Desgaste X: la carta recibe X de daño al activar el efecto
	OncePerTurn                      bool         `json:"oncePerTurn,omitempty"`                      // Para habilidades activables una vez por turno
	ConditionAlliedDiedThisTurn      bool         `json:"conditionAlliedDiedThisTurn,omitempty"`      // Solo se activa si un Ciudadano aliado murió este turno
	ConditionCardLeftDiscardThisTurn bool         `json:"conditionCardLeftDiscardThisTurn,omitempty"` // Solo se activa si una carta salió de tu Descarte este turno
	ConditionEnemyMorePoints         bool         `json:"conditionEnemyMorePoints,omitempty"`         // Solo se activa si el oponente tiene más Puntos de Desarrollo
	ConditionDiscardMinCitizens      int          `json:"conditionDiscardMinCitizens,omitempty"`      // Solo se activa si hay al menos X Ciudadanos en tu Descarte
	Steps                            []EffectStep `json:"steps"`
}

// CardLayoutConfig holds optional per-card visual dimensions and text/image formatting.
type CardLayoutConfig struct {
	CardWidthPx    int    `json:"cardWidthPx,omitempty"`
	CardHeightPx   int    `json:"cardHeightPx,omitempty"`
	ArtHeightPct   int    `json:"artHeightPct,omitempty"`
	ImageFit       string `json:"imageFit,omitempty"`
	TitleFontSize  int    `json:"titleFontSizePx,omitempty"`
	BodyFontSize   int    `json:"bodyFontSizePx,omitempty"`
	BodyTextAlign  string `json:"bodyTextAlign,omitempty"`
	BodyFontFamily string `json:"bodyFontFamily,omitempty"`
}

// CardDefinition is the serializable blueprint of a card (base or custom).
type CardDefinition struct {
	ID              string            `json:"id"`
	Name            string            `json:"name"`
	Type            CardType          `json:"type"`
	Vitality        int               `json:"vitality"`        // Base Vitality (V) for Citizens / Armor (A) for Tools; 0 for Events
	Armor           int               `json:"armor,omitempty"` // Optional Armor (A) for Citizens (or Tools)
	Subtype         string            `json:"subtype,omitempty"`
	Description     string            `json:"description"`
	Abilities       []Ability         `json:"abilities,omitempty"`
	IsSpy           bool              `json:"isSpy,omitempty"`
	HasShield       bool              `json:"hasShield,omitempty"`
	IsDefender      bool              `json:"isDefender,omitempty"`
	HasQuickAttack  bool              `json:"hasQuickAttack,omitempty"`
	HasReach        bool              `json:"hasReach,omitempty"`
	IsCommander     bool              `json:"isCommander,omitempty"`
	IsLocation      bool              `json:"isLocation,omitempty"`
	Planet          string            `json:"planet,omitempty"`
	BorderColor     string            `json:"borderColor,omitempty"`
	Layout          *CardLayoutConfig `json:"layout,omitempty"`
	PlayFromDiscard bool              `json:"playFromDiscard,omitempty"`
	IsToken         bool              `json:"isToken,omitempty"`
	IsCustom        bool              `json:"isCustom,omitempty"`
	ArtColor        string            `json:"artColor,omitempty"`
	ArtIcon         string            `json:"artIcon,omitempty"`
	ArtImage        string            `json:"artImage,omitempty"`
}

// Validate checks that a CardDefinition is well-formed.
func (c CardDefinition) Validate() error {
	if c.Name == "" {
		return fmt.Errorf("el nombre de la carta es obligatorio")
	}
	if c.Type != CardTypeCitizen && c.Type != CardTypeEvent && c.Type != CardTypeTool {
		return fmt.Errorf("tipo de carta inválido: %s", c.Type)
	}
	if c.Type == CardTypeCitizen && c.Vitality <= 0 {
		return fmt.Errorf("los Ciudadanos deben tener Vitalidad (V) mayor a 0")
	}
	if c.Type == CardTypeTool && c.Vitality <= 0 && c.Armor <= 0 {
		return fmt.Errorf("las Herramientas deben tener Armadura (A) mayor a 0")
	}
	return nil
}
