-- 169_add_political_codes.sql
-- Add missing code and voter demographic columns to political tables
ALTER TABLE IF EXISTS public.constituencies ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE IF EXISTS public.wards ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE IF EXISTS public.wards ADD COLUMN IF NOT EXISTS registered_voters INTEGER DEFAULT 0;
ALTER TABLE IF EXISTS public.wards ADD COLUMN IF NOT EXISTS election_year INTEGER;
