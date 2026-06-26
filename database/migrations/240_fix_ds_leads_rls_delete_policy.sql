-- 240. FIX DS_LEADS DELETE RLS POLICY
-- Allow institution-scoped users to delete their own ds_leads records
-- This enables the browser Supabase client (anon key + JWT) to delete directly,
-- bypassing the need to go through the service-role API endpoint.

DO $$
BEGIN
    -- Drop old catch-all manage policy and recreate with explicit operations
    DROP POLICY IF EXISTS "Institutional tenancy manage: ds_leads" ON ds_leads;

    -- SELECT — existing rows within own institution or super_admin
    DROP POLICY IF EXISTS "Institutional tenancy select: ds_leads" ON ds_leads;
    CREATE POLICY "Institutional tenancy select: ds_leads" ON ds_leads
        FOR SELECT USING (
            institution_id = public.get_curr_user_inst_id()
            OR public.get_curr_user_role() = 'super_admin'
        );

    -- INSERT
    DROP POLICY IF EXISTS "Institutional tenancy insert: ds_leads" ON ds_leads;
    CREATE POLICY "Institutional tenancy insert: ds_leads" ON ds_leads
        FOR INSERT WITH CHECK (
            institution_id = public.get_curr_user_inst_id()
            OR public.get_curr_user_role() = 'super_admin'
        );

    -- UPDATE
    DROP POLICY IF EXISTS "Institutional tenancy update: ds_leads" ON ds_leads;
    CREATE POLICY "Institutional tenancy update: ds_leads" ON ds_leads
        FOR UPDATE USING (
            institution_id = public.get_curr_user_inst_id()
            OR public.get_curr_user_role() = 'super_admin'
        );

    -- DELETE — explicit policy so anon+JWT can delete their own institution's leads
    DROP POLICY IF EXISTS "Institutional tenancy delete: ds_leads" ON ds_leads;
    CREATE POLICY "Institutional tenancy delete: ds_leads" ON ds_leads
        FOR DELETE USING (
            institution_id = public.get_curr_user_inst_id()
            OR public.get_curr_user_role() = 'super_admin'
        );

    -- Ensure grants are in place
    GRANT ALL ON public.ds_leads TO anon, authenticated, service_role;
END $$;
