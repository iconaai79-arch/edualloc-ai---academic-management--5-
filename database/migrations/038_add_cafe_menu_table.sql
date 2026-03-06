-- Migration 038: Add Dedicated Cafe Menu Table
-- This table separates cafe/restaurant items from general retail inventory.

CREATE TABLE IF NOT EXISTS public.cafe_menu_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(12,2) NOT NULL DEFAULT 0,
    category TEXT DEFAULT 'Cafe',
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    sku TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.cafe_menu_items ENABLE ROW LEVEL SECURITY;

-- 1. Users can view their institution's cafe menu items
CREATE POLICY "Users can view cafe_menu_items" ON public.cafe_menu_items
FOR SELECT USING (
    institution_id = get_curr_user_inst_id() 
    OR get_curr_user_role() = 'super_admin'
);

-- 2. Admins can manage cafe_menu_items
-- We include the same broad role list as we did for retail to ensure no one is locked out.
CREATE POLICY "Admins can manage cafe_menu_items" ON public.cafe_menu_items
FOR ALL USING (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN (
        'admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 
        'academics_officer', 'agrovet_admin', 'property_admin', 
        'carwash_admin', 'transport_admin', 'boarding_master', 
        'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'
    ))
    OR get_curr_user_role() = 'super_admin'
)
WITH CHECK (
    (institution_id = get_curr_user_inst_id() AND get_curr_user_role() IN (
        'admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 
        'academics_officer', 'agrovet_admin', 'property_admin', 
        'carwash_admin', 'transport_admin', 'boarding_master', 
        'county_admin', 'mechanic_admin', 'reseller', 'retail_agent', 'field_agent'
    ))
    OR get_curr_user_role() = 'super_admin'
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_cafe_menu_inst ON public.cafe_menu_items(institution_id);
