-- Migration: 398_ensure_transport_tables_complete.sql
-- Purpose: Complete transport and fleet registry schema: vehicles, onboarding tracking, and gate logs with robust RLS and metadata support.

-- 1. Ensure vehicles table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.vehicles (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    model TEXT,
    vehicle_type TEXT DEFAULT 'school',
    capacity INTEGER DEFAULT 14,
    driver_id TEXT,
    assistant_id TEXT,
    status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vehicles
    ADD COLUMN IF NOT EXISTS institution_id TEXT,
    ADD COLUMN IF NOT EXISTS plate_number TEXT,
    ADD COLUMN IF NOT EXISTS model TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_type TEXT DEFAULT 'school',
    ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 14,
    ADD COLUMN IF NOT EXISTS driver_id TEXT,
    ADD COLUMN IF NOT EXISTS assistant_id TEXT,
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Ensure transport_onboarding table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.transport_onboarding (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    vehicle_id TEXT,
    student_id TEXT,
    direction TEXT DEFAULT 'to_school',
    status TEXT DEFAULT 'pending',
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    parent_confirmed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transport_onboarding
    ADD COLUMN IF NOT EXISTS institution_id TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_id TEXT,
    ADD COLUMN IF NOT EXISTS student_id TEXT,
    ADD COLUMN IF NOT EXISTS direction TEXT DEFAULT 'to_school',
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS parent_confirmed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Ensure vehicle_logs table exists and has all required columns
CREATE TABLE IF NOT EXISTS public.vehicle_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    vehicle_id TEXT,
    event_type TEXT NOT NULL,
    security_id TEXT,
    notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.vehicle_logs
    ADD COLUMN IF NOT EXISTS institution_id TEXT,
    ADD COLUMN IF NOT EXISTS vehicle_id TEXT,
    ADD COLUMN IF NOT EXISTS event_type TEXT,
    ADD COLUMN IF NOT EXISTS security_id TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS timestamp TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 4. Ensure vehicle_id exists on users table for direct student assignment
ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS vehicle_id TEXT;

-- 5. Enable RLS on all transport tables
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_logs ENABLE ROW LEVEL SECURITY;

-- 6. Setup permissive RLS policies for vehicles
DROP POLICY IF EXISTS "Allow all for vehicles" ON public.vehicles;
CREATE POLICY "Allow all for vehicles" 
    ON public.vehicles FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for transport_onboarding" ON public.transport_onboarding;
CREATE POLICY "Allow all for transport_onboarding" 
    ON public.transport_onboarding FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for vehicle_logs" ON public.vehicle_logs;
CREATE POLICY "Allow all for vehicle_logs" 
    ON public.vehicle_logs FOR ALL TO anon, authenticated, service_role 
    USING (true) WITH CHECK (true);

-- 7. Grant table permissions
GRANT ALL ON TABLE public.vehicles TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.transport_onboarding TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.vehicle_logs TO anon, authenticated, service_role;

-- 8. Performance indexes
CREATE INDEX IF NOT EXISTS idx_vehicles_institution ON public.vehicles(institution_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(institution_id, plate_number);
CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst ON public.transport_onboarding(institution_id);
CREATE INDEX IF NOT EXISTS idx_transport_onboarding_vehicle ON public.transport_onboarding(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transport_onboarding_student ON public.transport_onboarding(student_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst ON public.vehicle_logs(institution_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_vehicle ON public.vehicle_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_users_vehicle_id ON public.users(vehicle_id);

-- 9. Update safe_delete_records RPC whitelist to include transport tables
CREATE OR REPLACE FUNCTION public.safe_delete_records(
    p_table TEXT,
    p_ids TEXT[]
) RETURNS INT 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
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
        -- Driving School & Transport & Fleet
        'ds_students', 'ds_lessons', 'ds_settings', 'ds_invoices', 'ds_payments',
        'ds_instructors', 'ds_vehicles', 'ds_skill_mastery', 'ds_votes',
        'ds_license_categories', 'ds_leads', 'vehicles', 'transport_bills',
        'transport_onboarding', 'vehicle_logs',
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
$$;

ALTER FUNCTION public.safe_delete_records(TEXT, TEXT[]) SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.safe_delete_records(TEXT, TEXT[]) TO anon, authenticated, service_role;
