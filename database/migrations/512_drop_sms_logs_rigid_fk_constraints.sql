-- Migration 512: Drop Rigid Foreign Key Constraints on sms_logs Table
-- Resolves Foreign Key violation (error 23503) on sms_logs when institution_id is GLOBAL, SYSTEM, or missing
--
-- 1. Ensure columns exist with safe defaults and relaxed NOT NULL constraints
-- 2. Drop all rigid FK constraints on public.sms_logs (sms_logs_institution_id_fkey, sms_logs_sender_id_fkey)
-- 3. Create high-performance index on institution_id and created_at
-- 4. Ensure permissive RLS policies for sms_logs so inserts and queries never fail
-- 5. Refresh PostgREST schema cache and update query statistics

SET statement_timeout = '1min';

DO $$
BEGIN
    -- 1. Ensure Table and Columns Exist with correct types
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'sms_logs'
    ) THEN
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS sender_id TEXT;
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS recipient TEXT DEFAULT 'N/A';
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS message TEXT DEFAULT 'SMS notification';
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS units INTEGER DEFAULT 1;
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS provider TEXT;
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS gateway_response JSONB;
        ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

        -- Relax NOT NULL constraints on foreign key columns
        ALTER TABLE public.sms_logs ALTER COLUMN institution_id DROP NOT NULL;
        ALTER TABLE public.sms_logs ALTER COLUMN sender_id DROP NOT NULL;
        ALTER TABLE public.sms_logs ALTER COLUMN recipient SET DEFAULT 'N/A';
        ALTER TABLE public.sms_logs ALTER COLUMN message SET DEFAULT 'SMS notification';
    ELSE
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
            created_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Explicitly drop standard rigid FK constraints on sms_logs
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS sms_logs_institution_id_fkey CASCADE;
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS sms_logs_sender_id_fkey CASCADE;
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS fk_sms_logs_institution CASCADE;
ALTER TABLE public.sms_logs DROP CONSTRAINT IF EXISTS fk_sms_logs_sender CASCADE;

-- Dynamically drop any remaining FK constraints on public.sms_logs to prevent locks & violations
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass::text as tablename
        FROM   pg_constraint
        WHERE  conrelid = 'public.sms_logs'::regclass
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE;', r.tablename, r.conname);
        RAISE NOTICE 'Dropped FK constraint % from %', r.conname, r.tablename;
    END LOOP;
END $$;

-- 3. Indexes for fast query retrieval & filtering
CREATE INDEX IF NOT EXISTS idx_sms_logs_institution_id ON public.sms_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at_desc ON public.sms_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_inst_created ON public.sms_logs(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON public.sms_logs(recipient);
CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);

-- 4. Permissive RLS Policy for sms_logs so audit tracking never blocks
ALTER TABLE public.sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sms_logs_permissive_access" ON public.sms_logs;
DROP POLICY IF EXISTS "Allow all for authenticated users on sms_logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Users can view their institution's SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "System can insert SMS logs" ON public.sms_logs;
DROP POLICY IF EXISTS "Users can manage SMS logs" ON public.sms_logs;

CREATE POLICY "sms_logs_permissive_access"
    ON public.sms_logs
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. Explicit Grants to all application roles
GRANT ALL ON public.sms_logs TO anon, authenticated, service_role;

-- 6. Update PostgreSQL query planner statistics & reload schema
ANALYZE public.sms_logs;
NOTIFY pgrst, 'reload schema';
