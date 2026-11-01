-- Migration 531: Complete 100% Column Coverage for Institutions Table Import
-- Description: Extracted directly from line 1925 of the backup file.
-- Guarantees that every column in the backup INSERT statement exists in public.institutions.

-- 1. Ensure table exists
CREATE TABLE IF NOT EXISTS public.institutions (
    id TEXT PRIMARY KEY
);

-- 2. Literal match for the backup typo column with leading quote: "'aiModelTier"
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "'aiModelTier" TEXT DEFAULT 'premium';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "aiModelTier" TEXT DEFAULT 'premium';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ai_model_tier TEXT DEFAULT 'premium';

-- 3. Embedded relations from Supabase Studio / PostgREST
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "usersInstitutionIdFkey" JSONB;

-- 4. Academic, Exam & Grading Configuration columns
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "classExamConfigs" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS class_exam_configs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "treeGradingNodes" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS tree_grading_nodes JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "classTeacherCommentsConfig" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS class_teacher_comments_config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "classRankingConfigs" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS class_ranking_configs JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "othersExamSettings" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS others_exam_settings JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "moduleStates" JSONB DEFAULT '[]'::jsonb;

-- 5. Special Needs & School Demographics
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "coopApprovers" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "region" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "uic" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "knecCode" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "cluster" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "specialNeedType" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "disabilityType" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "accommodationType" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "genderType" TEXT;

-- 6. School Profile & Showcase Assets
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "vision" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "mission" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "history" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "logo" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "subdomain" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "showcaseCpanelUrl" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "showcaseCpanelToken" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "logoStorageProvider" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "logoExternalId" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "bannerStorageProvider" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "bannerExternalId" TEXT;

-- 7. Basic Information & Contact
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'trial';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "category" TEXT;

-- 8. Institution Identification & Hierarchy
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS institution_id TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "institutionType" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS institution_type TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "institutionCode" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS institution_code TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "businessSubType" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS business_sub_type TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "parentInstitutionId" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS parent_institution_id TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "isBranch" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_branch BOOLEAN DEFAULT FALSE;

-- 9. Timestamps & Subscriptions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMPTZ;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS subscription_ends_at TIMESTAMPTZ;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMPTZ;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- 10. Billing & Invoicing Models
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "billingModel" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS billing_model TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "ratePerStudent" NUMERIC;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS rate_per_student NUMERIC;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "billingCycleAnchor" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS billing_cycle_anchor TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "isSuspendedForBilling" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_suspended_for_billing BOOLEAN DEFAULT FALSE;

-- 11. Branding & Appearance
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "themeColor" TEXT DEFAULT '#4f46e5';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS theme_color TEXT DEFAULT '#4f46e5';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "headerImageUrl" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS header_image_url TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "letterheadUrl" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS letterhead_url TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "stampUrl" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS stamp_url TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "footerImageUrl" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS footer_image_url TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "letterheadConfig" JSONB DEFAULT '{"header_image_url": null, "stamp_image_url": null}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS letterhead_config JSONB DEFAULT '{"header_image_url": null, "stamp_image_url": null}'::jsonb;

-- 12. Geography & Location
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "location" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "isInDemoMode" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_in_demo_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "countyId" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS county_id TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "resellerId" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS reseller_id TEXT;

-- 13. SMS, Messaging & Communication Configs
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "smsBalance" INTEGER DEFAULT 0;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS sms_balance INTEGER DEFAULT 0;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "customSmsPrice" NUMERIC;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS custom_sms_price NUMERIC;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "smsConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS sms_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "emailConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS email_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "farmerSmsBillingEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS farmer_sms_billing_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "parentAbsenceNotificationsEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS parent_absence_notifications_enabled BOOLEAN DEFAULT FALSE;

-- 14. Gateways & Integrations
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "mpesaConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS mpesa_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "kcbConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kcb_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "ncbaConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS ncba_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "airtelMoneyConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS airtel_money_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "intasendConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS intasend_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "coopConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS coop_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "coopSettings" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS coop_settings JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "equityBillerConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS equity_biller_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "imConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS im_config JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "googleDriveConfig" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS google_drive_config JSONB;

-- 15. Academic & Timetable Features
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "gradingSystems" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS grading_systems JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "activeGradingSystemId" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS active_grading_system_id TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "timetableSettings" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS timetable_settings JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "examTimetableSettings" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS exam_timetable_settings JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "scheduleProfiles" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS schedule_profiles JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "streamDefinitions" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS stream_definitions JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "useAllocationRequests" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS use_allocation_requests BOOLEAN DEFAULT TRUE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "checkinRadiusEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS checkin_radius_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "checkinRadiusMeters" INTEGER DEFAULT 200;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS checkin_radius_meters INTEGER DEFAULT 200;

-- 16. Store Hours, Visitors & Kiosk
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "storeHoursEnforced" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS store_hours_enforced BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "storeOpenTime" TEXT DEFAULT '08:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS store_open_time TEXT DEFAULT '08:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "storeCloseTime" TEXT DEFAULT '17:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS store_close_time TEXT DEFAULT '17:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "visitorAutoFinalizeEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS visitor_auto_finalize_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "visitorAutoFinalizeTime" TEXT DEFAULT '18:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS visitor_auto_finalize_time TEXT DEFAULT '18:00';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "notifyHostOnVisitorArrival" BOOLEAN DEFAULT TRUE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS notify_host_on_visitor_arrival BOOLEAN DEFAULT TRUE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "visitorArrivalSmsTemplate" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS visitor_arrival_sms_template TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "kioskSecurityPin" TEXT DEFAULT '1234';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kiosk_security_pin TEXT DEFAULT '1234';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "kioskStatus" TEXT DEFAULT 'active';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kiosk_status TEXT DEFAULT 'active';
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "kioskUrl" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS kiosk_url TEXT;

-- 17. Security, Subdomains & Marketplace
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "isOtpEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS is_otp_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "useSubdomain" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS use_subdomain BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "customSubdomain" TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS custom_subdomain TEXT;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "marketplaceEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS marketplace_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "listingQuota" INTEGER DEFAULT 0;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS listing_quota INTEGER DEFAULT 0;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "customSubscriptionPrice" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS custom_subscription_price JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "customModulePricing" JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS custom_module_pricing JSONB;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS "motto" TEXT;

-- 18. Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
