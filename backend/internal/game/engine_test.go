package game

import (
	"testing"
)

func cardByID(id string) CardDefinition {
	for _, c := range DefaultCards() {
		if c.ID == id {
			return c
		}
	}
	panic("card not found: " + id)
}

func makeUniformDeck(card CardDefinition, count int) []CardDefinition {
	deck := make([]CardDefinition, count)
	for i := 0; i < count; i++ {
		deck[i] = card
	}
	return deck
}

func TestMulliganAndTurnOneRules(t *testing.T) {
	gs := NewGameState("g1", "Test Match", DefaultRulesConfig())
	cab := cardByID("caballero_galardonado")

	if err := gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15)); err != nil {
		t.Fatalf("AddPlayer p1: %v", err)
	}
	if gs.Phase != PhaseWaitingForPlayers {
		t.Fatalf("expected WAITING_FOR_PLAYERS, got %s", gs.Phase)
	}

	if err := gs.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15)); err != nil {
		t.Fatalf("AddPlayer p2: %v", err)
	}
	if gs.Phase != PhaseMulligan {
		t.Fatalf("expected MULLIGAN, got %s", gs.Phase)
	}

	p1 := gs.Players[0]
	p2 := gs.Players[1]
	if len(p1.Hand) != 4 || len(p2.Hand) != 4 {
		t.Fatalf("expected 4 cards in each initial hand, got %d and %d", len(p1.Hand), len(p2.Hand))
	}

	// P1 mulligans 2 cards
	mulliganIDs := []string{p1.Hand[0].InstanceID, p1.Hand[1].InstanceID}
	if err := gs.ApplyMulligan("p1", mulliganIDs); err != nil {
		t.Fatalf("p1 mulligan failed: %v", err)
	}
	if len(p1.Hand) != 4 {
		t.Fatalf("expected 4 cards after mulligan, got %d", len(p1.Hand))
	}

	// P2 keeps hand -> Turn 1 starts for P1
	if err := gs.ApplyMulligan("p2", nil); err != nil {
		t.Fatalf("p2 mulligan failed: %v", err)
	}

	if gs.Phase != PhaseMain {
		t.Fatalf("expected MAIN phase on Turn 1, got %s", gs.Phase)
	}
	if gs.TurnNumber != 1 {
		t.Fatalf("expected TurnNumber 1, got %d", gs.TurnNumber)
	}
	// Rule 24: P1 only draws 1 card on Turn 1 -> 4 + 1 = 5 cards in hand
	if len(p1.Hand) != 5 {
		t.Fatalf("expected P1 to have 5 cards (4 + 1 draw on T1), got %d", len(p1.Hand))
	}
	// Rule 25: P1 only has 2 plays on Turn 1
	if gs.PlaysRemaining != 2 {
		t.Fatalf("expected 2 plays remaining on Turn 1, got %d", gs.PlaysRemaining)
	}

	// End Turn 1 -> Turn 2 starts for P2
	if err := gs.EndTurn("p1"); err != nil {
		t.Fatalf("EndTurn p1: %v", err)
	}
	if gs.TurnNumber != 2 {
		t.Fatalf("expected TurnNumber 2, got %d", gs.TurnNumber)
	}
	// P2 draws 2 cards (4 + 2 = 6) and gets 3 plays
	if len(p2.Hand) != 6 {
		t.Fatalf("expected P2 to have 6 cards on Turn 2, got %d", len(p2.Hand))
	}
	if gs.PlaysRemaining != 3 {
		t.Fatalf("expected 3 plays remaining on Turn 2, got %d", gs.PlaysRemaining)
	}
}

