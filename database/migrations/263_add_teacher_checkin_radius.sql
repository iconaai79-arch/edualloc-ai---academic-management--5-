-- Migration 263: Add Teacher Check-In Geofencing Radius Settings to Institutions
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS checkin_radius_enabled BOOLEAN DEFAULT FALSE;

ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS checkin_radius_meters INTEGER DEFAULT 200;

-- Comment for documentation
COMMENT ON COLUMN public.institutions.checkin_radius_enabled IS 'Toggle to enable/disable coordinate radius verification for teacher check-in';
COMMENT ON COLUMN public.institutions.checkin_radius_meters IS 'Geofencing radius in meters allowed for teacher check-in';
