-- migrations/003_member_management.sql
-- Members table, transaction_type, data migration, invite tracking

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

-- 11. Invite status tracking table
CREATE TABLE public.invite_status (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT NOT NULL,
  full_name     TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('STAFF', 'VIEWER')),
  status        TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED')),
  invited_by    UUID NOT NULL REFERENCES public.profiles(id),
  invited_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at   TIMESTAMPTZ,
  supabase_msg_id TEXT,
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

-- 12. Update audit_logs action_type check to include member actions
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_type_check;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_type_check
  CHECK (action_type IN (
    'LOGIN', 'LOGOUT',
    'CREATE_PURCHASE', 'UPDATE_PURCHASE', 'DELETE_PURCHASE',
    'CREATE_RATE', 'UPDATE_RATE',
    'INVITE_USER', 'UPDATE_USER_ROLE', 'DEACTIVATE_USER',
    'CREATE_MEMBER', 'UPDATE_MEMBER'
  ));
