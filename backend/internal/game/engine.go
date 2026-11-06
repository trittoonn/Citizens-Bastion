package game

import (
	"fmt"
	"math/rand"
	"time"
)

// NewGameState creates a new authoritative GameState waiting for players.
func NewGameState(id, gameName string, rules GameRulesConfig) *GameState {
	return &GameState{
		ID:           id,
		GameName:     gameName,
		Rules:        rules.Normalize(),
		Phase:        PhaseWaitingForPlayers,
		ResumePhase:  PhaseWaitingForPlayers,
		Log:          []LogEntry{},
		StateVersion: 1,
	}
}

func (g *GameState) bumpVersion() {
	g.StateVersion++
}

func (g *GameState) addLog(msg string) {
	g.Log = append(g.Log, LogEntry{
		Turn:    g.TurnNumber,
		Phase:   g.Phase,
		Message: msg,
	})
}

func sanitizePlayerState(p *PlayerState, includeHand bool) SanitizedPlayerView {
	if p == nil {
		return SanitizedPlayerView{
			Board: map[ZoneID][]CardInstance{
				ZoneCity:   {},
				ZoneRoad:   {},
				ZoneCombat: {},
			},
		}
	}
	view := SanitizedPlayerView{
		ID:                p.ID,
		Name:              p.Name,
		DevelopmentPoints: p.DevelopmentPoints,
		CitizenCount:      p.TotalCitizensOnBoard(),
		MulliganDone:      p.MulliganDone,
		DeckCount:         len(p.Deck),
		HandCount:         len(p.Hand),
		Discard:           make([]CardInstance, 0, len(p.Discard)),
		Exile:             make([]CardInstance, 0, len(p.Exile)),
		Board: map[ZoneID][]CardInstance{
			ZoneCity:   {},
			ZoneRoad:   {},
			ZoneCombat: {},
		},
	}
	if includeHand {
		view.Hand = make([]CardInstance, 0, len(p.Hand))
		for _, c := range p.Hand {
			view.Hand = append(view.Hand, c.Clone())
		}
	}
	for _, c := range p.Discard {
		view.Discard = append(view.Discard, c.Clone())
	}
	for _, c := range p.Exile {
		view.Exile = append(view.Exile, c.Clone())
	}
	for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
		for _, c := range p.Board[z] {
			view.Board[z] = append(view.Board[z], c.Clone())
		}
	}
	return view
}

func (g *GameState) recordAnimStep(ev ActionAnimationEvent) {
	g.nextAnimSeq++
	ev.Seq = g.nextAnimSeq

	activeID := ""
	if g.Players[g.ActivePlayerIdx] != nil {
		activeID = g.Players[g.ActivePlayerIdx].ID
	}

	rec := rawStepRecord{
		Event: ev,
		PlayersSnapshot: [2]SanitizedPlayerView{
			sanitizePlayerState(g.Players[0], true),
			sanitizePlayerState(g.Players[1], true),
		},
		TurnNumber:     g.TurnNumber,
		Phase:          g.Phase,
		ActivePlayerID: activeID,
	}

	g.animSteps = append(g.animSteps, rec)
	if len(g.animSteps) > 28 {
		g.animSteps = g.animSteps[len(g.animSteps)-28:]
	}
}

func (g *GameState) nextInstanceID(prefix string) string {
	g.nextInstanceSeq++
	return fmt.Sprintf("%s_%d", prefix, g.nextInstanceSeq)
}

// AddPlayer registers a player and their deck into the match.
// When the 2nd player joins, decks are shuffled, 4 cards are drawn, and PhaseMulligan starts.
func (g *GameState) AddPlayer(playerID, playerName string, deckDefs []CardDefinition) error {
	if g.Phase != PhaseWaitingForPlayers {
		return fmt.Errorf("la partida ya comenzó")
	}
	if err := ValidateDeck(deckDefs, g.Rules.DeckConstraints); err != nil {
		return err
	}

	slot := -1
	if g.Players[0] == nil {
		slot = 0
	} else if g.Players[1] == nil {
		if g.Players[0].ID == playerID {
			return fmt.Errorf("el jugador ya está en la sala")
		}
		slot = 1
	} else {
		return fmt.Errorf("la sala está llena")
	}

	ps := &PlayerState{
		ID:      playerID,
		Name:    playerName,
		Deck:    make([]*CardInstance, 0, len(deckDefs)),
		Hand:    []*CardInstance{},
		Discard: []*CardInstance{},
		Exile:   []*CardInstance{},
		Board: map[ZoneID][]*CardInstance{
			ZoneCity:   {},
			ZoneRoad:   {},
			ZoneCombat: {},
		},
	}

	for _, def := range deckDefs {
		inst := &CardInstance{
			InstanceID:      g.nextInstanceID("card"),
			OwnerID:         playerID,
			Definition:      def,
			BaseVitality:    def.Vitality,
			CurrentVitality: def.Vitality,
			Zone:            ZoneDeck,
		}
		ps.Deck = append(ps.Deck, inst)
	}

	g.Players[slot] = ps
	g.addLog(fmt.Sprintf("%s se unió a la partida (%d cartas en el mazo).", playerName, len(ps.Deck)))

	if g.Players[0] != nil && g.Players[1] != nil {
		g.startMatchMulligan()
	}

	g.bumpVersion()
	return nil
}

func (g *GameState) startMatchMulligan() {
	g.Phase = PhaseMulligan
	g.ResumePhase = PhaseMulligan
	for _, p := range g.Players {
		g.shuffleDeck(p)
		g.drawCards(p, g.Rules.InitialHandSize)
	}
	g.addLog(fmt.Sprintf("Comienza la fase de Mulligan. Cada jugador levantó %d cartas.", g.Rules.InitialHandSize))
}

func (g *GameState) shuffleDeck(p *PlayerState) {
	r := rand.New(rand.NewSource(time.Now().UnixNano() + int64(g.nextInstanceSeq)))
	r.Shuffle(len(p.Deck), func(i, j int) {
		p.Deck[i], p.Deck[j] = p.Deck[j], p.Deck[i]
	})
}

