-- 241. SECURE BULK DELETE RPC FUNCTION
-- Creates a SECURITY DEFINER function that deletes records by ID array,
-- bypassing RLS. This is called directly from the browser Supabase client,
-- so no API serverless function or body-parsing is needed.
--
-- Run this in: Supabase Dashboard → SQL Editor

CREATE OR REPLACE FUNCTION public.safe_delete_records(p_table TEXT, p_ids TEXT[])
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
  allowed_tables TEXT[] := ARRAY[
    'ds_leads', 'ds_students', 'ds_lessons', 'ds_vehicles', 'ds_instructors',
    'ds_payments', 'ds_invoices', 'ds_skill_mastery', 'ds_votes',
    'ds_settings', 'ds_license_categories',
    'alumni_posts', 'alumni_comments', 'alumni_messages', 'alumni_follows',
    'voter_outreach', 'campaign_villages',
    'event_pins', 'institution_events', 'event_participants', 'event_pledges',
    'alumnae_members', 'app_notifications',
    'hospitality_items', 'hospitality_menu_items', 'hospitality_vehicles',
    'retail_inventory_items', 'store_categories',
    'car_listings', 'car_sales_listings', 'car_sales_invoices', 'car_sales_payments',
    'pm_listings', 'pm_inquiries',
    'integration_logs', 'sms_outbox',
    'boarding_maintenance_logs', 'books',
    'bank_transactions', 'agrovet_products', 'agrovet_customers',
    'eduflow_tasks', 'eduflow_files', 'student_enrollments',
    'allocation_requests', 'assignments', 'tasks', 'assessments',
    'vote_heads', 'buildings', 'academic_levels'
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
