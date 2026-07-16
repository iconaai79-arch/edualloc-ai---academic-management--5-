-- Migration 276: ZKTeco Biometric Integration Tables
-- Creates tables for biometric device management, staff enrollment,
-- raw attendance punch logs, and computed daily attendance summaries.

-- 1. Biometric Device Registry
CREATE TABLE IF NOT EXISTS biometric_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    serial_number VARCHAR(100) NOT NULL,
    device_name VARCHAR(255) NOT NULL DEFAULT 'Biometric Terminal',
    device_model VARCHAR(100),
    ip_address VARCHAR(45),
    location_description VARCHAR(255),
    protocol VARCHAR(20) NOT NULL DEFAULT 'adms',
    push_url TEXT,
    last_sync_at TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, serial_number)
);

CREATE INDEX IF NOT EXISTS idx_biometric_devices_institution ON biometric_devices(institution_id);

-- 2. Staff ↔ Device PIN Enrollment
CREATE TABLE IF NOT EXISTS biometric_enrollments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    device_pin VARCHAR(20) NOT NULL,
    fingerprint_index INT DEFAULT 0,
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_active BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(institution_id, device_pin)
);

CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_institution ON biometric_enrollments(institution_id);
CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_staff ON biometric_enrollments(staff_id);
CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_pin ON biometric_enrollments(institution_id, device_pin);

