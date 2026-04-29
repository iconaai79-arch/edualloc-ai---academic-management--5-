
-- Migration 192: Proximity Networking (Nearby Alumnae)
-- This migration adds geolocation support to alumnae profiles for the "Nearby" feature.

ALTER TABLE public.alumnae_members 
ADD COLUMN IF NOT EXISTS is_location_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS location_updated_at TIMESTAMPTZ;

-- Helper function to calculate distance between two coordinates in Kilometers (Haversine Formula)
CREATE OR REPLACE FUNCTION calculate_distance(lat1 float, lon1 float, lat2 float, lon2 float)
RETURNS float AS $$
DECLARE
    dist float = 0;
    rad_lat1 float;
    rad_lat2 float;
    theta float;
    rad_theta float;
BEGIN
    IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
        RETURN NULL;
    END IF;
    
    IF lat1 = lat2 AND lon1 = lon2 THEN
        RETURN dist;
    ELSE
        rad_lat1 = pi() * lat1 / 180;
        rad_lat2 = pi() * lat2 / 180;
        theta = lon1 - lon2;
        rad_theta = pi() * theta / 180;
        dist = sin(rad_lat1) * sin(rad_lat2) + cos(rad_lat1) * cos(rad_lat2) * cos(rad_theta);

        IF dist > 1 THEN dist = 1; END IF;

        dist = acos(dist);
        dist = dist * 180 / pi();
        dist = dist * 60 * 1.1515;
        dist = dist * 1.609344; -- Convert to Kilometers

        RETURN dist;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON COLUMN public.alumnae_members.is_location_enabled IS 'Privacy toggle for proximity-based networking features.';
