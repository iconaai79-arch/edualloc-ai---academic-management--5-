-- Migration: 027_add_pm_landlords
-- Description: Adds landlords and commission tracking to Property Management

-- 1. Create pm_landlords table
CREATE TABLE IF NOT EXISTS pm_landlords (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    id_number TEXT,
    tax_pin TEXT,
    bank_details TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Add landlord and commission fields to pm_properties
ALTER TABLE pm_properties 
ADD COLUMN IF NOT EXISTS landlord_id TEXT REFERENCES pm_landlords(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 0;

-- 3. Add commission tracking to pm_payments
ALTER TABLE pm_payments
ADD COLUMN IF NOT EXISTS commission_amount DECIMAL(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS landlord_payout_status TEXT DEFAULT 'pending';

-- 4. Set up RLS for pm_landlords
ALTER TABLE pm_landlords ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Landlord access" ON pm_landlords FOR ALL USING (true);
