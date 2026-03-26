-- Migration: Add missing columns to inventory table
DO $$ 
BEGIN 
    -- 1. item_type
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory' AND column_name='item_type') THEN
        ALTER TABLE public.inventory ADD COLUMN item_type TEXT;
    END IF;

    -- 2. expiry_date
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='inventory' AND column_name='expiry_date') THEN
        ALTER TABLE public.inventory ADD COLUMN expiry_date DATE;
    END IF;

    -- 3. suppliers: status
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='status') THEN
        ALTER TABLE public.suppliers ADD COLUMN status TEXT DEFAULT 'Active';
    END IF;

    -- 4. suppliers: rating
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='suppliers' AND column_name='rating') THEN
        ALTER TABLE public.suppliers ADD COLUMN rating INTEGER DEFAULT 5;
    END IF;
END $$;
