-- 107. HIS CLINICAL RECORDS AND VITALS
CREATE TABLE IF NOT EXISTS his_vital_statistics (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    color TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_clinical_events (
    id TEXT PRIMARY KEY,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    time TEXT,
    event TEXT NOT NULL,
    dept TEXT,
    provider TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE his_vital_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_clinical_events ENABLE ROW LEVEL SECURITY;

-- FAIL-SAFE RLS Policies using direct JWT fallback
DROP POLICY IF EXISTS "HIS vitals access" ON his_vital_statistics;
CREATE POLICY "HIS vitals access" ON his_vital_statistics FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
WITH CHECK (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

DROP POLICY IF EXISTS "HIS events access" ON his_clinical_events;
CREATE POLICY "HIS events access" ON his_clinical_events FOR ALL 
USING (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text)
WITH CHECK (auth.jwt() ->> 'email' = 'super@app.com' OR public.get_curr_user_role() = 'super_admin' OR public.get_curr_user_inst_id() = institution_id::text);

-- Grant Permissions
GRANT ALL ON public.his_vital_statistics TO anon, authenticated, service_role;
GRANT ALL ON public.his_clinical_events TO anon, authenticated, service_role;
