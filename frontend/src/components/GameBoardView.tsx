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
  SkipForward,
  Swords,
  Target,
  Trophy,
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
    return 'bg-gradient-to-r from-[#1f3322]/90 via-[#28452c]/85 to-[#1f3322]/90 border-2 border-[#c59b27] shadow-[inset_0_0_24px_rgba(197,155,39,0.35)] cursor-pointer';
  }
  switch (zone) {
    case 'city':
      // La Ciudad: Stone/Citadel sanctuary tone, solid double-feel bronze/gold-tinted border & bluish-stone sheen
      return 'bg-gradient-to-r from-[#171a20]/90 via-[#1f232b]/85 to-[#171a20]/90 border-2 border-[#6b5b3e]/80 shadow-[inset_0_3px_12px_rgba(0,0,0,0.85)]';
    case 'road':
      // El Camino: Earth/Dusty path tone, weathered dashed border
      return 'bg-gradient-to-r from-[#221b15]/90 via-[#2b221a]/85 to-[#221b15]/90 border border-dashed border-[#705b44] shadow-[inset_0_3px_12px_rgba(0,0,0,0.85)]';
    case 'combat':
      // Zona de Combate: Danger/Ember dark crimson glow
      return 'bg-[radial-gradient(ellipse_at_center,rgba(115,28,22,0.32)_0%,rgba(26,15,13,0.92)_85%)] border border-[#82312a]/85 shadow-[inset_0_3px_14px_rgba(0,0,0,0.9)]';
  }
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

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-[#12100e] text-[#e7dfd3] select-none relative">
      {/* =====================================================================
          1. COMPACT TOP WAR-BANNER HEADER (h-12, Siege Scoreboard Centered)
         ===================================================================== */}
      <header className="h-12 shrink-0 px-3 bg-gradient-to-b from-[#231d19] to-[#161310] border-b border-[#574c3f] flex items-center justify-between gap-2 z-30 shadow-[0_4px_16px_rgba(0,0,0,0.85)]">
        {/* Left: Exit + Match Title + Phase Stepper */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onExitLobby}
            className="btn-war-iron flex items-center gap-1 px-2.5 py-1 rounded text-[11px]"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#c59b27]" /> Bastión
          </button>

          <div className="hidden sm:flex items-center gap-2">
            <span className="font-display font-bold text-xs text-[#e3c158] truncate max-w-[150px]">
              {view.gameName}
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-[#12100e] border border-[#574c3f] font-display text-[10px] font-bold text-[#e7dfd3]">
              Turno {view.turnNumber || 0}
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-[#12100e] px-1.5 py-0.5 rounded border border-[#3a322a]">
            {PHASE_STEPS.map((step) => {
              const currentOrigin =
                view.phase === 'AWAITING_INPUT' ? view.originPhase : view.phase;
              const isActive = currentOrigin === step.id;
              return (
                <span
                  key={step.id}
                  className={`px-2 py-0.5 rounded-sm font-display text-[9px] font-bold transition ${
                    isActive
                      ? 'bg-gradient-to-b from-[#d8b13a] to-[#8a6d1b] text-[#12100e] shadow'
                      : 'text-[#8c7e70]'
                  }`}
                >
                  {step.label}
                </span>
              );
            })}
          </div>
        </div>

        {/* Center: Physical Siege / Development Banner (Vos vs Rival) */}
        <div className="flex items-center gap-2 bg-[#14110e] border border-[#6e5a3e] px-3 py-1 rounded-md shadow-[inset_0_2px_8px_rgba(0,0,0,0.9)]">
          {/* Player Score */}
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-xs text-[#e3c158] truncate max-w-[100px]">
              {view.you.name}
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-[#2b2216] border border-[#c59b27]/60 font-display font-black text-xs text-[#f5e0a3] flex items-center gap-1">
              <Trophy className="w-3 h-3 text-[#d4af37]" />
              {view.you.developmentPoints}/{view.rules.pointsToWin}
            </span>
            <span
              className="text-[11px] font-display font-bold text-[#c59b27]"
              title="Tus Ciudadanos en el campo"
            >
              ({myCitizens} Ciud.)
            </span>
          </div>

          <Swords className="w-3.5 h-3.5 text-[#8a6d1b] mx-1" />

          {/* Opponent Score */}
          <div className="flex items-center gap-2">
            <span
              className="text-[11px] font-display font-bold text-[#cd6155]"
              title="Ciudadanos del rival en el campo"
            >
              ({oppCitizens} Ciud.)
            </span>
            <span className="px-2 py-0.5 rounded-sm bg-[#291514] border border-[#8c2222]/60 font-display font-black text-xs text-[#fecaca] flex items-center gap-1">
              <Trophy className="w-3 h-3 text-[#ef4444]" />
              {view.opponent?.developmentPoints || 0}/{view.rules.pointsToWin}
            </span>
            <span className="font-display font-bold text-xs text-[#d6c7b8] truncate max-w-[100px]">
              {view.opponent ? view.opponent.name : 'Esperando...'}
            </span>
          </div>
        </div>

        {/* Right: Vitality Mode Badge & Opponent Hand Count */}
        <div className="flex items-center gap-2 text-[11px]">
          <span className="hidden md:inline-block px-2 py-0.5 rounded-sm bg-[#1a1613] border border-[#4a3f35] text-[#a89b8c] font-display">
            Modo: {view.rules.vitalityMode === 'base_attack' ? 'Ataque Base' : 'V Dinámica'}
          </span>
          {view.opponent && (
            <span className="px-2 py-0.5 rounded-sm bg-[#241b17] border border-[#574c3f] text-[#e7dfd3] font-display">
              Mano Rival: <strong>{view.opponent.handCount}</strong>
            </span>
          )}
        </div>
      </header>

      {/* =====================================================================
          2. MAIN WORKSPACE: Central 6-Row War Table + Narrow Right Chronicle
         ===================================================================== */}
      <div className="flex-1 min-h-0 flex overflow-hidden relative">
        {/* LEFT / CENTER WAR TABLE (6 Compact Rows + Floating CCG Hand at bottom) */}
        <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-5 pt-2 pb-[106px] gap-1.5 relative overflow-hidden">
          {/* Error Banner */}
          {error && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded bg-[#451210] border-2 border-[#dc2626] text-[#fecaca] text-xs font-display font-bold shadow-2xl flex items-center gap-3">
              <span>⚠️ {error}</span>
              <button
                onClick={() => setError(null)}
                className="text-white underline text-[11px]"
              >
                Cerrar
              </button>
            </div>
          )}

          {/* OPPONENT 3 ROWS (City -> Road -> Combat) */}
          <div className="flex-1 min-h-0 grid grid-rows-3 gap-1">
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
                  className={`min-h-0 rounded-md px-3 flex items-center justify-between gap-2 relative transition ${getZoneSurfaceClasses(
                    zone.id,
                    isClosestAttackRow
                  )}`}
                >
                  {/* Zone Crest & Title */}
                  <div className="w-36 shrink-0 flex flex-col border-r border-[#574c3f]/40 pr-2">
                    <span className="font-display font-bold text-[11px] text-[#d6c7b8] tracking-wider uppercase leading-tight">
                      {zone.label}
                    </span>
                    <span className="text-[9px] text-[#8c7e70]">
                      {zone.subtitle} • {cards.length}
                    </span>
                  </div>

                  {/* Units in Row */}
                  <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto py-0.5">
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

                  <div className="w-28 shrink-0 text-right">
                    {isClosestAttackRow && (
                      <span className="font-display text-[10px] font-bold text-[#fca5a5] animate-pulse">
                        ⚔️ Objetivo al alcance
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* =================================================================
              BATTLEFRONT RIFT / CROSSED-SWORDS DIVIDER + END TURN WAR COIN
             ================================================================= */}
          <div className="h-8 shrink-0 flex items-center justify-between px-2 relative my-0.5">
            {/* Scorched Battle Rift Line */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-transparent via-[#8c2222] to-transparent shadow-[0_0_12px_#dc2626] pointer-events-none" />
            <div className="absolute inset-x-16 top-1/2 -translate-y-1/2 h-[1px] bg-gradient-to-r from-transparent via-[#e3c158]/70 to-transparent pointer-events-none" />

            {/* Left: Majority Indicator */}
            <div
              className={`relative z-10 px-2.5 py-0.5 rounded-sm border font-display text-[10px] font-bold shadow ${
                myCitizens > oppCitizens
                  ? 'bg-[#17291b] border-[#c59b27] text-[#e3c158]'
                  : oppCitizens > myCitizens
                  ? 'bg-[#2b1412] border-[#8c2222] text-[#fca5a5]'
                  : 'bg-[#1c1815] border-[#574c3f] text-[#a89b8c]'
              }`}
            >
              {myCitizens > oppCitizens
                ? `Dominio del Bastión: ${myCitizens} vs ${oppCitizens} (+1 Pto al cerrar)`
                : oppCitizens > myCitizens
                ? `Asedio Rival: ${oppCitizens} vs ${myCitizens}`
                : `Frente Igualado: ${myCitizens} vs ${oppCitizens}`}
            </div>

            {/* Center: Crossed Swords Emblem / Active Prompt or Mulligan */}
            <div className="relative z-10">
              {view.phase === 'AWAITING_INPUT' && view.pendingPrompt ? (
                <div className="px-4 py-0.5 rounded bg-[#6e1414] border border-[#fca5a5] text-[#fef2f2] font-display text-[11px] font-bold shadow-lg flex items-center gap-1.5 animate-pulse">
                  <Target className="w-3.5 h-3.5 text-[#fde047]" />
                  <span>{view.pendingPrompt.promptText}</span>
                </div>
              ) : view.phase === 'MULLIGAN' ? (
                <div className="flex items-center gap-2 bg-[#1c1713] border-2 border-[#c59b27] px-3 py-0.5 rounded shadow-xl">
                  <span className="font-display text-[11px] font-bold text-[#e3c158]">
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
                      className="btn-war-gold px-2.5 py-0.5 rounded text-[10px]"
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
                <div className="px-3 py-0.5 rounded-sm bg-[#1a1512] border border-[#6e5a3e] font-display text-[10px] font-bold text-[#d4af37] flex items-center gap-1.5 shadow">
                  <Swords className="w-3 h-3 text-[#c59b27]" />
                  <span>
                    {view.isYourTurn
                      ? 'FRENTE DE BATALLA — TU TURNO'
                      : `TURNO DE ${view.opponent?.name?.toUpperCase() || 'OPONENTE'}`}
                  </span>
                </div>
              )}
            </div>

            {/* Right: Tactile Gold/Bronze "Finalizar Turno" Button */}
            <div className="relative z-10">
              <button
                disabled={view.phase !== 'MAIN' || !view.isYourTurn || submitting}
                onClick={() => sendAction({ type: 'END_TURN' })}
                className="btn-war-gold px-4 py-1 rounded text-[11px] flex items-center gap-1.5"
              >
                <SkipForward className="w-3.5 h-3.5" />
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
                  className={`min-h-0 rounded-md px-3 flex items-center justify-between gap-2 relative transition ${getZoneSurfaceClasses(
                    zone.id,
                    isInteractiveRow
                  )}`}
                >
                  {/* Zone Crest & Title */}
                  <div className="w-36 shrink-0 flex flex-col border-r border-[#574c3f]/40 pr-2">
                    <span className="font-display font-bold text-[11px] text-[#e3c158] tracking-wider uppercase leading-tight">
                      {zone.label}
                    </span>
                    <span className="text-[9px] text-[#a89b8c]">
                      {zone.subtitle} • {cards.length}
                    </span>
                  </div>

                  {/* Units in Row */}
                  <div className="flex-1 flex items-center justify-center gap-3 overflow-x-auto py-0.5">
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
                  <div className="w-36 shrink-0 flex justify-end">
                    {canPlayHere && selectedHandCard && (
                      <span className="btn-war-gold px-2.5 py-0.5 rounded text-[10px]">
                        + Desplegar aquí
                      </span>
                    )}
                    {canMoveHere && selectedBoardCard && (
                      <span className="btn-war-iron border-[#c59b27] px-2.5 py-0.5 rounded text-[10px] flex items-center gap-1">
                        <Move className="w-3 h-3 text-[#e3c158]" /> Marchar aquí
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* =================================================================
              FLOATING CCG HAND AT BOTTOM CENTER (fixed bottom-0, fan & hover)
             ================================================================= */}
          <div className="fixed bottom-0 left-0 right-64 z-40 pointer-events-none flex flex-col items-center justify-end pb-1">
            {/* Execute Event Button when an Event card is selected */}
            {selectedHandCard &&
              selectedHandCard.definition.type === 'event' &&
              view.phase === 'MAIN' &&
              view.isYourTurn &&
              view.playsRemaining > 0 && (
                <div className="mb-2 pointer-events-auto">
                  <button
                    disabled={submitting}
                    onClick={() =>
                      sendAction({
                        type: 'PLAY_CARD',
                        cardInstanceId: selectedHandCard.instanceId,
                      })
                    }
                    className="btn-war-gold px-5 py-1.5 rounded-md text-xs flex items-center gap-2 shadow-[0_0_24px_rgba(212,175,55,0.65)]"
                  >
                    <Flame className="w-4 h-4" />
                    Ejecutar Decreto: {selectedHandCard.definition.name}
                  </button>
                </div>
              )}

            <div className="flex items-end justify-center -space-x-6 pointer-events-auto px-6">
              {handCards.map((inst, idx) => {
                const isMulliganSelected =
                  view.phase === 'MULLIGAN' &&
                  mulliganIds.includes(inst.instanceId);
                const isMainSelected =
                  view.phase === 'MAIN' && selectedHandCardId === inst.instanceId;
                const isSelected = isMulliganSelected || isMainSelected;

                const mid = (handCards.length - 1) / 2;
                const offset = idx - mid;
                const rotateDeg = offset * 3;
                const arcDropY = Math.abs(offset) * 3 + 22; // Tucked slightly at bottom until hovered

                return (
                  <div
                    key={inst.instanceId}
                    style={{
                      transform: isSelected
                        ? 'translateY(-24px) scale(1.1) rotate(0deg)'
                        : `translateY(${arcDropY}px) rotate(${rotateDeg}deg)`,
                    }}
                    className="transition-all duration-200 ease-out hover:!-translate-y-6 hover:!scale-110 hover:!rotate-0 hover:z-50"
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
                                ? 'bg-[#c59b27] text-[#12100e]'
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
            3. NARROW RIGHT SIDEBAR (w-64, Dark Parchment Tactical Chronicle)
           =================================================================== */}
        <aside className="w-64 shrink-0 bg-gradient-to-b from-[#1f1a16] via-[#181411] to-[#120f0d] border-l border-[#574c3f] flex flex-col justify-between z-30 shadow-[-6px_0_20px_rgba(0,0,0,0.8)]">
          {/* Top Section: Action Seals (Jugadas & Movimiento) + Collapsible Guide Accordion */}
          <div className="p-3 space-y-2.5 border-b border-[#3a322a]">
            {/* Action Seals */}
            <div className="p-2.5 rounded bg-[#14110e] border border-[#574c3f]/80 space-y-2 shadow-inner">
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-bold text-[#a89b8c] text-[10px] uppercase">
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
                          ? 'bg-gradient-to-b from-[#e3c158] to-[#8a6d1b] border-[#fef08a] shadow-[0_0_6px_#c59b27]'
                          : 'bg-[#26211d] border-[#473c33]'
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-bold text-[#a89b8c] text-[10px] uppercase">
                  Marcha Adyacente
                </span>
                <span
                  className={`px-2 py-0.2 rounded-sm font-display font-bold text-[10px] border ${
                    view.movesRemaining > 0
                      ? 'bg-[#2b2216] border-[#c59b27] text-[#e3c158]'
                      : 'bg-[#1a1613] border-[#3a322a] text-[#6e6053]'
                  }`}
                >
                  {view.movesRemaining} disp.
                </span>
              </div>
            </div>

            {/* Collapsible Quick Guide Accordion */}
            <div className="rounded bg-[#16120f] border border-[#4a3f35]">
              <button
                type="button"
                onClick={() => setGuideOpen((v) => !v)}
                className="w-full px-2.5 py-1.5 flex items-center justify-between text-left font-display text-[10px] font-bold text-[#c59b27] hover:text-[#e3c158]"
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

          {/* Middle Section: Bitácora de Batalla (Scrollable Dark Parchment Chronicle) */}
          <div className="flex-1 min-h-0 flex flex-col p-3 overflow-hidden">
            <div className="flex items-center gap-1.5 pb-2 mb-2 border-b border-[#3a322a]">
              <ScrollText className="w-3.5 h-3.5 text-[#c59b27]" />
              <h3 className="font-display text-[11px] font-bold uppercase tracking-wider text-[#e3c158]">
                Crónica de Batalla
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              {[...(view.log || [])].reverse().map((entry, idx) => (
                <div
                  key={idx}
                  className="p-2 rounded-sm bg-[#14110e] border border-[#362e26] font-serif text-xs leading-snug text-[#d6c7b8]"
                >
                  <span className="font-display font-bold text-[10px] text-[#c59b27] mr-1.5">
                    [T{entry.turn}]
                  </span>
                  <span>{entry.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Section: Compact Deck, Discard & Exile Counters */}
          <div className="p-3 border-t border-[#3a322a] bg-[#14110e] space-y-2">
            <div className="text-[10px] font-display font-bold uppercase text-[#a89b8c]">
              Tus Reservas (Mano: {handCards.length})
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-center">
              <div className="p-1.5 rounded bg-[#1f1a16] border border-[#574c3f]">
                <div className="text-[9px] font-display text-[#a89b8c]">Mazo</div>
                <div className="font-display font-black text-xs text-[#e3c158]">
                  {view.you.deckCount}
                </div>
              </div>
              <button
                onClick={() =>
                  setInspectPile({
                    title: 'Tu Pila de Descarte',
                    cards: view.you.discard,
                  })
                }
                className="p-1.5 rounded bg-[#1f1a16] hover:border-[#c59b27] border border-[#574c3f] transition"
              >
                <div className="text-[9px] font-display text-[#a89b8c]">Descarte</div>
                <div className="font-display font-black text-xs text-[#e7dfd3]">
                  {view.you.discard.length}
                </div>
              </button>
              <button
                onClick={() =>
                  setInspectPile({
                    title: 'Tu Zona de Exilio',
                    cards: view.you.exile,
                  })
                }
                className="p-1.5 rounded bg-[#1f1a16] hover:border-[#c59b27] border border-[#574c3f] transition"
              >
                <div className="text-[9px] font-display text-[#a89b8c]">Exilio</div>
                <div className="font-display font-black text-xs text-[#e7dfd3]">
                  {view.you.exile.length}
                </div>
              </button>
            </div>

            {view.opponent && (
              <div className="flex items-center justify-between pt-1 text-[10px] text-[#8c7e70]">
                <span>Mazo Rival: {view.opponent.deckCount}</span>
                <button
                  onClick={() =>
                    setInspectPile({
                      title: `Descarte de ${view.opponent?.name}`,
                      cards: view.opponent?.discard || [],
                    })
                  }
                  className="hover:text-[#e3c158] underline"
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
          <div className="bastion-panel rounded-lg max-w-md w-full p-6 text-center space-y-3 border-2 border-[#c59b27]">
            <Users className="w-10 h-10 text-[#c59b27] mx-auto animate-pulse" />
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
          <div className="bastion-panel rounded-xl max-w-md w-full p-8 text-center space-y-4 border-2 border-[#c59b27]">
            <Crown className="w-14 h-14 text-[#e3c158] mx-auto" />
            <h2 className="font-display text-2xl font-black text-[#f3ead8]">
              {view.winnerId === playerId ? '¡VICTORIA EN EL BASTIÓN!' : 'CAÍDA DEL BASTIÓN'}
            </h2>
            <p className="font-serif text-base text-[#e3c158]">{view.winReason}</p>
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
          <div className="bastion-panel rounded-lg max-w-4xl w-full p-6 space-y-4 border-2 border-[#c59b27]">
            <div className="border-b border-[#574c3f] pb-3">
              <span className="font-display text-xs font-bold uppercase text-[#c59b27]">
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
            <div className="flex items-center justify-between border-b border-[#574c3f] pb-3">
              <div className="flex items-center gap-2">
                <Archive className="w-5 h-5 text-[#c59b27]" />
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
