-- Migration: Fix carwash_packages columns to match frontend type

-- 1. Rename existing columns
ALTER TABLE carwash_packages RENAME COLUMN estimated_duration_minutes TO estimated_minutes;
ALTER TABLE carwash_packages RENAME COLUMN color_accent TO color;
ALTER TABLE carwash_packages RENAME COLUMN is_interior_only TO includes_interior;

-- 2. Add missing columns
ALTER TABLE carwash_packages ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE carwash_packages ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
