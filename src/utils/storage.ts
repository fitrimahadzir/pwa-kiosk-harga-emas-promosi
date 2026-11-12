import { GoldPriceItem, GoldPurity, PromoItem, PriceHistoryEntry, ShopSettings, OutletConfig } from '../types/gold';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

/** Outlet yang pernah dinamakan semula: nama lama -> nama semasa. */
export const OUTLET_RENAMES: Record<string, string> = {
  HeadQuarters: 'HQ Warehouse',
};

const PRICES_KEY = 'emaspos_gold_prices_v1';
const PROMOS_KEY = 'emaspos_promos_v1';
const SETTINGS_KEY = 'emaspos_settings_v1';
const HISTORY_KEY = 'emaspos_price_history_v1';

const OUTLETS_KEY = 'emaspos_outlets_v1';
const CURRENT_OUTLET_KEY = 'emaspos_current_outlet_v1';
/** Senarai nama outlet awam terakhir yang disahkan server (role = 'outlet'). */
const PUBLIC_OUTLETS_KEY = 'emaspos_kiosk_outlet_names_v1';

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

export const DEFAULT_PROMOS: PromoItem[] = [
  {
    id: 'promo-1',
    title: 'Koleksi Cahaya Kasih 916',
    subtitle: 'Potongan 50% Upah Tukang untuk Semua Rantai Leher & Gelang',
    badge: 'DISKAUN 50% UPAH',
    imageUrl: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=900&h=1200&q=85',
    validUntil: '30 November 2026',
    terms: 'Tertakluk kepada pembelian koleksi terpilih 916 seberat 5g ke atas. Sah di semua cawangan.',
    isActive: true,
  },
  {
    id: 'promo-2',
    title: 'Tawaran Hebat Trade-In Emas',
    subtitle: 'Nilai Tukar Ganti Tertinggi + Tambahan RM 5.00/gram',
    badge: 'TRADE-IN BONUS',
    imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&h=1200&q=85',
    validUntil: '15 Disember 2026',
    terms: 'Bawa barang kemas lama anda untuk tukar ganti dengan rekaan baharu tanpa caj tersembunyi.',
    isActive: true,
  },
  {
    id: 'promo-3',
    title: 'Pelaburan Gold Bar 999',
    subtitle: 'Percuma Yuran Premium Pembuatan untuk Pembelian 10g Ke Atas',
    badge: 'ZERO PREMIUM 999',
    imageUrl: 'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=900&h=1200&q=85',
    validUntil: 'Sah Sepanjang Bulan Ini',
    terms: 'Khas untuk jongkong emas dan dinar 999 bersijil rasmi antarabangsa LBMA / Tempatan.',
    isActive: true,
  },
  {
    id: 'promo-4',
    title: 'Koleksi Cincin Tunang Emas 375 & 916',
    subtitle: 'Rebat Tunai Segera RM 100 dengan Pembelian Sepasang Cincin',
    badge: 'REBAT RM 100',
    imageUrl: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=900&h=1200&q=85',
    validUntil: '31 Disember 2026',
    terms: 'Termasuk ukiran nama percuma dan kotak baldu eksklusif merah marun.',
    isActive: true,
  },
];

export const DEFAULT_SETTINGS: ShopSettings = {
  shopName: 'GOLD RESERVE',
  outletName: 'Amanjaya Mall',
  branch: 'Cawangan Utama (Kaunter Jualan)',
  phone: '012-8899 375',
  address: 'No. 18-G, Jalan Sultan Ismail, 50250 Kuala Lumpur',
  tagline: 'Ketulenan Terjamin • Nilai Warisan Sepanjang Zaman',
  currency: 'MYR',
};

export const DEFAULT_HISTORY: PriceHistoryEntry[] = [
  {
    id: 'hist-1',
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    purity: '916',
    oldSellPrice: 423.0,
    newSellPrice: 425.0,
    oldBuyPrice: 378.0,
    newBuyPrice: 380.0,
    adminNote: 'Pelarasan harga pasaran emas dunia New York / LBMA',
  },
  {
    id: 'hist-2',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    purity: '999',
    oldSellPrice: 465.0,
    newSellPrice: 468.0,
    oldBuyPrice: 418.0,
    newBuyPrice: 422.0,
    adminNote: 'Kemas kini pagi sesi dagangan Bursa',
  },
  {
    id: 'hist-3',
    timestamp: new Date().toISOString(),
    purity: '916',
    oldSellPrice: 425.0,
    newSellPrice: 428.0,
    oldBuyPrice: 380.0,
    newBuyPrice: 382.0,
    adminNote: 'Kemas kini harga semasa jualan kaunter',
  },
];

