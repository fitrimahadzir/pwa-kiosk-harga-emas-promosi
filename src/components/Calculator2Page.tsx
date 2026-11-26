import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Calculator,
  CheckCircle2,
  Coins,
  FileText,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { GoldPriceItem, GoldPurity, QuotationResult } from '../types/gold';
import { formatMYR, formatWeight } from '../utils/calculator';
import type { ReceiptSaveResult } from '../utils/storage';
import { SalesCalculator } from './SalesCalculator';
import { GoldPriceBoard } from './GoldPriceBoard';

interface Calculator2PageProps {
  prices: Record<GoldPurity, GoldPriceItem>;
  selectedPurity: GoldPurity;
  onPurityChange: (purity: GoldPurity) => void;
  onGenerateQuote: (quote: QuotationResult) => void;
  onBack: () => void;
  /** Pakej promosi dari halaman poster (harga tetap dipratetap). */
  preset?: { title: string; price: number } | null;
  /** Jana nombor resit GRJ di server bila staf tekan "Jana Sebut Harga". */
  onSaveReceipt?: (quote: QuotationResult) => Promise<ReceiptSaveResult>;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const QuoteRow: React.FC<{
  label: string;
  value: string;
  minus?: boolean;
  muted?: boolean;
}> = ({ label, value, minus = false, muted = false }) => (
  <div className="flex items-baseline justify-between gap-3 py-1.5">
    <span className={`text-[11px] ${muted ? 'text-cream/45' : 'text-cream/60'}`}>
      {label}
    </span>
    <span
      className={`font-mono text-xs font-bold tabular-nums ${
        minus ? 'text-success' : muted ? 'text-cream/50' : 'text-cream/90'
      }`}
    >
      {minus ? `−${value}` : value}
    </span>
  </div>
);

/**
 * Versi baharu halaman kalkulator: rujukan harga di atas kalkulator,
 * dan sebut harga langsung di lajur kanan.
 */
export const Calculator2Page: React.FC<Calculator2PageProps> = ({
  prices,
  selectedPurity,
  onPurityChange,
  onGenerateQuote,
  onBack,
  preset,
  onSaveReceipt,
}) => {
  const [quote, setQuote] = useState<QuotationResult | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState<string>('');

  // Sebut harga baru (atau outlet bertukar) = status janaan dikosongkan.
  useEffect(() => {
    setSaveState('idle');
    setSaveMessage('');
  }, [quote?.quoteId, onSaveReceipt]);

  /**
   * "Jana Sebut Harga" menulis resit dan menjana GRJ di server, kemudian
   * membuka slip. Klik lagi untuk sebut harga yang sama hanya membuka semula
   * slip — tiada tulisan DB kedua.
   */
  const handleGenerate = async () => {
    if (!quote || saveState === 'saving') return;

    if (saveState === 'saved') {
      onGenerateQuote(quote);
      return;
    }

    // Tiada RPC / jumlah kosong → preview tanpa nombor resit.
    if (!onSaveReceipt || quote.finalTotal <= 0) {
      onGenerateQuote(quote);
      return;
    }

    setSaveState('saving');
    setSaveMessage('');
    try {
      const result = await onSaveReceipt(quote);
      if (!result.ok) {
        setSaveMessage(result.error);
        setSaveState('error');
        return; // slip tak dibuka — nombor resit belum wujud
      }
      setSaveState('saved');
      // App.tsx dah simpan GRJ dalam savedReceiptNumbers sebelum result return,
      // jadi masa onGenerateQuote dipanggil, slip terus baca GRJ.
      onGenerateQuote(quote);
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : 'Gagal menjana nombor resit.');
      setSaveState('error');
    }
  };

