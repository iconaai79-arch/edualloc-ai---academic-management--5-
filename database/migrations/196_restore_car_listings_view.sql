-- Migration 196: Restore car_listings as a view mapping to car_sales_listings
-- This ensures legacy persistence calls referencing "car_listings" 
-- will seamlessly resolve without data duplication or application crashes.

CREATE OR REPLACE VIEW public.car_listings 
WITH (security_invoker = true)
AS 
SELECT * FROM public.car_sales_listings;

-- Grant permissions so the view is accessible
GRANT ALL ON public.car_listings TO authenticated;
GRANT ALL ON public.car_listings TO anon;
GRANT ALL ON public.car_listings TO service_role;
