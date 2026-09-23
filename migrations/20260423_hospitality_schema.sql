
-- Hospitality Module Tables

-- 1. Hospitality Items (Rooms, Safari Packages, etc.)
CREATE TABLE IF NOT EXISTS public.hospitality_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(12,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL, -- 'Room', 'Safari', 'Experience', etc.
    features TEXT[] DEFAULT '{}',
    location TEXT,
    duration TEXT,
    images TEXT[] DEFAULT '{}',
    rating DECIMAL(3,1) DEFAULT 5.0,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Hospitality Menu Items (Food & Beverages)
CREATE TABLE IF NOT EXISTS public.hospitality_menu_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
    category TEXT NOT NULL, -- 'Breakfast', 'Main Course', 'Drinks', etc.
    image_url TEXT,
    is_available BOOLEAN DEFAULT TRUE,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Hospitality Orders (Dining & Room Service)
CREATE TABLE IF NOT EXISTS public.hospitality_orders (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    room_number TEXT NOT NULL,
    items JSONB NOT NULL DEFAULT '[]', -- Array of {itemId, name, quantity, unitPrice, kitchenStatus}
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'confirmed', 'delivered', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Hospitality Vehicles (Fleet)
CREATE TABLE IF NOT EXISTS public.hospitality_vehicles (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    type TEXT NOT NULL, -- 'Land Cruiser', 'Van', etc.
    plate_number TEXT NOT NULL,
    capacity INTEGER DEFAULT 4,
    features TEXT[] DEFAULT '{}',
    status TEXT DEFAULT 'available', -- 'available', 'on-drive', 'maintenance'
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Hospitality Drivers
CREATE TABLE IF NOT EXISTS public.hospitality_drivers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    name TEXT NOT NULL,
    phone TEXT,
    license_number TEXT,
    status TEXT DEFAULT 'available', -- 'available', 'busy', 'off-duty'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Hospitality Drive Bookings (Game Drives)
CREATE TABLE IF NOT EXISTS public.hospitality_drive_bookings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    guest_name TEXT NOT NULL,
    room_number TEXT,
    vehicle_id TEXT REFERENCES public.hospitality_vehicles(id),
    driver_id TEXT REFERENCES public.hospitality_drivers(id),
    date DATE NOT NULL,
    time_slot TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'confirmed', 'completed', 'cancelled'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for all tables
ALTER TABLE public.hospitality_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitality_menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitality_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitality_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitality_drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitality_drive_bookings ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Allow authenticated users full access for now)
-- In a real prod environment, these should be scoped by institution_id
CREATE POLICY "hospitality_items_policy" ON public.hospitality_items FOR ALL USING (true);
CREATE POLICY "hospitality_menu_items_policy" ON public.hospitality_menu_items FOR ALL USING (true);
CREATE POLICY "hospitality_orders_policy" ON public.hospitality_orders FOR ALL USING (true);
CREATE POLICY "hospitality_vehicles_policy" ON public.hospitality_vehicles FOR ALL USING (true);
CREATE POLICY "hospitality_drivers_policy" ON public.hospitality_drivers FOR ALL USING (true);
CREATE POLICY "hospitality_drive_bookings_policy" ON public.hospitality_drive_bookings FOR ALL USING (true);

-- Data API grants (required from Supabase Oct 30 2025: new tables need explicit grants)
GRANT SELECT ON public.hospitality_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitality_items TO authenticated;
GRANT ALL ON public.hospitality_items TO service_role;

GRANT SELECT ON public.hospitality_menu_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitality_menu_items TO authenticated;
GRANT ALL ON public.hospitality_menu_items TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.hospitality_orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitality_orders TO authenticated;
GRANT ALL ON public.hospitality_orders TO service_role;

GRANT SELECT ON public.hospitality_vehicles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitality_vehicles TO authenticated;
GRANT ALL ON public.hospitality_vehicles TO service_role;

GRANT SELECT ON public.hospitality_drivers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitality_drivers TO authenticated;
GRANT ALL ON public.hospitality_drivers TO service_role;

GRANT SELECT, INSERT, UPDATE ON public.hospitality_drive_bookings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hospitality_drive_bookings TO authenticated;
GRANT ALL ON public.hospitality_drive_bookings TO service_role;
