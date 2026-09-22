-- Migration 418: Ensure financial_goals table and optimize indexes
-- Purpose: Accelerate institution financial_goals lookups, eliminate PostgREST statement timeouts,
-- and provide high-performance B-tree index coverage for institution_id, id, status, and created_at.

DO $$
BEGIN
    -- 1. Ensure table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'financial_goals'
    ) THEN
        CREATE TABLE public.financial_goals (
            id                  TEXT PRIMARY KEY,
            institution_id      TEXT NOT NULL,
            "institutionId"     TEXT,
            title               TEXT NOT NULL DEFAULT 'Financial Goal',
            target_amount       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
            "targetAmount"      NUMERIC(15,2),
            current_amount      NUMERIC(15,2) DEFAULT 0.00,
            "currentAmount"     NUMERIC(15,2),
            deadline            DATE,
            start_date          DATE,
            "startDate"         TEXT,
            end_date            DATE,
            "endDate"           TEXT,
            period              TEXT,
            category            TEXT DEFAULT 'General',
            status              TEXT DEFAULT 'on_track',
            notes               TEXT,
            created_at          TIMESTAMPTZ DEFAULT NOW(),
            updated_at          TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "financial_goals_all" ON public.financial_goals;
        CREATE POLICY "financial_goals_all" ON public.financial_goals FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.financial_goals TO anon, authenticated, service_role;
    END IF;

    -- 2. Indexes on financial_goals
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'financial_goals'
    ) THEN
        -- Tenancy index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'financial_goals' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_financial_goals_institution 
                ON public.financial_goals (institution_id);
            CREATE INDEX IF NOT EXISTS idx_financial_goals_inst_id_composite 
                ON public.financial_goals (institution_id, id DESC);
        END IF;

        -- Status index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'financial_goals' AND column_name = 'status'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_financial_goals_status 
                ON public.financial_goals (status);
        END IF;

        -- Category index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'financial_goals' AND column_name = 'category'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_financial_goals_category 
                ON public.financial_goals (category);
        END IF;

        -- Created at index
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'financial_goals' AND column_name = 'created_at'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_financial_goals_created_at 
                ON public.financial_goals (created_at DESC);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
