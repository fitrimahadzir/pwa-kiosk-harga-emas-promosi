import {
  GoldPriceItem,
  GoldPurity,
  PromoItem,
  PriceHistoryEntry,
  ShopSettings,
} from '../types/gold';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** Outlet yang pernah dinamakan semula: nama lama -> nama semasa. */
export const OUTLET_RENAMES: Record<string, string> = {
  HeadQuarters: 'HQ Warehouse',
};

/**
 * Hanya pilihan outlet semasa disimpan pada peranti (sessionStorage).
 * Semua DATA perniagaan — harga, poster, tetapan, sejarah — datang dari
 * Supabase. Tiada cache localStorage lagi.
 */
const CURRENT_OUTLET_KEY = 'emaspos_current_outlet_v1';

export const DEFAULT_PRICES: Record<GoldPurity, GoldPriceItem> = {
  '999': {
    purity: '999',
    label: 'Emas 999',
    karat: '24K',
    fineness: '99.9%',
    sellPrice: 468.0,
    buyPrice: 422.0,
    previousSellPrice: 465.0,
    updatedAt: new Date().toISOString(),
  },
  '916': {
    purity: '916',
    label: 'Emas 916',
    karat: '22K',
    fineness: '91.6%',
    sellPrice: 428.0,
    buyPrice: 382.0,
    previousSellPrice: 425.0,
    updatedAt: new Date().toISOString(),
  },
  '375': {
    purity: '375',
    label: 'Emas 375',
    karat: '9K',
    fineness: '37.5%',
    sellPrice: 188.0,
    buyPrice: 142.0,
    previousSellPrice: 185.0,
    updatedAt: new Date().toISOString(),
  },
};

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'GOLD RESERVE',
  outletName: 'Amanjaya Mall',
  branch: 'Cawangan Utama (Kaunter Jualan)',
  phone: '012-8899 375',
  address: 'No. 18-G, Jalan Sultan Ismail, 50250 Kuala Lumpur',
  tagline: 'Ketulenan Terjamin • Nilai Warisan Sepanjang Zaman',
  currency: 'MYR',
};

function requireClient() {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase belum dikonfigurasi.');
  }
  return supabase;
}

function isGoldPurity(value: string): value is GoldPurity {
  return value === '999' || value === '916' || value === '375';
}

function cloneDefaultPrices(): Record<GoldPurity, GoldPriceItem> {
  return {
    '999': { ...DEFAULT_PRICES['999'] },
    '916': { ...DEFAULT_PRICES['916'] },
    '375': { ...DEFAULT_PRICES['375'] },
  };
}

/**
 * Nama outlet yang selamat dipaparkan di kiosk.
 * `Admin` disekat sebagai pertahanan tambahan walaupun server sudah menapis
 * `role = 'outlet'`.
 */
function sanitizePublicOutletNames(names: unknown[]): string[] {
  const unique = new Set<string>();
  for (const value of names) {
    if (typeof value !== 'string') continue;
    const name = value.trim();
    if (!name) continue;
    if (name.toLowerCase() === 'admin') continue;
    unique.add(name);
  }
  return Array.from(unique).sort();
}

// ---------------------------------------------------------------------------
// Pilihan outlet pada peranti (bukan data perniagaan)
// ---------------------------------------------------------------------------

export function loadCurrentOutletName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = sessionStorage.getItem(CURRENT_OUTLET_KEY);
    if (!saved) return null;
    return OUTLET_RENAMES[saved] ?? saved;
  } catch {
    return null;
  }
}

export function saveCurrentOutletName(outletName: string) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(CURRENT_OUTLET_KEY, outletName);
  } catch {
    // sessionStorage disekat — pilihan outlet kekal dalam memori sahaja.
  }
}

export function clearCurrentOutletName() {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CURRENT_OUTLET_KEY);
  } catch {
    // ignore
  }
}

