-- ============================================================================
-- MIGRATION 550: CLEANUP CROSS-TENANT AUTO-GENERATED STUDENT ENROLLMENTS
-- Removes synthetic/auto-generated rows in public.student_enrollments where
-- the enrollment's institution_id does NOT match the linked user's actual
-- institution_id in public.users.
-- Safe & Idempotent: Does NOT delete any rows from public.users.
-- ============================================================================

DO $$
DECLARE
    v_deleted_count INTEGER := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN

        -- Delete student_enrollments whose linked user belongs to a DIFFERENT institution
        WITH mismatched AS (
            SELECT se.id
            FROM public.student_enrollments se
            JOIN public.users u ON u.id::text = se.user_id::text
            WHERE se.institution_id IS NOT NULL
              AND u.institution_id IS NOT NULL
              AND TRIM(se.institution_id::text) <> ''
              AND TRIM(u.institution_id::text) <> ''
              AND REGEXP_REPLACE(LOWER(TRIM(se.institution_id::text)), '^inst_', '')
                  <> REGEXP_REPLACE(LOWER(TRIM(u.institution_id::text)), '^inst_', '')
        )
        DELETE FROM public.student_enrollments
        WHERE id IN (SELECT id FROM mismatched);

        GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
        RAISE NOTICE 'Migration 550: Removed % cross-tenant leaked student_enrollments rows.', v_deleted_count;
    END IF;
END $$;
