-- ============================================================
-- Migration 322: Ensure all columns exist on his_invoices,
-- his_payments, and his_insurance_remittances tables.
-- ============================================================

-- 1. Ensure Table Exists
CREATE TABLE IF NOT EXISTS public.his_invoices (
    id                      TEXT PRIMARY KEY,
    institution_id          TEXT NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Safely add all columns to his_invoices
ALTER TABLE public.his_invoices
    ADD COLUMN IF NOT EXISTS institution_id TEXT,
    ADD COLUMN IF NOT EXISTS "institutionId" TEXT,
    ADD COLUMN IF NOT EXISTS patient_id TEXT,
    ADD COLUMN IF NOT EXISTS "patientId" TEXT,
    ADD COLUMN IF NOT EXISTS patient_name TEXT,
    ADD COLUMN IF NOT EXISTS "patientName" TEXT,
    ADD COLUMN IF NOT EXISTS invoice_number TEXT,
    ADD COLUMN IF NOT EXISTS "invoiceNumber" TEXT,
    ADD COLUMN IF NOT EXISTS payer_type TEXT DEFAULT 'Self-Pay',
    ADD COLUMN IF NOT EXISTS "payerType" TEXT,
    ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
    ADD COLUMN IF NOT EXISTS "insuranceProvider" TEXT,
    ADD COLUMN IF NOT EXISTS policy_number TEXT,
    ADD COLUMN IF NOT EXISTS "policyNumber" TEXT,
    ADD COLUMN IF NOT EXISTS copay_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "copayAmount" NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS insurance_cover_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "insuranceCoverAmount" NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "amountPaid" NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending',
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
    ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure his_payments columns
CREATE TABLE IF NOT EXISTS public.his_payments (
    id                      TEXT PRIMARY KEY,
    institution_id          TEXT NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.his_payments
    ADD COLUMN IF NOT EXISTS institution_id TEXT,
    ADD COLUMN IF NOT EXISTS "institutionId" TEXT,
    ADD COLUMN IF NOT EXISTS invoice_id TEXT,
    ADD COLUMN IF NOT EXISTS "invoiceId" TEXT,
    ADD COLUMN IF NOT EXISTS patient_id TEXT,
    ADD COLUMN IF NOT EXISTS "patientId" TEXT,
    ADD COLUMN IF NOT EXISTS patient_name TEXT,
    ADD COLUMN IF NOT EXISTS "patientName" TEXT,
    ADD COLUMN IF NOT EXISTS receipt_number TEXT,
    ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT,
    ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS payment_method TEXT,
    ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT,
    ADD COLUMN IF NOT EXISTS transaction_reference TEXT,
    ADD COLUMN IF NOT EXISTS "transactionReference" TEXT,
    ADD COLUMN IF NOT EXISTS payment_date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS "paymentDate" DATE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Verified',
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure his_insurance_remittances columns
CREATE TABLE IF NOT EXISTS public.his_insurance_remittances (
    id                      TEXT PRIMARY KEY,
    institution_id          TEXT NOT NULL,
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.his_insurance_remittances
    ADD COLUMN IF NOT EXISTS institution_id TEXT,
    ADD COLUMN IF NOT EXISTS "institutionId" TEXT,
    ADD COLUMN IF NOT EXISTS provider TEXT,
    ADD COLUMN IF NOT EXISTS ref_no TEXT,
    ADD COLUMN IF NOT EXISTS "refNo" TEXT,
    ADD COLUMN IF NOT EXISTS billed_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "billedAmount" NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "paidAmount" NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS disallowed_amount NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "disallowedAmount" NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS balance NUMERIC(12, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Settled',
    ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE,
    ADD COLUMN IF NOT EXISTS officer TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Safely drop restrictive FK constraints
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT conname, conrelid::regclass AS tablename
        FROM pg_constraint
        WHERE conrelid::regclass::text IN ('his_invoices', 'public.his_invoices', 'his_payments', 'public.his_payments', 'his_insurance_remittances', 'public.his_insurance_remittances')
          AND contype = 'f'
          AND conname NOT LIKE '%institution%'
    ) LOOP
        EXECUTE 'ALTER TABLE ' || r.tablename || ' DROP CONSTRAINT IF EXISTS ' || quote_ident(r.conname) || ' CASCADE;';
    END LOOP;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_his_invoices_inst ON public.his_invoices (institution_id);
CREATE INDEX IF NOT EXISTS idx_his_invoices_patient ON public.his_invoices (patient_id);
CREATE INDEX IF NOT EXISTS idx_his_invoices_status ON public.his_invoices (status);
CREATE INDEX IF NOT EXISTS idx_his_payments_inst ON public.his_payments (institution_id);
CREATE INDEX IF NOT EXISTS idx_his_payments_invoice ON public.his_payments (invoice_id);

-- 6. RLS
ALTER TABLE public.his_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.his_insurance_remittances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_invoices_all" ON public.his_invoices;
CREATE POLICY "his_invoices_all" ON public.his_invoices FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "his_payments_all" ON public.his_payments;
CREATE POLICY "his_payments_all" ON public.his_payments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "his_insurance_remittances_all" ON public.his_insurance_remittances;
CREATE POLICY "his_insurance_remittances_all" ON public.his_insurance_remittances FOR ALL USING (true) WITH CHECK (true);

-- 7. Permissions
GRANT ALL ON public.his_invoices TO anon, authenticated, service_role;
GRANT ALL ON public.his_payments TO anon, authenticated, service_role;
GRANT ALL ON public.his_insurance_remittances TO anon, authenticated, service_role;

NOTIFY pgrst, 'reload schema';
