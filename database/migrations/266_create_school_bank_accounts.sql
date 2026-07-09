-- Migration: Create School Bank Accounts Table
-- Path: database/migrations/266_create_school_bank_accounts.sql

CREATE TABLE IF NOT EXISTS public.school_bank_accounts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    bank_name TEXT NOT NULL,
    account_name TEXT NOT NULL,
    account_number TEXT NOT NULL,
    branch_name TEXT,
    currency TEXT DEFAULT 'KES',
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.school_bank_accounts ENABLE ROW LEVEL SECURITY;

-- Apply basic permissive policy for authenticated and anonymous users
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.school_bank_accounts;
CREATE POLICY "Enable all access for authenticated users" ON public.school_bank_accounts FOR ALL USING (auth.role() = 'authenticated' OR auth.role() = 'anon');

GRANT ALL ON public.school_bank_accounts TO anon, authenticated, service_role;
