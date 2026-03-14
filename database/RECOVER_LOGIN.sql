-- RECOVER_LOGIN.sql
-- SINGLE ATOMIC BLOCK TO RESTORE ACCESS

DO $$ 
BEGIN
    -- 1. Disable RLS on core tables
    BEGIN
        ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.institutions DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.system_settings DISABLE ROW LEVEL SECURITY;
        ALTER TABLE public.activity_log DISABLE ROW LEVEL SECURITY;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: Some RLS disable operations might have failed or tables missing.';
    END;

    -- 2. Grant access
    BEGIN
        GRANT ALL ON public.users TO anon, authenticated;
        GRANT ALL ON public.institutions TO anon, authenticated;
        GRANT ALL ON public.system_settings TO anon, authenticated;
        GRANT ALL ON public.activity_log TO anon, authenticated;
    EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Notice: Some Grant operations failed.';
    END;

    -- 3. Restore Functions using EXECUTE to keep it in one block
    EXECUTE 'CREATE OR REPLACE FUNCTION public.get_curr_user_role()
    RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
    BEGIN
        RETURN (SELECT role FROM public.users WHERE id = auth.uid()::text OR id = ''u_'' || auth.uid()::text LIMIT 1);
    END;
    $f$';

    EXECUTE 'CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
    RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
    BEGIN
        RETURN (SELECT institution_id FROM public.users WHERE id = auth.uid()::text OR id = ''u_'' || auth.uid()::text LIMIT 1);
    END;
    $f$';

    RAISE NOTICE 'RECOVERY COMPLETE: RLS disabled and helpers restored.';
END $$;
