import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { MarketingLandingPage } from './public/MarketingLandingPage';
import { CampaignCommandView } from './CampaignCommandView';
import { LoginView } from './LoginView';
import { Header } from './Header';
import { ChatBot } from './ChatBot';
import { MandatoryUpdateView } from './MandatoryUpdateView';
import { SuspendedAccountView } from './SuspendedAccountView';
import { TrialExpiredView } from './TrialExpiredView';
import { PublicAppointmentView } from './PublicAppointmentView';
import { PublicLessonConfirmationView } from './public/PublicLessonConfirmationView';
import { GuestFeedbackView } from './GuestFeedbackView';
import { ProfileModal } from './ProfileModal';
import { SecurityView, StoreView, InfoDeskView, SupplierView, TransportAssistantView } from './SupportStaffViews';
import { ModuleAccessGuard } from './ModuleAccessGuard';
import { RetailCustomerPortal } from './retail/RetailCustomerPortal';
import { PrivateDriverBillingPortal } from './PrivateDriverBillingPortal';
import { CarServiceView } from './carservice/CarServiceView';
import { HealthCoreView } from './his/HealthCoreView';
import { ModernPharmacyManager } from './his/ModernPharmacyManager';
import { sendEmailNotification, getInstitutionEmailConfig } from '../services/emailService';
import { ChurchDenominationProvider } from './church/ChurchDenominationProvider';
import { BookDemoModal } from './public/BookDemoModal';
import { AlumnaeRegistrationView } from './AlumnaeRegistrationView';
import { AlumnaeActivationView } from './AlumnaeActivationView';
import { AlumnaePortalView } from './AlumnaePortalView';
import { AlumnaeSecureAccountView } from './AlumnaeSecureAccountView';
import { AlumnaeLoginView } from './AlumnaeLoginView';
import { InstitutionClaimView } from './InstitutionClaimView';
import { ConstructionManager } from './ConstructionManager';
import { ConstructionProjectView } from './ConstructionProjectView';
const PrivacyPolicy = lazy(() => import('../pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('../pages/TermsOfService'));

// Lazy-loaded major portals
const AdminView = lazy(() => import('./AdminView').then(m => ({ default: m.AdminView })));
const SuperAdminView = lazy(() => import('./SuperAdminView').then(m => ({ default: m.SuperAdminView })));
const LecturerView = lazy(() => import('./LecturerView').then(m => ({ default: m.LecturerView })));
const StudentView = lazy(() => import('./StudentView').then(m => ({ default: m.StudentView })));
const TenantPortalView = lazy(() => import('./TenantPortalView').then(m => ({ default: m.TenantPortalView })));
const LandlordPortalView = lazy(() => import('./LandlordPortalView').then(m => ({ default: m.LandlordPortalView })));
const PropertyManagementView = lazy(() => import('./PropertyManagementView').then(m => ({ default: m.PropertyManagementView })));
const LibraryMasterView = lazy(() => import('./LibraryMasterView').then(m => ({ default: m.LibraryMasterView })));
const AcademicsOfficerView = lazy(() => import('./AcademicsOfficerView').then(m => ({ default: m.AcademicsOfficerView })));
const FinanceOfficerView = lazy(() => import('./Finance/FinanceOfficerView').then(m => ({ default: m.FinanceOfficerView })));
const HROfficerView = lazy(() => import('./HR/HROfficerView').then(m => ({ default: m.HROfficerView })));
const LibraryWarRoom = lazy(() => import('./Library/LibraryWarRoom').then(m => ({ default: m.LibraryWarRoom })));
const CountyAdminView = lazy(() => import('./CountyAdminView').then(m => ({ default: m.CountyAdminView })));
const ParentView = lazy(() => import('./ParentView').then(m => ({ default: m.ParentView })));
const PracticeTeacherView = lazy(() => import('./PracticeTeacherView').then(m => ({ default: m.PracticeTeacherView })));
const CarWashView = lazy(() => import('./CarWashView').then(m => ({ default: m.CarWashView })));
const CarWashCustomerPortal = lazy(() => import('./CarWashCustomerPortal').then(m => ({ default: m.CarWashCustomerPortal })));
const AgrovetView = lazy(() => import('./AgrovetView').then(m => ({ default: m.AgrovetView })));
const PropertyMarketplaceView = lazy(() => import('./PropertyMarketplaceView').then(m => ({ default: m.PropertyMarketplaceView })));
const ChurchDashboard = lazy(() => import('./church/ChurchDashboard').then(m => ({ default: m.ChurchDashboard })));
const FarmerPortal = lazy(() => import('./coop/FarmerPortal').then(m => ({ default: m.FarmerPortal })));
const RiderPortal = lazy(() => import('./coop/RiderPortal').then(m => ({ default: m.RiderPortal })));
const BoardingMasterView = lazy(() => import('./BoardingMasterView'));
const ResellerDashboard = lazy(() => import('./ResellerDashboard'));
const TenantStorefrontView = lazy(() => import('./retail/TenantStorefrontView').then(m => ({ default: m.TenantStorefrontView })));
const SchoolStorefrontView = lazy(() => import('./public/SchoolStorefrontView').then(m => ({ default: m.SchoolStorefrontView })));
const CommunityHubView = lazy(() => import('./public/CommunityHubView').then(m => ({ default: m.CommunityHubView })));
const TransportHubView = lazy(() => import('./public/TransportHubView').then(m => ({ default: m.TransportHubView })));
const HospitalityStorefront = lazy(() => import('./hospitality/HospitalityStorefront').then(m => ({ default: m.HospitalityStorefront })));
const HospitalityMarketplace = lazy(() => import('./hospitality/HospitalityMarketplace').then(m => ({ default: m.HospitalityMarketplace })));
const CampaignJoinPage = lazy(() => import('./public/CampaignJoinPage').then(m => ({ default: m.CampaignJoinPage })));
const FuelStationDashboard = lazy(() => import('./FuelStationDashboard').then(m => ({ default: m.FuelStationDashboard })));
const CivilWorksDashboard = lazy(() => import('./CivilWorksDashboard'));
const LogisticsDashboard = lazy(() => import('./LogisticsDashboard'));
const CampaignSocialPortal = lazy(() => import('./CampaignSocialPortal').then(m => ({ default: m.CampaignSocialPortal })));
const CampaignLoginView = lazy(() => import('./CampaignLoginView').then(m => ({ default: m.CampaignLoginView })));


import { apiService, initSupabaseClient } from '../services/apiService';
import { getAdminRoleForInstitution } from '../utils/roleUtils';
import { generateAlphanumericCode, slugify } from '../utils/stringUtils';
import { generateUserId, generateId } from '../utils/idGenerator';
import { generateFullSqlScript } from '../utils/sqlGenerator';
import { detectTimetableConflicts } from '../utils/conflictUtils';
import { generateInstitutionalDemoData } from '../utils/demoData';
import {
    INITIAL_USERS, INITIAL_INSTITUTIONS, INITIAL_COMPANY_DETAILS,
    INITIAL_ACADEMIC_LEVELS, INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS,
    INITIAL_ACADEMIC_YEARS, INITIAL_SEMESTERS, DEFAULT_GRADING_SYSTEMS
} from '../constants';
import type {
    User, Role, Institution, AllocationRequest, TimetableEntry,
    Priority, RequestStatus, CompanyDetails, Room, Subject, Course,
    Department, AcademicYear, Semester, UserTask, ActivityLog,
    MpesaTransaction, Receipt, Invoice, VoteHead, FeeStructure, FinancialPeriod,
    ProfileUpdateData, PasswordUpdateData, Appointment, GuestFeedback, Visitor, SecurityAlert, FeedbackSubmission, AcademicLevel, LetterheadConfig, Building, StudentAttendance, Assessment, AssessmentMark, TimeOffRequest, StudentAbsenceRequest, EnrollmentRequest, AbsenceRequest, LecturerContract, ExamTimetableEntry, TaAssignment, Assignment, Submission, LessonRating, Book, LibraryTransaction, Supplier, Internship, StudentAbsenceRequestStatus,
    ExtensionRequest, Requisition, TransactionStatus, InventoryItem, StockTransaction,
    AllocationRequestPreferences, InvoiceItem, InstitutionRegistrationData, CountyRegistrationData, Conflict, County, CountyInventoryItem, CountyInventoryCategory, CountyStore, BursaryApplication, CountyBursaryFund, LeaveOutRequest, ObservationNote,
    BulletinItem, DocumentCollection, WatchlistRecord, MaintenanceRequest, TeacherCheckIn,
    TransportVehicle, TransportOnboarding, VehicleLog, PMLandlord,
    RetailStore, RetailInventoryItem, RetailExpense, RetailStoreStock, RetailSerializedItem, RetailStockTransfer, RetailWishlist, RetailCommissionLedger, Vehicle, RepairOrder, CafeMenuItem, CafeOrder, AppNotification, RetailSale, RetailSaleItem, CarWashJob, CoopFarmer, CoopCollection, CoopRider, CoopAgrovetInventory, CoopAgrovetSales, SaccoAccount, SaccoTransaction, CoopMonthlyPayout, CoopExpense, CoopIncome,
    ChurchSacrament, ChurchMassIntention, ChurchCellGroup, ChurchFollowUp, ChurchFastingPeriod, ChurchSaintDay, DemoRequest,
    InstitutionModuleState,
    LawClient, LawMatter, LawDocument, LawTimeEntry, LawInvoice, LawTrustTransaction, LawAgreementTemplate, LawAgreement,
    DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings, DSInvoice, DSPayment,
    CarListing, TestDriveBooking, CarAppraisal, CarInvoice, CarPayment, SchoolRegistry, BankTransaction,
    DisciplineIncident, Expense, FinancialGoal, PayrollRecord, CampaignProfile,
    AcademicsOfficerProps, LecturerProps, ParentProps,
    CountyAdminProps, HROfficerProps, FinanceOfficerProps, SupportStaffProps
} from '../types';
import { XIcon } from './icons/XIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { SimulatorLeadModal } from './public/SimulatorLeadModal';
import { SystemPulseLoader } from './common/SystemPulseLoader';
import { PerspectiveReturnButton } from './common/PerspectiveReturnButton';
import { SchemaInitializationView } from './common/SchemaInitializationView';
import { AppErrorBoundary } from './common/AppErrorBoundary';
import { ToastProvider, useToast } from '../services/ToastContext';
import { DrivingSchoolProvider } from '../services/DrivingSchoolContext';



const SIMULATOR_NAMES: Record<string, string> = {
    'property': 'Property Management',
    'coop': 'Cooperative Management',
    'his': 'Health Information System',
    'pharmacy': 'Pharmacy Management',
    'retail': 'Retail POS & Inventory',
    'fuel': 'Fuel Station Management',
    'campaign': 'Political Campaign Command',
    'legal': 'Law Firm Management',
    'ds': 'Driving School Management',
    'civil': 'Construction & Civil Works',
    'logistics': 'Logistics & Fleet Management',
    'autoservice': 'Car Wash & Auto Service',
    'edu': 'Academic Management',
    'showroom': 'Car Showroom',
    'tourism': 'Tourism & Hospitality Hub',
    'community': 'Community & Social Hub'
};



export const App: React.FC = () => {
    const { success, error: toastError, info, warning } = useToast();
    // Security: Disable right-click to prevent source inspection
    useEffect(() => {
        const handleContextMenu = (e: MouseEvent) => e.preventDefault();
        document.addEventListener('contextmenu', handleContextMenu);
        return () => document.removeEventListener('contextmenu', handleContextMenu);
    }, []);
    
    const onLoginAsAdminRef = useRef<any>(null);

    const [currentUser, setCurrentUser] = useState<User | null>(() => {
        try {
            return apiService.getSession();
        } catch (e) {
            console.warn("Session retrieval failed:", e);
            return null;
        }
    });


    const [impersonatedRole, setImpersonatedRole] = useState<Role | null>(null);
    const [schoolRegistry, setSchoolRegistry] = useState<SchoolRegistry[]>([]);
    const [selectedRegistrySchool, setSelectedRegistrySchool] = useState<SchoolRegistry | null>(null);
    const [selectedRole, setSelectedRole] = useState<Role | null>(null);
    const [originalSuperAdminSession, setOriginalSuperAdminSession] = useState<User | null>(() => {
        try {
            const stored = localStorage.getItem('eduai_super_admin_session');
            return stored ? JSON.parse(stored) : null;
        } catch (e) { return null; }
    });
    const [users, setUsers] = useState<User[]>([]);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [isHealthSystemOpen, setIsHealthSystemOpen] = useState(false);
    const [isPharmacySystemOpen, setIsPharmacySystemOpen] = useState(false);
    const [counties, setCounties] = useState<County[]>([]);
    const [companyDetails, setCompanyDetails] = useState<CompanyDetails>(INITIAL_COMPANY_DETAILS);
    const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
    const [departments, setDepartments] = useState<Department[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [requests, setRequests] = useState<AllocationRequest[]>([]);
    const [generatedTimetable, setGeneratedTimetable] = useState<TimetableEntry[]>([]);
    const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
    const [semesters, setSemesters] = useState<Semester[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [academicLevels, setAcademicLevels] = useState<AcademicLevel[]>([]);
    const [userTasks, setUserTasks] = useState<UserTask[]>([]);
    const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
    const [receipts, setReceipts] = useState<Receipt[]>([]);
    const [isApiOnline, setIsApiOnline] = useState(false);
    const [isSchemaInitializationRequired, setIsSchemaInitializationRequired] = useState(false);
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const isRefreshingRef = React.useRef(false);
    const lastRefreshTimeRef = React.useRef(0);
    const [appInitializing, setAppInitializing] = useState(true);
    const [loadStatus, setLoadStatus] = useState<string>("");
    const [loadError, setLoadError] = useState<string>("");
    const [isTransitioning, setIsTransitioning] = useState(false);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([]);
    const [voteHeads, setVoteHeads] = useState<VoteHead[]>([]);
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([]);
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([]);
    const [requisitions, setRequisitions] = useState<Requisition[]>([]);
    const [retailExpenses, setRetailExpenses] = useState<RetailExpense[]>([]);
    const [retailStores, setRetailStores] = useState<RetailStore[]>([]);
    const [retailInventory, setRetailInventory] = useState<RetailInventoryItem[]>([]);
    const [examTimetable, setExamTimetable] = useState<ExamTimetableEntry[]>([]);
    const [feedbackSubmissions, setFeedbackSubmissions] = useState<FeedbackSubmission[]>([]);
    const [timeOffRequests, setTimeOffRequests] = useState<TimeOffRequest[]>([]);
    const [studentAbsenceRequests, setStudentAbsenceRequests] = useState<StudentAbsenceRequest[]>([]);
    const [enrollmentRequests, setEnrollmentRequests] = useState<EnrollmentRequest[]>([]);
    const [absenceRequests, setAbsenceRequests] = useState<AbsenceRequest[]>([]);
    const [contracts, setContracts] = useState<LecturerContract[]>([]);
    const [studentAttendances, setStudentAttendances] = useState<StudentAttendance[]>([]);
    const [cafeOrders, setCafeOrders] = useState<CafeOrder[]>([]);
    const [retailSales, setRetailSales] = useState<RetailSale[]>([]);
    const [cafeMenuItems, setCafeMenuItems] = useState<CafeMenuItem[]>([]);
    const [studentCheckIns, setStudentCheckIns] = useState<Record<string, string>>({});
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [vehicles, setVehicles] = useState<TransportVehicle[]>([]);
    const [countyInventory, setCountyInventory] = useState<CountyInventoryItem[]>([]);
    const [countyInventoryCategories, setCountyInventoryCategories] = useState<CountyInventoryCategory[]>([]);
    const [countyStores, setCountyStores] = useState<CountyStore[]>([]);
    const [assignments, setAssignments] = useState<Assignment[]>([]);
    const [submissions, setSubmissions] = useState<Submission[]>([]);
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [assessmentMarks, setAssessmentMarks] = useState<AssessmentMark[]>([]);
    const [taAssignments, setTaAssignments] = useState<TaAssignment[]>([]);
    const [lessonRatings, setLessonRatings] = useState<LessonRating[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [financialGoals, setFinancialGoals] = useState<FinancialGoal[]>([]);
    const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>([]);
    const [incidents, setIncidents] = useState<DisciplineIncident[]>([]);

    // Support Staff Specific State
    const [books, setBooks] = useState<Book[]>([]);
    const [libraryTransactions, setLibraryTransactions] = useState<LibraryTransaction[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stockTransactions, setStockTransactions] = useState<StockTransaction[]>([]);
    const [bursaryApplications, setBursaryApplications] = useState<BursaryApplication[]>([]);
    const [bursaryFunds, setBursaryFunds] = useState<CountyBursaryFund[]>([]);

    const [leaveOutRequests, setLeaveOutRequests] = useState<LeaveOutRequest[]>([]);
    const [bulletinItems, setBulletinItems] = useState<BulletinItem[]>([]);
    const [documentCollections, setDocumentCollections] = useState<DocumentCollection[]>([]);
    const [watchlist, setWatchlist] = useState<WatchlistRecord[]>([]);
    const [maintenanceRequests, setMaintenanceRequests] = useState<MaintenanceRequest[]>([]);
    const [teacherCheckIns, setTeacherCheckIns] = useState<TeacherCheckIn[]>([]);
    const [observationNotes, setObservationNotes] = useState<ObservationNote[]>([]);
    const [transportOnboarding, setTransportOnboarding] = useState<TransportOnboarding[]>([]);
    const [vehicleLogs, setVehicleLogs] = useState<VehicleLog[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [institutionModuleStates, setInstitutionModuleStates] = useState<InstitutionModuleState[]>([]);
    const [jobs, setJobs] = useState<CarWashJob[]>([]);
    const [activityLogLimit, setActivityLogLimit] = useState(50);
    const [transactionLimit, setTransactionLimit] = useState(50);
    const [receiptLimit, setReceiptLimit] = useState(50);
    const [notificationLimit, setNotificationLimit] = useState(20);

    // Agricultural & Cooperative State
    const [coopFarmers, setCoopFarmers] = useState<CoopFarmer[]>([]);
    const [coopCollections, setCoopCollections] = useState<CoopCollection[]>([]);
    const [coopRiders, setCoopRiders] = useState<CoopRider[]>([]);
    const [coopAgrovetInventory, setCoopAgrovetInventory] = useState<CoopAgrovetInventory[]>([]);
    const [coopAgrovetSales, setCoopAgrovetSales] = useState<CoopAgrovetSales[]>([]);
    const [saccoAccounts, setSaccoAccounts] = useState<SaccoAccount[]>([]);
    const [saccoTransactions, setSaccoTransactions] = useState<SaccoTransaction[]>([]);
    const [coopPayouts, setCoopPayouts] = useState<CoopMonthlyPayout[]>([]);
    const [coopExpenses, setCoopExpenses] = useState<CoopExpense[]>([]);
    const [coopIncome, setCoopIncome] = useState<CoopIncome[]>([]);
    const [demoRequests, setDemoRequests] = useState<DemoRequest[]>([]);

    // Legal & Law Firm State
    const [lawClients, setLawClients] = useState<LawClient[]>([]);
    const [lawMatters, setLawMatters] = useState<LawMatter[]>([]);
    const [lawDocuments, setLawDocuments] = useState<LawDocument[]>([]);
    const [lawTimeEntries, setLawTimeEntries] = useState<LawTimeEntry[]>([]);
    const [lawInvoices, setLawInvoices] = useState<LawInvoice[]>([]);
    const [lawTrustTransactions, setLawTrustTransactions] = useState<LawTrustTransaction[]>([]);
    const [lawAgreementTemplates, setLawAgreementTemplates] = useState<LawAgreementTemplate[]>([]);
    const [lawAgreements, setLawAgreements] = useState<LawAgreement[]>([]);




    // Car Sales State
    const [carListings, setCarListings] = useState<CarListing[]>([]);
    const [carTestDrives, setCarTestDrives] = useState<TestDriveBooking[]>([]);
    const [carAppraisals, setCarAppraisals] = useState<CarAppraisal[]>([]);
    const [carInvoices, setCarInvoices] = useState<CarInvoice[]>([]);
    const [carPayments, setCarPayments] = useState<CarPayment[]>([]);
    const [carBankTransactions, setCarBankTransactions] = useState<BankTransaction[]>([]);

    const [showCarSales, setShowCarSales] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') === 'cars' || params.get('view') === 'auto';
        } catch (e) {
            return false;
        }
    });


    const [isSimulatorMode, setIsSimulatorMode] = useState(false);
    const [isGeneratingDemoData, setIsGeneratingDemoData] = useState(false);
    const [demoDataGenerationProgress, setDemoDataGenerationProgress] = useState(0);
    const [demoDataGenerationMessage, setDemoDataGenerationMessage] = useState("");

    const [isSavingModule, setIsSavingModule] = useState(false);
    const [showGuestPortal, setShowGuestPortal] = useState(false);
    const [showGuestFeedback, setShowGuestFeedback] = useState(false);
    const [showMarketplace, setShowMarketplace] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            return view === 'marketplace' || view === 'auto_market' || view === 'showroom' || window.location.hostname === 'marketplace.eduai.co.ke' || window.location.hostname.includes('marketplace');
        } catch (e) {
            return false;
        }
    });

    const [showCommunityHub, setShowCommunityHub] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') === 'community' || window.location.hostname === 'community.eduai.co.ke' || window.location.hostname.includes('hub');
        } catch (e) {
            return false;
        }
    });
    const [showTransportHub, setShowTransportHub] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') === 'transport' || window.location.hostname === 'transport.eduai.co.ke' || window.location.hostname.includes('shuttle');
        } catch (e) {
            return false;
        }
    });

    const [showDrivingSchoolPortal, setShowDrivingSchoolPortal] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            const hostname = window.location.hostname;
            return view === 'ds' || view === 'driving' || hostname === 'drivingschool.eduai.co.ke' || hostname.includes('drivingschool');
        } catch (e) {
            return false;
        }
    });

    const [activeStoreTenantId, setActiveStoreTenantId] = useState<string | null>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const shop = params.get('shop') || params.get('showroom') || params.get('id');
            if (shop) return shop;

            // Subdomain discovery: e.g. agrovent.eduai.co.ke
            const host = window.location.hostname.toLowerCase();
            const parts = host.split('.');
            // Check for valid tenant subdomain (e.g. tenant.domain.com or tenant.eduai.co.ke)
            if (parts.length >= 2) {
                const sub = parts[0];
                const reserved = ['www', 'app', 'marketplace', 'showcase', 'marketing', 'api', 'localhost', '127', 'alumni', 'alumnae', 'almamater', 'portal', 'drivingschool', 'driving', 'transport', 'shuttle', 'community', 'social', 'showroom', 'carshowroom'];
                const isReserved = reserved.includes(sub) || sub.includes('portal') || sub.includes('admin') || sub.includes('alma') || sub.includes('driving') || sub.includes('shuttle') || sub.includes('showroom');
                
                if (!isReserved) {
                    return sub; // Return as slug
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    });
    const [showTenantStore, setShowTenantStore] = useState(!!activeStoreTenantId);
    const [loginInitialView, setLoginInitialView] = useState<'login' | 'register' | 'reset_password'>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('resetToken')) return 'reset_password';
            
            const hostname = window.location.hostname;
            const isSpecializedSubdomain = hostname.includes('drivingschool') || hostname.includes('transport') || hostname.includes('shuttle') || hostname.includes('community') || hostname.includes('showroom');
            if (isSpecializedSubdomain && !currentUser) return 'register';
            
            return 'login';
        } catch (e) {
            return 'login';
        }
    });
    const [registrationModuleId, setRegistrationModuleId] = useState<string | null>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const mod = params.get('module');
            if (mod) return mod;
            const hostname = window.location.hostname;
            if (hostname === 'drivingschool.eduai.co.ke' || hostname.includes('drivingschool')) return 'ds';
            if (hostname === 'transport.eduai.co.ke' || hostname.includes('shuttle')) return 'logistics';
            if (hostname.includes('community')) return 'community';
            if (hostname.includes('showroom')) return 'showroom';
            return null;
        } catch (e) { return null; }
    });

    const [targetManageLessonId, setTargetManageLessonId] = useState<string | null>(() => {
        try {
            const path = window.location.pathname;
            const match = path.match(/^\/ds\/lesson\/([^\/]+)\/manage\/?$/);
            if (match && match[1]) return match[1];
            return null;
        } catch (e) { return null; }
    });

    const [showMarketing, setShowMarketing] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const hostname = window.location.hostname;
            // Show if URL param set, or hostname is showcase/marketing, or no user and not marketplace/guest portals/tenant stores
            const isMarketingSubdomain = hostname === 'showcase.eduai.co.ke' || hostname.includes('showcase') || hostname.includes('marketing');
            
            // Subdomain detection for Alumnae Portal
            const isAlumnaeSubdomain = hostname.startsWith('alumnae.') || hostname.startsWith('alumni.') || hostname.startsWith('network.') || hostname.startsWith('circle.') || hostname.includes('almamater') || hostname.includes('alma_mater');
            
            const isLessonManageLink = !!window.location.pathname.match(/^\/ds\/lesson\/([^\/]+)\/manage\/?$/);

            if (isMarketingSubdomain || params.get('view') === 'showcase') return true;
            if (isAlumnaeSubdomain || isLessonManageLink) return false; // Don't show marketing if on alumnae subdomain or lesson link
            
            const isAlumnaeDeepLink = params.get('school') || params.get('alumnae') || params.get('view') === 'alumnae_register' || params.get('view') === 'alumnae_social' || params.get('view') === 'alumnae_portal';
            const isPasswordReset = !!params.get('resetToken');
            
            return !currentUser && !showMarketplace && !showCommunityHub && !showGuestPortal && !showGuestFeedback && !showTenantStore && !showDrivingSchoolPortal && !isAlumnaeDeepLink && !isPasswordReset && !isLessonManageLink;
        } catch (e) {
            return !currentUser && !window.location.search.includes('resetToken');
        }
    });

    const [showAlumnaeRegister, setShowAlumnaeRegister] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            return view === 'alumnae_register';
        } catch (e) { return false; }
    });

    const [showAlumnaeLogin, setShowAlumnaeLogin] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            const hostname = window.location.hostname;
            const isAlumnaeSubdomain = hostname.startsWith('alumnae.') || hostname.startsWith('alumni.') || hostname.startsWith('network.') || hostname.startsWith('circle.') || hostname.includes('almamater') || hostname.includes('alma_mater');
            const hasSession = !!localStorage.getItem('eduai_alumna_session');
            
            // If they have a session, this will be handled by showAlumnaePortal or useEffect
            return (view === 'alumnae_social' || view === 'alumnae_portal' || isAlumnaeSubdomain) && !hasSession;
        } catch (e) { return false; }
    });

    const [showInstitutionClaim, setShowInstitutionClaim] = useState(false);

    const isAlumnaeMode = useMemo(() => {
        const hostname = window.location.hostname;
        const params = new URLSearchParams(window.location.search);
        const view = params.get('view');
        return hostname.startsWith('alumnae.') || hostname.startsWith('alumni.') || hostname.startsWith('network.') || hostname.startsWith('circle.') || hostname.includes('almamater') || hostname.includes('alma_mater') || view?.startsWith('alumnae_');
    }, []);

    const [showAlumnaeActivation, setShowAlumnaeActivation] = useState(false);

    // Getters and Derived State moved higher to avoid TDZ
    const getLecturerById = useCallback((id: string) => (Array.isArray(users) ? users : []).find(u => u && u.id === id), [users]);
    const getSubjectById = useCallback((id: string) => (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === id), [subjects]);
    const getRoomById = useCallback((id: string) => (Array.isArray(rooms) ? rooms : []).find(r => r && r.id === id), [rooms]);
    const getCountyById = useCallback((id: string) => (Array.isArray(counties) ? counties : []).find(c => c && c.id === id), [counties]);
    const getInstitutionById = useCallback((id: string) => (Array.isArray(institutions) ? institutions : []).find(i => i && i.id === id), [institutions]);

    const activeInstitution = useMemo(() => {
        if (!currentUser || !Array.isArray(institutions)) return null;

        // Support showroom/school context for SuperAdmins via URL param
        const targetId = activeStoreTenantId || (currentUser.role === 'super_admin' ? null : currentUser.institutionId);
        if (targetId) {
            const found = institutions.find(i => i && (i.id === targetId || i.slug === targetId));
            if (found) return found;

            // Fallback to registry if not onboarded
            const registryEntry = schoolRegistry.find(s => s.id === targetId || s.institutionId === targetId || s.slug === targetId);
            if (registryEntry) {
                return {
                    id: targetId,
                    name: registryEntry.name,
                    email: '',
                    phoneNumber: '',
                    institutionType: (registryEntry.institutionType || 'Education') as any,
                    status: 'active',
                } as any;
            }
        }

        const found = institutions.find(i => i && i.id === currentUser.institutionId);
        if (found) return found;

        return null;
    }, [currentUser, institutions, schoolRegistry, activeStoreTenantId]);

    const activeRole = useMemo<Role | null>(() => {
        if (impersonatedRole) return impersonatedRole;
        if (!currentUser) return null;

        const roleToUse = selectedRole || currentUser.role;

        // Redirect school administrators to the County Portal if their school is registered to a county
        const inst = institutions.find(i => (i as any).id === currentUser.institutionId);
        if (inst?.countyId && (roleToUse === 'admin' || roleToUse === 'head_teacher')) {
            return 'county_admin';
        }

        // Force Reseller role for admins of Reseller institutions
        if (inst?.institutionType === 'Reseller' && roleToUse === 'admin') {
            return 'reseller';
        }

        return roleToUse;
    }, [impersonatedRole, currentUser, institutions, selectedRole]);

    const isAdminCatchAll = ['super_admin', 'admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'agrovet_admin', 'property_admin', 'his_admin', 'carwash_admin', 'transport_admin', 'reseller', 'fuel_admin', 'legal_admin', 'cooperative_manager', 'coop_chairman', 'sacco_officer', 'coop_admin', 'pharmacy_admin', 'driving_instructor', 'staff', 'security', 'driver'].includes(activeRole || '');

    const isFullWidthLayout = useMemo(() => {
        return activeRole === 'super_admin' || activeRole === 'county_admin' || isAdminCatchAll;
    }, [activeRole, isAdminCatchAll]);

    const activeCounty = useMemo(() => {
        if (!currentUser || !Array.isArray(counties)) return null;

        // Match by current user's institutionId (if it's a county ID)
        const directMatch = getCountyById(currentUser.institutionId);
        if (directMatch) return directMatch;

        // Alternative check: find user's institution and check its countyId
        const myInst = getInstitutionById(currentUser.institutionId);
        if (myInst?.countyId) {
            return getCountyById(myInst.countyId) || null;
        }

        return null;
    }, [counties, currentUser, getCountyById, getInstitutionById]);

    const activeBranding = useMemo(() => {
        if (isAlumnaeMode) {
            return {
                primaryColor: '#6366f1', // Indigo
                secondaryColor: '#0f172a',
                logoUrl: '/alumnae_logo_3d.png',
                motto: 'Connecting Excellence Across Generations',
                website: 'https://network.eduai.co.ke',
                displayName: 'EduAI Network'
            };
        }

        if (showDrivingSchoolPortal) {
            return {
                primaryColor: '#0ea5e9', // Sky blue
                secondaryColor: '#0f172a',
                logoUrl: '/driving_school_logo_3d.png',
                motto: 'Safety First, Success Always',
                website: 'https://drivingschool.eduai.co.ke',
                displayName: 'Driving School Portal'
            };
        }

        const isCountyContext = activeRole === 'county_admin' || activeRole?.startsWith('county_');

        if (isCountyContext && activeCounty) {
            return {
                primaryColor: activeCounty.primaryColor || '#4f46e5',
                secondaryColor: activeCounty.secondaryColor || '#0f172a',
                logoUrl: activeCounty.logoUrl || companyDetails.logoUrl,
                motto: activeCounty.motto,
                website: activeCounty.website,
                displayName: activeCounty.name
            };
        }

        return {
            primaryColor: activeInstitution?.themeColor || companyDetails.themeColor || '#4f46e5',
            secondaryColor: '#0f172a',
            logoUrl: activeInstitution?.logoUrl || companyDetails.logoUrl,
            motto: null,
            website: null,
            displayName: activeInstitution?.name
        };
    }, [activeRole, activeCounty, activeInstitution, companyDetails, isAlumnaeMode, showDrivingSchoolPortal]);

    // Dynamic Browser Title Management
    useEffect(() => {
        const baseTitle = activeBranding.displayName || companyDetails.applicationTitle || "EduAlloc AI";
        let suffix = "";
        
        if (activeRole) {
            const roleNames: Record<string, string> = {
                'super_admin': 'Super Admin',
                'county_admin': 'County Portal',
                'admin': 'Admin Portal',
                'head_teacher': 'Principal Portal',
                'lecturer': 'Lecturer Portal',
                'student': 'Student Portal',
                'parent': 'Parent Portal',
                'finance_officer': 'Finance Office',
                'hr_officer': 'HR Office',
                'academics_officer': 'Academic Office',
                'reseller': 'Reseller Portal',
                'agrovet_admin': 'Agrovet Manager',
                'property_admin': 'Property Manager',
                'his_admin': 'HIS Portal',
                'carwash_admin': 'Car Wash Manager',
                'fuel_admin': 'Fuel Station Manager',
                'legal_admin': 'Legal Hub',
                'cooperative_manager': 'Coop Manager',
                'tenant': 'Tenant Portal',
                'landlord': 'Landlord Portal'
            };
            suffix = roleNames[activeRole] || activeRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        if (isHealthSystemOpen) suffix = "HealthCore HIS";
        if (isPharmacySystemOpen) suffix = "Pharmacy Hub";
        if (isAlumnaeMode) suffix = "Alumnae Network";
        if (showMarketing) suffix = "Intelligent ERP";
        if (showMarketplace) suffix = "Solution Marketplace";
        if (showCommunityHub) suffix = "Community Hub";
        if (showTransportHub || window.location.hostname.includes('transport') || window.location.hostname.includes('shuttle')) suffix = "Logistics Hub";
        if (showDrivingSchoolPortal || window.location.hostname.includes('driving')) suffix = "Driving School";
        if (window.location.hostname.includes('showroom')) suffix = "Car Showroom";

        document.title = suffix ? `${suffix} | ${baseTitle}` : baseTitle;
    }, [activeRole, activeBranding.displayName, companyDetails.applicationTitle, isHealthSystemOpen, isPharmacySystemOpen, isAlumnaeMode, showMarketing, showMarketplace, showCommunityHub, showTransportHub, showDrivingSchoolPortal]);


    const activeAcademicYear = useMemo(() =>
        (Array.isArray(academicYears) ? academicYears : []).find(y => y && y.status === 'active') || null
        , [academicYears]);

    const activeSemester = useMemo(() =>
        (Array.isArray(semesters) ? semesters : []).find(s => s && s.status === 'active') || null
        , [semesters]);

    const timetableSettings = useMemo(() => activeInstitution?.timetableSettings || INITIAL_TIMETABLE_SETTINGS, [activeInstitution]);

    const allocations = useMemo(() => (Array.isArray(requests) ? requests : []).filter(r => r && (r.status === 'approved' || r.status === 'hod_approved' || r.status === 'change_request_pending' || r.status === 'deallocation_pending')), [requests]);

    const timetableConflicts = useMemo(() => detectTimetableConflicts(generatedTimetable, rooms, courses, subjects, timetableSettings), [generatedTimetable, rooms, courses, subjects, timetableSettings]);

    const courseSizes = useMemo(() => {
        const sizes = new Map<string, number>();
        (courses || []).forEach(course => {
            (course.levels || []).forEach(level => {
                const count = (users || []).filter(u => u && u.role === 'student' && u.courseId === course.id && u.courseLevelId === level.id).length;
                sizes.set(level.id, count);
            });
        });
        return sizes;
    }, [courses, users]);

    const activeLetterheadConfig = useMemo(() => activeInstitution?.letterheadConfig || companyDetails.letterheadConfig, [activeInstitution, companyDetails]);
    const activeFooterImageUrl = useMemo(() => activeInstitution?.footerImageUrl || companyDetails.footerImageUrl || null, [activeInstitution, companyDetails]);

    const loadData = useCallback(async (isFirstLoad = false, force = false, instOverrideId?: string) => {
        // Prevent concurrent refreshes
        if (isRefreshingRef.current) return;
        
        // Prevent too frequent refreshes (debounce to 2 seconds) unless forced
        const now = Date.now();
        if (!isFirstLoad && !force && (now - lastRefreshTimeRef.current < 2000)) return;

        isRefreshingRef.current = true;
        lastRefreshTimeRef.current = now;

        if (isFirstLoad) setAppInitializing(true);
        setLoadStatus("Initializing...");

        try {
            if (!apiService.isConfigured()) initSupabaseClient();
            setIsBootstrapped(true);

            // ── PHASE 1: Health check + identity (blocks UI) ──────────────────
            setLoadStatus("Connecting...");
            const health = await apiService.testDatabaseConnection();
            if (health.status === 'setup_required') {
                setIsSchemaInitializationRequired(true);
                setIsApiOnline(true);
                setAppInitializing(false);
                return;
            }

            setIsApiOnline(health.status !== 'offline');
            setIsSchemaInitializationRequired(false);

            setLoadStatus("Synchronizing Identity...");
            
            // Critical identity fetch - needed for Phase 2 logic
            const [insts, cnts, sett, u, reg, imsPhase1] = await Promise.all([
                apiService.fetchInstitutions().catch(() => []),
                (isAlumnaeMode && !currentUser) ? Promise.resolve([]) : apiService.fetchModuleRecords<County>('counties').catch(() => []),
                apiService.fetchCompanySettings().catch(() => null),
                (isAlumnaeMode && !currentUser) ? Promise.resolve([]) : apiService.fetchUsers(currentUser?.role === 'super_admin' ? undefined : currentUser?.institutionId).catch(() => []),
                (isAlumnaeMode && !showAlumnaeRegister && !showInstitutionClaim) ? Promise.resolve([]) : apiService.fetchFullRegistry().catch(() => []),
                apiService.fetchModuleRecords<InstitutionModuleState>('institution_module_states').catch(() => []),
            ]);

            // Sync identity state immediately so we can use activeInstitution in Phase 2
            setUsers(u || []);
            setInstitutions(insts || []);
            if (cnts) setCounties(cnts);
            if (reg) setSchoolRegistry(reg);
            if (sett) setCompanyDetails(sett);
            if (imsPhase1) setInstitutionModuleStates(imsPhase1);

            const activeInst = insts?.find(i => i.id === currentUser?.institutionId);
            const activeInstWithModules = activeInst ? {
                ...activeInst,
                moduleStates: (imsPhase1 || []).filter((m: any) => m.institutionId === activeInst.id)
            } : null;
            const instType = activeInst?.institutionType || 'General';
            const instId = instOverrideId || (currentUser && (currentUser.role === 'super_admin' || currentUser.role.startsWith('county_')) ? undefined : currentUser?.institutionId);
            const cntId = currentUser && currentUser.role.startsWith('county_') ? currentUser.countyId : undefined;
            const effectiveInstId = instOverrideId || (currentUser?.role === 'super_admin' ? undefined : (activeInst?.id || currentUser?.institutionId || instId || ''));
            const isSuper = currentUser?.role === 'super_admin';

            // Sector Detection
            const isAcademic = isSuper || ['Education', 'Primary', 'Secondary', 'College', 'University', 'Institute', 'TVET', 'Polytechnic'].includes(instType);
            const isHealth = isSuper || ['HIS', 'Pharmacy'].includes(instType);
            const isLaw = isSuper || instType === 'Law Firm';
            const isCoop = isSuper || ['Cooperative', 'SACCO'].includes(instType);
            const isBusiness = isSuper || ['Business', 'Business Ecosystem', 'Retail', 'Agrovet', 'Car Wash', 'Automotive Marketplace', 'Hardware', 'Pharmacy'].includes(instType);
            const isLogistics = isSuper || ['Logistics', 'Transport'].includes(instType);
            const isHospitality = isSuper || instType === 'Hospitality';
            const isDrivingSchool = isSuper || instType === 'Driving School' || activeInstWithModules?.moduleStates?.some(m => m.moduleId === 'driving_school' && (m.status === 'active' || m.status === 'trial'));
            const isPolitical = isSuper || instType === 'Political Campaign';
            const isCommunity = isSuper || instType === 'Community';
            const isCounty = isSuper || (currentUser?.role || '').startsWith('county_');

            setLoadStatus("Building Workspace...");


            // Also fire core module data in parallel with identity (don't await these yet)
            let d: any[] = [], s: any[] = [], c: any[] = [], a: any[] = [], ay: any[] = [], sem: any[] = [], r: any[] = [], b: any[] = [], al: any[] = [], tasks: any[] = [], txns: any[] = [], recs: any[] = [], logs: any[] = [], notifs: any[] = [];

            let coreModulePromise: Promise<any[]> = Promise.resolve([]);
            if (currentUser) {
                coreModulePromise = Promise.all([
                    (isAcademic || isSuper) ? apiService.fetchDepartments(instId).catch(() => []) : Promise.resolve([]),
                    (isAcademic || isSuper) ? apiService.fetchSubjects(instId).catch(() => []) : Promise.resolve([]),
                    (isAcademic || isSuper) ? apiService.fetchCourses(instId).catch(() => []) : Promise.resolve([]),
                    (isAcademic || isSuper) ? apiService.fetchAllocations(instId).catch(() => []) : Promise.resolve([]),
                    (isAcademic || isSuper) ? apiService.fetchAcademicYears(instId).catch(() => []) : Promise.resolve([]),
                    (isAcademic || isSuper) ? apiService.fetchSemesters(instId).catch(() => []) : Promise.resolve([]),
                    (isAcademic || isSuper) ? apiService.fetchRooms(instId).catch(() => []) : Promise.resolve([]),
                    (isAcademic || isSuper) ? apiService.fetchModuleRecords<Building>('buildings', instId).catch(() => []) : Promise.resolve([]),
                    (isAcademic || isSuper) ? apiService.fetchAcademicLevels(instId).catch(() => []) : Promise.resolve([]),
                    apiService.fetchModuleRecords<UserTask>('tasks', instId).catch(() => []),
                    apiService.fetchTransactions(instId, { limit: transactionLimit }).catch(() => []),
                    apiService.fetchModuleRecords<Receipt>('receipts', instId, undefined, { limit: receiptLimit }).catch(() => []),
                    apiService.fetchModuleRecords<ActivityLog>('activity_log', instId, undefined, { limit: activityLogLimit }).catch(() => []),
                    apiService.fetchNotifications(currentUser.id, { limit: notificationLimit }).catch(() => []),
                ]);
            }

            // ── Commit Phase 1 data → unlock UI immediately ──────────────────
            if (insts && insts.length > 0) {
                setInstitutions(prev => {
                    const demoInsts = (prev || []).filter(i => i && i.id?.startsWith('demo_'));
                    const combined = [...insts];
                    demoInsts.forEach(di => {
                        if (!combined.some(i => i.id === di.id)) combined.push(di);
                    });
                    return combined;
                });
            }
            if (cnts && cnts.length > 0) setCounties(cnts);
            if (reg) setSchoolRegistry(reg);
            if (sett) {
                setCompanyDetails(sett);
                if (sett.marketplaceConfig?.customUrl) {
                    try {
                        const marketUrl = new URL(sett.marketplaceConfig.customUrl);
                        if (window.location.hostname === marketUrl.hostname || new URLSearchParams(window.location.search).get('view') === 'marketplace') {
                            setShowMarketplace(true);
                        }
                    } catch (e) { console.warn("Invalid marketplace URL:", e); }
                }
            }

            let finalUsers: User[] = u || [];
            const systemSuperAdmin = INITIAL_USERS.find(iu => iu.role === 'super_admin');
            if (systemSuperAdmin && !finalUsers.some((existing: User) => existing.email === systemSuperAdmin.email)) {
                finalUsers = [...finalUsers, systemSuperAdmin];
            }
            setUsers(finalUsers);

            if (currentUser) {
                const refreshedSelf = finalUsers.find((u: User) => u.id === currentUser.id);
                if (refreshedSelf) {
                    const hasChanges = JSON.stringify(refreshedSelf) !== JSON.stringify(currentUser);
                    if (hasChanges) {
                        setCurrentUser(prev => ({ ...prev, ...refreshedSelf } as User));
                        apiService.storeSession({ ...currentUser, ...refreshedSelf } as User);
                    }
                } else if (!finalUsers.some((u: User) => u.id === currentUser.id)) {
                    apiService.saveUser(currentUser).catch(err => console.error("Failed to auto-persist current user:", err));
                }
            }

            // ── UNLOCK UI: dismiss splash now, core data is ready ─────────────
            setLoadStatus("");
            setAppInitializing(false);

            // ── PHASE 2: Resolve core module data (already in-flight) ─────────
            if (currentUser) {
                const coreResults = await coreModulePromise;
                [d, s, c, a, ay, sem, r, b, al, tasks, txns, recs, logs, notifs] = coreResults;
            }

            setDepartments(d || []);
            setSubjects(s || []);
            setCourses(c || []);
            setRequests(a || []);
            setAcademicYears(ay || []);
            setSemesters(sem || []);
            setRooms(r || []);
            setBuildings(b || []);
            setAcademicLevels(al || []);
            setUserTasks(tasks || []);
            let finalTxns = txns || [];
            if (currentUser?.role === 'super_admin' && !instId) {
                finalTxns = finalTxns.filter(txn => {
                    const desc = (txn.description || '').toLowerCase();
                    const type = txn.metadata?.type;
                    const provider = txn.provider;
                    return type === 'subscription' || 
                           type === 'sms' ||
                           type === 'alumnae_registration' ||
                           provider === 'ncba' ||
                           desc.includes('license') || 
                           desc.includes('renewal') || 
                           desc.includes('sms top-up') ||
                           desc.includes('portal subscription') ||
                           desc.includes('alumnae') ||
                           desc.includes('activation');
                });
            }
            setTransactions(finalTxns);
            setReceipts(recs || []);
            setActivityLog(logs || []);
            setNotifications(notifs || []);

            // ── PHASE 3: Context-Specific Extended Data ──────────────────────
            if (currentUser) {
                const activeInst = insts?.find(i => i.id === currentUser?.institutionId);
                const effectiveInstIdFinal: string = (instOverrideId || (currentUser?.role === 'super_admin' ? activeStoreTenantId : (activeInst?.id || currentUser?.institutionId || instId || ''))) || '';
                
                console.log("[Data Refresh] Loading institutional data for:", effectiveInstIdFinal);
            
                // Initialize all extended variables to empty arrays
                let inv: any[] = [], ext: any[] = [], vh: any[] = [], fs: any[] = [], fp: any[] = [], fb: any[] = [];
                let sar: any[] = [], enr: any[] = [], abs: any[] = [], con: any[] = [], att: any[] = [];
                let item: any[] = [], timetableRecords: any[] = [], et: any[] = [], asg: any[] = [], subm: any[] = [];
                let rat: any[] = [], ta: any[] = [], asmt: any[] = [], asmtMarks: any[] = [], bks: any[] = [], ltx: any[] = [];
                let apts: any[] = [], sups: any[] = [], stx: any[] = [], cinv: any[] = [], ccats: any[] = [], cstores: any[] = [];
                let bApps: any[] = [], bFunds: any[] = [], lo: any[] = [], obs: any[] = [], vis: any[] = [], sec: any[] = [];
                let reqRecords: any[] = [], retExp: any[] = [], rStores: any[] = [], rInv: any[] = [], tor: any[] = [];
                let fBulletin: any[] = [], fDocs: any[] = [], fWatch: any[] = [], fMaint: any[] = [], fCheckIn: any[] = [];
                let vhcls: any[] = [], tonb: any[] = [], vlogs: any[] = [], cafe: any[] = [], cOrders: any[] = [];
                let rSales: any[] = [], cwJobs: any[] = [], cFarmers: any[] = [], cColls: any[] = [], cRiders: any[] = [];
                let cAgroInv: any[] = [], cAgroSales: any[] = [], cSaccoAcc: any[] = [], cSaccoTx: any[] = [];
                let cPayouts: any[] = [], cExps: any[] = [], cInc: any[] = [];
                let lClients: any[] = [], lMatters: any[] = [], lDocs: any[] = [], lTime: any[] = [], lInvs: any[] = [];
                let lTrust: any[] = [], lTemplates: any[] = [], lAgreements: any[] = [];
                let dsInst: any[] = [], dsVeh: any[] = [], dsStud: any[] = [], dsLess: any[] = [], dsMast: any[] = [], dsSet: any[] = [], dsInvs: any[] = [], dsPay: any[] = [];
                let cInvs: any[] = [], cPay: any[] = [];
                let ims: any[] = [], disc: any[] = [], fExps: any[] = [], fGoals: any[] = [], fPayroll: any[] = [], demoLeads: any[] = [];
                let csList: any[] = [], csTest: any[] = [], csAppr: any[] = [], csBank: any[] = [];
                const cntId = currentUser && currentUser.role.startsWith('county_') ? currentUser.countyId : undefined;

                // ── BATCH 1: Financial & Basic Modules ─────────────────────────
                const results = await Promise.all([
                    // Fin Batch
                    Promise.all([
                        apiService.fetchInvoices(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchExtensionRequests(isSuper ? 'ALL' : effectiveInstIdFinal).catch(() => []),
                        apiService.fetchVoteHeads(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchFeeStructures(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchFinancialPeriods(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<FeedbackSubmission>('feedback_submissions', effectiveInstIdFinal).catch(() => []),
                    ]),
                    // Acad Batch
                    isAcademic ? Promise.all([
                        apiService.fetchModuleRecords<StudentAbsenceRequest>('student_absence_requests', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<EnrollmentRequest>('enrollment_requests', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchAbsenceRequests(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LecturerContract>('contracts', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<StudentAttendance>('student_attendances', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchTimetable(effectiveInstIdFinal || '').catch(() => []),
                        apiService.fetchExamTimetable(effectiveInstIdFinal || '').catch(() => []),
                        apiService.fetchModuleRecords<Assignment>('assignments', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<Submission>('submissions', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LessonRating>('lesson_ratings', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<TaAssignment>('ta_assignments', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<Assessment>('assessments', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchAssessmentMarks(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<Book>('books', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LeaveOutRequest>('leave_out_requests', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<ObservationNote>('observation_notes', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<TeacherCheckIn>('teacher_check_ins', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<DisciplineIncident>('discipline_incidents', effectiveInstIdFinal).catch(() => []),
                    ]) : Promise.resolve([]),
                    // County Batch
                    isCounty ? Promise.all([
                        apiService.fetchModuleRecords<CountyInventoryItem>('county_inventory', effectiveInstIdFinal, cntId).catch(() => []),
                        apiService.fetchModuleRecords<CountyInventoryCategory>('county_inventory_categories', undefined, cntId).catch(() => []),
                        apiService.fetchModuleRecords<CountyStore>('county_stores', undefined, cntId).catch(() => []),
                        apiService.fetchModuleRecords<BursaryApplication>('bursary_applications', effectiveInstIdFinal, cntId).catch(() => []),
                        apiService.fetchModuleRecords<CountyBursaryFund>('county_bursary_funds', undefined, cntId).catch(() => []),
                    ]) : Promise.resolve([]),
                    // Business Batch
                    isBusiness || isAcademic ? Promise.all([
                        apiService.fetchModuleRecords<InventoryItem>('inventory', effectiveInstIdFinal).catch(() => []),
                        isBusiness ? apiService.fetchModuleRecords<RetailExpense>('retail_expenses', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<RetailStore>('retail_stores', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<CafeMenuItem>('cafe_menu_items', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<CafeOrder>('cafe_orders', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<RetailSale>('retail_sales', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords('carwash_jobs', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<MaintenanceRequest>('maintenance_requests', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                    ]) : Promise.resolve([]),
                    // Coop Batch
                    isCoop ? Promise.all([
                        apiService.fetchModuleRecords<CoopFarmer>('coop_farmers', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<CoopCollection>('coop_collections', effectiveInstIdFinal, undefined, { limit: 1000 }).catch(() => []),
                        apiService.fetchModuleRecords<CoopRider>('coop_riders', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<CoopAgrovetInventory>('coop_agrovet_inventory', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<CoopAgrovetSales>('coop_agrovet_sales', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<SaccoAccount>('sacco_accounts', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<SaccoTransaction>('sacco_transactions', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<CoopMonthlyPayout>('coop_monthly_payouts', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<CoopExpense>('coop_expenses', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<CoopIncome>('coop_income', effectiveInstIdFinal).catch(() => []),
                    ]) : Promise.resolve([]),
                    // Legal Batch
                    isLaw ? Promise.all([
                        apiService.fetchModuleRecords<LawClient>('law_clients', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LawMatter>('law_matters', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LawDocument>('law_documents', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LawTimeEntry>('law_time_entries', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LawInvoice>('law_invoices', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LawTrustTransaction>('law_trust_transactions', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LawAgreementTemplate>('law_agreement_templates', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<LawAgreement>('law_agreements', effectiveInstIdFinal).catch(() => []),
                    ]) : Promise.resolve([]),

                    // Car Batch
                    isBusiness ? Promise.all([
                        apiService.fetchCarListings(effectiveInstIdFinal, 'all').catch(() => []),
                        apiService.fetchCarTestDrives(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchCarAppraisals(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchCarInvoices(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchCarPayments(undefined, effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<BankTransaction>('car_bank_transactions', effectiveInstIdFinal).catch(() => []),
                    ]) : Promise.resolve([]),
                    // System Batch
                    Promise.all([
                        apiService.fetchModuleRecords<Supplier>('suppliers', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<StockTransaction>('stock_transactions', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<Appointment>('appointments', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<Visitor>('visitors', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchSecurityAlerts(effectiveInstIdFinal || '').catch(() => []),
                        apiService.fetchModuleRecords<Requisition>('requisitions', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<TimeOffRequest>('time_off_requests', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<BulletinItem>('bulletin_items', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<DocumentCollection>('document_collections', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<WatchlistRecord>('watchlist_records', effectiveInstIdFinal).catch(() => []),
                        isLogistics ? apiService.fetchVehicles(effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isLogistics ? apiService.fetchTransportOnboarding(effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isLogistics ? apiService.fetchVehicleLogs(effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        apiService.fetchModuleRecords<Expense>('expenses', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<FinancialGoal>('financial_goals', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<PayrollRecord>('payroll_records', effectiveInstIdFinal).catch(() => []),
                        currentUser.role === 'super_admin' ? apiService.fetchDemoRequests().catch(() => []) : Promise.resolve([]),
                    ])
                ]) as any[];
                
                const [finResults, acadResults, countyResults, businessResults, coopResults, legalResults, carResults, systemResults] = results;

                // Destructure Results
                if (finResults) [inv, ext, vh, fs, fp, fb] = finResults;
                if (isAcademic && acadResults) [sar, enr, abs, con, att, timetableRecords, et, asg, subm, rat, ta, asmt, asmtMarks, bks, ltx, lo, obs, fCheckIn, disc] = acadResults;
                if (isCounty && countyResults) [cinv, ccats, cstores, bApps, bFunds] = countyResults;
                if (businessResults) [item, retExp, rStores, rInv, cafe, cOrders, rSales, cwJobs, fMaint] = businessResults;
                if (isCoop && coopResults) [cFarmers, cColls, cRiders, cAgroInv, cAgroSales, cSaccoAcc, cSaccoTx, cPayouts, cExps, cInc] = coopResults;
                if (isLaw && legalResults) [lClients, lMatters, lDocs, lTime, lInvs, lTrust, lTemplates, lAgreements] = legalResults;

                if (isBusiness && carResults) [csList, csTest, csAppr, cInvs, cPay, csBank] = carResults;
                if (systemResults) [sups, stx, apts, vis, sec, reqRecords, tor, fBulletin, fDocs, fWatch, vhcls, tonb, vlogs, fExps, fGoals, fPayroll, demoLeads] = systemResults;

                console.log("[Data Refresh] Optimized Batches Resolved");

                if (insts && insts.length > 0) {
                    const finalInsts = insts.map(i => ({
                        ...i,
                        moduleStates: (imsPhase1 || []).filter((m: any) => m.institutionId === i.id)
                    }));
                    setInstitutions(finalInsts);
                }

                if (demoLeads) setDemoRequests(demoLeads);

                setInvoices(inv || []);
                setExtensionRequests(ext || []);
                setVoteHeads(vh || []);
                setFeeStructures(fs || []);
                setFinancialPeriods(fp || []);
                setFeedbackSubmissions(fb || []);
                setStudentAbsenceRequests(sar || []);
                setEnrollmentRequests(enr || []);
                setAbsenceRequests(abs || []);
                setContracts(con || []);
                setStudentAttendances(att || []);
                setInventory(item || []);
                setCountyInventory(cinv || []);
                setCountyInventoryCategories(ccats || []);
                setCountyStores(cstores || []);
                setGeneratedTimetable(timetableRecords || []);
                setExamTimetable(et || []);
                setAssignments(asg || []);
                setSubmissions(subm || []);
                setLessonRatings(rat || []);
                setTaAssignments(ta || []);
                setAssessments(asmt || []);
                setAssessmentMarks(asmtMarks || []);
                setBooks(bks || []);
                setLibraryTransactions(ltx || []);
                setAppointments(apts || []);
                setCafeMenuItems(cafe || []);
                setSuppliers(sups || []);
                setStockTransactions(stx || []);
                setBursaryApplications(bApps || []);
                setBursaryFunds(bFunds || []);
                setLeaveOutRequests(lo || []);
                setObservationNotes(obs || []);
                setVisitors(vis || []);
                setSecurityAlerts(sec || []);
                setRequisitions(reqRecords || []);
                
                setIncidents(disc || []);
                setExpenses(fExps || []);
                setFinancialGoals(fGoals || []);
                setPayrollRecords(fPayroll || []);

                setCarListings(csList || []);
                setCarTestDrives(csTest || []);
                setCarAppraisals(csAppr || []);
                setCarInvoices(cInvs || []);
                setCarPayments(cPay || []);
                setCarBankTransactions(csBank || []);

                setRetailExpenses(retExp || []);
                setRetailStores(rStores || []);
                setRetailInventory(rInv || []);
                setTimeOffRequests(tor || []);
                setBulletinItems(fBulletin || []);
                setDocumentCollections(fDocs || []);
                setMaintenanceRequests(fMaint || []);
                setTeacherCheckIns(fCheckIn || []);
                setVehicles(vhcls || []);
                setTransportOnboarding(tonb || []);
                setVehicleLogs(vlogs || []);
                setCafeOrders(cOrders || []);
                setRetailSales(rSales || []);
                setJobs(cwJobs || []);
                setNotifications(notifs || []);

                setCoopFarmers(cFarmers || []);
                setCoopCollections(cColls || []);
                setCoopRiders(cRiders || []);
                setCoopAgrovetInventory(cAgroInv || []);
                setCoopAgrovetSales(cAgroSales || []);
                setSaccoAccounts(cSaccoAcc || []);
                setSaccoTransactions(cSaccoTx || []);
                setCoopPayouts(cPayouts || []);
                setCoopExpenses(cExps || []);
                setCoopIncome(cInc || []);

                setLawClients(lClients || []);
                setLawMatters(lMatters || []);
                setLawDocuments(lDocs || []);
                setLawTimeEntries(lTime || []);
                setLawInvoices(lInvs || []);
                setLawTrustTransactions(lTrust || []);
                setLawAgreementTemplates(lTemplates || []);
                setLawAgreements(lAgreements || []);
            }

            setIsGeneratingDemoData(false);
            setLoadStatus("");
            setLoadError("");
        } catch (error: any) {
            console.error("Critical Load Error:", error);
            const msg = error.message || "Unknown connectivity failure";
            setLoadStatus(`Diagnostic Failure: ${msg}`);
            setLoadError(msg);
        } finally {
            initialLoadDone.current = true;
            setAppInitializing(false);
            isRefreshingRef.current = false;
        }
    }, [currentUser?.id, currentUser?.role, currentUser?.institutionId, currentUser?.countyId, activityLogLimit, transactionLimit, receiptLimit, notificationLimit, activeStoreTenantId]);


    const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') === 'privacy-policy' || window.location.pathname === '/privacy-policy' || window.location.pathname === '/privacy';
        } catch (e) { return false; }
    });

    const [showTermsOfService, setShowTermsOfService] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') === 'terms' || window.location.pathname === '/terms' || window.location.pathname === '/terms-of-service';
        } catch (e) { return false; }
    });


    // SEO and Deeplinking for Alumnae
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const slug = params.get('school') || params.get('alumnae');
        if (slug && schoolRegistry.length > 0) {
            const matched = schoolRegistry.find(s => s.slug === slug || s.id === slug);
            if (matched) {
                setSelectedRegistrySchool(matched);
                setShowAlumnaeRegister(true);
                // Update SEO Meta Tags dynamically
                document.title = `${matched.name} | Alumnae Registration | EduAI`;
                const metaDesc = document.querySelector('meta[name="description"]');
                if (metaDesc) metaDesc.setAttribute('content', `Join the official Alumnae network for ${matched.name}. Reconnect with your alma mater and professional network.`);
            }
        }
    }, [schoolRegistry]);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [showBookDemo, setShowBookDemo] = useState(false);
    const [activeAlumna, setActiveAlumna] = useState<any>(null);
    const [showAlumnaePortal, setShowAlumnaePortal] = useState(() => {
        try {
            const saved = localStorage.getItem('eduai_alumna_session');
            const hostname = window.location.hostname;
            const isAlumnaeSubdomain = hostname.startsWith('alumnae.') || hostname.startsWith('alumni.') || hostname.includes('almamater') || hostname.includes('alma_mater');
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            return !!saved && (isAlumnaeSubdomain || view === 'alumnae_portal' || view === 'alumnae_social');
        } catch (e) { return false; }
    });
    const [showAlumnaeSecureAccount, setShowAlumnaeSecureAccount] = useState(false);
    
    // Campaign Social States
    const [activeCampaignMember, setActiveCampaignMember] = useState<any>(null);
    const [showCampaignPortal, setShowCampaignPortal] = useState(false);
    const [showCampaignLogin, setShowCampaignLogin] = useState(false);
    const [activeCampaignProfile, setActiveCampaignProfile] = useState<CampaignProfile | null>(null);

    useEffect(() => {
        const saved = localStorage.getItem('eduai_alumna_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setActiveAlumna(parsed);
                // Redirect to portal if on registration view or community view
                const params = new URLSearchParams(window.location.search);
                const view = params.get('view');
                if (view === 'community' || view === 'alumnae_register' || view === 'alumnae_portal' || view === 'alumnae_social') {
                    setShowAlumnaePortal(true);
                    setShowAlumnaeLogin(false);
                    setShowAlumnaeRegister(false);
                }
            } catch (e) {}
        }
        
        const campaignSaved = localStorage.getItem('eduai_campaign_session');
        if (campaignSaved) {
            try {
                const parsed = JSON.parse(campaignSaved);
                setActiveCampaignMember(parsed);
                const params = new URLSearchParams(window.location.search);
                const view = params.get('view');
                if (view === 'campaign_social' || view === 'campaign_portal') {
                    setShowCampaignPortal(true);
                    setShowCampaignLogin(false);
                }
            } catch (e) {}
        }
    }, []);
    
    // Ensure school registry is loaded when entering claim flow
    useEffect(() => {
        if (showInstitutionClaim && (!schoolRegistry || schoolRegistry.length === 0)) {
            loadData(false, true);
        }
    }, [showInstitutionClaim, schoolRegistry, loadData]);

    // 2FA State
    const [otpPendingUser, setOtpPendingUser] = useState<User | null>(null);
    const [currentOtp, setCurrentOtp] = useState<string | null>(null);

    const initialLoadDone = useRef(false);
    const [showSimulatorLeadModal, setShowSimulatorLeadModal] = useState(false);
    const [pendingSimulatorLaunch, setPendingSimulatorLaunch] = useState<{role: Role, modId: string} | null>(null);

    // App Initialization monitoring
    useEffect(() => {
        // Initialization state tracked internally
        if (!appInitializing) {
            initialLoadDone.current = true;
        }
    }, [appInitializing]);

    const onStudentLessonCheckIn = useCallback(async (timetableEntryId: string) => {
        if (!currentUser) return;
        const now = new Date().toISOString();
        const checkInKey = `${currentUser.id}-${timetableEntryId}`;

        try {
            const attendanceRecord: Omit<StudentAttendance, 'id'> = {
                timetableEntryId,
                studentId: currentUser.id,
                date: now.split('T')[0],
                status: 'present',
                markedBy: currentUser.id,
                timestamp: now
            };

            await apiService.saveModuleRecord('student_attendances', attendanceRecord);

            setStudentCheckIns(prev => ({
                ...prev,
                [checkInKey]: now
            }));

            const newAttendance: StudentAttendance = { ...attendanceRecord, id: `att_${Date.now()}`, timestamp: now };
            setStudentAttendances(prev => [...prev, newAttendance]);
        } catch (error) {
            console.error("Check-in error:", error);
        }
    }, [currentUser]);




    const handleStudentLessonCheckIn = async (entryId: string) => {
        try {
            await apiService.saveModuleRecord('student_check_ins', {
                id: `sci_${Date.now()}`,
                studentId: currentUser!.id,
                timetableEntryId: entryId,
                timestamp: new Date().toISOString(),
                institutionId: currentUser!.institutionId
            });
            loadData();
        } catch (e) {
            console.error('[App] Student check-in error:', e);
        }
    };

    const isAutoMarket = useMemo(() => {
        const type = activeInstitution?.institutionType;
        const cat = activeInstitution?.category;
        const subType = activeInstitution?.businessSubType?.toLowerCase() || '';
        const name = activeInstitution?.name?.toLowerCase() || '';
        return type === 'Car Showroom' || cat === 'Automotive Marketplace' || cat === 'Car Showroom' || subType.includes('vehicle sales') || subType.includes('car sales') || subType.includes('motors') || name.includes('motors') || name.includes('car sales') || subType.includes('showroom');
    }, [activeInstitution]);


    const onDeleteUser = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('users', id);
        loadData();
    }, [loadData]);

    const onEditUser = useCallback(async (id: string, data: any) => {
        const existing = (users || []).find(u => u.id === id);
        if (existing) {
            const updatedUser = { ...existing, ...data, id };
            await apiService.saveModuleRecord('users', updatedUser);

            // Update local state immediately for better responsiveness
            setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));

            if (currentUser?.id === id) {
                const finalUser = { ...currentUser, ...updatedUser };
                setCurrentUser(finalUser);
                apiService.storeSession(finalUser);
            }
            loadData();
        }
    }, [users, currentUser, loadData]);

    const handleAccessAlumnaPortal = useCallback((school: SchoolRegistry) => {
        setIsTransitioning(true);
        setTimeout(() => {
            const mockAlumna = {
                id: `sa_alumna_${Date.now()}`,
                fullName: `Super Admin (${school.name})`,
                email: currentUser?.email || 'admin@edualloc.com',
                phone: currentUser?.phoneNumber || '',
                institutionId: school.institutionId || 'GLOBAL',
                registryId: school.id,
                schoolId: school.id,
                schoolName: school.name,
                isSuperAdmin: true,
                profilePhotoUrl: currentUser?.profilePhotoUrl
            };
            setActiveAlumna(mockAlumna);
            localStorage.setItem('eduai_alumna_session', JSON.stringify(mockAlumna));
            setShowAlumnaePortal(true);
            setIsTransitioning(false);
        }, 600);
    }, [currentUser]);

    const handleLogAction = useCallback(async (action: string) => {
        if (!currentUser) return;
        try {
            await apiService.saveModuleRecord('activity_log', {
                id: `log_${Date.now()}`,
                institutionId: activeInstitution?.id || currentUser.institutionId,
                userId: currentUser.id,
                userName: currentUser.name,
                action,
                timestamp: new Date().toISOString()
            });
            loadData();
        } catch (error) {
            console.error('Error logging action:', error);
        }
    }, [currentUser, activeInstitution, loadData]);

    const handleAddVisitor = useCallback(async (v: Omit<Visitor, 'id'>) => {
        await apiService.saveModuleRecord('visitors', { 
            ...v, 
            id: `vis_${Date.now()}`, 
            status: 'pending', 
            entryTime: new Date().toISOString(), 
            institutionId: currentUser?.institutionId 
        });
        loadData();
    }, [currentUser, loadData]);

    const handleCheckoutVisitor = useCallback(async (id: string) => {
        const v = (visitors || []).find(x => x.id === id);
        if (v) {
            await apiService.saveModuleRecord('visitors', { ...v, status: 'checked_out', timeOut: new Date().toLocaleTimeString() });
            await handleLogAction(`Checked out visitor: ${v.name}`);
        }
        loadData();
    }, [visitors, loadData, handleLogAction]);

    const handleAddAppointment = useCallback(async (a: Omit<Appointment, 'id' | 'status' | 'createdAt'>) => {
        await apiService.saveModuleRecord('appointments', { 
            ...a, 
            id: `apt_${Date.now()}`, 
            status: 'scheduled', 
            createdAt: new Date().toISOString(), 
            institutionId: currentUser?.institutionId 
        });
        loadData();
    }, [currentUser, loadData]);

    const handleUpdateVisitor = useCallback(async (id: string, data: Partial<Visitor>) => {
        const existing = (visitors || []).find(v => v.id === id);
        if (existing) {
            await apiService.saveModuleRecord('visitors', { ...existing, ...data });
            loadData();
        }
    }, [visitors, loadData]);

    const handleAddAlert = useCallback(async (a: Omit<SecurityAlert, 'id' | 'status' | 'timestamp' | 'institutionId'>) => {
        await apiService.saveModuleRecord('security_alerts', { 
            ...a, 
            id: `alt_${Date.now()}`, 
            status: 'active', 
            timestamp: new Date().toISOString(), 
            institutionId: currentUser?.institutionId 
        });
        loadData();
    }, [currentUser, loadData]);

    const handleResolveAlert = useCallback(async (id: string) => {
        const existing = (securityAlerts || []).find(a => a.id === id);
        if (existing) {
            await apiService.saveModuleRecord('security_alerts', { ...existing, status: 'resolved' });
            loadData();
        }
    }, [securityAlerts, loadData]);

    const handleUpdateAppointmentStatus = useCallback(async (id: string, status: string) => {
        const apt = (appointments || []).find(a => a.id === id);
        if (apt) {
            await apiService.saveModuleRecord('appointments', { ...apt, status });
            await handleLogAction(`Updated appointment status for ${apt.guestName} to ${status}`);
        }
        loadData();
    }, [appointments, loadData, handleLogAction]);

    const handleAddStoreItem = useCallback(async (item: any) => {
        await apiService.saveModuleRecord('inventory', { 
            ...item, 
            id: `inv_${Date.now()}`, 
            institutionId: currentUser?.institutionId, 
            lastUpdated: new Date().toISOString() 
        });
        loadData();
    }, [currentUser, loadData]);

    const handleAddSupplier = useCallback(async (supplier: any) => {
        await apiService.saveModuleRecord('suppliers', {
            ...supplier,
            id: `sup_${Date.now()}`,
            institutionId: currentUser?.institutionId
        });
        loadData();
    }, [currentUser, loadData]);

    const handleImportStoreItems = useCallback(async (items: any[]) => {
        const enriched = items.map(i => ({ ...i, institutionId: currentUser?.institutionId, id: i.id || `inv_${Date.now()}_${Math.random()}` }));
        await apiService.saveModuleRecords('inventory', enriched);
        loadData();
    }, [currentUser, loadData]);

    const handleAddStoreTransaction = useCallback(async (transaction: any) => {
        const item = (retailInventory || []).find(i => i.id === transaction.itemId);
        if (item) {
            const newQty = transaction.type === 'Restock' ? item.quantity + transaction.quantity : item.quantity - transaction.quantity;
            await apiService.saveModuleRecord('inventory', { ...item, quantity: newQty, lastUpdated: new Date().toISOString() });
        }
        await apiService.saveModuleRecord('stock_transactions', { 
            ...transaction, 
            id: `stx_${Date.now()}`, 
            date: new Date().toISOString(), 
            institutionId: currentUser?.institutionId, 
            recordedBy: currentUser?.id 
        });
        loadData();
    }, [retailInventory, currentUser, loadData]);

    const handleAddInvoice = useCallback(async (invoice: any) => {
        await apiService.saveModuleRecord('invoices', {
            ...invoice,
            id: `inv_${Date.now()}`,
            institutionId: currentUser?.institutionId,
            createdAt: new Date().toISOString()
        });
        loadData();
    }, [currentUser, loadData]);

    const handleAddReceipt = useCallback(async (receipt: any) => {
        await apiService.saveModuleRecord('receipts', {
            ...receipt,
            id: `rcpt_${Date.now()}`,
            institutionId: currentUser?.institutionId,
            createdAt: new Date().toISOString()
        });
        loadData();
    }, [currentUser, loadData]);

    const handleVerifyRequisition = useCallback(async (id: string, status: string, reason?: string) => {
        const req = (requisitions || []).find(r => r.id === id);
        if (req) {
            await apiService.saveModuleRecord('requisitions', { ...req, status, verifiedBy: currentUser?.id, verifiedAt: new Date().toISOString(), notes: reason });
            loadData();
        }
    }, [requisitions, currentUser, loadData]);

    const handleMarkInventoryReceived = useCallback(async (id: string) => {
        const item = (countyInventory || []).find(i => i.id === id);
        if (item) {
            await apiService.saveModuleRecord('county_inventory', {
                ...item,
                status: 'received',
                lastUpdated: new Date().toISOString()
            });
            loadData();
            success("Inventory received and acknowledged.");
        }
    }, [countyInventory, loadData, success]);

    const onImportStudents = useCallback(async (data: any[]) => {
        if (!currentUser) return;
        await apiService.onImportStudents(data, currentUser.institutionId, activeInstitution?.name);
        loadData();
    }, [currentUser, activeInstitution, loadData]);

    const handleImportStudents = onImportStudents;

    const handleUpdateSubject = useCallback(async (id: string, data: any) => {
        const existing = (subjects || []).find(s => s.id === id);
        if (existing) {
            await apiService.saveModuleRecord('subjects', { ...existing, ...data });
            loadData();
        }
    }, [subjects, loadData]);

    const handleUpdateCourse = useCallback(async (id: string, data: any) => {
        const existing = (courses || []).find(c => c.id === id);
        if (existing) {
            await apiService.saveModuleRecord('courses', { ...existing, ...data });
            loadData();
        }
    }, [courses, loadData]);

    const handleAddSubject = useCallback(async (data: any, levelIds?: string[]) => {
        const id = `sub_${Date.now()}`;
        const subject = { ...data, id, institutionId: currentUser?.institutionId };
        await apiService.saveSubject(subject);
        if (levelIds && levelIds.length > 0) {
            for (const lid of levelIds) { await apiService.onAssociateSubjectToCourseLevel(id, lid); }
        }
        loadData();
    }, [currentUser, loadData]);

    const handleDeleteSubject = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('subjects', id);
        loadData();
    }, [loadData]);

    const handleImportSubjectsAndAssociate = useCallback(async (subjects: any[]) => {
        await apiService.onImportSubjectsAndAssociate(subjects, currentUser?.institutionId);
        loadData();
    }, [currentUser, loadData]);

    const handleAssociateSubjectToCourseLevel = useCallback(async (subjectId: string, levelId: string) => {
        let subjectIdsToAdd = [subjectId];
        const pathwayConstraints = (timetableSettings?.constraints || []).filter((c: any) => c.type === 'same_time_subjects');
        const group = pathwayConstraints.find((c: any) => c.subjectIds.includes(subjectId));
        if (group) {
            subjectIdsToAdd = group.subjectIds;
        }
        await apiService.onAssociateSubjectToCourseLevel(subjectIdsToAdd, levelId);
        loadData();
    }, [timetableSettings, loadData]);

    const handleDisassociateSubjectFromCourseLevel = useCallback(async (subjectId: string, levelId: string) => {
        await apiService.onDisassociateSubjectFromCourseLevel(subjectId, levelId);
        loadData();
    }, [loadData]);

    const handleAddCourse = useCallback(async (data: any) => {
        const id = `course_${Date.now()}`;
        const courseData = { ...data, id, institutionId: currentUser?.institutionId, levels: data.levels || [] };
        await apiService.saveModuleRecord('courses', courseData);
        loadData();
    }, [currentUser, loadData]);

    const handleDeleteCourse = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('courses', id);
        loadData();
    }, [loadData]);

    const handleImportCourses = useCallback(async (data: any[]) => {
        const enriched = data.map(c => ({ ...c, institutionId: currentUser?.institutionId }));
        await apiService.onImportCourses(enriched);
        loadData();
    }, [currentUser, loadData]);

    const handleAddRoom = useCallback(async (data: any) => {
        await apiService.saveModuleRecord('rooms', { ...data, id: `room_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleUpdateRoom = useCallback(async (id: string, data: any) => {
        const existing = (rooms || []).find(r => r.id === id);
        if (existing) {
            await apiService.saveModuleRecord('rooms', { ...existing, ...data });
            loadData();
        }
    }, [rooms, loadData]);

    const handleDeleteRoom = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('rooms', id);
        loadData();
    }, [loadData]);

    const handleImportRooms = useCallback(async (data: any[]) => {
        const enriched = data.map(r => ({ ...r, id: r.id || `room_${Date.now()}_${Math.random()}`, institutionId: currentUser?.institutionId }));
        await apiService.saveModuleRecords('rooms', enriched);
        loadData();
    }, [currentUser, loadData]);

    const handleAddDepartment = useCallback(async (name: string) => {
        await apiService.saveModuleRecord('departments', { name, id: `dept_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleUpdateDepartment = useCallback(async (id: string, data: any) => {
        const existing = (departments || []).find(d => d.id === id);
        if (existing) {
            await apiService.saveModuleRecord('departments', { ...existing, ...data });
            loadData();
        }
    }, [departments, loadData]);

    const handleDeleteDepartment = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('departments', id);
        loadData();
    }, [loadData]);

    const handleImportDepartments = useCallback(async (data: any[]) => {
        const enriched = data.map(d => ({ ...d, id: d.id || `dept_${Date.now()}_${Math.random()}`, institutionId: currentUser?.institutionId }));
        await apiService.saveModuleRecords('departments', enriched);
        loadData();
    }, [currentUser, loadData]);

    const handleAddAssessment = useCallback(async (data: any) => {
        await apiService.saveModuleRecord('assessments', { ...data, id: `asm_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleDeleteAssessment = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('assessments', id);
        loadData();
    }, [loadData]);

    const handleSaveAssessmentMarks = useCallback(async (_id: string, marks: any[]) => {
        await apiService.saveModuleRecords('assessment_marks', marks);
        loadData();
    }, [loadData]);

    const handleExamTimetableGenerated = useCallback(async (entries: any[], ay: string, sem: string) => {
        await apiService.saveExamTimetable(currentUser?.institutionId || '', ay, sem, entries);
        loadData();
    }, [currentUser, loadData]);

    const handleAddRequest = useCallback(async (data: any) => {
        await apiService.saveModuleRecord('allocation_requests', { ...data, id: `req_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleLecturerSubmitRequest = useCallback(async (subjectIds: string[], justification: string, signatureUrl: string | null, priority: string, academicYearId: string, semesterId: string, preferences: any, courseLevelSelections: Record<string, string[]>) => {
        try {
            for (const subjectId of subjectIds) {
                await apiService.saveModuleRecord('allocation_requests', {
                    id: `req_${Date.now()}_${subjectId}`,
                    institutionId: currentUser?.institutionId,
                    lecturerId: currentUser?.id,
                    subjectId,
                    justification,
                    signatureUrl,
                    priority,
                    academicYearId,
                    semesterId,
                    preferences,
                    courseLevelSelections,
                    status: 'pending',
                    createdAt: new Date().toISOString()
                });
            }
            loadData();
            return true;
        } catch (error) {
            console.error("Failed to submit requests:", error);
            return false;
        }
    }, [currentUser, loadData]);

    const handleUpdateRequest = useCallback(async (id: string, data: any) => {
        const existing = (requests || []).find(r => r.id === id);
        if (existing) {
            await apiService.saveModuleRecord('allocation_requests', { ...existing, ...data });
            loadData();
        }
    }, [requests, loadData]);

    const handleWithdrawRequest = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('allocation_requests', id);
        loadData();
    }, [loadData]);

    const handleAddAssignment = useCallback(async (data: any) => {
        await apiService.saveModuleRecord('assignments', { ...data, id: `asg_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleDeleteAssignment = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('assignments', id);
        loadData();
    }, [loadData]);

    const handleAddFeedback = useCallback(async (studentId: string, feedback: string) => {
        await apiService.saveModuleRecord('lesson_ratings', { studentId, feedback, id: `fb_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleAddObservationNote = useCallback(async (note: any) => {
        await apiService.saveModuleRecord('observation_notes', { ...note, id: `obs_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleAddTimeOffRequest = useCallback(async (data: any) => {
        await apiService.saveModuleRecord('time_off_requests', { ...data, id: `tor_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleAddTask = useCallback(async (task: any) => {
        await apiService.saveModuleRecord('tasks', { ...task, id: `task_${Date.now()}`, institutionId: currentUser?.institutionId });
        loadData();
    }, [currentUser, loadData]);

    const handleUpdateTask = useCallback(async (id: string, completed: boolean) => {
        const existing = (userTasks || []).find(t => t.id === id);
        if (existing) {
            await apiService.saveModuleRecord('tasks', { ...existing, completed });
            loadData();
        }
    }, [userTasks, loadData]);

    const handleDeleteTask = useCallback(async (id: string) => {
        await apiService.deleteModuleRecord('tasks', id);
        loadData();
    }, [loadData]);

    const handleSaveAttendance = useCallback(async (timetableEntryId: string, attendanceData: { studentId: string, status: 'present' | 'absent' | 'late' }[]) => {
        if (!currentUser || !activeInstitution) return;

        try {
            const now = new Date().toISOString();
            const dateStr = now.split('T')[0];
            const promises = attendanceData.map(record => {
                const existing = (studentAttendances || []).find(a => a.timetableEntryId === timetableEntryId && a.studentId === record.studentId && a.date === dateStr);
                const id = existing ? existing.id : `att_${timetableEntryId}_${record.studentId}_${Date.now()}`;

                const attendanceRecord: StudentAttendance = {
                    id,
                    timetableEntryId,
                    studentId: record.studentId,
                    date: dateStr,
                    status: record.status,
                    markedBy: currentUser.id,
                    timestamp: now,
                    institutionId: activeInstitution.id
                };

                return apiService.saveModuleRecord('student_attendances', attendanceRecord);
            });

            await Promise.all(promises);
            await loadData();

            // Notify Parents if enabled
            if (activeInstitution.parentAbsenceNotificationsEnabled) {
                const absentStudents = attendanceData.filter(r => r.status === 'absent');
                for (const studentRecord of absentStudents) {
                    const student = (users || []).find(u => u.id === studentRecord.studentId);
                    const parent = (users || []).find(u => u.role === 'parent' && (u.studentIds || []).includes(studentRecord.studentId));
                    const lesson = (generatedTimetable || []).find(l => l.id === timetableEntryId);
                    const subject = (subjects || []).find(s => s.id === lesson?.subjectId);

                    if (parent && student && lesson && subject) {
                        const message = `Parent / Guardian Alert: ${student.name} was marked ABSENT for ${subject.name} on ${lesson.day} at ${lesson.startTime}. Please confirm with the school.`;

                        if (parent.phoneNumber) {
                            await apiService.sendSms(parent.phoneNumber, message);
                        }
                        if (parent.email) {
                            await sendEmailNotification(
                                parent.email, 
                                "Student Absence Notification", 
                                message, 
                                getInstitutionEmailConfig(activeInstitution, companyDetails.emailConfig)
                            );
                        }
                    }
                }
            }
        } catch (e) {
            console.error('[App] Save attendance error:', e);
        }
    }, [currentUser, activeInstitution, studentAttendances, users, generatedTimetable, subjects, loadData, companyDetails]);

    const handleProcessPayroll = useCallback(async (records: any[]) => {
        await apiService.saveModuleRecord('payroll_runs', { id: `pr_${Date.now()}`, institutionId: currentUser?.institutionId, records, timestamp: new Date().toISOString() });
        loadData();
    }, [currentUser, loadData]);

    const handleUpdateLeaveStatus = useCallback(async (id: string, status: 'approved' | 'rejected') => {
        const req = (timeOffRequests || []).find(t => t.id === id);
        if (req) {
            await apiService.saveModuleRecord('time_off_requests', { ...req, status });
            loadData();
        }
    }, [timeOffRequests, loadData]);

    const onUpdateInstitution = useCallback(async (id: string, data: any) => {
        const inst = institutions.find(i => i.id === id);
        if (inst) {
            await apiService.saveInstitution({ ...inst, ...data });
            loadData();
        }
    }, [institutions, loadData]);

    const handleLogGateAction = useCallback(async (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => {
        if (!activeInstitution || !currentUser) return;
        try {
            const vehicle = (vehicles || []).find(v => v.id === vehicleId);
            const payload: VehicleLog = {
                id: `vlog_${Date.now()}`,
                institutionId: activeInstitution.id,
                vehicleId,
                eventType,
                securityId: currentUser.id,
                timestamp: new Date().toISOString(),
                notes
            };
            await apiService.saveModuleRecord('vehicle_logs', payload);
            await handleLogAction(`Log: Vehicle ${vehicle?.plateNumber} ${eventType}`);
            loadData();
        } catch (error) {
            console.error('Error logging gate action:', error);
            throw error;
        }
    }, [activeInstitution, currentUser, vehicles, handleLogAction, loadData]);

    const handleTeacherLessonCheckIn = useCallback(async (lessonId: string, status: string, notes?: string) => {
        try {
            await apiService.processTeacherCheckIn({
                teacher_id: currentUser?.id,
                institution_id: activeInstitution?.id,
                timetable_entry_id: lessonId,
                checkin_type: status as any,
                timestamp: new Date().toISOString(),
                notes
            });
            loadData();
        } catch (e) {
            console.error('[App] Teacher check-in error:', e);
        }
    }, [currentUser, activeInstitution, loadData]);

    const handleOnboardStudent = useCallback(async (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => {
        if (!activeInstitution) return;
        try {
            const student = (users || []).find(u => u.id === studentId);
            const vehicle = (vehicles || []).find(v => v.id === vehicleId);
            const payload: TransportOnboarding = {
                id: `tonb_${Date.now()}`,
                institutionId: activeInstitution.id,
                studentId,
                vehicleId,
                direction,
                status: 'onboarded',
                locationLat: lat,
                locationLng: lng,
                timestamp: new Date().toISOString()
            };
            await apiService.saveModuleRecord('transport_onboarding', payload);

            // Send SMS to Parent
            const parents = (users || []).filter(u => u.role === 'parent' && (u.studentIds || []).includes(studentId));
            for (const parent of parents) {
                if (parent.phoneNumber) {
                    const msg = direction === 'from_school'
                        ? `${student?.name} has onboarded vehicle ${vehicle?.plateNumber} and is heading home. Please be ready to pick.`
                        : `${student?.name} has onboarded vehicle ${vehicle?.plateNumber} and is heading to school.`;
                    await apiService.sendSms(parent.phoneNumber, msg, activeInstitution.smsConfig, 1, activeInstitution.id);
                }
            }

            await handleLogAction(`Onboarded student ${student?.name} to ${vehicle?.plateNumber}`);
            loadData();
        } catch (error) {
            console.error('Error onboarding student:', error);
        }
    }, [activeInstitution, users, vehicles, handleLogAction, loadData]);

    const handleOffboardStudent = useCallback(async (recordId: string, lat?: number, lng?: number) => {
        try {
            const record = (transportOnboarding || []).find(r => r.id === recordId);
            if (!record) return;
            await apiService.saveModuleRecord('transport_onboarding', {
                ...record,
                status: 'offboarded',
                locationLat: lat,
                locationLng: lng,
                timestamp: new Date().toISOString()
            });
            await handleLogAction(`Student ${record.studentId} offboarded`);
            loadData();
        } catch (error) {
            console.error('Error offboarding student:', error);
        }
    }, [transportOnboarding, handleLogAction, loadData]);



    const handleUpdateCompanyDetails = useCallback(async (d: any) => {
        await apiService.saveCompanySettings(d as any);
        loadData();
    }, [loadData]);




    useEffect(() => {
        // Trigger a hard reload when identity, scope, or perspective changes, or limits change
        loadData(true);
    }, [currentUser?.id, currentUser?.institutionId, currentUser?.countyId, impersonatedRole, activityLogLimit, transactionLimit, receiptLimit, notificationLimit]);

    const handleAddRequisition = async (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => {
        if (!activeInstitution || !currentUser) return;
        const newReq: Requisition = {
            ...req,
            id: `req_${Date.now()}`,
            status: 'pending',
            requestedDate: new Date().toISOString(),
            institutionId: activeInstitution.id
        };
        await apiService.saveModuleRecord('requisitions', newReq);
        await handleLogAction(`Created requisition for ${req.totalEstimatedCost}`);
        loadData();
    };

    const handleUpdateRequisition = async (reqId: string, data: Partial<Requisition>) => {
        const existing = requisitions.find(r => r.id === reqId);
        if (!existing) return;

        const updated = { ...existing, ...data };
        await apiService.saveModuleRecord('requisitions', updated);

        // If newly marked as received, update inventory for the specific store
        if (data.status === 'received' && existing.status !== 'received' && updated.storeId && activeInstitution) {
            try {
                // Fetch current stock to find existing records
                const currentStock = await apiService.fetchModuleRecords<RetailStoreStock>('retail_store_stock', activeInstitution.id);

                for (const item of updated.items) {
                    const globalItem = retailInventory.find(ri => ri.name.toLowerCase() === item.name.toLowerCase());
                    if (globalItem) {
                        const existingStock = currentStock.find(s => s.storeId === updated.storeId && s.itemId === globalItem.id);

                        if (existingStock) {
                            await apiService.saveModuleRecord('retail_store_stock', {
                                ...existingStock,
                                quantity: Number(existingStock.quantity) + Number(item.quantity)
                            });
                        } else {
                            await apiService.saveModuleRecord('retail_store_stock', {
                                id: `rss_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                storeId: updated.storeId,
                                itemId: globalItem.id,
                                quantity: Number(item.quantity)
                            });
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to auto-update inventory:", err);
            }
        }

        await handleLogAction(`Updated requisition ${reqId.slice(-6)}`);
        loadData();
    };

    const handleAddRetailExpense = async (expense: Omit<RetailExpense, 'id' | 'institutionId' | 'date' | 'recordedById'>) => {
        if (!activeInstitution || !currentUser) return;
        const newEx: RetailExpense = {
            ...expense,
            id: `ret_exp_${Date.now()}`,
            institutionId: activeInstitution.id,
            date: new Date().toISOString(),
            recordedById: currentUser.id
        };
        await apiService.saveModuleRecord('retail_expenses', newEx);
        await handleLogAction(`Committed store expense: ${expense.amount}`);
        loadData();
    };

    const handleLogout = () => {
        apiService.clearSession();
        setCurrentUser(null);
        setImpersonatedRole(null);
        setOriginalSuperAdminSession(null);
        setIsSimulatorMode(false);
        setIsHealthSystemOpen(false);
        setIsPharmacySystemOpen(false);
        localStorage.removeItem('eduai_super_admin_session');
    };

    // Reset pagination limits when user or institution context changes
    useEffect(() => {
        setActivityLogLimit(50);
        setTransactionLimit(50);
        setReceiptLimit(50);
        setNotificationLimit(20);
    }, [currentUser?.id, activeInstitution?.id]);

    // Inactivity Watcher: Auto-logout after 90 minutes of total inactivity
    useEffect(() => {
        if (!currentUser) return;

        const IDLE_TIMEOUT = 90 * 60 * 1000; // 90 Minutes
        let timeoutId: NodeJS.Timeout;

        const resetTimer = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                console.log("[Auth] Session expired due to 90 minutes of inactivity.");
                handleLogout();
            }, IDLE_TIMEOUT);
        };

        // Standard user activity events
        const activities = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        activities.forEach(e => document.addEventListener(e, resetTimer));

        // Start the initial countdown
        resetTimer();

        return () => {
            if (timeoutId) clearTimeout(timeoutId);
            activities.forEach(e => document.removeEventListener(e, resetTimer));
        };
    }, [currentUser]);

    // --- Infrastructure Handlers ---





    const handleAddBuilding = async (name: string) => {
        const id = `bldg_${Date.now()}`;
        await apiService.saveModuleRecord('buildings', { id, name, institutionId: currentUser?.institutionId });
        loadData();
        return true;
    };

    const handleUpdateBuilding = async (id: string, data: any) => {
        const existing = buildings.find(b => b.id === id);
        if (existing) {
            await apiService.saveModuleRecord('buildings', { ...existing, ...data, id });
            loadData();
        }
    };

    const handleDeleteBuilding = async (id: string) => {
        await apiService.deleteModuleRecord('buildings', id);
        loadData();
    };



    const handleAddAcademicLevel = async (name: string) => {
        const id = `al_${Date.now()}`;
        await apiService.saveModuleRecord('academic_levels', { id, name, institutionId: currentUser?.institutionId });
        loadData();
    };

    const handleUpdateAcademicLevel = async (id: string, name: string) => {
        const existing = academicLevels.find(l => l.id === id);
        if (existing) {
            await apiService.saveModuleRecord('academic_levels', { ...existing, name, id });
            loadData();
        }
    };

    const handleDeleteAcademicLevel = async (id: string) => {
        await apiService.deleteModuleRecord('academic_levels', id);
        loadData();
    };

    const handleAddExtensionRequest = async (reason: string) => {
        if (!currentUser || !activeInstitution) return;
        try {
            await apiService.saveModuleRecord('institution_extension_requests', {
                id: `ext_${Date.now()}`,
                institutionId: activeInstitution.id,
                requesterId: currentUser.id,
                reason,
                status: 'pending',
                requestedAt: new Date().toISOString()
            });
            await loadData();
            success("Extension request submitted successfully.");
        } catch (err) {
            console.error("Failed to submit extension request:", err);
            toastError("Failed to submit extension request. Please contact support.");
        }
    };

    const handleUpdateExtensionRequestStatus = async (requestId: string, status: 'approved' | 'rejected', extensionDays?: number) => {
        try {
            await apiService.updateExtensionRequestStatus(requestId, status, extensionDays);
            await loadData();
            success(`Extension request ${status} successfully.`);
        } catch (err) {
            console.error("Failed to update extension request status:", err);
            const errMsg = (err as any)?.message || (err as any)?.error || "Unknown error";
            toastError(`Failed to update status: ${errMsg}. Please try again.`);
        }
    };

    // --- Academic Handlers ---











    // --- User Handlers ---

    const onImportUsers = async (data: any[]) => {
        await apiService.onImportUsers(data, currentUser?.institutionId, activeInstitution?.name);
        loadData();
    };





    const onDeleteInstitution = async (id: string) => {
        await apiService.deleteModuleRecord('institutions', id);
        loadData();
    };

    const onToggleInstitutionStatus = async (id: string) => {
        const inst = institutions.find(i => i.id === id);
        if (inst) {
            await apiService.saveInstitution({ ...inst, status: inst.status === 'suspended' ? 'active' : 'suspended' });
            loadData();
        }
    };

    const handleDownloadReceipt = async (receipt: Receipt) => {
        try {
            const institution = institutions.find((i: Institution) => i.id === receipt.institutionId) || institutions[0];
            const job = jobs.find(j => j.id === receipt.relatedTransactionId);
            // Assuming there's a service method to generate/download the receipt
            // This part would typically involve calling a backend endpoint or generating a PDF client-side
            // For now, let's just log and simulate a download.
            console.log(`Downloading receipt for transaction ${receipt.relatedTransactionId}`);
            // Example: apiService.downloadReceipt(receipt.id);
            info(`Simulating download for receipt ID: ${receipt.id}. Institution: ${institution?.name}, Job: ${job?.packageName || job?.vehiclePlate}`);
            await handleLogAction(`Downloaded receipt for transaction: ${receipt.relatedTransactionId}`);
        } catch (error) {
            console.error('Error downloading receipt:', error);
            toastError('Failed to download receipt. Please try again.');
        }
    };





    const onLoginAsAdmin = useCallback((institutionId: string, initialRole?: Role | null) => {
        setIsTransitioning(true);
        setTimeout(() => {
            const adminRoles = ['admin', 'head_teacher', 'dos', 'deputy', 'hod', 'tto', 'agrovet_admin', 'property_admin', 'his_admin', 'carwash_admin', 'transport_admin', 'reseller', 'fuel_admin', 'legal_admin', 'cooperative_manager'];
            let admin = users.find(u => u.institutionId === institutionId && adminRoles.includes(u.role));

            if (!admin) {
                console.warn(`Strict admin lookup failed for institution ${institutionId}. Falling back to any user.`);
                admin = users.find(u => u.institutionId === institutionId);
            }

            if (!admin) {
                console.warn(`No users found for institution ${institutionId}. Creating temporary admin session.`);
                const targetInstitution = institutions.find(i => i.id === institutionId);
                const registryEntry = schoolRegistry.find(s => s.id === institutionId || s.institutionId === institutionId);
                
                const fallbackRole = (targetInstitution?.institutionType === 'Reseller' || registryEntry?.institutionType === 'Reseller') ? 'reseller' : (initialRole || 'admin');

                admin = {
                    id: `temp_admin_${institutionId}_${Date.now()}`,
                    institutionId: institutionId,
                    role: fallbackRole as Role,
                    email: `admin@${institutionId.replace('demo_', '')}.eduai.io`,
                    name: registryEntry ? `${registryEntry.name} Admin` : `Demo Administrator`,
                    phoneNumber: '+254700000000',
                    password: 'password123',
                    expertise: []
                };
                
                // Track this internal admin locally
                setUsers(prev => [...prev, admin!]);
            }

            if (admin) {
                // Save original super admin session if not already in an impersonated session
                if (!originalSuperAdminSession && currentUser?.role === 'super_admin') {
                    setOriginalSuperAdminSession(currentUser);
                    localStorage.setItem('eduai_super_admin_session', JSON.stringify(currentUser));
                }

                const impersonatedUser = {
                    ...admin,
                    institutionId: institutionId,
                    role: (initialRole || admin.role) as Role
                };
                
                console.log(`[Simulator] Impersonating ${impersonatedUser.role} for ${institutionId}`);
                setCurrentUser(impersonatedUser);
                apiService.storeSession(impersonatedUser);
                setImpersonatedRole(initialRole || null);
            } else {
                toastError("Critical: Failed to generate administrative session.");
            }
            setIsTransitioning(false);
        }, 300);
    }, [users, institutions, currentUser, originalSuperAdminSession, toastError]);
    


    // On-demand Registry Load for Alumnae Registration
    useEffect(() => {
        if (showAlumnaeRegister && schoolRegistry.length === 0) {
            const loadRegistry = async () => {
                try {
                    const reg = await apiService.fetchFullRegistry();
                    setSchoolRegistry(reg);
                } catch (e) {}
            };
            loadRegistry();
        }
    }, [showAlumnaeRegister, schoolRegistry.length]);

    // Role-based view logic
    useEffect(() => {
        onLoginAsAdminRef.current = onLoginAsAdmin;
    }, [onLoginAsAdmin]);

    const handleLaunchSimulator = useCallback(async (role: Role, modId: string) => {
        // If not logged in and hasn't captured lead in this session, show modal
        const leadCaptured = localStorage.getItem('eduai_simulator_lead_captured');
        if (!currentUser && !leadCaptured) {
            setPendingSimulatorLaunch({ role, modId });
            setShowSimulatorLeadModal(true);
            return;
        }

        setIsSimulatorMode(true);
        setIsTransitioning(true);
        setIsGeneratingDemoData(true);
        setDemoDataGenerationProgress(10);
        setDemoDataGenerationMessage(`Initializing ${modId} environment...`);

        // Always generate a fresh demo ID to ensure we don't pick an active account
        let targetInst: any = null;
        const instId = `demo_${modId}_${Math.random().toString(36).substr(2, 9)}`;
        
        if (!targetInst) {
            // Construct a fresh active configuration for the simulator
            const demoConfig: Institution = {
                ...INITIAL_INSTITUTIONS[0],
                id: instId,
                name: `${SIMULATOR_NAMES[modId] || modId.charAt(0).toUpperCase() + modId.slice(1)} Simulator`,
                email: `demo@${modId}.eduai.io`,
                phoneNumber: '+254700000000',
                institutionType: (
                                 modId === 'property' ? 'Property Management' : 
                                 (modId === 'his' || modId === 'pharmacy') ? 'HIS' : 
                                 modId === 'legal' ? 'Law Firm' : 
                                 modId === 'coop' ? 'Cooperative' : 
                                 modId === 'campaign' ? 'Political Campaign' : 
                                 modId === 'ds' ? 'Driving School' : 
                                 modId === 'civil' ? 'Construction' : 
                                 modId === 'logistics' ? 'Logistics' : 
                                 modId === 'retail' ? 'Retail' :
                                 modId === 'autoservice' ? 'Car Wash' :
                                  modId === 'showroom' ? 'Business' :
                                   modId === 'tourism' ? 'Hospitality' :
                                   modId === 'community' ? 'Community' :
                                 modId === 'edu' ? 'Education' : 'Business') as any,
                category: (modId === 'fuel' ? 'Fuel Station' : 
                           modId === 'retail' ? 'Retail' : 
                           modId === 'showroom' ? 'Automotive Marketplace' : 
                           modId === 'tourism' ? 'Hospitality' :
                           modId === 'community' ? 'Community' : 
                           modId === 'his' ? 'Hospital/Clinic' :
                           modId === 'pharmacy' ? 'Hospital/Clinic' :
                           'General'),
                businessSubType: (modId === 'fuel' ? 'Fuel Station' : 
                                  modId === 'retail' ? 'Retail' : 
                                  modId === 'autoservice' ? 'Car Wash' : 
                                   modId === 'showroom' ? 'Automotive Marketplace' : 
                                  modId === 'property' ? 'Property Management' : 'General'),
                status: 'active',
                trialEndsAt: new Date(Date.now() + 86400000 * 30).toISOString(),
                slug: `sim-${modId}-${Date.now()}`,
                moduleStates: [
                    {
                        id: `ms_${Date.now()}`,
                        institutionId: instId,
                        moduleId: modId,
                        status: 'active',
                        subscriptionEndsAt: new Date(Date.now() + 86400000 * 365).toISOString()
                    }
                ],
                gradingSystems: DEFAULT_GRADING_SYSTEMS
            };

            await apiService.saveInstitution(demoConfig);
            // Update the institutions list to ensure it's reactivated in state
            setInstitutions(prev => [...prev, demoConfig]);
            targetInst = demoConfig;
        }
        
        setDemoDataGenerationProgress(30);
        setDemoDataGenerationMessage("Seeding simulation data...");

        // Generate Demo Data automagically for simulators
        try {
            const demoUserId = `demo_user_${instId}`;
            const demoData = generateInstitutionalDemoData(instId, demoUserId);
            
            // Extract the table map from handleGenerateDemoData logic
            const tableMap: Record<string, string> = {
                departments: 'departments',
                buildings: 'buildings',
                rooms: 'rooms',
                academicLevels: 'academic_levels',
                academicYears: 'academic_years',
                semesters: 'semesters',
                users: 'users',
                subjects: 'subjects',
                courses: 'courses',
                allocations: 'allocation_requests',
                timetable: 'timetable_entries',
                inventory: 'inventory',
                visitors: 'visitors',
                securityAlerts: 'security_alerts',
                hisStaff: 'his_staff',
                hisPatients: 'his_patients',
                hisWards: 'his_wards',
                hisBeds: 'his_beds',
                hisAppointments: 'his_appointments',
                hisAttendance: 'his_staff_attendance',
                hisFinancials: 'his_financial_records',
                hisVitals: 'his_vital_statistics',
                hisEvents: 'his_clinical_events',
                coopFarmers: 'coop_farmers',
                coopCollections: 'coop_collections',
                lawClients: 'law_clients',
                lawMatters: 'law_matters',
                pmProperties: 'property_management_properties',
                pmUnits: 'property_management_units',
                fuelTanks: 'fuel_tanks',
                fuelPumps: 'fuel_pumps'
            };

            const dataKeys = Object.keys(demoData).filter(k => k !== 'institutionUpdates');
            
            setDemoDataGenerationProgress(50);
            // Process data generation in the background
            await Promise.all(dataKeys.map(async (key) => {
                const records = (demoData as any)[key];
                const tableName = tableMap[key] || key;
                if (Array.isArray(records) && records.length > 0) {
                    for (const record of records) {
                        await apiService.saveModuleRecord(tableName, record);
                    }
                }
            }));
            
            console.log(`[Simulator] Demo data seeded successfully for ${instId}`);
            setDemoDataGenerationProgress(90);
            setDemoDataGenerationMessage("Finalizing environment...");
            await loadData();

        } catch (err) {
            console.error("[Simulator] Auto-generation of demo data failed:", err);
            setIsGeneratingDemoData(false);
        }

        setTimeout(() => {
            if (modId === 'his' || modId === 'pharmacy') {
                setIsHealthSystemOpen(true);
                setIsPharmacySystemOpen(modId === 'pharmacy');
            }
            if (onLoginAsAdminRef.current) {
                onLoginAsAdminRef.current(instId, role);
            }
            setShowMarketing(false);
            setIsGeneratingDemoData(false);
            setDemoDataGenerationProgress(0);
        }, 500);
    }, [institutions, currentUser, loadData]);

    const onRestoreSuperAdminSession = () => {
        if (originalSuperAdminSession) {
            setIsTransitioning(true);
            setTimeout(() => {
                const saUser = originalSuperAdminSession;
                setOriginalSuperAdminSession(null);
                setImpersonatedRole(null);
                setIsSimulatorMode(false);
                setIsHealthSystemOpen(false);
                setIsPharmacySystemOpen(false);
                localStorage.removeItem('eduai_super_admin_session');
                setCurrentUser(saUser);
                apiService.storeSession(saUser);
                setIsTransitioning(false);
                // loadData() is triggered automatically by the useEffect watching currentUser.id
            }, 100);
        }
    };

    const handleAddVehicle = async (vehicle: Omit<TransportVehicle, 'id'>) => {
        try {
            await apiService.saveModuleRecord('vehicles', { ...vehicle, id: `vh_${Date.now()}` });
            await handleLogAction(`Registered vehicle: ${vehicle.plateNumber}`);
            loadData();
        } catch (error) {
            console.error('Error adding vehicle:', error);
            throw error;
        }
    };

    const handleUpdateVehicle = async (id: string, updates: Partial<TransportVehicle>) => {
        try {
            const existing = vehicles.find(v => v.id === id);
            if (existing) {
                await apiService.saveModuleRecord('vehicles', { ...existing, ...updates, id });
                await handleLogAction(`Updated vehicle: ${existing.plateNumber}`);
                loadData();
            }
        } catch (error) {
            console.error('Error updating vehicle:', error);
            throw error;
        }
    };

    const handleDeleteVehicle = async (id: string) => {
        try {
            const vehicle = vehicles.find(v => v.id === id);
            await apiService.deleteModuleRecord('vehicles', id);
            if (vehicle) await handleLogAction(`Deleted vehicle: ${vehicle.plateNumber}`);
            loadData();
        } catch (error) {
            console.error('Error deleting vehicle:', error);
            throw error;
        }
    };










    const handleConfirmReceipt = async (recordId: string) => {
        try {
            const record = transportOnboarding.find(r => r.id === recordId);
            if (record) {
                await apiService.saveModuleRecord('transport_onboarding', {
                    ...record,
                    status: 'received',
                    parentConfirmedAt: new Date().toISOString()
                });
                await handleLogAction(`Parent confirmed receipt of child(record ${recordId})`);
                loadData();
            }
        } catch (error) {
            console.error('Error confirming receipt:', error);
            throw error;
        }
    };

    const handleActivateModuleTrial = useCallback(async (moduleId: string) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        
        const trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + 14); // 14-day trial
        
        const record: InstitutionModuleState = {
            id: `mod_${moduleId}_${instId}_${Date.now()}`,
            moduleId,
            institutionId: instId,
            status: 'trial',
            activatedAt: new Date().toISOString(),
            trialEndsAt: trialEndsAt.toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        await apiService.saveModuleRecord('institution_module_states', record);
        await handleLogAction(`Activated trial for module: ${moduleId}`);
        loadData();
    }, [activeInstitution, currentUser, handleLogAction, loadData]);

    // --- Cooperative Handlers ---

    const handleAddFarmer = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        const payload = { ...data, id: `f_${Date.now()}`, institutionId: instId };
        await apiService.saveModuleRecord('coop_farmers', payload);
        await handleLogAction(`Registered farmer: ${data.name}`);
        loadData();
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleUpdateFarmer = useCallback(async (id: string, data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('coop_farmers', { ...data, id, institutionId: instId });
        await handleLogAction(`Updated farmer: ${data.name}`);
        loadData();
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddSaccoAccount = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        const payload = { 
            ...data, 
            id: `sacco_${Date.now()}`, 
            institutionId: instId,
            balance: 0,
            createdAt: new Date().toISOString()
        };
        await apiService.saveModuleRecord('sacco_accounts', payload);
        await handleLogAction(`Opened SACCO account for farmer ID: ${data.farmerId}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleImportFarmers = useCallback(async (farmers: any[]) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        const timestamp = Date.now();
        const payloads = farmers.map((f, i) => ({
            ...f,
            id: f.id || `f_${timestamp}_${i}`,
            institutionId: instId
        }));
        await apiService.saveModuleRecords('coop_farmers', payloads);
        await handleLogAction(`Imported ${farmers.length} farmers`);
        loadData();
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleLogCollection = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId || !currentUser) return;
        const payload = { 
            ...data, 
            id: `c_${Date.now()}`, 
            institutionId: instId,
            recordedBy: currentUser.id,
            farmer_id: data.farmerId || data.farmer_id
        };
        await apiService.saveModuleRecord('coop_collections', payload);
        await handleLogAction(`Logged collection for farmer ${data.farmerId}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleImportCollections = useCallback(async (collections: any[]) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId || !currentUser) return;
        const timestamp = Date.now();
        const payloads = collections.map((c, i) => ({
            ...c,
            id: `c_${timestamp}_${i}`,
            institutionId: instId,
            recordedBy: currentUser.id,
            status: 'pending'
        }));
        await apiService.saveModuleRecords('coop_collections', payloads);
        await handleLogAction(`Imported ${collections.length} collections`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleBulkConfirmCollections = useCallback(async (riderId: string, pendingCollections: any[]) => {
        if (!currentUser) return;
        const now = new Date().toISOString();
        const payloads = pendingCollections.map(c => ({
            ...c,
            factoryConfirmed: true,
            finalQuantity: c.quantity,
            confirmedBy: currentUser.id,
            confirmedAt: now,
            status: 'delivered'
        }));
        await apiService.saveModuleRecords('coop_collections', payloads);
        await handleLogAction(`Bulk confirmed ${pendingCollections.length} collections for rider ${riderId}`);
        await loadData(false, true);
    }, [currentUser, loadData, handleLogAction]);

    const handleAddRider = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        const riderId = `r_${Date.now()}`;
        await apiService.saveModuleRecord('coop_riders', { ...data, id: riderId, institutionId: instId });
        
        await apiService.registerUser({
            name: data.name,
            phoneNumber: data.phone,
            role: 'rider',
            riderId: riderId,
            institutionId: instId,
            email: `${data.phone}@eduai.co.ke`
        }, activeInstitution?.name);
        
        await handleLogAction(`Registered rider: ${data.name}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleConfirmCollection = useCallback(async (id: string, qty: number) => {
        if (!currentUser) return;
        await apiService.confirmCoopCollection(id, qty, currentUser.id);
        const col = coopCollections.find(c => c.id === id);
        const farmer = coopFarmers.find(f => f.id === col?.farmerId);
        if (col && farmer && qty === col.quantity) {
            await apiService.sendSms(farmer.phone, `Your ${col.productType} delivery on ${col.collectionDate} has been confirmed at Factory. Final Qty: ${qty} ${col.unit}. Thank you!`, activeInstitution?.smsConfig, 1, activeInstitution?.id);
        }
        await handleLogAction(`Confirmed collection ${id} with weight ${qty}`);
        await loadData(false, true);
    }, [currentUser, coopCollections, coopFarmers, activeInstitution, loadData, handleLogAction]);

    const handleApproveCollection = useCallback(async (id: string, status: 'approved' | 'rejected') => {
        if (!currentUser) return;
        await apiService.approveCoopCollection(id, currentUser.id, status as any);
        if (status === 'approved') {
            const col = coopCollections.find(c => c.id === id);
            const farmer = coopFarmers.find(f => f.id === col?.farmerId);
            if (col && farmer) {
                await apiService.sendSms(farmer.phone, `Your ${col.productType} delivery discrepancy for ${col.collectionDate} has been RESOLVED and APPROVED by the board. Final Qty: ${col.finalQuantity} ${col.unit}.`, activeInstitution?.smsConfig, 1, activeInstitution?.id);
            }
        }
        await handleLogAction(`Updated status for collection ${id} to ${status}`);
        await loadData(false, true);
    }, [currentUser, coopCollections, coopFarmers, activeInstitution, loadData, handleLogAction]);

    const handleAddCoopIncome = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId || !currentUser) return;
        await apiService.saveCoopIncome({ ...data, id: `inc_${Date.now()}`, institutionId: instId, recordedBy: currentUser.id });
        await handleLogAction(`Recorded cooperative income: ${data.description}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddCoopExpense = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId || !currentUser) return;
        await apiService.saveCoopExpense({ ...data, id: `exp_${Date.now()}`, institutionId: instId, recordedBy: currentUser.id });
        await handleLogAction(`Recorded cooperative expense: ${data.description}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleInitiatePayouts = useCallback(async (data: any) => {
        // Placeholder for payout logic
        await handleLogAction(`Initiated monthly payouts`);
        loadData();
    }, [loadData, handleLogAction]);

    const handleApprovePayouts = useCallback(async (payoutIds: string[]) => {
        try {
            await apiService.updatePayoutStatus(payoutIds, 'approved', currentUser?.id);
            const instId = activeInstitution?.id || currentUser?.institutionId;
            if (instId) {
                await apiService.notifyCoopAdmins(instId, `${payoutIds.length} payout drafts have been approved and are ready for disbursement.`);
            }
            await handleLogAction(`Approved ${payoutIds.length} payouts`);
            await loadData(false, true);
        } catch (err: any) {
            toastError(`Approval failed: ${err.message}`);
            throw err;
        }
    }, [loadData, handleLogAction, activeInstitution, currentUser, toastError]);

    const handleAddLawClient = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('law_clients', { ...data, id: `lc_${Date.now()}`, institutionId: instId });
        await handleLogAction(`Added law client: ${data.name}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddLawMatter = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('law_matters', { ...data, id: `lm_${Date.now()}`, institutionId: instId, status: 'open' });
        await handleLogAction(`Opened law matter: ${data.title}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleUpdateLawMatter = useCallback(async (id: string, data: any) => {
        const matter = lawMatters.find(m => m.id === id);
        if (matter) {
            await apiService.saveModuleRecord('law_matters', { ...matter, ...data });
            await handleLogAction(`Updated law matter: ${matter.title}`);
            await loadData(false, true);
        }
    }, [lawMatters, loadData, handleLogAction]);

    const handleAddLawTimeEntry = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId || !currentUser) return;
        await apiService.saveModuleRecord('law_time_entries', { ...data, id: `lt_${Date.now()}`, institutionId: instId, staffId: currentUser.id });
        await handleLogAction(`Recorded law time entry for matter`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddLawTrustTransaction = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('law_trust_transactions', { ...data, id: `ltt_${Date.now()}`, institutionId: instId });
        await handleLogAction(`Recorded law trust transaction`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddLawInvoice = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('law_invoices', { ...data, id: `li_${Date.now()}`, institutionId: instId });
        await handleLogAction(`Generated law invoice: ${data.invoiceNumber}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddLawAgreementTemplate = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('law_agreement_templates', { ...data, id: `lat_${Date.now()}`, institutionId: instId });
        await handleLogAction(`Added law agreement template: ${data.name}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleGenerateLawAgreement = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('law_agreements', { 
            ...data, 
            id: `la_${Date.now()}`, 
            institutionId: instId, 
            paymentStatus: 'paid',
            reviewStatus: 'pending_approval',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });
        await handleLogAction(`Client generated agreement: ${data.title}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleApproveLawAgreement = useCallback(async (id: string, notes: string) => {
        const ag = (lawAgreements || []).find(a => a.id === id);
        if (ag && currentUser) {
            await apiService.saveModuleRecord('law_agreements', { 
                ...ag, 
                reviewStatus: 'approved', 
                lawyerId: currentUser.id, 
                lawyerNotes: notes,
                updatedAt: new Date().toISOString()
            });
            await handleLogAction(`Approved law agreement: ${ag.title}`);
            await loadData(false, true);
        }
    }, [lawAgreements, currentUser, loadData, handleLogAction]);


    const handleAddPayouts = useCallback(async (payouts: any[]) => {
        try {
            await apiService.saveModuleRecords('coop_monthly_payouts', payouts);
            const instId = activeInstitution?.id || currentUser?.institutionId;
            if (instId) {
                await apiService.notifyCoopAdmins(instId, `New payout drafts (${payouts.length}) have been generated for your review.`);
            }
            await handleLogAction(`Generated ${payouts.length} payout drafts`);
            await loadData(false, true);
        } catch (err: any) {
            toastError(`Draft generation failed: ${err.message}`);
            throw err;
        }
    }, [loadData, handleLogAction, activeInstitution, currentUser, toastError]);

    const handleDisbursePayouts = useCallback(async (payoutIds: string[]) => {
        try {
            // Here you would integrate with M-Pesa or bank APIs
            await apiService.updatePayoutStatus(payoutIds, 'paid', currentUser?.id);
            await handleLogAction(`Disbursed ${payoutIds.length} payouts`);
            await loadData(false, true);
        } catch (err: any) {
            toastError(`Disbursement failed: ${err.message}`);
            throw err;
        }
    }, [loadData, handleLogAction, toastError]);

    const handleDirectAssign = useCallback(async (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections?: Record<string, string[]>) => {
        if (!activeInstitution) return;

        if (!activeAcademicYear || !activeSemester) {
            toastError("Please set an active Academic Year and Semester in Settings before assigning subjects.");
            return;
        }

        const now = new Date().toISOString();
        const promises = subjectIds.map(subjectId => {
            const req: AllocationRequest = {
                id: `ar_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                requesterId: currentUser!.id, // Admin is the requester
                institutionId: activeInstitution.id,
                subjectId,
                lecturerId,
                status: 'approved', // Auto-approved since it's direct assign
                priority,
                justification: justification || 'Direct Assignment by Admin',
                timestamp: now,
                reviewedBy: currentUser!.id,
                reviewedAt: now,
                academicYearId: activeAcademicYear.id,
                semesterId: activeSemester.id,
                courseLevelIds: courseLevelSelections?.[subjectId] || []
            };
            return apiService.saveModuleRecord('allocation_requests', req);
        });

        try {
            await Promise.all(promises);
            await loadData(); // Refresh data
            success("Subjects assigned successfully.");
        } catch (error: any) {
            console.error("Failed to assign subjects:", error);
            toastError(`Failed to assign subjects: ${error.message || "Unknown error"}`);
        }
    }, [activeInstitution, currentUser, loadData, activeAcademicYear, activeSemester, success, toastError]);

    const onGenerateReceipt = useCallback(async (txn: MpesaTransaction) => {
        try {
            const receipt: Receipt = {
                id: `rcpt_${Date.now()}`,
                receiptNumber: `RCPT-${Date.now()}`,
                institutionId: txn.institutionId,
                paymentDate: new Date().toISOString(),
                amountPaid: txn.amount,
                paidFor: txn.description || 'Payment Receipt',
                paymentMethod: 'MPESA',
                relatedTransactionId: txn.id,
                studentId: txn.metadata?.studentId,
            };
            await apiService.saveModuleRecord('receipts', receipt);
            loadData();
            return receipt;
        } catch (e) {
            console.error("Failed to generate receipt", e);
        }
    }, [loadData]);

    const handleGenerateReceipt = onGenerateReceipt;

    const onMarkInventoryReceived = useCallback(async (id: string) => {
        const item = countyInventory.find(i => i.id === id);
        if (item) {
            await apiService.saveModuleRecord('county_inventory', {
                ...item,
                status: 'received',
                lastUpdated: new Date().toISOString()
            });
            loadData();
            success("Inventory received and acknowledged.");
        }
    }, [countyInventory, loadData, success]);

    const onUpdateDemoStatus = useCallback(async (id: string, status: DemoRequest['status']) => {
        try {
            await apiService.updateDemoRequestStatus(id, status);
            setDemoRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
        } catch (e) {
            console.error("Failed to update demo status:", e);
        }
    }, []);

    // --- Allocation Handlers ---

    const handleAllocationChangeRequest = async (requestId: string, justification: string, newPriority: Priority) => {
        await apiService.updateAllocationStatus(requestId, 'change_request_pending', justification, newPriority);
        loadData();
    };

    const handleDeallocationRequest = async (requestId: string, justification: string) => {
        await apiService.updateAllocationStatus(requestId, 'deallocation_pending', justification);
        loadData();
    };

    const handleLecturerRequest = async (subjectIds: string[], justification: string, signatureUrl: string | null, priority: Priority, academicYearId: string, semesterId: string, preferences: AllocationRequestPreferences | undefined, courseLevelSelections: Record<string, string[]>) => {
        if (!currentUser) return false;
        try {
            for (const subjectId of subjectIds) {
                const reqData = { subjectId, lecturerId: currentUser.id, institutionId: currentUser.institutionId, status: 'pending', priority, justification, academicYearId, semesterId, preferences: { ...preferences, courseLevelIds: courseLevelSelections[subjectId] || [] }, signatureUrl, timestamp: new Date().toISOString() };
                await apiService.saveModuleRecord('allocation_requests', reqData);
            }
            loadData();
            return true;
        } catch (e) { return false; }
    };



    const handleGenerateDemoData = useCallback(async () => {
        if (!currentUser || !activeInstitution) return;
        
        setIsGeneratingDemoData(true);
        setDemoDataGenerationMessage("Preparing to generate demo data...");
        setDemoDataGenerationProgress(5);
        
        try {
            const demoData = generateInstitutionalDemoData(activeInstitution.id, currentUser.id);
            
            // Map demoData keys to table names
            const tableMap: Record<string, string> = {
                departments: 'departments',
                buildings: 'buildings',
                rooms: 'rooms',
                academicLevels: 'academic_levels',
                academicYears: 'academic_years',
                semesters: 'semesters',
                users: 'users',
                subjects: 'subjects',
                courses: 'courses',
                allocations: 'allocation_requests',
                timetable: 'timetable_entries',
                inventory: 'inventory',
                visitors: 'visitors',
                securityAlerts: 'security_alerts',
                hisStaff: 'his_staff',
                hisPatients: 'his_patients',
                hisWards: 'his_wards',
                hisBeds: 'his_beds',
                hisAppointments: 'his_appointments',
                hisAttendance: 'his_staff_attendance',
                hisFinancials: 'his_financial_records',
                hisVitals: 'his_vital_statistics',
                hisEvents: 'his_clinical_events',
                coopFarmers: 'coop_farmers',
                coopCollections: 'coop_collections',
                lawClients: 'law_clients',
                lawMatters: 'law_matters',
                pmProperties: 'property_management_properties',
                pmUnits: 'property_management_units',
                fuelTanks: 'fuel_tanks',
                fuelPumps: 'fuel_pumps'
            };

            const dataKeys = Object.keys(demoData).filter(k => k !== 'institutionUpdates');
            let completed = 0;
            
            for (const key of dataKeys) {
                const records = demoData[key as keyof typeof demoData];
                const tableName = tableMap[key] || key;
                
                if (Array.isArray(records) && records.length > 0) {
                    setDemoDataGenerationMessage(`Populating ${tableName}...`);
                    for (const record of records) {
                        await apiService.saveModuleRecord(tableName, record);
                    }
                }
                completed++;
                setDemoDataGenerationProgress(5 + Math.floor((completed / dataKeys.length) * 85));
            }
            
            if (demoData.institutionUpdates) {
                await onUpdateInstitution(activeInstitution.id, demoData.institutionUpdates);
            }
            
            setDemoDataGenerationProgress(100);
            setDemoDataGenerationMessage("Demo data generated successfully.");
            await loadData();
            success("Institutional demo data has been generated successfully.");
        } catch (error) {
            console.error("Demo data generation failed:", error);
            toastError("Failed to generate demo data.");
        } finally {
            setIsGeneratingDemoData(false);
            setDemoDataGenerationProgress(0);
            setDemoDataGenerationMessage("");
        }
    }, [currentUser, activeInstitution, onUpdateInstitution, loadData, success, toastError]);
    



    const handleClearDemoData = useCallback(async () => {
        if (!currentUser || !activeInstitution) return;
        
        const confirmed = window.confirm("Are you sure you want to clear all data for this institution? Your account will be preserved, but all other data will be permanently removed.");
        if (!confirmed) return;

        setIsGeneratingDemoData(true);
        setDemoDataGenerationMessage("Clearing institutional data...");
        setDemoDataGenerationProgress(10);

        try {
            await apiService.clearInstitutionalData(activeInstitution.id, currentUser.id);
            setDemoDataGenerationProgress(100);
            setDemoDataGenerationMessage("Data cleared successfully.");
            
            await loadData();
            success("All institutional data has been cleared.");
        } catch (error) {
            console.error("Failed to clear demo data:", error);
            toastError("Failed to clear data.");
        } finally {
            setIsGeneratingDemoData(false);
            setDemoDataGenerationProgress(0);
            setDemoDataGenerationMessage("");
        }
    }, [currentUser, activeInstitution, loadData, success, toastError]);



    const handleMarkNotificationAsRead = useCallback(async (id: string) => {
        try {
            await apiService.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    }, []);

    const handleAddCounty = useCallback(async (data: Omit<County, 'id' | 'createdAt'>) => {
        try {
            console.log('🏛️ Adding county with data:', data);

            const newCounty: County = {
                ...data,
                id: `county_${Date.now()}`,
                createdAt: new Date().toISOString()
            };

            console.log('🏛️ County object to save:', newCounty);

            const result = await apiService.saveModuleRecord('counties', newCounty);
            console.log('✅ County saved successfully:', result);

            await loadData();
            success('County added successfully!');
        } catch (error: any) {
            console.error('❌ Failed to add county:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint,
                stack: error.stack
            });

            let errorMessage = 'Failed to add county.';

            // Provide specific error messages
            if (error.message?.includes('counties')) {
                if (error.message?.includes('does not exist') || error.code === '42P01') {
                    errorMessage = 'Counties table does not exist. Please run the database migration first.';
                } else if (error.message?.includes('duplicate') || error.code === '23505') {
                    errorMessage = 'A county with this code already exists.';
                } else if (error.message?.includes('permission') || error.code === '42501') {
                    errorMessage = 'Permission denied. Please check your database permissions.';
                }
            }

            toastError(errorMessage + '\n\nCheck the browser console for details.');
        }
    }, [loadData, success, toastError]);

    const handleUpdateCounty = useCallback(async (id: string, data: Partial<County>) => {
        try {
            const existing = counties.find(c => c.id === id);
            if (existing) {
                await apiService.saveModuleRecord('counties', { ...existing, ...data });
                await loadData();
            }
        } catch (error) {
            console.error("Failed to update county:", error);
            toastError("Failed to update county.");
        }
    }, [counties, loadData, toastError]);

    const handleAddCoopAgrovetInventory = useCallback(async (data: any) => {
        try {
            await apiService.saveCoopAgrovetInventory(data);
            await loadData();
            success("Agrovet inventory added successfully.");
        } catch (error: any) {
            console.error("Failed to add Agrovet inventory:", error);
            toastError(`Failed: ${error.message || JSON.stringify(error)}`);
        }
    }, [loadData, success, toastError]);

    const handleAddCoopAgrovetSale = useCallback(async (data: any) => {
        try {
            await apiService.saveCoopAgrovetSale(data);
            await loadData();
            success("Agrovet sale recorded successfully.");
        } catch (error: any) {
            console.error("Failed to record Agrovet sale:", error);
            toastError(`Failed: ${error.message || JSON.stringify(error)}`);
        }
    }, [loadData, success, toastError]);

    const handleDeleteCounty = useCallback(async (id: string) => {
        try {
            await apiService.deleteModuleRecord('counties', id);
            await loadData();
        } catch (error) {
            console.error("Failed to delete county:", error);
            toastError("Failed to delete county.");
        }
    }, [loadData, toastError]);

    const handleAddCountyInstitution = useCallback(async (data: any) => {
        try {
            const instId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const adminId = `u_admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const generatedPassword = Math.random().toString(36).slice(-8);

            const newInstitution: Institution = {
                id: instId,
                name: data.name,
                email: data.email,
                phoneNumber: data.phoneNumber,
                institutionType: data.institutionType as any,
                status: 'active',
                trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                institutionCode: `INST-${Date.now().toString().slice(-4)}`,
                useAllocationRequests: true,
                countyId: data.countyId,
                subCounty: data.subCounty,
                constituency: data.constituency,
                ward: data.ward
            };

            const adminRole: Role = getAdminRoleForInstitution(newInstitution);
            const newAdmin: User = {
                id: adminId,
                name: data.adminName,
                email: data.adminEmail,
                phoneNumber: data.phoneNumber,
                role: adminRole,
                institutionId: instId,
                countyId: data.countyId,
                password: generatedPassword,
                expertise: ['Administration'],
                staffId: 'ADMIN-01'
            };

            await apiService.saveInstitution(newInstitution);
            await apiService.saveUser(newAdmin);

            if (companyDetails.emailConfig?.username) {
                const emailBody = `Dear ${newAdmin.name}, \n\nCongratulations! The ${newInstitution.name} has been successfully registered on the Eduai Automation Management System.\n\nBelow are your login credentials: \nPortal URL: ${window.location.origin} \nEmail: ${newAdmin.email} \nPassword: ${generatedPassword} \n\nPlease change your password upon first login.\n\nBest Regards, \nEduai Automation System`;

                try {
                    await sendEmailNotification(newAdmin.email, "Institution Registration - Account Details", emailBody, getInstitutionEmailConfig(newInstitution, companyDetails.emailConfig));
                } catch (e) {
                    console.error("Email notification failed", e);
                }
            }

            await loadData();
            success(`Institution registered successfully!\n\nAdmin Credentials: \nEmail: ${newAdmin.email} \nPassword: ${generatedPassword} \n\n(Account details have been sent to ${newAdmin.email})`);
        } catch (error: any) {
            console.error("Failed to register institution:", error);
            toastError(`Failed to register institution: ${error.message || 'Unknown error'}`);
        }
    }, [loadData, companyDetails, success, toastError]);

    const handleImportCountyInstitutions = useCallback(async (dataList: any[]) => {
        let successCount = 0;
        let failCount = 0;

        for (const data of dataList) {
            try {
                const instId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const adminId = `u_admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const generatedPassword = Math.random().toString(36).slice(-8);

                const newInstitution: Institution = {
                    id: instId,
                    name: data.name,
                    email: data.email,
                    phoneNumber: data.phoneNumber,
                    institutionType: data.institutionType as any,
                    status: 'active',
                    trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                    institutionCode: `INST-${Date.now().toString().slice(-4)}`,
                    useAllocationRequests: true,
                    countyId: data.countyId
                };

                const adminRole: Role = getAdminRoleForInstitution(newInstitution);
                const newAdmin: User = {
                    id: adminId,
                    name: data.adminName,
                    email: data.adminEmail,
                    phoneNumber: data.phoneNumber || '',
                    role: adminRole,
                    institutionId: instId,
                    password: generatedPassword,
                    expertise: ['Administration'],
                    staffId: 'ADMIN-01'
                };

                await apiService.saveInstitution(newInstitution);
                await apiService.saveUser(newAdmin);

                if (companyDetails.emailConfig?.username) {
                    const emailBody = `Dear ${newAdmin.name}, \n\nCongratulations! The ${newInstitution.name} has been successfully registered on the Eduai Automation Management System.\n\nBelow are your login credentials: \nPortal URL: ${window.location.origin} \nEmail: ${newAdmin.email} \nPassword: ${generatedPassword} \n\nPlease change your password upon first login.\n\nBest Regards, \nEduai Automation System`;

                    try {
                        await sendEmailNotification(newAdmin.email, "Institution Registration - Account Details", emailBody, getInstitutionEmailConfig(newInstitution, companyDetails.emailConfig));
                    } catch (e) {
                        console.error("Email notification failed", e);
                    }
                }
                successCount++;
            } catch (error) {
                console.error("Bulk import item failed:", error);
                failCount++;
            }
        }

        await loadData();
        success(`Bulk Import Complete!\n\nSuccessfully registered: ${successCount} \nFailed: ${failCount}`);
    }, [loadData, companyDetails, success]);


    const commonLoginProps = {
        users, institutions, courses, academicLevels, logoUrl: activeBranding.logoUrl || companyDetails.logoUrl, applicationTitle: activeBranding.displayName || companyDetails.applicationTitle, registrationProgress: null, registrationMessage: "",
        onOpenGuestPortal: () => setShowGuestPortal(true),
        onOpenGuestFeedback: () => setShowGuestFeedback(true),
        onOpenMarketplace: () => setShowMarketplace(true),
        onOpenShowcase: () => setShowMarketing(true),
        onBookDemo: () => setShowBookDemo(true),
        themeColor: companyDetails.themeColor || "#4f46e5",
        onParentRequestOtp: () => ({ success: true, message: '' }), onParentVerifyOtp: () => ({ success: true, message: '' }), companyDetails: companyDetails,
        schoolRegistry: schoolRegistry,
        onCountyRegister: async (data: CountyRegistrationData) => {
            try {
                const countyId = `county_${Date.now()}`;
                const adminPassword = Math.random().toString(36).slice(-8);

                const newCounty: County = {
                    id: countyId,
                    name: data.countyName,
                    code: data.countyCode,
                    email: data.countyEmail,
                    phoneNumber: data.countyPhone,
                    adminName: data.adminName,
                    status: 'active',
                    createdAt: new Date().toISOString()
                };

                const newAdmin: User = {
                    id: `u_admin_${Date.now()}`,
                    name: data.adminName,
                    email: data.adminEmail,
                    phoneNumber: data.countyPhone,
                    institutionId: countyId,
                    role: 'county_admin',
                    password: adminPassword,
                    expertise: ['Administration'],
                    staffId: 'COUNTY_ADMIN'
                };

                await apiService.saveModuleRecord('counties', newCounty);
                await apiService.saveUser(newAdmin);

                await loadData(true);

                if (companyDetails.emailConfig?.username) {
                    const emailBody = `Dear ${newAdmin.name}, \n\nCongratulations! The ${newCounty.name} County Portal has been successfully registered on the Eduai Automation Management System.\n\nBelow are your administrative login credentials: \nPortal URL: ${window.location.origin} \nEmail: ${newAdmin.email} \nPassword: ${adminPassword} \n\nPlease change your password upon first login.\n\nBest Regards, \nEduai Automation System`;
                    try {
                        await sendEmailNotification(newAdmin.email, "County Portal Registration - Account Details", emailBody, getInstitutionEmailConfig(newCounty, companyDetails.emailConfig));
                    } catch (e) {
                        console.error("Email notification failed", e);
                    }
                }

                // Send SMS notification
                if (newAdmin.phoneNumber) {
                    const smsMessage = `Welcome to EduAI Hub. ${newCounty.name} County Portal registration successful. Your Login: Email: ${newAdmin.email}, PIN: ${adminPassword}. Login at ${window.location.origin}`;
                    try {
                        await apiService.sendSms(newAdmin.phoneNumber, smsMessage);
                    } catch (e) {
                        console.error("SMS notification failed", e);
                    }
                }

                return { success: true, message: 'County Portal registered successfully.', credentials: { email: newAdmin.email, password: adminPassword } };
            } catch (error: any) {
                console.error("County Registration Error:", error);
                return { success: false, message: error.message || 'Failed to register county.' };
            }
        },
        onInstitutionRegister: async (data: InstitutionRegistrationData) => {
            try {
                const instId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const adminId = `u_admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
                const generatedPassword = Math.random().toString(36).slice(-8);
                const isResellerSelfReg = data.institutionType === 'Reseller';
                const newInstitution: Institution = {
                    id: instId,
                    name: data.institutionName,
                    email: data.institutionEmail,
                    phoneNumber: data.institutionPhone,
                    institutionType: data.institutionType as any,
                    businessSubType: (data as any).businessSubType,
                    status: isResellerSelfReg ? 'active' : 'trial',
                    trialEndsAt: isResellerSelfReg ? undefined : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                    institutionCode: generateAlphanumericCode(8),
                    useAllocationRequests: true,
                    resellerId: data.resellerId,
                    category: data.category,
                    slug: slugify(data.institutionName)
                };
                const adminRole: Role = getAdminRoleForInstitution(newInstitution);
                const newAdmin: User = { id: adminId, name: data.adminName, email: data.adminEmail, phoneNumber: data.institutionPhone, role: adminRole, institutionId: instId, password: generatedPassword, expertise: ['Administration'], staffId: 'ADMIN-01' };
                await apiService.saveInstitution(newInstitution);
                await apiService.saveUser(newAdmin);
                
                // Temporarily store session to allow authorized creation of demo data/settings
                apiService.storeSession(newAdmin);

                if (data.loadDemoData) {
                    const { generateInstitutionalDemoData } = await import('../utils/demoData');
                    const d = generateInstitutionalDemoData(instId, adminId);
                    // Save in dependency order to avoid foreign key violations
                    // 1. Save departments and buildings first (no dependencies)
                    await Promise.all([
                        ...d.departments.map(x => apiService.saveModuleRecord('departments', x)),
                        ...d.buildings.map(x => apiService.saveModuleRecord('buildings', x)),
                    ]);
                    // 2. Save everything else (depends on departments/buildings)
                    await Promise.all([
                        ...d.rooms.map(x => apiService.saveModuleRecord('rooms', x)),
                        ...d.users.map(x => apiService.saveModuleRecord('users', x)),
                        ...d.subjects.map(x => apiService.saveModuleRecord('subjects', x)),
                        ...d.courses.map(x => apiService.saveModuleRecord('courses', x)),
                    ]);
                }
                await loadData(true);

                if (companyDetails.emailConfig?.username) {
                    const emailBody = `Dear ${newAdmin.name}, \n\nCongratulations! ${newInstitution.name} has been successfully registered on the Eduai Automation Management System.\n\nBelow are your administrative login credentials: \nPortal URL: ${window.location.origin} \nEmail: ${newAdmin.email} \nPassword: ${generatedPassword} \n\nPlease change your password upon first login.\n\nBest Regards, \nEduai Automation System`;
                    try {
                        await sendEmailNotification(newAdmin.email, "Institution Registration - Account Details", emailBody, getInstitutionEmailConfig(newInstitution, companyDetails.emailConfig));
                    } catch (e) {
                        console.error("Email notification failed", e);
                    }
                }

                // Send SMS notification
                if (newAdmin.phoneNumber) {
                    const smsMessage = `Welcome to EduAI Hub. ${newInstitution.name} registration successful. Your Login: Email: ${newAdmin.email}, PIN: ${generatedPassword}. Login at ${window.location.origin}`;
                    try {
                        await apiService.sendSms(newAdmin.phoneNumber, smsMessage);
                    } catch (e) {
                        console.error("SMS notification failed", e);
                    }
                }

                return { success: true, message: 'Registration successful.', credentials: { email: newAdmin.email, password: generatedPassword } };
            } catch (e: any) { return { success: false, message: 'Registration failed: ' + e.message }; }
        },
        onStudentRegister: async () => ({ success: true, message: '' }),
        onForgotPassword: async (identifier: string, method: 'email' | 'phone') => apiService.resetPassword(identifier, method),
        onVerifyResetOtp: async (phone: string, code: string) => apiService.verifyResetOtp(phone, code),
        onResetPassword: async (token: string, pass: string) => apiService.resetPasswordWithToken(token, pass)
    };

    const academicsOfficerProps = useMemo<Partial<AcademicsOfficerProps>>(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution!,
        academicYears,
        semesters,
        academicLevels,
        departments,
        subjects,
        courses,
        users,
        rooms,
        assessments,
        marks: assessmentMarks,
        incidents,
        activeAcademicYear,
        activeSemester,
        examTimetable,
        getSubjectById,
        getLecturerById,
        getRoomById,
        courseSizes,
        timetableSettings: timetableSettings!,
        buildings,
        letterheadConfig: activeLetterheadConfig,
        logoUrl: activeBranding.logoUrl,
        footerImageUrl: activeFooterImageUrl,
        emailConfig: companyDetails.emailConfig,
        smsConfig: companyDetails.smsConfig,
        themeColor: activeBranding.primaryColor,
        examTimetableSettings: activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS,
        lessonRatings,
        schoolRegistry,
        companyDetails,
        onUpdateSubject: handleUpdateSubject,
        onUpdateCourse: handleUpdateCourse,
        onAddRoom: handleAddRoom,
        onUpdateRoom: handleUpdateRoom,
        onDeleteRoom: handleDeleteRoom,
        onImportRooms: handleImportRooms,
        onAddDepartment: handleAddDepartment,
        onUpdateDepartment: handleUpdateDepartment,
        onDeleteDepartment: handleDeleteDepartment,
        onImportDepartments: handleImportDepartments,
        onAddAssessment: handleAddAssessment,
        onDeleteAssessment: handleDeleteAssessment,
        onSaveAssessmentMarks: handleSaveAssessmentMarks,
        onAddIncident: async (d) => { await apiService.saveModuleRecord('discipline_incidents', { ...d, id: `disc_${Date.now()}`, institutionId: currentUser?.institutionId }); loadData(); },
        onExamTimetableGenerated: handleExamTimetableGenerated
    }), [currentUser, activeInstitution, academicYears, semesters, academicLevels, departments, subjects, courses, users, rooms, assessments, assessmentMarks, incidents, activeAcademicYear, activeSemester, examTimetable, getSubjectById, getLecturerById, getRoomById, courseSizes, timetableSettings, buildings, activeLetterheadConfig, activeBranding, activeFooterImageUrl, companyDetails, lessonRatings, schoolRegistry, handleUpdateSubject, handleUpdateCourse, handleAddRoom, handleUpdateRoom, handleDeleteRoom, handleImportRooms, handleAddDepartment, handleUpdateDepartment, handleDeleteDepartment, handleImportDepartments, handleAddAssessment, handleDeleteAssessment, handleSaveAssessmentMarks, handleExamTimetableGenerated]);

    const lecturerProps = useMemo<Partial<LecturerProps>>(() => ({
        user: currentUser || undefined,
        users,
        courses,
        subjects,
        rooms,
        academicYears,
        semesters,
        requests,
        generatedTimetable,
        getSubjectById,
        getRoomById,
        timetableSettings: timetableSettings!,
        assignments,
        submissions,
        teacherCheckIns,
        observationNotes,
        timeOffRequests,
        userTasks,
        assessments,
        assessmentMarks,
        studentAttendances,
        onSubmitRequest: handleLecturerSubmitRequest,
        onAllocationChangeRequest: handleUpdateRequest,
        onWithdrawRequest: handleWithdrawRequest,
        onAddAssignment: handleAddAssignment,
        onDeleteAssignment: handleDeleteAssignment,
        onAddFeedback: handleAddFeedback,
        onTeacherLessonCheckIn: handleTeacherLessonCheckIn,
        onAddObservationNote: handleAddObservationNote,
        onAddTimeOffRequest: handleAddTimeOffRequest,
        onAddTask: handleAddTask,
        onUpdateTask: handleUpdateTask,
        onDeleteTask: handleDeleteTask,
        onSaveAttendance: handleSaveAttendance,
        onAccessAlumnaPortal: handleAccessAlumnaPortal
    }), [currentUser, users, courses, subjects, rooms, academicYears, semesters, requests, generatedTimetable, getSubjectById, getRoomById, timetableSettings, assignments, submissions, teacherCheckIns, observationNotes, timeOffRequests, userTasks, assessments, assessmentMarks, studentAttendances, handleAddRequest, handleUpdateRequest, handleWithdrawRequest, handleAddAssignment, handleDeleteAssignment, handleAddFeedback, handleTeacherLessonCheckIn, handleAddObservationNote, handleAddTimeOffRequest, handleAddTask, handleUpdateTask, handleDeleteTask, handleSaveAttendance, handleAccessAlumnaPortal]);

    const parentProps = useMemo<Partial<ParentProps>>(() => ({
        user: currentUser || undefined,
        users,
        subjects,
        getSubjectById,
        generatedTimetable,
        examTimetable,
        letterheadConfig: activeLetterheadConfig,
        logoUrl: activeBranding.logoUrl,
        footerImageUrl: activeFooterImageUrl,
        transportOnboarding,
        vehicles,
        invoices,
        receipts,
        studentAbsenceRequests,
        assessments,
        assessmentMarks
    }), [currentUser, users, subjects, getSubjectById, generatedTimetable, examTimetable, activeLetterheadConfig, activeBranding, activeFooterImageUrl, transportOnboarding, vehicles, invoices, receipts, studentAbsenceRequests, assessments, assessmentMarks]);

    const superAdminProps = useMemo(() => ({
        currentInstitution: activeInstitution,
        isTimetableGenerating: false,
        timetableGenerationProgress: 0,
        timetableGenerationMessage: "",
        timetableGenerationEta: null,
        currentUser: currentUser!,
        notifications,
        institutions,
        counties,
        users,
        subjects,
        departments,
        courses,
        companyDetails,
        onAccessAlumnaPortal: handleAccessAlumnaPortal,
        onUpdateCompanyDetails: handleUpdateCompanyDetails,
        transactions,
        demoRequests,
        onUpdateDemoStatus,
        receipts,
        activityLogLimit,
        setActivityLogLimit,
        transactionLimit,
        setTransactionLimit,
        receiptLimit,
        setReceiptLimit,
        notificationLimit,
        setNotificationLimit,
        activityLog,
        onImportUsers,
        onImportStudents,
        onDeleteUser,
        onEditUser,
        onRunAlumniMigration: async () => { /* Migration Logic */ },
        onAddInstitution: async (d: any) => { 
             const newId = (d as any).id || `inst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; 
             const now = new Date().toISOString();
             await apiService.saveInstitution({ ...d, id: newId, createdAt: now, updatedAt: now } as any); 
             const role = d.institutionType === 'Reseller' ? 'reseller' : 'admin'; 
             await apiService.registerUser({ id: `u_${Date.now()}`, name: `${d.name} Admin`, email: d.email, phoneNumber: d.phoneNumber, role: role as any, institutionId: newId, status: 'active', createdAt: now, updatedAt: now } as any, d.name); 
             loadData(); 
        },
        onUpdateInstitution,
        onDeleteInstitution: (id: string) => { if (id) onDeleteInstitution(id); },
        onToggleInstitutionStatus,
        onLoginAsAdmin,
        allocations,
        requests,
        semesters,
        letterheadConfig: activeLetterheadConfig,
        footerImageUrl: activeFooterImageUrl,
        onSendSms: async (r: string, m: string, config?: any, units?: number, instId?: string) => { 
            const res = await apiService.sendSms(r, m, config, units, instId); 
            await handleLogAction(`Sent SMS to ${r}`); 
            return res; 
        },
        onRefreshData: async () => await loadData(false, true),
        onAddCounty: handleAddCounty,
        onUpdateCounty: handleUpdateCounty,
        onDeleteCounty: handleDeleteCounty,
        rooms,
        buildings,
        academicLevels,
        academicYears,
        activeAcademicYear,
        activeSemester,
        timetableSettings,
        examTimetableSettings: activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS,
        assessments,
        assessmentMarks,
        incidents,
        schoolRegistry,
        onAddAssessment: handleAddAssessment,
        onDeleteAssessment: handleDeleteAssessment,
        onSaveAssessmentMarks: handleSaveAssessmentMarks,
        onTimetableGenerated: async (entries: any, ay: string, sem: string) => apiService.saveTimetable(currentUser!.institutionId, ay, sem, entries),
        onExamTimetableGenerated: async (entries: any, ay: string, sem: string) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries),
        onAddSubject: handleAddSubject,
        onUpdateSubject: handleUpdateSubject,
        onDeleteSubject: handleDeleteSubject,
        onAddCourse: handleAddCourse,
        onUpdateCourse: handleUpdateCourse,
        onDeleteCourse: handleDeleteCourse,
        onImportCourses: handleImportCourses,
        onAddUser: async (userData: any) => {
            const targetInstitutionId = userData.institutionId || (currentUser?.role === 'super_admin' ? (activeInstitution?.id || 'SYSTEM') : currentUser?.institutionId);
            await apiService.registerUser({ ...userData, id: generateUserId(), institutionId: targetInstitutionId }, activeInstitution?.name);
            loadData();
        },
        onAddAcademicYear: async (data: any) => { await apiService.saveModuleRecord('academic_years', { ...data, id: generateId('ay'), institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); },
        onAddSemester: async (data: any) => { await apiService.saveModuleRecord('semesters', { ...data, id: generateId('sem'), institutionId: currentUser!.institutionId }); loadData(); },
        onAddDepartment: handleAddDepartment,
        onUpdateDepartment: handleUpdateDepartment,
        onDeleteDepartment: handleDeleteDepartment,
        onImportDepartments: handleImportDepartments,
        onAddBuilding: handleAddBuilding,
        onUpdateBuilding: handleUpdateBuilding,
        onDeleteBuilding: handleDeleteBuilding,
        onAddRoom: handleAddRoom,
        onUpdateRoom: handleUpdateRoom,
        onDeleteRoom: handleDeleteRoom,
        onImportRooms: handleImportRooms,
        onAddAcademicLevel: handleAddAcademicLevel,
        onUpdateAcademicLevel: handleUpdateAcademicLevel,
        onDeleteAcademicLevel: handleDeleteAcademicLevel,
        onUpdateRequest: handleUpdateRequest,
        onWithdrawRequest: handleWithdrawRequest,
        onAddIncident: async (data: any) => {
            await apiService.saveModuleRecord('discipline_incidents', { ...data, id: `disc_${Date.now()}`, institutionId: currentUser!.institutionId, timestamp: new Date().toISOString(), recordedBy: currentUser!.name });
            await handleLogAction(`[SA] Recorded incident for ${data.studentName}`);
            loadData();
        },
        logoUrl: activeBranding.logoUrl,
        leaveOutRequests,
        finalTimetableUrl: null,
        themeColor: activeBranding.primaryColor,
        invoices,
        extensionRequests,
        voteHeads,
        feeStructures,
        financialPeriods,
        userTasks,
        generatedTimetable,
        allTimetableEntries: generatedTimetable,
        timetableConflicts,
        onUpdateLogo: (logo: string) => onUpdateInstitution(activeInstitution!.id, { logoUrl: logo }),
        onUpdateFooterImage: (footer: string) => onUpdateInstitution(activeInstitution!.id, { footerImageUrl: footer }),
        onSaveLetterheadConfig: (config: any) => onUpdateInstitution(activeInstitution!.id, { letterheadConfig: config }),
        onUpdateThemeColor: (color: string) => onUpdateInstitution(activeInstitution!.id, { themeColor: color }),
        onUpdateExtensionRequestStatus: handleUpdateExtensionRequestStatus,
        onAddTransaction: apiService.onAddTransaction.bind(apiService),
        onAddExtensionRequest: handleAddExtensionRequest,
        timeOffRequests,
        onAddTimeOffRequest: handleAddTimeOffRequest,
        onUpdateTimeOffRequestStatus: async () => { },
        enrollmentRequests,
        absenceRequests,
        studentAbsenceRequests,
        securityAlerts,
        visitors,
        requisitions,
        studentAttendances,
        studentCheckIns,
        lessonRatings,
        feedbackSubmissions,
        courseSizes,
        isGeneratingDemoData,
        demoDataGenerationProgress,
        demoDataGenerationMessage,
        onGenerateDemoData: handleGenerateDemoData,
        onClearDemoData: handleClearDemoData,
        onSwitchPerspective: (role: Role | null) => setImpersonatedRole(role),
        getRoomById,
        onLogAction: handleLogAction,
        vehicles,
        transportOnboarding,
        onAddVehicle: handleAddVehicle,
        onUpdateVehicle: handleUpdateVehicle,
        onDeleteVehicle: handleDeleteVehicle,
        onLogGateAction: handleLogGateAction,
        onOnboardStudent: handleOnboardStudent,
        onOffboardStudent: handleOffboardStudent,
        onConfirmReceipt: handleConfirmReceipt,
        coopFarmers,
        coopCollections,
        coopRiders,
        coopAgrovetSales,
        saccoAccounts,
        coopPayouts,
        coopExpenses,
        coopIncome,
        onAddFarmer: handleAddFarmer,
        onUpdateFarmer: handleUpdateFarmer,
        onImportFarmers: handleImportFarmers,
        onLogCollection: handleLogCollection,
        onImportCollections: handleImportCollections,
        onBulkConfirmCollections: handleBulkConfirmCollections,
        onAddRider: handleAddRider,
        onConfirmCollection: handleConfirmCollection,
        onApproveCollection: handleApproveCollection,
        onAddCoopExpense: handleAddCoopExpense,
        onAddCoopIncome: handleAddCoopIncome,
        onInitiatePayouts: handleInitiatePayouts,
        onApprovePayouts: handleApprovePayouts,
        onAddPayouts: handleAddPayouts,
        lawClients,
        lawMatters,
        lawDocuments,
        lawTimeEntries,
        lawInvoices,
        lawTrustTransactions,
        onAddLawClient: handleAddLawClient,
        onAddLawMatter: handleAddLawMatter,
        onAddLawTimeEntry: handleAddLawTimeEntry,
        onAddLawTrustTransaction: handleAddLawTrustTransaction,
        onAddLawInvoice: handleAddLawInvoice,
        onUpdateLawMatter: handleUpdateLawMatter,
        lawAgreementTemplates,
        lawAgreements,
        onAddLawAgreementTemplate: handleAddLawAgreementTemplate,
        onGenerateLawAgreement: handleGenerateLawAgreement,
        onApproveLawAgreement: handleApproveLawAgreement,



        carListings,
        carTestDrives,
        carAppraisals,
        carInvoices,
        carPayments,
        onAddCarInvoice: async (data: Partial<CarInvoice>) => {
            const instId = activeInstitution?.id || currentUser?.institutionId;
            await apiService.saveCarInvoice({ ...data, id: `inv_${Date.now()}`, institutionId: instId || '' });
            await loadData();
        },
        onAddCarPayment: async (data: Partial<CarPayment>) => {
            const instId = activeInstitution?.id || currentUser?.institutionId;
            await apiService.saveCarPayment({ ...data, id: `pay_${Date.now()}`, institutionId: instId || '' });
            await loadData();
        },
        onAddCarListing: async (data: Partial<CarListing>) => {
            const instId = activeInstitution?.id || currentUser?.institutionId;
            await apiService.saveCarListing({ ...data, id: `v_${Date.now()}`, institutionId: instId || '' });
            await loadData();
        },
        onUpdateCarTestDriveStatus: async (id: string, status: any) => {
            const existing = carTestDrives.find(t => t.id === id);
            if (existing) {
                await apiService.saveCarTestDrive({ ...existing, status });
                await loadData();
            }
        },
        onAddCarAppraisal: async (data: Partial<CarAppraisal>) => {
            const instId = activeInstitution?.id || currentUser?.institutionId;
            await apiService.saveCarAppraisal({ ...data, id: `appr_${Date.now()}`, institutionId: instId || '' });
            await loadData();
        }
    }), [currentUser, activeInstitution, notifications, institutions, counties, users, subjects, departments, courses, companyDetails, transactions, demoRequests, receipts, activityLog, allocations, requests, semesters, activeLetterheadConfig, activeBranding, activeFooterImageUrl, rooms, buildings, academicLevels, academicYears, activeAcademicYear, activeSemester, timetableSettings, assessments, assessmentMarks, incidents, schoolRegistry, leaveOutRequests, invoices, extensionRequests, voteHeads, feeStructures, financialPeriods, userTasks, generatedTimetable, timetableConflicts, timeOffRequests, enrollmentRequests, absenceRequests, studentAbsenceRequests, securityAlerts, visitors, requisitions, studentAttendances, studentCheckIns, lessonRatings, feedbackSubmissions, courseSizes, isGeneratingDemoData, demoDataGenerationProgress, demoDataGenerationMessage, vehicles, transportOnboarding, coopFarmers, coopCollections, coopRiders, coopAgrovetSales, saccoAccounts, coopPayouts, coopExpenses, coopIncome, lawClients, lawMatters, lawDocuments, lawTimeEntries, lawInvoices, lawTrustTransactions, lawAgreementTemplates, lawAgreements, carListings, carTestDrives, carAppraisals, carInvoices, carPayments, handleAccessAlumnaPortal, handleUpdateCompanyDetails, onImportStudents, onEditUser, onDeleteUser, onUpdateInstitution, handleUpdateRequest, handleWithdrawRequest, handleAddTimeOffRequest, handleAddTask, handleUpdateTask, handleDeleteTask, handleSaveAttendance, handleProcessPayroll, handleUpdateLeaveStatus, handleLogGateAction, handleTeacherLessonCheckIn, handleOnboardStudent, handleOffboardStudent, handleAddAssessment, handleDeleteAssessment, handleSaveAssessmentMarks, handleAddSubject, handleUpdateSubject, handleDeleteSubject, handleAddCourse, handleUpdateCourse, handleDeleteCourse, handleImportCourses, handleAddDepartment, handleUpdateDepartment, handleDeleteDepartment, handleImportDepartments, handleAddRoom, handleUpdateRoom, handleDeleteRoom, handleImportRooms, loadData]);


    const countyAdminProps = useMemo<Partial<CountyAdminProps>>(() => ({
        currentUser: currentUser || undefined,
        counties,
        institutions,
        users,
        onLogout: handleLogout,
        onUpdateInstitution,
        onAccessAlumnaPortal: handleAccessAlumnaPortal,
        onGenerateReceipt: handleGenerateReceipt,
        onUpdateCounty: handleUpdateCounty,
        onAddInstitution: handleAddCountyInstitution,
        onLoginAsAdmin,
        onImportInstitutions: handleImportCountyInstitutions,
        onUpdateUser: onEditUser,
        onDeleteUser,
        inventoryItems: countyInventory,
        inventoryCategories: countyInventoryCategories,
        stores: countyStores,
        bursaryApplications,
        bursaryFunds,
        onLogAction: handleLogAction,
        activityLogLimit,
        setActivityLogLimit,
        receiptLimit,
        setReceiptLimit,
        transactionLimit,
        setTransactionLimit
    }), [currentUser, counties, institutions, users, onUpdateInstitution, activeLetterheadConfig, activeBranding, activeFooterImageUrl, countyInventory, countyInventoryCategories, countyStores, bursaryApplications, bursaryFunds, activityLogLimit, receiptLimit, transactionLimit]);

    const hrOfficerProps = useMemo<Partial<HROfficerProps>>(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution || undefined,
        users,
        payrollRecords,
        leaveRequests: timeOffRequests as any[],
        onProcessPayroll: handleProcessPayroll,
        onUpdateLeaveStatus: handleUpdateLeaveStatus
    }), [currentUser, activeInstitution, users, payrollRecords, timeOffRequests, handleProcessPayroll, handleUpdateLeaveStatus]);

    const financeOfficerProps = useMemo<Partial<FinanceOfficerProps>>(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution || undefined,
        invoices,
        receipts,
        expenses,
        goals: financialGoals,
        feeStructures,
        students: users.filter(u => u.role === 'student'),
        academicYears,
        semesters,
        receiptLimit,
        setReceiptLimit,
        transactionLimit,
        setTransactionLimit,
        transactions,
        onLogAction: handleLogAction
    }), [currentUser, activeInstitution, invoices, receipts, expenses, financialGoals, feeStructures, users, academicYears, semesters, receiptLimit, transactionLimit, transactions]);

    const supportStaffProps = useMemo<Partial<SupportStaffProps>>(() => ({
        user: currentUser || undefined,
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution || undefined,
        users,
        visitors,
        onAddVisitor: handleAddVisitor,
        onCheckoutVisitor: handleCheckoutVisitor,
        onAddAppointment: handleAddAppointment,
        onUpdateVisitor: handleUpdateVisitor,
        generatedTimetable,
        timetableSettings: timetableSettings!,
        rooms,
        subjects,
        getSubjectById,
        getRoomById,
        getLecturerById,
        securityAlerts,
        onAddAlert: handleAddAlert,
        onResolveAlert: handleResolveAlert,
        onAddIncident: async (d: any) => { await apiService.saveModuleRecord('discipline_incidents', { ...d, id: `disc_${Date.now()}`, institutionId: currentUser?.institutionId }); loadData(); },
        appointments,
        onUpdateAppointmentStatus: handleUpdateAppointmentStatus,
        inventory: retailInventory,
        stockTransactions: stockTransactions,
        suppliers,
        onAddItem: handleAddStoreItem,
        onAddSupplier: handleAddSupplier,
        onAddItems: handleImportStoreItems,
        onAddStoreTransaction: handleAddStoreTransaction,
        transactions,
        invoices,
        receipts,
        requisitions,
        onLogAction: handleLogAction,
        vehicles,
        vehicleLogs,
        transportOnboarding,
        onLogGateAction: handleLogGateAction,
        onAddInvoice: handleAddInvoice,
        onAddReceipt: handleAddReceipt,
        onVerifyRequisition: handleVerifyRequisition,
        companyDetails,
        courses,
        onUpdateInstitution,
        voteHeads,
        feeStructures,
        financialPeriods,
        countyInventory,
        onMarkInventoryReceived: handleMarkInventoryReceived,
        academicYears,
        semesters,
        departments,
        teacherCheckIns,
        timeOffRequests,
        studentAbsenceRequests,
        leaveOutRequests,
        bulletinItems,
        documentCollections,
        watchlist,
        maintenanceRequests,
        studentAttendances,
        onOnboardStudent: handleOnboardStudent,
        onOffboardStudent: handleOffboardStudent,
        onSwitchPerspective: (role: Role | null) => setImpersonatedRole(role),
        onAddUser: async (d: any) => { if (!currentUser) return; await apiService.registerUser({ ...d, id: generateUserId(), institutionId: currentUser.institutionId }, activeInstitution?.name); loadData(); },
        onEditUser,
        onDeleteUser,
        onAddDepartment: handleAddDepartment,
        onUpdateDepartment: handleUpdateDepartment,
        onDeleteDepartment: handleDeleteDepartment,
        onImportStudents: handleImportStudents,
        smsConfig: activeInstitution?.smsConfig || companyDetails.smsConfig,
        letterheadConfig: activeLetterheadConfig,
        logoUrl: activeBranding.logoUrl,
        footerImageUrl: activeFooterImageUrl,
        onSendSms: async (r: string, m: string, c?: any, u?: number, i?: string) => apiService.sendSms(r, m, c, u, i),
        onAddTransaction: apiService.onAddTransaction.bind(apiService),
        onRefreshData: async () => await loadData(false, true),
        onAccessAlumnaPortal: handleAccessAlumnaPortal,
        schoolRegistry
    }), [currentUser, activeInstitution, users, visitors, handleAddVisitor, handleCheckoutVisitor, handleAddAppointment, handleUpdateVisitor, generatedTimetable, timetableSettings, rooms, subjects, getSubjectById, getRoomById, getLecturerById, securityAlerts, handleAddAlert, handleResolveAlert, appointments, handleUpdateAppointmentStatus, retailInventory, stockTransactions, suppliers, handleAddStoreItem, handleAddSupplier, handleImportStoreItems, handleAddStoreTransaction, transactions, invoices, handleAddInvoice, receipts, handleAddReceipt, requisitions, handleVerifyRequisition, handleMarkInventoryReceived, handleLogAction, vehicles, vehicleLogs, transportOnboarding, handleLogGateAction, companyDetails, courses, onUpdateInstitution, voteHeads, feeStructures, financialPeriods, countyInventory, academicYears, semesters, departments, teacherCheckIns, timeOffRequests, studentAbsenceRequests, leaveOutRequests, bulletinItems, documentCollections, watchlist, maintenanceRequests, studentAttendances, handleOnboardStudent, handleOffboardStudent, onEditUser, onDeleteUser, activeLetterheadConfig, activeBranding, activeFooterImageUrl, schoolRegistry, onImportStudents]);

    const boardingMasterProps = useMemo(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution!,
        users,
        rooms,
        buildings,
        leaveOutRequests,
        incidents,
        onUpdateLeaveOutStatus: async (id: string, status: string) => { const existing = leaveOutRequests.find(r => r.id === id); if (existing) { await apiService.saveModuleRecord('leave_out_requests', { ...existing, status, approvedBy: currentUser?.id, updatedAt: new Date().toISOString() }); loadData(); } },
        onAddIncident: async (data: any) => {
            await apiService.saveModuleRecord('discipline_incidents', {
                ...data,
                id: `disc_${Date.now()}`,
                institutionId: currentUser?.institutionId,
                timestamp: new Date().toISOString(),
                recordedBy: currentUser?.name
            });
            loadData();
        },
        onLogAction: handleLogAction,
    }), [currentUser, activeInstitution, users, rooms, buildings, leaveOutRequests, incidents, handleLogAction]);

    const carWashProps = useMemo(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution!,
        jobs,
        onLogAction: handleLogAction,
    }), [currentUser, activeInstitution, jobs, handleLogAction]);

    const farmerPortalProps = useMemo(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution!,
        farmers: coopFarmers,
        collections: coopCollections,
        agrovetInventory: coopAgrovetInventory,
        agrovetSales: coopAgrovetSales,
        saccoAccounts,
        saccoTransactions,
        onLogAction: handleLogAction,
    }), [currentUser, activeInstitution, coopFarmers, coopCollections, coopAgrovetInventory, coopAgrovetSales, saccoAccounts, saccoTransactions, handleLogAction]);

    const riderPortalProps = useMemo(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution!,
        riders: coopRiders,
        collections: coopCollections,
        onLogAction: handleLogAction,
    }), [currentUser, activeInstitution, coopRiders, coopCollections, handleLogAction]);

    const tenantPortalProps = useMemo(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution!,
        onLogAction: handleLogAction,
    }), [currentUser, activeInstitution, handleLogAction]);

    const landlordPortalProps = useMemo(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution!,
        onLogAction: handleLogAction,
    }), [currentUser, activeInstitution, handleLogAction]);

    const propertyManagementProps = useMemo(() => ({
        currentUser: currentUser || undefined,
        currentInstitution: activeInstitution!,
        onLogAction: handleLogAction,
    }), [currentUser, activeInstitution, handleLogAction]);

    // ── EARLY ESCAPE: Public join-campaign URL — skip auth & boot entirely ──
    if (window.location.search.includes('view=join-campaign')) {
        const joinCampaignId = new URLSearchParams(window.location.search).get('id') || '';
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <CampaignJoinPage campaignId={joinCampaignId} onBack={() => { window.location.href = '/'; }} />
            </Suspense>
        );
    }

    if (appInitializing || isTransitioning) return (
        <SystemPulseLoader 
            message={isTransitioning ? "Establishing secure perspective link..." : (loadError ? "System Handshake Compromised" : (isAlumnaeMode ? "Connecting to Alumnae Network..." : "Establishing secure cloud registry link..."))} 
            status={isTransitioning ? "Synchronizing Session Buffers..." : (loadError || loadStatus || "Synchronizing Neural Buffers...")} 
            onRetry={loadError ? () => loadData(true) : undefined} 
        />
    );
    if (isSchemaInitializationRequired) return <SchemaInitializationView onComplete={() => loadData(true)} />;
    
    // Safety guard: ensure activeInstitution is loaded for institution-dependent roles
    const isInstitutionRole = currentUser && !['super_admin', 'county_admin'].includes(activeRole || '') && !activeRole?.startsWith('county_');

    if (isInstitutionRole && !activeInstitution && institutions.length > 0 && !currentUser?.isImpersonated) {
        // We have data but didn't find the institution. This might be a tenancy sync issue or a deleted institution.
        return (
            <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 text-center">
                <ShieldExclamationIcon className="w-16 h-16 text-amber-500 mb-4 animate-pulse" />
                <h2 className="text-white text-xl font-black uppercase tracking-widest mb-2">Workspace Conflict</h2>
                <p className="text-slate-400 text-sm max-w-md mb-8">
                    Your account is associated with a workspace that cannot be found or accessed. 
                    Please verify your credentials or contact system support.
                </p>
                <button onClick={handleLogout} className="bg-white text-slate-900 px-8 py-3 rounded-2xl font-black uppercase transition-all hover:scale-105 active:scale-95">
                    Terminal Shutdown (Logout)
                </button>
            </div>
        );
    }
    
    if (isInstitutionRole && !activeInstitution) {
        return <SystemPulseLoader message="Workspace Synchronizing..." status="Fetching Registry Identity from Cloud Hub" />;
    }


    if (currentUser && activeRole !== 'super_admin' && !currentUser.isImpersonated) {
        const inst = institutions.find(i => i.id === currentUser.institutionId);
        if (inst && inst.status === 'suspended') {
            return <SuspendedAccountView user={currentUser} institution={inst} companyDetails={companyDetails} onLogout={handleLogout} onAddTransaction={apiService.onAddTransaction.bind(apiService)} onAddExtensionRequest={async (reason) => {
                await apiService.saveModuleRecord('institution_extension_requests', {
                    id: `ext_${Date.now()}`,
                    institutionId: inst.id,
                    requesterId: currentUser.id,
                    reason,
                    status: 'pending',
                    requestedAt: new Date().toISOString()
                });
                loadData();
            }} />;
        }

        const trialEnded = inst && inst.status === 'trial' && inst.trialEndsAt && new Date(inst.trialEndsAt) < new Date();
        if (trialEnded) {
            return (
                <TrialExpiredView
                    user={currentUser}
                    institution={inst}
                    companyDetails={companyDetails}
                    onLogout={handleLogout}
                    onPay={async (paymentData, items) => {
                        const status = await apiService.onAddTransaction({
                            ...paymentData,
                            institutionId: inst.id,
                            provider: 'mpesa',
                            paymentMethod: 'stk'
                        } as any, items);
                        if (status === 'completed') loadData();
                        return status;
                    }}
                    onRequestExtension={async (reason) => {
                        await apiService.saveModuleRecord('institution_extension_requests', {
                            id: `ext_${Date.now()}`,
                            institutionId: inst.id,
                            requesterId: currentUser.id,
                            reason,
                            status: 'pending',
                            requestedAt: new Date().toISOString()
                        });
                        loadData();
                    }}
                />
            );
        }
        if (!currentUser.passwordLastUpdated && !currentUser.id.startsWith('demo_') && !currentUser.id.startsWith('temp_admin_') && currentUser.role !== 'super_admin' && !originalSuperAdminSession && !isSimulatorMode) {
            return <MandatoryUpdateView user={currentUser} onUpdate={async (pData, passData) => {
                try {
                    const updated = { ...currentUser, ...pData, password: passData.newPassword, passwordLastUpdated: new Date().toISOString() };
                    await apiService.saveUser(updated);
                    setCurrentUser(updated);
                    apiService.storeSession(updated);
                    // Explicitly reload all data to ensure other components pick up the change
                    await loadData();
                } catch (err: any) {
                    toastError(`Failed to activate account: ${err.message || 'Unknown error'}`);
                }
            }} onLogout={handleLogout} logoUrl={activeBranding.logoUrl} />;
        }
    }




    return (
        <AppErrorBoundary>
            {targetManageLessonId ? (
                <PublicLessonConfirmationView 
                    lessonId={targetManageLessonId} 
                    onClose={() => { window.location.href = '/'; }} 
                />
            ) : (
                <>
            {currentUser && (
                <style dangerouslySetInnerHTML={{ __html: `
                    :root {
                        --brand-primary: ${activeBranding.primaryColor};
                        --brand-secondary: ${activeBranding.secondaryColor};
                    }
                `}} />
            )}
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col">
                {currentUser ? (
                    <>
                        <Header
                            currentUser={currentUser}
                            institutionName={activeBranding.displayName}
                            onLogout={handleLogout}
                            onEditProfile={() => setIsProfileModalOpen(true)}
                            logoUrl={activeBranding.logoUrl}
                            systemLogoUrl={companyDetails.logoUrl}
                            notifications={notifications}
                            onMarkAsRead={(id) => { if (id) handleMarkNotificationAsRead(id); }}
                            currentInstitution={activeInstitution}
                            primaryColor={activeBranding.primaryColor}
                            secondaryColor={activeBranding.secondaryColor}
                            isApiOnline={isApiOnline}
                            applicationTitle={companyDetails.applicationTitle}
                            activeRole={activeRole as Role}
                            onSwitchRole={(r) => setSelectedRole(r)}
                            onExitPerspective={impersonatedRole ? () => setImpersonatedRole(null) : undefined}
                            onToggleHealthSystem={() => setIsHealthSystemOpen(!isHealthSystemOpen)}
                            onTogglePharmacySystem={() => setIsPharmacySystemOpen(!isPharmacySystemOpen)}
                            isHealthSystemOpen={isHealthSystemOpen}
                            isPharmacySystemOpen={isPharmacySystemOpen}
                            hidePerspectiveSwitcher={isAutoMarket}
                        />
                        <main className={`flex-grow mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full transition-all duration-300 ${isFullWidthLayout ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
                            <Suspense fallback={<SystemPulseLoader message="Initializing Portal..." status="Loading perspective environment" />}>
                                {isPharmacySystemOpen || (activeRole === 'pharmacist' || activeRole === 'pharmacy_admin' || (activeRole === 'admin' && (['Pharmacy', 'Chemist'].includes(activeInstitution?.institutionType || '') || ['Pharmacy', 'Chemist'].includes(activeInstitution?.businessSubType || '') || ['Pharmacy', 'Chemist'].includes(activeInstitution?.category || '')))) ? (
                                    <div className="p-8 bg-slate-950 min-h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl">
                                        <ModernPharmacyManager 
                                             institutionId={activeInstitution?.id || currentUser?.institutionId || ''} 
                                             currentUser={currentUser!}
                                         />
                                    </div>
                                ) : (isHealthSystemOpen || activeRole === 'his_admin') ? (
                                    <HealthCoreView 
                                        activeRole={activeRole as Role} 
                                        userName={currentUser?.name} 
                                        institutionId={activeInstitution?.id || currentUser?.institutionId}
                                    />
                                ) : activeRole === 'super_admin' ? (
                                    <DrivingSchoolProvider institutionId={activeInstitution?.id}>
                                        <SuperAdminView {...{
                                            ...superAdminProps,
                                            payrollRecords: payrollRecords as any
                                        } as any}
                                        />
                                    </DrivingSchoolProvider>
                                ) : (activeRole === 'county_admin' || activeRole?.startsWith('county_')) ? (
                                    <CountyAdminView {...{
                                        ...countyAdminProps,
                                        currentUser,
                                        counties,
                                        institutions,
                                        users,
                                        onLogout: handleLogout,
                                        onUpdateInstitution,
                                        onAccessAlumnaPortal: handleAccessAlumnaPortal,
                                        onGenerateReceipt: handleGenerateReceipt,
                                        onUpdateCounty: handleUpdateCounty,
                                        onAddInstitution: handleAddCountyInstitution,
                                        onLoginAsAdmin,
                                        onImportInstitutions: handleImportCountyInstitutions,
                                        onAddUser: async (data: any) => { await apiService.registerUser({ ...data, id: `u_county_${Date.now()}` }, 'County Portal'); loadData(); },
                                        onUpdateUser: onEditUser,
                                        onDeleteUser: onDeleteUser,
                                        inventoryItems: countyInventory,
                                        inventoryCategories: countyInventoryCategories,
                                        onAddInventoryItem: async (data: any) => {
                                            const id = data.id || `cinv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                                            await apiService.saveModuleRecord('county_inventory', { ...data, id });
                                            loadData();
                                        },
                                        onUpdateInventoryItem: async (id: string, data: any) => { await apiService.saveModuleRecord('county_inventory', { ...data, id }); loadData(); },
                                        onDeleteInventoryItem: async (id: string) => { await apiService.deleteModuleRecord('county_inventory', id); loadData(); },
                                        onAddInventoryCategory: async (data: any) => { const id = data.id || `cat_${Date.now()}`; await apiService.saveModuleRecord('county_inventory_categories', { ...data, id }); loadData(); },
                                        onUpdateInventoryCategory: async (id: string, data: any) => { await apiService.saveModuleRecord('county_inventory_categories', { ...data, id }); loadData(); },
                                        onDeleteInventoryCategory: async (id: string) => { await apiService.deleteModuleRecord('county_inventory_categories', id); loadData(); },
                                        stores: countyStores,
                                        onAddStore: async (data: any) => { const id = data.id || `store_${Date.now()}`; await apiService.saveModuleRecord('county_stores', { ...data, id }); loadData(); },
                                        onUpdateStore: async (id: string, data: any) => { await apiService.saveModuleRecord('county_stores', { ...data, id }); loadData(); },
                                        onDeleteStore: async (id: string) => { await apiService.deleteModuleRecord('county_stores', id); loadData(); },
                                        onAddStockTransaction: async (data: any) => { await apiService.saveModuleRecord('county_stock_transactions', { ...data, id: `ctx_${Date.now()}` }); loadData(); },
                                        bursaryApplications,
                                        bursaryFunds,
                                        onAddBursaryFund: async (data: any) => { await apiService.saveModuleRecord('county_bursary_funds', { ...data, id: `fund_${Date.now()}`, createdAt: new Date().toISOString() }); loadData(); },
                                        onUpdateBursaryApplication: async (id: string, data: any) => { const app = bursaryApplications.find(a => a.id === id); if (app) { await apiService.saveModuleRecord('bursary_applications', { ...app, ...data, updatedAt: new Date().toISOString() }); loadData(); } },
                                        onLogAction: handleLogAction,
                                        activityLogLimit,
                                        setActivityLogLimit,
                                        receiptLimit,
                                        setReceiptLimit,
                                        transactionLimit,
                                        setTransactionLimit
                                    } as any}
                                    />
                                ) : activeRole === 'academics_officer' ? (
                                    <AcademicsOfficerView {...academicsOfficerProps as AcademicsOfficerProps}
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        academicYears={academicYears}
                                        semesters={semesters}
                                        academicLevels={academicLevels}
                                        departments={departments}
                                        subjects={subjects}
                                        onUpdateSubject={handleUpdateSubject}
                                        courses={courses}
                                        onUpdateCourse={handleUpdateCourse}
                                        users={users}
                                        rooms={rooms}
                                        onAddRoom={handleAddRoom}
                                        onUpdateRoom={handleUpdateRoom}
                                        onDeleteRoom={handleDeleteRoom}
                                        onImportRooms={handleImportRooms}
                                        onAddDepartment={handleAddDepartment}
                                        onUpdateDepartment={handleUpdateDepartment}
                                        onDeleteDepartment={handleDeleteDepartment}
                                        onImportDepartments={handleImportDepartments}
                                        assessments={assessments}
                                        marks={assessmentMarks}
                                        incidents={incidents}
                                        onAddAssessment={async (d: any) => { await apiService.saveModuleRecord('assessments', { ...d, id: `asm_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                        onDeleteAssessment={async (id: string) => { await apiService.deleteModuleRecord('assessments', id); loadData(); }}
                                        onSaveAssessmentMarks={async (id: string, marks: any[]) => {
                                            const promises = marks.map(m => {
                                                const existing = assessmentMarks.find(markRecord => markRecord.assessmentId === id && markRecord.studentId === m.studentId);
                                                const recordId = existing ? existing.id : `am_${id}_${m.studentId}_${Date.now()}`;
                                                return apiService.saveModuleRecord('assessment_marks', {
                                                    id: recordId,
                                                    assessmentId: id,
                                                    studentId: m.studentId,
                                                    marks: m.marks,
                                                    comments: m.comments,
                                                    gradedBy: currentUser.id,
                                                    timestamp: new Date().toISOString(),
                                                    institutionId: currentUser.institutionId
                                                });
                                            });
                                            await Promise.all(promises);
                                            loadData();
                                        }}
                                        onAddIncident={async (data: any) => {
                                            await apiService.saveModuleRecord('discipline_incidents', {
                                                ...data,
                                                id: `disc_${Date.now()}`,
                                                institutionId: currentUser!.institutionId,
                                                timestamp: new Date().toISOString(),
                                                recordedBy: currentUser!.name
                                            });
                                            loadData();
                                        }}
                                        activeAcademicYear={activeAcademicYear}
                                        activeSemester={activeSemester}
                                        onExamTimetableGenerated={async (entries: any, ay: string, sem: string) => { await apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries); loadData(); }}
                                        examTimetable={examTimetable}
                                        getSubjectById={getSubjectById}
                                        getLecturerById={getLecturerById}
                                        getRoomById={getRoomById}
                                        courseSizes={courseSizes}
                                        timetableSettings={timetableSettings!}
                                        onSaveTimetableSettings={(config: any) => onUpdateInstitution(activeInstitution!.id, { timetableSettings: config })}
                                        buildings={buildings}
                                        onAddBuilding={handleAddBuilding}
                                        onUpdateBuilding={handleUpdateBuilding}
                                        onDeleteBuilding={handleDeleteBuilding}
                                        letterheadConfig={activeLetterheadConfig}
                                        logoUrl={activeBranding.logoUrl}
                                        footerImageUrl={activeFooterImageUrl}
                                        emailConfig={companyDetails.emailConfig}
                                        onSaveEmailConfig={(config: any) => onUpdateInstitution(activeInstitution!.id, { emailConfig: config })}
                                        onSendTestEmail={async (r: string) => ({ success: true, message: 'Test email functionality bypassed.' })}
                                        smsConfig={companyDetails.smsConfig}
                                        themeColor={activeBranding.primaryColor}
                                        examTimetableSettings={activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                                        onSaveExamTimetableSettings={(config: any) => onUpdateInstitution(activeInstitution!.id, { examTimetableSettings: config })}
                                        lessonRatings={lessonRatings}
                                        onTimetableGenerated={async (entries: any, ay: string, sem: string) => { await apiService.saveTimetable(currentUser!.institutionId, ay, sem, entries as any); loadData(); }}
                                        onLogAction={handleLogAction}
                                        schoolRegistry={schoolRegistry}
                                        companyDetails={companyDetails}
                                        onAccessAlumnaPortal={handleAccessAlumnaPortal}
                                    />
                                ) : activeRole === 'lecturer' ? (
                                    <LecturerView {...{
                                        ...lecturerProps,
                                        user: currentUser,
                                        users,
                                        courses,
                                        subjects,
                                        rooms,
                                        academicYears,
                                        semesters,
                                        requests,
                                        generatedTimetable,
                                        onSubmitRequest: async (subjectIds: string[], justification: string, signatureUrl: string | null, priority: Priority, academicYearId: string, semesterId: string, preferences: any, levels: any) => {
                                            await apiService.saveModuleRecord('allocation_requests', {
                                                id: `req_${Date.now()}`,
                                                lecturerId: currentUser.id,
                                                subjectIds,
                                                justification,
                                                signatureUrl,
                                                priority,
                                                academicYearId,
                                                semesterId,
                                                status: 'pending',
                                                createdAt: new Date().toISOString(),
                                                institutionId: currentUser.institutionId,
                                                preferences,
                                                courseLevelSelections: levels
                                            });
                                            await loadData();
                                            return true;
                                        },
                                        onWithdrawRequest: async (id: string) => { await apiService.deleteModuleRecord('allocation_requests', id); loadData(); },
                                        getSubjectById,
                                        getRoomById,
                                        timetableSettings: timetableSettings!,
                                        assignments,
                                        submissions,
                                        onAddAssignment: async (d: any) => { await apiService.saveModuleRecord('assignments', { ...d, id: `asn_${Date.now()}`, institutionId: currentUser.institutionId }); loadData(); },
                                        onDeleteAssignment: async (id: string) => { await apiService.deleteModuleRecord('assignments', id); loadData(); },
                                        onUpdateSubmission: async (sid: string, f: string) => { const sub = submissions.find(x => x.id === sid); if (sub) { await apiService.saveModuleRecord('submissions', { ...sub, feedback: f, gradedAt: new Date().toISOString() }); loadData(); } },
                                        teacherCheckIns,
                                        onTeacherLessonCheckIn: handleTeacherLessonCheckIn,
                                        observationNotes,
                                        onAddObservationNote: async (n: any) => { await apiService.saveModuleRecord('observation_notes', { ...n, id: `obs_${Date.now()}`, lecturerId: currentUser.id, timestamp: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); },
                                        timeOffRequests,
                                        onAddTimeOffRequest: handleAddTimeOffRequest,
                                        userTasks,
                                        onAddTask: async (t: any) => { await apiService.saveModuleRecord('tasks', { ...t, userId: currentUser.id, id: `t_${Date.now()}`, createdAt: new Date().toISOString() }); loadData(); },
                                        onUpdateTask: async (id: string, c: boolean) => { const task = userTasks.find(x => x.id === id); if (task) { await apiService.saveModuleRecord('tasks', { ...task, isComplete: c }); loadData(); } },
                                        onDeleteTask: async (id: string) => { await apiService.deleteModuleRecord('tasks', id); loadData(); },
                                        assessments,
                                        assessmentMarks,
                                        onAddAssessment: async (d: any) => { await apiService.saveModuleRecord('assessments', { ...d, id: `asm_${Date.now()}`, institutionId: currentUser.institutionId }); loadData(); },
                                        onSaveAssessmentMarks: async (aid: string, marks: any[]) => {
                                            for (const m of marks) {
                                                const existing = assessmentMarks.find(markRecord => markRecord.assessmentId === aid && markRecord.studentId === m.studentId);
                                                await apiService.saveModuleRecord('assessment_marks', {
                                                    id: existing ? existing.id : `am_${aid}_${m.studentId}_${Date.now()}`,
                                                    assessmentId: aid,
                                                    studentId: m.studentId,
                                                    marks: m.marks,
                                                    comments: m.comments,
                                                    institutionId: currentUser.institutionId,
                                                    gradedBy: currentUser.id,
                                                    timestamp: new Date().toISOString()
                                                });
                                            }
                                            loadData();
                                        },
                                        studentAttendances,
                                        onSaveAttendance: handleSaveAttendance,
                                        onAccessAlumnaPortal: handleAccessAlumnaPortal
                                    } as any}
                                    />
                                ) : activeRole === 'student' ? (
                                    <StudentView
                                        user={currentUser}
                                        users={users}
                                        courses={courses}
                                        subjects={subjects}
                                        rooms={rooms}
                                        enrollmentRequests={enrollmentRequests}
                                        generatedTimetable={generatedTimetable}
                                        examTimetable={examTimetable}
                                        getSubjectById={getSubjectById}
                                        getRoomById={getRoomById}
                                        getLecturerById={getLecturerById}
                                        timetableSettings={timetableSettings!}
                                        studentCheckIns={studentCheckIns}
                                        onStudentLessonCheckIn={onStudentLessonCheckIn}
                                        letterheadConfig={activeLetterheadConfig}
                                        footerImageUrl={activeFooterImageUrl}
                                        logoUrl={activeBranding.logoUrl}
                                        buildings={buildings}
                                        onAddParent={async (sid: string, p: any) => apiService.saveModuleRecord('users', { ...p, role: 'parent', id: `u_par_${Date.now()}`, institutionId: currentUser.institutionId, studentIds: [sid] }).then(() => ({ success: true, message: 'Parent added.' }))}
                                        onDeleteParent={() => { }}
                                        departments={departments}
                                        onSubmitEnrollmentRequest={async (sids, sig) => { }}
                                        assignments={assignments}
                                        submissions={submissions}
                                        onAddSubmission={async (d) => { await apiService.saveModuleRecord('submissions', { ...d, id: `subm_${Date.now()}`, institutionId: currentUser.institutionId }); }}
                                        lessonRatings={lessonRatings}
                                        onAddLessonRating={() => { }}
                                        onRateLesson={() => { }}
                                        onAddFeedback={() => { }}
                                        feedbackSubmissions={feedbackSubmissions}
                                        studentAbsenceRequests={studentAbsenceRequests}
                                        onSubmitStudentAbsenceRequest={() => { }}
                                        finalTimetableUrl={null}
                                        taAssignments={[]} 
                                        userTasks={userTasks}
                                        onAddTask={() => { }}
                                        onUpdateTask={() => { }}
                                        onDeleteTask={() => { }}
                                        currentInstitution={activeInstitution}
                                        assessments={assessments}
                                        assessmentMarks={assessmentMarks}
                                        studentAttendances={studentAttendances}
                                        onAccessAlumnaPortal={handleAccessAlumnaPortal}
                                        books={books}
                                    />
                                ) : activeRole === 'parent' ? (
                                    <ParentView {...{
                                        ...parentProps,
                                        user: currentUser,
                                        users,
                                        subjects,
                                        getSubjectById,
                                        generatedTimetable,
                                        examTimetable,
                                        letterheadConfig: activeLetterheadConfig,
                                        logoUrl: activeBranding.logoUrl,
                                        footerImageUrl: activeFooterImageUrl,
                                        transportOnboarding,
                                        vehicles,
                                        onConfirmReceipt: handleConfirmReceipt,
                                        invoices,
                                        receipts,
                                        onAddTransaction: apiService.onAddTransaction.bind(apiService),
                                        onGenerateReceipt,
                                        studentAbsenceRequests,
                                        onSubmitStudentAbsenceRequest: async (req: any) => { await apiService.saveModuleRecord('student_absence_requests', { ...req, id: `sar_${Date.now()}`, status: 'pending', createdAt: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); },
                                        assessments,
                                        assessmentMarks,
                                        onAccessAlumnaPortal: handleAccessAlumnaPortal
                                    } as any}
                                    />
                                ) : (activeRole === 'librarian' || (activeRole === 'staff' && activeInstitution?.institutionType === 'Library')) ? (
                                    <LibraryMasterView
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        companyDetails={companyDetails}
                                        users={users}
                                        academicYears={academicYears}
                                        semesters={semesters}
                                        courses={courses}
                                        departments={departments}
                                        onLogAction={handleLogAction}
                                    />
                                ) : activeRole === 'security' ? (
                                    <SecurityView
                                        {...{
                                            currentUser,
                                            currentInstitution: activeInstitution!,
                                            securityAlerts,
                                            visitors,
                                            vehicles,
                                            vehicleLogs,
                                            onAddVisitor: async (v: any) => { await apiService.saveModuleRecord('visitors', { ...v, id: `vis_${Date.now()}`, status: 'pending', entryTime: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); },
                                            onUpdateVisitor: async (id: string, data: any) => { const existing = visitors.find(v => v.id === id); if (existing) { await apiService.saveModuleRecord('visitors', { ...existing, ...data }); loadData(); } },
                                            onLogGateAction: handleLogGateAction,
                                            onAddAlert: async (a: any) => { await apiService.saveModuleRecord('security_alerts', { ...a, id: `alt_${Date.now()}`, status: 'active', timestamp: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); },
                                            onResolveAlert: async (id: string) => { const existing = securityAlerts.find(a => a.id === id); if (existing) { await apiService.saveModuleRecord('security_alerts', { ...existing, status: 'resolved' }); loadData(); } },
                                            onLogAction: handleLogAction
                                        } as any}
                                    />
                                ) : activeRole === 'info_desk' ? (
                                    <InfoDeskView
                                        {...{
                                            currentUser,
                                            currentInstitution: activeInstitution!,
                                            visitors,
                                            appointments,
                                            onAddVisitor: async (v: any) => { await apiService.saveModuleRecord('visitors', { ...v, id: `vis_${Date.now()}`, status: 'pending', entryTime: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); },
                                            onAddAppointment: async (a: any) => { await apiService.saveModuleRecord('appointments', { ...a, id: `apt_${Date.now()}`, status: 'scheduled', createdAt: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); },
                                            onUpdateAppointment: async (id: string, status: any) => { const existing = appointments.find(a => a.id === id); if (existing) { await apiService.saveModuleRecord('appointments', { ...existing, status }); loadData(); } },
                                            onLogAction: handleLogAction
                                        } as any}
                                    />
                                ) : activeRole === 'store' ? (
                                    <StoreView
                                        {...{
                                            currentUser,
                                            currentInstitution: activeInstitution!,
                                            inventory: retailInventory,
                                            requisitions,
                                            onAddItem: async (i: any) => { await apiService.saveModuleRecord('inventory', { ...i, id: `inv_${Date.now()}`, institutionId: currentUser.institutionId }); loadData(); },
                                            onUpdateRequisition: async (id: string, data: any) => { const existing = retailInventory.find(i => i.id === id); if (existing) { await apiService.saveModuleRecord('inventory', { ...existing, ...data }); loadData(); } },
                                            onAddRequisition: handleAddRequisition,
                                            onLogAction: handleLogAction
                                        } as any}
                                    />
                                ) : activeRole === 'finance_officer' ? (
                                    <FinanceOfficerView
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        invoices={invoices}
                                        receipts={receipts}
                                        transactions={transactions}
                                        onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                        onGenerateReceipt={onGenerateReceipt}
                                        onLogAction={handleLogAction}
                                        receiptLimit={receiptLimit}
                                        setReceiptLimit={setReceiptLimit}
                                        transactionLimit={transactionLimit}
                                        setTransactionLimit={setTransactionLimit}
                                    />
                                ) : activeRole === 'hr_officer' ? (
                                    <HROfficerView 
                                        {...{
                                            currentUser,
                                            currentInstitution: activeInstitution || undefined,
                                            users,
                                            payrollRecords: payrollRecords as any,
                                            onAddUser: async (u: any) => { await apiService.registerUser({ ...u, id: generateUserId(), institutionId: currentUser.institutionId }, activeInstitution?.name); loadData(); },
                                            onUpdateUser: onEditUser,
                                            onDeleteUser: onDeleteUser,
                                            onLogAction: handleLogAction
                                        } as any}
                                    />
                                ) : activeRole === 'boarding_master' ? (
                                    <BoardingMasterView {...boardingMasterProps as any}
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        users={users}
                                        rooms={rooms}
                                        buildings={buildings}
                                        leaveOutRequests={leaveOutRequests}
                                        incidents={incidents}
                                        onUpdateLeaveOutStatus={async (id, status) => { const existing = leaveOutRequests.find(r => r.id === id); if (existing) { await apiService.saveModuleRecord('leave_out_requests', { ...existing, status, approvedBy: currentUser.id, updatedAt: new Date().toISOString() }); loadData(); } }}
                                        onAddIncident={async (data) => {
                                            await apiService.saveModuleRecord('discipline_incidents', {
                                                ...data,
                                                id: `disc_${Date.now()}`,
                                                institutionId: currentUser!.institutionId,
                                                timestamp: new Date().toISOString(),
                                                recordedBy: currentUser!.name
                                            });
                                            loadData();
                                        }}
                                        onLogAction={handleLogAction}
                                    />
                                ) : activeRole === 'transport_assistant' ? (
                                    <TransportAssistantView
                                        {...{
                                            currentUser,
                                            currentInstitution: activeInstitution!,
                                            vehicles,
                                            transportOnboarding,
                                            vehicleLogs,
                                            onLogGateAction: handleLogGateAction,
                                            onOnboardStudent: handleOnboardStudent,
                                            onOffboardStudent: handleOffboardStudent,
                                            onLogAction: handleLogAction
                                        } as any}
                                    />
                                ) : (activeRole === 'carwash_admin' || activeRole === 'carwash_cashier') ? (
                                    <CarWashView {...carWashProps as any}
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        jobs={jobs}
                                        onAddJob={async (j) => { await apiService.saveModuleRecord('car_wash_jobs', { ...j, id: `job_${Date.now()}`, status: 'pending', createdAt: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); }}
                                        onUpdateJobStatus={async (id, status) => { const existing = jobs.find(x => x.id === id); if (existing) { await apiService.saveModuleRecord('car_wash_jobs', { ...existing, status }); loadData(); } }}
                                        onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                        onLogAction={handleLogAction}
                                    />
                                ) : (activeRole === 'landlord' || activeRole === 'tenant' || activeRole === 'property_admin' || (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('property management'))) ? (
                                    activeRole === 'tenant' ? (
                                        <TenantPortalView {...({} as any)} {...tenantPortalProps as any} 
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            onLogAction={handleLogAction}
                                        />
                                    ) : activeRole === 'landlord' ? (
                                        <LandlordPortalView {...({} as any)} {...landlordPortalProps as any}
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            onLogAction={handleLogAction}
                                        />
                                    ) : (
                                        <PropertyManagementView {...({} as any)} {...propertyManagementProps as any}
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            onLogAction={handleLogAction}
                                        />
                                    )
                                ) : (activeRole === 'farmer' || activeRole === 'rider' || activeRole === 'coop_admin') ? (
                                    activeRole === 'farmer' ? (
                                        <FarmerPortal {...({} as any)} {...farmerPortalProps as any} 
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            onLogAction={handleLogAction}
                                        />
                                    ) : activeRole === 'rider' ? (
                                        <RiderPortal {...({} as any)} {...riderPortalProps as any}
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            onLogAction={handleLogAction}
                                        />
                                    ) : (
                                        <DrivingSchoolProvider institutionId={activeInstitution?.id}>
                                            <AdminView
                                                {...superAdminProps as any}
                                                currentUser={currentUser}
                                                currentInstitution={activeInstitution}
                                                activeRole={activeRole as any}
                                                onLogAction={handleLogAction}
                                                onRefreshData={loadData}
                                            />
                                        </DrivingSchoolProvider>
                                    )
                                ) : (activeRole === 'church_admin' || activeRole === 'church_member') ? (
                                    <ChurchDenominationProvider church={activeInstitution!}>
                                        <ChurchDashboard />
                                    </ChurchDenominationProvider>
                                ) : activeRole === 'reseller' ? (
                                    <ResellerDashboard
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        onImpersonate={onLoginAsAdmin}
                                        companyDetails={companyDetails}
                                        transactions={transactions}
                                        invoices={invoices}
                                    />
                                ) : (activeRole === 'agrovet_admin' || (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('agrovet'))) ? (
                                    <AgrovetView
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        users={users.filter(u => u.institutionId === currentUser.institutionId)}
                                        onDataChange={loadData}
                                    />
                                ) : (activeRole === 'construction_admin' || (isAdminCatchAll && (activeInstitution?.institutionType === 'Construction' || activeInstitution?.category?.includes('Construction')))) ? (
                                    <ConstructionManager 
                                        currentInstitution={activeInstitution!}
                                        users={users.filter(u => u.institutionId === currentUser.institutionId)}
                                    />
                                ) : (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('fuel station')) ? (
                                    <FuelStationDashboard 
                                        institution={activeInstitution!}
                                    />
                                ) : (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('civil manufacturing')) ? (
                                    <CivilWorksDashboard />
                                ) : (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('industrial logistics')) ? (
                                    <LogisticsDashboard />
                                ) : (isAdminCatchAll || (activeRole === 'admin' && activeInstitution?.institutionType === 'Driving School')) ? (
                                    <DrivingSchoolProvider institutionId={activeInstitution?.id}>
                                        {(() => { console.log("[App] Rendering DS Manager for institutionId:", activeInstitution?.id); return null; })()}
                                        <AdminView
                                             {...superAdminProps as any}
                                             currentUser={currentUser}
                                             currentInstitution={activeInstitution}
                                             activeRole={(activeRole as any) || undefined}
                                             onLogAction={handleLogAction}
                                             onRefreshData={loadData}
                                             onSaveTimetableSettings={(c) => onUpdateInstitution(activeInstitution!.id, { timetableSettings: c })}
                                         />
                                    </DrivingSchoolProvider>
                                ) : null}
                        </Suspense>
                    </main>
                    </>
                ) : (
                    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                        {showTenantStore && activeStoreTenantId ? (
                            (() => {
                                const targetInst = institutions.find(inst => inst.id === activeStoreTenantId || inst.slug === activeStoreTenantId);
                                 if (targetInst?.institutionType === 'Hospitality') {
                                    return <HospitalityStorefront institutionId={activeStoreTenantId} />;
                                } else if (targetInst?.institutionType === 'Construction') {
                                    return <ConstructionProjectView institutionId={activeStoreTenantId} />;
                                } else if (targetInst?.institutionType === 'Education' || targetInst?.institutionType === 'Primary' || targetInst?.institutionType === 'Secondary') {
                                    return <SchoolStorefrontView institutionId={activeStoreTenantId} onEnrollmentClick={() => setShowAlumnaeRegister(true)} />;
                                } else if (targetInst?.institutionType === 'Political Campaign') {
                                    return <CampaignJoinPage campaignId={activeStoreTenantId} onBack={() => setShowTenantStore(false)} />;
                                }
                                return <TenantStorefrontView institutionId={activeStoreTenantId} />;
                            })()
                         ) : showCommunityHub ? (
                            <CommunityHubView 
                                 institutions={institutions}
                                 counties={counties}
                                 onBack={() => setShowCommunityHub(false)}
                                 onBookDemo={() => setShowBookDemo(true)}
                                 hasActiveAlumnaSession={!!activeAlumna}
                                 hasActiveCampaignSession={!!activeCampaignMember}
                                 onEnterCircle={() => {
                                    setShowAlumnaePortal(true);
                                    setShowCommunityHub(false);
                                 }}
                                 onEnterWarRoom={(profile) => {
                                     setActiveCampaignProfile(profile);
                                     if (activeCampaignMember) {
                                         setShowCampaignPortal(true);
                                     } else {
                                         setShowCampaignLogin(true);
                                     }
                                     setShowCommunityHub(false);
                                 }}
                             />
                         ) : showTransportHub ? (
                            <TransportHubView 
                                institutions={institutions}
                                onBack={() => setShowTransportHub(false)}
                            />
                         ) : showMarketplace ? (
                            <PropertyMarketplaceView carListings={carListings} />
                         ) : window.location.search.includes('view=join-campaign') ? (
                            <CampaignJoinPage 
                                campaignId={new URLSearchParams(window.location.search).get('id') || ''} 
                                onBack={() => window.location.href = '/?view=community'}
                            />
                         ) : window.location.search.includes('view=travel') ? (
                            <HospitalityMarketplace 
                                institutions={institutions}
                                onBack={() => window.location.href = '/?view=community'}
                                onViewStore={(id) => window.location.href = `/?shop=${id}`}
                            />
                        ) : showAlumnaeActivation ? (
                            <AlumnaeActivationView 
                                onFinish={() => {
                                    setShowAlumnaeActivation(false);
                                    if (activeAlumna && !activeAlumna.password) {
                                        setShowAlumnaeSecureAccount(true);
                                    } else {
                                        setShowAlumnaePortal(true);
                                    }
                                }}
                            />
                        ) : showTermsOfService ? (
                            <Suspense fallback={<SystemPulseLoader message="Loading Terms of Service..." />}>
                                <TermsOfService />
                            </Suspense>
                        ) : showPrivacyPolicy ? (
                            <Suspense fallback={<SystemPulseLoader message="Loading Security Policy..." />}>
                                <PrivacyPolicy />
                            </Suspense>
                        ) : showAlumnaeRegister ? (
                            <AlumnaeRegistrationView 
                                registry={schoolRegistry}
                                initialSchool={selectedRegistrySchool}
                                onCheckAdmission={async (admNo, schoolId) => {
                                    // Discovery check scoped to the specific school to allow duplicate IDs across different institutions
                                    const filters: any = { 
                                        admission_number: admNo,
                                        school_id: schoolId
                                    };
                                    
                                    const existing = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, { filter: filters });
                                    if (existing && existing.length > 0) {
                                        return { exists: true, message: 'This admission number is already registered for this school.' };
                                    }
                                    return { exists: false };
                                }}
                                onBackToPortal={() => {
                                    window.location.href = '/?view=community';
                                }}
                                joiningFee={companyDetails?.alumnaeJoiningFee || 0}
                                feeEnabled={companyDetails?.portalSettings?.alumnaeRegistrationFeeEnabled !== false}
                                onInitiatePayment={async (amount, phone, reference, schoolId) => {
                                    try {
                                        const school = schoolRegistry.find(s => s.id === schoolId);
                                        const instId = school?.institutionId || 'GLOBAL';

                                        const res = await apiService.initiateNcbaPayment(
                                            amount,
                                            phone,
                                            { 
                                                type: 'alumnae_registration', 
                                                reference, 
                                                schoolId, 
                                                invoiceId: reference,
                                                institutionId: instId 
                                            },
                                            companyDetails?.ncbaConfig
                                        );
                                        
                                        // Robustly extract the checkout ID regardless of gateway or backend wrapping
                                        const extractedId = res.checkoutRequestId || res.checkoutRequestID || res.checkout_request_id || res.id || res.requestId || res.data?.CheckoutRequestID || res.data?.checkoutRequestId || res.CheckoutRequestID;
                                        
                                        return { 
                                            success: res.success !== false && !!extractedId, 
                                            message: res.message || res.CustomerMessage || res.ResponseDescription || 'Prompt initiated', 
                                            checkoutRequestId: extractedId 
                                        };
                                    } catch (e: any) {
                                        return { success: false, message: e.message };
                                    }
                                }}
                                onCheckPaymentStatus={async (checkoutRequestId) => {
                                    return apiService.checkPaymentStatus('ncba', checkoutRequestId, companyDetails?.ncbaConfig);
                                }}
                                onComplete={async (data) => {
                                    try {
                                        const school = schoolRegistry.find(s => s.id === data.schoolId);
                                        let profilePhotoUrl = '';

                                        if (data.profilePictureFile) {
                                            const uploadRes = await apiService.uploadToGoogleDrive(data.profilePictureFile, 'Alumnae_Profiles', {
                                                institutionId: school?.institutionId,
                                                useGlobalConfig: !school?.institutionId
                                            });
                                            if (uploadRes.success) profilePhotoUrl = (uploadRes.url as string) || '';
                                        }

                                        const registrationPayload: any = {
                                            ...data,
                                            fullName: (data.fullName || '').trim(),
                                            admissionNumber: (data.admissionNumber || '').trim(),
                                            email: (data.email || '').toLowerCase().trim(),
                                            id: `alumna_${Date.now()}`,
                                            institutionId: (school?.institutionId && institutions.some(i => i.id === school.institutionId)) ? school.institutionId : null,
                                            schoolId: data.schoolId || null,
                                            status: 'verified', // Auto-approve
                                            profilePhotoUrl: profilePhotoUrl,
                                            paymentId: data.paymentId || null,
                                            registrationFee: companyDetails?.alumnaeJoiningFee || 0,
                                            joinedAt: new Date().toISOString(),
                                            // Implement Auto-Featured status for 30 days as a welcome gift
                                            isFeatured: true,
                                            featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                                        };
                                        
                                        // Clean up internal file reference before saving
                                        delete registrationPayload.profilePictureFile;

                                        await apiService.saveModuleRecord('alumnae_members', registrationPayload);
                                        
                                        // Generate Invoice and Receipt for the payment
                                        const amount = companyDetails?.alumnaeJoiningFee || 0;
                                        if (amount > 0 && data.paymentId) {
                                            const invoiceId = `INV_AL_${Date.now()}`;
                                            const receiptId = `REC_AL_${Date.now()}`;
                                            const internalTransactionId = `txn_al_${Date.now()}`;

                                            const invoiceData = {
                                                id: invoiceId,
                                                invoiceNumber: `AL-INV-${generateAlphanumericCode(6)}`,
                                                institutionId: (school?.institutionId && institutions.some(i => i.id === school.institutionId)) ? school.institutionId : (institutions[0]?.id || 'GLOBAL'),
                                                studentId: registrationPayload.id,
                                                items: [{ description: 'Alumnae Network Lifetime Service Fee', quantity: 1, unitPrice: amount, total: amount }],
                                                totalAmount: amount,
                                                status: 'paid',
                                                date: new Date().toISOString(),
                                                dueDate: new Date().toISOString()
                                            };

                                            const receiptData = {
                                                id: receiptId,
                                                receiptNumber: `AL-REC-${generateAlphanumericCode(6)}`,
                                                institutionId: (school?.institutionId && institutions.some(i => i.id === school.institutionId)) ? school.institutionId : (institutions[0]?.id || 'GLOBAL'),
                                                invoiceId: invoiceId,
                                                amountPaid: amount,
                                                paymentDate: new Date().toISOString(),
                                                paymentMethod: 'MPESA',
                                                relatedTransactionId: internalTransactionId,
                                                paidBy: registrationPayload.fullName,
                                                paidFor: 'Alumnae Activation Service Fee'
                                            };

                                            const transactionData = {
                                                id: internalTransactionId,
                                                transactionId: data.paymentId,
                                                institutionId: (school?.institutionId && institutions.some(i => i.id === school.institutionId)) ? school.institutionId : (institutions[0]?.id || 'GLOBAL'),
                                                amount: amount,
                                                phoneNumber: registrationPayload.phoneNumber,
                                                payerName: registrationPayload.fullName,
                                                status: 'completed',
                                                provider: 'ncba',
                                                timestamp: new Date().toISOString(),
                                                description: 'Alumnae Network Activation Service Fee',
                                                referenceId: `ALUMNA_${registrationPayload.admissionNumber}`
                                            };

                                            await Promise.all([
                                                apiService.saveModuleRecord('invoices', invoiceData),
                                                apiService.saveModuleRecord('receipts', receiptData),
                                                apiService.saveModuleRecord('mpesa_transactions', transactionData)
                                            ]);

                                            // Trigger Notifications (Email & SMS)
                                            const emailSubject = `Payment Confirmation: Alumnae Network Activation`;
                                            const emailBody = `Dear ${registrationPayload.fullName},\n\nThank you for activating your membership in the ${school?.name || 'Alumnae'} Network.\n\nPayment Details:\n- Amount: KES ${amount.toLocaleString()}\n- Receipt: ${receiptData.receiptNumber}\n- Transaction ID: ${data.paymentId}\n\nYou can now access the social portal and connect with your alma mater.\n\nRegards,\nEduAI Network Team`;
                                            
                                            const smsMessage = `Hello ${registrationPayload.fullName}, your payment of KES ${amount.toLocaleString()} for Alumnae Network activation is received. Receipt: ${receiptData.receiptNumber}. Welcome!`;

                                            apiService.sendEmail(registrationPayload.email, emailSubject, emailBody).catch(console.error);
                                            apiService.sendSms(registrationPayload.phoneNumber, smsMessage).catch(console.error);
                                        }

                                        localStorage.setItem('eduai_alumna_session', JSON.stringify(registrationPayload));
                                        setActiveAlumna(registrationPayload);
                                        setShowAlumnaeRegister(false);
                                        setShowAlumnaeActivation(true); // Redirect to activation/install sequence

                                        // Send welcome email in background
                                        apiService.sendAlumnaWelcomeEmail({
                                            recipient: registrationPayload.email,
                                            alumnaName: registrationPayload.fullName,
                                            loginLink: `https://almamater.eduai.co.ke/?view=alumnae_register`
                                        }).catch(console.error);
                                    } catch (e: any) {
                                        toastError("Registration Sync Error: " + e.message);
                                    }
                                }}
                            />
                        ) : showAlumnaeSecureAccount ? (
                            <AlumnaeSecureAccountView 
                                alumna={activeAlumna}
                                onComplete={() => {
                                    setShowAlumnaeSecureAccount(false);
                                    setShowAlumnaePortal(true);
                                }}
                            />
                        ) : (showAlumnaeLogin || (showAlumnaePortal && !activeAlumna)) ? (
                            <AlumnaeLoginView 
                                onLoginSuccess={(alumna) => {
                                    setActiveAlumna(alumna);
                                    localStorage.setItem('eduai_alumna_session', JSON.stringify(alumna));
                                    setShowAlumnaeLogin(false);
                                    setShowAlumnaePortal(true);
                                }}
                                onSwitchToRegister={() => {
                                    setShowAlumnaeLogin(false);
                                    setShowAlumnaeRegister(true);
                                }}
                            />
                        ) : showInstitutionClaim ? (
                            <InstitutionClaimView 
                                registry={schoolRegistry}
                                onBack={() => {
                                    setShowInstitutionClaim(false);
                                    setShowAlumnaeLogin(true);
                                }}
                                onClaimSuccess={() => {
                                    setShowInstitutionClaim(false);
                                    setShowAlumnaeLogin(true);
                                    success("Claim request submitted successfully! Our team will verify your credentials and contact you via email.");
                                }}
                            />
                        ) : (showAlumnaePortal && activeAlumna) ? (
                            <AlumnaePortalView 
                                currentAlumna={activeAlumna}
                                institutions={institutions}
                                featureFee={companyDetails?.alumnaeFeatureFee || 0}
                                ncbaConfig={companyDetails?.ncbaConfig}
                                onBack={() => {
                                    setShowAlumnaePortal(false);
                                    setActiveAlumna(null);
                                    localStorage.removeItem('eduai_alumna_session');
                                    setShowAlumnaeLogin(true);
                                }}
                                onJoinAnother={() => setShowAlumnaeRegister(true)}
                            />
                        ) : showCampaignLogin ? (
                            <CampaignLoginView 
                                onLoginSuccess={(member) => {
                                    setActiveCampaignMember(member);
                                    localStorage.setItem('eduai_campaign_session', JSON.stringify(member));
                                    setShowCampaignLogin(false);
                                    setShowCampaignPortal(true);
                                }}
                                onBack={() => {
                                    setShowCampaignLogin(false);
                                    setShowCommunityHub(true);
                                }}
                            />
                        ) : showCampaignPortal ? (
                            <CampaignSocialPortal 
                                currentMember={activeCampaignMember}
                                campaignProfile={activeCampaignProfile || ({} as CampaignProfile)}
                                onBack={() => {
                                    setShowCampaignPortal(false);
                                    window.location.href = '/?view=community&filter=Political%20Campaign';
                                }}
                            />
                        ) : showGuestPortal ? (
                            <PublicAppointmentView
                                users={users}
                                timetable={generatedTimetable}
                                timetableSettings={timetableSettings || INITIAL_TIMETABLE_SETTINGS}
                                onClose={() => setShowGuestPortal(false)}
                                institutions={institutions}
                                onBookAppointment={async (apt) => {
                                    await apiService.saveModuleRecord('appointments', { ...apt, id: `apt_${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() });
                                    loadData();
                                }}
                            />
                        ) : showGuestFeedback ? (
                            <GuestFeedbackView 
                                onSubmit={async (f) => { 
                                    await apiService.saveModuleRecord('guest_feedback', { ...f, id: `fdb_${Date.now()}` }); 
                                    success('Feedback submitted!'); 
                                    setShowGuestFeedback(false);
                                    loadData();
                                }} 
                                institutions={institutions}
                                onClose={() => setShowGuestFeedback(false)} 
                            />
                        ) : showMarketing ? (
                            <MarketingLandingPage 
                                onLogin={() => setShowMarketing(false)}
                                onBookDemo={() => setShowBookDemo(true)}
                                onOpenStore={() => setShowMarketplace(true)}
                                onLaunchSimulator={handleLaunchSimulator}
                                onRegister={(modId) => {
                                    setRegistrationModuleId(modId);
                                    setLoginInitialView('register');
                                    setShowMarketing(false);
                                }}
                            />
                        ) : (
                            <LoginView
                            initialView={loginInitialView}
                            prefillModuleId={registrationModuleId || undefined}
                            onLogin={async (e, p) => {
                                // Discovery Phase: Search for user directly in DB if not in local cache
                                let matchedUsers = (users || []).filter(u => u && (u.email?.toLowerCase() === e.toLowerCase() || u.phoneNumber === e) && (u.password === p || (!u.password && p === 'password123')));
                                
                                if (matchedUsers.length === 0) {
                                    console.log(`[Login Discovery] No local match for "${e}". Attempting API discovery...`);
                                    const filter = e.includes('@') ? { email: e.toLowerCase() } : { phoneNumber: e };
                                    try {
                                        const discovered = await apiService.fetchModuleRecords('users', undefined, undefined, { filter });
                                        if (discovered && Array.isArray(discovered)) {
                                            matchedUsers = discovered.filter(u => u.password === p || (!u.password && p === 'password123'));
                                            if (matchedUsers.length > 0) {
                                                console.log(`[Login Discovery] Found ${matchedUsers.length} matches via API.`);
                                                // Sync discovered users to state to prevent future discovery hits
                                                setUsers(prev => [...(prev || []), ...matchedUsers]);
                                            }
                                        }
                                    } catch (err) {
                                        console.error("[Login Discovery] Search failed:", err);
                                    }
                                }

                                // Prioritize administrative roles over portal/client roles
                                const rolePriority = ['super_admin', 'reseller', 'county_admin', 'admin', 'head_teacher', 'property_admin', 'agrovet_admin', 'carwash_admin', 'transport_admin', 'his_admin'];
                                matchedUsers.sort((a, b) => {
                                    const indexA = rolePriority.indexOf(a.role);
                                    const indexB = rolePriority.indexOf(b.role);
                                    const scoreA = indexA === -1 ? 999 : indexA;
                                    const scoreB = indexB === -1 ? 999 : indexB;
                                    return scoreA - scoreB;
                                });

                                const u = matchedUsers[0];
                                if (u) {
                                    let inst = institutions.find(i => i.id === u.institutionId);
                                    
                                    // Institutional Discovery: If institution not in local cache, fetch it
                                    if (!inst && u.institutionId) {
                                        console.log(`[Login Discovery] Institution ${u.institutionId} not in local state. Fetching...`);
                                        try {
                                            const discovered = await apiService.fetchModuleRecords('institutions', undefined, undefined, { filter: { id: u.institutionId } });
                                            if (discovered && Array.isArray(discovered) && discovered.length > 0) {
                                                inst = discovered[0];
                                                console.log(`[Login Discovery] Found institution: ${inst?.name}`);
                                                setInstitutions(prev => [...(prev || []), inst!]);
                                            }
                                        } catch (err) {
                                            console.error("[Login Discovery] Institution lookup failed:", err);
                                        }
                                    }
                                    if (inst?.status === 'suspended' && u.role !== 'super_admin') {
                                        setCurrentUser(u);
                                        apiService.storeSession(u);
                                        return 'suspended';
                                    }

                                    const isOtpRequired = inst?.isOtpEnabled || companyDetails.enforceGlobalOtp;

                                    if (isOtpRequired) {
                                        // Generate and Send OTP
                                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                                        setCurrentOtp(otp);
                                        setOtpPendingUser(u);

                                        const portalName = activeBranding.displayName || 'EduAI';
                                        const otpMessage = `Your ${portalName} Verification Code is: ${otp}. Do not share this code with anyone.`;
                                        console.log(`[Login] OTP Triggered for ${u.email}(Role: ${u.role}, Inst: ${u.institutionId})`);

                                        // Dispatch to both channels with improved error reporting and explicit authToken (User ID)
                                        const emailCfg = inst?.emailConfig || companyDetails.emailConfig;
                                        const smsCfg = inst?.smsConfig || companyDetails.smsConfig;

                                        Promise.all([
                                            u.email ? apiService.sendEmail(u.email, 'Verification Code', otpMessage, emailCfg, u.id) : Promise.resolve({ success: true }),
                                            u.phoneNumber ? apiService.sendSms(u.phoneNumber, otpMessage, smsCfg, 1, u.institutionId, u.id) : Promise.resolve({ success: true })
                                        ]).then((results: any) => {
                                            const smsResult = (results[1] || results[0]);
                                            if (smsResult && smsResult.success === false) {
                                                console.error("[OTP] SMS Dispatch Failure:", smsResult.message);
                                                // Alert super admins of gateway failures immediately
                                                if (u.role === 'super_admin') {
                                                    toastError(`SMS OTP Delivery Failed: ${smsResult.message || "Unknown error"}. Check your gateway settings. (Email OTP should still be sent)`);
                                                }
                                            }
                                        }).catch(err => {
                                            console.error("[OTP] Dispatch Exception:", err);
                                        });

                                        return 'otp_required';
                                    }

                                    setCurrentUser(u);
                                    apiService.storeSession(u);
                                    return 'success';
                                }

                                // Debugging Login Failures
                                const accountExists = (users || []).some(user => user && (user.email?.toLowerCase() === e.toLowerCase() || user.phoneNumber === e));
                                if (accountExists) {
                                    console.warn(`[Login] Account found for "${e}", but password mismatch occurred.`);
                                } else {
                                    console.warn(`[Login] No account found for "${e}". Total users in state: ${users?.length || 0}`);
                                }
                                return 'failed';
                            }}
                            onVerifyOtp={(code: string) => {
                                if (code === currentOtp && otpPendingUser) {
                                    setCurrentUser(otpPendingUser);
                                    apiService.storeSession(otpPendingUser);
                                    setOtpPendingUser(null);
                                    setCurrentOtp(null);
                                    return true;
                                }
                                return false;
                            }}
                            onResendOtp={() => {
                                if (!otpPendingUser) return;
                                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                                setCurrentOtp(otp);
                                const portalName = activeBranding.displayName || 'EduAI';
                                const otpMessage = `Your New ${portalName} Verification Code is: ${otp}.`;
                                console.log(`[Login] OTP Resend triggered for ${otpPendingUser.email}`);

                                // Dispatch with reporting and explicit authToken (User ID)
                                const instForOtp = institutions.find(i => i.id === otpPendingUser.institutionId);
                                const emailCfg = instForOtp?.emailConfig || companyDetails.emailConfig;
                                const smsCfg = instForOtp?.smsConfig || companyDetails.smsConfig;

                                Promise.all([
                                    otpPendingUser.email ? apiService.sendEmail(otpPendingUser.email, 'New Verification Code', otpMessage, emailCfg, otpPendingUser.id) : Promise.resolve({ success: true }),
                                    otpPendingUser.phoneNumber ? apiService.sendSms(otpPendingUser.phoneNumber, otpMessage, smsCfg, 1, otpPendingUser.institutionId, otpPendingUser.id) : Promise.resolve({ success: true })
                                ]).then(results => {
                                    const smsResult = (results[1] || results[0]) as any;
                                    if (smsResult && smsResult.success === false) {
                                        warning(`SMS OTP Delivery Failed: ${smsResult.message || "Unknown error"}.`);
                                    } else {
                                        success("OTP sent successfully via both channels.");
                                    }
                                }).catch(err => {
                                    console.error("[OTP Resend] Dispatch Exception:", err);
                                });
                            }}
                            {...commonLoginProps}
                        />
                        )}
                    </Suspense>
                )}
                {companyDetails.chatAssistantConfig?.enabled && <ChatBot welcomeMessage={companyDetails.chatAssistantConfig?.welcomeMessage} currentInstitution={activeInstitution} />}
                <PerspectiveReturnButton
                    role={impersonatedRole}
                    isImpersonatedSession={!!originalSuperAdminSession}
                    hasCurrentUser={!!currentUser}
                    isPublicView={showMarketplace || showMarketing || showGuestPortal || showGuestFeedback || showTenantStore}
                    hideReturnToLogin={showTenantStore}
                    onReturn={() => {
                        handleLogout();
                        setImpersonatedRole(null);
                        setShowGuestFeedback(false);
                        setShowGuestPortal(false);
                        setShowMarketplace(false);
                        setShowCommunityHub(false);
                        setShowTransportHub(false);
                        setShowTenantStore(false);
                        setActiveStoreTenantId(null);
                        setShowAlumnaeRegister(false);
                        setShowAlumnaeActivation(false);
                        setShowPrivacyPolicy(false);
                        setShowTermsOfService(false);
                        setShowMarketing(false);
                        // Force clear search params if in a public view to ensure we return to home/login
                        if (window.location.search) {
                            window.history.pushState({}, '', '/');
                        }
                    }}
                    onRestoreSession={onRestoreSuperAdminSession}
                />
                                {showBookDemo && <BookDemoModal onClose={() => setShowBookDemo(false)} />}
                {isProfileModalOpen && currentUser && (
                    <ProfileModal
                        currentUser={currentUser}
                        currentInstitution={activeInstitution}
                        onClose={() => setIsProfileModalOpen(false)}
                        onSave={async (id, data) => {
                            await onEditUser(id, data);
                            setIsProfileModalOpen(false);
                            await handleLogAction(`Updated personal profile`);
                        }}
                        onChangePassword={async (id, data) => {
                            try {
                                await apiService.saveModuleRecord('users', { ...currentUser, password: data.newPassword });
                                return { success: true, message: 'Password updated successfully' };
                            } catch (err: any) {
                                return { success: false, message: err.message || 'Failed to update password' };
                            }
                        }}
                        onManageUnavailability={() => {
                            info("Unavailability management coming soon.");
                        }}
                    />
                )}
                {showSimulatorLeadModal && pendingSimulatorLaunch && (
                    <SimulatorLeadModal 
                        moduleName={SIMULATOR_NAMES[pendingSimulatorLaunch.modId] || pendingSimulatorLaunch.modId}
                        onClose={() => {
                            setShowSimulatorLeadModal(false);
                            setPendingSimulatorLaunch(null);
                        }}
                        onSuccess={() => {
                            localStorage.setItem('eduai_simulator_lead_captured', 'true');
                            const { role, modId } = pendingSimulatorLaunch;
                            setShowSimulatorLeadModal(false);
                            setPendingSimulatorLaunch(null);
                            handleLaunchSimulator(role, modId);
                        }}
                    />
                )}
            </div>
                </>
            )}
        </AppErrorBoundary>
    );
};

