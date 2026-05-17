-- 200. UPDATED DRIVING SCHOOL MODULE SCHEMA (V2)
-- Consolidated schema with Financials, Fee Structures, and RLS

-- Instructors Table (Updated with user_id)
CREATE TABLE IF NOT EXISTS ds_instructors (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    license_number TEXT,
    specialization TEXT, -- e.g., Manual, Automatic, Heavy Duty
    status TEXT DEFAULT 'Active', -- Active, Inactive, On Leave
    rating DECIMAL(3,2) DEFAULT 5.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles Table
CREATE TABLE IF NOT EXISTS ds_vehicles (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL,
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    transmission TEXT NOT NULL DEFAULT 'Manual', -- Manual, Automatic
    vehicle_type TEXT, -- Car, Truck, Motorcycle
    assigned_instructor_id TEXT REFERENCES ds_instructors(id) ON DELETE SET NULL,
    last_service_date DATE,
    next_service_date DATE,
    status TEXT DEFAULT 'Operational', -- Operational, Maintenance, Out of Service
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plate_number, institution_id)
);

-- Students Table
CREATE TABLE IF NOT EXISTS ds_students (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    passport_number TEXT,
    phone TEXT,
    license_type_interested TEXT, -- Class B, Class C, etc.
    preferred_lesson_hours TEXT,
    theory_progress_percent INTEGER DEFAULT 0,
    practical_progress_percent INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Enrolled', -- Enrolled, Graduated, Dropped
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure email column exists for older schema versions
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS email TEXT;

-- Lessons Table
CREATE TABLE IF NOT EXISTS ds_lessons (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    instructor_id TEXT REFERENCES ds_instructors(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES ds_vehicles(id) ON DELETE SET NULL,
    lesson_date DATE NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    lesson_type TEXT NOT NULL DEFAULT 'Practical', -- Practical, Theory
    topic TEXT,
    status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled, No Show
    confirmation_status TEXT,
    room_id TEXT,
    room_name TEXT,
    instructor_notes TEXT,
    route_tracked_data JSONB, -- GPS points if available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skill Mastery / Progress Log
CREATE TABLE IF NOT EXISTS ds_skill_mastery (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES ds_students(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    recorded_by TEXT, -- Instructor ID or name
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table (Updated with fee_structures JSONB)
CREATE TABLE IF NOT EXISTS ds_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    lesson_price_practical DECIMAL(12, 2),
    lesson_price_theory DECIMAL(12, 2),
    fee_structures JSONB DEFAULT '[]'::jsonb,
    cancellation_policy TEXT,
    working_hours JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(institution_id)
);

-- Fee Structures Table (Dedicated for templates)
CREATE TABLE IF NOT EXISTS ds_fee_structures (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    items JSONB NOT NULL, -- [{name: string, amount: number}]
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices Table
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
    status TEXT DEFAULT 'Pending', -- Pending, Partially Paid, Fully Paid, Cancelled
    invoice_number TEXT NOT NULL,
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invoice_number, institution_id)
);

-- Payments Table
CREATE TABLE IF NOT EXISTS ds_payments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES ds_invoices(id) ON DELETE CASCADE,
    student_name TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- M-Pesa, Cash, Bank Transfer, KCB IPN
    transaction_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number TEXT NOT NULL,
    received_by TEXT, -- User ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(receipt_number, institution_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_ds_lessons_student ON ds_lessons(student_id);
CREATE INDEX IF NOT EXISTS idx_ds_lessons_date ON ds_lessons(lesson_date);
CREATE INDEX IF NOT EXISTS idx_ds_invoices_student ON ds_invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_ds_payments_invoice ON ds_payments(invoice_id);

-- Enable RLS for all tables
ALTER TABLE ds_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_skill_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_payments ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies for all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ds_%' AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON %I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON %I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;
