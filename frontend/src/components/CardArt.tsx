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

  const key = card.artImage || card.id || card.artIcon || 'default';

  return (
    <div className={`relative overflow-hidden select-none ${className}`}>
      {renderFantasyScene(key, card.artColor || (card.type === 'citizen' ? '#d97706' : '#7c3aed'))}
      {/* Subtle TCG inner vignette & foil sheen */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/30 pointer-events-none" />
      <div className="absolute inset-0 shadow-[inset_0_0_16px_rgba(0,0,0,0.85)] pointer-events-none" />
    </div>
  );
};

function renderFantasyScene(key: string, baseColor: string) {
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
