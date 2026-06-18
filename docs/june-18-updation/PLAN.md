# Swarna Ledger — Unified Implementation Plan
*Version 2.0 — June 19, 2026*

This document merges the original June 8, 2026 bidirectional ledger plan with new requirements agreed upon on June 19: Render deployment migration, password reset flow, branded email invite templates, and design-system-compliant loading spinners.

---

## Table of Contents

1. [Context & Key Files](#1-context--key-files)
2. [Execution Roadmap](#2-execution-roadmap)
3. [Phase 1: Database Schema & Data Migration](#3-phase-1-database-schema--data-migration)
4. [Phase 2: Backend Services & Calculation Overhaul](#4-phase-2-backend-services--calculation-overhaul)
5. [Phase 3: Frontend Member Management & Form Updates](#5-phase-3-frontend-member-management--form-updates)
6. [Phase 4: Dashboards & Advanced UI](#6-phase-4-dashboards--advanced-ui)
7. [Phase 5: Render Deployment Migration](#7-phase-5-render-deployment-migration)
8. [Phase 6: Password Reset Flow](#8-phase-6-password-reset-flow)
9. [Phase 7: Email Invite Templates & Rate Limiting](#9-phase-7-email-invite-templates--rate-limiting)
10. [Phase 8: Loading Spinners & UI States](#10-phase-8-loading-spinners--ui-states)
11. [Verification & Testing Strategy](#11-verification--testing-strategy)
12. [Migration & Rollback Strategy](#12-migration--rollback-strategy)

---

## 1. Context & Key Files

- `supabase/migrations/`: Requires new migrations for members table, transaction_type, password reset tracking, and invite status.
- `client/src/utils/goldCalc.js` & `server/src/utils/goldCalc.js`: Calculation logic must adapt to Buying vs. Selling mechanics.
- `client/src/features/purchases/PurchaseFormDrawer.jsx`: Needs UI overhaul for Member selection and Transaction Type.
- `server/src/services/purchases.service.js`: Needs to support new foreign keys and transaction logic.
- **New Feature Directories:** `features/members/`, `features/dashboard/`, `features/auth/ForgotPasswordPage.jsx`, `features/auth/ResetPasswordPage.jsx`.
- **New Infrastructure:** `render.yaml`, updated `.github/workflows/deploy.yml`.

---

## 2. Execution Roadmap

```
Week 1 ─┬─ Phase 1: DB Schema & Migration (members, transaction_type)
        ├─ Phase 5 (parallel): Render deployment config (zero-downtime switch)
        │
Week 2 ─┬─ Phase 2: Backend services (members API, calc overhaul, dashboard API)
        ├─ Phase 6 (parallel): Password reset flow (backend + frontend)
        │
Week 3 ─┬─ Phase 3: Frontend members, Purchase drawer overhaul
        ├─ Phase 7 (parallel): Email invite templates + rate limiting
        │
Week 4 ─┬─ Phase 4: Dashboard, column picker, member detail view
        └─ Phase 8 (parallel): Loading spinners, UI state polish
```

Phases 1–4 are **blocking-sequential** (each depends on the previous). Phases 5–8 are **non-blocking** and can run in parallel with Phases 1–4 as indicated above.

---

## 3. Phase 1: Database Schema & Data Migration (Backend)

**Goal:** Establish the new data model without breaking existing functionality.

### 3.1 Create Migration (`003_member_management.sql`)

```sql
-- 1. Create members table
CREATE TABLE public.members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  phone       TEXT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Add transaction_type to purchases
ALTER TABLE public.purchases
  ADD COLUMN transaction_type TEXT NOT NULL DEFAULT 'BUYING'
    CHECK (transaction_type IN ('BUYING', 'SELLING'));

-- 3. Add member_id (nullable initially for migration)
ALTER TABLE public.purchases
  ADD COLUMN member_id UUID REFERENCES public.members(id);

-- 4. Data migration: unique seller_names → members
INSERT INTO public.members (name)
  SELECT DISTINCT seller_name FROM public.purchases;

-- 5. Map purchases to new member records
UPDATE public.purchases p
  SET member_id = m.id
  FROM public.members m
  WHERE p.seller_name = m.name;

-- 6. Enforce NOT NULL after migration
ALTER TABLE public.purchases ALTER COLUMN member_id SET NOT NULL;

-- 7. Drop old seller_name column
ALTER TABLE public.purchases DROP COLUMN seller_name;

-- 8. Indexes
CREATE INDEX idx_purchases_member ON public.purchases(member_id);
CREATE INDEX idx_purchases_type ON public.purchases(transaction_type);
CREATE INDEX idx_members_name ON public.members(name);

-- 9. RLS policies for members
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members: auth read"
  ON public.members FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "members: staff/owner manage"
  ON public.members FOR ALL
  USING (public.current_user_role() IN ('OWNER', 'STAFF'));

-- 10. Triggers
CREATE TRIGGER trg_members_updated_at
  BEFORE UPDATE ON public.members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
```

### 3.2 Add Invite Tracking Table

```sql
-- Track invite status for in-app visibility and rate limiting
CREATE TABLE public.invite_status (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('STAFF', 'VIEWER')),
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED')),
  invited_by    UUID NOT NULL REFERENCES public.profiles(id),
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,
  supabase_msg_id TEXT,  -- reference to Supabase email send
  UNIQUE(email)
);

CREATE INDEX idx_invite_status_invited_by ON public.invite_status(invited_by);
CREATE INDEX idx_invite_status_email ON public.invite_status(email);

ALTER TABLE public.invite_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invite_status: owner read"
  ON public.invite_status FOR SELECT
  USING (public.current_user_role() = 'OWNER');

CREATE POLICY "invite_status: owner manage"
  ON public.invite_status FOR ALL
  USING (public.current_user_role() = 'OWNER');
```

---

## 4. Phase 2: Backend Services & Calculation Overhaul

**Goal:** Update business logic to handle members and bidirectional trades.

### 4.1 Calculation Logic (`goldCalc.js`)

```js
// Updated signature
export function computeGoldPurchase({
  grossWeight,
  touchPercent,
  marketRate,
  cashGiven = 0,
  transactionType = 'BUYING'  // 'BUYING' | 'SELLING'
}) {
  // ... validation stays same ...

  const pureWeight    = gw.times(tp.div(100));
  const pureValue     = pureWeight.times(mr);
  const basePending   = pureValue.minus(cg);

  // SELLING inverts the pending direction:
  // BUYING:  positive pending = shop owes seller
  // SELLING: positive pending = member owes shop (we gave them gold, they owe cash)
  const pendingAmount = transactionType === 'SELLING'
    ? basePending.negated()
    : basePending;

  return {
    grossWeight: gw, touchPercent: tp, pureWeight,
    marketRate: mr, cashGiven: cg, pureValue,
    pendingAmount, transactionType,
  };
}
```

Update `goldCalc.test.js` — add test suites for `transactionType: 'SELLING'` ensuring sign inversion is correct. Maintain 100% coverage.

### 4.2 Members API

Create:
- `members.service.js` — CRUD for members (`listMembers`, `createMember`, `updateMember`, `getMemberById`, `getMemberStats`)
- `members.controller.js` — Request handlers
- `members.routes.js` — `GET /api/members`, `POST /api/members`, `PATCH /api/members/:id`, `GET /api/members/:id/stats`
- Mount in `routes/index.js`

### 4.3 Purchases API Update

- Update `purchases.service.js` to accept `memberId` (UUID) and `transactionType` instead of `sellerName`.
- Update `listPurchases` to join the `members` table so frontend receives `member: { id, name }`.
- Update all tests.

### 4.4 Dashboard API

Create `dashboard.service.js` with aggregation queries:

```js
// GET /api/dashboard/stats?dateFrom=&dateTo=
async function getOverallStats({ dateFrom, dateTo }) {
  // Returns:
  // {
  //   totalPL: Decimal,           // sum of all pending_amount (shop perspective)
  //   totalGoldIn: Decimal,       // sum of pure_weight where transaction_type = 'BUYING'
  //   totalGoldOut: Decimal,      // sum of pure_weight where transaction_type = 'SELLING'
  //   transactionCount: number,
  //   netGoldPosition: Decimal    // Gold In - Gold Out
  // }
}

// GET /api/dashboard/members/:id/stats?dateFrom=&dateTo=
async function getMemberStats(memberId, { dateFrom, dateTo }) {
  // Returns member-specific P&L, total gold in/out, transaction count
}
```

---

## 5. Phase 3: Frontend Member Management & Form Updates

**Goal:** Expose the new data model to the user interface.

### 5.1 Members Feature (`client/src/features/members/`)

Create:
- `useMembers.js` — TanStack Query hooks (`useMembers`, `useCreateMember`, `useUpdateMember`)
- `MembersPage.jsx` — List view with add/edit. Columns: Name, Phone, Notes, Transaction Count, Actions
- `MemberFormDrawer.jsx` — Slide-in form for add/edit (Name*, Phone, Notes)
- `MemberDetailPage.jsx` — Member profile + P&L stats + filtered transaction list (see Phase 4)

### 5.2 Purchase Form Drawer Update (`PurchaseFormDrawer.jsx`)

- Replace free-text "Seller Name" input with a **Combobox** bound to `useMembers` query (searchable dropdown that allows creating a new member inline if not found).
- Add **Transaction Type Toggle**: `[BUYING | SELLING]` — segmented control, default BUYING.
- Update live calculation preview to reflect transaction type (color-code pending amount differently for selling).
- Update form submission payload to send `memberId` and `transactionType`.

### 5.3 Transaction Table Update (`PurchasesPage.jsx`)

- Add "Type" column with badges: `BUYING` → `--color-success-subtle` with download icon, `SELLING` → `--color-warning-subtle` with upload icon.
- "Member" column replaces "Seller" — displays joined `member.name`.
- Update pending amount color logic: for SELLING transactions, invert the color semantics (positive = warning/danger, negative = success).

---

## 6. Phase 4: Dashboards & Advanced UI

**Goal:** Deliver the new high-level overviews and table customization.

### 6.1 Home Screen (`client/src/features/dashboard/DashboardPage.jsx`)

- Make this the new root route (`/`). Move the Purchases table to `/transactions`.
- **Summary Cards** (top row, 4-column grid):
  - **Total P&L** — Net position (sum of all pending). Color: positive = `--color-success`, negative = `--color-danger`.
  - **Gold In** — Total pure weight bought. Color: `--color-gold`.
  - **Gold Out** — Total pure weight sold. Color: `--color-primary`.
  - **Net Gold Position** — Gold In - Gold Out.
- **Date Range Filter** — cascades to summary cards AND transaction list below.
- **Recent Transactions** — paginated table showing last 10 transactions (any type).

### 6.2 Advanced Table Features (`PurchasesPage.jsx`)

- **Column Picker** — dropdown menu with checkboxes to show/hide columns. Persist preference to `localStorage`.
- Default visible: Date, Member, Type, Gross Wt, Pure Wt, Market Rate, Cash Given, Pending, Actions.
- Optional: Touch%, Booked Rate, Cash Source, Notes, Recorded By.

### 6.3 Member Detail View (`MemberDetailPage.jsx`)

Route: `/members/:id`

- Header: Member name + phone + notes (editable inline).
- Stats cards: Member P&L, Gold In, Gold Out, Transaction Count.
- Filtered transaction table: only this member's entries.
- Back button to Members list.

### 6.4 Navigation Update

Update `Sidebar.jsx` and `App.jsx` router:

```
[◆ Swarna Ledger]
──────────────────
[🏠 Home]                  ← NEW: Dashboard (root /)
[📋 Transactions]          ← WAS: Purchases (now /transactions)
[👥 Members]               ← NEW
[📈 Rates]
[📜 Audit Logs]
[⚙ Settings]               OWNER only
──────────────────
[User Name]
[Role Badge]
[Logout]
```

---

## 7. Phase 5: Render Deployment Migration

**Goal:** Replace Railway with Render as the deployment target. Render offers a more generous free tier and better-suited infrastructure for the project's current scale.

### 7.1 Why Render over Railway

| Factor | Railway | Render |
|---|---|---|
| Free tier uptime | 500 hrs/month (sleeps) | 750 hrs/month (sleeps after 15min) |
| Custom domains | Paid | Free |
| PR previews | Paid | Free |
| Blueprint spec | `railway.json` | `render.yaml` (native) |
| Database | Requires separate service | Managed PostgreSQL (free tier) |

### 7.2 `render.yaml` Blueprint

```yaml
# render.yaml — Infrastructure as Code for Render.com
services:
  # Frontend (Vite static site)
  - type: web
    name: swarna-client
    runtime: static
    buildCommand: cd client && npm ci && npm run build
    staticPublishPath: client/dist
    envVars:
      - key: VITE_API_BASE_URL
        value: https://swarna-server.onrender.com/api
      - key: VITE_SUPABASE_URL
        sync: false  # set in Render dashboard
      - key: VITE_SUPABASE_ANON_KEY
        sync: false
      - key: VITE_APP_ENV
        value: production

  # Backend (Node.js Express)
  - type: web
    name: swarna-server
    runtime: node
    buildCommand: cd server && npm ci
    startCommand: cd server && npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000  # Render sets this; we override
      - key: JWT_SECRET
        generateValue: true
      - key: JWT_EXPIRES_IN
        value: 7d
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: CORS_ORIGIN
        value: https://swarna-client.onrender.com
    healthCheckPath: /health

  # Managed PostgreSQL (optional — can keep Supabase for now)
  # - type: pserv
  #   name: swarna-db
  #   plan: free
```

### 7.3 Updated GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Render
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      # Trigger Render deploy via webhook (auto-deploy on push)
      # Alternative: use Render API for more control
      - name: Deploy Client
        env:
          RENDER_DEPLOY_HOOK_CLIENT: ${{ secrets.RENDER_DEPLOY_HOOK_CLIENT }}
        run: |
          curl -X POST "$RENDER_DEPLOY_HOOK_CLIENT"

      - name: Deploy Server
        env:
          RENDER_DEPLOY_HOOK_SERVER: ${{ secrets.RENDER_DEPLOY_HOOK_SERVER }}
        run: |
          curl -X POST "$RENDER_DEPLOY_HOOK_SERVER"
```

### 7.4 Environment Variables

**Render Dashboard → Service → Environment:**

| Variable | swarna-server | swarna-client |
|---|---|---|
| `NODE_ENV` | `production` | — |
| `JWT_SECRET` | Auto-generated | — |
| `JWT_EXPIRES_IN` | `7d` | — |
| `SUPABASE_URL` | (paste) | (paste via `VITE_`) |
| `SUPABASE_SERVICE_ROLE_KEY` | (paste) | — |
| `SUPABASE_ANON_KEY` | — | (paste via `VITE_`) |
| `VITE_API_BASE_URL` | — | `https://swarna-server.onrender.com/api` |
| `VITE_APP_ENV` | — | `production` |
| `CORS_ORIGIN` | `https://swarna-client.onrender.com` | — |

### 7.5 Migration Steps (Zero-Downtime)

1. Create Render account + new Blueprint instance from `render.yaml`.
2. Set all environment variables in Render dashboard.
3. Verify `/health` endpoint returns 200.
4. Update DNS/custom domain if applicable.
5. Pause Railway services (do NOT delete for 1 week — rollback safety).
6. Update GitHub Secrets with Render deploy hooks.
7. After 1 week of stable operation, delete Railway project.

---

## 8. Phase 6: Password Reset Flow

**Goal:** Self-service password reset so owners don't need to use Supabase dashboard.

### 8.1 Flow

```
1. User clicks "Forgot password?" on /login
2. Enters email → POST /api/auth/forgot-password
3. Server calls supabase.auth.resetPasswordForEmail(email, { redirectTo: 'https://app.com/reset-password' })
4. Supabase sends branded email with magic link
5. User clicks link → lands on /reset-password#access_token=...
6. Frontend extracts token from URL hash, calls supabase.auth.verifyOtp()
7. User enters new password + confirm
8. POST /api/auth/reset-password with new password
9. Server updates password via supabase.auth.admin.updateUserById()
10. Redirect to /login with success toast
```

### 8.2 API Endpoints

```js
// POST /api/auth/forgot-password 🔓
// Request: { email: string }
// Response: { success: true, message: "If the email exists, a reset link has been sent." }
// Note: Always return success to prevent email enumeration attacks

// POST /api/auth/reset-password 🔓
// Request: { accessToken: string, newPassword: string }
// Validation: newPassword min 8 chars, must != old password
// Response: { success: true } → redirect to login
```

### 8.3 Frontend Pages

- **`/forgot-password`** — Email input form. Submit → shows "Check your email" confirmation state. No error if email doesn't exist (security).
- **`/reset-password`** — Parses `#access_token` from URL. Validates token (calls Supabase). Shows new password form (password + confirm). Submit → POST to API → redirect to `/login` on success.

### 8.4 Rate Limiting

```js
// server/index.js — rate limiting on password reset
import rateLimit from 'express-rate-limit';

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 3,  // 3 attempts per hour per IP
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts. Try again later.' } }
});

app.use('/api/auth/forgot-password', passwordResetLimiter);
app.use('/api/auth/reset-password', passwordResetLimiter);
```

### 8.5 Security Notes

- Magic link expiry: 1 hour (Supabase default).
- Token is single-use.
- Never log reset tokens.
- New password must be different from old (check via Supabase).

---

## 9. Phase 7: Email Invite Templates & Rate Limiting

**Goal:** Branded, professional invite emails with in-app status tracking and rate-limit guards.

### 9.1 Branded HTML Email Template

Follows the "Modern Paati Kadai Ledger" aesthetic — warm cream background, burnt copper accents, serif headings.

```html
<!-- Email template: invite-user.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600&family=Plus+Jakarta+Sans:wght@400;600&display=swap');
  </style>
</head>
<body style="margin:0; padding:0; background:#faf7f2;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#faf7f2;">
    <tr><td align="center" style="padding:40px 20px;">

      <!-- Card -->
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fffef9; border-radius:12px; border:1px solid #e8e0d4;">
        <tr><td style="padding:40px;">

          <!-- Header -->
          <table width="100%">
            <tr>
              <td style="border-left:4px solid #c4713b; padding-left:16px;">
                <h1 style="font-family:'Lora',Georgia,serif; font-size:22px; color:#2a2018; margin:0;">
                  Swarna Ledger
                </h1>
                <p style="font-family:'Plus Jakarta Sans',sans-serif; font-size:13px; color:#8a7b6b; margin:4px 0 0 0;">
                  Digital Account Book for Gold Trading
                </p>
              </td>
            </tr>
          </table>

          <div style="height:32px;"></div>

          <!-- Body -->
          <p style="font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; color:#3d3328; line-height:1.6; margin:0 0 16px 0;">
            You've been invited to join <strong style="color:#c4713b;">{{shopName}}</strong> as a
            <strong style="color:#c4713b;">{{role}}</strong>.
          </p>
          <p style="font-family:'Plus Jakarta Sans',sans-serif; font-size:14px; color:#6b5f51; line-height:1.5; margin:0 0 32px 0;">
            Click the button below to set your password and access the ledger. This link expires in 24 hours.
          </p>

          <!-- CTA Button -->
          <table width="100%">
            <tr><td align="center">
              <a href="{{inviteUrl}}" style="display:inline-block; background:#c4713b; color:#fffef9; font-family:'Plus Jakarta Sans',sans-serif; font-size:15px; font-weight:600; text-decoration:none; padding:14px 32px; border-radius:8px;">
                Accept Invitation
              </a>
            </td></tr>
          </table>

          <div style="height:32px;"></div>

          <!-- Footer -->
          <p style="font-family:'Plus Jakarta Sans',sans-serif; font-size:12px; color:#9a8e7e; text-align:center; margin:0;">
            If you didn't expect this invitation, you can safely ignore this email.<br>
            Sent by Swarna Ledger &middot; Tamil Nadu, India
          </p>

        </td></tr>
      </table>

    </td></tr>
  </table>
</body>
</html>
```

### 9.2 Supabase Auth Email Customization

Configure in Supabase Dashboard → Authentication → Email Templates:

```
Confirmation email → Replace with branded template above
Invite user email → Replace with branded template (use `{{ .ConfirmationURL }}` for magic link)
```

**Supabase free tier rate limits on auth emails:**
- ~3-6 emails per hour (soft limit, may be adjusted)
- After limit: emails are queued, not dropped

### 9.3 In-App Invite Status Tracking

Update `SettingsPage.jsx` — Users tab now shows invite status:

```
Table columns:
  Name | Email | Role | Status | Invited | Actions

Status badges:
  PENDING   → warning-subtle, clock icon
  ACCEPTED  → success-subtle, check icon
  EXPIRED   → danger-subtle, x icon
```

### 9.4 Rate-Limit Guard

```js
// server/src/services/invite.service.js
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;  // 1 hour
const MAX_INVITES_PER_WINDOW = 3;  // conservative for Supabase free tier

async function canSendInvite(invitedByUserId) {
  // Count invites sent by this user in the last hour
  const { count } = await supabase
    .from('invite_status')
    .select('*', { count: 'exact' })
    .eq('invited_by', invitedByUserId)
    .gte('invited_at', new Date(Date.now() - RATE_LIMIT_WINDOW_MS).toISOString());

  return count < MAX_INVITES_PER_WINDOW;
}

// In invite controller:
if (!await canSendInvite(req.user.id)) {
  throw new ApiError(429, 'RATE_LIMITED',
    `Maximum ${MAX_INVITES_PER_WINDOW} invites per hour. Please try again later.`);
}
```

### 9.5 Invite Flow Update

```
1. Owner fills InviteUserModal (name, email, role)
2. POST /api/users/invite
3. Server checks rate limit (max 3/hour)
4. Server calls supabase.auth.admin.inviteUserByEmail()
   → Supabase sends branded email
5. Server inserts into invite_status (status: PENDING)
6. Frontend invalidates users query → table updates
7. User clicks email link → sets password → status flips to ACCEPTED
   (via trigger on auth.users insert or webhook)
8. Unaccepted invites expire after 24h → status flips to EXPIRED
   (via cron or Supabase edge function)
```

---

## 10. Phase 8: Loading Spinners & UI States

**Goal:** Comprehensive, design-system-compliant loading states across the entire application.

### 10.1 Spinner Component (`client/src/components/ui/Spinner.jsx`)

```jsx
// Three variants: inline (buttons), page (full-screen overlay), skeleton (content)

// Inline spinner — used inside buttons, small UI elements
<Spinner size="sm" variant="primary" />

// Page spinner — used for route transitions, initial data loads
<Spinner size="lg" variant="gold" fullPage />

// Skeleton — used for table loading, card loading
<Skeleton rows={5} columns={8} />
```

**Design specs:**
- SVG-based, no external libraries
- Colors: `primary` (burnt copper `#c4713b`), `gold` (gold accent), `muted` (for secondary actions)
- Animation: CSS `@keyframes spin` with `--ease-in-out` easing
- Size scale: `xs` (12px), `sm` (16px), `md` (24px), `lg` (40px), `xl` (64px)
- Track ring: `oklch(85% 0.02 68 / 0.3)` — subtle border
- Spinning arc: `--color-primary` — 90deg arc, spinning 360deg continuously

### 10.2 Spinner Placement Map

| Location | Spinner Type | Trigger | Duration |
|---|---|---|---|
| **Login button** | Inline `sm` + "Signing in…" | Form submit | Until JWT received |
| **Add/Save Entry button** | Inline `sm` + "Saving…" | Form submit | Until mutation success |
| **Send Invite button** | Inline `sm" + "Sending…" | Modal submit | Until API response |
| **Reset Password button** | Inline `sm` + "Resetting…" | Form submit | Until confirmation |
| **Purchase table** | Skeleton 5 rows | `usePurchases` `isLoading` | Until data fetched |
| **Members table** | Skeleton 5 rows | `useMembers` `isLoading` | Until data fetched |
| **Dashboard cards** | Skeleton cards | `useDashboardStats` `isLoading` | Until aggregates computed |
| **Rate history table** | Skeleton 3 rows | `useRates` `isLoading` | Until data fetched |
| **Route navigation** | Full-page spinner | React Router transitions | Lazy-loaded chunks |
| **Rate fetch (live API)** | Inline `xs` + pulsing text | Click "Fetch Live Rate" | Until API response |
| **Export/Report generation** | Inline `sm` + "Generating…" | Export button click | Until download starts |

### 10.3 Global Suspense Boundary

```jsx
// App.jsx — wrap routes in Suspense
<BrowserRouter>
  <AuthProvider>
    <Suspense fallback={<FullPageSpinner variant="gold" message="Loading Swarna Ledger…" />}>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/transactions" element={<PurchasesPage />} />
        {/* ... */}
      </Routes>
    </Suspense>
  </AuthProvider>
</BrowserRouter>
```

### 10.4 Button Loading State Pattern

```jsx
// Reusable pattern for all action buttons
<Button
  type="submit"
  disabled={isSubmitting}
  isLoading={isSubmitting}
  loadingText="Saving entry…"
>
  Save Entry
</Button>

// Button component handles:
// - disabled state
// - spinner prefix ( Spinner size="sm" inline )
// - text swap (children → loadingText)
// - opacity reduction while loading
```

### 10.5 Skeleton Specs

Follow existing Phase 6 skeleton pattern but expanded:

```jsx
// Table skeleton — shimmer animation
<TableSkeleton
  columns={visibleColumns.length}
  rows={5}
  showHeader={true}
  columnWidths={['120px', '180px', '100px', '100px', '120px', '120px', '140px', '100px']}
/>

// Card skeleton — for dashboard stats
<CardSkeleton
  hasIcon={true}
  hasValue={true}
  hasLabel={true}
  width="100%"
/>
```

Shimmer animation: gradient sweep from left to right using `oklch(93% 0.02 70)` → `oklch(97% 0.01 75)` → `oklch(93% 0.02 70)`, 1.5s infinite.

---

## 11. Verification & Testing Strategy

### 11.1 Test Coverage Targets

| Area | Target | Notes |
|---|---|---|
| `utils/goldCalc.js` | 100% | Must include SELLING sign-inversion tests |
| `services/*.service.js` | ≥ 90% | Includes members, dashboard, invite, password reset |
| `middleware/*.middleware.js` | ≥ 90% | |
| `routes/` (integration) | ≥ 80% | All new endpoints tested |
| React components/hooks | ≥ 70% | Includes spinner states, form drawers |

### 11.2 Key Test Scenarios

1. **DB Migration:** Verify `seller_name` → `members` migration produces zero data loss.
2. **Bidirectional math:** `SELLING` transaction produces correctly inverted pending signs.
3. **Dashboard aggregates:** Manual sum of table rows matches API aggregate values.
4. **Password reset:** Full flow from forgot → email → reset → login with new password.
5. **Invite rate limit:** 4th invite in 1 hour returns 429.
6. **Spinner visibility:** Every async mutation shows loading state; no action without feedback.
7. **Render health check:** `/health` returns 200 before marking deployment successful.

---

## 12. Migration & Rollback Strategy

### 12.1 Database Rollback (Phase 1)

The `003_member_management.sql` migration is **destructive** (drops `seller_name`). Before applying to production:

```bash
# 1. Full backup
supabase db dump --project-ref <ref> > backup_pre_migration.sql

# 2. Apply migration
supabase db push

# 3. Validate: count members == count distinct seller_names
supabase sql --project-ref <ref> -c "SELECT COUNT(*) FROM members;"
supabase sql --project-ref <ref> -c "SELECT COUNT(DISTINCT member_id) FROM purchases;"
```

**Rollback script** (`003_member_management_rollback.sql`):
```sql
-- Only if migration fails — restores seller_name from members
ALTER TABLE public.purchases ADD COLUMN seller_name TEXT;
UPDATE public.purchases p SET seller_name = m.name FROM members m WHERE p.member_id = m.id;
ALTER TABLE public.purchases ALTER COLUMN seller_name SET NOT NULL;
ALTER TABLE public.purchases DROP COLUMN member_id;
ALTER TABLE public.purchases DROP COLUMN transaction_type;
DROP TABLE public.members CASCADE;
```

### 12.2 Deployment Rollback (Phase 5)

If Render deployment fails:
1. Revert DNS to Railway services (services still paused, not deleted).
2. Update `VITE_API_BASE_URL` back to Railway URL in client env.
3. Resume Railway services with `railway up`.

**Safety rule:** Keep Railway services paused (not deleted) for 7 days post-migration.

### 12.3 Feature Flag Strategy

No feature flags needed — this is a small team. However, the migration can be done in stages:

1. Deploy code that **reads** from both `seller_name` and `members` (backward-compatible).
2. Run migration.
3. Deploy code that **only reads** from `members`.

Given the small user base, a maintenance window (5 minutes) is acceptable instead.
