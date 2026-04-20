-- Relax voter_outreach phone_number uniqueness to be per-campaign
-- This allows the same phone number to be managed by different campaigns independently (Standard Multi-tenancy)

DO $$ 
BEGIN
    -- 1. Remove the global unique constraint if it exists
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'voter_outreach_phone_number_key') THEN
        ALTER TABLE voter_outreach DROP CONSTRAINT voter_outreach_phone_number_key;
    END IF;

    -- 2. Add a composite unique constraint (phone_number + campaign_id)
    -- This ensures a voter is unique within a campaign, but can exist in multiple different campaigns
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'voter_outreach_campaign_phone_key') THEN
        ALTER TABLE voter_outreach ADD CONSTRAINT voter_outreach_campaign_phone_key UNIQUE (campaign_id, phone_number);
    END IF;
END $$;
