-- ============================================================================
-- TalkSasa: Sync Missing Student Names From Financial Records (Invoices & Receipts)
-- File: database/talksasa_sync_missing_student_names_from_financials.sql
-- Run in Supabase SQL Editor / psql
-- ============================================================================

BEGIN;

-- 1. Sync from top-level name / student_name columns on student_enrollments if populated
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(NULLIF(se.metadata, 'null'::jsonb), '{}'::jsonb),
            '{studentName}',
            to_jsonb(COALESCE(NULLIF(se.name, ''), NULLIF(se.student_name, ''), NULLIF(se."studentName", '')))
        ),
        '{name}',
        to_jsonb(COALESCE(NULLIF(se.name, ''), NULLIF(se.student_name, ''), NULLIF(se."studentName", '')))
    ),
    '{fullName}',
    to_jsonb(COALESCE(NULLIF(se.name, ''), NULLIF(se.student_name, ''), NULLIF(se."studentName", '')))
)
WHERE (se.metadata->>'studentName' IS NULL OR se.metadata->>'studentName' = '' OR se.metadata->>'studentName' LIKE 'Student %')
  AND COALESCE(NULLIF(se.name, ''), NULLIF(se.student_name, ''), NULLIF(se."studentName", '')) IS NOT NULL
  AND COALESCE(NULLIF(se.name, ''), NULLIF(se.student_name, ''), NULLIF(se."studentName", '')) NOT LIKE 'Student %';

-- 2. Sync from invoices by matching user_id = student_id
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(NULLIF(se.metadata, 'null'::jsonb), '{}'::jsonb),
            '{studentName}',
            to_jsonb(i.student_name)
        ),
        '{name}',
        to_jsonb(i.student_name)
    ),
    '{fullName}',
    to_jsonb(i.student_name)
)
FROM public.invoices i
WHERE se.user_id = i.student_id
  AND (se.metadata->>'studentName' IS NULL OR se.metadata->>'studentName' = '' OR se.metadata->>'studentName' LIKE 'Student %')
  AND i.student_name IS NOT NULL
  AND i.student_name <> ''
  AND i.student_name NOT LIKE 'Student %';

-- 3. Sync from invoices by matching admission_number
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(NULLIF(se.metadata, 'null'::jsonb), '{}'::jsonb),
            '{studentName}',
            to_jsonb(i.student_name)
        ),
        '{name}',
        to_jsonb(i.student_name)
    ),
    '{fullName}',
    to_jsonb(i.student_name)
)
FROM public.invoices i
WHERE se.admission_number IS NOT NULL
  AND se.admission_number <> ''
  AND (se.admission_number = i.admission_number OR se.admission_number = i."admissionNumber")
  AND (se.metadata->>'studentName' IS NULL OR se.metadata->>'studentName' = '' OR se.metadata->>'studentName' LIKE 'Student %')
  AND i.student_name IS NOT NULL
  AND i.student_name <> ''
  AND i.student_name NOT LIKE 'Student %';

-- 4. Sync from receipts by matching user_id = student_id
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(NULLIF(se.metadata, 'null'::jsonb), '{}'::jsonb),
            '{studentName}',
            to_jsonb(r.student_name)
        ),
        '{name}',
        to_jsonb(r.student_name)
    ),
    '{fullName}',
    to_jsonb(r.student_name)
)
FROM public.receipts r
WHERE se.user_id = r.student_id
  AND (se.metadata->>'studentName' IS NULL OR se.metadata->>'studentName' = '' OR se.metadata->>'studentName' LIKE 'Student %')
  AND r.student_name IS NOT NULL
  AND r.student_name <> ''
  AND r.student_name NOT LIKE 'Student %';

-- 5. Sync from receipts by matching admission_number
UPDATE public.student_enrollments se
SET metadata = jsonb_set(
    jsonb_set(
        jsonb_set(
            COALESCE(NULLIF(se.metadata, 'null'::jsonb), '{}'::jsonb),
            '{studentName}',
            to_jsonb(r.student_name)
        ),
        '{name}',
        to_jsonb(r.student_name)
    ),
    '{fullName}',
    to_jsonb(r.student_name)
)
FROM public.receipts r
WHERE se.admission_number IS NOT NULL
  AND se.admission_number <> ''
  AND (se.admission_number = r.admission_number OR se.admission_number = r."admissionNumber")
  AND (se.metadata->>'studentName' IS NULL OR se.metadata->>'studentName' = '' OR se.metadata->>'studentName' LIKE 'Student %')
  AND r.student_name IS NOT NULL
  AND r.student_name <> ''
  AND r.student_name NOT LIKE 'Student %';

-- 6. Reflect restored student names into public.users
UPDATE public.users u
SET name = se.metadata->>'studentName',
    updated_at = NOW()
FROM public.student_enrollments se
WHERE u.id = se.user_id
  AND (u.name IS NULL OR u.name = '' OR u.name LIKE 'Student %')
  AND se.metadata->>'studentName' IS NOT NULL
  AND se.metadata->>'studentName' <> ''
  AND se.metadata->>'studentName' NOT LIKE 'Student %';

COMMIT;
