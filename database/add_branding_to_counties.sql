-- Ensure counties table exists
CREATE TABLE IF NOT EXISTS counties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL,
    phone_number TEXT,
    admin_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    location JSONB
);

-- Add branding columns
ALTER TABLE counties ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE counties ADD COLUMN IF NOT EXISTS letterhead_url TEXT;
