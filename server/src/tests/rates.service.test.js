// server/src/tests/rates.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as ratesService from '../services/rates.service.js';
import { supabase } from '../services/supabase.js';

vi.mock('../services/supabase.js', () => {
  const mockQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  };
  return {
    supabase: {
      from: vi.fn(() => mockQuery),
    },
  };
});

describe('rates.service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a rate entry', async () => {
    const mockQuery = supabase.from();
    mockQuery.insert.mockReturnThis();
    mockQuery.select.mockReturnThis();
    mockQuery.single.mockResolvedValue({ 
      data: { id: 'r-1', market_rate: '9500' }, 
      error: null 
    });

    const result = await ratesService.createRate({ marketRate: 9500 }, 'user-123');
    expect(result.market_rate).toBe('9500');
    expect(mockQuery.insert).toHaveBeenCalledWith(expect.objectContaining({
      market_rate: 9500,
      set_by: 'user-123'
    }));
  });
});
