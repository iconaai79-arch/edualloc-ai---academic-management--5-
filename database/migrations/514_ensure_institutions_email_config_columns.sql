-- Migration 514: Ensure Institutions Email Config & Gateway Columns Resilience
-- Resolves:
--   1. PostgreSQL error 42703 (column institutions.emailConfig does not exist)
--   2. Ensures public.institutions has email_config JSONB column
--   3. Ensures public.institutions has "emailConfig" JSONB column for backward compatibility with queries expecting camelCase
--   4. Ensures other gateway camelCase columns ("smsConfig", "smsBalance", "mpesaConfig", "googleDriveConfig") exist
--   5. Bidirectional synchronization trigger to keep snake_case and camelCase columns in sync
--   6. Backfills existing values and reloads PostgREST schema cache

SET statement_timeout = '1min';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        -- 1. Ensure snake_case gateway columns exist
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS email_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS sms_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 0;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS mpesa_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS google_drive_config JSONB DEFAULT '{"clientId": "", "clientSecret": "", "refreshToken": "", "isActive": false}'::jsonb;

        -- 2. Ensure camelCase gateway columns exist to guarantee total resilience against 42703
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "emailConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "smsConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "smsBalance" INTEGER DEFAULT 0;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "mpesaConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "googleDriveConfig" JSONB DEFAULT '{"clientId": "", "clientSecret": "", "refreshToken": "", "isActive": false}'::jsonb;
    END IF;
END $$;

-- 3. Create or replace bidirectional synchronization function
CREATE OR REPLACE FUNCTION public.sync_institutions_gateway_configs()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchronize email_config <-> "emailConfig"
    IF NEW.email_config IS NOT NULL AND (NEW."emailConfig" IS NULL OR NEW."emailConfig" != NEW.email_config) THEN
        NEW."emailConfig" := NEW.email_config;
    ELSIF NEW."emailConfig" IS NOT NULL AND (NEW.email_config IS NULL OR NEW.email_config != NEW."emailConfig") THEN
        NEW.email_config := NEW."emailConfig";
    END IF;

    -- Synchronize sms_config <-> "smsConfig"
    IF NEW.sms_config IS NOT NULL AND (NEW."smsConfig" IS NULL OR NEW."smsConfig" != NEW.sms_config) THEN
        NEW."smsConfig" := NEW.sms_config;
    ELSIF NEW."smsConfig" IS NOT NULL AND (NEW.sms_config IS NULL OR NEW.sms_config != NEW."smsConfig") THEN
        NEW.sms_config := NEW."smsConfig";
    END IF;

    -- Synchronize sms_balance <-> "smsBalance"
    IF NEW.sms_balance IS NOT NULL AND (NEW."smsBalance" IS NULL OR NEW."smsBalance" != NEW.sms_balance) THEN
        NEW."smsBalance" := NEW.sms_balance;
    ELSIF NEW."smsBalance" IS NOT NULL AND (NEW.sms_balance IS NULL OR NEW.sms_balance != NEW."smsBalance") THEN
        NEW.sms_balance := NEW."smsBalance";
    END IF;

    -- Synchronize mpesa_config <-> "mpesaConfig"
    IF NEW.mpesa_config IS NOT NULL AND (NEW."mpesaConfig" IS NULL OR NEW."mpesaConfig" != NEW.mpesa_config) THEN
        NEW."mpesaConfig" := NEW.mpesa_config;
    ELSIF NEW."mpesaConfig" IS NOT NULL AND (NEW.mpesa_config IS NULL OR NEW.mpesa_config != NEW."mpesaConfig") THEN
        NEW.mpesa_config := NEW."mpesaConfig";
    END IF;

    -- Synchronize google_drive_config <-> "googleDriveConfig"
    IF NEW.google_drive_config IS NOT NULL AND (NEW."googleDriveConfig" IS NULL OR NEW."googleDriveConfig" != NEW.google_drive_config) THEN
        NEW."googleDriveConfig" := NEW.google_drive_config;
    ELSIF NEW."googleDriveConfig" IS NOT NULL AND (NEW.google_drive_config IS NULL OR NEW.google_drive_config != NEW."googleDriveConfig") THEN
        NEW.google_drive_config := NEW."googleDriveConfig";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. Re-create trigger safely
DROP TRIGGER IF EXISTS trg_sync_institutions_gateway_configs ON public.institutions;
CREATE TRIGGER trg_sync_institutions_gateway_configs
    BEFORE INSERT OR UPDATE ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_institutions_gateway_configs();

-- 5. Backfill any existing values between snake_case and camelCase columns
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        UPDATE public.institutions
        SET "emailConfig" = email_config
        WHERE email_config IS NOT NULL AND "emailConfig" IS NULL;

        UPDATE public.institutions
        SET email_config = "emailConfig"
        WHERE "emailConfig" IS NOT NULL AND email_config IS NULL;

        UPDATE public.institutions
        SET "smsConfig" = sms_config
        WHERE sms_config IS NOT NULL AND "smsConfig" IS NULL;

        UPDATE public.institutions
        SET sms_config = "smsConfig"
        WHERE "smsConfig" IS NOT NULL AND sms_config IS NULL;

        UPDATE public.institutions
        SET "smsBalance" = sms_balance
        WHERE sms_balance IS NOT NULL AND "smsBalance" IS NULL;

        UPDATE public.institutions
        SET sms_balance = "smsBalance"
        WHERE "smsBalance" IS NOT NULL AND sms_balance IS NULL;

        UPDATE public.institutions
        SET "mpesaConfig" = mpesa_config
        WHERE mpesa_config IS NOT NULL AND "mpesaConfig" IS NULL;

        UPDATE public.institutions
        SET mpesa_config = "mpesaConfig"
        WHERE "mpesaConfig" IS NOT NULL AND mpesa_config IS NULL;

        UPDATE public.institutions
        SET "googleDriveConfig" = google_drive_config
        WHERE google_drive_config IS NOT NULL AND "googleDriveConfig" IS NULL;

        UPDATE public.institutions
        SET google_drive_config = "googleDriveConfig"
        WHERE "googleDriveConfig" IS NOT NULL AND google_drive_config IS NULL;
    END IF;
END $$;

-- 6. Update PostgreSQL query planner statistics & reload schema cache
ANALYZE public.institutions;
NOTIFY pgrst, 'reload schema';
