-- Migration: Add missing columns to coop_riders
-- Description: Adds national_id, license_number, vehicle_plate, and status to coop_riders table.

ALTER TABLE coop_riders ADD COLUMN IF NOT EXISTS national_id TEXT;
ALTER TABLE coop_riders ADD COLUMN IF NOT EXISTS license_number TEXT;
ALTER TABLE coop_riders ADD COLUMN IF NOT EXISTS vehicle_plate TEXT;
ALTER TABLE coop_riders ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive'));

-- Optional: Link riders to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS rider_id TEXT REFERENCES coop_riders(id) ON DELETE SET NULL;
