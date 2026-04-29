
-- Migration 194: Dynamic Theme Preferences
-- This migration adds support for user-defined theme preferences (Auto/Light/Dark).

ALTER TABLE public.alumnae_members 
ADD COLUMN IF NOT EXISTS theme_preference TEXT DEFAULT 'auto';

-- Add comment for documentation
COMMENT ON COLUMN public.alumnae_members.theme_preference IS 'User theme preference: auto (time-based), light, or dark.';
