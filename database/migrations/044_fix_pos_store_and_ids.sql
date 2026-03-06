-- Migration 044: Fix POS Store and Constraint
-- Description: Ensures the 'hybrid_pos' virtual store exists for all institutions 
-- and relaxes the store_type constraint.

-- 1. Relax the store_type check constraint to allow 'virtual_store'
ALTER TABLE public.retail_stores DROP CONSTRAINT IF EXISTS retail_stores_store_type_check;
ALTER TABLE public.retail_stores ADD CONSTRAINT retail_stores_store_type_check 
    CHECK (store_type IN ('main_store', 'branch_store', 'van_stock', 'warehouse', 'virtual_store'));

-- 2. Create the 'hybrid_pos' virtual store for every institution
-- This prevents the foreign key violation when saving orders in the Hybrid POS.
INSERT INTO public.retail_stores (id, institution_id, name, store_type, is_active)
SELECT 
    'hybrid_pos', -- Hardcoded ID used in HybridPOSView.tsx
    id, 
    'Hybrid POS Virtual Store', 
    'virtual_store', 
    true
FROM public.institutions
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name, store_type = EXCLUDED.store_type;

-- 3. Ensure permissions are granted
GRANT ALL ON TABLE public.retail_stores TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.retail_sales TO anon, authenticated, service_role;
