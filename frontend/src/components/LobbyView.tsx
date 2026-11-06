import React, { useEffect, useState } from 'react';
import {
  Play,
  PlusCircle,
  RefreshCw,
  Shield,
  Sliders,
  Swords,
  Users,
} from 'lucide-react';
import {
  DeckPreset,
  GameRulesConfig,
  LobbySummary,
  PlayerGameView,
  VitalityMode,
} from '../types/game';
import { DEFAULT_RULES_CONFIG } from '../services/defaults';
import {
  getAllDecks,
  getDeckConstraints,
  getPlayerSession,
  savePlayerSession,
} from '../services/storage';
import { createLobby, fetchLobbies, joinLobby } from '../services/api';

interface LobbyViewProps {
  onEnterGame: (lobbyId: string, initialView: PlayerGameView) => void;
  onNavigateDeckBuilder: () => void;
}

export const LobbyView: React.FC<LobbyViewProps> = ({
  onEnterGame,
  onNavigateDeckBuilder,
}) => {
  const [session, setSession] = useState(() => getPlayerSession());
  const [decks] = useState<DeckPreset[]>(() => getAllDecks());
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    () => getAllDecks()[0]?.id || ''
  );

  const [gameName, setGameName] = useState('');
  const [vitalityMode, setVitalityMode] = useState<VitalityMode>('dynamic');
  const [pointsToWin, setPointsToWin] = useState(10);
  const [enforceDeckConstraints, setEnforceDeckConstraints] = useState(false);
  const [showAdvancedRules, setShowAdvancedRules] = useState(false);

  const [lobbies, setLobbies] = useState<LobbySummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDeck =
    decks.find((d) => d.id === selectedDeckId) || decks[0];

  const loadLobbies = async () => {
    try {
      const list = await fetchLobbies();
      setLobbies(list);
    } catch {
      // Backend might not be reachable yet; handled gracefully
    }
  };

  useEffect(() => {
    loadLobbies();
    const timer = setInterval(loadLobbies, 2000);
    return () => clearInterval(timer);
  }, []);

  const handlePlayerNameChange = (name: string) => {
    const next = { ...session, playerName: name };
    setSession(next);
    savePlayerSession(next);
  };

  const handleCreateLobby = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameName.trim() || !selectedDeck) return;
    setError(null);
    setLoading(true);
    try {
      const localConstraints = getDeckConstraints();
      const rules: GameRulesConfig = {
        ...DEFAULT_RULES_CONFIG,
        vitalityMode,
        pointsToWin,
        deckConstraints: {
          ...localConstraints,
          enforced: enforceDeckConstraints,
        },
      };

      const res = await createLobby({
        gameName: gameName.trim(),
        playerId: session.playerId,
        playerName: session.playerName.trim() || 'Comandante',
        deck: selectedDeck.cards,
        rules,
      });

      savePlayerSession({ ...session, activeLobbyId: res.lobby.id });
      onEnterGame(res.lobby.id, res.view);
    } catch (err: any) {
      setError(err.message || 'No se pudo crear la sala.');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinLobby = async (lobbyId: string) => {
    if (!selectedDeck) return;
    setError(null);
    setLoading(true);
    try {
      const view = await joinLobby({
        lobbyId,
        playerId: session.playerId,
        playerName: session.playerName.trim() || 'Comandante',
        deck: selectedDeck.cards,
      });
      savePlayerSession({ ...session, activeLobbyId: lobbyId });
      onEnterGame(lobbyId, view);
    } catch (err: any) {
      setError(err.message || 'No se pudo unir a la sala.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Player & Deck Selection Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end shadow-xl">
        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Tu Nombre de Comandante
          </label>
          <input
            type="text"
            value={session.playerName}
            onChange={(e) => handlePlayerNameChange(e.target.value)}
            placeholder="Ingresá tu nombre..."
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-semibold focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-400 mb-1">
            Mazo Activo para Jugar
          </label>
          <select
            value={selectedDeck?.id || ''}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
          >
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name} ({d.cards.length} cartas)
              </option>
            ))}
          </select>
        </div>

        <div>
          <button
            type="button"
            onClick={onNavigateDeckBuilder}
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 transition"
          >
            Personalizar Mazos y Crear Cartas →
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Columns: Create New Lobby */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCreateLobby}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-xl"
          >
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <PlusCircle className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Crear Nueva Partida</h2>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nombre de la Sala / Partida *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Batalla por la Colonia"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Vitality Mode Selector (Supporting both requested versions!) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                Modo de Vitalidad (V) en Combate
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setVitalityMode('dynamic')}
                  className={`text-left p-3 rounded-xl border transition ${
                    vitalityMode === 'dynamic'
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-300">
                    1. Vitalidad Dinámica (Por defecto)
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    El valor actual de V representa tanto la salud restante como el daño que hace al atacar (ej. si un 10V recibe 2 de daño, queda en 8V y pega 8).
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVitalityMode('base_attack')}
                  className={`text-left p-3 rounded-xl border transition ${
                    vitalityMode === 'base_attack'
                      ? 'bg-amber-500/15 border-amber-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="text-xs font-bold text-amber-300">
                    2. Ataque Base Fijo
                  </div>
                  <div className="text-[11px] text-slate-300 mt-0.5">
                    El daño de ataque se mantiene igual a la Vitalidad Base inicial aunque el Ciudadano haya recibido daño.
                  </div>
                </button>
              </div>
            </div>

            {/* Advanced Rules Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedRules((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 font-semibold"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showAdvancedRules
                  ? 'Ocultar opciones avanzadas de partida'
                  : 'Mostrar opciones avanzadas (Puntos de Victoria / Restricciones)'}
              </button>

              {showAdvancedRules && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      Puntos de Desarrollo para ganar:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={pointsToWin}
                      onChange={(e) => setPointsToWin(Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-white font-bold text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-300">
                      Exigir restricciones de mazo al unirse:
                    </span>
                    <input
                      type="checkbox"
                      checked={enforceDeckConstraints}
                      onChange={(e) => setEnforceDeckConstraints(e.target.checked)}
                      className="accent-amber-500 w-4 h-4"
                    />
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !gameName.trim()}
              className="w-full py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold text-sm shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition"
            >
              <Swords className="w-4 h-4" />
              Crear Sala y Esperar Oponente
            </button>
          </form>
        </div>

        {/* Right 7 Columns: Active Lobbies List */}
        <div className="lg:col-span-7">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-xl min-h-[420px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">
                  Salas Disponibles ({lobbies.length})
                </h2>
              </div>
              <button
                onClick={loadLobbies}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Actualizar
              </button>
            </div>

            {lobbies.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-slate-500">
                <Shield className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-semibold text-slate-400">
                  No hay partidas activas en este momento.
                </p>
                <p className="text-xs mt-1 max-w-sm">
                  Creá una sala nueva en el panel izquierdo con el nombre de tu partida para empezar a jugar.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {lobbies.map((lobby) => {
                  const isParticipant = lobby.playerIds?.includes(session.playerId);
                  const canJoin =
                    lobby.phase === 'WAITING_FOR_PLAYERS' || isParticipant;

                  return (
                    <div
                      key={lobby.id}
                      className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-950/90 border border-slate-800 hover:border-slate-700 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base">
                            {lobby.gameName}
                          </h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                              lobby.phase === 'WAITING_FOR_PLAYERS'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : lobby.phase === 'GAME_OVER'
                                ? 'bg-slate-800 text-slate-400'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {lobby.phase === 'WAITING_FOR_PLAYERS'
                              ? 'Esperando Jugador (1/2)'
                              : lobby.phase === 'GAME_OVER'
                              ? 'Finalizada'
                              : 'En Curso (2/2)'}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                          <span>
                            Jugadores:{' '}
                            <strong className="text-slate-200">
                              {lobby.playerNames?.join(' vs ') || '—'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>
                            Vitalidad:{' '}
                            <strong className="text-amber-300">
                              {lobby.rules.vitalityMode === 'base_attack'
                                ? 'Ataque Base Fijo'
                                : 'Dinámica'}
                            </strong>
                          </span>
                          <span>•</span>
                          <span>Meta: {lobby.rules.pointsToWin} pts</span>
                        </div>
                      </div>

                      <button
                        disabled={!canJoin || loading}
                        onClick={() => handleJoinLobby(lobby.id)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition ${
                          isParticipant
                            ? 'bg-sky-500 hover:bg-sky-400 text-slate-950'
                            : canJoin
                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        {isParticipant
                          ? 'Reconectar a Partida'
                          : canJoin
                          ? 'Unirse a Partida'
                          : 'Sala Llena'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
