-- Migration: Fix Missing Columns in Coop Collections
-- Description: Adds missing columns to coop_collections table to match frontend requirements.

ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS quality_grade TEXT;
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS notified BOOLEAN DEFAULT FALSE;
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS factory_confirmed BOOLEAN DEFAULT FALSE;
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS confirmed_by TEXT REFERENCES users(id);
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS final_quantity DECIMAL(12, 2);
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT FALSE;
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS approved_by TEXT REFERENCES users(id);
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS sms_status TEXT DEFAULT 'pending';
ALTER TABLE coop_collections ADD COLUMN IF NOT EXISTS recorded_by TEXT REFERENCES users(id);

-- Optional: If recorded_by was NOT NULL and you want to allow migration without backfilling:
-- ALTER TABLE coop_collections ALTER COLUMN recorded_by DROP NOT NULL;

