-- Migration: Create bursary_disbursements table
-- Path: database/migrations/355_create_bursary_disbursements_table.sql

CREATE TABLE IF NOT EXISTS public.bursary_disbursements (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    institutionId TEXT,
    donor_name TEXT,
    donorName TEXT,
    cheque_number TEXT,
    chequeNumber TEXT,
    bank_name TEXT,
    bankName TEXT,
    cheque_date TEXT,
    chequeDate TEXT,
    total_amount DOUBLE PRECISION DEFAULT 0.0,
    totalAmount DOUBLE PRECISION DEFAULT 0.0,
    allocated_amount DOUBLE PRECISION DEFAULT 0.0,
    allocatedAmount DOUBLE PRECISION DEFAULT 0.0,
    allocations JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    bank_account_id TEXT,
    bankAccountId TEXT,
    posted_by TEXT,
    postedBy TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    createdAt TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for optimal lookup and filtering
CREATE INDEX IF NOT EXISTS idx_bursary_disbursements_institution_id ON public.bursary_disbursements (institution_id);
CREATE INDEX IF NOT EXISTS idx_bursary_disbursements_donor_name ON public.bursary_disbursements (donor_name);
CREATE INDEX IF NOT EXISTS idx_bursary_disbursements_cheque_number ON public.bursary_disbursements (cheque_number);
CREATE INDEX IF NOT EXISTS idx_bursary_disbursements_created_at ON public.bursary_disbursements (created_at DESC);

-- Enable RLS
ALTER TABLE public.bursary_disbursements ENABLE ROW LEVEL SECURITY;

-- Scoped multi-tenant RLS policies
DROP POLICY IF EXISTS "bursary_disbursements_all" ON public.bursary_disbursements;
DROP POLICY IF EXISTS "bursary_disbursements_select" ON public.bursary_disbursements;
DROP POLICY IF EXISTS "bursary_disbursements_insert" ON public.bursary_disbursements;
DROP POLICY IF EXISTS "bursary_disbursements_update" ON public.bursary_disbursements;
DROP POLICY IF EXISTS "bursary_disbursements_delete" ON public.bursary_disbursements;

CREATE POLICY "bursary_disbursements_select" ON public.bursary_disbursements
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "bursary_disbursements_insert" ON public.bursary_disbursements
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "bursary_disbursements_update" ON public.bursary_disbursements
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "bursary_disbursements_delete" ON public.bursary_disbursements
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.bursary_disbursements TO anon, authenticated, service_role;
