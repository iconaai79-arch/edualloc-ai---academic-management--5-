-- Migration: 394_add_saturday_sunday_hours_to_remedial_rate_settings.sql
-- Purpose: Add distinct Saturday and Sunday start/end hours to school_remedial_rate_settings

ALTER TABLE public.school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS saturday_start_time TEXT DEFAULT '08:00',
    ADD COLUMN IF NOT EXISTS saturday_end_time TEXT DEFAULT '12:00',
    ADD COLUMN IF NOT EXISTS sunday_start_time TEXT DEFAULT '09:00',
    ADD COLUMN IF NOT EXISTS sunday_end_time TEXT DEFAULT '13:00';

-- Backfill existing rows if they had legacy weekend_start_time / weekend_end_time
UPDATE public.school_remedial_rate_settings
SET 
    saturday_start_time = COALESCE(saturday_start_time, weekend_start_time, '08:00'),
    saturday_end_time = COALESCE(saturday_end_time, weekend_end_time, '12:00'),
    sunday_start_time = COALESCE(sunday_start_time, weekend_start_time, '09:00'),
    sunday_end_time = COALESCE(sunday_end_time, weekend_end_time, '13:00')
WHERE saturday_start_time IS NULL OR sunday_start_time IS NULL;
