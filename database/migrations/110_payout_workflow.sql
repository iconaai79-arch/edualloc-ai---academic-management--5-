-- Migration: Payout Workflow Enhancement
-- Description: Adds tracking columns for initiation and approval of farmer payouts.

-- 1. Update coop_monthly_payouts table
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS initiated_by TEXT REFERENCES users(id);
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS initiated_at TIMESTAMPTZ;
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES users(id);
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS batch_id TEXT;
ALTER TABLE coop_monthly_payouts ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 2. Update status constraint
-- First drop existing constraint if possible, but in Postgres we usually just add a new one or replace it.
-- We'll add a new CHECK constraint and rely on application logic to handle state transitions.
ALTER TABLE coop_monthly_payouts DROP CONSTRAINT IF EXISTS coop_monthly_payouts_status_check;
ALTER TABLE coop_monthly_payouts ADD CONSTRAINT coop_monthly_payouts_status_check 
    CHECK (status IN ('pending', 'initiated', 'approved', 'paid', 'rejected'));
