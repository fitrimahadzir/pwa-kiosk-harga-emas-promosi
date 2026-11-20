import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Printer,
  Check,
  CheckCircle2,
  Share2,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { QuotationResult, ShopSettings } from '../types/gold';
import { formatMYR, formatWeight } from '../utils/calculator';
import type { ReceiptSaveResult } from '../utils/storage';

interface QuotationModalProps {
  quote: QuotationResult | null;
  settings: ShopSettings;
  /** Nombor resit GRJ dari server — kosong jika resit belum disimpan. */
  receiptNumber?: string;
  /** Outlet yang sedang digunakan kiosk (fallback kepada settings.outletName). */
  outletName?: string;
  /**
   * Simpan sebut harga ke Supabase. Fungsi sedia ada (`pushReceipt` di App)
   * menjana nombor GRJ dan menulis ke `kiosk_receipts` melalui RPC.
   */
  onSaveReceipt?: (quote: QuotationResult) => Promise<ReceiptSaveResult>;
  onClose: () => void;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function formatReceiptDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || '—';
  return date.toLocaleString('ms-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Teks ringkas, kemas dan lengkap untuk dihantar ke WhatsApp. */
function buildWhatsAppMessage(
  quote: QuotationResult,
  savedNumber: string,
  outletName: string,
  address: string,
  phone: string,
): string {
  const lines: string[] = [
    '*GOLDRESERVE JEWELRY*',
  ];

  if (outletName) lines.push(outletName);
  if (address) lines.push(address);
  if (phone) lines.push(`Tel: ${phone}`);

  lines.push(
    '',
    '*SEBUT HARGA KIOSK*',
    `No. Resit: ${savedNumber || '—'}`,
    `Tarikh/Masa: ${formatReceiptDateTime(quote.timestamp)}`,
    '----------------------------',
    `Produk: Emas ${quote.purity}`,
    `Ketulenan: ${quote.karat}`,
  );

  if (quote.packagePrice && quote.packagePrice > 0) {
    lines.push(`Pakej: ${quote.packageTitle || 'Pakej Promosi'}`);
    lines.push(`Harga Pakej: ${formatMYR(quote.packagePrice)}`);
  } else {
    lines.push(`Berat: ${formatWeight(quote.weight)}`);
    lines.push(`Harga Emas: ${formatMYR(quote.pricePerGram)}/gram`);
    lines.push(`Nilai Berat Emas: ${formatMYR(quote.goldCost)}`);
    lines.push(`Upah Tukang: ${formatMYR(quote.workmanship)}`);
  }

  if (quote.discountAmount > 0) {
    lines.push(`Diskaun: -${formatMYR(quote.discountAmount)}`);
  }
  if (quote.hasTradeIn && quote.tradeInAmount > 0) {
    lines.push(
      `Tolak Trade-In (${formatWeight(quote.tradeInWeight)} Emas ${quote.tradeInPurity}): -${formatMYR(quote.tradeInAmount)}`,
    );
  }

  lines.push(
    '----------------------------',
    `*JUMLAH BERSIH: ${formatMYR(quote.finalTotal)}*`,
    '',
    'Sebut harga ini sah pada tarikh dan masa yang tertera sahaja.',
  );
  if (phone) lines.push(`Hubungi: ${phone}`);

  return lines.join('\n');
}

export const QuotationModal: React.FC<QuotationModalProps> = ({
  quote,
  settings,
  receiptNumber = '',
  outletName = '',
  onSaveReceipt,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveMessage, setSaveMessage] = useState('');
  const saveRequestRef = useRef(false);

  // Sebut harga baharu bermula dengan status simpanan yang kosong.
  useEffect(() => {
    saveRequestRef.current = false;
    setSaveState('idle');
    setSaveMessage('');
  }, [quote?.quoteId]);

  if (!quote) return null;

  // Nombor resit GRJ dijana di server bila rekod disimpan.
  // Sebut harga yang belum disimpan TIADA nombor — jangan guna quoteId.
  const savedNumber = receiptNumber.trim();
  const isSaved = Boolean(savedNumber) || saveState === 'saved';

  // Maklumat outlet sentiasa diambil dari tetapan outlet yang sedang login.
  const displayOutletName =
    outletName.trim() || settings.outletName.trim() || settings.branch.trim();
  const displayAddress = settings.address.trim();
  const displayPhone = settings.phone.trim();

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const text = buildWhatsAppMessage(
      quote,
      savedNumber,
      displayOutletName,
      displayAddress,
      displayPhone,
    );

    // Kekalkan fungsi salin sedia ada sebagai fallback / kemudahan staf.
    if (navigator.clipboard) {
      void navigator.clipboard.writeText(text).catch(() => undefined);
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2500);

    // `wa.me` membuka WhatsApp dengan mesej LENGKAP (bukan pautan kosong).
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
    if (!newWindow) {
      // Popup disekat — masih boleh hantar dari tab semasa.
      window.location.href = url;
    }
  };

  const handleSaveRecord = async () => {
    if (saveRequestRef.current) return;

    // Rekod sudah wujud (nombor GRJ dari server) → jangan tulis semula.
    if (isSaved) {
      setSaveState('saved');
      setSaveMessage(`Rekod telah disimpan${savedNumber ? ` sebagai ${savedNumber}` : ''}.`);
      return;
    }

    if (!onSaveReceipt) {
      setSaveState('error');
      setSaveMessage('Fungsi simpan tidak tersedia. Sila cuba lagi.');
      return;
    }

    saveRequestRef.current = true;
    setSaveState('saving');
    setSaveMessage('');

    try {
      const result = await onSaveReceipt(quote);
      if (result.ok) {
        setSaveState('saved');
        setSaveMessage(`Rekod berjaya disimpan · ${result.receiptNumber}`);
      } else {
        setSaveState('error');
        setSaveMessage(result.error);
      }
    } catch (error) {
      setSaveState('error');
      setSaveMessage(
        error instanceof Error ? error.message : 'Gagal menyimpan rekod. Sila cuba lagi.',
      );
    } finally {
      saveRequestRef.current = false;
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in overflow-y-auto print:static print:bg-transparent print:backdrop-blur-none print:p-0 print:overflow-visible"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative bg-gradient-to-b from-[#3b0707] to-[#2a0404] border-2 border-[#d4a13a]/60 rounded-3xl max-w-md w-full p-4 sm:p-5 text-white shadow-2xl flex flex-col my-auto print:static print:block print:max-w-none print:w-auto print:border-0 print:rounded-none print:bg-white print:p-0 print:shadow-none print:m-0"
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

        {/* Printable receipt — hanya ini yang dicetak (lihat @media print). */}
        <div
          id="quotation-slip"
          className="bg-white text-neutral-900 border-2 border-[#d4a13a] rounded-xl p-4 sm:p-5 text-left font-sans text-[11px] leading-snug shadow-inner print:rounded-none"
        >
          {/* Header resit — maklumat outlet dinamik dari tetapan outlet */}
          <div className="text-center pb-3 border-b-2 border-[#d4a13a]/45">
            <img
              src="/SVG/goldreserve-mark.svg"
              alt="Logo GoldReserve"
              className="inline-block w-10 h-10 object-contain mb-1"
            />
            <h2 className="font-heading text-base font-bold text-[#3b0707] tracking-[0.08em] uppercase">
              GOLDRESERVE JEWELRY
            </h2>
            {displayOutletName && (
              <p className="text-[11px] font-semibold text-[#3b0707] mt-0.5">
                Outlet: {displayOutletName}
              </p>
            )}
            {displayAddress && (
              <p className="text-[10px] text-neutral-700 mt-0.5 leading-tight">
                {displayAddress}
              </p>
            )}
            {displayPhone && (
              <p className="text-[10px] text-neutral-700 mt-0.5">Tel: {displayPhone}</p>
            )}
            <div className="inline-block mt-2.5 px-3 py-1 rounded-md border border-[#8a5f14] bg-[#8a5f14]/5 text-[10px] font-bold tracking-[0.18em] uppercase text-[#3b0707]">
              SEBUT HARGA KIOSK
            </div>
          </div>

          {/* No. resit & tarikh / masa */}
          <div className="flex justify-between items-start gap-3 py-2.5 text-[10px] text-neutral-700 border-b border-dashed border-neutral-400">
            <span>
              No. Resit:{' '}
              <strong className="text-[#3b0707]">{savedNumber || '—'}</strong>
            </span>
            <span className="text-right">{formatReceiptDateTime(quote.timestamp)}</span>
          </div>

          {/* Butiran emas */}
          <div className="py-3 space-y-2">
            <div className="flex justify-between items-start gap-2">
              <div className="min-w-0">
                <span className="font-bold text-[#3b0707] block text-xs">
                  Emas {quote.purity}
                </span>
                <span className="text-[10px] text-neutral-600">
                  {quote.packagePrice && quote.packagePrice > 0
                    ? `Pakej: ${quote.packageTitle || 'Pakej Promosi'}`
                    : `Ketulenan ${quote.karat}`}
                </span>
              </div>
              <div className="text-right shrink-0">
                {quote.packagePrice && quote.packagePrice > 0 ? (
                  <>
                    <span className="font-bold text-[#3b0707] block text-xs">
                      Harga Tetap
                    </span>
                    <span className="text-[10px] text-neutral-600">
                      {formatMYR(quote.packagePrice)}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="font-bold text-[#3b0707] block text-xs">
                      {formatWeight(quote.weight)}
                    </span>
                    <span className="text-[10px] text-neutral-600">
                      {quote.karat} · {formatMYR(quote.pricePerGram)}/g
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Pecahan harga */}
            <div className="space-y-1 pt-1 text-[11px] text-neutral-700">
              {quote.packagePrice && quote.packagePrice > 0 ? (
                <div className="flex justify-between gap-2">
                  <span>Harga Pakej:</span>
                  <span className="font-bold text-[#3b0707]">
                    {formatMYR(quote.packagePrice)}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between gap-2">
                    <span>Nilai Berat Emas:</span>
                    <span className="font-bold text-[#3b0707]">
                      {formatMYR(quote.goldCost)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Upah Tukang:</span>
                    <span className="font-bold text-[#3b0707]">
                      {formatMYR(quote.workmanship)}
                    </span>
                  </div>
                </>
              )}

              {quote.discountAmount > 0 && (
                <div className="flex justify-between gap-2 font-semibold text-[#3b0707]">
                  <span>Potongan Diskaun:</span>
                  <span>-{formatMYR(quote.discountAmount)}</span>
                </div>
              )}

              {quote.hasTradeIn && quote.tradeInAmount > 0 && (
                <div className="flex justify-between gap-2 font-semibold text-[#3b0707]">
                  <span>
                    Tukar Emas Lama ({formatWeight(quote.tradeInWeight)} Emas{' '}
                    {quote.tradeInPurity}):
                  </span>
                  <span>-{formatMYR(quote.tradeInAmount)}</span>
                </div>
              )}
            </div>

            {/* Jumlah bersih */}
            <div className="mt-2 pt-2 border-t-2 border-[#3b0707] flex justify-between items-baseline gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#3b0707]">
                JUMLAH BERSIH
              </span>
              <span className="text-xl font-black tracking-tight text-[#3b0707]">
                {formatMYR(quote.finalTotal)}
              </span>
            </div>
          </div>

          {/* Nota kesahan */}
          <div className="pt-2 border-t border-dashed border-neutral-400 text-[9px] text-neutral-600 text-center leading-normal">
            Sebut harga ini sah pada tarikh dan masa yang tertera di atas sahaja
            mengikut kadar pasaran emas harian.
          </div>
        </div>

        {/* Baris 1 — WhatsApp & Cetak */}
        <div className="mt-4 grid grid-cols-2 gap-2.5 print:hidden">
          <button
            type="button"
            onClick={handleSendWhatsApp}
            className="py-2.5 px-3 rounded-xl bg-[#2a0404] border border-[#d4a13a]/40 text-[#ece2d0] font-semibold text-xs hover:border-[#d4a13a] transition flex items-center justify-center gap-1.5"
          >
            {copied ? (
              <Check size={14} className="text-emerald-400" />
            ) : (
              <Share2 size={14} />
            )}
            <span>{copied ? 'Mesej Disalin!' : 'Hantar ke WhatsApp'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="py-2.5 px-3 rounded-xl bg-[#d4a13a] text-[#3b0707] font-bold text-xs shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] hover:bg-[#d8be8a] active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Printer size={14} />
            <span>Cetak</span>
          </button>
        </div>

        {/* Baris 2 — Simpan Rekod (penuh lebar) */}
        <div className="mt-2.5 print:hidden">
          <button
            type="button"
            onClick={() => void handleSaveRecord()}
            disabled={saveState === 'saving'}
            className={`w-full py-2.5 px-4 rounded-xl border font-bold text-xs transition flex items-center justify-center gap-2 disabled:cursor-wait disabled:opacity-80 ${
              isSaved
                ? 'bg-emerald-500/10 border-emerald-400/50 text-emerald-300'
                : 'bg-[#3b0707] border-[#d4a13a]/50 text-[#d4a13a] hover:border-[#d4a13a] hover:bg-[#481010]'
            }`}
          >
            {saveState === 'saving' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : isSaved ? (
              <CheckCircle2 size={15} />
            ) : (
              <FileCheckIcon />
            )}
            <span>
              {saveState === 'saving'
                ? 'Menyimpan Rekod...'
                : isSaved
                  ? 'Rekod Telah Disimpan'
                  : 'Simpan Rekod'}
            </span>
          </button>

          {saveMessage && (
            <p
              role={saveState === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={`mt-2 flex items-start gap-1.5 text-[10px] leading-relaxed break-words ${
                saveState === 'error' ? 'text-rose-300' : 'text-emerald-300'
              }`}
            >
              {saveState === 'error' ? (
                <AlertCircle size={12} className="mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 size={12} className="mt-0.5 shrink-0" />
              )}
              <span>{saveMessage}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

/** Ikon kecil untuk butang simpan (elak import nama yang berkonflik). */
const FileCheckIcon: React.FC = () => (
  <svg
    width="15"
    height="15"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <path d="M14 2v6h6" />
    <path d="m9 15 2 2 4-4" />
  </svg>
);
