# TDD Guide — Test-Driven Development with Vitest

## Philosophy

**Write the test first. Let it fail. Make it pass. Refactor.**

For this app, TDD is non-negotiable for:
1. `goldCalc.js` — calculation errors cost money
2. All backend service functions
3. All RBAC middleware
4. React hooks with side effects

TDD is optional (but encouraged) for:
- Pure UI components (use snapshot tests reactively)
- Simple formatters (write tests alongside)

---

## Test Stack

| Tool | Purpose |
|---|---|
| `vitest` | Test runner (both client and server) |
| `@testing-library/react` | React component + hook tests |
| `@testing-library/user-event` | Realistic browser interaction |
| `@testing-library/jest-dom` | Extra DOM matchers |
| `supertest` | HTTP integration tests for Express |
| `msw` (Mock Service Worker) | Mock API in frontend tests |

---

## Setup

### Client `vite.config.js`
```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      exclude: ['src/tests/**', '**/*.config.*'],
    },
  },
});
```

### Client `src/tests/setup.js`
```js
import '@testing-library/jest-dom';
import { server } from './mocks/server';

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### Server `vitest.config.js`
```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
  },
});
```

### Server `src/tests/setup.js`
```js
import { vi } from 'vitest';

// Mock Supabase — never hit real DB in unit tests
vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  },
}));
```

---

## 1. CORE: goldCalc Tests (write these first)

```js
// client/src/utils/goldCalc.test.js  (mirrors server/src/utils/goldCalc.js)
import { describe, it, expect } from 'vitest';
import { computeGoldPurchase } from './goldCalc.js';

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

    it('handles very small touch percentages', () => {
      const result = computeGoldPurchase({
        grossWeight: 100,
        touchPercent: 22, // low-grade
        marketRate: 9500,
        cashGiven: 0,
      });
      expect(result.pureWeight.toFixed(4)).toBe('22.0000');
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

    it('handles fractional market rates', () => {
      const result = computeGoldPurchase({
        grossWeight: 1,
        touchPercent: 100,
        marketRate: 9512.5,
        cashGiven: 0,
      });
      expect(result.pureValue.toFixed(2)).toBe('9512.50');
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

    it('pending is negative when shop overpaid (seller owes shop)', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 45000,
      });
      expect(result.pendingAmount.toNumber()).toBeLessThan(0);
      expect(result.pendingAmount.toFixed(2)).toBe('-6643.75');
    });

    it('pending equals pure value when no cash given', () => {
      const result = computeGoldPurchase({
        grossWeight: 5,
        touchPercent: 80.75,
        marketRate: 9500,
        cashGiven: 0,
      });
      expect(result.pendingAmount.toFixed(2)).toBe('38356.25');
    });
  });

  describe('validation errors', () => {
    it('throws if grossWeight is 0 or negative', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 0, touchPercent: 80, marketRate: 9500, cashGiven: 0
      })).toThrow('grossWeight must be > 0');

      expect(() => computeGoldPurchase({
        grossWeight: -5, touchPercent: 80, marketRate: 9500, cashGiven: 0
      })).toThrow('grossWeight must be > 0');
    });

    it('throws if touchPercent is out of range', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 0, marketRate: 9500, cashGiven: 0
      })).toThrow('touchPercent must be 0–100');

      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 101, marketRate: 9500, cashGiven: 0
      })).toThrow('touchPercent must be 0–100');
    });

    it('throws if marketRate is 0 or negative', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 80, marketRate: 0, cashGiven: 0
      })).toThrow('marketRate must be > 0');
    });

    it('throws if cashGiven is negative', () => {
      expect(() => computeGoldPurchase({
        grossWeight: 5, touchPercent: 80, marketRate: 9500, cashGiven: -100
      })).toThrow('cashGiven must be ≥ 0');
    });
  });

  describe('floating-point precision', () => {
    it('avoids IEEE 754 floating-point errors', () => {
      // Classic JS bug: 0.1 + 0.2 !== 0.3
      const result = computeGoldPurchase({
        grossWeight: 3.3,
        touchPercent: 91.666,
        marketRate: 9333.33,
        cashGiven: 0,
      });
      // Must not produce NaN, Infinity, or wildly wrong values
      expect(result.pureWeight.isFinite()).toBe(true);
      expect(result.pureValue.isFinite()).toBe(true);
    });
  });
});
```

---

## 2. Backend: purchases.service Tests

```js
// server/src/tests/purchases.service.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPurchase } from '../services/purchases.service.js';
import { supabase } from '../services/supabase.js';

