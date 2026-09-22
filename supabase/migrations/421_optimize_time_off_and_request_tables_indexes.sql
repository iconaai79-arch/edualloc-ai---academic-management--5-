-- Migration 421: Optimize time_off_requests and related request tables indexes
-- Purpose: Accelerate time_off_requests, student_absence_requests, absence_requests, leave_requests, requisitions, bulletin_items, and document_collections.
-- Eliminates PostgREST query chunk statement timeouts on 'time_off_requests'.

DO $$
BEGIN
    -- 1. Ensure public.time_off_requests table exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'time_off_requests'
    ) THEN
        CREATE TABLE public.time_off_requests (
            id                      TEXT PRIMARY KEY,
            institution_id          TEXT NOT NULL,
            "institutionId"         TEXT,
            lecturer_id             TEXT,
            "lecturerId"            TEXT,
            user_id                 TEXT,
            "userId"                TEXT,
            category                TEXT DEFAULT 'Personal',
            start_date              DATE,
            "startDate"             TEXT,
            end_date                DATE,
            "endDate"               TEXT,
            is_full_day             BOOLEAN DEFAULT TRUE,
            "isFullDay"             BOOLEAN DEFAULT TRUE,
            start_time              TIME,
            "startTime"             TEXT,
            end_time                TIME,
            "endTime"               TEXT,
            reason                  TEXT,
            supporting_document_url TEXT,
            "supportingDocumentUrl" TEXT,
            status                  TEXT DEFAULT 'pending',
            timestamp               TIMESTAMPTZ DEFAULT NOW(),
            created_at              TIMESTAMPTZ DEFAULT NOW(),
            updated_at              TIMESTAMPTZ DEFAULT NOW()
        );
        ALTER TABLE public.time_off_requests ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "time_off_requests_all" ON public.time_off_requests;
        CREATE POLICY "time_off_requests_all" ON public.time_off_requests FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.time_off_requests TO anon, authenticated, service_role;
    END IF;

    -- Ensure institution_id, created_at, timestamp exist on time_off_requests
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'time_off_requests'
    ) THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'time_off_requests' AND column_name = 'created_at'
        ) THEN
            ALTER TABLE public.time_off_requests ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'time_off_requests' AND column_name = 'institution_id'
        ) THEN
            ALTER TABLE public.time_off_requests ADD COLUMN institution_id TEXT;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'time_off_requests' AND column_name = 'timestamp'
        ) THEN
            ALTER TABLE public.time_off_requests ADD COLUMN timestamp TIMESTAMPTZ DEFAULT NOW();
        END IF;

        -- Composite indexes for time_off_requests
        CREATE INDEX IF NOT EXISTS idx_time_off_requests_institution 
            ON public.time_off_requests (institution_id);
        CREATE INDEX IF NOT EXISTS idx_time_off_requests_inst_id_composite 
            ON public.time_off_requests (institution_id, id DESC);
        CREATE INDEX IF NOT EXISTS idx_time_off_requests_inst_created_at 
            ON public.time_off_requests (institution_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_time_off_requests_inst_status 
            ON public.time_off_requests (institution_id, status);
    END IF;

    -- 2. Indexes on student_absence_requests
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'student_absence_requests'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'student_absence_requests' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_student_absence_requests_institution 
                ON public.student_absence_requests (institution_id);
            CREATE INDEX IF NOT EXISTS idx_student_absence_requests_inst_id_composite 
                ON public.student_absence_requests (institution_id, id DESC);
        END IF;
    END IF;

    -- 3. Indexes on absence_requests
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'absence_requests'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'absence_requests' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_absence_requests_institution 
                ON public.absence_requests (institution_id);
            CREATE INDEX IF NOT EXISTS idx_absence_requests_inst_id_composite 
                ON public.absence_requests (institution_id, id DESC);
        END IF;
    END IF;

    -- 4. Indexes on requisitions
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'requisitions'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'requisitions' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_requisitions_institution 
                ON public.requisitions (institution_id);
            CREATE INDEX IF NOT EXISTS idx_requisitions_inst_id_composite 
                ON public.requisitions (institution_id, id DESC);
        END IF;
    END IF;

    -- 5. Indexes on bulletin_items
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'bulletin_items'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'bulletin_items' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_bulletin_items_institution 
                ON public.bulletin_items (institution_id);
            CREATE INDEX IF NOT EXISTS idx_bulletin_items_inst_id_composite 
                ON public.bulletin_items (institution_id, id DESC);
        END IF;
    END IF;

    -- 6. Indexes on document_collections
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'document_collections'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'document_collections' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_document_collections_institution 
                ON public.document_collections (institution_id);
            CREATE INDEX IF NOT EXISTS idx_document_collections_inst_id_composite 
                ON public.document_collections (institution_id, id DESC);
        END IF;
    END IF;

    -- 7. Indexes on appointments
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'appointments'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_appointments_institution 
                ON public.appointments (institution_id);
            CREATE INDEX IF NOT EXISTS idx_appointments_inst_id_composite 
                ON public.appointments (institution_id, id DESC);
        END IF;
    END IF;

    -- 8. Indexes on leave_requests
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'leave_requests'
    ) THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' AND table_name = 'leave_requests' AND column_name = 'institution_id'
        ) THEN
            CREATE INDEX IF NOT EXISTS idx_leave_requests_institution 
                ON public.leave_requests (institution_id);
            CREATE INDEX IF NOT EXISTS idx_leave_requests_inst_id_composite 
                ON public.leave_requests (institution_id, id DESC);
        END IF;
    END IF;
END $$;

NOTIFY pgrst, 'reload schema';
