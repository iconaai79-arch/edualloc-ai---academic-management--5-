-- 136. NCBA & PHARMACY RECONCILIATION FIX
-- Purpose: Support NCBA transaction visibility and resolve Pharmacy registration failures

-- 1. Enhance ncba_transactions for visibility & reconciliation
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'ncba';
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS external_data JSONB DEFAULT '{}';
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE ncba_transactions ADD COLUMN IF NOT EXISTS receipt_number TEXT;

-- 2. FIX PHARMACY & HIS SCHEMAS (Execution of 135)
-- Resolving undefined column errors (age, status, recorded_by) in Modern Pharmacy System
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE his_staff ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_batches ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_settings ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- 3. Protective extensions for dynamic pharmacy tables
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'his_pharmacy_sales') THEN
        ALTER TABLE his_pharmacy_sales ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'his_pharmacy_sale_items') THEN
        ALTER TABLE his_pharmacy_sale_items ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'his_pharmacy_ledger') THEN
        ALTER TABLE his_pharmacy_ledger ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
    
    IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'his_pharmacy_staff') THEN
        ALTER TABLE his_pharmacy_staff ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. ENSURE SYSTEM SETTINGS TABLE EXISTS (Fallback for high-level reconciliation)
CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY,
    data JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if id 1 doesn't exist
INSERT INTO system_settings (id, data)
VALUES (1, '{}'::jsonb)
ON CONFLICT (id) DO NOTHING;
