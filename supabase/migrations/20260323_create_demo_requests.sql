
-- Migration: Create demo_requests table
CREATE TABLE IF NOT EXISTS demo_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    institution TEXT,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (public lead capture)
DROP POLICY IF EXISTS "Enable insert for all" ON demo_requests;
CREATE POLICY "Enable insert for all" ON demo_requests FOR INSERT WITH CHECK (true);

-- Allow admins to view
DROP POLICY IF EXISTS "Enable select for admins" ON demo_requests;
CREATE POLICY "Enable select for admins" ON demo_requests FOR SELECT USING (
    LOWER(auth.jwt() ->> 'email') = 'super@app.com' OR 
    public.get_curr_user_role() = 'super_admin'
);

-- Grant permissions
GRANT INSERT ON public.demo_requests TO anon, authenticated, service_role;
GRANT SELECT ON public.demo_requests TO authenticated, service_role;
