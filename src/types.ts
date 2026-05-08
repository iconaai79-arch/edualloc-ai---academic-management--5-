/** HIS Nexus Type Definitions **/
export type Role = 'super_admin' | 'reseller' | 'county_admin' | 'county_staff' | 'admin' | 'staff' | 'hod' | 'lecturer' | 'student' | 'practice_teacher' | 'academics_officer' | 'parent' | 'librarian' | 'security' | 'info_desk' | 'store' | 'supplier' | 'head_teacher' | 'dos' | 'teacher' | 'deputy' | 'tto' | 'county_secretary' | 'county_driver' | 'county_store_keeper' | 'county_teacher' | 'county_director' | 'county_co' | 'county_cec' | 'county_deputy_governor' | 'county_governor' | 'boarding_master' | 'driver' | 'transport_assistant' | 'agrovet_admin' | 'coop_admin' | 'coop_chairman' | 'sacco_officer' | 'property_admin' | 'his_admin' | 'pharmacy_admin' | 'pharmacist' | 'carwash_admin' | 'carwash_cashier' | 'carwash_waiter' | 'carwash_attendant' | 'transport_admin' | 'carwash_customer' | 'landlord' | 'tenant' | 'field_agent' | 'retail_agent' | 'mechanic_admin' | 'customer' | 'lead' | 'cooperative_manager' | 'legal_admin' | 'farmer' | 'rider' | 'church_admin' | 'church_member' | 'pastor' | 'deacon' | 'elder' | 'treasurer' | 'secretary' | 'worker' | 'member' | 'visitor' | 'driving_instructor' | 'construction_admin' | 'community_admin' | 'family_admin' | 'hospitality_admin' | 'alumni_admin' | 'campaign_admin' | 'campaign_agent' | 'fuel_admin' | 'attendant' | 'finance_officer' | 'hr_officer' | 'director' | 'finance' | 'sales' | 'reception';

export type RankingCriteria = 'points' | 'mean_points' | 'total_marks';

export interface AcademicConfig {
    rankingEnabled: boolean;
    rankingCriteria: RankingCriteria;
    subjectRankingEnabled: boolean;
    assessmentWeighting?: Record<string, number>; // assessmentId -> weight (percentage)
    showAttendance: boolean;
    showFeeBalance: boolean;
    defaultIsSummative?: boolean;
}

export interface DemoRequest {
    id: string;
    name: string;
    email: string;
    institution: string;
    phone: string;
    message?: string;
    status: 'new' | 'contacted' | 'scheduled' | 'completed' | 'cancelled';
    requestedAt: string;
    createdAt: string;
}

export interface MarketingProspect {
    id: string;
    businessName: string;
    niche: string;
    email: string;
    phone?: string;
    websiteUrl?: string;
    location?: string;
    leadScore: number;
    aiSummary?: string;
    status: 'new' | 'contacted' | 'qualified' | 'customer' | 'ignored';
    lastProcessedAt: string;
    createdAt: string;
}

export interface FtpConfig {
    host: string;
    port: number;
    user: string;
    password?: string;
    secure?: boolean;
    remoteRoot?: string;
    publicUrlRoot?: string;
}

export interface CampaignProfile {
    id: string;
    institutionId: string;
    candidateName: string;
    position: 'MCA' | 'MP' | 'Women Rep' | 'Senator' | 'Governor' | 'President' | 'Deputy';
    partyName?: string;
    county?: string;
    constituency?: string;
    ward?: string;
    constituencyWard?: string; // Legacy/Display
    manifestoAiDraft?: string;
    agendas?: string[]; // Structured list of key agendas
    tagline?: string;
    logoUrl?: string;
    targetVoterCount: number;
    inviteSlug?: string;
    profilePicture?: string;
    campaignPosters?: string[];
    brandingStatus?: 'none' | 'pending' | 'paid' | 'active';
    brandingConfig?: {
        logoVerified?: boolean;
        brandedSmsEnabled?: boolean;
        posterStyle?: string;
    };
    createdAt: string;
}

export interface VoterOutreach {
    id: string;
    campaignId: string;
    institutionId?: string;
    voterName?: string;
    phoneNumber: string;
    idNumber?: string;
    votingCenter?: string;
    ward?: string;
    village?: string;
    status: 'uncontacted' | 'supporter' | 'undecided' | 'opposed';
    lastContactedAt?: string;
    notes?: string;
    createdAt: string;
}

export interface CampaignVillage {
    id: string;
    campaignId: string;
    institutionId?: string;
    wardName: string;
    villageName: string;
    createdAt: string;
}

export interface DisciplineIncident {
    id: string;
    institutionId: string;
    studentId: string;
    studentName: string;
    type: string;
    incidentType?: string;
    severity?: 'Low' | 'Medium' | 'High' | 'Critical';
    description: string;
    actionTaken?: string;
    status: 'pending' | 'resolved' | 'escalated' | 'Pending' | 'Resolved' | 'Escalated';
    timestamp: string;
    recordedBy: string;
}

export interface Expense {
    id: string;
    institutionId: string;
    category: string | 'Salaries' | 'Utilities' | 'Maintenance' | 'Supplies' | 'Marketing' | 'Taxes' | 'Other';
    amount: number;
    description: string;
    date: string;
    recordedBy?: string;
    status?: 'pending' | 'approved' | 'paid' | 'draft';
    paymentMethod?: string;
    attachmentUrl?: string;
    referenceNumber?: string;
}

export interface FinancialGoal {
    id: string;
    institutionId: string;
    title?: string;
    targetAmount: number;
    currentAmount?: number;
    deadline?: string;
    status?: 'on_track' | 'behind' | 'achieved';
    period?: string;
    category?: 'Fees' | 'Donations' | 'Grants' | 'Other';
    startDate?: string;
    endDate?: string;
}

export interface PayrollRecord {
    id: string;
    institutionId: string;
    staffId: string;
    staffName?: string;
    month: string;
    year?: number;
    basicPay?: number;
    basicSalary?: number;
    allowances: number | { name: string; amount: number }[];
    deductions: number | { name: string; amount: number }[];
    netPay?: number;
    netSalary?: number;
    status: 'pending' | 'processed' | 'paid' | 'draft' | 'approved';
    paymentDate?: string;
    paymentMethod?: string;
    recordedBy?: string;
    processedAt?: string;
}

export interface CampaignGroup {
    id: string;
    campaignId: string;
    institutionId?: string;
    name: string;
    description?: string;
    createdAt: string;
}

export interface CampaignGroupMember {
    id: string;
    groupId: string;
    voterId: string;
    campaignId: string;
    institutionId?: string;
    createdAt: string;
}

export interface CampaignVote {
    id: string;
    voterId: string;
    campaignId: string;
    position: string;
    rating: number;
    comment?: string;
    createdAt: string;
}

export interface CampaignEvent {
    id: string;
    campaignId: string;
    institutionId?: string;
    title: string;
    description?: string;
    location: string;
    eventType: 'rally' | 'townhall' | 'strategy_meeting' | 'door_to_door' | 'fundraiser';
    eventTime: string;
    attendanceEstimate: number;
    actualAttendance?: number;
    aiSpeechNotes?: string;
    createdAt: string;
}


export interface Unavailability {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    status: 'active' | 'inactive';
}

export interface User {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    staffId?: string;
    role: Role;
    roles?: Role[];
    institutionId: string;
    password?: string;
    departmentId?: string;
    expertise?: string[];
    unavailability?: Unavailability[];
    courseId?: string;
    courseLevelId?: string;
    enrolledSubjectIds?: string[];
    parentIds?: string[];
    studentIds?: string[];
    gender?: 'Male' | 'Female' | 'Other';
    profilePhotoUrl?: string | null;
    passwordLastUpdated?: string;
    passwordExpiresAt?: string;
    countyId?: string;
    isImpersonated?: boolean;
    vehicleId?: string;
    farmerId?: string;
    riderId?: string;
    driverType?: 'staff' | 'private';
    smsBalance?: number;
    subscriptionStatus?: 'active' | 'expired' | 'none';
    subscriptionExpiry?: string;
    walletBalance?: number;
    loyaltyPoints?: number;
    autoMarketPlaceUrl?: string;
    metadata?: any;
    createdAt?: string;
}

export interface GradeDefinition {
    id: string;
    grade: string;
    minScore: number;
    maxScore: number;
    points: number;
    comment: string;
}

export interface GradingSystem {
    id: string;
    name: string;
    definitions: GradeDefinition[];
}

export interface ExamSession {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
}

export interface ExamTimetableSettings {
    sessionsPerDay: ExamSession[];
    rules: string[];
}

export interface ScheduleProfile {
    id: string;
    name: string;
    operatingDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
    startTime: string;
    endTime: string;
    periods: TimetablePeriod[];
    cellSpanMinutes: number;
    breaks: Break[];
}

export interface County {
    id: string;
    name: string;
    code: string;
    email: string;
    phoneNumber: string;
    adminName?: string;
    status: 'active' | 'suspended';
    createdAt: string;
    location?: { latitude: number; longitude: number };
    logoUrl?: string;
    letterheadUrl?: string;
    primaryColor?: string;
    secondaryColor?: string;
    motto?: string;
    website?: string;
    registered_voters?: number;
}

export interface PoliticalParty {
    id: string;
    name: string;
    acronym?: string;
    logoUrl?: string;
    description?: string;
    createdAt?: string;
}

export interface Constituency {
    id: string;
    countyId: string;
    name: string;
    code?: string;
    registered_voters?: number;
    createdAt?: string;
}

export interface Ward {
    id: string;
    constituencyId: string;
    name: string;
    code?: string;
    registered_voters?: number;
    createdAt?: string;
}


export interface ICDCode {
    id: string;
    code: string;
    description: string;
    category?: string;
    version?: string;
    createdAt?: string;
}

export interface HISClaim {
    id: string;
    institutionId: string;
    patientId: string;
    visitId?: string;
    icdCode: string;
    serviceType: string;
    amount: number;
    status: 'Pending' | 'Submitted' | 'Approved' | 'Rejected' | 'Paid';
    claimNumber: string;
    shaResponseCode?: string;
    createdAt: string;
}

export interface CoopSettings {
    payoutRate?: number;
    milkPrice?: number;
    teaPrice?: number;
    coffeePrice?: number;
    advanceLimit?: number;
    farmerSmsBillingEnabled?: boolean;
    requireCurrentMonthDeliveryForCredit?: boolean;
    approverIds?: string[]; // IDs of users authorized to approve sensitive transactions
}

export interface Institution {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    institutionType: 'Education' | 'Business' | 'Broadcaster' | 'Reseller' | 'HIS' | 'Cooperative' | 'SACCO' | 'Agrovet' | 'Church' | 'Property Management' | 'Pharmacy' | 'Primary' | 'Secondary' | 'Law Firm' | 'Driving School' | 'Logistics' | 'Community' | 'Hospitality' | 'Construction' | 'Chemist' | 'Political Campaign' | 'Fuel Station' | 'Retail' | 'Transport' | 'Car Showroom';
    category?: string;
    createdAt?: string;
    businessSubType?: string; // Legacy field, eventually merge with category
    slug?: string;
    status: 'active' | 'trial' | 'suspended';
    subscriptionEndsAt?: string;
    trialEndsAt?: string;
    institutionCode?: string;
    themeColor?: string;
    logoUrl?: string | null;
    footerImageUrl?: string | null;
    letterheadConfig?: LetterheadConfig;
    location?: { latitude: number; longitude: number };
    customSubscriptionPrice?: { monthly?: number; yearly?: number };
    gradingSystems?: GradingSystem[];
    gradingSystem?: GradeDefinition[];
    activeGradingSystemId?: string;
    timetableSettings?: TimetableSettings;
    examTimetableSettings?: ExamTimetableSettings;
    useAllocationRequests?: boolean;
    scheduleProfiles?: ScheduleProfile[];
    aiModelTier?: 'free' | 'premium';
    streamDefinitions?: string[];
    countyId?: string;
    subCounty?: string;
    constituency?: string;
    ward?: string;
    resellerId?: string;
    isOtpEnabled?: boolean;
    smsBalance?: number;
    customSmsPrice?: number;
    smsConfig?: SmsConfig;
    mpesaConfig?: MpesaConfig;
    emailConfig?: EmailConfig;
    customModulePricing?: Record<string, { monthly?: number; yearly?: number }>;
    parentAbsenceNotificationsEnabled?: boolean;
    marketplaceEnabled?: boolean;
    listingQuota?: number;
    airtelMoneyConfig?: AirtelMoneyConfig;
    intasendConfig?: IntasendConfig;
    ncbaConfig?: NcbaConfig;
    googleDriveConfig?: GoogleDriveConfig;
    farmerSmsBillingEnabled?: boolean;
    moduleStates?: InstitutionModuleState[];
    coopSettings?: CoopSettings;
    academicConfig?: AcademicConfig;
    region?: string;
    uic?: string;
    knecCode?: string;
    cluster?: string;
    specialNeedType?: 'Regular' | 'SNE' | 'Integrated';
    disabilityType?: string;
    accommodationType?: 'Boarding' | 'Day' | 'Mixed';
    genderType?: 'Boys' | 'Girls' | 'Mixed';
    motto?: string;
    vision?: string;
    mission?: string;
    history?: string;
    showcaseCpanelUrl?: string;
    showcaseCpanelToken?: string;
    autoMarketPlaceUrl?: string;
}

