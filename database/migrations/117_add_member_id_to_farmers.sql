ALTER TABLE coop_farmers ADD COLUMN IF NOT EXISTS member_id TEXT;
CREATE INDEX IF NOT EXISTS idx_coop_farmers_member_id ON coop_farmers(member_id);
