import React from 'react';
import {
  Flame,
  Flag,
  Heart,
  Scroll,
  Search,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Undo2,
  Users,
  Zap,
} from 'lucide-react';
import { CardDefinition, CardInstance, VitalityMode } from '../types/game';
import { CardArt } from './CardArt';

export type CardSize = 'board' | 'hand' | 'md' | 'lg';

export interface CardAnimEffect {
  kind:
    | 'summon'
    | 'march'
    | 'march-up'
    | 'march-down'
    | 'attack-up'
    | 'attack-down'
    | 'damaged'
    | 'destroyed'
    | 'buffed';
  amount?: number;
  destroyed?: boolean;
}

interface CardViewProps {
  card: CardDefinition;
  instance?: CardInstance;
  vitalityMode?: VitalityMode;
  size?: CardSize;
  compact?: boolean;
  isSelected?: boolean;
  isTargetable?: boolean;
  canAttack?: boolean;
  canMove?: boolean;
  badgeCount?: number;
  animEffect?: CardAnimEffect;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  footerAction?: React.ReactNode;
}

export function renderCardIcon(iconName?: string, className = 'w-4 h-4') {
  switch (iconName) {
    case 'sword':
      return <Sword className={className} />;
    case 'users':
      return <Users className={className} />;
    case 'flag':
      return <Flag className={className} />;
    case 'zap':
      return <Zap className={className} />;
    case 'scroll':
      return <Scroll className={className} />;
    case 'flame':
      return <Flame className={className} />;
    case 'heart':
      return <Heart className={className} />;
    case 'search':
      return <Search className={className} />;
    case 'undo':
      return <Undo2 className={className} />;
    case 'skull':
      return <Skull className={className} />;
    case 'shield':
      return <Shield className={className} />;
    default:
      return <Sparkles className={className} />;
  }
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  instance,
  vitalityMode = 'dynamic',
  size,
  compact = false,
  isSelected = false,
  isTargetable = false,
  canAttack = false,
  canMove = false,
  badgeCount,
  animEffect,
  onClick,
  onMouseEnter,
  onMouseLeave,
  footerAction,
}) => {
  const effectiveSize: CardSize = size || (compact ? 'board' : 'md');
  const isCitizen = card.type === 'citizen';
  const baseV = instance ? instance.baseVitality : card.vitality;
  const currentV = instance ? instance.currentVitality : card.vitality;
  const attackV = vitalityMode === 'base_attack' ? baseV : currentV;
  const isDamaged = Boolean(instance && currentV < baseV);
  const isBuffed = Boolean(instance && currentV > baseV);
  const readyToAttack = Boolean(canAttack && instance && !instance.attackedThisTurn);
  const readyToMove = Boolean(canMove && instance && !instance.playedThisTurn);

  // High-contrast metallic bevel frames so cards pop sharply off the dark board
  const outerBevel = isCitizen
    ? 'bg-gradient-to-b from-[#f3d46b] via-[#b88921] to-[#4f390c] border-[#fde68a]/80'
    : 'bg-gradient-to-b from-[#e2e8f0] via-[#7c8ea6] to-[#262147] border-[#e2e8f0]/80';

  const statusGlow = isSelected
    ? 'ring-2 ring-[#fef08a] drop-shadow-[0_12px_22px_rgba(227,193,88,0.75)] -translate-y-1.5 z-30'
    : isTargetable
    ? 'ring-2 ring-[#ef4444] animate-pulse drop-shadow-[0_10px_22px_rgba(239,68,68,0.9)] z-20'
    : readyToAttack
    ? 'ring-1 ring-[#f3d46b] drop-shadow-[0_8px_16px_rgba(197,155,39,0.55)]'
    : 'drop-shadow-[0_10px_15px_rgba(0,0,0,0.85)]';

  const animClass =
    animEffect?.kind === 'summon'
      ? 'anim-card-summon ring-2 ring-[#fef08a]'
      : animEffect?.kind === 'march'
      ? 'anim-card-march ring-2 ring-[#fde68a]'
      : animEffect?.kind === 'march-up'
      ? 'anim-march-up ring-2 ring-[#fde68a]'
      : animEffect?.kind === 'march-down'
      ? 'anim-march-down ring-2 ring-[#fde68a]'
      : animEffect?.kind === 'attack-up'
      ? 'anim-attack-up ring-2 ring-[#f87171]'
      : animEffect?.kind === 'attack-down'
      ? 'anim-attack-down ring-2 ring-[#f87171]'
      : animEffect?.kind === 'damaged'
      ? 'anim-damage-shake ring-2 ring-[#ef4444]'
      : animEffect?.kind === 'destroyed'
      ? 'anim-card-destroyed ring-2 ring-[#dc2626]'
      : animEffect?.kind === 'buffed'
      ? 'anim-buff-pulse ring-2 ring-[#4ade80]'
      : '';

  // ===========================================================================
  // 1. BOARD UNIT / TOKEN MODE (Compact Imposing Gwent/Thronebreaker Token)
  // ===========================================================================
  if (effectiveSize === 'board') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`group relative w-[106px] h-[56px] my-1 mx-1 rounded-md p-[2.5px] border ${outerBevel} transition-all duration-150 select-none ${
          onClick ? 'cursor-pointer hover:scale-105 hover:z-30' : ''
        } ${statusGlow} ${animClass}`}
      >
        {/* Floating Tactical Action / Damage / Buff Popup Badge */}
        {animEffect && (
          <div className="pointer-events-none absolute left-1/2 -top-3 z-40 anim-float-badge whitespace-nowrap">
            {animEffect.kind === 'damaged' && (
              <span className="px-2 py-0.5 rounded-full bg-[#991b1b] border-2 border-[#fecaca] font-display font-black text-xs text-white shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                {animEffect.amount || -1}V
              </span>
            )}
            {animEffect.kind === 'destroyed' && (
              <span className="px-2 py-0.5 rounded-full bg-[#450a0a] border-2 border-[#f87171] font-display font-black text-[11px] text-[#fecaca] shadow-[0_4px_12px_rgba(0,0,0,0.95)] flex items-center gap-1">
                {animEffect.amount ? `${animEffect.amount}V ` : ''}💀 CAÍDO
              </span>
            )}
            {animEffect.kind === 'buffed' && (
              <span className="px-2 py-0.5 rounded-full bg-[#14532d] border-2 border-[#86efac] font-display font-black text-xs text-[#dcfce7] shadow-[0_4px_12px_rgba(0,0,0,0.9)]">
                +{animEffect.amount || 1}V
              </span>
            )}
            {(animEffect.kind === 'attack-up' ||
              animEffect.kind === 'attack-down') && (
              <span className="px-2 py-0.5 rounded-full bg-[#7c2d12] border border-[#fde047] font-display font-black text-[10px] text-[#fef9c3] shadow-lg">
                ⚔️ ¡ATAQUE!
                {animEffect.amount ? ` (${animEffect.amount}V)` : ''}
                {animEffect.destroyed ? ' 💀' : ''}
              </span>
            )}
            {(animEffect.kind === 'march' ||
              animEffect.kind === 'march-up' ||
              animEffect.kind === 'march-down') && (
              <span className="px-2 py-0.5 rounded-full bg-[#292118] border border-[#f3d46b] font-display font-bold text-[10px] text-[#fef08a] shadow-lg">
                👣 MARCHA
              </span>
            )}
            {animEffect.kind === 'summon' && (
              <span className="px-2 py-0.5 rounded-full bg-[#2b2216] border border-[#fef08a] font-display font-bold text-[10px] text-[#fef08a] shadow-lg">
                ✨ DESPLIEGUE
              </span>
            )}
          </div>
        )}

        {/* Crimson Flash Overlay when taking damage or being destroyed */}
        {(animEffect?.kind === 'damaged' || animEffect?.kind === 'destroyed') && (
          <div className="pointer-events-none absolute inset-0 rounded-md bg-[#dc2626]/45 z-30 animate-pulse" />
        )}
        {/* Inner Recessed Portrait Box */}
        <div className="relative w-full h-full rounded-[3px] overflow-hidden bg-[#14110e] border border-[#3a2f25] flex flex-col justify-end">
          {/* Artwork Background */}
          <div className="absolute inset-0">
            <CardArt card={card} className="w-full h-full" />
          </div>

          {/* Unobstructed Bottom Parchment/Bronze Nameplate (Supports 2 tight lines!) */}
          <div className="relative z-10 w-full bg-gradient-to-t from-[#0e0b08] via-[#1c1612]/95 to-[#261f19]/90 border-t border-[#c59b27]/70 px-1 py-0.5 text-center shadow-[0_-4px_10px_rgba(0,0,0,0.85)]">
            <div
              className="font-display font-bold text-[9px] text-[#f7efe0] tracking-tight leading-[1.08] line-clamp-2"
              title={card.name}
            >
              {card.name}
            </div>
            {footerAction && <div className="mt-0.5">{footerAction}</div>}
          </div>
        </div>

        {/* TOP-LEFT: Forged Metal Shield Emblem for Current Vitality */}
        {isCitizen && (
          <div
            title={
              vitalityMode === 'base_attack'
                ? `Vitalidad actual: ${currentV}/${baseV} | Daño de ataque: ${attackV}`
                : `Vitalidad (Salud y Daño): ${currentV}V (Base: ${baseV}V)`
            }
            className="absolute -top-1.5 -left-1.5 z-20 flex items-center"
          >
            <div className="relative w-6 h-7 flex items-center justify-center drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]">
              <svg viewBox="0 0 36 42" className="absolute inset-0 w-full h-full">
                <path
                  d="M18 2 L33 8 L30 26 C28 33 18 39 18 39 C18 39 8 33 6 26 L3 8 Z"
                  fill={isDamaged ? '#7f1d1d' : isBuffed ? '#14532d' : '#26201a'}
                  stroke={isDamaged ? '#fca5a5' : isBuffed ? '#86efac' : '#f3d46b'}
                  strokeWidth="2.8"
                />
                <path
                  d="M18 5 L30 10 L27.5 25 C26 30.5 18 35.5 18 35.5"
                  fill="none"
                  stroke="rgba(255,255,255,0.22)"
                  strokeWidth="1.2"
                />
              </svg>
              <span
                className={`relative z-10 font-display font-black text-[11px] leading-none ${
                  isDamaged
                    ? 'text-[#fecaca]'
                    : isBuffed
                    ? 'text-[#bbf7d0]'
                    : 'text-[#fef3c7]'
                }`}
              >
                {currentV}
              </span>
            </div>

            {/* Integrated Base Attack Sword Tag when different from CurrentV */}
            {(attackV !== currentV || vitalityMode === 'base_attack') && (
              <div
                title={`Daño de Ataque: ${attackV}`}
                className="-ml-1 px-1 py-0.2 rounded-r bg-[#2b2219] border border-[#f3d46b]/80 text-[8px] font-display font-bold text-[#fde68a] shadow-md flex items-center gap-0.5"
              >
                <Sword className="w-2 h-2" />
                {attackV}
              </div>
            )}
          </div>
        )}

        {/* TOP-RIGHT: Elegant Floating Status Badge (Zzz / Ready Sword / Movable) */}
        <div className="absolute -top-1.5 -right-1 z-20 flex items-center gap-0.5">
          {instance?.playedThisTurn ? (
            <span
              title="Agotado (jugado este turno, no puede moverse)"
              className="px-1 py-0.2 rounded bg-[#181411]/95 border border-[#8a7968] text-[8px] font-display font-bold text-[#d6c7b8] shadow-md"
            >
              Zzz
            </span>
          ) : readyToMove ? (
            <span
              title="Puede moverse a una fila adyacente"
              className="px-1 py-0.2 rounded bg-[#172530]/95 border border-[#7dd3fc] text-[8px] font-bold text-[#bae6fd] shadow-md"
            >
              ⇄
            </span>
          ) : null}

          {readyToAttack && (
            <span
              title="Listo para atacar en la Zona de Combate"
              className="w-5 h-5 rounded-full bg-gradient-to-b from-[#f3d46b] to-[#966e15] border border-[#fef9c3] text-[#14100c] flex items-center justify-center shadow-md"
            >
              <Sword className="w-2.5 h-2.5" />
            </span>
          )}
          {instance?.attackedThisTurn && (
            <span
              title="Ya atacó en este turno"
              className="px-1 py-0.2 rounded bg-[#181310]/95 border border-[#574c3f] text-[7px] font-semibold text-[#9c8d7e]"
            >
              Atacó
            </span>
          )}
        </div>
      </div>
    );
  }

  // ===========================================================================
  // 2. FULL PHYSICAL TCG CARD MODE ('hand' | 'md' | 'lg' — Gwent / Thronebreaker)
  // ===========================================================================
  const dimensions =
    effectiveSize === 'hand'
      ? 'w-[120px] h-[124px]'
      : effectiveSize === 'lg'
      ? 'w-[254px] h-[364px]'
      : 'w-[206px] h-[298px]';

  const artHeight =
    effectiveSize === 'hand'
      ? 'h-[38px]'
      : effectiveSize === 'lg'
      ? 'h-[150px]'
      : 'h-[116px]';

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative ${dimensions} rounded-lg p-[3px] border ${outerBevel} transition-all duration-200 select-none flex flex-col ${
        onClick ? 'cursor-pointer' : ''
      } ${statusGlow}`}
    >
      {/* Copy count badge for Deck Builder */}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <div className="absolute -top-2.5 -right-2.5 z-30 px-2.5 py-0.5 rounded bg-gradient-to-b from-[#f3d46b] to-[#966e15] text-[#12100e] border border-[#fef08a] font-display font-black text-xs shadow-lg">
          x{badgeCount}
        </div>
      )}

      {/* Inner Dark Wood & Aged Leather Card Body */}
      <div className="w-full h-full rounded-[5px] bg-gradient-to-b from-[#28211b] via-[#1c1714] to-[#120f0d] border border-[#e3c158]/45 p-1 flex flex-col justify-between overflow-hidden relative shadow-inner">
        {/* 1. Top Metallic/Parchment Nameplate Banner (Allows 2 lines with tracking-tight so names never truncate!) */}
        <div className="relative z-10 flex items-center justify-between gap-1 px-1.5 py-0.5 rounded-sm bg-gradient-to-r from-[#1f1914] via-[#302720] to-[#1f1914] border border-[#c59b27]/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] min-h-[24px]">
          <span
            className={`font-display font-bold text-[#f7efe0] tracking-tight leading-[1.06] line-clamp-2 ${
              effectiveSize === 'hand'
                ? 'text-[9px]'
                : effectiveSize === 'lg'
                ? 'text-[12.5px]'
                : 'text-[10.5px]'
            }`}
            title={card.name}
          >
            {card.name}
          </span>

          {/* Compact Top-Right Forged Shield Crest for Citizens or Arcane Crest for Events */}
          {isCitizen ? (
            <div
              className={`shrink-0 flex items-center px-1 py-0.2 rounded-sm font-display font-black border shadow ${
                effectiveSize === 'hand' ? 'text-[9px]' : 'text-[11px]'
              } ${
                isDamaged
                  ? 'bg-[#7f1d1d] border-[#fca5a5] text-[#fecaca]'
                  : 'bg-gradient-to-b from-[#f3d46b] to-[#966e15] border-[#fef9c3] text-[#14100c]'
              }`}
            >
              <span>{currentV}V</span>
            </div>
          ) : (
            <span className="shrink-0 text-[#e2e8f0] pl-0.5">
              {renderCardIcon(card.artIcon, 'w-3 h-3')}
            </span>
          )}
        </div>

        {/* 2. Beveled Illustration Frame */}
        <div
          className={`relative z-10 mt-0.5 ${artHeight} w-full rounded-sm overflow-hidden border border-[#c59b27]/80 shadow-[inset_0_0_12px_rgba(0,0,0,0.9)] shrink-0`}
        >
          <CardArt card={card} className="w-full h-full" />
        </div>

        {/* 3. Faction / Type Ribbon */}
        <div className="relative z-10 mt-0.5 px-1 py-0.2 bg-[#16120f] border-y border-[#6b5a48] flex items-center justify-between">
          <span
            className={`font-display uppercase tracking-wider font-bold ${
              effectiveSize === 'hand' ? 'text-[6.8px]' : 'text-[8.5px]'
            } ${isCitizen ? 'text-[#e3c158]' : 'text-[#c7d2fe]'}`}
          >
            {isCitizen ? 'Ciudadano • Bastión' : 'Evento • Efecto'}
          </span>
          {card.isCustom && (
            <span className="text-[7px] font-display uppercase px-1 rounded-sm bg-[#3a2e21] text-[#f3d46b] border border-[#c59b27]/50">
              Forjada
            </span>
          )}
        </div>

        {/* 4. Dark Parchment Rules Text Box */}
        <div className="relative z-10 mt-0.5 flex-1 rounded-sm bg-gradient-to-b from-[#211b16] to-[#15110e] border border-[#574c3f] p-1 flex flex-col justify-between overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.75)]">
          <p
            className={`font-serif text-[#ede5d8] leading-tight ${
              effectiveSize === 'hand'
                ? 'text-[8.5px] line-clamp-2'
                : effectiveSize === 'lg'
                ? 'text-[13px]'
                : 'text-[11px] line-clamp-4'
            }`}
          >
            {card.description || 'Sin habilidades especiales.'}
          </p>

          {footerAction && (
            <div className="mt-0.5 pt-0.5 border-t border-[#3a322a]">
              {footerAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
