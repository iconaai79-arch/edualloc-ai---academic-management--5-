-- Migration: Add Payment Method to Coop Farmers
-- Description: Adds a column to specify the preferred monthly payout settlement method for farmers.

ALTER TABLE coop_farmers ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'mpesa' CHECK (payment_method IN ('mpesa', 'bank', 'cash'));

-- Optional: Update existing records to have 'mpesa' as default if not already set
UPDATE coop_farmers SET payment_method = 'mpesa' WHERE payment_method IS NULL;
