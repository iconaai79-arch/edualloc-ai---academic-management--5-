-- Path: database/migrations/270_create_gok_capitation_logs.sql
-- Migration: Create GoK Capitation Logs table

CREATE TABLE IF NOT EXISTS public.gok_capitation_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    enrolment_count INTEGER NOT NULL CHECK (enrolment_count >= 0),
    disbursement_rate DECIMAL(15, 2) NOT NULL,
    sne_count INTEGER DEFAULT 0 CHECK (sne_count >= 0),
    sne_rate DECIMAL(15, 2) DEFAULT 0.00,
    tranche_name TEXT NOT NULL, -- 'term_1' | 'term_2' | 'term_3'
    tranche_percentage DECIMAL(5, 2) NOT NULL, -- 50.00 | 30.00 | 20.00
    reference_number TEXT,
    bank_account_id TEXT REFERENCES school_bank_accounts(id) ON DELETE SET NULL,
    total_received DECIMAL(15, 2) NOT NULL CHECK (total_received >= 0),
    simba_amount DECIMAL(15, 2) NOT NULL CHECK (simba_amount >= 0),
    gpa_amount DECIMAL(15, 2) NOT NULL CHECK (gpa_amount >= 0),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.gok_capitation_logs ENABLE ROW LEVEL SECURITY;

-- Permissive policy
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.gok_capitation_logs;
CREATE POLICY "Enable all access for authenticated users" ON public.gok_capitation_logs FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

GRANT ALL ON public.gok_capitation_logs TO anon, authenticated, service_role;
