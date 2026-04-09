-- Migration: Cooperative Approvers
-- Description: Adds approver_ids to coop_settings or updates existing structures.
-- Since coop_settings is often a JSONB in institutions, we can just ensure the column exists if it's separate, 
-- but in this repo, it seems we use a JSON approach for many settings.
-- However, I'll add a specific column for multi-approver tracking if needed.

-- If we are using a separate table for payouts, we already have approved_by.
-- The core request is about CONFIGURING who can approve.

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS coop_approvers TEXT[]; -- Array of user IDs