/**
 * Buang sisa cache localStorage daripada versi lama. Semua data perniagaan
 * kini datang dari Supabase, jadi kunci `emaspos_*` di localStorage tidak
 * lagi digunakan dan boleh dipadam terus.
 */
export function purgeLegacyLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    const staleKeys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith('emaspos_')) staleKeys.push(key);
    }
    for (const key of staleKeys) localStorage.removeItem(key);
  } catch {
    // localStorage disekat — tiada apa yang perlu dibersihkan.
  }
}

// ---------------------------------------------------------------------------
// Outlet
// ---------------------------------------------------------------------------

/** Senarai nama outlet awam (role = 'outlet') terus daripada server. */
export async function fetchOutletNames(): Promise<string[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase.rpc('kiosk_outlet_names');

  if (error) {
    console.warn('[emaspos] Gagal membaca senarai outlet:', error.message);
    return [];
  }

  if (!Array.isArray(data)) return [];

  return sanitizePublicOutletNames(
    data.map((row) => (row as { name?: string }).name),
  );
}

// ---------------------------------------------------------------------------
// Harga
// ---------------------------------------------------------------------------

type PriceRow = {
  outlet_name?: string;
  purity?: string;
  sell_price?: number | string;
  buy_price?: number | string;
  updated_at?: string;
};

