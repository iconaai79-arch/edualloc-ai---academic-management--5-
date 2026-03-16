-- 104_ensure_login_discovery_columns.sql
-- Ensures that all columns required for public login discovery and API proxying exist.
-- This prevents 500 errors when selecting these columns via the API Records proxy.

DO $$ 
BEGIN
    -- 1. Ensure Institutions Columns
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'institutions') THEN
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_otp_enabled BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS institution_code TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS phone_number TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS business_sub_type TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'trial';
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
        
        -- Add unique constraint to institution_code if not present
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint WHERE conname = 'institutions_institution_code_key'
        ) THEN
            ALTER TABLE public.institutions ADD CONSTRAINT institutions_institution_code_key UNIQUE (institution_code);
        END IF;
    END IF;

    -- 2. Ensure Users Columns
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS roles TEXT[] DEFAULT '{}';
        ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone_number TEXT;
        
        -- Backfill roles from role if empty
        UPDATE public.users SET roles = ARRAY[role]::TEXT[] WHERE roles = '{}' OR roles IS NULL;
    END IF;

    -- 3. Ensure Counties Columns
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'counties') THEN
        ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS phone_number TEXT;
        ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS email TEXT;
        ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
        ALTER TABLE public.counties ADD COLUMN IF NOT EXISTS logo_url TEXT;
    END IF;
              
    RAISE NOTICE 'Login discovery columns verified/added.';
END $$;
