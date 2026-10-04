-- Migration 452: Create bank_feed_transactions Table and Tenancy Policies
-- Fix: [API GET] Table 'bank_feed_transactions' not in DB schema cache, returning empty list.
-- Purpose:
--   Supports automated bank statement feeds (KCB, Co-op, Equity, NCBA) and real-time M-Pesa C2B webhook ingestion.
--   Provides automated matching, suspense management, and 3-way bank statement reconciliation in FinanceManager.

CREATE TABLE IF NOT EXISTS public.bank_feed_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    provider TEXT NOT NULL, -- 'MPESA_DARAJA', 'EQUITY_JENGA', 'KCB_BUNI', 'COOP_CONNECT', 'IM_BANK', 'NCBA_DIRECT'
    transaction_reference TEXT,
    bill_reference_number TEXT,
    payer_name TEXT,
    payer_phone TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    transaction_date DATE DEFAULT CURRENT_DATE,
    status TEXT NOT NULL DEFAULT 'UNMATCHED_SUSPENSE', -- 'MATCHED_AND_RECEIPTED', 'MATCHED_PENDING_APPROVAL', 'UNMATCHED_SUSPENSE', 'DUPLICATE_IGNORED'
    matched_student_id TEXT,
    matched_student_name TEXT,
    matched_student_adm TEXT,
    generated_receipt_id TEXT,
    generated_receipt_number TEXT,
    reconciliation_confidence TEXT DEFAULT 'NONE', -- 'EXACT_ADM', 'EXACT_PHONE', 'NAME_MATCH', 'MANUAL', 'NONE'
    raw_payload JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup, deduplication, and ordered queries
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

-- Enable Row Level Security (RLS)
ALTER TABLE public.bank_feed_transactions ENABLE ROW LEVEL SECURITY;

-- Apply institutional tenancy policies
DO $$
DECLARE
    t text := 'bank_feed_transactions';
BEGIN
    EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON public.%I FOR SELECT USING (
        institution_id = public.get_curr_user_inst_id() 
        OR public.get_curr_user_role() = ''super_admin''
        OR auth.role() = ''authenticated''
    )', t, t);

    EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON public.%I FOR ALL USING (
        institution_id = public.get_curr_user_inst_id() 
        OR public.get_curr_user_role() = ''super_admin''
        OR auth.role() = ''authenticated''
    )', t, t);

    EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
