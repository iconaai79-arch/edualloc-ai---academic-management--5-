-- 108. HIS LAB AND DIAGNOSTICS
-- This table stores laboratory requests and results
CREATE TABLE IF NOT EXISTS his_lab_requests (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    requested_by TEXT NOT NULL,
    test_type TEXT NOT NULL,
    priority TEXT DEFAULT 'Routine',
    clinical_notes TEXT,
    status TEXT DEFAULT 'Pending',
    results TEXT,
    technician_id TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable Security Policies
ALTER TABLE his_lab_requests ENABLE ROW LEVEL SECURITY;

-- Grant Permissions
GRANT ALL ON public.his_lab_requests TO anon, authenticated, service_role;

-- Add Access Policies
CREATE POLICY "HIS labs access" ON his_lab_requests FOR ALL 
USING (public.get_curr_user_inst_id() = institution_id::text)
WITH CHECK (public.get_curr_user_inst_id() = institution_id::text);
