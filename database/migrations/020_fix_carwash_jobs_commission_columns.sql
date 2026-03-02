-- Migration: 020_fix_carwash_jobs_commission_columns
-- Description: Ensures commission_earned and is_commission_paid have the correct types on carwash_jobs.
-- This fixes the issue where is_commission_paid might have been added as numeric, causing formatting errors.

DO $$
BEGIN
    -- 1. Ensure commission_earned exists and is numeric
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_jobs' AND column_name = 'commission_earned') THEN
        ALTER TABLE public.carwash_jobs ADD COLUMN commission_earned DECIMAL(12, 2) DEFAULT 0;
    END IF;

    -- 2. Ensure is_commission_paid exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_jobs' AND column_name = 'is_commission_paid') THEN
        ALTER TABLE public.carwash_jobs ADD COLUMN is_commission_paid BOOLEAN DEFAULT FALSE;
    END IF;

    -- 3. Fix the type of is_commission_paid if it was mistakenly created as NUMERIC/INTEGER by the user
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carwash_jobs' 
          AND column_name = 'is_commission_paid' 
          AND data_type IN ('numeric', 'decimal', 'double precision', 'real', 'integer', 'bigint', 'smallint')
    ) THEN
        -- Safely cast any existing numeric values to boolean (e.g. 0 -> false, >0 -> true)
        ALTER TABLE public.carwash_jobs 
        ALTER COLUMN is_commission_paid TYPE BOOLEAN 
        USING (COALESCE(is_commission_paid::numeric, 0) > 0);
    END IF;
    
    -- Ensure the default is correctly set
    ALTER TABLE public.carwash_jobs ALTER COLUMN is_commission_paid SET DEFAULT FALSE;

END $$;
