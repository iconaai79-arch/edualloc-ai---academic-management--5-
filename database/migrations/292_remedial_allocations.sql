-- Migration: 292_remedial_allocations.sql
-- Description: Create school_remedial_allocations table for storing manual and auto-generated remedial subject/teacher timetable allocations.

CREATE TABLE IF NOT EXISTS school_remedial_allocations (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    course_id TEXT NOT NULL,
    class_name TEXT,
    subject_id TEXT NOT NULL,
    subject_name TEXT,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT,
    day_of_week TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    is_weekend BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and Permissive Policies
ALTER TABLE school_remedial_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for school_remedial_allocations" ON school_remedial_allocations;
CREATE POLICY "Allow authenticated select for school_remedial_allocations" ON school_remedial_allocations
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update/delete for school_remedial_allocations" ON school_remedial_allocations;
CREATE POLICY "Allow authenticated insert/update/delete for school_remedial_allocations" ON school_remedial_allocations
    FOR ALL USING (true) WITH CHECK (true);
