-- supabase/seed.sql

-- NOTE: Replace UUIDs with real auth.users IDs after they are created
-- These are placeholders for documentation reference

-- Insert a test owner
-- insert into public.profiles (id, full_name, role)
-- values
--   ('00000000-0000-0000-0000-000000000001', 'Shop Owner', 'OWNER'),
--   ('00000000-0000-0000-0000-000000000002', 'Counter Staff', 'STAFF')
-- on conflict (id) do nothing;

-- Seed a rate entry (Requires a valid profile ID)
-- insert into public.rate_entries (market_rate, booked_rate, effective_date, set_by)
-- values
--   (9500.00, 9480.00, current_date,
--    '00000000-0000-0000-0000-000000000001');

-- Seed a purchase (Requires a valid profile ID)
-- insert into public.purchases (
--   seller_name, gross_weight, touch_percent, pure_weight,
--   market_rate, booked_rate, pure_value, cash_given, pending_amount, created_by
-- )
-- values (
--   'Test Seller', 5.0000, 80.7500, 4.0375,
--   9500.0000, 9480.0000, 38356.2500, 30000.0000, 8356.2500,
--   '00000000-0000-0000-0000-000000000001'
-- );
