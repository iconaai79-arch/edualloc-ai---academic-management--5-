-- Migration 454: Comprehensive Repair of Student Admission Numbers & Grades in student_enrollments
-- Resolves admission numbers and class/grade/stream from:
--   1. Single Source of Truth: Preserves and prioritizes student_enrollments.admission_number
--   2. Self: se.metadata (admissionNumber, admNo, gradeLevel, studentClass, className, form, stream)
--   3. Users: by user_id, 'u_' prefix, raw prefix, AND by student name
--   4. Other Enrollments: genuine enrollment records for the same student name / user_id
--   5. Billing: invoices and receipts by user_id, student_id, AND student_name
--   6. Deduplication: Purges auto-generated synthetic rows (ADM-XXXXX) when a real enrollment exists
--
-- Performance: Set-based execution on temporary work table with index joins.
-- Safe & Idempotent: Can be run repeatedly; genuine admission numbers are NEVER overwritten.

SET statement_timeout = '5min';

-- 0. Prerequisites: Ensure required columns and helper functions exist
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS stream TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.student_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.fn_is_synthetic_adm(p_adm TEXT)
RETURNS BOOLEAN LANGUAGE sql IMMUTABLE
SET search_path = public, pg_temp AS $$
    SELECT p_adm IS NULL
        OR btrim(p_adm) IN ('', '-', '—', 'N/A', 'null', 'undefined', 'pending', 'not set')
        OR p_adm ~* '^(usr_|user_|st_|enr_|u_)'
        OR p_adm ~* '^(ADM|STF)-[0-9]{4}-[A-Za-z0-9]{4}$';
$$;

CREATE OR REPLACE FUNCTION public.fn_student_real_adm(j JSONB)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp AS $$
DECLARE
    c TEXT;
