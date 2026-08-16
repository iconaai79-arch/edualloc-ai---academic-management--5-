-- Migration 336: Ensure HIS Pharmacy Drug Interactions and Clinical Safety Schema
-- Tables: his_pharmacy_interactions, his_pharmacy_narcotics_ledger, his_prescription_items

-- 1. Drug-Drug Interactions Registry (Clinical Safety)
CREATE TABLE IF NOT EXISTS his_pharmacy_interactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    medication_a_id TEXT,
    medication_b_id TEXT,
    drug_a TEXT,
    drug_b TEXT,
    severity TEXT DEFAULT 'moderate', -- mild, moderate, severe, fatal
    description TEXT NOT NULL,
    clinical_rule TEXT,
    precaution TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if table was already created
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS medication_a_id TEXT;
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS medication_b_id TEXT;
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS drug_a TEXT;
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS drug_b TEXT;
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'moderate';
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS clinical_rule TEXT;
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS precaution TEXT;
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE his_pharmacy_interactions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_his_pharmacy_interactions_institution ON his_pharmacy_interactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_his_pharmacy_interactions_med_a ON his_pharmacy_interactions(institution_id, medication_a_id);
CREATE INDEX IF NOT EXISTS idx_his_pharmacy_interactions_med_b ON his_pharmacy_interactions(institution_id, medication_b_id);

-- 2. Narcotics & Controlled Substances Ledger
CREATE TABLE IF NOT EXISTS his_pharmacy_narcotics_ledger (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    medication_id TEXT,
    medication_name TEXT,
    patient_id TEXT,
    prescription_id TEXT,
    quantity_change INTEGER NOT NULL DEFAULT 0,
    performed_by TEXT,
    witnessed_by TEXT,
    notes TEXT,
    system_log JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS medication_id TEXT;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS medication_name TEXT;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS patient_id TEXT;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS prescription_id TEXT;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS quantity_change INTEGER DEFAULT 0;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS performed_by TEXT;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS witnessed_by TEXT;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS system_log JSONB DEFAULT '{}'::jsonb;
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE his_pharmacy_narcotics_ledger ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_his_pharmacy_narcotics_institution ON his_pharmacy_narcotics_ledger(institution_id);
CREATE INDEX IF NOT EXISTS idx_his_pharmacy_narcotics_medication ON his_pharmacy_narcotics_ledger(medication_id);

-- 3. Prescription Items Table
CREATE TABLE IF NOT EXISTS his_prescription_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    prescription_id TEXT,
    drug_id TEXT,
    drug_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) DEFAULT 0,
    instructions TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS prescription_id TEXT;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS drug_id TEXT;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS drug_name TEXT;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS dosage TEXT;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS frequency TEXT;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS duration TEXT;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS total_price DECIMAL(10,2) DEFAULT 0;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS instructions TEXT;
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE his_prescription_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_his_presc_items_prescription ON his_prescription_items(prescription_id);
CREATE INDEX IF NOT EXISTS idx_his_presc_items_drug ON his_prescription_items(drug_id);

-- 4. Enable Row Level Security
ALTER TABLE his_pharmacy_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_pharmacy_narcotics_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_prescription_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "service_role_his_pharmacy_interactions" ON his_pharmacy_interactions;
CREATE POLICY "service_role_his_pharmacy_interactions" ON his_pharmacy_interactions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_his_pharmacy_interactions" ON his_pharmacy_interactions;
CREATE POLICY "authenticated_his_pharmacy_interactions" ON his_pharmacy_interactions FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_his_pharmacy_interactions" ON his_pharmacy_interactions;
CREATE POLICY "anon_his_pharmacy_interactions" ON his_pharmacy_interactions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "service_role_his_pharmacy_narcotics_ledger" ON his_pharmacy_narcotics_ledger;
CREATE POLICY "service_role_his_pharmacy_narcotics_ledger" ON his_pharmacy_narcotics_ledger FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_his_pharmacy_narcotics_ledger" ON his_pharmacy_narcotics_ledger;
CREATE POLICY "authenticated_his_pharmacy_narcotics_ledger" ON his_pharmacy_narcotics_ledger FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_his_pharmacy_narcotics_ledger" ON his_pharmacy_narcotics_ledger;
CREATE POLICY "anon_his_pharmacy_narcotics_ledger" ON his_pharmacy_narcotics_ledger FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "service_role_his_prescription_items" ON his_prescription_items;
CREATE POLICY "service_role_his_prescription_items" ON his_prescription_items FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_his_prescription_items" ON his_prescription_items;
CREATE POLICY "authenticated_his_prescription_items" ON his_prescription_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_his_prescription_items" ON his_prescription_items;
CREATE POLICY "anon_his_prescription_items" ON his_prescription_items FOR SELECT TO anon USING (true);

-- Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
