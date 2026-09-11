-- =====================================================================
-- Migration: 393_create_school_network_devices.sql
-- Description: Creates school_authorized_devices and school_router_profiles
--              tables for school WiFi access control & Tenda F3/F6 MAC whitelisting.
-- =====================================================================

-- 1. Create school_router_profiles table
CREATE TABLE IF NOT EXISTS public.school_router_profiles (
    id VARCHAR(100) PRIMARY KEY,
    institution_id VARCHAR(100) NOT NULL,
    router_name VARCHAR(255) NOT NULL,
    model VARCHAR(100) DEFAULT 'Tenda F3',
    ip_address VARCHAR(50) DEFAULT '192.168.0.1',
    location VARCHAR(255),
    wifi_ssid VARCHAR(100),
    filter_mode VARCHAR(50) DEFAULT 'whitelist',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create school_authorized_devices table
CREATE TABLE IF NOT EXISTS public.school_authorized_devices (
    id VARCHAR(100) PRIMARY KEY,
    institution_id VARCHAR(100) NOT NULL,
    device_name VARCHAR(255) NOT NULL,
    device_type VARCHAR(50) DEFAULT 'laptop', -- 'laptop', 'desktop', 'phone', 'tablet', 'printer', 'cctv', 'smart_tv', 'other'
    mac_address VARCHAR(50) NOT NULL,
    ip_address VARCHAR(50),
    owner_type VARCHAR(50) DEFAULT 'teacher', -- 'teacher', 'staff', 'student', 'department', 'infrastructure', 'visitor'
    owner_id VARCHAR(100),
    owner_name VARCHAR(255),
    department VARCHAR(100),
    bandwidth_limit_mbps NUMERIC(5,2) DEFAULT 5.0,
    access_status VARCHAR(50) DEFAULT 'authorized', -- 'authorized', 'suspended', 'revoked', 'pending'
    router_profile_id VARCHAR(100),
    notes TEXT,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Indexes for High Performance
CREATE INDEX IF NOT EXISTS idx_school_network_devices_inst ON public.school_authorized_devices(institution_id);
CREATE INDEX IF NOT EXISTS idx_school_network_devices_mac ON public.school_authorized_devices(mac_address);
CREATE INDEX IF NOT EXISTS idx_school_network_devices_status ON public.school_authorized_devices(access_status);
CREATE INDEX IF NOT EXISTS idx_school_router_profiles_inst ON public.school_router_profiles(institution_id);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.school_router_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_authorized_devices ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for school_router_profiles
DROP POLICY IF EXISTS "Allow public read school_router_profiles" ON public.school_router_profiles;
CREATE POLICY "Allow public read school_router_profiles" ON public.school_router_profiles
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert school_router_profiles" ON public.school_router_profiles;
CREATE POLICY "Allow public insert school_router_profiles" ON public.school_router_profiles
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update school_router_profiles" ON public.school_router_profiles;
CREATE POLICY "Allow public update school_router_profiles" ON public.school_router_profiles
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete school_router_profiles" ON public.school_router_profiles;
CREATE POLICY "Allow public delete school_router_profiles" ON public.school_router_profiles
    FOR DELETE USING (true);

-- 6. RLS Policies for school_authorized_devices
DROP POLICY IF EXISTS "Allow public read school_authorized_devices" ON public.school_authorized_devices;
CREATE POLICY "Allow public read school_authorized_devices" ON public.school_authorized_devices
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert school_authorized_devices" ON public.school_authorized_devices;
CREATE POLICY "Allow public insert school_authorized_devices" ON public.school_authorized_devices
    FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update school_authorized_devices" ON public.school_authorized_devices;
CREATE POLICY "Allow public update school_authorized_devices" ON public.school_authorized_devices
    FOR UPDATE USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public delete school_authorized_devices" ON public.school_authorized_devices;
CREATE POLICY "Allow public delete school_authorized_devices" ON public.school_authorized_devices
    FOR DELETE USING (true);

-- 7. Grant Permissions to standard roles
GRANT ALL ON public.school_router_profiles TO anon, authenticated, service_role;
GRANT ALL ON public.school_authorized_devices TO anon, authenticated, service_role;
