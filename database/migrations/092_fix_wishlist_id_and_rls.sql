-- Migration 092: Fix Wishlist UUID Syntax and RLS Robustness
-- This migration ensures retail_wishlist consistently handles alphanumeric IDs and varied user formats.

DO $$ 
BEGIN
    -- 1. Ensure id and captured_by_id are TEXT
    -- We use USING clause to ensure clear conversion from UUID or other types
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retail_wishlist' AND column_name = 'id' AND data_type = 'uuid') THEN
        ALTER TABLE public.retail_wishlist ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'retail_wishlist' AND column_name = 'captured_by_id' AND data_type = 'uuid') THEN
        ALTER TABLE public.retail_wishlist ALTER COLUMN captured_by_id TYPE TEXT USING captured_by_id::text;
    END IF;

    -- 2. Update RLS Policies with explicit casting for robustness
    DROP POLICY IF EXISTS "Users can view retail_wishlist" ON public.retail_wishlist;
    DROP POLICY IF EXISTS "Admins/Agents can manage retail_wishlist" ON public.retail_wishlist;
    DROP POLICY IF EXISTS "Allow anonymous marketplace inserts" ON public.retail_wishlist;
    DROP POLICY IF EXISTS "Allow anonymous view count updates" ON public.retail_wishlist;

    -- Policy: Select (View)
    CREATE POLICY "Users can view retail_wishlist" ON public.retail_wishlist
    FOR SELECT USING (
        institution_id::text = public.get_curr_user_inst_id() 
        OR public.get_curr_user_role() = 'super_admin'
    );

    -- Policy: All (Manage)
    CREATE POLICY "Admins/Agents can manage retail_wishlist" ON public.retail_wishlist
    FOR ALL USING (
        (institution_id::text = public.get_curr_user_inst_id() AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'field_agent', 'property_admin', 'reseller'))
        OR public.get_curr_user_role() = 'super_admin'
    );

    -- Policy: Anonymous Insert (Marketplace)
    CREATE POLICY "Allow anonymous marketplace inserts" 
    ON public.retail_wishlist FOR INSERT 
    WITH CHECK (true);

    -- Policy: Anonymous Update (Count increments)
    CREATE POLICY "Allow anonymous view count updates" 
    ON public.retail_wishlist FOR UPDATE
    USING (true)
    WITH CHECK (true);

END $$;
