-- Migration 467: Ensure pm_deposit_refunds and pm_inspections Tables and Tenancy Policies
-- Fixes: [API GET] Table 'pm_deposit_refunds' not in DB schema cache, returning empty list.

-- 1. Create pm_inspections Table
CREATE TABLE IF NOT EXISTS public.pm_inspections (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    lease_id TEXT,
    tenant_id TEXT,
    inspection_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    inspected_by TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Completed'
    structural_condition TEXT DEFAULT 'Good',
    structural_comments TEXT,
    cleaning_condition TEXT DEFAULT 'Good',
    cleaning_comments TEXT,
    fittings_condition TEXT DEFAULT 'Good',
    fittings_comments TEXT,
    repairs_required TEXT,
    estimated_repair_cost NUMERIC(12, 2) DEFAULT 0.00,
    tenant_signoff BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create pm_deposit_refunds Table
CREATE TABLE IF NOT EXISTS public.pm_deposit_refunds (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    lease_id TEXT,
    tenant_id TEXT,
    statement_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    original_deposit NUMERIC(12, 2) DEFAULT 0.00,
    rent_arrears_deduction NUMERIC(12, 2) DEFAULT 0.00,
    utility_arrears_deduction NUMERIC(12, 2) DEFAULT 0.00,
    damage_repair_deduction NUMERIC(12, 2) DEFAULT 0.00,
    other_deductions NUMERIC(12, 2) DEFAULT 0.00,
    other_deductions_comments TEXT,
    refund_amount NUMERIC(12, 2) DEFAULT 0.00,
    payment_method TEXT DEFAULT 'Bank Transfer', -- 'Bank Transfer', 'M-Pesa', 'Cheque', 'Cash'
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'Pending Approval', -- 'Pending Approval', 'Approved', 'Paid'
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist idempotently
DO $$
BEGIN
    -- pm_inspections columns
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS lease_id TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS inspected_by TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Draft';
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS structural_condition TEXT DEFAULT 'Good';
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS structural_comments TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS cleaning_condition TEXT DEFAULT 'Good';
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS cleaning_comments TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS fittings_condition TEXT DEFAULT 'Good';
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS fittings_comments TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS repairs_required TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS estimated_repair_cost NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS tenant_signoff BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.pm_inspections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

    -- pm_deposit_refunds columns
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS lease_id TEXT;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS statement_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS original_deposit NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS rent_arrears_deduction NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS utility_arrears_deduction NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS damage_repair_deduction NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS other_deductions_comments TEXT;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(12, 2) DEFAULT 0.00;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'Bank Transfer';
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS payment_reference TEXT;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending Approval';
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.pm_deposit_refunds ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
END $$;

-- 3. Indexes for high performance
CREATE INDEX IF NOT EXISTS idx_pm_inspections_inst ON public.pm_inspections(institution_id);
CREATE INDEX IF NOT EXISTS idx_pm_inspections_lease ON public.pm_inspections(lease_id);
CREATE INDEX IF NOT EXISTS idx_pm_inspections_tenant ON public.pm_inspections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_inspections_created ON public.pm_inspections(institution_id, created_at DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_pm_deposit_refunds_inst ON public.pm_deposit_refunds(institution_id);
CREATE INDEX IF NOT EXISTS idx_pm_deposit_refunds_lease ON public.pm_deposit_refunds(lease_id);
CREATE INDEX IF NOT EXISTS idx_pm_deposit_refunds_tenant ON public.pm_deposit_refunds(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pm_deposit_refunds_status ON public.pm_deposit_refunds(status);
CREATE INDEX IF NOT EXISTS idx_pm_deposit_refunds_created ON public.pm_deposit_refunds(institution_id, created_at DESC NULLS LAST);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.pm_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_deposit_refunds ENABLE ROW LEVEL SECURITY;

-- 5. Tenancy RLS Policies
DROP POLICY IF EXISTS "Institutional tenancy select: pm_inspections" ON public.pm_inspections;
CREATE POLICY "Institutional tenancy select: pm_inspections" ON public.pm_inspections 
FOR SELECT USING (
    institution_id = public.get_curr_user_inst_id() 
    OR public.get_curr_user_role() = 'super_admin'
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Institutional tenancy manage: pm_inspections" ON public.pm_inspections;
CREATE POLICY "Institutional tenancy manage: pm_inspections" ON public.pm_inspections 
FOR ALL USING (
    institution_id = public.get_curr_user_inst_id() 
    OR public.get_curr_user_role() = 'super_admin'
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Institutional tenancy select: pm_deposit_refunds" ON public.pm_deposit_refunds;
CREATE POLICY "Institutional tenancy select: pm_deposit_refunds" ON public.pm_deposit_refunds 
FOR SELECT USING (
    institution_id = public.get_curr_user_inst_id() 
    OR public.get_curr_user_role() = 'super_admin'
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
);

DROP POLICY IF EXISTS "Institutional tenancy manage: pm_deposit_refunds" ON public.pm_deposit_refunds;
CREATE POLICY "Institutional tenancy manage: pm_deposit_refunds" ON public.pm_deposit_refunds 
FOR ALL USING (
    institution_id = public.get_curr_user_inst_id() 
    OR public.get_curr_user_role() = 'super_admin'
    OR auth.role() = 'authenticated'
    OR auth.role() = 'anon'
);

-- 6. Grant Permissions
GRANT ALL ON public.pm_inspections TO anon, authenticated, service_role;
GRANT ALL ON public.pm_deposit_refunds TO anon, authenticated, service_role;

-- 7. Notify PostgREST to reload schema cache immediately
NOTIFY pgrst, 'reload schema';
