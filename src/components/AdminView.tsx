
import React, { useState, useMemo, useCallback, useEffect, lazy, Suspense } from 'react';
import { isSuperAdminUser } from '../types';
import type {
    User, Department, Subject, Building, Room, AllocationRequest,
    TimetableEntry, SmsConfig, EmailConfig, LetterheadConfig, TransportVehicle, TransportOnboarding, VehicleLog,
    TimetableSettings, Course, AcademicYear, Semester, RequestStatus,
    Institution, Priority, CompanyDetails, MpesaTransaction,
    ExamTimetableSettings, AcademicLevel, StudentAttendance, TeacherCheckIn,
    Assessment, AssessmentMark, TimeOffRequest, StudentAbsenceRequest, DisciplineIncident,
    EnrollmentRequest, AbsenceRequest, LecturerContract,
    ExamTimetableEntry, Conflict, UserTask, ExtensionRequest,
    ActivityLog, VoteHead, FeeStructure, FinancialPeriod,
    InvoiceItem, TransactionStatus, FeedbackSubmission, LessonRating, Invoice, Receipt, Unavailability,
    BiometricConfig, TimeOffRequestStatus, StudentAbsenceRequestStatus, SecurityAlert, Visitor, Requisition, Role,
    Submission, UserUpdateData, County, Assignment, RetailExpense, RetailStore, RetailInventoryItem, Supplier, CountyInventoryItem,
    CoopFarmer, CoopCollection, CoopRider, CoopAgrovetInventory, CoopAgrovetSales, SaccoAccount, SaccoTransaction, CoopMonthlyPayout, CoopExpense, CoopIncome,
    LawClient, LawMatter, LawDocument, LawTimeEntry, LawInvoice, LawTrustTransaction,
    LawAgreement, LawAgreementTemplate,
    DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment,
    CarListing, TestDriveBooking, CarAppraisal, CarInvoice, CarPayment, SchoolRegistry, BankTransaction, InstitutionModuleState,
    StudentEnrollment
} from '../types';
const UserManager = lazy(() => import('./UserManager').then(m => ({ default: m.UserManager })));
const TimetableGenerator = lazy(() => import('./TimetableGenerator').then(m => ({ default: m.TimetableGenerator })));
const SettingsManager = lazy(() => import('./SettingsManager').then(m => ({ default: m.SettingsManager })));
const SubjectManager = lazy(() => import('./SubjectManager').then(m => ({ default: m.SubjectManager })));
const CourseManager = lazy(() => import('./CourseManager').then(m => ({ default: m.CourseManager })));
const InteractionsManager = lazy(() => import('./InteractionsManager').then(m => ({ default: m.InteractionsManager })));
const CommunicationsManager = lazy(() => import('./CommunicationsManager').then(m => ({ default: m.CommunicationsManager })));
const ReportsDashboard = lazy(() => import('./ReportsDashboard').then(m => ({ default: m.ReportsDashboard })));
const DSAnalyticsView = lazy(() => import('./ds/DSAnalyticsView').then(m => ({ default: m.DSAnalyticsView })));
const StudentLeaveOutManager = lazy(() => import('./StudentLeaveOutManager').then(m => ({ default: m.StudentLeaveOutManager })));
const SubscriptionManager = lazy(() => import('./SubscriptionManager').then(m => ({ default: m.SubscriptionManager })));
const RetailManager = lazy(() => import('./retail/RetailManager').then(m => ({ default: m.RetailManager })));
const ProcurementManager = lazy(() => import('./ProcurementManager').then(m => ({ default: m.ProcurementManager })));
const CooperativeManager = lazy(() => import('./coop/CooperativeManager').then(m => ({ default: m.CooperativeManager })));
const CarServiceView = lazy(() => import('./carservice/CarServiceView').then(m => ({ default: m.CarServiceView })));
const ChurchDashboard = lazy(() => import('./church/ChurchDashboard').then(m => ({ default: m.ChurchDashboard })));
const LogisticsManager = lazy(() => import('./LogisticsManager').then(m => ({ default: m.LogisticsManager })));
const LawManager = lazy(() => import('./law/LawManager').then(m => ({ default: m.LawManager })));
const DrivingSchoolManager = lazy(() => import('./ds/DrivingSchoolManager').then(m => ({ default: m.DrivingSchoolManager })));
const BeautyCollegeManager = lazy(() => import('./bc/BeautyCollegeManager').then(m => ({ default: m.BeautyCollegeManager })));
const BCReportsView = lazy(() => import('./bc/BCReportsView').then(m => ({ default: m.BCReportsView })));
const FiscalGuard = lazy(() => import('./Finance/FiscalGuard').then(m => ({ default: m.FiscalGuard })));
import { TimetableUserDirectory } from './timetable/TimetableUserDirectory';
const CommunityManager = lazy(() => import('./CommunityManager').then(m => ({ default: m.CommunityManager })));
const AlumniManager = lazy(() => import('./AlumniManager').then(m => ({ default: m.AlumniManager })));
const HospitalityManager = lazy(() => import('./HospitalityManager').then(m => ({ default: m.HospitalityManager })));
const SchoolShowcaseManager = lazy(() => import('./SchoolShowcaseManager').then(m => ({ default: m.SchoolShowcaseManager })));
const CampaignCommandView = lazy(() => import('./CampaignCommandView').then(m => ({ default: m.CampaignCommandView })));
const EduVoteAI = lazy(() => import('./EduVoteAI').then(m => ({ default: m.EduVoteAI })));
const EduVoteProjector = lazy(() => import('./EduVoteProjector').then(m => ({ default: m.EduVoteProjector })));
const AddCarListingModal = lazy(() => import('./modals/AddCarListingModal').then(m => ({ default: m.AddCarListingModal })));
const CreateCarInvoiceModal = lazy(() => import('./modals/CreateCarInvoiceModal').then(m => ({ default: m.CreateCarInvoiceModal })));
const RecordCarPaymentModal = lazy(() => import('./modals/RecordCarPaymentModal').then(m => ({ default: m.RecordCarPaymentModal })));
const CarReceiptModal = lazy(() => import('./modals/CarReceiptModal').then(m => ({ default: m.CarReceiptModal })));
const AddCarLeadModal = lazy(() => import('./modals/AddCarLeadModal').then(m => ({ default: m.AddCarLeadModal })));
const AcademicConfigManager = lazy(() => import('./AcademicConfigManager').then(m => ({ default: m.AcademicConfigManager })));
const AcademicsOfficerView = lazy(() => import('./AcademicsOfficerView').then(m => ({ default: m.AcademicsOfficerView })));
const BoardingMasterView = lazy(() => import('./BoardingMasterView').then((m: any) => ({ default: m?.default || m?.BoardingMasterView || m })));
const ExamInsights = lazy(() => import('./Academics/ExamInsights').then(m => ({ default: m.ExamInsights })));
const AcademicReportsHub = lazy(() => import('./Academics/AcademicReportsHub').then(m => ({ default: m.AcademicReportsHub })));
const DisciplineManager = lazy(() => import('./Academics/DisciplineManager').then(m => ({ default: m.DisciplineManager })));
const AutomotiveManager = lazy(() => import('./automotive/AutomotiveManager').then(m => ({ default: m.AutomotiveManager })));
const CarShowroomDashboard = lazy(() => import('./automotive/CarShowroomDashboard').then(m => ({ default: m.CarShowroomDashboard })));
const CarInventoryList = lazy(() => import('./automotive/CarInventoryList').then(m => ({ default: m.CarInventoryList })));
const CarSalesLedger = lazy(() => import('./automotive/CarSalesLedger').then(m => ({ default: m.CarSalesLedger })));
const BankFeedsManager = lazy(() => import('./automotive/BankFeedsManager').then(m => ({ default: m.BankFeedsManager })));
const ShowroomConfigManager = lazy(() => import('./automotive/ShowroomConfigManager').then(m => ({ default: m.ShowroomConfigManager })));
const TransportManager = lazy(() => import('./TransportManager').then(m => ({ default: m.TransportManager })));
const StudentEnrollmentManager = lazy(() => import('./common/StudentEnrollmentManager').then(m => ({ default: m.StudentEnrollmentManager })));
const EduFlowManager = lazy(() => import('./common/EduFlowManager').then(m => ({ default: m.EduFlowManager })));
const CdfManager = lazy(() => import('./CdfManager').then(m => ({ default: m.CdfManager })));
const EduAiHub = lazy(() => import('./common/EduAiHub').then(m => ({ default: m.EduAiHub })));
const GrainMillerManager = lazy(() => import('./milling/GrainMillerManager').then(m => ({ default: m.GrainMillerManager })));
const SchoolDeviceAccessManager = lazy(() => import('./Network/SchoolDeviceAccessManager').then(m => ({ default: m.SchoolDeviceAccessManager })));


import { ModuleAccessGuard } from './ModuleAccessGuard';
import { RemedialLessonsManager } from './RemedialLessonsManager';
import { ChurchDenominationProvider } from './church/ChurchDenominationProvider';

import { DocumentTextIcon } from './icons/DocumentTextIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { useDrivingSchool, DrivingSchoolContext, DrivingSchoolProvider } from '../services/DrivingSchoolContext';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { EyeIcon } from './icons/EyeIcon';
import { SignalIcon } from './icons/SignalIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { BarChart3Icon } from './icons/BarChart3Icon';
import { GridIcon } from './icons/GridIcon';
import { PalmTreeIcon } from './icons/PalmTreeIcon';
import { TruckIcon } from './icons/TruckIcon';
import { CarIcon } from './icons/CarIcon';
import { StoreIcon } from './icons/StoreIcon';
import { ShoppingBagIcon } from './icons/ShoppingBagIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { UserIcon } from './icons/UserIcon';
import { ClockIcon } from './icons/ClockIcon';
import { HeartIcon } from './icons/HeartIcon';
import { XIcon } from './icons/XIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { BedIcon } from './icons/BedIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { HomeIcon } from './icons/HomeIcon';
import { MagnifyingGlassIcon as SearchIcon } from './icons/MagnifyingGlassIcon';
import { GlobeAltIcon } from './icons/GlobeAltIcon';
import { SmartphoneIcon } from './icons/SmartphoneIcon';
import { BriefcaseIcon } from './icons/BriefcaseIcon';

const DirectAssignModal = lazy(() => import('./DirectAssignModal').then(m => ({ default: m.DirectAssignModal })));
const AcademicYearManager = lazy(() => import('./AcademicYearManager').then(m => ({ default: m.AcademicYearManager })));
const TimetablesView = lazy(() => import('./TimetablesView').then(m => ({ default: m.TimetablesView })));
import { INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS, RETAIL_SUBTYPES, VALID_STAFF_ROLES } from '../constants';
const EditInstitutionModal = lazy(() => import('./EditInstitutionModal').then(m => ({ default: m.EditInstitutionModal })));
const TimetableWizard = lazy(() => import('./TimetableWizard').then(m => ({ default: m.TimetableWizard })));
import { PdfPreviewModal } from './PdfPreviewModal';
import * as pdfService from '../services/pdfService';
import { apiService } from '../services/apiService';
const RetailReportsDashboard = lazy(() => import('./retail/RetailReportsDashboard').then(m => ({ default: m.RetailReportsDashboard })));
const CarShowroomReportsDashboard = lazy(() => import('./automotive/CarShowroomReportsDashboard').then(m => ({ default: m.CarShowroomReportsDashboard })));
const ExternalModuleView = lazy(() => import('./ExternalModuleView').then(m => ({ default: m.ExternalModuleView })));
const FuelStationDashboard = lazy(() => import('./FuelStationDashboard').then(m => ({ default: m.FuelStationDashboard })));
const CorporateInvoicingManager = lazy(() => import('./Invoicing/CorporateInvoicingManager').then(m => ({ default: m.CorporateInvoicingManager })));
import { isSchoolInstitution, isHigherEdInstitution, isEduInstitution, isMillingInstitution, isInvoicingInstitution, isStrictTeacherUser, isTeacherRole, isDSInstitution } from '../utils/roleUtils';

export interface AdminViewProps {
    currentUser?: User;
    users?: User[];
    studentEnrollments?: StudentEnrollment[];
    requests?: AllocationRequest[];
    allocations?: AllocationRequest[];
    departments?: Department[];
    subjects?: Subject[];
    courses?: Course[];
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
    companyDetails?: CompanyDetails;
    activityLog?: ActivityLog[];
    expenses?: any[];
    transactions?: MpesaTransaction[];
    receipts?: Receipt[];
    invoices?: Invoice[];
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
    institutions?: Institution[];
    counties?: County[];
    schoolRegistry?: SchoolRegistry[];
    carBankTransactions?: BankTransaction[];
    activityLogLimit?: number;
    setActivityLogLimit?: React.Dispatch<React.SetStateAction<number>>;
    transactionLimit?: number;
    setTransactionLimit?: React.Dispatch<React.SetStateAction<number>>;
    receiptLimit?: number;
    setReceiptLimit?: React.Dispatch<React.SetStateAction<number>>;
    notificationLimit?: number;
    setNotificationLimit?: React.Dispatch<React.SetStateAction<number>>;
    
    // Academic Lifecycle Props
    teacherCheckIns?: TeacherCheckIn[];
    incidents?: DisciplineIncident[];
    marks?: AssessmentMark[];
    onAddIncident?: (data: any) => Promise<void>;

    onAddUser?: (userData: any) => Promise<void>;
    onEditUser?: (id: string, data: any) => Promise<void>;
    onDeleteUser?: (id: string) => Promise<void>;
    onImportUsers?: (imported: any[]) => Promise<void>;
    onImportStudents?: (imported: any[]) => Promise<void>;
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
    onBulkUpdateRequestStatus?: (status: RequestStatus, deptid: string) => Promise<void>;
    onDirectAssign?: (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections: Record<string, string[]>) => void;
    onTimetableGenerated?: (timetable: any[], academicYearId: string, semesterId: string) => Promise<void> | void;
    onExamTimetableGenerated?: (entries: ExamTimetableEntry[], ay: string, sem: string) => Promise<void>;
    onSaveTimetableSettings?: (config: TimetableSettings) => void;
    onSaveExamTimetableSettings?: (config: ExamTimetableSettings) => void;
    onUpdateLogo?: (logo: string | null) => void;
    onUpdateFooterImage?: (footer: string | null) => void;
    onUpdateThemeColor?: (color: string) => void;
    onUpdateInstitution?: (id: string, data: Partial<Institution>) => Promise<void>;
    onAddTask?: (data: any) => Promise<void> | void;
    onUpdateTask?: (id: string, isComplete: boolean) => Promise<void>;
    onDeleteTask?: (id: string) => Promise<void>;
    onLogAction?: (message: string) => Promise<void>;

    // Legal & Law Firm Props
    lawClients?: LawClient[];
    lawMatters?: LawMatter[];
    lawDocuments?: LawDocument[];
    lawTimeEntries?: LawTimeEntry[];
    lawInvoices?: LawInvoice[];
    lawTrustTransactions?: LawTrustTransaction[];
    onAddLawClient?: (data: any) => Promise<void>;
    onAddLawMatter?: (data: any) => Promise<void>;
    onAddLawTimeEntry?: (data: any) => Promise<void>;
    onAddLawTrustTransaction?: (data: any) => Promise<void>;
    onAddLawInvoice?: (data: any) => Promise<void>;
    onUpdateLawMatter?: (id: string, data: any) => Promise<void>;
    lawAgreementTemplates?: LawAgreementTemplate[];
    lawAgreements?: LawAgreement[];
    onAddLawAgreementTemplate?: (data: any) => Promise<void>;
    onGenerateLawAgreement?: (data: any) => Promise<void>;
    onApproveLawAgreement?: (id: string, notes: string) => Promise<void>;

