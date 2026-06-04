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
    sql += `-- EduAi Academic & Institutional Management Platform - Master Schema\n`;
    sql += `-- Generated on: ${new Date().toLocaleString()}\n`;
    sql += `-- ==========================================================================\n\n`;

    sql += `-- 1. CORE SYSTEM & TENANCY --\n`;
    sql += `
CREATE TABLE IF NOT EXISTS institutions (
    id TEXT PRIMARY KEY,
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
    grading_systems JSONB DEFAULT '[]'::jsonb,
    active_grading_system_id TEXT,
    timetable_settings JSONB,
    exam_timetable_settings JSONB,
    use_allocation_requests BOOLEAN DEFAULT TRUE,
    schedule_profiles JSONB DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS system_settings (
    id INTEGER PRIMARY KEY,
    data JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS activity_log (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    user_name TEXT NOT NULL,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    institution_name TEXT,
    action TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address TEXT,
    mac_address TEXT,
    imei TEXT
);
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
    preferences JSONB,
    signature_url TEXT,
    course_level_ids TEXT[] DEFAULT '{}',
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
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS financial_periods (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'inactive',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
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
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
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
    organization_short_code TEXT,
    till_number TEXT
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
    student_id TEXT REFERENCES users(id) ON DELETE SET NULL
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
    student_id TEXT REFERENCES users(id) ON DELETE SET NULL
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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

CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    isbn TEXT,
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
    issue_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    return_date TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'issued',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE
);

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
    purpose TEXT,
    visit_date DATE NOT NULL,
    time_in TEXT,
    time_out TEXT,
    host_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    vehicle_plate TEXT,
    vehicle_model TEXT
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

CREATE TABLE IF NOT EXISTS extension_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    requester_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
`;

    sql += `\n\n-- ==========================================================================\n`;
    sql += `-- SEED INITIAL SYSTEM DATA\n`;
    sql += `-- ==========================================================================\n\n`;

    INITIAL_INSTITUTIONS.forEach(i => {
        sql += `INSERT INTO institutions (id, name, email, phone_number, institution_type, status, institution_code, use_allocation_requests) VALUES (${escapeSql(i.id)}, ${escapeSql(i.name)}, ${escapeSql(i.email)}, ${escapeSql(i.phoneNumber)}, ${escapeSql(i.institutionType)}, ${escapeSql(i.status)}, ${escapeSql(i.institutionCode)}, TRUE) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status;\n`;
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
        sql += `INSERT INTO users (id, name, email, phone_number, staff_id, role, institution_id, department_id, expertise, course_id, course_level_id, password) VALUES (${escapeSql(u.id)}, ${escapeSql(u.name)}, ${escapeSql(u.email)}, ${escapeSql(u.phoneNumber)}, ${escapeSql(u.staffId)}, ${escapeSql(u.role)}, ${escapeSql(u.institutionId)}, ${escapeSql(u.departmentId)}, ${expertiseStr}, ${escapeSql(u.courseId)}, ${escapeSql(u.courseLevelId)}, ${escapeSql(u.password)}) ON CONFLICT (id) DO NOTHING;\n`;
    });

    return sql;
};