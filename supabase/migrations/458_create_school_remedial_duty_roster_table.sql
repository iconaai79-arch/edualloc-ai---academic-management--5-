-- Migration 458: Create school_remedial_duty_roster table
-- Description: Creates the school_remedial_duty_roster table to persist Teachers on Duty (TOD) 
--              records across all browsers, devices, and sessions, with complete column support,
--              indexes for fast tenant lookups, and permissive RLS policies.

CREATE TABLE IF NOT EXISTS public.school_remedial_duty_roster (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    term TEXT,
    week_number TEXT,
    week_label TEXT,
    year TEXT,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    teacher_code TEXT,
    course_id TEXT,
    class_name TEXT,
    subject_id TEXT,
    subject_name TEXT,
    stream TEXT,
    saturday_start_time TEXT,
    saturday_end_time TEXT,
    sunday_start_time TEXT,
    sunday_end_time TEXT,
    saturday_allocated BOOLEAN DEFAULT false,
    sunday_allocated BOOLEAN DEFAULT false,
    auto_allocated_saturday BOOLEAN DEFAULT false,
    auto_allocated_sunday BOOLEAN DEFAULT false,
    saturday_session_id TEXT,
    sunday_session_id TEXT,
    duty_type TEXT DEFAULT 'weekend',
    weekday_day TEXT,
    weekday_start_time TEXT,
    weekday_end_time TEXT,
    weekday_allocated BOOLEAN DEFAULT false,
    weekday_session_id TEXT,
    duty_pay_rate NUMERIC DEFAULT 0,
    duty_pay_type TEXT DEFAULT 'flat',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist if table was already partially created
DO $$
BEGIN
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS term TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS week_number TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS week_label TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS year TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS teacher_code TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS course_id TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS class_name TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS subject_id TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS subject_name TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS stream TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS saturday_start_time TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS saturday_end_time TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS sunday_start_time TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS sunday_end_time TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS saturday_allocated BOOLEAN DEFAULT false;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS sunday_allocated BOOLEAN DEFAULT false;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS auto_allocated_saturday BOOLEAN DEFAULT false;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS auto_allocated_sunday BOOLEAN DEFAULT false;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS saturday_session_id TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS sunday_session_id TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS duty_type TEXT DEFAULT 'weekend';
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS weekday_day TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS weekday_start_time TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS weekday_end_time TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS weekday_allocated BOOLEAN DEFAULT false;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS weekday_session_id TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS duty_pay_rate NUMERIC DEFAULT 0;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS duty_pay_type TEXT DEFAULT 'flat';
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- Indexes for ultra-fast querying by institution, teacher, and week
CREATE INDEX IF NOT EXISTS idx_remedial_duty_institution_id ON public.school_remedial_duty_roster (institution_id);
CREATE INDEX IF NOT EXISTS idx_remedial_duty_teacher_id ON public.school_remedial_duty_roster (teacher_id);
CREATE INDEX IF NOT EXISTS idx_remedial_duty_week_label ON public.school_remedial_duty_roster (institution_id, week_label);
CREATE INDEX IF NOT EXISTS idx_remedial_duty_duty_type ON public.school_remedial_duty_roster (institution_id, duty_type);

-- Enable RLS and establish policies
ALTER TABLE public.school_remedial_duty_roster ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_remedial_duty_roster_select" ON public.school_remedial_duty_roster;
DROP POLICY IF EXISTS "school_remedial_duty_roster_insert" ON public.school_remedial_duty_roster;
DROP POLICY IF EXISTS "school_remedial_duty_roster_update" ON public.school_remedial_duty_roster;
DROP POLICY IF EXISTS "school_remedial_duty_roster_delete" ON public.school_remedial_duty_roster;
DROP POLICY IF EXISTS "school_remedial_duty_roster_all" ON public.school_remedial_duty_roster;

CREATE POLICY "school_remedial_duty_roster_all" ON public.school_remedial_duty_roster
    FOR ALL TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.school_remedial_duty_roster TO anon, authenticated, service_role;

-- Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
