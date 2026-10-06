-- Migration: 407_add_substitution_and_match_columns.sql
-- Purpose: Add missing columns to school_remedial_rate_settings that are referenced
-- by the frontend (RemedialLessonsManager) but were absent from the database schema,
-- causing PostgREST to log:
--   "Schema cache stale: stripping un-cached column 'allow_adjacent_grade_substitution'"

ALTER TABLE public.school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS strict_subject_match_only         BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS strict_grade_match_only           BOOLEAN DEFAULT false,
    ADD COLUMN IF NOT EXISTS allow_adjacent_grade_substitution BOOLEAN DEFAULT true;

-- Reload PostgREST schema cache so the new columns are immediately visible.
NOTIFY pgrst, 'reload schema';
