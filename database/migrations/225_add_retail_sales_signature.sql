-- Migration: 225_add_retail_sales_signature
-- Description: Adds signature and metadata columns to retail_sales table if they do not exist.

ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS signature text;
ALTER TABLE public.retail_sales ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
