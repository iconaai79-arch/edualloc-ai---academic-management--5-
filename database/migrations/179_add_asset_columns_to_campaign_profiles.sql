
-- Add asset storage columns to campaign_profiles to support Google Drive mirrored assets
ALTER TABLE campaign_profiles 
ADD COLUMN IF NOT EXISTS campaign_posters TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- Index for profile lookups
CREATE INDEX IF NOT EXISTS idx_campaign_profiles_assets ON campaign_profiles(id) WHERE profile_picture IS NOT NULL;
