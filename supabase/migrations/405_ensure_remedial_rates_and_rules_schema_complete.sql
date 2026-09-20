-- Migration: 405_ensure_remedial_rates_and_rules_schema_complete.sql
-- Purpose: Fully ensure school_remedial_rate_settings and school_remedial_subjects schemas
-- have all columns, JSONB metadata, day/period restrictions, timing windows, breaks, and RLS policies.

-- 1. SCHOOL REMEDIAL RATE SETTINGS
CREATE TABLE IF NOT EXISTS public.school_remedial_rate_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    hourly_rate NUMERIC DEFAULT 1000,
    weekday_hourly_rate NUMERIC DEFAULT 1000,
    weekend_hourly_rate NUMERIC DEFAULT 1500,
    weekday_duty_flat_rate NUMERIC DEFAULT 200,
    weekday_start_time TEXT DEFAULT '16:00',
    weekday_end_time TEXT DEFAULT '18:00',
    weekend_start_time TEXT DEFAULT '08:00',
    weekend_end_time TEXT DEFAULT '12:00',
    saturday_start_time TEXT DEFAULT '08:00',
    saturday_end_time TEXT DEFAULT '12:00',
    sunday_start_time TEXT DEFAULT '09:00',
    sunday_end_time TEXT DEFAULT '13:00',
    max_lessons_per_day INTEGER DEFAULT 1,
    max_weekend_lessons_per_day INTEGER DEFAULT 2,
    cancellation_cutoff_hours NUMERIC DEFAULT 3,
    confirmation_timeout_minutes NUMERIC DEFAULT 45,
    teacher_preferences JSONB DEFAULT '{}'::jsonb,
    weekend_break_start_time TEXT DEFAULT '10:00',
    weekend_break_end_time TEXT DEFAULT '10:30',
    weekend_break_label TEXT DEFAULT 'Tea & Refreshment Break',
    include_weekend_break BOOLEAN DEFAULT true,
    saturday_break_start_time TEXT DEFAULT '10:00',
    saturday_break_end_time TEXT DEFAULT '10:30',
    saturday_break_label TEXT DEFAULT 'Saturday Refreshment Break',
    include_saturday_break BOOLEAN DEFAULT true,
    sunday_break_start_time TEXT DEFAULT '11:00',
    sunday_break_end_time TEXT DEFAULT '11:30',
    sunday_break_label TEXT DEFAULT 'Sunday Recess Break',
    include_sunday_break BOOLEAN DEFAULT true,
    fee_per_student NUMERIC DEFAULT 200,
    term_fee NUMERIC DEFAULT 3000,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all extended columns exist on school_remedial_rate_settings
ALTER TABLE public.school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS weekday_hourly_rate NUMERIC DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS weekend_hourly_rate NUMERIC DEFAULT 1500,
    ADD COLUMN IF NOT EXISTS weekday_duty_flat_rate NUMERIC DEFAULT 200,
    ADD COLUMN IF NOT EXISTS weekday_start_time TEXT DEFAULT '16:00',
    ADD COLUMN IF NOT EXISTS weekday_end_time TEXT DEFAULT '18:00',
    ADD COLUMN IF NOT EXISTS weekend_start_time TEXT DEFAULT '08:00',
    ADD COLUMN IF NOT EXISTS weekend_end_time TEXT DEFAULT '12:00',
    ADD COLUMN IF NOT EXISTS saturday_start_time TEXT DEFAULT '08:00',
    ADD COLUMN IF NOT EXISTS saturday_end_time TEXT DEFAULT '12:00',
    ADD COLUMN IF NOT EXISTS sunday_start_time TEXT DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS sunday_end_time TEXT DEFAULT '13:00',
    ADD COLUMN IF NOT EXISTS max_lessons_per_day INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS max_weekend_lessons_per_day INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS cancellation_cutoff_hours NUMERIC DEFAULT 3,
    ADD COLUMN IF NOT EXISTS confirmation_timeout_minutes NUMERIC DEFAULT 45,
    ADD COLUMN IF NOT EXISTS teacher_preferences JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS weekend_break_start_time TEXT DEFAULT '10:00',
    ADD COLUMN IF NOT EXISTS weekend_break_end_time TEXT DEFAULT '10:30',
    ADD COLUMN IF NOT EXISTS weekend_break_label TEXT DEFAULT 'Tea & Refreshment Break',
    ADD COLUMN IF NOT EXISTS include_weekend_break BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS saturday_break_start_time TEXT DEFAULT '10:00',
    ADD COLUMN IF NOT EXISTS saturday_break_end_time TEXT DEFAULT '10:30',
    ADD COLUMN IF NOT EXISTS saturday_break_label TEXT DEFAULT 'Saturday Refreshment Break',
    ADD COLUMN IF NOT EXISTS include_saturday_break BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS sunday_break_start_time TEXT DEFAULT '11:00',
    ADD COLUMN IF NOT EXISTS sunday_break_end_time TEXT DEFAULT '11:30',
    ADD COLUMN IF NOT EXISTS sunday_break_label TEXT DEFAULT 'Sunday Recess Break',
    ADD COLUMN IF NOT EXISTS include_sunday_break BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS fee_per_student NUMERIC DEFAULT 200,
    ADD COLUMN IF NOT EXISTS term_fee NUMERIC DEFAULT 3000,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS and permissive policies for school_remedial_rate_settings
