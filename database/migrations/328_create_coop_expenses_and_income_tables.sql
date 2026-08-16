-- Migration 328: Create coop_expenses and coop_income tables
-- Description: Stores cooperative operational expenses, factory produce off-take incomes, and farmer expense allocations.

-- 1. Cooperative Expenses
CREATE TABLE IF NOT EXISTS public.coop_expenses (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General Operating',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by TEXT NOT NULL,
    farmer_id TEXT REFERENCES public.coop_farmers(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Cooperative Income (Offtake / Bulk Sales)
CREATE TABLE IF NOT EXISTS public.coop_income (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    product_type TEXT NOT NULL DEFAULT 'milk',
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    unit TEXT NOT NULL DEFAULT 'kgs',
    amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    recorded_by TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_coop_expenses_inst ON public.coop_expenses(institution_id);
CREATE INDEX IF NOT EXISTS idx_coop_expenses_date ON public.coop_expenses(date DESC);
CREATE INDEX IF NOT EXISTS idx_coop_expenses_farmer ON public.coop_expenses(farmer_id);
CREATE INDEX IF NOT EXISTS idx_coop_income_inst ON public.coop_income(institution_id);
CREATE INDEX IF NOT EXISTS idx_coop_income_date ON public.coop_income(date DESC);

-- Enable RLS
ALTER TABLE public.coop_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coop_income ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies
DROP POLICY IF EXISTS "coop_expenses_all_access" ON public.coop_expenses;
CREATE POLICY "coop_expenses_all_access" ON public.coop_expenses
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "coop_income_all_access" ON public.coop_income;
CREATE POLICY "coop_income_all_access" ON public.coop_income
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Grant privileges
GRANT ALL ON public.coop_expenses TO anon, authenticated, service_role;
GRANT ALL ON public.coop_income TO anon, authenticated, service_role;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
