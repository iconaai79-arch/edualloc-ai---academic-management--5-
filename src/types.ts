

export type Role = 'super_admin' | 'county_admin' | 'admin' | 'hod' | 'lecturer' | 'student' | 'practice_teacher' | 'academics_officer' | 'parent' | 'librarian' | 'security' | 'info_desk' | 'store' | 'supplier' | 'head_teacher' | 'dos' | 'teacher' | 'deputy' | 'tto';


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
    institutionType: 'Primary' | 'Secondary' | 'University' | 'College' | 'Institute' | 'Polytechnic' | 'ECD' | 'International';
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
    countyId?: string;
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

export interface CourseLevel {
    id: string;
    name: string;
    subjectIds: string[];
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

export interface TimetableEntry {
    id: string;
    day: string;
    startTime: string;
    endTime: string;
    subjectId: string;
    lecturerId: string;
    roomId: string;
    institutionId?: string;
    academicYearId?: string;
    semesterId?: string;
    attendanceStatus?: 'present' | 'absent' | 'late' | 'pending_absence_request' | 'approved_absence';
    attendance_status?: 'present' | 'absent' | 'late' | 'pending_absence_request' | 'approved_absence';
    isConflicting?: boolean;
    duration?: number;
    sharedWithPracticeTeacherId?: string | null;
    start_time: string;
    end_time: string;
    subject_id: string;
    lecturer_id: string;
    room_id: string;
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
    status: 'active' | 'inactive';
    requestDeadline?: string;
    enrollmentDeadline?: string;
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
}

export interface EmailConfig {
    host: string;
    port: number;
    username: string;
    password: string;
    encryption: 'tls' | 'ssl' | 'none';
    fromName: string;
    fromEmail: string;
}

export interface SubscriptionConfig {
    defaultMonthlyPrice: number;
    defaultYearlyPrice: number;
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
    type: 'room' | 'lecturer';
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
    timestamp: string;
    status: TransactionStatus;
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
    studentId?: string;
}

export interface Book {
    id: string;
    title: string;
    author: string;
    isbn: string;
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
    institutionId: string;
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

export interface StockTransaction {
    id: string;
    itemId: string;
    itemName: string;
    type: 'Restock' | 'Dispatch' | 'Adjustment';
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
    departmentId?: string;
    expertise?: string[];
    gender?: 'Male' | 'Female' | 'Other';
}

export type UserMappingField = 'name' | 'email' | 'phoneNumber' | 'staffId' | 'role' | 'departmentName' | 'expertise' | 'gender';

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
}
