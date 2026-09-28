-- Migration 433: Align Student Records, Institution IDs, Branch Scoping, and Status Consistency
-- Resolves data inconsistency where different users see differing student counts (e.g. 1390 vs 1525)
-- by aligning orphaned institution_id values, backfilling null statuses, and adding composite performance indexes.

-- 1. Standardize student role casing
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role'
    ) THEN
        UPDATE public.users 
        SET role = 'student' 
        WHERE LOWER(role) = 'student' AND role != 'student';
    END IF;
END $$;

-- 2. Backfill null or empty institution_id in public.users from matching student_enrollments
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments'
    ) AND EXISTS (
        SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users'
    ) THEN
        -- Match by user_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'user_id') THEN
            UPDATE public.users u
            SET institution_id = se.institution_id
            FROM public.student_enrollments se
            WHERE (u.institution_id IS NULL OR u.institution_id = '')
              AND u.role = 'student'
              AND se.institution_id IS NOT NULL AND se.institution_id != ''
              AND (
                se.user_id = u.id 
                OR se.user_id = REPLACE(u.id, 'u_', '')
                OR CONCAT('u_', se.user_id) = u.id
              );
        END IF;

        -- Match by admission_number
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'admission_number') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'admission_number') THEN
            UPDATE public.users u
            SET institution_id = se.institution_id
            FROM public.student_enrollments se
            WHERE (u.institution_id IS NULL OR u.institution_id = '')
              AND u.role = 'student'
              AND u.admission_number IS NOT NULL AND u.admission_number != ''
              AND se.institution_id IS NOT NULL AND se.institution_id != ''
              AND LOWER(TRIM(u.admission_number)) = LOWER(TRIM(se.admission_number));
        END IF;

        -- Reverse backfill: student_enrollments missing institution_id from users
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'user_id') THEN
            UPDATE public.student_enrollments se
            SET institution_id = u.institution_id
            FROM public.users u
            WHERE (se.institution_id IS NULL OR se.institution_id = '')
              AND u.institution_id IS NOT NULL AND u.institution_id != ''
              AND (
                se.user_id = u.id 
                OR se.user_id = REPLACE(u.id, 'u_', '')
                OR CONCAT('u_', se.user_id) = u.id
              );
        END IF;
    END IF;
END $$;

-- 3. Set default status on students missing status
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status'
    ) THEN
        UPDATE public.users 
        SET status = 'active' 
        WHERE role = 'student' AND (status IS NULL OR TRIM(status) = '');
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'status'
    ) THEN
        UPDATE public.student_enrollments 
        SET status = 'Enrolled' 
        WHERE status IS NULL OR TRIM(status) = '';
    END IF;
END $$;

-- 4. Fast composite indexes for institutional student queries
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role') THEN
            CREATE INDEX IF NOT EXISTS idx_users_inst_role ON public.users(institution_id, role);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'role')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_users_inst_role_status ON public.users(institution_id, role, status);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'branch_id') THEN
            CREATE INDEX IF NOT EXISTS idx_users_inst_branch ON public.users(institution_id, branch_id);
        END IF;

        ANALYZE public.users;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments') THEN
        CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id ON public.student_enrollments(institution_id);

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'status') THEN
            CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_status ON public.student_enrollments(institution_id, status);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'user_id') THEN
            CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_user ON public.student_enrollments(institution_id, user_id);
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'branch_id') THEN
            CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_branch ON public.student_enrollments(institution_id, branch_id);
        END IF;

        ANALYZE public.student_enrollments;
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
