-- Migration: Fix SACCO Schema Discrepancies
-- Description: Adds missing columns to sacco_accounts and sacco_transactions to align with the frontend types.

-- 1. Update sacco_accounts
ALTER TABLE sacco_accounts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'closed'));
-- Ensure existing accounts have 'active' status
UPDATE sacco_accounts SET status = 'active' WHERE status IS NULL;

-- 2. Update sacco_transactions
ALTER TABLE sacco_transactions ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sacco_transactions ADD COLUMN IF NOT EXISTS reference TEXT;

-- Align transaction types for sacco_transactions
-- Interface expects: 'deposit', 'withdrawal', 'loan_repayment', 'dividend'
-- Table currently has: 'deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'interest'
ALTER TABLE sacco_transactions DROP CONSTRAINT IF EXISTS sacco_transactions_transaction_type_check;
ALTER TABLE sacco_transactions ADD CONSTRAINT sacco_transactions_transaction_type_check CHECK (transaction_type IN ('deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'interest', 'dividend'));

-- 3. Indices for performance
CREATE INDEX IF NOT EXISTS idx_sacco_accounts_status ON sacco_accounts(status);
CREATE INDEX IF NOT EXISTS idx_sacco_transactions_date ON sacco_transactions(transaction_date);
