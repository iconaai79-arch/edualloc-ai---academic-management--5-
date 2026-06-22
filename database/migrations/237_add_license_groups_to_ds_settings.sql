-- 237. ADD LICENSE_GROUPS TO DS_SETTINGS
-- Stores category group names in settings table

ALTER TABLE ds_settings ADD COLUMN IF NOT EXISTS license_groups JSONB DEFAULT '[]'::jsonb;
