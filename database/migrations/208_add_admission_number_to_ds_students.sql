-- Migration: Add admission_number to ds_students
-- Created: 2026-05-11
-- Purpose: Support institutional admission identifiers for driving school students

ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS admission_number TEXT;

-- Index for faster lookups during validation and searching
CREATE INDEX IF NOT EXISTS idx_ds_students_admission_number ON ds_students(admission_number);

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
