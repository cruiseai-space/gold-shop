// server/src/tests/purchases.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as purchasesService from '../services/purchases.service.js';
import { supabase } from '../services/supabase.js';

vi.mock('../services/supabase.js', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
    },
  };
});

describe('purchases.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createPurchase', () => {
    it('calculates and stores correct values', async () => {
      const mockQuery = supabase.from();
      mockQuery.insert.mockReturnThis();
      mockQuery.select.mockReturnThis();
      mockQuery.single.mockResolvedValue({ 
        data: { id: 'p-1', pure_weight: '4.0375' }, 
        error: null 
      });

      const purchaseData = {
        purchaseDate: '2025-06-01',
        sellerName: 'Test Seller',
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 30000,
      };

      const result = await purchasesService.createPurchase(purchaseData, 'user-123');

      expect(result.id).toBe('p-1');
      const insertedData = mockQuery.insert.mock.calls[0][0];
      expect(insertedData.pure_weight).toBe('4.0375');
      expect(insertedData.pure_value).toBe('38356.2500');
      expect(insertedData.pending_amount).toBe('8356.2500');
    });
  });
});