ALTER TABLE public.school_remedial_rate_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for school_remedial_rate_settings" ON public.school_remedial_rate_settings;
CREATE POLICY "Allow authenticated select for school_remedial_rate_settings" 
    ON public.school_remedial_rate_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update for school_remedial_rate_settings" ON public.school_remedial_rate_settings;
CREATE POLICY "Allow authenticated insert/update for school_remedial_rate_settings" 
    ON public.school_remedial_rate_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all for school_remedial_rate_settings" ON public.school_remedial_rate_settings;
CREATE POLICY "Allow anon all for school_remedial_rate_settings" 
    ON public.school_remedial_rate_settings FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.school_remedial_rate_settings TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_school_remedial_rate_settings_inst 
    ON public.school_remedial_rate_settings (institution_id);


-- 2. SCHOOL REMEDIAL SUBJECTS (RULES, OCCURRENCES, DAY/PERIOD RESTRICTIONS)
CREATE TABLE IF NOT EXISTS public.school_remedial_subjects (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority TEXT DEFAULT 'Medium',
    weekly_occurrences INTEGER DEFAULT 1,
    preferred_day_type TEXT DEFAULT 'any',
    allowed_days JSONB DEFAULT '[]'::jsonb,
    allowed_periods JSONB DEFAULT '[]'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all extended columns exist on school_remedial_subjects
ALTER TABLE public.school_remedial_subjects
    ADD COLUMN IF NOT EXISTS subject_id TEXT,
    ADD COLUMN IF NOT EXISTS subject_name TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS weekly_occurrences INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS preferred_day_type TEXT DEFAULT 'any',
    ADD COLUMN IF NOT EXISTS allowed_days JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS allowed_periods JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS and permissive policies for school_remedial_subjects
ALTER TABLE public.school_remedial_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for school_remedial_subjects" ON public.school_remedial_subjects;
CREATE POLICY "Allow authenticated select for school_remedial_subjects" 
    ON public.school_remedial_subjects FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update for school_remedial_subjects" ON public.school_remedial_subjects;
CREATE POLICY "Allow authenticated insert/update for school_remedial_subjects" 
    ON public.school_remedial_subjects FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all for school_remedial_subjects" ON public.school_remedial_subjects;
CREATE POLICY "Allow anon all for school_remedial_subjects" 
    ON public.school_remedial_subjects FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.school_remedial_subjects TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_school_remedial_subjects_inst 
    ON public.school_remedial_subjects (institution_id);

CREATE INDEX IF NOT EXISTS idx_school_remedial_subjects_inst_sub 
    ON public.school_remedial_subjects (institution_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_school_remedial_subjects_active 
    ON public.school_remedial_subjects (institution_id, is_active);

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