func (g *GameState) drawCards(p *PlayerState, count int) int {
	drawn := 0
	for i := 0; i < count; i++ {
		if len(p.Deck) == 0 {
			break
		}
		top := p.Deck[0]
		p.Deck = p.Deck[1:]
		top.Zone = ZoneHand
		top.PlayedThisTurn = false
		top.AttackedThisTurn = false
		p.Hand = append(p.Hand, top)
		drawn++
	}
	return drawn
}

// GetPlayer returns the PlayerState and index (0 or 1) for playerID.
func (g *GameState) GetPlayer(playerID string) (*PlayerState, int, error) {
	for idx, p := range g.Players {
		if p != nil && p.ID == playerID {
			return p, idx, nil
		}
	}
	return nil, -1, fmt.Errorf("jugador no encontrado")
}

// ApplyMulligan puts the selected hand cards on the bottom of the player's deck,
// draws the same number of cards, and shuffles the deck.
func (g *GameState) ApplyMulligan(playerID string, cardInstanceIDs []string) error {
	if g.Phase != PhaseMulligan {
		return fmt.Errorf("no estamos en fase de Mulligan")
	}
	p, _, err := g.GetPlayer(playerID)
	if err != nil {
		return err
	}
	if p.MulliganDone {
		return fmt.Errorf("ya realizaste tu Mulligan")
	}

	toBottomSet := make(map[string]bool, len(cardInstanceIDs))
	for _, id := range cardInstanceIDs {
		toBottomSet[id] = true
	}

	var keptHand []*CardInstance
	var bottomCards []*CardInstance
	for _, c := range p.Hand {
		if toBottomSet[c.InstanceID] {
			c.Zone = ZoneDeck
			bottomCards = append(bottomCards, c)
			delete(toBottomSet, c.InstanceID)
		} else {
			keptHand = append(keptHand, c)
		}
	}
	if len(toBottomSet) > 0 {
		return fmt.Errorf("alguna de las cartas seleccionadas para Mulligan no está en tu mano")
	}

	p.Hand = keptHand
	// Place selected cards at the bottom of the deck
	p.Deck = append(p.Deck, bottomCards...)
	// Draw the same number of cards
	if len(bottomCards) > 0 {
		g.drawCards(p, len(bottomCards))
		g.shuffleDeck(p)
		g.addLog(fmt.Sprintf("%s cambió %d carta(s) en el Mulligan y mezcló su mazo.", p.Name, len(bottomCards)))
	} else {
		g.addLog(fmt.Sprintf("%s conservó su mano inicial.", p.Name))
	}

	p.MulliganDone = true

	if g.Players[0].MulliganDone && g.Players[1].MulliganDone {
		g.beginTurn(0)
	}

	g.bumpVersion()
	return nil
}

// beginTurn starts the turn for playerIdx (0 or 1).
func (g *GameState) beginTurn(playerIdx int) {
	g.TurnNumber++
	g.ActivePlayerIdx = playerIdx
	active := g.Players[playerIdx]

	// Reset per-turn card flags across board
	for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
		for _, c := range active.Board[z] {
			c.PlayedThisTurn = false
			c.AttackedThisTurn = false
		}
	}

	if g.TurnNumber == 1 {
		g.PlaysRemaining = g.Rules.FirstTurnMaxPlays
	} else {
		g.PlaysRemaining = g.Rules.MaxPlaysPerTurn
	}
	g.MovesRemaining = g.Rules.MaxMovesPerTurn

	g.Phase = PhaseStartOfTurn
	g.ResumePhase = PhaseMain

	drawCount := g.Rules.DrawPerTurn
	if g.TurnNumber == 1 {
		drawCount = g.Rules.FirstTurnDraw
	}
	actualDrawn := g.drawCards(active, drawCount)
	g.addLog(fmt.Sprintf("Turno %d (%s): Levanta %d carta(s).", g.TurnNumber, active.Name, actualDrawn))

	// Queue "Al comienzo del turno" abilities in rule order:
	// From Combat Zone to City, and right-to-left within each row.
	g.queueBoardTriggers(active, TriggerTurnStart)
	g.processEffectQueue(PhaseMain)

	if g.TurnNumber > 1 {
		g.recordAnimStep(ActionAnimationEvent{
			Type:       AnimTurnStart,
			ActorID:    active.ID,
			ActorName:  active.Name,
			BannerText: fmt.Sprintf("🔔 Turno %d — %s", g.TurnNumber, active.Name),
		})
	}
}

// queueBoardTriggers collects triggers from a player's board ordered Combat -> Road -> City, right-to-left.
func (g *GameState) queueBoardTriggers(controller *PlayerState, trigger TriggerType) {
	orderedZones := []ZoneID{ZoneCombat, ZoneRoad, ZoneCity}
	for _, z := range orderedZones {
		row := controller.Board[z]
		for i := len(row) - 1; i >= 0; i-- {
			card := row[i]
			for _, ab := range card.Definition.Abilities {
				if ab.Trigger == trigger {
					for _, step := range ab.Steps {
						g.EffectQueue = append(g.EffectQueue, QueuedEffect{
							ControllerID:   controller.ID,
							SourceCardID:   card.InstanceID,
							SourceCardName: card.Definition.Name,
							SourceZone:     z,
							Step:           step,
						})
					}
				}
			}
		}
	}
}

// CanPlayInCombat returns true if the active player is allowed to play a Citizen directly into ZoneCombat.
// Rule 15: "Sólo pueden jugar una carta en la Zona de Combate si su oponente tiene una carta ahí."
func (g *GameState) CanPlayInCombat(playerID string) bool {
	_, idx, err := g.GetPlayer(playerID)
	if err != nil {
		return false
	}
	opp := g.Players[1-idx]
	if opp == nil {
		return false
	}
	return len(opp.Board[ZoneCombat]) > 0
}

