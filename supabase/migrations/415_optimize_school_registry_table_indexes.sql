-- Migration 415: Optimize school_registry table indexes
-- Purpose: Accelerate nationwide school_registry lookups, eliminate PostgREST statement timeouts,
-- and provide high-performance B-tree index coverage for id, knec_code, county, and search queries.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_registry') THEN
        -- 1. Index on id (primary key or fast ordering)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_registry' AND column_name = 'id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_registry_id ON public.school_registry (id);
        END IF;

        -- 2. Index on knec_code
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_registry' AND column_name = 'knec_code'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_registry_knec_code ON public.school_registry (knec_code);
        END IF;

        -- 3. Index on county (or county_id if present)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_registry' AND column_name = 'county'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_registry_county ON public.school_registry (county);
        ELSIF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_registry' AND column_name = 'county_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_registry_county_id ON public.school_registry (county_id);
        END IF;

        -- 4. Index on slug
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_registry' AND column_name = 'slug'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_registry_slug ON public.school_registry (slug);
        END IF;

        -- 5. Index on name for search
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_registry' AND column_name = 'name'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_registry_name ON public.school_registry (name);
        END IF;

        -- 6. Index on uic
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_registry' AND column_name = 'uic'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_registry_uic ON public.school_registry (uic);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