export interface SchoolGallery {
    id: string;
    institutionId: string;
    imageUrl: string;
    caption?: string;
    eventDate?: string;
    sortOrder: number;
    createdAt: string;
}

export interface SchoolAd {
    id: string;
    institutionId: string;
    imageUrl: string;
    linkUrl?: string;
    title?: string;
    isActive: boolean;
    displayLocation: 'hero' | 'sidebar' | 'footer';
    createdAt: string;
}




export interface Department {
    id: string;
    name: string;
    institutionId: string;
}

export interface LessonStructure {
    periods: number;
    count: number;
    dedicatedRoomId?: string;
}

export interface Subject {
    id: string;
    code: string;
    name: string;
    description?: string;
    departmentId: string;
    institutionId: string;
    lessonStructure: LessonStructure[];
    isComplete?: boolean;
    hasExam?: boolean;
    dedicatedRoomId?: string;
    shortName?: string;
    targetCourseLevelId?: string;
}

export interface LevelSubjectMetadata {
    subjectId: string;
    lessonStructure?: LessonStructure[];
    dedicatedRoomId?: string;
}

export interface CourseLevel {
    id: string;
    name: string;
    subjectIds: string[];
    subjectMetadata?: LevelSubjectMetadata[];
    classTeacherId?: string;
    roomId?: string;
    scheduleProfileId?: string;
}

export interface Course {
    id: string;
    name: string;
    code: string;
    departmentId: string;
    institutionId: string;
    academicLevelId: string;
    levels: CourseLevel[];
    shortName?: string;
    curriculumType?: '8-4-4' | 'CBC' | 'Other';
    scheduleProfileId?: string;
}

export interface AcademicLevel {
    id: string;
    name: string;
    institutionId: string;
}

export interface Building {
    id: string;
    name: string;
    institutionId: string;
    location?: { latitude: number; longitude: number };
}

export interface Room {
    id: string;
    name: string;
    capacity: number;
    buildingId: string;
    institutionId: string;
    status: 'active' | 'inactive';
    equipment?: string[];
    location?: { latitude: number; longitude: number };
    shortName?: string;
    isShared?: boolean;
    concurrentSessions?: number;
}

export interface TimetablePeriod {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
}

export interface Break {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    status: 'active' | 'inactive';
}

export interface TimetableSettings {
    operatingDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
    startTime: string;
    endTime: string;
    periods: TimetablePeriod[];
    periodLengthMinutes: number;
    cellSpanMinutes: number;
    defaultScheduleProfileId?: string;
    maxPeriodsPerDay: number;
    minWeeklyPeriods: number;
    maxWeeklyPeriods: number;
    breaks: Break[];
    constraints: TimetableConstraint[];
    teacherRules?: TeacherLogicRule[];
}

export type TeacherRuleType = 'max_consecutive_lessons' | 'max_lessons_per_day' | 'min_lessons_per_day' | 'preferred_start_time' | 'preferred_end_time' | 'no_lessons_after';

export interface TeacherLogicRule {
    id: string;
    type: TeacherRuleType;
    value: any;
    lecturerId?: string; // If null/empty, applies to all
    description: string;
}

export type TimetableConstraintType = 'consecutive_subjects' | 'same_day_subjects' | 'same_day_must_subjects' | 'no_break_between_subjects' | 'subject_time_off' | 'non_consecutive_subjects' | 'different_day_subjects' | 'same_time_subjects';

export interface TimetableConstraint {
    id: string;
    type: TimetableConstraintType;
    subjectIds: string[];
    description?: string;
    day?: string;
    startTime?: string;
    endTime?: string;
}

export type RequestStatus = 'pending' | 'hod_approved' | 'approved' | 'disapproved' | 'deallocation_pending' | 'change_request_pending';
export type Priority = 'High' | 'Medium' | 'Low';

export interface AllocationRequestPreferences {
    preferredDays: ('Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday')[];
    preferredTimeSlots: ('Morning' | 'Afternoon')[];
    courseLevelIds?: string[];
}

export interface AllocationRequest {
    id: string;
    subjectId: string;
    lecturerId: string;
    institutionId: string;
    courseLevelIds?: string[];
    status: RequestStatus;
    timestamp: string;
    priority: Priority;
    academicYearId: string;
    semesterId: string;
    justification?: string;
    preferences?: AllocationRequestPreferences;
    signatureUrl?: string | null;
    requesterId?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    proposedChanges?: {
        priority?: Priority;
        justification?: string;
    };
}

export interface CommissionWithdrawalRequest {
    id: string;
    resellerId: string;
    resellerName: string;
    amount: number;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
    processedAt?: string;
    notes?: string;
    accountDetails?: string;
}

export interface TimetableEntry {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    subjectId: string;
    lecturerId: string;
    roomId: string;
    institutionId: string;
    academicYearId: string;
    semesterId: string;
    courseId: string;
    courseLevelId: string;
    attendanceStatus?: 'present' | 'absent' | 'late' | 'pending_absence_request' | 'approved_absence';
    isConflicting?: boolean;
    scenarioId?: string;
    versionName?: string;
    duration?: number;
    sharedWithPracticeTeacherId?: string | null;
    // Database aliases
    start_time?: string;
    end_time?: string;
    subject_id?: string;
    lecturer_id?: string;
    room_id?: string;
    course_id?: string;
    course_level_id?: string;
}

export interface AcademicYear {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    institutionId: string;
    status: 'active' | 'inactive';
}

export interface ExamPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
}

export interface SemesterSession {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    examPeriods?: ExamPeriod[];
}


export interface Semester {
    id: string;
    name: string;
    academicYearId: string;
    institutionId: string;
    startDate: string;
    endDate: string;
    status?: 'active' | 'inactive' | 'archived';
    requestDeadline?: string | null;
    enrollmentDeadline?: string | null;
    sessions?: SemesterSession[];
}

export interface LetterheadConfig {
    headerImageUrl: string | null;
    stampImageUrl: string | null;
}

export interface SmsConfig {
    provider: string;
    apiKey: string;
    apiSecret: string;
    fromNumber: string;
    baseUrl?: string;
    api_url?: string;
    method?: 'GET' | 'POST';
    headers?: { name: string; value: string }[];
    params?: { name: string; value: string }[];
    smsUnitPrice?: number;
    minSmsUnits?: number;
    accountId?: string;
    authToken?: string;
}

export interface EmailConfig {
    provider: 'smtp' | 'resend';
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    encryption?: 'tls' | 'ssl' | 'none';
    resendApiKey?: string;
    fromName: string;
    fromEmail: string;
}

