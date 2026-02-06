
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { 
    Institution, User, Subject, Department, CompanyDetails, MpesaTransaction, 
    Receipt, InvoiceItem, ActivityLog, Course, ExtensionRequest, Semester, 
    SmsConfig, AllocationRequest, LetterheadConfig, Priority, Unavailability, 
    UserUpdateData, MpesaConfig, SubscriptionConfig, EmailConfig, TransactionStatus,
    Room, Building, AcademicLevel, TimetableSettings, ExamTimetableSettings, RequestStatus, AcademicYear, TimetableEntry, Conflict, TimeOffRequest, TimeOffRequestStatus, EnrollmentRequest, AbsenceRequest, LecturerContract, FeedbackSubmission, LessonRating,
    Invoice, VoteHead, FeeStructure, FinancialPeriod, UserTask, BiometricConfig, StudentAbsenceRequest, StudentAbsenceRequestStatus, SecurityAlert, Visitor, Requisition, StudentAttendance, Assessment, AssessmentMark, ExamTimetableEntry, Role,
    Assignment, Submission
} from '../types.ts';
import { TransactionsManager } from './TransactionsManager.tsx';
import { DatabaseSettings } from './DatabaseSettings.tsx';
import { ActivityLogView } from './ActivityLogView.tsx';
import { UserManager } from './UserManager.tsx';
import { SubjectManager } from './SubjectManager.tsx';
import { CourseManager } from './CourseManager.tsx';
import { DepartmentManager } from './DepartmentManager.tsx';
import { BuildingManager } from './BuildingManager.tsx';
import { SettingsManager } from './SettingsManager.tsx';
import { 
    CheckCircleIcon, 
    ChatBubbleBottomCenterTextIcon, 
    ClipboardListIcon, 
    ChartPieIcon, 
    BuildingOfficeIcon, 
    UserGroupIcon, 
    RectangleStackIcon, 
    Cog8ToothIcon, 
    CheckIcon, 
    ShieldIcon, 
    SparklesIcon, 
    MagnifyingGlassIcon, 
    ArrowPathIcon, 
    ClockIcon, 
    CreditCardIcon, 
    InformationCircleIcon, 
    XIcon, 
    ArrowsRightLeftIcon, 
    ArchiveBoxIcon, 
    PrinterIcon, 
    ArrowUpTrayIcon, 
    EyeIcon, 
    DocumentArrowDownIcon, 
    CommandLineIcon, 
    MpesaIcon, 
    CurrencyIcon, 
    PaperAirplaneIcon, 
    LockClosedIcon, 
    EnvelopeIcon,
    AcademicCapIcon, 
    MapPinIcon, 
    BookOpenIcon, 
    UserIcon, 
    CalendarDaysIcon, 
    ChartBarIcon, 
    ExclamationTriangleIcon, 
    BeakerIcon, 
    PlusIcon,
    ArrowRightOnRectangleIcon
} from './icons/index.ts';
import { CommunicationsManager } from './CommunicationsManager.tsx';
import { EditInstitutionModal } from './EditInstitutionModal.tsx';
import { apiService } from '../services/apiService.ts';
import { generateFullSqlScript } from '../utils/sqlGenerator.ts';
import { BrandedPaper } from './BrandedPaper.tsx';
import { AcademicYearManager } from './AcademicYearManager.tsx';
import { TimetableGenerator } from './TimetableGenerator.tsx';
import { ReportsDashboard } from './ReportsDashboard.tsx';
import { InteractionsManager } from './InteractionsManager.tsx';
import { INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS } from '../constants.ts';
import { WallPosterView } from './WallPosterView.tsx';
import { TenantInvoiceManager } from './TenantInvoiceManager.tsx';
import { DirectAssignModal } from './DirectAssignModal.tsx';
import { LecturerView } from '../LecturerView.tsx';
import { StudentView } from './StudentView.tsx';
import { AcademicsOfficerView } from '../AcademicsOfficerView.tsx';
import { AdminView } from '../AdminView.tsx';
import { ProfileModal } from './ProfileModal.tsx';
import { LoginView } from './LoginView.tsx';
import { PublicAppointmentView } from './PublicAppointmentView.tsx';
import { GuestFeedbackView } from './GuestFeedbackView.tsx';
import { ChatBot } from './ChatBot.tsx';
import { SuspendedAccountView } from './SuspendedAccountView.tsx';
import { MandatoryUpdateView } from './MandatoryUpdateView.tsx';
import { TimetableWizard } from './TimetableWizard.tsx';

