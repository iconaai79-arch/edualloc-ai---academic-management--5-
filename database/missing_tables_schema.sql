-- ============================================================================
-- BULLETPROOF & IDEMPOTENT DDL FOR ALL 94 EXTENDED PLATFORM TABLES
-- Safe to run on empty or existing databases
-- Zero CREATE INDEX statements to avoid any column-not-found errors
-- Uses ADD COLUMN IF NOT EXISTS so existing tables receive any missing columns
-- ============================================================================

-- Table: public."counties"
CREATE TABLE IF NOT EXISTS public."counties" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'active';
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "location" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "headquarters" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "postalCode" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "postal_code" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "adminName" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "admin_name" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "adminId" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "admin_id" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "governorName" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "governor_name" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "deputyGovernorName" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "deputy_governor_name" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "directorOfEducation" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "director_of_education" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "letterheadUrl" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "letterhead_url" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "sealUrl" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "seal_url" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "stampUrl" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "stamp_url" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "signature_url" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "primaryColor" TEXT DEFAULT '#4f46e5';
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "primary_color" TEXT DEFAULT '#4f46e5';
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "secondaryColor" TEXT DEFAULT '#0f172a';
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "secondary_color" TEXT DEFAULT '#0f172a';
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "motto" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "registeredVoters" NUMERIC DEFAULT 0;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "registered_voters" NUMERIC DEFAULT 0;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "smsBalance" NUMERIC DEFAULT 0;
ALTER TABLE public."counties" ADD COLUMN IF NOT EXISTS "sms_balance" NUMERIC DEFAULT 0;

-- Table: public."institutions"
CREATE TABLE IF NOT EXISTS public."institutions" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "phone_number" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "status" TEXT DEFAULT 'trial';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "institution_id" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "institutionType" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "institution_type" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "institutionCode" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "institution_code" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "businessSubType" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "business_sub_type" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "parentInstitutionId" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "parent_institution_id" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "subscriptionEndsAt" TIMESTAMPTZ;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "subscription_ends_at" TIMESTAMPTZ;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMPTZ;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "trial_ends_at" TIMESTAMPTZ;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "billingModel" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "billing_model" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "ratePerStudent" NUMERIC;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "rate_per_student" NUMERIC;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "billingCycleAnchor" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "billing_cycle_anchor" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "isSuspendedForBilling" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "is_suspended_for_billing" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "itaxIntegrationStatus" TEXT DEFAULT 'not_requested';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "itax_integration_status" TEXT DEFAULT 'not_requested';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "itaxEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "itax_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "themeColor" TEXT DEFAULT '#4f46e5';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "theme_color" TEXT DEFAULT '#4f46e5';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "headerImageUrl" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "header_image_url" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "letterheadUrl" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "letterhead_url" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "stampUrl" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "stamp_url" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "footerImageUrl" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "footer_image_url" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "letterheadConfig" JSONB DEFAULT '{"header_image_url": null, "stamp_image_url": null}'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "letterhead_config" JSONB DEFAULT '{"header_image_url": null, "stamp_image_url": null}'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "location" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "isInDemoMode" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS is_in_demo_mode BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "hasTransport" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS has_transport BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "isBranch" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS is_branch BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "equityBillerConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS equity_biller_config JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "storeHoursEnforced" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS store_hours_enforced BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "storeOpenTime" TEXT DEFAULT '08:00';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS store_open_time TEXT DEFAULT '08:00';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "storeCloseTime" TEXT DEFAULT '17:00';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS store_close_time TEXT DEFAULT '17:00';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "visitorAutoFinalizeEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS visitor_auto_finalize_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "visitorAutoFinalizeTime" TEXT DEFAULT '18:00';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS visitor_auto_finalize_time TEXT DEFAULT '18:00';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "notifyHostOnVisitorArrival" BOOLEAN DEFAULT TRUE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS notify_host_on_visitor_arrival BOOLEAN DEFAULT TRUE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "visitorArrivalSmsTemplate" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS visitor_arrival_sms_template TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "kioskSecurityPin" TEXT DEFAULT '1234';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS kiosk_security_pin TEXT DEFAULT '1234';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "kioskStatus" TEXT DEFAULT 'active';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS kiosk_status TEXT DEFAULT 'active';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "countyId" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "county_id" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "subCounty" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "sub_county" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "constituency" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "ward" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "resellerId" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "reseller_id" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "smsBalance" INTEGER DEFAULT 0;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "sms_balance" INTEGER DEFAULT 0;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "customSmsPrice" NUMERIC;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "custom_sms_price" NUMERIC;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "enableLowSmsReminders" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "enable_low_sms_reminders" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "lowSmsThreshold" INTEGER DEFAULT 100;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "low_sms_threshold" INTEGER DEFAULT 100;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "smsConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "sms_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "whatsappConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "whatsapp_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "emailConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "email_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "farmerSmsBillingEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "farmer_sms_billing_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "parentAbsenceNotificationsEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "parent_absence_notifications_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "mpesaConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "mpesa_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "kcbConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "kcb_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "ncbaConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "ncba_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "equityConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "equity_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "imConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "im_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "airtelMoneyConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "airtel_money_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "intasendConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "intasend_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "coopConfig" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "coop_config" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "coopSettings" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "coop_settings" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "googleDriveConfig" JSONB DEFAULT '{"clientId": "", "clientSecret": "", "refreshToken": "", "isActive": false}'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "google_drive_config" JSONB DEFAULT '{"clientId": "", "clientSecret": "", "refreshToken": "", "isActive": false}'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "gradingSystems" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "grading_systems" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "activeGradingSystemId" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "active_grading_system_id" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "timetableSettings" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "timetable_settings" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "examTimetableSettings" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "exam_timetable_settings" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "scheduleProfiles" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "schedule_profiles" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "usersInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "branchesInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "studentsInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "studentEnrollmentsInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "invoicesInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "receiptsInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "departmentsInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "coursesInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "classesInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "academicYearsInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "academicLevelsInstitutionIdFkey" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "streamDefinitions" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "stream_definitions" JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "useAllocationRequests" BOOLEAN DEFAULT TRUE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "use_allocation_requests" BOOLEAN DEFAULT TRUE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "checkinRadiusEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "checkin_radius_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "checkinRadiusMeters" INTEGER DEFAULT 200;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "checkin_radius_meters" INTEGER DEFAULT 200;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "isOtpEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "is_otp_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "sessionExpiryMinutes" INTEGER DEFAULT 1440;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "session_expiry_minutes" INTEGER DEFAULT 1440;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "kioskUrl" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "kiosk_url" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "useSubdomain" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "use_subdomain" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "customSubdomain" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "custom_subdomain" TEXT;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "marketplaceEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "marketplace_enabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "listingQuota" INTEGER DEFAULT 0;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "listing_quota" INTEGER DEFAULT 0;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "aiModelTier" TEXT DEFAULT 'premium';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "ai_model_tier" TEXT DEFAULT 'premium';
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "customSubscriptionPrice" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "custom_subscription_price" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "customModulePricing" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "custom_module_pricing" JSONB;
ALTER TABLE public."institutions" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;

