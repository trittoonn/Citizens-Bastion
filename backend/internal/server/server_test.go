package server

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/trittoonn/Citizens-Bastion/backend/internal/game"
	"github.com/trittoonn/Citizens-Bastion/backend/internal/lobby"
)

func TestHTTPFullMatchAndCustomCardFlow(t *testing.T) {
	srv := NewServer(lobby.NewManager())
	ts := httptest.NewServer(srv)
	defer ts.Close()

	// 1. Fetch defaults
	resp, err := http.Get(ts.URL + "/api/cards/defaults")
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("GET /api/cards/defaults failed: %v status=%d", err, resp.StatusCode)
	}
	resp.Body.Close()

	// 2. Create a custom card (as if created in localStorage) and create a lobby
	customCard := game.CardDefinition{
		ID:          "custom_campeon_solar",
		Name:        "Campeón Solar",
		Type:        game.CardTypeCitizen,
		Vitality:    7,
		Description: "Al Jugar: Levanta 1 carta. Al comienzo del turno: Gana +2V.",
		IsCustom:    true,
		Abilities: []game.Ability{
			{
				Trigger: game.TriggerOnPlay,
				Steps: []game.EffectStep{
					{Op: game.EffectDrawCards, Amount: 1},
				},
			},
			{
				Trigger: game.TriggerTurnStart,
				Steps: []game.EffectStep{
					{
						Op:     game.EffectModifyStat,
						Amount: 2,
						Target: game.TargetRule{Requirement: game.TargetReqSelfCard},
					},
				},
			},
		},
	}

	customDeck := make([]game.CardDefinition, 10)
	for i := 0; i < 10; i++ {
		customDeck[i] = customCard
	}

	rules := game.DefaultRulesConfig()
	rules.PointsToWin = 1 // 1 point to win for fast HTTP end-to-end test

	createBody, _ := json.Marshal(map[string]any{
		"gameName":   "Partida de Prueba HTTP",
		"playerId":   "player_1",
		"playerName": "Triton",
		"deck":       customDeck,
		"rules":      rules,
	})
	resp, err = http.Post(ts.URL+"/api/lobbies", "application/json", bytes.NewReader(createBody))
	if err != nil || resp.StatusCode != http.StatusCreated {
		t.Fatalf("POST /api/lobbies failed: %v status=%d", err, resp.StatusCode)
	}
	var createRes struct {
		Lobby lobby.LobbySummary  `json:"lobby"`
		View  game.PlayerGameView `json:"view"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&createRes)
	resp.Body.Close()

	lobbyID := createRes.Lobby.ID
	if lobbyID == "" {
		t.Fatalf("expected non-empty lobbyID")
	}

	// 3. Player 2 joins lobby
	joinBody, _ := json.Marshal(map[string]any{
		"playerId":   "player_2",
		"playerName": "Rival",
		"deck":       game.DefaultDecks()[0].Cards,
	})
	resp, err = http.Post(ts.URL+"/api/lobbies/"+lobbyID+"/join", "application/json", bytes.NewReader(joinBody))
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("POST join failed: %v status=%d", err, resp.StatusCode)
	}
	resp.Body.Close()

	// 4. Both players submit Mulligan
	postAction := func(req lobby.ActionRequest) game.PlayerGameView {
		b, _ := json.Marshal(req)
		r, err := http.Post(ts.URL+"/api/lobbies/"+lobbyID+"/action", "application/json", bytes.NewReader(b))
		if err != nil {
			t.Fatalf("postAction err: %v", err)
		}
		defer r.Body.Close()
		if r.StatusCode != http.StatusOK {
			var errMap map[string]string
			_ = json.NewDecoder(r.Body).Decode(&errMap)
			t.Fatalf("postAction status=%d error=%s", r.StatusCode, errMap["error"])
		}
		var out struct {
			View game.PlayerGameView `json:"view"`
		}
		_ = json.NewDecoder(r.Body).Decode(&out)
		return out.View
	}

	_ = postAction(lobby.ActionRequest{PlayerID: "player_1", Type: lobby.ActionMulligan})
	_ = postAction(lobby.ActionRequest{PlayerID: "player_2", Type: lobby.ActionMulligan})

	// 5. Poll Player 1 state
	resp, err = http.Get(ts.URL + "/api/lobbies/" + lobbyID + "/state?playerId=player_1")
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("GET state failed: %v", err)
	}
	var p1State struct {
		View game.PlayerGameView `json:"view"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&p1State)
	resp.Body.Close()

	if len(p1State.View.Opponent.Hand) != 0 || p1State.View.Opponent.HandCount != 4 {
		t.Fatalf("expected opponent hand cards to be masked while HandCount == 4")
	}

	// 6. Player 1 plays custom card "Campeón Solar" in La Ciudad and ends turn to win (PointsToWin = 1)
	cardToPlay := p1State.View.You.Hand[0].InstanceID
	viewAfterPlay := postAction(lobby.ActionRequest{
		PlayerID:       "player_1",
		Type:           lobby.ActionPlayCard,
		CardInstanceID: cardToPlay,
		TargetZone:     game.ZoneCity,
	})
	if len(viewAfterPlay.You.Board[game.ZoneCity]) != 1 {
		t.Fatalf("expected 1 Citizen in City after playing Campeón Solar")
	}

	viewAfterEnd := postAction(lobby.ActionRequest{
		PlayerID: "player_1",
		Type:     lobby.ActionEndTurn,
	})
	if viewAfterEnd.Phase != game.PhaseGameOver || viewAfterEnd.WinnerID != "player_1" {
		t.Fatalf("expected GAME_OVER with winner player_1, got phase=%s winner=%s", viewAfterEnd.Phase, viewAfterEnd.WinnerID)
	}
}

