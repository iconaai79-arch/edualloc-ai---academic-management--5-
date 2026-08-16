-- Migration 264: Create Teacher Check-Ins View
-- This view aggregates teacher check-ins with teacher name and email for any date range

-- Drop existing view first to avoid column type mismatch errors (42P16)
DROP VIEW IF EXISTS v_teacher_checkins CASCADE;

CREATE OR REPLACE VIEW v_teacher_checkins 
WITH (security_invoker = true) AS
SELECT 
    tc.*,
    u.name as teacher_name,
    u.email as teacher_email,
    i.name as institution_name,
    CASE 
        WHEN tc.morning_check_in_time IS NULL AND (tc.check_in_date < CURRENT_DATE OR CURRENT_TIME > '08:00:00') THEN true
        ELSE false
    END as morning_overdue,
    CASE 
        WHEN tc.afternoon_check_in_time IS NULL AND (tc.check_in_date < CURRENT_DATE OR CURRENT_TIME > '16:00:00') THEN true
        ELSE false
    END as afternoon_overdue
FROM teacher_checkins tc
JOIN users u ON tc.teacher_id = u.id
JOIN institutions i ON tc.institution_id = i.id;

-- Comment for documentation
COMMENT ON VIEW v_teacher_checkins IS 'View for teacher check-ins with teacher details, supporting date range reporting';
