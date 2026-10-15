-- Migration 482: Add passport_photo, metadata, and checkout_request_id to ds_students
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'ds_students'
    ) THEN
        ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS passport_photo TEXT;
        ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
