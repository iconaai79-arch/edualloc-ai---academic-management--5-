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

import { apiService, initSupabaseClient } from '../services/apiService';
import { getAdminRoleForInstitution } from '../utils/roleUtils';
import { generateAlphanumericCode } from '../utils/stringUtils';
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
    DSInstructor, DSVehicle, DSStudent, DSLesson, DSSkillMastery, DSSettings,
    CarListing, TestDriveBooking, CarAppraisal, SchoolRegistry
} from '../types';
import { XIcon } from './icons/XIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { SimulatorLeadModal } from './public/SimulatorLeadModal';



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

const SystemPulseLoader: React.FC<{ message: string; onRetry?: () => void; status?: string }> = ({ message, onRetry, status }) => (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Animated Background Mesh */}
        <div className="absolute inset-0 animate-mesh opacity-40"></div>
        
        {/* Decorative Glowing Orbs */}
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }}></div>

        <div className="relative z-10 flex flex-col items-center">
            {/* Logo Container with Neural Pulse */}
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-indigo-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
                <div className="w-24 h-24 bg-white rounded-3xl flex items-center justify-center text-white shadow-2xl relative border border-white/10 animate-float overflow-hidden">
                    <img 
                        src="/logo.png" 
                        alt="EduAI Logo" 
                        className="w-16 h-16 object-contain drop-shadow-[0_0_10px_rgba(79,70,229,0.4)]" 
                    />
                    <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-scan"></div>
                </div>
                
                {/* Orbital Ring */}
                <div className="absolute -inset-4 border border-indigo-500/30 rounded-[2.5rem] animate-spin-slow"></div>
            </div>

            <div className="text-center space-y-4">
                <h2 className="text-white font-black uppercase tracking-[0.4em] text-lg text-glow">
                    EduAi <span className="text-indigo-400">Automation</span>
                </h2>
                <div className="flex flex-col items-center gap-6">
                    <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-[0.2em] animate-pulse bg-indigo-500/10 px-4 py-1.5 rounded-full border border-indigo-500/20">
                        {message}
                    </p>
                    
                    {status && (
                        <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest">{status}</p>
                    )}

                    {onRetry && (
                        <button 
                            onClick={onRetry}
                            className="bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold py-2 px-6 rounded-lg transition-all border border-white/10 mt-2"
                        >
                            Retry Connection
                        </button>
                    )}
                    
                    {/* Premium Progress Indicator */}
                    <div className="w-48 h-1 bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-gradient-to-r from-transparent via-indigo-500 to-transparent w-full animate-shimmer"></div>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Branding */}
        <div className="absolute bottom-10 left-0 right-0 text-center">
            <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.3em]">Neural Registry Link Active</p>
        </div>
    </div>
);

const PerspectiveReturnButton: React.FC<{
    role: Role | null;
    isImpersonatedSession?: boolean;
    onReturn: () => void;
    onRestoreSession?: () => void;
    hasCurrentUser?: boolean;
    isPublicView?: boolean;
}> = ({ role, isImpersonatedSession, onReturn, onRestoreSession, hasCurrentUser, isPublicView }) => {
    if (!role && !isImpersonatedSession && hasCurrentUser) return null;
    if (!hasCurrentUser && !isPublicView) return null;
    return (
        <div className={`fixed ${isPublicView ? 'top-6 right-6 md:bottom-12 md:right-12' : 'bottom-24 left-6'} z-[200] animate-fade-in-up no-print flex flex-col gap-3`}>
            {(role || isImpersonatedSession) && (
                <button
                    onClick={isImpersonatedSession ? onRestoreSession : onReturn}
                    className="flex items-center gap-0 sm:gap-3 pl-2 pr-2 sm:pr-6 py-2 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-transform border-2 border-indigo-500 group"
                >
                    <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow-lg group-hover:bg-indigo-500 transition-colors">
                        <ArrowRightOnRectangleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-80 text-indigo-200">
                            {isImpersonatedSession ? 'System Access' : 'Viewing as'}
                        </p>
                        <p className="text-xs font-black uppercase tracking-tight text-white">
                            {isImpersonatedSession ? 'Return to Super Admin' : (role || '').replace('_', ' ')}
                        </p>
                    </div>
                </button>
            )}
            {!hasCurrentUser && (
                <button
                    onClick={onReturn}
                    className="flex items-center gap-0 sm:gap-3 pl-2 pr-2 sm:pr-6 py-2 bg-slate-900 text-white rounded-full shadow-2xl hover:scale-105 transition-transform border-2 border-orange-500 group"
                >
                    <div className="w-10 h-10 bg-orange-600 rounded-full flex items-center justify-center shadow-lg group-hover:bg-orange-500 transition-colors">
                        <ArrowRightOnRectangleIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left hidden sm:block">
                        <p className="text-[9px] font-black uppercase tracking-widest opacity-80 text-orange-200">Public Access</p>
                        <p className="text-xs font-black uppercase tracking-tight text-white">Return to Login</p>
                    </div>
                </button>
            )}
        </div>
    );
};

const SchemaInitializationView: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
    const [isRepairing, setIsRepairing] = useState(false);
    const sqlScript = useMemo(() => generateFullSqlScript(), []);

    const handleAutoRepair = async () => {
        if (!window.confirm("Initialize registry tables? Proceed?")) return;
        setIsRepairing(true);
        try {
            const result = await apiService.runMigration(sqlScript);
            if (result.success) onComplete();
            else alert("Auto-setup failed. Please run the SQL manually in Supabase editor.");
        } catch (e: any) { alert("An error occurred during registry initialization."); }
            finally { setIsRepairing(false); }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 font-sans relative overflow-hidden text-center">
            {/* Background Effects */}
            <div className="absolute inset-0 animate-mesh opacity-30"></div>
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(79,70,229,0.1),transparent_70%)]"></div>

            <div className="max-w-2xl w-full relative z-10">
                <div className="glass-morphism rounded-[3rem] p-12 border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-3xl rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl rounded-full -ml-16 -mb-16"></div>

                    <div className="relative text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-white mb-8 shadow-2xl shadow-indigo-500/20 animate-float border border-white/20 overflow-hidden relative">
                            <img 
                                src="/logo.png" 
                                alt="EduAI Logo" 
                                className="w-16 h-16 object-contain" 
                            />
                            <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent animate-scan"></div>
                        </div>

                        <h2 className="text-4xl font-black text-white uppercase tracking-tighter mb-4 text-glow">
                            Registry <span className="text-indigo-400">Connection</span>
                        </h2>
                        
                        <p className="text-slate-400 font-medium mb-12 max-w-md mx-auto leading-relaxed">
                            Connection established with the central EduAI registry. 
                            The cloud environment requires table initialization to proceed.
                        </p>

                        <div className="grid grid-cols-1 gap-6">
                            <button 
                                onClick={handleAutoRepair} 
                                disabled={isRepairing} 
                                className="group relative w-full bg-white text-slate-950 font-black py-5 rounded-2xl shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 overflow-hidden"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                                <span className="relative flex items-center justify-center gap-3">
                                    {isRepairing ? (
                                        <>
                                            <ArrowPathIcon className="w-5 h-5 animate-spin" />
                                            Initializing Infrastructure...
                                        </>
                                    ) : (
                                        <>
                                            <SparklesIcon className="w-5 h-5" />
                                            Initialize Registry Link
                                        </>
                                    )}
                                </span>
                            </button>

                            <div className="flex items-center justify-center gap-8 py-4 opacity-50">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cloud Online</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Secure Link</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Technical Footnote */}
                <div className="mt-8 text-center">
                    <p className="text-slate-600 text-[10px] font-bold uppercase tracking-[0.3em]">
                        System v.4.0 • Neural Integration Protocol Active
                    </p>
                </div>
            </div>
        </div>
    );
};

const AppErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            console.error("Global Error Caught:", event.error);
            setHasError(true);
            setError(event.error);
        };
        window.addEventListener('error', handleError);
        return () => window.removeEventListener('error', handleError);
    }, []);

    if (hasError) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans text-center">
                <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-red-100">
                    <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <XIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-900 mb-2">Application Error</h2>
                    <p className="text-slate-500 mb-6 text-sm">{error?.message || "A critical error occurred while loading the portal."}</p>
                    <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl transition-all active:scale-[0.98]">
                        Reload System
                    </button>
                </div>
            </div>
        );
    }
    return <>{children}</>;
};

