-- Migration 334: Ensure his_pharmacy_adherence_alerts schema and columns
-- Description: Ensures his_pharmacy_adherence_alerts table exists with all required columns (frequency, alert_type, drug_name, reminder_time, etc.), indexes, RLS, and PostgREST reload.

-- 1. Create table if not exists
CREATE TABLE IF NOT EXISTS public.his_pharmacy_adherence_alerts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES public.his_patients(id) ON DELETE CASCADE,
    prescription_item_id TEXT,
    reminder_time TIME,
    frequency TEXT DEFAULT 'Daily',
    status TEXT DEFAULT 'active',
    last_sent_at TIMESTAMPTZ,
    alert_type TEXT DEFAULT 'medication',
    drug_name TEXT,
    checkup_date DATE,
    stop_date DATE,
    message_template TEXT,
    recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Ensure all columns exist on his_pharmacy_adherence_alerts (for existing tables)
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS prescription_item_id TEXT;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS reminder_time TIME;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'Daily';
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'medication';
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS drug_name TEXT;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS checkup_date DATE;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS stop_date DATE;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS message_template TEXT;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 3. Ensure his_pharmacy_settings adherence columns exist
ALTER TABLE public.his_pharmacy_settings ADD COLUMN IF NOT EXISTS medication_reminders_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.his_pharmacy_settings ADD COLUMN IF NOT EXISTS checkup_reminders_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE public.his_pharmacy_settings ADD COLUMN IF NOT EXISTS stop_reminders_enabled BOOLEAN DEFAULT TRUE;

-- 4. Ensure his_prescriptions patient_name and audit columns exist
ALTER TABLE public.his_prescriptions ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.his_prescriptions ADD COLUMN IF NOT EXISTS doctor_name TEXT;
ALTER TABLE public.his_prescriptions ADD COLUMN IF NOT EXISTS dispensed_at TIMESTAMPTZ;
ALTER TABLE public.his_prescriptions ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]';

-- 4. Ensure TEXT types for ID columns if previously created with UUIDs
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'his_pharmacy_adherence_alerts' 
          AND column_name = 'id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.his_pharmacy_adherence_alerts ALTER COLUMN id TYPE TEXT USING id::TEXT;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'his_pharmacy_adherence_alerts' 
          AND column_name = 'institution_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.his_pharmacy_adherence_alerts ALTER COLUMN institution_id TYPE TEXT USING institution_id::TEXT;
    END IF;
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'his_pharmacy_adherence_alerts' 
          AND column_name = 'patient_id' 
          AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.his_pharmacy_adherence_alerts ALTER COLUMN patient_id TYPE TEXT USING patient_id::TEXT;
    END IF;
END $$;

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_his_pharm_alerts_inst ON public.his_pharmacy_adherence_alerts(institution_id);
CREATE INDEX IF NOT EXISTS idx_his_pharm_alerts_patient ON public.his_pharmacy_adherence_alerts(patient_id);
CREATE INDEX IF NOT EXISTS idx_his_pharm_alerts_status ON public.his_pharmacy_adherence_alerts(status);
CREATE INDEX IF NOT EXISTS idx_his_pharm_alerts_type ON public.his_pharmacy_adherence_alerts(alert_type);

-- 6. Enable RLS and permissive policy
ALTER TABLE public.his_pharmacy_adherence_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "his_pharmacy_adherence_alerts_all_access" ON public.his_pharmacy_adherence_alerts;
CREATE POLICY "his_pharmacy_adherence_alerts_all_access" ON public.his_pharmacy_adherence_alerts FOR ALL USING (true) WITH CHECK (true);

-- 7. Grant privileges
GRANT ALL ON public.his_pharmacy_adherence_alerts TO anon, authenticated, service_role;

-- 8. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
