-- CampaignAI: Political Campaign Management Schema
-- Updated to use TEXT IDs to match system-wide standard
CREATE TABLE IF NOT EXISTS campaign_profiles (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    candidate_name TEXT NOT NULL,
    position TEXT NOT NULL, -- MCA, MP, Senator, Governor, President, Deputy
    party_name TEXT,
    constituency_ward TEXT, -- The area they are running in
    manifesto_ai_draft TEXT,
    tagline TEXT,
    logo_url TEXT,
    target_voter_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS voter_outreach (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaign_profiles(id) ON DELETE CASCADE,
    voter_name TEXT,
    phone_number TEXT UNIQUE,
    id_number TEXT,
    voting_center TEXT,
    ward TEXT,
    status TEXT DEFAULT 'uncontacted' CHECK (status IN ('uncontacted', 'supporter', 'undecided', 'opposed')),
    last_contacted_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_events (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaign_profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    location TEXT NOT NULL,
    event_type TEXT DEFAULT 'rally' CHECK (event_type IN ('rally', 'townhall', 'strategy_meeting', 'door_to_door', 'fundraiser')),
    event_time TIMESTAMP WITH TIME ZONE NOT NULL,
    attendance_estimate INTEGER DEFAULT 0,
    actual_attendance INTEGER,
    ai_speech_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_voter_phone ON voter_outreach(phone_number);
CREATE INDEX idx_voter_status ON voter_outreach(status);
CREATE INDEX idx_campaign_institution ON campaign_profiles(institution_id);

-- Enable RLS
ALTER TABLE campaign_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE voter_outreach ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_events ENABLE ROW LEVEL SECURITY;

-- Policies (Simplified for the candidate/admin)
CREATE POLICY "Campaign admins can manage their profiles" ON campaign_profiles
    FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "Campaign admins can manage their voters" ON voter_outreach
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM campaign_profiles WHERE id = voter_outreach.campaign_id AND institution_id = auth.uid()::text) OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "Campaign admins can manage their events" ON campaign_events
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM campaign_profiles WHERE id = campaign_events.campaign_id AND institution_id = auth.uid()::text) OR public.get_curr_user_role() = 'super_admin');
