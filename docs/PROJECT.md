# Swarna Ledger — Project Master Document

> **Swarna** (சுவர்ணம்) = Gold in Tamil/Sanskrit.
> A digital account book for gold purchase tracking — built for Tamil Nadu gold retailers.

---

## 1. Project Ideology

This is an **internal operations tool**, not a customer-facing product. Two or three people will use it daily. Every design and engineering decision follows from that fact:

- **Accuracy over cleverness.** Gold calculations must be exact. No rounding errors. No ambiguity.
- **Trust over speed.** Every entry must be auditable. Who entered it, when, what changed.
- **Simplicity over features.** The MVP has one core flow: enter a gold purchase, see what you owe (or are owed).
- **Legibility over aesthetics.** Numbers must be instantly scannable. Currency values need weight — use monospace, strong contrast, right-aligned columns.
- **Offline-resilient.** The shop operates even when the internet flickers. Forms must validate locally. Submissions can retry.

The aesthetic direction is a **modernised South Indian ledger book** — warm aged cream, deep ink, real gold accents — not a generic SaaS dashboard. It should feel like a tool that belongs in a gold shop in Tamil Nadu, not a San Francisco startup.

---

## 2. Application Name & Identity

| Field | Value |
|---|---|
| App name | **Swarna Ledger** |
| Internal codename | `swarna` |
| Primary locale | Tamil Nadu, India |
| Currency | INR (₹) |
| Weight unit | Grams (g) |
| Gold purity input | Touch percentage (%) |
| Time zone | Asia/Kolkata (IST) |

---

## 3. Core Business Logic

### 3.1 The Purchase Entry

Every gold purchase creates one row in the purchase table. The shop owner buys gold from sellers (individuals, melters, other jewellers). Each transaction records:

| Field | Type | Description |
|---|---|---|
| Date | Date | Day of purchase |
| Seller Name | Text | Name of the person selling gold |
| Cash Bought From | Text | Where the cash came from (bank, safe, petty cash) |
| Cash Given | ₹ | How much cash was handed to the seller upfront |
| Gross Weight | g | Total physical weight of gold bought |
| Touch % | % | Purity percentage of the gold (e.g. 80.75) |
| Pure Weight | g | Auto-calculated |
| Market Rate | ₹/g | Gold market rate per gram (entered or fetched) |
| Booked Rate | ₹/g | Rate the shop agreed to pay |
| Pure Value | ₹ | Auto-calculated |
| Pending Amount | ₹ | Auto-calculated |

### 3.2 Calculation Formulas

```
Pure Weight  = Gross Weight × (Touch% ÷ 100)
Pure Value   = Pure Weight × Market Rate
Pending Amt  = Pure Value − Cash Given
```

**Example:**
```
Gross Weight = 5g
Touch%       = 80.75%
Pure Weight  = 5 × 0.8075 = 4.0375g

Market Rate  = ₹9,500/g
Pure Value   = 4.0375 × 9500 = ₹38,356.25

Cash Given   = ₹30,000
Pending Amt  = ₹38,356.25 − ₹30,000 = ₹8,356.25
```

- **Positive Pending Amount** → shop still owes the seller this amount
- **Negative Pending Amount** → seller owes the shop (overpaid)
- **Zero** → settled

### 3.3 Rate Types

- **Market Rate** — Live spot price of gold per gram (INR). This can be entered manually or optionally fetched from an API. This is the reference price.
- **Booked Rate** — The agreed rate between shop and seller for this specific transaction. May differ from market rate.

---

## 4. Tech Stack

| Layer | Technology | Reasoning |
|---|---|---|
| Frontend | React 18 (Vite), JSX | Fast DX, no TypeScript complexity for this team size |
| Styling | Tailwind CSS v3 + CSS custom properties | Utility-first with design tokens |
| State | React Context + hooks, React Query (TanStack Query) | No Redux — overkill for 2-3 users |
| Backend | Node.js 20 + Express 5 | Familiar, minimal |
| Auth | Supabase Auth + JWT | Free tier, secure, managed |
| Database | Supabase (PostgreSQL) free tier | RLS, realtime, generous free limits |
| Testing | Vitest + React Testing Library + Supertest | Fast, Vite-native |
| Deployment | Railway free tier | Straightforward, no DevOps overhead |
| CI/CD | GitHub Actions | Free for public + private repos |

