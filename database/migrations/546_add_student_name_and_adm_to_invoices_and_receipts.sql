-- ==============================================================================
-- Migration 546: Ensure student_name, studentName, admission_number in invoices & receipts
-- Resolves: ERROR: column t.student_name does not exist at character 424
-- ==============================================================================

BEGIN;

-- 1. Ensure columns on public.invoices
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS student_name TEXT;
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "studentName" TEXT;
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS admission_number TEXT;
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS student_id TEXT;
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "studentId" TEXT;
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

        -- Drop rigid FK constraints if any block offline/demo records
        ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_student_id_fkey CASCADE;
        ALTER TABLE public.invoices DROP CONSTRAINT IF EXISTS invoices_institution_id_fkey CASCADE;
    END IF;
END $$;

-- 2. Ensure columns on public.receipts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
        ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS student_name TEXT;
        ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "studentName" TEXT;
        ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS admission_number TEXT;
        ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "admissionNumber" TEXT;
        ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS student_id TEXT;
        ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "studentId" TEXT;
        ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.receipts ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

        ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_student_id_fkey CASCADE;
        ALTER TABLE public.receipts DROP CONSTRAINT IF EXISTS receipts_institution_id_fkey CASCADE;
    END IF;
END $$;

-- 3. Synchronize camelCase <-> snake_case aliases on invoices
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') THEN
        UPDATE public.invoices
        SET student_id = "studentId"
        WHERE (student_id IS NULL OR student_id = '') AND "studentId" IS NOT NULL AND "studentId" <> '';

        UPDATE public.invoices
        SET "studentId" = student_id
        WHERE ("studentId" IS NULL OR "studentId" = '') AND student_id IS NOT NULL AND student_id <> '';

        UPDATE public.invoices
        SET student_name = "studentName"
        WHERE (student_name IS NULL OR student_name = '') AND "studentName" IS NOT NULL AND "studentName" <> '';

        UPDATE public.invoices
        SET "studentName" = student_name
        WHERE ("studentName" IS NULL OR "studentName" = '') AND student_name IS NOT NULL AND student_name <> '';

        UPDATE public.invoices
        SET admission_number = "admissionNumber"
        WHERE (admission_number IS NULL OR admission_number = '') AND "admissionNumber" IS NOT NULL AND "admissionNumber" <> '';

        UPDATE public.invoices
        SET "admissionNumber" = admission_number
        WHERE ("admissionNumber" IS NULL OR "admissionNumber" = '') AND admission_number IS NOT NULL AND admission_number <> '';

        UPDATE public.invoices
        SET institution_id = "institutionId"
        WHERE (institution_id IS NULL OR institution_id = '') AND "institutionId" IS NOT NULL AND "institutionId" <> '';

        UPDATE public.invoices
        SET "institutionId" = institution_id
        WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL AND institution_id <> '';
    END IF;
END $$;

-- 4. Synchronize camelCase <-> snake_case aliases on receipts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts') THEN
        UPDATE public.receipts
        SET student_id = "studentId"
        WHERE (student_id IS NULL OR student_id = '') AND "studentId" IS NOT NULL AND "studentId" <> '';

        UPDATE public.receipts
        SET "studentId" = student_id
        WHERE ("studentId" IS NULL OR "studentId" = '') AND student_id IS NOT NULL AND student_id <> '';

        UPDATE public.receipts
        SET student_name = "studentName"
        WHERE (student_name IS NULL OR student_name = '') AND "studentName" IS NOT NULL AND "studentName" <> '';

        UPDATE public.receipts
        SET "studentName" = student_name
        WHERE ("studentName" IS NULL OR "studentName" = '') AND student_name IS NOT NULL AND student_name <> '';

        UPDATE public.receipts
        SET admission_number = "admissionNumber"
        WHERE (admission_number IS NULL OR admission_number = '') AND "admissionNumber" IS NOT NULL AND "admissionNumber" <> '';

        UPDATE public.receipts
        SET "admissionNumber" = admission_number
        WHERE ("admissionNumber" IS NULL OR "admissionNumber" = '') AND admission_number IS NOT NULL AND admission_number <> '';

        UPDATE public.receipts
        SET institution_id = "institutionId"
        WHERE (institution_id IS NULL OR institution_id = '') AND "institutionId" IS NOT NULL AND "institutionId" <> '';

        UPDATE public.receipts
        SET "institutionId" = institution_id
        WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL AND institution_id <> '';
    END IF;
END $$;