export interface SuperAdminViewProps {
    institutions: Institution[];
    users: User[];
    requests: AllocationRequest[];
    allocations: AllocationRequest[];
    departments: Department[];
    subjects: Subject[];
    courses: Course[];
    rooms: Room[];
    buildings: Building[];
    academicLevels: AcademicLevel[];
    academicYears: AcademicYear[];
    semesters: Semester[];
    activeAcademicYear: AcademicYear | null;
    activeSemester: Semester | null;
    timetableSettings: TimetableSettings;
    examTimetableSettings: ExamTimetableSettings;
    logoUrl: string | null;
    footerImageUrl: string | null;
    themeColor: string;
    companyDetails: CompanyDetails;
    activityLog: ActivityLog[];
    transactions: MpesaTransaction[];
    receipts: Receipt[];
    invoices: Invoice[];
    extensionRequests: ExtensionRequest[];
    voteHeads: VoteHead[];
    feeStructures: FeeStructure[];
    financialPeriods: FinancialPeriod[];
    userTasks: UserTask[];
    generatedTimetable: TimetableEntry[];
    allTimetableEntries: TimetableEntry[];
    finalTimetableUrl: string | null;
    letterheadConfig: LetterheadConfig;
    smsConfig: SmsConfig;
    emailConfig: EmailConfig;
    timetableConflicts: Conflict[];
    currentInstitution?: Institution | null;
    currentUser: User;
    
