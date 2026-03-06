-- Migration 040: Fix RLS ID Mismatch
-- This migration updates the RLS helper functions to handle the 'u_' prefix 
-- commonly used in the frontend's ID generation.

-- 1. Update get_curr_user_inst_id
CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Support both raw UUID and 'u_' prefixed UUID (used by frontend)
    RETURN (
        SELECT institution_id 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

-- 2. Update get_curr_user_role
CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Support both raw UUID and 'u_' prefixed UUID
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
