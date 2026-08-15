-- ============================================================
-- Migration 312: Ensure his_billing_items exists (no FK deps)
-- Standalone safe re-creation that doesn't depend on his_patients
-- being present. Adds all columns the app actually writes.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.his_billing_items (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,

    -- Patient reference (soft, no FK so migration never fails)
    patient_id          TEXT,
    "patientId"         TEXT,
    patient_name        TEXT,
    "patientName"       TEXT,

    -- Billing metadata
    source_type         TEXT DEFAULT 'prescription',  -- pharmacy | lab | consultation | procedure
    source_id           TEXT,
    item_name           TEXT,
    "itemName"          TEXT,
    quantity            INTEGER DEFAULT 1,
    unit_price          DECIMAL(12,2) DEFAULT 0,
    "unitPrice"         DECIMAL(12,2),
    total_amount        DECIMAL(12,2) DEFAULT 0,
    "totalAmount"       DECIMAL(12,2),

    -- Payment state
    status              TEXT DEFAULT 'pending',        -- pending | invoiced | paid | partial
    payment_status      TEXT DEFAULT 'pending',
    "paymentStatus"     TEXT,
    amount_paid         DECIMAL(12,2) DEFAULT 0,
    "amountPaid"        DECIMAL(12,2),
    balance             DECIMAL(12,2) DEFAULT 0,
    payment_method      TEXT,
    "paymentMethod"     TEXT,
    paid_at             TIMESTAMPTZ,
    "paidAt"            TIMESTAMPTZ,

    -- Audit
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_his_billing_items_institution
    ON public.his_billing_items (institution_id);

CREATE INDEX IF NOT EXISTS idx_his_billing_items_patient
    ON public.his_billing_items (patient_id);

CREATE INDEX IF NOT EXISTS idx_his_billing_items_status
    ON public.his_billing_items (status);

-- RLS
ALTER TABLE public.his_billing_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_billing_items_all" ON public.his_billing_items;
CREATE POLICY "his_billing_items_all" ON public.his_billing_items
    FOR ALL USING (true) WITH CHECK (true);

-- Grants
GRANT ALL ON public.his_billing_items TO anon, authenticated, service_role;

-- ── Also ensure his_prescriptions has dispensed_at column ────────────
ALTER TABLE public.his_prescriptions
    ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS checked_out_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cleared_by_finance_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS finance_notes TEXT,
    ADD COLUMN IF NOT EXISTS receipt_number TEXT,
    ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending_payment';

GRANT ALL ON public.his_prescriptions TO anon, authenticated, service_role;
