-- Migration: 384_add_weekend_break_to_remedial_settings.sql
-- Description: Add weekend break timing and label to remedial settings for printable timetable

ALTER TABLE IF EXISTS public.school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS weekend_break_start_time TEXT DEFAULT '10:00',
    ADD COLUMN IF NOT EXISTS weekend_break_end_time TEXT DEFAULT '10:30',
    ADD COLUMN IF NOT EXISTS weekend_break_label TEXT DEFAULT 'Tea & Refreshment Break',
    ADD COLUMN IF NOT EXISTS include_weekend_break BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.school_remedial_rate_settings.weekend_break_start_time IS 'Start time for weekend break interval (e.g., 10:00).';
COMMENT ON COLUMN public.school_remedial_rate_settings.weekend_break_end_time IS 'End time for weekend break interval (e.g., 10:30).';
COMMENT ON COLUMN public.school_remedial_rate_settings.weekend_break_label IS 'Label displayed for weekend break on timetable (e.g., Tea & Refreshment Break).';
COMMENT ON COLUMN public.school_remedial_rate_settings.include_weekend_break IS 'Whether to include printable break intervals on weekend timetables.';

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