    onAddUser?: (userData: any) => void;
    onEditUser: (id: string, data: any) => Promise<void>;
    onDeleteUser: (id: string) => Promise<void>;
    onImportUsers: (imported: any[]) => Promise<void>;
    onImportStudents: (imported: any[]) => Promise<void>;
    onAddDepartment?: (name: string) => Promise<void> | void;
    onUpdateDepartment?: (id: string, name: string) => void;
    onDeleteDepartment?: (id: string) => void;
    onImportDepartments?: (departments: any[]) => Promise<void>;
    onAddSubject?: (data: any, initialCourseLevelIds?: string[]) => void;
    onUpdateSubject?: (id: string, data: any) => void;
    onDeleteSubject?: (id: string) => void;
    onEditSubject?: (subject: Subject) => void;
    onAddRoom?: (data: any) => void;
    onUpdateRoom?: (id: string, data: any) => void;
    onDeleteRoom?: (id: string) => void;
    onAddCourse?: (data: any) => void;
    onImportCourses?: (data: any[]) => Promise<void>;
    onUpdateCourse?: (id: string, data: any) => void;
    onDeleteCourse?: (id: string) => void;
    onAddAcademicLevel?: (name: string) => void;
    onUpdateAcademicLevel?: (id: string, name: string) => void;
    onDeleteAcademicLevel?: (id: string) => void;
    onAddAcademicYear?: (data: any) => void;
    onUpdateAcademicYear?: (id: string, data: any) => Promise<void>;
    onDeleteAcademicYear?: (id: string) => void;
    onAddSemester?: (data: any) => void;
    onUpdateSemester?: (id: string, data: any) => Promise<void>;
    onDeleteSemester?: (id: string) => void;
    onUpdateRequestStatus?: (id: string, status: RequestStatus) => Promise<void>;
    onBulkUpdateRequestStatus?: (status: RequestStatus, deptId?: string) => Promise<void>;
    onDirectAssign?: (lid: string, sids: string[], p: Priority, j: string, c: any) => void;
    onTimetableGenerated: (entries: any[], ay: string, sem: string) => Promise<void>;
    onExamTimetableGenerated: (entries: any[], ay: string, sem: string) => Promise<void>;
    onSaveTimetableSettings?: (settings: TimetableSettings) => void;
    onSaveExamTimetableSettings?: (settings: ExamTimetableSettings) => void;
    onUpdateLogo?: (logo: string | null) => void;
    onUpdateThemeColor?: (color: string) => void;
    onUpdateInstitution?: (id: string, data: any) => Promise<void>;
    onAddTask?: (data: any) => void;
    onUpdateTask?: (id: string, complete: boolean) => void;
    onDeleteTask?: (id: string) => void;
    onLogAction?: (action: string) => Promise<void>;
    onSendSms?: (r: string, m: string) => Promise<any>;
    onSaveSmsConfig?: (config: SmsConfig) => void;
    onUpdateRequest: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    onWithdrawRequest: (id: string) => void;
    onAddUnavailability?: (userId: string, u: Omit<Unavailability, 'id' | 'status'>) => void;
    onUpdateUnavailability?: (userId: string, id: string, data: any) => void;
    onDeleteUnavailability?: (userId: string, id: string) => void;
    onManageUnavailability?: (user: User) => void;
    onAddParent?: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent?: (studentId: string, parentId: string) => void;
    getLecturerById?: (id: string) => User | undefined;
    getSubjectById?: (id: string) => Subject | undefined;
    getRoomById?: (id: string) => Room | undefined;
    onPublishTimetable?: (fileUrl: string) => void;
    onRemovePublishedTimetable?: () => void;
    onSendTestEmail?: (recipient: string) => Promise<{ success: boolean; message: string; }>;
    onSaveEmailConfig?: (config: EmailConfig) => void;
    onSaveLetterheadConfig?: (config: LetterheadConfig) => void;
    onUpdateFooterImage?: (footerUrl: string | null) => void;
    onImportRooms?: (rooms: Omit<Room, 'id' | 'institutionId'>[]) => void;
    onImportSubjectsAndAssociate?: (subjects: (Omit<Subject, 'id' | 'institutionId'> & { targetCourseLevelId?: string })[]) => Promise<void>;
    onAssociateSubjectToCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onDisassociateSubjectFromCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onAddTransaction?: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onAddExtensionRequest?: (reason: string) => void;
    onUpdateExtensionRequestStatus?: (requestId: string, status: 'approved' | 'rejected', extensionDays?: number) => void;
    onSaveBiometricConfig?: (config: BiometricConfig) => void;
    onUpdateVoteHeads?: (heads: VoteHead[]) => void;
    onUpdateFeeStructures?: (structures: FeeStructure[]) => void;
    onUpdateFinancialPeriods?: (periods: FinancialPeriod[]) => void;
    onAddBuildings?: (buildings: Omit<Building, 'id' | 'institutionId'>[]) => Promise<void>;
    onUpdateBuilding?: (id: string, data: any) => void;
    onDeleteBuilding?: (id: string) => void;
    timeOffRequests: TimeOffRequest[];
    onUpdateTimeOffRequestStatus?: (id: string, status: TimeOffRequestStatus) => void;
    enrollmentRequests?: EnrollmentRequest[];
    absenceRequests: AbsenceRequest[];
    studentAbsenceRequests: StudentAbsenceRequest[];
    onUpdateEnrollmentRequest?: (id: string, status: 'approved' | 'rejected') => void;
    onUpdateAbsenceRequest?: (id: string, status: 'approved' | 'rejected') => void;
    onUpdateStudentAbsenceRequestStatus?: (id: string, status: StudentAbsenceRequestStatus) => void;
    isTimetableGenerating: boolean;
    timetableGenerationProgress: number;
    timetableGenerationMessage: string;
    timetableGenerationEta: number | null;
    onSetIsTimetableGenerating?: (v: boolean) => void;
    onSetTimetableGenerationProgress?: (v: number) => void;
    onSetTimetableGenerationMessage?: (v: string) => void;
    onSetTimetableGenerationEta?: (v: number | null) => void;
    onAddSecurityAlert?: (data: any) => void;
    onSetSettingsTab?: (v: string) => void;
    onSetSettingsSubTab?: (v: string) => void;
    onResolveSecurityAlert?: (id: string) => void;
    securityAlerts: SecurityAlert[];
    visitors: Visitor[];
    requisitions: Requisition[];
    onApproveRequisition?: (id: string, status: any) => void;
    studentAttendances: StudentAttendance[];
    studentCheckIns: Record<string, string>;
    lessonRatings: LessonRating[];
    feedbackSubmissions: FeedbackSubmission[];
    onUpdateFeedbackStatus?: (id: string, status: string) => void;
    courseSizes: Map<string, number>;
    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    onAddAssessment?: (data: any) => void;
    onDeleteAssessment?: (id: string) => void;
    onUpdateAssessmentStatus?: (id: string, status: string) => void;
    onSaveAssessmentMarks?: (id: string, data: any) => void;
    contracts: LecturerContract[];
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    isGeneratingDemoData: boolean;
    demoDataGenerationProgress: number;
    demoDataGenerationMessage: string;
    examTimetable: ExamTimetableEntry[];
    onSwitchPerspective?: (role: Role) => void;
    onWithdrawRequestStatus?: (id: string) => Promise<void>;
    onManualInvoice?: (institutionId: string, items: InvoiceItem[], totalAmount: number, dueDate: string) => void;
    onUpdateCompanyDetails?: (details: CompanyDetails) => Promise<void>;
    onAddInstitution: (data: Omit<Institution, 'id'>) => void;
    onDeleteInstitution: (institutionId: string) => void;
    onToggleInstitutionStatus: (institutionId: string) => void;
    onLoginAsAdmin: (institutionId: string) => void;
    onGenerateReceipt: (transaction: MpesaTransaction) => void;
    
