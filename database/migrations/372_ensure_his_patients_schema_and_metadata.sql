-- Migration 372: Ensure his_patients table has metadata JSONB, full schema columns, and reloads PostgREST schema cache
-- Path: database/migrations/372_ensure_his_patients_schema_and_metadata.sql

DO $$
BEGIN
    IF to_regclass('public.his_patients') IS NOT NULL THEN
        -- Add metadata JSONB column if missing
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'his_patients' 
              AND column_name = 'metadata'
        ) THEN
            ALTER TABLE public.his_patients ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;

        -- Ensure full_name exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='full_name') THEN
            ALTER TABLE public.his_patients ADD COLUMN full_name TEXT;
        END IF;

        -- Ensure admission_number exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='admission_number') THEN
            ALTER TABLE public.his_patients ADD COLUMN admission_number TEXT;
        END IF;

        -- Ensure patient_number exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='patient_number') THEN
            ALTER TABLE public.his_patients ADD COLUMN patient_number TEXT;
        END IF;

        -- Ensure custom_patient_id exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='custom_patient_id') THEN
            ALTER TABLE public.his_patients ADD COLUMN custom_patient_id TEXT;
        END IF;

        -- Ensure op_number exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='op_number') THEN
            ALTER TABLE public.his_patients ADD COLUMN op_number TEXT;
        END IF;

        -- Ensure grade_level exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='grade_level') THEN
            ALTER TABLE public.his_patients ADD COLUMN grade_level TEXT;
        END IF;

        -- Ensure stream exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='stream') THEN
            ALTER TABLE public.his_patients ADD COLUMN stream TEXT;
        END IF;

        -- Ensure status exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='status') THEN
            ALTER TABLE public.his_patients ADD COLUMN status TEXT DEFAULT 'active';
        END IF;

        -- Ensure age exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='age') THEN
            ALTER TABLE public.his_patients ADD COLUMN age INTEGER;
        END IF;

        -- Ensure recorded_by exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='recorded_by') THEN
            ALTER TABLE public.his_patients ADD COLUMN recorded_by TEXT;
        END IF;

        -- Ensure emergency_contact_name exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='emergency_contact_name') THEN
            ALTER TABLE public.his_patients ADD COLUMN emergency_contact_name TEXT;
        END IF;

        -- Ensure emergency_contact_phone exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='emergency_contact_phone') THEN
            ALTER TABLE public.his_patients ADD COLUMN emergency_contact_phone TEXT;
        END IF;

        -- Ensure insurance_provider exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='insurance_provider') THEN
            ALTER TABLE public.his_patients ADD COLUMN insurance_provider TEXT;
        END IF;

        -- Ensure sha_number exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='sha_number') THEN
            ALTER TABLE public.his_patients ADD COLUMN sha_number TEXT;
        END IF;

        -- Ensure contact exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='contact') THEN
            ALTER TABLE public.his_patients ADD COLUMN contact TEXT;
        END IF;

        -- Ensure dob exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='dob') THEN
            ALTER TABLE public.his_patients ADD COLUMN dob TEXT;
        END IF;

        -- Ensure blood_group exists
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='blood_group') THEN
            ALTER TABLE public.his_patients ADD COLUMN blood_group TEXT;
        END IF;

        -- Ensure guardian columns exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='guardian_name') THEN
            ALTER TABLE public.his_patients ADD COLUMN guardian_name TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='guardian_phone') THEN
            ALTER TABLE public.his_patients ADD COLUMN guardian_phone TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='guardian_national_id') THEN
            ALTER TABLE public.his_patients ADD COLUMN guardian_national_id TEXT;
        END IF;
    END IF;
END $$;

-- Create indices for rapid search and lookup
CREATE INDEX IF NOT EXISTS idx_his_patients_admission_number ON public.his_patients(institution_id, admission_number);
CREATE INDEX IF NOT EXISTS idx_his_patients_full_name ON public.his_patients(institution_id, full_name);

-- Reload PostgREST schema cache so un-cached column errors never trigger
NOTIFY pgrst, 'reload schema';
