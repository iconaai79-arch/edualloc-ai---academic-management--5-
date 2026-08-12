-- Migration: 305_payroll_records_table.sql
-- Description: Creates payroll_records, payroll_runs, and his_expenditures tables in database to prevent 500 API errors.

CREATE TABLE IF NOT EXISTS payroll_records (
    id VARCHAR(100) PRIMARY KEY,
    institution_id VARCHAR(100),
    staff_id VARCHAR(100),
    staff_name VARCHAR(255),
    month VARCHAR(50),
    basic_salary NUMERIC(12,2) DEFAULT 0.00,
    allowances JSONB DEFAULT '[]'::jsonb,
    deductions JSONB DEFAULT '[]'::jsonb,
    net_salary NUMERIC(12,2) DEFAULT 0.00,
    status VARCHAR(50) DEFAULT 'paid',
    recorded_by VARCHAR(255),
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_runs (
    id VARCHAR(100) PRIMARY KEY,
    institution_id VARCHAR(100),
    records JSONB DEFAULT '[]'::jsonb,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS his_expenditures (
    id VARCHAR(100) PRIMARY KEY,
    institution_id VARCHAR(100),
    title TEXT,
    category VARCHAR(100),
    vendor VARCHAR(255),
    amount NUMERIC(12,2) DEFAULT 0.00,
    date DATE,
    payment_method VARCHAR(100),
    voucher_no VARCHAR(100),
    status VARCHAR(50) DEFAULT 'Paid',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS and permissive policies for institution users
ALTER TABLE payroll_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE his_expenditures ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on payroll_records') THEN
        CREATE POLICY "Allow public all access on payroll_records" ON payroll_records FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on payroll_runs') THEN
        CREATE POLICY "Allow public all access on payroll_runs" ON payroll_runs FOR ALL USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow public all access on his_expenditures') THEN
        CREATE POLICY "Allow public all access on his_expenditures" ON his_expenditures FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;
