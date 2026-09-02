-- Migration 366: Ensure his_financial_records table and all required columns exist with proper RLS & schema reload
-- Description: Adds missing columns (amount_paid, patient_name, invoice_number, items, total_amount, balance, status, category, notes) to his_financial_records

CREATE TABLE IF NOT EXISTS public.his_financial_records (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    patient_id TEXT REFERENCES public.his_patients(id) ON DELETE SET NULL,
    patient_name TEXT,
    invoice_number TEXT,
    type TEXT DEFAULT 'invoice',
    category TEXT,
    items JSONB DEFAULT '[]'::jsonb,
    amount NUMERIC(15, 2) DEFAULT 0,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    amount_paid NUMERIC(15, 2) DEFAULT 0,
    balance NUMERIC(15, 2) DEFAULT 0,
    status TEXT DEFAULT 'Pending',
    payment_method TEXT,
    department TEXT,
    notes TEXT,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure all columns exist in case the table was created previously with fewer columns
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS patient_name TEXT;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'invoice';
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Enable Row Level Security
ALTER TABLE public.his_financial_records ENABLE ROW LEVEL SECURITY;

-- Drop and recreate RLS policies to allow seamless operation
DROP POLICY IF EXISTS "HIS financial records access" ON public.his_financial_records;
DROP POLICY IF EXISTS "HIS financial records viewable by institution" ON public.his_financial_records;
DROP POLICY IF EXISTS "his_financial_records_institution_isolation" ON public.his_financial_records;

CREATE POLICY "his_financial_records_institution_isolation"
    ON public.his_financial_records
    FOR ALL
    USING (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    )
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()
        OR (public.get_curr_user_inst_id() IS NULL AND (auth.role() = 'anon' OR auth.role() = 'authenticated'))
    );

-- Grant appropriate permissions
GRANT ALL ON TABLE public.his_financial_records TO anon, authenticated, service_role;

-- Force PostgREST to reload its schema cache
NOTIFY pgrst, 'reload schema';
