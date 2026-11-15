-- Migration 521: Heal and sync remedial table schemas (dual camelCase / snake_case)
-- Resolves empty remedial sessions / missing remedial hours due to column casing or missing institution_id links.

DO $$
BEGIN
    -- 1. school_remedial_sessions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions') THEN
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS allocation_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "allocationId" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS course_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "courseId" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS subject_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS teacher_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS teacher_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS subject_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS class_name TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "className" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS date TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "date" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS day_of_week TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "dayOfWeek" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS start_time TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "startTime" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS end_time TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "endTime" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duration_hours NUMERIC DEFAULT 1;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "durationHours" NUMERIC DEFAULT 1;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS hours NUMERIC DEFAULT 1;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "hours" NUMERIC DEFAULT 1;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 60;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "durationMinutes" INTEGER DEFAULT 60;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'In Progress';
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS payout_id TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "payoutId" TEXT;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
        ALTER TABLE public.school_remedial_sessions ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT NOW();

        -- Synchronize camelCase into snake_case and vice versa
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'institutionId') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '''') AND "institutionId" IS NOT NULL AND "institutionId" <> ''''';
            EXECUTE 'UPDATE public.school_remedial_sessions SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '''') AND institution_id IS NOT NULL AND institution_id <> ''''';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'durationHours') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET duration_hours = COALESCE(NULLIF("durationHours"::text, '''')::numeric, 1) WHERE (duration_hours IS NULL OR duration_hours = 0) AND "durationHours" IS NOT NULL';
            EXECUTE 'UPDATE public.school_remedial_sessions SET hours = COALESCE(hours, duration_hours, NULLIF("durationHours"::text, '''')::numeric, 1) WHERE hours IS NULL OR hours = 0';
            EXECUTE 'UPDATE public.school_remedial_sessions SET "durationHours" = COALESCE(duration_hours, hours, 1) WHERE "durationHours" IS NULL';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'hours') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET duration_hours = COALESCE(duration_hours, hours, 1) WHERE duration_hours IS NULL OR duration_hours = 0';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'startTime') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET start_time = "startTime" WHERE (start_time IS NULL OR start_time = '''') AND "startTime" IS NOT NULL';
            EXECUTE 'UPDATE public.school_remedial_sessions SET "startTime" = start_time WHERE ("startTime" IS NULL OR "startTime" = '''') AND start_time IS NOT NULL';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'endTime') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET end_time = "endTime" WHERE (end_time IS NULL OR end_time = '''') AND "endTime" IS NOT NULL';
            EXECUTE 'UPDATE public.school_remedial_sessions SET "endTime" = end_time WHERE ("endTime" IS NULL OR "endTime" = '''') AND end_time IS NOT NULL';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'teacherId') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET teacher_id = "teacherId" WHERE (teacher_id IS NULL OR teacher_id = '''') AND "teacherId" IS NOT NULL';
            EXECUTE 'UPDATE public.school_remedial_sessions SET "teacherId" = teacher_id WHERE ("teacherId" IS NULL OR "teacherId" = '''') AND teacher_id IS NOT NULL';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'subjectId') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET subject_id = "subjectId" WHERE (subject_id IS NULL OR subject_id = '''') AND "subjectId" IS NOT NULL';
            EXECUTE 'UPDATE public.school_remedial_sessions SET "subjectId" = subject_id WHERE ("subjectId" IS NULL OR "subjectId" = '''') AND subject_id IS NOT NULL';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'courseId') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET course_id = "courseId" WHERE (course_id IS NULL OR course_id = '''') AND "courseId" IS NOT NULL';
            EXECUTE 'UPDATE public.school_remedial_sessions SET "courseId" = course_id WHERE ("courseId" IS NULL OR "courseId" = '''') AND course_id IS NOT NULL';
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_sessions' AND column_name = 'date') THEN
            EXECUTE 'UPDATE public.school_remedial_sessions SET date = COALESCE(NULLIF(date, ''''), substring(start_time from 1 for 10), substring("startTime" from 1 for 10), substring(created_at::text from 1 for 10)) WHERE date IS NULL OR date = ''''';
            EXECUTE 'UPDATE public.school_remedial_sessions SET "date" = date WHERE ("date" IS NULL OR "date" = '''') AND date IS NOT NULL';
        END IF;

        UPDATE public.school_remedial_sessions SET created_at = NOW() WHERE created_at IS NULL;
    END IF;

    -- 2. school_remedial_allocations
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_allocations') THEN
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS course_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "courseId" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS class_name TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "className" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS subject_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS subject_name TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS teacher_id TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS teacher_name TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS day_of_week TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "dayOfWeek" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS start_time TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "startTime" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS end_time TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "endTime" TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS stream TEXT;
        ALTER TABLE public.school_remedial_allocations ADD COLUMN IF NOT EXISTS "stream" TEXT;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_allocations' AND column_name = 'institutionId') THEN
            EXECUTE 'UPDATE public.school_remedial_allocations SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '''') AND "institutionId" IS NOT NULL AND "institutionId" <> ''''';
            EXECUTE 'UPDATE public.school_remedial_allocations SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '''') AND institution_id IS NOT NULL AND institution_id <> ''''';
        END IF;
    END IF;

    -- 3. school_remedial_rate_settings
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_rate_settings') THEN
        ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC DEFAULT 1000;
        ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS "hourlyRate" NUMERIC DEFAULT 1000;
        ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS weekday_hourly_rate NUMERIC DEFAULT 1000;
        ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS "weekdayHourlyRate" NUMERIC DEFAULT 1000;
        ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS weekend_hourly_rate NUMERIC DEFAULT 1500;
        ALTER TABLE public.school_remedial_rate_settings ADD COLUMN IF NOT EXISTS "weekendHourlyRate" NUMERIC DEFAULT 1500;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_rate_settings' AND column_name = 'institutionId') THEN
            EXECUTE 'UPDATE public.school_remedial_rate_settings SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '''') AND "institutionId" IS NOT NULL AND "institutionId" <> ''''';
            EXECUTE 'UPDATE public.school_remedial_rate_settings SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '''') AND institution_id IS NOT NULL AND institution_id <> ''''';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_rate_settings' AND column_name = 'hourlyRate') THEN
            EXECUTE 'UPDATE public.school_remedial_rate_settings SET hourly_rate = COALESCE(NULLIF("hourlyRate"::text, '''')::numeric, 1000) WHERE (hourly_rate IS NULL OR hourly_rate = 0) AND "hourlyRate" IS NOT NULL';
        END IF;
    END IF;

    -- 4. school_remedial_payouts
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_payouts') THEN
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS teacher_id TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS total_hours NUMERIC DEFAULT 0;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS "totalHours" NUMERIC DEFAULT 0;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
        ALTER TABLE public.school_remedial_payouts ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC DEFAULT 0;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_payouts' AND column_name = 'institutionId') THEN
            EXECUTE 'UPDATE public.school_remedial_payouts SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '''') AND "institutionId" IS NOT NULL AND "institutionId" <> ''''';
            EXECUTE 'UPDATE public.school_remedial_payouts SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '''') AND institution_id IS NOT NULL AND institution_id <> ''''';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_payouts' AND column_name = 'totalHours') THEN
            EXECUTE 'UPDATE public.school_remedial_payouts SET total_hours = COALESCE(NULLIF("totalHours"::text, '''')::numeric, 0) WHERE (total_hours IS NULL OR total_hours = 0) AND "totalHours" IS NOT NULL';
        END IF;
    END IF;

    -- 5. school_remedial_duty_roster
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_duty_roster') THEN
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS teacher_id TEXT;
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS duty_date TEXT;
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS "dutyDate" TEXT;
        ALTER TABLE public.school_remedial_duty_roster ADD COLUMN IF NOT EXISTS hours NUMERIC DEFAULT 4;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_duty_roster' AND column_name = 'institutionId') THEN
            EXECUTE 'UPDATE public.school_remedial_duty_roster SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '''') AND "institutionId" IS NOT NULL AND "institutionId" <> ''''';
            EXECUTE 'UPDATE public.school_remedial_duty_roster SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '''') AND institution_id IS NOT NULL AND institution_id <> ''''';
        END IF;
    END IF;

    -- 6. school_remedial_subjects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'school_remedial_subjects') THEN
        ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS subject_id TEXT;
        ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
        ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS subject_name TEXT;
        ALTER TABLE public.school_remedial_subjects ADD COLUMN IF NOT EXISTS "subjectName" TEXT;

        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'school_remedial_subjects' AND column_name = 'institutionId') THEN
            EXECUTE 'UPDATE public.school_remedial_subjects SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '''') AND "institutionId" IS NOT NULL AND "institutionId" <> ''''';
            EXECUTE 'UPDATE public.school_remedial_subjects SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '''') AND institution_id IS NOT NULL AND institution_id <> ''''';
        END IF;
    END IF;
END $$;
