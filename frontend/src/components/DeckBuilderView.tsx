import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileCode2,
  Layers,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Settings2,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  CardDefinition,
  CardLayoutConfig,
  DeckConstraints,
  DeckPreset,
  resolveCardPlanetColor,
} from '../types/game';
import {
  DEFAULT_CARD_LAYOUT_CONFIG,
  deleteDeck,
  exportCardToCode,
  exportCardsToCode,
  exportCollectionToCode,
  exportDeckToCode,
  getAllCards,
  getAllDecks,
  getCardLayoutConfig,
  getDeckConstraints,
  ImportCollectionMode,
  importShareCode,
  parseShareCode,
  permanentlyDeleteCard,
  resetCollectionToDefaults,
  saveCardLayoutConfig,
  saveCustomCard,
  saveDeck,
  saveDeckConstraints,
  validateDeckLocal,
} from '../services/storage';
import { CardView, renderCardIcon } from './CardView';
import { CardArt } from './CardArt';
import { CardCreatorModal } from './CardCreatorModal';
import { DeckPrintModal } from './DeckPrintModal';

export const DeckBuilderView: React.FC = () => {
  const [cards, setCards] = useState<CardDefinition[]>(() => getAllCards());
  const [decks, setDecks] = useState<DeckPreset[]>(() => getAllDecks());
  const [selectedDeckId, setSelectedDeckId] = useState<string>(
    () => getAllDecks()[0]?.id || ''
  );
  const [constraints, setConstraints] = useState<DeckConstraints>(() =>
    getDeckConstraints()
  );
  const [layoutConfig, setLayoutConfig] = useState<CardLayoutConfig>(() =>
    getCardLayoutConfig()
  );
  const [showLayoutPanel, setShowLayoutPanel] = useState(false);
  const [showConstraintsPanel, setShowConstraintsPanel] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [editingCard, setEditingCard] = useState<CardDefinition | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [filterType, setFilterType] = useState<
    'all' | 'citizen' | 'tool' | 'event' | 'custom'
  >('all');

  // Share Code (Export / Import) Studio State
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareTab, setShareTab] = useState<'import' | 'export'>('import');
  const [exportScope, setExportScope] = useState<
    'collection' | 'all_cards' | 'custom_cards' | 'active_deck' | 'single_card'
  >('collection');
  const [exportSingleCardId, setExportSingleCardId] = useState<string>(
    () => getAllCards()[0]?.id || ''
  );
  const [importText, setImportText] = useState('');
  const [importMode, setImportMode] = useState<ImportCollectionMode>('extend');
  const [shareFeedback, setShareFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = async (text: string, tag: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback if clipboard API is restricted
    }
    setCopiedId(tag);
    setTimeout(() => {
      setCopiedId((prev) => (prev === tag ? null : prev));
    }, 1800);
  };

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
      if (filterType === 'tool') return c.type === 'tool';
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
    if (next.length === 0) {
      const fallbackDeck: DeckPreset = {
        id: 'deck_' + Math.random().toString(36).substring(2, 8),
        name: 'Códice #1',
        description: 'Mazo personalizado forjado en el Bastión.',
        cards: [],
      };
      const withFallback = saveDeck(fallbackDeck);
      setDecks(withFallback);
      setSelectedDeckId(fallbackDeck.id);
      return;
    }
    setDecks(next);
    setSelectedDeckId(next[0]?.id || '');
  };

  const handleSaveNewCard = (newCard: CardDefinition) => {
    const nextCards = saveCustomCard(newCard);
    setCards(nextCards);
    setDecks(getAllDecks());
    setShowCardModal(false);
    setEditingCard(null);
  };

  const handlePermanentlyDeleteCard = (cardId: string) => {
    const nextCards = permanentlyDeleteCard(cardId);
    setCards(nextCards);
    setDecks(getAllDecks());
  };

  const updateLayoutConfig = (next: CardLayoutConfig) => {
    setLayoutConfig(next);
    saveCardLayoutConfig(next);
  };

  const handleResetLayoutConfig = () => {
    setLayoutConfig(DEFAULT_CARD_LAYOUT_CONFIG);
    saveCardLayoutConfig(DEFAULT_CARD_LAYOUT_CONFIG);
  };

  const updateConstraints = (next: DeckConstraints) => {
    setConstraints(next);
    saveDeckConstraints(next);
  };

  // Generated Export Code for the Export tab
  const generatedExportCode = useMemo(() => {
    switch (exportScope) {
      case 'collection':
        return exportCollectionToCode(cards, decks);
      case 'all_cards':
        return exportCardsToCode(cards);
      case 'custom_cards': {
        const customOnly = cards.filter((c) => c.isCustom);
        return customOnly.length > 0
          ? exportCardsToCode(customOnly)
          : '// No tenés cartas forjadas (custom) todavía.';
      }
      case 'active_deck':
        return activeDeck ? exportDeckToCode(activeDeck) : '';
      case 'single_card': {
        const target = cards.find((c) => c.id === exportSingleCardId) || cards[0];
        return target ? exportCardToCode(target) : '';
      }
    }
  }, [exportScope, cards, decks, activeDeck, exportSingleCardId]);

  // Live preview of pasted import code
  const importPreview = useMemo(() => {
    if (!importText.trim()) return null;
    try {
      const parsed = parseShareCode(importText);
      return { ok: true as const, parsed };
    } catch (err: any) {
      return {
        ok: false as const,
        error: err.message || 'Código inválido',
      };
    }
  }, [importText]);

  const handleExecuteImport = () => {
    setShareFeedback(null);
    try {
      const res = importShareCode(importText, importMode);
      setCards(res.cards);
      setDecks(res.decks);
      if (res.activeDeckId) {
        setSelectedDeckId(res.activeDeckId);
      } else if (res.decks.length > 0) {
        setSelectedDeckId(res.decks[0].id);
      }

      const modeLabel =
        res.mode === 'overwrite'
          ? 'Sobreescribir Colección'
          : 'Extender Colección';
      const deckMsg =
        res.importedDecks > 0 ? ` y ${res.importedDecks} mazo(s)` : '';
      const skippedMsg =
        res.skippedCards > 0
          ? ` (${res.skippedCards} ya existían y se conservaron)`
          : '';

      setShareFeedback({
        type: 'success',
        message: `¡Importación exitosa (${modeLabel})! Se cargaron ${res.addedCards} carta(s)${deckMsg}${skippedMsg}. Total en colección: ${res.totalCards} cartas.`,
      });
      setImportText('');
    } catch (err: any) {
      setShareFeedback({
        type: 'error',
        message: err.message || 'No se pudo importar el código.',
      });
    }
  };

  const handleResetToDefaults = () => {
    const res = resetCollectionToDefaults();
    setCards(res.cards);
    setDecks(res.decks);
    setSelectedDeckId(res.decks[0]?.id || '');
    setShareFeedback({
      type: 'success',
      message:
        'Se restauró la colección original del Bastión (10 cartas canónicas y 2 mazos base).',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Left 8 Columns: Card Collection & Forge */}
      <div className="no-print lg:col-span-8 space-y-5">
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

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setShowLayoutPanel((v) => !v)}
              className={`px-3.5 py-2.5 rounded text-xs flex items-center gap-1.5 transition ${
                showLayoutPanel ? 'btn-war-gold' : 'btn-war-iron border-[#c59b27]/70 text-[#f3d46b]'
              }`}
            >
              <Sliders className="w-4 h-4" />
              Formato y Dimensiones
            </button>

            <button
              type="button"
              onClick={handleResetToDefaults}
              title="Restaurar todas las cartas y mazos base eliminados o editados"
              className="btn-war-iron px-3 py-2.5 rounded text-xs flex items-center gap-1.5 text-[#d6c7b8]"
            >
              <RotateCcw className="w-4 h-4 text-[#f3d46b]" />
              Restaurar Base
            </button>

            <button
              onClick={() => {
                setShareFeedback(null);
                setShareTab('import');
                setShowShareModal(true);
              }}
              className="btn-war-iron px-3.5 py-2.5 rounded text-xs flex items-center gap-1.5 border-[#c59b27]/70 text-[#f3d46b]"
            >
              <FileCode2 className="w-4 h-4 text-[#f3d46b]" />
              Importar / Exportar Códigos
            </button>

            <button
              onClick={() => {
                setEditingCard(null);
                setShowCardModal(true);
              }}
              className="btn-war-gold px-4 py-2.5 rounded text-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" />
              Forjar Nueva Carta
            </button>
          </div>
        </div>

        {/* ===================================================================
            CARD DIMENSIONS & TEXT/IMAGE FORMATTING STUDIO PANEL
           =================================================================== */}
        {showLayoutPanel && (
          <div className="bastion-panel rounded-lg p-5 space-y-4 border-2 border-[#c59b27]/80">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#574c3f] pb-3">
              <div>
                <h3 className="font-display text-sm font-bold text-[#f3d46b] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#f3d46b]" />
                  Dimensiones y Formato de Cartas (Texto e Imágenes)
                </h3>
                <p className="font-serif text-xs text-[#a89b8c]">
                  Ajustá las dimensiones de las cartas, la proporción y encuadre de la ilustración y la tipografía y alineación del texto de reglas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetLayoutConfig}
                className="btn-war-iron px-3 py-1.5 rounded text-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#f3d46b]" />
                Restaurar Formato Original
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              {/* 1. Card Width */}
              <div className="p-3 rounded bg-[#14110e] border border-[#463c32] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-[#e3c158]">
                    Ancho de Carta
                  </span>
                  <span className="font-mono text-[#f3ead8]">
                    {layoutConfig.cardWidthPx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={160}
                  max={280}
                  step={4}
                  value={layoutConfig.cardWidthPx}
                  onChange={(e) =>
                    updateLayoutConfig({
                      ...layoutConfig,
                      cardWidthPx: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#c59b27]"
                />
              </div>

              {/* 2. Card Height */}
              <div className="p-3 rounded bg-[#14110e] border border-[#463c32] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-[#e3c158]">
                    Alto de Carta
                  </span>
                  <span className="font-mono text-[#f3ead8]">
                    {layoutConfig.cardHeightPx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={230}
                  max={400}
                  step={4}
                  value={layoutConfig.cardHeightPx}
                  onChange={(e) =>
                    updateLayoutConfig({
                      ...layoutConfig,
                      cardHeightPx: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#c59b27]"
                />
              </div>

              {/* 3. Art Height Proportion */}
              <div className="p-3 rounded bg-[#14110e] border border-[#463c32] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-[#e3c158]">
                    Altura de Imagen (%)
                  </span>
                  <span className="font-mono text-[#f3ead8]">
                    {layoutConfig.artHeightPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min={28}
                  max={62}
                  step={2}
                  value={layoutConfig.artHeightPct}
                  onChange={(e) =>
                    updateLayoutConfig({
                      ...layoutConfig,
                      artHeightPct: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#c59b27]"
                />
              </div>

              {/* 4. Image Fit Mode */}
              <div className="p-3 rounded bg-[#14110e] border border-[#463c32] space-y-1.5">
                <span className="font-display font-bold text-[#e3c158] block">
                  Formato de Imagen
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'cover', label: 'Cubrir' },
                      { id: 'contain', label: 'Contener' },
                      { id: 'fill', label: 'Estirar' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updateLayoutConfig({ ...layoutConfig, imageFit: opt.id })
                      }
                      className={`py-1 rounded font-display text-[10px] font-bold border transition ${
                        layoutConfig.imageFit === opt.id
                          ? 'bg-[#2b2216] border-[#c59b27] text-[#fef08a]'
                          : 'bg-[#1f1a16] border-[#463c32] text-[#a89b8c]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 5. Title Font Size */}
              <div className="p-3 rounded bg-[#14110e] border border-[#463c32] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-[#e3c158]">
                    Tamaño Título
                  </span>
                  <span className="font-mono text-[#f3ead8]">
                    {layoutConfig.titleFontSizePx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={9}
                  max={16}
                  step={1}
                  value={layoutConfig.titleFontSizePx}
                  onChange={(e) =>
                    updateLayoutConfig({
                      ...layoutConfig,
                      titleFontSizePx: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#c59b27]"
                />
              </div>

              {/* 6. Body Text Font Size */}
              <div className="p-3 rounded bg-[#14110e] border border-[#463c32] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-[#e3c158]">
                    Tamaño Texto Reglas
                  </span>
                  <span className="font-mono text-[#f3ead8]">
                    {layoutConfig.bodyFontSizePx}px
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={14}
                  step={0.5}
                  value={layoutConfig.bodyFontSizePx}
                  onChange={(e) =>
                    updateLayoutConfig({
                      ...layoutConfig,
                      bodyFontSizePx: Number(e.target.value),
                    })
                  }
                  className="w-full accent-[#c59b27]"
                />
              </div>

              {/* 7. Body Text Alignment */}
              <div className="p-3 rounded bg-[#14110e] border border-[#463c32] space-y-1.5">
                <span className="font-display font-bold text-[#e3c158] block">
                  Alineación del Texto
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'left', label: 'Izq.' },
                      { id: 'center', label: 'Centro' },
                      { id: 'justify', label: 'Justif.' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updateLayoutConfig({
                          ...layoutConfig,
                          bodyTextAlign: opt.id,
                        })
                      }
                      className={`py-1 rounded font-display text-[10px] font-bold border transition ${
                        layoutConfig.bodyTextAlign === opt.id
                          ? 'bg-[#2b2216] border-[#c59b27] text-[#fef08a]'
                          : 'bg-[#1f1a16] border-[#463c32] text-[#a89b8c]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 8. Body Font Family */}
              <div className="p-3 rounded bg-[#14110e] border border-[#463c32] space-y-1.5">
                <span className="font-display font-bold text-[#e3c158] block">
                  Tipografía del Texto
                </span>
                <div className="grid grid-cols-3 gap-1">
                  {(
                    [
                      { id: 'serif', label: 'Serif' },
                      { id: 'sans', label: 'Sans' },
                      { id: 'mono', label: 'Mono' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() =>
                        updateLayoutConfig({
                          ...layoutConfig,
                          bodyFontFamily: opt.id,
                        })
                      }
                      className={`py-1 rounded font-display text-[10px] font-bold border transition ${
                        layoutConfig.bodyFontFamily === opt.id
                          ? 'bg-[#2b2216] border-[#c59b27] text-[#fef08a]'
                          : 'bg-[#1f1a16] border-[#463c32] text-[#a89b8c]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {(
            [
              { id: 'all', label: 'Todas las Cartas' },
              { id: 'citizen', label: 'Ciudadanos' },
              { id: 'tool', label: 'Herramientas' },
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
                  layoutOverride={layoutConfig}
                  badgeCount={countInDeck}
                  onClick={() => handleAddCardToDeck(card)}
                  footerAction={
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddCardToDeck(card);
                        }}
                        className="btn-war-iron flex-1 py-1 px-1.5 rounded-sm text-[10px] text-[#e3c158]"
                      >
                        + Alistar
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingCard(card);
                          setShowCardModal(true);
                        }}
                        title="Editar esta carta (estadísticas, habilidades o ilustración)"
                        className="px-1.5 py-1 rounded-sm bg-[#1f1a15] hover:bg-[#2e261d] border border-[#c59b27]/70 text-[9px] font-display font-bold text-[#f3d46b] flex items-center gap-0.5"
                      >
                        <Pencil className="w-3 h-3 text-[#f3d46b]" />
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const code = exportCardToCode(card);
                          copyToClipboard(code, `card_${card.id}`);
                        }}
                        title="Copiar código serializado de esta carta al portapapeles"
                        className="px-1.5 py-1 rounded-sm bg-[#1f1a15] hover:bg-[#2e261d] border border-[#6b5a48] text-[9px] font-display font-bold text-[#d6c7b8] flex items-center gap-0.5"
                      >
                        {copiedId === `card_${card.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-[#4ade80]" />
                            <span className="text-[#86efac]">Copiado</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-[#f3d46b]" />
                            <span>Código</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePermanentlyDeleteCard(card.id);
                        }}
                        title="Borrar permanentemente esta carta de tu colección y mazos"
                        className="p-1 rounded-sm bg-[#3b1614] hover:bg-[#571d1a] border border-[#8c2222] text-[#fca5a5]"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  }
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Right 4 Columns: Active Deck & Hearthstone/MTG Arena Card Bars */}
      <div className="no-print lg:col-span-4 space-y-4">
        <div className="bastion-panel rounded-lg p-4 space-y-4 sticky top-20">
          <div className="flex items-center justify-between gap-2 border-b border-[#574c3f] pb-3">
            <h3 className="font-display text-base font-bold text-[#f3ead8]">
              Códice de Mazo
            </h3>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {activeDeck && (
                <>
                  <button
                    type="button"
                    onClick={() => setShowPrintModal(true)}
                    title="Exportar todas las instancias de este mazo como PDF listo para imprimir"
                    className="btn-war-iron border-[#c59b27]/80 px-2 py-1 rounded text-[10px] text-[#f3d46b] flex items-center gap-1"
                  >
                    <Printer className="w-3 h-3 text-[#f3d46b]" />
                    <span>PDF / Imprimir</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const code = exportDeckToCode(activeDeck);
                      copyToClipboard(code, 'active_deck_quick');
                    }}
                    title="Copiar código serializado de este mazo (incluye sus cartas)"
                    className="btn-war-iron px-2 py-1 rounded text-[10px] flex items-center gap-1"
                  >
                    {copiedId === 'active_deck_quick' ? (
                      <>
                        <Check className="w-3 h-3 text-[#4ade80]" />
                        <span className="text-[#86efac]">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-[#f3d46b]" />
                        <span>Código Mazo</span>
                      </>
                    )}
                  </button>
                </>
              )}
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
                <button
                  onClick={handleDeleteCurrentDeck}
                  title="Borrar permanentemente este mazo"
                  className="p-1.5 rounded bg-[#3b1614] hover:bg-[#571d1a] border border-[#8c2222] text-[#fca5a5]"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
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
              const isTool = sample.type === 'tool';
              const planetColor = resolveCardPlanetColor(sample);

              return (
                <div
                  key={cardId}
                  className="group relative flex items-center justify-between rounded overflow-hidden bg-[#16120f] border border-[#574c3f] hover:border-[#c59b27] transition h-11 shadow-md"
                >
                  {/* Left: Mini Cropped Artwork + Planet/Border Color Accent */}
                  <div className="relative w-20 h-full shrink-0 overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 w-1 z-20"
                      style={{
                        backgroundColor: planetColor,
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
                    <div className="text-[9px] font-display uppercase tracking-wider text-[#a89b8c] truncate">
                      {isCitizen
                        ? `Ciudadano${sample.subtype ? ` • ${sample.subtype}` : ''}`
                        : isTool
                        ? `Herramienta${sample.subtype ? ` • ${sample.subtype}` : sample.isLocation ? ' • Locación' : ''}`
                        : `Evento${sample.subtype ? ` • ${sample.subtype}` : ''}`}
                    </div>
                  </div>

                  {/* Right: Prominent Vitality/Armor Shield Badge + Quantity (x2, x3) & +/- Controls */}
                  <div className="flex items-center gap-1 pr-2 shrink-0">
                    {isCitizen ? (
                      <>
                        <span
                          title={`Vitalidad: ${sample.vitality}V`}
                          className="px-1.5 py-0.5 rounded-sm bg-gradient-to-b from-[#d8b13a] to-[#8a6d1b] border border-[#fef08a]/60 font-display font-black text-[10px] text-[#14100c] shadow"
                        >
                          {sample.vitality}V
                        </span>
                        {(sample.armor || 0) > 0 && (
                          <span
                            title={`Armadura: ${sample.armor}A`}
                            className="px-1 py-0.5 rounded-sm bg-gradient-to-b from-[#94a3b8] to-[#334155] border border-[#e2e8f0]/60 font-display font-black text-[10px] text-[#f8fafc] shadow"
                          >
                            {sample.armor}A
                          </span>
                        )}
                      </>
                    ) : isTool ? (
                      <span
                        title={`Armadura: ${sample.armor ?? sample.vitality ?? 1}A`}
                        className="px-1.5 py-0.5 rounded-sm bg-gradient-to-b from-[#94a3b8] to-[#334155] border border-[#e2e8f0]/60 font-display font-black text-[10px] text-[#f8fafc] shadow"
                      >
                        {sample.armor ?? sample.vitality ?? 1}A
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
          initialCard={editingCard}
          onClose={() => {
            setShowCardModal(false);
            setEditingCard(null);
          }}
          onSave={handleSaveNewCard}
        />
      )}

      {showPrintModal && activeDeck && (
        <DeckPrintModal
          deck={activeDeck}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {/* =====================================================================
          SHARE CODE STUDIO MODAL (EXPORT & IMPORT CARDS, DECKS & COLLECTIONS)
         ===================================================================== */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0d0b09]/85 backdrop-blur-sm p-4">
          <div className="bastion-panel rounded-lg max-w-3xl w-full overflow-hidden border-2 border-[#c59b27] shadow-[0_24px_60px_rgba(0,0,0,0.95)] flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bastion-panel-header px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCode2 className="w-5 h-5 text-[#f3d46b]" />
                <div>
                  <h3 className="font-display text-base font-bold text-[#f3ead8]">
                    Códice de Intercambio — Importar y Exportar por Texto
                  </h3>
                  <p className="font-serif text-xs text-[#a89b8c]">
                    Compartí cartas individuales, mazos completos o colecciones enteras con códigos autónomos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShareModal(false)}
                className="p-1.5 rounded bg-[#14110e] hover:bg-[#2b2216] border border-[#574c3f] text-[#d6c7b8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Tabs: Importar vs Exportar */}
            <div className="px-6 pt-4 flex items-center justify-between gap-2 border-b border-[#463c32] pb-3 bg-[#16120f]">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShareTab('import');
                    setShareFeedback(null);
                  }}
                  className={`px-4 py-2 rounded text-xs font-display font-bold flex items-center gap-1.5 transition ${
                    shareTab === 'import' ? 'btn-war-gold' : 'btn-war-iron'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  Importar Códigos
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareTab('export');
                    setShareFeedback(null);
                  }}
                  className={`px-4 py-2 rounded text-xs font-display font-bold flex items-center gap-1.5 transition ${
                    shareTab === 'export' ? 'btn-war-gold' : 'btn-war-iron'
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Exportar a Texto
                </button>
              </div>

              <button
                type="button"
                onClick={handleResetToDefaults}
                title="Restaurar las 10 cartas canónicas y los 2 mazos base"
                className="btn-war-iron px-3 py-1.5 rounded text-[10px] flex items-center gap-1 text-[#d6c7b8]"
              >
                <RotateCcw className="w-3.5 h-3.5 text-[#f3d46b]" />
                Restaurar Base Original
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {shareFeedback && (
                <div
                  className={`p-3.5 rounded border font-serif text-sm flex items-center justify-between gap-3 ${
                    shareFeedback.type === 'success'
                      ? 'bg-[#14291a] border-[#2e6f40] text-[#bbf7d0]'
                      : 'bg-[#3b1614] border-[#8c2222] text-[#fecaca]'
                  }`}
                >
                  <span>{shareFeedback.message}</span>
                  <button
                    type="button"
                    onClick={() => setShareFeedback(null)}
                    className="text-xs underline shrink-0"
                  >
                    Cerrar
                  </button>
                </div>
              )}

              {shareTab === 'import' ? (
                <div className="space-y-4">
                  {/* Collection Mode Selector: Extender vs Sobreescribir */}
                  <div className="space-y-2">
                    <label className="block font-display text-xs font-bold uppercase tracking-wider text-[#f3d46b]">
                      1. Modo de Importación en tu Colección
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setImportMode('extend')}
                        className={`text-left p-3 rounded border transition ${
                          importMode === 'extend'
                            ? 'bg-[#2b2216] border-[#c59b27] text-[#f3ead8] shadow-[inset_0_0_16px_rgba(197,155,39,0.25)]'
                            : 'bg-[#14110e] border-[#3a322a] text-[#a89b8c] hover:border-[#6b5a48]'
                        }`}
                      >
                        <div className="font-display text-xs font-bold text-[#f3d46b]">
                          ➕ Extender Colección
                        </div>
                        <p className="font-serif text-xs text-[#d6c7b8] mt-1 leading-snug">
                          Conserva tus cartas actuales y agrega todas las cartas pegadas que aún no existan en tu colección.
                        </p>
                      </button>

                      <button
                        type="button"
                        onClick={() => setImportMode('overwrite')}
                        className={`text-left p-3 rounded border transition ${
                          importMode === 'overwrite'
                            ? 'bg-[#361915] border-[#f87171] text-[#f3ead8] shadow-[inset_0_0_16px_rgba(239,68,68,0.25)]'
                            : 'bg-[#14110e] border-[#3a322a] text-[#a89b8c] hover:border-[#6b5a48]'
                        }`}
                      >
                        <div className="font-display text-xs font-bold text-[#fca5a5]">
                          🔄 Sobreescribir Colección
                        </div>
                        <p className="font-serif text-xs text-[#d6c7b8] mt-1 leading-snug">
                          Borra las cartas anteriores de tu colección y deja únicamente las nuevas cartas importadas.
                        </p>
                      </button>
                    </div>
                  </div>

                  {/* Textarea for pasting codes */}
                  <div className="space-y-1.5">
                    <label className="block font-display text-xs font-bold uppercase tracking-wider text-[#f3d46b]">
                      2. Pegá el Código de Carta(s), Mazo o Colección
                    </label>
                    <textarea
                      rows={5}
                      value={importText}
                      onChange={(e) => setImportText(e.target.value)}
                      placeholder={
                        'Pegá aquí uno o varios códigos:\nCB1-CARD:...\nCB1-CARD:...\no un código de mazo (CB1-DECK:...) o colección completa (CB1-COLL:...)'
                      }
                      className="w-full p-3 rounded bg-[#120f0d] border border-[#574c3f] font-mono text-xs text-[#f3ead8] focus:border-[#c59b27] focus:outline-none shadow-inner"
                    />
                  </div>

                  {/* Live Preview of Pasted Content */}
                  {importPreview && (
                    <div
                      className={`p-3 rounded border text-xs ${
                        importPreview.ok
                          ? 'bg-[#171310] border-[#6b5a48] text-[#e7dfd3]'
                          : 'bg-[#2b1412] border-[#8c2222] text-[#fecaca]'
                      }`}
                    >
                      {importPreview.ok ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between font-display font-bold text-[#f3d46b]">
                            <span>
                              ✓ Código válido detectado:{' '}
                              {importPreview.parsed.cards.length} carta(s)
                              {importPreview.parsed.decks.length > 0
                                ? ` y ${importPreview.parsed.decks.length} mazo(s)`
                                : ''}
                            </span>
                            <span className="uppercase text-[10px] px-2 py-0.5 rounded bg-[#2b2216] border border-[#c59b27]/50">
                              {importPreview.parsed.kind}
                            </span>
                          </div>
                          {importPreview.parsed.cards.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pt-1">
                              {importPreview.parsed.cards.map((c) => (
                                <span
                                  key={c.id}
                                  className="px-2 py-0.5 rounded bg-[#241e18] border border-[#574c3f] font-serif text-[11px] text-[#f3ead8]"
                                >
                                  {c.name}{' '}
                                  {c.type === 'citizen' ? `(${c.vitality}V)` : '(Efecto)'}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span>⚠️ {importPreview.error}</span>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowShareModal(false)}
                      className="btn-war-iron px-4 py-2 rounded text-xs"
                    >
                      Cerrar
                    </button>
                    <button
                      type="button"
                      disabled={!importPreview || !importPreview.ok}
                      onClick={handleExecuteImport}
                      className="btn-war-gold px-5 py-2 rounded text-xs flex items-center gap-1.5"
                    >
                      <Download className="w-4 h-4" />
                      {importMode === 'overwrite'
                        ? 'Sobreescribir e Importar Ahora'
                        : 'Extender Colección Ahora'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Scope Selector for Export */}
                  <div className="space-y-2">
                    <label className="block font-display text-xs font-bold uppercase tracking-wider text-[#f3d46b]">
                      1. ¿Qué deseás exportar a código de texto?
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(
                        [
                          {
                            id: 'collection',
                            label: `Colección Entera (${cards.length} cartas, ${decks.length} mazos)`,
                          },
                          {
                            id: 'all_cards',
                            label: `Todas las Cartas (${cards.length} líneas)`,
                          },
                          {
                            id: 'custom_cards',
                            label: `Solo Cartas Forjadas (${
                              cards.filter((c) => c.isCustom).length
                            })`,
                          },
                          {
                            id: 'active_deck',
                            label: `Mazo Activo (${activeDeck?.name || 'Mazo'})`,
                          },
                          {
                            id: 'single_card',
                            label: 'Una Carta Específica',
                          },
                        ] as const
                      ).map((opt) => (
                        <button
                          type="button"
                          key={opt.id}
                          onClick={() => setExportScope(opt.id)}
                          className={`p-2.5 rounded border text-left font-display text-[11px] font-bold transition ${
                            exportScope === opt.id
                              ? 'bg-[#2b2216] border-[#c59b27] text-[#fef08a] shadow-[inset_0_0_12px_rgba(197,155,39,0.25)]'
                              : 'bg-[#14110e] border-[#3a322a] text-[#a89b8c] hover:border-[#6b5a48]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {exportScope === 'single_card' && (
                    <div>
                      <label className="block font-display text-xs font-bold text-[#d6c7b8] mb-1">
                        Seleccioná la carta a serializar:
                      </label>
                      <select
                        value={exportSingleCardId}
                        onChange={(e) => setExportSingleCardId(e.target.value)}
                        className="w-full px-3 py-2 rounded bg-[#14110e] border border-[#574c3f] font-display text-xs font-bold text-[#f3d46b]"
                      >
                        {cards.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.type === 'citizen' ? `${c.vitality}V` : 'Evento'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="font-display text-xs font-bold uppercase tracking-wider text-[#f3d46b]">
                        2. Código de Texto Serializado
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(generatedExportCode, 'modal_export')
                        }
                        className="btn-war-gold px-3.5 py-1 rounded text-xs flex items-center gap-1.5"
                      >
                        {copiedId === 'modal_export' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            ¡Código Copiado!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copiar Código
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      readOnly
                      rows={6}
                      value={generatedExportCode}
                      onFocus={(e) => e.currentTarget.select()}
                      className="w-full p-3 rounded bg-[#120f0d] border border-[#574c3f] font-mono text-xs text-[#fde68a] focus:border-[#c59b27] focus:outline-none shadow-inner"
                    />
                    <p className="font-serif text-xs text-[#a89b8c]">
                      Este código contiene toda la definición de las cartas (estadísticas, habilidades, triggers e iconos) para que cualquier otro jugador pueda reconstruirlas pegando el texto.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
