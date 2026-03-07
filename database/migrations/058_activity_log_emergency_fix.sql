-- 058_activity_log_emergency_fix.sql
-- Emergency permissive access for activity_log to debug loading issues.

-- 1. Harden Helper Functions (Ensuring resilience to missing user records)
CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_role TEXT;
BEGIN
    SELECT role INTO v_role FROM public.users 
    WHERE id = auth.uid()::text OR id = 'u_' || auth.uid()::text LIMIT 1;
    
    IF v_role IS NULL AND auth.jwt() ->> 'email' = 'super@app.com' THEN
        RETURN 'super_admin';
    END IF;
    RETURN COALESCE(v_role, 'anon');
END;
$$;

CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    v_inst_id TEXT;
BEGIN
    SELECT institution_id INTO v_inst_id FROM public.users 
    WHERE id = auth.uid()::text OR id = 'u_' || auth.uid()::text LIMIT 1;
    
    -- Super Admin Bootstrap check
    IF v_inst_id IS NULL AND auth.jwt() ->> 'email' = 'super@app.com' THEN
        RETURN NULL;
    END IF;
    RETURN v_inst_id;
END;
$$;

-- 2. Activity Log RLS Overhaul
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Aggressively drop all previous policy names to avoid conflicts
DO $$
DECLARE
    p_name TEXT;
BEGIN
    FOR p_name IN (SELECT policyname FROM pg_policies WHERE tablename = 'activity_log') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_log', p_name);
    END LOOP;
END $$;

-- 3. APPLY PERMISSIVE POLICIES (Temporary for Verification)
-- ANY authenticated user can see ALL logs. This rules out RLS logic errors.
CREATE POLICY "activity_log_emergency_select"
    ON public.activity_log
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "activity_log_emergency_insert"
    ON public.activity_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Super admin has full control
CREATE POLICY "activity_log_emergency_all"
    ON public.activity_log
    FOR ALL
    TO authenticated
    USING (public.get_curr_user_role() = 'super_admin');

DO $$ BEGIN
    RAISE NOTICE 'Activity Log RLS emergency permissive access applied.';
END $$;