export const App: React.FC = () => {
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
    const [jobs, setJobs] = useState<CarWashJob[]>([]);

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

    // Driving School State
    const [dsInstructors, setDsInstructors] = useState<DSInstructor[]>([]);
    const [dsVehicles, setDsVehicles] = useState<DSVehicle[]>([]);
    const [dsStudents, setDsStudents] = useState<DSStudent[]>([]);
    const [dsLessons, setDsLessons] = useState<DSLesson[]>([]);
    const [dsMastery, setDsMastery] = useState<DSSkillMastery[]>([]);
    const [dsSettings, setDsSettings] = useState<DSSettings | null>(null);

    // Car Sales State
    const [carListings, setCarListings] = useState<CarListing[]>([]);
    const [carTestDrives, setCarTestDrives] = useState<TestDriveBooking[]>([]);
    const [carAppraisals, setCarAppraisals] = useState<CarAppraisal[]>([]);

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
            return params.get('view') === 'marketplace' || window.location.hostname === 'marketplace.eduai.co.ke' || window.location.hostname.includes('marketplace');
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

    const [activeStoreTenantId, setActiveStoreTenantId] = useState<string | null>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const shop = params.get('shop');
            if (shop) return shop;

            // Subdomain discovery: e.g. agrovent.eduai.co.ke
            const host = window.location.hostname.toLowerCase();
            const parts = host.split('.');
            // Check for valid tenant subdomain (e.g. tenant.domain.com or tenant.eduai.co.ke)
            if (parts.length >= 2) {
                const sub = parts[0];
                const reserved = ['www', 'app', 'marketplace', 'showcase', 'marketing', 'api', 'localhost', '127'];
                if (!reserved.includes(sub) && !sub.includes('portal') && !sub.includes('admin')) {
                    return sub; // Return as slug
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    });
    const [showTenantStore, setShowTenantStore] = useState(!!activeStoreTenantId);

    const [showMarketing, setShowMarketing] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            // Show if URL param set, or hostname is showcase/marketing, or no user and not marketplace/guest portals/tenant stores
            const isMarketingSubdomain = window.location.hostname === 'showcase.eduai.co.ke' || window.location.hostname.includes('showcase') || window.location.hostname.includes('marketing');
            if (isMarketingSubdomain || params.get('view') === 'showcase') return true;
            
            const isAlumnaeDeepLink = params.get('school') || params.get('alumnae') || params.get('view') === 'alumnae_register';
            return !currentUser && !showMarketplace && !showCommunityHub && !showGuestPortal && !showGuestFeedback && !showTenantStore && !isAlumnaeDeepLink;
        } catch (e) {
            return !currentUser;
        }
    });

    const [showAlumnaeRegister, setShowAlumnaeRegister] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') === 'alumnae_register';
        } catch (e) { return false; }
    });

    const [showAlumnaeActivation, setShowAlumnaeActivation] = useState(false);

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

    const [schoolRegistry, setSchoolRegistry] = useState<SchoolRegistry[]>([]);
    const [selectedRegistrySchool, setSelectedRegistrySchool] = useState<SchoolRegistry | null>(null);

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
    const [showAlumnaePortal, setShowAlumnaePortal] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('eduai_alumna_session');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setActiveAlumna(parsed);
                // If on community view, show portal
                const params = new URLSearchParams(window.location.search);
                if (params.get('view') === 'community') {
                    setShowAlumnaePortal(true);
                }
            } catch (e) {}
        }
    }, []);

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

    const getLecturerById = useCallback((id: string) => (Array.isArray(users) ? users : []).find(u => u && u.id === id), [users]);
    const getSubjectById = useCallback((id: string) => (Array.isArray(subjects) ? subjects : []).find(s => s && s.id === id), [subjects]);
    const getRoomById = useCallback((id: string) => (Array.isArray(rooms) ? rooms : []).find(r => r && r.id === id), [rooms]);

    const activeInstitution = useMemo(() => {
        if (!currentUser || !Array.isArray(institutions)) return null;
        return institutions.find(i => i && i.id === currentUser.institutionId) || null;
    }, [currentUser, institutions]);

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

    const loadData = useCallback(async (isFirstLoad = false, force = false) => {
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

            setLoadStatus("Loading your workspace...");
            const instId = currentUser && (currentUser.role === 'super_admin' || currentUser.role.startsWith('county_')) ? undefined : currentUser?.institutionId;
            const cntId = currentUser && currentUser.role.startsWith('county_') ? currentUser.countyId : undefined;

            // Fire identity-critical fetches in parallel
            const [insts, cnts, sett, u, reg] = await Promise.all([
                apiService.fetchInstitutions(instId).catch(() => []),
                apiService.fetchModuleRecords<County>('counties').catch(() => []),
                apiService.fetchCompanySettings().catch(() => null),
                apiService.fetchUsers(instId).catch(() => []),
                apiService.fetchFullRegistry().catch(() => []),
            ]);

            // Also fire core module data in parallel with identity (don't await these yet)
            let d: any[] = [], s: any[] = [], c: any[] = [], a: any[] = [], ay: any[] = [], sem: any[] = [], r: any[] = [], b: any[] = [], al: any[] = [], tasks: any[] = [], txns: any[] = [], recs: any[] = [], logs: any[] = [], notifs: any[] = [];

            let coreModulePromise: Promise<any[]> = Promise.resolve([]);
            if (currentUser) {
                coreModulePromise = Promise.all([
                    apiService.fetchDepartments(instId).catch(() => []),
                    apiService.fetchSubjects(instId).catch(() => []),
                    apiService.fetchCourses(instId).catch(() => []),
                    apiService.fetchAllocations(instId).catch(() => []),
                    apiService.fetchAcademicYears(instId).catch(() => []),
                    apiService.fetchSemesters(instId).catch(() => []),
                    apiService.fetchRooms(instId).catch(() => []),
                    apiService.fetchModuleRecords<Building>('buildings', instId).catch(() => []),
                    apiService.fetchAcademicLevels(instId).catch(() => []),
                    apiService.fetchModuleRecords<UserTask>('tasks', instId).catch(() => []),
                    apiService.fetchTransactions(instId).catch(() => []),
                    apiService.fetchModuleRecords<Receipt>('receipts', instId).catch(() => []),
                    apiService.fetchModuleRecords<ActivityLog>('activity_log', instId).catch(() => []),
                    apiService.fetchNotifications(currentUser.id).catch(() => []),
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

            let finalUsers = u || [];
            const systemSuperAdmin = INITIAL_USERS.find(iu => iu.role === 'super_admin');
            if (systemSuperAdmin && !finalUsers.some((existing: User) => existing.email === systemSuperAdmin.email)) {
                finalUsers = [...finalUsers, systemSuperAdmin];
            }
            setUsers(finalUsers);

            if (currentUser) {
                const refreshedSelf = finalUsers.find(u => u.id === currentUser.id);
                if (refreshedSelf) {
                    const hasChanges = JSON.stringify(refreshedSelf) !== JSON.stringify(currentUser);
                    if (hasChanges) {
                        setCurrentUser(prev => ({ ...prev, ...refreshedSelf }));
                        apiService.storeSession({ ...currentUser, ...refreshedSelf });
                    }
                } else if (!finalUsers.some(u => u.id === currentUser.id)) {
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
                           desc.includes('license') || 
                           desc.includes('renewal') || 
                           desc.includes('sms top-up') ||
                           desc.includes('portal subscription');
                });
            }
            setTransactions(finalTxns);
            setReceipts(recs || []);
            setActivityLog(logs || []);
            setNotifications(notifs || []);
            let inv: any[] = [], ext: any[] = [], vh: any[] = [], fs: any[] = [], fp: any[] = [], fb: any[] = [], sar: any[] = [], enr: any[] = [], abs: any[] = [], con: any[] = [], att: any[] = [], item: any[] = [], tt: any[] = [], et: any[] = [], asg: any[] = [], subm: any[] = [], rat: any[] = [], ta: any[] = [], asmt: any[] = [], asmtMarks: any[] = [], bks: any[] = [], ltx: any[] = [], apts: any[] = [], sups: any[] = [], stx: any[] = [], cinv: any[] = [], ccats: any[] = [], cstores: any[] = [], bApps: any[] = [], bFunds: any[] = [], lo: any[] = [], obs: any[] = [], vis: any[] = [], sec: any[] = [], reqRecords: any[] = [], retExp: any[] = [], rStores: any[] = [], rInv: any[] = [], tor: any[] = [], fBulletin: any[] = [], fDocs: any[] = [], fWatch: any[] = [], fMaint: any[] = [], fCheckIn: any[] = [], vhcls: any[] = [], tonb: any[] = [], vlogs: any[] = [], cafe: any[] = [], cOrders: any[] = [], rSales: any[] = [], cwJobs: any[] = [], cFarmers: any[] = [], cColls: any[] = [], cRiders: any[] = [], cAgroInv: any[] = [], cAgroSales: any[] = [], cSaccoAcc: any[] = [], cSaccoTx: any[] = [], cPayouts: any[] = [], cExps: any[] = [], cInc: any[] = [], lClients: any[] = [], lMatters: any[] = [], lDocs: any[] = [], lTime: any[] = [], lInvs: any[] = [], lTrust: any[] = [], lTemplates: any[] = [], lAgreements: any[] = [], dsInst: any[] = [], dsVeh: any[] = [], dsStud: any[] = [], dsLess: any[] = [], dsMast: any[] = [], dsSet: any[] = [];
            let ims: any[] = [];
            let demoLeads: any[] = [];
            let csList: any[] = [], csTest: any[] = [], csAppr: any[] = [];

            
            if (currentUser) {
                const activeInst = insts?.find(i => i.id === currentUser.institutionId);
                const effectiveInstId = currentUser?.role === 'super_admin' ? undefined : (activeInst?.id || currentUser.institutionId || instId || '');
                
                console.log("[Data Refresh] [DEBUG-ID-99] Loading institutional data for:", effectiveInstId || "Global");
            
                const demoLeadsPromise = currentUser.role === 'super_admin' 
                    ? apiService.fetchDemoRequests().catch(() => []) 
                    : Promise.resolve([]);

                [inv, ext, vh, fs, fp, fb, sar, enr, abs, con, att, item, tt, et, asg, subm, rat, ta, asmt, asmtMarks, bks, ltx, apts, sups, stx, cinv, ccats, cstores, bApps, bFunds, lo, obs, vis, sec, reqRecords, retExp, rStores, rInv, tor, fBulletin, fDocs, fWatch, fMaint, fCheckIn, vhcls, tonb, vlogs, cafe, cOrders, rSales, cwJobs, cFarmers, cColls, cRiders, cAgroInv, cAgroSales, cSaccoAcc, cSaccoTx, cPayouts, cExps, cInc, lClients, lMatters, lDocs, lTime, lInvs, lTrust, lTemplates, lAgreements, dsInst, dsVeh, dsStud, dsLess, dsMast, dsSet, csList, csTest, csAppr, ims, demoLeads] = await Promise.all([

                    apiService.fetchInvoices(effectiveInstId).catch(() => []),
                    apiService.fetchExtensionRequests(currentUser?.role === 'super_admin' ? 'ALL' : effectiveInstId).catch(() => []),
                    apiService.fetchVoteHeads(effectiveInstId).catch(() => []),
                    apiService.fetchFeeStructures(effectiveInstId).catch(() => []),
                    apiService.fetchFinancialPeriods(effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<FeedbackSubmission>('feedback_submissions', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<StudentAbsenceRequest>('student_absence_requests', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<EnrollmentRequest>('enrollment_requests', effectiveInstId).catch(() => []),
                    apiService.fetchAbsenceRequests(effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LecturerContract>('contracts', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<StudentAttendance>('student_attendances', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<InventoryItem>('inventory', effectiveInstId).catch(() => []),
                    apiService.fetchTimetable(effectiveInstId || '').catch(() => []),
                    apiService.fetchExamTimetable(effectiveInstId || '').catch(() => []),
                    apiService.fetchModuleRecords<Assignment>('assignments', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<Submission>('submissions', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LessonRating>('lesson_ratings', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<TaAssignment>('ta_assignments', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<Assessment>('assessments', effectiveInstId).catch(() => []),
                    apiService.fetchAssessmentMarks(effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<Book>('books', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LibraryTransaction>('library_transactions', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<Appointment>('appointments', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<Supplier>('suppliers', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<StockTransaction>('stock_transactions', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CountyInventoryItem>('county_inventory', effectiveInstId, cntId).catch(() => []),
                    apiService.fetchModuleRecords<CountyInventoryCategory>('county_inventory_categories', undefined, cntId).catch(() => []),
                    apiService.fetchModuleRecords<CountyStore>('county_stores', undefined, cntId).catch(() => []),
                    apiService.fetchModuleRecords<BursaryApplication>('bursary_applications', effectiveInstId, cntId).catch(() => []),
                    apiService.fetchModuleRecords<CountyBursaryFund>('county_bursary_funds', undefined, cntId).catch(() => []),
                    apiService.fetchModuleRecords<LeaveOutRequest>('leave_out_requests', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<ObservationNote>('observation_notes', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<Visitor>('visitors', effectiveInstId).catch(() => []),
                    apiService.fetchSecurityAlerts(effectiveInstId || '').catch(() => []),
                    apiService.fetchModuleRecords<Requisition>('requisitions', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<RetailExpense>('retail_expenses', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<RetailStore>('retail_stores', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<TimeOffRequest>('time_off_requests', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<BulletinItem>('bulletin_items', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<DocumentCollection>('document_collections', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<WatchlistRecord>('watchlist_records', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<MaintenanceRequest>('maintenance_requests', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<TeacherCheckIn>('teacher_check_ins', effectiveInstId).catch(() => []),
                    apiService.fetchVehicles(effectiveInstId).catch(() => []),
                    apiService.fetchTransportOnboarding(effectiveInstId).catch(() => []),
                    apiService.fetchVehicleLogs(effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CafeMenuItem>('cafe_menu_items', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CafeOrder>('cafe_orders', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<RetailSale>('retail_sales', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CarWashJob>('carwash_jobs', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CoopFarmer>('coop_farmers', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CoopCollection>('coop_collections', effectiveInstId, undefined, { limit: 50000 }).catch(() => []),
                    apiService.fetchModuleRecords<CoopRider>('coop_riders', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CoopAgrovetInventory>('coop_agrovet_inventory', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CoopAgrovetSales>('coop_agrovet_sales', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<SaccoAccount>('sacco_accounts', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<SaccoTransaction>('sacco_transactions', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CoopMonthlyPayout>('coop_monthly_payouts', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CoopExpense>('coop_expenses', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<CoopIncome>('coop_income', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LawClient>('law_clients', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LawMatter>('law_matters', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LawDocument>('law_documents', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LawTimeEntry>('law_time_entries', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LawInvoice>('law_invoices', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LawTrustTransaction>('law_trust_transactions', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LawAgreementTemplate>('law_agreement_templates', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<LawAgreement>('law_agreements', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<DSInstructor>('ds_instructors', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<DSVehicle>('ds_vehicles', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<DSStudent>('ds_students', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<DSLesson>('ds_lessons', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<DSSkillMastery>('ds_skill_mastery', effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<DSSettings>('ds_settings', effectiveInstId).catch(() => []),
                    apiService.fetchCarListings(effectiveInstId, 'all').catch(() => []),
                    apiService.fetchCarTestDrives(effectiveInstId).catch(() => []),
                    apiService.fetchCarAppraisals(effectiveInstId).catch(() => []),
                    apiService.fetchModuleRecords<InstitutionModuleState>('institution_module_states', effectiveInstId).catch(() => []),
                    demoLeadsPromise
                ]);

                console.log("[Data Refresh] Hub Optimized");

                if (insts && insts.length > 0) {
                    const finalInsts = insts.map(i => ({
                        ...i,
                        moduleStates: (ims || []).filter((m: any) => m.institutionId === i.id)
                    }));
                    setInstitutions(finalInsts);
                }

                if (demoLeads) setDemoRequests(demoLeads);
            }


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
            setGeneratedTimetable(tt || []);
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
            
            // Driving School State Setters
            setDsInstructors(dsInst || []);
            setDsVehicles(dsVeh || []);
            setDsStudents(dsStud || []);
            setDsLessons(dsLess || []);
            setDsMastery(dsMast || []);
            setDsSettings(dsSet && dsSet.length > 0 ? dsSet[0] : null);
            setCarListings(csList || []);
            setCarTestDrives(csTest || []);
            setCarAppraisals(csAppr || []);

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
    }, [currentUser?.id, currentUser?.role, currentUser?.institutionId, currentUser?.countyId]);

    useEffect(() => {
        // Trigger a hard reload when identity, scope, or perspective changes
        loadData(true);
    }, [currentUser?.id, currentUser?.institutionId, currentUser?.countyId, impersonatedRole]);

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

    const handleAddDepartment = async (name: string) => {
        const id = `dept_${Date.now()}`;
        await apiService.saveModuleRecord('departments', { id, name, institutionId: currentUser?.institutionId });
        loadData();
    };

    const handleUpdateDepartment = async (id: string, name: string) => {
        const existing = departments.find(d => d.id === id);
        if (existing) {
            await apiService.saveModuleRecord('departments', { ...existing, name, id });
            loadData();
        }
    };

    const handleDeleteDepartment = async (id: string) => {
        await apiService.deleteModuleRecord('departments', id);
        loadData();
    };

    const handleImportDepartments = async (data: any[]) => {
        const enriched = data.map(d => ({ ...d, institutionId: currentUser?.institutionId }));
        await apiService.onImportDepartments(enriched);
        loadData();
    };

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

    const handleAddRoom = async (data: any) => {
        const id = `room_${Date.now()}`;
        await apiService.saveModuleRecord('rooms', { id, ...data, institutionId: currentUser?.institutionId });
        loadData();
    };

    const handleUpdateRoom = async (id: string, data: any) => {
        const existing = rooms.find(r => r.id === id);
        if (existing) {
            await apiService.saveModuleRecord('rooms', { ...existing, ...data, id });
            loadData();
        }
    };

    const handleDeleteRoom = async (id: string) => {
        await apiService.deleteModuleRecord('rooms', id);
        loadData();
    };

    const handleImportRooms = async (data: any[]) => {
        const enriched = data.map(r => ({ ...r, institutionId: currentUser?.institutionId }));
        await apiService.onImportRooms(enriched);
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
            alert("Extension request submitted successfully.");
        } catch (err) {
            console.error("Failed to submit extension request:", err);
            alert("Failed to submit extension request. Please contact support.");
        }
    };

    const handleUpdateExtensionRequestStatus = async (requestId: string, status: 'approved' | 'rejected', extensionDays?: number) => {
        try {
            await apiService.updateExtensionRequestStatus(requestId, status, extensionDays);
            await loadData();
            alert(`Extension request ${status} successfully.`);
        } catch (err) {
            console.error("Failed to update extension request status:", err);
            const errMsg = (err as any)?.message || (err as any)?.error || "Unknown error";
            alert(`Failed to update status: ${errMsg}. Please try again.`);
        }
    };

    // --- Academic Handlers ---

    const handleUpdateSubject = async (id: string, data: any) => {
        const existing = subjects.find(s => s.id === id);
        if (existing) {
            await apiService.saveSubject({ ...existing, ...data, id });
            loadData();
        }
    };

    const handleDeleteSubject = async (id: string) => {
        await apiService.deleteModuleRecord('subjects', id);
        loadData();
    };

    const handleImportSubjectsAndAssociate = async (subjects: any[]) => {
        await apiService.onImportSubjectsAndAssociate(subjects, currentUser?.institutionId);
        loadData();
    };

    const handleAssociateSubjectToCourseLevel = async (subjectId: string, levelId: string) => {
        let subjectIdsToAdd = [subjectId];

        // Check for Option Blocks (Pathways)
        const pathwayConstraints = (timetableSettings?.constraints || []).filter(c => c.type === 'same_time_subjects');
        const group = pathwayConstraints.find(c => c.subjectIds.includes(subjectId));
        if (group) {
            subjectIdsToAdd = group.subjectIds;
            const subjectName = subjects.find(s => s.id === subjectId)?.name || subjectId;
            // Optional: You could notify the user here, but since this is a global handler,
            // maybe it's better to keep it silent or handle UI feedback in the components.
            console.log(`Auto-associating whole option block for ${subjectName}`);
        }

        await apiService.onAssociateSubjectToCourseLevel(subjectIdsToAdd, levelId);
        loadData();
    };

    const handleDisassociateSubjectFromCourseLevel = async (subjectId: string, levelId: string) => {
        await apiService.onDisassociateSubjectFromCourseLevel(subjectId, levelId);
        loadData();
    };

    const handleAddSubject = async (data: any, levelIds?: string[]) => {
        const id = `sub_${Date.now()}`;
        const subject = { ...data, id, institutionId: currentUser?.institutionId };
        await apiService.saveSubject(subject);
        if (levelIds && levelIds.length > 0) {
            for (const lid of levelIds) { await apiService.onAssociateSubjectToCourseLevel(id, lid); }
        }
        loadData();
    };

    const handleAddCourse = async (data: any) => {
        const id = `course_${Date.now()}`;
        const courseData = { ...data, id, institutionId: currentUser?.institutionId, levels: data.levels || [] };
        await apiService.saveModuleRecord('courses', courseData);
        loadData();
    };

    const handleUpdateCourse = async (id: string, data: any) => {
        const existing = courses.find(c => c.id === id);
        if (existing) {
            await apiService.saveModuleRecord('courses', { ...existing, ...data, id });
            loadData();
        }
    };

    const handleDeleteCourse = async (id: string) => {
        await apiService.deleteModuleRecord('courses', id);
        loadData();
    };

    const handleImportCourses = async (data: any[]) => {
        const enriched = data.map(c => ({ ...c, institutionId: currentUser?.institutionId }));
        await apiService.onImportCourses(enriched);
        loadData();
    };

    // --- User Handlers ---

    const onImportUsers = async (data: any[]) => {
        await apiService.onImportUsers(data, currentUser?.institutionId, activeInstitution?.name);
        loadData();
    };

    const onImportStudents = async (data: any[]) => {
        await apiService.onImportStudents(data, currentUser?.institutionId, activeInstitution?.name);
        loadData();
    };

    const onDeleteUser = async (id: string) => {
        await apiService.deleteModuleRecord('users', id);
        loadData();
    };

    const onEditUser = async (id: string, data: any) => {
        const existing = users.find(u => u.id === id);
        if (existing) {
            const updatedUser = { ...existing, ...data, id };
            await apiService.saveModuleRecord('users', updatedUser);

            // Update local state immediately for better responsiveness
            setUsers(prev => prev.map(u => u.id === id ? updatedUser : u));

            // If the user edited their own profile, update the current user state and session
            if (currentUser?.id === id) {
                const finalUser = { ...currentUser, ...updatedUser };
                setCurrentUser(finalUser);
                apiService.storeSession(finalUser);
            }

            await loadData();
        }
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
            alert(`Simulating download for receipt ID: ${receipt.id}. Institution: ${institution?.name}, Job: ${job?.packageName || job?.vehiclePlate}`);
            await handleLogAction(`Downloaded receipt for transaction: ${receipt.relatedTransactionId}`);
        } catch (error) {
            console.error('Error downloading receipt:', error);
            alert('Failed to download receipt. Please try again.');
        }
    };

    const handleLogAction = async (action: string) => {
        if (!currentUser) return;
        const institution = institutions.find(i => i.id === currentUser.institutionId);
        await apiService.saveModuleRecord('activity_log', {
            id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
            userId: currentUser.id,
            userName: currentUser.name,
            institutionId: currentUser.institutionId,
            institutionName: institution?.name || (currentUser.role === 'super_admin' ? 'SYSTEM' : 'Unknown'),
            action,
            timestamp: new Date().toISOString()
        });
        loadData();
    };

    const onUpdateInstitution = async (id: string, data: any) => {
        const inst = institutions.find(i => i.id === id);
        if (inst) {
            await apiService.saveInstitution({ ...inst, ...data });
            loadData();
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
                const fallbackRole = targetInstitution?.institutionType === 'Reseller' ? 'reseller' : (initialRole || 'admin');

                admin = {
                    id: `temp_admin_${institutionId}_${Date.now()}`,
                    institutionId: institutionId,
                    role: fallbackRole as Role,
                    email: `admin@${institutionId.replace('demo_', '')}.eduai.io`,
                    name: `Demo Administrator`,
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
                alert("Critical: Failed to generate administrative session.");
            }
            setIsTransitioning(false);
        }, 300);
    }, [users, institutions, currentUser, originalSuperAdminSession]);
    
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
    }, [institutions, currentUser]);

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

    const handleLogGateAction = async (vehicleId: string, eventType: 'entry' | 'exit', notes?: string) => {
        try {
            const vehicle = vehicles.find(v => v.id === vehicleId);
            const payload: VehicleLog = {
                id: `vlog_${Date.now()}`,
                institutionId: activeInstitution!.id,
                vehicleId,
                eventType,
                securityId: currentUser!.id,
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
    };



    const handleOnboardStudent = async (studentId: string, vehicleId: string, direction: 'to_school' | 'from_school', lat?: number, lng?: number) => {
        try {
            const student = users.find(u => u.id === studentId);
            const vehicle = vehicles.find(v => v.id === vehicleId);
            const payload: TransportOnboarding = {
                id: `tonb_${Date.now()}`,
                institutionId: activeInstitution!.id,
                vehicleId,
                studentId,
                direction,
                status: 'onboarded',
                locationLat: lat,
                locationLng: lng,
                timestamp: new Date().toISOString()
            };
            await apiService.saveModuleRecord('transport_onboarding', payload);

            // Send SMS to Parent
            const parents = users.filter(u => u.role === 'parent' && u.studentIds?.includes(studentId));
            for (const parent of parents) {
                if (parent.phoneNumber) {
                    const msg = direction === 'from_school'
                        ? `${student?.name} has onboarded vehicle ${vehicle?.plateNumber} and is heading home.Please be ready to pick.`
                        : `${student?.name} has onboarded vehicle ${vehicle?.plateNumber} and is heading to school.`;
                    await apiService.sendSms(parent.phoneNumber, msg, activeInstitution?.smsConfig, 1, activeInstitution?.id);
                }
            }

            await handleLogAction(`Onboarded student ${student?.name} to ${vehicle?.plateNumber}`);
            loadData();
        } catch (error) {
            console.error('Error onboarding student:', error);
            throw error;
        }
    };

    const handleOffboardStudent = async (recordId: string, lat?: number, lng?: number) => {
        try {
            const record = transportOnboarding.find(r => r.id === recordId);
            if (record) {
                await apiService.saveModuleRecord('transport_onboarding', {
                    ...record,
                    status: 'offboarded',
                    locationLat: lat,
                    locationLng: lng
                });
                await handleLogAction(`Offboarded student from record ${recordId}`);
                loadData();
            }
        } catch (error) {
            console.error('Error offboarding student:', error);
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

    const handleApproveCollection = useCallback(async (id: string, status: string) => {
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
            alert(`Approval failed: ${err.message}`);
            throw err;
        }
    }, [loadData, handleLogAction, activeInstitution, currentUser]);

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

    const handleAddDSInstructor = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('ds_instructors', { ...data, id: `dsi_${Date.now()}`, institutionId: instId, createdAt: new Date().toISOString() });
        await handleLogAction(`Added driving instructor: ${data.name}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddDSVehicle = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('ds_vehicles', { ...data, id: `dsv_${Date.now()}`, institutionId: instId, createdAt: new Date().toISOString() });
        await handleLogAction(`Added driving school vehicle: ${data.plateNumber}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddDSStudent = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('ds_students', { ...data, id: `dss_${Date.now()}`, institutionId: instId, createdAt: new Date().toISOString() });
        await handleLogAction(`Enrolled driving student: ${data.fullName}`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddDSLesson = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('ds_lessons', { ...data, id: `dsl_${Date.now()}`, institutionId: instId, createdAt: new Date().toISOString() });
        await handleLogAction(`Scheduled driving lesson`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleAddDSMastery = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('ds_skill_mastery', { ...data, id: `dsm_${Date.now()}`, institutionId: instId, createdAt: new Date().toISOString() });
        await handleLogAction(`Recorded skill mastery for student`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

    const handleUpdateDSSettings = useCallback(async (data: any) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        await apiService.saveModuleRecord('ds_settings', { ...data, institutionId: instId, updatedAt: new Date().toISOString() });
        await handleLogAction(`Updated driving school settings`);
        await loadData(false, true);
    }, [activeInstitution, currentUser, loadData, handleLogAction]);

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
            alert(`Draft generation failed: ${err.message}`);
            throw err;
        }
    }, [loadData, handleLogAction, activeInstitution, currentUser]);

    const handleDisbursePayouts = useCallback(async (payoutIds: string[]) => {
        try {
            // Here you would integrate with M-Pesa or bank APIs
            await apiService.updatePayoutStatus(payoutIds, 'paid', currentUser?.id);
            await handleLogAction(`Disbursed ${payoutIds.length} payouts`);
            await loadData(false, true);
        } catch (err: any) {
            alert(`Disbursement failed: ${err.message}`);
            throw err;
        }
    }, [loadData, handleLogAction]);

    const handleDirectAssign = useCallback(async (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections?: Record<string, string[]>) => {
        if (!activeInstitution) return;

        if (!activeAcademicYear || !activeSemester) {
            alert("Please set an active Academic Year and Semester in Settings before assigning subjects.");
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
            alert("Subjects assigned successfully.");
        } catch (error: any) {
            console.error("Failed to assign subjects:", error);
            alert(`Failed to assign subjects: ${error.message || "Unknown error"}`);
        }
    }, [activeInstitution, currentUser, loadData, activeAcademicYear, activeSemester]);

    const onGenerateReceipt = useCallback(async (txn: MpesaTransaction) => {
        const id = `rec_${Date.now()}`;
        const receipt: Receipt = {
            id,
            receiptNumber: `REC-${Date.now()}`,
            institutionId: txn.institutionId,
            paymentDate: new Date().toISOString(),
            amountPaid: txn.amount,
            paidFor: 'Institutional License',
            paymentMethod: 'M-Pesa',
            relatedTransactionId: txn.id
        };
        await apiService.saveModuleRecord('receipts', receipt);
        loadData();
    }, [loadData]);

    const onMarkInventoryReceived = useCallback(async (id: string) => {
        const item = countyInventory.find(i => i.id === id);
        if (item) {
            await apiService.saveModuleRecord('county_inventory', {
                ...item,
                status: 'received',
                lastUpdated: new Date().toISOString()
            });
            loadData();
            alert("Inventory received and acknowledged.");
        }
    }, [countyInventory, loadData]);

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

    const handleSaveAttendance = useCallback(async (timetableEntryId: string, attendanceData: { studentId: string, status: 'present' | 'absent' | 'late' }[]) => {
        if (!currentUser || !activeInstitution) return;

        try {
            const now = new Date().toISOString();
            const dateStr = now.split('T')[0];
            const promises = attendanceData.map(record => {
                const existing = studentAttendances.find(a => a.timetableEntryId === timetableEntryId && a.studentId === record.studentId && a.date === dateStr);
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
                    const student = users.find(u => u.id === studentRecord.studentId);
                    const parent = users.find(u => u.role === 'parent' && u.studentIds?.includes(studentRecord.studentId));
                    const lesson = generatedTimetable.find(l => l.id === timetableEntryId);
                    const subject = subjects.find(s => s.id === lesson?.subjectId);

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
                                    getInstitutionEmailConfig(activeInstitution!, companyDetails.emailConfig)
                                );
                        }
                    }
                }
            }

            alert("Attendance records saved successfully.");
        } catch (error: any) {
            console.error("Failed to save attendance:", error);
            alert(`Failed to save attendance: ${error.message || "Unknown error"}`);
        }
    }, [currentUser, activeInstitution, studentAttendances, loadData, users, generatedTimetable, subjects, companyDetails.emailConfig]);

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
            alert("Institutional demo data has been generated successfully.");
        } catch (error) {
            console.error("Demo data generation failed:", error);
            alert("Failed to generate demo data.");
        } finally {
            setIsGeneratingDemoData(false);
            setDemoDataGenerationProgress(0);
            setDemoDataGenerationMessage("");
        }
    }, [currentUser, activeInstitution, onUpdateInstitution, loadData]);
    



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
            alert("All institutional data has been cleared.");
        } catch (error) {
            console.error("Failed to clear demo data:", error);
            alert("Failed to clear data.");
        } finally {
            setIsGeneratingDemoData(false);
            setDemoDataGenerationProgress(0);
            setDemoDataGenerationMessage("");
        }
    }, [currentUser, activeInstitution, loadData]);

    const handleAddTimeOffRequest = useCallback(async (data: Partial<TimeOffRequest>) => {
        try {
            const instId = activeInstitution?.id || currentUser?.institutionId;
            if (!instId || !currentUser) return;
            const req: TimeOffRequest = {
                ...data,
                id: `to_${Date.now()}`,
                lecturerId: data.lecturerId || currentUser.id,
                status: 'pending',
                institutionId: instId,
                timestamp: new Date().toISOString()
            } as TimeOffRequest;
            await apiService.saveModuleRecord('time_off_requests', req);
            await loadData();
            alert("Time off request submitted successfully.");
        } catch (error) {
            console.error("Failed to submit time off request:", error);
            alert("Failed to submit time off request.");
        }
    }, [currentUser, activeInstitution, loadData]);

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
            alert('County added successfully!');
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

            alert(errorMessage + '\n\nCheck the browser console for details.');
        }
    }, [loadData]);

    const handleUpdateCounty = useCallback(async (id: string, data: Partial<County>) => {
        try {
            const existing = counties.find(c => c.id === id);
            if (existing) {
                await apiService.saveModuleRecord('counties', { ...existing, ...data });
                await loadData();
            }
        } catch (error) {
            console.error("Failed to update county:", error);
            alert("Failed to update county.");
        }
    }, [counties, loadData]);

    const handleAddCoopAgrovetInventory = useCallback(async (data: any) => {
        try {
            await apiService.saveCoopAgrovetInventory(data);
            await loadData();
            alert("Agrovet inventory added successfully.");
        } catch (error: any) {
            console.error("Failed to add Agrovet inventory:", error);
            alert(`Failed: ${error.message || JSON.stringify(error)}`);
        }
    }, [loadData]);

    const handleAddCoopAgrovetSale = useCallback(async (data: any) => {
        try {
            await apiService.saveCoopAgrovetSale(data);
            await loadData();
            alert("Agrovet sale recorded successfully.");
        } catch (error: any) {
            console.error("Failed to record Agrovet sale:", error);
            alert(`Failed: ${error.message || JSON.stringify(error)}`);
        }
    }, [loadData]);

    const handleDeleteCounty = useCallback(async (id: string) => {
        try {
            await apiService.deleteModuleRecord('counties', id);
            await loadData();
        } catch (error) {
            console.error("Failed to delete county:", error);
            alert("Failed to delete county.");
        }
    }, [loadData]);

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
            alert(`Institution registered successfully!\n\nAdmin Credentials: \nEmail: ${newAdmin.email} \nPassword: ${generatedPassword} \n\n(Account details have been sent to ${newAdmin.email})`);
        } catch (error: any) {
            console.error("Failed to register institution:", error);
            alert(`Failed to register institution: ${error.message || 'Unknown error'}`);
        }
    }, [loadData, companyDetails]);

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
        alert(`Bulk Import Complete!\n\nSuccessfully registered: ${successCount} \nFailed: ${failCount}`);
    }, [loadData, companyDetails]);


    const commonLoginProps = {
        users, institutions, courses, academicLevels, logoUrl: companyDetails.logoUrl, applicationTitle: companyDetails.applicationTitle, registrationProgress: null, registrationMessage: "",
        onOpenGuestPortal: () => setShowGuestPortal(true),
        onOpenGuestFeedback: () => setShowGuestFeedback(true),
        onOpenMarketplace: () => setShowMarketplace(true),
        onOpenShowcase: () => setShowMarketing(true),
        onBookDemo: () => setShowBookDemo(true),
        themeColor: companyDetails.themeColor || "#4f46e5",
        onParentRequestOtp: () => ({ success: true, message: '' }), onParentVerifyOtp: () => ({ success: true, message: '' }), companyDetails: companyDetails,
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
                    category: data.category
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

    const [selectedRole, setSelectedRole] = useState<Role | null>(null);

    const activeRole = useMemo(() => {
        if (impersonatedRole) return impersonatedRole;
        if (!currentUser) return null;

        const roleToUse = selectedRole || currentUser.role;

        // Redirect school administrators to the County Portal if their school is registered to a county
        const inst = institutions.find(i => i.id === currentUser.institutionId);
        if (inst?.countyId && (roleToUse === 'admin' || roleToUse === 'head_teacher')) {
            return 'county_admin';
        }

        // Force Reseller role for admins of Reseller institutions
        if (inst?.institutionType === 'Reseller' && roleToUse === 'admin') {
            return 'reseller';
        }

        return roleToUse;
    }, [impersonatedRole, currentUser, institutions, selectedRole]);
    const isAdminCatchAll = ['super_admin', 'admin', 'head_teacher', 'hod', 'tto', 'dos', 'deputy', 'agrovet_admin', 'property_admin', 'his_admin', 'carwash_admin', 'transport_admin', 'reseller', 'fuel_admin', 'legal_admin', 'cooperative_manager', 'coop_chairman', 'sacco_officer', 'coop_admin', 'pharmacy_admin'].includes(activeRole || '');

    const isFullWidthLayout = useMemo(() => {
        return activeRole === 'super_admin' || activeRole === 'county_admin' || isAdminCatchAll;
    }, [activeRole, isAdminCatchAll]);

    const activeCounty = useMemo(() => {
        if (!currentUser || !Array.isArray(counties)) return null;

        // Match by current user's institutionId (if it's a county ID)
        const directMatch = counties.find(c => c.id === currentUser.institutionId);
        if (directMatch) return directMatch;

        // Alternative check: find user's institution and check its countyId
        const myInst = institutions.find(i => i.id === currentUser.institutionId);
        if (myInst?.countyId) {
            return counties.find(c => c.id === myInst.countyId) || null;
        }

        return null;
    }, [counties, currentUser, institutions]);

    const activeBranding = useMemo(() => {
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
    }, [activeRole, activeCounty, activeInstitution, companyDetails]);

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
            message={isTransitioning ? "Establishing secure perspective link..." : (loadError ? "System Handshake Compromised" : "Establishing secure cloud registry link...")} 
            status={isTransitioning ? "Synchronizing Session Buffers..." : (loadError || loadStatus || "Synchronizing Neural Buffers...")} 
            onRetry={loadError ? () => loadData(true) : undefined} 
        />
    );
    if (isSchemaInitializationRequired) return <SchemaInitializationView onComplete={() => loadData(true)} />;
    
    // Safety guard: ensure activeInstitution is loaded for institution-dependent roles
    const isInstitutionRole = currentUser && !['super_admin', 'county_admin'].includes(activeRole || '') && !activeRole?.startsWith('county_');

    if (isInstitutionRole && !activeInstitution && institutions.length > 0) {
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
                    console.error("Account activation failed:", err);
                    alert(`Failed to activate account: ${err.message || 'Unknown error'}`);
                    throw err; // Re-throw to let MandatoryUpdateView handle local UI state if needed
                }
            }} onLogout={handleLogout} logoUrl={activeBranding.logoUrl} />;
        }
    }


    return (
        <AppErrorBoundary>
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
                        />
                        <main className={`flex-grow mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full transition-all duration-300 ${isFullWidthLayout ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
                            <Suspense fallback={<SystemPulseLoader message="Initializing Portal..." status="Loading perspective environment" />}>
                                {isPharmacySystemOpen ? (
                                    <div className="p-8 bg-slate-950 min-h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl">
                                        <ModernPharmacyManager 
                                             institutionId={activeInstitution?.id || currentUser?.institutionId || ''} 
                                             currentUser={currentUser!}
                                         />
                                    </div>
                                ) : (
                                    (activeRole === 'admin' || activeRole === 'head_teacher' || activeRole === 'campaign_admin' || activeRole === 'campaign_agent') && 
                                    !['Property Management', 'Agrovet', 'Cooperative', 'SACCO', 'Church', 'HIS', 'Car Wash', 'Pharmacy'].includes(activeInstitution?.institutionType || '') && 
                                    !activeInstitution?.businessSubType?.toLowerCase().includes('property management') && 
                                    !activeInstitution?.businessSubType?.toLowerCase().includes('agrovet') && 
                                    !activeInstitution?.businessSubType?.toLowerCase().includes('pharmacy')
                                ) ? (
                                <AdminView
                                    currentUser={currentUser}
                                    notifications={notifications}
                                    activeRole={activeRole || undefined}
                                    users={users}
                                    requests={requests}
                                    allocations={allocations}
                                    departments={departments}
                                    subjects={subjects}
                                    courses={courses}
                                    rooms={rooms}
                                    buildings={buildings}
                                    academicLevels={academicLevels}
                                    academicYears={academicYears}
                                    semesters={semesters}
                                    saccoTransactions={saccoTransactions}
                                    coopAgrovetInventory={coopAgrovetInventory}
                                    onActivateModuleTrial={handleActivateModuleTrial}
                                    activeAcademicYear={activeAcademicYear}
                                    activeSemester={activeSemester}
                                    timetableSettings={timetableSettings}
                                    examTimetableSettings={activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                                    logoUrl={activeBranding.logoUrl}
                                    footerImageUrl={activeFooterImageUrl}
                                    themeColor={activeBranding.primaryColor}
                                    companyDetails={companyDetails}
                                    onUpdateCompanyDetails={async (d) => { await apiService.saveCompanySettings(d as any); loadData(); }}
                                    activityLog={activityLog}
                                    transactions={transactions}
                                    onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                    onRefreshData={async () => await loadData(false, true)}
                                    receipts={receipts}
                                    invoices={invoices}
                                    extensionRequests={extensionRequests}
                                    voteHeads={voteHeads}
                                    feeStructures={feeStructures}
                                    financialPeriods={financialPeriods}
                                    userTasks={userTasks}
                                    generatedTimetable={generatedTimetable}
                                    allTimetableEntries={generatedTimetable}
                                    finalTimetableUrl={null}
                                    letterheadConfig={activeLetterheadConfig}
                                    smsConfig={(activeInstitution?.smsConfig || companyDetails.smsConfig) as any}
                                    emailConfig={activeInstitution?.emailConfig || companyDetails.emailConfig}
                                    timetableConflicts={timetableConflicts}
                                    retailExpenses={retailExpenses}
                                    onAddRetailExpense={handleAddRetailExpense}
                                    onAddRequisition={handleAddRequisition}
                                    onUpdateRequisition={handleUpdateRequisition}
                                    retailStores={retailStores}
                                    inventory={retailInventory}
                                    suppliers={suppliers}
                                    currentInstitution={activeInstitution}
                                    counties={counties}
                                    carListings={carListings}
                                    carTestDrives={carTestDrives}
                                    carAppraisals={carAppraisals}
                                    onAddCarListing={async (data: Partial<CarListing>) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCarListing({ ...data, id: `v_${Date.now()}`, institutionId: instId || '' });
                                        await loadData();
                                    }}
                                    onUpdateCarTestDriveStatus={async (id: string, status: any) => {
                                        const existing = carTestDrives.find(t => t.id === id);
                                        if (existing) {
                                            await apiService.saveCarTestDrive({ ...existing, status });
                                            await loadData();
                                        }
                                    }}

                                    onAddUser={async (userData) => {
                                        try {
                                            const targetInstitutionId = currentUser?.institutionId;
                                            if (!targetInstitutionId) throw new Error("Institution context missing.");
                                            await apiService.registerUser({
                                                ...userData,
                                                id: generateUserId(),
                                                institutionId: targetInstitutionId
                                            }, activeInstitution?.name);
                                            loadData();
                                        } catch (err: any) {
                                            console.error("User registration failed:", err);
                                            throw err;
                                        }
                                    }}
                                    onEditUser={onEditUser}
                                    onDeleteUser={onDeleteUser}
                                    onImportUsers={onImportUsers}
                                    onImportStudents={onImportStudents}
                                    onAddDepartment={handleAddDepartment}
                                    onUpdateDepartment={handleUpdateDepartment}
                                    onDeleteDepartment={handleDeleteDepartment}
                                    onImportDepartments={handleImportDepartments}
                                    onAddSubject={handleAddSubject}
                                    onUpdateSubject={handleUpdateSubject}
                                    onDeleteSubject={handleDeleteSubject}
                                    onAddBuilding={handleAddBuilding}
                                    onUpdateBuilding={handleUpdateBuilding}
                                    onDeleteBuilding={handleDeleteBuilding}
                                    onAddRoom={handleAddRoom}
                                    onUpdateRoom={handleUpdateRoom}
                                    onDeleteRoom={handleDeleteRoom}
                                    onImportRooms={handleImportRooms}
                                    onAddCourse={handleAddCourse}
                                    onImportCourses={handleImportCourses}
                                    onUpdateCourse={handleUpdateCourse}
                                    onDeleteCourse={handleDeleteCourse}
                                    onAddAcademicLevel={handleAddAcademicLevel}
                                    onUpdateAcademicLevel={handleUpdateAcademicLevel}
                                    onDeleteAcademicLevel={handleDeleteAcademicLevel}
                                    onAddAcademicYear={async (data) => { await apiService.saveModuleRecord('academic_years', { ...data, id: `ay_${Date.now()}`, institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); }}
                                    onUpdateAcademicYear={async (id, data) => { const existing = academicYears.find(y => y.id === id); await apiService.saveModuleRecord('academic_years', { ...existing, ...data, id }); loadData(); }}
                                    onDeleteAcademicYear={async (id) => { await apiService.deleteModuleRecord('academic_years', id); loadData(); }}
                                    onAddSemester={async (data) => { await apiService.saveModuleRecord('semesters', { ...data, id: `sem_${Date.now()}`, institutionId: currentUser!.institutionId }); loadData(); }}
                                    onUpdateSemester={async (id, data) => { const existing = semesters.find(s => s.id === id); await apiService.saveModuleRecord('semesters', { ...existing, ...data, id }); loadData(); }}
                                    onDeleteSemester={async (id) => { await apiService.deleteModuleRecord('semesters', id); loadData(); }}
                                    onUpdateRequestStatus={async (id, status) => { await apiService.updateAllocationStatus(id, status); loadData(); }}
                                    onBulkUpdateRequestStatus={async (status, deptId) => { const targets = requests.filter(r => r.status === 'pending' || r.status === 'hod_approved'); for (const t of targets) await apiService.updateAllocationStatus(t.id, status); loadData(); }}
                                    onDirectAssign={handleDirectAssign}
                                    onTimetableGenerated={async (entries, ay, sem) => { 
                                        const entriesWithIds = (entries as any[]).map(e => ({
                                            ...e,
                                            id: e.id || `tt_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                                            institutionId: currentUser!.institutionId,
                                            academicYearId: ay,
                                            semesterId: sem
                                        }));
                                        await apiService.saveTimetable(currentUser!.institutionId, ay, sem, entriesWithIds as TimetableEntry[]); 
                                        setGeneratedTimetable(entriesWithIds as TimetableEntry[]);
                                        await handleLogAction(`Generated timetable for ${ay} / ${sem}`); 
                                        await loadData(); 
                                    }}
                                    onExamTimetableGenerated={async (entries, ay, sem) => { 
                                        await apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries); 
                                        await handleLogAction(`Generated exam timetable for ${ay} / ${sem}`); 
                                        await loadData();
                                    }}
                                    onSaveTimetableSettings={(config) => { onUpdateInstitution(activeInstitution!.id, { timetableSettings: config }); handleLogAction(`Saved timetable settings`); }}
                                    onSaveExamTimetableSettings={(config) => { onUpdateInstitution(activeInstitution!.id, { examTimetableSettings: config }); handleLogAction(`Saved exam timetable settings`); }}
                                    onUpdateLogo={(logo) => { onUpdateInstitution(activeInstitution!.id, { logoUrl: logo }); handleLogAction(`Updated institution logo`); }}
                                    onUpdateFooterImage={(footer) => { onUpdateInstitution(activeInstitution!.id, { footerImageUrl: footer }); handleLogAction(`Updated institution footer image`); }}
                                    onUpdateThemeColor={(color) => { onUpdateInstitution(activeInstitution!.id, { themeColor: color }); handleLogAction(`Updated institution theme color`); }}
                                    onUpdateInstitution={onUpdateInstitution}
                                    onAddTask={async (t) => { await apiService.saveModuleRecord('tasks', { ...t, userId: currentUser.id, id: `t_${Date.now()}`, createdAt: new Date().toISOString() }); await handleLogAction(`Added task: ${t.title}`); loadData(); }}
                                    onUpdateTask={async (id, c) => { const task = userTasks.find(x => x.id === id); if (task) { await apiService.saveModuleRecord('tasks', { ...task, isComplete: c }); await handleLogAction(`${c ? 'Completed' : 'Reopened'} task: ${task.title}`); loadData(); } }}
                                    onDeleteTask={async (id) => { const task = userTasks.find(x => x.id === id); if (task) { await apiService.deleteModuleRecord('tasks', id); await handleLogAction(`Deleted task: ${task.title}`); loadData(); } }}
                                    onLogAction={handleLogAction}
                                    onSendBulkCredentials={async (users, method) => {
                                        const res = await apiService.sendBulkCredentials(users, method);
                                        await handleLogAction(`Sent bulk credentials to ${res.success_count} users via ${method}`);
                                        return res;
                                    }}
                                    onSendSms={async (r, m, config, units, instId) => { const res = await apiService.sendSms(r, m, config, units, instId || activeInstitution?.id); await handleLogAction(`Sent SMS to ${r}`); return res; }}
                                    onSaveSmsConfig={async (config) => { await onUpdateInstitution(activeInstitution!.id, { smsConfig: config }); await handleLogAction(`Updated SMS configuration`); }}
                                    onUpdateRequest={async (id, data) => { await apiService.saveModuleRecord('allocation_requests', { id, ...data }); await handleLogAction(`Updated allocation request`); loadData(); }}
                                    onWithdrawRequest={async (id) => { await apiService.deleteModuleRecord('allocation_requests', id); await handleLogAction(`Withdrew allocation request`); loadData(); }}
                                    onAddUnavailability={async (u) => { /* Placeholder */ await handleLogAction(`Added unavailability`); }}
                                    onUpdateUnavailability={async (id, u) => { /* Placeholder */ await handleLogAction(`Updated unavailability`); }}
                                    onDeleteUnavailability={() => { }}
                                    onManageUnavailability={() => { }}
                                    onAddParent={async (sid, p) => apiService.saveModuleRecord('users', { ...p, role: 'parent', id: `u_par_${Date.now()}`, institutionId: currentUser.institutionId, studentIds: [sid] }).then(() => { handleLogAction(`Added parent for student ${sid}`); return { success: true, message: 'Parent added.' }; })}
                                    onDeleteParent={() => { }}
                                    getLecturerById={getLecturerById}
                                    getSubjectById={getSubjectById}
                                    getRoomById={getRoomById}
                                    onPublishTimetable={() => { }}
                                    onRemovePublishedTimetable={() => { }}
                                    onSendTestEmail={async (r) => ({ success: true, message: 'Test email sent.' })}
                                    onSaveEmailConfig={() => { }}
                                    onSaveLetterheadConfig={(config) => onUpdateInstitution(activeInstitution!.id, { letterheadConfig: config })}
                                    onImportSubjectsAndAssociate={handleImportSubjectsAndAssociate}
                                    onAssociateSubjectToCourseLevel={handleAssociateSubjectToCourseLevel}
                                    onDisassociateSubjectFromCourseLevel={handleDisassociateSubjectFromCourseLevel}
                                    onAddExtensionRequest={handleAddExtensionRequest}
                                    onUpdateExtensionRequestStatus={handleUpdateExtensionRequestStatus}
                                    onSaveBiometricConfig={() => { }}
                                    onUpdateVoteHeads={() => { }}
                                    onUpdateFeeStructures={() => { }}
                                    onUpdateFinancialPeriods={() => { }}
                                    onAddBuildings={async (b) => { }}
                                    timeOffRequests={timeOffRequests}
                                    onAddTimeOffRequest={handleAddTimeOffRequest}
                                    onUpdateTimeOffRequestStatus={async () => { }}
                                    enrollmentRequests={enrollmentRequests}
                                    absenceRequests={absenceRequests}
                                    studentAbsenceRequests={studentAbsenceRequests}





                                    securityAlerts={securityAlerts}
                                    visitors={visitors}
                                    requisitions={requisitions}
                                    studentAttendances={studentAttendances}
                                    studentCheckIns={studentCheckIns}
                                    lessonRatings={lessonRatings}
                                    feedbackSubmissions={feedbackSubmissions}
                                    onUpdateFeedbackStatus={() => { }}
                                    courseSizes={courseSizes}
                                    assessments={assessments}
                                    assessmentMarks={assessmentMarks}
                                    onAddAssessment={async (d: any) => { await apiService.saveModuleRecord('assessments', { ...d, id: `asm_${Date.now()} `, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                    onDeleteAssessment={async (id: string) => { await apiService.deleteModuleRecord('assessments', id); loadData(); }}
                                    onUpdateAssessmentStatus={() => { }}
                                    onSaveAssessmentMarks={async (id: string, marks: any[]) => {
                                        const promises = marks.map((m: any) => {
                                            const existing = assessmentMarks.find(am => am.assessmentId === id && am.studentId === m.studentId);
                                            const recordId = existing ? existing.id : `am_${id}_${m.studentId}_${Date.now()} `;
                                            const record: AssessmentMark = {
                                                id: recordId,
                                                assessmentId: id,
                                                studentId: m.studentId,
                                                marks: m.marks,
                                                comments: m.comments,
                                                gradedBy: currentUser.id,
                                                timestamp: new Date().toISOString(),
                                                institutionId: currentUser.institutionId
                                            };
                                            return apiService.saveModuleRecord('assessment_marks', record);
                                        });
                                        await Promise.all(promises);
                                        loadData();
                                    }}
                                    contracts={contracts}
                                    onGenerateDemoData={handleGenerateDemoData}
                                    onClearDemoData={handleClearDemoData}
                                    isGeneratingDemoData={isGeneratingDemoData}
                                    demoDataGenerationProgress={demoDataGenerationProgress}
                                    demoDataGenerationMessage={demoDataGenerationMessage}
                                    examTimetable={examTimetable}
                                    onSwitchPerspective={(role) => setImpersonatedRole(role)}
                                    isImpersonating={!!impersonatedRole}
                                    vehicles={vehicles}
                                    transportOnboarding={transportOnboarding}
                                    vehicleLogs={vehicleLogs}
                                    onAddVehicle={handleAddVehicle}
                                    onUpdateVehicle={handleUpdateVehicle}
                                    onDeleteVehicle={handleDeleteVehicle}
                                    onLogGateAction={handleLogGateAction}
                                    onOnboardStudent={handleOnboardStudent}
                                    onOffboardStudent={handleOffboardStudent}
                                    onConfirmReceipt={handleConfirmReceipt}
                                    onAddInstitution={() => { }}
                                    onDeleteInstitution={() => { }}
                                    onToggleInstitutionStatus={() => { }}
                                    onLoginAsAdmin={() => { }}
                                    onGenerateReceipt={() => { }}
                                    coopFarmers={coopFarmers}
                                    coopCollections={coopCollections}
                                    coopRiders={coopRiders}
                                    coopAgrovetSales={coopAgrovetSales}
                                    saccoAccounts={saccoAccounts}
                                    coopPayouts={coopPayouts}
                                    coopExpenses={coopExpenses}
                                    coopIncome={coopIncome}
                                    lawClients={lawClients}
                                    lawMatters={lawMatters}
                                    lawDocuments={lawDocuments}
                                    lawTimeEntries={lawTimeEntries}
                                    lawInvoices={lawInvoices}
                                    lawTrustTransactions={lawTrustTransactions}
                                    onAddLawClient={handleAddLawClient}
                                    onAddLawMatter={handleAddLawMatter}
                                    onAddLawTimeEntry={handleAddLawTimeEntry}
                                    onAddLawTrustTransaction={handleAddLawTrustTransaction}
                                    onAddLawInvoice={handleAddLawInvoice}
                                    onUpdateLawMatter={handleUpdateLawMatter}
                                    lawAgreementTemplates={lawAgreementTemplates}
                                    lawAgreements={lawAgreements}
                                    onAddLawAgreementTemplate={handleAddLawAgreementTemplate}
                                    onGenerateLawAgreement={handleGenerateLawAgreement}
                                    onApproveLawAgreement={handleApproveLawAgreement}
                                    dsInstructors={dsInstructors}
                                    dsVehicles={dsVehicles}
                                    dsStudents={dsStudents}
                                    dsLessons={dsLessons}
                                    dsMastery={dsMastery}
                                    dsSettings={dsSettings}
                                    onAddDSInstructor={handleAddDSInstructor}
                                    onAddDSVehicle={handleAddDSVehicle}
                                    onAddDSStudent={handleAddDSStudent}
                                    onAddDSLesson={handleAddDSLesson}
                                    onAddDSMastery={handleAddDSMastery}
                                    onUpdateDSSettings={handleUpdateDSSettings}
                                    onAddFarmer={async (data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const payload = { ...data, id: `f_${Date.now()}`, institutionId: instId };
                                        console.log("[Coop Add] Saving farmer:", payload);
                                        await apiService.saveModuleRecord('coop_farmers', payload); 
                                        console.log("[Coop Add] Save complete, refreshing data...");
                                        await loadData(); 
                                    }}
                                    onImportFarmers={async (farmers) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const timestamp = Date.now();
                                        const payloads = farmers.map((f, i) => ({
                                            ...f,
                                            id: f.id || `f_${timestamp}_${i}`,
                                            institutionId: instId
                                        }));
                                        console.log(`[Coop Import] Saving ${payloads.length} farmers...`);
                                        await apiService.saveModuleRecords('coop_farmers', payloads);
                                        console.log("[Coop Import] Bulk save complete, refreshing data...");
                                        await loadData();
                                    }}
                                    onUpdateFarmer={async (id, data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        console.log("[Coop Update] Saving farmer:", { id, ...data });
                                        await apiService.saveModuleRecord('coop_farmers', { ...data, id, institutionId: instId }); 
                                        await loadData(); 
                                    }}
                                    onBulkConfirmCollections={async (riderId, pendingCollections) => {
                                        const now = new Date().toISOString();
                                        const payloads = pendingCollections.map(c => ({
                                            ...c,
                                            factoryConfirmed: true,
                                            finalQuantity: c.quantity,
                                            confirmedBy: currentUser.id,
                                            confirmedAt: now,
                                            status: 'delivered'
                                        }));
                                        console.log(`[Coop Bulk Confirm] Confirming ${payloads.length} collections...`);
                                        await apiService.saveModuleRecords('coop_collections', payloads);
                                        await loadData();
                                    }}
                                    onLogCollection={async (data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const payload = { 
                                            ...data, 
                                            id: `c_${Date.now()}`, 
                                            institutionId: instId,
                                            recordedBy: currentUser.id,
                                            farmer_id: data.farmerId || data.farmer_id
                                        };
                                        await apiService.saveModuleRecord('coop_collections', payload); 
                                        await loadData(); 
                                    }}
                                    onImportCollections={async (collections) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const timestamp = Date.now();
                                        const payloads = collections.map((c, i) => ({
                                            ...c,
                                            id: `c_${timestamp}_${i}`,
                                            institutionId: instId,
                                            recordedBy: currentUser.id,
                                            status: 'pending'
                                        }));
                                        console.log(`[Coop Import] Saving ${payloads.length} collections...`);
                                        await apiService.saveModuleRecords('coop_collections', payloads);
                                        await loadData();
                                    }}
                                    onAddRider={async (data: CoopRider) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const riderId = `r_${Date.now()}`;
                                        await apiService.saveModuleRecord('coop_riders', { ...data, id: riderId, institutionId: instId }); 
                                        
                                        // Auto-register a user for the rider to enable portal access
                                        await apiService.registerUser({
                                            name: data.name,
                                            phoneNumber: data.phone,
                                            role: 'rider',
                                            riderId: riderId,
                                            institutionId: instId,
                                            email: `${data.phone}@eduai.co.ke`
                                        }, activeInstitution?.name);
                                        
                                        await loadData(); 
                                    }}
                                    onConfirmCollection={async (id, qty) => { 
                                        await apiService.confirmCoopCollection(id, qty, currentUser.id); 
                                        const col = coopCollections.find(c => c.id === id);
                                        const farmer = coopFarmers.find(f => f.id === col?.farmerId);
                                        if (col && farmer && qty === col.quantity) {
                                            await apiService.sendSms(farmer.phone, `Your ${col.productType} delivery on ${col.collectionDate} has been confirmed at Factory. Final Qty: ${qty} ${col.unit}. Thank you!`, activeInstitution?.smsConfig, 1, activeInstitution?.id);
                                        }
                                        await loadData(); 
                                    }}
                                    onApproveCollection={async (id, status) => { 
                                        await apiService.approveCoopCollection(id, currentUser.id, status); 
                                        if (status === 'approved') {
                                            const col = coopCollections.find(c => c.id === id);
                                            const farmer = coopFarmers.find(f => f.id === col?.farmerId);
                                            if (col && farmer) {
                                                await apiService.sendSms(farmer.phone, `Your ${col.productType} delivery discrepancy for ${col.collectionDate} has been RESOLVED and APPROVED by the board. Final Qty: ${col.finalQuantity} ${col.unit}.`, activeInstitution?.smsConfig, 1, activeInstitution?.id);
                                            }
                                        }
                                        await loadData(); 
                                    }}
                                    onAddCoopIncome={async (data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCoopIncome({ ...data, id: `inc_${Date.now()}`, institutionId: instId, recordedBy: currentUser.id }); 
                                        await loadData(); 
                                    }}
                                    onAddCoopExpense={async (data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCoopExpense({ ...data, id: `exp_${Date.now()}`, institutionId: instId, recordedBy: currentUser.id }); 
                                        await loadData(); 
                                    }}
                                    onInitiatePayouts={async (payoutIds) => {
                                        await apiService.disburseBulkMpesa(payoutIds, currentUser.id);
                                        loadData();
                                    }}
                                    onApprovePayouts={async (payoutIds, status = 'approved') => {
                                        await apiService.updatePayoutStatus(payoutIds, status, currentUser.id);
                                        loadData();
                                    }}
                                    onAddPayouts={async (payouts: any[]) => {
                                        await apiService.saveModuleRecords('coop_monthly_payouts', payouts);
                                        loadData();
                                    }}
                                />
                             ) : (activeRole === 'pharmacist' || activeRole === 'pharmacy_admin' || (activeRole === 'admin' && (activeInstitution?.institutionType === 'Pharmacy' || activeInstitution?.institutionType === 'Chemist' || activeInstitution?.businessSubType === 'Pharmacy' || activeInstitution?.businessSubType === 'Chemist'))) ? (
                                <div className="p-8 bg-slate-950 min-h-screen">
                                    <ModernPharmacyManager 
                                         institutionId={activeInstitution?.id || currentUser?.institutionId || ''} 
                                         currentUser={currentUser!}
                                     />
                                </div>
                             ) : (isPharmacySystemOpen) ? (
                                <div className="p-8 bg-slate-950 min-h-screen">
                                    <ModernPharmacyManager 
                                         institutionId={activeInstitution?.id || currentUser?.institutionId || ''} 
                                         currentUser={currentUser!}
                                     />
                                </div>
                            ) : ((isHealthSystemOpen && !['property_admin', 'landlord', 'tenant'].includes(activeRole || '') && activeInstitution?.institutionType !== 'Property Management') || activeRole === 'his_admin') ? (
                                <HealthCoreView 
                                    activeRole={activeRole as Role} 
                                    userName={currentUser?.name} 
                                    institutionId={activeInstitution?.id || currentUser?.institutionId}
                                />
                            ) : activeRole === 'super_admin' ? (
                                <SuperAdminView
                                    isTimetableGenerating={false}
                                    timetableGenerationProgress={0}
                                    timetableGenerationMessage=""
                                    timetableGenerationEta={null}
                                    currentUser={currentUser}
                                    notifications={notifications}
                                    institutions={institutions}
                                    counties={counties}
                                    users={users}
                                    subjects={subjects}
                                    departments={departments}
                                    courses={courses}
                                    companyDetails={companyDetails}
                                    onUpdateCompanyDetails={async (d) => { await apiService.saveCompanySettings(d as any); loadData(); }}
                                    transactions={transactions}
                                    demoRequests={demoRequests}
                                    onUpdateDemoStatus={onUpdateDemoStatus}
                                    receipts={receipts}
                                    activityLog={activityLog}
                                    onImportUsers={onImportUsers}
                                    onImportStudents={onImportStudents}
                                    onDeleteUser={onDeleteUser}
                                    onEditUser={onEditUser}
                                    onAddInstitution={async (d) => { 
                                         const newId = (d as any).id || `inst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; 
                                         const now = new Date().toISOString();
                                         await apiService.saveInstitution({ 
                                             ...d, 
                                             id: newId,
                                             createdAt: now,
                                             updatedAt: now
                                         } as any); 
                                         const role = d.institutionType === 'Reseller' ? 'reseller' : 'admin'; 
                                         await apiService.registerUser({ 
                                             id: `u_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, 
                                             name: `${d.name} Admin`, 
                                             email: d.email, 
                                             phoneNumber: d.phoneNumber, 
                                             role: role, 
                                             institutionId: newId, 
                                             countyId: (d as any).countyId, 
                                             status: 'active',
                                             createdAt: now,
                                             updatedAt: now
                                         } as any, d.name); 
                                         loadData(); 
                                     }}
                                    onUpdateInstitution={onUpdateInstitution}
                                    onDeleteInstitution={(id) => { if (id) onDeleteInstitution(id); }}
                                    onToggleInstitutionStatus={onToggleInstitutionStatus}
                                    onLoginAsAdmin={onLoginAsAdmin}
                                    allocations={allocations}
                                    requests={requests}
                                    semesters={semesters}
                                    letterheadConfig={activeLetterheadConfig}
                                    footerImageUrl={activeFooterImageUrl}
                                    onSendSms={async (r, m, config, units, instId) => { 
                                        const res = await apiService.sendSms(r, m, config, units, instId); 
                                        await handleLogAction(`Sent SMS to ${r}`); 
                                        return res; 
                                    }}
                                    
                                    onRefreshData={async () => await loadData(false, true)}
                                    onAddCounty={handleAddCounty}
                                    onUpdateCounty={handleUpdateCounty}
                                    onDeleteCounty={handleDeleteCounty}
                                    rooms={rooms}
                                    buildings={buildings}
                                    academicLevels={academicLevels}
                                    academicYears={academicYears}
                                    activeAcademicYear={activeAcademicYear}
                                    activeSemester={activeSemester}
                                    timetableSettings={timetableSettings}
                                    examTimetableSettings={activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                                    onTimetableGenerated={async (entries, ay, sem) => apiService.saveTimetable(currentUser!.institutionId, ay, sem, entries)}
                                    onExamTimetableGenerated={async (entries, ay, sem) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries)}
                                    onAddSubject={handleAddSubject}
                                    onUpdateSubject={handleUpdateSubject}
                                    onDeleteSubject={handleDeleteSubject}
                                    onAddCourse={handleAddCourse}
                                    onUpdateCourse={handleUpdateCourse}
                                    onDeleteCourse={handleDeleteCourse}
                                    onImportCourses={handleImportCourses}
                                    onAddUser={async (userData) => {
                                        try {
                                            const targetInstitutionId = currentUser?.role === 'super_admin' ? 'SYSTEM' : currentUser?.institutionId;
                                            if (!targetInstitutionId) throw new Error("Institution context missing.");
                                            await apiService.registerUser({
                                                ...userData,
                                                id: generateUserId(),
                                                institutionId: targetInstitutionId
                                            }, activeInstitution?.name);
                                            loadData();
                                        } catch (err: any) {
                                            console.error("User registration failed:", err);
                                            throw err;
                                        }
                                    }}
                                    onAddAcademicYear={async (data) => { await apiService.saveModuleRecord('academic_years', { ...data, id: generateId('ay'), institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); }} onAddSemester={async (data) => { await apiService.saveModuleRecord('semesters', { ...data, id: generateId('sem'), institutionId: currentUser!.institutionId }); loadData(); }} onAddDepartment={handleAddDepartment} onUpdateDepartment={handleUpdateDepartment} onDeleteDepartment={handleDeleteDepartment} onImportDepartments={handleImportDepartments} onAddBuilding={handleAddBuilding} onUpdateBuilding={handleUpdateBuilding} onDeleteBuilding={handleDeleteBuilding} onAddRoom={handleAddRoom} onUpdateRoom={handleUpdateRoom} onDeleteRoom={handleDeleteRoom} onImportRooms={handleImportRooms} onAddAcademicLevel={handleAddAcademicLevel} onUpdateAcademicLevel={handleUpdateAcademicLevel} onDeleteAcademicLevel={handleDeleteAcademicLevel} onUpdateRequest={(id: string, data: any) => apiService.saveModuleRecord('allocation_requests', { id, ...data })} onWithdrawRequest={(id: string) => apiService.deleteModuleRecord('allocation_requests', id)}
                                    logoUrl={activeBranding.logoUrl}
                                    leaveOutRequests={leaveOutRequests}
                                    finalTimetableUrl={null}
                                    themeColor={activeBranding.primaryColor}
                                    invoices={invoices}
                                    extensionRequests={extensionRequests}
                                    voteHeads={voteHeads}
                                    feeStructures={feeStructures}
                                    financialPeriods={financialPeriods}
                                    userTasks={userTasks}
                                    generatedTimetable={generatedTimetable}
                                    allTimetableEntries={generatedTimetable}
                                    timetableConflicts={timetableConflicts}
                                    onUpdateLogo={(logo) => onUpdateInstitution(activeInstitution!.id, { logoUrl: logo })}
                                    onUpdateFooterImage={(footer) => onUpdateInstitution(activeInstitution!.id, { footerImageUrl: footer })}
                                    onSaveLetterheadConfig={(config) => onUpdateInstitution(activeInstitution!.id, { letterheadConfig: config })}
                                    onUpdateThemeColor={(color) => onUpdateInstitution(activeInstitution!.id, { themeColor: color })}
                                    onUpdateExtensionRequestStatus={handleUpdateExtensionRequestStatus}
                                    onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                    onAddExtensionRequest={handleAddExtensionRequest}
                                    timeOffRequests={timeOffRequests}
                                    onAddTimeOffRequest={handleAddTimeOffRequest}
                                    onUpdateTimeOffRequestStatus={async () => { }}
                                    enrollmentRequests={enrollmentRequests}
                                    absenceRequests={absenceRequests}
                                    studentAbsenceRequests={studentAbsenceRequests}



                                    securityAlerts={securityAlerts}
                                    visitors={visitors}
                                    requisitions={requisitions}
                                    studentAttendances={studentAttendances}
                                    studentCheckIns={studentCheckIns}
                                    lessonRatings={lessonRatings}
                                    feedbackSubmissions={feedbackSubmissions}
                                    courseSizes={courseSizes}
                                    assessments={assessments}
                                    assessmentMarks={assessmentMarks}
                                    contracts={contracts}
                                    isGeneratingDemoData={isGeneratingDemoData}
                                    demoDataGenerationProgress={demoDataGenerationProgress}
                                    demoDataGenerationMessage={demoDataGenerationMessage}
                                    onGenerateDemoData={handleGenerateDemoData}
                                    onClearDemoData={handleClearDemoData}
                                    examTimetable={examTimetable}
                                    onManualInvoice={(instId: string, items: InvoiceItem[], total: number, due: string) => { }}
                                     onUpdateRequestStatus={async (id, status) => { await apiService.updateAllocationStatus(id, status); await loadData(); }}
                                    onBulkUpdateRequestStatus={async (status: RequestStatus, deptId?: string) => { const targets = requests.filter(r => r.status === 'pending' || r.status === 'hod_approved'); for (const t of targets) await apiService.updateAllocationStatus(t.id, status); loadData(); }}
                                    onGenerateReceipt={onGenerateReceipt}
                                    getLecturerById={getLecturerById}
                                    getSubjectById={getSubjectById}
                                    getRoomById={getRoomById}
                                    onLogAction={handleLogAction}
                                    onSendBulkCredentials={async (users, method) => {
                                        const res = await apiService.sendBulkCredentials(users, method);
                                        await handleLogAction(`Sent bulk credentials to ${res.success_count} users via ${method}`);
                                        return res;
                                    }}
                                    smsConfig={companyDetails.smsConfig}
                                    emailConfig={companyDetails.emailConfig}
                                    onImportSubjectsAndAssociate={handleImportSubjectsAndAssociate}
                                    onSwitchPerspective={(role) => setImpersonatedRole(role)}
                                    onAddParent={async (sid: string, p: any) => apiService.saveModuleRecord('users', { ...p, role: 'parent', id: `u_par_${Date.now()}`, institutionId: currentUser.institutionId, studentIds: [sid] }).then(() => ({ success: true, message: 'Parent added.' }))}
                                    onDeleteParent={() => { }}
                                    assignments={assignments}
                                    submissions={submissions}
                                    onAddAssignment={async (d) => { await apiService.saveModuleRecord('assignments', { ...d, id: `asg_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                    onDeleteAssignment={async (id) => { await apiService.deleteModuleRecord('assignments', id); loadData(); }}
                                    onUpdateSubmission={async (id, data) => {
                                        const sub = submissions.find(s => s.id === id);
                                        if (sub) {
                                            await apiService.saveModuleRecord('submissions', { ...sub, ...data, status: 'graded' });
                                            loadData();
                                        }
                                    }}
                                    onAddAssessment={async (d: any) => { await apiService.saveModuleRecord('assessments', { ...d, id: `asm_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                    onDeleteAssessment={async (id: string) => { await apiService.deleteModuleRecord('assessments', id); loadData(); }}
                                    onSaveAssessmentMarks={async (id: string, marks: any[]) => {
                                        const promises = marks.map(m => {
                                            const existing = assessmentMarks.find(am => am.assessmentId === id && am.studentId === m.studentId);
                                            const recordId = existing ? existing.id : `am_${id}_${m.studentId}_${Date.now()}`;

                                            const record: AssessmentMark = {
                                                id: recordId,
                                                assessmentId: id,
                                                studentId: m.studentId,
                                                marks: m.marks,
                                                comments: m.comments,
                                                gradedBy: currentUser.id,
                                                timestamp: new Date().toISOString(),
                                                institutionId: currentUser.institutionId
                                            };
                                            return apiService.saveModuleRecord('assessment_marks', record);
                                        });
                                        await Promise.all(promises);
                                        loadData();
                                    }}
                                    isImpersonating={!!impersonatedRole}
                                    coopFarmers={coopFarmers}
                                    coopCollections={coopCollections}
                                    coopRiders={coopRiders}
                                    coopAgrovetInventory={coopAgrovetInventory}
                                    coopAgrovetSales={coopAgrovetSales}
                                    saccoAccounts={saccoAccounts}
                                    saccoTransactions={saccoTransactions}
                                    coopPayouts={coopPayouts}
                                    coopExpenses={coopExpenses}
                                    coopIncome={coopIncome}
                                    lawClients={lawClients}
                                    lawMatters={lawMatters}
                                    lawDocuments={lawDocuments}
                                    lawTimeEntries={lawTimeEntries}
                                    lawInvoices={lawInvoices}
                                    lawTrustTransactions={lawTrustTransactions}
                                    onAddLawClient={handleAddLawClient}
                                    onAddLawMatter={handleAddLawMatter}
                                    onAddLawTimeEntry={handleAddLawTimeEntry}
                                    onAddLawTrustTransaction={handleAddLawTrustTransaction}
                                    onAddLawInvoice={handleAddLawInvoice}
                                    onUpdateLawMatter={handleUpdateLawMatter}
                                    lawAgreementTemplates={lawAgreementTemplates}
                                    lawAgreements={lawAgreements}
                                    onAddLawAgreementTemplate={handleAddLawAgreementTemplate}
                                    onGenerateLawAgreement={handleGenerateLawAgreement}
                                    onApproveLawAgreement={handleApproveLawAgreement}
                                    dsInstructors={dsInstructors}
                                    dsVehicles={dsVehicles}
                                    dsStudents={dsStudents}
                                    dsLessons={dsLessons}
                                    dsMastery={dsMastery}
                                    dsSettings={dsSettings}
                                    onAddDSInstructor={handleAddDSInstructor}
                                    onAddDSVehicle={handleAddDSVehicle}
                                    onAddDSStudent={handleAddDSStudent}
                                    onAddDSLesson={handleAddDSLesson}
                                    onAddDSMastery={handleAddDSMastery}
                                    onUpdateDSSettings={handleUpdateDSSettings}
                                    onAddFarmer={handleAddFarmer}
                                    onUpdateFarmer={handleUpdateFarmer}
                                    onImportFarmers={handleImportFarmers}
                                    onLogCollection={handleLogCollection}
                                    onImportCollections={handleImportCollections}
                                    onBulkConfirmCollections={handleBulkConfirmCollections}
                                    onAddRider={handleAddRider}
                                    onConfirmCollection={handleConfirmCollection}
                                    onApproveCollection={handleApproveCollection}
                                    onAddCoopExpense={handleAddCoopExpense}
                                    onAddCoopIncome={handleAddCoopIncome}
                                    onInitiatePayouts={handleInitiatePayouts}
                                    onApprovePayouts={handleApprovePayouts}
                                    onDisbursePayouts={handleDisbursePayouts}
                                    onAddPayouts={handleAddPayouts}
                                    retailStores={retailStores}
                                    inventory={retailInventory}
                                    suppliers={suppliers}
                                    retailExpenses={retailExpenses}
                                    onAddRetailExpense={handleAddRetailExpense}
                                    onAddRequisition={handleAddRequisition}
                                    onUpdateRequisition={handleUpdateRequisition}
                                    vehicles={vehicles}
                                    transportOnboarding={transportOnboarding}
                                    vehicleLogs={vehicleLogs}
                                    onAddVehicle={handleAddVehicle}
                                    onUpdateVehicle={handleUpdateVehicle}
                                    onDeleteVehicle={handleDeleteVehicle}
                                    onLogGateAction={handleLogGateAction}
                                    onOnboardStudent={handleOnboardStudent}
                                    onOffboardStudent={handleOffboardStudent}
                                    onConfirmReceipt={handleConfirmReceipt}
                                    onActivateModuleTrial={handleActivateModuleTrial}
                                    carListings={carListings}
                                    carTestDrives={carTestDrives}
                                    carAppraisals={carAppraisals}
                                    onAddCarListing={async (data: Partial<CarListing>) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCarListing({ ...data, id: `v_${Date.now()}`, institutionId: instId || '' });
                                        await loadData();
                                    }}
                                    onUpdateCarTestDriveStatus={async (id: string, status: any) => {
                                        const existing = carTestDrives.find(t => t.id === id);
                                        if (existing) {
                                            await apiService.saveCarTestDrive({ ...existing, status });
                                            await loadData();
                                        }
                                    }}
                                    onAddCarAppraisal={async (data: Partial<CarAppraisal>) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCarAppraisal({ ...data, id: `appr_${Date.now()}`, institutionId: instId || '' });
                                        await loadData();
                                    }}
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
                                    taAssignments={[]} // Placeholder
                                    userTasks={userTasks}
                                    onAddTask={() => { }}
                                    onUpdateTask={() => { }}
                                    onDeleteTask={() => { }}
                                    currentInstitution={activeInstitution}
                                    assessments={assessments}
                                    assessmentMarks={assessmentMarks}
                                    studentAttendances={studentAttendances}
                                />
                            ) : activeRole === 'reseller' ? (
                                <ResellerDashboard
                                    currentUser={currentUser}
                                    currentInstitution={activeInstitution!}
                                    onImpersonate={onLoginAsAdmin}
                                    companyDetails={companyDetails}
                                    transactions={transactions}
                                    invoices={invoices}
                                />
                            ) : (activeRole === 'church_admin' || activeRole === 'church_member') ? (
                                <ChurchDenominationProvider church={activeInstitution!}>
                                    <ChurchDashboard />
                                </ChurchDenominationProvider>
                            ) : (activeRole === 'county_admin' || activeRole?.startsWith('county_')) ? (
                                <CountyAdminView
                                    currentUser={currentUser}
                                    counties={counties}
                                    institutions={institutions}
                                    users={users}
                                    onLogout={handleLogout}
                                    onUpdateInstitution={onUpdateInstitution}
                                    onUpdateCounty={handleUpdateCounty}
                                    onAddInstitution={handleAddCountyInstitution}
                                    onLoginAsAdmin={onLoginAsAdmin}
                                    onImportInstitutions={handleImportCountyInstitutions}
                                    onAddUser={async (data) => { await apiService.registerUser({ ...data, id: `u_county_${Date.now()}` }, 'County Portal'); loadData(); }}
                                    onUpdateUser={onEditUser}
                                    onDeleteUser={onDeleteUser}
                                    inventoryItems={countyInventory}
                                    inventoryCategories={countyInventoryCategories}
                                    onAddInventoryItem={async (data) => {
                                        const id = data.id || `cinv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                                        await apiService.saveModuleRecord('county_inventory', { ...data, id });
                                        loadData();
                                    }}
                                    onUpdateInventoryItem={async (id, data) => {
                                        await apiService.saveModuleRecord('county_inventory', { ...data, id });
                                        loadData();
                                    }}
                                    onDeleteInventoryItem={async (id) => {
                                        await apiService.deleteModuleRecord('county_inventory', id);
                                        loadData();
                                    }}
                                    onAddInventoryCategory={async (data) => {
                                        const id = data.id || `cat_${Date.now()}`;
                                        await apiService.saveModuleRecord('county_inventory_categories', { ...data, id });
                                        loadData();
                                    }}
                                    onUpdateInventoryCategory={async (id, data) => {
                                        await apiService.saveModuleRecord('county_inventory_categories', { ...data, id });
                                        loadData();
                                    }}
                                    onDeleteInventoryCategory={async (id) => {
                                        await apiService.deleteModuleRecord('county_inventory_categories', id);
                                        loadData();
                                    }}
                                    stores={countyStores}
                                    onAddStore={async (data) => {
                                        const id = data.id || `store_${Date.now()}`;
                                        await apiService.saveModuleRecord('county_stores', { ...data, id });
                                        loadData();
                                    }}
                                    onUpdateStore={async (id, data) => {
                                        await apiService.saveModuleRecord('county_stores', { ...data, id });
                                        loadData();
                                    }}
                                    onDeleteStore={async (id) => {
                                        await apiService.deleteModuleRecord('county_stores', id);
                                        loadData();
                                    }}
                                    onAddStockTransaction={async (data) => {
                                        const countyId = currentUser.role.startsWith('county_') ? currentUser.countyId : undefined;
                                        await apiService.saveModuleRecord('stock_transactions', { ...data, id: `stxn_${Date.now()}`, countyId, recordedBy: currentUser.id });
                                        loadData();
                                    }}
                                    stockTransactions={stockTransactions}
                                    bursaryApplications={bursaryApplications}
                                    bursaryFunds={bursaryFunds}
                                    onUpdateBursaryApplication={async (id, data) => { await apiService.saveModuleRecord('bursary_applications', { ...data, id }); await loadData(); }}
                                    onAddBursaryFund={async (data) => { await apiService.saveModuleRecord('county_bursary_funds', data); await loadData(); }}
                                    onUpdateBursaryFund={async (id, data) => { await apiService.saveModuleRecord('county_bursary_funds', { ...data, id }); await loadData(); }}
                                    onDeleteBursaryFund={async (id) => { await apiService.deleteModuleRecord('county_bursary_funds', id); await loadData(); }}
                                    activityLog={activityLog}
                                    onLogAction={handleLogAction}
                                />
                            ) : activeRole === 'academics_officer' ? (
                                <AcademicsOfficerView
                                    currentUser={currentUser}
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
                                    departments={departments}
                                    onAddDepartment={handleAddDepartment}
                                    onUpdateDepartment={handleUpdateDepartment}
                                    onDeleteDepartment={handleDeleteDepartment}
                                    onImportDepartments={handleImportDepartments}
                                    activeAcademicYear={activeAcademicYear}
                                    activeSemester={activeSemester}
                                    onExamTimetableGenerated={async (entries, ay, sem) => apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries)}
                                    examTimetable={examTimetable}
                                    getSubjectById={getSubjectById}
                                    getLecturerById={getLecturerById}
                                    getRoomById={getRoomById}
                                    courseSizes={courseSizes}
                                    academicYears={academicYears}
                                    onAddAcademicYear={async (data) => { await apiService.saveModuleRecord('academic_years', { ...data, id: `ay_${Date.now()}`, institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); }}
                                    onUpdateAcademicYear={async (id, data) => { const existing = academicYears.find(y => y.id === id); await apiService.saveModuleRecord('academic_years', { ...existing, ...data, id }); loadData(); }}
                                    onDeleteAcademicYear={async (id) => { await apiService.deleteModuleRecord('academic_years', id); loadData(); }}
                                    semesters={semesters}
                                    onAddSemester={async (data) => { await apiService.saveModuleRecord('semesters', { ...data, id: `sem_${Date.now()}`, institutionId: currentUser!.institutionId }); loadData(); }}
                                    onUpdateSemester={async (id, data) => { const existing = semesters.find(s => s.id === id); await apiService.saveModuleRecord('semesters', { ...existing, ...data, id }); loadData(); }}
                                    onDeleteSemester={async (id) => { await apiService.deleteModuleRecord('semesters', id); loadData(); }}
                                    timetableSettings={timetableSettings}
                                    onSaveTimetableSettings={(config) => onUpdateInstitution(activeInstitution!.id, { timetableSettings: config })}
                                    lessonRatings={lessonRatings}
                                    buildings={buildings}
                                    onAddBuilding={handleAddBuilding}
                                    onAddBuildings={async (b) => { }}
                                    onUpdateBuilding={handleUpdateBuilding}
                                    onDeleteBuilding={handleDeleteBuilding}
                                    academicLevels={academicLevels}
                                    letterheadConfig={activeLetterheadConfig}
                                    logoUrl={activeBranding.logoUrl}
                                    footerImageUrl={activeFooterImageUrl}
                                    emailConfig={companyDetails.emailConfig}
                                    onSaveEmailConfig={() => { }}
                                    onSendTestEmail={async (r) => ({ success: true, message: 'Test email sent.' })}
                                    currentInstitution={activeInstitution}
                                    onUpdateInstitution={onUpdateInstitution}
                                    smsConfig={companyDetails.smsConfig}
                                    themeColor={activeBranding.primaryColor}
                                    examTimetableSettings={activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                                    onSaveExamTimetableSettings={(config) => onUpdateInstitution(activeInstitution!.id, { examTimetableSettings: config })}
                                    onTimetableGenerated={async (entries, ay, sem) => apiService.saveTimetable(currentUser!.institutionId, ay, sem, entries as TimetableEntry[])}
                                    allocations={allocations}
                                    timeOffRequests={timeOffRequests}
                                    onAssociateSubjectToCourseLevel={handleAssociateSubjectToCourseLevel}
                                    onDisassociateSubjectFromCourseLevel={handleDisassociateSubjectFromCourseLevel}
                                    onImportStudents={onImportStudents}
                                    onWithdrawRequest={async (id) => { await apiService.deleteModuleRecord('allocation_requests', id); await handleLogAction("Withdrew allocation request"); loadData(); }}
                                    onAddExtensionRequest={handleAddExtensionRequest}
                                    onLogAction={handleLogAction}
                                />
                            ) : activeRole === 'security' ? (
                                <SecurityView
                                    user={currentUser}
                                    users={users}
                                    visitors={visitors}
                                    securityAlerts={securityAlerts}
                                    appointments={appointments}
                                    // Actually appointments are used. Adding fetching for them.
                                    onAddVisitor={async (v) => {
                                        await apiService.saveModuleRecord('visitors', { ...v, id: `vis_${Date.now()}` });
                                        await handleLogAction(`Registered visitor: ${v.name}`);
                                        loadData();
                                    }}
                                    onCheckoutVisitor={async (id) => {
                                        const v = visitors.find(x => x.id === id);
                                        if (v) {
                                            await apiService.saveModuleRecord('visitors', { ...v, timeOut: new Date().toLocaleTimeString() });
                                            await handleLogAction(`Checked out visitor: ${v.name}`);
                                        }
                                        loadData();
                                    }}
                                    onAddAlert={async (a) => {
                                        await apiService.saveModuleRecord('security_alerts', { ...a, id: `alert_${Date.now()}`, institutionId: currentUser.institutionId, createdBy: currentUser.id, createdAt: new Date().toISOString(), status: 'active' });
                                        await handleLogAction(`Logged security alert: ${a.type} - ${a.severity}`);
                                        loadData();
                                    }}
                                    onResolveAlert={async (id) => {
                                        const a = securityAlerts.find(x => x.id === id);
                                        if (a) {
                                            await apiService.saveModuleRecord('security_alerts', { ...a, status: 'resolved' });
                                            await handleLogAction(`Resolved security alert: ${a.type}`);
                                        }
                                        loadData();
                                    }}
                                    onUpdateAppointmentStatus={async (id, status) => {
                                        const apt = appointments.find(a => a.id === id);
                                        if (apt) {
                                            await apiService.saveModuleRecord('appointments', { ...apt, status });
                                            await handleLogAction(`Updated appointment status for ${apt.guestName} to ${status}`);
                                        }
                                        loadData();
                                    }}
                                    currentInstitution={activeInstitution}
                                    courses={courses}
                                    academicYears={academicYears}
                                    semesters={semesters}
                                    departments={departments}
                                    companyDetails={companyDetails}
                                    onLogAction={handleLogAction}
                                    vehicles={vehicles}
                                    vehicleLogs={vehicleLogs}
                                    onLogGateAction={handleLogGateAction}
                                    onSwitchPerspective={setImpersonatedRole}
                                />

                            ) : activeRole === 'info_desk' ? (
                                <InfoDeskView
                                    user={currentUser}
                                    users={users}
                                    visitors={visitors}
                                    generatedTimetable={generatedTimetable}
                                    timetableSettings={timetableSettings}
                                    getSubjectById={getSubjectById}
                                    getRoomById={getRoomById}
                                    getLecturerById={getLecturerById}
                                    teacherCheckIns={teacherCheckIns}
                                    timeOffRequests={timeOffRequests}
                                    studentAbsenceRequests={studentAbsenceRequests}
                                    leaveOutRequests={leaveOutRequests}
                                    bulletinItems={bulletinItems}
                                    documentCollections={documentCollections}
                                    watchlist={watchlist}
                                    maintenanceRequests={maintenanceRequests}
                                    studentAttendances={studentAttendances}
                                    invoices={invoices}
                                    rooms={rooms}
                                    onAddBulletinItem={async (item) => {
                                        await apiService.saveModuleRecord('bulletin_items', { ...item, id: `bulletin_${Date.now()}`, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() });
                                        loadData();
                                    }}
                                    onUpdateDocumentStatus={async (id, status) => {
                                        const doc = documentCollections.find(d => d.id === id);
                                        if (doc) {
                                            await apiService.saveModuleRecord('document_collections', { ...doc, status, collectedDate: status === 'Collected' ? new Date().toISOString() : doc.collectedDate });
                                            loadData();
                                        }
                                    }}
                                    onAddMaintenanceRequest={async (req) => {
                                        await apiService.saveModuleRecord('maintenance_requests', { ...req, id: `maint_${Date.now()}`, institutionId: currentUser.institutionId, reportedAt: new Date().toISOString(), status: 'Pending' });
                                        loadData();
                                    }}
                                    onSwitchPerspective={setImpersonatedRole}
                                />
                            ) : (activeRole === 'driver' || activeRole === 'transport_assistant') ? (
                                <TransportAssistantView
                                    user={currentUser}
                                    users={users}
                                    vehicles={vehicles}
                                    transportOnboarding={transportOnboarding}
                                    vehicleLogs={vehicleLogs}
                                    onLogGateAction={handleLogGateAction}
                                    onOnboardStudent={handleOnboardStudent}
                                    onOffboardStudent={handleOffboardStudent}
                                    currentInstitution={activeInstitution}
                                />
                            ) : activeRole === 'store' ? (
                                <ModuleAccessGuard
                                    moduleId="inventory"
                                    moduleName="Institutional Store"
                                    description="Manage inventory, suppliers, and stock issuance with digital signature verification."
                                    institution={activeInstitution}
                                    onActivateTrial={handleActivateModuleTrial}
                                    isActivating={isSavingModule}
                                >
                                    <StoreView
                                        user={currentUser}
                                        inventory={inventory}
                                        suppliers={suppliers}
                                        stockTransactions={stockTransactions}
                                        onAddItem={async (item) => { 
                                            await apiService.saveModuleRecord('inventory', { 
                                                ...item, 
                                                id: `inv_${Date.now()}`, 
                                                institutionId: currentUser.institutionId, 
                                                lastUpdated: new Date().toISOString() 
                                            }); 
                                            loadData(); 
                                        }}
                                        onAddSupplier={async (supplier) => {
                                            await apiService.saveModuleRecord('suppliers', {
                                                ...supplier,
                                                id: `sup_${Date.now()}`,
                                                institutionId: currentUser.institutionId
                                            });
                                            loadData();
                                        }}
                                        onAddStoreTransaction={async (transaction) => {
                                            const item = inventory.find(i => i.id === transaction.itemId);
                                            if (item) {
                                                const newQty = transaction.type === 'Restock' ? item.quantity + transaction.quantity : item.quantity - transaction.quantity;
                                                await apiService.saveModuleRecord('inventory', { ...item, quantity: newQty, lastUpdated: new Date().toISOString() });
                                            }
                                            await apiService.saveModuleRecord('stock_transactions', { 
                                                ...transaction, 
                                                id: `stx_${Date.now()}`, 
                                                date: new Date().toISOString(), 
                                                institutionId: currentUser.institutionId, 
                                                recordedBy: currentUser.id 
                                            });
                                            loadData();
                                        }}
                                        countyInventory={countyInventory.filter(i => i.targetInstitutionId === currentUser.institutionId)}
                                        onMarkInventoryReceived={onMarkInventoryReceived}
                                        onSwitchPerspective={setImpersonatedRole}
                                        users={users}
                                        departments={departments}
                                        onAddUser={async (data) => { await apiService.registerUser({ ...data, id: generateUserId(), institutionId: currentUser!.institutionId }, activeInstitution?.name); loadData(); }}
                                        onEditUser={onEditUser}
                                        onDeleteUser={onDeleteUser}
                                        onAddDepartment={handleAddDepartment}
                                        onUpdateDepartment={handleUpdateDepartment}
                                        onDeleteDepartment={handleDeleteDepartment}
                                        onImportStudents={onImportStudents}
                                        smsConfig={(activeInstitution?.smsConfig || companyDetails.smsConfig) as any}
                                        subjects={subjects}
                                        courses={courses}
                                        letterheadConfig={activeLetterheadConfig}
                                        logoUrl={activeBranding.logoUrl}
                                        footerImageUrl={activeFooterImageUrl}
                                        onSendSms={async (r, m, config, units, instId) => { const res = await apiService.sendSms(r, m, config, units, instId || activeInstitution?.id); await handleLogAction(`Sent SMS to ${Array.isArray(r) ? r.length + ' recipients' : r}`); return res; }}
                                        companyDetails={companyDetails}
                                        onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                        onLogAction={handleLogAction}
                                        onRefreshData={async () => await loadData(false, true)}
                                    />
                                </ModuleAccessGuard>
                            ) : activeRole === 'librarian' ? (
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
                            ) : activeRole === 'parent' ? (

                                <ParentView
                                    user={currentUser}
                                    users={users}
                                    courses={courses}
                                    studentAttendances={studentAttendances}
                                    generatedTimetable={generatedTimetable}
                                    subjects={subjects}
                                    getSubjectById={getSubjectById}
                                    getLecturerById={getLecturerById}
                                    getRoomById={getRoomById}
                                    timetableSettings={timetableSettings!}
                                    buildings={buildings}
                                    studentCheckIns={studentCheckIns}
                                    leaveOutRequests={leaveOutRequests}
                                    onUpdateLeaveOut={async (id, data) => {
                                        const req = leaveOutRequests.find(r => r.id === id);
                                        if (req) {
                                            await apiService.saveModuleRecord('leave_out_requests', { ...req, ...data, updatedAt: new Date().toISOString() });
                                            loadData();
                                        }
                                    }}
                                />
                            ) : activeRole === 'boarding_master' ? (

                                <BoardingMasterView
                                    currentUser={currentUser}
                                    currentInstitution={activeInstitution!}
                                    companyDetails={companyDetails}
                                    users={users}
                                    academicYears={academicYears}
                                    semesters={semesters}
                                    courses={courses}
                                    departments={departments}
                                    onLogAction={handleLogAction}
                                    onAddUser={async (data) => { await apiService.registerUser({ ...data, id: generateUserId(), institutionId: currentUser!.institutionId }, activeInstitution?.name); loadData(); }}
                                    onEditUser={onEditUser}
                                    onDeleteUser={onDeleteUser}
                                    onImportStudents={onImportStudents}
                                    smsConfig={companyDetails.smsConfig}
                                    subjects={subjects}
                                    letterheadConfig={activeLetterheadConfig}
                                    logoUrl={activeBranding.logoUrl}
                                    footerImageUrl={activeFooterImageUrl}
                                    onSendSms={async (r, m, config, units, instId) => { const res = await apiService.sendSms(r, m, config, units, instId); await handleLogAction(`Sent SMS to ${Array.isArray(r) ? r.length + ' recipients' : r}`); return res; }}
                                    onAddParent={async (sid, p) => apiService.saveModuleRecord('users', { ...p, role: 'parent', id: `u_par_${Date.now()}`, institutionId: currentUser.institutionId, studentIds: [sid] }).then(() => { handleLogAction(`Added parent for student ${sid}`); return { success: true, message: 'Parent added.' }; })}
                                    onDeleteParent={() => { }}
                                />

                            ) : (activeRole === 'carwash_admin' || (isAdminCatchAll && (activeInstitution?.businessSubType?.toLowerCase().includes('car wash') || activeInstitution?.businessSubType?.toLowerCase().includes('carwash')))) ? (
                                <CarWashView
                                    currentUser={currentUser}
                                    currentInstitution={activeInstitution!}
                                    companyDetails={companyDetails}
                                    users={users.filter(u => u.institutionId === currentUser.institutionId)}
                                    onDataChange={loadData}
                                    onSendSms={async (r, m, config, units, instId) => {
                                        const res = await apiService.sendSms(r, m, config || activeInstitution?.smsConfig || companyDetails.smsConfig, units, instId || activeInstitution?.id);
                                        await handleLogAction(`Sent SMS to ${Array.isArray(r) ? r.length + ' recipients' : r}`);
                                        return res;
                                    }}
                                    onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                    smsConfig={activeInstitution?.smsConfig || companyDetails.smsConfig}
                                    smsBalance={activeInstitution?.smsBalance || 0}
                                    mpesaConfig={activeInstitution?.mpesaConfig || companyDetails.mpesaConfig}
                                    departments={departments}
                                    courses={courses}
                                    onRegisterUser={async (userData) => {
                                        await apiService.registerUser(userData, activeInstitution?.name);
                                        loadData();
                                    }}
                                    cafeOrders={cafeOrders}
                                />
                            ) : (activeRole === 'mechanic_admin' || (isAdminCatchAll && (activeInstitution?.businessSubType?.toLowerCase().includes('car service') || activeInstitution?.businessSubType?.toLowerCase().includes('mechanic') || activeInstitution?.businessSubType?.toLowerCase().includes('auto repair')))) ? (
                                <CarServiceView
                                    currentUser={currentUser}
                                    currentInstitution={activeInstitution!}
                                    users={users.filter(u => u.institutionId === currentUser.institutionId)}
                                    onLogAction={handleLogAction}
                                />
                            ) : activeRole === 'farmer' ? (
                                <FarmerPortal
                                    currentUser={currentUser}
                                    farmer={coopFarmers.find(f => f.id === currentUser.farmerId || f.phone === currentUser.phoneNumber)}
                                    collections={coopCollections.filter(c => c.farmerId === currentUser.id || c.farmerId === (users.find(u => u.id === currentUser.id) as any)?.farmerId)}
                                    saccoAccounts={saccoAccounts.filter(a => a.farmerId === currentUser.id || a.farmerId === (users.find(u => u.id === currentUser.id) as any)?.farmerId)}
                                    saccoTransactions={saccoTransactions.filter(t => t.accountId && saccoAccounts.filter(a => a.farmerId === currentUser.id || a.farmerId === (users.find(u => u.id === currentUser.id) as any)?.farmerId).map(a => a.id).includes(t.accountId))}
                                    payouts={coopPayouts.filter(p => p.farmerId === currentUser.id || p.farmerId === (users.find(u => u.id === currentUser.id) as any)?.farmerId)}
                                    agrovetSales={coopAgrovetSales.filter(s => s.farmerId === currentUser.id || s.farmerId === (users.find(u => u.id === currentUser.id) as any)?.farmerId)}
                                    agrovetInventory={coopAgrovetInventory}
                                    notifications={notifications.filter(n => n.userId === currentUser.id || n.institutionId === currentUser.institutionId)}
                                    onUpdateFarmer={handleUpdateFarmer}
                                    onAddSaccoAccount={handleAddSaccoAccount}
                                    onLogout={handleLogout}
                                />
                            ) : activeRole === 'rider' ? (
                                <RiderPortal
                                    currentUser={currentUser}
                                    rider={coopRiders.find(r => r.id === currentUser.riderId || r.phone === currentUser.phoneNumber)}
                                    collections={coopCollections.filter(c => c.riderId === currentUser.riderId || c.riderId === coopRiders.find(r => r.id === currentUser.riderId || r.phone === currentUser.phoneNumber)?.id)}
                                    saccoAccounts={saccoAccounts.filter(a => a.farmerId === currentUser.riderId || a.farmerId === coopRiders.find(r => r.id === currentUser.riderId || r.phone === currentUser.phoneNumber)?.id)}
                                    saccoTransactions={saccoTransactions.filter(t => t.accountId && saccoAccounts.filter(a => a.farmerId === currentUser.riderId || a.farmerId === coopRiders.find(r => r.id === currentUser.riderId || r.phone === currentUser.phoneNumber)?.id).map(a => a.id).includes(t.accountId))}
                                    payouts={coopPayouts}
                                    onLogout={handleLogout}
                                />
                            ) : (activeRole === 'customer' || activeRole === 'carwash_customer') ? (
                                (activeRole === 'carwash_customer' || (activeInstitution?.businessSubType?.toLowerCase().includes('car wash') || activeInstitution?.businessSubType?.toLowerCase().includes('carwash'))) ? (
                                    <CarWashCustomerPortal
                                        currentUser={currentUser}
                                        onAddTransaction={async (data, items) => { await apiService.onAddTransaction(data, items as any); }}
                                        cafeOrders={cafeOrders}
                                        retailSales={retailSales}
                                    />
                                ) : (
                                    <RetailCustomerPortal currentUser={currentUser} currentInstitution={activeInstitution!} />
                                )
                            ) : (activeRole === 'agrovet_admin' || (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('agrovet'))) ? (
                                <AgrovetView
                                    currentUser={currentUser}
                                    currentInstitution={activeInstitution!}
                                    users={users.filter(u => u.institutionId === currentUser.institutionId)}
                                    onDataChange={loadData}
                                />
                            ) : activeRole === 'tenant' ? (
                                <TenantPortalView
                                    currentUser={currentUser}
                                    currentInstitution={activeInstitution!}
                                    onLogout={handleLogout}
                                />
                            ) : activeRole === 'landlord' ? (
                                <LandlordPortalView
                                    currentUser={currentUser}
                                    currentInstitution={activeInstitution!}
                                    onLogout={handleLogout}
                                />
                            ) : (activeRole === 'property_admin' || activeInstitution?.institutionType === 'Property Management' || (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('property management'))) ? (
                                <PropertyManagementView
                                    currentUser={currentUser}
                                    currentInstitution={activeInstitution!}
                                    companyDetails={companyDetails}
                                    users={users.filter(u => u.institutionId === currentUser.institutionId)}
                                    onDataChange={loadData}
                                    onAddUser={async (userData) => {
                                        try {
                                            const targetInstitutionId = currentUser?.institutionId;
                                            if (!targetInstitutionId) throw new Error("Institution context missing.");
                                            await apiService.registerUser({
                                                ...userData,
                                                id: generateUserId(),
                                                institutionId: targetInstitutionId
                                            }, activeInstitution?.name);
                                            loadData();
                                        } catch (err: any) {
                                            console.error("User registration failed:", err);
                                            throw err;
                                        }
                                    }}
                                    onEditUser={onEditUser}
                                    onDeleteUser={onDeleteUser}
                                    onImportUsers={onImportUsers}
                                    onLogAction={handleLogAction}
                                    smsConfig={activeInstitution?.smsConfig || companyDetails.smsConfig}
                                    departments={departments}
                                    subjects={subjects}
                                    courses={courses}
                                    letterheadConfig={activeLetterheadConfig}
                                    logoUrl={activeBranding.logoUrl}
                                    footerImageUrl={activeFooterImageUrl}
                                    transactions={transactions}
                                    onSendBulkCredentials={async (users, method) => {
                                        const res = await apiService.sendBulkCredentials(users, method);
                                        await handleLogAction(`Sent bulk credentials to ${res.success_count} users via ${method}`);
                                        return res;
                                    }}
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
                            ) : isAdminCatchAll ? (
                                <AdminView
                                    currentUser={currentUser}
                                    activeRole={activeRole || undefined}
                                    users={users}
                                    requests={requests}
                                    allocations={allocations}
                                    departments={departments}
                                    subjects={subjects}
                                    courses={courses}
                                    rooms={rooms}
                                    buildings={buildings}
                                    academicLevels={academicLevels}
                                    academicYears={academicYears}
                                    semesters={semesters}
                                    onActivateModuleTrial={handleActivateModuleTrial}
                                    activeAcademicYear={activeAcademicYear}
                                    activeSemester={activeSemester}
                                    timetableSettings={timetableSettings}
                                    examTimetableSettings={activeInstitution?.examTimetableSettings || INITIAL_EXAM_TIMETABLE_SETTINGS}
                                    logoUrl={activeBranding.logoUrl}
                                    footerImageUrl={activeFooterImageUrl}
                                    themeColor={activeBranding.primaryColor}
                                    companyDetails={companyDetails}
                                    onUpdateCompanyDetails={async (d) => { await apiService.saveCompanySettings(d as any); loadData(); }}
                                    activityLog={activityLog}
                                    transactions={transactions}
                                    onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                    onRefreshData={async () => await loadData(false, true)}
                                    receipts={receipts}
                                    invoices={invoices}
                                    extensionRequests={extensionRequests}
                                    voteHeads={voteHeads}
                                    feeStructures={feeStructures}
                                    financialPeriods={financialPeriods}
                                    userTasks={userTasks}
                                    generatedTimetable={generatedTimetable}
                                    allTimetableEntries={generatedTimetable}
                                    finalTimetableUrl={null}
                                    letterheadConfig={activeLetterheadConfig}
                                    smsConfig={(activeInstitution?.smsConfig || companyDetails.smsConfig) as any}
                                    emailConfig={activeInstitution?.emailConfig || companyDetails.emailConfig}
                                    timetableConflicts={timetableConflicts}
                                    retailExpenses={retailExpenses}
                                    onAddRetailExpense={handleAddRetailExpense}
                                    onAddRequisition={handleAddRequisition}
                                    onUpdateRequisition={handleUpdateRequisition}
                                    retailStores={retailStores}
                                    inventory={retailInventory}
                                    suppliers={suppliers}
                                    currentInstitution={activeInstitution}
                                    counties={counties}
                                    onAddUser={async (userData) => {
                                        try {
                                            const targetInstitutionId = currentUser?.institutionId;
                                            if (!targetInstitutionId) throw new Error("Institution context missing.");

                                            await apiService.registerUser({
                                                ...userData,
                                                id: generateUserId(),
                                                institutionId: targetInstitutionId
                                            }, activeInstitution?.name);

                                            loadData();
                                        } catch (err: any) {
                                            console.error("User registration failed:", err);
                                            throw err;
                                        }
                                    }}
                                    onEditUser={onEditUser}
                                    onDeleteUser={onDeleteUser}
                                    onImportUsers={onImportUsers}
                                    onImportStudents={onImportStudents}
                                    onAddDepartment={handleAddDepartment}
                                    onUpdateDepartment={handleUpdateDepartment}
                                    onDeleteDepartment={handleDeleteDepartment}
                                    onImportDepartments={handleImportDepartments}
                                    onAddSubject={handleAddSubject}
                                    onUpdateSubject={handleUpdateSubject}
                                    onDeleteSubject={handleDeleteSubject}
                                    onAddBuilding={handleAddBuilding}
                                    onUpdateBuilding={handleUpdateBuilding}
                                    onDeleteBuilding={handleDeleteBuilding}
                                    onAddRoom={handleAddRoom}
                                    onUpdateRoom={handleUpdateRoom}
                                    onDeleteRoom={handleDeleteRoom}
                                    onImportRooms={handleImportRooms}
                                    onAddCourse={handleAddCourse}
                                    onImportCourses={handleImportCourses}
                                    onUpdateCourse={handleUpdateCourse}
                                    onDeleteCourse={handleDeleteCourse}
                                    onAddAcademicLevel={handleAddAcademicLevel}
                                    onUpdateAcademicLevel={handleUpdateAcademicLevel}
                                    onDeleteAcademicLevel={handleDeleteAcademicLevel}
                                    onAddAcademicYear={async (data) => { await apiService.saveModuleRecord('academic_years', { ...data, id: `ay_${Date.now()}`, institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); }}
                                    onUpdateAcademicYear={async (id, data) => { const existing = academicYears.find(y => y.id === id); await apiService.saveModuleRecord('academic_years', { ...existing, ...data, id }); loadData(); }}
                                    onDeleteAcademicYear={async (id) => { await apiService.deleteModuleRecord('academic_years', id); loadData(); }}
                                    onAddSemester={async (data) => { await apiService.saveModuleRecord('semesters', { ...data, id: `sem_${Date.now()}`, institutionId: currentUser!.institutionId }); loadData(); }}
                                    onUpdateSemester={async (id, data) => { const existing = semesters.find(s => s.id === id); await apiService.saveModuleRecord('semesters', { ...existing, ...data, id }); loadData(); }}
                                    onDeleteSemester={async (id) => { await apiService.deleteModuleRecord('semesters', id); loadData(); }}
                                    onUpdateRequestStatus={async (id, status) => { await apiService.updateAllocationStatus(id, status); loadData(); }}
                                    onBulkUpdateRequestStatus={async (status, deptId) => { const targets = requests.filter(r => r.status === 'pending' || r.status === 'hod_approved'); for (const t of targets) await apiService.updateAllocationStatus(t.id, status); loadData(); }}
                                    onDirectAssign={handleDirectAssign}
                                    onTimetableGenerated={async (entries, ay, sem) => { await apiService.saveTimetable(currentUser!.institutionId, ay, sem, entries as TimetableEntry[]); await handleLogAction(`Generated timetable for ${ay} / ${sem}`); await loadData(false, true); }}
                                    onExamTimetableGenerated={async (entries, ay, sem) => { await apiService.saveExamTimetable(currentUser!.institutionId, ay, sem, entries); await handleLogAction(`Generated exam timetable for ${ay} / ${sem}`); await loadData(false, true); }}
                                    onSaveTimetableSettings={(config) => { onUpdateInstitution(activeInstitution!.id, { timetableSettings: config }); handleLogAction(`Saved timetable settings`); }}
                                    onSaveExamTimetableSettings={(config) => { onUpdateInstitution(activeInstitution!.id, { examTimetableSettings: config }); handleLogAction(`Saved exam timetable settings`); }}
                                    onUpdateLogo={(logo) => { onUpdateInstitution(activeInstitution!.id, { logoUrl: logo }); handleLogAction(`Updated institution logo`); }}
                                    onUpdateFooterImage={(footer) => { onUpdateInstitution(activeInstitution!.id, { footerImageUrl: footer }); handleLogAction(`Updated institution footer image`); }}
                                    onUpdateThemeColor={(color) => { onUpdateInstitution(activeInstitution!.id, { themeColor: color }); handleLogAction(`Updated institution theme color`); }}
                                    onUpdateInstitution={onUpdateInstitution}
                                    onAddTask={async (t) => { await apiService.saveModuleRecord('tasks', { ...t, userId: currentUser.id, id: `t_${Date.now()}`, createdAt: new Date().toISOString() }); await handleLogAction(`Added task: ${t.title}`); loadData(); }}
                                    onUpdateTask={async (id, c) => { const task = userTasks.find(x => x.id === id); if (task) { await apiService.saveModuleRecord('tasks', { ...task, isComplete: c }); await handleLogAction(`${c ? 'Completed' : 'Reopened'} task: ${task.title}`); loadData(); } }}
                                    onDeleteTask={async (id) => { const task = userTasks.find(x => x.id === id); if (task) { await apiService.deleteModuleRecord('tasks', id); await handleLogAction(`Deleted task: ${task.title}`); loadData(); } }}
                                    onLogAction={handleLogAction}
                                    onSendBulkCredentials={async (users, method) => {
                                        const res = await apiService.sendBulkCredentials(users, method);
                                        await handleLogAction(`Sent bulk credentials to ${res.success_count} users via ${method}`);
                                        return res;
                                    }}
                                    onSendSms={async (r, m, config, units, instId) => { const res = await apiService.sendSms(r, m, config, units, instId || activeInstitution?.id); await handleLogAction(`Sent SMS to ${Array.isArray(r) ? r.length + ' recipients' : r}`); return res; }}
                                    onSaveSmsConfig={async (config) => { await onUpdateInstitution(activeInstitution!.id, { smsConfig: config }); await handleLogAction(`Updated SMS configuration`); }}
                                    onUpdateRequest={async (id, data) => { await apiService.saveModuleRecord('allocation_requests', { id, ...data }); await handleLogAction(`Updated allocation request`); loadData(); }}
                                    onWithdrawRequest={async (id) => { await apiService.deleteModuleRecord('allocation_requests', id); await handleLogAction(`Withdrew allocation request`); loadData(); }}
                                    onAddUnavailability={async (u) => { /* Placeholder */ await handleLogAction(`Added unavailability`); }}
                                    onUpdateUnavailability={async (id, u) => { /* Placeholder */ await handleLogAction(`Updated unavailability`); }}
                                    onDeleteUnavailability={() => { }}
                                    onManageUnavailability={() => { }}
                                    onAddParent={async (sid, p) => apiService.saveModuleRecord('users', { ...p, role: 'parent', id: `u_par_${Date.now()}`, institutionId: currentUser.institutionId, studentIds: [sid] }).then(() => { handleLogAction(`Added parent for student ${sid}`); return { success: true, message: 'Parent added.' }; })}
                                    onDeleteParent={() => { }}
                                    getLecturerById={getLecturerById}
                                    getSubjectById={getSubjectById}
                                    getRoomById={getRoomById}
                                    onPublishTimetable={() => { }}
                                    onRemovePublishedTimetable={() => { }}
                                    onSendTestEmail={async (r) => ({ success: true, message: 'Test email sent.' })}
                                    onSaveEmailConfig={() => { }}
                                    onSaveLetterheadConfig={(config) => onUpdateInstitution(activeInstitution!.id, { letterheadConfig: config })}
                                    onImportSubjectsAndAssociate={handleImportSubjectsAndAssociate}
                                    onAssociateSubjectToCourseLevel={handleAssociateSubjectToCourseLevel}
                                    onDisassociateSubjectFromCourseLevel={handleDisassociateSubjectFromCourseLevel}
                                    onAddExtensionRequest={handleAddExtensionRequest}
                                    onUpdateExtensionRequestStatus={handleUpdateExtensionRequestStatus}
                                    onSaveBiometricConfig={() => { }}
                                    onUpdateVoteHeads={() => { }}
                                    onUpdateFeeStructures={() => { }}
                                    onUpdateFinancialPeriods={() => { }}
                                    onAddBuildings={async (b) => { }}
                                    timeOffRequests={timeOffRequests}
                                    onAddTimeOffRequest={handleAddTimeOffRequest}
                                    onUpdateTimeOffRequestStatus={async () => { }}
                                    enrollmentRequests={enrollmentRequests}
                                    absenceRequests={absenceRequests}
                                    studentAbsenceRequests={studentAbsenceRequests}





                                    securityAlerts={securityAlerts}
                                    visitors={visitors}
                                    requisitions={requisitions}
                                    studentAttendances={studentAttendances}
                                    studentCheckIns={studentCheckIns}
                                    lessonRatings={lessonRatings}
                                    feedbackSubmissions={feedbackSubmissions}
                                    onUpdateFeedbackStatus={() => { }}
                                    courseSizes={courseSizes}
                                    assessments={assessments}
                                    assessmentMarks={assessmentMarks}
                                    onAddAssessment={async (d: any) => { await apiService.saveModuleRecord('assessments', { ...d, id: `asm_${Date.now()} `, institutionId: currentUser.institutionId, createdAt: new Date().toISOString() }); loadData(); }}
                                    onDeleteAssessment={async (id: string) => { await apiService.deleteModuleRecord('assessments', id); loadData(); }}
                                    onUpdateAssessmentStatus={() => { }}
                                    onSaveAssessmentMarks={async (id: string, marks: any[]) => {
                                        const promises = marks.map((m: any) => {
                                            const existing = assessmentMarks.find(am => am.assessmentId === id && am.studentId === m.studentId);
                                            const recordId = existing ? existing.id : `am_${id}_${m.studentId}_${Date.now()} `;

                                            const record: AssessmentMark = {
                                                id: recordId,
                                                assessmentId: id,
                                                studentId: m.studentId,
                                                marks: m.marks,
                                                comments: m.comments,
                                                gradedBy: currentUser.id,
                                                timestamp: new Date().toISOString(),
                                                institutionId: currentUser.institutionId
                                            };
                                            return apiService.saveModuleRecord('assessment_marks', record);
                                        });
                                        await Promise.all(promises);
                                        loadData();
                                    }}
                                    contracts={contracts}
                                    onGenerateDemoData={handleGenerateDemoData}
                                    onClearDemoData={handleClearDemoData}
                                    isGeneratingDemoData={isGeneratingDemoData}
                                    demoDataGenerationProgress={demoDataGenerationProgress}
                                    demoDataGenerationMessage={demoDataGenerationMessage}
                                    examTimetable={examTimetable}
                                    onSwitchPerspective={(role) => setImpersonatedRole(role)}
                                    isImpersonating={!!impersonatedRole}
                                    vehicles={vehicles}
                                    transportOnboarding={transportOnboarding}
                                    vehicleLogs={vehicleLogs}
                                    onAddVehicle={handleAddVehicle}
                                    onUpdateVehicle={handleUpdateVehicle}
                                    onDeleteVehicle={handleDeleteVehicle}
                                    onLogGateAction={handleLogGateAction}
                                    onOnboardStudent={handleOnboardStudent}
                                    onOffboardStudent={handleOffboardStudent}
                                    onConfirmReceipt={handleConfirmReceipt}
                                    onAddInstitution={() => { }}
                                    onDeleteInstitution={() => { }}
                                    onToggleInstitutionStatus={() => { }}
                                    onLoginAsAdmin={() => { }}
                                    onGenerateReceipt={() => { }}
                                    coopFarmers={coopFarmers}
                                    coopCollections={coopCollections}
                                    coopRiders={coopRiders}
                                    coopAgrovetSales={coopAgrovetSales}
                                    saccoAccounts={saccoAccounts}
                                    saccoTransactions={saccoTransactions}
                                    coopPayouts={coopPayouts}
                                    coopExpenses={coopExpenses}
                                    coopIncome={coopIncome}
                                    lawClients={lawClients}
                                    lawMatters={lawMatters}
                                    lawDocuments={lawDocuments}
                                    lawTimeEntries={lawTimeEntries}
                                    lawInvoices={lawInvoices}
                                    lawTrustTransactions={lawTrustTransactions}
                                    onAddLawClient={handleAddLawClient}
                                    onAddLawMatter={handleAddLawMatter}
                                    onAddLawTimeEntry={handleAddLawTimeEntry}
                                    onAddLawTrustTransaction={handleAddLawTrustTransaction}
                                    onAddLawInvoice={handleAddLawInvoice}
                                    onUpdateLawMatter={handleUpdateLawMatter}
                                    lawAgreementTemplates={lawAgreementTemplates}
                                    lawAgreements={lawAgreements}
                                    onAddLawAgreementTemplate={handleAddLawAgreementTemplate}
                                    onGenerateLawAgreement={handleGenerateLawAgreement}
                                    onApproveLawAgreement={handleApproveLawAgreement}
                                    dsInstructors={dsInstructors}
                                    dsVehicles={dsVehicles}
                                    dsStudents={dsStudents}
                                    dsLessons={dsLessons}
                                    dsMastery={dsMastery}
                                    dsSettings={dsSettings}
                                    onAddDSInstructor={handleAddDSInstructor}
                                    onAddDSVehicle={handleAddDSVehicle}
                                    onAddDSStudent={handleAddDSStudent}
                                    onAddDSLesson={handleAddDSLesson}
                                    onAddDSMastery={handleAddDSMastery}
                                    onUpdateDSSettings={handleUpdateDSSettings}
                                    onAddFarmer={async (data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const payload = { ...data, id: `f_${Date.now()}`, institutionId: instId };
                                        console.log("[Coop Add] Saving farmer:", payload);
                                        await apiService.saveModuleRecord('coop_farmers', payload); 
                                        console.log("[Coop Add] Save complete, refreshing data...");
                                        await loadData(); 
                                    }}
                                    onImportFarmers={async (farmers) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const timestamp = Date.now();
                                        const payloads = farmers.map((f, i) => ({
                                            ...f,
                                            id: f.id || `f_${timestamp}_${i}`,
                                            institutionId: instId
                                        }));
                                        console.log(`[Coop Import] Saving ${payloads.length} farmers...`);
                                        await apiService.saveModuleRecords('coop_farmers', payloads);
                                        console.log("[Coop Import] Bulk save complete, refreshing data...");
                                        await loadData();
                                    }}
                                    onUpdateFarmer={async (id, data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        console.log("[Coop Update] Saving farmer:", { id, ...data });
                                        await apiService.saveModuleRecord('coop_farmers', { ...data, id, institutionId: instId }); 
                                        await loadData(); 
                                    }}
                                    onBulkConfirmCollections={async (riderId, pendingCollections) => {
                                        const now = new Date().toISOString();
                                        const payloads = pendingCollections.map(c => ({
                                            ...c,
                                            factoryConfirmed: true,
                                            finalQuantity: c.quantity,
                                            confirmedBy: currentUser.id,
                                            confirmedAt: now,
                                            status: 'delivered'
                                        }));
                                        console.log(`[Coop Bulk Confirm] Confirming ${payloads.length} collections...`);
                                        await apiService.saveModuleRecords('coop_collections', payloads);
                                        await loadData();
                                    }}
                                    onLogCollection={async (data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const payload = { 
                                            ...data, 
                                            id: `c_${Date.now()}`, 
                                            institutionId: instId,
                                            recordedBy: currentUser.id,
                                            farmer_id: data.farmerId || data.farmer_id
                                        };
                                        await apiService.saveModuleRecord('coop_collections', payload); 
                                        await loadData(); 
                                    }}
                                    onImportCollections={async (collections) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const timestamp = Date.now();
                                        const payloads = collections.map((c, i) => ({
                                            ...c,
                                            id: `c_${timestamp}_${i}`,
                                            institutionId: instId,
                                            recordedBy: currentUser.id,
                                            status: 'pending'
                                        }));
                                        console.log(`[Coop Import] Saving ${payloads.length} collections...`);
                                        await apiService.saveModuleRecords('coop_collections', payloads);
                                        await loadData();
                                    }}
                                    onAddRider={async (data: CoopRider) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        const riderId = `r_${Date.now()}`;
                                        await apiService.saveModuleRecord('coop_riders', { ...data, id: riderId, institutionId: instId }); 
                                        
                                        // Auto-register a user for the rider to enable portal access
                                        await apiService.registerUser({
                                            name: data.name,
                                            phoneNumber: data.phone,
                                            role: 'rider',
                                            riderId: riderId,
                                            institutionId: instId,
                                            email: `${data.phone}@eduai.co.ke`
                                        }, activeInstitution?.name);
                                        
                                        await loadData(); 
                                    }}
                                    onConfirmCollection={async (id, qty) => { 
                                        await apiService.confirmCoopCollection(id, qty, currentUser.id); 
                                        const col = coopCollections.find(c => c.id === id);
                                        const farmer = coopFarmers.find(f => f.id === col?.farmerId);
                                        if (col && farmer && qty === col.quantity) {
                                            await apiService.sendSms(farmer.phone, `Your ${col.productType} delivery on ${col.collectionDate} has been confirmed at Factory. Final Qty: ${qty} ${col.unit}. Thank you!`, activeInstitution?.smsConfig, 1, activeInstitution?.id);
                                        }
                                        await loadData(); 
                                    }}
                                    onApproveCollection={async (id, status) => { 
                                        await apiService.approveCoopCollection(id, currentUser.id, status); 
                                        if (status === 'approved') {
                                            const col = coopCollections.find(c => c.id === id);
                                            const farmer = coopFarmers.find(f => f.id === col?.farmerId);
                                            if (col && farmer) {
                                                await apiService.sendSms(farmer.phone, `Your ${col.productType} delivery discrepancy for ${col.collectionDate} has been RESOLVED and APPROVED by the board. Final Qty: ${col.finalQuantity} ${col.unit}.`, activeInstitution?.smsConfig, 1, activeInstitution?.id);
                                            }
                                        }
                                        await loadData(); 
                                    }}
                                    onAddCoopIncome={async (data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCoopIncome({ ...data, id: `inc_${Date.now()}`, institutionId: instId, recordedBy: currentUser.id }); 
                                        await loadData(); 
                                    }}
                                    onAddCoopExpense={async (data) => { 
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCoopExpense({ ...data, id: `exp_${Date.now()}`, institutionId: instId, recordedBy: currentUser.id }); 
                                        await loadData(); 
                                    }}
                                    onAddSaccoAccount={handleAddSaccoAccount}
                                    onAddCoopAgrovetInventory={async (data) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCoopAgrovetInventory({ ...data, institutionId: instId });
                                        loadData();
                                    }}
                                    onAddCoopAgrovetSale={async (data) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveCoopAgrovetSale({ ...data, institutionId: instId });
                                        loadData();
                                    }}
                                    onAddCoopAgrovetSales={async (data) => {
                                        const instId = activeInstitution?.id || currentUser.institutionId;
                                        await apiService.saveModuleRecords('coop_agrovet_sales', data.map(s => ({ ...s, institutionId: instId })));
                                        loadData();
                                    }}
                                    onInitiatePayouts={async (payoutIds) => {
                                        await apiService.disburseBulkMpesa(payoutIds, currentUser.id);
                                        loadData();
                                    }}
                                    onApprovePayouts={async (payoutIds, status = 'approved') => {
                                        await apiService.updatePayoutStatus(payoutIds, status, currentUser.id);
                                        loadData();
                                    }}
                                    onAddPayouts={async (payouts: any[]) => {
                                        await apiService.saveModuleRecords('coop_monthly_payouts', payouts);
                                        loadData();
                                    }}
                                    coopAgrovetInventory={coopAgrovetInventory}
                                />
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
                                onEnterCircle={() => setShowAlumnaePortal(true)}
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
                                    window.location.href = '/?view=community';
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
                                    // Discovery check across active alumnae
                                    const school = schoolRegistry.find(s => s.id === schoolId);
                                    const instId = school?.institutionId;
                                    
                                    const filters: any = { admission_number: admNo };
                                    if (instId) filters.institution_id = instId;
                                    
                                    const existing = await apiService.fetchModuleRecords('alumnae_members', undefined, undefined, { filter: filters });
                                    if (existing && existing.length > 0) {
                                        return { exists: true, message: 'Admission number already claimed in the Alumnae Network.' };
                                    }
                                    return { exists: false };
                                }}
                                onBackToPortal={() => {
                                    window.location.href = '/?view=community';
                                }}
                                joiningFee={companyDetails?.alumnaeJoiningFee || 0}
                                onInitiatePayment={async (amount, phone, reference) => {
                                    try {
                                        const res = await apiService.triggerMpesaStkPush({
                                            amount,
                                            phoneNumber: phone,
                                            accountReference: reference,
                                            transactionDesc: 'Alumnae Network Activation'
                                        });
                                        return { success: res.success, message: res.message };
                                    } catch (e: any) {
                                        return { success: false, message: e.message };
                                    }
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
                                            if (uploadRes.success) profilePhotoUrl = uploadRes.url;
                                        }

                                        const registrationPayload = {
                                            ...data,
                                            id: `alumna_${Date.now()}`,
                                            institutionId: school?.institutionId || null,
                                            status: 'verified', // Auto-approve
                                            profilePhoto: profilePhotoUrl,
                                            payment_id: data.paymentId || null,
                                            registration_fee: companyDetails?.alumnaeJoiningFee || 0,
                                            joinedAt: new Date().toISOString()
                                        };
                                        
                                        // Clean up internal file reference before saving
                                        delete (registrationPayload as any).profilePictureFile;

                                        await apiService.saveModuleRecord('alumnae_members', registrationPayload);
                                        
                                        // Generate Invoice and Receipt for the payment
                                        if (data.paymentId && (companyDetails?.alumnaeJoiningFee || 0) > 0) {
                                            const amount = companyDetails.alumnaeJoiningFee;
                                            const invoiceId = `INV_AL_${Date.now()}`;
                                            const receiptId = `REC_AL_${Date.now()}`;

                                            const invoiceData = {
                                                id: invoiceId,
                                                invoiceNumber: `AL-INV-${generateAlphanumericCode(6)}`,
                                                institutionId: school?.institutionId || 'GLOBAL',
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
                                                invoiceId: invoiceId,
                                                amountPaid: amount,
                                                paymentDate: new Date().toISOString(),
                                                paymentMethod: 'MPESA',
                                                transactionId: data.paymentId,
                                                paidBy: registrationPayload.fullName,
                                                paidFor: 'Alumnae Activation Service Fee'
                                            };

                                            await Promise.all([
                                                apiService.saveModuleRecord('invoices', invoiceData),
                                                apiService.saveModuleRecord('receipts', receiptData)
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
                                        setShowAlumnaePortal(true);
                                    } catch (e: any) {
                                        alert("Registration Sync Error: " + e.message);
                                    }
                                }}
                            />
                        ) : showAlumnaePortal ? (
                            <AlumnaePortalView 
                                currentAlumna={activeAlumna}
                                institutions={institutions}
                                onBack={() => {
                                    setShowAlumnaePortal(false);
                                    window.location.href = '/?view=community';
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
                                    alert('Feedback submitted!'); 
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
                            />
                        ) : (
                            <LoginView
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

                                        const otpMessage = `Your EduAi Verification Code is: ${otp}. Do not share this code with anyone.`;
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
                                                    alert(`SMS OTP Delivery Failed: ${smsResult.message || "Unknown error"}. Check your gateway settings. (Email OTP should still be sent)`);
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
                                const otpMessage = `Your New EduAi Verification Code is: ${otp}.`;
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
                                        alert(`SMS OTP Delivery Failed: ${smsResult.message || "Unknown error"}.`);
                                    } else {
                                        alert("OTP sent successfully via both channels.");
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
        </AppErrorBoundary>
    );
};