  return (
    <section className="mx-auto w-full max-w-6xl animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Page header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
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
            <div className="grid size-10 place-items-center rounded-xl border border-gold-deep/25 bg-gradient-to-br from-gold/25 to-gold/5 text-gold-deep shadow-[0_10px_24px_-16px_rgba(212,161,58,0.9)]">
              <Calculator size={20} />
            </div>
            <div>
              <h1 className="font-serif text-xl font-black tracking-wide text-maroon-deep sm:text-2xl">
                Kalkulator &amp; Sebut Harga
              </h1>
              <p className="text-[11px] text-maroon/60 sm:text-xs">
                Kiraan jualan dan sebut harga dalam satu skrin
              </p>
            </div>
          </div>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-gold-deep/30 bg-cream px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold-deep">
          <span className="size-1.5 rounded-full bg-success animate-pulse" />
          Kadar Kaunter Semasa
        </span>
      </div>

      {/* Dua lajur: kiri kalkulator, kanan sebut harga */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(300px,1fr)] lg:items-start lg:gap-6">
        {/* ---------- LAJUR KIRI ---------- */}
        <div className="space-y-5">
          {/* 1. Rujukan harga — dipindah ke atas kalkulator */}
          <div className="gr-card-light relative overflow-hidden p-4 sm:p-5">
            <div className="pointer-events-none absolute -right-12 -top-16 size-44 rounded-full bg-gold/15 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div>
                <p className="gr-kicker-light">Kadar Semasa</p>
                <p className="mt-1.5 text-[11px] text-maroon/55">
                  Tekan gred untuk tukar kadar kiraan.
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-success/40 bg-success/10 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-success">
                Langsung
              </span>
            </div>

            {/* Guna semula kotak ketulenan dari homepage — susunan mendatar,
                teks berjajar kiri di dalam kotak (bukan tertengah). */}
            <div className="relative mt-4">
              <GoldPriceBoard
                prices={prices}
                selectedPurity={selectedPurity}
                onSelectPurity={onPurityChange}
                isCalculatorOpen
              />
            </div>
          </div>

          {/* 2. Kalkulator */}
          <SalesCalculator
            prices={prices}
            selectedPurity={selectedPurity}
            onPurityChange={onPurityChange}
            onGenerateQuote={onGenerateQuote}
            preset={preset}
            onQuoteChange={setQuote}
            showSummary={false}
          />
        </div>

        {/* ---------- LAJUR KANAN: SEBUT HARGA ---------- */}
        <aside className="lg:sticky lg:top-20">
          <div className="relative overflow-hidden rounded-3xl border border-gold-deep/50 bg-gradient-to-b from-[#430909] via-[#3b0707] to-[#2a0404] p-5 text-cream shadow-[0_28px_60px_-32px_rgba(59,7,7,0.9)] sm:p-6">
            {/* Hiasan latar */}
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full border border-gold/10" />
            <div className="pointer-events-none absolute -right-6 -top-10 size-36 rounded-full border border-gold/10" />
            <div className="pointer-events-none absolute -bottom-24 -left-16 size-52 rounded-full bg-gold/5 blur-3xl" />

            <div className="relative">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold-soft/70">
                    Sebut Harga
                  </p>
                  <h2 className="mt-1 flex items-center gap-2 font-heading text-xl font-bold text-cream sm:text-2xl">
                    <FileText size={19} className="text-gold" />
                    Ringkasan Harga
                  </h2>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-xl border border-gold/40 bg-gold/15 text-gold">
                  <Sparkles size={17} />
                </span>
              </div>

              {quote ? (
                <>
                  <div className="mt-5 rounded-2xl border border-gold/25 bg-black/20 px-4 py-5 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-soft/60">
                      Jumlah Bersih
                    </p>
                    <p className="mt-1.5 bg-gradient-to-r from-gold-soft via-gold to-gold-soft bg-clip-text font-sans text-3xl font-black tracking-tight text-transparent sm:text-4xl">
                      {formatMYR(quote.finalTotal)}
                    </p>
                  </div>

                  <div className="mt-4 divide-y divide-cream/10 border-y border-cream/10 py-1">
                    {quote.packagePrice ? (
                      <>
                        <QuoteRow
                          label="Pakej"
                          value={quote.packageTitle ?? 'Pakej Promosi'}
                        />
                        <QuoteRow
                          label="Harga Pakej"
                          value={formatMYR(quote.packagePrice)}
                        />
                      </>
                    ) : (
                      <>
                        <QuoteRow label="Gred" value={`${quote.purity} · ${quote.karat}`} />
                        <QuoteRow label="Berat" value={formatWeight(quote.weight)} />
                        <QuoteRow
                          label={`Kos Emas @ ${formatMYR(quote.pricePerGram)}/g`}
                          value={formatMYR(quote.goldCost)}
                        />
                        <QuoteRow
                          label="Upah Tukang"
                          value={formatMYR(quote.workmanship)}
                          muted={quote.workmanship === 0}
                        />
                      </>
                    )}
                    <QuoteRow
                      label="Subtotal"
                      value={formatMYR(quote.subtotal)}
                    />
                    {quote.discountAmount > 0 && (
                      <QuoteRow
                        label="Diskaun"
                        value={formatMYR(quote.discountAmount)}
                        minus
                      />
                    )}
                    {quote.hasTradeIn && (
                      <QuoteRow
                        label={`Trade-In ${quote.tradeInPurity} (${formatWeight(quote.tradeInWeight)})`}
                        value={formatMYR(quote.tradeInAmount)}
                        minus
                      />
                    )}
                  </div>

                  <p className="mt-3 text-[10px] leading-relaxed text-cream/40">
                    Sebut harga dikira secara langsung dan sah mengikut kadar
                    kaunter semasa.
                  </p>

                  <div className="mt-5 space-y-2.5">
                    <button
                      type="button"
                      onClick={() => void handleGenerate()}
                      disabled={saveState === 'saving'}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-gold to-gold-soft px-4 py-3 text-sm font-bold text-maroon-deep shadow-[0_16px_36px_-18px_rgba(212,161,58,0.95)] transition hover:brightness-105 active:scale-[0.98] disabled:cursor-wait disabled:opacity-75"
                    >
                      {saveState === 'saving' ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : saveState === 'error' ? (
                        <AlertCircle size={16} />
                      ) : (
                        <FileText size={16} />
                      )}
                      <span>
                        {saveState === 'saving'
                          ? 'Menjana resit...'
                          : saveState === 'error'
                            ? 'Cuba Jana Semula'
                            : 'Jana Sebut Harga'}
                      </span>
                      {saveState !== 'saving' && <ArrowRight size={16} />}
                    </button>

                    {saveState === 'saved' && (
                      <p className="flex items-center justify-center gap-1.5 text-[10px] text-success">
                        <CheckCircle2 size={12} />
                        Resit berjaya dijana
                      </p>
                    )}

                    {saveState === 'error' && (
                      <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 px-3 py-2 text-[10px] leading-relaxed text-rose-200">
                        <p className="flex items-start gap-1.5 font-semibold">
                          <AlertCircle size={12} className="mt-0.5 shrink-0" />
                          Gagal menjana nombor resit
                        </p>
                        <p className="mt-1 break-words opacity-85">{saveMessage}</p>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-6 rounded-2xl border border-dashed border-gold/25 bg-black/15 px-4 py-10 text-center">
                  <Coins size={26} className="mx-auto text-gold/60" />
                  <p className="mt-3 text-xs font-semibold text-cream/75">
                    Sedia untuk mengira
                  </p>
                  <p className="mt-1 text-[11px] text-cream/45">
                    Ringkasan sebut harga akan dipaparkan di sini.
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
};
