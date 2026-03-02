-- Migration: 024_fix_carwash_jobs_boolean_columns
-- Description: Ensures all boolean columns in carwash_jobs are strictly BOOLEAN
-- This fixes the issue "invalid input syntax for type numeric: 'false'"

DO $$
BEGIN

    -- 1. Fix is_commission_paid if it is numeric or text
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'carwash_jobs' 
          AND column_name = 'is_commission_paid' 
          AND data_type NOT IN ('boolean')
    ) THEN
        ALTER TABLE public.carwash_jobs 
        ALTER COLUMN is_commission_paid TYPE BOOLEAN 
        USING (is_commission_paid::text NOT IN ('0', 'false', 'FALSE', 'f', 'F', ''));
    END IF;
    
    -- Ensure default is FALSE
    ALTER TABLE public.carwash_jobs ALTER COLUMN is_commission_paid SET DEFAULT FALSE;


    -- 2. Fix is_loyalty_redemption if it is numeric or text
    -- Make sure it exists first
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_jobs' AND column_name = 'is_loyalty_redemption') THEN
        ALTER TABLE public.carwash_jobs ADD COLUMN is_loyalty_redemption BOOLEAN DEFAULT FALSE;
    ELSE
        -- Exists, now check type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'carwash_jobs' 
              AND column_name = 'is_loyalty_redemption' 
              AND data_type NOT IN ('boolean')
        ) THEN
            ALTER TABLE public.carwash_jobs 
            ALTER COLUMN is_loyalty_redemption TYPE BOOLEAN 
            USING (is_loyalty_redemption::text NOT IN ('0', 'false', 'FALSE', 'f', 'F', ''));
        END IF;
    END IF;

    -- Ensure default is FALSE
    ALTER TABLE public.carwash_jobs ALTER COLUMN is_loyalty_redemption SET DEFAULT FALSE;

END $$;
