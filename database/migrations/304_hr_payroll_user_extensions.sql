-- Migration: 304_hr_payroll_user_extensions.sql
-- Description: Ensures users table and HR Payroll metadata support Kenyan statutory compliance, basic salary, employment date, national ID, KRA PIN, NSSF, SHIF and bank accounts.

DO $$ 
BEGIN
    -- Ensure metadata JSONB column exists on users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'metadata'
    ) THEN
        ALTER TABLE users ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Optional top-level columns on users table for index optimization
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'national_id'
    ) THEN
        ALTER TABLE users ADD COLUMN national_id VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'employment_date'
    ) THEN
        ALTER TABLE users ADD COLUMN employment_date DATE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'employment_terms'
    ) THEN
        ALTER TABLE users ADD COLUMN employment_terms VARCHAR(100) DEFAULT 'Permanent & Pensionable';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'basic_salary'
    ) THEN
        ALTER TABLE users ADD COLUMN basic_salary NUMERIC(12,2) DEFAULT 0.00;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'kra_pin'
    ) THEN
        ALTER TABLE users ADD COLUMN kra_pin VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'nssf_no'
    ) THEN
        ALTER TABLE users ADD COLUMN nssf_no VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'shif_number'
    ) THEN
        ALTER TABLE users ADD COLUMN shif_number VARCHAR(50);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'bank_name'
    ) THEN
        ALTER TABLE users ADD COLUMN bank_name VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'bank_branch'
    ) THEN
        ALTER TABLE users ADD COLUMN bank_branch VARCHAR(100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'bank_account_number'
    ) THEN
        ALTER TABLE users ADD COLUMN bank_account_number VARCHAR(100);
    END IF;
END $$;

-- Indexes for HR search optimization
CREATE INDEX IF NOT EXISTS idx_users_kra_pin ON users (kra_pin);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users (national_id);
CREATE INDEX IF NOT EXISTS idx_users_nssf_no ON users (nssf_no);
