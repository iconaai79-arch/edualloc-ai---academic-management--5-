-- ============================================================================
-- Talksasa Database Repair: Restore ds_students Names & Admission Numbers
-- Purpose: Backfills and syncs full_name and admission_number from all source
--          tables (users, ds_invoices, ds_lessons, metadata, quoted columns)
-- ============================================================================

DO $$
BEGIN
    -- 1. Ensure both full_name and admission_number columns exist in public.ds_students
    ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS full_name TEXT;
    ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS admission_number TEXT;
    ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS phone_number TEXT;
    ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

    -- 2. If double-quoted "fullName" exists, copy to full_name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'fullName'
    ) THEN
        UPDATE public.ds_students 
        SET full_name = "fullName" 
        WHERE (full_name IS NULL OR full_name = '' OR full_name = '(No Name)') 
          AND "fullName" IS NOT NULL AND "fullName" != '' AND "fullName" != '(No Name)';
    END IF;

    -- 3. If double-quoted "admissionNumber" exists, copy to admission_number
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'admissionNumber'
    ) THEN
        UPDATE public.ds_students 
        SET admission_number = "admissionNumber" 
        WHERE (admission_number IS NULL OR admission_number = '' OR admission_number ~ '^\d{1,3}$') 
          AND "admissionNumber" IS NOT NULL AND "admissionNumber" != '' AND "admissionNumber" != '-';
    END IF;

    -- 4. If column "name" exists, copy to full_name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'name'
    ) THEN
        UPDATE public.ds_students 
        SET full_name = name 
        WHERE (full_name IS NULL OR full_name = '' OR full_name = '(No Name)') 
          AND name IS NOT NULL AND name != '' AND name != '(No Name)';
    END IF;

    -- 5. If column "student_name" exists, copy to full_name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'student_name'
    ) THEN
        UPDATE public.ds_students 
        SET full_name = student_name 
        WHERE (full_name IS NULL OR full_name = '' OR full_name = '(No Name)') 
          AND student_name IS NOT NULL AND student_name != '';
    END IF;

    -- 6. If metadata contains fullName or name or full_name
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'metadata'
    ) THEN
        UPDATE public.ds_students 
        SET full_name = COALESCE(
            NULLIF(metadata->>'fullName', ''),
            NULLIF(metadata->>'name', ''),
            NULLIF(metadata->>'full_name', ''),
            NULLIF(metadata->>'studentName', '')
        )
        WHERE (full_name IS NULL OR full_name = '' OR full_name = '(No Name)')
          AND (
            metadata->>'fullName' IS NOT NULL OR 
            metadata->>'name' IS NOT NULL OR 
            metadata->>'full_name' IS NOT NULL OR
            metadata->>'studentName' IS NOT NULL
          );

        UPDATE public.ds_students 
        SET admission_number = COALESCE(
            NULLIF(metadata->>'admissionNumber', ''),
            NULLIF(metadata->>'admission_number', ''),
            NULLIF(metadata->>'admNo', ''),
            NULLIF(metadata->>'admission_no', '')
        )
        WHERE (admission_number IS NULL OR admission_number = '' OR admission_number ~ '^\d{1,3}$')
          AND (
            metadata->>'admissionNumber' IS NOT NULL OR 
            metadata->>'admission_number' IS NOT NULL OR 
            metadata->>'admNo' IS NOT NULL
          );
    END IF;

    -- 7. Backfill names and admission numbers from public.users table via user_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users') THEN
        UPDATE public.ds_students s
        SET full_name = u.name
        FROM public.users u
        WHERE s.user_id = u.id 
          AND (s.full_name IS NULL OR s.full_name = '' OR s.full_name = '(No Name)')
          AND u.name IS NOT NULL AND u.name != '';

        -- 8. Backfill names from public.users table via phone / phone_number
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone_number') THEN
            UPDATE public.ds_students s
            SET full_name = u.name
            FROM public.users u
            WHERE (s.phone = u.phone_number OR s.phone_number = u.phone_number)
              AND (s.full_name IS NULL OR s.full_name = '' OR s.full_name = '(No Name)')
              AND u.name IS NOT NULL AND u.name != '';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'phone') THEN
            UPDATE public.ds_students s
            SET full_name = u.name
            FROM public.users u
            WHERE (s.phone = u.phone OR s.phone_number = u.phone)
              AND (s.full_name IS NULL OR s.full_name = '' OR s.full_name = '(No Name)')
              AND u.name IS NOT NULL AND u.name != '';
        END IF;

        -- 9. Backfill admission_number from public.users table
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'admission_number') THEN
            UPDATE public.ds_students s
            SET admission_number = u.admission_number
            FROM public.users u
            WHERE (s.user_id = u.id OR s.phone = u.phone_number OR s.phone = u.phone)
              AND (s.admission_number IS NULL OR s.admission_number = '' OR s.admission_number ~ '^\d{1,3}$')
              AND u.admission_number IS NOT NULL AND u.admission_number != '' AND u.admission_number != '-';
        END IF;
    END IF;

    -- 10. Backfill student names & admission numbers from public.ds_invoices
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_invoices') THEN
        UPDATE public.ds_students s
        SET full_name = inv.student_name
        FROM public.ds_invoices inv
        WHERE (inv.student_id = s.id OR (inv.admission_number IS NOT NULL AND inv.admission_number = s.admission_number))
          AND (s.full_name IS NULL OR s.full_name = '' OR s.full_name = '(No Name)')
          AND inv.student_name IS NOT NULL AND inv.student_name != '' AND inv.student_name != 'Student';

        UPDATE public.ds_students s
        SET admission_number = inv.admission_number
        FROM public.ds_invoices inv
        WHERE inv.student_id = s.id
          AND (s.admission_number IS NULL OR s.admission_number = '' OR s.admission_number ~ '^\d{1,3}$')
          AND inv.admission_number IS NOT NULL AND inv.admission_number != '' AND inv.admission_number != '-';
    END IF;

    -- 11. Backfill student names from public.ds_lessons
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ds_lessons') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_lessons' AND column_name = 'student_name') THEN
            UPDATE public.ds_students s
            SET full_name = l.student_name
            FROM public.ds_lessons l
            WHERE l.student_id = s.id
              AND (s.full_name IS NULL OR s.full_name = '' OR s.full_name = '(No Name)')
              AND l.student_name IS NOT NULL AND l.student_name != '';
        END IF;
    END IF;

    -- 12. Backfill from public.student_enrollments if available
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'student_enrollments') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'student_enrollments' AND column_name = 'student_name') THEN
            UPDATE public.ds_students s
            SET full_name = se.student_name
            FROM public.student_enrollments se
            WHERE (s.phone = se.phone OR s.id_number = se.id_number)
              AND (s.full_name IS NULL OR s.full_name = '' OR s.full_name = '(No Name)')
              AND se.student_name IS NOT NULL AND se.student_name != '';
        END IF;
    END IF;

    -- 13. Synchronize camelCase "fullName" and snake_case full_name so both are always identical
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'fullName') THEN
        UPDATE public.ds_students SET "fullName" = full_name WHERE full_name IS NOT NULL AND full_name != '' AND ("fullName" IS NULL OR "fullName" = '' OR "fullName" = '(No Name)');
        UPDATE public.ds_students SET full_name = "fullName" WHERE "fullName" IS NOT NULL AND "fullName" != '' AND "fullName" != '(No Name)' AND (full_name IS NULL OR full_name = '' OR full_name = '(No Name)');
    END IF;

    -- 14. Synchronize camelCase "admissionNumber" and snake_case admission_number
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ds_students' AND column_name = 'admissionNumber') THEN
        UPDATE public.ds_students SET "admissionNumber" = admission_number WHERE admission_number IS NOT NULL AND admission_number != '' AND ("admissionNumber" IS NULL OR "admissionNumber" = '');
        UPDATE public.ds_students SET admission_number = "admissionNumber" WHERE "admissionNumber" IS NOT NULL AND "admissionNumber" != '' AND (admission_number IS NULL OR admission_number = '');
    END IF;

    -- 15. Synchronize phone and phone_number
    UPDATE public.ds_students SET phone = phone_number WHERE phone IS NULL AND phone_number IS NOT NULL;
    UPDATE public.ds_students SET phone_number = phone WHERE phone_number IS NULL AND phone IS NOT NULL;

END $$;

-- Verify sample output
SELECT id, full_name, admission_number, phone, status, branch_id
FROM public.ds_students 
ORDER BY id DESC
LIMIT 10;