-- Table: public."constituencies"
CREATE TABLE IF NOT EXISTS public."constituencies" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."constituencies" ADD COLUMN IF NOT EXISTS "countyId" TEXT;
ALTER TABLE public."constituencies" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."constituencies" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."constituencies" ADD COLUMN IF NOT EXISTS "code" TEXT;

-- Table: public."wards"
CREATE TABLE IF NOT EXISTS public."wards" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."wards" ADD COLUMN IF NOT EXISTS "constituencyId" TEXT;
ALTER TABLE public."wards" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."wards" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."wards" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE public."wards" ADD COLUMN IF NOT EXISTS "registeredVoters" NUMERIC DEFAULT 0;
ALTER TABLE public."wards" ADD COLUMN IF NOT EXISTS "electionYear" NUMERIC DEFAULT 0;

-- Table: public."students"
CREATE TABLE IF NOT EXISTS public."students" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "role" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "departmentId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "expertise" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "courseLevelId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "enrolledSubjectIds" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "parentIds" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "studentIds" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "profilePhotoUrl" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "unavailability" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "passwordLastUpdated" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "passwordExpiresAt" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "resetToken" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "resetTokenExpires" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "roles" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "isActive" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "mustChangePassword" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "farmerId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "riderId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "resetOtp" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "resetOtpExpires" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "avatarStorageProvider" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "avatarExternalId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "nationalId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "employmentDate" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "employmentTerms" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "basicSalary" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "kraPin" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "nssfNo" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "shifNumber" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "bankBranch" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "bankAccountNumber" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "vehicleId" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "studentClass" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "stream" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "hourlyRate" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "weekdayHourlyRate" TEXT;
ALTER TABLE public."students" ADD COLUMN IF NOT EXISTS "weekendHourlyRate" TEXT;

-- Table: public."audit_log"
CREATE TABLE IF NOT EXISTS public."audit_log" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "tableName" TEXT;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "recordId" TEXT;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "oldValues" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "newValues" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "changedBy" TEXT;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "changedByName" TEXT;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE public."audit_log" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."audit_reports"
CREATE TABLE IF NOT EXISTS public."audit_reports" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "period" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "runAt" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "triggeredBy" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "overallRisk" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "totalIssues" NUMERIC DEFAULT 0;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "criticalCount" NUMERIC DEFAULT 0;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "highCount" NUMERIC DEFAULT 0;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "mediumCount" NUMERIC DEFAULT 0;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "lowCount" NUMERIC DEFAULT 0;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "infoCount" NUMERIC DEFAULT 0;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "totalBilled" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "totalCollected" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "collectionRate" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "outstanding" TEXT;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "issuesJson" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."audit_reports" ADD COLUMN IF NOT EXISTS "summaryJson" JSONB DEFAULT '{}'::jsonb;

-- Table: public."audit_issues"
CREATE TABLE IF NOT EXISTS public."audit_issues" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "reportId" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "issueType" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "recordId" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "tableName" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "amount" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "detectedAt" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "isResolved" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "resolvedBy" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "resolvedAt" TEXT;
ALTER TABLE public."audit_issues" ADD COLUMN IF NOT EXISTS "resolutionNote" TEXT;

-- Table: public."biometric_devices"
CREATE TABLE IF NOT EXISTS public."biometric_devices" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "deviceName" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "deviceModel" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "locationDescription" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "protocol" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "pushUrl" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "lastSyncAt" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "lastIp" TEXT;
ALTER TABLE public."biometric_devices" ADD COLUMN IF NOT EXISTS "requestsCount" NUMERIC DEFAULT 0;

-- Table: public."biometric_enrollments"
CREATE TABLE IF NOT EXISTS public."biometric_enrollments" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."biometric_enrollments" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."biometric_enrollments" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE public."biometric_enrollments" ADD COLUMN IF NOT EXISTS "devicePin" TEXT;
ALTER TABLE public."biometric_enrollments" ADD COLUMN IF NOT EXISTS "fingerprintIndex" NUMERIC DEFAULT 0;
ALTER TABLE public."biometric_enrollments" ADD COLUMN IF NOT EXISTS "enrolledAt" TEXT;
ALTER TABLE public."biometric_enrollments" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;

-- Table: public."biometric_device_commands"
CREATE TABLE IF NOT EXISTS public."biometric_device_commands" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "commandId" NUMERIC DEFAULT 0;
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "commandText" TEXT;
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "commandType" TEXT;
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "sentAt" TEXT;
ALTER TABLE public."biometric_device_commands" ADD COLUMN IF NOT EXISTS "executedAt" TEXT;

