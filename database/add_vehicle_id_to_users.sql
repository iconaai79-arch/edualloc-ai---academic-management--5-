-- Add vehicle_id to users to support persistent transport assignments
ALTER TABLE users ADD COLUMN IF NOT EXISTS vehicle_id TEXT;

-- Add index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_users_vehicle_id ON users(vehicle_id);
