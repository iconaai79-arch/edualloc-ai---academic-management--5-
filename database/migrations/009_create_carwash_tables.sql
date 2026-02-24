-- Migration: 009_create_carwash_tables
-- Description: Creates tables and RLS policies for the Car Wash business module.

-- 1. Tables
CREATE TABLE IF NOT EXISTS carwash_packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    pricing JSONB NOT NULL,
    estimated_duration_minutes INTEGER,
    color_accent TEXT,
    is_interior_only BOOLEAN DEFAULT FALSE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    total_washes INTEGER DEFAULT 0,
    loyalty_stamps INTEGER DEFAULT 0,
    last_wash_at TIMESTAMP WITH TIME ZONE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_vehicles (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES carwash_customers(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL,
    make TEXT,
    model TEXT,
    color TEXT,
    vehicle_type TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_jobs (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES carwash_customers(id) ON DELETE SET NULL,
    vehicle_plate TEXT NOT NULL,
    vehicle_type TEXT NOT NULL,
    package_id TEXT REFERENCES carwash_packages(id) ON DELETE SET NULL,
    package_name TEXT,
    add_ons TEXT[],
    attendant_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    attendant_name TEXT,
    bay_number INTEGER,
    status TEXT DEFAULT 'queued',
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    amount_charged DECIMAL(12, 2),
    amount_paid DECIMAL(12, 2),
    payment_method TEXT,
    is_loyalty_redemption BOOLEAN DEFAULT FALSE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_inventory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT,
    current_stock INTEGER DEFAULT 0,
    unit TEXT,
    reorder_level INTEGER DEFAULT 10,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_feedback (
    id TEXT PRIMARY KEY,
    job_id TEXT REFERENCES carwash_jobs(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL,
    comment TEXT,
    customer_id TEXT REFERENCES carwash_customers(id) ON DELETE SET NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS carwash_shifts (
    id TEXT PRIMARY KEY,
    attendant_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    check_in_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    check_out_time TIMESTAMP WITH TIME ZONE,
    total_jobs INTEGER DEFAULT 0,
    total_revenue DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Row Level Security (RLS)
-- Enable RLS on all tables
ALTER TABLE carwash_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_shifts ENABLE ROW LEVEL SECURITY;

-- Create Policies (Generic "all access for same institution" for simplicity, matching other modules)
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT table_name 
             FROM information_schema.tables 
             WHERE table_name LIKE 'carwash_%' AND table_schema = 'public'
    LOOP
        EXECUTE format('CREATE POLICY "Institution staff can manage %I" ON %I FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()))', t, t);
    END LOOP;
END $$;
