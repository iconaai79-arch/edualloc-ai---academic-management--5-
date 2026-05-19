-- Migration: 216_create_showroom_settings_table
-- Description: Creates the showroom_settings table for storing Automotive Showroom configurations.

CREATE TABLE IF NOT EXISTS showroom_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    invoice_reminders JSONB DEFAULT '{"enabled": false, "before_due_days": 3, "after_due_days": 1, "template": ""}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Row Level Security
ALTER TABLE showroom_settings ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'showroom_settings' AND policyname = 'Staff can view their Showroom settings') THEN
        CREATE POLICY "Staff can view their Showroom settings" ON showroom_settings 
            FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'showroom_settings' AND policyname = 'Staff can manage their Showroom settings') THEN
        CREATE POLICY "Staff can manage their Showroom settings" ON showroom_settings 
            FOR ALL USING (true);
    END IF;
END $$;
