-- Migration: Marathon & Event Management Module
-- Path: database/migrations/220_event_management_module.sql

-- 1. Events Table
CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    location TEXT,
    status TEXT NOT NULL DEFAULT 'planning', -- 'planning', 'active', 'completed', 'cancelled'
    logo_url TEXT,
    banner_url TEXT,
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    updated_at TEXT
);

-- 2. Event Categories Table
CREATE TABLE IF NOT EXISTS event_categories (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Full Marathon (42.2K)", "10K Fun Run"
    distance_km NUMERIC NOT NULL,
    registration_fee NUMERIC NOT NULL DEFAULT 0,
    capacity INTEGER,
    age_limit_min INTEGER,
    age_limit_max INTEGER,
    gender_restriction TEXT NOT NULL DEFAULT 'any', -- 'any', 'male', 'female'
    start_time TEXT, -- e.g., "06:00:00"
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    updated_at TEXT
);

-- 3. Event Participants Table
CREATE TABLE IF NOT EXISTS event_participants (
    id TEXT PRIMARY KEY,
    category_id TEXT NOT NULL REFERENCES event_categories(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    bib_number TEXT,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    gender TEXT, -- 'male', 'female'
    age INTEGER,
    t_shirt_size TEXT, -- 'XS', 'S', 'M', 'L', 'XL', 'XXL'
    status TEXT NOT NULL DEFAULT 'registered', -- 'registered', 'checked_in', 'started', 'completed', 'dnf', 'dns', 'disqualified'
    waiver_signed BOOLEAN NOT NULL DEFAULT FALSE,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed', 'refunded'
    mpesa_reference TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
    updated_at TEXT
);

-- 4. Event Splits Table (RFID/Timing Chip logs)
CREATE TABLE IF NOT EXISTS event_splits (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    split_name TEXT NOT NULL, -- e.g., "10K", "Halfway", "30K", "Finish"
    distance_km NUMERIC NOT NULL,
    time_elapsed TEXT NOT NULL, -- Format: "HH:MM:SS"
    recorded_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- 5. Event Medical Logs Table
CREATE TABLE IF NOT EXISTS event_medical_logs (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    participant_id TEXT NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    tent_number TEXT,
    diagnosis TEXT NOT NULL,
    treatment TEXT,
    status TEXT NOT NULL DEFAULT 'under_observation', -- 'treated_and_released', 'under_observation', 'referred_to_hospital'
    recorded_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- 6. Event Pledges Table (Charity run fundraising)
CREATE TABLE IF NOT EXISTS event_pledges (
    id TEXT PRIMARY KEY,
    participant_id TEXT NOT NULL REFERENCES event_participants(id) ON DELETE CASCADE,
    sponsor_name TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    payment_status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'paid', 'failed'
    created_at TEXT NOT NULL DEFAULT (to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"'))
);

-- Indices for performance optimization
CREATE INDEX IF NOT EXISTS idx_events_institution ON events(institution_id);
CREATE INDEX IF NOT EXISTS idx_categories_event ON event_categories(event_id);
CREATE INDEX IF NOT EXISTS idx_participants_category ON event_participants(category_id);
CREATE INDEX IF NOT EXISTS idx_participants_user ON event_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_participants_bib ON event_participants(bib_number);
CREATE INDEX IF NOT EXISTS idx_splits_participant ON event_splits(participant_id);
CREATE INDEX IF NOT EXISTS idx_medlogs_event ON event_medical_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_pledges_participant ON event_pledges(participant_id);

-- Enable Row Level Security (RLS)
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_medical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pledges ENABLE ROW LEVEL SECURITY;

-- Permissive Select policies for everyone (needed for leaderboards and registrations)
CREATE POLICY "Permissive select for events" ON events FOR SELECT USING (true);
CREATE POLICY "Permissive select for event_categories" ON event_categories FOR SELECT USING (true);
CREATE POLICY "Permissive select for event_participants" ON event_participants FOR SELECT USING (true);
CREATE POLICY "Permissive select for event_splits" ON event_splits FOR SELECT USING (true);
CREATE POLICY "Permissive select for event_medical_logs" ON event_medical_logs FOR SELECT USING (true);
CREATE POLICY "Permissive select for event_pledges" ON event_pledges FOR SELECT USING (true);

-- Permissive write policies for authenticated users
CREATE POLICY "Insert events for all authenticated" ON events FOR INSERT WITH CHECK (true);
CREATE POLICY "Update events for all authenticated" ON events FOR UPDATE USING (true);
CREATE POLICY "Delete events for all authenticated" ON events FOR DELETE USING (true);

CREATE POLICY "Insert categories for all authenticated" ON event_categories FOR INSERT WITH CHECK (true);
CREATE POLICY "Update categories for all authenticated" ON event_categories FOR UPDATE USING (true);
CREATE POLICY "Delete categories for all authenticated" ON event_categories FOR DELETE USING (true);

CREATE POLICY "Insert participants for all authenticated" ON event_participants FOR INSERT WITH CHECK (true);
CREATE POLICY "Update participants for all authenticated" ON event_participants FOR UPDATE USING (true);
CREATE POLICY "Delete participants for all authenticated" ON event_participants FOR DELETE USING (true);

CREATE POLICY "Insert splits for all authenticated" ON event_splits FOR INSERT WITH CHECK (true);
CREATE POLICY "Update splits for all authenticated" ON event_splits FOR UPDATE USING (true);
CREATE POLICY "Delete splits for all authenticated" ON event_splits FOR DELETE USING (true);

CREATE POLICY "Insert medical logs for all authenticated" ON event_medical_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Update medical logs for all authenticated" ON event_medical_logs FOR UPDATE USING (true);
CREATE POLICY "Delete medical logs for all authenticated" ON event_medical_logs FOR DELETE USING (true);

CREATE POLICY "Insert pledges for all authenticated" ON event_pledges FOR INSERT WITH CHECK (true);
CREATE POLICY "Update pledges for all authenticated" ON event_pledges FOR UPDATE USING (true);
CREATE POLICY "Delete pledges for all authenticated" ON event_pledges FOR DELETE USING (true);
