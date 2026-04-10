-- Migration: Add Shares type to SACCO accounts
-- Description: Updates the check constraint for sacco_accounts to include 'shares' type and ensures lowercase consistency.

-- 1. Update existing records if any have 'Savings' (Title Case) or other variations
UPDATE sacco_accounts SET account_type = 'savings' WHERE LOWER(account_type) = 'savings';
UPDATE sacco_accounts SET account_type = 'loan' WHERE LOWER(account_type) = 'loan';

-- 2. Drop and recreate the constraint to include 'shares'
ALTER TABLE sacco_accounts DROP CONSTRAINT IF EXISTS sacco_accounts_account_type_check;
ALTER TABLE sacco_accounts ADD CONSTRAINT sacco_accounts_account_type_check CHECK (account_type IN ('savings', 'loan', 'shares'));

-- 3. Ensure balance default is robust
ALTER TABLE sacco_accounts ALTER COLUMN balance SET DEFAULT 0.00;
UPDATE sacco_accounts SET balance = 0 WHERE balance IS NULL;
ALTER TABLE sacco_accounts ALTER COLUMN balance SET NOT NULL;
