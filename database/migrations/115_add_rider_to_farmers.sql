-- Add rider_id to coop_farmers for milk collection assignment
ALTER TABLE coop_farmers ADD COLUMN IF NOT EXISTS rider_id UUID REFERENCES coop_riders(id) ON DELETE SET NULL;

-- Index for better performance
CREATE INDEX IF NOT EXISTS idx_coop_farmers_rider_id ON coop_farmers(rider_id);
