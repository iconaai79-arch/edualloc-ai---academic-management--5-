-- ============================================================================
-- MIGRATION 551: CREATE bank_feed_transactions TABLE (TALKSASA / POSTGRESQL SAFE)
-- Resolves: ERROR: relation "bank_feed_transactions" does not exist
-- Safe, idempotent, and compatible with standalone PostgreSQL (no Supabase auth.* dependencies).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.bank_feed_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    provider TEXT NOT NULL DEFAULT 'BANK_FEED',
    transaction_reference TEXT,
    bill_reference_number TEXT,
    payer_name TEXT,
    payer_phone TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transaction_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'UNMATCHED_SUSPENSE',
    matched_student_id TEXT,
    matched_student_name TEXT,
    matched_student_adm TEXT,
    generated_receipt_id TEXT,
    generated_receipt_number TEXT,
    reconciliation_confidence TEXT DEFAULT 'NONE',
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_feed_transactions_inst_id
    ON public.bank_feed_transactions(institution_id);

CREATE INDEX IF NOT EXISTS idx_bank_feed_transactions_inst_created
    ON public.bank_feed_transactions(institution_id, created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_bank_feed_transactions_ref
    ON public.bank_feed_transactions(transaction_reference);

CREATE INDEX IF NOT EXISTS idx_bank_feed_transactions_status
    ON public.bank_feed_transactions(status);

CREATE INDEX IF NOT EXISTS idx_bank_feed_transactions_student_id
    ON public.bank_feed_transactions(matched_student_id);
