-- Migration / Repair Script: 543_dahua_biometric_device_and_institution_repair.sql
-- Description: Extract device details from raw_data, backfill device_id, and provide re-assignment for Dahua terminals

DO $$
BEGIN
    -- 1. Ensure columns exist on staff_attendance_logs
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_attendance_logs') THEN
        ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS device_id TEXT;
        ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
        ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.staff_attendance_logs ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

        -- 2. Backfill device_id and devicePin from raw_data when Name = 'Door1' or device_pin is Door1
        UPDATE public.staff_attendance_logs
        SET 
            device_id = COALESCE(NULLIF(device_id, ''), NULLIF("deviceId", ''), 'Door1'),
            "deviceId" = COALESCE(NULLIF("deviceId", ''), NULLIF(device_id, ''), 'Door1'),
            device_pin = COALESCE(NULLIF(device_pin, ''), NULLIF("devicePin", ''), 'Door1'),
            "devicePin" = COALESCE(NULLIF("devicePin", ''), NULLIF(device_pin, ''), 'Door1')
        WHERE (device_id IS NULL OR device_id = '' OR "deviceId" IS NULL OR "deviceId" = '')
          AND (raw_data ILIKE '%"Name":"Door1"%' OR raw_data ILIKE '%"Door1"%' OR device_pin = 'Door1');

        -- 3. Sync camelCase institutionId
        UPDATE public.staff_attendance_logs
        SET 
            "institutionId" = COALESCE("institutionId", institution_id),
            institution_id = COALESCE(institution_id, "institutionId")
        WHERE (institution_id IS NULL AND "institutionId" IS NOT NULL)
           OR (institution_id IS NOT NULL AND "institutionId" IS NULL);
    END IF;

    -- 4. Ensure biometric_devices table exists and register Door1 Dahua Terminal if not present
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_devices') THEN
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS institution_id TEXT;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS serial_number TEXT;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS device_name TEXT;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS "deviceName" TEXT;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS protocol TEXT DEFAULT 'dahua';

        -- Auto-seed/register 'Door1' device if not exists
        IF NOT EXISTS (SELECT 1 FROM public.biometric_devices WHERE serial_number = 'Door1' OR id = 'dev_dahua_door1') THEN
            INSERT INTO public.biometric_devices (
                id, institution_id, "institutionId", serial_number, "serialNumber", device_name, "deviceName", device_model, protocol, is_active, last_sync_at
            )
            SELECT 
                'dev_dahua_door1', 
                institution_id, 
                institution_id, 
                'Door1', 
                'Door1', 
                'Dahua Face Terminal (Door 1)', 
                'Dahua Face Terminal (Door 1)', 
                'Dahua Facial Recognition Terminal', 
                'dahua', 
                true, 
                NOW()
            FROM public.staff_attendance_logs
            WHERE raw_data ILIKE '%Door1%' AND institution_id IS NOT NULL
            ORDER BY created_at DESC
            LIMIT 1;
        END IF;
    END IF;
END $$;
