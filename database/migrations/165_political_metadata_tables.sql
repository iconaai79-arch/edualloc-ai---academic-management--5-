
-- Create Political Parties Table
CREATE TABLE IF NOT EXISTS political_parties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    acronym TEXT,
    logo_url TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Note: Counties table probably already exists as 'counties', but let's ensure it has what's needed.
-- If it doesn't exist, create it.
CREATE TABLE IF NOT EXISTS counties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Constituencies Table
CREATE TABLE IF NOT EXISTS constituencies (
    id TEXT PRIMARY KEY,
    county_id TEXT REFERENCES counties(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create Wards Table
CREATE TABLE IF NOT EXISTS wards (
    id TEXT PRIMARY KEY,
    constituency_id TEXT REFERENCES constituencies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    registered_voters INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_constituencies_county_id ON constituencies(county_id);
CREATE INDEX IF NOT EXISTS idx_wards_constituency_id ON wards(constituency_id);
