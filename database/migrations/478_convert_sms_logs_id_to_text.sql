-- Migration 478: Safely convert sms_logs UUID columns to TEXT and add resilience
-- Purpose: If sms_logs was originally created with UUID id/institution_id/sender_id, convert them to TEXT so string identifiers (like smslog_... and GLOBAL/SYSTEM) work seamlessly without 22P02 errors.

DO $$
BEGIN
    -- 1. Ensure table exists with standard text columns
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

    -- 2. Convert id column to TEXT if it is currently UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sms_logs' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.sms_logs ALTER COLUMN id DROP DEFAULT;
        ALTER TABLE public.sms_logs ALTER COLUMN id TYPE TEXT USING id::text;
        ALTER TABLE public.sms_logs ALTER COLUMN id SET DEFAULT ('smslog_' || extract(epoch from now())::text || '_' || substr(md5(random()::text), 1, 6));
    END IF;

    -- 3. Convert institution_id column to TEXT if it is currently UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sms_logs' 
          AND column_name = 'institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.sms_logs ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;

    -- 4. Convert sender_id column to TEXT if it is currently UUID
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'sms_logs' 
          AND column_name = 'sender_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.sms_logs ALTER COLUMN sender_id TYPE TEXT USING sender_id::text;
    END IF;

    -- 5. Ensure required columns and safe defaults exist
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS sender_id TEXT;
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS recipient TEXT;
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS message TEXT;
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS units INTEGER DEFAULT 1;
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'sent';
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS provider TEXT;
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS gateway_response JSONB;
    ALTER TABLE public.sms_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- Drop NOT NULL from FK-like columns if present
    ALTER TABLE public.sms_logs ALTER COLUMN institution_id DROP NOT NULL;
    ALTER TABLE public.sms_logs ALTER COLUMN sender_id DROP NOT NULL;
    ALTER TABLE public.sms_logs ALTER COLUMN message SET DEFAULT 'SMS notification';
    ALTER TABLE public.sms_logs ALTER COLUMN recipient SET DEFAULT 'N/A';

    -- Performance indexes
    CREATE INDEX IF NOT EXISTS idx_sms_logs_institution_id ON public.sms_logs(institution_id);
    CREATE INDEX IF NOT EXISTS idx_sms_logs_created_at ON public.sms_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_sms_logs_recipient ON public.sms_logs(recipient);
    CREATE INDEX IF NOT EXISTS idx_sms_logs_status ON public.sms_logs(status);
END $$;
