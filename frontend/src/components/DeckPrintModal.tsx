import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { FileDown, Printer, Ruler, Sparkles, X } from 'lucide-react';
import { CardDefinition, DeckPreset } from '../types/game';
import { CardArt } from './CardArt';
import { renderCardIcon } from './CardView';

interface DeckPrintModalProps {
  deck: DeckPreset;
  onClose: () => void;
}

type CardSizePresetId = 'standard' | 'japanese' | 'mini' | 'tarot' | 'custom';

interface CardSizePreset {
  id: CardSizePresetId;
  label: string;
  widthMm: number;
  heightMm: number;
}

const CARD_SIZE_PRESETS: CardSizePreset[] = [
  { id: 'standard', label: 'Estándar TCG (63×88 mm • 3×3)', widthMm: 63, heightMm: 88 },
  { id: 'japanese', label: 'Pequeño / Yu-Gi-Oh (59×86 mm • 3×3)', widthMm: 59, heightMm: 86 },
  { id: 'mini', label: 'Mini / Compacto (48×68 mm • 4×3)', widthMm: 48, heightMm: 68 },
  { id: 'tarot', label: 'Tarot / Grande (70×110 mm • 2×2)', widthMm: 70, heightMm: 110 },
  { id: 'custom', label: 'Personalizado (mm)', widthMm: 63, heightMm: 88 },
];

const RECRUIT_TOKEN_CARD: CardDefinition = {
  id: 'token_recluta',
  name: 'Recluta',
  type: 'citizen',
  vitality: 2,
  description: 'Ficha de Ciudadano invocada (2V). Cuenta para Puntos de Desarrollo.',
  isToken: true,
  artColor: '#475569',
  artIcon: 'shield',
};

const ZOMBIE_TOKEN_CARD: CardDefinition = {
  id: 'token_zombie',
  name: 'Zombie',
  type: 'citizen',
  vitality: 2,
  description: 'Ficha de Ciudadano invocada (2V). Cuenta para Puntos de Desarrollo.',
  isToken: true,
  artColor: '#3f6212',
  artIcon: 'skull',
};