function applyPriceRow(
  target: Record<GoldPurity, GoldPriceItem>,
  row: PriceRow,
): boolean {
  const purity = row.purity;
  if (typeof purity !== 'string' || !isGoldPurity(purity)) return false;

  const sell = Number(row.sell_price);
  const buy = Number(row.buy_price);
  if (!Number.isFinite(sell) || !Number.isFinite(buy) || sell <= 0 || buy < 0 || buy > sell) {
    return false;
  }

  target[purity] = {
    ...target[purity],
    sellPrice: sell,
    buyPrice: buy,
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
  return true;
}

/** Baca harga terkini sesuatu outlet. Pulangkan null jika tiada/ralat. */
export async function fetchOutletPrices(
  outletName: string,
): Promise<Record<GoldPurity, GoldPriceItem> | null> {
  if (!isSupabaseConfigured || !supabase) return null;

  const { data, error } = await supabase
    .from('kiosk_prices')
    .select('outlet_name, purity, sell_price, buy_price, updated_at')
    .eq('outlet_name', outletName);

  if (error) {
    console.warn('[emaspos] Gagal membaca harga:', error.message);
    return null;
  }
  if (!Array.isArray(data) || data.length === 0) return null;

  const next = cloneDefaultPrices();
  let found = false;

  for (const row of data as PriceRow[]) {
    if (applyPriceRow(next, row)) found = true;
  }

  return found ? next : null;
}

/** Semua harga untuk jadual perbandingan admin. */
export async function fetchAllOutletPrices(): Promise<
  Record<string, Record<GoldPurity, GoldPriceItem>>
> {
  if (!isSupabaseConfigured || !supabase) return {};

  const { data, error } = await supabase
    .from('kiosk_prices')
    .select('outlet_name, purity, sell_price, buy_price, updated_at');

  if (error) {
    console.warn('[emaspos] Gagal membaca semua harga:', error.message);
    return {};
  }
  if (!Array.isArray(data)) return {};

  const byOutlet: Record<string, Record<GoldPurity, GoldPriceItem>> = {};

  for (const row of data as PriceRow[]) {
    const outletName = typeof row.outlet_name === 'string' ? row.outlet_name : '';
    if (!outletName) continue;
    const target = byOutlet[outletName] ?? cloneDefaultPrices();
    if (applyPriceRow(target, row)) byOutlet[outletName] = target;
  }

  return byOutlet;
}

/**
 * Tulis harga ke server. Hanya berjaya untuk admin yang disahkan oleh RLS
 * (`public.is_kiosk_admin()`). Outlet / anon akan ditolak oleh pangkalan data.
 */
export async function pushOutletPrices(
  outletName: string,
  prices: Record<GoldPurity, GoldPriceItem>,
  note = '',
): Promise<void> {
  const db = requireClient();

  const priceData = (['999', '916', '375'] as GoldPurity[]).map((purity) => ({
    outlet_name: outletName,
    purity,
    sell_price: prices[purity].sellPrice,
    buy_price: prices[purity].buyPrice,
    note,
  }));

  const { error } = await db
    .from('kiosk_prices')
    .upsert(priceData, { onConflict: 'outlet_name,purity' });

  if (error) {
    throw new Error(`Gagal menyimpan harga ke server: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Poster promosi
// ---------------------------------------------------------------------------

type PromoRow = {
  id?: string;
  image_url?: string | null;
  is_active?: boolean | null;
};

/** Baca semua poster promosi global dari server (sama untuk semua outlet). */
export async function fetchPromos(): Promise<PromoItem[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('kiosk_promos')
    .select('id, image_url, is_active')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('[emaspos] Gagal membaca poster promosi:', error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];

  return (data as PromoRow[]).map((row, index) => ({
    id: String(row.id ?? `promo-${index}`),
    imageUrl: row.image_url ?? '',
    isActive: row.is_active !== false,
  }));
}

/** Ganti senarai poster global di server (admin sahaja). */
export async function pushPromos(promos: PromoItem[]): Promise<void> {
  const db = requireClient();

  const rows = promos.map((promo, index) => ({
    id: promo.id,
    image_url: promo.imageUrl,
    is_active: promo.isActive,
    sort_order: index,
  }));

  if (rows.length > 0) {
    const { error } = await db
      .from('kiosk_promos')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      throw new Error(`Gagal menyimpan poster ke server: ${error.message}`);
    }
  }

  // Buang poster yang telah dipadam dari senarai.
  const { data: existing, error: existingError } = await db
    .from('kiosk_promos')
    .select('id');

  if (existingError) {
    throw new Error(`Gagal menyemak poster sedia ada: ${existingError.message}`);
  }

  const keep = new Set(promos.map((promo) => promo.id));
  const removeIds = (existing ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === 'string' && !keep.has(id));

  if (removeIds.length > 0) {
    const { error } = await db.from('kiosk_promos').delete().in('id', removeIds);
    if (error) {
      throw new Error(`Gagal memadam poster lama: ${error.message}`);
    }
  }
}

/**
 * Muat naik gambar poster ke Supabase Storage dan pulangkan URL awam.
 * Bucket `promo-posters` hanya boleh ditulis oleh admin.
 */
export async function uploadPromoImage(blob: Blob): Promise<string> {
  const db = requireClient();

  const extension =
    blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `posters/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

  const { error } = await db.storage.from('promo-posters').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    throw new Error(`Gagal memuat naik poster: ${error.message}`);
  }

  const { data } = db.storage.from('promo-posters').getPublicUrl(path);
  return data.publicUrl;
}

/** Padam fail poster dari Supabase Storage (jika URL milik bucket kita). */
export async function deletePromoImage(imageUrl: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !imageUrl) return;

  const marker = '/storage/v1/object/public/promo-posters/';
  const index = imageUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(imageUrl.slice(index + marker.length));
  await supabase.storage.from('promo-posters').remove([path]);
}

// ---------------------------------------------------------------------------
// Tetapan kedai
// ---------------------------------------------------------------------------

type SettingsRow = {
  shop_name?: string | null;
  branch?: string | null;
  phone?: string | null;
  address?: string | null;
  tagline?: string | null;
  currency?: string | null;
};

/** Baca tetapan outlet dari server; fallback kepada nilai lalai jika tiada. */
export async function fetchOutletSettings(outletName: string): Promise<ShopSettings> {
  const fallback: ShopSettings = { ...DEFAULT_SETTINGS, outletName };

  if (!isSupabaseConfigured || !supabase) return fallback;

  const { data, error } = await supabase
    .from('kiosk_settings')
    .select('shop_name, branch, phone, address, tagline, currency')
    .eq('outlet_name', outletName)
    .maybeSingle();

  if (error) {
    console.warn('[emaspos] Gagal membaca tetapan outlet:', error.message);
    return fallback;
  }
  if (!data) return fallback;

  const row = data as SettingsRow;
  return {
    shopName: row.shop_name ?? fallback.shopName,
    outletName,
    branch: row.branch ?? fallback.branch,
    phone: row.phone ?? fallback.phone,
    address: row.address ?? fallback.address,
    tagline: row.tagline ?? fallback.tagline,
    currency: row.currency ?? fallback.currency,
  };
}

/** Simpan tetapan outlet ke server (admin sahaja). */
export async function pushOutletSettings(
  outletName: string,
  settings: ShopSettings,
): Promise<void> {
  const db = requireClient();

  const { error } = await db.from('kiosk_settings').upsert(
    {
      outlet_name: outletName,
      shop_name: settings.shopName,
      branch: settings.branch,
      phone: settings.phone,
      address: settings.address,
      tagline: settings.tagline,
      currency: settings.currency,
    },
    { onConflict: 'outlet_name' },
  );

  if (error) {
    throw new Error(`Gagal menyimpan tetapan ke server: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Sejarah harga (ditulis oleh trigger server)
// ---------------------------------------------------------------------------

type HistoryRow = {
  id?: number | string;
  purity?: string;
  old_sell?: number | string | null;
  new_sell?: number | string | null;
  old_buy?: number | string | null;
  new_buy?: number | string | null;
  note?: string | null;
  changed_at?: string | null;
};

/** Baca sejarah perubahan harga sesuatu outlet (admin sahaja). */
export async function fetchOutletHistory(
  outletName: string,
): Promise<PriceHistoryEntry[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('kiosk_price_history')
    .select('id, purity, old_sell, new_sell, old_buy, new_buy, note, changed_at')
    .eq('outlet_name', outletName)
    .order('changed_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[emaspos] Gagal membaca sejarah harga:', error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];

  return (data as HistoryRow[])
    .filter((row) => typeof row.purity === 'string' && isGoldPurity(row.purity))
    .map((row) => ({
      id: String(row.id ?? ''),
      timestamp: row.changed_at ?? new Date().toISOString(),
      purity: row.purity as GoldPurity,
      oldSellPrice: Number(row.old_sell ?? 0),
      newSellPrice: Number(row.new_sell ?? 0),
      oldBuyPrice: Number(row.old_buy ?? 0),
      newBuyPrice: Number(row.new_buy ?? 0),
      adminNote: row.note ?? undefined,
    }));
}

// ---------------------------------------------------------------------------
// Realtime — hanya isyarat, pemanggil mesti fetch semula dari server
// ---------------------------------------------------------------------------

export function subscribeToOutletChanges(
  outletName: string,
  onChange: () => void,
): () => void {
  if (!isSupabaseConfigured || typeof window === 'undefined' || !supabase) {
    return () => {};
  }

  const matchesOutlet = (payload: {
    new?: Record<string, unknown> | null;
    old?: Record<string, unknown> | null;
  }) => {
    const row = payload.new ?? payload.old;
    return !row || row.outlet_name === outletName;
  };

  const channel = supabase
    .channel(`kiosk_outlet:${outletName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kiosk_prices' },
      (payload) => {
        if (matchesOutlet(payload)) onChange();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kiosk_promos' },
      () => {
        // Poster adalah global — sebarang perubahan relevan untuk semua outlet.
        onChange();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kiosk_settings' },
      (payload) => {
        if (matchesOutlet(payload)) onChange();
      },
    )
    .subscribe();

  return () => {
    try {
      void supabase?.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}
