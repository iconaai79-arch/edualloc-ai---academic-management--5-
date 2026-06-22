-- 238. ADD LICENSE_CATEGORY TO DS_LEADS
-- Stores category group association for marketing leads

ALTER TABLE ds_leads ADD COLUMN IF NOT EXISTS license_category TEXT;
