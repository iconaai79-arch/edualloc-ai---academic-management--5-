
import {
    INITIAL_USERS, INITIAL_INSTITUTIONS, INITIAL_ACADEMIC_YEARS,
    INITIAL_SEMESTERS, INITIAL_ACADEMIC_LEVELS
} from '../constants';

const escapeSql = (str: string | null | undefined) => {
    if (str === null || str === undefined) return 'NULL';
    return `'${String(str).replace(/'/g, "''")}'`;
};

export const generateFullSqlScript = () => {
    let sql = `-- ==========================================================================\n`;
    sql += `-- EduAi Automation - Master Schema\n`;
    sql += `-- Generated on: ${new Date()?.toLocaleString()}\n`;
    sql += `-- ==========================================================================\n\n`;

    sql += `-- 1. CORE SYSTEM & TENANCY --\n`;
    sql += `
-- RLS Helper Functions (Optimized)
CREATE OR REPLACE FUNCTION public.get_curr_user_inst_id()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    RETURN (
        SELECT institution_id 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_curr_user_role()
RETURNS TEXT LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    -- Bootstrap super_admin based on common service emails
    IF (SELECT email FROM auth.users WHERE id = auth.uid()) IN ('admin@eduai.com', 'super@eduai.com', 'admin@system.com') THEN
        RETURN 'super_admin';
    END IF;

    RETURN (
        SELECT role 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

CREATE TABLE IF NOT EXISTS counties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    phone_number TEXT,
    admin_name TEXT,
    logo_url TEXT,
    letterhead_url TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location JSONB
);

CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone_number TEXT,
    institution_type TEXT,
    status TEXT DEFAULT 'trial',
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    institution_code TEXT UNIQUE,
    theme_color TEXT DEFAULT '#4f46e5',
    logo_url TEXT,
    footer_image_url TEXT,
    letterhead_config JSONB DEFAULT '{"header_image_url": null, "stamp_image_url": null}'::jsonb,
    location JSONB,
    is_in_demo_mode BOOLEAN DEFAULT FALSE,
    custom_subscription_price JSONB,
    custom_sms_price DECIMAL(10, 2),
    grading_systems JSONB DEFAULT '[]'::jsonb,
    active_grading_system_id TEXT,
    timetable_settings JSONB,
    exam_timetable_settings JSONB,
    use_allocation_requests BOOLEAN DEFAULT TRUE,
    schedule_profiles JSONB DEFAULT '[]'::jsonb,
    county_id TEXT REFERENCES counties(id) ON DELETE SET NULL,
    reseller_id TEXT REFERENCES institutions(id) ON DELETE SET NULL,
    is_otp_enabled BOOLEAN DEFAULT FALSE,
    business_sub_type TEXT,
    marketplace_enabled BOOLEAN DEFAULT FALSE,
    listing_quota INTEGER DEFAULT 0,
    kcb_config JSONB,
    slug TEXT,
    kiosk_url TEXT,
    use_subdomain BOOLEAN DEFAULT FALSE,
    custom_subdomain TEXT,
    parent_absence_notifications_enabled BOOLEAN DEFAULT FALSE,
    farmer_sms_billing_enabled BOOLEAN DEFAULT FALSE,
    ai_model_tier TEXT DEFAULT 'premium',
    google_drive_config JSONB DEFAULT '{"clientId": "", "clientSecret": "", "refreshToken": "", "isActive": false}'::jsonb,
    store_hours_enforced BOOLEAN DEFAULT FALSE,
    store_open_time TEXT DEFAULT '08:00',
    store_close_time TEXT DEFAULT '17:00',
    sms_config JSONB,
    mpesa_config JSONB,
    email_config JSONB,
    ncba_config JSONB,
    coop_config JSONB,
    coop_settings JSONB,
    stream_definitions TEXT[] DEFAULT '{}',
    custom_module_pricing JSONB,
    sms_balance INTEGER DEFAULT 0,
    visitor_auto_finalize_enabled BOOLEAN DEFAULT FALSE,
    visitor_auto_finalize_time TEXT DEFAULT '18:00',
    notify_host_on_visitor_arrival BOOLEAN DEFAULT TRUE,
    visitor_arrival_sms_template TEXT,
    kiosk_security_pin TEXT DEFAULT '1234',
    kiosk_status TEXT DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Ensure all new columns exist on institutions table for backward compatibility
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kiosk_url TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS use_subdomain BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS custom_subdomain TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS parent_absence_notifications_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS farmer_sms_billing_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ai_model_tier TEXT DEFAULT 'premium';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS google_drive_config JSONB DEFAULT '{"clientId": "", "clientSecret": "", "refreshToken": "", "isActive": false}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS store_hours_enforced BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS store_open_time TEXT DEFAULT '08:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS store_close_time TEXT DEFAULT '17:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS sms_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS mpesa_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS email_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ncba_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS coop_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS coop_settings JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS stream_definitions TEXT[] DEFAULT '{}';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS custom_module_pricing JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 0;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS visitor_auto_finalize_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS visitor_auto_finalize_time TEXT DEFAULT '18:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS notify_host_on_visitor_arrival BOOLEAN DEFAULT TRUE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS visitor_arrival_sms_template TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kiosk_security_pin TEXT DEFAULT '1234';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kiosk_status TEXT DEFAULT 'active';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY,
    data JSONB DEFAULT '{}'::jsonb NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    user_name TEXT DEFAULT 'System',
    institution_id TEXT,
    institution_name TEXT,
    action TEXT DEFAULT 'activity',
    module TEXT,
    details TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    mac_address TEXT,
    imei TEXT
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    staff_id TEXT,
    staff_name TEXT,
    month TEXT,
    basic_salary NUMERIC(12,2) DEFAULT 0.00,
    allowances JSONB DEFAULT '[]'::jsonb,
    deductions JSONB DEFAULT '[]'::jsonb,
    net_salary NUMERIC(12,2) DEFAULT 0.00,
    status TEXT DEFAULT 'paid',
    recorded_by TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    records JSONB DEFAULT '[]'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS his_expenditures (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    title TEXT,
    category TEXT,
    vendor TEXT,
    amount NUMERIC(12,2) DEFAULT 0.00,
    date DATE,
    payment_method TEXT,
    voucher_no TEXT,
    status TEXT DEFAULT 'Paid',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institution_module_states (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    module_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'inactive',
    activated_at TIMESTAMP WITH TIME ZONE,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, module_id)
);

CREATE TABLE IF NOT EXISTS commission_withdrawal_requests (
    id TEXT PRIMARY KEY,
    reseller_id TEXT NOT NULL,
    reseller_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    account_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS law_agreement_templates (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    content TEXT NOT NULL,
    base_fee NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS law_agreements (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    template_id TEXT,
    matter_id TEXT,
    client_id TEXT,
    title TEXT NOT NULL,
    party_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    final_content TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    review_status TEXT DEFAULT 'draft',
    lawyer_id TEXT,
    lawyer_notes TEXT,
    signed_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coop_expenses (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General Operating',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by TEXT NOT NULL,
    farmer_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS coop_income (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'milk',
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'kgs',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS county_inventory_categories (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS county_stores (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL,
    name TEXT NOT NULL,
    location_name TEXT,
    latitude FLOAT,
    longitude FLOAT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS county_inventory (
    id TEXT PRIMARY KEY,
    county_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT DEFAULT 'Units',
    supplier_name TEXT,
    status TEXT DEFAULT 'at_hq',
    target_institution_id TEXT,
    driver_name TEXT,
    delivery_method TEXT DEFAULT 'driver',
    tracking_number TEXT,
    qr_code TEXT,
    at_hq_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recipient_signature TEXT,
    received_by TEXT,
    recipient_name TEXT,
    dispatched_date TIMESTAMP WITH TIME ZONE,
    received_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS discipline_incidents (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT,
    student_name TEXT,
    type TEXT,
    incident_type TEXT,
    severity TEXT DEFAULT 'Medium',
    description TEXT NOT NULL,
    action_taken TEXT,
    status TEXT DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS school_registry (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    region TEXT,
    county TEXT,
    sub_county TEXT,
    uic TEXT,
    knec_code TEXT,
    cluster TEXT,
    special_need_type TEXT,
    disability_type TEXT,
    accommodation_type TEXT,
    gender_type TEXT,
    slug TEXT UNIQUE,
    institution_id TEXT, -- Link to institution if claimed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_sr_knec ON school_registry(knec_code);
CREATE INDEX IF NOT EXISTS idx_sr_slug ON school_registry(slug);

\n-- 2. ACADEMIC STRUCTURE --\n
CREATE TABLE IF NOT EXISTS academic_levels (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academic_years (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'inactive'
);

CREATE TABLE IF NOT EXISTS semesters (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year_id TEXT NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'inactive',
    request_deadline DATE,
    enrollment_deadline DATE,
    sessions JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS buildings (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    location JSONB
);

CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    building_id TEXT REFERENCES buildings(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'active',
    equipment TEXT[],
    location JSONB,
    short_name TEXT,
    is_shared BOOLEAN DEFAULT FALSE,
    concurrent_sessions INTEGER DEFAULT 1
);
\n-- 3. USER MANAGEMENT --\n
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    staff_id TEXT,
    role TEXT NOT NULL,
    roles TEXT[] DEFAULT '{}',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    password TEXT,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    expertise TEXT[],
    course_id TEXT,
    course_level_id TEXT,
    enrolled_subject_ids TEXT[] DEFAULT '{}',
    parent_ids TEXT[] DEFAULT '{}',
    student_ids TEXT[] DEFAULT '{}',
    gender TEXT,
    profile_photo_url TEXT,
    unavailability JSONB DEFAULT '[]'::jsonb,
    password_last_updated TIMESTAMP WITH TIME ZONE,
    password_expires_at TIMESTAMP WITH TIME ZONE
);
\n-- 4. CURRICULUM & SCHEDULING --\n
CREATE TABLE IF NOT EXISTS courses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    department_id TEXT REFERENCES departments(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    academic_level_id TEXT REFERENCES academic_levels(id) ON DELETE SET NULL,
    short_name TEXT,
    curriculum_type TEXT DEFAULT '8-4-4',
    schedule_profile_id TEXT,
    levels JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS synergy_posts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
    course_level_id TEXT,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    author_photo_url TEXT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    photo_url TEXT,
    video_url TEXT,
    likes TEXT[] DEFAULT '{}',
    comments_count INTEGER DEFAULT 0,
    student_ids TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS synergy_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES synergy_posts(id) ON DELETE CASCADE,
    author_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL,
    author_photo_url TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS synergy_messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    child_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    department_id TEXT NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    lesson_structure JSONB NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE,
    has_exam BOOLEAN DEFAULT TRUE,
    dedicated_room_id TEXT REFERENCES rooms(id) ON DELETE SET NULL,
    short_name TEXT,
    target_course_level_id TEXT
);

CREATE TABLE IF NOT EXISTS allocation_requests (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    priority TEXT DEFAULT 'Medium',
    justification TEXT,
    academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL,
    semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    preferences JSONB,
    signature_url TEXT,
    course_level_ids TEXT[] DEFAULT '{}',
    course_level_selections JSONB DEFAULT '{}'::jsonb,
    subject_ids TEXT[] DEFAULT '{}',
    proposed_changes JSONB
);

CREATE TABLE IF NOT EXISTS timetable_entries (
    id TEXT PRIMARY KEY,
    day TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL,
    semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    course_level_id TEXT,
    attendance_status TEXT DEFAULT 'present',
    shared_with_practice_teacher_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    is_conflicting BOOLEAN DEFAULT FALSE,
    duration INTEGER
);

CREATE TABLE IF NOT EXISTS exam_timetable_entries (
    id TEXT PRIMARY KEY,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    course_level_id TEXT NOT NULL,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    invigilator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    academic_year_id TEXT REFERENCES academic_years(id) ON DELETE SET NULL,
    semester_id TEXT REFERENCES semesters(id) ON DELETE SET NULL
);
\n-- 5. ACADEMIC DELIVERY (ASSIGNMENTS, GRADES, ATTENDANCE) --\n
CREATE TABLE IF NOT EXISTS assignments (
    id TEXT PRIMARY KEY,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_data_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    due_date DATE NOT NULL,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assignment_extension_requests (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    file_data_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    due_date DATE NOT NULL,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS submissions (
    id TEXT PRIMARY KEY,
    assignment_id TEXT NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_data_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'submitted',
    grade TEXT,
    feedback TEXT,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS assessments (
    id TEXT PRIMARY KEY,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    description TEXT,
    max_marks INTEGER NOT NULL DEFAULT 100,
    assessment_date DATE NOT NULL,
    status TEXT DEFAULT 'Draft',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS assessment_marks (
    id TEXT PRIMARY KEY,
    assessment_id TEXT NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    marks DECIMAL(5,2),
    comments TEXT,
    graded_by TEXT REFERENCES users(id),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS student_attendances (
    id TEXT PRIMARY KEY,
    timetable_entry_id TEXT NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    status TEXT NOT NULL,
    marked_by TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enrollment_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    signature_url TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ta_assignments (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ta_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL,
    semester_id TEXT NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    academic_year_id TEXT NOT NULL,
    semester_id TEXT NOT NULL,
    content TEXT NOT NULL,
    workload_summary JSONB NOT NULL,
    status TEXT DEFAULT 'pending',
    issue_date DATE NOT NULL,
    acceptance_timestamp TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    signature_url TEXT
);

CREATE TABLE IF NOT EXISTS internships (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecturer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    industry_name TEXT NOT NULL,
    industry_location TEXT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    report TEXT,
    status TEXT DEFAULT 'ongoing',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);
\n-- 6. FINANCE & BILLING --\n
CREATE TABLE IF NOT EXISTS vote_heads (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    allocated_amount DECIMAL(15, 2) DEFAULT 0,
    amount_spent DECIMAL(15, 2) DEFAULT 0,
    academic_year_id TEXT,
    priority INTEGER,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_periods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'inactive',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fee_structures (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    academic_year_id TEXT,
    term TEXT,
    course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
    vote_head_id TEXT REFERENCES vote_heads(id) ON DELETE SET NULL,
    priority INTEGER,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    applicable_to TEXT DEFAULT 'all',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id TEXT PRIMARY KEY,
    transaction_id TEXT UNIQUE NOT NULL,
    checkout_request_id TEXT UNIQUE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    phone_number TEXT NOT NULL,
    payer_name TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT NOT NULL,
    metadata JSONB,
    provider TEXT,
    request_id TEXT,
    channel_code TEXT,
    currency TEXT,
    customer_reference TEXT,
    customer_name TEXT,
    customer_mobile_number TEXT,
    balance DECIMAL(12, 2),
    narration TEXT,
    credit_account_identifier TEXT,
    till_number TEXT
);

CREATE TABLE IF NOT EXISTS integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider TEXT NOT NULL,
    payload JSONB,
    status TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE IF NOT EXISTS institution_extension_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    requester_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by TEXT
);

CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL,
    student_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    class_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS receipts (
    id TEXT PRIMARY KEY,
    receipt_number TEXT NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    paid_for TEXT,
    payment_method TEXT,
    related_transaction_id TEXT,
    invoice_id TEXT REFERENCES invoices(id) ON DELETE SET NULL,
    student_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS fee_goods_proposals (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    quantity DECIMAL(12, 2) NOT NULL,
    unit TEXT NOT NULL,
    unit_value DECIMAL(12, 2) NOT NULL,
    total_value DECIMAL(12, 2) NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS platform_expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    category TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT REFERENCES institutions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_enrollments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enrollment_type TEXT NOT NULL,
    admission_number TEXT,
    assessment_no TEXT,
    date_of_birth DATE,
    status TEXT DEFAULT 'Enrolled',
    enrollment_date TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL,
    reference TEXT NOT NULL,
    sender_name TEXT,
    bank_name TEXT,
    status TEXT NOT NULL DEFAULT 'unreconciled',
    linked_invoice_id TEXT,
    reconciled_at TIMESTAMP WITH TIME ZONE,
    reconciled_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    payload JSONB
);

CREATE TABLE IF NOT EXISTS bursary_disbursements (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    donor_name TEXT,
    cheque_number TEXT,
    bank_name TEXT,
    cheque_date TEXT,
    total_amount DECIMAL(12, 2) DEFAULT 0.0,
    allocated_amount DECIMAL(12, 2) DEFAULT 0.0,
    allocations JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    bank_account_id TEXT,
    posted_by TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS store_categories (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    icon TEXT,
    color TEXT,
    description TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS broadcaster_messages (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    channel TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    recipients_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS institution_events (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    event_date TEXT NOT NULL,
    event_time TEXT NOT NULL,
    venue TEXT NOT NULL,
    target TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_pins (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    event_id TEXT NOT NULL REFERENCES institution_events(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pin TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    guests TEXT,
    vehicle_registration TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
\n-- 7. OPERATIONS (STORE, LIBRARY, SECURITY) --\n
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    quantity INTEGER DEFAULT 0,
    unit TEXT,
    reorder_level INTEGER DEFAULT 10,
    location TEXT,
    item_type TEXT,
    expiry_date DATE,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stock_transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    recipient_or_supplier TEXT,
    recipient_id TEXT,
    signature TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    recorded_by TEXT REFERENCES users(id),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    verification_method TEXT
);

CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    category TEXT,
    status TEXT DEFAULT 'Active',
    rating INTEGER DEFAULT 5,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    supplied_items JSONB DEFAULT '[]'::jsonb,
    documents JSONB DEFAULT '[]'::jsonb,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS requisitions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    requested_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    requested_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    items JSONB NOT NULL,
    total_estimated_cost DECIMAL(15, 2),
    status TEXT DEFAULT 'pending_approval',
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    lpo_number TEXT,
    rejection_reason TEXT,
    supplier_response TEXT,
    delivery_eta DATE
);

CREATE TABLE IF NOT EXISTS procurement_suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    kra_pin TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    bank_name TEXT,
    bank_account TEXT,
    bank_branch TEXT,
    rating INTEGER DEFAULT 5,
    category TEXT,
    outstanding_balance DECIMAL(15, 2) DEFAULT 0,
    total_purchases DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    tender_ref TEXT,
    tender_category_no TEXT,
    is_agpo BOOLEAN DEFAULT FALSE,
    agpo_category TEXT DEFAULT 'none',
    agpo_cert_number TEXT,
    tax_compliance_cert TEXT,
    business_permit_no TEXT,
    nca_reg_no TEXT,
    credit_period_days INTEGER DEFAULT 30,
    annual_turnover DECIMAL(15, 2) DEFAULT 0,
    tender_fee_paid BOOLEAN DEFAULT FALSE,
    tender_fee_receipt_no TEXT,
    prequalification_score DECIMAL(5, 2) DEFAULT 0,
    prequalification_status TEXT DEFAULT 'pending',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT DEFAULT 'Units',
    unit_cost DECIMAL(15, 2) DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    current_stock INTEGER DEFAULT 0,
    description TEXT,
    item_code TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_lpos (
    id TEXT PRIMARY KEY,
    lpo_number TEXT NOT NULL,
    supplier_id TEXT REFERENCES procurement_suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    requisition_id TEXT,
    vote_head TEXT,
    tender_category_no TEXT,
    tender_ref TEXT,
    issued_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_address TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    approved_by TEXT,
    created_by TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS procurement_invoices (
    id TEXT PRIMARY KEY,
    lpo_id TEXT REFERENCES procurement_lpos(id) ON DELETE SET NULL,
    lpo_number TEXT,
    supplier_id TEXT REFERENCES procurement_suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    invoice_number TEXT NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    vote_head TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    withholding_tax_rate DECIMAL(5, 2) DEFAULT 0,
    withholding_tax_amount DECIMAL(15, 2) DEFAULT 0,
    withholding_vat_amount DECIMAL(15, 2) DEFAULT 0,
    net_payable_amount DECIMAL(15, 2) DEFAULT 0,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'unpaid',
    payment_method TEXT,
    payment_reference TEXT,
    payment_date DATE,
    notes TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ─────────────────────────────────────────────────────────────
-- DRIVING SCHOOL AUTOMATION MODULE (DS)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ds_leads (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    license_type_interested TEXT,
    license_category TEXT,
    source TEXT DEFAULT 'Walk-in',
    status TEXT DEFAULT 'New Enquiry',
    quoted_amount DECIMAL(12, 2) DEFAULT 0,
    fee_structure_id TEXT,
    broadcast_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_leads_institution_id ON public.ds_leads(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_leads_inst_id_composite ON public.ds_leads(institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_ds_leads_inst_created ON public.ds_leads(institution_id, created_at DESC);

CREATE TABLE IF NOT EXISTS ds_instructors (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    license_number TEXT,
    specialization TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_instructors_institution_id ON public.ds_instructors(institution_id);

CREATE TABLE IF NOT EXISTS ds_vehicles (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    registration_number TEXT NOT NULL,
    model TEXT,
    transmission TEXT DEFAULT 'Manual',
    status TEXT DEFAULT 'Active',
    assigned_instructor_id TEXT REFERENCES ds_instructors(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_vehicles_institution_id ON public.ds_vehicles(institution_id);

CREATE TABLE IF NOT EXISTS ds_students (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    admission_number TEXT,
    phone TEXT NOT NULL,
    email TEXT,
    national_id TEXT,
    course_type TEXT,
    assigned_instructor_id TEXT REFERENCES ds_instructors(id) ON DELETE SET NULL,
    assigned_vehicle_id TEXT REFERENCES ds_vehicles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active',
    total_fee DECIMAL(12, 2) DEFAULT 0,
    paid_fee DECIMAL(12, 2) DEFAULT 0,
    balance DECIMAL(12, 2) DEFAULT 0,
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_students_institution_id ON public.ds_students(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_students_inst_id_composite ON public.ds_students(institution_id, id DESC);

CREATE TABLE IF NOT EXISTS ds_lessons (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    instructor_id TEXT REFERENCES ds_instructors(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES ds_vehicles(id) ON DELETE SET NULL,
    lesson_date DATE NOT NULL,
    start_time TEXT,
    end_time TEXT,
    lesson_type TEXT DEFAULT 'Practical',
    status TEXT DEFAULT 'Scheduled',
    check_in_time TEXT,
    check_out_time TEXT,
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    session_phase TEXT DEFAULT 'completed',
    attendance_logs JSONB DEFAULT '[]'::jsonb,
    reminder_sent BOOLEAN DEFAULT false,
    checkout_reminder_sent BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_lessons_institution_id ON public.ds_lessons(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_inst_id_composite ON public.ds_lessons(institution_id, id DESC);

CREATE TABLE IF NOT EXISTS ds_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    amount DECIMAL(12, 2) DEFAULT 0,
    amount_paid DECIMAL(12, 2) DEFAULT 0,
    balance DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'Unpaid',
    due_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_invoices_institution_id ON public.ds_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_id_composite ON public.ds_invoices(institution_id, id DESC);

CREATE TABLE IF NOT EXISTS ds_payments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    invoice_id TEXT REFERENCES ds_invoices(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT DEFAULT 'M-Pesa',
    transaction_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_payments_institution_id ON public.ds_payments(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_id_composite ON public.ds_payments(institution_id, id DESC);

CREATE TABLE IF NOT EXISTS ds_expenditures (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    expense_date DATE DEFAULT CURRENT_DATE,
    recorded_by TEXT,
    payment_method TEXT DEFAULT 'Cash',
    receipt_reference TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_expenditures_institution_id ON public.ds_expenditures(institution_id);
CREATE INDEX IF NOT EXISTS idx_ds_expenditures_inst_id_composite ON public.ds_expenditures(institution_id, id DESC);

CREATE TABLE IF NOT EXISTS ds_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    settings JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ds_votes (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    vote_name TEXT NOT NULL,
    default_amount DECIMAL(12, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ds_license_categories (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    category_code TEXT NOT NULL,
    category_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
    accession_number TEXT,
    quantity INTEGER DEFAULT 1,
    available INTEGER DEFAULT 1,
    category TEXT,
    location TEXT,
    added_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS library_transactions (
    id TEXT PRIMARY KEY,
    book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    admission_number TEXT,
    user_name TEXT,
    student_name TEXT,
    class_level TEXT,
    stream TEXT,
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'issued',
    fine_amount DECIMAL(10,2) DEFAULT 0,
    member_signature TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS library_fines (
    id TEXT PRIMARY KEY,
    transaction_id TEXT REFERENCES library_transactions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    status TEXT DEFAULT 'pending',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_reservations (
    id TEXT PRIMARY KEY,
    book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    reservation_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expiry_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'pending',
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS book_stock_receipts (
    id TEXT PRIMARY KEY,
    book_id TEXT REFERENCES books(id) ON DELETE CASCADE,
    source TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    receipt_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    batch_number TEXT,
    notes TEXT,
    recorded_by TEXT REFERENCES users(id),
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS library_settings (
    institution_id TEXT PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    overdue_fine_per_day DECIMAL(10,2) DEFAULT 0,
    max_books_per_user INTEGER DEFAULT 3,
    reservation_expiry_days INTEGER DEFAULT 3,
    default_lending_period_days INTEGER DEFAULT 14,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE OR REPLACE VIEW v_library_statistics 
WITH (security_invoker = true) AS
SELECT 
    institution_id,
    COUNT(id) as total_books,
    SUM(quantity) as total_copies,
    SUM(available) as available_copies,
    (SELECT COUNT(*) FROM library_transactions WHERE status = 'issued' AND institution_id = b.institution_id) as active_loans,
    (SELECT COUNT(*) FROM library_transactions WHERE status = 'overdue' AND institution_id = b.institution_id) as overdue_loans,
    (SELECT COUNT(*) FROM book_reservations WHERE status = 'pending' AND institution_id = b.institution_id) as pending_reservations
FROM books b
GROUP BY institution_id;

CREATE TABLE IF NOT EXISTS security_alerts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_by TEXT NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'active',
    target_id TEXT NOT NULL,
    target_name TEXT NOT NULL,
    target_role TEXT,
    type TEXT NOT NULL,
    severity TEXT NOT NULL,
    description TEXT
);

CREATE TABLE IF NOT EXISTS visitors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone_number TEXT,
    id_number TEXT,
    purpose TEXT,
    visit_date DATE NOT NULL,
    time_in TEXT,
    time_out TEXT,
    host_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    vehicle_plate TEXT,
    vehicle_model TEXT,
    visitor_signature TEXT,
    host_signature TEXT,
    security_officer_name TEXT
);

CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    host_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    host_name TEXT,
    guest_name TEXT NOT NULL,
    guest_email TEXT,
    guest_phone TEXT,
    date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    purpose TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_complete BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE
);
\n-- 8. FEEDBACK, ABSENCES, LEAVE & EXTENSIONS --\n
CREATE TABLE IF NOT EXISTS feedback_submissions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'new',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS lesson_ratings (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    timetable_entry_id TEXT NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_absence_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN DEFAULT TRUE,
    start_time TEXT,
    end_time TEXT,
    reason TEXT,
    supporting_document_url TEXT,
    status TEXT DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS absence_requests (
    id TEXT PRIMARY KEY,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    timetable_entry_id TEXT NOT NULL REFERENCES timetable_entries(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS time_off_requests (
    id TEXT PRIMARY KEY,
    lecturer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_full_day BOOLEAN DEFAULT TRUE,
    start_time TIME,
    end_time TIME,
    reason TEXT,
    supporting_document_url TEXT,
    status TEXT DEFAULT 'pending',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS bulletin_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS document_collections (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    owner_id TEXT,
    owner_phone TEXT,
    status TEXT DEFAULT 'Pending',
    dropped_off_by TEXT NOT NULL,
    dropped_off_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    collected_date TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS watchlist_records (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone_number TEXT,
    id_number TEXT,
    reason TEXT NOT NULL,
    severity TEXT NOT NULL,
    added_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS maintenance_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    priority TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    reported_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teacher_check_ins (
    id TEXT PRIMARY KEY,
    teacher_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    morning_check_in_time TEXT,
    morning_check_in_status TEXT DEFAULT 'Pending',
    morning_location TEXT,
    morning_notes TEXT,
    afternoon_check_in_time TEXT,
    afternoon_check_in_status TEXT DEFAULT 'Pending',
    afternoon_location TEXT,
    afternoon_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for Core Academic & Operational Tables
ALTER TABLE IF EXISTS institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS counties ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS academic_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS semesters ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS allocation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS exam_timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assignment_extension_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS assessment_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS enrollment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS ta_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS vote_heads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mpesa_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS institution_extension_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS books ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS library_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS library_fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS book_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS book_stock_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS library_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS feedback_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS lesson_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS student_absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS absence_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS time_off_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS bulletin_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS document_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS watchlist_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS maintenance_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS teacher_check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS platform_expenses ENABLE ROW LEVEL SECURITY;

-- 9. CAR WASH BUSINESS MODULE --
CREATE TABLE IF NOT EXISTS carwash_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pricing JSONB NOT NULL,
    estimated_duration_minutes INTEGER,
    color_accent TEXT,
    is_interior_only BOOLEAN DEFAULT FALSE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    total_washes INTEGER DEFAULT 0,
    loyalty_stamps INTEGER DEFAULT 0,
    last_wash_at TIMESTAMP WITH TIME ZONE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES carwash_customers(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL,
    make TEXT,
    model TEXT,
    color TEXT,
    vehicle_type TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_jobs (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES carwash_customers(id) ON DELETE SET NULL,
    vehicle_plate TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    package_id TEXT REFERENCES carwash_packages(id) ON DELETE SET NULL,
    package_name TEXT,
    add_ons TEXT[],
    attendant_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    attendant_name TEXT,
    bay_number INTEGER,
    status TEXT DEFAULT 'queued',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    amount_charged DECIMAL(12, 2),
    amount_paid DECIMAL(12, 2),
    payment_method TEXT,
    is_loyalty_redemption BOOLEAN DEFAULT FALSE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    current_stock INTEGER DEFAULT 0,
    unit TEXT,
    reorder_level INTEGER DEFAULT 10,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_feedback (
    id TEXT PRIMARY KEY,
    job_id TEXT REFERENCES carwash_jobs(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    customer_id TEXT REFERENCES carwash_customers(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_shifts (
    id TEXT PRIMARY KEY,
    attendant_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    total_jobs INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AGROVET BUSINESS MODULE --
CREATE TABLE IF NOT EXISTS agrovet_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    unit_type TEXT NOT NULL,
    reorder_level INTEGER DEFAULT 10,
    current_stock INTEGER DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_batches (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES agrovet_products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    quantity INTEGER DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    location TEXT,
    farm_type TEXT,
    loyalty_points INTEGER DEFAULT 0,
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_animals (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES agrovet_customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT,
    breed TEXT,
    age TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_sales (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES agrovet_customers(id) ON DELETE SET NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_consultations (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES agrovet_customers(id) ON DELETE CASCADE,
    vet_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    clinical_notes TEXT,
    diagnosis TEXT,
    prescription TEXT,
    fee DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'completed',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_credit (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES agrovet_customers(id) ON DELETE CASCADE,
    total_owed DECIMAL(12, 2) DEFAULT 0,
    total_paid DECIMAL(12, 2) DEFAULT 0,
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. PROPERTY MANAGEMENT (RENT COLLECTION) MODULE --
CREATE TABLE IF NOT EXISTS pm_properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    town TEXT,
    property_type TEXT NOT NULL,
    total_units INTEGER DEFAULT 0,
    landlord_id TEXT,
    commission_rate DECIMAL(5, 2) DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_units (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES pm_properties(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    unit_type TEXT NOT NULL,
    floor_number INTEGER,
    rent_amount DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'Vacant',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    id_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_listings (
    id TEXT PRIMARY KEY,
    property_id TEXT NOT NULL REFERENCES pm_properties(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES pm_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price DECIMAL(15, 2) NOT NULL,
    listing_type TEXT NOT NULL DEFAULT 'Sale',
    status TEXT NOT NULL DEFAULT 'Draft',
    images TEXT[] DEFAULT '{}',
    features TEXT[] DEFAULT '{}',
    is_promoted BOOLEAN DEFAULT FALSE,
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_inquiries (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    listing_id TEXT REFERENCES pm_listings(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    inquiry_date DATE, 
    message TEXT,
    status TEXT NOT NULL DEFAULT 'New',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pm_leases (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES pm_units(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES pm_tenants(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    rent_amount DECIMAL(12, 2) NOT NULL,
    deposit_amount DECIMAL(12, 2) DEFAULT 0,
    billing_cycle TEXT DEFAULT 'Monthly',
    status TEXT DEFAULT 'Active',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_payments (
    id TEXT PRIMARY KEY,
    lease_id TEXT REFERENCES pm_leases(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_method TEXT NOT NULL,
    payment_type TEXT NOT NULL,
    period_month INTEGER,
    period_year INTEGER,
    status TEXT DEFAULT 'Completed',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_maintenance (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES pm_properties(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES pm_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium',
    status TEXT DEFAULT 'Open',
    assigned_to TEXT,
    cost DECIMAL(12, 2) DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS for PM tables
ALTER TABLE pm_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_maintenance ENABLE ROW LEVEL SECURITY;

-- Standard PM Policies
DROP POLICY IF EXISTS "Public can view published listings" ON pm_listings;
CREATE POLICY "Public can view published listings" ON pm_listings FOR SELECT USING (status = 'Published');

DROP POLICY IF EXISTS "Allow anonymous inquiries" ON pm_inquiries;
CREATE POLICY "Allow anonymous inquiries" ON pm_inquiries FOR INSERT WITH CHECK (
    institution_id IS NOT NULL 
    AND (public.get_curr_user_inst_id() IS NULL OR institution_id = public.get_curr_user_inst_id())
);

DROP POLICY IF EXISTS "Institutional tenancy select: pm_inquiries" ON pm_inquiries;
CREATE POLICY "Institutional tenancy select: pm_inquiries" ON pm_inquiries FOR SELECT USING (
    (public.get_curr_user_role() = 'super_admin') 
    OR (institution_id::text = public.get_curr_user_inst_id())
);

DROP POLICY IF EXISTS "Institutional tenancy manage: pm_inquiries" ON pm_inquiries;
CREATE POLICY "Institutional tenancy manage: pm_inquiries" ON pm_inquiries FOR ALL USING (
    (public.get_curr_user_role() = 'super_admin') 
    OR (
        institution_id::text = public.get_curr_user_inst_id()
        AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'property_admin', 'field_agent')
    )
);

-- Standard Carwash RLS
ALTER TABLE carwash_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_shifts ENABLE ROW LEVEL SECURITY;

-- Standard Carwash Policies (Institutional Tenancy)
DO $policy$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['carwash_packages', 'carwash_customers', 'carwash_vehicles', 'carwash_jobs', 'carwash_inventory', 'carwash_feedback', 'carwash_shifts']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %%I" ON %%I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy select: %%I" ON %%I FOR SELECT USING (
            (public.get_curr_user_role() = ''super_admin'') 
            OR (institution_id::text = public.get_curr_user_inst_id())
        )', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %%I" ON %%I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy manage: %%I" ON %%I FOR ALL USING (
            (public.get_curr_user_role() = ''super_admin'') 
            OR (
                institution_id::text = public.get_curr_user_inst_id()
                AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''carwash_admin'', ''carwash_attendant'')
            )
        )', t, t);
    END LOOP;
END $policy$;

-- Standard Agrovet RLS
ALTER TABLE agrovet_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_credit ENABLE ROW LEVEL SECURITY;

-- Standard Agrovet Policies (Institutional Tenancy)
DO $policy$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['agrovet_products', 'agrovet_batches', 'agrovet_customers', 'agrovet_animals', 'agrovet_sales', 'agrovet_consultations', 'agrovet_credit']) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %%I" ON %%I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy select: %%I" ON %%I FOR SELECT USING (
            (public.get_curr_user_role() = ''super_admin'') 
            OR (institution_id::text = public.get_curr_user_inst_id())
        )', t, t);

        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %%I" ON %%I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy manage: %%I" ON %%I FOR ALL USING (
            (public.get_curr_user_role() = ''super_admin'') 
            OR (
                institution_id::text = public.get_curr_user_inst_id()
                AND public.get_curr_user_role() IN (''admin'', ''head_teacher'', ''agrovet_admin'', ''vet'')
            )
        )', t, t);
    END LOOP;
END $policy$;

-- Standard Cafe RLS
ALTER TABLE cafe_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Institutional tenancy select: cafe_orders" ON cafe_orders;
CREATE POLICY "Institutional tenancy select: cafe_orders" ON cafe_orders FOR SELECT USING (
    (public.get_curr_user_role() = 'super_admin') 
    OR (institution_id::text = public.get_curr_user_inst_id())
);
DROP POLICY IF EXISTS "Institutional tenancy manage: cafe_orders" ON cafe_orders;
CREATE POLICY "Institutional tenancy manage: cafe_orders" ON cafe_orders FOR ALL USING (
    (public.get_curr_user_role() = 'super_admin') 
    OR (
        institution_id::text = public.get_curr_user_inst_id()
        AND public.get_curr_user_role() IN ('admin', 'head_teacher', 'chef', 'waiter')
    )
);

-- 12. HEALTH INFORMATION SYSTEM (HIS) MODULE
CREATE TABLE IF NOT EXISTS his_staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    specialty TEXT,
    status TEXT DEFAULT 'Available',
    contact TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_patients (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    dob DATE,
    gender TEXT,
    blood_group VARCHAR(10),
    allergies TEXT[],
    chronic_conditions TEXT[],
    surgical_history TEXT,
    sha_number VARCHAR(100),
    member_verification_status VARCHAR(50) DEFAULT 'Pending',
    emergency_contact_name VARCHAR(255),
    emergency_contact_phone VARCHAR(50),
    preferred_language VARCHAR(50),
    insurance_provider VARCHAR(255),
    insurance_policy_number VARCHAR(100),
    contact TEXT,
    admission_number TEXT,
    patient_number TEXT,
    custom_patient_id TEXT,
    op_number TEXT,
    grade_level TEXT,
    stream TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_wards (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ward_type VARCHAR(50) NOT NULL,
    capacity INTEGER NOT NULL,
    floor_level INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_beds (
    id TEXT PRIMARY KEY,
    ward_id TEXT REFERENCES his_wards(id) ON DELETE CASCADE,
    bed_number VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'Vacant',
    is_smart_bed BOOLEAN DEFAULT FALSE,
    current_patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_admissions (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    bed_id TEXT REFERENCES his_beds(id) ON DELETE SET NULL,
    admitted_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discharge_date TIMESTAMP WITH TIME ZONE,
    reason_for_admission TEXT,
    admission_status VARCHAR(50) DEFAULT 'Active',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_inpatient_records (
    id TEXT PRIMARY KEY,
    ward_id TEXT REFERENCES his_wards(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    bed_number VARCHAR(50) NOT NULL,
    admission_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    discharge_date TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Admitted',
    diagnosis TEXT,
    attending_doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_appointments (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    doctor_id TEXT REFERENCES his_staff(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    time TEXT NOT NULL,
    status TEXT DEFAULT 'Scheduled',
    type TEXT,
    reason TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_queue_calls (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT,
    patient_name TEXT,
    doctor_id TEXT,
    doctor_name TEXT,
    room_no TEXT DEFAULT 'Waiting Area',
    token_no TEXT,
    ticket_no TEXT,
    priority TEXT DEFAULT 'Routine',
    wait_mins INTEGER DEFAULT 0,
    complaint TEXT,
    status TEXT DEFAULT 'Waiting',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_inventory (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    unit_price DECIMAL(10,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    sku TEXT,
    is_narcotic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_batches (
    id TEXT PRIMARY KEY,
    medication_id TEXT REFERENCES his_pharmacy_inventory(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    supplier_info TEXT,
    received_date DATE DEFAULT CURRENT_DATE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_interactions (
    id TEXT PRIMARY KEY,
    drug_a TEXT NOT NULL,
    drug_b TEXT NOT NULL,
    severity VARCHAR(50) DEFAULT 'Moderate',
    description TEXT,
    recommendation TEXT,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_sales (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    customer_name TEXT,
    customer_phone TEXT,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    payment_status TEXT DEFAULT 'Paid',
    staff_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES his_pharmacy_sales(id) ON DELETE CASCADE,
    medication_id TEXT REFERENCES his_pharmacy_inventory(id) ON DELETE SET NULL,
    batch_id TEXT REFERENCES his_pharmacy_batches(id) ON DELETE SET NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_ledger (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('Income', 'Expense')),
    category TEXT,
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    reference_id TEXT,
    description TEXT,
    recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_staff (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'Pharmacist',
    specialization TEXT,
    license_number TEXT,
    salary DECIMAL(12,2) DEFAULT 0,
    hire_date DATE DEFAULT CURRENT_DATE,
    shift_preference TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_adherence_alerts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES his_patients(id) ON DELETE CASCADE,
    reminder_time TIME,
    frequency TEXT DEFAULT 'Daily',
    status TEXT DEFAULT 'active',
    last_sent_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    tax_rate DECIMAL(5,2) DEFAULT 0,
    enable_fefo BOOLEAN DEFAULT TRUE,
    low_stock_threshold INTEGER DEFAULT 10,
    currency TEXT DEFAULT 'KES',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_narcotics_ledger (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    drug_id TEXT REFERENCES his_pharmacy_inventory(id) ON DELETE SET NULL,
    drug_name TEXT NOT NULL,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    prescription_id TEXT,
    quantity_dispensed INTEGER NOT NULL DEFAULT 1,
    dispensed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    witness_name TEXT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_prescriptions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES his_patients(id) ON DELETE CASCADE,
    doctor_id TEXT,
    doctor_name TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    clinical_notes TEXT,
    attached_files TEXT[],
    medication_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_prescription_items (
    id TEXT PRIMARY KEY,
    prescription_id TEXT REFERENCES his_prescriptions(id) ON DELETE CASCADE,
    drug_id TEXT REFERENCES his_pharmacy_inventory(id) ON DELETE SET NULL,
    drug_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    duration TEXT,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) DEFAULT 0,
    instructions TEXT
);

CREATE TABLE IF NOT EXISTS his_billing_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES his_patients(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL,
    source_id TEXT,
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    invoice_number TEXT NOT NULL,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Unpaid',
    payment_method TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_claims (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    provider_id TEXT,
    claim_number TEXT,
    amount DECIMAL(12,2) DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    pre_auth_code TEXT,
    notes TEXT,
    submitted_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_insurance_providers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    coverage_details JSONB,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_insurance_remittances (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    provider_id TEXT,
    claim_id TEXT,
    remittance_number TEXT,
    amount_claimed DECIMAL(12,2) DEFAULT 0,
    amount_approved DECIMAL(12,2) DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    disallowed_amount DECIMAL(12,2) DEFAULT 0,
    disallowed_reason TEXT,
    payment_reference TEXT,
    payment_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'Completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_expenditures (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    description TEXT,
    payment_method TEXT DEFAULT 'Cash',
    reference_no TEXT,
    recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'Paid',
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_nurse_tasks (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    nurse_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    task_name TEXT NOT NULL,
    task_type TEXT,
    scheduled_time TIMESTAMP WITH TIME ZONE,
    completed_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Routine',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_lab_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    test_type TEXT NOT NULL,
    clinical_indication TEXT,
    priority TEXT DEFAULT 'Routine',
    sample_type TEXT,
    status TEXT DEFAULT 'Requested',
    results JSONB,
    technician_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_medical_notes (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    doctor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    diagnosis TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_vital_statistics (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    blood_pressure TEXT,
    heart_rate INTEGER,
    temperature DECIMAL(4,1),
    respiratory_rate INTEGER,
    oxygen_saturation DECIMAL(4,1),
    weight DECIMAL(5,2),
    height DECIMAL(5,2),
    bmi DECIMAL(4,1),
    recorded_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_clinical_events (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'Normal',
    performed_by TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_staff_attendance (
    id TEXT PRIMARY KEY,
    staff_id TEXT REFERENCES his_staff(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIMESTAMP WITH TIME ZONE,
    check_out TIMESTAMP WITH TIME ZONE,
    status TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT,
    staff_id TEXT,
    student_id TEXT,
    applicant_name TEXT,
    leave_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days INTEGER DEFAULT 1,
    reason TEXT,
    status TEXT DEFAULT 'Pending',
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS financial_goals (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    target_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    current_amount NUMERIC(15,2) DEFAULT 0.00,
    deadline DATE,
    category TEXT DEFAULT 'General',
    status TEXT DEFAULT 'In Progress',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS mpesa_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    receipt_no TEXT NOT NULL,
    phone_number TEXT,
    account_reference TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Completed',
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS airtel_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    receipt_no TEXT NOT NULL,
    phone_number TEXT,
    account_reference TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Completed',
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS intasend_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    tracking_id TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    account_reference TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Completed',
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ncba_transactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    reference_no TEXT NOT NULL,
    account_number TEXT,
    amount NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT DEFAULT 'Completed',
    raw_payload JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_dental_charts (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    tooth_number INTEGER NOT NULL,
    procedure_code VARCHAR(50),
    condition_notes TEXT,
    image_url TEXT,
    created_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_eye_prescriptions (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    visit_id TEXT,
    od_sphere DECIMAL(5,2),
    od_cylinder DECIMAL(5,2),
    od_axis INTEGER,
    od_add DECIMAL(5,2),
    od_acuity_visual VARCHAR(20),
    os_sphere DECIMAL(5,2),
    os_cylinder DECIMAL(5,2),
    os_axis INTEGER,
    os_add DECIMAL(5,2),
    os_acuity_visual VARCHAR(20),
    lens_type VARCHAR(100),
    frame_specifications TEXT,
    prescribed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    prescribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_medication_logs (
    id TEXT PRIMARY KEY,
    admission_id TEXT REFERENCES his_admissions(id) ON DELETE CASCADE,
    medication_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100),
    route VARCHAR(100),
    frequency VARCHAR(100),
    administered_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    scheduled_at TIMESTAMP WITH TIME ZONE,
    administered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(50) DEFAULT 'Administered',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS his_financial_records (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    patient_name TEXT,
    invoice_number TEXT,
    type TEXT DEFAULT 'invoice',
    category TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) DEFAULT 0,
    amount_paid DECIMAL(15,2) DEFAULT 0,
    balance DECIMAL(15,2) DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    payment_method TEXT,
    department TEXT,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_broadcasts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    sender_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    broadcast_type VARCHAR(50) DEFAULT 'Info',
    priority VARCHAR(20) DEFAULT 'Medium',
    is_active BOOLEAN DEFAULT TRUE,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for HIS Tables
ALTER TABLE his_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_queue_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_staff_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_dental_charts ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_eye_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_medication_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_broadcasts ENABLE ROW LEVEL SECURITY;

-- Standard HIS Policies
DROP POLICY IF EXISTS "HIS staff viewable by institution" ON his_staff;
CREATE POLICY "HIS staff viewable by institution" ON his_staff FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Patients viewable by institution" ON his_patients;
CREATE POLICY "Patients viewable by institution" ON his_patients FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Wards viewable by institution" ON his_wards;
CREATE POLICY "Wards viewable by institution" ON his_wards FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Beds viewable by institution" ON his_beds;
CREATE POLICY "Beds viewable by institution" ON his_beds FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Admissions viewable by institution" ON his_admissions;
CREATE POLICY "Admissions viewable by institution" ON his_admissions FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Appointments viewable by institution" ON his_appointments;
CREATE POLICY "Appointments viewable by institution" ON his_appointments FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Staff attendance viewable by institution" ON his_staff_attendance;
CREATE POLICY "Staff attendance viewable by institution" ON his_staff_attendance FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Dental charts viewable by institution" ON his_dental_charts;
CREATE POLICY "Dental charts viewable by institution" ON his_dental_charts FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Eye prescriptions viewable by institution" ON his_eye_prescriptions;
CREATE POLICY "Eye prescriptions viewable by institution" ON his_eye_prescriptions FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "Medication logs viewable by institution" ON his_medication_logs;
CREATE POLICY "Medication logs viewable by institution" ON his_medication_logs FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "HIS financial records viewable by institution" ON his_financial_records;
CREATE POLICY "HIS financial records viewable by institution" ON his_financial_records FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

DROP POLICY IF EXISTS "HIS broadcasts viewable by institution" ON his_broadcasts;
CREATE POLICY "HIS broadcasts viewable by institution" ON his_broadcasts FOR SELECT USING (institution_id = public.get_curr_user_inst_id());

-- 14. DRIVING SCHOOL MODULE
CREATE TABLE IF NOT EXISTS ds_instructors (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    license_number TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ds_vehicles (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    transmission TEXT NOT NULL,
    vehicle_type TEXT,
    last_service_date DATE,
    next_service_date DATE,
    status TEXT DEFAULT 'Operational',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ds_students (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    passport_number TEXT,
    phone TEXT,
    license_type_interested TEXT,
    theory_progress_percent INTEGER DEFAULT 0,
    practical_progress_percent INTEGER DEFAULT 0,
    theory_test_score INTEGER,
    practical_test_score INTEGER,
    ntsa_booking_status TEXT,
    status TEXT DEFAULT 'Enrolled',
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure email column exists for older schema versions
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS theory_test_score INTEGER;
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS practical_test_score INTEGER;
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS ntsa_booking_status TEXT;

CREATE TABLE IF NOT EXISTS ds_lessons (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    instructor_id TEXT REFERENCES ds_instructors(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES ds_vehicles(id) ON DELETE SET NULL,
    lesson_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    lesson_type TEXT NOT NULL,
    topic TEXT,
    status TEXT DEFAULT 'Scheduled',
    notes TEXT,
    instructor_notes TEXT,
    route_tracked_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ds_skill_mastery (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    rating INTEGER NOT NULL,
    comments TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ds_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    lesson_price_practical DECIMAL(12, 2),
    lesson_price_theory DECIMAL(12, 2),
    fee_structures JSONB DEFAULT '[]'::jsonb,
    cancellation_policy TEXT,
    working_hours JSONB,
    auto_scheduling_enabled BOOLEAN DEFAULT FALSE,
    scheduling_rules JSONB DEFAULT '{}'::jsonb,
    invoice_prefix TEXT,
    receipt_prefix TEXT,
    student_id_prefix TEXT,
    license_categories JSONB DEFAULT '[]'::jsonb,
    votes JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure columns exist for older schema versions
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS auto_scheduling_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS scheduling_rules JSONB DEFAULT '{}'::jsonb;
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS invoice_prefix TEXT;
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS receipt_prefix TEXT;
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS student_id_prefix TEXT;
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS license_categories JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS votes JSONB DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS ds_license_categories (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_fee DECIMAL(12, 2) DEFAULT 0,
    parent_category TEXT DEFAULT 'Driving',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code, institution_id)
);

-- Ensure parent_category and is_active exist for older schema versions
ALTER TABLE ds_license_categories ADD COLUMN IF NOT EXISTS parent_category TEXT DEFAULT 'Driving';
ALTER TABLE ds_license_categories ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS ds_votes (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    vote_name TEXT NOT NULL,
    default_amount DECIMAL(12, 2) DEFAULT 0,
    is_mandatory BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vote_name, institution_id)
);

CREATE TABLE IF NOT EXISTS ds_fee_structures (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    branch_id TEXT,
    class_name TEXT NOT NULL,
    description TEXT,
    items JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ds_fee_structures ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ds_fee_structures ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE ds_fee_structures ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;


CREATE TABLE IF NOT EXISTS ds_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    fee_structure_id TEXT,
    class_name TEXT,
    items JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'Pending',
    invoice_number TEXT NOT NULL,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ds_payments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES ds_invoices(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    student_name TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number TEXT NOT NULL,
    received_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE ds_payments ADD COLUMN IF NOT EXISTS student_id TEXT;

-- 14.5 BEAUTY COLLEGE MODULE
CREATE TABLE IF NOT EXISTS bc_trainers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bc_courses (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_fee DECIMAL(12, 2) DEFAULT 0,
    kit_fee DECIMAL(12, 2) DEFAULT 0,
    exam_fee DECIMAL(12, 2) DEFAULT 0,
    practical_hours_required INTEGER DEFAULT 0,
    tuition_priority INTEGER DEFAULT 1,
    kit_priority INTEGER DEFAULT 2,
    exam_priority INTEGER DEFAULT 3,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(code, institution_id)
);

CREATE TABLE IF NOT EXISTS bc_students (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    course_id TEXT REFERENCES bc_courses(id) ON DELETE SET NULL,
    kit_issued_status TEXT DEFAULT 'Pending',
    practical_hours_completed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Enrolled',
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bc_practicals (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES bc_students(id) ON DELETE CASCADE,
    trainer_id TEXT REFERENCES bc_trainers(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    hours INTEGER DEFAULT 1,
    topic TEXT,
    status TEXT DEFAULT 'Completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bc_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    fee_installment_split INTEGER DEFAULT 3,
    invoice_prefix TEXT DEFAULT 'BC-INV',
    receipt_prefix TEXT DEFAULT 'BC-REC',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bc_fee_structures (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    branch_id TEXT,
    course_id TEXT NOT NULL REFERENCES bc_courses(id) ON DELETE CASCADE,
    description TEXT,
    items JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE bc_fee_structures ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE bc_fee_structures ADD COLUMN IF NOT EXISTS branch_id TEXT;
ALTER TABLE bc_fee_structures ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;


CREATE TABLE IF NOT EXISTS bc_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES bc_students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    course_id TEXT REFERENCES bc_courses(id) ON DELETE SET NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    balance DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'Pending',
    invoice_number TEXT NOT NULL,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bc_payments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES bc_invoices(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES bc_students(id) ON DELETE CASCADE,
    student_name TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number TEXT NOT NULL,
    received_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15. CAR SHOWROOM MODULE
CREATE TABLE IF NOT EXISTS car_sales_listings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    seller_id TEXT,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    trim TEXT,
    price DECIMAL(15, 2) NOT NULL,
    mileage INTEGER NOT NULL,
    fuel_type TEXT NOT NULL,
    transmission TEXT NOT NULL,
    body_type TEXT,
    engine_size TEXT,
    color TEXT,
    main_image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}',
    tour_360_url TEXT,
    video_walkthrough_url TEXT,
    inspection_report_url TEXT,
    ai_valuation_status TEXT DEFAULT 'pending',
    estimated_market_value DECIMAL(15, 2),
    inspection_score INTEGER,
    registration_number TEXT,
    vin_number TEXT,
    verified_history BOOLEAN DEFAULT FALSE,
    status TEXT DEFAULT 'active',
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    import_status TEXT,
    import_expenses JSONB DEFAULT '[]'::jsonb,
    fob_price DECIMAL(15, 2),
    total_landed_cost DECIMAL(15, 2),
    target_margin DECIMAL(10, 2),
    floor_price DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS car_test_drive_bookings (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES car_sales_listings(id) ON DELETE CASCADE,
    buyer_id TEXT,
    buyer_name TEXT,
    buyer_phone TEXT,
    booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
    delivery_address TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS car_appraisals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    vehicle_details JSONB NOT NULL,
    images TEXT[] DEFAULT '{}',
    offered_amount DECIMAL(15, 2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS car_sales_invoices (
    id TEXT PRIMARY KEY,
    listing_id TEXT NOT NULL REFERENCES car_sales_listings(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    client_email TEXT,
    client_phone TEXT,
    total_amount DECIMAL(15, 2) NOT NULL,
    paid_amount DECIMAL(15, 2) DEFAULT 0,
    balance_amount DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'pending',
    due_date DATE,
    invoice_number TEXT NOT NULL,
    registration_number TEXT,
    sold_by TEXT,
    notes TEXT,
    is_installment BOOLEAN DEFAULT FALSE,
    installment_frequency TEXT,
    total_installments INTEGER,
    installment_amount DECIMAL(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE car_sales_invoices ADD COLUMN IF NOT EXISTS is_installment BOOLEAN DEFAULT FALSE;
ALTER TABLE car_sales_invoices ADD COLUMN IF NOT EXISTS installment_frequency TEXT;
ALTER TABLE car_sales_invoices ADD COLUMN IF NOT EXISTS total_installments INTEGER;
ALTER TABLE car_sales_invoices ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(15, 2);

CREATE TABLE IF NOT EXISTS car_sales_payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL REFERENCES car_sales_invoices(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS showroom_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    invoice_reminders JSONB DEFAULT '{"enabled": false, "before_due_days": 3, "after_due_days": 1, "template": ""}'::jsonb,
    invoice_prefix TEXT DEFAULT 'INV-CAR-',
    invoice_starting_number INTEGER DEFAULT 1001,
    invoice_format TEXT DEFAULT '{PREFIX}{NUMBER}',
    receipt_prefix TEXT DEFAULT 'REC-CAR-',
    receipt_starting_number INTEGER DEFAULT 1001,
    receipt_format TEXT DEFAULT '{PREFIX}{NUMBER}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. FAMILY HERITAGE MODULE
CREATE TABLE IF NOT EXISTS heritage_members (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    branch TEXT NOT NULL,
    relation TEXT NOT NULL,
    birth_year TEXT,
    death_year TEXT,
    notes TEXT,
    profile_photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS heritage_stories (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    story_date DATE,
    story_text TEXT NOT NULL,
    author_name TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS heritage_galleries (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT,
    captured_at DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS heritage_announcements (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    announcement_date DATE,
    detail TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Core Academic RLS (Standardized for initial setup)
DROP POLICY IF EXISTS "Institutions are public" ON institutions;
CREATE POLICY "Institutions are public" ON institutions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON users;
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid()::text = id OR 'u_' || auth.uid()::text = id OR public.get_curr_user_role() = 'super_admin');

-- Global System Settings RLS & Resilience --
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "system_settings_read_policy" ON system_settings;
CREATE POLICY "system_settings_read_policy" ON system_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "system_settings_write_policy" ON system_settings;
CREATE POLICY "system_settings_write_policy" ON system_settings FOR ALL USING (true) WITH CHECK (true);
INSERT INTO system_settings (id, data) VALUES (1, '{}'::jsonb) ON CONFLICT (id) DO NOTHING;
CREATE INDEX IF NOT EXISTS idx_system_settings_id ON system_settings (id);

-- Global Activity Log RLS & Resilience --
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "activity_log_all_access" ON activity_log;
CREATE POLICY "activity_log_all_access" ON activity_log FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_activity_log_inst_id_desc ON activity_log (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_inst_timestamp ON activity_log (institution_id, "timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_inst_module ON activity_log (institution_id, module);

-- Global Payroll Records & Runs RLS & Resilience --
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_records_all_access" ON payroll_records;
CREATE POLICY "payroll_records_all_access" ON payroll_records FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_id_desc ON payroll_records (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_payment_date ON payroll_records (institution_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_created ON payroll_records (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_month ON payroll_records (institution_id, month);

ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "payroll_runs_all_access" ON payroll_runs;
CREATE POLICY "payroll_runs_all_access" ON payroll_runs FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_inst_id_desc ON payroll_runs (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_inst_created ON payroll_runs (institution_id, created_at DESC);

ALTER TABLE his_expenditures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "his_expenditures_all_access" ON his_expenditures;
CREATE POLICY "his_expenditures_all_access" ON his_expenditures FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_his_expenditures_inst_id_desc ON his_expenditures (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_his_expenditures_inst_date ON his_expenditures (institution_id, date DESC);

-- Global Vote Heads & Fee Structures RLS & Resilience --
ALTER TABLE vote_heads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vote_heads_all_access" ON vote_heads;
CREATE POLICY "vote_heads_all_access" ON vote_heads FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_id_desc ON vote_heads (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_id_asc ON vote_heads (institution_id, id ASC);
CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_created ON vote_heads (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_priority ON vote_heads (institution_id, priority);
CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_name ON vote_heads (institution_id, name);
CREATE INDEX IF NOT EXISTS idx_vote_heads_academic_year ON vote_heads (institution_id, academic_year_id);

ALTER TABLE fee_structures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fee_structures_all_access" ON fee_structures;
CREATE POLICY "fee_structures_all_access" ON fee_structures FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_id_desc ON fee_structures (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_id_asc ON fee_structures (institution_id, id ASC);
CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_academic_year ON fee_structures (institution_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_created ON fee_structures (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_vote_head ON fee_structures (institution_id, vote_head_id);

-- Global Financial Periods RLS & Resilience --
ALTER TABLE financial_periods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "financial_periods_all_access" ON financial_periods;
CREATE POLICY "financial_periods_all_access" ON financial_periods FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_id_desc ON financial_periods (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_id_asc ON financial_periods (institution_id, id ASC);
CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_status ON financial_periods (institution_id, status);
CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_dates ON financial_periods (institution_id, start_date DESC, end_date DESC);
CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_name ON financial_periods (institution_id, name);

-- Global Vehicles & Transport RLS & Resilience --
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicles_all_access" ON vehicles;
CREATE POLICY "vehicles_all_access" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_vehicles_inst_id_desc ON vehicles (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_vehicles_inst_id_asc ON vehicles (institution_id, id ASC);
CREATE INDEX IF NOT EXISTS idx_vehicles_inst_plate ON vehicles (institution_id, plate_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_inst_status ON vehicles (institution_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicles_inst_driver ON vehicles (institution_id, driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_inst_created ON vehicles (institution_id, created_at DESC);

ALTER TABLE transport_onboarding ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "transport_onboarding_all_access" ON transport_onboarding;
CREATE POLICY "transport_onboarding_all_access" ON transport_onboarding FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_id_desc ON transport_onboarding (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_timestamp ON transport_onboarding (institution_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_student ON transport_onboarding (institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_vehicle ON transport_onboarding (institution_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_created ON transport_onboarding (institution_id, created_at DESC);

ALTER TABLE vehicle_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "vehicle_logs_all_access" ON vehicle_logs;
CREATE POLICY "vehicle_logs_all_access" ON vehicle_logs FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_id_desc ON vehicle_logs (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_timestamp ON vehicle_logs (institution_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_vehicle ON vehicle_logs (institution_id, vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_created ON vehicle_logs (institution_id, created_at DESC);

-- Global DS Payments RLS & Resilience --
ALTER TABLE ds_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ds_payments_all_access" ON ds_payments;
CREATE POLICY "ds_payments_all_access" ON ds_payments FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_id_desc ON ds_payments (institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_id_asc ON ds_payments (institution_id, id ASC);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_invoice ON ds_payments (institution_id, invoice_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_student ON ds_payments (institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_date ON ds_payments (institution_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_created ON ds_payments (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_status ON ds_payments (institution_id, status);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_branch ON ds_payments (institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_receipt ON ds_payments (institution_id, receipt_number);

-- Global App Notifications RLS & Resilience --
ALTER TABLE app_notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "app_notifications_all_access" ON app_notifications;
CREATE POLICY "app_notifications_all_access" ON app_notifications FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_timestamp ON app_notifications (user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created ON app_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_user_is_read ON app_notifications (user_id, is_read, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_inst_timestamp ON app_notifications (institution_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_inst_created ON app_notifications (institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_app_notifications_id ON app_notifications (id);

-- Global School Registry RLS --
ALTER TABLE school_registry ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public select: school_registry" ON school_registry;
CREATE POLICY "Public select: school_registry" ON school_registry FOR SELECT USING (true);
DROP POLICY IF EXISTS "Super Admin manage: school_registry" ON school_registry;
CREATE POLICY "Super Admin manage: school_registry" ON school_registry FOR ALL USING (public.get_curr_user_role() = 'super_admin') WITH CHECK (public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Institutional tenancy select: subjects" ON subjects;
CREATE POLICY "Institutional tenancy select: subjects" ON subjects FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Institutional tenancy select: courses" ON courses;
CREATE POLICY "Institutional tenancy select: courses" ON courses FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- 13. ALUMNAE NETWORK MODULE --
CREATE TABLE IF NOT EXISTS alumnae_members (
    id TEXT PRIMARY KEY,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    admission_number TEXT,
    graduation_year TEXT,
    department TEXT,
    current_job TEXT,
    current_company TEXT,
    linkedin_url TEXT,
    twitter_url TEXT,
    bio TEXT,
    institution_id TEXT REFERENCES institutions(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'pending',
    profile_photo TEXT,
    payment_id TEXT,
    registration_fee DECIMAL(12, 2) DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    password TEXT,
    is_secured BOOLEAN DEFAULT FALSE,
    secured_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_alumnae_email ON alumnae_members(email);
CREATE INDEX IF NOT EXISTS idx_alumnae_inst ON alumnae_members(institution_id);

ALTER TABLE alumnae_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can register as alumnae" ON alumnae_members;
CREATE POLICY "Public can register as alumnae" ON alumnae_members FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Alumnae can view and update own profile" ON alumnae_members;
CREATE POLICY "Alumnae can view and update own profile" ON alumnae_members FOR ALL USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR id = auth.uid()::text
    OR 'u_' || auth.uid()::text = id
);

DROP POLICY IF EXISTS "Institutional admins can view alumnae" ON alumnae_members;
CREATE POLICY "Institutional admins can view alumnae" ON alumnae_members FOR SELECT USING (
    institution_id = public.get_curr_user_inst_id()
    OR public.get_curr_user_role() = 'super_admin'
);

-- Event Management Module
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'planning',
    logo_url TEXT,
    banner_url TEXT,
    custom_subdomain TEXT,
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    updated_at TEXT
);

-- Ensure custom_subdomain column exists for backward compatibility
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS custom_subdomain TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS payment_instructions TEXT;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS bank_integration_enabled BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS event_categories (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    distance_km NUMERIC NOT NULL,
    registration_fee NUMERIC NOT NULL DEFAULT 0,
    capacity INTEGER,
    age_limit_min INTEGER,
    age_limit_max INTEGER,
    gender_restriction TEXT NOT NULL DEFAULT 'any',
    start_time TEXT,
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS event_participants (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    bib_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    gender TEXT,
    age INTEGER,
    t_shirt_size TEXT,
    status TEXT NOT NULL DEFAULT 'registered',
    waiver_signed BOOLEAN NOT NULL DEFAULT FALSE,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    mpesa_reference TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    updated_at TEXT
);

CREATE TABLE IF NOT EXISTS event_splits (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    split_name TEXT NOT NULL,
    distance_km NUMERIC NOT NULL,
    time_elapsed TEXT NOT NULL,
    recorded_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE TABLE IF NOT EXISTS event_medical_logs (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    tent_number TEXT,
    diagnosis TEXT NOT NULL,
    treatment TEXT,
    status TEXT NOT NULL DEFAULT 'under_observation',
    recorded_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE TABLE IF NOT EXISTS event_pledges (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    sponsor_name TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending',
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

CREATE INDEX IF NOT EXISTS idx_events_institution ON events(institution_id);
CREATE INDEX IF NOT EXISTS idx_categories_event ON event_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_category ON event_participants(category_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_bib ON event_participants(bib_number);
CREATE INDEX IF NOT EXISTS idx_splits_participant ON event_splits(participant_id);
CREATE INDEX IF NOT EXISTS idx_medlogs_event ON event_medical_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_pledges_participant ON event_pledges(participant_id);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_medical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pledges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permissive select for events" ON events;
CREATE POLICY "Permissive select for events" ON events FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permissive select for event_categories" ON event_categories;
CREATE POLICY "Permissive select for event_categories" ON event_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permissive select for event_participants" ON event_participants;
CREATE POLICY "Permissive select for event_participants" ON event_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permissive select for event_splits" ON event_splits;
CREATE POLICY "Permissive select for event_splits" ON event_splits FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permissive select for event_medical_logs" ON event_medical_logs;
CREATE POLICY "Permissive select for event_medical_logs" ON event_medical_logs FOR SELECT USING (true);

DROP POLICY IF EXISTS "Permissive select for event_pledges" ON event_pledges;
CREATE POLICY "Permissive select for event_pledges" ON event_pledges FOR SELECT USING (true);

DROP POLICY IF EXISTS "Insert events for all authenticated" ON events;
DROP POLICY IF EXISTS "Insert events for institutional staff" ON events;
CREATE POLICY "Insert events for institutional staff" ON events FOR INSERT WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Update events for all authenticated" ON events;
DROP POLICY IF EXISTS "Update events for institutional staff" ON events;
CREATE POLICY "Update events for institutional staff" ON events FOR UPDATE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
DROP POLICY IF EXISTS "Delete events for all authenticated" ON events;
DROP POLICY IF EXISTS "Delete events for institutional staff" ON events;
CREATE POLICY "Delete events for institutional staff" ON events FOR DELETE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Insert categories for all authenticated" ON event_categories;
DROP POLICY IF EXISTS "Insert categories for institutional staff" ON event_categories;
CREATE POLICY "Insert categories for institutional staff" ON event_categories FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));
DROP POLICY IF EXISTS "Update categories for all authenticated" ON event_categories;
DROP POLICY IF EXISTS "Update categories for institutional staff" ON event_categories;
CREATE POLICY "Update categories for institutional staff" ON event_categories FOR UPDATE USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));
DROP POLICY IF EXISTS "Delete categories for all authenticated" ON event_categories;
DROP POLICY IF EXISTS "Delete categories for institutional staff" ON event_categories;
CREATE POLICY "Delete categories for institutional staff" ON event_categories FOR DELETE USING (EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));

DROP POLICY IF EXISTS "Insert participants for all authenticated" ON event_participants;
DROP POLICY IF EXISTS "Insert participants for everyone" ON event_participants;
CREATE POLICY "Insert participants for everyone" ON event_participants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Update participants for all authenticated" ON event_participants;
DROP POLICY IF EXISTS "Update participants for institutional staff" ON event_participants;
CREATE POLICY "Update participants for institutional staff" ON event_participants FOR UPDATE USING (EXISTS (SELECT 1 FROM event_categories c JOIN events e ON e.id = c.event_id WHERE c.id = category_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));
DROP POLICY IF EXISTS "Delete participants for all authenticated" ON event_participants;
DROP POLICY IF EXISTS "Delete participants for institutional staff" ON event_participants;
CREATE POLICY "Delete participants for institutional staff" ON event_participants FOR DELETE USING (EXISTS (SELECT 1 FROM event_categories c JOIN events e ON e.id = c.event_id WHERE c.id = category_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));

DROP POLICY IF EXISTS "Insert splits for all authenticated" ON event_splits;
DROP POLICY IF EXISTS "Insert splits for everyone" ON event_splits;
CREATE POLICY "Insert splits for everyone" ON event_splits FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Update splits for all authenticated" ON event_splits;
DROP POLICY IF EXISTS "Update splits for institutional staff" ON event_splits;
CREATE POLICY "Update splits for institutional staff" ON event_splits FOR UPDATE USING (EXISTS (SELECT 1 FROM event_participants p JOIN event_categories c ON c.id = p.category_id JOIN events e ON e.id = c.event_id WHERE p.id = participant_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));
DROP POLICY IF EXISTS "Delete splits for all authenticated" ON event_splits;
DROP POLICY IF EXISTS "Delete splits for institutional staff" ON event_splits;
CREATE POLICY "Delete splits for institutional staff" ON event_splits FOR DELETE USING (EXISTS (SELECT 1 FROM event_participants p JOIN event_categories c ON c.id = p.category_id JOIN events e ON e.id = c.event_id WHERE p.id = participant_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));

DROP POLICY IF EXISTS "Insert medical logs for all authenticated" ON event_medical_logs;
DROP POLICY IF EXISTS "Insert medical logs for everyone" ON event_medical_logs;
CREATE POLICY "Insert medical logs for everyone" ON event_medical_logs FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Update medical logs for all authenticated" ON event_medical_logs;
DROP POLICY IF EXISTS "Update medical logs for institutional staff" ON event_medical_logs;
CREATE POLICY "Update medical logs for institutional staff" ON event_medical_logs FOR UPDATE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin' OR EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));
DROP POLICY IF EXISTS "Delete medical logs for all authenticated" ON event_medical_logs;
DROP POLICY IF EXISTS "Delete medical logs for institutional staff" ON event_medical_logs;
CREATE POLICY "Delete medical logs for institutional staff" ON event_medical_logs FOR DELETE USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin' OR EXISTS (SELECT 1 FROM events e WHERE e.id = event_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));

DROP POLICY IF EXISTS "Insert pledges for all authenticated" ON event_pledges;
DROP POLICY IF EXISTS "Insert pledges for everyone" ON event_pledges;
CREATE POLICY "Insert pledges for everyone" ON event_pledges FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Update pledges for all authenticated" ON event_pledges;
DROP POLICY IF EXISTS "Update pledges for institutional staff" ON event_pledges;
CREATE POLICY "Update pledges for institutional staff" ON event_pledges FOR UPDATE USING (EXISTS (SELECT 1 FROM event_participants p JOIN event_categories c ON c.id = p.category_id JOIN events e ON e.id = c.event_id WHERE p.id = participant_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));
DROP POLICY IF EXISTS "Delete pledges for all authenticated" ON event_pledges;
DROP POLICY IF EXISTS "Delete pledges for institutional staff" ON event_pledges;
CREATE POLICY "Delete pledges for institutional staff" ON event_pledges FOR DELETE USING (EXISTS (SELECT 1 FROM event_participants p JOIN event_categories c ON c.id = p.category_id JOIN events e ON e.id = c.event_id WHERE p.id = participant_id AND (e.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')));

-- Standardize RLS for remaining core tables
DO $core_policy$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'academic_levels', 'departments', 'academic_years', 'semesters', 'buildings', 'rooms', 
        'allocation_requests', 'timetable_entries', 'exam_timetable_entries', 'assignments', 
        'student_attendances', 'enrollment_requests', 'vote_heads', 'financial_periods', 
        'fee_structures', 'inventory', 'stock_transactions',
        'activity_log', 'system_settings', 'counties', 'suppliers', 'requisitions',
        'books', 'library_transactions', 'library_fines', 'book_reservations',
        'book_stock_receipts', 'library_settings', 'security_alerts', 'visitors',
        'appointments', 'tasks', 'feedback_submissions', 'lesson_ratings',
        'bulletin_items',
        'document_collections', 'watchlist_records', 'maintenance_requests',
        'teacher_check_ins', 'his_staff_attendance', 'his_dental_charts',
        'his_eye_prescriptions', 'his_medication_logs', 'his_financial_records',
        'his_broadcasts', 'institution_module_states',
        'ds_instructors', 'ds_vehicles', 'ds_students', 'ds_lessons', 'ds_skill_mastery', 'ds_settings', 'ds_fee_structures', 'ds_invoices', 'ds_payments', 'ds_license_categories', 'ds_votes',
        'bc_settings', 'bc_courses', 'bc_students', 'bc_trainers', 'bc_fee_structures', 'bc_invoices', 'bc_payments', 'bc_practicals',
        'car_sales_listings', 'car_test_drive_bookings', 'car_appraisals', 'car_sales_invoices', 'car_sales_payments', 'showroom_settings',
        'heritage_members', 'heritage_stories', 'heritage_galleries', 'heritage_announcements',
        'student_enrollments', 'bank_transactions', 'store_categories',
        'broadcaster_messages', 'institution_events', 'event_pins',
        'synergy_posts', 'synergy_comments', 'synergy_messages',
        'election_events', 'election_candidates', 'election_voters_ledger', 'election_ballots', 'election_checkins'
    ]) LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %%I" ON %%I', t, t);
            EXECUTE format('CREATE POLICY "Institutional tenancy select: %%I" ON %%I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);

            
            EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %%I" ON %%I', t, t);
            EXECUTE format('CREATE POLICY "Institutional tenancy manage: %%I" ON %%I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        END IF;
    END LOOP;

    -- High-performance non-recursive tenancy policies for absence & request tables
    FOR t IN SELECT unnest(ARRAY['student_absence_requests', 'absence_requests', 'time_off_requests', 'leave_requests', 'leave_out_requests']) LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
            EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "master_unblock_%I" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "%I_select" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "%I_insert" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "%I_update" ON public.%I', t, t);
            EXECUTE format('DROP POLICY IF EXISTS "%I_delete" ON public.%I', t, t);
            EXECUTE format('CREATE POLICY "%I_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
            EXECUTE format('CREATE POLICY "%I_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL AND length(id) > 0)', t, t);
            EXECUTE format('CREATE POLICY "%I_update" ON public.%I FOR UPDATE TO authenticated, anon USING (id IS NOT NULL AND length(id) > 0) WITH CHECK (id IS NOT NULL AND length(id) > 0)', t, t);
            EXECUTE format('CREATE POLICY "%I_delete" ON public.%I FOR DELETE TO authenticated, anon USING (id IS NOT NULL AND length(id) > 0)', t, t);
            EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
        END IF;
    END LOOP;
END $core_policy$;

DROP POLICY IF EXISTS "Super Admin only access for platform_expenses" ON platform_expenses;
CREATE POLICY "Super Admin only access for platform_expenses" ON platform_expenses FOR ALL USING (public.get_curr_user_role() = 'super_admin') WITH CHECK (public.get_curr_user_role() = 'super_admin');

-- Performance Indexes for student_absence_requests & absence tables
CREATE INDEX IF NOT EXISTS idx_student_absence_requests_inst_id_composite ON public.student_absence_requests(institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_student_absence_requests_institution_id ON public.student_absence_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_absence_requests_inst_id_composite ON public.absence_requests(institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_absence_requests_institution_id ON public.absence_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_inst_id_composite ON public.time_off_requests(institution_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_time_off_requests_institution_id ON public.time_off_requests(institution_id);

-- Performance Indexes for student consistency and institutional filtering
CREATE INDEX IF NOT EXISTS idx_users_inst_role ON public.users(institution_id, role);
CREATE INDEX IF NOT EXISTS idx_users_inst_role_status ON public.users(institution_id, role, status);
CREATE INDEX IF NOT EXISTS idx_users_inst_branch ON public.users(institution_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id ON public.student_enrollments(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_composite ON public.student_enrollments(institution_id, id ASC);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_status ON public.student_enrollments(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_user ON public.student_enrollments(institution_id, user_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_created ON public.student_enrollments(institution_id, created_at DESC);

`;

    sql += `\n\n-- PM Tenant SMS Bonus Trigger\n`;
    sql += `CREATE OR REPLACE FUNCTION public.allocate_tenant_sms_bonus()\n`;
    sql += `RETURNS TRIGGER \n`;
    sql += `LANGUAGE plpgsql \n`;
    sql += `SECURITY DEFINER \n`;
    sql += `SET search_path = public, pg_temp\n`;
    sql += `AS $$\n`;
    sql += `DECLARE\n`;
    sql += `    days_diff INTEGER;\n`;
    sql += `    months_diff INTEGER;\n`;
    sql += `    tenant_count INTEGER;\n`;
    sql += `    bonus_units INTEGER;\n`;
    sql += `    old_end TIMESTAMP;\n`;
    sql += `    new_end TIMESTAMP;\n`;
    sql += `BEGIN\n`;
    sql += `    new_end := NEW.subscription_ends_at;\n`;
    sql += `    old_end := OLD.subscription_ends_at;\n`;
    sql += `\n`;
    sql += `    IF new_end IS NOT NULL AND (old_end IS NULL OR new_end > old_end) THEN\n`;
    sql += `        IF old_end IS NULL OR old_end < NOW() THEN\n`;
    sql += `            days_diff := EXTRACT(EPOCH FROM (new_end - NOW())) / 86400;\n`;
    sql += `        ELSE\n`;
    sql += `            days_diff := EXTRACT(EPOCH FROM (new_end - old_end)) / 86400;\n`;
    sql += `        END IF;\n`;
    sql += `\n`;
    sql += `        IF days_diff <= 0 THEN\n`;
    sql += `            days_diff := 30;\n`;
    sql += `        END IF;\n`;
    sql += `\n`;
    sql += `        IF days_diff > 300 THEN\n`;
    sql += `            months_diff := 12;\n`;
    sql += `        ELSE\n`;
    sql += `            months_diff := CEIL(days_diff / 30.0);\n`;
    sql += `        END IF;\n`;
    sql += `\n`;
    sql += `        SELECT COUNT(*)::INTEGER INTO tenant_count \n`;
    sql += `        FROM pm_tenants \n`;
    sql += `        WHERE institution_id = NEW.id;\n`;
    sql += `\n`;
    sql += `        IF tenant_count > 0 THEN\n`;
    sql += `            bonus_units := 6 * months_diff * tenant_count;\n`;
    sql += `            \n`;
    sql += `            NEW.sms_config := jsonb_set(\n`;
    sql += `                COALESCE(NEW.sms_config, '{}'::jsonb), \n`;
    sql += `                '{systemSmsBalance}', \n`;
    sql += `                to_jsonb(COALESCE((NEW.sms_config->>'systemSmsBalance')::int, 0) + bonus_units)\n`;
    sql += `            );\n`;
    sql += `            \n`;
    sql += `            NEW.smsConfig := NEW.sms_config;\n`;
    sql += `        END IF;\n`;
    sql += `    END IF;\n`;
    sql += `\n`;
    sql += `    RETURN NEW;\n`;
    sql += `END;\n`;
    sql += `$$;\n`;
    sql += `\n`;
    sql += `DROP TRIGGER IF EXISTS trg_allocate_tenant_sms_bonus ON public.institutions;\n`;
    sql += `DROP TRIGGER IF EXISTS trg_allocate_tenant_sms_bonus ON institutions;\n`;
    sql += `CREATE OR REPLACE TRIGGER trg_allocate_tenant_sms_bonus\n`;
    sql += `    BEFORE UPDATE OF subscription_ends_at ON institutions\n`;
    sql += `    FOR EACH ROW\n`;
    sql += `    EXECUTE FUNCTION allocate_tenant_sms_bonus();\n`;
    sql += `\n`;

    sql += `-- ==========================================================================\n`;
    sql += `-- HIGH-PERFORMANCE DATABASE INDEXES (SUPABASE RESOURCE OPTIMIZATION)\n`;
    sql += `-- Replaces slow CPU-intensive full table scans with <1ms indexed B-Tree lookups\n`;
    sql += `-- ==========================================================================\n\n`;

    const indexStatements = [
        // Users & Auth
        `CREATE INDEX IF NOT EXISTS idx_users_institution_id ON users(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
        `CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`,
        // Academic Core
        `CREATE INDEX IF NOT EXISTS idx_students_institution_id ON student_enrollments(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_asc ON student_enrollments(institution_id, id ASC);`,
        `CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_id_desc ON student_enrollments(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_student_enrollments_inst_status ON student_enrollments(institution_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_attendances_institution_id ON student_attendances(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_attendances_date ON student_attendances(date);`,
        // Finance & Billing
        `CREATE INDEX IF NOT EXISTS idx_invoices_institution_id ON invoices(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);`,
        `CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_receipts_institution_id ON receipts(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_receipts_student_id ON receipts(student_id);`,
        `CREATE INDEX IF NOT EXISTS idx_receipts_created_at ON receipts(created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_transactions_institution_id ON transactions(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_mpesa_txns_institution_id ON mpesa_transactions(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_bank_txns_institution_id ON bank_transactions(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_airtel_tx_inst_created_desc ON airtel_transactions(institution_id, created_at DESC, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_intasend_tx_inst_created_desc ON intasend_transactions(institution_id, created_at DESC, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ncba_tx_inst_created_desc ON ncba_transactions(institution_id, created_at DESC, id DESC);`,
        // Procurement
        `CREATE INDEX IF NOT EXISTS idx_proc_supp_institution_id ON procurement_suppliers(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_proc_items_institution_id ON procurement_items(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_proc_lpos_institution_id ON procurement_lpos(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_proc_inv_institution_id ON procurement_invoices(institution_id);`,
        // HIS / Hospital
        `CREATE INDEX IF NOT EXISTS idx_his_patients_institution_id ON his_patients(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_inpatient_institution_id ON his_inpatient_records(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_inpatient_patient_id ON his_inpatient_records(patient_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_prescriptions_inst ON his_prescriptions(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_prescriptions_patient ON his_prescriptions(patient_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_presc_items_presc ON his_prescription_items(prescription_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_billing_items_inst ON his_billing_items(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_billing_items_patient ON his_billing_items(patient_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_pharm_inv_inst ON his_pharmacy_inventory(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_pharm_batches_med ON his_pharmacy_batches(medication_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_queue_calls_inst ON his_queue_calls(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_vital_stats_patient ON his_vital_statistics(patient_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_clinical_events_patient ON his_clinical_events(patient_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_nurse_tasks_patient ON his_nurse_tasks(patient_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_lab_requests_patient ON his_lab_requests(patient_id);`,
        `CREATE INDEX IF NOT EXISTS idx_his_medical_notes_patient ON his_medical_notes(patient_id);`,
        // Driving School
        `CREATE INDEX IF NOT EXISTS idx_ds_students_inst ON ds_students(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_lessons_inst ON ds_lessons(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst ON ds_invoices(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_id_desc ON ds_invoices(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_student ON ds_invoices(institution_id, student_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_invoices_inst_status ON ds_invoices(institution_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst ON ds_payments(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_id_desc ON ds_payments(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_invoice ON ds_payments(institution_id, invoice_id);`,
        // Property Management
        `CREATE INDEX IF NOT EXISTS idx_pm_tenants_inst ON pm_tenants(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_pm_leases_inst ON pm_leases(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_pm_invoices_inst ON pm_invoices(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_pm_payments_inst ON pm_payments(institution_id);`,
        // Cooperative
        `CREATE INDEX IF NOT EXISTS idx_coop_farmers_inst ON coop_farmers(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_coop_collections_inst ON coop_collections(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_coop_expenses_inst ON coop_expenses(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_coop_income_inst ON coop_income(institution_id);`,
        // Retail & Restaurant
        `CREATE INDEX IF NOT EXISTS idx_retail_inv_inst ON retail_inventory(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_retail_sales_inst ON retail_sales(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_retail_stores_inst_id_desc ON retail_stores(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_retail_stores_inst_name ON retail_stores(institution_id, name);`,
        `CREATE INDEX IF NOT EXISTS idx_retail_expenses_inst_id_desc ON retail_expenses(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_rii_inst_id_desc ON retail_inventory_items(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_rii_inst_name ON retail_inventory_items(institution_id, name);`,
        `CREATE INDEX IF NOT EXISTS idx_rii_inst_sku ON retail_inventory_items(institution_id, sku);`,
        `CREATE INDEX IF NOT EXISTS idx_rss_inst_store ON retail_store_stock(institution_id, store_id);`,
        `CREATE INDEX IF NOT EXISTS idx_cafe_orders_inst ON cafe_orders(institution_id);`,
        // Logistics & Security
        `CREATE INDEX IF NOT EXISTS idx_vehicles_inst ON vehicles(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicles_inst_id_desc ON vehicles(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicles_inst_id_asc ON vehicles(institution_id, id ASC);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicles_inst_plate ON vehicles(institution_id, plate_number);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicles_inst_status ON vehicles(institution_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicles_inst_driver ON vehicles(institution_id, driver_id);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicles_inst_created ON vehicles(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_id_desc ON transport_onboarding(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_timestamp ON transport_onboarding(institution_id, timestamp DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_student ON transport_onboarding(institution_id, student_id);`,
        `CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_vehicle ON transport_onboarding(institution_id, vehicle_id);`,
        `CREATE INDEX IF NOT EXISTS idx_transport_onboarding_inst_created ON transport_onboarding(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_id_desc ON vehicle_logs(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_timestamp ON vehicle_logs(institution_id, timestamp DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_vehicle ON vehicle_logs(institution_id, vehicle_id);`,
        `CREATE INDEX IF NOT EXISTS idx_vehicle_logs_inst_created ON vehicle_logs(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_id_desc ON ds_vehicles(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_plate ON ds_vehicles(institution_id, plate_number);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_status ON ds_vehicles(institution_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_vehicles_inst_created ON ds_vehicles(institution_id, created_at DESC);`,
        // Driving School Payments
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_institution_id ON ds_payments(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_id_desc ON ds_payments(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_id_asc ON ds_payments(institution_id, id ASC);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_invoice ON ds_payments(institution_id, invoice_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_student ON ds_payments(institution_id, student_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_date ON ds_payments(institution_id, payment_date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_created ON ds_payments(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_status ON ds_payments(institution_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_branch ON ds_payments(institution_id, branch_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ds_payments_inst_receipt ON ds_payments(institution_id, receipt_number);`,
        // App Notifications
        `CREATE INDEX IF NOT EXISTS idx_app_notifications_user_timestamp ON app_notifications(user_id, timestamp DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_app_notifications_user_created ON app_notifications(user_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_app_notifications_user_is_read ON app_notifications(user_id, is_read, timestamp DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_app_notifications_inst_timestamp ON app_notifications(institution_id, timestamp DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_app_notifications_inst_created ON app_notifications(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_app_notifications_id ON app_notifications(id);`,
        `CREATE INDEX IF NOT EXISTS idx_visitors_inst ON visitors(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_event_pins_inst ON event_pins(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_maint_requests_inst_id_desc ON maintenance_requests(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_maint_requests_inst_date ON maintenance_requests(institution_id, reported_at DESC);`,
        // Procurement & Requisitions
        `CREATE INDEX IF NOT EXISTS idx_requisitions_inst_id_desc ON requisitions(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_requisitions_inst_status ON requisitions(institution_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_requisitions_inst_date ON requisitions(institution_id, requested_date DESC);`,
        // Multi-Campus & Branches
        `CREATE INDEX IF NOT EXISTS idx_branches_inst_id_desc ON branches(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_branches_inst_active ON branches(institution_id, is_active);`,
        `CREATE INDEX IF NOT EXISTS idx_branches_linked_inst ON branches(linked_institution_id);`,
        // Institution Module States & Settings
        `CREATE INDEX IF NOT EXISTS idx_ims_inst_id_desc ON institution_module_states(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_ims_inst_module ON institution_module_states(institution_id, module_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ims_inst_updated ON institution_module_states(institution_id, updated_at DESC);`,
        // Resellers
        `CREATE INDEX IF NOT EXISTS idx_cwr_reseller_id ON commission_withdrawal_requests(reseller_id);`,
        `CREATE INDEX IF NOT EXISTS idx_cwr_status ON commission_withdrawal_requests(status);`,
        // Law Agreements
        `CREATE INDEX IF NOT EXISTS idx_law_templates_inst ON law_agreement_templates(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_law_templates_cat ON law_agreement_templates(category);`,
        `CREATE INDEX IF NOT EXISTS idx_law_agreements_inst ON law_agreements(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_law_agreements_tmpl ON law_agreements(template_id);`,
        `CREATE INDEX IF NOT EXISTS idx_law_agreements_status ON law_agreements(review_status);`,
        // County Inventory
        `CREATE INDEX IF NOT EXISTS idx_county_inv_cat_county ON county_inventory_categories(county_id);`,
        `CREATE INDEX IF NOT EXISTS idx_county_stores_county ON county_stores(county_id);`,
        `CREATE INDEX IF NOT EXISTS idx_county_inv_county ON county_inventory(county_id);`,
        `CREATE INDEX IF NOT EXISTS idx_county_inv_target ON county_inventory(target_institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_county_inv_status ON county_inventory(status);`,
        // Discipline Incidents
        `CREATE INDEX IF NOT EXISTS idx_disc_incidents_inst ON discipline_incidents(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_disc_incidents_student ON discipline_incidents(student_id);`,
        `CREATE INDEX IF NOT EXISTS idx_disc_incidents_status ON discipline_incidents(status);`,
        // Payment Gateways
        `CREATE INDEX IF NOT EXISTS idx_airtel_tx_inst ON airtel_transactions(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_airtel_tx_receipt ON airtel_transactions(receipt_no);`,
        `CREATE INDEX IF NOT EXISTS idx_intasend_tx_inst ON intasend_transactions(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_intasend_tx_tracking ON intasend_transactions(tracking_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ncba_tx_inst ON ncba_transactions(institution_id);`,
        `CREATE INDEX IF NOT EXISTS idx_ncba_tx_ref ON ncba_transactions(reference_no);`,
        // Activity & Telemetry Logs
        `CREATE INDEX IF NOT EXISTS idx_activity_log_inst_id_desc ON activity_log(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_activity_log_inst_timestamp ON activity_log(institution_id, "timestamp" DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_activity_log_inst_created_desc ON activity_log(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_activity_log_inst_module ON activity_log(institution_id, module);`,
        // Payroll Records, Runs & HealthCore Expenditures
        `CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_id_desc ON payroll_records(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_payment_date ON payroll_records(institution_id, payment_date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_created ON payroll_records(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_month ON payroll_records(institution_id, month);`,
        `CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_staff ON payroll_records(institution_id, staff_id);`,
        `CREATE INDEX IF NOT EXISTS idx_payroll_records_inst_status ON payroll_records(institution_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_payroll_runs_inst_id_desc ON payroll_runs(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_payroll_runs_inst_created ON payroll_runs(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_his_expenditures_inst_id_desc ON his_expenditures(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_his_expenditures_inst_date ON his_expenditures(institution_id, date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_his_expenditures_inst_created ON his_expenditures(institution_id, created_at DESC);`,
        // Vote Heads & Fee Structures
        `CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_id_desc ON vote_heads(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_id_asc ON vote_heads(institution_id, id ASC);`,
        `CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_created ON vote_heads(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_priority ON vote_heads(institution_id, priority);`,
        `CREATE INDEX IF NOT EXISTS idx_vote_heads_inst_name ON vote_heads(institution_id, name);`,
        `CREATE INDEX IF NOT EXISTS idx_vote_heads_academic_year ON vote_heads(institution_id, academic_year_id);`,
        `CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_id_desc ON fee_structures(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_id_asc ON fee_structures(institution_id, id ASC);`,
        `CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_academic_year ON fee_structures(institution_id, academic_year_id);`,
        `CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_created ON fee_structures(institution_id, created_at DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_fee_structures_inst_vote_head ON fee_structures(institution_id, vote_head_id);`,
        // Financial Periods
        `CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_id_desc ON financial_periods(institution_id, id DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_id_asc ON financial_periods(institution_id, id ASC);`,
        `CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_status ON financial_periods(institution_id, status);`,
        `CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_dates ON financial_periods(institution_id, start_date DESC, end_date DESC);`,
        `CREATE INDEX IF NOT EXISTS idx_financial_periods_inst_name ON financial_periods(institution_id, name);`
    ];

    indexStatements.forEach(stmt => {
        sql += `${stmt}\n`;
    });
    sql += `\n`;

    sql += `\n\n-- ==========================================================================\n`;
    sql += `-- SEED INITIAL SYSTEM DATA\n`;
    sql += `-- ==========================================================================\n\n`;

    // CRITICAL FIX: Explicitly ensure SYSTEM institution exists first to satisfy FK constraints for super_admin
    sql += `INSERT INTO institutions (id, name, email, phone_number, institution_type, status, institution_code, use_allocation_requests) VALUES ('SYSTEM', 'System Administration', 'system@eduai.com', '0000000000', 'University', 'active', 'SYS-ADMIN', FALSE) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;\n`;

    INITIAL_INSTITUTIONS.forEach(i => {
        if (i.id === 'SYSTEM') return; // Skip SYSTEM as it's already handled above
        sql += `INSERT INTO institutions (id, name, email, phone_number, institution_type, status, institution_code, use_allocation_requests, is_otp_enabled) VALUES (${escapeSql(i.id)}, ${escapeSql(i.name)}, ${escapeSql(i.email)}, ${escapeSql(i.phoneNumber)}, ${escapeSql(i.institutionType)}, ${escapeSql(i.status)}, ${escapeSql(i.institutionCode)}, TRUE, ${i.isOtpEnabled ? 'TRUE' : 'FALSE'}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, is_otp_enabled = EXCLUDED.is_otp_enabled;\n`;
    });

    INITIAL_ACADEMIC_LEVELS.forEach(al => {
        sql += `INSERT INTO academic_levels (id, name, institution_id) VALUES (${escapeSql(al.id)}, ${escapeSql(al.name)}, ${escapeSql(al.institutionId)}) ON CONFLICT (id) DO NOTHING;\n`;
    });

    INITIAL_ACADEMIC_YEARS.forEach(y => {
        sql += `INSERT INTO academic_years (id, name, start_date, end_date, institution_id, status) VALUES (${escapeSql(y.id)}, ${escapeSql(y.name)}, ${escapeSql(y.startDate)}, ${escapeSql(y.endDate)}, ${escapeSql(y.institutionId)}, ${escapeSql(y.status)}) ON CONFLICT (id) DO NOTHING;\n`;
    });

    INITIAL_SEMESTERS.forEach(s => {
        sql += `INSERT INTO semesters (id, name, academic_year_id, institution_id, start_date, end_date, status, sessions) VALUES (${escapeSql(s.id)}, ${escapeSql(s.name)}, ${escapeSql(s.academicYearId)}, ${escapeSql(s.institutionId)}, ${escapeSql(s.startDate)}, ${escapeSql(s.endDate)}, ${escapeSql(s.status)}, ${escapeSql(JSON.stringify(s.sessions || []))}::jsonb) ON CONFLICT (id) DO NOTHING;\n`;
    });

    INITIAL_USERS.forEach(u => {
        const expertiseStr = u.expertise && u.expertise.length > 0 ? `ARRAY[${u.expertise.map(e => escapeSql(e)).join(',')}]` : "ARRAY[]::TEXT[]";
        const rolesStr = Array.isArray(u.roles) && u.roles.length > 0 ? `ARRAY[${u.roles.map(r => escapeSql(r)).join(',')}]` : `ARRAY[${escapeSql(u.role)}]`;
        sql += `INSERT INTO users (id, name, email, phone_number, staff_id, role, roles, institution_id, department_id, expertise, course_id, course_level_id, password) VALUES (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.phoneNumber)}, ${escapeSql(u.staffId)}, ${escapeSql(u.role)}, ${rolesStr}, ${escapeSql(u.institutionId)}, ${escapeSql(u.departmentId)}, ${expertiseStr}, ${escapeSql(u.courseId)}, ${escapeSql(u.courseLevelId)}, ${escapeSql(u.password)}) ON CONFLICT (id) DO NOTHING;\n`;
    });

    return sql;
};
