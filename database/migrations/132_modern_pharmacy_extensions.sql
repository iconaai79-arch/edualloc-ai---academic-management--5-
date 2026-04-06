-- 132. MODERN PHARMACY POS, HR & ACCOUNTING
-- Futuristic Pharmacy Management Extensions

-- 1. POS SALES TRACKING
CREATE TABLE IF NOT EXISTS his_pharmacy_sales (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    customer_name TEXT, -- For walk-ins
    customer_phone TEXT, -- For walk-ins/SMS
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'Cash',
    payment_status TEXT DEFAULT 'Paid',
    staff_id TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_pharmacy_sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES his_pharmacy_sales(id) ON DELETE CASCADE,
    medication_id TEXT REFERENCES his_pharmacy_inventory(id) ON DELETE SET NULL,
    batch_id TEXT REFERENCES his_pharmacy_batches(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. PHARMACY LEDGER (ACCOUNTING)
CREATE TABLE IF NOT EXISTS his_pharmacy_ledger (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('Income', 'Expense')),
    category TEXT, -- e.g., 'Drug Purchase', 'Sales', 'Staff Salary', 'Maintenance'
    amount DECIMAL(15,2) NOT NULL DEFAULT 0,
    reference_id TEXT, -- sale_id or batch_id
    description TEXT,
    recorded_by TEXT REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. PHARMACY STAFF & HR
CREATE TABLE IF NOT EXISTS his_pharmacy_staff (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    full_name TEXT, -- Decoupled ID
    role TEXT DEFAULT 'Pharmacist', -- Senior Pharmacist, Technician, Cashier
    specialization TEXT,
    license_number TEXT,
    salary DECIMAL(12,2) DEFAULT 0,
    hire_date DATE DEFAULT CURRENT_DATE,
    shift_preference TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. PRESCRIPTION EXTENSIONS
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS clinical_notes TEXT;
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS attached_files TEXT[]; -- URLs to scanned prescriptions
ALTER TABLE his_prescriptions ADD COLUMN IF NOT EXISTS medication_image TEXT; -- URL to image of medications dispensed

-- 5. ADHERENCE REMINDERS (Fallback if not in 119)
CREATE TABLE IF NOT EXISTS his_pharmacy_adherence_alerts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES his_patients(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    frequency TEXT NOT NULL, -- Daily, Weekly, etc.
    status TEXT DEFAULT 'active', -- active, paused, completed
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. ROW LEVEL SECURITY
ALTER TABLE his_pharmacy_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_pharmacy_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_pharmacy_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_pharmacy_staff ENABLE ROW LEVEL SECURITY;

-- Shared function check if available from previous migrations
-- assuming common RLS patterns

CREATE POLICY "Pharmacy sales access" ON his_pharmacy_sales FOR ALL 
USING (public.get_curr_user_inst_id() = institution_id::text);

CREATE POLICY "Pharmacy sale items access" ON his_pharmacy_sale_items FOR ALL 
USING (EXISTS (SELECT 1 FROM his_pharmacy_sales s WHERE s.id = sale_id AND s.institution_id = public.get_curr_user_inst_id()));

CREATE POLICY "Pharmacy ledger access" ON his_pharmacy_ledger FOR ALL 
USING (public.get_curr_user_inst_id() = institution_id::text);

CREATE POLICY "Pharmacy staff access" ON his_pharmacy_staff FOR ALL 
USING (public.get_curr_user_inst_id() = institution_id::text);

CREATE POLICY "Pharmacy adherence alerts access" ON his_pharmacy_adherence_alerts FOR ALL 
USING (public.get_curr_user_inst_id() = institution_id::text);

-- 6. GRANTS
GRANT ALL ON his_pharmacy_sales TO anon, authenticated, service_role;
GRANT ALL ON his_pharmacy_sale_items TO anon, authenticated, service_role;
GRANT ALL ON his_pharmacy_ledger TO anon, authenticated, service_role;
GRANT ALL ON his_pharmacy_staff TO anon, authenticated, service_role;
GRANT ALL ON his_pharmacy_adherence_alerts TO anon, authenticated, service_role;
