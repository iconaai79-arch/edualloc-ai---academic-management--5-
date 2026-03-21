-- Migration: 112_create_pm_settings_table
-- Description: Creates the pm_settings table for storing Property Management configurations.

CREATE TABLE IF NOT EXISTS pm_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    branding JSONB DEFAULT '{"company_name": "", "primary_color": "#4f46e5", "footer_text": "", "logo_url": ""}'::jsonb,
    rent_reminders JSONB DEFAULT '{"enabled": false, "before_due_days": 3, "after_due_days": 1, "template": ""}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security
ALTER TABLE pm_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_settings' AND policyname = 'Staff can view their PM settings') THEN
        CREATE POLICY "Staff can view their PM settings" ON pm_settings 
            FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text OR id = 'u_' || auth.uid()::text));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pm_settings' AND policyname = 'Staff can manage their PM settings') THEN
        CREATE POLICY "Staff can manage their PM settings" ON pm_settings 
            FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()::text OR id = 'u_' || auth.uid()::text));
    END IF;
END $$;
