-- ============================================================
-- Migration 323: Convert observation_notes and related table columns from UUID to TEXT
-- Resolves PostgreSQL 22P02: invalid input syntax for type uuid (e.g., "inst_...", "obs_...")
-- ============================================================

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.observation_notes (
    id TEXT PRIMARY KEY,
    timetable_entry_id TEXT,
    practice_teacher_id TEXT,
    lecturer_id TEXT,
    notes TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    institution_id TEXT NOT NULL
);

-- 2. Safely alter column types to TEXT if they exist as UUID
DO $$ 
BEGIN
    -- observation_notes
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'observation_notes' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.observation_notes ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.observation_notes ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'observation_notes' AND column_name = 'institution_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.observation_notes ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'observation_notes' AND column_name = 'timetable_entry_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.observation_notes ALTER COLUMN timetable_entry_id TYPE TEXT USING timetable_entry_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'observation_notes' AND column_name = 'practice_teacher_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.observation_notes ALTER COLUMN practice_teacher_id TYPE TEXT USING practice_teacher_id::text;
    END IF;

    -- Add missing columns if needed
    ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS lecturer_id TEXT;
    ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS "lecturerId" TEXT;
    ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS "timetableEntryId" TEXT;
    ALTER TABLE public.observation_notes ADD COLUMN IF NOT EXISTS "practiceTeacherId" TEXT;

    -- 3. Also fix fee_promises if existing with UUID columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fee_promises' AND column_name = 'institution_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.fee_promises ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fee_promises' AND column_name = 'student_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.fee_promises ALTER COLUMN student_id TYPE TEXT USING student_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'fee_promises' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.fee_promises ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.fee_promises ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- 4. Also fix school_intel_submissions if existing with UUID columns
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'school_intel_submissions' AND column_name = 'institution_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.school_intel_submissions ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'school_intel_submissions' AND column_name = 'id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.school_intel_submissions ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.school_intel_submissions ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    -- 5. Fix library tables if existing with UUID columns
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library_fines'
    ) THEN
        ALTER TABLE public.library_fines ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_reservations'
    ) THEN
        ALTER TABLE public.book_reservations ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'book_stock_receipts'
    ) THEN
        ALTER TABLE public.book_stock_receipts ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'library_settings'
    ) THEN
        ALTER TABLE public.library_settings ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

END $$;

-- 6. Enable RLS and Permissive Policies
ALTER TABLE public.observation_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.observation_notes;
DROP POLICY IF EXISTS "Allow all access on observation_notes" ON public.observation_notes;

CREATE POLICY "Allow all access on observation_notes" ON public.observation_notes
    FOR ALL USING (true) WITH CHECK (true);

-- Explicit Grants
GRANT ALL ON public.observation_notes TO anon, authenticated, service_role;
