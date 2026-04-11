-- Add missing category column to institutions table
-- This column is used for institutional sub-types (e.g., Family Heritage, Chama, etc.)
-- To be run in Supabase SQL Editor

ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS category TEXT;

COMMENT ON COLUMN public.institutions.category IS 'Institutional sub-type or niche (e.g., Primary, Secondary, Family Heritage, Chama)';
