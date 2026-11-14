-- Migration: 542_create_building_offices_and_security_tables.sql
-- Description: Provision building_offices, building_floors, building_visitor_logs, and building_visitor_assets tables
-- to resolve relation "building_offices" does not exist (42P01) errors.

-- 1. Floors Table
CREATE TABLE IF NOT EXISTS public.building_floors (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    floor_number INTEGER DEFAULT 0,
    "floorNumber" INTEGER DEFAULT 0,
    floor_name TEXT NOT NULL DEFAULT 'Ground Floor',
    "floorName" TEXT,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Offices Table
CREATE TABLE IF NOT EXISTS public.building_offices (
    id TEXT PRIMARY KEY,
    floor_id TEXT,
    "floorId" TEXT,
    institution_id TEXT,
    "institutionId" TEXT,
    office_number TEXT NOT NULL DEFAULT '',
    "officeNumber" TEXT,
    tenant_name TEXT NOT NULL DEFAULT '',
    "tenantName" TEXT,
    contact_person_name TEXT NOT NULL DEFAULT '',
    "contactPersonName" TEXT,
    contact_phone TEXT NOT NULL DEFAULT '',
    "contactPhone" TEXT,
    contact_email TEXT,
    "contactEmail" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Visitor Logs Table
CREATE TABLE IF NOT EXISTS public.building_visitor_logs (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    "institutionId" TEXT,
    office_id TEXT,
    "officeId" TEXT,
    visitor_name TEXT NOT NULL DEFAULT '',
    "visitorName" TEXT,
    phone_number TEXT NOT NULL DEFAULT '',
    "phoneNumber" TEXT,
    id_number TEXT NOT NULL DEFAULT '',
    "idNumber" TEXT,
    vehicle_plate TEXT,
    "vehiclePlate" TEXT,
    purpose TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'registered',
    notified_at TEXT,
    "notifiedAt" TEXT,
    authorized_by_host BOOLEAN DEFAULT FALSE,
    "authorizedByHost" BOOLEAN DEFAULT FALSE,
    entry_logged_by TEXT,
    "entryLoggedBy" TEXT,
    time_in TEXT,
    "timeIn" TEXT,
    security_notes TEXT,
    "securityNotes" TEXT,
    exit_logged_by TEXT,
    "exitLoggedBy" TEXT,
    time_out TEXT,
    "timeOut" TEXT,
    host_id TEXT,
    "hostId" TEXT,
    host_name TEXT,
    "hostName" TEXT,
    host_phone TEXT,
    "hostPhone" TEXT,
    notify_host_sms BOOLEAN DEFAULT FALSE,
    "notifyHostSms" BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Visitor Assets Table
CREATE TABLE IF NOT EXISTS public.building_visitor_assets (
    id TEXT PRIMARY KEY,
    visitor_log_id TEXT,
    "visitorLogId" TEXT,
    institution_id TEXT,
    "institutionId" TEXT,
    item_name TEXT NOT NULL DEFAULT '',
    "itemName" TEXT,
    serial_number TEXT,
    "serialNumber" TEXT,
    notes TEXT,
    verified_at_exit BOOLEAN DEFAULT FALSE,
    "verifiedAtExit" BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Add Performance Indexes
CREATE INDEX IF NOT EXISTS idx_building_floors_inst ON public.building_floors (institution_id);
CREATE INDEX IF NOT EXISTS idx_building_offices_floor ON public.building_offices (floor_id);
CREATE INDEX IF NOT EXISTS idx_building_offices_inst ON public.building_offices (institution_id);
CREATE INDEX IF NOT EXISTS idx_building_visitor_logs_inst ON public.building_visitor_logs (institution_id);
CREATE INDEX IF NOT EXISTS idx_building_visitor_logs_office ON public.building_visitor_logs (office_id);
CREATE INDEX IF NOT EXISTS idx_building_visitor_assets_log ON public.building_visitor_assets (visitor_log_id);

-- 6. Setup RLS & Role Grants
DO $$
DECLARE
    tbl text;
    tables text[] := ARRAY['building_floors', 'building_offices', 'building_visitor_logs', 'building_visitor_assets'];
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE IF EXISTS public.%I ENABLE ROW LEVEL SECURITY', tbl);

        EXECUTE format('DROP POLICY IF EXISTS "Allow all access to %s" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', tbl, tbl);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', tbl, tbl);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (true)', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (id IS NOT NULL)', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (id IS NOT NULL)', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated, anon USING (true)', tbl, tbl);

        BEGIN
            EXECUTE format('GRANT ALL ON public.%I TO anon, authenticated, service_role, postgres', tbl);
        EXCEPTION WHEN OTHERS THEN
            -- Ignore role missing errors
        END;
    END LOOP;
END $$;
