-- Migration 368: Ensure retail_stock_issues schema for inventory issues & action history

CREATE TABLE IF NOT EXISTS public.retail_stock_issues (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    voucher_number TEXT NOT NULL,
    issued_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    issued_to TEXT NOT NULL,
    department TEXT,
    purpose TEXT,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_quantity NUMERIC(12, 2) NOT NULL DEFAULT 0,
    total_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
    recorded_by TEXT,
    status TEXT DEFAULT 'completed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.retail_stock_issues ENABLE ROW LEVEL SECURITY;

-- Recreate policies with standard tenancy and fallback checks
DROP POLICY IF EXISTS "Users can view their institution''s retail_stock_issues" ON public.retail_stock_issues;
CREATE POLICY "Users can view their institution''s retail_stock_issues"
    ON public.retail_stock_issues FOR SELECT
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

DROP POLICY IF EXISTS "Admins/Agents can manage their institution''s retail_stock_issues" ON public.retail_stock_issues;
CREATE POLICY "Admins/Agents can manage their institution''s retail_stock_issues"
    ON public.retail_stock_issues FOR ALL
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

GRANT ALL ON TABLE public.retail_stock_issues TO anon, authenticated, service_role;
NOTIFY pgrst, 'reload schema';
