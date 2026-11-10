import React, { useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  Bot,
  Clock,
  Flame,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#090807]/90 backdrop-blur-md p-4 overflow-y-auto">
      <div className="bastion-panel border-2 border-[#c59b27] rounded-lg max-w-6xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="bastion-panel-header px-6 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded bg-gradient-to-b from-[#f3d46b] to-[#966e15] text-[#14100c] border border-[#fef08a]">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-[#f3ead8]">
                Laboratorio Táctico IA vs IA — Simulación en Paralelo
              </h2>
              <p className="font-serif text-xs text-[#d6c7b8]">
                Enfrentá dos mazos en múltiples partidas simultáneas para analizar balance, ventaja de salida, daño y uso de cada carta.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-war-iron px-3 py-1.5 rounded text-xs flex items-center gap-1"
          >
            <X className="w-4 h-4" /> Cerrar
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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
                  Orden de Salida (Turno 1)
                </label>
                <select
                  value={startingMode}
                  onChange={(e) =>
                    setStartingMode(e.target.value as SimStartingMode)
                  }
                  className="w-full px-3 py-2 rounded bg-[#0e0c0a] border border-[#6b5a48] font-display text-xs font-bold text-[#f3ead8] focus:border-[#c59b27] focus:outline-none"
                >
                  <option value="alternate">Alternado 50/50 (Justo)</option>
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
                {/* Winner Banner */}
                <div className="p-4 rounded-lg bg-gradient-to-b from-[#231d16] to-[#14110e] border-2 border-[#c59b27] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-display text-[#f3d46b] uppercase">
                    <span>Mazo Dominante</span>
                    <Trophy className="w-4 h-4 text-[#f3d46b]" />
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

                {/* First Player Advantage */}
                <div className="p-4 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-display text-[#e3c158] uppercase">
                    <span>Ventaja de Salida (1º vs 2º)</span>
                    <Award className="w-4 h-4 text-[#e3c158]" />
                  </div>
                  <div className="my-2">
                    <div className="font-display text-sm font-black text-[#f3ead8]">
                      1º Jugador: {report.firstPlayerWins} victorias (
                      {report.firstPlayerWinRate.toFixed(1)}%)
                    </div>
                    <div className="font-serif text-xs text-[#a89b8c]">
                      2º Jugador: {report.secondPlayerWins} victorias (
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

                {/* Most & Least Used Cards */}
                <div className="p-4 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-display text-[#86efac] uppercase">
                    <span>Uso de Cartas</span>
                    <Layers className="w-4 h-4 text-[#86efac]" />
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

                {/* Top Damage Card & Simulation Pace */}
                <div className="p-4 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-display text-[#fca5a5] uppercase">
                    <span>Mayor Daño y Ritmo</span>
                    <Flame className="w-4 h-4 text-[#f87171]" />
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
                  },
                  {
                    summary: report.deckB,
                    badgeColor: 'border-[#ef4444] bg-[#361515]/40',
                    titleColor: 'text-[#fca5a5]',
                    label: 'Mazo B',
                  },
                ].map(({ summary, badgeColor, titleColor, label }) => (
                  <div
                    key={label}
                    className={`p-4 rounded-lg border ${badgeColor} space-y-3`}
                  >
                    <div className="flex items-center justify-between border-b border-[#463c32] pb-2">
                      <div>
                        <span className="font-display text-[10px] uppercase tracking-wider text-[#a89b8c]">
                          {label}
                        </span>
                        <h3 className={`font-display text-base font-bold ${titleColor}`}>
                          {summary.deckName}
                        </h3>
                      </div>
                      <div className="text-right">
                        <div className="font-display text-lg font-black text-[#fef08a]">
                          {summary.wins} Victorias ({summary.winRate.toFixed(1)}%)
                        </div>
                        <div className="font-serif text-[11px] text-[#d6c7b8]">
                          Ganó yendo 1º: {summary.winsGoingFirst} • Ganó yendo 2º:{' '}
                          {summary.winsGoingSecond}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]">
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

                      <div className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]">
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

                      <div className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]">
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

                      <div className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]">
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
                  </div>
                  <span className="font-serif italic text-xs text-[#a89b8c]">
                    Hacé clic en los encabezados de columna para ordenar
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#3a322a] bg-[#120f0d] font-display text-[10px] uppercase text-[#c59b27]">
                        <th className="py-2.5 px-3">Carta</th>
                        <th
                          onClick={() => toggleSort('timesPlayed')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Veces Jugada{' '}
                          {sortField === 'timesPlayed' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th
                          onClick={() => toggleSort('avgPlaysPerGame')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Prom. Jugadas/Partida{' '}
                          {sortField === 'avgPlaysPerGame' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th
                          onClick={() => toggleSort('winRateWhenPlayed')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          % Victoria al Jugarse{' '}
                          {sortField === 'winRateWhenPlayed' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th
                          onClick={() => toggleSort('totalDamage')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Daño Total{' '}
                          {sortField === 'totalDamage' ? (sortAsc ? '↑' : '↓') : ''}
                        </th>
                        <th
                          onClick={() => toggleSort('avgDamage')}
                          className="py-2.5 px-3 cursor-pointer hover:text-[#fef08a]"
                        >
                          Daño Prom / Mín / Máx (Partida)
                        </th>
                        <th
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
