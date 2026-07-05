-- Migration: Add payment priority columns to bc_courses
-- This mirrors the DS approach where each fee line item carries a numeric priority
-- controlling which component receives payment first (lower number = higher priority).

ALTER TABLE public.bc_courses
    ADD COLUMN IF NOT EXISTS tuition_priority INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS kit_priority INTEGER DEFAULT 2,
    ADD COLUMN IF NOT EXISTS exam_priority INTEGER DEFAULT 3;

COMMENT ON COLUMN public.bc_courses.tuition_priority IS 'Payment allocation priority for tuition fee (1 = allocated first)';
COMMENT ON COLUMN public.bc_courses.kit_priority     IS 'Payment allocation priority for beauty starter kit fee';
COMMENT ON COLUMN public.bc_courses.exam_priority    IS 'Payment allocation priority for exam registration fee';
