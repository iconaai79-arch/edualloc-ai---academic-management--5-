
import React, { useState, useMemo, useEffect, useCallback, lazy, Suspense } from 'react';
import type {
    Institution, User, Subject, Department, CompanyDetails, MpesaTransaction,
    Receipt, InvoiceItem, ActivityLog, Course, ExtensionRequest, Semester, DisciplineIncident,
    SmsConfig, AllocationRequest, LetterheadConfig, Priority, Unavailability,
    UserUpdateData, MpesaConfig, SubscriptionConfig, EmailConfig, TransactionStatus,
    Room, Building, AcademicLevel, TimetableSettings, ExamTimetableSettings, RequestStatus, AcademicYear, TimetableEntry, Conflict, TimeOffRequest, TimeOffRequestStatus, EnrollmentRequest, AbsenceRequest, LecturerContract, FeedbackSubmission, LessonRating, LeaveOutRequest,
    Invoice, VoteHead, FeeStructure, FinancialPeriod, UserTask, BiometricConfig, StudentAbsenceRequest, StudentAbsenceRequestStatus, SecurityAlert, Visitor, Requisition, StudentAttendance, Assessment, AssessmentMark, ExamTimetableEntry, Role,
    Assignment, Submission, County, CommissionWithdrawalRequest, ShowcaseItem,
    CoopFarmer, CoopCollection, CoopRider, CoopAgrovetInventory, CoopAgrovetSales,
    SaccoAccount, SaccoTransaction, CoopMonthlyPayout, CoopExpense, CoopIncome,
    RetailStore, RetailInventoryItem, Supplier, RetailExpense, TransportVehicle,
    TransportOnboarding, VehicleLog, AppNotification,
    LawAgreement, LawAgreementTemplate, LawClient, LawMatter, LawDocument, LawTimeEntry, LawInvoice, LawTrustTransaction,
    DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings,
    CarListing, TestDriveBooking, CarAppraisal, CarInvoice, CarPayment, SchoolRegistry, MarketingProspect, BankTransaction,
    PoliticalParty, Constituency, Ward, FtpConfig, GoogleDriveConfig, ICDCode, KcbConfig
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
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { isSchoolInstitution } from '../utils/roleUtils';
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
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { CrossIcon } from './icons/CrossIcon';
import { MegaphoneIcon } from './icons/MegaphoneIcon';
import { PalmTreeIcon as Palmtree } from './icons/PalmTreeIcon';
import { KcbIcon } from './icons/KcbIcon';
import { ZapIcon } from './icons/ZapIcon';
import { CommunicationsManager } from './CommunicationsManager';
import { EditInstitutionModal } from './EditInstitutionModal';
import { apiService } from '../services/apiService';
import { useToast } from '../services/ToastContext';
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
import { PortalLinksManager } from './PortalLinksManager';
import { TimetableWizard } from './TimetableWizard';
import { SmartPoliticalImporterModal } from './SmartPoliticalImporterModal';
import { SmartMedicalImporterModal } from './SmartMedicalImporterModal';
import { ParentView } from './ParentView';
import { LeadScoutManager } from './LeadScoutManager';
import { analyzePoliticalRegistrySpreadsheet } from '../services/geminiService';
import * as XLSX from 'xlsx';
import { CountyManager } from './CountyManager';
import { PropertyMarketplaceView } from './PropertyMarketplaceView';
import { ExternalModuleView } from './ExternalModuleView';
import { SchoolRegistryManager } from './superadmin/SchoolRegistryManager';
import { PoliticalMetadataManager } from './superadmin/PoliticalMetadataManager';
import { MedicalRegistryManager } from './superadmin/MedicalRegistryManager';
import { AddCarListingModal } from './modals/AddCarListingModal';
const DisciplineManager = React.lazy(() => import('./Academics/DisciplineManager').then(m => ({ default: m.DisciplineManager })));
const ExamInsights = React.lazy(() => import('./Academics/ExamInsights').then(m => ({ default: m.ExamInsights })));
const AcademicReportsHub = React.lazy(() => import('./Academics/AcademicReportsHub').then(m => ({ default: m.AcademicReportsHub })));

import { MarketingLandingPage } from './public/MarketingLandingPage';
import { DemoRequestManager } from './DemoRequestManager';
import { DemoRequest } from '../types';
import { CarIcon } from './icons/CarIcon';
import { VehicleMarketplaceView } from './VehicleMarketplaceView';


// Lazy-load major views to break circular dependencies and reduce initial chunk size
const AdminView = React.lazy(() => import('./AdminView').then(m => ({ default: m.AdminView })));
const LecturerView = React.lazy(() => import('./LecturerView').then(m => ({ default: m.LecturerView })));
const StudentView = React.lazy(() => import('./StudentView').then(m => ({ default: m.StudentView })));
const AcademicsOfficerView = React.lazy(() => import('./AcademicsOfficerView').then(m => ({ default: m.AcademicsOfficerView })));
const LoginView = React.lazy(() => import('./LoginView').then(m => ({ default: m.LoginView })));
const HospitalityMarketplace = React.lazy(() => import('./hospitality/HospitalityMarketplace').then(m => ({ default: m.HospitalityMarketplace })));
const CarShowroomDashboard = React.lazy(() => import('./automotive/CarShowroomDashboard').then(m => ({ default: m.CarShowroomDashboard })));
const CarSalesLedger = React.lazy(() => import('./automotive/CarSalesLedger').then(m => ({ default: m.CarSalesLedger })));
const BankFeedsManager = React.lazy(() => import('./automotive/BankFeedsManager').then(m => ({ default: m.BankFeedsManager })));

import { 
    Compass, 
    Hotel, 
    Filter,
    History,
    Database,
    Zap
} from 'lucide-react';

export interface SuperAdminViewProps {
    institutions: Institution[];
    counties: County[];
    users: User[];
    requests: AllocationRequest[];
    allocations: AllocationRequest[];
    departments: Department[];
    subjects: Subject[];
    courses: Course[];
    rooms?: Room[];
    buildings?: Building[];
    academicLevels?: AcademicLevel[];
    academicYears?: AcademicYear[];
    semesters?: Semester[];
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    timetableSettings?: TimetableSettings;
    examTimetableSettings?: ExamTimetableSettings;
    logoUrl?: string | null;
    footerImageUrl?: string | null;
    themeColor?: string;
    companyDetails: CompanyDetails;
    activityLog: ActivityLog[];
    transactions: MpesaTransaction[];
    receipts: Receipt[];
    invoices: Invoice[];
    extensionRequests?: ExtensionRequest[];
    voteHeads?: VoteHead[];
    feeStructures?: FeeStructure[];
    financialPeriods?: FinancialPeriod[];
    userTasks?: UserTask[];
    generatedTimetable?: TimetableEntry[];
    allTimetableEntries?: TimetableEntry[];
    finalTimetableUrl?: string | null;
    letterheadConfig?: LetterheadConfig;
    smsConfig?: SmsConfig;
    emailConfig?: EmailConfig;
    timetableConflicts?: Conflict[];
    currentInstitution?: Institution | null;
    onRefreshData?: () => Promise<void>;
    currentUser: User;
    activityLogLimit?: number;
    setActivityLogLimit?: React.Dispatch<React.SetStateAction<number>>;
    transactionLimit: number;
    setTransactionLimit: React.Dispatch<React.SetStateAction<number>>;
    receiptLimit: number;
    setReceiptLimit: React.Dispatch<React.SetStateAction<number>>;
    notificationLimit?: number;
    setNotificationLimit?: React.Dispatch<React.SetStateAction<number>>;

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
    onAddTask?: (data: any) => Promise<void>;
    onUpdateTask?: (id: string, complete: boolean) => Promise<void>;
    onDeleteTask?: (id: string) => Promise<void>;
    onLogAction?: (action: string) => Promise<void>;
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    isGeneratingDemoData?: boolean;
    demoDataGenerationProgress?: number;
    demoDataGenerationMessage?: string;
    onSendBulkCredentials?: (users: User[], method: 'email' | 'sms') => Promise<{ success_count: number; fail_count: number }>;
    onSendSms?: (recipient: string | string[], message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<{ success: boolean; message: string; }>;
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
    notifications: AppNotification[];
    timeOffRequests?: TimeOffRequest[];
    onAddTimeOffRequest?: (data: Partial<TimeOffRequest>) => Promise<void>;
    onUpdateTimeOffRequestStatus?: (id: string, status: TimeOffRequestStatus) => Promise<void>;
    enrollmentRequests?: EnrollmentRequest[];
    absenceRequests?: AbsenceRequest[];
    studentAbsenceRequests?: StudentAbsenceRequest[];
    carListings?: CarListing[];
    carTestDrives?: TestDriveBooking[];
    carAppraisals?: CarAppraisal[];
    carInvoices?: CarInvoice[];
    carPayments?: CarPayment[];
    carBankTransactions?: BankTransaction[];
    onAddCarListing?: (data: Partial<CarListing>) => Promise<void>;
    onUpdateCarTestDriveStatus?: (id: string, status: any) => Promise<void>;
    onAddCarAppraisal?: (data: Partial<CarAppraisal>) => Promise<void>;
    onAddCarInvoice?: (data: Partial<CarInvoice>) => Promise<void>;
    onAddCarPayment?: (data: Partial<CarPayment>) => Promise<void>;
    onReconcileBankTransaction?: (transactionId: string, invoiceId: string) => Promise<void>;
    onFetchBankFeeds?: () => Promise<void>;

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
    securityAlerts?: SecurityAlert[];
    visitors?: Visitor[];
    requisitions?: Requisition[];
    onApproveRequisition?: (id: string, status: any) => void;
    studentAttendances?: StudentAttendance[];
    studentCheckIns?: Record<string, string>;
    lessonRatings?: LessonRating[];
    feedbackSubmissions?: FeedbackSubmission[];
    onUpdateFeedbackStatus?: (id: string, status: string) => void;
    courseSizes?: Map<string, number>;
    assessments?: Assessment[];
    assessmentMarks?: AssessmentMark[];
    onAddAssessment?: (data: any) => void;
    onDeleteAssessment?: (id: string) => void;
    onUpdateAssessmentStatus?: (id: string, status: string) => void;
    onSaveAssessmentMarks?: (id: string, data: any) => void;
    contracts?: LecturerContract[];
    examTimetable?: ExamTimetableEntry[];
    onSwitchPerspective?: (role: Role) => void;
    onWithdrawRequestStatus?: (id: string) => Promise<void>;
    onManualInvoice?: (institutionId: string, items: InvoiceItem[], totalAmount: number, dueDate: string) => void;
    onUpdateCompanyDetails?: (data: Partial<CompanyDetails>) => Promise<void>;
    onAddInstitution?: (data: Omit<Institution, 'id'>) => Promise<void>;
    onDeleteInstitution?: (institutionId: string) => void;
    onToggleInstitutionStatus?: (institutionId: string) => void;
    onLoginAsAdmin?: (institutionId: string, initialRole?: Role | null) => void;
    onAccessAlumnaPortal: (school: SchoolRegistry) => void;
    schoolRegistry?: SchoolRegistry[];
    onGenerateReceipt?: (transaction: MpesaTransaction) => void;

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
    onInitiatePayouts?: (data: any) => Promise<void>;
    onApprovePayouts?: (payoutIds: string[]) => Promise<void>;
    onDisbursePayouts?: (payoutIds: string[]) => Promise<void>;
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
    lawAgreementTemplates: LawAgreementTemplate[];
    lawAgreements: LawAgreement[];
    lawClients: LawClient[];
    lawMatters: LawMatter[];
    lawDocuments: LawDocument[];
    lawTimeEntries: LawTimeEntry[];
    lawInvoices: LawInvoice[];
    lawTrustTransactions: LawTrustTransaction[];
    onAddLawClient: (data: any) => Promise<void>;
    onAddLawMatter: (data: any) => Promise<void>;
    onAddLawTimeEntry: (data: any) => Promise<void>;
    onAddLawTrustTransaction: (data: any) => Promise<void>;
    onAddLawInvoice: (data: any) => Promise<void>;
    onUpdateLawMatter: (id: string, data: any) => Promise<void>;
    onAddLawAgreementTemplate: (data: any) => Promise<void>;
    onGenerateLawAgreement: (data: any) => Promise<void>;
    onApproveLawAgreement: (id: string, notes: string) => Promise<void>;
    dsInstructors: DSInstructor[];
    dsVehicles: DSVehicle[];
    dsStudents: DSStudent[];
    dsLessons: DSLesson[];
    dsMastery: DSSkillMastery[];
    dsSettings?: DSSettings | null;
    onAddDSInstructor: (data: any) => Promise<void>;
    onAddDSVehicle: (data: any) => Promise<void>;
    onAddDSStudent: (data: any) => Promise<void>;
    onAddDSLesson: (data: any) => Promise<void>;
    onAddDSMastery: (data: any) => Promise<void>;
    onUpdateDSSettings: (data: any) => Promise<void>;
    incidents?: DisciplineIncident[];
    onAddIncident?: (data: any) => Promise<void>;
    onRunAlumniMigration?: () => Promise<void>;
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
        onAccessAlumnaPortal,
        schoolRegistry: propSchoolRegistry,
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
        onUpdateDemoStatus,
        lawAgreementTemplates = [],
        lawAgreements = [],
        lawClients = [],
        lawMatters = [],
        lawDocuments = [],
        lawTimeEntries = [],
        lawInvoices = [],
        lawTrustTransactions = [],
        onAddLawClient,
        onAddLawMatter,
        onAddLawTimeEntry,
        onAddLawTrustTransaction,
        onAddLawInvoice,
        onUpdateLawMatter,
        onAddLawAgreementTemplate,
        onGenerateLawAgreement,
        onApproveLawAgreement,
        onRunAlumniMigration,
        dsInstructors = [],
        dsVehicles = [],
        dsStudents = [],
        dsLessons = [],
        dsMastery = [],
        dsSettings,
        onAddDSInstructor,
        onAddDSVehicle,
        onAddDSStudent,
        onAddDSLesson,
        onAddDSMastery,
        onUpdateDSSettings,
        carListings = [],
        carTestDrives = [],
        carAppraisals = [],
        onAddCarListing,
        onLogAction
    } = props;

    const { success, error: toastError } = useToast();

    const [activeTab, setActiveTab] = useState<'dashboard' | 'institutions' | 'hospitality' | 'auto_marketplace' | 'external_module' | 'interactions' | 'reports' | 'portal_links' | 'all_users' | 'academics' | 'communications' | 'settings' | 'migration' | 'user_activity' | 'demo_requests' | 'lead_scout' | 'campaigns' | 'financials' | 'integrations' | 'marketing'>(() => {
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        if (view === 'showroom' || params.get('showroom')) return 'auto_marketplace';
        return 'dashboard';
    });
    const [institutionsSubTab, setInstitutionsSubTab] = useState<'list' | 'counties' | 'resellers' | 'business' | 'requests' | 'transactions' | 'withdrawals' | 'external_links' | 'registry' | 'scouting' | 'branding' | 'political' | 'medical' | 'business_profile'>('list');
    const [academicsSubTab, setAcademicsSubTab] = useState<'subjects' | 'courses' | 'registry' | 'calendar' | 'timetable' | 'discipline' | 'insights' | 'reports'>('subjects');
    const [schoolRegistry, setSchoolRegistry] = useState<SchoolRegistry[]>([]);

    const [healthStatus, setHealthStatus] = useState<any>(null);
    const [isRefreshingHealth, setIsRefreshingHealth] = useState(false);
    const [institutionSearchQuery, setInstitutionSearchQuery] = useState('');
    const [institutionTimeFilter, setInstitutionTimeFilter] = useState<'all' | '7d' | '30d' | '90d' | 'active' | 'suspended'>('all');
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
    const [autoSubTab, setAutoSubTab] = useState<'dashboard' | 'inventory' | 'financials' | 'bank_feeds'>(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.get('sub') === 'financials' || params.get('tab') === 'sales') return 'financials';
        return 'dashboard';
    });
    const [settingsSubTab, setSettingsSubTab] = useState<'profile' | 'infrastructure' | 'branding' | 'sms' | 'email' | 'billing' | 'sms_pricing' | 'marketplace' | 'showcase' | 'system_build' | 'storage'>('profile');
    const [billingSubTab, setBillingSubTab] = useState<'mpesa' | 'gateways' | 'kcb' | 'coop'>('mpesa');
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
    const [managingKcbFor, setManagingKcbFor] = useState<Institution | null>(null);
    const [tenantKcbConfig, setTenantKcbConfig] = useState<KcbConfig>({ appKey: '', appSecret: '', environment: 'sandbox' });
    const [tenantModulePricing, setTenantModulePricing] = useState<Record<string, { monthly?: number; yearly?: number }>>({});
    const [tenantSmsAdjustment, setTenantSmsAdjustment] = useState<{ amount: number; reason: string }>({ amount: 0, reason: '' });
    const [isSavingTenantConfig, setIsSavingTenantConfig] = useState(false);
    const [isTestingFtp, setIsTestingFtp] = useState(false);
    const [tenantSmsTestPhone, setTenantSmsTestPhone] = useState('');
    const [isTestingTenantSms, setIsTestingTenantSms] = useState(false);
    const [generatedAdverts, setGeneratedAdverts] = useState<any[]>([
        { 
            id: 'ds_v2', 
            title: 'Driving School V2 - Future is Here', 
            description: 'Premium advert for the automated driving school module with 3D isometric renders.', 
            image: '/marketing/driving_school_hero_3d_1778920419924.png',
            images: [
                '/marketing/driving_school_hero_3d_1778920419924.png',
                '/marketing/driving_school_scheduling_3d_1778920509602.png',
                '/marketing/driving_school_mastery_3d_1778920618450.png',
                '/marketing/marketing_ds_1776367354223.png'
            ],
            stats: { shares: 124, clicks: 850 },
            category: 'Driving School'
        },
        { 
            id: 'auto_mkt', 
            title: 'Automotive Marketplace Hub', 
            description: 'Promotional content for the vehicle inventory and sales ledger system.', 
            image: '/marketing/driving_school_scheduling_3d_1778920509602.png',
            images: [
                '/marketing/driving_school_scheduling_3d_1778920509602.png',
                '/marketing/marketing_showroom.png',
                '/marketing/marketing_autoservice_1776367264534.png',
                '/marketing/marketing_campaign_1776367315708.png'
            ],
            stats: { shares: 89, clicks: 420 },
            category: 'Automotive'
        }
    ]);
    const [selectedAdForGallery, setSelectedAdForGallery] = useState<any | null>(null);
    const [activeGalleryImageIndex, setActiveGalleryImageIndex] = useState<number>(0);
    const [isGeneratingAdvert, setIsGeneratingAdvert] = useState(false);
    const [advertPrompt, setAdvertPrompt] = useState('');

    const handleGenerateAdvert = async () => {
        if (!advertPrompt.trim()) return;
        setIsGeneratingAdvert(true);
        try {
            const newAd = await apiService.generateMarketingAsset({ prompt: advertPrompt, type: 'image' });
            setGeneratedAdverts(prev => [newAd, ...prev]);
            setAdvertPrompt('');
            success('New marketing asset generated successfully!');
        } catch (e: any) {
            toastError(e.message || 'Failed to generate advert');
        } finally {
            setIsGeneratingAdvert(false);
        }
    };

    const handleSendTenantTestSms = async () => {
        if (!tenantSmsTestPhone.trim()) {
            alert('Please enter a recipient phone number.');
            return;
        }
        setIsTestingTenantSms(true);
        try {
            const res = await apiService.sendSms(
                tenantSmsTestPhone.trim(), 
                "Test message from SuperAdmin Tenant SMS Gateway configuration.", 
                tenantSmsConfig,
                1,
                managingGatewayFor?.id
            );
            if (res.success) {
                alert('Test SMS sent successfully.');
            } else {
                alert(`Failed to send test SMS: ${res.message || 'Please check configurations.'}`);
            }
        } catch (error: any) {
            alert('Error sending test SMS: ' + error.message);
        } finally {
            setIsTestingTenantSms(false);
        }
    };

    const handleShareAdvert = async (platform: 'whatsapp' | 'twitter' | 'copy', ad: any) => {
        const text = `${ad.title}: ${ad.description}`;
        if (platform === 'whatsapp') {
            window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
        } else if (platform === 'twitter') {
            window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        } else if (platform === 'copy') {
            navigator.clipboard.writeText(text);
            success('Copied to clipboard!');
        }
        
        // Update local stats for visual feedback
        setGeneratedAdverts(prev => prev.map(a => a.id === ad.id ? { ...a, stats: { ...a.stats, shares: a.stats.shares + 1 } } : a));
    };
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
    const [isAddListingModalOpen, setIsAddListingModalOpen] = useState(false);
    const [selectedListingForEdit, setSelectedListingForEdit] = useState<CarListing | null>(null);

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
        institutionType: 'Education' as Institution['institutionType'],
        category: 'University',
        businessSubType: 'University',
        countyId: ''
    });

    // Timetable state
    const [timetableSubTab, setTimetableSubTab] = useState<'wizard' | 'scheduler' | 'calendar' | 'subjects'>('wizard');

    const fetchSchoolRegistry = useCallback(async () => {
        try {
            const data = await apiService.fetchFullRegistry();
            setSchoolRegistry(data);
        } catch (e) {
            console.error("Failed to fetch school registry:", e);
        }
    }, []);

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
        fetchSchoolRegistry();
    }, [activeTab, fetchHealth, fetchWithdrawalRequests, fetchSchoolRegistry]);

    const filteredInstitutions = useMemo(() => {
        const list = Array.isArray(institutions) ? institutions : [];
        const now = Date.now();
        const days = (d: number) => now - d * 24 * 60 * 60 * 1000;

        let result = list.filter(inst => {
            if (!inst) return false;
            // Time-based filter
            if (institutionTimeFilter === '7d') {
                const created = inst.createdAt ? new Date(inst.createdAt).getTime() : now;
                return created >= days(7);
            }
            if (institutionTimeFilter === '30d') {
                const created = inst.createdAt ? new Date(inst.createdAt).getTime() : now;
                return created >= days(30);
            }
            if (institutionTimeFilter === '90d') {
                const created = inst.createdAt ? new Date(inst.createdAt).getTime() : now;
                return created >= days(90);
            }
            if (institutionTimeFilter === 'active') return inst.status === 'active';
            if (institutionTimeFilter === 'suspended') return inst.status === 'suspended';
            return true;
        });

        if (institutionSearchQuery.trim()) {
            const lower = institutionSearchQuery.toLowerCase();
            result = result.filter(inst =>
                inst.name?.toLowerCase().includes(lower) ||
                inst.institutionCode?.toLowerCase().includes(lower)
            );
        }
        return result.sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
    }, [institutions, institutionSearchQuery, institutionTimeFilter]);

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
        enabledGateways: companyDetails?.enabledGateways || ['mpesa']
    });

    const [localSmsConfig, setLocalSmsConfig] = useState<SmsConfig>(companyDetails?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
    const [localEmailConfig, setLocalEmailConfig] = useState<EmailConfig>(companyDetails?.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
    const [localMpesaConfig, setLocalMpesaConfig] = useState<MpesaConfig>(companyDetails?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
    const [localSubConfig, setLocalSubConfig] = useState<SubscriptionConfig>(companyDetails?.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });
    const [localFtpConfig, setLocalFtpConfig] = useState<FtpConfig>(companyDetails?.ftpConfig || { host: '', port: 21, user: '', password: '', remoteRoot: '/', publicUrlRoot: '' });
    const [localKcbConfig, setLocalKcbConfig] = useState<KcbConfig>(companyDetails?.kcbConfig || { appKey: '', appSecret: '', environment: 'sandbox' });
    const [localCoopConfig, setLocalCoopConfig] = useState<CoopB2bConfig>(companyDetails?.coopConfig || { serviceName: 'KEWISCO SACCO', connectionID: 'TEST', connectionPassword: 'CoopTest', institutionCode: '210001918' });
    const [localGoogleDriveConfig, setLocalGoogleDriveConfig] = useState<GoogleDriveConfig>(companyDetails?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', folderId: '', isActive: false });
    const [isTestingGoogleDrive, setIsTestingGoogleDrive] = useState(false);
    const [isTestingDriveUpload, setIsTestingDriveUpload] = useState(false);

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
                enabledGateways: companyDetails.enabledGateways || ['mpesa']
            });
            setLocalSmsConfig(companyDetails.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '', smsUnitPrice: 1, minSmsUnits: 100 });
            setLocalEmailConfig(companyDetails.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
            setLocalMpesaConfig(companyDetails.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
            setLocalSubConfig(companyDetails.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });
            setLocalFtpConfig(companyDetails.ftpConfig || { host: '', port: 21, user: '', password: '', remoteRoot: '/', publicUrlRoot: '' });
            setLocalKcbConfig(companyDetails.kcbConfig || { appKey: '', appSecret: '', environment: 'sandbox' });
            setLocalCoopConfig(companyDetails.coopConfig || { serviceName: 'KEWISCO SACCO', connectionID: 'TEST', connectionPassword: 'CoopTest', institutionCode: '210001918' });
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

    const handleGoogleDriveTestUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setIsTestingDriveUpload(true);
        try {
            const res = await apiService.uploadToGoogleDrive(file, 'Test_Uploads', { config: localGoogleDriveConfig });
            if (res.success) {
                alert(`Google Drive Upload Successful!\n\nReference: ${res.fileId}\nURL: ${res.fileUrl}`);
            } else {
                alert(`Upload Failed: ${res.error || 'Review permissions and Folder ID'}`);
            }
        } catch (err: any) {
            alert(`Upload test network error: ${err.message}`);
        } finally {
            setIsTestingDriveUpload(false);
            e.target.value = '';
        }
    };




    const handleSaveGlobalConfigs = async () => {
        setIsSavingConfigs(true);
        try {
            if (props.onUpdateCompanyDetails) {
                await props.onUpdateCompanyDetails({
                    ...companyDetails,
                    ...localCompanyInfo,
                    enabledGateways: localCompanyInfo.enabledGateways,
                    showcaseConfig: localCompanyInfo.showcaseConfig,
                    smsConfig: localSmsConfig,
                    emailConfig: localEmailConfig,
                    mpesaConfig: localMpesaConfig,
                    subscriptionConfig: localSubConfig,
                    kcbConfig: localKcbConfig,
                    coopConfig: localCoopConfig,
                    chatAssistantConfig: {
                        ...companyDetails?.chatAssistantConfig,
                        welcomeMessage: localCompanyInfo.welcomeMessage,
                        enabled: localCompanyInfo.chatEnabled
                    },
                    enforceGlobalOtp: localCompanyInfo.enforceGlobalOtp,
                    ftpConfig: localFtpConfig,
                    googleDriveConfig: localGoogleDriveConfig
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

    const handleTestMpesa = async () => {
        if (!testRecipient) return alert("Enter a phone number for STK Push test.");
        setIsTesting(true);
        try {
            const result = await apiService.post('/api/payments/stk-push', {
                phoneNumber: testRecipient,
                amount: 1,
                accountReference: 'EduAI-Test',
                transactionDesc: 'Platform Connectivity Test',
                config: localMpesaConfig
            });
            if (result.ResponseCode === '0' || result.success) {
                alert("STK Push initiated successfully. Check your phone.");
            } else {
                alert(`STK Push failed: ${result.CustomerMessage || result.message || 'Unknown error'}`);
            }
        } catch (e: any) {
            console.error("Mpesa Test Error:", e);
            alert(`Mpesa Gateway test failed: ${e.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const handleTestKcb = async () => {
        if (!testRecipient) return alert("Enter a phone number for KCB STK Push test.");
        setIsTesting(true);
        try {
            const result = await apiService.post('/api/payments/kcb-stk-push', {
                phoneNumber: testRecipient,
                amount: 1,
                accountReference: 'EduAI-KCB-Test',
                transactionDesc: 'KCB Connectivity Test',
                config: localKcbConfig
            });
            if (result.success || result.ResponseCode === '0') {
                const checkoutRequestId = result.CheckoutRequestID || `KCB_CO_${Date.now()}`;
                const txnId = `KCB_${Date.now()}`;
                const targetInstId = props.institutions?.[0]?.id || props.currentUser?.institutionId || '';

                // Step 1: Save the transaction as pending
                await apiService.saveModuleRecord('mpesa_transactions', {
                    id: txnId,
                    transactionId: result.CheckoutRequestID || `TXN_KCB_${Date.now()}`,
                    checkoutRequestId: checkoutRequestId,
                    institutionId: targetInstId,
                    amount: 1,
                    phoneNumber: testRecipient,
                    payerName: 'KCB Platform Test Payer',
                    status: 'pending',
                    metadata: { provider: 'kcb' },
                    timestamp: new Date().toISOString()
                });

                // Step 2: Auto-query status from KCB to confirm completion
                // (Required for sandbox/mock mode since there's no real callback)
                let finalStatus = 'pending';
                let mpesaRef = '';
                try {
                    const statusResult = await apiService.post('/api/payments/kcb-query', {
                        checkoutRequestId,
                        config: localKcbConfig
                    });
                    if (statusResult.success) {
                        finalStatus = statusResult.status === 'COMPLETED' ? 'completed' : 'pending';
                        mpesaRef = statusResult.mpesaReceiptNumber || '';

                        // Step 3: Update the transaction with the confirmed status & receipt
                        await apiService.saveModuleRecord('mpesa_transactions', {
                            id: txnId,
                            checkoutRequestId: checkoutRequestId,
                            status: finalStatus,
                            ...(mpesaRef ? { transactionId: mpesaRef } : {})
                        });
                    }
                } catch (queryErr) {
                    console.warn('[KCB Test] Auto-status query failed (non-critical):', queryErr);
                }

                const refLine = mpesaRef ? `\nM-Pesa Ref: ${mpesaRef}` : '';
                const statusLine = `\nTransaction Status: ${finalStatus.toUpperCase()}`;
                alert(`KCB STK Push initiated successfully. Check your phone.${statusLine}${refLine}\n\nBank Response:\n${JSON.stringify(result.rawResponse || result, null, 2)}`);
                if (props.onRefreshData) props.onRefreshData();
            } else {
                alert(`KCB STK Push failed: ${result.message || 'Unknown error'}\n\nBank Response:\n${JSON.stringify(result.rawResponse || result, null, 2)}`);
            }
        } catch (e: any) {
            console.error("KCB Test Error:", e);
            alert(`KCB Gateway test failed: ${e.message}`);
        } finally {
            setIsTesting(false);
        }
    };

    const handleQueryKcbStatus = async (checkoutRequestId: string) => {
        setIsTesting(true);
        try {
            const result = await apiService.post('/api/payments/kcb-query', {
                checkoutRequestId,
                config: localKcbConfig
            });
            if (result.success) {
                const receiptLine = result.mpesaReceiptNumber ? `\nM-Pesa Ref: ${result.mpesaReceiptNumber}` : '';
                alert(`Transaction Status: ${result.status}\nDetails: ${result.message}${receiptLine}\n\nBank Response:\n${JSON.stringify(result.rawResponse || result, null, 2)}`);

                // Persist receipt number into mpesa_transactions if we got one
                if (result.mpesaReceiptNumber) {
                    await apiService.saveModuleRecord('mpesa_transactions', {
                        checkoutRequestId,
                        transactionId: result.mpesaReceiptNumber,
                        status: result.status === 'COMPLETED' ? 'completed' : 'pending'
                    });
                }
                if (props.onRefreshData) props.onRefreshData();
            } else {
                alert(`Query failed: ${result.message || 'Unknown error'}\n\nBank Response:\n${JSON.stringify(result.rawResponse || result, null, 2)}`);
            }
        } catch (e: any) {
            alert(`KCB Query Error: ${e.message}`);
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
                if (props.onAddInstitution) {
                    await props.onAddInstitution({
                        name: newInstData.name,
                        email: newInstData.email,
                        phoneNumber: newInstData.phoneNumber,
                        institutionType: newInstData.institutionType,
                        category: newInstData.category,
                        businessSubType: newInstData.category, // Mirror for legacy support
                        countyId: newInstData.countyId || undefined,
                        status: isReseller ? 'active' : 'trial',
                        trialEndsAt: isReseller ? undefined : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                        institutionCode: `INST-${Date.now().toString().slice(-4)}`,
                        themeColor: '#4f46e5',
                        logoUrl: null,
                        useAllocationRequests: true,
                        smsConfig: props.smsConfig
                    });
                }
                setIsAddingInstitution(false);
                setNewInstData({ name: '', email: '', phoneNumber: '', institutionType: 'Education', category: 'University', businessSubType: 'University', countyId: '' });
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
        { key: 'marketing', label: 'Marketing', icon: <MegaphoneIcon className="w-5 h-5 mr-2" /> },
        { key: 'academics', label: 'Academics', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> },
        { key: 'hospitality', label: 'Hospitality Hub', icon: <Palmtree className="w-5 h-5 mr-2" /> },
        { key: 'auto_marketplace', label: 'Auto Marketplace', icon: <CarIcon className="w-5 h-5 mr-2" /> },
        { key: 'external_module', label: 'External', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
        { key: 'all_users', label: 'Global Users', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
        { key: 'communications', label: 'Communications', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
        { key: 'user_activity', label: 'Audit Trail', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
        { key: 'demo_requests', label: 'Demo Leads', icon: <CalendarIcon className="w-5 h-5 mr-2" /> },
        { key: 'lead_scout', label: 'Gemini 1.5 Scout', icon: <SparklesIcon className="w-5 h-5 mr-2 text-indigo-500" /> },
        { key: 'settings', label: 'Global Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
        { key: 'reports', label: 'Reports', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
        { key: 'portal_links', label: 'Portal Links', icon: <GlobeAltIcon className="w-5 h-5 mr-2 text-emerald-500" /> },
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

    const isSchool = useMemo(() => isSchoolInstitution(currentInstitution), [currentInstitution]);

    const perspectiveOptions = [
        { role: 'admin', label: 'Timetable', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'academics_officer', label: 'Academics Module', icon: <AcademicCapIcon className="w-6 h-6" />, color: 'bg-violet-50 text-violet-600' },
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
        { role: 'pharmacy_admin', label: 'Modern Pharmacy', icon: <CrossIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-600' },
        { role: 'cooperative_manager', label: 'Cooperative Module', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'coop_chairman', label: 'Coop Chairman (Approvals)', icon: <CheckCircleIcon className="w-5 h-5 text-indigo-600" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'farmer', label: 'Farmer Portal', icon: <UserGroupIcon className="w-5 h-5 text-emerald-600" />, color: 'bg-emerald-50 text-emerald-600' },
        { role: 'rider', label: 'Rider Portal', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-orange-50 text-orange-600' },
        { role: 'family_admin', label: 'Family & Heritage', icon: <History className="w-6 h-6" />, color: 'bg-amber-50 text-amber-600' },
        { role: 'church_admin', label: 'Church System', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-700' },
        { role: 'alumni_admin', label: 'Alumnae Network', icon: <UserGroupIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'campaign_admin', label: 'Political Campaign', icon: <MegaphoneIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { role: 'marketplace', label: 'Public Marketplace', icon: <ShoppingCartIcon className="w-6 h-6" />, color: 'bg-orange-50 text-orange-600', isService: true }
    ].filter(opt => {
        const instType = selectedTenantForPerspective?.institutionType;
        const subType = selectedTenantForPerspective?.businessSubType;
        const category = (selectedTenantForPerspective as any)?.category;
        
        const isEdu = instType === 'Education' || ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'TVET', 'Kindergarten'].includes(instType || '');
        const isChurch = instType === 'Church' || subType === 'Church';
        const isPolitics = instType === 'Political Campaign' || category === 'Political Campaign';
        
        if (opt.role === 'alumni_admin') return isEdu;
        if (opt.role === 'campaign_admin') return isPolitics;

        // Only show Health System perspective for HIS institutions
        if (opt.role === 'his_admin') {
            return instType === 'HIS';
        }

        // Show Church perspective for Church institutions OR for Super Admin simulation
        if (opt.role === 'church_admin') {
            return true; // Super Admins should always see all simulation options
        }

        if (isEdu) {
            const eduAllowed = ['admin', 'academics_officer', 'security', 'store', 'transport_admin', 'transport_assistant', 'boarding_master', 'info_desk', 'librarian', 'parent', 'student', 'lecturer'];
            return eduAllowed.includes(opt.role);
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
                <StudentView 
                    user={currentUser} 
                    users={users} 
                    courses={courses} 
                    subjects={subjects} 
                    rooms={rooms} 
                    enrollmentRequests={enrollmentRequests} 
                    generatedTimetable={generatedTimetable} 
                    examTimetable={examTimetable} 
                    getSubjectById={props.getSubjectById || ((id: string) => undefined)} 
                    getRoomById={props.getRoomById || ((id: string) => undefined)} 
                    getLecturerById={props.getLecturerById || ((id: string) => undefined)} 
                    timetableSettings={timetableSettings || INITIAL_TIMETABLE_SETTINGS} 
                    studentCheckIns={props.studentCheckIns || {}} 
                    onStudentLessonCheckIn={props.onAddTransaction as any} 
                    letterheadConfig={letterheadConfig || { headerImageUrl: null, stampImageUrl: null }} 
                    footerImageUrl={footerImageUrl || null} 
                    logoUrl={logoUrl || null} 
                    buildings={buildings} 
                    onAddParent={props.onAddParent as any} 
                    onDeleteParent={props.onDeleteParent as any} 
                    departments={departments} 
                    onSubmitEnrollmentRequest={async (sids: string[], sig: string | null) => { }} 
                    assignments={assignments} 
                    submissions={submissions} 
                    onAddSubmission={async (d: any) => { await apiService.saveModuleRecord('submissions', { ...d, id: `subm_${Date.now()}`, institutionId: currentUser.institutionId }); }} 
                    lessonRatings={lessonRatings} 
                    onAddLessonRating={() => { }} 
                    onRateLesson={() => { }} 
                    onAddFeedback={() => { }} 
                    feedbackSubmissions={feedbackSubmissions} 
                    studentAbsenceRequests={studentAbsenceRequests} 
                    onSubmitStudentAbsenceRequest={() => { }} 
                    finalTimetableUrl={finalTimetableUrl || null} 
                    taAssignments={props.onUpdateFeeStructures as any} 
                    userTasks={userTasks} 
                    onAddTask={() => { }} 
                    onUpdateTask={() => { }} 
                    onDeleteTask={() => { }} 
                    currentInstitution={currentInstitution || institutions[0]} 
                    assessments={assessments} 
                    assessmentMarks={assessmentMarks} 
                    studentAttendances={studentAttendances || []} 
                    books={[]}
                />
            </React.Suspense>
        );
    }

    if (activeRole === 'academics_officer') {
        return (
            <React.Suspense fallback={<div className="flex h-screen items-center justify-center bg-white dark:bg-slate-900"><div className="w-12 h-12 border-4 border-indigo-50 border-t-transparent rounded-full animate-spin"></div></div>}>
                <AcademicsOfficerView currentUser={currentUser} subjects={subjects} onUpdateSubject={props.onUpdateSubject as any} courses={courses} onUpdateCourse={props.onUpdateCourse} users={users} rooms={rooms} onUpdateRoom={props.onUpdateRoom} onDeleteRoom={props.onDeleteRoom} onAddRoom={props.onAddRoom} departments={departments} onAddDepartment={props.onAddDepartment} onUpdateDepartment={props.onUpdateDepartment} onDeleteDepartment={props.onDeleteDepartment} onImportDepartments={props.onImportDepartments} activeAcademicYear={activeAcademicYear} activeSemester={activeSemester} onExamTimetableGenerated={async (entries: any, ay: any, sem: any) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries)} examTimetable={examTimetable} getSubjectById={props.getSubjectById || ((id: string) => undefined)} getLecturerById={props.getLecturerById || ((id: string) => undefined)} getRoomById={props.getRoomById || ((id: string) => undefined)} courseSizes={courseSizes} academicYears={academicYears} semesters={semesters} timetableSettings={timetableSettings!} buildings={buildings} onUpdateBuilding={props.onUpdateBuilding} onDeleteBuilding={props.onDeleteBuilding} onAddBuilding={props.onAddBuilding} academicLevels={academicLevels} letterheadConfig={letterheadConfig} logoUrl={logoUrl} footerImageUrl={footerImageUrl} emailConfig={emailConfig} onSaveEmailConfig={props.onSaveEmailConfig as any} onSendTestEmail={props.onSendTestEmail as any} currentInstitution={currentInstitution} examTimetableSettings={examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS} onSaveExamTimetableSettings={props.onSaveExamTimetableSettings as any} onAddAcademicYear={props.onAddAcademicYear} onUpdateAcademicYear={props.onUpdateAcademicYear} onDeleteAcademicYear={props.onDeleteAcademicYear} onAddSemester={props.onAddSemester} onUpdateSemester={props.onUpdateSemester} onDeleteSemester={props.onDeleteSemester} onSaveTimetableSettings={props.onSaveTimetableSettings} onImportRooms={props.onImportRooms} smsConfig={smsConfig as any} themeColor={themeColor} allocations={allocations} timeOffRequests={timeOffRequests} lessonRatings={lessonRatings} assessments={props.assessments} marks={props.assessmentMarks as any} activityLog={props.activityLog} incidents={props.incidents} onAddIncident={props.onAddIncident} />
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
                    onConfirmCollection={props.onConfirmCollection || (async (_id: string, _qty: number) => { })}
                    onApproveCollection={props.onApproveCollection || (async (_id: string, _status: 'approved' | 'rejected') => { })}
                    onAddInstitution={props.onAddInstitution || (() => { })}
                    onDeleteInstitution={props.onDeleteInstitution || (() => { })}
                    onToggleInstitutionStatus={props.onToggleInstitutionStatus || (() => { })}
                    onLoginAsAdmin={props.onLoginAsAdmin || (() => { })}
                    onGenerateReceipt={props.onGenerateReceipt || (() => { })}
                    notifications={props.notifications || []}
                    onAddTimeOffRequest={props.onAddTimeOffRequest || (async () => { })}
                    onLogAction={props.onLogAction || (async () => { })}
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
        <div className="min-h-screen bg-[#020617] text-slate-100 p-6 md:p-10 font-sans selection:bg-indigo-500/30">
            {/* ── Cyber Command Header ── */}
            <div className="sticky top-0 z-[100] flex flex-col md:flex-row items-center justify-between mb-12 p-3 bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2.5rem] shadow-2xl shadow-indigo-500/10 gap-6">
                <div className="flex items-center gap-6 px-6">
                    <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-500/40">
                        <ShieldCheckIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tighter text-white">
                            Cyber <span className="text-indigo-400 italic">Command</span>
                        </h1>
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Root Infrastructure Console</p>
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar-horizontal w-full md:w-auto px-4 md:px-0 pb-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.key}
                            onClick={() => {
                                setActiveTab(tab.key as any);
                                if (tab.key !== 'settings') setRequestedSettingsTab(undefined);
                            }}
                            className={`flex items-center gap-3 py-4 px-8 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all whitespace-nowrap group/tab ${activeTab === tab.key
                                ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/40 scale-105'
                                : 'text-slate-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <span className={`${activeTab === tab.key ? 'text-white' : 'text-indigo-400 group-hover:scale-110 transition-transform'}`}>
                                {tab.icon}
                            </span>
                            {tab.label}
                            {tab.key === 'interactions' && stats.totalActionable > 0 && (
                                <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full shadow-lg animate-pulse ml-1">
                                    {stats.totalActionable}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <main className="animate-fade-in">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        {/* stats.totalActionable alert hidden as per request to hide interactions */}

                        <div className="bg-slate-950 p-12 rounded-[3.5rem] text-white shadow-2xl border border-white/5 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 rounded-full -translate-y-48 translate-x-48 blur-[100px] group-hover:bg-indigo-600/20 transition-all duration-700"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
                                <div className="space-y-4 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 backdrop-blur-md">
                                        <SparklesIcon className="w-4 h-4" />
                                        Advanced Infrastructure Hub
                                    </div>
                                    <h2 className="text-5xl font-black tracking-tighter uppercase leading-none">
                                        System <span className="text-indigo-500 italic">Simulation</span>
                                    </h2>
                                    <p className="text-slate-400 font-medium max-w-xl text-lg">
                                        Deploy virtual environments and simulate specialized modules across the entire EduAI ecosystem to verify integrity.
                                    </p>
                                </div>
                                <button
                                    onClick={() => {
                                        const demoInst = institutions.find(i => i.institutionCode === 'INST001') || institutions[0];
                                        setSelectedTenantForPerspective(demoInst);
                                        setIsPerspectiveModalOpen(true);
                                    }}
                                    className="bg-indigo-600 text-white hover:bg-indigo-500 font-black text-[10px] uppercase tracking-[0.3em] px-10 py-5 rounded-[2rem] transition-all shadow-2xl shadow-indigo-500/40 active:scale-95 whitespace-nowrap border border-indigo-400/20"
                                >
                                    Launch Virtual Console
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <UserGroupIcon className="w-16 h-16" />
                                </div>
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Network Faculty</h3>
                                <p className="text-5xl font-black text-white tracking-tighter">
                                    {(props.users || []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin').length}
                                </p>
                            </div>
                            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <Database className="w-16 h-16" />
                                </div>
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Registry Load</h3>
                                <div className="flex flex-col">
                                    <p className="text-5xl font-black text-indigo-500 tracking-tighter">{(props.allocations || []).length}</p>
                                    <p className="text-[10px] font-black text-indigo-400/60 uppercase tracking-widest mt-2">
                                        Active Academic Units
                                    </p>
                                </div>
                            </div>
                            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <AcademicCapIcon className="w-16 h-16" />
                                </div>
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Total Learners</h3>
                                <p className="text-5xl font-black text-white tracking-tighter">
                                    {(props.users || []).filter(u => u && u.role === 'student').length}
                                </p>
                            </div>
                            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <Zap className="w-16 h-16" />
                                </div>
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">SMS Liquidity</h3>
                                <p className={`text-5xl font-black tracking-tighter ${(institutions || []).reduce((sum, inst) => sum + (inst.smsBalance ?? 0), 0) < 500
                                    ? 'text-amber-500'
                                    : 'text-sky-500'
                                    }`}>
                                    {(institutions || []).reduce((sum, inst) => sum + (inst.smsBalance ?? 0), 0).toLocaleString()}
                                </p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2 italic">Aggregated Units</p>
                            </div>
                        </div>


                        <div className="bg-slate-900/40 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl backdrop-blur-xl">
                            <h3 className="text-2xl font-black tracking-tighter uppercase mb-10 flex items-center gap-4 text-white">
                                <div className="w-2 h-8 bg-indigo-500 rounded-full"></div>
                                Command Center <span className="text-indigo-500 italic">Directives</span>
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                                <button
                                    onClick={() => setActiveTab('institutions')}
                                    className="flex flex-col items-start p-8 bg-slate-900/80 rounded-[2.5rem] border border-white/5 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group text-left shadow-xl"
                                >
                                    <div className="p-4 bg-indigo-600 rounded-2xl shadow-2xl shadow-indigo-500/20 text-white mb-6 group-hover:scale-110 transition-transform">
                                        <BuildingOfficeIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-white">Tenant Manager</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">Deploy Infrastructure</p>
                                </button>
                                <button
                                    onClick={() => setActiveTab('all_users')}
                                    className="flex flex-col items-start p-8 bg-slate-900/80 rounded-[2.5rem] border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all group text-left shadow-xl"
                                >
                                    <div className="p-4 bg-emerald-600 rounded-2xl shadow-2xl shadow-emerald-500/20 text-white mb-6 group-hover:scale-110 transition-transform">
                                        <UserGroupIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-white">User Directory</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">Global Identity</p>
                                </button>
                                <button
                                    onClick={() => setActiveTab('reports')}
                                    className="flex flex-col items-start p-8 bg-slate-900/80 rounded-[2.5rem] border border-white/5 hover:border-sky-500/50 hover:bg-sky-500/5 transition-all group text-left shadow-xl"
                                >
                                    <div className="p-4 bg-sky-600 rounded-2xl shadow-2xl shadow-sky-500/20 text-white mb-6 group-hover:scale-110 transition-transform">
                                        <ChartBarIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-white">System Analytics</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">Core Performance</p>
                                </button>
                                <button
                                    onClick={() => {
                                        const systemInst = (institutions || []).find(i => i.id === 'SYSTEM' || i.name.toLowerCase().includes('system') || i.name.toLowerCase().includes('eduai'));
                                        if (systemInst) {
                                            onLoginAsAdmin?.(systemInst.id);
                                        } else if (institutions.length > 0) {
                                            onLoginAsAdmin?.(institutions[0].id);
                                        }
                                    }}
                                    className="flex flex-col items-start p-8 bg-slate-900/80 rounded-[2.5rem] border border-white/5 hover:border-amber-500/50 hover:bg-amber-500/5 transition-all group text-left shadow-xl"
                                >
                                    <div className="p-4 bg-amber-600 rounded-2xl shadow-2xl shadow-amber-500/20 text-white mb-6 group-hover:scale-110 transition-transform">
                                        <SparklesIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-white">Admin Dashboard</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">Institutional ERP</p>
                                </button>
                                <button
                                    onClick={() => setRequestedSettingsTab('billing')}
                                    className="flex flex-col items-start p-8 bg-slate-900/80 rounded-[2.5rem] border border-white/5 hover:border-rose-500/50 hover:bg-rose-500/5 transition-all group text-left shadow-xl"
                                >
                                    <div className="p-4 bg-rose-600 rounded-2xl shadow-2xl shadow-rose-500/20 text-white mb-6 group-hover:scale-110 transition-transform">
                                        <BanknotesIcon className="w-6 h-6" />
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-tight text-white">Revenue & Billing</span>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-2">Platform Monetization</p>
                                </button>
                            </div>
                        </div>


                        <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                    <ClipboardListIcon className="w-6 h-6 text-indigo-400" />
                                </div>
                                <h3 className="text-2xl font-black tracking-tighter uppercase text-white">Administrative <span className="text-indigo-500 italic">Audit</span></h3>
                            </div>
                            <div className="space-y-4">
                                {(props.activityLog || []).slice(0, 5).map((log: ActivityLog) => (
                                    <div key={log.id} className="flex justify-between items-center p-6 bg-slate-950/40 rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="w-1.5 h-10 bg-indigo-500/50 rounded-full"></div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-200">{String(log.action)}</p>
                                                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">
                                                    <span className="text-white">{String(log.userName)}</span>
                                                    <span className="text-indigo-500 font-bold ml-2">@{log.institutionName || 'SYSTEM'}</span>
                                                    <span className="mx-2 text-slate-800">•</span>
                                                    {new Date(log.timestamp).toLocaleTimeString()}
                                                </p>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-mono text-slate-600 bg-slate-900 px-3 py-1 rounded-full border border-white/5">{new Date(log.timestamp).toLocaleDateString()}</span>
                                    </div>
                                ))}
                                {(!props.activityLog || props.activityLog.length === 0) && (
                                    <div className="text-center py-16 border-2 border-dashed border-white/5 rounded-[2.5rem]">
                                        <p className="text-slate-600 text-sm font-black uppercase tracking-[0.3em]">No telemetry detected</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'academics' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <BookOpenIcon className="w-16 h-16" />
                                </div>
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Global Subjects</h3>
                                <p className="text-5xl font-black text-white tracking-tighter">{(props.subjects || []).length}</p>
                            </div>
                            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <RectangleStackIcon className="w-16 h-16" />
                                </div>
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Curriculum Blocks</h3>
                                <p className="text-5xl font-black text-indigo-500 tracking-tighter">{(props.courses || []).length}</p>
                            </div>
                            <div className="bg-slate-900/50 p-10 rounded-[3rem] border border-white/5 shadow-2xl relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-20 transition-opacity">
                                    <UserIcon className="w-16 h-16" />
                                </div>
                                <h3 className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Teaching Assets</h3>
                                <p className="text-5xl font-black text-emerald-500 tracking-tighter">{(props.users || []).filter(u => u.role === 'lecturer' || u.role === 'teacher').length}</p>
                            </div>
                        </div>

                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h3 className="text-xl font-black tracking-tighter uppercase">Academic Registry Management</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Global oversight of subjects and curriculum distribution</p>
                                </div>
                            </div>
                            
                            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] p-10 border border-slate-100 dark:border-slate-800 flex flex-col items-center text-center">
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm mb-6">
                                    <AcademicCapIcon className="w-12 h-12 text-indigo-600" />
                                </div>
                                <h4 className="text-lg font-black uppercase tracking-tight mb-2">Centralized Academic Control</h4>
                                <p className="text-sm text-slate-500 max-w-md mb-8">
                                    Use the Simulation Mode to manage academic year settings, subject registries, and exam timetables for specific institutional tenants.
                                </p>
                                <button 
                                    onClick={() => {
                                        const demoInst = institutions.find(i => i.institutionCode === 'INST001') || institutions[0];
                                        setSelectedTenantForPerspective(demoInst);
                                        setIsPerspectiveModalOpen(true);
                                    }}
                                    className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 transition-all hover:scale-105"
                                >
                                    Open Academics Simulator
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'institutions' && (
                    <div className="space-y-6 animate-fade-in-up">
                        <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl w-fit mb-6 overflow-x-auto max-w-full custom-scrollbar-horizontal pb-2">
                            <button
                                onClick={() => setInstitutionsSubTab('list')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${institutionsSubTab === 'list' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Tenant Registry
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('branding')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${institutionsSubTab === 'branding' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Branding Prices
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('counties')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'counties' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Counties
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('political')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'political' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Political Data
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('medical')}
                                className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${institutionsSubTab === 'medical' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                Medical Data
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
                            <button
                                onClick={() => setInstitutionsSubTab('registry')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'registry' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                School Registry
                            </button>
                            <button
                                onClick={() => setInstitutionsSubTab('scouting')}
                                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${institutionsSubTab === 'scouting' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                AI Scout
                            </button>
                        </div>

                        {institutionsSubTab === 'branding' && (
                            <div className="bg-white dark:bg-slate-800 p-12 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in">
                                <div className="flex justify-between items-center mb-12">
                                    <div>
                                        <h3 className="text-3xl font-black uppercase tracking-tighter">Branding Economics</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manage global prices for candidate branding packages</p>
                                    </div>
                                    <SparklesIcon className="w-12 h-12 text-indigo-600" />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 ml-1">Base Branding Price (KES)</label>
                                            <input 
                                                type="number" 
                                                defaultValue={5000}
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-black text-indigo-600 text-2xl"
                                                onBlur={async (e) => {
                                                    await apiService.saveModuleRecord('branding_price_settings', { id: 'global', base_price: Number(e.target.value) });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1.5 ml-1">Renewal Price (KES)</label>
                                            <input 
                                                type="number" 
                                                defaultValue={2500}
                                                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl font-black text-slate-600 text-2xl"
                                                onBlur={async (e) => {
                                                    await apiService.saveModuleRecord('branding_price_settings', { id: 'global', renew_price: Number(e.target.value) });
                                                }}
                                            />
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                        <h4 className="text-xs font-black uppercase tracking-widest mb-4">Included Features</h4>
                                        <div className="space-y-3">
                                            {['Branded SMS Sender ID', 'AI Poster Generator', 'Priority Support'].map(f => (
                                                <div key={f} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-50 dark:border-slate-700">
                                                    <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                                                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">{f}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <button className="w-full mt-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-100">
                                            Update Feature List
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {institutionsSubTab === 'political' && (
                            <PoliticalMetadataManager />
                        )}

                        {institutionsSubTab === 'medical' && (
                            <MedicalRegistryManager />
                        )}

                        {institutionsSubTab === 'list' && (
                            <>
                                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter">Institutional Tenants</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform Multi-Tenancy Registry · {filteredInstitutions.length} accounts</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative group">
                                            <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                            <input
                                                type="text"
                                                placeholder="Search by name or code..."
                                                value={institutionSearchQuery}
                                                onChange={e => setInstitutionSearchQuery(e.target.value)}
                                                className="w-72 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-[2rem] pl-12 pr-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all text-slate-900 dark:text-white shadow-sm hover:shadow-md"
                                            />
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

                                {/* ── Time-Based Group Filter Tabs ── */}
                                {(() => {
                                    const all = Array.isArray(institutions) ? institutions : [];
                                    const now = Date.now();
                                    const daysAgo = (d: number) => now - d * 24 * 60 * 60 * 1000;
                                    const counts = {
                                        all: all.length,
                                        '7d': all.filter(i => {
                                            const created = i?.createdAt ? new Date(i.createdAt).getTime() : now;
                                            return created >= daysAgo(7);
                                        }).length,
                                        '30d': all.filter(i => {
                                            const created = i?.createdAt ? new Date(i.createdAt).getTime() : now;
                                            return created >= daysAgo(30);
                                        }).length,
                                        '90d': all.filter(i => {
                                            const created = i?.createdAt ? new Date(i.createdAt).getTime() : now;
                                            return created >= daysAgo(90);
                                        }).length,
                                        active: all.filter(i => i?.status === 'active').length,
                                        suspended: all.filter(i => i?.status === 'suspended').length,
                                    };
                                    const tabs: { key: typeof institutionTimeFilter; label: string; color: string }[] = [
                                        { key: 'all',       label: 'All Accounts',        color: 'text-slate-600 dark:text-slate-300' },
                                        { key: '7d',        label: 'Last 7 Days',         color: 'text-emerald-600 dark:text-emerald-400' },
                                        { key: '30d',       label: 'Last 30 Days',        color: 'text-blue-600 dark:text-blue-400' },
                                        { key: '90d',       label: 'Last 90 Days',        color: 'text-indigo-600 dark:text-indigo-400' },
                                        { key: 'active',    label: 'Active',              color: 'text-green-600 dark:text-green-400' },
                                        { key: 'suspended', label: 'Suspended',           color: 'text-red-600 dark:text-red-400' },
                                    ];
                                    return (
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {tabs.map(tab => (
                                                <button
                                                    key={tab.key}
                                                    onClick={() => setInstitutionTimeFilter(tab.key)}
                                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                                                        institutionTimeFilter === tab.key
                                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100'
                                                            : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-indigo-300 hover:text-indigo-600'
                                                    }`}
                                                >
                                                    {tab.key === 'all' && <span className={institutionTimeFilter === tab.key ? 'text-white' : tab.color}>◉</span>}
                                                    {tab.key === '7d' && <span className={institutionTimeFilter === tab.key ? 'text-white' : tab.color}>🆕</span>}
                                                    {tab.key === '30d' && <span className={institutionTimeFilter === tab.key ? 'text-white' : tab.color}>📅</span>}
                                                    {tab.key === '90d' && <span className={institutionTimeFilter === tab.key ? 'text-white' : tab.color}>📆</span>}
                                                    {tab.key === 'active' && <span className={institutionTimeFilter === tab.key ? 'text-white' : tab.color}>✅</span>}
                                                    {tab.key === 'suspended' && <span className={institutionTimeFilter === tab.key ? 'text-white' : tab.color}>🚫</span>}
                                                    {tab.label}
                                                    <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] font-black ${
                                                        institutionTimeFilter === tab.key
                                                            ? 'bg-white/20 text-white'
                                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                                    }`}>
                                                        {counts[tab.key]}
                                                    </span>
                                                </button>
                                            ))}
                                        </div>
                                    );
                                })()}

                                {isAddingInstitution && (
                                    <form onSubmit={handleAddInstitutionSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in-up mb-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Institution Name</label>
                                                <input type="text" value={newInstData.name} onChange={e => setNewInstData({ ...newInstData, name: e.target.value })} className="form-input text-slate-900 dark:text-white" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Admin Email</label>
                                                <input type="email" value={newInstData.email} onChange={e => setNewInstData({ ...newInstData, email: e.target.value })} className="form-input text-slate-900 dark:text-white" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Phone Number</label>
                                                <input type="tel" value={newInstData.phoneNumber} onChange={e => setNewInstData({ ...newInstData, phoneNumber: e.target.value })} className="form-input text-slate-900 dark:text-white" required />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Institution Group / Type</label>
                                                <select
                                                    value={newInstData.institutionType}
                                                    onChange={e => {
                                                        const type = e.target.value as any;
                                                        let category = '';
                                                        if (type === 'Education') category = 'Primary';
                                                        if (type === 'Business') category = 'Agrovet';
                                                        if (type === 'HIS') category = 'Hospital/Clinic';
                                                        if (type === 'Law Firm') category = 'Law Firm';
                                                        if (type === 'Broadcaster') category = 'TV/Radio Station';
                                                        if (type === 'Political Campaign') category = 'Political Campaign Management';
                                                        setNewInstData({ ...newInstData, institutionType: type, category: category, businessSubType: category });
                                                    }}
                                                    className="form-select font-black text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-800"
                                                >                                                    <option value="Education">Education Sector</option>
                                                    <option value="HIS">Health Sector (HIS)</option>
                                                    <option value="Pharmacy">Pharmacy / Chemist</option>
                                                    <option value="Business">Business Ecosystem</option>
                                                    <option value="Cooperative">Agriculture / Cooperative</option>
                                                    <option value="SACCO">Financial / SACCO</option>
                                                    <option value="Law Firm">Legal / Law Firm</option>
                                                    <option value="Logistics">Transport & Logistics</option>
                                                    <option value="Community">Community & Politics</option>
                                                    <option value="Political Campaign">Political / Election Campaign Hub</option>
                                                    <option value="Church">Religious / Church</option>
                                                    <option value="Broadcaster">Media / Broadcaster</option>
                                                    <option value="Hospitality">Tourism & Hospitality</option>
                                                    <option value="Reseller">Reseller Agency</option>

                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Assigned County (Optional)</label>
                                                <select
                                                    value={newInstData.countyId}
                                                    onChange={e => setNewInstData({ ...newInstData, countyId: e.target.value })}
                                                    className="form-select border-indigo-100 dark:border-indigo-900/30 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                                                >
                                                    <option value="">No County Assigned</option>
                                                    {counties.map(c => (
                                                        <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {newInstData.institutionType === 'HIS' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Health Sector Category</label>
                                                    <select
                                                        value={newInstData.category}
                                                        onChange={e => setNewInstData({ ...newInstData, category: e.target.value, businessSubType: e.target.value })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="Hospital/Clinic">Hospital / Clinic (Standard)</option>
                                                        <option value="Dental">Dental Clinic</option>
                                                        <option value="Eye">Eye Care / Ophthalmology</option>
                                                        <option value="Ear">Ear, Nose & Throat (ENT)</option>
                                                    </select>
                                                </div>
                                            )}
                                            {newInstData.institutionType === 'Education' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Education Level / Category</label>
                                                    <select
                                                        value={newInstData.category}
                                                        onChange={e => setNewInstData({ ...newInstData, category: e.target.value, businessSubType: e.target.value })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="Kindergarten">Kindergarten / Playgroup</option>
                                                        <option value="ECD">ECD Center</option>
                                                        <option value="Primary">Primary School</option>
                                                        <option value="Secondary">Secondary School</option>
                                                        <option value="International">International School</option>
                                                        <option value="College">College</option>
                                                        <option value="TVET">TVET / Vocational</option>
                                                        <option value="Institute">Institute</option>
                                                        <option value="Polytechnic">Polytechnic</option>
                                                        <option value="Driving School">Driving School</option>
                                                        <option value="University">University</option>
                                                    </select>
                                                </div>
                                            )}
                                            {newInstData.institutionType === 'Logistics' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Logistics Niche / Focus</label>
                                                    <select
                                                        value={newInstData.category}
                                                        onChange={e => setNewInstData({ ...newInstData, category: e.target.value, businessSubType: e.target.value })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="Cargo & Delivery">Logistics & Cargo Delivery</option>
                                                        <option value="Staff Shuttle">Corporate / Staff Shuttle</option>
                                                        <option value="Educational Transport">Educational Transport</option>
                                                        <option value="Public Transport">Public / Private Hire Services</option>
                                                    </select>
                                                </div>
                                            )}
                                            {newInstData.institutionType === 'Community' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Community Focus Area</label>
                                                    <select
                                                        value={newInstData.category}
                                                        onChange={e => setNewInstData({ ...newInstData, category: e.target.value, businessSubType: e.target.value })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="Chama/Savings Group">Self Help / Savings Group (Chama)</option>
                                                        <option value="Estate/Neighborhood">Estate / Neighborhood Management</option>
                                                        <option value="NGO/Foundation">NGO / Social Foundation</option>
                                                        <option value="Resource Center">Community Hub / Resource Center</option>
                                                        <option value="Relief/Social Work">Social Work / Welfare Relief</option>
                                                        <option value="Political Campaign">Political Campaign Management</option>
                                                    </select>
                                                </div>
                                            )}
                                            {newInstData.institutionType === 'Business' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Select Business Niche / Category</label>
                                                    <select
                                                        value={newInstData.category}
                                                        onChange={e => setNewInstData({ ...newInstData, category: e.target.value, businessSubType: e.target.value })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="Agrovet">Agrovet (Agricultural Supplies)</option>
                                                        <option value="Fuel Station">Fuel & Energy Station (Multi-Pump/IoT)</option>
                                                        <option value="Industrial Logistics">Industrial Logistics & Heavy Fleet</option>
                                                        <option value="Civil Manufacturing">Civil Manufacturing Yard (Infrastructure)</option>
                                                        <option value="Property Management">Property Management (Rent/Leases)</option>
                                                        <option value="Retail Agency">Retail Agency (Commission Based)</option>
                                                        <option value="Car Wash">Car Wash / Service Center</option>
                                                        <option value="Car Sales">Car Sales / Automotive Marketplace</option>
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
                                                        value={newInstData.category}
                                                        onChange={e => setNewInstData({ ...newInstData, category: e.target.value, businessSubType: e.target.value })}
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
                                            {newInstData.institutionType === 'Hospitality' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Tourism Specialization</label>
                                                    <select
                                                        value={newInstData.category}
                                                        onChange={e => setNewInstData({ ...newInstData, category: e.target.value, businessSubType: e.target.value })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="Safari operator">Safari & Tour Operator</option>
                                                        <option value="Hotel & Resort">Hotel & Luxury Resort</option>
                                                        <option value="Travel Agency">Travel & Booking Agency</option>
                                                        <option value="Airbnb/Rental">Vacation Rental / Airbnb</option>
                                                    </select>
                                                </div>
                                            )}
                                            {newInstData.institutionType === 'Political Campaign' && (
                                                <div className="animate-fade-in-up">
                                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 underline underline-offset-4">Campaign Strategy Focus</label>
                                                    <select
                                                        value={newInstData.category}
                                                        onChange={e => setNewInstData({ ...newInstData, category: e.target.value, businessSubType: e.target.value })}
                                                        className="form-select border-2 border-indigo-200 font-black text-indigo-900 shadow-sm"
                                                        required
                                                    >
                                                        <option value="Political Campaign Management">Campaign Strategy Hub</option>
                                                        <option value="Voter Outreach Hub">Voter Outreach & Field Hub</option>
                                                        <option value="Lead Scouting AI">AI Prospect & Lead Scouting</option>
                                                        <option value="Campaign Fundraising">Fundraising & Donor Hub</option>
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
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex flex-col">
                                                            <div className="text-[10px] font-black uppercase text-indigo-500 tracking-tight">{inst.institutionType}</div>
                                                            <div className="text-sm font-bold text-slate-600 dark:text-slate-400 capitalize">{inst.category || inst.institutionType}</div>
                                                        </div>
                                                    </td>
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
                                                            <button onClick={() => onLoginAsAdmin?.(inst.id)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-2 py-1 rounded-lg">
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
                                                                    setManagingKcbFor(inst);
                                                                    setTenantKcbConfig(inst.kcbConfig || { appKey: '', appSecret: '', environment: 'sandbox' });
                                                                }}
                                                                className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-2 py-1 rounded-lg"
                                                            >
                                                                <KcbIcon className="w-3 h-3" />
                                                                KCB
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
                                                            <button onClick={() => onToggleInstitutionStatus?.(inst.id)} className="text-yellow-600 hover:text-yellow-900 font-bold text-[10px] uppercase tracking-tighter">

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
                                                                <button onClick={() => onLoginAsAdmin?.(inst.id)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-2 py-1 rounded-lg">
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
                                                            <button onClick={() => onLoginAsAdmin?.(inst.id)} className="flex items-center gap-1 text-indigo-600 hover:text-indigo-900 font-black text-[10px] uppercase tracking-tighter bg-indigo-50 px-2 py-1 rounded-lg">
                                                                <ArrowRightOnRectangleIcon className="w-3 h-3" />
                                                                Portal
                                                            </button>
                                                            <button onClick={() => setEditingInstitution(inst)} className="flex items-center gap-1 text-slate-600 hover:text-slate-900 font-black text-[10px] uppercase tracking-tighter bg-slate-100 px-2 py-1 rounded-lg">
                                                                Edit
                                                            </button>
                                                            <button onClick={() => onToggleInstitutionStatus?.(inst.id)} className="text-yellow-600 hover:text-yellow-900 font-bold text-[10px] uppercase tracking-tighter">
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
                                    onGenerateReceipt={onGenerateReceipt || (() => {})}
                                    onVerifyTransaction={handleVerifyTransaction}
                                    logoUrl={logoUrl || null}
                                    transactionLimit={props.transactionLimit}
                                    setTransactionLimit={props.setTransactionLimit}
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

                        {institutionsSubTab === 'registry' && (
                            <div className="animate-fade-in-up">
                                <SchoolRegistryManager 
                                    registry={schoolRegistry} 
                                    onRefresh={fetchSchoolRegistry} 
                                    onAccessPortal={onLoginAsAdmin}
                                    onAccessAlumnaPortal={onAccessAlumnaPortal}
                                />
                            </div>
                        )}
                        {institutionsSubTab === 'scouting' && (
                            <div className="animate-fade-in-up">
                                <LeadScoutManager />
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'all_users' && (
                    <div className="animate-fade-in-up">
                        <UserManager
                            {...props}
                            smsConfig={smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' }}
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
                            onSendSms={onSendSms || (async () => ({ success: false, message: 'SMS service disabled' }))}
                            currentUser={currentUser}
                            smsBalance={props.companyDetails?.smsBalance || 0}
                            currentInstitution={props.currentInstitution}
                            mpesaConfig={companyDetails?.mpesaConfig}
                            smsConfig={props.smsConfig}
                            onRefreshData={onRefreshData}
                            transactions={transactions}
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
                                <button
                                    onClick={() => setAcademicsSubTab('registry')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${academicsSubTab === 'registry' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Global School Registry
                                </button>
                                <button
                                    onClick={() => setAcademicsSubTab('discipline')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${academicsSubTab === 'discipline' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Discipline
                                </button>
                                <button
                                    onClick={() => setAcademicsSubTab('insights')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${academicsSubTab === 'insights' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Exam Insights
                                </button>
                                <button
                                    onClick={() => setAcademicsSubTab('reports')}
                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${academicsSubTab === 'reports' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'}`}
                                >
                                    Intelligence Hub
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
                                logoUrl={logoUrl || null}
                                footerImageUrl={footerImageUrl || null}
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

                        {academicsSubTab === 'registry' && (
                            <SchoolRegistryManager 
                                registry={schoolRegistry}
                                onRefresh={fetchSchoolRegistry}
                                onAccessPortal={onLoginAsAdmin}
                                onAccessAlumnaPortal={onAccessAlumnaPortal}
                            />
                        )}

                        {academicsSubTab === 'discipline' && (
                            <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                <DisciplineManager
                                    incidents={props.incidents || []}
                                    students={users.filter(u => u.role === 'student')}
                                    onAddIncident={props.onAddIncident || (async () => {})}
                                />
                            </Suspense>
                        )}

                        {academicsSubTab === 'insights' && (
                            <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                <ExamInsights
                                    assessment={assessments[0]}
                                    marks={assessmentMarks}
                                    subjects={subjects}
                                    students={users.filter(u => u.role === 'student')}
                                    teachers={users.filter(u => u.role === 'lecturer' || u.role === 'teacher')}
                                />
                            </Suspense>
                        )}

                        {academicsSubTab === 'reports' && (
                            <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                <AcademicReportsHub
                                    students={users.filter(u => u.role === 'student')}
                                    assessments={assessments}
                                    marks={assessmentMarks}
                                    subjects={subjects}
                                    institution={currentInstitution || institutions[0]}
                                    gradingSystem={currentInstitution?.gradingSystem || null}
                                />
                            </Suspense>
                        )}
                    </div>
                )}
                
                {activeTab === 'marketing' && (
                    <div className="space-y-10 animate-fade-in pb-20">
                        <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                <div>
                                    <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white flex items-center gap-4">
                                        Marketing <span className="text-amber-500">Center</span>
                                    </h2>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Manage Generated Adverts & Social Distribution</p>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-6 py-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">Archive</button>
                                    <button className="px-6 py-3 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-200/50">New Campaign</button>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {generatedAdverts.map((ad) => (
                                <div key={ad.id} className="group bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-2xl transition-all duration-500 flex flex-col">
                                    <div className="h-64 relative overflow-hidden">
                                        <img src={ad.image} className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" alt={ad.title} />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
                                        
                                        {/* Hover Premium View 3D Gallery overlay */}
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-slate-950/40 backdrop-blur-[2px]">
                                            <button 
                                                onClick={() => {
                                                    setSelectedAdForGallery(ad);
                                                    const idx = (ad.images || [ad.image]).indexOf(ad.image);
                                                    setActiveGalleryImageIndex(idx >= 0 ? idx : 0);
                                                }}
                                                className="px-6 py-3 bg-white/95 dark:bg-slate-900/95 text-slate-900 dark:text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-amber-500 hover:text-white transition-all shadow-xl hover:scale-105 duration-300 flex items-center gap-2 border border-white/10"
                                            >
                                                <EyeIcon className="w-4 h-4" /> View 3D Gallery
                                            </button>
                                        </div>

                                        <div className="absolute top-6 left-6">
                                            <span className="bg-white/20 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest text-white border border-white/20">
                                                {ad.category || 'General'}
                                            </span>
                                        </div>
                                        <div className="absolute bottom-6 left-8 right-8">
                                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight">{ad.title}</h3>
                                        </div>
                                    </div>

                                    {/* Scrollable Thumbnails Bar displaying ALL generated options */}
                                    <div className="flex gap-2.5 px-8 pt-6 pb-2 overflow-x-auto bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800/80 scrollbar-none">
                                        {(ad.images || [ad.image]).map((imgUrl: string, idx: number) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setGeneratedAdverts(prev => prev.map(item => item.id === ad.id ? { ...item, image: imgUrl } : item));
                                                }}
                                                className={`w-14 h-14 rounded-2xl overflow-hidden border-2 flex-shrink-0 transition-all duration-300 hover:scale-105 ${ad.image === imgUrl ? 'border-amber-500 ring-4 ring-amber-500/10 scale-105' : 'border-transparent opacity-50 hover:opacity-100'}`}
                                                title={`Switch to 3D Render ${idx + 1}`}
                                            >
                                                <img src={imgUrl} className="w-full h-full object-cover" alt={`Preview ${idx + 1}`} />
                                            </button>
                                        ))}
                                    </div>

                                    <div className="p-8 flex-1 flex flex-col justify-between">
                                        <p className="text-slate-500 text-sm font-medium leading-relaxed mb-8">
                                            {ad.description || 'Stunning AI-generated marketing content for your module.'}
                                        </p>
                                        
                                        <div className="space-y-6">
                                            <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center gap-6">
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Shares</p>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{ad.stats?.shares || 0}</p>
                                                    </div>
                                                    <div className="w-px h-8 bg-slate-200 dark:bg-slate-700"></div>
                                                    <div>
                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engagement</p>
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{ad.stats?.clicks || 0}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button 
                                                        onClick={() => handleShareAdvert('whatsapp', ad)}
                                                        className="p-2.5 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 hover:scale-110 transition-transform"
                                                        title="Share on WhatsApp"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.539 2.016 2.069-.543c.944.513 1.999.784 3.074.786 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.768-5.766z" /></svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleShareAdvert('twitter', ad)}
                                                        className="p-2.5 bg-slate-900 text-white rounded-xl shadow-lg shadow-slate-900/20 hover:scale-110 transition-transform"
                                                        title="Post on X"
                                                    >
                                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => handleShareAdvert('copy', ad)}
                                                        className="p-2.5 bg-indigo-500 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-110 transition-transform"
                                                        title="Copy Assets"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-800/50 p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 text-center space-y-6">
                            <div className="w-20 h-20 bg-white dark:bg-slate-900 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
                                <SparklesIcon className="w-10 h-10 text-amber-500" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">AI Advert Generator</h3>
                            <p className="text-slate-500 max-w-xl mx-auto font-medium">
                                Generate fresh 3D marketing assets for your modules. Our AI engine creates stunning visuals and copy tailored for your institutional brand.
                            </p>
                            
                            <div className="max-w-md mx-auto relative group">
                                <input 
                                    type="text" 
                                    value={advertPrompt}
                                    onChange={(e) => setAdvertPrompt(e.target.value)}
                                    placeholder="Describe your vision (e.g. 3D car in futuristic showroom)..."
                                    className="w-full h-16 pl-8 pr-32 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl text-xs font-bold focus:border-amber-500 transition-all outline-none"
                                />
                                <button 
                                    onClick={handleGenerateAdvert}
                                    disabled={isGeneratingAdvert || !advertPrompt.trim()}
                                    className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 dark:bg-amber-500 text-white rounded-xl font-black uppercase text-[9px] tracking-widest hover:scale-105 transition-transform disabled:opacity-50 disabled:grayscale"
                                >
                                    {isGeneratingAdvert ? 'Generating...' : 'Generate'}
                                </button>
                            </div>
                        </div>

                        {/* Interactive 3D Gallery Modal */}
                        {selectedAdForGallery && (
                            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-xl animate-fade-in p-4 overflow-y-auto">
                                <div className="absolute top-6 right-6 flex gap-4">
                                    <button 
                                        onClick={() => {
                                            const imgUrl = (selectedAdForGallery.images || [selectedAdForGallery.image])[activeGalleryImageIndex];
                                            const link = document.createElement('a');
                                            link.href = imgUrl;
                                            link.download = `${selectedAdForGallery.title.toLowerCase().replace(/\s+/g, '_')}_3d.png`;
                                            document.body.appendChild(link);
                                            link.click();
                                            document.body.removeChild(link);
                                        }}
                                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10 hover:scale-110 flex items-center justify-center shadow-lg"
                                        title="Download Image"
                                    >
                                        <DocumentArrowDownIcon className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => setSelectedAdForGallery(null)}
                                        className="p-3 bg-white/10 hover:bg-red-500 text-white rounded-full transition-all border border-white/10 hover:scale-110 flex items-center justify-center shadow-lg"
                                    >
                                        <XIcon className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="w-full max-w-6xl flex flex-col lg:flex-row gap-8 items-center justify-between my-auto py-12">
                                    {/* Main Display and Controls */}
                                    <div className="flex-1 flex flex-col items-center gap-6 w-full">
                                        <div className="relative w-full max-w-4xl aspect-[16/10] bg-slate-900 rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl group/modal">
                                            <img 
                                                src={(selectedAdForGallery.images || [selectedAdForGallery.image])[activeGalleryImageIndex]} 
                                                className="w-full h-full object-cover transition-transform duration-700" 
                                                alt={selectedAdForGallery.title} 
                                            />
                                            
                                            {/* Previous/Next Nav Arrow Controls */}
                                            {selectedAdForGallery.images && selectedAdForGallery.images.length > 1 && (
                                                <>
                                                    <button 
                                                        onClick={() => {
                                                            setActiveGalleryImageIndex(prev => 
                                                                prev === 0 ? selectedAdForGallery.images.length - 1 : prev - 1
                                                            );
                                                        }}
                                                        className="absolute left-6 top-1/2 -translate-y-1/2 p-4 bg-slate-950/60 hover:bg-amber-500 text-white rounded-full transition-all backdrop-blur-md opacity-0 group-hover/modal:opacity-100 border border-white/10 shadow-lg scale-90 hover:scale-100"
                                                    >
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setActiveGalleryImageIndex(prev => 
                                                                prev === selectedAdForGallery.images.length - 1 ? 0 : prev + 1
                                                            );
                                                        }}
                                                        className="absolute right-6 top-1/2 -translate-y-1/2 p-4 bg-slate-950/60 hover:bg-amber-500 text-white rounded-full transition-all backdrop-blur-md opacity-0 group-hover/modal:opacity-100 border border-white/10 shadow-lg scale-90 hover:scale-100"
                                                    >
                                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
                                                    </button>
                                                </>
                                            )}

                                            <div className="absolute bottom-6 left-8 bg-slate-950/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-white/15">
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">
                                                    Image {activeGalleryImageIndex + 1} of {(selectedAdForGallery.images || [selectedAdForGallery.image]).length}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Alternate Thumbnails in Modal */}
                                        {selectedAdForGallery.images && selectedAdForGallery.images.length > 1 && (
                                            <div className="flex gap-3 overflow-x-auto max-w-full pb-2 scrollbar-none justify-center">
                                                {selectedAdForGallery.images.map((imgUrl: string, idx: number) => (
                                                    <button
                                                        key={idx}
                                                        onClick={() => setActiveGalleryImageIndex(idx)}
                                                        className={`w-20 h-20 rounded-2xl overflow-hidden border-2 transition-all flex-shrink-0 hover:scale-105 ${activeGalleryImageIndex === idx ? 'border-amber-500 ring-4 ring-amber-500/20 scale-105' : 'border-white/10 opacity-40 hover:opacity-100'}`}
                                                    >
                                                        <img src={imgUrl} className="w-full h-full object-cover" alt={`Modal thumbnail ${idx}`} />
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Sidebar Information / Copy / Share */}
                                    <div className="w-full lg:w-96 text-left space-y-8 bg-slate-900/40 p-8 rounded-[2.5rem] border border-white/15 backdrop-blur-md">
                                        <div>
                                            <span className="bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                {selectedAdForGallery.category || 'General'}
                                            </span>
                                            <h3 className="text-2xl font-black text-white uppercase italic tracking-tight mt-4">{selectedAdForGallery.title}</h3>
                                            <p className="text-slate-400 text-xs font-medium mt-3 leading-relaxed">{selectedAdForGallery.description}</p>
                                        </div>

                                        <div className="h-px bg-white/10"></div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Engagement Metrics</p>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Shares</p>
                                                    <p className="text-lg font-black text-white mt-1">{selectedAdForGallery.stats?.shares || 0}</p>
                                                </div>
                                                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Clicks</p>
                                                    <p className="text-lg font-black text-white mt-1">{selectedAdForGallery.stats?.clicks || 0}</p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Distribute Asset</p>
                                            <div className="flex gap-2">
                                                <button 
                                                    onClick={() => {
                                                        handleShareAdvert('whatsapp', selectedAdForGallery);
                                                        setGeneratedAdverts(prev => prev.map(a => a.id === selectedAdForGallery.id ? { ...a, stats: { ...a.stats, shares: a.stats.shares + 1 } } : a));
                                                    }}
                                                    className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 flex items-center justify-center gap-2"
                                                >
                                                    WhatsApp
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        handleShareAdvert('twitter', selectedAdForGallery);
                                                        setGeneratedAdverts(prev => prev.map(a => a.id === selectedAdForGallery.id ? { ...a, stats: { ...a.stats, shares: a.stats.shares + 1 } } : a));
                                                    }}
                                                    className="flex-1 py-4 bg-white text-slate-950 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 flex items-center justify-center gap-2"
                                                >
                                                    Post on X
                                                </button>
                                            </div>
                                            <button 
                                                onClick={() => {
                                                    handleShareAdvert('copy', selectedAdForGallery);
                                                    setGeneratedAdverts(prev => prev.map(a => a.id === selectedAdForGallery.id ? { ...a, stats: { ...a.stats, shares: a.stats.shares + 1 } } : a));
                                                }}
                                                className="w-full py-4 bg-white/10 hover:bg-white/15 text-white border border-white/15 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 flex items-center justify-center gap-2"
                                            >
                                                Copy Details Link
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'auto_marketplace' && (
                    <div className="space-y-10 animate-fade-in-up">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Auto <span className="text-indigo-600 italic">Marketplace</span></h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <SparklesIcon className="w-3 h-3 text-amber-500" /> Platform-Wide Automotive Ecosystem
                                </p>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => { 
                                        setSelectedListingForEdit(null); 
                                        setIsAddListingModalOpen(true); 
                                    }}
                                    className="px-8 py-4 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-[9px] shadow-2xl transition-all flex items-center gap-3"
                                >
                                    <PlusIcon className="w-4 h-4" /> Add Featured Listing
                                </button>
                                <button 
                                    onClick={() => setAutoSubTab('financials')}
                                    className="px-8 py-4 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[9px] shadow-2xl transition-all flex items-center gap-3"
                                >
                                    <ArrowTrendingUpIcon className="w-4 h-4" /> Market Reports
                                </button>
                            </div>
                        </div>

                        {/* Sub-navigation */}
                        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl w-fit border border-slate-200 dark:border-slate-700">
                            <button onClick={() => setAutoSubTab('dashboard')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${autoSubTab === 'dashboard' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Operations Hub</button>
                            <button onClick={() => setAutoSubTab('inventory')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${autoSubTab === 'inventory' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Inventory Preview</button>
                            <button onClick={() => setAutoSubTab('financials')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${autoSubTab === 'financials' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Invoices</button>
                            <button onClick={() => setAutoSubTab('bank_feeds')} className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${autoSubTab === 'bank_feeds' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Transactions</button>
                        </div>

                        <div className="animate-fade-in">
                            {autoSubTab === 'dashboard' && (
                                <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                    <CarShowroomDashboard 
                                        listings={carListings || []}
                                        invoices={props.carInvoices || []}
                                        payments={props.carPayments || []}
                                        testDrives={carTestDrives || []}
                                        users={users || []}
                                        institution={currentInstitution || institutions[0]}
                                        currentUser={currentUser}
                                        onAction={(tab, sub) => {
                                            if (tab === 'inventory') setAutoSubTab('inventory');
                                            else if (tab === 'financials') setAutoSubTab('financials');
                                            else if (tab === 'auto_marketplace') setAutoSubTab(sub as any || 'dashboard');
                                        }}
                                        onAddListing={() => {
                                            setSelectedListingForEdit(null);
                                            setIsAddListingModalOpen(true);
                                        }}
                                        onAddInvoice={() => props.onAddCarInvoice?.({})}
                                        onAddPayment={() => props.onAddCarPayment?.({})}
                                        onAddLead={() => {}}
                                        onSwitchPerspective={() => {}}
                                    />
                                </Suspense>
                            )}

                            {autoSubTab === 'financials' && (
                                <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                    <CarSalesLedger 
                                        invoices={props.carInvoices || []}
                                        payments={props.carPayments || []}
                                        listings={carListings || []}
                                        onAddInvoice={() => props.onAddCarInvoice?.({})}
                                        onAddPayment={() => props.onAddCarPayment?.({})}
                                        onPrintInvoice={() => {}}
                                        onPrintReceipt={() => {}}
                                    />
                                </Suspense>
                            )}

                            {autoSubTab === 'bank_feeds' && (
                                <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                    <BankFeedsManager
                                        transactions={props.carBankTransactions || []}
                                        invoices={props.carInvoices || []}
                                        onReconcile={async (tid, invId) => {
                                            if (props.onReconcileBankTransaction) {
                                                await props.onReconcileBankTransaction(tid, invId);
                                            }
                                        }}
                                        onFetchFeeds={async () => {
                                            if (props.onFetchBankFeeds) {
                                                await props.onFetchBankFeeds();
                                            }
                                        }}
                                        currentUser={currentUser}
                                        institution={currentInstitution || institutions[0]}
                                    />
                                </Suspense>
                            )}

                            {autoSubTab === 'inventory' && (
                                <div className="space-y-12">
                                    <div className="max-w-xl space-y-4">
                                        <h3 className="text-4xl font-black uppercase tracking-tighter text-slate-900 leading-none">
                                            Marketplace <span className="text-indigo-600">Simulated View</span>
                                        </h3>
                                        <p className="text-slate-400 text-xs font-bold leading-relaxed uppercase tracking-wider italic">
                                            Experience the high-end vehicle discovery portal as your users see it. Verified listings only.
                                        </p>
                                    </div>
                                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden h-[800px] relative">
                                        <div className="h-full overflow-y-auto scrollbar-none p-12">
                                            <VehicleMarketplaceView 
                                                listings={carListings || []}
                                                currentInstitution={currentInstitution}
                                                onBookTestDrive={() => {}}
                                                onInquiry={() => {}}
                                                onEditListing={(listing) => {
                                                    setSelectedListingForEdit(listing);
                                                    setIsAddListingModalOpen(true);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'hospitality' && (
                    <div className="space-y-10 animate-fade-in-up">

                        {/* Header & Quick Action */}
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <h1 className="text-4xl font-black uppercase tracking-tighter text-slate-800 dark:text-white">Hospitality <span className="text-indigo-600 italic">Network</span></h1>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                    <SparklesIcon className="w-3 h-3 text-amber-500" /> Managed Global Tourism Ecosystem
                                </p>
                            </div>
                            <button 
                                onClick={() => window.open('/?view=travel', '_blank')}
                                className="px-10 py-5 bg-indigo-600 text-white rounded-[2rem] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-indigo-100/50 hover:bg-slate-900 transition-all flex items-center gap-3 active:scale-95"
                            >
                                <GlobeAltIcon className="w-5 h-5" /> Visit Public Travel Hub
                            </button>
                        </div>

                        {/* Network Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {[
                                { label: 'Active Partners', val: institutions.filter(i => i.institutionType === 'Hospitality').length, icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-600' },
                                { label: 'Safaris & Trips', val: 124, icon: <Compass className="w-6 h-6" />, color: 'bg-orange-500' },
                                { label: 'Guest Bookings', val: '2,840', icon: <UserGroupIcon className="w-6 h-6" />, color: 'bg-emerald-500' },
                                { label: 'Platform Revenue Share', val: 'KES 450k', icon: <BanknotesIcon className="w-6 h-6" />, color: 'bg-blue-600' },
                            ].map((stat, i) => (
                                <div key={i} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between group hover:border-indigo-500/30 transition-all">
                                    <div className={`w-14 h-14 ${stat.color} text-white rounded-2xl flex items-center justify-center mb-6 shadow-xl`}>
                                        {stat.icon}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
                                        <h4 className="text-3xl font-black text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors uppercase italic">{stat.val}</h4>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Marketplace Preview Section */}
                        <div className="bg-slate-950 rounded-[4rem] p-12 border border-slate-800 relative overflow-hidden group">
                           <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 group-hover:opacity-10 transition-opacity">
                                <Palmtree className="w-96 h-96 text-indigo-400" />
                            </div>
                            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-12 items-center">
                                <div className="lg:col-span-1 space-y-6">
                                    <h3 className="text-5xl font-black uppercase tracking-tighter text-white leading-none">
                                        Travel Hub <br /> <span className="text-indigo-400">Preview</span>
                                    </h3>
                                    <p className="text-slate-400 text-sm font-bold leading-relaxed mb-6 uppercase tracking-wider italic">
                                        Visualize how hospitality partners are represented in the global marketplace. This is the live view seen by authenticated guests and travelers.
                                    </p>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3 text-xs font-black text-white/50 uppercase tracking-widest">
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> SEO Optimized Listings
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-black text-white/50 uppercase tracking-widest">
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> Real-time Booking Sync
                                        </div>
                                        <div className="flex items-center gap-3 text-xs font-black text-white/50 uppercase tracking-widest">
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-500" /> Luxury Aesthetics
                                        </div>
                                    </div>
                                </div>
                                <div className="lg:col-span-2 h-[500px] bg-slate-900 rounded-[3rem] border border-slate-800 overflow-hidden relative shadow-2xl">
                                    <div className="h-full overflow-y-auto scrollbar-none">
                                        <div className="origin-top scale-[0.70] w-[142%] h-[142%] bg-white dark:bg-slate-950 pointer-events-none">
                                            <HospitalityMarketplace 
                                                institutions={institutions} 
                                                onBack={() => {}} 
                                                onViewStore={() => {}} 
                                            />
                                        </div>
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 py-10 bg-gradient-to-t from-slate-950 to-transparent flex justify-center">
                                        <button 
                                            onClick={() => window.open('/?view=travel', '_blank')}
                                            className="px-10 py-5 bg-white text-slate-950 rounded-[2rem] font-black uppercase text-[10px] tracking-[0.2em] shadow-2xl active:scale-95 transition-all"
                                        >
                                            Inspect External Interface
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Partner Management List */}
                        <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="p-10 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center">
                                <div>
                                    <h3 className="text-2xl font-black uppercase tracking-tighter">Hospitality Partners</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Directory of tourism agencies & hotels</p>
                                </div>
                                <div className="flex gap-3">
                                    <button className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 text-slate-400 group hover:text-indigo-600 hover:border-indigo-100 transition-all">
                                        <Filter className="w-5 h-5 group-hover:scale-110 transition-transform" />
                                    </button>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr className="text-left text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                                            <th className="px-10 py-6">Identity & Brand</th>
                                            <th className="px-10 py-6">Operational Focus</th>
                                            <th className="px-10 py-6">Engagement Status</th>
                                            <th className="px-10 py-6">Platform Lifecycle</th>
                                            <th className="px-10 py-6 text-right">Portfolio Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {institutions.filter(i => i.institutionType === 'Hospitality').map((inst, idx) => (
                                            <tr key={inst.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors group">
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-xl shadow-inner group-hover:scale-110 transition-transform">
                                                            {inst.name.charAt(0)}
                                                        </div>
                                                        <div>
                                                            <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-tight">{inst.name}</h4>
                                                            <p className="text-[10px] font-mono text-slate-400 lowercase">{inst.id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-xl">
                                                            {inst.category?.includes('Safari') ? <Compass className="w-4 h-4 text-orange-600" /> : <Hotel className="w-4 h-4 text-indigo-600" />}
                                                        </div>
                                                        <span className="text-xs font-black uppercase text-slate-600 dark:text-slate-400 tracking-tight">{inst.category || 'General'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <div className="space-y-1">
                                                        <div className="h-1.5 w-32 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                            <div className="h-full bg-indigo-500" style={{ width: `${60 + (idx * 5)}%` }}></div>
                                                        </div>
                                                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-tighter">Engagement Health: {60 + (idx * 5)}%</p>
                                                    </div>
                                                </td>
                                                <td className="px-10 py-8">
                                                    <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${inst.status === 'active' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                                        {inst.status}
                                                    </span>
                                                </td>
                                                <td className="px-10 py-8 text-right">
                                                    <div className="flex justify-end gap-3">
                                                        <button 
                                                            onClick={() => onLoginAsAdmin?.(inst.id)}
                                                            className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-indigo-100"
                                                        >
                                                            Portal
                                                        </button>
                                                        <button 
                                                            onClick={() => openPerspectiveSelection(inst)}
                                                            className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-indigo-600 transition-all"
                                                        >
                                                            <EyeIcon className="w-5 h-5" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
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
                        <ActivityLogView 
                            activityLog={activityLog || []} 
                            activityLogLimit={props.activityLogLimit}
                            setActivityLogLimit={props.setActivityLogLimit}
                        />
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

                {activeTab === 'lead_scout' && (
                    <div className="animate-fade-in-up">
                        <LeadScoutManager />
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
                            generatedTimetable={props.generatedTimetable || []}
                            getLecturerById={() => undefined}
                            letterheadConfig={props.letterheadConfig || { headerImageUrl: null, stampImageUrl: null }}
                            footerImageUrl={props.footerImageUrl || null}
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
                                    onClick={() => setSettingsSubTab('storage')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${settingsSubTab === 'storage' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <ArrowUpTrayIcon className="w-4 h-4" /> Asset Storage
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
                                            {localCompanyInfo.logoUrl ? <img loading="lazy" src={localCompanyInfo.logoUrl} className="h-20 object-contain mb-4" alt="Logo" /> : <BuildingOfficeIcon className="w-10 h-10 text-slate-200 mb-2" />}
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
                                        {companyDetails && (
                                            <DatabaseSettings
                                                dbConfig={companyDetails.databaseConfig}
                                                onRunAlumniMigration={props.onRunAlumniMigration}
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
                                        )}
                                    </div>
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

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">System Logo (Dark Mode Compatible)</label>
                                                    <label className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 rounded-xl p-4 cursor-pointer hover:border-indigo-500 transition-colors">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                                            <ArrowUpTrayIcon className="w-5 h-5 text-indigo-600" />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-xs font-bold text-slate-700">Upload Main Logo</p>
                                                            <p className="text-[10px] text-slate-400">PNG or SVG (Transparent recommended)</p>
                                                        </div>
                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLocalImageUpload(e, 'logo')} />
                                                    </label>
                                                    {localCompanyInfo.logoUrl && (
                                                        <div className="mt-3 flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                            <img loading="lazy" src={localCompanyInfo.logoUrl} className="h-12 object-contain" alt="Logo Preview" />
                                                            <div>
                                                                <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white">Active Logo</p>
                                                                <button onClick={() => setLocalCompanyInfo({ ...localCompanyInfo, logoUrl: '' } as any)} className="text-[9px] font-bold text-red-500 uppercase hover:underline">Remove</button>
                                                            </div>
                                                        </div>
                                                    )}
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
                                                            <img loading="lazy" src={localCompanyInfo.letterheadConfig.headerImageUrl} alt="Header" className="w-full h-full object-cover opacity-50" />
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
                                                            <img loading="lazy" src={localCompanyInfo.footerImageUrl} alt="Footer" className="w-full h-full object-cover opacity-50" />
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
                                                {localSmsConfig.provider === 'Sematime' ? 'Account ID' : localSmsConfig.provider === 'Zettatel' ? 'User ID' : 'User ID / API Key'}
                                            </label>
                                            <input type="text" value={localSmsConfig.apiKey} onChange={e => setLocalSmsConfig({ ...localSmsConfig, apiKey: e.target.value })} className="form-input h-10" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                                {localSmsConfig.provider === 'Sematime' ? 'Auth Token' : localSmsConfig.provider === 'Zettatel' ? 'Password' : 'API Password / Secret'}
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
                                                onClick={() => setBillingSubTab('gateways')} 
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${billingSubTab === 'gateways' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                <Cog8ToothIcon className="w-4 h-4" /> Gateways Control
                                            </button>
                                            <button 
                                                onClick={() => setBillingSubTab('kcb')} 
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${billingSubTab === 'kcb' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                <KcbIcon className="w-4 h-4" /> KCB Integration
                                            </button>
                                            <button 
                                                onClick={() => setBillingSubTab('coop')} 
                                                className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${billingSubTab === 'coop' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 dark:shadow-none' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}
                                            >
                                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Co-op B2B Gateway
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


                                    {billingSubTab === 'gateways' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {[
                                                    { id: 'mpesa', name: 'Safaricom M-Pesa', icon: MpesaIcon, color: 'text-green-600', bg: 'bg-green-50' },
                                                    { id: 'airtel', name: 'Airtel Money', icon: CreditCardIcon, color: 'text-red-500', bg: 'bg-red-50' },
                                                    { id: 'intasend', name: 'Intasend (Card/Airtel)', icon: CreditCardIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                                                ].map(gw => (
                                                    <div 
                                                        key={gw.id}
                                                        onClick={() => {
                                                            const current = localCompanyInfo.enabledGateways || [];
                                                            const next = current.includes(gw.id) ? current.filter(id => id !== gw.id) : [...current, gw.id];
                                                            setLocalCompanyInfo({ ...localCompanyInfo, enabledGateways: next } as any);
                                                        }}
                                                        className={`p-6 rounded-[2.5rem] border-2 cursor-pointer transition-all ${
                                                            (localCompanyInfo.enabledGateways || []).includes(gw.id) 
                                                                ? 'border-indigo-500 bg-indigo-50/30' 
                                                                : 'border-slate-100 bg-white hover:border-slate-200'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-center">
                                                            <div className="flex items-center gap-4">
                                                                <div className={`p-3 rounded-2xl ${gw.bg} ${gw.color}`}>
                                                                    <gw.icon className="w-6 h-6" />
                                                                </div>
                                                                <div>
                                                                    <h4 className="text-sm font-black uppercase tracking-tight">{gw.name}</h4>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                                        {(localCompanyInfo.enabledGateways || []).includes(gw.id) ? 'Active' : 'Disabled'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className={`w-12 h-6 rounded-full p-1 transition-all ${
                                                                (localCompanyInfo.enabledGateways || []).includes(gw.id) ? 'bg-indigo-500' : 'bg-slate-200'
                                                            }`}>
                                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all ${
                                                                    (localCompanyInfo.enabledGateways || []).includes(gw.id) ? 'translate-x-6' : 'translate-x-0'
                                                                }`} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-3xl border border-amber-100 dark:border-amber-900/20">
                                                <p className="text-xs text-amber-700 dark:text-amber-500 leading-relaxed font-bold">
                                                    Note: Disabled gateways will be hidden from the "Buy SMS" and "Subscription Renewal" screens for all tenants.
                                                </p>
                                            </div>
                                            <div className="pt-4">
                                                <button onClick={handleSaveGlobalConfigs} className="btn-primary w-full h-14 shadow-indigo-100 dark:shadow-none uppercase tracking-widest text-xs">Update Gateway Visibility</button>
                                            </div>
                                        </div>
                                    )}

                                    {billingSubTab === 'kcb' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
                                                            <KcbIcon className="w-6 h-6 text-indigo-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase tracking-widest">KCB Buni Credentials</h4>
                                                            <p className="text-[10px] font-bold text-slate-400">Production and Sandbox API keys</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">App Key</label>
                                                            <input
                                                                type="text"
                                                                value={localKcbConfig.appKey}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, appKey: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="Enter KCB App Key"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">App Secret</label>
                                                            <input
                                                                type="password"
                                                                value={localKcbConfig.appSecret}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, appSecret: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="Enter KCB App Secret"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Short Code</label>
                                                                <input
                                                                    type="text"
                                                                    value={localKcbConfig.shortCode || ''}
                                                                    onChange={e => setLocalKcbConfig({ ...localKcbConfig, shortCode: e.target.value })}
                                                                    className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                    placeholder="Till/Paybill"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Environment</label>
                                                                <select
                                                                    value={localKcbConfig.environment}
                                                                    onChange={e => setLocalKcbConfig({ ...localKcbConfig, environment: e.target.value as any })}
                                                                    className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                >
                                                                    <option value="sandbox">Sandbox</option>
                                                                    <option value="production">Production</option>
                                                                </select>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-2xl">
                                                            <ZapIcon className="w-6 h-6 text-amber-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase tracking-widest">KCB Connectivity Testing</h4>
                                                            <p className="text-[10px] font-bold text-slate-400">Trigger simulated KCB STK push</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-6">
                                                        <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-4">Test Phone Number</p>
                                                            <div className="flex items-center gap-3">
                                                                <input 
                                                                    type="text" 
                                                                    placeholder="2547XXXXXXXX"
                                                                    value={testRecipient}
                                                                    onChange={e => setTestRecipient(e.target.value)}
                                                                    className="flex-1 h-12 px-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 text-slate-900 dark:text-white"
                                                                />
                                                                <button 
                                                                    onClick={handleTestKcb}
                                                                    disabled={isTesting}
                                                                    className="h-12 px-6 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-100 dark:shadow-none"
                                                                >
                                                                    {isTesting ? 'Sending...' : 'STK Push'}
                                                                </button>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                                            <InformationCircleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                                                            <p className="text-[10px] font-bold text-amber-800 dark:text-amber-200"> Ensure your callback URL is correctly whitelisted on KCB Buni for production tests.</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center justify-between mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                                                            <ChartBarIcon className="w-6 h-6 text-emerald-600" />
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase tracking-widest">KCB Transaction Logs</h4>
                                                            <p className="text-[10px] font-bold text-slate-400">Recent KCB STK Push and IPN activities</p>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => props.onRefreshData?.()} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all">
                                                        <ArrowPathIcon className={`w-5 h-5 text-slate-500 ${isTesting ? 'animate-spin' : ''}`} />
                                                    </button>
                                                </div>

                                                <div className="overflow-x-auto">
                                                    <table className="min-w-full">
                                                        <thead>
                                                                                         <tr className="border-b border-slate-200 dark:border-slate-700">
                                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Phone</th>
                                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">M-Pesa Ref</th>
                                                                <th className="px-4 py-3 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                                <th className="px-4 py-3 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                            {(props.transactions || [])
                                                                .filter(t => t.metadata?.provider === 'kcb' || t.checkoutRequestId?.startsWith('KCB_') || t.checkoutRequestId?.startsWith('KCB_CO_'))
                                                                .slice(0, 10)
                                                                .map((txn: MpesaTransaction) => (
                                                                    <tr key={txn.id} className="hover:bg-white/50 dark:hover:bg-white/5 transition-colors">
                                                                        <td className="px-4 py-4 whitespace-nowrap text-[10px] font-bold text-slate-500">{new Date(txn.timestamp).toLocaleDateString()}</td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-xs font-black">{txn.phoneNumber}</td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-xs font-black">KES {txn.amount.toLocaleString()}</td>
                                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                                            {txn.transactionId && txn.transactionId !== txn.id ? (
                                                                                <span className="font-mono text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-lg">
                                                                                    {txn.transactionId}
                                                                                </span>
                                                                            ) : (
                                                                                <span className="text-[10px] text-slate-400 font-bold">—</span>
                                                                            )}
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap">
                                                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                                                txn.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                                                txn.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                                                                            }`}>
                                                                                {txn.status}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-4 py-4 whitespace-nowrap text-right">
                                                                            {txn.status === 'pending' && txn.checkoutRequestId && (
                                                                                <button
                                                                                    onClick={() => handleQueryKcbStatus(txn.checkoutRequestId!)}
                                                                                    className="text-[10px] font-black uppercase text-indigo-600 hover:text-indigo-800 tracking-widest"
                                                                                >
                                                                                    Query Status
                                                                                </button>
                                                                            )}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            {(props.transactions || []).filter(t => t.metadata?.provider === 'kcb' || t.checkoutRequestId?.startsWith('KCB_') || t.checkoutRequestId?.startsWith('KCB_CO_')).length === 0 && (
                                                                <tr>
                                                                    <td colSpan={6} className="px-4 py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50">
                                                                        No KCB transactions found.
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
                                                        <KcbIcon className="w-6 h-6 text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black uppercase tracking-widest">KCB Callback Endpoints</h4>
                                                        <p className="text-[10px] font-bold text-slate-400">Provide these URLs to KCB for IPN and STK Push integrations</p>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" title="Click to select">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">IPN Endpoint (B2C/C2B)</p>
                                                        <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/api/kcb-ipn` : 'https://yourdomain.com/api/kcb-ipn'}
                                                        </code>
                                                    </div>
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" title="Click to select">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">STK Push Callback Endpoint</p>
                                                        <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/api/kcb-stk-callback` : 'https://yourdomain.com/api/kcb-stk-callback'}
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-14 shadow-indigo-200 uppercase tracking-widest text-xs w-full sm:w-auto">Confirm KCB Configuration</button>
                                            </div>
                                        </div>
                                    )}

                                    {billingSubTab === 'coop' && (
                                        <div className="animate-fade-in space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                                    <div className="flex items-center gap-4 mb-6">
                                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                                                            <span className="w-6 h-6 text-emerald-600 font-black text-center block">C</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase tracking-widest">Co-op Bank B2B Credentials</h4>
                                                            <p className="text-[10px] font-bold text-slate-400">Gateway Authentication settings</p>
                                                        </div>
                                                    </div>
                                                    <div className="space-y-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Service Name</label>
                                                            <input
                                                                type="text"
                                                                value={localCoopConfig.serviceName}
                                                                onChange={e => setLocalCoopConfig({ ...localCoopConfig, serviceName: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="Enter Service Name"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Connection ID (Username)</label>
                                                            <input
                                                                type="text"
                                                                value={localCoopConfig.connectionID}
                                                                onChange={e => setLocalCoopConfig({ ...localCoopConfig, connectionID: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="Enter Connection ID"
                                                            />
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Connection Password</label>
                                                                <input
                                                                    type="password"
                                                                    value={localCoopConfig.connectionPassword}
                                                                    onChange={e => setLocalCoopConfig({ ...localCoopConfig, connectionPassword: e.target.value })}
                                                                    className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white"
                                                                    placeholder="Password"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Institution Code</label>
                                                                <input
                                                                    type="text"
                                                                    value={localCoopConfig.institutionCode}
                                                                    onChange={e => setLocalCoopConfig({ ...localCoopConfig, institutionCode: e.target.value })}
                                                                    className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-emerald-500 transition-all text-slate-900 dark:text-white"
                                                                    placeholder="Institution Code"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-4 mb-4">
                                                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                                                                <span className="w-6 h-6 text-emerald-600 font-black text-center block">ℹ</span>
                                                            </div>
                                                            <div>
                                                                <h4 className="text-sm font-black uppercase tracking-widest">Co-op Gateway Specs</h4>
                                                                <p className="text-[10px] font-bold text-slate-400">REST integration endpoints</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                                                            Co-operative Bank B2B Standard API handles both **Customer Validation** and **Payment Advice** notifications over a single endpoint. Point the bank gateway callbacks to the URL below.
                                                        </p>
                                                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" title="Click to copy">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Validation & Advice Endpoint</p>
                                                            <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400 break-all">
                                                                {typeof window !== 'undefined' ? `${window.location.origin}/api/coop-b2b` : 'https://yourdomain.com/api/coop-b2b'}
                                                            </code>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex justify-end pt-4">
                                                <button onClick={handleSaveGlobalConfigs} className="btn-primary bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 px-10 h-14 shadow-emerald-200 uppercase tracking-widest text-xs w-full sm:w-auto border-emerald-500">Confirm Co-op Configuration</button>
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

                            {settingsSubTab === 'storage' && (
                                <div className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in space-y-10">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-2xl font-black uppercase tracking-tighter">Asset Storage Strategy</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Configure cPanel FTP for high-volume video & image hosting</p>
                                        </div>
                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                                            <ArrowUpTrayIcon className="w-8 h-8 text-indigo-600" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">FTP Hostname</label>
                                            <input 
                                                value={localFtpConfig.host} 
                                                onChange={e => setLocalFtpConfig({...localFtpConfig, host: e.target.value})}
                                                placeholder="ftp.yourserver.com" 
                                                className="form-input" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">FTP Port</label>
                                            <input 
                                                type="number" 
                                                value={localFtpConfig.port} 
                                                onChange={e => setLocalFtpConfig({...localFtpConfig, port: Number(e.target.value)})}
                                                className="form-input" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">FTP Username</label>
                                            <input 
                                                value={localFtpConfig.user} 
                                                onChange={e => setLocalFtpConfig({...localFtpConfig, user: e.target.value})}
                                                className="form-input" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">FTP Password</label>
                                            <input 
                                                type="password" 
                                                value={localFtpConfig.password || ''} 
                                                onChange={e => setLocalFtpConfig({...localFtpConfig, password: e.target.value})}
                                                className="form-input" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Remote Root Path</label>
                                            <input 
                                                value={localFtpConfig.remoteRoot} 
                                                onChange={e => setLocalFtpConfig({...localFtpConfig, remoteRoot: e.target.value})}
                                                placeholder="/public_html/assets" 
                                                className="form-input" 
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Public URL Root</label>
                                            <input 
                                                value={localFtpConfig.publicUrlRoot} 
                                                onChange={e => setLocalFtpConfig({...localFtpConfig, publicUrlRoot: e.target.value})}
                                                placeholder="https://yourserver.com/assets" 
                                                className="form-input" 
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-10 border-t border-slate-100 dark:border-slate-800">
                                        <div className="flex justify-between items-center mb-6">
                                            <div>
                                                <h4 className="text-lg font-black uppercase tracking-tighter italic">Google Drive Integration</h4>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Connect to Google Workspace for secure asset storage</p>
                                            </div>
                                            <button 
                                                onClick={() => setLocalGoogleDriveConfig({...localGoogleDriveConfig, isActive: !localGoogleDriveConfig.isActive})}
                                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${localGoogleDriveConfig.isActive ? 'bg-green-500 text-white shadow-lg shadow-green-100' : 'bg-slate-100 text-slate-400'}`}
                                            >
                                                {localGoogleDriveConfig.isActive ? 'ACTIVE' : 'INACTIVE'}
                                            </button>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Client ID</label>
                                                <input 
                                                    value={localGoogleDriveConfig.clientId} 
                                                    onChange={e => setLocalGoogleDriveConfig({...localGoogleDriveConfig, clientId: e.target.value})}
                                                    className="form-input" 
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Client Secret</label>
                                                <input 
                                                    type="password"
                                                    value={localGoogleDriveConfig.clientSecret} 
                                                    onChange={e => setLocalGoogleDriveConfig({...localGoogleDriveConfig, clientSecret: e.target.value})}
                                                    className="form-input" 
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Refresh Token</label>
                                                <input 
                                                    type="password"
                                                    value={localGoogleDriveConfig.refreshToken} 
                                                    onChange={e => setLocalGoogleDriveConfig({...localGoogleDriveConfig, refreshToken: e.target.value})}
                                                    className="form-input" 
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Folder ID</label>
                                                <input 
                                                    value={localGoogleDriveConfig.folderId} 
                                                    onChange={e => setLocalGoogleDriveConfig({...localGoogleDriveConfig, folderId: e.target.value})}
                                                    placeholder="Google Drive Folder ID"
                                                    className="form-input" 
                                                />
                                            </div>
                                            <div className="space-y-1.5 flex flex-col pt-6">
                                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Status</label>
                                                <button 
                                                    onClick={() => setLocalGoogleDriveConfig({...localGoogleDriveConfig, isActive: !localGoogleDriveConfig.isActive})}
                                                    className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${localGoogleDriveConfig.isActive ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}
                                                >
                                                    {localGoogleDriveConfig.isActive ? 'Integration Active' : 'Integration Inactive'}
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-6 flex justify-end">
                                            <button 
                                                onClick={async () => {
                                                    setIsTestingGoogleDrive(true);
                                                    try {
                                                        const res = await apiService.testGoogleDriveConnection(localGoogleDriveConfig);
                                                        if (res.success) {
                                                            alert(`Google Drive Handshake Successful!\n\nAccess: Verified\nAccount: ${res.details?.account}\nStorage: ${res.details?.storagePlan}`);
                                                        } else {
                                                            alert(`Google Drive Handshake Failed:\n${res.message}`);
                                                        }
                                                    } catch (e) {
                                                        alert(`Drive network error: ${e instanceof Error ? e.message : 'Unknown error'}`);
                                                    } finally {
                                                        setIsTestingGoogleDrive(false);
                                                    }
                                                }}
                                                disabled={isTestingGoogleDrive}
                                                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-700 disabled:opacity-50"
                                            >
                                                {isTestingGoogleDrive ? 'Verifying...' : 'Test Handshake'}
                                            </button>


                                            <button 
                                                onClick={() => document.getElementById('super-admin-drive-test-upload')?.click()}
                                                disabled={isTestingDriveUpload || !localGoogleDriveConfig.isActive}
                                                className="px-6 py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-indigo-100 disabled:opacity-50 flex items-center gap-2"
                                            >
                                                <ArrowUpTrayIcon className={`w-4 h-4 ${isTestingDriveUpload ? 'animate-bounce' : ''}`} />
                                                {isTestingDriveUpload ? 'Uploading...' : 'Test Photo Upload'}
                                            </button>
                                            <input 
                                                type="file" 
                                                id="super-admin-drive-test-upload" 
                                                className="hidden" 
                                                accept="image/*"
                                                onChange={handleGoogleDriveTestUpload}
                                            />
                                        </div>
                                    </div>

                                    <div className="pt-8 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-4">
                                        <button 
                                            onClick={async () => {
                                                setIsTestingFtp(true);
                                                try {
                                                    const res = await apiService.testFtpConnection(localFtpConfig);
                                                    if (res.success) {
                                                        alert(`FTP Verification Successful!\n\nHost: ${res.details?.host}\nPort: ${res.details?.port}\nFiles visible: ${res.details?.filesFound}`);
                                                    } else {
                                                        alert(`FTP Verification Failed:\n${res.message}\n${res.details || ''}`);
                                                    }
                                                } catch (e) {
                                                    alert(`FTP handshake error: ${e instanceof Error ? e.message : 'Unknown error'}`);
                                                } finally {
                                                    setIsTestingFtp(false);
                                                }
                                            }}
                                            disabled={isTestingFtp}
                                            className="btn-secondary px-8 h-12 uppercase tracking-widest text-[10px]"
                                        >
                                            {isTestingFtp ? 'Testing...' : 'Test Connection'}
                                        </button>
                                        <button 
                                            onClick={handleSaveGlobalConfigs}
                                            disabled={isSavingConfigs}
                                            className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-[10px]"
                                        >
                                            {isSavingConfigs ? 'Synchronizing...' : 'Update Storage Strategy'}
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
                                            <div className="flex items-center gap-2">
                                                <button 
                                                    onClick={() => {
                                                        const dsItems: ShowcaseItem[] = [
                                                            { id: `ds_${Date.now()}_1`, title: 'Driving School V2', description: 'Silicon-valley grade automation for fleet and students.', imageUrl: '/marketing/driving_school_hero_3d_1778920419924.png', category: 'Premium Modules' },
                                                            { id: `ds_${Date.now()}_2`, title: 'Intelligent Scheduling', description: 'Digital clockwork mechanism for lesson mapping.', imageUrl: '/marketing/driving_school_scheduling_3d_1778920509602.png', category: 'Automation' },
                                                            { id: `ds_${Date.now()}_3`, title: 'Student Mastery', description: '3D visualization of driving progress.', imageUrl: '/marketing/driving_school_mastery_3d_1778920618450.png', category: 'Analytics' }
                                                        ];
                                                        const currentItems = localCompanyInfo.showcaseConfig?.items || [];
                                                        setLocalCompanyInfo({
                                                            ...localCompanyInfo,
                                                            showcaseConfig: { ...localCompanyInfo.showcaseConfig, items: [...currentItems, ...dsItems] } as any
                                                        });
                                                        success('Driving School Showcase Preset added successfully!');
                                                    }}
                                                    className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                                >
                                                    <SparklesIcon className="w-4 h-4" />
                                                    Add DS Preset
                                                </button>
                                                <button 
                                                    onClick={handleAddShowcaseItem}
                                                    className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-200/50 dark:shadow-none"
                                                >
                                                    <PlusIcon className="w-4 h-4" />
                                                    Add Item
                                                </button>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {(localCompanyInfo.showcaseConfig?.items || []).map((item: ShowcaseItem) => (
                                                <div key={item.id} className="group relative bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden hover:shadow-xl transition-all duration-300">
                                                    <div className="h-32 bg-slate-100 dark:bg-slate-800 relative">
                                                        {item.imageUrl ? (
                                                            <img loading="lazy" src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
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
                                                        <MarketingLandingPage 
                                                            onLogin={() => {}} 
                                                            onLaunchSimulator={(role, modId) => {
                                                                const demoInst = institutions.find(i => i.institutionCode === 'INST001') || institutions[0];
                                                                setSelectedTenantForPerspective(demoInst);
                                                                setIsPerspectiveModalOpen(true);
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'portal_links' && (
                    <PortalLinksManager 
                        companyDetails={companyDetails}
                        onUpdateSettings={async (newSettings) => {
                            if (!companyDetails) return;
                            
                            const topLevelKeys = ['alumnaeJoiningFee', 'alumnaeFeatureFee', 'enforceGlobalOtp'];
                            const updated = { ...companyDetails };
                            const portalSettingsUpdates: any = {};

                            Object.keys(newSettings).forEach(key => {
                                if (topLevelKeys.includes(key)) {
                                    (updated as any)[key] = newSettings[key];
                                } else {
                                    portalSettingsUpdates[key] = newSettings[key];
                                }
                            });

                            if (Object.keys(portalSettingsUpdates).length > 0) {
                                updated.portalSettings = {
                                    ...(companyDetails.portalSettings || {
                                        showAlumnaeHub: true,
                                        showTouristHub: true,
                                        showMarketplace: true,
                                        showCommunityHub: true,
                                        showTransportHub: true,
                                        publicRegistrationEnabled: true
                                    }),
                                    ...portalSettingsUpdates
                                };
                            }

                            await apiService.saveCompanySettings(updated);
                            onRefreshData?.();
                        }}
                    />
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
                                className="p-8 flex gap-4 overflow-x-auto custom-scrollbar-horizontal pb-4 scroll-smooth snap-x snap-mandatory"
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
                                        <option value="Sematime">Sematime</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Sender ID</label>
                                    <input type="text" value={tenantSmsConfig.fromNumber || ''} onChange={e => setTenantSmsConfig(prev => ({ ...prev, fromNumber: e.target.value }))} className="form-input" placeholder="e.g. EduAi" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">
                                        {tenantSmsConfig.provider === 'Sematime' ? 'Account ID' : 'API Key / Username'}
                                    </label>
                                    <input type="text" value={tenantSmsConfig.apiKey || ''} onChange={e => setTenantSmsConfig(prev => ({ ...prev, apiKey: e.target.value }))} className="form-input" placeholder={tenantSmsConfig.provider === 'Sematime' ? "Sematime Account ID" : "Gateway username"} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">
                                        {tenantSmsConfig.provider === 'Sematime' ? 'Auth Token' : 'API Secret / Password'}
                                    </label>
                                    <input type="password" value={tenantSmsConfig.apiSecret || ''} onChange={e => setTenantSmsConfig(prev => ({ ...prev, apiSecret: e.target.value }))} className="form-input" placeholder={tenantSmsConfig.provider === 'Sematime' ? "Sematime Auth Token" : "Gateway password"} />
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
                            <div className="p-4 bg-slate-100 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Test SMS Delivery</label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="Phone (e.g. 2547XXXXXXXX)"
                                        value={tenantSmsTestPhone}
                                        onChange={e => setTenantSmsTestPhone(e.target.value)}
                                        className="flex-1 h-10 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:ring-2 focus:ring-purple-500"
                                    />
                                    <button 
                                        onClick={handleSendTenantTestSms}
                                        disabled={isTestingTenantSms}
                                        className="h-10 px-5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-md"
                                    >
                                        {isTestingTenantSms ? 'Sending...' : 'Test'}
                                    </button>
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

            {/* ── KCB Integration Modal ── */}
            {managingKcbFor && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setManagingKcbFor(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-900/10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                    <KcbIcon className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black uppercase tracking-tight text-indigo-900 dark:text-indigo-200">KCB Integration</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">{managingKcbFor.name}</p>
                                </div>
                            </div>
                            <button onClick={() => setManagingKcbFor(null)} className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">App Key</label>
                                    <input type="text" value={tenantKcbConfig.appKey} onChange={e => setTenantKcbConfig((prev: KcbConfig) => ({ ...prev, appKey: e.target.value }))} className="form-input" placeholder="KCB App Key" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">App Secret</label>
                                    <input type="password" value={tenantKcbConfig.appSecret} onChange={e => setTenantKcbConfig((prev: KcbConfig) => ({ ...prev, appSecret: e.target.value }))} className="form-input" placeholder="KCB App Secret" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Environment</label>
                                    <select value={tenantKcbConfig.environment || 'sandbox'} onChange={e => setTenantKcbConfig((prev: KcbConfig) => ({ ...prev, environment: e.target.value as any }))} className="form-select font-bold text-xs">
                                        <option value="sandbox">Sandbox (Testing)</option>
                                        <option value="production">Production (Live)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Short Code (Till/Paybill)</label>
                                    <input type="text" value={tenantKcbConfig.shortCode || ''} onChange={e => setTenantKcbConfig((prev: KcbConfig) => ({ ...prev, shortCode: e.target.value }))} className="form-input" placeholder="e.g. 123456" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Click to select">
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-2">Tenant IPN Endpoint</p>
                                    <code className="block text-[10px] font-mono text-indigo-600 dark:text-indigo-400 break-all">
                                        {typeof window !== 'undefined' ? `${window.location.origin}/api/kcb-ipn?institutionId=${managingKcbFor.id}` : `https://yourdomain.com/api/kcb-ipn?institutionId=${managingKcbFor.id}`}
                                    </code>
                                </div>
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Click to select">
                                    <p className="text-[10px] font-black uppercase text-slate-500 mb-2">STK Push Callback</p>
                                    <code className="block text-[10px] font-mono text-indigo-600 dark:text-indigo-400 break-all">
                                        {typeof window !== 'undefined' ? `${window.location.origin}/api/kcb-stk-callback?institutionId=${managingKcbFor.id}` : `https://yourdomain.com/api/kcb-stk-callback?institutionId=${managingKcbFor.id}`}
                                    </code>
                                </div>
                            </div>


                            <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">Simulate Tenant STK Push</p>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="text" 
                                        placeholder="2547XXXXXXXX"
                                        value={testRecipient}
                                        onChange={e => setTestRecipient(e.target.value)}
                                        className="flex-1 h-10 px-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button 
                                        onClick={async () => {
                                            if (!testRecipient) return alert("Enter a phone number to test.");
                                            setIsTesting(true);
                                            try {
                                                const result = await apiService.post('/api/payments/kcb-stk-push', {
                                                    phoneNumber: testRecipient,
                                                    amount: 1,
                                                    accountReference: 'EduAI-KCB-Tenant',
                                                    transactionDesc: 'KCB Tenant Connectivity Test',
                                                    config: tenantKcbConfig,
                                                    institutionId: managingKcbFor.id
                                                });
                                                if (result.success || result.ResponseCode === '0') {
                                                    const checkoutRequestId = result.CheckoutRequestID || `KCB_CO_${Date.now()}`;
                                                    await apiService.saveModuleRecord('mpesa_transactions', {
                                                        id: `KCB_${Date.now()}`,
                                                        transactionId: result.CheckoutRequestID || `TXN_KCB_${Date.now()}`,
                                                        checkoutRequestId: checkoutRequestId,
                                                        institutionId: managingKcbFor.id,
                                                        amount: 1,
                                                        phoneNumber: testRecipient,
                                                        payerName: 'KCB Tenant Test Payer',
                                                        status: 'pending',
                                                        metadata: { provider: 'kcb' },
                                                        timestamp: new Date().toISOString()
                                                    });

                                                    alert("KCB STK Push initiated successfully for this tenant. Check your phone.");
                                                    if (props.onRefreshData) props.onRefreshData();
                                                } else {
                                                    alert(`KCB STK Push failed: ${result.message || 'Unknown error'}`);
                                                }
                                            } catch (e: any) {
                                                alert(`KCB Gateway test failed: ${e.message}`);
                                            } finally {
                                                setIsTesting(false);
                                            }
                                        }}
                                        disabled={isTesting}
                                        className="h-10 px-5 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md shadow-indigo-100 dark:shadow-none"
                                    >
                                        {isTesting ? 'Sending...' : 'Test'}
                                    </button>
                                </div>
                            </div>

                            {/* Tenant Transaction Logs */}
                            <div className="mt-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-[10px] font-black uppercase text-slate-500">Tenant KCB Logs</p>
                                    <button onClick={() => props.onRefreshData?.()} className="p-1 hover:bg-slate-100 rounded-lg">
                                        <ArrowPathIcon className={`w-3 h-3 text-slate-400 ${isTesting ? 'animate-spin' : ''}`} />
                                    </button>
                                </div>
                                <div className="max-h-48 overflow-y-auto space-y-2">
                                    {(() => {
                                        const kcbTxns = (props.transactions || []).filter(t => {
                                            const isKcbTxn = t.checkoutRequestId?.startsWith('KCB_') || 
                                                             t.metadata?.provider === 'kcb' || 
                                                             (typeof t.metadata === 'string' && t.metadata.includes('"provider":"kcb"')) ||
                                                             (t.metadata && (t.metadata as any).provider === 'kcb');
                                            return isKcbTxn && t.institutionId === managingKcbFor.id;
                                        });

                                        return (
                                            <>
                                                {kcbTxns.map((txn: MpesaTransaction) => (
                                                    <div key={txn.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                                        <div>
                                                            <div className="text-[10px] font-black text-slate-900 dark:text-white">{txn.phoneNumber}</div>
                                                            <div className="text-[8px] font-bold text-slate-400 uppercase">{new Date(txn.timestamp).toLocaleString()}</div>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="text-[10px] font-black text-indigo-600">KES {txn.amount}</div>
                                                            <div className="flex items-center gap-2">
                                                                <span className={`text-[8px] font-black uppercase ${
                                                                    txn.status === 'completed' ? 'text-green-600' :
                                                                    txn.status === 'pending' ? 'text-amber-600' : 'text-red-600'
                                                                }`}>
                                                                    {txn.status}
                                                                </span>
                                                                {txn.status === 'pending' && txn.checkoutRequestId && (
                                                                    <button 
                                                                        onClick={() => handleQueryKcbStatus(txn.checkoutRequestId!)}
                                                                        className="text-[8px] font-black uppercase text-slate-400 hover:text-indigo-600 underline"
                                                                    >
                                                                        Query
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {kcbTxns.length === 0 && (
                                                    <div className="text-center py-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50 bg-slate-50 dark:bg-slate-800/30 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                                        No logs for this tenant
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>
                        </div>
                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                            <button onClick={() => setManagingKcbFor(null)} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-colors">Cancel</button>
                            <button
                                disabled={isSavingTenantConfig}
                                onClick={async () => {
                                    if (!managingKcbFor || !props.onUpdateInstitution) return;
                                    setIsSavingTenantConfig(true);
                                    try {
                                        await props.onUpdateInstitution(managingKcbFor.id, { kcbConfig: tenantKcbConfig });
                                        setManagingKcbFor(null);
                                    } finally {
                                        setIsSavingTenantConfig(false);
                                    }
                                }}
                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-10 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100/50 dark:shadow-none transition-all active:scale-95"
                            >
                                {isSavingTenantConfig ? 'Saving…' : 'Save KCB Config'}
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
                                        onLoginAsAdmin?.(selectedTenantForPerspective.id, opt.role as Role);
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
                                            <img loading="lazy" src={editingShowcaseItem.imageUrl} alt="Preview" className="w-full h-full object-cover" />
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
            {isAddListingModalOpen && (
                <AddCarListingModal
                    listing={selectedListingForEdit}
                    institution={currentInstitution || { id: 'superadmin', name: 'EduAI Hub' } as any}
                    onClose={() => { setIsAddListingModalOpen(false); setSelectedListingForEdit(null); }}
                    onSave={async (data) => {
                        if (onAddCarListing) await onAddCarListing(data);
                        setIsAddListingModalOpen(false);
                        setSelectedListingForEdit(null);
                    }}
                />
            )}
        </div>
    );
};