export const DEFAULT_OUTLET: OutletConfig = {
  outletName: DEFAULT_SETTINGS.outletName,
  prices: DEFAULT_PRICES,
  promos: DEFAULT_PROMOS,
  settings: DEFAULT_SETTINGS,
  history: DEFAULT_HISTORY,
  updatedAt: new Date().toISOString(),
};

// Broadcast channel for real-time synchronization between tabs/devices
let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('emaspos_sync_channel');
  }
} catch {
  // BroadcastChannel might fail in some restricted environments
}

export function notifySync(type: 'prices' | 'promos' | 'settings' | 'history') {
  if (broadcastChannel) {
    broadcastChannel.postMessage({ type, timestamp: Date.now() });
  }
}

export function subscribeToSync(callback: (type: string) => void) {
  if (!broadcastChannel) return () => {};
  const handler = (e: MessageEvent) => {
    if (e.data?.type) {
      callback(e.data.type);
    }
  };
  broadcastChannel.addEventListener('message', handler);
  return () => {
    broadcastChannel?.removeEventListener('message', handler);
  };
}

/**
 * Langgan perubahan harga (postgres_changes) untuk satu outlet.
 * Payload TIDAK dipercayai: pemanggil mesti fetch semula dari jadual.
 */
export function subscribeToOutletPrices(
  outletName: string,
  onChange: () => void
): () => void {
  if (!isSupabaseConfigured || typeof window === 'undefined' || !supabase) {
    return () => {};
  }

  const channel = supabase
    .channel(`kiosk_prices:${outletName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'kiosk_prices' },
      (payload) => {
        const row = (payload.new ?? payload.old) as { outlet_name?: string } | null;
        if (!row || row.outlet_name === outletName) onChange();
      }
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

/** Baca harga terkini sesuatu outlet. Pulangkan null jika tiada/ralat. */
export async function fetchOutletPrices(
  outletName: string
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

  for (const row of data as Array<{
    purity?: string;
    sell_price?: number | string;
    buy_price?: number | string;
    updated_at?: string;
  }>) {
    const purity = row.purity;
    if (typeof purity !== 'string' || !isGoldPurity(purity)) continue;

    const sell = Number(row.sell_price);
    const buy = Number(row.buy_price);
    if (!Number.isFinite(sell) || !Number.isFinite(buy) || sell <= 0 || buy < 0 || buy > sell) {
      continue;
    }

    next[purity] = {
      ...next[purity],
      sellPrice: sell,
      buyPrice: buy,
      updatedAt: row.updated_at ?? new Date().toISOString(),
    };
    found = true;
  }

  return found ? next : null;
}

/**
 * Tulis harga ke server. Hanya berjaya untuk admin yang disahkan oleh RLS
 * (`public.is_kiosk_admin()`). Outlet / anon akan ditolak oleh pangkalan data.
 */
export async function pushOutletPrices(
  outletName: string,
  prices: Record<GoldPurity, GoldPriceItem>
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase belum dikonfigurasi.');
  }

  const priceData = (['999', '916', '375'] as GoldPurity[]).map((purity) => ({
    outlet_name: outletName,
    purity,
    sell_price: prices[purity].sellPrice,
    buy_price: prices[purity].buyPrice,
  }));

  const { error } = await supabase
    .from('kiosk_prices')
    .upsert(priceData, { onConflict: 'outlet_name,purity' });

  if (error) {
    throw new Error(`Gagal menyimpan harga ke server: ${error.message}`);
  }
}

// Outlet-scoped storage
export function loadOutlets(): Record<string, OutletConfig> {
  if (typeof window === 'undefined') return {};
  try {
    const saved = localStorage.getItem(OUTLETS_KEY);
    if (!saved) return {};
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const outlets = parsed as Record<string, OutletConfig>;
    // Rename legacy outlets (e.g. HeadQuarters -> HQ Warehouse) so previously
    // stored data is carried over to the current outlet name.
    for (const [legacyName, nextName] of Object.entries(OUTLET_RENAMES)) {
      const legacy = outlets[legacyName];
      if (!legacy) continue;
      if (!outlets[nextName]) {
        outlets[nextName] = { ...legacy, outletName: nextName };
      }
      delete outlets[legacyName];
    }
    return outlets;
  } catch {
    return {};
  }
}

export function saveOutlets(outlets: Record<string, OutletConfig>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(OUTLETS_KEY, JSON.stringify(outlets));
  notifySync('settings');
}

export function loadCurrentOutletName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(CURRENT_OUTLET_KEY);
    if (!saved) return null;
    // Follow outlet renames (e.g. HeadQuarters -> HQ Warehouse).
    return OUTLET_RENAMES[saved] ?? saved;
  } catch {
    return null;
  }
}

export function saveCurrentOutletName(outletName: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_OUTLET_KEY, outletName);
  notifySync('settings');
}

/** Keluar dari paparan kiosk: buang pilihan outlet pada peranti ini. */
export function clearCurrentOutletName() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(CURRENT_OUTLET_KEY);
  notifySync('settings');
}

export function getOutlet(outletName: string): OutletConfig | null {
  const outlets = loadOutlets();
  return outlets[outletName] ?? null;
}

export function upsertOutlet(config: OutletConfig) {
  const outlets = loadOutlets();
  outlets[config.outletName] = config;
  saveOutlets(outlets);
}

export function listOutletNames(): string[] {
  const outlets = loadOutlets();
  return Object.keys(outlets).sort();
}

/**
 * Nama outlet yang selamat dipaparkan di kiosk.
 * `Admin` disekat sebagai pertahanan tambahan walaupun server sudah menapis
 * `role = 'outlet'` — outlet role admin tidak sepatutnya muncul di kiosk.
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

/** Senarai outlet awam terakhir daripada server (cache selamat luar talian). */
export function loadPublicOutletNames(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PUBLIC_OUTLETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? sanitizePublicOutletNames(parsed) : [];
  } catch {
    return [];
  }
}

function savePublicOutletNames(names: string[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(PUBLIC_OUTLETS_KEY, JSON.stringify(sanitizePublicOutletNames(names)));
  } catch {
    // Storage penuh / disekat — cache pilihan outlet tidak kritikal.
  }
}

// Legacy compatibility helpers for non-outlet aware flows
export function loadPrices(): Record<GoldPurity, GoldPriceItem> {
  const currentOutlet = loadCurrentOutletName();
  if (currentOutlet) {
    const outlet = getOutlet(currentOutlet);
    if (outlet) return outlet.prices;
  }
  return DEFAULT_PRICES;
}

/**
 * Save prices for a specific outlet (defaults to the current one).
 *
 * Ini HANYA menulis cache localStorage. Penulisan ke Supabase dilakukan
 * secara eksplisit oleh `pushOutletPrices()` selepas admin disahkan.
 */
export function savePrices(
  prices: Record<GoldPurity, GoldPriceItem>,
  outletName?: string
) {
  if (typeof window === 'undefined') return;
  const currentOutlet = loadCurrentOutletName() ?? DEFAULT_OUTLET.outletName;
  const targetOutlet = outletName ?? currentOutlet;
  const existing = getOutlet(targetOutlet) ?? DEFAULT_OUTLET;
  const updated: OutletConfig = {
    ...existing,
    outletName: targetOutlet,
    prices,
    updatedAt: new Date().toISOString(),
  };
  upsertOutlet(updated);
  if (targetOutlet === currentOutlet) {
    notifySync('prices');
  }
}

export function loadPromos(): PromoItem[] {
  const currentOutlet = loadCurrentOutletName();
  if (currentOutlet) {
    const outlet = getOutlet(currentOutlet);
    if (outlet) return outlet.promos;
  }
  return DEFAULT_PROMOS;
}

export function savePromos(promos: PromoItem[]) {
  if (typeof window === 'undefined') return;
  const currentOutlet = loadCurrentOutletName() ?? DEFAULT_OUTLET.outletName;
  const existing = getOutlet(currentOutlet) ?? DEFAULT_OUTLET;
  const updated: OutletConfig = {
    ...existing,
    outletName: currentOutlet,
    promos,
    updatedAt: new Date().toISOString(),
  };
  upsertOutlet(updated);
  notifySync('promos');
}

export function loadSettings(): ShopSettings {
  const currentOutlet = loadCurrentOutletName();
  if (currentOutlet) {
    const outlet = getOutlet(currentOutlet);
    if (outlet) return outlet.settings;
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: ShopSettings) {
  if (typeof window === 'undefined') return;
  const currentOutlet = loadCurrentOutletName() ?? DEFAULT_OUTLET.outletName;
  const existing = getOutlet(currentOutlet) ?? DEFAULT_OUTLET;
  const updated: OutletConfig = {
    ...existing,
    outletName: currentOutlet,
    settings,
    updatedAt: new Date().toISOString(),
  };
  upsertOutlet(updated);
  notifySync('settings');
}

export function loadHistory(): PriceHistoryEntry[] {
  const currentOutlet = loadCurrentOutletName();
  if (currentOutlet) {
    const outlet = getOutlet(currentOutlet);
    if (outlet) return outlet.history;
  }
  return DEFAULT_HISTORY;
}

export function saveHistory(history: PriceHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  const currentOutlet = loadCurrentOutletName() ?? DEFAULT_OUTLET.outletName;
  const existing = getOutlet(currentOutlet) ?? DEFAULT_OUTLET;
  const updated: OutletConfig = {
    ...existing,
    outletName: currentOutlet,
    history: history.slice(0, 50), // keep latest 50
    updatedAt: new Date().toISOString(),
  };
  upsertOutlet(updated);
  notifySync('history');
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
 * Create a local config for every outlet name that is not known yet.
 * Prices are taken from `pricesByOutlet` when available (remote data),
 * otherwise the default price list is used.
 */
function seedMissingOutlets(
  names: string[],
  pricesByOutlet: Map<string, Record<GoldPurity, GoldPriceItem>> = new Map()
) {
  const outlets = loadOutlets();
  let seeded = false;
  for (const name of names) {
    if (!outlets[name]) {
      outlets[name] = {
        outletName: name,
        prices: pricesByOutlet.get(name) ?? cloneDefaultPrices(),
        promos: DEFAULT_PROMOS,
        settings: { ...DEFAULT_SETTINGS, outletName: name },
        history: [],
        updatedAt: new Date().toISOString(),
      };
      seeded = true;
    }
  }
  if (seeded) saveOutlets(outlets);
}

/**
 * Pull the active outlet list (and their latest prices) from Supabase, then
 * seed any outlet that is still missing locally.
 *
 * This lets the admin panel offer EVERY outlet when picking which outlet to
 * update prices for — even outlets that have never logged in on this device.
 * Returns the sorted outlet names confirmed by the server (role = 'outlet').
 * When Supabase is not configured (or unreachable) it falls back to the last
 * confirmed list, then to the local cache — never to admin-role rows.
 */
export async function syncRemoteOutlets(): Promise<string[]> {
  const fallback = (): string[] => {
    const cached = loadPublicOutletNames();
    return cached.length > 0 ? cached : sanitizePublicOutletNames(listOutletNames());
  };

  if (!isSupabaseConfigured || typeof window === 'undefined' || !supabase) {
    return fallback();
  }

  // Public outlet names are exposed through a SECURITY DEFINER function so the
  // kiosk never needs SELECT access to `kiosk_outlets` (which holds `code`).
  // The function only returns rows with role = 'outlet'.
  let names: string[] = [];

  const { data: outletRows, error: outletError } = await supabase.rpc('kiosk_outlet_names');

  if (outletError || !Array.isArray(outletRows)) {
    console.warn('[emaspos] Failed to load outlets from Supabase:', outletError?.message);
  } else {
    names = sanitizePublicOutletNames(
      outletRows.map((row) => (row as { name?: string }).name),
    );
  }

  // Latest prices per outlet — the kiosk_prices table is the source of truth.
  const { data: priceRows } = await supabase
    .from('kiosk_prices')
    .select('outlet_name, purity, sell_price, buy_price');

  // Fallback: if the RPC is unavailable or empty, derive public outlet names
  // from the price rows (anon has read-only access to kiosk_prices).
  if (names.length === 0 && Array.isArray(priceRows)) {
    names = sanitizePublicOutletNames(
      priceRows.map((row) => (row as { outlet_name?: string }).outlet_name),
    );
  }

  if (names.length === 0) {
    return fallback();
  }

  const remotePrices = new Map<string, Record<GoldPurity, GoldPriceItem>>();
  if (Array.isArray(priceRows)) {
    for (const row of priceRows as Array<{
      outlet_name?: string;
      purity?: string;
      sell_price?: number | string;
      buy_price?: number | string;
    }>) {
      const outletName = typeof row.outlet_name === 'string' ? row.outlet_name : '';
      const purity = typeof row.purity === 'string' ? row.purity : '';
      if (!outletName || !isGoldPurity(purity)) continue;

      const base = remotePrices.get(outletName) ?? cloneDefaultPrices();
      const sellPrice = Number(row.sell_price);
      const buyPrice = Number(row.buy_price);
      remotePrices.set(outletName, {
        ...base,
        [purity]: {
          ...base[purity],
          sellPrice:
            Number.isFinite(sellPrice) && sellPrice > 0 ? sellPrice : base[purity].sellPrice,
          buyPrice:
            Number.isFinite(buyPrice) && buyPrice > 0 ? buyPrice : base[purity].buyPrice,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  }

  savePublicOutletNames(names);
  seedMissingOutlets(names, remotePrices);
  return names;
}
