-- Migration: 470_add_town_to_pm_properties
-- Description: Adds 'town' column to pm_properties to align with PMProperty interface and avoid PostgREST schema cache retries.

ALTER TABLE IF EXISTS public.pm_properties 
ADD COLUMN IF NOT EXISTS town TEXT;

-- Reload schema cache in PostgREST
NOTIFY pgrst, 'reload schema';
