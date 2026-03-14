-- Migration: 010_create_agrovet_tables
-- Description: Creates tables and RLS policies for the Agrovet business module.

-- 1. Tables
CREATE TABLE IF NOT EXISTS agrovet_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    unit_type TEXT NOT NULL,
    reorder_level INTEGER DEFAULT 10,
    current_stock INTEGER DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_batches (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES agrovet_products(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE NOT NULL,
    quantity INTEGER DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    location TEXT,
    farm_type TEXT,
    loyalty_points INTEGER DEFAULT 0,
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_animals (
    id TEXT PRIMARY KEY,
    farmer_id TEXT REFERENCES agrovet_customers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    species TEXT,
    breed TEXT,
    age TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_sales (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES agrovet_customers(id) ON DELETE SET NULL,
    total_amount DECIMAL(12, 2) NOT NULL,
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT DEFAULT 'completed',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_consultations (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES agrovet_customers(id) ON DELETE CASCADE,
    vet_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    clinical_notes TEXT,
    diagnosis TEXT,
    prescription TEXT,
    fee DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'completed',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_credit (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES agrovet_customers(id) ON DELETE CASCADE,
    total_owed DECIMAL(12, 2) DEFAULT 0,
    total_paid DECIMAL(12, 2) DEFAULT 0,
    credit_limit DECIMAL(12, 2) DEFAULT 0,
    status TEXT DEFAULT 'active',
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS agrovet_sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT REFERENCES agrovet_sales(id) ON DELETE CASCADE,
    product_id TEXT REFERENCES agrovet_products(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12, 2) NOT NULL,
    total_price DECIMAL(12, 2) NOT NULL,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Row Level Security
ALTER TABLE agrovet_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_animals ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE agrovet_credit ENABLE ROW LEVEL SECURITY;

-- 3. Triggers for Stock Management
CREATE OR REPLACE FUNCTION update_agrovet_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE agrovet_products 
    SET current_stock = current_stock - NEW.quantity
    WHERE id = NEW.product_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER trg_update_agrovet_stock
AFTER INSERT ON agrovet_sale_items
FOR EACH ROW EXECUTE FUNCTION update_agrovet_stock_on_sale();

-- 4. Policies
CREATE POLICY "Staff can view their institution's agrovet products" ON agrovet_products FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their institution's agrovet products" ON agrovet_products FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their institution's agrovet batches" ON agrovet_batches FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their institution's agrovet batches" ON agrovet_batches FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their institution's agrovet customers" ON agrovet_customers FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their institution's agrovet customers" ON agrovet_customers FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their institution's agrovet animals" ON agrovet_animals FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their institution's agrovet animals" ON agrovet_animals FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their institution's agrovet sales" ON agrovet_sales FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their institution's agrovet sales" ON agrovet_sales FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their institution's agrovet consultations" ON agrovet_consultations FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their institution's agrovet consultations" ON agrovet_consultations FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their institution's agrovet credit" ON agrovet_credit FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their institution's agrovet credit" ON agrovet_credit FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Staff can view their institution's agrovet sale items" ON agrovet_sale_items FOR SELECT USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
CREATE POLICY "Staff can manage their institution's agrovet sale items" ON agrovet_sale_items FOR ALL USING (institution_id = (SELECT institution_id FROM users WHERE id = auth.uid()));
