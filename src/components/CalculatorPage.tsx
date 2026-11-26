import React from 'react';
import { ArrowLeft, Calculator, Coins } from 'lucide-react';
import { GoldPriceItem, GoldPurity, QuotationResult } from '../types/gold';
import { SalesCalculator } from './SalesCalculator';
import { GoldPriceBoard } from './GoldPriceBoard';

interface CalculatorPageProps {
  prices: Record<GoldPurity, GoldPriceItem>;
  selectedPurity: GoldPurity;
  onPurityChange: (purity: GoldPurity) => void;
  onGenerateQuote: (quote: QuotationResult) => void;
  onBack: () => void;
  /** Pakej promosi dari halaman poster (harga tetap dipratetap). */
  preset?: { title: string; price: number } | null;
}

export const CalculatorPage: React.FC<CalculatorPageProps> = ({
  prices,
  selectedPurity,
  onPurityChange,
  onGenerateQuote,
  onBack,
  preset,
}) => {
  return (
    <section className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                Kalkulator &amp; Sebut Harga
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
        <div className="aspect-[3/1] rounded-2xl bg-cream border border-line/20">
          <SalesCalculator
            prices={prices}
            selectedPurity={selectedPurity}
            onPurityChange={onPurityChange}
            onGenerateQuote={onGenerateQuote}
            preset={preset}
          />
        </div>

        <aside className="gr-card-light p-4">
          <h2 className="flex items-center gap-1.5 font-serif text-sm font-bold tracking-wide text-maroon-deep">
            <Coins size={15} className="text-gold-deep" />
            Rujukan Harga Semasa
          </h2>
          <p className="mt-0.5 text-[10px] text-maroon/55">
            Tekan gred untuk tukar kadar kiraan.
          </p>

          {/* Kotak ketulenan sama seperti di homepage — 3 butang mendatar,
              kandungan berjajar kiri di dalam kotak. */}
          <div className="mt-3">
            <GoldPriceBoard
              prices={prices}
              selectedPurity={selectedPurity}
              onSelectPurity={onPurityChange}
              isCalculatorOpen
            />
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
