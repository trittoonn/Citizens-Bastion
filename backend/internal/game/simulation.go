package game

import (
	"fmt"
	"math"
	"runtime"
	"sort"
	"sync"
	"time"
)

// SimStartingMode controls how the starting player is assigned across simulated matches.
type SimStartingMode string

const (
	SimStartAlternate SimStartingMode = "alternate" // 50% Deck A starts, 50% Deck B starts
	SimStartRandom    SimStartingMode = "random"    // Random starting player each game
	SimStartDeckA     SimStartingMode = "deckA"     // Deck A always starts first
	SimStartDeckB     SimStartingMode = "deckB"     // Deck B always starts first
)

// SimulationRequest defines the parameters for a parallel AI vs AI simulation batch.
type SimulationRequest struct {
	DeckAName    string           `json:"deckAName"`
	DeckACards   []CardDefinition `json:"deckACards"`
	DeckBName    string           `json:"deckBName"`
	DeckBCards   []CardDefinition `json:"deckBCards"`
	NumGames     int              `json:"numGames"`
	Difficulty   AIDifficulty     `json:"difficulty"`
	StartingMode SimStartingMode  `json:"startingMode"`
	Rules        GameRulesConfig  `json:"rules"`
}

// StatSummary holds average, minimum, maximum, and total for a numeric metric across matches.
type StatSummary struct {
	Total   int     `json:"total"`
	Average float64 `json:"average"`
	Min     int     `json:"min"`
	Max     int     `json:"max"`
}

// DeckSimulationMetrics holds aggregated statistics for one of the two competing decks.
type DeckSimulationMetrics struct {
	DeckName          string      `json:"deckName"`
	Wins              int         `json:"wins"`
	WinRate           float64     `json:"winRate"`
	WinsGoingFirst    int         `json:"winsGoingFirst"`
	WinsGoingSecond   int         `json:"winsGoingSecond"`
	DamageDealt       StatSummary `json:"damageDealt"`
	CardsPlayed       StatSummary `json:"cardsPlayed"`
	CardsInHandAtEnd  StatSummary `json:"cardsInHandAtEnd"`
	DevelopmentPoints StatSummary `json:"developmentPoints"`
	CitizensAtEnd     StatSummary `json:"citizensAtEnd"`
}

// CardSimulationMetrics holds aggregated performance metrics for an individual card across the simulation.
type CardSimulationMetrics struct {
	CardID            string      `json:"cardId"`
	CardName          string      `json:"cardName"`
	CardType          CardType    `json:"cardType"`
	TimesPlayed       int         `json:"timesPlayed"`
	AvgPlaysPerGame   float64     `json:"avgPlaysPerGame"`
	GamesPlayedIn     int         `json:"gamesPlayedIn"`
	WinsWhenPlayed    int         `json:"winsWhenPlayed"`
	WinRateWhenPlayed float64     `json:"winRateWhenPlayed"`
	DamagePerGame     StatSummary `json:"damagePerGame"`
	AvgDamagePerPlay  float64     `json:"avgDamagePerPlay"`
	TotalKills        int         `json:"totalKills"`
}

// SimulationReport is the complete result of running N parallel AI vs AI games.
type SimulationReport struct {
	TotalGames          int                     `json:"totalGames"`
	DurationMs          int64                   `json:"durationMs"`
	Difficulty          AIDifficulty            `json:"difficulty"`
	StartingMode        SimStartingMode         `json:"startingMode"`
	DeckA               DeckSimulationMetrics   `json:"deckA"`
	DeckB               DeckSimulationMetrics   `json:"deckB"`
	Draws               int                     `json:"draws"`
	FirstPlayerWins     int                     `json:"firstPlayerWins"`
	FirstPlayerWinRate  float64                 `json:"firstPlayerWinRate"`
	SecondPlayerWins    int                     `json:"secondPlayerWins"`
	SecondPlayerWinRate float64                 `json:"secondPlayerWinRate"`
	TurnsPerGame        StatSummary             `json:"turnsPerGame"`
	MostUsedCard        *CardSimulationMetrics  `json:"mostUsedCard,omitempty"`
	LeastUsedCard       *CardSimulationMetrics  `json:"leastUsedCard,omitempty"`
	TopDamageCard       *CardSimulationMetrics  `json:"topDamageCard,omitempty"`
	CardMetrics         []CardSimulationMetrics `json:"cardMetrics"`
}

type singleGameResult struct {
	winnerSlot       int // 0 = DeckA, 1 = DeckB, -1 = Draw
	firstPlayerSlot  int
	turns            int
	damageBySlot     [2]int
	playsBySlot      [2]int
	handAtEndBySlot  [2]int
	devPtsBySlot     [2]int
	citizensEndSlot  [2]int
	playsByCard      map[string]int
	damageByCard     map[string]int
	killsByCard      map[string]int
	playedBySlotCard [2]map[string]bool
	cardNames        map[string]string
	cardTypes        map[string]CardType
}

