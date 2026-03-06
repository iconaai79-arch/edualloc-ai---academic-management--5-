-- Migration 043: Align Retail Sales Schema
-- Description: Adds missing columns to retail_sales table to match frontend interface.

-- 1. Add missing columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='retail_sales' AND column_name='unified_tab_id') THEN
        ALTER TABLE public.retail_sales ADD COLUMN unified_tab_id TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='retail_sales' AND column_name='customer_email') THEN
        ALTER TABLE public.retail_sales ADD COLUMN customer_email TEXT;
    END IF;
END $$;

-- 2. Performance Index for Tab Management
CREATE INDEX IF NOT EXISTS idx_retail_sales_tab ON public.retail_sales(unified_tab_id);

-- 3. Re-grant permissions
GRANT ALL ON TABLE public.retail_sales TO anon, authenticated, service_role;
