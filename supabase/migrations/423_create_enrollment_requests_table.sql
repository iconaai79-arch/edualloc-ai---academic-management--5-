-- Migration 423: Create enrollment_requests table (permanent watchdog fix)
-- Purpose: The enrollment_requests table was referenced by the API and RLS
--          unblock scripts (067, 100, 294, etc.) but had NO CREATE TABLE
--          migration. PostgREST therefore could not resolve it, causing it
--          to hang until the 18-second api/records watchdog fired.
--          This migration:
--            1. Creates the table if it does not yet exist.
--            2. Adds a composite index on (institution_id, id DESC) so the
--               GET query uses the index rather than a full sequential scan.
--            3. Applies permissive RLS + full grants (matching the strategy
--               used by leave_out_requests and similar tables).
--            4. Issues NOTIFY pgrst, 'reload schema' so PostgREST picks up
--               the table immediately without a pod restart.

DO $$
BEGIN
    -- ─────────────────────────────────────────────────────────────────────
    -- 1. Create enrollment_requests if missing
    -- ─────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'enrollment_requests'
    ) THEN
        CREATE TABLE public.enrollment_requests (
            id                  TEXT        PRIMARY KEY,
            institution_id      TEXT        NOT NULL,
            "institutionId"     TEXT,                           -- camelCase alias kept for legacy clients
            student_id          TEXT,
            "studentId"         TEXT,
            student_name        TEXT,
            admission_number    TEXT,
            class               TEXT,
            stream              TEXT,
            grade               TEXT,
            request_type        TEXT        DEFAULT 'new_enrollment',
            status              TEXT        DEFAULT 'pending',  -- pending | approved | rejected | withdrawn
            requested_by        TEXT,                          -- user id of requester
            reviewed_by         TEXT,
            review_note         TEXT,
            academic_year       TEXT,
            term                TEXT,
            metadata            JSONB       DEFAULT '{}'::jsonb,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            "createdAt"         TEXT,
            updated_at          TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt"         TEXT
        );

        RAISE NOTICE 'Created table public.enrollment_requests';
    ELSE
        RAISE NOTICE 'Table public.enrollment_requests already exists — skipping CREATE.';
    END IF;

    -- ─────────────────────────────────────────────────────────────────────
    -- 2. Ensure institution_id column exists (for pre-existing tables
    --    that may have been created with a different schema)
    -- ─────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'enrollment_requests'
          AND column_name  = 'institution_id'
    ) THEN
        ALTER TABLE public.enrollment_requests ADD COLUMN institution_id TEXT;
        RAISE NOTICE 'Added institution_id column to enrollment_requests';
    END IF;

    -- ─────────────────────────────────────────────────────────────────────
    -- 3. Indexes — the composite index makes GET ?institution_id=X instant
    -- ─────────────────────────────────────────────────────────────────────
    CREATE INDEX IF NOT EXISTS idx_enrollment_requests_institution
        ON public.enrollment_requests (institution_id);

    CREATE INDEX IF NOT EXISTS idx_enrollment_requests_inst_id_desc
        ON public.enrollment_requests (institution_id, id DESC);

    CREATE INDEX IF NOT EXISTS idx_enrollment_requests_status
        ON public.enrollment_requests (institution_id, status);

    -- ─────────────────────────────────────────────────────────────────────
    -- 4. RLS + grants (permissive — same strategy as leave_out_requests)
    -- ─────────────────────────────────────────────────────────────────────
    ALTER TABLE public.enrollment_requests ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "enrollment_requests_master_unblock" ON public.enrollment_requests;
    CREATE POLICY "enrollment_requests_master_unblock"
        ON public.enrollment_requests
        FOR ALL
        USING (true)
        WITH CHECK (true);

    GRANT ALL ON public.enrollment_requests TO anon, authenticated, service_role;

END $$;

-- Tell PostgREST to reload its schema cache immediately
NOTIFY pgrst, 'reload schema';
