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

-- Scoped Institutional Tenancy RLS Policies
DO $$
DECLARE
    t text;
    tables text[] := ARRAY['coop_expenses', 'coop_income'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_all_access" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (institution_id::text = public.get_curr_user_inst_id()::text OR public.get_curr_user_role()::text = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role', t);
    END LOOP;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
