-- Migration: Fix Cooperative RLS Policies
-- Description: Adds Super Admin bypass to all cooperative-related tables to ensure visibility when managing tenants.

-- 1. Coop Farmers
DROP POLICY IF EXISTS "Staff can view their institution farmers v2" ON coop_farmers;
CREATE POLICY "Staff can view their institution farmers v2" ON coop_farmers 
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Staff can manage their institution farmers v2" ON coop_farmers;
CREATE POLICY "Staff can manage their institution farmers v2" ON coop_farmers 
FOR ALL USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

-- 2. Coop Riders
DROP POLICY IF EXISTS "Staff can view their institution coop riders" ON coop_riders;
CREATE POLICY "Staff can view their institution coop riders" ON coop_riders 
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Staff can manage their institution coop riders" ON coop_riders;
CREATE POLICY "Staff can manage their institution coop riders" ON coop_riders 
FOR ALL USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

-- 3. Coop Collections
DROP POLICY IF EXISTS "Staff can view their institution coop collections" ON coop_collections;
CREATE POLICY "Staff can view their institution coop collections" ON coop_collections 
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Staff can manage their institution coop collections" ON coop_collections;
CREATE POLICY "Staff can manage their institution coop collections" ON coop_collections 
FOR ALL USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

-- 4. Coop Agrovet Inventory
DROP POLICY IF EXISTS "Staff can view their institution coop agrovet inventory" ON coop_agrovet_inventory;
CREATE POLICY "Staff can view their institution coop agrovet inventory" ON coop_agrovet_inventory 
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Staff can manage their institution coop agrovet inventory" ON coop_agrovet_inventory;
CREATE POLICY "Staff can manage their institution coop agrovet inventory" ON coop_agrovet_inventory 
FOR ALL USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

-- 5. Coop Agrovet Sales
DROP POLICY IF EXISTS "Staff can view their institution coop agrovet sales" ON coop_agrovet_sales;
CREATE POLICY "Staff can view their institution coop agrovet sales" ON coop_agrovet_sales 
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Staff can manage their institution coop agrovet sales" ON coop_agrovet_sales;
CREATE POLICY "Staff can manage their institution coop agrovet sales" ON coop_agrovet_sales 
FOR ALL USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

-- 6. SACCO Accounts
DROP POLICY IF EXISTS "Staff can view their institution sacco accounts" ON sacco_accounts;
CREATE POLICY "Staff can view their institution sacco accounts" ON sacco_accounts 
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Staff can manage their institution sacco accounts" ON sacco_accounts;
CREATE POLICY "Staff can manage their institution sacco accounts" ON sacco_accounts 
FOR ALL USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

-- 7. SACCO Transactions
DROP POLICY IF EXISTS "Staff can view their institution sacco transactions" ON sacco_transactions;
CREATE POLICY "Staff can view their institution sacco transactions" ON sacco_transactions 
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Staff can manage their institution sacco transactions" ON sacco_transactions;
CREATE POLICY "Staff can manage their institution sacco transactions" ON sacco_transactions 
FOR ALL USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

-- 8. Coop Monthly Payouts
DROP POLICY IF EXISTS "Staff can view their institution coop monthly payouts" ON coop_monthly_payouts;
CREATE POLICY "Staff can view their institution coop monthly payouts" ON coop_monthly_payouts 
FOR SELECT USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Staff can manage their institution coop monthly payouts" ON coop_monthly_payouts;
CREATE POLICY "Staff can manage their institution coop monthly payouts" ON coop_monthly_payouts 
FOR ALL USING (institution_id = get_curr_user_inst_id() OR get_curr_user_role() = 'super_admin');
