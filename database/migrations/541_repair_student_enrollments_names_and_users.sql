-- ============================================================================
-- Migration 541: Repair Student Names, Metadata & User Linkage in student_enrollments
-- Resolves: Student registry displaying "Student [Admission No]" instead of real names
-- Root causes:
--   1. student_enrollments has no native 'name' column; names live in users.name or se.metadata->>'studentName'.
--   2. student_enrollments.user_id was unlinked or mismatched with users.id.
--   3. Institution ID prefix differences (e.g. 'tigityo_secondary_school' vs 'inst_tigityo_secondary_school').
--   4. Missing 'studentName' / 'fullName' in student_enrollments.metadata JSONB.
--   5. users.role not set to 'student' (causing frontend to filter them out).
-- ============================================================================

BEGIN;

-- 1. Ensure required columns and JSONB structures exist on student_enrollments & users
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "userId" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS assessment_no TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "assessmentNo" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_class TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "studentClass" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. Synchronize camelCase / snake_case columns
UPDATE public.student_enrollments
SET name = COALESCE(NULLIF(name, ''), NULLIF(student_name, ''), NULLIF("studentName", ''), metadata->>'studentName', metadata->>'fullName', metadata->>'name'),
    student_name = COALESCE(NULLIF(student_name, ''), NULLIF(name, ''), NULLIF("studentName", ''), metadata->>'studentName', metadata->>'fullName', metadata->>'name'),
    "studentName" = COALESCE(NULLIF("studentName", ''), NULLIF(student_name, ''), NULLIF(name, ''), metadata->>'studentName', metadata->>'fullName', metadata->>'name')
WHERE (name IS NULL OR name = '' OR student_name IS NULL OR student_name = '')
  AND (metadata->>'studentName' IS NOT NULL OR metadata->>'name' IS NOT NULL OR metadata->>'fullName' IS NOT NULL);

-- Also sync top-level name into metadata if metadata was missing it
UPDATE public.student_enrollments
SET metadata = jsonb_set(
        jsonb_set(
            jsonb_set(COALESCE(metadata, '{}'::jsonb), '{studentName}', to_jsonb(COALESCE(name, student_name, "studentName"))),
            '{name}', to_jsonb(COALESCE(name, student_name, "studentName"))
        ),
        '{fullName}', to_jsonb(COALESCE(name, student_name, "studentName"))
    )
WHERE (metadata->>'studentName' IS NULL OR metadata->>'studentName' ~* '^Student\s+[0-9]+' OR metadata->>'studentName' = '')
  AND COALESCE(name, student_name, "studentName") IS NOT NULL 
  AND COALESCE(name, student_name, "studentName") NOT ILIKE 'Student %';

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
SET admission_number = COALESCE(
    NULLIF(admission_number, ''),
    NULLIF("admissionNumber", ''),
    metadata->>'admissionNumber',
    metadata->>'admission_number',
    metadata->>'admNo',
    metadata->>'adm_no'
)
WHERE (admission_number IS NULL OR admission_number = '');

UPDATE public.student_enrollments
SET "admissionNumber" = admission_number
WHERE ("admissionNumber" IS NULL OR "admissionNumber" = '') AND admission_number IS NOT NULL;

UPDATE public.users
SET admission_number = COALESCE(
    NULLIF(admission_number, ''),
    NULLIF("admissionNumber", ''),
    metadata->>'admissionNumber',
    metadata->>'admission_number',
    metadata->>'admNo',
    metadata->>'adm_no'
)
WHERE (admission_number IS NULL OR admission_number = '');

UPDATE public.users
SET "admissionNumber" = admission_number
WHERE ("admissionNumber" IS NULL OR "admissionNumber" = '') AND admission_number IS NOT NULL;

-- 3. Sync institution_id between student_enrollments and users where one is prefixed with 'inst_' and the other is not
UPDATE public.student_enrollments se
SET institution_id = u.institution_id,
    "institutionId" = u.institution_id
FROM public.users u
WHERE se.user_id = u.id
  AND replace(se.institution_id, 'inst_', '') = replace(u.institution_id, 'inst_', '')
  AND se.institution_id <> u.institution_id;

