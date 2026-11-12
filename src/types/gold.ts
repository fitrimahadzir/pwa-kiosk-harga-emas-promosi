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
  title: string;
  subtitle: string;
  badge: string;
  imageUrl: string;
  validUntil: string;
  terms: string;
  isActive: boolean;
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

export interface OutletConfig {
  outletName: string;
  prices: Record<GoldPurity, GoldPriceItem>;
  promos: PromoItem[];
  settings: ShopSettings;
  history: PriceHistoryEntry[];
  updatedAt: string;
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
}
