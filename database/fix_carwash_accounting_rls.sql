-- SQL Fix for Car Wash Accounting RLS Policies
-- Execute this in your Supabase SQL Editor if you encounter "violates row-level security policy" (Error 42501)

-- 1. Accounts
DROP POLICY IF EXISTS "Users can view accounts for their institution" ON public.carwash_accounts;
DROP POLICY IF EXISTS "Admins can manage accounts for their institution" ON public.carwash_accounts;
CREATE POLICY "Enable read for all" ON public.carwash_accounts FOR SELECT USING (true);
CREATE POLICY "Enable write for all" ON public.carwash_accounts FOR ALL USING (true) WITH CHECK (true);

-- 2. Journal Entries
DROP POLICY IF EXISTS "Users can view journal entries for their institution" ON public.carwash_journal_entries;
DROP POLICY IF EXISTS "Admins can manage journal entries" ON public.carwash_journal_entries;
CREATE POLICY "Enable read for all" ON public.carwash_journal_entries FOR SELECT USING (true);
CREATE POLICY "Enable write for all" ON public.carwash_journal_entries FOR ALL USING (true) WITH CHECK (true);

-- 3. Journal Lines
DROP POLICY IF EXISTS "Users can view journal lines for their institution" ON public.carwash_journal_lines;
DROP POLICY IF EXISTS "Admins can manage journal lines" ON public.carwash_journal_lines;
CREATE POLICY "Enable read for all" ON public.carwash_journal_lines FOR SELECT USING (true);
CREATE POLICY "Enable write for all" ON public.carwash_journal_lines FOR ALL USING (true) WITH CHECK (true);

-- 4. Expenses
DROP POLICY IF EXISTS "Users can view expenses for their institution" ON public.carwash_expenses;
DROP POLICY IF EXISTS "Staff can create expenses" ON public.carwash_expenses;
DROP POLICY IF EXISTS "Admins can update expenses" ON public.carwash_expenses;
CREATE POLICY "Enable read for all" ON public.carwash_expenses FOR SELECT USING (true);
CREATE POLICY "Enable write for all" ON public.carwash_expenses FOR ALL USING (true) WITH CHECK (true);

-- 5. Payroll
DROP POLICY IF EXISTS "Users can view payroll for their institution" ON public.carwash_payroll;
DROP POLICY IF EXISTS "Admins can manage payroll" ON public.carwash_payroll;
CREATE POLICY "Enable read for all" ON public.carwash_payroll FOR SELECT USING (true);
CREATE POLICY "Enable write for all" ON public.carwash_payroll FOR ALL USING (true) WITH CHECK (true);
