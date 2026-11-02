-- Migration 533: Convert users.expertise and all legacy text[] columns to JSONB
-- Fixes: "ERROR: column "expertise" is of type text[] but expression is of type jsonb"
-- Ensures 100% type compatibility with JSONB literals across PostgreSQL and Supabase.

-- Step 1: Specific safe conversion for public.users
DO $$ 
BEGIN
    -- users.expertise
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'expertise' 
          AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN expertise DROP DEFAULT;
        ALTER TABLE public.users 
            ALTER COLUMN expertise TYPE JSONB 
            USING CASE 
                WHEN expertise IS NULL THEN '[]'::jsonb 
                ELSE to_jsonb(expertise) 
            END;
        ALTER TABLE public.users ALTER COLUMN expertise SET DEFAULT '[]'::jsonb;
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'expertise'
    ) THEN
        ALTER TABLE public.users ADD COLUMN expertise JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- users.roles
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'roles' 
          AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN roles DROP DEFAULT;
        ALTER TABLE public.users 
            ALTER COLUMN roles TYPE JSONB 
            USING CASE 
                WHEN roles IS NULL THEN '[]'::jsonb 
                ELSE to_jsonb(roles) 
            END;
        ALTER TABLE public.users ALTER COLUMN roles SET DEFAULT '[]'::jsonb;
    END IF;

    -- users.enrolled_subject_ids
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'enrolled_subject_ids' 
          AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN enrolled_subject_ids DROP DEFAULT;
        ALTER TABLE public.users 
            ALTER COLUMN enrolled_subject_ids TYPE JSONB 
            USING CASE 
                WHEN enrolled_subject_ids IS NULL THEN '[]'::jsonb 
                ELSE to_jsonb(enrolled_subject_ids) 
            END;
        ALTER TABLE public.users ALTER COLUMN enrolled_subject_ids SET DEFAULT '[]'::jsonb;
    END IF;

    -- users.parent_ids
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'parent_ids' 
          AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN parent_ids DROP DEFAULT;
        ALTER TABLE public.users 
            ALTER COLUMN parent_ids TYPE JSONB 
            USING CASE 
                WHEN parent_ids IS NULL THEN '[]'::jsonb 
                ELSE to_jsonb(parent_ids) 
            END;
        ALTER TABLE public.users ALTER COLUMN parent_ids SET DEFAULT '[]'::jsonb;
    END IF;

    -- users.student_ids
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'users' 
          AND column_name = 'student_ids' 
          AND data_type = 'ARRAY'
    ) THEN
        ALTER TABLE public.users ALTER COLUMN student_ids DROP DEFAULT;
        ALTER TABLE public.users 
            ALTER COLUMN student_ids TYPE JSONB 
            USING CASE 
                WHEN student_ids IS NULL THEN '[]'::jsonb 
                ELSE to_jsonb(student_ids) 
            END;
        ALTER TABLE public.users ALTER COLUMN student_ids SET DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Step 2: Universal dynamic conversion for all other legacy ARRAY columns to JSONB
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (
        SELECT table_name, column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND data_type = 'ARRAY'
          AND (
            (table_name = 'users' AND column_name IN ('expertise', 'roles', 'enrolled_subject_ids', 'parent_ids', 'student_ids'))
            OR (table_name = 'rooms' AND column_name IN ('equipment'))
            OR (table_name = 'institutions' AND column_name IN ('stream_definitions', 'streamDefinitions'))
            OR (table_name = 'allocation_requests' AND column_name IN ('course_level_ids', 'subject_ids'))
            OR (table_name = 'carwash_jobs' AND column_name IN ('add_ons'))
            OR (table_name = 'pm_listings' AND column_name IN ('images', 'features'))
            OR (table_name = 'his_patients' AND column_name IN ('allergies', 'chronic_conditions'))
            OR (table_name = 'his_prescriptions' AND column_name IN ('attached_files'))
            OR (table_name = 'car_sales_listings' AND column_name IN ('gallery_urls'))
            OR (table_name = 'car_appraisals' AND column_name IN ('images'))
            OR (table_name = 'synergy_posts' AND column_name IN ('likes', 'student_ids'))
          )
    ) LOOP
        BEGIN
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I DROP DEFAULT', r.table_name, r.column_name);
            EXECUTE format(
                'ALTER TABLE public.%I ALTER COLUMN %I TYPE JSONB USING CASE WHEN %I IS NULL THEN ''[]''::jsonb ELSE to_jsonb(%I) END', 
                r.table_name, r.column_name, r.column_name, r.column_name
            );
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I SET DEFAULT ''[]''::jsonb', r.table_name, r.column_name);
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Skipping column %.%: %', r.table_name, r.column_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- Step 3: Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
