-- ============================================================================
-- TalkSasa PostgreSQL Repair: Restore Real Student Names & Clean Duplicates
-- Run this in TalkSasa Database query editor / psql on PostgreSQL
-- ============================================================================
-- 1. Copies real student names from shadow records into primary enrollment records
-- 2. Populates / updates student user profiles in public.users
-- 3. Safely removes ~4,902 redundant shadow records (enr_usr_...)
-- 4. Enforces unique constraint to prevent future duplication
-- ============================================================================

BEGIN;

-- Step 1: Copy real names from shadow/duplicate records into primary enrollment records
UPDATE public.student_enrollments o
SET metadata = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(NULLIF(o.metadata, 'null'::jsonb), '{}'::jsonb),
            '{studentName}',
            to_jsonb(COALESCE(NULLIF(s.metadata->>'studentName', ''), NULLIF(s.metadata->>'name', ''), NULLIF(s.metadata->>'fullName', '')))
        ),
        '{name}',
        to_jsonb(COALESCE(NULLIF(s.metadata->>'studentName', ''), NULLIF(s.metadata->>'name', ''), NULLIF(s.metadata->>'fullName', '')))
    ),
    '{fullName}',
    to_jsonb(COALESCE(NULLIF(s.metadata->>'studentName', ''), NULLIF(s.metadata->>'name', ''), NULLIF(s.metadata->>'fullName', '')))
)
FROM public.student_enrollments s
WHERE o.institution_id = s.institution_id
  AND o.user_id = s.user_id
  AND o.id <> s.id
  AND (o.metadata->>'studentName' IS NULL OR o.metadata->>'studentName' = '')
  AND (
    (s.metadata->>'studentName' IS NOT NULL AND s.metadata->>'studentName' <> '')
    OR (s.metadata->>'name' IS NOT NULL AND s.metadata->>'name' <> '')
    OR (s.metadata->>'fullName' IS NOT NULL AND s.metadata->>'fullName' <> '')
  );

-- Step 2: Ensure all student user accounts exist in public.users with their real names
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
ORDER BY e.user_id,
    CASE 
        WHEN e.metadata->>'studentName' IS NOT NULL 
             AND e.metadata->>'studentName' <> '' 
             AND e.metadata->>'studentName' NOT LIKE 'Student %' 
        THEN 1 ELSE 2 
    END ASC
ON CONFLICT (id) DO UPDATE
SET name = CASE 
        WHEN EXCLUDED.name IS NOT NULL AND EXCLUDED.name <> '' AND EXCLUDED.name NOT LIKE 'Student %' 
        THEN EXCLUDED.name 
        ELSE public.users.name 
    END,
    admission_number = COALESCE(NULLIF(public.users.admission_number, ''), EXCLUDED.admission_number),
    institution_id = COALESCE(NULLIF(public.users.institution_id, ''), EXCLUDED.institution_id),
    updated_at = NOW();

-- Step 3: Synchronize names from public.users back into student_enrollments metadata where still missing
UPDATE public.student_enrollments e
SET metadata = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(NULLIF(e.metadata, 'null'::jsonb), '{}'::jsonb),
            '{studentName}',
            to_jsonb(u.name)
        ),
        '{name}',
        to_jsonb(u.name)
    ),
    '{fullName}',
    to_jsonb(u.name)
)
FROM public.users u
WHERE e.user_id = u.id
  AND u.name IS NOT NULL 
  AND u.name <> '' 
  AND u.name NOT LIKE 'Student %'
  AND (e.metadata->>'studentName' IS NULL OR e.metadata->>'studentName' = '');

