-- ============================================================================
-- Talksasa Migration: Staff Attendance Logs & Biometric Tables
-- Idempotent, safe migration to create public.staff_attendance_logs,
-- biometric_devices, staff_attendance_daily, and biometric_enrollments
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Table: public.staff_attendance_logs
CREATE TABLE IF NOT EXISTS public.staff_attendance_logs (
    id TEXT PRIMARY KEY DEFAULT ('sal_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
    institution_id TEXT,
    staff_id TEXT,
    device_id TEXT,
    device_pin TEXT,
    punch_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    punch_type INTEGER DEFAULT 0,
    verification_method INTEGER DEFAULT 1,
    raw_data TEXT,
    is_processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Ensure all columns and dual-casing support
DO $$
BEGIN
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "staffId" TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "devicePin" TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "punchTime" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "punchType" INTEGER DEFAULT 0;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "verificationMethod" INTEGER DEFAULT 1;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "rawData" TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "isProcessed" BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

    -- Also ensure snake_case columns if table had only camelCase
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS staff_id TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS device_id TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS device_pin TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS punch_time TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS punch_type INTEGER DEFAULT 0;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS verification_method INTEGER DEFAULT 1;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS raw_data TEXT;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS is_processed BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
END $$;

CREATE INDEX IF NOT EXISTS idx_staff_attendance_logs_inst ON public.staff_attendance_logs (institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_logs_pin ON public.staff_attendance_logs (device_pin);
CREATE INDEX IF NOT EXISTS idx_staff_attendance_logs_punch ON public.staff_attendance_logs (punch_time DESC);

-- 2. Table: public.biometric_devices
CREATE TABLE IF NOT EXISTS public.biometric_devices (
    id TEXT PRIMARY KEY DEFAULT ('dev_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
    institution_id TEXT,
    serial_number TEXT,
    device_name TEXT,
    device_model TEXT,
    protocol TEXT DEFAULT 'dahua',
    ip_address TEXT,
    port INTEGER DEFAULT 80,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "deviceName" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "deviceModel" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "locationDescription" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "protocol" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "pushUrl" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "lastSyncAt" TIMESTAMPTZ;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "lastIp" TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "requestsCount" NUMERIC DEFAULT 0;

    -- Ensure snake_case columns
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS serial_number TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS device_name TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS device_model TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS ip_address TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS port INTEGER DEFAULT 80;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS location_description TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS protocol TEXT DEFAULT 'dahua';
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS push_url TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS last_ip TEXT;
    ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS requests_count NUMERIC DEFAULT 0;
END $$;

CREATE INDEX IF NOT EXISTS idx_biometric_devices_inst ON public.biometric_devices (institution_id);
CREATE INDEX IF NOT EXISTS idx_biometric_devices_sn ON public.biometric_devices (serial_number);

-- 3. Table: public.staff_attendance_daily
CREATE TABLE IF NOT EXISTS public.staff_attendance_daily (
    id TEXT PRIMARY KEY DEFAULT ('sad_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
    institution_id TEXT,
    staff_id TEXT,
    attendance_date DATE DEFAULT CURRENT_DATE,
    first_in TIMESTAMPTZ,
    last_out TIMESTAMPTZ,
    total_hours NUMERIC DEFAULT 0,
    overtime_hours NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'present',
    late_minutes NUMERIC DEFAULT 0,
    early_leave_minutes NUMERIC DEFAULT 0,
    punch_count NUMERIC DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "staffId" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "attendanceDate" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "firstIn" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "lastOut" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "totalHours" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "overtimeHours" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "status" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "lateMinutes" NUMERIC DEFAULT 0;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "earlyLeaveMinutes" NUMERIC DEFAULT 0;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "punchCount" NUMERIC DEFAULT 0;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "notes" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
    ALTER TABLE public.staff_attendance_daily ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
END $$;

-- 4. Table: public.biometric_enrollments
CREATE TABLE IF NOT EXISTS public.biometric_enrollments (
    id TEXT PRIMARY KEY DEFAULT ('be_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
    institution_id TEXT,
    staff_id TEXT,
    device_pin TEXT,
    fingerprint_index INTEGER DEFAULT 0,
    fingerprint_template TEXT,
    card_number TEXT,
    face_data TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

DO $$
BEGIN
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "staffId" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "devicePin" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "fingerprintIndex" NUMERIC DEFAULT 0;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "enrolledAt" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;

    -- Ensure institution gateway columns exist
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'institutions') THEN
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}'::jsonb;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kcb_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "kcbConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS mpesa_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "mpesaConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ncba_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "ncbaConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS equity_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "equityConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS im_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "imConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS airtel_money_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "airtelMoneyConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS intasend_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "intasendConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS coop_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "coopConfig" JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS sms_config JSONB;
        ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "smsConfig" JSONB;
    END IF;

    -- Ensure finance_numbering_configs snake_case & camelCase columns exist
    CREATE TABLE IF NOT EXISTS public.finance_numbering_configs (
        id TEXT PRIMARY KEY,
        institution_id TEXT DEFAULT 'GLOBAL',
        "institutionId" TEXT,
        document_type TEXT,
        "documentType" TEXT,
        prefix TEXT DEFAULT 'DOC-',
        next_number INTEGER DEFAULT 1001,
        "nextNumber" NUMERIC DEFAULT 1001,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        "createdAt" TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        "updatedAt" TEXT
    );
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS institution_id TEXT DEFAULT 'GLOBAL';
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS document_type TEXT;
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS "documentType" TEXT;
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS prefix TEXT DEFAULT 'DOC-';
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS next_number INTEGER DEFAULT 1001;
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS "nextNumber" NUMERIC DEFAULT 1001;
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
    ALTER TABLE public.finance_numbering_configs ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
END $$;
