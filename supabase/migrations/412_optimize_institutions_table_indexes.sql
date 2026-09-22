-- Migration 412: Optimize institutions table indexes and query performance
-- Purpose: Eliminate statement timeouts on institutions table by adding targeted B-tree indexes
--          and ensuring unblocked read access for tenant lookup/bootstrap.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        -- Index on county_id for county admin oversight and filtering
        CREATE INDEX IF NOT EXISTS idx_institutions_county_id ON public.institutions(county_id);

        -- Index on status for active/trial institution filtering
        CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions(status);

        -- Index on institution_code for tenant discovery and onboarding lookup
        CREATE INDEX IF NOT EXISTS idx_institutions_code ON public.institutions(institution_code);

        -- Index on slug for branded custom domain / vanity URL lookup
        CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug) WHERE (slug IS NOT NULL AND slug <> '');

        -- Index on phone and email for login discovery and contact lookups
        CREATE INDEX IF NOT EXISTS idx_institutions_phone ON public.institutions(phone_number);
        CREATE INDEX IF NOT EXISTS idx_institutions_email ON public.institutions(email);

        -- Index on parent_institution_id for branch hierarchies
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'parent_institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_institutions_parent ON public.institutions(parent_institution_id);
        END IF;

        -- Index on created_at for chronological ordering
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'institutions' AND column_name = 'created_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_institutions_created_at ON public.institutions(created_at DESC);
        END IF;

        -- Ensure public read access policy is clean and active for tenant discovery
        IF EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' AND tablename = 'institutions' AND rowsecurity = true
        ) THEN
            DROP POLICY IF EXISTS "Allow anonymous read: institutions" ON public.institutions;
            CREATE POLICY "Allow anonymous read: institutions"
                ON public.institutions FOR SELECT
                TO anon, authenticated
                USING (true);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
