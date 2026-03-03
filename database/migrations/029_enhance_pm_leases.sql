-- Migration: 029_enhance_pm_leases
-- Description: Adds comprehensive lease fields for legal and utility tracking.

ALTER TABLE pm_leases
ADD COLUMN IF NOT EXISTS terms_and_conditions TEXT,
ADD COLUMN IF NOT EXISTS utilities_included TEXT[],
ADD COLUMN IF NOT EXISTS late_fee_percentage DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS notice_period_days INTEGER,
ADD COLUMN IF NOT EXISTS witness_name TEXT,
ADD COLUMN IF NOT EXISTS witness_phone TEXT;
