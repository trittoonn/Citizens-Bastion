import React from 'react';
import { CardDefinition } from '../types/game';

interface CardArtProps {
  card: CardDefinition;
  className?: string;
}

export const CardArt: React.FC<CardArtProps> = ({ card, className = 'w-full h-full' }) => {
  // If the user supplied a custom image URL in the Card Studio, render it directly
  if (card.artImage && (card.artImage.startsWith('http') || card.artImage.startsWith('data:'))) {
    return (
      <div className={`relative overflow-hidden bg-slate-950 ${className}`}>
        <img
          src={card.artImage}
          alt={card.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 shadow-[inset_0_0_18px_rgba(0,0,0,0.75)] pointer-events-none" />
      </div>
    );
  }

  const primaryKey = card.artImage || card.id || card.artIcon || 'default';
  const fallbackIcon = card.artIcon || 'default';
  const color =
    card.artColor ||
    (card.type === 'citizen'
      ? '#d97706'
      : card.type === 'tool'
      ? '#475569'
      : '#7c3aed');

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      {renderFantasyScene(primaryKey, fallbackIcon, color)}
      {/* Subtle TCG inner vignette & foil sheen */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute inset-0 shadow-[inset_0_0_16px_rgba(0,0,0,0.85)] pointer-events-none" />
    </div>
  );
};

function renderFantasyScene(key: string, fallbackIcon: string, baseColor: string): React.ReactNode {
  switch (key) {
    case 'caballero_galardonado':
    case 'sword':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_cab" cx="50%" cy="35%" r="75%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="45%" stopColor="#d97706" />
              <stop offset="100%" stopColor="#451a03" />
            </radialGradient>
            <linearGradient id="blade_cab" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffffff" />
              <stop offset="50%" stopColor="#cbd5e1" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_cab)" />
          {/* Sunburst rays */}
          <g opacity="0.28" fill="#fef9c3">
            <polygon points="120,55 0,0 35,0" />
            <polygon points="120,55 85,0 125,0" />
            <polygon points="120,55 170,0 215,0" />
            <polygon points="120,55 240,20 240,65" />
            <polygon points="120,55 0,40 0,85" />
          </g>
          {/* Castle battlements in background */}
          <path
            d="M0,130 L30,130 L30,115 L45,115 L45,130 L65,130 L65,110 L90,110 L90,130 L160,130 L160,112 L185,112 L185,130 L210,130 L210,118 L240,118 L240,160 L0,160 Z"
            fill="#271206"
            opacity="0.7"
          />
          {/* Armored Knight Silhouette & Plume */}
          <path
            d="M72,160 C75,118 92,102 120,102 C148,102 165,118 168,160 Z"
            fill="#1e293b"
            stroke="#fbbf24"
            strokeWidth="2.5"
          />
          {/* Pauldrons */}
          <path d="M65,135 Q85,105 110,118 L95,148 Z" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
          <path d="M175,135 Q155,105 130,118 L145,148 Z" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
          {/* Great Helm */}
          <path
            d="M100,62 C100,45 140,45 140,62 L143,98 L120,108 L97,98 Z"
            fill="#475569"
            stroke="#fde047"
            strokeWidth="2.2"
          />
          {/* Golden Crown / Visor Cross */}
          <path d="M103,76 L137,76 M120,58 L120,103" stroke="#fef08a" strokeWidth="3.5" />
          {/* Royal Red Plume */}
          <path d="M120,46 Q145,18 172,36 Q148,46 132,54 Z" fill="#dc2626" />
          {/* Glowing Greatsword held aloft */}
          <polygon points="120,8 127,22 125,125 115,125 113,22" fill="url(#blade_cab)" stroke="#fef08a" strokeWidth="1" />
          <rect x="96" y="122" width="48" height="7" rx="3" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />
          <circle cx="120" cy="125" r="5" fill="#ef4444" />
        </svg>
      );

    case 'entrenador_de_guerra':
    case 'reclutador_de_guerra':
    case 'users':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_ent" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="55%" stopColor="#b45309" />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_ent)" />
          {/* Crossed Halberds / Spears */}
          <line x1="35" y1="150" x2="195" y2="20" stroke="#fde68a" strokeWidth="4" />
          <line x1="205" y1="150" x2="45" y2="20" stroke="#fde68a" strokeWidth="4" />
          <polygon points="195,20 212,12 204,35 182,30" fill="#cbd5e1" stroke="#f59e0b" strokeWidth="1.5" />
          <polygon points="45,20 28,12 36,35 58,30" fill="#cbd5e1" stroke="#f59e0b" strokeWidth="1.5" />
          {/* War Banner */}
          <path d="M90,28 L150,28 L145,105 L120,90 L95,105 Z" fill="#991b1b" stroke="#fbbf24" strokeWidth="2.5" />
          {/* Commander & Recruit Shields */}
          <path d="M120,50 L138,62 L132,88 L120,96 L108,88 L102,62 Z" fill="#f59e0b" stroke="#fffbeb" strokeWidth="2" />
          <circle cx="65" cy="118" r="22" fill="#334155" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="175" cy="118" r="22" fill="#334155" stroke="#f59e0b" strokeWidth="2.5" />
        </svg>
      );

    case 'granjero':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_granjero" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="45%" stopColor="#f59e0b" />
              <stop offset="65%" stopColor="#65a30d" />
              <stop offset="100%" stopColor="#1a2e05" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_granjero)" />
          {/* Warm Sun */}
          <circle cx="185" cy="36" r="22" fill="#fef9c3" opacity="0.85" />
          {/* Rolling green pasture hills */}
          <path d="M0,105 Q70,82 145,102 Q195,112 240,95 L240,160 L0,160 Z" fill="#3f6212" />
          <path d="M0,124 Q95,105 240,125 L240,160 L0,160 Z" fill="#1a2e05" />
          {/* Wooden fence */}
          <g stroke="#78350f" strokeWidth="3">
            <line x1="10" y1="102" x2="10" y2="128" />
            <line x1="38" y1="100" x2="38" y2="126" />
            <line x1="66" y1="102" x2="66" y2="128" />
            <line x1="4" y1="108" x2="72" y2="108" strokeWidth="2" />
            <line x1="4" y1="118" x2="72" y2="118" strokeWidth="2" />
          </g>
          {/* Farmer with Straw Hat & Pitchfork */}
          <path d="M72,160 C75,122 86,106 102,106 C118,106 128,122 132,160 Z" fill="#1e3a8a" stroke="#fde047" strokeWidth="1.8" />
          <circle cx="102" cy="84" r="14" fill="#fed7aa" stroke="#78350f" strokeWidth="1.5" />
          {/* Straw Hat */}
          <ellipse cx="102" cy="74" rx="28" ry="6" fill="#facc15" stroke="#a16207" strokeWidth="2" />
          <path d="M86,74 C88,58 116,58 118,74 Z" fill="#eab308" stroke="#a16207" strokeWidth="1.8" />
          {/* Pitchfork */}
          <line x1="56" y1="62" x2="64" y2="160" stroke="#78350f" strokeWidth="3.5" />
          <path d="M46,64 L66,62 M48,44 L48,64 M56,42 L56,63 M64,44 L64,62" fill="none" stroke="#e2e8f0" strokeWidth="2.5" />
          {/* Spotted Cow (Vaca) on the right */}
          <rect x="148" y="102" width="54" height="34" rx="10" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
          <circle cx="164" cy="114" r="7" fill="#1e293b" />
          <circle cx="184" cy="122" r="6" fill="#1e293b" />
          <rect x="188" y="88" width="26" height="24" rx="6" fill="#f8fafc" stroke="#1e293b" strokeWidth="2" />
          <rect x="192" y="102" width="20" height="12" rx="5" fill="#fda4af" />
          <path d="M192,88 L186,78 M210,88 L216,78" stroke="#fef08a" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'token_vaca':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="160" fill="#365314" />
          <path d="M0,105 Q120,85 240,105 L240,160 L0,160 Z" fill="#1a2e05" />
          {/* Cow Face & Horns */}
          <path d="M85,48 Q68,26 58,42" fill="none" stroke="#fef08a" strokeWidth="5" strokeLinecap="round" />
          <path d="M155,48 Q172,26 182,42" fill="none" stroke="#fef08a" strokeWidth="5" strokeLinecap="round" />
          <rect x="80" y="45" width="80" height="68" rx="18" fill="#ffffff" stroke="#1e293b" strokeWidth="3" />
          <circle cx="98" cy="64" r="12" fill="#1e293b" />
          <circle cx="102" cy="68" r="4" fill="#ffffff" />
          <circle cx="140" cy="68" r="4" fill="#1e293b" />
          <rect x="86" y="84" width="68" height="32" rx="14" fill="#fda4af" stroke="#be123c" strokeWidth="2" />
          <circle cx="106" cy="98" r="4" fill="#881337" />
          <circle cx="134" cy="98" r="4" fill="#881337" />
          {/* Golden Cowbell */}
          <polygon points="112,116 128,116 134,134 106,134" fill="#facc15" stroke="#854d0e" strokeWidth="2" />
        </svg>
      );

    case 'asesino':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_asesino" cx="40%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#4c1d95" />
              <stop offset="55%" stopColor="#1e1b4b" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_asesino)" />
          {/* Full Moon in shadow */}
          <circle cx="52" cy="40" r="24" fill="#e2e8f0" opacity="0.25" />
          {/* Silhouette of Victim on the RIGHT being struck */}
          <g opacity="0.75">
            <circle cx="188" cy="68" r="16" fill="#334155" stroke="#ef4444" strokeWidth="2" />
            <path d="M162,160 C165,112 175,92 188,92 C201,92 211,112 214,160 Z" fill="#1e293b" stroke="#ef4444" strokeWidth="2" />
          </g>
          {/* Cloaked Spy Assassin on the LEFT lunging RIGHT */}
          <path d="M35,160 C42,102 64,76 92,76 C112,76 128,98 134,160 Z" fill="#0f172a" stroke="#a855f7" strokeWidth="2" />
          {/* Assassin Hood & Mask */}
          <path d="M88,32 L118,68 L92,84 L66,68 Z" fill="#090d16" stroke="#c084fc" strokeWidth="2" />
          {/* Piercing Red Eye Glint */}
          <polygon points="94,58 106,55 100,63" fill="#ef4444" />
          <polygon points="80,58 88,56 84,62" fill="#ef4444" />
          {/* Poisoned Dagger slashing right (->) into the neighbor */}
          <path d="M95,88 Q145,62 210,74" fill="none" stroke="#ef4444" strokeWidth="5" />
          <polygon points="122,78 192,66 175,86 122,86" fill="#e2e8f0" stroke="#4ade80" strokeWidth="2" />
          {/* Arrow indicator showing attack to the right */}
          <polygon points="218,74 202,64 205,84" fill="#ef4444" />
        </svg>
      );

    case 'protector_de_los_debiles':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_prot" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#0369a1" />
              <stop offset="100%" stopColor="#082f49" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_prot)" />
          {/* Smaller Citizens sheltered in the background */}
          <circle cx="48" cy="112" r="12" fill="#1e293b" stroke="#93c5fd" strokeWidth="1.5" />
          <path d="M32,160 C34,132 42,124 48,124 C54,124 62,132 64,160 Z" fill="#1e293b" />
          <circle cx="192" cy="112" r="12" fill="#1e293b" stroke="#93c5fd" strokeWidth="1.5" />
          <path d="M176,160 C178,132 186,124 192,124 C198,124 206,132 208,160 Z" fill="#1e293b" />
          {/* Glowing Cyan Aegis Forcefield Dome (Escudo) */}
          <ellipse cx="120" cy="88" rx="76" ry="62" fill="#38bdf8" opacity="0.18" />
          <ellipse cx="120" cy="88" rx="76" ry="62" fill="none" stroke="#7dd3fc" strokeWidth="3.5" strokeDasharray="10 4" />
          {/* Towering Guardian Knight */}
          <path d="M78,160 C82,108 98,90 120,90 C142,90 158,108 162,160 Z" fill="#334155" stroke="#fde047" strokeWidth="2" />
          <circle cx="120" cy="54" r="16" fill="#64748b" stroke="#fde047" strokeWidth="2" />
          {/* Massive Tower Shield in front */}
          <path d="M84,52 L156,52 L150,118 L120,146 L90,118 Z" fill="#0284c7" stroke="#fef08a" strokeWidth="4" />
          <path d="M120,62 L120,134 M96,90 L144,90" stroke="#fef08a" strokeWidth="5" />
          <circle cx="120" cy="90" r="9" fill="#e0f2fe" />
        </svg>
      );

    case 'germinador':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_germ" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="55%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#052e16" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_germ)" />
          {/* Arcane Event Spell Ring triggering nature growth */}
          <circle cx="120" cy="75" r="56" fill="none" stroke="#a7f3d0" strokeWidth="2" strokeDasharray="5 5" />
          {/* Ancient Living Tree / Druid Trunk */}
          <path d="M82,160 L95,95 L80,55 L102,75 L120,38 L138,75 L160,55 L145,95 L158,160 Z" fill="#713f12" stroke="#fde047" strokeWidth="2" />
          {/* Lush Glowing Canopy */}
          <circle cx="80" cy="52" r="26" fill="#16a34a" opacity="0.9" />
          <circle cx="160" cy="52" r="26" fill="#16a34a" opacity="0.9" />
          <circle cx="120" cy="36" r="32" fill="#22c55e" stroke="#bbf7d0" strokeWidth="2" />
          {/* Glowing Eyes in the Bark */}
          <polygon points="106,96 116,99 109,104" fill="#fef08a" />
          <polygon points="134,96 124,99 131,104" fill="#fef08a" />
          {/* Sprouting Treant sapling on the side */}
          <path d="M188,160 L192,118 L204,118 L208,160 Z" fill="#854d0e" stroke="#86efac" strokeWidth="1.5" />
          <circle cx="198" cy="108" r="16" fill="#4ade80" />
        </svg>
      );

    case 'token_treant':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="160" fill="#064e3b" />
          <path d="M88,160 L96,86 L74,56 L104,70 L120,40 L136,70 L166,56 L144,86 L152,160 Z" fill="#78350f" stroke="#a3e635" strokeWidth="2.5" />
          <circle cx="120" cy="42" r="28" fill="#16a34a" />
          <circle cx="85" cy="58" r="20" fill="#22c55e" />
          <circle cx="155" cy="58" r="20" fill="#22c55e" />
          <circle cx="110" cy="94" r="4" fill="#bef264" />
          <circle cx="130" cy="94" r="4" fill="#bef264" />
        </svg>
      );

    case 'explorador_de_basura':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_exp_bas" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#78350f" />
              <stop offset="50%" stopColor="#a16207" />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_exp_bas)" />
          {/* Scrap heap hills in background */}
          <polygon points="0,160 45,98 95,132 155,88 210,126 240,104 240,160" fill="#292524" stroke="#78716c" strokeWidth="1.5" />
          {/* Half-buried cogwheels in the scrap */}
          <circle cx="52" cy="130" r="18" fill="none" stroke="#a8a29e" strokeWidth="5" strokeDasharray="6 4" />
          <circle cx="195" cy="134" r="20" fill="none" stroke="#d6d3d1" strokeWidth="5" strokeDasharray="6 4" />
          {/* Scavenger Explorer with Goggles */}
          <path d="M84,160 C88,114 102,94 120,94 C138,94 152,114 156,160 Z" fill="#44403c" stroke="#f59e0b" strokeWidth="2" />
          <circle cx="120" cy="68" r="18" fill="#d6d3d1" stroke="#57534e" strokeWidth="2" />
          {/* Brass Goggles */}
          <circle cx="112" cy="66" r="7" fill="#38bdf8" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="128" cy="66" r="7" fill="#38bdf8" stroke="#f59e0b" strokeWidth="2.5" />
          {/* Left hand discarding a grey card down, Right hand raising a glowing gold card up! */}
          <g transform="rotate(-24 52 72)">
            <rect x="34" y="54" width="28" height="38" rx="3" fill="#57534e" stroke="#ef4444" strokeWidth="2" />
            <line x1="38" y1="60" x2="58" y2="86" stroke="#ef4444" strokeWidth="2.5" />
          </g>
          <g transform="rotate(14 186 48)">
            <rect x="170" y="26" width="32" height="44" rx="4" fill="#fef08a" stroke="#f59e0b" strokeWidth="2.5" />
            <polygon points="186,36 190,46 200,46 192,52 195,62 186,56 177,62 180,52 172,46 182,46" fill="#d97706" />
          </g>
        </svg>
      );

    case 'nadador_de_basura':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_nad_bas" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#134e4a" />
              <stop offset="55%" stopColor="#0f766e" />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_nad_bas)" />
          {/* Cobblestone Road (El Camino) at the top/horizon */}
          <path d="M85,20 L155,20 L195,70 L45,70 Z" fill="#78716c" stroke="#fde047" strokeWidth="2" opacity="0.65" />
          {/* Swirling Waves of Scrap & Relics */}
          <path d="M0,108 Q40,86 80,108 T160,108 T240,108 L240,160 L0,160 Z" fill="#115e59" stroke="#5eead4" strokeWidth="2.5" />
          <path d="M0,130 Q60,112 120,130 T240,130 L240,160 L0,160 Z" fill="#042f2e" stroke="#2dd4bf" strokeWidth="2" />
          {/* Swimmer leaping out of the scrap-sea onto the Road */}
          <circle cx="120" cy="76" r="15" fill="#fed7aa" stroke="#14b8a6" strokeWidth="2" />
          {/* Diving Goggles */}
          <rect x="108" y="68" width="24" height="9" rx="4" fill="#38bdf8" stroke="#fde047" strokeWidth="2" />
          {/* Outstretched swimming arms */}
          <path d="M62,96 Q90,62 120,92 Q150,62 178,96" fill="none" stroke="#5eead4" strokeWidth="7" strokeLinecap="round" />
          {/* Upward Leap Arrow */}
          <path d="M120,52 L120,24 M110,34 L120,22 L130,34" fill="none" stroke="#fef08a" strokeWidth="3.5" strokeLinecap="round" />
        </svg>
      );

    case 'demoledor_de_basura':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_dem_bas" cx="50%" cy="50%" r="75%">
              <stop offset="0%" stopColor="#ea580c" />
              <stop offset="55%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#0c0a09" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_dem_bas)" />
          {/* Massive Armored Crusher Juggernaut */}
          <rect x="64" y="54" width="112" height="96" rx="14" fill="#292524" stroke="#f97316" strokeWidth="3" />
          {/* Furnace Grill Chest */}
          <rect x="86" y="84" width="68" height="42" rx="6" fill="#431407" stroke="#fbbf24" strokeWidth="2" />
          <line x1="102" y1="84" x2="102" y2="126" stroke="#f97316" strokeWidth="3" />
          <line x1="120" y1="84" x2="120" y2="126" stroke="#f97316" strokeWidth="3" />
          <line x1="138" y1="84" x2="138" y2="126" stroke="#f97316" strokeWidth="3" />
          {/* Horned Iron Helmet */}
          <rect x="92" y="28" width="56" height="34" rx="8" fill="#44403c" stroke="#fde047" strokeWidth="2.5" />
          <rect x="102" y="40" width="36" height="8" rx="3" fill="#fef08a" />
          {/* 3 Cards being shredded/exiled in sparks at the bottom */}
          <rect x="30" y="108" width="24" height="32" rx="3" transform="rotate(-18 42 124)" fill="#78716c" stroke="#fde047" strokeWidth="2" />
          <rect x="108" y="118" width="24" height="32" rx="3" fill="#78716c" stroke="#fde047" strokeWidth="2" />
          <rect x="186" y="108" width="24" height="32" rx="3" transform="rotate(18 198 124)" fill="#78716c" stroke="#fde047" strokeWidth="2" />
        </svg>
      );

    case 'trillizos':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_trill" cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#818cf8" />
              <stop offset="55%" stopColor="#312e81" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_trill)" />
          {/* Soul Link Arcs connecting the 3 brothers */}
          <path d="M56,64 Q120,24 184,64" fill="none" stroke="#c7d2fe" strokeWidth="2.5" strokeDasharray="5 3" />
          {/* Left Brother (1V) */}
          <circle cx="56" cy="72" r="14" fill="#4338ca" stroke="#a5b4fc" strokeWidth="2" />
          <path d="M32,160 C35,116 44,94 56,94 C68,94 77,116 80,160 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          {/* Right Brother (2V) */}
          <circle cx="184" cy="72" r="14" fill="#4338ca" stroke="#a5b4fc" strokeWidth="2" />
          <path d="M160,160 C163,116 172,94 184,94 C196,94 205,116 208,160 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          {/* Center Elder Triplet (3V) */}
          <circle cx="120" cy="56" r="17" fill="#6366f1" stroke="#fef08a" strokeWidth="2.5" />
          <path d="M88,160 C92,106 104,82 120,82 C136,82 148,106 152,160 Z" fill="#312e81" stroke="#fef08a" strokeWidth="2.5" />
          {/* 3 Glowing Soul Gems */}
          <circle cx="56" cy="118" r="5" fill="#e0e7ff" />
          <circle cx="120" cy="108" r="6" fill="#fef08a" />
          <circle cx="184" cy="118" r="5" fill="#e0e7ff" />
        </svg>
      );

    case 'token_mellizo':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="160" fill="#1e1b4b" />
          <path d="M82,66 Q120,36 158,66" fill="none" stroke="#a5b4fc" strokeWidth="2.5" strokeDasharray="4 4" />
          <circle cx="82" cy="68" r="15" fill="#4f46e5" stroke="#c7d2fe" strokeWidth="2" />
          <path d="M54,160 C58,112 68,90 82,90 C96,90 106,112 110,160 Z" fill="#312e81" stroke="#818cf8" strokeWidth="2" />
          <circle cx="158" cy="68" r="15" fill="#4f46e5" stroke="#fef08a" strokeWidth="2" />
          <path d="M130,160 C134,112 144,90 158,90 C172,90 182,112 186,160 Z" fill="#312e81" stroke="#fef08a" strokeWidth="2" />
        </svg>
      );

    case 'token_hermano':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="160" fill="#0f172a" />
          {/* Two spirit halos of his fallen brothers */}
          <circle cx="75" cy="54" r="12" fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <circle cx="165" cy="54" r="12" fill="none" stroke="#818cf8" strokeWidth="2" strokeDasharray="3 3" opacity="0.6" />
          <circle cx="120" cy="62" r="16" fill="#6366f1" stroke="#fef08a" strokeWidth="2.5" />
          <path d="M88,160 C92,108 104,86 120,86 C136,86 148,108 152,160 Z" fill="#312e81" stroke="#fef08a" strokeWidth="2.5" />
        </svg>
      );

    case 'una_puerta_se_abre':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_puerta" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#fef9c3" />
              <stop offset="35%" stopColor="#38bdf8" />
              <stop offset="75%" stopColor="#0c4a6e" />
              <stop offset="100%" stopColor="#020617" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_puerta)" />
          {/* Stone Portal Archway */}
          <path d="M62,160 L62,48 C62,16 178,16 178,48 L178,160 L154,160 L154,52 C154,32 86,32 86,52 L86,160 Z" fill="#334155" stroke="#fde047" strokeWidth="2.5" />
          {/* Blinding Golden Light Rays pouring from the open door */}
          <polygon points="86,52 154,52 210,160 30,160" fill="#fef08a" opacity="0.32" />
          {/* Two bright drawn cards emerging (+2) */}
          <rect x="92" y="62" width="24" height="34" rx="3" transform="rotate(-10 104 79)" fill="#fef9c3" stroke="#d97706" strokeWidth="2" />
          <rect x="122" y="62" width="24" height="34" rx="3" transform="rotate(10 134 79)" fill="#fef9c3" stroke="#d97706" strokeWidth="2" />
          {/* One dark card being discarded (-1) at bottom */}
          <rect x="108" y="114" width="24" height="32" rx="3" transform="rotate(24 120 130)" fill="#475569" stroke="#f87171" strokeWidth="2" />
        </svg>
      );

    case 'mercenarios_de_emergencia':
    case 'token_mercenario':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_merc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#450a0a" />
              <stop offset="50%" stopColor="#991b1b" />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_merc)" />
          {/* Three Crossed Mercenary Broadswords */}
          <line x1="42" y1="142" x2="188" y2="22" stroke="#e2e8f0" strokeWidth="5" />
          <line x1="198" y1="142" x2="52" y2="22" stroke="#e2e8f0" strokeWidth="5" />
          <line x1="120" y1="150" x2="120" y2="14" stroke="#fef08a" strokeWidth="5.5" />
          {/* Three Mercenary Helmets & Gold Coins */}
          <circle cx="65" cy="96" r="18" fill="#1e293b" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="175" cy="96" r="18" fill="#1e293b" stroke="#f59e0b" strokeWidth="2.5" />
          <circle cx="120" cy="82" r="22" fill="#334155" stroke="#fef08a" strokeWidth="3" />
          {/* Gold Coin Emblem at bottom */}
          <circle cx="120" cy="134" r="14" fill="#facc15" stroke="#78350f" strokeWidth="2.5" />
          <text x="120" y="139" textAnchor="middle" fill="#78350f" fontSize="14" fontWeight="bold">$</text>
        </svg>
      );

    case 'fabrica_de_robots':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_fab" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f172a" />
              <stop offset="55%" stopColor="#334155" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_fab)" />
          {/* Industrial Smokestacks */}
          <rect x="42" y="18" width="18" height="70" fill="#475569" stroke="#94a3b8" strokeWidth="2" />
          <rect x="180" y="18" width="18" height="70" fill="#475569" stroke="#94a3b8" strokeWidth="2" />
          {/* Giant Rotating Brass & Iron Gears */}
          <circle cx="68" cy="82" r="28" fill="none" stroke="#f59e0b" strokeWidth="7" strokeDasharray="8 5" />
          <circle cx="172" cy="82" r="28" fill="none" stroke="#94a3b8" strokeWidth="7" strokeDasharray="8 5" />
          {/* Central Factory Structure (8A Armor) */}
          <polygon points="50,160 66,64 174,64 190,160" fill="#1e293b" stroke="#cbd5e1" strokeWidth="3" />
          {/* Glowing Blue Assembly Portal Door */}
          <rect x="92" y="92" width="56" height="68" rx="8" fill="#0284c7" stroke="#fef08a" strokeWidth="2.5" />
          {/* Robot Silhouette inside the Assembly Bay */}
          <rect x="106" y="106" width="28" height="24" rx="4" fill="#334155" stroke="#38bdf8" strokeWidth="2" />
          <circle cx="114" cy="118" r="3.5" fill="#fef08a" />
          <circle cx="126" cy="118" r="3.5" fill="#fef08a" />
        </svg>
      );

    case 'token_robot':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="160" fill="#1e293b" />
          {/* Antenna */}
          <line x1="120" y1="16" x2="120" y2="38" stroke="#38bdf8" strokeWidth="4" />
          <circle cx="120" cy="14" r="6" fill="#fef08a" />
          {/* Robot Head */}
          <rect x="86" y="38" width="68" height="48" rx="10" fill="#475569" stroke="#cbd5e1" strokeWidth="3" />
          {/* Glowing Visor Eyes */}
          <rect x="98" y="52" width="16" height="10" rx="3" fill="#38bdf8" />
          <rect x="126" y="52" width="16" height="10" rx="3" fill="#38bdf8" />
          {/* Robot Torso with Core */}
          <rect x="74" y="92" width="92" height="68" rx="10" fill="#334155" stroke="#94a3b8" strokeWidth="3" />
          <circle cx="120" cy="122" r="14" fill="#0284c7" stroke="#bae6fd" strokeWidth="2.5" />
        </svg>
      );

    case 'token_dron':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <rect width="240" height="160" fill="#0f172a" />
          {/* Rotor Blades */}
          <ellipse cx="64" cy="48" rx="34" ry="6" fill="#38bdf8" opacity="0.7" />
          <ellipse cx="176" cy="48" rx="34" ry="6" fill="#38bdf8" opacity="0.7" />
          <line x1="64" y1="48" x2="96" y2="76" stroke="#94a3b8" strokeWidth="4" />
          <line x1="176" y1="48" x2="144" y2="76" stroke="#94a3b8" strokeWidth="4" />
          {/* Spherical Drone Body & Glowing Eye Lens */}
          <circle cx="120" cy="86" r="32" fill="#475569" stroke="#e2e8f0" strokeWidth="3" />
          <circle cx="120" cy="86" r="14" fill="#ef4444" stroke="#fef08a" strokeWidth="2.5" />
          <circle cx="116" cy="82" r="4" fill="#ffffff" />
        </svg>
      );

    case 'reclutador':
    case 'flag':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_rec" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#064e3b" />
              <stop offset="55%" stopColor="#059669" />
              <stop offset="100%" stopColor="#022c22" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_rec)" />
          {/* Multiple Colony Flags */}
          <line x1="55" y1="18" x2="55" y2="160" stroke="#fde047" strokeWidth="3.5" />
          <path d="M55,22 L115,36 L55,56 Z" fill="#10b981" stroke="#fef08a" strokeWidth="2" />
          <line x1="125" y1="10" x2="125" y2="160" stroke="#fde047" strokeWidth="4" />
          <path d="M125,14 L205,32 L180,52 L205,70 L125,65 Z" fill="#f59e0b" stroke="#fff" strokeWidth="2" />
          {/* Golden Herald Horn */}
          <path d="M60,115 Q115,110 175,78 L185,112 Q120,122 60,125 Z" fill="#fbbf24" stroke="#78350f" strokeWidth="2" />
          {/* Silhouttes of marching recruits */}
          <g fill="#022c22" opacity="0.85">
            <circle cx="45" cy="142" r="12" />
            <circle cx="85" cy="138" r="14" />
            <circle cx="130" cy="136" r="15" />
            <circle cx="175" cy="140" r="13" />
          </g>
        </svg>
      );

    case 'mago_de_las_tormentas':
    case 'zap':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_mago" cx="50%" cy="40%" r="70%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="45%" stopColor="#3730a3" />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_mago)" />
          {/* Arcane Energy Ring */}
          <circle cx="120" cy="70" r="46" fill="none" stroke="#7dd3fc" strokeWidth="2" strokeDasharray="6 4" opacity="0.7" />
          <circle cx="120" cy="70" r="34" fill="none" stroke="#c084fc" strokeWidth="1.5" opacity="0.6" />
          {/* Hooded Storm Mage */}
          <path d="M75,160 C82,112 100,92 120,92 C140,92 158,112 165,160 Z" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" />
          <path d="M120,38 L146,85 L120,96 L94,85 Z" fill="#312e81" stroke="#bae6fd" strokeWidth="2" />
          {/* Glowing Eyes */}
          <circle cx="112" cy="74" r="3" fill="#e0f2fe" />
          <circle cx="128" cy="74" r="3" fill="#e0f2fe" />
          {/* Crackling Lightning Bolts */}
          <polyline
            points="25,15 70,50 55,62 98,95"
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="3.5"
          />
          <polyline
            points="215,12 168,48 185,60 142,95"
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="3.5"
          />
          <polyline
            points="120,5 112,28 128,32 120,52"
            fill="none"
            stroke="#fef08a"
            strokeWidth="3"
          />
        </svg>
      );

    case 'mensajero':
    case 'scroll':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_men" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0c4a6e" />
              <stop offset="50%" stopColor="#0284c7" />
              <stop offset="100%" stopColor="#082f49" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_men)" />
          {/* Wind Speed Lines */}
          <line x1="15" y1="40" x2="95" y2="40" stroke="#bae6fd" strokeWidth="2" opacity="0.5" />
          <line x1="145" y1="115" x2="225" y2="115" stroke="#bae6fd" strokeWidth="2" opacity="0.5" />
          {/* Royal Scroll with Wax Seal */}
          <g transform="rotate(-14 120 80)">
            <rect x="65" y="42" width="110" height="72" rx="6" fill="#fef3c7" stroke="#d97706" strokeWidth="3" />
            <rect x="57" y="36" width="14" height="84" rx="5" fill="#b45309" stroke="#fde68a" strokeWidth="1.5" />
            <rect x="169" y="36" width="14" height="84" rx="5" fill="#b45309" stroke="#fde68a" strokeWidth="1.5" />
            <line x1="85" y1="62" x2="155" y2="62" stroke="#92400e" strokeWidth="2.5" />
            <line x1="85" y1="76" x2="145" y2="76" stroke="#92400e" strokeWidth="2.5" />
            <line x1="85" y1="90" x2="130" y2="90" stroke="#92400e" strokeWidth="2.5" />
            {/* Crimson Wax Seal */}
            <circle cx="145" cy="96" r="14" fill="#dc2626" stroke="#fca5a5" strokeWidth="2" />
            <polygon points="145,87 148,94 155,94 149,98 151,105 145,101 139,105 141,98 135,94 142,94" fill="#fef08a" />
          </g>
        </svg>
      );

    case 'rayo_vengativo':
    case 'flame':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_rayo" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="40%" stopColor="#ef4444" />
              <stop offset="80%" stopColor="#7f1d1d" />
              <stop offset="100%" stopColor="#180404" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_rayo)" />
          {/* Giant Crimson/Gold Sky Thunderbolt */}
          <polygon
            points="145,0 85,72 128,72 72,160 168,62 122,62"
            fill="#fef9c3"
            stroke="#f97316"
            strokeWidth="3"
          />
          {/* Shockwave rings */}
          <ellipse cx="105" cy="138" rx="65" ry="14" fill="none" stroke="#fde047" strokeWidth="2.5" opacity="0.8" />
          <ellipse cx="105" cy="138" rx="40" ry="8" fill="none" stroke="#ffffff" strokeWidth="2" />
        </svg>
      );

    case 'el_regreso_del_sobreviviente':
    case 'heart':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_sob" cx="50%" cy="65%" r="70%">
              <stop offset="0%" stopColor="#86efac" />
              <stop offset="45%" stopColor="#15803d" />
              <stop offset="100%" stopColor="#052e16" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_sob)" />
          {/* Rising Golden Light Pillar */}
          <rect x="85" y="0" width="70" height="160" fill="#bbf7d0" opacity="0.22" />
          {/* Radiant Wings / Aura */}
          <path d="M120,95 Q65,40 25,65 Q55,105 120,115 Z" fill="#4ade80" opacity="0.6" />
          <path d="M120,95 Q175,40 215,65 Q185,105 120,115 Z" fill="#4ade80" opacity="0.6" />
          {/* Risen Warrior Gauntlet holding Dogtag/Emblem */}
          <path d="M104,160 L108,88 L116,72 L126,72 L134,88 L136,160 Z" fill="#fde047" stroke="#14532d" strokeWidth="2.5" />
          <circle cx="120" cy="48" r="18" fill="#fef08a" opacity="0.9" />
          <path d="M120,35 L120,61 M107,48 L133,48" stroke="#15803d" strokeWidth="4" />
        </svg>
      );

    case 'mision_de_investigacion':
    case 'search':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_inv" cx="50%" cy="50%" r="70%">
              <stop offset="0%" stopColor="#c084fc" />
              <stop offset="55%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#17092b" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_inv)" />
          {/* Arcane Astrolabe Circles */}
          <circle cx="120" cy="78" r="56" fill="none" stroke="#e9d5ff" strokeWidth="1.5" strokeDasharray="4 4" />
          <circle cx="120" cy="78" r="42" fill="none" stroke="#fbbf24" strokeWidth="2" />
          {/* Open Spellbook / Tome */}
          <path d="M65,125 Q92,112 120,125 Q148,112 175,125 L182,85 Q150,74 120,88 Q90,74 58,85 Z" fill="#fef3c7" stroke="#92400e" strokeWidth="2.5" />
          {/* Glowing Magnifying Lens / Compass Star */}
          <polygon points="120,30 128,58 156,66 128,74 120,102 112,74 84,66 112,58" fill="#fef08a" />
        </svg>
      );

    case 'dado_de_baja':
    case 'undo':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_dado" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#134e4a" />
              <stop offset="50%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#042f2e" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_dado)" />
          {/* Swirling Recall Portal */}
          <circle cx="120" cy="82" r="50" fill="none" stroke="#5eead4" strokeWidth="4" strokeDasharray="18 8" />
          <circle cx="120" cy="82" r="34" fill="#ccfbf1" opacity="0.25" />
          {/* Shield & Return Arrow */}
          <path d="M100,56 L140,56 L136,96 L120,112 L104,96 Z" fill="#0f766e" stroke="#99f6e4" strokeWidth="2.5" />
          <path d="M145,42 C105,22 75,55 82,92" fill="none" stroke="#fef08a" strokeWidth="4" />
          <polygon points="75,45 96,35 90,58" fill="#fef08a" />
        </svg>
      );

    case 'pacto_de_sacrificio':
    case 'skull':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id="bg_pacto" cx="50%" cy="45%" r="70%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#881337" />
              <stop offset="100%" stopColor="#110308" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_pacto)" />
          {/* Dark Ritual Circle */}
          <circle cx="120" cy="78" r="54" fill="none" stroke="#fda4af" strokeWidth="2" opacity="0.65" />
          <polygon points="120,24 166,105 74,105" fill="none" stroke="#fb7185" strokeWidth="2" opacity="0.6" />
          <polygon points="120,132 166,51 74,51" fill="none" stroke="#fb7185" strokeWidth="2" opacity="0.6" />
          {/* Skull / Ritual Dagger */}
          <circle cx="120" cy="72" r="24" fill="#ffe4e6" stroke="#881337" strokeWidth="2.5" />
          <rect x="110" y="88" width="20" height="14" rx="3" fill="#ffe4e6" />
          <circle cx="111" cy="70" r="6" fill="#4c0519" />
          <circle cx="129" cy="70" r="6" fill="#4c0519" />
          <polygon points="120,76 116,84 124,84" fill="#4c0519" />
        </svg>
      );

    case 'token_recluta':
    case 'shield':
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="bg_tok" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#475569" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
          </defs>
          <rect width="240" height="160" fill="url(#bg_tok)" />
          <path
            d="M85,35 L155,35 L150,95 L120,130 L90,95 Z"
            fill="#334155"
            stroke="#cbd5e1"
            strokeWidth="3.5"
          />
          <path d="M120,45 L120,118 M95,75 L145,75" stroke="#fbbf24" strokeWidth="4" />
        </svg>
      );

    default:
      if (fallbackIcon && fallbackIcon !== key && fallbackIcon !== 'default') {
        return renderFantasyScene(fallbackIcon, 'default', baseColor);
      }
      return (
        <svg viewBox="0 0 240 160" className="w-full h-full" preserveAspectRatio="xMidYMid slice">
          <defs>
            <radialGradient id={`bg_custom_${baseColor}`} cx="50%" cy="45%" r="75%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor={baseColor} />
              <stop offset="100%" stopColor="#090d16" />
            </radialGradient>
          </defs>
          <rect width="240" height="160" fill={`url(#bg_custom_${baseColor})`} />
          <circle cx="120" cy="80" r="45" fill="none" stroke="#fef08a" strokeWidth="2.5" opacity="0.7" />
          <polygon
            points="120,32 134,66 170,66 140,88 152,124 120,102 88,124 100,88 70,66 106,66"
            fill="#fffbeb"
            opacity="0.85"
          />
        </svg>
      );
  }
}
