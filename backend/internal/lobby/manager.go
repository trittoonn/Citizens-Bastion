package lobby

import (
	"fmt"
	"sort"
	"sync"
	"time"

	"github.com/trittoonn/Citizens-Bastion/backend/internal/game"
)

// LobbySummary is the lightweight metadata returned when listing lobbies.
type LobbySummary struct {
	ID           string               `json:"id"`
	GameName     string               `json:"gameName"`
	Phase        game.GamePhase       `json:"phase"`
	PlayerCount  int                  `json:"playerCount"`
	PlayerNames  []string             `json:"playerNames"`
	PlayerIDs    []string             `json:"playerIds"`
	VsAI         bool                 `json:"vsAi"`
	AIDifficulty game.AIDifficulty    `json:"aiDifficulty,omitempty"`
	Rules        game.GameRulesConfig `json:"rules"`
	CreatedAt    time.Time            `json:"createdAt"`
}

// ActionType enumerates valid player actions in a match.
type ActionType string

const (
	ActionMulligan        ActionType = "MULLIGAN"
	ActionPlayCard        ActionType = "PLAY_CARD"
	ActionMoveCitizen     ActionType = "MOVE_CITIZEN"
	ActionAttack          ActionType = "ATTACK"
	ActionActivateAbility ActionType = "ACTIVATE_ABILITY"
	ActionSelectTarget    ActionType = "SELECT_TARGET"
	ActionEndTurn         ActionType = "END_TURN"
)

// ActionRequest represents an action submitted by a player to a lobby.
type ActionRequest struct {
	PlayerID        string      `json:"playerId"`
	Type            ActionType  `json:"type"`
	CardInstanceIDs []string    `json:"cardInstanceIds,omitempty"` // Used by MULLIGAN
	CardInstanceID  string      `json:"cardInstanceId,omitempty"`  // Used by PLAY_CARD, MOVE_CITIZEN
	TargetZone      game.ZoneID `json:"targetZone,omitempty"`      // Used by PLAY_CARD, MOVE_CITIZEN
	AttackerID      string      `json:"attackerId,omitempty"`      // Used by ATTACK
	DefenderID      string      `json:"defenderId,omitempty"`      // Used by ATTACK
	TargetCardID    string      `json:"targetCardId,omitempty"`    // Used by SELECT_TARGET
}

type lobbyEntry struct {
	mu           sync.Mutex
	state        *game.GameState
	aiDifficulty game.AIDifficulty
	createdAt    time.Time
}

// Manager manages active in-memory game lobbies.
type Manager struct {
	mu      sync.RWMutex
	lobbies map[string]*lobbyEntry
	seq     int64
}

// NewManager creates an initialized in-memory Lobby Manager.
func NewManager() *Manager {
	return &Manager{
		lobbies: make(map[string]*lobbyEntry),
	}
}

// CreateLobby creates a new game lobby and joins the creator as Player 1.
// If aiDifficulty is non-empty ("easy", "medium", "hard"), an AI opponent is automatically added as Player 2.
func (m *Manager) CreateLobby(gameName, playerID, playerName string, deck []game.CardDefinition, rules game.GameRulesConfig, aiDifficulty ...game.AIDifficulty) (*LobbySummary, *game.PlayerGameView, error) {
	var diff game.AIDifficulty
	if len(aiDifficulty) > 0 {
		diff = aiDifficulty[0]
	}
	return m.CreateLobbyWithAIDeck(gameName, playerID, playerName, deck, rules, diff, nil)
}

// CreateLobbyWithAIDeck creates a new game lobby and allows specifying the exact deck the AI opponent will use.
func (m *Manager) CreateLobbyWithAIDeck(gameName, playerID, playerName string, deck []game.CardDefinition, rules game.GameRulesConfig, diff game.AIDifficulty, customAIDeck []game.CardDefinition) (*LobbySummary, *game.PlayerGameView, error) {
	if gameName == "" {
		return nil, nil, fmt.Errorf("el nombre de la partida es obligatorio")
	}
	if playerID == "" || playerName == "" {
		return nil, nil, fmt.Errorf("el identificador y nombre del jugador son obligatorios")
	}

	m.mu.Lock()
	m.seq++
	lobbyID := fmt.Sprintf("lobby_%d", m.seq)
	gs := game.NewGameState(lobbyID, gameName, rules)
	if err := gs.AddPlayer(playerID, playerName, deck); err != nil {
		m.mu.Unlock()
		return nil, nil, err
	}

	if diff != game.AIDifficultyNone {
		aiDeck := customAIDeck
		if len(aiDeck) == 0 {
			defaultDecks := game.DefaultDecks()
			aiDeck = defaultDecks[0].Cards
			if diff == game.AIDifficultyHard && len(defaultDecks) > 1 {
				aiDeck = defaultDecks[1].Cards
			}
		}
		if err := gs.AddPlayer(game.AIBotID, game.BotDisplayName(diff), aiDeck); err != nil {
			m.mu.Unlock()
			return nil, nil, err
		}
		gs.RunAITurnIfNeeded(game.AIBotID, diff)
	}

	entry := &lobbyEntry{
		state:        gs,
		aiDifficulty: diff,
		createdAt:    time.Now(),
	}
	m.lobbies[lobbyID] = entry
	m.mu.Unlock()

	entry.mu.Lock()
	defer entry.mu.Unlock()
	summary := buildSummary(entry)
	view, err := entry.state.BuildPlayerView(playerID)
	return &summary, view, err
}

