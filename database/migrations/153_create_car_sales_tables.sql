
-- Migration 153: Car Sales & Smart Marketplace
-- Focus: Immersive listings, AI valuations, and seamless test drive bookings.

-- 1. Vehicle Listings
CREATE TABLE IF NOT EXISTS public.car_sales_listings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    seller_id TEXT,
    
    -- Basic Info
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    year INTEGER NOT NULL,
    trim TEXT,
    price DECIMAL(15,2) NOT NULL,
    mileage INTEGER NOT NULL,
    fuel_type TEXT DEFAULT 'Petrol', -- Petrol, Diesel, Electric, Hybrid
    transmission TEXT DEFAULT 'Automatic', -- Automatic, Manual
    body_type TEXT, -- Sedan, SUV, etc.
    engine_size TEXT,
    color TEXT,
    
    -- Multimedia & Immersive
    main_image_url TEXT,
    gallery_urls TEXT[] DEFAULT '{}', 
    tour_360_url TEXT, 
    video_walkthrough_url TEXT,
    
    -- AI & Trust Metadata
    ai_valuation_status TEXT DEFAULT 'pending', 
    estimated_market_value DECIMAL(15,2),
    inspection_score INTEGER CHECK (inspection_score BETWEEN 0 AND 100),
    vin_number TEXT,
    verified_history BOOLEAN DEFAULT false,
    
    -- Status & Analytics
    status TEXT DEFAULT 'active', -- 'draft', 'active', 'sold', 'archived'
    view_count INTEGER DEFAULT 0,
    inquiry_count INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Concierge Test Drive Bookings
CREATE TABLE IF NOT EXISTS public.car_test_drives (
    id TEXT PRIMARY KEY,
    listing_id TEXT REFERENCES public.car_sales_listings(id) ON DELETE CASCADE,
    buyer_id TEXT,
    buyer_name TEXT,
    buyer_phone TEXT,
    
    booking_date TIMESTAMPTZ NOT NULL,
    delivery_address TEXT, 
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. AI Appraisals (Instant Trade-In Offers)
CREATE TABLE IF NOT EXISTS public.car_appraisals (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    institution_id TEXT,
    
    vehicle_details JSONB, 
    images TEXT[] DEFAULT '{}',
    offered_amount DECIMAL(15,2),
    status TEXT DEFAULT 'pending', 
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Decouple FKs and add Foreign Key handle for robustness
DO $$
BEGIN
    BEGIN
        ALTER TABLE public.car_sales_listings ADD CONSTRAINT car_sales_listings_institution_id_fkey FOREIGN KEY (institution_id) REFERENCES public.institutions(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Skipping car_sales_listings FK due to mismatch.';
    END;
END $$;

-- RLS POLICIES
ALTER TABLE public.car_sales_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_test_drives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_appraisals ENABLE ROW LEVEL SECURITY;

-- Everyone can view active listings
DROP POLICY IF EXISTS "Active Listings Public Read" ON public.car_sales_listings;
CREATE POLICY "Active Listings Public Read" ON public.car_sales_listings
    FOR SELECT USING (status = 'active');

-- Staff/Admins can manage their institution's listings
DROP POLICY IF EXISTS "Listings Manage Policy" ON public.car_sales_listings;
CREATE POLICY "Listings Manage Policy" ON public.car_sales_listings
    FOR ALL USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin');

-- Test Drives: Buyers can insert, staff can manage
DROP POLICY IF EXISTS "Public Test Drive Request" ON public.car_test_drives;
CREATE POLICY "Public Test Drive Request" ON public.car_test_drives
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Test Drive Manage Policy" ON public.car_test_drives;
CREATE POLICY "Test Drive Manage Policy" ON public.car_test_drives
    FOR ALL USING (EXISTS (
        SELECT 1 FROM public.car_sales_listings l 
        WHERE l.id = listing_id AND (l.institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = 'super_admin')
    ));
