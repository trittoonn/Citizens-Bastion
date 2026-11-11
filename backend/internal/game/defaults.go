package game

// DefaultRecruitToken returns the standard 2V Recluta token definition.
func DefaultRecruitToken() TokenTemplate {
	return TokenTemplate{
		ID:       "token_recluta",
		Name:     "Recluta",
		Vitality: 2,
		Count:    1,
		ArtIcon:  "shield",
	}
}

// DefaultCards returns the official cards of Citizens' Bastion (Reglas 2026 v1).
func DefaultCards() []CardDefinition {
	recruit2V := DefaultRecruitToken()
	recruit1V := TokenTemplate{
		ID:       "token_recluta",
		Name:     "Recluta",
		Vitality: 1,
		Count:    1,
		ArtIcon:  "shield",
	}
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
	abominacion := TokenTemplate{
		ID:          "token_abominacion",
		Name:        "Abominación",
		Vitality:    2,
		Count:       1,
		ArtIcon:     "skull",
		Description: "Abominación creada con restos triturados.",
	}
	zombie := TokenTemplate{
		ID:          "token_zombie",
		Name:        "Zombie",
		Vitality:    2,
		Count:       1,
		ArtIcon:     "skull",
		Description: "Zombie mutante de Plutonio.",
	}
	guardianTemplo := TokenTemplate{
		ID:          "token_guardian_templo",
		Name:        "Guardián del Templo",
		Vitality:    3,
		Count:       1,
		ArtIcon:     "shield",
		Description: "Autómata ancestral del Templo Antiguo.",
	}
	oficialSolitario := TokenTemplate{
		ID:          "token_oficial_solitario",
		Name:        "Oficial Solitario",
		Vitality:    1,
		Count:       1,
		ArtIcon:     "users",
		Description: "Sin habilidades.",
	}
	policiasMellizos := TokenTemplate{
		ID:          "token_policias_mellizos",
		Name:        "Policías Mellizos",
		Vitality:    2,
		Count:       1,
		ArtIcon:     "users",
		Description: "Al morir: convoca un Oficial Solitario (1V).",
		Abilities: []Ability{
			{
				Trigger: TriggerOnDeath,
				Steps: []EffectStep{
					{
						Op:       EffectSummonToken,
						DestZone: ZoneSameRow,
						TokenDef: &oficialSolitario,
					},
				},
			},
		},
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
		Description: "Al morir: convoca un Hermano (1V).",
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
		Count:                       1,
		BonusCountIfEnemyMorePoints: 1,
		HasQuickAttack:              true,
		ArtIcon:                     "sword",
		Description:                 "Ataque Rápido.",
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
		Description: "Al morir: convoca un Dron (1V).",
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
	weakestEnemyStep := EffectStep{
		Op:     EffectDealDamage,
		Amount: 1,
		Target: TargetRule{
			Requirement: TargetReqWeakestEnemy,
			Owner:       TargetOwnerEnemy,
			Zones:       boardZones,
			CardType:    CardTypeCitizen,
		},
	}

	return []CardDefinition{
		// =====================================================================
		// CARTAS BÁSICAS DE TESTEO / NEUTRALES
		// =====================================================================
		{
			ID:          "caballero_galardonado",
			Name:        "Caballero Galardonado",
			Type:        CardTypeCitizen,
			Vitality:    8,
			Planet:      "Neutral",
			Description: "Sin habilidades.",
			ArtColor:    "#d97706",
			ArtIcon:     "sword",
		},
		{
			ID:          "reclutador_de_guerra",
			Name:        "Reclutador de guerra",
			Type:        CardTypeCitizen,
			Vitality:    6,
			Planet:      "Neutral",
			Description: "Al Jugar: Convoca en esta fila un Recluta (2V).",
			ArtColor:    "#b45309",
			ArtIcon:     "users",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &recruit2V,
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
			Planet:      "Neutral",
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
							TokenDef: &recruit1V,
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
			Planet:      "Neutral",
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
							TokenDef: &recruit1V,
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
			Planet:      "Neutral",
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
			Planet:      "Maná",
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
			Planet:      "Neutral",
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
			Planet:      "Oro",
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
			IsDefender:  true,
			Planet:      "Neutral",
			Description: "Escudo. Defensor.",
			ArtColor:    "#0284c7",
			ArtIcon:     "shield",
		},
		{
			ID:          "germinador",
			Name:        "Germinador",
			Type:        CardTypeCitizen,
			Vitality:    5,
			Planet:      "Ki",
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
			ID:          "cientifico_loco",
			Name:        "Científico loco",
			Type:        CardTypeCitizen,
			Vitality:    1,
			Planet:      "Plutonio",
			Description: "Al jugar: Tritura hasta dos Ciudadanos a elección de tu cementerio; convoca una Abominación en esta Zona con V igual a la suma de la V de las cartas trituradas.",
			ArtColor:    "#16a34a",
			ArtIcon:     "skull",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:       EffectExileAndSummonByV,
							Amount:   2,
							DestZone: ZoneSameRow,
							TokenDef: &abominacion,
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
			Planet:      "Vapor",
			Description: "Hace 4 de daño a un objetivo a elección.",
			ArtColor:    "#dc2626",
			ArtIcon:     "flame",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:     EffectDealDamage,
							Amount: 4,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerAny,
								Zones:       boardZones,
								Prompt:      "Rayo vengativo: Elegí un objetivo para hacerle 4 de daño.",
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
			Planet:      "Neutral",
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
			ID:          "retirada",
			Name:        "Retirada",
			Type:        CardTypeEvent,
			Vitality:    0,
			Planet:      "Neutral",
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
								Prompt:      "Retirada: Elegí un Ciudadano propio en el tablero para devolverlo a tu mano.",
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
			Planet:      "Vapor",
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
			ID:          "mercenarios_de_emergencia",
			Name:        "Mercenarios de emergencia",
			Type:        CardTypeEvent,
			Vitality:    0,
			Planet:      "Neutral",
			Description: "Convoca 1 Mercenario (2V) con Ataque Rápido en la Zona de combate. Si el oponente tiene más puntos de Desarrollo, convoca 2.",
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

		// =====================================================================
		// PLANETA PLUTONIO (Verde — Sacrificio, Cementerio, Mutación)
		// =====================================================================
		{
			ID:          "general_brazo_de_canon",
			Name:        "General Brazo de cañón",
			Type:        CardTypeCitizen,
			Vitality:    5,
			IsCommander: true,
			Planet:      "Plutonio",
			Description: "Comandante. Al jugar: sacrifica un Ciudadano; hace daño igual al V del Ciudadano a cualquier objetivo.",
			ArtColor:    "#15803d",
			ArtIcon:     "flame",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:                  EffectDestroy,
							StoreVictimVitality: true,
							Target: TargetRule{
								Requirement:       TargetReqSingleCard,
								Owner:             TargetOwnerSelf,
								Zones:             boardZones,
								CardType:          CardTypeCitizen,
								ExcludeSourceCard: true,
								Prompt:            "General Brazo de cañón (1/2): Elegí un Ciudadano propio para sacrificar.",
							},
						},
						{
							Op:                EffectDealDamage,
							UseStoredVitality: true,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerAny,
								Zones:       boardZones,
								Prompt:      "General Brazo de cañón (2/2): Elegí un objetivo para infligirle daño igual al V sacrificado.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "lluvia_acida",
			Name:        "Lluvia ácida",
			Type:        CardTypeEvent,
			Vitality:    0,
			Planet:      "Plutonio",
			Description: "Hace 1 punto de daño a todas las cartas en juego.",
			ArtColor:    "#4d7c0f",
			ArtIcon:     "flame",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:     EffectDealDamage,
							Amount: 1,
							Target: TargetRule{
								Requirement: TargetReqAllMatching,
								Owner:       TargetOwnerAny,
								Zones:       boardZones,
							},
						},
					},
				},
			},
		},
		{
			ID:             "supersoldado_de_elite",
			Name:           "Supersoldado de Élite",
			Type:           CardTypeCitizen,
			Vitality:       4,
			HasQuickAttack: true,
			Planet:         "Plutonio",
			Description:    "Ataque Rápido. Al jugar: sacrifica un Ciudadano; gana V igual al V del Ciudadano.",
			ArtColor:       "#166534",
			ArtIcon:        "sword",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:                  EffectDestroy,
							StoreVictimVitality: true,
							Target: TargetRule{
								Requirement:       TargetReqSingleCard,
								Owner:             TargetOwnerSelf,
								Zones:             boardZones,
								CardType:          CardTypeCitizen,
								ExcludeSourceCard: true,
								Prompt:            "Supersoldado de Élite: Elegí un Ciudadano propio para sacrificar y absorber su V.",
							},
						},
						{
							Op:                EffectModifyStat,
							UseStoredVitality: true,
							Target: TargetRule{
								Requirement: TargetReqSelfCard,
							},
						},
					},
				},
			},
		},
		{
			ID:          "fuerza_antihuelga",
			Name:        "Fuerza Antihuelga",
			Type:        CardTypeCitizen,
			Vitality:    6,
			IsDefender:  true,
			Planet:      "Plutonio",
			Description: "Defensor. Al final del turno: sacrifica el Ciudadano inmediatamente a su derecha y gana Escudo.",
			ArtColor:    "#14532d",
			ArtIcon:     "shield",
			Abilities: []Ability{
				{
					Trigger: TriggerTurnEnd,
					Steps: []EffectStep{
						{
							Op:                       EffectDestroy,
							GrantSelfShieldOnSuccess: true,
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
			ID:          "cadetes_trillizos",
			Name:        "Cadetes Trillizos",
			Type:        CardTypeCitizen,
			Vitality:    3,
			Planet:      "Plutonio",
			Description: "Al morir: convoca un Policías Mellizos (2V) con “Al morir: convoca un Oficial Solitario (1V)”.",
			ArtColor:    "#15803d",
			ArtIcon:     "users",
			Abilities: []Ability{
				{
					Trigger: TriggerOnDeath,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &policiasMellizos,
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
			Planet:      "Plutonio",
			Description: "Al morir: convoca un Mellizo (2V) con “Al morir: convoca un Hermano (1V)”.",
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
			ID:          "pila_de_muertos",
			Name:        "Pila de muertos",
			Type:        CardTypeCitizen,
			Vitality:    1,
			Planet:      "Plutonio",
			Description: "Al jugar: gana 1V por cada Ciudadano en tu Descarte.",
			ArtColor:    "#365314",
			ArtIcon:     "skull",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:                     EffectModifyStat,
							ScaleByDiscardCitizens: true,
							Target: TargetRule{
								Requirement: TargetReqSelfCard,
							},
						},
					},
				},
			},
		},
		{
			ID:          "constructor_de_cementerios",
			Name:        "Constructor de cementerios",
			Type:        CardTypeCitizen,
			Vitality:    4,
			Planet:      "Plutonio",
			Description: "Al jugar: Jugá una Locación de tu mazo.",
			ArtColor:    "#3f6212",
			ArtIcon:     "search",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op:          EffectMoveZone,
							DestZone:    ZoneAnyRow,
							ShuffleDeck: true,
							Target: TargetRule{
								Requirement:   TargetReqSingleCard,
								Owner:         TargetOwnerSelf,
								Zones:         []ZoneID{ZoneDeck},
								CardType:      CardTypeTool,
								OnlyLocations: true,
								Prompt:        "Constructor de cementerios: Elegí una Locación de tu mazo para poner en juego.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "municiones_vivas",
			Name:        "Municiones vivas",
			Type:        CardTypeEvent,
			Vitality:    0,
			Planet:      "Plutonio",
			Description: "Sacrifica a un Ciudadano para destruir a otro Ciudadano.",
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
								Prompt:      "Municiones vivas (1/2): Elegí un Ciudadano propio para sacrificar.",
							},
						},
						{
							Op: EffectDestroy,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerEnemy,
								Zones:       boardZones,
								CardType:    CardTypeCitizen,
								Prompt:      "Municiones vivas (2/2): Elegí un Ciudadano enemigo para destruir.",
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
			Planet:      "Plutonio",
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
			ID:          "extension_artificial_de_vida",
			Name:        "Extensión artificial de vida",
			Type:        CardTypeEvent,
			Vitality:    0,
			Planet:      "Plutonio",
			Description: "Convoca a un Ciudadano de tu cementerio a la Zona de Combate. Sacrificalo al final del turno.",
			ArtColor:    "#15803d",
			ArtIcon:     "zap",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:                 EffectMoveZone,
							DestZone:           ZoneCombat,
							SacrificeAtTurnEnd: true,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerSelf,
								Zones:       []ZoneID{ZoneDiscard},
								CardType:    CardTypeCitizen,
								Prompt:      "Extensión artificial de vida: Elegí un Ciudadano de tu Descarte para convocar a la Zona de Combate.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "sujeto_de_prueba",
			Name:        "Sujeto de prueba",
			Type:        CardTypeCitizen,
			Vitality:    3,
			Planet:      "Plutonio",
			Description: "Al morir: levanta una carta.",
			ArtColor:    "#047857",
			ArtIcon:     "scroll",
			Abilities: []Ability{
				{
					Trigger: TriggerOnDeath,
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
			ID:          "la_noche_de_los_muertos_vivos",
			Name:        "La noche de los muertos vivos",
			Type:        CardTypeEvent,
			Vitality:    0,
			Planet:      "Plutonio",
			Description: "Convoca un Zombie (2V) en una zona a elección por cada Ciudadano aliado que haya muerto este turno.",
			ArtColor:    "#14532d",
			ArtIcon:     "skull",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:                               EffectSummonToken,
							DestZone:                         ZoneAnyRow,
							ScaleCountByAlliedDeathsThisTurn: true,
							TokenDef:                         &zombie,
						},
					},
				},
			},
		},
		{
			ID:          "cementerio_infectado",
			Name:        "Cementerio infectado",
			Type:        CardTypeTool,
			Vitality:    5,
			IsLocation:  true,
			Planet:      "Plutonio",
			Description: "Locación. Al final del turno: si un Ciudadano aliado murió, crea un Zombie (2V) en esta zona.",
			ArtColor:    "#365314",
			ArtIcon:     "skull",
			Abilities: []Ability{
				{
					Trigger:                     TriggerTurnEnd,
					ConditionAlliedDiedThisTurn: true,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &zombie,
						},
					},
				},
			},
		},
		{
			ID:          "cremadora_sospechosa",
			Name:        "Cremadora Sospechosa",
			Type:        CardTypeTool,
			Vitality:    3,
			IsLocation:  true,
			Planet:      "Plutonio",
			Description: "Locación. Una vez por turno, Desgaste 1: Tritura un Ciudadano de tu cementerio. Convoca un Zombie (su V es igual a la V de la carta triturada) en esta zona.",
			ArtColor:    "#3f6212",
			ArtIcon:     "flame",
			Abilities: []Ability{
				{
					Trigger:     TriggerActivatedWear,
					WearCost:    1,
					OncePerTurn: true,
					Steps: []EffectStep{
						{
							Op:       EffectExileAndSummonByV,
							Amount:   1,
							DestZone: ZoneSameRow,
							TokenDef: &zombie,
						},
					},
				},
			},
		},

		// =====================================================================
		// PLANETA VAPOR (Plateado — Robots, Descartes, Herramientas, Trampas)
		// =====================================================================
		{
			ID:             "espidi",
			Name:           "Espidi",
			Type:           CardTypeCitizen,
			Vitality:       3,
			IsCommander:    true,
			HasQuickAttack: true,
			Planet:         "Vapor",
			Description:    "Comandante. Ataque Rápido. Al jugar: Descarta cualquier cantidad de cartas de tu mano y levanta la misma cantidad.",
			ArtColor:       "#475569",
			ArtIcon:        "zap",
			Abilities: []Ability{
				{
					Trigger: TriggerOnPlay,
					Steps: []EffectStep{
						{
							Op: EffectCycleHand,
						},
					},
				},
			},
		},
		{
			ID:          "explorador_de_basura",
			Name:        "Explorador de basura",
			Type:        CardTypeCitizen,
			Vitality:    5,
			Planet:      "Vapor",
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
			Planet:      "Vapor",
			Description: "Al descartar: se convoca en el Camino.",
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
			Planet:          "Vapor",
			Description:     "Al jugar: Tritura 3 cartas de tu Descarte o sacrifica esta carta. Podés jugar esta carta desde el Descarte.",
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
			ID:          "guia_contratado",
			Name:        "Guía Contratado",
			Type:        CardTypeCitizen,
			Vitality:    9,
			IsDefender:  true,
			Planet:      "Vapor",
			Description: "Defensor. Al jugar: descarta una carta.",
			ArtColor:    "#64748b",
			ArtIcon:     "shield",
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
								Prompt:      "Guía Contratado: Elegí una carta de tu mano para descartar.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "vendedor_ambulante",
			Name:        "Vendedor ambulante",
			Type:        CardTypeCitizen,
			Vitality:    6,
			Planet:      "Vapor",
			Description: "Al comienzo del turno: descarta una carta; devuelve una carta del mismo tipo de tu descarte a tu mano.",
			ArtColor:    "#475569",
			ArtIcon:     "undo",
			Abilities: []Ability{
				{
					Trigger: TriggerTurnStart,
					Steps: []EffectStep{
						{
							Op:                  EffectDiscard,
							Amount:              1,
							StoreTargetCardType: true,
							Target: TargetRule{
								Requirement: TargetReqSingleCard,
								Owner:       TargetOwnerSelf,
								Zones:       []ZoneID{ZoneHand},
								Prompt:      "Vendedor ambulante (1/2): Elegí una carta de tu mano para descartar.",
							},
						},
						{
							Op:       EffectMoveZone,
							DestZone: ZoneHand,
							Target: TargetRule{
								Requirement:         TargetReqSingleCard,
								Owner:               TargetOwnerSelf,
								Zones:               []ZoneID{ZoneDiscard},
								MatchStoredCardType: true,
								Prompt:              "Vendedor ambulante (2/2): Elegí una carta del mismo tipo de tu Descarte para devolver a tu mano.",
							},
						},
					},
				},
			},
		},
		{
			ID:          "lanzador_de_escombros",
			Name:        "Lanzador de escombros",
			Type:        CardTypeCitizen,
			Vitality:    5,
			Planet:      "Vapor",
			Description: "Cuando descartas una carta: Hace 1 punto de daño al enemigo más débil.",
			ArtColor:    "#9a3412",
			ArtIcon:     "flame",
			Abilities: []Ability{
				{
					Trigger: TriggerOnAnyDiscard,
					Steps: []EffectStep{
						weakestEnemyStep,
					},
				},
			},
		},
		{
			ID:          "camino_bifurcado",
			Name:        "Camino bifurcado",
			Type:        CardTypeEvent,
			Vitality:    0,
			Planet:      "Vapor",
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
								Prompt:      "Camino bifurcado: Elegí una carta de tu mano para descartar.",
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
			Planet:      "Vapor",
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
			ID:          "busqueda_del_tesoro",
			Name:        "Búsqueda del tesoro",
			Type:        CardTypeEvent,
			Vitality:    0,
			Planet:      "Vapor",
			Description: "Devuelve un ciudadano o Herramienta de tu Descarte a tu mano.",
			ArtColor:    "#ca8a04",
			ArtIcon:     "search",
			Abilities: []Ability{
				{
					Trigger: TriggerImmediate,
					Steps: []EffectStep{
						{
							Op:       EffectMoveZone,
							DestZone: ZoneHand,
							Target: TargetRule{
								Requirement:     TargetReqSingleCard,
								Owner:           TargetOwnerSelf,
								Zones:           []ZoneID{ZoneDiscard},
								ExcludeCardType: CardTypeEvent,
								Prompt:          "Búsqueda del tesoro: Elegí un Ciudadano o Herramienta de tu Descarte para devolver a tu mano.",
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
			Planet:      "Neutral",
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
			ID:          "templo_antiguo",
			Name:        "Templo Antiguo",
			Type:        CardTypeTool,
			Vitality:    7,
			IsLocation:  true,
			Planet:      "Vapor",
			Description: "Locación. Al final del turno si una carta se fue de tu Descarte, Desgaste 2: Convoca un Guardián del Templo (3V).",
			ArtColor:    "#b45309",
			ArtIcon:     "shield",
			Abilities: []Ability{
				{
					Trigger:                          TriggerTurnEnd,
					WearCost:                         2,
					ConditionCardLeftDiscardThisTurn: true,
					Steps: []EffectStep{
						{
							Op:       EffectSummonToken,
							DestZone: ZoneSameRow,
							TokenDef: &guardianTemplo,
						},
					},
				},
			},
		},
		{
			ID:          "pala_neumatica",
			Name:        "Pala neumática",
			Type:        CardTypeTool,
			Vitality:    5,
			Planet:      "Vapor",
			Description: "Cuando descartas una carta, Desgaste 1: Levanta una carta del mazo.",
			ArtColor:    "#475569",
			ArtIcon:     "zap",
			Abilities: []Ability{
				{
					Trigger:  TriggerOnAnyDiscard,
					WearCost: 1,
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
			ID:          "trampa_defectuosa",
			Name:        "Trampa defectuosa",
			Type:        CardTypeTool,
			Vitality:    4,
			Planet:      "Vapor",
			Description: "Al final del turno, Desgaste 1: hace 1 de daño al ciudadano enemigo más débil. Al morir y al descartar: hace 1 de daño al enemigo más débil 4 veces.",
			ArtColor:    "#991b1b",
			ArtIcon:     "flame",
			Abilities: []Ability{
				{
					Trigger:  TriggerTurnEnd,
					WearCost: 1,
					Steps: []EffectStep{
						weakestEnemyStep,
					},
				},
				{
					Trigger: TriggerOnDeath,
					Steps: []EffectStep{
						weakestEnemyStep,
						weakestEnemyStep,
						weakestEnemyStep,
						weakestEnemyStep,
					},
				},
				{
					Trigger: TriggerOnDiscard,
					Steps: []EffectStep{
						weakestEnemyStep,
						weakestEnemyStep,
						weakestEnemyStep,
						weakestEnemyStep,
					},
				},
			},
		},
		{
			ID:          "fabrica_de_robots",
			Name:        "Fábrica de robots",
			Type:        CardTypeTool,
			Vitality:    8,
			Planet:      "Vapor",
			Description: "Al final del turno: Convoca un Robot (2V) con “Al morir: convoca un Dron (1V)”.",
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

// DefaultDecks returns the official starter decks from Reglas 2026 v1.
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
		"general_brazo_de_canon",
		"espidi",
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
		"cientifico_loco",
		"supersoldado_de_elite",
		"fuerza_antihuelga",
		"cadetes_trillizos",
		"trillizos",
		"pila_de_muertos",
		"constructor_de_cementerios",
		"sujeto_de_prueba",
		"explorador_de_basura",
		"nadador_de_basura",
		"demoledor_de_basura",
		"guia_contratado",
		"vendedor_ambulante",
		"lanzador_de_escombros",
		"cementerio_infectado",
		"cremadora_sospechosa",
		"templo_antiguo",
		"pala_neumatica",
		"trampa_defectuosa",
		"fabrica_de_robots",
		"rayo_vengativo",
		"el_regreso_del_sobreviviente",
		"busqueda_del_tesoro",
		"mision_de_investigacion",
		"retirada",
		"dado_de_baja",
		"municiones_vivas",
		"pacto_de_sacrificio",
		"lluvia_acida",
		"extension_artificial_de_vida",
		"la_noche_de_los_muertos_vivos",
		"camino_bifurcado",
		"una_puerta_se_abre",
		"mercenarios_de_emergencia",
	}

	return []DeckPreset{
		{
			ID:          "planeta_plutonio",
			Name:        "Planeta Plutonio (Mazo Inicial — 40 Cartas)",
			Description: "Comandante: General Brazo de cañón. Sinergia de sacrificios, mutaciones del cementerio, Zombies y Locaciones contaminadas.",
			Cards: buildDeck(map[string]int{
				"general_brazo_de_canon":        1,
				"mercenarios_de_emergencia":     2,
				"mensajero":                     2,
				"lluvia_acida":                  2,
				"supersoldado_de_elite":         3,
				"fuerza_antihuelga":             3,
				"cadetes_trillizos":             3,
				"pila_de_muertos":               3,
				"constructor_de_cementerios":    3,
				"municiones_vivas":              3,
				"extension_artificial_de_vida":  3,
				"sujeto_de_prueba":              3,
				"la_noche_de_los_muertos_vivos": 3,
				"cementerio_infectado":          3,
				"cremadora_sospechosa":          3,
			}, order),
		},
		{
			ID:          "planeta_vapor",
			Name:        "Planeta Vapor (Mazo Inicial — 40 Cartas)",
			Description: "Comandante: Espidi. Sinergia de descartes explosivos, Herramientas con Desgaste, Trampas defectuosas y exploradores del desierto.",
			Cards: buildDeck(map[string]int{
				"espidi":                    1,
				"mercenarios_de_emergencia": 1,
				"dado_de_baja":              2,
				"explorador_de_basura":      3,
				"nadador_de_basura":         3,
				"demoledor_de_basura":       3,
				"guia_contratado":           3,
				"vendedor_ambulante":        3,
				"lanzador_de_escombros":     3,
				"camino_bifurcado":          3,
				"busqueda_del_tesoro":       3,
				"rayo_vengativo":            3,
				"templo_antiguo":            3,
				"pala_neumatica":            3,
				"trampa_defectuosa":         3,
			}, order),
		},
		{
			ID:          "bastion_imperial",
			Name:        "Bastión de Testeo (Clásico)",
			Description: "Mazo equilibrado con las cartas básicas de testeo: Caballeros Galardonados, Reclutadores de guerra, Granjeros, Protector de los débiles y Científico loco.",
			Cards: buildDeck(map[string]int{
				"caballero_galardonado":     2,
				"reclutador_de_guerra":      3,
				"granjero":                  3,
				"mago_de_las_tormentas":     2,
				"mensajero":                 2,
				"protector_de_los_debiles":  2,
				"germinador":                2,
				"cientifico_loco":           1,
				"asesino":                   1,
				"rayo_vengativo":            2,
				"mision_de_investigacion":   1,
				"retirada":                  1,
				"mercenarios_de_emergencia": 2,
			}, order),
		},
	}
}
