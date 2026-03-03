-- Fix Property Management RLS Policies to allow operations
-- since the app handles multi-tenancy logic at the application layer.

-- pm_properties
DROP POLICY IF EXISTS "Staff can view their property records" ON pm_properties;
DROP POLICY IF EXISTS "Staff can manage their property records" ON pm_properties;
CREATE POLICY "Property access" ON pm_properties FOR ALL USING (true);

-- pm_units
DROP POLICY IF EXISTS "Staff can view their units" ON pm_units;
DROP POLICY IF EXISTS "Staff can manage their units" ON pm_units;
CREATE POLICY "Unit access" ON pm_units FOR ALL USING (true);

-- pm_tenants
DROP POLICY IF EXISTS "Staff can view their tenants" ON pm_tenants;
DROP POLICY IF EXISTS "Staff can manage their tenants" ON pm_tenants;
CREATE POLICY "Tenant access" ON pm_tenants FOR ALL USING (true);

-- pm_leases
DROP POLICY IF EXISTS "Staff can view their leases" ON pm_leases;
DROP POLICY IF EXISTS "Staff can manage their leases" ON pm_leases;
CREATE POLICY "Lease access" ON pm_leases FOR ALL USING (true);

-- pm_payments
DROP POLICY IF EXISTS "Staff can view their payments" ON pm_payments;
DROP POLICY IF EXISTS "Staff can manage their payments" ON pm_payments;
CREATE POLICY "Payment access" ON pm_payments FOR ALL USING (true);

-- pm_maintenance
DROP POLICY IF EXISTS "Staff can view their maintenance tickets" ON pm_maintenance;
DROP POLICY IF EXISTS "Staff can manage their maintenance tickets" ON pm_maintenance;
CREATE POLICY "Maintenance access" ON pm_maintenance FOR ALL USING (true);
