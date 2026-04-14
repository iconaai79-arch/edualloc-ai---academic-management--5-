-- 169_add_political_codes.sql
-- Add missing code columns to constituencies and wards if they don't exist

ALTER TABLE IF EXISTS public.constituencies ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE IF EXISTS public.wards ADD COLUMN IF NOT EXISTS code TEXT;

-- Refresh schema cache reminder:
-- If you are using PostgREST/Supabase, you may need to reload the schema cache.
