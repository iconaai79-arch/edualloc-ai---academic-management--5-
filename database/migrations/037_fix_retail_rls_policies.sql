-- Migration 037: Fix Retail RLS Policies (Idempotent Version)
-- This migration updates RLS policies for all retail-related tables to use 
-- established security functions and allow super_admin access.

-- 1. retail_stores
DROP POLICY IF EXISTS "Users can view their institution's retail_stores" ON public.retail_stores;
DROP POLICY IF EXISTS "Admins can manage their institution's retail_stores" ON public.retail_stores;
DROP POLICY IF EXISTS "Users can view retail_stores" ON public.retail_stores;
DROP POLICY IF EXISTS "Admins can manage retail_stores" ON public.retail_stores;

CREATE POLICY "Users can view retail_stores" ON public.retail_stores
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

CREATE POLICY "Admins can manage retail_stores" ON public.retail_stores
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
);

-- 2. retail_inventory_items
DROP POLICY IF EXISTS "Users can view their institution's retail_inventory_items" ON public.retail_inventory_items;
DROP POLICY IF EXISTS "Admins can manage their institution's retail_inventory_items" ON public.retail_inventory_items;
DROP POLICY IF EXISTS "Users can view retail_inventory_items" ON public.retail_inventory_items;
DROP POLICY IF EXISTS "Admins can manage retail_inventory_items" ON public.retail_inventory_items;

CREATE POLICY "Users can view retail_inventory_items" ON public.retail_inventory_items
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

CREATE POLICY "Admins can manage retail_inventory_items" ON public.retail_inventory_items
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
);

-- 3. retail_store_stock
DROP POLICY IF EXISTS "Users can view store stock for their institution" ON public.retail_store_stock;
DROP POLICY IF EXISTS "Admins can manage store stock for their institution" ON public.retail_store_stock;
DROP POLICY IF EXISTS "Users can view retail_store_stock" ON public.retail_store_stock;
DROP POLICY IF EXISTS "Admins can manage retail_store_stock" ON public.retail_store_stock;

CREATE POLICY "Users can view retail_store_stock" ON public.retail_store_stock
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.retail_stores s WHERE s.id = store_id AND (s.institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin'))
);

CREATE POLICY "Admins can manage retail_store_stock" ON public.retail_store_stock
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.retail_stores s 
        WHERE s.id = store_id 
        AND (
            (s.institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
            OR get_curr_user_role() = 'super_admin'
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.retail_stores s 
        WHERE s.id = store_id 
        AND (
            (s.institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
            OR get_curr_user_role() = 'super_admin'
        )
    )
);

-- 4. retail_serialized_items
DROP POLICY IF EXISTS "Users can view serialized items for their institution" ON public.retail_serialized_items;
DROP POLICY IF EXISTS "Admins can manage serialized items for their institution" ON public.retail_serialized_items;
DROP POLICY IF EXISTS "Users can view retail_serialized_items" ON public.retail_serialized_items;
DROP POLICY IF EXISTS "Admins can manage retail_serialized_items" ON public.retail_serialized_items;

CREATE POLICY "Users can view retail_serialized_items" ON public.retail_serialized_items
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

CREATE POLICY "Admins can manage retail_serialized_items" ON public.retail_serialized_items
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
);

-- 5. retail_stock_transfers
DROP POLICY IF EXISTS "Users can view stock transfers for their institution" ON public.retail_stock_transfers;
DROP POLICY IF EXISTS "Admins can manage stock transfers for their institution" ON public.retail_stock_transfers;
DROP POLICY IF EXISTS "Users can view retail_stock_transfers" ON public.retail_stock_transfers;
DROP POLICY IF EXISTS "Admins can manage retail_stock_transfers" ON public.retail_stock_transfers;

CREATE POLICY "Users can view retail_stock_transfers" ON public.retail_stock_transfers
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

CREATE POLICY "Admins can manage retail_stock_transfers" ON public.retail_stock_transfers
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
);

-- 6. retail_stock_transfer_items
DROP POLICY IF EXISTS "Users can view stock transfer items for their institution" ON public.retail_stock_transfer_items;
DROP POLICY IF EXISTS "Admins can manage stock transfer items for their institution" ON public.retail_stock_transfer_items;
DROP POLICY IF EXISTS "Users can view retail_stock_transfer_items" ON public.retail_stock_transfer_items;
DROP POLICY IF EXISTS "Admins can manage retail_stock_transfer_items" ON public.retail_stock_transfer_items;

CREATE POLICY "Users can view retail_stock_transfer_items" ON public.retail_stock_transfer_items
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.retail_stock_transfers t WHERE t.id = transfer_id AND (t.institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin'))
);

CREATE POLICY "Admins can manage retail_stock_transfer_items" ON public.retail_stock_transfer_items
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.retail_stock_transfers t 
        WHERE t.id = transfer_id 
        AND (
            (t.institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
            OR get_curr_user_role() = 'super_admin'
        )
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.retail_stock_transfers t 
        WHERE t.id = transfer_id 
        AND (
            (t.institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
            OR get_curr_user_role() = 'super_admin'
        )
    )
);

-- 7. retail_wishlist
DROP POLICY IF EXISTS "Users can view wishlist for their institution" ON public.retail_wishlist;
DROP POLICY IF EXISTS "Admins/Agents can manage wishlist for their institution" ON public.retail_wishlist;
DROP POLICY IF EXISTS "Users can view retail_wishlist" ON public.retail_wishlist;
DROP POLICY IF EXISTS "Admins can manage retail_wishlist" ON public.retail_wishlist;

CREATE POLICY "Users can view retail_wishlist" ON public.retail_wishlist
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

CREATE POLICY "Admins can manage retail_wishlist" ON public.retail_wishlist
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
);

-- 8. retail_commissions_ledger
DROP POLICY IF EXISTS "Agents can view their own commissions" ON public.retail_commissions_ledger;
DROP POLICY IF EXISTS "Admins can view and manage all commissions" ON public.retail_commissions_ledger;
DROP POLICY IF EXISTS "Users can view retail_commissions" ON public.retail_commissions_ledger;
DROP POLICY IF EXISTS "Admins can manage retail_commissions" ON public.retail_commissions_ledger;

CREATE POLICY "Users can view retail_commissions" ON public.retail_commissions_ledger
FOR SELECT USING (
    (institution_id = get_curr_user_inst_id() AND agent_id = auth.uid())
    OR (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
);

CREATE POLICY "Admins can manage retail_commissions" ON public.retail_commissions_ledger
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
);

-- 9. retail_sales
DROP POLICY IF EXISTS "Users can view their institution's retail_sales" ON public.retail_sales;
DROP POLICY IF EXISTS "Admins/Agents can record their institution's retail_sales" ON public.retail_sales;
DROP POLICY IF EXISTS "Users can view retail_sales" ON public.retail_sales;
DROP POLICY IF EXISTS "Admins can manage retail_sales" ON public.retail_sales;

CREATE POLICY "Users can view retail_sales" ON public.retail_sales
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

CREATE POLICY "Admins can manage retail_sales" ON public.retail_sales
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'academics_officer', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN ('admin', 'head_teacher', 'agrovet_admin', 'property_admin', 'carwash_admin', 'transport_admin', 'boarding_master', 'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'))
    OR get_curr_user_role() = 'super_admin'
);
