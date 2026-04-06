-- Migration 131: Add Retail Logistics and Order Management
-- Created by Antigravity AI

CREATE TABLE IF NOT EXISTS public.retail_couriers (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(id),
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Active', 'Rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.retail_delivery_rates (
    id TEXT PRIMARY KEY,
    courier_id TEXT REFERENCES public.retail_couriers(id) ON DELETE CASCADE,
    destination TEXT NOT NULL,
    rate NUMERIC DEFAULT 0,
    estimated_days INTEGER DEFAULT 1,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    institution_id TEXT REFERENCES public.institutions(id)
);

CREATE TABLE IF NOT EXISTS public.retail_marketplace_orders (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES public.institutions(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    delivery_address TEXT,
    destination_id TEXT REFERENCES public.retail_delivery_rates(id),
    items_json JSONB NOT NULL,
    items_total NUMERIC DEFAULT 0,
    delivery_fee NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    payment_status TEXT DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed')),
    order_status TEXT DEFAULT 'Received' CHECK (order_status IN ('Received', 'Processing', 'Dispatched', 'Delivered', 'Cancelled')),
    payment_ref TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.retail_couriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_delivery_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retail_marketplace_orders ENABLE ROW LEVEL SECURITY;

-- Policies for Couriers
CREATE POLICY "Couriers visible to institutional users" ON public.retail_couriers
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "Admin can manage couriers" ON public.retail_couriers
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "Anyone can apply as a courier" ON public.retail_couriers
    FOR INSERT WITH CHECK (true);

-- Policies for Delivery Rates
CREATE POLICY "Rates visible to all for public marketplace" ON public.retail_delivery_rates
    FOR SELECT USING (true);

CREATE POLICY "Admin can manage rates" ON public.retail_delivery_rates
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Policies for Orders
CREATE POLICY "Orders visible to agency staff" ON public.retail_marketplace_orders
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

CREATE POLICY "Anyone can create orders (public checkout)" ON public.retail_marketplace_orders
    FOR INSERT WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_retail_couriers_inst ON public.retail_couriers(institution_id);
CREATE INDEX idx_retail_delivery_rates_inst ON public.retail_delivery_rates(institution_id);
CREATE INDEX idx_retail_orders_inst ON public.retail_marketplace_orders(institution_id);
