
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type {
    User, Department, Subject, Building, Room, AllocationRequest,
    TimetableEntry, SmsConfig, EmailConfig, LetterheadConfig, Vehicle, TransportOnboarding, VehicleLog,
    TimetableSettings, Course, AcademicYear, Semester, RequestStatus,
    Institution, Priority, CompanyDetails, MpesaTransaction,
    ExamTimetableSettings, AcademicLevel, StudentAttendance,
    Assessment, AssessmentMark, TimeOffRequest, StudentAbsenceRequest,
    EnrollmentRequest, AbsenceRequest, LecturerContract,
    ExamTimetableEntry, Conflict, UserTask, ExtensionRequest,
    ActivityLog, VoteHead, FeeStructure, FinancialPeriod,
    InvoiceItem, TransactionStatus, FeedbackSubmission, LessonRating, Invoice, Receipt, Unavailability,
    BiometricConfig, TimeOffRequestStatus, StudentAbsenceRequestStatus, SecurityAlert, Visitor, Requisition, Role,
    Submission, UserUpdateData, County, Assignment
} from '../types';
import { UserManager } from './UserManager';
import { TimetableGenerator } from './TimetableGenerator';
import { SettingsManager } from './SettingsManager';
import { SubjectManager } from './SubjectManager';
import { CourseManager } from './CourseManager';
import { InteractionsManager } from './InteractionsManager';
import { CommunicationsManager } from './CommunicationsManager';
import { ReportsDashboard } from './ReportsDashboard';
import { StudentLeaveOutManager } from './StudentLeaveOutManager';
import { SubscriptionManager } from './SubscriptionManager';

import {
    ClipboardListIcon,
    UserGroupIcon,
    CalendarDaysIcon,
    Cog8ToothIcon,
    ChartPieIcon,
    ArrowsRightLeftIcon,
    ChatBubbleBottomCenterTextIcon,
    BookOpenIcon,
    ChartBarIcon,
    SparklesIcon,
    AcademicCapIcon,
    EyeIcon,
    ShieldIcon,
    ArchiveBoxIcon,
    CurrencyIcon,
    UserIcon,
    XIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    BeakerIcon,
    PlusIcon,
    BedIcon,
    CreditCardIcon,
    MapPinIcon
} from './icons/index';
import { DirectAssignModal } from './DirectAssignModal';
import { AcademicYearManager } from './AcademicYearManager';
import { TimetablesView } from './TimetablesView';
import { INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS } from '../constants';
import { EditInstitutionModal } from './EditInstitutionModal';
import { TimetableWizard } from './TimetableWizard';
import { TransportManager } from './TransportManager';
import { apiService } from '../services/apiService';

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
    onLogAction?: (action: string) => Promise<void>;
    onAddTransaction?: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onAddExtensionRequest?: (reason: string) => void;
    onSendBulkCredentials?: (users: User[], method: 'email' | 'sms') => Promise<{ success_count: number; fail_count: number }>;
    onSendSms?: (r: string, m: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
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
    onRefreshData?: () => void;
    vehicles?: Vehicle[];
    transportOnboarding?: TransportOnboarding[];
    vehicleLogs?: VehicleLog[];
    onAddVehicle?: (vehicle: Omit<Vehicle, 'id'>) => Promise<void>;
    onUpdateVehicle?: (id: string, updates: Partial<Vehicle>) => Promise<void>;
    onDeleteVehicle?: (id: string) => Promise<void>;
    onLogGateAction?: (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => Promise<void>;
    onOnboardStudent?: (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => Promise<void>;
    onOffboardStudent?: (recordId: string, lat?: number, lng?: number) => Promise<void>;
    onConfirmReceipt?: (recordId: string) => Promise<void>;
}

export const AdminView: React.FC<AdminViewProps> = (props: AdminViewProps) => {
    const { activeAcademicYear, activeSemester, requests = [] } = props;
    const { subjects, users, rooms, courses, currentInstitution, companyDetails, courseSizes } = props;

    const [activeTab, setActiveTab] = useState<'dashboard' | 'timetable' | 'users' | 'courses' | 'leaveout' | 'comms' | 'settings' | 'reports' | 'transport'>('dashboard');

    const [timetableSubTab, setTimetableSubTab] = useState<'wizard' | 'scheduler' | 'calendar' | 'subjects' | 'registry'>('wizard');
    const [isDirectAssignOpen, setIsDirectAssignOpen] = useState(false);
    const [requestedSettingsTab, setRequestedSettingsTab] = useState<string | undefined>(undefined);
    const [isPerspectiveModalOpen, setIsPerspectiveModalOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);

    const isSchool = useMemo(() => {
        return props.currentInstitution?.institutionType === 'Primary' || props.currentInstitution?.institutionType === 'Secondary';
    }, [props.currentInstitution]);

    const tabs = useMemo(() => {
        const baseTabs = [
            { id: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
            { id: 'timetable', label: 'Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> },
            { id: 'users', label: 'Members', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
            { id: 'courses', label: isSchool ? 'Grades' : 'Courses', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> },
            { id: 'leaveout', label: 'Leave Out', icon: <ArchiveBoxIcon className="w-5 h-5 mr-2" /> },
            { id: 'comms', label: 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
            { id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
            { id: 'transport', label: 'Transport', icon: <MapPinIcon className="w-5 h-5 mr-2" /> },
            { id: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
        ];

        // Hide Broadcaster for non-Super Admins, except for Broadcaster institutions or other authorized admins
        if (props.currentUser?.role !== 'super_admin' &&
            props.currentInstitution?.institutionType !== 'Broadcaster' &&
            !['admin', 'head_teacher', 'deputy', 'dos', 'tto'].includes(props.currentUser?.role || '')
        ) {
            return baseTabs.filter(t => t.id !== 'comms');
        }

        return baseTabs;
    }, [props.currentUser?.role, props.currentInstitution?.institutionType, isSchool]);

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
        { role: 'lecturer', label: isSchool ? 'Teacher Portal' : 'Lecturer Portal', icon: <UserIcon className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' }
    ];


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
                            : 'border-transparent text-slate-500 hover:text-slate-700'
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
                            <h3 className="text-xl font-black tracking-tighter uppercase mb-6 flex items-center gap-2">
                                <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                Operational Hub
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                                <button
                                    onClick={() => handleQuickAction('users')}
                                    className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition-all group text-left"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                        <UserGroupIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Staff Hub</span>
                                </button>
                                <button
                                    onClick={() => handleQuickAction('timetable', undefined, 'calendar')}
                                    className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition-all group text-left"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                        <CalendarDaysIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">{isSchool ? 'School Calendar' : 'Academic Calendar'}</span>
                                </button>
                                <button
                                    onClick={() => handleQuickAction('timetable', undefined, 'subjects')}
                                    className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-300 transition-all group text-left"
                                >
                                    <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                                        <BookOpenIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Subjects</span>
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
                        allocations={(props.requests || []).filter(r => r && r.status === 'approved')}
                        onImportUsers={props.onImportUsers}
                        onImportStudents={props.onImportStudents}
                        onEditUser={props.onEditUser}
                        onDeleteUser={props.onDeleteUser}
                        onAddUser={props.onAddUser}
                        onAddTimeOffRequest={props.onAddTimeOffRequest}
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

                {activeTab === 'settings' && (
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

                {activeTab === 'reports' && (

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
