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

-- Enable Row Level Security (RLS) and granular policies
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_medical_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_pledges ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'events', 'event_categories', 'event_participants', 
        'event_splits', 'event_medical_logs', 'event_pledges'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Permissive select for %s" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Insert %s for everyone" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Update %s for institutional staff" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Delete %s for institutional staff" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Delete %s for all authenticated" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "Delete medical logs for all authenticated" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Insert medical logs for everyone" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Update medical logs for institutional staff" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Delete medical logs for institutional staff" ON public.%I', t);

        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (auth.role() IN (''authenticated'', ''anon'') OR public.get_curr_user_role()::text = ''super_admin'') WITH CHECK (id IS NOT NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (auth.role() = ''authenticated'' OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;
