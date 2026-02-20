-- SMS Units System Database Updates

-- 1. Add sms_balance to institutions table
ALTER TABLE institutions ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 10; -- Give 10 free units to existing institutions

-- 2. Create RPC for safe balance decrement
CREATE OR REPLACE FUNCTION decrement_sms_balance(inst_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE institutions
    SET sms_balance = GREATEST(0, sms_balance - amount)
    WHERE id = inst_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create RPC for safe balance increment
CREATE OR REPLACE FUNCTION increment_sms_balance(inst_id UUID, amount INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE institutions
    SET sms_balance = COALESCE(sms_balance, 0) + amount
    WHERE id = inst_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
