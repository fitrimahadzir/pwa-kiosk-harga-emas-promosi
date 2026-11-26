import {
  CatalogItem,
  CounterAnnouncement,
  GoldPriceItem,
  GoldPurity,
  PromoItem,
  PriceHistoryEntry,
  QuotationResult,
  ReceiptRecord,
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
  // Sengaja kosong — alamat & telefon diisi oleh admin melalui tetapan outlet.
  phone: '',
  address: '',
  tagline: 'Ketulenan Terjamin • Nilai Warisan Sepanjang Zaman',
  currency: 'MYR',
};

/** Teks pengumuman kaunter lalai (dipaparkan jika server belum ada rekod). */
export const DEFAULT_ANNOUNCEMENT =
  'Selamat datang ke Gold Reserve. Harga emas dikemaskini setiap hari — sila hubungi kakitangan kaunter untuk sebarang pertanyaan.';

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
  title?: string | null;
  description?: string | null;
  package_price?: number | string | null;
};

/**
 * Jadual lama / schema cache PostgREST yang belum ada kolum butiran pakej.
 * Penerangan dan harga adalah tidak wajib, jadi poster tetap boleh disimpan.
 */
const isMissingPromoDetailsColumn = (error: {
  code?: string;
  message: string;
}): boolean =>
  error.code === '42703' ||
  /could not find the '(title|description|package_price)' column/i.test(error.message) ||
  /column .+(title|description|package_price)|does not exist/i.test(error.message);

/** Baca semua poster promosi global dari server (sama untuk semua outlet). */
export async function fetchPromos(): Promise<PromoItem[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const mapRows = (rows: PromoRow[]): PromoItem[] =>
    rows.map((row, index) => ({
      id: String(row.id ?? `promo-${index}`),
      imageUrl: row.image_url ?? '',
      isActive: row.is_active !== false,
      title: row.title ?? '',
      description: row.description ?? '',
      packagePrice: Math.max(0, Number(row.package_price) || 0),
    }));

  const result = await supabase
    .from('kiosk_promos')
    .select('id, image_url, is_active, title, description, package_price')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  // Kesiapan untuk pangkalan data yang belum menjalankan
  // supabase/migrate-promo-details.sql — masih boleh baca poster lama.
  if (result.error && /42703|does not exist|column/i.test(result.error.message)) {
    const legacy = await supabase
      .from('kiosk_promos')
      .select('id, image_url, is_active')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (legacy.error) {
      console.warn('[emaspos] Gagal membaca poster promosi:', legacy.error.message);
      return [];
    }
    return Array.isArray(legacy.data) ? mapRows(legacy.data as PromoRow[]) : [];
  }

  if (result.error) {
    console.warn('[emaspos] Gagal membaca poster promosi:', result.error.message);
    return [];
  }
  return Array.isArray(result.data) ? mapRows(result.data as PromoRow[]) : [];
}

