-- Migration 326: Create commission_withdrawal_requests table
-- Description: Stores reseller agency commission withdrawal requests, payout statuses, and disbursement bank/mobile account details.

CREATE TABLE IF NOT EXISTS public.commission_withdrawal_requests (
    id TEXT PRIMARY KEY,
    reseller_id TEXT NOT NULL,
    reseller_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    notes TEXT,
    account_details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Backward compatibility column aliases
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS reseller_id TEXT;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS reseller_name TEXT;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS account_details TEXT;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS notes TEXT;

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cwr_reseller_id ON public.commission_withdrawal_requests(reseller_id);
CREATE INDEX IF NOT EXISTS idx_cwr_status ON public.commission_withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_cwr_requested_at ON public.commission_withdrawal_requests(requested_at DESC);

-- Enable Row Level Security
ALTER TABLE public.commission_withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- Scoped RLS Policies
DROP POLICY IF EXISTS "commission_withdrawal_requests_all_access" ON public.commission_withdrawal_requests;
DROP POLICY IF EXISTS "commission_withdrawal_requests_select" ON public.commission_withdrawal_requests;
DROP POLICY IF EXISTS "commission_withdrawal_requests_insert" ON public.commission_withdrawal_requests;
DROP POLICY IF EXISTS "commission_withdrawal_requests_update" ON public.commission_withdrawal_requests;
DROP POLICY IF EXISTS "commission_withdrawal_requests_delete" ON public.commission_withdrawal_requests;

CREATE POLICY "commission_withdrawal_requests_select" ON public.commission_withdrawal_requests
    FOR SELECT TO authenticated, anon
    USING (true);

CREATE POLICY "commission_withdrawal_requests_insert" ON public.commission_withdrawal_requests
    FOR INSERT TO authenticated, anon
    WITH CHECK (id IS NOT NULL);

CREATE POLICY "commission_withdrawal_requests_update" ON public.commission_withdrawal_requests
    FOR UPDATE TO authenticated, anon
    USING (auth.role() IN ('authenticated', 'anon') OR public.get_curr_user_role()::text = 'super_admin')
    WITH CHECK (id IS NOT NULL);

CREATE POLICY "commission_withdrawal_requests_delete" ON public.commission_withdrawal_requests
    FOR DELETE TO authenticated
    USING (auth.role() = 'authenticated' OR public.get_curr_user_role()::text = 'super_admin');

-- Grant privileges
GRANT ALL ON public.commission_withdrawal_requests TO anon, authenticated, service_role;

-- Force PostgREST to reload schema cache so the table is immediately recognized
NOTIFY pgrst, 'reload schema';
