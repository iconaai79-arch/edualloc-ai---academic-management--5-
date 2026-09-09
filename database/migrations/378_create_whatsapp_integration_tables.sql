-- Migration 378: Create WhatsApp Integration & Audit Logs Tables
-- Description: Adds configuration storage for WhatsApp Gateway / Meta Cloud API and audit logs for all outbound WhatsApp communications (fee balances, receipts, exam results, broadcasts).

-- 1. WhatsApp Configuration Table
CREATE TABLE IF NOT EXISTS public.whatsapp_configs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    provider_type TEXT DEFAULT 'gateway', -- 'gateway' (Option 3 QR / Baileys / Evolution API) or 'meta_cloud' (Option 1)
    gateway_url TEXT,                     -- e.g. https://wa.myschool.ac.ke or http://localhost:8080
    api_key TEXT,                         -- Authentication token for gateway
    instance_name TEXT,                   -- Instance / Session ID
    phone_number TEXT,                    -- Connected phone number (e.g. +254712345678)
    is_connected BOOLEAN DEFAULT false,
    qr_code_data TEXT,                    -- Base64 or string QR code representation when waiting for scan
    
    -- Future Option 1: Meta WhatsApp Cloud API credentials
    meta_phone_number_id TEXT,
    meta_access_token TEXT,
    meta_waba_id TEXT,
    
    -- Channel Automation Rules
    auto_send_receipts BOOLEAN DEFAULT true,
    auto_send_fee_reminders BOOLEAN DEFAULT false,
    auto_send_academic_results BOOLEAN DEFAULT false,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist if table was partially created
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS provider_type TEXT DEFAULT 'gateway';
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS gateway_url TEXT;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS instance_name TEXT;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS is_connected BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS qr_code_data TEXT;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS meta_phone_number_id TEXT;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS meta_access_token TEXT;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS meta_waba_id TEXT;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS auto_send_receipts BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS auto_send_fee_reminders BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS auto_send_academic_results BOOLEAN DEFAULT false;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. WhatsApp Audit Logs Table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    recipient TEXT NOT NULL,
    recipient_name TEXT,
    message_type TEXT DEFAULT 'text', -- 'text', 'document', 'receipt', 'fee_reminder', 'academic_results', 'broadcast'
    content TEXT,
    media_url TEXT,
    file_name TEXT,
    status TEXT DEFAULT 'queued',     -- 'queued', 'sent', 'delivered', 'failed'
    response_payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS recipient_name TEXT;
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS message_type TEXT DEFAULT 'text';
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS media_url TEXT;
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'queued';
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS response_payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.whatsapp_logs ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 3. Indexes for fast query performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_configs_inst ON public.whatsapp_configs(institution_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_inst_created ON public.whatsapp_logs(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_recipient ON public.whatsapp_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_whatsapp_logs_status ON public.whatsapp_logs(institution_id, status);

-- 4. Enable Row Level Security & Isolation
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_configs_isolation" ON public.whatsapp_configs;
CREATE POLICY "whatsapp_configs_isolation"
    ON public.whatsapp_configs
    FOR ALL
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    )
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

DROP POLICY IF EXISTS "whatsapp_logs_isolation" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_isolation"
    ON public.whatsapp_logs
    FOR ALL
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    )
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

-- 5. Grant Table Access
GRANT ALL ON TABLE public.whatsapp_configs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_logs TO anon, authenticated, service_role;

-- 6. Reload schema cache
NOTIFY pgrst, 'reload schema';
