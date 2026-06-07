# Screens & Design System

## Design Direction

**"Modern Paati Kadai Ledger"** — a South Indian goldsmith's account book, translated into software.

The aesthetic is **refined utilitarian**: warm aged parchment backgrounds, deep iron-ink text, real gold accents that earn their place. Not trendy-SaaS, not generic dashboard. Numbers feel heavy and authoritative. Every currency value commands attention.

Anti-references (do NOT converge on):
- Purple-gradient-on-white SaaS
- Generic card-grid dashboard
- "Dark mode fintech" with blue accents
- Bright yellow "gold" interfaces

---

## Design Tokens (CSS Custom Properties)

```css
/* client/src/styles/tokens.css */

:root {
  /* ── Palette ── */

  /* Backgrounds — warm aged cream */
  --color-bg:          oklch(97.5% 0.012 75);   /* Page background */
  --color-surface:     oklch(95.5% 0.018 72);   /* Card / drawer background */
  --color-surface-2:   oklch(93%   0.022 70);   /* Nested surface, input bg */
  --color-border:      oklch(85%   0.020 68);   /* Dividers, input borders */
  --color-border-strong: oklch(72% 0.025 65);   /* Active borders */

  /* Ink — near-black with warmth */
  --color-ink:         oklch(18%  0.025 55);    /* Body text */
  --color-ink-muted:   oklch(48%  0.018 60);    /* Secondary text, placeholders */
  --color-ink-faint:   oklch(68%  0.012 65);    /* Disabled text */

  /* Primary — deep burnt copper/saffron (NOT yellow gold) */
  --color-primary:     oklch(52%  0.148 45);    /* Buttons, active nav */
  --color-primary-hover: oklch(46% 0.152 43);
  --color-primary-active: oklch(40% 0.148 42);
  --color-primary-subtle: oklch(90% 0.035 55);  /* Chip bg, highlight bg */
  --color-primary-text: oklch(98%  0.008 75);   /* Text on primary bg */

  /* Gold accent — used sparingly: pending badge, logo mark */
  --color-gold:        oklch(72%  0.185 85);
  --color-gold-subtle: oklch(94%  0.035 80);

  /* Semantic */
  --color-success:     oklch(58%  0.145 145);
  --color-success-subtle: oklch(93% 0.045 145);
  --color-warning:     oklch(70%  0.162 72);
  --color-warning-subtle: oklch(94% 0.050 78);
  --color-danger:      oklch(52%  0.198 25);
  --color-danger-subtle: oklch(93% 0.040 25);

  /* ── Typography ── */
  --font-display: 'Lora', Georgia, serif;           /* Headings — traditional serif */
  --font-body:    'Plus Jakarta Sans', system-ui, sans-serif; /* Body — modern humanist */
  --font-mono:    'IBM Plex Mono', 'Courier New', monospace;  /* Numbers, currency */

  /* Scale (1.25 ratio) */
  --text-xs:   0.75rem;    /* 12px — labels, badges */
  --text-sm:   0.875rem;   /* 14px — secondary text */
  --text-base: 1rem;       /* 16px — body */
  --text-lg:   1.125rem;   /* 18px — lead text */
  --text-xl:   1.25rem;    /* 20px — card headers */
  --text-2xl:  1.5625rem;  /* 25px */
  --text-3xl:  1.953rem;   /* 31px — page titles */

  /* ── Spacing (4px base) ── */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-12: 3rem;
  --space-16: 4rem;

  /* ── Border Radius ── */
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-full: 9999px;

  /* ── Shadows ── */
  --shadow-sm: 0 1px 2px oklch(18% 0.025 55 / 0.06);
  --shadow-md: 0 4px 12px oklch(18% 0.025 55 / 0.10);
  --shadow-lg: 0 8px 24px oklch(18% 0.025 55 / 0.14);

  /* ── Motion (Emil Kowalski principles) ── */
  --ease-out:     cubic-bezier(0.23, 1, 0.32, 1);
  --ease-in-out:  cubic-bezier(0.77, 0, 0.175, 1);
  --ease-drawer:  cubic-bezier(0.32, 0.72, 0, 1);

  /* ── Z-index scale ── */
  --z-base:       1;
  --z-dropdown:   100;
  --z-sticky:     200;
  --z-drawer:     300;
  --z-modal-bg:   400;
  --z-modal:      500;
  --z-toast:      600;
  --z-tooltip:    700;
}
```

---

## Typography Pairings

| Use | Font | Size | Weight |
|---|---|---|---|
| Page title | Lora | `--text-3xl` | 600 |
| Section heading | Lora | `--text-xl` | 600 |
| Body | Plus Jakarta Sans | `--text-base` | 400 |
| Label / badge | Plus Jakarta Sans | `--text-xs` | 600, uppercase |
| Numbers / currency | IBM Plex Mono | `--text-sm`→`--text-base` | 500 |
| Muted text | Plus Jakarta Sans | `--text-sm` | 400 |

