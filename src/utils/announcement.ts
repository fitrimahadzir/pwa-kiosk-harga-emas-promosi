/**
 * Pengumuman kaunter disimpan sebagai teks berbilang baris dalam
 * `kiosk_announcement.message` — satu baris mewakili satu entri marquee.
 * Ini membolehkan admin menambah banyak teks tanpa perubahan skema.
 */

/** Had aksara bagi setiap entri pengumuman. */
export const ANNOUNCEMENT_MAX_LENGTH = 280;

/** Pecahkan teks berbilang baris kepada senarai entri (buang baris kosong). */
export function splitAnnouncementMessages(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/** Normalisasi entri sebelum disimpan: kemas ruang, had aksara, buang kosong. */
export function normalizeAnnouncementMessages(messages: string[]): string[] {
  return messages
    .map((message) =>
      message.replace(/\s+/g, ' ').trim().slice(0, ANNOUNCEMENT_MAX_LENGTH),
    )
    .filter((message) => message.length > 0);
}

/** Satu rentetan untuk Supabase — satu entri per baris. */
export function joinAnnouncementMessages(messages: string[]): string {
  return normalizeAnnouncementMessages(messages).join('\n');
}