// PlayCard plays a card from the active player's hand (or another zone if specified).
func (g *GameState) PlayCard(playerID, cardInstanceID string, targetZone ZoneID) error {
	if g.Phase != PhaseMain {
		return fmt.Errorf("solo podés jugar cartas en la Fase Principal")
	}
	p, idx, err := g.GetPlayer(playerID)
	if err != nil {
		return err
	}
	if idx != g.ActivePlayerIdx {
		return fmt.Errorf("no es tu turno")
	}
	if g.PlaysRemaining <= 0 {
		return fmt.Errorf("no te quedan jugadas disponibles en este turno")
	}

	handIdx := -1
	var card *CardInstance
	for i, c := range p.Hand {
		if c.InstanceID == cardInstanceID {
			handIdx = i
			card = c
			break
		}
	}
	if card == nil {
		return fmt.Errorf("la carta no está en tu mano")
	}

	if card.Definition.Type == CardTypeCitizen {
		if !IsBoardZone(targetZone) {
			return fmt.Errorf("debés elegir una zona válida del tablero (Ciudad, Camino o Zona de Combate)")
		}
		if targetZone == ZoneCombat && !g.CanPlayInCombat(playerID) {
			return fmt.Errorf("solo podés jugar un Ciudadano en la Zona de Combate si el oponente tiene al menos un Ciudadano ahí")
		}

		// Remove from hand and place on board
		p.Hand = append(p.Hand[:handIdx], p.Hand[handIdx+1:]...)
		card.Zone = targetZone
		card.BaseVitality = card.Definition.Vitality
		card.CurrentVitality = card.Definition.Vitality
		card.PlayedThisTurn = true
		card.AttackedThisTurn = false
		p.Board[targetZone] = append(p.Board[targetZone], card)
		g.PlaysRemaining--

		g.addLog(fmt.Sprintf("%s jugó a %s (%dV) en %s.", p.Name, card.Definition.Name, card.CurrentVitality, zoneDisplayName(targetZone)))

		defCopy := card.Definition
		g.recordAnimStep(ActionAnimationEvent{
			Type:           AnimPlayCitizen,
			ActorID:        p.ID,
			ActorName:      p.Name,
			CardInstanceID: card.InstanceID,
			CardName:       card.Definition.Name,
			CardDefinition: &defCopy,
			FromZone:       ZoneHand,
			ToZone:         targetZone,
			BannerText:     fmt.Sprintf("%s despliega a %s (%dV) en %s", p.Name, card.Definition.Name, card.CurrentVitality, zoneDisplayName(targetZone)),
		})

		// Queue "Al jugar" abilities (not triggered when summoned by an effect)
		for _, ab := range card.Definition.Abilities {
			if ab.Trigger == TriggerOnPlay {
				for _, step := range ab.Steps {
					g.EffectQueue = append(g.EffectQueue, QueuedEffect{
						ControllerID:   p.ID,
						SourceCardID:   card.InstanceID,
						SourceCardName: card.Definition.Name,
						SourceZone:     targetZone,
						Step:           step,
					})
				}
			}
		}

		g.processEffectQueue(PhaseMain)
		g.bumpVersion()
		return nil
	}

	// Event card: verify that any mandatory target steps have at least 1 valid target before consuming the card
	for _, ab := range card.Definition.Abilities {
		if ab.Trigger == TriggerImmediate || ab.Trigger == TriggerOnPlay {
			for _, step := range ab.Steps {
				if step.Target.Requirement == TargetReqSingleCard {
					candidates := g.findCandidateTargets(p.ID, card.InstanceID, step.Target)
					if len(candidates) == 0 {
						return fmt.Errorf("no hay objetivos válidos para jugar %s", card.Definition.Name)
					}
				}
			}
		}
	}

	// Remove Event from hand and move to Discard
	p.Hand = append(p.Hand[:handIdx], p.Hand[handIdx+1:]...)
	card.Zone = ZoneDiscard
	p.Discard = append(p.Discard, card)
	g.PlaysRemaining--

	g.addLog(fmt.Sprintf("%s jugó el evento %s.", p.Name, card.Definition.Name))

	defCopy := card.Definition
	g.recordAnimStep(ActionAnimationEvent{
		Type:           AnimPlayEvent,
		ActorID:        p.ID,
		ActorName:      p.Name,
		CardInstanceID: card.InstanceID,
		CardName:       card.Definition.Name,
		CardDefinition: &defCopy,
		FromZone:       ZoneHand,
		ToZone:         ZoneDiscard,
		BannerText:     fmt.Sprintf("📜 %s ejecuta el decreto: %s", p.Name, card.Definition.Name),
	})

	for _, ab := range card.Definition.Abilities {
		if ab.Trigger == TriggerImmediate || ab.Trigger == TriggerOnPlay {
			for _, step := range ab.Steps {
				g.EffectQueue = append(g.EffectQueue, QueuedEffect{
					ControllerID:   p.ID,
					SourceCardID:   card.InstanceID,
					SourceCardName: card.Definition.Name,
					SourceZone:     ZoneDiscard,
					Step:           step,
				})
			}
		}
	}

	g.processEffectQueue(PhaseMain)
	g.bumpVersion()
	return nil
}

