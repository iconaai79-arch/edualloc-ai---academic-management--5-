-- Migration 089: Ensure Retail Wishlist Schema and Policies
-- This migration ensures the retail_wishlist table has the correct column types 
-- and RLS policies for robust lead closure and management.

-- 1. Ensure column types are TEXT (to handle alphanumeric IDs and varied user ID formats)
ALTER TABLE public.retail_wishlist ALTER COLUMN id TYPE TEXT;
ALTER TABLE public.retail_wishlist ALTER COLUMN captured_by_id TYPE TEXT;

-- 2. Ensure status column exists and has default
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'retail_wishlist' AND column_name = 'status'
    ) THEN
        ALTER TABLE public.retail_wishlist ADD COLUMN status TEXT DEFAULT 'Open';
    END IF;
END $$;

-- 3. Refresh RLS Policies for retail_wishlist
DROP POLICY IF EXISTS "Users can view retail_wishlist" ON public.retail_wishlist;
DROP POLICY IF EXISTS "Admins can manage retail_wishlist" ON public.retail_wishlist;
DROP POLICY IF EXISTS "Allow anonymous marketplace inserts" ON public.retail_wishlist;

-- Policy: Select (View)
CREATE POLICY "Users can view retail_wishlist" ON public.retail_wishlist
FOR SELECT USING (
    institution_id = get_curr_user_inst_id() 
    OR get_curr_user_role() = 'super_admin'
);

-- Policy: All (Manage) - Explicitly including roles that handle leads
CREATE POLICY "Admins/Agents can manage retail_wishlist" ON public.retail_wishlist
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'field_agent', 'property_admin', 'reseller'))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'field_agent', 'property_admin', 'reseller'))
    OR get_curr_user_role() = 'super_admin'
);

-- Policy: Anonymous Insert (Marketplace)
CREATE POLICY "Allow anonymous marketplace inserts" 
ON public.retail_wishlist FOR INSERT 
WITH CHECK (true);
