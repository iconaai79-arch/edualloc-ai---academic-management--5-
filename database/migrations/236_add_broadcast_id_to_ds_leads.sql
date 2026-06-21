-- 236. ADD BROADCAST_ID TO DS_LEADS TABLE
-- Tracks which promotional broadcast message generated this lead

ALTER TABLE ds_leads ADD COLUMN IF NOT EXISTS broadcast_id TEXT REFERENCES broadcaster_messages(id) ON DELETE SET NULL;