// MoveCitizen moves a Citizen that was not played this turn to an immediately adjacent zone.
func (g *GameState) MoveCitizen(playerID, cardInstanceID string, toZone ZoneID) error {
	if g.Phase != PhaseMain {
		return fmt.Errorf("solo podés mover Ciudadanos en la Fase Principal")
	}
	p, idx, err := g.GetPlayer(playerID)
	if err != nil {
		return err
	}
	if idx != g.ActivePlayerIdx {
		return fmt.Errorf("no es tu turno")
	}
	if g.MovesRemaining <= 0 {
		return fmt.Errorf("ya utilizaste tu movimiento de este turno")
	}
	if !IsBoardZone(toZone) {
		return fmt.Errorf("zona de destino inválida")
	}

	card, fromZone, pos := g.findBoardCard(p, cardInstanceID)
	if card == nil {
		return fmt.Errorf("el Ciudadano no se encuentra en tu tablero")
	}
	if card.PlayedThisTurn {
		return fmt.Errorf("no podés mover a %s porque fue jugado en este turno", card.Definition.Name)
	}
	if !AreZonesAdjacent(fromZone, toZone) {
		return fmt.Errorf("solo podés mover un Ciudadano a una zona inmediatamente adyacente (%s -> %s no es adyacente)", zoneDisplayName(fromZone), zoneDisplayName(toZone))
	}

	// Remove from old zone and append to new zone
	row := p.Board[fromZone]
	p.Board[fromZone] = append(row[:pos], row[pos+1:]...)
	card.Zone = toZone
	p.Board[toZone] = append(p.Board[toZone], card)
	g.MovesRemaining--

	g.addLog(fmt.Sprintf("%s movió a %s de %s a %s.", p.Name, card.Definition.Name, zoneDisplayName(fromZone), zoneDisplayName(toZone)))
	g.recordAnimStep(ActionAnimationEvent{
		Type:           AnimMoveCitizen,
		ActorID:        p.ID,
		ActorName:      p.Name,
		CardInstanceID: card.InstanceID,
		CardName:       card.Definition.Name,
		FromZone:       fromZone,
		ToZone:         toZone,
		BannerText:     fmt.Sprintf("👣 %s marcha con %s: %s → %s", p.Name, card.Definition.Name, zoneDisplayName(fromZone), zoneDisplayName(toZone)),
	})
	g.bumpVersion()
	return nil
}

// ValidCombatTargetIDs returns the InstanceIDs of enemy Citizens that can currently be attacked.
// Rule 19: "Una carta en la Zona de combate puede atacar a cualquier carta que no tenga otra carta en una zona de por medio."
func (g *GameState) ValidCombatTargetIDs(attackerOwnerID string) []string {
	_, idx, err := g.GetPlayer(attackerOwnerID)
	if err != nil {
		return nil
	}
	opp := g.Players[1-idx]
	if opp == nil {
		return nil
	}

	for _, z := range []ZoneID{ZoneCombat, ZoneRoad, ZoneCity} {
		if len(opp.Board[z]) > 0 {
			ids := make([]string, 0, len(opp.Board[z]))
			for _, c := range opp.Board[z] {
				ids = append(ids, c.InstanceID)
			}
			return ids
		}
	}
	return nil
}

// AttackCitizen executes a combat attack from a Citizen in the active player's Combat Zone.
func (g *GameState) AttackCitizen(playerID, attackerID, defenderID string) error {
	if g.Phase != PhaseMain {
		return fmt.Errorf("solo podés atacar en la Fase Principal")
	}
	p, idx, err := g.GetPlayer(playerID)
	if err != nil {
		return err
	}
	if idx != g.ActivePlayerIdx {
		return fmt.Errorf("no es tu turno")
	}

	attacker, fromZone, _ := g.findBoardCard(p, attackerID)
	if attacker == nil || fromZone != ZoneCombat {
		return fmt.Errorf("el atacante debe estar en tu Zona de Combate")
	}
	if attacker.AttackedThisTurn {
		return fmt.Errorf("%s ya atacó en este turno", attacker.Definition.Name)
	}

	validTargets := g.ValidCombatTargetIDs(playerID)
	isValidTarget := false
	for _, id := range validTargets {
		if id == defenderID {
			isValidTarget = true
			break
		}
	}
	if !isValidTarget {
		return fmt.Errorf("objetivo inválido: no podés atacar a una fila trasera mientras haya Ciudadanos en una fila intermedia")
	}

	opp := g.Players[1-idx]
	defender, defZone, _ := g.findBoardCard(opp, defenderID)
	if defender == nil {
		return fmt.Errorf("el objetivo no se encuentra en el tablero enemigo")
	}

	dmg := attacker.AttackPower(g.Rules.VitalityMode)
	attacker.AttackedThisTurn = true
	defender.CurrentVitality -= dmg

	g.addLog(fmt.Sprintf("%s: %s (%dV) atacó a %s en %s causando %d de daño.",
		p.Name, attacker.Definition.Name, attacker.CurrentVitality, defender.Definition.Name, zoneDisplayName(defZone), dmg))

	var targetSnap *CardInstance
	destroyed := defender.CurrentVitality <= 0
	if destroyed {
		cp := defender.Clone()
		cp.CurrentVitality = 0
		targetSnap = &cp
		g.destroyBoardCard(opp, defender.InstanceID)
		g.addLog(fmt.Sprintf("%s fue destruido.", defender.Definition.Name))
	}

	banner := fmt.Sprintf("⚔️ %s: %s ataca a %s (-%dV)", p.Name, attacker.Definition.Name, defender.Definition.Name, dmg)
	if destroyed {
		banner = fmt.Sprintf("⚔️ %s: %s ataca y destruye a %s (-%dV)", p.Name, attacker.Definition.Name, defender.Definition.Name, dmg)
	}
	g.recordAnimStep(ActionAnimationEvent{
		Type:               AnimAttack,
		ActorID:            p.ID,
		ActorName:          p.Name,
		CardInstanceID:     attacker.InstanceID,
		CardName:           attacker.Definition.Name,
		FromZone:           ZoneCombat,
		ToZone:             defZone,
		TargetCardID:       defender.InstanceID,
		TargetCardName:     defender.Definition.Name,
		TargetCardSnapshot: targetSnap,
		Amount:             -dmg,
		Destroyed:          destroyed,
		BannerText:         banner,
	})

	g.bumpVersion()
	return nil
}

