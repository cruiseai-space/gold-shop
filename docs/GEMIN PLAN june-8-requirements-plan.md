# Implementation Plan: Bidirectional Ledger & Member Management (June 8, 2026 Update)

## Objective
Evolve "Swarna Ledger" from a strictly inbound purchase tracker to a comprehensive bidirectional trading ledger. This involves introducing a formal `Members` entity, tracking both `BUYING` and `SELLING` transactions, and creating high-level P&L and Gold Flow dashboards.

## Key Files & Context
- `supabase/migrations/`: Requires a new migration to alter schema and migrate existing data.
- `client/src/utils/goldCalc.js` & `server/src/utils/goldCalc.js`: Calculation logic must adapt to Buying vs. Selling mechanics.
- `client/src/features/purchases/PurchaseFormDrawer.jsx`: Needs UI overhaul for Member selection and Transaction Type.
- `server/src/services/purchases.service.js`: Needs to support new foreign keys and transaction logic.
- **New Feature Directories:** `features/members/`, `features/dashboard/`.

## Phased Implementation Plan

### Phase 1: Database Schema & Data Migration (Backend)
**Goal:** Establish the new data model without breaking existing functionality.

1.  **Create Migration (`003_member_management.sql`):**
    *   Create `public.members` table: `id` (UUID), `name` (text), `phone` (text, nullable), `notes` (text, nullable), `created_at`, `updated_at`.
    *   Alter `public.purchases` table:
        *   Add `transaction_type` (text, default 'BUYING', check 'BUYING' or 'SELLING').
        *   Add `member_id` (UUID, nullable for temporary migration phase, references `members`).
    *   **Data Migration Script:**
        *   Extract unique `seller_name` values from existing `purchases`.
        *   Insert these unique names into the new `members` table.
        *   Update existing `purchases` to map their `member_id` to the newly created member records based on `seller_name`.
    *   Alter `public.purchases`:
        *   Make `member_id` NOT NULL.
        *   Drop the old `seller_name` column.
    *   Update Row Level Security (RLS) policies to secure the `members` table (OWNER/STAFF can manage, VIEWER read-only).

### Phase 2: Backend Services & Calculation Overhaul (Backend)
**Goal:** Update business logic to handle members and bidirectional trades.

1.  **Calculation Logic (`goldCalc.js`):**
    *   Update `computeGoldPurchase` to accept `transactionType`.
    *   Ensure the mathematical signs for `pendingAmount` correctly reflect who owes whom based on whether it is a BUY or SELL transaction.
    *   Update `goldCalc.test.js` to ensure 100% coverage on new directional math.
2.  **Members API:**
    *   Create `members.service.js` (CRUD for members).
    *   Create `members.controller.js` and `members.routes.js`.
    *   Mount routes in `routes/index.js`.
3.  **Purchases API Update:**
    *   Update `purchases.service.js` to accept `memberId` and `transactionType` instead of `sellerName`.
    *   Update `listPurchases` to join the `members` table so the frontend receives the member's name.
    *   Update `purchases.service.test.js` and `purchases.controller.js`.
4.  **Dashboard API:**
    *   Create `dashboard.service.js` with aggregation queries:
        *   `getOverallStats()`: Calculates Total P&L (pure value delta), Total Gold In, Total Gold Out.
        *   `getMemberStats(memberId)`: Calculates individual member's P&L and net gold flow.

### Phase 3: Frontend Member Management & Form Updates (Frontend)
**Goal:** Expose the new data model to the user interface.

1.  **Members Feature (`client/src/features/members/`):**
    *   Create `useMembers.js` (React Query hooks for Members API).
    *   Create `MembersPage.jsx`: A simple list view to add/edit Members (Name, Phone, Notes).
2.  **Purchase Form Drawer Update (`PurchaseFormDrawer.jsx`):**
    *   Replace the free-text "Seller Name" input with a Select/Combobox bound to the `members` query.
    *   Add a Toggle/Radio switch for "Transaction Type" (`BUYING` vs `SELLING`).
    *   Ensure the "Pending" calculations preview correctly reflects the selected transaction type.
3.  **Transaction Table Update (`PurchasesPage.jsx`):**
    *   Update the table columns to reflect "Transaction Type" (e.g., visual badges for IN/OUT).
    *   Ensure the "Seller" column correctly displays the joined `member.name`.

### Phase 4: Dashboards & Advanced UI (Frontend)
**Goal:** Deliver the new high-level overviews requested in the update.

1.  **Home Screen (`client/src/features/dashboard/DashboardPage.jsx`):**
    *   Make this the new root route (`/`). Move the existing Purchases table to `/transactions` or keep it below the summary cards.
    *   Implement Summary Cards: Total P&L, Overall Gold In, Overall Gold Out.
    *   Integrate Date Filters that cascade down to both the summary cards and the transaction list.
2.  **Advanced Table Features (`PurchasesPage.jsx`):**
    *   Implement a "Column Picker" allowing users to hide/show specific columns (e.g., hiding Gross Wt if only Pure Wt matters to them).
3.  **Member Detail View (`client/src/features/members/MemberDetailPage.jsx`):**
    *   Create a view for a specific member showing:
        *   Their contact info and notes.
        *   Their specific P&L and Net Gold Flow.
        *   A filtered list of only their transactions.
4.  **Navigation Update:**
    *   Update `Sidebar.jsx` and `App.jsx` router configuration to reflect the new navigation hierarchy (Home, Members, Transactions, Rates, Logs, Settings).

## Verification & Testing
- **Database:** Verify data migration script successfully converts existing string `seller_name`s to UUID `member_id`s without data loss.
- **TDD:** Ensure `goldCalc.js` changes maintain 100% coverage, specifically testing the inverse math of `SELLING` vs `BUYING`.
- **UI Testing:** Verify the Column Picker state persists (or resets gracefully) and that Dashboard aggregates match manual calculations of table rows.

## Migration & Rollback Strategy
The `003_member_management.sql` migration is destructive (dropping `seller_name`). Before applying to production, a manual `supabase db dump` backup will be required. If rollback is necessary, a down-migration must be written to recreate `seller_name` from the `members` table before dropping the foreign key.