-- Migration 262: Add opening_balance column to pm_invoices table
ALTER TABLE public.pm_invoices ADD COLUMN IF NOT EXISTS opening_balance DECIMAL(12, 2) DEFAULT 0;

-- Recreate the RLS policies just in case, though they are ALL permissive
DROP POLICY IF EXISTS "Invoice access" ON public.pm_invoices;
CREATE POLICY "Invoice access" ON public.pm_invoices FOR ALL USING (true);

-- Notify PostgREST to reload the schema cache so the new column is immediately visible
NOTIFY pgrst, 'reload schema';
