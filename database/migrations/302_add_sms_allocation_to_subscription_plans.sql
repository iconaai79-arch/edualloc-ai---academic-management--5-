-- Migration 302: Add SMS allocation per student to subscription plans
-- Enables SuperAdmin & institutions to allocate specific SMS quotas per student (e.g., 10 SMS for academic results or finance receipts).

ALTER TABLE public.student_subscription_plans
    ADD COLUMN IF NOT EXISTS sms_allocated_per_student INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS sms_usage_type TEXT DEFAULT 'academic_results_only';

-- Ensure existing plans have default 10 SMS per student
UPDATE public.student_subscription_plans
SET sms_allocated_per_student = COALESCE(sms_allocated_per_student, 10),
    sms_usage_type = COALESCE(sms_usage_type, 'academic_results_only');
