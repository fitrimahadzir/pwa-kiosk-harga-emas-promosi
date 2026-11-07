import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Check, 
  Share2, 
  FileCheck, 
  Building2, 
  Phone, 
  MapPin, 
  Calendar 
} from 'lucide-react';
import { QuotationResult, ShopSettings } from '../types/gold';
import { formatMYR, formatWeight } from '../utils/calculator';

interface QuotationModalProps {
  quote: QuotationResult | null;
  settings: ShopSettings;
  onClose: () => void;
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  quote,
  settings,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!quote) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleCopyWhatsApp = () => {
    const text = `*SEBUT HARGA RASMI — ${settings.shopName}*\n` +
      `No. Rujukan: ${quote.quoteId}\n` +
      `Tarikh: ${new Date(quote.timestamp).toLocaleString('ms-MY')}\n` +
      `--------------------------------\n` +
      `• Gred Emas: Emas ${quote.purity} (${quote.karat})\n` +
      `• Berat: ${formatWeight(quote.weight)}\n` +
      `• Kadar Semasa: ${formatMYR(quote.pricePerGram)}/g\n` +
      `• Kos Emas: ${formatMYR(quote.goldCost)}\n` +
      `• Upah Tukang: ${formatMYR(quote.workmanship)}\n` +
      (quote.discountAmount > 0 ? `• Diskaun: -${formatMYR(quote.discountAmount)}\n` : '') +
      (quote.hasTradeIn && quote.tradeInAmount > 0 ? `• Tolak Trade-In (${formatWeight(quote.tradeInWeight)} ${quote.tradeInPurity}): -${formatMYR(quote.tradeInAmount)}\n` : '') +
      `--------------------------------\n` +
      `*JUMLAH BERSIH: ${formatMYR(quote.finalTotal)}*\n\n` +
      `Hubungi: ${settings.phone} | ${settings.branch}`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div 
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in overflow-y-auto"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gradient-to-b from-[#3b0707] to-[#2a0404] border-2 border-[#d4a13a]/60 rounded-3xl max-w-md w-full p-4 sm:p-5 text-white shadow-2xl flex flex-col my-auto"
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-[#2a0404]/80 text-[#ece2d0] hover:text-[#d4a13a] border border-[#d4a13a]/40 transition print:hidden"
          aria-label="Tutup"
        >
          <X size={18} />
        </button>

        {/* Printable thermal-style slip */}
        <div
          id="quotation-slip"
          className="bg-white text-neutral-900 border border-neutral-300 rounded-lg p-4 sm:p-5 text-left font-mono text-[11px] leading-snug shadow-inner"
        >
          
          {/* Slip Header */}
          <div className="text-center pb-3 border-b border-dashed border-neutral-400">
            <img
              src="/icons/icon-192.png"
              alt={`Logo ${settings.shopName}`}
              className="inline-block w-10 h-10 object-contain grayscale mb-1.5"
            />
            <h2 className="text-base font-bold text-black tracking-wide uppercase">
              {settings.shopName}
            </h2>
            <p className="text-[10px] text-neutral-700 mt-0.5">{settings.tagline}</p>
            <p className="text-[10px] text-neutral-700 mt-0.5">{settings.branch}</p>
            <p className="text-[10px] text-neutral-700">Tel: {settings.phone}</p>
            <div className="inline-block mt-2 px-2 py-0.5 border border-neutral-500 text-[9px] font-bold tracking-widest uppercase">
              SEBUT HARGA JUALAN KAUNTER
            </div>
          </div>

          {/* Reference & Date */}
          <div className="flex justify-between items-start gap-3 py-2 text-[10px] text-neutral-700 border-b border-dashed border-neutral-400">
            <span>No: <strong className="text-black">{quote.quoteId}</strong></span>
            <span className="text-right">
              {new Date(quote.timestamp).toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Item details */}
          <div className="py-2.5 space-y-1.5 text-xs">
            <div className="flex justify-between items-start gap-2">
              <div>
                <span className="font-bold text-black block text-xs">
                  Barang Kemas Emas {quote.purity}
                </span>
                <span className="text-[10px] text-neutral-600 uppercase">
                  Ketulenan {quote.karat}
                </span>
              </div>
              <div className="text-right">
                <span className="font-bold text-black text-xs block">
                  {formatWeight(quote.weight)}
                </span>
                <span className="text-[10px] text-neutral-600">
                  @{formatMYR(quote.pricePerGram)}/g
                </span>
              </div>
            </div>

            {/* Financial breakdown */}
            <div className="space-y-1 pt-1.5 text-[11px] text-neutral-700">
              <div className="flex justify-between gap-2">
                <span>Nilai Berat Emas:</span>
                <span className="font-bold text-black">{formatMYR(quote.goldCost)}</span>
              </div>

              <div className="flex justify-between gap-2">
                <span>Upah Tukang:</span>
                <span className="font-bold text-black">{formatMYR(quote.workmanship)}</span>
              </div>

              {quote.discountAmount > 0 && (
                <div className="flex justify-between gap-2 font-semibold text-black">
                  <span>Potongan Diskaun:</span>
                  <span>-{formatMYR(quote.discountAmount)}</span>
                </div>
              )}

              {quote.hasTradeIn && quote.tradeInAmount > 0 && (
                <div className="flex justify-between gap-2 font-semibold text-black">
                  <span>Tukar Emas Lama ({formatWeight(quote.tradeInWeight)} Emas {quote.tradeInPurity}):</span>
                  <span>-{formatMYR(quote.tradeInAmount)}</span>
                </div>
              )}
            </div>

            {/* Total */}
            <div className="mt-2 pt-2 border-t-2 border-neutral-800 flex justify-between items-baseline gap-2">
              <div>
                <span className="text-[11px] font-bold text-black uppercase tracking-wider block">
                  JUMLAH BERSIH
                </span>
                <span className="text-[9px] text-neutral-600">
                  Termasuk upah & penolakan
                </span>
              </div>
              <span className="text-xl font-black text-black tracking-tight">
                {formatMYR(quote.finalTotal)}
              </span>
            </div>

          </div>

          {/* Disclaimer footer */}
          <div className="pt-2 border-t border-dashed border-neutral-400 text-[9px] text-neutral-600 text-center leading-normal">
            Sebut harga ini sah pada tarikh dan masa yang tertera di atas sahaja mengikut kadar pasaran emas harian.
          </div>

        </div>

        {/* Modal Action Buttons */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handleCopyWhatsApp}
            className="py-2.5 px-4 rounded-xl bg-[#2a0404] border border-[#d4a13a]/40 text-[#ece2d0] font-semibold text-xs hover:border-[#d4a13a] transition flex items-center justify-center gap-1.5"
          >
            {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
            <span>{copied ? 'Teks Disalin!' : 'Salin WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-4 rounded-xl bg-[#d4a13a] text-[#3b0707] font-bold text-xs shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] hover:bg-[#d8be8a] active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Printer size={14} />
            <span>Cetak / Simpan Slip</span>
          </button>
        </div>

      </div>
    </div>
  );
};
