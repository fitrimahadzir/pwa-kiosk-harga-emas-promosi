import { supabase } from './supabase';

export type UserRole = 'admin' | 'outlet';

export interface AuthSession {
  code: string;
  outletName: string;
  role: UserRole;
}

interface OutletRecord {
  code: string;
  name: string;
  role: string;
  is_active?: boolean;
}

const SESSION_KEY = 'emaspos_auth_session_v1';

/**
 * Local fallback accounts used while Supabase is not configured yet.
 * Once Supabase is ready, these are replaced by the `kiosk_outlets` table.
 */
const LOCAL_OUTLETS: Record<string, Omit<AuthSession, 'code'>> = {
  AMANJAYA: { outletName: 'Amanjaya Mall', role: 'outlet' },
  HQ: { outletName: 'HQ Warehouse', role: 'admin' },
};

export const LOCAL_DEMO_CODES = Object.keys(LOCAL_OUTLETS);

/**
 * Outlets renamed over time: legacy name -> current name.
 * Kept in sync with the `kiosk_outlets` table, so stored sessions and old
 * localStorage data follow the latest outlet naming.
 */
export const OUTLET_RENAMES: Record<string, string> = {
  HeadQuarters: 'HQ Warehouse',
};

/**
 * Unique outlet names known in local demo mode (Supabase not configured).
 * Used by the admin panel so per-outlet pricing can still be tried out
 * without a database.
 */
export const LOCAL_DEMO_OUTLET_NAMES: string[] = Array.from(
  new Set(Object.values(LOCAL_OUTLETS).map((outlet) => outlet.outletName)),
);

export function normalizeOutletCode(code: string): string {
  return code.trim().toUpperCase();
}

export async function loginWithOutletCode(rawCode: string): Promise<AuthSession> {
  const code = normalizeOutletCode(rawCode);

  if (!code) {
    throw new Error('Sila masukkan kod outlet.');
  }

  // Use Supabase when configured, otherwise fall back to local demo codes.
  if (supabase) {
    // Kiosk tables are prefixed with `kiosk_` because this Supabase project
    // is shared with the main site.
    // `ilike` makes the code lookup case-insensitive, since outlet codes in
    // the database may be stored in lowercase.
    const { data, error } = await supabase
      .from('kiosk_outlets')
      .select('code, name, role')
      .ilike('code', code)
      .maybeSingle();

    if (error) {
      console.error('[auth] Supabase outlet lookup failed:', error.message);
      throw new Error('Gagal menyemak kod outlet. Sila cuba lagi.');
    }

    const outlet = data as OutletRecord | null;

    if (!outlet) {
      throw new Error('Kod outlet tidak dijumpai.');
    }

    return {
      code: outlet.code,
      // Use the outlet name straight from the database (e.g. 'HQ Warehouse')
      outletName: outlet.name,
      role: outlet.role === 'admin' ? 'admin' : 'outlet',
    };
  }

  const localOutlet = LOCAL_OUTLETS[code];

  if (!localOutlet) {
    throw new Error('Kod outlet tidak sah. Sila hubungi pentadbir.');
  }

  return { code, ...localOutlet };
}

/**
 * Re-check the stored session against Supabase on app start.
 * This makes `role` from `kiosk_outlets` the source of truth, so a forged or
 * outdated localStorage session cannot keep admin access.
 *
 * When Supabase is not configured or unreachable, the existing session is kept
 * so the kiosk can still work offline.
 */
export async function refreshSession(
  session: AuthSession
): Promise<AuthSession | null> {
  if (!supabase) return session;

  const { data, error } = await supabase
    .from('kiosk_outlets')
    .select('code, name, role, is_active')
    .ilike('code', session.code)
    .maybeSingle();

  // Network / temporary failure: keep working with the stored session.
  if (error) return session;

  const outlet = data as OutletRecord | null;
  if (!outlet || outlet.is_active === false) return null;

  const role: UserRole = outlet.role === 'admin' ? 'admin' : 'outlet';

  return {
    code: outlet.code,
    // Use the outlet name straight from the database (e.g. 'HQ Warehouse')
    outletName: outlet.name,
    role,
  };
}

export function loadSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const saved = localStorage.getItem(SESSION_KEY);
    if (!saved) return null;

    const parsed = JSON.parse(saved) as Partial<AuthSession>;
    if (!parsed.code || !parsed.outletName || !parsed.role) return null;

    return {
      code: parsed.code,
      // Follow outlet renames (e.g. HeadQuarters -> HQ Warehouse).
      outletName: OUTLET_RENAMES[parsed.outletName] ?? parsed.outletName,
      role: parsed.role === 'admin' ? 'admin' : 'outlet',
    };
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}
