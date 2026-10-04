-- Migration 453: Auto-enroll all unlinked student users across all tenants
-- Resolves: "Students registry for most tenants now shows 0 enrollment"
-- Root cause:
--   1. Tenant student users were registered/imported into the `users` table with role = 'student',
--      but corresponding rows in `student_enrollments` were either never generated, lost, or not synced.
--   2. Student Enrollment Registry views iterate exclusively over `student_enrollments`,
--      leading to 0 enrollment counts and empty registries for affected tenants.
-- Solution:
--   1. Ensure `users` and `student_enrollments` tables and columns exist with full schema integrity.
--   2. Automatically backfill `student_enrollments` from any existing `users` where role is student/learner/pupil
--      or has student-specific fields (admission_number, student_class, metadata).
--   3. Create an automated PostgreSQL trigger on `users` so ANY future student inserted or updated
--      automatically gets an active `student_enrollments` record created/maintained.
--   4. Optimize indexes and refresh PostgREST schema cache.

-- 0. Ensure optional student attribute columns exist on public.users if not present
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_class TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS class_level TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stream TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS gender TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 0b. Helper resolvers: pull the REAL admission number / grade from any known column or metadata key.
--     Operate on to_jsonb(row) so missing columns never raise 42703.
CREATE OR REPLACE FUNCTION public.fn_is_synthetic_adm(p_adm TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE AS $$
    SELECT p_adm IS NULL
        OR btrim(p_adm) IN ('', '-', '—', 'N/A', 'null', 'undefined', 'pending')
        OR p_adm ~* '^(usr_|user_|st_|enr_|u_)'
        OR p_adm ~* '^ADM-[0-9]{5,}$'
        OR p_adm ~* '^ADM-10[0-9]{2}$'
        OR p_adm ~* '^(ADM|STF)-[0-9]{4}-[A-Za-z0-9]{4}$';
$$;

CREATE OR REPLACE FUNCTION public.fn_student_real_adm(j JSONB)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    c TEXT;
BEGIN
    FOREACH c IN ARRAY ARRAY[
        j->>'admission_number', j->>'admissionNumber', j->>'admission_no', j->>'adm_no', j->>'admNo',
        j->>'staff_id', j->>'staffId', j->>'registration_number', j->>'reg_no', j->>'student_number',
        j->'metadata'->>'admissionNumber', j->'metadata'->>'admission_number', j->'metadata'->>'admissionNo',
        j->'metadata'->>'admission_no', j->'metadata'->>'admNo', j->'metadata'->>'adm_no',
        j->'metadata'->>'admission', j->'metadata'->>'adm', j->'metadata'->>'staffId',
        j->'metadata'->>'studentId', j->'metadata'->>'regNo', j->'metadata'->>'registrationNo',
        j->'metadata'->>'upi'
    ] LOOP
        IF NOT public.fn_is_synthetic_adm(c) THEN
            RETURN btrim(c);
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_student_real_grade(j JSONB)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    c TEXT;
BEGIN
    FOREACH c IN ARRAY ARRAY[
        j->>'student_class', j->>'grade_level', j->>'class_level', j->>'class_name', j->>'grade', j->>'form',
        j->'metadata'->>'gradeLevel', j->'metadata'->>'grade_level', j->'metadata'->>'studentClass',
        j->'metadata'->>'student_class', j->'metadata'->>'classLevel', j->'metadata'->>'className',
        j->'metadata'->>'class', j->'metadata'->>'grade', j->'metadata'->>'form'
    ] LOOP
        IF c IS NOT NULL AND btrim(c) <> '' AND lower(btrim(c)) NOT IN ('no grade', 'unclassified', 'n/a', '—', '-') THEN
            RETURN btrim(c);
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

DO $$
BEGIN
    -- 1. Ensure student_enrollments table exists
    CREATE TABLE IF NOT EXISTS public.student_enrollments (
        id TEXT PRIMARY KEY,
        institution_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        enrollment_type TEXT NOT NULL DEFAULT 'academic',
        admission_number TEXT,
        assessment_no TEXT,
        date_of_birth DATE,
        status TEXT DEFAULT 'Active',
        enrollment_date TEXT,
        course_id TEXT,
        class_id TEXT,
        leadership_position TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- 2. Ensure all expected columns exist on student_enrollments
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS enrollment_type TEXT DEFAULT 'academic';
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS admission_number TEXT;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS assessment_no TEXT;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS date_of_birth DATE;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS enrollment_date TEXT;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS course_id TEXT;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS class_id TEXT;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS leadership_position TEXT;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

    -- Ensure foreign key constraints do not abort bulk backfill on mismatched ID casings
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'student_enrollments_institution_id_fkey'
        AND table_name = 'student_enrollments'
    ) THEN
        ALTER TABLE public.student_enrollments DROP CONSTRAINT student_enrollments_institution_id_fkey;
    END IF;

    -- Indexes first so the backfill's NOT EXISTS lookups are index scans (prevents upstream timeouts)
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_user_id ON public.student_enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_adm_no ON public.student_enrollments(admission_number);

    -- 3. Idempotent Backfill: Auto-enroll all existing student users
    -- We use to_jsonb(u) to safely access columns regardless of whether they exist as dedicated columns or in metadata JSONB
    INSERT INTO public.student_enrollments (
        id,
        institution_id,
        user_id,
        enrollment_type,
        admission_number,
        status,
        enrollment_date,
        metadata,
        created_at,
        updated_at
    )
    SELECT
        'enr_' || replace(u.id, 'u_', '') AS id,
        u.institution_id,
        u.id AS user_id,
        'academic' AS enrollment_type,
        COALESCE(
            to_jsonb(u)->>'admission_number',
            to_jsonb(u)->'metadata'->>'admissionNumber',
            to_jsonb(u)->'metadata'->>'admission_number',
            to_jsonb(u)->'metadata'->>'admNo',
            'ADM-' || right(replace(u.id, '-', ''), 5)
        ) AS admission_number,
        'Active' AS status,
        COALESCE(u.created_at::text, CURRENT_DATE::text) AS enrollment_date,
        jsonb_build_object(
            'studentName', u.name,
            'fullName', u.name,
            'name', u.name,
            'gradeLevel', COALESCE(
                to_jsonb(u)->>'student_class',
                to_jsonb(u)->>'class_level',
                to_jsonb(u)->'metadata'->>'studentClass',
                to_jsonb(u)->'metadata'->>'gradeLevel',
                to_jsonb(u)->'metadata'->>'classLevel',
                ''
            ),
            'stream', COALESCE(
                to_jsonb(u)->>'stream',
                to_jsonb(u)->'metadata'->>'stream',
                ''
            ),
            'gender', COALESCE(
                to_jsonb(u)->>'gender',
                to_jsonb(u)->'metadata'->>'gender',
                ''
            ),
            'autoGenerated', true
        ) AS metadata,
        COALESCE(u.created_at, NOW()),
        NOW()
    FROM public.users u
    WHERE (
        LOWER(COALESCE(u.role, '')) IN ('student', 'learner', 'pupil', 'cadet', 'scholar')
        OR (
            COALESCE(u.role, '') NOT IN ('super_admin', 'admin', 'teacher', 'lecturer', 'instructor', 'driving_instructor', 'parent', 'driver', 'librarian', 'accountant', 'staff', 'support_staff', 'nurse', 'doctor', 'receptionist', 'cook', 'security', 'prefect_coordinator')
            AND (
                to_jsonb(u)->>'admission_number' IS NOT NULL
                OR to_jsonb(u)->'metadata'->>'admissionNumber' IS NOT NULL
                OR to_jsonb(u)->'metadata'->>'admNo' IS NOT NULL
                OR to_jsonb(u)->>'student_class' IS NOT NULL
                OR to_jsonb(u)->'metadata'->>'studentClass' IS NOT NULL
                OR to_jsonb(u)->'metadata'->>'gradeLevel' IS NOT NULL
            )
        )
    )
    AND u.institution_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.student_enrollments se WHERE se.user_id = u.id)
    AND NOT EXISTS (SELECT 1 FROM public.student_enrollments se WHERE se.id = ('enr_' || replace(u.id, 'u_', '')))
    AND NOT EXISTS (
        SELECT 1 FROM public.student_enrollments se
        WHERE se.admission_number = public.fn_student_real_adm(to_jsonb(u))
    )
    ON CONFLICT (id) DO NOTHING;

    -- 3b. Repair of existing synthetic ADM-XXXXX / empty-grade rows lives in migration 454
    --     (kept separate so this migration stays fast in the Supabase SQL editor).

    -- 4. Enable RLS
    ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Institutional tenancy select: student_enrollments" ON public.student_enrollments;
    CREATE POLICY "Institutional tenancy select: student_enrollments" ON public.student_enrollments 
    FOR SELECT USING (
        institution_id = public.get_curr_user_inst_id() 
        OR replace(institution_id, 'inst_', '') = replace(public.get_curr_user_inst_id(), 'inst_', '')
        OR public.get_curr_user_role() = 'super_admin'
    );

    DROP POLICY IF EXISTS "Institutional tenancy manage: student_enrollments" ON public.student_enrollments;
    CREATE POLICY "Institutional tenancy manage: student_enrollments" ON public.student_enrollments 
    FOR ALL USING (
        institution_id = public.get_curr_user_inst_id() 
        OR replace(institution_id, 'inst_', '') = replace(public.get_curr_user_inst_id(), 'inst_', '')
        OR public.get_curr_user_role() = 'super_admin'
    );

    GRANT ALL ON public.student_enrollments TO anon, authenticated, service_role;

    -- 5. Composite Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id ON public.student_enrollments(institution_id);
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_composite ON public.student_enrollments(institution_id, id ASC);
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_user_id ON public.student_enrollments(user_id);
    CREATE INDEX IF NOT EXISTS idx_student_enrollments_adm_no ON public.student_enrollments(admission_number);

