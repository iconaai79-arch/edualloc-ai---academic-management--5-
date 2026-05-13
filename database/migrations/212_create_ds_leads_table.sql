-- 212. CREATE DRIVING SCHOOL LEADS / ENQUIRIES TABLE
-- Stores pre-enrollment walk-in leads, prospective students, and pricing quotations dispatched via SMS/Email.

CREATE TABLE IF NOT EXISTS ds_leads (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    license_type_interested TEXT,
    source TEXT DEFAULT 'Walk-in',
    status TEXT DEFAULT 'New Enquiry',
    quoted_amount DECIMAL(12, 2) DEFAULT 0,
    fee_structure_id TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE ds_leads ENABLE ROW LEVEL SECURITY;

-- Apply standard multi-tenant scoping policies
DO $$
BEGIN
    DROP POLICY IF EXISTS "Institutional tenancy select: ds_leads" ON ds_leads;
    CREATE POLICY "Institutional tenancy select: ds_leads" ON ds_leads 
        FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
        
    DROP POLICY IF EXISTS "Institutional tenancy manage: ds_leads" ON ds_leads;
    CREATE POLICY "Institutional tenancy manage: ds_leads" ON ds_leads 
        FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');
        
    GRANT ALL ON public.ds_leads TO anon, authenticated, service_role;
END $$;
