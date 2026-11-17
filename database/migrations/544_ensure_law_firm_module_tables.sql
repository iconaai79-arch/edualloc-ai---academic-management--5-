-- Migration 544: Ensure Law Firm Module Tables (law_matters, law_clients, etc.)
-- Description: Creates law_matters and associated legal tables with robust TEXT keys, indexes, and permissive RLS policies.

-- 1. Law Clients
CREATE TABLE IF NOT EXISTS public.law_clients (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    client_type TEXT DEFAULT 'individual',
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Law Matters (Cases)
CREATE TABLE IF NOT EXISTS public.law_matters (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.law_clients(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    case_number TEXT,
    practice_area TEXT DEFAULT 'General',
    status TEXT DEFAULT 'open',
    manager_id TEXT,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    priority TEXT DEFAULT 'medium',
    opened_at DATE DEFAULT CURRENT_DATE,
    closed_at DATE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Law Documents
CREATE TABLE IF NOT EXISTS public.law_documents (
    id TEXT PRIMARY KEY,
    matter_id TEXT REFERENCES public.law_matters(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    document_type TEXT,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    uploaded_by TEXT,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Law Time Entries (Billable Hours)
CREATE TABLE IF NOT EXISTS public.law_time_entries (
    id TEXT PRIMARY KEY,
    matter_id TEXT REFERENCES public.law_matters(id) ON DELETE CASCADE,
    staff_id TEXT,
    activity_date DATE DEFAULT CURRENT_DATE,
    description TEXT,
    duration_minutes INTEGER DEFAULT 0,
    rate_per_hour NUMERIC(15, 2) DEFAULT 0.00,
    billing_status TEXT DEFAULT 'unbilled',
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Law Invoices
CREATE TABLE IF NOT EXISTS public.law_invoices (
    id TEXT PRIMARY KEY,
    matter_id TEXT REFERENCES public.law_matters(id) ON DELETE SET NULL,
    client_id TEXT REFERENCES public.law_clients(id) ON DELETE SET NULL,
    invoice_number TEXT,
    total_amount NUMERIC(15, 2) DEFAULT 0.00,
    tax_amount NUMERIC(15, 2) DEFAULT 0.00,
    status TEXT DEFAULT 'pending',
    due_date DATE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Law Trust Transactions
CREATE TABLE IF NOT EXISTS public.law_trust_transactions (
    id TEXT PRIMARY KEY,
    client_id TEXT REFERENCES public.law_clients(id) ON DELETE SET NULL,
    matter_id TEXT REFERENCES public.law_matters(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) DEFAULT 0.00,
    transaction_type TEXT DEFAULT 'deposit',
    reference TEXT,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Law Agreement Templates
CREATE TABLE IF NOT EXISTS public.law_agreement_templates (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    content TEXT NOT NULL,
    base_fee NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 8. Law Agreements
CREATE TABLE IF NOT EXISTS public.law_agreements (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    template_id TEXT,
    matter_id TEXT,
    client_id TEXT,
    title TEXT NOT NULL,
    party_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    final_content TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    review_status TEXT DEFAULT 'draft',
    lawyer_id TEXT,
    lawyer_notes TEXT,
    signed_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for optimal lookup performance
CREATE INDEX IF NOT EXISTS idx_law_clients_inst ON public.law_clients(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_matters_inst ON public.law_matters(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_matters_client ON public.law_matters(client_id);
CREATE INDEX IF NOT EXISTS idx_law_matters_status ON public.law_matters(status);
CREATE INDEX IF NOT EXISTS idx_law_documents_matter ON public.law_documents(matter_id);
CREATE INDEX IF NOT EXISTS idx_law_documents_inst ON public.law_documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_time_entries_matter ON public.law_time_entries(matter_id);
CREATE INDEX IF NOT EXISTS idx_law_time_entries_inst ON public.law_time_entries(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_invoices_inst ON public.law_invoices(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_invoices_matter ON public.law_invoices(matter_id);
CREATE INDEX IF NOT EXISTS idx_law_invoices_client ON public.law_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_law_trust_inst ON public.law_trust_transactions(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_trust_client ON public.law_trust_transactions(client_id);
CREATE INDEX IF NOT EXISTS idx_law_agreements_inst ON public.law_agreements(institution_id);
CREATE INDEX IF NOT EXISTS idx_law_agreements_matter ON public.law_agreements(matter_id);
CREATE INDEX IF NOT EXISTS idx_law_agreements_client ON public.law_agreements(client_id);

-- Setup RLS and Grants across all legal tables
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY[
        'law_clients', 
        'law_matters', 
        'law_documents', 
        'law_time_entries', 
        'law_invoices', 
        'law_trust_transactions', 
        'law_agreement_templates', 
        'law_agreements'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "Access by institution" ON public.%I', tbl);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (id IS NOT NULL)', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated, anon USING (true)', tbl, tbl);

        BEGIN
            EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role, postgres', tbl);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore role missing errors
        END;
    END LOOP;
END $$;

-- Notify PostgREST to refresh schema cache
NOTIFY pgrst, 'reload schema';
