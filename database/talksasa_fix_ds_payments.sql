-- ============================================================================
-- Talksasa Database Patch: ds_payments Fix
-- Adds edit_reason and all audit columns, then clears partial payments
-- ============================================================================

-- 1. Ensure all columns exist on ds_payments
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS edit_reason TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS audited_by TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS audited_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS received_by TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'M-Pesa';
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS transaction_reference TEXT;
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Completed';
ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- 2. Clear out any partial payments from failed attempts to prevent duplicate key errors
TRUNCATE TABLE public.ds_payments CASCADE;

-- 3. Reload schema cache for PostgREST (if applicable)
DO $$ 
BEGIN 
    PERFORM pg_notify('pgrst', 'reload schema'); 
EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;

