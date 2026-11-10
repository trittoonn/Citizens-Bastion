import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowLeft,
  BookOpen,
  Bot,
  Check,
  ChevronDown,
  ChevronUp,
  Crown,
  FastForward,
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
  X,
} from 'lucide-react';
import {
  ActionRequest,
  ActionStepSnapshot,
  AnimationSpeed,
  CardDefinition,
  CardInstance,
  GamePhase,
  PlayerGameView,
  ZoneID,
} from '../types/game';
import { pollGameState, submitGameAction } from '../services/api';
import { CardAnimEffect, CardView } from './CardView';
import { GAME_KEYWORDS, getCardKeywords } from '../utils/keywords';

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
  const [serverView, setServerView] = useState<PlayerGameView>(initialView);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step-by-step Animation Playback Queue (for AI turns & Player actions)
  const initialSeq =
    initialView.recentSteps && initialView.recentSteps.length > 0
      ? initialView.recentSteps[initialView.recentSteps.length - 1].event.seq
      : 0;
  const lastQueuedSeqRef = useRef<number>(initialSeq);

  const [animQueue, setAnimQueue] = useState<ActionStepSnapshot[]>([]);
  const [activeStep, setActiveStep] = useState<ActionStepSnapshot | null>(null);
  const [seqTotalCount, setSeqTotalCount] = useState(0);
  const [seqCurrentIdx, setSeqCurrentIdx] = useState(0);
  const [animSpeed, setAnimSpeed] = useState<AnimationSpeed>(() => {
    try {
      const saved = localStorage.getItem('cb_anim_speed_v1');
      if (saved === 'slow' || saved === 'medium' || saved === 'fast') {
        return saved;
      }
    } catch {
      // Ignore storage access errors
    }
    return 'medium';
  });

  const handleSetAnimSpeed = (speed: AnimationSpeed) => {
    setAnimSpeed(speed);
    try {
      localStorage.setItem('cb_anim_speed_v1', speed);
    } catch {
      // Ignore storage access errors
    }
  };

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
  const [keywordsModalOpen, setKeywordsModalOpen] = useState(false);

  // Multi-select prompt state (e.g. Espidi's "discard any number of cards from hand")
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);

  // Discard / Exile Inspector Modal
  const [inspectPile, setInspectPile] = useState<{
    title: string;
    cards: CardInstance[];
  } | null>(null);

  // Post-match statistics modal states
  const [statsMinimized, setStatsMinimized] = useState(false);
  const [statsCardTab, setStatsCardTab] = useState<'all' | 'you' | 'opponent'>('all');
  const [statsSortField, setStatsSortField] = useState<
    'damageDealt' | 'timesPlayed' | 'kills'
  >('damageDealt');
  const [statsShowHelp, setStatsShowHelp] = useState(false);

  // Ingest incoming PlayerGameView and enqueue any unseen animation steps
  const ingestIncomingView = useCallback((nextView: PlayerGameView) => {
    setServerView(nextView);
    const incomingSteps = nextView.recentSteps || [];
    const unseen = incomingSteps.filter(
      (s) => s.event.seq > lastQueuedSeqRef.current
    );
    if (unseen.length > 0) {
      lastQueuedSeqRef.current = unseen[unseen.length - 1].event.seq;
      setAnimQueue((prev) => {
        const combined = [...prev, ...unseen];
        setSeqTotalCount((oldTotal) =>
          prev.length === 0 ? unseen.length : oldTotal + unseen.length
        );
        return combined;
      });
    }
  }, []);

  // 1) Dequeue the next animation step automatically whenever no step is active
  useEffect(() => {
    if (activeStep !== null) {
      return;
    }
    if (animQueue.length === 0) {
      setSeqTotalCount(0);
      setSeqCurrentIdx(0);
      return;
    }

    const [nextStep, ...rest] = animQueue;
    setAnimQueue(rest);
    setActiveStep(nextStep);
    setSeqCurrentIdx((c) => c + 1);
  }, [activeStep, animQueue]);

  // 2) Automatically advance activeStep according to the chosen animation speed
  // (Kept in a separate effect from animQueue so dequeueing never cancels the timer!)
  useEffect(() => {
    if (!activeStep) {
      return;
    }

    const isMyAction = activeStep.event.actorId === playerId;
    const isTurnBanner = activeStep.event.type === 'TURN_START';
    const isEventShowcase = activeStep.event.type === 'PLAY_EVENT';

    const baseDurationMs = isTurnBanner
      ? 450
      : isEventShowcase
      ? 720
      : isMyAction
      ? 520
      : 660;

    const speedMultiplier =
      animSpeed === 'slow' ? 1.8 : animSpeed === 'fast' ? 0.52 : 1.0;

    const durationMs = Math.round(baseDurationMs * speedMultiplier);

    const timer = setTimeout(() => {
      setActiveStep(null);
    }, durationMs);

    return () => clearTimeout(timer);
  }, [activeStep, playerId, animSpeed]);

  const skipAnimations = () => {
    setAnimQueue([]);
    setActiveStep(null);
    setSeqTotalCount(0);
    setSeqCurrentIdx(0);
  };

  // Poll backend every 1000ms
  useEffect(() => {
    let active = true;
    const timer = setInterval(async () => {
      try {
        const nextView = await pollGameState(lobbyId, playerId);
        if (active) {
          ingestIncomingView(nextView);
        }
      } catch {
        // Ignore transient hiccups
      }
    }, 1000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [lobbyId, playerId, ingestIncomingView]);

  const sendAction = async (action: Omit<ActionRequest, 'playerId'>) => {
    setError(null);
    setSubmitting(true);
    try {
      const next = await submitGameAction(lobbyId, {
        playerId,
        ...action,
      });
      ingestIncomingView(next);
      setSelectedHandCardId(null);
      setSelectedBoardCardId(null);
      setSelectedPromptIds([]);
    } catch (err: any) {
      setError(err.message || 'Acción inválida');
    } finally {
      setSubmitting(false);
    }
  };

  // While an animation step is playing, display that step's intermediate board state
  // so AI/Opponent actions appear one by one in exact chronological order!
  const view: PlayerGameView = useMemo(() => {
    if (!activeStep) {
      return serverView;
    }
    return {
      ...serverView,
      you: activeStep.you,
      opponent: activeStep.opponent,
      turnNumber: activeStep.turnNumber,
      phase: activeStep.phase,
      activePlayerId: activeStep.activePlayerId,
      isYourTurn: activeStep.isYourTurn,
    };
  }, [serverView, activeStep]);

  const isAnimatingMultiStep = Boolean(
    activeStep && (activeStep.event.actorId !== playerId || animQueue.length > 0)
  );

  // Map a board card instance to its current animation effect if involved in activeStep
  const getCardAnimEffect = useCallback(
    (inst: CardInstance): CardAnimEffect | undefined => {
      if (!activeStep) return undefined;
      const ev = activeStep.event;

      if (ev.type === 'PLAY_CITIZEN' && ev.cardInstanceId === inst.instanceId) {
        return { kind: 'summon' };
      }
      if (ev.type === 'MOVE_CITIZEN' && ev.cardInstanceId === inst.instanceId) {
        const rank: Record<string, number> = { city: 0, road: 1, combat: 2 };
        const fromR = ev.fromZone ? rank[ev.fromZone] ?? 0 : 0;
        const toR = ev.toZone ? rank[ev.toZone] ?? 1 : 1;
        const movingTowardFront = toR >= fromR;
        const isMe = ev.actorId === playerId;
        // On screen: player's rows go City (bottom) -> Road -> Combat (top), so toward front is UP.
        // Opponent's rows go City (top) -> Road -> Combat (bottom), so toward front is DOWN.
        const visualUp = isMe ? movingTowardFront : !movingTowardFront;
        return { kind: visualUp ? 'march-up' : 'march-down' };
      }
      if (ev.type === 'ATTACK') {
        if (ev.cardInstanceId === inst.instanceId) {
          return {
            kind: ev.actorId === playerId ? 'attack-up' : 'attack-down',
            amount: ev.attackerDamage,
            destroyed: ev.attackerDestroyed,
          };
        }
        if (ev.targetCardId === inst.instanceId) {
          return {
            kind: ev.destroyed ? 'destroyed' : 'damaged',
            amount: ev.amount,
          };
        }
      }
      if (ev.type === 'EFFECT') {
        if (ev.targetCardId === inst.instanceId) {
          if (ev.destroyed) {
            return { kind: 'destroyed', amount: ev.amount };
          }
          if ((ev.amount || 0) < 0) {
            return { kind: 'damaged', amount: ev.amount };
          }
          if ((ev.amount || 0) > 0) {
            return { kind: 'buffed', amount: ev.amount };
          }
        }
        if (!ev.targetCardId && ev.cardInstanceId === inst.instanceId) {
          return { kind: 'summon' };
        }
      }
      return undefined;
    },
    [activeStep, playerId]
  );

  // Helper to include a just-destroyed card (defender or counter-killed attacker) in its row during the hit/destroy animation step
  const getRowCardsWithDyingSnapshot = useCallback(
    (baseCards: CardInstance[], ownerId: string | undefined, zoneId: ZoneID) => {
      if (!activeStep || !ownerId) {
        return baseCards;
      }
      let out = baseCards;
      if (activeStep.event.destroyed && activeStep.event.targetCardSnapshot) {
        const snap = activeStep.event.targetCardSnapshot;
        if (
          snap.ownerId === ownerId &&
          snap.zone === zoneId &&
          !out.some((c) => c.instanceId === snap.instanceId)
        ) {
          out = [...out, snap];
        }
      }
      if (
        activeStep.event.attackerDestroyed &&
        activeStep.event.attackerCardSnapshot
      ) {
        const atkSnap = activeStep.event.attackerCardSnapshot;
        if (
          atkSnap.ownerId === ownerId &&
          atkSnap.zone === zoneId &&
          !out.some((c) => c.instanceId === atkSnap.instanceId)
        ) {
          out = [...out, atkSnap];
        }
      }
      return out;
    },
    [activeStep]
  );

  const selectedHandCard = useMemo(
    () =>
      view.you.hand?.find((c) => c.instanceId === selectedHandCardId) ||
      view.you.discard?.find(
        (c) => c.instanceId === selectedHandCardId && c.definition.playFromDiscard
      ) ||
      null,
    [view.you.hand, view.you.discard, selectedHandCardId]
  );

  const playableFromDiscardCards = useMemo(
    () => (view.you.discard || []).filter((c) => c.definition.playFromDiscard),
    [view.you.discard]
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
    return (
      zones.includes('deck') ||
      zones.includes('discard') ||
      zones.includes('exile') ||
      zones.includes('hand')
    );
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
    selectedBoardCard.definition.type === 'citizen' &&
    selectedBoardCard.zone === 'combat' &&
    !selectedBoardCard.attackedThisTurn &&
    !selectedBoardCard.movedThisTurn;

  const canSelectedBoardCardActivateWear = Boolean(
    view.phase === 'MAIN' &&
      view.isYourTurn &&
      selectedBoardCard &&
      !selectedBoardCard.usedAbilityThisTurn &&
      selectedBoardCard.definition.abilities?.some((ab) => ab.trigger === 'activated_wear')
  );

  const maxUnitsPerZone = view.rules.maxUnitsPerZone || 5;

  const canPlaySelectedCitizenInZone = (zone: 'city' | 'road' | 'combat') => {
    if (
      view.phase !== 'MAIN' ||
      !view.isYourTurn ||
      view.playsRemaining <= 0 ||
      !selectedHandCard ||
      (selectedHandCard.definition.type !== 'citizen' &&
        selectedHandCard.definition.type !== 'tool')
    ) {
      return false;
    }
    if (selectedHandCard.definition.isSpy) {
      const oppCount = view.opponent?.board[zone]?.length || 0;
      return oppCount < maxUnitsPerZone;
    }
    const myCount = view.you.board[zone]?.length || 0;
    if (myCount >= maxUnitsPerZone) {
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
      !selectedBoardCard ||
      selectedBoardCard.definition.type !== 'citizen' ||
      selectedBoardCard.playedThisTurn ||
      selectedBoardCard.movedThisTurn ||
      selectedBoardCard.attackedThisTurn
    ) {
      return false;
    }
    const myCount = view.you.board[zone]?.length || 0;
    if (myCount >= maxUnitsPerZone) {
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

  const cssAnimDuration =
    animSpeed === 'slow' ? '780ms' : animSpeed === 'fast' ? '250ms' : '460ms';

  return (
    <div
      style={{ '--anim-duration': cssAnimDuration } as React.CSSProperties}
      className="h-screen w-screen overflow-hidden flex flex-col bg-[#0e0c0a] text-[#e7dfd3] select-none relative"
    >
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

        {/* Right: Vitality & Combat Mode Badges & Opponent Reserves */}
        <div className="flex items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setKeywordsModalOpen(true)}
            title="Ver glosario de palabras clave (Keywords) y sus efectos"
            className="btn-war-iron flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] border-[#c59b27]/70 text-[#fef08a]"
          >
            <BookOpen className="w-3 h-3 text-[#f3d46b]" /> Keywords
          </button>
          <span className="hidden md:inline-block px-2 py-0.5 rounded-sm bg-[#1a1613] border border-[#574c3f] text-[#d6c7b8] font-display text-[10px]">
            {view.rules.vitalityMode === 'base_attack' ? 'Fuerza Base' : 'V Dinámica'}
          </span>
          <span
            title={
              view.rules.retaliationDamage
                ? 'Cuando una carta ataca, recibe daño igual al ataque del objetivo'
                : 'Cuando una carta ataca, solo el objetivo recibe daño'
            }
            className="hidden lg:inline-block px-2 py-0.5 rounded-sm bg-[#1a1613] border border-[#574c3f] text-[#e3c158] font-display text-[10px]"
          >
            {view.rules.retaliationDamage ? '⚔️ Contraataque' : '⚔️ Unilateral'}
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

            {/* ===============================================================
                FLOATING STEP-BY-STEP TACTICAL ACTION BANNER (AI & Player)
               =============================================================== */}
            {activeStep && (
              <div
                key={activeStep.event.seq}
                className="absolute top-2.5 left-1/2 -translate-x-1/2 z-40 pointer-events-auto anim-banner-pop"
              >
                <div
                  className={`px-4 py-1.5 rounded-md border-2 shadow-[0_10px_28px_rgba(0,0,0,0.95)] flex items-center gap-3 ${
                    activeStep.event.actorId === playerId
                      ? 'bg-gradient-to-r from-[#1a2c3e] via-[#21384f] to-[#1a2c3e] border-[#f3d46b] text-[#fef9c3]'
                      : 'bg-gradient-to-r from-[#3b1212] via-[#541818] to-[#3b1212] border-[#f87171] text-[#fef2f2]'
                  }`}
                >
                  {activeStep.event.actorId !== playerId ? (
                    <Bot className="w-4 h-4 text-[#fca5a5] shrink-0 animate-bounce" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-[#f3d46b] shrink-0" />
                  )}

                  <span className="font-display font-bold text-xs tracking-wide">
                    {activeStep.event.bannerText}
                  </span>

                  {seqTotalCount > 1 && (
                    <span className="px-2 py-0.5 rounded bg-black/40 border border-white/20 font-display text-[10px] text-[#e7dfd3]">
                      Paso {Math.min(seqCurrentIdx, seqTotalCount)}/{seqTotalCount}
                    </span>
                  )}

                  {animQueue.length > 0 && (
                    <button
                      type="button"
                      onClick={skipAnimations}
                      className="ml-1 px-2 py-0.5 rounded bg-[#14100c]/80 hover:bg-[#14100c] border border-[#c59b27]/60 font-display text-[9px] text-[#f3d46b] flex items-center gap-1"
                    >
                      <FastForward className="w-3 h-3" /> Saltar
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* ===============================================================
                FLOATING EVENT / DECRETO SHOWCASE WHEN AN EVENT CARD IS PLAYED
               =============================================================== */}
            {activeStep &&
              activeStep.event.type === 'PLAY_EVENT' &&
              activeStep.event.cardDefinition && (
                <div
                  key={`event_${activeStep.event.seq}`}
                  className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center bg-black/35 backdrop-blur-[1px]"
                >
                  <div className="anim-card-summon flex flex-col items-center gap-2 p-4 rounded-xl bg-gradient-to-b from-[#2b2118]/95 to-[#14100c]/95 border-2 border-[#f3d46b] shadow-[0_20px_50px_rgba(0,0,0,0.95)]">
                    <div className="font-display text-xs font-bold uppercase tracking-widest text-[#f3d46b] flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-[#f87171]" />
                      Efecto Activado por {activeStep.event.actorName}
                    </div>
                    <CardView
                      card={activeStep.event.cardDefinition}
                      vitalityMode={view.rules.vitalityMode}
                      size="md"
                    />
                  </div>
                </div>
              )}

            {/* OPPONENT 3 ROWS (City -> Road -> Combat) */}
            <div className="flex-1 min-h-0 grid grid-rows-3 gap-1 relative z-10">
              {(
                [
                  { id: 'city', label: 'La Ciudad', subtitle: 'Baluarte Enemigo' },
                  { id: 'road', label: 'El Camino', subtitle: 'Sendero Enemigo' },
                  { id: 'combat', label: 'Zona de Combate', subtitle: 'Vanguardia Enemiga' },
                ] as const
              ).map((zone) => {
                const rawCards = view.opponent?.board[zone.id] || [];
                const cards = getRowCardsWithDyingSnapshot(
                  rawCards,
                  view.opponent?.id,
                  zone.id
                );
                const isClosestAttackRow =
                  !isAnimatingMultiStep &&
                  Boolean(canSelectedBoardCardAttack) &&
                  rawCards.some((c) => validCombatSet.has(c.instanceId));
                const canPlaySpyHere =
                  !isAnimatingMultiStep &&
                  Boolean(selectedHandCard?.definition.isSpy) &&
                  canPlaySelectedCitizenInZone(zone.id);

                return (
                  <div
                    key={zone.id}
                    onClick={() => {
                      if (isAnimatingMultiStep) return;
                      if (canPlaySpyHere && selectedHandCard) {
                        sendAction({
                          type: 'PLAY_CARD',
                          cardInstanceId: selectedHandCard.instanceId,
                          targetZone: zone.id,
                        });
                      }
                    }}
                    className={`min-h-0 rounded px-3 flex items-center justify-between gap-2 relative transition ${getZoneSurfaceClasses(
                      zone.id,
                      isClosestAttackRow || canPlaySpyHere
                    )}`}
                  >
                    {/* Centered Background Watermark SVG (Clipped strictly inside the rounded row background) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded">
                      <ZoneWatermark zone={zone.id} />
                    </div>

                    {/* Zone Crest & Title */}
                    <div className="w-36 shrink-0 flex flex-col border-r border-[#6b5a48]/40 pr-2 relative z-10">
                      <span className="font-display font-bold text-[11px] text-[#e7dfd3] tracking-wider uppercase leading-tight">
                        {zone.label}
                      </span>
                      <span className="text-[9px] text-[#a89b8c]">
                        {zone.subtitle} • {rawCards.length}
                      </span>
                    </div>

                    {/* Units in Row (overflow-visible so shields, Zzz badges & hover/anim glows are never clipped!) */}
                    <div className="flex-1 flex items-center justify-center gap-2.5 overflow-visible px-2 py-1 relative z-10">
                      {cards.map((inst) => {
                        const isPromptTarget =
                          !isAnimatingMultiStep &&
                          isPromptForMe &&
                          validPromptSet.has(inst.instanceId);
                        const isAttackTarget =
                          !isAnimatingMultiStep &&
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
                            animEffect={getCardAnimEffect(inst)}
                            onMouseEnter={() =>
                              setHoveredCard({ card: inst.definition, instance: inst })
                            }
                            onMouseLeave={() => setHoveredCard(null)}
                            onClick={() => {
                              if (isAnimatingMultiStep) return;
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
                      {canPlaySpyHere ? (
                        <span className="btn-war-gold px-2 py-0.5 rounded text-[10px]">
                          🗡️ Infiltrar aquí
                        </span>
                      ) : isClosestAttackRow ? (
                        <span className="font-display text-[10px] font-bold text-[#fca5a5] animate-pulse">
                          ⚔️ Al alcance
                        </span>
                      ) : null}
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
                        disabled={submitting || isAnimatingMultiStep}
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
                  disabled={
                    view.phase !== 'MAIN' ||
                    !view.isYourTurn ||
                    submitting ||
                    isAnimatingMultiStep
                  }
                  onClick={() => sendAction({ type: 'END_TURN' })}
                  className={`btn-war-gold px-5 py-1.5 rounded-md text-xs border-2 border-[#fef08a] shadow-[0_6px_20px_rgba(0,0,0,0.95)] flex items-center gap-1.5 ${
                    view.phase === 'MAIN' &&
                    view.isYourTurn &&
                    view.playsRemaining === 0 &&
                    !isAnimatingMultiStep
                      ? 'animate-pulse ring-2 ring-[#fef08a] shadow-[0_0_24px_rgba(243,212,107,0.9)]'
                      : ''
                  }`}
                >
                  <SkipForward className="w-4 h-4" />
                  {view.phase === 'MAIN' && view.isYourTurn && !isAnimatingMultiStep
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
                const rawCards = view.you.board[zone.id] || [];
                const cards = getRowCardsWithDyingSnapshot(
                  rawCards,
                  view.you.id,
                  zone.id
                );
                const canPlayHere =
                  !isAnimatingMultiStep && canPlaySelectedCitizenInZone(zone.id);
                const canMoveHere =
                  !isAnimatingMultiStep && canMoveSelectedCitizenToZone(zone.id);
                const isInteractiveRow = canPlayHere || canMoveHere;

                return (
                  <div
                    key={zone.id}
                    onClick={() => {
                      if (isAnimatingMultiStep) return;
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
                    className={`min-h-0 rounded px-3 flex items-center justify-between gap-2 relative transition ${getZoneSurfaceClasses(
                      zone.id,
                      isInteractiveRow
                    )}`}
                  >
                    {/* Centered Background Watermark SVG (Clipped strictly inside the rounded row background) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden rounded">
                      <ZoneWatermark zone={zone.id} />
                    </div>

                    {/* Zone Crest & Title */}
                    <div className="w-36 shrink-0 flex flex-col border-r border-[#6b5a48]/40 pr-2 relative z-10">
                      <span className="font-display font-bold text-[11px] text-[#f3d46b] tracking-wider uppercase leading-tight">
                        {zone.label}
                      </span>
                      <span className="text-[9px] text-[#a89b8c]">
                        {zone.subtitle} • {rawCards.length}
                      </span>
                    </div>

                    {/* Units in Row (overflow-visible so shields, Zzz badges & hover/anim glows are never clipped!) */}
                    <div className="flex-1 flex items-center justify-center gap-2.5 overflow-visible px-2 py-1 relative z-10">
                      {cards.map((inst) => {
                        const isPromptTarget =
                          !isAnimatingMultiStep &&
                          isPromptForMe &&
                          validPromptSet.has(inst.instanceId);
                        const isSelected =
                          !isAnimatingMultiStep &&
                          selectedBoardCardId === inst.instanceId;

                        return (
                          <CardView
                            key={inst.instanceId}
                            card={inst.definition}
                            instance={inst}
                            vitalityMode={view.rules.vitalityMode}
                            size="board"
                            isSelected={isSelected}
                            isTargetable={isPromptTarget}
                            animEffect={getCardAnimEffect(inst)}
                            canAttack={
                              !isAnimatingMultiStep &&
                              view.phase === 'MAIN' &&
                              view.isYourTurn &&
                              zone.id === 'combat'
                            }
                            canMove={
                              !isAnimatingMultiStep &&
                              view.phase === 'MAIN' &&
                              view.isYourTurn &&
                              !inst.playedThisTurn &&
                              !inst.movedThisTurn
                            }
                            onMouseEnter={() =>
                              setHoveredCard({ card: inst.definition, instance: inst })
                            }
                            onMouseLeave={() => setHoveredCard(null)}
                            onClick={() => {
                              if (isAnimatingMultiStep) return;
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
              DEDICATED BOTTOM HAND DOCK (100% contained below the War-Table,
              never overlaps "La Ciudad" or any board action buttons!)
             ================================================================= */}
          <div className="h-[144px] shrink-0 max-w-[1180px] w-full mx-auto rounded-lg bg-gradient-to-t from-[#1c1612] via-[#15110e] to-[#110e0b] border border-[#6b5a48]/80 px-4 py-1.5 flex items-center justify-between gap-4 relative z-20 shadow-[inset_0_2px_12px_rgba(0,0,0,0.85)]">
            {/* Left Dock Label */}
            <div className="hidden md:flex flex-col justify-center w-36 shrink-0 border-r border-[#574c3f]/50 pr-3">
              <span className="font-display text-[11px] font-bold uppercase tracking-wider text-[#f3d46b]">
                Tu Mano ({handCards.length})
              </span>
              <span className="font-serif text-[11px] text-[#a89b8c] leading-tight mt-0.5">
                {view.phase === 'MULLIGAN'
                  ? 'Tocá cartas para reemplazar.'
                  : selectedHandCard
                  ? `Seleccionada: ${selectedHandCard.definition.name}`
                  : 'Pasá el cursor para ampliar o tocá para jugar.'}
              </span>
            </div>

            {/* Center: Fanned CCG Hand sitting strictly inside the 144px dock (overflow-visible so rotated/hovered borders never clip) */}
            <div className="flex-1 flex items-center justify-center -space-x-2 overflow-visible py-1.5 px-3">
              {handCards.map((inst, idx) => {
                const isMulliganSelected =
                  view.phase === 'MULLIGAN' &&
                  mulliganIds.includes(inst.instanceId);
                const isMainSelected =
                  view.phase === 'MAIN' && selectedHandCardId === inst.instanceId;
                const isSelected = isMulliganSelected || isMainSelected;

                const mid = (handCards.length - 1) / 2;
                const offset = idx - mid;
                const rotateDeg = offset * 1.2;

                return (
                  <div
                    key={inst.instanceId}
                    style={{
                      transform: isSelected
                        ? 'translateY(-4px) scale(1.03) rotate(0deg)'
                        : `translateY(2px) rotate(${rotateDeg}deg)`,
                    }}
                    className="transition-all duration-150 ease-out hover:!-translate-y-1.5 hover:!scale-[1.04] hover:!rotate-0 hover:z-30"
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
                        if (isAnimatingMultiStep) return;
                        if (isPromptForMe && validPromptSet.has(inst.instanceId)) {
                          sendAction({
                            type: 'SELECT_TARGET',
                            targetCardId: inst.instanceId,
                          });
                          return;
                        }
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
                <div className="font-serif italic text-xs text-[#8c7e70]">
                  Sin cartas en la mano
                </div>
              )}
            </div>

            {/* Right Dock Command Slot: Contextual Action Buttons (Never covers board rows!) */}
            <div className="w-48 shrink-0 flex flex-col items-end justify-center gap-1.5 border-l border-[#574c3f]/50 pl-3">
              {selectedHandCard &&
              selectedHandCard.definition.type === 'event' &&
              view.phase === 'MAIN' &&
              view.isYourTurn &&
              view.playsRemaining > 0 &&
              !isAnimatingMultiStep ? (
                <>
                  <button
                    disabled={submitting}
                    onClick={() =>
                      sendAction({
                        type: 'PLAY_CARD',
                        cardInstanceId: selectedHandCard.instanceId,
                      })
                    }
                    className="btn-war-gold w-full px-3 py-2 rounded text-[11px] flex items-center justify-center gap-1.5 shadow-[0_0_20px_rgba(243,212,107,0.75)]"
                  >
                    <Flame className="w-4 h-4 shrink-0" />
                    <span className="truncate">Activar efecto</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedHandCardId(null)}
                    className="btn-war-iron w-full py-1 rounded text-[10px]"
                  >
                    Cancelar selección
                  </button>
                </>
              ) : selectedHandCard &&
                (selectedHandCard.definition.type === 'citizen' ||
                  selectedHandCard.definition.type === 'tool') ? (
                <>
                  <span className="font-display text-[10px] font-bold text-[#f3d46b] text-right leading-tight">
                    {selectedHandCard.definition.isSpy
                      ? '🗡️ Hacé clic en una fila enemiga para infiltrar al Espía'
                      : '↗ Hacé clic en una fila resaltada para desplegar'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedHandCardId(null)}
                    className="btn-war-iron w-full py-1 rounded text-[10px]"
                  >
                    Cancelar selección
                  </button>
                </>
              ) : selectedBoardCard ? (
                <>
                  {canSelectedBoardCardActivateWear && (
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() =>
                        sendAction({
                          type: 'ACTIVATE_ABILITY',
                          cardInstanceId: selectedBoardCard.instanceId,
                        })
                      }
                      className="btn-war-gold w-full px-3 py-1.5 rounded text-[10px] flex items-center justify-center gap-1 shadow-[0_0_16px_rgba(243,212,107,0.7)]"
                    >
                      <Flame className="w-3.5 h-3.5 shrink-0" />
                      <span>Activar Desgaste</span>
                    </button>
                  )}
                  <span className="font-display text-[10px] font-bold text-[#f3d46b] text-right leading-tight">
                    ↗ Elegí fila adyacente o blanco enemigo
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedBoardCardId(null)}
                    className="btn-war-iron w-full py-1 rounded text-[10px]"
                  >
                    Cancelar selección
                  </button>
                </>
              ) : (
                <div className="text-right font-serif text-[11px] text-[#8c7e70] leading-snug space-y-1">
                  <div>
                    Jugadas disp.:{' '}
                    <strong className="font-display text-[#f3d46b]">
                      {view.playsRemaining}
                    </strong>
                    <br />
                    Unidades para marchar:{' '}
                    <strong className="font-display text-[#f3d46b]">
                      {view.movesRemaining}
                    </strong>
                  </div>
                  {playableFromDiscardCards.length > 0 &&
                    view.phase === 'MAIN' &&
                    view.isYourTurn &&
                    view.playsRemaining > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBoardCardId(null);
                          setSelectedHandCardId(playableFromDiscardCards[0].instanceId);
                        }}
                        className="w-full px-2 py-1 rounded bg-[#14532d] hover:bg-[#166534] border border-[#4ade80] font-display text-[9.5px] font-bold text-[#dcfce7] shadow"
                      >
                        ♻️ Jugar {playableFromDiscardCards[0].definition.name} (Descarte)
                      </button>
                    )}
                </div>
              )}
            </div>
          </div>

          {/* Magnified TCG Card Preview on Hover (Positioned at top-left, pointer-events-none) */}
          {hoveredCard && (
            <div className="fixed left-4 top-16 z-50 pointer-events-none flex flex-col gap-2 max-w-[254px]">
              <CardView
                card={hoveredCard.card}
                instance={hoveredCard.instance}
                vitalityMode={view.rules.vitalityMode}
                size="lg"
              />
              {(() => {
                const kws = getCardKeywords(hoveredCard.card);
                if (kws.length === 0) return null;
                return (
                  <div className="rounded-lg bg-[#14100d]/95 border-2 border-[#c59b27] p-2.5 shadow-[0_12px_32px_rgba(0,0,0,0.95)] space-y-1.5">
                    <div className="font-display text-[9.5px] font-bold uppercase tracking-wider text-[#f3d46b] border-b border-[#574c3f] pb-1">
                      Palabras Clave (Keywords)
                    </div>
                    {kws.map((kw) => (
                      <div key={kw.id} className="text-[11px] leading-snug">
                        <span className="font-display font-bold text-[#fef08a]">
                          {kw.badge}:
                        </span>{' '}
                        <span className="font-serif text-[#e7dfd3]">
                          {kw.description}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
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
                  {view.movesRemaining} listos
                </span>
              </div>

              {/* Animation Speed Control (3 Buttons: Lento / Medio / Rápido + Slider) */}
              <div className="pt-2 border-t border-[#3a322a] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-[#d6c7b8] text-[9.5px] uppercase">
                    Velocidad Animación
                  </span>
                  <span className="font-display text-[9px] text-[#f3d46b] font-bold uppercase">
                    {animSpeed === 'slow'
                      ? 'Lento'
                      : animSpeed === 'fast'
                      ? 'Rápido'
                      : 'Medio'}
                  </span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  aria-label="Velocidad de las animaciones"
                  value={animSpeed === 'slow' ? 0 : animSpeed === 'medium' ? 1 : 2}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    handleSetAnimSpeed(
                      v === 0 ? 'slow' : v === 1 ? 'medium' : 'fast'
                    );
                  }}
                  className="w-full h-1.5 accent-[#f3d46b] bg-[#26211d] rounded-lg cursor-pointer"
                />

                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'slow', label: 'Lento' },
                      { id: 'medium', label: 'Medio' },
                      { id: 'fast', label: 'Rápido' },
                    ] as const
                  ).map((opt) => (
                    <button
                      type="button"
                      key={opt.id}
                      onClick={() => handleSetAnimSpeed(opt.id)}
                      className={`py-0.5 rounded-sm font-display text-[9px] font-bold border transition ${
                        animSpeed === opt.id
                          ? 'bg-[#2b2216] border-[#f3d46b] text-[#fef08a] shadow-[inset_0_0_8px_rgba(243,212,107,0.25)]'
                          : 'bg-[#1a1613] border-[#3a322a] text-[#8c7e70] hover:border-[#6b5a48] hover:text-[#d6c7b8]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
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
                  <li>• <strong>Marcha:</strong> Cualquier Ciudadano (no jugado este turno) puede moverse a una fila adyacente.</li>
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

      {view.phase === 'GAME_OVER' && statsMinimized && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 p-2.5 rounded-lg bg-[#1c1612] border-2 border-[#f3d46b] shadow-[0_12px_32px_rgba(0,0,0,0.95)]">
          <Crown className="w-5 h-5 text-[#f3d46b]" />
          <span className="font-display text-xs font-bold text-[#fef08a]">
            {view.winnerId === playerId ? '¡Victoria!' : 'Partida Finalizada'}
          </span>
          <button
            type="button"
            onClick={() => setStatsMinimized(false)}
            className="btn-war-gold px-3 py-1 rounded text-[11px]"
          >
            Ver Estadísticas
          </button>
          <button
            type="button"
            onClick={onExitLobby}
            className="btn-war-iron px-3 py-1 rounded text-[11px]"
          >
            Salir al Salón
          </button>
        </div>
      )}

      {view.phase === 'GAME_OVER' && !statsMinimized && (
        <div className="fixed inset-0 z-50 bg-[#090807]/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bastion-panel rounded-xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden border-2 border-[#f3d46b] shadow-[0_24px_64px_rgba(0,0,0,0.95)]">
            {/* Top Victory/Defeat Header */}
            <div className="bastion-panel-header px-6 py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
              <div className="flex items-center gap-3.5">
                <div
                  className={`p-2.5 rounded-lg border-2 ${
                    view.winnerId === playerId
                      ? 'bg-gradient-to-b from-[#f3d46b] to-[#966e15] border-[#fef08a] text-[#14100c]'
                      : 'bg-gradient-to-b from-[#7f1d1d] to-[#450a0a] border-[#f87171] text-[#fecaca]'
                  }`}
                >
                  <Crown className="w-7 h-7" />
                </div>
                <div>
                  <h2 className="font-display text-xl font-black text-[#f3ead8] tracking-wide">
                    {view.winnerId === playerId
                      ? '¡VICTORIA EN EL BASTIÓN!'
                      : 'CAÍDA DEL BASTIÓN'}
                  </h2>
                  <p className="font-serif text-sm text-[#f3d46b]">
                    {view.winReason}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatsShowHelp((v) => !v)}
                  className="btn-war-iron px-3 py-1.5 rounded text-xs flex items-center gap-1 border-[#c59b27]/70 text-[#fef08a]"
                >
                  <Info className="w-3.5 h-3.5 text-[#f3d46b]" />
                  {statsShowHelp ? 'Ocultar explicaciones' : '¿Qué mide cada métrica?'}
                </button>
                <button
                  type="button"
                  onClick={() => setStatsMinimized(true)}
                  className="btn-war-iron px-3 py-1.5 rounded text-xs"
                >
                  Inspeccionar Tablero Final
                </button>
                <button
                  type="button"
                  onClick={onExitLobby}
                  className="btn-war-gold px-4 py-1.5 rounded text-xs"
                >
                  Regresar al Salón de Guerra
                </button>
              </div>
            </div>

            {/* Post-Match Statistics Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {statsShowHelp && (
                <div className="p-3.5 rounded-lg bg-[#120f0d] border border-[#c59b27]/60 font-serif text-xs text-[#e7dfd3] grid grid-cols-1 md:grid-cols-3 gap-2 leading-snug">
                  <div>
                    • <strong className="text-[#f3d46b]">Mayor Daño / Más Jugada / Más Letal:</strong> Destacan las cartas individuales que más daño acumularon, más veces entraron en juego o más unidades enemigas destruyeron en toda la partida.
                  </div>
                  <div>
                    • <strong className="text-[#f3d46b]">Comparativa de Jugadores:</strong> Muestra lado a lado los Puntos de Desarrollo, Ciudadanos vivos al cerrar, daño total hecho a unidades rivales, cartas jugadas y bajas logradas.
                  </div>
                  <div>
                    • <strong className="text-[#f3d46b]">Desglose por Carta:</strong> Lista todas las cartas jugadas en el duelo con cuántas veces se jugaron, cuánto daño hicieron y cuántas bajas causaron.
                  </div>
                </div>
              )}

              {view.matchStats ? (
                <>
                  {/* 1. Match Overview & MVP Highlight Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                    {/* Match Duration & Starting Player */}
                    <div
                      title="Cantidad total de turnos jugados y quién tuvo el primer turno de la partida."
                      className="p-3.5 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between"
                    >
                      <span className="font-display text-[10px] font-bold uppercase text-[#c59b27]">
                        Ritmo de la Batalla
                      </span>
                      <div className="my-1.5">
                        <div className="font-display text-lg font-black text-[#f3ead8]">
                          {view.matchStats.totalTurns} Turnos Jugados
                        </div>
                        <div className="font-serif text-xs text-[#d6c7b8]">
                          Salió primero (Turno 1):{' '}
                          <strong className="text-[#f3d46b]">
                            {view.matchStats.firstPlayerName || '—'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* MVP 1: Top Damage Card */}
                    <div
                      title="La carta que más daño total infligió a unidades enemigas (sumando ataques y habilidades)."
                      className="p-3.5 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between"
                    >
                      <span className="font-display text-[10px] font-bold uppercase text-[#fca5a5]">
                        ⚔️ Carta con Mayor Daño
                      </span>
                      {view.matchStats.topDamageCard ? (
                        <div className="my-1">
                          <div className="font-display text-sm font-bold text-[#fef08a] truncate">
                            {view.matchStats.topDamageCard.cardName}
                          </div>
                          <div className="font-serif text-xs text-[#d6c7b8]">
                            <strong>{view.matchStats.topDamageCard.damageDealt}</strong>{' '}
                            de daño total ({view.matchStats.topDamageCard.ownerName})
                          </div>
                        </div>
                      ) : (
                        <span className="font-serif italic text-xs text-[#8c7e70]">
                          Sin daño registrado
                        </span>
                      )}
                    </div>

                    {/* MVP 2: Most Played Card */}
                    <div
                      title="La carta que más veces fue jugada durante la partida."
                      className="p-3.5 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between"
                    >
                      <span className="font-display text-[10px] font-bold uppercase text-[#86efac]">
                        📜 Carta Más Usada
                      </span>
                      {view.matchStats.mostPlayedCard ? (
                        <div className="my-1">
                          <div className="font-display text-sm font-bold text-[#fef08a] truncate">
                            {view.matchStats.mostPlayedCard.cardName}
                          </div>
                          <div className="font-serif text-xs text-[#d6c7b8]">
                            Jugada{' '}
                            <strong>{view.matchStats.mostPlayedCard.timesPlayed}</strong>{' '}
                            {view.matchStats.mostPlayedCard.timesPlayed === 1
                              ? 'vez'
                              : 'veces'}{' '}
                            ({view.matchStats.mostPlayedCard.ownerName})
                          </div>
                        </div>
                      ) : (
                        <span className="font-serif italic text-xs text-[#8c7e70]">
                          Sin cartas jugadas
                        </span>
                      )}
                    </div>

                    {/* MVP 3: Most Lethal Card */}
                    <div
                      title="La carta que destruyó más unidades enemigas durante la partida."
                      className="p-3.5 rounded-lg bg-[#16120f] border border-[#574c3f] flex flex-col justify-between"
                    >
                      <span className="font-display text-[10px] font-bold uppercase text-[#f3d46b]">
                        💀 Carta Más Letal
                      </span>
                      {view.matchStats.mostLethalCard ? (
                        <div className="my-1">
                          <div className="font-display text-sm font-bold text-[#fef08a] truncate">
                            {view.matchStats.mostLethalCard.cardName}
                          </div>
                          <div className="font-serif text-xs text-[#d6c7b8]">
                            <strong>{view.matchStats.mostLethalCard.kills}</strong>{' '}
                            {view.matchStats.mostLethalCard.kills === 1
                              ? 'baja enemiga'
                              : 'bajas enemigas'}{' '}
                            ({view.matchStats.mostLethalCard.ownerName})
                          </div>
                        </div>
                      ) : (
                        <span className="font-serif italic text-xs text-[#8c7e70]">
                          Sin bajas registradas
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2. Side-by-Side Player vs Opponent Comparison */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {[
                      {
                        p: view.matchStats.you,
                        badge: 'border-[#3b82f6] bg-[#172536]/40',
                        titleColor: 'text-[#93c5fd]',
                        tag: 'Tu Desempeño',
                        isWinner: view.winnerId === view.matchStats.you.playerId,
                      },
                      {
                        p: view.matchStats.opponent,
                        badge: 'border-[#ef4444] bg-[#361515]/40',
                        titleColor: 'text-[#fca5a5]',
                        tag: 'Desempeño del Oponente',
                        isWinner: view.winnerId === view.matchStats.opponent.playerId,
                      },
                    ].map(({ p, badge, titleColor, tag, isWinner }) => (
                      <div
                        key={tag}
                        className={`p-4 rounded-lg border ${badge} space-y-3`}
                      >
                        <div className="flex items-center justify-between border-b border-[#463c32] pb-2">
                          <div>
                            <span className="font-display text-[10px] uppercase tracking-wider text-[#a89b8c]">
                              {tag} {p.wentFirst ? '• Salió 1º' : '• Salió 2º'}
                            </span>
                            <h3 className={`font-display text-base font-bold ${titleColor}`}>
                              {p.playerName} {isWinner ? '👑' : ''}
                            </h3>
                          </div>
                          <div className="text-right">
                            <div className="font-display text-lg font-black text-[#fef08a]">
                              {p.developmentPoints} / {pointsGoal} Pts
                            </div>
                            <div className="font-serif text-xs text-[#d6c7b8]">
                              {p.citizensAtEnd} Ciudadanos en mesa al final
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <div
                            title="Suma total de daño infligido a unidades enemigas durante la partida."
                            className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]"
                          >
                            <span className="block font-display text-[10px] text-[#fca5a5] uppercase">
                              Daño Total
                            </span>
                            <strong className="font-display text-base text-[#f3ead8]">
                              {p.damageDealt}
                            </strong>
                          </div>

                          <div
                            title="Cantidad total de cartas jugadas por este jugador en la partida."
                            className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]"
                          >
                            <span className="block font-display text-[10px] text-[#f3d46b] uppercase">
                              Cartas Jugadas
                            </span>
                            <strong className="font-display text-base text-[#f3ead8]">
                              {p.cardsPlayed}
                            </strong>
                          </div>

                          <div
                            title="Cantidad de unidades enemigas destruidas por ataques o efectos de este jugador."
                            className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]"
                          >
                            <span className="block font-display text-[10px] text-[#86efac] uppercase">
                              Bajas Logradas
                            </span>
                            <strong className="font-display text-base text-[#f3ead8]">
                              {p.enemyUnitsKilled}
                            </strong>
                          </div>

                          <div
                            title="Estado final de reservas al terminar la partida (Mano / Mazo / Descarte / Exilio)."
                            className="p-2.5 rounded bg-[#120f0d] border border-[#3a322a]"
                          >
                            <span className="block font-display text-[10px] text-[#93c5fd] uppercase">
                              Mano / Mazo Fin
                            </span>
                            <strong className="font-display text-sm text-[#f3ead8]">
                              {p.cardsInHand} en mano
                            </strong>
                            <span className="block text-[10px] text-[#a89b8c]">
                              Mazo: {p.cardsInDeck} • Desc: {p.cardsInDiscard}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* 3. Card Breakdown Table */}
                  <div className="rounded-lg bg-[#15110e] border border-[#574c3f] overflow-hidden">
                    <div className="px-4 py-2.5 bg-[#1e1814] border-b border-[#463c32] flex flex-wrap items-center justify-between gap-2">
                      <span className="font-display text-xs font-bold uppercase text-[#f3d46b]">
                        Desglose de Cartas Utilizadas en la Batalla
                      </span>
                      <div className="flex items-center gap-1.5">
                        {(
                          [
                            { id: 'all', label: 'Todas' },
                            { id: 'you', label: `Tus Cartas (${view.matchStats.you.playerName})` },
                            {
                              id: 'opponent',
                              label: `Rival (${view.matchStats.opponent.playerName})`,
                            },
                          ] as const
                        ).map((tab) => (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setStatsCardTab(tab.id)}
                            className={`px-2.5 py-1 rounded font-display text-[10px] font-bold border transition ${
                              statsCardTab === tab.id
                                ? 'bg-[#2b2216] border-[#c59b27] text-[#fef08a]'
                                : 'bg-[#120f0d] border-[#3a322a] text-[#a89b8c] hover:text-[#f3ead8]'
                            }`}
                          >
                            {tab.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="overflow-x-auto max-h-60">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b border-[#3a322a] bg-[#120f0d] font-display text-[10px] uppercase text-[#c59b27]">
                            <th className="py-2 px-3">Carta</th>
                            <th className="py-2 px-3">Jugador</th>
                            <th
                              onClick={() => setStatsSortField('timesPlayed')}
                              className="py-2 px-3 cursor-pointer hover:text-[#fef08a]"
                            >
                              Veces Jugada {statsSortField === 'timesPlayed' ? '↓' : ''}
                            </th>
                            <th
                              onClick={() => setStatsSortField('damageDealt')}
                              className="py-2 px-3 cursor-pointer hover:text-[#fef08a]"
                            >
                              Daño Infligido {statsSortField === 'damageDealt' ? '↓' : ''}
                            </th>
                            <th
                              onClick={() => setStatsSortField('kills')}
                              className="py-2 px-3 cursor-pointer hover:text-[#fef08a]"
                            >
                              Bajas Enemigas {statsSortField === 'kills' ? '↓' : ''}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#2b241e] font-serif">
                          {(() => {
                            const rawList =
                              statsCardTab === 'you'
                                ? view.matchStats.you.cardBreakdown
                                : statsCardTab === 'opponent'
                                ? view.matchStats.opponent.cardBreakdown
                                : [
                                    ...(view.matchStats.you.cardBreakdown || []),
                                    ...(view.matchStats.opponent.cardBreakdown || []),
                                  ];
                            const sorted = [...rawList].sort(
                              (a, b) =>
                                Number(b[statsSortField] || 0) -
                                Number(a[statsSortField] || 0)
                            );
                            if (sorted.length === 0) {
                              return (
                                <tr>
                                  <td
                                    colSpan={5}
                                    className="py-6 text-center italic text-[#8c7e70]"
                                  >
                                    No se registraron cartas jugadas en esta categoría.
                                  </td>
                                </tr>
                              );
                            }
                            return sorted.map((c, idx) => (
                              <tr
                                key={`${c.ownerId}_${c.cardId}_${idx}`}
                                className="hover:bg-[#1e1813]"
                              >
                                <td className="py-2 px-3">
                                  <span className="font-display font-bold text-[#f3ead8]">
                                    {c.cardName}
                                  </span>{' '}
                                  <span className="text-[10px] text-[#8c7e70] uppercase font-display ml-1">
                                    ({c.cardType === 'citizen'
                                      ? 'Ciudadano'
                                      : c.cardType === 'tool'
                                      ? 'Herramienta'
                                      : 'Evento'})
                                  </span>
                                </td>
                                <td className="py-2 px-3 font-display text-[#d6c7b8]">
                                  {c.ownerName}
                                </td>
                                <td className="py-2 px-3 font-display font-bold text-[#f3d46b]">
                                  {c.timesPlayed}
                                </td>
                                <td className="py-2 px-3 font-display font-bold text-[#fca5a5]">
                                  {c.damageDealt}
                                </td>
                                <td className="py-2 px-3 font-display font-bold text-[#86efac]">
                                  {c.kills}
                                </td>
                              </tr>
                            ));
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {isPromptForMe && isOffBoardPrompt && view.pendingPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0b09]/85 backdrop-blur-sm p-4">
          <div className="bastion-panel rounded-lg max-w-4xl w-full p-6 space-y-4 border-2 border-[#f3d46b]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#6b5a48] pb-3">
              <div>
                <span className="font-display text-xs font-bold uppercase text-[#f3d46b]">
                  Efecto en Curso ({view.pendingPrompt.sourceCardName})
                </span>
                <h3 className="font-display text-lg font-bold text-[#f3ead8]">
                  {view.pendingPrompt.promptText}
                </h3>
              </div>

              {view.pendingPrompt.multiSelect && (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      const allIds = (view.pendingPrompt?.candidateCards || []).map(
                        (c) => c.instanceId
                      );
                      if (selectedPromptIds.length === allIds.length) {
                        setSelectedPromptIds([]);
                      } else {
                        setSelectedPromptIds(allIds);
                      }
                    }}
                    className="btn-war-iron px-3 py-1.5 rounded text-xs"
                  >
                    {selectedPromptIds.length ===
                    (view.pendingPrompt.candidateCards || []).length
                      ? 'Desmarcar todas'
                      : 'Seleccionar todas'}
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      sendAction({
                        type: 'SELECT_TARGET',
                        cardInstanceIds: [],
                      })
                    }
                    className="btn-war-iron px-3 py-1.5 rounded text-xs"
                  >
                    No descartar ninguna (0)
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      sendAction({
                        type: 'SELECT_TARGET',
                        cardInstanceIds: selectedPromptIds,
                      })
                    }
                    className="btn-war-gold px-4 py-1.5 rounded text-xs flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Confirmar ({selectedPromptIds.length} seleccionada
                    {selectedPromptIds.length === 1 ? '' : 's'})
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 max-h-[65vh] overflow-y-auto p-2">
              {(view.pendingPrompt.candidateCards || []).map((cand) => {
                const isMulti = Boolean(view.pendingPrompt?.multiSelect);
                const isChosen =
                  isMulti && selectedPromptIds.includes(cand.instanceId);

                return (
                  <div key={cand.instanceId} className="flex justify-center">
                    <CardView
                      card={cand.definition}
                      instance={cand}
                      vitalityMode={view.rules.vitalityMode}
                      size="md"
                      isSelected={isChosen}
                      isTargetable={!isMulti}
                      onClick={() => {
                        if (isMulti) {
                          setSelectedPromptIds((prev) =>
                            prev.includes(cand.instanceId)
                              ? prev.filter((id) => id !== cand.instanceId)
                              : [...prev, cand.instanceId]
                          );
                        } else {
                          sendAction({
                            type: 'SELECT_TARGET',
                            targetCardId: cand.instanceId,
                          });
                        }
                      }}
                      footerAction={
                        isMulti ? (
                          <div
                            className={`font-display text-[10px] font-bold text-center py-1 rounded-sm ${
                              isChosen
                                ? 'bg-[#f3d46b] text-[#12100e]'
                                : 'bg-[#26211d] text-[#a89b8c]'
                            }`}
                          >
                            {isChosen ? '✓ DESCARTAR' : 'CONSERVAR EN MANO'}
                          </div>
                        ) : (
                          <div className="btn-war-gold text-[10px] text-center py-1 rounded-sm">
                            Seleccionar
                          </div>
                        )
                      }
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {keywordsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0b09]/85 backdrop-blur-sm p-4">
          <div className="bastion-panel rounded-lg max-w-3xl w-full p-6 space-y-4 border-2 border-[#c59b27] max-h-[88vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#6b5a48] pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-[#f3d46b]" />
                <div>
                  <h3 className="font-display text-base font-bold text-[#f3ead8]">
                    Glosario de Palabras Clave (Keywords)
                  </h3>
                  <p className="font-serif text-xs text-[#d6c7b8]">
                    En las cartas, las palabras subrayadas con línea punteada dorada son Keywords. Pasá el cursor sobre una carta o palabra para ver su explicación.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setKeywordsModalOpen(false)}
                className="btn-war-iron px-3 py-1 rounded text-xs flex items-center gap-1"
              >
                <X className="w-3.5 h-3.5" /> Cerrar
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto pr-1">
              {GAME_KEYWORDS.map((kw) => (
                <div
                  key={kw.id}
                  className="p-3 rounded bg-[#14110e] border border-[#574c3f] space-y-1"
                >
                  <div className="font-display text-xs font-bold text-[#fef08a]">
                    {kw.badge}
                  </div>
                  <p className="font-serif text-xs text-[#d6c7b8] leading-snug">
                    {kw.description}
                  </p>
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
                {inspectPile.cards.map((c) => {
                  const canPlayFromDiscard =
                    c.definition.playFromDiscard &&
                    inspectPile.title === 'Tu Pila de Descarte' &&
                    view.phase === 'MAIN' &&
                    view.isYourTurn &&
                    view.playsRemaining > 0;
                  return (
                    <div key={c.instanceId} className="flex justify-center">
                      <CardView
                        card={c.definition}
                        instance={c}
                        size="md"
                        onClick={
                          canPlayFromDiscard
                            ? () => {
                                setSelectedBoardCardId(null);
                                setSelectedHandCardId(c.instanceId);
                                setInspectPile(null);
                              }
                            : undefined
                        }
                        footerAction={
                          canPlayFromDiscard ? (
                            <div className="btn-war-gold text-[10px] text-center py-1 rounded-sm">
                              ♻️ Jugar desde Descarte
                            </div>
                          ) : undefined
                        }
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
