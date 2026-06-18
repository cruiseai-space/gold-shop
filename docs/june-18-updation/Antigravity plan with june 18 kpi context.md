# Swarna Ledger — June 18 Implementation Plan

Executing the unified 8-phase plan from [PLAN.md](file:///E:/New%20folder/2026/1-goldshop/docs/june-18-updation/PLAN.md). The core app (MVP Phases 0–6) is **100% complete**. This plan transforms it from a one-directional purchase tracker into a **bidirectional trading ledger** with Members, Dashboards, Render deployment, password reset, branded invites, and UI polish.

---

## Execution Strategy

The plan has two parallel tracks:

```
TRACK A (Blocking Sequential)          TRACK B (Non-blocking, Parallel)
────────────────────────────           ─────────────────────────────────
Phase 1: DB Schema & Migration    ←→   Phase 5: Render Deployment Config
Phase 2: Backend Services         ←→   Phase 6: Password Reset Flow
Phase 3: Frontend Members & Form  ←→   Phase 7: Email Invite Templates
Phase 4: Dashboard & Advanced UI  ←→   Phase 8: Loading Spinners & UI
```

I'll execute **Track A phases sequentially** (each depends on prior) while weaving in **Track B phases in parallel** where they have no data dependencies.

---

## Phase 1: Database Schema & Data Migration

> [!CAUTION]
> The migration `003_member_management.sql` is **destructive** — it drops the `seller_name` column. A `supabase db dump` backup must be taken before applying to production.

### [NEW] [003_member_management.sql](file:///E:/New%20folder/2026/1-goldshop/supabase/migrations/003_member_management.sql)

Creates the full schema evolution in a single migration:

1. **`members` table** — `id` (UUID PK), `name` (TEXT NOT NULL), `phone` (TEXT), `notes` (TEXT), timestamps
2. **`purchases` alterations**:
   - Add `transaction_type` column (`BUYING` | `SELLING`, default `BUYING`)
   - Add `member_id` column (FK → `members`)
   - **Data migration**: Extract distinct `seller_name` → insert into `members` → map `purchases.member_id` → enforce NOT NULL → drop `seller_name`
3. **`invite_status` table** — tracks invite lifecycle (`PENDING` → `ACCEPTED` → `EXPIRED`)
4. **Indexes**: `idx_purchases_member`, `idx_purchases_type`, `idx_members_name`, `idx_invite_status_*`
5. **RLS policies**: Members readable by all auth users, manageable by STAFF/OWNER. Invites OWNER-only.
6. **Triggers**: `updated_at` trigger for members

### [NEW] [003_member_management_rollback.sql](file:///E:/New%20folder/2026/1-goldshop/supabase/migrations/003_member_management_rollback.sql)

Rollback script that restores `seller_name` from the `members` join if migration needs reverting.

### [MODIFY] [002_rls_policies.sql](file:///E:/New%20folder/2026/1-goldshop/supabase/migrations/002_rls_policies.sql)

Add new audit log action types to the CHECK constraint: `CREATE_MEMBER`, `UPDATE_MEMBER`.

---

## Phase 2: Backend Services & Calculation Overhaul

### Calculation Logic

#### [MODIFY] [goldCalc.js](file:///E:/New%20folder/2026/1-goldshop/server/src/utils/goldCalc.js) (server)

- Add `transactionType` parameter (`'BUYING'` | `'SELLING'`, default `'BUYING'`)
- For `SELLING`: negate `pendingAmount` (positive = member owes shop, they received gold)
- Return `transactionType` in result object

#### [MODIFY] [goldCalc.js](file:///E:/New%20folder/2026/1-goldshop/client/src/utils/goldCalc.js) (client — mirror)

Same changes as server copy — these must stay in sync.

#### [MODIFY] [goldCalc.test.js](file:///E:/New%20folder/2026/1-goldshop/server/src/tests/goldCalc.test.js)

Add `describe('SELLING transactions')` suite:
- Selling inverts pending sign
- Selling with zero cash
- Selling with overpayment
- Maintains 100% coverage

### Members API (New)

#### [NEW] [members.service.js](file:///E:/New%20folder/2026/1-goldshop/server/src/services/members.service.js)

CRUD: `listMembers()`, `getMemberById(id)`, `createMember(data)`, `updateMember(id, data)`, `getMemberStats(id, filters)`

#### [NEW] [members.controller.js](file:///E:/New%20folder/2026/1-goldshop/server/src/controllers/members.controller.js)

Request handlers for all member operations.

#### [NEW] [members.routes.js](file:///E:/New%20folder/2026/1-goldshop/server/src/routes/members.routes.js)

- `GET /api/members` — list all (auth required)
- `POST /api/members` — create (STAFF/OWNER)
- `PATCH /api/members/:id` — update (STAFF/OWNER)
- `GET /api/members/:id/stats` — member-specific P&L (auth required)

#### [MODIFY] [index.js](file:///E:/New%20folder/2026/1-goldshop/server/src/routes/index.js)

Mount `membersRoutes` and `dashboardRoutes`.

### Purchases API Update

#### [MODIFY] [purchases.service.js](file:///E:/New%20folder/2026/1-goldshop/server/src/services/purchases.service.js)

- `createPurchase`: Accept `memberId` + `transactionType` instead of `sellerName`. Pass `transactionType` to `computeGoldPurchase`.
- `updatePurchase`: Same field changes + pass `transactionType`.
- `listPurchases`: Replace `seller` filter with `memberId` filter. Join `members` table to return `member: { id, name }`.
- Drop `idx_purchases_seller` usage (column no longer exists).

### Dashboard API (New)

#### [NEW] [dashboard.service.js](file:///E:/New%20folder/2026/1-goldshop/server/src/services/dashboard.service.js)

Aggregation queries:
- `getOverallStats({ dateFrom, dateTo })` → Total P&L, Gold In (sum pure_weight where BUYING), Gold Out (sum where SELLING), Net Gold Position, transaction count
- `getMemberStats(memberId, { dateFrom, dateTo })` → per-member version

#### [NEW] [dashboard.controller.js](file:///E:/New%20folder/2026/1-goldshop/server/src/controllers/dashboard.controller.js)
#### [NEW] [dashboard.routes.js](file:///E:/New%20folder/2026/1-goldshop/server/src/routes/dashboard.routes.js)

- `GET /api/dashboard/stats` — overall stats with optional date filters
- `GET /api/dashboard/members/:id/stats` — member-specific stats

### New Tests

#### [NEW] [members.service.test.js](file:///E:/New%20folder/2026/1-goldshop/server/src/tests/members.service.test.js)
#### [MODIFY] [purchases.service.test.js](file:///E:/New%20folder/2026/1-goldshop/server/src/tests/purchases.service.test.js)

Update to use `memberId`/`transactionType`, remove `sellerName` references.

---

## Phase 3: Frontend Member Management & Form Updates

### Members Feature (New)

#### [NEW] [members.js](file:///E:/New%20folder/2026/1-goldshop/client/src/api/members.js)

Axios API layer for members endpoints.

#### [NEW] [useMembers.js](file:///E:/New%20folder/2026/1-goldshop/client/src/features/members/useMembers.js)

TanStack Query hooks: `useMembers()`, `useCreateMember()`, `useUpdateMember()`

#### [NEW] [MembersPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/members/MembersPage.jsx)

List view with columns: Name, Phone, Notes, Transaction Count, Actions. Add/edit via drawer.

#### [NEW] [MemberFormDrawer.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/members/MemberFormDrawer.jsx)

Slide-in form for add/edit (Name*, Phone, Notes). Same drawer pattern as `PurchaseFormDrawer`.

### Purchase Form Overhaul

#### [MODIFY] [PurchaseFormDrawer.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/purchases/PurchaseFormDrawer.jsx)

Major changes:
- **Replace** free-text "Seller Name" input → **Combobox** bound to `useMembers` query (searchable dropdown with inline "create new member" option)
- **Add** Transaction Type segmented control: `[BUYING | SELLING]`, default BUYING
- **Update** live calculation preview to pass `transactionType` to `computeGoldPurchase`
- **Color-code** pending amount differently for SELLING (invert success/danger semantics)
- **Update** form schema: `sellerName` → `memberId` (UUID), add `transactionType` field
- **Update** submission payload

#### [MODIFY] [PurchasesPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/purchases/PurchasesPage.jsx)

- Add "Type" column with badges: `BUYING` (green + ↓ icon), `SELLING` (amber + ↑ icon)
- Replace "Seller" column → "Member" (displays joined `member.name`)
- Update filter: replace seller text search with member dropdown filter
- Update pending amount color logic for SELLING transactions

#### [MODIFY] [purchases.js](file:///E:/New%20folder/2026/1-goldshop/client/src/api/purchases.js)

Update API call payloads: `sellerName` → `memberId`, add `transactionType`.

#### [MODIFY] [usePurchases.js](file:///E:/New%20folder/2026/1-goldshop/client/src/features/purchases/usePurchases.js)

Update query params, mutation payloads.

---

## Phase 4: Dashboard & Advanced UI

### Dashboard (New Root Route)

#### [NEW] [dashboard.js](file:///E:/New%20folder/2026/1-goldshop/client/src/api/dashboard.js)

Axios layer for dashboard stats endpoints.

#### [NEW] [useDashboard.js](file:///E:/New%20folder/2026/1-goldshop/client/src/features/dashboard/useDashboard.js)

`useDashboardStats(dateFilters)`, `useMemberStats(memberId, dateFilters)`

#### [NEW] [DashboardPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/dashboard/DashboardPage.jsx)

New root route (`/`):
- 4 summary cards: Total P&L, Gold In, Gold Out, Net Gold Position
- Date range filter (cascades to cards + transaction list)
- Recent transactions table (last 10, all types)

### Advanced Table Features

#### [MODIFY] [PurchasesPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/purchases/PurchasesPage.jsx)

- **Column picker** — dropdown with checkboxes, persisted to `localStorage`
- Default visible: Date, Member, Type, Gross Wt, Pure Wt, Market Rate, Cash Given, Pending, Actions
- Optional: Touch%, Booked Rate, Cash Source, Notes, Recorded By

### Member Detail View

#### [NEW] [MemberDetailPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/members/MemberDetailPage.jsx)

Route: `/members/:id`
- Header: Member name, phone, notes (inline editable)
- Stats cards: P&L, Gold In, Gold Out, Transaction Count
- Filtered transaction table (only this member's entries)

### Navigation & Routing Updates

#### [MODIFY] [App.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/App.jsx)

- `/` → `DashboardPage` (was `PurchasesPage`)
- `/transactions` → `PurchasesPage` (renamed from `/`)
- `/members` → `MembersPage` (new)
- `/members/:id` → `MemberDetailPage` (new)
- `/forgot-password` → `ForgotPasswordPage` (Phase 6)
- `/reset-password` → `ResetPasswordPage` (Phase 6)

#### [MODIFY] [Sidebar.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/components/layout/Sidebar.jsx)

Update nav items:
```
🏠 Home          → /           (NEW)
📋 Transactions  → /transactions (renamed from Purchases)
👥 Members       → /members    (NEW)
📈 Rates         → /rates
📜 Audit Logs    → /logs
⚙ Settings       → /settings   (OWNER only)
```

---

## Phase 5: Render Deployment Migration (Parallel with Phase 1)

#### [NEW] [render.yaml](file:///E:/New%20folder/2026/1-goldshop/render.yaml)

Infrastructure-as-code blueprint for Render.com:
- `swarna-client`: Static site (Vite build)
- `swarna-server`: Node.js web service with health check at `/health`

#### [MODIFY] [deploy.yml](file:///E:/New%20folder/2026/1-goldshop/.github/workflows/deploy.yml)

Replace Railway CLI deploy with Render deploy hooks (curl POST to webhook URLs).

#### [DELETE] [railway.json](file:///E:/New%20folder/2026/1-goldshop/client/railway.json) (client)
#### [DELETE] [railway.json](file:///E:/New%20folder/2026/1-goldshop/server/railway.json) (server)

> [!IMPORTANT]
> **Zero-downtime migration**: Deploy to Render first → verify `/health` → update DNS → pause Railway (don't delete for 7 days) → delete after stable.

---

## Phase 6: Password Reset Flow (Parallel with Phase 2)

### Backend

#### [MODIFY] [auth.routes.js](file:///E:/New%20folder/2026/1-goldshop/server/src/routes/auth.routes.js)

Add: `POST /api/auth/forgot-password` (public), `POST /api/auth/reset-password` (public)

#### [MODIFY] [auth.controller.js](file:///E:/New%20folder/2026/1-goldshop/server/src/controllers/auth.controller.js)

- `forgotPassword`: Calls `supabase.auth.resetPasswordForEmail()`. Always returns success (prevents email enumeration).
- `resetPassword`: Validates access token via `supabase.auth.verifyOtp()`, updates password via `supabase.auth.admin.updateUserById()`.

#### [MODIFY] [index.js](file:///E:/New%20folder/2026/1-goldshop/server/src/index.js)

Add `express-rate-limit` middleware on password reset routes (3 req/hour/IP).

### Frontend

#### [NEW] [ForgotPasswordPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/auth/ForgotPasswordPage.jsx)

Email input form → "Check your email" confirmation state. No error feedback on non-existent email (security).

#### [NEW] [ResetPasswordPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/auth/ResetPasswordPage.jsx)

Parses `#access_token` from URL → validates → new password + confirm form → POST to API → redirect to `/login`.

#### [MODIFY] [LoginPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/auth/LoginPage.jsx)

Add "Forgot password?" link pointing to `/forgot-password`.

---

## Phase 7: Email Invite Templates & Rate Limiting (Parallel with Phase 3)

### Backend

#### [NEW] [invite.service.js](file:///E:/New%20folder/2026/1-goldshop/server/src/services/invite.service.js)

- `canSendInvite(userId)`: Check `invite_status` — max 3 invites/hour/user
- `createInvite(data, userId)`: Insert to `invite_status`, call `supabase.auth.admin.inviteUserByEmail()`
- `listInvites()`: Query all invite statuses for Settings page

#### [MODIFY] [users.controller.js](file:///E:/New%20folder/2026/1-goldshop/server/src/controllers/users.controller.js)

Update invite endpoint to use `invite.service.js`, record to `invite_status`, enforce rate limit.

### Frontend

#### [MODIFY] [SettingsPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/settings/SettingsPage.jsx)

Users tab shows invite status column: `PENDING` (⏳ amber), `ACCEPTED` (✓ green), `EXPIRED` (✕ red).

#### [MODIFY] [InviteUserModal.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/settings/InviteUserModal.jsx)

Handle 429 rate limit response with user-friendly toast.

### Supabase Config (Manual)

Configure branded HTML email templates in Supabase Dashboard → Authentication → Email Templates. The template follows the "Modern Paati Kadai" aesthetic (warm cream, burnt copper, Lora/Plus Jakarta Sans fonts).

---

## Phase 8: Loading Spinners & UI States (Parallel with Phase 4)

#### [NEW] [Spinner.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/components/ui/Spinner.jsx)

SVG-based spinner component:
- Variants: `primary` (burnt copper), `gold`, `muted`
- Sizes: `xs` (12px), `sm` (16px), `md` (24px), `lg` (40px), `xl` (64px)
- Modes: inline (buttons), fullPage (route transitions)

#### [NEW] [FullPageSpinner.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/components/ui/FullPageSpinner.jsx)

Full-screen overlay spinner with message text, used in Suspense boundaries.

#### [MODIFY] [Skeleton.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/components/ui/Skeleton.jsx)

Expand with `TableSkeleton` and `CardSkeleton` variants. Shimmer animation using oklch gradient sweep.

#### [MODIFY] [App.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/App.jsx)

Wrap routes in `<Suspense fallback={<FullPageSpinner />}>` for lazy-loaded route transitions.

#### Multiple Component Updates

Add `isLoading` / `loadingText` props to all action buttons across:
- [LoginPage.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/auth/LoginPage.jsx) — "Signing in…"
- [PurchaseFormDrawer.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/purchases/PurchaseFormDrawer.jsx) — "Saving…"
- [InviteUserModal.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/settings/InviteUserModal.jsx) — "Sending…"
- [RatesPanel.jsx](file:///E:/New%20folder/2026/1-goldshop/client/src/features/rates/RatesPanel.jsx) — "Setting rate…"

---

## Open Questions

> [!IMPORTANT]
> **1. Should I execute all 8 phases, or do you want to prioritize a subset?**
> The full plan is ~4 weeks of work. You may want to start with just Phases 1–4 (core bidirectional ledger) or Phases 5–8 (infra/polish), or everything.

> [!IMPORTANT]
> **2. Render migration timing — should Phase 5 happen first (before any code changes)?**
> Since it's infrastructure-only with zero code changes, it could be done immediately as a standalone step before touching the codebase.

> [!IMPORTANT]
> **3. Should the `railway.json` files be deleted or kept until Render is confirmed stable?**
> The plan says keep Railway paused for 7 days. We could defer deleting `railway.json` files until then.

> [!IMPORTANT]
> **4. `express-rate-limit` is a new dependency — confirm it should be added to `server/package.json`?**
> Needed for password reset (Phase 6) and could also be used for login rate limiting.

> [!IMPORTANT]
> **5. Database backup strategy — do you want me to generate the `supabase db dump` command sequence, or will you handle the backup manually before I apply the migration?**
> The `003_member_management.sql` migration is irreversible without the rollback script.

---

## Verification Plan

### Automated Tests

```bash
# Server tests (goldCalc, services, middleware, routes)
cd server && npx vitest run --coverage

# Client tests (components, hooks, utils)
cd client && npx vitest run --coverage
```

### Coverage Targets

| Area | Target |
|------|--------|
| `utils/goldCalc.js` | 100% (including SELLING tests) |
| `services/*.service.js` | ≥ 90% |
| `middleware/*.middleware.js` | ≥ 90% |
| `routes/` (integration) | ≥ 80% |
| React components/hooks | ≥ 70% |

### Key Test Scenarios

1. **Data migration**: Verify `seller_name` → `members` produces zero data loss (count validation)
2. **Bidirectional math**: SELLING transactions produce correctly inverted pending signs
3. **Dashboard aggregates**: Manual sum of table rows matches API aggregate values
4. **Password reset**: Full flow from forgot → email → reset → login
5. **Invite rate limit**: 4th invite in 1 hour returns 429
6. **Spinner visibility**: Every async mutation shows loading state
7. **Render health check**: `/health` returns 200

### Manual Verification

- Verify Render deployment works end-to-end
- Test login → create member → create BUYING transaction → create SELLING transaction → check dashboard
- Verify pending amount sign is correct for both directions
- Test password reset email flow
- Confirm branded invite email renders correctly
