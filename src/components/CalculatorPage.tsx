import React from 'react';
import { ArrowLeft, Calculator, Coins } from 'lucide-react';
import { GoldPriceItem, GoldPurity, QuotationResult } from '../types/gold';
import { formatMYR } from '../utils/calculator';
import { SalesCalculator } from './SalesCalculator';

interface CalculatorPageProps {
  prices: Record<GoldPurity, GoldPriceItem>;
  selectedPurity: GoldPurity;
  onPurityChange: (purity: GoldPurity) => void;
  onGenerateQuote: (quote: QuotationResult) => void;
  onBack: () => void;
}

const PURITIES: GoldPurity[] = ['999', '916', '375'];

export const CalculatorPage: React.FC<CalculatorPageProps> = ({
  prices,
  selectedPurity,
  onPurityChange,
  onGenerateQuote,
  onBack,
}) => {
  return (
    <section className="mx-auto w-full max-w-5xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Page header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line/20 bg-cream px-2.5 py-1 text-[11px] font-semibold text-maroon/70 transition hover:border-gold-deep/40 hover:text-maroon-deep active:scale-95"
          >
            <ArrowLeft size={13} />
            <span>Kembali ke Papan Harga</span>
          </button>

          <div className="mt-2.5 flex items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-gold/15 text-gold-deep border border-gold-deep/25">
              <Calculator size={20} />
            </div>
            <div>
              <h1 className="font-serif text-xl font-black tracking-wide text-maroon-deep sm:text-2xl">
                Kalkulator Jualan
              </h1>
              <p className="text-[11px] text-maroon/60 sm:text-xs">
                Kiraan serta-merta termasuk kos emas, upah tukang, diskaun & trade-in
              </p>
            </div>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gold-deep/30 bg-cream px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-deep">
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
          Kadar Kaunter Semasa
        </span>
      </div>

      {/* Calculator + live price reference */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <SalesCalculator
          prices={prices}
          selectedPurity={selectedPurity}
          onPurityChange={onPurityChange}
          onGenerateQuote={onGenerateQuote}
        />

        <aside className="gr-card-light p-4">
          <h2 className="flex items-center gap-1.5 font-serif text-sm font-bold tracking-wide text-maroon-deep">
            <Coins size={15} className="text-gold-deep" />
            Rujukan Harga Semasa
          </h2>
          <p className="mt-0.5 text-[10px] text-maroon/55">
            Tekan gred untuk tukar kadar kiraan.
          </p>

          <div className="mt-3 space-y-1.5">
            {PURITIES.map((purity) => {
              const item = prices[purity];
              const isActive = selectedPurity === purity;

              return (
                <button
                  key={purity}
                  type="button"
                  onClick={() => onPurityChange(purity)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition active:scale-[0.98] ${
                    isActive
                      ? 'border-gold-deep/60 bg-gold text-maroon-deep shadow-[0_10px_24px_-16px_rgba(212,161,58,0.9)]'
                      : 'border-line/20 bg-cream text-maroon-deep hover:border-gold-deep/40'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-serif text-lg font-black tracking-wide">
                      {purity}
                    </span>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-maroon-deep text-gold">
                      {item?.karat}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-baseline justify-between gap-2 text-[11px]">
                    <span className={isActive ? 'text-maroon-deep/75' : 'text-maroon/55'}>
                      Jual / gram
                    </span>
                    <span className="font-mono font-bold">
                      {formatMYR(item?.sellPrice || 0)}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between gap-2 text-[10px]">
                    <span className={isActive ? 'text-maroon-deep/70' : 'text-maroon/50'}>
                      Beli / gram
                    </span>
                    <span className={isActive ? 'font-mono text-maroon-deep/80' : 'font-mono text-maroon/60'}>
                      {formatMYR(item?.buyPrice || 0)}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          <p className="mt-3 border-t border-line/15 pt-2 text-[10px] leading-relaxed text-maroon/50">
            Kadar ini disahkan di kaunter. Harga akhir tertakluk kepada timbangan dan
            semakan fizikal barang.
          </p>
        </aside>
      </div>
    </section>
  );
};
