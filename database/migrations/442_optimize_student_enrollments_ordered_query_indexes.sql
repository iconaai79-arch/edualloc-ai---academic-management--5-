-- Migration 442: Optimize student_enrollments ordered query indexes and eliminate chunk timeouts
-- Error: [API GET] Chunk timeout on 'student_enrollments' at offset 0, retrying fast query...
-- Root cause:
--   1. PostgREST queries on student_enrollments filter by institution_id (and optionally branch_id, status, or user_id)
--      and order by id ASC (or created_at DESC) for pagination chunks.
--   2. Without a composite index covering (institution_id, id ASC), PostgreSQL performs a bitmap index scan
--      followed by a costly in-memory/disk Sort node across all rows in the institution.
--   3. When student_enrollments carries polymorphic JSONB metadata (parent records, contacts, admission history),
--      sorting all rows on the worker exceeds the statement timeout (57014) at offset 0.
-- Fix:
--   1. Add composite index (institution_id, id ASC) to satisfy WHERE institution_id = $1 ORDER BY id ASC with zero sorting.
--   2. Add composite index (institution_id, branch_id, id ASC) for branch-restricted user sessions.
--   3. Add composite index (institution_id, status, id ASC) for active/enrolled status filtered queries.
--   4. Add composite index (institution_id, user_id, id ASC) for direct student lookup queries.
--   5. Add composite index (institution_id, course_id, id ASC) and (institution_id, class_id, id ASC).
--   6. Add composite index (institution_id, created_at DESC) and BRIN index on created_at for chronological feeds.
--   7. Set fillfactor = 85 to reduce page fragmentation from updates.
--   8. Run ANALYZE and notify PostgREST to reload its schema cache.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments'
    ) THEN
        RETURN; -- Table doesn't exist yet, skip
    END IF;

    -- Ensure institution_id index exists
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id 
        ON public.student_enrollments(institution_id);

    -- 1. Primary fast-path composite index for pagination: (institution_id, id ASC)
    -- PostgREST query: GET /student_enrollments?institution_id=eq.X&order=id.asc&offset=0&limit=500
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_composite 
        ON public.student_enrollments(institution_id, id ASC);

    -- 2. Branch-scoped pagination index: (institution_id, branch_id, id ASC)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'branch_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_branch_id_composite 
            ON public.student_enrollments(institution_id, branch_id, id ASC);
    END IF;

    -- 3. Status filtered pagination index: (institution_id, status, id ASC)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'status'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_status_id_composite 
            ON public.student_enrollments(institution_id, status, id ASC);
    END IF;

    -- 4. User lookup composite index: (institution_id, user_id, id ASC)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'user_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_user_id_composite 
            ON public.student_enrollments(institution_id, user_id, id ASC);
    END IF;

    -- 5. Course and class level composite indexes
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'course_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_course_id_composite 
            ON public.student_enrollments(institution_id, course_id, id ASC);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'class_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_class_id_composite 
            ON public.student_enrollments(institution_id, class_id, id ASC);
    END IF;

    -- 6. Chronological ordering index: (institution_id, created_at DESC)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'created_at'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_created 
            ON public.student_enrollments(institution_id, created_at DESC)
            WHERE created_at IS NOT NULL;

        -- Lightweight BRIN index on created_at for fast time-range pruning
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_brin_created 
            ON public.student_enrollments USING BRIN(created_at);
    END IF;

    -- 7. Enrollment date index for intake & cohort queries
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'enrollment_date'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_enr_date 
            ON public.student_enrollments(institution_id, enrollment_date DESC)
            WHERE enrollment_date IS NOT NULL;
    END IF;

    -- 8. Reduce page fragmentation caused by metadata JSONB updates
    ALTER TABLE public.student_enrollments SET (fillfactor = 85);

    -- 9. Update PostgreSQL query planner statistics
    ANALYZE public.student_enrollments;

END $$;

-- 10. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
