-- Migration 045: Create Dedicated Cafe Orders Table
-- Description: Creates a dedicated table for cafe/restaurant orders linked to car wash jobs.

-- 1. Create the table
CREATE TABLE IF NOT EXISTS public.cafe_orders (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL REFERENCES public.carwash_jobs(id) ON DELETE CASCADE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- [{itemId, name, quantity, unitPrice, source}]
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, preparing, ready, completed, cancelled
    payment_method TEXT NOT NULL DEFAULT 'tab', -- tab, cash, mpesa
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_cafe_orders_job ON public.cafe_orders(job_id);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_inst ON public.cafe_orders(institution_id);
CREATE INDEX IF NOT EXISTS idx_cafe_orders_status ON public.cafe_orders(status);

-- 3. Enable RLS and apply Master Unblock Policy
ALTER TABLE public.cafe_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing if any re-run
DROP POLICY IF EXISTS "master_unblock_cafe_orders" ON public.cafe_orders;

CREATE POLICY "master_unblock_cafe_orders" 
    ON public.cafe_orders FOR ALL 
    USING (true) WITH CHECK (true);

-- 4. Grants
GRANT ALL ON TABLE public.cafe_orders TO anon, authenticated, service_role;
