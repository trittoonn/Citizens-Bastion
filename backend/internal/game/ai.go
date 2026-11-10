package game

import (
	"sort"
)

// AIDifficulty defines the intelligence level of an AI opponent.
type AIDifficulty string

const (
	AIDifficultyNone   AIDifficulty = ""
	AIDifficultyEasy   AIDifficulty = "easy"
	AIDifficultyMedium AIDifficulty = "medium"
	AIDifficultyHard   AIDifficulty = "hard"
)

// AIBotID is the standard player ID for the AI opponent.
const AIBotID = "ai_bot"

// BotDisplayName returns the display name for the AI opponent in logs and HUD.
func BotDisplayName(_ AIDifficulty) string {
	return "IA"
}

// RunAITurnIfNeeded advances the GameState automatically whenever the AI needs to act
// (during Mulligan, when a PendingPrompt awaits the AI, or when it is the AI's Main Phase).
func (g *GameState) RunAITurnIfNeeded(aiPlayerID string, diff AIDifficulty) {
	if diff == AIDifficultyNone || aiPlayerID == "" {
		return
	}

	// Guard against infinite loops with a generous safety cap
	for safety := 0; safety < 80; safety++ {
		if g.Phase == PhaseGameOver || g.Phase == PhaseWaitingForPlayers {
			return
		}

		aiPlayer, aiIdx, err := g.GetPlayer(aiPlayerID)
		if err != nil || aiPlayer == nil {
			return
		}

		// 1. Handle AI Mulligan
		if g.Phase == PhaseMulligan && !aiPlayer.MulliganDone {
			mulliganIDs := g.chooseAIMulligan(aiPlayer, diff)
			_ = g.ApplyMulligan(aiPlayerID, mulliganIDs)
			continue
		}

		// 2. Handle AI PendingPrompt (target selection)
		if g.Phase == PhaseAwaitingInput && g.PendingPrompt != nil && g.PendingPrompt.PlayerID == aiPlayerID {
			if g.PendingPrompt.MultiSelect {
				multiIDs := g.chooseAIPromptMultiTargets(aiPlayer, g.Players[1-aiIdx], g.PendingPrompt, diff)
				if err := g.SubmitPromptTargets(aiPlayerID, "", multiIDs); err != nil {
					return
				}
				continue
			}
			targetID := g.chooseAIPromptTarget(aiPlayer, g.Players[1-aiIdx], g.PendingPrompt, diff)
			if targetID == "" && len(g.PendingPrompt.ValidTargetIDs) > 0 {
				targetID = g.PendingPrompt.ValidTargetIDs[0]
			}
			if err := g.SubmitPromptTarget(aiPlayerID, targetID); err != nil {
				return
			}
			continue
		}

		// 3. Handle AI Main Phase
		if g.Phase == PhaseMain && g.ActivePlayerIdx == aiIdx {
			acted := g.takeAIMainPhaseStep(aiPlayer, g.Players[1-aiIdx], diff)
			if acted {
				continue
			}
			// No more main phase actions to take; end turn
			_ = g.EndTurn(aiPlayerID)
			continue
		}

		// Otherwise it's the other player's turn or waiting on other player's mulligan/prompt
		return
	}
}

func (g *GameState) chooseAIMulligan(ai *PlayerState, diff AIDifficulty) []string {
	if diff == AIDifficultyEasy {
		return nil
	}

	var toMulligan []string
	citizenCount := 0
	for _, c := range ai.Hand {
		if c.Definition.Type == CardTypeCitizen {
			citizenCount++
		}
	}

	for _, c := range ai.Hand {
		if c.Definition.Type == CardTypeEvent {
			if c.Definition.ID == "el_regreso_del_sobreviviente" ||
				c.Definition.ID == "busqueda_del_tesoro" ||
				c.Definition.ID == "extension_artificial_de_vida" ||
				c.Definition.ID == "la_noche_de_los_muertos_vivos" ||
				c.Definition.ID == "dado_de_baja" ||
				c.Definition.ID == "retirada" ||
				((c.Definition.ID == "pacto_de_sacrificio" || c.Definition.ID == "municiones_vivas") && diff == AIDifficultyHard) ||
				citizenCount < 2 {
				toMulligan = append(toMulligan, c.InstanceID)
			}
		}
	}
	return toMulligan
}

