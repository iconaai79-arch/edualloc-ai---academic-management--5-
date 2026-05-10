-- 201. CONSOLIDATED DRIVING SCHOOL SCHEMA UPDATE
-- Ensures all tables match the V2 UI requirements

-- 1. Ensure Instructor columns exist
ALTER TABLE ds_instructors ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE ds_instructors ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE ds_instructors ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE ds_instructors ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id) ON DELETE SET NULL;

-- 2. Ensure Vehicle columns exist
ALTER TABLE ds_vehicles ADD COLUMN IF NOT EXISTS make TEXT;
ALTER TABLE ds_vehicles ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE ds_vehicles ADD COLUMN IF NOT EXISTS transmission TEXT DEFAULT 'Manual';

-- 3. Ensure Student columns exist
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE ds_students ADD COLUMN IF NOT EXISTS license_type_interested TEXT;

-- 4. Ensure Lesson columns are compatible (TEXT is safer for our proxy-based time strings)
-- Note: We use DO block to avoid errors if already converted
DO $$ 
BEGIN 
    ALTER TABLE ds_lessons ALTER COLUMN start_time TYPE TEXT;
    ALTER TABLE ds_lessons ALTER COLUMN end_time TYPE TEXT;
EXCEPTION WHEN others THEN 
    -- If they are already text or have data that can't be converted easily, we skip
END $$;

-- 5. Ensure Settings table has fee_structures
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS fee_structures JSONB DEFAULT '[]'::jsonb;
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS lesson_price_practical DECIMAL(12, 2);
ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS lesson_price_theory DECIMAL(12, 2);

-- 6. Create Financial Tables if they don't exist (from V2)
CREATE TABLE IF NOT EXISTS ds_fee_structures (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(invoice_number, institution_id)
);

CREATE TABLE IF NOT EXISTS ds_payments (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    invoice_id TEXT NOT NULL REFERENCES ds_invoices(id) ON DELETE CASCADE,
    student_name TEXT,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    transaction_reference TEXT,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    receipt_number TEXT NOT NULL,
    received_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(receipt_number, institution_id)
);

-- 7. Re-apply RLS Policies to ensure consistent institutional tenancy
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN SELECT table_name FROM information_schema.tables WHERE table_name LIKE 'ds_%' AND table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy select: %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy select: %I" ON %I FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('DROP POLICY IF EXISTS "Institutional tenancy manage: %I" ON %I', t, t);
        EXECUTE format('CREATE POLICY "Institutional tenancy manage: %I" ON %I FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);
        
        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;
