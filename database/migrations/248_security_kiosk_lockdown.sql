-- Migration: 248_security_kiosk_lockdown
-- Description: Adds remote lockdown state and exit PIN configurations for security kiosks

ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kiosk_security_pin TEXT DEFAULT '1234';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kiosk_status TEXT DEFAULT 'active' CHECK (kiosk_status IN ('active', 'locked'));
