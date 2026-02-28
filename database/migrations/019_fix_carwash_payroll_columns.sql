-- Migration to fix carwash_payroll column names and add missing tax columns
-- This standardizes the table with the frontend CarWashPayroll interface

DO $$ 
BEGIN
    -- Rename commissions to commission_earned if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_payroll' AND column_name = 'commissions') THEN
        ALTER TABLE public.carwash_payroll RENAME COLUMN commissions TO commission_earned;
    END IF;

    -- Rename net_pay to total_pay if it exists
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_payroll' AND column_name = 'net_pay') THEN
        ALTER TABLE public.carwash_payroll RENAME COLUMN net_pay TO total_pay;
    END IF;

    -- Add missing tax columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_payroll' AND column_name = 'nssf') THEN
        ALTER TABLE public.carwash_payroll ADD COLUMN nssf DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_payroll' AND column_name = 'shif') THEN
        ALTER TABLE public.carwash_payroll ADD COLUMN shif DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_payroll' AND column_name = 'paye') THEN
        ALTER TABLE public.carwash_payroll ADD COLUMN paye DECIMAL(10, 2) DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'carwash_payroll' AND column_name = 'housing_levy') THEN
        ALTER TABLE public.carwash_payroll ADD COLUMN housing_levy DECIMAL(10, 2) DEFAULT 0;
    END IF;
END $$;
