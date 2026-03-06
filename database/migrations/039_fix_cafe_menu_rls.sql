-- Migration 039: Fix Cafe Menu RLS Policies
-- This migration updates RLS policies for cafe_menu_items to allow expanded roles 
-- and ensure super_admin access is consistent with other retail tables.

-- Drop existing policies to ensure a clean slate
DROP POLICY IF EXISTS "Users can view cafe_menu_items" ON public.cafe_menu_items;
DROP POLICY IF EXISTS "Admins can manage cafe_menu_items" ON public.cafe_menu_items;

-- 1. Users can view their institution's cafe menu items (Read Access)
CREATE POLICY "Users can view cafe_menu_items" ON public.cafe_menu_items
FOR SELECT USING (
    institution_id = get_curr_user_inst_id() 
    OR get_curr_user_role() = 'super_admin'
);

-- 2. Admins and Management Staff can manage cafe_menu_items (All Access)
-- Expanded roles to include 'store', 'carwash_attendant', and 'retail_agent' 
-- who may need to toggle availability or manage items in hybrid environments.
CREATE POLICY "Admins can manage cafe_menu_items" ON public.cafe_menu_items
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN (
        'admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 
        'academics_officer', 'agrovet_admin', 'property_admin', 
        'carwash_admin', 'carwash_attendant', 'store', 'transport_admin', 
        'boarding_master', 'county_admin', 'mechanic_admin', 
        'reseller', 'retail_agent', 'field_agent'
    ))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN (
        'admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 
        'academics_officer', 'agrovet_admin', 'property_admin', 
        'carwash_admin', 'carwash_attendant', 'store', 'transport_admin', 
        'boarding_master', 'county_admin', 'mechanic_admin', 
        'reseller', 'retail_agent', 'field_agent'
    ))
    OR get_curr_user_role() = 'super_admin'
);
