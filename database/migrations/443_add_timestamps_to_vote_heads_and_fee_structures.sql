-- Migration 443: Add timestamps and missing columns to vote_heads, fee_structures, and financial_periods
-- Prevents PostgREST schema cache warnings and ensures compatibility with standard entity audit columns.

DO $$
BEGIN
    -- 1. vote_heads: Add created_at and updated_at
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vote_heads') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'created_at') THEN
            ALTER TABLE vote_heads ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vote_heads' AND column_name = 'updated_at') THEN
            ALTER TABLE vote_heads ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;

    -- 2. fee_structures: Add created_at and updated_at
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_structures') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'created_at') THEN
            ALTER TABLE fee_structures ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'fee_structures' AND column_name = 'updated_at') THEN
            ALTER TABLE fee_structures ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;

    -- 3. financial_periods: Add created_at and updated_at
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_periods') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_periods' AND column_name = 'created_at') THEN
            ALTER TABLE financial_periods ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_periods' AND column_name = 'updated_at') THEN
            ALTER TABLE financial_periods ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
