-- Migration 480: Add institution_id column to institutions table
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'institution_id' for [institutions]"

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'institutions'
    ) THEN
        -- Add institution_id column to public.institutions if not present
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS institution_id TEXT;

        -- Self-reference default so institution_id matches id if empty
        UPDATE public.institutions 
        SET institution_id = id 
        WHERE institution_id IS NULL OR institution_id = '';

        -- Create index if not exists
        CREATE INDEX IF NOT EXISTS idx_institutions_institution_id ON public.institutions(institution_id);
    END IF;
END $$;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
