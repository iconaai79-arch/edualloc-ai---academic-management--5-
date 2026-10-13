-- Migration 475: Add Teacher Hourly Rates Schema
-- Purpose:
--   1. Allow Super Admin to configure individual hourly rates per teacher (weekday and weekend rates).
--   2. Add columns hourly_rate, weekday_hourly_rate, and weekend_hourly_rate to the public.users table.
--   3. Ensure public.school_remedial_rate_settings supports per-teacher overrides via teacher_preferences JSONB.
--   4. Ensure backwards compatibility: default is NULL (which falls back to the institution standard tariff).

-- 1. Add hourly rate columns to public.users table
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        ALTER TABLE public.users
            ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS weekday_hourly_rate NUMERIC DEFAULT NULL,
            ADD COLUMN IF NOT EXISTS weekend_hourly_rate NUMERIC DEFAULT NULL;
    END IF;
END $$;

-- 2. Ensure school_remedial_rate_settings exists and has teacher_preferences column
CREATE TABLE IF NOT EXISTS public.school_remedial_rate_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    hourly_rate NUMERIC DEFAULT 1000,
    weekday_hourly_rate NUMERIC DEFAULT 1000,
    weekend_hourly_rate NUMERIC DEFAULT 1500,
    weekday_duty_flat_rate NUMERIC DEFAULT 200,
    teacher_preferences JSONB DEFAULT '{}'::jsonb,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS weekday_hourly_rate NUMERIC DEFAULT 1000,
    ADD COLUMN IF NOT EXISTS weekend_hourly_rate NUMERIC DEFAULT 1500,
    ADD COLUMN IF NOT EXISTS weekday_duty_flat_rate NUMERIC DEFAULT 200,
    ADD COLUMN IF NOT EXISTS teacher_preferences JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 3. Comments explaining columns
COMMENT ON COLUMN public.users.hourly_rate IS 'Custom weekday/default hourly rate for this teacher/lecturer in KES/hr (configured by Super Admin)';
COMMENT ON COLUMN public.users.weekday_hourly_rate IS 'Custom weekday hourly rate override for this teacher/lecturer in KES/hr';
COMMENT ON COLUMN public.users.weekend_hourly_rate IS 'Custom weekend hourly rate override for this teacher/lecturer in KES/hr';
