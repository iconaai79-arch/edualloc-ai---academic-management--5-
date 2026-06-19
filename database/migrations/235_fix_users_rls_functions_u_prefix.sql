-- Migration: Fix RLS Functions for 'u_' prefixed IDs
-- Path: database/migrations/235_fix_users_rls_functions_u_prefix.sql

CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT institution_id 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    v_role := (
        SELECT role 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
    
    -- Bootstrap Super Admin (Safe fallback if profile not yet created)
    IF v_role IS NULL AND auth.jwt() ->> 'email' = 'super@app.com' THEN
        RETURN 'super_admin';
    END IF;
    
    RETURN v_role;
END;
$$;