func (g *GameState) takeAIMainPhaseStep(ai, human *PlayerState, diff AIDifficulty) bool {
	// Step A: Attack first with any ready Citizen ALREADY in the Combat Zone (before moving, since moving prevents attacking)
	if attacked := g.tryAIAttack(ai, human, diff); attacked {
		return true
	}

	// Step B: Activate any ready TriggerActivatedWear ability on board (e.g. Cremadora Sospechosa)
	if activated := g.tryAIActivateWear(ai); activated {
		return true
	}

	// Step C: Play a card from Hand (or playable from Discard) if plays remain
	if g.PlaysRemaining > 0 {
		if diff == AIDifficultyEasy && g.PlaysRemaining < g.Rules.MaxPlaysPerTurn && g.randIntn(100) < 35 {
			return false
		}
		if played := g.tryAIPlayCard(ai, human, diff); played {
			return true
		}
	}

	// Step D: Re-check attacks in case AI just played a Citizen directly into Combat Zone
	if attacked := g.tryAIAttack(ai, human, diff); attacked {
		return true
	}

	// Step E: Move any remaining eligible Citizens forward (Road -> Combat or City -> Road) for next turn
	if g.MovesRemaining > 0 {
		if moved := g.tryAIMove(ai, human, diff); moved {
			return true
		}
	}

	return false
}

func (g *GameState) tryAIActivateWear(ai *PlayerState) bool {
	for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
		if len(ai.Board[z]) >= g.maxUnitsPerZone() {
			continue
		}
		for _, c := range ai.Board[z] {
			if c.UsedAbilityThisTurn {
				continue
			}
			for _, ab := range c.Definition.Abilities {
				if ab.Trigger == TriggerActivatedWear {
					if err := g.ActivateCardAbility(ai.ID, c.InstanceID); err == nil {
						return true
					}
				}
			}
		}
	}
	return false
}

func (g *GameState) tryAIMove(ai, human *PlayerState, diff AIDifficulty) bool {
	if g.countMovableCitizens(ai) <= 0 {
		return false
	}

	if diff == AIDifficultyEasy && g.randIntn(100) < 50 {
		return false
	}

	maxZone := g.maxUnitsPerZone()

	// Move strong Citizens from Road -> Combat so they can attack next turn
	if len(ai.Board[ZoneCombat]) < maxZone {
		var roadCandidates []*CardInstance
		for _, c := range ai.Board[ZoneRoad] {
			if c.Definition.Type == CardTypeCitizen && !c.PlayedThisTurn && !c.MovedThisTurn && !c.AttackedThisTurn {
				roadCandidates = append(roadCandidates, c)
			}
		}
		if len(roadCandidates) > 0 {
			sort.Slice(roadCandidates, func(i, j int) bool {
				return roadCandidates[i].AttackPower(g.Rules.VitalityMode) > roadCandidates[j].AttackPower(g.Rules.VitalityMode)
			})
			for _, best := range roadCandidates {
				if diff != AIDifficultyHard || best.Definition.ID != "mago_de_las_tormentas" || best.CurrentVitality >= 6 {
					if err := g.MoveCitizen(ai.ID, best.InstanceID, ZoneCombat); err == nil {
						return true
					}
				}
			}
		}
	}

	// Move Citizens from City -> Road so they can reach Combat
	if len(ai.Board[ZoneRoad]) < maxZone {
		var cityCandidates []*CardInstance
		for _, c := range ai.Board[ZoneCity] {
			if c.Definition.Type == CardTypeCitizen && !c.PlayedThisTurn && !c.MovedThisTurn && !c.AttackedThisTurn {
				cityCandidates = append(cityCandidates, c)
			}
		}
		if len(cityCandidates) > 0 {
			sort.Slice(cityCandidates, func(i, j int) bool {
				return cityCandidates[i].AttackPower(g.Rules.VitalityMode) > cityCandidates[j].AttackPower(g.Rules.VitalityMode)
			})
			for _, cand := range cityCandidates {
				if diff == AIDifficultyHard && (cand.Definition.ID == "mago_de_las_tormentas" || cand.Definition.ID == "reclutador" || cand.Definition.ID == "granjero" || cand.Definition.ID == "lanzador_de_escombros") && len(cityCandidates) > 1 {
					continue
				}
				if err := g.MoveCitizen(ai.ID, cand.InstanceID, ZoneRoad); err == nil {
					return true
				}
			}
		}
	}

	_ = human
	return false
}

