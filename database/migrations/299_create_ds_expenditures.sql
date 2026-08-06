--- Migration: 299_create_ds_expenditures.sql
-- Description: Create ds_expenditures table and update safe_delete_records whitelist.

CREATE TABLE IF NOT EXISTS ds_expenditures (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    description TEXT NOT NULL DEFAULT '',
    category TEXT NOT NULL DEFAULT 'Other',
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'Cash',
    reference_number TEXT,
    vehicle_id TEXT REFERENCES ds_vehicles(id) ON DELETE SET NULL,
    paid_to TEXT,
    recorded_by TEXT,
    notes TEXT,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ds_expenditures_institution ON ds_expenditures(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_expenditures_date ON ds_expenditures(expense_date);
CREATE INDEX IF NOT EXISTS idx_ds_expenditures_vehicle ON ds_expenditures(vehicle_id);

-- Enable RLS and setup policies
ALTER TABLE ds_expenditures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Institutional tenancy select: ds_expenditures" ON ds_expenditures;
CREATE POLICY "Institutional tenancy select: ds_expenditures" ON ds_expenditures FOR SELECT 
USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Institutional tenancy manage: ds_expenditures" ON ds_expenditures;
CREATE POLICY "Institutional tenancy manage: ds_expenditures" ON ds_expenditures FOR ALL 
USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

GRANT ALL ON public.ds_expenditures TO anon, authenticated, service_role;

-- Update safe_delete_records function whitelist to include 'ds_expenditures'
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
        'discipline_incidents',
        -- Property Management
        'pm_listings', 'property_management_properties', 'property_management_units',
        'property_management_leases', 'pm_expenses', 'pm_notices', 'pm_utility_readings',
        'pm_inspections', 'pm_security_deposits', 'pm_refunds',
        -- Driving School & Transport
        'ds_students', 'ds_lessons', 'ds_settings', 'ds_invoices', 'ds_payments',
        'ds_instructors', 'ds_vehicles', 'ds_skill_mastery', 'ds_votes',
        'ds_license_categories', 'ds_leads', 'ds_expenditures', 'vehicles', 'transport_bills',
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
