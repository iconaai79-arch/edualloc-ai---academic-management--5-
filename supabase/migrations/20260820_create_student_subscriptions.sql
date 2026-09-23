-- Create student_subscriptions table for termly and annual licensing records
CREATE TABLE IF NOT EXISTS public.student_subscriptions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    institution_id TEXT NOT NULL,
    student_id TEXT,
    student_name TEXT,
    class_name TEXT,
    plan_id TEXT,
    plan_name TEXT,
    billing_cycle TEXT,
    amount NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'active',
    start_date TEXT,
    expiry_date TEXT,
    payment_reference TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for rapid querying
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_inst ON public.student_subscriptions(institution_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_student ON public.student_subscriptions(student_id);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_status ON public.student_subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_student_subscriptions_expiry ON public.student_subscriptions(expiry_date);

-- Enable Row Level Security
ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;

-- Public service access policy
CREATE POLICY "Allow all operations on student_subscriptions"
ON public.student_subscriptions
FOR ALL
USING (true)
WITH CHECK (true);

-- Data API grants (required from Supabase Oct 30 2025: new tables need explicit grants)
GRANT SELECT ON public.student_subscriptions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_subscriptions TO authenticated;
GRANT ALL ON public.student_subscriptions TO service_role;
