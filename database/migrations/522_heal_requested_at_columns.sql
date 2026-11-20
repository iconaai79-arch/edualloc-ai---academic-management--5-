-- Migration 522: Heal requested_at and requestedAt columns across request tables
-- Description: Ensures requested_at and requestedAt exist on all request tables (demo_requests, commission_withdrawal_requests, extension_requests, institution_extension_requests)
-- Type-safe: zero mixed-type COALESCE statements, zero DO $$ blocks. 100% web importer compatible.

-- 1. demo_requests table & columns
CREATE TABLE IF NOT EXISTS public.demo_requests (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    institution TEXT,
    phone TEXT,
    message TEXT,
    status TEXT DEFAULT 'new',
    source TEXT DEFAULT 'Web Landing Page',
    conversation_transcript JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    quote_amount NUMERIC(12,2) DEFAULT 0.00,
    payment_status TEXT DEFAULT 'unpaid',
    requested_at TIMESTAMPTZ DEFAULT NOW(),
    "requestedAt" TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.demo_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

UPDATE public.demo_requests 
SET requested_at = CASE 
    WHEN "requestedAt"::text ~ '^\d{4}-\d{2}-\d{2}' THEN "requestedAt"::text::timestamptz
    ELSE NOW()
END
WHERE requested_at IS NULL;

-- 2. commission_withdrawal_requests table & columns
CREATE TABLE IF NOT EXISTS public.commission_withdrawal_requests (
    id TEXT PRIMARY KEY,
    reseller_id TEXT,
    reseller_name TEXT,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requestedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMPTZ,
    notes TEXT,
    account_details TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.commission_withdrawal_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE public.commission_withdrawal_requests 
SET requested_at = CASE 
    WHEN "requestedAt"::text ~ '^\d{4}-\d{2}-\d{2}' THEN "requestedAt"::text::timestamptz
    ELSE NOW()
END
WHERE requested_at IS NULL;

-- 3. extension_requests table & columns
CREATE TABLE IF NOT EXISTS public.extension_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    due_date DATE,
    institution_id TEXT,
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "requestedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.extension_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.extension_requests ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.extension_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE public.extension_requests 
SET requested_at = CASE 
    WHEN "requestedAt"::text ~ '^\d{4}-\d{2}-\d{2}' THEN "requestedAt"::text::timestamptz
    ELSE NOW()
END
WHERE requested_at IS NULL;

-- 4. institution_extension_requests table & columns
CREATE TABLE IF NOT EXISTS public.institution_extension_requests (
    id TEXT PRIMARY KEY,
    institution_id TEXT,
    requester_id TEXT,
    reason TEXT,
    status TEXT DEFAULT 'pending',
    requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    "requestedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.institution_extension_requests ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.institution_extension_requests ADD COLUMN IF NOT EXISTS "requestedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.institution_extension_requests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

UPDATE public.institution_extension_requests 
SET requested_at = CASE 
    WHEN "requestedAt"::text ~ '^\d{4}-\d{2}-\d{2}' THEN "requestedAt"::text::timestamptz
    ELSE NOW()
END
WHERE requested_at IS NULL;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_demo_requests_requested_at ON public.demo_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_cwr_requested_at ON public.commission_withdrawal_requests(requested_at DESC);

-- 6. Reload schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
