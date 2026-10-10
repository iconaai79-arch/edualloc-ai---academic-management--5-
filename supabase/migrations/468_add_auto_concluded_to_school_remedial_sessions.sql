-- Migration 468: Add auto_concluded and auto-conclude audit columns to school_remedial_sessions
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'auto_concluded' for [school_remedial_sessions]"

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions') THEN
        -- Add auto-concluded tracking columns
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS auto_concluded BOOLEAN DEFAULT FALSE;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS auto_concluded_at TIMESTAMPTZ;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS auto_concluded_reason TEXT;
    END IF;
END $$;

-- Performance index for filtered queries on auto concluded sessions
CREATE INDEX IF NOT EXISTS idx_remedial_sessions_auto_concluded 
    ON public.school_remedial_sessions (institution_id, auto_concluded) 
    WHERE auto_concluded = TRUE;

-- Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
