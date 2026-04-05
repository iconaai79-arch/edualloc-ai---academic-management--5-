-- Migration: Add slug column to institutions
-- Purpose: Support human-readable custom URLs for tenant storefronts

ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS slug TEXT;

-- Create a unique index for fast lookups and to prevent duplicate slugs
CREATE UNIQUE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions (slug) WHERE slug IS NOT NULL;

-- Enable RLS for public-facing basic information if not already done
-- (Most institution profiles are readable by authenticated users, but storefronts are public)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'institutions' AND policyname = 'Allow public read access for basic fields'
    ) THEN
        CREATE POLICY "Allow public read access for basic fields" ON public.institutions
            FOR SELECT USING (true);
    END IF;
END $$;

COMMENT ON COLUMN public.institutions.slug IS 'Unique human-readable identifier for tenant storefronts';
