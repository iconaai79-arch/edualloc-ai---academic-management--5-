-- Migration 356: Allow nullable student_id in ds_lessons for theory/group sessions & graceful FK handling
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'ds_lessons' AND column_name = 'student_id'
    ) THEN
        -- Drop NOT NULL constraint on student_id to support general theory/room sessions and graceful fallback
        ALTER TABLE ds_lessons ALTER COLUMN student_id DROP NOT NULL;
    END IF;
END $$;
