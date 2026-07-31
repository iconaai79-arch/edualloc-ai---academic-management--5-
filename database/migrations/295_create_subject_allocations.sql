-- Migration: Create subject_allocations table for lesson and teacher allocations per class stream
-- This table tracks which teacher teaches which subject in which class, and how many lessons per week.

CREATE TABLE IF NOT EXISTS public.subject_allocations (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    class_name TEXT NOT NULL,
    subject_name TEXT NOT NULL,
    subject_code TEXT,
    teacher_id TEXT,
    teacher_name TEXT,
    lessons_per_week INTEGER NOT NULL DEFAULT 5,
    room TEXT,
    status TEXT NOT NULL DEFAULT 'unassigned' CHECK (status IN ('allocated', 'unassigned')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast lookup by institution, class, and teacher
CREATE INDEX IF NOT EXISTS idx_subject_allocations_institution_id ON public.subject_allocations(institution_id);
CREATE INDEX IF NOT EXISTS idx_subject_allocations_class_name ON public.subject_allocations(institution_id, class_name);
CREATE INDEX IF NOT EXISTS idx_subject_allocations_teacher_id ON public.subject_allocations(teacher_id);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_subject_allocations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_subject_allocations_updated_at ON public.subject_allocations;
CREATE TRIGGER trg_subject_allocations_updated_at
    BEFORE UPDATE ON public.subject_allocations
    FOR EACH ROW
    EXECUTE FUNCTION update_subject_allocations_updated_at();

-- Enable RLS
ALTER TABLE public.subject_allocations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS subject_allocations_select_policy ON public.subject_allocations;
DROP POLICY IF EXISTS subject_allocations_insert_policy ON public.subject_allocations;
DROP POLICY IF EXISTS subject_allocations_update_policy ON public.subject_allocations;
DROP POLICY IF EXISTS subject_allocations_delete_policy ON public.subject_allocations;

-- SELECT: institution members can read their own records
CREATE POLICY subject_allocations_select_policy ON public.subject_allocations
    FOR SELECT USING (
        institution_id = (SELECT institution_id FROM public.users WHERE id = auth.uid()::text LIMIT 1)
        OR (SELECT role FROM public.users WHERE id = auth.uid()::text LIMIT 1) = 'super_admin'
    );

-- INSERT: institution admins/staff can create allocations
CREATE POLICY subject_allocations_insert_policy ON public.subject_allocations
    FOR INSERT WITH CHECK (
        institution_id = (SELECT institution_id FROM public.users WHERE id = auth.uid()::text LIMIT 1)
        OR (SELECT role FROM public.users WHERE id = auth.uid()::text LIMIT 1) = 'super_admin'
    );

-- UPDATE: institution admins/staff can update their allocations
CREATE POLICY subject_allocations_update_policy ON public.subject_allocations
    FOR UPDATE USING (
        institution_id = (SELECT institution_id FROM public.users WHERE id = auth.uid()::text LIMIT 1)
        OR (SELECT role FROM public.users WHERE id = auth.uid()::text LIMIT 1) = 'super_admin'
    );

-- DELETE: institution admins/staff can delete their allocations
CREATE POLICY subject_allocations_delete_policy ON public.subject_allocations
    FOR DELETE USING (
        institution_id = (SELECT institution_id FROM public.users WHERE id = auth.uid()::text LIMIT 1)
        OR (SELECT role FROM public.users WHERE id = auth.uid()::text LIMIT 1) = 'super_admin'
    );

-- Grant access to authenticated users
GRANT ALL ON public.subject_allocations TO authenticated;
GRANT ALL ON public.subject_allocations TO service_role;

-- Also add subject_allocations to the safe_delete_records whitelist so
-- bulk deletes (e.g. when removing a subject) work via the RPC function.
CREATE OR REPLACE FUNCTION public.safe_delete_records(
    p_table TEXT,
    p_ids TEXT[]
) RETURNS INT AS $$
DECLARE
    v_count INT := 0;
    v_allowed_tables TEXT[] := ARRAY[
        -- Core System & Users
        'users', 'institutions', 'counties', 'constituencies', 'wards', 'political_parties',
        'system_settings', 'school_registry', 'integration_logs', 'store_categories',
        -- Academics & Education
        'semesters', 'academic_years', 'academic_levels', 'subjects', 'courses',
        'departments', 'rooms', 'buildings', 'inventory', 'receipts', 'invoices',
        'tasks', 'assignments', 'allocation_requests', 'vote_heads', 'fee_structures',
        'financial_periods', 'school_remedial_sessions', 'school_remedial_rate_settings',
        'school_remedial_payouts', 'school_remedial_allocations', 'school_remedial_subjects',
        'student_enrollments', 'fee_promises', 'timetable_entries', 'exam_timetable_entries',
        'student_absence_requests', 'enrollment_requests', 'contracts', 'student_attendances',
        'lesson_ratings', 'ta_assignments', 'assessments', 'assessment_marks', 'books',
        'library_transactions', 'leave_out_requests', 'observation_notes', 'teacher_check_ins',
        'discipline_incidents', 'subject_allocations',
        -- Property Management
        'pm_listings', 'property_management_properties', 'property_management_units',
        'property_management_leases', 'pm_expenses', 'pm_notices', 'pm_utility_readings',
        'pm_inspections', 'pm_security_deposits', 'pm_refunds',
        -- Driving School & Transport
        'ds_students', 'ds_lessons', 'ds_settings', 'ds_invoices', 'ds_payments',
        'ds_instructors', 'ds_vehicles', 'ds_skill_mastery', 'ds_votes',
        'ds_license_categories', 'ds_leads', 'vehicles', 'transport_bills',
        -- Cooperative & SACCO
        'coop_farmers', 'coop_collections', 'coop_riders', 'coop_agrovet_inventory',
        'coop_agrovet_sales', 'sacco_accounts', 'sacco_transactions', 'coop_monthly_payouts',
        'coop_expenses', 'coop_income',
        -- Car Sales & Automotive
        'car_sales_listings', 'car_listings', 'car_appraisals', 'car_test_drives',
        'car_invoices', 'car_payments', 'car_sales_invoices', 'car_sales_payments',
        -- Alumnae & Events & Bursaries
        'alumnae_members', 'alumni_posts', 'alumni_comments', 'alumni_messages',
        'events', 'event_categories', 'event_participants', 'event_splits', 'event_pledges',
        'event_pins', 'institution_events', 'county_bursary_funds', 'bursary_applications',
        'ng_cdf_funds', 'ng_cdf_bursaries'
    ];
BEGIN
    IF NOT (p_table = ANY(v_allowed_tables)) THEN
        RAISE EXCEPTION 'Table "%" is not in the bulk-delete allow list.', p_table;
    END IF;

    EXECUTE format('DELETE FROM public.%I WHERE id = ANY($1)', p_table)
    USING p_ids;

    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.safe_delete_records(TEXT, TEXT[]) TO anon, authenticated, service_role;
