-- Add missing metadata column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Add registration_number and tour360_url to car_sales_listings table
ALTER TABLE public.car_sales_listings ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100);
ALTER TABLE public.car_sales_listings ADD COLUMN IF NOT EXISTS tour360_url TEXT;

-- Notify postgrest to reload schema cache
NOTIFY pgrst, 'reload schema';
