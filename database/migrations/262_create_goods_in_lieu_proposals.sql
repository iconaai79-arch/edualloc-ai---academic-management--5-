-- Migration: Create fee_goods_proposals table
-- This allows parents/students to request to supply goods or services in order to pay school fees

CREATE TABLE IF NOT EXISTS public.fee_goods_proposals (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit TEXT NOT NULL,
    unit_value DECIMAL(12, 2) NOT NULL,
    total_value DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.fee_goods_proposals ENABLE ROW LEVEL SECURITY;

-- Add Scoped RLS Policies
DROP POLICY IF EXISTS "Allow select for institution members" ON public.fee_goods_proposals;
DROP POLICY IF EXISTS "Allow insert for institution members" ON public.fee_goods_proposals;
DROP POLICY IF EXISTS "Allow update for institution members" ON public.fee_goods_proposals;
DROP POLICY IF EXISTS "Allow delete for institution members" ON public.fee_goods_proposals;
DROP POLICY IF EXISTS "fee_goods_proposals_select" ON public.fee_goods_proposals;
DROP POLICY IF EXISTS "fee_goods_proposals_insert" ON public.fee_goods_proposals;
DROP POLICY IF EXISTS "fee_goods_proposals_update" ON public.fee_goods_proposals;
DROP POLICY IF EXISTS "fee_goods_proposals_delete" ON public.fee_goods_proposals;

CREATE POLICY "fee_goods_proposals_select" ON public.fee_goods_proposals
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "fee_goods_proposals_insert" ON public.fee_goods_proposals
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "fee_goods_proposals_update" ON public.fee_goods_proposals
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "fee_goods_proposals_delete" ON public.fee_goods_proposals
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.fee_goods_proposals TO anon, authenticated, service_role;
