-- Teacher Attendance and Check-In System
-- This migration creates tables for tracking teacher attendance and check-ins

-- Teacher Check-Ins Table
CREATE TABLE IF NOT EXISTS teacher_checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Morning Check-In (around 8 AM)
    morning_check_in_time TIME,
    morning_check_in_status VARCHAR(20) DEFAULT 'Pending', -- Pending, On Time, Late, Absent
    morning_location VARCHAR(255),
    morning_notes TEXT,
    
    -- Afternoon Check-In (around 4 PM)
    afternoon_check_in_time TIME,
    afternoon_check_in_status VARCHAR(20) DEFAULT 'Pending', -- Pending, On Time, Late, Absent
    afternoon_location VARCHAR(255),
    afternoon_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_teacher_date UNIQUE(teacher_id, check_in_date)
);

-- Teacher Attendance Summary Table
CREATE TABLE IF NOT EXISTS teacher_attendance_summary (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    
    -- Statistics
    total_days INTEGER DEFAULT 0,
    present_days INTEGER DEFAULT 0,
    late_days INTEGER DEFAULT 0,
    absent_days INTEGER DEFAULT 0,
    morning_checkins INTEGER DEFAULT 0,
    afternoon_checkins INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_teacher_month UNIQUE(teacher_id, month, year)
);

