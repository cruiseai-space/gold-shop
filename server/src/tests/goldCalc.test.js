// server/src/tests/goldCalc.test.js
import { describe, it, expect } from 'vitest';
import { computeGoldPurchase } from '../utils/goldCalc.js';

describe('computeGoldPurchase', () => {
  describe('pure weight calculation', () => {
    it('computes pureWeight = grossWeight × (touchPercent / 100)', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 0,
      });
      // 5 × 0.8075 = 4.0375
      expect(result.pureWeight.toFixed(4)).toBe('4.0375');
    });

    it('handles 100% touch (pure gold bar)', () => {
      const result = computeGoldPurchase({
        grossWeight: 10,
        touchPercent: 100,
        marketRate: 9500,
        cashGiven: 0,
      });
      expect(result.pureWeight.toFixed(4)).toBe('10.0000');
    });
  });

  describe('pure value calculation', () => {
    it('computes pureValue = pureWeight × marketRate', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 0,
      });
      // 4.0375 × 9500 = 38356.25
      expect(result.pureValue.toFixed(2)).toBe('38356.25');
    });
  });

  describe('pending amount calculation', () => {
    it('pending is positive when shop owes seller', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 30000,
      });
      // 38356.25 − 30000 = 8356.25
      expect(result.pendingAmount.toFixed(2)).toBe('8356.25');
    });

    it('pending is zero when fully settled', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 38356.25,
      });
      expect(result.pendingAmount.toFixed(2)).toBe('0.00');
    });

    it('pending is negative when shop overpaid', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 45000,
      });
      expect(result.pendingAmount.toFixed(2)).toBe('-6643.75');
    });
  });

  describe('validation errors', () => {
    it('throws if grossWeight is 0 or negative', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 0, touchPercent: 80, marketRate: 9500
      })).toThrow('grossWeight must be > 0');
    });

    it('throws if touchPercent is out of range', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 0, marketRate: 9500
      })).toThrow('touchPercent must be 0–100');

      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 101, marketRate: 9500
      })).toThrow('touchPercent must be 0–100');
    });

    it('throws if marketRate is 0 or negative', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 80, marketRate: 0
      })).toThrow('marketRate must be > 0');
    });
  });

  describe('precision', () => {
    it('avoids floating point errors', () => {
      const result = computeGoldPurchase({
        grossWeight: 3.3,
        touchPercent: 91.666,
        marketRate: 9333.33,
        cashGiven: 0,
      });
      expect(result.pureWeight.isFinite()).toBe(true);
      expect(result.pureValue.isFinite()).toBe(true);
    });
  });

  describe('transactionType: SELLING', () => {
    it('pending is negative when member owes shop (cashGiven < pureValue)', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 30000,
        transactionType: 'SELLING',
      });
      // basePending = 38356.25 - 30000 = 8356.25
      // pending = -8356.25
      expect(result.pendingAmount.toFixed(2)).toBe('-8356.25');
      expect(result.transactionType).toBe('SELLING');
    });

    it('pending is positive when member overpaid shop (cashGiven > pureValue)', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 45000,
        transactionType: 'SELLING',
      });
      // basePending = 38356.25 - 45000 = -6643.75
      // pending = 6643.75
      expect(result.pendingAmount.toFixed(2)).toBe('6643.75');
    });

    it('throws if transactionType is invalid', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 80, marketRate: 9500, transactionType: 'INVALID'
      })).toThrow('transactionType must be BUYING or SELLING');
    });
    
    it('throws if cashGiven is negative', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 80, marketRate: 9500, cashGiven: -100
      })).toThrow('cashGiven must be ≥ 0');
    });
  });
});