func TestZonePlacementAndAdjacencyMovement(t *testing.T) {
	gs := NewGameState("g2", "Zones & Move", DefaultRulesConfig())
	cab := cardByID("caballero_galardonado")
	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p2 := gs.Players[1]

	// Rule 15: Cannot play directly in Combat Zone if opponent has no card in Combat Zone
	if err := gs.PlayCard("p1", p1.Hand[0].InstanceID, ZoneCombat); err == nil {
		t.Fatalf("expected error playing in ZoneCombat when opponent Combat Zone is empty")
	}

	// Play two cards in City on Turn 1
	c1 := p1.Hand[0].InstanceID
	c1b := p1.Hand[1].InstanceID
	if err := gs.PlayCard("p1", c1, ZoneCity); err != nil {
		t.Fatalf("PlayCard c1 in City failed: %v", err)
	}
	if err := gs.PlayCard("p1", c1b, ZoneCity); err != nil {
		t.Fatalf("PlayCard c1b in City failed: %v", err)
	}

	// Rule 15 & 26: Cannot move a Citizen played this turn
	if err := gs.MoveCitizen("p1", c1, ZoneRoad); err == nil {
		t.Fatalf("expected error moving a Citizen that was played this turn")
	}

	// Advance to P2 turn, P2 plays in Road, then back to P1 turn
	_ = gs.EndTurn("p1")
	p2Card := p2.Hand[0].InstanceID
	_ = gs.PlayCard("p2", p2Card, ZoneRoad)
	_ = gs.EndTurn("p2")

	// Now on Turn 3 (P1's turn), c1 and c1b were NOT played this turn.
	// Cannot move directly from City to Combat (non-adjacent)
	if err := gs.MoveCitizen("p1", c1, ZoneCombat); err == nil {
		t.Fatalf("expected error moving directly from City to Combat")
	}

	// Move c1 from City to Road (valid)
	if err := gs.MoveCitizen("p1", c1, ZoneRoad); err != nil {
		t.Fatalf("MoveCitizen c1 City->Road failed: %v", err)
	}

	// The SAME card (c1) cannot move a second time in the same turn
	if err := gs.MoveCitizen("p1", c1, ZoneCombat); err == nil {
		t.Fatalf("expected error moving the same card twice in one turn")
	}

	// However, a SECOND card (c1b) that was also not played this turn CAN move in the same turn!
	if err := gs.MoveCitizen("p1", c1b, ZoneRoad); err != nil {
		t.Fatalf("MoveCitizen c1b City->Road in same turn failed: %v", err)
	}

	// End P1 turn; P2 moves p2Card from Road to Combat
	_ = gs.EndTurn("p1")
	if err := gs.MoveCitizen("p2", p2Card, ZoneCombat); err != nil {
		t.Fatalf("P2 MoveCitizen Road->Combat failed: %v", err)
	}
	_ = gs.EndTurn("p2")

	// Now P2 has a card in ZoneCombat, so P1 CAN play directly into ZoneCombat!
	c2 := p1.Hand[0].InstanceID
	if err := gs.PlayCard("p1", c2, ZoneCombat); err != nil {
		t.Fatalf("expected P1 to be able to play in ZoneCombat when opponent has a card there, got: %v", err)
	}
}

