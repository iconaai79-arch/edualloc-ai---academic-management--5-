
-- Add Allergies and Chronic Conditions to Patients
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS allergies TEXT;
ALTER TABLE his_patients ADD COLUMN IF NOT EXISTS chronic_conditions TEXT;

-- Create his_claims table for SHA/SHIF integration
CREATE TABLE IF NOT EXISTS his_claims (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES his_patients(id) ON DELETE CASCADE,
    visit_id TEXT, -- References a clinical event
    icd_code TEXT,
    service_type TEXT, -- e.g., Consultation, Surgery, Lab
    amount DECIMAL(12,2),
    status TEXT DEFAULT 'Pending', -- Pending, Submitted, Approved, Rejected, Paid
    claim_number TEXT UNIQUE,
    sha_response_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_his_claims_institution ON his_claims(institution_id);
CREATE INDEX IF NOT EXISTS idx_his_claims_patient ON his_claims(patient_id);
CREATE INDEX IF NOT EXISTS idx_his_claims_status ON his_claims(status);

-- Enable RLS
ALTER TABLE his_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view claims from their institution"
    ON his_claims FOR SELECT
    USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text));

CREATE POLICY "Users can manage claims from their institution"
    ON his_claims FOR ALL
    USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text));
