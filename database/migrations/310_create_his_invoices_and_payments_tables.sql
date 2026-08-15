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

-- Permissive public & institutional policies
DROP POLICY IF EXISTS "Public and auth access for his_invoices" ON public.his_invoices;
CREATE POLICY "Public and auth access for his_invoices" ON public.his_invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access for his_payments" ON public.his_payments;
CREATE POLICY "Public and auth access for his_payments" ON public.his_payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public and auth access for his_insurance_remittances" ON public.his_insurance_remittances;
CREATE POLICY "Public and auth access for his_insurance_remittances" ON public.his_insurance_remittances FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.his_invoices TO anon, authenticated, service_role;
GRANT ALL ON public.his_payments TO anon, authenticated, service_role;
GRANT ALL ON public.his_insurance_remittances TO anon, authenticated, service_role;
