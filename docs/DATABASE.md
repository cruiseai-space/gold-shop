# Database — Supabase PostgreSQL

## Overview

All SQL is managed via Supabase CLI migrations. Run commands with:
```bash
supabase migration new <name>
supabase db push          # apply migrations to remote
supabase db reset         # reset local dev DB + apply all migrations
supabase db diff          # show pending changes
```

---

## Tables

### 1. `profiles` — Extended user info (links to Supabase Auth `auth.users`)

```sql
-- migrations/001_init_schema.sql

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null,
  role        text not null default 'VIEWER'
                check (role in ('OWNER', 'STAFF', 'VIEWER')),
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.profiles is
  'User profiles extending Supabase Auth. One profile per auth user.';
```

---

### 2. `rate_entries` — Daily gold rate log

```sql
create table public.rate_entries (
  id            uuid primary key default gen_random_uuid(),
  market_rate   numeric(12, 4) not null,  -- ₹ per gram
  booked_rate   numeric(12, 4),           -- optional agreed rate
  effective_date date not null default current_date,
  notes         text,
  set_by        uuid not null references public.profiles(id),
  created_at    timestamptz not null default now()
);

create index idx_rate_entries_date on public.rate_entries(effective_date desc);

comment on column public.rate_entries.market_rate is 'Spot price per gram in INR';
comment on column public.rate_entries.booked_rate is 'Agreed shop rate for this date (optional)';
```

---

### 3. `purchases` — Core ledger table

```sql
create table public.purchases (
  id              uuid primary key default gen_random_uuid(),

  -- Transaction details
  purchase_date   date not null default current_date,
  seller_name     text not null,
  cash_source     text,              -- e.g. "Bank", "Safe", "Petty Cash"

  -- Weight + purity
  gross_weight    numeric(10, 4) not null check (gross_weight > 0),
  touch_percent   numeric(6, 4) not null
                    check (touch_percent > 0 and touch_percent <= 100),

  -- Calculated (stored for audit integrity — never recalculate from stored values)
  pure_weight     numeric(10, 4) not null,

  -- Rates
  market_rate     numeric(12, 4) not null check (market_rate > 0),
  booked_rate     numeric(12, 4),

  -- Financial
  pure_value      numeric(14, 4) not null,  -- pure_weight × market_rate
  cash_given      numeric(14, 4) not null default 0 check (cash_given >= 0),
  pending_amount  numeric(14, 4) not null,  -- pure_value − cash_given

  -- Metadata
  notes           text,
  created_by      uuid not null references public.profiles(id),
  updated_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index idx_purchases_date      on public.purchases(purchase_date desc);
create index idx_purchases_seller    on public.purchases(seller_name);
create index idx_purchases_created   on public.purchases(created_at desc);

comment on column public.purchases.pure_weight    is 'gross_weight × (touch_percent / 100)';
comment on column public.purchases.pure_value     is 'pure_weight × market_rate';
comment on column public.purchases.pending_amount is 'pure_value − cash_given. Positive = shop owes seller.';
```

---

### 4. `audit_logs` — Immutable action trail

```sql
create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id),
  user_name     text,               -- denormalized for log readability
  action_type   text not null
                  check (action_type in (
                    'LOGIN', 'LOGOUT',
                    'CREATE_PURCHASE', 'UPDATE_PURCHASE', 'DELETE_PURCHASE',
                    'CREATE_RATE', 'UPDATE_RATE',
                    'INVITE_USER', 'UPDATE_USER_ROLE', 'DEACTIVATE_USER'
                  )),
  entity_type   text,               -- 'purchase', 'rate', 'user'
  entity_id     uuid,               -- FK to the affected row
  payload_before jsonb,             -- row state before mutation
  payload_after  jsonb,             -- row state after mutation
  ip_address    inet,
  created_at    timestamptz not null default now()
);

create index idx_audit_logs_user    on public.audit_logs(user_id);
create index idx_audit_logs_entity  on public.audit_logs(entity_type, entity_id);
create index idx_audit_logs_created on public.audit_logs(created_at desc);
create index idx_audit_logs_action  on public.audit_logs(action_type);

-- Audit logs are write-once: no update or delete
```

---

## Triggers

### Auto-update `updated_at`

```sql
-- migrations/001_init_schema.sql (continued)

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_purchases_updated_at
  before update on public.purchases
  for each row execute function public.set_updated_at();

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();
```

### Auto-create profile on signup

```sql
-- Runs when Supabase Auth creates a new user
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'VIEWER')
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

---

## Row Level Security (RLS)

```sql
-- migrations/002_rls_policies.sql

