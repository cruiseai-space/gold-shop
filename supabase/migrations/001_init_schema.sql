-- migrations/001_init_schema.sql

-- 1. profiles — Extended user info
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

-- 2. rate_entries — Daily gold rate log
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

-- 3. purchases — Core ledger table
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

-- 4. audit_logs — Immutable action trail
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

-- Triggers: Auto-update updated_at
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

-- Trigger: Auto-create profile on signup
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
