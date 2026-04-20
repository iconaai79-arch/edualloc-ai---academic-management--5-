-- Campaign Management Enhancements: Villages and Groups
-- 1. Add village column to voter_outreach
ALTER TABLE voter_outreach ADD COLUMN IF NOT EXISTS village TEXT;

-- 2. Create campaign_villages table (Ward -> Village mapping)
CREATE TABLE IF NOT EXISTS campaign_villages (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaign_profiles(id) ON DELETE CASCADE,
    ward_name TEXT NOT NULL,
    village_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create campaign_groups table
CREATE TABLE IF NOT EXISTS campaign_groups (
    id TEXT PRIMARY KEY,
    campaign_id TEXT REFERENCES campaign_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create campaign_group_members table
CREATE TABLE IF NOT EXISTS campaign_group_members (
    id TEXT PRIMARY KEY,
    group_id TEXT REFERENCES campaign_groups(id) ON DELETE CASCADE,
    voter_id TEXT REFERENCES voter_outreach(id) ON DELETE CASCADE,
    campaign_id TEXT REFERENCES campaign_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE campaign_villages ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_group_members ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Campaign admins can manage their villages" ON campaign_villages
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM campaign_profiles WHERE id = campaign_villages.campaign_id AND institution_id = auth.uid()::text) OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "Campaign admins can manage their groups" ON campaign_groups
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM campaign_profiles WHERE id = campaign_groups.campaign_id AND institution_id = auth.uid()::text) OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "Campaign admins can manage their group members" ON campaign_group_members
    FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM campaign_profiles WHERE id = campaign_group_members.campaign_id AND institution_id = auth.uid()::text) OR public.get_curr_user_role() = 'super_admin');

-- Indexes
CREATE INDEX idx_village_campaign ON campaign_villages(campaign_id);
CREATE INDEX idx_group_campaign ON campaign_groups(campaign_id);
CREATE INDEX idx_member_group ON campaign_group_members(group_id);
CREATE INDEX idx_member_voter ON campaign_group_members(voter_id);
