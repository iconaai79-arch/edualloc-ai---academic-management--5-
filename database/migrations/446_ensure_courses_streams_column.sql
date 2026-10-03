-- Migration 446: Ensure courses table supports streams column, valid JSONB levels, and tenant indexing
-- Guarantees that grades and streams created in Finance/Academics are persisted online in Supabase PostgreSQL

DO $$
BEGIN
    -- 1. Ensure streams JSONB column exists on public.courses
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'courses') THEN
        ALTER TABLE public.courses 
        ADD COLUMN IF NOT EXISTS streams JSONB DEFAULT '[]'::jsonb;

        -- 2. Ensure levels defaults to empty JSONB array
        ALTER TABLE public.courses 
        ALTER COLUMN levels SET DEFAULT '[]'::jsonb;

        -- 3. Populate streams from levels if streams is empty/null but levels has entries
        UPDATE public.courses
        SET streams = (
            SELECT COALESCE(jsonb_agg(elem->>'name'), '[]'::jsonb)
            FROM jsonb_array_elements(levels) AS elem
            WHERE elem->>'name' IS NOT NULL AND elem->>'name' <> ''
        )
        WHERE (streams IS NULL OR streams = '[]'::jsonb) AND levels IS NOT NULL AND levels <> '[]'::jsonb;

        -- 4. Fast tenant index for courses
        CREATE INDEX IF NOT EXISTS idx_courses_institution_id 
        ON public.courses(institution_id);
    END IF;
END $$;
