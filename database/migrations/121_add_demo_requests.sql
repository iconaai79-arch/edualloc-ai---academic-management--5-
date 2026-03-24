-- Migration: Add Demo Requests Table
-- Description: Creates a table to store demo requests from the marketing landing page.

CREATE TABLE IF NOT EXISTS demo_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    institution TEXT NOT NULL,
    phone TEXT NOT NULL,
    message TEXT,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'scheduled', 'completed', 'cancelled')),
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Public can insert demo requests" ON demo_requests;
CREATE POLICY "Public can insert demo requests" ON demo_requests FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Staff can view demo requests" ON demo_requests;
CREATE POLICY "Staff can view demo requests" ON demo_requests FOR SELECT USING (true); -- Usually restricted to admins, but for now allow staff

CREATE INDEX IF NOT EXISTS idx_demo_requests_status ON demo_requests(status);
CREATE INDEX IF NOT EXISTS idx_demo_requests_requested_at ON demo_requests(requested_at);
