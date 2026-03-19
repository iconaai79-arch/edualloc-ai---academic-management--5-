-- 109. HIS PHARMACY & BILLING WORKFLOW
CREATE TABLE IF NOT EXISTS his_pharmacy_inventory (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT, -- e.g. Antibiotics, Painkillers, Consumables
    unit TEXT, -- e.g. Tablet, Bottle, Vial
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
    status TEXT DEFAULT 'pending', -- pending, dispensed, cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_prescription_items (
    id TEXT PRIMARY KEY,
    prescription_id TEXT REFERENCES his_prescriptions(id) ON DELETE CASCADE,
    drug_id TEXT REFERENCES his_pharmacy_inventory(id) ON DELETE SET NULL,
    drug_name TEXT NOT NULL,
    dosage TEXT, -- e.g. 500mg
    frequency TEXT, -- e.g. 3x daily
    duration TEXT, -- e.g. 5 days
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_price DECIMAL(10,2) DEFAULT 0,
    instructions TEXT
);

CREATE TABLE IF NOT EXISTS his_billing_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT NOT NULL REFERENCES his_patients(id) ON DELETE CASCADE,
    source_type TEXT NOT NULL, -- pharmacy, lab, consultation, procedure
    source_id TEXT, -- ID of the specific prescription, test result, or procedure
    item_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, invoiced, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Enforcement
ALTER TABLE his_pharmacy_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_billing_items ENABLE ROW LEVEL SECURITY;

-- Polices for his_pharmacy_inventory
DROP POLICY IF EXISTS "Pharmacy inventory access" ON his_pharmacy_inventory;
CREATE POLICY "Pharmacy inventory access" ON his_pharmacy_inventory FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
WITH CHECK (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

-- Policies for his_prescriptions
DROP POLICY IF EXISTS "HIS prescriptions access" ON his_prescriptions;
CREATE POLICY "HIS prescriptions access" ON his_prescriptions FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
WITH CHECK (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

-- Policies for his_prescription_items
DROP POLICY IF EXISTS "HIS prescription items access" ON his_prescription_items;
CREATE POLICY "HIS prescription items access" ON his_prescription_items FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR (SELECT institution_id FROM his_prescriptions WHERE id = prescription_id) = public.get_curr_user_inst_id())
WITH CHECK (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR (SELECT institution_id FROM his_prescriptions WHERE id = prescription_id) = public.get_curr_user_inst_id());

-- Policies for his_billing_items
DROP POLICY IF EXISTS "HIS billing items access" ON his_billing_items;
CREATE POLICY "HIS billing items access" ON his_billing_items FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
WITH CHECK (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

-- Grants
GRANT ALL ON public.his_pharmacy_inventory TO anon, authenticated, service_role;
GRANT ALL ON public.his_prescriptions TO anon, authenticated, service_role;
GRANT ALL ON public.his_prescription_items TO anon, authenticated, service_role;
GRANT ALL ON public.his_billing_items TO anon, authenticated, service_role;
