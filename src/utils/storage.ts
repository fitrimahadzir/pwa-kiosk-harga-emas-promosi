import { GoldPriceItem, GoldPurity, PromoItem, PriceHistoryEntry, ShopSettings } from '../types/gold';

const PRICES_KEY = 'emaspos_gold_prices_v1';
const PROMOS_KEY = 'emaspos_promos_v1';
const SETTINGS_KEY = 'emaspos_settings_v1';
const HISTORY_KEY = 'emaspos_price_history_v1';

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

export function loadPrices(): Record<GoldPurity, GoldPriceItem> {
  if (typeof window === 'undefined') return DEFAULT_PRICES;
  try {
    const saved = localStorage.getItem(PRICES_KEY);
    if (!saved) return DEFAULT_PRICES;
    const parsed = JSON.parse(saved);
    return {
      '999': {
        ...DEFAULT_PRICES['999'],
        ...(parsed['999'] || {}),
        fineness: (parsed['999']?.fineness || DEFAULT_PRICES['999'].fineness).replace(/^(Ketulenan\s*)+/i, ''),
      },
      '916': {
        ...DEFAULT_PRICES['916'],
        ...(parsed['916'] || {}),
        fineness: (parsed['916']?.fineness || DEFAULT_PRICES['916'].fineness).replace(/^(Ketulenan\s*)+/i, ''),
      },
      '375': {
        ...DEFAULT_PRICES['375'],
        ...(parsed['375'] || {}),
        fineness: (parsed['375']?.fineness || DEFAULT_PRICES['375'].fineness).replace(/^(Ketulenan\s*)+/i, ''),
      },
    };
  } catch {
    return DEFAULT_PRICES;
  }
}

export function savePrices(prices: Record<GoldPurity, GoldPriceItem>) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PRICES_KEY, JSON.stringify(prices));
  notifySync('prices');
}

export function loadPromos(): PromoItem[] {
  if (typeof window === 'undefined') return DEFAULT_PROMOS;
  try {
    const saved = localStorage.getItem(PROMOS_KEY);
    if (!saved) return DEFAULT_PROMOS;
    return JSON.parse(saved);
  } catch {
    return DEFAULT_PROMOS;
  }
}

export function savePromos(promos: PromoItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROMOS_KEY, JSON.stringify(promos));
  notifySync('promos');
}

export function loadSettings(): ShopSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    const merged = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    // Migrate the old placeholder brand name to the official shop name.
    if (merged.shopName === 'KEDAI EMAS MAKMUR JAYA') {
      merged.shopName = DEFAULT_SETTINGS.shopName;
    }
    return merged;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: ShopSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  notifySync('settings');
}

export function loadHistory(): PriceHistoryEntry[] {
  if (typeof window === 'undefined') return DEFAULT_HISTORY;
  try {
    const saved = localStorage.getItem(HISTORY_KEY);
    if (!saved) return DEFAULT_HISTORY;
    return JSON.parse(saved);
  } catch {
    return DEFAULT_HISTORY;
  }
}

export function saveHistory(history: PriceHistoryEntry[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, 50))); // keep latest 50
  notifySync('history');
}
