-- Migration 548: Fix biometric_enrollments columns & bidirectional synchronization
-- Resolves PostgreSQL error 42703 (undefined_column: column "staff_id" does not exist / "Perhaps you meant to reference the column biometric_enrollments.staffId")

DO $$
BEGIN
    -- 1. Ensure table exists
    CREATE TABLE IF NOT EXISTS public.biometric_enrollments (
        id TEXT PRIMARY KEY DEFAULT ('be_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)),
        institution_id TEXT,
        "institutionId" TEXT,
        staff_id TEXT,
        "staffId" TEXT,
        device_pin TEXT,
        "devicePin" TEXT,
        fingerprint_index INTEGER DEFAULT 0,
        "fingerprintIndex" INTEGER DEFAULT 0,
        fingerprint_template TEXT,
        "fingerprintTemplate" TEXT,
        card_number TEXT,
        "cardNumber" TEXT,
        face_data TEXT,
        "faceData" TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        "isActive" BOOLEAN DEFAULT TRUE,
        enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "enrolledAt" TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Add both snake_case and quoted camelCase columns to existing table
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS institution_id TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS staff_id TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "staffId" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS device_pin TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "devicePin" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS fingerprint_index INTEGER DEFAULT 0;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "fingerprintIndex" INTEGER DEFAULT 0;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS fingerprint_template TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "fingerprintTemplate" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS card_number TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "cardNumber" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS face_data TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "faceData" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT TRUE;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS enrolled_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "enrolledAt" TEXT;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE public.biometric_enrollments ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

    -- 3. Synchronize existing data between camelCase and snake_case
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_enrollments' AND column_name = 'staffId') THEN
        UPDATE public.biometric_enrollments SET staff_id = "staffId" WHERE (staff_id IS NULL OR staff_id = '') AND "staffId" IS NOT NULL AND "staffId" <> '';
        UPDATE public.biometric_enrollments SET "staffId" = staff_id WHERE ("staffId" IS NULL OR "staffId" = '') AND staff_id IS NOT NULL AND staff_id <> '';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_enrollments' AND column_name = 'institutionId') THEN
        UPDATE public.biometric_enrollments SET institution_id = "institutionId" WHERE (institution_id IS NULL OR institution_id = '') AND "institutionId" IS NOT NULL AND "institutionId" <> '';
        UPDATE public.biometric_enrollments SET "institutionId" = institution_id WHERE ("institutionId" IS NULL OR "institutionId" = '') AND institution_id IS NOT NULL AND institution_id <> '';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_enrollments' AND column_name = 'devicePin') THEN
        UPDATE public.biometric_enrollments SET device_pin = "devicePin" WHERE (device_pin IS NULL OR device_pin = '') AND "devicePin" IS NOT NULL AND "devicePin" <> '';
        UPDATE public.biometric_enrollments SET "devicePin" = device_pin WHERE ("devicePin" IS NULL OR "devicePin" = '') AND device_pin IS NOT NULL AND device_pin <> '';
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_enrollments' AND column_name = 'isActive') THEN
        UPDATE public.biometric_enrollments SET is_active = "isActive" WHERE is_active IS NULL AND "isActive" IS NOT NULL;
        UPDATE public.biometric_enrollments SET "isActive" = is_active WHERE "isActive" IS NULL AND is_active IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_enrollments' AND column_name = 'fingerprintIndex') THEN
        UPDATE public.biometric_enrollments SET fingerprint_index = "fingerprintIndex" WHERE fingerprint_index IS NULL AND "fingerprintIndex" IS NOT NULL;
        UPDATE public.biometric_enrollments SET "fingerprintIndex" = fingerprint_index WHERE "fingerprintIndex" IS NULL AND fingerprint_index IS NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'biometric_enrollments' AND column_name = 'cardNumber') THEN
        UPDATE public.biometric_enrollments SET card_number = "cardNumber" WHERE (card_number IS NULL OR card_number = '') AND "cardNumber" IS NOT NULL AND "cardNumber" <> '';
        UPDATE public.biometric_enrollments SET "cardNumber" = card_number WHERE ("cardNumber" IS NULL OR "cardNumber" = '') AND card_number IS NOT NULL AND card_number <> '';
    END IF;
END $$;

-- 4. Create trigger to keep camelCase and snake_case in sync on every INSERT or UPDATE
CREATE OR REPLACE FUNCTION public.sync_biometric_enrollments_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchronize staff_id <-> "staffId"
    IF NEW.staff_id IS NOT NULL AND (NEW."staffId" IS NULL OR NEW."staffId" = '') THEN
        NEW."staffId" := NEW.staff_id;
    ELSIF NEW."staffId" IS NOT NULL AND (NEW.staff_id IS NULL OR NEW.staff_id = '') THEN
        NEW.staff_id := NEW."staffId";
    END IF;

    -- Synchronize institution_id <-> "institutionId"
    IF NEW.institution_id IS NOT NULL AND (NEW."institutionId" IS NULL OR NEW."institutionId" = '') THEN
        NEW."institutionId" := NEW.institution_id;
    ELSIF NEW."institutionId" IS NOT NULL AND (NEW.institution_id IS NULL OR NEW.institution_id = '') THEN
        NEW.institution_id := NEW."institutionId";
    END IF;

    -- Synchronize device_pin <-> "devicePin"
    IF NEW.device_pin IS NOT NULL AND (NEW."devicePin" IS NULL OR NEW."devicePin" = '') THEN
        NEW."devicePin" := NEW.device_pin;
    ELSIF NEW."devicePin" IS NOT NULL AND (NEW.device_pin IS NULL OR NEW.device_pin = '') THEN
        NEW.device_pin := NEW."devicePin";
    END IF;

    -- Synchronize is_active <-> "isActive"
    IF NEW.is_active IS NOT NULL AND NEW."isActive" IS NULL THEN
        NEW."isActive" := NEW.is_active;
    ELSIF NEW."isActive" IS NOT NULL AND NEW.is_active IS NULL THEN
        NEW.is_active := NEW."isActive";
    END IF;

    -- Synchronize fingerprint_index <-> "fingerprintIndex"
    IF NEW.fingerprint_index IS NOT NULL AND NEW."fingerprintIndex" IS NULL THEN
        NEW."fingerprintIndex" := NEW.fingerprint_index;
    ELSIF NEW."fingerprintIndex" IS NOT NULL AND NEW.fingerprint_index IS NULL THEN
        NEW.fingerprint_index := NEW."fingerprintIndex";
    END IF;

    -- Synchronize card_number <-> "cardNumber"
    IF NEW.card_number IS NOT NULL AND (NEW."cardNumber" IS NULL OR NEW."cardNumber" = '') THEN
        NEW."cardNumber" := NEW.card_number;
    ELSIF NEW."cardNumber" IS NOT NULL AND (NEW.card_number IS NULL OR NEW.card_number = '') THEN
        NEW.card_number := NEW."cardNumber";
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_biometric_enrollments ON public.biometric_enrollments;
CREATE TRIGGER trg_sync_biometric_enrollments
BEFORE INSERT OR UPDATE ON public.biometric_enrollments
FOR EACH ROW
EXECUTE FUNCTION public.sync_biometric_enrollments_columns();

-- 5. Create helpful indices
CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_staff_id ON public.biometric_enrollments(staff_id);
CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_institution_id ON public.biometric_enrollments(institution_id);
CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_device_pin ON public.biometric_enrollments(device_pin);
CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_staff_id_quoted ON public.biometric_enrollments("staffId");
CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_inst_id_quoted ON public.biometric_enrollments("institutionId");
CREATE INDEX IF NOT EXISTS idx_biometric_enrollments_pin_quoted ON public.biometric_enrollments("devicePin");
