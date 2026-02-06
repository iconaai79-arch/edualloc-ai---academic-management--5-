
export type Role = 'super_admin' | 'admin' | 'hod' | 'lecturer' | 'student' | 'practice_teacher' | 'academics_officer' | 'parent' | 'librarian' | 'finance' | 'security' | 'info_desk' | 'store' | 'supplier' | 'head_teacher' | 'dos' | 'teacher' | 'deputy' | 'tto';

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

export interface Institution {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    institutionType: 'Primary' | 'Secondary' | 'University' | 'College' | 'Institute' | 'Polytechnic';
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
    