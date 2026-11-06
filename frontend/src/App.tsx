import React, { useEffect, useState } from 'react';
import { BookOpen, Castle, Layers, Swords, X } from 'lucide-react';
import { PlayerGameView } from './types/game';
import { getPlayerSession, savePlayerSession } from './services/storage';
import { pollGameState } from './services/api';
import { LobbyView } from './components/LobbyView';
import { DeckBuilderView } from './components/DeckBuilderView';
import { GameBoardView } from './components/GameBoardView';

type ActiveTab = 'lobby' | 'decks' | 'game';

function parseGameHash(hash: string): { lobbyId?: string; playerId?: string } {
  const cleaned = hash.replace(/^#\/?/, '');
  if (!cleaned) return {};
  const params = new URLSearchParams(cleaned);
  const lobbyId = params.get('game') || params.get('lobby') || undefined;
  const playerId = params.get('player') || undefined;
  return { lobbyId, playerId };
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('lobby');
  const [activeGame, setActiveGame] = useState<{
    lobbyId: string;
    playerId: string;
    view: PlayerGameView;
  } | null>(null);
  const [reconnecting, setReconnecting] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  // Restore match from URL hash (#game=lobby_1&player=p_xxxx) on initial load or hashchange
  useEffect(() => {
    const syncFromHash = async () => {
      const { lobbyId, playerId } = parseGameHash(window.location.hash);
      if (!lobbyId || !playerId) {
        return;
      }

      // Update local tab session with the playerId and lobbyId from the URL hash
      const currentSession = getPlayerSession();
      savePlayerSession({
        ...currentSession,
        playerId,
        activeLobbyId: lobbyId,
      });

      setReconnecting(true);
      try {
        const view = await pollGameState(lobbyId, playerId);
        setActiveGame({ lobbyId, playerId, view });
        setActiveTab('game');
      } catch {
        // If lobby no longer exists on server (e.g. server restarted), clear hash gracefully
        window.history.replaceState(null, '', window.location.pathname);
        setActiveGame(null);
        setActiveTab('lobby');
      } finally {
        setReconnecting(false);
      }
    };

    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const handleEnterGame = (lobbyId: string, initialView: PlayerGameView) => {
    const currentSession = getPlayerSession();
    const pid = currentSession.playerId;
    savePlayerSession({ ...currentSession, activeLobbyId: lobbyId });

    // Persist both game ID and player ID in the URL hash so page refresh keeps the player in the match
    const nextHash = `#game=${encodeURIComponent(lobbyId)}&player=${encodeURIComponent(pid)}`;
    if (window.location.hash !== nextHash) {
      window.history.pushState(null, '', nextHash);
    }

    setActiveGame({ lobbyId, playerId: pid, view: initialView });
    setActiveTab('game');
  };

  const handleExitGame = () => {
    const s = getPlayerSession();
    savePlayerSession({ ...s, activeLobbyId: undefined });
    window.history.pushState(null, '', window.location.pathname);
    setActiveGame(null);
    setActiveTab('lobby');
  };

  // When inside an active match, render the zero-scroll 100vh Hearthstone tabletop directly
  if (activeTab === 'game' && activeGame) {
    return (
      <GameBoardView
        lobbyId={activeGame.lobbyId}
        playerId={activeGame.playerId}
        initialView={activeGame.view}
        onExitLobby={handleExitGame}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/90 bg-slate-900/90 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div
            onClick={() => {
              if (activeGame) setActiveTab('game');
              else setActiveTab('lobby');
            }}
            className="flex items-center gap-3 cursor-pointer"
          >
            <div className="p-2 rounded-xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20">
              <Castle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-extrabold text-lg tracking-tight text-white leading-none">
                CITIZENS' BASTION
              </h1>
              <span className="text-[11px] text-amber-400 font-semibold">
                Estrategia TCG Online • Reglas 2026 v1
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('lobby')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'lobby'
                  ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Swords className="w-4 h-4" />
              Lobby Online
            </button>

            <button
              onClick={() => setActiveTab('decks')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === 'decks'
                  ? 'bg-amber-500 text-slate-950 shadow shadow-amber-500/20'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300'
              }`}
            >
              <Layers className="w-4 h-4" />
              Mazos y Crear Cartas
            </button>

            {activeGame && (
              <button
                onClick={() => setActiveTab('game')}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
              >
                Volver a la Partida
              </button>
            )}

            <button
              onClick={() => setShowRulesModal(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300"
            >
              <BookOpen className="w-4 h-4 text-amber-400" />
              Reglas
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {reconnecting ? (
          <div className="flex flex-col items-center justify-center py-24 text-amber-300 font-bold text-sm">
            Reconectando a la partida desde el hash de la URL...
          </div>
        ) : activeTab === 'lobby' ? (
          <LobbyView
            onEnterGame={handleEnterGame}
            onNavigateDeckBuilder={() => setActiveTab('decks')}
          />
        ) : (
          <DeckBuilderView />
        )}
      </main>

      {/* Official Rules Modal */}
      {showRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-lg font-extrabold text-amber-400">
                Reglamento Oficial — Reglas 2026 v1
              </h2>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200 leading-relaxed">
              <p>
                <strong className="text-amber-300">Condición de victoria:</strong> Al final del turno de cada jugador, si tiene más Ciudadanos que el oponente, recibe 1 Punto de Desarrollo. Gana el primer jugador en llegar a 10 Puntos de Desarrollo.
              </p>
              <p>
                <strong className="text-amber-300">Tipos de carta:</strong>
                <br />• <strong>Ciudadanos:</strong> Cuentan hacia tus puntos de Desarrollo. Tienen un valor de Vitalidad (V) que representa cuánto daño hacen cuando atacan y cuánto daño pueden recibir antes de ser destruidos.
                <br />• <strong>Eventos:</strong> Cartas con un efecto inmediato que luego van al Descarte.
              </p>
              <p>
                <strong className="text-amber-300">Zonas del Tablero (por jugador):</strong>
                <br />• <em>La Ciudad</em>, <em>El Camino</em> y <em>La Zona de Combate</em>.
                <br />• Podés jugar Ciudadanos en La Ciudad o El Camino. Solo podés jugar una carta directo en la Zona de Combate si tu oponente tiene una carta ahí.
                <br />• Podés mover 1 Ciudadano por turno a una zona inmediatamente adyacente (Ciudad ↔ Camino ↔ Combate) siempre que no haya sido jugado ese mismo turno.
              </p>
              <p>
                <strong className="text-amber-300">Combate:</strong> Cada Ciudadano en la Zona de Combate puede atacar una vez por turno a cualquier carta enemiga que no tenga otra carta en una zona de por medio (primero Zona de Combate; si está vacía, El Camino; si está vacío, La Ciudad).
              </p>
              <p>
                <strong className="text-amber-300">Comienzo del juego y Turnos:</strong>
                <br />• Cada jugador levanta 4 cartas y puede hacer Mulligan (poner cualquier cantidad en el fondo del mazo, levantar la misma cantidad y mezclar).
                <br />• Al comienzo de cada turno se levantan 2 cartas (salvo el Turno 1 del jugador inicial, que levanta 1).
                <br />• Cada turno se pueden realizar hasta 3 jugadas (el jugador inicial en su primer turno solo puede realizar 2 jugadas).
                <br />• Orden de activación de efectos simultáneos: de la Zona de Combate a la Ciudad y de derecha a izquierda.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
