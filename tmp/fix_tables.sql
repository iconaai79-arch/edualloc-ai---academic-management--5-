-- NCBA Notification Support (Add columns if missing)
-- Note: Assuming NcbaConfig object is stored as JSONB in company_details or institution settings.
-- If they are separate columns, we would add them here. 
-- However, the app seems to use a JSONB property 'ncbaConfig'.

-- Cooperative Module Tables
CREATE TABLE IF NOT EXISTS public.coop_income (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    farmer_id UUID, -- For cases where income is linked to a farmer
    description TEXT,
    company_name TEXT,
    product_type TEXT,
    quantity DECIMAL(15, 2),
    unit TEXT,
    amount DECIMAL(15, 2),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date TEXT, -- Legacy support
    status TEXT DEFAULT 'received',
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.coop_expense (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    farmer_id UUID, -- For advances
    description TEXT,
    category TEXT,
    amount DECIMAL(15, 2),
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date TEXT, -- Legacy support
    status TEXT DEFAULT 'pending',
    attachment_url TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HIS Pharmacy Tables
CREATE TABLE IF NOT EXISTS public.his_pharmacy_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    name TEXT,
    category TEXT,
    unit TEXT,
    unit_price DECIMAL(15, 2),
    stock_quantity DECIMAL(15, 2),
    reorder_level DECIMAL(15, 2),
    interaction_code TEXT,
    is_narcotic BOOLEAN DEFAULT FALSE,
    sku TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_pharmacy_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    patient_id UUID,
    customer_name TEXT,
    customer_phone TEXT,
    total_amount DECIMAL(15, 2),
    payment_method TEXT,
    payment_status TEXT,
    staff_id TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_pharmacy_sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID,
    medication_id UUID,
    batch_id UUID,
    quantity DECIMAL(15, 2),
    unit_price DECIMAL(15, 2),
    total_price DECIMAL(15, 2),
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_pharmacy_batches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    medication_id UUID,
    batch_number TEXT,
    expiry_date DATE,
    quantity DECIMAL(15, 2),
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_pharmacy_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    type TEXT,
    category TEXT,
    amount DECIMAL(15, 2),
    reference_id TEXT,
    description TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_pharmacy_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    user_id UUID,
    full_name TEXT,
    role TEXT,
    specialization TEXT,
    license_number TEXT,
    salary DECIMAL(15, 2),
    hire_date DATE,
    shift_preference TEXT,
    status TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_pharmacy_adherence_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    patient_id UUID,
    message TEXT,
    status TEXT,
    last_sent_at TIMESTAMP WITH TIME ZONE,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_pharmacy_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    pharmacy_name TEXT,
    pharmacy_logo TEXT,
    pharmacy_license TEXT,
    pharmacy_email TEXT,
    pharmacy_phone TEXT,
    receipt_header TEXT,
    receipt_footer TEXT,
    low_stock_threshold DECIMAL(15, 2),
    enable_sms_reminders BOOLEAN DEFAULT TRUE,
    recorded_by TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    name TEXT,
    phone TEXT,
    email TEXT,
    gender TEXT,
    date_of_birth DATE,
    address TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.his_prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID,
    patient_id UUID,
    doctor_id TEXT,
    doctor_name TEXT,
    status TEXT,
    notes TEXT,
    clinical_notes TEXT,
    attached_files TEXT[],
    medication_image TEXT,
    recorded_by TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure recorded_by exists in all these tables (in case they already existed without it)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'coop_income', 'coop_expense', 'his_pharmacy_inventory', 
            'his_pharmacy_sales', 'his_pharmacy_sale_items', 'his_pharmacy_batches',
            'his_pharmacy_ledger', 'his_pharmacy_staff', 'his_pharmacy_adherence_alerts',
            'his_pharmacy_settings', 'his_patients', 'his_prescriptions'
        )
    LOOP
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS recorded_by TEXT', t);
    END LOOP;
END $$;