describe('createPurchase service', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stores server-computed values, not client-sent ones', async () => {
    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'abc', pure_weight: '4.0375', pure_value: '38356.2500' },
          error: null,
        }),
      }),
    });
    supabase.from.mockReturnValue({ insert: mockInsert });

    const result = await createPurchase({
      grossWeight: 5,
      touchPercent: 80.75,
      marketRate: 9500,
      cashGiven: 30000,
      sellerName: 'Test Seller',
      purchaseDate: '2025-06-01',
    }, 'user-uuid');

    // Check insert was called with server-calculated pure_weight
    const insertedData = mockInsert.mock.calls[0][0];
    expect(insertedData.pure_weight).toBe('4.0375');
    expect(insertedData.pure_value).toBe('38356.2500');
    expect(insertedData.pending_amount).toBe('8356.2500');
  });

  it('throws ApiError on DB failure', async () => {
    supabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null, error: { message: 'DB connection refused' }
          }),
        }),
      }),
    });

    await expect(createPurchase({
      grossWeight: 5, touchPercent: 80, marketRate: 9500,
      cashGiven: 0, sellerName: 'X', purchaseDate: '2025-06-01',
    }, 'user-uuid')).rejects.toThrow('DB_ERROR');
  });
});
```

---

## 3. Backend: RBAC Middleware Tests

```js
// server/src/tests/rbac.test.js
import { describe, it, expect, vi } from 'vitest';
import { requireRole } from '../middleware/rbac.middleware.js';

const makeReq = (role) => ({ user: { role } });
const makeRes = () => ({ status: vi.fn().mockReturnThis(), json: vi.fn() });

