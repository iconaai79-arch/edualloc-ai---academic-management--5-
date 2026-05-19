-- Migration: Ensure columns exist in mpesa_transactions table
-- Purpose: Support metadata tagging (e.g. provider = 'kcb') and avoid automatic stripping during db insert operations.

ALTER TABLE mpesa_transactions ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE mpesa_transactions ADD COLUMN IF NOT EXISTS payer_name TEXT;
ALTER TABLE mpesa_transactions ADD COLUMN IF NOT EXISTS checkout_request_id TEXT;
