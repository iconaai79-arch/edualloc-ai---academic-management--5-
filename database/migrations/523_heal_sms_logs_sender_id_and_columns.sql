-- Migration 523: Heal sms_logs table and ensure sender_id column exists
-- Resolves: "column 'sender_id' of relation 'sms_logs' does not exist"
-- Pure standard SQL: zero DO $$ blocks. Safe for Supabase, psql, and Web Importer.

CREATE TABLE IF NOT EXISTS public.sms_logs (
    id TEXT PRIMARY KEY DEFAULT ('smslog_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 6)),
    institution_id TEXT,
    sender_id TEXT,
    recipient TEXT NOT NULL DEFAULT 'N/A',
    message TEXT NOT NULL DEFAULT 'SMS notification',
    units NUMERIC DEFAULT 1,
    status TEXT DEFAULT 'sent',
    provider TEXT,
    gateway_response JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1. Ensure all columns exist (both snake_case and camelCase for backward compatibility)
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS recipient TEXT DEFAULT 'N/A';
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS message TEXT DEFAULT 'SMS notification';
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS units NUMERIC DEFAULT 1;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS provider TEXT;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS gateway_response JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS "gatewayResponse" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();

-- 2. Drop any foreign key constraints so system/global/unknown senders never fail to log SMS
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS sms_logs_institution_id_fkey CASCADE;
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS sms_logs_sender_id_fkey CASCADE;
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS fk_sms_logs_institution CASCADE;
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS fk_sms_logs_sender CASCADE;

-- 3. Relax NOT NULL constraints if table was created strictly
ALTER TABLE public.sms_logs ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.sms_logs ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.sms_logs ALTER COLUMN recipient DROP NOT NULL;
ALTER TABLE public.sms_logs ALTER COLUMN message DROP NOT NULL;

-- 4. Synchronize data between camelCase and snake_case columns
UPDATE public.sms_logs 
SET sender_id = COALESCE(sender_id, "senderId"),
    "senderId" = COALESCE("senderId", sender_id)
WHERE (sender_id IS NULL AND "senderId" IS NOT NULL) OR ("senderId" IS NULL AND sender_id IS NOT NULL);

UPDATE public.sms_logs 
SET institution_id = COALESCE(institution_id, "institutionId"),
    "institutionId" = COALESCE("institutionId", institution_id)
WHERE (institution_id IS NULL AND "institutionId" IS NOT NULL) OR ("institutionId" IS NULL AND institution_id IS NOT NULL);

-- 5. sms_outbox table & columns
CREATE TABLE IF NOT EXISTS public.sms_outbox (
    id TEXT PRIMARY KEY DEFAULT ('smsout_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 6)),
    institution_id TEXT,
    sender_id TEXT,
    recipient TEXT,
    message TEXT,
    units NUMERIC DEFAULT 1,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.sms_outbox ADD COLUMN IF NOT EXISTS sender_id TEXT;
ALTER TABLE public.sms_outbox ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE public.sms_outbox ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.sms_outbox ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- 6. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_sms_logs_institution_id ON public.sms_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_sender_id ON public.sms_logs(sender_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);

-- 7. Permissive RLS Policies
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sms_logs_permissive_access" ON public.sms_logs;
CREATE POLICY "sms_logs_permissive_access" ON public.sms_logs FOR ALL TO authenticated, anon USING (true) WITH CHECK (true);

-- 8. Grant access and reload PostgREST schema cache
GRANT ALL ON public.sms_logs TO anon, authenticated, service_role, postgres;
NOTIFY pgrst, 'reload schema';
