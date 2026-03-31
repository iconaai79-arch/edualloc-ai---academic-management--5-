
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type {
    Institution, User, Subject, Department, CompanyDetails, MpesaTransaction,
    Receipt, InvoiceItem, ActivityLog, Course, ExtensionRequest, Semester,
    SmsConfig, AllocationRequest, LetterheadConfig, Priority, Unavailability,
    UserUpdateData, MpesaConfig, SubscriptionConfig, EmailConfig, TransactionStatus,
    Room, Building, AcademicLevel, TimetableSettings, ExamTimetableSettings, RequestStatus, AcademicYear, TimetableEntry, Conflict, TimeOffRequest, TimeOffRequestStatus, EnrollmentRequest, AbsenceRequest, LecturerContract, FeedbackSubmission, LessonRating, LeaveOutRequest,
    Invoice, VoteHead, FeeStructure, FinancialPeriod, UserTask, BiometricConfig, StudentAbsenceRequest, StudentAbsenceRequestStatus, SecurityAlert, Visitor, Requisition, StudentAttendance, Assessment, AssessmentMark, ExamTimetableEntry, Role,
    Assignment, Submission, County, CommissionWithdrawalRequest, ShowcaseItem,
    CoopFarmer, CoopCollection, CoopRider, CoopAgrovetInventory, CoopAgrovetSales,
    SaccoAccount, SaccoTransaction, CoopMonthlyPayout, CoopExpense, CoopIncome,
    RetailStore, RetailInventoryItem, Supplier, RetailExpense, TransportVehicle,
    TransportOnboarding, VehicleLog
} from '../types';
import { TransactionsManager } from './TransactionsManager';
import { DatabaseSettings } from './DatabaseSettings';
import { ActivityLogView } from './ActivityLogView';
import { UserManager } from './UserManager';
import { InteractionsManager } from './InteractionsManager';
import { SubjectManager } from './SubjectManager';
import { CourseManager } from './CourseManager';
import { DepartmentManager } from './DepartmentManager';
import { BuildingManager } from './BuildingManager';
import { SettingsManager } from './SettingsManager';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { ChatBubbleLeftRightIcon } from './icons/ChatBubbleLeftRightIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { RectangleStackIcon } from './icons/RectangleStackIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { CheckIcon } from './icons/CheckIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { XIcon } from './icons/XIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { EyeIcon } from './icons/EyeIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { MpesaIcon } from './icons/MpesaIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { LockClosedIcon } from './icons/LockClosedIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { UserIcon } from './icons/UserIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { PlusIcon } from './icons/PlusIcon';
import { BedIcon } from './icons/BedIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { HomeIcon } from './icons/HomeIcon';
import { TruckIcon } from './icons/TruckIcon';
import { ShoppingCartIcon } from './icons/ShoppingCartIcon';
import { BanknotesIcon } from './icons/BanknotesIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { CalendarDaysIcon as CalendarIcon } from './icons/CalendarDaysIcon';

import { CommunicationsManager } from './CommunicationsManager';
import { EditInstitutionModal } from './EditInstitutionModal';
import { apiService } from '../services/apiService';
import { generateFullSqlScript } from '../utils/sqlGenerator';
import { BrandedPaper } from './BrandedPaper';
import { AcademicYearManager } from './AcademicYearManager';
import { SuperAdminReports } from './SuperAdminReports';

import { INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS } from '../constants';
import { WallPosterView } from './WallPosterView';
import { TenantInvoiceManager } from './TenantInvoiceManager';
import { DirectAssignModal } from './DirectAssignModal';
import { ProfileModal } from './ProfileModal';
import { PublicAppointmentView } from './PublicAppointmentView';
import { GuestFeedbackView } from './GuestFeedbackView';
import { ChatBot } from './ChatBot';
import { SuspendedAccountView } from './SuspendedAccountView';
import { MandatoryUpdateView } from './MandatoryUpdateView';
import { TimetableWizard } from './TimetableWizard';
import { ParentView } from './ParentView';
import { CountyManager } from './CountyManager';
import { PropertyMarketplaceView } from './PropertyMarketplaceView';
import { ExternalModuleView } from './ExternalModuleView';
import { MarketingLandingPage } from './public/MarketingLandingPage';
import { DemoRequestManager } from './DemoRequestManager';
import { DemoRequest } from '../types';

// Lazy-load major views to break circular dependencies and reduce initial chunk size
const AdminView = React.lazy(() => import('./AdminView').then(m => ({ default: m.AdminView })));
const LecturerView = React.lazy(() => import('./LecturerView').then(m => ({ default: m.LecturerView })));
const StudentView = React.lazy(() => import('./StudentView').then(m => ({ default: m.StudentView })));
const AcademicsOfficerView = React.lazy(() => import('./AcademicsOfficerView').then(m => ({ default: m.AcademicsOfficerView })));
const LoginView = React.lazy(() => import('./LoginView').then(m => ({ default: m.LoginView })));

export interface SuperAdminViewProps {
    institutions: Institution[];
    counties: County[];
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
    onRefreshData?: () => void;
    currentUser: User;

