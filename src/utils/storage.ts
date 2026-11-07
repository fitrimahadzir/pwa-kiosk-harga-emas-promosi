import { GoldPriceItem, GoldPurity, PromoItem, PriceHistoryEntry, ShopSettings, OutletConfig } from '../types/gold';
import { SupabaseClient, type RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

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
  onPrices: (prices: Record<GoldPurity, GoldPriceItem>, outletName: string) => void,
  onPromos?: (promos: PromoItem[], outletName: string) => void
): RealtimePriceListener | null {
  if (!isSupabaseConfigured || typeof window === 'undefined' || !supabase) {
    return null;
  }

  priceChannel = supabase.channel('gold_prices');

  priceChannel.on(
    'broadcast',
    { event: 'prices-changed' },
    (payload) => {
      const raw = payload.payload as BroadcastPricesPayload | null;
      if (raw?.prices && !Array.isArray(raw.prices)) {
        onPrices(raw.prices as Record<GoldPurity, GoldPriceItem>, raw.outletName ?? 'default');
      }
    }
  );

  if (typeof onPromos === 'function') {
    priceChannel.on(
      'broadcast',
      { event: 'promos-changed' },
      (payload) => {
        const raw = payload.payload as BroadcastPromosPayload | null;
        if (Array.isArray(raw?.promos)) {
          onPromos(raw.promos as PromoItem[], raw.outletName ?? 'default');
        }
      }
    );
  }

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
    return parsed as Record<string, OutletConfig>;
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
    return localStorage.getItem(CURRENT_OUTLET_KEY);
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

export function savePrices(prices: Record<GoldPurity, GoldPriceItem>) {
  if (typeof window === 'undefined') return;
  const currentOutlet = loadCurrentOutletName() ?? DEFAULT_OUTLET.outletName;
  const existing = getOutlet(currentOutlet) ?? DEFAULT_OUTLET;
  const updated: OutletConfig = {
    ...existing,
    prices,
    updatedAt: new Date().toISOString(),
  };
  upsertOutlet(updated);
  notifySync('prices');
  broadcastPrices(prices, undefined, currentOutlet);
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
    history: history.slice(0, 50), // keep latest 50
    updatedAt: new Date().toISOString(),
  };
  upsertOutlet(updated);
  notifySync('history');
}
