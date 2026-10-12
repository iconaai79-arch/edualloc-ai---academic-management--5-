-- ============================================================
-- Migration 473: Create Employee Documents Table
-- Allows HR to manage contracts, credentials, IDs, and statutory files
-- ============================================================

CREATE TABLE IF NOT EXISTS public.employee_documents (
    id                  TEXT PRIMARY KEY,
    institution_id      TEXT NOT NULL,
    "institutionId"     TEXT,
    user_id             TEXT NOT NULL,
    "userId"            TEXT,
    
    -- Document metadata
    name                TEXT NOT NULL,
    category            TEXT NOT NULL DEFAULT 'other',
    file_url            TEXT NOT NULL,
    "fileUrl"           TEXT,
    file_name           TEXT,
    "fileName"          TEXT,
    file_size           TEXT,
    "fileSize"          TEXT,
    file_type           TEXT,
    "fileType"          TEXT,
    
    -- Expiry and compliance
    expiry_date         TEXT,
    "expiryDate"        TEXT,
    notes               TEXT,
    uploaded_by         TEXT,
    "uploadedBy"        TEXT,
    status              TEXT DEFAULT 'active',
    
    -- Timestamps
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_employee_documents_inst_user
    ON public.employee_documents(institution_id, user_id);

CREATE INDEX IF NOT EXISTS idx_employee_documents_category
    ON public.employee_documents(category);

CREATE INDEX IF NOT EXISTS idx_employee_documents_expiry
    ON public.employee_documents(expiry_date);

-- Enable RLS
ALTER TABLE public.employee_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employee_documents_select" ON public.employee_documents;
DROP POLICY IF EXISTS "employee_documents_all" ON public.employee_documents;

CREATE POLICY "employee_documents_select" ON public.employee_documents
    FOR SELECT TO authenticated, anon
    USING (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    );

CREATE POLICY "employee_documents_all" ON public.employee_documents
    FOR ALL TO authenticated, anon
    USING (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    )
    WITH CHECK (
        institution_id::text = public.get_curr_user_inst_id()::text 
        OR public.get_curr_user_role()::text = 'super_admin' 
        OR public.get_curr_user_inst_id() IS NULL
    );

-- Refresh planner statistics & schema cache
ANALYZE public.employee_documents;
NOTIFY pgrst, 'reload schema';

