# AGENT_CONTEXT.md — Hermes Context File

> **Read this at the start of every coding session.**
> This file gives you (the Hermes agent) all the context you need to continue development without being re-briefed.

---

## What Is This App

**Swarna Ledger** — A gold purchase tracking system for a Tamil Nadu gold shop. Internal tool, used by 2-3 people.

Core operation: shop owner buys raw gold from sellers. Each purchase is logged with seller name, weight, purity (touch%), market rate, and cash paid. The app calculates the remaining amount owed (pending amount) automatically.

---

## The Single Most Important Calculation

```
Pure Weight  = Gross Weight (g) × (Touch % ÷ 100)
Pure Value   = Pure Weight × Market Rate (₹/g)
Pending Amt  = Pure Value − Cash Given

Positive pending → shop owes seller
Negative pending → seller owes shop (overpaid)
Zero            → settled
```

**Always use `decimal.js` for these. Never native JS floating-point.** This is money.

---

## Tech Stack (Non-Negotiable)

- **Frontend:** React 18 + Vite, JSX only (no TypeScript), Tailwind CSS v3
- **State:** TanStack Query v5 + React Context for auth
- **Forms:** react-hook-form + zod for validation
- **Backend:** Node.js 20 + Express 5
- **DB:** Supabase (PostgreSQL) free tier, RLS enabled
- **Auth:** Supabase Auth for credential store; Express issues its own JWT
- **Testing:** Vitest everywhere, React Testing Library, Supertest for HTTP
- **Deployment:** Railway free tier, GitHub Actions for CI/CD

---

## File Map (Where Things Live)

```
client/src/utils/goldCalc.js          ← THE canonical calculation function
server/src/utils/goldCalc.js          ← Server mirror (same logic, server-side)
server/src/middleware/auth.middleware.js  ← JWT verification
server/src/middleware/rbac.middleware.js  ← requireRole(['OWNER', 'STAFF'])
server/src/services/purchases.service.js ← createPurchase, listPurchases, etc.
client/src/features/purchases/PurchaseFormDrawer.jsx ← Main entry form
client/src/features/auth/AuthProvider.jsx            ← Token storage + context
client/src/api/client.js                             ← Axios instance + interceptors
supabase/migrations/                                 ← All SQL migrations
```

---

## RBAC Roles

| Role | Key Permissions |
|---|---|
| `OWNER` | Full CRUD, delete, user management |
| `STAFF` | Create/edit own entries (same day only), set rates |
| `VIEWER` | Read-only everywhere |

The role lives in the JWT payload: `{ sub, role, name, iat, exp }`. Always trust the JWT role for authorization — never the request body.

---

## Database Tables (Supabase)

| Table | Purpose |
|---|---|
| `profiles` | Extended user info (id = auth.users id) |
| `purchases` | Every gold purchase entry |
| `rate_entries` | Daily market/booked rate log |
| `audit_logs` | Immutable action trail |

All calculated fields (`pure_weight`, `pure_value`, `pending_amount`) are stored denormalized after server-side calculation. Do not recalculate from stored fields.

---

## TDD Workflow (Always Follow This Order)

1. Write failing test for the calculation / service / middleware
2. Run `vitest run` → see RED
3. Write minimal implementation
4. Run `vitest run` → see GREEN
5. Refactor if needed
6. Move to next unit

**goldCalc.js must have 100% test coverage at all times.** It's the financial heart of the app.

---

## API Shape

All responses:
```json
{ "success": true,  "data": { ... }, "meta": { ... } }   // success
{ "success": false, "error": { "code": "...", "message": "..." } }  // error
```

All protected routes require: `Authorization: Bearer <jwt>`

---

## Design Tokens (Most Important)

