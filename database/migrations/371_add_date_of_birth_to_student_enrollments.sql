-- Migration 371: Add date_of_birth and assessment_no to student_enrollments
-- Resolves PostgREST schema cache mismatch and ensures high-performance querying

DO $$
BEGIN
    IF to_regclass('public.student_enrollments') IS NOT NULL THEN
        -- Add date_of_birth column if it doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'student_enrollments' 
              AND column_name = 'date_of_birth'
        ) THEN
            ALTER TABLE public.student_enrollments ADD COLUMN date_of_birth DATE;
        END IF;

        -- Add assessment_no column if it doesn't already exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
              AND table_name = 'student_enrollments' 
              AND column_name = 'assessment_no'
        ) THEN
            ALTER TABLE public.student_enrollments ADD COLUMN assessment_no TEXT;
        END IF;

        -- Backfill date_of_birth from metadata if null
        UPDATE public.student_enrollments
        SET date_of_birth = CASE
            WHEN metadata->>'dateOfBirth' ~ '^\d{4}-\d{2}-\d{2}$' THEN (metadata->>'dateOfBirth')::DATE
            WHEN metadata->>'dob' ~ '^\d{4}-\d{2}-\d{2}$' THEN (metadata->>'dob')::DATE
            ELSE NULL
        END
        WHERE date_of_birth IS NULL 
          AND (metadata->>'dateOfBirth' IS NOT NULL OR metadata->>'dob' IS NOT NULL);

        -- Backfill assessment_no from metadata if null
        UPDATE public.student_enrollments
        SET assessment_no = COALESCE(metadata->>'assessmentNo', metadata->>'assessment_no', metadata->>'assessmentNumber')
        WHERE assessment_no IS NULL 
          AND (metadata->>'assessmentNo' IS NOT NULL OR metadata->>'assessment_no' IS NOT NULL OR metadata->>'assessmentNumber' IS NOT NULL);
    END IF;
END $$;

-- Create indices for rapid academic analytics and student lookups
CREATE INDEX IF NOT EXISTS idx_student_enrollments_dob 
    ON public.student_enrollments(institution_id, date_of_birth);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_assessment 
    ON public.student_enrollments(institution_id, assessment_no);

-- Reload PostgREST schema cache so un-cached column errors never trigger
NOTIFY pgrst, 'reload schema';
