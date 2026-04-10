-- Migration 143: Modern Law Firm Module
-- Description: Core tables for Legal Matter Management, Trust Accounting, and Billing.

-- 1. Law Clients (distinct from system users)
CREATE TABLE IF NOT EXISTS law_clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    client_type TEXT CHECK (client_type IN ('individual', 'corporate')),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Law Matters (Cases)
CREATE TABLE IF NOT EXISTS law_matters (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES law_clients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    case_number TEXT,
    practice_area TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending', 'archived')),
    manager_id TEXT NOT NULL REFERENCES users(id),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    opened_at DATE DEFAULT CURRENT_DATE,
    closed_at DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Law Documents
CREATE TABLE IF NOT EXISTS law_documents (
    id TEXT PRIMARY KEY,
    matter_id TEXT NOT NULL REFERENCES law_matters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    document_type TEXT,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Law Time Entries (Billable Hours)
CREATE TABLE IF NOT EXISTS law_time_entries (
    id TEXT PRIMARY KEY,
    matter_id TEXT NOT NULL REFERENCES law_matters(id) ON DELETE CASCADE,
    staff_id TEXT NOT NULL REFERENCES users(id),
    activity_date DATE DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 0,
    rate_per_hour DECIMAL(15, 2) NOT NULL,
    billing_status TEXT DEFAULT 'unbilled' CHECK (billing_status IN ('unbilled', 'billed', 'waived', 'pro-bono')),
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Law Invoices
CREATE TABLE IF NOT EXISTS law_invoices (
    id TEXT PRIMARY KEY,
    matter_id TEXT NOT NULL REFERENCES law_matters(id) ON DELETE CASCADE,
    client_id TEXT NOT NULL REFERENCES law_clients(id) ON DELETE CASCADE,
    invoice_number TEXT NOT NULL,
    total_amount DECIMAL(15, 2) NOT NULL,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'pending' CHECK (status IN ('draft', 'pending', 'partial', 'paid', 'overdue', 'cancelled')),
    due_date DATE,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Law Trust Accounting (Funds held for clients)
CREATE TABLE IF NOT EXISTS law_trust_transactions (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES law_clients(id) ON DELETE CASCADE,
    matter_id TEXT REFERENCES law_matters(id) ON DELETE SET NULL,
    amount DECIMAL(15, 2) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'disbursement', 'transfer')),
    reference TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS POLICIES
ALTER TABLE law_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_matters ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE law_trust_transactions ENABLE ROW LEVEL SECURITY;

-- Helper to apply institution-based access
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename LIKE 'law_%')
    LOOP
        EXECUTE format('CREATE POLICY "Access by institution" ON %I FOR ALL USING (public.get_curr_user_inst_id() = institution_id::text) WITH CHECK (public.get_curr_user_inst_id() = institution_id::text)', t);
    END LOOP;
END $$;
