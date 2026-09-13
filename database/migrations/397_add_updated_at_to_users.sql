-- Migration: 397_add_updated_at_to_users.sql
-- Purpose: Add updated_at column to users table if not exists and reload PostgREST schema cache

ALTER TABLE IF EXISTS public.users
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN public.users.updated_at IS 'Timestamp of the last profile or record update';

-- Trigger to automatically maintain updated_at timestamp on updates
CREATE OR REPLACE FUNCTION public.set_users_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.set_users_updated_at();

NOTIFY pgrst, 'reload schema';
