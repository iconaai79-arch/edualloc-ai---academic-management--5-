-- Fix rider_id type in coop_farmers to match coop_riders.id (TEXT)
-- First clean up any existing attempts
DROP INDEX IF EXISTS idx_coop_farmers_rider_id;
ALTER TABLE coop_farmers DROP COLUMN IF EXISTS rider_id;

-- Now add correctly
ALTER TABLE coop_farmers ADD COLUMN rider_id TEXT REFERENCES coop_riders(id) ON DELETE SET NULL;

-- Re-create index
CREATE INDEX idx_coop_farmers_rider_id ON coop_farmers(rider_id);
