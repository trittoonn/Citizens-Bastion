package game

// DefaultRecruitToken returns the standard 1V Recluta token definition.
func DefaultRecruitToken() TokenTemplate {
	return TokenTemplate{
		ID:       "token_recluta",
		Name:     "Recluta",
		Vitality: 1,
		Count:    1,
		ArtIcon:  "shield",
	}
}

// DefaultCards returns the 10 official test cards from docs/Reglas 2026 v1.md.
func DefaultCards() []CardDefinition {
	recruit := DefaultRecruitToken()
	boardZones := []ZoneID{ZoneCity, ZoneRoad, ZoneCombat}

	return []CardDefinition{
		{
			ID:          "caballero_galardonado",
			Name:        "Caballero Galardonado",
			Type:        CardTypeCitizen,
			Vitality:    10,
			Description: "Sin habilidades.",
			ArtColor:    "#d97706",
			ArtIcon:     "sword",
		},
		{
			ID:          "entrenador_de_guerra",
			Name:        "Entrenador de guerra",
			Type:        CardTypeCitizen,
			Vitality:    8,
			Description: "Al Jugar: Invoca en esta fila un Recluta (1V).",
			ArtColor:    "#b45309",
			ArtIcon:     "users",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &recruit,
						},
					},
				},
			},
		},
		{
			ID:          "reclutador",
			Name:        "Reclutador",
			Type:        CardTypeCitizen,
			Vitality:    6,
			Description: "Al final del turno: Invoca en esta fila un Recluta (1V).",
			ArtColor:    "#059669",
			ArtIcon:     "flag",
			Abilities: []Ability{
				{
					Trigger: TriggerTurnEnd,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &recruit,
						},
					},
				},
			},
		},
		{
			ID:          "mago_de_las_tormentas",
			Name:        "Mago de las Tormentas",
			Type:        CardTypeCitizen,
			Vitality:    4,
			Description: "Al final del turno: hace 2 de daño a un ciudadano enemigo a elección.",
			ArtColor:    "#4f46e5",
			ArtIcon:     "zap",
			Abilities: []Ability{
				{
					Trigger: TriggerTurnEnd,
					Steps: []EffectStep{
						{
							Op:     EffectDealDamage,
							Amount: 2,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerEnemy,
								Zones:       boardZones,
								CardType:    CardTypeCitizen,
								Prompt:      "Mago de las Tormentas: Elegí un Ciudadano enemigo para hacerle 2 de daño.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "mensajero",
			Name:        "Mensajero",
			Type:        CardTypeCitizen,
			Vitality:    2,
			Description: "Al jugar: Levanta una carta del mazo.",
			ArtColor:    "#0284c7",
			ArtIcon:     "scroll",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:     EffectDrawCards,
							Amount: 1,
						},
					},
				},
			},
		},
		{
			ID:          "rayo_vengativo",
			Name:        "Rayo vengativo",
			Type:        CardTypeEvent,
			Vitality:    0,
			Description: "Hace 5 de daño a un objetivo a elección.",
			ArtColor:    "#dc2626",
			ArtIcon:     "flame",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:     EffectDealDamage,
							Amount: 5,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerAny,
								Zones:       boardZones,
								CardType:    CardTypeCitizen,
								Prompt:      "Rayo vengativo: Elegí un Ciudadano objetivo para hacerle 5 de daño.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "el_regreso_del_sobreviviente",
			Name:        "El regreso del Sobreviviente",
			Type:        CardTypeEvent,
			Vitality:    0,
			Description: "Devolvé un Ciudadano de tu Descarte a tu mano.",
			ArtColor:    "#16a34a",
			ArtIcon:     "heart",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:       EffectMoveZone,
							DestZone: ZoneHand,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerSelf,
								Zones:       []ZoneID{ZoneDiscard},
								CardType:    CardTypeCitizen,
								Prompt:      "El regreso del Sobreviviente: Elegí un Ciudadano de tu Descarte para devolver a tu mano.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "mision_de_investigacion",
			Name:        "Misión de Investigación",
			Type:        CardTypeEvent,
			Vitality:    0,
			Description: "Buscá una carta de tu mazo y agregala a tu mano. Mezclá tu mazo.",
			ArtColor:    "#7c3aed",
			ArtIcon:     "search",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:          EffectMoveZone,
							DestZone:    ZoneHand,
							ShuffleDeck: true,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerSelf,
								Zones:       []ZoneID{ZoneDeck},
								Prompt:      "Misión de Investigación: Buscá una carta de tu Mazo para agregarla a tu mano.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "dado_de_baja",
			Name:        "Dado de baja",
			Type:        CardTypeEvent,
			Vitality:    0,
			Description: "Devolvé un Ciudadano de una de tus zonas a tu mano.",
			ArtColor:    "#0d9488",
			ArtIcon:     "undo",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:       EffectMoveZone,
							DestZone: ZoneHand,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerSelf,
								Zones:       boardZones,
								CardType:    CardTypeCitizen,
								Prompt:      "Dado de baja: Elegí un Ciudadano propio en el tablero para devolverlo a tu mano.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "pacto_de_sacrificio",
			Name:        "Pacto de Sacrificio",
			Type:        CardTypeEvent,
			Vitality:    0,
			Description: "Sacrificá un Ciudadano para destruir otro Ciudadano.",
			ArtColor:    "#991b1b",
			ArtIcon:     "skull",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op: EffectDestroy,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerSelf,
								Zones:       boardZones,
								CardType:    CardTypeCitizen,
								Prompt:      "Pacto de Sacrificio (1/2): Elegí un Ciudadano propio para sacrificar.",
							},
						},
						{
							Op: EffectDestroy,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerEnemy,
								Zones:       boardZones,
								CardType:    CardTypeCitizen,
								Prompt:      "Pacto de Sacrificio (2/2): Elegí un Ciudadano enemigo para destruir.",
							},
						},
					},
				},
			},
		},
	}
}

