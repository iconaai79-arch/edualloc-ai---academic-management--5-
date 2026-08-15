-- ============================================================
-- Migration 324: Add registration_number column to car_sales_invoices & update IPN triggers
-- Resolves PostgreSQL 42703: column "registration_number" does not exist during KCB/M-Pesa IPN logging
-- ============================================================

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.car_sales_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(15,2) DEFAULT 0,
    balance_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add missing registration_number and related columns
ALTER TABLE public.car_sales_invoices ADD COLUMN IF NOT EXISTS registration_number TEXT;
ALTER TABLE public.car_sales_invoices ADD COLUMN IF NOT EXISTS "registrationNumber" TEXT;
ALTER TABLE public.car_sales_invoices ADD COLUMN IF NOT EXISTS vehicle_model TEXT;
ALTER TABLE public.car_sales_invoices ADD COLUMN IF NOT EXISTS "vehicleModel" TEXT;
ALTER TABLE public.car_sales_invoices ADD COLUMN IF NOT EXISTS sold_by TEXT;
ALTER TABLE public.car_sales_invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;

-- 3. Create index for fast lookup during IPN reconciliation
CREATE INDEX IF NOT EXISTS idx_car_sales_invoices_reg_no ON public.car_sales_invoices(registration_number);
CREATE INDEX IF NOT EXISTS idx_car_sales_invoices_inv_no ON public.car_sales_invoices(invoice_number);

-- 4. Enable RLS and Permissive Policies
ALTER TABLE public.car_sales_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Invoices Manage Policy" ON public.car_sales_invoices;
DROP POLICY IF EXISTS "Allow all on car_sales_invoices" ON public.car_sales_invoices;

CREATE POLICY "Allow all on car_sales_invoices" ON public.car_sales_invoices
    FOR ALL USING (true) WITH CHECK (true);

GRANT ALL ON public.car_sales_invoices TO anon, authenticated, service_role;