func (g *GameState) tryAIAttack(ai, human *PlayerState, diff AIDifficulty) bool {
	var readyAttackers []*CardInstance
	for _, c := range ai.Board[ZoneCombat] {
		if c.Definition.Type == CardTypeCitizen && !c.AttackedThisTurn && !c.MovedThisTurn {
			readyAttackers = append(readyAttackers, c)
		}
	}
	if len(readyAttackers) == 0 {
		return false
	}

	for _, attacker := range readyAttackers {
		validTargetIDs := g.ValidCombatTargetIDsForAttacker(ai.ID, attacker.Definition.HasReach)
		if len(validTargetIDs) == 0 {
			continue
		}

		atkPower := attacker.AttackPower(g.Rules.VitalityMode)

		if diff == AIDifficultyEasy {
			targetID := validTargetIDs[g.randIntn(len(validTargetIDs))]
			if g.AttackCitizen(ai.ID, attacker.InstanceID, targetID) == nil {
				return true
			}
			continue
		}

		var bestTarget *CardInstance
		bestScore := -9999

		for _, tid := range validTargetIDs {
			def, _, _ := g.findBoardCard(human, tid)
			if def == nil {
				continue
			}
			score := def.CurrentVitality * 10
			killsDefender := !def.ShieldActive && def.CurrentVitality <= atkPower
			if killsDefender {
				score += 100
			} else if def.ShieldActive {
				score += 25 // Breaking a shield is useful, especially with low-V attackers
			}

			if g.Rules.RetaliationDamage && !attacker.Definition.HasQuickAttack {
				defCounter := def.AttackPower(g.Rules.VitalityMode)
				attackerDies := !attacker.ShieldActive && attacker.CurrentVitality <= defCounter
				if attackerDies {
					if killsDefender && def.CurrentVitality >= attacker.CurrentVitality {
						score += 20
					} else {
						score -= 80
					}
				} else {
					score += 45
				}
			} else {
				score += 60 // Free attack (QuickAttack or no retaliation)
			}

			if score > bestScore {
				bestScore = score
				bestTarget = def
			}
		}

		if bestTarget == nil {
			continue
		}
		if diff == AIDifficultyHard && g.Rules.RetaliationDamage && !attacker.Definition.HasQuickAttack && bestScore < 0 && len(readyAttackers) == 1 {
			continue
		}
		if g.AttackCitizen(ai.ID, attacker.InstanceID, bestTarget.InstanceID) == nil {
			return true
		}
	}

	return false
}

