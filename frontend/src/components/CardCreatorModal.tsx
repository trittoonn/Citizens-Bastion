import React, { useRef, useState } from 'react';
import { Plus, Trash2, Upload, X, Sparkles } from 'lucide-react';
import {
  Ability,
  CardDefinition,
  CardType,
  EffectOpType,
  EffectStep,
  PLANET_COLORS,
  TargetOwner,
  TargetRequirement,
  TargetRule,
  TriggerType,
  ZoneID,
} from '../types/game';
import { generateCardDescription } from '../services/storage';
import { CardView } from './CardView';

/**
 * Target presets following the official wording:
 * - "enemigo" = enemy Citizens only.
 * - "carta/s enemiga/s" = enemy Citizens and Tools.
 * - "cualquier objetivo" = any damageable card (Citizens and Tools, allied or enemy).
 */
type TargetPreset =
  | 'enemy_citizen'
  | 'enemy_card'
  | 'self_citizen'
  | 'self_card'
  | 'any_target'
  | 'any_citizen';

function targetPresetOf(target?: TargetRule): TargetPreset {
  const owner: TargetOwner = target?.owner || 'enemy';
  const citizenOnly = target?.cardType === 'citizen';
  if (owner === 'self') return citizenOnly ? 'self_citizen' : 'self_card';
  if (owner === 'any') return citizenOnly ? 'any_citizen' : 'any_target';
  return citizenOnly || !target ? 'enemy_citizen' : 'enemy_card';
}

function applyTargetPreset(target: TargetRule, preset: TargetPreset): TargetRule {
  const owner: TargetOwner = preset.startsWith('self')
    ? 'self'
    : preset.startsWith('any')
      ? 'any'
      : 'enemy';
  const citizenOnly = preset.endsWith('citizen');
  return {
    ...target,
    owner,
    cardType: citizenOnly ? 'citizen' : '',
    excludeCardType: citizenOnly ? '' : 'event',
    onlyLocations: citizenOnly ? false : target.onlyLocations,
  };
}

interface CardCreatorModalProps {
  initialCard?: CardDefinition | null;
  onClose: () => void;
  onSave: (card: CardDefinition) => void;
}

const COLOR_OPTIONS = [
  '#d97706',
  '#b45309',
  '#059669',
  '#0284c7',
  '#4f46e5',
  '#7c3aed',
  '#dc2626',
  '#0d9488',
  '#65a30d',
  '#334155',
  '#475569',
  '#7c2d12',
];

const ICON_OPTIONS = [
  'caballero_galardonado',
  'reclutador_de_guerra',
  'reclutador',
  'granjero',
  'mago_de_las_tormentas',
  'mensajero',
  'asesino',
  'protector_de_los_debiles',
  'germinador',
  'explorador_de_basura',
  'nadador_de_basura',
  'demoledor_de_basura',
  'trillizos',
  'cientifico_loco',
  'general_brazo_de_canon',
  'lluvia_acida',
  'supersoldado_de_elite',
  'fuerza_antihuelga',
  'cadetes_trillizos',
  'pila_de_muertos',
  'constructor_de_cementerios',
  'municiones_vivas',
  'extension_artificial_de_vida',
  'sujeto_de_prueba',
  'la_noche_de_los_muertos_vivos',
  'cementerio_infectado',
  'cremadora_sospechosa',
  'espidi',
  'guia_contratado',
  'vendedor_ambulante',
  'lanzador_de_escombros',
  'camino_bifurcado',
  'busqueda_del_tesoro',
  'templo_antiguo',
  'pala_neumatica',
  'trampa_defectuosa',
  'retirada',
  'rayo_vengativo',
  'el_regreso_del_sobreviviente',
  'mision_de_investigacion',
  'dado_de_baja',
  'pacto_de_sacrificio',
  'una_puerta_se_abre',
  'mercenarios_de_emergencia',
  'fabrica_de_robots',
  'sword',
  'users',
  'flag',
  'zap',
  'scroll',
  'flame',
  'heart',
  'search',
  'undo',
  'skull',
  'shield',
];

function createDefaultStep(op: EffectOpType): EffectStep {
  switch (op) {
    case 'summon_token':
      return {
        op: 'summon_token',
        destZone: 'same_row',
        tokenDef: {
          id: 'token_recluta',
          name: 'Recluta',
          vitality: 2,
          count: 1,
          artIcon: 'shield',
        },
      };
    case 'exile_and_summon_by_v':
      return {
        op: 'exile_and_summon_by_v',
        amount: 3,
        destZone: 'same_row',
        tokenDef: {
          id: 'token_abominacion',
          name: 'Abominación',
          vitality: 1,
          count: 1,
          artIcon: 'skull',
        },
      };
    case 'cycle_hand':
      return {
        op: 'cycle_hand',
      };
    case 'deal_damage':
      return {
        op: 'deal_damage',
        amount: 2,
        target: {
          requirement: 'single_card',
          owner: 'enemy',
          zones: ['city', 'road', 'combat'],
          cardType: 'citizen',
        },
      };
    case 'draw_cards':
      return {
        op: 'draw_cards',
        amount: 1,
      };
    case 'discard_cards':
      return {
        op: 'discard_cards',
        amount: 1,
        target: {
          requirement: 'single_card',
          owner: 'self',
          zones: ['hand'],
        },
      };
    case 'summon_self':
      return {
        op: 'summon_self',
        destZone: 'road',
      };
    case 'mill_or_sacrifice':
      return {
        op: 'mill_or_sacrifice',
        amount: 3,
      };
    case 'move_zone':
      return {
        op: 'move_zone',
        destZone: 'hand',
        shuffleDeck: false,
        target: {
          requirement: 'single_card',
          owner: 'self',
          zones: ['discard'],
          cardType: 'citizen',
        },
      };
    case 'destroy':
      return {
        op: 'destroy',
        target: {
          requirement: 'single_card',
          owner: 'enemy',
          zones: ['city', 'road', 'combat'],
          cardType: 'citizen',
        },
      };
    case 'modify_stat':
      return {
        op: 'modify_stat',
        amount: 2,
        target: {
          requirement: 'self_card',
          owner: 'self',
          zones: ['city', 'road', 'combat'],
          cardType: 'citizen',
        },
      };
  }
}

