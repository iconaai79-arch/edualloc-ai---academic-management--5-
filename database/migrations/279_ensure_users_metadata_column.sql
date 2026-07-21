-- Migration 279: Ensure metadata JSONB column exists on public.users table for storing opening balances and student metadata
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