    onAddUser?: (userData: any) => Promise<void>;
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
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    isGeneratingDemoData?: boolean;
    demoDataGenerationProgress?: number;
    demoDataGenerationMessage?: string;
    onSendBulkCredentials?: (users: User[], method: 'email' | 'sms') => Promise<{ success_count: number; fail_count: number }>;
    onSendSms?: (r: string, m: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
    onSaveSmsConfig?: (config: SmsConfig) => void;
    onUpdateRequest: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    onWithdrawRequest: (id: string) => Promise<void>;
    onAddUnavailability?: (userId: string, u: Omit<Unavailability, 'id' | 'status'>) => void;
    onUpdateUnavailability?: (userId: string, id: string, data: any) => void;
    onDeleteUnavailability?: (userId: string, id: string) => void;
    onManageUnavailability?: (user: User) => void;
    onAddParent?: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent?: (studentId: string, parentId: string) => void;
    onAddCoopAgrovetInventory?: (data: Partial<CoopAgrovetInventory>) => Promise<void>;
    onAddCoopAgrovetSale?: (data: Partial<CoopAgrovetSales>) => Promise<void>;
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
    onAddCounty?: (data: Omit<County, 'id' | 'createdAt'>) => void;
    onUpdateCounty?: (id: string, data: Partial<County>) => void;
    onDeleteCounty?: (id: string) => void;
    onAddBuildings?: (buildings: Omit<Building, 'id' | 'institutionId'>[]) => Promise<void>;

    onAddBuilding?: (name: string) => Promise<boolean>;
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
    examTimetable: ExamTimetableEntry[];
    onSwitchPerspective?: (role: Role) => void;
    onWithdrawRequestStatus?: (id: string) => Promise<void>;
    onManualInvoice?: (institutionId: string, items: InvoiceItem[], totalAmount: number, dueDate: string) => void;
    onUpdateCompanyDetails?: (details: CompanyDetails) => Promise<void>;
    onAddInstitution: (data: Omit<Institution, 'id'>) => Promise<void>;
    onDeleteInstitution: (institutionId: string) => void;
    onToggleInstitutionStatus: (institutionId: string) => void;
    onLoginAsAdmin: (institutionId: string, initialRole?: Role | null) => void;
    onGenerateReceipt: (transaction: MpesaTransaction) => void;

    // New Props
    assignments?: Assignment[];
    submissions?: Submission[];
    onAddAssignment?: (data: Omit<Assignment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssignment?: (id: string) => void;
    onUpdateSubmission?: (id: string, data: Partial<Submission>) => void;
    coopFarmers?: CoopFarmer[];
    coopCollections?: CoopCollection[];
    coopRiders?: CoopRider[];
    coopAgrovetInventory?: CoopAgrovetInventory[];
    coopAgrovetSales?: CoopAgrovetSales[];
    saccoAccounts?: SaccoAccount[];
    saccoTransactions?: SaccoTransaction[];
    coopPayouts?: CoopMonthlyPayout[];
    coopExpenses?: CoopExpense[];
    coopIncome?: CoopIncome[];
    retailStores?: RetailStore[];
    inventory?: RetailInventoryItem[];
    suppliers?: Supplier[];
    retailExpenses?: RetailExpense[];
    vehicles?: TransportVehicle[];
    transportOnboarding?: TransportOnboarding[];
    vehicleLogs?: VehicleLog[];
    onAddFarmer?: (data: any) => Promise<void>;
    onUpdateFarmer?: (id: string, data: any) => Promise<void>;
    onImportFarmers?: (data: any[]) => Promise<void>;
    onLogCollection?: (data: any) => Promise<void>;
    onImportCollections?: (data: any[]) => Promise<void>;
    onBulkConfirmCollections?: (riderId: string, collections: any[]) => Promise<void>;
    onAddRider?: (data: any) => Promise<void>;
    onConfirmCollection?: (id: string, qty: number) => Promise<void>;
    onApproveCollection?: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onAddCoopExpense?: (data: Partial<CoopExpense>) => Promise<void>;
    onAddCoopIncome?: (data: Partial<CoopIncome>) => Promise<void>;
    onInitiatePayouts?: (payoutIds: string[]) => Promise<void>;
    onApprovePayouts?: (payoutIds: string[]) => Promise<void>;
    onAddPayouts?: (payouts: any[]) => Promise<void>;
    onAddVehicle?: (vehicle: Omit<TransportVehicle, 'id'>) => Promise<void>;
    onUpdateVehicle?: (id: string, updates: Partial<TransportVehicle>) => Promise<void>;
    onDeleteVehicle?: (id: string) => Promise<void>;
    onLogGateAction?: (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => Promise<void>;
    onOnboardStudent?: (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => Promise<void>;
    onOffboardStudent?: (recordId: string, lat?: number, lng?: number) => Promise<void>;
    onConfirmReceipt?: (recordId: string) => Promise<void>;
    onAddRetailExpense?: (expense: Omit<RetailExpense, 'id' | 'institutionId' | 'date' | 'recordedById'>) => Promise<void>;
    onAddRequisition?: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
    onUpdateRequisition?: (reqId: string, data: Partial<Requisition>) => Promise<void>;
    onActivateModuleTrial?: (moduleId: string) => Promise<void>;
    isImpersonating?: boolean;
    leaveOutRequests?: LeaveOutRequest[];
    demoRequests: DemoRequest[];
    onUpdateDemoStatus: (id: string, status: DemoRequest['status']) => Promise<void>;
}

export const SuperAdminView: React.FC<SuperAdminViewProps> = (props: SuperAdminViewProps) => {
    // Fixed: Defensive empty arrays to handle potentially undefined prop data
    const {
        institutions = [],
        counties = [],
        users = [],
        subjects = [],
        departments = [],
        courses = [],
        companyDetails,
        onDeleteInstitution,
        onToggleInstitutionStatus,
        onUpdateInstitution,
        onLoginAsAdmin,
        onSendSms,
        currentUser,
        onRefreshData,
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
        footerImageUrl,
        onAddCounty,
        onUpdateCounty,
        onDeleteCounty,
        demoRequests = [],
        onUpdateDemoStatus
    } = props;

    const [activeTab, setActiveTab] = useState<'dashboard' | 'institutions' | 'external_module' | 'interactions' | 'reports' | 'all_users' | 'academics' | 'communications' | 'settings' | 'migration' | 'user_activity' | 'demo_requests'>('dashboard');
    const [institutionsSubTab, setInstitutionsSubTab] = useState<'list' | 'counties' | 'resellers' | 'business' | 'requests' | 'transactions' | 'withdrawals' | 'external_links'>('list'); // Modified for Counties, Resellers & Business
    const [academicsSubTab, setAcademicsSubTab] = useState<'subjects' | 'courses'>('subjects');

    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
    const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
    const [migrationSubTab, setMigrationSubTab] = useState<'full' | 'semester'>('full');
    const [copyStatus, setCopyStatus] = useState(false);
    const [requestedSettingsTab, setRequestedSettingsTab] = useState<string | undefined>(undefined);
    const [isPerspectiveModalOpen, setIsPerspectiveModalOpen] = useState(false);
    const [withdrawalRequests, setWithdrawalRequests] = useState<CommissionWithdrawalRequest[]>([]);
    const [isProcessingWithdrawal, setIsProcessingWithdrawal] = useState(false);
    const [selectedTenantForPerspective, setSelectedTenantForPerspective] = useState<Institution | null>(null);
    const [isDirectAssignOpen, setIsDirectAssignOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isAddingInstitution, setIsAddingInstitution] = useState(false);
    const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'infrastructure' | 'branding' | 'sms' | 'email' | 'billing' | 'sms_pricing' | 'marketplace' | 'showcase' | 'system_build'>('profile');
    const [billingSubTab, setBillingSubTab] = useState<'mpesa' | 'ncba'>('mpesa');
    const [showDocumentPreview, setShowDocumentPreview] = useState(false);
    const [extendingInstitution, setExtendingInstitution] = useState<Institution | null>(null);
    const [extensionDays, setExtensionDays] = useState(30);
    const [managingGatewayFor, setManagingGatewayFor] = useState<Institution | null>(null);
    const [managingMpesaFor, setManagingMpesaFor] = useState<Institution | null>(null);
    const [managingPlansFor, setManagingPlansFor] = useState<Institution | null>(null);
    const [managingMarketplaceFor, setManagingMarketplaceFor] = useState<Institution | null>(null);
    const [managingSmsUnitsFor, setManagingSmsUnitsFor] = useState<Institution | null>(null);
    const [tenantSmsConfig, setTenantSmsConfig] = useState<SmsConfig>({ provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
    const [tenantMpesaConfig, setTenantMpesaConfig] = useState<MpesaConfig>({ paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
    const [tenantModulePricing, setTenantModulePricing] = useState<Record<string, { monthly?: number; yearly?: number }>>({});
    const [tenantSmsAdjustment, setTenantSmsAdjustment] = useState<{ amount: number; reason: string }>({ amount: 0, reason: '' });
    const [isSavingTenantConfig, setIsSavingTenantConfig] = useState(false);
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };
    const [resettingPasswordFor, setResettingPasswordFor] = useState<Institution | null>(null);
    const [isResettingPassword, setIsResettingPassword] = useState(false);

    // Showcase Item Management State
    const [editingShowcaseItem, setEditingShowcaseItem] = useState<ShowcaseItem | null>(null);
    const [isShowcaseItemModalOpen, setIsShowcaseItemModalOpen] = useState(false);
    const [isUploadingShowcaseImage, setIsUploadingShowcaseImage] = useState(false);

    // Commission Disbursement State
    const [disburseReseller, setDisburseReseller] = useState<Institution | null>(null);
    const [disbursementAmount, setDisbursementAmount] = useState(0);
    const [disbursementRef, setDisbursementRef] = useState('');
    const [disbursementNotes, setDisbursementNotes] = useState('');
    const [isDisbursing, setIsDisbursing] = useState(false);


    // State for new institution form
    const [newInstData, setNewInstData] = useState({
        name: '',
        email: '',
        phoneNumber: '',
        institutionType: 'University' as Institution['institutionType'],
        businessSubType: '' as Institution['businessSubType'],
        countyId: ''
    });

    // Timetable state
    const [timetableSubTab, setTimetableSubTab] = useState<'wizard' | 'scheduler' | 'calendar' | 'subjects'>('wizard');

    const fetchWithdrawalRequests = useCallback(async () => {
        try {
            const data = await apiService.fetchModuleRecords<CommissionWithdrawalRequest>('commission_withdrawal_requests');
            setWithdrawalRequests(data.sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime()));
        } catch (e) {
            console.error("Failed to fetch withdrawal requests:", e);
        }
    }, []);

    const openPerspectiveSelection = (tenant: Institution) => {
        setSelectedTenantForPerspective(tenant);
        setIsPerspectiveModalOpen(true);
    };


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
        fetchWithdrawalRequests();
    }, [activeTab, fetchHealth, fetchWithdrawalRequests]);

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
        chatEnabled: companyDetails?.chatAssistantConfig?.enabled ?? true,
        enforceGlobalOtp: companyDetails?.enforceGlobalOtp ?? false,
        marketplaceConfig: companyDetails?.marketplaceConfig || { pricingAmount: 150, customUrl: '' },
        showcaseConfig: companyDetails?.showcaseConfig || { 
            enabled: true, 
            showLoginLink: true,
            cpanelUploadUrl: '',
            cpanelSecret: '',
            items: []
        },
        ncbaConfig: companyDetails?.ncbaConfig || { clientId: '', clientSecret: '', apiKey: '', baseUrl: '', accountNumber: '', environment: 'sandbox' }
    });

    const [localSmsConfig, setLocalSmsConfig] = useState<SmsConfig>(companyDetails?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
    const [localEmailConfig, setLocalEmailConfig] = useState<EmailConfig>(companyDetails?.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
    const [localMpesaConfig, setLocalMpesaConfig] = useState<MpesaConfig>(companyDetails?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
    const [localSubConfig, setLocalSubConfig] = useState<SubscriptionConfig>(companyDetails?.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });

    const [isSavingConfigs, setIsSavingConfigs] = useState(false);

    useEffect(() => {
        if (companyDetails) {
            setLocalCompanyInfo({
                name: companyDetails.name || '',
                applicationTitle: companyDetails.applicationTitle || '',
                themeColor: companyDetails.themeColor || '#4f46e5',
                email: companyDetails.email || '',
                phone: companyDetails.phone || '',
                website: companyDetails.website || '',
                address: companyDetails.address || '',
                logoUrl: companyDetails.logoUrl || '',
                footerImageUrl: companyDetails.footerImageUrl || '',
                letterheadConfig: companyDetails.letterheadConfig || { headerImageUrl: null, stampImageUrl: null },
                welcomeMessage: companyDetails.chatAssistantConfig?.welcomeMessage || '',
                chatEnabled: companyDetails.chatAssistantConfig?.enabled ?? true,
                enforceGlobalOtp: companyDetails.enforceGlobalOtp ?? false,
                marketplaceConfig: companyDetails.marketplaceConfig || { pricingAmount: 150, customUrl: '' },
                showcaseConfig: companyDetails.showcaseConfig || { 
                    enabled: true, 
                    showLoginLink: true,
                    cpanelUploadUrl: '',
                    cpanelSecret: '',
                    items: []
                },
                ncbaConfig: companyDetails.ncbaConfig || { clientId: '', clientSecret: '', apiKey: '', baseUrl: '', accountNumber: '', environment: 'sandbox' }
            });
            setLocalSmsConfig(companyDetails.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '', smsUnitPrice: 1, minSmsUnits: 100 });
            setLocalEmailConfig(companyDetails.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
            setLocalMpesaConfig(companyDetails.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
            setLocalSubConfig(companyDetails.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });
        }
    }, [companyDetails]);

    const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead' | 'footer') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `global_branding/${type}_${timestamp}.${ext}`;

            const publicUrl = await apiService.uploadFile('eduai', path, file);
            if (publicUrl) {
                if (type === 'logo') setLocalCompanyInfo((prev: any) => ({ ...prev, logoUrl: publicUrl }));
                if (type === 'letterhead') {
                    setLocalCompanyInfo((prev: any) => ({
                        ...prev,
                        letterheadConfig: { ...prev.letterheadConfig, headerImageUrl: publicUrl }
                    }));
                }
                if (type === 'footer') setLocalCompanyInfo((prev: any) => ({ ...prev, footerImageUrl: publicUrl }));
            }
        } catch (err) {
            console.error(`Global platform ${type} upload error:`, err);
            alert(`Failed to upload ${type}.`);
        }
    };

    const generateGlobalNcbaCredentials = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        const generateRandomString = (length: number) => {
            const array = new Uint32Array(length);
            window.crypto.getRandomValues(array);
            return Array.from(array).map(x => chars[x % chars.length]).join('');
        };

        setLocalCompanyInfo({
            ...localCompanyInfo,
            ncbaConfig: {
                ...localCompanyInfo.ncbaConfig,
                callbackUsername: `sys_${generateRandomString(6)}`,
                callbackSecret: generateRandomString(32),
                notificationApiKey: `sys_key_${generateRandomString(24)}`
            } as any
        });
    };

    const handleSaveGlobalConfigs = async () => {
        setIsSavingConfigs(true);
        try {
            if (props.onUpdateCompanyDetails) {
                await props.onUpdateCompanyDetails({
                    ...companyDetails,
                    ...localCompanyInfo,
                    showcaseConfig: localCompanyInfo.showcaseConfig,
                    smsConfig: localSmsConfig,
                    emailConfig: localEmailConfig,
                    mpesaConfig: localMpesaConfig,
                    subscriptionConfig: localSubConfig,
                    chatAssistantConfig: {
                        ...companyDetails?.chatAssistantConfig,
                        welcomeMessage: localCompanyInfo.welcomeMessage,
                        enabled: localCompanyInfo.chatEnabled
                    },
                    enforceGlobalOtp: localCompanyInfo.enforceGlobalOtp
                });
            }
            alert("Platform configurations updated successfully.");
        } catch (e) {
            alert("Failed to save configurations.");
        } finally {
            setIsSavingConfigs(false);
        }
    };

    const [testRecipient, setTestRecipient] = useState('');
    const [isTesting, setIsTesting] = useState(false);

    const handleTestSms = async () => {
        if (!testRecipient) return alert("Enter a phone number to test.");
        setIsTesting(true);
        try {
            const res = await apiService.sendSms(testRecipient, "Test message from EduAi Automation.", localSmsConfig);
            if (res.success) alert("SMS sent successfully.");
            else alert(`Failed to send SMS: ${res.message || "Verify your gateway settings."}${res.errorDetail ? `\n\nDetail: ${JSON.stringify(res.errorDetail)}` : ""}`);
        } catch (e) {
            alert("SMS Gateway connection error.");
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestOtp = async () => {
        if (!testRecipient) return alert("Enter a phone number for OTP test.");
        setIsTesting(true);
        try {
            const testOtp = Math.floor(100000 + Math.random() * 900000).toString();
            const res = await apiService.sendSms(testRecipient, `Your EduAi Verification Code is: ${testOtp}. Do not share this code with anyone.`, localSmsConfig);
            if (res.success) alert(`OTP Test sent successfully. Code sent: ${testOtp}`);
            else alert(`Failed to send OTP test: ${res.message || "Verify your gateway settings."}${res.errorDetail ? `\n\nDetail: ${JSON.stringify(res.errorDetail)}` : ""}`);
        } catch (e) {
            alert("OTP Test Gateway connection error.");
        } finally {
            setIsTesting(false);
        }
    };

    const handleAddShowcaseItem = () => {
        setEditingShowcaseItem({ id: `si_${Date.now()}`, title: '', description: '', imageUrl: '', link: '', category: '' });
        setIsShowcaseItemModalOpen(true);
    };

    const handleSaveShowcaseItem = (item: ShowcaseItem) => {
        const currentItems = localCompanyInfo.showcaseConfig?.items || [];
        const index = currentItems.findIndex(i => i.id === item.id);
        let updatedItems;
        if (index >= 0) {
            updatedItems = [...currentItems];
            updatedItems[index] = item;
        } else {
            updatedItems = [...currentItems, item];
        }
        setLocalCompanyInfo({
            ...localCompanyInfo,
            showcaseConfig: { ...localCompanyInfo.showcaseConfig, items: updatedItems } as any
        });
        setIsShowcaseItemModalOpen(false);
        setEditingShowcaseItem(null);
    };

    const handleDeleteShowcaseItem = (id: string) => {
        const updatedItems = (localCompanyInfo.showcaseConfig?.items || []).filter(i => i.id !== id);
        setLocalCompanyInfo({
            ...localCompanyInfo,
            showcaseConfig: { ...localCompanyInfo.showcaseConfig, items: updatedItems } as any
        });
    };

    const handleTestEmail = async () => {
        if (!testRecipient || !testRecipient.includes('@')) return alert("Enter a valid email to test.");
        setIsTesting(true);
        try {
            const res = await apiService.sendEmail(testRecipient, "Platform Configuration Test", "This is a test email to verify your SMTP relay settings on the EduAi platform.", localEmailConfig);
            if (res.success) alert("Email sent successfully.");
            else alert("Failed to send email. Please check your SMTP settings.");
        } catch (e) {
            alert("SMTP handshake failed.");
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestMpesa = async () => {
        if (!testRecipient) return alert("Enter a phone number for STK Push test.");
        setIsTesting(true);
        try {
            const res = await apiService.initiateMpesaPayment(1, testRecipient, undefined, localMpesaConfig);
            if (res.success) alert("Payment request sent to phone.");
            else alert("Failed to initiate payment. Please check your M-Pesa settings.");
        } catch (e) {
            alert("M-Pesa gateway connection error.");
        } finally {
            setIsTesting(false);
        }
    };

    const fullSqlScript = useMemo(() => generateFullSqlScript(), []);

    const semesterSqlPreview = useMemo(() => {
        let sql = `-- Table Schema: semesters\n`;
        return sql;
    }, [semesters]);

    const getFullSqlScriptValue = () => migrationSubTab === 'full' ? fullSqlScript : semesterSqlPreview;

    const handleCopySql = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopyStatus(true);
        setTimeout(() => setCopyStatus(false), 2000);
    };

    const handleDownloadSql = () => {
        const text = getFullSqlScriptValue();
        const fileName = migrationSubTab === 'full' ? 'eduai_schema_latest.sql' : 'eduai_semesters_latest.sql';
        const blob = new Blob([text], { type: 'text/sql' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleQuickAction = (tabId: string, settingsSubTab?: string, tTabSub?: 'scheduler' | 'calendar' | 'subjects') => {
        setActiveTab(tabId as any);
        if (settingsSubTab) setRequestedSettingsTab(settingsSubTab);
        if (tTabSub) setTimetableSubTab(tTabSub);
    };

    const handleExtendSubscription = async () => {
        if (!extendingInstitution || !props.onUpdateInstitution) return;

        try {
            const currentEnd = extendingInstitution.subscriptionEndsAt
                ? new Date(extendingInstitution.subscriptionEndsAt)
                : new Date();

            const baseDate = Math.max(currentEnd.getTime(), Date.now());
            const newEndDate = new Date(baseDate + (extensionDays * 24 * 60 * 60 * 1000));

            await props.onUpdateInstitution(extendingInstitution.id, {
                subscriptionEndsAt: newEndDate.toISOString(),
                status: 'active'
            });

            if (props.onLogAction) await props.onLogAction(`Manually extended subscription for ${extendingInstitution.name} by ${extensionDays} days`);

            alert(`Subscription for ${extendingInstitution.name} extended until ${newEndDate.toLocaleDateString()}`);
            setExtendingInstitution(null);
            setExtensionDays(30);
        } catch (e) {
            alert("Failed to extend subscription.");
        }
    };
    const handleVerifyTransaction = async (txn: MpesaTransaction) => {
        if (!window.confirm(`Are you sure you want to MANUALLY verify transaction ${txn.transactionId}? This will mark it as PAID and reactivate the institution account.`)) return;

        try {
            const res = await apiService.verifyMpesaTransaction(txn.id);
            if (res.success) {
                alert(res.message || "Transaction verified successfully.");
                window.location.reload();
            } else {
                alert(`Verification failed: ${res.message}${res.details ? '\n\nDetails: ' + JSON.stringify(res.details) : ''}`);
            }
        } catch (e) {
            alert("An error occurred during verification.");
        }
    };

    const handleDisburseCommission = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disburseReseller || !disbursementAmount) return;

        setIsDisbursing(true);
        try {
            // 1. Record the transaction
            const transactionData = {
                amount: disbursementAmount,
                phoneNumber: disburseReseller.phoneNumber,
                institutionId: disburseReseller.id,
                payerName: 'Super Admin',
                description: `Commission Payout: ${disbursementRef} ${disbursementNotes ? `(${disbursementNotes})` : ''}`,
                provider: 'mpesa' as const,
                paymentMethod: 'paybill' as const,
                metadata: {
                    type: 'commission_disbursement',
                    ref: disbursementRef,
                    resellerName: disburseReseller.name
                }
            };

            if (props.onAddTransaction) {
                await props.onAddTransaction(transactionData, []);
            }

            // 2. Send SMS Notification
            const smsMessage = `Hello ${disburseReseller.name}, your commission of KES ${disbursementAmount.toLocaleString()} has been disbursed. Ref: ${disbursementRef}. Thank you for your partnership.`;
            await apiService.sendSms(disburseReseller.phoneNumber, smsMessage, undefined, 1, disburseReseller.id);

            alert(`Commission of KES ${disbursementAmount.toLocaleString()} disbursed successfully to ${disburseReseller.name}.`);
            setDisburseReseller(null);
            setDisbursementAmount(0);
            setDisbursementRef('');
            setDisbursementNotes('');
        } catch (error: any) {
            console.error("Disbursement Failed:", error);
            alert(`Disbursement failed: ${error.message}`);
        } finally {
            setIsDisbursing(false);
        }
    };

    const handleResetTenantPassword = async (institution: Institution) => {
        if (!institution) return;
        setIsResettingPassword(true);
        try {
            // 1. Identify the primary admin user for this institution
            const institutionAdmin = users.find(u => u.institutionId === institution.id && (u.role === 'admin' || u.email === institution.email));

            if (!institutionAdmin) {
                alert(`No primary administrator found for ${institution.name}. Cannot reset password.`);
                return;
            }

            // 2. Generate a new secure password
            const { generateAlphanumericCode } = await import('../utils/stringUtils');
            const newPassword = generateAlphanumericCode(8);

            // 3. Update the password in database
            await apiService.saveUser({ ...institutionAdmin, password: newPassword, passwordLastUpdated: new Date().toISOString() });

            // 4. Notify via SMS if phone number exists
            if (onSendSms && institutionAdmin.phoneNumber) {
                const smsMessage = `CREDENTIAL RESET: Your ${institution.name} admin password has been reset. 
Login: ${institutionAdmin.email}
New Pass: ${newPassword}
Please change it after login.`;
                await onSendSms(institutionAdmin.phoneNumber, smsMessage, institution.smsConfig || smsConfig, 1, institution.id);
            }

            // 5. Notify via Email
            try {
                await apiService.sendEmail(
                    institutionAdmin.email,
                    'Administrative Password Reset',
                    `Hello ${institutionAdmin.name},\n\nYour administrator password for ${institution.name} has been reset by the System Super Admin.\n\nNew Credentials:\nEmail: ${institutionAdmin.email}\nPassword: ${newPassword}\n\nPlease log in and update your password immediately.\n\nRegards,\nEduAi Support Team`,
                    localEmailConfig
                );
            } catch (emailErr) {
                console.warn("Failed to send reset email:", emailErr);
            }

            // 6. Log the action
            if (props.onLogAction) {
                await props.onLogAction(`Reset administrative password for ${institution.name} (${institutionAdmin.email})`);
            }

            alert(`Password for ${institutionAdmin.name} has been reset successfully. Notifications dispatched via SMS and Email.`);
            setResettingPasswordFor(null);
        } catch (error: any) {
            console.error("Password reset error:", error);
            alert(`Failed to reset password: ${error.message || 'Database error'}`);
        } finally {
            setIsResettingPassword(false);
        }
    };

    const handleAddInstitutionSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newInstData.name && newInstData.email && newInstData.phoneNumber) {
            try {
                // Basic validation
                const isReseller = newInstData.institutionType === 'Reseller';
                await props.onAddInstitution({
                    name: newInstData.name,
                    email: newInstData.email,
                    phoneNumber: newInstData.phoneNumber,
                    institutionType: newInstData.institutionType,
                    businessSubType: newInstData.businessSubType,
                    countyId: newInstData.countyId || undefined,
                    status: isReseller ? 'active' : 'trial',
                    trialEndsAt: isReseller ? undefined : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    institutionCode: `INST-${Date.now().toString().slice(-4)}`,
                    themeColor: '#4f46e5',
                    logoUrl: null,
                    useAllocationRequests: true,
                    smsConfig: props.smsConfig
                });
                setIsAddingInstitution(false);
                setNewInstData({ name: '', email: '', phoneNumber: '', institutionType: 'University', businessSubType: '', countyId: '' });
                alert("New institution tenant created successfully.");
            } catch (err: any) {
                console.error("Failed to add institution:", err);
                alert(`Failed to add institution: ${err.message || 'Unknown error'}`);
            }
        } else {
            alert("Please fill in all required fields.");
        }
    };

    const tabs = [
        { key: 'dashboard', label: 'Dashboard', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
        { key: 'institutions', label: 'Institutions', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> },
        { key: 'external_module', label: 'External', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
        { key: 'all_users', label: 'Global Users', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
        { key: 'communications', label: 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
        { key: 'user_activity', label: 'Audit Trail', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
        { key: 'demo_requests', label: 'Demo Leads', icon: <CalendarIcon className="w-5 h-5 mr-2" /> },
        { key: 'settings', label: 'Global Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
        { key: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
    ];

    const handleProcessWithdrawal = async (request: CommissionWithdrawalRequest, action: 'approve' | 'reject') => {
        setIsProcessingWithdrawal(true);
        try {
            const updatedRequest: CommissionWithdrawalRequest = {
                ...request,
                status: action === 'approve' ? 'approved' : 'rejected',
                processedAt: new Date().toISOString()
            };

            await apiService.saveModuleRecord('commission_withdrawal_requests', updatedRequest);

            if (action === 'approve') {
                // Create a payout transaction record
                if (props.onAddTransaction) await props.onAddTransaction({
                    amount: request.amount,
                    phoneNumber: '', // We don't have reseller phone here easily but it's optional for payout
                    institutionId: request.resellerId,
                    payerName: 'System Disbursement',
                    description: `Commission Payout - Ref: ${request.id}`,
                    provider: 'mpesa' as const,
                    paymentMethod: 'paybill' as const,
                    metadata: { type: 'commission_payout', requestId: request.id }
                }, []);
            }

            setWithdrawalRequests(prev => prev.map(r => r.id === request.id ? updatedRequest : r));
            onRefreshData?.();
            alert(`Withdrawal request ${action}ed successfully.`);
        } catch (error: any) {
            console.error("Failed to process withdrawal:", error);
            alert(`Error processing withdrawal: ${error.message}`);
        } finally {
            setIsProcessingWithdrawal(false);
        }
    };

    const stats = useMemo(() => {
        const pendingCount = (requests || []).filter(r => r && (r.status === 'pending' || r.status === 'hod_approved')).length;
        const changesCount = (requests || []).filter(r => r && r.status === 'change_request_pending').length;
        const deallocCount = (requests || []).filter(r => r && r.status === 'deallocation_pending').length;
        return { pendingCount, changesCount, deallocCount, totalActionable: pendingCount + changesCount + deallocCount };
    }, [requests]);

    const isSchool = useMemo(() => {
        return currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
    }, [currentInstitution]);

    const perspectiveOptions = [
        { role: 'admin', label: 'Timetable', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'security', label: 'Security Module', icon: <ShieldIcon className="w-6 h-6" />, color: 'bg-red-50 text-red-600' },
        { role: 'store', label: 'Inventory Module', icon: <ArchiveBoxIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
        { role: 'transport_admin', label: 'Transport Module', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-orange-50 text-orange-600' },
        { role: 'transport_assistant', label: 'Transport Assistant', icon: <MapPinIcon className="w-6 h-6" />, color: 'bg-teal-50 text-teal-600' },
        { role: 'boarding_master', label: 'Boarding Module', icon: <BedIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
        { role: 'info_desk', label: 'Info Desk Module', icon: <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />, color: 'bg-sky-50 text-sky-600' },
        { role: 'librarian', label: 'Library Module', icon: <BookOpenIcon className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600' },
        { role: 'parent', label: 'Parent Portal', icon: <UserGroupIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { role: 'student', label: 'Student Portal', icon: <AcademicCapIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'lecturer', label: isSchool ? 'Teacher Portal' : 'Lecturer Portal', icon: <UserIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
        { role: 'agrovet_admin', label: 'Agrovet Module', icon: <BeakerIcon className="w-6 h-6" />, color: 'bg-green-50 text-green-600' },
        { role: 'property_admin', label: 'Property Module', icon: <HomeIcon className="w-6 h-6" />, color: 'bg-cyan-50 text-cyan-600' },
        { role: 'carwash_admin', label: 'Car Wash Module', icon: <SparklesIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-400' },
        { role: 'his_admin', label: 'Health System', icon: <SparklesIcon className="w-6 h-6" />, color: 'bg-teal-50 text-teal-600' },
        { role: 'cooperative_manager', label: 'Cooperative Module', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'coop_chairman', label: 'Coop Chairman (Approvals)', icon: <CheckCircleIcon className="w-5 h-5 text-indigo-600" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'farmer', label: 'Farmer Portal', icon: <UserGroupIcon className="w-5 h-5 text-emerald-600" />, color: 'bg-emerald-50 text-emerald-600' },
        { role: 'rider', label: 'Rider Portal', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-orange-50 text-orange-600' },
        { role: 'church_admin', label: 'Church System', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-700' },
        { role: 'marketplace', label: 'Public Marketplace', icon: <ShoppingCartIcon className="w-6 h-6" />, color: 'bg-orange-50 text-orange-600', isService: true }
    ].filter(opt => {
        const instType = selectedTenantForPerspective?.institutionType;
        const subType = selectedTenantForPerspective?.businessSubType;
        const isEdu = ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'TVET', 'Kindergarten'].includes(instType || '');
        const isChurch = instType === 'Church' || subType === 'Church';
        
        // Only show Health System perspective for HIS institutions
        if (opt.role === 'his_admin') {
            return instType === 'HIS';
        }

        // Show Church perspective for Church institutions OR for Super Admin simulation
        if (opt.role === 'church_admin') {
            return true; // Super Admins should always see all simulation options
        }

        if (isEdu) {
            // Super Admins should always see the Church System for simulation
            return !['agrovet_admin', 'property_admin', 'carwash_admin', 'cooperative_manager', 'coop_chairman', 'farmer', 'rider'].includes(opt.role);
        }

        if (instType === 'Cooperative') {
            return ['cooperative_manager', 'coop_chairman', 'farmer', 'rider', 'agrovet_admin', 'marketplace'].includes(opt.role);
        }

        return true;
    });

    const activeRole = currentUser?.role;
    const isAdminCatchAll = ['admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy'].includes(activeRole || '');

    // Render logic moved from App.tsx into component to reuse for perspective switching
    // Wrapped in Suspense to handle lazy loading
    if (activeRole === 'student') {
        return (
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900"><div className="w-12 h-12 border-4 border-indigo-50 border-t-transparent rounded-full animate-spin"></div></div>}>
                <StudentView user={currentUser} users={users} courses={courses} subjects={subjects} rooms={rooms} enrollmentRequests={enrollmentRequests} generatedTimetable={generatedTimetable} examTimetable={examTimetable} getSubjectById={props.getSubjectById || ((id: string) => undefined)} getRoomById={props.getRoomById || ((id: string) => undefined)} getLecturerById={props.getLecturerById || ((id: string) => undefined)} timetableSettings={timetableSettings!} studentCheckIns={props.studentCheckIns!} onStudentLessonCheckIn={props.onAddTransaction as any} letterheadConfig={letterheadConfig!} footerImageUrl={footerImageUrl} logoUrl={logoUrl} buildings={buildings} onAddParent={props.onAddParent as any} onDeleteParent={props.onDeleteParent as any} departments={departments} onSubmitEnrollmentRequest={async (sids: string[], sig: string | null) => { }} assignments={assignments} submissions={submissions} onAddSubmission={async (d: any) => { await apiService.saveModuleRecord('submissions', { ...d, id: `subm_${Date.now()}`, institutionId: currentUser.institutionId }); }} lessonRatings={lessonRatings} onAddLessonRating={() => { }} onRateLesson={() => { }} onAddFeedback={() => { }} feedbackSubmissions={feedbackSubmissions} studentAbsenceRequests={studentAbsenceRequests} onSubmitStudentAbsenceRequest={() => { }} finalTimetableUrl={finalTimetableUrl} taAssignments={props.onUpdateFeeStructures as any} userTasks={userTasks} onAddTask={() => { }} onUpdateTask={() => { }} onDeleteTask={() => { }} currentInstitution={currentInstitution!} assessments={assessments} assessmentMarks={assessmentMarks} studentAttendances={studentAttendances || []} />
            </React.Suspense>
        );
    }

    if (activeRole === 'academics_officer') {
        return (
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900"><div className="w-12 h-12 border-4 border-indigo-50 border-t-transparent rounded-full animate-spin"></div></div>}>
                <AcademicsOfficerView currentUser={currentUser} subjects={subjects} onUpdateSubject={props.onUpdateSubject as any} courses={courses} onUpdateCourse={props.onUpdateCourse} users={users} rooms={rooms} onUpdateRoom={props.onUpdateRoom} onDeleteRoom={props.onDeleteRoom} onAddRoom={props.onAddRoom} departments={departments} onAddDepartment={props.onAddDepartment} onUpdateDepartment={props.onUpdateDepartment} onDeleteDepartment={props.onDeleteDepartment} onImportDepartments={props.onImportDepartments} activeAcademicYear={activeAcademicYear} activeSemester={activeSemester} onExamTimetableGenerated={async (entries: any, ay: any, sem: any) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries)} examTimetable={examTimetable} getSubjectById={props.getSubjectById || ((id: string) => undefined)} getLecturerById={props.getLecturerById || ((id: string) => undefined)} getRoomById={props.getRoomById || ((id: string) => undefined)} courseSizes={courseSizes} academicYears={academicYears} semesters={semesters} timetableSettings={timetableSettings!} buildings={buildings} onUpdateBuilding={props.onUpdateBuilding} onDeleteBuilding={props.onDeleteBuilding} onAddBuilding={props.onAddBuilding} academicLevels={academicLevels} letterheadConfig={letterheadConfig} logoUrl={logoUrl} footerImageUrl={footerImageUrl} emailConfig={emailConfig} onSaveEmailConfig={props.onSaveEmailConfig as any} onSendTestEmail={props.onSendTestEmail as any} currentInstitution={currentInstitution} examTimetableSettings={examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS} onSaveExamTimetableSettings={props.onSaveExamTimetableSettings as any} onAddAcademicYear={props.onAddAcademicYear} onUpdateAcademicYear={props.onUpdateAcademicYear} onDeleteAcademicYear={props.onDeleteAcademicYear} onAddSemester={props.onAddSemester} onUpdateSemester={props.onUpdateSemester} onDeleteSemester={props.onDeleteSemester} onSaveTimetableSettings={props.onSaveTimetableSettings} onImportRooms={props.onImportRooms} smsConfig={smsConfig} themeColor={themeColor} allocations={allocations} timeOffRequests={timeOffRequests} lessonRatings={lessonRatings} />
            </React.Suspense>
        );
    }

    if (activeRole === 'parent') {
        return (
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900"><div className="w-12 h-12 border-4 border-indigo-50 border-t-transparent rounded-full animate-spin"></div></div>}>
                <ParentView
                    user={currentUser}
                    users={users}
                    courses={courses}
                    studentAttendances={studentAttendances}
                    generatedTimetable={generatedTimetable}
                    subjects={subjects}
                    getSubjectById={props.getSubjectById || ((id: string) => undefined)}
                    getLecturerById={props.getLecturerById || ((id: string) => undefined)}
                    getRoomById={props.getRoomById || ((id: string) => undefined)}
                    timetableSettings={timetableSettings!}
                    buildings={buildings}
                    studentCheckIns={studentCheckIns}
                    leaveOutRequests={props.leaveOutRequests || []}
                    onUpdateLeaveOut={async (id, data) => {
                        const req = (props.leaveOutRequests || []).find(r => r.id === id);
                        if (req) {
                            await apiService.saveModuleRecord('leave_out_requests', { ...req, ...data, updatedAt: new Date().toISOString() });
                            if (props.onLogAction) await props.onLogAction(`Updated leave out request ${id}`);
                        }
                    }}
                />
            </React.Suspense>
        );
    }

    if (activeRole && isAdminCatchAll) {
        return (
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900"><div className="w-12 h-12 border-4 border-indigo-50 border-t-transparent rounded-full animate-spin"></div></div>}>
                <AdminView
                    {...props}
                    allTimetableEntries={props.allTimetableEntries || []}
                    coopFarmers={props.coopFarmers || []}
                    coopCollections={props.coopCollections || []}
                    coopRiders={props.coopRiders || []}
                    coopAgrovetInventory={props.coopAgrovetInventory || []}
                    coopAgrovetSales={props.coopAgrovetSales || []}
                    saccoAccounts={props.saccoAccounts || []}
                    saccoTransactions={props.saccoTransactions || []}
                    coopPayouts={props.coopPayouts || []}
                    coopExpenses={props.coopExpenses || []}
                    coopIncome={props.coopIncome || []}
                    retailStores={props.retailStores || []}
                    inventory={props.inventory || []}
                    suppliers={props.suppliers || []}
                    retailExpenses={props.retailExpenses || []}
                    vehicles={props.vehicles || []}
                    transportOnboarding={props.transportOnboarding || []}
                    vehicleLogs={props.vehicleLogs || []}
                    requests={requests || []}
                    enrollmentRequests={enrollmentRequests}
                    onUpdateRequest={props.onUpdateRequest}
                    onWithdrawRequest={props.onWithdrawRequestStatus}
                    onAddUser={props.onAddUser || (async () => { })}
                    onEditUser={props.onEditUser || (async () => { })}
                    onDeleteUser={props.onDeleteUser || (async () => { })}
                    onImportUsers={props.onImportUsers || (async () => { })}
                    onImportStudents={props.onImportStudents || (async () => { })}
                    onTimetableGenerated={props.onTimetableGenerated || (async () => { })}
                    onExamTimetableGenerated={props.onExamTimetableGenerated || (async () => { })}
                    onAddFarmer={props.onAddFarmer || (async () => { })}
                    onLogCollection={props.onLogCollection || (async () => { })}
                    onAddRider={props.onAddRider || (async () => { })}
                    onConfirmCollection={props.onConfirmCollection || (async () => { })}
                    onApproveCollection={props.onApproveCollection || (async () => { })}
                    onAddInstitution={props.onAddInstitution || (() => { })}
                    onDeleteInstitution={props.onDeleteInstitution || (() => { })}
                    onToggleInstitutionStatus={props.onToggleInstitutionStatus || (() => { })}
                    onLoginAsAdmin={props.onLoginAsAdmin || (() => { })}
                    onGenerateReceipt={props.onGenerateReceipt || (() => { })}
                />
            </React.Suspense>
        );
    }

    if (activeRole === 'lecturer' || activeRole === 'teacher') {
        return (
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900"><div className="w-12 h-12 border-4 border-indigo-50 border-t-transparent rounded-full animate-spin"></div></div>}>
                <LecturerView
                    {...(props as any)}
                    assignments={assignments}
                    submissions={submissions}
                    onAddAssignment={props.onAddAssignment as any}
                    onDeleteAssignment={props.onDeleteAssignment as any}
                    onUpdateSubmission={props.onUpdateSubmission as any}
                    assessments={assessments}
                    assessmentMarks={assessmentMarks}
                    onAddAssessment={props.onAddAssessment as any}
                    onDeleteAssessment={props.onDeleteAssessment as any}
                    onSaveAssessmentMarks={props.onSaveAssessmentMarks as any}
                />
            </React.Suspense>
        );
    }

    // Super Admin View (Default Fallback)
    return (
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
            <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-print bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                {tabs.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => {
                            setActiveTab(tab.key as any);
                            if (tab.key !== 'settings') setRequestedSettingsTab(undefined);
                        }}
                        className={`flex items-center gap-2 py-4 px-6 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.key
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.key === 'interactions' && stats.totalActionable > 0 && (
                            <span className="bg-red-50 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse ml-1">
                                {stats.totalActionable}
                            </span>
                        )}
                    </button>
                ))}

                <div className="flex-grow"></div>

            </div>

            <main className="animate-fade-in">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* stats.totalActionable alert hidden as per request to hide interactions */}

                        <div className="bg-gradient-to-r from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-200 dark:shadow-none relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32 blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
                                <div className="space-y-2 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest backdrop-blur-md">
                                        <SparklesIcon className="w-3.5 h-3.5" />
                                        Advanced Platform Tools
                                    </div>
                                    <h2 className="text-3xl font-black tracking-tight">System Simulation Hub</h2>
                                    <p className="text-indigo-100 font-medium max-w-xl">
                                        Experience the platform from any user's perspective. Simulate specialized modules like Agrovet, Transport, and Property Management to verify configurations and workflows.
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsPerspectiveModalOpen(true)}
                                    className="bg-white text-indigo-600 hover:bg-slate-50 font-black text-xs uppercase tracking-[0.2em] px-8 py-4 rounded-2xl transition-all shadow-lg active:scale-95 whitespace-nowrap"
                                >
                                    Enter Simulation Mode
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Active Faculty</h3>
                                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {(props.users || []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin').length}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Registry Load</h3>
                                <p className="text-4xl font-black text-indigo-600 tracking-tighter">{(props.allocations || []).length}</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Total Students</h3>
                                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {(props.users || []).filter(u => u && u.role === 'student').length}
                                </p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Platform SMS Balance</h3>
                                <p className={`text-4xl font-black tracking-tighter ${(institutions || []).reduce((sum, inst) => sum + (inst.smsBalance ?? 0), 0) < 500
                                    ? 'text-amber-500'
                                    : 'text-sky-600'
                                    }`}>
                                    {(institutions || []).reduce((sum, inst) => sum + (inst.smsBalance ?? 0), 0).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-400 font-mono mt-1">SMS units across all tenants</p>
                            </div>
                        </div>


                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <h3 className="text-xl font-black tracking-tighter uppercase mb-6 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                Platform Command Center
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                <button
                                    onClick={() => setActiveTab('institutions')}
                                    className="flex flex-col items-start p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl border border-indigo-100 dark:border-indigo-800 hover:border-indigo-400 transition-all group text-left"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                        <BuildingOfficeIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Tenant Manager</span>
                                    <p className="text-[10px] text-slate-400 uppercase mt-1">Deploy & Monitor Systems</p>
                                </button>
                                <button
                                    onClick={() => setActiveTab('all_users')}
                                    className="flex flex-col items-start p-6 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl border border-emerald-100 dark:border-emerald-800 hover:border-emerald-400 transition-all group text-left"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                        <UserGroupIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">User Directory</span>
                                    <p className="text-[10px] text-slate-400 uppercase mt-1">Cross-Platform Identity</p>
                                </button>
                                <button
                                    onClick={() => setActiveTab('reports')}
                                    className="flex flex-col items-start p-6 bg-sky-50 dark:bg-sky-900/30 rounded-3xl border border-sky-100 dark:border-sky-800 hover:border-sky-400 transition-all group text-left"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-sky-600 mb-4 group-hover:scale-110 transition-transform">
                                        <ChartBarIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">System Analytics</span>
                                    <p className="text-[10px] text-slate-400 uppercase mt-1">Performance Benchmarks</p>
                                </button>
                                <button
                                    onClick={() => {
                                        const systemInst = (institutions || []).find(i => i.id === 'SYSTEM' || i.name.toLowerCase().includes('system') || i.name.toLowerCase().includes('eduai'));
                                        if (systemInst) {
                                            onLoginAsAdmin(systemInst.id);
                                        } else if (institutions.length > 0) {
                                            onLoginAsAdmin(institutions[0].id);
                                        }
                                    }}
                                    className="flex flex-col items-start p-6 bg-amber-50 dark:bg-amber-900/30 rounded-3xl border border-amber-100 dark:border-amber-800 hover:border-amber-400 transition-all group text-left"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                                        <SparklesIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Admin Dashboard</span>
                                    <p className="text-[10px] text-slate-400 uppercase mt-1">Access Institutional ERP</p>
                                </button>
                                <button
                                    onClick={() => setRequestedSettingsTab('billing')}
                                    className="flex flex-col items-start p-6 bg-rose-50 dark:bg-rose-900/30 rounded-3xl border border-rose-100 dark:border-rose-800 hover:border-rose-400 transition-all group text-left"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-rose-600 mb-4 group-hover:scale-110 transition-transform">
                                        <BanknotesIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Revenue & Billing</span>
                                    <p className="text-[10px] text-slate-400 uppercase mt-1">Platform Monetization</p>
                                </button>
                            </div>
                        </div>


                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                    <ClipboardListIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                </div>
                                <h3 className="text-xl font-black tracking-tighter uppercase">Administrative Events</h3>
                            </div>
                            <div className="space-y-4">
                                {(props.activityLog || []).slice(0, 5).map((log: ActivityLog) => (
                                    <div key={log.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{String(log.action)}</p>
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                                {String(log.userName)}
                                                <span className="text-indigo-500 font-bold ml-1">[{log.institutionName || 'SYSTEM'}]</span>
                                                <span className="mx-1">•</span>
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-400">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </div>
                                ))}
                                {(!props.activityLog || props.activityLog.length === 0) && (
                                    <p className="text-center py-10 text-slate-400 text-sm font-bold uppercase tracking-widest">No activity recorded</p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'institutions' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl w-fit mb-6">
                            <button
                                onClick={() => setInstitutionsSubTab('list')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'list' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Tenant Registry
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('counties')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'counties' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Counties
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('resellers')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'resellers' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Resellers
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('business')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'business' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Business
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('requests')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'requests' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Extension Requests
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('transactions')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'transactions' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Transactions
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('withdrawals')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'withdrawals' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Withdrawals
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('external_links')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'external_links' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                External Hub
                            </button>
                        </div>

                        {institutionsSubTab === 'list' && (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter">Institutional Tenants</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Multi-Tenancy Registry</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <input
                                                type="text"
                                                placeholder="Search by name or code..."
                                                value={institutionSearchQuery}
                                                onChange={e => setInstitutionSearchQuery(e.target.value)}
                                                className="w-72 pl-10 pr-4 py-2.5 border rounded-xl dark:bg-slate-700 dark:border-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none"
                                            />
                                            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                                        </div>
                                        <button
                                            onClick={() => setIsAddingInstitution(!isAddingInstitution)}
                                            className="btn-primary h-11 px-6 flex items-center gap-2 text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
                                        >
                                            {isAddingInstitution ? <XIcon className="w-4 h-4" /> : <PlusIcon className="w-4 h-4" />}
                                            {isAddingInstitution ? 'Cancel' : 'New Tenant'}
                                        </button>
                                    </div>
                                </div>

                                {isAddingInstitution && (
                                    <form onSubmit={handleAddInstitutionSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in-up mb-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Institution Name</label>
                                                <input type="text" value={newInstData.name} onChange={e => setNewInstData({ ...newInstData, name: e.target.value })} className="form-input" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Admin Email</label>
                                                <input type="email" value={newInstData.email} onChange={e => setNewInstData({ ...newInstData, email: e.target.value })} className="form-input" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Phone Number</label>
                                                <input type="tel" value={newInstData.phoneNumber} onChange={e => setNewInstData({ ...newInstData, phoneNumber: e.target.value })} className="form-input" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Institution Type</label>
                                                <select
                                                    value={newInstData.institutionType}
                                                    onChange={e => setNewInstData({ ...newInstData, institutionType: e.target.value as any, businessSubType: e.target.value === 'Business' ? 'Agrovet' : '' })}
                                                    className="form-select font-black text-indigo-600 border-indigo-100"
                                                >
                                                    <option value="Primary">Primary School</option>
                                                    <option value="Secondary">Secondary School</option>
                                                    <option value="University">University</option>
                                                    <option value="College">College</option>
                                                    <option value="Institute">Institute</option>
                                                    <option value="Polytechnic">Polytechnic</option>
                                                    <option value="ECD">ECD Center</option>
                                                    <option value="International">International School</option>
                                                    <option value="Business">Business</option>
                                                    <option value="Broadcaster">Broadcaster</option>
                                                    <option value="Reseller">Reseller Agency</option>
                                                    <option value="HIS">Health Information System (HIS)</option>
                                                    <option value="Church">Church / Religious Institution</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Assigned County (Optional)</label>
                                                <select
                                                    value={newInstData.countyId}
                                                    onChange={e => setNewInstData({ ...newInstData, countyId: e.target.value })}
                                                    className="form-select border-indigo-100"
                                                >
                                                    <option value="">No County Assigned</option>
                                                    {counties.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {newInstData.institutionType === 'Business' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Select Business Niche / Category</label>
                                                    <select
                                                        value={newInstData.businessSubType || 'General'}
                                                        onChange={e => setNewInstData({ ...newInstData, businessSubType: e.target.value as any })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="Agrovet">Agrovet (Agricultural Supplies)</option>
                                                        <option value="Property Management">Property Management (Rent/Leases)</option>
                                                        <option value="Retail Agency">Retail Agency (Commission Based)</option>
                                                        <option value="Car Wash">Car Wash / Service Center</option>
                                                        <option value="Hardware">Hardware Store</option>
                                                        <option value="Pharmacy">Pharmacy / Chemist</option>
                                                        <option value="General">General Retail / Business</option>
                                                    </select>
                                                </div>
                                            )}
                                            {newInstData.institutionType === 'Church' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Church Tradition (Denomination)</label>
                                                    <select
                                                        value={newInstData.businessSubType || ''}
                                                        onChange={e => setNewInstData({ ...newInstData, businessSubType: e.target.value as any })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="">-- Select Tradition --</option>
                                                        <option value="Catholic">Catholic (Sacramental/SCC)</option>
                                                        <option value="Protestant">Protestant (Evangelical/Cell Groups)</option>
                                                        <option value="Orthodox">Orthodox (Holy Mysteries/Fasting Calendar)</option>
                                                    </select>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                                            <button type="submit" className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Create Tenant</button>
                                        </div>
                                    </form>
                                )}

                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Tenant Name</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Category</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">County</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Lifecycle</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {filteredInstitutions.map((inst: Institution) => (
                                                <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-lg">
                                                                {inst.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-black text-slate-900 dark:text-white">{inst.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono">{inst.institutionCode}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 font-medium">{inst.institutionType}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-tight">
                                                        {counties.find(c => c.id === inst.countyId)?.name || '—'}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-lg ${inst.status === 'active' ? 'bg-green-100 text-green-700' :
                                                            inst.status === 'trial' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {inst.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2 flex-wrap transition-all">
                                                            <button onClick={() => onLoginAsAdmin(inst.id)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-2 py-1 rounded-lg">
                                                                <ArrowRightOnRectangleIcon className="w-3 h-3" />
                                                                Portal
                                                            </button>
                                                            <button onClick={() => setExtendingInstitution(inst)} className="flex items-center gap-1 text-emerald-600 hover:text-emerald-900 font-black text-[10px] uppercase tracking-tighter bg-emerald-50 px-2 py-1 rounded-lg">
                                                                <ClockIcon className="w-3 h-3" />
                                                                Extend
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setManagingGatewayFor(inst);
                                                                    setTenantSmsConfig(inst.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
                                                                }}
                                                                className="flex items-center gap-1 text-purple-600 hover:text-purple-900 font-black text-[10px] uppercase tracking-tighter bg-purple-50 px-2 py-1 rounded-lg"
                                                            >
                                                                <ChatBubbleBottomCenterTextIcon className="w-3 h-3" />
                                                                Gateway
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setManagingMpesaFor(inst);
                                                                    setTenantMpesaConfig(inst.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
                                                                }}
                                                                className="flex items-center gap-1 text-emerald-600 hover:text-emerald-900 font-black text-[10px] uppercase tracking-tighter bg-emerald-50 px-2 py-1 rounded-lg"
                                                            >
                                                                <CurrencyIcon className="w-3 h-3" />
                                                                M-Pesa
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setManagingPlansFor(inst);
                                                                    setTenantModulePricing(inst.customModulePricing || {});
                                                                }}
                                                                className="flex items-center gap-1 text-sky-600 hover:text-sky-900 font-black text-[10px] uppercase tracking-tighter bg-sky-50 px-2 py-1 rounded-lg"
                                                            >
                                                                <RectangleStackIcon className="w-3 h-3" />
                                                                Plans
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    setManagingSmsUnitsFor(inst);
                                                                    setTenantSmsAdjustment({ amount: 0, reason: '' });
                                                                }}
                                                                className="flex items-center gap-1 text-sky-600 hover:text-sky-900 font-black text-[10px] uppercase tracking-tighter bg-sky-50 px-2 py-1 rounded-lg"
                                                            >
                                                                <CreditCardIcon className="w-3 h-3" />
                                                                SMS Units
                                                            </button>
                                                            {inst.businessSubType === 'Property Management' && (
                                                                <button
                                                                    onClick={() => setManagingMarketplaceFor(inst)}
                                                                    className="flex items-center gap-1 text-orange-600 hover:text-orange-900 font-black text-[10px] uppercase tracking-tighter bg-orange-50 px-2 py-1 rounded-lg"
                                                                >
                                                                    <ShoppingCartIcon className="w-3 h-3" />
                                                                    Marketplace
                                                                </button>
                                                            )}
                                                            <button onClick={() => setEditingInstitution(inst)} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-black text-[10px] uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded-lg">
                                                                Edit
                                                            </button>
                                                            <button
                                                                onClick={() => setResettingPasswordFor(inst)}
                                                                className="flex items-center gap-1 text-red-600 hover:text-red-900 font-black text-[10px] uppercase tracking-tighter bg-red-50 px-2 py-1 rounded-lg"
                                                            >
                                                                <LockClosedIcon className="w-3 h-3" />
                                                                Reset Pass
                                                            </button>
                                                            <button onClick={() => onToggleInstitutionStatus(inst.id)} className="text-yellow-600 hover:text-yellow-900 font-bold text-[10px] uppercase tracking-tighter">

                                                                {inst.status === 'suspended' ? 'Resume' : 'Suspend'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {institutionsSubTab === 'counties' && (
                            <CountyManager
                                counties={counties}
                                onAddCounty={(data) => {
                                    if (onAddCounty) {
                                        onAddCounty(data);
                                    }
                                }}
                                onUpdateCounty={(id, data) => {
                                    if (onUpdateCounty) {
                                        onUpdateCounty(id, data);
                                    }
                                }}
                                onDeleteCounty={(id) => {
                                    if (onDeleteCounty) {
                                        onDeleteCounty(id);
                                    }
                                }}
                            />
                        )}

                        {institutionsSubTab === 'resellers' && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Reseller Agencies</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Agency Name</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Code</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Sub-Tenants</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {institutions.filter(i => i.institutionType === 'Reseller').map((inst: Institution) => {
                                                const subTenantsCount = institutions.filter(i => i.resellerId === inst.id).length;
                                                return (
                                                    <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                                                            {inst.name}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                                                            {inst.institutionCode}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-lg ${inst.status === 'active' ? 'bg-green-100 text-green-700' :
                                                                inst.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {inst.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-bold">
                                                            {subTenantsCount} Managed
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            <div className="flex justify-end gap-2">
                                                                <button onClick={() => onLoginAsAdmin(inst.id)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-2 py-1 rounded-lg">
                                                                    <ArrowRightOnRectangleIcon className="w-3 h-3" />
                                                                    Portal
                                                                </button>
                                                                <button onClick={() => setEditingInstitution(inst)} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-black text-[10px] uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded-lg">
                                                                    Edit
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setDisburseReseller(inst);
                                                                        setDisbursementAmount(0);
                                                                        setDisbursementRef('');
                                                                        setDisbursementNotes('');
                                                                    }}
                                                                    className="flex items-center gap-1 text-emerald-600 hover:text-emerald-900 font-black text-[10px] uppercase tracking-tighter bg-emerald-50 px-2 py-1 rounded-lg"
                                                                >
                                                                    <CurrencyIcon className="w-3 h-3" />
                                                                    Disburse
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                            {institutions.filter(i => i.institutionType === 'Reseller').length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">
                                                        No Reseller Agencies found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {institutionsSubTab === 'business' && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Enterprise & Business Accounts</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Business Name</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Niche / Category</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {institutions.filter(i => i.institutionType === 'Business').map((inst: Institution) => (
                                                <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/40 rounded-lg flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-black text-sm">
                                                                {inst.name.charAt(0)}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-slate-900 dark:text-white">{inst.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono italic">{inst.institutionCode}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-black uppercase tracking-widest">
                                                            {inst.businessSubType || 'General'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-lg ${inst.status === 'active' ? 'bg-green-100 text-green-700' :
                                                            inst.status === 'trial' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-red-100 text-red-700'
                                                            }`}>
                                                            {inst.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-2">
                                                            <button
                                                                onClick={() => openPerspectiveSelection(inst)}
                                                                className="flex items-center gap-1 text-amber-600 hover:text-amber-900 font-black text-[10px] uppercase tracking-tighter bg-amber-50 px-2 py-1 rounded-lg transition-colors border border-amber-100"
                                                                title="View Perspective"
                                                            >
                                                                <EyeIcon className="w-3 h-3" />
                                                                View
                                                            </button>
                                                            <button onClick={() => onLoginAsAdmin(inst.id)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-2 py-1 rounded-lg">
                                                                <ArrowRightOnRectangleIcon className="w-3 h-3" />
                                                                Portal
                                                            </button>
                                                            <button onClick={() => setEditingInstitution(inst)} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-black text-[10px] uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded-lg">
                                                                Edit
                                                            </button>
                                                            <button onClick={() => onToggleInstitutionStatus(inst.id)} className="text-yellow-600 hover:text-yellow-900 font-bold text-[10px] uppercase tracking-tighter">
                                                                {inst.status === 'suspended' ? 'Resume' : 'Suspend'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                            {institutions.filter(i => i.institutionType === 'Business').length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="px-6 py-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">
                                                        No Business accounts found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {institutionsSubTab === 'requests' && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="flex justify-between items-center">
                                    <h3 className="text-xl font-black uppercase tracking-tighter">Extension Applications</h3>
                                </div>
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                                    <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Institution</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Requester ID</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Reason</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date</th>
                                                <th className="px-6 py-4 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                            {extensionRequests.map((req: ExtensionRequest) => {
                                                const inst = institutions.find((i: Institution) => i.id === req.institutionId);
                                                const requester = users.find((u: User) => u.id === req.requesterId);
                                                return (
                                                    <tr key={req.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors">
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-900 dark:text-white">
                                                            {inst?.name || 'Unknown Institution'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-500">
                                                            {requester?.name || req.requesterId}
                                                        </td>
                                                        <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-xs truncate" title={req.reason}>
                                                            {req.reason}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap">
                                                            <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-lg ${req.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                                req.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                                    'bg-red-100 text-red-700'
                                                                }`}>
                                                                {req.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                                                            {new Date(req.requestedAt).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                            {req.status === 'pending' && (
                                                                <div className="flex justify-end gap-2">
                                                                    <button
                                                                        onClick={() => props.onUpdateExtensionRequestStatus?.(req.id, 'approved', 14)}
                                                                        className="text-green-600 hover:text-green-800 font-bold text-xs uppercase tracking-tighter"
                                                                    >
                                                                        Approve (+14 Days)
                                                                    </button>
                                                                    <button
                                                                        onClick={() => props.onUpdateExtensionRequestStatus?.(req.id, 'rejected')}
                                                                        className="text-red-600 hover:text-red-800 font-bold text-xs uppercase tracking-tighter"
                                                                    >
                                                                        Reject
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            {extensionRequests.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">
                                                        No extension requests found.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {institutionsSubTab === 'transactions' && (
                            <div className="animate-fade-in-up">
                                <TransactionsManager
                                    transactions={transactions || []}
                                    institutions={institutions || []}
                                    receipts={receipts || []}
                                    companyDetails={companyDetails}
                                    onGenerateReceipt={onGenerateReceipt}
                                    onVerifyTransaction={handleVerifyTransaction}
                                    logoUrl={logoUrl}
                                />
                            </div>
                        )}

                        {institutionsSubTab === 'withdrawals' && (
                            <div className="space-y-6 animate-fade-in-up">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter">Commission Withdrawal Requests</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage reseller payout applications</p>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-3xl overflow-hidden border border-slate-100 dark:border-slate-700">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                            <thead className="bg-slate-50 dark:bg-slate-900/50">
                                                <tr>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Reseller</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Amount</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Payout Account</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-6 py-5 text-left text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Date</th>
                                                    <th className="px-6 py-5 text-right text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {withdrawalRequests.map((req) => {
                                                    const reseller = institutions.find(i => i.id === req.resellerId);
                                                    return (
                                                        <tr key={req.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                                                            <td className="px-6 py-5">
                                                                <div className="font-bold text-slate-900 dark:text-white uppercase tracking-tight italic">{reseller?.name || 'Unknown Reseller'}</div>
                                                                <div className="text-[10px] font-mono text-slate-400">{req.resellerId}</div>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <div className="text-lg font-black text-indigo-600 font-mono">KES {req.amount.toLocaleString()}</div>
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <div className="text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 px-3 py-1.5 rounded-xl inline-block border border-slate-200 dark:border-slate-600 font-mono">
                                                                    {req.accountDetails}
                                                                </div>
                                                                {req.notes && <div className="text-[10px] text-slate-400 mt-1 italic">"{req.notes}"</div>}
                                                            </td>
                                                            <td className="px-6 py-5">
                                                                <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-lg shadow-sm border ${req.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                                                    req.status === 'approved' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                                                        'bg-rose-50 text-rose-700 border-rose-200'
                                                                    }`}>
                                                                    {req.status}
                                                                </span>
                                                                {req.processedAt && <div className="text-[9px] text-slate-400 mt-1 uppercase tracking-tighter">Processed: {new Date(req.processedAt).toLocaleDateString()}</div>}
                                                            </td>
                                                            <td className="px-6 py-5 text-xs text-slate-500 font-medium">
                                                                {new Date(req.requestedAt).toLocaleDateString()}
                                                                <div className="text-[10px] mt-0.5 opacity-60 font-mono">{new Date(req.requestedAt).toLocaleTimeString()}</div>
                                                            </td>
                                                            <td className="px-6 py-5 text-right">
                                                                {req.status === 'pending' && (
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            onClick={() => handleProcessWithdrawal(req, 'approve')}
                                                                            disabled={isProcessingWithdrawal}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                                                                        >
                                                                            <CheckCircleIcon className="w-3.5 h-3.5" />
                                                                            Approve
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleProcessWithdrawal(req, 'reject')}
                                                                            disabled={isProcessingWithdrawal}
                                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-50"
                                                                        >
                                                                            <XIcon className="w-3.5 h-3.5" />
                                                                            Reject
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {withdrawalRequests.length === 0 && (
                                                    <tr>
                                                        <td colSpan={6} className="px-6 py-20 text-center">
                                                            <CurrencyIcon className="w-12 h-12 mx-auto text-slate-200 mb-4" />
                                                            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">No withdrawal requests found</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {institutionsSubTab === 'external_links' && (
                            <div className="animate-fade-in-up">
                                <ExternalModuleView 
                                    title="Institution Registry & Deployment Services"
                                    url="https://registry.edualloc.com"
                                    description="Manage cloud deployments, database migrations, and institutional infrastructure at scale."
                                />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'all_users' && (
                    <div className="animate-fade-in-up">
                        <UserManager
                            {...props}
                            users={users || []}
                            departments={departments || []}
                            courses={courses || []}
                            subjects={subjects || []}
                            currentUser={currentUser}
                            onImportUsers={onImportUsers}
                            onImportStudents={onImportStudents}
                            onDeleteUser={props.onDeleteUser}
                            onEditUser={props.onEditUser}
                            onWithdrawRequest={async () => { }}
                            letterheadConfig={localCompanyInfo.letterheadConfig}
                            logoUrl={localCompanyInfo.logoUrl}
                            footerImageUrl={localCompanyInfo.footerImageUrl}
                            onSendSms={props.onSendSms}
                            onAddParent={props.onAddParent}
                            onDeleteParent={props.onDeleteParent}
                        />
                    </div>
                )}

                {activeTab === 'communications' && (
                    <div className="animate-fade-in-up">
                        <CommunicationsManager
                            {...props}
                            onSendSms={props.onSendSms || (async () => ({ success: false, message: 'SMS service disabled' }))}
                            currentUser={props.currentUser}
                            smsBalance={(institutions || []).reduce((sum, inst) => sum + (inst.smsBalance ?? 0), 0)}
                            currentInstitution={props.currentInstitution}
                            mpesaConfig={props.companyDetails.mpesaConfig}
                            smsConfig={props.smsConfig}
                            onRefreshData={props.onRefreshData}
                        />
                    </div>
                )}



                {activeTab === 'academics' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm mb-6">
                            <nav className="flex space-x-2" aria-label="Tabs">
                                <button
                                    onClick={() => setAcademicsSubTab('subjects')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${academicsSubTab === 'subjects' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Subjects / Units
                                </button>
                                <button
                                    onClick={() => setAcademicsSubTab('courses')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${academicsSubTab === 'courses' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Courses / Grades
                                </button>
                            </nav>
                        </div>

                        {academicsSubTab === 'subjects' && (
                            <SubjectManager
                                subjects={subjects || []}
                                departments={departments || []}
                                rooms={rooms || []}
                                courses={courses || []}
                                onAddSubject={props.onAddSubject}
                                onUpdateSubject={props.onUpdateSubject}
                                onDeleteSubject={props.onDeleteSubject}
                                onImportSubjectsAndAssociate={props.onImportSubjectsAndAssociate}
                                onAssociateSubjectToCourseLevel={props.onAssociateSubjectToCourseLevel}
                                onDisassociateSubjectFromCourseLevel={props.onDisassociateSubjectFromCourseLevel}
                                timetableSettings={timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                                onSaveTimetableSettings={props.onSaveTimetableSettings}
                                letterheadConfig={
                                    letterheadConfig || { headerImageUrl: null, stampImageUrl: null }
                                }
                                logoUrl={logoUrl}
                                footerImageUrl={footerImageUrl}
                                buildings={buildings || []}
                                currentInstitution={currentInstitution}
                                currentUser={currentUser}
                                onUpdateCourse={props.onUpdateCourse}
                            />
                        )}

                        {academicsSubTab === 'courses' && (
                            <CourseManager
                                courses={courses || []}
                                subjects={subjects || []}
                                departments={departments || []}
                                academicLevels={academicLevels || []}
                                letterheadConfig={
                                    letterheadConfig || { headerImageUrl: null, stampImageUrl: null }
                                }
                                logoUrl={logoUrl}
                                footerImageUrl={footerImageUrl}
                                onAddCourse={props.onAddCourse}
                                onUpdateCourse={props.onUpdateCourse}
                                onDeleteCourse={props.onDeleteCourse}
                                onImportCourses={props.onImportCourses}
                                onAssociateSubjectToCourseLevel={props.onAssociateSubjectToCourseLevel}
                                onDisassociateSubjectFromCourseLevel={props.onDisassociateSubjectFromCourseLevel}
                                onDirectAssign={props.onDirectAssign}
                                onWithdrawRequest={props.onWithdrawRequestStatus}
                                onUpdateRequest={props.onUpdateRequest}
                                currentUser={currentUser}
                                currentInstitution={currentInstitution}
                                rooms={rooms || []}
                                users={users || []}
                                allocations={allocations || []}
                                timetableSettings={timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                                onSaveTimetableSettings={props.onSaveTimetableSettings}
                            />
                        )}
                    </div>
                )}

                {activeTab === 'external_module' && (
                    <div className="animate-fade-in-up">
                        <ExternalModuleView
                            title="EduAI Advanced Analytics & Support Portal"
                            url="https://support.edualloc.com"
                            description="Independent portal for system-wide analytics, support tickets, and advanced platform configuration."
                        />
                    </div>
                )}

                {activeTab === 'user_activity' && (
                    <div className="animate-fade-in-up">
                        <ActivityLogView activityLog={activityLog || []} />
                    </div>
                )}

                {activeTab === 'demo_requests' && (
                    <div className="animate-fade-in-up">
                        <DemoRequestManager 
                            requests={demoRequests} 
                            onUpdateStatus={onUpdateDemoStatus} 
                        />
                    </div>
                )}

                {activeTab === 'interactions' && (
                    <div className="animate-fade-in-up">
                        <InteractionsManager
                            users={users}
                            requests={requests}
                            onUpdateRequest={props.onUpdateRequest}
                            absenceRequests={[]}
                            timeOffRequests={[]}
                            contracts={[]}
                            feedbackSubmissions={[]}
                            lessonRatings={[]}
                            enrollmentRequests={[]}
                            studentAbsenceRequests={[]}
                            currentUser={props.currentUser}
                            subjects={props.subjects}
                            departments={props.departments}
                            courses={props.courses}
                            generatedTimetable={props.generatedTimetable}
                            getLecturerById={() => undefined}
                            letterheadConfig={props.letterheadConfig}
                            footerImageUrl={props.footerImageUrl}
                            onOpenDirectAssign={() => {}}
                        />
                    </div>
                )}

                {activeTab === 'reports' && (
                    <div className="animate-fade-in-up">
                        <SuperAdminReports
                            institutions={institutions}
                            activityLog={activityLog}
                            users={users}
                            transactions={transactions}
                        />
                    </div>
                )}


                {activeTab === 'settings' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                            <nav className="-mb-px flex space-x-6" aria-label="Settings Sub-tabs">
                                <button
                                    onClick={() => setSettingsSubTab('profile')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <InformationCircleIcon className="w-4 h-4" /> Platform Profile
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('infrastructure')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'infrastructure' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <ShieldIcon className="w-4 h-4" /> Registry Infrastructure
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('branding')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'branding' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <SparklesIcon className="w-4 h-4" /> Visual Identity
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('sms')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'sms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <PaperAirplaneIcon className="w-4 h-4" /> SMS Gateway
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('email')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'email' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <EnvelopeIcon className="w-4 h-4" /> Email Relay
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('billing')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <CreditCardIcon className="w-4 h-4" /> Billing Map
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('sms_pricing')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'sms_pricing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <CurrencyIcon className="w-4 h-4" /> SMS Pricing
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('marketplace')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'marketplace' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <ShoppingCartIcon className="w-4 h-4" /> Marketplace
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('showcase')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'showcase' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <SparklesIcon className="w-4 h-4" /> Showcase
                                </button>
                                <button
                                    onClick={() => setSettingsSubTab('system_build')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'system_build' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <CommandLineIcon className="w-4 h-4" /> System Build
                                </button>
                            </nav>
                        </div>

                        <div className="mt-6">
                            {settingsSubTab === 'system_build' && (
                                <div className="space-y-6 animate-fade-in-up">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                        <div>
                                            <h3 className="text-xl font-black">Database Setup & Schema</h3>
                                            <p className="text-sm text-slate-500 mt-1">Export SQL DDL scripts or execute migration directly on the cloud.</p>
                                        </div>
                                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl">
                                            <button onClick={() => setMigrationSubTab('full')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${migrationSubTab === 'full' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Full Platform</button>
                                            <button onClick={() => setMigrationSubTab('semester')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${migrationSubTab === 'semester' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}>Modules Only</button>
                                        </div>
                                    </div>
                                    <div className="bg-slate-900 p-8 rounded-3xl shadow-2xl relative border-4 border-slate-800">
                                        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
                                            <h4 className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">PostgreSQL Deployment Script</h4>
                                            <div className="flex gap-3">
                                                <button onClick={() => handleCopySql(getFullSqlScriptValue())} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-all">
                                                    {copyStatus ? <CheckIcon className="w-4 h-4 text-green-500" /> : <CommandLineIcon className="w-4 h-4" />}
                                                    {copyStatus ? 'Copied' : 'Copy SQL'}
                                                </button>
                                                <button onClick={handleDownloadSql} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">
                                                    <DocumentArrowDownIcon className="w-4 h-4" /> Download .sql
                                                </button>
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            <pre className="bg-slate-950 text-indigo-300 p-8 rounded-2xl overflow-auto h-[500px] text-xs font-mono leading-relaxed border border-slate-800/50">
                                                {getFullSqlScriptValue()}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {settingsSubTab === 'profile' && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                    <h3 className="text-lg font-black uppercase mb-6 tracking-tighter">Identity Records</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Platform Legal Name</label>
                                                <input type="text" value={localCompanyInfo.name} onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, name: e.target.value })} className="form-input" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Global Support Email</label>
                                                <input type="email" value={localCompanyInfo.email} onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, email: e.target.value })} className="form-input" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Support Phone Number</label>
                                                <input type="tel" value={localCompanyInfo.phone} onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, phone: e.target.value })} className="form-input" placeholder="+254 7XX XXX XXX" />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Website URL</label>
                                                <input type="url" value={localCompanyInfo.website} onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, website: e.target.value })} className="form-input" placeholder="https://..." />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Physical Address</label>
                                                <textarea value={localCompanyInfo.address} onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, address: e.target.value })} className="form-input h-20 py-3" placeholder="Street, Building, City, Country" />
                                            </div>
                                            <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary w-full h-12 shadow-indigo-100">{isSavingConfigs ? 'Synchronizing...' : 'Update System Profile'}</button>
                                        </div>
                                        <label className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 transition-colors">
                                            {localCompanyInfo.logoUrl ? <img src={localCompanyInfo.logoUrl} className="h-20 object-contain mb-4" alt="Logo" /> : <BuildingOfficeIcon className="w-10 h-10 text-slate-200 mb-2" />}
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">System Logo</p>
                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLocalImageUpload(e, 'logo')} />
                                        </label>
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'infrastructure' && (
                                <div className="space-y-6 animate-fade-in">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                        <h3 className="text-lg font-black uppercase mb-6 tracking-tighter">Security & Access</h3>
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                    <ShieldIcon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Global 2FA Enforcement</h4>
                                                    <p className="text-xs text-slate-500">Enable Two-Factor Authentication for ALL institutions on the platform.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const nextValue = !localCompanyInfo.enforceGlobalOtp;
                                                    setLocalCompanyInfo({ ...localCompanyInfo, enforceGlobalOtp: nextValue });
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localCompanyInfo.enforceGlobalOtp ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localCompanyInfo.enforceGlobalOtp ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                        <div className="mt-6 flex justify-end">
                                            <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary px-8 h-10 shadow-indigo-100 uppercase tracking-widest text-[10px]">{isSavingConfigs ? 'Saving...' : 'Save Security Settings'}</button>
                                        </div>
                                    </div>

                                    <DatabaseSettings
                                        dbConfig={companyDetails.databaseConfig}
                                        onSave={async (newDbConfig) => {
                                            if (props.onUpdateCompanyDetails) {
                                                await props.onUpdateCompanyDetails({ ...props.companyDetails!, databaseConfig: newDbConfig });
                                            }
                                        }}
                                        onGenerateDemoData={props.onGenerateDemoData}
                                        onClearDemoData={props.onClearDemoData}
                                        isGeneratingDemoData={props.isGeneratingDemoData}
                                        demoDataGenerationProgress={props.demoDataGenerationProgress}
                                        demoDataGenerationMessage={props.demoDataGenerationMessage}
                                    />
                                </div>
                            )}

                            {settingsSubTab === 'branding' && (
                                <div className="space-y-8 animate-fade-in">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 shadow-sm">
                                        <div className="flex justify-between items-center mb-8">
                                            <h4 className="font-bold text-lg flex items-center gap-2">
                                                <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                                Visual Brand Identity
                                            </h4>
                                            <button onClick={() => setShowDocumentPreview(!showDocumentPreview)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-2">
                                                <EyeIcon className="w-4 h-4" /> {showDocumentPreview ? 'Hide Preview' : 'Show Document Map'}
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Application Title</label>
                                                    <input
                                                        type="text"
                                                        value={localCompanyInfo.applicationTitle}
                                                        onChange={(e) => setLocalCompanyInfo({ ...localCompanyInfo, applicationTitle: e.target.value })}
                                                        className="form-input h-12 font-bold text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 w-full"
                                                        placeholder="e.g. Eduai Automation"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-2 ml-1 italic font-medium uppercase tracking-tighter">System Branding: This title is displayed on platform headers and reports.</p>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Accent Theme Color</label>
                                                    <div className="flex gap-4 items-center">
                                                        <input
                                                            type="color"
                                                            value={props.themeColor}
                                                            onChange={(e) => props.onUpdateThemeColor && props.onUpdateThemeColor(e.target.value)}
                                                            className="h-12 w-24 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer"
                                                        />
                                                        <span className="font-mono text-sm font-bold text-slate-500 uppercase">{props.themeColor}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-6">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Letterhead Header</label>
                                                    <label className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition-colors">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                                            <ArrowUpTrayIcon className="w-5 h-5 text-indigo-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-slate-700">Upload Header Image</p>
                                                            <p className="text-[10px] text-slate-400">PNG or JPG (Max 2MB)</p>
                                                        </div>
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLocalImageUpload(e, 'letterhead')} />
                                                    </label>
                                                    {localCompanyInfo.letterheadConfig?.headerImageUrl && (
                                                        <div className="mt-2 h-16 w-full rounded-lg bg-slate-100 overflow-hidden relative">
                                                            <img src={localCompanyInfo.letterheadConfig.headerImageUrl} alt="Header" className="w-full h-full object-cover opacity-50" />
                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                <span className="text-[10px] font-black uppercase bg-white/80 px-2 py-1 rounded">Preview</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Official Footer Image</label>
                                                    <label className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition-colors">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                                            <ArrowUpTrayIcon className="w-5 h-5 text-indigo-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-slate-700">Upload Footer Image</p>
                                                            <p className="text-[10px] text-slate-400">PNG or JPG (Max 2MB)</p>
                                                        </div>
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLocalImageUpload(e, 'footer')} />
                                                    </label>
                                                    {localCompanyInfo.footerImageUrl && (
                                                        <div className="mt-2 h-10 w-full rounded-lg bg-slate-100 overflow-hidden relative">
                                                            <img src={localCompanyInfo.footerImageUrl} alt="Footer" className="w-full h-full object-cover opacity-50" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        {showDocumentPreview && (
                                            <div className="mt-12 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-6 bg-slate-50 animate-scale-in origin-top">
                                                <BrandedPaper
                                                    institution={{
                                                        name: localCompanyInfo.name,
                                                        logoUrl: localCompanyInfo.logoUrl
                                                    } as any}
                                                    letterheadConfig={localCompanyInfo.letterheadConfig}
                                                    footerImageUrl={localCompanyInfo.footerImageUrl}
                                                >
                                                    <div className="h-96 flex flex-col items-center justify-center opacity-10 py-32">
                                                        <ClipboardListIcon className="w-24 h-24 text-slate-900 mb-6" />
                                                        <p className="text-2xl font-black text-slate-900 uppercase tracking-[0.2em]">Live Document Preview</p>
                                                    </div>
                                                </BrandedPaper>
                                            </div>
                                        )}

                                        <div className="mt-8 flex justify-end">
                                            <button onClick={handleSaveGlobalConfigs} className="btn-primary h-14 px-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save Branding Map</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'sms' && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in shadow-xl shadow-indigo-50/20">
                                    <h3 className="text-xl font-black uppercase tracking-tight">SMS Gateway Configuration</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Input Format: 254XXXXXXXXX (No brackets or +)</p>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Service Provider</label>
                                            <select
                                                value={localSmsConfig.provider}
                                                onChange={e => setLocalSmsConfig({ ...localSmsConfig, provider: e.target.value })}
                                                className="form-select h-12 font-bold text-sm"
                                            >
                                                <option value="ABMIS">ABMIS (Standard)</option>
                                                <option value="Sematime">Sematime (Modern)</option>
                                                <option value="Zettatel">Zettatel Solutions</option>
                                            </select>
                                        </div>

                                        <div className="md:col-span-2 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-6">
                                            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Connection Settings</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Gateway API URL</label>
                                                    <input
                                                        type="text"
                                                        value={localSmsConfig.baseUrl || ''}
                                                        placeholder="e.g., https://sms.abmis.co.ke/SMSApi/send"
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSmsConfig({ ...localSmsConfig, baseUrl: e.target.value })}
                                                        className="form-input font-mono text-xs h-10"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">HTTP Method</label>
                                                    <select
                                                        value={localSmsConfig.method || 'GET'}
                                                        onChange={(e) => setLocalSmsConfig({ ...localSmsConfig, method: e.target.value as any })}
                                                        className="form-select h-10 text-xs font-bold"
                                                    >
                                                        <option value="GET">GET</option>
                                                        <option value="POST">POST</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="md:col-span-2"><hr className="border-slate-50 dark:border-slate-700" /></div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                                {localSmsConfig.provider === 'Zettatel' ? 'User ID' : localSmsConfig.provider === 'Sematime' ? 'API Key' : 'User ID / API Key'}
                                            </label>
                                            <input type="text" value={localSmsConfig.apiKey} onChange={e => setLocalSmsConfig({ ...localSmsConfig, apiKey: e.target.value })} className="form-input h-10" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                                {localSmsConfig.provider === 'Zettatel' ? 'Password' : localSmsConfig.provider === 'Sematime' ? 'Client ID' : 'API Password / Secret'}
                                            </label>
                                            <input type="password" value={localSmsConfig.apiSecret} onChange={e => setLocalSmsConfig({ ...localSmsConfig, apiSecret: e.target.value })} className="form-input h-10" />
                                        </div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender ID / Shortcode</label><input type="text" value={localSmsConfig.fromNumber} onChange={e => setLocalSmsConfig({ ...localSmsConfig, fromNumber: e.target.value })} className="form-input h-10" /></div>

                                        <div className="md:col-span-2 pt-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Custom HTTP Headers</label>
                                                <button
                                                    onClick={() => setLocalSmsConfig(prev => ({ ...prev, headers: [...(prev.headers || []), { name: '', value: '' }] }))}
                                                    className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusIcon className="w-3 h-3" /> Add Header
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {(localSmsConfig.headers || []).map((header, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center animate-fade-in">
                                                        <input
                                                            type="text"
                                                            value={header.name}
                                                            placeholder="Name (e.g. Accept)"
                                                            onChange={(e) => {
                                                                const newHeaders = [...(localSmsConfig.headers || [])];
                                                                newHeaders[idx].name = e.target.value;
                                                                setLocalSmsConfig({ ...localSmsConfig, headers: newHeaders });
                                                            }}
                                                            className="form-input text-xs font-mono h-10"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={header.value}
                                                            placeholder="Value (e.g. application/json)"
                                                            onChange={(e) => {
                                                                const newHeaders = [...(localSmsConfig.headers || [])];
                                                                newHeaders[idx].value = e.target.value;
                                                                setLocalSmsConfig({ ...localSmsConfig, headers: newHeaders });
                                                            }}
                                                            className="form-input text-xs font-mono h-10"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newHeaders = (localSmsConfig.headers || []).filter((_, i) => i !== idx);
                                                                setLocalSmsConfig({ ...localSmsConfig, headers: newHeaders });
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <XIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(localSmsConfig.headers || []).length === 0 && (
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium italic py-2 ml-1">No custom headers defined.</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="md:col-span-2 pt-4">
                                            <div className="flex justify-between items-center mb-3">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Custom Parameters / Body</label>
                                                <button
                                                    onClick={() => setLocalSmsConfig(prev => ({ ...prev, params: [...(prev.params || []), { name: '', value: '' }] }))}
                                                    className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"
                                                >
                                                    <PlusIcon className="w-3 h-3" /> Add Parameter
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {(localSmsConfig.params || []).map((param, idx) => (
                                                    <div key={idx} className="flex gap-2 items-center animate-fade-in">
                                                        <input
                                                            type="text"
                                                            value={param.name}
                                                            placeholder="Parameter Name"
                                                            onChange={(e) => {
                                                                const newParams = [...(localSmsConfig.params || [])];
                                                                newParams[idx].name = e.target.value;
                                                                setLocalSmsConfig({ ...localSmsConfig, params: newParams });
                                                            }}
                                                            className="form-input text-xs font-mono h-10"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={param.value}
                                                            placeholder="Value"
                                                            onChange={(e) => {
                                                                const newParams = [...(localSmsConfig.params || [])];
                                                                newParams[idx].value = e.target.value;
                                                                setLocalSmsConfig({ ...localSmsConfig, params: newParams });
                                                            }}
                                                            className="form-input text-xs font-mono h-10"
                                                        />
                                                        <button
                                                            onClick={() => {
                                                                const newParams = (localSmsConfig.params || []).filter((_, i) => i !== idx);
                                                                setLocalSmsConfig({ ...localSmsConfig, params: newParams });
                                                            }}
                                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                        >
                                                            <XIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ))}
                                                {(localSmsConfig.params || []).length === 0 && (
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium italic py-2 ml-1">No custom parameters defined.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                                            <input
                                                type="text"
                                                placeholder="Test Phone e.g. 2547XXXXXXXX"
                                                value={testRecipient}
                                                onChange={e => setTestRecipient(e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 text-xs font-bold w-40"
                                            />
                                            <button
                                                onClick={handleTestSms}
                                                disabled={isTesting}
                                                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                                            >
                                                {isTesting ? 'Sending...' : 'Send Test SMS'}
                                            </button>
                                            <button
                                                onClick={handleTestOtp}
                                                disabled={isTesting}
                                                className="px-4 py-2 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-colors"
                                            >
                                                {isTesting ? 'Sending...' : 'Test OTP'}
                                            </button>
                                        </div>
                                        <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs w-full sm:w-auto">Sync Gateway</button>
                                    </div>
                                </div>
                            )}


                            {settingsSubTab === 'email' && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
                                    <h3 className="text-xl font-black uppercase tracking-tight">Global Email Relay (SMTP)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">SMTP Host</label><input type="text" value={localEmailConfig.host} onChange={e => setLocalEmailConfig({ ...localEmailConfig, host: e.target.value })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Port</label><input type="number" value={localEmailConfig.port} onChange={e => setLocalEmailConfig({ ...localEmailConfig, port: Number(e.target.value) })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Encryption</label><select value={localEmailConfig.encryption} onChange={e => setLocalEmailConfig({ ...localEmailConfig, encryption: e.target.value as any })} className="form-select"><option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option></select></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Username</label><input type="text" value={localEmailConfig.username} onChange={e => setLocalEmailConfig({ ...localEmailConfig, username: e.target.value })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Password</label><input type="password" value={localEmailConfig.password} onChange={e => setLocalEmailConfig({ ...localEmailConfig, password: e.target.value })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender Name</label><input type="text" value={localEmailConfig.fromName} onChange={e => setLocalEmailConfig({ ...localEmailConfig, fromName: e.target.value })} className="form-input" /></div>
                                        <div className="md:col-span-2"><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender Email</label><input type="email" value={localEmailConfig.fromEmail} onChange={e => setLocalEmailConfig({ ...localEmailConfig, fromEmail: e.target.value })} className="form-input" /></div>
                                    </div>
                                    <div className="pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                                            <input
                                                type="email"
                                                placeholder="Test Email Address"
                                                value={testRecipient}
                                                onChange={e => setTestRecipient(e.target.value)}
                                                className="bg-transparent border-none focus:ring-0 text-xs font-bold w-48"
                                            />
                                            <button
                                                onClick={handleTestEmail}
                                                disabled={isTesting}
                                                className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                                            >
                                                {isTesting ? 'Sending...' : 'Send Test Email'}
                                            </button>
                                        </div>
                                        <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs w-full sm:w-auto">Authorize SMTP</button>
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'billing' && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                                <CreditCardIcon className="w-6 h-6 text-green-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-xl font-black uppercase tracking-tight">Platform Billing Map</h3>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Manage global payment gateways & subscription models</p>
                                            </div>
                                        </div>
                                        <div className="flex bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-full sm:w-auto overflow-x-auto no-scrollbar">
                                            <button 
                                                onClick={() => setBillingSubTab('mpesa')} 
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${billingSubTab === 'mpesa' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                <MpesaIcon className="w-4 h-4" /> Global M-Pesa
                                            </button>
                                            <button 
                                                onClick={() => setBillingSubTab('ncba')} 
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${billingSubTab === 'ncba' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                <BuildingOfficeIcon className="w-4 h-4" /> NCBA Config
                                            </button>
                                        </div>
                                    </div>

                                    {/* Main Billing Content */}
                                    {billingSubTab === 'mpesa' && (
                                        <div className="animate-fade-in space-y-8">
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                                <div className="space-y-6">
                                                    <h4 className="text-sm font-bold uppercase text-slate-500 border-b pb-1">M-Pesa Daraja Gateway</h4>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Gateway Environment</label>
                                                        <select
                                                            value={localMpesaConfig.environment || 'sandbox'}
                                                            onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, environment: e.target.value as any })}
                                                            className="form-select h-12 font-bold text-sm"
                                                        >
                                                            <option value="sandbox">Sandbox (Testing)</option>
                                                            <option value="production">Production (Live)</option>
                                                        </select>
                                                    </div>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Short Code (Paybill)</label><input type="text" value={localMpesaConfig.paybillNumber} onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, paybillNumber: e.target.value })} className="form-input font-mono" placeholder="7-digit code" /></div>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Lipa Na M-Pesa Passkey</label><input type="password" value={localMpesaConfig.passkey} onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, passkey: e.target.value })} className="form-input" /></div>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Consumer Key</label><input type="text" value={localMpesaConfig.consumerKey} onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, consumerKey: e.target.value })} className="form-input" /></div>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Consumer Secret</label><input type="password" value={localMpesaConfig.consumerSecret} onChange={e => setLocalMpesaConfig({ ...localMpesaConfig, consumerSecret: e.target.value })} className="form-input" /></div>
                                                </div>

                                                <div className="space-y-6">
                                                    <h4 className="text-sm font-bold uppercase text-slate-500 border-b pb-1">Standard Subscription Pricing</h4>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Monthly License (KES)</label><input type="number" value={localSubConfig.defaultMonthlyPrice} onChange={e => setLocalSubConfig({ ...localSubConfig, defaultMonthlyPrice: Number(e.target.value) })} className="form-input font-bold text-lg" /></div>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Yearly License (KES)</label><input type="number" value={localSubConfig.defaultYearlyPrice} onChange={e => setLocalSubConfig({ ...localSubConfig, defaultYearlyPrice: Number(e.target.value) })} className="form-input font-bold text-lg" /></div>
                                                    <div><label className="block text-[10px] font-black uppercase text-indigo-600 mb-1.5 ml-1">Base Cost Per Additional Student (KES)</label><input type="number" value={localSubConfig.baseCostPerStudent || 0} onChange={e => setLocalSubConfig({ ...localSubConfig, baseCostPerStudent: Number(e.target.value) })} className="form-input font-bold text-lg border-indigo-200 focus:ring-indigo-500" /></div>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Library Module Cost per Student/Month (KES)</label><input type="number" value={localSubConfig.libraryCostPerStudent || 0} onChange={e => setLocalSubConfig({ ...localSubConfig, libraryCostPerStudent: Number(e.target.value) })} className="form-input font-bold text-lg" /></div>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Boarding Module Cost per Student/Month (KES)</label><input type="number" value={localSubConfig.boardingCostPerStudent || 0} onChange={e => setLocalSubConfig({ ...localSubConfig, boardingCostPerStudent: Number(e.target.value) })} className="form-input font-bold text-lg" /></div>
                                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Transport Module Cost per Student/Month (KES)</label><input type="number" value={localSubConfig.transportCostPerStudent || 0} onChange={e => setLocalSubConfig({ ...localSubConfig, transportCostPerStudent: Number(e.target.value) })} className="form-input font-bold text-lg" /></div>

                                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-200">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
                                                            <span className="text-[10px] font-black uppercase text-slate-600">Gateway Policy</span>
                                                        </div>
                                                        <p className="text-xs text-slate-500 leading-relaxed">Incoming payments are validated against the Paybill and Account Reference (Institution Code). Subscriptions are automatically extended upon successful callback.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                                                    <input
                                                        type="text"
                                                        placeholder="Phone e.g. 2547XXXXXXXX"
                                                        value={testRecipient}
                                                        onChange={e => setTestRecipient(e.target.value)}
                                                        className="bg-transparent border-none focus:ring-0 text-xs font-bold w-40"
                                                    />
                                                    <button
                                                        onClick={handleTestMpesa}
                                                        disabled={isTesting}
                                                        className="px-4 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-colors"
                                                    >
                                                        {isTesting ? 'Testing...' : 'Test STK Push'}
                                                    </button>
                                                </div>
                                                <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs w-full sm:w-auto">Save Billing Map</button>
                                            </div>
                                        </div>
                                    )}

                                    {/* NCBA Config Content */}
                                    {billingSubTab === 'ncba' && (
                                        <div className="animate-fade-in space-y-8">
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-4 mb-8">
                                                    <div className="p-4 bg-teal-50 dark:bg-teal-900/30 rounded-2xl text-teal-600">
                                                        <BuildingOfficeIcon className="w-8 h-8" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-2xl font-black uppercase tracking-tight">Global NCBA Gateway</h4>
                                                        <div className="flex gap-4 mt-1">
                                                            <p className="text-[10px] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2 py-0.5 rounded">ID: SYSTEM</p>
                                                            <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2 py-0.5 rounded">Code: SYS-ADMIN</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Master configuration for NCBA Direct Settlement</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">NCBA OAuth Client ID</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.clientId || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, clientId: e.target.value } as any })}
                                                            className="form-input h-12 font-mono" 
                                                            placeholder="Enter Client ID"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">NCBA Client Secret</label>
                                                        <input 
                                                            type="password" 
                                                            value={localCompanyInfo.ncbaConfig?.clientSecret || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, clientSecret: e.target.value } as any })}
                                                            className="form-input h-12" 
                                                            placeholder="••••••••••••••••"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">API Key / Primary Key</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.apiKey || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, apiKey: e.target.value } as any })}
                                                            className="form-input h-12" 
                                                            placeholder="Enter API Key"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">NCBA Gateway Base URL</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.baseUrl || ''} 
                                                            placeholder="https://api.ncbagroup.com"
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, baseUrl: e.target.value } as any })}
                                                            className="form-input h-12" 
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Disbursement Account Number</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.accountNumber || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, accountNumber: e.target.value } as any })}
                                                            className="form-input h-12 font-bold" 
                                                            placeholder="Enter NCBA Account Number"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">NCBA Merchant ID</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.merchantId || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, merchantId: e.target.value } as any })}
                                                            className="form-input h-12 font-mono" 
                                                            placeholder="Enter Merchant ID"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">NCBA Webhook Secret</label>
                                                        <input 
                                                            type="password" 
                                                            value={localCompanyInfo.ncbaConfig?.webhookSecret || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, webhookSecret: e.target.value } as any })}
                                                            className="form-input h-12" 
                                                            placeholder="••••••••••••••••"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">NCBA Short Code / Paybill</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.shortCode || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, shortCode: e.target.value } as any })}
                                                            className="form-input h-12 font-mono" 
                                                            placeholder="Enter Short Code"
                                                        />
                                                    </div>
                                                    <div className="space-y-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">API Environment</label>
                                                        <select 
                                                            value={localCompanyInfo.ncbaConfig?.environment || 'sandbox'} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, environment: e.target.value } as any })}
                                                            className="form-select h-12 font-bold"
                                                        >
                                                            <option value="sandbox">Sandbox / Testing</option>
                                                            <option value="production">Live Production</option>
                                                        </select>
                                                    </div>

                                                    <div className="md:col-span-2 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                                        <div className="flex items-center justify-between">
                                                            <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-1">Platform Callback Authentication</label>
                                                            <button 
                                                                onClick={generateGlobalNcbaCredentials}
                                                                className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/10 px-4 py-1.5 rounded-xl transition-all border border-indigo-100 dark:border-indigo-950 shadow-sm"
                                                            >
                                                                Generate Perspective Keys
                                                            </button>
                                                        </div>

                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider">Callback Username</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={localCompanyInfo.ncbaConfig?.callbackUsername || ''} 
                                                                    onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, callbackUsername: e.target.value } as any })}
                                                                    className="form-input h-10 font-mono text-xs" 
                                                                    placeholder="sys_xxxx"
                                                                />
                                                            </div>
                                                            <div className="space-y-1">
                                                                <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider">Callback Secret Key</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={localCompanyInfo.ncbaConfig?.callbackSecret || ''} 
                                                                    onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, callbackSecret: e.target.value } as any })}
                                                                    className="form-input h-10 font-mono text-xs" 
                                                                    placeholder="Long global secret"
                                                                />
                                                            </div>
                                                            <div className="md:col-span-2 space-y-1">
                                                                <label className="block text-[9px] font-black text-slate-400 uppercase ml-1 tracking-wider">Notification API Key (Optional)</label>
                                                                <input 
                                                                    type="text" 
                                                                    value={localCompanyInfo.ncbaConfig?.notificationApiKey || ''} 
                                                                    onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, notificationApiKey: e.target.value } as any })}
                                                                    className="form-input h-10 font-mono text-xs" 
                                                                    placeholder="sys_key_xxxx"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="md:col-span-2 space-y-2 mt-4">
                                                        <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest ml-1">Standard Platform Callback URL (Required)</label>
                                                        <div className="flex gap-2">
                                                            <input 
                                                                type="text" 
                                                                readOnly 
                                                                value={`${window.location.origin}/api/ncba-callback?institutionId=SYSTEM`}
                                                                className="form-input h-12 font-mono text-[10px] bg-slate-100 dark:bg-slate-800 border-dashed"
                                                            />
                                                            <button 
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(`${window.location.origin}/api/ncba-callback?institutionId=SYSTEM`);
                                                                    alert('Platform Callback URL copied');
                                                                }}
                                                                className="px-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all shadow-sm"
                                                            >
                                                                Copy
                                                            </button>
                                                        </div>
                                                        <p className="text-[10px] text-slate-400 italic">This is the standardized NCBA 2024 compliance endpoint for settlement. NCBA should use the **Callback Username** and **Callback Secret** as Basic Auth credentials.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4 gap-4">
                                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/20 text-xs text-amber-700 flex-1 max-w-xl">
                                                    <div className="flex gap-2 items-center mb-1"><InformationCircleIcon className="w-4 h-4" /><span className="font-bold uppercase tracking-tight">Security Notice</span></div>
                                                    <p>NCBA API credentials allow programmatic movement of funds. Ensure your client secret and API keys are stored securely. These settings apply globally to platform-level settlement.</p>
                                                </div>
                                                <button onClick={handleSaveGlobalConfigs} className="btn-primary h-14 px-12 shadow-xl shadow-teal-100 dark:shadow-none bg-teal-600 border-none uppercase tracking-widest text-[10px]">Save NCBA Config</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {settingsSubTab === 'sms_pricing' && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in shadow-xl shadow-indigo-50/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                            <CurrencyIcon className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Global SMS Pricing Rules</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Default Unit Price (KES)</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={localSmsConfig.smsUnitPrice || ''}
                                                onChange={e => setLocalSmsConfig({ ...localSmsConfig, smsUnitPrice: parseFloat(e.target.value) })}
                                                className="form-input font-bold text-lg"
                                                placeholder="e.g. 1.00"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 ml-1 italic">The standard cost per single SMS message (160 characters).</p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Min Purchase Quantity</label>
                                            <input
                                                type="number"
                                                value={localSmsConfig.minSmsUnits || ''}
                                                onChange={e => setLocalSmsConfig({ ...localSmsConfig, minSmsUnits: parseInt(e.target.value) })}
                                                className="form-input font-bold text-lg"
                                                placeholder="e.g. 500"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 ml-1 italic">Minimum number of units a tenant must buy at once.</p>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-end">
                                            <div>
                                                <h4 className="text-sm font-black uppercase tracking-tight">Institutional Overrides</h4>
                                                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-1">Tenant-Specific Pricing Exceptions</p>
                                            </div>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                                            <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                                <thead className="bg-slate-50 dark:bg-slate-950">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Institution</th>
                                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Standard Price</th>
                                                        <th className="px-6 py-3 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Custom Price</th>
                                                        <th className="px-6 py-3 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                                    {institutions.map(inst => (
                                                        <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <div className="text-sm font-bold text-slate-900 dark:text-white">{inst.name}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono">{inst.institutionCode}</div>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                                                                KES {localSmsConfig.smsUnitPrice?.toFixed(2) || '1.00'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                {inst.customSmsPrice ? (
                                                                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-[10px] font-black uppercase tracking-tighter">
                                                                        KES {inst.customSmsPrice.toFixed(2)}
                                                                    </span>
                                                                ) : (
                                                                    <span className="text-[10px] text-slate-300 uppercase font-bold tracking-widest italic">No Override</span>
                                                                )}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-right">
                                                                <button
                                                                    onClick={() => setEditingInstitution(inst)}
                                                                    className="text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-3 py-1.5 rounded-xl transition-colors"
                                                                >
                                                                    Manage Price
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t flex justify-end">
                                        <button
                                            onClick={handleSaveGlobalConfigs}
                                            disabled={isSavingConfigs}
                                            className="btn-primary px-12 h-14 shadow-indigo-100 uppercase tracking-widest text-xs"
                                        >
                                            {isSavingConfigs ? 'Synchronizing...' : 'Sync Pricing Map'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'marketplace' && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in shadow-xl shadow-orange-50/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                                            <ShoppingCartIcon className="w-6 h-6 text-orange-600" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Public Marketplace Settings</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Marketplace URL</label>
                                            <input
                                                type="text"
                                                value={localCompanyInfo.marketplaceConfig?.customUrl || ''}
                                                onChange={e => setLocalCompanyInfo({
                                                    ...localCompanyInfo,
                                                    marketplaceConfig: {
                                                        pricingAmount: localCompanyInfo.marketplaceConfig?.pricingAmount || 150,
                                                        customUrl: e.target.value
                                                    }
                                                })}
                                                className="form-input"
                                                placeholder="e.g. https://marketplace.eduai.co.ke"
                                            />
                                            <div className="mt-3 p-4 bg-orange-50 dark:bg-orange-900/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                                                <p className="text-[10px] text-orange-700 dark:text-orange-400 font-black uppercase tracking-widest mb-2">Hosting Configuration Required</p>
                                                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed italic">
                                                    If using a custom domain, you MUST add it to your project settings in Vercel/Netlify.
                                                    <br /><br />
                                                    <strong>Fallback Access:</strong> If the domain is not yet active, use the system URL with <span className="text-orange-600 font-bold">?view=marketplace</span> appended.
                                                </p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Advertising / Lead Pricing (KES)</label>
                                            <input
                                                type="number"
                                                value={localCompanyInfo.marketplaceConfig?.pricingAmount || ''}
                                                onChange={e => setLocalCompanyInfo({
                                                    ...localCompanyInfo,
                                                    marketplaceConfig: {
                                                        customUrl: localCompanyInfo.marketplaceConfig?.customUrl || '',
                                                        pricingAmount: parseInt(e.target.value) || 0
                                                    }
                                                })}
                                                className="form-input font-bold text-lg"
                                                placeholder="e.g. 150"
                                            />
                                            <p className="text-[10px] text-slate-400 mt-2 ml-1 italic">Charge per ad or lead generated for tenants.</p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t flex justify-end">
                                        <button
                                            onClick={handleSaveGlobalConfigs}
                                            disabled={isSavingConfigs}
                                            className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-12 h-14 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-orange-100/50 dark:shadow-none transition-all"
                                        >
                                            {isSavingConfigs ? 'Synchronizing...' : 'Save Marketplace Config'}
                                        </button>
                                    </div>

                                    <div className="pt-12 border-t border-slate-200 dark:border-slate-700">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 italic">Live Preview</h3>
                                        <div className="h-[600px] border-[8px] border-slate-900 rounded-[3rem] overflow-hidden shadow-2xl relative bg-slate-50 dark:bg-slate-950">
                                            {/* Top bar simulating browser */}
                                            <div className="h-8 bg-slate-900 w-full flex items-center px-4 gap-2 absolute top-0 left-0 z-10">
                                                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <div className="ml-4 flex-1 h-5 bg-slate-800 rounded text-[9px] text-slate-400 flex items-center px-3 font-mono">
                                                    {localCompanyInfo.marketplaceConfig?.customUrl || 'https://marketplace.eduai.co.ke'}
                                                </div>
                                            </div>
                                            <div className="pt-8 h-full overflow-y-auto">
                                                <div className="origin-top scale-[0.80] w-[125%] h-[125%]">
                                                    <PropertyMarketplaceView />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {settingsSubTab === 'showcase' && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in shadow-xl shadow-indigo-50/20">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                            <SparklesIcon className="w-6 h-6 text-indigo-600" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Marketing Showcase Settings</h3>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                                    <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enable Showcase</h4>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Public Marketing Visibility</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setLocalCompanyInfo({
                                                        ...localCompanyInfo,
                                                        showcaseConfig: { ...localCompanyInfo.showcaseConfig, enabled: !localCompanyInfo.showcaseConfig?.enabled } as any
                                                    });
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localCompanyInfo.showcaseConfig?.enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localCompanyInfo.showcaseConfig?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                                    <UserIcon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Login Page Link</h4>
                                                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Display on Login Screen</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setLocalCompanyInfo({
                                                        ...localCompanyInfo,
                                                        showcaseConfig: { ...localCompanyInfo.showcaseConfig, showLoginLink: !localCompanyInfo.showcaseConfig?.showLoginLink } as any
                                                    });
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localCompanyInfo.showcaseConfig?.showLoginLink ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localCompanyInfo.showcaseConfig?.showLoginLink ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                                                <CommandLineIcon className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight font-black">cPanel Storage Configuration</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Bridge URL (upload_showcase.php)</label>
                                                <input 
                                                    type="text" 
                                                    placeholder="https://yourdomain.com/api/upload_showcase.php"
                                                    value={localCompanyInfo.showcaseConfig?.cpanelUploadUrl || ''}
                                                    onChange={(e) => setLocalCompanyInfo({
                                                        ...localCompanyInfo,
                                                        showcaseConfig: { ...localCompanyInfo.showcaseConfig, cpanelUploadUrl: e.target.value } as any
                                                    })}
                                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl h-12 px-4 text-xs focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Secret Auth Token</label>
                                                <input 
                                                    type="password" 
                                                    placeholder="Enter your secure token"
                                                    value={localCompanyInfo.showcaseConfig?.cpanelSecret || ''}
                                                    onChange={(e) => setLocalCompanyInfo({
                                                        ...localCompanyInfo,
                                                        showcaseConfig: { ...localCompanyInfo.showcaseConfig, cpanelSecret: e.target.value } as any
                                                    })}
                                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl h-12 px-4 text-xs focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                                                    <SparklesIcon className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight font-black">Showcase Item Manager</h4>
                                            </div>
                                            <button 
                                                onClick={handleAddShowcaseItem}
                                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200/50 dark:shadow-none"
                                            >
                                                <PlusIcon className="w-4 h-4" />
                                                Add Item
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {(localCompanyInfo.showcaseConfig?.items || []).map((item: ShowcaseItem) => (
                                                <div key={item.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-300">
                                                    <div className="h-32 bg-slate-100 dark:bg-slate-800 relative">
                                                        {item.imageUrl ? (
                                                            <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="flex items-center justify-center h-full text-slate-400">
                                                                <EyeIcon className="w-8 h-8 opacity-20" />
                                                            </div>
                                                        )}
                                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button 
                                                                onClick={() => { setEditingShowcaseItem(item); setIsShowcaseItemModalOpen(true); }}
                                                                className="p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm hover:text-indigo-600"
                                                            >
                                                                <Cog8ToothIcon className="w-4 h-4" />
                                                            </button>
                                                            <button 
                                                                onClick={() => { if(confirm('Delete this item?')) handleDeleteShowcaseItem(item.id); }}
                                                                className="p-1.5 bg-white/90 dark:bg-slate-800/90 rounded-lg shadow-sm hover:text-rose-600"
                                                            >
                                                                <XIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div className="p-4">
                                                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate lg:whitespace-normal">{item.title || 'Untitled Item'}</h5>
                                                        <p className="text-[10px] text-slate-500 mt-1 line-clamp-2">{item.description || 'No description provided.'}</p>
                                                    </div>
                                                </div>
                                            ))}
                                            {(localCompanyInfo.showcaseConfig?.items || []).length === 0 && (
                                                <div className="col-span-full py-12 flex flex-col items-center justify-center border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2.5rem] bg-slate-50/50 dark:bg-slate-900/20">
                                                    <SparklesIcon className="w-12 h-12 text-slate-300 mb-3" />
                                                    <p className="text-xs font-medium text-slate-400">No showcase items configured yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t flex justify-end">
                                        <button
                                            onClick={handleSaveGlobalConfigs}
                                            disabled={isSavingConfigs}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-12 h-14 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-indigo-100/50 dark:shadow-none transition-all"
                                        >
                                            {isSavingConfigs ? 'Synchronizing...' : 'Save Showcase Settings'}
                                        </button>
                                    </div>

                                    <div className="pt-12 border-t border-slate-200 dark:border-slate-700">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 mb-6 italic">Live Preview</h3>
                                        <div className="h-[600px] border-[8px] border-slate-900 rounded-[3rem] overflow-hidden shadow-2xl relative bg-slate-950">
                                            {/* Top bar simulating browser */}
                                            <div className="h-8 bg-slate-900 w-full flex items-center px-4 gap-2 absolute top-0 left-0 z-10">
                                                <div className="w-3 h-3 rounded-full bg-rose-500"></div>
                                                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                                                <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                                                <div className="ml-4 flex-1 h-5 bg-slate-800 rounded text-[9px] text-slate-400 flex items-center px-3 font-mono">
                                                    {window.location.origin + '?view=showcase'}
                                                </div>
                                            </div>
                                            <div className="pt-8 h-full overflow-y-auto no-scrollbar">
                                                <div className="origin-top scale-[0.65] w-[153%]">
                                                    <MarketingLandingPage onLogin={() => {}} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </main>

            {managingMarketplaceFor && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setManagingMarketplaceFor(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-orange-50/50 dark:bg-orange-900/10">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-orange-900 dark:text-orange-200">Marketplace Governance</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{managingMarketplaceFor.name}</p>
                            </div>
                            <button onClick={() => setManagingMarketplaceFor(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                                        <ShoppingCartIcon className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">Enable Marketplace</h4>
                                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tight">Public Advertising Access</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setManagingMarketplaceFor({
                                            ...managingMarketplaceFor,
                                            marketplaceEnabled: !managingMarketplaceFor.marketplaceEnabled
                                        });
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${managingMarketplaceFor.marketplaceEnabled ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${managingMarketplaceFor.marketplaceEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Listing Quota (Max Ads)</label>
                                <input
                                    type="number"
                                    value={managingMarketplaceFor.listingQuota || 0}
                                    onChange={e => setManagingMarketplaceFor({ ...managingMarketplaceFor, listingQuota: Number(e.target.value) })}
                                    className="form-input text-lg font-black"
                                    min="0"
                                    placeholder="e.g. 10"
                                />
                                <p className="text-[10px] text-slate-400 font-medium italic">Set to 0 for unlimited or based on subscription tier.</p>
                            </div>

                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-100 dark:border-orange-800">
                                <p className="text-xs text-orange-700 dark:text-orange-300 font-medium leading-relaxed">
                                    Enabling the marketplace allows this institution to post properties on the platform's public sales page. Use the quota to limit their advertising reach.
                                </p>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setManagingMarketplaceFor(null)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button
                                disabled={isSavingTenantConfig}
                                onClick={async () => {
                                    if (!managingMarketplaceFor || !props.onUpdateInstitution) return;
                                    setIsSavingTenantConfig(true);
                                    try {
                                        await props.onUpdateInstitution(managingMarketplaceFor.id, {
                                            marketplaceEnabled: managingMarketplaceFor.marketplaceEnabled,
                                            listingQuota: managingMarketplaceFor.listingQuota
                                        });
                                        setManagingMarketplaceFor(null);
                                    } finally {
                                        setIsSavingTenantConfig(false);
                                    }
                                }}
                                className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-100/50 dark:shadow-none transition-all active:scale-95"
                            >
                                {isSavingTenantConfig ? 'Synchronizing…' : 'Update Marketplace Settings'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isDirectAssignOpen && (
                <DirectAssignModal
                    lecturers={(props.users || []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin')}
                    subjects={props.subjects || []}
                    courses={props.courses || []}
                    onClose={() => setIsDirectAssignOpen(false)}
                    onAssign={props.onDirectAssign || (() => { })}
                />
            )}

            {isPerspectiveModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsPerspectiveModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Perspective Switcher</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Institutional Module Simulator</p>
                            </div>
                            <button onClick={() => setIsPerspectiveModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="relative group/modal">
                            <div 
                                ref={scrollRef}
                                className="p-8 flex gap-4 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory"
                            >
                                {perspectiveOptions.filter(o => !o.isService).map(opt => (
                                    <button
                                        key={opt.role}
                                        onClick={() => {
                                            props.onSwitchPerspective?.(opt.role as Role);
                                            setIsPerspectiveModalOpen(false);
                                        }}
                                        className={`flex-none w-[200px] flex flex-col items-center justify-center gap-4 p-8 rounded-[3rem] border-2 border-transparent transition-all group hover:border-indigo-500 snap-center shadow-sm ${opt.color}`}
                                    >
                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-sm transition-transform group-hover:scale-110">
                                            {opt.icon}
                                        </div>
                                        <span className="font-black text-[11px] uppercase tracking-widest text-center">{opt.label}</span>
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={() => handleScroll('left')}
                                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-xl border border-slate-100 dark:border-slate-700 opacity-0 group-hover/modal:opacity-100 transition-all hover:scale-110 active:scale-95 z-10"
                            >
                                <ChevronRightIcon className="w-6 h-6 rotate-180" />
                            </button>
                            <button 
                                onClick={() => handleScroll('right')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/90 dark:bg-slate-800/90 rounded-full shadow-xl border border-slate-100 dark:border-slate-700 opacity-0 group-hover/modal:opacity-100 transition-all hover:scale-110 active:scale-95 z-10"
                            >
                                <ChevronRightIcon className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Added return button - separate for prominence */}
                        {props.isImpersonating && (
                            <div className="px-8 pb-8">
                                <button
                                    onClick={() => {
                                        props.onSwitchPerspective?.(null as any);
                                        setIsPerspectiveModalOpen(false);
                                    }}
                                    className="w-full flex items-center justify-center gap-4 p-5 rounded-3xl border-2 border-red-200 bg-red-50 text-red-700 transition-all group hover:border-red-500"
                                >
                                    <div className="p-3 bg-white rounded-2xl shadow-sm transition-transform group-hover:scale-110">
                                        <ArrowRightOnRectangleIcon className="w-6 h-6 text-red-600" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight">Return to Global Admin</span>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {editingInstitution && (
                <EditInstitutionModal
                    institution={editingInstitution}
                    onClose={() => setEditingInstitution(null)}
                    onSave={async (id, data) => { if (props.onUpdateInstitution) await props.onUpdateInstitution(id, data); setEditingInstitution(null); }}
                    defaultPrices={companyDetails.subscriptionConfig}
                    counties={counties}
                />
            )}

            {extendingInstitution && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setExtendingInstitution(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight">Manual Extension</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{extendingInstitution.name}</p>
                            </div>
                            <button onClick={() => setExtendingInstitution(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Extension Period (Days)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[30, 90, 365].map(days => (
                                        <button
                                            key={days}
                                            onClick={() => setExtensionDays(days)}
                                            className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all ${extensionDays === days ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-500 hover:border-slate-200'}`}
                                        >
                                            {days === 365 ? '1 Year' : days === 90 ? 'Quarter' : 'Month'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Custom Days</label>
                                <input
                                    type="number"
                                    value={extensionDays}
                                    onChange={e => setExtensionDays(Number(e.target.value))}
                                    className="form-input text-lg font-black"
                                    min="1"
                                />
                            </div>
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium leading-relaxed">
                                    The new expiry date will be set to <strong>{extensionDays} days</strong> after the current expiry or today (whichever is later).
                                </p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setExtendingInstitution(null)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700">Cancel</button>
                            <button onClick={handleExtendSubscription} className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-100">Grant Extension</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Sender Gateway Modal ── */}
            {managingGatewayFor && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setManagingGatewayFor(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-purple-50/50 dark:bg-purple-900/10">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-purple-900 dark:text-purple-200">Sender Gateway</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{managingGatewayFor.name}</p>
                            </div>
                            <button onClick={() => setManagingGatewayFor(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Provider</label>
                                    <select
                                        value={tenantSmsConfig.provider || 'Zettatel'}
                                        onChange={e => setTenantSmsConfig(prev => ({ ...prev, provider: e.target.value }))}
                                        className="form-select"
                                    >
                                        <option value="Zettatel">Zettatel</option>
                                        <option value="ABMIS">ABMIS</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Sender ID</label>
                                    <input type="text" value={tenantSmsConfig.fromNumber || ''} onChange={e => setTenantSmsConfig(prev => ({ ...prev, fromNumber: e.target.value }))} className="form-input" placeholder="e.g. EduAi" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">API Key / Username</label>
                                    <input type="text" value={tenantSmsConfig.apiKey || ''} onChange={e => setTenantSmsConfig(prev => ({ ...prev, apiKey: e.target.value }))} className="form-input" placeholder="Gateway username" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">API Secret / Password</label>
                                    <input type="password" value={tenantSmsConfig.apiSecret || ''} onChange={e => setTenantSmsConfig(prev => ({ ...prev, apiSecret: e.target.value }))} className="form-input" placeholder="Gateway password" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Request Method</label>
                                    <select
                                        value={tenantSmsConfig.method || 'GET'}
                                        onChange={e => setTenantSmsConfig(prev => ({ ...prev, method: e.target.value as any }))}
                                        className="form-select font-bold text-xs h-12"
                                    >
                                        <option value="GET">HTTP GET</option>
                                        <option value="POST">HTTP POST</option>
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Gateway URL (optional override)</label>
                                    <input type="text" value={tenantSmsConfig.baseUrl || tenantSmsConfig.api_url || ''} onChange={e => setTenantSmsConfig(prev => ({ ...prev, baseUrl: e.target.value }))} className="form-input font-mono text-xs" placeholder="Leave blank to use default" />
                                </div>

                                <div className="sm:col-span-2 pt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Custom HTTP Headers</label>
                                        <button
                                            onClick={() => setTenantSmsConfig(prev => ({ ...prev, headers: [...(prev.headers || []), { name: '', value: '' }] }))}
                                            className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"
                                        >
                                            <PlusIcon className="w-3 h-3" /> Add Header
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(tenantSmsConfig.headers || []).map((header, idx) => (
                                            <div key={idx} className="flex gap-2 items-center animate-fade-in">
                                                <input
                                                    type="text"
                                                    value={header.name}
                                                    placeholder="Name"
                                                    onChange={(e) => {
                                                        const newHeaders = [...(tenantSmsConfig.headers || [])];
                                                        newHeaders[idx].name = e.target.value;
                                                        setTenantSmsConfig({ ...tenantSmsConfig, headers: newHeaders });
                                                    }}
                                                    className="form-input text-xs font-mono h-10"
                                                />
                                                <input
                                                    type="text"
                                                    value={header.value}
                                                    placeholder="Value"
                                                    onChange={(e) => {
                                                        const newHeaders = [...(tenantSmsConfig.headers || [])];
                                                        newHeaders[idx].value = e.target.value;
                                                        setTenantSmsConfig({ ...tenantSmsConfig, headers: newHeaders });
                                                    }}
                                                    className="form-input text-xs font-mono h-10"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newHeaders = (tenantSmsConfig.headers || []).filter((_, i) => i !== idx);
                                                        setTenantSmsConfig({ ...tenantSmsConfig, headers: newHeaders });
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="sm:col-span-2 pt-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Custom Parameters / Body</label>
                                        <button
                                            onClick={() => setTenantSmsConfig(prev => ({ ...prev, params: [...(prev.params || []), { name: '', value: '' }] }))}
                                            className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"
                                        >
                                            <PlusIcon className="w-3 h-3" /> Add Parameter
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {(tenantSmsConfig.params || []).map((param, idx) => (
                                            <div key={idx} className="flex gap-2 items-center animate-fade-in">
                                                <input
                                                    type="text"
                                                    value={param.name}
                                                    placeholder="Key"
                                                    onChange={(e) => {
                                                        const newParams = [...(tenantSmsConfig.params || [])];
                                                        newParams[idx].name = e.target.value;
                                                        setTenantSmsConfig({ ...tenantSmsConfig, params: newParams });
                                                    }}
                                                    className="form-input text-xs font-mono h-10"
                                                />
                                                <input
                                                    type="text"
                                                    value={param.value}
                                                    placeholder="Value"
                                                    onChange={(e) => {
                                                        const newParams = [...(tenantSmsConfig.params || [])];
                                                        newParams[idx].value = e.target.value;
                                                        setTenantSmsConfig({ ...tenantSmsConfig, params: newParams });
                                                    }}
                                                    className="form-input text-xs font-mono h-10"
                                                />
                                                <button
                                                    onClick={() => {
                                                        const newParams = (tenantSmsConfig.params || []).filter((_, i) => i !== idx);
                                                        setTenantSmsConfig({ ...tenantSmsConfig, params: newParams });
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-2xl border border-purple-100 dark:border-purple-800">
                                <p className="text-xs text-purple-700 dark:text-purple-300 font-medium">This gateway config is saved directly on the tenant's institution record and overrides the global system gateway for this tenant only.</p>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setManagingGatewayFor(null)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700">Cancel</button>
                            <button
                                disabled={isSavingTenantConfig}
                                onClick={async () => {
                                    if (!managingGatewayFor || !props.onUpdateInstitution) return;
                                    setIsSavingTenantConfig(true);
                                    try {
                                        await props.onUpdateInstitution(managingGatewayFor.id, { smsConfig: tenantSmsConfig });
                                        setManagingGatewayFor(null);
                                    } finally {
                                        setIsSavingTenantConfig(false);
                                    }
                                }}
                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-purple-100"
                            >
                                {isSavingTenantConfig ? 'Saving…' : 'Save Gateway'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── M-Pesa Configuration Modal ── */}
            {managingMpesaFor && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setManagingMpesaFor(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-200">M-Pesa Integration</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{managingMpesaFor.name}</p>
                            </div>
                            <button onClick={() => setManagingMpesaFor(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Paybill / Shortcode</label>
                                    <input
                                        type="text"
                                        value={tenantMpesaConfig.paybillNumber}
                                        onChange={e => setTenantMpesaConfig({ ...tenantMpesaConfig, paybillNumber: e.target.value })}
                                        className="form-input text-sm font-mono"
                                        placeholder="e.g. 174379"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Account Number</label>
                                    <input
                                        type="text"
                                        value={tenantMpesaConfig.accountNumber}
                                        onChange={e => setTenantMpesaConfig({ ...tenantMpesaConfig, accountNumber: e.target.value })}
                                        className="form-input text-sm font-mono"
                                        placeholder="e.g. Online"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Consumer Key</label>
                                <input
                                    type="text"
                                    value={tenantMpesaConfig.consumerKey}
                                    onChange={e => setTenantMpesaConfig({ ...tenantMpesaConfig, consumerKey: e.target.value })}
                                    className="form-input text-xs font-mono"
                                    placeholder="Enter Consumer Key"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Consumer Secret</label>
                                <input
                                    type="password"
                                    value={tenantMpesaConfig.consumerSecret}
                                    onChange={e => setTenantMpesaConfig({ ...tenantMpesaConfig, consumerSecret: e.target.value })}
                                    className="form-input text-xs font-mono"
                                    placeholder="Enter Consumer Secret"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Passkey</label>
                                <input
                                    type="password"
                                    value={tenantMpesaConfig.passkey}
                                    onChange={e => setTenantMpesaConfig({ ...tenantMpesaConfig, passkey: e.target.value })}
                                    className="form-input text-xs font-mono"
                                    placeholder="Enter Passkey"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Environment</label>
                                <select
                                    value={tenantMpesaConfig.environment}
                                    onChange={e => setTenantMpesaConfig({ ...tenantMpesaConfig, environment: e.target.value as 'sandbox' | 'production' })}
                                    className="form-input text-sm"
                                >
                                    <option value="sandbox">Sandbox (Testing)</option>
                                    <option value="production">Production (Live)</option>
                                </select>
                            </div>

                            <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                                <p className="text-xs text-emerald-700 dark:text-emerald-300 font-medium">Configure institution-specific M-Pesa details for STK push. These settings will override global M-Pesa configuration for this institution.</p>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setManagingMpesaFor(null)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button
                                disabled={isSavingTenantConfig}
                                onClick={async () => {
                                    if (!managingMpesaFor || !props.onUpdateInstitution) return;
                                    setIsSavingTenantConfig(true);
                                    try {
                                        await props.onUpdateInstitution(managingMpesaFor.id, { mpesaConfig: tenantMpesaConfig });
                                        setManagingMpesaFor(null);
                                    } finally {
                                        setIsSavingTenantConfig(false);
                                    }
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100/50 dark:shadow-none transition-all active:scale-95"
                            >
                                {isSavingTenantConfig ? 'Saving…' : 'Save M-Pesa Config'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Module Specific Pricing Modal ── */}
            {managingPlansFor && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setManagingPlansFor(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-sky-50/50 dark:bg-sky-900/10">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight text-sky-900 dark:text-sky-200">Module Subscription Plans</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{managingPlansFor.name}</p>
                            </div>
                            <button onClick={() => setManagingPlansFor(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {perspectiveOptions.map((opt) => (
                                    <div key={opt.role} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-700/50">
                                        <div className={`w-12 h-12 rounded-2xl ${opt.color} flex items-center justify-center shadow-sm`}>
                                            {opt.icon}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{opt.label}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pricing for {opt.role}</p>
                                        </div>
                                        <div className="flex gap-3">
                                            <div className="w-28 space-y-1">
                                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Monthly</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KES</span>
                                                    <input
                                                        type="number"
                                                        value={tenantModulePricing[opt.role]?.monthly || ''}
                                                        onChange={e => setTenantModulePricing({
                                                            ...tenantModulePricing,
                                                            [opt.role]: { ...tenantModulePricing[opt.role], monthly: Number(e.target.value) }
                                                        })}
                                                        className="form-input text-xs font-black pl-10 h-10"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                            <div className="w-28 space-y-1">
                                                <label className="block text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Yearly</label>
                                                <div className="relative">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KES</span>
                                                    <input
                                                        type="number"
                                                        value={tenantModulePricing[opt.role]?.yearly || ''}
                                                        onChange={e => setTenantModulePricing({
                                                            ...tenantModulePricing,
                                                            [opt.role]: { ...tenantModulePricing[opt.role], yearly: Number(e.target.value) }
                                                        })}
                                                        className="form-input text-xs font-black pl-10 h-10"
                                                        placeholder="0"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800">
                                <p className="text-xs text-amber-700 dark:text-amber-300 font-medium">Set 0 or leave empty to use system default pricing for that module. These prices are used when generating invoices for the tenant.</p>
                            </div>
                        </div>
                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setManagingPlansFor(null)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button
                                disabled={isSavingTenantConfig}
                                onClick={async () => {
                                    if (!managingPlansFor || !props.onUpdateInstitution) return;
                                    setIsSavingTenantConfig(true);
                                    try {
                                        await props.onUpdateInstitution(managingPlansFor.id, { customModulePricing: tenantModulePricing });
                                        setManagingPlansFor(null);
                                    } finally {
                                        setIsSavingTenantConfig(false);
                                    }
                                }}
                                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-sky-100/50 dark:shadow-none transition-all active:scale-95"
                            >
                                {isSavingTenantConfig ? 'Saving…' : 'Save Module Plans'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── SMS Units Management Modal ── */}
            {managingSmsUnitsFor && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setManagingSmsUnitsFor(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-sky-50/50 dark:bg-sky-900/10">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-sky-900 dark:text-sky-200">SMS Units</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{managingSmsUnitsFor.name}</p>
                            </div>
                            <button onClick={() => setManagingSmsUnitsFor(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                                <div>
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Current Balance</p>
                                    <p className="text-3xl font-black text-sky-600 tracking-tighter mt-1">{(managingSmsUnitsFor.smsBalance ?? 0).toLocaleString()}</p>
                                    <p className="text-[10px] text-slate-400 font-mono">SMS units</p>
                                </div>
                                <CreditCardIcon className="w-10 h-10 text-sky-200" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Adjust Units (use negative to deduct)</label>
                                <input
                                    type="number"
                                    value={tenantSmsAdjustment.amount || ''}
                                    onChange={e => setTenantSmsAdjustment(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-sky-500 rounded-2xl px-5 py-4 text-sm font-bold transition-all"
                                    placeholder="e.g. 500 or -100"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Adjustment Reason (optional)</label>
                                <input
                                    type="text"
                                    value={tenantSmsAdjustment.reason}
                                    onChange={e => setTenantSmsAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-sky-500 rounded-2xl px-5 py-4 text-sm font-bold transition-all"
                                    placeholder="e.g. Manual top-up, correction…"
                                />
                            </div>
                            {tenantSmsAdjustment.amount !== 0 && (
                                <div className={`p-3 rounded-xl border text-xs font-medium ${tenantSmsAdjustment.amount > 0 ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
                                    New balance will be: <strong>{(Math.max(0, (managingSmsUnitsFor.smsBalance ?? 0) + tenantSmsAdjustment.amount)).toLocaleString()}</strong> units
                                </div>
                            )}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setManagingSmsUnitsFor(null)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button
                                disabled={isSavingTenantConfig || tenantSmsAdjustment.amount === 0}
                                onClick={async () => {
                                    if (!managingSmsUnitsFor || !props.onUpdateInstitution) return;
                                    setIsSavingTenantConfig(true);
                                    try {
                                        const newBalance = Math.max(0, (managingSmsUnitsFor.smsBalance ?? 0) + tenantSmsAdjustment.amount);
                                        await props.onUpdateInstitution(managingSmsUnitsFor.id, { smsBalance: newBalance });
                                        setManagingSmsUnitsFor(null);
                                    } finally {
                                        setIsSavingTenantConfig(false);
                                    }
                                }}
                                className="bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-sky-100 transition-all active:scale-95"
                            >
                                {isSavingTenantConfig ? 'Saving…' : 'Apply Adjustment'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Commission Disbursement Modal ── */}
            {disburseReseller && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setDisburseReseller(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl text-emerald-600">
                                    <CurrencyIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-200">Disburse Commission</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{disburseReseller.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setDisburseReseller(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleDisburseCommission} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 gap-6">
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 ml-1">Managed Portfolio Statistics</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Total Tenants</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                                {institutions.filter(i => i.resellerId === disburseReseller.id).length}
                                            </p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Base Rate (Monthly)</p>
                                            <p className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                                                KES {localSubConfig.defaultMonthlyPrice.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Payout Amount (KES)</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={disbursementAmount}
                                            onChange={(e) => setDisbursementAmount(Number(e.target.value))}
                                            placeholder="Enter amount to disburse"
                                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl px-5 py-4 text-sm font-bold transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Transaction Reference (e.g. M-Pesa Code)</label>
                                        <input
                                            type="text"
                                            required
                                            value={disbursementRef}
                                            onChange={(e) => setDisbursementRef(e.target.value.toUpperCase())}
                                            placeholder="BPG2X8JK9R"
                                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl px-5 py-4 text-sm font-mono font-bold transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Optional Notes</label>
                                        <textarea
                                            value={disbursementNotes}
                                            onChange={(e) => setDisbursementNotes(e.target.value)}
                                            placeholder="January 2024 Commission Payout"
                                            className="w-full bg-slate-50 dark:bg-slate-800/80 border-0 focus:ring-2 focus:ring-emerald-500 rounded-2xl px-5 py-4 text-sm font-bold transition-all min-h-[100px]"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setDisburseReseller(null)}
                                    className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isDisbursing || !disbursementAmount || !disbursementRef}
                                    className="flex-[2] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-200/50 flex items-center justify-center gap-2 transition-all"
                                >
                                    {isDisbursing ? (
                                        <>
                                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                            Processing Payout…
                                        </>
                                    ) : (
                                        <>
                                            <PaperAirplaneIcon className="w-4 h-4" />
                                            Disburse & Notify Reseller
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Perspective Switching Modal */}
            {isPerspectiveModalOpen && selectedTenantForPerspective && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsPerspectiveModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-scale-in" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Perspective Switcher</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Impersonate {selectedTenantForPerspective.name}</p>
                            </div>
                            <button onClick={() => setIsPerspectiveModalOpen(false)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                <XIcon className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        <div className="p-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
                            {perspectiveOptions.map(opt => (
                                <button
                                    key={opt.role}
                                    onClick={() => {
                                        onLoginAsAdmin(selectedTenantForPerspective.id, opt.role as Role);
                                        setIsPerspectiveModalOpen(false);
                                    }}
                                    className={`flex flex-col items-center text-center gap-3 p-4 rounded-2xl border-2 border-transparent transition-all group hover:border-indigo-500 hover:shadow-lg ${opt.color}`}
                                >
                                    <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm transition-transform group-hover:scale-110">
                                        {React.cloneElement(opt.icon as any, { className: 'w-5 h-5' })}
                                    </div>
                                    <span className="font-bold text-[10px] uppercase tracking-tight leading-tight">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 text-center">
                            <p className="text-xs text-slate-400 font-medium">Selecting a perspective will instantly launch that module's view for this institution.</p>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Password Reset Confirmation Modal ── */}
            {resettingPasswordFor && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setResettingPasswordFor(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-red-50/50 dark:bg-red-900/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl text-red-600">
                                    <LockClosedIcon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-red-900 dark:text-red-200">Reset Admin Password</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{resettingPasswordFor.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setResettingPasswordFor(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/50">
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    You are about to reset the primary administrator's password. A new random password will be generated and sent via **SMS** and **Email** to the tenant.
                                </p>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                This action is irreversible and will lock the user out of their current session until they use the new credentials.
                            </p>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setResettingPasswordFor(null)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button
                                disabled={isResettingPassword}
                                onClick={() => handleResetTenantPassword(resettingPasswordFor)}
                                className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 dark:shadow-none transition-all active:scale-95 flex items-center gap-2"
                            >
                                {isResettingPassword ? (
                                    <>
                                        <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                        Resetting…
                                    </>
                                ) : (
                                    'Reset Password Now'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {isShowcaseItemModalOpen && editingShowcaseItem && (
                <div className="fixed inset-0 bg-slate-900/60 z-[400] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsShowcaseItemModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-500 rounded-xl">
                                    <SparklesIcon className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tight text-emerald-900 dark:text-emerald-200">Showcase Item</h3>
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Dynamic Marketing Content</p>
                                </div>
                            </div>
                            <button onClick={() => setIsShowcaseItemModalOpen(false)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-8 space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Title</label>
                                <input 
                                    type="text" 
                                    value={editingShowcaseItem.title}
                                    onChange={(e) => setEditingShowcaseItem({ ...editingShowcaseItem, title: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl h-12 px-4 text-xs font-medium focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                    placeholder="e.g. Smart Agriculture"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Description</label>
                                <textarea 
                                    value={editingShowcaseItem.description}
                                    onChange={(e) => setEditingShowcaseItem({ ...editingShowcaseItem, description: e.target.value })}
                                    className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-xs font-medium focus:ring-2 focus:ring-emerald-500 shadow-sm min-h-[80px]"
                                    placeholder="Briefly describe what this module does..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Category (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={editingShowcaseItem.category || ''}
                                        onChange={(e) => setEditingShowcaseItem({ ...editingShowcaseItem, category: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl h-11 px-4 text-xs font-medium focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                        placeholder="e.g. Coop"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Action Link (Optional)</label>
                                    <input 
                                        type="text" 
                                        value={editingShowcaseItem.link || ''}
                                        onChange={(e) => setEditingShowcaseItem({ ...editingShowcaseItem, link: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl h-11 px-4 text-xs font-medium focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                        placeholder="e.g. /marketplace"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Item Image (cPanel Storage)</label>
                                <div className="flex flex-col gap-3">
                                    {editingShowcaseItem.imageUrl && (
                                        <div className="w-full h-32 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 group relative">
                                            <img src={editingShowcaseItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => setEditingShowcaseItem({ ...editingShowcaseItem, imageUrl: '' })}
                                                className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                            >
                                                <XIcon className="w-6 h-6" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="text" 
                                            value={editingShowcaseItem.imageUrl}
                                            onChange={(e) => setEditingShowcaseItem({ ...editingShowcaseItem, imageUrl: e.target.value })}
                                            className="flex-1 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 rounded-2xl h-11 px-4 text-[10px] font-medium focus:ring-2 focus:ring-emerald-500 shadow-sm"
                                            placeholder="Paste URL or upload..."
                                        />
                                        <div className="relative">
                                            <input 
                                                type="file" 
                                                id="showcase-img-upload-modal" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;
                                                    if (!localCompanyInfo.showcaseConfig?.cpanelUploadUrl) return alert("Please configure the cPanel Bridge URL first in your showcase settings.");
                                                    
                                                    setIsUploadingShowcaseImage(true);
                                                    const publicUrl = await apiService.uploadToShowcaseCpanel(
                                                        file, 
                                                        localCompanyInfo.showcaseConfig.cpanelUploadUrl, 
                                                        localCompanyInfo.showcaseConfig.cpanelSecret || ''
                                                    );
                                                    setIsUploadingShowcaseImage(false);
                                                    
                                                    if (publicUrl) {
                                                        setEditingShowcaseItem({ ...editingShowcaseItem, imageUrl: publicUrl });
                                                    }
                                                }}
                                            />
                                            <label 
                                                htmlFor="showcase-img-upload-modal"
                                                className={`flex items-center justify-center px-4 h-11 rounded-2xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all ${isUploadingShowcaseImage ? 'bg-slate-200 text-slate-400' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                                            >
                                                <ArrowUpTrayIcon className={`w-4 h-4 mr-2 ${isUploadingShowcaseImage ? 'animate-bounce' : ''}`} />
                                                {isUploadingShowcaseImage ? 'Uploading…' : 'Upload'}
                                            </label>
                                        </div>
                                    </div>
                                    <p className="text-[9px] text-slate-400 font-medium px-1 italic">The image will be stored on your cPanel server if configurations are correct.</p>
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3">
                            <button onClick={() => setIsShowcaseItemModalOpen(false)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button 
                                onClick={() => handleSaveShowcaseItem(editingShowcaseItem)}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-100/50 dark:shadow-none transition-all"
                            >
                                Confirm Item
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
