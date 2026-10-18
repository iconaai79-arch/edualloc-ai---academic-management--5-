-- Migration 516: Add Reseller ID Columns & Sync Resilience to Institutions
-- Resolves:
--   1. PostgreSQL error 42703 (column "reseller_id" does not exist)
--   2. Ensures public.institutions has reseller_id column (and "resellerId" camelCase alias)
--   3. Ensures public.commission_withdrawal_requests has reseller_id and "resellerId" columns
--   4. Relaxes rigid foreign key constraints on reseller_id so orphaned/demo/offline records never fail
--   5. Bidirectional synchronization trigger between snake_case and camelCase column aliases
--   6. High-performance composite indexes for instant reseller query retrieval
--   7. Backfills existing data and reloads PostgREST schema cache

SET statement_timeout = '1min';

DO $$
BEGIN
    -- 1. Ensure columns exist on public.institutions
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS reseller_id TEXT;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "resellerId" TEXT;

        -- Relax foreign keys on reseller_id if present
        ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS institutions_reseller_id_fkey CASCADE;
        ALTER TABLE public.institutions DROP CONSTRAINT IF EXISTS fk_institutions_reseller CASCADE;

        RAISE NOTICE 'Successfully added reseller_id and "resellerId" to public.institutions';
    END IF;

    -- 2. Ensure columns exist on public.commission_withdrawal_requests
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'commission_withdrawal_requests'
    ) THEN
        ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS reseller_id TEXT;
        ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS "resellerId" TEXT;

        ALTER TABLE public.commission_withdrawal_requests DROP CONSTRAINT IF EXISTS commission_withdrawal_requests_reseller_id_fkey CASCADE;
        ALTER TABLE public.commission_withdrawal_requests DROP CONSTRAINT IF EXISTS fk_cwr_reseller CASCADE;

        RAISE NOTICE 'Successfully ensured reseller_id on public.commission_withdrawal_requests';
    END IF;
END $$;

-- 3. Bidirectional trigger for public.institutions: keeps reseller_id and "resellerId" in sync
CREATE OR REPLACE FUNCTION public.sync_institutions_reseller_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Sync reseller_id <-> "resellerId"
    IF NEW.reseller_id IS NOT NULL AND (NEW."resellerId" IS NULL OR NEW."resellerId" != NEW.reseller_id) THEN
        NEW."resellerId" := NEW.reseller_id;
    ELSIF NEW."resellerId" IS NOT NULL AND (NEW.reseller_id IS NULL OR NEW.reseller_id != NEW."resellerId") THEN
        NEW.reseller_id := NEW."resellerId";
    END IF;

    -- Normalize empty strings to NULL
    IF NEW.reseller_id IS NOT NULL AND (TRIM(NEW.reseller_id) = '' OR NEW.reseller_id = 'null' OR NEW.reseller_id = 'undefined') THEN
        NEW.reseller_id := NULL;
        NEW."resellerId" := NULL;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_institutions_reseller_id ON public.institutions;
CREATE TRIGGER trg_sync_institutions_reseller_id
    BEFORE INSERT OR UPDATE ON public.institutions
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_institutions_reseller_id();

-- 4. Bidirectional trigger for public.commission_withdrawal_requests
CREATE OR REPLACE FUNCTION public.sync_cwr_reseller_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.reseller_id IS NOT NULL AND (NEW."resellerId" IS NULL OR NEW."resellerId" != NEW.reseller_id) THEN
        NEW."resellerId" := NEW.reseller_id;
    ELSIF NEW."resellerId" IS NOT NULL AND (NEW.reseller_id IS NULL OR NEW.reseller_id != NEW."resellerId") THEN
        NEW.reseller_id := NEW."resellerId";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_sync_cwr_reseller_id ON public.commission_withdrawal_requests;
CREATE TRIGGER trg_sync_cwr_reseller_id
    BEFORE INSERT OR UPDATE ON public.commission_withdrawal_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_cwr_reseller_id();

-- 5. Backfill existing values between snake_case and camelCase
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        UPDATE public.institutions
        SET "resellerId" = reseller_id
        WHERE reseller_id IS NOT NULL AND "resellerId" IS NULL;

        UPDATE public.institutions
        SET reseller_id = "resellerId"
        WHERE "resellerId" IS NOT NULL AND reseller_id IS NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'commission_withdrawal_requests'
    ) THEN
        UPDATE public.commission_withdrawal_requests
        SET "resellerId" = reseller_id
        WHERE reseller_id IS NOT NULL AND "resellerId" IS NULL;

        UPDATE public.commission_withdrawal_requests
        SET reseller_id = "resellerId"
        WHERE "resellerId" IS NOT NULL AND reseller_id IS NULL;
    END IF;
END $$;

-- 6. High-performance composite indexes
CREATE INDEX IF NOT EXISTS idx_institutions_reseller_id ON public.institutions(reseller_id);
CREATE INDEX IF NOT EXISTS idx_institutions_reseller_status ON public.institutions(reseller_id, status);
CREATE INDEX IF NOT EXISTS idx_institutions_reseller_id_quoted ON public.institutions("resellerId");
CREATE INDEX IF NOT EXISTS idx_cwr_reseller_id ON public.commission_withdrawal_requests(reseller_id);

-- 7. Update PostgreSQL query planner statistics & reload PostgREST schema cache
ANALYZE public.institutions;
ANALYZE public.commission_withdrawal_requests;
NOTIFY pgrst, 'reload schema';
