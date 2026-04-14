-- Add missing geography columns to campaign_profiles to support granular demographic targeting
ALTER TABLE campaign_profiles 
ADD COLUMN IF NOT EXISTS county TEXT,
ADD COLUMN IF NOT EXISTS constituency TEXT,
ADD COLUMN IF NOT EXISTS ward TEXT;

-- Create index for faster filtering in CommunityManager
CREATE INDEX IF NOT EXISTS idx_campaign_geography ON campaign_profiles(county, constituency, ward);