    // New Props
    assignments?: Assignment[];
    submissions?: Submission[];
    onAddAssignment?: (data: Omit<Assignment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssignment?: (id: string) => void;
    onUpdateSubmission?: (id: string, data: Partial<Submission>) => void;
    isImpersonating?: boolean;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = (props) => {
    // Fixed: Defensive empty arrays to handle potentially undefined prop data
    const {
        institutions = [], 
        users = [], 
        subjects = [], 
        departments = [], 
        courses = [], 
        companyDetails,
        onDeleteInstitution, 
        onToggleInstitutionStatus, 
        onUpdateInstitution, 
        onUpdateCompanyDetails,
        onLoginAsAdmin, 
        onSendSms, 
        currentUser, 
        onImportUsers, 
        onImportStudents,
        onEditUser, 
        onDeleteUser, 
        activityLog = [], 
        semesters = [], 
        logoUrl, 
        transactions = [], 
        receipts = [], 
        onGenerateReceipt,
        invoices = [],
        extensionRequests = [],
        voteHeads = [],
        feeStructures = [],
        financialPeriods = [],
        userTasks = [],
        generatedTimetable = [],
        allTimetableEntries = [],
        letterheadConfig,
        smsConfig,
        emailConfig,
        timetableConflicts = [],
        currentInstitution,
        timetableSettings,
        examTimetableSettings,
        rooms = [],
        allocations = [],
        requests = [],
        activeAcademicYear,
        activeSemester,
        assignments = [],
        submissions = [],
        assessments = [],
        assessmentMarks = [],
        feedbackSubmissions = [],
        lessonRatings = [],
        studentAbsenceRequests = [],
        enrollmentRequests = [],
        courseSizes = new Map(),
        timeOffRequests = [],
        contracts = [],
        securityAlerts = [],
        visitors = [],
        requisitions = [],
        studentAttendances = [],
        studentCheckIns = {},
        academicYears = [],
        academicLevels = [],
        buildings = [],
        finalTimetableUrl,
        examTimetable = [],
        themeColor,
        footerImageUrl
    } = props;
    
    const [activeTab, setActiveTab] = useState<'dashboard' | 'institutions' | 'all_users' | 'academics' | 'communications' | 'settings' | 'migration' | 'user_activity' | 'reports' | 'timetable' | 'interactions'>('dashboard');
    const [institutionsSubTab, setInstitutionsSubTab] = useState<'list' | 'requests'>('list');
    const [academicsSubTab, setAcademicsSubTab] = useState<'subjects' | 'courses'>('subjects');

    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
    const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
    const [migrationSubTab, setMigrationSubTab] = useState<'full' | 'semester'>('full');
    const [copyStatus, setCopyStatus] = useState(false);
    const [requestedSettingsTab, setRequestedSettingsTab] = useState<string | undefined>(undefined);
    const [isPerspectiveModalOpen, setIsPerspectiveModalOpen] = useState(false);
    const [isDirectAssignOpen, setIsDirectAssignOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isAddingInstitution, setIsAddingInstitution] = useState(false);
    const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'infrastructure' | 'branding' | 'sms' | 'email' | 'billing'>('profile');
    
    // State for new institution form
    const [newInstData, setNewInstData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        institutionType: 'University' as Institution['institutionType']
    });

    // Timetable state
    const [timetableSubTab, setTimetableSubTab] = useState<'wizard' | 'scheduler' | 'calendar' | 'subjects'>('wizard');

    const fetchHealth = useCallback(async () => {
        setIsRefreshingHealth(true);
        try {
            const health = await apiService.testDatabaseConnection();
            setHealthStatus(health);
        } catch (e) {
            setHealthStatus({ status: 'offline', dbName: 'Unknown' });
        } finally {
            setIsRefreshingHealth(false);
        }
    }, []); 

    useEffect(() => {
        if (activeTab === 'dashboard') fetchHealth();
    }, [activeTab, fetchHealth]);

    const filteredInstitutions = useMemo(() => {
        const list = Array.isArray(institutions) ? institutions : [];
        if (!institutionSearchQuery.trim()) return list;
        const lower = institutionSearchQuery.toLowerCase();
        return list.filter(inst => 
            inst && (inst.name?.toLowerCase().includes(lower) || 
            inst.institutionCode?.toLowerCase().includes(lower))
        );
    }, [institutions, institutionSearchQuery]);

    // Configuration local states
    const [localCompanyInfo, setLocalCompanyInfo] = useState({
        name: companyDetails?.name || '',
        applicationTitle: companyDetails?.applicationTitle || '',
        themeColor: companyDetails?.themeColor || '#4f46e5',
        email: companyDetails?.email || '',
        phone: companyDetails?.phone || '',
        website: companyDetails?.website || '',
        address: companyDetails?.address || '',
        logoUrl: companyDetails?.logoUrl || '',
        footerImageUrl: companyDetails?.footerImageUrl || '',
        letterheadConfig: companyDetails?.letterheadConfig || { headerImageUrl: null, stampImageUrl: null },
        welcomeMessage: companyDetails?.chatAssistantConfig?.welcomeMessage || '',
        chatEnabled