-- Step 4: Safely consolidate data and remove all duplicate enrollments per (institution_id, user_id)
-- 4a. Merge non-null admission numbers and metadata from duplicates into the primary survivor record
WITH ranked AS (
    SELECT 
        id,
        institution_id,
        user_id,
        admission_number,
        metadata,
        ROW_NUMBER() OVER (
            PARTITION BY institution_id, user_id
            ORDER BY 
                CASE 
                    WHEN admission_number IS NOT NULL 
                         AND admission_number <> '' 
                         AND admission_number NOT LIKE 'ADM-usr_%' 
                         AND admission_number NOT LIKE 'ADM-%' 
                    THEN 1
                    WHEN admission_number IS NOT NULL AND admission_number <> '' THEN 2
                    ELSE 3
                END ASC,
                CASE 
                    WHEN metadata->>'studentName' IS NOT NULL 
                         AND metadata->>'studentName' <> '' 
                         AND metadata->>'studentName' NOT LIKE 'Student %' 
                    THEN 1
                    WHEN metadata->>'studentName' IS NOT NULL AND metadata->>'studentName' <> '' THEN 2
                    ELSE 3
                END ASC,
                CASE 
                    WHEN metadata->>'parentPhone' IS NOT NULL AND metadata->>'parentPhone' <> '' THEN 1 
                    ELSE 2 
                END ASC,
                CASE WHEN id LIKE 'enr_usr_%' THEN 2 ELSE 1 END ASC,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id ASC
        ) AS rn
    FROM public.student_enrollments
    WHERE user_id IS NOT NULL AND user_id <> ''
),
primary_records AS (
    SELECT id, institution_id, user_id, admission_number, metadata
    FROM ranked
    WHERE rn = 1
),
duplicate_candidates AS (
    SELECT 
        d.institution_id,
        d.user_id,
        MAX(CASE 
            WHEN d.admission_number IS NOT NULL 
                 AND d.admission_number <> '' 
                 AND d.admission_number NOT LIKE 'ADM-%' 
            THEN d.admission_number 
            ELSE NULL 
        END) AS best_dup_adm,
        MAX(CASE 
            WHEN d.metadata->>'studentName' IS NOT NULL 
                 AND d.metadata->>'studentName' <> '' 
                 AND d.metadata->>'studentName' NOT LIKE 'Student %' 
            THEN d.metadata->>'studentName' 
            ELSE NULL 
        END) AS best_dup_name,
        MAX(NULLIF(d.metadata->>'parentPhone', '')) AS best_dup_phone,
        MAX(NULLIF(d.metadata->>'gradeLevel', '')) AS best_dup_grade
    FROM ranked d
    WHERE d.rn > 1
    GROUP BY d.institution_id, d.user_id
)
UPDATE public.student_enrollments se
SET admission_number = COALESCE(NULLIF(se.admission_number, ''), dc.best_dup_adm),
    metadata = jsonb_strip_nulls(
        COALESCE(se.metadata, '{}'::jsonb) || 
        jsonb_build_object(
            'studentName', COALESCE(NULLIF(se.metadata->>'studentName', ''), dc.best_dup_name),
            'parentPhone', COALESCE(NULLIF(se.metadata->>'parentPhone', ''), dc.best_dup_phone),
            'gradeLevel',  COALESCE(NULLIF(se.metadata->>'gradeLevel', ''), dc.best_dup_grade)
        )
    )
FROM primary_records pr
JOIN duplicate_candidates dc 
  ON pr.institution_id = dc.institution_id 
 AND pr.user_id = dc.user_id
WHERE se.id = pr.id;

-- 4b. Delete all duplicate records (rn > 1), leaving exactly one clean primary record per (institution_id, user_id)
WITH ranked_enrollments AS (
    SELECT 
        id,
        ROW_NUMBER() OVER (
            PARTITION BY institution_id, user_id
            ORDER BY 
                CASE 
                    WHEN admission_number IS NOT NULL 
                         AND admission_number <> '' 
                         AND admission_number NOT LIKE 'ADM-usr_%' 
                         AND admission_number NOT LIKE 'ADM-%' 
                    THEN 1
                    WHEN admission_number IS NOT NULL AND admission_number <> '' THEN 2
                    ELSE 3
                END ASC,
                CASE 
                    WHEN metadata->>'studentName' IS NOT NULL 
                         AND metadata->>'studentName' <> '' 
                         AND metadata->>'studentName' NOT LIKE 'Student %' 
                    THEN 1
                    WHEN metadata->>'studentName' IS NOT NULL AND metadata->>'studentName' <> '' THEN 2
                    ELSE 3
                END ASC,
                CASE 
                    WHEN metadata->>'parentPhone' IS NOT NULL AND metadata->>'parentPhone' <> '' THEN 1 
                    ELSE 2 
                END ASC,
                CASE WHEN id LIKE 'enr_usr_%' THEN 2 ELSE 1 END ASC,
                updated_at DESC NULLS LAST,
                created_at DESC NULLS LAST,
                id ASC
        ) AS rn
    FROM public.student_enrollments
    WHERE user_id IS NOT NULL AND user_id <> ''
)
DELETE FROM public.student_enrollments
WHERE id IN (
    SELECT id FROM ranked_enrollments WHERE rn > 1
);

-- Step 5: Enforce a unique index on (institution_id, user_id) for active enrollments
CREATE UNIQUE INDEX IF NOT EXISTS uq_idx_student_enrollments_inst_user 
ON public.student_enrollments(institution_id, user_id)
WHERE user_id IS NOT NULL AND user_id <> '';

COMMIT;

-- Verification check
SELECT 
    COUNT(*) AS total_enrollments,
    COUNT(CASE WHEN metadata->>'studentName' IS NOT NULL AND metadata->>'studentName' <> '' THEN 1 END) AS with_real_name,
    COUNT(CASE WHEN admission_number IS NOT NULL AND admission_number <> '' THEN 1 END) AS with_admission_no
FROM public.student_enrollments;