Currency always right-aligned, monospace. Positive amounts: `--color-success`. Negative: `--color-danger`. Zero: `--color-ink-muted`.

---

## UI States for All Interactive Elements

### Button States
```
Default     bg=primary,       text=primary-text
Hover       bg=primary-hover, shadow-sm, transition 150ms ease-out
Active      bg=primary-active, scale(0.97) — 100ms ease-out
Focus       outline 2px primary at 2px offset
Disabled    opacity-40, cursor-not-allowed, no hover
Loading     spinner left of text, text="Saving…", disabled
```

### Input States
```
Default     bg=surface-2, border=border, text=ink
Hover       border=border-strong
Focus       border=primary, ring 3px primary/20
Error       border=danger, ring 3px danger/15, error msg below in danger color
Disabled    opacity-50, cursor-not-allowed
Read-only   bg=surface, border=transparent, cursor-default
```

### Table Row States
```
Default     bg=transparent
Hover       bg=primary-subtle/30
Selected    bg=primary-subtle, border-l 3px primary
Positive pending  — pending cell: color=success, badge=OWE
Negative pending  — pending cell: color=danger,  badge=OVERPAID
Zero pending      — pending cell: color=ink-muted, badge=SETTLED
```

### Toast / Notification
```
Success  bg=success-subtle,  border-l 4px success,  icon=CheckCircle
Error    bg=danger-subtle,   border-l 4px danger,   icon=XCircle
Warning  bg=warning-subtle,  border-l 4px warning,  icon=AlertTriangle
Info     bg=primary-subtle,  border-l 4px primary,  icon=Info

Position: bottom-right
Enter:   translateY(100%) → 0, opacity 0→1, 250ms ease-out
Exit:    opacity 1→0, 180ms ease-out (faster than enter)
Lifetime: 4s (error: 6s, persists until dismissed)
```

---

## Screens

### 1. Login Page

**Route:** `/login` (public)

**Layout:** Centered card on warm-cream background, subtle radial gradient. Lora "Swarna Ledger" wordmark above form.

**Elements:**
- Email input (label: "Email address")
- Password input (label: "Password", show/hide toggle)
- "Sign In" button (full width)
- Error toast on failure

**States:**
- Default → clean, no pre-fill
- Loading → button shows spinner, inputs disabled
- Error → shake animation on form card (200ms), toast error

**No sign-up link.** Users are invited by the owner. No "forgot password" in v1 (owner resets via Supabase dashboard).

---

### 2. Dashboard / Purchases Page

**Route:** `/dashboard` (default after login)

**Layout:**
```
[Sidebar: fixed left 240px]  |  [Main content area]
                              |  [Topbar: "Purchases" + "Add Entry" button]
                              |  [Rate Banner: today's rate or "Set Rate" prompt]
                              |  [Filters: date range, seller search]
                              |  [Purchase Table]
                              |  [Pagination]
```

**Topbar:**
- Title: "Gold Purchases" (Lora)
- Right: `[+ Add Entry]` button (primary, STAFF/OWNER only)

**Rate Banner:**
- If today's rate is set: "Today's rate: ₹9,500/g · Booked: ₹9,480/g" (dismissable, gold-subtle bg)
- If not set: "No rate set for today. [Set Rate →]" (warning-subtle bg, STAFF/OWNER only)

**Filters bar:**
- Date range picker (From → To)
- Seller name search (debounced 300ms)
- Clear filters link

**Purchase Table columns:**
```
Date | Seller | Gross Wt | Touch% | Pure Wt | Market Rate | Cash Given | Pure Value | Pending | Actions
```
- All numeric columns right-aligned, monospace
- Pending column: colored badge (OWE / SETTLED / OVERPAID)
- Actions: eye icon (view), pencil icon (edit, STAFF/OWNER), trash icon (delete, OWNER only)
- Hover row → subtle background shift

**Empty state:**
- Icon: ledger book illustration (SVG, inline)
- Text: "No purchases recorded yet"
- CTA: "+ Add your first entry" (if STAFF/OWNER)

**Loading state:** skeleton rows (5 rows, columns shimmer)

---

### 3. Purchase Form Drawer (Add / Edit)

**Trigger:** "+ Add Entry" button, or edit icon on row
**Layout:** Slide-in drawer from right (480px wide on desktop)
**Enter:** translateX(100%) → 0, 300ms `--ease-drawer`
**Exit:** translateX(0) → 100%, 200ms ease-out
**Backdrop:** semi-transparent overlay (z-drawer — 1)

**Form fields (top to bottom):**

