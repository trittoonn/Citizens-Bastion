import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Layers,
  Plus,
  Settings2,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { CardDefinition, DeckConstraints, DeckPreset } from '../types/game';
import {
  deleteCustomCard,
  deleteDeck,
  getAllCards,
  getAllDecks,
  getDeckConstraints,
  saveCustomCard,
  saveDeck,
  saveDeckConstraints,
  validateDeckLocal,
} from '../services/storage';
import { CardView } from './CardView';
import { CardCreatorModal } from './CardCreatorModal';

export const DeckBuilderView: React.FC = () => {
  const [cards, setCards] = useState<CardDefinition[]>(() => getAllCards());
  const [decks, setDecks] = useState<DeckPreset[]>(() => getAllDecks());
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    () => getAllDecks()[0]?.id || ''
  );
  const [constraints, setConstraints] = useState<DeckConstraints>(() =>
    getDeckConstraints()
  );
  const [showConstraintsPanel, setShowConstraintsPanel] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'citizen' | 'event' | 'custom'>('all');

  const activeDeck = useMemo(
    () => decks.find((d) => d.id === selectedDeckId) || decks[0],
    [decks, selectedDeckId]
  );

  const deckCardCounts = useMemo(() => {
    const map = new Map<string, number>();
    if (!activeDeck) return map;
    for (const c of activeDeck.cards) {
      map.set(c.id, (map.get(c.id) || 0) + 1);
    }
    return map;
  }, [activeDeck]);

  const validation = useMemo(
    () => validateDeckLocal(activeDeck?.cards || [], constraints),
    [activeDeck, constraints]
  );

  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (filterType === 'citizen') return c.type === 'citizen';
      if (filterType === 'event') return c.type === 'event';
      if (filterType === 'custom') return Boolean(c.isCustom);
      return true;
    });
  }, [cards, filterType]);

  const handleAddCardToDeck = (card: CardDefinition) => {
    if (!activeDeck) return;
    const currentCopies = deckCardCounts.get(card.id) || 0;
    if (
      constraints.enforced &&
      constraints.maxCopiesPerCard > 0 &&
      currentCopies >= constraints.maxCopiesPerCard
    ) {
      return;
    }
    if (
      constraints.enforced &&
      constraints.maxCards > 0 &&
      activeDeck.cards.length >= constraints.maxCards
    ) {
      return;
    }
    const updated: DeckPreset = {
      ...activeDeck,
      cards: [...activeDeck.cards, card],
    };
    setDecks(saveDeck(updated));
  };

  const handleRemoveCardFromDeck = (cardId: string) => {
    if (!activeDeck) return;
    const idx = activeDeck.cards.findIndex((c) => c.id === cardId);
    if (idx < 0) return;
    const nextCards = [...activeDeck.cards];
    nextCards.splice(idx, 1);
    const updated: DeckPreset = {
      ...activeDeck,
      cards: nextCards,
    };
    setDecks(saveDeck(updated));
  };

  const handleCreateNewDeck = () => {
    const newId = 'deck_' + Math.random().toString(36).substring(2, 8);
    const newDeck: DeckPreset = {
      id: newId,
      name: `Nuevo Mazo #${decks.length + 1}`,
      description: 'Mazo personalizado guardado en localStorage.',
      cards: [],
    };
    const next = saveDeck(newDeck);
    setDecks(next);
    setSelectedDeckId(newId);
  };

  const handleRenameDeck = (name: string) => {
    if (!activeDeck) return;
    const updated: DeckPreset = { ...activeDeck, name };
    setDecks(saveDeck(updated));
  };

  const handleDeleteCurrentDeck = () => {
    if (!activeDeck) return;
    const next = deleteDeck(activeDeck.id);
    setDecks(next);
    setSelectedDeckId(next[0]?.id || '');
  };

  const handleSaveNewCard = (newCard: CardDefinition) => {
    const nextCards = saveCustomCard(newCard);
    setCards(nextCards);
    setShowCardModal(false);
  };

  const handleDeleteCustomCard = (cardId: string) => {
    const nextCards = deleteCustomCard(cardId);
    setCards(nextCards);
  };

  const updateConstraints = (next: DeckConstraints) => {
    setConstraints(next);
    saveDeckConstraints(next);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 8 Columns: Card Collection & Creator */}
      <div className="lg:col-span-8 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 border border-slate-800 rounded-2xl p-4">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Colección de Cartas ({cards.length})
            </h2>
            <p className="text-xs text-slate-400">
              Hacé clic en cualquier carta para agregarla al mazo activo, o creá cartas nuevas.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCardModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition"
            >
              <Sparkles className="w-4 h-4" />
              Crear Nueva Carta
            </button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'all', label: 'Todas' },
              { id: 'citizen', label: 'Ciudadanos' },
              { id: 'event', label: 'Eventos' },
              { id: 'custom', label: 'Personalizadas (Custom)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                filterType === tab.id
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {filteredCards.map((card) => {
            const countInDeck = deckCardCounts.get(card.id) || 0;
            return (
              <div key={card.id} className="flex justify-center">
                <CardView
                  card={card}
                  badgeCount={countInDeck}
                  onClick={() => handleAddCardToDeck(card)}
                  footerAction={
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCardToDeck(card);
                        }}
                        className="flex-1 py-1 px-2 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold"
                      >
                        + Al Mazo
                      </button>
                      {card.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomCard(card.id);
                          }}
                          title="Eliminar carta personalizada"
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 4 Columns: Active Deck & Optional Constraints */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-4 sticky top-4">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-white">Constructor de Mazos</h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowConstraintsPanel((v) => !v)}
                title="Configurar restricciones opcionales de mazo"
                className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 ${
                  constraints.enforced
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                Reglas
              </button>
              <button
                onClick={handleCreateNewDeck}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo
              </button>
            </div>
          </div>

          {/* Deck Selector */}
          <div className="space-y-2">
            <label className="block text-xs text-slate-400">Mazo seleccionado</label>
            <select
              value={activeDeck?.id || ''}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white font-semibold"
            >
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.cards.length} cartas)
                </option>
              ))}
            </select>

            {activeDeck && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={activeDeck.name}
                  onChange={(e) => handleRenameDeck(e.target.value)}
                  className="flex-1 px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200"
                  placeholder="Nombre del mazo"
                />
                {decks.length > 1 && (
                  <button
                    onClick={handleDeleteCurrentDeck}
                    title="Eliminar este mazo"
                    className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Optional Constraints Drawer */}
          {showConstraintsPanel && (
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200">
                  Forzar restricciones de mazo
                </span>
                <input
                  type="checkbox"
                  checked={constraints.enforced}
                  onChange={(e) =>
                    updateConstraints({ ...constraints, enforced: e.target.checked })
                  }
                  className="accent-amber-500 w-4 h-4"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Por defecto las restricciones están desactivadas para permitir libre experimentación. Podés activarlas aquí o al crear una sala.
              </p>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-slate-400 block">Mín. Cartas</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={constraints.minCards}
                    onChange={(e) =>
                      updateConstraints({
                        ...constraints,
                        minCards: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block">Máx. Cartas</span>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={constraints.maxCards}
                    onChange={(e) =>
                      updateConstraints({
                        ...constraints,
                        maxCards: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block">Máx. Copias</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={constraints.maxCopiesPerCard}
                    onChange={(e) =>
                      updateConstraints({
                        ...constraints,
                        maxCopiesPerCard: Number(e.target.value),
                      })
                    }
                    className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Validation Status */}
          <div className="space-y-1">
            {validation.errors.map((err, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-xs text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2.5 py-1.5 rounded-lg"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
            {validation.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-[11px] text-amber-300/90 bg-amber-950/40 border border-amber-500/30 px-2.5 py-1 rounded-lg"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{w} (No bloqueante)</span>
              </div>
            ))}
            {validation.valid && validation.warnings.length === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1.5 rounded-lg">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Mazo listo ({activeDeck?.cards.length || 0} cartas).</span>
              </div>
            )}
          </div>

          {/* Card List inside Active Deck */}
          <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
            {Array.from(deckCardCounts.entries()).map(([cardId, count]) => {
              const sample = activeDeck?.cards.find((c) => c.id === cardId);
              if (!sample) return null;
              return (
                <div
                  key={cardId}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-slate-800 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-white truncate flex items-center gap-1.5">
                      <span>{sample.name}</span>
                      {sample.type === 'citizen' && (
                        <span className="text-amber-400 font-bold">({sample.vitality}V)</span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 uppercase">
                      {sample.type === 'citizen' ? 'Ciudadano' : 'Evento'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleRemoveCardFromDeck(cardId)}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-rose-500/30 text-slate-200 font-bold"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-bold text-amber-400">
                      {count}
                    </span>
                    <button
                      onClick={() => handleAddCardToDeck(sample)}
                      className="w-6 h-6 rounded bg-slate-800 hover:bg-emerald-500/30 text-slate-200 font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}

            {deckCardCounts.size === 0 && (
              <p className="text-center text-xs text-slate-500 py-8">
                El mazo está vacío. Hacé clic en las cartas de la izquierda para agregarlas.
              </p>
            )}
          </div>
        </div>
      </div>

      {showCardModal && (
        <CardCreatorModal
          onClose={() => setShowCardModal(false)}
          onSave={handleSaveNewCard}
        />
      )}
    </div>
  );
};
