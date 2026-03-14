-- Migration 099: Security Hardening for Views and Functions
-- This migration enforces Row Level Security (RLS) on views using security_invoker
-- and prevents search path hijacking in SECURITY DEFINER functions.

DO $$ 
BEGIN
    -- 1. HARDEN VIEWS (Enforce RLS by using security_invoker = true)
    
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_library_statistics') THEN
        ALTER VIEW public.v_library_statistics SET (security_invoker = true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_bed_occupancy') THEN
        ALTER VIEW public.v_bed_occupancy SET (security_invoker = true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_house_statistics') THEN
        ALTER VIEW public.v_house_statistics SET (security_invoker = true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_today_teacher_checkins') THEN
        ALTER VIEW public.v_today_teacher_checkins SET (security_invoker = true);
    END IF;

    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'v_pending_reminders') THEN
        ALTER VIEW public.v_pending_reminders SET (security_invoker = true);
    END IF;

    -- 2. HARDEN SECURITY DEFINER FUNCTIONS (Enforce search_path = public)
    
    -- Increment/Decrement Helpers
    EXECUTE 'ALTER FUNCTION public.increment_module_count(text, text, text) SET search_path = public';
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'decrement_sms_balance') THEN
        EXECUTE 'ALTER FUNCTION public.decrement_sms_balance(text, integer) SET search_path = public';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'increment_sms_balance') THEN
        EXECUTE 'ALTER FUNCTION public.increment_sms_balance(text, integer) SET search_path = public';
    END IF;

    -- Core RLS Helpers
    EXECUTE 'ALTER FUNCTION public.get_curr_user_role() SET search_path = public';
    EXECUTE 'ALTER FUNCTION public.get_curr_user_inst_id() SET search_path = public';

    -- Bed Allocation RPC
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_bed_allocation') THEN
        EXECUTE 'ALTER FUNCTION public.create_bed_allocation(jsonb) SET search_path = public';
    END IF;

    -- Teacher Check-in Helpers
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'process_teacher_checkin') THEN
        EXECUTE 'ALTER FUNCTION public.process_teacher_checkin(uuid, uuid, varchar, varchar, text) SET search_path = public';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'determine_checkin_status') THEN
        EXECUTE 'ALTER FUNCTION public.determine_checkin_status(time, varchar) SET search_path = public';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_checkin_status') THEN
        EXECUTE 'ALTER FUNCTION public.update_checkin_status() SET search_path = public';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_attendance_summary') THEN
        EXECUTE 'ALTER FUNCTION public.update_attendance_summary() SET search_path = public';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'create_daily_reminders') THEN
        EXECUTE 'ALTER FUNCTION public.create_daily_reminders(uuid) SET search_path = public';
    END IF;

    -- Retail Triggers
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'reduce_retail_stock_on_sale') THEN
        EXECUTE 'ALTER FUNCTION public.reduce_retail_stock_on_sale() SET search_path = public';
    END IF;

    -- Boarding Triggers
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_bed_status_on_allocation') THEN
        EXECUTE 'ALTER FUNCTION public.update_bed_status_on_allocation() SET search_path = public';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'prevent_double_allocation') THEN
        EXECUTE 'ALTER FUNCTION public.prevent_double_allocation() SET search_path = public';
    END IF;

END $$;
