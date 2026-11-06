import React, { useEffect, useMemo, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  Flame,
  Info,
  Layers,
  Move,
  ScrollText,
  Shield,
  SkipForward,
  Skull,
  Sparkles,
  Swords,
  Target,
  Users,
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
  { id: 'MULLIGAN', label: 'I. Mulligan' },
  { id: 'START_OF_TURN', label: 'II. Albor' },
  { id: 'MAIN', label: 'III. Batalla' },
  { id: 'END_OF_TURN', label: 'IV. Cierre' },
];

function areAdjacent(from: ZoneID, to: ZoneID): boolean {
  if (from === 'city' && to === 'road') return true;
  if (from === 'road' && (to === 'city' || to === 'combat')) return true;
  if (from === 'combat' && to === 'road') return true;
  return false;
}

function getZoneSurfaceClasses(
  zone: 'city' | 'road' | 'combat',
  isHighlighted: boolean
): string {
  if (isHighlighted) {
    return 'zone-trench-grid bg-gradient-to-r from-[#1f3622]/95 via-[#29472d]/90 to-[#1f3622]/95 border-2 border-[#f3d46b] shadow-[inset_0_0_26px_rgba(243,212,107,0.4)] cursor-pointer';
  }
  switch (zone) {
    case 'city':
      // La Ciudad: Stone/Citadel sanctuary tone with bluish-gold stone border
      return 'zone-trench-grid bg-gradient-to-r from-[#161920]/95 via-[#1e232d]/90 to-[#161920]/95 border-2 border-[#756342]/85';
    case 'road':
      // El Camino: Earth/Dusty path tone with weathered dashed border
      return 'zone-trench-grid bg-gradient-to-r from-[#221a14]/95 via-[#2c2219]/90 to-[#221a14]/95 border border-dashed border-[#7a634b]';
    case 'combat':
      // Zona de Combate: Danger/Ember dark crimson glow
      return 'zone-trench-grid bg-[radial-gradient(ellipse_at_center,rgba(125,30,24,0.36)_0%,rgba(24,14,12,0.95)_85%)] border border-[#8f342c]/90';
  }
}

/* Large low-opacity watermark SVG centered in each row */
const ZoneWatermark: React.FC<{ zone: 'city' | 'road' | 'combat' }> = ({ zone }) => {
  if (zone === 'city') {
    // Castle / Citadel Battlements Watermark
    return (
      <svg
        viewBox="0 0 200 80"
        className="w-40 h-16 text-[#e3c158] opacity-[0.045] pointer-events-none select-none"
        fill="currentColor"
      >
        <path d="M20,75 L20,30 L30,30 L30,40 L40,40 L40,30 L50,30 L50,50 L75,50 L75,15 L85,15 L85,25 L95,25 L95,15 L105,15 L105,25 L115,25 L115,15 L125,15 L125,50 L150,50 L150,30 L160,30 L160,40 L170,40 L170,30 L180,30 L180,75 Z" />
      </svg>
    );
  }
  if (zone === 'road') {
    // Compass Rose & Wayfinder Watermark
    return (
      <svg
        viewBox="0 0 200 80"
        className="w-40 h-16 text-[#d6c7b8] opacity-[0.045] pointer-events-none select-none"
        fill="currentColor"
      >
        <circle cx="100" cy="40" r="28" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="8 6" />
        <polygon points="100,4 108,32 136,40 108,48 100,76 92,48 64,40 92,32" />
      </svg>
    );
  }
  // Combat Zone: Crossed Broadswords & Shield Watermark
  return (
    <svg
      viewBox="0 0 200 80"
      className="w-40 h-16 text-[#f87171] opacity-[0.05] pointer-events-none select-none"
      fill="currentColor"
    >
      <path d="M55,10 L145,70 M145,10 L55,70" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
      <path d="M100,14 L122,22 L118,52 L100,68 L82,52 L78,22 Z" />
    </svg>
  );
};