---

## 5. User Roles (RBAC)

| Role | Who | Capabilities |
|---|---|---|
| `OWNER` | Shop owner | Full CRUD, user management, delete entries, all audit logs, rate entry |
| `STAFF` | Counter assistant | Create entries, edit own entries (same day only), view all entries, view rates |
| `VIEWER` | Accountant / partner | Read-only: view table, view rate history, no create/edit/delete |

One shop = one `OWNER`. Multi-tenant is out of scope for now; schema supports it for future.

---

## 6. MVP Scope

### In Scope
- [x] JWT-based login / logout
- [x] Purchase entry form with auto-calculated fields
- [x] Purchase table (paginated, sortable by date)
- [x] Rate entry panel (set today's market + booked rate)
- [x] Audit log viewer (who did what, when)
- [x] User management (owner only: invite, assign role)
- [x] Toast notifications for all actions
- [x] Pending amount visual indicator (owe / settled / overpaid)

### Explicitly Out of Scope (v1)
- [ ] Sales tracking
- [ ] Customer management
- [ ] Inventory management
- [ ] PDF receipts / print
- [ ] Multi-shop / multi-branch
- [ ] Mobile app
- [ ] SMS/WhatsApp notifications

---

## 7. Project Conventions

### Naming
- Files: `kebab-case.js`, `PascalCase.jsx` for components
- Functions: `camelCase`
- DB columns: `snake_case`
- Constants: `SCREAMING_SNAKE_CASE`
- CSS classes: Tailwind utilities + `--token-name` custom props

### Git Flow
```
main          ← production (auto-deploys to Railway)
  └─ dev      ← integration branch (PRs merge here first)
       └─ feature/purchase-form
       └─ fix/pending-calc-edge
       └─ chore/update-deps
```

Commit format: `type(scope): message`
Types: `feat`, `fix`, `test`, `chore`, `docs`, `refactor`

### Error Handling
- Backend: every route wrapped in `asyncHandler`, centralized error middleware
- Frontend: React Query handles fetch errors; form errors via react-hook-form; toast on all mutations
- Never swallow errors silently

### Precision
- All monetary calculations use integers internally (paise / paisa)
- Display formats use `Intl.NumberFormat` with `maximumFractionDigits: 2`
- Weight uses 4 decimal places (pure gold precision: 0.0001g matters)
- Never use `parseFloat` for financial math — use integer arithmetic or `decimal.js`

---

## 8. Environment Variables

### Client (prefix: VITE_)
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=
VITE_APP_ENV=development
```

### Server
```env
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
JWT_SECRET=
JWT_EXPIRES_IN=7d
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
```

---

## 9. Free Gold Rate APIs (India)

See `GOLD_APIS.md` for full documentation.

| Service | Free Tier | INR Support | Notes |
|---|---|---|---|
| GoldAPI.io | 100 req/month | Yes (XAU/INR) | Best for reference |
| MetalPriceAPI.com | 100 req/day | Yes | Solid fallback |
| Metals.live | Limited | Indirect | USD→INR conversion |

Since the shop enters rates **manually as primary workflow**, APIs are **supplementary** — they pre-fill the rate field as a suggestion that the user can override.

---

## 10. Development Phases

| Phase | Description | Files |
|---|---|---|
| Phase 0 | Scaffold, env, DB schema | `DATABASE.md`, `ARCHITECTURE.md` |
| Phase 1 | Auth + RBAC | `AUTH.md` |
| Phase 2 | Purchase CRUD (TDD) | `API.md`, `TDD.md` |
| Phase 3 | Rate Entry + Audit Logs | `API.md` |
| Phase 4 | Frontend screens | `SCREENS.md` |
| Phase 5 | Deployment | `DEPLOYMENT.md` |
| Phase 6 | Polish + edge cases | `TDD.md` |
