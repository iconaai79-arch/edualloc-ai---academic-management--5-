-- Migration 382: Allow Global WhatsApp Configurations and Audit Logs
-- Description: Drops strict foreign key constraints on whatsapp_configs and whatsapp_logs to allow 'global' or 'system' institution_id for Super Admin platform-wide WhatsApp gateway.

-- 1. Ensure whatsapp_configs table exists with all required columns
CREATE TABLE IF NOT EXISTS public.whatsapp_configs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    provider_type TEXT DEFAULT 'gateway',
    gateway_url TEXT,
    api_key TEXT,
    instance_name TEXT,
    phone_number TEXT,
    is_connected BOOLEAN DEFAULT false,
    qr_code_data TEXT,
    meta_phone_number_id TEXT,
    meta_access_token TEXT,
    meta_waba_id TEXT,
    auto_send_receipts BOOLEAN DEFAULT true,
    auto_send_fee_reminders BOOLEAN DEFAULT false,
    auto_send_academic_results BOOLEAN DEFAULT false,
    allow_institution_failover BOOLEAN DEFAULT true,
    global_dispatch_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist
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
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS allow_institution_failover BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS global_dispatch_enabled BOOLEAN DEFAULT true;
ALTER TABLE public.whatsapp_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Ensure whatsapp_logs table exists
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    recipient TEXT NOT NULL,
    recipient_name TEXT,
    message_type TEXT DEFAULT 'text',
    content TEXT,
    media_url TEXT,
    file_name TEXT,
    status TEXT DEFAULT 'queued',
    response_payload JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Dynamically drop any foreign key on institution_id so 'global' / 'system' IDs can be used
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Drop all foreign keys on whatsapp_configs
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.whatsapp_configs'::regclass
        AND contype = 'f'
    ) LOOP
        EXECUTE 'ALTER TABLE public.whatsapp_configs DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;

    -- Drop all foreign keys on whatsapp_logs
    FOR r IN (
        SELECT conname
        FROM pg_constraint
        WHERE conrelid = 'public.whatsapp_logs'::regclass
        AND contype = 'f'
    ) LOOP
        EXECUTE 'ALTER TABLE public.whatsapp_logs DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname);
    END LOOP;
END $$;

-- 3. Enable RLS and add permissive policies
ALTER TABLE public.whatsapp_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "whatsapp_configs_isolation" ON public.whatsapp_configs;
CREATE POLICY "whatsapp_configs_isolation"
    ON public.whatsapp_configs
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "whatsapp_logs_isolation" ON public.whatsapp_logs;
CREATE POLICY "whatsapp_logs_isolation"
    ON public.whatsapp_logs
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- 4. Grant permissions
GRANT ALL ON TABLE public.whatsapp_configs TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.whatsapp_logs TO anon, authenticated, service_role;

-- 5. Seed default global WhatsApp config row if not present
INSERT INTO public.whatsapp_configs (
    id,
    institution_id,
    provider_type,
    gateway_url,
    instance_name,
    is_connected,
    allow_institution_failover,
    global_dispatch_enabled,
    auto_send_receipts,
    auto_send_fee_reminders,
    auto_send_academic_results
) VALUES (
    'wacfg_global',
    'global',
    'gateway',
    NULL,
    'eduai_master',
    false,
    true,
    true,
    true,
    false,
    false
) ON CONFLICT (id) DO UPDATE SET
    allow_institution_failover = EXCLUDED.allow_institution_failover,
    global_dispatch_enabled = EXCLUDED.global_dispatch_enabled;

-- 6. Clean legacy placeholder domain if present
UPDATE public.whatsapp_configs 
SET gateway_url = NULL 
WHERE gateway_url LIKE '%wa.eduai.platform%';

-- 7. Ensure remedial settings have weekend limits & break interval columns
ALTER TABLE IF EXISTS public.school_remedial_rate_settings 
    ADD COLUMN IF NOT EXISTS max_weekend_lessons_per_day INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS weekend_break_start_time TEXT DEFAULT '10:00',
    ADD COLUMN IF NOT EXISTS weekend_break_end_time TEXT DEFAULT '10:30',
    ADD COLUMN IF NOT EXISTS weekend_break_label TEXT DEFAULT 'Tea & Refreshment Break',
    ADD COLUMN IF NOT EXISTS include_weekend_break BOOLEAN DEFAULT true,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 8. Reload schema cache
NOTIFY pgrst, 'reload schema';

