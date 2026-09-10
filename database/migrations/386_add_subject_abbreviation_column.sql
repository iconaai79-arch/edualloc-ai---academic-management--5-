-- Migration 386: Add abbreviation column to public.subjects table
-- Description: Supports custom subject abbreviations (e.g., 'SS', 'ENG', 'MATH', 'SCI') alongside codes and short names.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'subjects') THEN
        -- 1. Add abbreviation and short_name columns
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS abbreviation TEXT;
        ALTER TABLE public.subjects ADD COLUMN IF NOT EXISTS short_name TEXT;

        -- 2. Populate abbreviation from short_name or code if null
        UPDATE public.subjects 
        SET abbreviation = COALESCE(short_name, code)
        WHERE abbreviation IS NULL OR TRIM(abbreviation) = '';

        -- 3. Also synchronize short_name if null
        UPDATE public.subjects 
        SET short_name = abbreviation
        WHERE short_name IS NULL OR TRIM(short_name) = '';
    END IF;
END $$;

-- 4. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