/* Ornate Bronze/Iron SVG Corner Filigree for the War-Table Frame */
const BoardCornerFiligree: React.FC<{ position: 'tl' | 'tr' | 'bl' | 'br' }> = ({
  position,
}) => {
  const posClass =
    position === 'tl'
      ? 'top-0 left-0'
      : position === 'tr'
      ? 'top-0 right-0 scale-x-[-1]'
      : position === 'bl'
      ? 'bottom-0 left-0 scale-y-[-1]'
      : 'bottom-0 right-0 scale-[-1]';

  return (
    <svg
      viewBox="0 0 32 32"
      className={`w-6 h-6 absolute ${posClass} text-[#c59b27] opacity-80 pointer-events-none z-20`}
      fill="currentColor"
    >
      <path d="M0,0 L28,0 L24,4 L6,4 L6,22 L0,28 Z" />
      <circle cx="10" cy="10" r="2.5" />
    </svg>
  );
};

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

  // Hover card for magnified TCG inspection preview
  const [hoveredCard, setHoveredCard] = useState<{
    card: CardDefinition;
    instance?: CardInstance;
  } | null>(null);

  // Mulligan selection
  const [mulliganIds, setMulliganIds] = useState<string[]>([]);

  // Collapsible Quick Guide Accordion in the right sidebar (collapsed by default)
  const [guideOpen, setGuideOpen] = useState(false);

  // Discard / Exile Inspector Modal
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
        // Ignore transient hiccups
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
  const pointsGoal = Math.max(1, view.rules.pointsToWin || 10);
  const myPct = Math.min(100, Math.round((view.you.developmentPoints / pointsGoal) * 100));
  const oppPct = Math.min(
    100,
    Math.round(((view.opponent?.developmentPoints || 0) / pointsGoal) * 100)
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#0e0c0a] text-[#e7dfd3] select-none relative">
      {/* =====================================================================
          1. PROMINENT GAME HUD HEADER (Facing Shields Victory Meter 0/10)
         ===================================================================== */}
      <header className="h-14 shrink-0 px-3 bg-gradient-to-b from-[#28211b] to-[#16120f] border-b-2 border-[#6b5a48] flex items-center justify-between gap-2 z-30 shadow-[0_6px_20px_rgba(0,0,0,0.9)]">
        {/* Left: Exit + Match Title + Phase Stepper */}
        <div className="flex items-center gap-2">
          <button
            onClick={onExitLobby}
            className="btn-war-iron flex items-center gap-1 px-2.5 py-1 rounded text-[11px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#e3c158]" /> Bastión
          </button>

          <div className="hidden sm:flex items-center gap-1.5">
            <span className="font-display font-bold text-xs text-[#f3d46b] truncate max-w-[140px]">
              {view.gameName}
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-[#12100e] border border-[#6b5a48] font-display text-[10px] font-bold text-[#e7dfd3]">
              T#{view.turnNumber || 0}
            </span>
          </div>

          <div className="hidden xl:flex items-center gap-1 bg-[#12100e] px-1.5 py-0.5 rounded border border-[#4a3f35]">
            {PHASE_STEPS.map((step) => {
              const currentOrigin =
                view.phase === 'AWAITING_INPUT' ? view.originPhase : view.phase;
              const isActive = currentOrigin === step.id;
              return (
                <span
                  key={step.id}
                  className={`px-2 py-0.5 rounded-sm font-display text-[9px] font-bold transition ${
                    isActive
                      ? 'bg-gradient-to-b from-[#f3d46b] to-[#966e15] text-[#12100e] shadow'
                      : 'text-[#8c7e70]'
                  }`}
                >
                  {step.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* CENTERPIECE: Facing Shields / Banners Victory Meter (0/10 Pts + Progress Bars) */}
        <div className="flex items-center gap-3 bg-gradient-to-b from-[#1a1512] to-[#0f0c0a] border-2 border-[#c59b27]/80 px-3.5 py-1 rounded-lg shadow-[0_4px_16px_rgba(0,0,0,0.9),inset_0_1px_0_rgba(255,255,255,0.15)]">
          {/* Player Blue/Gold Banner */}
          <div className="flex items-center gap-2.5">
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span className="font-display font-bold text-xs text-[#f7efe0] truncate max-w-[100px]">
                  {view.you.name}
                </span>
                <span className="text-[10px] font-display font-bold text-[#93c5fd] bg-[#172536] border border-[#3b82f6]/50 px-1.5 rounded-sm">
                  {myCitizens} Ciud.
                </span>
              </div>
              {/* Progress Bar towards 10 pts */}
              <div className="w-28 h-1.5 rounded-full bg-[#26201a] border border-[#574c3f] overflow-hidden mt-1 ml-auto">
                <div
                  style={{ width: `${myPct}%` }}
                  className="h-full bg-gradient-to-r from-[#3b82f6] to-[#f3d46b] transition-all duration-300"
                />
              </div>
            </div>

            {/* Player Shield Score */}
            <div className="w-11 h-10 rounded-md bg-gradient-to-b from-[#1e3a5f] to-[#0f1d33] border-2 border-[#f3d46b] flex flex-col items-center justify-center shadow-lg">
              <span className="font-display font-black text-lg text-[#fef08a] leading-none">
                {view.you.developmentPoints}
              </span>
              <span className="font-display text-[8px] text-[#93c5fd] leading-none mt-0.5">
                /{pointsGoal}
              </span>
            </div>
          </div>

          {/* Center Crown / Duel Emblem */}
          <div className="flex flex-col items-center px-1">
            <Crown className="w-4 h-4 text-[#f3d46b]" />
            <span className="font-display text-[8px] font-bold uppercase tracking-widest text-[#c59b27]">
              Victoria
            </span>
          </div>

          {/* Opponent Crimson Shield Banner */}
          <div className="flex items-center gap-2.5">
            {/* Opponent Shield Score */}
            <div className="w-11 h-10 rounded-md bg-gradient-to-b from-[#6e1414] to-[#2e0808] border-2 border-[#f87171] flex flex-col items-center justify-center shadow-lg">
              <span className="font-display font-black text-lg text-[#fecaca] leading-none">
                {view.opponent?.developmentPoints || 0}
              </span>
              <span className="font-display text-[8px] text-[#fca5a5] leading-none mt-0.5">
                /{pointsGoal}
              </span>
            </div>

            <div className="text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-display font-bold text-[#fca5a5] bg-[#361515] border border-[#ef4444]/50 px-1.5 rounded-sm">
                  {oppCitizens} Ciud.
                </span>
                <span className="font-display font-bold text-xs text-[#d6c7b8] truncate max-w-[100px]">
                  {view.opponent ? view.opponent.name : 'Aguardando...'}
                </span>
              </div>
              {/* Progress Bar towards 10 pts */}
              <div className="w-28 h-1.5 rounded-full bg-[#26201a] border border-[#574c3f] overflow-hidden mt-1">
                <div
                  style={{ width: `${oppPct}%` }}
                  className="h-full bg-gradient-to-r from-[#ef4444] to-[#f97316] transition-all duration-300"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Vitality Mode Badge & Opponent Reserves */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="hidden md:inline-block px-2 py-0.5 rounded-sm bg-[#1a1613] border border-[#574c3f] text-[#d6c7b8] font-display text-[10px]">
            {view.rules.vitalityMode === 'base_attack' ? 'Fuerza Base' : 'V Dinámica'}
          </span>
          {view.opponent && (
            <span className="px-2.5 py-0.5 rounded-sm bg-[#241b17] border border-[#6b5a48] text-[#f3ead8] font-display text-[10px]">
              Mano Rival: <strong>{view.opponent.handCount}</strong>
            </span>
          )}
        </div>
      </header>

      {/* =====================================================================
          2. MAIN WORKSPACE: Framed 6-Row War Table + Dedicated Hand Dock + Right Chronicle
         ===================================================================== */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT / CENTER COLUMN: Inlaid War-Table Frame (Top) + Dedicated Hand Dock (Bottom) */}
        <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-6 pt-2 pb-1 gap-1.5 relative overflow-hidden">
          {/* Error Banner */}
          {error && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded bg-[#451210] border-2 border-[#ef4444] text-[#fecaca] text-xs font-display font-bold shadow-2xl flex items-center gap-3">
              <span>⚠️ {error}</span>
              <button
                onClick={() => setError(null)}
                className="text-white underline text-[11px]"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* =================================================================
              ORNATE DOUBLE-BORDERED WAR-TABLE FRAME (Wraps the 6 Zones)
             ================================================================= */}
          <div className="flex-1 min-h-0 max-w-[1180px] w-full mx-auto rounded-lg p-2 bg-gradient-to-b from-[#231d17] via-[#181410] to-[#231d17] border-2 border-[#78644d] shadow-[0_12px_32px_rgba(0,0,0,0.95),inset_0_0_24px_rgba(0,0,0,0.9)] flex flex-col gap-1 relative">
            {/* Inner Gold Filigree Border & 4 Corner Ornaments */}
            <div className="absolute inset-1 rounded border border-[#c59b27]/35 pointer-events-none" />
            <BoardCornerFiligree position="tl" />
            <BoardCornerFiligree position="tr" />
            <BoardCornerFiligree position="bl" />
            <BoardCornerFiligree position="br" />

            {/* OPPONENT 3 ROWS (City -> Road -> Combat) */}
            <div className="flex-1 min-h-0 grid grid-rows-3 gap-1 relative z-10">
              {(
                [
                  { id: 'city', label: 'La Ciudad', subtitle: 'Baluarte Enemigo' },
                  { id: 'road', label: 'El Camino', subtitle: 'Sendero Enemigo' },
                  { id: 'combat', label: 'Zona de Combate', subtitle: 'Vanguardia Enemiga' },
                ] as const
              ).map((zone) => {
                const cards = view.opponent?.board[zone.id] || [];
                const isClosestAttackRow =
                  Boolean(canSelectedBoardCardAttack) &&
                  cards.some((c) => validCombatSet.has(c.instanceId));

                return (
                  <div
                    key={zone.id}
                    className={`min-h-0 rounded px-3 flex items-center justify-between gap-2 relative overflow-hidden transition ${getZoneSurfaceClasses(
                      zone.id,
                      isClosestAttackRow
                    )}`}
                  >
                    {/* Centered Background Watermark SVG */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <ZoneWatermark zone={zone.id} />
                    </div>

                    {/* Zone Crest & Title */}
                    <div className="w-36 shrink-0 flex flex-col border-r border-[#6b5a48]/40 pr-2 relative z-10">
                      <span className="font-display font-bold text-[11px] text-[#e7dfd3] tracking-wider uppercase leading-tight">
                        {zone.label}
                      </span>
                      <span className="text-[9px] text-[#a89b8c]">
                        {zone.subtitle} • {cards.length}
                      </span>
                    </div>

                    {/* Units in Row */}
                    <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto py-0.5 relative z-10">
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

                    <div className="w-28 shrink-0 text-right relative z-10">
                      {isClosestAttackRow && (
                        <span className="font-display text-[10px] font-bold text-[#fca5a5] animate-pulse">
                          ⚔️ Al alcance
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ===============================================================
                BATTLEFRONT RIFT + CENTERPIECE "FINALIZAR TURNO" MEDALLION
               =============================================================== */}
            <div className="h-9 shrink-0 flex items-center justify-between px-3 relative z-20 my-0.5">
              {/* Scorched Battle Rift Line */}
              <div className="absolute inset-x-2 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-transparent via-[#991b1b] to-transparent shadow-[0_0_14px_#dc2626] pointer-events-none" />
              <div className="absolute inset-x-16 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#f3d46b]/80 to-transparent pointer-events-none" />

              {/* Left: Majority Indicator */}
              <div
                className={`relative z-10 px-3 py-0.5 rounded-sm border font-display text-[10px] font-bold shadow-lg ${
                  myCitizens > oppCitizens
                    ? 'bg-[#17291b] border-[#f3d46b] text-[#f3d46b]'
                    : oppCitizens > myCitizens
                    ? 'bg-[#2b1412] border-[#ef4444] text-[#fca5a5]'
                    : 'bg-[#1c1815] border-[#6b5a48] text-[#d6c7b8]'
                }`}
              >
                {myCitizens > oppCitizens
                  ? `Dominio del Bastión: ${myCitizens} vs ${oppCitizens} (+1 Pto al cerrar)`
                  : oppCitizens > myCitizens
                  ? `Asedio Rival: ${oppCitizens} vs ${myCitizens}`
                  : `Frente Igualado: ${myCitizens} vs ${oppCitizens}`}
              </div>

              {/* Center: Active Prompt / Mulligan / Battlefront Crest */}
              <div className="relative z-10">
                {view.phase === 'AWAITING_INPUT' && view.pendingPrompt ? (
                  <div className="px-4 py-1 rounded bg-[#7f1d1d] border-2 border-[#fca5a5] text-[#fef2f2] font-display text-[11px] font-bold shadow-xl flex items-center gap-1.5 animate-pulse">
                    <Target className="w-3.5 h-3.5 text-[#fde047]" />
                    <span>{view.pendingPrompt.promptText}</span>
                  </div>
                ) : view.phase === 'MULLIGAN' ? (
                  <div className="flex items-center gap-2 bg-[#1c1713] border-2 border-[#f3d46b] px-3.5 py-0.5 rounded shadow-xl">
                    <span className="font-display text-[11px] font-bold text-[#f3d46b]">
                      Mulligan ({mulliganIds.length} marcadas)
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
                        className="btn-war-gold px-3 py-0.5 rounded text-[10px]"
                      >
                        <Check className="w-3 h-3 inline mr-1" />
                        Confirmar
                      </button>
                    ) : (
                      <span className="text-[10px] font-display text-[#86efac]">
                        ✓ Aguardando al rival...
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="px-3.5 py-0.5 rounded-sm bg-[#1c1612] border border-[#8a6d1b] font-display text-[10px] font-bold text-[#f3d46b] flex items-center gap-1.5 shadow-lg">
                    <Swords className="w-3.5 h-3.5 text-[#f3d46b]" />
                    <span>
                      {view.isYourTurn
                        ? 'FRENTE DE BATALLA — TU TURNO'
                        : `TURNO DE ${view.opponent?.name?.toUpperCase() || 'OPONENTE'}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Right: Prominent Centerpiece "Finalizar Turno" Button */}
              <div className="relative z-10">
                <button
                  disabled={view.phase !== 'MAIN' || !view.isYourTurn || submitting}
                  onClick={() => sendAction({ type: 'END_TURN' })}
                  className={`btn-war-gold px-5 py-1.5 rounded-md text-xs border-2 border-[#fef08a] shadow-[0_6px_20px_rgba(0,0,0,0.95)] flex items-center gap-1.5 ${
                    view.phase === 'MAIN' &&
                    view.isYourTurn &&
                    view.playsRemaining === 0
                      ? 'animate-pulse ring-2 ring-[#fef08a] shadow-[0_0_24px_rgba(243,212,107,0.9)]'
                      : ''
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
            <div className="flex-1 min-h-0 grid grid-rows-3 gap-1 relative z-10">
              {(
                [
                  { id: 'combat', label: 'Zona de Combate', subtitle: 'Tu Vanguardia' },
                  { id: 'road', label: 'El Camino', subtitle: 'Tu Ruta de Marcha' },
                  { id: 'city', label: 'La Ciudad', subtitle: 'Tu Bastión Interior' },
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
                    className={`min-h-0 rounded px-3 flex items-center justify-between gap-2 relative overflow-hidden transition ${getZoneSurfaceClasses(
                      zone.id,
                      isInteractiveRow
                    )}`}
                  >
                    {/* Centered Background Watermark SVG */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <ZoneWatermark zone={zone.id} />
                    </div>

                    {/* Zone Crest & Title */}
                    <div className="w-36 shrink-0 flex flex-col border-r border-[#6b5a48]/40 pr-2 relative z-10">
                      <span className="font-display font-bold text-[11px] text-[#f3d46b] tracking-wider uppercase leading-tight">
                        {zone.label}
                      </span>
                      <span className="text-[9px] text-[#a89b8c]">
                        {zone.subtitle} • {cards.length}
                      </span>
                    </div>

                    {/* Units in Row */}
                    <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto py-0.5 relative z-10">
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

                    {/* Action Indicator on Right */}
                    <div className="w-36 shrink-0 flex justify-end relative z-10">
                      {canPlayHere && selectedHandCard && (
                        <span className="btn-war-gold px-2.5 py-0.5 rounded text-[10px]">
                          + Desplegar aquí
                        </span>
                      )}
                      {canMoveHere && selectedBoardCard && (
                        <span className="btn-war-iron border-[#f3d46b] px-2.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                          <Move className="w-3 h-3 text-[#f3d46b]" /> Marchar aquí
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* =================================================================
              DEDICATED BOTTOM HAND DOCK (Never covers "Tu Ciudad"!)
             ================================================================= */}
          <div className="h-[130px] shrink-0 max-w-[1180px] w-full mx-auto relative flex flex-col items-center justify-end z-30">
            {/* Execute Event Button when an Event card is selected */}
            {selectedHandCard &&
              selectedHandCard.definition.type === 'event' &&
              view.phase === 'MAIN' &&
              view.isYourTurn &&
              view.playsRemaining > 0 && (
                <div className="absolute -top-9 z-50">
                  <button
                    disabled={submitting}
                    onClick={() =>
                      sendAction({
                        type: 'PLAY_CARD',
                        cardInstanceId: selectedHandCard.instanceId,
                      })
                    }
                    className="btn-war-gold px-5 py-1 rounded-md text-xs flex items-center gap-2 shadow-[0_0_24px_rgba(243,212,107,0.85)]"
                  >
                    <Flame className="w-4 h-4" />
                    Ejecutar Decreto: {selectedHandCard.definition.name}
                  </button>
                </div>
              )}

            {/* Fanned CCG Hand sitting inside the dedicated dock */}
            <div className="flex items-end justify-center -space-x-5 px-6">
              {handCards.map((inst, idx) => {
                const isMulliganSelected =
                  view.phase === 'MULLIGAN' &&
                  mulliganIds.includes(inst.instanceId);
                const isMainSelected =
                  view.phase === 'MAIN' && selectedHandCardId === inst.instanceId;
                const isSelected = isMulliganSelected || isMainSelected;

                const mid = (handCards.length - 1) / 2;
                const offset = idx - mid;
                const rotateDeg = offset * 2.5;
                const arcDropY = Math.abs(offset) * 2 + 56; // Docked cleanly below La Ciudad, rises on hover!

                return (
                  <div
                    key={inst.instanceId}
                    style={{
                      transform: isSelected
                        ? 'translateY(-12px) scale(1.06) rotate(0deg)'
                        : `translateY(${arcDropY}px) rotate(${rotateDeg}deg)`,
                    }}
                    className="transition-all duration-200 ease-out hover:!-translate-y-12 hover:!scale-110 hover:!rotate-0 hover:z-50"
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
                            className={`font-display text-[8px] font-black text-center py-0.5 rounded-sm ${
                              isMulliganSelected
                                ? 'bg-[#f3d46b] text-[#12100e]'
                                : 'bg-[#26211d] text-[#a89b8c]'
                            }`}
                          >
                            {isMulliganSelected ? '↻ REEMPLAZAR' : 'CONSERVAR'}
                          </div>
                        ) : undefined
                      }
                    />
                  </div>
                );
              })}

              {handCards.length === 0 && (
                <div className="font-serif italic text-xs text-[#8c7e70] pb-10">
                  Sin cartas en la mano
                </div>
              )}
            </div>
          </div>

          {/* Magnified TCG Card Preview on Hover (Left Edge) */}
          {hoveredCard && (
            <div className="fixed left-4 top-16 z-50 pointer-events-none">
              <CardView
                card={hoveredCard.card}
                instance={hoveredCard.instance}
                vitalityMode={view.rules.vitalityMode}
                size="lg"
              />
            </div>
          )}
        </div>

        {/* ===================================================================
            3. NARROW RIGHT SIDEBAR (w-64, Dark Parchment Chronicle + Visual Card Stacks)
           =================================================================== */}
        <aside className="w-64 shrink-0 bg-gradient-to-b from-[#211b16] via-[#181411] to-[#100d0b] border-l-2 border-[#6b5a48] flex flex-col justify-between z-30 shadow-[-8px_0_24px_rgba(0,0,0,0.85)]">
          {/* Top Section: Action Seals + Collapsible Guide Accordion */}
          <div className="p-3 space-y-2.5 border-b border-[#4a3f35]">
            <div className="p-2.5 rounded bg-[#14110e] border border-[#6b5a48]/80 space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-bold text-[#d6c7b8] text-[10px] uppercase">
                  Jugadas del Turno
                </span>
                <div className="flex items-center gap-1.5">
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
                          ? 'bg-gradient-to-b from-[#f3d46b] to-[#966e15] border-[#fef9c3] shadow-[0_0_8px_#e3c158]'
                          : 'bg-[#26211d] border-[#473c33]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-bold text-[#d6c7b8] text-[10px] uppercase">
                  Marcha Adyacente
                </span>
                <span
                  className={`px-2 py-0.2 rounded-sm font-display font-bold text-[10px] border ${
                    view.movesRemaining > 0
                      ? 'bg-[#2b2216] border-[#f3d46b] text-[#f3d46b]'
                      : 'bg-[#1a1613] border-[#3a322a] text-[#6e6053]'
                  }`}
                >
                  {view.movesRemaining} disp.
                </span>
              </div>
            </div>

            {/* Collapsible Quick Guide Accordion */}
            <div className="rounded bg-[#16120f] border border-[#574c3f]">
              <button
                type="button"
                onClick={() => setGuideOpen((v) => !v)}
                className="w-full px-2.5 py-1.5 flex items-center justify-between text-left font-display text-[10px] font-bold text-[#e3c158] hover:text-[#fef08a]"
              >
                <span className="flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5" /> Guía Rápida de Turno
                </span>
                {guideOpen ? (
                  <ChevronUp className="w-3.5 h-3.5" />
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
              {guideOpen && (
                <ul className="px-2.5 pb-2.5 pt-1 border-t border-[#3a322a] space-y-1 font-serif text-[11px] text-[#d6c7b8] leading-snug">
                  <li>• <strong>Victoria:</strong> +1 Pto de Desarrollo al cerrar tu turno con más Ciudadanos (Meta: {view.rules.pointsToWin}).</li>
                  <li>• <strong>Despliegue:</strong> En <em>Ciudad</em> o <em>Camino</em> (en <em>Combate</em> solo si el rival la ocupa).</li>
                  <li>• <strong>Marcha:</strong> 1 Ciudadano (no jugado este turno) a fila adyacente.</li>
                  <li>• <strong>Combate:</strong> Cada unidad en <em>Combate</em> ataca 1 vez a la fila enemiga más cercana.</li>
                </ul>
              )}
            </div>
          </div>

          {/* Middle Section: Crónica de Batalla */}
          <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#4a3f35]">
              <ScrollText className="w-3.5 h-3.5 text-[#f3d46b]" />
              <h3 className="font-display text-[11px] font-bold uppercase tracking-wider text-[#f3d46b]">
                Crónica de Batalla
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {[...(view.log || [])].reverse().map((entry, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-sm bg-[#14110e] border border-[#3a322a] font-serif text-xs leading-snug text-[#e7dfd3]"
                >
                  <span className="font-display font-bold text-[10px] text-[#f3d46b] mr-1.5">
                    [T{entry.turn}]
                  </span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section: Visual Mini-Card Piles for Deck, Discard & Exile */}
          <div className="p-3 border-t-2 border-[#574c3f] bg-[#14110e] space-y-2">
            <div className="flex items-center justify-between text-[10px] font-display font-bold uppercase text-[#d6c7b8]">
              <span>Tus Reservas</span>
              <span className="text-[#f3d46b]">Mano: {handCards.length}</span>
            </div>

            {/* 3 Vertical Mini-Card Stacks */}
            <div className="grid grid-cols-3 gap-2 pt-0.5">
              {/* 1. Physical Stacked Deck Pile */}
              <div
                title={`Tu Mazo: ${view.you.deckCount} cartas restantes`}
                className="h-[78px] rounded-md bg-gradient-to-b from-[#3d2e1e] via-[#261c12] to-[#140f0a] border-2 border-[#c59b27] shadow-[3px_3px_0_#574c3f,6px_6px_10px_rgba(0,0,0,0.9)] flex flex-col items-center justify-between p-1.5 relative"
              >
                <span className="font-display text-[8px] uppercase tracking-wider text-[#e3c158] font-bold">
                  Mazo
                </span>
                <div className="w-6 h-6 rounded-full bg-[#1a140e] border border-[#c59b27]/60 flex items-center justify-center">
                  <Layers className="w-3.5 h-3.5 text-[#f3d46b]" />
                </div>
                <span className="font-display font-black text-sm text-[#fff6db] leading-none">
                  {view.you.deckCount}
                </span>
              </div>

              {/* 2. Discard Graveyard Card Pile */}
              <button
                onClick={() =>
                  setInspectPile({
                    title: 'Tu Pila de Descarte',
                    cards: view.you.discard,
                  })
                }
                title="Inspeccionar tu Pila de Descarte"
                className="h-[78px] rounded-md bg-gradient-to-b from-[#2b1d19] via-[#1c1412] to-[#120d0b] hover:border-[#f3d46b] border-2 border-[#6e5246] shadow-[2px_2px_0_#3a2c26,4px_4px_10px_rgba(0,0,0,0.85)] flex flex-col items-center justify-between p-1.5 transition"
              >
                <span className="font-display text-[8px] uppercase tracking-wider text-[#d6c7b8] font-bold">
                  Descarte
                </span>
                <div className="w-6 h-6 rounded-full bg-[#17110f] border border-[#8c6b5d]/50 flex items-center justify-center">
                  <Skull className="w-3.5 h-3.5 text-[#d6c7b8]" />
                </div>
                <span className="font-display font-black text-sm text-[#e7dfd3] leading-none">
                  {view.you.discard.length}
                </span>
              </button>

              {/* 3. Exile Arcane Card Pile */}
              <button
                onClick={() =>
                  setInspectPile({
                    title: 'Tu Zona de Exilio',
                    cards: view.you.exile,
                  })
                }
                title="Inspeccionar tu Zona de Exilio"
                className="h-[78px] rounded-md bg-gradient-to-b from-[#221d2e] via-[#171421] to-[#0f0d17] hover:border-[#f3d46b] border-2 border-[#5b5275] shadow-[2px_2px_0_#2d283b,4px_4px_10px_rgba(0,0,0,0.85)] flex flex-col items-center justify-between p-1.5 transition"
              >
                <span className="font-display text-[8px] uppercase tracking-wider text-[#c7d2fe] font-bold">
                  Exilio
                </span>
                <div className="w-6 h-6 rounded-full bg-[#13101c] border border-[#818cf8]/40 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5 text-[#a5b4fc]" />
                </div>
                <span className="font-display font-black text-sm text-[#e0e7ff] leading-none">
                  {view.you.exile.length}
                </span>
              </button>
            </div>

            {view.opponent && (
              <div className="flex items-center justify-between pt-1 text-[10px] text-[#a89b8c]">
                <span>Mazo Rival: {view.opponent.deckCount}</span>
                <button
                  onClick={() =>
                    setInspectPile({
                      title: `Descarte de ${view.opponent?.name}`,
                      cards: view.opponent?.discard || [],
                    })
                  }
                  className="hover:text-[#f3d46b] underline"
                >
                  Descarte Rival ({view.opponent.discard.length})
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* =====================================================================
          4. OVERLAYS (Waiting / GameOver / Off-Board Target Picker / Inspector)
         ===================================================================== */}

      {view.phase === 'WAITING_FOR_PLAYERS' && (
        <div className="fixed inset-0 z-50 bg-[#0d0b09]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bastion-panel rounded-lg max-w-md w-full p-6 text-center space-y-3 border-2 border-[#f3d46b]">
            <Users className="w-10 h-10 text-[#f3d46b] mx-auto animate-pulse" />
            <h3 className="font-display text-lg font-bold text-[#f3ead8]">
              Aguardando Oponente en "{view.gameName}"
            </h3>
            <p className="font-serif text-sm text-[#d6c7b8]">
              La sala está abierta. Podés refrescar el navegador sin perder tu asiento gracias al identificador en la URL.
            </p>
          </div>
        </div>
      )}

      {view.phase === 'GAME_OVER' && (
        <div className="fixed inset-0 z-50 bg-[#0d0b09]/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bastion-panel rounded-xl max-w-md w-full p-8 text-center space-y-4 border-2 border-[#f3d46b]">
            <Crown className="w-14 h-14 text-[#f3d46b] mx-auto" />
            <h2 className="font-display text-2xl font-black text-[#f3ead8]">
              {view.winnerId === playerId ? '¡VICTORIA EN EL BASTIÓN!' : 'CAÍDA DEL BASTIÓN'}
            </h2>
            <p className="font-serif text-base text-[#f3d46b]">{view.winReason}</p>
            <button
              onClick={onExitLobby}
              className="btn-war-gold w-full py-2.5 rounded text-xs"
            >
              Regresar al Salón de Guerra
            </button>
          </div>
        </div>
      )}

      {isPromptForMe && isOffBoardPrompt && view.pendingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0b09]/85 backdrop-blur-sm p-4">
          <div className="bastion-panel rounded-lg max-w-4xl w-full p-6 space-y-4 border-2 border-[#f3d46b]">
            <div className="border-b border-[#6b5a48] pb-3">
              <span className="font-display text-xs font-bold uppercase text-[#f3d46b]">
                Decreto en Curso ({view.pendingPrompt.sourceCardName})
              </span>
              <h3 className="font-display text-lg font-bold text-[#f3ead8]">
                {view.pendingPrompt.promptText}
              </h3>
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
                      <div className="btn-war-gold text-[10px] text-center py-1 rounded-sm">
                        Seleccionar
                      </div>
                    }
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {inspectPile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0b09]/85 backdrop-blur-sm p-4">
          <div className="bastion-panel rounded-lg max-w-4xl w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#6b5a48] pb-3">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-[#f3d46b]" />
                <h3 className="font-display text-base font-bold text-[#f3ead8]">
                  {inspectPile.title} ({inspectPile.cards.length})
                </h3>
              </div>
              <button
                onClick={() => setInspectPile(null)}
                className="btn-war-iron px-3 py-1 rounded text-xs"
              >
                Cerrar
              </button>
            </div>

            {inspectPile.cards.length === 0 ? (
              <p className="text-center font-serif text-sm text-[#8c7e70] py-12">
                Esta zona se encuentra vacía.
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
    </div>
  );
};
