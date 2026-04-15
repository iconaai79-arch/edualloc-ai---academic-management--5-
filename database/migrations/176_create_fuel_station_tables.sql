-- Fuel Station Management Module Schema
-- Supports multi-location stations, multi-tank, multi-pump configurations with shift-based tracking

-- REPAIR BLOCK: Ensure institution_id exists on all tables (Fixes ERROR 42703 for existing tables)
DO $$ 
DECLARE 
    tables TEXT[] := ARRAY[
        'fuel_stations', 'fuel_tanks', 'fuel_pumps', 'fuel_prices', 'fuel_sales', 
        'fuel_inventory_log', 'station_shifts', 'station_items', 'station_pos_sales', 
        'station_pos_sale_items', 'carwash_services', 'carwash_sales', 
        'car_servicing_packages', 'car_servicing_sales', 'fuel_station_customers', 
        'fuel_transfers', 'fuel_fleet_accounts', 'fuel_fleet_cards', 
        'fuel_price_history', 'fuel_etr_configs', 'fuel_reorder_predictions', 
        'fuel_sms_logs', 'fuel_fleet_telemetry', 'fuel_financial_reports', 
        'fuel_leak_alerts', 'fuel_staff_achievements', 'fuel_station_assets', 
        'fuel_maintenance_logs', 'civil_yards', 'civil_products', 
        'civil_batches', 'civil_sales'
    ];
    t TEXT;
BEGIN 
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = t) THEN
            BEGIN
                EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE', t);
            EXCEPTION WHEN others THEN
                RAISE NOTICE 'Could not add institution_id to table %', t;
            END;
        END IF;
    END LOOP;
END $$;

