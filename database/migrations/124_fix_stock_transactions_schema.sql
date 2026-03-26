-- Migration: Add missing columns to stock_transactions table
DO $$ 
BEGIN 
    -- 1. recipient_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transactions' AND column_name='recipient_id') THEN
        ALTER TABLE public.stock_transactions ADD COLUMN recipient_id TEXT;
    END IF;

    -- 2. signature
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='stock_transactions' AND column_name='signature') THEN
        ALTER TABLE public.stock_transactions ADD COLUMN signature TEXT;
    END IF;
END $$;
