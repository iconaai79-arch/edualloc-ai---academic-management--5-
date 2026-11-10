-- ============================================================================
-- TalkSasa PostgreSQL Repair Script: Restore & Backfill Student Enrollments & Real Student Data
-- Run this in pgAdmin / psql on user-526-service-567-nodejs-db
-- Resolves missing student data on academic institution views and heals foreign key/column mismatches.
-- ============================================================================

BEGIN;

-- 1. Ensure table public.student_enrollments exists with all necessary columns
CREATE TABLE IF NOT EXISTS public.student_enrollments (
    id TEXT PRIMARY KEY
);

ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS enrollment_type TEXT DEFAULT 'academic';
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "enrollmentType" TEXT DEFAULT 'academic';
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS assessment_no TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "assessmentNo" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Active';
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS enrollment_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "enrollmentDate" DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "classId" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS leadership_position TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "leadershipPosition" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Drop restrictive foreign keys and relax NOT NULL constraints that break imported records
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_institution_id_fkey CASCADE;
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_user_id_fkey CASCADE;
ALTER TABLE public.student_enrollments ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.student_enrollments ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.student_enrollments ALTER COLUMN enrollment_date DROP NOT NULL;

-- 2. Ensure columns exist on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_class TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "studentClass" TEXT;

-- 3. Synchronize camelCase and snake_case values on public.student_enrollments
UPDATE public.student_enrollments
SET institution_id = COALESCE(NULLIF(institution_id, ''), NULLIF("institutionId", ''), metadata->>'institutionId', metadata->>'institution_id')
WHERE (institution_id IS NULL OR institution_id = '');

UPDATE public.student_enrollments
SET "institutionId" = institution_id
WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL;

UPDATE public.student_enrollments
SET user_id = COALESCE(NULLIF(user_id, ''), NULLIF("userId", ''), metadata->>'userId', metadata->>'user_id')
WHERE (user_id IS NULL OR user_id = '');

UPDATE public.student_enrollments
SET "userId" = user_id
WHERE ("userId" IS NULL OR "userId" = '') AND user_id IS NOT NULL;

UPDATE public.student_enrollments
SET admission_number = COALESCE(NULLIF(admission_number, ''), NULLIF("admissionNumber", ''), metadata->>'admissionNumber', metadata->>'admission_number', metadata->>'admNo')
WHERE (admission_number IS NULL OR admission_number = '');

UPDATE public.student_enrollments
SET "admissionNumber" = admission_number
WHERE ("admissionNumber" IS NULL OR "admissionNumber" = '') AND admission_number IS NOT NULL;

UPDATE public.student_enrollments
SET status = 'Active'
WHERE status IS NULL OR status = '';

-- 4. Synchronize camelCase and snake_case values on public.users
UPDATE public.users
SET institution_id = COALESCE(NULLIF(institution_id, ''), NULLIF("institutionId", ''), metadata->>'institutionId', metadata->>'institution_id')
WHERE (institution_id IS NULL OR institution_id = '');

UPDATE public.users
SET "institutionId" = institution_id
WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL;

UPDATE public.users
SET admission_number = COALESCE(NULLIF(admission_number, ''), NULLIF("admissionNumber", ''), metadata->>'admissionNumber', metadata->>'admission_number', metadata->>'admNo')
WHERE (admission_number IS NULL OR admission_number = '');

UPDATE public.users
SET "admissionNumber" = admission_number
WHERE ("admissionNumber" IS NULL OR "admissionNumber" = '') AND admission_number IS NOT NULL;

UPDATE public.users
SET student_class = COALESCE(NULLIF(student_class, ''), NULLIF("studentClass", ''), metadata->>'studentClass', metadata->>'gradeLevel')
WHERE (student_class IS NULL OR student_class = '');

UPDATE public.users
SET "studentClass" = student_class
WHERE ("studentClass" IS NULL OR "studentClass" = '') AND student_class IS NOT NULL;

-- 5. Backfill missing institution_id on student_enrollments from users
UPDATE public.student_enrollments se
SET institution_id = u.institution_id,
    "institutionId" = u.institution_id
FROM public.users u
WHERE (se.institution_id IS NULL OR se.institution_id = '')
  AND se.user_id IS NOT NULL
  AND u.id::text = se.user_id::text
  AND u.institution_id IS NOT NULL AND u.institution_id <> '';

