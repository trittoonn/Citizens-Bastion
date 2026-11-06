package server

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/trittoonn/Citizens-Bastion/backend/internal/game"
	"github.com/trittoonn/Citizens-Bastion/backend/internal/lobby"
)

// Server wraps the Lobby Manager, static file serving, and HTTP handler mux.
type Server struct {
	manager    *lobby.Manager
	mux        *http.ServeMux
	staticDir  string
	backendURL string
}

// NewServer creates a configured HTTP Server.
func NewServer(manager *lobby.Manager) *Server {
	return NewServerWithStatic(manager, resolveDefaultStaticDir())
}

// NewServerWithStatic creates an HTTP Server with an explicit static assets directory.
func NewServerWithStatic(manager *lobby.Manager, staticDir string) *Server {
	if manager == nil {
		manager = lobby.NewManager()
	}
	backendURL := strings.TrimSpace(os.Getenv("BACKEND_URL"))
	if backendURL == "" {
		backendURL = strings.TrimSpace(os.Getenv("API_BASE_URL"))
	}

	s := &Server{
		manager:    manager,
		mux:        http.NewServeMux(),
		staticDir:  staticDir,
		backendURL: backendURL,
	}
	s.registerRoutes()
	return s
}

func resolveDefaultStaticDir() string {
	if envDir := strings.TrimSpace(os.Getenv("STATIC_DIR")); envDir != "" {
		return envDir
	}
	candidates := []string{
		"./static",
		"./backend/static",
		"../frontend/dist",
		"./frontend/dist",
	}
	for _, c := range candidates {
		if info, err := os.Stat(filepath.Join(c, "index.html")); err == nil && !info.IsDir() {
			return c
		}
	}
	return "./static"
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Ultra-permissive CORS configuration so cross-origin static deployments never fail
	origin := r.Header.Get("Origin")
	if origin != "" {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Vary", "Origin")
	} else {
		w.Header().Set("Access-Control-Allow-Origin", "*")
	}

	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD")

	reqHeaders := r.Header.Get("Access-Control-Request-Headers")
	if reqHeaders != "" {
		w.Header().Set("Access-Control-Allow-Headers", reqHeaders)
	} else {
		w.Header().Set("Access-Control-Allow-Headers", "*")
	}

	w.Header().Set("Access-Control-Expose-Headers", "*")
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Max-Age", "86400")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}

	s.mux.ServeHTTP(w, r)
}

func (s *Server) registerRoutes() {
	s.mux.HandleFunc("/api/health", s.handleHealth)
	s.mux.HandleFunc("/api/config", s.handleConfig)
	s.mux.HandleFunc("/config.js", s.handleConfigJS)
	s.mux.HandleFunc("/api/cards/defaults", s.handleDefaults)
	s.mux.HandleFunc("/api/lobbies", s.handleLobbies)
	s.mux.HandleFunc("/api/lobbies/", s.handleLobbyByID)
	s.mux.HandleFunc("/", s.handleStaticOrSPA)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status":     "ok",
		"backendUrl": s.backendURL,
		"staticDir":  s.staticDir,
	})
}

func (s *Server) handleConfig(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{
		"backendUrl": s.backendURL,
	})
}

// handleConfigJS serves a small script setting window.__CB_CONFIG__ so a static bundle
// served by the Go server can read runtime environment variables like BACKEND_URL.
func (s *Server) handleConfigJS(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	w.Header().Set("Cache-Control", "no-store")
	cfgJSON, _ := json.Marshal(map[string]string{
		"BACKEND_URL": s.backendURL,
	})
	_, _ = fmt.Fprintf(w, "window.__CB_CONFIG__ = %s;\n", string(cfgJSON))
}

