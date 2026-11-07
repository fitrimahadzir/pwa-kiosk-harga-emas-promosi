import React, { useState } from 'react';
import { 
  Calculator, 
  RotateCcw, 
  FileText, 
  ArrowRightLeft, 
  Percent, 
  Plus, 
  Check, 
  Tag,
  Coins,
  X
} from 'lucide-react';
import { CalculatorInput, GoldPriceItem, GoldPurity, QuotationResult } from '../types/gold';
import { computeQuotation, formatMYR, formatWeight } from '../utils/calculator';

interface SalesCalculatorProps {
  prices: Record<GoldPurity, GoldPriceItem>;
  selectedPurity: GoldPurity;
  onPurityChange: (purity: GoldPurity) => void;
  onGenerateQuote: (quote: QuotationResult) => void;
  onClose?: () => void;
}

export const SalesCalculator: React.FC<SalesCalculatorProps> = ({
  prices,
  selectedPurity,
  onPurityChange,
  onGenerateQuote,
  onClose,
}) => {
  // Local state for calculations
  const [weight, setWeight] = useState<string>('5.00');
  const [workmanship, setWorkmanship] = useState<string>('80');
  const [hasDiscount, setHasDiscount] = useState<boolean>(false);
  const [discount, setDiscount] = useState<string>('0');
  const [discountType, setDiscountType] = useState<'fixed' | 'percent'>('fixed');

  // Trade-in state
  const [hasTradeIn, setHasTradeIn] = useState<boolean>(false);
  const [tradeInPurity, setTradeInPurity] = useState<GoldPurity>('916');
  const [tradeInWeight, setTradeInWeight] = useState<string>('');

  const currentRate = prices[selectedPurity]?.sellPrice || 0;
  const currentTradeInRate = prices[tradeInPurity]?.buyPrice || 0;

  // Build input object
  const calcInput: CalculatorInput = {
    purity: selectedPurity,
    weight: parseFloat(weight) || 0,
    workmanship: parseFloat(workmanship) || 0,
    discount: hasDiscount ? parseFloat(discount) || 0 : 0,
    discountType,
    hasTradeIn,
    tradeInPurity,
    tradeInWeight: hasTradeIn ? parseFloat(tradeInWeight) || 0 : 0,
    tradeInRate: currentTradeInRate,
  };

  const quotation = computeQuotation(calcInput, prices);

  // Quick weight addition helper
  const addWeight = (delta: number) => {
    const current = parseFloat(weight) || 0;
    const next = Math.max(0, current + delta);
    setWeight(next.toFixed(2));
  };

  const handleReset = () => {
    setWeight('');
    setWorkmanship('');
    setHasDiscount(false);
    setDiscount('0');
    setHasTradeIn(false);
    setTradeInWeight('');
  };

  return (
    <div className="gr-card-light p-3.5 sm:p-4 flex flex-col justify-between">
      
      {/* Top Header of Calculator */}
      <div className="flex items-center justify-between pb-2.5 border-b border-line/15">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gold/15 text-gold-deep border border-gold-deep/25">
            <Calculator size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-maroon-deep font-serif tracking-wide">
              Kalkulator Jualan Pantas
            </h2>
            <p className="text-[10px] text-maroon/55">
              Kiraan serta-merta termasuk kos emas, upah & trade-in
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-cream border border-line/20 text-maroon/70 hover:text-maroon-deep hover:border-gold-deep/40 text-xs transition active:scale-95"
            title="Kosongkan kalkulator"
          >
            <RotateCcw size={12} />
            <span>Reset</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cream border border-line/20 text-maroon/70 hover:text-rose-700 hover:border-rose-300 text-xs transition active:scale-95"
              title="Sembunyikan kalkulator"
            >
              <X size={13} />
              <span>Sembunyi</span>
            </button>
          )}
        </div>
      </div>

      {/* Main inputs section */}
      <div className="py-1.5 space-y-1.5">
        
        {/* 1. Gred Emas Tabs */}
        <div>
          <label className="text-[10px] sm:text-[11px] font-semibold text-maroon/65 block mb-1">
            1. Pilihan Gred Emas
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(['999', '916', '375'] as GoldPurity[]).map((purity) => {
              const active = selectedPurity === purity;
              return (
                <button
                  key={purity}
                  type="button"
                  onClick={() => onPurityChange(purity)}
                  className={`py-1 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border shadow-sm ${
                    active
                      ? 'bg-gold text-maroon-deep border-gold shadow-[0_4px_16px_-8px_rgba(212,161,58,0.9)]'
                      : 'bg-cream text-maroon-deep border-line/20 hover:border-gold-deep/50'
                  }`}
                >
                  <span>Emas {purity}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-maroon-deep text-gold">
                    {prices[purity]?.karat}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Berat & Upah Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          
          {/* Berat Barang (Gram) */}
          <div className="bg-cream p-2 rounded-xl border border-line/15">
            <div className="flex justify-between items-center mb-0.5">
              <label htmlFor="calc-weight" className="text-[10px] sm:text-[11px] font-semibold text-maroon/65">
                2. Berat Barang (gram)
              </label>
              <span className="text-[10px] text-gold-deep/80 font-mono">
                {formatMYR(currentRate)}/g
              </span>
            </div>
            <div className="relative">
              <input
                id="calc-weight"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full bg-white border border-line/25 rounded-xl px-2.5 py-1 text-maroon-deep text-base font-bold font-mono focus:outline-none focus:border-gold-deep focus:ring-1 focus:ring-gold-deep/40 transition"
              />
              <span className="absolute right-2.5 top-1.5 text-xs font-bold text-gold-deep">g</span>
            </div>

            {/* Quick Weight Chips */}
            <div className="flex flex-wrap gap-1 mt-1">
              {[0.5, 1.0, 2.5, 5.0, 10.0].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => addWeight(val)}
                  className="px-1.5 py-0.5 rounded-lg bg-white text-maroon/70 border border-line/20 text-[10px] font-medium hover:bg-cream hover:text-maroon-deep hover:border-gold-deep/40 active:scale-95 transition"
                >
                  +{val}g
                </button>
              ))}
              <button
                type="button"
                onClick={() => setWeight('')}
                className="px-1.5 py-0.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-medium hover:bg-rose-100 active:scale-95 transition"
              >
                C
              </button>
            </div>
          </div>

          {/* Upah Tukang (RM) */}
          <div className="bg-cream p-2 rounded-xl border border-line/15">
            <div className="flex justify-between items-center mb-0.5">
              <label htmlFor="calc-workmanship" className="text-[10px] sm:text-[11px] font-semibold text-maroon/65">
                3. Upah Tukang (RM)
              </label>
              <span className="text-[10px] text-maroon/45">Kadar upah</span>
            </div>
            <div className="relative">
              <input
                id="calc-workmanship"
                type="number"
                step="1"
                min="0"
                placeholder="0.00"
                value={workmanship}
                onChange={(e) => setWorkmanship(e.target.value)}
                className="w-full bg-white border border-line/25 rounded-xl px-2.5 py-1 text-maroon-deep text-base font-bold font-mono focus:outline-none focus:border-gold-deep focus:ring-1 focus:ring-gold-deep/40 transition"
              />
              <span className="absolute right-2.5 top-1.5 text-xs font-bold text-gold-deep">RM</span>
            </div>

            {/* Quick Workmanship Chips */}
            <div className="flex flex-wrap gap-1 mt-1">
              {[0, 50, 80, 120, 200].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setWorkmanship(val.toString())}
                  className="px-1.5 py-0.5 rounded-lg bg-white text-maroon/70 border border-line/20 text-[10px] font-medium hover:bg-cream hover:text-maroon-deep hover:border-gold-deep/40 active:scale-95 transition"
                >
                  {val === 0 ? 'Percuma' : `RM${val}`}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* 3. Trade-In & Discount Option Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {/* Trade In Button Toggle */}
          <button
            type="button"
            onClick={() => setHasTradeIn(!hasTradeIn)}
            className={`py-1 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between transition ${
              hasTradeIn
                ? 'bg-gold/15 border-gold-deep/60 text-gold-deep shadow-sm'
                : 'bg-cream border-line/20 text-maroon/60 hover:border-gold-deep/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <ArrowRightLeft size={12} />
              <span>Tukar Emas Lama (Trade-In)</span>
            </span>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasTradeIn ? 'bg-gold-deep text-white' : 'bg-white text-maroon/50'}`}>
              {hasTradeIn ? <Check size={10} /> : '+'}
            </span>
          </button>

          {/* Discount Button Toggle */}
          <button
            type="button"
            onClick={() => setHasDiscount(!hasDiscount)}
            className={`py-1 px-2.5 rounded-xl border text-[11px] font-semibold flex items-center justify-between transition ${
              hasDiscount
                ? 'bg-gold/15 border-gold-deep/60 text-gold-deep shadow-sm'
                : 'bg-cream border-line/20 text-maroon/60 hover:border-gold-deep/40'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Tag size={12} />
              <span>Diskaun / Rebat Promosi</span>
            </span>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[9px] ${hasDiscount ? 'bg-gold-deep text-white' : 'bg-white text-maroon/50'}`}>
              {hasDiscount ? <Check size={10} /> : '+'}
            </span>
          </button>
        </div>

        {/* Collapsible Trade-In Inputs */}
        {hasTradeIn && (
          <div className="bg-cream border border-line/20 rounded-xl p-2.5 animate-in fade-in slide-in-from-top-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-bold text-maroon-deep flex items-center gap-1 font-serif">
                <Coins size={13} className="text-gold-deep" />
                Butiran Trade-In Emas Lama
              </span>
              <span className="text-[10px] text-maroon/55 font-mono">
                Kadar: {formatMYR(currentTradeInRate)}/g
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[9px] text-maroon/60 block mb-0.5">Gred Lama</label>
                <select
                  value={tradeInPurity}
                  onChange={(e) => setTradeInPurity(e.target.value as GoldPurity)}
                  className="w-full bg-white border border-line/25 rounded-lg px-2 py-1 text-xs text-maroon-deep focus:outline-none focus:border-gold-deep"
                >
                  <option value="999">Emas 999 (RM {prices['999']?.buyPrice}/g)</option>
                  <option value="916">Emas 916 (RM {prices['916']?.buyPrice}/g)</option>
                  <option value="375">Emas 375 (RM {prices['375']?.buyPrice}/g)</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] text-maroon/60 block mb-0.5">Berat Trade-In (g)</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={tradeInWeight}
                  onChange={(e) => setTradeInWeight(e.target.value)}
                  className="w-full bg-white border border-line/25 rounded-lg px-2 py-1 text-xs text-maroon-deep focus:outline-none focus:border-gold-deep"
                />
              </div>
            </div>
            {quotation.tradeInAmount > 0 && (
              <p className="text-[10px] text-emerald-700 font-semibold mt-1 text-right">
                Potongan Trade-in: -{formatMYR(quotation.tradeInAmount)}
              </p>
            )}
          </div>
        )}

        {/* Collapsible Discount Inputs */}
        {hasDiscount && (
          <div className="bg-cream border border-line/20 rounded-xl p-2.5 animate-in fade-in slide-in-from-top-1">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[11px] font-bold text-maroon-deep font-serif">Tetapan Diskaun</span>
              <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-line/20 text-[10px]">
                <button
                  type="button"
                  onClick={() => setDiscountType('fixed')}
                  className={`px-1.5 py-0.5 rounded ${discountType === 'fixed' ? 'bg-maroon-deep text-gold font-bold' : 'text-maroon/55'}`}
                >
                  RM
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('percent')}
                  className={`px-1.5 py-0.5 rounded ${discountType === 'percent' ? 'bg-maroon-deep text-gold font-bold' : 'text-maroon/55'}`}
                >
                  %
                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                step={discountType === 'percent' ? '1' : '5'}
                min="0"
                placeholder="0"
                value={discount}
                onChange={(e) => setDiscount(e.target.value)}
                className="flex-1 bg-white border border-line/25 rounded-lg px-2 py-1 text-xs text-maroon-deep focus:outline-none focus:border-gold-deep"
              />
              <span className="text-xs font-bold text-gold-deep">{discountType === 'percent' ? '%' : 'RM'}</span>
            </div>
          </div>
        )}

      </div>

      {/* Breakdown and Grand Total Box */}
      <div className="bg-gold/10 border border-gold-deep/30 rounded-2xl p-2.5 sm:p-3 shadow-sm mt-0.5">
        
        {/* Subtotal line items */}
        <div className="space-y-0.5 text-[10px] sm:text-[11px] text-maroon/65 pb-1.5 mb-1.5 border-b border-gold-deep/20">
          <div className="flex justify-between">
            <span>Kos Emas ({formatWeight(quotation.weight)} × {formatMYR(quotation.pricePerGram)}):</span>
            <span className="font-mono text-maroon-deep">{formatMYR(quotation.goldCost)}</span>
          </div>
          <div className="flex justify-between">
            <span>Upah Tukang:</span>
            <span className="font-mono text-maroon-deep">{formatMYR(quotation.workmanship)}</span>
          </div>
          {quotation.discountAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Diskaun ({discountType === 'percent' ? `${discount}%` : 'Tunai'}):</span>
              <span className="font-mono">-{formatMYR(quotation.discountAmount)}</span>
            </div>
          )}
          {quotation.tradeInAmount > 0 && (
            <div className="flex justify-between text-emerald-700 font-medium">
              <span>Nilai Trade-In ({formatWeight(quotation.tradeInWeight)} {quotation.tradeInPurity}):</span>
              <span className="font-mono">-{formatMYR(quotation.tradeInAmount)}</span>
            </div>
          )}
        </div>

        {/* Grand Total */}
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[9px] sm:text-[10px] font-bold text-gold-deep uppercase tracking-widest block">
              JUMLAH BERSIH PERLU BAYAR
            </span>
            <span className="text-[10px] text-maroon/50">
              Harga muktamad untuk pelanggan
            </span>
          </div>

          <div className="text-right">
            <span className="text-xl sm:text-2xl font-black text-gold-deep font-sans tracking-tight">
              {formatMYR(quotation.finalTotal)}
            </span>
          </div>
        </div>

        {/* Generate / Print Quote Button */}
        <button
          type="button"
          onClick={() => onGenerateQuote(quotation)}
          className="mt-2 w-full py-2 px-3 rounded-xl bg-gold text-maroon-deep font-bold text-xs sm:text-sm tracking-wide shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] hover:bg-gold-soft active:scale-[0.98] transition flex items-center justify-center gap-2"
        >
          <FileText size={14} />
          <span>Jana Resit Sebut Harga (Quotation Slip)</span>
        </button>
      </div>

    </div>
  );
};
