import React, { useEffect, useState } from 'react';
import {
  Bot,
  Play,
  PlusCircle,
  RefreshCw,
  Shield,
  Sliders,
  Swords,
  Users,
} from 'lucide-react';
import {
  AIDifficulty,
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

const AI_DIFFICULTY_OPTIONS: {
  id: Exclude<AIDifficulty, ''>;
  title: string;
  subtitle: string;
  description: string;
}[] = [
  {
    id: 'easy',
    title: 'I. Recluta (Fácil)',
    subtitle: 'Postura Defensiva',
    description:
      'Despliega ciudadanos principalmente en La Ciudad y toma decisiones sencillas. Ideal para aprender las reglas.',
  },
  {
    id: 'medium',
    title: 'II. Capitán (Normal)',
    subtitle: 'Táctica Equilibrada',
    description:
      'Aprovecha sus 3 jugadas por turno, marcha hacia el frente y busca derribar objetivos dañados.',
  },
  {
    id: 'hard',
    title: 'III. Gran Mariscal (Difícil)',
    subtitle: 'Maestría de Asedio',
    description:
      'Optimiza sinergias, protege sus motores de valor en la retaguardia y coordina sacrificios y ataques letales.',
  },
];

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
  const [vsAi, setVsAi] = useState(false);
  const [aiDifficulty, setAiDifficulty] = useState<Exclude<AIDifficulty, ''>>('medium');
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
      // Backend might not be reachable yet
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
    const effectiveGameName =
      gameName.trim() ||
      (vsAi ? `Duelo contra IA (${aiDifficulty.toUpperCase()})` : '');
    if (!effectiveGameName || !selectedDeck) return;

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
        gameName: effectiveGameName,
        playerId: session.playerId,
        playerName: session.playerName.trim() || 'Comandante',
        deck: selectedDeck.cards,
        rules,
        vsAi,
        aiDifficulty: vsAi ? aiDifficulty : '',
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
    <div className="relative max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Ambient War-Room Candlelight Glow */}
      <div
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 28%, rgba(212, 148, 42, 0.14) 0%, rgba(154, 88, 24, 0.06) 45%, rgba(0, 0, 0, 0) 75%), radial-gradient(circle at 50% 50%, transparent 52%, rgba(5, 4, 3, 0.85) 100%)',
        }}
      />

      {/* Commander & Active Deck War-Table Bar */}
      <div className="relative z-10 bastion-panel rounded-lg p-5 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div>
          <label className="block font-display text-xs font-bold text-[#c59b27] mb-1">
            Título del Comandante
          </label>
          <input
            type="text"
            value={session.playerName}
            onChange={(e) => handlePlayerNameChange(e.target.value)}
            placeholder="Ingresá tu nombre..."
            className="w-full px-3.5 py-2.5 rounded bg-[#14110e] border border-[#574c3f] font-display text-sm text-[#f3ead8] font-bold focus:border-[#c59b27] focus:outline-none shadow-inner"
          />
        </div>

        <div>
          <label className="block font-display text-xs font-bold text-[#c59b27] mb-1">
            Códice / Mazo de Batalla
          </label>
          <select
            value={selectedDeck?.id || ''}
            onChange={(e) => setSelectedDeckId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded bg-[#14110e] border border-[#574c3f] font-display text-sm text-[#e3c158] font-bold focus:border-[#c59b27] focus:outline-none shadow-inner"
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
            className="btn-war-iron w-full py-2.5 px-4 rounded text-xs"
          >
            Forjar Cartas y Editar Mazos →
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded bg-[#3b1614] border border-[#8c2222] text-[#fecaca] font-serif text-sm">
          {error}
        </div>
      )}

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left 5 Columns: Create New Lobby (PvP or vs AI) */}
        <div className="lg:col-span-5">
          <form
            onSubmit={handleCreateLobby}
            className="bastion-panel rounded-lg overflow-hidden"
          >
            <div className="bastion-panel-header px-6 py-3.5 flex items-center gap-2.5">
              <PlusCircle className="w-5 h-5 text-[#e3c158] drop-shadow" />
              <h2 className="font-display text-base font-bold text-[#f3ead8] tracking-wide">
                Convocar Nueva Batalla
              </h2>
            </div>

            <div className="p-6 space-y-5">
              {/* Opponent Type Selector: Multiplayer vs AI */}
            <div className="space-y-1.5">
              <label className="block font-display text-xs font-bold text-[#d6c7b8]">
                Tipo de Oponente
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVsAi(false)}
                  className={`py-2.5 px-3 rounded border font-display text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    !vsAi
                      ? 'bg-[#2b2216] border-[#c59b27] text-[#e3c158] shadow-[inset_0_0_12px_rgba(197,155,39,0.25)]'
                      : 'bg-[#14110e] border-[#463c32] text-[#a89b8c] hover:border-[#6e5d4f]'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  Multijugador
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setVsAi(true);
                    if (!gameName.trim()) {
                      setGameName('Asedio de Entrenamiento');
                    }
                  }}
                  className={`py-2.5 px-3 rounded border font-display text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    vsAi
                      ? 'bg-[#2b2216] border-[#c59b27] text-[#e3c158] shadow-[inset_0_0_12px_rgba(197,155,39,0.25)]'
                      : 'bg-[#14110e] border-[#463c32] text-[#a89b8c] hover:border-[#6e5d4f]'
                  }`}
                >
                  <Bot className="w-4 h-4" />
                  Contra la IA
                </button>
              </div>
            </div>

            {/* AI Difficulty Picker */}
            {vsAi && (
              <div className="space-y-2 p-3.5 rounded bg-[#16120f] border border-[#6e5a3e]">
                <label className="block font-display text-xs font-bold text-[#e3c158]">
                  Rango y Dificultad de la IA
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {AI_DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => setAiDifficulty(opt.id)}
                      className={`text-left p-2.5 rounded border transition ${
                        aiDifficulty === opt.id
                          ? 'bg-[#2b2216] border-[#c59b27] text-[#f3ead8] shadow-[inset_0_0_14px_rgba(197,155,39,0.2)]'
                          : 'bg-[#120f0d] border-[#3a322a] text-[#a89b8c] hover:border-[#574c3f]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-display text-xs font-bold text-[#e3c158]">
                          {opt.title}
                        </span>
                        <span className="text-[10px] font-display uppercase text-[#a89b8c]">
                          {opt.subtitle}
                        </span>
                      </div>
                      <p className="font-serif text-xs text-[#d6c7b8] mt-0.5 leading-snug">
                        {opt.description}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block font-display text-xs font-bold text-[#d6c7b8] mb-1">
                Nombre de la Sala / Campaña *
              </label>
              <input
                type="text"
                required={!vsAi}
                placeholder="Ej. Asedio al Bastión del Norte"
                value={gameName}
                onChange={(e) => setGameName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded bg-[#14110e] border border-[#574c3f] font-serif text-base text-[#f3ead8] focus:border-[#c59b27] focus:outline-none shadow-inner"
              />
            </div>

            {/* Vitality Mode Selector */}
            <div className="space-y-2">
              <label className="block font-display text-xs font-bold text-[#d6c7b8]">
                Doctrina de Vitalidad (V) en Combate
              </label>
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => setVitalityMode('dynamic')}
                  className={`text-left p-3 rounded border transition ${
                    vitalityMode === 'dynamic'
                      ? 'bg-[#2b2216] border-[#c59b27] text-[#f3ead8] shadow-[inset_0_0_16px_rgba(197,155,39,0.2)]'
                      : 'bg-[#14110e] border-[#463c32] text-[#a89b8c] hover:border-[#6e5d4f]'
                  }`}
                >
                  <div className="font-display text-xs font-bold text-[#e3c158]">
                    I. Vitalidad Dinámica (Estándar)
                  </div>
                  <div className="font-serif text-xs text-[#d6c7b8] mt-0.5 leading-snug">
                    La Vitalidad actual representa tanto la resistencia restante como el daño infligido al atacar.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVitalityMode('base_attack')}
                  className={`text-left p-3 rounded border transition ${
                    vitalityMode === 'base_attack'
                      ? 'bg-[#2b2216] border-[#c59b27] text-[#f3ead8] shadow-[inset_0_0_16px_rgba(197,155,39,0.2)]'
                      : 'bg-[#14110e] border-[#463c32] text-[#a89b8c] hover:border-[#6e5d4f]'
                  }`}
                >
                  <div className="font-display text-xs font-bold text-[#e3c158]">
                    II. Fuerza Base Inalterable
                  </div>
                  <div className="font-serif text-xs text-[#d6c7b8] mt-0.5 leading-snug">
                    El daño de ataque conserva la Vitalidad Base inicial aunque el Ciudadano sufra heridas.
                  </div>
                </button>
              </div>
            </div>

            {/* Advanced Rules Toggle */}
            <div>
              <button
                type="button"
                onClick={() => setShowAdvancedRules((v) => !v)}
                className="flex items-center gap-1.5 font-display text-[11px] text-[#c59b27] hover:text-[#e3c158] font-bold"
              >
                <Sliders className="w-3.5 h-3.5" />
                {showAdvancedRules
                  ? 'Ocultar leyes de campaña'
                  : 'Leyes de Campaña (Puntos de Desarrollo / Límites)'}
              </button>

              {showAdvancedRules && (
                <div className="mt-3 p-3.5 rounded bg-[#14110e] border border-[#574c3f] space-y-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm text-[#d6c7b8]">
                      Puntos de Desarrollo para la Victoria:
                    </span>
                    <input
                      type="number"
                      min={1}
                      max={30}
                      value={pointsToWin}
                      onChange={(e) => setPointsToWin(Number(e.target.value))}
                      className="w-20 px-2.5 py-1 rounded bg-[#1f1a16] border border-[#574c3f] font-display text-[#e3c158] font-bold text-right"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-sm text-[#d6c7b8]">
                      Exigir límites de construcción de mazo:
                    </span>
                    <input
                      type="checkbox"
                      checked={enforceDeckConstraints}
                      onChange={(e) => setEnforceDeckConstraints(e.target.checked)}
                      className="accent-[#c59b27] w-4 h-4"
                    />
                  </div>
                </div>
              )}
            </div>

              <button
                type="submit"
                disabled={loading || (!vsAi && !gameName.trim())}
                className="btn-war-gold w-full py-3 px-4 rounded text-xs flex items-center justify-center gap-2"
              >
                <Swords className="w-4 h-4" />
                {vsAi
                  ? 'Iniciar Duelo contra la IA'
                  : 'Crear Sala en la Mesa de Guerra'}
              </button>
            </div>
          </form>
        </div>

        {/* Right 7 Columns: Active Lobbies List */}
        <div className="lg:col-span-7">
          <div className="bastion-panel rounded-lg overflow-hidden min-h-[460px] flex flex-col">
            <div className="bastion-panel-header px-6 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Users className="w-5 h-5 text-[#e3c158] drop-shadow" />
                <h2 className="font-display text-base font-bold text-[#f3ead8] tracking-wide">
                  Salas de Guerra Activas ({lobbies.length})
                </h2>
              </div>
              <button
                onClick={loadLobbies}
                className="btn-war-iron flex items-center gap-1.5 px-3 py-1.5 rounded text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#c59b27]" /> Actualizar
              </button>
            </div>

            <div className="p-6 flex-1 flex flex-col">
              {lobbies.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-14 px-6 text-center text-[#8c7e70] rounded-lg border-2 border-dashed border-[#6b5a48]/75 bg-[#120e0b]/80 shadow-[inset_0_4px_24px_rgba(0,0,0,0.85)] zone-trench-grid">
                  <div className="w-16 h-16 rounded-full bg-[#1e1813] border border-[#6e5a44] flex items-center justify-center mb-3 shadow-[0_6px_16px_rgba(0,0,0,0.7)]">
                    <Shield className="w-8 h-8 text-[#c59b27]/80" />
                  </div>
                  <p className="font-display text-sm font-bold text-[#d6c7b8] tracking-wide">
                    No hay campañas abiertas en este momento
                  </p>
                  <p className="font-serif text-sm mt-1.5 max-w-sm text-[#9c8d7e]">
                    Convocá una nueva sala (Multijugador o contra la IA) en el panel izquierdo para iniciar el duelo.
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
                        className="flex flex-wrap items-center justify-between gap-4 p-4 rounded bg-[#16120f] border border-[#574c3f] hover:border-[#c59b27] transition shadow-inner"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <h3 className="font-display font-bold text-[#f3ead8] text-base">
                              {lobby.gameName}
                            </h3>
                            {lobby.vsAi && (
                              <span className="font-display text-[9px] px-2 py-0.5 rounded-sm bg-[#2b2216] text-[#e3c158] border border-[#c59b27]/60 uppercase font-bold flex items-center gap-1">
                                <Bot className="w-3 h-3" /> IA ({lobby.aiDifficulty})
                              </span>
                            )}
                            <span
                              className={`font-display text-[10px] px-2 py-0.5 rounded-sm font-bold uppercase border ${
                                lobby.phase === 'WAITING_FOR_PLAYERS'
                                  ? 'bg-[#17291b] text-[#bbf7d0] border-[#2e6f40]'
                                  : lobby.phase === 'GAME_OVER'
                                  ? 'bg-[#1f1a16] text-[#8c7e70] border-[#463c32]'
                                  : 'bg-[#2b2216] text-[#e3c158] border-[#c59b27]/60'
                              }`}
                            >
                              {lobby.phase === 'WAITING_FOR_PLAYERS'
                                ? 'Aguardando Rival (1/2)'
                                : lobby.phase === 'GAME_OVER'
                                ? 'Concluida'
                                : 'En Batalla (2/2)'}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 font-serif text-xs text-[#a89b8c] flex-wrap">
                            <span>
                              Comandantes:{' '}
                              <strong className="text-[#e7dfd3]">
                                {lobby.playerNames?.join(' vs ') || '—'}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>
                              Doctrina:{' '}
                              <strong className="text-[#e3c158]">
                                {lobby.rules.vitalityMode === 'base_attack'
                                  ? 'Fuerza Base'
                                  : 'V Dinámica'}
                              </strong>
                            </span>
                            <span>•</span>
                            <span>Meta: {lobby.rules.pointsToWin} Pts</span>
                          </div>
                        </div>

                        <button
                          disabled={!canJoin || loading}
                          onClick={() => handleJoinLobby(lobby.id)}
                          className={`px-4 py-2 rounded text-xs flex items-center gap-1.5 ${
                            canJoin ? 'btn-war-gold' : 'btn-war-iron opacity-40'
                          }`}
                        >
                          <Play className="w-3.5 h-3.5" />
                          {isParticipant
                            ? 'Retomar Batalla'
                            : canJoin
                            ? 'Entrar en Batalla'
                            : 'Sala Completa'}
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
    </div>
  );
};
