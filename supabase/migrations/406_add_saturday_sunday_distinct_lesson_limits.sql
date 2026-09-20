-- Migration: 406_add_saturday_sunday_distinct_lesson_limits.sql
-- Purpose: Add separate Saturday and Sunday daily limits for classes and teachers,
-- as well as distinct Saturday and Sunday timetable period counts.

ALTER TABLE public.school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS max_saturday_lessons_per_class_per_day INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS max_sunday_lessons_per_class_per_day INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS max_saturday_lessons_per_teacher_per_day INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS max_sunday_lessons_per_teacher_per_day INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS saturday_periods_count INTEGER DEFAULT 5,
    ADD COLUMN IF NOT EXISTS sunday_periods_count INTEGER DEFAULT 4;
