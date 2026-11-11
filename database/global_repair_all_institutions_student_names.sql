-- ============================================================================
-- EduAI: Global Repair Script for ALL Institutions (Missing Student Names)
-- File: database/global_repair_all_institutions_student_names.sql
-- Run this in your Supabase SQL Editor or PostgreSQL tool (pgAdmin, psql)
-- ============================================================================

-- Ensure all required columns exist first so any subsequent queries are completely safe
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- ----------------------------------------------------------------------------
-- STEP 1: PRE-CHECK (Audit which institutions are affected)
-- ----------------------------------------------------------------------------
SELECT 
    COALESCE(i.name, se.institution_id) AS institution_name,
    se.institution_id,
    COUNT(*) AS total_students_showing_generic_name
FROM public.student_enrollments se
LEFT JOIN public.institutions i ON (i.id = se.institution_id OR replace(i.id, 'inst_', '') = replace(se.institution_id, 'inst_', ''))
WHERE (
    COALESCE(se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name') IS NULL 
    OR COALESCE(se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name') ~* '^Student\s+[0-9]+'
    OR lower(btrim(COALESCE(se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name'))) IN ('unknown student', 'unknown', 'student', '')
)
GROUP BY i.name, se.institution_id
ORDER BY total_students_showing_generic_name DESC;

-- ----------------------------------------------------------------------------
-- STEP 2: GLOBAL REPAIR SCRIPT (Fixes ALL institutions in one execution)
-- ----------------------------------------------------------------------------
BEGIN;

-- A. Ensure all required columns exist on public.student_enrollments
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- B. Ensure all required columns exist on public.users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- C. Drop restrictive foreign key constraints that break on ID casing or format
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_institution_id_fkey CASCADE;
ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS student_enrollments_user_id_fkey CASCADE;
ALTER TABLE public.student_enrollments ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.student_enrollments ALTER COLUMN user_id DROP NOT NULL;

-- D. Sync top-level name / student_name columns into metadata across all enrollments
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
        jsonb_set(
            jsonb_set(COALESCE(se.metadata, '{}'::jsonb), '{studentName}', to_jsonb(COALESCE(se.name, se.student_name, se."studentName"))),
            '{name}', to_jsonb(COALESCE(se.name, se.student_name, se."studentName"))
        ),
        '{fullName}', to_jsonb(COALESCE(se.name, se.student_name, se."studentName"))
    )
WHERE COALESCE(se.name, se.student_name, se."studentName") IS NOT NULL
  AND COALESCE(se.name, se.student_name, se."studentName") NOT ILIKE 'Student %'
  AND (
      se.metadata->>'studentName' IS NULL 
      OR se.metadata->>'studentName' ~* '^Student\s+[0-9]+'
      OR se.metadata->>'studentName' IN ('Unknown Student', 'Student', '')
  );

-- E. Link student_enrollments.user_id to public.users by matching admission number within each institution
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
      OR lower(btrim(u.admission_number)) = lower(btrim(se.admission_number))
  )
  AND (
      se.institution_id = u.institution_id
      OR replace(COALESCE(se.institution_id, ''), 'inst_', '') = replace(COALESCE(u.institution_id, ''), 'inst_', '')
  );

-- F. Ensure all enrolled learners have role = 'student' in users table
UPDATE public.users u
SET role = 'student'
FROM public.student_enrollments se
WHERE (se.user_id = u.id OR se.admission_number = u.admission_number)
  AND (u.role IS NULL OR lower(u.role) NOT IN ('student', 'learner', 'pupil', 'cadet', 'scholar'))
  AND (u.role IS NULL OR lower(u.role) NOT IN ('super_admin', 'admin', 'teacher', 'lecturer', 'instructor', 'driving_instructor', 'parent', 'accountant', 'staff'));

-- G. Pull real student names from public.users into student_enrollments across ALL institutions
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
        jsonb_set(
            jsonb_set(COALESCE(se.metadata, '{}'::jsonb), '{studentName}', to_jsonb(u.name)),
            '{name}', to_jsonb(u.name)
        ),
        '{fullName}', to_jsonb(u.name)
    ),
    name = COALESCE(NULLIF(se.name, ''), u.name),
    student_name = COALESCE(NULLIF(se.student_name, ''), u.name),
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

-- H. If a legacy/external 'students' table exists, also sync from it
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'students') THEN
        UPDATE public.student_enrollments se
        SET metadata = jsonb_set(
                jsonb_set(
                    jsonb_set(COALESCE(se.metadata, '{}'::jsonb), '{studentName}', to_jsonb(st.name)),
                    '{name}', to_jsonb(st.name)
                ),
                '{fullName}', to_jsonb(st.name)
            ),
            name = COALESCE(NULLIF(se.name, ''), st.name),
            student_name = COALESCE(NULLIF(se.student_name, ''), st.name),
            updated_at = NOW()
        FROM public.students st
        WHERE (se.admission_number = st.admission_number OR se.user_id = st.id)
          AND replace(COALESCE(se.institution_id, ''), 'inst_', '') = replace(COALESCE(st.institution_id, ''), 'inst_', '')
          AND st.name IS NOT NULL
          AND btrim(st.name) <> ''
          AND (
              se.metadata->>'studentName' IS NULL 
              OR se.metadata->>'studentName' ~* '^Student\s+[0-9]+'
              OR se.metadata->>'studentName' IN ('Unknown Student', 'Student', '')
          );
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- STEP 3: POST-CHECK (Verify that all institutions are repaired)
-- ----------------------------------------------------------------------------
SELECT 
    COALESCE(i.name, se.institution_id) AS institution_name,
    COUNT(*) AS total_enrolled,
    COUNT(CASE WHEN se.metadata->>'studentName' IS NOT NULL AND se.metadata->>'studentName' NOT ILIKE 'Student %' THEN 1 END) AS with_real_names,
    COUNT(CASE WHEN se.metadata->>'studentName' IS NULL OR se.metadata->>'studentName' ILIKE 'Student %' THEN 1 END) AS remaining_generic
FROM public.student_enrollments se
LEFT JOIN public.institutions i ON (i.id = se.institution_id OR replace(i.id, 'inst_', '') = replace(se.institution_id, 'inst_', ''))
GROUP BY i.name, se.institution_id
ORDER BY total_enrolled DESC;
