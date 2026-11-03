-- Migration 538: Alter his_lab_requests.results to TEXT
-- Resolves: ERROR: invalid input syntax for type json (Token "Hb" is invalid)

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'his_lab_requests'
    ) THEN
        -- Alter results column from JSON/JSONB to TEXT so both plain text reports and structured strings are accepted
        BEGIN
            ALTER TABLE public.his_lab_requests ALTER COLUMN results DROP DEFAULT;
            ALTER TABLE public.his_lab_requests ALTER COLUMN results TYPE TEXT USING results::text;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Ensure camelCase compatibility column "results" also exists as TEXT if needed
        BEGIN
            ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "results" TEXT;
        EXCEPTION WHEN OTHERS THEN
            NULL;
        END;

        -- Also ensure other compatibility columns exist for full dump import resilience
        ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "patientId" TEXT;
        ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
        ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "requestedBy" TEXT;
        ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "testType" TEXT;
        ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "clinicalNotes" TEXT;
        ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "technicianId" TEXT;
        ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "recordedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        ALTER TABLE public.his_lab_requests ADD COLUMN IF NOT EXISTS "completedAt" TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;