```
Date                  [Date picker, defaults to today]
Seller Name           [Text input, required]
Cash Source           [Text input: "Bank", "Safe", etc.]
─── Gold Details ─────────────────────────────────
Gross Weight (g)      [Number input, 4 decimal, required]
Touch %               [Number input, 0–100, 4 decimal, required]
─── Rates ────────────────────────────────────────
Market Rate (₹/g)     [Number, pre-filled from today's rate, required]
Booked Rate (₹/g)     [Number, optional, defaults to market rate]
Cash Given (₹)        [Number, min 0, required]
─── Live Calculation Preview ─────────────────────
[Card with warm-gold border]
  Pure Weight:    4.0375 g
  Pure Value:     ₹38,356.25
  Pending Amt:    ₹8,356.25  ← colored by sign
─────────────────────────────────────────────────
Notes                 [Textarea, optional, 3 rows]
─────────────────────────────────────────────────
[Cancel]  [Save Entry →]
```

**Calculation preview updates on every keystroke** (useEffect watching watched fields).

**Validation:**
- All required fields must be filled
- grossWeight > 0
- touchPercent: 0 < x ≤ 100
- marketRate > 0
- cashGiven ≥ 0
- Error messages appear inline below each field on blur

---

### 4. Purchase Detail Modal (View)

**Trigger:** Eye icon on table row
**Layout:** Centered modal, 560px max-width
**Enter:** scale(0.95) opacity-0 → scale(1) opacity-1, 200ms ease-out

**Content:**
```
[Header: "Purchase — June 1, 2025"]
[Badge: seller name]

Two-column info grid:
  Seller Name      |  Date
  Cash Source      |  Recorded By
  Gross Weight     |  Touch %

Calculation breakdown (styled like a formal receipt):
  Pure Weight    =  Gross Weight × Touch%
                 =  5.0000g × 80.75%
                 =  4.0375g

  Pure Value     =  Pure Weight × Market Rate
                 =  4.0375g × ₹9,500
                 =  ₹38,356.25

  Pending Amount =  Pure Value − Cash Given
                 =  ₹38,356.25 − ₹30,000.00
                 =  ₹8,356.25 [OWE badge]

[Notes if any]
[Footer: "Created: Jun 1, 2025 10:32 AM by Owner Name"]
[Close button]
```

---

### 5. Rate Entry Panel

**Route:** `/rates` (side nav link)
**Layout:** Two-panel — Set Today's Rate (left) + Rate History table (right)

**Set Rate form:**
```
Market Rate (₹/g)   [required]
Booked Rate (₹/g)   [optional]
Effective Date      [defaults to today]
Notes               [optional]
[Save Rate]
```
Validation: marketRate > 0.

**Rate History table:**
```
Date | Market Rate | Booked Rate | Set By | Time
```
Newest first. Last 30 days by default.

---

### 6. Audit Logs Page

**Route:** `/logs` (side nav link)
**Layout:** Filters bar + table

**Filters:** User dropdown, Action type dropdown, Date range

**Table columns:**
```
Time | User | Action | Entity | Details
```

**Action type badges:**
- `CREATE_PURCHASE` → success
- `UPDATE_PURCHASE` → warning
- `DELETE_PURCHASE` → danger
- `LOGIN` / `LOGOUT` → primary-subtle
- `CREATE_RATE` → gold-subtle

**Row click:** opens LogDetailModal showing `payload_before` → `payload_after` diff (JSON, monospace).

---

### 7. Settings Page _(OWNER only)_

**Route:** `/settings`
**Layout:** Tabbed: [Users] [Shop Info (future)]

**Users tab:**
```
[+ Invite User] button → InviteUserModal

Table:
  Name | Email | Role | Status | Actions
  ─────────────────────────────────────
  Owner Name  | ...  | OWNER | Active | —
  Staff Name  | ...  | STAFF | Active | [Change Role ▾] [Deactivate]
```

**InviteUserModal:**
```
Full Name   [text, required]
Email       [email, required]
Role        [select: STAFF | VIEWER]
[Send Invite] → calls /api/users/invite
```

---

## Sidebar Navigation

```
[◆ Swarna Ledger]          ← logo + wordmark
──────────────────
[📋 Purchases]             active state: left border 3px primary
[📈 Rates]
[📜 Audit Logs]
[⚙ Settings]               OWNER only
──────────────────
[User Name]
[Role Badge]
[Logout]
```

Sidebar: fixed left, 240px, `--color-surface` background, `--shadow-sm` right edge.

---

## Responsive Behavior

Target: primarily **desktop** (shop has a counter PC or laptop). Tablet secondary.

- < 768px: sidebar collapses to hamburger + bottom sheet
- Table: horizontal scroll on mobile, sticky first column (Date)
- Drawer: full-width on mobile
- Forms: single column always (already 1-col)

No native mobile app in v1. The shop operates from a desktop browser.
