

export type Role = 'super_admin' | 'reseller' | 'county_admin' | 'county_staff' | 'admin' | 'hod' | 'lecturer' | 'student' | 'practice_teacher' | 'academics_officer' | 'parent' | 'librarian' | 'security' | 'info_desk' | 'store' | 'supplier' | 'head_teacher' | 'dos' | 'teacher' | 'deputy' | 'tto' | 'county_secretary' | 'county_driver' | 'county_store_keeper' | 'county_teacher' | 'county_director' | 'county_co' | 'county_cec' | 'county_deputy_governor' | 'county_governor' | 'boarding_master' | 'driver' | 'transport_assistant' | 'agrovet_admin' | 'property_admin' | 'carwash_admin' | 'carwash_attendant' | 'transport_admin' | 'carwash_customer' | 'landlord' | 'tenant';


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
    expertise: string[];
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
    driverType?: 'staff' | 'private';
    smsBalance?: number;
    subscriptionStatus?: 'active' | 'expired' | 'none';
    subscriptionExpiry?: string;
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
}

export interface Institution {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    institutionType: 'Primary' | 'Secondary' | 'University' | 'College' | 'Institute' | 'Polytechnic' | 'ECD' | 'International' | 'Business' | 'Broadcaster' | 'Reseller';
    businessSubType?: string;
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
    customModulePricing?: Record<string, { monthly?: number; yearly?: number }>;
    parentAbsenceNotificationsEnabled?: boolean;
    marketplaceEnabled?: boolean;
    listingQuota?: number;
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

export interface CompanyDetails {
    name: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    logoUrl: string | null;
    footerImageUrl?: string | null;
    applicationTitle?: string;
    themeColor?: string;
    subscriptionConfig: SubscriptionConfig;
    mpesaConfig: MpesaConfig;
    emailConfig: EmailConfig;
    smsConfig: SmsConfig;
    letterheadConfig: LetterheadConfig;
    databaseConfig: DatabaseConfig;
    chatAssistantConfig?: {
        enabled: boolean;
        welcomeMessage?: string;
    };
    enforceGlobalOtp?: boolean;
}

export interface UserTask {
    id: string;
    userId: string;
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
}

export interface AppNotification {
    id: string;
    userId: string;
    message: string;
    type: string;
    isRead: boolean;
    timestamp: string;
}

export interface SmsLog {
    id: string;
    institutionId: string;
    senderId: string;
    recipient: string;
    message: string;
    units: number;
    status: string;
    provider: string;
    gatewayResponse?: any;
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
    type: string;
    description: string;
    maxMarks: number;
    assessmentDate: string;
    status: 'Draft' | 'Published' | 'Graded';
    institutionId: string;
    createdAt: string;
}

export interface Vehicle {
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
    vehicleId?: string;
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
    vehicleId: string;
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
    status: 'pending' | 'accepted' | 'rejected';
    issueDate: string;
    acceptanceTimestamp?: string;
    rejectionReason?: string;
    signatureUrl?: string | null;
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
    type: 'room' | 'lecturer' | 'consecutive_subject';
    resourceId: string;
    day: string;
    startTime: string;
    conflictingEntries: TimetableEntry[];
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
    createdBy: string;
    createdAt: string;
    status: 'active' | 'resolved';
    targetId: string;
    targetName: string;
    targetRole: 'student' | 'lecturer' | 'guest';
    type: 'Disciplinary' | 'Fee Balance' | 'Security Risk' | 'Other';
    severity: 'Low' | 'Medium' | 'High';
    description: string;
}

export interface Visitor {
    id: string;
    name: string;
    email?: string;
    phoneNumber?: string;
    purpose: string;
    visitDate: string;
    timeIn?: string;
    timeOut?: string;
    institutionId?: string;
    hostId?: string;
    vehiclePlate?: string;
    vehicleModel?: string;
}

export interface Requisition {
    id: string;
    institutionId: string;
    requestedBy: string;
    requestedDate: string;
    items: any[];
    totalEstimatedCost: number;
    status: string;
    supplierId?: string;
    lpoNumber?: string;
    rejectionReason?: string;
    supplierResponse?: 'accepted' | 'rejected';
    deliveryEta?: string;
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
}

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
    category: string;
    userId?: string;
    suppliedItems?: { itemId: string; price: number }[];
    documents?: BusinessDocument[];
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
    reorderLevel: number;
    location: string;
    lastUpdated: string;
    institutionId: string;
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
}

export interface ProfileUpdateData {
    name?: string;
    phoneNumber?: string;
    expertise?: string[];
    profilePhotoUrl?: string | null;
    gender?: 'Male' | 'Female' | 'Other';
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

// ============================================================================
// AGROVET MODULE TYPES
// ============================================================================

export type AgrovetSaleStatus = 'pending' | 'completed' | 'cancelled';
export type AgrovetPaymentMethod = 'cash' | 'mpesa' | 'credit';
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
    propertyId: string;
    unitId?: string;
    title: string;
    description?: string;
    priority: PMPriority;
    status: PMTicketStatus;
    assignedTo?: string;
    cost: number;
    institutionId: string;
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
    institutionId: string;
    paymentIds?: string[]; // IDs of PMPayment records included in this disbursement
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
