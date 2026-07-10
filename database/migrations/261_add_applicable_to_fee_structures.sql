-- Migration: Add applicable_to column to fee_structures table
-- This allows differentiating fee structure items for boarders vs day scholars

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'fee_structures' AND column_name = 'applicable_to'
    ) THEN
        ALTER TABLE public.fee_structures ADD COLUMN applicable_to VARCHAR(50) NOT NULL DEFAULT 'all';
        RAISE NOTICE 'Added applicable_to column to fee_structures table';
    ELSE
        RAISE NOTICE 'applicable_to column already exists in fee_structures table';
    END IF;
END $$;
