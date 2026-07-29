-- Migration: 291_remedial_rate_settings_expansion.sql
-- Description: Create or update school_remedial_rate_settings table with weekday/weekend rates, session timings, and max lessons per day.

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
    fee_per_student NUMERIC DEFAULT 200,
    term_fee NUMERIC DEFAULT 3000,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was previously created with fewer columns
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_remedial_rate_settings' AND column_name = 'weekday_hourly_rate') THEN
        ALTER TABLE school_remedial_rate_settings ADD COLUMN weekday_hourly_rate NUMERIC DEFAULT 1000;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_remedial_rate_settings' AND column_name = 'weekend_hourly_rate') THEN
        ALTER TABLE school_remedial_rate_settings ADD COLUMN weekend_hourly_rate NUMERIC DEFAULT 1500;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_remedial_rate_settings' AND column_name = 'weekday_start_time') THEN
        ALTER TABLE school_remedial_rate_settings ADD COLUMN weekday_start_time TEXT DEFAULT '16:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_remedial_rate_settings' AND column_name = 'weekday_end_time') THEN
        ALTER TABLE school_remedial_rate_settings ADD COLUMN weekday_end_time TEXT DEFAULT '18:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_remedial_rate_settings' AND column_name = 'weekend_start_time') THEN
        ALTER TABLE school_remedial_rate_settings ADD COLUMN weekend_start_time TEXT DEFAULT '08:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_remedial_rate_settings' AND column_name = 'weekend_end_time') THEN
        ALTER TABLE school_remedial_rate_settings ADD COLUMN weekend_end_time TEXT DEFAULT '12:00';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_remedial_rate_settings' AND column_name = 'max_lessons_per_day') THEN
        ALTER TABLE school_remedial_rate_settings ADD COLUMN max_lessons_per_day INTEGER DEFAULT 1;
    END IF;
END $$;

-- Enable RLS and Permissive Policies
ALTER TABLE school_remedial_rate_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for school_remedial_rate_settings" ON school_remedial_rate_settings;
CREATE POLICY "Allow authenticated select for school_remedial_rate_settings" ON school_remedial_rate_settings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update for school_remedial_rate_settings" ON school_remedial_rate_settings;
CREATE POLICY "Allow authenticated insert/update for school_remedial_rate_settings" ON school_remedial_rate_settings
    FOR ALL USING (true) WITH CHECK (true);
