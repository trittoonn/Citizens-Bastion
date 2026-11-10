import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Bot,
  ChevronDown,
  ChevronUp,
  Clock,
  Flame,
  HelpCircle,
  Info,
  Layers,
  Play,
  Trophy,
  X,
} from 'lucide-react';
import {
  AIDifficulty,
  CardSimulationMetrics,
  DeckPreset,
  GameRulesConfig,
  SimStartingMode,
  SimulationReport,
  VitalityMode,
} from '../types/game';
import { DEFAULT_RULES_CONFIG } from '../services/defaults';
import { runAiVsAiSimulation } from '../services/api';

interface AiVsAiSimulatorModalProps {
  decks: DeckPreset[];
  onClose: () => void;
}

type CardSortField =
  | 'timesPlayed'
  | 'avgPlaysPerGame'
  | 'totalDamage'
  | 'avgDamage'
  | 'maxDamage'
  | 'winRateWhenPlayed'
  | 'totalKills';

export const AiVsAiSimulatorModal: React.FC<AiVsAiSimulatorModalProps> = ({
  decks,
  onClose,
}) => {
  const [deckAId, setDeckAId] = useState<string>(() => decks[0]?.id || '');
  const [deckBId, setDeckBId] = useState<string>(
    () => decks[1]?.id || decks[0]?.id || ''
  );
  const [numGames, setNumGames] = useState<number>(50);
  const [aiDifficulty, setAiDifficulty] =
    useState<Exclude<AIDifficulty, ''>>('hard');
  const [startingMode, setStartingMode] =
    useState<SimStartingMode>('alternate');
  const [vitalityMode, setVitalityMode] = useState<VitalityMode>('dynamic');
  const [retaliationDamage, setRetaliationDamage] = useState<boolean>(true);
  const [pointsToWin, setPointsToWin] = useState<number>(5);

  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<SimulationReport | null>(null);
  const [sortField, setSortField] = useState<CardSortField>('timesPlayed');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Slide-down explanations state (individual keys or "all")
  const [openHelpKeys, setOpenHelpKeys] = useState<Record<string, boolean>>({});
  const [showAllHelp, setShowAllHelp] = useState<boolean>(false);

  const toggleHelpKey = (key: string) => {
    setOpenHelpKeys((prev) => ({
      ...prev,
      [key]: !(prev[key] ?? showAllHelp),
    }));
  };

  const isHelpOpen = (key: string) => Boolean(openHelpKeys[key] ?? showAllHelp);

  const handleToggleAllHelp = () => {
    const next = !showAllHelp;
    setShowAllHelp(next);
    setOpenHelpKeys({});
  };

  const selectedDeckA = useMemo(
    () => decks.find((d) => d.id === deckAId) || decks[0],
    [decks, deckAId]
  );
  const selectedDeckB = useMemo(
    () => decks.find((d) => d.id === deckBId) || decks[1] || decks[0],
    [decks, deckBId]
  );

  const handleRunSimulation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeckA || !selectedDeckB) return;

    setRunning(true);
    setError(null);
    try {
      const rules: GameRulesConfig = {
        ...DEFAULT_RULES_CONFIG,
        vitalityMode,
        retaliationDamage,
        pointsToWin: Math.max(1, pointsToWin),
      };
      const res = await runAiVsAiSimulation({
        deckAName: selectedDeckA.name,
        deckACards: selectedDeckA.cards,
        deckBName: selectedDeckB.name,
        deckBCards: selectedDeckB.cards,
        numGames: Math.max(1, Math.min(500, numGames)),
        difficulty: aiDifficulty,
        startingMode,
        rules,
      });
      setReport(res);
    } catch (err: any) {
      setError(err.message || 'No se pudo ejecutar la simulación.');
    } finally {
      setRunning(false);
    }
  };

  const getSortValue = (c: CardSimulationMetrics, field: CardSortField): number => {
    switch (field) {
      case 'timesPlayed':
        return c.timesPlayed;
      case 'avgPlaysPerGame':
        return c.avgPlaysPerGame;
      case 'totalDamage':
        return c.damagePerGame.total;
      case 'avgDamage':
        return c.damagePerGame.average;
      case 'maxDamage':
        return c.damagePerGame.max;
      case 'winRateWhenPlayed':
        return c.winRateWhenPlayed;
      case 'totalKills':
        return c.totalKills;
    }
  };

  const displayedCards = useMemo(() => {
    if (!report) return [];
    const list = [...(report.cardMetrics || [])];
    list.sort((a, b) => {
      const va = getSortValue(a, sortField);
      const vb = getSortValue(b, sortField);
      if (va !== vb) {
        return sortAsc ? va - vb : vb - va;
      }
      return a.cardName.localeCompare(b.cardName);
    });
    return list;
  }, [report, sortField, sortAsc]);

  const toggleSort = (field: CardSortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bastion-panel border-2 border-[#c59b27] rounded-lg w-full flex flex-col overflow-hidden shadow-[0_18px_48px_rgba(0,0,0,0.9)]">
      <div>
        {/* Header */}
        <div className="bastion-panel-header px-6 py-4 flex items-center justify-between shrink-0 gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-gradient-to-b from-[#f3d46b] to-[#966e15] text-[#14100c] border border-[#fef08a]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#f3ead8]">
                Laboratorio Táctico IA vs IA — Simulación en Paralelo
              </h2>
              <p className="font-serif text-xs text-[#d6c7b8]">
                Enfrentá dos mazos en múltiples partidas simultáneas para analizar balance, impacto de ir primero, daño y uso de cada carta.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <button
                type="button"
                onClick={handleToggleAllHelp}
                className="btn-war-iron px-3 py-1.5 rounded text-xs flex items-center gap-1.5 border-[#c59b27]/70 text-[#fef08a]"
              >
                <HelpCircle className="w-3.5 h-3.5 text-[#f3d46b]" />
                {showAllHelp ? 'Ocultar explicaciones' : '¿Qué significa cada métrica?'}
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="btn-war-iron px-3.5 py-1.5 rounded text-xs flex items-center gap-1.5"
            >
              <X className="w-4 h-4 text-[#f3d46b]" /> ← Volver a Salas de Guerra
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Simulation Configuration Form */}
          <form
            onSubmit={handleRunSimulation}
            className="p-4 rounded-lg bg-[#15110e] border border-[#574c3f] space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Deck A */}
              <div>
                <label className="block font-display text-xs font-bold text-[#93c5fd] mb-1">
                  Mazo A (Contendiente 1)
                </label>
                <select
                  value={selectedDeckA?.id || ''}
                  onChange={(e) => setDeckAId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#0e0c0a] border border-[#3b82f6]/60 font-display text-xs font-bold text-[#f3ead8] focus:border-[#60a5fa] focus:outline-none"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.cards.length} cartas)
                    </option>
                  ))}
                </select>
              </div>

              {/* Deck B */}
              <div>
                <label className="block font-display text-xs font-bold text-[#fca5a5] mb-1">
                  Mazo B (Contendiente 2)
                </label>
                <select
                  value={selectedDeckB?.id || ''}
                  onChange={(e) => setDeckBId(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-[#0e0c0a] border border-[#ef4444]/60 font-display text-xs font-bold text-[#f3ead8] focus:border-[#f87171] focus:outline-none"
                >
                  {decks.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.cards.length} cartas)
                    </option>
                  ))}
                </select>
              </div>

              {/* AI Difficulty */}
              <div>
                <label className="block font-display text-xs font-bold text-[#e3c158] mb-1">
                  Dificultad de ambas IAs
                </label>
                <select
                  value={aiDifficulty}
                  onChange={(e) =>
                    setAiDifficulty(e.target.value as Exclude<AIDifficulty, ''>)
                  }
                  className="w-full px-3 py-2 rounded bg-[#0e0c0a] border border-[#6b5a48] font-display text-xs font-bold text-[#f3d46b] focus:border-[#c59b27] focus:outline-none"
                >
                  <option value="easy">I. Recluta (Fácil)</option>
                  <option value="medium">II. Capitán (Normal)</option>
                  <option value="hard">III. Gran Mariscal (Difícil)</option>
                </select>
              </div>

              {/* Starting Player Mode */}
              <div>
                <label className="block font-display text-xs font-bold text-[#e3c158] mb-1">
                  ¿Quién empieza en el Turno 1?
                </label>
                <select
                  value={startingMode}
                  onChange={(e) =>
                    setStartingMode(e.target.value as SimStartingMode)
                  }
                  className="w-full px-3 py-2 rounded bg-[#0e0c0a] border border-[#6b5a48] font-display text-xs font-bold text-[#f3ead8] focus:border-[#c59b27] focus:outline-none"
                >
                  <option value="alternate">Alternado 50/50 (Mitad empieza A, mitad B)</option>
                  <option value="random">Aleatorio en cada partida</option>
                  <option value="deckA">Siempre empieza Mazo A</option>
                  <option value="deckB">Siempre empieza Mazo B</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-[#3a322a]">
              {/* Number of Parallel Games */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-display text-xs font-bold text-[#d6c7b8]">
                  Partidas en Paralelo:
                </span>
                {[10, 25, 50, 100, 200].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNumGames(preset)}
                    className={`px-2.5 py-1 rounded font-display text-xs font-bold border transition ${
                      numGames === preset
                        ? 'bg-[#2b2216] border-[#c59b27] text-[#fef08a]'
                        : 'bg-[#120f0d] border-[#463c32] text-[#a89b8c] hover:text-[#f3ead8]'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={numGames}
                  onChange={(e) => setNumGames(Number(e.target.value))}
                  className="w-20 px-2 py-1 rounded bg-[#0e0c0a] border border-[#574c3f] font-display text-xs font-bold text-center text-[#f3d46b]"
                />
              </div>

              {/* Quick Rules Toggles */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <label className="flex items-center gap-1.5 font-display text-[11px] text-[#d6c7b8]">
                  Meta Pts:
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={pointsToWin}
                    onChange={(e) => setPointsToWin(Number(e.target.value))}
                    className="w-14 px-2 py-0.5 rounded bg-[#0e0c0a] border border-[#574c3f] text-center text-[#f3d46b] font-bold"
                  />
                </label>

                <label className="flex items-center gap-1.5 font-display text-[11px] text-[#d6c7b8] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={retaliationDamage}
                    onChange={(e) => setRetaliationDamage(e.target.checked)}
                    className="accent-[#c59b27]"
                  />
                  Contraataque
                </label>

                <select
                  value={vitalityMode}
                  onChange={(e) => setVitalityMode(e.target.value as VitalityMode)}
                  className="px-2 py-1 rounded bg-[#0e0c0a] border border-[#574c3f] font-display text-[11px] text-[#d6c7b8]"
                >
                  <option value="dynamic">V Dinámica</option>
                  <option value="base_attack">Fuerza Base</option>
                </select>

                <button
                  type="submit"
                  disabled={running}
                  className="btn-war-gold px-5 py-2 rounded text-xs flex items-center gap-2 shadow-[0_0_20px_rgba(243,212,107,0.45)]"
                >
                  <Play className="w-4 h-4" />
                  {running
                    ? `Simulando ${numGames} partidas...`
                    : `Simular ${numGames} Juegos`}
                </button>
              </div>
            </div>
          </form>

          {error && (
            <div className="p-3.5 rounded bg-[#3b1614] border border-[#ef4444] text-[#fecaca] font-serif text-sm">
              {error}
            </div>
          )}

          {/* Results Dashboard */}
          {report && (
            <div className="space-y-6">
              {/* 1. Headline Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Card 1: Winner Banner */}
                <div
                  title="Muestra cuál de los dos mazos ganó más partidas en total durante la simulación."
                  className="p-4 rounded-lg bg-gradient-to-b from-[#231d16] to-[#14110e] border-2 border-[#c59b27] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-display text-[#f3d46b] uppercase">
                      <span>Mazo Ganador</span>
                      <button
                        type="button"
                        onClick={() => toggleHelpKey('winner')}
                        className="flex items-center gap-0.5 text-[#f3d46b] hover:text-white"
                        title="Ver explicación"
                      >
                        <Info className="w-3.5 h-3.5" />
                        {isHelpOpen('winner') ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    {isHelpOpen('winner') && (
                      <p className="mt-1.5 p-2 rounded bg-black/40 border border-[#c59b27]/40 font-serif text-[11px] text-[#e7dfd3] leading-snug">
                        Indica qué mazo acumuló más victorias en las {report.totalGames} partidas simuladas y la proporción de victorias de Mazo A (azul) vs Mazo B (rojo).
                      </p>
                    )}
                  </div>

                  <div className="my-2">
                    <div className="font-display text-base font-black text-[#fef08a] truncate">
                      {report.deckA.wins > report.deckB.wins
                        ? report.deckA.deckName
                        : report.deckB.wins > report.deckA.wins
                        ? report.deckB.deckName
                        : 'Empate Técnico'}
                    </div>
                    <div className="font-serif text-xs text-[#d6c7b8] mt-0.5">
                      {report.deckA.wins} a {report.deckB.wins} victorias
                      {report.draws > 0 ? ` (${report.draws} empates)` : ''}
                    </div>
                  </div>
                  {/* Dual Winrate Progress Bar */}
                  <div className="w-full h-2.5 rounded-full bg-[#26201a] overflow-hidden flex border border-[#574c3f]">
                    <div
                      style={{ width: `${report.deckA.winRate}%` }}
                      className="bg-[#3b82f6] h-full"
                      title={`${report.deckA.deckName}: ${report.deckA.winRate.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${report.deckB.winRate}%` }}
                      className="bg-[#ef4444] h-full"
                      title={`${report.deckB.deckName}: ${report.deckB.winRate.toFixed(1)}%`}
                    />
                  </div>
                </div>

                {/* Card 2: Wins by Starting Turn Order (Who went 1st vs 2nd) */}
                <div
                  title="Compara cuántas partidas fueron ganadas por el jugador al que le tocó empezar en el Turno 1 frente al jugador que empezó segundo, sin importar qué mazo usaba."
                  className="p-4 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-display text-[#e3c158] uppercase">
                      <span>¿Ganó el que empezó 1º?</span>
                      <button
                        type="button"
                        onClick={() => toggleHelpKey('turnOrder')}
                        className="flex items-center gap-0.5 text-[#e3c158] hover:text-white"
                        title="Ver explicación"
                      >
                        <Info className="w-3.5 h-3.5" />
                        {isHelpOpen('turnOrder') ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    {isHelpOpen('turnOrder') && (
                      <p className="mt-1.5 p-2 rounded bg-black/40 border border-[#6b5a48] font-serif text-[11px] text-[#e7dfd3] leading-snug">
                        Mide cuántas veces ganó el jugador que tuvo el <strong>primer turno de la partida (Salir 1º)</strong> frente al que empezó segundo (Salir 2º), sin importar qué mazo usaba. Sirve para saber si empezar primero da ventaja.
                      </p>
                    )}
                  </div>

                  <div className="my-2">
                    <div className="font-display text-sm font-black text-[#f3ead8]">
                      Salió 1º: ganó {report.firstPlayerWins} veces (
                      {report.firstPlayerWinRate.toFixed(1)}%)
                    </div>
                    <div className="font-serif text-xs text-[#a89b8c]">
                      Salió 2º: ganó {report.secondPlayerWins} veces (
                      {report.secondPlayerWinRate.toFixed(1)}%)
                    </div>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[#26201a] overflow-hidden flex border border-[#463c32]">
                    <div
                      style={{ width: `${report.firstPlayerWinRate}%` }}
                      className="bg-[#f59e0b] h-full"
                    />
                    <div
                      style={{ width: `${report.secondPlayerWinRate}%` }}
                      className="bg-[#64748b] h-full"
                    />
                  </div>
                </div>

                {/* Card 3: Most & Least Used Cards */}
                <div
                  title="Muestra la carta que más veces se jugó desde la mano o descarte y la carta que menos veces se llegó a jugar."
                  className="p-4 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-display text-[#86efac] uppercase">
                      <span>Uso de Cartas</span>
                      <button
                        type="button"
                        onClick={() => toggleHelpKey('cardUsage')}
                        className="flex items-center gap-0.5 text-[#86efac] hover:text-white"
                        title="Ver explicación"
                      >
                        <Info className="w-3.5 h-3.5" />
                        {isHelpOpen('cardUsage') ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    {isHelpOpen('cardUsage') && (
                      <p className="mt-1.5 p-2 rounded bg-black/40 border border-[#6b5a48] font-serif text-[11px] text-[#e7dfd3] leading-snug">
                        Destaca qué carta fue desplegada o activada más veces sumando todas las partidas, y cuál fue la menos utilizada.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 my-1 text-xs">
                    {report.mostUsedCard && (
                      <div>
                        <span className="text-[#86efac] font-display font-bold">
                          ▲ Más usada:
                        </span>{' '}
                        <strong className="text-[#f3ead8]">
                          {report.mostUsedCard.cardName}
                        </strong>{' '}
                        <span className="text-[#a89b8c]">
                          ({report.mostUsedCard.timesPlayed} veces •{' '}
                          {report.mostUsedCard.avgPlaysPerGame.toFixed(2)}/juego)
                        </span>
                      </div>
                    )}
                    {report.leastUsedCard && (
                      <div>
                        <span className="text-[#fca5a5] font-display font-bold">
                          ▼ Menos usada:
                        </span>{' '}
                        <strong className="text-[#f3ead8]">
                          {report.leastUsedCard.cardName}
                        </strong>{' '}
                        <span className="text-[#a89b8c]">
                          ({report.leastUsedCard.timesPlayed} veces •{' '}
                          {report.leastUsedCard.avgPlaysPerGame.toFixed(2)}/juego)
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card 4: Top Damage Card & Simulation Pace */}
                <div
                  title="Muestra la carta que más daño total infligió a unidades enemigas (por ataques y efectos) y la duración promedio en turnos."
                  className="p-4 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs font-display text-[#fca5a5] uppercase">
                      <span>Mayor Daño y Duración</span>
                      <button
                        type="button"
                        onClick={() => toggleHelpKey('topDamage')}
                        className="flex items-center gap-0.5 text-[#fca5a5] hover:text-white"
                        title="Ver explicación"
                      >
                        <Info className="w-3.5 h-3.5" />
                        {isHelpOpen('topDamage') ? (
                          <ChevronUp className="w-3 h-3" />
                        ) : (
                          <ChevronDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                    {isHelpOpen('topDamage') && (
                      <p className="mt-1.5 p-2 rounded bg-black/40 border border-[#6b5a48] font-serif text-[11px] text-[#e7dfd3] leading-snug">
                        Indica la carta que causó más daño total (sumando combates y habilidades) y cuántos turnos duraron en promedio las partidas.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5 my-1 text-xs">
                    {report.topDamageCard && (
                      <div>
                        <span className="text-[#fca5a5] font-display font-bold">
                          ⚔️ Mayor Daño:
                        </span>{' '}
                        <strong className="text-[#f3ead8]">
                          {report.topDamageCard.cardName}
                        </strong>{' '}
                        <span className="text-[#a89b8c]">
                          (Total: {report.topDamageCard.damagePerGame.total} • Máx:{' '}
                          {report.topDamageCard.damagePerGame.max})
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-[#a89b8c] pt-1 border-t border-[#3a322a]">
                      <span>
                        Turnos prom.:{' '}
                        <strong className="text-[#f3d46b]">
                          {report.turnsPerGame.average.toFixed(1)}
                        </strong>{' '}
                        ({report.turnsPerGame.min}–{report.turnsPerGame.max})
                      </span>
                      <span className="flex items-center gap-1 text-[11px]">
                        <Clock className="w-3 h-3" /> {report.durationMs} ms
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Side-by-Side Deck Comparison Table (Avg / Min / Max Damage, Plays, Hand Size, Points) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {[
                  {
                    summary: report.deckA,
                    badgeColor: 'border-[#3b82f6] bg-[#172536]/40',
                    titleColor: 'text-[#93c5fd]',
                    label: 'Mazo A',
                    helpKey: 'deckAStats',
                  },
                  {
                    summary: report.deckB,
                    badgeColor: 'border-[#ef4444] bg-[#361515]/40',
                    titleColor: 'text-[#fca5a5]',
                    label: 'Mazo B',
                    helpKey: 'deckBStats',
                  },
                ].map(({ summary, badgeColor, titleColor, label, helpKey }) => (
                  <div
                    key={label}
                    className={`p-4 rounded-lg border ${badgeColor} space-y-3`}
                  >
                    <div className="flex items-center justify-between border-b border-[#463c32] pb-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-display text-[10px] uppercase tracking-wider text-[#a89b8c]">
                            {label}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleHelpKey(helpKey)}
                            className="text-[#f3d46b] hover:text-white flex items-center gap-0.5 text-[10px] font-display"
                            title="Ver explicación de las métricas del mazo"
                          >
                            <Info className="w-3.5 h-3.5" />
                            {isHelpOpen(helpKey) ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : (
                              <ChevronDown className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                        <h3 className={`font-display text-base font-bold ${titleColor}`}>
                          {summary.deckName}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-black text-[#fef08a]">
                          {summary.wins} Victorias ({summary.winRate.toFixed(1)}%)
                        </div>
                        <div
                          title="Cuántas victorias consiguió este mazo cuando le tocó empezar en el Turno 1 vs cuando empezó segundo."
                          className="font-serif text-[11px] text-[#d6c7b8]"
                        >
                          Ganó saliendo 1º: {summary.winsGoingFirst} • Saliendo 2º:{' '}
                          {summary.winsGoingSecond}
                        </div>
                      </div>
                    </div>

                    {isHelpOpen(helpKey) && (
                      <div className="p-2.5 rounded bg-black/40 border border-[#574c3f] font-serif text-[11px] text-[#e7dfd3] space-y-1 leading-snug">
                        <div>
                          • <strong>Daño por Partida:</strong> Promedio, mínimo y máximo de daño total que este mazo le hizo a las cartas rivales por partida.
                        </div>
                        <div>
                          • <strong>Cartas Jugadas:</strong> Cuántas cartas bajó o activó este mazo por partida (Prom / Mín / Máx).
                        </div>
                        <div>
                          • <strong>Cartas en Mano (Fin):</strong> Con cuántas cartas en la mano terminó la partida este mazo (mide si se queda sin recursos o acumula cartas).
                        </div>
                        <div>
                          • <strong>Puntos Desarrollo:</strong> Con cuántos Puntos de Desarrollo terminó en promedio cada partida.
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div
                        title="Daño total infligido por este mazo en cada partida (Promedio, Mínimo en una partida y Máximo en una partida)."
                        className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]"
                      >
                        <span className="block font-display text-[10px] text-[#fca5a5] uppercase">
                          Daño por Partida
                        </span>
                        <strong className="font-display text-sm text-[#f3ead8]">
                          Prom: {summary.damageDealt.average.toFixed(1)}
                        </strong>
                        <span className="block text-[10px] text-[#a89b8c]">
                          Mín: {summary.damageDealt.min} • Máx: {summary.damageDealt.max}
                        </span>
                      </div>

                      <div
                        title="Cantidad de cartas jugadas por este mazo en cada partida (Promedio, Mínimo y Máximo)."
                        className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]"
                      >
                        <span className="block font-display text-[10px] text-[#f3d46b] uppercase">
                          Cartas Jugadas
                        </span>
                        <strong className="font-display text-sm text-[#f3ead8]">
                          Prom: {summary.cardsPlayed.average.toFixed(1)}
                        </strong>
                        <span className="block text-[10px] text-[#a89b8c]">
                          Mín: {summary.cardsPlayed.min} • Máx: {summary.cardsPlayed.max}
                        </span>
                      </div>

                      <div
                        title="Cantidad de cartas que le quedaron en la mano a este mazo al terminar la partida (Promedio, Mínimo y Máximo)."
                        className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]"
                      >
                        <span className="block font-display text-[10px] text-[#93c5fd] uppercase">
                          Cartas en Mano (Fin)
                        </span>
                        <strong className="font-display text-sm text-[#f3ead8]">
                          Prom: {summary.cardsInHandAtEnd.average.toFixed(1)}
                        </strong>
                        <span className="block text-[10px] text-[#a89b8c]">
                          Mín: {summary.cardsInHandAtEnd.min} • Máx:{' '}
                          {summary.cardsInHandAtEnd.max}
                        </span>
                      </div>

                      <div
                        title="Puntos de Desarrollo alcanzados por este mazo al finalizar cada partida (Promedio, Mínimo y Máximo)."
                        className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]"
                      >
                        <span className="block font-display text-[10px] text-[#86efac] uppercase">
                          Puntos Desarrollo
                        </span>
                        <strong className="font-display text-sm text-[#f3ead8]">
                          Prom: {summary.developmentPoints.average.toFixed(1)}
                        </strong>
                        <span className="block text-[10px] text-[#a89b8c]">
                          Mín: {summary.developmentPoints.min} • Máx:{' '}
                          {summary.developmentPoints.max}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* 3. Card-by-Card Telemetry Table */}
              <div className="rounded-lg bg-[#15110e] border border-[#574c3f] overflow-hidden">
                <div className="px-4 py-3 bg-[#1e1814] border-b border-[#463c32] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[#f3d46b]" />
                    <h3 className="font-display text-sm font-bold text-[#f3ead8]">
                      Métricas por Carta ({displayedCards.length})
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleHelpKey('tableColumns')}
                      className="text-xs font-display text-[#f3d46b] hover:text-white flex items-center gap-1 ml-2 px-2 py-0.5 rounded bg-[#120f0d] border border-[#574c3f]"
                    >
                      <Info className="w-3.5 h-3.5" />
                      Explicación de columnas
                      {isHelpOpen('tableColumns') ? (
                        <ChevronUp className="w-3 h-3" />
                      ) : (
                        <ChevronDown className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                  <span className="font-serif italic text-xs text-[#a89b8c]">
                    Hacé clic en los encabezados de columna para ordenar
                  </span>
                </div>

                {isHelpOpen('tableColumns') && (
                  <div className="p-3 bg-[#120f0d] border-b border-[#3a322a] grid grid-cols-1 md:grid-cols-3 gap-2 font-serif text-xs text-[#e7dfd3]">
                    <div>
                      • <strong className="text-[#f3d46b]">Veces Jugada:</strong> Total de veces que la carta fue jugada en todas las partidas (y en cuántas partidas distintas apareció).
                    </div>
                    <div>
                      • <strong className="text-[#f3d46b]">Prom. Jugadas/Partida:</strong> Cuántas veces en promedio se juega esta carta por cada partida simulada.
                    </div>
                    <div>
                      • <strong className="text-[#f3d46b]">% Victoria al Jugarse:</strong> En qué porcentaje de las partidas donde se jugó al menos 1 copia de esta carta terminó ganando su dueño.
                    </div>
                    <div>
                      • <strong className="text-[#f3d46b]">Daño Total:</strong> Suma de todo el daño que esta carta hizo a cartas enemigas en toda la simulación.
                    </div>
                    <div>
                      • <strong className="text-[#f3d46b]">Daño Prom / Mín / Máx:</strong> Daño promedio, mínimo y máximo hecho por esta carta en una partida, más el daño promedio cada vez que se juega.
                    </div>
                    <div>
                      • <strong className="text-[#f3d46b]">Bajas:</strong> Cantidad total de unidades enemigas destruidas por ataques o efectos de esta carta.
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#3a322a] bg-[#120f0d] font-display text-[10px] uppercase text-[#c59b27]">
                        <th className="py-2.5 px-3">Carta</th>
                        <th
                          title="Total de veces que la carta fue jugada sumando todas las partidas (y en cuántas partidas se jugó al menos una vez)."
                          onClick={() => toggleSort('timesPlayed')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Veces Jugada{' '}
                          {sortField === 'timesPlayed' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th
                          title="Promedio de veces que se jugó esta carta por cada partida simulada."
                          onClick={() => toggleSort('avgPlaysPerGame')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Prom. Jugadas/Partida{' '}
                          {sortField === 'avgPlaysPerGame' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th
                          title="Porcentaje de victorias en las partidas en las que esta carta fue jugada al menos una vez."
                          onClick={() => toggleSort('winRateWhenPlayed')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          % Victoria al Jugarse{' '}
                          {sortField === 'winRateWhenPlayed' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th
                          title="Daño total acumulado que esta carta infligió a unidades enemigas en todas las partidas."
                          onClick={() => toggleSort('totalDamage')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Daño Total{' '}
                          {sortField === 'totalDamage' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th
                          title="Daño promedio, mínimo y máximo infligido por esta carta en una partida, y promedio de daño por cada vez que se jugó."
                          onClick={() => toggleSort('avgDamage')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Daño Prom / Mín / Máx (Partida)
                        </th>
                        <th
                          title="Cantidad total de unidades enemigas destruidas por esta carta."
                          onClick={() => toggleSort('totalKills')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Bajas{' '}
                          {sortField === 'totalKills' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2b241e] font-serif">
                      {displayedCards.map((c) => (
                        <tr
                          key={c.cardId}
                          className="hover:bg-[#1e1813] transition"
                        >
                          <td className="py-2 px-3">
                            <div className="font-display font-bold text-[#f3ead8]">
                              {c.cardName}
                            </div>
                            <span className="text-[10px] text-[#8c7e70] uppercase font-display">
                              {c.cardType === 'citizen'
                                ? 'Ciudadano'
                                : c.cardType === 'tool'
                                ? 'Herramienta'
                                : 'Evento'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-display font-bold text-[#f3d46b]">
                            {c.timesPlayed}{' '}
                            <span className="text-[10px] font-normal text-[#a89b8c]">
                              ({c.gamesPlayedIn} juegos)
                            </span>
                          </td>
                          <td className="py-2 px-3 font-display text-[#e7dfd3]">
                            {c.avgPlaysPerGame.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 font-display">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                c.winRateWhenPlayed >= 55
                                  ? 'bg-[#14532d] text-[#bbf7d0]'
                                  : c.winRateWhenPlayed > 0 && c.winRateWhenPlayed <= 45
                                  ? 'bg-[#451210] text-[#fecaca]'
                                  : 'bg-[#26201a] text-[#d6c7b8]'
                              }`}
                            >
                              {c.gamesPlayedIn > 0
                                ? `${c.winRateWhenPlayed.toFixed(1)}%`
                                : '—'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-display font-bold text-[#fca5a5]">
                            {c.damagePerGame.total}
                          </td>
                          <td className="py-2 px-3 font-display text-[#d6c7b8]">
                            <strong>{c.damagePerGame.average.toFixed(1)}</strong>{' '}
                            <span className="text-[11px] text-[#8c7e70]">
                              (Mín: {c.damagePerGame.min} • Máx:{' '}
                              {c.damagePerGame.max} • Prom/Jugada:{' '}
                              {c.avgDamagePerPlay.toFixed(1)})
                            </span>
                          </td>
                          <td className="py-2 px-3 font-display text-[#e7dfd3]">
                            {c.totalKills}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