// SubmitPromptTarget resolves a PendingPrompt during PhaseAwaitingInput.
func (g *GameState) SubmitPromptTarget(playerID, targetCardID string) error {
	if g.Phase != PhaseAwaitingInput || g.PendingPrompt == nil {
		return fmt.Errorf("no hay ninguna selección pendiente")
	}
	if g.PendingPrompt.PlayerID != playerID {
		return fmt.Errorf("esperando la selección del otro jugador")
	}

	valid := false
	for _, id := range g.PendingPrompt.ValidTargetIDs {
		if id == targetCardID {
			valid = true
			break
		}
	}
	if !valid {
		return fmt.Errorf("el objetivo seleccionado no es válido")
	}

	prompt := g.PendingPrompt
	g.PendingPrompt = nil
	g.executeEffectStepWithTarget(prompt.QueuedStep, targetCardID)
	g.processEffectQueue(g.ResumePhase)
	g.bumpVersion()
	return nil
}

// EndTurn transitions from PhaseMain to PhaseEndOfTurn, triggers end-of-turn abilities,
// awards Development Points, checks for victory, and advances to the opponent's turn.
func (g *GameState) EndTurn(playerID string) error {
	if g.Phase != PhaseMain {
		return fmt.Errorf("solo podés finalizar el turno durante la Fase Principal")
	}
	p, idx, err := g.GetPlayer(playerID)
	if err != nil {
		return err
	}
	if idx != g.ActivePlayerIdx {
		return fmt.Errorf("no es tu turno")
	}

	g.Phase = PhaseEndOfTurn
	g.ResumePhase = PhaseEndOfTurn
	g.addLog(fmt.Sprintf("%s finaliza su turno. Resolviendo efectos de final de turno...", p.Name))

	g.queueBoardTriggers(p, TriggerTurnEnd)
	g.processEffectQueue(PhaseEndOfTurn)
	g.bumpVersion()
	return nil
}

// processEffectQueue runs queued effects until either the queue is empty or a step requires player input.
func (g *GameState) processEffectQueue(resumePhase GamePhase) {
	g.ResumePhase = resumePhase

	for len(g.EffectQueue) > 0 {
		next := g.EffectQueue[0]
		g.EffectQueue = g.EffectQueue[1:]

		if next.Step.Target.Requirement == TargetReqSingleCard {
			candidates := g.findCandidateTargets(next.ControllerID, next.SourceCardID, next.Step.Target)
			if len(candidates) == 0 {
				g.addLog(fmt.Sprintf("%s: sin objetivos válidos para el efecto.", next.SourceCardName))
				continue
			}

			validIDs := make([]string, 0, len(candidates))
			clonedCandidates := make([]CardInstance, 0, len(candidates))
			for _, c := range candidates {
				validIDs = append(validIDs, c.InstanceID)
				clonedCandidates = append(clonedCandidates, c.Clone())
			}

			promptText := next.Step.Target.Prompt
			if promptText == "" {
				promptText = fmt.Sprintf("%s: Seleccioná un objetivo.", next.SourceCardName)
			}

			g.Phase = PhaseAwaitingInput
			g.PendingPrompt = &PendingPrompt{
				PlayerID:       next.ControllerID,
				SourceCardID:   next.SourceCardID,
				SourceCardName: next.SourceCardName,
				PromptText:     promptText,
				OriginPhase:    resumePhase,
				TargetZones:    next.Step.Target.Zones,
				TargetOwner:    next.Step.Target.Owner,
				ValidTargetIDs: validIDs,
				CandidateCards: clonedCandidates,
				QueuedStep:     next,
			}
			return
		}

		g.executeEffectStepWithTarget(next, "")
	}

	// Queue is empty; transition to resumePhase
	g.Phase = resumePhase
	if resumePhase == PhaseEndOfTurn {
		g.completeEndOfTurn()
	}
}

func (g *GameState) completeEndOfTurn() {
	active := g.Players[g.ActivePlayerIdx]
	opp := g.Players[1-g.ActivePlayerIdx]

	myCitizens := active.TotalCitizensOnBoard()
	oppCitizens := opp.TotalCitizensOnBoard()

	if myCitizens > oppCitizens {
		active.DevelopmentPoints++
		g.addLog(fmt.Sprintf("%s tiene más Ciudadanos (%d vs %d) y gana 1 Punto de Desarrollo (Total: %d/%d).",
			active.Name, myCitizens, oppCitizens, active.DevelopmentPoints, g.Rules.PointsToWin))
	} else {
		g.addLog(fmt.Sprintf("Recuento de Ciudadanos al final del turno: %s (%d) vs %s (%d). No se otorgan puntos.",
			active.Name, myCitizens, opp.Name, oppCitizens))
	}

	if active.DevelopmentPoints >= g.Rules.PointsToWin {
		g.Phase = PhaseGameOver
		g.ResumePhase = PhaseGameOver
		g.WinnerID = active.ID
		g.WinReason = fmt.Sprintf("¡%s alcanzó %d Puntos de Desarrollo y ganó la partida!", active.Name, active.DevelopmentPoints)
		g.addLog(g.WinReason)
		return
	}

	// Start next player's turn
	g.beginTurn(1 - g.ActivePlayerIdx)
}