    onSendBulkCredentials?: (users: User[], method: 'sms' | 'email') => Promise<{ success_count: number, fail_count: number }>;
    onSendSms?: (recipient: string | string[], message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<{ success: boolean; message: string; }>;
    onSaveSmsConfig?: (config: SmsConfig) => void;
    onUpdateRequest?: (id: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    onWithdrawRequest?: (id: string) => Promise<void>;
    onAddExtensionRequest?: (reason: string) => void;
    onAddUnavailability?: (userId: string, u: Omit<Unavailability, 'id' | 'status'>) => void;
    onUpdateUnavailability?: (userId: string, id: string, data: any) => void;
    onDeleteUnavailability?: (userId: string, id: string) => void;
    onUpdateTimeOffRequestStatus?: (id: string, status: TimeOffRequestStatus) => Promise<void>;
    onRefreshData?: () => Promise<void>;
    onMoveTimetableEntry?: (entryId: string, newDay: string, newStartTime: string) => void;
    onActivateModuleTrial?: (moduleId: string) => Promise<void>;
    onAddFarmer?: (data: any) => Promise<void>;
    onUpdateFarmer?: (id: string, data: any) => Promise<void>;
    onImportFarmers?: (imported: any[]) => Promise<void>;
    onLogCollection?: (data: any) => Promise<void>;
    onImportCollections?: (imported: any[]) => Promise<void>;
    onBulkConfirmCollections?: (riderId: string, collections: any[]) => Promise<void>;
    onAddRider?: (data: any) => Promise<void>;
    onConfirmCollection?: (id: string, qty: number) => Promise<void>;
    onApproveCollection?: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onAddCoopExpense?: (data: Partial<CoopExpense>) => Promise<void>;
    onAddCoopIncome?: (data: Partial<CoopIncome>) => Promise<void>;
    onAddCoopAgrovetInventory?: (data: Partial<CoopAgrovetInventory>) => Promise<void>;
    onAddCoopAgrovetSale?: (data: Partial<CoopAgrovetSales>) => Promise<void>;
    onAddCoopAgrovetSales?: (data: Partial<CoopAgrovetSales>[]) => Promise<void>;
    onInitiatePayouts?: (data: any) => Promise<void>;
    onApprovePayouts?: (payoutIds: string[], status: 'initiated' | 'approved' | 'paid' | 'rejected' | 'pending') => Promise<void>;
    onDisbursePayouts?: (payoutIds: string[]) => Promise<void>;
    onAddPayouts?: (payouts: any[]) => Promise<void>;
    onUpdateCompanyDetails?: (data: Partial<CompanyDetails>) => Promise<void>;
    onSwitchPerspective?: (role: Role) => void;
    onSaveLetterheadConfig?: (config: LetterheadConfig) => void;
    onAddSaccoAccount?: (data: Partial<SaccoAccount>) => Promise<void>;
    
    countyInventory?: CountyInventoryItem[];
    onMarkInventoryReceived?: (id: string) => Promise<void>;
    
    getLecturerById?: (id: string) => User | undefined;
    getSubjectById?: (id: string) => Subject | undefined;
    getRoomById?: (id: string) => Room | undefined;
    getCountyById?: (id: string) => County | undefined;
    getInstitutionById?: (id: string) => Institution | undefined;
    
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
    notifications?: any[];
    vehicles?: TransportVehicle[];
    onAddVehicle?: (vehicle: Omit<TransportVehicle, 'id'>) => Promise<void>;
    onUpdateVehicle?: (id: string, updates: Partial<TransportVehicle>) => Promise<void>;
    onDeleteVehicle?: (id: string) => Promise<void>;
    courseSizes?: Map<string, number>;
    timeOffRequests?: TimeOffRequest[];
    enrollmentRequests?: EnrollmentRequest[];
    onImportSubjectsAndAssociate?: (subjects: (Omit<Subject, 'id' | 'institutionId'> & { targetCourseLevelId: string })[]) => Promise<void>;
    requisitions?: Requisition[];
    onAddRequisition?: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
    onUpdateRequisition?: (reqId: string, data: Partial<Requisition>) => Promise<void>;
    onAddTimeOffRequest?: (data: Partial<TimeOffRequest>) => Promise<void>;
    onAddTransaction?: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    isGeneratingDemoData?: boolean;
    demoDataGenerationProgress?: number;
    demoDataGenerationMessage?: string;
    onManageUnavailability?: (user: User) => void;
    onAddParent?: (studentId: string, parentData: { name: string, email: string, phone: string }) => Promise<{ success: boolean, message: string, credentials?: { email: string, password: string } }>;
    onDeleteParent?: (studentId: string, parentId: string) => void;
    onPublishTimetable?: (fileUrl: string) => void;
    onRemovePublishedTimetable?: () => void;
    onSendTestEmail?: (recipient: string) => Promise<{ success: boolean; message: string; }>;
    onSaveEmailConfig?: (config: EmailConfig) => void;
    onImportRooms?: (rooms: Omit<Room, 'id' | 'institutionId'>[]) => void;
    onAssociateSubjectToCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onDisassociateSubjectFromCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onUpdateExtensionRequestStatus?: (requestId: string, status: 'approved' | 'rejected', extensionDays?: number) => void;
    
    // Bank Reconciliation
    onReconcileBankTransaction?: (transactionId: string, invoiceId: string) => Promise<void>;
    onFetchBankFeeds?: () => Promise<void>;
    
    onSaveBiometricConfig?: (config: BiometricConfig) => void;
    onUpdateVoteHeads?: (heads: VoteHead[]) => void;
    onUpdateFeeStructures?: (structures: FeeStructure[]) => void;
    onUpdateFinancialPeriods?: (periods: FinancialPeriod[]) => void;
    onAddBuilding?: (name: string) => Promise<boolean>;
    onAddBuildings?: (buildings: Omit<Building, 'id' | 'institutionId'>[]) => Promise<void>;
    onUpdateBuilding?: (id: string, data: any) => void;
    onDeleteBuilding?: (id: string) => void;
    onAddInstitution?: (data: Omit<Institution, 'id'>) => void;
    onDeleteInstitution?: (institutionId: string) => void;
    onToggleInstitutionStatus?: (institutionId: string) => void;
    onLoginAsAdmin?: (institutionId: string) => void;
    onGenerateReceipt?: (transaction: MpesaTransaction) => void;
    assignments?: Assignment[];
    submissions?: Submission[];
    onAddAssignment?: (data: Omit<Assignment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssignment?: (id: string) => void;
    onUpdateSubmission?: (id: string, data: Partial<Submission>) => void;
    isImpersonating?: boolean;
    transportOnboarding?: TransportOnboarding[];
    vehicleLogs?: VehicleLog[];
    onLogGateAction?: (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => Promise<void>;
    onOnboardStudent?: (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => Promise<void>;
    onOffboardStudent?: (recordId: string, lat?: number, lng?: number) => Promise<void>;
    onConfirmReceipt?: (recordId: string) => Promise<void>;
    retailExpenses?: RetailExpense[];
    onAddRetailExpense?: (expense: Omit<RetailExpense, 'id' | 'institutionId' | 'date' | 'recordedById'>) => Promise<void>;
    retailStores?: RetailStore[];
    inventory?: RetailInventoryItem[];
    suppliers?: Supplier[];
    activeRole?: Role;
    absenceRequests?: AbsenceRequest[];
    contracts?: LecturerContract[];
    feedbackSubmissions?: FeedbackSubmission[];
    lessonRatings?: LessonRating[];
    studentAbsenceRequests?: StudentAbsenceRequest[];
    securityAlerts?: SecurityAlert[];
    examTimetable?: ExamTimetableEntry[];
    assessments?: Assessment[];
    assessmentMarks?: AssessmentMark[];
    visitors?: Visitor[];
    studentAttendances?: StudentAttendance[];
    studentCheckIns?: Record<string, string>;
    onUpdateFeedbackStatus?: (id: string, status: string) => Promise<void> | void;
    onAddAssessment?: (data: any) => Promise<void> | void;
    onDeleteAssessment?: (id: string) => Promise<void> | void;
    onUpdateAssessmentStatus?: (id: string, status: string) => Promise<void> | void;
    onSaveAssessmentMarks?: (id: string, marks: any[]) => Promise<void> | void;

    // Driving School Props
    dsInstructors?: DSInstructor[];
    dsVehicles?: DSVehicle[];
    dsStudents?: DSStudent[];
    dsLessons?: DSLesson[];
    dsMastery?: DSSkillMastery[];
    dsSettings?: DSSettings | null;
    dsInvoices?: DSInvoice[];
    dsPayments?: DSPayment[];
    onAddDSInstructor?: (data: any) => Promise<void>;
    onAddDSVehicle?: (data: any) => Promise<void>;
    onAddDSStudent?: (data: any) => Promise<void>;
    onAddDSLesson?: (data: any) => Promise<void>;
    onAddDSMastery?: (data: any) => Promise<void>;
    onUpdateDSSettings?: (data: any) => Promise<void>;
    onAddDSInvoice?: (data: any) => Promise<void>;
    onAddDSPayment?: (data: any) => Promise<void>;

    // Car Sales Props
    carListings?: CarListing[];
    carTestDrives?: TestDriveBooking[];
    carAppraisals?: CarAppraisal[];
    carInvoices?: CarInvoice[];
    carPayments?: CarPayment[];
    onAddCarListing?: (data: Partial<CarListing>) => Promise<void>;
    onAddCarInvoice?: (data: Partial<CarInvoice>) => Promise<void>;
    onAddCarPayment?: (data: Partial<CarPayment>) => Promise<void>;
    onDeleteCarInvoice?: (invoiceId: string) => Promise<void>;
    onDeleteCarPayment?: (paymentId: string) => Promise<void>;
    onUpdateCarTestDriveStatus?: (id: string, status: any) => Promise<void>;
    onAddCarAppraisal?: (data: Partial<CarAppraisal>) => Promise<void>;
    onManualInvoice?: (institutionId: string, items: InvoiceItem[], totalAmount: number, dueDate: string, isQuote?: boolean, issueDate?: string) => void;
    onAccessAlumnaPortal?: (school: SchoolRegistry) => void;
}


export const AdminView: React.FC<AdminViewProps> = (props) => {
    const dsContext = React.useContext(DrivingSchoolContext);
    const { 
        activeAcademicYear, 
        activeSemester, 
        requests = [],
        subjects = [], users = [], rooms = [], courses = [], 
        currentInstitution, 
        studentEnrollments = [],
        companyDetails = {} as any, 
        courseSizes = new Map(), 
        retailStores = [], 
        inventory = [], 
        suppliers = [], 
        retailExpenses = [], 
        securityAlerts = [], 
        assessments = [], 
        assessmentMarks = [], 
        visitors = [], 
        studentAttendances = [], 
        studentCheckIns = {},
        onAddUser = async () => {},
        onEditUser = async () => {},
        onDeleteUser = async () => {},
        onLogAction = async () => {},
        getLecturerById = () => undefined,
        getSubjectById = () => undefined,
        getRoomById = () => undefined,
        timetableSettings = {} as any,
        examTimetableSettings = {} as any,
        letterheadConfig = {} as any,
        smsConfig = {} as any,
        emailConfig = {} as any
    } = props;
    const { 
        coopFarmers = [], coopCollections = [], coopRiders = [], 
        coopAgrovetInventory = [], coopAgrovetSales = [], 
        saccoAccounts = [], saccoTransactions = [], coopPayouts = [],
        coopExpenses = [], coopIncome = [],
        onActivateModuleTrial = async () => {}
    } = props;
    const scrollRef = React.useRef<HTMLDivElement>(null);

    const handleScroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current;
            const scrollTo = direction === 'left' ? scrollLeft - clientWidth / 2 : scrollLeft + clientWidth / 2;
            scrollRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' });
        }
    };


    const [activeTab, setActiveTab] = useState<'dashboard' | 'timetable' | 'users' | 'customers' | 'courses' | 'leaveout' | 'boarding' | 'comms' | 'settings' | 'reports' | 'transport' | 'logistics' | 'deliveries' | 'retail' | 'procurement' | 'external_module' | 'coop' | 'sacco' | 'agrovet' | 'car_service' | 'farmers' | 'collections' | 'riders' | 'payouts' | 'finances' | 'approvals' | 'church' | 'driving_school' | 'law' | 'community' | 'alumni' | 'hospitality' | 'auto_marketplace' | 'showcase' | 'fuel_station' | 'ds_students' | 'ds_leads' | 'ds_lessons' | 'ds_fleet' | 'ds_instructors' | 'ds_finance' | 'ds_broadcaster' | 'bc_students' | 'bc_courses' | 'bc_finance' | 'bc_practicals' | 'bc_trainers' | 'bc_broadcaster' | 'campaign' | 'enrollment' | 'enrollment_students' | 'enrollment_teachers' | 'enrollment_support_staff' | 'enrollment_broadcaster' | 'enrollment_calendar' | 'enrollment_guests' | 'enrollment_portal_hub' | 'inv_dashboard' | 'inv_inventory' | 'inv_stock_inwards' | 'inv_pos' | 'inv_teachers' | 'inv_support_staff' | 'inv_students' | 'inv_reports' | 'inv_logistics' | 'inv_stores' | 'inv_expenses' | 'inv_requisitions' | 'inv_vendors' | 'inv_transfers' | 'inv_config' | 'ng_cdf' | 'eduflow' | 'eduvote' | 'eduvote_projector' | 'ai_hub' | 'remedials' | 'beauty_college' | 'fiscal_guard' | 'milling' | 'corporate_invoices' | 'network_devices'>('dashboard');
    const [activeScope, setActiveScope] = useState<'console_hub' | 'academics' | 'inventory' | 'boarding' | 'logistics' | 'ds' | 'bc' | 'eduvote' | 'remedials'>(() => {
        const isDSInst = props.currentInstitution && (
            isDSInstitution(props.currentInstitution) || 
            props.currentInstitution.institutionType === 'Driving School' || 
            (props.currentInstitution.institutionType || '').toLowerCase().includes('driving') ||
            (props.currentInstitution.category || '').toLowerCase().includes('driving') ||
            (props.currentInstitution.businessSubType || '').toLowerCase().includes('driving') ||
            (props.currentInstitution.name || '').toLowerCase().includes('driving') ||
            (props.currentInstitution.name || '').toLowerCase().includes('driver') ||
            props.currentInstitution.id?.startsWith('ds_') ||
            props.currentInstitution.id?.includes('driving')
        );
        const isDSUser = props.activeRole === 'driving_instructor' || props.currentUser?.role === 'driving_instructor';
        return (isDSInst || isDSUser) ? 'ds' : 'console_hub';
    });
    const [projectorElectionId, setProjectorElectionId] = useState<string | null>(null);

    const [timetableSubTab, setTimetableSubTab] = useState<'wizard' | 'scheduler' | 'registry' | 'insights' | 'intelligence' | 'discipline' | 'subjects' | 'calendar' | 'teachers' | 'students'>('wizard');
    const [coursesSubTab, setCoursesSubTab] = useState<'registry' | 'calendar' | 'subjects' | 'settings'>('registry');
    const [enrollmentSubTab, setEnrollmentSubTab] = useState<'students' | 'teachers' | 'support_staff' | 'broadcaster' | 'calendar' | 'guests' | 'portal_hub'>('students');
    const [timetablePreselectedViewMode, setTimetablePreselectedViewMode] = useState<'grid' | 'workload' | 'relations' | 'master_course' | 'master_department' | 'master_building' | 'lecturer_schedule' | 'master_staff' | 'subjects' | 'test' | null>(null);
    const [timetablePreselectedLecturerId, setTimetablePreselectedLecturerId] = useState<string>('');
    const [timetablePreselectedCourseId, setTimetablePreselectedCourseId] = useState<string>('all');
    const [isDirectAssignOpen, setIsDirectAssignOpen] = useState(false);
    const [requestedSettingsTab, setRequestedSettingsTab] = useState<string | undefined>(undefined);
    const [isSecurityAlertModalOpen, setIsSecurityAlertModalOpen] = useState(false);
    const [isAddListingModalOpen, setIsAddListingModalOpen] = useState(false);
    const [selectedListingForEdit, setSelectedListingForEdit] = useState<CarListing | null>(null);
    const [autoSubTab, setAutoSubTab] = useState<'dashboard' | 'inventory' | 'financials' | 'bank_feeds' | 'showroom_settings' | 'customers'>('dashboard');
    const [retailAgencySubTab, setRetailAgencySubTab] = useState<string>('dashboard');
    const [isAddCarInvoiceModalOpen, setIsAddCarInvoiceModalOpen] = useState(false);
    const [isAddCarPaymentModalOpen, setIsAddCarPaymentModalOpen] = useState(false);
    const [isAddCarLeadModalOpen, setIsAddCarLeadModalOpen] = useState(false);
    const [isCarReceiptModalOpen, setIsCarReceiptModalOpen] = useState(false);
    const [selectedInvoiceForReceipt, setSelectedInvoiceForReceipt] = useState<CarInvoice | null>(null);
    const [selectedPaymentForReceipt, setSelectedPaymentForReceipt] = useState<CarPayment | null>(null);
    const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<CarInvoice | null>(null);
    const [selectedInvoiceForEdit, setSelectedInvoiceForEdit] = useState<CarInvoice | null>(null);
    const [selectedPaymentForEdit, setSelectedPaymentForEdit] = useState<CarPayment | null>(null);
    const [pdfPreviewData, setPdfPreviewData] = useState<{ uri: string; title: string } | null>(null);

    // Resilient student resolution: unites student users, student_enrollments, and local cached enrollments
    const effectiveStudents = useMemo(() => {
        const userStudents = (props.users || []).filter(u => u && (u.role === 'student' || (u.role as string) === 'learner' || (u.role as string) === 'pupil'));
        const enrList = (props.studentEnrollments && props.studentEnrollments.length > 0) ? props.studentEnrollments : [];
        
        let fallbackEnrs: any[] = [];
        if (enrList.length === 0 && props.currentInstitution?.id) {
            try {
                const cleanId = props.currentInstitution.id.replace(/^inst_/, '');
                const raw = localStorage.getItem(`eduai_student_enrollments_${props.currentInstitution.id}`) ||
                            localStorage.getItem(`eduai_student_enrollments_${cleanId}`) ||
                            localStorage.getItem('eduai_student_enrollments');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (Array.isArray(parsed)) fallbackEnrs = parsed;
                }
            } catch (_) {}
        }
        const allEnrs = enrList.length > 0 ? enrList : fallbackEnrs;
        
        const studentMap = new Map<string, User>();
        // Index existing user students
        userStudents.forEach(u => {
            if (u.id) studentMap.set(String(u.id).toLowerCase(), u);
            const adm = (u as any).admissionNumber || (u as any).admission_number;
            if (adm) studentMap.set(String(adm).toLowerCase(), u);
        });
        
        const combined: User[] = [...userStudents];
        allEnrs.forEach((enr: any) => {
            if (!enr) return;
            const status = (enr.status || '').toLowerCase();
            if (status === 'graduated' || status === 'dropped' || status === 'inactive') return;
            const uId = enr.userId || enr.user_id;
            const adm = enr.admissionNumber || enr.admission_number;
            const hasExisting = (uId && studentMap.has(String(uId).toLowerCase())) || 
                                (adm && studentMap.has(String(adm).toLowerCase())) ||
                                (enr.id && studentMap.has(String(enr.id).toLowerCase()));
            if (!hasExisting) {
                const meta = (typeof enr.metadata === 'object' && enr.metadata !== null) ? enr.metadata : {};
                const name = enr.fullName || meta.fullName || meta.name || meta.full_name || `Student ${adm || String(enr.id || '').slice(-4)}`;
                const synthUser: User = {
                    id: uId || enr.id,
                    name,
                    email: enr.email || meta.email || `${String(adm || enr.id).replace(/\s+/g, '').toLowerCase()}@school.local`,
                    role: 'student',
                    institutionId: enr.institutionId || enr.institution_id || props.currentInstitution?.id,
                    admissionNumber: adm,
                    admission_number: adm,
                    assessmentNo: enr.assessmentNo || enr.assessmentNumber || enr.assessment_no,
                    dateOfBirth: enr.dateOfBirth || enr.dob || meta.dateOfBirth || meta.dob,
                    status: (enr.status === 'Active' || enr.status === 'Enrolled') ? 'active' : enr.status?.toLowerCase(),
                    metadata: meta
                } as any;
                combined.push(synthUser);
                if (uId) studentMap.set(String(uId).toLowerCase(), synthUser);
                if (adm) studentMap.set(String(adm).toLowerCase(), synthUser);
                if (enr.id) studentMap.set(String(enr.id).toLowerCase(), synthUser);
            } else {
                // Enrich existing student user with genuine enrollment data if missing on user
                const matchedUser = (uId && studentMap.get(String(uId).toLowerCase())) ||
                                    (adm && studentMap.get(String(adm).toLowerCase())) ||
                                    (enr.id && studentMap.get(String(enr.id).toLowerCase()));
                if (matchedUser) {
                    if ((!matchedUser.admissionNumber || matchedUser.admissionNumber === '—' || matchedUser.admissionNumber === '-') && adm) {
                        matchedUser.admissionNumber = adm;
                        (matchedUser as any).admission_number = adm;
                        if (!matchedUser.metadata) matchedUser.metadata = {};
                        (matchedUser.metadata as any).admissionNumber = adm;
                    }
                    const meta = (typeof enr.metadata === 'object' && enr.metadata !== null) ? enr.metadata : {};
                    const gLvl = enr.gradeLevel || enr.grade_level || enr.studentClass || enr.student_class || meta.gradeLevel || meta.studentClass;
                    const strm = enr.stream || enr.streamName || meta.stream;
                    if (gLvl && !matchedUser.studentClass && !matchedUser.gradeLevel) {
                        matchedUser.studentClass = gLvl;
                        matchedUser.gradeLevel = gLvl;
                    }
                    if (strm && !matchedUser.stream) {
                        matchedUser.stream = strm;
                    }
                }
            }
        });
        return combined;
    }, [props.users, props.studentEnrollments, props.currentInstitution?.id]);

    // Today's attendance computations for Head Teacher / Principal dashboard
    const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
    const teachersList = useMemo(() => (props.users || []).filter(u => u && (u.role === 'teacher' || u.role === 'lecturer') && !isSuperAdminUser(u)), [props.users]);
    const todayCheckInsList = useMemo(() => (props.teacherCheckIns || []).filter(c => c.checkInDate === todayStr), [props.teacherCheckIns, todayStr]);

    const totalTeachersCount = teachersList.length;
    const checkedInCount = todayCheckInsList.filter(c => c.morningCheckInStatus === 'On Time' || c.morningCheckInStatus === 'Late').length;
    const onTimeCount = todayCheckInsList.filter(c => c.morningCheckInStatus === 'On Time').length;
    const lateCount = todayCheckInsList.filter(c => c.morningCheckInStatus === 'Late').length;
    const absentCount = Math.max(0, totalTeachersCount - checkedInCount);
    const attendanceRatePct = totalTeachersCount > 0 ? Math.round((checkedInCount / totalTeachersCount) * 100) : 0;

    const recentCheckInsData = useMemo(() => {
        return [...todayCheckInsList]
            .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
            .slice(0, 3)
            .map(c => {
                const teacher = teachersList.find(t => t.id === c.teacherId);
                return {
                    id: c.id,
                    name: teacher ? teacher.name : 'Unknown Faculty',
                    status: c.morningCheckInStatus,
                    time: c.morningCheckInTime,
                    location: c.morningLocation
                };
            });
    }, [todayCheckInsList, teachersList]);

    const handlePreviewCarInvoice = async (invoice: CarInvoice) => {
        const listing = props.carListings?.find(l => l.id === invoice.listingId);
        if (!listing) return;
        
        try {
            const uri = await pdfService.generateCarInvoicePdfDataUri(
                invoice,
                listing,
                props.currentInstitution!,
                companyDetails,
                props.currentInstitution!.logoUrl ?? null
            );
            setPdfPreviewData({ uri, title: `Invoice ${invoice.invoiceNumber}` });
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const handlePreviewCarReceipt = async (payment: CarPayment, invoice: CarInvoice) => {
        try {
            const uri = await pdfService.generateCarReceiptPdfDataUri(
                payment,
                invoice,
                props.currentInstitution!,
                companyDetails,
                props.currentInstitution!.logoUrl ?? null
            );
            setPdfPreviewData({ uri, title: `Receipt ${payment.receiptNumber}` });
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const handlePreviewCarAgreement = async (invoice: CarInvoice) => {
        const listing = props.carListings?.find(l => l.id === invoice.listingId);
        if (!listing) return;
        
        try {
            const uri = await pdfService.generateCarSaleAgreementPdfDataUri(
                invoice,
                listing,
                props.currentInstitution!,
                companyDetails,
                (props.currentInstitution?.logoUrl || null) as string | null
            );
            setPdfPreviewData({ uri, title: `Agreement ${invoice.invoiceNumber}` });
        } catch (error) {
            console.error("Failed to generate PDF:", error);
            alert("Failed to generate PDF. Please try again.");
        }
    };

    const [isPerspectiveModalOpen, setIsPerspectiveModalOpen] = useState(false);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [editingInstitution, setEditingInstitution] = useState<Institution | null>(null);
    const [hasSetDefaultTab, setHasSetDefaultTab] = useState(false);

    const institutionType = props.currentInstitution?.institutionType;
    const businessSubType = props.currentInstitution?.businessSubType;
    const isBusiness = institutionType === 'Business';
    const roleToUse = props.activeRole || props.currentUser?.role;
    const isSuperAdmin = props.currentUser?.role === 'super_admin' || 
                         (props.currentUser as any)?.is_super_admin === true || 
                         isSuperAdminUser(props.currentUser) || 
                         isSuperAdminUser(roleToUse) || 
                         !!localStorage.getItem('eduai_super_admin_session');

    const isDS = useMemo(() => {
        return isDSInstitution(props.currentInstitution) || 
               institutionType === 'Driving School' || 
               (institutionType || '').toLowerCase().includes('driving') ||
               (props.currentInstitution?.category || '').toLowerCase().includes('driving') ||
               (props.currentInstitution?.businessSubType || '').toLowerCase().includes('driving') ||
               (props.currentInstitution?.name || '').toLowerCase().includes('driving') ||
               (props.currentInstitution?.name || '').toLowerCase().includes('driver') ||
               (props.currentInstitution?.id || '').startsWith('ds_') ||
               (props.currentInstitution?.id || '').includes('driving') ||
               props.activeRole === 'driving_instructor' ||
               props.currentUser?.role === 'driving_instructor';
    }, [props.currentInstitution, institutionType, props.activeRole, props.currentUser?.role]);

    const isBC = useMemo(() => {
        const cat = props.currentInstitution?.category?.toLowerCase() || '';
        const type = institutionType?.toLowerCase() || '';
        const hasModule = props.currentInstitution?.moduleStates?.some(m => m.moduleId === 'beauty_college' && (m.status === 'active' || m.status === 'trial'));
        return cat.includes('beauty college') || type.includes('beauty college') || !!hasModule;
    }, [props.currentInstitution, institutionType]);

    const isInvoicing = useMemo(() => {
        return isInvoicingInstitution(props.currentInstitution);
    }, [props.currentInstitution]);

    const isEdu = useMemo(() => {
        // Driving Schools, Beauty Colleges, and Corporate Invoicing are independent – they must never enter the education console flow
        if (isDS || isBC || isInvoicing) return false;
        return isEduInstitution(props.currentInstitution);
    }, [props.currentInstitution, isDS, isBC, isInvoicing]);

    const isLaw = useMemo(() => {
        const subType = props.currentInstitution?.businessSubType?.toLowerCase() || '';
        const name = props.currentInstitution?.name?.toLowerCase() || '';
        return props.currentInstitution?.category === 'Law Firm' || institutionType === 'Law Firm' || subType.includes('law') || subType.includes('legal') || name.includes('law firm');
    }, [props.currentInstitution, institutionType]);

    const isLogistics = useMemo(() => {
        const cat = props.currentInstitution?.category || '';
        const type = institutionType || '';
        const subType = businessSubType || '';

        // Explicitly guard against agricultural / farmer cooperatives
        if (type === 'Cooperative' || cat === 'Cooperative' || subType === 'Cooperative') {
            return false;
        }

        return cat === 'Logistics' || 
               type === 'Logistics' || 
               subType === 'Logistics' ||
               cat === 'Educational Transport' || 
               cat === 'Staff Shuttle' || 
               cat.includes('Public Transport') ||
               cat === 'SACCO Savings' ||
               cat === 'Transport SACCO & Savings' ||
               (type === 'Logistics' && (cat.includes('SACCO') || cat.includes('Savings') || subType.includes('SACCO') || subType.includes('Savings')));
    }, [props.currentInstitution, institutionType, businessSubType]);

    const isCommunity = useMemo(() => {
        const cat = props.currentInstitution?.category;
        return institutionType === 'Community' || 
               institutionType === 'Political Campaign' ||
               (cat as string) === 'Community' || 
               cat?.includes('NGO') || 
               cat?.includes('Chama') || 
               cat?.includes('Estate') || 
               cat?.includes('Heritage') || 
               cat?.includes('Family') ||
               cat?.includes('Campaign') ||
               cat?.includes('Political');
    }, [props.currentInstitution, institutionType]);

    const isCampaign = useMemo(() => {
        return institutionType === 'Political Campaign' || props.currentInstitution?.category?.includes('Campaign') || props.currentInstitution?.category?.includes('Political');
    }, [props.currentInstitution, institutionType]);

    const isAlumni = useMemo(() => {
        const cat = props.currentInstitution?.category;
        return cat?.includes('Alumni') || cat?.includes('Alumna');
    }, [props.currentInstitution]);

    const isHeritage = useMemo(() => {
        const cat = props.currentInstitution?.category;
        return cat?.includes('Heritage') || cat?.includes('Family');
    }, [props.currentInstitution]);

    const isHospitality = useMemo(() => {
        return institutionType === 'Hospitality';
    }, [institutionType]);

    const isAutoMarket = useMemo(() => {
        const type = props.currentInstitution?.institutionType;
        const cat = props.currentInstitution?.category;
        const subType = props.currentInstitution?.businessSubType?.toLowerCase() || '';
        const name = props.currentInstitution?.name?.toLowerCase() || '';
        return type === 'Car Showroom' || cat === 'Automotive Marketplace' || cat === 'Car Showroom' || subType.includes('vehicle sales') || subType.includes('car sales') || subType.includes('motors') || name.includes('motors') || name.includes('car sales') || subType.includes('showroom');
    }, [props.currentInstitution]);

    const isFuelStation = useMemo(() => {
        const cat = props.currentInstitution?.category;
        const subType = props.currentInstitution?.businessSubType;
        return cat === 'Fuel Station' || subType === 'Fuel Station' || institutionType === 'Fuel Station';
    }, [props.currentInstitution, institutionType]);

    const isMilling = useMemo(() => {
        return isMillingInstitution(props.currentInstitution);
    }, [props.currentInstitution]);

    const isSchool = useMemo(() => {
        if (isDS || isBC || isInvoicing) return false;
        return isSchoolInstitution(props.currentInstitution);
    }, [props.currentInstitution, isDS, isBC, isInvoicing]);

    // Higher-ed institutions that can optionally host a Driving School module
    const isHigherEd = useMemo(() => {
        if (isDS || isBC || isInvoicing) return false;
        return isHigherEdInstitution(props.currentInstitution);
    }, [props.currentInstitution, isDS, isBC, isInvoicing]);

    const isDos = useMemo(() => {
        if (props.currentUser?.role === 'super_admin' && !props.activeRole) return false;
        const role = (props.activeRole || props.currentUser?.role || '').toLowerCase();
        const roles: string[] = Array.isArray((props.currentUser as any)?.roles)
            ? (props.currentUser as any).roles.map((r: any) => String(r).toLowerCase())
            : [];
        return role === 'dos' || role === 'director_of_studies' || roles.includes('dos') || roles.includes('director_of_studies');
    }, [props.activeRole, props.currentUser?.role, (props.currentUser as any)?.roles]);

    const isRetailAgency = useMemo(() => {
        if (props.currentInstitution?.institutionType === 'Church' || props.currentInstitution?.institutionType === 'Hospitality' || props.currentInstitution?.institutionType === 'Car Showroom' || isAutoMarket || isLaw) return false;
        const subType = (props.currentInstitution?.businessSubType || '').toLowerCase();
        const type = (props.currentInstitution?.institutionType || '').toLowerCase();
        const cat = (props.currentInstitution?.category || '').toLowerCase();
        const role = (props.activeRole || props.currentUser?.role || '').toLowerCase();
        return RETAIL_SUBTYPES.map(s => s.toLowerCase()).includes(subType) || 
               RETAIL_SUBTYPES.map(s => s.toLowerCase()).includes(type) || 
               RETAIL_SUBTYPES.map(s => s.toLowerCase()).includes(cat) ||
               subType.includes('retail') || type.includes('retail') || cat.includes('retail') ||
               role === 'retail_agent' || role === 'field_agent';
    }, [props.currentInstitution, isAutoMarket, isLaw, props.activeRole, props.currentUser?.role]);

    const isChurch = useMemo(() => {
        return props.currentInstitution?.institutionType === 'Church' || props.currentInstitution?.businessSubType === 'Church';
    }, [props.currentInstitution]);

    const isCoop = useMemo(() => {
        // Logistics and Transport SACCOs must never be misclassified as agricultural farmer cooperatives
        if (isLogistics) return false;

        const type = props.currentInstitution?.institutionType;
        const subType = props.currentInstitution?.businessSubType?.toLowerCase() || '';
        const name = props.currentInstitution?.name?.toLowerCase() || '';
        const role = props.activeRole || props.currentUser?.role;
        
        const isCoopRole = role === 'cooperative_manager' || role === 'coop_chairman' || role === 'coop_admin';
        const isCoopType = (type as any) === 'Cooperative';
        const hasCoopKeyword = ['coop', 'dairy', 'tea', 'coffee', 'milk', 'agri', 'farm', 'produce', 'agrovet'].some(k => subType.includes(k) || name.includes(k)) || (!isLogistics && (subType.includes('sacco') || name.includes('sacco')));
        const isCoopTab = ['farmers', 'collections', 'riders', 'payouts', 'finances', 'approvals'].includes(activeTab);
        
        return isCoopType || hasCoopKeyword || isCoopRole || isCoopTab;
    }, [props.currentInstitution, props.activeRole, props.currentUser?.role, activeTab, isLogistics]);

    useEffect(() => {
        if (!hasSetDefaultTab && props.currentUser?.role) {
            const role = props.activeRole || props.currentUser.role;
            if (isLogistics || role === 'transport_admin') {
                setActiveTab('logistics');
            } else if (role === 'cooperative_manager' || role === 'coop_chairman' || role === 'coop_admin' || isCoop) {
                setActiveTab('farmers');
            } else if (role === 'agrovet_admin' || institutionType === 'Agrovet' || businessSubType === 'Agrovet') {
                setActiveTab('agrovet');
            } else if (role === 'sacco_officer' || institutionType === 'SACCO' || businessSubType === 'SACCO') {
                setActiveTab('sacco');
            } else if (role === 'mechanic_admin' || (isBusiness && (businessSubType === 'Car Service' || businessSubType === 'Mechanic'))) {
                setActiveTab('car_service');
                if (role === 'mechanic_admin') {
                    setActiveScope('logistics');
                }
            } else if (isChurch || role === 'church_admin') {
                setActiveTab('church');
            } else if (isHospitality || role === 'hospitality_admin') {
                setActiveTab('hospitality');
            } else if (isRetailAgency) {
                setActiveTab('retail');
            } else if (isDS || role === 'driving_instructor' || (institutionType?.toLowerCase().includes('driving')) || isDSInstitution(props.currentInstitution)) {
                setActiveTab('dashboard');
                setActiveScope('ds');
            } else if (isLaw || role === 'legal_admin') {
                setActiveTab('law');
            } else if (role === 'transport_assistant') {
                setActiveTab('transport');
            } else if (isCommunity || institutionType === 'Political Campaign' || role === 'community_admin' || role === 'family_admin') {
                setActiveTab('community');
            } else if (isAlumni || role === 'alumni_admin') {
                setActiveTab('alumni');
            } else if (isAutoMarket) {
                setActiveTab('auto_marketplace');
            } else if (isFuelStation) {
                setActiveTab('fuel_station');
            } else if (isMilling || (role as string) === 'miller_admin' || (role as string) === 'weighbridge_operator') {
                setActiveTab('milling');
            } else if (isInvoicing || (role as string) === 'invoicing_admin') {
                setActiveTab('corporate_invoices');
            } else if (isEdu || isSchool) {
                const isLeadership = ['head_teacher', 'headteacher', 'principal', 'headmaster', 'headmistress', 'deputy', 'deputy_headteacher', 'deputy_principal', 'deputy_head', 'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao', 'dos', 'director_of_studies', 'admin', 'managing_director', 'hoi', 'operation_manager', 'operations_manager'].includes(role || '');
                setActiveTab(isLeadership ? 'dashboard' : 'timetable');
                setActiveScope('console_hub');
            }
            setHasSetDefaultTab(true);
        }
    }, [props.currentUser?.role, props.activeRole, hasSetDefaultTab, props.currentInstitution, isChurch, isLogistics, isCoop]);

    useEffect(() => {
        if (props.activeRole && hasSetDefaultTab) {
            const role = props.activeRole;
            if (role === 'mechanic_admin') {
                setActiveTab('car_service');
                setActiveScope('logistics');
            } else if (['admin', 'head_teacher', 'headteacher', 'principal', 'headmaster', 'headmistress', 'deputy', 'deputy_headteacher', 'deputy_principal', 'deputy_head', 'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao', 'dos', 'director_of_studies'].includes(role) && (isEdu || isSchool) && !isDS && !isDSInstitution(props.currentInstitution)) {
                const isLeadership = ['head_teacher', 'headteacher', 'principal', 'headmaster', 'headmistress', 'deputy', 'deputy_headteacher', 'deputy_principal', 'deputy_head', 'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao', 'dos', 'director_of_studies', 'admin', 'managing_director', 'hoi', 'operation_manager', 'operations_manager'].includes(role || '');
                setActiveTab(isLeadership ? 'dashboard' : 'timetable');
                setActiveScope('console_hub');
            }
        }
    }, [props.activeRole, isEdu, isSchool, isDS, hasSetDefaultTab]);

    // Dedicated Driving School Enforcement: lock scope to 'ds' and protect from educational tabs
    useEffect(() => {
        if (isDS || props.activeRole === 'driving_instructor' || props.currentUser?.role === 'driving_instructor' || isDSInstitution(props.currentInstitution)) {
            if (activeScope !== 'ds') {
                setActiveScope('ds');
            }
            const eduTabs = ['timetable', 'courses', 'boarding', 'leaveout', 'remedials', 'eduflow', 'eduvote', 'enrollment', 'enrollment_students'];
            if (eduTabs.includes(activeTab)) {
                setActiveTab('dashboard');
            }
        }
    }, [isDS, props.activeRole, props.currentUser?.role, props.currentInstitution, activeScope, activeTab]);

    useEffect(() => {
        const handleNavConsole = () => {
            setActiveScope('console_hub');
        };
        window.addEventListener('nav_to_console_hub', handleNavConsole);
        return () => {
            window.removeEventListener('nav_to_console_hub', handleNavConsole);
        };
    }, []);

    // Strict Scope & Tab Guard: DOS can ONLY access academics and remedials
    useEffect(() => {
        if (isDos) {
            if (activeScope !== 'console_hub' && activeScope !== 'academics' && activeScope !== 'remedials') {
                setActiveScope('console_hub');
            }
            if (activeScope === 'console_hub' && activeTab !== 'dashboard') {
                setActiveTab('dashboard');
            } else if (activeScope === 'academics' && activeTab !== 'timetable') {
                setActiveTab('timetable');
            } else if (activeScope === 'remedials' && activeTab !== 'remedials') {
                setActiveTab('remedials');
            }
        }
    }, [isDos, activeScope, activeTab]);


    const isModuleActive = useCallback((moduleId: string) => {
        if (props.currentInstitution?.institutionType === 'Reseller') return true;
        if (props.currentInstitution?.id?.startsWith('demo_')) return true;
        if (moduleId === 'beauty_college' && isBC) return true;
        if (moduleId === 'remedials' && (isEdu || isSchool)) return true;

        // If Super Admin is viewing or impersonating a tenant, grant access to all modules
        if (props.currentUser?.role === 'super_admin' || (props.currentUser as any)?.isImpersonated || !!localStorage.getItem('eduai_super_admin_session')) {
            return true;
        }

        // If the institution is active, default core modules to active
        if (props.currentInstitution?.status === 'active') {
            const state = props.currentInstitution?.moduleStates?.find(m => m.moduleId === moduleId || (m as any).module_id === moduleId);
            if (!state) return true;
            if (state.status === 'active') return true;
            if (state.status === 'trial') {
                const expiry = state.trialEndsAt || (state as any).trial_ends_at;
                return expiry ? new Date(expiry) > new Date() : true;
            }
            if (state.status === 'suspended' || state.status === 'expired') return false;
            return true;
        }

        const state = props.currentInstitution?.moduleStates?.find(m => m.moduleId === moduleId || (m as any).module_id === moduleId);
        if (!state) return false;
        if (state.status === 'active') return true;
        if (state.status === 'trial') {
            const expiry = state.trialEndsAt || (state as any).trial_ends_at;
            return expiry ? new Date(expiry) > new Date() : false;
        }
        return false;
    }, [props.currentInstitution?.moduleStates, props.currentInstitution?.institutionType, props.currentInstitution?.id, props.currentInstitution?.status, props.currentUser, isBC, isEdu, isSchool]);

    const isCoreAdmin = useMemo(() => {
        const role = props.activeRole || props.currentUser?.role;
        return [
            'admin', 'head_teacher', 'headteacher', 'principal', 'headmaster', 'headmistress',
            'super_admin', 'reseller', 'agrovet_admin', 'property_admin', 'carwash_admin',
            'retail_agent', 'transport_admin', 'dos', 'director_of_studies', 'academics_officer',
            'deputy', 'deputy_headteacher', 'deputy_principal', 'deputy_head',
            'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao',
            'tto', 'director', 'finance', 'finance_officer', 'mechanic_admin',
            'managing_director', 'hoi', 'operation_manager', 'operations_manager'
        ].includes(role || '');
    }, [props.activeRole, props.currentUser?.role]);

    const tabs = useMemo(() => {
        const baseTabs = [
            { id: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
            { id: 'timetable', label: isEdu ? 'Academics' : 'Timetable', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> },
            { id: 'users', label: isHeritage ? 'Family Members' : isCommunity ? 'Community Members' : 'Members', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
            { id: 'courses', label: isSchool ? 'Courses' : isChurch ? 'Departments' : 'Courses', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> },
            { id: 'boarding', label: 'Boarding System', icon: <BedIcon className="w-5 h-5 mr-2" /> },
            { id: 'leaveout', label: 'Leave Out', icon: <ArchiveBoxIcon className="w-5 h-5 mr-2" /> },
            { id: 'comms', label: isHeritage ? 'Announcements' : isCommunity ? 'Community Updates' : isRetailAgency ? 'Communications' : 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
            { id: 'retail', label: isEdu ? 'School Inventory' : 'Retail & Agency', icon: isEdu ? <ArchiveBoxIcon className="w-5 h-5 mr-2" /> : <StoreIcon className="w-5 h-5 mr-2" /> },
            { id: 'procurement', label: 'Procurement', icon: <ShoppingBagIcon className="w-5 h-5 mr-2" /> },
            { id: 'coop', label: 'Cooperative', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
            { id: 'car_service', label: 'Car Service', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
            { id: 'customers', label: 'Customers', icon: <UserPlusIcon className="w-5 h-5 mr-2" /> },
            { id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
            { id: 'remedials', label: 'Remedial Manager', icon: <ClockIcon className="w-5 h-5 mr-2" /> },
            { id: 'transport', label: 'Fleet Registry', icon: <MapPinIcon className="w-5 h-5 mr-2" /> },
            { id: 'logistics', label: 'Logistics Hub', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
            { id: 'reports', label: isHeritage ? 'Records' : isCommunity ? 'Analytics' : 'Reports', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
            { id: 'sacco', label: 'SACCO', icon: <CreditCardIcon className="w-5 h-5 mr-2" /> },
            { id: 'agrovet', label: 'Agrovet', icon: <BeakerIcon className="w-5 h-5 mr-2" /> },
            { id: 'church', label: 'Church System', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
            { id: 'law', label: 'Legal Module', icon: <ShieldIcon className="w-5 h-5 mr-2" /> },
            { id: 'driving_school', label: 'Driving School', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
            { id: 'beauty_college', label: 'Beauty College', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
            { id: 'community', label: isHeritage ? 'Family Council' : isCampaign ? 'Campaign Strategy' : 'Community Hub', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
            { id: 'alumni', label: 'Alumni Network', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> },
            { id: 'hospitality', label: 'Hospitality Hub', icon: <PalmTreeIcon className="w-5 h-5 mr-2" /> },
            { id: 'auto_marketplace', label: 'Car Sales', icon: <CarIcon className="w-5 h-5 mr-2" /> },
            { id: 'fuel_station', label: 'Fuel Station', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
            { id: 'showcase', label: 'Digital Presence', icon: <GlobeAltIcon className="w-5 h-5 mr-2" /> },
            { id: 'external_module', label: 'External', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
            { id: 'enrollment_students', label: 'Students Registry', icon: <UserPlusIcon className="w-5 h-5 mr-2" /> },
            { id: 'enrollment_teachers', label: 'Teachers Registry', icon: <UserIcon className="w-5 h-5 mr-2" /> },
            { id: 'enrollment_support_staff', label: 'Support Staff Registry', icon: <BriefcaseIcon className="w-5 h-5 mr-2" /> },
            { id: 'enrollment_broadcaster', label: 'Broadcaster Service', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
            { id: 'enrollment_calendar', label: 'Events & PINs', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> },
            { id: 'enrollment_guests', label: 'Cleared Guests', icon: <ShieldIcon className="w-5 h-5 mr-2" /> },
            { id: 'enrollment', label: 'Enrollments', icon: <UserPlusIcon className="w-5 h-5 mr-2" /> },
            { id: 'eduflow', label: 'EduFlow Tasks', icon: <ClipboardListIcon className="w-5 h-5 mr-2" /> },
            { id: 'eduvote', label: 'EduVote AI', icon: <ShieldIcon className="w-5 h-5 mr-2" /> },
            { id: 'fiscal_guard', label: 'FiscalGuard AI', icon: <ShieldIcon className="w-5 h-5 mr-2" /> },
            { id: 'ai_hub', label: 'AI Hub ✨', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
            { id: 'milling', label: 'Maize Milling', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
            { id: 'corporate_invoices', label: 'Invoicing & Billing', icon: <DocumentTextIcon className="w-5 h-5 mr-2" /> },
            { id: 'network_devices', label: 'WiFi & Devices', icon: <SignalIcon className="w-5 h-5 mr-2" /> },
        ];



        if (isHeritage) {
            return [];
        }

        if (isDos) {
            if (activeScope === 'console_hub') {
                return [];
            }
            return [
                { id: 'timetable', label: 'Academics', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> },
                { id: 'remedials', label: 'Remedial Manager', icon: <ClockIcon className="w-5 h-5 mr-2" /> }
            ];
        }

        if (isInvoicing) {
            return [
                { id: 'corporate_invoices', label: 'Invoicing & Billing', icon: <DocumentTextIcon className="w-5 h-5 mr-2" /> },
                { id: 'comms', label: 'Communications', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
                { id: 'users', label: 'Staff & Team', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'reports', label: 'Financial Reports', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
                { id: 'settings', label: 'Company Settings', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
            ];
        }

        if (isRetailAgency) {
            const isManagerRole = isSuperAdmin || [
                'admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'director', 'managing_director'
            ].includes(roleToUse || '');

            const isFinanceRole = isManagerRole || [
                'finance', 'finance_officer', 'accountant', 'accounts_clerk'
            ].includes(roleToUse || '');

            const tabs: { id: string; label: string; icon: React.ReactNode }[] = [
                { id: 'retail', label: 'Retail & Inventory', icon: <StoreIcon className="w-5 h-5 mr-2" /> },
                { id: 'customers', label: 'Customers', icon: <UserPlusIcon className="w-5 h-5 mr-2" /> },
            ];

            if (isManagerRole) {
                tabs.push({ id: 'users', label: 'Staff & Agents', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> });
            }

            tabs.push({ id: 'deliveries', label: 'Deliveries', icon: <TruckIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'procurement', label: 'Procurement', icon: <ShoppingBagIcon className="w-5 h-5 mr-2" /> });

            if (isManagerRole) {
                tabs.push({ id: 'comms', label: 'Communications', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> });
            }

            if (isFinanceRole) {
                tabs.push({ id: 'reports', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> });
            }

            if (isManagerRole) {
                tabs.push({ id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> });
            }

            return tabs;
        }

        if (isCampaign) {
            return [
                { id: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
                { id: 'community', label: 'Campaign Strategy', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'users', label: 'Campaign Staff', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'comms', label: 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
                { id: 'reports', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
                { id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
            ];
        }

        if (isAutoMarket) {
            return [
                { id: 'auto_marketplace', label: 'Car Sales Hub', icon: <CarIcon className="w-5 h-5 mr-2" /> },
                { id: 'users', label: 'Staff Registry', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'comms', label: 'Marketing', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
                { id: 'reports', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
                { id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> },
            ];
        }

        if (isDS || activeScope === 'ds') {
            const dsTabs = [
                { id: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
                { id: 'ds_students', label: 'Students', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'ds_leads', label: 'Enquiries', icon: <SparklesIcon className="w-5 h-5 mr-2" /> },
                { id: 'ds_lessons', label: 'Lessons', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> },
                { id: 'ds_dispatch', label: 'Dispatch', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
                { id: 'ds_fleet', label: 'Fleet', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
                { id: 'ds_instructors', label: 'Instructors', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> },
                { id: 'users', label: 'Staff & Team', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'ds_finance', label: 'Finance', icon: <CurrencyIcon className="w-5 h-5 mr-2" /> },
                { id: 'ds_broadcaster', label: 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
            ];
            dsTabs.push(
                { id: 'reports', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
                { id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> }
            );
            return dsTabs;
        }

        if (isBC || activeScope === 'bc') {
            const bcTabs = [
                { id: 'dashboard', label: 'Overview', icon: <ChartPieIcon className="w-5 h-5 mr-2" /> },
                { id: 'bc_students', label: 'Students', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'bc_courses', label: 'Courses', icon: <BookOpenIcon className="w-5 h-5 mr-2" /> },
                { id: 'bc_finance', label: 'Finance', icon: <CurrencyIcon className="w-5 h-5 mr-2" /> },
                { id: 'bc_practicals', label: 'Practicals', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> },
                { id: 'bc_trainers', label: 'Trainers', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> },
                { id: 'bc_broadcaster', label: 'Broadcaster', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> }
            ];
            bcTabs.push(
                { id: 'reports', label: 'Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> }
            );
            if (isModuleActive('fiscal_guard')) {
                bcTabs.push({ id: 'fiscal_guard', label: 'FiscalGuard AI', icon: <ShieldIcon className="w-5 h-5 mr-2" /> });
            }
            bcTabs.push(
                { id: 'settings', label: 'Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> }
            );
            return bcTabs;
        }

        if (isMilling) {
            return [
                { id: 'milling', label: 'Milling & Weighbridge', icon: <TruckIcon className="w-5 h-5 mr-2" /> },
                { id: 'users', label: 'Millers & Staff', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> },
                { id: 'comms', label: 'Communication', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-2" /> },
                { id: 'reports', label: 'Milling Analytics', icon: <ChartBarIcon className="w-5 h-5 mr-2" /> },
            ];
        }

        if (isLogistics && !isEdu && !isSchool) {
            return [];
        }


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

        if (isEdu && activeScope === 'inventory') {
            return [];
        }

        let filteredTabs = baseTabs.filter(tab => {
            const roleToUse = props.activeRole || props.currentUser?.role;

            if (isInvoicing) {
                const allowed = ['corporate_invoices', 'comms', 'users', 'reports', 'settings'];
                return allowed.includes(tab.id);
            }

            // In Remedial Manager, hide extraneous global tabs (Invoicing & Billing, WiFi & Devices, etc.)
            if (activeScope === 'remedials' || activeTab === 'remedials') {
                return false;
            }

            if (tab.id === 'network_devices') {
                return isEdu || isSchool || isSuperAdminUser(props.currentUser?.role);
            }

            if (tab.id === 'corporate_invoices') {
                return isInvoicing || isModuleActive('invoicing') || isModuleActive('corporate_invoicing');
            }

            if (isBC) {
                const allowed = ['dashboard', 'bc_students', 'bc_courses', 'bc_finance', 'bc_practicals', 'bc_trainers', 'bc_broadcaster', 'users', 'reports', 'fiscal_guard', 'settings'];
                if (!allowed.includes(tab.id)) return false;
                if (tab.id === 'fiscal_guard') return isModuleActive('fiscal_guard');
                return true;
            }

            if (isDS) {
                const allowed = ['dashboard', 'driving_school', 'users', 'fiscal_guard', 'settings'];
                if (!allowed.includes(tab.id)) return false;
                if (tab.id === 'fiscal_guard') return isModuleActive('fiscal_guard');
                return true;
            }

            if (['enrollment_students', 'enrollment_teachers', 'enrollment_support_staff'].includes(tab.id)) {
                return isEdu && activeScope === 'academics';
            }

            if (roleToUse === 'mechanic_admin') {
                return ['dashboard', 'car_service', 'reports', 'settings'].includes(tab.id);
            }

            // If it is educational (isEdu || isSchool), show dynamic tabs based on selected activeScope
            if (isEdu || isSchool) {
                if (activeScope === 'console_hub') {
                    if (activeTab === 'network_devices' && tab.id === 'network_devices') return true;
                    return false; // Hide sidebar navigation entirely when in the console gateway!
                }
                if (activeScope === 'eduvote') {
                    return ['eduvote', 'reports'].includes(tab.id);
                }
                if (activeScope === 'remedials') {
                    return false;
                }
                if (activeScope === 'academics') {
                    const academicsTabs = ['timetable', 'reports', 'settings'];
                    return academicsTabs.includes(tab.id);
                }
                if (activeScope === 'inventory') {
                    return false; // Handled separately
                }
                if (activeScope === 'boarding') {
                    const boardingTabs = ['settings', 'reports'];
                    if (isModuleActive('boarding')) {
                        boardingTabs.push('boarding', 'leaveout');
                    }
                    return boardingTabs.includes(tab.id);
                }
                if (activeScope === 'logistics') {
                    const logisticsTabs = ['settings', 'reports'];
                    if (isModuleActive('transport')) {
                        logisticsTabs.push('transport', 'logistics');
                    }
                    return logisticsTabs.includes(tab.id);
                }
            }

            // Educational tabs
            if (['timetable', 'courses', 'leaveout', 'boarding', 'remedials', 'eduflow', 'eduvote', 'enrollment'].includes(tab.id)) {
                if (!isEdu && !isSchool) return false;
                if (isDS || isBC || isInvoicing) return false;
                return true;
            }

            if (tab.id === 'users') {
                if (props.currentUser?.role === 'super_admin' || !!localStorage.getItem('eduai_super_admin_session')) return true;
                if (isAutoMarket) return ['director', 'finance', 'finance_officer', 'admin'].includes(roleToUse || '');
                if (isCoop || isCommunity || isLogistics || institutionType === 'SACCO' || institutionType === 'Agrovet' || isDS || isInvoicing) return true;
                return isEdu && !isDS;
            }

            // Transport/Logistics
            if (tab.id === 'transport') {
                return (isEdu || isLogistics) && !isChurch && !isCoop;
            }

            if (tab.id === 'logistics') {
                return isLogistics && !isChurch && !isCoop;
            }

            // Retail & Procurement tabs
            if (['retail', 'procurement'].includes(tab.id)) {
                if (isLaw || institutionType === 'HIS') return false;
                if (isEdu) {
                    return tab.id === 'retail';
                }
                if (isChurch || isCommunity || isHospitality) return false;
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
                if (isLaw) return false;
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
            if (tab.id === 'car_service') return (isBusiness && (businessSubType === 'Car Service' || businessSubType === 'Mechanic')) || isHigherEdInstitution(props.currentInstitution);
            if (tab.id === 'church') return isChurch;
            if (tab.id === 'law') return (roleToUse === 'legal_admin' || institutionType === 'Law Firm') && !isLaw;
            if (tab.id === 'driving_school') return roleToUse === 'driving_instructor' || isDS || institutionType?.toLowerCase().includes('driving school');
            if (tab.id === 'beauty_college') return isBC || institutionType?.toLowerCase().includes('beauty college');
            if (tab.id === 'community') return isCommunity || roleToUse === 'community_admin';
            if (tab.id === 'alumni') return (isAlumni || roleToUse === 'alumni_admin') && !isDS && !isBC;
            if (tab.id === 'hospitality') return isHospitality || roleToUse === 'hospitality_admin';
            if (tab.id === 'auto_marketplace') return isAutoMarket;
            if (tab.id === 'fuel_station') return isFuelStation;
            if (tab.id === 'milling') return isMilling;
            if (tab.id === 'fiscal_guard') return isModuleActive('fiscal_guard');

            if (tab.id === 'ai_hub') {
                const roleToCheck = props.activeRole || props.currentUser?.role;
                return ['admin', 'super_admin', 'head_teacher', 'director', 'dos', 'managing_director', 'hoi', 'deputy', 'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao', 'operation_manager', 'operations_manager'].includes(roleToCheck || '') || !!localStorage.getItem('eduai_super_admin_session');
            }

            if (tab.id === 'reports') {
                if (props.currentUser?.role === 'super_admin' || !!localStorage.getItem('eduai_super_admin_session')) return true;
                if (isAutoMarket) return ['director', 'finance'].includes(roleToUse || '');
                if (isRetailAgency) return ['admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'director', 'managing_director', 'finance', 'finance_officer'].includes(roleToUse || '');
                return true; // Default visibility for other institutional types
            }

            if (tab.id === 'users') {
                if (isRetailAgency) {
                    return isSuperAdmin || ['admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'director', 'managing_director'].includes(roleToUse || '');
                }
            }

            if (tab.id === 'settings') {
                if (isRetailAgency) {
                    return isSuperAdmin || ['admin', 'head_teacher', 'retail_agent', 'manager', 'operations_manager', 'director', 'managing_director'].includes(roleToUse || '');
                }
            }

            if (tab.id === 'showcase') {
                return ((isSchool || isEdu || isMilling) && !isDS && ['admin', 'head_teacher', 'dos', 'deputy', 'deputy_hoi_academics', 'deputy_hoi_boarding', 'deputy_hoi_administration', 'cao', 'director', 'super_admin', 'managing_director', 'hoi', 'operation_manager', 'operations_manager'].includes(roleToUse || '')) || !!localStorage.getItem('eduai_super_admin_session');
            }

            if (tab.id === 'enrollment') {
                if (isLaw) return false;
                return !isDS;
            }

            if (tab.id === 'eduflow') {
                if (isLaw) return false;
            }

            return true;
        });

        if (isEdu && activeScope === 'academics') {
            const order = [
                'enrollment_students',
                'enrollment_teachers',
                'enrollment_support_staff',
                'enrollment_broadcaster',
                'enrollment_calendar',
                'enrollment_guests',
                'timetable',
                'courses',
                'eduflow',
                'eduvote',
                'reports',
                'settings'
            ];
            filteredTabs.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
        }

        return filteredTabs;
    }, [props.currentUser?.role, props.activeRole, props.currentInstitution, isSchool, isEdu, isBusiness, businessSubType, institutionType, isRetailAgency, activeScope, isHeritage, isDos, isSuperAdmin]);

    const stats = useMemo(() => {
        const pendingCount = (requests || []).filter((r: AllocationRequest) => r && (r.status === 'pending' || r.status === 'hod_approved')).length;
        const changesCount = (requests || []).filter((r: AllocationRequest) => r && r.status === 'change_request_pending').length;
        const deallocCount = (requests || []).filter((r: AllocationRequest) => r && r.status === 'deallocation_pending').length;
        return { pendingCount, changesCount, deallocCount, totalActionable: pendingCount + changesCount + deallocCount };
    }, [requests]);

    const handleQuickAction = (tabId: string, settingsSubTab?: string, tTabSub?: 'scheduler' | 'calendar' | 'subjects' | 'registry') => {
        React.startTransition(() => {
            if (tabId === 'billing') {
                setActiveTab('settings');
                setRequestedSettingsTab('billing');
                return;
            }
            setActiveTab(tabId as any);
            if (settingsSubTab) setRequestedSettingsTab(settingsSubTab);
            if (tTabSub) setTimetableSubTab(tTabSub);
        });
    };

    const perspectiveOptions = [
        { role: 'legal_admin', label: 'Law Firm Module', icon: <ShieldIcon className="w-6 h-6" />, color: 'bg-slate-50 text-slate-800' },
        { role: 'driving_instructor', label: 'Driving School Module', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-800' },
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
        { role: 'finance', label: 'Finance Module', icon: <CreditCardIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-700' },
        { role: 'hr_officer', label: 'HR & Payroll Module', icon: <BriefcaseIcon className="w-6 h-6" />, color: 'bg-teal-50 text-teal-700' },
        { role: 'nurse', label: 'Sickbay & Wellness Hub', icon: <HeartIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { role: 'driver', label: 'Driver Module', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-slate-50 text-slate-600' },
        { role: 'coop_admin', label: 'Cooperative Module', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-blue-50 text-blue-600' },
        { role: 'sacco_officer', label: 'SACCO Module', icon: <CreditCardIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-600' },
        { role: 'agrovet_admin', label: 'Agrovet Module', icon: <BeakerIcon className="w-6 h-6" />, color: 'bg-green-50 text-green-600' },
        { role: 'customer', label: 'Customer Portal', icon: <SearchIcon className="w-6 h-6" />, color: 'bg-rose-50 text-rose-600' },
        { role: 'church_admin', label: 'Church System', icon: <BuildingOfficeIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-700' },
        { role: 'fuel_admin', label: 'Fuel Station Module', icon: <TruckIcon className="w-6 h-6" />, color: 'bg-emerald-50 text-emerald-700' },
        { role: 'event_manager', label: 'Event Management', icon: <CalendarDaysIcon className="w-6 h-6" />, color: 'bg-indigo-50 text-indigo-700' },
        { role: 'legal_admin', label: 'Law Firm Hub', icon: <DocumentTextIcon className="w-6 h-6" />, color: 'bg-slate-50 text-slate-800' }
    ].filter(opt => {
        if (isLaw) {
            return ['legal_admin', 'customer'].includes(opt.role);
        }
        if (isRetailAgency) {
            return ['retail_agent', 'customer'].includes(opt.role);
        }
        if (isEdu) {
            let eduAllowed = ['security', 'store', 'transport_assistant', 'boarding_master', 'info_desk', 'librarian', 'parent', 'student', 'lecturer', 'finance', 'event_manager', 'hr_officer', 'nurse'];
            if (!isModuleActive('school_store')) eduAllowed = eduAllowed.filter(r => r !== 'store');
            if (!isModuleActive('library')) eduAllowed = eduAllowed.filter(r => r !== 'librarian');
            if (!isModuleActive('academics')) eduAllowed = eduAllowed.filter(r => !['parent', 'student', 'lecturer'].includes(r));
            if (!isModuleActive('finance')) eduAllowed = eduAllowed.filter(r => r !== 'finance');
            if (!isModuleActive('boarding')) eduAllowed = eduAllowed.filter(r => r !== 'boarding_master');
            if (!isModuleActive('transport')) eduAllowed = eduAllowed.filter(r => r !== 'transport_assistant');
            if (!isModuleActive('events')) eduAllowed = eduAllowed.filter(r => r !== 'event_manager');
            if (!isModuleActive('hr_payroll')) eduAllowed = eduAllowed.filter(r => r !== 'hr_officer');
            if (!isModuleActive('his')) eduAllowed = eduAllowed.filter(r => r !== 'nurse');
            
            if (isHigherEdInstitution(props.currentInstitution)) {
                if (isModuleActive('carwash_admin')) eduAllowed.push('carwash_admin');
                if (isModuleActive('mechanic_admin')) eduAllowed.push('mechanic_admin');
            }
            return eduAllowed.includes(opt.role);
        } else {
            // Non-educational: Hide educational portal perspectives
            const filtered = !['parent', 'student', 'lecturer', 'librarian', 'boarding_master', 'transport_assistant', 'retail_agent', 'driver', 'customer', 'event_manager'].includes(opt.role);
            
            // Further restrict church_admin to only Church institutions
            if (opt.role === 'church_admin') {
                const isSuperAdmin = props.currentUser?.role === 'super_admin';
                return (isChurch || isSuperAdmin) && filtered;
            }
            
            return filtered;
        }
    });


    const getTabModuleState = (tabId: string) => {
        if (!isEdu) return null;
        let moduleId: string | null = null;
        if (tabId === 'timetable') moduleId = 'timetable';
        else if (tabId === 'courses') moduleId = 'academics';
        else if (tabId === 'boarding' || tabId === 'leaveout') moduleId = 'boarding';
        else if (tabId === 'transport') moduleId = 'transport';
        else if (tabId === 'retail') moduleId = 'school_store';
        else if (['enrollment', 'enrollment_students', 'enrollment_broadcaster', 'enrollment_calendar', 'enrollment_guests'].includes(tabId)) moduleId = 'enrollment_manager';
        
        if (!moduleId) return null;
        return props.currentInstitution?.moduleStates?.find(m => m.moduleId === moduleId);
    };

    if (isStrictTeacherUser(props.currentUser) || isTeacherRole(props.activeRole) || isTeacherRole(props.currentUser?.role)) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center p-6">
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl p-8 max-w-md text-center shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
                        <ShieldExclamationIcon className="w-8 h-8" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Teacher Portal Access Only</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                        Teacher and Head of Department (HOD) accounts are strictly restricted to the Teacher Portal. Institutional administration is reserved for DOS, Deputy, and Head Teacher.
                    </p>
                    <button
                        onClick={() => { window.location.href = '/'; }}
                        className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all cursor-pointer"
                    >
                        Return to Teacher Portal
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
            {!(isLogistics && !isEdu && !isSchool) && (!(isEdu || isSchool) || activeScope !== 'console_hub' || activeTab === 'network_devices') && (isDos || activeScope !== 'academics') && (tabs.length > 0 || ((isEdu || isSchool) && activeScope !== 'console_hub')) && (
                <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto custom-scrollbar-horizontal pb-2 no-print bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-2 items-center">
                    {(isEdu || isSchool) && !isDS && !isDSInstitution(props.currentInstitution) && activeScope !== 'ds' && (activeScope !== 'console_hub' || activeTab === 'network_devices') && (
                        <button
                            onClick={() => {
                                setActiveScope('console_hub');
                                setActiveTab('dashboard');
                            }}
                            className={`flex items-center gap-2 py-4 px-6 border-b-2 border-transparent font-black text-xs uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-all whitespace-nowrap bg-indigo-50/50 dark:bg-indigo-950/20 ${tabs.length > 0 ? 'rounded-l-2xl border-r border-slate-200 dark:border-slate-700 mr-2' : 'rounded-2xl border border-slate-200 dark:border-slate-700'} cursor-pointer`}
                        >
                            <svg className="w-5 h-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                            <span>Portal Hub</span>
                        </button>
                    )}
                    {tabs.map((tab: { id: string, label: string, icon: React.ReactNode }) => {
                        const modState = getTabModuleState(tab.id);
                        return (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    React.startTransition(() => {
                                        if (isDos) {
                                            if (tab.id === 'timetable') {
                                                setActiveScope('academics');
                                            } else if (tab.id === 'remedials') {
                                                setActiveScope('remedials');
                                            }
                                        }
                                        setActiveTab(tab.id as any);
                                        if (tab.id !== 'settings') setRequestedSettingsTab(undefined);
                                    });
                                }}
                                className={`flex items-center gap-2 py-4 px-6 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-indigo-600 text-indigo-600'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                                    }`}
                            >
                                {tab.icon}
                                <span>{tab.label}</span>
                                {modState?.status === 'trial' ? (
                                    <span className="text-[9px] text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded font-black tracking-wider uppercase flex items-center gap-1 animate-pulse">
                                        Trial
                                    </span>
                                ) : (tab.id === 'timetable' || tab.id === 'courses' || tab.id === 'boarding' || tab.id === 'leaveout' || tab.id === 'transport' || tab.id === 'retail') && (!modState || modState.status !== 'active') ? (
                                    <span className="text-[9px] text-slate-400 bg-slate-100 dark:bg-slate-700/50 px-1.5 py-0.5 rounded font-medium normal-case flex items-center gap-1">
                                        <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                        Unlock
                                    </span>
                                ) : null}
                                {tab.id === 'timetable' && stats.totalActionable > 0 && (
                                    <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-sm animate-pulse ml-1">
                                        {stats.totalActionable}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}

            <main className="animate-fade-in">
                <Suspense fallback={
                    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-slate-800/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700 animate-pulse">
                        <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{isRetailAgency ? 'Initializing Communications Hub...' : 'Synchronizing Perspective Hub...'}</p>
                    </div>
                }>
                {((isEdu || isSchool) && !isDS && !isDSInstitution(props.currentInstitution) && activeScope !== 'ds' && activeScope === 'console_hub' && activeTab !== 'network_devices') ? (
                    <div className="py-12 animate-fade-in-up">
                        {/* Hub Header */}
                        <div className="text-center max-w-2xl mx-auto mb-16 space-y-4">
                            <span className="inline-block px-4 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 text-xs font-black uppercase tracking-[0.2em] rounded-full border border-indigo-100/50 dark:border-indigo-900/30">
                                {isDos ? 'Director of Studies Gateway' : 'Institutional Gateway Console'}
                            </span>
                            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                                Welcome to <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400">{isDos ? 'Academics & Remedials Console' : 'EduAI Console'}</span>
                            </h1>
                            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                                {isDos ? 'Access your authorized academic scheduling and remedial management modules below.' : 'Select an active administrative module below to proceed with your institutional responsibilities.'}
                            </p>
                        </div>

                        {/* Interactive Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto px-4">
                                                        {/* Card 1: Academic Scheduling & Timetable */}
                            {(() => {
                                const isActive = isModuleActive('academics') || isModuleActive('timetable');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Academics and Timetable modules are currently inactive. Please activate them under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('academics'); 
                                            setActiveTab('timetable'); 
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-indigo-600 text-white rounded-2xl w-fit shadow-lg shadow-indigo-100 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Academic Scheduling</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Configure institutional courses, manage classroom allocations, master lesson schedules, and configure teaching constraints.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('timetable');
                                                            } catch (err) {
                                                                console.error("Failed to activate timetable trial:", err);
                                                            }
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {!isDos && (
                                <>
                                    {/* Card 2: School Inventory & Store */}
                            {(() => {
                                const isActive = isModuleActive('school_store');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The School Inventory & Store module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('inventory'); 
                                            setActiveTab('inv_dashboard'); 
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-emerald-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-emerald-500 text-white rounded-2xl w-fit shadow-lg shadow-emerald-150 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Store & Inventory</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Track and issue classroom textbooks, uniform supplies, stationery packages, and oversee institutional procurement requisitions.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('school_store');
                                                            } catch (err) {
                                                                console.error("Failed to activate store trial:", err);
                                                            }
                                                        }}
                                                        className="bg-emerald-500 hover:bg-emerald-600 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 3: Boarding & Student Welfare */}
                            {(() => {
                                const isActive = isModuleActive('boarding');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Boarding Master module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('boarding'); 
                                            setActiveTab('boarding'); 
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-violet-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 dark:bg-violet-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-violet-600 text-white rounded-2xl w-fit shadow-lg shadow-violet-150 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Boarding & Welfare</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Oversee dormitory blocks, assign bunk beds, monitor student check-ins, and authorize leave-out gate passes.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('boarding');
                                                            } catch (err) {
                                                                console.error("Failed to activate boarding trial:", err);
                                                            }
                                                        }}
                                                        className="bg-violet-600 hover:bg-violet-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 4: Logistics & Transport */}
                            {(() => {
                                const isActive = isModuleActive('transport');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Fleet Registry & Transport module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('logistics'); 
                                            setActiveTab('transport'); 
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-amber-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 dark:bg-amber-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-amber-500 text-white rounded-2xl w-fit shadow-lg shadow-amber-150 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 11-1 1h-3" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors">Logistics & Transit</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Register school buses, manage zone fare matrices, coordinate staff transport shuttles, and driver schedules.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('transport');
                                                            } catch (err) {
                                                                console.error("Failed to activate transport trial:", err);
                                                            }
                                                        }}
                                                        className="bg-amber-500 hover:bg-amber-600 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 5: Library Module */}
                            {(() => {
                                const isActive = isModuleActive('library');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Library module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            props.onSwitchPerspective?.('librarian');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-purple-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 dark:bg-purple-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-purple-600 text-white rounded-2xl w-fit shadow-lg shadow-purple-150 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">Library System</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Track textbook borrowing registries, manage library fine logs, update catalog categories, and catalog new acquisitions.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('library');
                                                            } catch (err) {
                                                                console.error("Failed to activate library trial:", err);
                                                            }
                                                        }}
                                                        className="bg-purple-600 hover:bg-purple-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 6: Security & Gate Control */}
                            {(() => {
                                const isActive = isModuleActive('transport');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Security & Gate features are tied to Fleet Transport. Please activate Fleet Registry module under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            props.onSwitchPerspective?.('security');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-red-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 dark:bg-red-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-red-600 text-white rounded-2xl w-fit shadow-lg shadow-red-150 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">Security & Gate</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Log school visitors, check staff/student gate check-in activity registries, and coordinate {isSchool ? 'school' : 'campus'} guard rotations.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('transport');
                                                            } catch (err) {
                                                                console.error("Failed to activate transport (security) trial:", err);
                                                            }
                                                        }}
                                                        className="bg-red-600 hover:bg-red-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 7: Driving School Module — only for higher-ed (Polytechnic/Institute/TVET/College) */}
                            {isHigherEd && (() => {
                                const isActive = isModuleActive('driving_school');
                                return (
                                    <div
                                        onClick={() => {
                                            if (!isActive) {
                                                alert("The Driving School module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('ds');
                                            setActiveTab('driving_school');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-sky-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 dark:bg-sky-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-sky-500 text-white rounded-2xl w-fit shadow-lg shadow-sky-100 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 11-1 1h-3" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">Driving School</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Manage student learners, driving instructors, lesson schedules, fleet vehicles, and collect driving school fees.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('driving_school');
                                                            } catch (err) {
                                                                console.error("Failed to activate driving school trial:", err);
                                                            }
                                                        }}
                                                        className="bg-sky-500 hover:bg-sky-600 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 7.5: Beauty College Module — only for higher-ed */}
                            {isHigherEd && (() => {
                                const isActive = isModuleActive('beauty_college');
                                return (
                                    <div
                                        onClick={() => {
                                            if (!isActive) {
                                                alert("The Beauty College module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('bc');
                                            setActiveTab('beauty_college');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-indigo-600 text-white rounded-2xl w-fit shadow-lg shadow-indigo-100 dark:shadow-none">
                                                <SparklesIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Beauty College</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Manage cosmetology student enrollment packages, starter kit status, practical beauty salon hours, and installment fee billing.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('beauty_college');
                                                            } catch (err) {
                                                                console.error("Failed to activate beauty college trial:", err);
                                                            }
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 8: Finance & Fees */}
                            {(() => {
                                const isActive = isModuleActive('finance');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Finance & Fees module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            props.onSwitchPerspective?.('finance');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-emerald-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-emerald-600 text-white rounded-2xl w-fit shadow-lg shadow-emerald-150 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">Finance & Fees</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Generate student invoices, process fee collections/receipting, manage mobile payments, and track general transaction ledgers.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('finance');
                                                            } catch (err) {
                                                                console.error("Failed to activate finance trial:", err);
                                                            }
                                                        }}
                                                        className="bg-emerald-600 hover:bg-emerald-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 8.1: NG-CDF Bursaries */}
                            {(() => {
                                const isActive = isModuleActive('ng_cdf');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The NG-CDF Bursaries module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveTab('ng_cdf'); 
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-indigo-600 text-white rounded-2xl w-fit shadow-lg shadow-indigo-150 dark:shadow-none">
                                                <CurrencyIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">NG-CDF Bursaries</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Manage constituency bursary applications, track student vetting status, generate PDF support kits, and log block school grants.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('ng_cdf');
                                                            } catch (err) {
                                                                console.error("Failed to activate ng_cdf trial:", err);
                                                            }
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 8.5: HR & Payroll Compliance */}
                            {(() => {
                                const isActive = isModuleActive('hr_payroll');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The HR & Payroll module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            props.onSwitchPerspective?.('hr_officer');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-teal-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 dark:bg-teal-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-teal-600 text-white rounded-2xl w-fit shadow-lg shadow-teal-150 dark:shadow-none">
                                                <BriefcaseIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">HR & Payroll</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Manage staff files, run Kenyan standard compliant payroll calculations (PAYE, NHIF/SHIF, NSSF), track attendance, and generate payslips.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('hr_payroll');
                                                            } catch (err) {
                                                                console.error("Failed to activate hr_payroll trial:", err);
                                                            }
                                                        }}
                                                        className="bg-teal-600 hover:bg-teal-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 8.6: EduFlow Workflow Manager */}
                            {(() => {
                                const isActive = isModuleActive('academics');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Academics module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('academics');
                                            setActiveTab('eduflow');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-violet-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 dark:bg-violet-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-violet-600 text-white rounded-2xl w-fit shadow-lg shadow-violet-150 dark:shadow-none">
                                                <ClipboardListIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">EduFlow Tasks</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Coordinate departmental task forces, manage student/teacher milestones, log digital check-ins, and track team collaboration workflows.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('academics');
                                                            } catch (err) {
                                                                console.error("Failed to activate academics trial for eduflow:", err);
                                                            }
                                                        }}
                                                        className="bg-violet-600 hover:bg-violet-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 8.6b: EduVote AI Student Elections */}
                            {(() => {
                                const isActive = isModuleActive('eduvote');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The EduVote AI Student Elections module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('eduvote');
                                            setActiveTab('eduvote');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-indigo-650 text-white rounded-2xl w-fit shadow-lg shadow-indigo-100 dark:shadow-none">
                                                <ShieldIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">EduVote AI</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Automate student council, school captain, and house elections with secure, double-blind cryptographic voting and live projection boards.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('eduvote');
                                                            } catch (err) {
                                                                console.error("Failed to activate eduvote trial:", err);
                                                            }
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 8.7: EduPulse Wellness & Sickbay */}
                            {(() => {
                                const isActive = isModuleActive('his');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The EduPulse Wellness module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            props.onSwitchPerspective?.('nurse');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-rose-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 dark:bg-rose-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-rose-600 text-white rounded-2xl w-fit shadow-lg shadow-rose-150 dark:shadow-none">
                                                <HeartIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">EduPulse Wellness</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Manage the school sickbay, track student medical registries, record triage logs, handle clinic visits, and coordinate wellness events.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('his');
                                                            } catch (err) {
                                                                console.error("Failed to activate wellness (his) trial:", err);
                                                            }
                                                        }}
                                                        className="bg-rose-600 hover:bg-rose-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 9: Marathon & Event Management */}
                            {(() => {
                                const isActive = isModuleActive('events');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Marathon & Event Management module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            props.onSwitchPerspective?.('event_manager');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/20 dark:bg-indigo-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-indigo-600 text-white rounded-2xl w-fit shadow-lg shadow-indigo-100 dark:shadow-none">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 00-2 2z" />
                                                </svg>
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Event Management</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Track athletic marathons, manage race category parameters, log BIB numbers, timing splits, fundraising pledges, and medical tents.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('events');
                                                            } catch (err) {
                                                                console.error("Failed to activate events trial:", err);
                                                            }
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 10: Alumnae Network */}
                            {(() => {
                                const isActive = isModuleActive('alumni');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Alumnae Portal is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('academics');
                                            setActiveTab('alumni' as any);
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-pink-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-pink-50/20 dark:bg-pink-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-pink-600 text-white rounded-2xl w-fit shadow-lg shadow-pink-100 dark:shadow-none">
                                                <AcademicCapIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">Alumnae Control</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Manage alumnae portal, track graduates, coordinate fundraising, and manage alumnae events.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('alumni');
                                                            } catch (err) {
                                                                console.error("Failed to activate alumni trial:", err);
                                                            }
                                                        }}
                                                        className="bg-pink-600 hover:bg-pink-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Claim Portal
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 11: Student Enrollment Manager */}
                            {(() => {
                                const isActive = isModuleActive('enrollment_manager');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Student Enrollment module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('academics'); 
                                            setActiveTab('enrollment'); 
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-indigo-600 text-white rounded-2xl w-fit shadow-lg shadow-indigo-100 dark:shadow-none">
                                                <UserPlusIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Enrollment Manager</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Onboard student identity registries, manage course cohorts, record license class requirements, and verify biometric scan keys.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('enrollment_manager');
                                                            } catch (err) {
                                                                console.error("Failed to activate enrollment trial:", err);
                                                            }
                                                        }}
                                                        className="bg-indigo-600 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                                </>
                            )}

                            {/* Card: Remedial Manager */}
                            {(isEdu || isSchool) && (() => {
                                const isActive = isModuleActive('remedials');
                                return (
                                    <div 
                                        onClick={() => { 
                                            if (!isActive) {
                                                alert("The Remedial Manager module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            setActiveScope('remedials'); 
                                            setActiveTab('remedials'); 
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-indigo-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-indigo-650 text-white rounded-2xl w-fit shadow-lg shadow-indigo-100 dark:shadow-none">
                                                <ClockIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">Remedial Manager</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Configure hourly teacher rates, print prefect QR cards, track extra hours, sign anonymous payouts, and invoice parents term flat fees.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('remedials');
                                                            } catch (err) {
                                                                console.error("Failed to activate remedials trial:", err);
                                                            }
                                                        }}
                                                        className="bg-indigo-650 hover:bg-indigo-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {!isDos && (
                                <>
                                    {/* Card 12: Car Wash Module — only for higher-ed */}
                            {isHigherEd && (() => {
                                const isActive = isModuleActive('carwash_admin');
                                return (
                                    <div
                                        onClick={() => {
                                            if (!isActive) {
                                                alert("The Car Wash module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            props.onSwitchPerspective?.('carwash_admin');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-blue-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-blue-500 text-white rounded-2xl w-fit shadow-lg shadow-blue-100 dark:shadow-none">
                                                <SparklesIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">Car Wash Module</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Manage car wash operations, track attendants, monitor daily jobs, and review wash services performance metrics.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('carwash_admin');
                                                            } catch (err) {
                                                                console.error("Failed to activate car wash trial:", err);
                                                            }
                                                        }}
                                                        className="bg-blue-500 hover:bg-blue-600 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 13: Car Service Center — only for higher-ed */}
                            {isHigherEd && (() => {
                                const isActive = isModuleActive('mechanic_admin');
                                return (
                                    <div
                                        onClick={() => {
                                            if (!isActive) {
                                                alert("The Car Service Center module is currently inactive. Please activate it under Config -> Subscription to access these features.");
                                                return;
                                            }
                                            props.onSwitchPerspective?.('mechanic_admin');
                                        }}
                                        className={`group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-zinc-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px] ${!isActive ? 'opacity-60 saturate-50 hover:border-slate-300 dark:hover:border-slate-700' : ''}`}
                                    >
                                        {!isActive && (
                                            <div className="absolute top-6 right-6 px-3 py-1 bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-355 text-[9px] font-black uppercase tracking-wider rounded-full flex items-center gap-1.5 z-20">
                                                <svg className="w-3 h-3 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                                                Locked
                                            </div>
                                        )}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-zinc-500/5 dark:bg-zinc-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-zinc-650 text-white rounded-2xl w-fit shadow-lg shadow-zinc-100 dark:shadow-none">
                                                <Cog8ToothIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-zinc-600 dark:group-hover:text-zinc-400 transition-colors">Car Service Center</h3>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Manage vehicle repair jobs, spare parts inventory, mechanic schedules, and track vehicle repair diagnostics logs.
                                                </p>
                                                {!isActive && (
                                                    <button
                                                        onClick={async (e) => {
                                                            e.stopPropagation();
                                                            try {
                                                                await onActivateModuleTrial('mechanic_admin');
                                                            } catch (err) {
                                                                console.error("Failed to activate car service trial:", err);
                                                            }
                                                        }}
                                                        className="bg-zinc-600 hover:bg-zinc-700 font-black text-[10px] uppercase tracking-wider py-2.5 px-4 rounded-xl shadow-md text-white transition-all active:scale-95 text-center mt-4 w-full block animate-pulse-subtle"
                                                    >
                                                        Activate Trial
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Card 14: WiFi & Authorized Device Manager (Tenda F3/F6 Ready) */}
                            {(() => {
                                return (
                                    <div 
                                        onClick={() => { 
                                            setActiveTab('network_devices'); 
                                        }}
                                        className="group relative bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-slate-200/50 dark:border-slate-700/50 p-8 rounded-[2.5rem] shadow-sm hover:shadow-2xl hover:border-cyan-500/40 transition-all duration-300 cursor-pointer overflow-hidden transform hover:-translate-y-1.5 flex flex-col justify-between min-h-[240px]"
                                    >
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 dark:bg-cyan-500/10 rounded-bl-[5rem] -mr-6 -mt-6 transition-transform group-hover:scale-110" />
                                        <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
                                            <div className="p-4 bg-cyan-600 text-white rounded-2xl w-fit shadow-lg shadow-cyan-100 dark:shadow-none">
                                                <SignalIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors">WiFi & Devices</h3>
                                                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">Tenda F3/F6</span>
                                                </div>
                                                <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-400 mt-2 leading-relaxed">
                                                    Control who accesses school internet. Whitelist teacher laptops, student tablets, manage bandwidth quotas, and export MAC filters for Tenda F3 & F6 routers.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                                </>
                            )}

                        </div>
                    </div>
                ) : (
                    <>
                {isLogistics && !isEdu && !isSchool && (
                    <LogisticsManager 
                        currentInstitution={props.currentInstitution!}
                        users={(props.users || []).filter(u => !props.currentInstitution?.id || !u.institutionId || (u as any).institution_id === props.currentInstitution.id || u.institutionId === props.currentInstitution.id)}
                        courses={props.courses || []}
                        currentUser={props.currentUser}
                        onUpdateInstitution={props.onUpdateInstitution}
                    />
                )}
                {activeTab === 'dashboard' && !isCoop && !isDS && !isBC && !isAutoMarket && !isCampaign && !isLaw && !isInvoicing && !isLogistics && activeScope !== 'ds' && activeScope !== 'bc' && (
                    <div className="space-y-6">
                        {isCampaign ? (
                            <div className="animate-fade-in">
                                <CampaignCommandView user={props.currentUser!} />
                            </div>
                        ) : (
                            <>
                                {isEdu && stats.totalActionable > 0 && !isDS && (
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
                                <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{isDS ? 'Active Instructors' : (isEdu ? 'Active Faculty' : isChurch ? 'Active Workers' : 'Active Staff')}</h3>
                                <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {(props.users || []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin' && u.role !== 'member' && u.role !== 'church_member').length}
                                </p>
                            </div>
                            {((isEdu || isChurch) && !isDS) && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{isEdu ? 'Registry Load' : 'Ministerial Registry'}</h3>
                                    <div className="flex flex-col">
                                        <p className="text-4xl font-black text-indigo-600 tracking-tighter">{(props.allocations || []).length}</p>
                                        <div className="flex flex-col mt-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Planned Periods</span>
                                                <span className="text-xs font-black text-indigo-500">
                                                    {(props.allocations || []).reduce((sum, a) => {
                                                        const subject = (props.subjects || []).find(s => s.id === a.subjectId);
                                                        const periods = subject?.lessonStructure?.reduce((s, ls) => s + (ls.periods || 0) * (ls.count || 0), 0) || 0;
                                                        const streams = (a.courseLevelIds || []).length || 1;
                                                        return sum + (periods * streams);
                                                    }, 0)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center mt-1">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Lessons</span>
                                                <span className="text-xs font-black text-emerald-500">
                                                    {(props.allocations || []).reduce((sum, a) => {
                                                        const subject = (props.subjects || []).find(s => s.id === a.subjectId);
                                                        const lessons = subject?.lessonStructure?.reduce((s, ls) => s + (ls.count || 0), 0) || 0;
                                                        const streams = (a.courseLevelIds || []).length || 1;
                                                        return sum + (lessons * streams);
                                                    }, 0)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {isDS && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">Fleet Operational</h3>
                                    <div className="flex flex-col">
                                        <p className="text-4xl font-black text-emerald-600 tracking-tighter">
                                            {(props.vehicles || []).filter(v => v.status === 'active').length}
                                        </p>
                                        <div className="flex justify-between items-center mt-2">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Fleet</span>
                                            <span className="text-xs font-black text-slate-600">{(props.vehicles || []).length} Vehicles</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {(isEdu || isChurch || isDS) && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-2">{isDS || isEdu ? 'Total Students' : 'Total Congregation'}</h3>
                                    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                                        {isChurch
                                            ? (props.users || []).filter(u => u && (u.role === 'member' || u.role === 'church_member' || u.role === 'visitor')).length
                                            : effectiveStudents.length}
                                    </p>
                                </div>
                            )}
                        </div>

                        {isEdu && (props.currentUser?.role === 'head_teacher' || props.currentUser?.role === 'admin') && (
                            <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950/60 p-8 rounded-[2.5rem] border border-indigo-500/20 text-white shadow-2xl relative overflow-hidden animate-fade-in-up">
                                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />
                                <div className="absolute top-1/2 left-1/4 -translate-y-1/2 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none" />

                                <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-8">
                                    <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                                        <div className="relative w-28 h-28 flex-shrink-0 flex items-center justify-center">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle
                                                    cx="56"
                                                    cy="56"
                                                    r="48"
                                                    className="stroke-slate-800"
                                                    strokeWidth="8"
                                                    fill="transparent"
                                                />
                                                <circle
                                                    cx="56"
                                                    cy="56"
                                                    r="48"
                                                    className="stroke-indigo-500 transition-all duration-1000 ease-out"
                                                    strokeWidth="8"
                                                    fill="transparent"
                                                    strokeDasharray={2 * Math.PI * 48}
                                                    strokeDashoffset={2 * Math.PI * 48 * (1 - attendanceRatePct / 100)}
                                                    strokeLinecap="round"
                                                />
                                            </svg>
                                            <div className="absolute flex flex-col items-center justify-center">
                                                <span className="text-2xl font-black tracking-tight">{attendanceRatePct}%</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Rate</span>
                                            </div>
                                        </div>

                                        <div className="text-center sm:text-left space-y-1.5">
                                            <div className="flex items-center justify-center sm:justify-start gap-2">
                                                <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-pulse" />
                                                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Campus Attendance Pulse</h3>
                                            </div>
                                            <h2 className="text-xl font-black tracking-tight uppercase">Faculty Check-In Dashboard</h2>
                                            <p className="text-xs font-semibold text-slate-400 max-w-sm">
                                                Real-time overview of teaching staff arrivals and punctuality metrics for today.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto lg:flex-grow lg:max-w-2xl">
                                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 block mb-1">Total Faculty</span>
                                            <span className="text-2xl font-black text-white">{totalTeachersCount}</span>
                                        </div>
                                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 block mb-1">On Time</span>
                                            <span className="text-2xl font-black text-indigo-400">{onTimeCount}</span>
                                        </div>
                                        <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800/80">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500 block mb-1">Late Arrivals</span>
                                            <span className="text-2xl font-black text-amber-500">{lateCount}</span>
                                        </div>
                                        <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800/80">
                                            <span className="text-[9px] font-black uppercase tracking-widest text-red-550 block mb-1">Absent Alerts</span>
                                            <span className="text-2xl font-black text-red-500">{absentCount}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-stretch w-full lg:w-64 gap-3 shrink-0">
                                        {props.onSwitchPerspective && (
                                            <button
                                                onClick={() => {
                                                    props.onSwitchPerspective?.('hr_officer');
                                                }}
                                                className="w-full py-3.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-98 transition-all flex items-center justify-center gap-2"
                                            >
                                                <BriefcaseIcon className="w-4 h-4" />
                                                Attendance Command Desk
                                            </button>
                                        )}
                                        
                                        {recentCheckInsData.length > 0 ? (
                                            <div className="bg-slate-950/40 p-3 rounded-2xl border border-slate-900/80 space-y-2">
                                                <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest block">Live Checkins</span>
                                                <div className="space-y-1">
                                                    {recentCheckInsData.map(rc => (
                                                        <div key={rc.id} className="flex justify-between items-center text-[10px] font-bold">
                                                            <span className="truncate text-slate-350 max-w-[120px]">{rc.name}</span>
                                                            <span className={rc.status === 'On Time' ? 'text-indigo-400' : 'text-amber-500'}>
                                                                {rc.time ? rc.time.substring(0, 5) : 'Checked in'}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="bg-slate-950/20 p-3 rounded-2xl border border-dashed border-slate-800/80 text-center">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">No check-ins today</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {!isCommunity && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-xl font-black tracking-tighter uppercase mb-6 flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                    Operational Hub
                                </h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                    {isEdu && !isDS && (
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
                                     {isCoreAdmin && !isAutoMarket && (
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
                                    {props.currentUser?.role === 'super_admin' && (
                                        <button
                                            onClick={() => window.location.href = 'https://almamater.eduai.co.ke/?view=alumnae_social'}
                                            className="flex flex-col items-start p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl border border-indigo-100 dark:border-indigo-800 hover:border-indigo-400 transition-all group text-left shadow-xl shadow-indigo-100/20"
                                        >
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                                <GlobeAltIcon className="w-6 h-6" />
                                            </div>
                                            <span className="font-black text-sm uppercase tracking-tight text-slate-900 dark:text-white">Public Alumnae Portal</span>
                                            <p className="text-[10px] text-slate-400 uppercase mt-1">Jump to Social Feed</p>
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
                                    {isFuelStation && (
                                        <button
                                            onClick={() => handleQuickAction('fuel_station')}
                                            className="flex flex-col items-start p-6 bg-emerald-600 text-white rounded-3xl shadow-xl shadow-emerald-200 hover:shadow-emerald-300 transition-all group text-left hover:-translate-y-1"
                                        >
                                            <div className="p-3 bg-white/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                                <TruckIcon className="w-6 h-6" />
                                            </div>
                                            <span className="font-black text-sm uppercase tracking-tight">Fuel Station </span>
                                            <p className="text-[10px] opacity-80 uppercase mt-1">Command Hub</p>
                                        </button>
                                    )}
                                    {isEdu && !isDS && (
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
                        )}

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
                        </>
                    )}
                </div>
            )}

                {activeTab === 'remedials' && (() => {
                    const targetInstId = props.currentInstitution?.id || (props.currentUser?.institutionId && props.currentUser.institutionId !== 'GLOBAL' ? props.currentUser.institutionId : undefined);
                    const tenantScopedUsers = targetInstId
                        ? (props.users || []).filter(u => (u.institutionId || (u as any).institution_id) === targetInstId)
                        : (props.users || []);
                    const tenantScopedCourses = targetInstId
                        ? (props.courses || []).filter(c => (c.institutionId || (c as any).institution_id) === targetInstId)
                        : (props.courses || []);
                    const tenantScopedSubjects = targetInstId
                        ? (props.subjects || []).filter(s => (s.institutionId || (s as any).institution_id) === targetInstId)
                        : (props.subjects || []);

                    return (
                        <div className="animate-fade-in-up">
                            <RemedialLessonsManager
                                currentUser={props.currentUser!}
                                users={tenantScopedUsers}
                                courses={tenantScopedCourses}
                                subjects={tenantScopedSubjects}
                                currentInstitution={props.currentInstitution}
                                onLogAction={props.onLogAction}
                            />
                        </div>
                    );
                })()}

                {activeTab === 'timetable' && (
                    <ModuleAccessGuard
                        moduleId="timetable"
                        moduleName="Smart Timetable & Academics"
                        description="Access automated timetable generators, manage lesson structures, teaching allocations, and calendar events."
                        institution={props.currentInstitution}
                        onActivateTrial={onActivateModuleTrial}
                    >
                        {isEdu ? (
                            <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-350" /></div>}>
                                <AcademicsOfficerView
                                    currentUser={props.currentUser}
                                    subjects={props.subjects}
                                    onUpdateSubject={props.onUpdateSubject as any}
                                    courses={props.courses}
                                    onUpdateCourse={props.onUpdateCourse}
                                    users={props.users}
                                    rooms={props.rooms}
                                    onUpdateRoom={props.onUpdateRoom}
                                    onDeleteRoom={props.onDeleteRoom}
                                    onAddRoom={props.onAddRoom}
                                    departments={props.departments}
                                    onAddDepartment={props.onAddDepartment}
                                    onUpdateDepartment={props.onUpdateDepartment}
                                    onDeleteDepartment={props.onDeleteDepartment}
                                    onImportDepartments={props.onImportDepartments}
                                    activeAcademicYear={props.activeAcademicYear}
                                    activeSemester={activeSemester}
                                    onExamTimetableGenerated={async (entries: any, ay: any, sem: any) => apiService.saveExamTimetable(props.currentUser!.institutionId, ay, sem, entries)}
                                    examTimetable={props.examTimetable || []}
                                    getSubjectById={props.getSubjectById || ((id: string) => (props.subjects || []).find(s => s && s.id === id))}
                                    getLecturerById={props.getLecturerById || ((id: string) => (props.users || []).find(u => u && u.id === id))}
                                    getRoomById={props.getRoomById || ((id: string) => (props.rooms || []).find(r => r && r.id === id))}
                                    courseSizes={props.courseSizes || new Map()}
                                    academicYears={props.academicYears}
                                    semesters={props.semesters}
                                    timetableSettings={props.timetableSettings}
                                    buildings={props.buildings}
                                    onUpdateBuilding={props.onUpdateBuilding}
                                    onDeleteBuilding={props.onDeleteBuilding}
                                    onAddBuilding={props.onAddBuilding}
                                    academicLevels={props.academicLevels}
                                    letterheadConfig={props.letterheadConfig}
                                    logoUrl={props.logoUrl}
                                    footerImageUrl={props.footerImageUrl}
                                    onUpdateLogo={props.onUpdateLogo as any}
                                    onUpdateFooterImage={props.onUpdateFooterImage as any}
                                    onSaveLetterheadConfig={props.onSaveLetterheadConfig}
                                    emailConfig={props.emailConfig}
                                    onSaveEmailConfig={props.onSaveEmailConfig as any}
                                    onSendTestEmail={props.onSendTestEmail as any}
                                    currentInstitution={props.currentInstitution}
                                    examTimetableSettings={props.examTimetableSettings}
                                    onAddAcademicYear={props.onAddAcademicYear}
                                    onUpdateAcademicYear={props.onUpdateAcademicYear}
                                    onDeleteAcademicYear={props.onDeleteAcademicYear}
                                    onAddSemester={props.onAddSemester}
                                    onUpdateSemester={props.onUpdateSemester}
                                    onDeleteSemester={props.onDeleteSemester}
                                    onSaveTimetableSettings={props.onSaveTimetableSettings}
                                    onImportRooms={props.onImportRooms}
                                    smsConfig={props.smsConfig as any}
                                    themeColor={props.themeColor}
                                    allocations={(props.allocations || props.requests) as any}
                                    timeOffRequests={props.timeOffRequests}
                                    lessonRatings={props.lessonRatings}
                                    assessments={props.assessments}
                                    marks={props.assessmentMarks as any}
                                    activityLog={props.activityLog}
                                    incidents={props.incidents}
                                    onAddIncident={props.onAddIncident}
                                />
                            </Suspense>
                        ) : (
                            <div className="space-y-6">
                            <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                                <button onClick={() => setTimetableSubTab('wizard')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${timetableSubTab === 'wizard' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Wizard</button>
                                <button onClick={() => setTimetableSubTab('scheduler')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${timetableSubTab === 'scheduler' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Lesson Scheduler</button>
                                <button onClick={() => setTimetableSubTab('teachers')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${timetableSubTab === 'teachers' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Teachers</button>
                                <button onClick={() => setTimetableSubTab('students')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${timetableSubTab === 'students' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Students</button>
                                <button onClick={() => setTimetableSubTab('insights')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${timetableSubTab === 'insights' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Exam Insights</button>
                                <button onClick={() => setTimetableSubTab('intelligence')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${timetableSubTab === 'intelligence' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Intelligence Hub</button>
                                <button onClick={() => setTimetableSubTab('discipline')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${timetableSubTab === 'discipline' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Student Discipline</button>
                                <button onClick={() => setTimetableSubTab('registry')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${timetableSubTab === 'registry' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>
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
                                        timetableSettings={props.timetableSettings!}
                                        activeAcademicYear={props.activeAcademicYear || null}
                                        activeSemester={activeSemester || null}
                                        currentInstitution={currentInstitution}
                                        courseSizes={props.courseSizes || new Map<string, number>()}
                                        timeOffRequests={props.timeOffRequests || []}
                                        onTimetableGenerated={props.onTimetableGenerated as any}
                                        onLogAction={props.onLogAction}
                                        onNavigateToSettings={(tab) => {
                                            if (tab === 'calendar' || tab === 'academic_settings') {
                                                setActiveTab('courses');
                                                setCoursesSubTab(tab === 'calendar' ? 'calendar' : 'settings');
                                            } else {
                                                setActiveTab('settings');
                                                if (tab) setRequestedSettingsTab(tab);
                                            }
                                        }}
                                    />
                                ) : timetableSubTab === 'scheduler' ? (
                                    <TimetablesView
                                        generatedTimetable={props.generatedTimetable || []}
                                        subjects={props.subjects || []}
                                        lecturers={props.users?.filter(u => u.role === 'lecturer' || u.role === 'teacher') || []}
                                        allUsers={props.users || []}
                                        rooms={props.rooms || []}
                                        courses={props.courses || []}
                                        departments={props.departments || []}
                                        buildings={props.buildings || []}
                                        allocations={(props.requests || []).filter((r: AllocationRequest) => r && (r.status === 'approved' || r.status === 'hod_approved'))}
                                        getSubjectById={props.getSubjectById || ((id: string) => props.subjects?.find(s => s && s.id === id))}
                                        getLecturerById={props.getLecturerById || ((id: string) => props.users?.find(u => u && u.id === id))}
                                        getRoomById={props.getRoomById || ((id: string) => props.rooms?.find(r => r && r.id === id))}
                                        letterheadConfig={props.letterheadConfig || { headerImageUrl: null, stampImageUrl: null, showStamp: false }}
                                        logoUrl={props.logoUrl || null}
                                        footerImageUrl={props.footerImageUrl || null}
                                        currentUser={props.currentUser!}
                                        timetableSettings={props.timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                                        onSaveTimetableSettings={props.onSaveTimetableSettings || (() => { })}
                                        academicYears={props.academicYears || []}
                                        activeSemester={activeSemester || null}
                                        currentInstitution={props.currentInstitution}
                                        onMoveTimetableEntry={props.onMoveTimetableEntry}
                                        onLogAction={props.onLogAction}
                                        preSelectedViewMode={timetablePreselectedViewMode ?? undefined}
                                        preSelectedLecturerId={timetablePreselectedLecturerId}
                                        preSelectedCourseId={timetablePreselectedCourseId}
                                        onClearPreSelected={() => {
                                            setTimetablePreselectedViewMode(null);
                                            setTimetablePreselectedLecturerId('');
                                            setTimetablePreselectedCourseId('all');
                                        }}
                                    />
                                ) : timetableSubTab === 'teachers' ? (
                                    <TimetableUserDirectory
                                        institutionId={props.currentInstitution?.id || ''}
                                        role="teacher"
                                        allUsers={props.users || []}
                                        allCourses={props.courses || []}
                                        departments={props.departments || []}
                                        timetableEntries={props.generatedTimetable || []}
                                        subjects={props.subjects || []}
                                        allocations={(props.requests || []).filter((r: any) => r && (r.status === 'approved' || r.status === 'hod_approved'))}
                                        isSchool={!!(props.currentInstitution as any)?.isSchool}
                                        onDirectAssign={props.onDirectAssign as any}
                                        onUpdateRequest={props.onUpdateRequest as any}
                                        onWithdrawRequest={props.onWithdrawRequest as any}
                                        onAddTimeOffRequest={props.onAddTimeOffRequest as any}
                                        onRestoreSchedule={(userId) => {
                                            alert(`Schedule restore queued for teacher ${userId}. Re-run the Timetable Wizard to regenerate their entries.`);
                                        }}
                                        onViewCalendar={(user) => {
                                            setTimetablePreselectedViewMode('lecturer_schedule');
                                            setTimetablePreselectedLecturerId(user.id);
                                            setTimetableSubTab('scheduler');
                                        }}
                                    />
                                ) : timetableSubTab === 'students' ? (
                                    <TimetableUserDirectory
                                        institutionId={props.currentInstitution?.id || ''}
                                        role="student"
                                        allUsers={props.users || []}
                                        allCourses={props.courses || []}
                                        departments={props.departments || []}
                                        timetableEntries={props.generatedTimetable || []}
                                        onViewCalendar={(user) => {
                                            setTimetablePreselectedViewMode('master_course');
                                            setTimetablePreselectedCourseId(user.courseId || 'all');
                                            setTimetableSubTab('scheduler');
                                        }}
                                    />
                                ) : timetableSubTab === 'insights' ? (
                                    <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                        <ExamInsights
                                            assessment={props.assessments?.[0] || { id: 'na', title: 'No Assessment', status: 'pending', type: 'Exam' } as any}
                                            marks={props.marks || []}
                                            subjects={props.subjects || []}
                                            students={effectiveStudents}
                                            teachers={(props.users || []).filter(u => u.role === 'teacher' || u.role === 'lecturer')}
                                        />
                                    </Suspense>
                                ) : timetableSubTab === 'intelligence' ? (
                                    <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                        <AcademicReportsHub
                                            students={effectiveStudents}
                                            assessments={props.assessments || []}
                                            marks={props.marks || []}
                                            subjects={props.subjects || []}
                                            institution={props.currentInstitution!}
                                            gradingSystem={(props.currentInstitution?.academicConfig as any)?.gradingSystem || null}
                                        />
                                    </Suspense>
                                ) : timetableSubTab === 'discipline' ? (
                                    <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-300" /></div>}>
                                        <DisciplineManager
                                            incidents={props.incidents || []}
                                            students={effectiveStudents}
                                            onAddIncident={props.onAddIncident || (async () => {})}
                                        />
                                    </Suspense>
                                ) : timetableSubTab === 'registry' ? (
                                    <InteractionsManager
                                        {...props as any}
                                        absenceRequests={props.absenceRequests || []}
                                        contracts={props.contracts || []}
                                        feedbackSubmissions={props.feedbackSubmissions || []}
                                        lessonRatings={props.lessonRatings || []}
                                        studentAbsenceRequests={props.studentAbsenceRequests || []}
                                        enrollmentRequests={props.enrollmentRequests || []}
                                        onOpenDirectAssign={() => setIsDirectAssignOpen(true)}
                                        onUpdateRequestStatus={props.onUpdateRequestStatus || (async () => {})}
                                        onBulkUpdateRequestStatus={props.onBulkUpdateRequestStatus || (async () => {})}
                                        getLecturerById={props.getLecturerById || ((id: string) => (props.users || []).find(u => u && u.id === id))}
                                        getSubjectById={props.getSubjectById || ((id: string) => (props.subjects || []).find(s => s && s.id === id))}
                                        allocations={props.allocations || []}
                                    />
                                ) : (
                                    <TimetableGenerator {...props as any}
                                        {...props}
                                        examTimetable={[]}
                                        courseSizes={props.courseSizes || new Map()}
                                        allocations={(props.requests || []).filter((r: AllocationRequest) => r && (r.status === 'approved' || r.status === 'hod_approved'))}
                                        lecturers={props.users || []}
                                        setActiveTab={(tab: string) => setActiveTab(tab as any)}
                                        onSaveTimetableSettings={props.onSaveTimetableSettings!}
                                        onTimetableGenerated={props.onTimetableGenerated as any}
                                        getLecturerById={props.getLecturerById || ((id: string) => (props.users || []).find(u => u && u.id === id))}
                                        getSubjectById={props.getSubjectById || ((id: string) => (props.subjects || []).find(s => s && s.id === id))}
                                        getRoomById={props.getRoomById || ((id: string) => (props.rooms || []).find(r => r && r.id === id))}
                                    />
                                )}
                            </div>
                        </div>
                        )}
                    </ModuleAccessGuard>
                )}

                {activeTab === 'enrollment' && (
                    <div className="space-y-6">
                        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl w-fit overflow-x-auto no-scrollbar max-w-full">
                            <button onClick={() => setEnrollmentSubTab('students')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${enrollmentSubTab === 'students' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Students Registry</button>
                            <button onClick={() => setEnrollmentSubTab('teachers')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${enrollmentSubTab === 'teachers' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Teachers Registry</button>
                            <button onClick={() => setEnrollmentSubTab('support_staff')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${enrollmentSubTab === 'support_staff' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Support Staff Registry</button>
                            <button onClick={() => setEnrollmentSubTab('broadcaster')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${enrollmentSubTab === 'broadcaster' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Broadcaster Service</button>
                            <button onClick={() => setEnrollmentSubTab('calendar')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${enrollmentSubTab === 'calendar' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Events & PINs</button>
                            <button onClick={() => setEnrollmentSubTab('guests')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${enrollmentSubTab === 'guests' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Cleared Guests</button>
                            <button onClick={() => setEnrollmentSubTab('portal_hub')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${enrollmentSubTab === 'portal_hub' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Portal Hub</button>
                        </div>
                        <div className="animate-fade-in-up">
                            <StudentEnrollmentManager
                                context={isDS ? 'driving_school' : 'academic'}
                                currentInstitution={props.currentInstitution!}
                                activeTab={enrollmentSubTab}
                                companyDetails={props.companyDetails}
                                currentUser={props.currentUser!}
                                onLogAction={props.onLogAction}
                                initialUsers={props.users}
                                initialSubjects={props.subjects}
                                initialCourses={props.courses}
                                initialEnrollments={props.studentEnrollments}
                            />
                        </div>
                    </div>
                )}

                {['enrollment_students', 'enrollment_teachers', 'enrollment_support_staff', 'enrollment_broadcaster', 'enrollment_calendar', 'enrollment_guests', 'enrollment_portal_hub'].includes(activeTab) && (
                    <div className="animate-fade-in-up">
                        <StudentEnrollmentManager
                            context={isDS ? 'driving_school' : 'academic'}
                            currentInstitution={props.currentInstitution!}
                            activeTab={
                                activeTab === 'enrollment_students' ? 'students' :
                                activeTab === 'enrollment_teachers' ? 'teachers' :
                                activeTab === 'enrollment_support_staff' ? 'support_staff' :
                                activeTab === 'enrollment_broadcaster' ? 'broadcaster' :
                                activeTab === 'enrollment_calendar' ? 'calendar' :
                                activeTab === 'enrollment_portal_hub' ? 'portal_hub' :
                                'guests'
                            }
                            companyDetails={props.companyDetails}
                            currentUser={props.currentUser!}
                            onLogAction={props.onLogAction}
                            initialUsers={props.users}
                            initialSubjects={props.subjects}
                            initialCourses={props.courses}
                            initialEnrollments={props.studentEnrollments}
                        />
                    </div>
                )}

                {activeTab === 'eduflow' && (
                    <div className="animate-fade-in-up">
                        <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-350" /></div>}>
                            <EduFlowManager
                                context={isDS ? 'driving_school' : 'academic'}
                                currentUser={props.currentUser!}
                                currentInstitution={props.currentInstitution!}
                                subjects={props.subjects || []}
                                users={props.users || []}
                                courses={props.courses || []}
                            />
                        </Suspense>
                    </div>
                )}

                {activeTab === 'users' && (
                    <UserManager {...props as any}
                        {...props}
                        user={props.currentUser}
                        showOnly="staff"
                        isDS={isDS}
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
                        isRetailAgency={isRetailAgency}
                        isAutoMarket={isAutoMarket}
                    />
                )}

                {activeTab === 'customers' && (
                    <UserManager {...props as any}
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
                        isDS={isDS}
                    />
                )}

                {activeTab === 'courses' && (
                    <ModuleAccessGuard
                        moduleId="academics"
                        moduleName="Academics & Grading"
                        description="Manage grade registries, student performance, subject catalogs, and curriculum levels."
                        institution={props.currentInstitution}
                        onActivateTrial={onActivateModuleTrial}
                    >
                        <div className="space-y-6">
                        <div className="flex bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-2xl w-fit">
                            <button onClick={() => setCoursesSubTab('registry')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${coursesSubTab === 'registry' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>{isSchool ? 'Registry' : 'Grading Registry'}</button>
                            <button onClick={() => setCoursesSubTab('calendar')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${coursesSubTab === 'calendar' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Academic Calendar</button>
                            <button onClick={() => setCoursesSubTab('subjects')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${coursesSubTab === 'subjects' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Subject Registry</button>
                            <button onClick={() => setCoursesSubTab('settings')} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${coursesSubTab === 'settings' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:text-indigo-500'}`}>Academic Settings</button>
                        </div>

                        <div className="animate-fade-in-up">
                            {coursesSubTab === 'registry' ? (
                                <CourseManager {...props as any}
                                    courses={courses}
                                    buildings={props.buildings || []}
                                    rooms={rooms}
                                    subjects={subjects}
                                    onAddCourse={props.onAddCourse}
                                    onUpdateCourse={props.onUpdateCourse}
                                    onDeleteCourse={props.onDeleteCourse}
                                    onImportCourses={props.onImportCourses}
                                    onAddAcademicLevel={props.onAddAcademicLevel}
                                    onUpdateAcademicLevel={props.onUpdateAcademicLevel}
                                    onDeleteAcademicLevel={props.onDeleteAcademicLevel}
                                    academicLevels={props.academicLevels || []}
                                    onAssociateSubjectToCourseLevel={props.onAssociateSubjectToCourseLevel}
                                    onDisassociateSubjectFromCourseLevel={props.onDisassociateSubjectFromCourseLevel}
                                    currentInstitution={currentInstitution}
                                />
                            ) : coursesSubTab === 'calendar' ? (
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
                            ) : coursesSubTab === 'subjects' ? (
                                <SubjectManager
                                    {...props}
                                    subjects={props.subjects || []}
                                    courses={props.courses || []}
                                    departments={props.departments || []}
                                    buildings={props.buildings || []}
                                    timetableSettings={props.timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                                    onAddSubject={props.onAddSubject}
                                    onUpdateSubject={props.onUpdateSubject}
                                    onDeleteSubject={props.onDeleteSubject}
                                    onEditSubject={props.onEditSubject}
                                    onSaveTimetableSettings={props.onSaveTimetableSettings!}
                                    onUpdateCourse={props.onUpdateCourse}
                                    onImportSubjectsAndAssociate={props.onImportSubjectsAndAssociate as any}
                                    currentUser={props.currentUser!}
                                    rooms={props.rooms || []}
                                />
                            ) : (
                                <AcademicConfigManager
                                    currentInstitution={currentInstitution}
                                    onUpdateInstitution={props.onUpdateInstitution!}
                                />
                            )}
                        </div>
                    </div>
                    </ModuleAccessGuard>
                )}

                {activeTab === 'comms' && (
                    <CommunicationsManager
                        {...props}
                        users={props.users || []}
                        departments={props.departments || []}
                        onSendSms={props.onSendSms || (async (_r: any, _m: any) => ({ success: false, message: 'SMS service disabled' }))}
                        currentUser={props.currentUser}
                        smsBalance={props.currentInstitution?.smsBalance}
                        currentInstitution={props.currentInstitution!}
                        mpesaConfig={props.companyDetails?.mpesaConfig}
                        smsConfig={props.smsConfig}
                        onRefreshData={props.onRefreshData}
                        moduleContext={(isCoop ? 'cooperative' : (isAutoMarket ? 'auto_marketplace' : (isRetailAgency ? 'agrovet' : isChurch ? 'church' : isLogistics ? 'logistics' : 'school'))) as any}
                        courses={props.courses || []}
                    />
                )}

                {activeTab === 'transport' && (
                    !isEdu ? (
                        <TransportManager
                            currentInstitution={props.currentInstitution!}
                            vehicles={(props.vehicles || []).filter(v => !props.currentInstitution?.id || !v.institutionId || (v as any).institution_id === props.currentInstitution.id || v.institutionId === props.currentInstitution.id)}
                            users={(props.users || []).filter(u => !props.currentInstitution?.id || !u.institutionId || (u as any).institution_id === props.currentInstitution.id || u.institutionId === props.currentInstitution.id)}
                            courses={props.courses || []}
                            onAddVehicle={props.onAddVehicle!}
                            onUpdateVehicle={props.onUpdateVehicle!}
                            onDeleteVehicle={props.onDeleteVehicle!}
                            onAddUser={props.onAddUser}
                            onEditUser={props.onEditUser}
                        />
                    ) : (
                        <ModuleAccessGuard
                            moduleId="transport"
                            moduleName="Fleet Registry"
                            description="Track and manage your institutional school buses, routes, drivers, and student check-ins."
                            institution={props.currentInstitution}
                            onActivateTrial={onActivateModuleTrial}
                        >
                            <TransportManager
                                currentInstitution={props.currentInstitution!}
                                vehicles={(props.vehicles || []).filter(v => !props.currentInstitution?.id || !v.institutionId || (v as any).institution_id === props.currentInstitution.id || v.institutionId === props.currentInstitution.id)}
                                users={(props.users || []).filter(u => !props.currentInstitution?.id || !u.institutionId || (u as any).institution_id === props.currentInstitution.id || u.institutionId === props.currentInstitution.id)}
                                courses={props.courses || []}
                                onAddVehicle={props.onAddVehicle!}
                                onUpdateVehicle={props.onUpdateVehicle!}
                                onDeleteVehicle={props.onDeleteVehicle!}
                                onAddUser={props.onAddUser}
                                onEditUser={props.onEditUser}
                            />
                        </ModuleAccessGuard>
                    )
                )}

                {(() => {
                    const retailTabMap: Record<string, string> = {
                        'inv_dashboard': 'dashboard',
                        'inv_inventory': 'inventory',
                        'inv_stock_inwards': 'stock_inwards',
                        'inv_pos': 'pos',
                        'inv_shipments': 'shipments',
                        'inv_teachers': 'teachers',
                        'inv_support_staff': 'support_staff',
                        'inv_students': 'students',
                        'inv_reports': 'reports',
                        'inv_logistics': 'logistics',
                        'inv_stores': 'stores',
                        'inv_expenses': 'expenses',
                        'inv_requisitions': 'requisitions',
                        'inv_vendors': 'vendors',
                        'inv_transfers': 'transfers',
                        'inv_config': 'config',
                        // For retail agency: procurement top-tab deep-links directly to vendors view, deliveries to logistics
                        'procurement': 'vendors',
                        'deliveries': 'logistics',
                        'logistics': 'logistics'
                    };

                    const isRetailTab = (isEdu && activeScope === 'inventory' && activeTab in retailTabMap)
                        || activeTab === 'retail'
                        || (isRetailAgency && (
                            activeTab === 'procurement' ||
                            activeTab === 'deliveries' ||
                            activeTab === 'logistics' ||
                            activeTab === 'inv_logistics' ||
                            activeTab in retailTabMap
                        ));
                    
                    if (isRetailTab) {
                        // For retail agency: procurement tab deep-links to vendors sub-view, deliveries deep-links to logistics
                        const mappedTab = isRetailAgency
                            ? (activeTab === 'deliveries' || activeTab === 'logistics' || activeTab === 'inv_logistics')
                                ? 'logistics'
                                : (activeTab === 'procurement')
                                ? 'vendors'
                                : activeTab in retailTabMap
                                ? retailTabMap[activeTab]
                                : (activeTab === 'retail' ? (retailAgencySubTab || 'dashboard') : undefined)
                            : (isEdu && activeScope === 'inventory') ? retailTabMap[activeTab] : undefined;

                        // Retail agency: 'retail', 'deliveries', and 'procurement' tabs render RetailManager directly
                        if (isRetailAgency) {
                            return (
                                <RetailManager
                                    institutionId={props.currentInstitution?.id || ''}
                                    businessSubType={props.currentInstitution?.businessSubType}
                                    currentUser={props.currentUser!}
                                    retailStores={retailStores}
                                    inventory={inventory}
                                    retailExpenses={retailExpenses}
                                    onAddRetailExpense={props.onAddRetailExpense}
                                    requisitions={props.requisitions}
                                    onAddRequisition={props.onAddRequisition}
                                    onUpdateRequisition={props.onUpdateRequisition}
                                    isEducation={isEdu}
                                    allUsers={props.users || []}
                                    allCourses={props.courses || []}
                                    currentInstitution={props.currentInstitution}
                                    activeTab={mappedTab}
                                    onTabChange={(tab) => {
                                        setRetailAgencySubTab(tab);
                                        if (tab === 'logistics') {
                                            setActiveTab('deliveries' as any);
                                        } else if (tab === 'vendors') {
                                            setActiveTab('procurement' as any);
                                        } else {
                                            setActiveTab('retail' as any);
                                        }
                                    }}
                                    countyInventory={props.countyInventory}
                                    onMarkInventoryReceived={props.onMarkInventoryReceived}
                                    onEditUser={props.onEditUser}
                                    voteHeads={props.voteHeads}
                                />
                            );
                        }

                        // Education / school store: wrap with module access guard
                        return (
                            <ModuleAccessGuard
                                moduleId="school_store"
                                moduleName="School Inventory"
                                description="Track and manage school supply inventory, uniform/stationery stock, student requests, and suppliers."
                                institution={props.currentInstitution}
                                onActivateTrial={onActivateModuleTrial}
                            >
                                <RetailManager
                                    institutionId={props.currentInstitution?.id || ''}
                                    businessSubType={props.currentInstitution?.businessSubType}
                                    currentUser={props.currentUser!}
                                    retailStores={retailStores}
                                    inventory={inventory}
                                    retailExpenses={retailExpenses}
                                    onAddRetailExpense={props.onAddRetailExpense}
                                    requisitions={props.requisitions}
                                    onAddRequisition={props.onAddRequisition}
                                    onUpdateRequisition={props.onUpdateRequisition}
                                    isEducation={isEdu}
                                    allUsers={props.users || []}
                                    allCourses={props.courses || []}
                                    currentInstitution={props.currentInstitution}
                                    activeTab={mappedTab}
                                    onTabChange={(tab) => {
                                        const reverseMap = Object.entries(retailTabMap).find(([_, value]) => value === tab)?.[0];
                                        if (reverseMap) setActiveTab(reverseMap as any);
                                    }}
                                    hideNavigation={false}
                                    countyInventory={props.countyInventory}
                                    onMarkInventoryReceived={props.onMarkInventoryReceived}
                                    onEditUser={props.onEditUser}
                                    voteHeads={props.voteHeads}
                                />
                            </ModuleAccessGuard>
                        );
                    }
                    return null;
                })()}

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
                                currentUser={props.currentUser!}
                                currentInstitution={props.currentInstitution}
                                inventory={coopAgrovetInventory}
                                sales={coopAgrovetSales}
                                saccoAccounts={saccoAccounts}
                                payouts={coopPayouts}
                                expenses={coopExpenses}
                                income={coopIncome}
                                onAddFarmer={props.onAddFarmer || (async () => { })}
                                onUpdateFarmer={props.onUpdateFarmer || (async () => { })}
                                onAddSaccoAccount={props.onAddSaccoAccount || (async () => { })}
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
                                onAddSales={props.onAddCoopAgrovetSales}
                                onLogAction={props.onLogAction}
                                onSendSms={props.onSendSms}
                                 onInitiatePayouts={props.onInitiatePayouts}
                                onApprovePayouts={props.onApprovePayouts as any}
                                onDisbursePayouts={props.onDisbursePayouts}
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
                                 onRefreshData={props.onRefreshData}
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

                {activeTab === 'church' && isChurch && (
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 min-h-[60vh] animate-fade-in-up">
                        <ChurchDenominationProvider church={props.currentInstitution!}>
                            <ChurchDashboard />
                        </ChurchDenominationProvider>
                    </div>
                )}
                {activeTab === 'car_service' && (
                    <CarServiceView
                        currentUser={props.currentUser!}
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
                        activeScope={activeScope}
                        themeColor={props.themeColor || 'indigo'}
                        users={props.users || []}
                        onImportSubjectsAndAssociate={props.onImportSubjectsAndAssociate ? (subjects) => props.onImportSubjectsAndAssociate!(subjects as any) : undefined}
                        departments={props.departments || []}
                        buildings={props.buildings || []}
                        rooms={props.rooms || []}
                        courses={props.courses || []}
                        subjects={props.subjects || []}
                        allocations={(props.requests || []).filter(r => r && r.status === 'approved')}
                        initialTab={requestedSettingsTab}
                        isInstitutionalView={true}
                        currentUser={props.currentUser!}
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
                        academicYears={props.academicYears || []}
                        semesters={props.semesters || []}
                        onUpdateCompanyDetails={props.onUpdateCompanyDetails}
                        onRefreshData={props.onRefreshData}
                        timetableSettings={props.timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                        examTimetableSettings={props.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                        isCoop={isCoop}
                        onImportStudents={props.onImportStudents}
                        smsConfig={props.smsConfig}
                        onWithdrawRequest={props.onWithdrawRequest}
                        onAddExtensionRequest={props.onAddExtensionRequest}
                        activityLogLimit={props.activityLogLimit}
                        setActivityLogLimit={props.setActivityLogLimit}
                        dsSettings={props.dsSettings || dsContext?.settings || null}
                        onUpdateDSSettings={props.onUpdateDSSettings || dsContext?.updateSettings}
                        isDS={isDS}
                    />
                )}

                {activeTab === 'external_module' && (
                    <div className="animate-fade-in-up">
                        <ExternalModuleView
                            title="EduAI Support & Analytics Hub"
                            url="https://support.eduai.co.ke"
                            description="Access system guides, analytics dashboard and priority support."
                        />
                    </div>
                )}

                {activeTab === 'procurement' && !isRetailAgency && (
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

                {(activeTab === 'milling' || (isMilling && activeTab === 'dashboard')) && (
                    <GrainMillerManager
                        currentUser={props.currentUser}
                        currentInstitution={props.currentInstitution!}
                        onDataChange={props.onRefreshData}
                    />
                )}

                {activeTab === 'leaveout' && (
                    <ModuleAccessGuard
                        moduleId="boarding"
                        moduleName="Boarding Master"
                        description="Manage student boarding houses, bed allocations, dorm assignments, and student leave-out checkouts."
                        institution={props.currentInstitution}
                        onActivateTrial={onActivateModuleTrial}
                    >
                        <StudentLeaveOutManager
                            {...props}
                            currentUser={props.currentUser!}
                            currentInstitution={props.currentInstitution!}
                            companyDetails={props.companyDetails!}
                            users={props.users || []}
                            academicYears={props.academicYears || []}
                            semesters={props.semesters || []}
                            courses={props.courses || []}
                            departments={props.departments || []}
                            onLogAction={props.onLogAction!}
                            onDataChange={() => props.onAddUser && props.onAddUser({})}
                        />
                    </ModuleAccessGuard>
                )}
                {activeTab === 'boarding' && (
                    <ModuleAccessGuard
                        moduleId="boarding"
                        moduleName="Boarding Master"
                        description="Manage student boarding houses, bed allocations, dorm assignments, and student leave-out checkouts."
                        institution={props.currentInstitution}
                        onActivateTrial={onActivateModuleTrial}
                    >
                        <BoardingMasterView
                            currentUser={props.currentUser as any}
                            currentInstitution={props.currentInstitution!}
                            companyDetails={props.companyDetails as any}
                            users={props.users as any}
                            academicYears={props.academicYears as any}
                            semesters={props.semesters as any}
                            courses={props.courses as any}
                            departments={props.departments as any}
                            onLogAction={props.onLogAction! as any}
                            onAddUser={props.onAddUser as any}
                            onEditUser={props.onEditUser as any}
                            onDeleteUser={props.onDeleteUser as any}
                            onImportStudents={props.onImportStudents as any}
                            smsConfig={props.smsConfig as any}
                            subjects={props.subjects as any}
                            letterheadConfig={props.letterheadConfig as any}
                            logoUrl={props.logoUrl as any}
                            footerImageUrl={props.footerImageUrl as any}
                            onSendSms={props.onSendSms as any}
                            onAddParent={props.onAddParent as any}
                            onDeleteParent={props.onDeleteParent as any}
                        />
                    </ModuleAccessGuard>
                )}

                {(activeTab === 'campaign' || (activeTab === 'dashboard' && isCampaign)) && (
                    <div className="animate-fade-in">
                        <CampaignCommandView user={props.currentUser!} />
                    </div>
                )}

                {activeTab === 'eduvote' && (
                    <Suspense fallback={
                        <div className="flex items-center justify-center p-20">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    }>
                        <EduVoteAI 
                            user={props.currentUser!} 
                            onViewProjector={(id) => { 
                                setProjectorElectionId(id); 
                                setActiveTab('eduvote_projector'); 
                            }} 
                        />
                    </Suspense>
                )}

                {activeTab === 'eduvote_projector' && projectorElectionId && (
                    <Suspense fallback={
                        <div className="flex items-center justify-center p-20">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    }>
                        <EduVoteProjector 
                            electionId={projectorElectionId} 
                            onBack={() => { 
                                setActiveTab('eduvote'); 
                                setProjectorElectionId(null); 
                            }} 
                        />
                    </Suspense>
                )}
                {(activeTab === 'law' || (activeTab === 'dashboard' && isLaw)) && (
                    <LawManager 
                        currentUser={props.currentUser!}
                        currentInstitution={props.currentInstitution ?? null}
                        clients={props.lawClients || []}
                        matters={props.lawMatters || []}
                        documents={props.lawDocuments || []}
                        timeEntries={props.lawTimeEntries || []}
                        invoices={props.lawInvoices || []}
                        trustTransactions={props.lawTrustTransactions || []}
                        users={props.users || []}
                        onAddClient={props.onAddLawClient as any}
                        onAddMatter={props.onAddLawMatter as any}
                        onAddTimeEntry={props.onAddLawTimeEntry as any}
                        onAddTrustTransaction={props.onAddLawTrustTransaction as any}
                        onAddInvoice={props.onAddLawInvoice as any}
                        onUpdateMatter={props.onUpdateLawMatter as any}
                        agreementTemplates={props.lawAgreementTemplates || []}
                        agreements={props.lawAgreements || []}
                        onAddAgreementTemplate={props.onAddLawAgreementTemplate as any}
                        onGenerateAgreement={props.onGenerateLawAgreement as any}
                        onApproveAgreement={props.onApproveLawAgreement as any}
                    />
                )}

                {(activeTab === 'corporate_invoices' || (activeTab === 'dashboard' && isInvoicing)) && (
                    <Suspense fallback={
                        <div className="flex items-center justify-center p-20">
                            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                        </div>
                    }>
                        <CorporateInvoicingManager
                            currentUser={props.currentUser!}
                            currentInstitution={props.currentInstitution!}
                            companyDetails={props.companyDetails}
                            letterheadConfig={props.letterheadConfig || props.currentInstitution?.letterheadConfig}
                            logoUrl={props.logoUrl || props.currentInstitution?.logoUrl}
                            onLogAction={props.onLogAction}
                            initialInvoices={props.invoices}
                            initialReceipts={props.receipts}
                            onRefreshData={props.onRefreshData}
                        />
                    </Suspense>
                )}

                {activeTab === 'network_devices' && (
                    <Suspense fallback={
                        <div className="flex items-center justify-center p-20">
                            <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                        </div>
                    }>
                        <SchoolDeviceAccessManager
                            currentUser={props.currentUser!}
                            currentInstitution={props.currentInstitution!}
                        />
                    </Suspense>
                )}

                {(activeTab === 'driving_school' || activeTab === 'dashboard' || activeTab.startsWith('ds_') || isDS || activeScope === 'ds' || isDSInstitution(props.currentInstitution)) && (isDS || activeScope === 'ds' || isDSInstitution(props.currentInstitution)) && (
                    <DrivingSchoolProvider institutionId={props.currentInstitution?.id} currentUser={props.currentUser}>
                        <DrivingSchoolManager
                            currentUser={props.currentUser!}
                            currentInstitution={props.currentInstitution!}
                            externalTab={
                                activeTab === 'dashboard' ? 'dashboard' : 
                                activeTab === 'driving_school' ? 'dashboard' :
                                activeTab.startsWith('ds_') ? activeTab.replace('ds_', '') as any : 
                                activeTab as any
                            }
                            onRefreshData={props.onRefreshData}
                            departments={props.departments || []}
                            rooms={props.rooms || []}
                            letterheadConfig={props.letterheadConfig}
                        />
                    </DrivingSchoolProvider>
                )}

                {(activeTab === 'beauty_college' || activeTab === 'dashboard' || activeTab.startsWith('bc_')) && (isBC || activeScope === 'bc') && (
                    <BeautyCollegeManager
                        currentUser={props.currentUser!}
                        currentInstitution={props.currentInstitution!}
                        activeTab={
                            activeTab === 'dashboard' ? 'dashboard' :
                            activeTab === 'beauty_college' ? 'dashboard' :
                            activeTab.startsWith('bc_') ? activeTab.replace('bc_', '') as any :
                            activeTab as any
                        }
                        onRefreshData={props.onRefreshData}
                    />
                )}

                {activeTab === 'logistics' && !isRetailAgency && !(isLogistics && !isEdu && !isSchool) && (
                    <LogisticsManager 
                        currentInstitution={props.currentInstitution!}
                        users={(props.users || []).filter(u => !props.currentInstitution?.id || !u.institutionId || (u as any).institution_id === props.currentInstitution.id || u.institutionId === props.currentInstitution.id)}
                        courses={props.courses || []}
                        currentUser={props.currentUser}
                        onUpdateInstitution={props.onUpdateInstitution}
                    />
                )}
                {activeTab === 'fiscal_guard' && (
                    <ModuleAccessGuard
                        moduleId="fiscal_guard"
                        moduleName="FiscalGuard AI Auditor"
                        description="Independent fiscal audit dashboard monitoring transaction logs, duplicate entries, sequence gaps, and statistical anomalies."
                        institution={props.currentInstitution}
                        onActivateTrial={props.onActivateModuleTrial}
                    >
                        <FiscalGuard
                            invoices={props.invoices || []}
                            receipts={props.receipts || []}
                            expenses={props.expenses || []}
                            students={effectiveStudents}
                            institutionId={props.currentInstitution?.id || ''}
                            onRefreshData={props.onRefreshData}
                        />
                    </ModuleAccessGuard>
                )}

                {activeTab === 'ai_hub' && (
                    <React.Suspense fallback={<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>}>
                        <EduAiHub
                            currentUser={props.currentUser!}
                            currentInstitution={props.currentInstitution!}
                        />
                    </React.Suspense>
                )}
                {activeTab === 'community' && (
                    <CommunityManager 
                        currentInstitution={props.currentInstitution!}
                        users={props.users || []}
                    />
                )}
                {activeTab === 'alumni' && (
                    <AlumniManager
                        currentInstitution={props.currentInstitution!}
                        users={props.users || []}
                        allInstitutions={props.institutions || []}
                        onAccessAlumnaPortal={props.onAccessAlumnaPortal}
                        schoolRegistry={props.schoolRegistry}
                    />
                )}
                {activeTab === 'fuel_station' && (
                    <FuelStationDashboard 
                        institution={props.currentInstitution!}
                    />
                )}
                {activeTab === 'hospitality' && (
                    <HospitalityManager
                        currentInstitution={props.currentInstitution!}
                        users={props.users || []}
                    />
                )}

                {activeTab === 'auto_marketplace' && (
                    <AutomotiveManager
                        institution={props.currentInstitution!}
                        currentUser={props.currentUser!}
                        users={props.users || []}
                        companyDetails={companyDetails}
                        carListings={props.carListings || []}
                        carInvoices={props.carInvoices || []}
                        carPayments={props.carPayments || []}
                        carTestDrives={props.carTestDrives || []}
                        carBankTransactions={props.carBankTransactions || []}
                        onRefreshData={props.onRefreshData}
                        onAddListing={() => {
                            setSelectedListingForEdit(null);
                            setIsAddListingModalOpen(true);
                        }}
                        onEditListing={(listing) => {
                            setSelectedListingForEdit(listing);
                            setIsAddListingModalOpen(true);
                        }}
                        onDeleteListing={async (id) => {
                            if (confirm('Are you sure you want to delete this vehicle listing?')) {
                                await apiService.deleteModuleRecord('car_sales_listings', id);
                                if (props.onRefreshData) props.onRefreshData();
                            }
                        }}
                        onAddInvoice={() => {
                            setSelectedInvoiceForEdit(null);
                            setIsAddCarInvoiceModalOpen(true);
                        }}
                        onEditInvoice={(invoice) => {
                            setSelectedInvoiceForEdit(invoice);
                            setIsAddCarInvoiceModalOpen(true);
                        }}
                        onDeleteInvoice={props.onDeleteCarInvoice}
                        onAddPayment={(invoice) => {
                            setSelectedInvoiceForPayment(invoice || null);
                            setSelectedPaymentForEdit(null);
                            setIsAddCarPaymentModalOpen(true);
                        }}
                        onEditPayment={(payment) => {
                            setSelectedPaymentForEdit(payment);
                            const inv = props.carInvoices?.find(i => i.id === payment.invoiceId) || null;
                            setSelectedInvoiceForPayment(inv);
                            setIsAddCarPaymentModalOpen(true);
                        }}
                        onDeletePayment={props.onDeleteCarPayment}
                        onPrintInvoice={handlePreviewCarInvoice}
                        onPrintReceipt={(pay) => {
                            const inv = props.carInvoices?.find(i => i.id === pay.invoiceId);
                            if (inv) handlePreviewCarReceipt(pay, inv);
                        }}
                        onPrintAgreement={handlePreviewCarAgreement}
                        onReconcileBankTransaction={async (tid, invId) => {
                            if (props.onReconcileBankTransaction) {
                                await props.onReconcileBankTransaction(tid, invId);
                            }
                        }}
                        onFetchBankFeeds={async () => {
                            if (props.onFetchBankFeeds) {
                                await props.onFetchBankFeeds();
                            }
                        }}
                        onAddLead={() => setIsAddCarLeadModalOpen(true)}
                        onSwitchPerspective={() => {
                            const slug = props.currentInstitution?.slug || props.currentInstitution?.id;
                            window.open(`/?view=showroom&showroom=${slug}`, '_blank');
                        }}
                        smsConfig={props.smsConfig}
                        onSendSms={props.onSendSms}
                        onImportUsers={props.onImportUsers}
                        onImportStudents={props.onImportStudents}
                        onDeleteUser={props.onDeleteUser}
                        onEditUser={props.onEditUser}
                        departments={props.departments}
                        courses={props.courses}
                        subjects={props.subjects}
                        counties={props.counties}
                    />
                )}

                                        {activeTab === 'showcase' && props.currentInstitution && (
                                            <SchoolShowcaseManager
                                                school={props.currentInstitution}
                                                onUpdate={props.onRefreshData!}
                                            />
                                        )}

                {activeTab === 'ng_cdf' && (
                    <Suspense fallback={
                        <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 bg-white/50 dark:bg-slate-800/50 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-700 animate-pulse">
                            <ArrowPathIcon className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Loading NG-CDF Bursaries...</p>
                        </div>
                    }>
                        <div className="space-y-4">
                            <button
                                onClick={() => setActiveTab('dashboard')}
                                className="flex items-center gap-2 py-3 px-5 bg-indigo-50 dark:bg-indigo-950/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-xl text-[10px] font-black uppercase tracking-widest text-indigo-650 dark:text-indigo-400 transition-all w-fit shadow-sm active:scale-95"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back to Portal Hub
                            </button>
                            <CdfManager
                                currentUser={props.currentUser!}
                                currentInstitution={props.currentInstitution!}
                                users={props.users || []}
                                invoices={props.invoices || []}
                                receipts={props.receipts || []}
                                assessments={props.assessments || []}
                                assessmentMarks={props.assessmentMarks || []}
                                subjects={props.subjects || []}
                                onLogAction={props.onLogAction}
                                onRefreshData={props.onRefreshData}
                            />
                        </div>
                    </Suspense>
                )}

                {activeTab === 'reports' && !isCoop && (
                    <div className="animate-fade-in-up">
                        {isRetailAgency ? (
                            <RetailReportsDashboard
                                institutionId={props.currentInstitution?.id || ''}
                                users={props.users || []}
                            />
                        ) : (isDS || activeScope === 'ds') ? (
                            <DrivingSchoolProvider institutionId={props.currentInstitution?.id} currentUser={props.currentUser}>
                                <DSAnalyticsView 
                                    institution={props.currentInstitution!}
                                    letterheadConfig={props.letterheadConfig}
                                />
                            </DrivingSchoolProvider>
                        ) : (isBC || activeScope === 'bc') ? (
                            <BCReportsView 
                                currentUser={props.currentUser!}
                                currentInstitution={props.currentInstitution!}
                            />
                        ) : isAutoMarket ? (
                            ['director', 'finance', 'super_admin'].includes(roleToUse || '') || props.currentUser?.role === 'super_admin' || !!localStorage.getItem('eduai_super_admin_session') ? (
                                <CarShowroomReportsDashboard
                                    institutionId={props.currentInstitution?.id || ''}
                                    users={props.users || []}
                                    companyDetails={props.companyDetails}
                                />
                            ) : (
                                <div className="p-8 bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900 rounded-[2.5rem] text-rose-850 dark:text-rose-400 font-black text-xs uppercase tracking-widest text-center">
                                    ⛔ Access Denied: Only the Director and Finance Manager are authorized to view financial reports and analysis.
                                </div>
                            )
                        ) : (
                            <ReportsDashboard
                                activeScope={activeScope}
                                {...props}
                                currentUser={props.currentUser!}
                                activeSemester={props.activeSemester || null}
                                academicYears={props.academicYears || []}
                                courses={props.courses || []}
                                subjects={props.subjects || []}
                                rooms={props.rooms || []}
                                buildings={props.buildings || []}
                                letterheadConfig={props.letterheadConfig || { headerImageUrl: null, stampImageUrl: null, footerImageUrl: null, footerText: '', showStamp: false }}
                                departments={props.departments || []}
                                lecturers={props.users || []}
                                allTimetableEntries={props.allTimetableEntries || []}
                                getLecturerById={props.getLecturerById || ((id: string) => (props.users || []).find(u => u && u.id === id))}
                                getSubjectById={props.getSubjectById || ((id: string) => (props.subjects || []).find(s => s && s.id === id))}
                                getRoomById={props.getRoomById || ((id: string) => (props.rooms || []).find(r => r && r.id === id))}
                                currentInstitution={props.currentInstitution}
                                allocations={props.allocations || []}
                                requests={requests || []}
                                contracts={props.contracts || []}
                                timetableSettings={props.timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                                timetableConflicts={props.timetableConflicts || []}
                                activityLog={props.activityLog || []}
                                courseSizes={props.courseSizes || new Map()}
                                examTimetable={[]}
                                studentAttendances={studentAttendances}
                                studentCheckIns={studentCheckIns}
                                assessments={assessments}
                                assessmentMarks={assessmentMarks}
                                visitors={visitors}
                                activityLogLimit={props.activityLogLimit}
                                setActivityLogLimit={props.setActivityLogLimit}
                                onAddUser={props.onAddUser}
                                onEditUser={props.onEditUser}
                                onDeleteUser={props.onDeleteUser}
                                onImportUsers={props.onImportUsers}
                                onSendSms={props.onSendSms as any}
                                companyDetails={props.companyDetails}
                                onAddTransaction={props.onAddTransaction}
                                onRefreshData={props.onRefreshData}
                            />
                        )}
                    </div>
                )}
                    </>
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
                                {perspectiveOptions.map(opt => {
                                    if (!opt) return null;
                                    return (
                                        <button
                                            key={opt.role}
                                            onClick={() => {
                                                props.onSwitchPerspective?.(opt.role as Role);
                                                setIsPerspectiveModalOpen(false);
                                            }}
                                            className={`flex-none w-[200px] flex flex-col items-center justify-center gap-4 p-8 rounded-[3rem] border-2 border-transparent transition-all group hover:border-indigo-500 snap-center shadow-sm ${opt.color || ''}`}
                                        >
                                            <div className="p-4 bg-white dark:bg-slate-800 rounded-[1.5rem] shadow-sm transition-transform group-hover:scale-110">
                                                {opt.icon || null}
                                            </div>
                                            <span className="font-black text-[11px] uppercase tracking-widest text-center">{opt.label}</span>
                                        </button>
                                    );
                                })}
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
                    institution={editingInstitution as any}
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
            {isAddListingModalOpen && (
                <React.Suspense fallback={<div className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>}>
                    <AddCarListingModal
                        listing={selectedListingForEdit}
                        institution={props.currentInstitution!}
                        onClose={() => { setIsAddListingModalOpen(false); setSelectedListingForEdit(null); }}
                        onSave={async (data) => {
                            await apiService.saveModuleRecord('car_sales_listings', {
                                ...data,
                                institutionId: props.currentInstitution!.id,
                                id: data.id || `car_${Date.now()}`,
                                createdAt: new Date().toISOString()
                            });
                            setIsAddListingModalOpen(false);
                            setSelectedListingForEdit(null);
                            if (props.onRefreshData) props.onRefreshData();
                        }}
                    />
                </React.Suspense>
            )}

            {isAddCarInvoiceModalOpen && (
                <React.Suspense fallback={null}>
                    <CreateCarInvoiceModal 
                        isOpen={isAddCarInvoiceModalOpen}
                        onClose={() => {
                            setIsAddCarInvoiceModalOpen(false);
                            setSelectedInvoiceForEdit(null);
                        }}
                        onSave={async (data) => {
                            await props.onAddCarInvoice!(data);
                            setIsAddCarInvoiceModalOpen(false);
                            setSelectedInvoiceForEdit(null);
                        }}
                        listings={props.carListings || []}
                        currentUser={props.currentUser!}
                        invoice={selectedInvoiceForEdit}
                        users={props.users || []}
                    />
                </React.Suspense>
            )}

            {isAddCarPaymentModalOpen && (
                <React.Suspense fallback={null}>
                    <RecordCarPaymentModal 
                        isOpen={isAddCarPaymentModalOpen}
                        onClose={() => {
                            setIsAddCarPaymentModalOpen(false);
                            setSelectedInvoiceForPayment(null);
                            setSelectedPaymentForEdit(null);
                        }}
                        onSave={async (data) => {
                            await props.onAddCarPayment!(data);
                            setSelectedPaymentForEdit(null);
                        }}
                        invoice={selectedInvoiceForPayment}
                        invoices={props.carInvoices || []}
                        currentUser={props.currentUser!}
                        payment={selectedPaymentForEdit}
                    />
                </React.Suspense>
            )}

            {isAddCarLeadModalOpen && (
                <React.Suspense fallback={null}>
                    <AddCarLeadModal 
                        institution={props.currentInstitution!}
                        onClose={() => setIsAddCarLeadModalOpen(false)}
                        onSave={async (lead) => {
                            const userData: Partial<User> = {
                                name: lead.customerName,
                                phoneNumber: lead.customerPhone,
                                email: lead.customerEmail || '',
                                role: 'lead' as any,
                                institutionId: props.currentInstitution!.id,
                                metadata: {
                                    enquiredModels: lead.enquiredModels,
                                    source: lead.source,
                                    status: lead.status,
                                    notes: lead.notes,
                                    leadtype: 'walk-in'
                                }
                            };
                            if (props.onAddUser) {
                                await props.onAddUser(userData);
                            }
                            setIsAddCarLeadModalOpen(false);
                            if (props.onRefreshData) props.onRefreshData();
                        }}
                    />
                </React.Suspense>
            )}
            {isCarReceiptModalOpen && (
                <React.Suspense fallback={null}>
                    <CarReceiptModal 
                        isOpen={isCarReceiptModalOpen}
                        onClose={() => {
                            setIsCarReceiptModalOpen(false);
                            setSelectedInvoiceForReceipt(null);
                            setSelectedPaymentForReceipt(null);
                        }}
                        invoice={selectedInvoiceForReceipt}
                        payment={selectedPaymentForReceipt}
                        institution={props.currentInstitution!}
                    />
                </React.Suspense>
            )}
            {pdfPreviewData && (
                <PdfPreviewModal
                    url={pdfPreviewData.uri}
                    filename={pdfPreviewData.title}
                    onClose={() => setPdfPreviewData(null)}
                />
            )}
        </div>
    );
};

