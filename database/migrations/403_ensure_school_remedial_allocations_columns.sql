-- Migration 403: Ensure school_remedial_allocations contains is_auto_generated, is_unallocated, metadata and related columns
-- Description: PostgREST throws PGRST204 "schema cache stale: stripping un-cached column" when frontend sends
-- is_auto_generated, is_unallocated, or metadata if these columns do not exist in public.school_remedial_allocations.
-- This migration ensures public.school_remedial_allocations natively contains these columns with safe defaults.

DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_allocations') THEN
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_auto_generated BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_duty_lesson BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS is_unallocated BOOLEAN DEFAULT false;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS unallocated_reason TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS joint_label TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'school_remedial_allocations' 
              AND indexname = 'idx_school_remedial_allocations_metadata_gin'
        ) THEN
            CREATE INDEX idx_school_remedial_allocations_metadata_gin ON public.school_remedial_allocations USING gin (metadata);
        END IF;
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
