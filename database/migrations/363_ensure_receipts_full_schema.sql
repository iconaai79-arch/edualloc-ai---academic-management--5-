-- Migration: Ensure complete receipts table schema and columns
-- Path: database/migrations/363_ensure_receipts_full_schema.sql

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'created_at') THEN
            ALTER TABLE public.receipts ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'updated_at') THEN
            ALTER TABLE public.receipts ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'timestamp') THEN
            ALTER TABLE public.receipts ADD COLUMN timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'admission_number') THEN
            ALTER TABLE public.receipts ADD COLUMN admission_number TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'student_name') THEN
            ALTER TABLE public.receipts ADD COLUMN student_name TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'class_name') THEN
            ALTER TABLE public.receipts ADD COLUMN class_name TEXT;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'receipts' AND column_name = 'paid_for') THEN
            ALTER TABLE public.receipts ADD COLUMN paid_for TEXT;
        END IF;
    END IF;
END $$;
