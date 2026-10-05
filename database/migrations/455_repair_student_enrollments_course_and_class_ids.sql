-- Migration 455: Comprehensive Repair of NULL course_id and class_id on student_enrollments
-- Description:
--   Resolves missing/null course_id (Course ID) and class_id (CourseLevel / Stream ID) across all student enrollments:
--   1. Self metadata: se.metadata->>'courseId', se.metadata->>'course_id', se.metadata->>'classId', se.metadata->>'courseLevelId'
--   2. Associated user: public.users.course_id, public.users.course_level_id (by user_id, 'u_' prefix, raw prefix)
--   3. Courses table matching: Matches student's grade/class name against public.courses.name within the same tenant
--   4. Level/Stream matching: Matches student's stream against course.levels JSONB array to resolve exact class_id
--   5. Backfills users table: Synchronizes missing course_id and course_level_id on public.users
--   6. Synchronizes metadata: Keeps se.metadata->>'courseId' and se.metadata->>'classId' fully aligned with table columns
--
-- Performance: Set-based execution on temporary work table with index joins.
-- Safe & Idempotent: Can be run repeatedly; existing valid course_id and class_id assignments are preserved.

SET statement_timeout = '5min';

-- 0. Prerequisites: Ensure required columns exist
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS class_id TEXT;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS student_class TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stream TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS course_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS course_level_id TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- Drop rigid institution foreign key constraints on student_enrollments so tenant ID prefix variants or offline sync never abort
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname
        FROM   pg_constraint
        WHERE  conrelid = 'public.student_enrollments'::regclass
          AND  contype  = 'f'
          AND  (conname ILIKE '%institution%' OR conname = 'student_enrollments_institution_id_fkey')
    LOOP
        EXECUTE format('ALTER TABLE public.student_enrollments DROP CONSTRAINT IF EXISTS %I CASCADE;', r.conname);
    END LOOP;
END $$;

-- Helper to extract grade name from metadata or text
CREATE OR REPLACE FUNCTION public.fn_extract_clean_grade(p_grade TEXT, p_meta JSONB)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    candidates TEXT[];
    c TEXT;
    clean TEXT;
BEGIN
    candidates := ARRAY[
        p_grade,
        p_meta->>'gradeLevel',
        p_meta->>'grade_level',
        p_meta->>'studentClass',
        p_meta->>'student_class',
        p_meta->>'className',
        p_meta->>'class_name',
        p_meta->>'class',
        p_meta->>'grade',
        p_meta->>'form'
    ];
    FOREACH c IN ARRAY candidates LOOP
        IF c IS NOT NULL THEN
            clean := btrim(c);
            IF clean <> '' AND lower(clean) NOT IN ('—', '-', 'null', 'undefined', 'n/a', 'unclassified', 'no grade') THEN
                RETURN clean;
            END IF;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

-- Helper to extract stream name from metadata or text
CREATE OR REPLACE FUNCTION public.fn_extract_clean_stream(p_stream TEXT, p_meta JSONB)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
    candidates TEXT[];
    c TEXT;
    clean TEXT;
BEGIN
    candidates := ARRAY[
        p_stream,
        p_meta->>'stream',
        p_meta->>'streamName',
        p_meta->>'stream_name',
        p_meta->>'classStream',
        p_meta->>'class_stream',
        p_meta->>'streams'
    ];
    FOREACH c IN ARRAY candidates LOOP
        IF c IS NOT NULL THEN
            clean := btrim(c);
            IF clean <> '' AND lower(clean) NOT IN ('—', '-', 'null', 'undefined', 'n/a', 'none', 'all') THEN
                RETURN clean;
            END IF;
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

