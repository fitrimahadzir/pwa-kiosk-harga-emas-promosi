import { GoldPriceItem, GoldPurity, PromoItem, PriceHistoryEntry, ShopSettings, OutletConfig } from '../types/gold';
import { SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LOCAL_DEMO_OUTLET_NAMES, OUTLET_RENAMES } from '../lib/auth';

const PRICES_KEY = 'emaspos_gold_prices_v1';
const PROMOS_KEY = 'emaspos_promos_v1';
const SETTINGS_KEY = 'emaspos_settings_v1';
const HISTORY_KEY = 'emaspos_price_history_v1';

const OUTLETS_KEY = 'emaspos_outlets_v1';
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
  adminPin: '1234',
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

// Supabase Realtime helpers for gold prices and promos
let priceChannel: RealtimeChannel | null = null;
let priceUnsubscribe: (() => void) | null = null;

export interface RealtimePriceListener {
  unsubscribe: () => void;
}

type BroadcastPricesPayload = {
  outletName?: string;
  prices?: Record<GoldPurity, GoldPriceItem>;
};

type BroadcastPromosPayload = {
  outletName?: string;
  promos?: PromoItem[];
};

export function subscribeToSupabasePrices(
  onPrices: (prices: Record<GoldPurity, GoldPriceItem>, outletName: string) => void
): RealtimePriceListener | null {
  if (!isSupabaseConfigured || typeof window === 'undefined' || !supabase) {
    return null;
  }

  priceChannel = supabase.channel('gold_prices');

  priceChannel.on(
    'broadcast',
    { event: 'prices-changed' },
    (payload) => {
      const raw = payload.payload as { outletName?: string; prices?: Record<GoldPurity, GoldPriceItem> } | null;
      if (raw?.prices && !Array.isArray(raw.prices)) {
        onPrices(raw.prices as Record<GoldPurity, GoldPriceItem>, raw.outletName ?? 'default');
      }
    }
  );

  void priceChannel.subscribe((status, error) => {
    if (error) {
      console.warn('[emaspos] Supabase prices channel error:', error);
    } else if (typeof status === 'string' && status.startsWith('ok')) {
      console.log('[emaspos] Joined gold_prices realtime channel');
    }
  });

  priceUnsubscribe = () => {
    try {
      priceChannel?.unsubscribe();
    } catch {
      // ignore
    }
    priceChannel = null;
    priceUnsubscribe = null;
  };

  return {
    unsubscribe: priceUnsubscribe,
  };
}

/**
 * Broadcast current prices and optionally promos to the same Supabase project,
 * so other kiosks subscribe to `gold_prices` receive them without any database table.
 */
export function broadcastPrices(
  prices: Record<GoldPurity, GoldPriceItem>,
  promos?: PromoItem[],
  outletName?: string
): void {
  if (!isSupabaseConfigured || typeof window === 'undefined' || !supabase) {
    return;
  }

  // Upsert prices to the kiosk_prices table per outlet
  const priceData = Object.entries(prices).map(([purity, price]) => ({
    outlet_name: outletName ?? 'default',
    purity,
    sell_price: price.sellPrice,
    buy_price: price.buyPrice
  }));

  void supabase.from('kiosk_prices').upsert(priceData, { onConflict: 'outlet_name, purity' });

  // Broadcast to all tabs so they reload from DB immediately
  const channel = supabase.channel('gold_prices');

  void channel.send({
    type: 'broadcast',
    event: 'prices-changed',
    payload: { outletName, prices },
  });

  if (Array.isArray(promos)) {
    void channel.send({
      type: 'broadcast',
      event: 'promos-changed',
      payload: { outletName, promos },
    });
  }

  void channel.unsubscribe();
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
 * `options.broadcast = false` is used when prices arrive from a Supabase
 * realtime broadcast, so kiosks do not re-broadcast the same update back and
 * ping-pong messages between devices forever.
 */
export function savePrices(
  prices: Record<GoldPurity, GoldPriceItem>,
  outletName?: string,
  options?: { broadcast?: boolean }
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
  if (options?.broadcast !== false) {
    broadcastPrices(prices, undefined, targetOutlet);
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
  broadcastPrices(loadPrices(), promos, currentOutlet);
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
 * Returns the sorted outlet names known locally after seeding. When Supabase
 * is not configured (or unreachable) it simply falls back to the local list.
 */
export async function syncRemoteOutlets(): Promise<string[]> {
  if (!isSupabaseConfigured || typeof window === 'undefined' || !supabase) {
    // Local demo mode: still make every demo outlet selectable in the admin
    // panel so per-outlet pricing can be tried without a database.
    seedMissingOutlets(LOCAL_DEMO_OUTLET_NAMES);
    return listOutletNames();
  }

  const { data: outletRows, error: outletError } = await supabase
    .from('kiosk_outlets')
    .select('name')
    .eq('is_active', true);

  if (outletError || !Array.isArray(outletRows)) {
    console.warn('[emaspos] Failed to load outlets from Supabase:', outletError?.message);
    return listOutletNames();
  }

  const names = Array.from(
    new Set(
      outletRows
        .map((row) => (row as { name?: string }).name)
        .filter((name): name is string => typeof name === 'string' && name.trim().length > 0)
        .map((name) => name.trim()),
    ),
  );

  if (names.length === 0) return listOutletNames();

  // Latest prices per outlet — the kiosk_prices table is the source of truth.
  const { data: priceRows } = await supabase
    .from('kiosk_prices')
    .select('outlet_name, purity, sell_price, buy_price');

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

  seedMissingOutlets(names, remotePrices);
  return Object.keys(loadOutlets()).sort();
}
