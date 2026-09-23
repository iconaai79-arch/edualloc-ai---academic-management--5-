-- Migration: 20260822_create_hr_allowance_and_deduction_categories.sql
-- Description: Creates hr_allowance_categories and hr_deduction_categories tables with RLS and indexes.

CREATE TABLE IF NOT EXISTS hr_allowance_categories (
    id VARCHAR(100) PRIMARY KEY,
    institution_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'fixed', -- 'fixed' | 'percentage'
    default_amount NUMERIC(12,2) DEFAULT 0.00,
    is_tax_exempt BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hr_deduction_categories (
    id VARCHAR(100) PRIMARY KEY,
    institution_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) DEFAULT 'fixed', -- 'fixed' | 'percentage'
    default_amount NUMERIC(12,2) DEFAULT 0.00,
    is_statutory BOOLEAN DEFAULT FALSE,
    is_recurring BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_hr_allowance_categories_inst ON hr_allowance_categories(institution_id);
CREATE INDEX IF NOT EXISTS idx_hr_deduction_categories_inst ON hr_deduction_categories(institution_id);

-- Enable RLS and create permissive policies
ALTER TABLE hr_allowance_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_deduction_categories ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access on hr_allowance_categories') THEN
        CREATE POLICY "Allow all access on hr_allowance_categories" ON hr_allowance_categories FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow all access on hr_deduction_categories') THEN
        CREATE POLICY "Allow all access on hr_deduction_categories" ON hr_deduction_categories FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Data API grants (required from Supabase Oct 30 2025: new tables need explicit grants)
GRANT SELECT ON public.hr_allowance_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_allowance_categories TO authenticated;
GRANT ALL ON public.hr_allowance_categories TO service_role;

GRANT SELECT ON public.hr_deduction_categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hr_deduction_categories TO authenticated;
GRANT ALL ON public.hr_deduction_categories TO service_role;
