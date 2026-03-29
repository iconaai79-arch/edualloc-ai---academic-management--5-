
import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import type {
    User, Department, Subject, Building, Room, AllocationRequest,
    TimetableEntry, SmsConfig, EmailConfig, LetterheadConfig, TransportVehicle, TransportOnboarding, VehicleLog,
    TimetableSettings, Course, AcademicYear, Semester, RequestStatus,
    Institution, Priority, CompanyDetails, MpesaTransaction,
    ExamTimetableSettings, AcademicLevel, StudentAttendance,
    Assessment, AssessmentMark, TimeOffRequest, StudentAbsenceRequest,
    EnrollmentRequest, AbsenceRequest, LecturerContract,
    ExamTimetableEntry, Conflict, UserTask, ExtensionRequest,
    ActivityLog, VoteHead, FeeStructure, FinancialPeriod,
    InvoiceItem, TransactionStatus, FeedbackSubmission, LessonRating, Invoice, Receipt, Unavailability,
    BiometricConfig, TimeOffRequestStatus, StudentAbsenceRequestStatus, SecurityAlert, Visitor, Requisition, Role,
    Submission, UserUpdateData, County, Assignment, RetailExpense, RetailStore, RetailInventoryItem, Supplier,
    CoopFarmer, CoopCollection, CoopRider, CoopAgrovetInventory, CoopAgrovetSales, SaccoAccount, SaccoTransaction, CoopMonthlyPayout, CoopExpense, CoopIncome
} from '../types';
const UserManager = lazy(() => import('./UserManager').then(m => ({ default: m.UserManager })));
const TimetableGenerator = lazy(() => import('./TimetableGenerator').then(m => ({ default: m.TimetableGenerator })));
const SettingsManager = lazy(() => import('./SettingsManager').then(m => ({ default: m.SettingsManager })));
const SubjectManager = lazy(() => import('./SubjectManager').then(m => ({ default: m.SubjectManager })));
const CourseManager = lazy(() => import('./CourseManager').then(m => ({ default: m.CourseManager })));
const InteractionsManager = lazy(() => import('./InteractionsManager').then(m => ({ default: m.InteractionsManager })));
const CommunicationsManager = lazy(() => import('./CommunicationsManager').then(m => ({ default: m.CommunicationsManager })));
const ReportsDashboard = lazy(() => import('./ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
const StudentLeaveOutManager = lazy(() => import('./StudentLeaveOutManager').then(m => ({ default: m.StudentLeaveOutManager })));
const SubscriptionManager = lazy(() => import('./SubscriptionManager').then(m => ({ default: m.SubscriptionManager })));
const RetailManager = lazy(() => import('./retail/RetailManager').then(m => ({ default: m.RetailManager })));
const ProcurementManager = lazy(() => import('./ProcurementManager').then(m => ({ default: m.ProcurementManager })));
const CooperativeManager = lazy(() => import('./coop/CooperativeManager').then(m => ({ default: m.CooperativeManager })));
const CarServiceView = lazy(() => import('./carservice/CarServiceView').then(m => ({ default: m.CarServiceView })));
const ChurchDashboard = lazy(() => import('./church/ChurchDashboard').then(m => ({ default: m.ChurchDashboard })));

import { ModuleAccessGuard } from './ModuleAccessGuard';
import { ChurchDenominationProvider } from './church/ChurchDenominationProvider';

import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { EyeIcon } from './icons/EyeIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { UserIcon } from './icons/UserIcon';
import { XIcon } from './icons/XIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { PlusIcon } from './icons/PlusIcon';
import { BedIcon } from './icons/BedIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { HomeIcon } from './icons/HomeIcon';
import { TruckIcon } from './icons/TruckIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { MagnifyingGlassIcon as SearchIcon } from './icons/MagnifyingGlassIcon';
import { StoreIcon } from './icons/StoreIcon';
import { ShoppingBagIcon } from './icons/ShoppingBagIcon';

const DirectAssignModal = lazy(() => import('./DirectAssignModal').then(m => ({ default: m.DirectAssignModal })));
const AcademicYearManager = lazy(() => import('./AcademicYearManager').then(m => ({ default: m.AcademicYearManager })));
const TimetablesView = lazy(() => import('./TimetablesView').then(m => ({ default: m.TimetablesView })));
import { INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS, RETAIL_SUBTYPES, VALID_STAFF_ROLES } from '../constants';
const EditInstitutionModal = lazy(() => import('./EditInstitutionModal').then(m => ({ default: m.EditInstitutionModal })));
const TimetableWizard = lazy(() => import('./TimetableWizard').then(m => ({ default: m.TimetableWizard })));
const TransportManager = lazy(() => import('./TransportManager').then(m => ({ default: m.TransportManager })));
import { apiService } from '../services/apiService';
const RetailReportsDashboard = lazy(() => import('./retail/RetailReportsDashboard').then(m => ({ default: m.RetailReportsDashboard })));
const ExternalModuleView = lazy(() => import('./ExternalModuleView').then(m => ({ default: m.ExternalModuleView })));

export interface AdminViewProps {
    currentUser: User;
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
    timetable?: TimetableEntry[];
    finalTimetableUrl: string | null;
    letterheadConfig: LetterheadConfig;
    smsConfig: SmsConfig;
    emailConfig: EmailConfig;
    timetableConflicts: Conflict[];
    currentInstitution?: Institution | null;
    counties: County[];

    onAddUser: (userData: any) => Promise<void>;
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
    onMoveTimetableEntry?: (entryId: string, newDay: string, newStartTime: string) => void;
    onSaveExamTimetableSettings?: (settings: ExamTimetableSettings) => void;
    onUpdateLogo?: (logo: string | null) => void;
    onUpdateThemeColor?: (color: string) => void;
    onUpdateInstitution?: (id: string, data: any) => Promise<void>;
    onAddTask?: (data: any) => void;
    onUpdateTask?: (id: string, complete: boolean) => void;
    onDeleteTask?: (id: string) => void;
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    isGeneratingDemoData?: boolean;
    demoDataGenerationProgress?: number;
    demoDataGenerationMessage?: string;
    onAddTransaction?: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onAddExtensionRequest?: (reason: string) => void;
    onSendBulkCredentials?: (users: User[], method: 'email' | 'sms') => Promise<{ success_count: number; fail_count: number }>;
    onSendSms?: (r: string, m: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
    onSaveSmsConfig?: (config: SmsConfig) => void;
    onUpdateRequest: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    onWithdrawRequest?: (id: string) => Promise<void>;
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
    onUpdateExtensionRequestStatus?: (requestId: string, status: 'approved' | 'rejected', extensionDays?: number) => void;
    onSaveBiometricConfig?: (config: BiometricConfig) => void;
    onUpdateVoteHeads?: (heads: VoteHead[]) => void;
    onUpdateFeeStructures?: (structures: FeeStructure[]) => void;
    onUpdateFinancialPeriods?: (periods: FinancialPeriod[]) => void;
    onAddBuilding?: (name: string) => Promise<boolean>;
    onAddBuildings?: (buildings: Omit<Building, 'id' | 'institutionId'>[]) => Promise<void>;
    onUpdateBuilding?: (id: string, data: any) => void;
    onDeleteBuilding?: (id: string) => void;
    timeOffRequests: TimeOffRequest[];
    onAddTimeOffRequest?: (userId: string, data: any) => Promise<void>;
    onUpdateTimeOffRequestStatus?: (id: string, status: TimeOffRequestStatus) => void;

    // Agricultural / Coop Props
    coopFarmers: CoopFarmer[];
    coopCollections: CoopCollection[];
    coopRiders: CoopRider[];
    coopAgrovetInventory: CoopAgrovetInventory[];
    coopAgrovetSales: CoopAgrovetSales[];
    saccoAccounts: SaccoAccount[];
    saccoTransactions: SaccoTransaction[];
    coopPayouts: CoopMonthlyPayout[];
    coopExpenses: CoopExpense[];
    coopIncome: CoopIncome[];

    onAddFarmer: (data: any) => Promise<void>;
    onUpdateFarmer?: (id: string, data: any) => Promise<void>;
    onImportFarmers?: (data: any[]) => Promise<void>;
    onLogCollection: (data: any) => Promise<void>;
    onImportCollections?: (data: any[]) => Promise<void>;
    onBulkConfirmCollections?: (riderId: string, collections: any[]) => Promise<void>;
    onAddRider: (data: any) => Promise<void>;
    onConfirmCollection: (id: string, qty: number) => Promise<void>;
    onApproveCollection: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onAddCoopExpense?: (data: Partial<CoopExpense>) => Promise<void>;
    onAddCoopIncome?: (data: Partial<CoopIncome>) => Promise<void>;
    onAddCoopAgrovetInventory?: (data: Partial<CoopAgrovetInventory>) => Promise<void>;
    onAddCoopAgrovetSale?: (data: Partial<CoopAgrovetSales>) => Promise<void>;
    onInitiatePayouts?: (payoutIds: string[]) => Promise<void>;
    onApprovePayouts?: (payoutIds: string[]) => Promise<void>;
    onAddPayouts?: (payouts: any[]) => Promise<void>;
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
    onRefreshData?: () => void;
    vehicles?: TransportVehicle[];
    transportOnboarding?: TransportOnboarding[];
    vehicleLogs?: VehicleLog[];
    onAddVehicle?: (vehicle: Omit<TransportVehicle, 'id'>) => Promise<void>;
    onUpdateVehicle?: (id: string, updates: Partial<TransportVehicle>) => Promise<void>;
    onDeleteVehicle?: (id: string) => Promise<void>;
    onLogGateAction?: (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => Promise<void>;
    onOnboardStudent?: (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => Promise<void>;
    onOffboardStudent?: (recordId: string, lat?: number, lng?: number) => Promise<void>;
    onConfirmReceipt?: (recordId: string) => Promise<void>;
    retailExpenses?: RetailExpense[];
    onAddRetailExpense?: (expense: Omit<RetailExpense, 'id' | 'institutionId' | 'date' | 'recordedById'>) => Promise<void>;
    onAddRequisition?: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
    onUpdateRequisition?: (reqId: string, data: Partial<Requisition>) => Promise<void>;
    onLogAction?: (action: string) => Promise<void>;
    retailStores?: RetailStore[];
    inventory?: RetailInventoryItem[];
    suppliers?: Supplier[];
    activeRole?: Role;
    onActivateModuleTrial?: (moduleId: string) => Promise<void>;
}

export const AdminView: React.FC<AdminViewProps> = (props: AdminViewProps) => {
    const { activeAcademicYear, activeSemester, requests = [] } = props;
    const { subjects, users, rooms, courses, currentInstitution, companyDetails, courseSizes, retailStores = [], inventory = [], suppliers = [], retailExpenses = [] } = props;
    const { 
        coopFarmers = [], coopCollections = [], coopRiders = [], 
        coopAgrovetInventory = [], coopAgrovetSales = [], 
        saccoAccounts = [], saccoTransactions = [], coopPayouts = [],
        coopExpenses = [], coopIncome = [],
        onActivateModuleTrial
    } = props;
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };


    const [activeTab, setActiveTab] = useState<'dashboard' | 'timetable' | 'users' | 'customers' | 'courses' | 'leaveout' | 'comms' | 'settings' | 'reports' | 'transport' | 'retail' | 'procurement' | 'external_module' | 'coop' | 'sacco' | 'agrovet' | 'car_service' | 'farmers' | 'collections' | 'riders' | 'payouts' | 'finances' | 'approvals' | 'church'>('dashboard');

    const [timetableSubTab, setTimetableSubTab] = useState<'wizard' | 'scheduler' | 'calendar' | 'subjects' | 'registry'>('wizard');
    const [isDirectAssignOpen, setIsDirectAssignOpen] = useState(false);
    const [requestedSettingsTab, setRequestedSettingsTab] = useState<string | undefined>(undefined);
    const [isPerspectiveModalOpen, setIsPerspectiveModalOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
    const [hasSetDefaultTab, setHasSetDefaultTab] = useState(false);

    const institutionType = props.currentInstitution?.institutionType;
    const businessSubType = props.currentInstitution?.businessSubType;
    const isBusiness = institutionType === 'Business';

    const isEdu = useMemo(() => {
        const type = props.currentInstitution?.institutionType;
        return ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'TVET', 'Kindergarten'].includes(type || '');
    }, [props.currentInstitution]);

    const isSchool = useMemo(() => {
        return props.currentInstitution?.institutionType === 'Primary' || props.currentInstitution?.institutionType === 'Secondary';
    }, [props.currentInstitution]);

    const isRetailAgency = useMemo(() => {
        if (props.currentInstitution?.institutionType === 'Church') return false;
        return RETAIL_SUBTYPES.includes(props.currentInstitution?.businessSubType || '');
    }, [props.currentInstitution]);

    const isChurch = useMemo(() => {
        return props.currentInstitution?.institutionType === 'Church' || props.currentInstitution?.businessSubType === 'Church';
    }, [props.currentInstitution]);

    const isCoop = useMemo(() => {
        const type = props.currentInstitution?.institutionType;
        const subType = props.currentInstitution?.businessSubType?.toLowerCase() || '';
        const name = props.currentInstitution?.name?.toLowerCase() || '';
        const role = props.activeRole || props.currentUser?.role;
        
        const isCoopRole = role === 'cooperative_manager' || role === 'coop_chairman' || role === 'coop_admin';
        const isCoopType = (type as any) === 'Cooperative';
        const hasCoopKeyword = ['coop', 'dairy', 'tea', 'coffee', 'milk', 'agri', 'farm', 'produce', 'sacco', 'agrovet'].some(k => subType.includes(k) || name.includes(k));
        const isCoopTab = ['farmers', 'collections', 'riders', 'payouts', 'finances', 'approvals'].includes(activeTab);
        
        return isCoopType || hasCoopKeyword || isCoopRole || isCoopTab;
    }, [props.currentInstitution, props.activeRole, props.currentUser?.role, activeTab]);

    useEffect(() => {
        if (!hasSetDefaultTab && props.currentUser?.role) {
            const role = props.activeRole || props.currentUser.role;
            if (role === 'cooperative_manager' || role === 'coop_chairman' || role === 'coop_admin' || isCoop) {
                setActiveTab('farmers');
            } else if (role === 'agrovet_admin' || institutionType === 'Agrovet' || businessSubType === 'Agrovet') {
                setActiveTab('agrovet');
            } else if (role === 'sacco_officer' || institutionType === 'SACCO' || businessSubType === 'SACCO') {
                setActiveTab('sacco');
            } else if (role === 'mechanic_admin' || (isBusiness && (businessSubType === 'Car Service' || businessSubType === 'Mechanic'))) {
                setActiveTab('car_service');
            } else if (isChurch || role === 'church_admin') {
                setActiveTab('church');
            }
            setHasSetDefaultTab(true);
        }
    }, [props.currentUser?.role, props.activeRole, hasSetDefaultTab, props.currentInstitution, isChurch]);


    const isModuleActive = useCallback((moduleId: string) => {
        const state = props.currentInstitution?.moduleStates?.find(m => m.moduleId === moduleId);
        if (!state) return false;
        if (state.status === 'active') return true;
        if (state.status === 'trial') {
            const expiry = state.trialEndsAt || (state as any).trial_ends_at;
            return expiry ? new Date(expiry) > new Date() : false;
        }
        return false;
    }, [props.currentInstitution?.moduleStates]);

    const isCoreAdmin = useMemo(() => {
        const role = props.currentUser?.role;
        return ['admin', 'head_teacher', 'super_admin', 'reseller', 'agrovet_admin', 'property_admin', 'carwash_admin', 'retail_agent', 'transport_admin', 'dos', 'deputy', 'hod', 'tto'].includes(role || '');
    }, [props.currentUser?.role]);

    const tabs = useMemo(() => {
        const baseTabs = [
            { id: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
            { id: 'timetable', label: 'Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> },
            { id: 'users', label: 'Members', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
            { id: 'courses', label: isSchool ? 'Grades' : isChurch ? 'Departments' : 'Courses', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> },
            { id: 'leaveout', label: 'Leave Out', icon: <ArchiveBoxIcon className="w-5 h-5 mr-2" /> },
            { id: 'comms', label: 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
            { id: 'retail', label: 'Retail & Agency', icon: <StoreIcon className="w-5 h-5 mr-2" /> },
            { id: 'procurement', label: 'Procurement', icon: <ShoppingBagIcon className="w-5 h-5 mr-2" /> },
            { id: 'coop', label: 'Cooperative', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
            { id: 'car_service', label: 'Car Service', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
            { id: 'customers', label: 'Customers', icon: <UserPlusIcon className="w-5 h-5 mr-2" /> },
            { id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
            { id: 'transport', label: 'Transport', icon: <MapPinIcon className="w-5 h-5 mr-2" /> },
            { id: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
            { id: 'sacco', label: 'SACCO', icon: <CreditCardIcon className="w-5 h-5 mr-2" /> },
            { id: 'agrovet', label: 'Agrovet', icon: <BeakerIcon className="w-5 h-5 mr-2" /> },
            { id: 'church', label: 'Church System', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
            { id: 'external_module', label: 'External', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
        ];

        if (isCoop) {
            return [
                { id: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
                { id: 'farmers', label: 'Farmers', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'agrovet', label: 'Agrovet', icon: <BeakerIcon className="w-5 h-5 mr-2" /> },
                { id: 'sacco', label: 'SACCO', icon: <CreditCardIcon className="w-5 h-5 mr-2" /> },
                { id: 'finances', label: 'Finances', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
                { id: 'approvals', label: 'Approvals', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
                { id: 'comms', label: 'Communication', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
                { id: 'reports', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
                { id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
            ];
        }

        let filteredTabs = baseTabs.filter(tab => {
            const roleToUse = props.activeRole || props.currentUser?.role;

            // Educational tabs
            if (['timetable', 'courses', 'leaveout', 'users'].includes(tab.id)) {
                if (tab.id === 'users' && (isCoop || institutionType === 'SACCO' || institutionType === 'Agrovet')) return true;
                return isEdu;
            }

            // Transport/Logistics
            if (tab.id === 'transport') {
                return isEdu;
            }

            // Retail & Procurement tabs
            if (['retail', 'procurement'].includes(tab.id)) {
                if (isEdu || isChurch) return false;
                if (isBusiness) {
                    return RETAIL_SUBTYPES.includes(businessSubType || '');
                }
                return true;
            }

            // Customer Tab
            if (tab.id === 'customers') {
                return isRetailAgency;
            }

            // Broadcaster tab
            if (tab.id === 'comms') {
                if (roleToUse === 'super_admin') return true;
                if (institutionType === 'Broadcaster') return true;
                return ['admin', 'head_teacher', 'deputy', 'dos', 'tto', 'retail_agent'].includes(roleToUse || '');
            }

            if (tab.id === 'external_module') {
                return roleToUse === 'super_admin';
            }

            // Specialized modules
            if (tab.id === 'coop') return false; // Handled by specialized tabs for Coop
            if (tab.id === 'sacco') return institutionType === 'SACCO' || businessSubType === 'SACCO';
            if (tab.id === 'agrovet') return institutionType === 'Agrovet' || businessSubType === 'Agrovet';
            if (tab.id === 'car_service') return isBusiness && (businessSubType === 'Car Service' || businessSubType === 'Mechanic');
            if (tab.id === 'church') return isChurch;

            return true;
        });

        return filteredTabs;
    }, [props.currentUser?.role, props.activeRole, props.currentInstitution, isSchool, isEdu, isBusiness, businessSubType, institutionType, isRetailAgency]);

    const stats = useMemo(() => {
        const pendingCount = (requests || []).filter((r: AllocationRequest) => r && (r.status === 'pending' || r.status === 'hod_approved')).length;
        const changesCount = (requests || []).filter((r: AllocationRequest) => r && r.status === 'change_request_pending').length;
        const deallocCount = (requests || []).filter((r: AllocationRequest) => r && r.status === 'deallocation_pending').length;
        return { pendingCount, changesCount, deallocCount, totalActionable: pendingCount + changesCount + deallocCount };
    }, [requests]);

    const handleQuickAction = (tabId: string, settingsSubTab?: string, tTabSub?: 'scheduler' | 'calendar' | 'subjects' | 'registry') => {
        if (tabId === 'billing') {
            setActiveTab('settings');
            setRequestedSettingsTab('billing');
            return;
        }
        setActiveTab(tabId as any);
        if (settingsSubTab) setRequestedSettingsTab(settingsSubTab);
        if (tTabSub) setTimetableSubTab(tTabSub);
    };

    const perspectiveOptions = [
        { role: 'security', label: 'Security Module', icon: <ShieldIcon className="w-6 h-6" />, color: 'bg-red-50 text-red-600' },
        { role: 'store', label: 'Inventory Module', icon: <ArchiveBoxIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
        { role: 'transport_assistant', label: 'Transport Module', icon: <MapPinIcon className="w-6 h-6" />, color: 'bg-teal-50 text-teal-600' },
        { role: 'boarding_master', label: 'Boarding Module', icon: <BedIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
        { role: 'info_desk', label: 'Info Desk Module', icon: <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />, color: 'bg-sky-50 text-sky-600' },
        { role: 'librarian', label: 'Library Module', icon: <BookOpenIcon className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600' },
        { role: 'parent', label: 'Parent Portal', icon: <UserGroupIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { role: 'student', label: 'Student Portal', icon: <AcademicCapIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'lecturer', label: isSchool ? 'Teacher Portal' : 'Lecturer Portal', icon: <UserIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
        { role: 'agrovet_admin', label: 'Agrovet Module', icon: <BeakerIcon className="w-6 h-6" />, color: 'bg-green-50 text-green-600' },
        { role: 'property_admin', label: 'Property Module', icon: <HomeIcon className="w-6 h-6" />, color: 'bg-cyan-50 text-cyan-600' },
        { role: 'carwash_admin', label: 'Car Wash Module', icon: <SparklesIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-400' },
        { role: 'mechanic_admin', label: 'Car Service Center', icon: <Cog8ToothIcon className="w-6 h-6" />, color: 'bg-zinc-50 text-zinc-600' },
        { role: 'retail_agent', label: 'Agent Module', icon: <UserPlusIcon className="w-6 h-6" />, color: 'bg-orange-50 text-orange-600' },
        { role: 'driver', label: 'Driver Module', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-slate-50 text-slate-600' },
        { role: 'coop_admin', label: 'Cooperative Module', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
        { role: 'sacco_officer', label: 'SACCO Module', icon: <CreditCardIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'agrovet_admin', label: 'Agrovet Module', icon: <BeakerIcon className="w-6 h-6" />, color: 'bg-green-50 text-green-600' },
        { role: 'customer', label: 'Customer Portal', icon: <SearchIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { role: 'church_admin', label: 'Church System', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-700' }
    ].filter(opt => {
        if (isRetailAgency) {
            return ['retail_agent', 'customer'].includes(opt.role);
        }
        if (isEdu) {
            const isSuperAdmin = props.currentUser?.role === 'super_admin';
            const excluded = ['agrovet_admin', 'property_admin', 'carwash_admin', 'mechanic_admin', 'retail_agent', 'driver', 'customer', 'church_admin'];
            if (isSuperAdmin) {
                return !excluded.filter(e => e !== 'church_admin').includes(opt.role);
            }
            return !excluded.includes(opt.role);
        } else {
            // Non-educational: Hide educational portal perspectives
            const filtered = !['parent', 'student', 'lecturer', 'librarian', 'boarding_master', 'transport_assistant', 'retail_agent', 'driver', 'customer'].includes(opt.role);
            
            // Further restrict church_admin to only Church institutions
            if (opt.role === 'church_admin') {
                const isSuperAdmin = props.currentUser?.role === 'super_admin';
                return (isChurch || isSuperAdmin) && filtered;
            }
            
            return filtered;
        }
    });


    return (
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
            <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar no-print bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-2">
                {tabs.map((tab: { id: string, label: string, icon: React.ReactNode }) => (
                    <button
                        key={tab.id}
                        onClick={() => {
                            setActiveTab(tab.id as any);
                            if (tab.id !== 'settings') setRequestedSettingsTab(undefined);
                        }}
                        className={`flex items-center gap-2 py-4 px-6 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                        {tab.id === 'timetable' && stats.totalActionable > 0 && (
                            <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse ml-1">
                                {stats.totalActionable}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            <main className="animate-fade-in">
                <Suspense fallback={
                    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-slate-800/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700 animate-pulse">
                        <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Synchronizing Perspective Hub...</p>
                    </div>
                }>
                {activeTab === 'dashboard' && !isCoop && (
                    <div className="space-y-6">
                        {isEdu && stats.totalActionable > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 p-6 rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
                                <div className="flex items-center gap-4 text-center sm:text-left">
                                    <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-2xl">
                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-amber-800 dark:text-amber-200 uppercase tracking-tight">Pending Registry Actions</h4>
                                        <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">There are {stats.totalActionable} allocation requests awaiting your final authorization.</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleQuickAction('interactions')}
                                    className="bg-amber-600 hover:bg-amber-700 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-xl transition-all shadow-lg active:scale-95"
                                >
                                    Review Now
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{isEdu ? 'Active Faculty' : isChurch ? 'Active Workers' : 'Active Staff'}</h3>
                                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {(props.users || []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin' && u.role !== 'member' && u.role !== 'church_member').length}
                                </p>
                            </div>
                            {(isEdu || isChurch) && (
                                <>
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{isEdu ? 'Registry Load' : 'Ministerial Registry'}</h3>
                                        <p className="text-4xl font-black text-indigo-600 tracking-tighter">{(props.allocations || []).length}</p>
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                        <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{isEdu ? 'Total Students' : 'Total Congregation'}</h3>
                                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                            {(props.users || []).filter(u => u && (u.role === 'student' || u.role === 'member' || u.role === 'church_member' || u.role === 'visitor')).length}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <h3 className="text-xl font-black tracking-tighter uppercase mb-6 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                Operational Hub
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                {isEdu && (
                                    <button
                                        onClick={() => handleQuickAction('timetable', 'wizard')}
                                        className="flex flex-col items-start p-6 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all group text-left hover:-translate-y-1"
                                    >
                                        <div className="p-3 bg-white/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                            <BeakerIcon className="w-6 h-6" />
                                        </div>
                                        <span className="font-black text-sm uppercase tracking-tight">Timetable Wizard</span>
                                        <p className="text-[10px] opacity-80 uppercase mt-1">Guided Generation</p>
                                    </button>
                                )}
                                {isCoreAdmin && (
                                    <button
                                        onClick={() => setIsPerspectiveModalOpen(true)}
                                        className="flex flex-col items-start p-6 bg-amber-50 dark:bg-amber-900/30 rounded-3xl border border-amber-100 dark:border-amber-800 hover:border-amber-400 transition-all group text-left"
                                    >
                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                                            <EyeIcon className="w-6 h-6" />
                                        </div>
                                        <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Switch Perspective</span>
                                        <p className="text-[10px] text-slate-400 uppercase mt-1">View module accounts</p>
                                    </button>
                                )}
                                    <button
                                        onClick={() => handleQuickAction('users')}
                                        className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition-all group text-left"
                                    >
                                        <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                            <UserGroupIcon className="w-6 h-6" />
                                        </div>
                                        <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">{isChurch ? 'Workers Hub' : 'Staff Hub'}</span>
                                    </button>
                                {isEdu && (
                                    <>
                                        <button
                                            onClick={() => handleQuickAction('timetable', undefined, 'calendar')}
                                            className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition-all group text-left"
                                        >
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                                <CalendarDaysIcon className="w-6 h-6" />
                                            </div>
                                            <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">{isSchool ? 'School Calendar' : isChurch ? 'Liturgical Calendar' : 'Academic Calendar'}</span>
                                        </button>
                                        <button
                                            onClick={() => handleQuickAction('timetable', undefined, 'subjects')}
                                            className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition-all group text-left"
                                        >
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                                                <BookOpenIcon className="w-6 h-6" />
                                            </div>
                                            <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">{isChurch ? 'Ministries' : 'Subjects'}</span>
                                        </button>
                                    </>
                                )}
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
                                {(props.activityLog || []).slice(0, 5).map(log => (
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

                {activeTab === 'timetable' && (
                    <div className="space-y-6">
                        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl w-fit">
                            <button onClick={() => setTimetableSubTab('wizard')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timetableSubTab === 'wizard' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Wizard</button>
                            <button onClick={() => setTimetableSubTab('scheduler')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timetableSubTab === 'scheduler' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Lesson Scheduler</button>
                            <button onClick={() => setTimetableSubTab('calendar')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timetableSubTab === 'calendar' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Academic Calendar</button>
                            <button onClick={() => setTimetableSubTab('subjects')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timetableSubTab === 'subjects' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Subject Registry</button>
                            <button onClick={() => setTimetableSubTab('registry')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${timetableSubTab === 'registry' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>
                                Registry
                                {stats.totalActionable > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse ml-1">
                                        {stats.totalActionable}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="animate-fade-in-up">
                            {timetableSubTab === 'wizard' ? (
                                <TimetableWizard
                                    isInline={true}
                                    allocations={(requests || []).filter(r => r.status === 'approved')}
                                    subjects={subjects}
                                    lecturers={users.filter(u => u.role === 'lecturer' || u.role === 'teacher')}
                                    rooms={rooms}
                                    courses={courses}
                                    timetableSettings={props.timetableSettings}
                                    activeAcademicYear={activeAcademicYear}
                                    activeSemester={activeSemester}
                                    currentInstitution={currentInstitution}
                                    courseSizes={courseSizes}
                                    timeOffRequests={props.timeOffRequests || []}
                                    onTimetableGenerated={props.onTimetableGenerated}
                                    onLogAction={props.onLogAction}
                                    onNavigateToSettings={(tab) => {
                                        if (tab === 'calendar') {
                                            setTimetableSubTab('calendar');
                                        } else {
                                            setActiveTab('settings');
                                            if (tab) setRequestedSettingsTab(tab);
                                        }
                                    }}
                                />
                            ) : timetableSubTab === 'calendar' ? (
                                <AcademicYearManager
                                    academicYears={props.academicYears || []}
                                    semesters={props.semesters || []}
                                    onAddAcademicYear={props.onAddAcademicYear}
                                    onUpdateAcademicYear={props.onUpdateAcademicYear}
                                    onDeleteAcademicYear={props.onDeleteAcademicYear}
                                    onAddSemester={props.onAddSemester}
                                    onUpdateSemester={props.onUpdateSemester}
                                    onDeleteSemester={props.onDeleteSemester}
                                    currentInstitution={props.currentInstitution}
                                />
                            ) : timetableSubTab === 'scheduler' ? (
                                <TimetablesView
                                    generatedTimetable={props.timetable || props.generatedTimetable || []}
                                    subjects={props.subjects || []}
                                    lecturers={props.users?.filter(u => u.role === 'lecturer' || u.role === 'teacher') || []}
                                    allUsers={props.users || []}
                                    rooms={props.rooms || []}
                                    courses={props.courses || []}
                                    departments={props.departments || []}
                                    buildings={props.buildings || []}
                                    allocations={(props.requests || []).filter((r: AllocationRequest) => r && (r.status === 'approved' || r.status === 'hod_approved'))}
                                    getSubjectById={props.getSubjectById || ((id: string) => props.subjects?.find(s => s.id === id))}
                                    getLecturerById={props.getLecturerById || ((id: string) => props.users?.find(u => u.id === id))}
                                    getRoomById={props.getRoomById || ((id: string) => props.rooms?.find(r => r.id === id))}
                                    letterheadConfig={props.letterheadConfig || { institutionName: '', institutionAddress: '', institutionPhone: '', institutionEmail: '', institutionWebsite: '', headerText: '', footerText: '' }}
                                    logoUrl={props.logoUrl || null}
                                    footerImageUrl={props.footerImageUrl || null}
                                    currentUser={props.currentUser}
                                    timetableSettings={props.timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                                    onSaveTimetableSettings={props.onSaveTimetableSettings || (() => { })}
                                    academicYears={props.academicYears || []}
                                    activeSemester={activeSemester}
                                    currentInstitution={props.currentInstitution}
                                    onMoveTimetableEntry={props.onMoveTimetableEntry}
                                    onLogAction={props.onLogAction}
                                />
                            ) : timetableSubTab === 'subjects' ? (
                                <SubjectManager
                                    {...props}
                                    onAddSubject={props.onAddSubject}
                                    onUpdateSubject={props.onUpdateSubject}
                                    onDeleteSubject={props.onDeleteSubject}
                                    onEditSubject={props.onEditSubject}
                                    onSaveTimetableSettings={props.onSaveTimetableSettings!}
                                    onUpdateCourse={props.onUpdateCourse}
                                    onImportSubjectsAndAssociate={props.onImportSubjectsAndAssociate}
                                    currentUser={props.currentUser}
                                />
                            ) : timetableSubTab === 'registry' ? (
                                <InteractionsManager
                                    {...props}
                                    enrollmentRequests={props.enrollmentRequests || []}
                                    onOpenDirectAssign={() => setIsDirectAssignOpen(true)}
                                    onUpdateRequestStatus={props.onUpdateRequestStatus}
                                    onBulkUpdateRequestStatus={props.onBulkUpdateRequestStatus}
                                    getLecturerById={props.getLecturerById || ((id) => (props.users || []).find(u => u && u.id === id))}
                                    getSubjectById={props.getSubjectById || ((id) => (props.subjects || []).find(s => s && s.id === id))}
                                    allocations={props.allocations || []}
                                />
                            ) : (
                                <TimetableGenerator
                                    {...props}
                                    allocations={(props.requests || []).filter((r: AllocationRequest) => r && (r.status === 'approved' || r.status === 'hod_approved'))}
                                    lecturers={props.users || []}
                                    setActiveTab={(tab: string) => setActiveTab(tab as any)}
                                    onSaveTimetableSettings={props.onSaveTimetableSettings}
                                    onTimetableGenerated={props.onTimetableGenerated}
                                    getLecturerById={props.getLecturerById || (id => (props.users || []).find(u => u && u.id === id))}
                                    getSubjectById={props.getSubjectById || (id => (props.subjects || []).find(s => s && s.id === id))}
                                    getRoomById={props.getRoomById || (id => (props.rooms || []).find(r => r && r.id === id))}
                                />
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'users' && (
                    <UserManager
                        {...props}
                        user={props.currentUser}
                        showOnly="staff"
                        allocations={(props.requests || []).filter(r => r && r.status === 'approved')}
                        onImportUsers={props.onImportUsers}
                        onImportStudents={props.onImportStudents}
                        onEditUser={props.onEditUser}
                        onDeleteUser={props.onDeleteUser}
                        onAddUser={props.onAddUser}
                        onAddTimeOffRequest={props.onAddTimeOffRequest}
                        onAddTransaction={props.onAddTransaction}
                        onSendSms={props.onSendSms}
                        companyDetails={props.companyDetails}
                        currentInstitution={props.currentInstitution}
                    />
                )}

                {activeTab === 'customers' && (
                    <UserManager
                        {...props}
                        user={props.currentUser}
                        showOnly="customer"
                        onImportUsers={props.onImportUsers}
                        onImportStudents={props.onImportStudents}
                        onEditUser={props.onEditUser}
                        onDeleteUser={props.onDeleteUser}
                        onAddUser={props.onAddUser}
                        onSendSms={props.onSendSms}
                        companyDetails={props.companyDetails}
                        currentInstitution={props.currentInstitution}
                        isRetailAgency={isRetailAgency}
                    />
                )}

                {activeTab === 'courses' && (
                    <CourseManager
                        {...props}
                        courses={props.courses || []}
                        onAddCourse={props.onAddCourse}
                        onImportCourses={props.onImportCourses}
                        onUpdateCourse={props.onUpdateCourse}
                        onDeleteCourse={props.onDeleteCourse}
                        allocations={props.allocations || []}
                        allTimetableEntries={props.allTimetableEntries || []}
                        currentUser={props.currentUser}
                        timetableSettings={props.timetableSettings}
                        onSaveTimetableSettings={props.onSaveTimetableSettings}
                    />
                )}

                {activeTab === 'comms' && (
                    <CommunicationsManager
                        {...props}
                        onSendSms={props.onSendSms || (async () => ({ success: false, message: 'SMS service disabled' }))}
                        currentUser={props.currentUser}
                        smsBalance={props.currentInstitution?.smsBalance}
                        currentInstitution={props.currentInstitution}
                        mpesaConfig={props.companyDetails.mpesaConfig}
                        smsConfig={props.smsConfig}
                        onRefreshData={props.onRefreshData}
                        moduleContext={isCoop ? 'cooperative' : (isRetailAgency ? 'agrovet' : 'school')}
                    />
                )}

                {activeTab === 'transport' && (
                    <TransportManager
                        currentInstitution={props.currentInstitution!}
                        vehicles={props.vehicles || []}
                        users={props.users || []}
                        onAddVehicle={props.onAddVehicle!}
                        onUpdateVehicle={props.onUpdateVehicle!}
                        onDeleteVehicle={props.onDeleteVehicle!}
                        onAddUser={props.onAddUser}
                        onEditUser={props.onEditUser}
                    />
                )}

                {activeTab === 'retail' && (
                    <ModuleAccessGuard
                        moduleId="school_store"
                        moduleName="School Store & Inventory"
                        description="Manage your school's inventory, sales, and retail operations with a premium store module."
                        institution={props.currentInstitution}
                        onActivateTrial={onActivateModuleTrial}
                    >
                        <RetailManager
                            institutionId={props.currentInstitution?.id || ''}
                            businessSubType={props.currentInstitution?.businessSubType}
                            currentUser={props.currentUser}
                            retailStores={retailStores}
                            inventory={inventory}
                            retailExpenses={retailExpenses}
                            onAddRetailExpense={props.onAddRetailExpense}
                            requisitions={props.requisitions}
                            onAddRequisition={props.onAddRequisition}
                            onUpdateRequisition={props.onUpdateRequisition}
                        />
                    </ModuleAccessGuard>
                )}

                {(() => {
                    const coopTabMap: Record<string, string> = {
                        'dashboard': 'overview',
                        'farmers': 'farmers',
                        'collections': 'collections',
                        'riders': 'logistics',
                        'agrovet': 'agrovet',
                        'sacco': 'sacco',
                        'payouts': 'payouts',
                        'finances': 'finances',
                        'approvals': 'approvals',
                        'reports': 'reports',
                        'settings': 'settings',
                        'coop': 'farmers'
                    };

                    const isCoopTab = isCoop && activeTab in coopTabMap;
                    
                    if (isCoopTab || activeTab === 'coop') {
                        return (
                            <CooperativeManager
                                farmers={coopFarmers}
                                collections={coopCollections}
                                riders={coopRiders}
                                currentUser={props.currentUser}
                                currentInstitution={props.currentInstitution}
                                inventory={coopAgrovetInventory}
                                sales={coopAgrovetSales}
                                saccoAccounts={saccoAccounts}
                                payouts={coopPayouts}
                                expenses={coopExpenses}
                                income={coopIncome}
                                onAddFarmer={props.onAddFarmer || (async () => { })}
                                onUpdateFarmer={props.onUpdateFarmer || (async () => { })}
                                onImportFarmers={props.onImportFarmers || (async () => { })}
                                onLogCollection={props.onLogCollection || (async () => { })}
                                onImportCollections={props.onImportCollections || (async () => { })}
                                onBulkConfirmCollections={props.onBulkConfirmCollections || (async () => { })}
                                onAddRider={props.onAddRider || (async () => { })}
                                onConfirmCollection={props.onConfirmCollection}
                                onApproveCollection={props.onApproveCollection}
                                onAddExpense={props.onAddCoopExpense}
                                onAddIncome={props.onAddCoopIncome}
                                onAddInventory={props.onAddCoopAgrovetInventory}
                                onAddSale={props.onAddCoopAgrovetSale}
                                onLogAction={props.onLogAction}
                                 onInitiatePayouts={props.onInitiatePayouts}
                                onApprovePayouts={props.onApprovePayouts}
                                onAddPayouts={props.onAddPayouts}
                                onUpdateInstitution={props.onUpdateInstitution}
                                onUpdateLogo={props.onUpdateLogo}
                                onUpdateFooterImage={props.onUpdateFooterImage}
                                 onSaveLetterheadConfig={props.onSaveLetterheadConfig}
                                 letterheadConfig={props.letterheadConfig}
                                 logoUrl={props.logoUrl}
                                footerImageUrl={props.footerImageUrl}
                                companyDetails={props.companyDetails}
                                 onUpdateCompanyDetails={props.onUpdateCompanyDetails}
                                 users={props.users || []}
                                 onAddUser={props.onAddUser}
                                 onEditUser={props.onEditUser}
                                 onDeleteUser={props.onDeleteUser}
                                 onImportUsers={props.onImportUsers}
                                 smsConfig={props.smsConfig}
                                 departments={props.departments || []}
                                 subjects={props.subjects || []}
                                 courses={props.courses || []}
                                 onImportStudents={props.onImportStudents}
                                 onWithdrawRequest={props.onWithdrawRequest}
                                 onAddExtensionRequest={props.onAddExtensionRequest}
                                activeTab={coopTabMap[activeTab] as any}
                                onTabChange={(tab) => {
                                    const reverseMap: Record<string, string> = {
                                        'farmers': 'farmers',
                                        'collections': 'collections',
                                        'logistics': 'riders',
                                        'agrovet': 'agrovet',
                                        'sacco': 'sacco',
                                        'payouts': 'payouts',
                                        'finances': 'finances',
                                        'approvals': 'approvals',
                                        'reports': 'reports',
                                        'settings': 'settings'
                                    };
                                    if (reverseMap[tab]) setActiveTab(reverseMap[tab] as any);
                                }}
                            />
                        );
                    }
                    return null;
                })()}

                {activeTab === 'church' && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 min-h-[60vh] flex flex-col items-center justify-center text-center animate-fade-in-up">
                        <SparklesIcon className="w-16 h-16 text-indigo-600 mb-4 animate-pulse" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Church Excellence Hub</h2>
                        <p className="text-slate-500 max-w-md">The unified system for spiritual leadership. Manage tithes/offerings, Small Christian Communities (SCC), liturgical calendars, and member welfare in one secure platform.</p>
                        <div className="mt-8 flex gap-3">
                            <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-[10px] font-black uppercase tracking-widest text-indigo-600">Alms & Payouts</div>
                            <div className="px-6 py-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 text-[10px] font-black uppercase tracking-widest text-indigo-600">Member Registry</div>
                        </div>
                    </div>
                )}

                {activeTab === 'car_service' && (
                    <CarServiceView
                        currentUser={props.currentUser}
                        currentInstitution={props.currentInstitution!}
                        users={props.users || []}
                        onLogAction={props.onLogAction || (async () => { })}
                    />
                )}

                {activeTab === 'sacco' && !isCoop && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 min-h-[60vh] flex flex-col items-center justify-center text-center">
                        <CreditCardIcon className="w-16 h-16 text-indigo-600 mb-4 animate-pulse" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">SACCO Portal</h2>
                        <p className="text-slate-500 max-w-md">Manage farmer savings, process loan applications, and track repayments via automated milk deductions.</p>
                    </div>
                )}

                {activeTab === 'agrovet' && !isCoop && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 min-h-[60vh] flex flex-col items-center justify-center text-center">
                        <BeakerIcon className="w-16 h-16 text-green-600 mb-4 animate-pulse" />
                        <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Agrovet Module</h2>
                        <p className="text-slate-500 max-w-md">Sell inputs on credit and manage inventory. Credit sales will be automatically deducted from monthly farmer payouts.</p>
                    </div>
                )}

                {activeTab === 'settings' && !isCoop && (
                    <SettingsManager
                        {...props}
                        allocations={(props.requests || []).filter(r => r && r.status === 'approved')}
                        initialTab={requestedSettingsTab}
                        currentUser={props.currentUser}
                        onAddBuilding={props.onAddBuilding}
                        onUpdateBuilding={props.onUpdateBuilding}
                        onDeleteBuilding={props.onDeleteBuilding}
                        onAddRoom={props.onAddRoom}
                        onUpdateRoom={props.onUpdateRoom}
                        onDeleteRoom={props.onDeleteRoom}
                        onImportRooms={props.onImportRooms}
                        onAddDepartment={props.onAddDepartment}
                        onUpdateDepartment={props.onUpdateDepartment}
                        onDeleteDepartment={props.onDeleteDepartment}
                        onImportDepartments={props.onImportDepartments}
                        // Explicitly pass academicYears and semesters just in case
                        academicYears={props.academicYears}
                        semesters={props.semesters}
                        onUpdateCompanyDetails={props.onUpdateCompanyDetails}
                        onRefreshData={props.onRefreshData}
                        timetableSettings={props.timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                        examTimetableSettings={props.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                        isCoop={isCoop}
                        onImportStudents={props.onImportStudents}
                        smsConfig={props.smsConfig}
                        onWithdrawRequest={props.onWithdrawRequest}
                        onAddExtensionRequest={props.onAddExtensionRequest}
                    />
                )}

                {activeTab === 'external_module' && (
                    <div className="animate-fade-in-up">
                        <ExternalModuleView
                            title="EduAI Support & Analytics Hub"
                            url="https://support.edualloc.com"
                            description="Access system guides, analytics dashboard and priority support."
                        />
                    </div>
                )}

                {activeTab === 'procurement' && (
                    <ProcurementManager
                        requisitions={props.requisitions || []}
                        onAddRequisition={props.onAddRequisition!}
                        onUpdateRequisition={props.onUpdateRequisition!}
                        inventory={inventory}
                        suppliers={suppliers}
                        retailStores={retailStores}
                        institution={props.currentInstitution!}
                        companyDetails={props.companyDetails}
                    />
                )}

                {activeTab === 'leaveout' && (
                    <StudentLeaveOutManager
                        {...props}
                        currentUser={props.currentUser}
                        currentInstitution={props.currentInstitution!}
                        companyDetails={props.companyDetails}
                        users={props.users}
                        academicYears={props.academicYears}
                        semesters={props.semesters}
                        courses={props.courses}
                        departments={props.departments}
                        onLogAction={props.onLogAction!}
                        onDataChange={() => props.onAddUser && props.onAddUser({})} // Dummy trigger for refresh if needed
                    />
                )}

                {activeTab === 'church' && isChurch && (
                    <div className="animate-fade-in-up">
                        <ChurchDenominationProvider church={props.currentInstitution!}>
                            <ChurchDashboard />
                        </ChurchDenominationProvider>
                    </div>
                )}

                {activeTab === 'reports' && !isCoop && (
                    <div className="animate-fade-in-up">
                        {isRetailAgency ? (
                            <RetailReportsDashboard
                                institutionId={props.currentInstitution?.id || ''}
                                users={props.users || []}
                            />
                        ) : (
                            <ReportsDashboard
                                {...props}
                                lecturers={props.users || []}
                                allTimetableEntries={props.allTimetableEntries || []}
                                getLecturerById={props.getLecturerById || (id => (props.users || []).find(u => u && u.id === id))}
                                getSubjectById={props.getSubjectById || (id => (props.subjects || []).find(s => s && s.id === id))}
                                getRoomById={props.getRoomById || (id => (props.rooms || []).find(r => r && r.id === id))}
                                currentInstitution={props.currentInstitution}
                                requests={requests || []}
                                timetableSettings={props.timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                                activityLog={props.activityLog || []}
                                courseSizes={props.courseSizes}
                            />
                        )}
                    </div>
                )}
                </Suspense>
            </main>

            {isDirectAssignOpen && (
                <DirectAssignModal
                    lecturers={(props.users || []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin')}
                    subjects={props.subjects || []}
                    courses={props.courses || []}
                    onClose={() => setIsDirectAssignOpen(false)}
                    onAssign={props.onDirectAssign || (() => { })}
                    isSchool={isSchool}
                />
            )}

            {isPerspectiveModalOpen && (
                <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsPerspectiveModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
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
                                {perspectiveOptions.map(opt => (
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
                    </div>
                </div>
            )}

            {editingInstitution && (
                <EditInstitutionModal
                    institution={editingInstitution}
                    onClose={() => setEditingInstitution(null)}
                    onSave={async (id, data) => {
                        if (props.onUpdateInstitution) {
                            await props.onUpdateInstitution(id, data);
                        }
                        setEditingInstitution(null);
                    }}
                    defaultPrices={companyDetails.subscriptionConfig}
                    counties={props.counties || []}
                />
            )}
        </div>
    );
};
