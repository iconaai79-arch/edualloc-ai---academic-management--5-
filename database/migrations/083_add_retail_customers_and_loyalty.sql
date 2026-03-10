-- Migration: 083_add_retail_customers_and_loyalty
-- Description: Creates retail_customers table and adds customer integration to retail_sales.

-- 1. Create Retail Customers Table
CREATE TABLE IF NOT EXISTS public.retail_customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    loyalty_points INTEGER DEFAULT 0,
    total_spent NUMERIC(12, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(institution_id, phone_number) 
);

-- 2. Add customer_id to Retail Sales
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retail_sales' AND column_name = 'customer_id') THEN
        ALTER TABLE public.retail_sales ADD COLUMN customer_id UUID REFERENCES public.retail_customers(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 3. Enable RLS for retail_customers
ALTER TABLE public.retail_customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their institution's retail_customers"
    ON public.retail_customers FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()::TEXT
    ));

CREATE POLICY "Admins/Agents can manage their institution's retail_customers"
    ON public.retail_customers FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()::TEXT
    ));

-- 4. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_retail_customers_phone ON public.retail_customers(phone_number);
CREATE INDEX IF NOT EXISTS idx_retail_customers_inst ON public.retail_customers(institution_id);
