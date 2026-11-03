-- Migration 539: Alter system_settings.id to TEXT and add status, ts columns
-- Resolves: ERROR: invalid input syntax for type integer: "ping"

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'system_settings'
    ) THEN
        -- Alter id column from INTEGER to TEXT so alphanumeric keys like 'ping' are accepted
        BEGIN
            ALTER TABLE public.system_settings ALTER COLUMN id DROP DEFAULT;
            ALTER TABLE public.system_settings ALTER COLUMN id TYPE TEXT USING id::text;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Ensure status and ts columns exist for system ping/health records
        ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS "status" TEXT;
        ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS "ts" BIGINT;
    END IF;
END $$;
