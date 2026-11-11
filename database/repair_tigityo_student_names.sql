-- ============================================================================
-- EduAI: Targeted Repair Script for Tigityo Secondary School Student Names
-- File: database/repair_tigityo_student_names.sql
-- Run this in your Supabase SQL Editor or PostgreSQL tool (pgAdmin, psql)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: PRE-CHECK (Inspect current records for Tigityo)
-- ----------------------------------------------------------------------------
SELECT 
    se.id AS enrollment_id,
    se.admission_number,
    se.user_id,
    se.institution_id,
    se.metadata->>'studentName' AS meta_student_name,
    u.id AS matched_user_id,
    u.name AS matched_user_name,
    u.role AS user_role,
    u.admission_number AS user_adm
FROM public.student_enrollments se
LEFT JOIN public.users u 
  ON (u.id = se.user_id 
      OR u.admission_number = se.admission_number 
      OR replace(se.user_id, 'u_', '') = u.id)
WHERE se.institution_id ILIKE '%tigityo%'
ORDER BY se.admission_number ASC
LIMIT 20;

-- ----------------------------------------------------------------------------
-- STEP 2: REPAIR SCRIPT (Fixes linkage, role, and metadata names)
-- ----------------------------------------------------------------------------
BEGIN;

-- 0. Ensure columns exist if beta SQL has student_name or name
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS student_name TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- If top-level name or student_name exists on student_enrollments, populate metadata
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
        jsonb_set(
            jsonb_set(COALESCE(se.metadata, '{}'::jsonb), '{studentName}', to_jsonb(COALESCE(se.name, se.student_name, se."studentName"))),
            '{name}', to_jsonb(COALESCE(se.name, se.student_name, se."studentName"))
        ),
        '{fullName}', to_jsonb(COALESCE(se.name, se.student_name, se."studentName"))
    )
WHERE se.institution_id ILIKE '%tigityo%'
  AND COALESCE(se.name, se.student_name, se."studentName") IS NOT NULL
  AND COALESCE(se.name, se.student_name, se."studentName") NOT ILIKE 'Student %';

-- A. Link student_enrollments.user_id to the genuine user by admission number
UPDATE public.student_enrollments se
SET user_id = u.id,
    "userId" = u.id
FROM public.users u
WHERE se.institution_id ILIKE '%tigityo%'
  AND (se.user_id IS NULL OR se.user_id = '' OR NOT EXISTS (SELECT 1 FROM public.users ex WHERE ex.id = se.user_id))
  AND u.admission_number IS NOT NULL
  AND btrim(u.admission_number) = btrim(se.admission_number);

-- B. Ensure matching users have role = 'student' and admission_number is set
UPDATE public.users u
SET role = 'student',
    admission_number = COALESCE(NULLIF(u.admission_number, ''), se.admission_number)
FROM public.student_enrollments se
WHERE se.institution_id ILIKE '%tigityo%'
  AND (u.id = se.user_id OR u.admission_number = se.admission_number)
  AND (u.role IS NULL OR u.role <> 'student');

-- C. Sync genuine student names from users into student_enrollments.metadata
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
WHERE se.institution_id ILIKE '%tigityo%'
  AND (
      se.user_id = u.id 
      OR (se.admission_number IS NOT NULL AND u.admission_number = se.admission_number)
      OR replace(se.user_id, 'u_', '') = u.id
  )
  AND u.name IS NOT NULL 
  AND btrim(u.name) <> ''
  AND lower(btrim(u.name)) NOT IN ('unknown student', 'unknown', 'student');

-- D. Sync from students table if present and not in users
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
            updated_at = NOW()
        FROM public.students st
        WHERE se.institution_id ILIKE '%tigityo%'
          AND se.admission_number = st.admission_number
          AND st.name IS NOT NULL
          AND btrim(st.name) <> ''
          AND (se.metadata->>'studentName' IS NULL OR se.metadata->>'studentName' ~* '^Student\s+[0-9]+');
    END IF;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

COMMIT;

-- ----------------------------------------------------------------------------
-- STEP 3: POST-CHECK (Verify real names are now populated)
-- ----------------------------------------------------------------------------
SELECT 
    se.admission_number,
    se.metadata->>'studentName' AS repaired_name,
    se.user_id,
    u.name AS user_table_name,
    u.role AS user_role
FROM public.student_enrollments se
LEFT JOIN public.users u ON u.id = se.user_id
WHERE se.institution_id ILIKE '%tigityo%'
ORDER BY se.admission_number ASC
LIMIT 15;
