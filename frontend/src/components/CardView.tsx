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

  // Beveled metallic outer frame colors: Antique Gold/Bronze for Citizens, Forged Silver/Arcane for Events
  const outerBevel = isCitizen
    ? 'bg-gradient-to-b from-[#d8b13a] via-[#7c5d18] to-[#362709] border-[#e5c158]/50'
    : 'bg-gradient-to-b from-[#cbd5e1] via-[#525e75] to-[#1e1b38] border-[#cbd5e1]/50';

  const statusGlow = isSelected
    ? 'ring-2 ring-[#e3c158] shadow-[0_0_24px_rgba(212,175,55,0.8)] -translate-y-1.5 z-30'
    : isTargetable
    ? 'ring-2 ring-[#dc2626] animate-pulse shadow-[0_0_24px_rgba(220,38,38,0.9)] z-20'
    : readyToAttack
    ? 'ring-1 ring-[#c59b27] shadow-[0_0_14px_rgba(197,155,39,0.5)]'
    : 'shadow-[0_6px_16px_rgba(0,0,0,0.85)]';

  // ===========================================================================
  // 1. BOARD UNIT / TOKEN MODE (Gwent / Thronebreaker Compact Imposing Unit)
  // ===========================================================================
  if (effectiveSize === 'board') {
    return (
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`group relative w-[118px] h-[92px] rounded-md p-[3px] border ${outerBevel} transition-all duration-150 select-none ${
          onClick ? 'cursor-pointer hover:scale-105 hover:z-30' : ''
        } ${statusGlow}`}
      >
        {/* Inner Recessed Portrait Box */}
        <div className="relative w-full h-full rounded-[3px] overflow-hidden bg-[#14110e] border border-[#2a221b] flex flex-col justify-end">
          {/* Artwork Background */}
          <div className="absolute inset-0">
            <CardArt card={card} className="w-full h-full" />
          </div>

          {/* Unobstructed Bottom Parchment/Bronze Nameplate */}
          <div className="relative z-10 w-full bg-gradient-to-t from-[#120e0a] via-[#1f1914]/95 to-[#26201a]/85 border-t border-[#8a6d1b]/60 px-1.5 py-1 text-center shadow-[0_-4px_10px_rgba(0,0,0,0.8)]">
            <div
              className="font-display font-bold text-[10px] text-[#f3ead8] tracking-wide truncate leading-tight"
              title={card.name}
            >
              {card.name}
            </div>
            {footerAction && <div className="mt-0.5">{footerAction}</div>}
          </div>
        </div>

        {/* TOP-LEFT: Forged Metal Shield Emblem for Current Vitality (Gwent Power Shield) */}
        {isCitizen && (
          <div
            title={
              vitalityMode === 'base_attack'
                ? `Vitalidad actual: ${currentV}/${baseV} | Daño de ataque: ${attackV}`
                : `Vitalidad (Salud y Daño): ${currentV}V (Base: ${baseV}V)`
            }
            className="absolute -top-2.5 -left-2.5 z-20 flex items-center"
          >
            <div className="relative w-8 h-9 flex items-center justify-center drop-shadow-[0_3px_6px_rgba(0,0,0,0.95)]">
              <svg viewBox="0 0 36 42" className="absolute inset-0 w-full h-full">
                <path
                  d="M18 2 L33 8 L30 26 C28 33 18 39 18 39 C18 39 8 33 6 26 L3 8 Z"
                  fill={isDamaged ? '#6e1414' : isBuffed ? '#14532d' : '#26201a'}
                  stroke={isDamaged ? '#f87171' : isBuffed ? '#4ade80' : '#d4af37'}
                  strokeWidth="2.5"
                />
                <path
                  d="M18 5 L30 10 L27.5 25 C26 30.5 18 35.5 18 35.5"
                  fill="none"
                  stroke="rgba(255,255,255,0.18)"
                  strokeWidth="1.2"
                />
              </svg>
              <span
                className={`relative z-10 font-display font-black text-xs leading-none ${
                  isDamaged
                    ? 'text-[#fecaca]'
                    : isBuffed
                    ? 'text-[#bbf7d0]'
                    : 'text-[#f5e0a3]'
                }`}
              >
                {currentV}
              </span>
            </div>

            {/* Integrated Base Attack Sword Tag when different from CurrentV */}
            {(attackV !== currentV || vitalityMode === 'base_attack') && (
              <div
                title={`Daño de Ataque: ${attackV}`}
                className="-ml-1.5 px-1.5 py-0.5 rounded-r bg-[#2b2219] border border-[#c59b27]/70 text-[9px] font-display font-bold text-[#e3c158] shadow-md flex items-center gap-0.5"
              >
                <Sword className="w-2.5 h-2.5" />
                {attackV}
              </div>
            )}
          </div>
        )}

        {/* TOP-RIGHT: Elegant Floating Status Badge (Zzz / Ready Sword / Movable) */}
        <div className="absolute -top-2 -right-2 z-20 flex items-center gap-1">
          {instance?.playedThisTurn ? (
            <span
              title="Agotado (jugado este turno, no puede moverse)"
              className="px-1.5 py-0.5 rounded bg-[#1a1613]/95 border border-[#6e5d4f] text-[9px] font-display font-bold text-[#b8a99a] shadow-md"
            >
              Zzz
            </span>
          ) : readyToMove ? (
            <span
              title="Puede moverse a una fila adyacente"
              className="px-1.5 py-0.5 rounded bg-[#172530]/95 border border-[#60a5fa]/70 text-[9px] font-bold text-[#93c5fd] shadow-md"
            >
              ⇄
            </span>
          ) : null}

          {readyToAttack && (
            <span
              title="Listo para atacar en la Zona de Combate"
              className="w-5 h-5 rounded-full bg-gradient-to-b from-[#d4af37] to-[#8a6d1b] border border-[#fef08a] text-[#14100c] flex items-center justify-center shadow-md"
            >
              <Sword className="w-3 h-3" />
            </span>
          )}
          {instance?.attackedThisTurn && (
            <span
              title="Ya atacó en este turno"
              className="px-1.5 py-0.5 rounded bg-[#181310]/95 border border-[#473c33] text-[8px] font-semibold text-[#786b5e]"
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
      ? 'w-[146px] h-[212px]'
      : effectiveSize === 'lg'
      ? 'w-[248px] h-[356px]'
      : 'w-[202px] h-[292px]';

  const artHeight =
    effectiveSize === 'hand'
      ? 'h-[86px]'
      : effectiveSize === 'lg'
      ? 'h-[152px]'
      : 'h-[118px]';

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`group relative ${dimensions} rounded-lg p-[4px] border ${outerBevel} transition-all duration-200 select-none flex flex-col ${
        onClick ? 'cursor-pointer' : ''
      } ${statusGlow}`}
    >
      {/* Copy count badge for Deck Builder */}
      {typeof badgeCount === 'number' && badgeCount > 0 && (
        <div className="absolute -top-2.5 -right-2.5 z-30 px-2.5 py-0.5 rounded bg-gradient-to-b from-[#e3c158] to-[#966e15] text-[#12100e] border border-[#fef08a] font-display font-black text-xs shadow-lg">
          x{badgeCount}
        </div>
      )}

      {/* Inner Dark Wood & Aged Leather Card Body */}
      <div className="w-full h-full rounded-[5px] bg-gradient-to-b from-[#231d18] via-[#191512] to-[#120f0d] border border-[#c59b27]/35 p-1.5 flex flex-col justify-between overflow-hidden relative shadow-inner">
        {/* Corner Rivet Accents */}
        <div className="absolute top-1 left-1 w-1 h-1 rounded-full bg-[#c59b27]/50 pointer-events-none" />
        <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-[#c59b27]/50 pointer-events-none" />

        {/* 1. Top Metallic/Parchment Nameplate Banner */}
        <div className="relative z-10 flex items-center justify-between gap-1 px-2 py-1 rounded-sm bg-gradient-to-r from-[#1c1713] via-[#2b231d] to-[#1c1713] border border-[#8a6d1b]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          <span
            className={`font-display font-bold text-[#f3ead8] truncate ${
              effectiveSize === 'hand'
                ? 'text-[10px]'
                : effectiveSize === 'lg'
                ? 'text-[13px]'
                : 'text-[11px]'
            }`}
            title={card.name}
          >
            {card.name}
          </span>

          {/* Top-Right Forged Shield Crest for Citizens or Arcane Crest for Events */}
          {isCitizen ? (
            <div
              className={`shrink-0 flex items-center gap-0.5 px-1.5 py-0.2 rounded-sm font-display font-black border shadow ${
                effectiveSize === 'hand' ? 'text-[10px]' : 'text-xs'
              } ${
                isDamaged
                  ? 'bg-[#6e1414] border-[#f87171] text-[#fecaca]'
                  : 'bg-gradient-to-b from-[#d8b13a] to-[#8a6d1b] border-[#fef08a]/70 text-[#14100c]'
              }`}
            >
              <span>{currentV}V</span>
            </div>
          ) : (
            <span className="shrink-0 text-[#cbd5e1]">
              {renderCardIcon(card.artIcon, 'w-3.5 h-3.5')}
            </span>
          )}
        </div>

        {/* 2. Beveled Illustration Frame */}
        <div
          className={`relative z-10 mt-1 ${artHeight} w-full rounded-sm overflow-hidden border border-[#8a6d1b]/75 shadow-[inset_0_0_12px_rgba(0,0,0,0.9)] shrink-0`}
        >
          <CardArt card={card} className="w-full h-full" />
        </div>

        {/* 3. Faction / Type Ribbon */}
        <div className="relative z-10 mt-1 px-2 py-0.5 bg-[#16120f] border-y border-[#574c3f]/80 flex items-center justify-between">
          <span
            className={`font-display uppercase tracking-widest font-bold ${
              effectiveSize === 'hand' ? 'text-[8px]' : 'text-[9px]'
            } ${isCitizen ? 'text-[#c59b27]' : 'text-[#a5b4fc]'}`}
          >
            {isCitizen ? 'Ciudadano • Bastión' : 'Evento • Decreto'}
          </span>
          {card.isCustom && (
            <span className="text-[8px] font-display uppercase px-1 rounded-sm bg-[#3a2e21] text-[#e3c158] border border-[#c59b27]/40">
              Forjada
            </span>
          )}
        </div>

        {/* 4. Dark Parchment Rules Text Box */}
        <div className="relative z-10 mt-1 flex-1 rounded-sm bg-gradient-to-b from-[#1e1915] to-[#15110e] border border-[#4a3f35] p-1.5 flex flex-col justify-between overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.75)]">
          <p
            className={`font-serif text-[#e7dfd3] leading-snug ${
              effectiveSize === 'hand'
                ? 'text-[10px] line-clamp-3'
                : effectiveSize === 'lg'
                ? 'text-[13px]'
                : 'text-[11px] line-clamp-4'
            }`}
          >
            {card.description || 'Sin habilidades especiales.'}
          </p>

          {footerAction && (
            <div className="mt-1 pt-1 border-t border-[#3a322a]">
              {footerAction}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
