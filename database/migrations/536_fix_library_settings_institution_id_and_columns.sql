-- Migration 536: Ensure library_settings has institution_id Primary Key and CamelCase Compatibility Columns
-- Resolves: "ERROR: column "institutionId" of relation "library_settings" does not exist"

DO $$
BEGIN
    -- 1. Ensure table library_settings exists
    CREATE TABLE IF NOT EXISTS public.library_settings (
        institution_id TEXT PRIMARY KEY,
        overdue_fine_per_day DECIMAL(10,2) DEFAULT 0,
        max_books_per_user INTEGER DEFAULT 3,
        reservation_expiry_days INTEGER DEFAULT 3,
        default_lending_period_days INTEGER DEFAULT 14,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Add institution_id column if somehow missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'library_settings' AND column_name = 'institution_id'
    ) THEN
        ALTER TABLE public.library_settings ADD COLUMN institution_id TEXT;
    END IF;

    -- 3. Ensure PRIMARY KEY constraint exists on library_settings(institution_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.library_settings'::regclass AND contype = 'p'
    ) THEN
        BEGIN
            ALTER TABLE public.library_settings ADD PRIMARY KEY (institution_id);
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;
    END IF;

    -- 4. Add alias / compatibility columns matching client-side TypeScript types
    ALTER TABLE public.library_settings ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
    ALTER TABLE public.library_settings ADD COLUMN IF NOT EXISTS "overdueFinePerDay" DECIMAL(10,2) DEFAULT 0;
    ALTER TABLE public.library_settings ADD COLUMN IF NOT EXISTS "maxBooksPerUser" INTEGER DEFAULT 3;
    ALTER TABLE public.library_settings ADD COLUMN IF NOT EXISTS "reservationExpiryDays" INTEGER DEFAULT 3;
    ALTER TABLE public.library_settings ADD COLUMN IF NOT EXISTS "defaultLendingPeriodDays" INTEGER DEFAULT 14;
    ALTER TABLE public.library_settings ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

    -- 5. Backfill any existing rows
    UPDATE public.library_settings 
    SET 
        "institutionId" = COALESCE("institutionId", institution_id),
        institution_id = COALESCE(institution_id, "institutionId"),
        "overdueFinePerDay" = COALESCE("overdueFinePerDay", overdue_fine_per_day),
        overdue_fine_per_day = COALESCE(overdue_fine_per_day, "overdueFinePerDay"),
        "maxBooksPerUser" = COALESCE("maxBooksPerUser", max_books_per_user),
        max_books_per_user = COALESCE(max_books_per_user, "maxBooksPerUser"),
        "reservationExpiryDays" = COALESCE("reservationExpiryDays", reservation_expiry_days),
        reservation_expiry_days = COALESCE(reservation_expiry_days, "reservationExpiryDays"),
        "defaultLendingPeriodDays" = COALESCE("defaultLendingPeriodDays", default_lending_period_days),
        default_lending_period_days = COALESCE(default_lending_period_days, "defaultLendingPeriodDays"),
        "updatedAt" = COALESCE("updatedAt", updated_at),
        updated_at = COALESCE(updated_at, "updatedAt")
    WHERE institution_id IS NOT NULL OR "institutionId" IS NOT NULL;
END $$;

-- 6. Trigger to automatically keep camelCase and snake_case columns in sync
CREATE OR REPLACE FUNCTION public.sync_library_settings_columns()
RETURNS TRIGGER AS $$
BEGIN
    -- Synchronize institution_id <-> "institutionId"
    IF NEW.institution_id IS NULL AND NEW."institutionId" IS NOT NULL THEN
        NEW.institution_id := NEW."institutionId";
    ELSIF NEW."institutionId" IS NULL AND NEW.institution_id IS NOT NULL THEN
        NEW."institutionId" := NEW.institution_id;
    END IF;

    -- Synchronize overdue_fine_per_day <-> "overdueFinePerDay"
    IF NEW.overdue_fine_per_day IS NULL AND NEW."overdueFinePerDay" IS NOT NULL THEN
        NEW.overdue_fine_per_day := NEW."overdueFinePerDay";
    ELSIF NEW."overdueFinePerDay" IS NULL AND NEW.overdue_fine_per_day IS NOT NULL THEN
        NEW."overdueFinePerDay" := NEW.overdue_fine_per_day;
    END IF;

    -- Synchronize max_books_per_user <-> "maxBooksPerUser"
    IF NEW.max_books_per_user IS NULL AND NEW."maxBooksPerUser" IS NOT NULL THEN
        NEW.max_books_per_user := NEW."maxBooksPerUser";
    ELSIF NEW."maxBooksPerUser" IS NULL AND NEW.max_books_per_user IS NOT NULL THEN
        NEW."maxBooksPerUser" := NEW.max_books_per_user;
    END IF;

    -- Synchronize reservation_expiry_days <-> "reservationExpiryDays"
    IF NEW.reservation_expiry_days IS NULL AND NEW."reservationExpiryDays" IS NOT NULL THEN
        NEW.reservation_expiry_days := NEW."reservationExpiryDays";
    ELSIF NEW."reservationExpiryDays" IS NULL AND NEW.reservation_expiry_days IS NOT NULL THEN
        NEW."reservationExpiryDays" := NEW.reservation_expiry_days;
    END IF;

    -- Synchronize default_lending_period_days <-> "defaultLendingPeriodDays"
    IF NEW.default_lending_period_days IS NULL AND NEW."defaultLendingPeriodDays" IS NOT NULL THEN
        NEW.default_lending_period_days := NEW."defaultLendingPeriodDays";
    ELSIF NEW."defaultLendingPeriodDays" IS NULL AND NEW.default_lending_period_days IS NOT NULL THEN
        NEW."defaultLendingPeriodDays" := NEW.default_lending_period_days;
    END IF;

    -- Synchronize updated_at <-> "updatedAt"
    IF NEW.updated_at IS NULL AND NEW."updatedAt" IS NOT NULL THEN
        NEW.updated_at := NEW."updatedAt";
    ELSIF NEW."updatedAt" IS NULL AND NEW.updated_at IS NOT NULL THEN
        NEW."updatedAt" := NEW.updated_at;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_library_settings_columns ON public.library_settings;
CREATE TRIGGER trg_sync_library_settings_columns
BEFORE INSERT OR UPDATE ON public.library_settings
FOR EACH ROW EXECUTE FUNCTION public.sync_library_settings_columns();

NOTIFY pgrst, 'reload schema';