func (g *GameState) executeEffectStepWithTarget(qe QueuedEffect, chosenTargetID string) {
	controller, ctrlIdx, err := g.GetPlayer(qe.ControllerID)
	if err != nil {
		return
	}
	opp := g.Players[1-ctrlIdx]
	step := qe.Step

	switch step.Op {
	case EffectSummonToken:
		tokenDef := DefaultRecruitToken()
		if step.TokenDef != nil {
			tokenDef = *step.TokenDef
		}
		if tokenDef.Count <= 0 {
			tokenDef.Count = 1
		}
		if tokenDef.Vitality <= 0 {
			tokenDef.Vitality = 1
		}
		if tokenDef.Name == "" {
			tokenDef.Name = "Recluta"
		}

		destZone := step.DestZone
		if destZone == ZoneSameRow || destZone == "" {
			// Check if source card is still on board; otherwise use its recorded SourceZone
			if srcCard, currentZone, _ := g.findBoardCard(controller, qe.SourceCardID); srcCard != nil {
				destZone = currentZone
			} else if IsBoardZone(qe.SourceZone) {
				destZone = qe.SourceZone
			} else {
				destZone = ZoneCity
			}
		}

		var lastTokenID string
		for i := 0; i < tokenDef.Count; i++ {
			inst := &CardInstance{
				InstanceID: g.nextInstanceID("token"),
				OwnerID:    controller.ID,
				Definition: CardDefinition{
					ID:          tokenDef.ID,
					Name:        tokenDef.Name,
					Type:        CardTypeCitizen,
					Vitality:    tokenDef.Vitality,
					Description: "Token Ciudadano invocado.",
					IsToken:     true,
					ArtColor:    "#64748b",
					ArtIcon:     tokenDef.ArtIcon,
				},
				BaseVitality:     tokenDef.Vitality,
				CurrentVitality:  tokenDef.Vitality,
				Zone:             destZone,
				PlayedThisTurn:   true,
				AttackedThisTurn: false,
			}
			lastTokenID = inst.InstanceID
			controller.Board[destZone] = append(controller.Board[destZone], inst)
		}
		g.addLog(fmt.Sprintf("%s invocó %d %s (%dV) en %s.", controller.Name, tokenDef.Count, tokenDef.Name, tokenDef.Vitality, zoneDisplayName(destZone)))
		g.recordAnimStep(ActionAnimationEvent{
			Type:           AnimEffect,
			ActorID:        controller.ID,
			ActorName:      controller.Name,
			CardInstanceID: lastTokenID,
			CardName:       tokenDef.Name,
			ToZone:         destZone,
			BannerText:     fmt.Sprintf("✨ %s invoca %d %s (%dV) en %s", qe.SourceCardName, tokenDef.Count, tokenDef.Name, tokenDef.Vitality, zoneDisplayName(destZone)),
		})

	case EffectDrawCards:
		amount := step.Amount
		if amount <= 0 {
			amount = 1
		}
		drawn := g.drawCards(controller, amount)
		g.addLog(fmt.Sprintf("%s (%s): levantó %d carta(s).", qe.SourceCardName, controller.Name, drawn))

	case EffectDealDamage:
		dmg := step.Amount
		if dmg <= 0 {
			dmg = 1
		}
		targets := g.resolveTargetsForExecution(qe, chosenTargetID)
		for _, t := range targets {
			ownerPlayer, _, _ := g.GetPlayer(t.OwnerID)
			if ownerPlayer == nil {
				continue
			}
			t.CurrentVitality -= dmg
			g.addLog(fmt.Sprintf("%s (%s) hizo %d de daño a %s.", qe.SourceCardName, controller.Name, dmg, t.Definition.Name))
			var targetSnap *CardInstance
			destroyed := t.CurrentVitality <= 0
			if destroyed {
				cp := t.Clone()
				cp.CurrentVitality = 0
				targetSnap = &cp
				g.destroyBoardCard(ownerPlayer, t.InstanceID)
				g.addLog(fmt.Sprintf("%s fue destruido.", t.Definition.Name))
			}
			g.recordAnimStep(ActionAnimationEvent{
				Type:               AnimEffect,
				ActorID:            controller.ID,
				ActorName:          controller.Name,
				CardInstanceID:     qe.SourceCardID,
				CardName:           qe.SourceCardName,
				TargetCardID:       t.InstanceID,
				TargetCardName:     t.Definition.Name,
				TargetCardSnapshot: targetSnap,
				Amount:             -dmg,
				Destroyed:          destroyed,
				BannerText:         fmt.Sprintf("🔥 %s (%s) inflige -%dV a %s", qe.SourceCardName, controller.Name, dmg, t.Definition.Name),
			})
		}

	case EffectDestroy:
		targets := g.resolveTargetsForExecution(qe, chosenTargetID)
		for _, t := range targets {
			ownerPlayer, _, _ := g.GetPlayer(t.OwnerID)
			if ownerPlayer == nil {
				continue
			}
			cp := t.Clone()
			cp.CurrentVitality = 0
			g.destroyBoardCard(ownerPlayer, t.InstanceID)
			g.addLog(fmt.Sprintf("%s (%s) destruyó a %s.", qe.SourceCardName, controller.Name, t.Definition.Name))
			g.recordAnimStep(ActionAnimationEvent{
				Type:               AnimEffect,
				ActorID:            controller.ID,
				ActorName:          controller.Name,
				CardInstanceID:     qe.SourceCardID,
				CardName:           qe.SourceCardName,
				TargetCardID:       t.InstanceID,
				TargetCardName:     t.Definition.Name,
				TargetCardSnapshot: &cp,
				Destroyed:          true,
				BannerText:         fmt.Sprintf("💀 %s (%s) destruye a %s", qe.SourceCardName, controller.Name, t.Definition.Name),
			})
		}

	case EffectMoveZone:
		targets := g.resolveTargetsForExecution(qe, chosenTargetID)
		dest := step.DestZone
		if dest == "" {
			dest = ZoneHand
		}
		for _, t := range targets {
			ownerPlayer, _, _ := g.GetPlayer(t.OwnerID)
			if ownerPlayer == nil {
				continue
			}
			g.moveCardToZone(ownerPlayer, t.InstanceID, dest)
			g.addLog(fmt.Sprintf("%s (%s) movió a %s hacia %s.", qe.SourceCardName, controller.Name, t.Definition.Name, zoneDisplayName(dest)))
			if step.ShuffleDeck {
				g.shuffleDeck(ownerPlayer)
				g.addLog(fmt.Sprintf("%s mezcló su mazo.", ownerPlayer.Name))
			}
			g.recordAnimStep(ActionAnimationEvent{
				Type:           AnimEffect,
				ActorID:        controller.ID,
				ActorName:      controller.Name,
				CardInstanceID: t.InstanceID,
				CardName:       t.Definition.Name,
				ToZone:         dest,
				BannerText:     fmt.Sprintf("✨ %s (%s) mueve a %s hacia %s", qe.SourceCardName, controller.Name, t.Definition.Name, zoneDisplayName(dest)),
			})
		}

	case EffectModifyStat:
		delta := step.Amount
		targets := g.resolveTargetsForExecution(qe, chosenTargetID)
		for _, t := range targets {
			ownerPlayer, _, _ := g.GetPlayer(t.OwnerID)
			if ownerPlayer == nil {
				continue
			}
			t.CurrentVitality += delta
			if delta > 0 && t.CurrentVitality > t.BaseVitality {
				t.BaseVitality = t.CurrentVitality
			}
			g.addLog(fmt.Sprintf("%s (%s) modificó la Vitalidad de %s en %+d (ahora %dV).", qe.SourceCardName, controller.Name, t.Definition.Name, delta, t.CurrentVitality))
			var targetSnap *CardInstance
			destroyed := t.CurrentVitality <= 0
			if destroyed {
				cp := t.Clone()
				cp.CurrentVitality = 0
				targetSnap = &cp
				g.destroyBoardCard(ownerPlayer, t.InstanceID)
				g.addLog(fmt.Sprintf("%s fue destruido.", t.Definition.Name))
			}
			g.recordAnimStep(ActionAnimationEvent{
				Type:               AnimEffect,
				ActorID:            controller.ID,
				ActorName:          controller.Name,
				CardInstanceID:     qe.SourceCardID,
				CardName:           qe.SourceCardName,
				TargetCardID:       t.InstanceID,
				TargetCardName:     t.Definition.Name,
				TargetCardSnapshot: targetSnap,
				Amount:             delta,
				Destroyed:          destroyed,
				BannerText:         fmt.Sprintf("✨ %s (%s) modifica la Vitalidad de %s (%+dV)", qe.SourceCardName, controller.Name, t.Definition.Name, delta),
			})
		}
	}
	_ = opp
}