END $$;

-- 6. Trigger Function to guarantee future student users automatically get an enrollment record
CREATE OR REPLACE FUNCTION public.trg_auto_create_student_enrollment()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_u jsonb;
    v_adm TEXT;
    v_name TEXT;
    v_grade TEXT;
    v_stream TEXT;
    v_gender TEXT;
    v_enr_id TEXT;
    v_role TEXT;
BEGIN
    v_u := to_jsonb(NEW);
    v_role := LOWER(COALESCE(NEW.role, ''));

    -- Check if user is a student
    IF (
        v_role IN ('student', 'learner', 'pupil', 'cadet', 'scholar')
        OR (
            v_role NOT IN ('super_admin', 'admin', 'teacher', 'lecturer', 'instructor', 'driving_instructor', 'parent', 'driver', 'librarian', 'accountant', 'staff', 'support_staff', 'nurse', 'doctor', 'receptionist', 'cook', 'security', 'prefect_coordinator')
            AND (
                v_u->>'admission_number' IS NOT NULL 
                OR v_u->'metadata'->>'admissionNumber' IS NOT NULL 
                OR v_u->'metadata'->>'admNo' IS NOT NULL
                OR v_u->>'student_class' IS NOT NULL
                OR v_u->'metadata'->>'studentClass' IS NOT NULL
                OR v_u->'metadata'->>'gradeLevel' IS NOT NULL
            )
        )
    ) AND NEW.institution_id IS NOT NULL THEN

        v_enr_id := 'enr_' || replace(NEW.id, 'u_', '');
        v_adm := COALESCE(
            public.fn_student_real_adm(v_u),
            'ADM-' || right(replace(NEW.id, '-', ''), 5)
        );
        v_name := COALESCE(NEW.name, v_u->'metadata'->>'fullName', v_u->'metadata'->>'studentName', 'Student ' || v_adm);
        v_grade := COALESCE(public.fn_student_real_grade(v_u), '');
        v_stream := COALESCE(
            v_u->>'stream',
            v_u->'metadata'->>'stream',
            ''
        );
        v_gender := COALESCE(
            v_u->>'gender',
            v_u->'metadata'->>'gender',
            ''
        );

        INSERT INTO public.student_enrollments (
            id,
            institution_id,
            user_id,
            enrollment_type,
            admission_number,
            status,
            enrollment_date,
            metadata,
            created_at,
            updated_at
        ) VALUES (
            v_enr_id,
            NEW.institution_id,
            NEW.id,
            'academic',
            v_adm,
            'Active',
            COALESCE(NEW.created_at::text, CURRENT_DATE::text),
            jsonb_build_object(
                'studentName', v_name,
                'fullName', v_name,
                'name', v_name,
                'gradeLevel', v_grade,
                'stream', v_stream,
                'gender', v_gender,
                'autoGenerated', true
            ),
            NOW(),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            institution_id = EXCLUDED.institution_id,
            -- Only replace a missing/synthetic number with a real one; never downgrade a real number
            admission_number = CASE
                WHEN public.fn_is_synthetic_adm(public.student_enrollments.admission_number)
                     AND NOT public.fn_is_synthetic_adm(EXCLUDED.admission_number)
                    THEN EXCLUDED.admission_number
                ELSE COALESCE(public.student_enrollments.admission_number, EXCLUDED.admission_number)
            END,
            -- Merge only non-empty incoming values so existing grade/stream are never blanked
            metadata = COALESCE(public.student_enrollments.metadata, '{}'::jsonb)
                || COALESCE((SELECT jsonb_object_agg(k, v) FROM jsonb_each(EXCLUDED.metadata) AS t(k, v)
                             WHERE v IS NOT NULL AND v <> '""'::jsonb
                               AND k NOT IN ('autoGenerated', 'studentName', 'fullName', 'name')), '{}'::jsonb),
            updated_at = NOW();

    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_users_auto_enroll_student ON public.users;
CREATE TRIGGER trg_users_auto_enroll_student
AFTER INSERT OR UPDATE ON public.users
FOR EACH ROW EXECUTE FUNCTION public.trg_auto_create_student_enrollment();

-- 7. Analyze and notify PostgREST
ANALYZE public.student_enrollments;
NOTIFY pgrst, 'reload schema';
