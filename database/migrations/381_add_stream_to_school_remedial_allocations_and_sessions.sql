-- Migration: 381_add_stream_to_school_remedial_allocations_and_sessions.sql
-- Description: Add stream column to school_remedial_allocations and school_remedial_sessions tables.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_remedial_allocations' AND column_name = 'stream'
    ) THEN
        ALTER TABLE school_remedial_allocations ADD COLUMN stream TEXT;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'school_remedial_sessions' AND column_name = 'stream'
    ) THEN
        ALTER TABLE school_remedial_sessions ADD COLUMN stream TEXT;
    END IF;
END $$;
