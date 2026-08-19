-- Migration: Revoke direct API/RPC execution from trigger functions
-- Description: Trigger functions should not be callable via PostgREST RPC endpoints by authenticated or anon roles.

REVOKE EXECUTE ON FUNCTION public.update_car_invoice_on_payment() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_car_invoice_on_payment() TO postgres, service_role;
