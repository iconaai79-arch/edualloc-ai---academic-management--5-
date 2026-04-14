-- Transport Module Schema: Vehicles, Onboarding, and Gate Logs
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    plate_number TEXT NOT NULL,
    model TEXT,
    vehicle_type TEXT DEFAULT 'school', -- 'school' or 'private'
    capacity INTEGER,
    driver_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    assistant_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'active', -- 'active', 'maintenance', 'out_of_service', 'assigned'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transport Onboarding records for student tracking
CREATE TABLE IF NOT EXISTS transport_onboarding (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE SET NULL,
    student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    direction TEXT NOT NULL, -- 'to_school', 'from_school'
    status TEXT NOT NULL, -- 'pending', 'onboarded', 'offboarded', 'received'
    location_lat DOUBLE PRECISION,
    location_lng DOUBLE PRECISION,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    parent_confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Vehicle Entry/Exit logs (Gate Pass System)
CREATE TABLE IF NOT EXISTS vehicle_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- 'entry', 'exit'
    security_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

-- Enable RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE transport_onboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_logs ENABLE ROW LEVEL SECURITY;

-- Permissive RLS Policies (Pattern used in other modules)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicles' AND policyname = 'Allow all for vehicles') THEN
        CREATE POLICY "Allow all for vehicles" ON vehicles FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'transport_onboarding' AND policyname = 'Allow all for transport_onboarding') THEN
        CREATE POLICY "Allow all for transport_onboarding" ON transport_onboarding FOR ALL USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_logs' AND policyname = 'Allow all for vehicle_logs') THEN
        CREATE POLICY "Allow all for vehicle_logs" ON vehicle_logs FOR ALL USING (true);
    END IF;
END $$;
