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
    type TEXT NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    date DATE NOT NULL,
    department TEXT,
    payment_method TEXT,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Standard HIS Policies with Super Admin Bypass
-- his_staff
DROP POLICY IF EXISTS "HIS staff access" ON his_staff;
CREATE POLICY "HIS staff access" ON his_staff FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_patients
DROP POLICY IF EXISTS "HIS patients access" ON his_patients;
CREATE POLICY "HIS patients access" ON his_patients FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_wards
DROP POLICY IF EXISTS "HIS wards access" ON his_wards;
CREATE POLICY "HIS wards access" ON his_wards FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_beds
DROP POLICY IF EXISTS "HIS beds access" ON his_beds;
CREATE POLICY "HIS beds access" ON his_beds FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_admissions
DROP POLICY IF EXISTS "HIS admissions access" ON his_admissions;
CREATE POLICY "HIS admissions access" ON his_admissions FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_appointments
DROP POLICY IF EXISTS "HIS appointments access" ON his_appointments;
CREATE POLICY "HIS appointments access" ON his_appointments FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_staff_attendance
DROP POLICY IF EXISTS "HIS staff attendance access" ON his_staff_attendance;
CREATE POLICY "HIS staff attendance access" ON his_staff_attendance FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_dental_charts
DROP POLICY IF EXISTS "HIS dental charts access" ON his_dental_charts;
CREATE POLICY "HIS dental charts access" ON his_dental_charts FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_eye_prescriptions
DROP POLICY IF EXISTS "HIS eye prescriptions access" ON his_eye_prescriptions;
CREATE POLICY "HIS eye prescriptions access" ON his_eye_prescriptions FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_medication_logs
DROP POLICY IF EXISTS "HIS medication logs access" ON his_medication_logs;
CREATE POLICY "HIS medication logs access" ON his_medication_logs FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_financial_records
DROP POLICY IF EXISTS "HIS financial records access" ON his_financial_records;
CREATE POLICY "HIS financial records access" ON his_financial_records FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);

-- his_broadcasts
DROP POLICY IF EXISTS "HIS broadcasts access" ON his_broadcasts;
CREATE POLICY "HIS broadcasts access" ON his_broadcasts FOR ALL USING (
    institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text) 
    OR (SELECT role FROM users WHERE id = auth.uid()::text) = 'super_admin'
);
