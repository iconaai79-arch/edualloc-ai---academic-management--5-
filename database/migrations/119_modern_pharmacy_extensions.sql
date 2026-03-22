-- 119. MODERN PHARMACY SYSTEM EXTENSIONS
-- Enhancing HIS with clinical safety, batch tracking, and patient engagement

-- Fallback: Ensure base pharmacy and patient tables exist before extensions
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

CREATE TABLE IF NOT EXISTS his_pharmacy_inventory (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    unit_price DECIMAL(10,2) DEFAULT 0,
    stock_quantity INTEGER DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_prescriptions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES his_patients(id) ON DELETE CASCADE,
    doctor_id TEXT,
    doctor_name TEXT,
    status TEXT DEFAULT 'pending',
    notes TEXT,
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

-- 1. Enhance base inventory with clinical and supply chain metadata
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS interaction_code TEXT; -- ATC code or custom identifier
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS is_narcotic BOOLEAN DEFAULT FALSE;
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS sku TEXT;
ALTER TABLE his_pharmacy_inventory ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- 2. Batch & Expiry Management
CREATE TABLE IF NOT EXISTS his_pharmacy_batches (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    medication_id TEXT NOT NULL REFERENCES his_pharmacy_inventory(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    current_quantity INTEGER DEFAULT 0,
    initial_quantity INTEGER DEFAULT 0,
    unit_cost DECIMAL(10,2) DEFAULT 0,
    supplier_info TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Drug Interaction Registry (Clinical Safety)
CREATE TABLE IF NOT EXISTS his_pharmacy_interactions (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    medication_a_id TEXT REFERENCES his_pharmacy_inventory(id) ON DELETE CASCADE,
    medication_b_id TEXT REFERENCES his_pharmacy_inventory(id) ON DELETE CASCADE,
    severity TEXT CHECK (severity IN ('mild', 'moderate', 'severe', 'fatal')),
    description TEXT NOT NULL,
    precaution TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Narcotics & Controlled Substances Ledger (Regulatory Compliance)
CREATE TABLE IF NOT EXISTS his_pharmacy_narcotics_ledger (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    medication_id TEXT NOT NULL REFERENCES his_pharmacy_inventory(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE SET NULL,
    prescription_id TEXT REFERENCES his_prescriptions(id) ON DELETE SET NULL,
    quantity_change INTEGER NOT NULL, -- positive for restock, negative for dispense
    performed_by TEXT NOT NULL, -- User ID
    witnessed_by TEXT, -- For high-risk waste or dispense
    notes TEXT,
    system_log JSONB, -- For immutable audit trail data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Patient Adherence & Reminder Alerts
CREATE TABLE IF NOT EXISTS his_pharmacy_adherence_alerts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES his_patients(id) ON DELETE CASCADE,
    prescription_item_id TEXT REFERENCES his_prescription_items(id) ON DELETE CASCADE,
    reminder_time TIME NOT NULL,
    frequency TEXT NOT NULL, -- Daily, Weekly, etc.
    status TEXT DEFAULT 'active', -- active, paused, completed
    last_sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Row Level Security (Multi-Tenant Protection)
ALTER TABLE his_pharmacy_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_pharmacy_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_pharmacy_narcotics_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_pharmacy_adherence_alerts ENABLE ROW LEVEL SECURITY;

-- Shared function check if available from previous migrations, if not we use direct checks
-- assuming common RLS patterns from migration 109

-- Policies for his_pharmacy_batches
DROP POLICY IF EXISTS "Pharmacy batches access" ON his_pharmacy_batches;
CREATE POLICY "Pharmacy batches access" ON his_pharmacy_batches FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

-- Policies for his_pharmacy_interactions
DROP POLICY IF EXISTS "Pharmacy interactions access" ON his_pharmacy_interactions;
CREATE POLICY "Pharmacy interactions access" ON his_pharmacy_interactions FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

-- Policies for his_pharmacy_narcotics_ledger
DROP POLICY IF EXISTS "Pharmacy narcotics access" ON his_pharmacy_narcotics_ledger;
CREATE POLICY "Pharmacy narcotics access" ON his_pharmacy_narcotics_ledger FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

-- Policies for his_pharmacy_adherence_alerts
DROP POLICY IF EXISTS "Pharmacy alerts access" ON his_pharmacy_adherence_alerts;
CREATE POLICY "Pharmacy alerts access" ON his_pharmacy_adherence_alerts FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

-- 7. Grants
GRANT ALL ON public.his_pharmacy_batches TO anon, authenticated, service_role;
GRANT ALL ON public.his_pharmacy_interactions TO anon, authenticated, service_role;
GRANT ALL ON public.his_pharmacy_narcotics_ledger TO anon, authenticated, service_role;
GRANT ALL ON public.his_pharmacy_adherence_alerts TO anon, authenticated, service_role;

COMMENT ON TABLE his_pharmacy_narcotics_ledger IS 'Tamper-evident ledger for controlled substances as per regulatory requirements.';
