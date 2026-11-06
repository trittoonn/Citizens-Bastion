package game

import (
	"math/rand"
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
	for safety := 0; safety < 60; safety++ {
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

		// Otherwise it's the human player's turn or waiting on human mulligan/prompt
		return
	}
}

func (g *GameState) chooseAIMulligan(ai *PlayerState, diff AIDifficulty) []string {
	if diff == AIDifficultyEasy {
		// Easy AI keeps its initial hand
		return nil
	}

	// Medium & Hard AI: Mulligan Situational Events (like Sobreviviente or Pacto or Dado de baja)
	// so the opening hand has strong Citizens to deploy on Turn 1/2.
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
				c.Definition.ID == "dado_de_baja" ||
				(c.Definition.ID == "pacto_de_sacrificio" && diff == AIDifficultyHard) ||
				citizenCount < 2 {
				toMulligan = append(toMulligan, c.InstanceID)
			}
		}
	}
	return toMulligan
}

func (g *GameState) takeAIMainPhaseStep(ai, human *PlayerState, diff AIDifficulty) bool {
	// Step A: Move an existing Citizen forward if beneficial (before or after playing)
	if g.MovesRemaining > 0 {
		if moved := g.tryAIMove(ai, human, diff); moved {
			return true
		}
	}

	// Step B: Attack with any ready Citizen in the Combat Zone
	if attacked := g.tryAIAttack(ai, human, diff); attacked {
		return true
	}

	// Step C: Play a card from Hand if plays remain
	if g.PlaysRemaining > 0 && len(ai.Hand) > 0 {
		// On Easy difficulty, if AI already played at least 1 card this turn, 35% chance to stop playing early
		if diff == AIDifficultyEasy && g.PlaysRemaining < g.Rules.MaxPlaysPerTurn && rand.Intn(100) < 35 {
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

	return false
}

func (g *GameState) tryAIMove(ai, human *PlayerState, diff AIDifficulty) bool {
	if g.MovesRemaining <= 0 {
		return false
	}

	// Easy AI only moves 50% of the time, and moves the first movable Citizen from City -> Road or Road -> Combat
	if diff == AIDifficultyEasy && rand.Intn(100) < 50 {
		return false
	}

	// Prefer moving the highest-Vitality Citizen from Road -> Combat so it can attack right away!
	var roadCandidates []*CardInstance
	for _, c := range ai.Board[ZoneRoad] {
		if !c.PlayedThisTurn {
			roadCandidates = append(roadCandidates, c)
		}
	}
	if len(roadCandidates) > 0 && human.TotalCitizensOnBoard() > 0 {
		sort.Slice(roadCandidates, func(i, j int) bool {
			return roadCandidates[i].AttackPower(g.Rules.VitalityMode) > roadCandidates[j].AttackPower(g.Rules.VitalityMode)
		})
		best := roadCandidates[0]
		// Hard AI keeps fragile value engines (like Mago de las Tormentas 4V) out of Combat if there are other units
		if diff != AIDifficultyHard || best.Definition.ID != "mago_de_las_tormentas" || best.CurrentVitality >= 6 {
			if err := g.MoveCitizen(ai.ID, best.InstanceID, ZoneCombat); err == nil {
				return true
			}
		}
	}

	// Otherwise move a strong Citizen from City -> Road so it can reach Combat next turn
	var cityCandidates []*CardInstance
	for _, c := range ai.Board[ZoneCity] {
		if !c.PlayedThisTurn {
			cityCandidates = append(cityCandidates, c)
		}
	}
	if len(cityCandidates) > 0 {
		sort.Slice(cityCandidates, func(i, j int) bool {
			return cityCandidates[i].AttackPower(g.Rules.VitalityMode) > cityCandidates[j].AttackPower(g.Rules.VitalityMode)
		})
		for _, cand := range cityCandidates {
			if diff == AIDifficultyHard && (cand.Definition.ID == "mago_de_las_tormentas" || cand.Definition.ID == "reclutador") && len(cityCandidates) > 1 {
				continue
			}
			if err := g.MoveCitizen(ai.ID, cand.InstanceID, ZoneRoad); err == nil {
				return true
			}
		}
	}

	return false
}

func (g *GameState) tryAIAttack(ai, human *PlayerState, diff AIDifficulty) bool {
	validTargetIDs := g.ValidCombatTargetIDs(ai.ID)
	if len(validTargetIDs) == 0 {
		return false
	}

	var readyAttackers []*CardInstance
	for _, c := range ai.Board[ZoneCombat] {
		if !c.AttackedThisTurn {
			readyAttackers = append(readyAttackers, c)
		}
	}
	if len(readyAttackers) == 0 {
		return false
	}

	attacker := readyAttackers[0]
	atkPower := attacker.AttackPower(g.Rules.VitalityMode)

	// Easy AI picks a random valid target
	if diff == AIDifficultyEasy {
		targetID := validTargetIDs[rand.Intn(len(validTargetIDs))]
		return g.AttackCitizen(ai.ID, attacker.InstanceID, targetID) == nil
	}

	// Medium & Hard AI: Score each target, taking RetaliationDamage into account if enabled.
	var bestTarget *CardInstance
	bestScore := -9999

	for _, tid := range validTargetIDs {
		def, _, _ := g.findBoardCard(human, tid)
		if def == nil {
			continue
		}
		score := def.CurrentVitality * 10
		killsDefender := def.CurrentVitality <= atkPower
		if killsDefender {
			score += 100
		}

		if g.Rules.RetaliationDamage {
			defCounter := def.AttackPower(g.Rules.VitalityMode)
			attackerDies := attacker.CurrentVitality <= defCounter
			if attackerDies {
				if killsDefender && def.CurrentVitality >= attacker.CurrentVitality {
					// Favorable or even 1-for-1 trade
					score += 20
				} else {
					// Attacker dies without killing a higher/equal value unit
					score -= 80
				}
			} else {
				// Attacker survives the counter-attack!
				score += 45
			}
		}

		if score > bestScore {
			bestScore = score
			bestTarget = def
		}
	}

	if bestTarget == nil {
		return false
	}
	// On Hard difficulty with RetaliationDamage, avoid pointless suicide attacks (score < 0) unless we have multiple attackers
	if diff == AIDifficultyHard && g.Rules.RetaliationDamage && bestScore < 0 && len(readyAttackers) == 1 {
		return false
	}

	return g.AttackCitizen(ai.ID, attacker.InstanceID, bestTarget.InstanceID) == nil
}

func (g *GameState) tryAIPlayCard(ai, human *PlayerState, diff AIDifficulty) bool {
	// Score each playable card in hand
	type scoredPlay struct {
		card  *CardInstance
		zone  ZoneID
		score int
	}

	canCombat := g.CanPlayInCombat(ai.ID)
	var options []scoredPlay

	for _, c := range ai.Hand {
		if c.Definition.Type == CardTypeCitizen {
			score := c.Definition.Vitality * 10
			for _, ab := range c.Definition.Abilities {
				if ab.Trigger == TriggerOnPlay || ab.Trigger == TriggerTurnEnd || ab.Trigger == TriggerTurnStart {
					score += 35
				}
			}

			// Determine best zone based on difficulty and card role
			targetZone := ZoneRoad
			if diff == AIDifficultyEasy {
				targetZone = ZoneCity
				if rand.Intn(100) < 40 {
					targetZone = ZoneRoad
				}
			} else {
				isBacklineEngine := c.Definition.ID == "reclutador" || c.Definition.ID == "mago_de_las_tormentas" || c.Definition.Vitality <= 4
				if isBacklineEngine {
					targetZone = ZoneCity
				} else if canCombat && c.Definition.Vitality >= 6 {
					targetZone = ZoneCombat
					score += 20 // Immediate combat presence & can attack this turn!
				} else {
					targetZone = ZoneRoad
				}
			}

			options = append(options, scoredPlay{card: c, zone: targetZone, score: score})
		} else {
			// Event card: evaluate if it is beneficial right now
			score := g.evaluateAIEventScore(ai, human, c, diff)
			if score > 0 {
				options = append(options, scoredPlay{card: c, zone: "", score: score})
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
	case "el_regreso_del_sobreviviente":
		hasCitizenInDiscard := false
		for _, c := range ai.Discard {
			if c.Definition.Type == CardTypeCitizen {
				hasCitizenInDiscard = true
				break
			}
		}
		if !hasCitizenInDiscard {
			return -1
		}
		return 75
	case "mision_de_investigacion":
		if len(ai.Deck) == 0 {
			return -1
		}
		return 70
	case "pacto_de_sacrificio":
		if ai.TotalCitizensOnBoard() == 0 || human.TotalCitizensOnBoard() == 0 {
			return -1
		}
		// Only worth playing if human has a strong citizen (>= 6V) and AI has a cheap citizen (<= 2V, like a Recluta)
		minFriendly := 999
		for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
			for _, c := range ai.Board[z] {
				if c.CurrentVitality < minFriendly {
					minFriendly = c.CurrentVitality
				}
			}
		}
		maxEnemy := 0
		for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
			for _, c := range human.Board[z] {
				if c.CurrentVitality > maxEnemy {
					maxEnemy = c.CurrentVitality
				}
			}
		}
		if diff == AIDifficultyEasy || (maxEnemy > minFriendly+2) {
			return 90
		}
		return -1
	case "dado_de_baja":
		// Only bounce a friendly citizen if it is heavily damaged (e.g. CurrentVitality <= BaseVitality - 4)
		for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
			for _, c := range ai.Board[z] {
				if c.BaseVitality-c.CurrentVitality >= 4 {
					return 65
				}
			}
		}
		return -1
	default:
		// Custom event card: check if it has valid targets
		for _, ab := range eventCard.Definition.Abilities {
			for _, step := range ab.Steps {
				if step.Target.Requirement == TargetReqSingleCard {
					cands := g.findCandidateTargets(ai.ID, eventCard.InstanceID, step.Target)
					if len(cands) == 0 {
						return -1
					}
					// Avoid playing harmful effects if only friendly targets exist
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
		return prompt.ValidTargetIDs[rand.Intn(len(prompt.ValidTargetIDs))]
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
			// If damage, prefer an enemy that dies to step.Amount; otherwise highest CurrentVitality
			if step.Op == EffectDealDamage {
				var bestKill *CardInstance
				for _, et := range enemyTargets {
					if et.CurrentVitality <= step.Amount {
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

	// 2. If sacrificing a friendly citizen (EffectDestroy with Owner == Self): pick lowest CurrentVitality (e.g. 1V Recluta)
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

	// 3. If searching Deck or returning from Discard to Hand: pick highest Vitality Citizen
	if step.Op == EffectMoveZone && step.DestZone == ZoneHand {
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

	return prompt.ValidTargetIDs[0]
}