func (g *GameState) resolveTargetsForExecution(qe QueuedEffect, chosenTargetID string) []*CardInstance {
	switch qe.Step.Target.Requirement {
	case TargetReqSingleCard:
		if chosenTargetID == "" {
			return nil
		}
		c := g.findCardAnywhere(chosenTargetID)
		if c != nil {
			return []*CardInstance{c}
		}
		return nil
	case TargetReqSelfCard:
		c := g.findCardAnywhere(qe.SourceCardID)
		if c != nil {
			return []*CardInstance{c}
		}
		return nil
	case TargetReqAllMatching:
		return g.findCandidateTargets(qe.ControllerID, qe.SourceCardID, qe.Step.Target)
	default:
		return nil
	}
}

func (g *GameState) findCandidateTargets(controllerID, sourceCardID string, rule TargetRule) []*CardInstance {
	self, idx, err := g.GetPlayer(controllerID)
	if err != nil {
		return nil
	}
	opp := g.Players[1-idx]

	var playersToScan []*PlayerState
	switch rule.Owner {
	case TargetOwnerSelf:
		playersToScan = []*PlayerState{self}
	case TargetOwnerEnemy:
		if opp != nil {
			playersToScan = []*PlayerState{opp}
		}
	default: // TargetOwnerAny
		playersToScan = []*PlayerState{self}
		if opp != nil {
			playersToScan = append(playersToScan, opp)
		}
	}

	zones := rule.Zones
	if len(zones) == 0 {
		zones = []ZoneID{ZoneCity, ZoneRoad, ZoneCombat}
	}

	var result []*CardInstance
	for _, p := range playersToScan {
		if p == nil {
			continue
		}
		for _, z := range zones {
			var pile []*CardInstance
			switch z {
			case ZoneCity, ZoneRoad, ZoneCombat:
				pile = p.Board[z]
			case ZoneDiscard:
				pile = p.Discard
			case ZoneDeck:
				pile = p.Deck
			case ZoneHand:
				pile = p.Hand
			case ZoneExile:
				pile = p.Exile
			}
			for _, c := range pile {
				if rule.CardType != "" && c.Definition.Type != rule.CardType {
					continue
				}
				result = append(result, c)
			}
		}
	}
	_ = sourceCardID
	return result
}

func (g *GameState) findBoardCard(p *PlayerState, instanceID string) (*CardInstance, ZoneID, int) {
	for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
		for idx, c := range p.Board[z] {
			if c.InstanceID == instanceID {
				return c, z, idx
			}
		}
	}
	return nil, "", -1
}

func (g *GameState) findCardAnywhere(instanceID string) *CardInstance {
	for _, p := range g.Players {
		if p == nil {
			continue
		}
		if c, _, _ := g.findBoardCard(p, instanceID); c != nil {
			return c
		}
		for _, pile := range [][]*CardInstance{p.Hand, p.Deck, p.Discard, p.Exile} {
			for _, c := range pile {
				if c.InstanceID == instanceID {
					return c
				}
			}
		}
	}
	return nil
}

func (g *GameState) destroyBoardCard(p *PlayerState, instanceID string) {
	card, zone, pos := g.findBoardCard(p, instanceID)
	if card == nil {
		return
	}
	row := p.Board[zone]
	p.Board[zone] = append(row[:pos], row[pos+1:]...)

	// Reset card vitality when leaving the board; tokens do not go to discard pile or can go to discard
	card.CurrentVitality = card.BaseVitality
	card.PlayedThisTurn = false
	card.AttackedThisTurn = false
	if !card.Definition.IsToken {
		card.Zone = ZoneDiscard
		p.Discard = append(p.Discard, card)
	}
}