func (s *Server) handleStaticOrSPA(w http.ResponseWriter, r *http.Request) {
	if strings.HasPrefix(r.URL.Path, "/api/") {
		writeError(w, http.StatusNotFound, "endpoint API no encontrado")
		return
	}

	indexFile := filepath.Join(s.staticDir, "index.html")
	if _, err := os.Stat(indexFile); err != nil {
		// No static frontend build present; return helpful API status on root
		if r.URL.Path == "/" {
			writeJSON(w, http.StatusOK, map[string]string{
				"service": "Citizens' Bastion Backend API",
				"status":  "running",
				"hint":    "Build frontend with 'make build' to serve the web UI here, or connect from an external frontend via CORS.",
			})
			return
		}
		http.NotFound(w, r)
		return
	}

	cleanPath := filepath.Clean(strings.TrimPrefix(r.URL.Path, "/"))
	if cleanPath == "." || cleanPath == "" {
		http.ServeFile(w, r, indexFile)
		return
	}

	targetPath := filepath.Join(s.staticDir, cleanPath)
	// Prevent directory traversal outside staticDir
	absStatic, err1 := filepath.Abs(s.staticDir)
	absTarget, err2 := filepath.Abs(targetPath)
	if err1 == nil && err2 == nil && strings.HasPrefix(absTarget, absStatic) {
		if info, err := os.Stat(absTarget); err == nil && !info.IsDir() {
			http.ServeFile(w, r, absTarget)
			return
		}
	}

	// SPA Fallback: serve index.html for client-side routes
	http.ServeFile(w, r, indexFile)
}

func (s *Server) handleDefaults(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "método no permitido")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"cards":        game.DefaultCards(),
		"decks":        game.DefaultDecks(),
		"defaultRules": game.DefaultRulesConfig(),
	})
}

type createLobbyRequest struct {
	GameName     string                `json:"gameName"`
	PlayerID     string                `json:"playerId"`
	PlayerName   string                `json:"playerName"`
	Deck         []game.CardDefinition `json:"deck"`
	AIDeck       []game.CardDefinition `json:"aiDeck,omitempty"`
	Rules        game.GameRulesConfig  `json:"rules"`
	VsAI         bool                  `json:"vsAi"`
	AIDifficulty game.AIDifficulty     `json:"aiDifficulty"`
}

func (s *Server) handleLobbies(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		writeJSON(w, http.StatusOK, map[string]any{
			"lobbies": s.manager.ListLobbies(),
		})
	case http.MethodPost:
		var req createLobbyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "JSON inválido: "+err.Error())
			return
		}
		if len(req.Deck) == 0 {
			req.Deck = game.DefaultDecks()[0].Cards
		}
		diff := req.AIDifficulty
		if req.VsAI && diff == "" {
			diff = game.AIDifficultyMedium
		}
		summary, view, err := s.manager.CreateLobbyWithAIDeck(req.GameName, req.PlayerID, req.PlayerName, req.Deck, req.Rules, diff, req.AIDeck)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusCreated, map[string]any{
			"lobby": summary,
			"view":  view,
		})
	default:
		writeError(w, http.StatusMethodNotAllowed, "método no permitido")
	}
}

type joinLobbyRequest struct {
	PlayerID   string                `json:"playerId"`
	PlayerName string                `json:"playerName"`
	Deck       []game.CardDefinition `json:"deck"`
}

func (s *Server) handleLobbyByID(w http.ResponseWriter, r *http.Request) {
	// Path format: /api/lobbies/{id}/{subroute}
	trimmed := strings.TrimPrefix(r.URL.Path, "/api/lobbies/")
	parts := strings.Split(trimmed, "/")
	if len(parts) < 2 || parts[0] == "" {
		writeError(w, http.StatusNotFound, "ruta no encontrada")
		return
	}
	lobbyID := parts[0]
	subroute := parts[1]

	switch subroute {
	case "join":
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "método no permitido")
			return
		}
		var req joinLobbyRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "JSON inválido: "+err.Error())
			return
		}
		if len(req.Deck) == 0 {
			req.Deck = game.DefaultDecks()[0].Cards
		}
		view, err := s.manager.JoinLobby(lobbyID, req.PlayerID, req.PlayerName, req.Deck)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"view": view})

	case "state":
		if r.Method != http.MethodGet {
			writeError(w, http.StatusMethodNotAllowed, "método no permitido")
			return
		}
		playerID := r.URL.Query().Get("playerId")
		if playerID == "" {
			writeError(w, http.StatusBadRequest, "playerId es obligatorio")
			return
		}
		view, err := s.manager.GetPlayerView(lobbyID, playerID)
		if err != nil {
			writeError(w, http.StatusNotFound, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"view": view})

	case "action":
		if r.Method != http.MethodPost {
			writeError(w, http.StatusMethodNotAllowed, "método no permitido")
			return
		}
		var req lobby.ActionRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			writeError(w, http.StatusBadRequest, "JSON inválido: "+err.Error())
			return
		}
		view, err := s.manager.SubmitAction(lobbyID, req)
		if err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"view": view})

	default:
		writeError(w, http.StatusNotFound, "subruta desconocida")
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
