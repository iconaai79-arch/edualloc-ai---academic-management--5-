
-- 1. Create county_inventory_categories table
CREATE TABLE IF NOT EXISTS county_inventory_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    county_id UUID NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create county_stores table
CREATE TABLE IF NOT EXISTS county_stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    county_id UUID NOT NULL,
    name TEXT NOT NULL,
    location_name TEXT,
    latitude FLOAT,
    longitude FLOAT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create county_inventory table
CREATE TABLE IF NOT EXISTS county_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    county_id UUID NOT NULL,
    name TEXT NOT NULL,
    category TEXT, -- Can be linked to categories.name or id, keeping loose for now
    quantity INTEGER NOT NULL DEFAULT 0,
    unit TEXT,
    supplier_name TEXT,
    status TEXT CHECK (status IN ('at_hq', 'in_transit', 'received')) DEFAULT 'at_hq',
    target_institution_id UUID,
    driver_name TEXT,
    delivery_method TEXT CHECK (delivery_method IN ('driver', 'parcel')) DEFAULT 'driver',
    tracking_number TEXT,
    qr_code TEXT,
    at_hq_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recipient_signature TEXT,
    received_by TEXT,
    recipient_name TEXT,
    dispatched_date TIMESTAMP WITH TIME ZONE,
    received_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE county_inventory_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE county_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE county_inventory ENABLE ROW LEVEL SECURITY;

-- 5. Create basic policies (Allow all authenticated users for now)
CREATE POLICY "Enable all access for authenticated users" ON county_inventory_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON county_stores FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON county_inventory FOR ALL USING (auth.role() = 'authenticated');

-- 6. Grant permissions (Optional but recommended)
GRANT ALL ON county_inventory_categories TO authenticated;
GRANT ALL ON county_inventory_categories TO service_role;

GRANT ALL ON county_stores TO authenticated;
GRANT ALL ON county_stores TO service_role;

GRANT ALL ON county_inventory TO authenticated;
GRANT ALL ON county_inventory TO service_role;
