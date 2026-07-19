-- Migration 278: Update process_teacher_checkin signature to support timestamp and timetable_entry_id parameter overloads
DROP FUNCTION IF EXISTS public.process_teacher_checkin(TEXT, TEXT, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.process_teacher_checkin(UUID, UUID, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.process_teacher_checkin(TEXT, TEXT, VARCHAR, VARCHAR, TEXT, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.process_teacher_checkin(TEXT, TEXT, VARCHAR, VARCHAR, TEXT, TEXT, TIMESTAMP WITH TIME ZONE);

CREATE OR REPLACE FUNCTION public.process_teacher_checkin(
    p_teacher_id TEXT,
    p_institution_id TEXT,
    p_checkin_type VARCHAR(20),
    p_location VARCHAR(255) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_timetable_entry_id TEXT DEFAULT NULL,
    p_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_checkin_id UUID;
    v_current_time TIME := COALESCE(p_timestamp::time, CURRENT_TIME);
    v_current_date DATE := COALESCE(p_timestamp::date, CURRENT_DATE);
BEGIN
    -- Insert or update check-in record
    INSERT INTO public.teacher_checkins (
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
        v_current_date,
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
    UPDATE public.teacher_checkin_reminders
    SET status = 'Acknowledged',
        acknowledged_at = CURRENT_TIMESTAMP
    WHERE teacher_id = p_teacher_id
        AND reminder_date = v_current_date
        AND reminder_type = p_checkin_type;
    
    RETURN v_checkin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.process_teacher_checkin TO anon, authenticated, service_role;