func TestStaticServingSPAAndPermissiveCORS(t *testing.T) {
	tmpDir := t.TempDir()
	indexHTML := "<!doctype html><html><body>Citizens Bastion Static Test</body></html>"
	if err := os.WriteFile(filepath.Join(tmpDir, "index.html"), []byte(indexHTML), 0644); err != nil {
		t.Fatalf("write index.html: %v", err)
	}

	t.Setenv("BACKEND_URL", "https://citizens-bastion-api.onrender.com")
	srv := NewServerWithStatic(lobby.NewManager(), tmpDir)
	ts := httptest.NewServer(srv)
	defer ts.Close()

	// 1. Test OPTIONS CORS preflight from external domain with custom headers
	req, _ := http.NewRequest(http.MethodOptions, ts.URL+"/api/lobbies", nil)
	req.Header.Set("Origin", "https://my-frontend-static.onrender.com")
	req.Header.Set("Access-Control-Request-Headers", "X-Custom-Token, Content-Type")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("OPTIONS request failed: %v", err)
	}
	resp.Body.Close()

	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("expected 204 NoContent for OPTIONS, got %d", resp.StatusCode)
	}
	if got := resp.Header.Get("Access-Control-Allow-Origin"); got != "https://my-frontend-static.onrender.com" {
		t.Fatalf("expected echoed Origin header, got %q", got)
	}
	if got := resp.Header.Get("Access-Control-Allow-Headers"); got != "X-Custom-Token, Content-Type" {
		t.Fatalf("expected echoed Access-Control-Allow-Headers, got %q", got)
	}

	// 2. Test /config.js runtime env injection
	resp, err = http.Get(ts.URL + "/config.js")
	if err != nil || resp.StatusCode != http.StatusOK {
		t.Fatalf("GET /config.js failed: %v", err)
	}
	bodyBytes, _ := io.ReadAll(resp.Body)
	resp.Body.Close()
	if !strings.Contains(string(bodyBytes), "https://citizens-bastion-api.onrender.com") {
		t.Fatalf("expected /config.js to contain BACKEND_URL, got: %s", string(bodyBytes))
	}

	// 3. Test root "/" and SPA fallback "/decks" serving index.html
	for _, route := range []string{"/", "/decks"} {
		resp, err = http.Get(ts.URL + route)
		if err != nil || resp.StatusCode != http.StatusOK {
			t.Fatalf("GET %s failed: %v status=%d", route, err, resp.StatusCode)
		}
		b, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		if !strings.Contains(string(b), "Citizens Bastion Static Test") {
			t.Fatalf("expected index.html content on %s, got %s", route, string(b))
		}
	}
}

