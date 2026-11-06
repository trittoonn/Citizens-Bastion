package game

import "fmt"

// VitalityMode controls how a Citizen's attack damage is calculated.
type VitalityMode string

const (
	// VitalityModeDynamic means a Citizen's current Vitality (V) is both its remaining health
	// and the damage it deals when attacking.
	VitalityModeDynamic VitalityMode = "dynamic"

	// VitalityModeBaseAttack means a Citizen deals damage equal to its initial BaseVitality,
	// while CurrentVitality tracks remaining health before destruction.
	VitalityModeBaseAttack VitalityMode = "base_attack"
)

// DeckConstraints defines optional deck building rules.
// By default Enforced is false so players can experiment freely.
type DeckConstraints struct {
	Enforced         bool `json:"enforced"`
	MinCards         int  `json:"minCards"`
	MaxCards         int  `json:"maxCards"`
	MaxCopiesPerCard int  `json:"maxCopiesPerCard"`
}

// GameRulesConfig holds configurable match parameters.
type GameRulesConfig struct {
	VitalityMode       VitalityMode    `json:"vitalityMode"`
	PointsToWin        int             `json:"pointsToWin"`
	InitialHandSize    int             `json:"initialHandSize"`
	DrawPerTurn        int             `json:"drawPerTurn"`
	FirstTurnDraw      int             `json:"firstTurnDraw"`
	MaxPlaysPerTurn    int             `json:"maxPlaysPerTurn"`
	FirstTurnMaxPlays  int             `json:"firstTurnMaxPlays"`
	MaxMovesPerTurn    int             `json:"maxMovesPerTurn"`
	DeckConstraints    DeckConstraints `json:"deckConstraints"`
}

// DefaultRulesConfig returns the standard rules from Reglas 2026 v1.md.
func DefaultRulesConfig() GameRulesConfig {
	return GameRulesConfig{
		VitalityMode:      VitalityModeDynamic,
		PointsToWin:       10,
		InitialHandSize:   4,
		DrawPerTurn:       2,
		FirstTurnDraw:     1,
		MaxPlaysPerTurn:   3,
		FirstTurnMaxPlays: 2,
		MaxMovesPerTurn:   1,
		DeckConstraints: DeckConstraints{
			Enforced:         false,
			MinCards:         15,
			MaxCards:         40,
			MaxCopiesPerCard: 3,
		},
	}
}

// Normalize fills in any zero-value fields with standard defaults.
func (c GameRulesConfig) Normalize() GameRulesConfig {
	def := DefaultRulesConfig()
	if c.VitalityMode != VitalityModeDynamic && c.VitalityMode != VitalityModeBaseAttack {
		c.VitalityMode = def.VitalityMode
	}
	if c.PointsToWin <= 0 {
		c.PointsToWin = def.PointsToWin
	}
	if c.InitialHandSize <= 0 {
		c.InitialHandSize = def.InitialHandSize
	}
	if c.DrawPerTurn <= 0 {
		c.DrawPerTurn = def.DrawPerTurn
	}
	if c.FirstTurnDraw <= 0 {
		c.FirstTurnDraw = def.FirstTurnDraw
	}
	if c.MaxPlaysPerTurn <= 0 {
		c.MaxPlaysPerTurn = def.MaxPlaysPerTurn
	}
	if c.FirstTurnMaxPlays <= 0 {
		c.FirstTurnMaxPlays = def.FirstTurnMaxPlays
	}
	if c.MaxMovesPerTurn <= 0 {
		c.MaxMovesPerTurn = def.MaxMovesPerTurn
	}
	if c.DeckConstraints.MinCards <= 0 {
		c.DeckConstraints.MinCards = def.DeckConstraints.MinCards
	}
	if c.DeckConstraints.MaxCards <= 0 {
		c.DeckConstraints.MaxCards = def.DeckConstraints.MaxCards
	}
	if c.DeckConstraints.MaxCopiesPerCard <= 0 {
		c.DeckConstraints.MaxCopiesPerCard = def.DeckConstraints.MaxCopiesPerCard
	}
	return c
}

// ValidateDeck checks a list of card definitions against DeckConstraints.
// Even if Enforced is false, it requires at least 1 card to start a match.
func ValidateDeck(cards []CardDefinition, constraints DeckConstraints) error {
	if len(cards) == 0 {
		return fmt.Errorf("el mazo debe contener al menos 1 carta")
	}
	for i, card := range cards {
		if err := card.Validate(); err != nil {
			return fmt.Errorf("carta inválida en posición %d (%s): %w", i, card.Name, err)
		}
	}
	if !constraints.Enforced {
		return nil
	}
	if constraints.MinCards > 0 && len(cards) < constraints.MinCards {
		return fmt.Errorf("el mazo tiene %d cartas, pero el mínimo requerido es %d", len(cards), constraints.MinCards)
	}
	if constraints.MaxCards > 0 && len(cards) > constraints.MaxCards {
		return fmt.Errorf("el mazo tiene %d cartas, pero el máximo permitido es %d", len(cards), constraints.MaxCards)
	}
	if constraints.MaxCopiesPerCard > 0 {
		counts := make(map[string]int)
		for _, card := range cards {
			key := card.ID
			if key == "" {
				key = card.Name
			}
			counts[key]++
			if counts[key] > constraints.MaxCopiesPerCard {
				return fmt.Errorf("la carta '%s' supera el límite de %d copias (%d)", card.Name, constraints.MaxCopiesPerCard, counts[key])
			}
		}
	}
	return nil
}
