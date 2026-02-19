-- Fix mpesa_transactions table to include missing columns
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mpesa_transactions' AND column_name='metadata') THEN
        ALTER TABLE mpesa_transactions ADD COLUMN metadata JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='mpesa_transactions' AND column_name='checkout_request_id') THEN
        ALTER TABLE mpesa_transactions ADD COLUMN checkout_request_id TEXT UNIQUE;
    END IF;
END $$;
