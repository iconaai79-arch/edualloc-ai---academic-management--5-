-- Migration: Add NCBA Bank support
-- Purpose: Store NCBA API credentials and track transactions

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS ncba_config JSONB;

CREATE TABLE IF NOT EXISTS ncba_transactions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL, -- CheckoutRequestID or Reference
    institution_id TEXT NOT NULL REFERENCES institutions(id),
    amount NUMERIC(15, 2) NOT NULL,
    phone_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, completed, failed
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for status and institution queries
CREATE INDEX IF NOT EXISTS idx_ncba_txn_status ON ncba_transactions(status);
CREATE INDEX IF NOT EXISTS idx_ncba_txn_institution ON ncba_transactions(institution_id);
