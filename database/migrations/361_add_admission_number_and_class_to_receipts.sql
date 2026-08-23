-- Migration: Add admission_number, student_name, and class_name to receipts table
-- Path: database/migrations/361_add_admission_number_and_class_to_receipts.sql

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'admission_number') THEN
            ALTER TABLE public.receipts ADD COLUMN admission_number TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'student_name') THEN
            ALTER TABLE public.receipts ADD COLUMN student_name TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'class_name') THEN
            ALTER TABLE public.receipts ADD COLUMN class_name TEXT;
        END IF;

        CREATE INDEX IF NOT EXISTS idx_receipts_admission_number ON public.receipts(admission_number);
    END IF;
END $$;
