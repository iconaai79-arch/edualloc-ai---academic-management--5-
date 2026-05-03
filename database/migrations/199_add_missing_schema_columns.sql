-- Add missing metadata column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add registration_number to car_sales_listings table
ALTER TABLE public.car_sales_listings ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);

-- Notify postgrest to reload schema cache
NOTIFY pgrst, 'reload schema';
