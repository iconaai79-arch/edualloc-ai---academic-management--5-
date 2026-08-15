-- ============================================================
-- Migration 314: Leave Requests Table
-- Creates leave_requests table with RLS, soft foreign references,
-- and dual case support for frontend/backend flexibility.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,
    
    -- Applicant references
    user_id             TEXT,
    "userId"            TEXT,
    staff_id            TEXT,
    "staffId"           TEXT,
    student_id          TEXT,
    "studentId"         TEXT,
    applicant_name      TEXT,
    "applicantName"     TEXT,
    
    -- Leave details
    leave_type          TEXT NOT NULL DEFAULT 'Annual', -- Sick, Annual, Maternity, Paternity, Study, Other
    type                TEXT, -- alias for leave_type
    "leaveType"         TEXT,
    start_date          DATE,
    "startDate"         TEXT,
    end_date            DATE,
    "endDate"           TEXT,
    days                INTEGER DEFAULT 1,
    reason              TEXT,
    
    -- Approval workflow
    status              TEXT NOT NULL DEFAULT 'pending', -- pending, approved, rejected, cancelled
    approved_by         TEXT,
    "approvedBy"        TEXT,
    approved_at         TIMESTAMPTZ,
    "approvedAt"        TIMESTAMPTZ,
    rejection_reason    TEXT,
    "rejectionReason"   TEXT,
    
    -- Timestamps
    applied_at          TIMESTAMPTZ DEFAULT NOW(),
    "appliedAt"         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast filtering
CREATE INDEX IF NOT EXISTS idx_leave_requests_institution
    ON public.leave_requests (institution_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_staff
    ON public.leave_requests (staff_id);

CREATE INDEX IF NOT EXISTS idx_leave_requests_status
    ON public.leave_requests (status);

CREATE INDEX IF NOT EXISTS idx_leave_requests_dates
    ON public.leave_requests (start_date, end_date);

-- RLS
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "leave_requests_all" ON public.leave_requests;
CREATE POLICY "leave_requests_all" ON public.leave_requests
    FOR ALL USING (true) WITH CHECK (true);

-- Permissions
GRANT ALL ON public.leave_requests TO anon, authenticated, service_role;