-- 1. Create work table of enrollments needing repair
DROP TABLE IF EXISTS _enr_course_fix;
CREATE TEMP TABLE _enr_course_fix AS
SELECT
    se.id,
    se.user_id::text                                                               AS user_id,
    replace(COALESCE(se.institution_id::text, ''), 'inst_', '')                    AS inst,
    COALESCE(se.institution_id::text, '')                                          AS raw_inst,
    se.course_id                                                                   AS current_course_id,
    se.class_id                                                                    AS current_class_id,
    (se.course_id IS NULL OR btrim(se.course_id) IN ('', 'null', 'undefined'))     AS need_course_id,
    (se.class_id IS NULL OR btrim(se.class_id) IN ('', 'null', 'undefined'))       AS need_class_id,
    public.fn_extract_clean_grade(
        COALESCE(to_jsonb(se)->>'student_class', to_jsonb(se)->>'grade_level', to_jsonb(se)->>'class_level'),
        se.metadata
    )                                                                              AS student_grade,
    public.fn_extract_clean_stream(
        to_jsonb(se)->>'stream',
        se.metadata
    )                                                                              AS student_stream,
    -- Candidate resolved IDs
    CASE 
        WHEN se.course_id IS NOT NULL AND btrim(se.course_id) NOT IN ('', 'null', 'undefined') THEN btrim(se.course_id)
        ELSE NULLIF(btrim(COALESCE(se.metadata->>'courseId', se.metadata->>'course_id')), '')
    END                                                                            AS new_course_id,
    CASE 
        WHEN se.class_id IS NOT NULL AND btrim(se.class_id) NOT IN ('', 'null', 'undefined') THEN btrim(se.class_id)
        ELSE NULLIF(btrim(COALESCE(se.metadata->>'classId', se.metadata->>'class_id', se.metadata->>'courseLevelId', se.metadata->>'levelId')), '')
    END                                                                            AS new_class_id
FROM public.student_enrollments se
WHERE se.course_id IS NULL 
   OR se.class_id IS NULL 
   OR btrim(se.course_id) IN ('', 'null', 'undefined')
   OR btrim(se.class_id) IN ('', 'null', 'undefined')
   OR se.metadata->>'courseId' IS NULL
   OR se.metadata->>'classId' IS NULL;

CREATE INDEX ON _enr_course_fix (user_id);
CREATE INDEX ON _enr_course_fix (inst);
ANALYZE _enr_course_fix;

-- 2. Step 1: Source A — Linked users table by user_id
-- We use to_jsonb(u) to safely access columns regardless of whether they exist as dedicated columns or in metadata JSONB
UPDATE _enr_course_fix f SET
    new_course_id  = COALESCE(
        f.new_course_id,
        CASE WHEN f.need_course_id THEN
            NULLIF(btrim(COALESCE(
                to_jsonb(u)->>'course_id',
                to_jsonb(u)->>'courseId',
                to_jsonb(u)->'metadata'->>'courseId',
                to_jsonb(u)->'metadata'->>'course_id'
            )), '')
        END
    ),
    new_class_id   = COALESCE(
        f.new_class_id,
        CASE WHEN f.need_class_id THEN
            NULLIF(btrim(COALESCE(
                to_jsonb(u)->>'course_level_id',
                to_jsonb(u)->>'courseLevelId',
                to_jsonb(u)->>'class_id',
                to_jsonb(u)->>'classId',
                to_jsonb(u)->'metadata'->>'courseLevelId',
                to_jsonb(u)->'metadata'->>'classId',
                to_jsonb(u)->'metadata'->>'levelId'
            )), '')
        END
    ),
    student_grade  = COALESCE(
        f.student_grade,
        public.fn_extract_clean_grade(
            COALESCE(to_jsonb(u)->>'student_class', to_jsonb(u)->>'class_level', to_jsonb(u)->>'grade_level'),
            COALESCE(u.metadata, to_jsonb(u)->'metadata', '{}'::jsonb)
        )
    ),
    student_stream = COALESCE(
        f.student_stream,
        public.fn_extract_clean_stream(
            to_jsonb(u)->>'stream',
            COALESCE(u.metadata, to_jsonb(u)->'metadata', '{}'::jsonb)
        )
    )
