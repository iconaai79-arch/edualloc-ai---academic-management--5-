-- Migration: Agricultural Modules (Cooperative, Agrovet, SACCO)
-- Description: Adds tables for Farmers, Daily Collections, Riders, Agrovet Inventory/Sales, and SACCO Management.

-- 1. Cooperative Farmers
CREATE TABLE IF NOT EXISTS coop_farmers (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    account_number TEXT,
    location TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link users to farmers for the portal
ALTER TABLE users ADD COLUMN IF NOT EXISTS farmer_id TEXT REFERENCES coop_farmers(id) ON DELETE SET NULL;

-- 2. Riders/Delivery Providers
CREATE TABLE IF NOT EXISTS coop_riders (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    vehicle_number TEXT,
    delivery_rate_per_kg DECIMAL(10, 2) DEFAULT 0.00,
    delivery_rate_per_liter DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily Collections
CREATE TABLE IF NOT EXISTS coop_collections (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES coop_farmers(id) ON DELETE CASCADE,
    rider_id TEXT REFERENCES coop_riders(id) ON DELETE SET NULL,
    product_type TEXT NOT NULL CHECK (product_type IN ('milk', 'tea', 'coffee')),
    quantity DECIMAL(12, 2) NOT NULL,
    unit TEXT NOT NULL CHECK (unit IN ('kgs', 'liters')),
    quality_score DECIMAL(5, 2) DEFAULT 0.00,
    collection_date DATE DEFAULT CURRENT_DATE,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'processed')),
    recorded_by TEXT NOT NULL REFERENCES users(id),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Coop Agrovet Inventory (Specific to Cooperative Shop)
CREATE TABLE IF NOT EXISTS coop_agrovet_inventory (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT,
    price DECIMAL(12, 2) NOT NULL,
    stock_quantity INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Coop Agrovet Sales (Credit & Cash)
CREATE TABLE IF NOT EXISTS coop_agrovet_sales (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES coop_farmers(id) ON DELETE CASCADE,
    sale_date TIMESTAMPTZ DEFAULT NOW(),
    total_amount DECIMAL(12, 2) NOT NULL,
    payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'credit_deduction')),
    is_deducted BOOLEAN DEFAULT FALSE,
    deduction_id TEXT, -- Reference to a payout record later
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SACCO Management
CREATE TABLE IF NOT EXISTS sacco_accounts (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES coop_farmers(id) ON DELETE CASCADE,
    account_type TEXT NOT NULL CHECK (account_type IN ('savings', 'loan')),
    balance DECIMAL(15, 2) DEFAULT 0.00,
    interest_rate DECIMAL(5, 2) DEFAULT 0.00,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sacco_transactions (
    id TEXT PRIMARY KEY,
    account_id TEXT NOT NULL REFERENCES sacco_accounts(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal', 'loan_disbursement', 'loan_repayment', 'interest')),
    amount DECIMAL(12, 2) NOT NULL,
    is_automatic_deduction BOOLEAN DEFAULT FALSE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Monthly Settlements / Payouts
CREATE TABLE IF NOT EXISTS coop_monthly_payouts (
    id TEXT PRIMARY KEY,
    farmer_id TEXT NOT NULL REFERENCES coop_farmers(id) ON DELETE CASCADE,
    payout_month DATE NOT NULL,
    gross_payout DECIMAL(15, 2) NOT NULL,
    logistics_deduction DECIMAL(12, 2) DEFAULT 0.00,
    agrovet_deduction DECIMAL(12, 2) DEFAULT 0.00,
    sacco_deduction DECIMAL(12, 2) DEFAULT 0.00,
    net_payout DECIMAL(15, 2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid')),
    paid_at TIMESTAMPTZ,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indices for performance
CREATE INDEX IF NOT EXISTS idx_coop_collections_farmer ON coop_collections(farmer_id);
CREATE INDEX IF NOT EXISTS idx_coop_collections_date ON coop_collections(collection_date);
CREATE INDEX IF NOT EXISTS idx_coop_agrovet_sales_farmer ON coop_agrovet_sales(farmer_id);
CREATE INDEX IF NOT EXISTS idx_sacco_transactions_account ON sacco_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_coop_farmers_inst ON coop_farmers(institution_id);

-- 8. Row Level Security (RLS)
ALTER TABLE coop_farmers ENABLE ROW LEVEL SECURITY;
ALTER TABLE coop_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE coop_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE coop_agrovet_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE coop_agrovet_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacco_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sacco_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE coop_monthly_payouts ENABLE ROW LEVEL SECURITY;

-- 9. Policies (Multi-tenant isolation)
CREATE POLICY "Staff can view their institution coop farmers" ON coop_farmers FOR SELECT USING (institution_id = get_curr_user_inst_id());
CREATE POLICY "Staff can manage their institution coop farmers" ON coop_farmers FOR ALL USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Staff can view their institution coop riders" ON coop_riders FOR SELECT USING (institution_id = get_curr_user_inst_id());
CREATE POLICY "Staff can manage their institution coop riders" ON coop_riders FOR ALL USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Staff can view their institution coop collections" ON coop_collections FOR SELECT USING (institution_id = get_curr_user_inst_id());
CREATE POLICY "Staff can manage their institution coop collections" ON coop_collections FOR ALL USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Staff can view their institution coop agrovet inventory" ON coop_agrovet_inventory FOR SELECT USING (institution_id = get_curr_user_inst_id());
CREATE POLICY "Staff can manage their institution coop agrovet inventory" ON coop_agrovet_inventory FOR ALL USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Staff can view their institution coop agrovet sales" ON coop_agrovet_sales FOR SELECT USING (institution_id = get_curr_user_inst_id());
CREATE POLICY "Staff can manage their institution coop agrovet sales" ON coop_agrovet_sales FOR ALL USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Staff can view their institution sacco accounts" ON sacco_accounts FOR SELECT USING (institution_id = get_curr_user_inst_id());
CREATE POLICY "Staff can manage their institution sacco accounts" ON sacco_accounts FOR ALL USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Staff can view their institution sacco transactions" ON sacco_transactions FOR SELECT USING (institution_id = get_curr_user_inst_id());
CREATE POLICY "Staff can manage their institution sacco transactions" ON sacco_transactions FOR ALL USING (institution_id = get_curr_user_inst_id());

CREATE POLICY "Staff can view their institution coop monthly payouts" ON coop_monthly_payouts FOR SELECT USING (institution_id = get_curr_user_inst_id());
CREATE POLICY "Staff can manage their institution coop monthly payouts" ON coop_monthly_payouts FOR ALL USING (institution_id = get_curr_user_inst_id());

-- Helper for Farmer ID
CREATE OR REPLACE FUNCTION public.get_curr_user_farmer_id()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN (
        SELECT farmer_id 
        FROM public.users 
        WHERE id = auth.uid()::text 
           OR id = 'u_' || auth.uid()::text 
        LIMIT 1
    );
END;
$$;

-- 10. Farmer Portal Specific Policies
CREATE POLICY "Farmers can view their own collection records" ON coop_collections FOR SELECT USING (farmer_id = get_curr_user_farmer_id());
CREATE POLICY "Farmers can view their own agrovet credit sales" ON coop_agrovet_sales FOR SELECT USING (farmer_id = get_curr_user_farmer_id());
CREATE POLICY "Farmers can view their own sacco accounts" ON sacco_accounts FOR SELECT USING (farmer_id = get_curr_user_farmer_id());
CREATE POLICY "Farmers can view their own monthly payouts" ON coop_monthly_payouts FOR SELECT USING (farmer_id = get_curr_user_farmer_id());
CREATE POLICY "Farmers can view their own profile" ON coop_farmers FOR SELECT USING (id = get_curr_user_farmer_id());