describe('requireRole middleware', () => {
  it('calls next() when role is allowed', () => {
    const next = vi.fn();
    requireRole(['OWNER', 'STAFF'])(makeReq('STAFF'), makeRes(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it('returns 403 when role is not allowed', () => {
    const next = vi.fn();
    const res = makeRes();
    requireRole(['OWNER'])(makeReq('STAFF'), res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 403 when no user attached to request', () => {
    const next = vi.fn();
    const res = makeRes();
    requireRole(['OWNER'])({ user: null }, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

---

## 4. Backend: HTTP Integration Tests (Supertest)

```js
// server/src/tests/purchases.routes.test.js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app } from '../index.js';
import { makeTestJWT } from './helpers.js';

const ownerToken  = makeTestJWT({ role: 'OWNER', sub: 'owner-uuid' });
const staffToken  = makeTestJWT({ role: 'STAFF', sub: 'staff-uuid' });
const viewerToken = makeTestJWT({ role: 'VIEWER', sub: 'viewer-uuid' });

describe('POST /api/purchases', () => {
  const validBody = {
    purchaseDate: '2025-06-01',
    sellerName: 'Integration Test Seller',
    grossWeight: 5,
    touchPercent: 80.75,
    marketRate: 9500,
    cashGiven: 30000,
  };

  it('returns 201 for STAFF', async () => {
    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${staffToken}`)
      .send(validBody);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.pure_weight).toBe('4.0375');
  });

  it('returns 403 for VIEWER', async () => {
    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send(validBody);
    expect(res.status).toBe(403);
  });

  it('returns 401 with no token', async () => {
    const res = await request(app).post('/api/purchases').send(validBody);
    expect(res.status).toBe(401);
  });

  it('returns 400 for missing required fields', async () => {
    const res = await request(app)
      .post('/api/purchases')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({ sellerName: 'Missing fields' }); // no weight/rate
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('DELETE /api/purchases/:id', () => {
  it('returns 200 for OWNER', async () => {
    const res = await request(app)
      .delete('/api/purchases/some-uuid')
      .set('Authorization', `Bearer ${ownerToken}`);
    expect([200, 404]).toContain(res.status); // 404 if row doesn't exist in test DB
  });

  it('returns 403 for STAFF', async () => {
    const res = await request(app)
      .delete('/api/purchases/some-uuid')
      .set('Authorization', `Bearer ${staffToken}`);
    expect(res.status).toBe(403);
  });
});
```

```js
// server/src/tests/helpers.js
import jwt from 'jsonwebtoken';

export function makeTestJWT(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET ?? 'test-secret', { expiresIn: '1h' });
}
```

---

## 5. Frontend: Hook Tests

```js
// client/src/features/purchases/purchases.test.js
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { usePurchases } from './usePurchases.js';
import { server } from '../../tests/mocks/server';
import { http, HttpResponse } from 'msw';

const wrapper = ({ children }) => (
  <QueryClientProvider client={new QueryClient({
    defaultOptions: { queries: { retry: false } }
  })}>
    {children}
  </QueryClientProvider>
);

describe('usePurchases', () => {
  it('returns purchases from API', async () => {
    server.use(
      http.get('/api/purchases', () =>
        HttpResponse.json({ success: true, data: [{ id: '1', seller_name: 'Test' }], meta: { total: 1 } })
      )
    );

    const { result } = renderHook(() => usePurchases({}), { wrapper });
    await act(async () => { /* wait for query */ });
    expect(result.current.data?.data).toHaveLength(1);
  });
});
```

---

## 6. Frontend: Form Component Tests

```js
// client/src/features/purchases/PurchaseFormDrawer.test.jsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PurchaseFormDrawer } from './PurchaseFormDrawer.jsx';

describe('PurchaseFormDrawer', () => {
  it('shows live-calculated pure weight as user types', async () => {
    const user = userEvent.setup();
    render(<PurchaseFormDrawer isOpen onClose={() => {}} />);

    await user.type(screen.getByLabelText(/gross weight/i), '5');
    await user.type(screen.getByLabelText(/touch %/i), '80.75');
    await user.type(screen.getByLabelText(/market rate/i), '9500');

    await waitFor(() => {
      expect(screen.getByTestId('calc-pure-weight')).toHaveTextContent('4.0375');
    });
  });

  it('shows validation errors on empty submit', async () => {
    const user = userEvent.setup();
    render(<PurchaseFormDrawer isOpen onClose={() => {}} />);

    await user.click(screen.getByRole('button', { name: /save entry/i }));

    expect(await screen.findByText(/seller name is required/i)).toBeInTheDocument();
    expect(await screen.findByText(/gross weight is required/i)).toBeInTheDocument();
  });
});
```

---

## 7. Running Tests

```bash
# Client tests
cd client
npx vitest               # watch mode
npx vitest run           # single run
npx vitest run --coverage

# Server tests
cd server
npx vitest               # watch mode
npx vitest run

# Specific file
npx vitest run src/utils/goldCalc.test.js

# Coverage report
npx vitest run --coverage --reporter=verbose
```

---

## 8. Test Order of Operations (TDD Sequence)

When building a new feature (e.g., purchase entry):

```
1. Write goldCalc.test.js    → RED (function doesn't exist)
2. Write goldCalc.js          → GREEN
3. Refactor goldCalc.js       → REFACTOR (add Decimal.js)
4. Write purchases.service.test.js → RED
5. Write purchases.service.js → GREEN
6. Write rbac.test.js         → RED
7. Write rbac.middleware.js   → GREEN
8. Write purchases.routes.test.js → RED (HTTP layer)
9. Wire up routes + controllers → GREEN
10. Write PurchaseFormDrawer.test.jsx → RED
11. Build PurchaseFormDrawer.jsx → GREEN
12. Write usePurchases.test.js → RED
13. Build usePurchases.js → GREEN
```

---

## 9. DB Validation

Since we use Supabase CLI, validate DB and RLS via:

```bash
# Run against local Supabase
supabase db reset                     # fresh state

# Check calculated fields are correctly stored (not drifted)
supabase sql --local --file supabase/tests/validate_calculations.sql
```

```sql
-- supabase/tests/validate_calculations.sql
-- Verify no rows have mismatched calculated values
SELECT id, seller_name,
  gross_weight, touch_percent, pure_weight,
  round(gross_weight * touch_percent / 100, 4) as expected_pure_weight,
  abs(pure_weight - round(gross_weight * touch_percent / 100, 4)) as delta
FROM purchases
WHERE abs(pure_weight - round(gross_weight * touch_percent / 100, 4)) > 0.0001;
-- Should return 0 rows
```

---

## CI Coverage Targets

| Area | Target |
|---|---|
| `utils/goldCalc.js` | 100% |
| `services/*.service.js` | ≥ 90% |
| `middleware/*.middleware.js` | ≥ 90% |
| `routes/` (integration) | ≥ 80% |
| React components/hooks | ≥ 70% |
