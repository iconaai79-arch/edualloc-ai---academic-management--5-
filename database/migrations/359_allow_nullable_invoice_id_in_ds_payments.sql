-- Migration 359: Allow nullable invoice_id in ds_payments for direct payments & opening balances
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_payments'
    ) THEN
        -- Allow nullable invoice_id for direct receipts, opening balances, and unlinked payments
        ALTER TABLE public.ds_payments ALTER COLUMN invoice_id DROP NOT NULL;

        -- Update foreign key constraint to ON DELETE SET NULL
        ALTER TABLE public.ds_payments DROP CONSTRAINT IF EXISTS ds_payments_invoice_id_fkey;
        ALTER TABLE public.ds_payments 
            ADD CONSTRAINT ds_payments_invoice_id_fkey 
            FOREIGN KEY (invoice_id) 
            REFERENCES public.ds_invoices(id) 
            ON DELETE SET NULL;
    END IF;
END $$;
