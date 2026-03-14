-- 1. Chart of Accounts Table
-- Defines the financial structure (Assets, Liabilities, Equity, Revenue, Expenses)
CREATE TABLE IF NOT EXISTS public.carwash_accounts (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    account_code VARCHAR(20) NOT NULL,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL CHECK (type IN ('Asset', 'Liability', 'Equity', 'Revenue', 'Expense')),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(institution_id, account_code)
);

-- 2. Journal Entries Table
-- Header table for a financial transaction (e.g., 'Daily Sales', 'Paid Rent')
CREATE TABLE IF NOT EXISTS public.carwash_journal_entries (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    entry_number VARCHAR(50) NOT NULL,
    entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
    description TEXT NOT NULL,
    reference_type VARCHAR(50), -- e.g., 'Job', 'Expense', 'Payroll'
    reference_id TEXT, -- Link to carwash_jobs, carwash_expenses, etc.
    created_by TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Journal Lines Table
-- Detail table holding the actual Debits and Credits
CREATE TABLE IF NOT EXISTS public.carwash_journal_lines (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    entry_id TEXT NOT NULL REFERENCES public.carwash_journal_entries(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES public.carwash_accounts(id),
    description TEXT,
    debit DECIMAL(12, 2) DEFAULT 0 CHECK (debit >= 0),
    credit DECIMAL(12, 2) DEFAULT 0 CHECK (credit >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Simplified Expense Tracking Table
-- User-friendly way to log expenses that auto-generates journal entries behind the scenes
CREATE TABLE IF NOT EXISTS public.carwash_expenses (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    category VARCHAR(50) NOT NULL, -- e.g., 'Supplies', 'Utilities', 'Maintenance'
    description TEXT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
    payment_method VARCHAR(50) NOT NULL, -- 'cash', 'mpesa', 'bank'
    recorded_by TEXT REFERENCES public.users(id),
    receipt_url TEXT,
    journal_entry_id TEXT REFERENCES public.carwash_journal_entries(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Staff Payroll & Advances Table
-- Tracks staff earnings, commissions, cash advances, and net payments
CREATE TABLE IF NOT EXISTS public.carwash_payroll (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    staff_id TEXT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    base_salary DECIMAL(10, 2) DEFAULT 0,
    commissions DECIMAL(10, 2) DEFAULT 0,
    advances_taken DECIMAL(10, 2) DEFAULT 0,
    deductions DECIMAL(10, 2) DEFAULT 0,
    net_pay DECIMAL(10, 2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'approved', 'paid')),
    payment_method VARCHAR(50),
    payment_date TIMESTAMP WITH TIME ZONE,
    journal_entry_id TEXT REFERENCES public.carwash_journal_entries(id) ON DELETE SET NULL,
    processed_by TEXT REFERENCES public.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initial Accounts Seeding (Default Setup)
-- This function can be called per institution to setup basic accounts
CREATE OR REPLACE FUNCTION public.seed_default_carwash_accounts(inst_id TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO public.carwash_accounts (id, institution_id, account_code, name, type, description)
    VALUES 
        ('acc_' || inst_id || '_1000', inst_id, '1000', 'Cash on Hand', 'Asset', 'Physical cash in till'),
        ('acc_' || inst_id || '_1010', inst_id, '1010', 'M-Pesa Till', 'Asset', 'Digital payments via M-Pesa'),
        ('acc_' || inst_id || '_2000', inst_id, '2000', 'Accounts Payable', 'Liability', 'Money owed to suppliers'),
        ('acc_' || inst_id || '_3000', inst_id, '3000', 'Owner Equity', 'Equity', 'Owner investments / Retained earnings'),
        ('acc_' || inst_id || '_4000', inst_id, '4000', 'Wash Revenue', 'Revenue', 'Income from car washes'),
        ('acc_' || inst_id || '_4010', inst_id, '4010', 'Add-on Revenue', 'Revenue', 'Income from extra services'),
        ('acc_' || inst_id || '_5000', inst_id, '5000', 'Supplies Expense', 'Expense', 'Soap, wax, rags, etc'),
        ('acc_' || inst_id || '_5010', inst_id, '5010', 'Wages & Salary Expense', 'Expense', 'Staff payroll and commissions'),
        ('acc_' || inst_id || '_5020', inst_id, '5020', 'Utilities Expense', 'Expense', 'Water and electricity bills'),
        ('acc_' || inst_id || '_5030', inst_id, '5030', 'Maintenance Expense', 'Expense', 'Machine and equipment repairs')
    ON CONFLICT (institution_id, account_code) DO NOTHING;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Add RLS Policies
ALTER TABLE public.carwash_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carwash_journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carwash_journal_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carwash_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carwash_payroll ENABLE ROW LEVEL SECURITY;

-- Assuming standard RLS: users can only see their institution's data
CREATE POLICY "Users can view accounts for their institution"
ON public.carwash_accounts FOR SELECT USING (institution_id IN (
    SELECT institution_id FROM current_user_institutions()
));

CREATE POLICY "Admins can manage accounts for their institution"
ON public.carwash_accounts FOR ALL USING (
    institution_id IN (SELECT institution_id FROM current_user_institutions())
    AND current_user_role() IN ('admin', 'super_admin')
);

CREATE POLICY "Users can view journal entries for their institution"
ON public.carwash_journal_entries FOR SELECT USING (institution_id IN (SELECT institution_id FROM current_user_institutions()));

CREATE POLICY "Admins can manage journal entries"
ON public.carwash_journal_entries FOR ALL USING (
    institution_id IN (SELECT institution_id FROM current_user_institutions())
    AND current_user_role() IN ('admin', 'super_admin')
);

CREATE POLICY "Users can view journal lines for their institution"
ON public.carwash_journal_lines FOR SELECT USING (institution_id IN (SELECT institution_id FROM current_user_institutions()));

CREATE POLICY "Admins can manage journal lines"
ON public.carwash_journal_lines FOR ALL USING (
    institution_id IN (SELECT institution_id FROM current_user_institutions())
    AND current_user_role() IN ('admin', 'super_admin')
);

CREATE POLICY "Users can view expenses for their institution"
ON public.carwash_expenses FOR SELECT USING (institution_id IN (SELECT institution_id FROM current_user_institutions()));

CREATE POLICY "Staff can create expenses"
ON public.carwash_expenses FOR INSERT WITH CHECK (
    institution_id IN (SELECT institution_id FROM current_user_institutions())
);

CREATE POLICY "Admins can update expenses"
ON public.carwash_expenses FOR UPDATE USING (
    institution_id IN (SELECT institution_id FROM current_user_institutions())
    AND current_user_role() IN ('admin', 'super_admin')
);

CREATE POLICY "Users can view payroll for their institution"
ON public.carwash_payroll FOR SELECT USING (
    institution_id IN (SELECT institution_id FROM current_user_institutions())
    -- Staff can only see their own payslips unless they are admin
    AND (staff_id = auth.uid() OR current_user_role() IN ('admin', 'super_admin'))
);

CREATE POLICY "Admins can manage payroll"
ON public.carwash_payroll FOR ALL USING (
    institution_id IN (SELECT institution_id FROM current_user_institutions())
    AND current_user_role() IN ('admin', 'super_admin')
);
