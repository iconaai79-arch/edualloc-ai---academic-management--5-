-- Migration: 011_create_property_management_tables
-- Description: Creates tables and RLS policies for Property Management (Rent Collection).

-- 1. Tables
CREATE TABLE IF NOT EXISTS pm_properties (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    property_type TEXT NOT NULL, -- 'Apartment', 'Commercial', 'Land'
    total_units INTEGER DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_units (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES pm_properties(id) ON DELETE CASCADE,
    unit_number TEXT NOT NULL,
    unit_type TEXT NOT NULL, -- 'Studio', '1BR', '2BR', 'Shop'
    floor_number INTEGER,
    rent_amount DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'Vacant', -- 'Vacant', 'Occupied', 'Maintenance'
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_tenants (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    email TEXT,
    id_number TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_leases (
    id TEXT PRIMARY KEY,
    unit_id TEXT REFERENCES pm_units(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES pm_tenants(id) ON DELETE CASCADE,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE,
    rent_amount DECIMAL(12, 2) NOT NULL,
    deposit_amount DECIMAL(12, 2) DEFAULT 0,
    billing_cycle TEXT DEFAULT 'Monthly', -- 'Monthly', 'Quarterly'
    status TEXT DEFAULT 'Active', -- 'Active', 'Terminated', 'Expired'
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_payments (
    id TEXT PRIMARY KEY,
    lease_id TEXT REFERENCES pm_leases(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    payment_method TEXT NOT NULL, -- 'Cash', 'M-Pesa', 'Bank'
    payment_type TEXT NOT NULL, -- 'Rent', 'Utility', 'Deposit'
    period_month INTEGER,
    period_year INTEGER,
    status TEXT DEFAULT 'Completed',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS pm_maintenance (
    id TEXT PRIMARY KEY,
    property_id TEXT REFERENCES pm_properties(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES pm_units(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
    status TEXT DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved', 'Closed'
    assigned_to TEXT, -- Name of technician
    cost DECIMAL(12, 2) DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Triggers for Property Management Logic

-- Trigger 1: Update pm_units.status based on pm_leases.status
CREATE OR REPLACE FUNCTION update_unit_status_on_lease()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        IF NEW.status = 'Active' THEN
            UPDATE pm_units SET status = 'Occupied' WHERE id = NEW.unit_id;
        ELSIF NEW.status IN ('Terminated', 'Expired') THEN
            UPDATE pm_units SET status = 'Vacant' WHERE id = NEW.unit_id;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_unit_status_on_lease
AFTER INSERT OR UPDATE ON pm_leases
FOR EACH ROW EXECUTE FUNCTION update_unit_status_on_lease();

-- Trigger 2: Update pm_properties.total_units when units are added or removed
CREATE OR REPLACE FUNCTION update_property_unit_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE pm_properties SET total_units = total_units + 1 WHERE id = NEW.property_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE pm_properties SET total_units = total_units - 1 WHERE id = OLD.property_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_property_unit_count
AFTER INSERT OR DELETE ON pm_units
FOR EACH ROW EXECUTE FUNCTION update_property_unit_count();

-- 3. Row Level Security
ALTER TABLE pm_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm_maintenance ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Staff can view their property records" ON pm_properties FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their property records" ON pm_properties FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their units" ON pm_units FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their units" ON pm_units FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their tenants" ON pm_tenants FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their tenants" ON pm_tenants FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their leases" ON pm_leases FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their leases" ON pm_leases FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their payments" ON pm_payments FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their payments" ON pm_payments FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their maintenance tickets" ON pm_maintenance FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their maintenance tickets" ON pm_maintenance FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
