-- Fix multi-tenancy inconsistency for campaign modules
-- Add institution_id to campaign-related tables to satisfy the server-side proxy and RLS patterns

-- 1. voter_outreach
ALTER TABLE voter_outreach ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
UPDATE voter_outreach SET institution_id = cp.institution_id FROM campaign_profiles cp WHERE voter_outreach.campaign_id = cp.id;

-- 2. campaign_events
ALTER TABLE campaign_events ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
UPDATE campaign_events SET institution_id = cp.institution_id FROM campaign_profiles cp WHERE campaign_events.campaign_id = cp.id;

-- 3. campaign_villages
ALTER TABLE campaign_villages ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
UPDATE campaign_villages SET institution_id = cp.institution_id FROM campaign_profiles cp WHERE campaign_villages.campaign_id = cp.id;

-- 4. campaign_groups
ALTER TABLE campaign_groups ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
UPDATE campaign_groups SET institution_id = cp.institution_id FROM campaign_profiles cp WHERE campaign_groups.campaign_id = cp.id;

-- 5. campaign_group_members
ALTER TABLE campaign_group_members ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
UPDATE campaign_group_members SET institution_id = cp.institution_id FROM campaign_profiles cp WHERE campaign_group_members.campaign_id = cp.id;

-- Update Indexes
CREATE INDEX IF NOT EXISTS idx_voter_institution ON voter_outreach(institution_id);
CREATE INDEX IF NOT EXISTS idx_event_institution ON campaign_events(institution_id);
CREATE INDEX IF NOT EXISTS idx_village_institution ON campaign_villages(institution_id);
CREATE INDEX IF NOT EXISTS idx_group_institution ON campaign_groups(institution_id);

-- Refresh RLS Policies to use direct institution_id matching (faster and standardized)
DROP POLICY IF EXISTS "Campaign admins can manage their voters" ON voter_outreach;
CREATE POLICY "Campaign admins can manage their voters" ON voter_outreach
    FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Campaign admins can manage their events" ON campaign_events;
CREATE POLICY "Campaign admins can manage their events" ON campaign_events
    FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Campaign admins can manage their villages" ON campaign_villages;
CREATE POLICY "Campaign admins can manage their villages" ON campaign_villages
    FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Campaign admins can manage their groups" ON campaign_groups;
CREATE POLICY "Campaign admins can manage their groups" ON campaign_groups
    FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Campaign admins can manage their group members" ON campaign_group_members;
CREATE POLICY "Campaign admins can manage their group members" ON campaign_group_members
    FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');
