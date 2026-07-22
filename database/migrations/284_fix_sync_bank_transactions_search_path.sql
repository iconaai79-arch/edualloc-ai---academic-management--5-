-- Migration 284: Fix Security Linter Warning for sync_bank_transactions_from_logs
-- Explicitly sets search_path to prevent role-mutable search_path security vulnerabilities.

ALTER FUNCTION public.sync_bank_transactions_from_logs() SET search_path = public, pg_temp;