-- Table: public."staff_attendance_daily"
CREATE TABLE IF NOT EXISTS public."staff_attendance_daily" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "attendanceDate" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "firstIn" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "lastOut" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "totalHours" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "overtimeHours" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "lateMinutes" NUMERIC DEFAULT 0;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "earlyLeaveMinutes" NUMERIC DEFAULT 0;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "punchCount" NUMERIC DEFAULT 0;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."staff_attendance_daily" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."staff_attendance_logs"
CREATE TABLE IF NOT EXISTS public."staff_attendance_logs" (
    "id" TEXT PRIMARY KEY DEFAULT ('sal_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20))
);
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "institution_id" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "staff_id" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "deviceId" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "device_id" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "devicePin" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "device_pin" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "punchTime" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "punch_time" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "punchType" INTEGER DEFAULT 0;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "punch_type" INTEGER DEFAULT 0;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "verificationMethod" INTEGER DEFAULT 1;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "verification_method" INTEGER DEFAULT 1;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "rawData" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "raw_data" TEXT;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "isProcessed" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "is_processed" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."staff_attendance_logs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

-- Table: public."subject_allocations"
CREATE TABLE IF NOT EXISTS public."subject_allocations" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "lessonsPerWeek" NUMERIC DEFAULT 0;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "class_name" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "teacher_id" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "subject_name" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "teacher_name" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "institution_id" TEXT;
ALTER TABLE public."subject_allocations" ADD COLUMN IF NOT EXISTS "lessons_per_week" NUMERIC DEFAULT 0;

-- Table: public."class_subject_allocations"
CREATE TABLE IF NOT EXISTS public."class_subject_allocations" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."class_subject_allocations" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."class_subject_allocations" ADD COLUMN IF NOT EXISTS "allocations" JSONB DEFAULT '{}'::jsonb;

-- Table: public."schemes_of_work"
CREATE TABLE IF NOT EXISTS public."schemes_of_work" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "term" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "weeksData" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."schemes_of_work" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."school_leaving_certificates"
CREATE TABLE IF NOT EXISTS public."school_leaving_certificates" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "certificateNo" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "assessmentNo" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "templateType" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "admissionNo" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "payload" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "headteacherName" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "issueDate" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."school_leaving_certificates" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."allocations"
CREATE TABLE IF NOT EXISTS public."allocations" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "lecturerId" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "justification" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "academicYearId" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "semesterId" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "timestamp" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "preferences" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "signatureUrl" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "courseLevelIds" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "proposedChanges" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "requesterId" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "reviewedAt" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "courseLevelSelections" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "subjectIds" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."allocations" ADD COLUMN IF NOT EXISTS "lessonStructure" JSONB DEFAULT '{}'::jsonb;

-- Table: public."teacher_lesson_plans"
CREATE TABLE IF NOT EXISTS public."teacher_lesson_plans" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "subtopic" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "duration" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "learningOutcomes" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "keyQuestions" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "coreCompetencies" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "learningResources" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "lessonTrajectory" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "reflection" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "hodComment" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."teacher_lesson_plans" ADD COLUMN IF NOT EXISTS "trajectory" JSONB DEFAULT '{}'::jsonb;

-- Table: public."teacher_attendance_summary"
CREATE TABLE IF NOT EXISTS public."teacher_attendance_summary" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "month" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "year" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "totalDays" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "presentDays" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "lateDays" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "absentDays" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "morningCheckins" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "afternoonCheckins" NUMERIC DEFAULT 0;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."teacher_attendance_summary" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."expenses"
CREATE TABLE IF NOT EXISTS public."expenses" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "amount" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "date" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "attachmentUrl" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "voteHeadId" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "bankAccountId" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "payeeName" TEXT;
ALTER TABLE public."expenses" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;

-- Table: public."school_bank_accounts"
CREATE TABLE IF NOT EXISTS public."school_bank_accounts" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "accountName" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "branchName" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "integrationService" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "integrationStatus" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "paymentNotificationTemplate" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "paymentInstructions" TEXT;
ALTER TABLE public."school_bank_accounts" ADD COLUMN IF NOT EXISTS "enableCustomNotification" BOOLEAN DEFAULT FALSE;

-- Table: public."finance_numbering_configs"
CREATE TABLE IF NOT EXISTS public."finance_numbering_configs" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "institution_id" TEXT DEFAULT 'GLOBAL';
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "document_type" TEXT;
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "documentType" TEXT;
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "prefix" TEXT;
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "next_number" INTEGER DEFAULT 1001;
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "nextNumber" NUMERIC DEFAULT 0;
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."finance_numbering_configs" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."invoice_clients"
CREATE TABLE IF NOT EXISTS public."invoice_clients" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "institution_id" TEXT DEFAULT 'GLOBAL';
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "client_name" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "clientName" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "contact_person" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "contactPerson" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "tax_pin" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "taxPin" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "city" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."invoice_clients" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."company_invoice_settings"
CREATE TABLE IF NOT EXISTS public."company_invoice_settings" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "institution_id" TEXT DEFAULT 'GLOBAL';
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "invoice_prefix" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "invoicePrefix" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "quote_prefix" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "quotePrefix" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "receipt_prefix" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "receiptPrefix" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "tax_rate" NUMERIC DEFAULT 0;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "taxRate" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "tax_name" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "taxName" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "payment_terms_days" NUMERIC DEFAULT 0;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "paymentTermsDays" NUMERIC DEFAULT 0;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "bankName" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "account_name" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "accountName" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "account_number" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "accountNumber" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "mpesa_paybill" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "mpesaPaybill" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "mpesa_till" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "mpesaTill" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "notes_template" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "notesTemplate" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "terms_template" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "termsTemplate" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "logo_url" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "stamp_url" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "stampUrl" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public."company_invoice_settings" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."institution_wallets"
CREATE TABLE IF NOT EXISTS public."institution_wallets" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "currentBalance" TEXT;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "reservedBalance" TEXT;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "lowFloatThreshold" TEXT;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "autoTopupEnabled" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "lockReason" TEXT;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."institution_wallets" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."teacher_wallets"
CREATE TABLE IF NOT EXISTS public."teacher_wallets" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "availableBalance" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "pendingBalance" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "totalWithdrawn" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "totalEarned" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "mpesaPhoneNumber" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "isLocked" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "lockReason" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."teacher_wallets" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."convenience_fee_configs"
CREATE TABLE IF NOT EXISTS public."convenience_fee_configs" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "feeType" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "fixedAmount" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "percentageRate" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "minFee" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "maxFee" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "feeBearer" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "appliesTo" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."convenience_fee_configs" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."super_admin_revenue_wallets"
CREATE TABLE IF NOT EXISTS public."super_admin_revenue_wallets" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."super_admin_revenue_wallets" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE public."super_admin_revenue_wallets" ADD COLUMN IF NOT EXISTS "totalFeesCollected" TEXT;
ALTER TABLE public."super_admin_revenue_wallets" ADD COLUMN IF NOT EXISTS "availableBalance" TEXT;
ALTER TABLE public."super_admin_revenue_wallets" ADD COLUMN IF NOT EXISTS "totalWithdrawn" TEXT;
ALTER TABLE public."super_admin_revenue_wallets" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."super_admin_revenue_wallets" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."ng_cdf_bursaries"
CREATE TABLE IF NOT EXISTS public."ng_cdf_bursaries" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "institutionName" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "constituencyName" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "amountRequested" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "amountApproved" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "purpose" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "chequeNumber" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "appliedAt" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "vettedAt" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "vettedBy" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "disbursedAt" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."ng_cdf_bursaries" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."ng_cdf_funds"
CREATE TABLE IF NOT EXISTS public."ng_cdf_funds" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."ng_cdf_funds" ADD COLUMN IF NOT EXISTS "constituencyId" TEXT;
ALTER TABLE public."ng_cdf_funds" ADD COLUMN IF NOT EXISTS "constituencyName" TEXT;
ALTER TABLE public."ng_cdf_funds" ADD COLUMN IF NOT EXISTS "financialYear" TEXT;
ALTER TABLE public."ng_cdf_funds" ADD COLUMN IF NOT EXISTS "totalBudget" TEXT;
ALTER TABLE public."ng_cdf_funds" ADD COLUMN IF NOT EXISTS "allocatedAmount" TEXT;
ALTER TABLE public."ng_cdf_funds" ADD COLUMN IF NOT EXISTS "remainingAmount" TEXT;
ALTER TABLE public."ng_cdf_funds" ADD COLUMN IF NOT EXISTS "publicParticipationLink" TEXT;
ALTER TABLE public."ng_cdf_funds" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."boarding_houses"
CREATE TABLE IF NOT EXISTS public."boarding_houses" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "gender" TEXT;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "capacity" NUMERIC DEFAULT 0;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "houseMasterId" TEXT;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "floorPlanUrl" TEXT;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."boarding_houses" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."boarding_rooms"
CREATE TABLE IF NOT EXISTS public."boarding_rooms" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "houseId" TEXT;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "roomNumber" TEXT;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "roomType" TEXT;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "capacity" NUMERIC DEFAULT 0;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "floorLevel" NUMERIC DEFAULT 0;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "amenities" TEXT;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."boarding_rooms" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."boarding_beds"
CREATE TABLE IF NOT EXISTS public."boarding_beds" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."boarding_beds" ADD COLUMN IF NOT EXISTS "roomId" TEXT;
ALTER TABLE public."boarding_beds" ADD COLUMN IF NOT EXISTS "bedNumber" TEXT;
ALTER TABLE public."boarding_beds" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."boarding_beds" ADD COLUMN IF NOT EXISTS "condition" TEXT;
ALTER TABLE public."boarding_beds" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."boarding_beds" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."boarding_beds" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."boarding_beds" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."bed_allocations"
CREATE TABLE IF NOT EXISTS public."bed_allocations" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "bedId" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "allocatedBy" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "allocationDate" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "term" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "academicYear" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."bed_allocations" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."school_remedial_rate_settings"
CREATE TABLE IF NOT EXISTS public."school_remedial_rate_settings" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "hourlyRate" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekdayHourlyRate" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekendHourlyRate" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekdayStartTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekdayEndTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekendStartTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekendEndTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxLessonsPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "feePerStudent" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "termFee" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekendBreakStartTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekendBreakEndTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekendBreakLabel" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "includeWeekendBreak" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxWeekendLessonsPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "cancellationCutoffHours" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "confirmationTimeoutMinutes" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "teacherPreferences" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "saturdayStartTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "saturdayEndTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "sundayStartTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "sundayEndTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "includeSaturdayBreak" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "saturdayBreakStartTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "saturdayBreakEndTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "saturdayBreakLabel" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "includeSundayBreak" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "sundayBreakStartTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "sundayBreakEndTime" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "sundayBreakLabel" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "weekdayDutyFlatRate" TEXT;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxSaturdayLessonsPerClassPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxSundayLessonsPerClassPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxSaturdayLessonsPerTeacherPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxSundayLessonsPerTeacherPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "saturdayPeriodsCount" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "sundayPeriodsCount" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxLessonsPerClassPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxWeekendLessonsPerClassPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxLessonsPerTeacherPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "maxWeekendLessonsPerTeacherPerDay" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "strictSubjectMatchOnly" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "strictGradeMatchOnly" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "allowAdjacentGradeSubstitution" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_rate_settings" ADD COLUMN IF NOT EXISTS "teacherCodes" JSONB DEFAULT '{}'::jsonb;

-- Table: public."school_remedial_allocations"
CREATE TABLE IF NOT EXISTS public."school_remedial_allocations" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "dayOfWeek" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "isWeekend" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "stream" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "substituteTeacherId" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "originalTeacherId" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "cancellationReason" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "cancelledAt" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "confirmationDeadline" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "declinedTeacherIds" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "substituteTeacherName" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "originalTeacherName" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "isAutoGenerated" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "isManual" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "isDutyLesson" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "isUnallocated" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "unallocatedReason" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "jointLabel" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "isJoint" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "jointStreams" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "jointCourses" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_allocations" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."school_remedial_subjects"
CREATE TABLE IF NOT EXISTS public."school_remedial_subjects" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "priority" TEXT;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "weeklyOccurrences" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "preferredDayType" TEXT;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "allowedDays" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_subjects" ADD COLUMN IF NOT EXISTS "allowedPeriods" JSONB DEFAULT '{}'::jsonb;

-- Table: public."school_remedial_sessions"
CREATE TABLE IF NOT EXISTS public."school_remedial_sessions" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "allocationId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "date" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dayOfWeek" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "startTime" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "endTime" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "durationHours" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "isWeekend" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "prefectId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "prefectName" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "prefectSignedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "payoutId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "stream" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "isJoint" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "jointStreams" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "prefectToken" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "durationMinutes" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "hours" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "scheduledStartTime" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "scheduledEndTime" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "scheduledDurationMinutes" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "earlyLoginMinutesOmitted" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "cappedAtTimetable" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "loggedOutEarly" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "isDutyLesson" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "qrToken" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "verifiedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyApproved" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyApprovedBy" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyApprovedById" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyApprovedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyNotes" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyRejected" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyRejectionReason" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyRejectedBy" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dutyRejectedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherApproved" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherApprovedBy" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherApprovedById" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherApprovedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherNotes" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherRejected" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherRejectionReason" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherRejectedBy" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "headteacherRejectedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "operationsDisbursed" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "operationsManagerName" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "operationsManagerId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "operationsDisbursedBy" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "operationsDisbursedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "cashDisbursedToDosAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "cashVoucherRef" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "paidByDosName" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "paidByDosId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "paidAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "teacherSignatureDataUrl" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dosRecipientSignature" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dosRecipientName" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dosRecipientId" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "dosReceivedAt" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "autoConcluded" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE public."school_remedial_sessions" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;

-- Table: public."school_remedial_payouts"
CREATE TABLE IF NOT EXISTS public."school_remedial_payouts" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "totalHours" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "hourlyRate" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "totalAmount" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "payoutDate" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "anonymousSignature" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "signedAt" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "operationsManagerName" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "operationsDisbursedAt" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "cashVoucherRef" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "dosRecipientSignature" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "dosRecipientName" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "dosRecipientId" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "dosReceivedAt" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "dosDisbursedBy" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "paidByDosName" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "paidByDosId" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "paidAt" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "teacherSignatureDataUrl" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "sessionIds" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "headteacherAuthorizedBy" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "headteacherAuthorizedAt" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "operationsDisbursedBy" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "dosDisbursedAt" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "openingBalanceIncluded" TEXT;
ALTER TABLE public."school_remedial_payouts" ADD COLUMN IF NOT EXISTS "earnedAmount" TEXT;

-- Table: public."school_remedial_duty_roster"
CREATE TABLE IF NOT EXISTS public."school_remedial_duty_roster" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "term" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "weekNumber" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "weekLabel" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "year" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "teacherName" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "teacherCode" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "courseId" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "subjectId" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "subjectName" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "stream" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "saturdayStartTime" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "saturdayEndTime" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "sundayStartTime" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "sundayEndTime" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "saturdayAllocated" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "sundayAllocated" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "autoAllocatedSaturday" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "autoAllocatedSunday" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "saturdaySessionId" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "sundaySessionId" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "dutyType" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "weekdayDay" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "weekdayStartTime" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "weekdayEndTime" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "weekdayAllocated" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "weekdaySessionId" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "dutyPayRate" NUMERIC DEFAULT 0;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "dutyPayType" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "success" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."school_remedial_duty_roster" ADD COLUMN IF NOT EXISTS "offlineFallback" BOOLEAN DEFAULT FALSE;

-- Table: public."retail_customers"
CREATE TABLE IF NOT EXISTS public."retail_customers" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "loyaltyPoints" NUMERIC DEFAULT 0;
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "totalSpent" TEXT;
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."retail_customers" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."retail_stock_receipts"
CREATE TABLE IF NOT EXISTS public."retail_stock_receipts" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "supplierId" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "supplierName" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "referenceNumber" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "receiptDate" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "totalAmount" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "items" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."retail_stock_receipts" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."retail_stock_transfers"
CREATE TABLE IF NOT EXISTS public."retail_stock_transfers" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "sourceStoreId" TEXT;
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "destinationStoreId" TEXT;
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "requestedById" TEXT;
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "approvedById" TEXT;
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."retail_stock_transfers" ADD COLUMN IF NOT EXISTS "completedAt" TEXT;

-- Table: public."retail_stock_transfer_items"
CREATE TABLE IF NOT EXISTS public."retail_stock_transfer_items" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."retail_stock_transfer_items" ADD COLUMN IF NOT EXISTS "transferId" TEXT;
ALTER TABLE public."retail_stock_transfer_items" ADD COLUMN IF NOT EXISTS "itemId" TEXT;
ALTER TABLE public."retail_stock_transfer_items" ADD COLUMN IF NOT EXISTS "quantity" NUMERIC DEFAULT 0;
ALTER TABLE public."retail_stock_transfer_items" ADD COLUMN IF NOT EXISTS "serialNumbers" TEXT;

-- Table: public."retail_wishlist"
CREATE TABLE IF NOT EXISTS public."retail_wishlist" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "customerName" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "productQuery" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "maxBudget" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "urgency" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "capturedById" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "isMatched" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "notifiedAt" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."retail_wishlist" ADD COLUMN IF NOT EXISTS "status" TEXT;

-- Table: public."retail_couriers"
CREATE TABLE IF NOT EXISTS public."retail_couriers" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "companyName" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "courierName" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "fullName" TEXT;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."retail_couriers" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."retail_delivery_rates"
CREATE TABLE IF NOT EXISTS public."retail_delivery_rates" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "courierId" TEXT;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "destination" TEXT;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "rate" TEXT;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "estimatedDays" NUMERIC DEFAULT 0;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "courierName" TEXT;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."retail_delivery_rates" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."retail_commissions_ledger"
CREATE TABLE IF NOT EXISTS public."retail_commissions_ledger" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "agentId" TEXT;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "saleId" TEXT;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "itemId" TEXT;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "serialNumber" TEXT;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "basePrice" TEXT;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "soldPrice" TEXT;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "commissionAmount" TEXT;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "isPaid" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."retail_commissions_ledger" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."carwash_accounts"
CREATE TABLE IF NOT EXISTS public."carwash_accounts" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."carwash_accounts" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."carwash_accounts" ADD COLUMN IF NOT EXISTS "accountCode" TEXT;
ALTER TABLE public."carwash_accounts" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."carwash_accounts" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE public."carwash_accounts" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."carwash_accounts" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."carwash_accounts" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."carwash_accounts" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."carwash_add_ons"
CREATE TABLE IF NOT EXISTS public."carwash_add_ons" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."carwash_add_ons" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."carwash_add_ons" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."carwash_add_ons" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."carwash_add_ons" ADD COLUMN IF NOT EXISTS "price" TEXT;
ALTER TABLE public."carwash_add_ons" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."carwash_add_ons" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."carwash_expenses"
CREATE TABLE IF NOT EXISTS public."carwash_expenses" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "expenseDate" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "amount" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "journalEntryId" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."carwash_expenses" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."carwash_payroll"
CREATE TABLE IF NOT EXISTS public."carwash_payroll" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "periodStart" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "periodEnd" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "baseSalary" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "commissionEarned" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "advancesTaken" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "deductions" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "totalPay" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "paymentDate" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "journalEntryId" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "processedBy" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "nssf" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "shif" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "paye" TEXT;
ALTER TABLE public."carwash_payroll" ADD COLUMN IF NOT EXISTS "housingLevy" TEXT;

-- Table: public."carwash_journal_entries"
CREATE TABLE IF NOT EXISTS public."carwash_journal_entries" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "entryNumber" TEXT;
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "entryDate" TEXT;
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "referenceType" TEXT;
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "referenceId" TEXT;
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "createdBy" TEXT;
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."carwash_journal_entries" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."carwash_journal_lines"
CREATE TABLE IF NOT EXISTS public."carwash_journal_lines" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."carwash_journal_lines" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."carwash_journal_lines" ADD COLUMN IF NOT EXISTS "entryId" TEXT;
ALTER TABLE public."carwash_journal_lines" ADD COLUMN IF NOT EXISTS "accountId" TEXT;
ALTER TABLE public."carwash_journal_lines" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."carwash_journal_lines" ADD COLUMN IF NOT EXISTS "debit" TEXT;
ALTER TABLE public."carwash_journal_lines" ADD COLUMN IF NOT EXISTS "credit" TEXT;
ALTER TABLE public."carwash_journal_lines" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."his_billing_settings"
CREATE TABLE IF NOT EXISTS public."his_billing_settings" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "invoicePrefix" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "invoiceStartNumber" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "receiptPrefix" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "receiptStartNumber" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "claimPrefix" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "claimStartNumber" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "currency" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "financialYear" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "paymentTermsDays" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "zeroPadLength" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "includeYearInNumber" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "autoResetYearly" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."his_billing_settings" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."his_payments"
CREATE TABLE IF NOT EXISTS public."his_payments" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "invoiceId" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "patientId" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "patientName" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "receiptNumber" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "amount" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "transactionReference" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "paymentDate" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."his_payments" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."his_tariffs"
CREATE TABLE IF NOT EXISTS public."his_tariffs" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "code" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "type" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "cashRate" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "coverRate" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "cashConsultation" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "coverConsultation" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "specialistCashConsultation" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "specialistCoverConsultation" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "emergencyCashConsultation" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "emergencyCoverConsultation" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "isCoverable" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "emergencySurcharge" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "revisitFee" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "mchClinicType" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "ancVisitNumber" TEXT;
ALTER TABLE public."his_tariffs" ADD COLUMN IF NOT EXISTS "packageType" TEXT;

-- Table: public."his_patient_id_config"
CREATE TABLE IF NOT EXISTS public."his_patient_id_config" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."his_patient_id_config" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."his_patient_id_config" ADD COLUMN IF NOT EXISTS "customPrefix" TEXT;
ALTER TABLE public."his_patient_id_config" ADD COLUMN IF NOT EXISTS "startNumber" TEXT;
ALTER TABLE public."his_patient_id_config" ADD COLUMN IF NOT EXISTS "zeroPadLength" TEXT;
ALTER TABLE public."his_patient_id_config" ADD COLUMN IF NOT EXISTS "includeYear" TEXT;
ALTER TABLE public."his_patient_id_config" ADD COLUMN IF NOT EXISTS "autoAssign" TEXT;
ALTER TABLE public."his_patient_id_config" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."his_patient_id_config" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."his_anc_records"
CREATE TABLE IF NOT EXISTS public."his_anc_records" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "institutionid" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "motherId" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "motherName" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "lmp" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "edd" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "gravida" NUMERIC DEFAULT 0;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "parity" NUMERIC DEFAULT 0;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "gestationWeeks" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "rhesus" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "heightCm" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "highRiskFactors" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "pmtctStatus" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "syphilisStatus" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "hepatitisBStatus" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "ultrasoundSummary" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "visits" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "enrolledBy" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."his_anc_records" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."pm_settings"
CREATE TABLE IF NOT EXISTS public."pm_settings" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."pm_settings" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."pm_settings" ADD COLUMN IF NOT EXISTS "branding" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."pm_settings" ADD COLUMN IF NOT EXISTS "rentReminders" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."pm_settings" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."pm_settings" ADD COLUMN IF NOT EXISTS "numbering" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."pm_settings" ADD COLUMN IF NOT EXISTS "defaultRentDueDate" NUMERIC DEFAULT 0;

-- Table: public."pm_landlords"
CREATE TABLE IF NOT EXISTS public."pm_landlords" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "idNumber" TEXT;
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "taxPin" TEXT;
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "bankDetails" TEXT;
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."pm_landlords" ADD COLUMN IF NOT EXISTS "preferredPaymentMethod" TEXT;

-- Table: public."pm_expenses"
CREATE TABLE IF NOT EXISTS public."pm_expenses" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "voucherNumber" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "propertyId" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "unitId" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "payeeName" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "payeePhone" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "amount" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "paymentDate" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "reference" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "receiptUrl" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."pm_expenses" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."pm_inspections"
CREATE TABLE IF NOT EXISTS public."pm_inspections" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "leaseId" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "inspectionDate" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "inspectedBy" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "structuralCondition" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "cleaningCondition" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "fittingsCondition" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "repairsRequired" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "estimatedRepairCost" NUMERIC DEFAULT 0;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "tenantSignoff" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "structuralComments" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "cleaningComments" TEXT;
ALTER TABLE public."pm_inspections" ADD COLUMN IF NOT EXISTS "fittingsComments" TEXT;

-- Table: public."pm_notices"
CREATE TABLE IF NOT EXISTS public."pm_notices" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "leaseId" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "noticeType" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "issueDate" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "effectiveDate" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "messageBody" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."pm_notices" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."fuel_pumps"
CREATE TABLE IF NOT EXISTS public."fuel_pumps" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."fuel_pumps" ADD COLUMN IF NOT EXISTS "tankId" TEXT;
ALTER TABLE public."fuel_pumps" ADD COLUMN IF NOT EXISTS "pumpNumber" TEXT;
ALTER TABLE public."fuel_pumps" ADD COLUMN IF NOT EXISTS "nozzleCount" NUMERIC DEFAULT 0;
ALTER TABLE public."fuel_pumps" ADD COLUMN IF NOT EXISTS "currentTotalizerReading" TEXT;
ALTER TABLE public."fuel_pumps" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."fuel_pumps" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."fuel_pumps" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."fuel_pumps" ADD COLUMN IF NOT EXISTS "stationId" TEXT;

-- Table: public."fuel_tanks"
CREATE TABLE IF NOT EXISTS public."fuel_tanks" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."fuel_tanks" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."fuel_tanks" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."fuel_tanks" ADD COLUMN IF NOT EXISTS "fuelType" TEXT;
ALTER TABLE public."fuel_tanks" ADD COLUMN IF NOT EXISTS "capacityLiters" TEXT;
ALTER TABLE public."fuel_tanks" ADD COLUMN IF NOT EXISTS "currentLevelLiters" TEXT;
ALTER TABLE public."fuel_tanks" ADD COLUMN IF NOT EXISTS "lowLevelThreshold" TEXT;
ALTER TABLE public."fuel_tanks" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."fuel_tanks" ADD COLUMN IF NOT EXISTS "stationId" TEXT;

-- Table: public."coop_monthly_payouts"
CREATE TABLE IF NOT EXISTS public."coop_monthly_payouts" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "farmerId" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "payoutMonth" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "grossPayout" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "logisticsDeduction" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "agrovetDeduction" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "saccoDeduction" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "netPayout" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "paidAt" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "initiatedBy" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "initiatedAt" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "approvedAt" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "batchId" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "disbursementMethod" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "disbursementReference" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "disbursementAccount" TEXT;
ALTER TABLE public."coop_monthly_payouts" ADD COLUMN IF NOT EXISTS "disbursementDate" TEXT;

-- Table: public."coop_agrovet_inventory"
CREATE TABLE IF NOT EXISTS public."coop_agrovet_inventory" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "itemName" TEXT;
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "unitPrice" TEXT;
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "quantity" NUMERIC DEFAULT 0;
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "reorderLevel" NUMERIC DEFAULT 0;
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "supplier" TEXT;
ALTER TABLE public."coop_agrovet_inventory" ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;

-- Table: public."coop_agrovet_sales"
CREATE TABLE IF NOT EXISTS public."coop_agrovet_sales" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "farmerId" TEXT;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "saleDate" TEXT;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "amount" TEXT;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "isDeducted" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "deductionId" TEXT;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "itemId" TEXT;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "quantity" NUMERIC DEFAULT 0;
ALTER TABLE public."coop_agrovet_sales" ADD COLUMN IF NOT EXISTS "recordedBy" TEXT;

-- Table: public."alumni_posts"
CREATE TABLE IF NOT EXISTS public."alumni_posts" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "authorPhoto" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "mediaUrls" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "likes" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "commentsCount" NUMERIC DEFAULT 0;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "hashtags" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "isAnnouncement" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "eventDate" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "photoStorageProvider" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "photoExternalId" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "videoStorageProvider" TEXT;
ALTER TABLE public."alumni_posts" ADD COLUMN IF NOT EXISTS "videoExternalId" TEXT;

-- Table: public."alumni_comments"
CREATE TABLE IF NOT EXISTS public."alumni_comments" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."alumni_comments" ADD COLUMN IF NOT EXISTS "postId" TEXT;
ALTER TABLE public."alumni_comments" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE public."alumni_comments" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE public."alumni_comments" ADD COLUMN IF NOT EXISTS "authorPhoto" TEXT;
ALTER TABLE public."alumni_comments" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE public."alumni_comments" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."alumni_comments" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."alumni_messages"
CREATE TABLE IF NOT EXISTS public."alumni_messages" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."alumni_messages" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE public."alumni_messages" ADD COLUMN IF NOT EXISTS "receiverId" TEXT;
ALTER TABLE public."alumni_messages" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE public."alumni_messages" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."alumni_messages" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."alumni_messages" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."alumni_messages" ADD COLUMN IF NOT EXISTS "recipientId" TEXT;
ALTER TABLE public."alumni_messages" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

-- Table: public."alumni_jobs"
CREATE TABLE IF NOT EXISTS public."alumni_jobs" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "alumnaId" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "company" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "salaryRange" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "applyUrl" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."alumni_jobs" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

-- Table: public."alumni_document_requests"
CREATE TABLE IF NOT EXISTS public."alumni_document_requests" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "alumnaId" TEXT;
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "documentType" TEXT;
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "purpose" TEXT;
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "deliveryMethod" TEXT;
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "notifiedAt" TEXT;
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."alumni_document_requests" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

-- Table: public."alumni_school_inbox"
CREATE TABLE IF NOT EXISTS public."alumni_school_inbox" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."alumni_school_inbox" ADD COLUMN IF NOT EXISTS "alumnaId" TEXT;
ALTER TABLE public."alumni_school_inbox" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."alumni_school_inbox" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE public."alumni_school_inbox" ADD COLUMN IF NOT EXISTS "direction" TEXT;
ALTER TABLE public."alumni_school_inbox" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."alumni_school_inbox" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."alumni_school_inbox" ADD COLUMN IF NOT EXISTS "schoolId" TEXT;

-- Table: public."political_parties"
CREATE TABLE IF NOT EXISTS public."political_parties" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."political_parties" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."political_parties" ADD COLUMN IF NOT EXISTS "acronym" TEXT;
ALTER TABLE public."political_parties" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE public."political_parties" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."political_parties" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."campaign_profiles"
CREATE TABLE IF NOT EXISTS public."campaign_profiles" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "candidateName" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "position" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "partyName" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "constituencyWard" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "manifestoAiDraft" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "tagline" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "targetVoterCount" NUMERIC DEFAULT 0;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "agendas" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "inviteSlug" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "brandingStatus" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "brandingConfig" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "county" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "constituency" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "ward" TEXT;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "campaignPosters" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."campaign_profiles" ADD COLUMN IF NOT EXISTS "profilePicture" TEXT;

-- Table: public."campaign_groups"
CREATE TABLE IF NOT EXISTS public."campaign_groups" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."campaign_groups" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE public."campaign_groups" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."campaign_groups" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."campaign_groups" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."campaign_groups" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."campaign_group_members"
CREATE TABLE IF NOT EXISTS public."campaign_group_members" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."campaign_group_members" ADD COLUMN IF NOT EXISTS "groupId" TEXT;
ALTER TABLE public."campaign_group_members" ADD COLUMN IF NOT EXISTS "voterId" TEXT;
ALTER TABLE public."campaign_group_members" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE public."campaign_group_members" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."campaign_group_members" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."campaign_villages"
CREATE TABLE IF NOT EXISTS public."campaign_villages" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."campaign_villages" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE public."campaign_villages" ADD COLUMN IF NOT EXISTS "wardName" TEXT;
ALTER TABLE public."campaign_villages" ADD COLUMN IF NOT EXISTS "villageName" TEXT;
ALTER TABLE public."campaign_villages" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."campaign_villages" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."campaign_events"
CREATE TABLE IF NOT EXISTS public."campaign_events" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "eventType" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "eventTime" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "attendanceEstimate" NUMERIC DEFAULT 0;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "actualAttendance" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "aiSpeechNotes" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."campaign_events" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."voter_outreach"
CREATE TABLE IF NOT EXISTS public."voter_outreach" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "campaignId" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "voterName" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "idNumber" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "votingCenter" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "ward" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "lastContactedAt" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "village" TEXT;
ALTER TABLE public."voter_outreach" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;

-- Table: public."heritage_totems"
CREATE TABLE IF NOT EXISTS public."heritage_totems" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "totemName" TEXT;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "motto" TEXT;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "totemPreset" TEXT;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "customImageUrl" TEXT;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "animationMode" TEXT;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "rotationSpeed" TEXT;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "glowColor" TEXT;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "showAsTreeRoot" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."heritage_totems" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."law_clients"
CREATE TABLE IF NOT EXISTS public."law_clients" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."law_clients" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."law_clients" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."law_clients" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE public."law_clients" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE public."law_clients" ADD COLUMN IF NOT EXISTS "clientType" TEXT;
ALTER TABLE public."law_clients" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."law_clients" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."demo_requests"
CREATE TABLE IF NOT EXISTS public."demo_requests" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "institution" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "requestedAt" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "conversationTranscript" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "quoteAmount" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "paymentStatus" TEXT;
ALTER TABLE public."demo_requests" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."sms_logs"
CREATE TABLE IF NOT EXISTS public."sms_logs" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "senderId" TEXT;
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "recipient" TEXT;
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "units" NUMERIC DEFAULT 0;
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "provider" TEXT;
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "gatewayResponse" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."sms_logs" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."sms_outbox"
CREATE TABLE IF NOT EXISTS public."sms_outbox" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."sms_outbox" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."sms_outbox" ADD COLUMN IF NOT EXISTS "recipient" TEXT;
ALTER TABLE public."sms_outbox" ADD COLUMN IF NOT EXISTS "message" TEXT;
ALTER TABLE public."sms_outbox" ADD COLUMN IF NOT EXISTS "units" NUMERIC DEFAULT 0;
ALTER TABLE public."sms_outbox" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."sms_outbox" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."whatsapp_configs"
CREATE TABLE IF NOT EXISTS public."whatsapp_configs" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "providerType" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "gatewayUrl" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "apiKey" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "instanceName" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "phoneNumber" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "isConnected" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "qrCodeData" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "metaPhoneNumberId" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "metaAccessToken" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "metaWabaId" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "autoSendReceipts" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "autoSendFeeReminders" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "autoSendAcademicResults" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "allowInstitutionFailover" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."whatsapp_configs" ADD COLUMN IF NOT EXISTS "globalDispatchEnabled" BOOLEAN DEFAULT FALSE;

-- Table: public."whatsapp_logs"
CREATE TABLE IF NOT EXISTS public."whatsapp_logs" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "recipient" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "recipientName" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "messageType" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "mediaUrl" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "fileName" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "responsePayload" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "errorMessage" TEXT;
ALTER TABLE public."whatsapp_logs" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;

-- Table: public."referral_program_settings"
CREATE TABLE IF NOT EXISTS public."referral_program_settings" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "isProgramActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "defaultCommissionType" TEXT;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "defaultCommissionRate" TEXT;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "fixedCommissionAmount" TEXT;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "minInvoiceAmountForCommission" TEXT;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "payoutTermsDays" NUMERIC DEFAULT 0;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "termsAndConditions" TEXT;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "metadata" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."referral_program_settings" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."revision_marketplace"
CREATE TABLE IF NOT EXISTS public."revision_marketplace" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "subject" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "gradeLevel" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "curriculum" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "topic" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "price" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "fileUrl" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "authorId" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "authorName" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "downloadsCount" NUMERIC DEFAULT 0;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "rating" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "isAiGenerated" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "contentJson" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."revision_marketplace" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."student_subscription_plans"
CREATE TABLE IF NOT EXISTS public."student_subscription_plans" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "amount" TEXT;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "features" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "applicableClasses" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "smsAllocatedPerStudent" NUMERIC DEFAULT 0;
ALTER TABLE public."student_subscription_plans" ADD COLUMN IF NOT EXISTS "smsUsageType" TEXT;

-- Table: public."student_subscriptions"
CREATE TABLE IF NOT EXISTS public."student_subscriptions" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "studentId" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "studentName" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "className" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "planId" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "planName" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "billingCycle" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "amount" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "startDate" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "expiryDate" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."student_subscriptions" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."branding_price_settings"
CREATE TABLE IF NOT EXISTS public."branding_price_settings" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."branding_price_settings" ADD COLUMN IF NOT EXISTS "basePrice" TEXT;
ALTER TABLE public."branding_price_settings" ADD COLUMN IF NOT EXISTS "renewPrice" TEXT;
ALTER TABLE public."branding_price_settings" ADD COLUMN IF NOT EXISTS "features" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."branding_price_settings" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."hospitality_items"
CREATE TABLE IF NOT EXISTS public."hospitality_items" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "price" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "features" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "duration" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "images" JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "rating" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "isAvailable" BOOLEAN DEFAULT FALSE;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."hospitality_items" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."teacher_checkins"
CREATE TABLE IF NOT EXISTS public."teacher_checkins" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "teacherId" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "institutionId" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "checkInDate" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "morningCheckInTime" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "morningCheckInStatus" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "morningLocation" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "morningNotes" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "afternoonCheckInTime" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "afternoonCheckInStatus" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "afternoonLocation" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "afternoonNotes" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "createdAt" TEXT;
ALTER TABLE public."teacher_checkins" ADD COLUMN IF NOT EXISTS "updatedAt" TEXT;

-- Table: public."reseller_sms_transactions"
CREATE TABLE IF NOT EXISTS public."reseller_sms_transactions" (
    "id" TEXT PRIMARY KEY
);
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "resellerId" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "reseller_id" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "resellerName" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "reseller_name" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "tenant_id" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "tenantName" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "tenant_name" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "units" NUMERIC DEFAULT 0;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "ratePerUnit" NUMERIC DEFAULT 0;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "rate_per_unit" NUMERIC DEFAULT 0;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "wholesaleRate" NUMERIC DEFAULT 0;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "wholesale_rate" NUMERIC DEFAULT 0;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "totalAmount" NUMERIC DEFAULT 0;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "total_amount" NUMERIC DEFAULT 0;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "profit" NUMERIC DEFAULT 0;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "paymentMethod" TEXT DEFAULT 'mpesa';
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "payment_method" TEXT DEFAULT 'mpesa';
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public."reseller_sms_transactions" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;
