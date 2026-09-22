-- Migration 419: Optimize timetable_entries and exam_timetable_entries indexes
-- Purpose: Accelerate timetable queries by institution_id, academic_year_id, semester_id, course_id, lecturer_id, and id.
-- Eliminates PostgREST query chunk statement timeouts on 'timetable_entries'.

DO $$
BEGIN
    -- 1. Ensure timetable_entries table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'timetable_entries'
    ) THEN
        CREATE TABLE public.timetable_entries (
            id                  TEXT PRIMARY KEY,
            institution_id      TEXT NOT NULL,
            "institutionId"     TEXT,
            academic_year_id    TEXT,
            "academicYearId"    TEXT,
            semester_id         TEXT,
            "semesterId"        TEXT,
            course_id           TEXT,
            "courseId"          TEXT,
            course_level_id     TEXT,
            "courseLevelId"     TEXT,
            subject_id          TEXT,
            "subjectId"         TEXT,
            lecturer_id         TEXT,
            "lecturerId"        TEXT,
            room_id             TEXT,
            "roomId"            TEXT,
            day                 TEXT,
            start_time          TEXT,
            "startTime"         TEXT,
            end_time            TEXT,
            "endTime"           TEXT,
            duration            INTEGER,
            is_conflicting      BOOLEAN DEFAULT FALSE,
            "isConflicting"     BOOLEAN DEFAULT FALSE,
            color               TEXT,
            metadata            JSONB DEFAULT '{}'::jsonb,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "timetable_entries_all" ON public.timetable_entries;
        CREATE POLICY "timetable_entries_all" ON public.timetable_entries FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.timetable_entries TO anon, authenticated, service_role;
    END IF;

    -- 2. Ensure exam_timetable_entries table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'exam_timetable_entries'
    ) THEN
        CREATE TABLE public.exam_timetable_entries (
            id                  TEXT PRIMARY KEY,
            institution_id      TEXT NOT NULL,
            "institutionId"     TEXT,
            academic_year_id    TEXT,
            "academicYearId"    TEXT,
            semester_id         TEXT,
            "semesterId"        TEXT,
            course_id           TEXT,
            "courseId"          TEXT,
            course_level_id     TEXT,
            "courseLevelId"     TEXT,
            subject_id          TEXT,
            "subjectId"         TEXT,
            invigilator_id      TEXT,
            "invigilatorId"     TEXT,
            room_id             TEXT,
            "roomId"            TEXT,
            exam_date           DATE,
            "examDate"          TEXT,
            start_time          TEXT,
            "startTime"         TEXT,
            end_time            TEXT,
            "endTime"           TEXT,
            duration            INTEGER,
            is_conflicting      BOOLEAN DEFAULT FALSE,
            "isConflicting"     BOOLEAN DEFAULT FALSE,
            metadata            JSONB DEFAULT '{}'::jsonb,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.exam_timetable_entries ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "exam_timetable_entries_all" ON public.exam_timetable_entries;
        CREATE POLICY "exam_timetable_entries_all" ON public.exam_timetable_entries FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.exam_timetable_entries TO anon, authenticated, service_role;
    END IF;

    -- 3. Indexes for timetable_entries
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'timetable_entries'
    ) THEN
        -- Tenancy index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'timetable_entries' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_timetable_entries_institution 
                ON public.timetable_entries (institution_id);
            CREATE INDEX IF NOT EXISTS idx_timetable_entries_inst_id_composite 
                ON public.timetable_entries (institution_id, id);
        END IF;

        -- Academic Year & Semester composite index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'timetable_entries' AND column_name = 'academic_year_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_timetable_entries_inst_ay_sem 
                ON public.timetable_entries (institution_id, academic_year_id, semester_id);
        END IF;

        -- Day & Period index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'timetable_entries' AND column_name = 'day'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_timetable_entries_inst_day 
                ON public.timetable_entries (institution_id, day);
        END IF;

        -- Course & Level index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'timetable_entries' AND column_name = 'course_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_timetable_entries_inst_course 
                ON public.timetable_entries (institution_id, course_id, course_level_id);
        END IF;

        -- Lecturer index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'timetable_entries' AND column_name = 'lecturer_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_timetable_entries_inst_lecturer 
                ON public.timetable_entries (institution_id, lecturer_id);
        END IF;
    END IF;

    -- 4. Indexes for exam_timetable_entries
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'exam_timetable_entries'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'exam_timetable_entries' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_exam_timetable_entries_institution 
                ON public.exam_timetable_entries (institution_id);
            CREATE INDEX IF NOT EXISTS idx_exam_timetable_entries_inst_id_composite 
                ON public.exam_timetable_entries (institution_id, id);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'exam_timetable_entries' AND column_name = 'academic_year_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_exam_timetable_entries_inst_ay_sem 
                ON public.exam_timetable_entries (institution_id, academic_year_id, semester_id);
        END IF;

        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'exam_timetable_entries' AND column_name = 'exam_date'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_exam_timetable_entries_inst_date 
                ON public.exam_timetable_entries (institution_id, exam_date);
        END IF;
    END IF;
END $$;
