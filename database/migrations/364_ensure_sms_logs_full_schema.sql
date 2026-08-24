-- Migration 364: Ensure sms_logs Table Full Schema, Constraints, and Policies
-- Purpose: Ensures the sms_logs table exists with standard text/uuid IDs, proper columns, and permissive access.

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id TEXT PRIMARY KEY DEFAULT ('smslog_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 6)),
    institution_id TEXT,
    sender_id TEXT,
    recipient TEXT NOT NULL DEFAULT 'N/A',
    message TEXT NOT NULL DEFAULT 'SMS notification',
    units INTEGER DEFAULT 1,
    status TEXT DEFAULT 'sent',
    provider TEXT,
    gateway_response JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist if table was previously created with different columns
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS recipient TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS units INTEGER DEFAULT 1;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS gateway_response JSONB;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Set safe defaults for message and recipient
ALTER TABLE public.sms_logs ALTER COLUMN message SET DEFAULT 'SMS notification';
ALTER TABLE public.sms_logs ALTER COLUMN recipient SET DEFAULT 'N/A';

-- Relax not-null constraint on foreign keys if any
ALTER TABLE public.sms_logs ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.sms_logs ALTER COLUMN sender_id DROP NOT NULL;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sms_logs_institution_id ON public.sms_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON public.sms_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);

-- Enable RLS
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

-- Drop old restrictive policies if present
DROP POLICY IF EXISTS "Users can view their institution's SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "System can insert SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Users can manage SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Allow all for authenticated users on sms_logs" ON public.sms_logs;

-- Permissive policy for authenticated & service roles
CREATE POLICY "Allow all for authenticated users on sms_logs"
    ON public.sms_logs
    FOR ALL
    TO authenticated, service_role, anon
    USING (true)
    WITH CHECK (true);

GRANT ALL ON public.sms_logs TO authenticated, anon, service_role;