-- 4. If students table exists (legacy/external table), sync names and admission numbers into users and student_enrollments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        -- Link student_enrollments.user_id from students table if user_id is missing/broken
        UPDATE public.student_enrollments se
        SET user_id = st.id,
            "userId" = st.id
        FROM public.students st
        WHERE (se.user_id IS NULL OR se.user_id = '' OR NOT EXISTS (SELECT 1 FROM public.users ex WHERE ex.id = se.user_id))
          AND se.admission_number IS NOT NULL
          AND (se.admission_number = st.admission_number OR regexp_replace(COALESCE(se.admission_number, ''), '[^a-zA-Z0-9]', '', 'g') = regexp_replace(COALESCE(st.admission_number, ''), '[^a-zA-Z0-9]', '', 'g'))
          AND replace(COALESCE(se.institution_id, ''), 'inst_', '') = replace(COALESCE(st.institution_id, ''), 'inst_', '');

        -- Sync student name from students table into student_enrollments.metadata
        UPDATE public.student_enrollments se
        SET metadata = jsonb_set(
                jsonb_set(
                    jsonb_set(COALESCE(se.metadata, '{}'::jsonb), '{studentName}', to_jsonb(st.name)),
                    '{name}', to_jsonb(st.name)
                ),
                '{fullName}', to_jsonb(st.name)
            ),
            updated_at = NOW()
        FROM public.students st
        WHERE (se.admission_number = st.admission_number OR se.user_id = st.id)
          AND replace(COALESCE(se.institution_id, ''), 'inst_', '') = replace(COALESCE(st.institution_id, ''), 'inst_', '')
          AND st.name IS NOT NULL
          AND btrim(st.name) <> ''
          AND (se.metadata->>'studentName' IS NULL OR se.metadata->>'studentName' ~* '^Student\s+[0-9]+');
    END IF;
EXCEPTION WHEN OTHERS THEN
    -- Continue if helper or table structure differs
    NULL;
END $$;

-- 5. Link student_enrollments.user_id to matching public.users by admission_number within tenant
UPDATE public.student_enrollments se
SET user_id = u.id,
    "userId" = u.id
FROM public.users u
WHERE (se.user_id IS NULL OR se.user_id = '' OR NOT EXISTS (SELECT 1 FROM public.users ex WHERE ex.id = se.user_id))
  AND se.admission_number IS NOT NULL
  AND btrim(se.admission_number) <> ''
  AND (
      u.admission_number = se.admission_number
      OR u.metadata->>'admissionNumber' = se.admission_number
      OR u.metadata->>'admission_number' = se.admission_number
      OR lower(btrim(u.admission_number)) = lower(btrim(se.admission_number))
  )
  AND (
      se.institution_id = u.institution_id
      OR replace(COALESCE(se.institution_id, ''), 'inst_', '') = replace(COALESCE(u.institution_id, ''), 'inst_', '')
  );

-- 6. Ensure matching users have role = 'student' so frontend views do not filter them out
UPDATE public.users u
SET role = 'student'
FROM public.student_enrollments se
WHERE (se.user_id = u.id OR se.admission_number = u.admission_number)
  AND (u.role IS NULL OR lower(u.role) NOT IN ('student', 'learner', 'pupil', 'cadet', 'scholar'))
  AND (u.role IS NULL OR lower(u.role) NOT IN ('super_admin', 'admin', 'teacher', 'lecturer', 'instructor', 'driving_instructor', 'parent', 'accountant', 'staff'));

-- 7. Sync real student names from public.users into student_enrollments.metadata
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
        jsonb_set(
            jsonb_set(COALESCE(se.metadata, '{}'::jsonb), '{studentName}', to_jsonb(u.name)),
            '{name}', to_jsonb(u.name)
        ),
        '{fullName}', to_jsonb(u.name)
    ),
    updated_at = NOW()
FROM public.users u
WHERE (
    se.user_id = u.id 
    OR 'u_' || replace(u.id, 'u_', '') = se.user_id 
    OR replace(se.user_id, 'u_', '') = u.id
    OR (se.admission_number IS NOT NULL AND u.admission_number = se.admission_number)
  )
  AND (
    se.institution_id = u.institution_id 
    OR replace(COALESCE(se.institution_id, ''), 'inst_', '') = replace(COALESCE(u.institution_id, ''), 'inst_', '')
  )
  AND u.name IS NOT NULL
  AND btrim(u.name) <> ''
  AND lower(btrim(u.name)) NOT IN ('unknown student', 'unknown', 'student', 'null', 'undefined')
  AND (
      se.metadata->>'studentName' IS NULL 
      OR se.metadata->>'studentName' ~* '^Student\s+[0-9]+'
      OR se.metadata->>'studentName' IN ('Unknown Student', 'Student', '')
  );

-- 8. Sync admission_number from users to student_enrollments where missing
UPDATE public.student_enrollments se
SET admission_number = u.admission_number,
    "admissionNumber" = u.admission_number
FROM public.users u
WHERE se.user_id = u.id
  AND (se.admission_number IS NULL OR se.admission_number = '')
  AND u.admission_number IS NOT NULL
  AND u.admission_number <> '';

-- 9. Refresh PostgREST schema cache if applicable
DO $$
BEGIN
    PERFORM pg_notify('pgrst', 'reload schema');
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMIT;
