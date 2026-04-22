
-- Add Adherence Configuration to Pharmacy Settings
ALTER TABLE his_pharmacy_settings ADD COLUMN IF NOT EXISTS medication_reminders_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE his_pharmacy_settings ADD COLUMN IF NOT EXISTS checkup_reminders_enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE his_pharmacy_settings ADD COLUMN IF NOT EXISTS stop_reminders_enabled BOOLEAN DEFAULT TRUE;

-- Update Adherence Alerts table for more specificity
ALTER TABLE his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS alert_type TEXT DEFAULT 'medication'; -- medication, stop_medication, checkup
ALTER TABLE his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS drug_name TEXT;
ALTER TABLE his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS checkup_date DATE;
ALTER TABLE his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS stop_date DATE;
ALTER TABLE his_pharmacy_adherence_alerts ADD COLUMN IF NOT EXISTS message_template TEXT;
