import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

/**
 * Supabase diperlukan untuk:
 *   - memaparkan harga terkini (baca awam, read-only)
 *   - log masuk admin melalui Supabase Auth
 *
 * Tiada fallback demo: jika env tiada, aplikasi gagal tertutup (fail closed).
 */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function projectRefFromUrl(url: string): string {
  try {
    return new URL(url).hostname.split('.')[0] || '';
  } catch {
    return '';
  }
}

function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '••••••••';
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

/**
 * Safe, display-only Supabase metadata for the admin settings panel.
 * The raw anon key is never exposed here; it is already public in the bundle,
 * but the UI only needs to confirm which key is loaded.
 */
export const supabaseConfig = {
  url: supabaseUrl,
  projectRef: projectRefFromUrl(supabaseUrl),
  anonKeyPreview: maskKey(supabaseAnonKey),
};

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
