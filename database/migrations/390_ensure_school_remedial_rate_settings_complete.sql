-- Migration: 390_ensure_school_remedial_rate_settings_complete.sql
-- Purpose: Fully ensure school_remedial_rate_settings schema includes all columns, metadata, and teacher preferences.

CREATE TABLE IF NOT EXISTS public.school_remedial_rate_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    hourly_rate NUMERIC DEFAULT 1000,
    weekday_hourly_rate NUMERIC DEFAULT 1000,
    weekend_hourly_rate NUMERIC DEFAULT 1500,
    weekday_start_time TEXT DEFAULT '16:00',
    weekday_end_time TEXT DEFAULT '18:00',
    weekend_start_time TEXT DEFAULT '08:00',
    weekend_end_time TEXT DEFAULT '12:00',
    max_lessons_per_day INTEGER DEFAULT 1,
    fee_per_student NUMERIC DEFAULT 200,
    term_fee NUMERIC DEFAULT 3000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all extended columns exist
ALTER TABLE public.school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS weekday_hourly_rate NUMERIC DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS weekend_hourly_rate NUMERIC DEFAULT 1500,
    ADD COLUMN IF NOT EXISTS weekday_start_time TEXT DEFAULT '16:00',
    ADD COLUMN IF NOT EXISTS weekday_end_time TEXT DEFAULT '18:00',
    ADD COLUMN IF NOT EXISTS weekend_start_time TEXT DEFAULT '08:00',
    ADD COLUMN IF NOT EXISTS weekend_end_time TEXT DEFAULT '12:00',
    ADD COLUMN IF NOT EXISTS max_lessons_per_day INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS max_weekend_lessons_per_day INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS cancellation_cutoff_hours NUMERIC DEFAULT 3,
    ADD COLUMN IF NOT EXISTS confirmation_timeout_minutes NUMERIC DEFAULT 45,
    ADD COLUMN IF NOT EXISTS teacher_preferences JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS weekend_break_start_time TEXT DEFAULT '10:00',
    ADD COLUMN IF NOT EXISTS weekend_break_end_time TEXT DEFAULT '10:30',
    ADD COLUMN IF NOT EXISTS weekend_break_label TEXT DEFAULT 'Tea & Refreshment Break',
    ADD COLUMN IF NOT EXISTS include_weekend_break BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS fee_per_student NUMERIC DEFAULT 200,
    ADD COLUMN IF NOT EXISTS term_fee NUMERIC DEFAULT 3000,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS and permissive policies
ALTER TABLE public.school_remedial_rate_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for school_remedial_rate_settings" ON public.school_remedial_rate_settings;
CREATE POLICY "Allow authenticated select for school_remedial_rate_settings" 
    ON public.school_remedial_rate_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update for school_remedial_rate_settings" ON public.school_remedial_rate_settings;
CREATE POLICY "Allow authenticated insert/update for school_remedial_rate_settings" 
    ON public.school_remedial_rate_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Allow public/anon access if used with anon key
DROP POLICY IF EXISTS "Allow anon all for school_remedial_rate_settings" ON public.school_remedial_rate_settings;
CREATE POLICY "Allow anon all for school_remedial_rate_settings" 
    ON public.school_remedial_rate_settings FOR ALL TO anon USING (true) WITH CHECK (true);

-- Ensure table permissions for all roles
GRANT ALL ON TABLE public.school_remedial_rate_settings TO anon, authenticated, service_role;

-- Create index on institution_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_school_remedial_rate_settings_inst 
    ON public.school_remedial_rate_settings (institution_id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