-- 0. Stations (Physical locations)
CREATE TABLE IF NOT EXISTS fuel_stations (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    contact_number TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Fuel Tanks (Physical storage)
CREATE TABLE IF NOT EXISTS fuel_tanks (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    fuel_type TEXT NOT NULL CHECK (fuel_type IN ('Petrol', 'Diesel', 'V-Power', 'Kerosene', 'LPG')),
    capacity_liters DECIMAL NOT NULL,
    current_level_liters DECIMAL DEFAULT 0,
    low_level_threshold DECIMAL DEFAULT 500,
    lead_time_days INTEGER DEFAULT 2, -- Average days for delivery
    auto_reorder_enabled BOOLEAN DEFAULT false,
    sensor_id TEXT,
    sensor_vendor TEXT,
    last_temperature DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Fuel Pumps (Dispensing units connected to tanks)
CREATE TABLE IF NOT EXISTS fuel_pumps (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    tank_id TEXT REFERENCES fuel_tanks(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    pump_number TEXT NOT NULL,
    nozzle_count INTEGER DEFAULT 1,
    current_totalizer_reading DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'out_of_service')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Fuel Prices
CREATE TABLE IF NOT EXISTS fuel_prices (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    fuel_type TEXT NOT NULL,
    price_per_liter DECIMAL NOT NULL,
    effective_from TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- 4. Fuel Sales
CREATE TABLE IF NOT EXISTS fuel_sales (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    pump_id TEXT REFERENCES fuel_pumps(id) ON DELETE SET NULL,
    attendant_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    customer_id TEXT, -- Linked to fuel_station_customers
    vehicle_plate TEXT,
    fuel_type TEXT NOT NULL,
    liters_sold DECIMAL NOT NULL,
    price_per_liter DECIMAL NOT NULL,
    total_amount DECIMAL NOT NULL,
    tax_amount DECIMAL DEFAULT 0,
    etr_receipt_number TEXT,
    points_earned INTEGER DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mpesa', 'card', 'fleet_card', 'credit')),
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
    shift_id TEXT, 
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Inventory Logs
CREATE TABLE IF NOT EXISTS fuel_inventory_log (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    tank_id TEXT REFERENCES fuel_tanks(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    log_type TEXT NOT NULL CHECK (log_type IN ('delivery', 'manual_dip', 'adjustment')),
    quantity DECIMAL NOT NULL, 
    recorded_by TEXT REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Shift Management
CREATE TABLE IF NOT EXISTS station_shifts (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    attendant_id TEXT REFERENCES users(id),
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
    expected_cash DECIMAL DEFAULT 0,
    actual_cash DECIMAL DEFAULT 0,
    discrepancy DECIMAL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. POS Items
CREATE TABLE IF NOT EXISTS station_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'lubricant' CHECK (category IN ('lubricant', 'snack', 'drink', 'car_care', 'other')),
    sku TEXT,
    price DECIMAL NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 8. POS Sales
CREATE TABLE IF NOT EXISTS station_pos_sales (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    attendant_id TEXT REFERENCES users(id),
    shift_id TEXT REFERENCES station_shifts(id),
    customer_id TEXT,
    total_amount DECIMAL NOT NULL,
    points_earned INTEGER DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mpesa', 'card', 'credit')),
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS station_pos_sale_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    sale_id TEXT REFERENCES station_pos_sales(id) ON DELETE CASCADE,
    item_id TEXT REFERENCES station_items(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL NOT NULL,
    subtotal DECIMAL NOT NULL
);

-- 9. Carwash Services
CREATE TABLE IF NOT EXISTS carwash_services (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL NOT NULL,
    estimated_duration_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. Carwash Sales
CREATE TABLE IF NOT EXISTS carwash_sales (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    attendant_id TEXT REFERENCES users(id),
    shift_id TEXT REFERENCES station_shifts(id),
    service_id TEXT REFERENCES carwash_services(id),
    vehicle_plate TEXT,
    customer_id TEXT,
    total_amount DECIMAL NOT NULL,
    points_earned INTEGER DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mpesa', 'card')),
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_progress', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Car Servicing Packages
CREATE TABLE IF NOT EXISTS car_servicing_packages (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL NOT NULL,
    estimated_duration_minutes INTEGER DEFAULT 60,
    inventory_items_required JSONB, -- e.g. [{"item_id": "i1", "quantity": 4}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. Car Servicing Sales
CREATE TABLE IF NOT EXISTS car_servicing_sales (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    mechanic_id TEXT REFERENCES users(id),
    shift_id TEXT REFERENCES station_shifts(id),
    package_id TEXT REFERENCES car_servicing_packages(id),
    vehicle_plate TEXT,
    vehicle_model TEXT,
    customer_id TEXT,
    odometer_reading INTEGER,
    service_interval_km INTEGER DEFAULT 5000,
    next_service_odometer INTEGER,
    total_amount DECIMAL NOT NULL,
    points_earned INTEGER DEFAULT 0,
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'mpesa', 'card')),
    payment_status TEXT DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Customers & Loyalty
CREATE TABLE IF NOT EXISTS fuel_station_customers (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    email TEXT,
    vehicle_plate TEXT,
    loyalty_points INTEGER DEFAULT 0,
    credit_limit DECIMAL DEFAULT 0,
    current_balance DECIMAL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 14. Inter-Station Transfers
CREATE TABLE IF NOT EXISTS fuel_transfers (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    source_station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    destination_station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    source_tank_id TEXT REFERENCES fuel_tanks(id) ON DELETE CASCADE,
    destination_tank_id TEXT REFERENCES fuel_tanks(id) ON DELETE CASCADE,
    fuel_type TEXT NOT NULL,
    quantity DECIMAL NOT NULL,
    recorded_by TEXT REFERENCES users(id),
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'in_transit', 'completed', 'cancelled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for transfers
ALTER TABLE fuel_transfers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage fuel transfers" ON fuel_transfers;
CREATE POLICY "Users can manage fuel transfers" ON fuel_transfers FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Enable RLS
ALTER TABLE fuel_stations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_tanks ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_pumps ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_inventory_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_pos_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE station_pos_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE carwash_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_servicing_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE car_servicing_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_station_customers ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Institutions can manage their stations" ON fuel_stations;
CREATE POLICY "Institutions can manage their stations" ON fuel_stations FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage fuel systems" ON fuel_tanks;
CREATE POLICY "Users can manage fuel systems" ON fuel_tanks FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage fuel pumps" ON fuel_pumps;
CREATE POLICY "Users can manage fuel pumps" ON fuel_pumps FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage fuel prices" ON fuel_prices;
CREATE POLICY "Users can manage fuel prices" ON fuel_prices FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage fuel sales" ON fuel_sales;
CREATE POLICY "Users can manage fuel sales" ON fuel_sales FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage inventory logs" ON fuel_inventory_log;
CREATE POLICY "Users can manage inventory logs" ON fuel_inventory_log FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage station shifts" ON station_shifts;
CREATE POLICY "Users can manage station shifts" ON station_shifts FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage station items" ON station_items;
CREATE POLICY "Users can manage station items" ON station_items FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage POS sales" ON station_pos_sales;
CREATE POLICY "Users can manage POS sales" ON station_pos_sales FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage POS sale items" ON station_pos_sale_items;
CREATE POLICY "Users can manage POS sale items" ON station_pos_sale_items FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage carwash services" ON carwash_services;
CREATE POLICY "Users can manage carwash services" ON carwash_services FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage carwash sales" ON carwash_sales;
CREATE POLICY "Users can manage carwash sales" ON carwash_sales FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage car servicing packages" ON car_servicing_packages;
CREATE POLICY "Users can manage car servicing packages" ON car_servicing_packages FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage car servicing sales" ON car_servicing_sales;
CREATE POLICY "Users can manage car servicing sales" ON car_servicing_sales FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage fuel customers" ON fuel_station_customers;
CREATE POLICY "Users can manage fuel customers" ON fuel_station_customers FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Indexes
CREATE INDEX idx_fuel_stations_institution ON fuel_stations(institution_id);
CREATE INDEX idx_fuel_tanks_station ON fuel_tanks(station_id);
CREATE INDEX idx_fuel_pumps_station ON fuel_pumps(station_id);
CREATE INDEX idx_fuel_sales_station ON fuel_sales(station_id);
CREATE INDEX idx_station_shifts_station ON station_shifts(station_id);
CREATE INDEX idx_station_items_station ON station_items(station_id);
CREATE INDEX idx_station_pos_sales_station ON station_pos_sales(station_id);
CREATE INDEX idx_carwash_sales_station ON carwash_sales(station_id);
CREATE INDEX idx_car_servicing_sales_station ON car_servicing_sales(station_id);
CREATE INDEX idx_fuel_customers_institution ON fuel_station_customers(institution_id);
CREATE INDEX idx_fuel_customers_phone ON fuel_station_customers(phone);

-- 15. Fleet Management
CREATE TABLE IF NOT EXISTS fuel_fleet_accounts (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    company_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    credit_limit DECIMAL DEFAULT 0,
    current_balance DECIMAL DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS fuel_fleet_cards (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    fleet_account_id TEXT REFERENCES fuel_fleet_accounts(id) ON DELETE CASCADE,
    card_number TEXT UNIQUE NOT NULL,
    vehicle_plate TEXT,
    daily_limit DECIMAL,
    is_blocked BOOLEAN DEFAULT false,
    geofence_enabled BOOLEAN DEFAULT false,
    expected_latitude DECIMAL,
    expected_longitude DECIMAL,
    geofence_radius_meters INTEGER DEFAULT 500,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Price History & Trends (Dynamic Pricing)
CREATE TABLE IF NOT EXISTS fuel_price_history (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    fuel_type TEXT NOT NULL,
    old_price DECIMAL NOT NULL,
    new_price DECIMAL NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for Fleet
ALTER TABLE fuel_fleet_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_fleet_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_price_history ENABLE ROW LEVEL SECURITY;

-- Policies for Fleet
DROP POLICY IF EXISTS "Users can manage fleet accounts" ON fuel_fleet_accounts;
CREATE POLICY "Users can manage fleet accounts" ON fuel_fleet_accounts FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage fleet cards" ON fuel_fleet_cards;
CREATE POLICY "Users can manage fleet cards" ON fuel_fleet_cards FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage price history" ON fuel_price_history;
CREATE POLICY "Users can manage price history" ON fuel_price_history FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Fleet Indexes
CREATE INDEX idx_fleet_accounts_institution ON fuel_fleet_accounts(institution_id);
CREATE INDEX idx_fleet_cards_account ON fuel_fleet_cards(fleet_account_id);
-- 17. ETR Configuration (Tax Compliance)
CREATE TABLE IF NOT EXISTS fuel_etr_configs (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    device_serial TEXT NOT NULL,
    middleware_url TEXT,
    is_active BOOLEAN DEFAULT true,
    last_sync TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS for ETR
ALTER TABLE fuel_etr_configs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage ETR configs" ON fuel_etr_configs;
CREATE POLICY "Users can manage ETR configs" ON fuel_etr_configs FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Index
-- Index
CREATE INDEX idx_etr_configs_institution ON fuel_etr_configs(institution_id);
CREATE INDEX idx_etr_configs_station ON fuel_etr_configs(station_id);

-- 18. Predictive Inventory & Logistics
CREATE TABLE IF NOT EXISTS fuel_reorder_predictions (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    tank_id TEXT REFERENCES fuel_tanks(id) ON DELETE CASCADE,
    predicted_depletion_date TIMESTAMP WITH TIME ZONE,
    recommended_order_date TIMESTAMP WITH TIME ZONE,
    recommended_quantity DECIMAL,
    confidence_score DECIMAL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 19. SMS Communications Log
CREATE TABLE IF NOT EXISTS fuel_sms_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    recipient_phone TEXT NOT NULL,
    message_body TEXT NOT NULL,
    msg_type TEXT CHECK (msg_type IN ('loyalty', 'fleet_alert', 'inventory_alert')),
    status TEXT DEFAULT 'sent',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fuel_reorder_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_sms_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage predictions" ON fuel_reorder_predictions;
CREATE POLICY "Users can manage predictions" ON fuel_reorder_predictions FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage SMS logs" ON fuel_sms_logs;
CREATE POLICY "Users can manage SMS logs" ON fuel_sms_logs FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Index
CREATE INDEX idx_reorder_predictions_tank ON fuel_reorder_predictions(tank_id);
CREATE INDEX idx_sms_logs_institution ON fuel_sms_logs(institution_id);

-- 20. Fleet Telemetry (GPS Validation)
CREATE TABLE IF NOT EXISTS fuel_fleet_telemetry (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    card_id TEXT REFERENCES fuel_fleet_cards(id) ON DELETE CASCADE,
    latitude DECIMAL NOT NULL,
    longitude DECIMAL NOT NULL,
    distance_from_station DECIMAL, -- Calculated variance
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 21. Financial Reporting (Station P&L)
CREATE TABLE IF NOT EXISTS fuel_financial_reports (
    id TEXT PRIMARY KEY,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    report_type TEXT CHECK (report_type IN ('daily', 'weekly', 'monthly')),
    total_sales DECIMAL DEFAULT 0,
    total_tax DECIMAL DEFAULT 0,
    total_commission DECIMAL DEFAULT 0,
    net_profit DECIMAL DEFAULT 0,
    period_start TIMESTAMP WITH TIME ZONE,
    period_end TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fuel_fleet_telemetry ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_financial_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage telemetry" ON fuel_fleet_telemetry;
CREATE POLICY "Users can manage telemetry" ON fuel_fleet_telemetry FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage financial reports" ON fuel_financial_reports;
CREATE POLICY "Users can manage financial reports" ON fuel_financial_reports FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Index
CREATE INDEX idx_fleet_telemetry_card ON fuel_fleet_telemetry(card_id);
CREATE INDEX idx_financial_reports_station ON fuel_financial_reports(station_id);

-- 22. IoT Leak Detection (Environmental Compliance)
CREATE TABLE IF NOT EXISTS fuel_leak_alerts (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    tank_id TEXT REFERENCES fuel_tanks(id) ON DELETE CASCADE,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    variance_liters DECIMAL NOT NULL,
    severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status TEXT DEFAULT 'open',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 23. Employee Gamification (Performance)
CREATE TABLE IF NOT EXISTS fuel_staff_achievements (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    achievement_type TEXT NOT NULL,
    points_awarded INTEGER DEFAULT 0,
    badge_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fuel_leak_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_staff_achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage leak alerts" ON fuel_leak_alerts;
CREATE POLICY "Users can manage leak alerts" ON fuel_leak_alerts FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage achievements" ON fuel_staff_achievements;
CREATE POLICY "Users can manage achievements" ON fuel_staff_achievements FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Index
CREATE INDEX idx_leak_alerts_tank ON fuel_leak_alerts(tank_id);
CREATE INDEX idx_achievements_user ON fuel_staff_achievements(user_id);

-- 24. Station Assets (Hardware Inventory)
CREATE TABLE IF NOT EXISTS fuel_station_assets (
    id TEXT PRIMARY KEY,
    station_id TEXT REFERENCES fuel_stations(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    asset_type TEXT NOT NULL, -- e.g., 'Pump', 'Compressor', 'Generator'
    serial_number TEXT,
    purchase_date DATE,
    warranty_expiry DATE,
    last_calibration_date DATE,
    next_calibration_due DATE,
    status TEXT CHECK (status IN ('operational', 'faulty', 'maintenance', 'decommissioned')),
    health_score INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 25. Maintenance Logs (Service Tickets)
CREATE TABLE IF NOT EXISTS fuel_maintenance_logs (
    id TEXT PRIMARY KEY,
    asset_id TEXT REFERENCES fuel_station_assets(id) ON DELETE CASCADE,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    issue_description TEXT NOT NULL,
    action_taken TEXT,
    technician_name TEXT,
    maintenance_cost DECIMAL DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    scheduled_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE fuel_station_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE fuel_maintenance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage assets" ON fuel_station_assets;
CREATE POLICY "Users can manage assets" ON fuel_station_assets FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage maintenance logs" ON fuel_maintenance_logs;
CREATE POLICY "Users can manage maintenance logs" ON fuel_maintenance_logs FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Index
CREATE INDEX idx_station_assets_station ON fuel_station_assets(station_id);
CREATE INDEX idx_maintenance_logs_asset ON fuel_maintenance_logs(asset_id);

-- 26. Civil Manufacturing Yards (Independent Entity)
CREATE TABLE IF NOT EXISTS civil_yards (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 27. Civil Products
CREATE TABLE IF NOT EXISTS civil_products (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    yard_id TEXT REFERENCES civil_yards(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    product_type TEXT NOT NULL, -- 'Block', 'Paving', 'Post', 'Culvert', 'Kerb'
    unit_price DECIMAL NOT NULL,
    current_stock INTEGER DEFAULT 0,
    min_stock_threshold INTEGER DEFAULT 10,
    strength_rating TEXT,
    specifications JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 28. Manufacturing Batches
CREATE TABLE IF NOT EXISTS civil_batches (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES civil_products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    quantity_cast INTEGER NOT NULL,
    quantity_damaged INTEGER DEFAULT 0,
    cast_date DATE DEFAULT CURRENT_DATE,
    release_date DATE,
    status TEXT CHECK (status IN ('curing', 'ready', 'quarantined')),
    strength_test_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 29. Civil Bulk Sales
CREATE TABLE IF NOT EXISTS civil_sales (
    id TEXT PRIMARY KEY,
    institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE,
    yard_id TEXT REFERENCES civil_yards(id) ON DELETE SET NULL,
    customer_id TEXT,
    project_name TEXT,
    total_amount DECIMAL NOT NULL,
    tax_amount DECIMAL DEFAULT 0,
    delivery_status TEXT DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'processing', 'dispatched', 'delivered')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE civil_yards ENABLE ROW LEVEL SECURITY;
ALTER TABLE civil_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE civil_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE civil_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage yards" ON civil_yards;
CREATE POLICY "Users can manage yards" ON civil_yards FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage civil products" ON civil_products;
CREATE POLICY "Users can manage civil products" ON civil_products FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage civil batches" ON civil_batches;
CREATE POLICY "Users can manage civil batches" ON civil_batches FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

DROP POLICY IF EXISTS "Users can manage civil sales" ON civil_sales;
CREATE POLICY "Users can manage civil sales" ON civil_sales FOR ALL TO authenticated USING (institution_id = auth.uid()::text OR public.get_curr_user_role() = 'super_admin');

-- Index
CREATE INDEX idx_civil_yards_inst ON civil_yards(institution_id);
CREATE INDEX idx_civil_products_yard ON civil_products(yard_id);
CREATE INDEX idx_civil_batches_prod ON civil_batches(product_id);
CREATE INDEX idx_civil_sales_yard ON civil_sales(yard_id);