-- 5. Backfill student_name and admission_number from users
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        UPDATE public.invoices i
        SET student_name = COALESCE(NULLIF(i.student_name, ''), u.name),
            "studentName" = COALESCE(NULLIF(i."studentName", ''), NULLIF(i.student_name, ''), u.name),
            admission_number = COALESCE(NULLIF(i.admission_number, ''), u.admission_number),
            "admissionNumber" = COALESCE(NULLIF(i."admissionNumber", ''), NULLIF(i.admission_number, ''), u.admission_number),
            institution_id = COALESCE(NULLIF(i.institution_id, ''), u.institution_id),
            "institutionId" = COALESCE(NULLIF(i."institutionId", ''), NULLIF(i.institution_id, ''), u.institution_id)
        FROM public.users u
        WHERE (i.student_name IS NULL OR i.student_name = '' OR i.admission_number IS NULL OR i.admission_number = '')
          AND i.student_id IS NOT NULL
          AND (
            u.id::text = i.student_id::text
            OR (u.admission_number IS NOT NULL AND u.admission_number = i.student_id::text)
            OR REPLACE(u.id::text, 'u_', '') = i.student_id::text
          );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        UPDATE public.receipts r
        SET student_name = COALESCE(NULLIF(r.student_name, ''), u.name),
            "studentName" = COALESCE(NULLIF(r."studentName", ''), NULLIF(r.student_name, ''), u.name),
            admission_number = COALESCE(NULLIF(r.admission_number, ''), u.admission_number),
            "admissionNumber" = COALESCE(NULLIF(r."admissionNumber", ''), NULLIF(r.admission_number, ''), u.admission_number),
            institution_id = COALESCE(NULLIF(r.institution_id, ''), u.institution_id),
            "institutionId" = COALESCE(NULLIF(r."institutionId", ''), NULLIF(r.institution_id, ''), u.institution_id)
        FROM public.users u
        WHERE (r.student_name IS NULL OR r.student_name = '' OR r.admission_number IS NULL OR r.admission_number = '')
          AND r.student_id IS NOT NULL
          AND (
            u.id::text = r.student_id::text
            OR (u.admission_number IS NOT NULL AND u.admission_number = r.student_id::text)
            OR REPLACE(u.id::text, 'u_', '') = r.student_id::text
          );
    END IF;
END $$;

-- 6. Backfill from student_enrollments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments') THEN
        UPDATE public.invoices i
        SET student_name = COALESCE(NULLIF(i.student_name, ''), se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name'),
            "studentName" = COALESCE(NULLIF(i."studentName", ''), NULLIF(i.student_name, ''), se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name'),
            admission_number = COALESCE(NULLIF(i.admission_number, ''), se.admission_number),
            "admissionNumber" = COALESCE(NULLIF(i."admissionNumber", ''), NULLIF(i.admission_number, ''), se.admission_number),
            institution_id = COALESCE(NULLIF(i.institution_id, ''), se.institution_id),
            "institutionId" = COALESCE(NULLIF(i."institutionId", ''), NULLIF(i.institution_id, ''), se.institution_id)
        FROM public.student_enrollments se
        WHERE (i.student_name IS NULL OR i.student_name = '' OR i.admission_number IS NULL OR i.admission_number = '')
          AND i.student_id IS NOT NULL
          AND (
            se.id::text = i.student_id::text
            OR (se.user_id IS NOT NULL AND se.user_id::text = i.student_id::text)
            OR (se.admission_number IS NOT NULL AND se.admission_number = i.student_id::text)
            OR REPLACE(se.id::text, 'enr_', '') = i.student_id::text
            OR (se.user_id IS NOT NULL AND REPLACE(se.user_id, 'u_', '') = i.student_id::text)
          );
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'receipts')
       AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments') THEN
        UPDATE public.receipts r
        SET student_name = COALESCE(NULLIF(r.student_name, ''), se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name'),
            "studentName" = COALESCE(NULLIF(r."studentName", ''), NULLIF(r.student_name, ''), se.metadata->>'studentName', se.metadata->>'fullName', se.metadata->>'name'),
            admission_number = COALESCE(NULLIF(r.admission_number, ''), se.admission_number),
            "admissionNumber" = COALESCE(NULLIF(r."admissionNumber", ''), NULLIF(r.admission_number, ''), se.admission_number),
            institution_id = COALESCE(NULLIF(r.institution_id, ''), se.institution_id),
            "institutionId" = COALESCE(NULLIF(r."institutionId", ''), NULLIF(r.institution_id, ''), se.institution_id)
        FROM public.student_enrollments se
        WHERE (r.student_name IS NULL OR r.student_name = '' OR r.admission_number IS NULL OR r.admission_number = '')
          AND r.student_id IS NOT NULL
          AND (
            se.id::text = r.student_id::text
            OR (se.user_id IS NOT NULL AND se.user_id::text = r.student_id::text)
            OR (se.admission_number IS NOT NULL AND se.admission_number = r.student_id::text)
            OR REPLACE(se.id::text, 'enr_', '') = r.student_id::text
            OR (se.user_id IS NOT NULL AND REPLACE(se.user_id, 'u_', '') = r.student_id::text)
          );
    END IF;
END $$;

-- 7. High-performance composite indexes
CREATE INDEX IF NOT EXISTS idx_invoices_student_name ON public.invoices(student_name);
CREATE INDEX IF NOT EXISTS idx_invoices_student_name_quoted ON public.invoices("studentName");
CREATE INDEX IF NOT EXISTS idx_invoices_admission_number ON public.invoices(admission_number);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON public.invoices(student_id);

CREATE INDEX IF NOT EXISTS idx_receipts_student_name ON public.receipts(student_name);
CREATE INDEX IF NOT EXISTS idx_receipts_student_name_quoted ON public.receipts("studentName");
CREATE INDEX IF NOT EXISTS idx_receipts_admission_number ON public.receipts(admission_number);
CREATE INDEX IF NOT EXISTS idx_receipts_student_id ON public.receipts(student_id);

COMMIT;

-- 8. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
