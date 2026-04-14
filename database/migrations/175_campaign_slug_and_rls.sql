-- Add invite_slug to campaign_profiles for friendly URLs
ALTER TABLE campaign_profiles ADD COLUMN IF NOT EXISTS invite_slug TEXT UNIQUE;

-- Add RLS policy for public access to campaign profiles (needed for the join page)
-- This allows anyone to read profiles if they know the ID or slug
CREATE POLICY "Public can view campaign profiles via slug" ON campaign_profiles
    FOR SELECT TO public USING (true);

-- Add RLS policy for public voter registration
CREATE POLICY "Public can register as voters" ON voter_outreach
    FOR INSERT TO public WITH CHECK (true);
