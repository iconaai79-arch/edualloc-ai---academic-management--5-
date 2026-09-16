-- ==============================================================================
-- Migration: 400_add_course_id_to_student_enrollments.sql
-- Description: Adds course_id and class_id to student_enrollments to eliminate
--              "Could not find column 'course_id'" PostgREST schema cache warnings
--              and enable direct indexing and querying by course/class.
-- ==============================================================================

DO $$
BEGIN
    IF to_regclass('public.student_enrollments') IS NOT NULL THEN
        -- Add course_id if not exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'student_enrollments' 
              AND column_name = 'course_id'
        ) THEN
            ALTER TABLE public.student_enrollments ADD COLUMN course_id TEXT;
        END IF;

        -- Add class_id if not exists
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'student_enrollments' 
              AND column_name = 'class_id'
        ) THEN
            ALTER TABLE public.student_enrollments ADD COLUMN class_id TEXT;
        END IF;

        -- Backfill course_id from metadata if present
        UPDATE public.student_enrollments
        SET course_id = metadata->>'courseId'
        WHERE course_id IS NULL AND metadata->>'courseId' IS NOT NULL;

        UPDATE public.student_enrollments
        SET course_id = metadata->>'course_id'
        WHERE course_id IS NULL AND metadata->>'course_id' IS NOT NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_student_enrollments_course_id 
    ON public.student_enrollments(institution_id, course_id);

NOTIFY pgrst, 'reload schema';
