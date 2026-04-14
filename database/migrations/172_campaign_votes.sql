-- Migration 172: Create Campaign Mock Voting tables
-- Enforces one vote per category per user

CREATE TABLE IF NOT EXISTS campaign_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    voter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    campaign_id UUID NOT NULL REFERENCES campaign_profiles(id) ON DELETE CASCADE,
    position TEXT NOT NULL, -- e.g. President, Governor, MCA
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    
    -- Ensure user can only vote once per specific office/category
    UNIQUE(voter_id, position)
);

-- RLS Policies
ALTER TABLE campaign_votes ENABLE ROW LEVEL SECURITY;

-- Public can view results (vote counts)
CREATE POLICY "Public can view campaign votes"
ON campaign_votes FOR SELECT
TO authenticated
USING (true);

-- Users can insert their own votes
CREATE POLICY "Users can cast votes"
ON campaign_votes FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = voter_id);

-- Users can update their own vote (if they change their mind)
CREATE POLICY "Users can update their own votes"
ON campaign_votes FOR UPDATE
TO authenticated
USING (auth.uid() = voter_id)
WITH CHECK (auth.uid() = voter_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_votes_campaign_id ON campaign_votes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_votes_position ON campaign_votes(position);
