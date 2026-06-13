-- Migration 230: Create platform_expenses table
CREATE TABLE IF NOT EXISTS public.platform_expenses (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    category TEXT NOT NULL,
    date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    institution_id TEXT REFERENCES public.institutions(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE public.platform_expenses ENABLE ROW LEVEL SECURITY;

-- Super Admin only policies
DROP POLICY IF EXISTS "Super Admin only access for platform_expenses" ON public.platform_expenses;
CREATE POLICY "Super Admin only access for platform_expenses" ON public.platform_expenses
    FOR ALL USING (public.get_curr_user_role() = 'super_admin')
    WITH CHECK (public.get_curr_user_role() = 'super_admin');