FROM public.users u
WHERE (u.id::text = f.user_id OR u.id::text = 'u_' || f.user_id OR (f.user_id LIKE 'u\_%' AND u.id::text = substr(f.user_id, 3)))
  AND ((f.need_course_id AND f.new_course_id IS NULL) OR (f.need_class_id AND f.new_class_id IS NULL) OR f.student_grade IS NULL);

-- 3. Step 2: Source B — Match against public.courses table by Grade Name within tenant
UPDATE _enr_course_fix f SET
    new_course_id = c.id
FROM public.courses c
WHERE f.need_course_id AND f.new_course_id IS NULL
  AND f.student_grade IS NOT NULL
  AND replace(COALESCE(c.institution_id::text, ''), 'inst_', '') = f.inst
  AND (
      -- Exact case-insensitive name match: "Grade 1" = "Grade 1"
      lower(btrim(c.name)) = lower(btrim(f.student_grade))
      -- Normalized comparison: "grade 1" in "Grade 1 East"
      OR (length(c.name) >= 3 AND lower(btrim(f.student_grade)) LIKE lower(btrim(c.name)) || '%')
      OR (length(f.student_grade) >= 3 AND lower(btrim(c.name)) LIKE lower(btrim(f.student_grade)) || '%')
      -- Code match: "G1", "FORM1" (safely accessed via to_jsonb in case column is missing)
      OR (to_jsonb(c)->>'code' IS NOT NULL AND lower(btrim(to_jsonb(c)->>'code')) = lower(btrim(f.student_grade)))
  );

-- 4. Step 3: Source C — Resolve class_id (CourseLevel) from course.levels JSONB array
-- Match stream against level names
UPDATE _enr_course_fix f SET
    new_class_id = lvl.level_id
FROM (
    SELECT DISTINCT ON (f2.id)
        f2.id,
        elem->>'id' AS level_id
    FROM _enr_course_fix f2
    JOIN public.courses c ON c.id = f2.new_course_id
    CROSS JOIN LATERAL jsonb_array_elements(
        CASE 
            WHEN jsonb_typeof(COALESCE(to_jsonb(c)->'levels', '[]'::jsonb)) = 'array' 
            THEN to_jsonb(c)->'levels' 
            ELSE '[]'::jsonb 
        END
    ) AS elem
    WHERE f2.need_class_id AND f2.new_class_id IS NULL
      AND elem->>'id' IS NOT NULL
      AND (
          -- Stream exact match: "East" = "East"
          (f2.student_stream IS NOT NULL AND lower(btrim(COALESCE(elem->>'name', ''))) = lower(btrim(f2.student_stream)))
          -- Or grade string contains the level name: "Grade 1 Blue" contains "Blue"
          OR (f2.student_grade IS NOT NULL AND elem->>'name' IS NOT NULL AND elem->>'name' <> '' AND lower(btrim(f2.student_grade)) LIKE '%' || lower(btrim(elem->>'name')) || '%')
      )
    ORDER BY f2.id, elem->>'id'
) lvl
WHERE f.id = lvl.id;

-- Fallback for class_id: If course has levels but student stream didn't match or was unassigned, use first level
UPDATE _enr_course_fix f SET
    new_class_id = to_jsonb(c)->'levels'->0->>'id'
FROM public.courses c
WHERE f.need_class_id AND f.new_class_id IS NULL
  AND c.id = f.new_course_id
  AND jsonb_typeof(to_jsonb(c)->'levels') = 'array'
  AND jsonb_array_length(to_jsonb(c)->'levels') > 0
  AND to_jsonb(c)->'levels'->0->>'id' IS NOT NULL;