-- 6. Backfill student_enrollments from student users that don't have enrollment entries
INSERT INTO public.student_enrollments (
    id,
    institution_id,
    "institutionId",
    user_id,
    "userId",
    enrollment_type,
    "enrollmentType",
    admission_number,
    "admissionNumber",
    status,
    enrollment_date,
    course_id,
    class_id,
    metadata,
    created_at,
    updated_at
)
SELECT
    'enr_' || REPLACE(u.id, 'u_', '') AS id,
    u.institution_id,
    u.institution_id AS "institutionId",
    u.id AS user_id,
    u.id AS "userId",
    'academic' AS enrollment_type,
    'academic' AS "enrollmentType",
    COALESCE(u.admission_number, u.metadata->>'admissionNumber', u.metadata->>'admNo', 'ADM-' || u.id) AS admission_number,
    COALESCE(u.admission_number, u.metadata->>'admissionNumber', u.metadata->>'admNo', 'ADM-' || u.id) AS "admissionNumber",
    'Active' AS status,
    COALESCE(u.created_at::date, CURRENT_DATE) AS enrollment_date,
    u.metadata->>'courseId' AS course_id,
    u.metadata->>'classId' AS class_id,
    jsonb_build_object(
        'studentName', u.name,
        'fullName', u.name,
        'name', u.name,
        'gradeLevel', COALESCE(u.student_class, u.metadata->>'gradeLevel', u.metadata->>'studentClass', ''),
        'stream', COALESCE(u.metadata->>'stream', ''),
        'gender', COALESCE(u.metadata->>'gender', ''),
        'autoGenerated', false
    ) AS metadata,
    COALESCE(u.created_at, NOW()) AS created_at,
    NOW() AS updated_at
FROM public.users u
WHERE u.institution_id IS NOT NULL AND u.institution_id <> ''
  AND (
    LOWER(COALESCE(u.role, '')) IN ('student', 'learner', 'pupil', 'cadet', 'scholar')
    OR (
      COALESCE(u.role, '') NOT IN ('super_admin', 'admin', 'teacher', 'lecturer', 'instructor', 'driving_instructor', 'parent', 'driver', 'librarian', 'accountant', 'staff', 'support_staff', 'nurse', 'doctor', 'receptionist', 'cook', 'security', 'prefect_coordinator')
      AND (
        u.admission_number IS NOT NULL 
        OR u.student_class IS NOT NULL 
        OR u.metadata->>'admissionNumber' IS NOT NULL 
        OR u.metadata->>'admNo' IS NOT NULL
        OR u.metadata->>'studentClass' IS NOT NULL
      )
    )
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.student_enrollments se
    WHERE se.user_id = u.id 
       OR se.id = ('enr_' || REPLACE(u.id, 'u_', ''))
       OR se.id = u.id
  )
ON CONFLICT (id) DO UPDATE SET
    institution_id = EXCLUDED.institution_id,
    "institutionId" = EXCLUDED."institutionId",
    admission_number = COALESCE(public.student_enrollments.admission_number, EXCLUDED.admission_number),
    "admissionNumber" = COALESCE(public.student_enrollments."admissionNumber", EXCLUDED."admissionNumber");

-- 7. Ensure high-performance composite indexes exist
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_asc ON public.student_enrollments(institution_id, id ASC);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_desc ON public.student_enrollments(institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_user_id ON public.student_enrollments(institution_id, user_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_adm_no ON public.student_enrollments(institution_id, admission_number);
CREATE INDEX IF NOT EXISTS idx_users_inst_id ON public.users(institution_id);

COMMIT;

-- Verification summary
SELECT 'student_enrollments' AS table_name, COUNT(*) AS total_rows, COUNT(institution_id) AS with_institution_id, COUNT(admission_number) AS with_adm_no FROM public.student_enrollments
UNION ALL
SELECT 'student_users' AS table_name, COUNT(*) AS total_rows, COUNT(institution_id) AS with_institution_id, COUNT(admission_number) AS with_adm_no FROM public.users WHERE LOWER(COALESCE(role, '')) IN ('student', 'learner', 'pupil', 'cadet', 'scholar');

