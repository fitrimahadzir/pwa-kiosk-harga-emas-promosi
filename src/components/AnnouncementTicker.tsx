import React from 'react';
import { Sparkles } from 'lucide-react';
import { splitAnnouncementMessages } from '../utils/announcement';

interface AnnouncementTickerProps {
  /** Teks pengumuman daripada tetapan global Supabase (satu baris = satu entri). */
  text: string;
  /** Label tetap di hadapan teks berjalan. */
  label?: string;
  className?: string;
}

/**
 * Pita pengumuman kaunter — semua teks berjalan tanpa henti (marquee).
 *
 * Setiap baris dalam `text` dijadikan satu segmen. Kumpulan segmen diduplikasi
 * dua kali di dalam trek; animasi menggeser trek sebanyak 50% supaya sambungan
 * gelung kelihatan berterusan. Tempoh animasi dikira daripada jumlah aksara
 * agar kelajuan bacaan konsisten.
 */
export const AnnouncementTicker: React.FC<AnnouncementTickerProps> = ({
  text,
  label = 'Pengumuman Kaunter',
  className = '',
}) => {
  const messages = splitAnnouncementMessages(text);
  if (messages.length === 0) return null;

  const totalChars = messages.reduce((sum, message) => sum + message.length, 0);
  // ~0.3s per aksara, dihadkan supaya teks pendek/panjang tetap selesa dibaca.
  const durationSeconds = Math.min(120, Math.max(20, Math.round(totalChars * 0.3)));

  const renderGroup = (duplicate: boolean) => (
    <span className="gr-marquee-group" aria-hidden={duplicate || undefined}>
      {messages.map((message, index) => (
        <span
          key={`${duplicate ? 'dup' : 'src'}-${index}`}
          className="gr-marquee-item"
        >
          {message}
          <span className="mx-5 text-gold-deep/45 sm:mx-8" aria-hidden="true">
            •
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div className={`flex min-w-0 items-center gap-2 ${className}`}>
      <Sparkles size={12} className="shrink-0 animate-pulse text-gold-deep" aria-hidden="true" />
      <span className="shrink-0 font-semibold text-maroon-deep">{label}:</span>
      <div className="relative min-w-0 flex-1 overflow-hidden">
        <div className="gr-marquee" style={{ animationDuration: `${durationSeconds}s` }}>
          {renderGroup(false)}
          {renderGroup(true)}
        </div>
      </div>
    </div>
  );
};
