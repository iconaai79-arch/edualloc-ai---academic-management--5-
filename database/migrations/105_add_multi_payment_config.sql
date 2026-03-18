-- Migration: Add Airtel and IntaSend config columns to institutions
-- Purpose: Support multi-payment provider configuration

ALTER TABLE institutions ADD COLUMN IF NOT EXISTS airtel_money_config JSONB;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS intasend_config JSONB;

-- Also update company_details if it's a separate singleton or use setting
-- But in this schema, institutional settings are in 'institutions' table.