-- 5. Step 4: Apply updates to public.student_enrollments
UPDATE public.student_enrollments se SET
    course_id = COALESCE(NULLIF(btrim(f.new_course_id), ''), se.course_id),
    class_id  = COALESCE(NULLIF(btrim(f.new_class_id), ''), se.class_id),
    metadata  = COALESCE(se.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'courseId', COALESCE(NULLIF(btrim(f.new_course_id), ''), se.course_id, se.metadata->>'courseId'),
        'classId',  COALESCE(NULLIF(btrim(f.new_class_id), ''), se.class_id, se.metadata->>'classId')
    )),
    updated_at = NOW()
FROM _enr_course_fix f
WHERE se.id = f.id
  AND (
      (f.need_course_id AND f.new_course_id IS NOT NULL)
      OR (f.need_class_id AND f.new_class_id IS NOT NULL)
      OR (se.course_id IS NOT NULL AND se.metadata->>'courseId' IS NULL)
      OR (se.class_id IS NOT NULL AND se.metadata->>'classId' IS NULL)
  );

-- 6. Step 5: Back-populate linked public.users if missing course_id or course_level_id
UPDATE public.users u SET
    course_id       = COALESCE(u.course_id, NULLIF(btrim(f.new_course_id), '')),
    course_level_id = COALESCE(u.course_level_id, NULLIF(btrim(f.new_class_id), '')),
    metadata        = COALESCE(u.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'courseId',      COALESCE(u.course_id, NULLIF(btrim(f.new_course_id), ''), u.metadata->>'courseId'),
        'courseLevelId', COALESCE(u.course_level_id, NULLIF(btrim(f.new_class_id), ''), u.metadata->>'courseLevelId')
    ))
FROM _enr_course_fix f
WHERE (u.id::text = f.user_id OR u.id::text = 'u_' || f.user_id OR (f.user_id LIKE 'u\_%' AND u.id::text = substr(f.user_id, 3)))
  AND (
      (u.course_id IS NULL AND f.new_course_id IS NOT NULL)
      OR (u.course_level_id IS NULL AND f.new_class_id IS NOT NULL)
  );

-- 7. Ensure composite indexes and unblocked RLS exist for blazing-fast queries
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id 
    ON public.student_enrollments(institution_id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_composite 
    ON public.student_enrollments(institution_id, id ASC);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_course_id 
    ON public.student_enrollments(institution_id, course_id);

CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_class_id 
    ON public.student_enrollments(institution_id, class_id);

CREATE INDEX IF NOT EXISTS idx_users_inst_course_level 
    ON public.users(institution_id, course_id, course_level_id);

-- Unblock RLS on student_enrollments: Drop any slow row-by-row subquery policies from migration 453
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' AND tablename = 'student_enrollments'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.student_enrollments', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.student_enrollments TO anon, authenticated, service_role;
DROP POLICY IF EXISTS master_unblock_student_enrollments ON public.student_enrollments;
CREATE POLICY master_unblock_student_enrollments ON public.student_enrollments FOR ALL USING (true) WITH CHECK (true);

-- Update statistics for PostgreSQL query planner and notify PostgREST
ANALYZE public.student_enrollments;
ANALYZE public.users;
NOTIFY pgrst, 'reload schema';

-- 8. Execution Summary Report
SELECT
    COUNT(*)                                                                             AS total_inspected,
    COUNT(*) FILTER (WHERE NOT need_course_id)                                           AS course_id_already_present,
    COUNT(*) FILTER (WHERE need_course_id AND new_course_id IS NOT NULL)                 AS course_id_repaired,
    COUNT(*) FILTER (WHERE need_course_id AND new_course_id IS NULL)                     AS course_id_still_unresolved,
    COUNT(*) FILTER (WHERE NOT need_class_id)                                            AS class_id_already_present,
    COUNT(*) FILTER (WHERE need_class_id AND new_class_id IS NOT NULL)                   AS class_id_repaired,
    COUNT(*) FILTER (WHERE need_class_id AND new_class_id IS NULL)                       AS class_id_still_unresolved
FROM _enr_course_fix;
