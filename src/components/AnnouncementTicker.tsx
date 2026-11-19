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

  // Ulang senarai mesej supaya setiap separuh trek cukup lebar untuk gelung
  // yang lancar walaupun teks pengumuman pendek.
  let groupMessages = messages;
  let groupChars = totalChars;
  while (groupChars < 220 && groupMessages.length < 60) {
    groupMessages = [...groupMessages, ...messages];
    groupChars += totalChars;
  }

  // ~0.28s per aksara (berdasarkan lebar separuh trek) untuk kelajuan bacaan konsisten.
  const durationSeconds = Math.min(160, Math.max(18, Math.round(groupChars * 0.28)));

  const renderGroup = (duplicate: boolean) => (
    <span className="gr-marquee-group" aria-hidden={duplicate || undefined}>
      {groupMessages.map((message, index) => (
        <span
          key={`${duplicate ? 'dup' : 'src'}-${index}`}
          className="gr-marquee-item"
        >
          {message}
          <Sparkles
            size={10}
            className="mx-5 shrink-0 animate-pulse text-gold-deep/60 sm:mx-8"
            aria-hidden="true"
          />
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
