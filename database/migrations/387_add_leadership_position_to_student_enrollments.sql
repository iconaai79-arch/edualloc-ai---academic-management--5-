-- Migration 387: Add leadership_position column to student_enrollments
-- Captures student leadership roles (e.g., School Captain, Class Prefect, Class Secretary, Dining Hall Captain)
-- Enables automatic prefect and leadership resolution across modules like Remedial Lessons Manager.

DO $$
BEGIN
    IF to_regclass('public.student_enrollments') IS NOT NULL THEN
        -- Add leadership_position column if it doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'student_enrollments' 
              AND column_name = 'leadership_position'
        ) THEN
            ALTER TABLE public.student_enrollments ADD COLUMN leadership_position TEXT;
        END IF;

        -- Backfill leadership_position from metadata if null
        UPDATE public.student_enrollments
        SET leadership_position = COALESCE(
            metadata->>'leadershipPosition', 
            metadata->>'leadership_position', 
            metadata->>'leadershipRole',
            metadata->>'leadership_role'
        )
        WHERE leadership_position IS NULL 
          AND (
            metadata->>'leadershipPosition' IS NOT NULL OR 
            metadata->>'leadership_position' IS NOT NULL OR
            metadata->>'leadershipRole' IS NOT NULL OR
            metadata->>'leadership_role' IS NOT NULL
          );
    END IF;
END $$;

-- Create index for rapid leadership queries
CREATE INDEX IF NOT EXISTS idx_student_enrollments_leadership 
    ON public.student_enrollments(institution_id, leadership_position);

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
