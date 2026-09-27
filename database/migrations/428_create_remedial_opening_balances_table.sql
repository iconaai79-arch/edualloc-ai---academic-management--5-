-- Migration 428: Create school_remedial_opening_balances table
-- Purpose: Store teacher remedial opening balances (arrears brought forward B/F and advances)
-- Supports bulk Excel upload and single manual entry workflows.
-- Table is used by the RemedialOpeningBalancesModal component.

DO $$
BEGIN
    -- 1. Create table if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'school_remedial_opening_balances'
    ) THEN
        CREATE TABLE public.school_remedial_opening_balances (
            id                  TEXT PRIMARY KEY,
            institution_id      TEXT NOT NULL,
            "institutionId"     TEXT,

            -- Teacher reference
            teacher_id          TEXT NOT NULL,
            "teacherId"         TEXT,
            teacher_name        TEXT NOT NULL DEFAULT '',
            "teacherName"       TEXT,
            teacher_code        TEXT DEFAULT '',
            "teacherCode"       TEXT,

            -- Balance details
            amount              NUMERIC(15,2) NOT NULL DEFAULT 0.00,
            balance_type        TEXT NOT NULL DEFAULT 'payable',  -- 'payable' | 'advance'
            "balanceType"       TEXT,

            -- Period
            term                TEXT DEFAULT '',                  -- e.g. "2026 Term 3"
            academic_year       TEXT DEFAULT '',
            "academicYear"      TEXT,
            as_of_date          DATE,
            "asOfDate"          TEXT,

            -- Audit / tracking
            reference           TEXT,
            notes               TEXT,
            status              TEXT DEFAULT 'active',            -- 'active' | 'cleared' | 'adjusted'
            uploaded_by         TEXT,
            "uploadedBy"        TEXT,
            uploaded_at         TIMESTAMPTZ DEFAULT NOW(),
            "uploadedAt"        TEXT,

            -- Metadata (for flexible fields)
            metadata            JSONB DEFAULT '{}',

            -- Timestamps
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );

        -- Enable Row Level Security
        ALTER TABLE public.school_remedial_opening_balances ENABLE ROW LEVEL SECURITY;

        -- Permissive policy (tenant auth is enforced at application layer)
        DROP POLICY IF EXISTS "remedial_opening_balances_all" ON public.school_remedial_opening_balances;
        CREATE POLICY "remedial_opening_balances_all"
            ON public.school_remedial_opening_balances
            FOR ALL
            USING (true)
            WITH CHECK (true);

        -- Grant permissions
        GRANT ALL ON public.school_remedial_opening_balances TO anon, authenticated, service_role;

        RAISE NOTICE 'Created table: school_remedial_opening_balances';
    ELSE
        RAISE NOTICE 'Table school_remedial_opening_balances already exists — skipping creation.';
    END IF;

    -- 2. Indexes for performance
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'school_remedial_opening_balances'
    ) THEN
        -- Primary tenancy index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'school_remedial_opening_balances'
              AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_rem_ob_institution
                ON public.school_remedial_opening_balances (institution_id);

            CREATE INDEX IF NOT EXISTS idx_rem_ob_inst_status
                ON public.school_remedial_opening_balances (institution_id, status);

            CREATE INDEX IF NOT EXISTS idx_rem_ob_inst_created
                ON public.school_remedial_opening_balances (institution_id, created_at DESC);
        END IF;

        -- Teacher lookup index (for per-teacher balance lookups)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'school_remedial_opening_balances'
              AND column_name = 'teacher_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_rem_ob_teacher
                ON public.school_remedial_opening_balances (teacher_id);

            CREATE INDEX IF NOT EXISTS idx_rem_ob_inst_teacher
                ON public.school_remedial_opening_balances (institution_id, teacher_id);
        END IF;

        -- Status index (for filtering active vs cleared records)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'school_remedial_opening_balances'
              AND column_name = 'status'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_rem_ob_status
                ON public.school_remedial_opening_balances (status);
        END IF;

        -- Balance type index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public'
              AND table_name = 'school_remedial_opening_balances'
              AND column_name = 'balance_type'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_rem_ob_balance_type
                ON public.school_remedial_opening_balances (balance_type);
        END IF;

        RAISE NOTICE 'Indexes created/verified for school_remedial_opening_balances';
    END IF;

END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
