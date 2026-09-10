-- Migration: 383_add_remedial_priorities_and_teacher_preferences.sql
-- Description: Add subject priority, weekly occurrence target, and teacher preferred day allocations to remedial system

-- 1. Extend school_remedial_subjects with priority and weekly occurrence rules
ALTER TABLE IF EXISTS public.school_remedial_subjects 
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS weekly_occurrences INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS preferred_day_type TEXT DEFAULT 'any',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.school_remedial_subjects.priority IS 'Priority level for timetable allocation: High (e.g., Mathematics, Sciences), Medium, Low.';
COMMENT ON COLUMN public.school_remedial_subjects.weekly_occurrences IS 'Target number of remedial sessions per week per stream for this subject (e.g., 2x per week).';
COMMENT ON COLUMN public.school_remedial_subjects.preferred_day_type IS 'Preferred session placement: any, weekdays, or weekends.';

-- 2. Extend school_remedial_rate_settings with teacher preferences storage
ALTER TABLE IF EXISTS public.school_remedial_rate_settings 
    ADD COLUMN IF NOT EXISTS teacher_preferences JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.school_remedial_rate_settings.teacher_preferences IS 'Teacher preferred days of the week, maximum weekly load, and availability settings.';

-- 3. Extend school_remedial_allocations with priority
ALTER TABLE IF EXISTS public.school_remedial_allocations 
    ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'Medium';

-- 4. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
