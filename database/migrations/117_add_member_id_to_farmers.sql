-- Add member_id to coop_farmers
ALTER TABLE coop_farmers ADD COLUMN IF NOT EXISTS member_id TEXT;

-- Create index for quick lookup by member id
CREATE INDEX IF NOT EXISTS idx_coop_farmers_member_id ON coop_farmers(member_id);
