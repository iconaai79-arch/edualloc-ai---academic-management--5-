-- Migration: Ensure timetable_settings and exam_timetable_settings exist in DB schema
-- Path: database/migrations/465_create_timetable_settings_table.sql
-- Description: Ensures JSONB columns exist on institutions and creates timetable_settings / exam_timetable_settings tables

-- 1. Ensure JSONB columns exist on institutions table
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS timetable_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS exam_timetable_settings JSONB DEFAULT '{}'::jsonb;

-- 2. Create standalone timetable_settings table
CREATE TABLE IF NOT EXISTS public.timetable_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    operating_days JSONB DEFAULT '["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]'::jsonb,
    start_time TEXT DEFAULT '08:00',
    end_time TEXT DEFAULT '17:00',
    periods JSONB DEFAULT '[]'::jsonb,
    period_length_minutes INTEGER DEFAULT 40,
    cell_span_minutes INTEGER DEFAULT 40,
    max_periods_per_day INTEGER DEFAULT 9,
    min_weekly_periods INTEGER DEFAULT 10,
    max_weekly_periods INTEGER DEFAULT 35,
    breaks JSONB DEFAULT '[]'::jsonb,
    constraints JSONB DEFAULT '[]'::jsonb,
    teacher_rules JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create standalone exam_timetable_settings table
CREATE TABLE IF NOT EXISTS public.exam_timetable_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    sessions_per_day JSONB DEFAULT '[]'::jsonb,
    rules JSONB DEFAULT '[]'::jsonb,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS and setup open access policies
ALTER TABLE public.timetable_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_timetable_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow all on timetable_settings" ON public.timetable_settings;
    CREATE POLICY "Allow all on timetable_settings" ON public.timetable_settings FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Allow all on exam_timetable_settings" ON public.exam_timetable_settings;
    CREATE POLICY "Allow all on exam_timetable_settings" ON public.exam_timetable_settings FOR ALL USING (true) WITH CHECK (true);
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
