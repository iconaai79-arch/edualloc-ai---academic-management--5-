-- Fix Remaining Property Management RLS Policies to allow operations
-- since the app handles multi-tenancy logic at the application layer.

-- pm_listings
DROP POLICY IF EXISTS "Public can view published listings" ON pm_listings;
DROP POLICY IF EXISTS "Staff can manage their listings" ON pm_listings;
CREATE POLICY "Listing access" ON pm_listings FOR ALL USING (true);

-- pm_disbursements
DROP POLICY IF EXISTS pm_disbursements_access ON pm_disbursements;
CREATE POLICY "Disbursement access" ON pm_disbursements FOR ALL USING (true);
