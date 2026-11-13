-- ============================================================================
-- TalkSasa: Populate and Sync All Student Accounts in public.users
-- File: database/talksasa_populate_users_from_student_enrollments.sql
-- Run in Supabase SQL Editor / psql
-- ============================================================================

BEGIN;

-- 1. Ensure all users linked to enrollments have role = 'student'
UPDATE public.users u
SET role = 'student',
    updated_at = NOW()
FROM public.student_enrollments se
WHERE se.user_id = u.id
  AND (u.role IS NULL OR lower(u.role) NOT IN ('super_admin', 'admin', 'teacher', 'instructor', 'parent', 'staff'));

-- 2. Insert any enrolled learners who do not yet exist in public.users
INSERT INTO public.users (
    id, 
    institution_id, 
    name, 
    email, 
    role, 
    phone_number, 
    admission_number,
    student_class,
    created_at, 
    updated_at
)
SELECT DISTINCT ON (e.user_id)
    e.user_id,
    e.institution_id,
    COALESCE(
        NULLIF(e.metadata->>'studentName', ''),
        NULLIF(e.metadata->>'name', ''),
        NULLIF(e.metadata->>'fullName', ''),
        'Student ' || NULLIF(e.admission_number, '')
    ) AS name,
    'student_' || e.user_id || '@eduai.local' AS email,
    'student' AS role,
    COALESCE(NULLIF(e.metadata->>'parentPhone', ''), '') AS phone_number,
    COALESCE(e.admission_number, '') AS admission_number,
    COALESCE(NULLIF(e.metadata->>'gradeLevel', ''), NULLIF(e.metadata->>'studentClass', ''), '') AS student_class,
    COALESCE(e.created_at, NOW()) AS created_at,
    NOW() AS updated_at
FROM public.student_enrollments e
WHERE e.user_id IS NOT NULL 
  AND e.user_id <> ''
  AND NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.id = e.user_id
  )
ON CONFLICT (id) DO UPDATE
SET role = 'student',
    admission_number = COALESCE(NULLIF(public.users.admission_number, ''), EXCLUDED.admission_number),
    institution_id = COALESCE(NULLIF(public.users.institution_id, ''), EXCLUDED.institution_id),
    updated_at = NOW();

COMMIT;

-- Verify Total Learners count
SELECT COUNT(*) AS total_learners FROM public.users WHERE role = 'student';
