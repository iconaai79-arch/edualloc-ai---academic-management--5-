-- Migration: 245_create_pm_invoices
-- Description: Creates the missing pm_invoices table for property management billing.

CREATE TABLE IF NOT EXISTS pm_invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT NOT NULL,
    lease_id TEXT REFERENCES pm_leases(id) ON DELETE SET NULL,
    tenant_id TEXT NOT NULL REFERENCES pm_tenants(id) ON DELETE CASCADE,
    unit_id TEXT REFERENCES pm_units(id) ON DELETE SET NULL,
    description TEXT,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    issue_date TIMESTAMP WITH TIME ZONE NOT NULL,
    due_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Draft',
    notes TEXT,
    institution_id TEXT NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS
ALTER TABLE pm_invoices ENABLE ROW LEVEL SECURITY;

-- Policy (following the pattern of all property access in 026_fix_property_management_rls.sql / 031_fix_remaining_pm_rls.sql)
DROP POLICY IF EXISTS "Invoice access" ON pm_invoices;
CREATE POLICY "Invoice access" ON pm_invoices FOR ALL USING (true);
