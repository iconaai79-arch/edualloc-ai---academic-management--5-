-- 133. PHARMACY MODULE SETTINGS
CREATE TABLE IF NOT EXISTS his_pharmacy_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    pharmacy_name TEXT,
    pharmacy_logo TEXT,
    pharmacy_license TEXT,
    pharmacy_email TEXT,
    pharmacy_phone TEXT,
    receipt_header TEXT,
    receipt_footer TEXT,
    low_stock_threshold INTEGER DEFAULT 10,
    enable_sms_reminders BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(institution_id)
);

ALTER TABLE his_pharmacy_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Pharmacy settings access" ON his_pharmacy_settings FOR ALL 
USING (public.get_curr_user_inst_id() = institution_id::text);

GRANT ALL ON his_pharmacy_settings TO anon, authenticated, service_role;
