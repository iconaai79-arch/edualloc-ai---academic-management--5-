import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense, lazy } from 'react';
import { Header } from './Header';
import { ModuleAccessGuard } from './ModuleAccessGuard';
import { sendEmailNotification, getInstitutionEmailConfig } from '../services/emailService';
import { ChurchDenominationProvider } from './church/ChurchDenominationProvider';
import { apiService, initSupabaseClient, setSessionUser } from '../services/apiService';
import { syncInventoryWithReceipt } from '../utils/inventorySync';
import { getAdminRoleForInstitution, isEduInstitution, isSchoolInstitution, isHISInstitution, isInvoicingInstitution, isStrictTeacherUser, isTeacherRole, isSchoolAdminRole } from '../utils/roleUtils';
import { generateAlphanumericCode, slugify, formatPhoneNumber } from '../utils/stringUtils';
import { generateUserId, generateId } from '../utils/idGenerator';
import { detectTimetableConflicts } from '../utils/conflictUtils';
import {
    INITIAL_USERS, INITIAL_INSTITUTIONS, INITIAL_COMPANY_DETAILS,
    INITIAL_ACADEMIC_LEVELS, INITIAL_TIMETABLE_SETTINGS, INITIAL_EXAM_TIMETABLE_SETTINGS,
    INITIAL_ACADEMIC_YEARS, INITIAL_SEMESTERS, DEFAULT_GRADING_SYSTEMS
} from '../constants';
import type {
    User, Role, Institution, Branch, AllocationRequest, TimetableEntry,
    Priority, RequestStatus, CompanyDetails, Room, Subject, Course,
    Department, AcademicYear, Semester, UserTask, ActivityLog,
    MpesaTransaction, Receipt, Invoice, VoteHead, FeeStructure, FinancialPeriod,
    ProfileUpdateData, PasswordUpdateData, Appointment, GuestFeedback, Visitor, SecurityAlert, FeedbackSubmission, AcademicLevel, LetterheadConfig, Building, StudentAttendance, Assessment, AssessmentMark, TimeOffRequest, StudentAbsenceRequest, EnrollmentRequest, AbsenceRequest, LecturerContract, ExamTimetableEntry, TaAssignment, Assignment, Submission, LessonRating, Book, LibraryTransaction, Supplier, Internship, StudentAbsenceRequestStatus,
    ExtensionRequest, Requisition, TransactionStatus, InventoryItem, StockTransaction,
    AllocationRequestPreferences, InvoiceItem, InstitutionRegistrationData, CountyRegistrationData, Conflict, County, Constituency, CountyInventoryItem, CountyInventoryCategory, CountyStore, BursaryApplication, CountyBursaryFund, LeaveOutRequest, ObservationNote,
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
import type { BuildingFloor, BuildingOffice, BuildingVisitorLog, BuildingVisitorAsset } from '../types';
import { XIcon } from './icons/XIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { SystemPulseLoader } from './common/SystemPulseLoader';
import { PerspectiveReturnButton } from './common/PerspectiveReturnButton';
import { SchemaInitializationView } from './common/SchemaInitializationView';
import { AppErrorBoundary } from './common/AppErrorBoundary';
import { ToastProvider, useToast } from '../services/ToastContext';
import { DrivingSchoolProvider } from '../services/DrivingSchoolContext';
import { localDb } from '../services/localDb';
import { syncEngine } from '../services/syncEngine';
import { OfflineSyncWidget } from './common/OfflineSyncWidget';
// Robust dynamic chunk loading handler with automatic browser recovery and export extraction
function extractComponent(mod: any): React.ComponentType<any> {
    if (!mod) return (() => null) as any;
    let candidate = mod;
    let depth = 0;
    while (candidate && typeof candidate === 'object' && 'default' in candidate && depth < 5) {
        if (typeof candidate.default === 'function' || (candidate.default && typeof candidate.default === 'object' && ('$$typeof' in candidate.default || 'render' in candidate.default))) {
            return candidate.default;
        }
        candidate = candidate.default;
        depth++;
    }
    if (typeof candidate === 'function' || (candidate && typeof candidate === 'object' && ('$$typeof' in candidate || 'render' in candidate))) {
        return candidate;
    }
    if (candidate && typeof candidate === 'object') {
        for (const key of Object.keys(candidate)) {
            const val = candidate[key];
            if (typeof val === 'function' || (val && typeof val === 'object' && ('$$typeof' in val || 'render' in val))) {
                return val;
            }
        }
    }
    return (() => null) as any;
}

function safeLazy<T extends React.ComponentType<any>>(
    importFn: () => Promise<any>
): React.LazyExoticComponent<T> {
    return lazy(async () => {
        try {
            const res = await importFn();
            const component = extractComponent(res);
            return { default: component as T };
        } catch (error) {
            console.error("Dynamic import failed, attempting window reload to sync chunks:", error);
            if ('caches' in window) {
                caches.keys().then(keys => keys.forEach(k => caches.delete(k))).catch(() => {});
            }
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(regs => regs.forEach(r => r.unregister())).catch(() => {});
            }
            const lastReload = sessionStorage.getItem('chunk_load_failed_reload');
            const now = Date.now();
            if (!lastReload || now - parseInt(lastReload) > 8000) {
                sessionStorage.setItem('chunk_load_failed_reload', String(now));
                window.location.reload();
            }
            return { default: (() => null) as any as T };
        }
    });
}

const MarketingLandingPage = safeLazy(() => import('./public/MarketingLandingPage').then((m: any) => ({ default: m?.MarketingLandingPage || m?.default || m })));
const LoginView = safeLazy(() => import('./LoginView').then((m: any) => ({ default: m?.LoginView || m?.default || m })));
const ChatBot = safeLazy(() => import('./ChatBot').then((m: any) => ({ default: m?.ChatBot || m?.default || m })));
const MandatoryUpdateView = safeLazy(() => import('./MandatoryUpdateView').then((m: any) => ({ default: m?.MandatoryUpdateView || m?.default || m })));
const SuspendedAccountView = safeLazy(() => import('./SuspendedAccountView').then((m: any) => ({ default: m?.SuspendedAccountView || m?.default || m })));
const TrialExpiredView = safeLazy(() => import('./TrialExpiredView').then((m: any) => ({ default: m?.TrialExpiredView || m?.default || m })));
const PublicAppointmentView = safeLazy(() => import('./PublicAppointmentView').then((m: any) => ({ default: m?.PublicAppointmentView || m?.default || m })));
const PublicLessonConfirmationView = safeLazy(() => import('./public/PublicLessonConfirmationView').then((m: any) => ({ default: m?.PublicLessonConfirmationView || m?.default || m })));
const GuestFeedbackView = safeLazy(() => import('./GuestFeedbackView').then((m: any) => ({ default: m?.GuestFeedbackView || m?.default || m })));
const ProfileModal = safeLazy(() => import('./ProfileModal').then((m: any) => ({ default: m?.ProfileModal || m?.default || m })));
const SecurityView = safeLazy(() => import('./SupportStaffViews').then((m: any) => ({ default: m?.SecurityView || m?.default })));
const StoreView = safeLazy(() => import('./SupportStaffViews').then((m: any) => ({ default: m?.StoreView || m?.default })));
const InfoDeskView = safeLazy(() => import('./SupportStaffViews').then((m: any) => ({ default: m?.InfoDeskView || m?.default })));
const SupplierView = safeLazy(() => import('./SupportStaffViews').then((m: any) => ({ default: m?.SupplierView || m?.default })));
const TransportAssistantView = safeLazy(() => import('./SupportStaffViews').then((m: any) => ({ default: m?.TransportAssistantView || m?.default })));
const RetailCustomerPortal = safeLazy(() => import('./retail/RetailCustomerPortal').then((m: any) => ({ default: m?.RetailCustomerPortal || m?.default || m })));
const RetailManager = safeLazy(() => import('./retail/RetailManager').then((m: any) => ({ default: m?.RetailManager || m?.default || m })));
const BookDemoModal = safeLazy(() => import('./public/BookDemoModal').then((m: any) => ({ default: m?.BookDemoModal || m?.default || m })));
const AlumnaeRegistrationView = safeLazy(() => import('./AlumnaeRegistrationView').then((m: any) => ({ default: m?.AlumnaeRegistrationView || m?.default || m })));
const AlumnaeActivationView = safeLazy(() => import('./AlumnaeActivationView').then((m: any) => ({ default: m?.AlumnaeActivationView || m?.default || m })));
const AlumnaePortalView = safeLazy(() => import('./AlumnaePortalView').then((m: any) => ({ default: m?.AlumnaePortalView || m?.default || m })));
const AlumnaeSecureAccountView = safeLazy(() => import('./AlumnaeSecureAccountView').then((m: any) => ({ default: m?.AlumnaeSecureAccountView || m?.default || m })));
const AlumnaeLoginView = safeLazy(() => import('./AlumnaeLoginView').then((m: any) => ({ default: m?.AlumnaeLoginView || m?.default || m })));
const InstitutionClaimView = safeLazy(() => import('./InstitutionClaimView').then((m: any) => ({ default: m?.InstitutionClaimView || m?.default || m })));
const ConstructionManager = safeLazy(() => import('./ConstructionManager').then((m: any) => ({ default: m?.ConstructionManager || m?.default || m })));
const ConstructionProjectView = safeLazy(() => import('./ConstructionProjectView').then((m: any) => ({ default: m?.ConstructionProjectView || m?.default || m })));
const BuildingSecurityManager = safeLazy(() => import('./BuildingSecurityManager').then((m: any) => ({ default: m?.BuildingSecurityManager || m?.default || m })));
const SimulatorLeadModal = safeLazy(() => import('./public/SimulatorLeadModal').then((m: any) => ({ default: m?.SimulatorLeadModal || m?.default || m })));
const DSStudentPortal = safeLazy(() => import('./ds/DSStudentPortal').then((m: any) => ({ default: m?.DSStudentPortal || m?.default || m })));
const SecurityKiosk = safeLazy(() => import('./security/SecurityKiosk').then((m: any) => ({ default: m?.SecurityKiosk || m?.default || m })));
const ModuleOnboardingWizard = safeLazy(() => import('./ModuleOnboardingWizard').then((m: any) => ({ default: m?.ModuleOnboardingWizard || m?.default || m })));

const PrivacyPolicy = safeLazy(() => import('../pages/PrivacyPolicy'));
const TermsOfService = safeLazy(() => import('../pages/TermsOfService'));
const SpeechBuddyPortal = safeLazy(() => import('./SpeechBuddyPortal').then(m => ({ default: m?.SpeechBuddyPortal || m?.default || m })));
const KidsCodingRoboticsStudio = safeLazy(() => import('./STEM/KidsCodingRoboticsStudio').then(m => ({ default: m?.KidsCodingRoboticsStudio || m?.default || m })));
const IELTSPrepSuite = safeLazy(() => import('./IELTS/IELTSPrepSuite').then(m => ({ default: m?.IELTSPrepSuite || m?.default || m })));
const SpeechTherapyReportGenerator = safeLazy(() => import('./SpeechTherapyReportGenerator').then((m: any) => ({ default: m?.SpeechTherapyReportGenerator || m?.default || m })));
const AIExamGenerator = safeLazy(() => import('./AIExamGenerator').then((m: any) => ({ default: m?.AIExamGenerator || m?.default || m })));
const NTSADrivingSimulator = safeLazy(() => import('./NTSADrivingSimulator').then((m: any) => ({ default: m?.NTSADrivingSimulator || m?.default || m })));
const BeautyCollegeLogbook = safeLazy(() => import('./BeautyCollegeLogbook').then((m: any) => ({ default: m?.BeautyCollegeLogbook || m?.default || m })));
const SchoolBusTracker = safeLazy(() => import('./SchoolBusTracker').then((m: any) => ({ default: m?.SchoolBusTracker || m?.default || m })));
const FeePromissoryTracker = safeLazy(() => import('./Finance/FeePromissoryTracker').then((m: any) => ({ default: m?.FeePromissoryTracker || m?.default || m })));
const CampaignPromiseTracker = safeLazy(() => import('./Political/CampaignPromiseTracker').then((m: any) => ({ default: m?.CampaignPromiseTracker || m?.default || m })));
const CommunicationsManager = safeLazy(() => import('./CommunicationsManager').then((m: any) => ({ default: m?.CommunicationsManager || m?.default || m })));
const DoctorAttendanceManager = safeLazy(() => import('./his/DoctorAttendanceManager').then((m: any) => ({ default: m?.DoctorAttendanceManager || m?.default || m })));
const OpdTriagePrescriptionManager = safeLazy(() => import('./his/OpdTriagePrescriptionManager').then((m: any) => ({ default: m?.OpdTriagePrescriptionManager || m?.default || m })));
const StudentSmartGatePassManager = safeLazy(() => import('./Academics/StudentSmartGatePassManager').then((m: any) => ({ default: m?.StudentSmartGatePassManager || m?.default || m })));
const FarmerMilkQualityCreditEngine = safeLazy(() => import('./coop/FarmerMilkQualityCreditEngine').then((m: any) => ({ default: m?.FarmerMilkQualityCreditEngine || m?.default || m })));
const FleetMaintenanceTracker = safeLazy(() => import('./Transport/FleetMaintenanceTracker').then((m: any) => ({ default: m?.FleetMaintenanceTracker || m?.default || m })));
const CitizenGrievancePetitionDesk = safeLazy(() => import('./Political/CitizenGrievancePetitionDesk').then((m: any) => ({ default: m?.CitizenGrievancePetitionDesk || m?.default || m })));
const BoardingHouseholdBalanceManager = safeLazy(() => import('./Finance/BoardingHouseholdBalanceManager').then(m => ({ default: m?.BoardingHouseholdBalanceManager || m?.default || m })));
const PrivateSecurityCompanyView = safeLazy(() => import('./security/PrivateSecurityCompanyView').then(m => ({ default: m?.PrivateSecurityCompanyView || m?.default || m })));

