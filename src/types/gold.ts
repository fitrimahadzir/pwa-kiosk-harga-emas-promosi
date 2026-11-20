export type GoldPurity = '999' | '916' | '375';

export interface GoldPriceItem {
  purity: GoldPurity;
  label: string;
  karat: string;
  fineness: string;
  sellPrice: number;
  buyPrice: number;
  previousSellPrice: number;
  updatedAt: string;
}

export interface PromoItem {
  id: string;
  imageUrl: string;
  isActive: boolean;
  /** Tajuk pakej yang dipaparkan pada halaman detail poster. */
  title: string;
  /** Penerangan ringkas pakej. */
  description: string;
  /** Harga pakej dalam RM. 0 bermaksud tiada harga ditetapkan. */
  packagePrice: number;
}

export interface PriceHistoryEntry {
  id: string;
  timestamp: string;
  purity: GoldPurity;
  oldSellPrice: number;
  newSellPrice: number;
  oldBuyPrice: number;
  newBuyPrice: number;
  adminNote?: string;
}

export interface ShopSettings {
  shopName: string;
  outletName: string;
  branch: string;
  phone: string;
  address: string;
  tagline: string;
  currency: string;
}

export interface CounterAnnouncement {
  /** Teks pengumuman kaunter (marquee). Kosong = pita tersembunyi. */
  message: string;
  updatedAt: string;
}

export interface OutletConfig {
  outletName: string;
  prices: Record<GoldPurity, GoldPriceItem>;
  promos: PromoItem[];
  settings: ShopSettings;
  history: PriceHistoryEntry[];
  updatedAt: string;
}

/** Jualan semasa seorang staff di satu outlet. */
export interface StaffSale {
  name: string;
  sale: number;
}

/**
 * Prestasi jualan bagi satu outlet.
 * `total` ialah gabungan jualan semua staff dalam outlet ini.
 */
export interface OutletStaffPerformance {
  outlet: string;
  staff: StaffSale[];
  total: number;
}

export interface CalculatorInput {
  purity: GoldPurity;
  weight: number;
  workmanship: number;
  discount: number;
  discountType: 'fixed' | 'percent';
  hasTradeIn: boolean;
  tradeInPurity: GoldPurity;
  tradeInWeight: number;
  tradeInRate: number;
  /** Harga tetap pakej promosi. Jika > 0, menggantikan kos emas + upah. */
  packagePrice?: number;
  /** Nama pakej promosi untuk resit sebut harga. */
  packageTitle?: string;
}

export interface QuotationResult {
  quoteId: string;
  timestamp: string;
  purity: GoldPurity;
  karat: string;
  weight: number;
  pricePerGram: number;
  goldCost: number;
  workmanship: number;
  subtotal: number;
  discountAmount: number;
  hasTradeIn: boolean;
  tradeInWeight: number;
  tradeInRate: number;
  tradeInPurity: GoldPurity;
  tradeInAmount: number;
  finalTotal: number;
  /** Harga tetap pakej promosi (jika sebut harga dijana dari poster). */
  packagePrice?: number;
  packageTitle?: string;
}

/** Satu resit / sebut harga yang disimpan di Supabase untuk laporan admin. */
export interface ReceiptRecord {
  id: string;
  /** Nombor resit rasmi dari server. Resit lama guna quoteId sebagai fallback. */
  receiptNumber: string;
  quoteId: string;
  outletName: string;
  createdAt: string;
  purity: GoldPurity;
  karat: string;
  weight: number;
  pricePerGram: number;
  goldCost: number;
  workmanship: number;
  subtotal: number;
  discountAmount: number;
  hasTradeIn: boolean;
  tradeInPurity: GoldPurity;
  tradeInWeight: number;
  tradeInRate: number;
  tradeInAmount: number;
  finalTotal: number;
  packagePrice: number;
  packageTitle: string;
}
