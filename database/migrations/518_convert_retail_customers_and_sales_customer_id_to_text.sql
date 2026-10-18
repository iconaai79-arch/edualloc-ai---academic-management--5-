-- Migration 518: Convert Retail Customers and Sales Customer ID from UUID to TEXT
-- Description: Converts retail_customers.id and retail_sales.customer_id from UUID to TEXT,
-- harmonizing with the rest of the retail architecture (Migration 042).
-- Resolves PostgreSQL error 22P02: invalid input syntax for type uuid

SET statement_timeout = '1min';

-- 1. DROP RIGID FOREIGN KEY CONSTRAINTS
ALTER TABLE public.retail_sales DROP CONSTRAINT IF EXISTS retail_sales_customer_id_fkey CASCADE;

-- 2. CONVERT retail_customers.id TO TEXT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'retail_customers' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.retail_customers ALTER COLUMN id TYPE TEXT USING id::text;
        ALTER TABLE public.retail_customers ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
    END IF;
END $$;

-- 3. CONVERT retail_sales.customer_id TO TEXT
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'retail_sales' 
          AND column_name = 'customer_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.retail_sales ALTER COLUMN customer_id TYPE TEXT USING customer_id::text;
    END IF;
END $$;

-- 4. ENSURE PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_retail_customers_id ON public.retail_customers(id);
CREATE INDEX IF NOT EXISTS idx_retail_sales_customer_id ON public.retail_sales(customer_id);

-- 5. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
