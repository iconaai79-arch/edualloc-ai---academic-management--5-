-- ==========================================================
-- 310. CREATE HIS INVOICES, PAYMENTS & INSURANCE REMITTANCES
-- Ensures full persistence for HIS billing, cashier checkout,
-- patient invoicing, receipting, and remittances across sessions.
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.his_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    patient_id TEXT,
    patient_name TEXT NOT NULL,
    invoice_number TEXT NOT NULL,
    payer_type TEXT DEFAULT 'Self-Pay',
    insurance_provider TEXT,
    policy_number TEXT,
    copay_amount NUMERIC(12, 2) DEFAULT 0,
    insurance_cover_amount NUMERIC(12, 2) DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    amount_paid NUMERIC(12, 2) DEFAULT 0,
    balance NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    payment_method TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_payments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    invoice_id TEXT,
    patient_id TEXT,
    patient_name TEXT,
    receipt_number TEXT,
    amount NUMERIC(12, 2) DEFAULT 0,
    payment_method TEXT,
    transaction_reference TEXT,
    payment_date DATE DEFAULT CURRENT_DATE,
    notes TEXT,
    status TEXT DEFAULT 'Verified',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_insurance_remittances (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    ref_no TEXT NOT NULL,
    billed_amount NUMERIC(12, 2) DEFAULT 0,
    paid_amount NUMERIC(12, 2) DEFAULT 0,
    disallowed_amount NUMERIC(12, 2) DEFAULT 0,
    balance NUMERIC(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'Settled',
    date DATE DEFAULT CURRENT_DATE,
    officer TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_his_invoices_inst ON public.his_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_his_invoices_pat ON public.his_invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_his_invoices_status ON public.his_invoices(status);
CREATE INDEX IF NOT EXISTS idx_his_invoices_num ON public.his_invoices(invoice_number);

CREATE INDEX IF NOT EXISTS idx_his_payments_inst ON public.his_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_his_payments_inv ON public.his_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_his_payments_pat ON public.his_payments(patient_id);

CREATE INDEX IF NOT EXISTS idx_his_remittances_inst ON public.his_insurance_remittances(institution_id);

-- Enable RLS
ALTER TABLE public.his_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_insurance_remittances ENABLE ROW LEVEL SECURITY;

-- Scoped Institutional Tenancy RLS Policies
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['his_invoices', 'his_payments', 'his_insurance_remittances'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Public and auth access for %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_all" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;