-- 3. Raw Attendance Punch Logs
CREATE TABLE IF NOT EXISTS staff_attendance_logs (
    id BIGSERIAL PRIMARY KEY,
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES users(id) ON DELETE SET NULL,
    device_id UUID REFERENCES biometric_devices(id) ON DELETE SET NULL,
    device_pin VARCHAR(20),
    punch_time TIMESTAMPTZ NOT NULL,
    punch_type INT NOT NULL DEFAULT 0,
    verification_method INT NOT NULL DEFAULT 0,
    raw_data TEXT,
    is_processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_logs_institution ON staff_attendance_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_logs_staff ON staff_attendance_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_logs_punch_time ON staff_attendance_logs(punch_time);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_logs_date ON staff_attendance_logs(institution_id, (punch_time::date));

-- 4. Computed Daily Attendance Summary
CREATE TABLE IF NOT EXISTS staff_attendance_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    attendance_date DATE NOT NULL,
    first_in TIMESTAMPTZ,
    last_out TIMESTAMPTZ,
    total_hours DECIMAL(5,2) DEFAULT 0,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'present',
    late_minutes INT DEFAULT 0,
    early_leave_minutes INT DEFAULT 0,
    punch_count INT DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, staff_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_attendance_daily_institution ON staff_attendance_daily(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_daily_staff ON staff_attendance_daily(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_daily_date ON staff_attendance_daily(attendance_date);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_daily_lookup ON staff_attendance_daily(institution_id, attendance_date);

-- 5. Function to compute daily summary from raw logs
CREATE OR REPLACE FUNCTION compute_staff_daily_attendance(
    p_institution_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_standard_hours DECIMAL DEFAULT 8.0,
    p_morning_deadline TIME DEFAULT '08:00:00'
)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
    rec RECORD;
    v_first_in TIMESTAMPTZ;
    v_last_out TIMESTAMPTZ;
    v_total_hours DECIMAL(5,2);
    v_overtime DECIMAL(5,2);
    v_late_minutes INT;
    v_punch_count INT;
    v_status VARCHAR(20);
BEGIN
    -- Loop through each staff who has punches on this date
    FOR rec IN
        SELECT DISTINCT staff_id
        FROM staff_attendance_logs
        WHERE institution_id = p_institution_id
          AND staff_id IS NOT NULL
          AND punch_time::date = p_date
    LOOP
        -- Get first-in and last-out
        SELECT
            MIN(punch_time),
            MAX(punch_time),
            COUNT(*)
        INTO v_first_in, v_last_out, v_punch_count
        FROM staff_attendance_logs
        WHERE institution_id = p_institution_id
          AND staff_id = rec.staff_id
          AND punch_time::date = p_date;

        -- Calculate total hours (last-out minus first-in)
        IF v_first_in IS NOT NULL AND v_last_out IS NOT NULL AND v_last_out > v_first_in THEN
            v_total_hours := ROUND(EXTRACT(EPOCH FROM (v_last_out - v_first_in)) / 3600.0, 2);
        ELSE
            v_total_hours := 0;
        END IF;

        -- Calculate overtime
        IF v_total_hours > p_standard_hours THEN
            v_overtime := v_total_hours - p_standard_hours;
        ELSE
            v_overtime := 0;
        END IF;

        -- Calculate late minutes (based on morning deadline)
        IF v_first_in IS NOT NULL AND v_first_in::time > p_morning_deadline THEN
            v_late_minutes := EXTRACT(EPOCH FROM (v_first_in::time - p_morning_deadline))::INT / 60;
        ELSE
            v_late_minutes := 0;
        END IF;

        -- Determine status
        IF v_total_hours >= p_standard_hours * 0.5 THEN
            v_status := 'present';
        ELSIF v_total_hours > 0 THEN
            v_status := 'half-day';
        ELSE
            v_status := 'absent';
        END IF;

        -- Upsert into daily summary
        INSERT INTO staff_attendance_daily (
            institution_id, staff_id, attendance_date,
            first_in, last_out, total_hours, overtime_hours,
            status, late_minutes, punch_count, updated_at
        ) VALUES (
            p_institution_id, rec.staff_id, p_date,
            v_first_in, v_last_out, v_total_hours, v_overtime,
            v_status, v_late_minutes, v_punch_count, NOW()
        )
        ON CONFLICT (institution_id, staff_id, attendance_date)
        DO UPDATE SET
            first_in = EXCLUDED.first_in,
            last_out = EXCLUDED.last_out,
            total_hours = EXCLUDED.total_hours,
            overtime_hours = EXCLUDED.overtime_hours,
            status = EXCLUDED.status,
            late_minutes = EXCLUDED.late_minutes,
            punch_count = EXCLUDED.punch_count,
            updated_at = NOW();
    END LOOP;
END;
$$;

-- 6. Trigger: auto-recompute daily summary when new punch arrives
CREATE OR REPLACE FUNCTION trg_recompute_daily_attendance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.staff_id IS NOT NULL THEN
        PERFORM compute_staff_daily_attendance(
            NEW.institution_id,
            NEW.punch_time::date
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_attendance_log_insert ON staff_attendance_logs;
CREATE TRIGGER trg_staff_attendance_log_insert
    AFTER INSERT ON staff_attendance_logs
    FOR EACH ROW
    EXECUTE FUNCTION trg_recompute_daily_attendance();

-- 7. RLS Policies
ALTER TABLE biometric_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_attendance_daily ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_biometric_devices" ON biometric_devices FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_biometric_enrollments" ON biometric_enrollments FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_staff_attendance_logs" ON staff_attendance_logs FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_staff_attendance_daily" ON staff_attendance_daily FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated users: institution-scoped access
CREATE POLICY "institution_biometric_devices" ON biometric_devices
    FOR ALL TO authenticated
    USING (institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()))
    WITH CHECK (institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "institution_biometric_enrollments" ON biometric_enrollments
    FOR ALL TO authenticated
    USING (institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()))
    WITH CHECK (institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "institution_staff_attendance_logs" ON staff_attendance_logs
    FOR ALL TO authenticated
    USING (institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()))
    WITH CHECK (institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "institution_staff_attendance_daily" ON staff_attendance_daily
    FOR ALL TO authenticated
    USING (institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()))
    WITH CHECK (institution_id IN (SELECT institution_id FROM users WHERE id = auth.uid()));

-- Comments
COMMENT ON TABLE biometric_devices IS 'Registry of ZKTeco and other biometric attendance devices per institution';
COMMENT ON TABLE biometric_enrollments IS 'Maps staff members to their device PIN/enrollment number';
COMMENT ON TABLE staff_attendance_logs IS 'Raw biometric punch log entries from devices';
COMMENT ON TABLE staff_attendance_daily IS 'Computed daily attendance summaries (first-in, last-out, hours, overtime, late)';
COMMENT ON FUNCTION compute_staff_daily_attendance IS 'Recomputes daily attendance summary from raw punch logs for a given institution and date';
