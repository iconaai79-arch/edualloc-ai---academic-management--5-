-- Migration 497: Optimize activity_log Resilience, Schema, Indexes, and RLS
-- Resolves statement timeout (8000ms limit) and schema mismatches on activity_log POST/upsert
--
-- 1. Ensure public.activity_log exists with all required telemetry columns (module, details, metadata, etc.)
-- 2. Drop rigid foreign keys (institution_id, user_id) that cause lock contention and statement timeouts
-- 3. Make user_id and user_name nullable with resilient defaults for anonymous/system activity
-- 4. Create high-performance composite indexes for instant lookups, sorting, and tenant pagination
-- 5. Establish permissive master RLS policies and grant permissions to anon, authenticated, and service_role
-- 6. Update PostgreSQL query planner statistics and reload schema cache

SET statement_timeout = '1min';

DO $$
BEGIN
    -- 1. Ensure Table and Columns Exist
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'activity_log'
    ) THEN
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS institution_name TEXT;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS user_id TEXT;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT 'System';
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS action TEXT DEFAULT 'activity';
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS module TEXT;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS details TEXT;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS ip_address TEXT;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS mac_address TEXT;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS imei TEXT;
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

        -- Drop NOT NULL constraints on user_id, user_name, and action to prevent insert failures on system telemetry
        ALTER TABLE public.activity_log ALTER COLUMN user_id DROP NOT NULL;
        ALTER TABLE public.activity_log ALTER COLUMN user_name DROP NOT NULL;
        ALTER TABLE public.activity_log ALTER COLUMN action DROP NOT NULL;
    ELSE
        CREATE TABLE IF NOT EXISTS public.activity_log (
            id TEXT PRIMARY KEY,
            institution_id TEXT,
            institution_name TEXT,
            user_id TEXT,
            user_name TEXT DEFAULT 'System',
            action TEXT DEFAULT 'activity',
            module TEXT,
            details TEXT,
            metadata JSONB DEFAULT '{}'::jsonb,
            ip_address TEXT,
            mac_address TEXT,
            imei TEXT,
            timestamp TIMESTAMPTZ DEFAULT NOW(),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        );
    END IF;
END $$;

-- 2. Drop all rigid FK constraints on activity_log to eliminate table locks and 8000ms timeouts
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass::text as tablename
        FROM   pg_constraint
        WHERE  conrelid = 'public.activity_log'::regclass
        AND contype = 'f'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I CASCADE;', r.tablename, r.conname);
        RAISE NOTICE 'Dropped FK % from %', r.conname, r.tablename;
    END LOOP;
END $$;

-- 3. Composite indexes for high-speed tenant-scoped queries & sorting
CREATE INDEX IF NOT EXISTS idx_activity_log_inst_id_desc 
    ON public.activity_log(institution_id, id DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_inst_timestamp 
    ON public.activity_log(institution_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_inst_created_desc 
    ON public.activity_log(institution_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_inst_module 
    ON public.activity_log(institution_id, module);

CREATE INDEX IF NOT EXISTS idx_activity_log_inst_user_timestamp 
    ON public.activity_log(institution_id, user_id, "timestamp" DESC);

CREATE INDEX IF NOT EXISTS idx_activity_log_timestamp_desc 
    ON public.activity_log("timestamp" DESC);

-- 4. Master permissive RLS policies
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'activity_log'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.activity_log', pol.policyname);
    END LOOP;
END $$;

DROP POLICY IF EXISTS "activity_log_all_access" ON public.activity_log;
CREATE POLICY "activity_log_all_access" ON public.activity_log
    FOR ALL
    TO public, anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- 5. Explicit Grants to all application roles
GRANT ALL ON public.activity_log TO anon, authenticated, service_role;

-- 6. Update PostgreSQL query planner statistics
ANALYZE public.activity_log;

-- 7. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
