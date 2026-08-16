-- Migration 335: Ensure Complete Procurement Module Schema and Indexes
-- Tables: procurement_suppliers, procurement_items, procurement_lpos, procurement_invoices

-- 1. Procurement Suppliers Table
CREATE TABLE IF NOT EXISTS procurement_suppliers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    kra_pin TEXT,
    payment_terms TEXT DEFAULT 'Net 30',
    bank_name TEXT,
    bank_account TEXT,
    bank_branch TEXT,
    rating INTEGER DEFAULT 5,
    category TEXT DEFAULT 'General',
    outstanding_balance DECIMAL(15, 2) DEFAULT 0,
    total_purchases DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if table was already created
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS kra_pin TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS payment_terms TEXT DEFAULT 'Net 30';
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS bank_account TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS bank_branch TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS rating INTEGER DEFAULT 5;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS outstanding_balance DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS total_purchases DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE procurement_suppliers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_procurement_suppliers_institution ON procurement_suppliers(institution_id);
CREATE INDEX IF NOT EXISTS idx_procurement_suppliers_category ON procurement_suppliers(institution_id, category);

-- 2. Procurement Items Catalogue Table
CREATE TABLE IF NOT EXISTS procurement_items (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    unit TEXT DEFAULT 'Units',
    unit_cost DECIMAL(15, 2) DEFAULT 0,
    reorder_level INTEGER DEFAULT 10,
    current_stock INTEGER DEFAULT 0,
    description TEXT,
    item_code TEXT,
    retail_item_id TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist if table was already created
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'General';
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS unit TEXT DEFAULT 'Units';
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS reorder_level INTEGER DEFAULT 10;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS current_stock INTEGER DEFAULT 0;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS retail_item_id TEXT;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE procurement_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_procurement_items_institution ON procurement_items(institution_id);
CREATE INDEX IF NOT EXISTS idx_procurement_items_category ON procurement_items(institution_id, category);

-- 3. Local Purchase Orders Table
CREATE TABLE IF NOT EXISTS procurement_lpos (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    lpo_number TEXT NOT NULL,
    supplier_id TEXT REFERENCES procurement_suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    requisition_id TEXT,
    issued_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_address TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending', -- pending, issued, partially_received, received, cancelled
    notes TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS lpo_number TEXT;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES procurement_suppliers(id) ON DELETE SET NULL;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS requisition_id TEXT;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS issued_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS expected_delivery_date DATE;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE procurement_lpos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_procurement_lpos_institution ON procurement_lpos(institution_id);
CREATE INDEX IF NOT EXISTS idx_procurement_lpos_supplier ON procurement_lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_lpos_status ON procurement_lpos(institution_id, status);

-- 4. Supplier Invoices Table
CREATE TABLE IF NOT EXISTS procurement_invoices (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    lpo_id TEXT REFERENCES procurement_lpos(id) ON DELETE SET NULL,
    lpo_number TEXT,
    supplier_id TEXT REFERENCES procurement_suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    invoice_number TEXT NOT NULL,
    invoice_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(15, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total_amount DECIMAL(15, 2) DEFAULT 0,
    amount DECIMAL(15, 2) DEFAULT 0,
    amount_paid DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2) DEFAULT 0,
    balance_owing DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'unpaid', -- unpaid, pending, partial, paid, overdue, disputed
    payment_method TEXT,
    payment_reference TEXT,
    payment_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure all columns exist
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS institution_id TEXT REFERENCES institutions(id) ON DELETE CASCADE;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS lpo_id TEXT REFERENCES procurement_lpos(id) ON DELETE SET NULL;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS lpo_number TEXT;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS supplier_id TEXT REFERENCES procurement_suppliers(id) ON DELETE SET NULL;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS invoice_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS subtotal DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS total_amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS amount DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS balance DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS balance_owing DECIMAL(15, 2) DEFAULT 0;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid';
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS payment_reference TEXT;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS payment_date DATE;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE procurement_invoices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_procurement_invoices_institution ON procurement_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_supplier ON procurement_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_lpo ON procurement_invoices(lpo_id);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_status ON procurement_invoices(institution_id, status);

-- 5. Row Level Security Policies
ALTER TABLE procurement_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_lpos ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_procurement_suppliers" ON procurement_suppliers;
CREATE POLICY "service_role_procurement_suppliers" ON procurement_suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_procurement_items" ON procurement_items;
CREATE POLICY "service_role_procurement_items" ON procurement_items FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_procurement_lpos" ON procurement_lpos;
CREATE POLICY "service_role_procurement_lpos" ON procurement_lpos FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "service_role_procurement_invoices" ON procurement_invoices;
CREATE POLICY "service_role_procurement_invoices" ON procurement_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_procurement_suppliers" ON procurement_suppliers;
CREATE POLICY "authenticated_procurement_suppliers" ON procurement_suppliers FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_procurement_items" ON procurement_items;
CREATE POLICY "authenticated_procurement_items" ON procurement_items FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_procurement_lpos" ON procurement_lpos;
CREATE POLICY "authenticated_procurement_lpos" ON procurement_lpos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "authenticated_procurement_invoices" ON procurement_invoices;
CREATE POLICY "authenticated_procurement_invoices" ON procurement_invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_procurement_suppliers" ON procurement_suppliers;
CREATE POLICY "anon_procurement_suppliers" ON procurement_suppliers FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_procurement_items" ON procurement_items;
CREATE POLICY "anon_procurement_items" ON procurement_items FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_procurement_lpos" ON procurement_lpos;
CREATE POLICY "anon_procurement_lpos" ON procurement_lpos FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "anon_procurement_invoices" ON procurement_invoices;
CREATE POLICY "anon_procurement_invoices" ON procurement_invoices FOR SELECT TO anon USING (true);

-- Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
