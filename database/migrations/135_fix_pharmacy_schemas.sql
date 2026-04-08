-- 135. FIX PHARMACY & HIS SCHEMAS
-- Resolving undefined column errors (age, status, recorded_by) in Modern Pharmacy System

-- 1. Enhance his_patients
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS age INTEGER;
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- 2. Add recorded_by to other HIS/Pharmacy tables for audit trail
-- Using bare ALTER TABLE because these are base tables created in initial HIS migrations
ALTER TABLE his_staff ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_batches ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE his_pharmacy_settings ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL;

-- 3. Extend Pharmacy POS & Accounting tables
-- These use protected ALTER to ensure no crashes if 132 hasn't run yet
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
