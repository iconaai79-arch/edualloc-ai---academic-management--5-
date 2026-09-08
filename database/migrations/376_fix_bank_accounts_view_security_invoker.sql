-- Migration 376: Fix bank_accounts view security_invoker property
-- Description: Sets security_invoker = true on public.bank_accounts view so that Postgres RLS policies 
--              of the querying user are enforced rather than bypassing RLS via SECURITY DEFINER.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM pg_views 
        WHERE schemaname = 'public' AND viewname = 'bank_accounts'
    ) THEN
        -- Option 1: Direct alter for PostgreSQL 15+
        EXECUTE 'ALTER VIEW public.bank_accounts SET (security_invoker = true);';
    ELSIF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'school_bank_accounts'
    ) THEN
        -- Option 2: Recreate view with security_invoker = true if not already created
        CREATE OR REPLACE VIEW public.bank_accounts 
        WITH (security_invoker = true) AS 
        SELECT 
            id,
            institution_id,
            bank_name,
            account_name,
            account_number,
            branch_name,
            currency,
            status,
            created_at
        FROM public.school_bank_accounts;

        GRANT ALL ON public.bank_accounts TO anon, authenticated, service_role;
    END IF;
END $$;