func TestCombatLineOfSightAndBothVitalityModes(t *testing.T) {
	// 1. Test Dynamic Vitality Mode (default)
	gs := NewGameState("g3", "Dynamic Combat", DefaultRulesConfig())
	cab := cardByID("caballero_galardonado") // 10V
	reclutador := cardByID("reclutador")     // 6V
	mensajero := cardByID("mensajero")       // 2V

	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(reclutador, 15))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p2 := gs.Players[1]

	// Put 2 attackers for P1 in Combat Zone, and enemy defenders for P2 in Road and City
	att1 := &CardInstance{InstanceID: "att1", OwnerID: "p1", Definition: reclutador, BaseVitality: 6, CurrentVitality: 4, Zone: ZoneCombat}
	att2 := &CardInstance{InstanceID: "att2", OwnerID: "p1", Definition: mensajero, BaseVitality: 2, CurrentVitality: 2, Zone: ZoneCombat}
	p1.Board[ZoneCombat] = []*CardInstance{att1, att2}

	defRoad := &CardInstance{InstanceID: "def_road", OwnerID: "p2", Definition: cab, BaseVitality: 10, CurrentVitality: 10, Zone: ZoneRoad}
	defCity := &CardInstance{InstanceID: "def_city", OwnerID: "p2", Definition: mensajero, BaseVitality: 2, CurrentVitality: 2, Zone: ZoneCity}
	p2.Board[ZoneRoad] = []*CardInstance{defRoad}
	p2.Board[ZoneCity] = []*CardInstance{defCity}

	// Rule 19: Cannot attack City while Road has a Citizen
	if err := gs.AttackCitizen("p1", "att1", "def_city"); err == nil {
		t.Fatalf("expected error attacking City while Road is occupied")
	}

	// Attack Road with att1 (CurrentVitality = 4 in Dynamic Mode -> deals 4 damage)
	if err := gs.AttackCitizen("p1", "att1", "def_road"); err != nil {
		t.Fatalf("AttackCitizen failed: %v", err)
	}
	if defRoad.CurrentVitality != 6 {
		t.Fatalf("expected defRoad CurrentVitality to be 6 (10 - 4 in Dynamic mode), got %d", defRoad.CurrentVitality)
	}

	// att1 cannot attack twice in the same turn
	if err := gs.AttackCitizen("p1", "att1", "def_road"); err == nil {
		t.Fatalf("expected error when same Citizen attacks twice in one turn")
	}

	// Second Citizen (att2) CAN also attack in the same turn ("player can attack per each citizen")
	if err := gs.AttackCitizen("p1", "att2", "def_road"); err != nil {
		t.Fatalf("expected second Citizen in Combat Zone to be able to attack, got: %v", err)
	}
	if defRoad.CurrentVitality != 4 {
		t.Fatalf("expected defRoad CurrentVitality to be 4, got %d", defRoad.CurrentVitality)
	}

	// 2. Test BaseAttack Vitality Mode
	baseRules := DefaultRulesConfig()
	baseRules.VitalityMode = VitalityModeBaseAttack
	gsBase := NewGameState("g4", "BaseAttack Combat", baseRules)
	_ = gsBase.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gsBase.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15))
	_ = gsBase.ApplyMulligan("p1", nil)
	_ = gsBase.ApplyMulligan("p2", nil)

	attBase := &CardInstance{InstanceID: "att_base", OwnerID: "p1", Definition: reclutador, BaseVitality: 6, CurrentVitality: 2, Zone: ZoneCombat}
	defBase := &CardInstance{InstanceID: "def_base", OwnerID: "p2", Definition: cab, BaseVitality: 10, CurrentVitality: 10, Zone: ZoneCombat}
	gsBase.Players[0].Board[ZoneCombat] = []*CardInstance{attBase}
	gsBase.Players[1].Board[ZoneCombat] = []*CardInstance{defBase}

	if err := gsBase.AttackCitizen("p1", "att_base", "def_base"); err != nil {
		t.Fatalf("BaseAttack mode attack failed: %v", err)
	}
	// Should deal BaseVitality (6) instead of CurrentVitality (2)
	if defBase.CurrentVitality != 4 {
		t.Fatalf("expected defBase CurrentVitality to be 4 (10 - 6 BaseVitality), got %d", defBase.CurrentVitality)
	}

	// 3. Test RetaliationDamage (attacker takes damage equal to target's attack)
	retRules := DefaultRulesConfig()
	retRules.RetaliationDamage = true
	gsRet := NewGameState("g4_ret", "Retaliation Combat", retRules)
	_ = gsRet.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gsRet.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15))
	_ = gsRet.ApplyMulligan("p1", nil)
	_ = gsRet.ApplyMulligan("p2", nil)

	attRet1 := &CardInstance{InstanceID: "att_ret_1", OwnerID: "p1", Definition: cab, BaseVitality: 10, CurrentVitality: 10, Zone: ZoneCombat}
	attRet2 := &CardInstance{InstanceID: "att_ret_2", OwnerID: "p1", Definition: reclutador, BaseVitality: 6, CurrentVitality: 4, Zone: ZoneCombat}
	defRet := &CardInstance{InstanceID: "def_ret", OwnerID: "p2", Definition: cab, BaseVitality: 10, CurrentVitality: 14, Zone: ZoneCombat}
	gsRet.Players[0].Board[ZoneCombat] = []*CardInstance{attRet1, attRet2}
	gsRet.Players[1].Board[ZoneCombat] = []*CardInstance{defRet}

	// First attack: attRet1 (10V) attacks defRet (14V).
	// defRet takes 10 dmg -> 4V left; attRet1 takes 14 dmg -> destroyed!
	if err := gsRet.AttackCitizen("p1", "att_ret_1", "def_ret"); err != nil {
		t.Fatalf("Retaliation attack 1 failed: %v", err)
	}
	if defRet.CurrentVitality != 4 {
		t.Fatalf("expected defRet CurrentVitality to be 4, got %d", defRet.CurrentVitality)
	}
	if len(gsRet.Players[0].Board[ZoneCombat]) != 1 {
		t.Fatalf("expected attRet1 to be destroyed by 14V retaliation damage, remaining attackers=%d", len(gsRet.Players[0].Board[ZoneCombat]))
	}

	// Second attack: attRet2 (4V) attacks defRet (now 4V). Both deal 4 dmg and both are destroyed!
	if err := gsRet.AttackCitizen("p1", "att_ret_2", "def_ret"); err != nil {
		t.Fatalf("Retaliation attack 2 failed: %v", err)
	}
	if len(gsRet.Players[0].Board[ZoneCombat]) != 0 || len(gsRet.Players[1].Board[ZoneCombat]) != 0 {
		t.Fatalf("expected both attRet2 and defRet to be destroyed in mutual 4V clash")
	}
}