func (g *GameState) tryAIPlayCard(ai, human *PlayerState, diff AIDifficulty) bool {
	type scoredPlay struct {
		card  *CardInstance
		zone  ZoneID
		score int
	}

	canCombat := g.CanPlayInCombat(ai.ID)
	maxZone := g.maxUnitsPerZone()
	var options []scoredPlay

	candidates := append([]*CardInstance{}, ai.Hand...)
	for _, dc := range ai.Discard {
		if dc.Definition.PlayFromDiscard {
			candidates = append(candidates, dc)
		}
	}

	for _, c := range candidates {
		if c.Definition.Type == CardTypeCitizen || c.Definition.Type == CardTypeTool {
			// Check special pre-conditions so AI doesn't waste sacrifice/discard cards
			if c.Definition.ID == "cientifico_loco" {
				citInDisc := 0
				for _, dc := range ai.Discard {
					if dc.Definition.Type == CardTypeCitizen {
						citInDisc++
					}
				}
				if citInDisc == 0 {
					continue
				}
			}
			if c.Definition.ID == "general_brazo_de_canon" || c.Definition.ID == "supersoldado_de_elite" {
				if ai.TotalCitizensOnBoard() == 0 {
					continue
				}
			}
			if c.Definition.ID == "espidi" && len(ai.Hand) <= 2 {
				continue
			}

			requiresMill := 0
			for _, ab := range c.Definition.Abilities {
				for _, st := range ab.Steps {
					if st.Op == EffectMillOrSacrifice {
						requiresMill = st.Amount
						if requiresMill <= 0 {
							requiresMill = 3
						}
					}
				}
			}
			if requiresMill > 0 {
				availDiscard := len(ai.Discard)
				if c.Zone == ZoneDiscard {
					availDiscard--
				}
				if availDiscard < requiresMill {
					continue
				}
			}

			if c.Definition.IsSpy {
				var bestSpyZone ZoneID
				bestVictimVal := 0
				for _, z := range []ZoneID{ZoneCombat, ZoneRoad, ZoneCity} {
					if len(human.Board[z]) > 0 && len(human.Board[z]) < maxZone {
						victim := human.Board[z][0]
						if victim.CurrentVitality > bestVictimVal {
							bestVictimVal = victim.CurrentVitality
							bestSpyZone = z
						}
					}
				}
				if bestVictimVal >= 4 {
					options = append(options, scoredPlay{card: c, zone: bestSpyZone, score: bestVictimVal * 15})
				}
				continue
			}

			score := c.Definition.Vitality * 10
			if c.Definition.ID == "pila_de_muertos" {
				for _, dc := range ai.Discard {
					if dc.Definition.Type == CardTypeCitizen {
						score += 12
					}
				}
			}
			for _, ab := range c.Definition.Abilities {
				if ab.Trigger == TriggerOnPlay || ab.Trigger == TriggerTurnEnd || ab.Trigger == TriggerTurnStart || ab.Trigger == TriggerOnDeath || ab.Trigger == TriggerOnEventPlayed || ab.Trigger == TriggerOnAnyDiscard || ab.Trigger == TriggerActivatedWear {
					score += 35
				}
			}

			targetZone := ZoneRoad
			if c.Definition.Type == CardTypeTool {
				targetZone = ZoneCity
			} else if diff == AIDifficultyEasy {
				targetZone = ZoneCity
				if g.randIntn(100) < 40 {
					targetZone = ZoneRoad
				}
			} else {
				isBacklineEngine := c.Definition.ID == "reclutador" || c.Definition.ID == "granjero" || c.Definition.ID == "mago_de_las_tormentas" || c.Definition.ID == "germinador" || c.Definition.ID == "lanzador_de_escombros" || c.Definition.ID == "vendedor_ambulante" || c.Definition.Vitality <= 3
				if isBacklineEngine {
					targetZone = ZoneCity
				} else if canCombat && (c.Definition.Vitality >= 5 || c.Definition.HasQuickAttack) {
					targetZone = ZoneCombat
					score += 20
				} else {
					targetZone = ZoneRoad
				}
			}

			// Fallback if preferred zone is full (max 5 units per zone)
			if len(ai.Board[targetZone]) >= maxZone {
				foundZone := ZoneID("")
				for _, fz := range []ZoneID{ZoneRoad, ZoneCity, ZoneCombat} {
					if fz == ZoneCombat && !canCombat {
						continue
					}
					if len(ai.Board[fz]) < maxZone {
						foundZone = fz
						break
					}
				}
				if foundZone == "" {
					continue
				}
				targetZone = foundZone
			}

			options = append(options, scoredPlay{card: c, zone: targetZone, score: score})
		} else {
			score := g.evaluateAIEventScore(ai, human, c, diff)
			if score > 0 {
				options = append(options, scoredPlay{card: c, zone: ZoneCombat, score: score})
			}
		}
	}

	if len(options) == 0 {
		return false
	}

	sort.Slice(options, func(i, j int) bool {
		return options[i].score > options[j].score
	})

	for _, opt := range options {
		if err := g.PlayCard(ai.ID, opt.card.InstanceID, opt.zone); err == nil {
			return true
		}
	}
	return false
}

