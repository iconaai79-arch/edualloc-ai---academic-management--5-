-- Migration: Fix mutable search_path on allocate_tenant_sms_bonus
-- Description: Sets explicit search_path and SECURITY DEFINER to satisfy PostgreSQL/Supabase security linter.

CREATE OR REPLACE FUNCTION public.allocate_tenant_sms_bonus()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    days_diff INTEGER;
    months_diff INTEGER;
    tenant_count INTEGER;
    bonus_units INTEGER;
    old_end TIMESTAMP;
    new_end TIMESTAMP;
BEGIN
    new_end := NEW.subscription_ends_at;
    old_end := OLD.subscription_ends_at;

    IF new_end IS NOT NULL AND (old_end IS NULL OR new_end > old_end) THEN
        IF old_end IS NULL OR old_end < NOW() THEN
            days_diff := EXTRACT(EPOCH FROM (new_end - NOW())) / 86400;
        ELSE
            days_diff := EXTRACT(EPOCH FROM (new_end - old_end)) / 86400;
        END IF;

        IF days_diff <= 0 THEN
            days_diff := 30;
        END IF;

        IF days_diff > 300 THEN
            months_diff := 12;
        ELSE
            months_diff := CEIL(days_diff / 30.0);
        END IF;

        SELECT COUNT(*)::INTEGER INTO tenant_count 
        FROM pm_tenants 
        WHERE institution_id = NEW.id;

        IF tenant_count > 0 THEN
            bonus_units := 6 * months_diff * tenant_count;
            
            NEW.sms_config := jsonb_set(
                COALESCE(NEW.sms_config, '{}'::jsonb), 
                '{systemSmsBalance}', 
                to_jsonb(COALESCE((NEW.sms_config->>'systemSmsBalance')::int, 0) + bonus_units)
            );
            
            NEW.smsConfig := NEW.sms_config;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Ensure trigger is active
DROP TRIGGER IF EXISTS trg_allocate_tenant_sms_bonus ON institutions;
CREATE TRIGGER trg_allocate_tenant_sms_bonus
    BEFORE UPDATE OF subscription_ends_at ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION allocate_tenant_sms_bonus();

-- Revoke direct API/RPC execution from anon and authenticated users
REVOKE EXECUTE ON FUNCTION public.allocate_tenant_sms_bonus() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.allocate_tenant_sms_bonus() TO postgres, service_role;
