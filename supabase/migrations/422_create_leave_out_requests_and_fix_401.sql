-- Migration 422: Create leave_out_requests table and fix 401 Unauthorized
-- Purpose: The leave_out_requests table is used by StudentLeaveOutManager,
--          ParentView, BoardingMasterView, SupportStaffViews, SuperAdminView
--          and App.tsx but had no migration, causing PostgREST to respond with
--          401 for any anon/authenticated fetch or upsert.
--          Also covers fee_goods_proposals which ships in the same module.

DO $$
BEGIN
    -- ─────────────────────────────────────────────────────────────────────────
    -- 1. leave_out_requests
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'leave_out_requests'
    ) THEN
        CREATE TABLE public.leave_out_requests (
            id                          TEXT PRIMARY KEY,
            institution_id              TEXT NOT NULL,
            "institutionId"             TEXT,
            student_id                  TEXT,
            "studentId"                 TEXT,
            class_teacher_id            TEXT,
            "classTeacherId"            TEXT,
            headteacher_id              TEXT,
            "headteacherId"             TEXT,
            headteacher_approved_at     TEXT,
            "headteacherApprovedAt"     TEXT,
            headteacher_remarks         TEXT,
            "headteacherRemarks"        TEXT,
            approved_by                 TEXT,
            "approvedBy"                TEXT,
            approved_by_role            TEXT,
            "approvedByRole"            TEXT,
            parent_notified_at          TEXT,
            "parentNotifiedAt"          TEXT,
            boarding_master_id          TEXT,
            "boardingMasterId"          TEXT,
            security_id                 TEXT,
            "securityId"               TEXT,
            reason                      TEXT,
            leave_date                  TEXT,
            "leaveDate"                 TEXT,
            return_date                 TEXT,
            "returnDate"                TEXT,
            status                      TEXT DEFAULT 'pending',
            sheet_url                   TEXT,
            "sheetUrl"                  TEXT,
            house_checked_out_at        TEXT,
            "houseCheckedOutAt"         TEXT,
            gate_checked_out_at         TEXT,
            "gateCheckedOutAt"          TEXT,
            home_arrival_at             TEXT,
            "homeArrivalAt"             TEXT,
            home_departure_at           TEXT,
            "homeDepartureAt"           TEXT,
            metadata                    JSONB DEFAULT '{}'::jsonb,
            created_at                  TIMESTAMPTZ DEFAULT NOW(),
            "createdAt"                 TEXT,
            updated_at                  TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt"                 TEXT
        );
        ALTER TABLE public.leave_out_requests ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "leave_out_requests_all" ON public.leave_out_requests;
        CREATE POLICY "leave_out_requests_all" ON public.leave_out_requests
            FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.leave_out_requests TO anon, authenticated, service_role;
    ELSE
        -- Table already exists — ensure RLS + grants are correct and add any
        -- columns that might be missing from older installs.
        ALTER TABLE public.leave_out_requests ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "leave_out_requests_all" ON public.leave_out_requests;
        CREATE POLICY "leave_out_requests_all" ON public.leave_out_requests
            FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.leave_out_requests TO anon, authenticated, service_role;

        -- Backfill essential columns (safe to add; idempotent)
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'institution_id') THEN
            ALTER TABLE public.leave_out_requests ADD COLUMN institution_id TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'approved_by_role') THEN
            ALTER TABLE public.leave_out_requests ADD COLUMN approved_by_role TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'headteacher_approved_at') THEN
            ALTER TABLE public.leave_out_requests ADD COLUMN headteacher_approved_at TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'house_checked_out_at') THEN
            ALTER TABLE public.leave_out_requests ADD COLUMN house_checked_out_at TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'gate_checked_out_at') THEN
            ALTER TABLE public.leave_out_requests ADD COLUMN gate_checked_out_at TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'home_arrival_at') THEN
            ALTER TABLE public.leave_out_requests ADD COLUMN home_arrival_at TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'home_departure_at') THEN
            ALTER TABLE public.leave_out_requests ADD COLUMN home_departure_at TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'metadata') THEN
            ALTER TABLE public.leave_out_requests ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
        END IF;
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- 2. Composite indexes on leave_out_requests
    -- ─────────────────────────────────────────────────────────────────────────
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'institution_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_leave_out_requests_institution
            ON public.leave_out_requests (institution_id);
        CREATE INDEX IF NOT EXISTS idx_leave_out_requests_inst_created_at
            ON public.leave_out_requests (institution_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_leave_out_requests_inst_id_composite
            ON public.leave_out_requests (institution_id, id DESC);
        CREATE INDEX IF NOT EXISTS idx_leave_out_requests_inst_status
            ON public.leave_out_requests (institution_id, status);
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'leave_out_requests' AND column_name = 'student_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_leave_out_requests_student
            ON public.leave_out_requests (student_id);
    END IF;

    -- ─────────────────────────────────────────────────────────────────────────
    -- 3. fee_goods_proposals (same boarding module — fix 401 while we're here)
    -- ─────────────────────────────────────────────────────────────────────────
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'fee_goods_proposals'
    ) THEN
        CREATE TABLE public.fee_goods_proposals (
            id              TEXT PRIMARY KEY,
            institution_id  TEXT NOT NULL,
            "institutionId" TEXT,
            student_id      TEXT,
            "studentId"     TEXT,
            item_name       TEXT,
            "itemName"      TEXT,
            quantity        NUMERIC DEFAULT 1,
            unit            TEXT,
            unit_value      NUMERIC DEFAULT 0,
            "unitValue"     NUMERIC DEFAULT 0,
            total_value     NUMERIC DEFAULT 0,
            "totalValue"    NUMERIC DEFAULT 0,
            status          TEXT DEFAULT 'pending',
            notes           TEXT,
            metadata        JSONB DEFAULT '{}'::jsonb,
            created_at      TIMESTAMPTZ DEFAULT NOW(),
            "createdAt"     TEXT,
            updated_at      TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt"     TEXT
        );
        ALTER TABLE public.fee_goods_proposals ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "fee_goods_proposals_all" ON public.fee_goods_proposals;
        CREATE POLICY "fee_goods_proposals_all" ON public.fee_goods_proposals
            FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.fee_goods_proposals TO anon, authenticated, service_role;
    ELSE
        ALTER TABLE public.fee_goods_proposals ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "fee_goods_proposals_all" ON public.fee_goods_proposals;
        CREATE POLICY "fee_goods_proposals_all" ON public.fee_goods_proposals
            FOR ALL USING (true) WITH CHECK (true);
        GRANT ALL ON public.fee_goods_proposals TO anon, authenticated, service_role;
    END IF;

    -- Indexes on fee_goods_proposals
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'fee_goods_proposals' AND column_name = 'institution_id'
    ) THEN
        CREATE INDEX IF NOT EXISTS idx_fee_goods_proposals_institution
            ON public.fee_goods_proposals (institution_id);
        CREATE INDEX IF NOT EXISTS idx_fee_goods_proposals_inst_id_composite
            ON public.fee_goods_proposals (institution_id, id DESC);
    END IF;

END $$;

NOTIFY pgrst, 'reload schema';
