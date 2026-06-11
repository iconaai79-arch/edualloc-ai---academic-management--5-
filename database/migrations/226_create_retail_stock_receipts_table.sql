-- Migration: 226_create_retail_stock_receipts_table
-- Description: Creates the retail_stock_receipts table for logging supplier deliveries.

CREATE TABLE IF NOT EXISTS public.retail_stock_receipts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    reference_number TEXT NOT NULL,
    receipt_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.retail_stock_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their institution's retail_stock_receipts"
    ON public.retail_stock_receipts FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id::TEXT = auth.uid()::TEXT
    ));

CREATE POLICY "Admins/Agents can manage their institution's retail_stock_receipts"
    ON public.retail_stock_receipts FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id::TEXT = auth.uid()::TEXT
    ));

GRANT ALL ON TABLE public.retail_stock_receipts TO anon, authenticated, service_role;
