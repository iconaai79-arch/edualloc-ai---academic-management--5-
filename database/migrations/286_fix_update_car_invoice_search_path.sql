-- Migration 286: Fix Security Linter Warning for update_car_invoice_on_payment & update_alumni_post_comment_count
-- Explicitly sets search_path to prevent role-mutable search_path security vulnerabilities on SECURITY DEFINER functions.

ALTER FUNCTION public.update_car_invoice_on_payment() SET search_path = public, pg_temp;
ALTER FUNCTION public.update_alumni_post_comment_count() SET search_path = public, pg_temp;