func TestAllTenBaseCardsAndTriggerOrdering(t *testing.T) {
	gs := NewGameState("g5", "All 10 Cards", DefaultRulesConfig())
	cab := cardByID("caballero_galardonado")
	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p2 := gs.Players[1]
	gs.PlaysRemaining = 10 // Give plenty of plays to test all cards in sequence

	// 1. Entrenador de guerra (8V): OnPlay summons 1V Recluta in the same row
	entrenador := &CardInstance{InstanceID: "c_ent", OwnerID: "p1", Definition: cardByID("entrenador_de_guerra"), BaseVitality: 8, CurrentVitality: 8, Zone: ZoneHand}
	p1.Hand = append(p1.Hand, entrenador)
	if err := gs.PlayCard("p1", "c_ent", ZoneRoad); err != nil {
		t.Fatalf("Play Entrenador failed: %v", err)
	}
	if len(p1.Board[ZoneRoad]) != 2 {
		t.Fatalf("expected Entrenador + Recluta in Road (2 cards), got %d", len(p1.Board[ZoneRoad]))
	}

	// 2. Mensajero (2V): OnPlay draws 1 card
	handBefore := len(p1.Hand)
	mensajero := &CardInstance{InstanceID: "c_men", OwnerID: "p1", Definition: cardByID("mensajero"), BaseVitality: 2, CurrentVitality: 2, Zone: ZoneHand}
	p1.Hand = append(p1.Hand, mensajero)
	if err := gs.PlayCard("p1", "c_men", ZoneCity); err != nil {
		t.Fatalf("Play Mensajero failed: %v", err)
	}
	if len(p1.Hand) != handBefore+1 {
		t.Fatalf("expected Mensajero to draw 1 card (hand %d -> %d), got %d", handBefore, handBefore+1, len(p1.Hand))
	}

	// Put an enemy Caballero (10V) on P2's City
	enemyCab := &CardInstance{InstanceID: "e_cab", OwnerID: "p2", Definition: cab, BaseVitality: 10, CurrentVitality: 10, Zone: ZoneCity}
	p2.Board[ZoneCity] = []*CardInstance{enemyCab}

	// 3. Rayo vengativo (Evento): Deal 5 damage to a target of choice
	rayo := &CardInstance{InstanceID: "c_rayo", OwnerID: "p1", Definition: cardByID("rayo_vengativo"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, rayo)
	if err := gs.PlayCard("p1", "c_rayo", ""); err != nil {
		t.Fatalf("Play Rayo failed: %v", err)
	}
	if gs.Phase != PhaseAwaitingInput {
		t.Fatalf("expected PhaseAwaitingInput for Rayo vengativo, got %s", gs.Phase)
	}
	if err := gs.SubmitPromptTarget("p1", "e_cab"); err != nil {
		t.Fatalf("SubmitPromptTarget Rayo failed: %v", err)
	}
	if enemyCab.CurrentVitality != 5 {
		t.Fatalf("expected enemyCab at 5V after Rayo, got %d", enemyCab.CurrentVitality)
	}

	// 4. Dado de baja (Evento): Return a friendly Citizen from board to hand
	dado := &CardInstance{InstanceID: "c_dado", OwnerID: "p1", Definition: cardByID("dado_de_baja"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, dado)
	if err := gs.PlayCard("p1", "c_dado", ""); err != nil {
		t.Fatalf("Play Dado de baja failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "c_men"); err != nil {
		t.Fatalf("SubmitPromptTarget Dado de baja failed: %v", err)
	}
	if len(p1.Board[ZoneCity]) != 0 {
		t.Fatalf("expected Mensajero returned from City to Hand")
	}

	// 5. Pacto de Sacrificio (Evento): Sacrifice a friendly Citizen to destroy an enemy Citizen
	pacto := &CardInstance{InstanceID: "c_pacto", OwnerID: "p1", Definition: cardByID("pacto_de_sacrificio"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, pacto)
	if err := gs.PlayCard("p1", "c_pacto", ""); err != nil {
		t.Fatalf("Play Pacto de Sacrificio failed: %v", err)
	}
	// Step 1: sacrifice Entrenador ("c_ent")
	if err := gs.SubmitPromptTarget("p1", "c_ent"); err != nil {
		t.Fatalf("Pacto step 1 failed: %v", err)
	}
	// Step 2: destroy enemyCab ("e_cab")
	if gs.Phase != PhaseAwaitingInput {
		t.Fatalf("expected second prompt for Pacto de Sacrificio")
	}
	if err := gs.SubmitPromptTarget("p1", "e_cab"); err != nil {
		t.Fatalf("Pacto step 2 failed: %v", err)
	}
	if len(p2.Board[ZoneCity]) != 0 {
		t.Fatalf("expected enemyCab to be destroyed by Pacto de Sacrificio")
	}

	// 6. El regreso del Sobreviviente (Evento): Return a Citizen from Discard to Hand
	sobrev := &CardInstance{InstanceID: "c_sobrev", OwnerID: "p1", Definition: cardByID("el_regreso_del_sobreviviente"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, sobrev)
	if err := gs.PlayCard("p1", "c_sobrev", ""); err != nil {
		t.Fatalf("Play El regreso del Sobreviviente failed: %v", err)
	}
	// Select "c_ent" from discard
	if err := gs.SubmitPromptTarget("p1", "c_ent"); err != nil {
		t.Fatalf("SubmitPromptTarget Sobreviviente failed: %v", err)
	}

	// 7. Misión de Investigación (Evento): Search a card from Deck to Hand and shuffle Deck
	targetDeckCard := p1.Deck[0].InstanceID
	mision := &CardInstance{InstanceID: "c_mision", OwnerID: "p1", Definition: cardByID("mision_de_investigacion"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, mision)
	if err := gs.PlayCard("p1", "c_mision", ""); err != nil {
		t.Fatalf("Play Misión de Investigación failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", targetDeckCard); err != nil {
		t.Fatalf("SubmitPromptTarget Misión failed: %v", err)
	}

	// 8. End of Turn Trigger Order (Combat -> Road -> City, right-to-left) with Reclutador & Granjero,
	// plus Start of Turn trigger for Mago de las Tormentas (6V, Al comienzo del turno)
	enemyTarget := &CardInstance{InstanceID: "e_target", OwnerID: "p2", Definition: cab, BaseVitality: 10, CurrentVitality: 10, Zone: ZoneCity}
	p2.Board[ZoneCity] = []*CardInstance{enemyTarget}

	// Place Reclutador in Combat (left) and Granjero in Combat (right)
	rec := &CardInstance{InstanceID: "c_rec", OwnerID: "p1", Definition: cardByID("reclutador"), BaseVitality: 6, CurrentVitality: 6, Zone: ZoneCombat}
	gran := &CardInstance{InstanceID: "c_gran", OwnerID: "p1", Definition: cardByID("granjero"), BaseVitality: 4, CurrentVitality: 4, Zone: ZoneCombat}
	p1.Board[ZoneCombat] = []*CardInstance{rec, gran}

	// Also place Mago de las Tormentas (6V, Al comienzo del turno) on P2's board so when P2's turn starts it triggers!
	mago := &CardInstance{InstanceID: "e_mago", OwnerID: "p2", Definition: cardByID("mago_de_las_tormentas"), BaseVitality: 6, CurrentVitality: 6, Zone: ZoneCity}
	p2.Board[ZoneCity] = append(p2.Board[ZoneCity], mago)

	// When P1 calls EndTurn, Granjero (rightmost) summons a Vaca (1V) and Reclutador summons a Recluta (1V),
	// P1 gains 1 Development Point (5 vs 2 Citizens), and then P2's turn starts -> Mago de las Tormentas triggers!
	if err := gs.EndTurn("p1"); err != nil {
		t.Fatalf("EndTurn failed: %v", err)
	}
	if len(p1.Board[ZoneCombat]) != 4 {
		t.Fatalf("expected 4 Citizens in P1 Combat Zone after Granjero + Reclutador triggers, got %d", len(p1.Board[ZoneCombat]))
	}
	if p1.DevelopmentPoints != 1 {
		t.Fatalf("expected P1 to have 1 Development Point, got %d", p1.DevelopmentPoints)
	}
	if gs.Phase != PhaseAwaitingInput || gs.PendingPrompt == nil || gs.PendingPrompt.SourceCardID != "e_mago" {
		t.Fatalf("expected P2's Mago de las Tormentas to trigger at start of P2's turn, got phase=%s prompt=%+v", gs.Phase, gs.PendingPrompt)
	}
	if err := gs.SubmitPromptTarget("p2", "c_rec"); err != nil {
		t.Fatalf("SubmitPromptTarget Mago failed: %v", err)
	}
	if rec.CurrentVitality != 4 {
		t.Fatalf("expected Reclutador at 4V after Mago's 2 damage, got %d", rec.CurrentVitality)
	}
}

func TestExpansionCardsAndNewMechanics(t *testing.T) {
	rules := DefaultRulesConfig()
	rules.MaxPlaysPerTurn = 10
	rules.FirstTurnMaxPlays = 10
	cab := cardByID("caballero_galardonado")

	gs := NewGameState("g_exp", "Expansion Test", rules)
	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p2 := gs.Players[1]
	p1.Hand = nil
	p2.Hand = nil

	// 1. Protector de los débiles (7V, Escudo): absorbs first damage and loses shield
	prot := &CardInstance{InstanceID: "p2_prot", OwnerID: "p2", Definition: cardByID("protector_de_los_debiles"), Zone: ZoneCity, BaseVitality: 7, CurrentVitality: 7, ShieldActive: true}
	p2.Board[ZoneCity] = []*CardInstance{prot}

	rayo := &CardInstance{InstanceID: "p1_rayo", OwnerID: "p1", Definition: cardByID("rayo_vengativo"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, rayo)
	if err := gs.PlayCard("p1", "p1_rayo", ""); err != nil {
		t.Fatalf("Play Rayo on Protector failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "p2_prot"); err != nil {
		t.Fatalf("Target Protector failed: %v", err)
	}
	if prot.CurrentVitality != 7 || prot.ShieldActive {
		t.Fatalf("expected Protector to remain at 7V with ShieldActive=false, got %dV shield=%v", prot.CurrentVitality, prot.ShieldActive)
	}

	// 2. Asesino (1V, Espía): deployed to opponent's ZoneCity at index 0, destroys the Citizen to its right (Protector!)
	asesino := &CardInstance{InstanceID: "p1_asesino", OwnerID: "p1", Definition: cardByID("asesino"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, asesino)
	if err := gs.PlayCard("p1", "p1_asesino", ZoneCity); err != nil {
		t.Fatalf("Play Asesino failed: %v", err)
	}
	if len(p2.Board[ZoneCity]) != 1 || p2.Board[ZoneCity][0].InstanceID != "p1_asesino" {
		t.Fatalf("expected Protector to be assassinated and only Asesino (1V) left on P2's ZoneCity, got %d cards", len(p2.Board[ZoneCity]))
	}

	// 3. Explorador de basura (9V) + Nadador de basura (3V):
	// Playing Explorador discards Nadador from hand -> Nadador's on_discard summons itself to ZoneRoad -> Explorador draws 1 card!
	explorador := &CardInstance{InstanceID: "p1_exp", OwnerID: "p1", Definition: cardByID("explorador_de_basura"), Zone: ZoneHand}
	nadador := &CardInstance{InstanceID: "p1_nad", OwnerID: "p1", Definition: cardByID("nadador_de_basura"), Zone: ZoneHand}
	p1.Hand = []*CardInstance{explorador, nadador}

	if err := gs.PlayCard("p1", "p1_exp", ZoneCity); err != nil {
		t.Fatalf("Play Explorador failed: %v", err)
	}
	if gs.Phase != PhaseAwaitingInput {
		t.Fatalf("expected prompt to discard card for Explorador")
	}
	if err := gs.SubmitPromptTarget("p1", "p1_nad"); err != nil {
		t.Fatalf("Discard Nadador failed: %v", err)
	}
	// Nadador should now be on P1's ZoneRoad, and P1 should have drawn 1 card into hand!
	if len(p1.Board[ZoneRoad]) != 1 || p1.Board[ZoneRoad][0].InstanceID != "p1_nad" {
		t.Fatalf("expected Nadador de basura to be summoned to El Camino on discard, got %d cards in Road", len(p1.Board[ZoneRoad]))
	}
	if len(p1.Hand) != 1 {
		t.Fatalf("expected 1 drawn card in hand after Explorador, got %d", len(p1.Hand))
	}

	// 4. Demoledor de basura (8V, PlayFromDiscard):
	// Put Demoledor in P1's Discard along with 3 other cards; play Demoledor from Discard -> mills 3 cards to Exile and stays on board!
	demo := &CardInstance{InstanceID: "p1_demo", OwnerID: "p1", Definition: cardByID("demoledor_de_basura"), Zone: ZoneDiscard}
	d1 := &CardInstance{InstanceID: "d1", OwnerID: "p1", Definition: cab, Zone: ZoneDiscard}
	d2 := &CardInstance{InstanceID: "d2", OwnerID: "p1", Definition: cab, Zone: ZoneDiscard}
	d3 := &CardInstance{InstanceID: "d3", OwnerID: "p1", Definition: cab, Zone: ZoneDiscard}
	p1.Discard = []*CardInstance{d1, d2, d3, demo}

	if err := gs.PlayCard("p1", "p1_demo", ZoneCity); err != nil {
		t.Fatalf("Play Demoledor from Discard failed: %v", err)
	}
	if len(p1.Exile) != 3 {
		t.Fatalf("expected 3 cards exiled by Demoledor, got %d", len(p1.Exile))
	}
	if found, _, _ := gs.findBoardCard(p1, "p1_demo"); found == nil {
		t.Fatalf("expected Demoledor to remain on board after milling 3 cards")
	}

	// 5. Trillizos (3V -> Mellizo 2V -> Hermano 1V):
	trill := &CardInstance{InstanceID: "p1_trill", OwnerID: "p1", Definition: cardByID("trillizos"), Zone: ZoneRoad, BaseVitality: 3, CurrentVitality: 3}
	p1.Board[ZoneRoad] = append(p1.Board[ZoneRoad], trill)
	gs.destroyBoardCard(p1, "p1_trill")
	gs.processEffectQueue(PhaseMain)

	var mellizoInst *CardInstance
	for _, c := range p1.Board[ZoneRoad] {
		if c.Definition.Name == "Mellizo" && c.CurrentVitality == 2 {
			mellizoInst = c
			break
		}
	}
	if mellizoInst == nil {
		t.Fatalf("expected Trillizos deathwish to summon Mellizo (2V)")
	}
	// Now destroy Mellizo -> should summon Hermano (1V)!
	gs.destroyBoardCard(p1, mellizoInst.InstanceID)
	gs.processEffectQueue(PhaseMain)
	foundHermano := false
	for _, c := range p1.Board[ZoneRoad] {
		if c.Definition.Name == "Hermano" && c.CurrentVitality == 1 {
			foundHermano = true
			break
		}
	}
	if !foundHermano {
		t.Fatalf("expected Mellizo deathwish to summon Hermano (1V)")
	}

	// 6. Germinador (5V) + Mercenarios de emergencia (Evento):
	// Set P2 DevelopmentPoints = 5 (> P1's 0) so Mercenarios summons 3 instead of 2, AND Germinador summons a Treant (1V)!
	p2.DevelopmentPoints = 5
	germ := &CardInstance{InstanceID: "p1_germ", OwnerID: "p1", Definition: cardByID("germinador"), Zone: ZoneCity, BaseVitality: 5, CurrentVitality: 5}
	p1.Board[ZoneCity] = append(p1.Board[ZoneCity], germ)

	merc := &CardInstance{InstanceID: "p1_merc", OwnerID: "p1", Definition: cardByID("mercenarios_de_emergencia"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, merc)
	if err := gs.PlayCard("p1", "p1_merc", ""); err != nil {
		t.Fatalf("Play Mercenarios de emergencia failed: %v", err)
	}
	if len(p1.Board[ZoneCombat]) != 3 {
		t.Fatalf("expected 3 Mercenarios (2V) in Combat Zone because enemy has more Development Points, got %d", len(p1.Board[ZoneCombat]))
	}
	foundTreant := false
	for _, c := range p1.Board[ZoneCity] {
		if c.Definition.Name == "Treant" {
			foundTreant = true
			break
		}
	}
	if !foundTreant {
		t.Fatalf("expected Germinador to summon a Treant (1V) when an Event was played")
	}

	// 7. Fábrica de robots (8A, Herramienta):
	// Deploy to ZoneCity -> does NOT increase TotalCitizensOnBoard(), cannot move, and at EndTurn summons Robot (2V) with deathwish Dron (1V)!
	citizensBefore := p1.TotalCitizensOnBoard()
	fab := &CardInstance{InstanceID: "p1_fab", OwnerID: "p1", Definition: cardByID("fabrica_de_robots"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, fab)
	if err := gs.PlayCard("p1", "p1_fab", ZoneCity); err != nil {
		t.Fatalf("Play Fábrica de robots failed: %v", err)
	}
	if p1.TotalCitizensOnBoard() != citizensBefore {
		t.Fatalf("expected Tool (Fábrica de robots) NOT to count as a Citizen, before=%d after=%d", citizensBefore, p1.TotalCitizensOnBoard())
	}
	if err := gs.EndTurn("p1"); err != nil {
		t.Fatalf("EndTurn with Fábrica de robots failed: %v", err)
	}
	var robotInst *CardInstance
	for _, c := range p1.Board[ZoneCity] {
		if c.Definition.Name == "Robot" && c.CurrentVitality == 2 {
			robotInst = c
			break
		}
	}
	if robotInst == nil {
		t.Fatalf("expected Fábrica de robots to summon Robot (2V) at end of turn")
	}
}

func TestVictoryAtTenDevelopmentPointsAndDeckConstraints(t *testing.T) {
	rules := DefaultRulesConfig()
	rules.DeckConstraints = DeckConstraints{
		Enforced:         true,
		MinCards:         5,
		MaxCards:         10,
		MaxCopiesPerCard: 2,
	}
	cab := cardByID("caballero_galardonado")

	// Should reject deck with 3 copies of same card when Enforced = true
	if err := ValidateDeck(makeUniformDeck(cab, 6), rules.DeckConstraints); err == nil {
		t.Fatalf("expected deck constraint error when exceeding MaxCopiesPerCard")
	}

	// With Enforced = false, should allow any deck
	rules.DeckConstraints.Enforced = false
	gs := NewGameState("g6", "Victory Test", rules)
	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 10))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(cab, 10))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p1.DevelopmentPoints = 9
	_ = gs.PlayCard("p1", p1.Hand[0].InstanceID, ZoneCity)

	if err := gs.EndTurn("p1"); err != nil {
		t.Fatalf("EndTurn failed: %v", err)
	}
	if gs.Phase != PhaseGameOver {
		t.Fatalf("expected GAME_OVER when reaching 10 Development Points, got %s", gs.Phase)
	}
	if gs.WinnerID != "p1" {
		t.Fatalf("expected WinnerID p1, got %s", gs.WinnerID)
	}
}
