-- Migration 357: Add license_category to ds_students
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_students'
    ) THEN
        ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS license_category TEXT;
        
        -- Backfill from license_type_interested if available
        UPDATE public.ds_students 
        SET license_category = license_type_interested 
        WHERE license_category IS NULL AND license_type_interested IS NOT NULL;
    END IF;
END $$;
