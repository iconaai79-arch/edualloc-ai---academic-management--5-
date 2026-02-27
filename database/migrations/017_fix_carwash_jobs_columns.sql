-- Migration: Fix carwash_jobs columns to match frontend type

-- 1. Rename existing columns to match camelCase -> snake_case conversion
ALTER TABLE carwash_jobs RENAME COLUMN start_time TO started_at;
ALTER TABLE carwash_jobs RENAME COLUMN end_time TO completed_at;

-- 2. Add missing columns
ALTER TABLE carwash_jobs ADD COLUMN IF NOT EXISTS vehicle_id TEXT REFERENCES carwash_vehicles(id) ON DELETE SET NULL;
ALTER TABLE carwash_jobs ADD COLUMN IF NOT EXISTS notes TEXT;
