import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, ShoppingBag, Sparkles } from 'lucide-react';
import { PromoItem } from '../types/gold';
import { formatMYR } from '../utils/calculator';

interface PromoDetailPageProps {
  promo: PromoItem;
  shopName?: string;
  shopPhone?: string;
  onBack: () => void;
  /** Terus ke kalkulator dengan harga pakej dipratetap. */
  onBuy: (promo: PromoItem) => void;
}

/**
 * Halaman khas untuk satu poster promosi.
 * Lajur kiri: poster sepenuhnya. Lajur kanan: butiran pakej dan Beli Pantas.
 */
export const PromoDetailPage: React.FC<PromoDetailPageProps> = ({
  promo,
  shopName,
  shopPhone,
  onBack,
  onBuy,
}) => {
  const [copied, setCopied] = useState(false);
  const title = promo.title?.trim() || 'Promosi Semasa';
  const description = promo.description?.trim() || '';
  const hasPrice = promo.packagePrice > 0;

  const handleShare = () => {
    const lines = [`${title} — promosi terkini di kedai emas kami`];
    if (hasPrice) lines.push(`Harga pakej: ${formatMYR(promo.packagePrice)}`);
    if (shopName) lines.push(`Di ${shopName}`);
    if (shopPhone) lines.push(`Hubungi ${shopPhone}`);

    if (navigator.clipboard) {
      void navigator.clipboard.writeText(lines.join('\n')).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

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
            <div className="grid size-10 place-items-center rounded-xl border border-gold-deep/25 bg-gold/15 text-gold-deep">
              <Sparkles size={20} />
            </div>
            <div>
              <h1 className="font-heading text-xl font-bold tracking-wide text-maroon-deep sm:text-2xl">
                Detail Promosi
              </h1>
              <p className="text-[11px] text-maroon/60 sm:text-xs">
                Maklumat pakej dan belian pantas
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:gap-6">
        {/* Left: the poster the user tapped */}
        <div className="flex items-center justify-center overflow-hidden rounded-2xl border border-[#d4a13a]/30 bg-[#2a0404] p-3 shadow-xl sm:p-4">
          <img
            src={promo.imageUrl}
            alt={title}
            className="max-h-[68vh] w-full rounded-xl object-contain"
          />
        </div>

        {/* Right: description + quick purchase */}
        <div className="gr-card-light flex flex-col gap-5 p-5 sm:p-6">
          <div>
            <p className="gr-kicker-light">Pakej Promosi</p>
            <h2 className="mt-1.5 font-heading text-2xl font-bold leading-tight text-maroon-deep sm:text-3xl">
              {title}
            </h2>
          </div>

          <div className="gr-hairline" />

          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-maroon/55">
              Penerangan
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-maroon-deep/80">
              {description || 'Tiada penerangan untuk pakej ini. Sila rujuk poster atau hubungi kedai.'}
            </p>
          </div>

          <div className="rounded-2xl border border-gold-deep/30 bg-gold/10 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-gold-deep">
              Harga Pakej
            </p>
            <p className="mt-1 font-sans text-3xl font-black tracking-tight text-gold-deep">
              {hasPrice ? formatMYR(promo.packagePrice) : 'RM 0.00'}
            </p>
            {!hasPrice && (
              <p className="mt-1 text-[11px] text-maroon/55">
                Harga belum ditetapkan oleh admin.
              </p>
            )}
          </div>

          <div className="mt-auto space-y-2.5">
            <button
              type="button"
              onClick={() => onBuy(promo)}
              disabled={!hasPrice}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold px-4 py-3 text-sm font-bold text-maroon-deep shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] transition hover:bg-gold-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ShoppingBag size={16} />
              <span>Beli Pantas</span>
              <ArrowRight size={16} />
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line/20 bg-cream px-4 py-2.5 text-xs font-semibold text-maroon/70 transition hover:border-gold-deep/40 hover:text-maroon-deep"
            >
              {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
              <span>{copied ? 'Maklumat disalin' : 'Salin Maklumat Kedai'}</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