func (g *GameState) moveCardToZone(p *PlayerState, instanceID string, dest ZoneID) {
	var card *CardInstance

	// Remove from current location
	if bCard, bZone, bPos := g.findBoardCard(p, instanceID); bCard != nil {
		card = bCard
		row := p.Board[bZone]
		p.Board[bZone] = append(row[:bPos], row[bPos+1:]...)
	} else {
		removeFromSlice := func(slice *[]*CardInstance) *CardInstance {
			for i, c := range *slice {
				if c.InstanceID == instanceID {
					found := c
					*slice = append((*slice)[:i], (*slice)[i+1:]...)
					return found
				}
			}
			return nil
		}
		if card = removeFromSlice(&p.Discard); card == nil {
			if card = removeFromSlice(&p.Deck); card == nil {
				if card = removeFromSlice(&p.Hand); card == nil {
					card = removeFromSlice(&p.Exile)
				}
			}
		}
	}

	if card == nil {
		return
	}

	card.Zone = dest
	card.CurrentVitality = card.BaseVitality
	card.PlayedThisTurn = false
	card.AttackedThisTurn = false

	switch dest {
	case ZoneHand:
		if !card.Definition.IsToken {
			p.Hand = append(p.Hand, card)
		}
	case ZoneDiscard:
		if !card.Definition.IsToken {
			p.Discard = append(p.Discard, card)
		}
	case ZoneExile:
		if !card.Definition.IsToken {
			p.Exile = append(p.Exile, card)
		}
	case ZoneDeck:
		if !card.Definition.IsToken {
			p.Deck = append(p.Deck, card)
		}
	case ZoneCity, ZoneRoad, ZoneCombat:
		card.PlayedThisTurn = true
		p.Board[dest] = append(p.Board[dest], card)
	}
}

// BuildPlayerView returns a sanitized snapshot of the GameState for the specified player.
func (g *GameState) BuildPlayerView(playerID string) (*PlayerGameView, error) {
	you, idx, err := g.GetPlayer(playerID)
	if err != nil {
		return nil, err
	}

	sanitizePlayer := func(p *PlayerState, includeHand bool) SanitizedPlayerView {
		view := SanitizedPlayerView{
			ID:                p.ID,
			Name:              p.Name,
			DevelopmentPoints: p.DevelopmentPoints,
			CitizenCount:      p.TotalCitizensOnBoard(),
			MulliganDone:      p.MulliganDone,
			DeckCount:         len(p.Deck),
			HandCount:         len(p.Hand),
			Discard:           make([]CardInstance, 0, len(p.Discard)),
			Exile:             make([]CardInstance, 0, len(p.Exile)),
			Board: map[ZoneID][]CardInstance{
				ZoneCity:   {},
				ZoneRoad:   {},
				ZoneCombat: {},
			},
		}
		if includeHand {
			view.Hand = make([]CardInstance, 0, len(p.Hand))
			for _, c := range p.Hand {
				view.Hand = append(view.Hand, c.Clone())
			}
		}
		for _, c := range p.Discard {
			view.Discard = append(view.Discard, c.Clone())
		}
		for _, c := range p.Exile {
			view.Exile = append(view.Exile, c.Clone())
		}
		for _, z := range []ZoneID{ZoneCity, ZoneRoad, ZoneCombat} {
			for _, c := range p.Board[z] {
				view.Board[z] = append(view.Board[z], c.Clone())
			}
		}
		return view
	}

	var oppView *SanitizedPlayerView
	if opp := g.Players[1-idx]; opp != nil {
		sv := sanitizePlayer(opp, false)
		oppView = &sv
	}

	activeID := ""
	if g.Players[g.ActivePlayerIdx] != nil {
		activeID = g.Players[g.ActivePlayerIdx].ID
	}

	originPhase := g.Phase
	if g.Phase == PhaseAwaitingInput {
		originPhase = g.ResumePhase
	}

	var promptCopy *PendingPrompt
	if g.PendingPrompt != nil {
		cp := *g.PendingPrompt
		// Hide candidate details from the non-selecting player if it's a private zone like Deck
		if cp.PlayerID != playerID {
			cp.CandidateCards = nil
		}
		promptCopy = &cp
	}

	var recentSteps []ActionStepSnapshot
	for _, rec := range g.animSteps {
		youSnap := rec.PlayersSnapshot[idx]
		var oppSnap *SanitizedPlayerView
		if g.Players[1-idx] != nil {
			os := rec.PlayersSnapshot[1-idx]
			os.Hand = nil // Mask opponent hand in historical snapshots
			oppSnap = &os
		}
		recentSteps = append(recentSteps, ActionStepSnapshot{
			Event:          rec.Event,
			You:            youSnap,
			Opponent:       oppSnap,
			TurnNumber:     rec.TurnNumber,
			Phase:          rec.Phase,
			ActivePlayerID: rec.ActivePlayerID,
			IsYourTurn:     rec.ActivePlayerID == playerID && rec.Phase != PhaseWaitingForPlayers && rec.Phase != PhaseGameOver,
		})
	}

	return &PlayerGameView{
		GameID:              g.ID,
		GameName:            g.GameName,
		StateVersion:        g.StateVersion,
		Rules:               g.Rules,
		Phase:               g.Phase,
		OriginPhase:         originPhase,
		TurnNumber:          g.TurnNumber,
		ActivePlayerID:      activeID,
		IsYourTurn:          activeID == playerID && g.Phase != PhaseWaitingForPlayers && g.Phase != PhaseGameOver,
		PlaysRemaining:      g.PlaysRemaining,
		MovesRemaining:      g.MovesRemaining,
		CanPlayInCombatZone: g.CanPlayInCombat(playerID),
		ValidCombatTargets:  g.ValidCombatTargetIDs(playerID),
		PendingPrompt:       promptCopy,
		You:                 sanitizePlayer(you, true),
		Opponent:            oppView,
		WinnerID:            g.WinnerID,
		WinReason:           g.WinReason,
		Log:                 append([]LogEntry{}, g.Log...),
		RecentSteps:         recentSteps,
	}, nil
}

func zoneDisplayName(z ZoneID) string {
	switch z {
	case ZoneCity:
		return "La Ciudad"
	case ZoneRoad:
		return "El Camino"
	case ZoneCombat:
		return "Zona de Combate"
	case ZoneHand:
		return "la Mano"
	case ZoneDeck:
		return "el Mazo"
	case ZoneDiscard:
		return "el Descarte"
	case ZoneExile:
		return "el Exilio"
	default:
		return string(z)
	}
}
