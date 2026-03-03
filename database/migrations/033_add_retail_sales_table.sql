
-- Retail Sales Table
CREATE TABLE IF NOT EXISTS public.retail_sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.retail_stores(id) ON DELETE CASCADE,
    agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- if sold by van agent
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_name TEXT,
    customer_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for retail_sales
ALTER TABLE public.retail_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their institution's retail_sales"
    ON public.retail_sales FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

CREATE POLICY "Admins/Agents can record their institution's retail_sales"
    ON public.retail_sales FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

-- Index for analytics performance
CREATE INDEX IF NOT EXISTS idx_retail_sales_store ON public.retail_sales(store_id);
CREATE INDEX IF NOT EXISTS idx_retail_sales_inst ON public.retail_sales(institution_id);
CREATE INDEX IF NOT EXISTS idx_retail_sales_date ON public.retail_sales(created_at);
