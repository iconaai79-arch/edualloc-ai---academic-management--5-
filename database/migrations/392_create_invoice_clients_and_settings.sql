-- Migration: 392_create_invoice_clients_and_settings.sql
-- Purpose: Support independent corporate invoicing & billing services for companies, contractors, and business tenants.

-- 1. Create invoice_clients table for corporate client directory
CREATE TABLE IF NOT EXISTS public.invoice_clients (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
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

-- Ensure all columns exist on invoice_clients if table already exists
ALTER TABLE public.invoice_clients
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

-- Enable RLS and create permissive policies for invoice_clients
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

CREATE INDEX IF NOT EXISTS idx_invoice_clients_inst 
    ON public.invoice_clients (institution_id);

CREATE INDEX IF NOT EXISTS idx_invoice_clients_name 
    ON public.invoice_clients (institution_id, client_name);

-- 2. Create company_invoice_settings table for corporate invoicing preferences
CREATE TABLE IF NOT EXISTS public.company_invoice_settings (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL UNIQUE,
    invoice_prefix TEXT DEFAULT 'INV-',
    quote_prefix TEXT DEFAULT 'QUO-',
    receipt_prefix TEXT DEFAULT 'REC-',
    currency TEXT DEFAULT 'KES',
    tax_rate NUMERIC DEFAULT 16,
    tax_name TEXT DEFAULT 'VAT (16%)',
    payment_terms_days INTEGER DEFAULT 14,
    bank_name TEXT,
    account_name TEXT,
    account_number TEXT,
    mpesa_paybill TEXT,
    mpesa_till TEXT,
    notes_template TEXT DEFAULT 'Thank you for your business. Please make payments using the details provided.',
    terms_template TEXT DEFAULT 'Payment is due within the stated payment terms. Late payments may attract interest.',
    logo_url TEXT,
    stamp_url TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure all columns exist on company_invoice_settings
ALTER TABLE public.company_invoice_settings
    ADD COLUMN IF NOT EXISTS invoice_prefix TEXT DEFAULT 'INV-',
    ADD COLUMN IF NOT EXISTS quote_prefix TEXT DEFAULT 'QUO-',
    ADD COLUMN IF NOT EXISTS receipt_prefix TEXT DEFAULT 'REC-',
    ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'KES',
    ADD COLUMN IF NOT EXISTS tax_rate NUMERIC DEFAULT 16,
    ADD COLUMN IF NOT EXISTS tax_name TEXT DEFAULT 'VAT (16%)',
    ADD COLUMN IF NOT EXISTS payment_terms_days INTEGER DEFAULT 14,
    ADD COLUMN IF NOT EXISTS bank_name TEXT,
    ADD COLUMN IF NOT EXISTS account_name TEXT,
    ADD COLUMN IF NOT EXISTS account_number TEXT,
    ADD COLUMN IF NOT EXISTS mpesa_paybill TEXT,
    ADD COLUMN IF NOT EXISTS mpesa_till TEXT,
    ADD COLUMN IF NOT EXISTS notes_template TEXT,
    ADD COLUMN IF NOT EXISTS terms_template TEXT,
    ADD COLUMN IF NOT EXISTS logo_url TEXT,
    ADD COLUMN IF NOT EXISTS stamp_url TEXT,
    ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Enable RLS and create permissive policies for company_invoice_settings
ALTER TABLE public.company_invoice_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select for company_invoice_settings" ON public.company_invoice_settings;
CREATE POLICY "Allow authenticated select for company_invoice_settings" 
    ON public.company_invoice_settings FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow authenticated insert/update for company_invoice_settings" ON public.company_invoice_settings;
CREATE POLICY "Allow authenticated insert/update for company_invoice_settings" 
    ON public.company_invoice_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all for company_invoice_settings" ON public.company_invoice_settings;
CREATE POLICY "Allow anon all for company_invoice_settings" 
    ON public.company_invoice_settings FOR ALL TO anon USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.company_invoice_settings TO anon, authenticated, service_role;

CREATE INDEX IF NOT EXISTS idx_company_invoice_settings_inst 
    ON public.company_invoice_settings (institution_id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
