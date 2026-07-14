-- Migration: Create Floors, Offices, Visitor Logs, and Visitor Assets Tables
-- Path: database/migrations/272_create_building_security_tables.sql

-- 1. Floors Table
CREATE TABLE IF NOT EXISTS public.building_floors (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    floor_number INTEGER NOT NULL,
    floor_name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Offices Table
CREATE TABLE IF NOT EXISTS public.building_offices (
    id TEXT PRIMARY KEY,
    floor_id TEXT NOT NULL REFERENCES public.building_floors(id) ON DELETE CASCADE,
    office_number TEXT NOT NULL,
    tenant_name TEXT NOT NULL,
    contact_person_name TEXT NOT NULL,
    contact_phone TEXT NOT NULL,
    contact_email TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Visitor Logs Table
CREATE TABLE IF NOT EXISTS public.building_visitor_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT NOT NULL,
    office_id TEXT REFERENCES public.building_offices(id) ON DELETE SET NULL,
    visitor_name TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    id_number TEXT NOT NULL,
    vehicle_plate TEXT,
    purpose TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'registered', -- 'registered', 'checked_in', 'checked_out', 'declined'
    notified_at TEXT,
    authorized_by_host BOOLEAN DEFAULT FALSE,
    entry_logged_by TEXT,
    time_in TEXT,
    security_notes TEXT,
    exit_logged_by TEXT,
    time_out TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Visitor Assets Table (laptops, tools etc.)
CREATE TABLE IF NOT EXISTS public.building_visitor_assets (
    id TEXT PRIMARY KEY,
    visitor_log_id TEXT NOT NULL REFERENCES public.building_visitor_logs(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    serial_number TEXT,
    notes TEXT,
    verified_at_exit BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
