-- Migration 283: ZKTeco Device Persistent Command Queue & Ping Tracking
-- Adds persistent command queueing and tracking fields for ZKTeco ADMS devices to work reliably on serverless platforms.

-- 1. Add extra heartbeat/ping fields to biometric_devices
ALTER TABLE biometric_devices 
ADD COLUMN IF NOT EXISTS last_ip VARCHAR(45),
ADD COLUMN IF NOT EXISTS requests_count INT DEFAULT 0;

-- 2. Create biometric_device_commands table
CREATE TABLE IF NOT EXISTS biometric_device_commands (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    command_id INT NOT NULL,
    command_text TEXT NOT NULL,
    command_type VARCHAR(50) NOT NULL DEFAULT 'ENROLL',
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'sent', 'executed', 'failed'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    executed_at TIMESTAMPTZ
);

-- 3. Create indexes for fast lookup during device polling
CREATE INDEX IF NOT EXISTS idx_biometric_cmd_sn_status ON biometric_device_commands(serial_number, status);
CREATE INDEX IF NOT EXISTS idx_biometric_cmd_inst ON biometric_device_commands(institution_id);
CREATE INDEX IF NOT EXISTS idx_biometric_cmd_created ON biometric_device_commands(created_at);

-- 4. Enable RLS
ALTER TABLE biometric_device_commands ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_biometric_device_commands" ON biometric_device_commands
FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "institution_biometric_device_commands" ON biometric_device_commands
FOR ALL TO authenticated
USING (institution_id = (auth.jwt() -> 'app_metadata' ->> 'institution_id'))
WITH CHECK (institution_id = (auth.jwt() -> 'app_metadata' ->> 'institution_id'));

COMMENT ON TABLE biometric_device_commands IS 'Persistent ADMS command queue for ZKTeco biometric terminals';
