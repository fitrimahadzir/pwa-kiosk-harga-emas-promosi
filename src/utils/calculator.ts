import { CalculatorInput, GoldPriceItem, GoldPurity, QuotationResult } from '../types/gold';

/**
 * Format number to Malaysian Ringgit display
 */
export function formatMYR(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return 'RM 0.00';
  }
  return `RM ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format weight in grams
 */
export function formatWeight(grams: number): string {
  if (isNaN(grams) || grams === null || grams === undefined) {
    return '0.00 g';
  }
  return `${grams.toFixed(2)} g`;
}

/**
 * Calculate price difference and percentage
 */
export function calculatePriceChange(current: number, previous: number) {
  if (!previous || previous === current) {
    return { diff: 0, percent: 0, direction: 'neutral' as const };
  }
  const diff = current - previous;
  const percent = (diff / previous) * 100;
  return {
    diff,
    percent,
    direction: diff > 0 ? ('up' as const) : ('down' as const),
  };
}

/**
 * Pure calculation function for gold sale with workmanship, discount, and trade-in
 */
export function computeQuotation(
  input: CalculatorInput,
  prices: Record<GoldPurity, GoldPriceItem>
): QuotationResult {
  const purityItem = prices[input.purity] || {
    sellPrice: 0,
    karat: '22K',
  };
  const pricePerGram = purityItem.sellPrice || 0;
  const weight = Math.max(0, Number(input.weight) || 0);
  const workmanship = Math.max(0, Number(input.workmanship) || 0);

  const goldCost = Math.round(weight * pricePerGram * 100) / 100;
  const subtotal = Math.round((goldCost + workmanship) * 100) / 100;

  // Calculate discount
  let discountAmount = 0;
  const discountInput = Math.max(0, Number(input.discount) || 0);
  if (input.discountType === 'percent') {
    discountAmount = Math.round(((subtotal * discountInput) / 100) * 100) / 100;
  } else {
    discountAmount = Math.min(subtotal, Math.round(discountInput * 100) / 100);
  }

  // Calculate trade-in deduction
  let tradeInAmount = 0;
  const tradeInWeight = Math.max(0, Number(input.tradeInWeight) || 0);
  const tradeInRate = Math.max(0, Number(input.tradeInRate) || 0);
  if (input.hasTradeIn && tradeInWeight > 0 && tradeInRate > 0) {
    tradeInAmount = Math.round(tradeInWeight * tradeInRate * 100) / 100;
  }

  const finalTotal = Math.max(0, Math.round((subtotal - discountAmount - tradeInAmount) * 100) / 100);

  // Generate unique quote ID
  const quoteId = `QT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}`;

  return {
    quoteId,
    timestamp: new Date().toISOString(),
    purity: input.purity,
    karat: purityItem.karat,
    weight,
    pricePerGram,
    goldCost,
    workmanship,
    subtotal,
    discountAmount,
    hasTradeIn: input.hasTradeIn,
    tradeInPurity: input.tradeInPurity,
    tradeInWeight,
    tradeInRate,
    tradeInAmount,
    finalTotal,
  };
}
