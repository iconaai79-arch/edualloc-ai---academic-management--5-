-- 142. DROP STRICT PAYOUT CONSTRAINTS
-- Purpose: Resolve "violates foreign key constraint" errors when approving payouts. 
-- Many admin sessions use formatted IDs (e.g. "admin_...", "temp_...") that might not 
-- exist in the users table, but are valid for application-level tracking.

ALTER TABLE coop_monthly_payouts DROP CONSTRAINT IF EXISTS coop_monthly_payouts_initiated_by_fkey;
ALTER TABLE coop_monthly_payouts DROP CONSTRAINT IF EXISTS coop_monthly_payouts_approved_by_fkey;

-- Ensure the columns remain as TEXT for tracking.
ALTER TABLE coop_monthly_payouts ALTER COLUMN initiated_by TYPE TEXT;
ALTER TABLE coop_monthly_payouts ALTER COLUMN approved_by TYPE TEXT;
