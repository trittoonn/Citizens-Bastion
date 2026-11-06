import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Check,
  Crown,
  Flame,
  Layers,
  Move,
  ScrollText,
  SkipForward,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import {
  ActionRequest,
  CardDefinition,
  CardInstance,
  GamePhase,
  PlayerGameView,
  ZoneID,
} from '../types/game';
import { pollGameState, submitGameAction } from '../services/api';
import { CardView } from './CardView';

interface GameBoardViewProps {
  lobbyId: string;
  playerId: string;
  initialView: PlayerGameView;
  onExitLobby: () => void;
}

const PHASE_STEPS: { id: GamePhase; label: string }[] = [
  { id: 'MULLIGAN', label: 'Mulligan' },
  { id: 'START_OF_TURN', label: 'Inicio' },
  { id: 'MAIN', label: 'Principal' },
  { id: 'END_OF_TURN', label: 'Fin' },
];

function areAdjacent(from: ZoneID, to: ZoneID): boolean {
  if (from === 'city' && to === 'road') return true;
  if (from === 'road' && (to === 'city' || to === 'combat')) return true;
  if (from === 'combat' && to === 'road') return true;
  return false;
}

export const GameBoardView: React.FC<GameBoardViewProps> = ({
  lobbyId,
  playerId,
  initialView,
  onExitLobby,
}) => {
  const [view, setView] = useState<PlayerGameView>(initialView);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Selection states during MAIN phase
  const [selectedHandCardId, setSelectedHandCardId] = useState<string | null>(null);
  const [selectedBoardCardId, setSelectedBoardCardId] = useState<string | null>(null);

  // Hover card for Hearthstone/MTG Arena magnified TCG preview
  const [hoveredCard, setHoveredCard] = useState<{
    card: CardDefinition;
    instance?: CardInstance;
  } | null>(null);

  // Mulligan selection
  const [mulliganIds, setMulliganIds] = useState<string[]>([]);

  // Floating drawers (Log & Rules & Pile Inspector) so main screen never scrolls
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showRulesDrawer, setShowRulesDrawer] = useState(false);
  const [inspectPile, setInspectPile] = useState<{
    title: string;
    cards: CardInstance[];
  } | null>(null);

  // Poll backend every 1000ms
  useEffect(() => {
    let active = true;
    const timer = setInterval(async () => {
      try {
        const nextView = await pollGameState(lobbyId, playerId);
        if (active) {
          setView(nextView);
        }
      } catch {
        // Ignore transient network hiccups
      }
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [lobbyId, playerId]);

  const sendAction = async (action: Omit<ActionRequest, 'playerId'>) => {
    setError(null);
    setSubmitting(true);
    try {
      const next = await submitGameAction(lobbyId, {
        playerId,
        ...action,
      });
      setView(next);
      setSelectedHandCardId(null);
      setSelectedBoardCardId(null);
    } catch (err: any) {
      setError(err.message || 'Acción inválida');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedHandCard = useMemo(
    () => view.you.hand?.find((c) => c.instanceId === selectedHandCardId) || null,
    [view.you.hand, selectedHandCardId]
  );

  const selectedBoardCard = useMemo(() => {
    for (const z of ['combat', 'road', 'city'] as const) {
      const found = view.you.board[z]?.find(
        (c) => c.instanceId === selectedBoardCardId
      );
      if (found) return found;
    }
    return null;
  }, [view.you.board, selectedBoardCardId]);

  const isPromptForMe =
    view.phase === 'AWAITING_INPUT' &&
    view.pendingPrompt &&
    view.pendingPrompt.playerId === playerId;

  const isOffBoardPrompt = useMemo(() => {
    if (!isPromptForMe || !view.pendingPrompt) return false;
    const zones = view.pendingPrompt.targetZones || [];
    return zones.includes('deck') || zones.includes('discard') || zones.includes('exile');
  }, [isPromptForMe, view.pendingPrompt]);

  const validPromptSet = useMemo(
    () => new Set(view.pendingPrompt?.validTargetIds || []),
    [view.pendingPrompt]
  );

  const validCombatSet = useMemo(
    () => new Set(view.validCombatTargets || []),
    [view.validCombatTargets]
  );

  const canSelectedBoardCardAttack =
    view.phase === 'MAIN' &&
    view.isYourTurn &&
    selectedBoardCard &&
    selectedBoardCard.zone === 'combat' &&
    !selectedBoardCard.attackedThisTurn;

  const canPlaySelectedCitizenInZone = (zone: 'city' | 'road' | 'combat') => {
    if (
      view.phase !== 'MAIN' ||
      !view.isYourTurn ||
      view.playsRemaining <= 0 ||
      !selectedHandCard ||
      selectedHandCard.definition.type !== 'citizen'
    ) {
      return false;
    }
    if (zone === 'combat') {
      return view.canPlayInCombatZone;
    }
    return true;
  };

  const canMoveSelectedCitizenToZone = (zone: 'city' | 'road' | 'combat') => {
    if (
      view.phase !== 'MAIN' ||
      !view.isYourTurn ||
      view.movesRemaining <= 0 ||
      !selectedBoardCard ||
      selectedBoardCard.playedThisTurn
    ) {
      return false;
    }
    return areAdjacent(selectedBoardCard.zone, zone);
  };

  const toggleMulliganCard = (id: string) => {
    setMulliganIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const myCitizens = view.you.citizenCount;
  const oppCitizens = view.opponent?.citizenCount || 0;
  const handCards = view.you.hand || [];

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[radial-gradient(ellipse_at_center,#1e293b_0%,#090d16_75%,#020617_100%)] text-slate-100 select-none relative">
      {/* =====================================================================
          1. TOP HUD BAR: Opponent Hero/Colony + Fanned Opponent Hand + Controls
         ===================================================================== */}
      <div className="h-14 shrink-0 px-4 bg-slate-950/90 border-b border-amber-500/30 flex items-center justify-between gap-3 z-30 shadow-lg">
        {/* Left: Back, Game Name, Turn & Phase Stepper */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onExitLobby}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs text-slate-300 font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Salir
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="font-extrabold text-sm text-amber-300 truncate max-w-[160px]">
              {view.gameName}
            </span>
            <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-[11px] font-bold text-white">
              T#{view.turnNumber || 0}
            </span>
          </div>

          {/* Compact Phase Stepper */}
          <div className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
            {PHASE_STEPS.map((step) => {
              const currentOrigin =
                view.phase === 'AWAITING_INPUT' ? view.originPhase : view.phase;
              const isActive = currentOrigin === step.id;
              return (
                <span
                  key={step.id}
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold transition ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Center: Opponent Portrait, Development Points & Fanned Card Backs */}
        <div className="flex items-center gap-3">
          {/* Opponent Fanned Card Backs */}
          {view.opponent && view.opponent.handCount > 0 && (
            <div
              className="hidden lg:flex items-center -space-x-3 mr-1"
              title={`Mano del rival: ${view.opponent.handCount} cartas`}
            >
              {Array.from({ length: Math.min(view.opponent.handCount, 7) }).map(
                (_, idx) => (
                  <div
                    key={idx}
                    style={{
                      transform: `rotate(${(idx - (view.opponent!.handCount - 1) / 2) * 5}deg)`,
                    }}
                    className="w-6 h-9 rounded bg-gradient-to-b from-rose-700 via-rose-900 to-slate-950 border border-amber-400/60 shadow flex items-center justify-center"
                  >
                    <div className="w-3 h-5 rounded-sm border border-amber-400/30 bg-rose-950/60" />
                  </div>
                )
              )}
            </div>
          )}

          {/* Opponent Hero Medallion */}
          <div className="flex items-center gap-2.5 px-3 py-1 rounded-xl bg-gradient-to-r from-rose-950/90 via-slate-900 to-rose-950/90 border border-rose-500/40 shadow">
            <div className="w-7 h-7 rounded-full bg-rose-600/30 border border-rose-400 flex items-center justify-center font-black text-xs text-rose-200">
              {view.opponent ? view.opponent.name.slice(0, 2).toUpperCase() : '?'}
            </div>
            <div>
              <div className="text-xs font-extrabold text-white leading-none">
                {view.opponent ? view.opponent.name : 'Esperando Rival...'}
              </div>
              <div className="flex items-center gap-2 text-[10px] text-slate-300 mt-0.5">
                <span className="text-amber-300 font-black flex items-center gap-0.5">
                  <Trophy className="w-3 h-3" />
                  {view.opponent?.developmentPoints || 0}/{view.rules.pointsToWin}
                </span>
                <span>•</span>
                <span className="text-rose-300 font-bold">
                  {oppCitizens} Ciud.
                </span>
                <span>•</span>
                <span>Mano: {view.opponent?.handCount || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Opponent Piles & Floating Drawer Toggles */}
        <div className="flex items-center gap-1.5 text-xs">
          {view.opponent && (
            <>
              <span
                className="px-2 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                title="Cartas restantes en el mazo enemigo"
              >
                Mazo: <strong>{view.opponent.deckCount}</strong>
              </span>
              <button
                onClick={() =>
                  setInspectPile({
                    title: `Descarte de ${view.opponent?.name}`,
                    cards: view.opponent?.discard || [],
                  })
                }
                className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300"
              >
                Desc. ({view.opponent.discard.length})
              </button>
            </>
          )}

          <button
            onClick={() => setShowLogDrawer((v) => !v)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold ${
              showLogDrawer
                ? 'bg-amber-500 text-slate-950 border-amber-400'
                : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5" />
            Historial
          </button>

          <button
            onClick={() => setShowRulesDrawer((v) => !v)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-400"
            title="Guía rápida de reglas"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* =====================================================================
          2. CENTER HEARTHSTONE TABLETOP ARENA (6 Tactical Rows — No Scroll!)
         ===================================================================== */}
      <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-6 py-1.5 gap-1 relative overflow-hidden">
        {/* Error Floating Banner */}
        {error && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl bg-rose-950 border-2 border-rose-500 text-rose-100 text-xs font-extrabold shadow-2xl flex items-center gap-3">
            <span>⚠️ {error}</span>
            <button
              onClick={() => setError(null)}
              className="text-rose-300 hover:text-white underline"
            >
              OK
            </button>
          </div>
        )}

        {/* OPPONENT 3 ROWS (City -> Road -> Combat) */}
        <div className="flex-1 min-h-0 grid grid-rows-3 gap-1">
          {(
            [
              { id: 'city', label: '🏰 Ciudad Enemiga' },
              { id: 'road', label: '🛣️ Camino Enemigo' },
              { id: 'combat', label: '⚔️ Zona de Combate Enemiga' },
            ] as const
          ).map((zone) => {
            const cards = view.opponent?.board[zone.id] || [];
            const isClosestAttackRow =
              Boolean(canSelectedBoardCardAttack) &&
              cards.some((c) => validCombatSet.has(c.instanceId));

            return (
              <div
                key={zone.id}
                className={`min-h-0 rounded-xl border px-3 flex items-center justify-between gap-2 relative transition ${
                  isClosestAttackRow
                    ? 'bg-rose-950/35 border-rose-500/80 shadow-[inset_0_0_20px_rgba(244,63,94,0.25)]'
                    : zone.id === 'combat'
                    ? 'bg-rose-950/15 border-rose-900/40'
                    : 'bg-slate-900/45 border-slate-800/70'
                }`}
              >
                {/* Row Label on Left */}
                <div className="w-32 shrink-0 flex flex-col">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300/80">
                    {zone.label}
                  </span>
                  <span className="text-[9px] text-slate-500">
                    {cards.length} Ciudadano(s)
                  </span>
                </div>

                {/* Cards Centered in Row */}
                <div className="flex-1 flex items-center justify-center gap-2.5 overflow-x-auto py-0.5">
                  {cards.map((inst) => {
                    const isPromptTarget =
                      isPromptForMe && validPromptSet.has(inst.instanceId);
                    const isAttackTarget =
                      Boolean(canSelectedBoardCardAttack) &&
                      validCombatSet.has(inst.instanceId);
                    const isTargetable = isPromptTarget || isAttackTarget;

                    return (
                      <CardView
                        key={inst.instanceId}
                        card={inst.definition}
                        instance={inst}
                        vitalityMode={view.rules.vitalityMode}
                        size="board"
                        isTargetable={isTargetable}
                        onMouseEnter={() =>
                          setHoveredCard({ card: inst.definition, instance: inst })
                        }
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => {
                          if (isPromptTarget) {
                            sendAction({
                              type: 'SELECT_TARGET',
                              targetCardId: inst.instanceId,
                            });
                          } else if (isAttackTarget && selectedBoardCard) {
                            sendAction({
                              type: 'ATTACK',
                              attackerId: selectedBoardCard.instanceId,
                              defenderId: inst.instanceId,
                            });
                          }
                        }}
                      />
                    );
                  })}
                </div>

                <div className="w-24 shrink-0 text-right">
                  {isClosestAttackRow && (
                    <span className="text-[10px] font-extrabold text-rose-300 animate-pulse">
                      ⚔️ Clic en enemigo para atacar
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ===================================================================
            CENTER BATTLEFRONT LINE + HEARTHSTONE "END TURN" BUTTON
           =================================================================== */}
        <div className="h-9 shrink-0 flex items-center justify-between px-3 relative">
          <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent pointer-events-none" />

          {/* Left: Citizen Majority Pill */}
          <div
            className={`relative z-10 px-3 py-1 rounded-full border text-[11px] font-extrabold shadow ${
              myCitizens > oppCitizens
                ? 'bg-emerald-950 border-emerald-400 text-emerald-300'
                : oppCitizens > myCitizens
                ? 'bg-rose-950 border-rose-400 text-rose-300'
                : 'bg-slate-900 border-slate-700 text-slate-300'
            }`}
          >
            Ciudadanos en Campo: Vos {myCitizens} vs Rival {oppCitizens}{' '}
            {myCitizens > oppCitizens && ' (+1 Pto Desarrollo al cerrar turno)'}
          </div>

          {/* Center: Turn / Prompt / Mulligan Status Pill */}
          <div className="relative z-10">
            {view.phase === 'AWAITING_INPUT' && view.pendingPrompt ? (
              <div className="px-4 py-1 rounded-full bg-rose-600 border-2 border-rose-200 text-white text-xs font-black shadow-lg flex items-center gap-2 animate-bounce">
                <Target className="w-4 h-4" />
                <span>{view.pendingPrompt.promptText}</span>
              </div>
            ) : view.phase === 'MULLIGAN' ? (
              <div className="flex items-center gap-2 bg-slate-950/95 border-2 border-amber-400 px-4 py-1 rounded-full shadow-xl">
                <span className="text-xs font-extrabold text-amber-300">
                  Mulligan: Elegí cartas de tu mano para cambiar ({mulliganIds.length})
                </span>
                {!view.you.mulliganDone ? (
                  <button
                    disabled={submitting}
                    onClick={() =>
                      sendAction({
                        type: 'MULLIGAN',
                        cardInstanceIds: mulliganIds,
                      })
                    }
                    className="px-3 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs"
                  >
                    <Check className="w-3.5 h-3.5 inline mr-1" />
                    Confirmar
                  </button>
                ) : (
                  <span className="text-xs text-emerald-400 font-bold">
                    ✓ Esperando al rival...
                  </span>
                )}
              </div>
            ) : (
              <div
                className={`px-4 py-0.5 rounded-full border text-xs font-black tracking-wide shadow ${
                  view.isYourTurn
                    ? 'bg-amber-500 text-slate-950 border-amber-200'
                    : 'bg-slate-900 text-slate-400 border-slate-700'
                }`}
              >
                {view.isYourTurn
                  ? '⚔️ TU TURNO — ELEGÍ CARTA O ATACÁ'
                  : `⏳ TURNO DE ${view.opponent?.name?.toUpperCase() || 'OPONENTE'}`}
              </div>
            )}
          </div>

          {/* Right: Hearthstone-style Big 3D End Turn Button */}
          <div className="relative z-10">
            <button
              disabled={view.phase !== 'MAIN' || !view.isYourTurn || submitting}
              onClick={() => sendAction({ type: 'END_TURN' })}
              className={`px-5 py-1.5 rounded-full font-black text-xs uppercase tracking-wider border-2 transition-all shadow-xl flex items-center gap-1.5 ${
                view.phase === 'MAIN' && view.isYourTurn
                  ? view.playsRemaining === 0 && view.movesRemaining === 0
                    ? 'bg-gradient-to-b from-emerald-400 to-emerald-600 border-emerald-100 text-slate-950 animate-pulse shadow-[0_0_20px_rgba(52,211,153,0.7)] hover:scale-105'
                    : 'bg-gradient-to-b from-amber-400 to-amber-600 border-amber-100 text-slate-950 hover:scale-105'
                  : 'bg-slate-800 border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <SkipForward className="w-4 h-4" />
              {view.phase === 'MAIN' && view.isYourTurn
                ? 'Finalizar Turno'
                : 'Turno Rival'}
            </button>
          </div>
        </div>

        {/* PLAYER 3 ROWS (Combat -> Road -> City) */}
        <div className="flex-1 min-h-0 grid grid-rows-3 gap-1">
          {(
            [
              { id: 'combat', label: '⚔️ Tu Zona de Combate' },
              { id: 'road', label: '🛣️ Tu Camino' },
              { id: 'city', label: '🏰 Tu Ciudad' },
            ] as const
          ).map((zone) => {
            const cards = view.you.board[zone.id] || [];
            const canPlayHere = canPlaySelectedCitizenInZone(zone.id);
            const canMoveHere = canMoveSelectedCitizenToZone(zone.id);
            const isInteractiveRow = canPlayHere || canMoveHere;

            return (
              <div
                key={zone.id}
                onClick={() => {
                  if (canPlayHere && selectedHandCard) {
                    sendAction({
                      type: 'PLAY_CARD',
                      cardInstanceId: selectedHandCard.instanceId,
                      targetZone: zone.id,
                    });
                  } else if (canMoveHere && selectedBoardCard) {
                    sendAction({
                      type: 'MOVE_CITIZEN',
                      cardInstanceId: selectedBoardCard.instanceId,
                      targetZone: zone.id,
                    });
                  }
                }}
                className={`min-h-0 rounded-xl border px-3 flex items-center justify-between gap-2 relative transition ${
                  isInteractiveRow
                    ? 'bg-emerald-950/40 border-emerald-400 cursor-pointer shadow-[inset_0_0_25px_rgba(16,185,129,0.3)] hover:bg-emerald-900/40'
                    : zone.id === 'combat'
                    ? 'bg-amber-950/15 border-amber-800/40'
                    : 'bg-slate-900/55 border-slate-800/80'
                }`}
              >
                {/* Row Label on Left */}
                <div className="w-36 shrink-0 flex flex-col">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300/90">
                    {zone.label}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {cards.length} Ciudadano(s)
                  </span>
                </div>

                {/* Cards Centered in Row */}
                <div className="flex-1 flex items-center justify-center gap-2.5 overflow-x-auto py-0.5">
                  {cards.map((inst) => {
                    const isPromptTarget =
                      isPromptForMe && validPromptSet.has(inst.instanceId);
                    const isSelected = selectedBoardCardId === inst.instanceId;

                    return (
                      <CardView
                        key={inst.instanceId}
                        card={inst.definition}
                        instance={inst}
                        vitalityMode={view.rules.vitalityMode}
                        size="board"
                        isSelected={isSelected}
                        isTargetable={isPromptTarget}
                        canAttack={
                          view.phase === 'MAIN' &&
                          view.isYourTurn &&
                          zone.id === 'combat'
                        }
                        canMove={
                          view.phase === 'MAIN' &&
                          view.isYourTurn &&
                          view.movesRemaining > 0
                        }
                        onMouseEnter={() =>
                          setHoveredCard({ card: inst.definition, instance: inst })
                        }
                        onMouseLeave={() => setHoveredCard(null)}
                        onClick={() => {
                          if (isPromptTarget) {
                            sendAction({
                              type: 'SELECT_TARGET',
                              targetCardId: inst.instanceId,
                            });
                            return;
                          }
                          if (view.phase === 'MAIN' && view.isYourTurn) {
                            setSelectedHandCardId(null);
                            setSelectedBoardCardId((prev) =>
                              prev === inst.instanceId ? null : inst.instanceId
                            );
                          }
                        }}
                      />
                    );
                  })}
                </div>

                {/* Right Action Prompt for Row */}
                <div className="w-40 shrink-0 flex justify-end">
                  {canPlayHere && selectedHandCard && (
                    <span className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-black text-[11px] shadow animate-bounce">
                      + Jugar en {zone.id === 'combat' ? 'Combate' : zone.id === 'road' ? 'Camino' : 'Ciudad'}
                    </span>
                  )}
                  {canMoveHere && selectedBoardCard && (
                    <span className="px-3 py-1 rounded-lg bg-sky-400 text-slate-950 font-black text-[11px] shadow flex items-center gap-1">
                      <Move className="w-3 h-3" /> Mover aquí
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ===================================================================
            FLOATING MAGNIFIED TCG CARD INSPECTOR (Left Side on Hover)
           =================================================================== */}
        {hoveredCard && (
          <div className="fixed left-5 top-1/2 -translate-y-1/2 z-50 pointer-events-none animate-fade-in">
            <CardView
              card={hoveredCard.card}
              instance={hoveredCard.instance}
              vitalityMode={view.rules.vitalityMode}
              size="lg"
            />
          </div>
        )}
      </div>

      {/* =====================================================================
          3. BOTTOM TRAY: Player Hero Stats + Hearthstone Fanned TCG Hand + Deck
         ===================================================================== */}
      <div className="h-[178px] shrink-0 px-4 bg-gradient-to-t from-slate-950 via-slate-950/95 to-slate-900/80 border-t-2 border-amber-500/40 flex items-center justify-between gap-4 relative z-30">
        {/* Left Wing: Player Portrait, Development Points & Action Mana Gems */}
        <div className="w-64 shrink-0 flex flex-col gap-2">
          <div className="flex items-center gap-3 p-2.5 rounded-2xl bg-slate-900/95 border border-amber-500/40 shadow-inner">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-b from-amber-400 to-amber-700 text-slate-950 font-black text-sm flex items-center justify-center border-2 border-amber-200 shadow">
              {view.you.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-extrabold text-sm text-white truncate">
                {view.you.name}
              </div>
              <div className="flex items-center gap-2 text-xs mt-0.5">
                <span className="text-amber-400 font-black flex items-center gap-1">
                  <Trophy className="w-3.5 h-3.5" />
                  {view.you.developmentPoints} / {view.rules.pointsToWin} Pts
                </span>
              </div>
            </div>
          </div>

          {/* Plays & Move Gems (Hearthstone Mana Tray style) */}
          <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Jugadas:</span>
              <div className="flex items-center gap-1">
                {Array.from({
                  length:
                    view.turnNumber === 1
                      ? view.rules.firstTurnMaxPlays
                      : view.rules.maxPlaysPerTurn,
                }).map((_, i) => (
                  <span
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border ${
                      i < view.playsRemaining
                        ? 'bg-amber-400 border-amber-100 shadow-[0_0_8px_#f59e0b]'
                        : 'bg-slate-800 border-slate-700'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-semibold">Mov.:</span>
              <span
                className={`w-3.5 h-3.5 rounded-md border ${
                  view.movesRemaining > 0
                    ? 'bg-sky-400 border-sky-100 shadow-[0_0_8px_#38bdf8]'
                    : 'bg-slate-800 border-slate-700'
                }`}
              />
            </div>
          </div>
        </div>

        {/* Center: FANNED TCG HAND (Hearthstone Arc & Pop-Up on Hover/Select) */}
        <div className="flex-1 flex flex-col items-center justify-end h-full relative">
          {/* Action button for selected Event card */}
          {selectedHandCard &&
            selectedHandCard.definition.type === 'event' &&
            view.phase === 'MAIN' &&
            view.isYourTurn &&
            view.playsRemaining > 0 && (
              <div className="absolute -top-11 z-50">
                <button
                  disabled={submitting}
                  onClick={() =>
                    sendAction({
                      type: 'PLAY_CARD',
                      cardInstanceId: selectedHandCard.instanceId,
                    })
                  }
                  className="flex items-center gap-2 px-5 py-2 rounded-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 border-2 border-purple-200 text-white font-black text-xs shadow-[0_0_25px_rgba(168,85,247,0.8)] animate-bounce"
                >
                  <Flame className="w-4 h-4" />
                  Lanzar Evento: {selectedHandCard.definition.name}
                </button>
              </div>
            )}

          <div className="flex items-end justify-center -space-x-5 pb-1 pt-2 px-6 overflow-visible">
            {handCards.map((inst, idx) => {
              const isMulliganSelected =
                view.phase === 'MULLIGAN' &&
                mulliganIds.includes(inst.instanceId);
              const isMainSelected =
                view.phase === 'MAIN' && selectedHandCardId === inst.instanceId;
              const isSelected = isMulliganSelected || isMainSelected;

              const mid = (handCards.length - 1) / 2;
              const offset = idx - mid;
              const rotateDeg = offset * 3.5;
              const translateY = Math.abs(offset) * 3;

              return (
                <div
                  key={inst.instanceId}
                  style={{
                    transform: isSelected
                      ? 'translateY(-28px) scale(1.12)'
                      : `translateY(${translateY}px) rotate(${rotateDeg}deg)`,
                  }}
                  className="transition-all duration-200 hover:!translate-y-[-32px] hover:!rotate-0 hover:!scale-115 hover:z-50"
                >
                  <CardView
                    card={inst.definition}
                    instance={inst}
                    vitalityMode={view.rules.vitalityMode}
                    size="hand"
                    isSelected={isSelected}
                    onMouseEnter={() =>
                      setHoveredCard({ card: inst.definition, instance: inst })
                    }
                    onMouseLeave={() => setHoveredCard(null)}
                    onClick={() => {
                      if (view.phase === 'MULLIGAN' && !view.you.mulliganDone) {
                        toggleMulliganCard(inst.instanceId);
                        return;
                      }
                      if (view.phase === 'MAIN' && view.isYourTurn) {
                        setSelectedBoardCardId(null);
                        setSelectedHandCardId((prev) =>
                          prev === inst.instanceId ? null : inst.instanceId
                        );
                      }
                    }}
                    footerAction={
                      view.phase === 'MULLIGAN' ? (
                        <div
                          className={`text-[8px] font-black text-center py-0.5 rounded ${
                            isMulliganSelected
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {isMulliganSelected ? '↻ CAMBIAR' : 'CONSERVAR'}
                        </div>
                      ) : undefined
                    }
                  />
                </div>
              );
            })}

            {handCards.length === 0 && (
              <div className="text-xs text-slate-500 italic pb-12">
                Mano vacía
              </div>
            )}
          </div>
        </div>

        {/* Right Wing: Deck Stack, Discard & Exile */}
        <div className="w-56 shrink-0 flex items-center justify-end gap-2.5">
          {/* Physical Deck Card Stack */}
          <div
            title={`Tu Mazo: ${view.you.deckCount} cartas restantes`}
            className="w-20 h-28 rounded-xl bg-gradient-to-b from-amber-600 via-amber-800 to-slate-950 border-2 border-amber-300/70 shadow-xl flex flex-col items-center justify-center p-2 text-center relative"
          >
            <Layers className="w-5 h-5 text-amber-200 mb-1" />
            <span className="text-[10px] uppercase font-extrabold text-amber-100">
              Mazo
            </span>
            <span className="text-lg font-black text-white leading-tight">
              {view.you.deckCount}
            </span>
          </div>

          {/* Discard & Exile Stack Buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() =>
                setInspectPile({
                  title: 'Tu Pila de Descarte',
                  cards: view.you.discard,
                })
              }
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-between gap-2"
            >
              <span>Descarte</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-amber-300 font-black">
                {view.you.discard.length}
              </span>
            </button>

            <button
              onClick={() =>
                setInspectPile({
                  title: 'Tu Zona de Exilio',
                  cards: view.you.exile,
                })
              }
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 flex items-center justify-between gap-2"
            >
              <span>Exilio</span>
              <span className="px-1.5 py-0.2 rounded bg-slate-800 text-purple-300 font-black">
                {view.you.exile.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          4. OVERLAYS & FLOATING DRAWERS (Waiting / GameOver / Prompt / Log)
         ===================================================================== */}

      {/* Waiting for 2nd Player Overlay */}
      {view.phase === 'WAITING_FOR_PLAYERS' && (
        <div className="fixed inset-0 z-40 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-amber-500/60 rounded-2xl max-w-md w-full p-6 text-center space-y-3 shadow-2xl">
            <Users className="w-12 h-12 text-amber-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-black text-white">
              Esperando Oponente en "{view.gameName}"
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              La URL de tu navegador ya guarda el ID de la sala y tu jugador en el hash (<code className="text-amber-300">{window.location.hash}</code>), por lo que podés refrescar sin salir de la partida.
            </p>
            <p className="text-xs text-slate-400">
              Abrí otra pestaña o compartí el lobby para que el segundo jugador se una.
            </p>
          </div>
        </div>
      )}

      {/* Game Over Victory / Defeat Overlay */}
      {view.phase === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400 rounded-3xl max-w-md w-full p-8 text-center space-y-4 shadow-[0_0_50px_rgba(251,191,36,0.4)]">
            <Crown className="w-16 h-16 text-amber-400 mx-auto" />
            <h2 className="text-3xl font-black text-white tracking-tight">
              {view.winnerId === playerId ? '¡VICTORIA!' : 'DERROTA'}
            </h2>
            <p className="text-sm text-amber-200 font-semibold">
              {view.winReason}
            </p>
            <button
              onClick={onExitLobby}
              className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-lg"
            >
              Volver al Lobby
            </button>
          </div>
        </div>
      )}

      {/* Off-Board Target Picker Modal (Misión de Investigación / El regreso del Sobreviviente) */}
      {isPromptForMe && isOffBoardPrompt && view.pendingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-extrabold uppercase text-amber-400">
                  Selección de Carta ({view.pendingPrompt.sourceCardName})
                </span>
                <h3 className="text-lg font-bold text-white">
                  {view.pendingPrompt.promptText}
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-h-[65vh] overflow-y-auto p-2">
              {(view.pendingPrompt.candidateCards || []).map((cand) => (
                <div key={cand.instanceId} className="flex justify-center">
                  <CardView
                    card={cand.definition}
                    instance={cand}
                    vitalityMode={view.rules.vitalityMode}
                    size="md"
                    isTargetable
                    onClick={() =>
                      sendAction({
                        type: 'SELECT_TARGET',
                        targetCardId: cand.instanceId,
                      })
                    }
                    footerAction={
                      <div className="text-[10px] font-extrabold text-center py-1 rounded bg-amber-500 text-slate-950">
                        Elegir esta carta
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Discard / Exile Inspector Modal */}
      {inspectPile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {inspectPile.title} ({inspectPile.cards.length})
                </h3>
              </div>
              <button
                onClick={() => setInspectPile(null)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 font-semibold"
              >
                Cerrar
              </button>
            </div>

            {inspectPile.cards.length === 0 ? (
              <p className="text-center text-xs text-slate-500 py-12">
                Esta zona está vacía.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 max-h-[60vh] overflow-y-auto p-2">
                {inspectPile.cards.map((c) => (
                  <div key={c.instanceId} className="flex justify-center">
                    <CardView card={c.definition} instance={c} size="md" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Slide-Over Battle Log Drawer */}
      {showLogDrawer && (
        <div className="fixed right-3 top-16 bottom-48 w-80 z-40 bg-slate-950/95 border border-amber-500/40 rounded-2xl p-4 flex flex-col shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="text-xs font-extrabold uppercase text-amber-400 flex items-center gap-1.5">
              <ScrollText className="w-4 h-4" /> Registro de Batalla
            </span>
            <button
              onClick={() => setShowLogDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
            {[...(view.log || [])].reverse().map((entry, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg bg-slate-900 border border-slate-800 leading-snug"
              >
                <span className="text-amber-400 font-bold mr-1">
                  [T{entry.turn}]
                </span>
                <span className="text-slate-200">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Slide-Over Quick Rules Drawer */}
      {showRulesDrawer && (
        <div className="fixed right-3 top-16 w-80 z-40 bg-slate-950/95 border border-amber-500/40 rounded-2xl p-4 space-y-2 text-xs shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-extrabold text-amber-400 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> Resumen de Reglas
            </span>
            <button
              onClick={() => setShowRulesDrawer(false)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-300 leading-relaxed">
            <li>
              • <strong>Victoria:</strong> Al final de tu turno, si tenés más Ciudadanos en el tablero que tu rival, ganás <strong>+1 Punto de Desarrollo</strong> (Meta: {view.rules.pointsToWin}).
            </li>
            <li>
              • <strong>Jugar Cartas:</strong> Hasta 3 por turno (2 en el Turno 1). Podés jugar en <em>Ciudad</em> o <em>Camino</em> (y en <em>Combate</em> solo si el rival tiene cartas allí).
            </li>
            <li>
              • <strong>Movimiento:</strong> 1 Ciudadano por turno (que no haya sido jugado este turno) a una fila adyacente.
            </li>
            <li>
              • <strong>Combate:</strong> Cada Ciudadano en tu <em>Zona de Combate</em> puede atacar 1 vez por turno a la fila enemiga ocupada más cercana.
            </li>
          </ul>
        </div>
      )}
    </div>
  );
};
