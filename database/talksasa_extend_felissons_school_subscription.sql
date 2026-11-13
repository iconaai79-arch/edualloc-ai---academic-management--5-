-- ============================================================================
-- TalkSasa: Extend Felissons School Subscription by 90 Days
-- File: database/talksasa_extend_felissons_school_subscription.sql
-- Run in Supabase SQL Editor / psql
-- ============================================================================

BEGIN;

-- 1. Extend the main institution subscription to 90 days from today
UPDATE public.institutions
SET subscription_ends_at = NOW() + INTERVAL '90 days',
    "subscriptionEndsAt" = NOW() + INTERVAL '90 days',
    trial_ends_at = NOW() + INTERVAL '90 days',
    "trialEndsAt" = NOW() + INTERVAL '90 days',
    status = 'active',
    updated_at = NOW()
WHERE name ILIKE '%felissons%' OR id ILIKE '%felissons%';

-- 2. Extend any active module states for Felissons School
UPDATE public.institution_module_states
SET subscription_ends_at = NOW() + INTERVAL '90 days',
    status = 'active',
    updated_at = NOW()
WHERE institution_id IN (
    SELECT id FROM public.institutions WHERE name ILIKE '%felissons%' OR id ILIKE '%felissons%'
);

COMMIT;

-- 3. Verify new expiry date and remaining days
SELECT 
    id, 
    name, 
    status, 
    subscription_ends_at, 
    ROUND(EXTRACT(EPOCH FROM (subscription_ends_at - NOW())) / 86400) AS days_remaining
FROM public.institutions
WHERE name ILIKE '%felissons%' OR id ILIKE '%felissons%';
