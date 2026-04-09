-- Migration: Disbursement Tracking for Payouts
-- Description: Adds columns to track payment method and specific disbursement details.

ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS disbursement_method TEXT; -- 'mpesa', 'bank', 'cash', 'cheque'
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS disbursement_reference TEXT;
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS disbursement_account TEXT;
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS disbursement_date TIMESTAMPTZ;
