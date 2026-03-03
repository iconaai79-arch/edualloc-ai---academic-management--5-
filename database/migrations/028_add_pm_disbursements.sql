-- Migration: Add Landlord Disbursements
-- Description: Table for tracking payout requests and processing for property landlords

CREATE TABLE IF NOT EXISTS pm_disbursements (
    id TEXT PRIMARY KEY,
    landlord_id TEXT REFERENCES pm_landlords(id),
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Approved, Paid, Rejected
    request_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_date TIMESTAMP WITH TIME ZONE,
    payment_reference TEXT,
    payment_method TEXT,
    bank_details TEXT,
    notes TEXT,
    institution_id TEXT NOT NULL,
    payment_ids TEXT[] -- Array of payment record IDs included in this disbursement
);

-- RLS Policies
ALTER TABLE pm_disbursements ENABLE ROW LEVEL SECURITY;

CREATE POLICY pm_disbursements_access ON pm_disbursements
    FOR ALL
    TO authenticated
    USING (landlord_id IN (SELECT id FROM pm_landlords) OR (institution_id::text = (auth.jwt() ->> 'institution_id')));
