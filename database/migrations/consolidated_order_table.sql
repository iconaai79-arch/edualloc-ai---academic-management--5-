-- Consolidated SQL for Retail Orders (retail_sales)
-- This represents the final schema after migrations 032, 033, 042, and 043.

-- 1. Related Table: retail_stores (References)
-- Used by store_id in retail_sales
CREATE TABLE IF NOT EXISTS public.retail_stores (
    id TEXT PRIMARY KEY, -- Changed from UUID in Migration 042
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    store_type TEXT NOT NULL CHECK (store_type IN ('main_store', 'branch_store', 'van_stock', 'warehouse', 'virtual_store')),
    location TEXT,
    store_manager_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    agent_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    mpesa_config JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Main Order Table: retail_sales
CREATE TABLE IF NOT EXISTS public.retail_sales (
    id TEXT PRIMARY KEY, -- Changed from UUID in Migration 042
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    store_id TEXT NOT NULL REFERENCES public.retail_stores(id) ON DELETE CASCADE,
    agent_id TEXT REFERENCES public.users(id) ON DELETE SET NULL,
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of objects: {itemId, name, quantity, unitPrice, kitchenStatus}
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT, -- Added in Migration 043
    unified_tab_id TEXT, -- Added in Migration 043 (links to vehicle ID/job)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Indexes for performance
CREATE INDEX IF NOT EXISTS idx_retail_sales_store ON public.retail_sales(store_id);
CREATE INDEX IF NOT EXISTS idx_retail_sales_inst ON public.retail_sales(institution_id);
CREATE INDEX IF NOT EXISTS idx_retail_sales_date ON public.retail_sales(created_at);
CREATE INDEX IF NOT EXISTS idx_retail_sales_tab ON public.retail_sales(unified_tab_id);
