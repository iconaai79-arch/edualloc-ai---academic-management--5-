-- Migration 358: Add edit_reason, deletion_reason, notes, and metadata to ds_payments
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_payments'
    ) THEN
        ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS edit_reason TEXT;
        ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS deletion_reason TEXT;
        ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS notes TEXT;
        ALTER TABLE public.ds_payments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;
