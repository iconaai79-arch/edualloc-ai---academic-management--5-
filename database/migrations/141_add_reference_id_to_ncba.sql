-- 141. ADD REFERENCE_ID TO NCBA_TRANSACTIONS
-- Purpose: Store the bank-provided ReferenceID for reconciliation

ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS reference_id TEXT;
