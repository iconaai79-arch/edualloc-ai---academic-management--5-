-- Migration: Add KCB specific columns to mpesa_transactions table
-- Purpose: Match the flat KCB request body format directly in the database schema.

ALTER TABLE mpesa_transactions 
ADD COLUMN IF NOT EXISTS provider TEXT,
ADD COLUMN IF NOT EXISTS request_id TEXT,
ADD COLUMN IF NOT EXISTS channel_code TEXT,
ADD COLUMN IF NOT EXISTS currency TEXT,
ADD COLUMN IF NOT EXISTS customer_reference TEXT,
ADD COLUMN IF NOT EXISTS customer_name TEXT,
ADD COLUMN IF NOT EXISTS customer_mobile_number TEXT,
ADD COLUMN IF NOT EXISTS balance DECIMAL(12, 2),
ADD COLUMN IF NOT EXISTS narration TEXT,
ADD COLUMN IF NOT EXISTS credit_account_identifier TEXT,
ADD COLUMN IF NOT EXISTS organization_short_code TEXT,
ADD COLUMN IF NOT EXISTS till_number TEXT;