-- Teacher Check-In Reminders Table
CREATE TABLE IF NOT EXISTS teacher_checkin_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    reminder_date DATE NOT NULL,
    reminder_time TIME NOT NULL,
    reminder_type VARCHAR(20) NOT NULL, -- Morning, Afternoon
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Sent, Acknowledged, Dismissed
    sent_at TIMESTAMP,
    acknowledged_at TIMESTAMP,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_teacher_reminder UNIQUE(teacher_id, reminder_date, reminder_type)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_teacher_checkins_teacher ON teacher_checkins(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_checkins_date ON teacher_checkins(check_in_date);
CREATE INDEX IF NOT EXISTS idx_teacher_checkins_institution ON teacher_checkins(institution_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_teacher ON teacher_attendance_summary(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_reminders_teacher ON teacher_checkin_reminders(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_reminders_date ON teacher_checkin_reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_teacher_reminders_status ON teacher_checkin_reminders(status);

-- Function to determine check-in status based on time
CREATE OR REPLACE FUNCTION determine_checkin_status(
    check_in_time TIME,
    checkin_type VARCHAR(20)
) RETURNS VARCHAR(20) AS $$
BEGIN
    IF check_in_time IS NULL THEN
        RETURN 'Absent';
    END IF;
    
    IF checkin_type = 'Morning' THEN
        -- On time if before 8:00 AM
        IF check_in_time <= '08:00:00' THEN
            RETURN 'On Time';
        ELSE
            RETURN 'Late';
        END IF;
    ELSIF checkin_type = 'Afternoon' THEN
        -- On time if before 4:00 PM
        IF check_in_time <= '16:00:00' THEN
            RETURN 'On Time';
        ELSE
            RETURN 'Late';
        END IF;
    END IF;
    
    RETURN 'Pending';
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Trigger to update check-in status automatically
CREATE OR REPLACE FUNCTION update_checkin_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update morning status
    IF NEW.morning_check_in_time IS NOT NULL AND NEW.morning_check_in_status = 'Pending' THEN
        NEW.morning_check_in_status := determine_checkin_status(NEW.morning_check_in_time, 'Morning');
    END IF;
    
    -- Update afternoon status
    IF NEW.afternoon_check_in_time IS NOT NULL AND NEW.afternoon_check_in_status = 'Pending' THEN
        NEW.afternoon_check_in_status := determine_checkin_status(NEW.afternoon_check_in_time, 'Afternoon');
    END IF;
    
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_update_checkin_status
    BEFORE INSERT OR UPDATE ON teacher_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_checkin_status();

-- Function to update attendance summary
CREATE OR REPLACE FUNCTION update_attendance_summary()
RETURNS TRIGGER AS $$
DECLARE
    v_month INTEGER;
    v_year INTEGER;
    v_present INTEGER;
    v_late INTEGER;
    v_absent INTEGER;
    v_morning INTEGER;
    v_afternoon INTEGER;
BEGIN
    v_month := EXTRACT(MONTH FROM NEW.check_in_date);
    v_year := EXTRACT(YEAR FROM NEW.check_in_date);
    
    -- Count statistics for the month
    SELECT 
        COUNT(CASE WHEN morning_check_in_status IN ('On Time', 'Late') OR afternoon_check_in_status IN ('On Time', 'Late') THEN 1 END),
        COUNT(CASE WHEN morning_check_in_status = 'Late' OR afternoon_check_in_status = 'Late' THEN 1 END),
        COUNT(CASE WHEN morning_check_in_status = 'Absent' AND afternoon_check_in_status = 'Absent' THEN 1 END),
        COUNT(CASE WHEN morning_check_in_time IS NOT NULL THEN 1 END),
        COUNT(CASE WHEN afternoon_check_in_time IS NOT NULL THEN 1 END)
    INTO v_present, v_late, v_absent, v_morning, v_afternoon
    FROM teacher_checkins
    WHERE teacher_id = NEW.teacher_id
        AND EXTRACT(MONTH FROM check_in_date) = v_month
        AND EXTRACT(YEAR FROM check_in_date) = v_year;
    
    -- Upsert summary
    INSERT INTO teacher_attendance_summary (
        teacher_id,
        institution_id,
        month,
        year,
        total_days,
        present_days,
        late_days,
        absent_days,
        morning_checkins,
        afternoon_checkins
    ) VALUES (
        NEW.teacher_id,
        NEW.institution_id,
        v_month,
        v_year,
        v_present + v_absent,
        v_present,
        v_late,
        v_absent,
        v_morning,
        v_afternoon
    )
    ON CONFLICT (teacher_id, month, year)
    DO UPDATE SET
        total_days = v_present + v_absent,
        present_days = v_present,
        late_days = v_late,
        absent_days = v_absent,
        morning_checkins = v_morning,
        afternoon_checkins = v_afternoon,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_update_attendance_summary
    AFTER INSERT OR UPDATE ON teacher_checkins
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_summary();

-- View for today's check-ins
CREATE OR REPLACE VIEW v_today_teacher_checkins 
WITH (security_invoker = true) AS
SELECT 
    tc.*,
    u.name as teacher_name,
    u.email as teacher_email,
    i.name as institution_name,
    CASE 
        WHEN tc.morning_check_in_time IS NULL AND CURRENT_TIME > '08:00:00' THEN true
        ELSE false
    END as morning_overdue,
    CASE 
        WHEN tc.afternoon_check_in_time IS NULL AND CURRENT_TIME > '16:00:00' THEN true
        ELSE false
    END as afternoon_overdue
FROM teacher_checkins tc
JOIN users u ON tc.teacher_id = u.id
JOIN institutions i ON tc.institution_id = i.id
WHERE tc.check_in_date = CURRENT_DATE;

-- View for pending reminders
CREATE OR REPLACE VIEW v_pending_reminders 
WITH (security_invoker = true) AS
SELECT 
    r.*,
    u.name as teacher_name,
    u.email as teacher_email,
    u.phone_number as teacher_phone
FROM teacher_checkin_reminders r
JOIN users u ON r.teacher_id = u.id
WHERE r.status = 'Pending'
    AND r.reminder_date = CURRENT_DATE
    AND r.reminder_time <= CURRENT_TIME + INTERVAL '5 minutes'
ORDER BY r.reminder_time;

-- Function to create daily reminders for all teachers
CREATE OR REPLACE FUNCTION create_daily_reminders(p_institution_id TEXT)
RETURNS INTEGER AS $$
DECLARE
    v_teacher RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_teacher IN 
        SELECT id FROM users 
        WHERE role = 'teacher' 
        AND institution_id = p_institution_id
        AND status = 'active'
    LOOP
        -- Morning reminder (7:45 AM)
        INSERT INTO teacher_checkin_reminders (
            teacher_id,
            institution_id,
            reminder_date,
            reminder_time,
            reminder_type
        ) VALUES (
            v_teacher.id,
            p_institution_id,
            CURRENT_DATE,
            '07:45:00',
            'Morning'
        ) ON CONFLICT (teacher_id, reminder_date, reminder_type) DO NOTHING;
        
        -- Afternoon reminder (3:45 PM)
        INSERT INTO teacher_checkin_reminders (
            teacher_id,
            institution_id,
            reminder_date,
            reminder_time,
            reminder_type
        ) VALUES (
            v_teacher.id,
            p_institution_id,
            CURRENT_DATE,
            '15:45:00',
            'Afternoon'
        ) ON CONFLICT (teacher_id, reminder_date, reminder_type) DO NOTHING;
        
        v_count := v_count + 1;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Function to process a check-in
CREATE OR REPLACE FUNCTION process_teacher_checkin(
    p_teacher_id TEXT,
    p_institution_id TEXT,
    p_checkin_type VARCHAR(20),
    p_location VARCHAR(255) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_checkin_id UUID;
    v_current_time TIME := CURRENT_TIME;
BEGIN
    -- Insert or update check-in record
    INSERT INTO teacher_checkins (
        teacher_id,
        institution_id,
        check_in_date,
        morning_check_in_time,
        morning_location,
        morning_notes,
        afternoon_check_in_time,
        afternoon_location,
        afternoon_notes
    ) VALUES (
        p_teacher_id,
        p_institution_id,
        CURRENT_DATE,
        CASE WHEN p_checkin_type = 'Morning' THEN v_current_time ELSE NULL END,
        CASE WHEN p_checkin_type = 'Morning' THEN p_location ELSE NULL END,
        CASE WHEN p_checkin_type = 'Morning' THEN p_notes ELSE NULL END,
        CASE WHEN p_checkin_type = 'Afternoon' THEN v_current_time ELSE NULL END,
        CASE WHEN p_checkin_type = 'Afternoon' THEN p_location ELSE NULL END,
        CASE WHEN p_checkin_type = 'Afternoon' THEN p_notes ELSE NULL END
    )
    ON CONFLICT (teacher_id, check_in_date)
    DO UPDATE SET
        morning_check_in_time = CASE WHEN p_checkin_type = 'Morning' THEN v_current_time ELSE teacher_checkins.morning_check_in_time END,
        morning_location = CASE WHEN p_checkin_type = 'Morning' THEN p_location ELSE teacher_checkins.morning_location END,
        morning_notes = CASE WHEN p_checkin_type = 'Morning' THEN p_notes ELSE teacher_checkins.morning_notes END,
        afternoon_check_in_time = CASE WHEN p_checkin_type = 'Afternoon' THEN v_current_time ELSE teacher_checkins.afternoon_check_in_time END,
        afternoon_location = CASE WHEN p_checkin_type = 'Afternoon' THEN p_location ELSE teacher_checkins.afternoon_location END,
        afternoon_notes = CASE WHEN p_checkin_type = 'Afternoon' THEN p_notes ELSE teacher_checkins.afternoon_notes END,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_checkin_id;
    
    -- Mark reminder as acknowledged
    UPDATE teacher_checkin_reminders
    SET status = 'Acknowledged',
        acknowledged_at = CURRENT_TIMESTAMP
    WHERE teacher_id = p_teacher_id
        AND reminder_date = CURRENT_DATE
        AND reminder_type = p_checkin_type;
    
    RETURN v_checkin_id;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Comments
COMMENT ON TABLE teacher_checkins IS 'Tracks teacher check-ins for morning and afternoon sessions';
COMMENT ON TABLE teacher_attendance_summary IS 'Monthly summary of teacher attendance statistics';
COMMENT ON TABLE teacher_checkin_reminders IS 'Scheduled reminders for teacher check-ins';
COMMENT ON FUNCTION create_daily_reminders IS 'Creates morning (7:45 AM) and afternoon (3:45 PM) reminders for all active teachers';
COMMENT ON FUNCTION process_teacher_checkin IS 'Processes a teacher check-in and updates reminder status';
