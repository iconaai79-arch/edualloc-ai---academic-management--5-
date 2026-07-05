-- ==========================================================================
-- EduAi Automation - Beauty College Schema Migration
-- ==========================================================================

-- 1. bc_trainers Table
CREATE TABLE IF NOT EXISTS public.bc_trainers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    specialization TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. bc_courses Table
CREATE TABLE IF NOT EXISTS public.bc_courses (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
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

-- 3. bc_students Table
CREATE TABLE IF NOT EXISTS public.bc_students (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    course_id TEXT REFERENCES public.bc_courses(id) ON DELETE SET NULL,
    kit_issued_status TEXT DEFAULT 'Pending',
    practical_hours_completed INTEGER DEFAULT 0,
    status TEXT DEFAULT 'Enrolled',
    enrollment_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. bc_practicals Table
CREATE TABLE IF NOT EXISTS public.bc_practicals (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.bc_students(id) ON DELETE CASCADE,
    trainer_id TEXT REFERENCES public.bc_trainers(id) ON DELETE SET NULL,
    session_date DATE NOT NULL,
    hours INTEGER DEFAULT 1,
    topic TEXT,
    status TEXT DEFAULT 'Completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. bc_settings Table
CREATE TABLE IF NOT EXISTS public.bc_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    fee_installment_split INTEGER DEFAULT 3,
    invoice_prefix TEXT DEFAULT 'BC-INV',
    receipt_prefix TEXT DEFAULT 'BC-REC',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. bc_fee_structures Table
CREATE TABLE IF NOT EXISTS public.bc_fee_structures (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    course_id TEXT NOT NULL REFERENCES public.bc_courses(id) ON DELETE CASCADE,
    items JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. bc_invoices Table
CREATE TABLE IF NOT EXISTS public.bc_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.bc_students(id) ON DELETE CASCADE,
    student_name TEXT NOT NULL,
    course_id TEXT REFERENCES public.bc_courses(id) ON DELETE SET NULL,
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

-- 8. bc_payments Table
CREATE TABLE IF NOT EXISTS public.bc_payments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES public.bc_invoices(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES public.bc_students(id) ON DELETE CASCADE,
    student_name TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number TEXT NOT NULL,
    received_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for all newly created tables
ALTER TABLE public.bc_trainers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_practicals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_fee_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bc_payments ENABLE ROW LEVEL SECURITY;

-- Apply Tenancy RLS Policies
DO $bc_policy$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'bc_settings', 'bc_courses', 'bc_students', 'bc_trainers', 'bc_fee_structures', 'bc_invoices', 'bc_payments', 'bc_practicals'
    ]) LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %%I" ON public.%%I', t, t);
            EXECUTE format('CREATE POLICY "Institutional tenancy select: %%I" ON public.%%I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
            
            EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %%I" ON public.%%I', t, t);
            EXECUTE format('CREATE POLICY "Institutional tenancy manage: %%I" ON public.%%I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        END IF;
    END LOOP;
END $bc_policy$;
