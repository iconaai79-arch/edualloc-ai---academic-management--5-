-- 177_repair_academic_registry.sql
-- Force repair of missing columns in core academic tables to prevent generator failures

DO $$ 
BEGIN 
    -- 1. REPAIR timetable_entries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timetable_entries') THEN
        BEGIN
            ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS course_id TEXT REFERENCES courses(id) ON DELETE CASCADE;
            ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS course_level_id TEXT;
            ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS duration INTEGER;
            ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
            ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL;
            ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL;
            ALTER TABLE timetable_entries ADD COLUMN IF NOT EXISTS is_conflicting BOOLEAN DEFAULT FALSE;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'timetable_entries repair encountered issues: %', SQLERRM;
        END;
    END IF;

    -- 2. REPAIR exam_timetable_entries
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'exam_timetable_entries') THEN
        BEGIN
            ALTER TABLE exam_timetable_entries ADD COLUMN IF NOT EXISTS course_id TEXT REFERENCES courses(id) ON DELETE CASCADE;
            ALTER TABLE exam_timetable_entries ADD COLUMN IF NOT EXISTS course_level_id TEXT;
            ALTER TABLE exam_timetable_entries ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
            ALTER TABLE exam_timetable_entries ADD COLUMN IF NOT EXISTS academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL;
            ALTER TABLE exam_timetable_entries ADD COLUMN IF NOT EXISTS semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'exam_timetable_entries repair encountered issues: %', SQLERRM;
        END;
    END IF;

    -- 3. REPAIR subjects (ensure lesson_structure is JSONB)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subjects') THEN
        BEGIN
            ALTER TABLE subjects ADD COLUMN IF NOT EXISTS lesson_structure JSONB DEFAULT '[]'::jsonb;
            ALTER TABLE subjects ADD COLUMN IF NOT EXISTS has_exam BOOLEAN DEFAULT TRUE;
            ALTER TABLE subjects ADD COLUMN IF NOT EXISTS dedicated_room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'subjects repair encountered issues: %', SQLERRM;
        END;
    END IF;

    -- 4. REPAIR allocation_requests (ensure course_level_ids exist)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'allocation_requests') THEN
        BEGIN
            ALTER TABLE allocation_requests ADD COLUMN IF NOT EXISTS course_level_ids TEXT[] DEFAULT '{}';
            ALTER TABLE allocation_requests ADD COLUMN IF NOT EXISTS proposed_changes JSONB DEFAULT '[]'::jsonb;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'allocation_requests repair encountered issues: %', SQLERRM;
        END;
    END IF;

    -- 5. REPAIR institutions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'institutions') THEN
        BEGIN
            ALTER TABLE institutions ADD COLUMN IF NOT EXISTS use_allocation_requests BOOLEAN DEFAULT TRUE;
            ALTER TABLE institutions ADD COLUMN IF NOT EXISTS timetable_settings JSONB DEFAULT '{}'::jsonb;
        EXCEPTION WHEN others THEN
            RAISE NOTICE 'institutions repair encountered issues: %', SQLERRM;
        END;
    END IF;

END $$;

-- Force API Schema Refresh
NOTIFY pgrst, 'reload schema';
