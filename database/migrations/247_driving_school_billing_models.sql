-- Migration: 247_driving_school_billing_models
-- Description: Adds per-student billing options (prepaid & postpaid) for driving schools

-- 1. Extend institutions table
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS billing_model TEXT DEFAULT 'fixed' CHECK (billing_model IN ('fixed', 'prepaid_student', 'postpaid_student'));
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS rate_per_student DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS billing_cycle_anchor TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_suspended_for_billing BOOLEAN DEFAULT FALSE;

-- 2. Extend ds_students table
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'unpaid'));
ALTER TABLE public.ds_students ADD COLUMN IF NOT EXISTS activation_date TIMESTAMP WITH TIME ZONE;

-- 3. Create tenant_bills table for accumulated billing
CREATE TABLE IF NOT EXISTS public.tenant_bills (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    billing_period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    billing_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    student_count INTEGER DEFAULT 0,
    rate_per_student DECIMAL(12, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    due_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Enable RLS
ALTER TABLE public.tenant_bills ENABLE ROW LEVEL SECURITY;

-- Setup RLS policies
DROP POLICY IF EXISTS "Institutional tenancy select: tenant_bills" ON public.tenant_bills;
CREATE POLICY "Institutional tenancy select: tenant_bills" ON public.tenant_bills 
FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Institutional tenancy manage: tenant_bills" ON public.tenant_bills;
CREATE POLICY "Institutional tenancy manage: tenant_bills" ON public.tenant_bills 
FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Grant permissions
GRANT ALL ON public.tenant_bills TO anon, authenticated, service_role;
