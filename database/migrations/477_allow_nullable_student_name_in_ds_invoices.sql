-- Migration 477: Allow nullable student_name with default in ds_invoices and ds_payments
-- Purpose:
--   1. Fix NOT NULL constraint violations on ds_invoices.student_name when invoices
--      are generated or updated for corporate clients, leads, walk-ins, or bulk billing.
--   2. Set default value 'Student' on student_name so any insert omitting the student name
--      gracefully succeeds with a valid fallback.
--   3. Ensure ds_payments student_name also has a safe default of 'Student'.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_invoices'
    ) THEN
        -- Set default to 'Student' for backwards compatibility and fallback resilience
        ALTER TABLE public.ds_invoices ALTER COLUMN student_name SET DEFAULT 'Student';
        
        -- Drop NOT NULL constraint on student_name
        ALTER TABLE public.ds_invoices ALTER COLUMN student_name DROP NOT NULL;
    END IF;

    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_payments'
    ) THEN
        -- Set default to 'Student' on ds_payments
        ALTER TABLE public.ds_payments ALTER COLUMN student_name SET DEFAULT 'Student';
    END IF;
END $$;

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
