-- 086_enhance_retail_stores_schema.sql
-- Adds missing latitude and longitude columns to retail_stores table
-- and ensures proper management permissions.

-- 1. Add missing columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_stores' AND column_name='latitude') THEN
        ALTER TABLE public.retail_stores ADD COLUMN latitude FLOAT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='retail_stores' AND column_name='longitude') THEN
        ALTER TABLE public.retail_stores ADD COLUMN longitude FLOAT;
    END IF;
END $$;

-- 2. Ensure UPDATE permissions for authorized roles
-- (This builds on session 085 but specifically ensures the retail_stores table is covered)
DROP POLICY IF EXISTS "Admins can manage their institution's retail_stores" ON public.retail_stores;
CREATE POLICY "Admins can manage their institution's retail_stores"
    ON public.retail_stores FOR ALL
    USING (
        (public.get_curr_user_role() = 'super_admin') 
        OR (
            institution_id::text = public.get_curr_user_inst_id()
            AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'carwash_admin', 'agrovet_admin', 'property_admin', 'transport_admin')
        )
    )
    WITH CHECK (
        (public.get_curr_user_role() = 'super_admin') 
        OR (
            institution_id::text = public.get_curr_user_inst_id()
            AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'carwash_admin', 'agrovet_admin', 'property_admin', 'transport_admin')
        )
    );

-- Verify
DO $$ BEGIN
    RAISE NOTICE 'Retail Stores Schema Enhanced';
END $$;
