import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Maximize2, 
  X, 
  Calendar, 
  Share2,
  Check
} from 'lucide-react';
import { PromoItem } from '../types/gold';

interface PromoCarouselProps {
  promos: PromoItem[];
  shopPhone?: string;
  shopName?: string;
}

export const PromoCarousel: React.FC<PromoCarouselProps> = ({
  promos,
  shopPhone,
  shopName
}) => {
  const activePromos = promos.filter((p) => p.isActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [zoomedPromo, setZoomedPromo] = useState<PromoItem | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-play timer
  useEffect(() => {
    if (activePromos.length <= 1 || isPaused || zoomedPromo) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activePromos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activePromos.length, isPaused, zoomedPromo]);

  // Reset index if out of bounds
  useEffect(() => {
    if (currentIndex >= activePromos.length && activePromos.length > 0) {
      setCurrentIndex(0);
    }
  }, [activePromos.length, currentIndex]);

  const current = activePromos[currentIndex];

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activePromos.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % activePromos.length);
  };

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (activePromos.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + activePromos.length) % activePromos.length);
  };

  const handleSharePromo = (promo: PromoItem) => {
    const text = `*${promo.title}*\n${promo.subtitle}\nSah Sehingga: ${promo.validUntil}\n${shopName ? `Di ${shopName}` : ''}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (activePromos.length === 0) {
    return (
      <div className="gr-card-light p-6 h-full flex flex-col items-center justify-center text-center">
        <img
          src="/images/icon.png"
          alt="Gold Reserve"
          className="w-20 h-20 object-contain rounded-2xl mb-3 opacity-90 border border-line/15"
        />
        <h3 className="text-base font-bold text-maroon-deep font-serif">Tiada Promosi Aktif</h3>
        <p className="text-xs text-maroon/60 mt-1 max-w-xs">
          Pentadbir boleh menambah poster promosi baharu melalui Panel Admin.
        </p>
      </div>
    );
  }

  return (
    <>
      <div 
        className="relative bg-[#fffdf9] border border-line/15 rounded-2xl overflow-hidden shadow-xl flex flex-col w-full max-w-[430px] portrait:max-w-none aspect-[3/4] portrait:sm:aspect-[3/2] mx-auto landscape:lg:mx-0 group"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Main Banner Image Container (Nisbah 3:4) */}
        <div 
          onClick={() => setZoomedPromo(current)}
          className="relative w-full h-full overflow-hidden cursor-pointer aspect-[3/4]"
          title="Tekan untuk paparan poster penuh & maklumat lanjut (Nisbah 3:4)"
        >
          {/* Mobile portrait: single 3:4 poster */}
          <img
            src={current.imageUrl}
            alt={current.title}
            className="w-full h-full object-cover aspect-[3/4] transition-transform duration-700 ease-out group-hover:scale-105 portrait:sm:hidden"
            loading="lazy"
          />

          {/* Tablet portrait: two side-by-side 3:4 containers (3:2 combined),
              both showing the same poster image. */}
          <div className="hidden portrait:sm:flex w-full h-full">
            {[0, 1].map((slot) => (
              <div
                key={slot}
                className={`relative w-1/2 h-full overflow-hidden ${
                  slot === 0 ? 'border-r border-[#d4a13a]/25' : ''
                }`}
              >
                <img
                  src={current.imageUrl}
                  alt={slot === 0 ? current.title : ''}
                  className="w-full h-full object-cover aspect-[3/4] transition-transform duration-700 ease-out group-hover:scale-105"
                  loading="lazy"
                />
              </div>
            ))}
          </div>

          {/* Top Floating Controls: Page Indicator & Zoom */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
            <span className="px-2 py-0.5 rounded-lg bg-black/70 text-[#ece2d0] text-[10px] font-mono backdrop-blur-sm border border-white/20">
              {currentIndex + 1} / {activePromos.length}
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setZoomedPromo(current);
              }}
              className="p-1.5 rounded-xl bg-[#2a0404]/80 text-[#ece2d0] hover:text-[#d4a13a] border border-[#d4a13a]/40 backdrop-blur-md transition shadow-md"
              title="Buka Skrin Penuh"
              aria-label="Zoom promo"
            >
              <Maximize2 size={13} />
            </button>
          </div>

          {/* Left / Right Nav Arrows */}
          {activePromos.length > 1 && (
            <>
              <button
                type="button"
                onClick={handlePrev}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#2a0404]/80 text-[#ece2d0] hover:bg-[#3b0707] hover:text-[#d4a13a] border border-[#d4a13a]/40 flex items-center justify-center backdrop-blur-md transition shadow-lg opacity-85 group-hover:opacity-100 z-10"
                aria-label="Previous Promo"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                onClick={handleNext}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#2a0404]/80 text-[#ece2d0] hover:bg-[#3b0707] hover:text-[#d4a13a] border border-[#d4a13a]/40 flex items-center justify-center backdrop-blur-md transition shadow-lg opacity-85 group-hover:opacity-100 z-10"
                aria-label="Next Promo"
              >
                <ChevronRight size={18} />
              </button>
            </>
          )}
        </div>

        {/* Bottom Controls Bar (gradient only as tall as this row) */}
        <div
          onClick={() => setZoomedPromo(current)}
          className="absolute bottom-0 inset-x-0 z-10 bg-gradient-to-t from-[#2a0404] via-[#2a0404]/85 to-transparent px-3.5 pt-6 pb-2.5 flex items-center justify-between cursor-pointer"
        >
          <div className="flex items-center gap-1.5">
            {activePromos.length > 1 && activePromos.map((p, idx) => (
              <button
                key={p.id}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(idx);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  idx === currentIndex
                    ? 'w-6 bg-[#d4a13a]'
                    : 'w-2 bg-[#d4a13a]/30 hover:bg-[#d4a13a]/60'
                }`}
                aria-label={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>

          <span className="text-[10px] text-[#d8be8a] ml-auto">
            Sentuh untuk besarkan
          </span>
        </div>
      </div>

      {/* Fullscreen Lightbox Modal */}
      {zoomedPromo && (
        <div 
          onClick={() => setZoomedPromo(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#3b0707] border border-[#d4a13a]/60 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[94vh]"
          >
            {/* Close Button */}
            <button
              onClick={() => setZoomedPromo(null)}
              className="absolute top-4 right-4 z-10 p-2.5 bg-[#2a0404]/80 text-[#ece2d0] hover:text-[#d4a13a] rounded-full border border-[#d4a13a]/40 backdrop-blur-md transition shadow-lg"
              aria-label="Close Preview"
            >
              <X size={20} />
            </button>

            {/* Lightbox Image with 3:4 ratio */}
            <div className="w-full bg-black/60 flex items-center justify-center p-4 overflow-hidden">
              <img
                src={zoomedPromo.imageUrl}
                alt={zoomedPromo.title}
                className="max-h-[58vh] w-auto aspect-[3/4] object-contain rounded-2xl border border-[#d4a13a]/40 shadow-2xl"
              />
            </div>

            {/* Poster Details in Modal */}
            <div className="p-5 sm:p-6 overflow-y-auto">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-[#2a0404] text-[#d4a13a] border border-[#d4a13a]/40 rounded-full text-[11px] font-bold uppercase tracking-wider font-mono">
                  {zoomedPromo.badge || 'PROMOSI EKSKLUSIF'}
                </span>
                <span className="text-xs text-[#d8be8a] flex items-center gap-1">
                  <Calendar size={13} />
                  Sah hingga: {zoomedPromo.validUntil}
                </span>
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-[#ece2d0] font-serif">
                {zoomedPromo.title}
              </h2>
              <p className="text-sm text-[#d8be8a] mt-1 font-medium">
                {zoomedPromo.subtitle}
              </p>

              {/* Terms and conditions */}
              <div className="mt-4 bg-[#2a0404]/90 p-3.5 rounded-xl border border-[#d4a13a]/30 text-xs">
                <h4 className="font-bold text-[#d4a13a] mb-1 uppercase tracking-wider text-[11px] font-mono">
                  Terma & Syarat Promosi:
                </h4>
                <p className="text-[#ece2d0]/90 leading-relaxed">
                  {zoomedPromo.terms || 'Tertakluk kepada stok semasa dan terma kedai emas. Sila rujuk jurujual bertugas.'}
                </p>
              </div>

              {/* Action buttons */}
              <div className="mt-5 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => handleSharePromo(zoomedPromo)}
                  className="px-4 py-2.5 rounded-xl bg-[#2a0404] border border-[#d4a13a]/40 text-[#ece2d0] text-xs font-semibold hover:border-[#d4a13a] transition flex items-center gap-2"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Share2 size={14} />}
                  <span>{copied ? 'Disalin ke Papan Keratan' : 'Salin Maklumat Promosi'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setZoomedPromo(null)}
                  className="px-6 py-2.5 rounded-xl bg-[#d4a13a] text-[#3b0707] font-bold text-xs shadow-[0_12px_30px_-16px_rgba(212,161,58,0.9)] hover:bg-[#d8be8a] transition"
                >
                  Kembali ke Kaunter
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
