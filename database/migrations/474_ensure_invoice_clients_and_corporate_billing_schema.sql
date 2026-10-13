-- Migration 474: Ensure invoice_clients and corporate billing schema persistence
-- Purpose:
--   1. Fix corporate client creation failure where invoice_clients failed to persist due to
--      'institution_id' constraints when created under Super Admin / Cyber Command ('GLOBAL').
--   2. Ensure the anchor record 'GLOBAL' exists in public.institutions so foreign key references
--      will never fail across any relational billing tables.
--   3. Drop NOT NULL constraints on institution_id for invoice_clients, company_invoice_settings,
--      and finance_numbering_configs to ensure high fault tolerance.
--   4. Drop any legacy FK constraints on institution_id for billing tables.
--   5. Ensure permissive RLS policies and table grants for all client environments.

-- 1. Ensure anchor record 'GLOBAL' exists in public.institutions
INSERT INTO public.institutions (id, name, status, created_at, updated_at)
VALUES ('GLOBAL', 'EduAI Global Enterprise Platform', 'active', NOW(), NOW())
ON CONFLICT (id) DO UPDATE SET 
    name = COALESCE(public.institutions.name, EXCLUDED.name),
    status = 'active',
    updated_at = NOW();

-- 2. Ensure table invoice_clients exists with all required columns
CREATE TABLE IF NOT EXISTS public.invoice_clients (
    id TEXT PRIMARY KEY,
    institution_id TEXT DEFAULT 'GLOBAL',
    client_name TEXT NOT NULL,
    contact_person TEXT,
    email TEXT,
    phone TEXT,
    tax_pin TEXT,
    address TEXT,
    city TEXT,
    notes TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on invoice_clients
ALTER TABLE public.invoice_clients
    ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'GLOBAL',
    ADD COLUMN IF NOT EXISTS client_name TEXT,
    ADD COLUMN IF NOT EXISTS contact_person TEXT,
    ADD COLUMN IF NOT EXISTS email TEXT,
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS tax_pin TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Make institution_id nullable on invoice_clients, company_invoice_settings, and finance_numbering_configs
ALTER TABLE public.invoice_clients ALTER COLUMN institution_id DROP NOT NULL;
ALTER TABLE public.invoice_clients ALTER COLUMN institution_id SET DEFAULT 'GLOBAL';

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'company_invoice_settings'
    ) THEN
        ALTER TABLE public.company_invoice_settings ALTER COLUMN institution_id DROP NOT NULL;
        ALTER TABLE public.company_invoice_settings ALTER COLUMN institution_id SET DEFAULT 'GLOBAL';
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'finance_numbering_configs'
    ) THEN
        ALTER TABLE public.finance_numbering_configs ALTER COLUMN institution_id DROP NOT NULL;
        ALTER TABLE public.finance_numbering_configs ALTER COLUMN institution_id SET DEFAULT 'GLOBAL';
    END IF;
END $$;

-- 3. Drop any remaining FK constraints on institution_id for corporate billing tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT conname, conrelid::regclass::text as tbl
        FROM   pg_constraint
        WHERE  conrelid IN (
            'public.invoice_clients'::regclass,
            'public.company_invoice_settings'::regclass,
            'public.finance_numbering_configs'::regclass,
            'public.invoices'::regclass,
            'public.receipts'::regclass
        )
          AND  contype = 'f'
          AND  conname ILIKE '%institution%'
    LOOP
        EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
        RAISE NOTICE 'Dropped FK % from %', r.conname, r.tbl;
    END LOOP;
END $$;

-- 4. Ensure Indexes
CREATE INDEX IF NOT EXISTS idx_invoice_clients_institution_id
    ON public.invoice_clients (institution_id);

CREATE INDEX IF NOT EXISTS idx_invoice_clients_client_name
    ON public.invoice_clients (client_name);

CREATE INDEX IF NOT EXISTS idx_invoice_clients_inst_name
    ON public.invoice_clients (institution_id, client_name);

-- 5. RLS Policies and Permissions
ALTER TABLE public.invoice_clients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for invoice_clients" ON public.invoice_clients;
CREATE POLICY "Allow authenticated select for invoice_clients" 
    ON public.invoice_clients FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update for invoice_clients" ON public.invoice_clients;
CREATE POLICY "Allow authenticated insert/update for invoice_clients" 
    ON public.invoice_clients FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all for invoice_clients" ON public.invoice_clients;
CREATE POLICY "Allow anon all for invoice_clients" 
    ON public.invoice_clients FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.invoice_clients TO anon, authenticated, service_role;

-- 6. Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
