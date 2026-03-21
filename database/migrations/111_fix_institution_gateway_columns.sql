-- Migration: Fix Institution Gateway Columns
-- Purpose: Add missing configuration columns to institutions table to support M-Pesa and SMS gateways

-- 1. Add mpesa_config
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS mpesa_config JSONB;

-- 2. Add sms_config
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS sms_config JSONB;

-- 3. Add sms_balance
-- Check if it exists from database/sms_units_migration.sql and add if not
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 10;

-- 4. Ensure ncba_config exists (added in migration 106, but for safety)
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS ncba_config JSONB;

-- 5. Ensure other payment configs exist (added in migration 105)
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS airtel_money_config JSONB;
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS intasend_config JSONB;

-- 6. Create RPC for safe balance decrement
CREATE OR REPLACE FUNCTION decrement_sms_balance(inst_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE institutions
    SET sms_balance = GREATEST(0, COALESCE(sms_balance, 0) - amount)
    WHERE id = inst_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 7. Create RPC for safe balance increment
CREATE OR REPLACE FUNCTION increment_sms_balance(inst_id TEXT, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE institutions
    SET sms_balance = COALESCE(sms_balance, 0) + amount
    WHERE id = inst_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
