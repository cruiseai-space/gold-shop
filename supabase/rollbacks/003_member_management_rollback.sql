-- Rollback for 003_member_management.sql
-- Only use if migration fails — restores seller_name from members

-- Restore seller_name on purchases
ALTER TABLE public.purchases ADD COLUMN seller_name TEXT;
UPDATE public.purchases p SET seller_name = m.name FROM public.members m WHERE p.member_id = m.id;
ALTER TABLE public.purchases ALTER COLUMN seller_name SET NOT NULL;

-- Remove new columns
ALTER TABLE public.purchases DROP COLUMN member_id;
ALTER TABLE public.purchases DROP COLUMN transaction_type;

-- Drop indexes
DROP INDEX IF EXISTS idx_purchases_member;
DROP INDEX IF EXISTS idx_purchases_type;
DROP INDEX IF EXISTS idx_members_name;

-- Drop tables
DROP TABLE IF EXISTS public.invite_status CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;

-- Restore original audit_logs constraint
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_type_check
  CHECK (action_type IN (
    'LOGIN', 'LOGOUT',
    'CREATE_PURCHASE', 'UPDATE_PURCHASE', 'DELETE_PURCHASE',
    'CREATE_RATE', 'UPDATE_RATE',
    'INVITE_USER', 'UPDATE_USER_ROLE', 'DEACTIVATE_USER'
  ));
