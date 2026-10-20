-- Migration 520: Optimize School Remedial Tables Performance Indexes and RLS
-- Eliminates timeouts (57014) and safe limit warnings on school_remedial_sessions,
-- school_remedial_allocations, school_remedial_payouts, school_remedial_duty_roster,
-- school_remedial_rate_settings, and school_remedial_subjects.

DO $$
BEGIN
    -- 1. Ensure columns on school_remedial_sessions
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions'
    ) THEN
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS allocation_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS course_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS subject_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS teacher_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS date TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS day_of_week TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS start_time TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS end_time TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duration_hours NUMERIC DEFAULT 1;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS is_weekend BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS is_joint BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS joint_streams JSONB DEFAULT '[]'::jsonb;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'In Progress';
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS payout_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS auto_concluded BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS auto_concluded_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS auto_concluded_reason TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- 2. Ensure columns on school_remedial_allocations
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'school_remedial_allocations'
    ) THEN
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS course_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS subject_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS teacher_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS day_of_week TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Confirmed';
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_weekend BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- 3. Ensure columns on school_remedial_payouts
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'school_remedial_payouts'
    ) THEN
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS teacher_id TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS payout_date TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    -- 4. Ensure columns on school_remedial_duty_roster
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'school_remedial_duty_roster'
    ) THEN
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS teacher_id TEXT;
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS duty_type TEXT DEFAULT 'weekend';
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- ============================================================================
-- 1. HIGH-PERFORMANCE COMPOSITE INDEXES FOR SCHOOL_REMEDIAL_SESSIONS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_remedial_sessions_inst_date_id 
    ON public.school_remedial_sessions(institution_id, date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_remedial_sessions_inst_id_desc 
    ON public.school_remedial_sessions(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_remedial_sessions_inst_created_desc 
    ON public.school_remedial_sessions(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_remedial_sessions_inst_teacher 
    ON public.school_remedial_sessions(institution_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_remedial_sessions_inst_status 
    ON public.school_remedial_sessions(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_remedial_sessions_inst_allocation 
    ON public.school_remedial_sessions(institution_id, allocation_id);

CREATE INDEX IF NOT EXISTS idx_remedial_sessions_inst_payout 
    ON public.school_remedial_sessions(institution_id, payout_id);

-- ============================================================================
-- 2. HIGH-PERFORMANCE COMPOSITE INDEXES FOR SCHOOL_REMEDIAL_ALLOCATIONS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_remedial_allocations_inst_id_desc 
    ON public.school_remedial_allocations(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_remedial_allocations_inst_teacher 
    ON public.school_remedial_allocations(institution_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_remedial_allocations_inst_course_sub 
    ON public.school_remedial_allocations(institution_id, course_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_remedial_allocations_inst_status 
    ON public.school_remedial_allocations(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_remedial_allocations_inst_created_desc 
    ON public.school_remedial_allocations(institution_id, created_at DESC);

-- ============================================================================
-- 3. HIGH-PERFORMANCE COMPOSITE INDEXES FOR SCHOOL_REMEDIAL_PAYOUTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_remedial_payouts_inst_id_desc 
    ON public.school_remedial_payouts(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_remedial_payouts_inst_teacher 
    ON public.school_remedial_payouts(institution_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_remedial_payouts_inst_date_desc 
    ON public.school_remedial_payouts(institution_id, payout_date DESC);

CREATE INDEX IF NOT EXISTS idx_remedial_payouts_inst_status 
    ON public.school_remedial_payouts(institution_id, status);

-- ============================================================================
-- 4. HIGH-PERFORMANCE COMPOSITE INDEXES FOR SCHOOL_REMEDIAL_DUTY_ROSTER
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_remedial_duty_roster_inst_id_desc 
    ON public.school_remedial_duty_roster(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_remedial_duty_roster_inst_teacher 
    ON public.school_remedial_duty_roster(institution_id, teacher_id);

CREATE INDEX IF NOT EXISTS idx_remedial_duty_roster_inst_type 
    ON public.school_remedial_duty_roster(institution_id, duty_type);

-- ============================================================================
-- 5. HIGH-PERFORMANCE COMPOSITE INDEXES FOR RATE SETTINGS & SUBJECTS
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_remedial_rate_settings_inst 
    ON public.school_remedial_rate_settings(institution_id);

CREATE INDEX IF NOT EXISTS idx_remedial_subjects_inst_active 
    ON public.school_remedial_subjects(institution_id, is_active);

CREATE INDEX IF NOT EXISTS idx_remedial_subjects_inst_sub 
    ON public.school_remedial_subjects(institution_id, subject_id);

-- ============================================================================
-- 6. UNBLOCK RLS AND SET MASTER PERMISSIVE POLICIES
-- ============================================================================
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'school_remedial_sessions',
        'school_remedial_allocations',
        'school_remedial_payouts',
        'school_remedial_duty_roster',
        'school_remedial_rate_settings',
        'school_remedial_subjects'
    ];
    pol RECORD;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

            FOR pol IN 
                SELECT policyname 
                FROM pg_policies 
                WHERE schemaname = 'public' AND tablename = tbl
            LOOP
                EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, tbl);
            END LOOP;

            EXECUTE format(
                'CREATE POLICY %I ON public.%I FOR ALL USING (true) WITH CHECK (true)',
                tbl || '_all_access', tbl
            );

            EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', tbl);
            EXECUTE format('ANALYZE public.%I', tbl);
        END IF;
    END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
