-- Migration: 420_fix_set_users_updated_at_search_path.sql
-- Purpose: Fix role mutable search_path on public.set_users_updated_at function to resolve Supabase security advisor warning

CREATE OR REPLACE FUNCTION public.set_users_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

ALTER FUNCTION public.set_users_updated_at() SET search_path = public;

NOTIFY pgrst, 'reload schema';
