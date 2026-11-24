import React from 'react';

interface DetailPageBannerProps {
  imageUrl: string;
  alt: string;
  /** Teks kecil di atas label. */
  kicker?: string;
  /** Label besar di bawah banner. */
  title: string;
  /** Poster guna `contain` supaya tidak terpotong; banner guna `cover`. */
  fit?: 'cover' | 'contain';
}

/**
 * Panel gambar 3:4 yang dikongsi oleh halaman Staff, Kalkulator dan Detail
 * Promosi. Dirapat ke tepi kiri dan sejajar dengan blok tajuk di atas —
 * susunan, saiz dan label overlay sama persis pada ketiga-tiga halaman.
 */
export const DetailPageBanner: React.FC<DetailPageBannerProps> = ({
  imageUrl,
  alt,
  kicker = 'Gold Reserve',
  title,
  fit = 'cover',
}) => (
  <div className="relative flex w-full max-w-[min(420px,max(160px,calc((100dvh_-_15rem)_*_0.75)))] items-center justify-center self-start overflow-hidden rounded-2xl border border-[#d4a13a]/30 bg-[#2a0404] p-2.5 shadow-xl sm:p-3">
    <img
      src={imageUrl}
      alt={alt}
      className={`aspect-[3/4] w-full rounded-xl ${
        fit === 'contain' ? 'object-contain' : 'object-cover'
      }`}
    />
    <div className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-xl bg-[#2a0404]/75 px-3 py-2 backdrop-blur-sm">
      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-gold-soft">
        {kicker}
      </p>
      <p className="mt-0.5 truncate font-heading text-lg font-bold text-cream sm:text-xl">
        {title}
      </p>
    </div>
  </div>
);
