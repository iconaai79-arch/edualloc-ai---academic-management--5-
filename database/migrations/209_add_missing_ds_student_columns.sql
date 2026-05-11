-- Migration: Add missing columns to ds_students
-- Created: 2026-05-11
-- Purpose: Support ID number and course duration tracking for driving school students

ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS id_number TEXT;
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS course_duration_days INTEGER DEFAULT 0;
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS remaining_days INTEGER DEFAULT 0;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
