-- Create Marketing Prospects Table for Lead Scouting
CREATE TABLE IF NOT EXISTS marketing_prospects (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    niche TEXT, -- e.g., 'Property', 'Education', 'Automotive', 'Logistics'
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    website_url TEXT,
    location TEXT,
    lead_score INTEGER DEFAULT 0, -- 0 to 100
    ai_summary TEXT, -- LLM generated summary of why we should target them
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'customer', 'ignored')),
    last_processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster searching by niche and status
CREATE INDEX idx_prospects_niche ON marketing_prospects(niche);
CREATE INDEX idx_prospects_status ON marketing_prospects(status);

-- Enable RLS
ALTER TABLE marketing_prospects ENABLE ROW LEVEL SECURITY;

-- Allow super_admin to manage prospects
CREATE POLICY "Super admins can manage all prospects" ON marketing_prospects
    FOR ALL TO authenticated
    USING (public.get_curr_user_role() = 'super_admin');
