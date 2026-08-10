-- Migration 301: Create student_subscription_plans and student_subscriptions tables
-- Enables per-term and per-year student subscription management across Academics and Finance modules.

CREATE TABLE IF NOT EXISTS public.student_subscription_plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    billing_cycle TEXT NOT NULL DEFAULT 'per_term', -- 'per_term', 'per_year', 'monthly'
    amount NUMERIC NOT NULL DEFAULT 0,
    sms_allocated_per_student INTEGER DEFAULT 10,
    sms_usage_type TEXT DEFAULT 'academic_results_only',
    features JSONB DEFAULT '[]'::jsonb,
    applicable_classes JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    institution_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.student_subscriptions (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,
    student_name TEXT NOT NULL,
    class_name TEXT,
    plan_id TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    billing_cycle TEXT NOT NULL DEFAULT 'per_term',
    amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'due', 'expired'
    start_date DATE DEFAULT CURRENT_DATE,
    expiry_date DATE,
    institution_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student ON public.student_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_inst ON public.student_subscriptions(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_subscription_plans_inst ON public.student_subscription_plans(institution_id);

-- RLS Policies
ALTER TABLE public.student_subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read on student_subscription_plans" ON public.student_subscription_plans;
CREATE POLICY "Allow public read on student_subscription_plans" ON public.student_subscription_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated all on student_subscription_plans" ON public.student_subscription_plans;
CREATE POLICY "Allow authenticated all on student_subscription_plans" ON public.student_subscription_plans FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow public read on student_subscriptions" ON public.student_subscriptions;
CREATE POLICY "Allow public read on student_subscriptions" ON public.student_subscriptions FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated all on student_subscriptions" ON public.student_subscriptions;
CREATE POLICY "Allow authenticated all on student_subscriptions" ON public.student_subscriptions FOR ALL USING (true);

GRANT ALL ON public.student_subscription_plans TO anon, authenticated, service_role;
GRANT ALL ON public.student_subscriptions TO anon, authenticated, service_role;
