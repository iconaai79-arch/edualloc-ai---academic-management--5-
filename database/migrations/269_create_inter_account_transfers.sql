-- Path: database/migrations/269_create_inter_account_transfers.sql
-- Migration: Create Inter Bank and Inter Vote Transfers tables

CREATE TABLE IF NOT EXISTS public.inter_bank_transfers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    source_bank_account_id TEXT NOT NULL REFERENCES school_bank_accounts(id) ON DELETE CASCADE,
    destination_bank_account_id TEXT NOT NULL REFERENCES school_bank_accounts(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.inter_vote_transfers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    source_vote_head_id TEXT NOT NULL REFERENCES vote_heads(id) ON DELETE CASCADE,
    destination_vote_head_id TEXT NOT NULL REFERENCES vote_heads(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL CHECK (amount > 0),
    transfer_date DATE NOT NULL,
    reference_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.inter_bank_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inter_vote_transfers ENABLE ROW LEVEL SECURITY;

-- Permissive policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.inter_bank_transfers;
CREATE POLICY "Enable all access for authenticated users" ON public.inter_bank_transfers FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.inter_vote_transfers;
CREATE POLICY "Enable all access for authenticated users" ON public.inter_vote_transfers FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

GRANT ALL ON public.inter_bank_transfers TO anon, authenticated, service_role;
GRANT ALL ON public.inter_vote_transfers TO anon, authenticated, service_role;
