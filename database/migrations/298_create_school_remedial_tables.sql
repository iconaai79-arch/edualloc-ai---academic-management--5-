-- Migration: 298_create_school_remedial_tables.sql
-- Description: Create all school remedial module tables (subjects, sessions, payouts, rate settings, allocations) with RLS policies.

-- 1. School Remedial Subjects Table
CREATE TABLE IF NOT EXISTS school_remedial_subjects (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    subject_id TEXT,
    subject_name TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. School Remedial Sessions Table
CREATE TABLE IF NOT EXISTS school_remedial_sessions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    allocation_id TEXT,
    course_id TEXT,
    subject_id TEXT,
    teacher_id TEXT,
    date TEXT,
    day_of_week TEXT,
    start_time TEXT,
    end_time TEXT,
    duration_hours NUMERIC DEFAULT 1,
    is_weekend BOOLEAN DEFAULT FALSE,
    prefect_id TEXT,
    prefect_name TEXT,
    prefect_signed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'In Progress',
    payout_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. School Remedial Payouts Table
CREATE TABLE IF NOT EXISTS school_remedial_payouts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    teacher_id TEXT NOT NULL,
    teacher_name TEXT,
    total_hours NUMERIC DEFAULT 0,
    hourly_rate NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payout_date TEXT,
    status TEXT DEFAULT 'Pending',
    anonymous_signature TEXT,
    signed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. School Remedial Rate Settings Table (backup creation)
CREATE TABLE IF NOT EXISTS school_remedial_rate_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    hourly_rate NUMERIC DEFAULT 1000,
    weekday_hourly_rate NUMERIC DEFAULT 1000,
    weekend_hourly_rate NUMERIC DEFAULT 1500,
    weekday_start_time TEXT DEFAULT '16:00',
    weekday_end_time TEXT DEFAULT '18:00',
    weekend_start_time TEXT DEFAULT '08:00',
    weekend_end_time TEXT DEFAULT '12:00',
    max_lessons_per_day INTEGER DEFAULT 1,
    fee_per_student NUMERIC DEFAULT 0,
    term_fee NUMERIC DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. School Remedial Allocations Table (backup creation)
CREATE TABLE IF NOT EXISTS school_remedial_allocations (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    course_id TEXT,
    class_name TEXT,
    subject_id TEXT,
    subject_name TEXT,
    teacher_id TEXT,
    teacher_name TEXT,
    day_of_week TEXT,
    start_time TEXT,
    end_time TEXT,
    is_weekend BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies Setup
ALTER TABLE school_remedial_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_remedial_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_remedial_payouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_remedial_rate_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE school_remedial_allocations ENABLE ROW LEVEL SECURITY;

-- Permissive policies for authenticated access (matched with EduAI records API)
DROP POLICY IF EXISTS "Allow all for school_remedial_subjects" ON school_remedial_subjects;
CREATE POLICY "Allow all for school_remedial_subjects" ON school_remedial_subjects FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for school_remedial_sessions" ON school_remedial_sessions;
CREATE POLICY "Allow all for school_remedial_sessions" ON school_remedial_sessions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for school_remedial_payouts" ON school_remedial_payouts;
CREATE POLICY "Allow all for school_remedial_payouts" ON school_remedial_payouts FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for school_remedial_rate_settings" ON school_remedial_rate_settings;
CREATE POLICY "Allow all for school_remedial_rate_settings" ON school_remedial_rate_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for school_remedial_allocations" ON school_remedial_allocations;
CREATE POLICY "Allow all for school_remedial_allocations" ON school_remedial_allocations FOR ALL USING (true) WITH CHECK (true);
