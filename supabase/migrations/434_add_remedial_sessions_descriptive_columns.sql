-- Migration 434: Add descriptive columns to school_remedial_sessions
-- Ensures teacher_name, subject_name, class_name, and prefect_token are stored directly in school_remedial_sessions
-- to prevent schema cache stripping and speed up direct querying.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions') THEN
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS class_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS subject_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS teacher_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS prefect_token TEXT;
    END IF;
END $$;
