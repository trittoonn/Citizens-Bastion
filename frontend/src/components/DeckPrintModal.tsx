import React, { useMemo, useRef, useState } from 'react';
import { FileDown, Printer, Sparkles, X } from 'lucide-react';
import { CardDefinition, DeckPreset } from '../types/game';
import { CardArt } from './CardArt';
import { renderCardIcon } from './CardView';

interface DeckPrintModalProps {
  deck: DeckPreset;
  onClose: () => void;
}

const RECRUIT_TOKEN_CARD: CardDefinition = {
  id: 'token_recluta',
  name: 'Recluta',
  type: 'citizen',
  vitality: 1,
  description: 'Ficha de Ciudadano invocada (1V). Cuenta para Puntos de Desarrollo.',
  isToken: true,
  artColor: '#475569',
  artIcon: 'shield',
};

export const DeckPrintModal: React.FC<DeckPrintModalProps> = ({ deck, onClose }) => {
  const [inkSaver, setInkSaver] = useState(false);
  const [extraRecruitTokens, setExtraRecruitTokens] = useState<number>(0);
  const [showCutGuides, setShowCutGuides] = useState(true);
  const printSheetsRef = useRef<HTMLDivElement>(null);

  // Build the flat list of every card instance in the deck + any requested Recruit tokens
  const allCardInstances = useMemo(() => {
    const list: CardDefinition[] = [...deck.cards];
    for (let i = 0; i < extraRecruitTokens; i++) {
      list.push(RECRUIT_TOKEN_CARD);
    }
    return list;
  }, [deck.cards, extraRecruitTokens]);

  // Group into pages of 9 cards (standard 3x3 TCG layout per A4/Letter sheet)
  const pages = useMemo(() => {
    const chunks: CardDefinition[][] = [];
    for (let i = 0; i < allCardInstances.length; i += 9) {
      chunks.push(allCardInstances.slice(i, i + 9));
    }
    return chunks;
  }, [allCardInstances]);

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
    // Trigger native browser Print / Save-as-PDF dialog.
    // Our @media print rules in index.css automatically isolate .deck-print-sheets-container
    // so only the A4 3x3 card pages are printed/exported to PDF!
    window.print();
  };

  return (
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
              {extraRecruitTokens > 0 ? ` + ${extraRecruitTokens} fichas de Recluta` : ''}) •{' '}
              {pages.length} {pages.length === 1 ? 'hoja A4' : 'hojas A4'} (Grilla 3×3 tamaño TCG 63×88mm)
            </p>
          </div>
        </div>

        {/* Print Options */}
        <div className="flex flex-wrap items-center gap-3">
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

          {/* Optional Extra Recruit Tokens */}
          <div className="flex items-center gap-1.5 bg-[#120f0d] px-2.5 py-1 rounded border border-[#574c3f]">
            <Sparkles className="w-3.5 h-3.5 text-[#f3d46b]" />
            <span className="font-display text-[10px] font-bold text-[#d6c7b8]">
              Fichas Recluta (1V):
            </span>
            {[0, 3, 6, 9].map((n) => (
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
          Tip: En el diálogo de impresión elegí Destino: "Guardar como PDF"
        </span>
      </div>

      {/* Scrollable Preview & Printable Sheets Container */}
      <div
        ref={printSheetsRef}
        className="deck-print-sheets-container flex-1 overflow-y-auto p-6 space-y-8 flex flex-col items-center"
      >
        {pages.map((pageCards, pageIdx) => (
          <div
            key={pageIdx}
            className="deck-print-page bg-white text-[#12100e] rounded shadow-[0_16px_48px_rgba(0,0,0,0.9)] p-[10mm] w-[210mm] min-h-[297mm] flex flex-col justify-between shrink-0"
          >
            {/* Sheet Header */}
            <div className="flex items-center justify-between border-b border-[#d6c7b8] pb-1.5 mb-2 text-[9pt] font-display text-[#4a3f35]">
              <span>
                <strong>CITIZENS' BASTION</strong> — Mazo: {deck.name}
              </span>
              <span>
                Hoja {pageIdx + 1} de {pages.length} ({allCardInstances.length} cartas en total)
              </span>
            </div>

            {/* 3x3 Standard TCG Card Grid (Each card 61mm x 86mm) */}
            <div className="flex-1 grid grid-cols-3 grid-rows-3 gap-[2.5mm] place-items-center">
              {Array.from({ length: 9 }).map((_, slotIdx) => {
                const card = pageCards[slotIdx];
                const globalCardNumber = pageIdx * 9 + slotIdx + 1;

                if (!card) {
                  return (
                    <div
                      key={`empty_${slotIdx}`}
                      className="w-[61mm] h-[86mm] rounded border border-dashed border-gray-200"
                    />
                  );
                }

                const isCitizen = card.type === 'citizen';

                return (
                  <div
                    key={`${card.id}_${globalCardNumber}`}
                    className={`w-[61mm] h-[86mm] relative flex flex-col justify-between p-[2.2mm] rounded-[2.5mm] select-none ${
                      showCutGuides
                        ? 'outline outline-1 outline-dashed outline-gray-400'
                        : ''
                    } ${
                      inkSaver
                        ? 'bg-[#fdfaf3] border-[1.5px] border-[#26201a] text-[#14100c]'
                        : isCitizen
                        ? 'bg-gradient-to-b from-[#28211b] via-[#1c1714] to-[#120f0d] border-[2px] border-[#c59b27] text-[#f7efe0]'
                        : 'bg-gradient-to-b from-[#1f202e] via-[#171824] to-[#10111a] border-[2px] border-[#94a3b8] text-[#f8fafc]'
                    }`}
                    style={{
                      WebkitPrintColorAdjust: 'exact',
                      printColorAdjust: 'exact',
                    }}
                  >
                    {/* 1. Top Nameplate & Vitality Shield / Event Icon */}
                    <div
                      className={`flex items-center justify-between gap-1 px-1.5 py-1 rounded-[1.5mm] border ${
                        inkSaver
                          ? 'bg-[#f3ece0] border-[#574c3f] text-[#14100c]'
                          : 'bg-[#1f1914] border-[#c59b27]/80 text-[#f7efe0]'
                      }`}
                    >
                      <span className="font-display font-bold text-[8.5pt] leading-[1.08] tracking-tight line-clamp-2">
                        {card.name}
                      </span>

                      {isCitizen ? (
                        <div
                          className={`shrink-0 px-1.5 py-0.5 rounded-[1mm] font-display font-black text-[9pt] border ${
                            inkSaver
                              ? 'bg-[#26201a] text-white border-[#14100c]'
                              : 'bg-[#f3d46b] text-[#14100c] border-[#fef9c3]'
                          }`}
                        >
                          {card.vitality}V
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
                      className={`my-1 h-[31mm] w-full rounded-[1.2mm] overflow-hidden border relative shrink-0 ${
                        inkSaver ? 'border-[#574c3f]' : 'border-[#c59b27]/80'
                      }`}
                    >
                      <CardArt card={card} className="w-full h-full" />
                    </div>

                    {/* 3. Type Ribbon */}
                    <div
                      className={`px-1.5 py-0.5 border-y flex items-center justify-between font-display uppercase tracking-wider text-[6.5pt] font-bold ${
                        inkSaver
                          ? 'bg-[#efe6d5] border-[#8c7e70] text-[#3a3026]'
                          : isCitizen
                          ? 'bg-[#16120f] border-[#6b5a48] text-[#e3c158]'
                          : 'bg-[#151621] border-[#64748b] text-[#c7d2fe]'
                      }`}
                    >
                      <span>
                        {card.isToken
                          ? 'Ficha • Ciudadano'
                          : isCitizen
                          ? 'Ciudadano • Bastión'
                          : 'Evento • Efecto'}
                      </span>
                      <span>
                        #{globalCardNumber}/{allCardInstances.length}
                      </span>
                    </div>

                    {/* 4. Rules & Description Box */}
                    <div
                      className={`mt-1 flex-1 rounded-[1.2mm] border p-1.5 flex flex-col justify-between overflow-hidden ${
                        inkSaver
                          ? 'bg-white border-[#8c7e70] text-[#14100c]'
                          : 'bg-[#181410] border-[#574c3f] text-[#ede5d8]'
                      }`}
                    >
                      <p className="font-serif text-[8pt] leading-[1.2]">
                        {card.description || 'Sin habilidades especiales.'}
                      </p>

                      <div
                        className={`pt-0.5 border-t flex items-center justify-between text-[6pt] font-display ${
                          inkSaver
                            ? 'border-[#d6c7b8] text-[#6e6053]'
                            : 'border-[#3a322a] text-[#8c7e70]'
                        }`}
                      >
                        <span>Citizens' Bastion</span>
                        <span>{deck.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sheet Footer */}
            <div className="pt-1.5 mt-1 border-t border-[#d6c7b8] flex items-center justify-between text-[7.5pt] font-serif text-[#6e6053]">
              <span>
                Recortá por las guías punteadas (Tamaño estándar TCG: 63×88mm).
              </span>
              <span>Citizens' Bastion • Reglas 2026 v1</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
