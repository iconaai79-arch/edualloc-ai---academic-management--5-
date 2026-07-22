-- Migration 285: Fix Security Linter Warning for calculate_distance
-- Explicitly sets search_path to prevent role-mutable search_path security vulnerabilities.

ALTER FUNCTION public.calculate_distance(float, float, float, float) SET search_path = public, pg_temp;
