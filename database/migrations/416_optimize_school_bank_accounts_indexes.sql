-- Migration 416: Optimize school_bank_accounts table indexes
-- Purpose: Accelerate institution school_bank_accounts lookups, eliminate PostgREST chunk timeouts,
-- and provide high-performance B-tree index coverage for institution_id, id, status, and created_at.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'school_bank_accounts'
    ) THEN
        -- 1. Index on institution_id for tenancy filtering
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_bank_accounts' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_bank_accounts_institution_id 
                ON public.school_bank_accounts (institution_id);
            CREATE INDEX IF NOT EXISTS idx_school_bank_accounts_inst_id_composite 
                ON public.school_bank_accounts (institution_id, id DESC);
        END IF;

        -- 2. Index on status
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_bank_accounts' AND column_name = 'status'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_bank_accounts_status 
                ON public.school_bank_accounts (status);
        END IF;

        -- 3. Index on created_at
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'school_bank_accounts' AND column_name = 'created_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_school_bank_accounts_created_at 
                ON public.school_bank_accounts (created_at DESC);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
