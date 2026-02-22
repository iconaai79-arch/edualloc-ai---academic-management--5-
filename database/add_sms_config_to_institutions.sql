-- Add per-tenant SMS gateway configuration to institutions
-- This allows each institution to override the global system SMS gateway.

ALTER TABLE institutions
    ADD COLUMN IF NOT EXISTS sms_config JSONB DEFAULT NULL;

COMMENT ON COLUMN institutions.sms_config IS
    'Optional per-tenant SMS gateway config (provider, apiKey, apiSecret, fromNumber, baseUrl). Overrides global system gateway when set.';
