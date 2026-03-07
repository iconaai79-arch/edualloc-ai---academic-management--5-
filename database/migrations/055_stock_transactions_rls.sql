-- 055_stock_transactions_rls.sql
-- Specific RLS for stock_transactions

-- 1. Enable RLS
ALTER TABLE public.stock_transactions ENABLE ROW LEVEL SECURITY;

-- 2. Grant permissions
GRANT ALL ON public.stock_transactions TO anon, authenticated, service_role;

-- 3. Drop existing if any
DROP POLICY IF EXISTS "stock_transactions_tenancy_select" ON public.stock_transactions;
DROP POLICY IF EXISTS "stock_transactions_tenancy_manage" ON public.stock_transactions;

-- 4. SELECT: Super Admin OR same institution
CREATE POLICY "stock_transactions_tenancy_select"
    ON public.stock_transactions
    FOR SELECT
    USING (
        (public.get_curr_user_role() = 'super_admin') 
        OR (institution_id::text = public.get_curr_user_inst_id())
    );

-- 5. ALL: Super Admin OR Admins/Inventory Managers in same institution
CREATE POLICY "stock_transactions_tenancy_manage"
    ON public.stock_transactions
    FOR ALL
    USING (
        (public.get_curr_user_role() = 'super_admin')
        OR (
            institution_id::text = public.get_curr_user_inst_id()
            AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'carwash_admin', 'agrovet_admin', 'property_admin', 'inventory_manager')
        )
    );

DO $$ BEGIN
    RAISE NOTICE 'RLS enabled and policies applied for stock_transactions.';
END $$;