// JoinLobby adds a second player (or reconnects an existing player) to a lobby.
func (m *Manager) JoinLobby(lobbyID, playerID, playerName string, deck []game.CardDefinition) (*game.PlayerGameView, error) {
	entry, err := m.getEntry(lobbyID)
	if err != nil {
		return nil, err
	}

	entry.mu.Lock()
	defer entry.mu.Unlock()

	// Check if player is already part of this lobby (reconnecting)
	if _, _, err := entry.state.GetPlayer(playerID); err == nil {
		return entry.state.BuildPlayerView(playerID)
	}

	if err := entry.state.AddPlayer(playerID, playerName, deck); err != nil {
		return nil, err
	}
	return entry.state.BuildPlayerView(playerID)
}

// ListLobbies returns all lobbies sorted newest-first.
func (m *Manager) ListLobbies() []LobbySummary {
	m.mu.RLock()
	entries := make([]*lobbyEntry, 0, len(m.lobbies))
	for _, e := range m.lobbies {
		entries = append(entries, e)
	}
	m.mu.RUnlock()

	summaries := make([]LobbySummary, 0, len(entries))
	for _, e := range entries {
		e.mu.Lock()
		summaries = append(summaries, buildSummary(e))
		e.mu.Unlock()
	}

	sort.Slice(summaries, func(i, j int) bool {
		return summaries[i].CreatedAt.After(summaries[j].CreatedAt)
	})
	return summaries
}

// GetPlayerView returns the sanitized game view for a polling player.
func (m *Manager) GetPlayerView(lobbyID, playerID string) (*game.PlayerGameView, error) {
	entry, err := m.getEntry(lobbyID)
	if err != nil {
		return nil, err
	}

	entry.mu.Lock()
	defer entry.mu.Unlock()
	return entry.state.BuildPlayerView(playerID)
}

// SubmitAction executes a player action and returns the updated PlayerGameView.
func (m *Manager) SubmitAction(lobbyID string, req ActionRequest) (*game.PlayerGameView, error) {
	entry, err := m.getEntry(lobbyID)
	if err != nil {
		return nil, err
	}

	entry.mu.Lock()
	defer entry.mu.Unlock()

	var actionErr error
	switch req.Type {
	case ActionMulligan:
		actionErr = entry.state.ApplyMulligan(req.PlayerID, req.CardInstanceIDs)
	case ActionPlayCard:
		actionErr = entry.state.PlayCard(req.PlayerID, req.CardInstanceID, req.TargetZone)
	case ActionMoveCitizen:
		actionErr = entry.state.MoveCitizen(req.PlayerID, req.CardInstanceID, req.TargetZone)
	case ActionAttack:
		actionErr = entry.state.AttackCitizen(req.PlayerID, req.AttackerID, req.DefenderID)
	case ActionActivateAbility:
		actionErr = entry.state.ActivateCardAbility(req.PlayerID, req.CardInstanceID)
	case ActionSelectTarget:
		actionErr = entry.state.SubmitPromptTarget(req.PlayerID, req.TargetCardID)
	case ActionEndTurn:
		actionErr = entry.state.EndTurn(req.PlayerID)
	default:
		actionErr = fmt.Errorf("tipo de acción desconocido: %s", req.Type)
	}

	if actionErr != nil {
		return nil, actionErr
	}

	// If playing against AI, automatically execute AI responses/turns
	if entry.aiDifficulty != game.AIDifficultyNone {
		entry.state.RunAITurnIfNeeded(game.AIBotID, entry.aiDifficulty)
	}

	return entry.state.BuildPlayerView(req.PlayerID)
}

func (m *Manager) getEntry(lobbyID string) (*lobbyEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	entry, ok := m.lobbies[lobbyID]
	if !ok {
		return nil, fmt.Errorf("sala no encontrada: %s", lobbyID)
	}
	return entry, nil
}

func buildSummary(e *lobbyEntry) LobbySummary {
	var names []string
	var ids []string
	for _, p := range e.state.Players {
		if p != nil {
			names = append(names, p.Name)
			ids = append(ids, p.ID)
		}
	}
	return LobbySummary{
		ID:           e.state.ID,
		GameName:     e.state.GameName,
		Phase:        e.state.Phase,
		PlayerCount:  len(names),
		PlayerNames:  names,
		PlayerIDs:    ids,
		VsAI:         e.aiDifficulty != game.AIDifficultyNone,
		AIDifficulty: e.aiDifficulty,
		Rules:        e.state.Rules,
		CreatedAt:    e.createdAt,
	}
}
