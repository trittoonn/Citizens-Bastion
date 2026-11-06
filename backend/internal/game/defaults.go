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

// DefaultCards returns the official cards of Citizens' Bastion.
func DefaultCards() []CardDefinition {
	recruit := DefaultRecruitToken()
	vaca := TokenTemplate{
		ID:       "token_vaca",
		Name:     "Vaca",
		Vitality: 1,
		Count:    1,
		ArtIcon:  "heart",
	}
	treant := TokenTemplate{
		ID:       "token_treant",
		Name:     "Treant",
		Vitality: 1,
		Count:    1,
		ArtIcon:  "shield",
	}
	hermano := TokenTemplate{
		ID:          "token_hermano",
		Name:        "Hermano",
		Vitality:    1,
		Count:       1,
		ArtIcon:     "users",
		Description: "Sin habilidades.",
	}
	mellizo := TokenTemplate{
		ID:          "token_mellizo",
		Name:        "Mellizo",
		Vitality:    2,
		Count:       1,
		ArtIcon:     "users",
		Description: "Último deseo: convoca un Hermano (1V).",
		Abilities: []Ability{
			{
				Trigger: TriggerOnDeath,
				Steps: []EffectStep{
					{
						Op:       EffectSummonToken,
						DestZone: ZoneSameRow,
						TokenDef: &hermano,
					},
				},
			},
		},
	}
	mercenarios := TokenTemplate{
		ID:                          "token_mercenario",
		Name:                        "Mercenario",
		Vitality:                    2,
		Count:                       2,
		BonusCountIfEnemyMorePoints: 1,
		ArtIcon:                     "sword",
		Description:                 "Token Ciudadano invocado.",
	}
	dron := TokenTemplate{
		ID:          "token_dron",
		Name:        "Dron",
		Vitality:    1,
		Count:       1,
		ArtIcon:     "zap",
		Description: "Sin habilidades.",
	}
	robot := TokenTemplate{
		ID:          "token_robot",
		Name:        "Robot",
		Vitality:    2,
		Count:       1,
		ArtIcon:     "shield",
		Description: "Último Deseo: convoca un Dron (1V).",
		Abilities: []Ability{
			{
				Trigger: TriggerOnDeath,
				Steps: []EffectStep{
					{
						Op:       EffectSummonToken,
						DestZone: ZoneSameRow,
						TokenDef: &dron,
					},
				},
			},
		},
	}

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
			ID:          "reclutador_de_guerra",
			Name:        "Reclutador de guerra",
			Type:        CardTypeCitizen,
			Vitality:    8,
			Description: "Al Jugar: Convoca en esta fila un Recluta (1V).",
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
			ID:          "granjero",
			Name:        "Granjero",
			Type:        CardTypeCitizen,
			Vitality:    4,
			Description: "Al final del turno: Convoca en esta fila una Vaca (1V).",
			ArtColor:    "#65a30d",
			ArtIcon:     "heart",
			Abilities: []Ability{
				{
					Trigger: TriggerTurnEnd,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &vaca,
						},
					},
				},
			},
		},
		{
			ID:          "mago_de_las_tormentas",
			Name:        "Mago de las Tormentas",
			Type:        CardTypeCitizen,
			Vitality:    6,
			Description: "Al comienzo del turno: hace 2 de daño a un ciudadano enemigo a elección.",
			ArtColor:    "#4f46e5",
			ArtIcon:     "zap",
			Abilities: []Ability{
				{
					Trigger: TriggerTurnStart,
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
			ID:          "asesino",
			Name:        "Asesino",
			Type:        CardTypeCitizen,
			Vitality:    1,
			IsSpy:       true,
			Description: "Espía (se juega del lado del oponente). Al jugar: Destruí al ciudadano a la derecha de esta carta.",
			ArtColor:    "#334155",
			ArtIcon:     "skull",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op: EffectDestroy,
							Target: TargetRule{
								Requirement: TargetReqRightNeighbor,
								CardType:    CardTypeCitizen,
							},
						},
					},
				},
			},
		},
		{
			ID:          "protector_de_los_debiles",
			Name:        "Protector de los débiles",
			Type:        CardTypeCitizen,
			Vitality:    7,
			HasShield:   true,
			Description: "Escudo (evita el primer daño que fuera a recibir y luego pierde el escudo).",
			ArtColor:    "#0284c7",
			ArtIcon:     "shield",
		},
		{
			ID:          "germinador",
			Name:        "Germinador",
			Type:        CardTypeCitizen,
			Vitality:    5,
			Description: "Cuando juegues un Evento, convoca un Treant (1V) en esta zona.",
			ArtColor:    "#15803d",
			ArtIcon:     "flag",
			Abilities: []Ability{
				{
					Trigger: TriggerOnEventPlayed,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &treant,
						},
					},
				},
			},
		},
		{
			ID:          "explorador_de_basura",
			Name:        "Explorador de basura",
			Type:        CardTypeCitizen,
			Vitality:    9,
			Description: "Al jugar: Descarta una carta y levanta una carta.",
			ArtColor:    "#a16207",
			ArtIcon:     "search",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:     EffectDiscard,
							Amount: 1,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerSelf,
								Zones:       []ZoneID{ZoneHand},
								Prompt:      "Explorador de basura: Elegí una carta de tu mano para descartar.",
							},
						},
						{
							Op:     EffectDrawCards,
							Amount: 1,
						},
					},
				},
			},
		},
		{
			ID:          "nadador_de_basura",
			Name:        "Nadador de basura",
			Type:        CardTypeCitizen,
			Vitality:    3,
			Description: "Cuando descartas esta carta, la convocas al Camino.",
			ArtColor:    "#0f766e",
			ArtIcon:     "undo",
			Abilities: []Ability{
				{
					Trigger: TriggerOnDiscard,
					Steps: []EffectStep{
						{
							Op:       EffectSummonSelf,
							DestZone: ZoneRoad,
						},
					},
				},
			},
		},
		{
			ID:              "demoledor_de_basura",
			Name:            "Demoledor de basura",
			Type:            CardTypeCitizen,
			Vitality:        8,
			PlayFromDiscard: true,
			Description:     "Al jugar: Triturá 3 cartas de tu descarte o sacrificá esta carta. Podés jugar esta carta desde el descarte.",
			ArtColor:        "#7c2d12",
			ArtIcon:         "flame",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:     EffectMillOrSacrifice,
							Amount: 3,
						},
					},
				},
			},
		},
		{
			ID:          "trillizos",
			Name:        "Trillizos",
			Type:        CardTypeCitizen,
			Vitality:    3,
			Description: "Último deseo: convoca un Mellizo (2V) con “Último deseo: convoca un Hermano (1V)”.",
			ArtColor:    "#6366f1",
			ArtIcon:     "users",
			Abilities: []Ability{
				{
					Trigger: TriggerOnDeath,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &mellizo,
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
		{
			ID:          "una_puerta_se_abre",
			Name:        "Una puerta se abre",
			Type:        CardTypeEvent,
			Vitality:    0,
			Description: "Levanta dos cartas y descarta una carta.",
			ArtColor:    "#0369a1",
			ArtIcon:     "scroll",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:     EffectDrawCards,
							Amount: 2,
						},
						{
							Op:     EffectDiscard,
							Amount: 1,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerSelf,
								Zones:       []ZoneID{ZoneHand},
								Prompt:      "Una puerta se abre: Elegí una carta de tu mano para descartar.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "mercenarios_de_emergencia",
			Name:        "Mercenarios de emergencia",
			Type:        CardTypeEvent,
			Vitality:    0,
			Description: "Convoca 2 Mercenarios (2V) en la Zona de combate. Si el oponente tiene más puntos de Desarrollo, convoca 3.",
			ArtColor:    "#b91c1c",
			ArtIcon:     "sword",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneCombat,
							TokenDef: &mercenarios,
						},
					},
				},
			},
		},
		{
			ID:          "fabrica_de_robots",
			Name:        "Fábrica de robots",
			Type:        CardTypeTool,
			Vitality:    8,
			Description: "Al final del turno: Convoca un Robot (2V) con “Último Deseo: convoca un Dron (1V)”.",
			ArtColor:    "#475569",
			ArtIcon:     "shield",
			Abilities: []Ability{
				{
					Trigger: TriggerTurnEnd,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &robot,
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
		"reclutador_de_guerra",
		"entrenador_de_guerra",
		"reclutador",
		"granjero",
		"mago_de_las_tormentas",
		"mensajero",
		"asesino",
		"protector_de_los_debiles",
		"germinador",
		"explorador_de_basura",
		"nadador_de_basura",
		"demoledor_de_basura",
		"trillizos",
		"rayo_vengativo",
		"el_regreso_del_sobreviviente",
		"mision_de_investigacion",
		"dado_de_baja",
		"pacto_de_sacrificio",
		"una_puerta_se_abre",
		"mercenarios_de_emergencia",
		"fabrica_de_robots",
	}

	return []DeckPreset{
		{
			ID:          "bastion_imperial",
			Name:        "Bastión Imperial (Expansión)",
			Description: "Mazo enfocado en poblar las filas con Reclutadores de guerra, Granjeros y Caballeros para dominar en puntos de Desarrollo.",
			Cards: buildDeck(map[string]int{
				"caballero_galardonado":        2,
				"reclutador_de_guerra":         3,
				"granjero":                     3,
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
			Description: "Mazo agresivo que utiliza Magos de las Tormentas, Asesinos, Rayos Vengativos y Pactos de Sacrificio para diezmar las filas rivales.",
			Cards: buildDeck(map[string]int{
				"caballero_galardonado":        2,
				"reclutador_de_guerra":         2,
				"granjero":                     2,
				"mago_de_las_tormentas":        3,
				"mensajero":                    3,
				"rayo_vengativo":               3,
				"el_regreso_del_sobreviviente": 1,
				"mision_de_investigacion":      2,
				"dado_de_baja":                 1,
				"pacto_de_sacrificio":          1,
			}, order),
		},
		{
			ID:          "ingenio_y_chatarra",
			Name:        "Ingenio y Chatarra (Sinergia Descarte y Herramientas)",
			Description: "Mazo táctico con Exploradores/Nadadores/Demoledores de basura, Trillizos, Protector de los débiles, Germinador y Fábrica de robots.",
			Cards: buildDeck(map[string]int{
				"asesino":                   2,
				"protector_de_los_debiles":  2,
				"germinador":                2,
				"explorador_de_basura":      2,
				"nadador_de_basura":         3,
				"demoledor_de_basura":       2,
				"trillizos":                 2,
				"una_puerta_se_abre":        2,
				"mercenarios_de_emergencia": 1,
				"fabrica_de_robots":         2,
			}, order),
		},
	}
}
