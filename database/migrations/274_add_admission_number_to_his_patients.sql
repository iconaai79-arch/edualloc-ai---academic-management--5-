-- Migration: Add admission_number to his_patients table
-- Path: database/migrations/274_add_admission_number_to_his_patients.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='admission_number') THEN
        ALTER TABLE public.his_patients ADD COLUMN admission_number TEXT;
    END IF;
END $$;
store