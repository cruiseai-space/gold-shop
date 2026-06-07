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