export const DeckPrintModal: React.FC<DeckPrintModalProps> = ({ deck, onClose }) => {
  const [inkSaver, setInkSaver] = useState(false);
  const [extraRecruitTokens, setExtraRecruitTokens] = useState<number>(0);
  const [extraZombieTokens, setExtraZombieTokens] = useState<number>(0);
  const [showCutGuides, setShowCutGuides] = useState(true);
  const [sizePreset, setSizePreset] = useState<CardSizePresetId>('standard');
  const [customWidthMm, setCustomWidthMm] = useState<number>(63);
  const [customHeightMm, setCustomHeightMm] = useState<number>(88);
  const printSheetsRef = useRef<HTMLDivElement>(null);

  // Add body class so @media print hides #root completely (avoiding black page 1 & side margins)
  useEffect(() => {
    document.body.classList.add('printing-deck');
    return () => {
      document.body.classList.remove('printing-deck');
    };
  }, []);

  const activeDimensions = useMemo(() => {
    if (sizePreset === 'custom') {
      const w = Math.max(35, Math.min(95, Number(customWidthMm) || 63));
      const h = Math.max(50, Math.min(135, Number(customHeightMm) || 88));
      return { widthMm: w, heightMm: h };
    }
    const found = CARD_SIZE_PRESETS.find((p) => p.id === sizePreset) || CARD_SIZE_PRESETS[0];
    return { widthMm: found.widthMm, heightMm: found.heightMm };
  }, [sizePreset, customWidthMm, customHeightMm]);

  // Calculate how many columns and rows fit comfortably inside an A4 portrait page (210x297mm)
  // Usable printable area with 7mm padding + header/footer: ~196mm width x 272mm height
  const gridMetrics = useMemo(() => {
    const gapMm = 2;
    const usableWidthMm = 196;
    const usableHeightMm = 272;
    const cols = Math.max(
      1,
      Math.floor((usableWidthMm + gapMm) / (activeDimensions.widthMm + gapMm))
    );
    const rows = Math.max(
      1,
      Math.floor((usableHeightMm + gapMm) / (activeDimensions.heightMm + gapMm))
    );
    const cardsPerPage = cols * rows;
    const scaleFactor = Math.min(
      activeDimensions.widthMm / 63,
      activeDimensions.heightMm / 88
    );
    return { cols, rows, cardsPerPage, gapMm, scaleFactor };
  }, [activeDimensions]);

  // Build the flat list of every card instance in the deck + any requested tokens
  const allCardInstances = useMemo(() => {
    const list: CardDefinition[] = [...deck.cards];
    for (let i = 0; i < extraRecruitTokens; i++) {
      list.push(RECRUIT_TOKEN_CARD);
    }
    for (let i = 0; i < extraZombieTokens; i++) {
      list.push(ZOMBIE_TOKEN_CARD);
    }
    return list;
  }, [deck.cards, extraRecruitTokens, extraZombieTokens]);

  // Group into pages of `cardsPerPage` cards
  const pages = useMemo(() => {
    const chunks: CardDefinition[][] = [];
    const perPage = gridMetrics.cardsPerPage;
    for (let i = 0; i < allCardInstances.length; i += perPage) {
      chunks.push(allCardInstances.slice(i, i + perPage));
    }
    return chunks;
  }, [allCardInstances, gridMetrics.cardsPerPage]);

  // Count summary by unique card for display
  const instanceSummary = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    for (const c of allCardInstances) {
      const prev = map.get(c.id) || { name: c.name, count: 0 };
      map.set(c.id, { name: c.name, count: prev.count + 1 });
    }
    return Array.from(map.values());
  }, [allCardInstances]);

  const handlePrintOrSavePdf = () => {
    window.print();
  };

  const modalContent = (
    <div className="deck-print-modal-backdrop fixed inset-0 z-50 flex flex-col bg-[#0b0908]/95 backdrop-blur-md overflow-hidden">
      {/* Top Control Toolbar (Hidden when printing via .no-print) */}
      <div className="no-print shrink-0 border-b-2 border-[#6b5a48] bg-gradient-to-b from-[#251e18] to-[#16120f] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-gradient-to-b from-[#f3d46b] to-[#966e15] text-[#14100c] border border-[#fef08a]">
            <FileDown className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-[#f3ead8]">
              Exportar Mazo como PDF para Imprimir — "{deck.name}"
            </h2>
            <p className="font-serif text-xs text-[#d6c7b8]">
              {allCardInstances.length} cartas en total ({deck.cards.length} del mazo
              {extraRecruitTokens > 0 ? ` + ${extraRecruitTokens} Reclutas` : ''}
              {extraZombieTokens > 0 ? ` + ${extraZombieTokens} Zombies` : ''}) •{' '}
              {pages.length} {pages.length === 1 ? 'hoja A4' : 'hojas A4'} (Grilla{' '}
              {gridMetrics.cols}×{gridMetrics.rows} • {activeDimensions.widthMm}×
              {activeDimensions.heightMm}mm)
            </p>
          </div>
        </div>

        {/* Print Options */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Card Size Selector */}
          <div className="flex items-center gap-1.5 bg-[#120f0d] px-2.5 py-1 rounded border border-[#574c3f]">
            <Ruler className="w-3.5 h-3.5 text-[#f3d46b]" />
            <span className="font-display text-[10px] font-bold text-[#d6c7b8]">
              Tamaño:
            </span>
            <select
              value={sizePreset}
              onChange={(e) => setSizePreset(e.target.value as CardSizePresetId)}
              className="bg-[#1c1713] border border-[#574c3f] rounded px-2 py-0.5 text-[11px] font-display text-[#f3ead8] focus:outline-none focus:border-[#c59b27]"
            >
              {CARD_SIZE_PRESETS.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
            {sizePreset === 'custom' && (
              <div className="flex items-center gap-1 ml-1">
                <input
                  type="number"
                  min={35}
                  max={95}
                  value={customWidthMm}
                  onChange={(e) => setCustomWidthMm(Number(e.target.value))}
                  className="w-12 bg-[#1c1713] border border-[#6b5a48] rounded px-1 py-0.5 text-[11px] text-center text-[#fef08a]"
                  title="Ancho en mm (35-95mm)"
                />
                <span className="text-[10px] text-[#a89b8c]">×</span>
                <input
                  type="number"
                  min={50}
                  max={135}
                  value={customHeightMm}
                  onChange={(e) => setCustomHeightMm(Number(e.target.value))}
                  className="w-12 bg-[#1c1713] border border-[#6b5a48] rounded px-1 py-0.5 text-[11px] text-center text-[#fef08a]"
                  title="Alto en mm (50-135mm)"
                />
                <span className="text-[10px] text-[#a89b8c]">mm</span>
              </div>
            )}
          </div>

          {/* Style Toggle: Full Art vs Ink-Saver */}
          <div className="flex items-center bg-[#120f0d] p-1 rounded border border-[#574c3f]">
            <button
              type="button"
              onClick={() => setInkSaver(false)}
              className={`px-2.5 py-1 rounded-sm font-display text-[10px] font-bold transition ${
                !inkSaver
                  ? 'bg-[#2b2216] text-[#fef08a] border border-[#c59b27]'
                  : 'text-[#a89b8c] hover:text-[#f3ead8]'
              }`}
            >
              Arte Completo
            </button>
            <button
              type="button"
              onClick={() => setInkSaver(true)}
              className={`px-2.5 py-1 rounded-sm font-display text-[10px] font-bold transition ${
                inkSaver
                  ? 'bg-[#2b2216] text-[#fef08a] border border-[#c59b27]'
                  : 'text-[#a89b8c] hover:text-[#f3ead8]'
              }`}
            >
              Ahorro de Tinta
            </button>
          </div>

          {/* Optional Extra Tokens */}
          <div className="flex items-center gap-1.5 bg-[#120f0d] px-2.5 py-1 rounded border border-[#574c3f]">
            <Sparkles className="w-3.5 h-3.5 text-[#f3d46b]" />
            <span className="font-display text-[10px] font-bold text-[#d6c7b8]">
              Reclutas (2V):
            </span>
            {[0, 3, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setExtraRecruitTokens(n)}
                className={`px-1.5 py-0.5 rounded-sm font-display text-[10px] font-bold transition ${
                  extraRecruitTokens === n
                    ? 'bg-[#c59b27] text-[#12100e]'
                    : 'bg-[#1f1a15] text-[#a89b8c] hover:text-[#f3ead8]'
                }`}
              >
                +{n}
              </button>
            ))}
            <span className="font-display text-[10px] font-bold text-[#d6c7b8] ml-1">
              Zombies (2V):
            </span>
            {[0, 3, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setExtraZombieTokens(n)}
                className={`px-1.5 py-0.5 rounded-sm font-display text-[10px] font-bold transition ${
                  extraZombieTokens === n
                    ? 'bg-[#c59b27] text-[#12100e]'
                    : 'bg-[#1f1a15] text-[#a89b8c] hover:text-[#f3ead8]'
                }`}
              >
                +{n}
              </button>
            ))}
          </div>

          {/* Cut Guides Checkbox */}
          <label className="flex items-center gap-1.5 font-display text-[10px] font-bold text-[#d6c7b8] cursor-pointer bg-[#120f0d] px-2.5 py-1.5 rounded border border-[#574c3f]">
            <input
              type="checkbox"
              checked={showCutGuides}
              onChange={(e) => setShowCutGuides(e.target.checked)}
              className="accent-[#c59b27]"
            />
            Guías de Corte
          </label>

          {/* Primary Action: Save as PDF / Print */}
          <button
            type="button"
            disabled={allCardInstances.length === 0}
            onClick={handlePrintOrSavePdf}
            className="btn-war-gold px-4 py-2 rounded text-xs flex items-center gap-1.5 shadow-[0_0_20px_rgba(243,212,107,0.5)]"
          >
            <Printer className="w-4 h-4" />
            Guardar como PDF / Imprimir
          </button>

          <button
            type="button"
            onClick={onClose}
            className="btn-war-iron px-3 py-2 rounded text-xs flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Cerrar
          </button>
        </div>
      </div>

      {/* Breakdown Bar of Instances Included (Hidden on print) */}
      <div className="no-print shrink-0 bg-[#181410] border-b border-[#463c32] px-6 py-2 flex items-center gap-2 overflow-x-auto text-xs">
        <span className="font-display text-[10px] font-bold uppercase text-[#f3d46b] shrink-0">
          Desglose de Copias a Imprimir:
        </span>
        <div className="flex items-center gap-1.5 flex-wrap">
          {instanceSummary.map((item) => (
            <span
              key={item.name}
              className="px-2 py-0.5 rounded bg-[#241e18] border border-[#574c3f] font-serif text-[11px] text-[#f3ead8]"
            >
              <strong className="font-display text-[#f3d46b]">{item.count}×</strong>{' '}
              {item.name}
            </span>
          ))}
        </div>
        <span className="ml-auto font-serif italic text-[11px] text-[#a89b8c] shrink-0">
          Tip: En el diálogo de impresión elegí Destino: "Guardar como PDF" (Sin márgenes)
        </span>
      </div>

      {/* Scrollable Preview & Printable Sheets Container */}
      <div
        ref={printSheetsRef}
        className="deck-print-sheets-container flex-1 overflow-y-auto p-6 space-y-8 flex flex-col items-center"
      >
        {pages.map((pageCards, pageIdx) => {
          const artHeightMm = Math.max(16, Math.round(activeDimensions.heightMm * 0.35));
          const titleFontPt = Math.max(6.5, +(8.5 * gridMetrics.scaleFactor).toFixed(1));
          const bodyFontPt = Math.max(6, +(7.8 * gridMetrics.scaleFactor).toFixed(1));

          return (
            <div
              key={pageIdx}
              className="deck-print-page bg-white text-[#12100e] rounded shadow-[0_16px_48px_rgba(0,0,0,0.9)] p-[7mm] w-[210mm] flex flex-col justify-between shrink-0"
            >
              {/* Sheet Header */}
              <div className="flex items-center justify-between border-b border-[#d6c7b8] pb-1 mb-2 text-[8.5pt] font-display text-[#4a3f35]">
                <span>
                  <strong>CITIZENS' BASTION</strong> — Mazo: {deck.name}
                </span>
                <span>
                  Hoja {pageIdx + 1} de {pages.length} ({allCardInstances.length} cartas •{' '}
                  {activeDimensions.widthMm}×{activeDimensions.heightMm}mm)
                </span>
              </div>

              {/* Dynamic Card Grid */}
              <div
                className="grid place-items-center mx-auto"
                style={{
                  gridTemplateColumns: `repeat(${gridMetrics.cols}, ${activeDimensions.widthMm}mm)`,
                  gridTemplateRows: `repeat(${gridMetrics.rows}, ${activeDimensions.heightMm}mm)`,
                  gap: `${gridMetrics.gapMm}mm`,
                }}
              >
                {Array.from({ length: gridMetrics.cardsPerPage }).map((_, slotIdx) => {
                  const card = pageCards[slotIdx];
                  const globalCardNumber = pageIdx * gridMetrics.cardsPerPage + slotIdx + 1;

                  if (!card) {
                    return (
                      <div
                        key={`empty_${slotIdx}`}
                        style={{
                          width: `${activeDimensions.widthMm}mm`,
                          height: `${activeDimensions.heightMm}mm`,
                        }}
                        className="rounded border border-dashed border-gray-200"
                      />
                    );
                  }

                  const isCitizen = card.type === 'citizen';
                  const isTool = card.type === 'tool';
                  const hasStat = isCitizen || isTool;
                  const statSuffix = isTool ? 'A' : 'V';

                  return (
                    <div
                      key={`${card.id}_${globalCardNumber}`}
                      style={{
                        width: `${activeDimensions.widthMm}mm`,
                        height: `${activeDimensions.heightMm}mm`,
                        WebkitPrintColorAdjust: 'exact',
                        printColorAdjust: 'exact',
                      }}
                      className={`relative flex flex-col justify-between p-[2mm] rounded-[2.2mm] select-none box-border overflow-hidden ${
                        showCutGuides
                          ? 'outline outline-1 outline-dashed outline-gray-400'
                          : ''
                      } ${
                        inkSaver
                          ? 'bg-[#fdfaf3] border-[1.5px] border-[#26201a] text-[#14100c]'
                          : isCitizen
                          ? 'bg-gradient-to-b from-[#28211b] via-[#1c1714] to-[#120f0d] border-[2px] border-[#c59b27] text-[#f7efe0]'
                          : isTool
                          ? 'bg-gradient-to-b from-[#242c38] via-[#181f29] to-[#0f141c] border-[2px] border-[#94a3b8] text-[#f1f5f9]'
                          : 'bg-gradient-to-b from-[#1f202e] via-[#171824] to-[#10111a] border-[2px] border-[#94a3b8] text-[#f8fafc]'
                      }`}
                    >
                      {/* 1. Top Nameplate & Vitality Shield / Event Icon */}
                      <div
                        className={`flex items-center justify-between gap-1 px-1.5 py-0.5 rounded-[1.2mm] border ${
                          inkSaver
                            ? 'bg-[#f3ece0] border-[#574c3f] text-[#14100c]'
                            : 'bg-[#1f1914] border-[#c59b27]/80 text-[#f7efe0]'
                        }`}
                      >
                        <span
                          style={{ fontSize: `${titleFontPt}pt` }}
                          className="font-display font-bold leading-[1.08] tracking-tight line-clamp-2"
                        >
                          {card.name}
                        </span>

                        {hasStat ? (
                          <div
                            style={{ fontSize: `${titleFontPt}pt` }}
                            className={`shrink-0 px-1.5 py-0.5 rounded-[1mm] font-display font-black border ${
                              inkSaver
                                ? 'bg-[#26201a] text-white border-[#14100c]'
                                : isTool
                                ? 'bg-[#cbd5e1] text-[#0f172a] border-[#f8fafc]'
                                : 'bg-[#f3d46b] text-[#14100c] border-[#fef9c3]'
                            }`}
                          >
                            {card.vitality}
                            {statSuffix}
                          </div>
                        ) : (
                          <span
                            className={`shrink-0 ${
                              inkSaver ? 'text-[#26201a]' : 'text-[#e2e8f0]'
                            }`}
                          >
                            {renderCardIcon(card.artIcon, 'w-3.5 h-3.5')}
                          </span>
                        )}
                      </div>

                      {/* 2. Card Artwork Box */}
                      <div
                        style={{ height: `${artHeightMm}mm` }}
                        className={`my-0.5 w-full rounded-[1.2mm] overflow-hidden border relative shrink-0 ${
                          inkSaver ? 'border-[#574c3f]' : 'border-[#c59b27]/80'
                        }`}
                      >
                        <CardArt card={card} className="w-full h-full" />
                      </div>

                      {/* 3. Type Ribbon */}
                      <div
                        className={`px-1 py-0.5 border-y flex items-center justify-between font-display uppercase tracking-wider text-[6pt] font-bold ${
                          inkSaver
                            ? 'bg-[#efe6d5] border-[#8c7e70] text-[#3a3026]'
                            : isCitizen
                            ? 'bg-[#16120f] border-[#6b5a48] text-[#e3c158]'
                            : isTool
                            ? 'bg-[#141a23] border-[#64748b] text-[#cbd5e1]'
                            : 'bg-[#151621] border-[#64748b] text-[#c7d2fe]'
                        }`}
                      >
                        <span className="truncate">
                          {card.isToken
                            ? 'Ficha • Ciudadano'
                            : card.isCommander
                            ? 'Comandante • Ciudadano'
                            : card.isLocation
                            ? 'Locación • Herramienta'
                            : isCitizen
                            ? 'Ciudadano • Bastión'
                            : isTool
                            ? 'Herramienta • Bastión'
                            : 'Evento • Efecto'}
                        </span>
                        <span className="shrink-0 ml-1">
                          #{globalCardNumber}/{allCardInstances.length}
                        </span>
                      </div>

                      {/* 4. Rules & Description Box */}
                      <div
                        className={`mt-0.5 flex-1 rounded-[1.2mm] border p-1 flex flex-col justify-between overflow-hidden ${
                          inkSaver
                            ? 'bg-white border-[#8c7e70] text-[#14100c]'
                            : 'bg-[#181410] border-[#574c3f] text-[#ede5d8]'
                        }`}
                      >
                        <p
                          style={{ fontSize: `${bodyFontPt}pt` }}
                          className="font-serif leading-[1.16]"
                        >
                          {card.description || 'Sin habilidades especiales.'}
                        </p>

                        <div
                          className={`pt-0.5 border-t flex items-center justify-between text-[5.5pt] font-display ${
                            inkSaver
                              ? 'border-[#d6c7b8] text-[#6e6053]'
                              : 'border-[#3a322a] text-[#8c7e70]'
                          }`}
                        >
                          <span>Citizens' Bastion</span>
                          <span className="truncate max-w-[60%]">{deck.name}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Sheet Footer */}
              <div className="pt-1 mt-1.5 border-t border-[#d6c7b8] flex items-center justify-between text-[7pt] font-serif text-[#6e6053]">
                <span>
                  Recortá por las guías punteadas ({activeDimensions.widthMm}×
                  {activeDimensions.heightMm}mm • Grilla {gridMetrics.cols}×{gridMetrics.rows}).
                </span>
                <span>Citizens' Bastion • Reglas 2026 v1</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
