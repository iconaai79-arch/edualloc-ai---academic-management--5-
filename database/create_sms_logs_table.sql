-- Create SMS logs table for history tracking
CREATE TABLE IF NOT EXISTS sms_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    message TEXT NOT NULL,
    units INTEGER DEFAULT 1,
    status TEXT DEFAULT 'sent',
    provider TEXT,
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_sms_logs_institution_id ON sms_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON sms_logs(created_at);

-- Enable RLS
ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their institution's SMS logs"
    ON sms_logs FOR SELECT
    USING (
        auth.jwt() ->> 'institutionId' = institution_id
    );

CREATE POLICY "System can insert SMS logs"
    ON sms_logs FOR INSERT
    WITH CHECK (true);
