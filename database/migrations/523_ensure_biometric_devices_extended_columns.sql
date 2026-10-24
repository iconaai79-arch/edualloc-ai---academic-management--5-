-- Migration 523: Ensure biometric_devices extended columns and indexes
-- Resolves: "[api/records] Schema cache stale: stripping un-cached column 'port' for [biometric_devices]"

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'biometric_devices') THEN
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS port INT DEFAULT 4370;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS comm_key INT DEFAULT 0;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS firmware_version VARCHAR(100);
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS user_count INT DEFAULT 0;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS fp_count INT DEFAULT 0;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS face_count INT DEFAULT 0;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS log_count INT DEFAULT 0;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS last_heartbeat TIMESTAMPTZ;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'offline';
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS requests_count INT DEFAULT 0;
        ALTER TABLE public.biometric_devices ADD COLUMN IF NOT EXISTS last_ip VARCHAR(50);
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
