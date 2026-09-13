-- Migration: 395_add_saturday_sunday_breaks_to_remedial_rate_settings.sql
-- Purpose: Add distinct Saturday and Sunday break configuration (start/end time, label, inclusion toggle) to school_remedial_rate_settings

ALTER TABLE public.school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS include_saturday_break BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS saturday_break_start_time TEXT DEFAULT '10:00',
    ADD COLUMN IF NOT EXISTS saturday_break_end_time TEXT DEFAULT '10:30',
    ADD COLUMN IF NOT EXISTS saturday_break_label TEXT DEFAULT 'Saturday Refreshment Break',
    ADD COLUMN IF NOT EXISTS include_sunday_break BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS sunday_break_start_time TEXT DEFAULT '11:00',
    ADD COLUMN IF NOT EXISTS sunday_break_end_time TEXT DEFAULT '11:30',
    ADD COLUMN IF NOT EXISTS sunday_break_label TEXT DEFAULT 'Sunday Recess Break';

-- Backfill existing records from legacy weekend break settings
UPDATE public.school_remedial_rate_settings
SET 
    include_saturday_break = COALESCE(include_saturday_break, include_weekend_break, true),
    saturday_break_start_time = COALESCE(saturday_break_start_time, weekend_break_start_time, '10:00'),
    saturday_break_end_time = COALESCE(saturday_break_end_time, weekend_break_end_time, '10:30'),
    saturday_break_label = COALESCE(saturday_break_label, weekend_break_label, 'Saturday Refreshment Break'),
    include_sunday_break = COALESCE(include_sunday_break, include_weekend_break, true),
    sunday_break_start_time = COALESCE(sunday_break_start_time, '11:00'),
    sunday_break_end_time = COALESCE(sunday_break_end_time, '11:30'),
    sunday_break_label = COALESCE(sunday_break_label, 'Sunday Recess Break')
WHERE include_saturday_break IS NULL OR include_sunday_break IS NULL;
