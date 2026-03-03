-- Enhancement for Retail & Agency Module

-- 1. Add store_id to requisitions if not already there (for store-level requests)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='requisitions' AND column_name='store_id') THEN
        ALTER TABLE public.requisitions ADD COLUMN store_id UUID REFERENCES public.retail_stores(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add mpesa_config to retail_stores for store-specific payments
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='retail_stores' AND column_name='mpesa_config') THEN
        ALTER TABLE public.retail_stores ADD COLUMN mpesa_config JSONB;
    END IF;
END $$;

-- 3. Create Retail Expenses Table
CREATE TABLE IF NOT EXISTS public.retail_expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.retail_stores(id) ON DELETE CASCADE,
    amount NUMERIC(12, 2) NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by_id UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS for retail_expenses
ALTER TABLE public.retail_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their institution's retail_expenses"
    ON public.retail_expenses FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins/Managers can manage their institution's retail_expenses"
    ON public.retail_expenses FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_retail_expenses_store ON public.retail_expenses(store_id);
CREATE INDEX IF NOT EXISTS idx_retail_expenses_inst ON public.retail_expenses(institution_id);
