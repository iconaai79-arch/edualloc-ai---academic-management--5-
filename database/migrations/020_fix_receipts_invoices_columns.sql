-- Migration to add missing columns to receipts and invoices tables
-- This aligns the physical schema with the Receipt and Invoice interfaces in types.ts

DO $$ 
BEGIN
    -- Fix Receipts Table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'invoice_id') THEN
        ALTER TABLE public.receipts ADD COLUMN invoice_id TEXT;
        -- Add foreign key if invoices table exists
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
            ALTER TABLE public.receipts ADD CONSTRAINT receipts_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'receipts' AND column_name = 'student_id') THEN
        ALTER TABLE public.receipts ADD COLUMN student_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
    END IF;

    -- Fix Invoices Table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'student_id') THEN
            ALTER TABLE public.invoices ADD COLUMN student_id TEXT REFERENCES public.users(id) ON DELETE SET NULL;
        END IF;
    END IF;
END $$;