export const CardCreatorModal: React.FC<CardCreatorModalProps> = ({
  initialCard,
  onClose,
  onSave,
}) => {
  const isEditing = Boolean(initialCard);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [name, setName] = useState(() => initialCard?.name || '');
  const [type, setType] = useState<CardType>(() => initialCard?.type || 'citizen');
  const [subtype, setSubtype] = useState(() => {
    if (initialCard?.subtype) return initialCard.subtype;
    if (initialCard?.isLocation) return 'Locación';
    if (initialCard?.isCommander) return 'Comandante';
    return '';
  });
  const [planet, setPlanet] = useState(() => initialCard?.planet || 'General / Bastión');
  const [borderColor, setBorderColor] = useState(
    () =>
      initialCard?.borderColor ||
      (initialCard?.planet && PLANET_COLORS[initialCard.planet]) ||
      PLANET_COLORS['General / Bastión']
  );
  const [vitality, setVitality] = useState(() =>
    initialCard && initialCard.vitality > 0 ? initialCard.vitality : 5
  );
  const [armor, setArmor] = useState(() => {
    if (initialCard?.type === 'tool') {
      return initialCard.armor || initialCard.vitality || 5;
    }
    return initialCard?.armor || 0;
  });
  const [isSpy, setIsSpy] = useState(() => Boolean(initialCard?.isSpy));
  const [hasShield, setHasShield] = useState(() => Boolean(initialCard?.hasShield));
  const [isDefender, setIsDefender] = useState(() => Boolean(initialCard?.isDefender));
  const [hasQuickAttack, setHasQuickAttack] = useState(() =>
    Boolean(initialCard?.hasQuickAttack)
  );
  const [hasReach, setHasReach] = useState(() => Boolean(initialCard?.hasReach));
  const [isCommander, setIsCommander] = useState(() => Boolean(initialCard?.isCommander));
  const [isLocation, setIsLocation] = useState(() => Boolean(initialCard?.isLocation));
  const [playFromDiscard, setPlayFromDiscard] = useState(() =>
    Boolean(initialCard?.playFromDiscard)
  );
  const [artColor, setArtColor] = useState(
    () => initialCard?.artColor || COLOR_OPTIONS[0]
  );
  const [artIcon, setArtIcon] = useState(() => {
    if (initialCard && ICON_OPTIONS.includes(initialCard.id)) {
      return initialCard.id;
    }
    return initialCard?.artIcon || ICON_OPTIONS[0];
  });
  const [artImageUrl, setArtImageUrl] = useState(() => initialCard?.artImage || '');
  const [abilities, setAbilities] = useState<Ability[]>(() =>
    initialCard?.abilities ? JSON.parse(JSON.stringify(initialCard.abilities)) : []
  );
  const [customDescription, setCustomDescription] = useState(() => {
    if (!initialCard) return '';
    const auto = generateCardDescription(initialCard.abilities || [], {
      isSpy: Boolean(initialCard.isSpy),
      hasShield: Boolean(initialCard.hasShield),
      isDefender: Boolean(initialCard.isDefender),
      hasQuickAttack: Boolean(initialCard.hasQuickAttack),
      hasReach: Boolean(initialCard.hasReach),
      isCommander: Boolean(initialCard.isCommander),
      isLocation: Boolean(initialCard.isLocation),
      playFromDiscard: Boolean(initialCard.playFromDiscard),
    });
    return initialCard.description && initialCard.description !== auto
      ? initialCard.description
      : '';
  });

  const handlePlanetSelect = (nextPlanet: string) => {
    setPlanet(nextPlanet);
    if (PLANET_COLORS[nextPlanet]) {
      setBorderColor(PLANET_COLORS[nextPlanet]);
    }
  };

  const handleSubtypeChange = (val: string) => {
    setSubtype(val);
    if (val.trim().toLowerCase() === 'locación' || val.trim().toLowerCase() === 'locacion') {
      setIsLocation(true);
    }
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const maxW = 520;
        const maxH = 390;
        let w = img.width;
        let h = img.height;
        if (w > maxW || h > maxH) {
          const ratio = Math.min(maxW / w, maxH / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/jpeg', 0.85);
          setArtImageUrl(compressed);
        } else {
          setArtImageUrl(dataUrl);
        }
      };
      img.onerror = () => {
        setArtImageUrl(dataUrl);
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const handleTypeChange = (nextType: CardType) => {
    setType(nextType);
    if (nextType === 'event') {
      setIsSpy(false);
      setHasShield(false);
      setAbilities((prev) =>
        prev.map((a) => ({ ...a, trigger: 'immediate' as TriggerType }))
      );
    } else {
      if (nextType === 'tool') {
        setIsSpy(false);
        if (armor <= 0) setArmor(vitality > 0 ? vitality : 5);
      }
      setAbilities((prev) =>
        prev.map((a) =>
          a.trigger === 'immediate' ? { ...a, trigger: 'on_play' as TriggerType } : a
        )
      );
    }
  };

  const addAbility = () => {
    const defaultTrigger: TriggerType = type === 'event' ? 'immediate' : 'on_play';
    setAbilities((prev) => [
      ...prev,
      {
        trigger: defaultTrigger,
        steps: [createDefaultStep('deal_damage')],
      },
    ]);
  };

  const removeAbility = (abIdx: number) => {
    setAbilities((prev) => prev.filter((_, i) => i !== abIdx));
  };

  const updateAbility = (abIdx: number, patch: Partial<Ability>) => {
    setAbilities((prev) =>
      prev.map((ab, i) => (i === abIdx ? { ...ab, ...patch } : ab))
    );
  };

  const updateTrigger = (abIdx: number, trigger: TriggerType) => {
    setAbilities((prev) =>
      prev.map((ab, i) =>
        i === abIdx
          ? {
              ...ab,
              trigger,
              wearCost:
                trigger === 'activated_wear' && (!ab.wearCost || ab.wearCost <= 0)
                  ? 2
                  : ab.wearCost,
            }
          : ab
      )
    );
  };

  const addStepToAbility = (abIdx: number) => {
    setAbilities((prev) =>
      prev.map((ab, i) =>
        i === abIdx
          ? { ...ab, steps: [...ab.steps, createDefaultStep('draw_cards')] }
          : ab
      )
    );
  };

  const updateStep = (abIdx: number, stepIdx: number, nextStep: EffectStep) => {
    setAbilities((prev) =>
      prev.map((ab, i) =>
        i === abIdx
          ? {
              ...ab,
              steps: ab.steps.map((s, j) => (j === stepIdx ? nextStep : s)),
            }
          : ab
      )
    );
  };

  const removeStep = (abIdx: number, stepIdx: number) => {
    setAbilities((prev) =>
      prev.map((ab, i) =>
        i === abIdx
          ? { ...ab, steps: ab.steps.filter((_, j) => j !== stepIdx) }
          : ab
      )
    );
  };

  const effectiveIsLocation =
    type === 'tool' &&
    (isLocation ||
      subtype.trim().toLowerCase() === 'locación' ||
      subtype.trim().toLowerCase() === 'locacion');

  const autoDescription = generateCardDescription(abilities, {
    isSpy: type === 'citizen' ? isSpy : false,
    hasShield: type !== 'event' ? hasShield : false,
    isDefender: type === 'citizen' ? isDefender : false,
    hasQuickAttack: type === 'citizen' ? hasQuickAttack : false,
    hasReach: type === 'citizen' ? hasReach : false,
    isCommander: type === 'citizen' ? isCommander : false,
    isLocation: effectiveIsLocation,
    playFromDiscard,
  });
  const finalDescription = customDescription.trim() || autoDescription;

  const previewCard: CardDefinition = {
    id: initialCard?.id || 'preview_card',
    name: name.trim() || 'Nueva Carta',
    type,
    subtype: subtype.trim() || (effectiveIsLocation ? 'Locación' : undefined),
    planet: planet.trim() || 'General / Bastión',
    borderColor: borderColor || undefined,
    vitality:
      type === 'citizen'
        ? Math.max(1, vitality)
        : type === 'tool'
        ? Math.max(1, armor)
        : 0,
    armor:
      type === 'tool'
        ? Math.max(1, armor)
        : type === 'citizen' && armor > 0
        ? armor
        : undefined,
    description: finalDescription,
    abilities,
    ...(type === 'citizen' && isSpy ? { isSpy: true } : {}),
    ...(type !== 'event' && hasShield ? { hasShield: true } : {}),
    ...(type === 'citizen' && isDefender ? { isDefender: true } : {}),
    ...(type === 'citizen' && hasQuickAttack ? { hasQuickAttack: true } : {}),
    ...(type === 'citizen' && hasReach ? { hasReach: true } : {}),
    ...(type === 'citizen' && isCommander ? { isCommander: true } : {}),
    ...(effectiveIsLocation ? { isLocation: true } : {}),
    ...(playFromDiscard ? { playFromDiscard: true } : {}),
    isCustom: true,
    artColor,
    artIcon,
    artImage: artImageUrl.trim() || undefined,
  };

  const buildNewCardSlug = () =>
    'custom_' +
    name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_') +
    '_' +
    Math.random().toString(36).substring(2, 6);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const idToUse = initialCard ? initialCard.id : buildNewCardSlug();

    onSave({
      ...previewCard,
      id: idToUse,
      name: name.trim(),
    });
  };

  const handleSaveAsNewCopy = () => {
    if (!name.trim()) return;
    onSave({
      ...previewCard,
      id: buildNewCardSlug(),
      name: name.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0b09]/85 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bastion-panel border-2 border-[#c59b27] rounded-lg max-w-4xl w-full p-6 shadow-2xl my-8">
        <div className="flex items-center justify-between border-b border-[#574c3f] pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-6 h-6 text-[#c59b27]" />
            <div>
              <h2 className="font-display text-xl font-bold text-[#f3ead8]">
                {isEditing
                  ? `Editar Carta: ${initialCard?.name}`
                  : 'Forja de Cartas del Bastión'}
              </h2>
              <p className="font-serif text-sm text-[#a89b8c]">
                {isEditing
                  ? 'Modificá estadísticas, palabras clave, disparadores o efectos de esta carta. Los cambios se reflejarán en tu colección y mazos.'
                  : 'Diseñá nuevos Ciudadanos, Herramientas o Eventos combinando disparadores y efectos. Se guardan en tu navegador y funcionan automáticamente en partidas.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded text-[#a89b8c] hover:text-[#f3ead8] hover:bg-[#26211d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Columns: Form Controls */}
          <div className="lg:col-span-2 space-y-4 max-h-[68vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nombre de la Carta *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Arquero del Bastión"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Tipo de Carta
                </label>
                <select
                  value={type}
                  onChange={(e) => handleTypeChange(e.target.value as CardType)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white focus:border-amber-500 focus:outline-none"
                >
                  <option value="citizen">Ciudadano (Vitalidad V)</option>
                  <option value="tool">Herramienta (Armadura A)</option>
                  <option value="event">Evento (Efecto Inmediato)</option>
                </select>
              </div>
            </div>

            {/* Subtype & Planet + Border Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Subtipo de Carta (Opcional)
                </label>
                <input
                  type="text"
                  placeholder={
                    type === 'tool'
                      ? 'Ej. Locación, Artefacto, Estructura'
                      : type === 'citizen'
                      ? 'Ej. Soldado, Robot, Zombi'
                      : 'Ej. Táctica, Sabotaje, Tecnología'
                  }
                  value={subtype}
                  onChange={(e) => handleSubtypeChange(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
                <div className="flex items-center gap-1 flex-wrap mt-1.5">
                  {(type === 'tool'
                    ? ['Locación', 'Artefacto', 'Estructura', 'Arma']
                    : type === 'citizen'
                    ? ['Soldado', 'Robot', 'Zombi', 'Mercenario', 'Comandante']
                    : ['Táctica', 'Tecnología', 'Sabotaje']
                  ).map((chip) => (
                    <button
                      type="button"
                      key={chip}
                      onClick={() => handleSubtypeChange(chip)}
                      className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition ${
                        subtype === chip
                          ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Planeta y Color del Borde (Sincronizado)
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={
                      ['General / Bastión', 'Plutonio', 'Vapor'].includes(planet)
                        ? planet
                        : 'custom'
                    }
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== 'custom') {
                        handlePlanetSelect(val);
                      }
                    }}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-500 focus:outline-none"
                  >
                    <option value="General / Bastión">General / Bastión</option>
                    <option value="Plutonio">Plutonio</option>
                    <option value="Vapor">Vapor</option>
                    <option value="custom">Personalizado...</option>
                  </select>

                  <label
                    title="Color del borde y del Planeta"
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 cursor-pointer"
                  >
                    <input
                      type="color"
                      value={borderColor || '#38bdf8'}
                      onChange={(e) => setBorderColor(e.target.value)}
                      className="w-6 h-5 rounded cursor-pointer bg-transparent border-0"
                    />
                    <span className="text-[10px] font-mono text-slate-300">
                      {borderColor}
                    </span>
                  </label>
                </div>
                {!['General / Bastión', 'Plutonio', 'Vapor'].includes(planet) && (
                  <input
                    type="text"
                    placeholder="Nombre del Planeta..."
                    value={planet}
                    onChange={(e) => setPlanet(e.target.value)}
                    className="mt-1.5 w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-white"
                  />
                )}
              </div>
            </div>

            {/* Vitality (V — Arriba Izquierda) & Armor (A — Abajo Izquierda) */}
            {type === 'citizen' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Vitalidad (V — Arriba a la izquierda):{' '}
                    <span className="text-amber-400 font-bold">{vitality}V</span>
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={20}
                    value={vitality}
                    onChange={(e) => setVitality(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Armadura (A — Abajo a la izquierda):{' '}
                    <span className="text-sky-300 font-bold">{armor}A</span>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={armor}
                    onChange={(e) => setArmor(Number(e.target.value))}
                    className="w-full accent-sky-400"
                  />
                  <span className="block text-[10px] text-slate-400">
                    La Armadura (A) en un Ciudadano absorbe daño antes que su Vitalidad (V).
                  </span>
                </div>
              </div>
            )}

            {type === 'tool' && (
              <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Armadura (A — Abajo a la izquierda):{' '}
                  <span className="text-sky-300 font-bold">{armor}A</span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={20}
                  value={armor}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setArmor(val);
                    setVitality(val);
                  }}
                  className="w-full accent-sky-400"
                />
              </div>
            )}

            {/* Keywords & Special Attributes */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <span className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                Palabras Clave y Mecánicas Especiales
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                {type === 'citizen' && (
                  <>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-amber-500/50">
                      <input
                        type="checkbox"
                        checked={isDefender}
                        onChange={(e) => setIsDefender(e.target.checked)}
                        className="accent-amber-500"
                      />
                      <span className="text-slate-200 font-semibold">
                        🏰 Defensor{' '}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Debe ser atacado primero en su fila
                        </span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-orange-500/50">
                      <input
                        type="checkbox"
                        checked={hasQuickAttack}
                        onChange={(e) => setHasQuickAttack(e.target.checked)}
                        className="accent-orange-500"
                      />
                      <span className="text-slate-200 font-semibold">
                        ⚡ Ataque Rápido{' '}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          No recibe daño de represalia al atacar
                        </span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-blue-500/50">
                      <input
                        type="checkbox"
                        checked={hasReach}
                        onChange={(e) => setHasReach(e.target.checked)}
                        className="accent-blue-500"
                      />
                      <span className="text-slate-200 font-semibold">
                        🏹 Rango{' '}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Ignora unidades en Combate al atacar
                        </span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-yellow-500/50">
                      <input
                        type="checkbox"
                        checked={isCommander}
                        onChange={(e) => setIsCommander(e.target.checked)}
                        className="accent-yellow-500"
                      />
                      <span className="text-slate-200 font-semibold">
                        👑 Comandante{' '}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Pasa a tu mano tras el Mulligan
                        </span>
                      </span>
                    </label>
                    <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-purple-500/50">
                      <input
                        type="checkbox"
                        checked={isSpy}
                        onChange={(e) => setIsSpy(e.target.checked)}
                        className="accent-purple-500"
                      />
                      <span className="text-slate-200 font-semibold">
                        🗡️ Espía{' '}
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Se juega del lado del oponente
                        </span>
                      </span>
                    </label>
                  </>
                )}
                {type === 'tool' && (
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-amber-500/50">
                    <input
                      type="checkbox"
                      checked={effectiveIsLocation}
                      onChange={(e) => {
                        setIsLocation(e.target.checked);
                        if (e.target.checked && !subtype) {
                          setSubtype('Locación');
                        }
                      }}
                      className="accent-amber-500"
                    />
                    <span className="text-slate-200 font-semibold">
                      🏛️ Locación{' '}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Estructura con Desgaste por efecto
                      </span>
                    </span>
                  </label>
                )}
                {type !== 'event' && (
                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-sky-500/50">
                    <input
                      type="checkbox"
                      checked={hasShield}
                      onChange={(e) => setHasShield(e.target.checked)}
                      className="accent-sky-500"
                    />
                    <span className="text-slate-200 font-semibold">
                      🛡️ Escudo{' '}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Evita el primer daño recibido
                      </span>
                    </span>
                  </label>
                )}
                <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 cursor-pointer hover:border-emerald-500/50">
                  <input
                    type="checkbox"
                    checked={playFromDiscard}
                    onChange={(e) => setPlayFromDiscard(e.target.checked)}
                    className="accent-emerald-500"
                  />
                  <span className="text-slate-200 font-semibold">
                    ♻️ Desde el Descarte{' '}
                    <span className="block text-[10px] text-slate-400 font-normal">
                      Jugable desde tu pila de descarte
                    </span>
                  </span>
                </label>
              </div>
            </div>

            {/* Color, Base Art & Local Image Upload */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Color de Facción / Arte
                  </label>
                  <div className="flex items-center gap-2 flex-wrap">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setArtColor(c)}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full border-2 transition ${
                          artColor === c ? 'border-white scale-110' : 'border-transparent opacity-75'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ilustración TCG Base
                  </label>
                  <select
                    value={artIcon}
                    onChange={(e) => setArtIcon(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
                  >
                    {ICON_OPTIONS.map((ic) => (
                      <option key={ic} value={ic}>
                        {ic.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Arte de la Carta (Subir desde tu Computadora o URL)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 text-xs font-semibold"
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir Imagen desde mi Computadora
                  </button>
                  {artImageUrl && (
                    <button
                      type="button"
                      onClick={() => setArtImageUrl('')}
                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs"
                    >
                      Quitar imagen personalizada
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="https://ejemplo.com/ilustracion-carta.jpg (o subí un archivo arriba)"
                  value={artImageUrl.startsWith('data:') ? 'Imagen local cargada' : artImageUrl}
                  readOnly={artImageUrl.startsWith('data:')}
                  onChange={(e) => setArtImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Abilities Section */}
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-bold text-amber-400">
                    Habilidades, Desgaste y Efectos Condicionales ({abilities.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Cada habilidad incluye su propia fila de Desgaste, Condiciones de activación y pasos encadenados.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addAbility}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Agregar Habilidad
                </button>
              </div>

              <div className="space-y-3">
                {abilities.map((ab, abIdx) => (
                  <div
                    key={abIdx}
                    className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3"
                  >
                    {/* Row 1: Trigger & Actions */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          Disparador:
                        </span>
                        {type !== 'event' ? (
                          <select
                            value={ab.trigger}
                            onChange={(e) =>
                              updateTrigger(abIdx, e.target.value as TriggerType)
                            }
                            className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-amber-300 font-semibold"
                          >
                            <option value="on_play">Al jugar</option>
                            <option value="on_turn_start">Al comienzo del turno</option>
                            <option value="on_turn_end">Al final del turno</option>
                            <option value="on_death">Último deseo (Al ser destruido)</option>
                            <option value="on_event_played">Cuando juegues un Evento</option>
                            <option value="on_discard">Cuando descartas esta carta</option>
                            <option value="on_any_discard">Cuando descartes cualquier carta</option>
                            <option value="activated_wear">Activable en turno (Desgaste X)</option>
                          </select>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 font-semibold">
                            Inmediato (al jugar Evento)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => addStepToAbility(abIdx)}
                          className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                        >
                          + Paso encadenado
                        </button>
                        <button
                          type="button"
                          onClick={() => removeAbility(abIdx)}
                          className="p-1 text-rose-400 hover:bg-rose-500/10 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Row 2: Dedicated Desgaste (Wear Cost) & Once Per Turn Row */}
                    {type !== 'event' && (
                      <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-amber-300">
                            ⚙️ Desgaste (Costo de V/A al activarse):
                          </span>
                          <input
                            type="number"
                            min={0}
                            max={15}
                            value={ab.wearCost || 0}
                            onChange={(e) =>
                              updateAbility(abIdx, {
                                wearCost: Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-white"
                          />
                          <span className="text-[11px] text-slate-400">
                            (0 = sin desgaste)
                          </span>
                        </div>
                        {ab.trigger === 'activated_wear' && (
                          <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={Boolean(ab.oncePerTurn ?? true)}
                              onChange={(e) =>
                                updateAbility(abIdx, { oncePerTurn: e.target.checked })
                              }
                              className="accent-amber-500"
                            />
                            <span>1 vez por turno</span>
                          </label>
                        )}
                      </div>
                    )}

                    {/* Row 3: Dedicated Conditional Ability Row */}
                    <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2 text-xs">
                      <span className="block font-semibold text-sky-300">
                        🔍 Condiciones para que se active esta Habilidad (Opcional):
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(ab.conditionAlliedDiedThisTurn)}
                            onChange={(e) =>
                              updateAbility(abIdx, {
                                conditionAlliedDiedThisTurn: e.target.checked,
                              })
                            }
                            className="accent-sky-400"
                          />
                          <span>Si un Ciudadano aliado murió este turno</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(ab.conditionCardLeftDiscardThisTurn)}
                            onChange={(e) =>
                              updateAbility(abIdx, {
                                conditionCardLeftDiscardThisTurn: e.target.checked,
                              })
                            }
                            className="accent-sky-400"
                          />
                          <span>Si una carta salió de tu Descarte este turno</span>
                        </label>
                        <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(ab.conditionEnemyMorePoints)}
                            onChange={(e) =>
                              updateAbility(abIdx, {
                                conditionEnemyMorePoints: e.target.checked,
                              })
                            }
                            className="accent-sky-400"
                          />
                          <span>Si el oponente tiene más Puntos de Desarrollo</span>
                        </label>
                        <div className="flex items-center gap-2 text-slate-300">
                          <span>Mín. Ciudadanos en tu Descarte:</span>
                          <input
                            type="number"
                            min={0}
                            max={15}
                            value={ab.conditionDiscardMinCitizens || 0}
                            onChange={(e) =>
                              updateAbility(abIdx, {
                                conditionDiscardMinCitizens: Math.max(
                                  0,
                                  Number(e.target.value)
                                ),
                              })
                            }
                            className="w-14 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-white"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Steps inside this ability */}
                    <div className="space-y-2.5 pl-2 border-l-2 border-slate-800">
                      {ab.steps.map((step, stepIdx) => (
                        <div
                          key={stepIdx}
                          className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800/90 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <select
                              value={step.op}
                              onChange={(e) =>
                                updateStep(
                                  abIdx,
                                  stepIdx,
                                  createDefaultStep(e.target.value as EffectOpType)
                                )
                              }
                              className="px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-white font-semibold"
                            >
                              <option value="deal_damage">Hacer Daño</option>
                              <option value="summon_token">Convocar Ciudadano Token</option>
                              <option value="exile_and_summon_by_v">Triturar del Descarte y Convocar por Suma de V</option>
                              <option value="draw_cards">Levantar Cartas del Mazo</option>
                              <option value="discard_cards">Descartar Carta de tu Mano</option>
                              <option value="cycle_hand">Reciclar Mano (Elegir cartas a descartar y robar igual)</option>
                              <option value="summon_self">Convocar esta carta desde el Descarte</option>
                              <option value="mill_or_sacrifice">Triturar X del Descarte o Sacrificar esta carta</option>
                              <option value="move_zone">Mover Carta entre Zonas (Buscar/Recuperar/Reanimar)</option>
                              <option value="destroy">Destruir / Sacrificar Carta</option>
                              <option value="modify_stat">Modificar Vitalidad (+V) o Armadura (+A)</option>
                            </select>

                            {ab.steps.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeStep(abIdx, stepIdx)}
                                className="text-xs text-rose-400 hover:underline"
                              >
                                Quitar paso
                              </button>
                            )}
                          </div>

                          {/* Dynamic parameters per op */}
                          {(step.op === 'deal_damage' ||
                            step.op === 'draw_cards' ||
                            step.op === 'modify_stat' ||
                            step.op === 'mill_or_sacrifice' ||
                            step.op === 'exile_and_summon_by_v') && (
                            <div className="flex items-center gap-3 flex-wrap text-xs">
                              {!step.useStoredVitality && !step.scaleByDiscardCitizens && (
                                <label className="text-slate-400">
                                  {step.op === 'mill_or_sacrifice' ||
                                  step.op === 'exile_and_summon_by_v'
                                    ? 'Cartas a triturar del Descarte:'
                                    : 'Cantidad:'}
                                  <input
                                    type="number"
                                    min={step.op === 'modify_stat' ? -10 : 1}
                                    max={20}
                                    value={
                                      step.amount ??
                                      (step.op === 'mill_or_sacrifice' ||
                                      step.op === 'exile_and_summon_by_v'
                                        ? 3
                                        : 1)
                                    }
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        amount: Number(e.target.value),
                                      })
                                    }
                                    className="ml-1.5 w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-white"
                                  />
                                </label>
                              )}

                              {step.op === 'modify_stat' && (
                                <label className="text-slate-400 flex items-center gap-1.5">
                                  <span>Estadística:</span>
                                  <select
                                    value={step.statTarget || 'vitality'}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        statTarget: e.target.value as 'vitality' | 'armor',
                                      })
                                    }
                                    className="px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-white"
                                  >
                                    <option value="vitality">Vitalidad (V)</option>
                                    <option value="armor">Armadura (A)</option>
                                  </select>
                                </label>
                              )}

                              {(step.op === 'deal_damage' || step.op === 'modify_stat') && (
                                <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(step.useStoredVitality)}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        useStoredVitality: e.target.checked,
                                      })
                                    }
                                    className="accent-amber-400"
                                  />
                                  <span>Usar V guardada del paso anterior</span>
                                </label>
                              )}

                              {step.op === 'modify_stat' && (
                                <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(step.scaleByDiscardCitizens)}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        scaleByDiscardCitizens: e.target.checked,
                                      })
                                    }
                                    className="accent-amber-400"
                                  />
                                  <span>+1 por cada Ciudadano en tu Descarte</span>
                                </label>
                              )}
                            </div>
                          )}

                          {step.op === 'discard_cards' && (
                            <div className="flex items-center gap-3 flex-wrap text-xs">
                              <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(step.storeTargetCardType)}
                                  onChange={(e) =>
                                    updateStep(abIdx, stepIdx, {
                                      ...step,
                                      storeTargetCardType: e.target.checked,
                                    })
                                  }
                                  className="accent-amber-400"
                                />
                                <span>Guardar tipo de carta descartada (para el siguiente paso)</span>
                              </label>
                            </div>
                          )}

                          {step.op === 'summon_self' && (
                            <div className="flex items-center gap-2 text-xs">
                              <span className="text-slate-400">Convocar en:</span>
                              <select
                                value={step.destZone || 'road'}
                                onChange={(e) =>
                                  updateStep(abIdx, stepIdx, {
                                    ...step,
                                    destZone: e.target.value as ZoneID,
                                  })
                                }
                                className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                              >
                                <option value="road">El Camino</option>
                                <option value="city">La Ciudad</option>
                                <option value="combat">Zona de Combate</option>
                              </select>
                            </div>
                          )}

                          {step.op === 'summon_token' && (
                            <div className="space-y-2 text-xs">
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div>
                                  <span className="text-slate-400 block">Nombre Token</span>
                                  <input
                                    type="text"
                                    value={step.tokenDef?.name || 'Recluta'}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        tokenDef: {
                                          ...(step.tokenDef || {
                                            id: 'token_custom',
                                            vitality: 1,
                                          }),
                                          name: e.target.value,
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  />
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Vitalidad (V)</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={15}
                                    value={step.tokenDef?.vitality || 1}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        tokenDef: {
                                          ...(step.tokenDef || {
                                            id: 'token_custom',
                                            name: 'Recluta',
                                          }),
                                          vitality: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  />
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Cantidad</span>
                                  <input
                                    type="number"
                                    min={1}
                                    max={5}
                                    value={step.tokenDef?.count || 1}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        tokenDef: {
                                          ...(step.tokenDef || {
                                            id: 'token_custom',
                                            name: 'Recluta',
                                            vitality: 1,
                                          }),
                                          count: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  />
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Fila destino</span>
                                  <select
                                    value={step.destZone || 'same_row'}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        destZone: e.target.value as ZoneID,
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  >
                                    <option value="same_row">Esta misma fila</option>
                                    <option value="any_row">En cualquier fila (a elección)</option>
                                    <option value="city">La Ciudad</option>
                                    <option value="road">El Camino</option>
                                    <option value="combat">Zona de Combate</option>
                                  </select>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                <div>
                                  <span className="text-slate-400 block">
                                    Extra si el rival tiene más Puntos de Desarrollo
                                  </span>
                                  <input
                                    type="number"
                                    min={0}
                                    max={5}
                                    value={step.tokenDef?.bonusCountIfEnemyMorePoints || 0}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        tokenDef: {
                                          ...(step.tokenDef || {
                                            id: 'token_custom',
                                            name: 'Recluta',
                                            vitality: 1,
                                          }),
                                          bonusCountIfEnemyMorePoints: Number(e.target.value),
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  />
                                </div>

                                <div>
                                  <span className="text-slate-400 block">
                                    Último deseo del Token (Sub-token al morir)
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    <input
                                      type="text"
                                      placeholder="Ej. Dron / Hermano (vacío = ninguno)"
                                      value={
                                        step.tokenDef?.abilities?.[0]?.steps?.[0]?.tokenDef
                                          ?.name || ''
                                      }
                                      onChange={(e) => {
                                        const subName = e.target.value;
                                        const prevSubVit =
                                          step.tokenDef?.abilities?.[0]?.steps?.[0]?.tokenDef
                                            ?.vitality || 1;
                                        updateStep(abIdx, stepIdx, {
                                          ...step,
                                          tokenDef: {
                                            ...(step.tokenDef || {
                                              id: 'token_custom',
                                              name: 'Robot',
                                              vitality: 2,
                                            }),
                                            abilities: subName.trim()
                                              ? [
                                                  {
                                                    trigger: 'on_death',
                                                    steps: [
                                                      {
                                                        op: 'summon_token',
                                                        destZone: 'same_row',
                                                        tokenDef: {
                                                          id: 'token_sub',
                                                          name: subName,
                                                          vitality: prevSubVit,
                                                          count: 1,
                                                        },
                                                      },
                                                    ],
                                                  },
                                                ]
                                              : undefined,
                                          },
                                        });
                                      }}
                                      className="flex-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                    />
                                    {step.tokenDef?.abilities?.[0]?.steps?.[0]?.tokenDef?.name && (
                                      <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        title="Vitalidad del Sub-token"
                                        value={
                                          step.tokenDef?.abilities?.[0]?.steps?.[0]?.tokenDef
                                            ?.vitality || 1
                                        }
                                        onChange={(e) => {
                                          const subName =
                                            step.tokenDef?.abilities?.[0]?.steps?.[0]?.tokenDef
                                              ?.name || 'Dron';
                                          updateStep(abIdx, stepIdx, {
                                            ...step,
                                            tokenDef: {
                                              ...(step.tokenDef || {
                                                id: 'token_custom',
                                                name: 'Robot',
                                                vitality: 2,
                                              }),
                                              abilities: [
                                                {
                                                  trigger: 'on_death',
                                                  steps: [
                                                    {
                                                      op: 'summon_token',
                                                      destZone: 'same_row',
                                                      tokenDef: {
                                                        id: 'token_sub',
                                                        name: subName,
                                                        vitality: Number(e.target.value),
                                                        count: 1,
                                                      },
                                                    },
                                                  ],
                                                },
                                              ],
                                            },
                                          });
                                        }}
                                        className="w-14 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                      />
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(step.scaleCountByAlliedDeathsThisTurn)}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        scaleCountByAlliedDeathsThisTurn: e.target.checked,
                                      })
                                    }
                                    className="accent-amber-400"
                                  />
                                  <span>Convocar 1 por cada aliado muerto este turno</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(step.useStoredVitality)}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        useStoredVitality: e.target.checked,
                                      })
                                    }
                                    className="accent-amber-400"
                                  />
                                  <span>Vitalidad igual a la V guardada</span>
                                </label>
                              </div>
                            </div>
                          )}

                          {(step.op === 'deal_damage' ||
                            step.op === 'destroy' ||
                            step.op === 'modify_stat') && (
                            <div className="space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="text-slate-400 block">Alcance</span>
                                  <select
                                    value={step.target?.requirement || 'single_card'}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        target: {
                                          ...(step.target || {}),
                                          requirement: e.target.value as TargetRequirement,
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  >
                                    <option value="single_card">1 Objetivo a elección</option>
                                    <option value="all_matching">Todos los que coincidan</option>
                                    <option value="weakest_enemy">Enemigo con menor V</option>
                                    {type !== 'event' && (
                                      <>
                                        <option value="right_neighbor">
                                          Ciudadano a la derecha de esta carta
                                        </option>
                                        <option value="self_card">Esta misma carta</option>
                                      </>
                                    )}
                                  </select>
                                </div>
                                {step.target?.requirement !== 'self_card' &&
                                  step.target?.requirement !== 'right_neighbor' && (
                                    <div>
                                      <span className="text-slate-400 block">Tipo de objetivo</span>
                                      <select
                                        value={targetPresetOf(step.target)}
                                        onChange={(e) =>
                                          updateStep(abIdx, stepIdx, {
                                            ...step,
                                            target: applyTargetPreset(
                                              step.target || { requirement: 'single_card' },
                                              e.target.value as TargetPreset,
                                            ),
                                          })
                                        }
                                        className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                      >
                                        <option value="enemy_citizen">Enemigo (Ciudadano rival)</option>
                                        <option value="enemy_card">
                                          Carta enemiga (Ciudadano o Herramienta rival)
                                        </option>
                                        <option value="self_citizen">Ciudadano aliado</option>
                                        <option value="self_card">Carta aliada (Ciudadano o Herramienta)</option>
                                        <option value="any_target">
                                          Cualquier objetivo (Ciudadano o Herramienta)
                                        </option>
                                        <option value="any_citizen">Cualquier Ciudadano</option>
                                      </select>
                                    </div>
                                  )}
                              </div>

                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                {step.target?.requirement === 'single_card' && (
                                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(step.target?.random)}
                                      onChange={(e) =>
                                        updateStep(abIdx, stepIdx, {
                                          ...step,
                                          target: {
                                            ...(step.target || { requirement: 'single_card' }),
                                            random: e.target.checked,
                                          },
                                        })
                                      }
                                      className="accent-amber-400"
                                    />
                                    <span>Al azar (si no, el jugador elige)</span>
                                  </label>
                                )}
                                {step.op === 'modify_stat' && (
                                  <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(step.modifyBaseVitality)}
                                      onChange={(e) =>
                                        updateStep(abIdx, stepIdx, {
                                          ...step,
                                          modifyBaseVitality: e.target.checked,
                                        })
                                      }
                                      className="accent-amber-400"
                                    />
                                    <span>Cambia la V base permanentemente</span>
                                  </label>
                                )}
                              </div>

                              {step.op === 'destroy' && (
                                <div className="flex flex-wrap items-center gap-3 pt-1">
                                  <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(step.storeVictimVitality)}
                                      onChange={(e) =>
                                        updateStep(abIdx, stepIdx, {
                                          ...step,
                                          storeVictimVitality: e.target.checked,
                                        })
                                      }
                                      className="accent-amber-400"
                                    />
                                    <span>Guardar V de la víctima</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(step.grantSelfShieldOnSuccess)}
                                      onChange={(e) =>
                                        updateStep(abIdx, stepIdx, {
                                          ...step,
                                          grantSelfShieldOnSuccess: e.target.checked,
                                        })
                                      }
                                      className="accent-amber-400"
                                    />
                                    <span>Si destruye, esta carta gana Escudo</span>
                                  </label>
                                  <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={Boolean(step.target?.onlyLocations)}
                                      onChange={(e) =>
                                        updateStep(abIdx, stepIdx, {
                                          ...step,
                                          target: {
                                            ...(step.target || { requirement: 'single_card' }),
                                            onlyLocations: e.target.checked,
                                            cardType: e.target.checked ? 'tool' : 'citizen',
                                          },
                                        })
                                      }
                                      className="accent-amber-400"
                                    />
                                    <span>Solo Locaciones</span>
                                  </label>
                                </div>
                              )}
                            </div>
                          )}

                          {step.op === 'move_zone' && (
                            <div className="space-y-2 text-xs">
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <span className="text-slate-400 block">Zona Origen</span>
                                  <select
                                    value={step.target?.zones?.[0] || 'discard'}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      const zones: ZoneID[] =
                                        val === 'board'
                                          ? ['city', 'road', 'combat']
                                          : [val as ZoneID];
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        shuffleDeck: val === 'deck',
                                        target: {
                                          ...(step.target || { requirement: 'single_card' }),
                                          zones,
                                        },
                                      });
                                    }}
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  >
                                    <option value="discard">Tu Descarte</option>
                                    <option value="deck">Tu Mazo</option>
                                    <option value="board">El Tablero</option>
                                  </select>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Zona Destino</span>
                                  <select
                                    value={step.destZone || 'hand'}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        destZone: e.target.value as ZoneID,
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  >
                                    <option value="hand">Tu Mano</option>
                                    <option value="any_row">Jugar en cualquier fila (a elección)</option>
                                    <option value="city">La Ciudad</option>
                                    <option value="road">El Camino</option>
                                    <option value="combat">Zona de Combate</option>
                                    <option value="discard">Descarte</option>
                                    <option value="exile">Trituradora (Exilio)</option>
                                  </select>
                                </div>
                                <div>
                                  <span className="text-slate-400 block">Dueño</span>
                                  <select
                                    value={step.target?.owner || 'self'}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        target: {
                                          ...(step.target || { requirement: 'single_card' }),
                                          owner: e.target.value as TargetOwner,
                                        },
                                      })
                                    }
                                    className="w-full px-2 py-1 rounded bg-slate-950 border border-slate-700 text-white"
                                  >
                                    <option value="self">Propio</option>
                                    <option value="enemy">Enemigo</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-3 pt-1">
                                <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(step.storeVictimVitality)}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        storeVictimVitality: e.target.checked,
                                      })
                                    }
                                    className="accent-amber-400"
                                  />
                                  <span>Guardar V de la carta movida</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-amber-200 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(step.sacrificeAtTurnEnd)}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        sacrificeAtTurnEnd: e.target.checked,
                                      })
                                    }
                                    className="accent-amber-400"
                                  />
                                  <span>Sacrificar al final del turno</span>
                                </label>
                                <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(step.target?.matchStoredCardType)}
                                    onChange={(e) =>
                                      updateStep(abIdx, stepIdx, {
                                        ...step,
                                        target: {
                                          ...(step.target || { requirement: 'single_card' }),
                                          matchStoredCardType: e.target.checked,
                                        },
                                      })
                                    }
                                    className="accent-amber-400"
                                  />
                                  <span>Mismo tipo que carta descartada</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-300">
                  Texto de Reglas (Opcional — se genera automáticamente si lo dejás vacío)
                </label>
                {customDescription.trim() !== '' && (
                  <button
                    type="button"
                    onClick={() => setCustomDescription('')}
                    className="text-[11px] text-amber-400 hover:underline"
                  >
                    ↻ Usar texto autogenerado
                  </button>
                )}
              </div>
              <input
                type="text"
                placeholder={autoDescription}
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Right Column: Live Card Preview & Submit */}
          <div className="flex flex-col items-center justify-between bg-[#14110e] border border-[#574c3f] rounded-lg p-5">
            <div className="flex flex-col items-center">
              <span className="font-display text-xs uppercase tracking-wider font-bold text-[#c59b27] mb-4">
                Vista Previa de la Carta
              </span>
              <CardView card={previewCard} size="md" />
            </div>

            <div className="w-full space-y-2 mt-6">
              <button
                type="submit"
                disabled={!name.trim()}
                className="btn-war-gold w-full py-2.5 px-4 rounded text-xs"
              >
                {isEditing ? 'Guardar Cambios' : 'Forjar y Guardar en Armería'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  disabled={!name.trim()}
                  onClick={handleSaveAsNewCopy}
                  className="btn-war-iron w-full py-2 px-4 rounded text-xs border-[#c59b27]/60 text-[#f3d46b]"
                >
                  Guardar como Copia Nueva
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="btn-war-iron w-full py-2 px-4 rounded text-xs"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
