-- Migration 509: Create Transport Logistics SACCO Savings, Remittances, Loans, and Settings Schema
-- Path: database/migrations/509_create_transport_sacco_savings_and_remittances.sql
-- Description: Establishes dedicated relational tables for Fleet SACCO member savings accounts, daily remittances, loan desks, and policy configurations.

-- 1. Transport SACCO Member Accounts Registry
CREATE TABLE IF NOT EXISTS public.transport_sacco_accounts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    member_number TEXT NOT NULL,
    member_role TEXT NOT NULL DEFAULT 'Driver', -- 'Owner', 'Driver', 'Conductor', 'Staff'
    phone_number TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    vehicle_model TEXT,
    savings_category TEXT NOT NULL DEFAULT 'Daily Sinking Fund', -- 'Daily Sinking Fund', 'Share Capital', 'Welfare & Emergency', 'Fleet Expansion', 'Holiday Scheme'
    savings_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    share_capital NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    welfare_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    daily_target NUMERIC(14, 2) NOT NULL DEFAULT 1500.00,
    remittance_tier TEXT DEFAULT 'Silver',
    loan_eligibility NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Active', -- 'Active', 'Dormant', 'Suspended'
    joined_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    last_deposit_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Transport SACCO Savings & Welfare Transactions Ledger
CREATE TABLE IF NOT EXISTS public.transport_sacco_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    account_id TEXT NOT NULL REFERENCES public.transport_sacco_accounts(id) ON DELETE CASCADE,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    savings_category TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- 'deposit', 'withdrawal', 'dividend', 'welfare_claim'
    amount NUMERIC(14, 2) NOT NULL,
    payment_method TEXT NOT NULL DEFAULT 'mpesa', -- 'mpesa', 'bank', 'cash', 'daily_deduction'
    reference TEXT,
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Transport SACCO Daily Route Remittances & Clearance Badge Records
CREATE TABLE IF NOT EXISTS public.transport_sacco_daily_remittances (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    account_id TEXT REFERENCES public.transport_sacco_accounts(id) ON DELETE SET NULL,
    member_id TEXT NOT NULL,
    member_name TEXT NOT NULL,
    vehicle_plate TEXT NOT NULL,
    driver_name TEXT,
    driver_phone TEXT,
    tier_name TEXT NOT NULL DEFAULT 'Silver',
    base_amount NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    scheduled_date DATE NOT NULL DEFAULT CURRENT_DATE,
    submitted_at TIMESTAMPTZ,
    late_penalty NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    next_day_penalty NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    total_payable NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    amount_paid NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending', -- 'on_time', 'late', 'overdue', 'pending'
    payment_method TEXT NOT NULL DEFAULT 'mpesa', -- 'mpesa', 'cash', 'bank', 'daily_deduction'
    reference_number TEXT,
    notes TEXT,
    recorded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Transport SACCO Savings-Backed Credit Facility & Loan Applications
CREATE TABLE IF NOT EXISTS public.transport_sacco_loan_applications (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    account_id TEXT REFERENCES public.transport_sacco_accounts(id) ON DELETE SET NULL,
    member_id TEXT NOT NULL,
    applicant_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'Driver',
    vehicle_plate TEXT NOT NULL,
    amount_requested NUMERIC(14, 2) NOT NULL,
    tenure_months INTEGER NOT NULL DEFAULT 6,
    interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    monthly_installment NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    savings_at_application NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    max_limit_at_application NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'disbursed', 'rejected'
    reviewed_by TEXT,
    reviewed_at TIMESTAMPTZ,
    disbursed_at TIMESTAMPTZ,
    disbursement_reference TEXT,
    repayment_balance NUMERIC(14, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Transport SACCO Remittance & Loan Credit Configuration Settings
CREATE TABLE IF NOT EXISTS public.transport_sacco_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT UNIQUE NOT NULL,
    remittance_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    remittance_tiers JSONB NOT NULL DEFAULT '[{"id":"tier_silver","tierName":"Silver","dailyTarget":1500},{"id":"tier_gold","tierName":"Gold","dailyTarget":1700}]'::jsonb,
    cutoff_time TEXT NOT NULL DEFAULT '22:00',
    late_penalty_amount NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    next_day_cutoff_time TEXT NOT NULL DEFAULT '10:00',
    next_day_delay_penalty_amount NUMERIC(10, 2) NOT NULL DEFAULT 200.00,
    enforce_penalties BOOLEAN NOT NULL DEFAULT TRUE,
    sinking_fund_deduction NUMERIC(10, 2) DEFAULT 300.00,
    loans_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    loan_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 3.00,
    driver_min_savings_threshold NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    owner_min_savings_threshold NUMERIC(12, 2) NOT NULL DEFAULT 20000.00,
    conductor_min_savings_threshold NUMERIC(12, 2) NOT NULL DEFAULT 5000.00,
    staff_min_savings_threshold NUMERIC(12, 2) NOT NULL DEFAULT 10000.00,
    annual_interest_rate NUMERIC(5, 2) NOT NULL DEFAULT 12.00,
    max_repayment_months INTEGER NOT NULL DEFAULT 12,
    processing_fee_percent NUMERIC(5, 2) NOT NULL DEFAULT 1.50,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. High-Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_tsa_institution ON public.transport_sacco_accounts(institution_id);
CREATE INDEX IF NOT EXISTS idx_tsa_vehicle ON public.transport_sacco_accounts(vehicle_plate);
CREATE INDEX IF NOT EXISTS idx_tsa_member ON public.transport_sacco_accounts(member_id);
CREATE INDEX IF NOT EXISTS idx_tsa_status ON public.transport_sacco_accounts(status);

CREATE INDEX IF NOT EXISTS idx_tst_account ON public.transport_sacco_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_tst_institution ON public.transport_sacco_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_tst_date ON public.transport_sacco_transactions(recorded_at);

CREATE INDEX IF NOT EXISTS idx_tsdr_institution_date ON public.transport_sacco_daily_remittances(institution_id, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_tsdr_vehicle_status ON public.transport_sacco_daily_remittances(vehicle_plate, status);
CREATE INDEX IF NOT EXISTS idx_tsdr_member ON public.transport_sacco_daily_remittances(member_id);

CREATE INDEX IF NOT EXISTS idx_tsla_institution ON public.transport_sacco_loan_applications(institution_id);
CREATE INDEX IF NOT EXISTS idx_tsla_status ON public.transport_sacco_loan_applications(status);

CREATE INDEX IF NOT EXISTS idx_tss_institution ON public.transport_sacco_settings(institution_id);

-- 7. Row Level Security (RLS) & Policies
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'transport_sacco_accounts', 
        'transport_sacco_transactions', 
        'transport_sacco_daily_remittances', 
        'transport_sacco_loan_applications',
        'transport_sacco_settings'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (auth.role() IN (''authenticated'', ''anon'') OR public.get_curr_user_role()::text = ''super_admin'') WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (auth.role() = ''authenticated'' OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

-- 8. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