BEGIN
    IF j IS NULL THEN RETURN NULL; END IF;
    FOREACH c IN ARRAY ARRAY[
        j->>'admission_number', j->>'admissionNumber', j->>'admission_no', j->>'adm_no', j->>'admNo', j->>'adm',
        j->>'staff_id', j->>'staffId', j->>'registration_number', j->>'reg_no', j->>'student_number', j->>'student_id',
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
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp AS $$
DECLARE
    c TEXT;
BEGIN
    IF j IS NULL THEN RETURN NULL; END IF;
    FOREACH c IN ARRAY ARRAY[
        j->>'student_class', j->>'studentClass', j->>'grade_level', j->>'gradeLevel', j->>'class_level', j->>'classLevel',
        j->>'class_name', j->>'className', j->>'grade', j->>'form', j->>'class',
        j->'metadata'->>'gradeLevel', j->'metadata'->>'grade_level', j->'metadata'->>'studentClass',
        j->'metadata'->>'student_class', j->'metadata'->>'classLevel', j->'metadata'->>'className',
        j->'metadata'->>'class', j->'metadata'->>'grade', j->'metadata'->>'form'
    ] LOOP
        IF c IS NOT NULL AND btrim(c) <> '' AND lower(btrim(c)) NOT IN ('no grade', 'unclassified', 'n/a', '—', '-', 'undefined', 'null') THEN
            RETURN btrim(c);
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_student_real_stream(j JSONB)
RETURNS TEXT LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_temp AS $$
DECLARE
    c TEXT;
BEGIN
    IF j IS NULL THEN RETURN NULL; END IF;
    FOREACH c IN ARRAY ARRAY[
        j->>'stream', j->>'streamName', j->>'stream_name', j->>'streams', j->>'classStream', j->>'class_stream',
        j->'metadata'->>'stream', j->'metadata'->>'streamName', j->'metadata'->>'stream_name',
        j->'metadata'->>'streams', j->'metadata'->>'classStream'
    ] LOOP
        IF c IS NOT NULL AND btrim(c) <> '' AND lower(btrim(c)) NOT IN ('n/a', '—', '-', 'none', 'null', 'undefined') THEN
            RETURN btrim(c);
        END IF;
    END LOOP;
    RETURN NULL;
END;
$$;

-- 1. Create work table of enrollments
DROP TABLE IF EXISTS _enr_fix;
CREATE TEMP TABLE _enr_fix AS
SELECT
    se.id,
    se.user_id::text                                                       AS user_id,
    replace(COALESCE(se.institution_id::text, ''), 'inst_', '')            AS inst,
    lower(btrim(COALESCE(
        se.metadata->>'studentName',
        se.metadata->>'fullName',
        se.metadata->>'student_name',
        se.metadata->>'name',
        to_jsonb(se)->>'student_name',
        to_jsonb(se)->>'name',
        ''
    ))) AS nm,
    se.admission_number                                                    AS current_adm,
    public.fn_is_synthetic_adm(se.admission_number)                        AS need_adm,
    public.fn_student_real_grade(se.metadata) IS NULL                      AS need_grade,
    public.fn_student_real_stream(se.metadata) IS NULL                     AS need_stream,
    CASE 
        WHEN NOT public.fn_is_synthetic_adm(se.admission_number) THEN btrim(se.admission_number)
        ELSE public.fn_student_real_adm(se.metadata)
    END                                                                    AS new_adm,
    public.fn_student_real_grade(se.metadata)                              AS new_grade,
    public.fn_student_real_stream(se.metadata)                             AS new_stream
FROM public.student_enrollments se
WHERE public.fn_is_synthetic_adm(se.admission_number)
   OR public.fn_student_real_grade(se.metadata) IS NULL
   OR public.fn_student_real_stream(se.metadata) IS NULL
   OR se.metadata->>'admissionNumber' IS NULL;

CREATE INDEX ON _enr_fix (user_id);
CREATE INDEX ON _enr_fix (inst, nm);
ANALYZE _enr_fix;

-- 2. Step 1: Source A — Linked users table by user_id (with prefix variations)
UPDATE _enr_fix f SET
    new_adm    = COALESCE(f.new_adm,    CASE WHEN f.need_adm    THEN public.fn_student_real_adm(to_jsonb(u))   END),
    new_grade  = COALESCE(f.new_grade,  CASE WHEN f.need_grade  THEN public.fn_student_real_grade(to_jsonb(u)) END),
    new_stream = COALESCE(f.new_stream, CASE WHEN f.need_stream THEN public.fn_student_real_stream(to_jsonb(u)) END)
FROM public.users u
WHERE u.id::text = f.user_id
  AND ((f.need_adm AND f.new_adm IS NULL) OR (f.need_grade AND f.new_grade IS NULL) OR (f.need_stream AND f.new_stream IS NULL));

UPDATE _enr_fix f SET
    new_adm    = COALESCE(f.new_adm,    CASE WHEN f.need_adm    THEN public.fn_student_real_adm(to_jsonb(u))   END),
    new_grade  = COALESCE(f.new_grade,  CASE WHEN f.need_grade  THEN public.fn_student_real_grade(to_jsonb(u)) END),
    new_stream = COALESCE(f.new_stream, CASE WHEN f.need_stream THEN public.fn_student_real_stream(to_jsonb(u)) END)
FROM public.users u
WHERE u.id::text = 'u_' || f.user_id
  AND ((f.need_adm AND f.new_adm IS NULL) OR (f.need_grade AND f.new_grade IS NULL) OR (f.need_stream AND f.new_stream IS NULL));

UPDATE _enr_fix f SET
    new_adm    = COALESCE(f.new_adm,    CASE WHEN f.need_adm    THEN public.fn_student_real_adm(to_jsonb(u))   END),
    new_grade  = COALESCE(f.new_grade,  CASE WHEN f.need_grade  THEN public.fn_student_real_grade(to_jsonb(u)) END),
    new_stream = COALESCE(f.new_stream, CASE WHEN f.need_stream THEN public.fn_student_real_stream(to_jsonb(u)) END)
FROM public.users u
WHERE f.user_id LIKE 'u\_%'
  AND u.id::text = substr(f.user_id, 3)
  AND ((f.need_adm AND f.new_adm IS NULL) OR (f.need_grade AND f.new_grade IS NULL) OR (f.need_stream AND f.new_stream IS NULL));

-- 3. Step 2: Source B — Users table matched by student Name within tenant
UPDATE _enr_fix f SET
    new_adm    = COALESCE(f.new_adm,    CASE WHEN f.need_adm    THEN public.fn_student_real_adm(to_jsonb(u))   END),
    new_grade  = COALESCE(f.new_grade,  CASE WHEN f.need_grade  THEN public.fn_student_real_grade(to_jsonb(u)) END),
    new_stream = COALESCE(f.new_stream, CASE WHEN f.need_stream THEN public.fn_student_real_stream(to_jsonb(u)) END)
FROM public.users u
WHERE f.nm <> ''
  AND lower(btrim(u.name)) = f.nm
  AND (f.inst = '' OR replace(COALESCE(u.institution_id::text, ''), 'inst_', '') = f.inst)
  AND ((f.need_adm AND f.new_adm IS NULL) OR (f.need_grade AND f.new_grade IS NULL) OR (f.need_stream AND f.new_stream IS NULL));

-- 4. Step 3: Source C — Another enrollment row for the same student (by name or by user_id) that has a real adm no
UPDATE _enr_fix f SET
    new_adm    = COALESCE(f.new_adm,    CASE WHEN f.need_adm    THEN s.admission_number END),
    new_grade  = COALESCE(f.new_grade,  CASE WHEN f.need_grade  THEN s.grade  END),
    new_stream = COALESCE(f.new_stream, CASE WHEN f.need_stream THEN s.stream END)
FROM (
    SELECT DISTINCT ON (x.inst, x.nm) x.*
    FROM (
        SELECT
            s.id,
            s.user_id::text AS user_id,
            replace(COALESCE(s.institution_id::text, ''), 'inst_', '') AS inst,
            lower(btrim(COALESCE(
                s.metadata->>'studentName',
                s.metadata->>'fullName',
                s.metadata->>'student_name',
                s.metadata->>'name',
                to_jsonb(s)->>'student_name',
                to_jsonb(s)->>'name',
                ''
            ))) AS nm,
            s.admission_number,
            public.fn_student_real_grade(s.metadata) AS grade,
            public.fn_student_real_stream(s.metadata) AS stream,
            s.updated_at
        FROM public.student_enrollments s
        WHERE NOT public.fn_is_synthetic_adm(s.admission_number)
    ) x
    WHERE x.nm <> ''
      AND EXISTS (SELECT 1 FROM _enr_fix t WHERE t.inst = x.inst AND (t.nm = x.nm OR t.user_id = x.user_id))
    ORDER BY x.inst, x.nm, x.updated_at DESC NULLS LAST
) s
WHERE (s.inst = f.inst AND s.nm = f.nm AND f.nm <> '')
   OR (s.user_id = f.user_id AND f.user_id <> '')
  AND s.id <> f.id
  AND ((f.need_adm AND f.new_adm IS NULL) OR (f.need_grade AND f.new_grade IS NULL));

-- 5. Step 4: Source D — Invoices and receipts (matched by user_id/student_id AND by student_name)
DO $$
DECLARE
    v_tbl TEXT;
    v_col TEXT;
BEGIN
    FOREACH v_tbl IN ARRAY ARRAY['invoices', 'receipts'] LOOP
        IF to_regclass('public.' || v_tbl) IS NULL THEN
            CONTINUE;
        END IF;

        -- 5a. Match on user_id / student_id columns
        FOR v_col IN
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = v_tbl
              AND column_name IN ('student_id', 'user_id')
        LOOP
            EXECUTE format($f$
                UPDATE _enr_fix f SET
                    new_adm   = COALESCE(f.new_adm,   CASE WHEN f.need_adm   THEN public.fn_student_real_adm(src.j)   END),
                    new_grade = COALESCE(f.new_grade, CASE WHEN f.need_grade THEN public.fn_student_real_grade(src.j) END)
                FROM (
                    SELECT DISTINCT ON (t.%1$I::text) t.%1$I::text AS sid, to_jsonb(t) AS j
                    FROM public.%2$I t
                    WHERE t.%1$I::text IN (
                        SELECT user_id FROM _enr_fix
                        WHERE (need_adm AND new_adm IS NULL) OR (need_grade AND new_grade IS NULL)
                    )
                ) src
                WHERE src.sid = f.user_id
                  AND ((f.need_adm AND f.new_adm IS NULL) OR (f.need_grade AND f.new_grade IS NULL));
            $f$, v_col, v_tbl);
        END LOOP;

        -- 5b. Match on student_name / customer_name columns
        FOR v_col IN
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = v_tbl
              AND column_name IN ('student_name', 'customer_name', 'name')
        LOOP
            EXECUTE format($f$
                UPDATE _enr_fix f SET
                    new_adm   = COALESCE(f.new_adm,   CASE WHEN f.need_adm   THEN public.fn_student_real_adm(src.j)   END),
                    new_grade = COALESCE(f.new_grade, CASE WHEN f.need_grade THEN public.fn_student_real_grade(src.j) END)
                FROM (
                    SELECT DISTINCT ON (lower(btrim(t.%1$I::text))) lower(btrim(t.%1$I::text)) AS snm, to_jsonb(t) AS j
                    FROM public.%2$I t
                    WHERE lower(btrim(t.%1$I::text)) IN (
                        SELECT nm FROM _enr_fix
                        WHERE nm <> '' AND ((need_adm AND new_adm IS NULL) OR (need_grade AND new_grade IS NULL))
                    )
                ) src
                WHERE src.snm = f.nm AND f.nm <> ''
                  AND ((f.need_adm AND f.new_adm IS NULL) OR (f.need_grade AND f.new_grade IS NULL));
            $f$, v_col, v_tbl);
        END LOOP;
    END LOOP;
END $$;

-- 6. Apply updates to public.student_enrollments
UPDATE public.student_enrollments se SET
    admission_number = COALESCE(NULLIF(btrim(f.new_adm), ''), se.admission_number),
    metadata = COALESCE(se.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'admissionNumber', COALESCE(NULLIF(btrim(f.new_adm), ''), se.admission_number),
        'gradeLevel',      COALESCE(f.new_grade, se.metadata->>'gradeLevel'),
        'stream',          COALESCE(f.new_stream, se.metadata->>'stream'),
        'studentClass',    CASE 
                               WHEN COALESCE(f.new_grade, se.metadata->>'gradeLevel') IS NOT NULL 
                                AND COALESCE(f.new_stream, se.metadata->>'stream') IS NOT NULL
                                AND lower(COALESCE(f.new_grade, se.metadata->>'gradeLevel')) NOT LIKE '%' || lower(COALESCE(f.new_stream, se.metadata->>'stream')) || '%'
                               THEN COALESCE(f.new_grade, se.metadata->>'gradeLevel') || ' ' || COALESCE(f.new_stream, se.metadata->>'stream')
                               ELSE COALESCE(f.new_grade, se.metadata->>'gradeLevel')
                           END
    )),
    updated_at = NOW()
