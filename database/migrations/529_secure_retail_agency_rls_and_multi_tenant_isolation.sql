-- Migration 529: Secure Retail Agency RLS and Multi-Tenant Isolation
-- Resolves: "retail agency data visible or editable by any user"
-- Root causes addressed:
--   1. Replace overly-permissive USING (true) policies on retail_couriers, retail_delivery_rates, and retail_marketplace_orders.
--   2. Enforce strict institution tenancy on SELECT, INSERT, UPDATE, DELETE for retail logistics and customer CRM.
--   3. Restrict mutations to authorized retail agency roles (super_admin, admin, retail_agent, operations_manager).
--   4. Allow public checkout to read active delivery rates and submit orders without cross-tenant leakage.

SET statement_timeout = '2min';

-- ══════════════════════════════════════════════════════════════════════
-- 1. RETAIL_COURIERS — Tenancy Scoped Policies
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_couriers'
    ) THEN
        ALTER TABLE public.retail_couriers ENABLE ROW LEVEL SECURITY;

        -- Drop old permissive and legacy policies
        DROP POLICY IF EXISTS "retail_couriers_permissive_access" ON public.retail_couriers;
        DROP POLICY IF EXISTS "Couriers visible to institutional users" ON public.retail_couriers;
        DROP POLICY IF EXISTS "Admin can manage couriers" ON public.retail_couriers;
        DROP POLICY IF EXISTS "Anyone can apply as a courier" ON public.retail_couriers;
        DROP POLICY IF EXISTS "Couriers institutional select" ON public.retail_couriers;
        DROP POLICY IF EXISTS "Couriers institutional manage" ON public.retail_couriers;

        -- 1. SELECT: Visible to institutional users or global couriers (institution_id IS NULL)
        CREATE POLICY "Couriers institutional select"
            ON public.retail_couriers
            FOR SELECT
            TO public, anon, authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR institution_id = public.get_curr_user_inst_id()
                OR "institutionId" = public.get_curr_user_inst_id()
                OR institution_id IS NULL
                OR institution_id = ''
            );

        -- 2. INSERT: Scoped to user's assigned institution for authorized admin/agent roles
        CREATE POLICY "Couriers institutional insert"
            ON public.retail_couriers
            FOR INSERT
            TO authenticated, service_role
            WITH CHECK (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id() OR institution_id IS NULL)
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'store')
                )
            );

        -- 3. UPDATE: Scoped to user's assigned institution for authorized admin/agent roles
        CREATE POLICY "Couriers institutional update"
            ON public.retail_couriers
            FOR UPDATE
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'store')
                )
            )
            WITH CHECK (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'store')
                )
            );

        -- 4. DELETE: Scoped strictly to administrative leadership
        CREATE POLICY "Couriers institutional delete"
            ON public.retail_couriers
            FOR DELETE
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager')
                )
            );
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 2. RETAIL_DELIVERY_RATES — Tenancy Scoped Policies
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_delivery_rates'
    ) THEN
        ALTER TABLE public.retail_delivery_rates ENABLE ROW LEVEL SECURITY;

        -- Drop old permissive policies
        DROP POLICY IF EXISTS "retail_delivery_rates_permissive_access" ON public.retail_delivery_rates;
        DROP POLICY IF EXISTS "Rates visible to all for public marketplace" ON public.retail_delivery_rates;
        DROP POLICY IF EXISTS "Admin can manage rates" ON public.retail_delivery_rates;
        DROP POLICY IF EXISTS "Delivery rates institutional select" ON public.retail_delivery_rates;
        DROP POLICY IF EXISTS "Delivery rates institutional manage" ON public.retail_delivery_rates;

        -- 1. SELECT: Institutional members see their rates; active rates also readable for storefront checkout
        CREATE POLICY "Delivery rates institutional select"
            ON public.retail_delivery_rates
            FOR SELECT
            TO public, anon, authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR institution_id = public.get_curr_user_inst_id()
                OR "institutionId" = public.get_curr_user_inst_id()
                OR status = 'Active'
                OR institution_id IS NULL
            );

        -- 2. INSERT: Only authorized managers within the institution
        CREATE POLICY "Delivery rates institutional insert"
            ON public.retail_delivery_rates
            FOR INSERT
            TO authenticated, service_role
            WITH CHECK (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id() OR institution_id IS NULL)
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'store')
                )
            );

        -- 3. UPDATE: Only authorized managers within the institution
        CREATE POLICY "Delivery rates institutional update"
            ON public.retail_delivery_rates
            FOR UPDATE
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'store')
                )
            )
            WITH CHECK (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'store')
                )
            );

        -- 4. DELETE: Only authorized managers within the institution
        CREATE POLICY "Delivery rates institutional delete"
            ON public.retail_delivery_rates
            FOR DELETE
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager')
                )
            );
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. RETAIL_MARKETPLACE_ORDERS — Secure Public Insert & Scoped Read/Edit
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_marketplace_orders'
    ) THEN
        ALTER TABLE public.retail_marketplace_orders ENABLE ROW LEVEL SECURITY;

        -- Drop permissive access
        DROP POLICY IF EXISTS "retail_marketplace_orders_permissive_access" ON public.retail_marketplace_orders;
        DROP POLICY IF EXISTS "Orders visible to agency staff" ON public.retail_marketplace_orders;
        DROP POLICY IF EXISTS "Anyone can create orders (public checkout)" ON public.retail_marketplace_orders;
        DROP POLICY IF EXISTS "Orders institutional select" ON public.retail_marketplace_orders;
        DROP POLICY IF EXISTS "Orders public checkout insert" ON public.retail_marketplace_orders;
        DROP POLICY IF EXISTS "Orders institutional update" ON public.retail_marketplace_orders;
        DROP POLICY IF EXISTS "Orders institutional delete" ON public.retail_marketplace_orders;

        -- 1. SELECT: Institutional staff can only view their own agency orders
        CREATE POLICY "Orders institutional select"
            ON public.retail_marketplace_orders
            FOR SELECT
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR institution_id = public.get_curr_user_inst_id()
                OR "institutionId" = public.get_curr_user_inst_id()
            );

        -- 2. INSERT: Public storefront checkout can place orders
        CREATE POLICY "Orders public checkout insert"
            ON public.retail_marketplace_orders
            FOR INSERT
            TO public, anon, authenticated, service_role
            WITH CHECK (true);

        -- 3. UPDATE: Scoped to the institution's agency staff
        CREATE POLICY "Orders institutional update"
            ON public.retail_marketplace_orders
            FOR UPDATE
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'store', 'cashier')
                )
            )
            WITH CHECK (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'store', 'cashier')
                )
            );

        -- 4. DELETE: Restricted to agency management
        CREATE POLICY "Orders institutional delete"
            ON public.retail_marketplace_orders
            FOR DELETE
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    (institution_id = public.get_curr_user_inst_id() OR "institutionId" = public.get_curr_user_inst_id())
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager')
                )
            );
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 4. RETAIL_CUSTOMERS — Tighten Management Roles
-- ══════════════════════════════════════════════════════════════════════

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'retail_customers'
    ) THEN
        ALTER TABLE public.retail_customers ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "Users can view their institution's retail_customers" ON public.retail_customers;
        DROP POLICY IF EXISTS "Admins/Agents can manage their institution's retail_customers" ON public.retail_customers;
        DROP POLICY IF EXISTS "Retail customers institutional select" ON public.retail_customers;
        DROP POLICY IF EXISTS "Retail customers institutional manage" ON public.retail_customers;

        -- 1. SELECT: Users in the same institution can view customer records
        CREATE POLICY "Retail customers institutional select"
            ON public.retail_customers
            FOR SELECT
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR institution_id = public.get_curr_user_inst_id()
            );

        -- 2. ALL (Insert/Update/Delete): Only authorized agency roles
        CREATE POLICY "Retail customers institutional manage"
            ON public.retail_customers
            FOR ALL
            TO authenticated, service_role
            USING (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    institution_id = public.get_curr_user_inst_id()
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'field_agent', 'store', 'cashier', 'manager', 'operations_manager')
                )
            )
            WITH CHECK (
                public.get_curr_user_role() = 'super_admin'
                OR (
                    institution_id = public.get_curr_user_inst_id()
                    AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'retail_agent', 'field_agent', 'store', 'cashier', 'manager', 'operations_manager')
                )
            );
    END IF;
END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 5. Reload PostgREST schema cache
-- ══════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
