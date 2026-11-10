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

  // When inside an active match, render the zero-scroll 100vh War-Table directly
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
    <div className="min-h-screen flex flex-col bg-[#12100e] text-[#e7dfd3]">
      {/* Top Wrought-Iron & Bronze Navigation Header */}
      <header className="no-print border-b border-[#574c3f] bg-gradient-to-b from-[#231d19] to-[#171310] sticky top-0 z-40 shadow-[0_4px_20px_rgba(0,0,0,0.85)]">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div
            onClick={() => {
              if (activeGame) setActiveTab('game');
              else setActiveTab('lobby');
            }}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="p-2 rounded bg-gradient-to-b from-[#d8b13a] to-[#8a6d1b] text-[#14100c] border border-[#fef08a]/60 shadow-md">
              <Castle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-display font-black text-lg tracking-wider text-[#f3ead8] leading-none">
                CITIZENS' BASTION
              </h1>
              <span className="font-serif italic text-xs text-[#c59b27]">
                Crónicas de Asedio • Reglas 2026 v1
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-2.5">
            <button
              onClick={() => setActiveTab('lobby')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs ${
                activeTab === 'lobby' ? 'btn-war-gold' : 'btn-war-iron'
              }`}
            >
              <Swords className="w-4 h-4" />
              Salón de Guerra
            </button>

            <button
              onClick={() => setActiveTab('decks')}
              className={`flex items-center gap-1.5 px-4 py-2 rounded text-xs ${
                activeTab === 'decks' ? 'btn-war-gold' : 'btn-war-iron'
              }`}
            >
              <Layers className="w-4 h-4" />
              Armería y Mazos
            </button>

            {activeGame && (
              <button
                onClick={() => setActiveTab('game')}
                className="btn-war-gold px-4 py-2 rounded text-xs"
              >
                Volver al Campo
              </button>
            )}

            <button
              onClick={() => setShowRulesModal(true)}
              className="btn-war-iron flex items-center gap-1.5 px-3.5 py-2 rounded text-xs"
            >
              <BookOpen className="w-4 h-4 text-[#c59b27]" />
              Códice de Reglas
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {reconnecting ? (
          <div className="flex flex-col items-center justify-center py-24 font-display text-[#e3c158] font-bold text-sm">
            Restaurando tu lugar en la Mesa de Guerra...
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0b09]/85 backdrop-blur-sm p-4">
          <div className="bastion-panel rounded-lg max-w-2xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto border-2 border-[#c59b27]">
            <div className="flex items-center justify-between border-b border-[#574c3f] pb-3">
              <h2 className="font-display text-lg font-bold text-[#e3c158]">
                Códice Oficial — Reglas 2026 v1
              </h2>
              <button
                onClick={() => setShowRulesModal(false)}
                className="p-1 rounded text-[#a89b8c] hover:text-[#f3ead8]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 font-serif text-sm text-[#e7dfd3] leading-relaxed">
              <p>
                <strong className="font-display text-xs text-[#e3c158]">Condición de Victoria:</strong> Cada dos turnos (al cerrarse una ronda completa de ambos jugadores), el jugador que tenga más Ciudadanos recibe 1 Punto de Desarrollo. En el turno siguiente empieza el jugador que va ganando en puntos. Gana el primer jugador en llegar a 5 Puntos de Desarrollo.
              </p>
              <p>
                <strong className="font-display text-xs text-[#e3c158]">Tipos de Carta y Palabras Clave:</strong>
                <br />• <strong>Ciudadanos (V):</strong> Cuentan hacia tus puntos de Desarrollo. Su Vitalidad indica tanto su salud como su daño al atacar.
                <br />• <strong>Herramientas y Locaciones (A):</strong> Se despliegan en tus zonas con Armadura pero no cuentan como Ciudadanos ni atacan. Las Locaciones con <em>Desgaste X</em> sufren X daño al activar su habilidad.
                <br />• <strong>Eventos:</strong> Efecto inmediato y van al Descarte.
                <br />• <strong>Defensor:</strong> Debe ser atacado antes que otros ciudadanos sin Defensor en su misma zona.
                <br />• <strong>Ataque Rápido:</strong> Al atacar no recibe daño de represalia del defensor.
                <br />• <strong>Rango:</strong> Puede atacar la Colonia enemiga ignorando unidades en la Zona de Combate.
                <br />• <strong>Comandante:</strong> Comienza fuera del mazo y pasa a tu mano tras el Mulligan.
              </p>
              <p>
                <strong className="font-display text-xs text-[#e3c158]">Zonas y Límites:</strong>
                <br />• <em>La Ciudad</em>, <em>El Camino</em> y <em>La Zona de Combate</em> (máximo 5 cartas por zona y máximo 10 cartas en mano).
                <br />• Podés jugar Ciudadanos en La Ciudad o El Camino (y en Combate solo si tu oponente tiene una carta ahí).
                <br />• Cada Ciudadano puede moverse a una zona adyacente <strong>o</strong> atacar en su turno (no ambas en el mismo turno, y no puede moverse el turno que entra en juego).
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
