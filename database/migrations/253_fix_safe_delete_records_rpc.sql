-- Migration: 253_fix_safe_delete_records_rpc
-- Description: Recreates the safe_delete_records RPC function to ensure it exists
--              in the schema cache with the correct signature (p_table, p_ids).
--              Also expands the allowed tables whitelist to include pm_invoices
--              and other PM tables that were missing.
--
-- Run this in: Supabase Dashboard → SQL Editor

-- Drop any existing versions with different signatures to avoid conflicts
DROP FUNCTION IF EXISTS public.safe_delete_records(TEXT[], TEXT);
DROP FUNCTION IF EXISTS public.safe_delete_records(TEXT, TEXT[]);

-- Recreate with canonical signature: (p_table TEXT, p_ids TEXT[])
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
-- Security is enforced by the table whitelist inside the function.
GRANT EXECUTE ON FUNCTION public.safe_delete_records(TEXT, TEXT[]) TO anon, authenticated, service_role;

-- Notify PostgREST to reload the schema cache so the function is immediately visible
NOTIFY pgrst, 'reload schema';
