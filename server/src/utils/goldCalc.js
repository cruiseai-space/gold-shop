// server/src/utils/goldCalc.js
import Decimal from 'decimal.js';

// Set global precision for financial calculations
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Core gold transaction calculation logic.
 * Supports both BUYING (shop buys from seller) and SELLING (shop sells to member).
 * @param {Object} params
 * @param {number|string|Decimal} params.grossWeight - Physical weight in grams
 * @param {number|string|Decimal} params.touchPercent - Purity percentage (0-100)
 * @param {number|string|Decimal} params.marketRate - Price per gram in INR
 * @param {number|string|Decimal} params.cashGiven - Upfront payment in INR
 * @param {'BUYING'|'SELLING'} params.transactionType - Direction of trade (default: 'BUYING')
 */
export function computeGoldPurchase({ grossWeight, touchPercent, marketRate, cashGiven = 0, transactionType = 'BUYING' }) {
  const gw = new Decimal(grossWeight || 0);
  const tp = new Decimal(touchPercent || 0);
  const mr = new Decimal(marketRate || 0);
  const cg = new Decimal(cashGiven || 0);

  // Validation
  if (gw.lte(0)) throw new Error('grossWeight must be > 0');
  if (tp.lte(0) || tp.gt(100)) throw new Error('touchPercent must be 0–100');
  if (mr.lte(0)) throw new Error('marketRate must be > 0');
  if (cg.lt(0)) throw new Error('cashGiven must be ≥ 0');
  if (!['BUYING', 'SELLING'].includes(transactionType)) {
    throw new Error('transactionType must be BUYING or SELLING');
  }

  const pureWeight = gw.times(tp.div(100));
  const pureValue = pureWeight.times(mr);
  const basePending = pureValue.minus(cg);

  // BUYING:  positive pending = shop owes seller (we received gold, owe them cash)
  // SELLING: positive pending = member owes shop (they received gold, owe us cash)
  const pendingAmount = transactionType === 'SELLING'
    ? basePending.negated()
    : basePending;

  return {
    grossWeight: gw,
    touchPercent: tp,
    marketRate: mr,
    cashGiven: cg,
    pureWeight,       // Recommended: 4 decimal places for display
    pureValue,        // Recommended: 2 decimal places for display
    pendingAmount,    // Sign depends on transactionType
    transactionType,
  };
}
