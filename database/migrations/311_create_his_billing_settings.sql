-- ============================================================
-- Migration 311: HIS Billing & Invoice Numbering Settings
-- Creates his_billing_settings table for invoice/receipt prefix
-- and numbering configuration per institution.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.his_billing_settings (
    id                      TEXT PRIMARY KEY,
    institution_id          TEXT NOT NULL,
    "institutionId"         TEXT,

    -- Invoice numbering
    invoice_prefix          TEXT NOT NULL DEFAULT 'INV',
    "invoicePrefix"         TEXT,
    invoice_start_number    INTEGER NOT NULL DEFAULT 1001,
    "invoiceStartNumber"    INTEGER,

    -- Receipt numbering
    receipt_prefix          TEXT NOT NULL DEFAULT 'RCT',
    "receiptPrefix"         TEXT,
    receipt_start_number    INTEGER NOT NULL DEFAULT 5001,
    "receiptStartNumber"    INTEGER,

    -- Insurance claim numbering
    claim_prefix            TEXT NOT NULL DEFAULT 'CLM',
    "claimPrefix"           TEXT,
    claim_start_number      INTEGER NOT NULL DEFAULT 2001,
    "claimStartNumber"      INTEGER,

    -- Format options
    currency                TEXT NOT NULL DEFAULT 'KES',
    financial_year          TEXT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::TEXT,
    "financialYear"         TEXT,
    payment_terms_days      INTEGER NOT NULL DEFAULT 30,
    "paymentTermsDays"      INTEGER,
    zero_pad_length         INTEGER NOT NULL DEFAULT 4,
    "zeroPadLength"         INTEGER,
    include_year_in_number  BOOLEAN NOT NULL DEFAULT TRUE,
    "includeYearInNumber"   BOOLEAN,
    auto_reset_yearly       BOOLEAN NOT NULL DEFAULT TRUE,
    "autoResetYearly"       BOOLEAN,

    -- Audit
    updated_at              TIMESTAMPTZ DEFAULT NOW(),
    created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast institution lookup
CREATE INDEX IF NOT EXISTS idx_his_billing_settings_institution
    ON public.his_billing_settings (institution_id);

-- One settings row per institution
CREATE UNIQUE INDEX IF NOT EXISTS idx_his_billing_settings_unique_inst
    ON public.his_billing_settings (institution_id);

-- RLS
ALTER TABLE public.his_billing_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_billing_settings_select" ON public.his_billing_settings;
CREATE POLICY "his_billing_settings_select" ON public.his_billing_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "his_billing_settings_insert" ON public.his_billing_settings;
CREATE POLICY "his_billing_settings_insert" ON public.his_billing_settings
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "his_billing_settings_update" ON public.his_billing_settings;
CREATE POLICY "his_billing_settings_update" ON public.his_billing_settings
    FOR UPDATE USING (true);

DROP POLICY IF EXISTS "his_billing_settings_delete" ON public.his_billing_settings;
CREATE POLICY "his_billing_settings_delete" ON public.his_billing_settings
    FOR DELETE USING (true);

-- Permissions
GRANT ALL ON public.his_billing_settings TO anon, authenticated, service_role;
