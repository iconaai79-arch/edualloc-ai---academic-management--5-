-- Migration 261: Create pm_inspections and pm_deposit_refunds tables for Property Management
CREATE TABLE IF NOT EXISTS public.pm_inspections (
    id TEXT PRIMARY KEY,
    lease_id TEXT REFERENCES public.pm_leases(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
    inspection_date TIMESTAMP WITH TIME ZONE NOT NULL,
    inspected_by TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- 'Draft', 'Completed'
    structural_condition TEXT,
    structural_comments TEXT,
    cleaning_condition TEXT,
    cleaning_comments TEXT,
    fittings_condition TEXT,
    fittings_comments TEXT,
    repairs_required TEXT,
    estimated_repair_cost DECIMAL(12, 2) DEFAULT 0,
    tenant_signoff BOOLEAN DEFAULT FALSE,
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public.pm_deposit_refunds (
    id TEXT PRIMARY KEY,
    lease_id TEXT REFERENCES public.pm_leases(id) ON DELETE CASCADE,
    tenant_id TEXT REFERENCES public.pm_tenants(id) ON DELETE CASCADE,
    statement_date TIMESTAMP WITH TIME ZONE NOT NULL,
    original_deposit DECIMAL(12, 2) DEFAULT 0,
    rent_arrears_deduction DECIMAL(12, 2) DEFAULT 0,
    utility_arrears_deduction DECIMAL(12, 2) DEFAULT 0,
    damage_repair_deduction DECIMAL(12, 2) DEFAULT 0,
    other_deductions DECIMAL(12, 2) DEFAULT 0,
    other_deductions_comments TEXT,
    refund_amount DECIMAL(12, 2) DEFAULT 0,
    payment_method TEXT, -- 'Bank Transfer', 'M-Pesa', 'Cheque', 'Cash'
    payment_reference TEXT,
    status TEXT NOT NULL DEFAULT 'Pending Approval', -- 'Pending Approval', 'Approved', 'Paid'
    institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.pm_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pm_deposit_refunds ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Staff can view their property inspections" ON public.pm_inspections;
DROP POLICY IF EXISTS "Staff can manage their property inspections" ON public.pm_inspections;
DROP POLICY IF EXISTS "Staff can view their property deposit refunds" ON public.pm_deposit_refunds;
DROP POLICY IF EXISTS "Staff can manage their property deposit refunds" ON public.pm_deposit_refunds;

-- Create policies for RLS
CREATE POLICY "Staff can view their property inspections" ON public.pm_inspections
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id());
CREATE POLICY "Staff can manage their property inspections" ON public.pm_inspections
    FOR ALL USING (institution_id = public.get_curr_user_inst_id());

CREATE POLICY "Staff can view their property deposit refunds" ON public.pm_deposit_refunds
    FOR SELECT USING (institution_id = public.get_curr_user_inst_id());
CREATE POLICY "Staff can manage their property deposit refunds" ON public.pm_deposit_refunds
    FOR ALL USING (institution_id = public.get_curr_user_inst_id());

-- Update the safe_delete_records RPC function to add the new tables to the bulk-delete whitelist
CREATE OR REPLACE FUNCTION public.safe_delete_records(p_table TEXT, p_ids TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  allowed_tables TEXT[] := ARRAY[
    -- Driving School
    'ds_leads', 'ds_students', 'ds_lessons', 'ds_vehicles', 'ds_instructors',
    'ds_payments', 'ds_invoices', 'ds_skill_mastery', 'ds_votes',
    'ds_settings', 'ds_license_categories',
    -- Alumni / Alumnae
    'alumni_posts', 'alumni_comments', 'alumni_messages', 'alumni_follows',
    'alumnae_members',
    -- Campaign / Political
    'voter_outreach', 'campaign_villages',
    -- Events
    'event_pins', 'institution_events', 'event_participants', 'event_pledges',
    -- Notifications
    'app_notifications',
    -- Hospitality
    'hospitality_items', 'hospitality_menu_items', 'hospitality_vehicles',
    -- Retail
    'retail_inventory_items', 'store_categories',
    -- Car Sales / Showroom
    'car_listings', 'car_sales_listings', 'car_sales_invoices', 'car_sales_payments',
    -- Property Management
    'pm_listings', 'pm_inquiries', 'pm_invoices', 'pm_payments',
    'pm_tenants', 'pm_leases', 'pm_units', 'pm_properties',
    'pm_maintenance_tickets', 'pm_disbursements', 'pm_settings', 'pm_expenses', 'pm_notices',
    'pm_utility_readings', 'pm_inspections', 'pm_deposit_refunds',
    -- Finance & Integrations
    'integration_logs', 'sms_outbox', 'bank_transactions',
    -- Boarding
    'boarding_maintenance_logs', 'books',
    -- Agrovet / Coop
    'agrovet_products', 'agrovet_customers',
    -- EduFlow
    'eduflow_tasks', 'eduflow_files',
    -- Academic
    'student_enrollments', 'allocation_requests', 'assignments',
    'tasks', 'assessments', 'vote_heads', 'buildings', 'academic_levels',
    -- Audit
    'audit_reports', 'audit_issues',
    -- Misc
    'expenses', 'invoices', 'receipts', 'demo_requests'
  ];
BEGIN
  -- Security: Only allow deleting from explicitly whitelisted tables
  IF NOT (p_table = ANY(allowed_tables)) THEN
    RAISE EXCEPTION 'Table "%" is not in the bulk-delete allow list', p_table;
  END IF;

  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN 0;
  END IF;

  EXECUTE format('DELETE FROM %I WHERE id = ANY($1)', p_table) USING p_ids;
  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN v_count;
END;
$$;

-- Allow any authenticated or anonymous caller to invoke this function.
GRANT EXECUTE ON FUNCTION public.safe_delete_records(TEXT, TEXT[]) TO anon, authenticated, service_role;

-- Notify PostgREST to reload the schema cache so the new tables are immediately visible
NOTIFY pgrst, 'reload schema';