export interface InstitutionModuleState {
    id: string;
    moduleId: string;
    institutionId: string;
    status: 'inactive' | 'trial' | 'active' | 'expired' | 'suspended';
    activatedAt?: string;
    trialEndsAt?: string;
    subscriptionEndsAt?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface SubscriptionConfig {
    defaultMonthlyPrice: number;
    defaultYearlyPrice: number;
    baseCostPerStudent?: number;
    libraryCostPerStudent?: number;
    boardingCostPerStudent?: number;
    transportCostPerStudent?: number;
}

export interface DatabaseConfig {
    dbType: 'mysql' | 'postgresql' | 'none';
    host: string;
    port: string;
    username: string;
    password?: string;
    dbName: string;
    supabaseUrl?: string;
    supabaseAnonKey?: string;
}

export interface MpesaConfig {
    paybillNumber: string;
    accountNumber: string;
    consumerKey: string;
    consumerSecret: string;
    passkey: string;
    environment?: 'sandbox' | 'production';
}

export interface NcbaConfig {
    clientId: string;
    clientSecret: string;
    username?: string;
    password?: string;
    consumerKey?: string;
    consumerSecret?: string;
    baseUrl: string;
    stkPushBaseUrl?: string;
    queryStkUrl?: string;
    paybill?: string;
    accountNumber?: string;
    authMethod?: 'bearer' | 'basic';
    isMock?: boolean;
    environment?: 'sandbox' | 'production';
}

export interface AirtelMoneyConfig {
    businessId: string;
    apiKey: string;
    consumerKey: string;
    consumerSecret: string;
    environment?: 'sandbox' | 'production';
}

export interface IntasendConfig {
    publishableKey: string;
    secretKey: string;
    environment?: 'sandbox' | 'test' | 'production';
}

export interface GoogleDriveConfig {
    clientId: string;
    clientSecret: string;
    refreshToken: string;
    folderId?: string;
    isActive: boolean;
}

export interface ShowcaseItem {
    id: string;
    title: string;
    description: string;
    imageUrl: string;
    link?: string;
    category?: string;
}

export interface CompanyDetails {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    logoUrl: string | null;
    marketplaceConfig?: {
        pricingAmount: number;
        customUrl: string;
    };
    showcaseConfig?: {
        enabled: boolean;
        showLoginLink?: boolean;
        cpanelUploadUrl?: string;
        cpanelSecret?: string;
        items?: ShowcaseItem[];
    };
    footerImageUrl?: string | null;
    applicationTitle?: string;
    themeColor?: string;
    subscriptionConfig: SubscriptionConfig;
    mpesaConfig: MpesaConfig;
    airtelMoneyConfig?: AirtelMoneyConfig;
    intasendConfig?: IntasendConfig;
    ncbaConfig?: NcbaConfig;
    googleDriveConfig?: GoogleDriveConfig;
    emailConfig: EmailConfig;
    smsConfig: SmsConfig;
    letterheadConfig: LetterheadConfig;
    databaseConfig: DatabaseConfig;
    ftpConfig?: FtpConfig;
    chatAssistantConfig?: {
        enabled: boolean;
        welcomeMessage?: string;
    };
    enforceGlobalOtp?: boolean;
    enabledGateways?: string[];
    smsBalance?: number;
    alumnaeJoiningFee?: number;
    alumnaeFeatureFee?: number;
    portalSettings?: {
        showAlumnaeHub: boolean;
        showTouristHub: boolean;
        showMarketplace: boolean;
        showCommunityHub: boolean;
        showTransportHub: boolean;
        publicRegistrationEnabled: boolean;
        alumnaeRegistrationFeeEnabled?: boolean;
    };
}

export interface UserTask {
    id: string;
    userId: string;
    institutionId?: string;
    title: string;
    isComplete: boolean;
    createdAt: string;
    dueDate?: string;
    completedAt?: string;
}

export interface ActivityLog {
    id: string;
    userId: string;
    userName: string;
    institutionId?: string;
    institutionName?: string;
    action: string;
    timestamp: string;
    ipAddress?: string;
    macAddress?: string;
    imei?: string;
    module?: 'Academics' | 'Finance' | 'Admissions' | 'Transport' | 'Settings';
    details?: string;
}

export interface AppNotification {
    id: string;
    userId: string;
    institutionId?: string;
    message: string;
    type: string;
    link?: string;
    isRead: boolean;
    timestamp: string;
}

export interface SmsLog {
    id: string;
    institutionId: string;
    senderId?: string;
    recipient: string;
    message: string;
    units: number;
    status: string;
    createdAt: string;
}

export interface SmsOutbox {
    id: string;
    institutionId: string;
    recipient: string;
    message: string;
    units: number;
    status: 'pending' | 'processing' | 'failed';
    createdAt: string;
}

export interface AgrovetSaleItem {
    id: string;
    saleId: string;
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    institutionId: string;
    createdAt: string;
}

export interface StudentAttendance {
    id: string;
    timetableEntryId: string;
    studentId: string;
    date: string;
    status: 'present' | 'absent' | 'late';
    markedBy: string;
    timestamp: string;
    institutionId?: string;
}

export type AssessmentType = 'formative' | 'summative' | 'diagnostic';

export interface Assessment {
    id: string;
    lecturerId: string;
    subjectId: string;
    title: string;
    type: string; // 'Mid Term', 'End Term', 'CAT', 'CBC'
    description: string;
    maxMarks: number;
    weighting?: number; // e.g. 30 for 30%, 70 for 70%
    assessmentDate: string;
    status: 'Draft' | 'In Progress' | 'Published' | 'Graded';
    year?: number;
    term?: number;
    curriculumType?: 'Standard' | 'CBC';
    isInternal?: boolean; // If true, only visible to teachers/admins
    institutionId: string;
    createdAt: string;
}


export interface TransportVehicle {
    id: string;
    institutionId: string;
    plateNumber: string;
    model: string;
    vehicleType: 'school' | 'private';
    capacity: number;
    driverId?: string;
    assistantId?: string;
    status: 'active' | 'maintenance' | 'out_of_service';
}


export interface TransportOnboarding {
    id: string;
    institutionId: string;
    vehicleId?: string; // Reference to TransportVehicle
    studentId: string;
    direction: 'to_school' | 'from_school';
    status: 'pending' | 'onboarded' | 'offboarded' | 'received';
    locationLat?: number;
    locationLng?: number;
    timestamp: string;
    parentConfirmedAt?: string;
}

export interface VehicleLog {
    id: string;
    institutionId: string;
    vehicleId: string; // Reference to TransportVehicle
    eventType: 'entry' | 'exit';
    securityId?: string;
    timestamp: string;
    notes?: string;
}

export interface AssessmentMark {
    id: string;
    assessmentId: string;
    studentId: string;
    marks: number | null;
    comments?: string;
    gradedBy: string;
    timestamp: string;
    rubricGrade?: 'EE' | 'ME' | 'AE' | 'BE'; // For CBC
    competencies?: Record<string, 'EE' | 'ME' | 'AE' | 'BE'>; // e.g. {"Creativity": "EE"}
    institutionId?: string;
}

export type TimeOffCategory = 'Disability' | 'Medical' | 'Personal Leave' | 'Conference' | 'Other';
export type TimeOffRequestStatus = 'pending' | 'approved' | 'rejected';

export interface TimeOffRequest {
    id: string;
    lecturerId: string;
    category: string;
    startDate: string;
    endDate: string;
    isFullDay: boolean;
    startTime?: string;
    endTime?: string;
    reason: string;
    supportingDocumentUrl?: string | null;
    status: TimeOffRequestStatus;
    timestamp: string;
    institutionId: string;
}

export type StudentAbsenceRequestStatus = 'pending' | 'approved' | 'rejected';

export interface StudentAbsenceRequest {
    id: string;
    studentId: string;
    startDate: string;
    endDate: string;
    isFullDay: boolean;
    startTime?: string;
    endTime?: string;
    reason: string;
    supportingDocumentUrl?: string | null;
    status: StudentAbsenceRequestStatus;
    timestamp: string;
    institutionId: string;
}

export interface EnrollmentRequest {
    id: string;
    studentId: string;
    subjectId: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: string;
    signatureUrl?: string | null;
    institutionId: string;
}

export interface AbsenceRequest {
    id: string;
    lecturerId: string;
    subjectId: string;
    timetableEntryId: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    timestamp: string;
}

export interface LecturerContract {
    id: string;
    lecturerId: string;
    institutionId: string;
    academicYearId: string;
    semesterId: string;
    content: string;
    workloadSummary: {
        totalPeriods: number;
        totalHours: number;
        subjectsTaught: string[];
    };
    status: 'pending' | 'signed' | 'expired';
    signedAt?: string;
}


export interface LeaveRequest {
    id: string;
    institutionId: string;
    staffId: string;
    type: 'Sick' | 'Annual' | 'Maternity' | 'Paternity' | 'Other';
    startDate: string;
    endDate: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    appliedAt: string;
}

export interface ExamTimetableEntry {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    subjectId: string;
    courseId: string;
    courseLevelId: string;
    roomId: string;
    invigilatorId: string;
    institutionId: string;
    academicYearId: string;
    semesterId: string;
}

export interface Conflict {
    type: 'room' | 'lecturer' | 'consecutive_subject' | 'group_overlap' | 'period_alignment';
    resourceId: string;
    day: string;
    startTime: string;
    conflictingEntries: TimetableEntry[];
    message?: string;
}

export interface ExtensionRequest {
    id: string;
    institutionId: string;
    requesterId: string;
    reason: string;
    status: 'pending' | 'approved' | 'rejected';
    requestedAt: string;
}

export interface SecurityAlert {
    id: string;
    institutionId: string;
    createdBy?: string;
    createdAt?: string;
    status: 'active' | 'resolved' | 'open';
    targetId?: string;
    targetName?: string;
    targetRole?: 'student' | 'lecturer' | 'guest' | string;
    type?: 'Disciplinary' | 'Fee Balance' | 'Security Risk' | 'Other' | string;
    severity?: 'Low' | 'Medium' | 'High' | string;
    description: string;
    title?: string;
    timestamp?: string;
}

export interface Visitor {
    id: string;
    name?: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    purpose: string;
    visitDate?: string;
    timeIn?: string;
    timeOut?: string;
    institutionId?: string;
    hostId?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    idNumber?: string;
    checkIn?: string;
}

export interface Requisition {
    id: string;
    institutionId: string;
    storeId?: string;
    requestedBy: string;
    requestedDate: string;
    items: { name: string; quantity: number; unitCost: number; unit: string }[];
    totalEstimatedCost: number;
    status: string;
    supplierId?: string;
    lpoNumber?: string;
    rejectionReason?: string;
    supplierResponse?: 'accepted' | 'rejected';
    deliveryEta?: string;
    receivedDate?: string;
}

export type TransactionStatus = 'completed' | 'failed' | 'pending';

export interface MpesaTransaction {
    id: string;
    transactionId: string;
    institutionId: string;
    amount: number;
    phoneNumber: string;
    payerName: string;
    description?: string;
    timestamp: string;
    status: TransactionStatus;
    metadata?: any;
    checkoutRequestId?: string;
    provider: 'mpesa' | 'airtel' | 'intasend' | 'ncba';
    paymentMethod: 'stk_push' | 'paybill' | 'till' | 'wallet' | 'direct_debit' | 'bank_transfer' | 'qr_code';
    referenceId?: string;
}

export type Transaction = MpesaTransaction;

export interface InvoiceItem {
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
}

export interface Invoice {
    id: string;
    invoiceNumber: string;
    institutionId: string;
    issueDate: string;
    dueDate: string;
    due_date: string;
    items: InvoiceItem[];
    totalAmount: number;
    status: 'paid' | 'pending' | 'overdue';
    studentId?: string;
}

export interface Receipt {
    id: string;
    receiptNumber: string;
    institutionId: string;
    paymentDate: string;
    amountPaid: number;
    paidFor: string;
    paymentMethod: string;
    relatedTransactionId: string;
    invoiceId?: string;
    studentId?: string;
}

export interface Book {
    id: string;
    title: string;
    author: string;
    isbn: string;
    accessionNumber: string; // Unique ID for each physical copy
    quantity: number;
    available: number;
    category: string;
    location: string;
    addedDate: string;
    institutionId: string;
}

export interface LibraryTransaction {
    id: string;
    bookId: string;
    userId: string;
    issueDate: string;
    dueDate: string;
    returnDate?: string;
    status: 'issued' | 'returned' | 'overdue';
    fineAmount?: number;
    institutionId: string;
    memberSignature?: string;
}

export interface LibraryFine {
    id: string;
    transactionId: string;
    userId: string;
    amount: number;
    paidAmount: number;
    status: 'pending' | 'partially_paid' | 'paid';
    description: string;
    createdAt: string;
    updatedAt: string;
    institutionId: string;
}

export interface BookReservation {
    id: string;
    bookId: string;
    userId: string;
    reservationDate: string;
    expiryDate: string;
    status: 'pending' | 'fulfilled' | 'cancelled' | 'expired';
    institutionId: string;
}

export interface BookStockReceipt {
    id: string;
    bookId: string;
    source: string;
    quantity: number;
    receiptDate: string;
    batchNumber?: string;
    notes?: string;
    recordedBy: string;
    institutionId: string;
}

export interface LibrarySettings {
    overdueFinePerDay: number;
    maxBooksPerUser: number;
    reservationExpiryDays: number;
    defaultLendingPeriodDays: number;
    institutionId: string;
}

export interface v_library_statistics {
    institution_id: string;
    total_books: number;
    total_copies: number;
    available_copies: number;
    active_loans: number;
    overdue_loans: number;
    pending_reservations: number;
}

export interface BusinessDocument {
    id: string;
    name: string;
    type: string;
    uploadDate: string;
    status: 'pending' | 'verified' | 'rejected';
    url: string;
}

export interface Supplier {
    id: string;
    name: string;
    contactPerson: string;
    email: string;
    phone: string;
    phoneNumber?: string;
    category: string;
    userId?: string;
    status?: string;
    rating?: number;
    suppliedItems?: { itemId: string; price: number }[];
    documents?: BusinessDocument[];
    institutionId: string;
}

export interface Internship {
    id: string;
    studentId: string;
    lecturerId: string;
    industryName: string;
    industryLocation: string;
    startDate: string;
    endDate: string;
    report?: string;
    status: 'ongoing' | 'completed';
    institutionId: string;
}

export interface FeedbackSubmission {
    id: string;
    studentId: string;
    institutionId?: string;
    title: string;
    content: string;
    isAnonymous: boolean;
    status: 'new' | 'viewed' | 'resolved';
    timestamp: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    reorderLevel?: number;
    location?: string;
    lastUpdated?: string;
    institutionId: string;
    expiryDate?: string;
    itemType?: 'consumable' | 'asset';
    price?: number;
    status?: string;
    minThreshold?: number;
}

export interface TransportBill {
    id: string;
    institutionId: string;
    driverId: string;
    vehicleId: string;
    billDate: string;
    totalAmount: number;
    status: 'pending' | 'paid' | 'overdue';
    items: {
        description: string;
        amount: number;
    }[];
    generatedBy: string;
    paidDate?: string;
    paymentMethod?: string;
    notes?: string;
}

export type CountyInventoryStatus = 'at_hq' | 'in_transit' | 'received';

export interface CountyInventoryCategory {
    id: string;
    countyId: string;
    name: string;
    description: string;
}

export interface CountyStore {
    id: string;
    countyId: string;
    name: string;
    locationName: string;
    latitude: number;
    longitude: number;
    description: string;
}


export interface CountyInventoryItem {
    id: string;
    countyId: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    supplierName: string;
    status: CountyInventoryStatus;
    targetInstitutionId?: string;
    driverName?: string;
    deliveryMethod: 'driver' | 'parcel';
    trackingNumber?: string;
    qrCode: string; // Used for scanning on arrival
    atHqDate: string;
    recipientSignature?: string; // Base64 signature image
    receivedBy?: string; // Name of person who received at destination
    recipientName?: string; // Name of person who collected/received from HQ
    dispatchedDate?: string;
    receivedDate?: string;
}

export interface StockTransaction {
    id: string;
    itemId: string;
    itemName: string;
    type: 'Restock' | 'Dispatch' | 'Adjustment' | 'Issue';
    quantity: number;
    recipientOrSupplier: string;
    date: string;
    recordedBy: string;
    institutionId: string;
    verificationMethod?: string;
    signature?: string;
    recipientId?: string;
}

export interface VoteHead {
    id: string;
    name: string;
    allocatedAmount: number;
    amountSpent: number;
    academicYearId: string;
    priority: number;
    institutionId: string;
}

export interface FeeStructure {
    id: string;
    name: string;
    amount: number;
    academicYearId: string;
    term?: string;
    courseId?: string;
    voteHeadId?: string;
    priority?: number;
    institutionId: string;
}

export interface FinancialPeriod {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'inactive' | 'closed';
    institutionId: string;
    createdAt: string;
}



export interface ProfileUpdateData {
  name: string;
  phoneNumber: string;
  expertise: string[];
  profilePhotoUrl?: string | null;
  gender?: 'Male' | 'Female' | 'Other';
  autoMarketPlaceUrl?: string;
}

export interface PasswordUpdateData {
    currentPassword?: string;
    newPassword?: string;
}

export interface Appointment {
    id: string;
    hostId: string;
    hostName: string;
    guestName: string;
    guestEmail: string;
    guestPhone: string;
    date: string;
    startTime: string;
    endTime: string;
    purpose: string;
    status: 'pending' | 'approved' | 'rejected' | 'completed';
    createdAt: string;
    institutionId: string;
}

export interface GuestFeedback {
    id: string;
    guestName: string;
    institutionId?: string;
    visitDate: string;
    rating: number;
    comments: string;
    status: 'new' | 'viewed' | 'resolved';
    timestamp: string;
    isAnonymous: boolean;
    title: string;
    submittedAt: string;
}

export interface TaAssignment {
    id: string;
    subjectId: string;
    lecturerId: string;
    taId: string;
    academicYearId: string;
    semesterId: string;
    institutionId: string;
}

export interface Assignment {
    id: string;
    lecturerId: string;
    subjectId: string;
    title: string;
    fileDataUrl: string;
    fileName: string;
    fileType: string;
    due_date: string;
    dueDate: string;
    institutionId?: string;
    createdAt: string;
}

export type SubmissionStatus = 'submitted' | 'late' | 'graded';

export interface Submission {
    id: string;
    assignmentId: string;
    studentId: string;
    fileDataUrl: string;
    fileName: string;
    fileType: string;
    submittedAt: string;
    status: SubmissionStatus;
    grade?: string;
    feedback?: string;
    institutionId?: string;
}

export interface LessonRating {
    id: string;
    studentId: string;
    lecturerId: string;
    timetableEntryId: string;
    rating: number;
    comment?: string;
    timestamp: string;
}

export interface InstitutionRegistrationData {
    institutionName: string;
    institutionEmail: string;
    institutionPhone: string;
    institutionType: string;
    adminName: string;
    adminEmail: string;
    loadDemoData: boolean;
    businessSubType?: string;
    category?: string;
    resellerId?: string;
    termsAccepted: boolean;
    name?: string;
    email?: string;
    phoneNumber?: string;
    countyId?: string;
    subCounty?: string;
    constituency?: string;
    ward?: string;
}

export interface StudentRegistrationData {
    name: string;
    email: string;
    phoneNumber: string;
    gender: 'Male' | 'Female' | 'Other';
    staffId: string;
    institutionId: string;
    courseId: string;
    courseLevelId: string;
    password?: string;
}



export interface BiometricConfig {
    enabled: boolean;
    deviceIp?: string;
}

export interface RoomConflict {
    day: string;
    startTime: string;
    endTime: string;
    concurrentLessons: number;
    roomShortfall: number;
}

export interface ObservationNote {
    id: string;
    timetableEntryId: string;
    practiceTeacherId: string;
    notes: string;
    timestamp: string;
    institutionId: string;
}

export interface PracticeTeacherAssignment {
    id: string;
    lecturerId: string;
    practiceTeacherId: string;
    startDate: string;
    endDate: string;
    status: 'active' | 'inactive';
    institutionId: string;
}

export interface StaffImportPreviewUser {
    originalRowIndex: number;
    name: string;
    email: string;
    phoneNumber: string;
    staffId: string;
    role: Role;
    roles?: Role[];
    departmentId?: string;
    expertise: string[];
    gender?: 'Male' | 'Female' | 'Other';
    generatedStaffId: boolean;
    generatedEmail: boolean;
    originalRoleValue?: string;
}

export interface UserUpdateData {
    name?: string;
    email?: string;
    phoneNumber?: string;
    staffId?: string;
    role?: Role;
    roles?: Role[];
    departmentId?: string;
    expertise?: string[];
    gender?: 'Male' | 'Female' | 'Other';
    driverType?: 'staff' | 'private';
}

export type UserMappingField = 'name' | 'email' | 'phoneNumber' | 'staffId' | 'role' | 'roles' | 'departmentName' | 'expertise' | 'gender';

export interface EmployeeDetails {
    userId: string;
    basicSalary: number;
    houseAllowance: number;
    commuterAllowance: number;
    otherAllowances: number;
    employmentType: string;
    dateEmployed: string;
    kraPin?: string;
    nssfNo?: string;
    nhifNo?: string;
}

export interface PayrollRun {
    id: string;
    month: string;
    totalGross: number;
    totalNet: number;
    totalPaye: number;
    totalNssf: number;
    totalShif: number;
    totalHousingLevy: number;
    status: 'Draft' | 'Finalized' | 'Paid';
    payslips: any[];
}

export interface CountyRegistrationData {
    countyName: string;
    countyCode: string;
    countyEmail: string;
    countyPhone: string;
    adminName: string;
    adminEmail: string;
    termsAccepted: boolean;
}

export type BursaryStatus = 'pending' | 'vetted' | 'approved' | 'disbursed' | 'rejected';

export interface BursaryApplication {
    id: string;
    studentId: string;
    studentName: string;
    institutionId: string;
    institutionName: string;
    countyId: string;
    amountRequested: number;
    amountApproved?: number;
    purpose: string;
    status: BursaryStatus;
    appliedAt: string;
    vettedAt?: string;
    vettedBy?: string;
    disbursedAt?: string;
    disbursementRef?: string;
    documents?: string[];
    vettingComments?: string;
    applicationType: 'Bursary' | 'Loan';
}

export interface CountyBursaryFund {
    id: string;
    name: string;
    countyId: string;
    financialYear: string;
    totalBudget: number;
    allocatedAmount: number;
    remainingAmount: number;
    publicParticipationLink?: string;
}

// ============================================
// BOARDING MANAGEMENT TYPES
// ============================================

export type HouseGender = 'Boys' | 'Girls' | 'Mixed';
export type HouseStatus = 'Active' | 'Inactive' | 'Under Maintenance';
export type RoomType = 'Single' | 'Double' | 'Triple' | 'Quad' | 'Dormitory';
export type RoomStatus = 'Active' | 'Inactive' | 'Under Maintenance';
export type BedStatus = 'Available' | 'Occupied' | 'Reserved' | 'Under Maintenance';
export type BedCondition = 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Needs Replacement';
export type AllocationStatus = 'Active' | 'Completed' | 'Transferred' | 'Cancelled';
export type ClearanceStatus = 'Pending' | 'Cleared' | 'Issues Reported';
export type MaintenancePriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type MaintenanceStatus = 'Pending' | 'In Progress' | 'Resolved' | 'Cancelled';

export interface BoardingHouse {
    id: string;
    institutionId: string;
    name: string;
    gender: HouseGender;
    capacity: number;
    houseMasterId?: string;
    status: HouseStatus;
    floorPlanUrl?: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BoardingRoom {
    id: string;
    houseId: string;
    roomNumber: string;
    roomType: RoomType;
    capacity: number;
    floorLevel: number;
    amenities?: string;
    status: RoomStatus;
    createdAt: string;
    updatedAt: string;
}

export interface BoardingBed {
    id: string;
    roomId: string;
    bedNumber: string;
    status: BedStatus;
    condition: BedCondition;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BedAllocation {
    id: string;
    bedId: string;
    studentId: string;
    allocatedBy: string;
    allocationDate: string;
    term: string;
    academicYear: string;
    status: AllocationStatus;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface BoardingCheckIn {
    id: string;
    allocationId: string;
    studentId: string;
    checkInDate: string;
    checkInTime: string;
    checkedInBy: string;
    conditionNotes?: string;
    itemsInventory?: Record<string, any>;
    photoUrl?: string;
    createdAt: string;
}

export interface BoardingCheckOut {
    id: string;
    allocationId: string;
    studentId: string;
    checkOutDate: string;
    checkOutTime: string;
    checkedOutBy: string;
    conditionNotes?: string;
    damageReport?: string;
    clearanceStatus: ClearanceStatus;
    photoUrl?: string;
    createdAt: string;
}

export interface BoardingMaintenanceLog {
    id: string;
    institutionId: string;
    houseId: string;
    roomId: string;
    bedId?: string;
    reportedBy: string;
    reportedDate: string;
    issueDescription: string;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    resolvedBy?: string;
    resolvedDate?: string;
    resolutionNotes?: string;
    attachmentUrl?: string;
    houseName?: string;
    roomNumber?: string;
    createdAt: string;
    updatedAt: string;
}

// Extended types with joined data for display
export interface BoardingHouseWithStats extends BoardingHouse {
    totalRooms: number;
    totalBeds: number;
    availableBeds: number;
    occupiedBeds: number;
    activeAllocations: number;
    occupancyPercentage: number;
    houseMasterName?: string;
}

export interface BoardingRoomWithBeds extends BoardingRoom {
    houseName: string;
    beds: BoardingBed[];
    availableBeds: number;
    occupiedBeds: number;
}

export interface BedAllocationWithDetails extends BedAllocation {
    studentName: string;
    bedNumber: string;
    roomNumber: string;
    houseName: string;
    allocatedByName: string;
    hasCheckedIn: boolean;
    hasCheckedOut: boolean;
}

export interface BoardingCheckInWithDetails extends BoardingCheckIn {
    studentName: string;
    bedNumber: string;
    roomNumber: string;
    houseName: string;
    checkedInByName: string;
}

export interface BoardingCheckOutWithDetails extends BoardingCheckOut {
    studentName: string;
    bedNumber: string;
    roomNumber: string;
    houseName: string;
    checkedOutByName: string;
}

// ============================================================================
// CAR WASH ACCOUNTING TYPES
// ============================================================================

export interface CarWashAccount {
    id: string;
    institutionId: string;
    accountCode: string;
    name: string;
    type: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    description?: string;
    balance: number;
    isActive: boolean;
    createdAt: string;
}

export interface CarWashJournalEntry {
    id: string;
    institutionId: string;
    entryNumber: string;
    entryDate: string;
    description: string;
    referenceType?: string;
    referenceId?: string;
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CarWashJournalLine {
    id: string;
    institutionId: string;
    entryId: string;
    accountId: string;
    description?: string;
    debit: number;
    credit: number;
    createdAt: string;
    // Joined field for display
    accountName?: string;
}

export interface CarWashExpense {
    id: string;
    institutionId: string;
    expenseDate: string;
    category: string;
    description: string;
    amount: number;
    paymentMethod: 'cash' | 'mpesa' | 'bank';
    recordedBy?: string;
    receiptUrl?: string;
    journalEntryId?: string;
    createdAt: string;
}

export interface CarWashPayroll {
    id: string;
    institutionId: string;
    staffId: string;
    periodStart: string;
    periodEnd: string;
    baseSalary: number;
    commissionEarned: number;
    advancesTaken: number;
    deductions: number;
    nssf?: number;
    shif?: number;
    paye?: number;
    housingLevy?: number;
    totalPay: number;
    status: 'draft' | 'approved' | 'paid';
    paymentMethod?: string;
    paymentDate?: string;
    journalEntryId?: string;
    processedBy?: string;
    createdAt: string;
    // Joined field for display
    staffName?: string;
}

// ============================================================================
// TEACHER CHECK-IN TYPES
// ============================================================================

export type CheckInStatus = 'Pending' | 'On Time' | 'Late' | 'Absent';
export type ReminderStatus = 'Pending' | 'Sent' | 'Acknowledged' | 'Dismissed';
export type CheckInType = 'Morning' | 'Afternoon';

export interface TeacherCheckIn {
    id: string;
    teacherId: string;
    institutionId: string;
    checkInDate: string;

    // Morning check-in (around 8 AM)
    morningCheckInTime?: string;
    morningCheckInStatus: CheckInStatus;
    morningLocation?: string;
    morningNotes?: string;

    // Afternoon check-in (around 4 PM)
    afternoonCheckInTime?: string;
    afternoonCheckInStatus: CheckInStatus;
    afternoonLocation?: string;
    afternoonNotes?: string;

    createdAt: string;
    updatedAt: string;
}

export interface TeacherCheckInReminder {
    id: string;
    teacherId: string;
    institutionId: string;
    reminderDate: string;
    reminderTime: string;
    reminderType: CheckInType;
    status: ReminderStatus;
    sentAt?: string;
    acknowledgedAt?: string;
    createdAt: string;
}

export interface TeacherAttendanceSummary {
    id: string;
    teacherId: string;
    institutionId: string;
    month: number;
    year: number;
    totalDays: number;
    presentDays: number;
    lateDays: number;
    absentDays: number;
    morningCheckins: number;
    afternoonCheckins: number;
    createdAt: string;
    updatedAt: string;
}

// Extended types with joined data
export interface TeacherCheckInWithDetails extends TeacherCheckIn {
    teacherName: string;
    teacherEmail: string;
    institutionName: string;
    morningOverdue: boolean;
    afternoonOverdue: boolean;
}

export interface TeacherCheckInReminderWithDetails extends TeacherCheckInReminder {
    teacherName: string;
    teacherEmail: string;
    teacherPhone?: string;
}

export interface TeacherAttendanceWithDetails extends TeacherAttendanceSummary {
    teacherName: string;
    attendanceRate: number;
    punctualityRate: number;
}
// ============================================================================
// STUDENT LEAVE OUT / EXEAT TYPES
// ============================================================================

export type LeaveOutStatus = 'pending_boarding' | 'pending_security' | 'checked_out' | 'cancelled';

export interface LeaveOutRequest {
    id: string;
    studentId: string;
    institutionId: string;
    classTeacherId: string;
    boardingMasterId?: string;
    securityId?: string;
    reason: string;
    leaveDate: string;
    returnDate: string;
    status: LeaveOutStatus;
    sheetUrl?: string;
    houseCheckedOutAt?: string;
    gateCheckedOutAt?: string;
    homeArrivalAt?: string;
    homeDepartureAt?: string;
    createdAt: string;
    updatedAt: string;

}

export interface LeaveOutWithDetails extends LeaveOutRequest {
    studentName: string;
    studentClass: string;
    parentPhone: string;
    parentEmail: string;
    classTeacherName: string;
    boardingMasterName?: string;
    securityName?: string;
}

// ============================================
// INFO DESK EXTENSIONS
// ============================================

export interface BulletinItem {
    id: string;
    institutionId: string;
    title: string;
    content: string;
    category: 'Announcement' | 'Event' | 'Emergency' | 'Holiday';
    date: string;
    createdAt: string;
    authorId: string;
}

export interface DocumentCollection {
    id: string;
    institutionId: string;
    documentType: string;
    ownerName: string;
    ownerId?: string;
    ownerPhone?: string;
    status: 'Ready' | 'Collected' | 'Pending';
    droppedOffBy: string;
    droppedOffDate: string;
    collectedDate?: string;
    notes?: string;
}

export interface WatchlistRecord {
    id: string;
    institutionId: string;
    name: string;
    phoneNumber?: string;
    idNumber?: string;
    reason: string;
    severity: 'Low' | 'Medium' | 'High';
    addedBy: string;
    createdAt: string;
}

export interface MaintenanceRequest {
    id: string;
    institutionId: string;
    roomId: string;
    description: string;
    priority: 'Low' | 'Medium' | 'High' | 'Urgent';
    status: 'Pending' | 'In Progress' | 'Completed';
    reportedBy: string;
    reportedAt: string;
}

// ============================================================================
// CAR WASH MODULE TYPES
// ============================================================================

export type CarWashVehicleType = 'Sedan' | 'SUV' | 'Truck' | 'Matatu' | 'Motorbike' | 'Van' | 'Bus' | 'Other';
export type CarWashJobStatus = 'queued' | 'in_progress' | 'ready' | 'completed' | 'cancelled';
export type CarWashPaymentMethod = 'cash' | 'mpesa' | 'card' | 'credit';

export interface CarWashPackage {
    id: string;
    institutionId: string;
    name: string;
    description?: string;
    pricing: Partial<Record<CarWashVehicleType, number>>;
    estimatedMinutes: number;
    includesInterior: boolean;
    isActive: boolean;
    color?: string; // UI accent color
    commissionType?: 'percentage' | 'fixed';
    commissionValue?: number;
}

export interface CarWashAddOn {
    id: string;
    institutionId: string;
    name: string;
    description?: string;
    price: number;
    isActive: boolean;
    createdAt: string;
}


export interface CarWashCustomer {
    id: string;
    institutionId: string;
    name: string;
    phoneNumber: string;
    email?: string;
    loyaltyStamps: number;
    stampsForFreeWash: number;
    loyaltyPoints?: number;
    notes?: string;
    createdAt: string;
}

export interface CarWashVehicle {
    id: string;
    institutionId: string;
    customerId: string;
    plateNumber: string;
    make: string;
    model: string;
    color: string;
    vehicleType: CarWashVehicleType;
}

export interface CarWashJob {
    id: string;
    institutionId: string;
    customerId?: string;
    vehicleId?: string;
    vehiclePlate: string;
    vehicleType: CarWashVehicleType;
    packageId: string;
    packageName: string;
    addOns: string[];
    attendantId?: string;
    attendantName?: string;
    bayNumber?: number;
    status: CarWashJobStatus;
    paymentMethod: CarWashPaymentMethod;
    amountCharged: number;
    amountPaid: number;
    unifiedTabId?: string; // Links this job to a RetailSale for hybrid checkout
    isLoyaltyRedemption: boolean;
    startedAt?: string;
    completedAt?: string;
    createdAt: string;
    notes?: string;
    commissionEarned?: number;
    isCommissionPaid?: boolean;
}

export interface CarWashInventoryItem {
    id: string;
    institutionId: string;
    name: string;
    unit: string;
    currentStock: number;
    reorderLevel: number;
    costPerUnit: number;
    supplierId?: string;
    lastRestockedAt?: string;
    category: 'chemical' | 'equipment' | 'consumable' | 'other';
}

export interface CarWashFeedback {
    id: string;
    institutionId: string;
    jobId: string;
    customerId?: string;
    rating: number; // 1-5
    comment?: string;
    createdAt: string;
}

export interface CarWashShiftLog {
    id: string;
    institutionId: string;
    attendantId: string;
    attendantName: string;
    checkIn: string;
    checkOut?: string;
    jobsCompleted: number;
    totalRevenue: number;
    date: string;
}

export interface CarWashSettings {
    id: string;
    institutionId: string;
    pointsPerKes: number;
    stampsPerWash: number;
    stampsForFreeWash: number;
    redeemValuePerPoint: number;
    isLoyaltyEnabled: boolean;
    logoUrl?: string;
    receiptHeader?: string;
    receiptFooter?: string;
    createdAt: string;
    updatedAt: string;
}

// ============================================================================
// FUEL STATION MODULE TYPES
// ============================================================================

export type FuelType = 'Petrol' | 'Diesel' | 'V-Power' | 'Kerosene' | 'LPG';
export type FuelPaymentMethod = 'cash' | 'mpesa' | 'card' | 'fleet_card' | 'credit';

export interface FuelStation {
    id: string;
    institutionId: string;
    name: string;
    location?: string;
    contactNumber?: string;
    isActive: boolean;
    createdAt: string;
}

export interface FuelTank {
    id: string;
    institutionId: string;
    stationId?: string;
    name: string;
    fuelType: FuelType;
    capacityLiters: number;
    currentLevelLiters: number;
    lastTemperature?: number;
    lowLevelThreshold: number;
    sensorId?: string;
    sensorVendor?: string;
    createdAt: string;
}

export interface FuelPump {
    id: string;
    tankId: string;
    stationId?: string;
    pumpNumber: string;
    nozzleCount: number;
    currentTotalizerReading: number;
    status: 'active' | 'maintenance' | 'out_of_service';
    createdAt: string;
}

export interface FuelPrice {
    id: string;
    institutionId: string;
    stationId?: string;
    fuelType: FuelType;
    pricePerLiter: number;
    effectiveFrom: string;
    isActive: boolean;
}

export interface FuelSale {
    id: string;
    institutionId: string;
    stationId?: string;
    pumpId: string;
    attendantId?: string;
    customerId?: string;
    vehiclePlate?: string;
    fuelType: FuelType;
    litersSold: number;
    pricePerLiter: number;
    totalAmount: number;
    pointsEarned?: number;
    commissionEarned?: number;
    paymentMethod: FuelPaymentMethod;
    paymentStatus: 'completed' | 'pending' | 'refunded';
    shiftId?: string;
    createdAt: string;
}

export interface FuelInventoryLog {
    id: string;
    tankId: string;
    stationId?: string;
    logType: 'delivery' | 'manual_dip' | 'adjustment';
    quantity: number;
    recordedBy: string;
    notes?: string;
    createdAt: string;
}

// ============================================================================
// AGROVET MODULE TYPES
// ============================================================================

export type AgrovetSaleStatus = 'pending' | 'completed' | 'cancelled';
export type AgrovetPaymentMethod = 'cash' | 'mpesa' | 'credit' | 'credit_deduction';
export type AgrovetUnitType = 'kg' | 'packet' | 'litres' | 'grams' | 'bottle' | 'bag' | 'dozen';

export interface AgrovetProduct {
    id: string;
    institutionId: string;
    name: string;
    description?: string;
    category: 'Seeds' | 'Fertilizers' | 'Chemicals' | 'Animal Health' | 'Equipment' | 'Other';
    unitType: AgrovetUnitType;
    reorderLevel: number;
    currentStock: number;
    lastRestockedAt?: string;
}

export interface AgrovetBatch {
    id: string;
    institutionId: string;
    productId: string;
    batchNumber: string;
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    expiryDate: string;
    receivedDate: string;
}

export interface AgrovetFarmer {
    id: string;
    institutionId: string;
    name: string;
    phoneNumber: string;
    location?: string;
    farmType?: string;
    loyaltyPoints: number;
    creditLimit: number;
    notes?: string;
    createdAt: string;
}

export interface AgrovetAnimal {
    id: string;
    institutionId: string;
    farmerId: string;
    species: string;
    breed?: string;
    tagNumber?: string;
    birthDate?: string;
    notes?: string;
}

export interface AgrovetSale {
    id: string;
    institutionId: string;
    customerId?: string;
    totalAmount: number;
    amountPaid: number;
    paymentMethod: AgrovetPaymentMethod;
    status: AgrovetSaleStatus;
    servedById: string;
    servedByName: string;
    items?: AgrovetSaleItem[];
    createdAt: string;
}

export interface AgrovetConsultation {
    id: string;
    institutionId: string;
    customerId: string; // Changed from farmerId
    animalId?: string;
    symptoms: string;
    diagnosis: string;
    prescription: string;
    fee: number;
    isPaid: boolean;
    vetId: string;
    vetName: string;
    createdAt: string; // Added
    date: string;
}

export interface AgrovetCreditNote {
    id: string;
    institutionId: string;
    customerId: string; // Changed from farmerId
    saleId?: string;
    consultationId?: string;
    amount: number;
    amountPaid: number; // Added
    remainingBalance: number;
    limit: number; // Added
    dueDate: string;
    status: 'active' | 'cleared' | 'overdue';
    createdAt: string;
}

// ============================================================================
// PROPERTY MANAGEMENT MODULE TYPES
// ============================================================================

export type PMPropertyType = 'Apartment' | 'Commercial' | 'Land' | 'Other';
export type PMUnitStatus = 'Vacant' | 'Occupied' | 'Maintenance';
export type PMLeaseStatus = 'Active' | 'Terminated' | 'Expired';
export type PMPaymentMethod = 'Cash' | 'M-Pesa' | 'Bank' | 'Other';
export type PMPaymentType = 'Rent' | 'Utility' | 'Deposit' | 'Other';
export type PMPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type PMTicketStatus = 'Open' | 'In Progress' | 'Resolved' | 'Closed';

export interface PMLandlord {
    id: string;
    name: string;
    phoneNumber: string;
    email?: string;
    idNumber?: string;
    taxPin?: string;
    bankDetails?: string;
    institutionId: string;
    createdAt: string;
}

export interface PMProperty {
    id: string;
    name: string;
    address?: string;
    propertyType: PMPropertyType;
    totalUnits: number;
    landlordId?: string;
    commissionRate?: number;
    institutionId: string;
    createdAt: string;
}

export interface PMUnit {
    id: string;
    propertyId: string;
    unitNumber: string;
    unitType: string;
    floorNumber?: number;
    rentAmount: number;
    status: PMUnitStatus;
    institutionId: string;
    createdAt: string;
}

export interface PMTenant {
    id: string;
    name: string;
    phoneNumber: string;
    email?: string;
    idNumber?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    institutionId: string;
    createdAt: string;
}

export interface PMLease {
    id: string;
    unitId: string;
    tenantId: string;
    startDate: string;
    endDate?: string;
    rentAmount: number;
    depositAmount: number;
    billingCycle: 'Monthly' | 'Quarterly';
    status: PMLeaseStatus;
    termsAndConditions?: string;
    utilitiesIncluded?: string[];
    lateFeePercentage?: number;
    noticePeriodDays?: number;
    witnessName?: string;
    witnessPhone?: string;
    institutionId: string;
    createdAt: string;
}

export interface PMPayment {
    id: string;
    leaseId: string;
    amount: number;
    paymentDate: string;
    paymentMethod: PMPaymentMethod;
    paymentType: PMPaymentType;
    periodMonth?: number;
    periodYear?: number;
    status: 'Completed' | 'Pending' | 'Cancelled';
    commissionAmount?: number;
    landlordPayoutStatus?: 'pending' | 'paid';
    institutionId: string;
    createdAt: string;
}

export interface PMTicket {
    id: string;
    institutionId: string;
    propertyId: string;
    unitId?: string;
    title: string;
    description: string;
    priority: PMPriority; // Assuming MaintenancePriority is PMPriority based on context
    status: 'Open' | 'In Progress' | 'Resolved' | 'Closed';
    assignedTo?: string;
    cost?: number;
    createdAt: string;
}

export type PMInquiryStatus = 'New' | 'Contacted' | 'Closed';

export interface PMInquiry {
    id: string;
    institutionId: string;
    listingId?: string;
    customerName: string;
    phoneNumber: string;
    inquiryDate?: string;
    message?: string;
    status: PMInquiryStatus;
    createdAt: string;
}

export type PMDisbursementStatus = 'Pending' | 'Approved' | 'Paid' | 'Rejected';

export interface PMDisbursement {
    id: string;
    landlordId: string;
    amount: number;
    status: PMDisbursementStatus;
    requestDate: string;
    processedDate?: string;
    paymentReference?: string;
    paymentMethod?: string;
    bankDetails?: string;
    notes?: string;
    paymentIds?: string[]; // IDs of PMPayment records included in this disbursement
    institutionId: string;
}

export type PMInvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';

export interface PMInvoiceItem {
    description: string;
    amount: number;
}

export interface PMInvoice {
    id: string;
    invoiceNumber: string;
    leaseId: string;
    tenantId: string;
    unitId: string;
    description: string;
    amount: number;
    items?: PMInvoiceItem[];
    issueDate: string;
    dueDate: string;
    status: PMInvoiceStatus;
    notes?: string;
    institutionId: string;
    createdAt: string;
}

export type PMListingStatus = 'Active' | 'Published' | 'Draft' | 'Under Offer' | 'Sold' | 'Leased';
export type PMListingType = 'Sale' | 'Rent' | 'Lease';

export interface PMListing {
    id: string;
    propertyId: string;
    unitId?: string;
    title: string;
    description: string;
    price: number;
    listingType: PMListingType;
    status: PMListingStatus;
    images: string[];
    features: string[];
    isPromoted: boolean;
    location?: string;
    viewCount: number;
    inquiryCount: number;
    institutionId: string;
    createdAt: string;
}

export interface PMSettings {
    id: string;
    institutionId: string;
    branding?: {
        logoUrl?: string;
        companyName?: string;
        primaryColor?: string;
        footerText?: string;
    };
    rentReminders?: {
        enabled: boolean;
        beforeDueDays: number;
        afterDueDays: number;
        template?: string;
    };
    updatedAt: string;
}

// ============================================================================
// RETAIL & AGENCY MODULE TYPES
// ============================================================================

export type RetailStoreType = 'main_store' | 'branch_store' | 'van_stock' | 'warehouse';
export type RetailItemStatus = 'in_stock' | 'sold' | 'reserved' | 'in_transit' | 'defective';
export type RetailTransferStatus = 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled';
export type RetailWishlistUrgency = 'urgent' | 'casual';

export interface RetailStore {
    id: string;
    institutionId: string;
    name: string;
    storeType: RetailStoreType;
    location?: string;
    latitude?: number;
    longitude?: number;
    storeManagerId?: string; // Optional: user ID of the manager
    agentId?: string;        // If type='van_stock', the user ID of the field agent
    isActive: boolean;
    mpesaConfig?: MpesaConfig; // Store-specific MPESA credentials
    createdAt: string;
}

export interface RetailExpense {
    id: string;
    institutionId: string;
    storeId: string;
    amount: number;
    category: string;
    description: string;
    date: string;
    recordedById: string;
}

export interface CafeMenuItem {
    id: string;
    institutionId: string;
    name: string;
    description?: string;
    basePrice: number;
    category: string;
    imageUrl?: string;
    isAvailable: boolean;
    sku?: string;
    lastUpdated: string;
}

export interface HospitalityMenuItem {
    id: string;
    institutionId: string;
    name: string;
    description?: string;
    basePrice: number;
    category: string;
    imageUrl?: string;
    isAvailable: boolean;
    sku?: string;
    lastUpdated: string;
}

export interface HospitalityOrder {
    id: string;
    institutionId: string;
    roomNumber: string;
    guestName?: string;
    items: {
        itemId: string;
        name: string;
        quantity: number;
        unitPrice: number;
        kitchenStatus: 'pending' | 'preparing' | 'ready' | 'delivered';
    }[];
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'delivered' | 'cancelled';
    waiterId?: string;
    createdAt: string;
}

export interface HospitalityVehicle {
    id: string;
    institutionId: string;
    type: string; // e.g., 'Land Cruiser', 'Safari Van'
    plateNumber: string;
    capacity: number;
    features: string[];
    status: 'available' | 'on-drive' | 'maintenance';
    imageUrl?: string;
}

export interface HospitalityDriver {
    id: string;
    institutionId: string;
    name: string;
    phone: string;
    licenseNumber: string;
    status: 'available' | 'busy' | 'off-duty';
}

export interface HospitalityDriveBooking {
    id: string;
    institutionId: string;
    guestName: string;
    roomNumber?: string;
    vehicleId: string;
    driverId?: string;
    date: string;
    timeSlot: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    createdAt: string;
}

export interface RetailInventoryItem {
    id: string;
    institutionId: string;
    name: string;
    sku: string;
    barcode?: string;
    category: string;
    description?: string;
    costPrice: number;
    basePrice: number;
    srpPrice: number;
    quantity: number;
    unit: string;
    imageUrl?: string;
    reorderLevel: number;
    marketplaceEnabled: boolean;
    bufferStock: number;
    viewCount: number;
    inquiryCount: number;
    createdAt: string;
    lastUpdated?: string;
}

// A junction table to show how much of a RetailInventoryItem is in a specific RetailStore
export interface RetailStoreStock {
    id: string;
    storeId: string;
    itemId: string;
    quantity: number;
}

// Tracks individual high-value items (e.g., phones by IMEI, printers by Serial No.)
export interface RetailSerializedItem {
    id: string;
    institutionId: string;
    itemId: string;          // Links to RetailInventoryItem
    storeId: string;         // The store it's currently located in
    serialNumber: string;    // IMEI or Serial Number
    status: RetailItemStatus;
    costPrice: number;
    soldPrice?: number;
    saleId?: string;         // Links to an AgrovetSale or generic RetailSale
    createdAt: string;
}

export interface RetailStockTransfer {
    id: string;
    institutionId: string;
    sourceStoreId: string;
    destinationStoreId: string;
    requestedById: string;
    approvedById?: string;
    status: RetailTransferStatus;
    notes?: string;
    createdAt: string;
    completedAt?: string;
}

export interface RetailStockTransferItem {
    id: string;
    transferId: string;
    itemId: string;
    quantity: number;
    // Optionally track exactly which serial numbers were transferred:
    serialNumbers?: string[];
}

export interface RetailWishlist {
    id: string;
    institutionId: string;
    customerName: string;
    phoneNumber: string;
    productQuery: string;
    maxBudget?: number;
    urgency: RetailWishlistUrgency;
    capturedById: string;    // User ID of the agent who logged the lead
    isMatched: boolean;
    status?: 'Open' | 'Closed';
    notifiedAt?: string;
    createdAt: string;
}

export interface RetailCommissionLedger {
    id: string;
    institutionId: string;
    agentId: string;         // User ID of the field agent
    saleId: string;
    itemId: string;
    serialNumber?: string;
    basePrice: number;
    soldPrice: number;
    commissionAmount: number;
    isPaid: boolean;
    createdAt: string;
}
// ============================================================================
// HEALTH INFORMATION SYSTEM (HIS) MODULE TYPES
// ============================================================================

export interface HISStaff {
    id: string;
    name: string;
    role: string;
    specialty?: string;
    status: string;
    contact?: string;
    institutionId: string;
    createdAt: string;
}

export interface HISPatient {
    id: string;
    institutionId: string;
    userId?: string;
    fullName: string;
    dob?: string;
    gender: 'Male' | 'Female' | 'Other';
    bloodGroup?: string;
    allergies?: string[];
    chronicConditions?: string[];
    surgicalHistory?: string;
    shaNumber?: string;
    memberVerificationStatus?: string;
    emergencyContactName?: string;
    emergencyContactPhone?: string;
    preferredLanguage?: string;
    insuranceProvider?: string;
    insurancePolicyNumber?: string;
    address?: string;
    contact?: string;
    age?: number;
    status?: string;
    recordedBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface HISWard {
    id: string;
    institutionId: string;
    name: string;
    wardType: string;
    capacity: number;
    floorLevel?: number;
    createdAt: string;
}

export interface HISBed {
    id: string;
    wardId: string;
    bedNumber: string;
    status: string;
    isSmartBed: boolean;
    currentPatientId?: string;
    institutionId: string;
    createdAt: string;
}

export interface HISAdmission {
    id: string;
    patientId: string;
    bedId?: string;
    admittedBy?: string;
    admissionDate: string;
    dischargeDate?: string;
    reasonForAdmission?: string;
    admissionStatus: string;
    institutionId: string;
    createdAt: string;
}

export interface HISAppointment {
    id: string;
    patientId: string;
    doctorId?: string;
    date: string;
    time: string;
    status: string;
    type?: string;
    reason?: string;
    institutionId: string;
    createdAt: string;
    // UI Display helpers
    patientName?: string;
    doctorName?: string;
    specialty?: string;
}

export interface HISStaffAttendance {
    id: string;
    staffId: string;
    date: string;
    checkIn?: string;
    checkOut?: string;
    status?: string;
    institutionId: string;
    createdAt: string;
    // UI Display helpers
    totalHours?: number;
}

export interface HISDentalChart {
    id: string;
    patientId: string;
    toothNumber: number;
    procedureCode?: string;
    conditionNotes?: string;
    imageUrl?: string;
    createdBy?: string;
    institutionId: string;
    recordedAt: string;
}

export interface HISVitalStatistics {
    id: string;
    patientId: string;
    label: string;
    value: string;
    unit: string;
    trend: string;
    color: string;
    recordedAt: string;
    institutionId: string;
}

export interface HISClinicalEvent {
    id: string;
    patientId: string;
    date: string;
    time: string;
    event: string;
    dept: string;
    provider: string;
    institutionId: string;
}

export interface HISEyePrescription {
    id: string;
    patientId: string;
    visitId?: string;
    odSphere?: number;
    odCylinder?: number;
    odAxis?: number;
    odAdd?: number;
    odAcuityVisual?: string;
    osSphere?: number;
    osCylinder?: number;
    osAxis?: number;
    osAdd?: number;
    osAcuityVisual?: string;
    lensType?: string;
    frameSpecifications?: string;
    prescribedBy?: string;
    institutionId: string;
    prescribedAt: string;
}

export interface HISMedicationLog {
    id: string;
    admissionId: string;
    medicationName: string;
    dosage?: string;
    route?: string;
    frequency?: string;
    administeredBy?: string;
    scheduledAt?: string;
    administeredAt: string;
    status: string;
    institutionId: string;
    notes?: string;
}

export interface HISFinancialRecord {
    id: string;
    type: string;
    amount: number;
    date: string;
    department?: string;
    paymentMethod?: string;
    patientId?: string;
    institutionId: string;
    createdAt: string;
}

export interface HISBroadcast {
    id: string;
    institutionId: string;
    senderId?: string;
    title: string;
    message: string;
    broadcastType: string;
    priority: string;
    isActive: boolean;
    scheduledAt: string;
    expiresAt?: string;
    createdAt: string;
}

// --- Pharmacy & Clinical Safety ---

export interface HISPharmacyInventory {
    id: string;
    institutionId: string;
    name: string;
    category?: string;
    unit?: string;
    unitPrice: number;
    stockQuantity: number;
    reorderLevel: number;
    interactionCode?: string;
    isNarcotic?: boolean;
    sku?: string;
    createdAt: string;
    updatedAt: string;
    recordedBy?: string;
}

export interface HISPharmacyBatch {
    id: string;
    institutionId: string;
    medicationId: string;
    batchNumber: string;
    expiryDate: string;
    currentQuantity: number;
    initialQuantity: number;
    unitCost: number;
    supplierInfo?: string;
    createdAt: string;
    recordedBy?: string;
}

export interface HISPharmacyInteraction {
    id: string;
    institutionId: string;
    medicationAId: string;
    medicationBId: string;
    severity: 'mild' | 'moderate' | 'severe' | 'fatal';
    description: string;
    clinicalRule?: string;
    updatedAt: string;
    createdAt: string;
}

export interface HISPharmacyNarcoticsLedger {
    id: string;
    institutionId: string;
    medicationId: string;
    patientId?: string;
    prescriptionId?: string;
    quantityChange: number;
    performedBy: string;
    witnessedBy?: string;
    notes?: string;
    systemLog?: any;
    createdAt: string;
}

export interface HISPharmacyAdherenceAlert {
    id: string;
    institutionId: string;
    patientId: string;
    prescriptionItemId?: string;
    drugName?: string;
    reminderTime: string;
    frequency: string;
    alertType?: 'medication' | 'stop_medication' | 'checkup';
    stopDate?: string;
    checkupDate?: string;
    messageTemplate?: string;
    status: 'active' | 'paused' | 'completed';
    lastSentAt?: string;
    createdAt: string;
}

export interface HISPrescription {
    id: string;
    institutionId: string;
    patientId: string;
    doctorId?: string;
    doctorName?: string;
    status: 'pending' | 'dispensed' | 'cancelled';
    notes?: string;
    createdAt: string;
    // Enhanced fields for UI
    clinicalNotes?: string;
    attachedFiles?: string[];
    medicationImage?: string;
    patientName?: string;
    items?: HISPrescriptionItem[];
    recordedBy?: string;
}

export interface HISPrescriptionItem {
    id: string;
    prescriptionId: string;
    drugId: string;
    drugName: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    instructions?: string;
}

export interface PharmacySale {
    id: string;
    institutionId: string;
    patientId?: string;
    customerName?: string;
    customerPhone?: string;
    totalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    staffId?: string;
    createdAt: string;
}

export interface PharmacySaleItem {
    id: string;
    saleId: string;
    medicationId?: string;
    batchId?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    createdAt: string;
}

export interface PharmacyLedger {
    id: string;
    institutionId: string;
    type: 'Income' | 'Expense';
    category: string;
    amount: number;
    referenceId?: string;
    description: string;
    recordedBy: string;
    createdAt: string;
}

export interface PharmacyStaff {
    id: string;
    institutionId: string;
    userId: string;
    fullName?: string;
    role: string;
    specialization: string;
    licenseNumber: string;
    salary: number;
    hireDate: string;
    shiftPreference: string;
    status: string;
    createdAt: string;
}

export interface PharmacySettings {
    id: string;
    institutionId: string;
    pharmacyName: string;
    pharmacyLogo?: string;
    pharmacyLicense?: string;
    pharmacyEmail?: string;
    pharmacyPhone?: string;
    receiptHeader?: string;
    receiptFooter?: string;
    lowStockThreshold: number;
    enableSmsReminders: boolean;
    medicationRemindersEnabled?: boolean;
    stopRemindersEnabled?: boolean;
    checkupRemindersEnabled?: boolean;
    autoPrintReceipt: boolean;
    theme?: 'indigo' | 'emerald' | 'rose' | 'amber' | 'cyan' | 'violet' | 'fuchsia' | 'sky' | 'lime';
    updatedAt: string;
}

export interface RetailSaleItem {
    itemId: string;
    name: string;
    quantity: number;
    unitPrice: number;
    serialNumber?: string;
    kitchenStatus?: KitchenStatus; // For Kitchen Display System
}

export type KitchenStatus = 'pending' | 'preparing' | 'ready' | 'delivered';

export interface RetailCustomer {
    id: string;
    institutionId: string;
    name: string;
    phone_number?: string;
    phoneNumber?: string; // Standardize if possible, but keep both for compatibility
    email?: string;
    loyaltyPoints: number;
    totalSpent: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface RetailSale {
    id: string;
    institutionId: string;
    storeId: string;
    customerId?: string;      // Linked customer
    agentId?: string;        // Present if sold by a van agent
    totalAmount: number;
    paymentMethod: string;
    items: RetailSaleItem[];
    customerName?: string;
    customerPhone?: string;
    customerEmail?: string;
    createdAt: string;
    unifiedTabId?: string; // Links this sale to a CarWashJob for hybrid checkout
}

export interface CafeOrder {
    id: string;
    institutionId: string;
    jobId: string;
    items: RetailSaleItem[];
    totalAmount: number;
    status: 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
    paymentMethod: 'tab' | 'cash' | 'mpesa';
    waiterId?: string;
    waiterName?: string;
    createdAt: string;
}

export interface ServiceBooking {
    id: string;
    customerName: string;
    customerPhone: string;
    serviceType: string;
    bookingDate: string;
    bookingTime: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    institutionId: string;
    notes?: string;
    createdAt: string;
}

// --- Car Service Center Models ---
export interface Vehicle {
    id: string;
    institutionId: string;
    make: string;
    model: string;
    year: number;
    vin: string;
    licensePlate: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    fleetCompany?: string; // For B2B
    lastServiceDate?: string;
    createdAt: string;
    updatedAt: string;
    color?: string;
    notes?: string;
}

export interface ServiceJobItem {
    id: string;
    type: 'part' | 'labor' | 'sublet';
    itemId?: string; // Reference to retail_inventory for parts
    name: string;
    description?: string;
    quantity: number;
    unitCost: number; // Internal cost
    unitPrice: number; // Customer price
    taxable: boolean;
    technicianId?: string; // For tracking labor hours per tech
}

export type DVIStatus = 'green' | 'yellow' | 'red' | 'uninspected';

export interface DigitalInspectionItem {
    id: string;
    category: 'Under Hood' | 'Under Vehicle' | 'Exterior' | 'Interior' | 'Brakes' | 'Tires';
    name: string;
    status: DVIStatus;
    notes?: string;
    recommendation?: string;
    photoUrl?: string;
}

export interface RepairOrder {
    id: string;
    institutionId: string;
    vehicleId: string;
    customerId?: string; // If registered user
    status: 'draft' | 'estimate' | 'approved' | 'in_progress' | 'waiting_on_parts' | 'ready' | 'completed' | 'invoiced' | 'cancelled';
    mileageIn: number;
    mileageOut?: number;
    serviceAdvisorId: string; // The user who wrote the ticket
    leadTechnicianId?: string; // Primary mechanic
    bayNumber?: string;
    customerComplaint: string;
    inspectionItems: DigitalInspectionItem[];
    jobItems: ServiceJobItem[];
    subtotal: number;
    taxTotal: number;
    discountTotal: number;
    grandTotal: number;
    totalAmount: number;
    estimatedTotal?: number;
    insuranceClaimNumber?: string; // For split billing
    insuranceDeductible?: number;
    createdAt: string;
    updatedAt: string;
    completedAt?: string;
}

// --- Agricultural Modules Models ---

export interface CoopFarmer {
    id: string;
    institutionId: string;
    name: string;
    phone: string;
    email?: string;
    accountNumber: string;
    memberId?: string;
    kraPin?: string;
    nationalId?: string;
    location?: string;
    status: 'active' | 'inactive';
    riderId?: string;
    joinedAt: string;
    paymentMethod?: 'mpesa' | 'bank' | 'cash';
    bankName?: string;
    bankAccountNumber?: string;
}

export interface CoopRider {
    id: string;
    institutionId: string;
    name: string;
    phone: string;
    nationalId: string;
    licenseNumber: string;
    vehiclePlate: string;
    vehicleNumber?: string;
    status: 'active' | 'inactive';
}

export interface CoopCollection {
    id: string;
    institutionId: string;
    farmerId: string;
    riderId?: string;
    collectionDate: string;
    productType: 'milk' | 'tea' | 'coffee' | 'other';
    quantity: number;
    unit: string;
    qualityGrade?: string;
    recordedBy: string;
    notified: boolean;
    factoryConfirmed: boolean;
    confirmedBy?: string;
    confirmedAt?: string;
    finalQuantity?: number;
    requiresApproval?: boolean;
    approvalStatus?: 'pending' | 'approved' | 'rejected';
    approvedBy?: string;
    approvedAt?: string;
    smsStatus?: 'pending' | 'sent' | 'failed';
    _estimated_payout?: number; // Raw snake_case for direct mapping
    estimatedPayout?: number;   // camelCase for frontend usage
    createdAt: string;
}

export interface CoopAgrovetInventory {
    id: string;
    institutionId: string;
    itemName: string;
    category: string;
    quantity: number;
    unitPrice: number;
    reorderLevel: number;
    supplier?: string;
    recordedBy?: string;
}

export interface CoopAgrovetSales {
    id: string;
    institutionId: string;
    farmerId: string;
    itemId: string;
    quantity: number;
    amount: number;
    paymentStatus: 'paid' | 'credit' | 'deducted';
    saleDate: string;
    recordedBy?: string;
}

export interface SaccoAccount {
    id: string;
    institutionId: string;
    farmerId: string;
    accountType: 'savings' | 'shares' | 'loan';
    balance: number;
    status: 'active' | 'suspended';
    createdAt: string;
}

export interface SaccoTransaction {
    id: string;
    institutionId: string;
    accountId: string;
    amount: number;
    transactionType: 'deposit' | 'withdrawal' | 'loan_repayment' | 'dividend';
    transactionDate: string;
    reference?: string;
}

export interface CoopMonthlyPayout {
    id: string;
    institutionId: string;
    farmerId: string;
    payoutMonth: string; // YYYY-MM-DD
    grossPayout: number;
    agrovetDeduction: number;
    saccoDeduction: number;
    logisticsDeduction: number;
    netPayout: number;
    status: 'pending' | 'initiated' | 'approved' | 'paid' | 'rejected';
    processedAt?: string;
    initiatedBy?: string;
    initiatedAt?: string;
    approvedBy?: string;
    approvedAt?: string;
    batchId?: string;
    rejectionReason?: string;
    paidAt?: string;
    disbursementMethod?: 'mpesa' | 'bank' | 'cash' | 'cheque';
    disbursementReference?: string;
    disbursementAccount?: string;
    disbursementDate?: string;
}

export interface CoopExpense {
    id: string;
    institutionId: string;
    description: string;
    category: string;
    amount: number;
    date: string;
    recordedBy: string;
    farmerId?: string;
}

export interface CoopIncome {
    id: string;
    institutionId: string;
    companyName: string;
    productType: string;
    quantity: number;
    unit: string;
    amount: number;
    date: string;
    recordedBy: string;
}

export type ChurchDenomination = 'Catholic' | 'Protestant' | 'Orthodox' | 'Evangelical' | 'Anglican' | 'Other';

export interface ChurchSacrament {
    id: string;
    institutionId: string;
    memberId: string;
    sacramentType: 'Baptism' | 'First Communion' | 'Confirmation' | 'Marriage' | 'Holy Orders' | 'Anointing of the Sick';
    date: string;
    officiantName: string;
    godParents?: string[];
    venue?: string;
    certificateNumber?: string;
    notes?: string;
}

export interface ChurchMassIntention {
    id: string;
    institutionId: string;
    bookedBy: string;
    intentionDate: string;
    timeSlot?: string;
    intention: string; // e.g., "Thanksgiving", "Healing for Mary", "For the Deceased"
    amountPaid: number;
    status: 'booked' | 'celebrated' | 'cancelled';
    recordedAt: string;
}

export interface ChurchCellGroup {
    id: string;
    institutionId: string;
    name: string;
    leaderId: string;
    location: string;
    meetingDay: string;
    meetingTime: string;
    memberIds: string[];
    category?: 'Youth' | 'Men' | 'Women' | 'General';
}

export interface ChurchFollowUp {
    id: string;
    institutionId: string;
    visitorId: string;
    assignedTo: string; // Deacon/Leader ID
    status: 'pending' | 'in_progress' | 'converted' | 'lost';
    notes: string;
    lastContactDate?: string;
    nextFollowUpDate?: string;
}

export interface ChurchFastingPeriod {
    id: string;
    institutionId: string;
    name: string;
    startDate: string;
    endDate: string;
    rules?: string;
}

export interface ChurchSaintDay {
    id: string;
    institutionId: string;
    saintName: string;
    celebrationDate: string; // MM-DD
    liturgicalColor: 'White' | 'Green' | 'Purple' | 'Red';
    description?: string;
}

// --- Law Firm Module ---
export interface LawClient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    clientType: 'individual' | 'corporate';
    institutionId: string;
    createdAt: string;
}

export interface LawMatter {
    id: string;
    clientId: string;
    title: string;
    description?: string;
    caseNumber?: string;
    practiceArea: string;
    status: 'open' | 'closed' | 'pending' | 'archived';
    managerId: string;
    institutionId: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    openedAt: string;
    closedAt?: string;
    createdAt: string;
}

export interface LawDocument {
    id: string;
    matterId: string;
    title: string;
    fileUrl: string;
    documentType?: string;
    version: number;
    status: string;
    uploadedBy: string;
    institutionId: string;
    createdAt: string;
}

export interface LawTimeEntry {
    id: string;
    matterId: string;
    staffId: string;
    activityDate: string;
    description: string;
    durationMinutes: number;
    ratePerHour: number;
    billingStatus: 'unbilled' | 'billed' | 'waived' | 'pro-bono';
    institutionId: string;
    createdAt: string;
}

export interface LawInvoice {
    id: string;
    matterId: string;
    clientId: string;
    invoiceNumber: string;
    totalAmount: number;
    taxAmount: number;
    status: 'draft' | 'pending' | 'partial' | 'paid' | 'overdue' | 'cancelled';
    dueDate?: string;
    institutionId: string;
    createdAt: string;
}

export interface LawTrustTransaction {
    id: string;
    clientId: string;
    matterId?: string;
    amount: number;
    transactionType: 'deposit' | 'disbursement' | 'transfer';
    reference?: string;
    institutionId: string;
    createdAt: string;
}

export interface LawAgreementTemplate {
    id: string;
    institutionId: string;
    name: string;
    category: string;
    content: string;
    baseFee: number;
    createdAt: string;
}

export interface LawAgreement {
    id: string;
    institutionId: string;
    templateId: string;
    matterId?: string;
    clientId: string;
    title: string;
    partyDetails: any;
    finalContent?: string;
    paymentStatus: 'unpaid' | 'paid';
    reviewStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected';
    lawyerId?: string;
    lawyerNotes?: string;
    signedUrl?: string;
    createdAt: string;
    updatedAt: string;
}

export interface DSInstructor {
    id: string;
    institutionId: string;
    name: string;
    email?: string;
    phone?: string;
    licenseNumber?: string;
    specialization?: string;
    status: 'Active' | 'Inactive' | 'On Leave';
    rating: number;
    createdAt: string;
}

export interface DSVehicle {
    id: string;
    institutionId: string;
    make: string;
    model: string;
    plateNumber: string;
    transmission: 'Manual' | 'Automatic';
    vehicleType?: string;
    lastServiceDate?: string;
    nextServiceDate?: string;
    status: 'Operational' | 'Maintenance' | 'Out of Service';
    createdAt: string;
}

export interface DSStudent {
    id: string;
    institutionId: string;
    userId?: string;
    fullName: string;
    passportNumber?: string;
    phone?: string;
    licenseTypeInterested?: string;
    theoryProgressPercent: number;
    practicalProgressPercent: number;
    status: 'Enrolled' | 'Graduated' | 'Dropped';
    enrollmentDate: string;
    createdAt: string;
}

export interface DSLesson {
    id: string;
    institutionId: string;
    studentId: string;
    instructorId?: string;
    vehicleId?: string;
    lessonDate: string;
    startTime: string;
    endTime: string;
    lessonType: 'Practical' | 'Theory';
    topic?: string;
    status: 'Scheduled' | 'Completed' | 'Cancelled' | 'No Show';
    instructorNotes?: string;
    routeTrackedData?: any;
    createdAt: string;
}

export interface DSSkillMastery {
    id: string;
    institutionId: string;
    studentId: string;
    skillName: string;
    rating: number;
    comments?: string;
    recordedBy?: string;
    createdAt: string;
}

export interface DSSettings {
    institutionId: string;
    lessonPricePractical?: number;
    lessonPriceTheory?: number;
    cancellationPolicy?: string;
    workingHours?: any;
    updatedAt: string;
}

export interface SchoolRegistry {
    id: string;
    name: string;
    region?: string;
    county?: string;
    subCounty?: string;
    uic?: string;
    knecCode?: string;
    cluster?: string;
    specialNeedType?: 'Regular' | 'SNE' | 'Integrated';
    disabilityType?: string;
    accommodationType?: 'Boarding' | 'Day' | 'Mixed';
    genderType?: 'Boys' | 'Girls' | 'Mixed';
    institutionType?: string;
    slug?: string;
    institutionId?: string; // Links to registered tenant if claimed
    createdAt: string;
    updatedAt: string;
}

// --- Family Heritage Module ---
export interface HeritageMember {
    id: string;
    institutionId: string;
    name: string;
    branch: 'Paternal' | 'Maternal';
    relation: string;
    birthYear?: string;
    deathYear?: string;
    notes?: string;
    profilePhotoUrl?: string;
    createdAt?: string;
}

export interface HeritageStory {
    id: string;
    institutionId: string;
    title: string;
    storyDate?: string;
    storyText: string;
    authorName?: string;
    imageUrl?: string;
    createdAt?: string;
}

export interface HeritageGallery {
    id: string;
    institutionId: string;
    title: string;
    imageUrl: string;
    category?: string;
    capturedAt?: string;
    createdAt?: string;
}

export interface HeritageAnnouncement {
    id: string;
    institutionId: string;
    title: string;
    type: 'CEREMONY' | 'ADMIN' | 'MEETING' | 'MEMORIAL';
    announcementDate?: string;
    detail?: string;
    createdAt?: string;
}


export interface CarListing {
    id: string;
    institutionId: string;
    sellerId?: string;
    make: string;
    model: string;
    year: number;
    trim?: string;
    price: number;
    mileage: number;
    fuelType: 'Petrol' | 'Diesel' | 'Electric' | 'Hybrid';
    transmission: 'Automatic' | 'Manual';
    bodyType?: string;
    engineSize?: string;
    color?: string;
    mainImageUrl?: string;
    galleryUrls?: string[];
    tour360Url?: string;
    videoWalkthroughUrl?: string;
    inspectionReportUrl?: string;
    aiValuationStatus?: 'pending' | 'estimated' | 'verified';
    estimatedMarketValue?: number;
    inspectionScore?: number;
    registrationNumber?: string;
    vinNumber?: string;
    verifiedHistory?: boolean;
    status: 'draft' | 'active' | 'sold' | 'archived';
    viewCount: number;
    inquiryCount: number;
    createdAt?: string;
}

export interface TestDriveBooking {
    id: string;
    listingId: string;
    buyerId?: string;
    buyerName?: string;
    buyerPhone?: string;
    bookingDate: string;
    deliveryAddress?: string;
    status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
    createdAt?: string;
}

export interface CarAppraisal {
    id: string;
    userId?: string;
    institutionId?: string;
    vehicleDetails: any;
    images?: string[];
    offeredAmount?: number;
    status: 'pending' | 'approved' | 'declined';
    createdAt?: string;
}

export interface CarInvoice {
    id: string;
    listingId: string;
    institutionId: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
    status: 'pending' | 'partially_paid' | 'fully_paid' | 'cancelled';
    dueDate?: string;
    invoiceNumber: string;
    registrationNumber?: string;
    notes?: string;
    isInstallment?: boolean;
    installmentFrequency?: 'monthly' | 'weekly' | 'bi-weekly';
    totalInstallments?: number;
    installmentAmount?: number;
    startDate?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface CarPayment {
    id: string;
    invoiceId: string;
    institutionId: string;
    amount: number;
    paymentMethod: string;
    transactionReference?: string;
    paymentDate: string;
    receiptNumber: string;
    receivedBy?: string;
    notes?: string;
    createdAt?: string;
}

export interface CarLead {
    id: string;
    institutionId: string;
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    enquiredModels: string[]; // e.g. ["Toyota Hilux", "Isuzu D-Max"]
    budget?: number;
    source: 'walk-in' | 'online' | 'referral';
    status: 'hot' | 'warm' | 'cold' | 'converted' | 'lost';
    notes?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface BankTransaction {
    id: string;
    institutionId: string;
    amount: number;
    transactionDate: string;
    reference: string;
    senderName?: string;
    bankName?: string;
    status: 'reconciled' | 'unreconciled';
    linkedInvoiceId?: string;
    reconciledAt?: string;
    reconciledBy?: string;
    createdAt: string;
}


export interface StationShift {
    id: string;
    institutionId: string;
    stationId: string;
    attendantId?: string;
    startTime: string;
    endTime?: string;
    status: 'active' | 'closed';
    expectedCash: number;
    actualCash: number;
    discrepancy: number;
    notes?: string;
    createdAt?: string;

    // Derived front-end helper properties
    attendantName?: string;
}

export interface StationItem {
    id: string;
    institutionId: string;
    stationId: string;
    name: string;
    category: 'lubricant' | 'snack' | 'drink' | 'car_care' | 'other';
    sku?: string;
    price: number;
    stockQuantity: number;
    lowStockThreshold: number;
    isActive: boolean;
    createdAt?: string;
}

export interface StationPosSale {
    id: string;
    institutionId: string;
    stationId: string;
    attendantId?: string;
    shiftId?: string;
    customerId?: string;
    totalAmount: number;
    pointsEarned?: number;
    paymentMethod: 'cash' | 'mpesa' | 'card' | 'credit';
    paymentStatus: 'pending' | 'completed' | 'refunded';
    createdAt?: string;
}

export interface StationPosSaleItem {
    id: string;
    saleId: string;
    itemId: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
}

export interface CarwashService {
    id: string;
    institutionId: string;
    stationId: string;
    name: string;
    description?: string;
    price: number;
    estimatedDurationMinutes: number;
    createdAt?: string;
}

export interface CarwashSale {
    id: string;
    institutionId: string;
    stationId: string;
    attendantId?: string;
    shiftId?: string;
    serviceId: string;
    vehiclePlate?: string;
    customerId?: string;
    totalAmount: number;
    pointsEarned?: number;
    paymentMethod: 'cash' | 'mpesa' | 'card';
    paymentStatus: 'pending' | 'completed' | 'refunded';
    status: 'pending' | 'in_progress' | 'completed';
    createdAt?: string;
}

export interface CarServicingPackage {
    id: string;
    institutionId: string;
    stationId: string;
    name: string;
    description?: string;
    price: number;
    estimatedDurationMinutes: number;
    inventoryItemsRequired?: { itemId: string; quantity: number }[];
    createdAt?: string;
}

export interface CarServicingSale {
    id: string;
    institutionId: string;
    stationId: string;
    mechanicId?: string;
    shiftId?: string;
    packageId: string;
    vehiclePlate?: string;
    vehicleModel?: string;
    customerId?: string;
    odometerReading?: number;
    serviceIntervalKm?: number;
    nextServiceOdometer?: number;
    totalAmount: number;
    pointsEarned?: number;
    paymentMethod: 'cash' | 'mpesa' | 'card';
    paymentStatus: 'pending' | 'completed' | 'refunded';
    status: 'pending' | 'in_progress' | 'completed';
    notes?: string;
    createdAt?: string;
}

export interface FuelStationCustomer {
    id: string;
    institutionId: string;
    name: string;
    phone: string;
    email?: string;
    vehiclePlate?: string;
    loyaltyPoints: number;
    creditLimit: number;
    currentBalance: number;
    createdAt?: string;
}

export interface FuelTransfer {
    id: string;
    institutionId: string;
    sourceStationId: string;
    destinationStationId: string;
    sourceTankId: string;
    destinationTankId: string;
    fuelType: FuelType;
    quantity: number;
    status: 'pending' | 'in_transit' | 'completed' | 'cancelled';
    notes?: string;
    createdAt?: string;
}

export interface FleetAccount {
    id: string;
    institutionId: string;
    companyName: string;
    contactPerson?: string;
    phone?: string;
    email?: string;
    creditLimit: number;
    currentBalance: number;
    isActive: boolean;
    createdAt?: string;
}

export interface FleetCard {
    id: string;
    fleetAccountId: string;
    cardNumber: string;
    vehiclePlate?: string;
    dailyLimit?: number;
    isBlocked: boolean;
    createdAt?: string;
}

export interface PriceHistory {
    id: string;
    stationId: string;
    fuelType: FuelType;
    oldPrice: number;
    newPrice: number;
    changedAt: string;
}

export interface ETRConfig {
    id: string;
    institutionId: string;
    stationId: string;
    deviceSerial: string;
    middlewareUrl?: string;
    isActive: boolean;
    lastSync?: string;
}

export interface ReorderPrediction {
    id: string;
    tankId: string;
    predictedDepletionDate: string;
    recommendedOrderDate: string;
    recommendedQuantity: number;
    confidenceScore: number;
}

export interface SMSLog {
    id: string;
    institutionId: string;
    recipientPhone: string;
    messageBody: string;
    msgType: 'loyalty' | 'fleet_alert' | 'inventory_alert';
    status: 'sent' | 'failed';
    createdAt: string;
}

export interface FleetTelemetry {
    id: string;
    cardId: string;
    latitude: number;
    longitude: number;
    distanceFromStation: number;
    recordedAt: string;
}

export interface FinancialReport {
    id: string;
    stationId: string;
    institutionId: string;
    reportType: 'daily' | 'weekly' | 'monthly';
    totalSales: number;
    totalTax: number;
    totalCommission: number;
    netProfit: number;
    periodStart: string;
    periodEnd: string;
}

export interface LeakAlert {
    id: string;
    tankId: string;
    stationId: string;
    varianceLiters: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    status: 'open' | 'resolved';
    detectedAt: string;
}

export interface StaffAchievement {
    id: string;
    userId: string;
    achievementType: string;
    pointsAwarded: number;
    badgeName?: string;
    createdAt: string;
}

export interface StationAsset {
    id: string;
    stationId: string;
    name: string;
    assetType: string;
    serialNumber: string;
    status: 'operational' | 'faulty' | 'maintenance' | 'decommissioned';
    healthScore: number;
    lastCalibration?: string;
    nextCalibrationDue?: string;
}

export interface MaintenanceLog {
    id: string;
    assetId: string;
    issueDescription: string;
    technicianName?: string;
    maintenanceCost: number;
    status: 'pending' | 'in_progress' | 'completed';
    scheduledDate?: string;
}

export interface CivilYard {
    id: string;
    institutionId: string;
    name: string;
    location?: string;
    isActive: boolean;
}

export interface CivilProduct {
    id: string;
    yardId?: string;
    name: string;
    productType: 'Block' | 'Paving' | 'Post' | 'Culvert' | 'Kerb';
    unitPrice: number;
    currentStock: number;
    strengthRating?: string;
}

export interface ManufacturingBatch {
    id: string;
    productId: string;
    batchNumber: string;
    quantityCast: number;
    castDate: string;
    releaseDate?: string;
    status: 'curing' | 'ready' | 'quarantined';
    strengthTestResult?: string;
}

export interface CivilSale {
    id: string;
    yardId?: string;
    customer_id?: string;
    projectName?: string;
    totalAmount: number;
    deliveryStatus: 'pending' | 'processing' | 'dispatched' | 'delivered';
    createdAt: string;
}

export interface LogisticVehicle {
    id: string;
    institutionId: string;
    plateNumber: string;
    vehicleType: 'Tanker' | 'Flatbed' | 'Crane Truck';
    capacityRating: string;
    currentOdometer: number;
    status: 'available' | 'on_trip' | 'maintenance' | 'decommissioned';
}

export interface LogisticDriver {
    id: string;
    institutionId: string;
    userId: string;
    licenseNumber: string;
    specialization?: string;
    rating: number;
    status: 'active' | 'on_leave' | 'suspended';
}

export interface LogisticTrip {
    id: string;
    vehicleId: string;
    driverId: string;
    cargoDescription: string;
    origin: string;
    destination: string;
    status: 'loading' | 'en_route' | 'offloading' | 'completed' | 'cancelled';
    startedAt: string;
    completedAt?: string;
}

export interface AlumniPost {
    id: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    institutionId: string;
    content: string;
    mediaUrls?: string[];
    likes: string[];
    commentsCount: number;
    comments_count?: number;
    createdAt: string;
    photoUrl?: string;
    videoUrl?: string;
    hashtags?: string[];
    schoolId?: string;
    groupId?: string;
    groupName?: string;
}

export interface AlumniComment {
    id: string;
    postId: string;
    authorId: string;
    authorName: string;
    authorPhoto?: string;
    institutionId?: string;
    content: string;
    createdAt: string;
}
