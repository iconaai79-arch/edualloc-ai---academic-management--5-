-- Add recorded_by to coop_agrovet_sales
ALTER TABLE public.coop_agrovet_sales 
ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL;

-- Audit: Also add recorded_by to other agrovet-related tables potentially missing it
ALTER TABLE public.coop_agrovet_inventory 
ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