// RunAIVsAISimulation executes N AI vs AI matches in parallel and aggregates telemetry into a SimulationReport.
func RunAIVsAISimulation(req SimulationRequest) (*SimulationReport, error) {
	if len(req.DeckACards) == 0 || len(req.DeckBCards) == 0 {
		return nil, fmt.Errorf("ambos mazos deben tener al menos 1 carta")
	}
	if req.NumGames <= 0 {
		req.NumGames = 50
	}
	if req.NumGames > 500 {
		req.NumGames = 500
	}
	if req.Difficulty == AIDifficultyNone {
		req.Difficulty = AIDifficultyMedium
	}
	if req.DeckAName == "" {
		req.DeckAName = "Mazo A"
	}
	if req.DeckBName == "" {
		req.DeckBName = "Mazo B"
	}
	if req.StartingMode == "" {
		req.StartingMode = SimStartAlternate
	}

	startTime := time.Now()
	baseSeed := startTime.UnixNano()

	results := make([]singleGameResult, req.NumGames)
	workers := runtime.NumCPU()
	if workers < 2 {
		workers = 2
	}
	if workers > req.NumGames {
		workers = req.NumGames
	}

	jobs := make(chan int, req.NumGames)
	for i := 0; i < req.NumGames; i++ {
		jobs <- i
	}
	close(jobs)

	var wg sync.WaitGroup
	for w := 0; w < workers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for gameIdx := range jobs {
				seed := baseSeed + int64(gameIdx)*100003 + int64(workerID)*7919
				results[gameIdx] = runSingleSimulatedGame(gameIdx, seed, req)
			}
		}(w)
	}
	wg.Wait()

	durationMs := time.Since(startTime).Milliseconds()
	return aggregateSimulationResults(req, results, durationMs), nil
}

func runSingleSimulatedGame(gameIdx int, seed int64, req SimulationRequest) singleGameResult {
	rules := req.Rules.Normalize()
	rules.DeckConstraints.Enforced = false

	switch req.StartingMode {
	case SimStartDeckA:
		rules.StartingPlayer = StartingPlayerHost
	case SimStartDeckB:
		rules.StartingPlayer = StartingPlayerGuest
	case SimStartRandom:
		rules.StartingPlayer = StartingPlayerRandom
	default: // SimStartAlternate
		if gameIdx%2 == 0 {
			rules.StartingPlayer = StartingPlayerHost
		} else {
			rules.StartingPlayer = StartingPlayerGuest
		}
	}

	gs := NewGameStateWithSeed(fmt.Sprintf("sim_%d", gameIdx), "Simulación IA vs IA", rules, seed)
	gs.DisableAnimSteps = true
	gs.Telemetry = NewMatchTelemetry()

	_ = gs.AddPlayer("ai_a", req.DeckAName, req.DeckACards)
	_ = gs.AddPlayer("ai_b", req.DeckBName, req.DeckBCards)

	// Both players perform AI Mulligan
	gs.RunAITurnIfNeeded("ai_a", req.Difficulty)
	gs.RunAITurnIfNeeded("ai_b", req.Difficulty)

	// Main simulation loop until PhaseGameOver or safety step limit
	for step := 0; step < 300 && gs.Phase != PhaseGameOver; step++ {
		if gs.Phase == PhaseAwaitingInput && gs.PendingPrompt != nil {
			gs.RunAITurnIfNeeded(gs.PendingPrompt.PlayerID, req.Difficulty)
			continue
		}
		activePlayer := gs.Players[gs.ActivePlayerIdx]
		if activePlayer == nil {
			break
		}
		prevTurn := gs.TurnNumber
		prevPhase := gs.Phase
		gs.RunAITurnIfNeeded(activePlayer.ID, req.Difficulty)
		if gs.Phase != PhaseGameOver && gs.TurnNumber == prevTurn && gs.Phase == prevPhase {
			// Force EndTurn if stuck
			_ = gs.EndTurn(activePlayer.ID)
		}
	}

	winnerSlot := -1
	if gs.WinnerID == "ai_a" {
		winnerSlot = 0
	} else if gs.WinnerID == "ai_b" {
		winnerSlot = 1
	}

	res := singleGameResult{
		winnerSlot:      winnerSlot,
		firstPlayerSlot: gs.Telemetry.FirstPlayerIdx,
		turns:           gs.TurnNumber,
		damageBySlot:    gs.Telemetry.TotalDamageBySlot,
		playsBySlot:     gs.Telemetry.CardsPlayedBySlot,
		playsByCard:     gs.Telemetry.PlaysByCard,
		damageByCard:    gs.Telemetry.DamageByCard,
		killsByCard:     gs.Telemetry.KillsByCard,
		cardNames:       gs.Telemetry.CardNames,
		cardTypes:       gs.Telemetry.CardTypes,
		playedBySlotCard: [2]map[string]bool{
			make(map[string]bool),
			make(map[string]bool),
		},
	}

	for slot := 0; slot < 2; slot++ {
		if p := gs.Players[slot]; p != nil {
			res.handAtEndBySlot[slot] = len(p.Hand)
			res.devPtsBySlot[slot] = p.DevelopmentPoints
			res.citizensEndSlot[slot] = p.TotalCitizensOnBoard()
			// Identify cards played by this slot (cards in discard, exile, or board)
			for _, c := range p.Discard {
				res.playedBySlotCard[slot][c.Definition.ID] = true
			}
			for _, c := range p.Exile {
				res.playedBySlotCard[slot][c.Definition.ID] = true
			}
			for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
				for _, c := range p.Board[z] {
					if !c.Definition.IsToken {
						res.playedBySlotCard[slot][c.Definition.ID] = true
					}
				}
			}
		}
	}

	return res
}

