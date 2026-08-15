-- ============================================================
-- Migration 315: Financial Goals Table
-- Creates financial_goals table with RLS and dual-case support.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.financial_goals (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,
    
    -- Goal details
    title               TEXT NOT NULL DEFAULT 'Financial Goal',
    target_amount       NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    "targetAmount"      NUMERIC(15,2),
    current_amount      NUMERIC(15,2) DEFAULT 0.00,
    "currentAmount"     NUMERIC(15,2),
    
    -- Timeframes & Status
    deadline            DATE,
    start_date          DATE,
    "startDate"         TEXT,
    end_date            DATE,
    "endDate"           TEXT,
    period              TEXT, -- 'Term 1', 'Annual', 'Monthly'
    category            TEXT DEFAULT 'General', -- 'Fees', 'Donations', 'Grants', 'Other', 'General'
    status              TEXT DEFAULT 'on_track', -- 'on_track', 'behind', 'achieved', 'In Progress'
    notes               TEXT,
    
    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_financial_goals_institution
    ON public.financial_goals (institution_id);

CREATE INDEX IF NOT EXISTS idx_financial_goals_status
    ON public.financial_goals (status);

CREATE INDEX IF NOT EXISTS idx_financial_goals_category
    ON public.financial_goals (category);

-- RLS
ALTER TABLE public.financial_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "financial_goals_all" ON public.financial_goals;
CREATE POLICY "financial_goals_all" ON public.financial_goals
    FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.financial_goals TO anon, authenticated, service_role;
