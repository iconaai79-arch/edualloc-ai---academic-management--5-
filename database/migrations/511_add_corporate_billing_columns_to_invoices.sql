-- Migration 511: Add corporate billing columns to invoices table
-- Purpose: Support corporate billing & invoicing by ensuring public.invoices has explicit columns
--          for client identification, company details, currency, notes, terms, tax, and discount.

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'invoices'
    ) THEN
        ALTER TABLE public.invoices
            ADD COLUMN IF NOT EXISTS client_id TEXT,
            ADD COLUMN IF NOT EXISTS client_name TEXT,
            ADD COLUMN IF NOT EXISTS client_email TEXT,
            ADD COLUMN IF NOT EXISTS client_phone TEXT,
            ADD COLUMN IF NOT EXISTS client_tax_pin TEXT,
            ADD COLUMN IF NOT EXISTS client_address TEXT,
            ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS terms TEXT,
            ADD COLUMN IF NOT EXISTS subtotal NUMERIC,
            ADD COLUMN IF NOT EXISTS tax_rate NUMERIC,
            ADD COLUMN IF NOT EXISTS tax_amount NUMERIC,
            ADD COLUMN IF NOT EXISTS discount_amount NUMERIC,
            ADD COLUMN IF NOT EXISTS amount_paid NUMERIC DEFAULT 0,
            ADD COLUMN IF NOT EXISTS balance NUMERIC,
            ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

        -- Indexes for corporate invoicing lookup speed
        CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON public.invoices(client_id);
        CREATE INDEX IF NOT EXISTS idx_invoices_client_name ON public.invoices(client_name);
        CREATE INDEX IF NOT EXISTS idx_invoices_institution_client ON public.invoices(institution_id, client_id);
    END IF;
END $$;

-- Notify PostgREST schema cache to reload
NOTIFY pgrst, 'reload schema';
