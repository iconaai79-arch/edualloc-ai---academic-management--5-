-- ============================================================================
-- Talksasa Database Repair: Restore ds_students Names & Admission Numbers (v2)
-- Bulletproof: Uses dynamic SQL (EXECUTE) inside isolated blocks to prevent
-- parse-time errors if any optional columns (like phone vs phone_number) are absent.
-- ============================================================================

-- 1. Ensure required columns exist on ds_students
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS admission_number TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

-- 2. If double-quoted "fullName" exists, copy to full_name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'fullName') THEN
        EXECUTE 'UPDATE public.ds_students SET full_name = "fullName" WHERE (full_name IS NULL OR full_name = '''' OR full_name = ''(No Name)'') AND "fullName" IS NOT NULL AND "fullName" != '''' AND "fullName" != ''(No Name)''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. If double-quoted "admissionNumber" exists, copy to admission_number
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'admissionNumber') THEN
        EXECUTE 'UPDATE public.ds_students SET admission_number = "admissionNumber" WHERE (admission_number IS NULL OR admission_number = '''' OR admission_number ~ ''^\d{1,3}$'') AND "admissionNumber" IS NOT NULL AND "admissionNumber" != '''' AND "admissionNumber" != ''-''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 4. If column "name" exists in ds_students, copy to full_name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'name') THEN
        EXECUTE 'UPDATE public.ds_students SET full_name = name WHERE (full_name IS NULL OR full_name = '''' OR full_name = ''(No Name)'') AND name IS NOT NULL AND name != '''' AND name != ''(No Name)''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 5. If column "student_name" exists in ds_students, copy to full_name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'student_name') THEN
        EXECUTE 'UPDATE public.ds_students SET full_name = student_name WHERE (full_name IS NULL OR full_name = '''' OR full_name = ''(No Name)'') AND student_name IS NOT NULL AND student_name != ''''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 6. If metadata contains fullName or name or admissionNumber
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'metadata') THEN
        EXECUTE '
            UPDATE public.ds_students 
            SET full_name = COALESCE(
                NULLIF(metadata->>''fullName'', ''''),
                NULLIF(metadata->>''name'', ''''),
                NULLIF(metadata->>''full_name'', ''''),
                NULLIF(metadata->>''studentName'', '''')
            )
            WHERE (full_name IS NULL OR full_name = '''' OR full_name = ''(No Name)'')
              AND (
                metadata->>''fullName'' IS NOT NULL OR 
                metadata->>''name'' IS NOT NULL OR 
                metadata->>''full_name'' IS NOT NULL OR
                metadata->>''studentName'' IS NOT NULL
              )';

        EXECUTE '
            UPDATE public.ds_students 
            SET admission_number = COALESCE(
                NULLIF(metadata->>''admissionNumber'', ''''),
                NULLIF(metadata->>''admission_number'', ''''),
                NULLIF(metadata->>''admNo'', ''''),
                NULLIF(metadata->>''admission_no'', '''')
            )
            WHERE (admission_number IS NULL OR admission_number = '''' OR admission_number ~ ''^\d{1,3}$'')
              AND (
                metadata->>''admissionNumber'' IS NOT NULL OR 
                metadata->>''admission_number'' IS NOT NULL OR 
                metadata->>''admNo'' IS NOT NULL
              )';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7a. Users table match by user_id -> name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name') THEN
            EXECUTE '
                UPDATE public.ds_students s
                SET full_name = u.name
                FROM public.users u
                WHERE s.user_id = u.id 
                  AND (s.full_name IS NULL OR s.full_name = '''' OR s.full_name = ''(No Name)'')
                  AND u.name IS NOT NULL AND u.name != ''''';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7b. Users table match by phone_number -> name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_number') THEN
            EXECUTE '
                UPDATE public.ds_students s
                SET full_name = u.name
                FROM public.users u
                WHERE (s.phone = u.phone_number OR s.phone_number = u.phone_number)
                  AND (s.full_name IS NULL OR s.full_name = '''' OR s.full_name = ''(No Name)'')
                  AND u.name IS NOT NULL AND u.name != ''''';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7c. Users table match by phone -> name (if users.phone column exists)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'name')
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone') THEN
            EXECUTE '
                UPDATE public.ds_students s
                SET full_name = u.name
                FROM public.users u
                WHERE (s.phone = u.phone OR s.phone_number = u.phone)
                  AND (s.full_name IS NULL OR s.full_name = '''' OR s.full_name = ''(No Name)'')
                  AND u.name IS NOT NULL AND u.name != ''''';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7d. Users table -> admission_number (by user_id)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'admission_number') THEN
            EXECUTE '
                UPDATE public.ds_students s
                SET admission_number = u.admission_number
                FROM public.users u
                WHERE s.user_id = u.id
                  AND (s.admission_number IS NULL OR s.admission_number = '''' OR s.admission_number ~ ''^\d{1,3}$'')
                  AND u.admission_number IS NOT NULL AND u.admission_number != '''' AND u.admission_number != ''-''';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 7e. Users table -> admission_number (by phone_number)
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'admission_number') 
           AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_number') THEN
            EXECUTE '
                UPDATE public.ds_students s
                SET admission_number = u.admission_number
                FROM public.users u
                WHERE (s.phone = u.phone_number OR s.phone_number = u.phone_number)
                  AND (s.admission_number IS NULL OR s.admission_number = '''' OR s.admission_number ~ ''^\d{1,3}$'')
                  AND u.admission_number IS NOT NULL AND u.admission_number != '''' AND u.admission_number != ''-''';
        END IF;
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8. Backfill from ds_invoices
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
        EXECUTE '
            UPDATE public.ds_students s
            SET full_name = inv.student_name
            FROM public.ds_invoices inv
            WHERE inv.student_id = s.id
              AND (s.full_name IS NULL OR s.full_name = '''' OR s.full_name = ''(No Name)'')
              AND inv.student_name IS NOT NULL AND inv.student_name != '''' AND inv.student_name != ''Student''';

        EXECUTE '
            UPDATE public.ds_students s
            SET admission_number = inv.admission_number
            FROM public.ds_invoices inv
            WHERE inv.student_id = s.id
              AND (s.admission_number IS NULL OR s.admission_number = '''' OR s.admission_number ~ ''^\d{1,3}$'')
              AND inv.admission_number IS NOT NULL AND inv.admission_number != '''' AND inv.admission_number != ''-''';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 9. Synchronize "fullName" and full_name
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'fullName') THEN
        EXECUTE 'UPDATE public.ds_students SET "fullName" = full_name WHERE full_name IS NOT NULL AND full_name != '''' AND ("fullName" IS NULL OR "fullName" = '''' OR "fullName" = ''(No Name)'')';
        EXECUTE 'UPDATE public.ds_students SET full_name = "fullName" WHERE "fullName" IS NOT NULL AND "fullName" != '''' AND "fullName" != ''(No Name)'' AND (full_name IS NULL OR full_name = '''' OR full_name = ''(No Name)'')';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 10. Synchronize "admissionNumber" and admission_number
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'admissionNumber') THEN
        EXECUTE 'UPDATE public.ds_students SET "admissionNumber" = admission_number WHERE admission_number IS NOT NULL AND admission_number != '''' AND ("admissionNumber" IS NULL OR "admissionNumber" = '''')';
        EXECUTE 'UPDATE public.ds_students SET admission_number = "admissionNumber" WHERE "admissionNumber" IS NOT NULL AND "admissionNumber" != '''' AND (admission_number IS NULL OR admission_number = '''')';
    END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 11. Synchronize phone and phone_number
DO $$ 
BEGIN
    UPDATE public.ds_students SET phone = phone_number WHERE phone IS NULL AND phone_number IS NOT NULL;
    UPDATE public.ds_students SET phone_number = phone WHERE phone_number IS NULL AND phone IS NOT NULL;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 12. Output 10 sample restored records
SELECT id, full_name, admission_number, phone, status, branch_id
FROM public.ds_students 
ORDER BY id DESC
LIMIT 10;