-- Enable RLS on all tables
alter table public.profiles   enable row level security;
alter table public.purchases  enable row level security;
alter table public.rate_entries enable row level security;
alter table public.audit_logs  enable row level security;

-- Helper: get current user's role
create or replace function public.current_user_role()
returns text language sql stable security definer as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ============================================================
-- profiles policies
-- ============================================================

-- Anyone authenticated can view profiles (for displaying names in logs)
create policy "profiles: auth read"
  on public.profiles for select
  using (auth.uid() is not null);

-- Users can update their own profile (not role)
create policy "profiles: self update name"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id AND role = (select role from public.profiles where id = auth.uid()));

-- Owner can update any profile (including role)
create policy "profiles: owner full update"
  on public.profiles for update
  using (public.current_user_role() = 'OWNER');

-- ============================================================
-- purchases policies
-- ============================================================

-- All authenticated users can read purchases
create policy "purchases: auth read"
  on public.purchases for select
  using (auth.uid() is not null);

-- STAFF and OWNER can insert
create policy "purchases: staff insert"
  on public.purchases for insert
  with check (public.current_user_role() in ('OWNER', 'STAFF'));

-- STAFF can update their own purchases (created today)
create policy "purchases: staff update own today"
  on public.purchases for update
  using (
    public.current_user_role() = 'STAFF'
    AND created_by = auth.uid()
    AND created_at >= current_date
  );

-- OWNER can update any purchase
create policy "purchases: owner update any"
  on public.purchases for update
  using (public.current_user_role() = 'OWNER');

-- Only OWNER can delete
create policy "purchases: owner delete"
  on public.purchases for delete
  using (public.current_user_role() = 'OWNER');

-- ============================================================
-- rate_entries policies
-- ============================================================

create policy "rates: auth read"
  on public.rate_entries for select
  using (auth.uid() is not null);

create policy "rates: staff insert"
  on public.rate_entries for insert
  with check (public.current_user_role() in ('OWNER', 'STAFF'));

create policy "rates: owner update"
  on public.rate_entries for update
  using (public.current_user_role() = 'OWNER');

-- ============================================================
-- audit_logs policies
-- ============================================================

-- All authenticated users can read logs
create policy "logs: auth read"
  on public.audit_logs for select
  using (auth.uid() is not null);

-- Only server (service role key) can insert logs — not directly by users
-- Service role bypasses RLS; no insert policy needed for users
```

---

## Seed Data (dev only)

```sql
-- supabase/seed.sql

-- Insert a test owner (after creating user via Supabase Auth dashboard)
-- Replace UUIDs with real auth.users IDs after signup
insert into public.profiles (id, full_name, role)
values
  ('00000000-0000-0000-0000-000000000001', 'Shop Owner', 'OWNER'),
  ('00000000-0000-0000-0000-000000000002', 'Counter Staff', 'STAFF')
on conflict (id) do nothing;

-- Seed a rate entry
insert into public.rate_entries (market_rate, booked_rate, effective_date, set_by)
values
  (9500.00, 9480.00, current_date,
   '00000000-0000-0000-0000-000000000001');

-- Seed a purchase
insert into public.purchases (
  seller_name, gross_weight, touch_percent, pure_weight,
  market_rate, booked_rate, pure_value, cash_given, pending_amount, created_by
)
values (
  'Test Seller', 5.0000, 80.7500, 4.0375,
  9500.0000, 9480.0000, 38356.2500, 30000.0000, 8356.2500,
  '00000000-0000-0000-0000-000000000001'
);
```

---

## Migration Commands (Hermes Runbook)

```bash
# 1. Start local Supabase
supabase start

# 2. Apply all migrations to local
supabase db reset

# 3. Create a new migration file
supabase migration new add_purchase_notes

# 4. Edit the file in supabase/migrations/
# 5. Apply to local
supabase db push --local

# 6. Verify RLS works
supabase db diff   # should show no pending changes

# 7. Push to remote (production)
supabase db push

# 8. Validate RLS policies manually
# Use Supabase dashboard → Table Editor → check policies tab
```

---

## DB Validation Strategy

```bash
# Test RLS by switching roles
supabase sql --local <<'SQL'
-- Simulate STAFF user
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "<staff-uuid>", "role": "authenticated"}';
SELECT current_user_role(); -- should return 'STAFF'

-- Attempt to delete (should fail)
DELETE FROM purchases WHERE id = '<any-id>'; -- should raise RLS error
SQL
```

All calculated fields (`pure_weight`, `pure_value`, `pending_amount`) are stored after server-side verification. The DB does **not** auto-compute them — they are computed in `goldCalc.service.js` and stored, so the audit trail always has the exact values at time of entry.
