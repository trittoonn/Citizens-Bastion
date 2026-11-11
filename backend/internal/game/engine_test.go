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
	// Reglas 2026 v1: Al comienzo del turno de cada jugador, este levanta dos cartas (4 + 2 = 6) y puede jugar hasta 3 cartas
	if len(p1.Hand) != 6 {
		t.Fatalf("expected P1 to have 6 cards (4 + 2 draw on T1), got %d", len(p1.Hand))
	}
	if gs.PlaysRemaining != 3 {
		t.Fatalf("expected 3 plays remaining on Turn 1, got %d", gs.PlaysRemaining)
	}

	// End Turn 1 -> Turn 2 starts for P2
	if err := gs.EndTurn("p1"); err != nil {
		t.Fatalf("EndTurn p1: %v", err)
	}
	if gs.TurnNumber != 2 {
		t.Fatalf("expected TurnNumber 2, got %d", gs.TurnNumber)
	}
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

	// Cannot play directly in Combat Zone if opponent has no card in Combat Zone
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

	// Cannot move a Citizen played this turn
	if err := gs.MoveCitizen("p1", c1, ZoneRoad); err == nil {
		t.Fatalf("expected error moving a Citizen that was played this turn")
	}

	// Advance to P2 turn, P2 plays 1 card in Road (P1 has 2 Citizens vs P2's 1 Citizen -> P1 wins Round 1 point and goes first on Turn 3!)
	_ = gs.EndTurn("p1")
	p2Card := p2.Hand[0].InstanceID
	_ = gs.PlayCard("p2", p2Card, ZoneRoad)
	_ = gs.EndTurn("p2")

	// Now on Turn 3 (P1's turn), c1 and c1b were NOT played this turn.
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

	// A SECOND card (c1b) that was also not played this turn CAN move in the same turn
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
	// 1. Test Dynamic Vitality Mode (with RetaliationDamage = false to test unilateral calculation first)
	rules := DefaultRulesConfig()
	rules.RetaliationDamage = false
	gs := NewGameState("g3", "Dynamic Combat", rules)
	cab := cardByID("caballero_galardonado") // 8V
	reclutador := cardByID("reclutador")     // 6V
	mensajero := cardByID("mensajero")       // 2V

	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(reclutador, 15))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p2 := gs.Players[1]

	att1 := &CardInstance{InstanceID: "att1", OwnerID: "p1", Definition: reclutador, BaseVitality: 6, CurrentVitality: 4, Zone: ZoneCombat}
	att2 := &CardInstance{InstanceID: "att2", OwnerID: "p1", Definition: mensajero, BaseVitality: 2, CurrentVitality: 2, Zone: ZoneCombat}
	p1.Board[ZoneCombat] = []*CardInstance{att1, att2}

	defRoad := &CardInstance{InstanceID: "def_road", OwnerID: "p2", Definition: cab, BaseVitality: 10, CurrentVitality: 10, Zone: ZoneRoad}
	defCity := &CardInstance{InstanceID: "def_city", OwnerID: "p2", Definition: mensajero, BaseVitality: 2, CurrentVitality: 2, Zone: ZoneCity}
	p2.Board[ZoneRoad] = []*CardInstance{defRoad}
	p2.Board[ZoneCity] = []*CardInstance{defCity}

	if err := gs.AttackCitizen("p1", "att1", "def_city"); err == nil {
		t.Fatalf("expected error attacking City while Road is occupied")
	}

	if err := gs.AttackCitizen("p1", "att1", "def_road"); err != nil {
		t.Fatalf("AttackCitizen failed: %v", err)
	}
	if defRoad.CurrentVitality != 6 {
		t.Fatalf("expected defRoad CurrentVitality to be 6 (10 - 4 in Dynamic mode), got %d", defRoad.CurrentVitality)
	}

	// Rule 32: A Citizen that attacked this turn CANNOT move this turn!
	if err := gs.MoveCitizen("p1", "att1", ZoneRoad); err == nil {
		t.Fatalf("expected error when Citizen tries to move after attacking in the same turn")
	}

	if err := gs.AttackCitizen("p1", "att1", "def_road"); err == nil {
		t.Fatalf("expected error when same Citizen attacks twice in one turn")
	}

	if err := gs.AttackCitizen("p1", "att2", "def_road"); err != nil {
		t.Fatalf("expected second Citizen in Combat Zone to be able to attack, got: %v", err)
	}
	if defRoad.CurrentVitality != 4 {
		t.Fatalf("expected defRoad CurrentVitality to be 4, got %d", defRoad.CurrentVitality)
	}

	// 2. Test BaseAttack Vitality Mode
	baseRules := DefaultRulesConfig()
	baseRules.VitalityMode = VitalityModeBaseAttack
	baseRules.RetaliationDamage = false
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
	if defBase.CurrentVitality != 4 {
		t.Fatalf("expected defBase CurrentVitality to be 4 (10 - 6 BaseVitality), got %d", defBase.CurrentVitality)
	}

	// 3. Test RetaliationDamage (default in Reglas 2026 v1)
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

	if err := gsRet.AttackCitizen("p1", "att_ret_1", "def_ret"); err != nil {
		t.Fatalf("Retaliation attack 1 failed: %v", err)
	}
	if defRet.CurrentVitality != 4 {
		t.Fatalf("expected defRet CurrentVitality to be 4, got %d", defRet.CurrentVitality)
	}
	if len(gsRet.Players[0].Board[ZoneCombat]) != 1 {
		t.Fatalf("expected attRet1 to be destroyed by 14V retaliation damage, remaining attackers=%d", len(gsRet.Players[0].Board[ZoneCombat]))
	}

	if err := gsRet.AttackCitizen("p1", "att_ret_2", "def_ret"); err != nil {
		t.Fatalf("Retaliation attack 2 failed: %v", err)
	}
	if len(gsRet.Players[0].Board[ZoneCombat]) != 0 || len(gsRet.Players[1].Board[ZoneCombat]) != 0 {
		t.Fatalf("expected both attRet2 and defRet to be destroyed in mutual 4V clash")
	}
}