func (g *GameState) evaluateAIEventScore(ai, human *PlayerState, eventCard *CardInstance, diff AIDifficulty) int {
	switch eventCard.Definition.ID {
	case "rayo_vengativo":
		if human.TotalCitizensOnBoard() == 0 {
			return -1
		}
		return 85
	case "lluvia_acida":
		if human.TotalCitizensOnBoard() <= ai.TotalCitizensOnBoard() && human.TotalCitizensOnBoard() < 2 {
			return -1
		}
		return 75
	case "la_noche_de_los_muertos_vivos":
		if ai.AlliedDeathsThisTurn <= 0 {
			return -1
		}
		return 60 + ai.AlliedDeathsThisTurn*25
	case "extension_artificial_de_vida":
		for _, c := range ai.Discard {
			if c.Definition.Type == CardTypeCitizen && c.Definition.Vitality >= 4 {
				return 80
			}
		}
		return -1
	case "el_regreso_del_sobreviviente", "busqueda_del_tesoro":
		for _, c := range ai.Discard {
			if c.Definition.Type == CardTypeCitizen || (eventCard.Definition.ID == "busqueda_del_tesoro" && c.Definition.Type == CardTypeTool) {
				return 75
			}
		}
		return -1
	case "mision_de_investigacion":
		if len(ai.Deck) == 0 {
			return -1
		}
		return 70
	case "pacto_de_sacrificio", "municiones_vivas":
		if ai.TotalCitizensOnBoard() == 0 || human.TotalCitizensOnBoard() == 0 {
			return -1
		}
		minFriendly := 999
		for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
			for _, c := range ai.Board[z] {
				if c.Definition.Type == CardTypeCitizen && c.CurrentVitality < minFriendly {
					minFriendly = c.CurrentVitality
				}
			}
		}
		maxEnemy := 0
		for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
			for _, c := range human.Board[z] {
				if c.Definition.Type == CardTypeCitizen && c.CurrentVitality > maxEnemy {
					maxEnemy = c.CurrentVitality
				}
			}
		}
		if diff == AIDifficultyEasy || (maxEnemy > minFriendly+2) {
			return 90
		}
		return -1
	case "dado_de_baja", "retirada":
		for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
			for _, c := range ai.Board[z] {
				if c.Definition.Type == CardTypeCitizen && c.BaseVitality-c.CurrentVitality >= 4 {
					return 65
				}
			}
		}
		return -1
	default:
		for _, ab := range eventCard.Definition.Abilities {
			for stepIdx, step := range ab.Steps {
				if step.Target.Requirement == TargetReqSingleCard {
					if stepIdx > 0 && step.Op == EffectDiscard {
						continue
					}
					cands := g.findCandidateTargets(ai.ID, eventCard.InstanceID, step.Target)
					if len(cands) == 0 {
						return -1
					}
					if (step.Op == EffectDealDamage || step.Op == EffectDestroy) && step.Target.Owner == TargetOwnerAny && human.TotalCitizensOnBoard() == 0 {
						return -1
					}
				}
			}
		}
		return 60
	}
}

