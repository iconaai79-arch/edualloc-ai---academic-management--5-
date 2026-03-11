-- Migration 091: Harden County Inventory RLS
-- This migration ensures that only authorized county staff can manage their inventory.

-- 1. Ensure columns are TEXT for robust matching with get_curr_user_inst_id()
ALTER TABLE public.county_inventory_categories ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.county_inventory_categories ALTER COLUMN county_id TYPE TEXT USING county_id::text;

ALTER TABLE public.county_stores ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.county_stores ALTER COLUMN county_id TYPE TEXT USING county_id::text;

ALTER TABLE public.county_inventory ALTER COLUMN id TYPE TEXT USING id::text;
ALTER TABLE public.county_inventory ALTER COLUMN county_id TYPE TEXT USING county_id::text;
ALTER TABLE public.county_inventory ALTER COLUMN target_institution_id TYPE TEXT USING target_institution_id::text;

-- 2. Drop broad policies from 008
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.county_inventory_categories;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.county_stores;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.county_inventory;

-- 3. Implement precise policies for county_inventory_categories
CREATE POLICY "county_inv_cat_select" 
ON public.county_inventory_categories FOR SELECT 
USING (county_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "county_inv_cat_write" 
ON public.county_inventory_categories FOR ALL 
USING (
    (county_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() LIKE 'county_%')
    OR public.get_curr_user_role() = 'super_admin'
);

-- 4. Implement precise policies for county_stores
CREATE POLICY "county_stores_select" 
ON public.county_stores FOR SELECT 
USING (county_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "county_stores_write" 
ON public.county_stores FOR ALL 
USING (
    (county_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() LIKE 'county_%')
    OR public.get_curr_user_role() = 'super_admin'
);

-- 5. Implement precise policies for county_inventory
-- Note: SELECT is open to county users or target institution users (using institution_id or county_id)
CREATE POLICY "county_inv_select" 
ON public.county_inventory FOR SELECT 
USING (
    county_id = public.get_curr_user_inst_id() 
    OR target_institution_id::text = public.get_curr_user_inst_id()
    OR public.get_curr_user_role() = 'super_admin'
);

CREATE POLICY "county_inv_write" 
ON public.county_inventory FOR ALL 
USING (
    (county_id = public.get_curr_user_inst_id() AND public.get_curr_user_role() LIKE 'county_%')
    OR public.get_curr_user_role() = 'super_admin'
);

-- 6. Helper for anonymous updates if needed (e.g. for count increments)
-- No anonymous updates identified yet for these tables, keeping it restricted for now.
