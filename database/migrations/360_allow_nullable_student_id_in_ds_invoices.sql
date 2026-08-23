-- Migration 360: Allow nullable student_id in ds_invoices for corporate, lead & walk-in invoices
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_invoices'
    ) THEN
        -- Drop NOT NULL constraint on student_id to support walk-ins, corporate fleet invoices, and graceful FK cascades
        ALTER TABLE public.ds_invoices ALTER COLUMN student_id DROP NOT NULL;

        -- Update foreign key constraint to ON DELETE SET NULL
        ALTER TABLE public.ds_invoices DROP CONSTRAINT IF EXISTS ds_invoices_student_id_fkey;
        ALTER TABLE public.ds_invoices 
            ADD CONSTRAINT ds_invoices_student_id_fkey 
            FOREIGN KEY (student_id) 
            REFERENCES public.ds_students(id) 
            ON DELETE SET NULL;
    END IF;
END $$;