```css
--color-bg:       oklch(97.5% 0.012 75);  /* warm cream */
--color-ink:      oklch(18%   0.025 55);  /* near-black */
--color-primary:  oklch(52%   0.148 45);  /* burnt copper */
--color-gold:     oklch(72%   0.185 85);  /* real gold accent (use sparingly) */
--color-danger:   oklch(52%   0.198 25);  /* negative pending */
--color-success:  oklch(58%   0.145 145); /* positive/settled */

--font-display: 'Lora', Georgia, serif;
--font-body:    'Plus Jakarta Sans', system-ui, sans-serif;
--font-mono:    'IBM Plex Mono', monospace;   /* ALL currency and weight values */
```

Currency values: right-aligned, IBM Plex Mono, 2 decimal places.
Weight values: IBM Plex Mono, 4 decimal places.

---

## Component Patterns to Reuse

### Data fetching
```js
// Always TanStack Query
const { data, isLoading, error } = usePurchases(filters);
const mutation = useCreatePurchase(); // includes toast + cache invalidation
```

### Protected rendering
```jsx
<RequireRole roles={[ROLES.OWNER]}>
  <DeleteButton />
</RequireRole>
```

### Error handling
- Frontend forms: inline field errors via react-hook-form
- API errors: toast (sonner) via mutation `onError`
- Uncaught: centralized `error.middleware.js` on server, React error boundary on client

---

## Git Branch Convention

```
main   ← production (auto-deploys via GitHub Actions)
dev    ← integration (merge PRs here first, then PR dev→main)
feature/<name>
fix/<name>
chore/<name>
```

Commit format: `feat(purchases): add pagination to purchase table`

---

## Common Commands

```bash
# Local dev
cd client && npm run dev        # Vite dev server :5173
cd server && npm run dev        # Express :3001 (node --watch)
supabase start                  # Local Supabase

# Testing
cd client && npx vitest         # Watch mode
cd server && npx vitest         # Watch mode
npx vitest run                  # One-shot (CI)

# DB
supabase migration new <name>   # New migration file
supabase db push --local        # Apply to local
supabase db push                # Apply to remote (production)
supabase db reset               # Fresh local + all migrations

# Deploy (normally via CI)
railway up --service swarna-server
railway up --service swarna-client
```

---

## Known Constraints & Decisions

1. **No TypeScript.** JSX only. Owner team is small; TS overhead not worth it.
2. **No Redux.** TanStack Query + Context is enough for 2-3 users.
3. **No soft-delete on purchases.** Hard delete, but logged to audit_logs (immutable).
4. **JWT stored in localStorage.** httpOnly cookies ideal but Railway CORS made it complex. Acceptable for internal tool.
5. **No automated rate fetch.** Optional live fetch from GoldAPI.io, but manual entry is primary. See GOLD_APIS.md.
6. **Calculations stored, not derived.** `pure_weight`, `pure_value`, `pending_amount` are stored after server-side calc. Audit trail must reflect exactly what was computed at entry time.
7. **One shop only.** No multi-tenancy in v1. Schema has `created_by` for future use.

---

## What to Build Next (Phase Tracker)

Update this section as features complete:

- [ ] Phase 0: Scaffold (Vite, Express, Supabase schema, migrations)
- [ ] Phase 1: Auth (login page, JWT, AuthProvider, protected routes)
- [ ] Phase 2: goldCalc.js (TDD-first, 100% coverage)
- [ ] Phase 2: Purchase CRUD (service → controller → routes → frontend)
- [ ] Phase 3: Rate Entry panel
- [ ] Phase 3: Audit Logs viewer
- [ ] Phase 4: Settings / User Management (owner only)
- [ ] Phase 5: GitHub Actions CI + Railway deployment
- [ ] Phase 6: Polish (empty states, loading skeletons, error boundaries)

---

## Reminders

- Always run `npx vitest run` before committing
- `goldCalc.js` changes need both client and server files updated
- Never add `console.log` to production paths (use morgan for HTTP logging)
- All monetary display uses `Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' })`
- All date handling in IST (Asia/Kolkata). Use `date-fns` with timezone support.
- Supabase service role key is server-only. Anon key is client-safe.
