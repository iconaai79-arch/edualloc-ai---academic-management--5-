-- Migration 383: Add weekend-specific daily lesson limit to school_remedial_rate_settings
-- Weekday and weekend lesson caps are now enforced independently.

ALTER TABLE school_remedial_rate_settings
    ADD COLUMN IF NOT EXISTS max_weekend_lessons_per_day INTEGER DEFAULT 2;

COMMENT ON COLUMN school_remedial_rate_settings.max_weekend_lessons_per_day
    IS 'Maximum number of remedial lessons a teacher can teach on a Saturday or Sunday (defaults to 2, applied independently from the weekday cap).';