func round2(v float64) float64 {
	return math.Round(v*100) / 100
}

func computeStatSummary(values []int) StatSummary {
	if len(values) == 0 {
		return StatSummary{}
	}
	total := 0
	minV := values[0]
	maxV := values[0]
	for _, v := range values {
		total += v
		if v < minV {
			minV = v
		}
		if v > maxV {
			maxV = v
		}
	}
	return StatSummary{
		Total:   total,
		Average: round2(float64(total) / float64(len(values))),
		Min:     minV,
		Max:     maxV,
	}
}

func aggregateSimulationResults(req SimulationRequest, results []singleGameResult, durationMs int64) *SimulationReport {
	n := len(results)
	report := &SimulationReport{
		TotalGames:   n,
		DurationMs:   durationMs,
		Difficulty:   req.Difficulty,
		StartingMode: req.StartingMode,
		DeckA: DeckSimulationMetrics{
			DeckName: req.DeckAName,
		},
		DeckB: DeckSimulationMetrics{
			DeckName: req.DeckBName,
		},
	}

	turnsSlice := make([]int, 0, n)
	var dmgSlices [2][]int
	var playSlices [2][]int
	var handSlices [2][]int
	var devSlices [2][]int
	var citSlices [2][]int

	// Seed card catalog from both decks so even cards played 0 times appear in LeastUsedCard!
	cardCatalog := make(map[string]CardDefinition)
	for _, c := range req.DeckACards {
		if c.ID != "" {
			cardCatalog[c.ID] = c
		}
	}
	for _, c := range req.DeckBCards {
		if c.ID != "" {
			cardCatalog[c.ID] = c
		}
	}

	for _, r := range results {
		turnsSlice = append(turnsSlice, r.turns)
		for s := 0; s < 2; s++ {
			dmgSlices[s] = append(dmgSlices[s], r.damageBySlot[s])
			playSlices[s] = append(playSlices[s], r.playsBySlot[s])
			handSlices[s] = append(handSlices[s], r.handAtEndBySlot[s])
			devSlices[s] = append(devSlices[s], r.devPtsBySlot[s])
			citSlices[s] = append(citSlices[s], r.citizensEndSlot[s])
		}

		if r.winnerSlot == 0 {
			report.DeckA.Wins++
			if r.firstPlayerSlot == 0 {
				report.DeckA.WinsGoingFirst++
				report.FirstPlayerWins++
			} else {
				report.DeckA.WinsGoingSecond++
				report.SecondPlayerWins++
			}
		} else if r.winnerSlot == 1 {
			report.DeckB.Wins++
			if r.firstPlayerSlot == 1 {
				report.DeckB.WinsGoingFirst++
				report.FirstPlayerWins++
			} else {
				report.DeckB.WinsGoingSecond++
				report.SecondPlayerWins++
			}
		} else {
			report.Draws++
		}

		for cid, cname := range r.cardNames {
			if _, exists := cardCatalog[cid]; !exists {
				cardCatalog[cid] = CardDefinition{
					ID:   cid,
					Name: cname,
					Type: r.cardTypes[cid],
				}
			}
		}
	}

	if n > 0 {
		report.DeckA.WinRate = round2(float64(report.DeckA.Wins) * 100 / float64(n))
		report.DeckB.WinRate = round2(float64(report.DeckB.Wins) * 100 / float64(n))
		report.FirstPlayerWinRate = round2(float64(report.FirstPlayerWins) * 100 / float64(n))
		report.SecondPlayerWinRate = round2(float64(report.SecondPlayerWins) * 100 / float64(n))
	}

	report.TurnsPerGame = computeStatSummary(turnsSlice)

	report.DeckA.DamageDealt = computeStatSummary(dmgSlices[0])
	report.DeckA.CardsPlayed = computeStatSummary(playSlices[0])
	report.DeckA.CardsInHandAtEnd = computeStatSummary(handSlices[0])
	report.DeckA.DevelopmentPoints = computeStatSummary(devSlices[0])
	report.DeckA.CitizensAtEnd = computeStatSummary(citSlices[0])

	report.DeckB.DamageDealt = computeStatSummary(dmgSlices[1])
	report.DeckB.CardsPlayed = computeStatSummary(playSlices[1])
	report.DeckB.CardsInHandAtEnd = computeStatSummary(handSlices[1])
	report.DeckB.DevelopmentPoints = computeStatSummary(devSlices[1])
	report.DeckB.CitizensAtEnd = computeStatSummary(citSlices[1])

	// Aggregate per-card statistics across all N games
	var cardMetrics []CardSimulationMetrics
	for cid, def := range cardCatalog {
		totalPlays := 0
		gamesPlayedIn := 0
		winsWhenPlayed := 0
		totalKills := 0
		dmgPerGame := make([]int, 0, n)

		for _, r := range results {
			plays := r.playsByCard[cid]
			dmg := r.damageByCard[cid]
			kills := r.killsByCard[cid]
			totalPlays += plays
			totalKills += kills
			dmgPerGame = append(dmgPerGame, dmg)

			if plays > 0 {
				gamesPlayedIn++
				if r.winnerSlot >= 0 && r.playedBySlotCard[r.winnerSlot][cid] {
					winsWhenPlayed++
				}
			}
		}

		dmgSummary := computeStatSummary(dmgPerGame)
		avgPlays := 0.0
		if n > 0 {
			avgPlays = round2(float64(totalPlays) / float64(n))
		}
		avgDmgPerPlay := 0.0
		if totalPlays > 0 {
			avgDmgPerPlay = round2(float64(dmgSummary.Total) / float64(totalPlays))
		}
		winRatePlayed := 0.0
		if gamesPlayedIn > 0 {
			winRatePlayed = round2(float64(winsWhenPlayed) * 100 / float64(gamesPlayedIn))
		}

		ctype := def.Type
		if ctype == "" {
			ctype = CardTypeCitizen
		}
		cardMetrics = append(cardMetrics, CardSimulationMetrics{
			CardID:            cid,
			CardName:          def.Name,
			CardType:          ctype,
			TimesPlayed:       totalPlays,
			AvgPlaysPerGame:   avgPlays,
			GamesPlayedIn:     gamesPlayedIn,
			WinsWhenPlayed:    winsWhenPlayed,
			WinRateWhenPlayed: winRatePlayed,
			DamagePerGame:     dmgSummary,
			AvgDamagePerPlay:  avgDmgPerPlay,
			TotalKills:        totalKills,
		})
	}

	sort.Slice(cardMetrics, func(i, j int) bool {
		if cardMetrics[i].TimesPlayed != cardMetrics[j].TimesPlayed {
			return cardMetrics[i].TimesPlayed > cardMetrics[j].TimesPlayed
		}
		return cardMetrics[i].DamagePerGame.Total > cardMetrics[j].DamagePerGame.Total
	})

	report.CardMetrics = cardMetrics

	// Identify MostUsedCard, LeastUsedCard (among non-token deck cards), and TopDamageCard
	deckCardSet := make(map[string]bool)
	for _, c := range req.DeckACards {
		deckCardSet[c.ID] = true
	}
	for _, c := range req.DeckBCards {
		deckCardSet[c.ID] = true
	}

	for i := range cardMetrics {
		cm := cardMetrics[i]
		if !deckCardSet[cm.CardID] {
			continue
		}
		if report.MostUsedCard == nil || cm.TimesPlayed > report.MostUsedCard.TimesPlayed {
			cp := cm
			report.MostUsedCard = &cp
		}
		if report.LeastUsedCard == nil || cm.TimesPlayed < report.LeastUsedCard.TimesPlayed {
			cp := cm
			report.LeastUsedCard = &cp
		}
	}

	for i := range cardMetrics {
		cm := cardMetrics[i]
		if report.TopDamageCard == nil || cm.DamagePerGame.Total > report.TopDamageCard.DamagePerGame.Total {
			cp := cm
			report.TopDamageCard = &cp
		}
	}

	return report
}