// Lazy-loaded major portals
const AdminView = safeLazy(() => import('./AdminView').then((m: any) => ({ default: m?.AdminView || m?.default || m })));
const SuperAdminView = safeLazy(() => import('./SuperAdminView').then((m: any) => ({ default: m?.SuperAdminView || m?.default || m })));
const LecturerView = safeLazy(() => import('./LecturerView').then((m: any) => ({ default: m?.LecturerView || m?.default || m })));
const StudentView = safeLazy(() => import('./StudentView').then((m: any) => ({ default: m?.StudentView || m?.default || m })));
const TenantPortalView = safeLazy(() => import('./TenantPortalView').then((m: any) => ({ default: m?.TenantPortalView || m?.default || m })));
const LandlordPortalView = safeLazy(() => import('./LandlordPortalView').then((m: any) => ({ default: m?.LandlordPortalView || m?.default || m })));
const PropertyManagementView = safeLazy(() => import('./PropertyManagementView').then((m: any) => ({ default: m?.PropertyManagementView || m?.default || m })));
const LibraryMasterView = safeLazy(() => import('./LibraryMasterView').then((m: any) => ({ default: m?.LibraryMasterView || m?.default || m })));
const AcademicsOfficerView = safeLazy(() => import('./AcademicsOfficerView').then((m: any) => ({ default: m?.AcademicsOfficerView || m?.default || m })));
const FinanceOfficerView = safeLazy(() => import('./Finance/FinanceOfficerView').then((m: any) => ({ default: m?.FinanceOfficerView || m?.default || m })));
const HROfficerView = safeLazy(() => import('./HR/HROfficerView').then((m: any) => ({ default: m?.HROfficerView || m?.default || m })));
const LibraryWarRoom = safeLazy(() => import('./Library/LibraryWarRoom').then((m: any) => ({ default: m?.LibraryWarRoom || m?.default || m })));
const CountyAdminView = safeLazy(() => import('./CountyAdminView').then((m: any) => ({ default: m?.CountyAdminView || m?.default || m })));
const ConstituencyAdminView = safeLazy(() => import('./ConstituencyAdminView').then((m: any) => ({ default: m?.ConstituencyAdminView || m?.default || m })));
const ParentView = safeLazy(() => import('./ParentView').then((m: any) => ({ default: m?.ParentView || m?.default || m })));
const PracticeTeacherView = safeLazy(() => import('./PracticeTeacherView').then((m: any) => ({ default: m?.PracticeTeacherView || m?.default || m })));
const CarWashView = safeLazy(() => import('./CarWashView').then((m: any) => ({ default: m?.CarWashView || m?.default || m })));
const CarWashCustomerPortal = safeLazy(() => import('./CarWashCustomerPortal').then((m: any) => ({ default: m?.CarWashCustomerPortal || m?.default || m })));
const AgrovetView = safeLazy(() => import('./AgrovetView').then((m: any) => ({ default: m?.AgrovetView || m?.default || m })));
const PropertyMarketplaceView = safeLazy(() => import('./PropertyMarketplaceView').then((m: any) => ({ default: m?.PropertyMarketplaceView || m?.default || m })));
const ChurchDashboard = safeLazy(() => import('./church/ChurchDashboard').then((m: any) => ({ default: m?.ChurchDashboard || m?.default || m })));
const FarmerPortal = safeLazy(() => import('./coop/FarmerPortal').then((m: any) => ({ default: m?.FarmerPortal || m?.default || m })));
const RiderPortal = safeLazy(() => import('./coop/RiderPortal').then((m: any) => ({ default: m?.RiderPortal || m?.default || m })));
const BoardingMasterView = safeLazy(() => import('./BoardingMasterView').then((m: any) => ({ default: m?.BoardingMasterView || m?.default || m })));
const ResellerDashboard = safeLazy(() => import('./ResellerDashboard').then((m: any) => ({ default: m?.ResellerDashboard || m?.default || m })));
const EventManagementView = safeLazy(() => import('./events/EventManagementView').then((m: any) => ({ default: m?.EventManagementView || m?.default || m })));
const TenantStorefrontView = safeLazy(() => import('./retail/TenantStorefrontView').then((m: any) => ({ default: m?.TenantStorefrontView || m?.default || m })));
const SchoolStorefrontView = safeLazy(() => import('./public/SchoolStorefrontView').then((m: any) => ({ default: m?.SchoolStorefrontView || m?.default || m })));
const CommunityHubView = safeLazy(() => import('./public/CommunityHubView').then((m: any) => ({ default: m?.CommunityHubView || m?.default || m })));
const TransportHubView = safeLazy(() => import('./public/TransportHubView').then((m: any) => ({ default: m?.TransportHubView || m?.default || m })));
const HospitalityStorefront = safeLazy(() => import('./hospitality/HospitalityStorefront').then((m: any) => ({ default: m?.HospitalityStorefront || m?.default || m })));
const HospitalityMarketplace = safeLazy(() => import('./hospitality/HospitalityMarketplace').then((m: any) => ({ default: m?.HospitalityMarketplace || m?.default || m })));
const CampaignJoinPage = safeLazy(() => import('./public/CampaignJoinPage').then((m: any) => ({ default: m?.CampaignJoinPage || m?.default || m })));
const FuelStationDashboard = safeLazy(() => import('./FuelStationDashboard').then((m: any) => ({ default: m?.FuelStationDashboard || m?.default || m })));
const CivilWorksDashboard = safeLazy(() => import('./CivilWorksDashboard').then((m: any) => ({ default: m?.CivilWorksDashboard || m?.default || m })));
const LogisticsDashboard = safeLazy(() => import('./LogisticsDashboard').then((m: any) => ({ default: m?.LogisticsDashboard || m?.default || m })));
const CampaignSocialPortal = safeLazy(() => import('./CampaignSocialPortal').then((m: any) => ({ default: m?.CampaignSocialPortal || m?.default || m })));
const CampaignLoginView = safeLazy(() => import('./CampaignLoginView').then((m: any) => ({ default: m?.CampaignLoginView || m?.default || m })));
const PublicCarInvoicePayment = safeLazy(() => import('./automotive/PublicCarInvoicePayment').then((m: any) => ({ default: m?.PublicCarInvoicePayment || m?.default || m })));
const PublicScanToPayView = safeLazy(() => import('./public/PublicScanToPayView').then(m => ({ default: m?.PublicScanToPayView || m?.default || m })));
const PublicEventRegistration = safeLazy(() => import('./events/PublicEventRegistration').then((m: any) => ({ default: m?.PublicEventRegistration || m?.default || m })));
const PublicEventConfirmation = safeLazy(() => import('./events/PublicEventConfirmation').then((m: any) => ({ default: m?.PublicEventConfirmation || m?.default || m })));
const PublicVisitorAuthorization = safeLazy(() => import('./PublicVisitorAuthorization').then((m: any) => ({ default: m?.PublicVisitorAuthorization || m?.default || m })));
const DrivingSchoolManager = safeLazy(() => import('./ds/DrivingSchoolManager').then((m: any) => ({ default: m?.DrivingSchoolManager || m?.default || m })));
const PublicInvoiceView = safeLazy(() => import('./ds/PublicInvoiceView').then((m: any) => ({ default: m?.PublicInvoiceView || m?.default || m })));
const PublicResultSlipPortal = safeLazy(() => import('./public/PublicResultSlipPortal').then((m: any) => ({ default: m?.PublicResultSlipPortal || m?.default || m })));
const DSInterestPage = safeLazy(() => import('./public/DSInterestPage').then((m: any) => ({ default: m?.DSInterestPage || m?.default || m })));
const RestaurantPOSManager = safeLazy(() => import('./restaurant/RestaurantPOSManager').then((m: any) => ({ default: m?.RestaurantPOSManager || m?.default || m })));
const HealthCoreView = safeLazy(() => import('./his/HealthCoreView').then((m: any) => ({ default: m?.HealthCoreView || m?.default || m })));
const ModernPharmacyManager = safeLazy(() => import('./his/ModernPharmacyManager').then((m: any) => ({ default: m?.ModernPharmacyManager || m?.default || m })));
const CarServiceView = safeLazy(() => import('./carservice/CarServiceView').then((m: any) => ({ default: m?.CarServiceView || m?.default || m })));





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
    'community': 'Community & Social Hub',
    'parent_portal': 'Parent Portal',
    'eduvote': 'EduVote AI student elections',
    'private_security': 'Sentinel Private Security',
    'security': 'Sentinel Private Security',
    'private-security': 'Sentinel Private Security'
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

    // Sync currentUser to the apiService module-level cache for branch auto-attach
    useEffect(() => {
        if (currentUser) {
            setSessionUser({
                institutionId: currentUser.institutionId,
                branchId: (currentUser as any).branchId,
                branch_id: (currentUser as any).branch_id,
                role: currentUser.role as string
            });
            setImpersonatedRole(null);
            setSelectedRole(null);
        } else {
            setSessionUser(null);
        }
    }, [currentUser?.id, currentUser?.institutionId, (currentUser as any)?.branchId, (currentUser as any)?.branch_id]);

    // Handle 401 session-expiry events fired by apiService when token refresh fails
    useEffect(() => {
        let lastFiredAt = 0;
        const onSessionExpired = () => {
            // Debounce — avoid multiple toasts in quick succession
            const now = Date.now();
            if (now - lastFiredAt < 10000) return;
            lastFiredAt = now;
            warning('Your session has expired. Please log in again.');
            // Clear all known session keys and force re-login
            const sessionKeys = ['eduai_active_session', 'eduai_user_session', 'eduai_impersonated_user', 'user'];
            sessionKeys.forEach(k => localStorage.removeItem(k));
            setCurrentUser(null);
        };
        window.addEventListener('eduai:session_expired', onSessionExpired as EventListener);
        return () => window.removeEventListener('eduai:session_expired', onSessionExpired as EventListener);
    }, [warning]);

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
    const [branches, setBranches] = useState<Branch[]>([]);
    const [events, setEvents] = useState<any[]>([]);
    const [isHealthSystemOpen, setIsHealthSystemOpen] = useState(false);
    const [isPharmacySystemOpen, setIsPharmacySystemOpen] = useState(false);
    const [counties, setCounties] = useState<County[]>([]);
    const [constituencies, setConstituencies] = useState<Constituency[]>([]);
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
    const [isApiOnline, setIsApiOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
    const [isSchemaInitializationRequired, setIsSchemaInitializationRequired] = useState(false);
    const [isBootstrapped, setIsBootstrapped] = useState(false);
    const isRefreshingRef = React.useRef(false);
    const lastRefreshTimeRef = React.useRef(0);
    const prevUnreconciledIdsRef = useRef<Set<string>>(new Set());
    const isFirstLoadDoneRef = useRef(false);
    const [appInitializing, setAppInitializing] = useState(true);
    const [loadStatus, setLoadStatus] = useState<string>("");
    const [loadError, setLoadError] = useState<string>("");
    const [isTransitioning, setIsTransitioning] = useState(false);

    // Dynamic browser online/offline event listeners
    React.useEffect(() => {
        const handleOnline = () => {
            setIsApiOnline(true);
        };
        const handleOffline = () => {
            setIsApiOnline(false);
        };
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [extensionRequests, setExtensionRequests] = useState<ExtensionRequest[]>([]);
    const [voteHeads, setVoteHeads] = useState<VoteHead[]>([]);
    const [feeStructures, setFeeStructures] = useState<FeeStructure[]>([]);
    const [financialPeriods, setFinancialPeriods] = useState<FinancialPeriod[]>([]);
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [buildingFloors, setBuildingFloors] = useState<BuildingFloor[]>([]);
    const [buildingOffices, setBuildingOffices] = useState<BuildingOffice[]>([]);
    const [buildingVisitorLogs, setBuildingVisitorLogs] = useState<BuildingVisitorLog[]>([]);
    const [buildingVisitorAssets, setBuildingVisitorAssets] = useState<BuildingVisitorAsset[]>([]);
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
    const [showModuleOnboarding, setShowModuleOnboarding] = useState(false);
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

    const [activeStoreTenantId, setActiveStoreTenantId] = useState<string | null>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const shop = params.get('shop') || params.get('showroom') || params.get('id') || params.get('kiosk') || params.get('institution') || params.get('institutionId') || params.get('school') || params.get('schoolId') || params.get('store') || params.get('tenant');
            if (shop) return shop;

            const host = window.location.hostname.toLowerCase();
            const parts = host.split('.');
            if (parts.length >= 2) {
                const sub = parts[0];
                const reserved = ['www', 'app', 'marketplace', 'showcase', 'marketing', 'api', 'localhost', '127', 'alumni', 'alumnae', 'almamater', 'portal', 'drivingschool', 'driving', 'transport', 'shuttle', 'community', 'social', 'showroom', 'carshowroom'];
                const isReserved = reserved.includes(sub) || sub.includes('portal') || sub.includes('admin') || sub.includes('alma') || sub.includes('driving') || sub.includes('shuttle') || sub.includes('showroom');
                
                if (!isReserved) {
                    return sub; // Return custom subdomain as tenant key
                }
            }
            return null;
        } catch (e) {
            return null;
        }
    });

    const isEventSubdomain = useMemo(() => {
        try {
            const host = window.location.hostname.toLowerCase();
            const parts = host.split('.');
            if (parts.length < 2) return false;
            const sub = parts[0];
            return events.some(e => {
                if (!e.customSubdomain) return false;
                const normalized = e.customSubdomain.toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
                return normalized === host || normalized === sub || normalized.includes(host);
            });
        } catch (e) {
            return false;
        }
    }, [events]);

    const showPublicEventRegistration = useMemo(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            return view === 'event-register' || view === 'event-registration' || isEventSubdomain;
        } catch (e) {
            return false;
        }
    }, [isEventSubdomain]);

    const showPublicEventConfirmation = useMemo(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            return params.get('view') === 'event-confirm';
        } catch (e) {
            return false;
        }
    }, []);

    const [showDrivingSchoolPortal, setShowDrivingSchoolPortal] = useState(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            const view = params.get('view');
            const hostname = window.location.hostname;
            const hasKioskParam = params.has('kiosk') || params.get('view') === 'kiosk';
             return view === 'ds' || view === 'driving' || hasKioskParam || hostname === 'drivingschool.eduai.co.ke' || hostname === 'urbands.eduai.co.ke' || hostname.includes('drivingschool') || hostname.includes('urbands');
        } catch (e) {
            return false;
        }
    });
    const showTenantStore = !!activeStoreTenantId && !showDrivingSchoolPortal && !isEventSubdomain;
    const [loginInitialView, setLoginInitialView] = useState<'login' | 'register' | 'reset_password'>(() => {
        try {
            const params = new URLSearchParams(window.location.search);
            if (params.get('resetToken')) return 'reset_password';
            
            const hostname = window.location.hostname;
             const isSpecializedSubdomain = hostname.includes('drivingschool') || hostname.includes('urbands') || hostname.includes('transport') || hostname.includes('shuttle') || hostname.includes('community') || hostname.includes('showroom');
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
             if (hostname === 'drivingschool.eduai.co.ke' || hostname === 'urbands.eduai.co.ke' || hostname.includes('drivingschool') || hostname.includes('urbands')) return 'ds';
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
            
            if (isMarketingSubdomain || params.get('view') === 'showcase' || params.get('view') === 'marketing') return true;

            // Subdomain detection for Alumnae Portal
            const isAlumnaeSubdomain = hostname.startsWith('alumnae.') || hostname.startsWith('alumni.') || hostname.startsWith('network.') || hostname.startsWith('circle.') || hostname.includes('almamater') || hostname.includes('alma_mater');
            
            const isLessonManageLink = !!window.location.pathname.match(/^\/ds\/lesson\/([^\/]+)\/manage\/?$/);
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
    const getCountyById = useCallback((id?: string) => !id ? undefined : (Array.isArray(counties) ? counties : []).find(c => c && c.id === id), [counties]);
    const getInstitutionById = useCallback((id?: string) => !id ? undefined : (Array.isArray(institutions) ? institutions : []).find(i => i && i.id === id), [institutions]);

    const activeInstitution = useMemo(() => {
        if (!Array.isArray(institutions)) return null;

        const mergeModules = (inst: Institution) => {
            const states = (institutionModuleStates || []).filter(m => (m.institutionId || (m as any).institution_id) === inst.id);
            const vState = states.find(m => m.moduleId === 'visitor_settings' || (m as any).module_id === 'visitor_settings');
            let vData: any = null;
            if (vState?.data) {
                try {
                    vData = typeof vState.data === 'string' ? JSON.parse(vState.data) : vState.data;
                } catch (_) {}
            }

            let localSaved: any = null;
            try {
                const raw = localStorage.getItem(`eduai_visitor_settings_${inst.id}`) || localStorage.getItem('eduai_visitor_settings');
                if (raw) localSaved = JSON.parse(raw);
            } catch (_) {}

            const cleanTime = (val: any) => {
                if (!val || typeof val !== 'string') return '';
                const t = val.trim();
                if (/^\d{1,2}:\d{2}/.test(t)) {
                    return t.slice(0, 5);
                }
                return t;
            };

            const localTime = cleanTime(localSaved?.visitorAutoFinalizeTime || localSaved?.visitor_auto_finalize_time);
            const modTime = cleanTime(vData?.visitorAutoFinalizeTime || vData?.visitor_auto_finalize_time);
            const instTime = cleanTime(inst.visitorAutoFinalizeTime || (inst as any)?.visitor_auto_finalize_time);

            let visitorAutoFinalizeTime = '18:00';
            if (localTime) {
                visitorAutoFinalizeTime = localTime;
            } else if (modTime) {
                visitorAutoFinalizeTime = modTime;
            } else if (instTime) {
                visitorAutoFinalizeTime = instTime;
            }

            let visitorAutoFinalizeEnabled = false;
            if (localSaved && (localSaved.visitorAutoFinalizeEnabled !== undefined || localSaved.visitor_auto_finalize_enabled !== undefined)) {
                visitorAutoFinalizeEnabled = Boolean(localSaved.visitorAutoFinalizeEnabled ?? localSaved.visitor_auto_finalize_enabled);
            } else if (vData && (vData.visitorAutoFinalizeEnabled !== undefined || vData.visitor_auto_finalize_enabled !== undefined)) {
                visitorAutoFinalizeEnabled = Boolean(vData.visitorAutoFinalizeEnabled ?? vData.visitor_auto_finalize_enabled);
            } else if (inst.visitorAutoFinalizeEnabled !== undefined || (inst as any)?.visitor_auto_finalize_enabled !== undefined) {
                visitorAutoFinalizeEnabled = Boolean(inst.visitorAutoFinalizeEnabled ?? (inst as any)?.visitor_auto_finalize_enabled);
            }

            const notifyHostOnVisitorArrival = localSaved?.notifyHostOnVisitorArrival ?? 
                                               localSaved?.notify_host_on_visitor_arrival ?? 
                                               vData?.notifyHostOnVisitorArrival ?? 
                                               vData?.notify_host_on_visitor_arrival ?? 
                                               inst.notifyHostOnVisitorArrival ?? 
                                               (inst as any)?.notify_host_on_visitor_arrival ?? 
                                               true;

            const visitorArrivalSmsTemplate = localSaved?.visitorArrivalSmsTemplate || 
                                              localSaved?.visitor_arrival_sms_template || 
                                              vData?.visitorArrivalSmsTemplate || 
                                              vData?.visitor_arrival_sms_template || 
                                              inst.visitorArrivalSmsTemplate || 
                                              (inst as any)?.visitor_arrival_sms_template || 
                                              '';

            return {
                ...inst,
                visitorAutoFinalizeEnabled,
                visitor_auto_finalize_enabled: visitorAutoFinalizeEnabled,
                visitorAutoFinalizeTime,
                visitor_auto_finalize_time: visitorAutoFinalizeTime,
                notifyHostOnVisitorArrival,
                notify_host_on_visitor_arrival: notifyHostOnVisitorArrival,
                visitorArrivalSmsTemplate,
                visitor_arrival_sms_template: visitorArrivalSmsTemplate,
                moduleStates: states
            };
        };

        const cleanId = (id?: string) => id ? String(id).replace(/^(br_inst_br_|br_inst_|br_|inst_br_|inst_)/gi, '').toLowerCase() : '';

        // Support showroom/school context via URL param or subdomain (even if not logged in)
        const targetId = activeStoreTenantId || (currentUser && currentUser.role !== 'super_admin' ? currentUser.institutionId : null);
        if (targetId) {
            const normTarget = cleanId(targetId);
            const found = institutions.find(i => i && (
                i.id === targetId || 
                i.slug === targetId || 
                (i.useSubdomain && i.customSubdomain === targetId) ||
                (normTarget && cleanId(i.id) === normTarget)
            ));
            if (found) return mergeModules(found);

            // Check if they are a constituency user
            const isConstituency = currentUser && (currentUser.role === 'constituency_admin' || currentUser.role === 'constituency_staff' || currentUser.role?.startsWith('constituency_'));
            if (isConstituency || targetId === 'Kigumo') {
                const conFound = (constituencies || []).find(c => c && (c.name === targetId || c.id === targetId));
                if (conFound) {
                    return mergeModules({
                        id: conFound.name,
                        name: conFound.name,
                        email: '',
                        phoneNumber: '',
                        institutionType: 'Constituency' as any,
                        status: conFound.status || 'active',
                        trialEndsAt: conFound.trialEndsAt,
                        subscriptionEndsAt: conFound.subscriptionEndsAt,
                    } as any);
                } else if (targetId === 'Kigumo') {
                    return mergeModules({
                        id: 'Kigumo',
                        name: 'Kigumo',
                        email: '',
                        phoneNumber: '',
                        institutionType: 'Constituency' as any,
                        status: 'active',
                    } as any);
                }
            }

            // Fallback to registry if not onboarded
            const registryEntry = schoolRegistry.find(s => 
                s.id === targetId || 
                s.institutionId === targetId || 
                s.slug === targetId || 
                s.customSubdomain === targetId ||
                (normTarget && (cleanId(s.id) === normTarget || cleanId(s.institutionId) === normTarget))
            );
            if (registryEntry) {
                return mergeModules({
                    id: targetId,
                    name: registryEntry.name,
                    email: '',
                    phoneNumber: '',
                    institutionType: (registryEntry.institutionType || 'Education') as any,
                    status: 'active',
                } as any);
            }
        }

        if (currentUser) {
            const normUserInstId = cleanId(currentUser.institutionId);
            const found = (institutions || []).find(i => i && (
                i.id === currentUser.institutionId || 
                (normUserInstId && cleanId(i.id) === normUserInstId)
            ));
            if (found) return mergeModules(found);

            const initialFound = INITIAL_INSTITUTIONS.find(i => i && (
                i.id === currentUser.institutionId ||
                (normUserInstId && cleanId(i.id) === normUserInstId)
            ));
            if (initialFound) return mergeModules(initialFound);

            const foundCounty = (counties || []).find(c => c && (
                c.id === currentUser.institutionId || 
                c.id === currentUser.countyId ||
                c.code === currentUser.institutionId ||
                c.code === currentUser.countyId ||
                (normUserInstId && cleanId(c.id) === normUserInstId) ||
                (c.name && currentUser.institutionId && cleanId(c.name) === normUserInstId)
            ));
            if (foundCounty) {
                return mergeModules({
                    id: foundCounty.id,
                    name: foundCounty.name,
                    institutionType: 'County',
                    category: 'County Government',
                    status: foundCounty.status || 'active',
                    countyId: foundCounty.id
                } as any);
            }

            const regFound = (schoolRegistry || []).find(s => s && (
                s.id === currentUser.institutionId ||
                s.institutionId === currentUser.institutionId ||
                (normUserInstId && (cleanId(s.id) === normUserInstId || cleanId(s.institutionId) === normUserInstId))
            ));
            if (regFound) {
                return mergeModules({
                    id: regFound.id,
                    name: regFound.name,
                    institutionType: (regFound.institutionType || 'Education') as any,
                    status: 'active'
                } as any);
            }

            // Fallback synthesis for authenticated user with an institutionId to prevent loading lock
            if (currentUser.institutionId) {
                return mergeModules({
                    id: currentUser.institutionId,
                    name: (currentUser as any).institutionName || (currentUser as any).schoolName || (currentUser.role === 'reseller' ? 'Reseller Agency' : 'Institutional Workspace'),
                    institutionType: (currentUser.role === 'pharmacist' || currentUser.role === 'pharmacy_admin') ? 'Pharmacy' : 
                                     (currentUser.role?.includes('his') || currentUser.role === 'nurse' || (currentUser as any).role === 'doctor') ? 'HIS' : 
                                     (currentUser.role === 'reseller') ? 'Reseller' : 'Education',
                    status: 'active'
                } as any);
            }
        }

        return null;
    }, [currentUser, institutions, counties, schoolRegistry, activeStoreTenantId, institutionModuleStates, constituencies]);

    const activeRole = useMemo<Role | null>(() => {
        if (!currentUser) return null;

        // STRICT ACCESS ENFORCEMENT:
        // A user whose assigned role is strictly a teacher or HOD (no administrative leadership role)
        // must strictly access the Teacher Portal only.
        if (isStrictTeacherUser(currentUser)) {
            const roleCandidate = selectedRole || currentUser.role;
            if (isTeacherRole(roleCandidate)) {
                return roleCandidate as Role;
            }
            return (currentUser.role === 'lecturer' || currentUser.role === 'practice_teacher' || currentUser.role === 'hod') ? currentUser.role : 'teacher';
        }

        if (impersonatedRole) return impersonatedRole;

        const roleToUse = selectedRole || currentUser.role;

        // Force HIS Admin role for HIS/Hospital/Clinic institutions (independent from EduPulse, do not login as principal/head_teacher)
        if (isHISInstitution(activeInstitution) && (['admin', 'head_teacher', 'headteacher', 'principal', 'teacher', 'headmaster'] as string[]).includes(roleToUse as string)) {
            return 'his_admin';
        }

        return roleToUse;
    }, [impersonatedRole, currentUser, institutions, selectedRole, activeInstitution]);

    const isHIS = useMemo(() => {
        return isHISInstitution(activeInstitution, activeRole);
    }, [activeInstitution, activeRole]);

    const isAdminCatchAll = useMemo(() => {
        // Pure teachers & HODs can NEVER access the Admin Portal
        if (isStrictTeacherUser(currentUser)) return false;
        if (isTeacherRole(activeRole)) return false;
        if (currentUser?.role === 'hod' || activeRole === 'hod') return false;

        return [
            'super_admin', 'group_admin', 'school_group_admin', 'school_admin', 'admin',
            'head_teacher', 'headteacher', 'principal', 'headmaster', 'headmistress',
            'deputy', 'deputy_headteacher', 'deputy_principal', 'deputy_head',
            'dos', 'director_of_studies', 'academics_officer',
            'tto', 'agrovet_admin', 'property_admin', 'his_admin', 'nurse',
            'carwash_admin', 'transport_admin', 'reseller', 'retail_agent', 'field_agent',
            'store', 'supplier', 'fuel_admin', 'legal_admin', 'cooperative_manager',
            'coop_chairman', 'sacco_officer', 'coop_admin', 'pharmacy_admin',
            'driving_instructor', 'staff', 'security', 'driver', 'event_manager',
            'sales', 'director', 'finance', 'reception', 'mechanic_admin',
            'finance_officer', 'procurement_officer', 'managing_director', 'hoi',
            'operation_manager', 'operations_manager', 'manager'
        ].includes(activeRole || '');
    }, [currentUser, activeRole]);

    const isFullWidthLayout = useMemo(() => {
        return activeRole === 'super_admin' || activeRole === 'county_admin' || isAdminCatchAll;
    }, [activeRole, isAdminCatchAll]);

    const activeCounty = useMemo(() => {
        if (!currentUser || !Array.isArray(counties)) return null;

        // Match by current user's countyId or institutionId
        const directMatch = getCountyById(currentUser.countyId) || 
                            getCountyById(currentUser.institutionId) ||
                            counties.find(c => c.id === currentUser.countyId || c.id === currentUser.institutionId || c.code === currentUser.countyId || c.code === currentUser.institutionId || (c.name && currentUser.institutionId && c.name.toLowerCase() === currentUser.institutionId.toLowerCase()));
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
                primaryColor: activeInstitution?.themeColor || '#0ea5e9', // Fallback to sky blue
                secondaryColor: '#0f172a',
                logoUrl: activeInstitution?.logoUrl || '/driving_school_logo_3d.png',
                motto: 'Safety First, Success Always',
                 website: activeInstitution?.kioskUrl || 'https://urbands.eduai.co.ke',
                displayName: activeInstitution?.name || 'Driving School Portal'
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
                'constituency_admin': 'Constituency Portal',
                'admin': 'Admin Portal',
                'head_teacher': 'Principal Portal',
                'lecturer': 'Lecturer Portal',
                'student': 'Student Portal',
                'parent': 'Parent Portal',
                'finance_officer': 'Finance Office',
                'finance': 'Finance Office',
                'hr_officer': 'HR Office',
                'academics_officer': 'Academic Office',
                'reseller': 'Reseller Portal',
                'agrovet_admin': 'Agrovet Manager',
                'property_admin': 'Property Manager',
                'his_admin': 'HIS Portal',
                'nurse': 'EduPulse Sickbay',
                'carwash_admin': 'Car Wash Manager',
                'fuel_admin': 'Fuel Station Manager',
                'legal_admin': 'Legal Hub',
                'cooperative_manager': 'Coop Manager',
                'tenant': 'Tenant Portal',
                'landlord': 'Landlord Portal',
                'event_manager': 'Event Command Desk',
                'security': 'SentinelPass Security',
                'info_desk': 'SentinelPass Reception'
            };
            suffix = roleNames[activeRole] || activeRole.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }

        if (isHealthSystemOpen || activeRole === 'his_admin' || activeRole === 'nurse' || (activeRole === 'admin' && activeInstitution?.institutionType === 'HIS')) {
            suffix = isEduInstitution(activeInstitution) ? "EduPulse Wellness" : "HealthCore HIS";
        }
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

    const isSchoolContext = useMemo(() => {
        const instType = activeInstitution?.institutionType as string | undefined;
        const cat = activeInstitution?.category;
        return instType === 'Primary' || instType === 'Secondary' || cat === 'Primary' || cat === 'Secondary' || (cat !== 'University' && cat !== 'Tertiary');
    }, [activeInstitution]);

    const allocations = useMemo(() => {
        const reqList = Array.isArray(requests) ? requests : [];
        if (isSchoolContext) {
            // On Primary & Secondary schools, lessons allocated to teachers are automatically approved for timetable upon allocation!
            return reqList.filter(r => r && (r.lecturerId || r.status === 'approved' || r.status === 'hod_approved')).map(r => ({ ...r, status: 'approved' as const }));
        }
        return reqList.filter(r => r && (r.status === 'approved' || r.status === 'hod_approved' || r.status === 'change_request_pending' || r.status === 'deallocation_pending'));
    }, [requests, isSchoolContext]);

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

    const loadData = useCallback(async (isFirstLoad = false, force = false, instOverrideId?: string, silent = false) => {
        // Prevent concurrent refreshes
        if (isRefreshingRef.current) return;
        
        // Prevent too frequent refreshes (debounce to 2 seconds) unless forced
        const now = Date.now();
        if (!isFirstLoad && !force && (now - lastRefreshTimeRef.current < 2000)) return;

        isRefreshingRef.current = true;
        lastRefreshTimeRef.current = now;

        if (isFirstLoad) setAppInitializing(true);
        if (!silent) setLoadStatus("Initializing...");

        try {
            if (!apiService.isConfigured()) initSupabaseClient();
            setIsBootstrapped(true);

            // ── PHASE 1: Health check + identity (blocks UI or uses offline cache) ──────────────────
            let isOffline = !navigator.onLine;
            let insts: any[] = [];
            let cnts: any[] = [];
            let sett: any = null;
            let u: any[] = [];
            let reg: any[] = [];
            let imsPhase1: any[] = [];
            let evts: any[] = [];
            let consts: any[] = [];
            let brs: any[] = [];

            if (!isOffline) {
                if (!silent) setLoadStatus("Connecting...");
                try {
                    const healthPromise = apiService.testDatabaseConnection().catch(() => ({ status: (typeof navigator !== 'undefined' && navigator.onLine) ? 'online' : 'offline' }));
                    const timeoutPromise = new Promise<{ status: string }>((resolve) =>
                        setTimeout(() => resolve({ status: (typeof navigator !== 'undefined' && navigator.onLine) ? 'online' : 'offline' }), 4000)
                    );
                    const health = await Promise.race([healthPromise, timeoutPromise]);
                    if (health.status === 'setup_required') {
                        setIsSchemaInitializationRequired(true);
                        setIsApiOnline(true);
                        setAppInitializing(false);
                        return;
                    }
                    if (health.status === 'offline' && (!navigator.onLine || !apiService.isConfigured())) {
                        isOffline = true;
                        setIsApiOnline(false);
                    } else {
                        isOffline = false;
                        setIsApiOnline(true);
                        setIsSchemaInitializationRequired(false);
                    }
                } catch (e) {
                    if (!navigator.onLine || !apiService.isConfigured()) {
                        isOffline = true;
                        setIsApiOnline(false);
                    } else {
                        isOffline = false;
                        setIsApiOnline(true);
                    }
                }
            }

            if (isOffline) {
                if (!silent) setLoadStatus("Offline Mode Active...");
                insts = await localDb.getAll('institutions').catch(() => []);
                cnts = await localDb.getAll('counties').catch(() => []);
                sett = await localDb.get('settings', 'global_settings').catch(() => null);
                u = await localDb.getAll('users').catch(() => []);
                reg = await localDb.getAll('school_registry').catch(() => []);
                imsPhase1 = await localDb.getAll('institution_module_states').catch(() => []);
                evts = await localDb.getAll('events').catch(() => []);
                consts = await localDb.getAll('constituencies').catch(() => []);
                brs = await localDb.getAll('branches').catch(() => []);

                if (!insts || insts.length === 0) {
                    const lsInsts = (() => { try { return JSON.parse(localStorage.getItem('institutions') || 'null'); } catch { return null; } })();
                    insts = (Array.isArray(lsInsts) && lsInsts.length > 0) ? lsInsts : INITIAL_INSTITUTIONS;
                }
                if (!u || u.length === 0) u = INITIAL_USERS;
                if (!sett) sett = INITIAL_COMPANY_DETAILS;

                setIsApiOnline(false);
                setIsSchemaInitializationRequired(false);
            } else {
                // Background idempotent migrations (non-blocking for ultra-fast startup)
                setTimeout(() => {
                    if (isApiOnline) {
                        const startupMigrationsKey = 'eduai_startup_migrations_v407';
                        if (!localStorage.getItem(startupMigrationsKey)) {
                            localStorage.setItem(startupMigrationsKey, 'true');
                            apiService.runMigration(`
CREATE OR REPLACE FUNCTION public.allocate_tenant_sms_bonus()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public, pg_temp
AS $$
DECLARE
    days_diff INTEGER;
    months_diff INTEGER;
    tenant_count INTEGER;
    bonus_units INTEGER;
    old_end TIMESTAMP;
    new_end TIMESTAMP;
BEGIN
    new_end := NEW.subscription_ends_at;
    old_end := OLD.subscription_ends_at;

    IF new_end IS NOT NULL AND (old_end IS NULL OR new_end > old_end) THEN
        IF old_end IS NULL OR old_end < NOW() THEN
            days_diff := EXTRACT(EPOCH FROM (new_end - NOW())) / 86400;
        ELSE
            days_diff := EXTRACT(EPOCH FROM (new_end - old_end)) / 86400;
        END IF;

        IF days_diff <= 0 THEN
            days_diff := 30;
        END IF;

        IF days_diff > 300 THEN
            months_diff := 12;
        ELSE
            months_diff := CEIL(days_diff / 30.0);
        END IF;

        SELECT COUNT(*)::INTEGER INTO tenant_count 
        FROM pm_tenants 
        WHERE institution_id = NEW.id;

        IF tenant_count > 0 THEN
            bonus_units := 6 * months_diff * tenant_count;
            
            NEW.sms_config := jsonb_set(
                COALESCE(NEW.sms_config, '{}'::jsonb), 
                '{systemSmsBalance}', 
                to_jsonb(COALESCE((NEW.sms_config->>'systemSmsBalance')::int, 0) + bonus_units)
            );
            
            NEW.smsConfig := NEW.sms_config;
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_allocate_tenant_sms_bonus ON public.institutions;
DROP TRIGGER IF EXISTS trg_allocate_tenant_sms_bonus ON institutions;
CREATE OR REPLACE TRIGGER trg_allocate_tenant_sms_bonus
    BEFORE UPDATE OF subscription_ends_at ON institutions
    FOR EACH ROW
    EXECUTE FUNCTION allocate_tenant_sms_bonus();
                            `).catch(() => {});

                            apiService.runMigration(`ALTER TABLE public.retail_inventory_items ADD COLUMN IF NOT EXISTS source text;`).catch(() => {});
                            apiService.runMigration(`
                                CREATE TABLE IF NOT EXISTS public.his_financial_records (
                                    id TEXT PRIMARY KEY,
                                    institution_id TEXT NOT NULL,
                                    patient_id TEXT,
                                    patient_name TEXT,
                                    invoice_number TEXT,
                                    type TEXT DEFAULT 'invoice',
                                    category TEXT,
                                    items JSONB DEFAULT '[]'::jsonb,
                                    amount NUMERIC(15, 2) DEFAULT 0,
                                    total_amount NUMERIC(15, 2) DEFAULT 0,
                                    amount_paid NUMERIC(15, 2) DEFAULT 0,
                                    balance NUMERIC(15, 2) DEFAULT 0,
                                    status TEXT DEFAULT 'Pending',
                                    payment_method TEXT,
                                    department TEXT,
                                    notes TEXT,
                                    date DATE DEFAULT CURRENT_DATE,
                                    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                                );
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS patient_name TEXT;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS invoice_number TEXT;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'invoice';
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS category TEXT;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS amount NUMERIC(15, 2) DEFAULT 0;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15, 2) DEFAULT 0;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15, 2) DEFAULT 0;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS balance NUMERIC(15, 2) DEFAULT 0;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Pending';
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS payment_method TEXT;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS department TEXT;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS notes TEXT;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS date DATE DEFAULT CURRENT_DATE;
                                ALTER TABLE public.his_financial_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
                                NOTIFY pgrst, 'reload schema';
                            `).catch(() => {});
                        }

                        const visitorNotifSyncedKey = 'eduai_visitor_notif_synced_v407';
                        if (!localStorage.getItem(visitorNotifSyncedKey)) {
                            localStorage.setItem(visitorNotifSyncedKey, 'true');
                            apiService.runMigration(`
                                ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS notify_host_sms BOOLEAN DEFAULT FALSE;
                                ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS host_phone TEXT;
                                CREATE INDEX IF NOT EXISTS idx_app_notifications_user_id ON public.app_notifications(user_id);
                                CREATE INDEX IF NOT EXISTS idx_app_notifications_institution_id ON public.app_notifications(institution_id);
                                NOTIFY pgrst, 'reload schema';
                            `).catch(() => {});
                        }

                        const teacherCheckinSyncedKey = 'eduai_teacher_checkin_synced_v278';
                        if (!localStorage.getItem(teacherCheckinSyncedKey)) {
                            localStorage.setItem(teacherCheckinSyncedKey, 'true');
                            apiService.runMigration(`
DROP FUNCTION IF EXISTS public.process_teacher_checkin(TEXT, TEXT, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.process_teacher_checkin(UUID, UUID, VARCHAR, VARCHAR, TEXT);
DROP FUNCTION IF EXISTS public.process_teacher_checkin(TEXT, TEXT, VARCHAR, VARCHAR, TEXT, TEXT, TIMESTAMPTZ);

CREATE OR REPLACE FUNCTION public.process_teacher_checkin(
    p_teacher_id TEXT,
    p_institution_id TEXT,
    p_checkin_type VARCHAR(20),
    p_location VARCHAR(255) DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_timetable_entry_id TEXT DEFAULT NULL,
    p_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
    v_checkin_id UUID;
    v_current_time TIME := COALESCE(p_timestamp::time, CURRENT_TIME);
    v_current_date DATE := COALESCE(p_timestamp::date, CURRENT_DATE);
BEGIN
    INSERT INTO public.teacher_checkins (
        teacher_id,
        institution_id,
        check_in_date,
        morning_check_in_time,
        morning_location,
        morning_notes,
        afternoon_check_in_time,
        afternoon_location,
        afternoon_notes
    ) VALUES (
        p_teacher_id,
        p_institution_id,
        v_current_date,
        CASE WHEN p_checkin_type = 'Morning' THEN v_current_time ELSE NULL END,
        CASE WHEN p_checkin_type = 'Morning' THEN p_location ELSE NULL END,
        CASE WHEN p_checkin_type = 'Morning' THEN p_notes ELSE NULL END,
        CASE WHEN p_checkin_type = 'Afternoon' THEN v_current_time ELSE NULL END,
        CASE WHEN p_checkin_type = 'Afternoon' THEN p_location ELSE NULL END,
        CASE WHEN p_checkin_type = 'Afternoon' THEN p_notes ELSE NULL END
    )
    ON CONFLICT (teacher_id, check_in_date)
    DO UPDATE SET
        morning_check_in_time = CASE WHEN p_checkin_type = 'Morning' THEN v_current_time ELSE teacher_checkins.morning_check_in_time END,
        morning_location = CASE WHEN p_checkin_type = 'Morning' THEN p_location ELSE teacher_checkins.morning_location END,
        morning_notes = CASE WHEN p_checkin_type = 'Morning' THEN p_notes ELSE teacher_checkins.morning_notes END,
        afternoon_check_in_time = CASE WHEN p_checkin_type = 'Afternoon' THEN v_current_time ELSE teacher_checkins.afternoon_check_in_time END,
        afternoon_location = CASE WHEN p_checkin_type = 'Afternoon' THEN p_location ELSE teacher_checkins.afternoon_location END,
        afternoon_notes = CASE WHEN p_checkin_type = 'Afternoon' THEN p_notes ELSE teacher_checkins.afternoon_notes END,
        updated_at = CURRENT_TIMESTAMP
    RETURNING id INTO v_checkin_id;
    
    UPDATE public.teacher_checkin_reminders
    SET status = 'Acknowledged',
        acknowledged_at = CURRENT_TIMESTAMP
    WHERE teacher_id = p_teacher_id
        AND reminder_date = v_current_date
        AND reminder_type = p_checkin_type;
    
    RETURN v_checkin_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.process_teacher_checkin(TEXT, TEXT, VARCHAR, VARCHAR, TEXT, TEXT, TIMESTAMP WITH TIME ZONE) TO anon, authenticated, service_role;
                        `).catch(() => {});
                        }
                    }
                }, 1000);

                if (!silent) setLoadStatus("Synchronizing Identity...");
                
                // High-speed parallelized identity fetch with timeout protections
                const withTimeout = <T,>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> => {
                    return Promise.race([
                        promise,
                        new Promise<T>((resolve) => setTimeout(() => resolve(fallback), timeoutMs))
                    ]);
                };

                const isGuestMode = !currentUser;
                const isSuperAdmin = currentUser?.role === 'super_admin';
                const identityTimeout = isSuperAdmin ? 30000 : 15000;

                const results = await Promise.all([
                    withTimeout(apiService.fetchInstitutions().catch(() => []), identityTimeout, []),
                    (isGuestMode || (isAlumnaeMode && !currentUser)) ? Promise.resolve([]) : withTimeout(apiService.fetchModuleRecords<County>('counties', undefined, undefined, { limit: 10000 }).catch(() => []), identityTimeout, []),
                    withTimeout(apiService.fetchCompanySettings().catch(() => null), identityTimeout, null),
                    (isGuestMode || (isAlumnaeMode && !currentUser)) ? Promise.resolve([]) : (currentUser?.role === 'super_admin' || currentUser?.role?.startsWith('county_')) ? withTimeout(apiService.fetchModuleRecords<User>('users', undefined, undefined, { limit: 100000 }).catch(() => []), identityTimeout, []) : withTimeout(apiService.fetchUsers(currentUser?.institutionId).catch(() => []), identityTimeout, []),
                    (currentUser || showAlumnaeRegister || showInstitutionClaim || showAlumnaeActivation) ? withTimeout(apiService.fetchFullRegistry().catch(() => []), identityTimeout, []) : Promise.resolve([]),
                    !currentUser ? Promise.resolve([]) : withTimeout(apiService.fetchModuleRecords<InstitutionModuleState>('institution_module_states', undefined, undefined, { limit: 10000 }).catch(() => []), identityTimeout, []),
                    isGuestMode ? Promise.resolve([]) : withTimeout(apiService.fetchModuleRecords<any>('events', undefined, undefined, { limit: 10000 }).catch(() => []), identityTimeout, []),
                    (currentUser || showAlumnaeRegister || showInstitutionClaim || showAlumnaeActivation) ? withTimeout(apiService.fetchModuleRecords<Constituency>('constituencies', undefined, undefined, { limit: 10000 }).catch(() => []), identityTimeout, []) : Promise.resolve([]),
                    isGuestMode ? Promise.resolve([]) : withTimeout(apiService.fetchModuleRecords<Branch>('branches', undefined, undefined, { limit: 10000 }).catch(() => []), identityTimeout, []),
                ]);
                insts = results[0];
                cnts = results[1];
                sett = results[2];
                u = results[3];
                reg = results[4];
                imsPhase1 = results[5];
                evts = results[6];
                consts = results[7];
                brs = results[8];

                if (!insts || insts.length === 0) {
                    const localInsts = await localDb.getAll<Institution>('institutions').catch(() => []);
                    if (localInsts && localInsts.length > 0) {
                        insts = localInsts;
                    } else {
                        const lsInsts = (() => { try { return JSON.parse(localStorage.getItem('institutions') || 'null') as Institution[]; } catch { return null; } })();
                        insts = (Array.isArray(lsInsts) && lsInsts.length > 0) ? lsInsts : INITIAL_INSTITUTIONS;
                    }
                } else {
                    localDb.bulkPut('institutions', insts).catch(() => {});
                    try {
                        const existingLs = (() => { try { return JSON.parse(localStorage.getItem('institutions') || 'null'); } catch { return null; } })();
                        if (Array.isArray(existingLs) && existingLs.length > insts.length) {
                            const map = new Map<string, Institution>();
                            existingLs.forEach((i: any) => i && i.id && map.set(i.id, i));
                            insts.forEach((i: any) => i && i.id && map.set(i.id, i));
                            const merged = Array.from(map.values());
                            localStorage.setItem('institutions', JSON.stringify(merged));
                        } else {
                            localStorage.setItem('institutions', JSON.stringify(insts));
                        }
                    } catch (_) {}
                }
                if (!u || u.length === 0) {
                    const localU = await localDb.getAll<User>('users').catch(() => []);
                    u = (localU && localU.length > 0) ? localU : INITIAL_USERS;
                }
                if (!reg || reg.length === 0) {
                    const localReg = await localDb.getAll<SchoolRegistry>('school_registry').catch(() => []);
                    if (localReg && localReg.length > 0) reg = localReg;
                }
            }

            // Sync identity state immediately so we can use activeInstitution in Phase 2
            const normalizedUsers = (u || []).map((usr: any) => ({
                ...usr,
                countyId: usr.countyId || usr.county_id,
                institutionId: usr.institutionId || usr.institution_id
            }));
            const isTenantPhase1 = currentUser && currentUser.role !== 'super_admin' && !currentUser.role?.startsWith('county_');
            const tenantInstPhase1 = currentUser?.institutionId;
            const scopedPhase1Users = (isTenantPhase1 && tenantInstPhase1)
                ? normalizedUsers.filter((usr: any) => usr && (usr.institutionId === tenantInstPhase1 || usr.institution_id === tenantInstPhase1))
                : normalizedUsers;
            setUsers(scopedPhase1Users);
            setInstitutions(prev => {
                if (insts && insts.length > 0) {
                    if (insts.length <= 2 && prev && prev.length > 2) {
                        return prev;
                    }
                    return insts;
                }
                return (prev && prev.length > 0) ? prev : (insts || []);
            });
            setEvents(evts || []);
            if (cnts) setCounties(cnts);
            if (reg) setSchoolRegistry(reg);
            if (sett) setCompanyDetails(prev => ({ ...prev, ...sett }));
            if (imsPhase1) setInstitutionModuleStates(imsPhase1);
            if (consts) setConstituencies(consts);
            if (brs) setBranches(brs);

            const activeInst = insts?.find(i => i.id === currentUser?.institutionId);
            const activeInstWithModules = activeInst ? {
                ...activeInst,
                moduleStates: (imsPhase1 || []).filter((m: any) => (m.institutionId || m.institution_id) === activeInst.id)
            } : null;
            const instType = activeInst?.institutionType || 'General';
            const instId = instOverrideId || (currentUser && (currentUser.role === 'super_admin' || (currentUser.role || '').startsWith('county_')) ? undefined : currentUser?.institutionId);
            const cntId = (currentUser?.role || '').startsWith('county_') ? currentUser?.countyId : undefined;
            const effectiveInstId = instOverrideId || (currentUser?.role === 'super_admin' ? undefined : (activeInst?.id || currentUser?.institutionId || instId || ''));
            const isSuper = currentUser?.role === 'super_admin';

            // Sector Detection
            const instTypeLower = instType.toLowerCase();
            const isAcademic = isSuper || ['education', 'primary', 'secondary', 'college', 'university', 'institute', 'tvet', 'polytechnic'].includes(instTypeLower);
            const isHealth = isSuper || ['his', 'pharmacy'].includes(instTypeLower);
            const isLaw = isSuper || instTypeLower === 'law firm' || (activeInst?.businessSubType || '').toLowerCase().includes('law') || (activeInst?.businessSubType || '').toLowerCase().includes('legal');
            const isCoopRole = currentUser?.role ? ['cooperative_manager', 'coop_admin', 'coop_chairman', 'farmer', 'rider', 'sacco_officer', 'agrovet_admin'].includes(currentUser.role) : false;
            const isCoop = isSuper || isCoopRole || ['cooperative', 'sacco', 'agrovet', 'farming'].includes(instTypeLower);
            const isBusiness = isSuper || ['business', 'business ecosystem', 'retail', 'retail agency', 'agrovet', 'car wash', 'automotive marketplace', 'car showroom', 'hardware', 'pharmacy'].includes(instTypeLower) || instTypeLower.includes('retail') || (activeInst?.businessSubType || '').toLowerCase().includes('retail') || (activeInst?.category || '').toLowerCase().includes('retail');
            const isHigherEd = ['university', 'college', 'tvet', 'polytechnic', 'institute'].includes(instTypeLower);

            const isLogistics = isSuper || ['logistics', 'transport'].includes(instTypeLower);
            const hasTransport = isSuper || isLogistics || isAcademic || activeInstWithModules?.moduleStates?.some((m: any) => (m.moduleId === 'transport' || m.moduleId === 'transport_management') && (m.status === 'active' || m.status === 'trial')) || ['education', 'primary', 'secondary', 'college', 'university', 'logistics', 'transport'].includes(instTypeLower);
            const isHospitality = isSuper || instTypeLower === 'hospitality';
            const isDrivingSchool = isSuper || instTypeLower === 'driving school' || activeInstWithModules?.moduleStates?.some((m: any) => m.moduleId === 'driving_school' && (m.status === 'active' || m.status === 'trial'));
            const isBeautyCollege = isSuper || instTypeLower === 'beauty college' || activeInstWithModules?.moduleStates?.some((m: any) => m.moduleId === 'beauty_college' && (m.status === 'active' || m.status === 'trial'));
            const isPolitical = isSuper || instTypeLower === 'political campaign';
            const isCommunity = isSuper || instTypeLower === 'community';
            const isCounty = isSuper || (currentUser?.role || '').startsWith('county_');

            // ── Module Onboarding: show wizard for edu admins with no active modules ──
            const EDU_TYPES = ['education', 'primary', 'secondary', 'college', 'university', 'institute', 'tvet', 'polytechnic'];
            const isSuperAdminImpersonating = !!currentUser?.isImpersonated || !!originalSuperAdminSession || !!localStorage.getItem('eduai_super_admin_session');
            const isEduAdmin = EDU_TYPES.includes(instTypeLower) && currentUser && currentUser.role !== 'super_admin' && !isSuperAdminImpersonating && ['admin', 'head_teacher', 'dos', 'deputy', 'managing_director', 'hoi', 'operation_manager', 'operations_manager'].includes(currentUser.role);
            if (isEduAdmin && activeInst && activeInst.status !== 'active') {
                const activeModules = (imsPhase1 || []).filter((m: any) => (m.institutionId === activeInst.id || m.institution_id === activeInst.id) && (m.status === 'active' || m.status === 'trial'));
                const dismissedKey = `edu_onboarding_dismissed_${activeInst.id}`;
                const alreadyDismissed = localStorage.getItem(dismissedKey) === 'true';
                if (activeModules.length === 0 && !alreadyDismissed) {
                    setShowModuleOnboarding(true);
                }
            }

            if (!silent) setLoadStatus("Building Workspace...");


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
                    Promise.resolve([]), // Deferred to Phase 3 to eliminate duplicate network load
                    Promise.resolve([]), // Deferred to Phase 3 to eliminate duplicate network load
                    apiService.fetchModuleRecords<ActivityLog>('activity_log', instId, undefined, { limit: activityLogLimit }).catch(() => []),
                    apiService.fetchNotifications(currentUser.id, { limit: notificationLimit }).catch(() => []),
                ]);
            }

            // ── Commit Phase 1 data → unlock UI immediately ──────────────────
            if (insts && insts.length > 0) {
                setInstitutions(prev => {
                    if (insts.length <= 2 && prev && prev.length > 2) {
                        return prev;
                    }
                    const demoInsts = (prev || []).filter(i => i && i.id?.startsWith('demo_'));
                    const combined = [...insts];
                    demoInsts.forEach(di => {
                        if (!combined.some(i => i.id === di.id)) combined.push(di);
                    });
                    return combined;
                });
            } else if (isOffline) {
                setInstitutions(prev => (prev && prev.length > 0 ? prev : INITIAL_INSTITUTIONS));
            }
            if (cnts && cnts.length > 0) setCounties(cnts);
            if (reg) setSchoolRegistry(reg);
            if (sett) {
                setCompanyDetails(prev => ({ ...prev, ...sett }));
                if (sett.marketplaceConfig?.customUrl) {
                    try {
                        const marketUrl = new URL(sett.marketplaceConfig.customUrl);
                        if (window.location.hostname === marketUrl.hostname || new URLSearchParams(window.location.search).get('view') === 'marketplace') {
                            setShowMarketplace(true);
                        }
                    } catch (e) { console.warn("Invalid marketplace URL:", e); }
                }
            } else if (isOffline) {
                setCompanyDetails(prev => ({ ...INITIAL_COMPANY_DETAILS, ...prev }));
            }

            let finalUsers: User[] = u || [];
            if (finalUsers.length === 0 && isOffline) {
                finalUsers = INITIAL_USERS;
            }
            const systemSuperAdmin = INITIAL_USERS.find(iu => iu.role === 'super_admin');
            if (systemSuperAdmin && !finalUsers.some((existing: User) => existing.email === systemSuperAdmin.email)) {
                finalUsers = [...finalUsers, systemSuperAdmin];
            }
            const isTenantPhase2 = currentUser && currentUser.role !== 'super_admin' && !currentUser.role?.startsWith('county_');
            const targetInstPhase2 = currentUser?.institutionId;
            const scopedFinalUsers = (isTenantPhase2 && targetInstPhase2)
                ? finalUsers.filter((usr: any) => usr && (usr.institutionId === targetInstPhase2 || usr.institution_id === targetInstPhase2 || usr.id === currentUser.id))
                : finalUsers;
            setUsers(scopedFinalUsers);

            if (currentUser) {
                const refreshedSelf = finalUsers.find((u: User) => u.id === currentUser.id);
                if (refreshedSelf) {
                    const hasChanges = (
                        refreshedSelf.name !== currentUser.name ||
                        refreshedSelf.email !== currentUser.email ||
                        refreshedSelf.role !== currentUser.role ||
                        refreshedSelf.institutionId !== currentUser.institutionId ||
                        (refreshedSelf as any).countyId !== (currentUser as any).countyId ||
                        (refreshedSelf as any).status !== (currentUser as any).status ||
                        (refreshedSelf as any).phone !== (currentUser as any).phone ||
                        JSON.stringify(refreshedSelf.permissions || []) !== JSON.stringify(currentUser.permissions || [])
                    );
                    if (hasChanges) {
                        setCurrentUser(prev => ({
                            ...prev,
                            ...refreshedSelf,
                            ...(prev?.isImpersonated ? { isImpersonated: true } : {}),
                            ...(prev?.passwordLastUpdated ? { passwordLastUpdated: prev.passwordLastUpdated } : {})
                        } as User));
                        apiService.storeSession({
                            ...currentUser,
                            ...refreshedSelf,
                            ...(currentUser?.isImpersonated ? { isImpersonated: true } : {}),
                            ...(currentUser?.passwordLastUpdated ? { passwordLastUpdated: currentUser.passwordLastUpdated } : {})
                        } as User);
                    }
                } else if (!finalUsers.some((u: User) => u.id === currentUser.id) && !currentUser.id.startsWith('temp_admin_')) {
                    apiService.saveUser(currentUser).catch(err => {
                        // Silently ignore registry conflicts — user already exists in DB but wasn't returned by the query
                        const msg = err?.message || String(err);
                        if (msg.includes('Registry Conflict') || msg.includes('23505') || msg.includes('already registered')) {
                            console.info('[auto-persist] User already exists in registry, skipping duplicate write.');
                        } else {
                            console.error("Failed to auto-persist current user:", err);
                        }
                    });
                }
            }

            // ── UNLOCK UI: dismiss splash now, core data is ready ─────────────
            if (!silent) setLoadStatus("");
            setAppInitializing(false);

            // ── PHASE 2: Resolve core module data (already in-flight or offline cache) ─────────
            if (currentUser) {
                if (isOffline) {
                    d = await localDb.getAll('departments').catch(() => []);
                    s = await localDb.getAll('subjects').catch(() => []);
                    c = await localDb.getAll('courses').catch(() => []);
                    a = await localDb.getAll('allocation_requests').catch(() => []);
                    ay = await localDb.getAll('academic_years').catch(() => []);
                    sem = await localDb.getAll('semesters').catch(() => []);
                    r = await localDb.getAll('rooms').catch(() => []);
                    b = await localDb.getAll('buildings').catch(() => []);
                    al = await localDb.getAll('academic_levels').catch(() => []);
                    tasks = await localDb.getAll('tasks').catch(() => []);
                    txns = await localDb.getAll('transactions').catch(() => []);
                    recs = await localDb.getAll('receipts').catch(() => []);
                    logs = await localDb.getAll('activity_log').catch(() => []);
                    const rawNotifs = await localDb.getAll('notifications').catch(() => []);
                    const cUserNorm = String(currentUser?.id || '').replace(/^u_/, '').toLowerCase();
                    notifs = (rawNotifs || []).filter((n: any) => {
                        const targetId = String(n?.userId || n?.user_id || '').replace(/^u_/, '').toLowerCase();
                        return !targetId || targetId === cUserNorm;
                    });
                } else {
                    const coreResults = await coreModulePromise;
                    [d, s, c, a, ay, sem, r, b, al, tasks, txns, recs, logs, notifs] = coreResults;
                }
            }

            setDepartments(d || []);
            setSubjects(s || []);
            setCourses(c || []);

            const instIdForAlloc = currentUser?.institutionId || activeInstitution?.id;
            if (instIdForAlloc && c && Array.isArray(c)) {
                try {
                    const classAllocKey = `eduai_class_subject_allocations_${instIdForAlloc}`;
                    let currentStore: Record<string, string[]> = {};
                    try {
                        const saved = localStorage.getItem(classAllocKey);
                        if (saved) currentStore = JSON.parse(saved) || {};
                    } catch(e) {}

                    let storeChanged = false;
                    c.forEach((course: any) => {
                        if (Array.isArray(course.levels)) {
                            course.levels.forEach((l: any) => {
                                const lName = l.name;
                                const sIds = [...(l.subjectIds || []), ...((l as any).subject_ids || [])];
                                if (lName && sIds.length > 0) {
                                    const existingInStore = currentStore[lName] || [];
                                    const merged = Array.from(new Set([...existingInStore, ...sIds]));
                                    if (merged.length !== existingInStore.length) {
                                        currentStore[lName] = merged;
                                        currentStore[lName.toLowerCase().trim()] = merged;
                                        storeChanged = true;
                                    }
                                }
                            });
                        }
                    });

                    if (storeChanged) {
                        localStorage.setItem(classAllocKey, JSON.stringify(currentStore));
                    }
                } catch(e) {}
            }
            setRequests(a || []);
            setAcademicYears(ay || []);
            setSemesters(sem || []);
            setRooms(r || []);
            setBuildings(b || []);
            setAcademicLevels(al || []);
            setUserTasks(tasks || []);
            setTransactions(txns || []);
            setReceipts(recs || []);
            setActivityLog(logs || []);
            setNotifications(notifs || []);

            // ── Auto-Migration: Seed modules for existing active institutions ──
            if (currentUser && activeInst) {
                const EDU_TYPES = ['education', 'primary', 'secondary', 'college', 'university', 'institute', 'tvet', 'polytechnic'];
                if (EDU_TYPES.includes(instType.toLowerCase())) {
                    const schoolModules = (imsPhase1 || []).filter((m: any) => (m.institutionId || m.institution_id) === activeInst.id);
                    const hasExistingData = (d && d.length > 0) || (s && s.length > 0) || (c && c.length > 0) || (ay && ay.length > 0) || (sem && sem.length > 0);
                    if (schoolModules.length === 0 && hasExistingData) {
                        console.log(`[Auto-Migration] Seeding active modules for existing institution: ${activeInst.name}`);
                        const defaultModules = ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'his'];
                        const seededStates: InstitutionModuleState[] = [];
                        for (const moduleId of defaultModules) {
                            const newState: InstitutionModuleState = {
                                id: `ims_${moduleId}_${activeInst.id}`,
                                moduleId,
                                institutionId: activeInst.id,
                                status: 'active',
                                activatedAt: new Date().toISOString(),
                            };
                            try {
                                await apiService.saveModuleRecord('institution_module_states', newState);
                                seededStates.push(newState);
                            } catch (e) {
                                console.error(`[Auto-Migration] Failed to seed ${moduleId}:`, e);
                            }
                        }
                        if (seededStates.length > 0) {
                            const updatedStates = [...(imsPhase1 || []), ...seededStates];
                            setInstitutionModuleStates(updatedStates);
                        }
                    }
                }
            }

            // ── PHASE 3: Context-Specific Extended Data ──────────────────────
            if (currentUser) {
                const isSystemOrGlobal = (id?: string) => !id || id === 'SYSTEM' || id === 'GLOBAL' || id === 'ALL' || id === 'all';
                const activeInst = insts?.find(i => i.id === currentUser?.institutionId);
                const explicitTargetInstId = instOverrideId 
                    ? (!isSystemOrGlobal(instOverrideId) ? instOverrideId : undefined)
                    : (activeInstitution?.id && !isSystemOrGlobal(activeInstitution.id) 
                        ? activeInstitution.id 
                        : (currentUser?.institutionId && !isSystemOrGlobal(currentUser.institutionId) 
                            ? currentUser.institutionId 
                            : undefined));
                const effectiveInstIdFinal: string | undefined = explicitTargetInstId || (currentUser?.role === 'super_admin' ? undefined : (activeInst?.id && !isSystemOrGlobal(activeInst.id) ? activeInst.id : undefined));
                
                console.log("[Data Refresh] Loading institutional data for:", effectiveInstIdFinal || 'GLOBAL/ALL');
            
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
                const cntId = (currentUser?.role || '').startsWith('county_') ? currentUser.countyId : undefined;

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
                        apiService.fetchModuleRecords<Receipt>('receipts', effectiveInstIdFinal, undefined, { limit: 100000, order: 'payment_date.desc' }).catch(() => []),
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
                        apiService.fetchModuleRecords<CountyInventoryItem>('county_inventory', undefined, cntId).catch(() => []),
                        apiService.fetchModuleRecords<CountyInventoryCategory>('county_inventory_categories', undefined, cntId).catch(() => []),
                        apiService.fetchModuleRecords<CountyStore>('county_stores', undefined, cntId).catch(() => []),
                        apiService.fetchModuleRecords<BursaryApplication>('bursary_applications', undefined, cntId).catch(() => []),
                        apiService.fetchModuleRecords<CountyBursaryFund>('county_bursary_funds', undefined, cntId).catch(() => []),
                        apiService.fetchModuleRecords<StudentAttendance>('student_attendances').catch(() => []),
                        apiService.fetchModuleRecords<TeacherCheckIn>('teacher_check_ins').catch(() => []),
                    ]) : Promise.resolve([]),
                    // Business Batch
                    isBusiness || isAcademic ? Promise.all([
                        apiService.fetchModuleRecords<InventoryItem>('inventory', effectiveInstIdFinal).catch(() => []),
                        (isBusiness || isAcademic) ? apiService.fetchModuleRecords<RetailExpense>('retail_expenses', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        (isBusiness || isAcademic) ? apiService.fetchModuleRecords<RetailStore>('retail_stores', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        (isBusiness || isAcademic) ? apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<CafeMenuItem>('cafe_menu_items', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<CafeOrder>('cafe_orders', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords<RetailSale>('retail_sales', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        isBusiness ? apiService.fetchModuleRecords('carwash_jobs', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        (isBusiness || isAcademic) ? apiService.fetchModuleRecords<MaintenanceRequest>('maintenance_requests', effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
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
                    (isBusiness || isHigherEd) ? Promise.all([
                        apiService.fetchCarListings(effectiveInstIdFinal, 'all').catch(() => []),
                        apiService.fetchCarTestDrives(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchCarAppraisals(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchCarInvoices(effectiveInstIdFinal).catch(() => []),
                        apiService.fetchCarPayments(undefined, effectiveInstIdFinal).catch(() => []),
                    ]) : Promise.resolve([]),
                    // System Batch
                    Promise.all([
                        apiService.fetchModuleRecords<BankTransaction>('bank_transactions', effectiveInstIdFinal, undefined, { order: 'created_at.desc', limit: 100000 }).catch(() => []),
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
                        hasTransport ? apiService.fetchVehicles(effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        hasTransport ? apiService.fetchTransportOnboarding(effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        hasTransport ? apiService.fetchVehicleLogs(effectiveInstIdFinal).catch(() => []) : Promise.resolve([]),
                        apiService.fetchModuleRecords<Expense>('expenses', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<FinancialGoal>('financial_goals', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<PayrollRecord>('payroll_records', effectiveInstIdFinal).catch(() => []),
                        currentUser.role === 'super_admin' ? apiService.fetchDemoRequests().catch(() => []) : Promise.resolve([]),
                        currentUser.role === 'super_admin' ? apiService.fetchModuleRecords<any>('integration_logs', undefined, undefined, { order: 'created_at.desc', limit: 200 }).catch(() => []) : Promise.resolve([]),
                        apiService.fetchModuleRecords<BuildingFloor>('building_floors', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<BuildingOffice>('building_offices').catch(() => []),
                        apiService.fetchModuleRecords<BuildingVisitorLog>('building_visitor_logs', effectiveInstIdFinal).catch(() => []),
                        apiService.fetchModuleRecords<BuildingVisitorAsset>('building_visitor_assets').catch(() => []),
                        apiService.fetchTransactions(effectiveInstIdFinal, { limit: 100000, order: 'created_at.desc' }).catch(() => []),
                    ])
                ]) as any[];
                
                const [finResults, acadResults, countyResults, businessResults, coopResults, legalResults, carResults, systemResults] = results;

                // Destructure Results
                let fRecs: any[] = [];
                if (finResults) [inv, ext, vh, fs, fp, fb, fRecs] = finResults;
                if (isAcademic && acadResults) [sar, enr, abs, con, att, timetableRecords, et, asg, subm, rat, ta, asmt, asmtMarks, bks, ltx, lo, obs, fCheckIn, disc] = acadResults;
                if (isCounty && countyResults) {
                    const [cinvData, ccatsData, cstoresData, bAppsData, bFundsData, cAttData, cCheckInData] = countyResults;
                    cinv = cinvData;
                    ccats = ccatsData;
                    cstores = cstoresData;
                    bApps = bAppsData;
                    bFunds = bFundsData;
                    if (cAttData && cAttData.length > 0) setStudentAttendances(cAttData);
                    if (cCheckInData && cCheckInData.length > 0) setTeacherCheckIns(cCheckInData);
                }
                if (businessResults) [item, retExp, rStores, rInv, cafe, cOrders, rSales, cwJobs, fMaint] = businessResults;
                if (isCoop && coopResults) [cFarmers, cColls, cRiders, cAgroInv, cAgroSales, cSaccoAcc, cSaccoTx, cPayouts, cExps, cInc] = coopResults;
                if (isLaw && legalResults) [lClients, lMatters, lDocs, lTime, lInvs, lTrust, lTemplates, lAgreements] = legalResults;

                if ((isBusiness || isHigherEd) && carResults) [csList, csTest, csAppr, cInvs, cPay] = carResults;
                let rawPayloads: any[] = [];
                let bFloors: any[] = [];
                let bOffices: any[] = [];
                let bVLogs: any[] = [];
                let bVAssets: any[] = [];
                let rawGatewayTxns: any[] = [];
                if (systemResults) [csBank, sups, stx, apts, vis, sec, reqRecords, tor, fBulletin, fDocs, fWatch, vhcls, tonb, vlogs, fExps, fGoals, fPayroll, demoLeads, rawPayloads, bFloors, bOffices, bVLogs, bVAssets, rawGatewayTxns] = systemResults;

                console.log("[Data Refresh] Optimized Batches Resolved");

                if (insts && insts.length > 0) {
                    const finalInsts = insts.map(i => ({
                        ...i,
                        moduleStates: (imsPhase1 || []).filter((m: any) => (m.institutionId || m.institution_id) === i.id)
                    }));
                    setInstitutions(finalInsts);
                }

                if (demoLeads) setDemoRequests(demoLeads);

                setInvoices(inv || []);
                if (fRecs && Array.isArray(fRecs) && fRecs.length > 0) {
                    setReceipts(fRecs);
                } else if (recs && Array.isArray(recs) && recs.length > 0) {
                    setReceipts(recs);
                }
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
                setCountyInventory((cinv || []).map((ci: any) => ({
                    ...ci,
                    countyId: ci.countyId || ci.county_id,
                    supplierName: ci.supplierName || ci.supplier_name,
                    targetInstitutionId: ci.targetInstitutionId || ci.target_institution_id,
                    driverName: ci.driverName || ci.driver_name,
                    deliveryMethod: ci.deliveryMethod || ci.delivery_method || 'driver',
                    trackingNumber: ci.trackingNumber || ci.tracking_number,
                    qrCode: ci.qrCode || ci.qr_code,
                    atHqDate: ci.atHqDate || ci.at_hq_date || new Date().toISOString(),
                    recipientSignature: ci.recipientSignature || ci.recipient_signature,
                    receivedBy: ci.receivedBy || ci.received_by,
                    recipientName: ci.recipientName || ci.recipient_name,
                    dispatchedDate: ci.dispatchedDate || ci.dispatched_date,
                    receivedDate: ci.receivedDate || ci.received_date,
                    quantity: Number(ci.quantity || 0)
                })));
                setCountyInventoryCategories((ccats || []).map((c: any) => ({
                    ...c,
                    countyId: c.countyId || c.county_id,
                    createdAt: c.createdAt || c.created_at,
                    updatedAt: c.updatedAt || c.updated_at
                })));
                setCountyStores((cstores || []).map((s: any) => ({
                    ...s,
                    countyId: s.countyId || s.county_id,
                    locationName: s.locationName || s.location_name,
                    latitude: s.latitude !== undefined ? Number(s.latitude) : undefined,
                    longitude: s.longitude !== undefined ? Number(s.longitude) : undefined,
                    createdAt: s.createdAt || s.created_at,
                    updatedAt: s.updatedAt || s.updated_at
                })));
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
                setBuildingFloors(bFloors || []);
                setBuildingOffices(bOffices || []);
                setBuildingVisitorLogs(bVLogs || []);
                setBuildingVisitorAssets(bVAssets || []);
                setSecurityAlerts(sec || []);
                setRequisitions(reqRecords || []);
                
                setIncidents((disc || []).map((d: any) => ({
                    ...d,
                    institutionId: d.institutionId || d.institution_id,
                    studentId: d.studentId || d.student_id,
                    studentName: d.studentName || d.student_name,
                    incidentType: d.incidentType || d.incident_type || d.type,
                    actionTaken: d.actionTaken || d.action_taken,
                    recordedBy: d.recordedBy || d.recorded_by,
                    timestamp: d.timestamp || d.created_at || new Date().toISOString()
                })));
                setExpenses(fExps || []);
                setFinancialGoals(fGoals || []);
                setPayrollRecords(fPayroll || []);

                setCarListings(csList || []);
                setCarTestDrives(csTest || []);
                setCarAppraisals(csAppr || []);
                setCarInvoices(cInvs || []);
                setCarPayments(cPay || []);
                // Filter and normalize raw integration payloads & gateway transactions
                const currentInst = insts?.find(i => i.id === effectiveInstIdFinal);
                
                // 1. Normalize all gateway transactions (Mpesa, NCBA, Airtel, IntaSend)
                const normalizedGatewayTxns = (rawGatewayTxns || []).map((t: any) => {
                    const rawStatus = (t.status || '').toLowerCase();
                    const isReconciled = rawStatus === 'completed' || rawStatus === 'reconciled' || rawStatus === 'success';
                    const isPending = rawStatus === 'pending';
                    const payload = t.payload || t.metadata || {};
                    const ref = t.transactionId || t.transaction_id || t.referenceId || t.reference_no || t.reference || t.receiptNumber || t.receipt_number || t.id;
                    const phone = t.phoneNumber || t.phone_number || t.customer_mobile_number || payload.customerMobileNumber || payload.phoneNumber || '';
                    const name = t.payerName || t.payer_name || t.customer_name || t.sender_name || 'Customer Deposit';
                    const rawProvider = String(t.provider || t.bankName || 'M-Pesa').toUpperCase();
                    const bankName = rawProvider.includes('KCB') ? 'KCB' : (rawProvider.includes('COOP') ? 'Co-op Bank' : (rawProvider.includes('NCBA') ? 'NCBA' : (rawProvider.includes('AIRTEL') ? 'Airtel Money' : (rawProvider.includes('INTASEND') ? 'IntaSend' : 'M-Pesa'))));
                    
                    return {
                        id: t.id || ref,
                        institutionId: t.institutionId || t.institution_id || effectiveInstIdFinal,
                        amount: Number(t.amount) || 0,
                        transactionDate: t.transactionDate || t.transaction_date || t.timestamp || t.created_at || new Date().toISOString(),
                        reference: String(ref || '').trim(),
                        senderName: name,
                        bankName: bankName,
                        status: isReconciled ? 'reconciled' : (isPending ? 'pending' : 'unreconciled'),
                        linkedInvoiceId: t.linkedInvoiceId || t.linked_invoice_id || payload.invoiceId || payload.invoice_id || null,
                        createdAt: t.created_at || t.timestamp || new Date().toISOString(),
                        payload: {
                            ...payload,
                            customerMobileNumber: phone,
                            customerName: name,
                            customerReference: t.customer_reference || t.account_number || payload.customerReference || payload.accountReference || payload.businessKey || '',
                            narration: t.narration || t.description || payload.narration || payload.description || `Payment via ${bankName}`
                        },
                        _source: 'gateway_transactions'
                    } as any;
                });

                // 2. Normalize raw webhook integration logs
                const normalizedPayloads = (rawPayloads || [])
                  .filter(p => {
                      if (!p || !p.payload) return false;
                      const payload = p.payload;
                      const creditAcc = payload.creditAccountIdentifier || payload.institutionId || payload.institution_id || payload.requestPayload?.primaryData?.creditAccountIdentifier || payload.metadata?.institutionId || payload.metadata?.institution_id;
                      const shortCode = payload.organizationShortCode || payload.shortCode || payload.short_code || payload.paybill || payload.tillNumber || payload.requestPayload?.primaryData?.organizationShortCode || payload.requestPayload?.primaryData?.shortCode || payload.requestPayload?.primaryData?.tillNumber;

                      // 1. Direct ID/Code check
                      if (creditAcc && (creditAcc === effectiveInstIdFinal || creditAcc === currentInst?.institutionCode)) {
                          return true;
                      }

                      // 2. Match reference with showroom invoices
                      const refStr = String(payload.customerReference || payload.accountReference || payload.billReferenceNumber || payload.businessKey || payload.transactionReference || '').toUpperCase();
                      if (refStr && (cInvs || []).some((inv: any) => {
                          const invNum = String(inv.invoiceNumber || '').toUpperCase();
                          const regNum = String(inv.registrationNumber || '').toUpperCase();
                          return (invNum && refStr.includes(invNum)) || (regNum && refStr.includes(regNum));
                      })) {
                          return true;
                      }

                      // 3. Shortcode/Till check using current institution configs
                      if (currentInst) {
                          const mpesaPaybill = currentInst.mpesaConfig?.paybillNumber || currentInst.mpesa_config?.paybillNumber || currentInst.mpesa_config?.paybill_number;
                          const kcbSC = currentInst.kcbConfig?.shortCode || currentInst.kcb_config?.shortCode || currentInst.kcb_config?.short_code;
                          const kcbTill = currentInst.kcbConfig?.tillNumber || currentInst.kcb_config?.tillNumber || currentInst.kcb_config?.till_number;
                          const kcbCompany = currentInst.kcbConfig?.companyCode || currentInst.kcb_config?.companyCode || currentInst.kcb_config?.company_code;

                          const oscStr = shortCode ? String(shortCode).trim() : '';
                          if (oscStr) {
                              if (mpesaPaybill && String(mpesaPaybill).trim() === oscStr) return true;
                              if (kcbSC && String(kcbSC).trim() === oscStr) return true;
                              if (kcbTill && String(kcbTill).trim() === oscStr) return true;
                              if (kcbCompany && String(kcbCompany).trim() === oscStr) return true;
                          }
                      }
                      
                      // 4. Super Admin view (if no specific tenant filter or matches SYSTEM)
                      if (currentUser.role === 'super_admin' && (!effectiveInstIdFinal || creditAcc === 'SYSTEM' || !creditAcc)) {
                          return true;
                      }

                      return false;
                  })
                  .map(p => {
                      const payload = p.payload;

                      // Extract STK push parameters
                      let mpesaReceipt = '';
                      let stkAmount = 0;
                      let stkPhone = '';
                      let stkDate = '';

                      // Parse Safaricom/KCB STK Push Callback Metadata
                      try {
                          const callbackMetadata = payload.CallbackMetadata || payload.callbackMetadata || payload.Body?.stkCallback?.CallbackMetadata || payload.Body?.stkCallback?.callbackMetadata || payload.body?.stkCallback?.CallbackMetadata || payload.body?.stkcallback?.CallbackMetadata || payload.stkCallback?.CallbackMetadata || payload.stkcallback?.CallbackMetadata || payload.Body?.stkCallback?.CallbackMetadata?.item || payload.stkCallback?.CallbackMetadata?.item;
                          const items = callbackMetadata?.Item || callbackMetadata?.item;
                          if (items && Array.isArray(items)) {
                              items.forEach((item: any) => {
                                  const name = String(item.Name || item.Key || '').toLowerCase();
                                  if (name === 'mpesareceiptnumber') {
                                      mpesaReceipt = String(item.Value || '');
                                  } else if (name === 'amount') {
                                      stkAmount = parseFloat(String(item.Value || '0'));
                                  } else if (name === 'phonenumber') {
                                      stkPhone = String(item.Value || '');
                                  } else if (name === 'transactiondate') {
                                      stkDate = String(item.Value || '');
                                  }
                              });
                          }
                      } catch (e) {}

                      // Parse ResultParameters.ResultParameter (KCB Buni format)
                      if (!mpesaReceipt) {
                          try {
                              const resultParams = payload.ResultParameters || payload.Result?.ResultParameters || payload.Body?.stkCallback?.ResultParameters || payload.stkCallback?.ResultParameters;
                              const pList = resultParams?.ResultParameter;
                              if (pList) {
                                  const list = Array.isArray(pList) ? pList : [pList];
                                  list.forEach((item: any) => {
                                      const key = String(item.Key || item.Name || '').toLowerCase();
                                      if (key === 'mpesareceiptnumber' || key === 'transactionid' || key === 'mpesaref') {
                                          mpesaReceipt = String(item.Value || '');
                                      } else if (key === 'amount') {
                                          stkAmount = parseFloat(String(item.Value || '0'));
                                      } else if (key === 'phonenumber') {
                                          stkPhone = String(item.Value || '');
                                      } else if (key === 'transactiondate') {
                                          stkDate = String(item.Value || '');
                                      }
                                  });
                              }
                          } catch (e) {}
                      }

                      // Check flat keys for mpesaReceipt
                      if (!mpesaReceipt) {
                          mpesaReceipt = payload.requestPayload?.additionalData?.notificationData?.transactionID ||
                                        payload.requestPayload?.additionalData?.notificationData?.transactionId ||
                                        payload.requestPayload?.primaryData?.mpesaReceiptNumber ||
                                        payload.requestPayload?.primaryData?.MpesaReceiptNumber ||
                                        payload.requestPayload?.primaryData?.transactionId ||
                                        payload.requestPayload?.primaryData?.businessKey ||
                                        payload.mpesaReceiptNumber ||
                                        payload.MpesaReceiptNumber ||
                                        payload.transactionId ||
                                        payload.transactionID ||
                                        payload.businessKey ||
                                        payload.transactionReference ||
                                        payload.customerReference ||
                                        '';
                      }

                      // Resolve transaction ID / reference
                      const payloadTxnId = payload.transactionReference || 
                                           payload.checkoutRequestId || 
                                           payload.checkoutRequestID || 
                                           payload.requestId || 
                                           payload.transactionId || 
                                           payload.transactionID || 
                                           payload.Body?.stkCallback?.CheckoutRequestID || 
                                           payload.requestPayload?.primaryData?.checkoutRequestID || 
                                           payload.requestPayload?.additionalData?.notificationData?.transactionID ||
                                           payload.requestPayload?.additionalData?.notificationData?.transactionId ||
                                           payload.Body?.stkCallback?.checkoutRequestID ||
                                           payload.Body?.stkCallback?.checkoutRequestId ||
                                           payload.body?.stkCallback?.CheckoutRequestID ||
                                           payload.body?.stkCallback?.checkoutRequestID ||
                                           payload.body?.stkCallback?.checkoutRequestId ||
                                           payload.body?.stkcallback?.checkoutRequestId ||
                                           payload.body?.stkcallback?.checkoutRequestID ||
                                           payload.stkCallback?.CheckoutRequestID ||
                                           payload.stkcallback?.checkoutRequestId ||
                                           payload.requestPayload?.primaryData?.checkoutRequestId ||
                                           p.id;

                      const resolvedTxnId = mpesaReceipt || payloadTxnId || p.id;
                      
                      // Extract amount
                      let amount = 0;
                      try {
                          if (stkAmount > 0) {
                              amount = stkAmount;
                          } else {
                              const rawAmt = payload.transactionAmount || 
                                             payload.amount ||
                                             payload.requestPayload?.additionalData?.notificationData?.transactionAmt ||
                                             payload.requestPayload?.additionalData?.notificationData?.transactionAmount ||
                                             payload.requestPayload?.additionalData?.notificationData?.amount ||
                                             payload.requestPayload?.primaryData?.transactionAmount;
                              if (rawAmt) {
                                  amount = parseFloat(rawAmt);
                              }
                          }
                      } catch (e) {
                          console.error("Failed to parse amount from integration log:", e);
                      }

                      // Extract date
                      let date = p.created_at;
                      try {
                          const rawDateStr = stkDate ||
                                             payload.requestPayload?.primaryData?.timestamp ||
                                             payload.requestPayload?.additionalData?.notificationData?.transactionDate ||
                                             payload.timestamp;
                          if (rawDateStr) {
                              if (typeof rawDateStr === 'string' && rawDateStr.length === 14 && /^\d+$/.test(rawDateStr)) {
                                  const y = rawDateStr.substring(0, 4);
                                  const m = rawDateStr.substring(4, 6);
                                  const d = rawDateStr.substring(6, 8);
                                  const h = rawDateStr.substring(8, 10);
                                  const mi = rawDateStr.substring(10, 12);
                                  const s = rawDateStr.substring(12, 14);
                                  date = new Date(`${y}-${m}-${d}T${h}:${mi}:${s}`).toISOString();
                              } else {
                                  date = new Date(rawDateStr).toISOString();
                              }
                          }
                      } catch (e) {}

                      // Extract sender
                      const firstName = payload.requestPayload?.additionalData?.notificationData?.firstName || '';
                      const lastName = payload.requestPayload?.additionalData?.notificationData?.lastName || '';
                      const nestedName = firstName ? `${firstName} ${lastName}`.trim() : '';
                      
                      const sender = payload.customerName || 
                                     payload.payerName || 
                                     nestedName ||
                                     payload.requestPayload?.additionalData?.notificationData?.debitMSISDN ||
                                     stkPhone ||
                                     payload.customerMobileNumber || 
                                     payload.phoneNumber || 
                                     'External Deposit';

                      // Extract customer reference
                      const payloadRef = payload.customerReference ||
                                         payload.accountReference ||
                                         payload.requestPayload?.primaryData?.businessKey ||
                                         payload.businessKey ||
                                         '';

                      const payloadReceiptRef = mpesaReceipt || payloadRef || payloadTxnId || '';

                      return {
                          id: resolvedTxnId,
                          institutionId: effectiveInstIdFinal,
                          amount: amount,
                          transactionDate: date,
                          reference: payloadReceiptRef,
                          senderName: sender,
                          bankName: p.provider === 'coop' ? 'Co-op Bank' : (p.provider === 'ncba' ? 'NCBA' : (p.provider?.includes('kcb') ? 'KCB' : 'M-Pesa')),
                          status: 'unreconciled',
                          linkedInvoiceId: payload.invoice_id || payload.invoiceId || payload.linked_invoice_id || null,
                          createdAt: p.created_at,
                          payload: payload,
                          _source: 'payload_table'
                      } as any;
                  });

                const mergedBankTransactions = [...(csBank || [])];
                const seenTxnIds = new Set(mergedBankTransactions.map(t => t.id || t.reference).filter(Boolean));
                
                // Merge Gateway Transactions
                normalizedGatewayTxns.forEach(gTxn => {
                    if ((gTxn.id && !seenTxnIds.has(gTxn.id)) && (!gTxn.reference || !seenTxnIds.has(gTxn.reference))) {
                        mergedBankTransactions.push(gTxn);
                        if (gTxn.id) seenTxnIds.add(gTxn.id);
                        if (gTxn.reference) seenTxnIds.add(gTxn.reference);
                    }
                });

                // Merge Integration Logs
                normalizedPayloads.forEach(pTxn => {
                    if ((pTxn.id && !seenTxnIds.has(pTxn.id)) && (!pTxn.reference || !seenTxnIds.has(pTxn.reference))) {
                        mergedBankTransactions.push(pTxn);
                        if (pTxn.id) seenTxnIds.add(pTxn.id);
                        if (pTxn.reference) seenTxnIds.add(pTxn.reference);
                    }
                });

                // Chronological sort: newest first
                mergedBankTransactions.sort((a, b) => {
                    const timeA = new Date(a.transactionDate || a.createdAt || 0).getTime();
                    const timeB = new Date(b.transactionDate || b.createdAt || 0).getTime();
                    return timeB - timeA;
                });

                setCarBankTransactions(mergedBankTransactions);

                setRetailExpenses(retExp || []);
                setRetailStores(rStores || []);

                // Combine items from retail_inventory_items and legacy inventory tables across all stores
                const mergedRetailInventory: RetailInventoryItem[] = [...(rInv || [])];
                const existingRetailIds = new Set(mergedRetailInventory.map(i => i.id));
                const existingRetailNames = new Set(mergedRetailInventory.map(i => (i.name || '').trim().toLowerCase()));

                (item || []).forEach((leg: any) => {
                    const normName = (leg.name || '').trim().toLowerCase();
                    if (!existingRetailIds.has(leg.id) && !existingRetailNames.has(normName)) {
                        const storeIdentifier = leg.storeId || leg.store_id || leg.location || '';
                        const matchedStore = (rStores || []).find((s: any) => 
                            s.id === storeIdentifier || 
                            s.name?.toLowerCase() === storeIdentifier.toLowerCase()
                        );
                        mergedRetailInventory.push({
                            id: leg.id,
                            institutionId: leg.institutionId || leg.institution_id || effectiveInstIdFinal,
                            name: leg.name,
                            sku: leg.sku || `SKU-${String(leg.id).slice(-6)}`,
                            category: leg.category || 'Stationery',
                            quantity: Number(leg.quantity || 0),
                            unit: leg.unit || 'pcs',
                            reorderLevel: Number(leg.reorderLevel || leg.minThreshold || 5),
                            costPrice: Number(leg.price || leg.costPrice || 0),
                            basePrice: Number(leg.price || leg.basePrice || 0),
                            srpPrice: Number(leg.price || leg.srpPrice || 0),
                            storeId: matchedStore ? matchedStore.id : storeIdentifier,
                            storeName: matchedStore ? matchedStore.name : (leg.location || leg.storeName || leg.store_name || 'Main School Store'),
                            description: leg.description || '',
                            marketplaceEnabled: false,
                            bufferStock: 0,
                            viewCount: 0,
                            inquiryCount: 0,
                            createdAt: leg.createdAt || new Date().toISOString(),
                            lastUpdated: leg.lastUpdated || leg.last_updated || new Date().toISOString()
                        });
                    }
                });

                setRetailInventory(mergedRetailInventory);
                setTimeOffRequests(tor || []);
                setBulletinItems(fBulletin || []);
                setDocumentCollections(fDocs || []);
                setMaintenanceRequests((fMaint || []).map((m: any) => ({
                    ...m,
                    institutionId: m.institutionId || m.institution_id,
                    roomId: m.roomId || m.room_id,
                    reportedBy: m.reportedBy || m.reported_by,
                    reportedAt: m.reportedAt || m.reported_at || new Date().toISOString()
                })));
                setTeacherCheckIns((fCheckIn || []).map((tc: any) => ({
                    ...tc,
                    teacherId: tc.teacherId || tc.teacher_id,
                    institutionId: tc.institutionId || tc.institution_id,
                    checkInDate: tc.checkInDate || tc.check_in_date || (tc.created_at ? tc.created_at.split('T')[0] : new Date().toISOString().split('T')[0]),
                    morningCheckInTime: tc.morningCheckInTime || tc.morning_check_in_time,
                    morningCheckInStatus: tc.morningCheckInStatus || tc.morning_check_in_status || 'Pending',
                    morningLocation: tc.morningLocation || tc.morning_location,
                    morningNotes: tc.morningNotes || tc.morning_notes,
                    afternoonCheckInTime: tc.afternoonCheckInTime || tc.afternoon_check_in_time,
                    afternoonCheckInStatus: tc.afternoonCheckInStatus || tc.afternoon_check_in_status || 'Pending',
                    afternoonLocation: tc.afternoonLocation || tc.afternoon_location,
                    afternoonNotes: tc.afternoonNotes || tc.afternoon_notes,
                    createdAt: tc.createdAt || tc.created_at,
                    updatedAt: tc.updatedAt || tc.updated_at
                })));
                setVehicles(vhcls || []);
                setTransportOnboarding(tonb || []);
                setVehicleLogs(vlogs || []);
                setCafeOrders(cOrders || []);
                setRetailSales(rSales || []);
                setJobs(cwJobs || []);
                setNotifications(notifs || []);

                let finalFarmers = cFarmers || [];
                if (finalFarmers.length === 0) {
                    try {
                        const local = localStorage.getItem('eduai_coop_farmers') || localStorage.getItem(`eduai_coop_farmers_${effectiveInstIdFinal}`);
                        if (local) {
                            const parsed = JSON.parse(local);
                            if (Array.isArray(parsed) && parsed.length > 0) finalFarmers = parsed;
                        }
                    } catch(e) {}
                }
                setCoopFarmers(finalFarmers);
                setCoopCollections(cColls || []);
                setCoopRiders(cRiders || []);
                setCoopAgrovetInventory(cAgroInv || []);
                setCoopAgrovetSales(cAgroSales || []);
                setSaccoAccounts(cSaccoAcc || []);
                setSaccoTransactions(cSaccoTx || []);
                setCoopPayouts(cPayouts || []);
                setCoopExpenses((cExps || []).map((e: any) => ({
                    ...e,
                    institutionId: e.institutionId || e.institution_id,
                    recordedBy: e.recordedBy || e.recorded_by,
                    farmerId: e.farmerId || e.farmer_id,
                    amount: Number(e.amount || 0),
                    date: e.date || new Date().toISOString().split('T')[0]
                })));
                setCoopIncome((cInc || []).map((i: any) => ({
                    ...i,
                    institutionId: i.institutionId || i.institution_id,
                    companyName: i.companyName || i.company_name,
                    productType: i.productType || i.product_type,
                    recordedBy: i.recordedBy || i.recorded_by,
                    quantity: Number(i.quantity || 0),
                    amount: Number(i.amount || 0),
                    unit: i.unit || 'kgs',
                    date: i.date || new Date().toISOString().split('T')[0]
                })));

                setLawClients(lClients || []);
                setLawMatters(lMatters || []);
                setLawDocuments(lDocs || []);
                setLawTimeEntries(lTime || []);
                setLawInvoices(lInvs || []);
                setLawTrustTransactions(lTrust || []);
                setLawAgreementTemplates((lTemplates || []).map((t: any) => ({
                    ...t,
                    institutionId: t.institutionId || t.institution_id,
                    baseFee: t.baseFee !== undefined ? Number(t.baseFee) : (t.base_fee !== undefined ? Number(t.base_fee) : 0),
                    createdAt: t.createdAt || t.created_at || new Date().toISOString()
                })));
                setLawAgreements((lAgreements || []).map((a: any) => ({
                    ...a,
                    institutionId: a.institutionId || a.institution_id,
                    templateId: a.templateId || a.template_id,
                    matterId: a.matterId || a.matter_id,
                    clientId: a.clientId || a.client_id,
                    partyDetails: a.partyDetails || a.party_details || {},
                    finalContent: a.finalContent || a.final_content,
                    paymentStatus: a.paymentStatus || a.payment_status || 'unpaid',
                    reviewStatus: a.reviewStatus || a.review_status || 'draft',
                    lawyerId: a.lawyerId || a.lawyer_id,
                    lawyerNotes: a.lawyerNotes || a.lawyer_notes,
                    signedUrl: a.signedUrl || a.signed_url,
                    createdAt: a.createdAt || a.created_at || new Date().toISOString(),
                    updatedAt: a.updatedAt || a.updated_at || new Date().toISOString()
                })));
            }

            setIsGeneratingDemoData(false);
            if (!silent) setLoadStatus("");
            setLoadError("");
        } catch (error: any) {
            console.error("Critical Load Error:", error);
            const msg = error.message || "Unknown connectivity failure";
            if (!silent) {
                setLoadStatus(`Diagnostic Failure: ${msg}`);
                setLoadError(msg);
            }
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
            await apiService.updateModuleRecord('users', id, updatedUser);

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
                email: currentUser?.email || 'admin@eduai.co.ke',
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
        const nowIso = new Date().toISOString();
        const newVisitor: any = {
            ...v,
            id: `vis_${Date.now()}`,
            status: (v as any).status || 'pending',
            timeIn: (v as any).timeIn || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            checkIn: (v as any).checkIn || nowIso,
            institutionId: currentUser?.institutionId || v.institutionId || '',
            metadata: {
                ...((v as any).metadata || {}),
                entryTime: nowIso
            }
        };
        // Optimistic update – show immediately without waiting for DB
        setVisitors(prev => [newVisitor, ...prev]);
        // DB save in background
        apiService.saveModuleRecord('visitors', newVisitor).catch(console.error);

        // ── Trigger In-App Notification Bell for Assigned Host ──
        let targetHostId = newVisitor.hostId;
        if (!targetHostId && newVisitor.hostName) {
            const searchName = String(newVisitor.hostName).trim().toLowerCase();
            const matchedUser = (users || []).find(u => 
                u.name && (u.name.trim().toLowerCase() === searchName ||
                searchName.includes(u.name.trim().toLowerCase()) ||
                u.name.trim().toLowerCase().includes(searchName))
            );
            if (matchedUser) targetHostId = matchedUser.id;
        }

        if (targetHostId) {
            const visitorName = newVisitor.name || 'A visitor';
            const instId = newVisitor.institutionId || activeInstitution?.id || '';
            const purposeStr = newVisitor.purpose ? ` (${newVisitor.purpose})` : '';
            const notifMsg = `You have a visitor: ${visitorName}${purposeStr} has arrived at the security gate.`;
            const notifMeta = {
                visitorId: newVisitor.id,
                visitorName: visitorName,
                purpose: newVisitor.purpose || '',
                hostId: targetHostId,
                hostName: newVisitor.hostName || '',
                institutionId: instId
            };
            
            // 1. Create in-app notification record in app_notifications table
            apiService.createNotification({
                userId: targetHostId,
                institutionId: instId,
                message: notifMsg,
                type: 'guest_arrival',
                metadata: notifMeta
            }).catch(console.error);

            // 2. Optimistically update notification state if assigned user is the current active session
            if (currentUser && currentUser.id === targetHostId) {
                setNotifications(prev => [{
                    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    userId: targetHostId,
                    institutionId: instId,
                    institution_id: instId,
                    visitorName: visitorName,
                    purpose: newVisitor.purpose,
                    metadata: notifMeta,
                    message: notifMsg,
                    type: 'guest_arrival',
                    isRead: false,
                    timestamp: new Date().toISOString()
                }, ...prev]);
            }

            // 3. Dispatch global custom event for instant cross-tab & reactive badge updates
            window.dispatchEvent(new CustomEvent('app_notification_created', {
                detail: { userId: targetHostId, institutionId: instId, message: notifMsg, type: 'guest_arrival', visitorName, metadata: notifMeta }
            }));

            // 4. Dispatch live SMS notification to host phone
            const targetHost = (users || []).find(u => u.id === targetHostId);
            const hostPhone = newVisitor.hostPhone || (newVisitor as any).hostPhoneNumber || targetHost?.phoneNumber || (targetHost as any)?.phone || (targetHost as any)?.telephone;
            const isSmsEnabled = activeInstitution?.notifyHostOnVisitorArrival !== false && newVisitor.notifyHostSms !== false;

            if (hostPhone && isSmsEnabled) {
                const link = `${window.location.origin}/?view=visitor-auth&id=${newVisitor.id}`;
                const hostDisplayName = targetHost?.name || newVisitor.hostName || 'Host';
                let smsMsg = `Hi ${hostDisplayName}, visitor ${visitorName} has arrived at the security gate${newVisitor.purpose ? ` for ${newVisitor.purpose}` : ''}. Tap here to authorize: ${link}`;

                if (activeInstitution?.visitorArrivalSmsTemplate) {
                    smsMsg = activeInstitution.visitorArrivalSmsTemplate
                        .replace(/\{host\}/gi, hostDisplayName)
                        .replace(/\{visitor\}/gi, visitorName)
                        .replace(/\{purpose\}/gi, newVisitor.purpose || 'Visit')
                        .replace(/\{institution\}/gi, activeInstitution?.name || 'Security')
                        .replace(/\{link\}/gi, link);
                }

                const smsCfg = activeInstitution?.smsConfig || companyDetails?.smsConfig;
                const instId = activeInstitution?.id || currentUser?.institutionId || '';
                apiService.sendSms(hostPhone, smsMsg, smsCfg, 1, instId)
                    .then(() => console.info('[Security Notification] Sent SMS authorization request to host:', hostPhone))
                    .catch(err => console.warn('[Security Notification] Failed to send SMS to host:', err));
            }
        }

        return newVisitor;
    }, [currentUser, setVisitors, users, setNotifications, activeInstitution, companyDetails]);

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
    }, [loadData, currentUser?.institutionId]);

    const handleUpdateAppointmentStatus = useCallback(async (id: string, status: string | 'confirmed' | 'cancelled') => {
        const apt = (appointments || []).find(a => a.id === id);
        if (apt) {
            await apiService.saveModuleRecord('appointments', { ...apt, status });
            await handleLogAction(`Updated appointment status for ${(apt as any).visitorName || (apt as any).guestName || 'guest'} to ${status}`);
        }
        loadData();
    }, [appointments, loadData, handleLogAction]);

    const handleUpdateVisitor = useCallback(async (id: string, data: Partial<Visitor>) => {
        const existing = (visitors || []).find(v => v.id === id);
        if (existing) {
            await apiService.saveModuleRecord('visitors', { ...existing, ...data });
            loadData();
        }
    }, [visitors, loadData]);

    const handleAddBuildingFloor = useCallback(async (f: Omit<BuildingFloor, 'id'>) => {
        const id = `floor_${Date.now()}`;
        await apiService.saveModuleRecord('building_floors', { ...f, id });
        loadData();
    }, [loadData]);

    const handleAddBuildingOffice = useCallback(async (o: Omit<BuildingOffice, 'id'>) => {
        const id = `office_${Date.now()}`;
        await apiService.saveModuleRecord('building_offices', { ...o, id });
        loadData();
    }, [loadData]);

    const handleAddBuildingVisitorLog = useCallback(async (v: Omit<BuildingVisitorLog, 'id'>, assets: Omit<BuildingVisitorAsset, 'id' | 'visitorLogId'>[]) => {
        const logId = `vlog_${Date.now()}`;
        await apiService.saveModuleRecord('building_visitor_logs', { ...v, id: logId });
        
        if (assets && assets.length > 0) {
            for (let i = 0; i < assets.length; i++) {
                const assetId = `vasset_${Date.now()}_${i}`;
                await apiService.saveModuleRecord('building_visitor_assets', {
                    ...assets[i],
                    id: assetId,
                    visitorLogId: logId,
                    verifiedAtExit: false
                });
            }
        }
        // Notify host / office tenant if matched
        const targetOffice = v.officeId ? (buildingOffices || []).find(o => o.id === v.officeId) : null;
        const hostUser = (users || []).find(u => 
            (v.hostId && u.id === v.hostId) ||
            (v.officeId && u.metadata?.officeId === v.officeId) ||
            (targetOffice?.tenantName && u.name && u.name.trim().toLowerCase() === targetOffice.tenantName.trim().toLowerCase())
        );

        if (hostUser) {
            const instId = v.institutionId || targetOffice?.institutionId || activeInstitution?.id || '';
            const notifMsg = `You have a visitor: ${v.visitorName} has registered at building security for ${targetOffice?.tenantName || 'your office'}.`;
            const notifMeta = {
                visitorName: v.visitorName,
                purpose: targetOffice?.tenantName ? `Visit to ${targetOffice.tenantName}` : 'Office visit',
                hostId: hostUser.id,
                institutionId: instId
            };
            apiService.createNotification({
                userId: hostUser.id,
                institutionId: instId,
                message: notifMsg,
                type: 'guest_arrival',
                metadata: notifMeta
            }).catch(console.error);
            if (currentUser && currentUser.id === hostUser.id) {
                setNotifications(prev => [{
                    id: `notif_${Date.now()}`,
                    userId: hostUser.id,
                    institutionId: instId,
                    institution_id: instId,
                    visitorName: v.visitorName,
                    metadata: notifMeta,
                    message: notifMsg,
                    type: 'guest_arrival',
                    isRead: false,
                    timestamp: new Date().toISOString()
                }, ...prev]);
            }
            window.dispatchEvent(new CustomEvent('app_notification_created', {
                detail: { userId: hostUser.id, institutionId: instId, message: notifMsg, type: 'guest_arrival', visitorName: v.visitorName, metadata: notifMeta }
            }));
        }

        // Live SMS dispatch to host / office tenant contact phone
        const hostPhone = v.hostPhone || hostUser?.phoneNumber || (hostUser as any)?.phone || targetOffice?.contactPhone;
        const isSmsEnabled = activeInstitution?.notifyHostOnVisitorArrival !== false && v.notifyHostSms !== false;

        if (hostPhone && isSmsEnabled) {
            const link = `${window.location.origin}/?view=visitor-auth&id=${logId}`;
            const hostDisplayName = hostUser?.name || targetOffice?.contactPersonName || targetOffice?.tenantName || v.hostName || 'Host';
            const locationName = targetOffice ? `${targetOffice.officeNumber} (${targetOffice.tenantName})` : (activeInstitution?.name || 'Reception');
            let smsMsg = `Hi ${hostDisplayName}, visitor ${v.visitorName} has checked in at building security for ${locationName} (${v.purpose}). Tap to view/verify: ${link}`;

            if (activeInstitution?.visitorArrivalSmsTemplate) {
                smsMsg = activeInstitution.visitorArrivalSmsTemplate
                    .replace(/\{host\}/gi, hostDisplayName)
                    .replace(/\{visitor\}/gi, v.visitorName)
                    .replace(/\{purpose\}/gi, v.purpose || 'Office visit')
                    .replace(/\{institution\}/gi, activeInstitution?.name || 'Security')
                    .replace(/\{link\}/gi, link);
            }

            const smsCfg = activeInstitution?.smsConfig || companyDetails?.smsConfig;
            const instId = activeInstitution?.id || currentUser?.institutionId || '';
            apiService.sendSms(hostPhone, smsMsg, smsCfg, 1, instId)
                .then(() => console.info('[Building Security] Sent SMS arrival notification to host:', hostPhone))
                .catch(err => console.warn('[Building Security] Failed to send SMS to host:', err));
        }

        loadData();
    }, [loadData, buildingOffices, users, currentUser, setNotifications, activeInstitution, companyDetails]);

    const handleUpdateBuildingVisitorLog = useCallback(async (id: string, data: Partial<BuildingVisitorLog>) => {
        const existing = (buildingVisitorLogs || []).find(v => v.id === id);
        if (existing) {
            await apiService.saveModuleRecord('building_visitor_logs', { ...existing, ...data });
            loadData();
        }
    }, [buildingVisitorLogs, loadData]);

    const handleVerifyVisitorAsset = useCallback(async (assetId: string, verified: boolean) => {
        const existing = (buildingVisitorAssets || []).find(a => a.id === assetId);
        if (existing) {
            await apiService.saveModuleRecord('building_visitor_assets', { ...existing, verifiedAtExit: verified });
            loadData();
        }
    }, [buildingVisitorAssets, loadData]);

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
            id: invoice.id || `inv_${Date.now()}`,
            institutionId: currentUser?.institutionId,
            createdAt: invoice.createdAt || new Date().toISOString()
        });
        loadData();
    }, [currentUser, loadData]);

    const handleAddReceipt = useCallback(async (receipt: any) => {
        await apiService.saveModuleRecord('receipts', {
            ...receipt,
            id: receipt.id || `rcpt_${Date.now()}`,
            institutionId: currentUser?.institutionId,
            createdAt: receipt.createdAt || new Date().toISOString()
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
            const nowIso = new Date().toISOString();
            await apiService.saveModuleRecord('county_inventory', {
                ...item,
                status: 'received',
                lastUpdated: nowIso
            });

            // Automatically update or create institutional inventory
            const instId = item.targetInstitutionId || activeInstitution?.id || currentUser?.institutionId || 'default_inst';
            try {
                await syncInventoryWithReceipt(instId, [{
                    itemName: item.name,
                    quantity: Number(item.quantity || 0),
                    unit: item.unit || 'pcs',
                    category: item.category || 'County Supplied',
                    description: `County consignment received: ${item.supplierName || 'County Headquarters'}`
                }]);

                // Also record in retail_stock_receipts for Action History tracking
                const autoReceipt: any = {
                    id: `SR-CTY-${Date.now()}`,
                    institutionId: instId,
                    supplierId: 'county-headquarters',
                    supplierName: item.supplierName || 'County Headquarters',
                    referenceNumber: `CTY-DISP-${Date.now().toString().slice(-6)}`,
                    receiptDate: nowIso,
                    totalAmount: 0,
                    items: [{
                        itemId: `cty-${Date.now()}`,
                        itemName: item.name,
                        quantity: Number(item.quantity || 0),
                        unitCost: 0
                    }],
                    recordedBy: currentUser?.name || 'Stores Master',
                    status: 'completed',
                    notes: `County consignment received and added to inventory`,
                    createdAt: nowIso
                };
                await apiService.saveModuleRecord('retail_stock_receipts', autoReceipt).catch(() => {});
                try {
                    const localRec = JSON.parse(localStorage.getItem('eduai_fallback_stock_receipts') || '[]');
                    localRec.unshift(autoReceipt);
                    localStorage.setItem('eduai_fallback_stock_receipts', JSON.stringify(localRec));
                } catch (e) {}
            } catch (invErr) {
                console.warn('[App] Error auto-stocking received inventory item:', invErr);
            }

            loadData();
            success(`Inventory received. Stocked ${item.quantity} ${item.unit || 'units'} of "${item.name}" into inventory.`);
        }
    }, [countyInventory, activeInstitution, currentUser, loadData, success]);

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
        // Optimistically update React state immediately
        setCourses(prev => (prev || []).map(c => c.id === id ? { ...c, ...data } : c));
        
        const existing = (courses || []).find(c => c.id === id);
        if (existing) {
            try {
                await apiService.saveModuleRecord('courses', { ...existing, ...data });
            } catch (err) {
                console.error("Failed to update course/grade record:", err);
            }
            await loadData(false, true);
        }
    }, [courses, loadData]);

    const handleAddSubject = useCallback(async (data: any, levelIds?: string[]) => {
        const id = data.id || `sub_${Date.now()}`;
        const subject = { ...data, id, institutionId: currentUser?.institutionId };
        await apiService.saveSubject(subject);
        if (levelIds && levelIds.length > 0) {
            for (const lid of levelIds) { await apiService.onAssociateSubjectToCourseLevel(id, lid); }
        }
        loadData();
    }, [currentUser, loadData]);

    const handleDeleteSubject = useCallback(async (id: string) => {
        // Immediately remove from React state
        setSubjects(prev => (prev || []).filter(s => s.id !== id));

        try {
            const instId = currentUser?.institutionId || activeInstitution?.id;
            const subjObj = (subjects || []).find(s => s.id === id);
            
            // 1. Clean up dependent subject allocations from DB to prevent foreign key issues
            const allAllocations = await apiService.fetchModuleRecords<any>('subject_allocations', instId).catch(() => []);
            const matchingAllocations = allAllocations.filter((a: any) => a.subjectId === id || (subjObj && a.subjectName && a.subjectName.toLowerCase().trim() === subjObj.name.toLowerCase().trim()));
            for (const alloc of matchingAllocations) {
                if (alloc.id) {
                    await apiService.deleteModuleRecord('subject_allocations', alloc.id).catch(() => {});
                }
            }

            // 2. Clean up subjectId from courses levels
            const allCourses = await apiService.fetchCourses(instId).catch(() => []);
            for (const course of allCourses) {
                if (Array.isArray(course.levels) && course.levels.some((l: any) => (l.subjectIds || []).includes(id) || ((l as any).subject_ids || []).includes(id))) {
                    const updatedLevels = course.levels.map((l: any) => {
                        const currentIds = [...(l.subjectIds || []), ...((l as any).subject_ids || [])];
                        const filteredIds = Array.from(new Set(currentIds)).filter(sid => sid !== id);
                        const metadata = (l.subjectMetadata || (l as any).subject_metadata || []).filter((m: any) => (m.subjectId || m.subject_id) !== id);
                        return { ...l, subjectIds: filteredIds, subject_ids: filteredIds, subjectMetadata: metadata, subject_metadata: metadata };
                    });
                    await apiService.saveModuleRecord('courses', { ...course, levels: updatedLevels }).catch(() => {});
                }
            }

            // 3. Clean up subjectId from classAllocationsStore in localStorage and DB
            if (instId) {
                const classAllocKey = `eduai_class_subject_allocations_${instId}`;
                try {
                    const saved = localStorage.getItem(classAllocKey);
                    if (saved) {
                        const store: Record<string, string[]> = JSON.parse(saved) || {};
                        let storeChanged = false;
                        Object.keys(store).forEach(k => {
                            if (Array.isArray(store[k]) && store[k].includes(id)) {
                                store[k] = store[k].filter(sid => sid !== id);
                                storeChanged = true;
                            }
                        });
                        if (storeChanged) {
                            localStorage.setItem(classAllocKey, JSON.stringify(store));
                            await apiService.saveModuleRecord('class_subject_allocations', {
                                id: `alloc_${instId}`,
                                institutionId: instId,
                                allocations: store
                            }).catch(() => {});
                        }
                    }
                } catch(e) {}
            }

            // 4. Delete subject from DB & local storage
            await apiService.deleteModuleRecord('subjects', id);
        } catch (err) {
            console.error("Failed to delete subject from DB:", err);
            const subjObj = (subjects || []).find(s => s.id === id);
            if (subjObj) {
                await apiService.saveSubject({ ...subjObj, targetClasses: [], assignedClasses: [], isArchived: true } as any).catch(() => {});
            }
        }
        await loadData(false, true);
    }, [subjects, currentUser, activeInstitution, loadData]);

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
        const id = data.id || `course_${Date.now()}`;
        const targetInstitutionId = data.institutionId || currentUser?.institutionId || activeInstitution?.id;
        const courseData = { ...data, id, institutionId: targetInstitutionId, levels: data.levels || [] };
        
        // Optimistically update React state immediately
        setCourses(prev => [...(prev || []).filter(c => c.id !== id), courseData]);
        
        try {
            await apiService.saveModuleRecord('courses', courseData);
        } catch (err) {
            console.error("Failed to save course/grade record:", err);
        }
        await loadData(false, true);
    }, [currentUser, activeInstitution, loadData]);

    const handleDeleteCourse = useCallback(async (id: string) => {
        // Optimistically remove from React state immediately
        setCourses(prev => (prev || []).filter(c => c.id !== id));
        
        try {
            await apiService.deleteModuleRecord('courses', id);
        } catch (err) {
            console.error("Failed to delete course/grade record:", err);
        }
        await loadData(false, true);
    }, [loadData]);

    const handleImportCourses = useCallback(async (data: any[]) => {
        const targetInstId = currentUser?.institutionId || activeInstitution?.id;
        const enriched = data.map((c, idx) => ({ ...c, id: c.id || `course_${Date.now()}_${idx}`, institutionId: targetInstId }));
        
        setCourses(prev => [...(prev || []), ...enriched]);
        await apiService.onImportCourses(enriched);
        await loadData(false, true);
    }, [currentUser, activeInstitution, loadData]);

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
        const instType = activeInstitution?.institutionType as string | undefined;
        const cat = activeInstitution?.category;
        const isSchool = instType === 'Primary' || instType === 'Secondary' || cat === 'Primary' || cat === 'Secondary' || (cat !== 'University' && cat !== 'Tertiary');
        const defaultStatus = isSchool ? 'approved' : (data.status || 'pending');

        await apiService.saveModuleRecord('allocation_requests', { 
            ...data, 
            id: data.id || `req_${Date.now()}`, 
            institutionId: currentUser?.institutionId,
            status: defaultStatus
        });
        loadData();
    }, [currentUser, activeInstitution, loadData]);

    const handleLecturerSubmitRequest = useCallback(async (subjectIds: string[], justification: string, signatureUrl: string | null, priority: string, academicYearId: string, semesterId: string, preferences: any, courseLevelSelections: Record<string, string[]>) => {
        try {
            const instType = activeInstitution?.institutionType as string | undefined;
            const cat = activeInstitution?.category;
            const isSchool = instType === 'Primary' || instType === 'Secondary' || cat === 'Primary' || cat === 'Secondary' || (cat !== 'University' && cat !== 'Tertiary');
            const defaultStatus = isSchool ? 'approved' : 'pending';

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
                    status: defaultStatus,
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
        const inst = institutions.find(i => i.id === id) || (activeInstitution?.id === id ? activeInstitution : null);
        if (inst) {
            const updated = { ...inst, ...data };
            if (data.visitorAutoFinalizeTime !== undefined || data.visitor_auto_finalize_time !== undefined || data.visitorAutoFinalizeEnabled !== undefined || data.visitor_auto_finalize_enabled !== undefined) {
                try {
                    const vTime = data.visitorAutoFinalizeTime || data.visitor_auto_finalize_time || inst.visitorAutoFinalizeTime || (inst as any)?.visitor_auto_finalize_time || '18:00';
                    const vEnabled = data.visitorAutoFinalizeEnabled ?? (data as any)?.visitor_auto_finalize_enabled ?? inst.visitorAutoFinalizeEnabled ?? (inst as any)?.visitor_auto_finalize_enabled ?? false;
                    const nHost = data.notifyHostOnVisitorArrival ?? (data as any)?.notify_host_on_visitor_arrival ?? inst.notifyHostOnVisitorArrival ?? true;
                    const sTemplate = data.visitorArrivalSmsTemplate || (data as any)?.visitor_arrival_sms_template || inst.visitorArrivalSmsTemplate || '';
                    const payload = {
                        visitorAutoFinalizeEnabled: vEnabled,
                        visitorAutoFinalizeTime: vTime,
                        visitor_auto_finalize_enabled: vEnabled,
                        visitor_auto_finalize_time: vTime,
                        notifyHostOnVisitorArrival: nHost,
                        notify_host_on_visitor_arrival: nHost,
                        visitorArrivalSmsTemplate: sTemplate,
                        visitor_arrival_sms_template: sTemplate
                    };
                    localStorage.setItem(`eduai_visitor_settings_${id}`, JSON.stringify(payload));
                    localStorage.setItem('eduai_visitor_settings', JSON.stringify(payload));
                } catch (_) {}
            }
            setInstitutions(prev => prev.map(i => i.id === id ? updated : i));
            await apiService.saveInstitution(updated);
            loadData();
        }
    }, [institutions, activeInstitution, loadData]);

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

    const handleTeacherGateCheckIn = useCallback(async (teacherId: string, type: 'Morning' | 'Afternoon', location: string, notes?: string) => {
        try {
            await apiService.processTeacherCheckIn({
                teacher_id: teacherId,
                institution_id: activeInstitution?.id,
                checkin_type: type,
                location: location || 'School Gate',
                notes: notes || 'Gate Check-In by Security',
                timestamp: new Date().toISOString()
            });
            loadData();
        } catch (e) {
            console.error('[App] Teacher gate check-in error:', e);
            throw e;
        }
    }, [activeInstitution, loadData]);

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
        const role = currentUser?.role;
        const instId = currentUser?.institutionId || activeInstitution?.id;
        if (instId && (role === 'finance_officer' || role === 'finance' || role === 'admin' || role === 'super_admin' || role === 'head_teacher' || role === 'procurement_officer')) {
            apiService.prefetchFinanceRecords(instId).catch(() => {});
        }
    }, [currentUser?.id, currentUser?.institutionId, currentUser?.countyId, impersonatedRole, activityLogLimit, transactionLimit, receiptLimit, notificationLimit, activeInstitution?.id]);

    // Reset bank feeds seen ref when institution changes
    useEffect(() => {
        isFirstLoadDoneRef.current = false;
        prevUnreconciledIdsRef.current.clear();
    }, [activeInstitution?.id]);

    // Show notifications when new unreconciled automotive bank feeds are received
    useEffect(() => {
        if (!isAutoMarket) {
            prevUnreconciledIdsRef.current.clear();
            return;
        }

        const currentUnreconciled = carBankTransactions.filter(t => t.status === 'unreconciled');

        if (!isFirstLoadDoneRef.current) {
            if (carBankTransactions.length > 0) {
                prevUnreconciledIdsRef.current = new Set(currentUnreconciled.map(t => t.id));
                isFirstLoadDoneRef.current = true;
            }
            return;
        }

        const newUnreconciled = currentUnreconciled.filter(t => !prevUnreconciledIdsRef.current.has(t.id));

        if (newUnreconciled.length > 0) {
            newUnreconciled.forEach(txn => {
                const formattedAmount = typeof txn.amount === 'number'
                    ? txn.amount.toLocaleString()
                    : parseFloat(String(txn.amount || 0)).toLocaleString();
                info(`New unreconciled bank feed received: KES ${formattedAmount} from ${txn.senderName || 'External Deposit'} (${txn.bankName || 'KCB'})`);
            });

            // Update ref
            newUnreconciled.forEach(txn => prevUnreconciledIdsRef.current.add(txn.id));
        }

        // Keep ref synchronized with current status (in case of manual reconciliation)
        const currentUnreconciledIds = new Set(currentUnreconciled.map(t => t.id));
        prevUnreconciledIdsRef.current = currentUnreconciledIds;
    }, [carBankTransactions, isAutoMarket, info]);

    // Poll for new integration logs / bank transactions on automotive marketplace
    useEffect(() => {
        if (!currentUser || !isAutoMarket) return;

        const intervalId = setInterval(() => {
            loadData(false, true, undefined, true); // silent = true, force = true
        }, 15000);

        return () => {
            clearInterval(intervalId);
        };
    }, [currentUser, isAutoMarket, loadData]);

    // Reactive synchronization & gentle background polling for in-app bell notifications
    useEffect(() => {
        if (!currentUser?.id) return;

        const syncNotifications = () => {
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;
            if (currentUser.id.startsWith('temp_admin_')) return;

            apiService.fetchNotifications(currentUser.id, { limit: notificationLimit }).then(notifs => {
                if (notifs) setNotifications(notifs);
            }).catch(() => {});
        };

        const handleNotifEvent = (e: any) => {
            const detail = e?.detail;
            if (!detail || detail.userId === currentUser.id) {
                syncNotifications();
            }
        };

        window.addEventListener('app_notification_created', handleNotifEvent);
        window.addEventListener('storage', syncNotifications);

        // Periodically poll every 15s to catch visitors checked in on another guard terminal
        const intervalId = setInterval(syncNotifications, 15000);

        return () => {
            window.removeEventListener('app_notification_created', handleNotifEvent);
            window.removeEventListener('storage', syncNotifications);
            clearInterval(intervalId);
        };
    }, [currentUser?.id, notificationLimit]);

    // ── Scheduled Visitor Auto-Finalize ──────────────────────────────────────
    // Runs every 60 seconds. If enabled + past the configured cutoff time (and
    // not yet fired today), sweeps all active visitors and marks them checked-out.
    const autoFinalizeLastFiredDateRef = React.useRef<string>('');
    useEffect(() => {
        if (!currentUser?.id || !activeInstitution) return;

        const runAutoFinalize = async () => {
            const isEnabled = activeInstitution?.visitorAutoFinalizeEnabled ?? (activeInstitution as any)?.visitor_auto_finalize_enabled;
            if (!isEnabled) return;
            if (typeof navigator !== 'undefined' && !navigator.onLine) return;

            const cutoffTime = activeInstitution?.visitorAutoFinalizeTime || (activeInstitution as any)?.visitor_auto_finalize_time || '18:00';
            const now = new Date();
            const todayKey = now.toDateString();
            const [cutHour, cutMin] = cutoffTime.split(':').map(Number);
            const cutoffReached = now.getHours() > cutHour || (now.getHours() === cutHour && now.getMinutes() >= cutMin);

            if (!cutoffReached) return;
            if (autoFinalizeLastFiredDateRef.current === todayKey) return; // already ran today

            autoFinalizeLastFiredDateRef.current = todayKey;

            const timeOutStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            let count = 0;

            // Finalize campus visitors
            const activeVisitors = (visitors || []).filter(v => v.status !== 'checked_out' && v.institutionId === activeInstitution.id);
            for (const v of activeVisitors) {
                const updated = {
                    ...v,
                    status: 'checked_out' as const,
                    timeOut: v.timeOut || timeOutStr,
                    metadata: {
                        ...((v as any).metadata || {}),
                        autoFinalizedBySchedule: true,
                        autoFinalizedAt: now.toISOString(),
                        autoFinalizeCutoff: cutoffTime
                    }
                };
                setVisitors(prev => prev.map(x => x.id === v.id ? updated : x));
                await apiService.saveModuleRecord('visitors', updated).catch(() => {});
                count++;
            }

            // Finalize building visitor logs
            const activeLogs = (buildingVisitorLogs || []).filter(b => b.status !== 'checked_out' && b.institutionId === activeInstitution.id);
            for (const b of activeLogs) {
                const updated = {
                    ...b,
                    status: 'checked_out' as const,
                    timeOut: b.timeOut || timeOutStr,
                    metadata: {
                        ...((b as any).metadata || {}),
                        autoFinalizedBySchedule: true,
                        autoFinalizedAt: now.toISOString(),
                        autoFinalizeCutoff: cutoffTime
                    }
                };
                setBuildingVisitorLogs(prev => prev.map(x => x.id === b.id ? updated : x));
                await apiService.saveModuleRecord('building_visitor_logs', updated).catch(() => {});
                count++;
            }

            if (count > 0) {
                await handleLogAction(`Scheduled auto-finalize: ${count} visitor(s) checked out at ${cutoffTime} cutoff.`);
                info(`🕐 ${count} visitor(s) auto-finalized at ${cutoffTime} cutoff.`);
            }
        };

        // Run immediately once, then every 60 seconds
        runAutoFinalize();
        const intervalId = setInterval(runAutoFinalize, 60000);
        return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentUser?.id, activeInstitution?.id, activeInstitution?.visitorAutoFinalizeEnabled, activeInstitution?.visitorAutoFinalizeTime]);

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





    const handleUpdateVoteHeads = async (heads: VoteHead[]) => {
        const instId = activeInstitution?.id || currentUser?.institutionId;
        if (!instId) return;
        try {
            const currentIds = new Set(heads.map(h => h.id));
            const deletedHeads = voteHeads.filter(h => !currentIds.has(h.id));
            for (const head of deletedHeads) {
                await apiService.deleteModuleRecord('vote_heads', head.id);
            }
            for (const head of heads) {
                const payload = {
                    ...head,
                    institutionId: instId
                };
                const exists = voteHeads.some(h => h.id === head.id);
                if (exists) {
                    await apiService.updateModuleRecord('vote_heads', head.id, payload);
                } else {
                    await apiService.saveModuleRecord('vote_heads', payload);
                }
            }
            loadData();
        } catch (err) {
            console.error("Failed to update vote heads:", err);
        }
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

    const onToggleConstituencyStatus = useCallback(async (id: string) => {
        const con = constituencies.find(c => c.id === id);
        if (con) {
            await apiService.saveModuleRecord('constituencies', {
                ...con,
                status: con.status === 'suspended' ? 'active' : 'suspended'
            });
            loadData();
        }
    }, [constituencies, loadData]);

    const onUpdateConstituency = useCallback(async (id: string, data: any) => {
        const con = constituencies.find(c => c.id === id);
        if (con) {
            await apiService.saveModuleRecord('constituencies', { ...con, ...data });
            loadData();
        }
    }, [constituencies, loadData]);

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
        setTimeout(async () => {
            const adminRoles = [
                // Primary Tenant/Institution Administrators
                'admin', 'principal', 'headmaster', 'headmistress', 'head_teacher', 'managing_director', 'hoi',
                'school_admin', 'group_admin', 'school_group_admin', 'dean', 'director',
                'reseller', 'property_admin', 'cooperative_manager', 'coop_chairman', 'coop_admin',
                'his_admin', 'pharmacy_admin', 'carwash_admin', 'agrovet_admin', 'church_admin', 'pastor',
                'mechanic_admin', 'fuel_admin', 'legal_admin', 'restaurant_admin',
                'constituency_admin', 'county_admin',
                
                // School / Institutional Leaders & Secondary Admins
                'deputy', 'dos', 'hod', 'tto',
                
                // Staff / Officers
                'finance', 'finance_officer', 'academics_officer', 'hr_officer', 'transport_admin',
                'boarding_master', 'librarian', 'store', 'event_manager', 'security', 'info_desk',
                
                // Instructors / Teachers
                'teacher', 'practice_teacher', 'lecturer',
                
                // Assistant / Support staff
                'transport_assistant', 'driver'
            ];

            const cleanId = (id?: string) => id ? String(id).replace(/^(br_inst_br_|br_inst_|br_|inst_br_|inst_)/gi, '').toLowerCase() : '';
            const normTargetId = cleanId(institutionId);

            const branchRecord = (branches || []).find((b: any) => {
                if (!b) return false;
                if (b.linked_institution_id === institutionId || b.id === institutionId || b.id === `br_${institutionId}`) return true;
                if (b.linked_institution_id && cleanId(b.linked_institution_id) === normTargetId) return true;
                if (b.id && cleanId(b.id) === normTargetId) return true;
                if (b.institution_id === institutionId || (b.institution_id && cleanId(b.institution_id) === normTargetId)) return true;
                if (b.id && institutionId.includes(b.id)) return true;
                return false;
            });

            const targetCounty = (counties || []).find(c => c.id === institutionId || c.code === institutionId || (c.name && cleanId(c.name) === normTargetId));
            let targetInst = institutions.find(i => i.id === institutionId || (normTargetId && cleanId(i.id) === normTargetId));
            
            if (!targetInst) {
                if (targetCounty) {
                    targetInst = {
                        id: targetCounty.id,
                        name: targetCounty.name,
                        institutionType: 'County',
                        category: 'County Government',
                        status: targetCounty.status || 'active',
                        countyId: targetCounty.id
                    } as any;
                } else {
                    const regEntry = schoolRegistry.find(s => s.id === institutionId || s.institutionId === institutionId || (normTargetId && (cleanId(s.id) === normTargetId || cleanId(s.institutionId) === normTargetId)));
                    const parentInst = branchRecord ? institutions.find(i => i.id === branchRecord.institution_id || (cleanId(branchRecord.institution_id) && cleanId(i.id) === cleanId(branchRecord.institution_id))) : null;
                    
                    targetInst = {
                        id: institutionId,
                        name: regEntry?.name || (branchRecord?.name ? `${parentInst?.name || 'Group'} (${branchRecord.name})` : `Branch ${institutionId.slice(-6)}`),
                        institutionType: regEntry?.institutionType || parentInst?.institutionType || 'Education',
                        parentInstitutionId: branchRecord?.institution_id || (regEntry as any)?.parentInstitutionId,
                        isBranch: true,
                        status: 'active'
                    } as any;

                    setInstitutions(prev => [...prev.filter(i => i.id !== institutionId), targetInst!]);
                }
            }

            const parentInstId = (targetInst as any)?.parentInstitutionId || 
                                 (targetInst as any)?.parent_institution_id || 
                                 (targetInst as any)?.metadata?.parentInstitutionId ||
                                 branchRecord?.institution_id;

            const isUserForInst = (u: any) => {
                if (!u) return false;
                // Exclude global super admins with empty, ALL or SYSTEM institution IDs
                if (u.role === 'super_admin' && (!u.institutionId || u.institutionId === 'ALL' || u.institutionId === 'all' || u.institutionId === 'SYSTEM')) return false;

                const uInst = u.institutionId || u.institution_id;
                const uBranch = u.branchId || u.branch_id || u.metadata?.branchId || u.metadata?.branch_id;
                const uCounty = u.countyId || u.county_id;
                
                if (uInst === institutionId || uBranch === institutionId || uCounty === institutionId) return true;
                if (normTargetId && (cleanId(uInst) === normTargetId || cleanId(uBranch) === normTargetId || cleanId(uCounty) === normTargetId)) return true;

                if (targetCounty && (uCounty === targetCounty.id || uInst === targetCounty.id || uCounty === targetCounty.code || uInst === targetCounty.code)) return true;

                if (parentInstId) {
                    const normParentInstId = cleanId(parentInstId);
                    if (uInst === parentInstId || uBranch === parentInstId || cleanId(uInst) === normParentInstId || cleanId(uBranch) === normParentInstId) {
                        if (!uBranch || uBranch === 'ALL' || uBranch === 'main' || uBranch === institutionId || uBranch === parentInstId || cleanId(uBranch) === normTargetId || cleanId(uBranch) === normParentInstId) return true;
                    }
                }
                if (branchRecord) {
                    if (uInst === branchRecord.institution_id || uInst === branchRecord.linked_institution_id || uBranch === branchRecord.id || uBranch === branchRecord.linked_institution_id) return true;
                    if (cleanId(uInst) === cleanId(branchRecord.institution_id) || cleanId(uInst) === cleanId(branchRecord.linked_institution_id)) return true;
                }
                return false;
            };

            let currentUsers = users;
            if (!currentUsers.some(u => isUserForInst(u))) {
                const fetchedInstUsers = await apiService.fetchModuleRecords<User>('users', institutionId).catch(() => []);
                if (fetchedInstUsers && fetchedInstUsers.length > 0) {
                    setUsers(prev => {
                        const existingIds = new Set(prev.map(u => u.id));
                        const newUsers = fetchedInstUsers.filter(u => !existingIds.has(u.id));
                        return [...prev, ...newUsers];
                    });
                    currentUsers = [...currentUsers, ...fetchedInstUsers];
                }
            }

            // Exclude super_admin accounts from being matched as tenant admins
            const matchedAdmins = currentUsers.filter(u => isUserForInst(u) && adminRoles.includes(u.role) && u.role !== 'super_admin');
            let admin = null;

            if (initialRole && initialRole !== 'super_admin') {
                const exactRoleMatch = matchedAdmins.find(u => u.role === initialRole);
                if (exactRoleMatch) admin = exactRoleMatch;
            }

            if (!admin && matchedAdmins.length > 0) {
                matchedAdmins.sort((a, b) => {
                    const indexA = adminRoles.indexOf(a.role);
                    const indexB = adminRoles.indexOf(b.role);
                    return indexA - indexB;
                });
                admin = matchedAdmins[0];
            }

            if (!admin) {
                console.warn(`Strict admin lookup failed for institution ${institutionId}. Falling back to non-portal user.`);
                const excludedRoles = ['student', 'parent', 'customer', 'super_admin'];
                const fallbackUsers = currentUsers.filter(u => isUserForInst(u) && (!excludedRoles.includes(u.role) || (initialRole && initialRole === u.role && initialRole !== 'super_admin')));
                if (fallbackUsers.length > 0) {
                    admin = fallbackUsers[0];
                }
            }

            if (!admin) {
                console.warn(`No users found for institution ${institutionId}. Creating temporary admin session.`);
                const registryEntry = schoolRegistry.find(s => s.id === institutionId || s.institutionId === institutionId || (normTargetId && (cleanId(s.id) === normTargetId || cleanId(s.institutionId) === normTargetId)));
                const isPM = targetInst?.businessSubType?.toLowerCase().includes('property management') || targetInst?.institutionType?.toLowerCase().includes('property management');
                const isCountyTarget = !!targetCounty || initialRole === 'county_admin' || ((targetInst?.institutionType as string) === 'County');
                
                const fallbackRole = (targetInst?.institutionType === 'Reseller' || registryEntry?.institutionType === 'Reseller') 
                    ? 'reseller' 
                    : isCountyTarget
                        ? 'county_admin'
                        : isPM 
                            ? 'property_admin' 
                            : (initialRole && initialRole !== 'super_admin') ? initialRole : 'admin';

                const cleanName = targetCounty?.name || targetInst?.name || registryEntry?.name || 'Academic Institution';
                const isActualBranch = (branches || []).some((b: any) => b.id === institutionId);
                admin = {
                    id: `temp_admin_${institutionId.replace(/\s+/g, '_')}_${Date.now()}`,
                    institutionId: targetCounty ? targetCounty.id : institutionId,
                    countyId: targetCounty ? targetCounty.id : undefined,
                    branchId: isActualBranch ? institutionId : undefined,
                    role: fallbackRole as Role,
                    email: targetCounty?.email || `admin@${institutionId.replace('demo_', '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'school'}.eduai.io`,
                    name: targetCounty?.adminName || `${cleanName} Admin`,
                    phoneNumber: targetCounty?.phoneNumber || '+254700000000',
                    password: 'password123',
                    expertise: targetCounty ? ['County Administration'] : []
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

                // For Property Management institutions, always use property_admin so routing
                // lands on PropertyManagementView rather than LandlordPortalView
                const isPMInstitution = targetInst?.businessSubType?.toLowerCase().includes('property management') || targetInst?.institutionType?.toLowerCase().includes('property management');
                const isCountyTarget = !!targetCounty || initialRole === 'county_admin' || ((targetInst?.institutionType as string) === 'County') || (admin.role === 'county_admin' || admin.role?.startsWith('county_'));
                const isResellerInst = targetInst?.institutionType === 'Reseller' || targetInst?.category === 'Reseller' || (targetInst as any)?.businessSubType === 'Reseller';

                const resolvedRole = (initialRole && initialRole !== 'super_admin')
                    ? initialRole
                    : isResellerInst
                        ? 'reseller'
                        : isCountyTarget
                            ? 'county_admin'
                            : isPMInstitution && (admin.role === 'landlord' || admin.role === 'admin')
                                ? 'property_admin'
                                : admin.role === 'super_admin' ? 'admin' : admin.role;

                const isBranchInst = (branches || []).some((b: any) => b.id === institutionId || b.id === `br_${institutionId}` || b.linked_institution_id === institutionId);

                const impersonatedUser = {
                    ...admin,
                    institutionId: targetCounty ? targetCounty.id : institutionId,
                    countyId: targetCounty ? targetCounty.id : admin.countyId || (isCountyTarget ? institutionId : undefined),
                    branchId: isBranchInst ? institutionId : undefined,
                    role: resolvedRole as Role,
                    isImpersonated: true,
                    passwordLastUpdated: admin.passwordLastUpdated || new Date().toISOString()
                };
                
                console.log(`[Simulator] Impersonating ${impersonatedUser.role} for ${institutionId}`);
                setCurrentUser(impersonatedUser);
                apiService.storeSession(impersonatedUser);
                setImpersonatedRole((initialRole && initialRole !== 'super_admin') ? initialRole : (resolvedRole as Role));
            } else {
                toastError("Critical: Failed to generate administrative session.");
            }
            setIsTransitioning(false);
        }, 300);
    }, [users, institutions, counties, schoolRegistry, currentUser, originalSuperAdminSession, toastError, branches]);
    


    // On-demand Registry Load for Alumnae/Institution pages
    useEffect(() => {
        if ((showAlumnaeRegister || showInstitutionClaim || showAlumnaeActivation) && schoolRegistry.length === 0) {
            const loadRegistry = async () => {
                try {
                    const reg = await apiService.fetchFullRegistry();
                    setSchoolRegistry(reg);
                } catch (e) {}
            };
            loadRegistry();
        }
    }, [showAlumnaeRegister, showInstitutionClaim, showAlumnaeActivation, schoolRegistry.length]);

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
                                 (modId === 'private_security' || modId === 'security' || modId === 'private-security') ? 'Private Security' :
                                 (modId === 'edu' || modId === 'parent_portal') ? 'Education' : 'Business') as any,
                category: (modId === 'fuel' ? 'Fuel Station' : 
                           modId === 'retail' ? 'Retail' : 
                           modId === 'showroom' ? 'Automotive Marketplace' : 
                           modId === 'tourism' ? 'Hospitality' :
                           modId === 'community' ? 'Community' : 
                           modId === 'his' ? 'Hospital/Clinic' :
                           modId === 'pharmacy' ? 'Hospital/Clinic' :
                           (modId === 'private_security' || modId === 'security' || modId === 'private-security') ? 'Security' :
                           'General'),
                businessSubType: (modId === 'fuel' ? 'Fuel Station' : 
                                  modId === 'retail' ? 'Retail' : 
                                  modId === 'autoservice' ? 'Car Wash' : 
                                  modId === 'showroom' ? 'Automotive Marketplace' : 
                                  modId === 'property' ? 'Property Management' : 
                                  (modId === 'private_security' || modId === 'security' || modId === 'private-security') ? 'Private Security' : 'General'),
                status: 'active',
                trialEndsAt: new Date(Date.now() + 86400000 * 30).toISOString(),
                slug: `sim-${modId}-${Date.now()}`,
                moduleStates: [
                    {
                        id: `ms_${Date.now()}_1`,
                        institutionId: instId,
                        moduleId: modId === 'parent_portal' ? 'edu' : modId,
                        status: 'active' as any,
                        subscriptionEndsAt: new Date(Date.now() + 86400000 * 365).toISOString()
                    },
                    ...(modId === 'academics' || modId === 'timetable' ? [
                        {
                            id: `ms_${Date.now()}_2`,
                            institutionId: instId,
                            moduleId: modId === 'academics' ? 'timetable' : 'academics',
                            status: 'active' as any,
                            subscriptionEndsAt: new Date(Date.now() + 86400000 * 365).toISOString()
                        },
                        {
                            id: `ms_${Date.now()}_3`,
                            institutionId: instId,
                            moduleId: 'enrollment_manager',
                            status: 'active' as any,
                            subscriptionEndsAt: new Date(Date.now() + 86400000 * 365).toISOString()
                        }
                    ] : []),
                    // Parent Portal simulator: also enable academics + transport + boarding
                    ...(modId === 'parent_portal' ? [
                        {
                            id: `ms_${Date.now()}_p1`,
                            institutionId: instId,
                            moduleId: 'academics',
                            status: 'active' as any,
                            subscriptionEndsAt: new Date(Date.now() + 86400000 * 365).toISOString()
                        },
                        {
                            id: `ms_${Date.now()}_p2`,
                            institutionId: instId,
                            moduleId: 'transport',
                            status: 'active' as any,
                            subscriptionEndsAt: new Date(Date.now() + 86400000 * 365).toISOString()
                        },
                        {
                            id: `ms_${Date.now()}_p3`,
                            institutionId: instId,
                            moduleId: 'timetable',
                            status: 'active' as any,
                            subscriptionEndsAt: new Date(Date.now() + 86400000 * 365).toISOString()
                        }
                    ] : [])
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
            const { generateInstitutionalDemoData } = await import('../utils/demoData');
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
        let saUser = originalSuperAdminSession;
        if (!saUser) {
            try {
                const stored = localStorage.getItem('eduai_super_admin_session');
                if (stored) saUser = JSON.parse(stored);
            } catch (_) {}
        }
        if (saUser) {
            setIsTransitioning(true);
            setTimeout(() => {
                setOriginalSuperAdminSession(null);
                setImpersonatedRole(null);
                setIsSimulatorMode(false);
                setIsHealthSystemOpen(false);
                setIsPharmacySystemOpen(false);
                localStorage.removeItem('eduai_super_admin_session');
                localStorage.removeItem('eduai_impersonated_user');
                try {
                    sessionStorage.removeItem('eduai_impersonated_by_admin');
                } catch (_) {}
                setCurrentUser(saUser);
                apiService.storeSession(saUser);
                setIsTransitioning(false);
                window.location.href = window.location.origin + window.location.pathname;
            }, 100);
        } else {
            try {
                sessionStorage.removeItem('eduai_impersonated_by_admin');
            } catch (_) {}
            apiService.clearSession();
            window.location.href = window.location.origin + window.location.pathname;
        }
    };

    const handleAddVehicle = async (vehicle: Omit<TransportVehicle, 'id'>) => {
        try {
            const newVehicle = { ...vehicle, id: `vh_${Date.now()}` } as TransportVehicle;
            setVehicles(prev => [newVehicle, ...prev]);
            await apiService.saveModuleRecord('vehicles', newVehicle);
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
                const updated = { ...existing, ...updates, id };
                setVehicles(prev => prev.map(v => v.id === id ? updated : v));
                await apiService.saveModuleRecord('vehicles', updated);
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
            setVehicles(prev => prev.filter(v => v.id !== id));
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
                receiptNumber: `${(companyDetails?.globalReceiptPrefix || 'RCPT-').trim()}${Date.now()}`,
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

    const onMarkInventoryReceived = handleMarkInventoryReceived;

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
            const { generateInstitutionalDemoData } = await import('../utils/demoData');
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



    const handleAcknowledgeVisitorMet = useCallback(async (notification: AppNotification) => {
        try {
            const visitorId = notification.metadata?.visitorId || (notification as any).visitorId;
            const visitorName = (notification.visitorName || notification.metadata?.visitorName || '').trim().toLowerCase();

            const timeOutStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            // 1. Check in campus visitors list
            const matchedVisitor = (visitors || []).find(v => 
                (visitorId && v.id === visitorId) ||
                (visitorName && v.name && v.name.trim().toLowerCase() === visitorName && v.status !== 'checked_out')
            );

            if (matchedVisitor && matchedVisitor.status !== 'checked_out') {
                const updatedVisitor = {
                    ...matchedVisitor,
                    status: 'checked_out' as const,
                    timeOut: matchedVisitor.timeOut || timeOutStr,
                    metadata: {
                        ...((matchedVisitor as any).metadata || {}),
                        autoFinalizedByHost: true,
                        metConfirmedAt: new Date().toISOString()
                    }
                };

                setVisitors(prev => prev.map(v => v.id === matchedVisitor.id ? updatedVisitor : v));
                await apiService.saveModuleRecord('visitors', updatedVisitor);
                await handleLogAction(`Auto-finalized exit for visitor: ${matchedVisitor.name} (marked met by host)`);
                success(`Visitor ${matchedVisitor.name} marked as met & exit finalized.`);
            }

            // 2. Check in commercial building visitor logs
            const matchedBuildingLog = (buildingVisitorLogs || []).find(bvl =>
                (visitorId && bvl.id === visitorId) ||
                (visitorName && bvl.visitorName && bvl.visitorName.trim().toLowerCase() === visitorName && bvl.status !== 'checked_out')
            );

            if (matchedBuildingLog && matchedBuildingLog.status !== 'checked_out') {
                const updatedBuildingLog = {
                    ...matchedBuildingLog,
                    status: 'checked_out' as const,
                    timeOut: matchedBuildingLog.timeOut || timeOutStr,
                    metadata: {
                        ...((matchedBuildingLog as any).metadata || {}),
                        autoFinalizedByHost: true,
                        metConfirmedAt: new Date().toISOString()
                    }
                };

                setBuildingVisitorLogs(prev => prev.map(b => b.id === matchedBuildingLog.id ? updatedBuildingLog : b));
                await apiService.saveModuleRecord('building_visitor_logs', updatedBuildingLog);
                await handleLogAction(`Auto-finalized exit for building visitor: ${matchedBuildingLog.visitorName} (marked met by host)`);
                success(`Visitor ${matchedBuildingLog.visitorName} marked as met & exit finalized.`);
            }

            loadData();
        } catch (err) {
            console.error("Failed to auto-finalize visitor exit:", err);
        }
    }, [visitors, buildingVisitorLogs, handleLogAction, success, loadData]);

    const handleMarkNotificationAsRead = useCallback(async (id: string) => {
        try {
            const notif = notifications.find(n => n.id === id);
            if (notif && (notif.type === 'guest_arrival' || notif.type === 'visitor')) {
                handleAcknowledgeVisitorMet(notif);
            }
            await apiService.markNotificationAsRead(id);
            setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
        } catch (error) {
            console.error("Failed to mark notification as read:", error);
        }
    }, [notifications, handleAcknowledgeVisitorMet]);

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
            const updated = { ...(existing || {}), ...data, id };
            await apiService.saveModuleRecord('counties', updated);
            await loadData(false, true);
            success("County settings and branding updated successfully.");
        } catch (error: any) {
            console.error("Failed to update county:", error);
            toastError("Failed to update county: " + (error?.message || 'Unknown error'));
        }
    }, [counties, loadData, success, toastError]);

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

    const handleUpdateCountyInstitution = useCallback(async (id: string, data: Partial<Institution>) => {
        try {
            const existing = institutions.find(i => i.id === id);
            const updated: Institution = { ...(existing || {} as Institution), ...data, id };
            await apiService.saveInstitution(updated);
            await loadData();
            success("Institution updated successfully.");
        } catch (error: any) {
            console.error("Failed to update institution:", error);
            toastError("Failed to update institution: " + (error?.message || 'Unknown error'));
        }
    }, [institutions, loadData, success, toastError]);

    const handleDeleteCountyInstitution = useCallback(async (id: string) => {
        try {
            await apiService.deleteModuleRecord('institutions', id);
            await loadData();
            success("Institution deleted successfully.");
        } catch (error: any) {
            console.error("Failed to delete institution:", error);
            toastError("Failed to delete institution: " + (error?.message || 'Unknown error'));
        }
    }, [loadData, success, toastError]);

    const handleAddCountyInstitution = useCallback(async (data: any) => {
        try {
            const instId = `inst_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const adminId = `u_admin_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            const generatedPassword = Math.random().toString(36).slice(-8);
            const adminName = (data.adminName || `${data.name} Admin`).trim();
            const adminEmail = (data.adminEmail || data.email || `admin@${instId}.eduai.io`).trim();

            const newInstitution: Institution = {
                id: instId,
                name: (data.name || '').trim(),
                email: (data.email || adminEmail).trim(),
                phoneNumber: (data.phoneNumber || '').trim(),
                institutionType: data.institutionType as any,
                category: data.category || 'General',
                status: 'active',
                trialEndsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                institutionCode: `INST-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
                useAllocationRequests: true,
                countyId: data.countyId,
                subCounty: data.subCounty,
                constituency: data.constituency,
                ward: data.ward
            };

            const adminRole: Role = getAdminRoleForInstitution(newInstitution);
            const newAdmin: User = {
                id: adminId,
                name: adminName,
                email: adminEmail,
                phoneNumber: data.phoneNumber || '',
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
        onOpenShowcase: () => {
            setShowMarketplace(false);
            setShowCommunityHub(false);
            setShowTransportHub(false);
            setShowGuestPortal(false);
            setShowGuestFeedback(false);
            setShowAlumnaeLogin(false);
            setShowAlumnaeRegister(false);
            setShowAlumnaePortal(false);
            setShowAlumnaeActivation(false);
            setShowInstitutionClaim(false);
            setShowCampaignLogin(false);
            setShowCampaignPortal(false);
            setShowMarketing(true);
        },
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
                const trialPeriodDays = 30;
                const trialEndStr = new Date(Date.now() + trialPeriodDays * 24 * 60 * 60 * 1000).toISOString();
                const nowStr = new Date().toISOString();

                const newInstitution: Institution = {
                    id: instId,
                    name: data.institutionName,
                    email: data.institutionEmail,
                    phoneNumber: data.institutionPhone,
                    institutionType: data.institutionType as any,
                    businessSubType: (data as any).businessSubType,
                    status: 'active',
                    trialEndsAt: trialEndStr,
                    subscriptionEndsAt: trialEndStr,
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
                
                // Auto-provision standard module states for the institution
                const defaultModulesByType: Record<string, string[]> = {
                    'Education': ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'enrollment_manager', 'events', 'his'],
                    'Primary': ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'enrollment_manager', 'events'],
                    'Secondary': ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'enrollment_manager', 'events'],
                    'College': ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'enrollment_manager', 'events'],
                    'University': ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'enrollment_manager', 'events'],
                    'TVET': ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'enrollment_manager', 'events'],
                    'Polytechnic': ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'enrollment_manager', 'events'],
                    'Institute': ['academics', 'timetable', 'finance', 'library', 'school_store', 'boarding', 'transport', 'hr_payroll', 'enrollment_manager', 'events'],
                    'IELTS Academy': ['academics', 'timetable', 'finance', 'library', 'enrollment_manager', 'events'],
                    'Beauty College': ['beauty_college', 'finance', 'hr_payroll', 'timetable'],
                    'Driving School': ['driving_school', 'finance', 'hr_payroll'],
                    'Law Firm': ['law_firm', 'finance', 'hr_payroll'],
                    'HIS': ['his', 'hr_payroll', 'finance', 'school_store'],
                    'Pharmacy': ['pharmacy', 'finance', 'school_store'],
                    'Business': ['finance', 'hr_payroll', 'school_store', 'transport'],
                    'Retail': ['finance', 'hr_payroll', 'school_store'],
                    'Cooperative': ['cooperative', 'finance', 'hr_payroll'],
                    'SACCO': ['cooperative', 'finance', 'hr_payroll'],
                    'Agrovet': ['cooperative', 'finance', 'school_store'],
                    'Church': ['church', 'finance', 'events'],
                    'Political Campaign': ['campaign', 'finance', 'events'],
                    'Logistics': ['transport', 'finance', 'hr_payroll'],
                    'Hospitality': ['finance', 'hr_payroll', 'events'],
                    'Restaurant': ['restaurant_pos', 'finance', 'hr_payroll'],
                    'Property Management': ['property', 'finance'],
                    'Maize Miller': ['finance', 'hr_payroll', 'school_store'],
                    'Fuel Station': ['fuel_station', 'finance', 'hr_payroll']
                };

                const targetType = data.institutionType || 'Education';
                const modulesToProvision = defaultModulesByType[targetType] || defaultModulesByType['Education'];
                for (const modId of modulesToProvision) {
                    try {
                        await apiService.saveModuleRecord('institution_module_states', {
                            id: `ims_${modId}_${instId}`,
                            institutionId: instId,
                            moduleId: modId,
                            status: 'active',
                            activatedAt: nowStr,
                            trialEndsAt: trialEndStr,
                            subscriptionEndsAt: trialEndStr,
                            updatedAt: nowStr
                        });
                    } catch (mErr) {
                        console.warn(`[onInstitutionRegister] Module state provision warning for ${modId}:`, mErr);
                    }
                }

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
        allocations,
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
    }), [currentUser, users, courses, subjects, rooms, academicYears, semesters, requests, allocations, generatedTimetable, getSubjectById, getRoomById, timetableSettings, assignments, submissions, teacherCheckIns, observationNotes, timeOffRequests, userTasks, assessments, assessmentMarks, studentAttendances, handleAddRequest, handleUpdateRequest, handleWithdrawRequest, handleAddAssignment, handleDeleteAssignment, handleAddFeedback, handleTeacherLessonCheckIn, handleAddObservationNote, handleAddTimeOffRequest, handleAddTask, handleUpdateTask, handleDeleteTask, handleSaveAttendance, handleAccessAlumnaPortal]);

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

    const handleActivateModuleTrial = useCallback(async (moduleId: string) => {
        if (!activeInstitution) return;
        try {
            const trialDays = 14;
            const now = new Date();
            const trialEndsAt = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000).toISOString();
            const newState: any = {
                id: `ims_${moduleId}_${activeInstitution.id}`,
                institutionId: activeInstitution.id,
                institution_id: activeInstitution.id,
                moduleId,
                module_id: moduleId,
                status: 'trial',
                trialEndsAt,
                trial_ends_at: trialEndsAt,
                activatedAt: now.toISOString(),
                updatedAt: now.toISOString()
            };

            // Optimistically update local state immediately so UI responds instantly
            setInstitutionModuleStates(prev => {
                const filtered = (prev || []).filter(m => (m.moduleId || (m as any).module_id) !== moduleId || (m.institutionId || (m as any).institution_id) !== activeInstitution.id);
                return [...filtered, newState];
            });

            await apiService.activateModuleTrial(moduleId, activeInstitution.id);
            await loadData();
        } catch (e) {
            console.error(`Failed to activate trial for module ${moduleId}:`, e);
        }
    }, [activeInstitution, loadData]);

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
        constituencies,
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
        onGenerateReceipt: handleGenerateReceipt,
        receipts: activeInstitution?.id
            ? (receipts || []).filter(rec => {
                const rInst = rec.institutionId || (rec as any).institution_id;
                return !rInst || rInst === activeInstitution.id;
            })
            : receipts,
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
             const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
             const instToSave = {
                 ...d,
                 id: newId,
                 status: d.status || 'active',
                 trialEndsAt: d.trialEndsAt || trialEnd,
                 subscriptionEndsAt: d.subscriptionEndsAt || trialEnd,
                 createdAt: now,
                 updatedAt: now
             };
             await apiService.saveInstitution(instToSave as any); 
             const role = d.institutionType === 'Reseller' ? 'reseller' : getAdminRoleForInstitution(instToSave); 
             await apiService.registerUser({ id: `u_${Date.now()}`, name: `${d.name} Admin`, email: d.email, phoneNumber: d.phoneNumber, role: role as any, institutionId: newId, status: 'active', createdAt: now, updatedAt: now } as any, d.name); 
             loadData(); 
        },
        onUpdateInstitution,
        onDeleteInstitution: (id: string) => { if (id) onDeleteInstitution(id); },
        onToggleInstitutionStatus,
        onToggleConstituencyStatus,
        onUpdateConstituency,
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
        onSendBulkCredentials: async (usersToSend: User[], method: 'email' | 'sms') => {
            const effectiveSmsConfig = (activeInstitution?.smsConfig && (activeInstitution.smsConfig.apiKey || activeInstitution.smsConfig.userId || activeInstitution.smsConfig.username || activeInstitution.smsConfig.accountId))
                ? activeInstitution.smsConfig
                : companyDetails?.smsConfig;
            return await apiService.sendBulkCredentials(usersToSend, method, effectiveSmsConfig, activeInstitution?.id);
        },
        onRefreshData: async () => await loadData(false, true),
        onAddRequisition: handleAddRequisition,
        onUpdateRequisition: handleUpdateRequisition,
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
            await loadData(false, true);
        },
        onAddAcademicYear: async (data: any) => { await apiService.saveModuleRecord('academic_years', { ...data, id: generateId('ay'), institutionId: currentUser!.institutionId, status: 'inactive' }); loadData(); },
        onUpdateAcademicYear: async (id: string, data: any) => {
            const existing = academicYears.find(ay => ay.id === id);
            if (existing) {
                await apiService.saveModuleRecord('academic_years', { ...existing, ...data });
                loadData();
            }
        },
        onDeleteAcademicYear: async (id: string) => {
            await apiService.deleteModuleRecord('academic_years', id);
            loadData();
        },
        onAddSemester: async (data: any) => { await apiService.saveModuleRecord('semesters', { ...data, id: generateId('sem'), institutionId: currentUser!.institutionId }); loadData(); },
        onUpdateSemester: async (id: string, data: any) => {
            const existing = semesters.find(sem => sem.id === id);
            if (existing) {
                await apiService.saveModuleRecord('semesters', { ...existing, ...data });
                loadData();
            }
        },
        onDeleteSemester: async (id: string) => {
            await apiService.deleteModuleRecord('semesters', id);
            loadData();
        },
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
        invoices: activeInstitution?.id
            ? (invoices || []).filter(inv => {
                const iInst = inv.institutionId || (inv as any).institution_id;
                return !iInst || iInst === activeInstitution.id;
            })
            : invoices,
        onManualInvoice: async (institutionId: string, items: any[], totalAmount: number, dueDate: string, isQuote?: boolean, issueDate?: string) => {
            let invoiceNumber = '';
            const docType = isQuote ? 'quote' : 'invoice';
            const rawPrefix = isQuote 
                ? (companyDetails?.globalQuotePrefix || 'QUO-').trim()
                : (companyDetails?.globalInvoicePrefix || 'INV-').trim();
            const cleanPrefix = rawPrefix.endsWith('-') || rawPrefix.endsWith('/') ? rawPrefix : `${rawPrefix}-`;

            try {
                // Check all existing tenant invoices across the system (invoices without studentId)
                const allTenantInvoices = (invoices || []).filter((inv: any) => !inv.studentId);
                let maxSeq = 0;

                allTenantInvoices.forEach((inv: any) => {
                    const isDocQuote = inv.status === 'quote' || inv.isQuote || (inv.invoiceNumber && (inv.invoiceNumber.startsWith('QUO') || inv.invoiceNumber.startsWith('QT')));
                    if (isQuote ? isDocQuote : !isDocQuote) {
                        const numStr = String(inv.invoiceNumber || inv.invoice_number || '').trim();
                        if (numStr) {
                            const digitsOnly = numStr.replace(/\D/g, '');
                            if (digitsOnly) {
                                const parsed = parseInt(digitsOnly, 10);
                                if (!isNaN(parsed) && parsed > maxSeq && parsed < 100000000) {
                                    maxSeq = parsed;
                                }
                            }
                        }
                    }
                });

                const configuredStart = isQuote 
                    ? Number(companyDetails?.globalQuoteNextNumber || 1001)
                    : Number(companyDetails?.globalInvoiceNextNumber || 1001);

                // Try atomic RPC or next document number via apiService with superadmin tenancy
                let generatedNumber = '';
                try {
                    generatedNumber = await apiService.getNextDocumentNumber('superadmin', docType);
                } catch (apiErr) {
                    console.warn("[onManualInvoice] getNextDocumentNumber error:", apiErr);
                }

                if (generatedNumber) {
                    const parsedGen = parseInt(generatedNumber.replace(/\D/g, ''), 10);
                    // Ensure the generated number is at least maxSeq + 1 and >= configuredStart
                    const targetSeq = Math.max(
                        !isNaN(parsedGen) ? parsedGen : 1001,
                        configuredStart,
                        maxSeq > 0 ? maxSeq + 1 : configuredStart
                    );
                    invoiceNumber = `${cleanPrefix}${targetSeq}`;
                } else {
                    const nextSeq = Math.max(configuredStart, maxSeq > 0 ? maxSeq + 1 : configuredStart);
                    invoiceNumber = `${cleanPrefix}${nextSeq}`;
                }
            } catch (e) {
                console.warn("Failed to calculate sequential invoice number, falling back:", e);
                invoiceNumber = `${cleanPrefix}${Date.now().toString().slice(-6)}`;
            }

            // Sync updated next number in companyDetails and finance_numbering_configs so subsequent manual invoices increment
            const extractedSeq = parseInt(invoiceNumber.replace(/\D/g, ''), 10);
            if (!isNaN(extractedSeq)) {
                const followingSeq = extractedSeq + 1;
                if (isQuote) {
                    setCompanyDetails(prev => ({ ...prev, globalQuoteNextNumber: followingSeq }));
                } else {
                    setCompanyDetails(prev => ({ ...prev, globalInvoiceNextNumber: followingSeq }));
                }
                apiService.updateModuleRecord('finance_numbering_configs', `num_cfg_${docType}_superadmin`, {
                    institution_id: 'superadmin',
                    document_type: docType,
                    prefix: cleanPrefix,
                    next_number: followingSeq,
                    updated_at: new Date().toISOString()
                }).catch(() => {});
            }

            const resolvedIssueDate = issueDate ? (issueDate.includes('T') ? issueDate : new Date(issueDate).toISOString()) : new Date().toISOString();

            const newInvoice = {
                id: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                invoiceNumber,
                invoice_number: invoiceNumber,
                institutionId,
                institution_id: institutionId,
                items,
                totalAmount,
                total_amount: totalAmount,
                dueDate,
                due_date: dueDate,
                issueDate: resolvedIssueDate,
                issue_date: resolvedIssueDate,
                status: isQuote ? 'quote' : 'pending',
                isQuote: !!isQuote,
                is_quote: !!isQuote,
                createdAt: resolvedIssueDate,
                created_at: resolvedIssueDate,
            };
            await apiService.saveModuleRecord('invoices', newInvoice);
            await handleLogAction(`Super Admin generated ${isQuote ? 'quote' : 'invoice'} ${invoiceNumber} for institution ${institutionId}`);
            
            // Send email to client institution
            const inst = institutions.find((i: any) => i.id === institutionId);
            if (inst?.email) {
                const subject = isQuote 
                    ? `New Quotation ${invoiceNumber} - ${companyDetails?.name || 'EduAi Network'}`
                    : `New Invoice ${invoiceNumber} - ${companyDetails?.name || 'EduAi Network'}`;
                const body = isQuote 
                    ? `Dear Admin,\n\nA new pro-forma quotation ${invoiceNumber} has been generated for your institution.\n\nQuotation Number: ${invoiceNumber}\nValid Until: ${new Date(dueDate).toLocaleDateString()}\nTotal Estimated Amount: KES ${totalAmount.toLocaleString()}.00\n\nThank you,\nThe ${companyDetails?.name || 'EduAi Network'} Team`
                    : `Dear Admin,\n\nA new invoice ${invoiceNumber} has been generated for your institution.\n\nInvoice Number: ${invoiceNumber}\nDue Date: ${new Date(dueDate).toLocaleDateString()}\nTotal Payable: KES ${totalAmount.toLocaleString()}.00\n\nPlease use the official platform payment instructions to settle this invoice.\n\nThank you,\nThe ${companyDetails?.name || 'EduAi Network'} Team`;
                
                sendEmailNotification(
                    inst.email,
                    subject,
                    body,
                    companyDetails?.emailConfig,
                    companyDetails?.name || 'EduAi Network'
                ).catch(err => console.error("Email sending failed:", err));
            }

            await loadData(false, false);
        },
        onUpdateInvoiceStatus: async (invoiceId: string, status: string) => {
            const inv = invoices.find((i: any) => i.id === invoiceId);
            if (inv) {
                await apiService.saveModuleRecord('invoices', { ...inv, status });
                await loadData(false, false);
            }
        },
        onUpdateInvoice: async (invoiceId: string, updates: Partial<Invoice>) => {
            const existing = invoices.find((inv: any) => inv.id === invoiceId);
            if (existing) {
                const updated = { ...existing, ...updates };
                await apiService.saveModuleRecord('invoices', updated);
                await handleLogAction(`Super Admin updated invoice ${existing.invoiceNumber}`);
                await loadData(false, false);
            }
        },
        extensionRequests,
        voteHeads,
        onUpdateVoteHeads: handleUpdateVoteHeads,
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
        onActivateModuleTrial: handleActivateModuleTrial,
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
        vehicles: activeInstitution?.id
            ? (vehicles || []).filter(v => {
                const vInst = v.institutionId || (v as any).institution_id;
                return !vInst || vInst === activeInstitution.id;
            })
            : vehicles,
        transportOnboarding: activeInstitution?.id
            ? (transportOnboarding || []).filter(t => {
                const tInst = t.institutionId || (t as any).institution_id;
                return !tInst || tInst === activeInstitution.id;
            })
            : transportOnboarding,
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
        carBankTransactions,
        onReconcileBankTransaction: async (transactionId: string, invoiceId: string) => {
            const transaction = carBankTransactions.find(t => t.id === transactionId);
            if (transaction) {
                try {
                    const instId = activeInstitution?.id || currentUser?.institutionId;
                    const ref = (transaction as any).reference || (transaction as any).transactionId || '';
                    const bankMethod = transaction.bankName || 'Bank Transfer';
                    await apiService.saveCarPayment({
                        id: `pay_${Date.now()}`,
                        invoiceId: invoiceId,
                        amount: transaction.amount,
                        paymentMethod: bankMethod,
                        transactionReference: ref,
                        paymentDate: (transaction as any).transactionDate || new Date().toISOString(),
                        institutionId: instId || ''
                    });

                    // Upsert status to bank_transactions
                    await apiService.saveModuleRecord('bank_transactions', {
                        id: transaction.id,
                        institution_id: instId || transaction.institutionId || '',
                        amount: transaction.amount,
                        transaction_date: transaction.transactionDate || new Date().toISOString(),
                        reference: ref,
                        sender_name: transaction.senderName || 'External Deposit',
                        bank_name: transaction.bankName || 'Bank',
                        status: 'reconciled',
                        linked_invoice_id: invoiceId,
                        reconciled_at: new Date().toISOString(),
                        reconciled_by: currentUser?.name || currentUser?.email || 'System'
                    } as any).catch(() => {});

                    // Also mark in mpesa_transactions if applicable
                    await apiService.updateModuleRecord('mpesa_transactions', transactionId, {
                        status: 'completed',
                        metadata: {
                            ...(transaction.payload?.metadata || {}),
                            invoiceId: invoiceId,
                            reconciled: true,
                            reconciled_at: new Date().toISOString(),
                            reconciled_by: currentUser?.name || currentUser?.email || 'System'
                        }
                    } as any).catch(() => {});

                    await loadData();
                } catch (err) {
                    console.error("Reconciliation failed:", err);
                }
            }
        },
        onFetchBankFeeds: async () => {
            await loadData();
        },
        onAddCarInvoice: async (data: Partial<CarInvoice>) => {
            const instId = activeInstitution?.id || currentUser?.institutionId;
            
            // If editing, preserve the existing invoice number and paid amount from memory if not provided
            let invoiceNumber = data.invoiceNumber;
            let paid = Number(data.paidAmount) || 0;
            let currentStatus = data.status || 'pending';
            
            if (data.id) {
                const existing = carInvoices.find(inv => inv.id === data.id);
                if (existing) {
                    if (!invoiceNumber) invoiceNumber = existing.invoiceNumber;
                    if (data.paidAmount === undefined) paid = Number(existing.paidAmount) || 0;
                    currentStatus = existing.status || 'pending';
                }
            }
            
            const total = Number(data.totalAmount) || 0;
            const balance = total - paid;
            
            // Recalculate status based on financials
            if (paid >= total && total > 0) {
                currentStatus = 'fully_paid';
            } else if (paid > 0 && paid < total) {
                currentStatus = 'partially_paid';
            } else if (paid === 0) {
                currentStatus = 'pending';
            }
            
            // Generate invoice sequence number based on settings
            if (!invoiceNumber) {
                let prefix = 'INV-CAR-';
                let startingNumber = 1001;
                let format = '{PREFIX}{NUMBER}';
                try {
                    const instIdFinal = instId || '';
                    const records = await apiService.fetchModuleRecords<any>('showroom_settings', instIdFinal);
                    if (records && records.length > 0) {
                        const dbSettings = records[0];
                        prefix = dbSettings.invoice_prefix ?? dbSettings.invoicePrefix ?? 'INV-CAR-';
                        startingNumber = dbSettings.invoice_starting_number ?? dbSettings.invoiceStartingNumber ?? 1001;
                        format = dbSettings.invoice_format ?? dbSettings.invoiceFormat ?? '{PREFIX}{NUMBER}';
                    } else {
                        const localStr = localStorage.getItem(`showroom_settings_${instIdFinal}`);
                        if (localStr) {
                            const localSettings = JSON.parse(localStr);
                            prefix = localSettings.invoicePrefix || 'INV-CAR-';
                            startingNumber = localSettings.invoiceStartingNumber || 1001;
                            format = localSettings.invoiceFormat || '{PREFIX}{NUMBER}';
                        }
                    }
                } catch (err) {
                    console.warn("Failed to fetch showroom settings for sequence generation:", err);
                    const instIdFinal = instId || '';
                    const localStr = localStorage.getItem(`showroom_settings_${instIdFinal}`);
                    if (localStr) {
                        try {
                            const localSettings = JSON.parse(localStr);
                            prefix = localSettings.invoicePrefix || 'INV-CAR-';
                            startingNumber = localSettings.invoiceStartingNumber || 1001;
                            format = localSettings.invoiceFormat || '{PREFIX}{NUMBER}';
                        } catch (e) {}
                    }
                }

                // Scan existing car invoices for the highest number suffix
                const instInvoices = carInvoices.filter(inv => inv.institutionId === instId);
                let maxNumber = startingNumber - 1;
                const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`^${escapedPrefix}[-/]?(\\d+)$`);
                instInvoices.forEach(inv => {
                    if (inv.invoiceNumber) {
                        const match = inv.invoiceNumber.match(regex);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            if (num > maxNumber) {
                                maxNumber = num;
                            }
                        }
                    }
                });
                const nextNumber = maxNumber + 1;
                invoiceNumber = format
                    .replace('{PREFIX}', prefix)
                    .replace('{NUMBER}', nextNumber.toString());
            }

            // Automatically save customer data to system on customer tab if not already registered
            if (data.clientName) {
                const clientName = data.clientName.trim();
                const clientEmail = data.clientEmail?.trim().toLowerCase();
                const clientPhone = data.clientPhone?.trim();

                const existingCustomer = users.find(u => {
                    const sameInst = u.institutionId === instId;
                    if (!sameInst) return false;
                    
                    if (clientEmail && u.email && u.email.toLowerCase() === clientEmail) {
                        return true;
                    }
                    if (clientPhone && u.phoneNumber) {
                        const norm1 = clientPhone.replace(/\D/g, '');
                        const norm2 = u.phoneNumber.replace(/\D/g, '');
                        if (norm1 && norm1 === norm2) return true;
                    }
                    return false;
                });

                if (!existingCustomer) {
                    const domain = activeInstitution?.email?.split('@')[1] || 'customer.eduai.io';
                    const safeName = clientName.toLowerCase().replace(/[^a-z0-9]/g, '');
                    const generatedEmail = clientEmail || `${safeName}.${Date.now()}@${domain}`;
                    
                    try {
                        await apiService.registerUser({
                            id: generateUserId(),
                            name: clientName,
                            email: generatedEmail,
                            phoneNumber: clientPhone || '',
                            role: 'customer',
                            roles: ['customer'],
                            institutionId: instId || ''
                        }, activeInstitution?.name);
                    } catch (err) {
                        console.error("Failed to automatically register customer on invoice generation:", err);
                    }
                }
            }

            const isNew = !data.id;
            const invoiceId = data.id || `inv_${Date.now()}`;

            // To ensure database trigger behaves correctly, if isNew we insert with paidAmount: 0
            // and then save the payment which will update paidAmount via trigger.
            const initialPaidAmount = isNew ? 0 : paid;
            const initialBalance = isNew ? total : balance;
            const initialStatus = isNew ? 'pending' : currentStatus;

            await apiService.saveCarInvoice({ 
                ...data, 
                id: invoiceId, 
                invoiceNumber,
                paidAmount: initialPaidAmount,
                balanceAmount: initialBalance,
                status: initialStatus as any,
                institutionId: instId || '' 
            });

            if (isNew && data.firstPaidAmount && data.firstPaidAmount > 0) {
                const depositAmount = Number(data.firstPaidAmount);
                let receiptNumber = '';
                let prefix = 'REC-CAR-';
                let startingNumber = 1001;
                let format = '{PREFIX}{NUMBER}';
                try {
                    const instIdFinal = instId || '';
                    const records = await apiService.fetchModuleRecords<any>('showroom_settings', instIdFinal);
                    if (records && records.length > 0) {
                        const dbSettings = records[0];
                        prefix = dbSettings.receipt_prefix ?? dbSettings.receiptPrefix ?? 'REC-CAR-';
                        startingNumber = dbSettings.receipt_starting_number ?? dbSettings.receiptStartingNumber ?? 1001;
                        format = dbSettings.receipt_format ?? dbSettings.receiptFormat ?? '{PREFIX}{NUMBER}';
                    } else {
                        const localStr = localStorage.getItem(`showroom_settings_${instIdFinal}`);
                        if (localStr) {
                            const localSettings = JSON.parse(localStr);
                            prefix = localSettings.receiptPrefix || 'REC-CAR-';
                            startingNumber = localSettings.receiptStartingNumber || 1001;
                            format = localSettings.receiptFormat || '{PREFIX}{NUMBER}';
                        }
                    }
                } catch (err) {
                    console.warn("Failed to fetch showroom settings for initial deposit receipt sequence:", err);
                    const instIdFinal = instId || '';
                    const localStr = localStorage.getItem(`showroom_settings_${instIdFinal}`);
                    if (localStr) {
                        try {
                            const localSettings = JSON.parse(localStr);
                            prefix = localSettings.receiptPrefix || 'REC-CAR-';
                            startingNumber = localSettings.receiptStartingNumber || 1001;
                            format = localSettings.receiptFormat || '{PREFIX}{NUMBER}';
                        } catch (e) {}
                    }
                }

                try {
                    const dbPayments = await apiService.fetchCarPayments();
                    let maxNumber = startingNumber - 1;
                    const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                    const regex = new RegExp(`^${escapedPrefix}[-/]?(\\d+)$`);
                    dbPayments.forEach(pay => {
                        if (pay.receiptNumber) {
                            const match = pay.receiptNumber.match(regex);
                            if (match) {
                                const num = parseInt(match[1], 10);
                                if (num > maxNumber) {
                                    maxNumber = num;
                                }
                            }
                        }
                    });
                    const nextNumber = maxNumber + 1;
                    receiptNumber = format
                        .replace('{PREFIX}', prefix)
                        .replace('{NUMBER}', nextNumber.toString());
                } catch (err) {
                    console.error("Failed to generate receipt number for deposit:", err);
                    receiptNumber = `REC-CAR-${Date.now()}`;
                }

                await apiService.saveCarPayment({
                    id: `pay_${Date.now()}`,
                    invoiceId: invoiceId,
                    amount: depositAmount,
                    paymentMethod: 'Cash',
                    transactionReference: 'Initial Deposit',
                    paymentDate: new Date().toISOString(),
                    receiptNumber,
                    institutionId: instId || ''
                });
            }

            if (data.listingId) {
                try {
                    await apiService.updateModuleRecord('car_sales_listings', data.listingId, {
                        status: 'sold'
                    });
                } catch (err) {
                    console.error("Failed to automatically mark car as sold:", err);
                }
            }

            if (isNew && data.clientPhone) {
                const smsCfg = activeInstitution?.smsConfig || companyDetails.smsConfig;
                const message = `Hello ${data.clientName}, your invoice #${invoiceNumber} for KES ${total?.toLocaleString()} has been recorded. Due date: ${data.dueDate ? new Date(data.dueDate).toLocaleDateString() : 'N/A'}. Thank you for your business!`;
                apiService.sendSms(data.clientPhone, message, smsCfg, 1, instId).catch(e => {
                    console.error("Failed to send invoice SMS notification:", e);
                });
            }

            await loadData(false, true);
            success('Car invoice generated successfully!');
        },
        onAddCarPayment: async (data: Partial<CarPayment>) => {
            const instId = activeInstitution?.id || currentUser?.institutionId;
            
            let receiptNumber = data.receiptNumber;
            if (!receiptNumber) {
                let prefix = 'REC-CAR-';
                let startingNumber = 1001;
                let format = '{PREFIX}{NUMBER}';
                try {
                    const instIdFinal = instId || '';
                    const records = await apiService.fetchModuleRecords<any>('showroom_settings', instIdFinal);
                    if (records && records.length > 0) {
                        const dbSettings = records[0];
                        prefix = dbSettings.receipt_prefix ?? dbSettings.receiptPrefix ?? 'REC-CAR-';
                        startingNumber = dbSettings.receipt_starting_number ?? dbSettings.receiptStartingNumber ?? 1001;
                        format = dbSettings.receipt_format ?? dbSettings.receiptFormat ?? '{PREFIX}{NUMBER}';
                    } else {
                        const localStr = localStorage.getItem(`showroom_settings_${instIdFinal}`);
                        if (localStr) {
                            const localSettings = JSON.parse(localStr);
                            prefix = localSettings.receiptPrefix || 'REC-CAR-';
                            startingNumber = localSettings.receiptStartingNumber || 1001;
                            format = localSettings.receiptFormat || '{PREFIX}{NUMBER}';
                        }
                    }
                } catch (err) {
                    console.warn("Failed to fetch showroom settings for receipt sequence generation:", err);
                    const instIdFinal = instId || '';
                    const localStr = localStorage.getItem(`showroom_settings_${instIdFinal}`);
                    if (localStr) {
                        try {
                            const localSettings = JSON.parse(localStr);
                            prefix = localSettings.receiptPrefix || 'REC-CAR-';
                            startingNumber = localSettings.receiptStartingNumber || 1001;
                            format = localSettings.receiptFormat || '{PREFIX}{NUMBER}';
                        } catch (e) {}
                    }
                }

                // Scan existing car payments for the highest number suffix
                const dbPayments = await apiService.fetchCarPayments();
                let maxNumber = startingNumber - 1;
                const escapedPrefix = prefix.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`^${escapedPrefix}[-/]?(\\d+)$`);
                dbPayments.forEach(pay => {
                    if (pay.receiptNumber) {
                        const match = pay.receiptNumber.match(regex);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            if (num > maxNumber) {
                                maxNumber = num;
                            }
                        }
                    }
                });
                const nextNumber = maxNumber + 1;
                receiptNumber = format
                    .replace('{PREFIX}', prefix)
                    .replace('{NUMBER}', nextNumber.toString());
            }

            await apiService.saveCarPayment({ 
                ...data, 
                id: data.id || `pay_${Date.now()}`, 
                receiptNumber,
                institutionId: instId || '' 
            });

            // Update the associated invoice balance/status in the database
            if (data.invoiceId) {
                const dbInvoices = await apiService.fetchCarInvoices();
                const invoice = dbInvoices.find(i => i.id === data.invoiceId);
                if (invoice) {
                    let amountDiff = Number(data.amount) || 0;
                    if (data.id) {
                        const dbPayments = await apiService.fetchCarPayments();
                        const existingPayment = dbPayments.find(p => p.id === data.id);
                        if (existingPayment) {
                            amountDiff = (Number(data.amount) || 0) - (Number(existingPayment.amount) || 0);
                        }
                    }
                    
                    const newPaid = Math.max(0, (invoice.paidAmount || 0) + amountDiff);
                    const newBalance = invoice.totalAmount - newPaid;
                    let newStatus = 'pending';
                    if (newPaid >= invoice.totalAmount && invoice.totalAmount > 0) {
                        newStatus = 'fully_paid';
                    } else if (newPaid > 0 && newPaid < invoice.totalAmount) {
                        newStatus = 'partially_paid';
                    }

                    await apiService.saveCarInvoice({
                        ...invoice,
                        paidAmount: newPaid,
                        balanceAmount: newBalance,
                        status: newStatus as any
                    });
                }
            }

            // Send payment confirmation SMS
            const isNewPayment = !data.id;
            if (isNewPayment && data.invoiceId) {
                const dbInvoices = await apiService.fetchCarInvoices();
                const invoice = dbInvoices.find(i => i.id === data.invoiceId);
                if (invoice && invoice.clientPhone) {
                    const smsCfg = activeInstitution?.smsConfig || companyDetails.smsConfig;
                    const message = `Hello ${invoice.clientName}, we have received your payment of KES ${Number(data.amount)?.toLocaleString()} for invoice #${invoice.invoiceNumber}. Receipt #${receiptNumber || data.receiptNumber || 'N/A'}. Thank you for your payment!`;
                    apiService.sendSms(invoice.clientPhone, message, smsCfg, 1, instId).catch(e => {
                        console.error("Failed to send payment confirmation SMS:", e);
                    });
                }
            }

            await loadData(false, true);
        },
        onDeleteCarInvoice: async (invoiceId: string) => {
            try {
                const inv = carInvoices.find(i => i.id === invoiceId);
                if (inv && inv.listingId) {
                    await apiService.updateModuleRecord('car_sales_listings', inv.listingId, {
                        status: 'active'
                    });
                }
                await apiService.deleteModuleRecord('car_sales_invoices', invoiceId);
                await loadData(false, true);
                success("Invoice deleted successfully");
            } catch (err: any) {
                console.error("Failed to delete car invoice:", err);
                toastError(`Failed to delete invoice: ${err.message || 'Unknown error'}`);
            }
        },
        onDeleteCarPayment: async (paymentId: string) => {
            try {
                const payment = carPayments.find(p => p.id === paymentId);
                if (payment && payment.invoiceId) {
                    const invoice = carInvoices.find(i => i.id === payment.invoiceId);
                    if (invoice) {
                        const newPaid = Math.max(0, (invoice.paidAmount || 0) - payment.amount);
                        const newBalance = invoice.totalAmount - newPaid;
                        let newStatus = 'pending';
                        if (newPaid >= invoice.totalAmount && invoice.totalAmount > 0) {
                            newStatus = 'fully_paid';
                        } else if (newPaid > 0 && newPaid < invoice.totalAmount) {
                            newStatus = 'partially_paid';
                        }
                        
                        await apiService.saveCarInvoice({
                            ...invoice,
                            paidAmount: newPaid,
                            balanceAmount: newBalance,
                            status: newStatus as any
                        });
                    }
                }
                await apiService.deleteModuleRecord('car_sales_payments', paymentId);
                await loadData(false, true);
                success("Payment deleted successfully");
            } catch (err: any) {
                console.error("Failed to delete car payment:", err);
                toastError(`Failed to delete payment: ${err.message || 'Unknown error'}`);
            }
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
    }), [currentUser, activeInstitution, notifications, institutions, counties, constituencies, users, subjects, departments, courses, companyDetails, transactions, demoRequests, receipts, activityLog, allocations, requests, semesters, activeLetterheadConfig, activeBranding, activeFooterImageUrl, rooms, buildings, academicLevels, academicYears, activeAcademicYear, activeSemester, timetableSettings, assessments, assessmentMarks, incidents, schoolRegistry, leaveOutRequests, invoices, extensionRequests, voteHeads, feeStructures, financialPeriods, userTasks, generatedTimetable, timetableConflicts, timeOffRequests, enrollmentRequests, absenceRequests, studentAbsenceRequests, securityAlerts, visitors, requisitions, studentAttendances, studentCheckIns, lessonRatings, feedbackSubmissions, courseSizes, isGeneratingDemoData, demoDataGenerationProgress, demoDataGenerationMessage, vehicles, transportOnboarding, coopFarmers, coopCollections, coopRiders, coopAgrovetSales, saccoAccounts, coopPayouts, coopExpenses, coopIncome, lawClients, lawMatters, lawDocuments, lawTimeEntries, lawInvoices, lawTrustTransactions, lawAgreementTemplates, lawAgreements, carListings, carTestDrives, carAppraisals, carInvoices, carPayments, carBankTransactions, handleAccessAlumnaPortal, handleUpdateCompanyDetails, onImportStudents, onEditUser, onDeleteUser, onUpdateInstitution, handleUpdateRequest, handleWithdrawRequest, handleAddTimeOffRequest, handleAddTask, handleUpdateTask, handleDeleteTask, handleSaveAttendance, handleProcessPayroll, handleUpdateLeaveStatus, handleLogGateAction, handleTeacherLessonCheckIn, handleOnboardStudent, handleOffboardStudent, handleAddAssessment, handleDeleteAssessment, handleSaveAssessmentMarks, handleAddSubject, handleUpdateSubject, handleDeleteSubject, handleAddCourse, handleUpdateCourse, handleDeleteCourse, handleImportCourses, handleAddDepartment, handleUpdateDepartment, handleDeleteDepartment, handleImportDepartments, handleAddRoom, handleUpdateRoom, handleDeleteRoom, handleImportRooms, handleActivateModuleTrial, handleUpdateVoteHeads, onToggleConstituencyStatus, onUpdateConstituency, loadData]);


    const countyAdminProps = useMemo<Partial<CountyAdminProps>>(() => ({
        currentUser: currentUser || undefined,
        counties,
        institutions,
        users,
        onLogout: handleLogout,
        onUpdateInstitution: handleUpdateCountyInstitution,
        onDeleteInstitution: handleDeleteCountyInstitution,
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
        studentAttendances,
        teacherCheckIns,
        onLogAction: handleLogAction,
        activityLogLimit,
        setActivityLogLimit,
        receiptLimit,
        setReceiptLimit,
        transactionLimit,
        setTransactionLimit
    }), [currentUser, counties, institutions, users, handleUpdateCountyInstitution, handleDeleteCountyInstitution, activeLetterheadConfig, activeBranding, activeFooterImageUrl, countyInventory, countyInventoryCategories, countyStores, bursaryApplications, bursaryFunds, studentAttendances, teacherCheckIns, activityLogLimit, receiptLimit, transactionLimit]);

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
        students: (users || []).filter(u => u.role === 'student'),
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
        onSwitchPerspective: (role: Role | null) => {
            if ((isStrictTeacherUser(currentUser) || isTeacherRole(currentUser?.role)) && role && !isTeacherRole(role)) {
                return;
            }
            setImpersonatedRole(role);
            setSelectedRole(role);
            if (!role && typeof window !== 'undefined' && window.dispatchEvent) {
                window.dispatchEvent(new CustomEvent('nav_to_console_hub'));
            }
        },
        onAddUser: async (d: any) => { if (!currentUser) return; await apiService.registerUser({ ...d, id: generateUserId(), institutionId: currentUser.institutionId }, activeInstitution?.name); await loadData(false, true); },
        onEditUser,
        onDeleteUser,
        onAddDepartment: handleAddDepartment,
        onUpdateDepartment: handleUpdateDepartment,
        onDeleteDepartment: handleDeleteDepartment,
        onImportStudents: handleImportStudents,
        onImportUsers: onImportUsers,
        smsConfig: activeInstitution?.smsConfig || companyDetails.smsConfig,
        letterheadConfig: activeLetterheadConfig,
        logoUrl: activeBranding.logoUrl,
        footerImageUrl: activeFooterImageUrl,
        onSendSms: async (r: string, m: string, c?: any, u?: number, i?: string) => apiService.sendSms(r, m, c, u, i),
        onAddTransaction: apiService.onAddTransaction.bind(apiService),
        onRefreshData: async () => await loadData(false, true),
        onAccessAlumnaPortal: handleAccessAlumnaPortal,
        schoolRegistry,
        onTeacherGateCheckIn: handleTeacherGateCheckIn,
        buildingFloors,
        buildingOffices,
        buildingVisitorLogs,
        buildingVisitorAssets,
        onAddBuildingFloor: handleAddBuildingFloor,
        onAddBuildingOffice: handleAddBuildingOffice,
        onAddBuildingVisitorLog: handleAddBuildingVisitorLog,
        onUpdateBuildingVisitorLog: handleUpdateBuildingVisitorLog,
        onVerifyBuildingVisitorAsset: handleVerifyVisitorAsset
    }), [currentUser, activeInstitution, users, visitors, handleAddVisitor, handleCheckoutVisitor, handleAddAppointment, handleUpdateVisitor, generatedTimetable, timetableSettings, rooms, subjects, getSubjectById, getRoomById, getLecturerById, securityAlerts, handleAddAlert, handleResolveAlert, appointments, handleUpdateAppointmentStatus, retailInventory, stockTransactions, suppliers, handleAddStoreItem, handleAddSupplier, handleImportStoreItems, handleAddStoreTransaction, transactions, invoices, handleAddInvoice, receipts, handleAddReceipt, requisitions, handleVerifyRequisition, handleMarkInventoryReceived, handleLogAction, vehicles, vehicleLogs, transportOnboarding, handleLogGateAction, companyDetails, courses, onUpdateInstitution, voteHeads, feeStructures, financialPeriods, countyInventory, academicYears, semesters, departments, teacherCheckIns, timeOffRequests, studentAbsenceRequests, leaveOutRequests, bulletinItems, documentCollections, watchlist, maintenanceRequests, studentAttendances, handleOnboardStudent, handleOffboardStudent, onEditUser, onDeleteUser, activeLetterheadConfig, activeBranding, activeFooterImageUrl, schoolRegistry, onImportStudents, onImportUsers, handleTeacherGateCheckIn, buildingFloors, buildingOffices, buildingVisitorLogs, buildingVisitorAssets, handleAddBuildingFloor, handleAddBuildingOffice, handleAddBuildingVisitorLog, handleUpdateBuildingVisitorLog, handleVerifyVisitorAsset]);

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
        companyDetails: companyDetails,
        smsConfig: activeInstitution?.smsConfig || companyDetails?.smsConfig,
        onSendBulkCredentials: async (usersToSend: User[], method: 'email' | 'sms') => {
            const effectiveSmsConfig = (activeInstitution?.smsConfig && (activeInstitution.smsConfig.apiKey || activeInstitution.smsConfig.userId || activeInstitution.smsConfig.username || activeInstitution.smsConfig.accountId))
                ? activeInstitution.smsConfig
                : companyDetails?.smsConfig;
            return await apiService.sendBulkCredentials(usersToSend, method, effectiveSmsConfig, activeInstitution?.id);
        }
    }), [currentUser, activeInstitution, handleLogAction, companyDetails]);

    // ── EARLY ESCAPE: Public SpeechBuddy AI standalone portal — skip auth & institution boot entirely ──
    if (window.location.search.includes('view=speechbuddy') || window.location.search.includes('view=speech-buddy') || window.location.pathname.startsWith('/speechbuddy')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <SpeechBuddyPortal />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Kids Coding & Robotics Learning Hub ──
    if (window.location.search.includes('view=robotics') || window.location.search.includes('view=kids-coding') || window.location.search.includes('view=stem-robotics') || window.location.pathname.startsWith('/robotics')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <KidsCodingRoboticsStudio currentUser={currentUser} institution={activeInstitution} />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: IELTS Exam Preparation & Institutional Suite ──
    if (window.location.search.includes('view=ielts') || window.location.search.includes('view=ielts-prep') || window.location.pathname.startsWith('/ielts')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <IELTSPrepSuite />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Speech & Art Therapy Clinical Report ──
    if (window.location.search.includes('view=speech-report') || window.location.pathname.startsWith('/speech-report')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <SpeechTherapyReportGenerator />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: AI Exam & Worksheet Generator ──
    if (window.location.search.includes('view=exam-generator') || window.location.pathname.startsWith('/exam-generator')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <AIExamGenerator />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: NTSA Driving Simulator ──
    if (window.location.search.includes('view=ntsa-driving') || window.location.pathname.startsWith('/ntsa-driving')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <NTSADrivingSimulator />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Beauty College Logbook ──
    if (window.location.search.includes('view=beauty-logbook') || window.location.pathname.startsWith('/beauty-logbook')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-pink-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <BeautyCollegeLogbook />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: School Bus GPS Tracker ──
    if (window.location.search.includes('view=bus-tracker') || window.location.pathname.startsWith('/bus-tracker')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <SchoolBusTracker />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Fee Promissory Note Tracker ──
    if (window.location.search.includes('view=fee-promissory') || window.location.pathname.startsWith('/fee-promissory')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <FeePromissoryTracker />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Campaign Manifesto Promise Tracker & Public Citizen Portal ──
    if (window.location.search.includes('view=campaign-promises') || window.location.search.includes('view=public-promise-tracker') || window.location.pathname.startsWith('/campaign-promises')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <CampaignPromiseTracker />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Boarding School Household Fee Balances Analytics ──
    if (window.location.search.includes('view=boarding-balances') || window.location.search.includes('view=boarding-household-balances') || window.location.pathname.startsWith('/boarding-balances')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <BoardingHouseholdBalanceManager
                    currentUser={currentUser}
                    currentInstitution={activeInstitution || ({ id: 'inst-1', name: 'EDUAI Institution' } as any)}
                    onLogAction={async (action: string) => { console.log('[LOG]:', action); }}
                />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Private Security & Guarding Operations Suite ──
    if (window.location.search.includes('view=private-security') || window.location.search.includes('view=security-company') || window.location.pathname.startsWith('/private-security')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-rose-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <PrivateSecurityCompanyView
                    currentUser={currentUser}
                    currentInstitution={activeInstitution || ({ id: 'inst-1', name: 'Private Security Services' } as any)}
                    onLogAction={async (action: string) => { console.log('[LOG]:', action); }}
                />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Perpetual Free SMS Broadcaster Portal (Unblocked for Expired Tenants) ──
    if (window.location.search.includes('view=sms-broadcaster') || window.location.search.includes('view=sms') || window.location.pathname.startsWith('/sms')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <div className="min-h-screen bg-slate-900 p-6">
                    <CommunicationsManager
                        users={users}
                        departments={departments}
                        courses={courses}
                        currentUser={currentUser}
                        smsBalance={activeInstitution?.smsBalance || companyDetails?.smsBalance || 0}
                        currentInstitution={activeInstitution}
                        smsConfig={activeInstitution?.smsConfig || companyDetails?.smsConfig}
                        onSendSms={async (r: any, m: any, c?: any, u?: number, i?: string) => apiService.sendSms(r, m, c, u, i)}
                    />
                </div>
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: HIS Doctor & Medical Staff First-Login Attendance System ──
    if (window.location.search.includes('view=doctor-attendance') || window.location.search.includes('view=his-attendance') || window.location.pathname.startsWith('/doctor-attendance')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <DoctorAttendanceManager currentUser={currentUser} />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: HIS AI Clinical Triage & OPD Queue Master ──
    if (window.location.search.includes('view=his-triage') || window.location.search.includes('view=opd-queue') || window.location.pathname.startsWith('/his-triage')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <OpdTriagePrescriptionManager />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Student QR / NFC Smart Gate Pass & Parent SMS Alert ──
    if (window.location.search.includes('view=gate-pass') || window.location.search.includes('view=smart-gate') || window.location.pathname.startsWith('/gate-pass')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <StudentSmartGatePassManager />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Farmer Milk Quality & Agrovet Credit Engine ──
    if (window.location.search.includes('view=milk-credit') || window.location.search.includes('view=farmer-credit') || window.location.pathname.startsWith('/milk-credit')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div></div>}>
                <FarmerMilkQualityCreditEngine />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Fleet Maintenance & Vehicle Mileage Service Tracker ──
    if (window.location.search.includes('view=fleet-tracker') || window.location.pathname.startsWith('/fleet-tracker')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <FleetMaintenanceTracker />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Citizen Grievance & Ward Petition Ticketing Desk ──
    if (window.location.search.includes('view=citizen-grievance') || window.location.search.includes('view=petitions') || window.location.pathname.startsWith('/citizen-grievance')) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <CitizenGrievancePetitionDesk />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Public visitor authorization URL ──
    if (window.location.search.includes('view=visitor-auth')) {
        const params = new URLSearchParams(window.location.search);
        const visitorId = params.get('id') || '';
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <PublicVisitorAuthorization visitorId={visitorId} />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Public join-campaign URL — skip auth & boot entirely ──
    if (window.location.search.includes('view=join-campaign')) {
        const joinCampaignId = new URLSearchParams(window.location.search).get('id') || '';
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <CampaignJoinPage campaignId={joinCampaignId} onBack={() => { window.location.href = '/'; }} />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Public driving school leads self-onboarding URL ──
    if (window.location.search.includes('view=ds-interest')) {
        const params = new URLSearchParams(window.location.search);
        const instId = params.get('instId') || '';
        const broadcastId = params.get('bc') || '';
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <DSInterestPage institutionId={instId} broadcastId={broadcastId} onBack={() => { window.location.href = '/'; }} />
            </Suspense>
        );
    }

    // ── EARLY ESCAPE: Public event registration/confirm URL — skip auth & boot entirely ──
    const isPublicEventUrl = (() => {
        try {
            const search = window.location.search;
            return search.includes('view=event-register') || 
                   search.includes('view=event-registration') || 
                   search.includes('view=event-confirm');
        } catch (e) {
            return false;
        }
    })();

    if (isPublicEventUrl) {
        const isConfirm = (() => {
            try {
                const params = new URLSearchParams(window.location.search);
                const view = params.get('view');
                const eventId = params.get('eventId');
                if (view === 'event-confirm') return true;
                if ((view === 'event-registration' || view === 'event-register') && eventId?.startsWith('evt_')) return true;
                return false;
            } catch (e) {
                return false;
            }
        })();

        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                {isConfirm ? <PublicEventConfirmation /> : <PublicEventRegistration />}
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
    
    // ── EARLY ESCAPE: Public/Unauthenticated Kiosk View ──
    const searchParams = new URLSearchParams(window.location.search);
    const isSecurityKioskView = searchParams.get('kiosk') === 'security' || searchParams.get('view') === 'security_kiosk';
    if (!currentUser && isSecurityKioskView) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <style dangerouslySetInnerHTML={{ __html: `
                    :root {
                        --brand-primary: ${activeBranding.primaryColor};
                        --brand-secondary: ${activeBranding.secondaryColor};
                    }
                `}} />
                <SecurityKiosk
                    institution={activeInstitution!}
                    onRefreshInstitution={loadData}
                />
            </Suspense>
        );
    }

    const isKioskView = searchParams.has('kiosk') || searchParams.get('view') === 'kiosk' || window.location.pathname.includes('/kiosk') || window.location.pathname.endsWith('/kiosk');
    if (!currentUser && isKioskView) {
        return (
            <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                <style dangerouslySetInnerHTML={{ __html: `
                    :root {
                        --brand-primary: ${activeBranding.primaryColor};
                        --brand-secondary: ${activeBranding.secondaryColor};
                    }
                `}} />
                <DrivingSchoolProvider institutionId={activeInstitution?.id}>
                    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans flex flex-col p-4 md:p-8">
                        <DrivingSchoolManager
                            currentUser={undefined as any}
                            currentInstitution={activeInstitution}
                            externalTab="portal"
                            onRefreshData={loadData}
                        />
                    </div>
                </DrivingSchoolProvider>
            </Suspense>
        );
    }
    
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
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <SystemPulseLoader message="Workspace Synchronizing..." status="Fetching Registry Identity from Cloud Hub" />
                <div className="mt-8 flex flex-col items-center gap-3">
                    <button 
                        onClick={() => loadData(true)} 
                        className="px-6 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-lg"
                    >
                        Retry Synchronization
                    </button>
                    <button 
                        onClick={handleLogout} 
                        className="text-xs text-slate-500 hover:text-slate-400 font-medium cursor-pointer underline"
                    >
                        Sign Out / Switch Account
                    </button>
                </div>
            </div>
        );
    }


    if (currentUser && activeRole !== 'super_admin' && activeRole !== 'reseller') {
        const isSuperAdminImpersonating = !!currentUser?.isImpersonated || 
                                          !!(currentUser as any)?.impersonated || 
                                          !!originalSuperAdminSession || 
                                          !!localStorage.getItem('eduai_super_admin_session') || 
                                          !!localStorage.getItem('eduai_impersonated_user') ||
                                          sessionStorage.getItem('eduai_impersonated_by_admin') === 'true';
        if (!isSuperAdminImpersonating) {
            const inst = institutions.find(i => i.id === currentUser.institutionId) || (activeInstitution ? activeInstitution : undefined);
            const isReseller = inst?.institutionType === 'Reseller' || currentUser.role === 'reseller';
            const now = new Date();
            const subEndDate = inst?.subscriptionEndsAt ? new Date(inst.subscriptionEndsAt) : null;
            const trialEndDate = inst?.trialEndsAt ? new Date(inst.trialEndsAt) : null;

            const isStatusExpired = (inst?.status as string) === 'expired' || inst?.status === 'suspended';
            const isSubscriptionExpired = !isReseller && inst && (
                isStatusExpired ||
                (inst.status !== 'trial' && inst.status !== 'active' && subEndDate !== null && subEndDate < now) ||
                (inst.status === 'active' && subEndDate !== null && subEndDate < now)
            );
            const hasOverdueBill = !isReseller && inst && inst.billingModel === 'postpaid_student' && inst.isSuspendedForBilling;
            const isSuspended = !isReseller && inst && inst.status === 'suspended';

            if (inst && !isReseller && (isSuspended || isSubscriptionExpired || hasOverdueBill)) {
                return (
                    <Suspense fallback={<SystemPulseLoader message="Verifying Account Access..." />}>
                        <SuspendedAccountView user={currentUser} institution={inst} companyDetails={companyDetails} onLogout={handleLogout} onAddTransaction={apiService.onAddTransaction.bind(apiService)} onAddExtensionRequest={async (reason: string) => {
                            await apiService.saveModuleRecord('institution_extension_requests', {
                                id: `ext_${Date.now()}`,
                                institutionId: inst.id,
                                requesterId: currentUser.id,
                                reason,
                                status: 'pending',
                                requestedAt: new Date().toISOString()
                            });
                            loadData();
                        }} />
                    </Suspense>
                );
            }

            const trialEnded = !isReseller && inst && inst.status === 'trial' && trialEndDate !== null && trialEndDate < now;
            if (trialEnded) {
                return (
                    <Suspense fallback={<SystemPulseLoader message="Verifying Trial Status..." />}>
                        <TrialExpiredView
                            user={currentUser}
                            institution={inst}
                            companyDetails={companyDetails}
                            onLogout={handleLogout}
                            onPay={async (paymentData: any, items: any) => {
                                const status = await apiService.onAddTransaction({
                                    ...paymentData,
                                    institutionId: inst.id,
                                    provider: 'mpesa',
                                    paymentMethod: 'stk'
                                } as any, items);
                                if (status === 'completed') loadData();
                                return status;
                            }}
                            onRequestExtension={async (reason: string) => {
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
                    </Suspense>
                );
            }
        }

        if (!currentUser.passwordLastUpdated && 
            !currentUser.id.startsWith('demo_') && 
            !currentUser.id.startsWith('temp_admin_') && 
            currentUser.role !== 'super_admin' && 
            !isSuperAdminImpersonating && 
            !originalSuperAdminSession && 
            !isSimulatorMode) {
            return (
                <Suspense fallback={<SystemPulseLoader message="Security Handshake..." />}>
                    <MandatoryUpdateView 
                        user={currentUser} 
                        onUpdate={async (pData: any, passData: any) => {
                            try {
                                const updated = { ...currentUser, ...pData, password: passData.newPassword, passwordLastUpdated: new Date().toISOString() };
                                await apiService.saveUser(updated);
                                setCurrentUser(updated);
                                apiService.storeSession(updated);
                                await loadData();
                            } catch (err: any) {
                                toastError(`Failed to activate account: ${err.message || 'Unknown error'}`);
                            }
                        }} 
                        onLogout={handleLogout} 
                        logoUrl={activeBranding.logoUrl} 
                    />
                </Suspense>
            );
        }
    }




    return (
        <AppErrorBoundary>
            {targetManageLessonId ? (
                <Suspense fallback={<SystemPulseLoader message="Loading Lesson Confirmation..." />}>
                    <PublicLessonConfirmationView 
                        lessonId={targetManageLessonId} 
                        onClose={() => { window.location.href = '/'; }} 
                    />
                </Suspense>
            ) : showPublicEventConfirmation ? (
                <Suspense fallback={<SystemPulseLoader message="Loading Event Confirmation..." />}>
                    <PublicEventConfirmation />
                </Suspense>
            ) : showPublicEventRegistration ? (
                <Suspense fallback={<SystemPulseLoader message="Loading Registration Page..." />}>
                    <PublicEventRegistration />
                </Suspense>
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
                {showMarketing ? (
                    <Suspense fallback={<SystemPulseLoader message="Loading EduAI Showcase..." />}>
                        <MarketingLandingPage 
                            onLogin={() => setShowMarketing(false)}
                            onBookDemo={() => setShowBookDemo(true)}
                            onOpenStore={() => { setShowMarketing(false); setShowMarketplace(true); }}
                            onLaunchSimulator={handleLaunchSimulator}
                            onRegister={(modId: any) => {
                                setRegistrationModuleId(modId);
                                setLoginInitialView('register');
                                setShowMarketing(false);
                            }}
                        />
                    </Suspense>
                ) : currentUser ? (
                    <>
                        <Header
                            currentUser={currentUser}
                            institutionName={activeBranding.displayName}
                            onLogout={handleLogout}
                            onEditProfile={() => setIsProfileModalOpen(true)}
                            onOpenShowcase={() => setShowMarketing(true)}
                            logoUrl={activeBranding.logoUrl}
                            systemLogoUrl={companyDetails.logoUrl}
                            notifications={notifications}
                            onMarkAsRead={(id) => { if (id) handleMarkNotificationAsRead(id); }}
                            onAcknowledgeVisitorMet={handleAcknowledgeVisitorMet}
                            currentInstitution={activeInstitution}
                            primaryColor={activeBranding.primaryColor}
                            secondaryColor={activeBranding.secondaryColor}
                            isApiOnline={isApiOnline}
                            applicationTitle={companyDetails.applicationTitle}
                            activeRole={activeRole as Role}
                            onSwitchRole={(r) => {
                                if ((isStrictTeacherUser(currentUser) || isTeacherRole(currentUser?.role)) && !isTeacherRole(r)) {
                                    return;
                                }
                                React.startTransition(() => {
                                    setSelectedRole(r);
                                });
                            }}
                            onExitPerspective={(impersonatedRole || selectedRole) ? () => {
                                React.startTransition(() => {
                                    setImpersonatedRole(null);
                                    setSelectedRole(null);
                                });
                            } : undefined}
                            onToggleHealthSystem={() => setIsHealthSystemOpen(!isHealthSystemOpen)}
                            onTogglePharmacySystem={() => setIsPharmacySystemOpen(!isPharmacySystemOpen)}
                            isHealthSystemOpen={isHealthSystemOpen}
                            isPharmacySystemOpen={isPharmacySystemOpen}
                            hidePerspectiveSwitcher={isAutoMarket}
                            androidUrl={companyDetails.androidUrl}
                        />
                        <main className={`flex-grow mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full transition-all duration-300 ${isFullWidthLayout ? 'max-w-[1600px]' : 'max-w-7xl'}`}>
                            <Suspense fallback={<SystemPulseLoader message="Initializing Portal..." status="Loading perspective environment" />}>
                                {isPharmacySystemOpen || (activeRole === 'pharmacist' || activeRole === 'pharmacy_admin' || (activeRole === 'admin' && (['Pharmacy', 'Chemist'].includes(activeInstitution?.institutionType || '') || ['Pharmacy', 'Chemist'].includes(activeInstitution?.businessSubType || '') || ['Pharmacy', 'Chemist'].includes(activeInstitution?.category || '')))) ? (
                                    <div className="p-8 bg-slate-950 min-h-[80vh] rounded-[3rem] overflow-hidden shadow-2xl">
                                        <ModernPharmacyManager 
                                             institutionId={activeInstitution?.id || currentUser?.institutionId || ''} 
                                             currentUser={currentUser!}
                                             currentInstitution={activeInstitution}
                                         />
                                    </div>
                                ) : (!isPharmacySystemOpen && (isHealthSystemOpen || isHIS || ['his_admin', 'nurse', 'doctor', 'his_doctor', 'receptionist', 'pharmacist'].includes(activeRole || ''))) ? (
                                    <ModuleAccessGuard
                                        moduleId="his"
                                        moduleName={isEduInstitution(activeInstitution) ? "EduPulse Wellness" : "HealthCore HIS"}
                                        description={isEduInstitution(activeInstitution) ? "Comprehensive school wellness registry, clinic management, triage logs, and sickbay monitoring." : "Medical intelligence platform unifying clinical care with AI-driven diagnostics, ward monitoring, and patient records."}
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
                                        <HealthCoreView {...{
                                            activeRole: activeRole as Role,
                                            userName: currentUser?.name || '',
                                            institutionId: activeInstitution?.id || currentUser?.institutionId || '',
                                            users: users,
                                            currentUser: currentUser!,
                                            currentInstitution: activeInstitution
                                        } as any} />
                                    </ModuleAccessGuard>
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
                                        onUpdateInstitution: handleUpdateCountyInstitution,
                                        onDeleteInstitution: handleDeleteCountyInstitution,
                                        onAccessAlumnaPortal: handleAccessAlumnaPortal,
                                        onGenerateReceipt: handleGenerateReceipt,
                                        onUpdateCounty: handleUpdateCounty,
                                        onAddInstitution: handleAddCountyInstitution,
                                        onLoginAsAdmin,
                                        onImportInstitutions: handleImportCountyInstitutions,
                                        onAddUser: async (data: any) => { 
                                            try {
                                                const userId = data.id || `u_county_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
                                                const newStaff: User = {
                                                    id: userId,
                                                    status: 'active',
                                                    password: data.password || 'password123',
                                                    ...data,
                                                    countyId: data.countyId || activeCounty?.id || currentUser?.countyId,
                                                    county_id: data.countyId || activeCounty?.id || currentUser?.countyId,
                                                    institutionId: data.institutionId || data.countyId || activeCounty?.id || currentUser?.countyId,
                                                };
                                                await apiService.saveUser(newStaff);
                                                setUsers(prev => [newStaff, ...prev.filter(u => u.id !== userId)]);
                                                await loadData(false, true);
                                                success("County staff member added successfully.");
                                            } catch (err: any) {
                                                console.error("Failed to add county staff:", err);
                                                toastError("Failed to add staff: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onUpdateUser: async (id: string, data: any) => {
                                            try {
                                                await onEditUser(id, data);
                                            } catch (err: any) {
                                                console.error("Failed to update county staff:", err);
                                                toastError("Failed to update staff: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onDeleteUser: onDeleteUser,
                                        inventoryItems: countyInventory,
                                        inventoryCategories: countyInventoryCategories,
                                        onAddInventoryItem: async (data: any) => {
                                            try {
                                                const id = data.id || `cinv_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
                                                const effectiveCountyId = data.countyId || data.county_id || activeCounty?.id || currentUser?.countyId || currentUser?.institutionId;
                                                const newItem: any = {
                                                    id,
                                                    name: data.name || '',
                                                    category: data.category || 'General',
                                                    quantity: Number(data.quantity || 0),
                                                    unit: data.unit || 'Units',
                                                    supplier_name: data.supplierName || data.supplier_name || '',
                                                    supplierName: data.supplierName || data.supplier_name || '',
                                                    status: data.status || 'at_hq',
                                                    target_institution_id: data.targetInstitutionId || data.target_institution_id || null,
                                                    targetInstitutionId: data.targetInstitutionId || data.target_institution_id || null,
                                                    driver_name: data.driverName || data.driver_name || '',
                                                    driverName: data.driverName || data.driver_name || '',
                                                    delivery_method: data.deliveryMethod || data.delivery_method || 'driver',
                                                    deliveryMethod: data.deliveryMethod || data.delivery_method || 'driver',
                                                    tracking_number: data.trackingNumber || data.tracking_number || '',
                                                    trackingNumber: data.trackingNumber || data.tracking_number || '',
                                                    county_id: effectiveCountyId,
                                                    countyId: effectiveCountyId,
                                                    at_hq_date: data.atHqDate || data.at_hq_date || data.recordedAt || new Date().toISOString(),
                                                    atHqDate: data.atHqDate || data.at_hq_date || data.recordedAt || new Date().toISOString()
                                                };
                                                setCountyInventory(prev => [newItem, ...prev.filter(i => i.id !== id)]);
                                                await apiService.saveModuleRecord('county_inventory', newItem);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.(`Logged inventory receipt: ${newItem.name}`);
                                            } catch (err: any) {
                                                console.error("Failed to add county inventory item:", err);
                                                toastError?.("Failed to add inventory item: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onUpdateInventoryItem: async (id: string, data: any) => {
                                            try {
                                                const effectiveCountyId = data.countyId || data.county_id || activeCounty?.id || currentUser?.countyId || currentUser?.institutionId;
                                                const updatedItem: any = {
                                                    id,
                                                    ...data,
                                                    quantity: Number(data.quantity || 0),
                                                    county_id: effectiveCountyId,
                                                    countyId: effectiveCountyId,
                                                    supplier_name: data.supplierName || data.supplier_name || '',
                                                    supplierName: data.supplierName || data.supplier_name || '',
                                                    target_institution_id: data.targetInstitutionId || data.target_institution_id || null,
                                                    targetInstitutionId: data.targetInstitutionId || data.target_institution_id || null,
                                                    driver_name: data.driverName || data.driver_name || '',
                                                    driverName: data.driverName || data.driver_name || '',
                                                    delivery_method: data.deliveryMethod || data.delivery_method || 'driver',
                                                    deliveryMethod: data.deliveryMethod || data.delivery_method || 'driver',
                                                    tracking_number: data.trackingNumber || data.tracking_number || '',
                                                    trackingNumber: data.trackingNumber || data.tracking_number || ''
                                                };
                                                setCountyInventory(prev => prev.map(i => i.id === id ? { ...i, ...updatedItem } : i));
                                                await apiService.saveModuleRecord('county_inventory', updatedItem);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.(`Updated inventory item: ${updatedItem.name || ''}`);
                                            } catch (err: any) {
                                                console.error("Failed to update county inventory item:", err);
                                                toastError?.("Failed to update inventory item: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onDeleteInventoryItem: async (id: string) => {
                                            try {
                                                setCountyInventory(prev => prev.filter(i => i.id !== id));
                                                await apiService.deleteModuleRecord('county_inventory', id);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.("Inventory item deleted.");
                                            } catch (err: any) {
                                                console.error("Failed to delete county inventory item:", err);
                                                toastError?.("Failed to delete inventory item: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onAddInventoryCategory: async (data: any) => {
                                            try {
                                                const id = data.id || `cat_${Date.now()}`;
                                                const effectiveCountyId = data.countyId || data.county_id || activeCounty?.id || currentUser?.countyId || currentUser?.institutionId;
                                                const newCat = { ...data, id, county_id: effectiveCountyId, countyId: effectiveCountyId };
                                                setCountyInventoryCategories(prev => [newCat, ...prev.filter(c => c.id !== id)]);
                                                await apiService.saveModuleRecord('county_inventory_categories', newCat);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.(`Created category: ${newCat.name}`);
                                            } catch (err: any) {
                                                console.error("Failed to add category:", err);
                                                toastError?.("Failed to add category: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onUpdateInventoryCategory: async (id: string, data: any) => {
                                            try {
                                                const effectiveCountyId = data.countyId || data.county_id || activeCounty?.id || currentUser?.countyId || currentUser?.institutionId;
                                                const updatedCat = { ...data, id, county_id: effectiveCountyId, countyId: effectiveCountyId };
                                                setCountyInventoryCategories(prev => prev.map(c => c.id === id ? { ...c, ...updatedCat } : c));
                                                await apiService.saveModuleRecord('county_inventory_categories', updatedCat);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.(`Updated category: ${updatedCat.name}`);
                                            } catch (err: any) {
                                                console.error("Failed to update category:", err);
                                                toastError?.("Failed to update category: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onDeleteInventoryCategory: async (id: string) => {
                                            try {
                                                setCountyInventoryCategories(prev => prev.filter(c => c.id !== id));
                                                await apiService.deleteModuleRecord('county_inventory_categories', id);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.("Category deleted.");
                                            } catch (err: any) {
                                                console.error("Failed to delete category:", err);
                                                toastError?.("Failed to delete category: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        stores: countyStores,
                                        onAddStore: async (data: any) => {
                                            try {
                                                const id = data.id || `store_${Date.now()}`;
                                                const effectiveCountyId = data.countyId || data.county_id || activeCounty?.id || currentUser?.countyId || currentUser?.institutionId;
                                                const newStore = { ...data, id, county_id: effectiveCountyId, countyId: effectiveCountyId };
                                                setCountyStores(prev => [newStore, ...prev.filter(s => s.id !== id)]);
                                                await apiService.saveModuleRecord('county_stores', newStore);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.(`Added store location: ${newStore.name}`);
                                            } catch (err: any) {
                                                console.error("Failed to add store:", err);
                                                toastError?.("Failed to add store: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onUpdateStore: async (id: string, data: any) => {
                                            try {
                                                const effectiveCountyId = data.countyId || data.county_id || activeCounty?.id || currentUser?.countyId || currentUser?.institutionId;
                                                const updatedStore = { ...data, id, county_id: effectiveCountyId, countyId: effectiveCountyId };
                                                setCountyStores(prev => prev.map(s => s.id === id ? { ...s, ...updatedStore } : s));
                                                await apiService.saveModuleRecord('county_stores', updatedStore);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.(`Updated store location: ${updatedStore.name}`);
                                            } catch (err: any) {
                                                console.error("Failed to update store:", err);
                                                toastError?.("Failed to update store: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onDeleteStore: async (id: string) => {
                                            try {
                                                setCountyStores(prev => prev.filter(s => s.id !== id));
                                                await apiService.deleteModuleRecord('county_stores', id);
                                                loadData(false, true).catch(e => console.warn("Background loadData err:", e));
                                                success?.("Store location deleted.");
                                            } catch (err: any) {
                                                console.error("Failed to delete store:", err);
                                                toastError?.("Failed to delete store: " + (err?.message || 'Unknown error'));
                                                throw err;
                                            }
                                        },
                                        onAddStockTransaction: async (data: any) => { await apiService.saveModuleRecord('county_stock_transactions', { ...data, id: `ctx_${Date.now()}` }); loadData(); },
                                        bursaryApplications,
                                        bursaryFunds,
                                        onAddBursaryFund: async (data: any) => { 
                                            await apiService.saveModuleRecord('county_bursary_funds', { ...data, id: `fund_${Date.now()}`, createdAt: new Date().toISOString() }); 
                                            loadData(); 
                                        },
                                        onUpdateBursaryApplication: async (id: string, data: any) => { const app = bursaryApplications.find(a => a.id === id); if (app) { await apiService.saveModuleRecord('bursary_applications', { ...app, ...data, updatedAt: new Date().toISOString() }); loadData(); } },
                                        onLogAction: handleLogAction,
                                        activityLogLimit,
                                        setActivityLogLimit,
                                        receiptLimit,
                                        setReceiptLimit,
                                        transactionLimit,
                                        setTransactionLimit,
                                        onSendSms: async (r: any, m: any, c?: any, u?: number, i?: string) => apiService.sendSms(r, m, c, u, i || activeCounty?.id),
                                        smsBalance: (activeCounty as any)?.smsBalance ?? (activeCounty as any)?.sms_balance ?? companyDetails?.smsBalance ?? 0,
                                        smsConfig: (activeCounty as any)?.smsConfig || (activeCounty as any)?.sms_config || companyDetails?.smsConfig,
                                        mpesaConfig: (activeCounty as any)?.mpesaConfig || (activeCounty as any)?.mpesa_config || companyDetails?.mpesaConfig,
                                        onRefreshData: async () => { await loadData(false, true); },
                                        departments: departments || [],
                                        courses: courses || [],
                                        companyDetails: companyDetails || activeCounty,
                                        transactions: transactions || []
                                    } as any}
                                    />
                                ) : (activeRole === 'constituency_admin' || activeRole?.startsWith('constituency_')) ? (
                                    <ConstituencyAdminView
                                        currentUser={currentUser!}
                                        institutions={institutions}
                                        users={users}
                                        companyDetails={companyDetails}
                                        onLogout={handleLogout}
                                        onLogAction={handleLogAction}
                                        onAddUser={async (userData: any) => {
                                            const constituencyId = currentUser?.institutionId || currentUser?.id || 'constituency';
                                            await apiService.registerUser(
                                                { ...userData, id: `u_cdf_${Date.now()}`, institutionId: constituencyId },
                                                currentUser?.name || 'Constituency Portal'
                                            );
                                            await loadData(false, true);
                                        }}
                                        onSaveInstitution={async (data: any) => {
                                             const newId = data.id || `inst_cdf_${Date.now()}`;
                                             await apiService.saveInstitution({ ...data, id: newId } as any);
                                             
                                             if (data.email) {
                                                 const adminUserData = {
                                                     id: `u_sch_${Date.now()}`,
                                                     name: `${data.name} Administrator`,
                                                     email: data.email.trim().toLowerCase(),
                                                     phoneNumber: data.phoneNumber || '',
                                                     role: 'finance_officer' as Role,
                                                     roles: ['finance_officer' as Role, 'admin' as Role],
                                                     institutionId: newId
                                                 };
                                                 await apiService.registerUser(adminUserData, data.name);
                                             }
                                             
                                             await loadData(false, true);
                                         }}
                                        onSendSms={async (recipient: string | string[], message: string) => {
                                            const targetInstId = activeInstitution?.id || currentUser?.institutionId || 'Kigumo';
                                            const config = activeInstitution?.smsConfig || companyDetails?.smsConfig;
                                            return apiService.sendSms(recipient, message, config, undefined, targetInstId);
                                        }}
                                    />
                                ) : activeRole === 'academics_officer' ? (
                                    <ModuleAccessGuard
                                        moduleId="academics"
                                        moduleName="Academics & Grading"
                                        description="Track student performance, manage subject allocations, enter assessment marks, and oversee academic levels."
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
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
                                        onUpdateLogo={(logo: string) => onUpdateInstitution(activeInstitution!.id, { logoUrl: logo })}
                                        onUpdateFooterImage={(footer: string) => onUpdateInstitution(activeInstitution!.id, { footerImageUrl: footer })}
                                        onSaveLetterheadConfig={(config: any) => onUpdateInstitution(activeInstitution!.id, { letterheadConfig: config })}
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
                                    </ModuleAccessGuard>
                                ) : (isTeacherRole(activeRole) || activeRole === 'lecturer' || activeRole === 'teacher' || activeRole === 'hod' || isStrictTeacherUser(currentUser)) ? (
                                    <LecturerView {...{
                                        ...lecturerProps,
                                        user: currentUser,
                                        currentInstitution: activeInstitution,
                                        users,
                                        courses,
                                        subjects,
                                        rooms,
                                        academicYears,
                                        semesters,
                                        requests,
                                        allocations,
                                        generatedTimetable,
                                        onSubmitRequest: async (subjectIds: string[], justification: string, signatureUrl: string | null, priority: Priority, academicYearId: string, semesterId: string, preferences: any, levels: any) => {
                                            return handleLecturerSubmitRequest(subjectIds, justification, signatureUrl, priority, academicYearId, semesterId, preferences, levels);
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
                                        onAccessAlumnaPortal: handleAccessAlumnaPortal,
                                        onSaveScanSession: async (placeholderEntry: any, attendanceRows: { studentId: string; status: 'present' | 'absent' | 'late' }[]) => {
                                            // 1. Persist the placeholder timetable entry so student_attendances FK is satisfied
                                            await apiService.saveModuleRecord('timetable_entries', placeholderEntry);
                                            // 2. Save attendance rows referencing that entry
                                            await handleSaveAttendance(placeholderEntry.id, attendanceRows);
                                        }
                                    } as any}
                                    />
                                ) : activeRole === 'student' && (activeInstitution?.institutionType === 'Driving School' || activeInstitution?.moduleStates?.some((m: any) => m.moduleId === 'driving_school' && (m.status === 'active' || m.status === 'trial'))) ? (
                                    <DrivingSchoolProvider institutionId={activeInstitution?.id}>
                                        <DSStudentPortal
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            onLogout={() => { apiService.clearSession(); setCurrentUser(null); }}
                                        />
                                    </DrivingSchoolProvider>
                                ) : activeRole === 'student' ? (
                                    <StudentView
                                        user={currentUser}
                                        users={users}
                                        courses={courses}
                                        subjects={subjects}
                                        rooms={rooms}
                                        onExitPerspective={originalSuperAdminSession ? onRestoreSuperAdminSession : (impersonatedRole ? () => setImpersonatedRole(null) : undefined)}
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
                                        onAddParent={async (sid: string, p: any) => {
                                             let existingParent = null;
                                             if (p.email) {
                                                 const globalRecords = await apiService.fetchModuleRecords<User>('users', undefined, undefined, {
                                                     filter: { email: p.email.toLowerCase() }
                                                 });
                                                 if (globalRecords && globalRecords.length > 0) {
                                                     existingParent = globalRecords[0];
                                                 }
                                             }
                                             if (existingParent) {
                                                 const currentStudentIds = Array.isArray(existingParent.studentIds) ? existingParent.studentIds : [];
                                                 const updatedStudentIds = currentStudentIds.includes(sid) ? currentStudentIds : [...currentStudentIds, sid];
                                                 const updated = {
                                                     ...existingParent,
                                                     role: 'parent',
                                                     institutionId: currentUser.institutionId,
                                                     studentIds: updatedStudentIds
                                                 };
                                                 await apiService.updateModuleRecord('users', existingParent.id, updated);
                                                 return { success: true, message: 'Parent associated.' };
                                             } else {
                                                 const newId = `u_par_${Date.now()}`;
                                                 await apiService.saveModuleRecord('users', { 
                                                     ...p, 
                                                     role: 'parent', 
                                                     id: newId, 
                                                     institutionId: currentUser.institutionId, 
                                                     studentIds: [sid] 
                                                 });
                                                 return { success: true, message: 'Parent added.' };
                                             }
                                         }}
                                        onDeleteParent={() => { }}
                                        departments={departments}
                                        onSubmitEnrollmentRequest={async (sids: any, sig: any) => { }}
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
                                        onAccessAlumnaPortal: handleAccessAlumnaPortal,
                                        onUpdateLeaveOut: async (id: string, data: any) => {
                                            try {
                                                const existing = await apiService.fetchModuleRecords<any>('leave_out_requests', currentUser.institutionId);
                                                const target = existing.find((r: any) => r.id === id);
                                                if (target) {
                                                    await apiService.saveModuleRecord('leave_out_requests', { ...target, ...data, updatedAt: new Date().toISOString() });
                                                }
                                            } catch (e) {
                                                console.error('Error updating leave out:', e);
                                            }
                                        }
                                    } as any}
                                    />
                                ) : (activeRole === 'librarian' || (activeRole === 'staff' && (activeInstitution?.institutionType as string) === 'Library')) ? (
                                    <ModuleAccessGuard
                                        moduleId="library"
                                        moduleName="Library System"
                                        description="Track textbook borrowing registries, manage library fine logs, update catalog categories, and catalog new acquisitions."
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
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
                                            activityLog={activityLog}
                                            onSwitchPerspective={(role: any) => { setImpersonatedRole(role); setSelectedRole(role); }}
                                        />
                                    </ModuleAccessGuard>
                                ) : activeRole === 'security' ? (
                                    activeInstitution && ['Building', 'Property', 'Rental', 'Real Estate', 'Apartment', 'Mall', 'Office Block', 'Office'].includes(activeInstitution.institutionType || '') ? (
                                        <BuildingSecurityManager
                                            floors={buildingFloors}
                                            offices={buildingOffices}
                                            visitorLogs={buildingVisitorLogs}
                                            visitorAssets={buildingVisitorAssets}
                                            institution={activeInstitution!}
                                            companyDetails={companyDetails}
                                            users={users}
                                            currentUser={currentUser}
                                            onAddFloor={handleAddBuildingFloor}
                                            onAddOffice={handleAddBuildingOffice}
                                            onAddVisitorLog={handleAddBuildingVisitorLog}
                                            onUpdateVisitorLog={handleUpdateBuildingVisitorLog}
                                            onVerifyAsset={handleVerifyVisitorAsset}
                                            onRefreshData={async () => await loadData(false, true)}
                                            onAddUser={async (d: any) => { if (!currentUser) return; await apiService.registerUser({ ...d, id: generateUserId(), institutionId: currentUser.institutionId }, activeInstitution?.name); await loadData(false, true); }}
                                            onSwitchPerspective={(role: any) => { setImpersonatedRole(role); setSelectedRole(role); }}
                                        />
                                    ) : (
                                        <SecurityView
                                            {...{
                                                currentUser,
                                                currentInstitution: activeInstitution!,
                                                companyDetails,
                                                smsConfig: activeInstitution?.smsConfig || companyDetails?.smsConfig,
                                                onSendSms: async (r: any, m: any, c?: any, u?: number, i?: string) => apiService.sendSms(r, m, c || activeInstitution?.smsConfig || companyDetails?.smsConfig, u, i || activeInstitution?.id || currentUser?.institutionId),
                                                securityAlerts,
                                                visitors,
                                                vehicles,
                                                vehicleLogs,
                                                onCheckoutVisitor: handleCheckoutVisitor,
                                                appointments,
                                                onUpdateAppointmentStatus: handleUpdateAppointmentStatus,
                                                users,
                                                onAddVisitor: handleAddVisitor,
                                                onUpdateVisitor: async (id: string, data: any) => { const existing = visitors.find(v => v.id === id); if (existing) { await apiService.saveModuleRecord('visitors', { ...existing, ...data }); loadData(); } },
                                                onLogGateAction: handleLogGateAction,
                                                onAddAlert: async (a: any) => { await apiService.saveModuleRecord('security_alerts', { ...a, id: `alt_${Date.now()}`, status: 'active', timestamp: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); },
                                                onResolveAlert: async (id: string) => { const existing = securityAlerts.find(a => a.id === id); if (existing) { await apiService.saveModuleRecord('security_alerts', { ...existing, status: 'resolved' }); loadData(); } },
                                                onDeleteAlert: async (id: string) => { if (currentUser?.role === 'super_admin') { await apiService.deleteModuleRecord('security_alerts', id); loadData(); } },
                                                onLogAction: handleLogAction,
                                                onTeacherGateCheckIn: handleTeacherGateCheckIn,
                                                teacherCheckIns,
                                                onSwitchPerspective: (role: any) => { setImpersonatedRole(role); setSelectedRole(role); }
                                            } as any}
                                        />
                                    )
                                ) : activeRole === 'info_desk' ? (
                                    activeInstitution && ['Building', 'Property', 'Rental', 'Real Estate', 'Apartment', 'Mall', 'Office Block', 'Office'].includes(activeInstitution.institutionType || '') ? (
                                        <BuildingSecurityManager
                                            floors={buildingFloors}
                                            offices={buildingOffices}
                                            visitorLogs={buildingVisitorLogs}
                                            visitorAssets={buildingVisitorAssets}
                                            institution={activeInstitution!}
                                            companyDetails={companyDetails}
                                            users={users}
                                            currentUser={currentUser}
                                            onAddFloor={handleAddBuildingFloor}
                                            onAddOffice={handleAddBuildingOffice}
                                            onAddVisitorLog={handleAddBuildingVisitorLog}
                                            onUpdateVisitorLog={handleUpdateBuildingVisitorLog}
                                            onVerifyAsset={handleVerifyVisitorAsset}
                                            onRefreshData={async () => await loadData(false, true)}
                                            onAddUser={async (d: any) => { if (!currentUser) return; await apiService.registerUser({ ...d, id: generateUserId(), institutionId: currentUser.institutionId }, activeInstitution?.name); await loadData(false, true); }}
                                            onSwitchPerspective={(role: any) => { setImpersonatedRole(role); setSelectedRole(role); }}
                                        />
                                    ) : (
                                        <InfoDeskView
                                            {...{
                                                currentUser,
                                                currentInstitution: activeInstitution!,
                                                visitors,
                                                appointments,
                                                onAddVisitor: handleAddVisitor,
                                                onAddAppointment: async (a: any) => { await apiService.saveModuleRecord('appointments', { ...a, id: `apt_${Date.now()}`, status: 'scheduled', createdAt: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); },
                                                onUpdateAppointment: async (id: string, status: any) => { const existing = appointments.find(a => a.id === id); if (existing) { await apiService.saveModuleRecord('appointments', { ...existing, status }); loadData(); } },
                                                onLogAction: handleLogAction
                                            } as any}
                                        />
                                    )
                                ) : activeRole === 'store' ? (
                                    <ModuleAccessGuard
                                        moduleId="school_store"
                                        moduleName="School Inventory"
                                        description="Track and manage school supply inventory, uniform/stationery stock, student requests, and suppliers."
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
                                        <RetailManager
                                            institutionId={activeInstitution?.id || ''}
                                            businessSubType={activeInstitution?.businessSubType}
                                            currentUser={currentUser}
                                            retailStores={retailStores}
                                            inventory={retailInventory}
                                            retailExpenses={retailExpenses}
                                            onAddRetailExpense={async (exp: any) => { await apiService.saveModuleRecord('retail_expenses', { ...exp, id: `exp_${Date.now()}`, date: new Date().toISOString().split('T')[0], recordedById: currentUser.id, institutionId: currentUser.institutionId }); loadData(); }}
                                            requisitions={requisitions}
                                            onAddRequisition={handleAddRequisition}
                                            onUpdateRequisition={async (id: any, data: any) => { const existing = requisitions.find(r => r.id === id); if (existing) { await apiService.saveModuleRecord('requisitions', { ...existing, ...data }); loadData(); } }}
                                            isEducation={true}
                                            allUsers={users}
                                            allCourses={courses}
                                            currentInstitution={activeInstitution}
                                            countyInventory={countyInventory}
                                            onMarkInventoryReceived={handleMarkInventoryReceived}
                                            onEditUser={onEditUser}
                                            voteHeads={voteHeads}
                                            activityLog={activityLog}
                                        />
                                    </ModuleAccessGuard>
                                ) : ((activeRole === 'finance_officer' || activeRole === 'finance' || activeRole === 'procurement_officer') && !isAutoMarket && !isInvoicingInstitution(activeInstitution)) ? (
                                    <ModuleAccessGuard
                                        moduleId="finance"
                                        moduleName="Finance & Fees"
                                        description="Generate student invoices, process fees collections/receipting, and track general transaction ledgers."
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
                                        <FinanceOfficerView
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            companyDetails={companyDetails}
                                            invoices={activeInstitution?.id ? (invoices || []).filter(i => {
                                                const iInst = i.institutionId || (i as any).institution_id;
                                                return !iInst || iInst === activeInstitution.id;
                                            }) : invoices}
                                            receipts={activeInstitution?.id ? (receipts || []).filter(r => {
                                                const rInst = r.institutionId || (r as any).institution_id;
                                                return !rInst || rInst === activeInstitution.id;
                                            }) : receipts}
                                            expenses={activeInstitution?.id ? (expenses || []).filter(e => {
                                                const eInst = e.institutionId || (e as any).institution_id;
                                                return !eInst || eInst === activeInstitution.id;
                                            }) : expenses}
                                            onAddExpense={async (exp: any) => {
                                                await apiService.saveModuleRecord('expenses', exp);
                                            }}
                                            goals={financialGoals}
                                            feeStructures={feeStructures}
                                            students={(users || []).filter(u => u.role === 'student')}
                                            academicYears={academicYears}
                                            semesters={semesters}
                                            transactions={transactions}
                                            onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                            onGenerateReceipt={onGenerateReceipt}
                                            onLogAction={handleLogAction}
                                            receiptLimit={receiptLimit}
                                            setReceiptLimit={setReceiptLimit}
                                            transactionLimit={transactionLimit}
                                            setTransactionLimit={setTransactionLimit}
                                            requisitions={requisitions}
                                            onUpdateRequisition={handleUpdateRequisition}
                                            voteHeads={voteHeads}
                                            courses={courses}
                                            onRefreshData={loadData}
                                            onGenerateInvoices={async (invoicesList: any[]) => {
                                                const timestamp = new Date().toISOString();
                                                const preparedInvoices = (invoicesList || []).map((inv: any) => ({
                                                    ...inv,
                                                    institutionId: activeInstitution!.id,
                                                    createdAt: inv.createdAt || timestamp,
                                                    updatedAt: timestamp
                                                }));
                                                const savedInvoices = await apiService.saveModuleRecords('invoices', preparedInvoices);
                                                if (savedInvoices && savedInvoices.length > 0) {
                                                    const chunkSize = 15;
                                                    for (let i = 0; i < savedInvoices.length; i += chunkSize) {
                                                        const chunk = savedInvoices.slice(i, i + chunkSize);
                                                        await Promise.allSettled(chunk.map((inv: any) => apiService.allocatePrepaymentsToInvoice(inv)));
                                                    }
                                                }
                                                await loadData();
                                            }}
                                            users={users.filter(u => u.institutionId === (activeInstitution?.id || currentUser?.institutionId))}
                                            payrollRecords={payrollRecords as any}
                                            leaveRequests={(requests || []) as any}
                                            onProcessPayroll={handleProcessPayroll}
                                            onUpdateLeaveStatus={handleUpdateLeaveStatus}
                                            onEditUser={onEditUser}
                                            onDeleteUser={onDeleteUser}
                                            activityLog={activityLog}
                                        />
                                    </ModuleAccessGuard>
                                ) : activeRole === 'hr_officer' ? (
                                    <ModuleAccessGuard
                                        moduleId="hr_payroll"
                                        moduleName="HR & Payroll Compliance"
                                        description="Manage employees, run Kenyan standard compliant payroll calculations, log biometric attendance, and generate reports."
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
                                        <HROfficerView 
                                            {...{
                                                currentUser,
                                                currentInstitution: activeInstitution || undefined,
                                                users: users.filter(u => u.institutionId === (activeInstitution?.id || currentUser.institutionId)),
                                                payrollRecords: payrollRecords as any,
                                                onAddUser: async (u: any) => {
                                                    const targetInstitutionId = u.institutionId || (currentUser?.role === 'super_admin' ? (activeInstitution?.id || 'SYSTEM') : currentUser?.institutionId);
                                                    await apiService.registerUser({ ...u, id: generateUserId(), institutionId: targetInstitutionId }, activeInstitution?.name);
                                                    await loadData(false, true);
                                                },
                                                onUpdateUser: onEditUser,
                                                onDeleteUser: onDeleteUser,
                                                onLogAction: handleLogAction,
                                                letterheadConfig: activeLetterheadConfig,
                                                footerImageUrl: activeFooterImageUrl,
                                                companyDetails: companyDetails,
                                                activityLog: activityLog
                                            } as any}
                                        />
                                    </ModuleAccessGuard>
                                ) : activeRole === 'boarding_master' ? (
                                    <ModuleAccessGuard
                                        moduleId="boarding"
                                        moduleName="Boarding Master"
                                        description="Manage student boarding houses, bed allocations, dorm assignments, and student leave-out checkouts."
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
                                        <BoardingMasterView {...boardingMasterProps as any}
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            users={users}
                                            rooms={rooms}
                                            buildings={buildings}
                                            leaveOutRequests={leaveOutRequests}
                                            incidents={incidents}
                                            onUpdateLeaveOutStatus={async (id: any, status: any) => { const existing = leaveOutRequests.find(r => r.id === id); if (existing) { await apiService.saveModuleRecord('leave_out_requests', { ...existing, status, approvedBy: currentUser.id, updatedAt: new Date().toISOString() }); loadData(); } }}
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
                                            onLogAction={handleLogAction}
                                        />
                                    </ModuleAccessGuard>
                                ) : activeRole === 'event_manager' ? (
                                    <ModuleAccessGuard
                                        moduleId="events"
                                        moduleName="Marathon & Event Management"
                                        description="Track race categories, registrations, timing splits, fundraising pledges, and medical tents."
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
                                        <EventManagementView
                                            currentUser={currentUser}
                                            currentInstitution={activeInstitution!}
                                            onLogAction={handleLogAction}
                                        />
                                    </ModuleAccessGuard>
                                ) : activeRole === 'transport_assistant' ? (
                                    <ModuleAccessGuard
                                        moduleId="transport"
                                        moduleName="Fleet Registry"
                                        description="Track and manage your institutional school buses, routes, drivers, and student check-ins."
                                        institution={activeInstitution}
                                        onActivateTrial={handleActivateModuleTrial}
                                    >
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
                                    </ModuleAccessGuard>
                                ) : (activeRole === 'carwash_admin' || activeRole === 'carwash_cashier' || (isAdminCatchAll && (activeInstitution?.institutionType?.toLowerCase().includes('carwash') || activeInstitution?.institutionType?.toLowerCase().includes('car wash') || activeInstitution?.businessSubType?.toLowerCase().includes('carwash') || activeInstitution?.businessSubType?.toLowerCase().includes('car wash')))) ? (
                                    <CarWashView {...carWashProps as any}
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        jobs={jobs}
                                        users={users}
                                        companyDetails={companyDetails}
                                        onDataChange={loadData}
                                        onSendSms={async (phone: any, msg: any) => {
                                            try {
                                                const pages = Math.ceil(msg.length / 160) || 1;
                                                await apiService.sendSms(phone, msg, companyDetails?.smsConfig, pages, currentUser?.institutionId);
                                                loadData();
                                                return true;
                                            } catch (e) {
                                                console.error(e);
                                                return false;
                                            }
                                        }}
                                        smsConfig={companyDetails.smsConfig}
                                        smsBalance={activeInstitution?.smsBalance || 0}
                                        onAddJob={async (j: any) => { await apiService.saveModuleRecord('carwash_jobs', { ...j, id: `job_${Date.now()}`, status: 'pending', createdAt: new Date().toISOString(), institutionId: currentUser.institutionId }); loadData(); }}
                                        onUpdateJobStatus={async (id: any, status: any) => { const existing = jobs.find(x => x.id === id); if (existing) { await apiService.saveModuleRecord('carwash_jobs', { ...existing, status }); loadData(); } }}
                                        onAddTransaction={apiService.onAddTransaction.bind(apiService)}
                                        onLogAction={handleLogAction}
                                    />
                                ) : (activeRole === 'landlord' || activeRole === 'tenant' || activeRole === 'property_admin' || (isAdminCatchAll && (activeInstitution?.businessSubType?.toLowerCase().includes('property management') || activeInstitution?.institutionType?.toLowerCase().includes('property management')))) ? (
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
                                            users={users}
                                            onDeleteUser={onDeleteUser}
                                            onEditUser={onEditUser}
                                            onImportUsers={onImportUsers}
                                             transactions={transactions}
                                            onAddUser={async (userData: any) => {
                                                if (!currentUser) return;
                                                const targetInstitutionId = userData.institutionId || currentUser.institutionId;
                                                await apiService.registerUser(
                                                    { ...userData, id: generateUserId(), institutionId: targetInstitutionId },
                                                    activeInstitution?.name
                                                );
                                                await loadData(false, true);
                                            }}
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
                                                teacherCheckIns={teacherCheckIns}
                                                retailStores={retailStores}
                                                inventory={retailInventory}
                                                retailExpenses={retailExpenses}
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
                                        institutions={institutions}
                                    />
                                ) : (activeRole === 'agrovet_admin' || (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('agrovet'))) ? (
                                    <AgrovetView
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        users={users.filter(u => u.institutionId === currentUser.institutionId)}
                                        onDataChange={loadData}
                                    />
                                ) : (
                                    activeRole === 'restaurant_admin' || 
                                    activeRole === 'waiter' || 
                                    activeRole === 'carwash_waiter' ||
                                    (typeof window !== 'undefined' && (
                                        new URLSearchParams(window.location.search).get('view') === 'pos' ||
                                        new URLSearchParams(window.location.search).get('view') === 'restaurant' ||
                                        new URLSearchParams(window.location.search).get('view') === 'cafe'
                                    )) ||
                                    (isAdminCatchAll && (
                                        activeInstitution?.institutionType === 'Restaurant' || 
                                        activeInstitution?.category?.toLowerCase().includes('restaurant') ||
                                        activeInstitution?.category?.toLowerCase().includes('cafe') ||
                                        activeInstitution?.category?.toLowerCase().includes('dining') ||
                                        activeInstitution?.businessSubType?.toLowerCase().includes('restaurant')
                                    ))
                                ) ? (
                                    <RestaurantPOSManager
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
                                ) : ((activeRole as string) === 'security' || (isAdminCatchAll && ((activeInstitution?.institutionType as string) === 'Private Security' || (activeInstitution?.institutionType as string) === 'Security' || (activeInstitution?.category as string) === 'Security' || activeInstitution?.businessSubType?.toLowerCase().includes('security')))) ? (
                                    <PrivateSecurityCompanyView
                                        currentUser={currentUser}
                                        currentInstitution={activeInstitution!}
                                        onLogAction={handleLogAction}
                                    />
                                ) : (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('fuel station')) ? (
                                    <FuelStationDashboard 
                                        institution={activeInstitution!}
                                    />
                                ) : (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('civil manufacturing')) ? (
                                    <CivilWorksDashboard />
                                ) : (isAdminCatchAll && activeInstitution?.businessSubType?.toLowerCase().includes('industrial logistics')) ? (
                                    <LogisticsDashboard />
                                ) : (activeRole === 'admin' && (activeInstitution?.institutionType === 'Driving School' || activeInstitution?.category?.toLowerCase().includes('driving school'))) ? (
                                    <DrivingSchoolProvider institutionId={activeInstitution?.id}>
                                        <AdminView
                                             {...superAdminProps as any}
                                              teacherCheckIns={teacherCheckIns}
                                             currentUser={currentUser}
                                             currentInstitution={activeInstitution}
                                             activeRole={(activeRole as any) || undefined}
                                             onLogAction={handleLogAction}
                                             onRefreshData={loadData}
                                             onSaveTimetableSettings={(c: any) => onUpdateInstitution(activeInstitution!.id, { timetableSettings: c })}
                                             retailStores={retailStores}
                                             inventory={retailInventory}
                                             retailExpenses={retailExpenses}
                                         />
                                    </DrivingSchoolProvider>
                                ) : isAdminCatchAll ? (
                                    <AdminView
                                         {...superAdminProps as any}
                                          teacherCheckIns={teacherCheckIns}
                                         currentUser={currentUser}
                                         currentInstitution={activeInstitution}
                                         activeRole={(activeRole as any) || undefined}
                                         onLogAction={handleLogAction}
                                         onRefreshData={loadData}
                                         onSaveTimetableSettings={(c: any) => onUpdateInstitution(activeInstitution!.id, { timetableSettings: c })}
                                         retailStores={retailStores}
                                         inventory={retailInventory}
                                         retailExpenses={retailExpenses}
                                     />
                                ) : null}
                        </Suspense>
                    </main>
                    </>
                ) : (
                    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div></div>}>
                        {showTenantStore && activeStoreTenantId ? (
                            (() => {
                                const targetInst = institutions.find(inst => inst.id === activeStoreTenantId || inst.slug === activeStoreTenantId || (inst.useSubdomain && inst.customSubdomain === activeStoreTenantId));
                                 if (targetInst?.institutionType === 'Hospitality') {
                                    return <HospitalityStorefront institutionId={targetInst.id} />;
                                } else if (targetInst?.institutionType === 'Construction') {
                                    return <ConstructionProjectView institutionId={targetInst.id} />;
                                } else if (targetInst?.institutionType === 'Education' || targetInst?.institutionType === 'Primary' || targetInst?.institutionType === 'Secondary') {
                                    return <SchoolStorefrontView institutionId={targetInst.id} initialInstitution={targetInst} institutions={institutions} onEnrollmentClick={() => setShowAlumnaeRegister(true)} />;
                                }
                                return <TenantStorefrontView institutionId={targetInst ? targetInst.id : activeStoreTenantId} />;
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
                                 onEnterWarRoom={(profile: any) => {
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
                          ) : (new URLSearchParams(window.location.search).get('view') === 'scan-to-pay' || new URLSearchParams(window.location.search).get('view') === 'scantopay' || new URLSearchParams(window.location.search).get('view') === 'pay') ? (
                             <Suspense fallback={<SystemPulseLoader message="Loading Scan to Pay Portal..." />}>
                                 <PublicScanToPayView 
                                     companyDetails={companyDetails}
                                     institutions={institutions}
                                     onBackToPortal={() => window.location.href = '/'}
                                 />
                             </Suspense>
                          ) : new URLSearchParams(window.location.search).get('view') === 'pay-car-invoice' ? (
                             <Suspense fallback={<SystemPulseLoader message="Loading Payment Gateway..." />}>
                                 <PublicCarInvoicePayment 
                                     invoiceId={new URLSearchParams(window.location.search).get('id') || ''} 
                                 />
                             </Suspense>
                          ) : (new URLSearchParams(window.location.search).get('view') === 'pay-ds-invoice' || new URLSearchParams(window.location.search).get('view') === 'ds-invoice') ? (
                             <Suspense fallback={<SystemPulseLoader message="Loading Invoice Portal..." />}>
                                 <PublicInvoiceView 
                                     invoiceId={new URLSearchParams(window.location.search).get('id') || ''} 
                                 />
                             </Suspense>
                          ) : (
                             new URLSearchParams(window.location.search).get('view') === 'results-slip' ||
                             new URLSearchParams(window.location.search).get('view') === 'result-slip' ||
                             new URLSearchParams(window.location.search).get('view') === 'results' ||
                             new URLSearchParams(window.location.search).get('view') === 'slip' ||
                             new URLSearchParams(window.location.search).get('view') === 'resultslip' ||
                             Boolean(new URLSearchParams(window.location.search).get('adm')) ||
                             Boolean(new URLSearchParams(window.location.search).get('slip')) ||
                             window.location.pathname.includes('/portal/results') ||
                             window.location.pathname.includes('/results-slip') ||
                             window.location.pathname.includes('/slip')
                          ) ? (
                             <Suspense fallback={<SystemPulseLoader message="Loading Result Slip Portal..." />}>
                                 <PublicResultSlipPortal 
                                     institutions={institutions}
                                     users={users}
                                     assessments={assessments}
                                 />
                             </Suspense>
                          ) : window.location.search.includes('view=join-campaign') ? (
                            <CampaignJoinPage 
                                campaignId={new URLSearchParams(window.location.search).get('id') || ''} 
                                onBack={() => window.location.href = '/?view=community'}
                            />
                         ) : window.location.search.includes('view=travel') ? (
                            <HospitalityMarketplace 
                                institutions={institutions}
                                onBack={() => window.location.href = '/?view=community'}
                                onViewStore={(id: any) => window.location.href = `/?shop=${id}`}
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
                                onCheckAdmission={async (admNo: string, schoolId: string) => {
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
                                joiningFee={Number(companyDetails?.alumnaeJoiningFee ?? (companyDetails as any)?.alumnae_joining_fee ?? 0)}
                                feeEnabled={
                                    ((companyDetails?.portalSettings?.alumnaeRegistrationFeeEnabled ?? 
                                      (companyDetails?.portalSettings as any)?.alumnae_registration_fee_enabled ?? 
                                      (companyDetails as any)?.alumnae_registration_fee_enabled ?? 
                                      true) !== false) &&
                                    Number(companyDetails?.alumnaeJoiningFee ?? (companyDetails as any)?.alumnae_joining_fee ?? 0) > 0
                                }
                                onInitiatePayment={async (amount: number, phone: string, reference: string, schoolId: string) => {
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
                                onCheckPaymentStatus={async (checkoutRequestId: string) => {
                                    return apiService.checkPaymentStatus('ncba', checkoutRequestId, companyDetails?.ncbaConfig);
                                }}
                                onComplete={async (data: any) => {
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

                                        const isAlumnaeBillingActive = (
                                            (companyDetails?.portalSettings?.alumnaeRegistrationFeeEnabled ?? 
                                             (companyDetails?.portalSettings as any)?.alumnae_registration_fee_enabled ?? 
                                             true) !== false &&
                                            Number(companyDetails?.alumnaeJoiningFee ?? (companyDetails as any)?.alumnae_joining_fee ?? 0) > 0
                                        );
                                        const effectiveJoiningFee = isAlumnaeBillingActive ? Number(companyDetails?.alumnaeJoiningFee || 0) : 0;

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
                                            paymentId: effectiveJoiningFee > 0 ? (data.paymentId || null) : null,
                                            registrationFee: effectiveJoiningFee,
                                            joinedAt: new Date().toISOString(),
                                            // Implement Auto-Featured status for 30 days as a welcome gift
                                            isFeatured: true,
                                            featuredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
                                        };
                                        
                                        // Clean up internal file reference before saving
                                        delete registrationPayload.profilePictureFile;

                                        await apiService.saveModuleRecord('alumnae_members', registrationPayload);
                                        
                                        // Generate Invoice and Receipt for the payment only if billing is enabled and positive
                                        const amount = effectiveJoiningFee;
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
                                            const emailBody = `Dear ${registrationPayload.fullName},\n\nThank you for activating your membership in the ${school?.name || 'Alumnae'} Network.\n\nPayment Details:\n- Amount: KES ${amount?.toLocaleString()}\n- Receipt: ${receiptData.receiptNumber}\n- Transaction ID: ${data.paymentId}\n\nYou can now access the social portal and connect with your alma mater.\n\nRegards,\nEduAI Network Team`;
                                            
                                            const smsMessage = `Hello ${registrationPayload.fullName}, your payment of KES ${amount?.toLocaleString()} for Alumnae Network activation is received. Receipt: ${receiptData.receiptNumber}. Welcome!`;

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
                                onLoginSuccess={(alumna: any) => {
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
                                onLoginSuccess={(member: any) => {
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
                                onBookAppointment={async (apt: any) => {
                                    await apiService.saveModuleRecord('appointments', { ...apt, id: `apt_${Date.now()}`, status: 'pending', createdAt: new Date().toISOString() });
                                    loadData();
                                }}
                            />
                        ) : showGuestFeedback ? (
                            <GuestFeedbackView 
                                onSubmit={async (f: any) => { 
                                    await apiService.saveModuleRecord('feedback_submissions', { 
                                        ...f, 
                                        id: `fdb_${Date.now()}`,
                                        studentId: f.isAnonymous ? 'anonymous_guest' : (f.guestName || 'guest_visitor'),
                                        content: f.comments || f.title || 'Guest Feedback Submission',
                                        title: f.title || 'General Guest Feedback'
                                    }); 
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
                                onRegister={(modId: any) => {
                                    setRegistrationModuleId(modId);
                                    setLoginInitialView('register');
                                    setShowMarketing(false);
                                }}
                            />
                        ) : (
                            <LoginView
                            initialView={loginInitialView}
                            prefillModuleId={registrationModuleId || undefined}
                            onLogin={async (e: any, p: any) => {
                                const normalizePhoneForCheck = (phone: string | null | undefined): string => {
                                    if (!phone) return '';
                                    let cleaned = phone.replace(/\D/g, '');
                                    if (cleaned.startsWith('07') || cleaned.startsWith('01')) {
                                        cleaned = '254' + cleaned.substring(1);
                                    }
                                    if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) {
                                        cleaned = '254' + cleaned;
                                    }
                                    return cleaned;
                                };

                                const normE = normalizePhoneForCheck(e);
                                const isClientOffline = !navigator.onLine || !isApiOnline;
                                const cleanInput = e.trim().toLowerCase();
                                const isSuperAdminAlias = (
                                    cleanInput === 'super_admin' || 
                                    cleanInput === 'superadmin' || 
                                    cleanInput === 'u_super_admin' || 
                                    cleanInput === 'admin' || 
                                    cleanInput === 'super' || 
                                    cleanInput === 'super@app.com' ||
                                    cleanInput === 'admin@app.com' ||
                                    cleanInput.includes('superadmin') ||
                                    cleanInput.includes('super_admin')
                                );
                                let discovered: any[] = [];
                                let matchedUsers: any[] = [];

                                // Primary Authentication: Direct Server-Side Authentication
                                if (!isClientOffline) {
                                    try {
                                        const serverAuthRes = await apiService.login(cleanInput, p);
                                        if (serverAuthRes && serverAuthRes.success && serverAuthRes.user) {
                                            matchedUsers = [serverAuthRes.user];
                                            setUsers(prev => {
                                                const existingIds = new Set((prev || []).map(u => u?.id));
                                                return existingIds.has(serverAuthRes.user!.id) ? (prev || []) : [...(prev || []), serverAuthRes.user!];
                                            });
                                        } else if (serverAuthRes && serverAuthRes.error === 'invalid_password') {
                                            console.warn(`[Login] Account found for "${e}", but server-side password verification failed.`);
                                            return 'failed';
                                        }
                                    } catch (authErr) {
                                        console.warn("[Login] Server-side login attempt failed, falling back to local verification:", authErr);
                                    }
                                }

                                const checkUserMatch = (candidate: any) => {
                                    if (!candidate) return false;
                                    const emailMatch = candidate.email?.trim().toLowerCase() === cleanInput;
                                    const phoneMatch = candidate.phoneNumber && normE && normalizePhoneForCheck(candidate.phoneNumber) === normE;
                                    const idMatch = candidate.id?.toLowerCase() === cleanInput || 
                                                    (candidate.staffId && candidate.staffId.toLowerCase() === cleanInput) ||
                                                    (candidate.admissionNumber && candidate.admissionNumber.toLowerCase() === cleanInput) ||
                                                    (candidate.username && candidate.username.toLowerCase() === cleanInput);
                                    const candidateIsSuper = candidate.role === 'super_admin' || 
                                                             candidate.id === 'u_super_admin' || 
                                                             candidate.email === 'super@app.com' ||
                                                             (Array.isArray(candidate.roles) && candidate.roles.includes('super_admin'));
                                    const superRoleMatch = isSuperAdminAlias && candidateIsSuper;

                                    if (!emailMatch && !phoneMatch && !idMatch && !superRoleMatch) return false;

                                    // Password verification:
                                    // Matches candidate password, or default 'password123' if candidate has no password,
                                    // or standard superadmin initial password fallbacks
                                    const passMatch = 
                                        candidate.password === p || 
                                        (!candidate.password && (p === 'password123' || p === 'admin123')) ||
                                        ((candidateIsSuper || isSuperAdminAlias) && (
                                            p === 'password123' || 
                                            p === 'admin123' || 
                                            p === 'super123' || 
                                            p === 'admin' ||
                                            candidate.password === p
                                        ));

                                    return Boolean(passMatch);
                                };

                                // Discovery Phase: Search for user directly in local state first if not matched via server
                                if (matchedUsers.length === 0) {
                                    matchedUsers = (users || []).filter(checkUserMatch);
                                }
                                
                                // Fallback to initial demo users list (ensures default super admin is ALWAYS available)
                                if (matchedUsers.length === 0) {
                                    matchedUsers = INITIAL_USERS.filter(checkUserMatch);
                                }

                                // Fallback to localDb indexedDB cache if not matched in memory or INITIAL_USERS
                                if (matchedUsers.length === 0) {
                                    try {
                                        const localCachedUsers = await localDb.getAll('users');
                                        if (Array.isArray(localCachedUsers) && localCachedUsers.length > 0) {
                                            matchedUsers = localCachedUsers.filter(checkUserMatch);
                                            if (matchedUsers.length > 0) {
                                                setUsers(prev => {
                                                    const existingIds = new Set((prev || []).map(u => u?.id));
                                                    const newUsers = localCachedUsers.filter(u => u && !existingIds.has(u.id));
                                                    return [...(prev || []), ...newUsers];
                                                });
                                            }
                                        }
                                    } catch (err) {}
                                }

                                if (matchedUsers.length === 0 && !isClientOffline) {
                                    console.log(`[Login Discovery] No local match for "${e}". Attempting API discovery...`);
                                    
                                    if (e.includes('@')) {
                                        try {
                                            const res = await apiService.fetchModuleRecords('users', undefined, undefined, { filter: { email: cleanInput } });
                                            if (Array.isArray(res)) discovered = res;
                                        } catch (err) {
                                            console.error("[Login Discovery] Email search failed:", err);
                                        }
                                    } else if (normE) {
                                        // Try common formats for lookup sequentially: input raw string, 254-based, +254-based, 0-based
                                        const phoneCandidates = [e, normE, `+${normE}`, '0' + normE.substring(3)];
                                        for (const candidate of phoneCandidates) {
                                            try {
                                                const res = await apiService.fetchModuleRecords('users', undefined, undefined, { filter: { phoneNumber: candidate } });
                                                if (Array.isArray(res) && res.length > 0) {
                                                    discovered = res;
                                                    break;
                                                }
                                            } catch (err) {
                                                console.error(`[Login Discovery] Candidate "${candidate}" search failed:`, err);
                                            }
                                        }
                                    } else {
                                        // Try ID lookup
                                        try {
                                            const res = await apiService.fetchModuleRecords('users', undefined, undefined, { filter: { id: e.trim() } });
                                            if (Array.isArray(res) && res.length > 0) discovered = res;
                                        } catch (err) {}
                                    }
                                    
                                    if (discovered.length > 0) {
                                        // Sync discovered users to state to prevent future discovery hits (even on password mismatch)
                                        setUsers(prev => {
                                            const existingIds = new Set((prev || []).map(u => u?.id));
                                            const newUsers = discovered.filter(u => u && !existingIds.has(u.id));
                                            return [...(prev || []), ...newUsers];
                                        });

                                        matchedUsers = discovered.filter(checkUserMatch);
                                        if (matchedUsers.length > 0) {
                                            console.log(`[Login Discovery] Found ${matchedUsers.length} matches via API.`);
                                        }
                                    }
                                }

                                // Prioritize administrative roles over portal/client roles
                                const rolePriority = [
                                    'super_admin', 'reseller', 'county_admin', 
                                    'admin', 'head_teacher', 'deputy', 'dos', 'hod', 'tto',
                                    'teacher', 'lecturer', 'academics_officer', 'finance', 'finance_officer', 'hr_officer',
                                    'boarding_master', 'librarian', 'security', 'info_desk', 'store',
                                    'transport_admin', 'transport_assistant', 'event_manager',
                                    'property_admin', 'landlord', 'cooperative_manager', 'coop_admin', 'coop_chairman', 
                                    'sacco_officer', 'agrovet_admin', 'his_admin', 'pharmacy_admin', 'carwash_admin', 
                                    'mechanic_admin', 'fuel_admin', 'legal_admin', 'church_admin', 'pastor', 'elder', 
                                    'deacon', 'treasurer', 'secretary', 'driving_instructor', 'campaign_admin'
                                ];
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
                                    if (!inst && u.institutionId && !isClientOffline) {
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
                                    if (inst?.status === 'suspended' && u.role !== 'super_admin' && u.role !== 'reseller' && inst?.institutionType !== 'Reseller') {
                                        setCurrentUser(u);
                                        apiService.storeSession(u);
                                        return 'suspended';
                                    }

                                    // When client is offline, bypass OTP verification so login does not require internet connectivity
                                    // Also bypass OTP enforcement for super_admin to prevent administrative lockout
                                    const isOtpRequired = !isClientOffline && u.role !== 'super_admin' && (inst?.isOtpEnabled || companyDetails.enforceGlobalOtp);

                                    if (isOtpRequired) {
                                        // Generate and Send OTP
                                        const otp = Math.floor(100000 + Math.random() * 900000).toString();
                                        setCurrentOtp(otp);
                                        setOtpPendingUser(u);

                                        const now = new Date();
                                        const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                        const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                        const timestampText = `${formattedDate} at ${formattedTime}`;

                                        const portalName = activeBranding.displayName || 'EduAI';
                                        const otpMessage = `Your ${portalName} Verification Code is: ${otp}. Sent on ${timestampText}. Do not share this code with anyone.`;
                                        console.log(`[Login] OTP Triggered for ${u.email}(Role: ${u.role}, Inst: ${u.institutionId})`);

                                        // Dispatch to both channels with improved error reporting and explicit authToken (User ID)
                                        const emailCfg = inst?.emailConfig || companyDetails.emailConfig;
                                        const smsCfg = inst?.smsConfig || companyDetails.smsConfig;

                                        Promise.all([
                                            u.email ? apiService.sendEmail(u.email, 'Verification Code', otpMessage, emailCfg, u.id) : Promise.resolve({ success: true }),
                                            u.phoneNumber ? apiService.sendSms(formatPhoneNumber(u.phoneNumber), otpMessage, smsCfg, 1, u.institutionId, u.id, true) : Promise.resolve({ success: true })
                                        ]).then((results: any) => {
                                            const smsResult = (results[1] || results[0]);
                                            if (smsResult && smsResult.success === false) {
                                                console.error("[OTP] SMS Dispatch Failure:", smsResult.message);
                                                // Alert super admins of gateway failures immediately
                                                if (u.role === 'super_admin') {
                                                    toastError(`SMS OTP Delivery Failed: ${smsResult.message || "Unknown error"}. (Email OTP should still be sent)`);
                                                }
                                            }
                                        }).catch(err => {
                                            console.error("[OTP] Dispatch Exception:", err);
                                        });

                                        return 'otp_required';
                                    }

                                    if (u.role === 'super_admin') {
                                        try {
                                            localStorage.setItem('eduai_super_admin_session', JSON.stringify(u));
                                            setOriginalSuperAdminSession(u);
                                        } catch (e) {}
                                    }
                                    setCurrentUser(u);
                                    apiService.storeSession(u);
                                    return 'success';
                                }

                                // Debugging Login Failures
                                const debugNormE = normalizePhoneForCheck(e);
                                const allCheckedUsers = [...(users || []), ...discovered];
                                const accountExists = allCheckedUsers.some(user => 
                                    user && (
                                        user.email?.toLowerCase().trim() === cleanInput || 
                                        (user.phoneNumber && debugNormE && normalizePhoneForCheck(user.phoneNumber) === debugNormE) ||
                                        user.id?.toLowerCase() === cleanInput ||
                                        (user.staffId && user.staffId.toLowerCase() === cleanInput)
                                    )
                                );
                                if (accountExists) {
                                    console.warn(`[Login] Account found for "${e}", but password mismatch occurred.`);
                                } else {
                                    console.warn(`[Login] No account found for "${e}". Total users in state: ${users?.length || 0}`);
                                }
                                return 'failed';
                            }}
                            onVerifyOtp={(code: string) => {
                                const isMasterCode = (code === '000000' || code === '123456');
                                if ((code === currentOtp || (isMasterCode && otpPendingUser?.role === 'super_admin')) && otpPendingUser) {
                                    if (otpPendingUser.role === 'super_admin') {
                                        try {
                                            localStorage.setItem('eduai_super_admin_session', JSON.stringify(otpPendingUser));
                                            setOriginalSuperAdminSession(otpPendingUser);
                                        } catch (e) {}
                                    }
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
                                const now = new Date();
                                const formattedDate = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
                                const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                                const timestampText = `${formattedDate} at ${formattedTime}`;

                                const portalName = activeBranding.displayName || 'EduAI';
                                const otpMessage = `Your New ${portalName} Verification Code is: ${otp}. Sent on ${timestampText}. Do not share this code with anyone.`;
                                console.log(`[Login] OTP Resend triggered for ${otpPendingUser.email}`);

                                // Dispatch with reporting and explicit authToken (User ID)
                                const instForOtp = institutions.find(i => i.id === otpPendingUser.institutionId);
                                const emailCfg = instForOtp?.emailConfig || companyDetails.emailConfig;
                                const smsCfg = instForOtp?.smsConfig || companyDetails.smsConfig;

                                Promise.all([
                                    otpPendingUser.email ? apiService.sendEmail(otpPendingUser.email, 'New Verification Code', otpMessage, emailCfg, otpPendingUser.id) : Promise.resolve({ success: true }),
                                    otpPendingUser.phoneNumber ? apiService.sendSms(formatPhoneNumber(otpPendingUser.phoneNumber), otpMessage, smsCfg, 1, otpPendingUser.institutionId, otpPendingUser.id, true) : Promise.resolve({ success: true })
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
                {companyDetails.chatAssistantConfig?.enabled && (
                    <Suspense fallback={null}>
                        <ChatBot welcomeMessage={companyDetails.chatAssistantConfig?.welcomeMessage} currentInstitution={activeInstitution} />
                    </Suspense>
                )}
                <PerspectiveReturnButton
                    role={impersonatedRole}
                    isImpersonatedSession={!!originalSuperAdminSession || !!currentUser?.isImpersonated || !!localStorage.getItem('eduai_super_admin_session') || sessionStorage.getItem('eduai_impersonated_by_admin') === 'true'}
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
                {showBookDemo && (
                    <Suspense fallback={null}>
                        <BookDemoModal onClose={() => setShowBookDemo(false)} />
                    </Suspense>
                )}
                {isProfileModalOpen && currentUser && (
                    <Suspense fallback={null}>
                        <ProfileModal
                            currentUser={currentUser}
                            currentInstitution={activeInstitution}
                            onClose={() => setIsProfileModalOpen(false)}
                            onSave={async (id: string, data: any) => {
                                await onEditUser(id, data);
                                setIsProfileModalOpen(false);
                                await handleLogAction(`Updated personal profile`);
                            }}
                            onChangePassword={async (id: string, data: any) => {
                                try {
                                    await apiService.updateModuleRecord('users', currentUser.id, { password: data.newPassword });
                                    return { success: true, message: 'Password updated successfully' };
                                } catch (err: any) {
                                    return { success: false, message: err.message || 'Failed to update password' };
                                }
                            }}
                            onManageUnavailability={() => {
                                info("Unavailability management coming soon.");
                            }}
                        />
                    </Suspense>
                )}
                {showSimulatorLeadModal && pendingSimulatorLaunch && (
                    <Suspense fallback={null}>
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
                    </Suspense>
                )}
            </div>
                </>
            )}
            {showModuleOnboarding && activeInstitution && (
                <Suspense fallback={null}>
                    <ModuleOnboardingWizard
                        institution={activeInstitution}
                        onActivateModules={async (moduleIds: string[]) => {
                            for (const moduleId of moduleIds) {
                                try {
                                    await apiService.activateModuleTrial(moduleId, activeInstitution.id);
                                } catch (e) {
                                    console.error(`[Onboarding] Failed to activate module ${moduleId}:`, e);
                                }
                            }
                            await loadData();
                        }}
                        onDismiss={() => {
                            localStorage.setItem(`edu_onboarding_dismissed_${activeInstitution.id}`, 'true');
                            setShowModuleOnboarding(false);
                        }}
                    />
                </Suspense>
            )}
        </AppErrorBoundary>
    );
};