/** Ganti senarai poster global di server (admin sahaja). */
export async function pushPromos(promos: PromoItem[]): Promise<void> {
  const db = requireClient();

  const rows = promos.map((promo, index) => ({
    id: promo.id,
    image_url: promo.imageUrl,
    is_active: promo.isActive,
    title: promo.title ?? '',
    description: promo.description ?? '',
    package_price: Math.max(0, Number(promo.packagePrice) || 0),
    sort_order: index,
  }));
  // Struktur jadual sebelum migrasi butiran pakej.
  const legacyRows = promos.map((promo, index) => ({
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
      const legacySchema =
        error.code === '42P10' ||
        /no unique or exclusion constraint/i.test(error.message);
      if (legacySchema) {
        throw new Error(
          'Jadual kiosk_promos masih guna struktur lama. Sila jalankan supabase/migrate-global-promos.sql (atau schema.sql terkini) dalam Supabase SQL Editor.',
        );
      }

      if (isMissingPromoDetailsColumn(error)) {
        // Kolum butiran belum ada (atau cache PostgREST belum disegarkan).
        // Poster tetap disimpan tanpa tajuk/penerangan/harga kerana ketiga-
        // tiga butiran itu tidak wajib.
        console.warn(
          '[emaspos] Kolum butiran pakej tidak tersedia; poster disimpan tanpa butiran. Jalankan supabase/migrate-promo-details.sql untuk menyimpan tajuk/penerangan/harga.',
          error.message,
        );
        const { error: legacyError } = await db
          .from('kiosk_promos')
          .upsert(legacyRows, { onConflict: 'id' });
        if (legacyError) {
          throw new Error(`Gagal menyimpan poster ke server: ${legacyError.message}`);
        }
      } else {
        throw new Error(`Gagal menyimpan poster ke server: ${error.message}`);
      }
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
// Katalog jewelry (global — sama untuk semua outlet)
// ---------------------------------------------------------------------------

type CatalogRow = {
  id?: string | null;
  name?: string | null;
  category?: string | null;
  description?: string | null;
  price?: number | string | null;
  image_url?: string | null;
  is_active?: boolean | null;
};

const CATALOG_COLUMNS =
  'id, name, category, description, price, image_url, is_active';

const CATALOG_SETUP_MESSAGE =
  'Jadual katalog belum ada di Supabase. Jalankan supabase/migrate-jewelry-catalog.sql dalam Supabase SQL Editor dahulu.';

function isMissingCatalogTableError(error: { code?: string; message: string }): boolean {
  return (
    error.code === '42P01' ||
    error.code === 'PGRST205' ||
    /relation .*kiosk_catalog_items.* does not exist/i.test(error.message) ||
    /could not find the table/i.test(error.message)
  );
}

function isMissingCatalogColumnError(error: { code?: string; message: string }): boolean {
  return (
    error.code === '42703' ||
    error.code === 'PGRST204' ||
    /could not find the '(name|category|description|price|image_url|is_active|sort_order)' column/i.test(
      error.message,
    )
  );
}

/** Baca semua produk katalog global dari server. */
export async function fetchCatalogItems(): Promise<CatalogItem[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('kiosk_catalog_items')
    .select(CATALOG_COLUMNS)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    if (isMissingCatalogTableError(error) || isMissingCatalogColumnError(error)) {
      console.warn('[emaspos]', CATALOG_SETUP_MESSAGE);
      return [];
    }
    console.warn('[emaspos] Gagal membaca katalog jewelry:', error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];

  return (data as CatalogRow[]).map((row, index) => ({
    id: String(row.id ?? `catalog-${index}`),
    name: String(row.name ?? '').trim(),
    category: String(row.category ?? '').trim(),
    description: String(row.description ?? '').trim(),
    price: Math.max(0, Number(row.price) || 0),
    imageUrl: String(row.image_url ?? '').trim(),
    isActive: row.is_active !== false,
  }));
}

/**
 * Ganti senarai katalog global di server (admin sahaja).
 * Susunan array menentukan `sort_order` paparan di kiosk.
 */
export async function pushCatalogItems(items: CatalogItem[]): Promise<void> {
  const db = requireClient();

  const rows = items.map((item, index) => ({
    id: item.id,
    name: item.name.trim(),
    category: item.category.trim(),
    description: item.description.trim(),
    price: Math.max(0, Number(item.price) || 0),
    image_url: item.imageUrl.trim(),
    is_active: item.isActive,
    sort_order: index,
  }));

  if (rows.length > 0) {
    const { error } = await db
      .from('kiosk_catalog_items')
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      if (isMissingCatalogTableError(error) || isMissingCatalogColumnError(error)) {
        throw new Error(CATALOG_SETUP_MESSAGE);
      }
      throw new Error(`Gagal menyimpan katalog ke server: ${error.message}`);
    }
  }

  // Buang produk yang dipadam dari senarai (sama seperti poster promosi).
  const { data: existing, error: existingError } = await db
    .from('kiosk_catalog_items')
    .select('id');

  if (existingError) {
    throw new Error(`Gagal menyemak katalog sedia ada: ${existingError.message}`);
  }

  const keep = new Set(items.map((item) => item.id));
  const removeIds = (existing ?? [])
    .map((row) => (row as { id?: string }).id)
    .filter((id): id is string => typeof id === 'string' && !keep.has(id));

  if (removeIds.length > 0) {
    const { error } = await db
      .from('kiosk_catalog_items')
      .delete()
      .in('id', removeIds);
    if (error) {
      throw new Error(`Gagal memadam produk lama: ${error.message}`);
    }
  }
}

/**
 * Muat naik gambar produk ke bucket `jewelry-catalog` dan pulangkan URL awam.
 * Hanya admin yang boleh menulis (polisi RLS Storage).
 */
export async function uploadCatalogImage(blob: Blob): Promise<string> {
  const db = requireClient();

  const extension =
    blob.type === 'image/webp' ? 'webp' : blob.type === 'image/png' ? 'png' : 'jpg';
  const path = `products/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;

  const { error } = await db.storage.from('jewelry-catalog').upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    cacheControl: '31536000',
    upsert: false,
  });

  if (error) {
    const message =
      /bucket.*not found|bucket does not exist/i.test(error.message) ||
      String(error.statusCode ?? '') === '404'
        ? `Bucket 'jewelry-catalog' belum ada. Jalankan supabase/migrate-jewelry-catalog.sql dalam Supabase SQL Editor.`
        : `Gagal memuat naik gambar produk: ${error.message}`;
    throw new Error(message);
  }

  const { data } = db.storage.from('jewelry-catalog').getPublicUrl(path);
  return data.publicUrl;
}

/** Padam gambar produk dari Storage (jika URL milik bucket kita). */
export async function deleteCatalogImage(imageUrl: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase || !imageUrl) return;

  const marker = '/storage/v1/object/public/jewelry-catalog/';
  const index = imageUrl.indexOf(marker);
  if (index === -1) return;

  const path = decodeURIComponent(imageUrl.slice(index + marker.length));
  await supabase.storage.from('jewelry-catalog').remove([path]);
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

/** Maklumat awam outlet dari `kiosk_outlets` (nama, alamat, telefon). */
export interface OutletContact {
  name: string;
  address: string;
  phone: string;
}

/**
 * Senarai outlet sebenar dari `kiosk_outlets` melalui fungsi SECURITY DEFINER.
 * `code` / `role` tidak pernah dibaca oleh klien.
 */
export async function fetchOutletContacts(): Promise<OutletContact[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase.rpc('kiosk_outlet_details');
  if (error) {
    // Migrasi belum dijalankan — pemanggil boleh guna senarai nama sedia ada.
    console.warn('[emaspos] Gagal membaca maklumat outlet:', error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];

  return (data as OutletContact[])
    .map((row) => ({
      name: String(row?.name ?? '').trim(),
      address: String(row?.address ?? ''),
      phone: String(row?.phone ?? ''),
    }))
    .filter((row) => row.name);
}

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

  const row = (data ?? null) as SettingsRow | null;

  // Alamat & telefon yang disimpan di `kiosk_outlets` (melalui tetapan admin)
  // diutamakan. Jika belum ada, gunakan nilai daripada `kiosk_settings`.
  const contacts = await fetchOutletContacts().catch(() => []);
  const contact = contacts.find((item) => item.name === outletName);

  return {
    shopName: row?.shop_name ?? fallback.shopName,
    outletName,
    branch: row?.branch ?? fallback.branch,
    phone:
      (contact?.phone ?? '').trim() || row?.phone || fallback.phone,
    address:
      (contact?.address ?? '').trim() || row?.address || fallback.address,
    tagline: row?.tagline ?? fallback.tagline,
    currency: row?.currency ?? fallback.currency,
  };
}

/**
 * Simpan alamat & telefon outlet. RPC SECURITY DEFINER menyemak sesi admin
 * dan juga mengemas kini `kiosk_settings` supaya resit kiosk terus konsisten.
 */
export async function updateOutletContact(
  outletName: string,
  address: string,
  phone: string,
): Promise<OutletContact> {
  const db = requireClient();

  const { data, error } = await db.rpc('update_kiosk_outlet_contact', {
    p_name: outletName.trim(),
    p_address: address.trim(),
    p_phone: phone.trim(),
  });

  if (error) {
    throw new Error(`Gagal menyimpan maklumat outlet: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (row) {
    return {
      name: String(row.name ?? outletName),
      address: String(row.address ?? address),
      phone: String(row.phone ?? phone),
    };
  }

  return { name: outletName.trim(), address: address.trim(), phone: phone.trim() };
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
// Pengumuman kaunter (global — satu teks untuk semua outlet)
// ---------------------------------------------------------------------------

type AnnouncementRow = {
  message?: string | null;
  updated_at?: string | null;
};

/** Baca pengumuman kaunter global dari server; fallback kepada teks lalai. */
export async function fetchAnnouncement(): Promise<CounterAnnouncement> {
  const fallback: CounterAnnouncement = {
    message: DEFAULT_ANNOUNCEMENT,
    updatedAt: '',
  };

  if (!isSupabaseConfigured || !supabase) return fallback;

  const { data, error } = await supabase
    .from('kiosk_announcement')
    .select('message, updated_at')
    .eq('id', 'counter')
    .maybeSingle();

  if (error) {
    console.warn('[emaspos] Gagal membaca pengumuman kaunter:', error.message);
    return fallback;
  }

  const row = (data as AnnouncementRow | null) ?? null;
  if (!row) return fallback;

  return {
    message: typeof row.message === 'string' ? row.message : fallback.message,
    updatedAt: row.updated_at ?? '',
  };
}

/** Simpan pengumuman kaunter global (admin sahaja). */
export async function pushAnnouncement(message: string): Promise<void> {
  const db = requireClient();

  const { error } = await db
    .from('kiosk_announcement')
    .upsert({ id: 'counter', message }, { onConflict: 'id' });

  if (error) {
    const missingTable = error.code === '42P01' || /relation .*kiosk_announcement/i.test(error.message);
    throw new Error(
      missingTable
        ? 'Jadual pengumuman belum ada di Supabase. Jalankan supabase/migrate-announcement.sql dalam SQL Editor dahulu.'
        : `Gagal menyimpan pengumuman ke server: ${error.message}`,
    );
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
// Resit / sebut harga (satu baris bagi setiap resit yang disahkan staf)
// ---------------------------------------------------------------------------

type ReceiptRow = {
  id?: number | string;
  receipt_number?: string | null;
  quote_id?: string | null;
  outlet_name?: string | null;
  created_at?: string | null;
  purity?: string | null;
  karat?: string | null;
  weight?: number | string | null;
  price_per_gram?: number | string | null;
  gold_cost?: number | string | null;
  workmanship?: number | string | null;
  subtotal?: number | string | null;
  discount_amount?: number | string | null;
  has_trade_in?: boolean | null;
  trade_in_purity?: string | null;
  trade_in_weight?: number | string | null;
  trade_in_rate?: number | string | null;
  trade_in_amount?: number | string | null;
  final_total?: number | string | null;
  package_price?: number | string | null;
  package_title?: string | null;
};

const RECEIPT_COLUMNS = [
  'id',
  'receipt_number',
  'quote_id',
  'outlet_name',
  'created_at',
  'purity',
  'karat',
  'weight',
  'price_per_gram',
  'gold_cost',
  'workmanship',
  'subtotal',
  'discount_amount',
  'has_trade_in',
  'trade_in_purity',
  'trade_in_weight',
  'trade_in_rate',
  'trade_in_amount',
  'final_total',
  'package_price',
  'package_title',
].join(', ');

/** Hasil simpanan resit — dipaparkan sebagai status di lajur sebut harga. */
export type ReceiptSaveResult =
  | { ok: true; id: string; quoteId: string; receiptNumber: string }
  | { ok: false; error: string };

/**
 * Simpan satu resit dari kiosk. Klien tiada INSERT terus — RPC SECURITY DEFINER
 * yang melakukan tulisan DAN menjana nombor GRJ (lihat
 * supabase/migrate-receipt-numbers.sql dan migrate-quotation-save.sql).
 * Dipanggil bila staf menekan "Jana Sebut Harga" atau "Simpan Rekod" pada slip.
 *
 * `createdBy` (user id Supabase Auth, jika ada sesi) dihantar sebagai maklumat
 * audit. RPC lama mengabaikan kunci tambahan ini — tiada perubahan diperlukan
 * pada frontend jika migrasi belum dijalankan.
 */
export async function pushReceipt(
  quote: QuotationResult,
  outletName: string,
  createdBy?: string | null,
  createdByEmail?: string | null,
): Promise<ReceiptSaveResult> {
  const outlet = outletName.trim();
  if (!isSupabaseConfigured || !supabase) {
    return { ok: false, error: 'Supabase belum dikonfigurasi.' };
  }
  if (!outlet) return { ok: false, error: 'Tiada outlet dipilih.' };
  if (!quote.quoteId) return { ok: false, error: 'No. sebut harga tidak sah.' };

  try {
    const { data, error } = await supabase.rpc('record_kiosk_receipt', {
      p_payload: {
        quoteId: quote.quoteId,
        outletName: outlet,
        createdBy: createdBy?.trim() || '',
        createdByEmail: createdByEmail?.trim() || '',
        purity: quote.purity,
        karat: quote.karat,
        weight: quote.weight,
        pricePerGram: quote.pricePerGram,
        goldCost: quote.goldCost,
        workmanship: quote.workmanship,
        subtotal: quote.subtotal,
        discountAmount: quote.discountAmount,
        hasTradeIn: quote.hasTradeIn,
        tradeInPurity: quote.tradeInPurity,
        tradeInWeight: quote.tradeInWeight,
        tradeInRate: quote.tradeInRate,
        tradeInAmount: quote.tradeInAmount,
        finalTotal: quote.finalTotal,
        packagePrice: quote.packagePrice ?? 0,
        packageTitle: quote.packageTitle ?? '',
      },
    });

    if (error) {
      console.warn('[emaspos] Gagal menyimpan resit:', error.message);
      return { ok: false, error: error.message || 'Gagal menyimpan resit.' };
    }

    // RPC mesti memulangkan jsonb { id, receiptNumber, quoteId, createdAt }.
    // JANGAN guna quoteId sebagai nombor resit — itu nombor lama QT-… dan
    // Pengguna tak mahu ia muncul pada resit. Server lama = ralat jelas.
    const raw = data as
      | { id?: number | string; receiptNumber?: string }
      | number
      | string
      | null;
    const payload = raw && typeof raw === 'object' ? raw : null;
    const legacyId =
      typeof raw === 'number' || typeof raw === 'string' ? String(raw) : '';
    const receiptNumber =
      typeof payload?.receiptNumber === 'string' ? payload.receiptNumber.trim() : '';

    if (!receiptNumber) {
      const message =
        'Server belum menjana nombor resit GRJ. Jalankan supabase/migrate-receipt-numbers.sql dalam Supabase SQL Editor.';
      console.warn('[emaspos]', message);
      return { ok: false, error: message };
    }

    return {
      ok: true,
      id: String(payload?.id ?? '') || legacyId || quote.quoteId,
      quoteId: quote.quoteId,
      receiptNumber,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Gagal menyimpan resit.';
    console.warn('[emaspos] Gagal menyimpan resit:', message);
    return { ok: false, error: message };
  }
}

/** Baca senarai resit terkini (admin sahaja, melalui polisi RLS). */
export async function fetchReceipts(): Promise<ReceiptRecord[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('kiosk_receipts')
    .select(RECEIPT_COLUMNS)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.warn('[emaspos] Gagal membaca resit:', error.message);
    return [];
  }
  if (!Array.isArray(data)) return [];

  return (data as ReceiptRow[])
    .filter((row) => typeof row.quote_id === 'string' && Boolean(row.quote_id))
    .map((row) => ({
      id: String(row.id ?? ''),
      // Resit lama tiada receipt_number — paparan guna no. rujukan lama.
      receiptNumber: String(row.receipt_number ?? '').trim() || String(row.quote_id),
      quoteId: String(row.quote_id),
      outletName: row.outlet_name ?? '',
      createdAt: row.created_at ?? new Date().toISOString(),
      purity: (isGoldPurity(row.purity ?? '') ? row.purity : '916') as GoldPurity,
      karat: row.karat ?? '',
      weight: Number(row.weight ?? 0),
      pricePerGram: Number(row.price_per_gram ?? 0),
      goldCost: Number(row.gold_cost ?? 0),
      workmanship: Number(row.workmanship ?? 0),
      subtotal: Number(row.subtotal ?? 0),
      discountAmount: Number(row.discount_amount ?? 0),
      hasTradeIn: Boolean(row.has_trade_in),
      tradeInPurity: (isGoldPurity(row.trade_in_purity ?? '')
        ? row.trade_in_purity
        : '916') as GoldPurity,
      tradeInWeight: Number(row.trade_in_weight ?? 0),
      tradeInRate: Number(row.trade_in_rate ?? 0),
      tradeInAmount: Number(row.trade_in_amount ?? 0),
      finalTotal: Number(row.final_total ?? 0),
      packagePrice: Number(row.package_price ?? 0),
      packageTitle: row.package_title ?? '',
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

  // `kiosk_outlets` guna lajur `name`, bukan `outlet_name`.
  const matchesOutletRow = (payload: {
    new?: Record<string, unknown> | null;
    old?: Record<string, unknown> | null;
  }) => {
    const row = payload.new ?? payload.old;
    return !row || row.name === outletName;
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
      { event: '*', schema: 'public', table: 'kiosk_catalog_items' },
      () => {
        // Katalog adalah global — sebarang perubahan relevan untuk semua outlet.
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
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kiosk_outlets' },
      (payload) => {
        if (matchesOutletRow(payload)) onChange();
      },
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kiosk_announcement' },
      () => {
        // Pengumuman adalah global — relevan untuk semua outlet.
        onChange();
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
