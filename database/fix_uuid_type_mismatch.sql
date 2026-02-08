-- Fix for UUID Type Mismatch Error
-- Run this if you get: "operator does not exist: text = uuid"

-- This script fixes the admin_id column type mismatch

-- Step 1: Drop the existing foreign key constraint (if it exists)
ALTER TABLE counties DROP CONSTRAINT IF EXISTS fk_county_admin;

-- Step 2: Change admin_id column from TEXT to UUID
ALTER TABLE counties ALTER COLUMN admin_id TYPE UUID USING admin_id::UUID;

-- Step 3: Re-add the foreign key constraint
ALTER TABLE counties
ADD CONSTRAINT fk_county_admin 
    FOREIGN KEY (admin_id) 
    REFERENCES users(id) 
    ON DELETE SET NULL;

-- Verify the fix
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'counties' AND column_name = 'admin_id';

-- Should show: admin_id | uuid
