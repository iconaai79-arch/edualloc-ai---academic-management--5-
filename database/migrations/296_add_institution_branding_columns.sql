-- Migration 296: Add branding/letterhead columns to the institutions table
-- These columns are required by the SettingsManager upload handlers for logo,
-- letterhead, and footer image. Without them, uploads succeed but the URLs
-- are silently stripped when saving the institution record.

ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS logo_url TEXT;

ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS footer_image_url TEXT;

ALTER TABLE public.institutions
    ADD COLUMN IF NOT EXISTS letterhead_config JSONB DEFAULT '{}'::jsonb;

-- Ensure existing institutions have a non-null letterhead_config
UPDATE public.institutions
SET letterhead_config = '{}'::jsonb
WHERE letterhead_config IS NULL;
