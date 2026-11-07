import test from 'node:test';
import assert from 'node:assert/strict';
import { computeQuotation, formatMYR, formatWeight, calculatePriceChange } from './calculator.js';
import { GoldPriceItem, GoldPurity } from '../types/gold.js';

const mockPrices: Record<GoldPurity, GoldPriceItem> = {
  '999': {
    purity: '999',
    label: 'Emas 999',
    karat: '24K',
    fineness: '99.9%',
    sellPrice: 465.0,
    buyPrice: 420.0,
    previousSellPrice: 460.0,
    updatedAt: new Date().toISOString(),
  },
  '916': {
    purity: '916',
    label: 'Emas 916',
    karat: '22K',
    fineness: '91.6%',
    sellPrice: 425.0,
    buyPrice: 380.0,
    previousSellPrice: 423.0,
    updatedAt: new Date().toISOString(),
  },
  '375': {
    purity: '375',
    label: 'Emas 375',
    karat: '9K',
    fineness: '37.5%',
    sellPrice: 185.0,
    buyPrice: 140.0,
    previousSellPrice: 185.0,
    updatedAt: new Date().toISOString(),
  },
};

test('formatMYR formats values properly', () => {
  assert.equal(formatMYR(425), 'RM 425.00');
  assert.equal(formatMYR(1234.5), 'RM 1,234.50');
  assert.equal(formatMYR(0), 'RM 0.00');
});

test('formatWeight formats weight in grams', () => {
  assert.equal(formatWeight(5.25), '5.25 g');
  assert.equal(formatWeight(10), '10.00 g');
});

test('calculatePriceChange computes difference and direction', () => {
  const up = calculatePriceChange(465, 460);
  assert.equal(up.diff, 5);
  assert.equal(up.direction, 'up');

  const down = calculatePriceChange(420, 425);
  assert.equal(down.diff, -5);
  assert.equal(down.direction, 'down');

  const neutral = calculatePriceChange(185, 185);
  assert.equal(neutral.diff, 0);
  assert.equal(neutral.direction, 'neutral');
});

test('computeQuotation calculates basic gold sale correctly', () => {
  // 5.00 grams of 916 @ RM425.00 = RM 2,125.00
  // Upah: RM 100.00
  // Total: RM 2,225.00
  const result = computeQuotation(
    {
      purity: '916',
      weight: 5.0,
      workmanship: 100,
      discount: 0,
      discountType: 'fixed',
      hasTradeIn: false,
      tradeInPurity: '916',
      tradeInWeight: 0,
      tradeInRate: 0,
    },
    mockPrices
  );

  assert.equal(result.goldCost, 2125);
  assert.equal(result.workmanship, 100);
  assert.equal(result.subtotal, 2225);
  assert.equal(result.discountAmount, 0);
  assert.equal(result.tradeInAmount, 0);
  assert.equal(result.finalTotal, 2225);
});

test('computeQuotation handles percentage discount and trade-in', () => {
  // 10.00g of 999 @ RM465.00 = RM 4,650.00
  // Upah: RM 200.00
  // Subtotal = RM 4,850.00
  // 10% discount = RM 485.00
  // Trade-in: 4.00g of 916 @ RM 380.00 = RM 1,520.00
  // Final total = 4850 - 485 - 1520 = RM 2,845.00
  const result = computeQuotation(
    {
      purity: '999',
      weight: 10.0,
      workmanship: 200,
      discount: 10,
      discountType: 'percent',
      hasTradeIn: true,
      tradeInPurity: '916',
      tradeInWeight: 4.0,
      tradeInRate: 380.0,
    },
    mockPrices
  );

  assert.equal(result.goldCost, 4650);
  assert.equal(result.subtotal, 4850);
  assert.equal(result.discountAmount, 485);
  assert.equal(result.tradeInAmount, 1520);
  assert.equal(result.finalTotal, 2845);
});
