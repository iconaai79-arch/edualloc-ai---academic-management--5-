-- 140. FIX PHARMACY SALE ITEMS INSTITUTION ID
-- Adds institution_id to his_pharmacy_sale_items for easier filtering and RLS consistency

-- 1. ADD COLUMN
ALTER TABLE his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS institution_id TEXT;

-- 2. DATA MIGRATION (Fill existing records)
UPDATE his_pharmacy_sale_items si
SET institution_id = s.institution_id
FROM his_pharmacy_sales s
WHERE si.sale_id = s.id
AND si.institution_id IS NULL;

-- 3. UPDATE RLS POLICY
DROP POLICY IF EXISTS "Pharmacy sale items access" ON his_pharmacy_sale_items;
CREATE POLICY "Pharmacy sale items access" ON his_pharmacy_sale_items FOR ALL 
USING (public.get_curr_user_inst_id() = institution_id::text);

-- 4. GRANTS (Safety)
GRANT ALL ON his_pharmacy_sale_items TO anon, authenticated, service_role;
