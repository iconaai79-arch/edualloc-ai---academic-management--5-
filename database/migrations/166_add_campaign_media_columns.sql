-- Add columns for campaign posters and profile pictures
ALTER TABLE campaign_profiles 
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS campaign_posters JSONB DEFAULT '[]';