FROM _enr_fix f
WHERE se.id = f.id
  AND (
      (f.need_adm AND f.new_adm IS NOT NULL)
      OR (f.need_grade AND f.new_grade IS NOT NULL)
      OR (f.need_stream AND f.new_stream IS NOT NULL)
      OR (se.metadata->>'admissionNumber' IS NULL AND se.admission_number IS NOT NULL)
  );

-- 7. Safe Deduplication: Delete autoGenerated synthetic rows if a genuine record for the same student exists
WITH duplicates_to_delete AS (
    SELECT f.id
    FROM _enr_fix f
    JOIN public.student_enrollments real_enr
      ON real_enr.id <> f.id
     AND replace(COALESCE(real_enr.institution_id::text, ''), 'inst_', '') = f.inst
     AND lower(btrim(COALESCE(real_enr.metadata->>'studentName', real_enr.metadata->>'fullName', real_enr.metadata->>'name', ''))) = f.nm
     AND NOT public.fn_is_synthetic_adm(real_enr.admission_number)
    WHERE f.nm <> ''
      AND f.need_adm
      AND (
          (SELECT se2.metadata->>'autoGenerated' FROM public.student_enrollments se2 WHERE se2.id = f.id) = 'true'
          OR f.id LIKE 'enr_usr_%'
      )
)
DELETE FROM public.student_enrollments
WHERE id IN (SELECT id FROM duplicates_to_delete);

-- 8. Comprehensive Execution Report
SELECT
    COUNT(*)                                                               AS total_rows_inspected,
    COUNT(*) FILTER (WHERE NOT need_adm)                                   AS genuine_adm_preserved,
    COUNT(*) FILTER (WHERE need_adm AND new_adm IS NOT NULL)               AS synthetic_adm_repaired,
    COUNT(*) FILTER (WHERE need_adm AND new_adm IS NULL)                   AS adm_still_unresolved,
    COUNT(*) FILTER (WHERE NOT need_grade)                                 AS grades_already_present,
    COUNT(*) FILTER (WHERE need_grade AND new_grade IS NOT NULL)           AS grades_repaired,
    COUNT(*) FILTER (WHERE need_grade AND new_grade IS NULL)               AS grades_still_unresolved
FROM _enr_fix;
