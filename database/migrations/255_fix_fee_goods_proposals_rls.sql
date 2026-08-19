-- Migration: Fix Permissive RLS on fee_goods_proposals
-- Description: Replaces unrestricted write/delete policies with scoped multi-tenant RLS.

ALTER TABLE public.fee_goods_proposals ENABLE ROW LEVEL SECURITY;

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

NOTIFY pgrst, 'reload schema';
