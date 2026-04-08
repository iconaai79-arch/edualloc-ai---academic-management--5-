-- 13. DRIVING SCHOOL MODULE SCHEMA

-- Instructors Table
CREATE TABLE IF NOT EXISTS ds_instructors (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
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
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    transmission TEXT DEFAULT 'Manual', -- Manual, Automatic
    vehicle_type TEXT, -- Car, Truck, Motorcycle
    last_service_date DATE,
    next_service_date DATE,
    status TEXT DEFAULT 'Operational', -- Operational, Maintenance, Out of Service
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(plate_number, institution_id)
);

-- Students Table (Specific to Driving School context)
CREATE TABLE IF NOT EXISTS ds_students (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    passport_number TEXT,
    phone TEXT,
    license_type_interested TEXT, -- Class B, Class C, etc.
    theory_progress_percent INTEGER DEFAULT 0,
    practical_progress_percent INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Enrolled', -- Enrolled, Graduated, Dropped
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Lessons Table
CREATE TABLE IF NOT EXISTS ds_lessons (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES ds_students(id) ON DELETE CASCADE,
    instructor_id TEXT REFERENCES ds_instructors(id) ON DELETE SET NULL,
    vehicle_id TEXT REFERENCES ds_vehicles(id) ON DELETE SET NULL,
    lesson_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    lesson_type TEXT DEFAULT 'Practical', -- Practical, Theory
    topic TEXT,
    status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Cancelled, No Show
    instructor_notes TEXT,
    route_tracked_data JSONB, -- GPS points if available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skill Mastery / Progress Log
CREATE TABLE IF NOT EXISTS ds_skill_mastery (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES ds_students(id) ON DELETE CASCADE,
    skill_name TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comments TEXT,
    recorded_by TEXT REFERENCES ds_instructors(id),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings Table
CREATE TABLE IF NOT EXISTS ds_settings (
    institution_id TEXT PRIMARY KEY REFERENCES institutions(id) ON DELETE CASCADE,
    lesson_price_practical DECIMAL(10,2),
    lesson_price_theory DECIMAL(10,2),
    cancellation_policy TEXT,
    working_hours JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE ds_instructors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_skill_mastery ENABLE ROW LEVEL SECURITY;
ALTER TABLE ds_settings ENABLE ROW LEVEL SECURITY;

-- Dynamic Policies for all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ds_%' AND table_schema = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Access by institution" ON %I', t);
        EXECUTE format('CREATE POLICY "Access by institution" ON %I FOR ALL USING (auth.jwt() ->> ''email'' = ''super@app.com'' OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() = institution_id::text) WITH CHECK (auth.jwt() ->> ''email'' = ''super@app.com'' OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() = institution_id::text)', t);
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;
