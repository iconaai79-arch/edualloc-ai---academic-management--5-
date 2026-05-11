-- Migration: Add updated_at to all ds_ tables
-- Created: 2026-05-11
-- Purpose: Support tracking of record modifications across the Driving School module

ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE ds_instructors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE ds_vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE ds_lessons ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