// DeckPreset represents a pre-built deck that players can use immediately.
type DeckPreset struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Cards       []CardDefinition `json:"cards"`
}

// DefaultDecks returns two balanced starter decks built from DefaultCards.
func DefaultDecks() []DeckPreset {
	byID := make(map[string]CardDefinition)
	for _, c := range DefaultCards() {
		byID[c.ID] = c
	}

	buildDeck := func(counts map[string]int, order []string) []CardDefinition {
		var result []CardDefinition
		for _, id := range order {
			c, ok := byID[id]
			if !ok {
				continue
			}
			for i := 0; i < counts[id]; i++ {
				result = append(result, c)
			}
		}
		return result
	}

	order := []string{
		"caballero_galardonado",
		"entrenador_de_guerra",
		"reclutador",
		"mago_de_las_tormentas",
		"mensajero",
		"rayo_vengativo",
		"el_regreso_del_sobreviviente",
		"mision_de_investigacion",
		"dado_de_baja",
		"pacto_de_sacrificio",
	}

	return []DeckPreset{
		{
			ID:          "bastion_imperial",
			Name:        "Bastión Imperial (Expansión)",
			Description: "Mazo enfocado en poblar las filas con Entrenadores, Reclutadores y Caballeros para dominar en puntos de Desarrollo.",
			Cards: buildDeck(map[string]int{
				"caballero_galardonado":        2,
				"entrenador_de_guerra":         3,
				"reclutador":                   3,
				"mago_de_las_tormentas":        2,
				"mensajero":                    3,
				"rayo_vengativo":               2,
				"el_regreso_del_sobreviviente": 2,
				"mision_de_investigacion":      1,
				"dado_de_baja":                 1,
				"pacto_de_sacrificio":          1,
			}, order),
		},
		{
			ID:          "tormenta_tactica",
			Name:        "Tormenta Táctica (Control)",
			Description: "Mazo agresivo que utiliza Magos de las Tormentas, Rayos Vengativos y Pactos de Sacrificio para diezmar las filas rivales.",
			Cards: buildDeck(map[string]int{
				"caballero_galardonado":        2,
				"entrenador_de_guerra":         2,
				"reclutador":                   2,
				"mago_de_las_tormentas":        3,
				"mensajero":                    3,
				"rayo_vengativo":               3,
				"el_regreso_del_sobreviviente": 1,
				"mision_de_investigacion":      2,
				"dado_de_baja":                 1,
				"pacto_de_sacrificio":          1,
			}, order),
		},
	}
}
