-- Migration 508: Add institution_id column to demo_requests table and reload PostgREST schema cache
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'institution_id' for [demo_requests]"

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'demo_requests'
    ) THEN
        -- Add institution_id column to public.demo_requests if not present
        ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS institution_id TEXT;

        -- Create index if not exists
        CREATE INDEX IF NOT EXISTS idx_demo_requests_institution_id ON public.demo_requests(institution_id);
    END IF;
END $$;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
