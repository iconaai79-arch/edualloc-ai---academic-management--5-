-- Migration 289: Full Procurement Module Tables
-- Supports: Items Inventory, Supplier Registration, LPO Management, Supplier Invoice Management

-- 1. Procurement Items Inventory (master catalogue)
CREATE TABLE IF NOT EXISTS procurement_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    unit VARCHAR(50) DEFAULT 'pcs',
    unit_cost DECIMAL(12,2) DEFAULT 0,
    reorder_level INT DEFAULT 0,
    current_stock INT DEFAULT 0,
    description TEXT,
    item_code VARCHAR(100),
    retail_item_id TEXT,  -- links to retail_inventory_items.id for two-way school store sync
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_procurement_items_institution ON procurement_items(institution_id);
CREATE INDEX IF NOT EXISTS idx_procurement_items_category ON procurement_items(institution_id, category);

-- 2. Procurement Suppliers
CREATE TABLE IF NOT EXISTS procurement_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255),
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    kra_pin VARCHAR(50),
    payment_terms VARCHAR(100) DEFAULT 'Net 30',
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    bank_branch VARCHAR(255),
    rating INT DEFAULT 3 CHECK (rating BETWEEN 1 AND 5),
    category VARCHAR(100) DEFAULT 'General',
    is_active BOOLEAN NOT NULL DEFAULT true,
    total_purchases DECIMAL(12,2) DEFAULT 0,
    outstanding_balance DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_procurement_suppliers_institution ON procurement_suppliers(institution_id);

-- 3. Local Purchase Orders
CREATE TABLE IF NOT EXISTS procurement_lpos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    lpo_number VARCHAR(100) NOT NULL,
    supplier_id UUID REFERENCES procurement_suppliers(id) ON DELETE SET NULL,
    requisition_id TEXT,
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    delivery_address TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    subtotal DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'draft', -- draft, issued, partially_received, received, cancelled
    notes TEXT,
    approved_by TEXT,
    approved_at TIMESTAMPTZ,
    created_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(institution_id, lpo_number)
);
CREATE INDEX IF NOT EXISTS idx_procurement_lpos_institution ON procurement_lpos(institution_id);
CREATE INDEX IF NOT EXISTS idx_procurement_lpos_supplier ON procurement_lpos(supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_lpos_status ON procurement_lpos(institution_id, status);

-- 4. Supplier Invoices & Payments
CREATE TABLE IF NOT EXISTS procurement_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    lpo_id UUID REFERENCES procurement_lpos(id) ON DELETE SET NULL,
    supplier_id UUID REFERENCES procurement_suppliers(id) ON DELETE SET NULL,
    invoice_number VARCHAR(100) NOT NULL,
    invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    items JSONB DEFAULT '[]'::jsonb,
    amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) DEFAULT 0,
    amount_paid DECIMAL(12,2) DEFAULT 0,
    balance_owing DECIMAL(12,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
    status VARCHAR(30) NOT NULL DEFAULT 'pending', -- pending, partial, paid, overdue, disputed
    payment_reference TEXT,
    payment_date DATE,
    payment_method VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_institution ON procurement_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_supplier ON procurement_invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_lpo ON procurement_invoices(lpo_id);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_status ON procurement_invoices(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_procurement_invoices_due_date ON procurement_invoices(due_date);

-- 5. Enable RLS on all tables
ALTER TABLE procurement_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_lpos ENABLE ROW LEVEL SECURITY;
ALTER TABLE procurement_invoices ENABLE ROW LEVEL SECURITY;

-- Service role bypass
CREATE POLICY "service_role_procurement_items" ON procurement_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_procurement_suppliers" ON procurement_suppliers FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_procurement_lpos" ON procurement_lpos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_procurement_invoices" ON procurement_invoices FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Authenticated: institution-scoped
CREATE POLICY "institution_procurement_items" ON procurement_items FOR ALL TO authenticated
    USING (institution_id = get_curr_user_inst_id()) WITH CHECK (institution_id = get_curr_user_inst_id());
CREATE POLICY "institution_procurement_suppliers" ON procurement_suppliers FOR ALL TO authenticated
    USING (institution_id = get_curr_user_inst_id()) WITH CHECK (institution_id = get_curr_user_inst_id());
CREATE POLICY "institution_procurement_lpos" ON procurement_lpos FOR ALL TO authenticated
    USING (institution_id = get_curr_user_inst_id()) WITH CHECK (institution_id = get_curr_user_inst_id());
CREATE POLICY "institution_procurement_invoices" ON procurement_invoices FOR ALL TO authenticated
    USING (institution_id = get_curr_user_inst_id()) WITH CHECK (institution_id = get_curr_user_inst_id());

-- Comments
COMMENT ON TABLE procurement_items IS 'Master item catalogue for procurement - tracks inventory, unit costs, reorder levels';
COMMENT ON TABLE procurement_suppliers IS 'Supplier registry with contact, banking, and payment term details';
COMMENT ON TABLE procurement_lpos IS 'Local Purchase Orders issued to suppliers after requisition approval';
COMMENT ON TABLE procurement_invoices IS 'Supplier invoices recorded against LPOs with payment tracking';
