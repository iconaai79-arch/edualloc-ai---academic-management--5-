-- Migration 450: Optimize Commission Withdrawal Requests Indexes and Performance
-- Description: Adds missing columns (such as institution_id) and composite ordering indexes to eliminate statement timeouts (57014) on commission_withdrawal_requests.

-- 1. Ensure table and all queryable columns exist
CREATE TABLE IF NOT EXISTS public.commission_withdrawal_requests (
    id TEXT PRIMARY KEY,
    reseller_id TEXT NOT NULL,
    reseller_name TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    notes TEXT,
    account_details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS reseller_id TEXT;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS reseller_name TEXT;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0.00;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS account_details TEXT;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- 2. Composite and Single-Column Indexes for Order-by & Range Scans
CREATE INDEX IF NOT EXISTS idx_cwr_reseller_id ON public.commission_withdrawal_requests(reseller_id);
CREATE INDEX IF NOT EXISTS idx_cwr_institution_id ON public.commission_withdrawal_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_cwr_status ON public.commission_withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_cwr_requested_at ON public.commission_withdrawal_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_cwr_created_at ON public.commission_withdrawal_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cwr_id_desc ON public.commission_withdrawal_requests(id DESC);

-- Composite indexes matching queries with (WHERE reseller_id = $1 ORDER BY requested_at DESC)
CREATE INDEX IF NOT EXISTS idx_cwr_reseller_requested ON public.commission_withdrawal_requests(reseller_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_cwr_inst_requested ON public.commission_withdrawal_requests(institution_id, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_cwr_status_requested ON public.commission_withdrawal_requests(status, requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_cwr_reseller_status ON public.commission_withdrawal_requests(reseller_id, status);

-- 3. Update Statistics for Query Planner
ANALYZE public.commission_withdrawal_requests;
