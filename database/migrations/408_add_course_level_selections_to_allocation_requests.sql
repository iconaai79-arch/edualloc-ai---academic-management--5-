-- Migration 408: Add course_level_selections, created_at, subject_ids to allocation_requests
-- and drop strict foreign key constraints to support custom/dynamic subjects safely
-- Purpose: Prevent PGRST204 schema cache stale warning/errors and foreign key violations

ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS course_level_selections JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS course_level_ids TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS subject_ids TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Drop strict foreign key constraint so custom/dynamic curriculum subjects do not cause insert failures
ALTER TABLE IF EXISTS allocation_requests DROP CONSTRAINT IF EXISTS allocation_requests_subject_id_fkey;

-- Populate created_at from timestamp where available
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'allocation_requests' AND column_name = 'timestamp'
    ) THEN
        UPDATE allocation_requests 
        SET created_at = timestamp 
        WHERE created_at IS NULL AND timestamp IS NOT NULL;
    END IF;
END $$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
