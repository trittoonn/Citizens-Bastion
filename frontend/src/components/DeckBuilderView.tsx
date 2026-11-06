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
import { CardView, renderCardIcon } from './CardView';
import { CardArt } from './CardArt';
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
      name: `Códice #${decks.length + 1}`,
      description: 'Mazo personalizado forjado en el Bastión.',
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
      {/* Left 8 Columns: Card Collection & Forge */}
      <div className="lg:col-span-8 space-y-5">
        <div className="bastion-panel rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-lg font-bold text-[#f3ead8] flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#c59b27]" />
              Armería y Archivo de Cartas ({cards.length})
            </h2>
            <p className="font-serif text-sm text-[#a89b8c]">
              Seleccioná cualquier carta para alistarla en tu mazo activo o forjá nuevas cartas en el estudio.
            </p>
          </div>

          <button
            onClick={() => setShowCardModal(true)}
            className="btn-war-gold px-4 py-2.5 rounded text-xs flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Forjar Nueva Carta
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'all', label: 'Todas las Cartas' },
              { id: 'citizen', label: 'Ciudadanos' },
              { id: 'event', label: 'Eventos' },
              { id: 'custom', label: 'Forjadas (Custom)' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3.5 py-1.5 rounded text-xs transition ${
                filterType === tab.id ? 'btn-war-gold' : 'btn-war-iron'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {filteredCards.map((card) => {
            const countInDeck = deckCardCounts.get(card.id) || 0;
            return (
              <div key={card.id} className="flex justify-center">
                <CardView
                  card={card}
                  size="md"
                  badgeCount={countInDeck}
                  onClick={() => handleAddCardToDeck(card)}
                  footerAction={
                    <div className="flex items-center justify-between gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCardToDeck(card);
                        }}
                        className="btn-war-iron flex-1 py-1 px-2 rounded-sm text-[10px] text-[#e3c158]"
                      >
                        + Alistar al Mazo
                      </button>
                      {card.isCustom && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCustomCard(card.id);
                          }}
                          title="Eliminar carta personalizada"
                          className="p-1 rounded-sm bg-[#3b1614] hover:bg-[#571d1a] border border-[#8c2222] text-[#fca5a5]"
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

      {/* Right 4 Columns: Active Deck & Hearthstone/MTG Arena Card Bars */}
      <div className="lg:col-span-4 space-y-4">
        <div className="bastion-panel rounded-lg p-4 space-y-4 sticky top-20">
          <div className="flex items-center justify-between gap-2 border-b border-[#574c3f] pb-3">
            <h3 className="font-display text-base font-bold text-[#f3ead8]">
              Códice de Mazo
            </h3>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowConstraintsPanel((v) => !v)}
                title="Configurar restricciones opcionales de mazo"
                className={`btn-war-iron px-2.5 py-1 rounded text-[11px] flex items-center gap-1 ${
                  constraints.enforced ? 'border-[#c59b27] text-[#e3c158]' : ''
                }`}
              >
                <Settings2 className="w-3.5 h-3.5" />
                Límites
              </button>
              <button
                onClick={handleCreateNewDeck}
                className="btn-war-gold px-2.5 py-1 rounded text-[11px] flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo
              </button>
            </div>
          </div>

          {/* Deck Selector */}
          <div className="space-y-2">
            <select
              value={activeDeck?.id || ''}
              onChange={(e) => setSelectedDeckId(e.target.value)}
              className="w-full px-3 py-2 rounded bg-[#14110e] border border-[#574c3f] font-display text-xs font-bold text-[#e3c158] focus:border-[#c59b27] focus:outline-none"
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
                  className="flex-1 px-2.5 py-1.5 rounded bg-[#14110e] border border-[#463c32] font-display text-xs text-[#e7dfd3] focus:border-[#c59b27] focus:outline-none"
                  placeholder="Nombre del mazo"
                />
                {decks.length > 1 && (
                  <button
                    onClick={handleDeleteCurrentDeck}
                    title="Eliminar este mazo"
                    className="p-1.5 rounded bg-[#3b1614] hover:bg-[#571d1a] border border-[#8c2222] text-[#fca5a5]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Optional Constraints Drawer */}
          {showConstraintsPanel && (
            <div className="p-3 rounded bg-[#14110e] border border-[#574c3f] space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-display font-bold text-[#e3c158] text-[11px]">
                  Exigir límites de construcción
                </span>
                <input
                  type="checkbox"
                  checked={constraints.enforced}
                  onChange={(e) =>
                    updateConstraints({ ...constraints, enforced: e.target.checked })
                  }
                  className="accent-[#c59b27] w-4 h-4"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[#a89b8c] text-[10px] block">Mín. Cartas</span>
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
                    className="w-full px-2 py-1 rounded bg-[#1f1a16] border border-[#574c3f] text-[#e7dfd3]"
                  />
                </div>
                <div>
                  <span className="text-[#a89b8c] text-[10px] block">Máx. Cartas</span>
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
                    className="w-full px-2 py-1 rounded bg-[#1f1a16] border border-[#574c3f] text-[#e7dfd3]"
                  />
                </div>
                <div>
                  <span className="text-[#a89b8c] text-[10px] block">Máx. Copias</span>
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
                    className="w-full px-2 py-1 rounded bg-[#1f1a16] border border-[#574c3f] text-[#e7dfd3]"
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
                className="flex items-center gap-1.5 text-xs text-[#fecaca] bg-[#3b1614] border border-[#8c2222] px-2.5 py-1.5 rounded"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{err}</span>
              </div>
            ))}
            {validation.warnings.map((w, i) => (
              <div
                key={i}
                className="flex items-center gap-1.5 text-[11px] text-[#e3c158] bg-[#261e12] border border-[#8a6d1b]/60 px-2.5 py-1 rounded"
              >
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{w} (Opcional)</span>
              </div>
            ))}
            {validation.valid && validation.warnings.length === 0 && (
              <div className="flex items-center gap-1.5 text-xs text-[#bbf7d0] bg-[#14291a] border border-[#2e6f40] px-2.5 py-1.5 rounded font-display">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Mazo Completo ({activeDeck?.cards.length || 0} cartas)</span>
              </div>
            )}
          </div>

          {/* HEARTHSTONE / MTG ARENA COMPACT CARD BARS */}
          <div className="space-y-1.5 max-h-[54vh] overflow-y-auto pr-1">
            {Array.from(deckCardCounts.entries()).map(([cardId, count]) => {
              const sample = activeDeck?.cards.find((c) => c.id === cardId);
              if (!sample) return null;
              const isCitizen = sample.type === 'citizen';

              return (
                <div
                  key={cardId}
                  className="group relative flex items-center justify-between rounded overflow-hidden bg-[#16120f] border border-[#574c3f] hover:border-[#c59b27] transition h-11 shadow-md"
                >
                  {/* Left: Mini Cropped Artwork + Faction Color Accent */}
                  <div className="relative w-20 h-full shrink-0 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 w-1 z-20"
                      style={{
                        backgroundColor:
                          sample.artColor || (isCitizen ? '#c59b27' : '#7c3aed'),
                      }}
                    />
                    <CardArt card={sample} className="w-full h-full opacity-85" />
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#16120f]/60 to-[#16120f]" />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 text-[#f3ead8] drop-shadow">
                      {renderCardIcon(sample.artIcon, 'w-3.5 h-3.5')}
                    </div>
                  </div>

                  {/* Center: Card Name in Epic Serif Font */}
                  <div className="flex-1 min-w-0 px-1.5">
                    <div
                      className="font-display font-bold text-xs text-[#f3ead8] truncate"
                      title={sample.name}
                    >
                      {sample.name}
                    </div>
                    <div className="text-[9px] font-display uppercase tracking-wider text-[#a89b8c]">
                      {isCitizen ? 'Ciudadano' : 'Evento'}
                    </div>
                  </div>

                  {/* Right: Prominent Vitality Shield Badge + Quantity (x2, x3) & +/- Controls */}
                  <div className="flex items-center gap-1.5 pr-2 shrink-0">
                    {isCitizen ? (
                      <span
                        title={`Vitalidad: ${sample.vitality}V`}
                        className="px-1.5 py-0.5 rounded-sm bg-gradient-to-b from-[#d8b13a] to-[#8a6d1b] border border-[#fef08a]/60 font-display font-black text-[11px] text-[#14100c] shadow"
                      >
                        {sample.vitality}V
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded-sm bg-[#2b2438] border border-[#818cf8]/50 font-display font-bold text-[9px] text-[#c7d2fe]">
                        DEC
                      </span>
                    )}

                    {/* Quantity Badge (x2, x3) */}
                    <span className="px-2 py-0.5 rounded-sm bg-[#26211d] border border-[#c59b27]/60 font-display font-black text-xs text-[#e3c158] min-w-[28px] text-center">
                      x{count}
                    </span>

                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleAddCardToDeck(sample)}
                        title="Agregar copia"
                        className="w-5 h-4 rounded-sm bg-[#2b2520] hover:bg-[#c59b27] hover:text-[#12100e] text-[#e7dfd3] border border-[#574c3f] font-bold text-[10px] leading-none flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        onClick={() => handleRemoveCardFromDeck(cardId)}
                        title="Quitar copia"
                        className="w-5 h-4 rounded-sm bg-[#2b2520] hover:bg-[#8c2222] text-[#e7dfd3] border border-[#574c3f] font-bold text-[10px] leading-none flex items-center justify-center"
                      >
                        -
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {deckCardCounts.size === 0 && (
              <p className="text-center font-serif text-sm text-[#8c7e70] py-8">
                El códice está vacío. Seleccioná cartas de la armería para alistarlas.
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