func TestAllTenBaseCardsAndTriggerOrdering(t *testing.T) {
	rules := DefaultRulesConfig()
	rules.PointsEveryTwoTurns = false
	gs := NewGameState("g5", "All 10 Cards", rules)
	cab := cardByID("caballero_galardonado")
	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p2 := gs.Players[1]
	gs.PlaysRemaining = 10

	// 1. Reclutador de guerra (6V): OnPlay summons 2V Recluta in the same row
	recGuerra := &CardInstance{InstanceID: "c_ent", OwnerID: "p1", Definition: cardByID("reclutador_de_guerra"), BaseVitality: 6, CurrentVitality: 6, Zone: ZoneHand}
	p1.Hand = append(p1.Hand, recGuerra)
	if err := gs.PlayCard("p1", "c_ent", ZoneRoad); err != nil {
		t.Fatalf("Play Reclutador de guerra failed: %v", err)
	}
	if len(p1.Board[ZoneRoad]) != 2 || p1.Board[ZoneRoad][1].CurrentVitality != 2 {
		t.Fatalf("expected Reclutador de guerra + Recluta (2V) in Road, got %d cards", len(p1.Board[ZoneRoad]))
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

	// Put an enemy Caballero (8V) on P2's City
	enemyCab := &CardInstance{InstanceID: "e_cab", OwnerID: "p2", Definition: cab, BaseVitality: 8, CurrentVitality: 8, Zone: ZoneCity}
	p2.Board[ZoneCity] = []*CardInstance{enemyCab}

	// 3. Rayo vengativo (Evento): Deal 4 damage to a target of choice
	rayo := &CardInstance{InstanceID: "c_rayo", OwnerID: "p1", Definition: cardByID("rayo_vengativo"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, rayo)
	if err := gs.PlayCard("p1", "c_rayo", ""); err != nil {
		t.Fatalf("Play Rayo failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "e_cab"); err != nil {
		t.Fatalf("SubmitPromptTarget Rayo failed: %v", err)
	}
	if enemyCab.CurrentVitality != 4 {
		t.Fatalf("expected enemyCab at 4V (8 - 4) after Rayo, got %d", enemyCab.CurrentVitality)
	}

	// 4. Retirada (Evento): Return a friendly Citizen from board to hand
	retirada := &CardInstance{InstanceID: "c_ret", OwnerID: "p1", Definition: cardByID("retirada"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, retirada)
	if err := gs.PlayCard("p1", "c_ret", ""); err != nil {
		t.Fatalf("Play Retirada failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "c_men"); err != nil {
		t.Fatalf("SubmitPromptTarget Retirada failed: %v", err)
	}
	if len(p1.Board[ZoneCity]) != 0 {
		t.Fatalf("expected Mensajero returned from City to Hand")
	}

	// 5. Municiones vivas (Evento): Sacrifice a friendly Citizen to destroy an enemy Citizen
	municiones := &CardInstance{InstanceID: "c_muni", OwnerID: "p1", Definition: cardByID("municiones_vivas"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, municiones)
	if err := gs.PlayCard("p1", "c_muni", ""); err != nil {
		t.Fatalf("Play Municiones vivas failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "c_ent"); err != nil {
		t.Fatalf("Municiones step 1 failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "e_cab"); err != nil {
		t.Fatalf("Municiones step 2 failed: %v", err)
	}
	if len(p2.Board[ZoneCity]) != 0 {
		t.Fatalf("expected enemyCab to be destroyed by Municiones vivas")
	}

	// 6. Búsqueda del tesoro (Evento): Return a Citizen or Tool from Discard to Hand
	busq := &CardInstance{InstanceID: "c_busq", OwnerID: "p1", Definition: cardByID("busqueda_del_tesoro"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, busq)
	if err := gs.PlayCard("p1", "c_busq", ""); err != nil {
		t.Fatalf("Play Búsqueda del tesoro failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "c_ent"); err != nil {
		t.Fatalf("SubmitPromptTarget Búsqueda failed: %v", err)
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

	// 8. End of Turn Trigger Order & Mago de las Tormentas Start of Turn trigger
	enemyTarget := &CardInstance{InstanceID: "e_target", OwnerID: "p2", Definition: cab, BaseVitality: 8, CurrentVitality: 8, Zone: ZoneCity}
	p2.Board[ZoneCity] = []*CardInstance{enemyTarget}

	rec := &CardInstance{InstanceID: "c_rec", OwnerID: "p1", Definition: cardByID("reclutador"), BaseVitality: 6, CurrentVitality: 6, Zone: ZoneCombat}
	gran := &CardInstance{InstanceID: "c_gran", OwnerID: "p1", Definition: cardByID("granjero"), BaseVitality: 4, CurrentVitality: 4, Zone: ZoneCombat}
	p1.Board[ZoneCombat] = []*CardInstance{rec, gran}

	mago := &CardInstance{InstanceID: "e_mago", OwnerID: "p2", Definition: cardByID("mago_de_las_tormentas"), BaseVitality: 6, CurrentVitality: 6, Zone: ZoneCity}
	p2.Board[ZoneCity] = append(p2.Board[ZoneCity], mago)

	if err := gs.EndTurn("p1"); err != nil {
		t.Fatalf("EndTurn failed: %v", err)
	}
	if len(p1.Board[ZoneCombat]) != 4 {
		t.Fatalf("expected 4 Citizens in P1 Combat Zone after Granjero + Reclutador triggers, got %d", len(p1.Board[ZoneCombat]))
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
	rules.MaxPlaysPerTurn = 15
	rules.FirstTurnMaxPlays = 15
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

	// 1. Protector de los débiles (7V, Escudo + Defensor):
	// Place Protector + Mensajero in P2's ZoneCombat; P1 can ONLY attack Protector because of Defensor!
	prot := &CardInstance{InstanceID: "p2_prot", OwnerID: "p2", Definition: cardByID("protector_de_los_debiles"), Zone: ZoneCombat, BaseVitality: 7, CurrentVitality: 7, ShieldActive: true}
	otherEnemy := &CardInstance{InstanceID: "p2_other", OwnerID: "p2", Definition: cardByID("mensajero"), Zone: ZoneCombat, BaseVitality: 2, CurrentVitality: 2}
	p2.Board[ZoneCombat] = []*CardInstance{prot, otherEnemy}

	validTargets := gs.ValidCombatTargetIDsForAttacker("p1", false)
	if len(validTargets) != 1 || validTargets[0] != "p2_prot" {
		t.Fatalf("expected Defensor (Protector) to be the only valid combat target in its zone, got %+v", validTargets)
	}

	// Hit Protector with Rayo vengativo (4 dmg) -> absorbs with Shield
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

	// 2. Asesino (1V, Espía): deployed to opponent's ZoneCombat at index 0, destroys the Citizen to its right (Protector!)
	asesino := &CardInstance{InstanceID: "p1_asesino", OwnerID: "p1", Definition: cardByID("asesino"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, asesino)
	if err := gs.PlayCard("p1", "p1_asesino", ZoneCombat); err != nil {
		t.Fatalf("Play Asesino failed: %v", err)
	}
	if len(p2.Board[ZoneCombat]) != 2 || p2.Board[ZoneCombat][0].InstanceID != "p1_asesino" {
		t.Fatalf("expected Protector to be assassinated by Asesino, got %d cards", len(p2.Board[ZoneCombat]))
	}

	// 3. Científico loco (1V): Exiles up to 2 Citizens from Discard and summons Abominación with V = sum of V!
	p1.Discard = []*CardInstance{
		{InstanceID: "disc_1", OwnerID: "p1", Definition: cardByID("caballero_galardonado"), BaseVitality: 8, CurrentVitality: 8, Zone: ZoneDiscard},
		{InstanceID: "disc_2", OwnerID: "p1", Definition: cardByID("granjero"), BaseVitality: 4, CurrentVitality: 4, Zone: ZoneDiscard},
	}
	cientifico := &CardInstance{InstanceID: "p1_cient", OwnerID: "p1", Definition: cardByID("cientifico_loco"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, cientifico)
	if err := gs.PlayCard("p1", "p1_cient", ZoneCity); err != nil {
		t.Fatalf("Play Científico loco failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "disc_1"); err != nil {
		t.Fatalf("Científico loco exile 1 failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "disc_2"); err != nil {
		t.Fatalf("Científico loco exile 2 failed: %v", err)
	}
	var abom *CardInstance
	for _, c := range p1.Board[ZoneCity] {
		if c.Definition.Name == "Abominación" {
			abom = c
			break
		}
	}
	if abom == nil || abom.CurrentVitality != 12 {
		t.Fatalf("expected Abominación with 12V (8V + 4V), got %+v", abom)
	}

	// 4. Cremadora Sospechosa (3A, Herramienta - Locación, Desgaste 1 activable):
	p1.Discard = []*CardInstance{
		{InstanceID: "disc_3", OwnerID: "p1", Definition: cardByID("reclutador_de_guerra"), BaseVitality: 6, CurrentVitality: 6, Zone: ZoneDiscard},
	}
	cremadora := &CardInstance{InstanceID: "p1_crem", OwnerID: "p1", Definition: cardByID("cremadora_sospechosa"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, cremadora)
	if err := gs.PlayCard("p1", "p1_crem", ZoneRoad); err != nil {
		t.Fatalf("Play Cremadora Sospechosa failed: %v", err)
	}
	if err := gs.ActivateCardAbility("p1", "p1_crem"); err != nil {
		t.Fatalf("Activate Cremadora Sospechosa failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "disc_3"); err != nil {
		t.Fatalf("Select discard target for Cremadora failed: %v", err)
	}
	if cremadora.CurrentVitality != 2 {
		t.Fatalf("expected Cremadora at 2A after Desgaste 1, got %dA", cremadora.CurrentVitality)
	}
	var zombieInst *CardInstance
	for _, c := range p1.Board[ZoneRoad] {
		if c.Definition.Name == "Zombie" && c.CurrentVitality == 6 {
			zombieInst = c
			break
		}
	}
	if zombieInst == nil {
		t.Fatalf("expected Cremadora Sospechosa to summon a 6V Zombie in Road")
	}

	// 5. Germinador (5V) + Mercenarios de emergencia (Evento):
	// Set P2 DevelopmentPoints = 3 (> P1's 0) so Mercenarios summons 2 Mercenarios (2V, Ataque Rápido), and test Ataque Rápido!
	p2.DevelopmentPoints = 3
	merc := &CardInstance{InstanceID: "p1_merc", OwnerID: "p1", Definition: cardByID("mercenarios_de_emergencia"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, merc)
	if err := gs.PlayCard("p1", "p1_merc", ""); err != nil {
		t.Fatalf("Play Mercenarios de emergencia failed: %v", err)
	}
	if len(p1.Board[ZoneCombat]) != 2 || !p1.Board[ZoneCombat][0].Definition.HasQuickAttack {
		t.Fatalf("expected 2 Mercenarios with QuickAttack in Combat Zone, got %d", len(p1.Board[ZoneCombat]))
	}
	// Attack P2's Mensajero (2V) with Mercenario (2V, QuickAttack) -> Mercenario takes 0 retaliation damage and survives at 2V!
	mercToken := p1.Board[ZoneCombat][0]
	if err := gs.AttackCitizen("p1", mercToken.InstanceID, "p2_other"); err != nil {
		t.Fatalf("Mercenario QuickAttack failed: %v", err)
	}
	if mercToken.CurrentVitality != 2 {
		t.Fatalf("expected Mercenario with Ataque Rápido to take 0 retaliation damage and stay at 2V, got %dV", mercToken.CurrentVitality)
	}

	// 6. Espidi (3V, Comandante, EffectCycleHand): Player chooses which cards from hand to discard!
	gs.PlaysRemaining = 5
	p1.Hand = []*CardInstance{
		{InstanceID: "p1_espidi", OwnerID: "p1", Definition: cardByID("espidi"), Zone: ZoneHand},
		{InstanceID: "h_keep", OwnerID: "p1", Definition: cardByID("caballero_galardonado"), Zone: ZoneHand},
		{InstanceID: "h_disc1", OwnerID: "p1", Definition: cardByID("mensajero"), Zone: ZoneHand},
		{InstanceID: "h_disc2", OwnerID: "p1", Definition: cardByID("granjero"), Zone: ZoneHand},
	}
	if err := gs.PlayCard("p1", "p1_espidi", ZoneRoad); err != nil {
		t.Fatalf("Play Espidi failed: %v", err)
	}
	if gs.Phase != PhaseAwaitingInput || gs.PendingPrompt == nil || !gs.PendingPrompt.MultiSelect {
		t.Fatalf("expected PhaseAwaitingInput with MultiSelect=true for Espidi, got phase=%s prompt=%+v", gs.Phase, gs.PendingPrompt)
	}
	// Player chooses to discard h_disc1 and h_disc2 while keeping h_keep
	if err := gs.SubmitPromptTargets("p1", "", []string{"h_disc1", "h_disc2"}); err != nil {
		t.Fatalf("SubmitPromptTargets for Espidi failed: %v", err)
	}
	if gs.Phase != PhaseMain {
		t.Fatalf("expected PhaseMain after resolving Espidi prompt, got %s", gs.Phase)
	}
	if len(p1.Hand) != 3 {
		t.Fatalf("expected 3 cards in hand (1 kept + 2 drawn), got %d", len(p1.Hand))
	}
	if p1.Hand[0].InstanceID != "h_keep" {
		t.Fatalf("expected h_keep to remain in hand, got %s", p1.Hand[0].InstanceID)
	}
}

func TestVictoryAtFiveDevelopmentPointsEveryTwoTurns(t *testing.T) {
	rules := DefaultRulesConfig()
	cab := cardByID("caballero_galardonado")

	gs := NewGameState("g6", "Victory Test", rules)
	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p1.DevelopmentPoints = 4
	_ = gs.PlayCard("p1", p1.Hand[0].InstanceID, ZoneCity)

	// Turn 1 ends (P1): since PointsEveryTwoTurns is true, point is awarded at the end of Turn 2!
	if err := gs.EndTurn("p1"); err != nil {
		t.Fatalf("EndTurn T1 failed: %v", err)
	}
	if gs.Phase == PhaseGameOver {
		t.Fatalf("did not expect GameOver at end of Turn 1 when PointsEveryTwoTurns=true")
	}

	// Turn 2 ends (P2): Round 1 finishes -> P1 has 1 Citizen vs 0 -> reaches 5 Development Points and wins!
	if err := gs.EndTurn("p2"); err != nil {
		t.Fatalf("EndTurn T2 failed: %v", err)
	}
	if gs.Phase != PhaseGameOver || gs.WinnerID != "p1" {
		t.Fatalf("expected GAME_OVER with WinnerID=p1 at 5 Development Points after Turn 2, got phase=%s winner=%s", gs.Phase, gs.WinnerID)
	}
}

func TestAIVsAISimulationParallel(t *testing.T) {
	decks := DefaultDecks()
	if len(decks) < 2 {
		t.Fatalf("expected at least 2 default decks")
	}

	report, err := RunAIVsAISimulation(SimulationRequest{
		DeckAName:    decks[0].Name,
		DeckACards:   decks[0].Cards,
		DeckBName:    decks[1].Name,
		DeckBCards:   decks[1].Cards,
		NumGames:     20,
		Difficulty:   AIDifficultyMedium,
		StartingMode: SimStartAlternate,
		Rules:        DefaultRulesConfig(),
	})
	if err != nil {
		t.Fatalf("RunAIVsAISimulation failed: %v", err)
	}
	if report.TotalGames != 20 {
		t.Fatalf("expected 20 simulated games, got %d", report.TotalGames)
	}
	if report.DeckA.Wins+report.DeckB.Wins+report.Draws != 20 {
		t.Fatalf("expected wins + draws to equal 20, got %d + %d + %d", report.DeckA.Wins, report.DeckB.Wins, report.Draws)
	}
	if report.MostUsedCard == nil || report.LeastUsedCard == nil {
		t.Fatalf("expected MostUsedCard and LeastUsedCard to be populated")
	}
	if len(report.CardMetrics) == 0 {
		t.Fatalf("expected CardMetrics to be populated")
	}
}

func TestQoLCitizenArmorAndActiveEventAndConditionalAbilities(t *testing.T) {
	rules := DefaultRulesConfig()
	cab := cardByID("caballero_galardonado")

	gs := NewGameState("g_qol", "QoL Test", rules)
	_ = gs.AddPlayer("p1", "Alice", makeUniformDeck(cab, 15))
	_ = gs.AddPlayer("p2", "Bob", makeUniformDeck(cab, 15))
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p2 := gs.Players[1]
	gs.PlaysRemaining = 5

	// 1. Citizen with Vitality (3V) and Armor (2A)
	armoredCitizen := CardDefinition{
		ID:       "custom_armored",
		Name:     "Paladín Blindado",
		Type:     CardTypeCitizen,
		Subtype:  "Soldado",
		Planet:   "General / Bastión",
		Vitality: 3,
		Armor:    2,
	}
	p2.Board[ZoneCombat] = []*CardInstance{
		{
			InstanceID:      "p2_armored",
			OwnerID:         "p2",
			Definition:      armoredCitizen,
			BaseVitality:    3,
			CurrentVitality: 3,
			BaseArmor:       2,
			CurrentArmor:    2,
			Zone:            ZoneCombat,
		},
	}

	// Play an Event with target selection (3 damage to an enemy Citizen)
	rayoDef := CardDefinition{
		ID:     "rayo_de_plutonio",
		Name:   "Rayo de Plutonio",
		Type:   CardTypeEvent,
		Planet: "Plutonio",
		Abilities: []Ability{
			{
				Trigger: TriggerImmediate,
				Steps: []EffectStep{
					{
						Op:     EffectDealDamage,
						Amount: 3,
						Target: TargetRule{
							Requirement: TargetReqSingleCard,
							Owner:       TargetOwnerEnemy,
							Zones:       []ZoneID{ZoneCity, ZoneRoad, ZoneCombat},
							CardType:    CardTypeCitizen,
						},
					},
				},
			},
		},
	}
	rayo := &CardInstance{
		InstanceID: "p1_rayo",
		OwnerID:    "p1",
		Definition: rayoDef,
		Zone:       ZoneHand,
	}
	p1.Hand = append(p1.Hand, rayo)

	if err := gs.PlayCard("p1", "p1_rayo", ""); err != nil {
		t.Fatalf("PlayCard Rayo de Plutonio failed: %v", err)
	}
	if gs.Phase != PhaseAwaitingInput {
		t.Fatalf("expected PhaseAwaitingInput while resolving Rayo de Plutonio, got %s", gs.Phase)
	}

	// Opponent's view must show ActiveEvent while Rayo de Plutonio is awaiting target selection!
	oppView, err := gs.BuildPlayerView("p2")
	if err != nil {
		t.Fatalf("BuildPlayerView(p2) failed: %v", err)
	}
	if oppView.ActiveEvent == nil || oppView.ActiveEvent.Card.ID != "rayo_de_plutonio" {
		t.Fatalf("expected Opponent view to include ActiveEvent for rayo_de_plutonio while resolving, got %+v", oppView.ActiveEvent)
	}

	// Resolve target selection on p2_armored (3V, 2A): 3 damage -> 2 absorbed by Armor (0A left), 1 damage to Vitality (2V left)
	if err := gs.SubmitPromptTarget("p1", "p2_armored"); err != nil {
		t.Fatalf("SubmitPromptTarget failed: %v", err)
	}
	if gs.ActiveEvent != nil {
		t.Fatalf("expected ActiveEvent to be cleared after Event finishes resolving, got %+v", gs.ActiveEvent)
	}
	if p2.Board[ZoneCombat][0].CurrentArmor != 0 || p2.Board[ZoneCombat][0].CurrentVitality != 2 {
		t.Fatalf("expected Paladín Blindado to have 0A and 2V after taking 3 damage, got %dA and %dV",
			p2.Board[ZoneCombat][0].CurrentArmor, p2.Board[ZoneCombat][0].CurrentVitality)
	}
}

func TestRuleChangesLeaderPositioningDeferredConditionsAndManualTargets(t *testing.T) {
	rules := DefaultRulesConfig()
	rules.MaxPlaysPerTurn = 15
	rules.FirstTurnMaxPlays = 15

	cab := cardByID("caballero_galardonado")
	leaderDef := cardByID("general_brazo_de_canon")

	deckP1 := makeUniformDeck(cab, 14)
	deckP1 = append(deckP1, leaderDef)
	deckP2 := makeUniformDeck(cab, 14)
	deckP2 = append(deckP2, leaderDef)

	gs := NewGameState("g_rules9", "Nine Rules Test", rules)
	if err := gs.AddPlayer("p1", "Alice", deckP1); err != nil {
		t.Fatalf("AddPlayer p1 failed: %v", err)
	}
	if err := gs.AddPlayer("p2", "Bob", deckP2); err != nil {
		t.Fatalf("AddPlayer p2 failed: %v", err)
	}
	_ = gs.ApplyMulligan("p1", nil)
	_ = gs.ApplyMulligan("p2", nil)

	p1 := gs.Players[0]
	p2 := gs.Players[1]

	// 1 & 2. Dedicated Leader Zone & Face-down on death
	if p1.Leader == nil || p1.Leader.Zone != ZoneLeader || p1.Leader.FaceDown {
		t.Fatalf("expected P1 Leader in ZoneLeader face-up, got %+v", p1.Leader)
	}
	for _, hc := range p1.Hand {
		if hc.Definition.IsCommander {
			t.Fatalf("did not expect Commander in Hand when using dedicated ZoneLeader")
		}
	}
	leaderID := p1.Leader.InstanceID
	if err := gs.PlayCard("p1", leaderID, ZoneCity); err != nil {
		t.Fatalf("PlayCard Leader from ZoneLeader failed: %v", err)
	}
	if p1.Leader != nil {
		t.Fatalf("expected p1.Leader to be nil while Leader is on board")
	}

	// Destroy the Leader on the board -> returns to ZoneLeader face-down, NOT Discard!
	gs.destroyBoardCard(p1, leaderID)
	if p1.Leader == nil || !p1.Leader.FaceDown || p1.Leader.Zone != ZoneLeader {
		t.Fatalf("expected destroyed Leader to return to ZoneLeader with FaceDown=true, got %+v", p1.Leader)
	}
	for _, dc := range p1.Discard {
		if dc.InstanceID == leaderID {
			t.Fatalf("destroyed Leader must not go to Discard pile")
		}
	}
	if err := gs.PlayCard("p1", leaderID, ZoneCity); err == nil {
		t.Fatalf("expected error when attempting to replay a face-down Leader")
	}

	// 3. Vitality buff on board resets to base V when sent to Discard (unless ModifyBaseVitality is true)
	unit := &CardInstance{
		InstanceID:      "p1_buffed",
		OwnerID:         "p1",
		Definition:      cab, // 8V base
		BaseVitality:    8,
		CurrentVitality: 8,
		Zone:            ZoneCity,
	}
	p1.Board[ZoneCity] = []*CardInstance{unit}
	gs.executeEffectStepWithTarget(QueuedEffect{
		ControllerID:   "p1",
		SourceCardID:   "p1_buffed",
		SourceCardName: "Buff Test",
		Step: EffectStep{
			Op:     EffectModifyStat,
			Amount: 5,
			Target: TargetRule{Requirement: TargetReqSelfCard},
		},
	}, "")
	if unit.CurrentVitality != 13 || unit.BaseVitality != 8 {
		t.Fatalf("expected buffed unit on board to have 13 CurrentVitality and 8 BaseVitality, got %d/%d", unit.CurrentVitality, unit.BaseVitality)
	}
	gs.destroyBoardCard(p1, "p1_buffed")
	if unit.CurrentVitality != 8 || unit.BaseVitality != 8 {
		t.Fatalf("expected unit in Discard to reset to 8V base, got %d/%d", unit.CurrentVitality, unit.BaseVitality)
	}

	// 6. Exact row placement (targetIndex) when playing a card:
	// Place two units in P1's ZoneRoad, then play a third card at targetIndex=1 (between them)
	cLeft := &CardInstance{InstanceID: "r_left", OwnerID: "p1", Definition: cab, BaseVitality: 8, CurrentVitality: 8, Zone: ZoneRoad}
	cRight := &CardInstance{InstanceID: "r_right", OwnerID: "p1", Definition: cab, BaseVitality: 8, CurrentVitality: 8, Zone: ZoneRoad}
	p1.Board[ZoneRoad] = []*CardInstance{cLeft, cRight}
	cMid := &CardInstance{InstanceID: "r_mid", OwnerID: "p1", Definition: cardByID("granjero"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, cMid)
	if err := gs.PlayCard("p1", "r_mid", ZoneRoad, 1); err != nil {
		t.Fatalf("PlayCard with targetIndex=1 failed: %v", err)
	}
	if len(p1.Board[ZoneRoad]) != 3 || p1.Board[ZoneRoad][1].InstanceID != "r_mid" {
		t.Fatalf("expected r_mid at index 1 in ZoneRoad, got %+v", p1.Board[ZoneRoad])
	}

	// 7. "Cualquier objetivo" (Rayo vengativo) can target a Tool as well as a Citizen
	enemyTool := &CardInstance{
		InstanceID:      "p2_tool",
		OwnerID:         "p2",
		Definition:      cardByID("cementerio_infectado"),
		BaseVitality:    5,
		CurrentVitality: 5,
		BaseArmor:       5,
		CurrentArmor:    5,
		Zone:            ZoneRoad,
	}
	p2.Board[ZoneRoad] = []*CardInstance{enemyTool}
	rayo := &CardInstance{InstanceID: "p1_rayo_tool", OwnerID: "p1", Definition: cardByID("rayo_vengativo"), Zone: ZoneHand}
	p1.Hand = append(p1.Hand, rayo)
	if err := gs.PlayCard("p1", "p1_rayo_tool", ""); err != nil {
		t.Fatalf("Play Rayo vengativo failed: %v", err)
	}
	if err := gs.SubmitPromptTarget("p1", "p2_tool"); err != nil {
		t.Fatalf("expected Rayo vengativo ('cualquier objetivo') to allow targeting enemy Tool p2_tool: %v", err)
	}
	if enemyTool.CurrentVitality != 1 || enemyTool.CurrentArmor != 1 {
		t.Fatalf("expected Cementerio infectado to be at 1A/1V after 4 damage, got %dV/%dA", enemyTool.CurrentVitality, enemyTool.CurrentArmor)
	}

	// 9. "Jugá una carta de tu mazo" (Constructor de cementerios) lets player pick the Location from Deck AND the board row
	locCard := &CardInstance{
		InstanceID: "deck_loc_1",
		OwnerID:    "p1",
		Definition: cardByID("cementerio_infectado"),
		Zone:       ZoneDeck,
	}
	p1.Deck = append([]*CardInstance{locCard}, p1.Deck...)
	constructor := &CardInstance{
		InstanceID: "p1_constructor",
		OwnerID:    "p1",
		Definition: cardByID("constructor_de_cementerios"),
		Zone:       ZoneHand,
	}
	p1.Hand = append(p1.Hand, constructor)
	if err := gs.PlayCard("p1", "p1_constructor", ZoneCity); err != nil {
		t.Fatalf("Play Constructor de cementerios failed: %v", err)
	}
	if gs.Phase != PhaseAwaitingInput || gs.PendingPrompt == nil || gs.PendingPrompt.PromptType != "cards" {
		t.Fatalf("expected card selection prompt for Constructor de cementerios, got %+v", gs.PendingPrompt)
	}
	if err := gs.SubmitPromptTarget("p1", "deck_loc_1"); err != nil {
		t.Fatalf("SubmitPromptTarget deck_loc_1 failed: %v", err)
	}
	if gs.Phase != PhaseAwaitingInput || gs.PendingPrompt == nil || gs.PendingPrompt.PromptType != "zone" {
		t.Fatalf("expected zone selection prompt after picking Location from deck, got phase=%s prompt=%+v", gs.Phase, gs.PendingPrompt)
	}
	if err := gs.SubmitPromptTarget("p1", string(ZoneCity), 0); err != nil {
		t.Fatalf("SubmitPromptTarget ZoneCity for Location failed: %v", err)
	}
	if len(p1.Board[ZoneCity]) < 1 || p1.Board[ZoneCity][0].InstanceID != "deck_loc_1" {
		t.Fatalf("expected deck_loc_1 to be placed at index 0 of ZoneCity, got %+v", p1.Board[ZoneCity])
	}

	// 4 & 5. Manual discard selection for Demoledor de basura + Left-to-Right Deferred Conditional Evaluation!
	// Place a start-of-turn Demoledor de basura at index 0 (left) and a start-of-turn conditional card at index 1 (right)
	// that checks ConditionCardLeftDiscardThisTurn.
	// Before Turn Start, CardsLeftDiscardThisTurn is 0. When Demoledor resolves first (left), it mills 3 chosen cards from Discard,
	// setting CardsLeftDiscardThisTurn = 3. Then the conditional ability on the right evaluates its condition and triggers!
	condStartCardDef := CardDefinition{
		ID:       "cond_watcher",
		Name:     "Vigía del Cementerio",
		Type:     CardTypeCitizen,
		Vitality: 3,
		Abilities: []Ability{
			{
				Trigger:                          TriggerTurnStart,
				ConditionCardLeftDiscardThisTurn: true,
				Steps: []EffectStep{
					{
						Op:     EffectDrawCards,
						Amount: 1,
					},
				},
			},
		},
	}
	millStartDef := CardDefinition{
		ID:       "mill_start_test",
		Name:     "Demoledor Matutino",
		Type:     CardTypeCitizen,
		Vitality: 8,
		Abilities: []Ability{
			{
				Trigger: TriggerTurnStart,
				Steps:   []EffectStep{{Op: EffectMillOrSacrifice, Amount: 3}},
			},
		},
	}
	p2.Board[ZoneCombat] = []*CardInstance{
		{
			InstanceID:      "p2_demoledor",
			OwnerID:         "p2",
			Definition:      millStartDef,
			BaseVitality:    8,
			CurrentVitality: 8,
			Zone:            ZoneCombat,
		},
		{
			InstanceID:      "p2_watcher",
			OwnerID:         "p2",
			Definition:      condStartCardDef,
			BaseVitality:    3,
			CurrentVitality: 3,
			Zone:            ZoneCombat,
		},
	}
	p2.Discard = []*CardInstance{
		{InstanceID: "p2_d1", OwnerID: "p2", Definition: cab, Zone: ZoneDiscard},
		{InstanceID: "p2_d2", OwnerID: "p2", Definition: cab, Zone: ZoneDiscard},
		{InstanceID: "p2_d3", OwnerID: "p2", Definition: cab, Zone: ZoneDiscard},
		{InstanceID: "p2_d4_keep", OwnerID: "p2", Definition: cab, Zone: ZoneDiscard},
	}
	p2HandBefore := len(p2.Hand)

	// End P1's turn -> P2's turn starts -> P2 draws 1 card for turn, then Demoledor (left) prompts P2 to choose 3 cards from Discard!
	p1.Board[ZoneCombat] = nil
	p1.Board[ZoneRoad] = nil
	if err := gs.EndTurn("p1"); err != nil {
		t.Fatalf("EndTurn p1 failed: %v", err)
	}
	if gs.Phase != PhaseAwaitingInput || gs.PendingPrompt == nil || gs.PendingPrompt.SourceCardID != "p2_demoledor" || !gs.PendingPrompt.MultiSelect {
		t.Fatalf("expected MultiSelect prompt for Demoledor de basura at start of P2 turn, got phase=%s prompt=%+v", gs.Phase, gs.PendingPrompt)
	}
	if err := gs.SubmitPromptTargets("p2", "", []string{"p2_d1", "p2_d2", "p2_d3"}); err != nil {
		t.Fatalf("SubmitPromptTargets for Demoledor failed: %v", err)
	}
	if len(p2.Discard) != 1 || p2.Discard[0].InstanceID != "p2_d4_keep" {
		t.Fatalf("expected only p2_d4_keep to remain in P2 Discard, got %+v", p2.Discard)
	}
	// p2_watcher (to the right of Demoledor) should have evaluated its ConditionCardLeftDiscardThisTurn AFTER Demoledor resolved, drawing +1 extra card!
	if len(p2.Hand) != p2HandBefore+gs.Rules.DrawPerTurn+1 {
		t.Fatalf("expected P2 hand to increase by DrawPerTurn + 1 (deferred conditional trigger), got %d -> %d", p2HandBefore, len(p2.Hand))
	}
}
