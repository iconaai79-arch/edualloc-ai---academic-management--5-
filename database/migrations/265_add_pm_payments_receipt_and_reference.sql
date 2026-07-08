-- Migration 265: Add Receipt Number and Reference to Property Management Payments
ALTER TABLE public.pm_payments ADD COLUMN IF NOT EXISTS receipt_number TEXT;
ALTER TABLE public.pm_payments ADD COLUMN IF NOT EXISTS reference TEXT;

-- Recreate the RLS policies just in case
DROP POLICY IF EXISTS "Payment access" ON public.pm_payments;
CREATE POLICY "Payment access" ON public.pm_payments FOR ALL USING (true);

-- Comment for documentation
COMMENT ON COLUMN public.pm_payments.receipt_number IS 'Receipt number generated for the payment';
COMMENT ON COLUMN public.pm_payments.reference IS 'Payment reference number e.g. M-Pesa transaction reference';

-- Notify PostgREST to reload the schema cache so the new column is immediately visible
NOTIFY pgrst, 'reload schema';
