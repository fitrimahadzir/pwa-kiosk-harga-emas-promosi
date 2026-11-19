import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
} from 'lucide-react';
import { PromoItem } from '../types/gold';

interface PromoCarouselProps {
  promos: PromoItem[];
  /** Buka halaman detail poster (2 lajur: poster + penerangan pakej). */
  onOpenDetail: (promo: PromoItem) => void;
}

export const PromoCarousel: React.FC<PromoCarouselProps> = ({
  promos,
  onOpenDetail,
}) => {
  const activePromos = promos.filter((p) => p.isActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Auto-play timer
  useEffect(() => {
    if (activePromos.length <= 1 || isPaused) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activePromos.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [activePromos.length, isPaused]);

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

  if (activePromos.length === 0) {
    return (
      <div className="gr-card-light p-6 h-full w-full flex flex-col items-center justify-center text-center">
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
    <div
      className="relative bg-[#fffdf9] border border-line/15 rounded-2xl overflow-hidden shadow-xl flex flex-col w-full max-w-[430px] portrait:max-w-none aspect-[3/4] portrait:sm:aspect-[3/1] mx-auto landscape:mx-0 landscape:h-full landscape:w-full landscape:max-w-none landscape:aspect-auto group"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Main Banner Image Container (Nisbah 3:4) */}
      <div
        onClick={() => current && onOpenDetail(current)}
        className="relative w-full h-full overflow-hidden cursor-pointer aspect-[3/4]"
        title="Tekan untuk lihat poster penuh & maklumat pakej"
      >
        {/* Mobile portrait: single 3:4 poster */}
        <img
          src={current.imageUrl}
          alt="Poster promosi"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105 portrait:sm:hidden"
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
                alt={slot === 0 ? 'Poster promosi' : ''}
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                loading="lazy"
              />
            </div>
          ))}
        </div>

        {/* Top Floating Controls: Page Indicator & Detail */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
          <span className="px-2 py-0.5 rounded-lg bg-black/70 text-[#ece2d0] text-[10px] font-mono backdrop-blur-sm border border-white/20">
            {currentIndex + 1} / {activePromos.length}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (current) onOpenDetail(current);
            }}
            className="p-1.5 rounded-xl bg-[#2a0404]/80 text-[#ece2d0] hover:text-[#d4a13a] border border-[#d4a13a]/40 backdrop-blur-md transition shadow-md"
            title="Lihat Detail Poster"
            aria-label="Lihat detail poster"
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
        onClick={() => current && onOpenDetail(current)}
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
          Sentuh untuk lihat detail
        </span>
      </div>
    </div>
  );
};
