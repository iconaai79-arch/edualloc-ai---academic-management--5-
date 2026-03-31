-- Migration: Coop Settings & SMS Outbox
-- Description: Adds coop_settings column to institutions and creates sms_outbox table.

-- Add coop_settings to institutions
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS coop_settings JSONB DEFAULT '{}'::jsonb;

-- Create sms_outbox table
CREATE TABLE IF NOT EXISTS sms_outbox (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    units INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on sms_outbox
ALTER TABLE sms_outbox ENABLE ROW LEVEL SECURITY;

-- SMS Outbox Policies
CREATE POLICY "Users can view their institution's outbox" 
ON sms_outbox FOR SELECT 
TO authenticated 
USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Users can add to their institution's outbox" 
ON sms_outbox FOR INSERT 
TO authenticated 
WITH CHECK (institution_id = get_curr_user_inst_id());

CREATE POLICY "Users can update their institution's outbox" 
ON sms_outbox FOR UPDATE 
TO authenticated 
USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Users can delete from their institution's outbox" 
ON sms_outbox FOR DELETE 
TO authenticated 
USING (institution_id = get_curr_user_inst_id());
