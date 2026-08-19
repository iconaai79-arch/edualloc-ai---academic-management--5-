-- Migration: Fix Permissive RLS on document_collections
-- Description: Replaces unrestricted FOR ALL policies with scoped multi-tenant RLS.

ALTER TABLE public.document_collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "document_collections_all" ON public.document_collections;
DROP POLICY IF EXISTS "document_collections_select" ON public.document_collections;
DROP POLICY IF EXISTS "document_collections_insert" ON public.document_collections;
DROP POLICY IF EXISTS "document_collections_update" ON public.document_collections;
DROP POLICY IF EXISTS "document_collections_delete" ON public.document_collections;

CREATE POLICY "document_collections_select" ON public.document_collections
    FOR SELECT TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "document_collections_insert" ON public.document_collections
    FOR INSERT TO authenticated, anon
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "document_collections_update" ON public.document_collections
    FOR UPDATE TO authenticated, anon
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL)
    WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin' OR public.get_curr_user_inst_id() IS NULL);

CREATE POLICY "document_collections_delete" ON public.document_collections
    FOR DELETE TO authenticated
    USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = 'super_admin');

GRANT ALL ON public.document_collections TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
