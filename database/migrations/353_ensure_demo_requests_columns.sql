-- Migration: 353_ensure_demo_requests_columns.sql
-- Description: Ensures all required columns exist on demo_requests table with RLS and schema cache reload.

CREATE TABLE IF NOT EXISTS demo_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    institution TEXT,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    source TEXT DEFAULT 'Web Landing Page',
    conversation_transcript JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    quote_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'unpaid',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist if table was previously created with fewer columns
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'Web Landing Page';
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS conversation_transcript JSONB DEFAULT '[]'::jsonb;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS quote_amount NUMERIC(12,2) DEFAULT 0.00;
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE demo_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable RLS and permissive policies
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public can insert demo requests') THEN
        CREATE POLICY "Public can insert demo requests" ON demo_requests FOR INSERT WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff and public can select demo requests') THEN
        CREATE POLICY "Staff and public can select demo requests" ON demo_requests FOR SELECT USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow update demo requests') THEN
        CREATE POLICY "Allow update demo requests" ON demo_requests FOR UPDATE USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
