import { supabase } from './supabase';

/**
 * Admin authentication.
 *
 * Admin ialah pengguna Supabase Auth (e-mel + kata laluan) yang didaftarkan
 * dalam public.kiosk_admins. Outlet / kiosk tidak menggunakan modul ini —
 * paparan kiosk adalah baca-sahaja dan tidak memerlukan kelayakan.
 *
 * Semua kegagalan (rangkaian, sesi tamat, pengguna bukan admin) gagal
 * TERTUTUP: pulangkan null dan buang sesi. Tiada fallback kod, tiada
 * `role` daripada localStorage.
 */
export interface AdminSession {
  userId: string;
  email: string;
}

const GENERIC_LOGIN_ERROR = 'E-mel atau kata laluan tidak sah.';

async function verifyAdmin(userId: string, email: string | undefined): Promise<AdminSession | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('kiosk_admins')
    .select('user_id, is_active')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data || data.is_active !== true) return null;

  return { userId, email: email ?? '' };
}

export async function signInAdmin(email: string, password: string): Promise<AdminSession> {
  if (!supabase) {
    throw new Error('Supabase belum dikonfigurasi. Hubungi pentadbir sistem.');
  }

  const cleanEmail = email.trim().toLowerCase();

  if (!cleanEmail || !password) {
    throw new Error('Sila masukkan e-mel dan kata laluan.');
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  // Jangan dedahkan sama ada e-mel wujud atau tidak.
  if (error || !data.user) {
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  const session = await verifyAdmin(data.user.id, data.user.email ?? undefined);

  if (!session) {
    await supabase.auth.signOut();
    throw new Error(GENERIC_LOGIN_ERROR);
  }

  return session;
}

/**
 * Baca sesi Supabase Auth semasa dan sahkan semula bahawa pengguna masih
 * admin yang aktif. Jika tidak, buang sesi dan pulangkan null.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  if (!supabase) return null;

  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    if (data.session && supabase) {
      await supabase.auth.signOut();
    }
    return null;
  }

  const admin = await verifyAdmin(
    data.session.user.id,
    data.session.user.email ?? undefined,
  );

  if (!admin) {
    await supabase.auth.signOut();
    return null;
  }

  return admin;
}

export async function signOutAdmin(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}
