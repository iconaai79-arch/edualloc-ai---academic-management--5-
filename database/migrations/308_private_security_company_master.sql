-- ============================================================================
-- Migration 308: Private Security Company Master Management Suite
-- Description: Full SQL Schema, Indexing, and RLS Policies for Private Security 
--              Operations (Guards, Patrol Scans, RRU Tactical Units, OB Logbook,
--              Armory Inventory & Client Site Billing Contracts)
-- ============================================================================

-- 1. SECURITY GUARDS TABLE
CREATE TABLE IF NOT EXISTS public.security_guards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    guard_code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    rank VARCHAR(100) DEFAULT 'Guard', -- 'Corporal', 'Sergeant', 'Guard', 'Patrol Rover', 'K-9 Handler'
    assigned_site VARCHAR(255),
    shift VARCHAR(100) DEFAULT 'Day Shift (06:00 - 18:00)',
    clock_in_status VARCHAR(50) DEFAULT 'OFF_DUTY', -- 'CLOCKED_IN', 'OFF_DUTY', 'LATE', 'PATROL_ACTIVE'
    last_patrol_scan VARCHAR(255),
    vetted_status VARCHAR(100) DEFAULT 'VETTED_POLICE_CLEARED',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. VERIFIED PATROL CHECKPOINT SCANS TABLE
CREATE TABLE IF NOT EXISTS public.security_patrol_scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    guard_id UUID REFERENCES public.security_guards(id) ON DELETE CASCADE,
    guard_name VARCHAR(255) NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    checkpoint_name VARCHAR(255) NOT NULL,
    scan_method VARCHAR(50) DEFAULT 'NFC_TAG', -- 'NFC_TAG', 'QR_CODE', 'GPS_GEOFENCE'
    scan_status VARCHAR(50) DEFAULT 'VERIFIED', -- 'VERIFIED', 'DELAYED_SCAN', 'MISSED'
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RAPID RESPONSE UNITS (RRU) FLEET TABLE
CREATE TABLE IF NOT EXISTS public.rapid_response_units (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    vehicle_code VARCHAR(100) NOT NULL, -- e.g. RRU-01 Alpha
    driver_name VARCHAR(255) NOT NULL,
    commander_name VARCHAR(255) NOT NULL,
    current_location VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'STANDBY_BASE', -- 'STANDBY_BASE', 'DISPATCHED_EN_ROUTE', 'ON_SCENE', 'MAINTENANCE'
    assigned_incident_id VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DIGITAL OCCURRENCE BOOK (OB LOGBOOK) TABLE
CREATE TABLE IF NOT EXISTS public.occurrence_book (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    ob_number VARCHAR(100) NOT NULL, -- e.g. OB-2026-0814-001
    site_name VARCHAR(255) NOT NULL,
    reported_by VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Security Breach', 'Suspicious Person', 'Property Damage', 'Routine Patrol Log', 'Alarm Trigger'
    severity VARCHAR(50) DEFAULT 'MEDIUM', -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    details TEXT NOT NULL,
    action_taken TEXT,
    police_ob_ref VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ARMORY & TACTICAL EQUIPMENT TABLE
CREATE TABLE IF NOT EXISTS public.armory_equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    item_code VARCHAR(100) NOT NULL,
    item_name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'Firearm', 'Ammunition', 'Walkie-Talkie', 'Bodycam', 'Bulletproof Vest', 'Metal Detector'
    serial_number VARCHAR(255) NOT NULL,
    assigned_to_guard_id UUID REFERENCES public.security_guards(id) ON DELETE SET NULL,
    assigned_to_guard_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'ARMORY_IN_STORE', -- 'ARMORY_IN_STORE', 'ISSUED_ON_DUTY', 'UNDER_REPAIR'
    last_inspected DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. CLIENT SITE CONTRACTS & INVOICING TABLE
CREATE TABLE IF NOT EXISTS public.client_site_contracts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id TEXT NOT NULL,
    client_name VARCHAR(255) NOT NULL,
    site_name VARCHAR(255) NOT NULL,
    location VARCHAR(255) NOT NULL,
    contact_person VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    day_guards_required INT DEFAULT 2,
    night_guards_required INT DEFAULT 2,
    monthly_contract_fee NUMERIC(15,2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) DEFAULT 'PAID_CURRENT', -- 'PAID_CURRENT', 'OVERDUE_ARREARS', 'PENDING_INVOICE'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. PERFORMANCE INDEXES
CREATE INDEX IF NOT EXISTS idx_security_guards_inst ON public.security_guards(institution_id);
CREATE INDEX IF NOT EXISTS idx_security_patrol_scans_inst ON public.security_patrol_scans(institution_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_occurrence_book_inst ON public.occurrence_book(institution_id, created_at);
CREATE INDEX IF NOT EXISTS idx_armory_equipment_inst ON public.armory_equipment(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_client_site_contracts_inst ON public.client_site_contracts(institution_id, payment_status);

-- 8. ROW LEVEL SECURITY (RLS) POLICIES
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'security_guards', 'security_patrol_scans', 'rapid_response_units', 
        'occurrence_book', 'armory_equipment', 'client_site_contracts'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);

        EXECUTE format('DROP POLICY IF EXISTS %s_policy ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON public.%I', t, t);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON public.%I', t, t);

        EXECUTE format('CREATE POLICY "%s_select" ON public.%I FOR SELECT TO authenticated, anon USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_insert" ON public.%I FOR INSERT TO authenticated, anon WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_update" ON public.%I FOR UPDATE TO authenticated, anon USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL) WITH CHECK (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'' OR public.get_curr_user_inst_id() IS NULL)', t, t);
        EXECUTE format('CREATE POLICY "%s_delete" ON public.%I FOR DELETE TO authenticated USING (institution_id = public.get_curr_user_inst_id() OR public.get_curr_user_role() = ''super_admin'')', t, t);

        EXECUTE format('GRANT ALL ON public.%I TO authenticated, anon, service_role', t);
    END LOOP;
END $$;
