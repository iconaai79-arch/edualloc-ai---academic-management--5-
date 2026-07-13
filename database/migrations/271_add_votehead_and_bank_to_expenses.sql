-- Migration: Add Votehead, Bank Account, Payee Name and Approved By columns to Expenses table
-- Path: database/migrations/271_add_votehead_and_bank_to_expenses.sql

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS vote_head_id TEXT REFERENCES public.vote_heads(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS bank_account_id TEXT REFERENCES public.school_bank_accounts(id) ON DELETE SET NULL;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payee_name TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS approved_by TEXT;
