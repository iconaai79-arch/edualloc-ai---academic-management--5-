-- ============================================================================
-- RETAIL & AGENCY MODULE SCHEMA
-- ============================================================================

-- 1. Retail Stores
CREATE TABLE IF NOT EXISTS public.retail_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    store_type TEXT NOT NULL CHECK (store_type IN ('main_store', 'branch_store', 'van_stock', 'warehouse')),
    location TEXT,
    store_manager_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- for van_stock
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for retail_stores
ALTER TABLE public.retail_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their institution's retail_stores"
    ON public.retail_stores FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));
CREATE POLICY "Admins can manage their institution's retail_stores"
    ON public.retail_stores FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

-- 2. Retail Inventory Items (Product Catalog)
CREATE TABLE IF NOT EXISTS public.retail_inventory_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    srp_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    unit TEXT NOT NULL,
    image_url TEXT,
    reorder_level INTEGER NOT NULL DEFAULT 0,
    marketplace_enabled BOOLEAN DEFAULT false,
    buffer_stock INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for retail_inventory_items
ALTER TABLE public.retail_inventory_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their institution's retail_inventory_items"
    ON public.retail_inventory_items FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));
CREATE POLICY "Admins can manage their institution's retail_inventory_items"
    ON public.retail_inventory_items FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

-- 3. Retail Store Stock (Junction Table: How much of Item X is in Store Y)
CREATE TABLE IF NOT EXISTS public.retail_store_stock (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES public.retail_stores(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    UNIQUE(store_id, item_id)
);

-- Enable RLS for retail_store_stock (Implicitly inheriting via store/item policies)
ALTER TABLE public.retail_store_stock ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view store stock for their institution"
    ON public.retail_store_stock FOR SELECT
    USING (
        store_id IN (
            SELECT id FROM public.retail_stores WHERE institution_id IN (
                SELECT institution_id FROM public.users WHERE id = auth.uid()
            )
        )
    );
CREATE POLICY "Admins can manage store stock for their institution"
    ON public.retail_store_stock FOR ALL
    USING (
        store_id IN (
            SELECT id FROM public.retail_stores WHERE institution_id IN (
                SELECT institution_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

-- 4. Retail Serialized Items (Tracking exact phones/printers)
CREATE TABLE IF NOT EXISTS public.retail_serialized_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.retail_inventory_items(id) ON DELETE CASCADE,
    store_id UUID NOT NULL REFERENCES public.retail_stores(id) ON DELETE CASCADE,
    serial_number TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('in_stock', 'sold', 'reserved', 'in_transit', 'defective')),
    cost_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    sold_price NUMERIC(10, 2),
    sale_id UUID, -- Soft link to agrovet_sales or a future retail_sales table
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(institution_id, item_id, serial_number) 
);

-- Enable RLS for retail_serialized_items
ALTER TABLE public.retail_serialized_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view serialized items for their institution"
    ON public.retail_serialized_items FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));
CREATE POLICY "Admins can manage serialized items for their institution"
    ON public.retail_serialized_items FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

-- 5. Retail Stock Transfers (Moving stock between stores/agents)
CREATE TABLE IF NOT EXISTS public.retail_stock_transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    source_store_id UUID NOT NULL REFERENCES public.retail_stores(id),
    destination_store_id UUID NOT NULL REFERENCES public.retail_stores(id),
    requested_by_id UUID NOT NULL REFERENCES auth.users(id),
    approved_by_id UUID REFERENCES auth.users(id),
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'completed', 'rejected', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS for retail_stock_transfers
ALTER TABLE public.retail_stock_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view stock transfers for their institution"
    ON public.retail_stock_transfers FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));
CREATE POLICY "Admins can manage stock transfers for their institution"
    ON public.retail_stock_transfers FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

-- 6. Retail Stock Transfer Items
CREATE TABLE IF NOT EXISTS public.retail_stock_transfer_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES public.retail_stock_transfers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.retail_inventory_items(id),
    quantity INTEGER NOT NULL DEFAULT 0,
    serial_numbers TEXT[] -- Array of specific items being transferred
);

-- Enable RLS for retail_stock_transfer_items
ALTER TABLE public.retail_stock_transfer_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view stock transfer items for their institution"
    ON public.retail_stock_transfer_items FOR SELECT
    USING (
        transfer_id IN (
            SELECT id FROM public.retail_stock_transfers WHERE institution_id IN (
                SELECT institution_id FROM public.users WHERE id = auth.uid()
            )
        )
    );
CREATE POLICY "Admins can manage stock transfer items for their institution"
    ON public.retail_stock_transfer_items FOR ALL
    USING (
        transfer_id IN (
            SELECT id FROM public.retail_stock_transfers WHERE institution_id IN (
                SELECT institution_id FROM public.users WHERE id = auth.uid()
            )
        )
    );

-- 7. Retail Wishlist / Leads
CREATE TABLE IF NOT EXISTS public.retail_wishlist (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    customer_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    product_query TEXT NOT NULL,
    max_budget NUMERIC(10, 2),
    urgency TEXT NOT NULL CHECK (urgency IN ('urgent', 'casual')),
    captured_by_id UUID NOT NULL REFERENCES auth.users(id),
    is_matched BOOLEAN DEFAULT false,
    notified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for retail_wishlist
ALTER TABLE public.retail_wishlist ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view wishlist for their institution"
    ON public.retail_wishlist FOR SELECT
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));
CREATE POLICY "Admins/Agents can manage wishlist for their institution"
    ON public.retail_wishlist FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));

-- 8. Retail Commission Ledger
CREATE TABLE IF NOT EXISTS public.retail_commissions_ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES auth.users(id),
    sale_id UUID NOT NULL, -- Soft link to agrovet_sales or a future retail_sales table
    item_id UUID NOT NULL REFERENCES public.retail_inventory_items(id),
    serial_number TEXT,
    base_price NUMERIC(10, 2) NOT NULL,
    sold_price NUMERIC(10, 2) NOT NULL,
    commission_amount NUMERIC(10, 2) NOT NULL,
    is_paid BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for retail_commissions_ledger
ALTER TABLE public.retail_commissions_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agents can view their own commissions"
    ON public.retail_commissions_ledger FOR SELECT
    USING (
        institution_id IN (
            SELECT institution_id FROM public.users WHERE id = auth.uid()
        ) AND agent_id = auth.uid()
    );
CREATE POLICY "Admins can view and manage all commissions"
    ON public.retail_commissions_ledger FOR ALL
    USING (institution_id IN (
        SELECT institution_id FROM public.users WHERE id = auth.uid()
    ));
