# API Reference

## Base URL
- Development: `http://localhost:3001/api`
- Production: `https://swarna-api.railway.app/api`

All endpoints require `Authorization: Bearer <jwt>` unless marked 🔓.

---

## Auth Routes

### POST `/api/auth/login` 🔓
```js
// Request
{ email: string, password: string }

// Response 200
{
  success: true,
  data: {
    token: "<jwt>",
    user: { id, full_name, role, email }
  }
}

// Response 401
{ success: false, error: { code: "INVALID_CREDENTIALS", message: "..." } }
```

```js
// auth.controller.js
async function login(req, res) {
  const { email, password } = req.body;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const profile = await usersService.getProfile(data.user.id);
  if (!profile.is_active) throw new ApiError(403, 'ACCOUNT_DISABLED', 'Account is inactive');

  const token = jwt.sign(
    { sub: data.user.id, role: profile.role, name: profile.full_name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  await logsService.log({ userId: data.user.id, actionType: 'LOGIN' });
  res.json({ success: true, data: { token, user: { ...profile, email: data.user.email } } });
}
```

### POST `/api/auth/logout`
```js
// Clears server-side session (Supabase), logs action
// Response 200: { success: true }
```

### GET `/api/auth/me`
```js
// Returns current user profile
// Response 200: { success: true, data: { id, full_name, role, email, is_active } }
```

---

## Purchases Routes

### GET `/api/purchases`
Query params: `?page=1&limit=20&dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD&seller=name`

```js
// Response 200
{
  success: true,
  data: [
    {
      id, purchase_date, seller_name, cash_source,
      gross_weight, touch_percent, pure_weight,
      market_rate, booked_rate, pure_value, cash_given, pending_amount,
      notes, created_by, created_at, updated_at,
      creator: { id, full_name }   // joined
    }
  ],
  meta: { page: 1, limit: 20, total: 142, pages: 8 }
}
```

```js
// purchases.service.js → listPurchases
async function listPurchases({ page = 1, limit = 20, dateFrom, dateTo, seller }) {
  let query = supabase
    .from('purchases')
    .select(`
      *,
      creator:profiles!purchases_created_by_fkey (id, full_name)
    `, { count: 'exact' })
    .order('purchase_date', { ascending: false })
    .range((page - 1) * limit, page * limit - 1);

  if (dateFrom) query = query.gte('purchase_date', dateFrom);
  if (dateTo)   query = query.lte('purchase_date', dateTo);
  if (seller)   query = query.ilike('seller_name', `%${seller}%`);

  const { data, error, count } = await query;
  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return { data, total: count };
}
```

### GET `/api/purchases/:id`
```js
// Response 200: single purchase with creator profile
// Response 404: { success: false, error: { code: 'NOT_FOUND' } }
```

### POST `/api/purchases` _(STAFF | OWNER)_
```js
// Request body
{
  purchaseDate: "2025-06-01",        // ISO date string
  sellerName: "Muthu",
  cashSource: "Safe",
  grossWeight: 5.0,                  // grams
  touchPercent: 80.75,               // percentage
  marketRate: 9500.00,               // ₹ per gram
  bookedRate: 9480.00,               // optional
  cashGiven: 30000.00,               // ₹ (can be 0)
  notes: ""                          // optional
}

// Server ALWAYS recalculates — never trusts client-sent calc fields
// pureWeight = grossWeight × (touchPercent / 100)
// pureValue  = pureWeight × marketRate
// pending    = pureValue − cashGiven

// Response 201
{ success: true, data: { <full purchase row> } }
```

```js
// purchases.service.js → createPurchase
async function createPurchase(data, userId) {
  const calc = goldCalc.compute({
    grossWeight: new Decimal(data.grossWeight),
    touchPercent: new Decimal(data.touchPercent),
    marketRate:   new Decimal(data.marketRate),
    cashGiven:    new Decimal(data.cashGiven ?? 0),
  });

  const { data: row, error } = await supabase
    .from('purchases')
    .insert({
      purchase_date:  data.purchaseDate,
      seller_name:    data.sellerName,
      cash_source:    data.cashSource ?? null,
      gross_weight:   calc.grossWeight.toFixed(4),
      touch_percent:  calc.touchPercent.toFixed(4),
      pure_weight:    calc.pureWeight.toFixed(4),
      market_rate:    calc.marketRate.toFixed(4),
      booked_rate:    data.bookedRate ? new Decimal(data.bookedRate).toFixed(4) : null,
      pure_value:     calc.pureValue.toFixed(4),
      cash_given:     calc.cashGiven.toFixed(4),
      pending_amount: calc.pendingAmount.toFixed(4),
      notes:          data.notes ?? null,
      created_by:     userId,
    })
    .select('*')
    .single();

  if (error) throw new ApiError(500, 'DB_ERROR', error.message);
  return row;
}
```

