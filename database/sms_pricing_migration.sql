-- Migration to add custom SMS pricing support for institutions
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS custom_sms_price NUMERIC DEFAULT NULL;

-- Comment for documentation
COMMENT ON COLUMN institutions.custom_sms_price IS 'Institution-specific cost override for a single SMS unit. If null, global system default is used.';
