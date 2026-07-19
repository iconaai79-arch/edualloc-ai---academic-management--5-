-- Migration 279: Add grade_level and stream columns to his_patients table
-- Path: database/migrations/279_add_class_stream_to_his_patients.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='grade_level') THEN
        ALTER TABLE public.his_patients ADD COLUMN grade_level TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='his_patients' AND column_name='stream') THEN
        ALTER TABLE public.his_patients ADD COLUMN stream TEXT;
    END IF;
END $$;
