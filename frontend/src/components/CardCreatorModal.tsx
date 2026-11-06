import React, { useState } from 'react';
import { Plus, Trash2, X, Sparkles } from 'lucide-react';
import {
  Ability,
  CardDefinition,
  CardType,
  EffectOpType,
  EffectStep,
  TargetOwner,
  TargetRequirement,
  TriggerType,
  ZoneID,
} from '../types/game';
import { generateCardDescription } from '../services/storage';
import { CardView } from './CardView';

interface CardCreatorModalProps {
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
];

const ICON_OPTIONS = [
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
          vitality: 1,
          count: 1,
          artIcon: 'shield',
        },
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

export const CardCreatorModal: React.FC<CardCreatorModalProps> = ({ onClose, onSave }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState<CardType>('citizen');
  const [vitality, setVitality] = useState(5);
  const [artColor, setArtColor] = useState(COLOR_OPTIONS[0]);
  const [artIcon, setArtIcon] = useState(ICON_OPTIONS[0]);
  const [artImageUrl, setArtImageUrl] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [abilities, setAbilities] = useState<Ability[]>([]);

  const handleTypeChange = (nextType: CardType) => {
    setType(nextType);
    if (nextType === 'event') {
      setAbilities((prev) =>
        prev.map((a) => ({ ...a, trigger: 'immediate' as TriggerType }))
      );
    } else {
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

  const updateTrigger = (abIdx: number, trigger: TriggerType) => {
    setAbilities((prev) =>
      prev.map((ab, i) => (i === abIdx ? { ...ab, trigger } : ab))
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

  const autoDescription = generateCardDescription(abilities);
  const finalDescription = customDescription.trim() || autoDescription;

  const previewCard: CardDefinition = {
    id: 'preview_card',
    name: name.trim() || 'Nueva Carta',
    type,
    vitality: type === 'citizen' ? Math.max(1, vitality) : 0,
    description: finalDescription,
    abilities,
    isCustom: true,
    artColor,
    artIcon,
    artImage: artImageUrl.trim() || undefined,
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const slug =
      'custom_' +
      name
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_') +
      '_' +
      Math.random().toString(36).substring(2, 6);

    onSave({
      ...previewCard,
      id: slug,
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
                Forja de Cartas del Bastión
              </h2>
              <p className="font-serif text-sm text-[#a89b8c]">
                Diseñá nuevos Ciudadanos o Eventos combinando disparadores y efectos. Se guardan en tu navegador y funcionan automáticamente en partidas online.
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
                  <option value="citizen">Ciudadano</option>
                  <option value="event">Evento</option>
                </select>
              </div>
            </div>

            {type === 'citizen' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Vitalidad (V): <span className="text-amber-400 font-bold">{vitality}V</span>
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
            )}

            {/* Color & Icon Pickers */}
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

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                URL de Imagen Personalizada (Opcional — estilo MTG/YuGiOh)
              </label>
              <input
                type="url"
                placeholder="https://ejemplo.com/ilustracion-carta.jpg (o dejá vacío para usar arte integrado)"
                value={artImageUrl}
                onChange={(e) => setArtImageUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus:border-amber-500 focus:outline-none"
              />
            </div>

            {/* Abilities Section */}
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-amber-400">
                  Habilidades y Efectos ({abilities.length})
                </h3>
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
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-400">
                          Disparador:
                        </span>
                        {type === 'citizen' ? (
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
                              <option value="summon_token">Invocar Ciudadano Token</option>
                              <option value="draw_cards">Levantar Cartas del Mazo</option>
                              <option value="move_zone">Mover Carta entre Zonas (Buscar/Recuperar)</option>
                              <option value="destroy">Destruir / Sacrificar Ciudadano</option>
                              <option value="modify_stat">Modificar Vitalidad (+V / Curar)</option>
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
                            step.op === 'modify_stat') && (
                            <div className="flex items-center gap-3 flex-wrap text-xs">
                              <label className="text-slate-400">
                                Cantidad:
                                <input
                                  type="number"
                                  min={step.op === 'modify_stat' ? -10 : 1}
                                  max={20}
                                  value={step.amount ?? 1}
                                  onChange={(e) =>
                                    updateStep(abIdx, stepIdx, {
                                      ...step,
                                      amount: Number(e.target.value),
                                    })
                                  }
                                  className="ml-1.5 w-16 px-2 py-0.5 rounded bg-slate-950 border border-slate-700 text-white"
                                />
                              </label>
                            </div>
                          )}

                          {step.op === 'summon_token' && (
                            <div className="grid grid-cols-3 gap-2 text-xs">
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
                                  <option value="city">La Ciudad</option>
                                  <option value="road">El Camino</option>
                                  <option value="combat">Zona de Combate</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {(step.op === 'deal_damage' ||
                            step.op === 'destroy' ||
                            step.op === 'modify_stat') && (
                            <div className="grid grid-cols-2 gap-2 text-xs">
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
                                  {type === 'citizen' && (
                                    <option value="self_card">Esta misma carta</option>
                                  )}
                                </select>
                              </div>
                              {step.target?.requirement !== 'self_card' && (
                                <div>
                                  <span className="text-slate-400 block">Controlador objetivo</span>
                                  <select
                                    value={step.target?.owner || 'enemy'}
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
                                    <option value="enemy">Enemigo</option>
                                    <option value="self">Propio (Aliado)</option>
                                    <option value="any">Cualquiera</option>
                                  </select>
                                </div>
                              )}
                            </div>
                          )}

                          {step.op === 'move_zone' && (
                            <div className="grid grid-cols-3 gap-2 text-xs">
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
                                  <option value="discard">Descarte</option>
                                  <option value="exile">Exilio</option>
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
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Texto de Reglas (Opcional — se genera automáticamente si lo dejás vacío)
              </label>
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
                Forjar y Guardar en Armería
              </button>
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