### PATCH `/api/purchases/:id` _(STAFF own+today | OWNER any)_
```js
// Partial update — same fields as POST, all optional
// Server recalculates if weight/rate/cash fields change
// Logs payload_before and payload_after to audit_logs
```

### DELETE `/api/purchases/:id` _(OWNER only)_
```js
// Soft-or-hard delete (hard delete, row gone — logged to audit)
// Response 200: { success: true, data: { deleted: true } }
// Response 403 if role is STAFF/VIEWER
```

---

## Rate Entries Routes

### GET `/api/rates`
Query: `?limit=30&dateFrom=&dateTo=`
```js
// Returns rate history newest-first
// Response 200: { success: true, data: [...], meta: {...} }
```

### GET `/api/rates/today`
```js
// Returns today's most recent rate entry, or null
// Response 200: { success: true, data: { market_rate, booked_rate, effective_date } | null }
```

### POST `/api/rates` _(STAFF | OWNER)_
```js
// Request
{
  marketRate: 9500.00,
  bookedRate: 9480.00,    // optional
  effectiveDate: "2025-06-01",
  notes: ""
}
// Response 201: { success: true, data: { <rate entry row> } }
```

---

## Audit Log Routes

### GET `/api/logs`
Query: `?page=1&limit=50&userId=&actionType=&dateFrom=&dateTo=`
```js
// All roles can view. Filter by user, action, date range.
// Response 200
{
  success: true,
  data: [
    {
      id, user_name, action_type, entity_type, entity_id,
      payload_before, payload_after, ip_address, created_at
    }
  ],
  meta: { page, limit, total }
}
```

---

## User Management Routes _(OWNER only)_

### GET `/api/users`
```js
// Returns all profiles
// Response 200: { success: true, data: [{ id, full_name, role, is_active, created_at }] }
```

### POST `/api/users/invite`
```js
// Sends Supabase magic link invite
// Request: { email, fullName, role: "STAFF" | "VIEWER" }
// Response 201: { success: true, data: { email, role } }
```

### PATCH `/api/users/:id/role`
```js
// Request: { role: "OWNER" | "STAFF" | "VIEWER" }
// Cannot demote the only OWNER
```

### PATCH `/api/users/:id/deactivate`
```js
// Sets is_active = false. User can no longer log in.
```

---

## Middleware Stack (per request)

```
Request
  → morgan (HTTP logging)
  → helmet (security headers)
  → cors
  → express.json()
  → auth.middleware       → 401 if no/bad JWT
  → rbac.middleware       → 403 if wrong role
  → validate.middleware   → 400 if bad payload
  → controller
  → auditLog.middleware   → writes to audit_logs (POST/PATCH/DELETE only)
  → error.middleware      → formats and sends error response
```

---

## goldCalc.service.js (canonical calculation)

```js
// server/src/utils/goldCalc.js  (mirrors client/src/utils/goldCalc.js)
import Decimal from 'decimal.js';

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });

/**
 * Core gold purchase calculation.
 * All inputs are Numbers or Decimal instances.
 * Returns all values as Decimal for further precision control.
 */
export function computeGoldPurchase({ grossWeight, touchPercent, marketRate, cashGiven = 0 }) {
  const gw  = new Decimal(grossWeight);
  const tp  = new Decimal(touchPercent);
  const mr  = new Decimal(marketRate);
  const cg  = new Decimal(cashGiven);

  if (gw.lte(0))             throw new Error('grossWeight must be > 0');
  if (tp.lte(0) || tp.gt(100)) throw new Error('touchPercent must be 0–100');
  if (mr.lte(0))             throw new Error('marketRate must be > 0');
  if (cg.lt(0))              throw new Error('cashGiven must be ≥ 0');

  const pureWeight    = gw.times(tp.div(100));
  const pureValue     = pureWeight.times(mr);
  const pendingAmount = pureValue.minus(cg);

  return {
    grossWeight:    gw,
    touchPercent:   tp,
    pureWeight,     // 4 decimal places
    marketRate:     mr,
    cashGiven:      cg,
    pureValue,      // 4 decimal places
    pendingAmount,  // positive = owe seller, negative = seller owes shop
  };
}
```

---

## Error Codes Reference

| Code | HTTP | Meaning |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Wrong email/password |
| `TOKEN_EXPIRED` | 401 | JWT expired |
| `TOKEN_INVALID` | 401 | Malformed/tampered JWT |
| `INSUFFICIENT_ROLE` | 403 | User role not allowed for this action |
| `ACCOUNT_DISABLED` | 403 | Profile is_active = false |
| `NOT_FOUND` | 404 | Entity does not exist |
| `VALIDATION_ERROR` | 400 | Body fails Joi schema |
| `CALC_MISMATCH` | 422 | Client-sent calc != server calc (logged, server value wins) |
| `DB_ERROR` | 500 | Supabase returned error |
