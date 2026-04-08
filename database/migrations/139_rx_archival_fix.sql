-- 139. RX ARCHIVAL FIX
-- Purpose: Add 'items' JSONB column to his_prescriptions to support modern hybrid storage
-- and ensure columns like 'doctor_name' and 'clinical_notes' are ready.

ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS doctor_id TEXT;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS doctor_name TEXT;

-- Convert ID columns to TEXT just in case (Redundant but safe)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_prescriptions' AND column_name = 'id' AND data_type = 'uuid') THEN
        ALTER TABLE his_prescriptions ALTER COLUMN id TYPE TEXT USING id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_prescriptions' AND column_name = 'institution_id' AND data_type = 'uuid') THEN
        ALTER TABLE his_prescriptions ALTER COLUMN institution_id TYPE TEXT USING institution_id::text;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'his_prescriptions' AND column_name = 'patient_id' AND data_type = 'uuid') THEN
        ALTER TABLE his_prescriptions ALTER COLUMN patient_id TYPE TEXT USING patient_id::text;
    END IF;
END $$;