func TestAIMatchDifficultiesFlow(t *testing.T) {
	srv := NewServer(lobby.NewManager())
	ts := httptest.NewServer(srv)
	defer ts.Close()

	for _, diff := range []game.AIDifficulty{game.AIDifficultyEasy, game.AIDifficultyMedium, game.AIDifficultyHard} {
		createBody, _ := json.Marshal(map[string]any{
			"gameName":     "Duelo contra IA " + string(diff),
			"playerId":     "human_1",
			"playerName":   "Comandante",
			"vsAi":         true,
			"aiDifficulty": diff,
		})
		resp, err := http.Post(ts.URL+"/api/lobbies", "application/json", bytes.NewReader(createBody))
		if err != nil || resp.StatusCode != http.StatusCreated {
			t.Fatalf("POST /api/lobbies vsAI (%s) failed: %v status=%d", diff, err, resp.StatusCode)
		}
		var createRes struct {
			Lobby lobby.LobbySummary  `json:"lobby"`
			View  game.PlayerGameView `json:"view"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&createRes)
		resp.Body.Close()

		if !createRes.Lobby.VsAI || createRes.Lobby.AIDifficulty != diff {
			t.Fatalf("expected lobby VsAI=true and difficulty=%s, got %+v", diff, createRes.Lobby)
		}
		// Since AI joined and completed its Mulligan immediately, match is already in MULLIGAN waiting only for human_1
		if createRes.View.Phase != game.PhaseMulligan {
			t.Fatalf("expected MULLIGAN phase right after creating AI match, got %s", createRes.View.Phase)
		}

		// Human submits Mulligan -> Turn 1 (human) starts
		mullBody, _ := json.Marshal(lobby.ActionRequest{
			PlayerID: "human_1",
			Type:     lobby.ActionMulligan,
		})
		resp, err = http.Post(ts.URL+"/api/lobbies/"+createRes.Lobby.ID+"/action", "application/json", bytes.NewReader(mullBody))
		if err != nil || resp.StatusCode != http.StatusOK {
			t.Fatalf("human mulligan failed: %v", err)
		}
		var afterMull struct {
			View game.PlayerGameView `json:"view"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&afterMull)
		resp.Body.Close()

		if afterMull.View.Phase != game.PhaseMain || afterMull.View.TurnNumber != 1 {
			t.Fatalf("expected Turn 1 MAIN phase, got turn=%d phase=%s", afterMull.View.TurnNumber, afterMull.View.Phase)
		}

		// Human ends Turn 1 -> AI automatically plays Turn 2 and ends turn -> Now Turn 3 (human's turn again!)
		endBody, _ := json.Marshal(lobby.ActionRequest{
			PlayerID: "human_1",
			Type:     lobby.ActionEndTurn,
		})
		resp, err = http.Post(ts.URL+"/api/lobbies/"+createRes.Lobby.ID+"/action", "application/json", bytes.NewReader(endBody))
		if err != nil || resp.StatusCode != http.StatusOK {
			t.Fatalf("human end turn failed: %v", err)
		}
		var afterEnd struct {
			View game.PlayerGameView `json:"view"`
		}
		_ = json.NewDecoder(resp.Body).Decode(&afterEnd)
		resp.Body.Close()

		if afterEnd.View.TurnNumber != 3 || !afterEnd.View.IsYourTurn {
			t.Fatalf("expected AI (%s) to complete Turn 2 and advance to Turn 3 for human, got turn=%d isYourTurn=%v phase=%s",
				diff, afterEnd.View.TurnNumber, afterEnd.View.IsYourTurn, afterEnd.View.Phase)
		}
	}
}
