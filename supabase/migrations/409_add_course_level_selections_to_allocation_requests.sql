-- Migration 409: Add course_level_selections to allocation_requests
-- Purpose: Prevent PGRST204 schema cache stale warning/errors when saving allocation requests

ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS course_level_selections JSONB DEFAULT '{}'::jsonb;
ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS course_level_ids TEXT[] DEFAULT '{}';
ALTER TABLE IF EXISTS allocation_requests ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