func (g *GameState) chooseAIPromptTarget(ai, human *PlayerState, prompt *PendingPrompt, diff AIDifficulty) string {
	if len(prompt.ValidTargetIDs) == 0 {
		return ""
	}
	if diff == AIDifficultyEasy {
		return prompt.ValidTargetIDs[g.randIntn(len(prompt.ValidTargetIDs))]
	}

	step := prompt.QueuedStep.Step

	// 1. If destroying or damaging an enemy (or any) card: pick an enemy card!
	if step.Op == EffectDealDamage || (step.Op == EffectDestroy && step.Target.Owner != TargetOwnerSelf) {
		var enemyTargets []*CardInstance
		for _, id := range prompt.ValidTargetIDs {
			c := g.findCardAnywhere(id)
			if c != nil && c.OwnerID != ai.ID {
				enemyTargets = append(enemyTargets, c)
			}
		}
		if len(enemyTargets) > 0 {
			dmg := step.Amount
			if step.UseStoredVitality {
				dmg = g.lastStoredVitality
			}
			if step.Op == EffectDealDamage {
				var bestKill *CardInstance
				for _, et := range enemyTargets {
					if !et.ShieldActive && et.CurrentVitality <= dmg {
						if bestKill == nil || et.CurrentVitality > bestKill.CurrentVitality {
							bestKill = et
						}
					}
				}
				if bestKill != nil {
					return bestKill.InstanceID
				}
			}
			sort.Slice(enemyTargets, func(i, j int) bool {
				return enemyTargets[i].CurrentVitality > enemyTargets[j].CurrentVitality
			})
			return enemyTargets[0].InstanceID
		}
	}

	// 2. If sacrificing a friendly citizen (EffectDestroy with Owner == Self):
	// Prefer Sujeto de prueba / Cadetes Trillizos (deathwish) or lowest CurrentVitality
	if step.Op == EffectDestroy && step.Target.Owner == TargetOwnerSelf {
		var friendly []*CardInstance
		for _, id := range prompt.ValidTargetIDs {
			if c := g.findCardAnywhere(id); c != nil {
				friendly = append(friendly, c)
			}
		}
		if len(friendly) > 0 {
			sort.Slice(friendly, func(i, j int) bool {
				return friendly[i].CurrentVitality < friendly[j].CurrentVitality
			})
			return friendly[0].InstanceID
		}
	}

	// 3. If discarding a card from hand (EffectDiscard): prefer a card with TriggerOnDiscard (Nadador de basura / Trampa defectuosa) or lowest Vitality
	if step.Op == EffectDiscard {
		var lowest *CardInstance
		for _, id := range prompt.ValidTargetIDs {
			c := g.findCardAnywhere(id)
			if c == nil {
				continue
			}
			for _, ab := range c.Definition.Abilities {
				if ab.Trigger == TriggerOnDiscard {
					return c.InstanceID
				}
			}
			if lowest == nil || c.Definition.Vitality < lowest.Definition.Vitality {
				lowest = c
			}
		}
		if lowest != nil {
			return lowest.InstanceID
		}
	}

	// 4. If searching Deck or returning from Discard to Hand or exiling from Discard for Abominación/Zombie: pick highest Vitality
	if step.Op == EffectMoveZone {
		var best *CardInstance
		for _, id := range prompt.ValidTargetIDs {
			c := g.findCardAnywhere(id)
			if c == nil {
				continue
			}
			if best == nil || c.Definition.Vitality > best.Definition.Vitality {
				best = c
			}
		}
		if best != nil {
			return best.InstanceID
		}
	}

	_ = human
	return prompt.ValidTargetIDs[0]
}

func (g *GameState) chooseAIPromptMultiTargets(ai, human *PlayerState, prompt *PendingPrompt, diff AIDifficulty) []string {
	if prompt == nil || len(prompt.ValidTargetIDs) == 0 {
		return nil
	}

	var chosen []string
	for _, id := range prompt.ValidTargetIDs {
		c := g.findCardAnywhere(id)
		if c == nil {
			continue
		}
		hasOnDiscard := false
		for _, ab := range c.Definition.Abilities {
			if ab.Trigger == TriggerOnDiscard {
				hasOnDiscard = true
				break
			}
		}
		if hasOnDiscard || c.Definition.PlayFromDiscard {
			chosen = append(chosen, c.InstanceID)
			continue
		}
		if c.Definition.Type == CardTypeEvent && len(ai.Discard) == 0 &&
			(c.Definition.ID == "el_regreso_del_sobreviviente" || c.Definition.ID == "busqueda_del_tesoro") {
			chosen = append(chosen, c.InstanceID)
			continue
		}
		if c.Definition.Type == CardTypeCitizen && c.Definition.Vitality <= 3 && len(chosen) < 2 {
			chosen = append(chosen, c.InstanceID)
		}
	}

	if len(chosen) == 0 && diff != AIDifficultyEasy && len(prompt.ValidTargetIDs) > 0 {
		// Cycle at least 1 card if nothing obvious was picked
		chosen = append(chosen, prompt.ValidTargetIDs[0])
	}
	_ = human
	return chosen
}
