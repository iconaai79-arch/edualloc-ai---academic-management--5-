-- ==============================================================================
-- Migration: 402_add_metadata_to_users_and_student_enrollments.sql
-- Description: Ensures metadata JSONB column exists on public.users and
--              public.student_enrollments tables to prevent schema cache stale
--              column retries and 504 invocation timeouts.
-- ==============================================================================

DO $$
BEGIN
    -- 1. Ensure metadata on users table
    IF to_regclass('public.users') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'users' 
              AND column_name = 'metadata'
        ) THEN
            ALTER TABLE public.users ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'users' 
              AND indexname = 'idx_users_metadata_gin'
        ) THEN
            CREATE INDEX idx_users_metadata_gin ON public.users USING gin (metadata);
        END IF;
    END IF;

    -- 2. Ensure metadata on student_enrollments table
    IF to_regclass('public.student_enrollments') IS NOT NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'student_enrollments' 
              AND column_name = 'metadata'
        ) THEN
            ALTER TABLE public.student_enrollments ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes 
            WHERE schemaname = 'public' 
              AND tablename = 'student_enrollments' 
              AND indexname = 'idx_student_enrollments_metadata_gin'
        ) THEN
            CREATE INDEX idx_student_enrollments_metadata_gin ON public.student_enrollments USING gin (metadata);
        END IF;
    END IF;
END $$;
