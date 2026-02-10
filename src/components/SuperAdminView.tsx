
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type {
    Institution, User, Subject, Department, CompanyDetails, MpesaTransaction,
    Receipt, InvoiceItem, ActivityLog, Course, ExtensionRequest, Semester,
    SmsConfig, AllocationRequest, LetterheadConfig, Priority, Unavailability,
    UserUpdateData, MpesaConfig, SubscriptionConfig, EmailConfig, TransactionStatus,
    Room, Building, AcademicLevel, TimetableSettings, ExamTimetableSettings, RequestStatus, AcademicYear, TimetableEntry, Conflict, TimeOffRequest, TimeOffRequestStatus, EnrollmentRequest, AbsenceRequest, LecturerContract, FeedbackSubmission, LessonRating,
    Invoice, VoteHead, FeeStructure, FinancialPeriod, UserTask, BiometricConfig, StudentAbsenceRequest, StudentAbsenceRequestStatus, SecurityAlert, Visitor, Requisition, StudentAttendance, Assessment, AssessmentMark, ExamTimetableEntry, Role,
    Assignment, Submission, County
} from '../types';
import { TransactionsManager } from './TransactionsManager';
import { DatabaseSettings } from './DatabaseSettings';
import { ActivityLogView } from './ActivityLogView';
import { UserManager } from './UserManager';
import { SubjectManager } from './SubjectManager';
import { CourseManager } from './CourseManager';
import { DepartmentManager } from './DepartmentManager';
import { BuildingManager } from './BuildingManager';
import { SettingsManager } from './SettingsManager';
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
    ChartBarIcon,
    ExclamationTriangleIcon,
    BeakerIcon,
    PlusIcon,
    ArrowRightOnRectangleIcon
} from './icons/index';
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
import { LecturerView } from './LecturerView';
import { StudentView } from './StudentView';
import { AcademicsOfficerView } from './AcademicsOfficerView';
import { AdminView } from './AdminView';
import { ProfileModal } from './ProfileModal';
import { LoginView } from './LoginView';
import { PublicAppointmentView } from './PublicAppointmentView';
import { GuestFeedbackView } from './GuestFeedbackView';
import { ChatBot } from './ChatBot';
import { SuspendedAccountView } from './SuspendedAccountView';
import { MandatoryUpdateView } from './MandatoryUpdateView';
import { TimetableWizard } from './TimetableWizard';
import { CountyManager } from './CountyManager';

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
        footerImageUrl,
        onAddCounty,
        onUpdateCounty,
        onDeleteCounty
    } = props;

    const [activeTab, setActiveTab] = useState<'dashboard' | 'institutions' | 'all_users' | 'academics' | 'communications' | 'settings' | 'migration' | 'user_activity' | 'reports'>('dashboard');
    const [institutionsSubTab, setInstitutionsSubTab] = useState<'list' | 'counties' | 'requests' | 'transactions'>('list'); // Modified for Counties
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
    const [showDocumentPreview, setShowDocumentPreview] = useState(false);


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
        chatEnabled: companyDetails?.chatAssistantConfig?.enabled ?? true
    });

    const [localSmsConfig, setLocalSmsConfig] = useState<SmsConfig>(companyDetails?.smsConfig || { provider: 'ABMIS', apiKey: '', apiSecret: '', fromNumber: '' });
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
                chatEnabled: companyDetails.chatAssistantConfig?.enabled ?? true
            });
            setLocalSmsConfig(companyDetails.smsConfig || { provider: 'ABMIS', apiKey: '', apiSecret: '', fromNumber: '' });
            setLocalEmailConfig(companyDetails.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
            setLocalMpesaConfig(companyDetails.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
            setLocalSubConfig(companyDetails.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });
        }
    }, [companyDetails]);

    const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead' | 'footer') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (type === 'logo') setLocalCompanyInfo((prev: any) => ({ ...prev, logoUrl: dataUrl }));
            if (type === 'letterhead') {
                setLocalCompanyInfo((prev: any) => ({
                    ...prev,
                    letterheadConfig: { ...prev.letterheadConfig, headerImageUrl: dataUrl }
                }));
            }
            if (type === 'footer') setLocalCompanyInfo((prev: any) => ({ ...prev, footerImageUrl: dataUrl }));
        };
        reader.readAsDataURL(file);
    };

    const handleSaveGlobalConfigs = async () => {
        setIsSavingConfigs(true);
        try {
            if (onUpdateCompanyDetails) {
                await onUpdateCompanyDetails({
                    ...companyDetails,
                    ...localCompanyInfo,
                    smsConfig: localSmsConfig,
                    emailConfig: localEmailConfig,
                    mpesaConfig: localMpesaConfig,
                    subscriptionConfig: localSubConfig,
                    chatAssistantConfig: {
                        ...companyDetails?.chatAssistantConfig,
                        welcomeMessage: localCompanyInfo.welcomeMessage,
                        enabled: localCompanyInfo.chatEnabled
                    }
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
            const res = await apiService.sendSms(testRecipient, "Test message from EduAi Academic Management System.", localSmsConfig);
            if (res.success) alert("SMS test initiated successfully.");
            else alert(`SMS Failed: ${res.message || 'Check credentials'}`);
        } catch (e) {
            alert("SMS Gateway connection error.");
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestEmail = async () => {
        if (!testRecipient || !testRecipient.includes('@')) return alert("Enter a valid email to test.");
        setIsTesting(true);
        try {
            const res = await apiService.sendEmail(testRecipient, "Platform Configuration Test", "This is a test email to verify your SMTP relay settings on the EduAi platform.", localEmailConfig);
            if (res.success) alert("Email dispatched successfully.");
            else alert(`Email Failed: ${res.message || 'Check SMTP settings'}`);
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
            const res = await apiService.initiateMpesaPayment(1, testRecipient, localMpesaConfig);
            if (res.success) alert(res.message || "STK Push sent to phone.");
            else alert(`M-Pesa Failed: ${res.message || 'Check Daraja credentials'}`);
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

    const handleAddInstitutionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newInstData.name && newInstData.email && newInstData.phoneNumber) {
            // Basic validation
            props.onAddInstitution({
                name: newInstData.name,
                email: newInstData.email,
                phoneNumber: newInstData.phoneNumber,
                institutionType: newInstData.institutionType,
                status: 'trial',
                trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                institutionCode: `INST-${Date.now().toString().slice(-4)}`,
                themeColor: '#4f46e5',
                logoUrl: null,
                useAllocationRequests: true
            });
            setIsAddingInstitution(false);
            setNewInstData({ name: '', email: '', phoneNumber: '', institutionType: 'University' });
            alert("New institution tenant created successfully.");
        } else {
            alert("Please fill in all required fields.");
        }
    };

    const tabs = [
        { key: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
        { key: 'institutions', label: 'Institutions', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> },
        { key: 'all_users', label: 'Global Users', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },

        { key: 'communications', label: 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
        { key: 'migration', label: 'System Build', icon: <CommandLineIcon className="w-5 h-5 mr-2" /> },
        { key: 'user_activity', label: 'Audit Trail', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
        { key: 'settings', label: 'Global Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
        { key: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
    ];

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
        { role: 'security', label: 'Security Module', icon: <ShieldIcon className="w-6 h-6" />, color: 'bg-red-50 text-red-600' },
        { role: 'store', label: 'Inventory Module', icon: <ArchiveBoxIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
        { role: 'finance', label: 'Finance Module', icon: <CurrencyIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
        { role: 'info_desk', label: 'Info Desk Module', icon: <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />, color: 'bg-sky-50 text-sky-600' },
        { role: 'librarian', label: 'Library Module', icon: <BookOpenIcon className="w-6 h-6" />, color: 'bg-purple-50 text-purple-600' },
        { role: 'student', label: 'Student Portal', icon: <AcademicCapIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'lecturer', label: isSchool ? 'Teacher Portal' : 'Lecturer Portal', icon: <UserIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' }
    ];

    const activeRole = currentUser?.role;
    const isAdminCatchAll = ['admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy'].includes(activeRole || '');

    // Render logic moved from App.tsx into component to reuse for perspective switching
    if (activeRole === 'student') {
        return <StudentView user={currentUser} users={users} courses={courses} subjects={subjects} enrollmentRequests={enrollmentRequests} generatedTimetable={generatedTimetable} examTimetable={examTimetable} getSubjectById={props.getSubjectById || ((id: string) => undefined)} getRoomById={props.getRoomById || ((id: string) => undefined)} getLecturerById={props.getLecturerById || ((id: string) => undefined)} timetableSettings={timetableSettings!} studentCheckIns={props.studentCheckIns!} onStudentLessonCheckIn={props.onAddTransaction as any} letterheadConfig={letterheadConfig!} footerImageUrl={footerImageUrl} logoUrl={logoUrl} buildings={buildings} onAddParent={props.onAddParent as any} onDeleteParent={props.onDeleteParent as any} departments={departments} onSubmitEnrollmentRequest={async (sids: string[], sig: string | null) => { }} assignments={assignments} submissions={submissions} onAddSubmission={async (d: any) => { await apiService.saveModuleRecord('submissions', { ...d, id: `subm_${Date.now()}`, institutionId: currentUser.institutionId }); }} lessonRatings={lessonRatings} onAddLessonRating={() => { }} onRateLesson={() => { }} onAddFeedback={() => { }} feedbackSubmissions={feedbackSubmissions} studentAbsenceRequests={studentAbsenceRequests} onSubmitStudentAbsenceRequest={() => { }} finalTimetableUrl={finalTimetableUrl} taAssignments={props.onUpdateFeeStructures as any} userTasks={userTasks} onAddTask={() => { }} onUpdateTask={() => { }} onDeleteTask={() => { }} currentInstitution={currentInstitution!} assessments={assessments} assessmentMarks={assessmentMarks} />;
    }

    if (activeRole === 'academics_officer') {
        return <AcademicsOfficerView currentUser={currentUser} subjects={subjects} onUpdateSubject={props.onUpdateSubject as any} courses={courses} onUpdateCourse={props.onUpdateCourse} users={users} rooms={rooms} onUpdateRoom={props.onUpdateRoom} onDeleteRoom={props.onDeleteRoom} onAddRoom={props.onAddRoom} departments={departments} onAddDepartment={props.onAddDepartment} onUpdateDepartment={props.onUpdateDepartment} onDeleteDepartment={props.onDeleteDepartment} onImportDepartments={props.onImportDepartments} activeAcademicYear={activeAcademicYear} activeSemester={activeSemester} onExamTimetableGenerated={async (entries: any, ay: any, sem: any) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries)} examTimetable={examTimetable} getSubjectById={props.getSubjectById || ((id: string) => undefined)} getLecturerById={props.getLecturerById || ((id: string) => undefined)} getRoomById={props.getRoomById || ((id: string) => undefined)} courseSizes={courseSizes} academicYears={academicYears} semesters={semesters} timetableSettings={timetableSettings!} buildings={buildings} onUpdateBuilding={props.onUpdateBuilding} onDeleteBuilding={props.onDeleteBuilding} onAddBuilding={props.onAddBuilding} academicLevels={academicLevels} letterheadConfig={letterheadConfig} logoUrl={logoUrl} footerImageUrl={footerImageUrl} emailConfig={emailConfig} onSaveEmailConfig={props.onSaveEmailConfig as any} onSendTestEmail={props.onSendTestEmail as any} currentInstitution={currentInstitution} examTimetableSettings={examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS} onSaveExamTimetableSettings={props.onSaveExamTimetableSettings as any} onAddAcademicYear={props.onAddAcademicYear} onUpdateAcademicYear={props.onUpdateAcademicYear} onDeleteAcademicYear={props.onDeleteAcademicYear} onAddSemester={props.onAddSemester} onUpdateSemester={props.onUpdateSemester} onDeleteSemester={props.onDeleteSemester} onSaveTimetableSettings={props.onSaveTimetableSettings} onImportRooms={props.onImportRooms} smsConfig={smsConfig} themeColor={themeColor} allocations={allocations} timeOffRequests={timeOffRequests} />;
    }

    if (isAdminCatchAll) {
        return <AdminView
            {...props}
            requests={requests || []}
            enrollmentRequests={enrollmentRequests}
            onUpdateRequest={props.onUpdateRequest}
            onWithdrawRequest={props.onWithdrawRequest}
        />;
    }

    if (activeRole === 'lecturer' || activeRole === 'teacher') {
        return <LecturerView
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
        />;
    }

    // Super Admin View (Default Fallback)
    return (
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
            <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar no-print bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-2">
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
            </div>

            <main className="animate-fade-in">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {stats.totalActionable > 0 && (
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
                                                <select value={newInstData.institutionType} onChange={e => setNewInstData({ ...newInstData, institutionType: e.target.value as any })} className="form-select">
                                                    <option value="Primary">Primary School</option>
                                                    <option value="Secondary">Secondary School</option>
                                                    <option value="University">University</option>
                                                    <option value="College">College</option>
                                                    <option value="Institute">Institute</option>
                                                    <option value="Polytechnic">Polytechnic</option>
                                                    <option value="ECD">ECD Center</option>
                                                    <option value="International">International School</option>
                                                </select>
                                            </div>
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
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-2.5 py-1 inline-flex text-[10px] font-black uppercase rounded-lg ${inst.status === 'active' ? 'bg-green-100 text-green-700' :
                                                            inst.status === 'trial' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                                                            }`}>
                                                            {inst.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                                        <div className="flex justify-end gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => onLoginAsAdmin(inst.id)} className="text-indigo-600 hover:text-indigo-900 font-black text-xs uppercase tracking-tighter">Enter Portal</button>
                                                            <button onClick={() => setEditingInstitution(inst)} className="text-slate-600 hover:text-slate-900 font-bold text-xs uppercase tracking-tighter">Edit</button>
                                                            <button onClick={() => onToggleInstitutionStatus(inst.id)} className="text-yellow-600 hover:text-yellow-900 font-bold text-xs uppercase tracking-tighter">{inst.status === 'suspended' ? 'Resume' : 'Suspend'}</button>
                                                            <button onClick={() => onDeleteInstitution(inst.id)} className="text-red-600 hover:text-red-900 font-black text-xs uppercase tracking-tighter">Purge</button>
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
                                    logoUrl={logoUrl}
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
                            onAddUser={() => { }}
                            onImportUsers={onImportUsers}
                            onImportStudents={onImportStudents}
                            onDeleteUser={props.onDeleteUser}
                            onEditUser={props.onEditUser}
                            onWithdrawRequest={() => { }}
                            letterheadConfig={localCompanyInfo.letterheadConfig}
                            logoUrl={localCompanyInfo.logoUrl}
                            footerImageUrl={localCompanyInfo.footerImageUrl}
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
                        />
                    </div>
                )}


                {activeTab === 'migration' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm">
                            <div>
                                <h3 className="text-xl font-black">Database Setup & Schema</h3>
                                <p className="text-sm text-slate-500 mt-1">Export SQL DDL scripts or execute migration directly on the cloud.</p>
                            </div>
                            <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-xl">
                                <button onClick={() => setMigrationSubTab('full')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${migrationSubTab === 'full' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-50'}`}>Full Platform</button>
                                <button onClick={() => setMigrationSubTab('semester')} className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${migrationSubTab === 'semester' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-50'}`}>Modules Only</button>
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
                                onWithdrawRequest={props.onWithdrawRequest}
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

                {activeTab === 'user_activity' && (
                    <div className="animate-fade-in-up">
                        <ActivityLogView activityLog={activityLog || []} />
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
                            </nav>
                        </div>

                        <div className="mt-6">
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
                                <div className="animate-fade-in">
                                    <DatabaseSettings
                                        dbConfig={companyDetails.databaseConfig}
                                        onSave={async (newDbConfig) => {
                                            if (props.onUpdateCompanyDetails) {
                                                await props.onUpdateCompanyDetails({ ...props.companyDetails!, databaseConfig: newDbConfig });
                                            }
                                        }}
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
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
                                    <h3 className="text-xl font-black uppercase tracking-tight">SMS Gateway Configuration</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Service Provider</label>
                                            <select
                                                value={localSmsConfig.provider}
                                                onChange={e => setLocalSmsConfig({ ...localSmsConfig, provider: e.target.value })}
                                                className="form-select h-12 font-bold text-sm"
                                            >
                                                <option value="ABMIS">ABMIS (Default)</option>
                                                <option value="Zettatel">Zettatel Solutions</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                                {localSmsConfig.provider === 'Zettatel' ? 'Bearer Token / API Key' : 'User ID'}
                                            </label>
                                            <input type="text" value={localSmsConfig.apiKey} onChange={e => setLocalSmsConfig({ ...localSmsConfig, apiKey: e.target.value })} className="form-input" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                                {localSmsConfig.provider === 'Zettatel' ? 'Partner ID' : 'API Password'}
                                            </label>
                                            <input type="password" value={localSmsConfig.apiSecret} onChange={e => setLocalSmsConfig({ ...localSmsConfig, apiSecret: e.target.value })} className="form-input" />
                                        </div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender ID / Shortcode</label><input type="text" value={localSmsConfig.fromNumber} onChange={e => setLocalSmsConfig({ ...localSmsConfig, fromNumber: e.target.value })} className="form-input" /></div>
                                    </div>
                                    <div className="pt-6 border-t flex flex-col sm:flex-row justify-between items-center gap-4">
                                        <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 w-full sm:w-auto">
                                            <input
                                                type="text"
                                                placeholder="Test Phone (254...)"
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
                                        </div>
                                        <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs w-full sm:w-auto">Sync Gateway</button>
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
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                            <MpesaIcon className="w-6 h-6 text-green-600" />
                                        </div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Platform Billing Configuration</h3>
                                    </div>

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
                                                placeholder="Phone (254...)"
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
                        </div>
                    </div>
                )}
            </main>

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
                        <div className="p-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {perspectiveOptions.map(opt => (
                                <button
                                    key={opt.role}
                                    onClick={() => {
                                        props.onSwitchPerspective?.(opt.role as Role);
                                        setIsPerspectiveModalOpen(false);
                                    }}
                                    className={`flex items-center gap-4 p-5 rounded-3xl border-2 border-transparent transition-all text-left group hover:border-indigo-500 ${opt.color}`}
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm transition-transform group-hover:scale-110">
                                        {opt.icon}
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight">{opt.label}</span>
                                </button>
                            ))}
                            {/* Added return button */}
                            {props.isImpersonating && (
                                <button
                                    onClick={() => {
                                        props.onSwitchPerspective?.(null as any);
                                        setIsPerspectiveModalOpen(false);
                                    }}
                                    className="flex items-center gap-4 p-5 rounded-3xl border-2 border-red-200 bg-red-50 text-red-700 transition-all text-left group hover:border-red-500 col-span-full"
                                >
                                    <div className="p-3 bg-white rounded-2xl shadow-sm transition-transform group-hover:scale-110">
                                        <ArrowRightOnRectangleIcon className="w-6 h-6 text-red-600" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight">Return to Admin</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {editingInstitution && (
                <EditInstitutionModal
                    institution={editingInstitution}
                    onClose={() => setEditingInstitution(null)}
                    onSave={async (id, data) => { if (props.onUpdateInstitution) await props.onUpdateInstitution(id, data); setEditingInstitution(null); }}
                    defaultPrices={companyDetails.subscriptionConfig}
                />
            )}
        </div>
    );
};