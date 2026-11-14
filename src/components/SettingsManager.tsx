
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type {
    User, Department, Subject, Building, Room, AllocationRequest,
    TimetableEntry, SmsConfig, EmailConfig, LetterheadConfig,
    TimetableSettings, Course, AcademicYear, Semester, Institution,
    ExamTimetableSettings, BiometricConfig, VoteHead, FeeStructure, FinancialPeriod,
    MpesaTransaction, InvoiceItem, TransactionStatus, ExtensionRequest,
    CompanyDetails, MpesaConfig, SubscriptionConfig, ScheduleProfile,
    TimetableConstraint, TimetableConstraintType, Break, TimetablePeriod, AcademicLevel,
    TeacherLogicRule, TeacherRuleType, Invoice, Receipt, NcbaConfig, FtpConfig, GoogleDriveConfig,
    DSSettings, DSFeeStructure, KcbConfig, CoopB2bConfig, WhatsAppConfig
} from '../types';
import { whatsappService, WhatsAppStatusResponse } from '../services/whatsappService';
import { RETAIL_SUBTYPES } from '../constants';
import { generateBCFeeStructure } from '../utils/bcReportGenerator';
import { AcademicYearManager } from './AcademicYearManager';
import { LocationSettings } from './LocationSettings';
import { BrandedPaper } from './BrandedPaper';
import { TruckIcon } from './icons/TruckIcon';
import { AlertTriangleIcon } from './icons/AlertTriangleIcon';
import { GradingSystemManager } from './GradingSystemManager';
import { SubjectGroupingManager } from './SubjectGroupingManager';
import { KcpeScoresManager } from './KcpeScoresManager';
import { ExamConfigManager } from './ExamConfigManager';
import { SubscriptionManager } from './SubscriptionManager';
import { StampCustomizerModal } from './common/StampCustomizerModal';
import { KenyanOfficialStamp } from './common/KenyanOfficialStamp';
import { supabase } from '../lib/supabase';
import { apiService } from '../services/apiService';
import { PrinterIcon } from './icons/PrinterIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { PlusIcon } from './icons/PlusIcon';
import { TrashIcon } from './icons/TrashIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ClockIcon } from './icons/ClockIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { ShieldIcon } from './icons/ShieldIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { MpesaIcon } from './icons/MpesaIcon';
import { NcbaIcon } from './icons/NcbaIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { RectangleStackIcon } from './icons/RectangleStackIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { EyeIcon } from './icons/EyeIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { printGateQrSignboard } from './TeacherCheckInView';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { StoreIcon } from './icons/StoreIcon';
import { PhoneIcon } from './icons/PhoneIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { SubjectManager } from './SubjectManager';
import { CourseManager } from './CourseManager';
import { DepartmentManager } from './DepartmentManager';
import { BuildingManager } from './BuildingManager';
import { AcademicLevelManager } from './AcademicLevelManager';
import { DatabaseSettings } from './DatabaseSettings';
import { UserManager } from './UserManager';
import { AcademicConfigManager } from './AcademicConfigManager';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { CalculatorIcon } from './icons/CalculatorIcon';
import { ConvenienceFeeSettingsModal } from './superadmin/ConvenienceFeeSettingsModal';

interface SettingsManagerProps {
    currentUser: User;
    departments: Department[];
    subjects: Subject[];
    buildings: Building[];
    rooms: Room[];
    courses: Course[];
    academicLevels?: AcademicLevel[];
    timetableSettings: TimetableSettings;
    examTimetableSettings: ExamTimetableSettings;
    logoUrl?: string | null;
    footerImageUrl?: string | null;
    themeColor: string;
    academicYears: AcademicYear[];
    semesters: Semester[];
    currentInstitution?: Institution | null;
    initialTab?: string;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
    onAddDepartment?: (name: string) => Promise<void> | void;
    onUpdateDepartment?: (departmentId: string, name: string) => void;
    onDeleteDepartment?: (departmentId: string) => void;
    onAddBuilding?: (name: string) => Promise<boolean>;
    onAddBuildings?: (buildings: Omit<Building, 'id' | 'institutionId'>[]) => Promise<void>;
    onUpdateBuilding?: (buildingId: string, data: Partial<Omit<Building, 'id' | 'institutionId'>>) => void;
    onDeleteBuilding?: (buildingId: string) => void;
    onAddRoom?: (roomData: Omit<Room, 'id' | 'institutionId'>) => void;
    onUpdateRoom?: (roomId: string, data: Partial<Omit<Room, 'id' | 'institutionId'>>) => void;
    onDeleteRoom?: (roomId: string) => void;
    onImportRooms?: (rooms: Omit<Room, 'id' | 'institutionId'>[]) => void;
    onAddSubject?: (subjectData: Omit<Subject, 'id' | 'institutionId'>, initialCourseLevelIds?: string[]) => void;
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    onDeleteSubject?: (subjectId: string) => void;
    onEditSubject?: (subject: Subject) => void;
    onImportSubjectsAndAssociate?: (subjects: (Omit<Subject, 'id' | 'institutionId'> & { targetCourseLevelId?: string })[]) => Promise<void>;
    onAssociateSubjectToCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onDisassociateSubjectFromCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onAddCourse?: (courseData: Omit<Course, 'id' | 'institutionId' | 'levels'>) => void;
    onImportCourses?: (courses: Omit<Course, 'id' | 'institutionId' | 'levels'>[]) => Promise<void>;
    onUpdateCourse?: (courseId: string, updatedData: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
    onDeleteCourse?: (courseId: string) => void;
    onAddAcademicLevel?: (name: string) => void;
    onUpdateAcademicLevel?: (levelId: string, name: string) => void;
    onDeleteAcademicLevel?: (levelId: string) => void;
    onSaveTimetableSettings?: (config: TimetableSettings) => void;
    onSaveExamTimetableSettings?: (config: ExamTimetableSettings) => void;
    onAddAcademicYear?: (data: Omit<AcademicYear, 'id' | 'institutionId' | 'status'>) => void;
    onUpdateAcademicYear?: (yearId: string, data: Partial<Omit<AcademicYear, 'id' | 'institutionId'>>) => void | Promise<void>;
    onDeleteAcademicYear?: (yearId: string) => void;
    onAddSemester?: (data: Omit<Semester, 'id' | 'institutionId'>) => void;
    onUpdateSemester?: (semesterId: string, data: Partial<Omit<Semester, 'id' | 'institutionId' | 'academicYearId'>>) => void | Promise<void>;
    onDeleteSemester?: (semesterId: string) => void;
    onUpdateThemeColor?: (color: string) => void;
    allocations: AllocationRequest[];
    isExamCalendarOnly?: boolean;
    isAcademicsOfficer?: boolean;
    isInstitutionalView?: boolean;
    onSaveSmsConfig?: (config: SmsConfig) => void;
    onSaveEmailConfig?: (config: EmailConfig) => void;
    onSaveLetterheadConfig?: (config: LetterheadConfig) => void;
    onUpdateLogo?: (logoUrl: string | null) => void;
    onUpdateFooterImage?: (footerUrl: string | null) => void;
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    isGeneratingDemoData?: boolean;
    demoDataGenerationProgress?: number;
    demoDataGenerationMessage?: string;
    onAddTransaction?: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onSaveBiometricConfig?: (config: BiometricConfig) => void;
    voteHeads?: VoteHead[];
    onUpdateVoteHeads?: (heads: VoteHead[]) => void;
    feeStructures?: FeeStructure[];
    onUpdateFeeStructures?: (structures: FeeStructure[]) => void;
    financialPeriods?: FinancialPeriod[];
    onUpdateFinancialPeriods?: (periods: FinancialPeriod[]) => void;
    onImportDepartments?: (departments: any[]) => Promise<void>;
    companyDetails?: CompanyDetails;
    onUpdateCompanyDetails?: (details: CompanyDetails) => Promise<void>;
    onRefreshData?: () => void;
    users: User[];
    onAddUser?: (userData: any) => Promise<void>;
    onEditUser?: (userId: string, data: any) => Promise<void>;
    onDeleteUser?: (userId: string) => Promise<void>;
    onImportUsers?: (users: any[]) => Promise<void>;
    letterheadConfig?: LetterheadConfig;
    transactions?: MpesaTransaction[];
    receipts?: Receipt[];
    invoices?: Invoice[];
    extensionRequests?: ExtensionRequest[];
    isCoop?: boolean;
    onAddExtensionRequest?: (reason: string) => void;
    onImportStudents?: (imported: any[]) => Promise<void>;
    smsConfig?: SmsConfig;
    onWithdrawRequest?: (id: string) => Promise<void>;
    onActivateModuleTrial?: (moduleId: string) => Promise<void>;
    onRunAlumniMigration?: () => Promise<void>;
    activityLogLimit?: number;
    setActivityLogLimit?: (limit: number | ((prev: number) => number)) => void;
    dsSettings?: DSSettings | null;
    onUpdateDSSettings?: (data: any) => Promise<void>;
    isDS?: boolean;
    activeScope?: string;
}

const CONSTRAINT_TYPE_LABELS: Record<TimetableConstraintType, string> = {
    consecutive_subjects: 'Must be consecutive',
    same_day_subjects: 'Must be on the same day',
    same_day_must_subjects: 'Must be on the same day (Strict)',
    no_break_between_subjects: 'No break between',
    subject_time_off: 'Specific Time Restriction',
    non_consecutive_subjects: 'Cannot be consecutive',
    different_day_subjects: 'Must be on different days',
    same_time_subjects: 'Option Block (Concurrent)'
};

const TEACHER_RULE_TYPE_LABELS: Record<TeacherRuleType, string> = {
    max_consecutive_lessons: 'Max Consecutive Lessons',
    max_lessons_per_day: 'Max Lessons Per Day',
    min_lessons_per_day: 'Min Lessons Per Day',
    preferred_start_time: 'Preferred Start Time',
    preferred_end_time: 'Preferred End Time',
    no_lessons_after: 'No Lessons After'
};

type SettingsTab = 'global_config' | 'general' | 'timetable' | 'calendar' | 'subjects' | 'courses' | 'facilities' | 'levels' | 'database' | 'custom_fields' | 'notifications' | 'financial' | 'staff';

export const SettingsManager: React.FC<SettingsManagerProps> = (props) => {
    const isSuperAdmin = props.currentUser.role === 'super_admin' && !props.isAcademicsOfficer && !props.isCoop && !props.isInstitutionalView;
    const isRetailAgency = useMemo(() => RETAIL_SUBTYPES.includes(props.currentInstitution?.businessSubType || ''), [props.currentInstitution]);
    const isAutoSales = useMemo(() => props.currentInstitution?.businessSubType?.toLowerCase().includes('car') || props.currentInstitution?.businessSubType?.toLowerCase().includes('auto'), [props.currentInstitution]);

    const isSchool = (props.currentInstitution?.institutionType === 'Education' && (props.currentInstitution?.category === 'Primary' || props.currentInstitution?.category === 'Secondary')) || (props.currentInstitution as any)?.institutionType === 'Primary' || (props.currentInstitution as any)?.institutionType === 'Secondary';
    const isChurch = useMemo(() => props.currentInstitution?.institutionType === 'Church', [props.currentInstitution]);
    const isEdu = useMemo(() => {
        const type = props.currentInstitution?.institutionType;
        return type === 'Education' || ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'TVET', 'Kindergarten'].includes((props.currentInstitution as any)?.institutionType || '');
    }, [props.currentInstitution]);

    const isCoop = useMemo(() => {
        if (typeof props.isCoop === 'boolean') return props.isCoop;
        const type = props.currentInstitution?.institutionType;
        const name = props.currentInstitution?.name?.toLowerCase() || '';
        const subType = props.currentInstitution?.businessSubType?.toLowerCase() || '';
        const isCoopRole = props.currentUser?.role?.includes('coop') || props.currentUser?.role?.includes('sacco');
        return type === 'Cooperative' || name.includes('cooperative') || name.includes('sacco') || name.includes('agrovet') || subType.includes('cooperative') || subType.includes('sacco') || subType.includes('agrovet') || isCoopRole;
    }, [props.currentInstitution, props.currentUser.role, props.isCoop]);

    const isCampaign = useMemo(() => props.currentInstitution?.institutionType === 'Political Campaign', [props.currentInstitution]);
    const isDS = useMemo(() => {
        if (typeof props.isDS === 'boolean') return props.isDS;
        const type = props.currentInstitution?.institutionType?.toLowerCase() || '';
        const category = props.currentInstitution?.category?.toLowerCase() || '';
        return type.includes('driving school') || category.includes('driving school');
    }, [props.currentInstitution, props.isDS]);

    const isBC = useMemo(() => {
        const type = props.currentInstitution?.institutionType?.toLowerCase() || '';
        const category = props.currentInstitution?.category?.toLowerCase() || '';
        return type.includes('beauty college') || category.includes('beauty college');
    }, [props.currentInstitution]);

    const [activeTab, setActiveTab] = useState<SettingsTab | 'driving_school' | 'beauty_college'>((isSuperAdmin && !isCoop) ? 'global_config' : isDS ? 'driving_school' : isBC ? 'beauty_college' : 'general');
    
    // Beauty College config states
    const [bcCourses, setBcCourses] = useState<any[]>([]);
    const [selectedBcCourseId, setSelectedBcCourseId] = useState<string>('');
    const [bcInstallments, setBcInstallments] = useState<{ label: string; amount: number }[]>([
        { label: 'Deposit (On Registration)', amount: 15000 },
        { label: 'Second Installment (Month 2)', amount: 10000 },
        { label: 'Final Balance (Month 3)', amount: 5000 }
    ]);
    const [loadingBcCourses, setLoadingBcCourses] = useState(false);
    const [isGeneratingBcFee, setIsGeneratingBcFee] = useState(false);
    const [isStampModalOpen, setIsStampModalOpen] = useState(false);

    const handleAddBcInstallment = () => {
        setBcInstallments(prev => [...prev, { label: `Installment ${prev.length + 1}`, amount: 5000 }]);
    };

    const handleRemoveBcInstallment = (index: number) => {
        setBcInstallments(prev => prev.filter((_, i) => i !== index));
    };

    const handleBcInstallmentChange = (index: number, field: 'label' | 'amount', value: any) => {
        setBcInstallments(prev => prev.map((item, i) => {
            if (i === index) {
                return { ...item, [field]: field === 'amount' ? (parseFloat(value) || 0) : value };
            }
            return item;
        }));
    };

    const handleDownloadBcFeeStructure = async () => {
        const course = bcCourses.find(c => c.id === selectedBcCourseId);
        if (!course) {
            alert('Please select a course first.');
            return;
        }
        setIsGeneratingBcFee(true);
        try {
            const doc = await generateBCFeeStructure(course, bcInstallments, props.currentInstitution);
            doc.save(`${course.name.replace(/\s+/g, '_')}_Fee_Structure.pdf`);
        } catch (err) {
            console.error('Failed to generate fee structure PDF:', err);
            alert('Failed to generate PDF.');
        } finally {
            setIsGeneratingBcFee(false);
        }
    };

    const [timetableSubTab, setTimetableSubTab] = useState<'hours' | 'periods' | 'constraints' | 'exams' | 'teacher_logic'>('hours');
    const [generalSubTab, setGeneralSubTab] = useState<'profile' | 'academic_settings' | 'security_policy' | 'location' | 'branding' | 'grading' | 'billing' | 'integrations' | 'sms' | 'whatsapp' | 'email' | 'farmer_billing' | 'subject_grouping' | 'kcpe_scores' | 'exam_config'>('profile');
    const [globalSubTab, setGlobalSubTab] = useState<'profile' | 'infrastructure' | 'branding' | 'sms' | 'email' | 'billing' | 'integrations' | 'showcase' | 'storage' | 'googledrive' | 'convenience_fees'>('profile');
    const [showConvenienceFeeModal, setShowConvenienceFeeModal] = useState(false);
    const [billingSubTab, setBillingSubTab] = useState<'mpesa' | 'gateways' | 'ncba' | 'kcb' | 'equity' | 'im' | 'coop'>('mpesa');
    const [instIntegrationTab, setInstIntegrationTab] = useState<'mpesa' | 'ncba' | 'googledrive' | 'itax'>('mpesa');
    const [facilitiesSubTab, setFacilitiesSubTab] = useState<'departments' | 'buildings' | 'rooms' | 'levels' | 'streams'>(isDS ? 'buildings' : 'departments');
    const [dsConfigSubTab, setDsConfigSubTab] = useState<'business_rules' | 'license_category' | 'license_groups' | 'vote_heads' | 'fee_structures'>('business_rules');
    const [newLicenseGroupForm, setNewLicenseGroupForm] = useState('');
    const [editingLicenseGroupOriginalName, setEditingLicenseGroupOriginalName] = useState<string | null>(null);
    const [editingLicenseGroupForm, setEditingLicenseGroupForm] = useState('');
    const [showPaperPreview, setShowPaperPreview] = useState(false);
    const [isAddingVoteHead, setIsAddingVoteHead] = useState(false);
    const [editingVoteHeadId, setEditingVoteHeadId] = useState<string | null>(null);
    const [newVoteHeadForm, setNewVoteHeadForm] = useState({ name: '', allocatedAmount: 0, priority: 1 });



    // External tab navigation sync
    useEffect(() => {
        if (props.initialTab) {
            setActiveTab(props.initialTab as SettingsTab);
        }
    }, [props.initialTab]);

    useEffect(() => {
        if (isDS && facilitiesSubTab === 'departments') {
            setFacilitiesSubTab('buildings');
        }
    }, [isDS, facilitiesSubTab]);

    useEffect(() => {
        if (!isBC) return;
        const loadBcCourses = async () => {
            setLoadingBcCourses(true);
            try {
                const instId = props.currentInstitution?.id || 'GLOBAL';
                const list = await apiService.fetchModuleRecords('bc_courses', instId).catch(() => []);
                setBcCourses(list || []);
                if (list && list.length > 0) {
                    setSelectedBcCourseId(list[0].id);
                }
            } catch (err) {
                console.error('[SettingsManager] Failed to load BC courses:', err);
            } finally {
                setLoadingBcCourses(false);
            }
        };
        loadBcCourses();
    }, [isBC, props.currentInstitution]);

    // --- Timetable Rules State ---
    const [selectedProfileId, setSelectedProfileId] = useState<string>('default');
    const [localTimetableSettings, setLocalTimetableSettings] = useState<TimetableSettings>(props.timetableSettings);
    const [newBreak, setNewBreak] = useState({ name: '', startTime: '', endTime: '' });
    const [newPeriod, setNewPeriod] = useState({ name: '', startTime: '', endTime: '' });
    const [newProfileName, setNewProfileName] = useState('');

    // --- Constraint Form State ---
    const [newConstraint, setNewConstraint] = useState<{
        type: TimetableConstraintType,
        subjectIds: string[],
        day?: string,
        startTime?: string,
        endTime?: string
    }>({
        type: 'consecutive_subjects',
        subjectIds: []
    });

    const [newTeacherRule, setNewTeacherRule] = useState<{
        type: TeacherRuleType,
        value: any,
        lecturerId?: string
    }>({
        type: 'max_consecutive_lessons',
        value: 2
    });

    const resolveVisitorSettings = useCallback((inst?: Institution | null) => {
        const instId = inst?.id;
        let localSaved: any = null;
        try {
            const raw = (instId && localStorage.getItem(`eduai_visitor_settings_${instId}`)) || localStorage.getItem('eduai_visitor_settings');
            if (raw) localSaved = JSON.parse(raw);
        } catch (_) {}

        // Also check if moduleStates has visitor_settings
        const vState = inst?.moduleStates?.find((m: any) => (m.moduleId === 'visitor_settings' || m.module_id === 'visitor_settings'));
        let modData: any = null;
        if (vState?.data) {
            try {
                modData = typeof vState.data === 'string' ? JSON.parse(vState.data) : vState.data;
            } catch (_) {}
        }

        const cleanTime = (val: any) => {
            if (!val || typeof val !== 'string') return '';
            const t = val.trim();
            if (/^\d{1,2}:\d{2}/.test(t)) {
                return t.slice(0, 5);
            }
            return t;
        };

        const localTime = cleanTime(localSaved?.visitorAutoFinalizeTime || localSaved?.visitor_auto_finalize_time);
        const modTime = cleanTime(modData?.visitorAutoFinalizeTime || modData?.visitor_auto_finalize_time);
        const instTime = cleanTime(inst?.visitorAutoFinalizeTime || (inst as any)?.visitor_auto_finalize_time);

        // Determine enabled state: localSaved (user preference on device) takes top priority
        let enabled = false;
        if (localSaved && (localSaved.visitorAutoFinalizeEnabled !== undefined || localSaved.visitor_auto_finalize_enabled !== undefined)) {
            enabled = Boolean(localSaved.visitorAutoFinalizeEnabled ?? localSaved.visitor_auto_finalize_enabled);
        } else if (modData && (modData.visitorAutoFinalizeEnabled !== undefined || modData.visitor_auto_finalize_enabled !== undefined)) {
            enabled = Boolean(modData.visitorAutoFinalizeEnabled ?? modData.visitor_auto_finalize_enabled);
        } else if (inst && (inst.visitorAutoFinalizeEnabled !== undefined || (inst as any)?.visitor_auto_finalize_enabled !== undefined)) {
            enabled = Boolean(inst.visitorAutoFinalizeEnabled ?? (inst as any)?.visitor_auto_finalize_enabled);
        }

        // Determine time: prioritize explicit saved user time
        let time = '18:00';
        if (localTime) {
            time = localTime;
        } else if (modTime) {
            time = modTime;
        } else if (instTime) {
            time = instTime;
        }

        const notifyHost = localSaved?.notifyHostOnVisitorArrival ?? 
                           localSaved?.notify_host_on_visitor_arrival ?? 
                           modData?.notifyHostOnVisitorArrival ?? 
                           modData?.notify_host_on_visitor_arrival ?? 
                           inst?.notifyHostOnVisitorArrival ?? 
                           (inst as any)?.notify_host_on_visitor_arrival ?? 
                           true;

        const smsTemplate = localSaved?.visitorArrivalSmsTemplate || 
                            localSaved?.visitor_arrival_sms_template || 
                            modData?.visitorArrivalSmsTemplate || 
                            modData?.visitor_arrival_sms_template || 
                            inst?.visitorArrivalSmsTemplate || 
                            (inst as any)?.visitor_arrival_sms_template || 
                            '';

        return { enabled: Boolean(enabled), time: time || '18:00', notifyHost: Boolean(notifyHost), smsTemplate };
    }, []);

    // --- Institution Profile State ---
    const [instProfile, setInstProfile] = useState(() => {
        const initialVisitor = resolveVisitorSettings(props.currentInstitution);
        return {
            email: props.currentInstitution?.email || '',
            phoneNumber: props.currentInstitution?.phoneNumber || '',
            useAllocationRequests: props.currentInstitution?.useAllocationRequests ?? true,
            aiModelTier: props.currentInstitution?.aiModelTier || 'premium',
            isOtpEnabled: Boolean(props.currentInstitution?.isOtpEnabled ?? (props.currentInstitution as any)?.is_otp_enabled ?? false),
            parentAbsenceNotificationsEnabled: props.currentInstitution?.parentAbsenceNotificationsEnabled ?? false,
            farmerSmsBillingEnabled: props.currentInstitution?.farmerSmsBillingEnabled ?? false,
            slug: props.currentInstitution?.slug || '',
            googleDriveConfig: props.currentInstitution?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false },
            storeHoursEnforced: props.currentInstitution?.storeHoursEnforced ?? false,
            storeOpenTime: props.currentInstitution?.storeOpenTime || '08:00',
            storeCloseTime: props.currentInstitution?.storeCloseTime || '17:00',
            kioskUrl: props.currentInstitution?.kioskUrl || '',
            customSubdomain: props.currentInstitution?.customSubdomain || '',
            useSubdomain: props.currentInstitution?.useSubdomain ?? false,
            kioskSecurityPin: props.currentInstitution?.kioskSecurityPin || '1234',
            kioskStatus: props.currentInstitution?.kioskStatus || 'active',
            visitorAutoFinalizeEnabled: initialVisitor.enabled,
            visitorAutoFinalizeTime: initialVisitor.time,
            notifyHostOnVisitorArrival: initialVisitor.notifyHost,
            visitorArrivalSmsTemplate: initialVisitor.smsTemplate
        };
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    // --- Exam Settings State ---
    const [localExamSettings, setLocalExamSettings] = useState<ExamTimetableSettings>(props.examTimetableSettings);
    const [newExamSession, setNewExamSession] = useState({ name: '', startTime: '', endTime: '' });

    // Sync from props if they change
    useEffect(() => { setLocalTimetableSettings(props.timetableSettings); }, [props.timetableSettings]);
    useEffect(() => { setLocalExamSettings(props.examTimetableSettings); }, [props.examTimetableSettings]);
    useEffect(() => {
        if (props.currentInstitution) {
            const v = resolveVisitorSettings(props.currentInstitution);
            setInstProfile(prev => ({
                ...prev,
                email: props.currentInstitution?.email || '',
                phoneNumber: props.currentInstitution?.phoneNumber || '',
                useAllocationRequests: props.currentInstitution?.useAllocationRequests ?? true,
                aiModelTier: props.currentInstitution?.aiModelTier || 'premium',
                isOtpEnabled: Boolean(props.currentInstitution?.isOtpEnabled ?? (props.currentInstitution as any)?.is_otp_enabled ?? false),
                parentAbsenceNotificationsEnabled: props.currentInstitution?.parentAbsenceNotificationsEnabled ?? false,
                farmerSmsBillingEnabled: props.currentInstitution?.farmerSmsBillingEnabled ?? false,
                slug: props.currentInstitution?.slug || '',
                googleDriveConfig: props.currentInstitution?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false },
                storeHoursEnforced: props.currentInstitution?.storeHoursEnforced ?? false,
                storeOpenTime: props.currentInstitution?.storeOpenTime || '08:00',
                storeCloseTime: props.currentInstitution?.storeCloseTime || '17:00',
                kioskUrl: props.currentInstitution?.kioskUrl || '',
                customSubdomain: props.currentInstitution?.customSubdomain || '',
                useSubdomain: props.currentInstitution?.useSubdomain ?? false,
                kioskSecurityPin: props.currentInstitution?.kioskSecurityPin || '1234',
                kioskStatus: props.currentInstitution?.kioskStatus || 'active',
                visitorAutoFinalizeEnabled: v.enabled,
                visitorAutoFinalizeTime: v.time,
                notifyHostOnVisitorArrival: v.notifyHost,
                visitorArrivalSmsTemplate: v.smsTemplate
            }));
        }
    }, [props.currentInstitution, resolveVisitorSettings]);

    // Per-institution SMS gateway config state (for admin SMS Gateway sub-tab)
    const [localInstSmsConfig, setLocalInstSmsConfig] = useState<SmsConfig>(
        props.currentInstitution?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' }
    );

    const [localInstMpesaConfig, setLocalInstMpesaConfig] = useState<MpesaConfig>(
        props.currentInstitution?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' }
    );
    const [localInstNcbaConfig, setLocalInstNcbaConfig] = useState<NcbaConfig>(
        props.currentInstitution?.ncbaConfig || { clientId: '', clientSecret: '', username: '', password: '', baseUrl: 'https://sandbox.ncbagroup.com', environment: 'sandbox' }
    );
    const [localInstGoogleDriveConfig, setLocalInstGoogleDriveConfig] = useState<GoogleDriveConfig>(
        props.currentInstitution?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false }
    );
    const [isSavingInstSms, setIsSavingInstSms] = useState(false);
    const [saveInstSmsStatus, setSaveInstSmsStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [isSavingInstGateways, setIsSavingInstGateways] = useState(false);
    const [saveInstGatewaysStatus, setSaveInstGatewaysStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [instSmsTestPhone, setInstSmsTestPhone] = useState('');
    const [isTestingInstSms, setIsTestingInstSms] = useState(false);

    // WhatsApp Gateway Config state
    const [localInstWhatsAppConfig, setLocalInstWhatsAppConfig] = useState<WhatsAppConfig>(
        props.currentInstitution?.whatsappConfig || {
            provider_type: 'gateway',
            gateway_url: '',
            api_key: '',
            instance_name: '',
            phone_number: '',
            auto_send_receipts: true,
            auto_send_fee_reminders: false,
            auto_send_academic_results: false
        }
    );
    const [waLiveStatus, setWaLiveStatus] = useState<WhatsAppStatusResponse | null>(null);
    const [isLoadingWaStatus, setIsLoadingWaStatus] = useState(false);
    const [isSavingWhatsApp, setIsSavingWhatsApp] = useState(false);
    const [saveWaStatus, setSaveWaStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [testWaRecipient, setTestWaRecipient] = useState('');
    const [isSendingTestWa, setIsSendingTestWa] = useState(false);

    const loadWhatsAppStatus = async () => {
        if (!props.currentInstitution?.id) return;
        setIsLoadingWaStatus(true);
        try {
            const res = await whatsappService.getStatus(props.currentInstitution.id);
            setWaLiveStatus(res);
            if (res.phoneNumber) {
                setLocalInstWhatsAppConfig(prev => ({ ...prev, phone_number: res.phoneNumber, is_connected: res.isConnected }));
            }
        } catch (e) {
            console.warn('Failed to load WhatsApp live status:', e);
        } finally {
            setIsLoadingWaStatus(false);
        }
    };

    useEffect(() => {
        if (generalSubTab === 'whatsapp' && props.currentInstitution?.id) {
            loadWhatsAppStatus();
        }
    }, [generalSubTab, props.currentInstitution?.id]);

    const [isTestingStk, setIsTestingStk] = useState(false);
    const [isTestingNcba, setIsTestingNcba] = useState(false);
    const [isTestingFtp, setIsTestingFtp] = useState(false);

    useEffect(() => {
        setLocalInstSmsConfig(props.currentInstitution?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
        setLocalInstMpesaConfig(props.currentInstitution?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
        setLocalInstNcbaConfig(props.currentInstitution?.ncbaConfig || { clientId: '', clientSecret: '', username: '', password: '', baseUrl: 'https://sandbox.ncbagroup.com', environment: 'sandbox' });
        setLocalInstGoogleDriveConfig(props.currentInstitution?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false });
    }, [props.currentInstitution]);

    const [localDsSettings, setLocalDsSettings] = useState<DSSettings | null>(props.dsSettings || null);
    const [isAddingFee, setIsAddingFee] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingFeeId, setEditingFeeId] = useState<string | null>(null);
    const [newFeeForm, setNewFeeForm] = useState<{
        className: string;
        description?: string;
        items: Array<{ name: string; amount: number; priority: number }>;
    }>({
        className: '',
        description: '',
        items: [
            { name: 'Tuition Fee', amount: 15000, priority: 1 },
            { name: 'PDL', amount: 1500, priority: 2 },
            { name: 'Assessment', amount: 2000, priority: 3 }
        ]
    });
    const [isAddingLicenseCategory, setIsAddingLicenseCategory] = useState(false);
    const [editingLicenseCategoryId, setEditingLicenseCategoryId] = useState<string | null>(null);
    const [newLicenseCategoryForm, setNewLicenseCategoryForm] = useState({
        code: '',
        name: '',
        description: '',
        isActive: true,
        parentCategory: ''
    });
    const [managingFeeForCategory, setManagingFeeForCategory] = useState<string | null>(null);
    useEffect(() => {
        if (activeTab !== 'driving_school') {
            setLocalDsSettings(props.dsSettings || null);
        } else if (props.dsSettings && (!localDsSettings || !localDsSettings.id)) {
            // Sync metadata (like ID) from props while preserving local edits
            setLocalDsSettings(prev => ({
                ...props.dsSettings,
                ...(prev || {})
            }) as DSSettings);
        }
    }, [props.dsSettings, activeTab]);
    // Update local state when profile changes
    useEffect(() => {
        if (selectedProfileId === 'default') {
            setLocalTimetableSettings(props.timetableSettings);
        } else if (props.currentInstitution?.scheduleProfiles) {
            const profile = props.currentInstitution.scheduleProfiles.find((p: ScheduleProfile) => p.id === selectedProfileId);
            if (profile) {
                // Cast profile to TimetableSettings shape for local editing
                setLocalTimetableSettings({
                    ...props.timetableSettings, // keep constraints from global
                    operatingDays: profile.operatingDays,
                    startTime: profile.startTime,
                    endTime: profile.endTime,
                    periods: profile.periods,
                    breaks: profile.breaks,
                    cellSpanMinutes: profile.cellSpanMinutes
                });
            }
        }
    }, [selectedProfileId, props.timetableSettings, props.currentInstitution]);


    const handleSaveInstitutionProfile = async () => {
        if (!props.currentInstitution) return;
        setIsSavingProfile(true);
        try {
            const visitorCutoff = instProfile.visitorAutoFinalizeTime || '18:00';
            const visitorEnabled = Boolean(instProfile.visitorAutoFinalizeEnabled);
            const notifyHost = instProfile.notifyHostOnVisitorArrival ?? true;
            const visitorTemplate = instProfile.visitorArrivalSmsTemplate || '';

            // Synchronously backup visitor settings to local storage immediately
            try {
                const visitorPayload = {
                    visitorAutoFinalizeEnabled: visitorEnabled,
                    visitorAutoFinalizeTime: visitorCutoff,
                    notifyHostOnVisitorArrival: notifyHost,
                    visitorArrivalSmsTemplate: visitorTemplate,
                    visitor_auto_finalize_enabled: visitorEnabled,
                    visitor_auto_finalize_time: visitorCutoff,
                    notify_host_on_visitor_arrival: notifyHost,
                    visitor_arrival_sms_template: visitorTemplate
                };
                if (props.currentInstitution.id) {
                    localStorage.setItem(`eduai_visitor_settings_${props.currentInstitution.id}`, JSON.stringify(visitorPayload));
                }
                localStorage.setItem('eduai_visitor_settings', JSON.stringify(visitorPayload));
            } catch (_) {}

            const finalProfile = {
                ...instProfile,
                isOtpEnabled: Boolean(instProfile.isOtpEnabled),
                is_otp_enabled: Boolean(instProfile.isOtpEnabled),
                visitorAutoFinalizeEnabled: visitorEnabled,
                visitorAutoFinalizeTime: visitorCutoff,
                visitor_auto_finalize_enabled: visitorEnabled,
                visitor_auto_finalize_time: visitorCutoff,
                notifyHostOnVisitorArrival: notifyHost,
                notify_host_on_visitor_arrival: notifyHost,
                visitorArrivalSmsTemplate: visitorTemplate,
                visitor_arrival_sms_template: visitorTemplate,
                kioskUrl: instProfile.kioskUrl?.trim() || (
                    instProfile.useSubdomain && instProfile.customSubdomain
                        ? `https://${instProfile.customSubdomain}.eduai.co.ke/kiosk`
                        : `${window.location.origin}${window.location.pathname}?view=ds&tab=portal&kiosk=checkin&shop=${instProfile.slug || props.currentInstitution.slug || props.currentInstitution.id}`
                )
            };
            await props.onUpdateInstitution?.(props.currentInstitution.id, finalProfile);
            alert('Institution records updated successfully.');
        } catch (err: any) {
            console.error('Update Profile Failure:', err);
            alert('Failed to update profile: ' + err.message);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handleSaveTimetable = () => {
        if (selectedProfileId === 'default') {
            props.onSaveTimetableSettings?.(localTimetableSettings);
        } else {
            // Saving a specific profile
            if (props.currentInstitution && props.onUpdateInstitution) {
                const updatedProfiles = (props.currentInstitution.scheduleProfiles || []).map((p: ScheduleProfile) => {
                    if (p.id === selectedProfileId) {
                        return {
                            ...p,
                            operatingDays: localTimetableSettings.operatingDays || [],
                            startTime: localTimetableSettings.startTime,
                            endTime: localTimetableSettings.endTime,
                            periods: localTimetableSettings.periods || [],
                            breaks: localTimetableSettings.breaks || [],
                            cellSpanMinutes: localTimetableSettings.cellSpanMinutes
                        };
                    }
                    return p;
                });
                props.onUpdateInstitution(props.currentInstitution.id, { scheduleProfiles: updatedProfiles });
            }
        }
        alert('Timetable rules synchronized with cloud.');
    };

    const handleAddProfile = () => {
        if (!newProfileName.trim() || !props.currentInstitution || !props.onUpdateInstitution) return;

        const newProfile: ScheduleProfile = {
            id: `prof_${Date.now()}`,
            name: newProfileName.trim(),
            operatingDays: props.timetableSettings.operatingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            startTime: props.timetableSettings.startTime || '08:00',
            endTime: props.timetableSettings.endTime || '17:00',
            periods: props.timetableSettings.periods || [],
            breaks: props.timetableSettings.breaks || [],
            cellSpanMinutes: props.timetableSettings.cellSpanMinutes || 60
        };

        const updatedProfiles = [...(props.currentInstitution.scheduleProfiles || []), newProfile];
        props.onUpdateInstitution(props.currentInstitution.id, { scheduleProfiles: updatedProfiles });
        setSelectedProfileId(newProfile.id);
        setNewProfileName('');
    };

    const handleDeleteProfile = (id: string) => {
        if (!props.currentInstitution || !props.onUpdateInstitution || id === 'default') return;
        if (!confirm('Are you sure you want to purge this schedule profile? This will revert any associated courses to the global default.')) return;

        const updatedProfiles = (props.currentInstitution.scheduleProfiles || []).filter((p: ScheduleProfile) => p.id !== id);
        props.onUpdateInstitution(props.currentInstitution.id, { scheduleProfiles: updatedProfiles });
        setSelectedProfileId('default');
    };

    const handleSaveExams = () => {
        props.onSaveExamTimetableSettings?.(localExamSettings);
        alert('Exam settings synchronized with cloud.');
    };

    const handleToggleOperatingDay = (day: string) => {
        setLocalTimetableSettings((prev: TimetableSettings) => {
            const current = prev.operatingDays || [];
            const next = current.includes(day as any)
                ? current.filter((d: string) => d !== day)
                : [...current, day as any];
            return { ...prev, operatingDays: next as any };
        });
    };

    const handleAddExamSession = () => {
        if (!newExamSession.name || !newExamSession.startTime || !newExamSession.endTime) {
            alert("Please provide name and times for the exam window.");
            return;
        }
        const sessionObj = { id: `sess_${Date.now()}`, ...newExamSession };
        setLocalExamSettings((prev: ExamTimetableSettings) => ({
            ...prev,
            sessionsPerDay: [...(prev.sessionsPerDay || []), sessionObj]
        }));
        setNewExamSession({ name: '', startTime: '', endTime: '' });
    };

    const handleDeleteExamSession = (id: string) => {
        setLocalExamSettings((prev: ExamTimetableSettings) => ({
            ...prev,
            sessionsPerDay: (prev.sessionsPerDay || []).filter((s: any) => s.id !== id)
        }));
    };

    const handleAddConstraint = () => {
        if (newConstraint.subjectIds.length === 0) return;

        const subjectNames = newConstraint.subjectIds.map((id: string) => props.subjects.find((s: Subject) => s.id === id)?.name || 'Unknown').join(', ');
        const description = `${CONSTRAINT_TYPE_LABELS[newConstraint.type as TimetableConstraintType]}: ${subjectNames}${newConstraint.day ? ` on ${newConstraint.day}` : ''}`;

        const constraint: TimetableConstraint = {
            id: `const_${Date.now()}`,
            ...newConstraint,
            description
        };

        // Constraints are always global, stored in main settings
        setLocalTimetableSettings((prev: TimetableSettings) => ({
            ...prev,
            constraints: [...(prev.constraints || []), constraint]
        }));
        setNewConstraint({ type: 'consecutive_subjects', subjectIds: [] });
    };

    const handleAddTeacherRule = () => {
        let description = `${TEACHER_RULE_TYPE_LABELS[newTeacherRule.type]}: ${newTeacherRule.value}`;
        if (newTeacherRule.lecturerId) {
            const lect = props.users.find(u => u.id === newTeacherRule.lecturerId);
            description += ` (Only for ${lect?.name || 'Unknown'})`;
        } else {
            description += ' (Global)';
        }

        const rule: TeacherLogicRule = {
            id: `trule_${Date.now()}`,
            ...newTeacherRule,
            description
        };

        setLocalTimetableSettings((prev: TimetableSettings) => ({
            ...prev,
            teacherRules: [...(prev.teacherRules || []), rule]
        }));
        setNewTeacherRule({ type: 'max_consecutive_lessons', value: 2 });
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead' | 'footer') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `branding/${props.currentInstitution?.id || 'global'}/${type}_${timestamp}.${ext}`;

            const publicUrl = await apiService.uploadFile('eduai', path, file);
            if (publicUrl) {
                // Secondary Mirror to Cloud Storage (Google Drive)
                try {
                    await apiService.uploadToGoogleDrive(file, 'Branding_Assets');
                } catch (gdMirrorErr) {
                    console.warn("Cloud Mirror failed:", gdMirrorErr);
                }

                if (type === 'logo') props.onUpdateLogo?.(publicUrl);
                if (type === 'letterhead') {
                    const currentConfig = props.letterheadConfig || { headerImageUrl: null, stampImageUrl: null };
                    props.onSaveLetterheadConfig?.({ ...currentConfig, headerImageUrl: publicUrl });
                }
                if (type === 'footer') props.onUpdateFooterImage?.(publicUrl);
            }
        } catch (err) {
            console.error(`Institution ${type} upload error:`, err);
            alert(`Failed to upload ${type}.`);
        }
    };

    const [localCompanyInfo, setLocalCompanyInfo] = useState({
        name: props.companyDetails?.name || '',
        applicationTitle: props.companyDetails?.applicationTitle || '',
        themeColor: props.companyDetails?.themeColor || '#4f46e5',
        email: props.companyDetails?.email || '',
        phone: props.companyDetails?.phone || '',
        website: props.companyDetails?.website || '',
        androidUrl: props.companyDetails?.androidUrl || '',
        address: props.companyDetails?.address || '',
        logoUrl: props.companyDetails?.logoUrl || '',
        footerImageUrl: props.companyDetails?.footerImageUrl || '',
        letterheadConfig: props.companyDetails?.letterheadConfig || { headerImageUrl: null, stampImageUrl: null },
        welcomeMessage: props.companyDetails?.chatAssistantConfig?.welcomeMessage || '',
        chatEnabled: props.companyDetails?.chatAssistantConfig?.enabled ?? true,
        enforceGlobalOtp: props.currentInstitution?.institutionType === 'Business' ? props.companyDetails?.enforceGlobalOtp ?? false : props.companyDetails?.enforceGlobalOtp ?? false,
        enforceSuperAdminOtp: props.companyDetails?.enforceSuperAdminOtp ?? (props.companyDetails as any)?.enforce_super_admin_otp ?? false,
        enabledGateways: props.companyDetails?.enabledGateways || ['mpesa'],
        showcaseConfig: props.companyDetails?.showcaseConfig || { enabled: true, showLoginLink: true },
        alumnaeJoiningFee: props.companyDetails?.alumnaeJoiningFee || 0
    });

    const [localSmsConfig, setLocalSmsConfig] = useState<SmsConfig>(props.companyDetails?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
    const [localEmailConfig, setLocalEmailConfig] = useState<EmailConfig>(props.companyDetails?.emailConfig || { provider: 'smtp', host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
    const [localMpesaConfig, setLocalMpesaConfig] = useState<MpesaConfig>(props.companyDetails?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
    const [localNcbaConfig, setLocalNcbaConfig] = useState<NcbaConfig>(
        props.companyDetails?.ncbaConfig || { clientId: '', clientSecret: '', username: '', password: '', baseUrl: 'https://c2bapis.ncbagroup.com', environment: 'production' }
    );
    const [localSubConfig, setLocalSubConfig] = useState<SubscriptionConfig>(props.companyDetails?.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultQuarterlyPrice: 15000, defaultYearlyPrice: 50000 });
    const [localFtpConfig, setLocalFtpConfig] = useState<FtpConfig>(props.companyDetails?.ftpConfig || { host: '', port: 21, user: '', password: '', remoteRoot: '/', publicUrlRoot: '' });
    const [localGoogleDriveConfig, setLocalGoogleDriveConfig] = useState<GoogleDriveConfig>(props.companyDetails?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false });
    const [localKcbConfig, setLocalKcbConfig] = useState<KcbConfig>(props.companyDetails?.kcbConfig || { appKey: '', appSecret: '', environment: 'sandbox' });
    const [localCoopConfig, setLocalCoopConfig] = useState<CoopB2bConfig>(props.companyDetails?.coopConfig || { serviceName: 'KEWISCO SACCO', connectionID: 'TEST', connectionPassword: 'CoopTest', institutionCode: '210001918' });
    const [coopIps, setCoopIps] = useState<{ serverIp: string; clientIp: string } | null>(null);

    const [isSavingConfigs, setIsSavingConfigs] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    useEffect(() => {
        fetch('/api/coop-b2b/ip')
            .then(res => res.json())
            .then(data => setCoopIps(data))
            .catch(() => {});
    }, []);

    // Sync Props to Local State
    useEffect(() => {
        if (props.companyDetails) {
            setLocalCompanyInfo({
                name: props.companyDetails.name || '',
                applicationTitle: props.companyDetails.applicationTitle || '',
                themeColor: props.companyDetails.themeColor || '#4f46e5',
                email: props.companyDetails.email || '',
                phone: props.companyDetails.phone || '',
                website: props.companyDetails.website || '',
                androidUrl: props.companyDetails.androidUrl || '',
                address: props.companyDetails.address || '',
                logoUrl: props.companyDetails.logoUrl || '',
                footerImageUrl: props.companyDetails.footerImageUrl || '',
                letterheadConfig: props.companyDetails.letterheadConfig || { headerImageUrl: null, stampImageUrl: null },
                welcomeMessage: props.companyDetails.chatAssistantConfig?.welcomeMessage || '',
                chatEnabled: props.companyDetails.chatAssistantConfig?.enabled ?? true,
                enforceGlobalOtp: props.companyDetails.enforceGlobalOtp ?? false,
                enforceSuperAdminOtp: props.companyDetails.enforceSuperAdminOtp ?? (props.companyDetails as any)?.enforce_super_admin_otp ?? false,
                enabledGateways: props.companyDetails.enabledGateways || ['mpesa'],
                showcaseConfig: props.companyDetails.showcaseConfig || { enabled: true, showLoginLink: true },
                alumnaeJoiningFee: props.companyDetails.alumnaeJoiningFee || 0
            });
            setLocalSmsConfig(props.companyDetails.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
            setLocalEmailConfig(props.companyDetails.emailConfig || { provider: 'smtp', host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
            setLocalMpesaConfig(props.companyDetails.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
            setLocalNcbaConfig(props.companyDetails.ncbaConfig || { clientId: '', clientSecret: '', username: '', password: '', baseUrl: 'https://c2bapis.ncbagroup.com', environment: 'production' });
            setLocalSubConfig(props.companyDetails.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultQuarterlyPrice: 15000, defaultYearlyPrice: 50000 });
            setLocalFtpConfig(props.companyDetails.ftpConfig || { host: '', port: 21, user: '', password: '', remoteRoot: '/', publicUrlRoot: '' });
            setLocalGoogleDriveConfig(props.companyDetails.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false });
            setLocalKcbConfig(props.companyDetails.kcbConfig || { appKey: '', appSecret: '', environment: 'sandbox' });
            setLocalCoopConfig(props.companyDetails.coopConfig || { serviceName: 'KEWISCO SACCO', connectionID: 'TEST', connectionPassword: 'CoopTest', institutionCode: '210001918' });
        }
    }, [props.companyDetails]);



    const handleSaveGlobalConfigs = async () => {
        if (!props.onUpdateCompanyDetails || !props.companyDetails) return;
        setIsSavingConfigs(true);
        try {
            // Sanitize NCBA Credentials before saving to prevent invisible character 401s
            const sanitizedNcba = {
                ...localNcbaConfig,
                username: (localNcbaConfig.username || localNcbaConfig.clientId || '').replace(/[^\x20-\x7E]/g, '').trim(),
                clientId: (localNcbaConfig.username || localNcbaConfig.clientId || '').replace(/[^\x20-\x7E]/g, '').trim(),
                clientSecret: (localNcbaConfig.clientSecret || localNcbaConfig.password || '').replace(/[^\x20-\x7E]/g, '').trim(),
                password: (localNcbaConfig.clientSecret || localNcbaConfig.password || '').replace(/[^\x20-\x7E]/g, '').trim(),
                subscriptionKey: (localNcbaConfig.subscriptionKey || '').replace(/[^\x20-\x7E]/g, '').trim(),
                openBankingUserId: (localNcbaConfig.openBankingUserId || '').replace(/[^\x20-\x7E]/g, '').trim(),
                openBankingPassword: (localNcbaConfig.openBankingPassword || '').replace(/[^\x20-\x7E]/g, '').trim(),
                debitAccount: (localNcbaConfig.debitAccount || '').replace(/[^\x20-\x7E]/g, '').trim(),
                senderCif: (localNcbaConfig.senderCif || '').replace(/[^\x20-\x7E]/g, '').trim(),
                openBankingBaseUrl: (localNcbaConfig.openBankingBaseUrl || '').trim()
            };

            // Sanitize Email Credentials before saving to prevent invisible character 535 auth errors
            const rawEmailHost = (localEmailConfig.host || '').replace(/[^\x20-\x7E]/g, '').trim();
            let rawEmailPass = typeof localEmailConfig.password === 'string'
                ? localEmailConfig.password.replace(/[\r\n\t]/g, '').trim()
                : (localEmailConfig.password || '');
            if ((rawEmailHost.toLowerCase().includes('gmail') || rawEmailHost.toLowerCase().includes('google')) && typeof rawEmailPass === 'string') {
                const noSpaces = rawEmailPass.replace(/\s+/g, '');
                if (noSpaces.length === 16) rawEmailPass = noSpaces;
            }

            const sanitizedEmail: EmailConfig = {
                ...localEmailConfig,
                host: rawEmailHost,
                port: Number(localEmailConfig.port || 587),
                username: (localEmailConfig.username || '').replace(/[^\x20-\x7E]/g, '').trim(),
                password: rawEmailPass,
                fromName: (localEmailConfig.fromName || '').trim(),
                fromEmail: (localEmailConfig.fromEmail || '').replace(/[^\x20-\x7E]/g, '').trim(),
                resendApiKey: (localEmailConfig.resendApiKey || '').replace(/[^\x20-\x7E]/g, '').trim()
            };

            const isFeeEnabled = (localCompanyInfo as any).alumnaeRegistrationFeeEnabled !== undefined
                ? (localCompanyInfo as any).alumnaeRegistrationFeeEnabled
                : (Number((localCompanyInfo as any).alumnaeJoiningFee || 0) > 0);

            await props.onUpdateCompanyDetails({
                ...props.companyDetails,
                ...localCompanyInfo,
                portalSettings: {
                    ...(props.companyDetails?.portalSettings || {
                        showAlumnaeHub: true,
                        showTouristHub: true,
                        showMarketplace: true,
                        showCommunityHub: true,
                        showTransportHub: true,
                        publicRegistrationEnabled: true
                    }),
                    alumnaeRegistrationFeeEnabled: isFeeEnabled && Number((localCompanyInfo as any).alumnaeJoiningFee || 0) > 0
                },
                smsConfig: localSmsConfig,
                emailConfig: sanitizedEmail,
                mpesaConfig: localMpesaConfig,
                ncbaConfig: sanitizedNcba,
                subscriptionConfig: localSubConfig,
                ftpConfig: localFtpConfig,
                googleDriveConfig: localGoogleDriveConfig,
                kcbConfig: localKcbConfig,
                coopConfig: localCoopConfig,
                enforceGlobalOtp: localCompanyInfo.enforceGlobalOtp,
                enforceSuperAdminOtp: localCompanyInfo.enforceSuperAdminOtp,
                chatAssistantConfig: {
                    ...props.companyDetails.chatAssistantConfig,
                    welcomeMessage: localCompanyInfo.welcomeMessage,
                    enabled: localCompanyInfo.chatEnabled
                }
            });
            setLastSaved(new Date());
        } catch (e: unknown) {
            alert("Failed to save configurations.");
        } finally {
            setIsSavingConfigs(false);
        }
    };

    const handleSendTestEmail = async () => {
        setIsSavingConfigs(true);
        try {
            // Get session from either the supabase instance or apiService fallback
            const { data } = await (supabase?.auth.getSession() || { data: { session: null } });
            let session = data.session;

            // Critical fallback: If session is missing, try to get it from apiService
            if (!session) {
                const apiSession = apiService.getSession();
                if (apiSession) {
                    // Mock a session structure that has access_token
                    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || localStorage.getItem('db_config_SUPABASE_URL') || '';
                    const urlPart = supabaseUrl.split('.')[0].replace('https://', '');
                    const stored = localStorage.getItem('sb-' + urlPart + '-auth-token');
                    if (stored) session = JSON.parse(stored);
                }
            }

            let token = session?.access_token;
            if (!token) {
                const sessionStr = Object.entries(localStorage).find(([k]) => k.includes('-auth-token'))?.[1];
                token = sessionStr ? JSON.parse(sessionStr).access_token : localStorage.getItem('eduai_token');
            }

            const response = await fetch('/api/integrations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : ''
                },
                body: JSON.stringify({
                    action: 'sendEmail',
                    recipient: localCompanyInfo.email,
                    subject: 'Test Email from Eduai Automation',
                    message: 'This is a test email to verify your SMTP configuration.',
                    config: localEmailConfig
                })
            });
            const resData = await response.json();
            if (resData.success) {
                alert('Test email sent successfully to ' + localCompanyInfo.email);
            } else {
                const details = resData.error ? `\n\nDetails: ${resData.error}` : '';
                const hint = resData.hint ? `\n\nHint: ${resData.hint}` : '';
                alert(`Failed to send test email: ${resData.message}${details}${hint}`);
            }
        } catch (error: any) {
            alert('Error sending test email: ' + error.message);
        } finally {
            setIsSavingConfigs(false);
        }
    };

    const handleSendTestSms = async () => {
        setIsSavingConfigs(true);
        try {
            const res = await apiService.sendSms(localCompanyInfo.phone || '', "Test message from EduAi Automation.", localSmsConfig);
            if (res.success) {
                alert('SMS sent successfully.');
            } else {
                alert('Failed to send SMS. Please verify your gateway settings.');
            }
        } catch (error: any) {
            alert('Error sending test SMS: ' + error.message);
        } finally {
            setIsSavingConfigs(false);
        }
    };

    const handleSendInstTestSms = async () => {
        if (!instSmsTestPhone.trim()) {
            alert('Please enter a recipient phone number.');
            return;
        }
        setIsTestingInstSms(true);
        try {
            const res = await apiService.sendSms(
                instSmsTestPhone.trim(), 
                "Test message from EduAi Institution SMS Gateway.", 
                localInstSmsConfig,
                1,
                props.currentInstitution?.id
            );
            if (res.success) {
                alert('Test SMS sent successfully.');
            } else {
                alert(`Failed to send test SMS: ${res.message || 'Please check your configurations.'}`);
            }
        } catch (error: any) {
            alert('Error sending test SMS: ' + error.message);
        } finally {
            setIsTestingInstSms(false);
        }
    };

    const handleLocalImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead' | 'footer') => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'jpg';
            const path = `global_branding/platform/${type}_${timestamp}.${ext}`;

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
            console.error(`Global ${type} upload error:`, err);
            alert(`Failed to upload ${type}.`);
        }
    };

    const mainTabs = useMemo(() => {
        const tabs = [];

        if (isBC) {
            tabs.push({ id: 'beauty_college', label: 'Beauty College', icon: <SparklesIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'general', label: 'General Settings', icon: <InformationCircleIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'staff', label: 'Staff & Roles', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> });
            return tabs;
        }

        if (isDS) {
            tabs.push({ id: 'driving_school', label: 'Driving School', icon: <TruckIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'general', label: 'Institutional', icon: <InformationCircleIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'facilities', label: 'Facilities / Rooms', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'staff', label: 'Staff & Roles', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> });
            return tabs;
        }

        if (isSuperAdmin && !isCoop && !props.isAcademicsOfficer) {
            tabs.push({ id: 'global_config', label: 'Global Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> });
        } else {
            tabs.push({ id: 'general', label: 'General', icon: <InformationCircleIcon className="w-5 h-5 mr-2" /> });
            if (!isRetailAgency && isEdu && !isCoop && !isDS && props.activeScope !== 'inventory') {
                tabs.push({ id: 'timetable', label: 'Timetable Rules', icon: <ClockIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'calendar', label: 'Calendar', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'subjects', label: isChurch ? 'Ministries' : 'Subjects', icon: <BookOpenIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'courses', label: isChurch ? 'Programs / Groups' : (isSchool ? 'Grades' : 'Courses'), icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'facilities', label: 'Facilities', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> });
            }
            if (isChurch) {
                tabs.push({ id: 'courses', label: 'Programs / Groups', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'subjects', label: 'Ministries', icon: <BookOpenIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'staff', label: 'Workers & Clergy', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> });
            }
            if (isCoop || isAutoSales || props.activeScope === 'inventory') {
                tabs.push({ 
                    id: 'staff', 
                    label: props.activeScope === 'inventory' ? 'User Management' : (isAutoSales ? 'Manage Users' : 'Staff & Roles'), 
                    icon: <UserGroupIcon className="w-5 h-5 mr-2" /> 
                });
            }
        }

        return tabs;
    }, [props.currentUser.role, isSchool, isEdu, isSuperAdmin, isRetailAgency, isCoop, isAutoSales, isChurch, props.activeScope]);

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-4 overflow-x-auto no-scrollbar" aria-label="Settings Tabs">
                    {mainTabs.map((tab: { id: string; label: string; icon: React.ReactNode }) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as SettingsTab)}
                            className={`${activeTab === tab.id
                                ? 'border-indigo-600 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                                } whitespace-nowrap py-4 px-1 border-b-2 font-black text-xs uppercase tracking-widest flex items-center transition-colors`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Global Config Tab (Visible only to Super Admin) */}
            {activeTab === 'global_config' && isSuperAdmin && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                        <nav className="-mb-px flex space-x-6" aria-label="Global Settings Sub-tabs">
                            <button onClick={() => setGlobalSubTab('profile')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'profile' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><InformationCircleIcon className="w-4 h-4" /> Platform Profile</button>
                            <button onClick={() => setGlobalSubTab('infrastructure')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'infrastructure' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><ShieldIcon className="w-4 h-4" /> Global Infrastructure</button>
                            <button onClick={() => setGlobalSubTab('storage')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'storage' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><ArrowUpTrayIcon className="w-4 h-4" /> Asset FTP</button>
                            <button onClick={() => setGlobalSubTab('googledrive')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'googledrive' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><SparklesIcon className="w-4 h-4" /> Google Drive</button>
                            <button onClick={() => setGlobalSubTab('branding')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'branding' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><SparklesIcon className="w-4 h-4" /> Visual Identity</button>
                            <button onClick={() => setGlobalSubTab('sms')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'sms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><PaperAirplaneIcon className="w-4 h-4" /> SMS Gateway</button>
                            <button onClick={() => setGlobalSubTab('email')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'email' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><EnvelopeIcon className="w-4 h-4" /> Email Relay</button>
                            <button onClick={() => setGlobalSubTab('showcase')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'showcase' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><SparklesIcon className="w-4 h-4" /> Showcase</button>
                            <button onClick={() => setGlobalSubTab('integrations')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'integrations' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><ArrowsRightLeftIcon className="w-4 h-4" /> Billing Map</button>
                            <button onClick={() => setGlobalSubTab('convenience_fees')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'convenience_fees' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><CurrencyIcon className="w-4 h-4 text-amber-500" /> Convenience Fees & Float</button>
                        </nav>
                    </div>

                    <div className="mt-6">
                        {globalSubTab === 'profile' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                <h3 className="text-lg font-black uppercase mb-6 tracking-tighter">Identity Records</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Platform Application Title</label>
                                            <input type="text" value={localCompanyInfo.applicationTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalCompanyInfo({ ...localCompanyInfo, applicationTitle: e.target.value })} className="form-input" placeholder="e.g. EduAi Academic" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Platform Legal Name</label>
                                            <input type="text" value={localCompanyInfo.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalCompanyInfo({ ...localCompanyInfo, name: e.target.value })} className="form-input" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Global Support Email</label>
                                            <input type="email" value={localCompanyInfo.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalCompanyInfo({ ...localCompanyInfo, email: e.target.value })} className="form-input" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Global Support Phone</label>
                                            <input type="tel" value={localCompanyInfo.phone} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalCompanyInfo({ ...localCompanyInfo, phone: e.target.value })} className="form-input" placeholder="+254..." />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Platform Website</label>
                                            <input type="url" value={localCompanyInfo.website} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalCompanyInfo({ ...localCompanyInfo, website: e.target.value })} className="form-input" placeholder="https://..." />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Android App URL</label>
                                            <input type="url" value={localCompanyInfo.androidUrl || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalCompanyInfo({ ...localCompanyInfo, androidUrl: e.target.value })} className="form-input" placeholder="https://play.google.com/store/apps/..." />
                                            <p className="text-[9px] text-slate-400 mt-1 italic ml-1">Google Play Store or direct APK download link. Displayed to users as a native app download option.</p>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Office Physical Address</label>
                                            <textarea rows={2} value={localCompanyInfo.address} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalCompanyInfo({ ...localCompanyInfo, address: e.target.value })} className="form-input" placeholder="Building, Street, City" />
                                        </div>
                                        <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary w-full h-12 shadow-indigo-100">{isSavingConfigs ? 'Synchronizing...' : 'Update System Profile'}</button>
                                    </div>
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                        {localCompanyInfo.logoUrl ? <img loading="lazy" src={localCompanyInfo.logoUrl} className="h-20 object-contain mb-4" alt="Logo" /> : <BuildingOfficeIcon className="w-10 h-10 text-slate-200 mb-2" />}
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">System Logo</p>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Alumnae Network Billing Status</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const currentEnabled = ((localCompanyInfo as any).alumnaeRegistrationFeeEnabled ?? (props.companyDetails?.portalSettings?.alumnaeRegistrationFeeEnabled !== false)) && Number((localCompanyInfo as any).alumnaeJoiningFee || 0) > 0;
                                                        const nextEnabled = !currentEnabled;
                                                        setLocalCompanyInfo({
                                                            ...localCompanyInfo,
                                                            alumnaeRegistrationFeeEnabled: nextEnabled,
                                                            alumnaeJoiningFee: nextEnabled ? ((localCompanyInfo as any).alumnaeJoiningFee || 500) : 0
                                                        } as any);
                                                    }}
                                                    className={`w-full py-3 px-4 rounded-2xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-between border ${
                                                        (((localCompanyInfo as any).alumnaeRegistrationFeeEnabled ?? (props.companyDetails?.portalSettings?.alumnaeRegistrationFeeEnabled !== false)) && Number((localCompanyInfo as any).alumnaeJoiningFee || 0) > 0)
                                                            ? 'bg-emerald-50 border-emerald-300 text-emerald-700 dark:bg-emerald-950/40 dark:border-emerald-700 dark:text-emerald-300'
                                                            : 'bg-rose-50 border-rose-300 text-rose-700 dark:bg-rose-950/40 dark:border-rose-700 dark:text-rose-300'
                                                    }`}
                                                >
                                                    <span>
                                                        {(((localCompanyInfo as any).alumnaeRegistrationFeeEnabled ?? (props.companyDetails?.portalSettings?.alumnaeRegistrationFeeEnabled !== false)) && Number((localCompanyInfo as any).alumnaeJoiningFee || 0) > 0)
                                                            ? '🟢 Billing Active (Paid Registration)'
                                                            : '🔴 Billing Disabled (Free Registration)'}
                                                    </span>
                                                    <span className="text-[10px] underline">Click to Toggle</span>
                                                </button>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Alumnae Joining Fee (KES)</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <CurrencyIcon className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        value={(localCompanyInfo as any).alumnaeJoiningFee} 
                                                        onChange={e => {
                                                            const val = Number(e.target.value);
                                                            setLocalCompanyInfo({ 
                                                                ...localCompanyInfo, 
                                                                alumnaeJoiningFee: val,
                                                                alumnaeRegistrationFeeEnabled: val > 0
                                                            } as any);
                                                        }}
                                                        className="form-input pl-10" 
                                                        placeholder="0.00" 
                                                    />
                                                </div>
                                                <p className="text-[9px] text-slate-400 mt-2 italic">Set to 0 to disable mandatory payment during registration.</p>
                                            </div>
                                            <div className="p-6 bg-amber-50 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-800">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <ShieldCheckIcon className="w-5 h-5 text-amber-600" />
                                                    <span className="text-[10px] font-black uppercase text-amber-600">Monetization Guard</span>
                                                </div>
                                                <p className="text-[10px] text-amber-700/70 leading-relaxed">Incoming payments will be processed via the platform's primary M-Pesa gateway. Ensure Daraja credentials are active.</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'infrastructure' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                    <h3 className="text-lg font-black uppercase mb-6 tracking-tighter">Security & Access</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                    <ShieldIcon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Super Admin 2FA Enforcement</h4>
                                                    <p className="text-xs text-slate-500">Require Two-Factor Authentication (OTP verification via SMS/Email) when logging into Super Admin accounts.</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const nextValue = !localCompanyInfo.enforceSuperAdminOtp;
                                                    setLocalCompanyInfo({ ...localCompanyInfo, enforceSuperAdminOtp: nextValue });
                                                }}
                                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localCompanyInfo.enforceSuperAdminOtp ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                            >
                                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localCompanyInfo.enforceSuperAdminOtp ? 'translate-x-6' : 'translate-x-1'}`} />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                                    <ShieldIcon className="w-5 h-5 text-indigo-600" />
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Global 2FA Enforcement (All Tenants)</h4>
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
                                    </div>
                                    <div className="mt-6 flex justify-end">
                                        <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary px-8 h-10 shadow-indigo-100 uppercase tracking-widest text-[10px]">{isSavingConfigs ? 'Saving...' : 'Save Security Settings'}</button>
                                    </div>
                                </div>

                                {props.companyDetails && (
                                    <DatabaseSettings
                                        dbConfig={props.companyDetails.databaseConfig}
                                        onRunAlumniMigration={(props as any).onRunAlumniMigration}
                                        onSave={async (newDbConfig: any) => {
                                            if (props.onUpdateCompanyDetails && props.companyDetails) {
                                                await props.onUpdateCompanyDetails({ ...props.companyDetails, databaseConfig: newDbConfig });
                                            }
                                        }}
                                    />
                                )}

                                {/* Data Management Section */}
                                {(props.onGenerateDemoData || props.onClearDemoData) && (
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                                                <SparklesIcon className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <h3 className="text-lg font-black uppercase tracking-tighter">Data Management</h3>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-200 dark:border-slate-700">
                                                <h4 className="text-sm font-bold mb-2">Generate Demo Data</h4>
                                                <p className="text-xs text-slate-500 mb-4">Populate the current institution with sample records (staff, patients, students, etc.) for testing purposes.</p>
                                                <button
                                                    onClick={props.onGenerateDemoData}
                                                    disabled={props.isGeneratingDemoData}
                                                    className="btn-secondary w-full h-10 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-amber-50 hover:border-amber-200 transition-all"
                                                >
                                                    <SparklesIcon className="w-4 h-4 text-amber-600" />
                                                    {props.isGeneratingDemoData ? 'Generating...' : 'Seed Sample Data'}
                                                </button>
                                            </div>

                                            <div className="p-6 bg-red-50/30 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/30">
                                                <h4 className="text-sm font-bold text-red-600 mb-2">Danger Zone: Reset Registry</h4>
                                                <p className="text-xs text-slate-500 mb-4">Permanently erase all institutional records including HIS logs, academic data, and financial history.</p>
                                                <button
                                                    onClick={props.onClearDemoData}
                                                    disabled={props.isGeneratingDemoData}
                                                    className="w-full h-10 bg-red-600 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-red-100 flex items-center justify-center gap-2 disabled:opacity-50"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                    {props.isGeneratingDemoData ? 'Clearing...' : 'Wipe Institutional Data'}
                                                </button>
                                            </div>
                                        </div>

                                        {props.isGeneratingDemoData && (
                                            <div className="mt-8 space-y-3 animate-fade-in">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                                                    <span>{props.demoDataGenerationMessage || 'Processing...'}</span>
                                                    <span>{props.demoDataGenerationProgress}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-600 transition-all duration-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]"
                                                        style={{ width: `${props.demoDataGenerationProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {globalSubTab === 'branding' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-100 shadow-sm">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="font-bold text-lg flex items-center gap-2">
                                            <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                            Visual Brand Identity
                                        </h4>
                                        <button onClick={() => {
                                                if (props.companyDetails) {
                                                    setShowPaperPreview(true);
                                                }
                                            }}
                                            className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest hover:underline"
                                        >
                                            View Preview
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
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onUpdateThemeColor && props.onUpdateThemeColor(e.target.value)}
                                                        className="h-12 w-24 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer"
                                                    />
                                                    <span className="font-mono text-sm font-bold text-slate-500 uppercase">{props.themeColor}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {showPaperPreview && props.companyDetails && (
                                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-8 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                                            <div className="relative w-full max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-[2.5rem] shadow-2xl p-12">
                                                <button 
                                                    onClick={() => setShowPaperPreview(false)}
                                                    className="absolute top-6 right-6 p-2 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
                                                >
                                                    <XIcon className="w-6 h-6 text-slate-500" />
                                                </button>
                                                <div className="mt-4">
                                                    <BrandedPaper
                                                        institution={props.currentInstitution!}
                                                        letterheadConfig={props.companyDetails.letterheadConfig}
                                                        footerImageUrl={props.footerImageUrl}
                                                    >
                                                        <div className="py-20 text-center">
                                                            <h2 className="text-2xl font-black uppercase tracking-tighter text-slate-300">Preview Content Area</h2>
                                                            <p className="text-slate-400 mt-2">This is where your letters and reports will be generated.</p>
                                                        </div>
                                                    </BrandedPaper>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="mt-8 flex justify-end">
                                        <button onClick={handleSaveGlobalConfigs} className="btn-primary h-14 px-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save Branding Map</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'sms' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
                                <h3 className="text-xl font-black uppercase tracking-tight">SMS Gateway Configuration</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Input Format: 254XXXXXXXXX (No brackets or +)</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Service Provider</label>
                                        <select
                                            value={localSmsConfig.provider}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalSmsConfig({ ...localSmsConfig, provider: e.target.value })}
                                            className="form-select h-12 font-bold text-sm"
                                        >
                                            <option value="ABMIS">ABMIS (Legacy)</option>
                                            <option value="Sematime">Sematime (Modern)</option>
                                            <option value="Zettatel">Zettatel (Default)</option>
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
                                            {localSmsConfig.provider === 'Zettatel' ? 'User ID' : localSmsConfig.provider === 'Sematime' ? 'Account ID' : 'User ID / API Key'}
                                        </label>
                                        <input type="text" value={localSmsConfig.apiKey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSmsConfig({ ...localSmsConfig, apiKey: e.target.value })} className="form-input h-10" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                            {localSmsConfig.provider === 'Zettatel' ? 'Password' : localSmsConfig.provider === 'Sematime' ? 'Auth Token' : 'API Password / Secret'}
                                        </label>
                                        <input type="password" value={localSmsConfig.apiSecret} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSmsConfig({ ...localSmsConfig, apiSecret: e.target.value })} className="form-input h-10" />
                                    </div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender ID / Shortcode</label><input type="text" value={localSmsConfig.fromNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSmsConfig({ ...localSmsConfig, fromNumber: e.target.value })} className="form-input h-10" /></div>

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
                                <div className="pt-6 border-t flex justify-end gap-4">
                                    <button onClick={handleSendTestSms} disabled={isSavingConfigs} className="btn-secondary px-6 h-12 border-slate-200 uppercase tracking-widest text-xs">Send Test SMS</button>
                                    <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Sync Gateway</button>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'email' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
                                <h3 className="text-xl font-black uppercase tracking-tight">Global Email Relay</h3>

                                <div className="space-y-4 max-w-lg">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Delivery Provider</label>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setLocalEmailConfig({ ...localEmailConfig, provider: 'smtp' })}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${localEmailConfig.provider === 'smtp' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-700'}`}
                                        >
                                            <EnvelopeIcon className="w-6 h-6" />
                                            <span className="text-[10px] font-black uppercase">Standard SMTP</span>
                                        </button>
                                        <button
                                            onClick={() => setLocalEmailConfig({ ...localEmailConfig, provider: 'resend' })}
                                            className={`p-4 rounded-2xl border-2 flex flex-col items-center gap-2 transition-all ${localEmailConfig.provider === 'resend' ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/10' : 'border-slate-100 dark:border-slate-700'}`}
                                        >
                                            <PaperAirplaneIcon className="w-6 h-6" />
                                            <span className="text-[10px] font-black uppercase">Resend (Modern)</span>
                                        </button>
                                    </div>
                                </div>

                                {localEmailConfig.provider === 'resend' ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                                        <div className="md:col-span-2">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Resend API Key</label>
                                            <input type="password" value={localEmailConfig.resendApiKey || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalEmailConfig({ ...localEmailConfig, resendApiKey: e.target.value })} className="form-input" placeholder="re_123456789..." />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">SMTP Host</label><input type="text" value={localEmailConfig.host || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalEmailConfig({ ...localEmailConfig, host: e.target.value })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Port</label><input type="number" value={localEmailConfig.port || 587} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalEmailConfig({ ...localEmailConfig, port: Number(e.target.value) })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Encryption</label><select value={localEmailConfig.encryption || 'tls'} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalEmailConfig({ ...localEmailConfig, encryption: e.target.value as any })} className="form-select"><option value="tls">TLS</option><option value="ssl">SSL</option><option value="none">None</option></select></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Username</label><input type="text" value={localEmailConfig.username || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalEmailConfig({ ...localEmailConfig, username: e.target.value })} className="form-input" /></div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Password</label>
                                            <input type="password" value={localEmailConfig.password || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalEmailConfig({ ...localEmailConfig, password: e.target.value })} className="form-input" />
                                            <p className="text-[9px] text-slate-400 mt-1 ml-1 leading-tight font-medium">
                                                {localEmailConfig.host?.toLowerCase().includes('gmail')
                                                    ? '⚠️ Gmail requires a 16-char App Password (from Google Account > Security > App Passwords).'
                                                    : 'For cPanel/Webmail, ensure Username is your full email address.'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t font-black uppercase">
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender Friendly Name</label><input type="text" value={localEmailConfig.fromName} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalEmailConfig({ ...localEmailConfig, fromName: e.target.value })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender Email Address</label><input type="email" value={localEmailConfig.fromEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalEmailConfig({ ...localEmailConfig, fromEmail: e.target.value })} className="form-input" /></div>
                                </div>

                                <div className="pt-6 border-t flex justify-end gap-4">
                                    <button onClick={handleSendTestEmail} disabled={isSavingConfigs} className="btn-secondary px-6 h-12 border-slate-200 uppercase tracking-widest text-xs">Verify Configuration</button>
                                    <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">{isSavingConfigs ? 'Synchronizing...' : 'Authorize Relay'}</button>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'showcase' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-indigo-600 rounded-2xl text-white shadow-lg">
                                        <SparklesIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Marketing Showcase</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Manage Public Facing Landing Page & Discovery</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-200 dark:border-slate-700">
                                            <h4 className="text-sm font-black mb-6 uppercase tracking-tight flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse"></div>
                                                Platform Ecosystem Link
                                            </h4>
                                            
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/50">
                                                    <div>
                                                        <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">Public Showcase Visibility</h5>
                                                        <p className="text-[10px] text-slate-500">Expose marketing page to external traffic.</p>
                                                    </div>
                                                    <button
                                                        onClick={() => setLocalCompanyInfo({ 
                                                            ...localCompanyInfo, 
                                                            showcaseConfig: { ...localCompanyInfo.showcaseConfig, enabled: !localCompanyInfo.showcaseConfig?.enabled } as any 
                                                        })}
                                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${localCompanyInfo.showcaseConfig?.enabled ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                    >
                                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localCompanyInfo.showcaseConfig?.enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                                    </button>
                                                </div>

                                                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100/50">
                                                    <p className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 mb-2">Sync Status: Active</p>
                                                    <p className="text-[10px] text-indigo-600/70 leading-relaxed italic">
                                                        The business registry is currently automatically synchronizing 12 standard modules (including Fuel Station, Legal, and Logistics) to your public landing page.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="p-8 bg-indigo-600 rounded-[2rem] text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150 duration-700"></div>
                                            <h4 className="text-sm font-black mb-2 uppercase tracking-tight">Experience Hub</h4>
                                            <p className="text-xs text-indigo-100/80 mb-6 leading-relaxed">Launch the simulator engine to verify all integrated business modules in a sandbox environment.</p>
                                            <button 
                                                onClick={() => window.open(window.location.origin + '?view=showcase', '_blank')}
                                                className="w-full h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                <EyeIcon className="w-4 h-4" /> Verify Live Showcase
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 ml-2">Legacy Custom Entries</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {(localCompanyInfo.showcaseConfig?.items || []).map((item: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
                                                        {item.imageUrl ? <img loading="lazy" src={item.imageUrl} className="w-full h-full object-cover" /> : <SparklesIcon className="w-4 h-4 text-slate-400" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase tracking-tight">{item.category || 'Legacy'}</p>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => {
                                                        const newItems = (localCompanyInfo.showcaseConfig?.items || []).filter((_: any, i: number) => i !== idx);
                                                        setLocalCompanyInfo({ ...localCompanyInfo, showcaseConfig: { ...localCompanyInfo.showcaseConfig, items: newItems } as any });
                                                    }}
                                                    className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-50 rounded-xl"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            onClick={() => {
                                                const title = prompt("Entry Title:");
                                                if (title) {
                                                    const desc = prompt("Description:");
                                                    const newItem = { id: `st_${Date.now()}`, title, description: desc || '', imageUrl: '', category: 'Custom' };
                                                    const items = [...(localCompanyInfo.showcaseConfig?.items || []), newItem];
                                                    setLocalCompanyInfo({ ...localCompanyInfo, showcaseConfig: { ...localCompanyInfo.showcaseConfig, items } as any });
                                                }
                                            }}
                                            className="p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem] flex flex-col items-center justify-center gap-2 hover:border-indigo-400 hover:bg-indigo-50/10 transition-all group"
                                        >
                                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-900 flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <PlusIcon className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                                            </div>
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-indigo-600">Add Custom Module</span>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button onClick={handleSaveGlobalConfigs} disabled={isSavingConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-[10px]">{isSavingConfigs ? 'Synchronizing...' : 'Update Branding Strategy'}</button>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'storage' && (
                            <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                <div className="flex justify-between items-center mb-10">
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
                                
                                <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-4">
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
                                            } catch (e: any) {
                                                alert(`FTP handshake error: ${e.message}`);
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
                                        {isSavingConfigs ? 'Synchronizing...' : 'Authorize & Save Configuration'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'googledrive' && (
                            <div className="bg-white dark:bg-slate-800 p-10 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in">
                                <div className="flex justify-between items-center mb-10">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter">Google Drive Cloud Connectivity</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Platform-wide cloud backup for critical user assets</p>
                                    </div>
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl">
                                        <SparklesIcon className="w-8 h-8 text-indigo-600" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 p-8 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">Activation Status</label>
                                            <button 
                                                onClick={() => setLocalGoogleDriveConfig({...localGoogleDriveConfig, isActive: !localGoogleDriveConfig.isActive})}
                                                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase transition-all ${localGoogleDriveConfig.isActive ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-slate-200 text-slate-500 border border-slate-300'}`}
                                            >
                                                {localGoogleDriveConfig.isActive ? 'Active & Ready' : 'Deactivated'}
                                            </button>
                                        </div>
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Client ID</label>
                                        <input 
                                            value={localGoogleDriveConfig.clientId} 
                                            onChange={e => setLocalGoogleDriveConfig({...localGoogleDriveConfig, clientId: e.target.value})}
                                            placeholder="722xxxxxx-xxxx.apps.googleusercontent.com" 
                                            className="form-input text-xs font-mono" 
                                        />
                                    </div>
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mt-6">Client Secret</label>
                                        <input 
                                            type="password"
                                            value={localGoogleDriveConfig.clientSecret} 
                                            onChange={e => setLocalGoogleDriveConfig({...localGoogleDriveConfig, clientSecret: e.target.value})}
                                            className="form-input text-xs font-mono" 
                                        />
                                    </div>
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 mt-6">Refresh Token</label>
                                        <input 
                                            type="password"
                                            value={localGoogleDriveConfig.refreshToken} 
                                            onChange={e => setLocalGoogleDriveConfig({...localGoogleDriveConfig, refreshToken: e.target.value})}
                                            className="form-input text-xs font-mono" 
                                        />
                                    </div>
                                    <div className="space-y-1.5 lg:col-span-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Target Folder ID (Optional)</label>
                                        <input 
                                            value={localGoogleDriveConfig.folderId || ''} 
                                            onChange={e => setLocalGoogleDriveConfig({...localGoogleDriveConfig, folderId: e.target.value})}
                                            placeholder="1Abc_def_Ghi..." 
                                            className="form-input text-xs font-mono" 
                                        />
                                    </div>
                                </div>

                                <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800 flex justify-end gap-4">
                                    <button 
                                        onClick={handleSaveGlobalConfigs} 
                                        disabled={isSavingConfigs} 
                                        className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-[10px]"
                                    >
                                        {isSavingConfigs ? 'Synchronizing...' : 'Authorize & Save Configuration'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'billing' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                 <h3 className="text-xl font-black uppercase tracking-tight">Platform Financials</h3>
                                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <h4 className="text-sm font-bold uppercase text-slate-500 border-b pb-1">Standard Subscription Pricing</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Monthly License (KES)</label><input type="number" value={localSubConfig.defaultMonthlyPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSubConfig({ ...localSubConfig, defaultMonthlyPrice: Number(e.target.value) })} className="form-input font-bold" /></div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Quarterly License (KES)</label><input type="number" value={localSubConfig.defaultQuarterlyPrice || 15000} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSubConfig({ ...localSubConfig, defaultQuarterlyPrice: Number(e.target.value) })} className="form-input font-bold" /></div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Yearly License (KES)</label><input type="number" value={localSubConfig.defaultYearlyPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSubConfig({ ...localSubConfig, defaultYearlyPrice: Number(e.target.value) })} className="form-input font-bold" /></div>
                                        </div>
                                        <div><label className="block text-[10px] font-black uppercase text-indigo-600 mb-1.5 ml-1">Base Cost Per Additional Student (KES)</label><input type="number" value={localSubConfig.baseCostPerStudent || 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSubConfig({ ...localSubConfig, baseCostPerStudent: Number(e.target.value) })} className="form-input font-bold border-indigo-200 focus:ring-indigo-500" /></div>
                                    </div>
                                    <div className="pt-4">
                                        <button onClick={handleSaveGlobalConfigs} className="btn-primary w-full h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save Financial Configuration</button>
                                    </div>
                                 </div>
                            </div>
                        )}

                        {globalSubTab === 'convenience_fees' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-700/80 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-gradient-to-tr from-amber-500 to-indigo-600 text-white rounded-2xl shadow-lg shadow-amber-500/20">
                                            <CurrencyIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Platform Convenience Fees & E-Wallets</h3>
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">Monetization Engine</span>
                                            </div>
                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Automated Platform Revenue Collection on Teacher Payout Cash-Outs & School Top-Ups</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowConvenienceFeeModal(true)}
                                        className="btn-primary flex items-center gap-2 px-6 h-12 uppercase tracking-widest text-[11px] font-black shadow-lg shadow-indigo-500/20"
                                    >
                                        <SparklesIcon className="w-4 h-4 text-amber-300" />
                                        <span>Manage Fee Engine & Rules</span>
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-500/5 via-slate-50 to-indigo-50/20 dark:from-slate-800 dark:to-slate-900 border border-amber-200/40 dark:border-amber-900/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Rule Mechanism</span>
                                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">Configurable</span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">Hybrid Fee Formula</div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Platform charges a combined base fixed fee (e.g. KES 10) + a percentage (e.g. 1.0%) with safety floor and ceiling caps.
                                        </p>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500/5 via-slate-50 to-indigo-50/20 dark:from-slate-800 dark:to-slate-900 border border-emerald-200/40 dark:border-emerald-900/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Fee Bearer Target</span>
                                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Teacher / School</span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">Payer Allocation</div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Fee can be deducted at cash-out directly from Teacher's M-Pesa withdrawal or absorbed by the institution float wallet.
                                        </p>
                                    </div>

                                    <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500/5 via-slate-50 to-indigo-50/20 dark:from-slate-800 dark:to-slate-900 border border-indigo-200/40 dark:border-indigo-900/30">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Ledger & Settlement</span>
                                            <span className="px-2 py-0.5 rounded-lg text-[9px] font-black uppercase bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">Double-Entry</span>
                                        </div>
                                        <div className="text-2xl font-black text-slate-900 dark:text-white mb-2">Automated Revenue</div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                            Real-time transaction splits deposit fee revenue into the Super Admin platform revenue pool with complete audit trails.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-6 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 text-amber-600 rounded-2xl">
                                            <ShieldCheckIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white">Live Simulator & Fee Settings Available</h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">Launch the Super Admin control panel to adjust percentage rates, fixed rates, min/max caps, and test real-time disbursement calculations.</p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setShowConvenienceFeeModal(true)}
                                        className="px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition-all"
                                    >
                                        Open Settings & Revenue Pool
                                    </button>
                                </div>

                                <ConvenienceFeeSettingsModal
                                    isOpen={showConvenienceFeeModal}
                                    onClose={() => setShowConvenienceFeeModal(false)}
                                />
                            </div>
                        )}

                        {globalSubTab === 'integrations' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                <div className="flex items-center justify-between gap-6 border-b border-slate-100 dark:border-slate-800 pb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                                            <ArrowsRightLeftIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">System Integrations Map</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure Global Payment Gateways & External Services</p>
                                        </div>
                                    </div>

                                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl shadow-inner overflow-x-auto no-scrollbar max-w-full">
                                         <button
                                             onClick={() => setBillingSubTab('mpesa')}
                                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${billingSubTab === 'mpesa' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                         >
                                             M-Pesa
                                         </button>

                                         <button
                                             onClick={() => setBillingSubTab('ncba')}
                                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${billingSubTab === 'ncba' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                         >
                                             NCBA Bank
                                         </button>

                                         <button
                                             onClick={() => setBillingSubTab('kcb')}
                                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${billingSubTab === 'kcb' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                         >
                                             KCB
                                         </button>

                                         <button
                                             onClick={() => setBillingSubTab('equity')}
                                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${billingSubTab === 'equity' ? 'bg-white dark:bg-slate-600 text-red-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                         >
                                             Equity
                                         </button>

                                         <button
                                             onClick={() => setBillingSubTab('im')}
                                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${billingSubTab === 'im' ? 'bg-white dark:bg-slate-600 text-blue-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                         >
                                             I&M Bank
                                         </button>

                                         <button
                                             onClick={() => setBillingSubTab('coop')}
                                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${billingSubTab === 'coop' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                         >
                                             Co-op B2B
                                         </button>

                                         <button
                                             onClick={() => setBillingSubTab('gateways')}
                                             className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${billingSubTab === 'gateways' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                         >
                                             Control
                                         </button>
                                     </div>
                                </div>

                                {billingSubTab === 'mpesa' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-green-50 dark:bg-green-900/30 rounded-lg">
                                                    <MpesaIcon className="w-6 h-6 text-green-600" />
                                                </div>
                                                <h4 className="text-sm font-bold uppercase tracking-tight">M-Pesa Daraja Gateway</h4>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Environment</label>
                                                <select
                                                    value={localMpesaConfig.environment || 'sandbox'}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalMpesaConfig({ ...localMpesaConfig, environment: e.target.value as any })}
                                                    className="form-select w-full"
                                                >
                                                    <option value="sandbox">Sandbox (Test)</option>
                                                    <option value="production">Production (Live)</option>
                                                </select>
                                            </div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Short Code (Paybill)</label><input type="text" value={localMpesaConfig.paybillNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalMpesaConfig({ ...localMpesaConfig, paybillNumber: e.target.value })} className="form-input font-mono" placeholder="7-digit code" /></div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Lipa Na M-Pesa Passkey</label><input type="password" value={localMpesaConfig.passkey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalMpesaConfig({ ...localMpesaConfig, passkey: e.target.value })} className="form-input" /></div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Consumer Key</label><input type="text" value={localMpesaConfig.consumerKey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalMpesaConfig({ ...localMpesaConfig, consumerKey: e.target.value })} className="form-input" /></div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Consumer Secret</label><input type="password" value={localMpesaConfig.consumerSecret} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalMpesaConfig({ ...localMpesaConfig, consumerSecret: e.target.value })} className="form-input" /></div>
                                        </div>

                                        <div className="space-y-6">
                                            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase text-slate-600">Gateway Policy</span>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">Incoming payments are validated against the Paybill and Account Reference (Institution Code). Subscriptions are automatically extended upon successful callback.</p>
                                            </div>
                                            <div className="pt-4">
                                                <button onClick={handleSaveGlobalConfigs} className="btn-primary w-full h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save M-Pesa Config</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {billingSubTab === 'ncba' && (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-fade-in">
                                        <div className="space-y-6">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="p-2 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                                                    <NcbaIcon className="w-6 h-6 text-blue-600" />
                                                </div>
                                                <h4 className="text-sm font-bold uppercase tracking-tight">NCBA Bank Gateway</h4>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Environment</label>
                                                <select
                                                    value={localNcbaConfig.environment || 'production'}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                                                        const env = e.target.value as any;
                                                        setLocalNcbaConfig({ 
                                                            ...localNcbaConfig, 
                                                            environment: env,
                                                            baseUrl: env === 'sandbox' ? 'https://sandbox.ncbagroup.com' : 'https://c2bapis.ncbagroup.com'
                                                        });
                                                    }}
                                                    className="form-select w-full"
                                                >
                                                    <option value="sandbox">Sandbox (Test)</option>
                                                    <option value="production">Production (Live)</option>
                                                </select>
                                            </div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Base URL</label><input type="text" value={localNcbaConfig.baseUrl} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, baseUrl: e.target.value })} className="form-input font-mono text-xs" placeholder="https://c2bapis.ncbagroup.com" /></div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Username</label><input type="text" value={localNcbaConfig.username || localNcbaConfig.clientId || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, username: e.target.value, clientId: e.target.value })} className="form-input font-mono text-xs" placeholder="e.g. NCBA API Username" /></div>
                                                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Secret Key</label><input type="password" value={localNcbaConfig.clientSecret || localNcbaConfig.password || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, clientSecret: e.target.value, password: e.target.value })} className="form-input font-mono text-xs" placeholder="e.g. NCBA Secret Key" /></div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Paybill Number</label><input type="text" value={localNcbaConfig.paybill || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, paybill: e.target.value })} className="form-input font-mono text-xs" placeholder="880100" /></div>
                                                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Account No / Reference</label><input type="text" value={localNcbaConfig.accountNumber || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, accountNumber: e.target.value })} className="form-input font-mono text-xs" placeholder="e.g. 9115310018 or EDUAI" /></div>
                                            </div>
                                        </div>

                                        {/* NCBA Open Banking Gateway Section (2026 UAT Spec) */}
                                        <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">
                                                        NCBA Open Banking Gateway (B2C M-Pesa, EFT, PesaLink & Statements)
                                                    </h4>
                                                </div>
                                                <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-widest">
                                                    UAT Ready
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-slate-500 mb-4">
                                                Direct corporate bank-to-wallet disbursements, live statements, EFT, and account validation via NCBA APIM Gateway.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Open Banking User ID</label>
                                                    <input 
                                                        type="text" 
                                                        value={localNcbaConfig.openBankingUserId || ''} 
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, openBankingUserId: e.target.value })} 
                                                        className="form-input" 
                                                        placeholder="e.g. cashmanUAT" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Open Banking Password</label>
                                                    <input 
                                                        type="password" 
                                                        value={localNcbaConfig.openBankingPassword || ''} 
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, openBankingPassword: e.target.value })} 
                                                        className="form-input" 
                                                        placeholder="Assigned UAT/Prod Password" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Subscription Key (Ocp-Apim-Subscription-Key)</label>
                                                    <input 
                                                        type="password" 
                                                        value={localNcbaConfig.subscriptionKey || ''} 
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, subscriptionKey: e.target.value })} 
                                                        className="form-input font-mono text-xs" 
                                                        placeholder="32-character Azure APIM Key" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Corporate Debit Account Number</label>
                                                    <input 
                                                        type="text" 
                                                        value={localNcbaConfig.debitAccount || ''} 
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, debitAccount: e.target.value, senderCif: e.target.value.slice(0, 6) })} 
                                                        className="form-input font-mono text-xs" 
                                                        placeholder="e.g. 9115310018" 
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Open Banking Gateway Base URL</label>
                                                    <input 
                                                        type="text" 
                                                        value={localNcbaConfig.openBankingBaseUrl || ''} 
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, openBankingBaseUrl: e.target.value })} 
                                                        className="form-input font-mono text-xs" 
                                                        placeholder="https://openbankingtest.api.ncbagroup.com/test/apigateway/" 
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4 pt-6">
                                            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-800">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <InformationCircleIcon className="w-5 h-5 text-blue-500" />
                                                    <span className="text-[10px] font-black uppercase text-blue-600">Bank Integration Policy</span>
                                                </div>
                                                <p className="text-xs text-blue-700/70 leading-relaxed">NCBA Bank integration supports C2B STK push and Enterprise Open Banking APIs. Ensure your IP is whitelisted on NCBA's UAT gateway before running live transactions.</p>
                                            </div>
                                            <button onClick={handleSaveGlobalConfigs} className="btn-primary w-full h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save NCBA Configuration</button>
                                            
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <button 
                                                    onClick={async () => {
                                                        setIsTestingNcba(true);
                                                        try {
                                                             const res = await apiService.testNcbaAuth(localNcbaConfig);
                                                             if (res.success) {
                                                                 alert(`Integration Success: ${res.message || 'C2B Authentication successful'}`);
                                                             } else {
                                                                 alert(`Integration Failed: ${res.message || 'Check your credentials'}`);
                                                             }
                                                         } catch(err: any) {
                                                             alert(`Connection Error: ${err.message}`);
                                                         } finally {
                                                             setIsTestingNcba(false);
                                                         }
                                                     }}
                                                     disabled={isTestingNcba}
                                                     className="w-full h-12 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                                 >
                                                     {isTestingNcba ? 'Verifying...' : 'Test C2B STK Auth'}
                                                 </button>

                                                 <button 
                                                     onClick={async () => {
                                                         setIsTestingNcba(true);
                                                         try {
                                                             const res = await apiService.testNcbaOpenBankingAuth(localNcbaConfig);
                                                             if (res.success || res.accessToken) {
                                                                 alert(`🎉 Open Banking Connected! Bearer Token issued successfully.${res.isMock ? ' (Mock Mode Active)' : ''}`);
                                                             } else {
                                                                 alert(`Open Banking Handshake Failed: ${res.message || 'Check your User ID, Password and Subscription Key'}`);
                                                             }
                                                         } catch(err: any) {
                                                             alert(`Connection Error: ${err.message}`);
                                                         } finally {
                                                             setIsTestingNcba(false);
                                                         }
                                                     }}
                                                     disabled={isTestingNcba}
                                                     className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                                                 >
                                                     {isTestingNcba ? 'Connecting Gateway...' : 'Test Open Banking Gateway'}
                                                 </button>
                                             </div>
                                         </div>
                                     </div>
                                )}

                                {billingSubTab === 'gateways' && (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {[
                                                { id: 'mpesa', name: 'Safaricom M-Pesa', icon: MpesaIcon, color: 'text-green-600', bg: 'bg-green-50' },
                                                { id: 'airtel', name: 'Airtel Money', icon: CreditCardIcon, color: 'text-red-500', bg: 'bg-red-50' },
                                                { id: 'intasend', name: 'Intasend (Card/Airtel)', icon: CreditCardIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                                { id: 'ncba', name: 'NCBA Bank', icon: NcbaIcon, color: 'text-blue-600', bg: 'bg-blue-50' },
                                                { id: 'equity', name: 'Equity Bank Biller', icon: CreditCardIcon, color: 'text-red-700', bg: 'bg-red-50' },
                                                { id: 'im', name: 'I&M Bank Collections', icon: CreditCardIcon, color: 'text-blue-700', bg: 'bg-blue-50' },
                                            ].map(gw => (
                                                <div 
                                                    key={gw.id}
                                                    onClick={() => {
                                                        const current = localCompanyInfo.enabledGateways || [];
                                                        const next = current.includes(gw.id) ? current.filter(id => id !== gw.id) : [...current, gw.id];
                                                        setLocalCompanyInfo({ ...localCompanyInfo, enabledGateways: next });
                                                    }}
                                                    className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all ${
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
                                                                (localCompanyInfo.enabledGateways || []).includes(gw.id) ? 'localize-toggle-on ml-6' : ''
                                                            }`} />
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end p-4">
                                            <button onClick={handleSaveGlobalConfigs} className="btn-primary h-12 px-10">Save Global Integration Map</button>
                                        </div>
                                    </div>
                                )}

                                {billingSubTab === 'kcb' && (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="grid grid-cols-1 gap-6">
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl">
                                                        <span className="w-6 h-6 text-indigo-600 font-black text-center block">K</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black uppercase tracking-widest">KCB Bank Credentials</h4>
                                                        <p className="text-[10px] font-bold text-slate-400">API gateway credential keys</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">KCB App Key</label>
                                                        <input
                                                            type="text"
                                                            value={localKcbConfig.appKey}
                                                            onChange={e => setLocalKcbConfig({ ...localKcbConfig, appKey: e.target.value })}
                                                            className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                            placeholder="Enter KCB App Key"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">KCB App Secret</label>
                                                        <input
                                                            type="password"
                                                            value={localKcbConfig.appSecret}
                                                            onChange={e => setLocalKcbConfig({ ...localKcbConfig, appSecret: e.target.value })}
                                                            className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                            placeholder="Enter KCB App Secret"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Short Code / Paybill</label>
                                                            <input
                                                                type="text"
                                                                value={localKcbConfig.shortCode || ''}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, shortCode: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="e.g. 522533"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Till Number (Optional)</label>
                                                            <input
                                                                type="text"
                                                                value={localKcbConfig.tillNumber || ''}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, tillNumber: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="e.g. 876543"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Short Code Type</label>
                                                            <select
                                                                value={localKcbConfig.sharedShortCode === false ? 'custom' : 'shared'}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, sharedShortCode: e.target.value === 'shared' })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                            >
                                                                <option value="shared">Shared Paybill (e.g. 522533)</option>
                                                                <option value="custom">Dedicated Paybill</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Environment</label>
                                                            <select
                                                                value={localKcbConfig.environment}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, environment: e.target.value as any })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                            >
                                                                <option value="sandbox">Sandbox (Test)</option>
                                                                <option value="production">Production (Live)</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Query Type</label>
                                                            <select
                                                                value={localKcbConfig.queryType || 'stk'}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, queryType: e.target.value as any })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                            >
                                                                <option value="stk">STK Push Status Query</option>
                                                                <option value="core">Core Bank T24 Transaction Query</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Company Code (Core)</label>
                                                            <input
                                                                type="text"
                                                                value={localKcbConfig.companyCode || ''}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, companyCode: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="e.g. KE0010001"
                                                                disabled={localKcbConfig.queryType !== 'core'}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Custom Base URL (Optional)</label>
                                                            <input
                                                                type="text"
                                                                value={localKcbConfig.baseUrl || ''}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, baseUrl: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="e.g. https://api.kcbgroup.com"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Custom Authorize URL (Optional)</label>
                                                            <input
                                                                type="text"
                                                                value={localKcbConfig.authorizeUrl || ''}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, authorizeUrl: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="e.g. https://api.buni.kcbgroup.com/authorize"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Custom STK Push URL (Optional)</label>
                                                            <input
                                                                type="text"
                                                                value={localKcbConfig.stkPushUrl || ''}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, stkPushUrl: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="Custom STK Endpoint URL"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Custom STK Query URL (Optional)</label>
                                                            <input
                                                                type="text"
                                                                value={localKcbConfig.queryUrl || ''}
                                                                onChange={e => setLocalKcbConfig({ ...localKcbConfig, queryUrl: e.target.value })}
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="Custom Status Query URL"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">IPN / Bank Feed Matching</p>
                                                        <div className="grid grid-cols-3 gap-4">
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Passkey / orgPassKey</label>
                                                                <input
                                                                    type="password"
                                                                    value={localKcbConfig.passkey || ''}
                                                                    onChange={e => setLocalKcbConfig({ ...localKcbConfig, passkey: e.target.value })}
                                                                    className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                    placeholder="Lipa Na M-Pesa Passkey"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Organization Short Code</label>
                                                                <input
                                                                    type="text"
                                                                    value={localKcbConfig.organizationShortCode || ''}
                                                                    onChange={e => setLocalKcbConfig({ ...localKcbConfig, organizationShortCode: e.target.value })}
                                                                    className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                    placeholder="e.g. 777777"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Credit Account Identifier</label>
                                                                <input
                                                                    type="text"
                                                                    value={localKcbConfig.creditAccountIdentifier || ''}
                                                                    onChange={e => setLocalKcbConfig({ ...localKcbConfig, creditAccountIdentifier: e.target.value })}
                                                                    className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 dark:text-white"
                                                                    placeholder="e.g. JD001"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-6 w-full">
                                             <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 w-full">
                                                 <div className="flex items-center gap-4 mb-6">
                                                     <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-2xl shrink-0">
                                                         <span className="w-6 h-6 text-indigo-600 font-black text-center block">ℹ</span>
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
                                                             {typeof window !== 'undefined' 
                                                                 ? `${window.location.origin}/api/kcb-ipn${props.currentInstitution?.id ? `?institutionId=${props.currentInstitution.id}` : ''}` 
                                                                 : `https://yourdomain.com/api/kcb-ipn${props.currentInstitution?.id ? `?institutionId=${props.currentInstitution.id}` : ''}`}
                                                         </code>
                                                     </div>
                                                     <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" title="Click to select">
                                                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-2">STK Push Callback Endpoint</p>
                                                         <code className="text-xs font-mono text-indigo-600 dark:text-indigo-400 break-all">
                                                             {typeof window !== 'undefined' 
                                                                 ? `${window.location.origin}/api/kcb-stk-callback${props.currentInstitution?.id ? `?institutionId=${props.currentInstitution.id}` : ''}` 
                                                                 : `https://yourdomain.com/api/kcb-stk-callback${props.currentInstitution?.id ? `?institutionId=${props.currentInstitution.id}` : ''}`}
                                                         </code>
                                                     </div>
                                                 </div>
                                             </div>
                                             <div className="flex justify-end pt-4">
                                                 <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-14 shadow-indigo-200 uppercase tracking-widest text-xs w-full sm:w-auto">Confirm KCB Configuration</button>
                                             </div>
                                         </div>
                                    </div>
                                )}

                                {billingSubTab === 'equity' && (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
                                                        <span className="w-6 h-6 text-red-600 font-black text-center block">EQ</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black uppercase tracking-widest">Equity Bank Biller Credentials</h4>
                                                        <p className="text-[10px] font-bold text-slate-400">JWT Authentication & Validation settings</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Biller Username</label>
                                                        <input
                                                            type="text"
                                                            defaultValue="equity_biller_user"
                                                            className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-red-500 transition-all text-slate-900 dark:text-white"
                                                            placeholder="equity_biller_user"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Biller Password</label>
                                                        <input
                                                            type="password"
                                                            defaultValue="EquityBiller@2026!"
                                                            className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-red-500 transition-all text-slate-900 dark:text-white"
                                                            placeholder="Enter Biller Password"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">JWT HMAC Secret Key</label>
                                                        <input
                                                            type="password"
                                                            defaultValue="equity-biller-default-jwt-secret-2026"
                                                            className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-red-500 transition-all text-slate-900 dark:text-white"
                                                            placeholder="Enter JWT Secret Key"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl shrink-0">
                                                        <span className="w-6 h-6 text-red-600 font-black text-center block">🔗</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black uppercase tracking-widest">Equity Biller Callback Endpoints</h4>
                                                        <p className="text-[10px] font-bold text-slate-400">REST Endpoints to share with Equity Bank</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">1. JWT Token Endpoint (POST /token)</p>
                                                        <code className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                                                            {typeof window !== 'undefined' 
                                                                ? `${window.location.origin}/functions/v1/equity-biller-api/token` 
                                                                : 'https://yourdomain.com/functions/v1/equity-biller-api/token'}
                                                        </code>
                                                    </div>
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">2. Validation Endpoint (POST /validation)</p>
                                                        <code className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                                                            {typeof window !== 'undefined' 
                                                                ? `${window.location.origin}/functions/v1/equity-biller-api/validation` 
                                                                : 'https://yourdomain.com/functions/v1/equity-biller-api/validation'}
                                                        </code>
                                                    </div>
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">3. Notification Endpoint (POST /notification)</p>
                                                        <code className="text-xs font-mono text-red-600 dark:text-red-400 break-all">
                                                            {typeof window !== 'undefined' 
                                                                ? `${window.location.origin}/functions/v1/equity-biller-api/notification` 
                                                                : 'https://yourdomain.com/functions/v1/equity-biller-api/notification'}
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-14 bg-red-600 hover:bg-red-700 shadow-red-200 uppercase tracking-widest text-xs w-full sm:w-auto">Confirm Equity Biller Configuration</button>
                                        </div>
                                    </div>
                                )}

                                {billingSubTab === 'im' && (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl">
                                                        <span className="w-6 h-6 text-blue-600 font-black text-center block">I&M</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black uppercase tracking-widest">I&M Bank Collections Credentials</h4>
                                                        <p className="text-[10px] font-bold text-slate-400">API Key & Basic Authentication credentials</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">API Key (x-api-key Header)</label>
                                                        <input
                                                            type="text"
                                                            defaultValue="im-api-key-default-2026"
                                                            className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                                                            placeholder="Enter I&M API Key"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Callback Username</label>
                                                            <input
                                                                type="text"
                                                                defaultValue="im_callback_user"
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="Basic Auth Username"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Callback Secret</label>
                                                            <input
                                                                type="password"
                                                                defaultValue="im_callback_secret_2026"
                                                                className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                                                                placeholder="Basic Auth Secret"
                                                            />
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Account Number / Short Code</label>
                                                        <input
                                                            type="text"
                                                            defaultValue="01201928374"
                                                            className="w-full h-12 px-5 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all text-slate-900 dark:text-white"
                                                            placeholder="e.g. 01201928374"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                <div className="flex items-center gap-4 mb-6">
                                                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-2xl shrink-0">
                                                        <span className="w-6 h-6 text-blue-600 font-black text-center block">🔗</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="text-sm font-black uppercase tracking-widest">I&M Bank Callback Endpoints</h4>
                                                        <p className="text-[10px] font-bold text-slate-400">Share these endpoints with I&M Bank Integration Team</p>
                                                    </div>
                                                </div>
                                                <div className="space-y-4">
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">1. Customer Validation Endpoint (POST /api/collections/validate)</p>
                                                        <code className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all">
                                                            {typeof window !== 'undefined' 
                                                                ? `${window.location.origin}/api/collections/validate` 
                                                                : 'https://yourdomain.com/api/collections/validate'}
                                                        </code>
                                                    </div>
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">2. Payment Notification Endpoint (POST /api/collections/notify)</p>
                                                        <code className="text-xs font-mono text-blue-600 dark:text-blue-400 break-all">
                                                            {typeof window !== 'undefined' 
                                                                ? `${window.location.origin}/api/collections/notify` 
                                                                : 'https://yourdomain.com/api/collections/notify'}
                                                        </code>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end pt-4">
                                            <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-14 bg-blue-600 hover:bg-blue-700 shadow-blue-200 uppercase tracking-widest text-xs w-full sm:w-auto">Confirm I&M Bank Configuration</button>
                                        </div>
                                    </div>
                                )}

                                {billingSubTab === 'coop' && (
                                    <div className="animate-fade-in space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                                <div className="flex justify-between items-center mb-6">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl">
                                                            <span className="w-6 h-6 text-emerald-600 font-black text-center block">C</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="text-sm font-black uppercase tracking-widest">Co-op Bank B2B Credentials</h4>
                                                            <p className="text-[10px] font-bold text-slate-400">Gateway Authentication settings</p>
                                                        </div>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const randomId = 'COOP_B2B_' + Math.random().toString(36).substring(2, 10).toUpperCase();
                                                            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
                                                            let randomPassword = '';
                                                            for (let i = 0; i < 16; i++) {
                                                                randomPassword += chars.charAt(Math.floor(Math.random() * chars.length));
                                                            }
                                                            setLocalCoopConfig({
                                                                ...localCoopConfig,
                                                                connectionID: randomId,
                                                                connectionPassword: randomPassword
                                                            });
                                                        }}
                                                        className="text-[9px] font-black uppercase tracking-widest bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 px-3 py-1.5 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-900 transition-colors"
                                                    >
                                                        Generate
                                                    </button>
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

                                            <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800">
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
                                                    <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed mb-2">
                                                        Configure the Co-operative Bank B2B Gateway callbacks. Point the respective bank API endpoints to the URLs below.
                                                    </p>
                                                    
                                                    {/* Server IP Display */}
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Server Outbound IP (For Whitelisting)</p>
                                                        <div className="flex items-center justify-between">
                                                            <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 break-all select-all cursor-pointer">
                                                                {coopIps?.serverIp || 'Loading...'}
                                                            </code>
                                                            <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded text-emerald-600 dark:text-emerald-400 font-bold uppercase">Outbound IP</span>
                                                        </div>
                                                        <p className="text-[9px] font-medium text-slate-400 mt-2">
                                                            Provide this IP address to the Co-operative Bank team to whitelist outgoing callbacks from <strong className="text-slate-650 dark:text-slate-350">{typeof window !== 'undefined' ? window.location.hostname : 'yourdomain.com'}</strong>.
                                                        </p>
                                                    </div>

                                                    {/* Account Validation Endpoint */}
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" title="Click to copy">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Account Validation Endpoint</p>
                                                        <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 break-all">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/api/coop-b2b/validation` : 'https://yourdomain.com/api/coop-b2b/validation'}
                                                        </code>
                                                    </div>

                                                    {/* Payment Advice Endpoint */}
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" title="Click to copy">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payment Advice Endpoint</p>
                                                        <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 break-all">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/api/coop-b2b/payment-advice` : 'https://yourdomain.com/api/coop-b2b/payment-advice'}
                                                        </code>
                                                    </div>

                                                    {/* Credentials Validation Endpoint */}
                                                    <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 select-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors" title="Click to copy">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Credentials Validation Endpoint</p>
                                                        <code className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 break-all block mb-2">
                                                            {typeof window !== 'undefined' ? `${window.location.origin}/api/coop-b2b/validate-credentials` : 'https://yourdomain.com/api/coop-b2b/validate-credentials'}
                                                        </code>
                                                        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-700 text-[10px] font-bold text-slate-500">
                                                            <span className="bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded">Username: <strong className="text-slate-800 dark:text-slate-200">{localCoopConfig.connectionID || 'Not Set'}</strong></span>
                                                            <span className="bg-slate-100 dark:bg-slate-850 px-2 py-1 rounded">Password: <strong className="text-slate-800 dark:text-slate-200">{localCoopConfig.connectionPassword || 'Not Set'}</strong></span>
                                                        </div>
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
                    </div>
                </div>
            )}


            {activeTab === 'beauty_college' && (
                <div className="max-w-4xl bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in space-y-10">
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Beauty College <span className="text-indigo-600">Configuration</span></h2>
                        <p className="text-slate-500 font-medium uppercase text-[10px] tracking-widest">Manage classes, tuition, and generate custom fee structures</p>
                    </div>

                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Fee Structure Generator</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Select a course to view cost breakdown and generate installment schedule PDFs</p>
                        </div>

                        {loadingBcCourses ? (
                            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                                <span className="w-8 h-8 border-4 border-slate-200 border-t-indigo-650 rounded-full animate-spin mb-3" />
                                <p className="text-[10px] font-black uppercase tracking-widest">Loading courses...</p>
                            </div>
                        ) : bcCourses.length === 0 ? (
                            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 text-xs font-black uppercase tracking-widest">
                                ⚠️ No courses registered. Add courses in the Beauty College dashboard first.
                            </div>
                        ) : (() => {
                            const course = bcCourses.find(c => c.id === selectedBcCourseId) || bcCourses[0];
                            const baseFee = parseFloat(course?.baseFee) || 0;
                            const kitFee = parseFloat(course?.kitFee) || 0;
                            const examFee = parseFloat(course?.examFee) || 0;
                            const totalCourseCost = baseFee + kitFee + examFee;
                            const installmentSum = bcInstallments.reduce((sum, item) => sum + item.amount, 0);
                            const sumMismatch = installmentSum !== totalCourseCost;

                            return (
                                <div className="space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Target Course</label>
                                            <select
                                                value={selectedBcCourseId}
                                                onChange={e => setSelectedBcCourseId(e.target.value)}
                                                className="w-full px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs text-slate-900 dark:text-slate-100"
                                            >
                                                {bcCourses.map(c => (
                                                    <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2.5xl border border-slate-150 dark:border-slate-800 space-y-2">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Course Fee Highlights</span>
                                            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-350">
                                                <span>Tuition:</span>
                                                <span>KES {baseFee.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-350">
                                                <span>Starter Kit:</span>
                                                <span>KES {kitFee.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between text-xs font-bold text-slate-600 dark:text-slate-350">
                                                <span>Cert & Exams:</span>
                                                <span>KES {examFee.toLocaleString()}</span>
                                            </div>
                                            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                <span>Total Cost:</span>
                                                <span>KES {totalCourseCost.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Installments Table */}
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[10px] font-black text-slate-450 uppercase tracking-widest ml-1">Installment Schedule Milestones</label>
                                            <button
                                                type="button"
                                                onClick={handleAddBcInstallment}
                                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all"
                                            >
                                                + Add Milestone
                                            </button>
                                        </div>

                                        <div className="space-y-3">
                                            {bcInstallments.map((inst, index) => (
                                                <div key={index} className="flex gap-4 items-center">
                                                    <input
                                                        type="text"
                                                        value={inst.label}
                                                        onChange={e => handleBcInstallmentChange(index, 'label', e.target.value)}
                                                        placeholder="e.g. Deposit"
                                                        className="flex-1 px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={inst.amount || ''}
                                                        onChange={e => handleBcInstallmentChange(index, 'amount', e.target.value)}
                                                        placeholder="KES Amount"
                                                        className="w-40 px-5 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-right"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveBcInstallment(index)}
                                                        className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                                    >
                                                        🗑️
                                                    </button>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl flex justify-between items-center text-xs">
                                            <span className="font-bold text-slate-500 uppercase tracking-widest text-[9px]">Sum of Milestones:</span>
                                            <div className="flex items-center gap-3">
                                                <span className={`font-black text-sm ${sumMismatch ? 'text-rose-550' : 'text-emerald-500'}`}>
                                                    KES {installmentSum.toLocaleString()}
                                                </span>
                                                {sumMismatch && (
                                                    <span className="bg-rose-50 text-rose-600 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider">
                                                        ⚠️ Sum must equal Total Cost (KES {totalCourseCost.toLocaleString()})
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Action button */}
                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                                        <button
                                            type="button"
                                            disabled={isGeneratingBcFee || sumMismatch}
                                            onClick={handleDownloadBcFeeStructure}
                                            className="px-8 py-4 bg-slate-900 dark:bg-slate-800 hover:scale-[1.02] text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            💾 {isGeneratingBcFee ? 'Generating...' : 'Download Official Fee Structure PDF'}
                                        </button>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}


            {activeTab === 'driving_school' && (
                <div className="max-w-4xl bg-white dark:bg-slate-900 p-12 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                        <div>
                            <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Driving School <span className="text-indigo-600">Configuration</span></h2>
                            <p className="text-slate-500 font-medium uppercase text-[10px] tracking-widest">Manage sub-modules, pricing, and system policies</p>
                        </div>
                    </div>

                    <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar mb-8">
                        <nav className="-mb-px flex space-x-6 overflow-x-auto">
                            <button
                                onClick={() => setDsConfigSubTab('business_rules')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${dsConfigSubTab === 'business_rules' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <Cog8ToothIcon className="w-4 h-4" /> Business Rules
                            </button>
                            <button
                                onClick={() => setDsConfigSubTab('license_category')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${dsConfigSubTab === 'license_category' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <ClipboardListIcon className="w-4 h-4" /> License Category
                            </button>
                            <button
                                onClick={() => setDsConfigSubTab('license_groups')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${dsConfigSubTab === 'license_groups' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <RectangleStackIcon className="w-4 h-4" /> Category Groups
                            </button>
                            <button
                                onClick={() => setDsConfigSubTab('vote_heads')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${dsConfigSubTab === 'vote_heads' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <CalculatorIcon className="w-4 h-4" /> Votes (Fee Heads)
                            </button>
                            <button
                                onClick={() => setDsConfigSubTab('fee_structures')}
                                className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${dsConfigSubTab === 'fee_structures' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                            >
                                <CurrencyIcon className="w-4 h-4" /> Fee Structures
                            </button>
                        </nav>
                    </div>

                    {dsConfigSubTab === 'business_rules' && (
                        <div className="space-y-8 animate-fade-in max-w-4xl">
                            <div>
                                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase mb-6 flex items-center gap-3">
                                    <AlertTriangleIcon className="w-5 h-5 text-amber-500" />
                                    Operating Policies
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex flex-col gap-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancellation Policy</label>
                                        <textarea 
                                            value={localDsSettings?.cancellationPolicy || ''}
                                            onChange={(e) => {
                                                const next = { ...(localDsSettings || props.dsSettings || {}), cancellationPolicy: e.target.value } as DSSettings;
                                                setLocalDsSettings(next);
                                            }}
                                            rows={4}
                                            placeholder="Specify your rules for lesson cancellation..."
                                            className="p-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-medium text-sm" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-12 border-t border-slate-50 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Scheduling Rules</h3>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Configure automated lesson scheduling logic</p>
                                    </div>
                                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Auto-Schedule</span>
                                        <button 
                                            onClick={() => {
                                                const current = localDsSettings || props.dsSettings;
                                                const next = { ...current, autoSchedulingEnabled: !current?.autoSchedulingEnabled } as DSSettings;
                                                setLocalDsSettings(next);
                                            }}
                                            className={`w-12 h-6 rounded-full relative transition-all ${localDsSettings?.autoSchedulingEnabled ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${localDsSettings?.autoSchedulingEnabled ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Max Lessons / Student / Day</label>
                                        <input 
                                            type="number" 
                                            value={localDsSettings?.schedulingRules?.maxLessonsPerDayPerStudent || 1} 
                                            onChange={e => {
                                                const current = localDsSettings || props.dsSettings;
                                                const next = { 
                                                    ...current, 
                                                    schedulingRules: { ...(current?.schedulingRules || {}), maxLessonsPerDayPerStudent: Number(e.target.value) }
                                                } as DSSettings;
                                                setLocalDsSettings(next);
                                            }}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Gap (Mins)</label>
                                        <input 
                                            type="number" 
                                            value={localDsSettings?.schedulingRules?.minGapMinutesBetweenLessons || 15} 
                                            onChange={e => {
                                                const current = localDsSettings || props.dsSettings;
                                                const next = { 
                                                    ...current, 
                                                    schedulingRules: { ...(current?.schedulingRules || {}), minGapMinutesBetweenLessons: Number(e.target.value) }
                                                } as DSSettings;
                                                setLocalDsSettings(next);
                                            }}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                        />
                                    </div>
                                    <div className="flex flex-col justify-center space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Instructor</span>
                                            <button 
                                                onClick={() => {
                                                    const current = localDsSettings || props.dsSettings;
                                                    const next = { 
                                                        ...current, 
                                                        schedulingRules: { ...(current?.schedulingRules || {}), autoAssignInstructor: !current?.schedulingRules?.autoAssignInstructor }
                                                    } as DSSettings;
                                                    setLocalDsSettings(next);
                                                }}
                                                className={`w-10 h-5 rounded-full relative transition-all ${localDsSettings?.schedulingRules?.autoAssignInstructor ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${localDsSettings?.schedulingRules?.autoAssignInstructor ? 'right-0.5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Auto-Vehicle</span>
                                            <button 
                                                onClick={() => {
                                                    const current = localDsSettings || props.dsSettings;
                                                    const next = { 
                                                        ...current, 
                                                        schedulingRules: { ...(current?.schedulingRules || {}), autoAssignVehicle: !current?.schedulingRules?.autoAssignVehicle }
                                                    } as DSSettings;
                                                    setLocalDsSettings(next);
                                                }}
                                                className={`w-10 h-5 rounded-full relative transition-all ${localDsSettings?.schedulingRules?.autoAssignVehicle ? 'bg-indigo-600' : 'bg-slate-300'}`}
                                            >
                                                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${localDsSettings?.schedulingRules?.autoAssignVehicle ? 'right-0.5' : 'left-0.5'}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 space-y-8">
                                    <div className="p-6 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2rem] border border-indigo-100/50 dark:border-indigo-900/20">
                                        <div className="flex items-center gap-2 mb-4">
                                            <span className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest">Daily Lesson Sequence (Automation)</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {[
                                                { value: ['Theory', 'Practical'], label: 'Theory → Practical' },
                                                { value: ['Practical', 'Theory'], label: 'Practical → Theory' },
                                                { value: ['Theory'], label: 'Theory Only' },
                                                { value: ['Practical'], label: 'Practical Only' }
                                            ].map((seq, i) => {
                                                const isSelected = JSON.stringify(localDsSettings?.schedulingRules?.dailySequence) === JSON.stringify(seq.value);
                                                return (
                                                    <button
                                                        key={i}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = localDsSettings || props.dsSettings;
                                                            const next = {
                                                                ...current,
                                                                schedulingRules: {
                                                                    ...(current?.schedulingRules || {}),
                                                                    dailySequence: seq.value as any
                                                                }
                                                            } as DSSettings;
                                                            setLocalDsSettings(next);
                                                        }}
                                                        className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                            isSelected ? 'bg-indigo-600 text-white shadow-md scale-105' : 'bg-white dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-700'
                                                        }`}
                                                    >
                                                        {seq.label}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Required Days to Complete</label>
                                            <input 
                                                type="number" 
                                                value={localDsSettings?.schedulingRules?.requiredDaysToComplete || ''} 
                                                onChange={e => {
                                                    const current = localDsSettings || props.dsSettings;
                                                    const next = { 
                                                        ...current, 
                                                        schedulingRules: { ...(current?.schedulingRules || {}), requiredDaysToComplete: parseInt(e.target.value) || 0 }
                                                    } as DSSettings;
                                                    setLocalDsSettings(next);
                                                }}
                                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                placeholder="e.g. 21"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Theory Duration (Mins)</label>
                                            <input 
                                                type="number" 
                                                value={localDsSettings?.schedulingRules?.theoryDurationMinutes || ''} 
                                                onChange={e => {
                                                    const current = localDsSettings || props.dsSettings;
                                                    const next = { 
                                                        ...current, 
                                                        schedulingRules: { ...(current?.schedulingRules || {}), theoryDurationMinutes: parseInt(e.target.value) || 0 }
                                                    } as DSSettings;
                                                    setLocalDsSettings(next);
                                                }}
                                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                placeholder="e.g. 60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Daily Practical Duration (Mins)</label>
                                            <input 
                                                type="number" 
                                                value={localDsSettings?.schedulingRules?.practicalDurationMinutes || ''} 
                                                onChange={e => {
                                                    const current = localDsSettings || props.dsSettings;
                                                    const next = { 
                                                        ...current, 
                                                        schedulingRules: { ...(current?.schedulingRules || {}), practicalDurationMinutes: parseInt(e.target.value) || 0 }
                                                    } as DSSettings;
                                                    setLocalDsSettings(next);
                                                }}
                                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                                placeholder="e.g. 60"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Auto-Generation Time</label>
                                            <input 
                                                type="time" 
                                                value={localDsSettings?.schedulingRules?.nextDayAutoGenerationTime || ''} 
                                                onChange={e => {
                                                    const current = localDsSettings || props.dsSettings;
                                                    const next = { 
                                                        ...current, 
                                                        schedulingRules: { ...(current?.schedulingRules || {}), nextDayAutoGenerationTime: e.target.value }
                                                    } as DSSettings;
                                                    setLocalDsSettings(next);
                                                }}
                                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                    <div className="pt-12 border-t border-slate-50 dark:border-slate-800">
                                <div className="mb-8">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Document Numbering</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Define prefixes for financial documents</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Invoice Prefix</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. INV-"
                                            value={localDsSettings?.invoicePrefix || ''} 
                                            onChange={e => {
                                                const next = { ...(localDsSettings || props.dsSettings || {}), invoicePrefix: e.target.value } as DSSettings;
                                                setLocalDsSettings(next);
                                            }}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Receipt Prefix</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. REC-"
                                            value={localDsSettings?.receiptPrefix || ''} 
                                            onChange={e => {
                                                const next = { ...(localDsSettings || props.dsSettings || {}), receiptPrefix: e.target.value } as DSSettings;
                                                setLocalDsSettings(next);
                                            }}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Student ID Prefix</label>
                                        <input 
                                            type="text" 
                                            placeholder="e.g. ID-"
                                            value={localDsSettings?.studentIdPrefix || ''} 
                                            onChange={e => {
                                                const next = { ...(localDsSettings || props.dsSettings || {}), studentIdPrefix: e.target.value } as DSSettings;
                                                setLocalDsSettings(next);
                                            }}
                                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {dsConfigSubTab === 'fee_structures' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Fee Structures</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Define costs for different driving classes</p>
                                </div>
                                {isAddingFee ? (
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 animate-fade-in-up">
                                        <div className="grid grid-cols-1 gap-6 mb-8">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Name</label>
                                                <select 
                                                    required 
                                                    value={newFeeForm.className} 
                                                    onChange={e => setNewFeeForm({...newFeeForm, className: e.target.value})} 
                                                    className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-900 dark:text-slate-100"
                                                >
                                                    <option value="">Select License Category</option>
                                                    {(localDsSettings?.licenseCategories || []).map((cat: any) => (
                                                        <option key={cat.id} value={cat.code || cat.name}>
                                                            {cat.code ? `${cat.code} - ${cat.name}` : cat.name}
                                                        </option>
                                                    ))}
                                                    {(!localDsSettings?.licenseCategories || localDsSettings.licenseCategories.length === 0) && (
                                                        <>
                                                            <option value="Class A">Class A - Motorcycle</option>
                                                            <option value="Class B">Class B - Light Vehicle</option>
                                                            <option value="Class C1">Class C1 - Light Truck</option>
                                                        </>
                                                    )}
                                                    {newFeeForm.className && !((localDsSettings?.licenseCategories || []).some((c: any) => (c.code || c.name) === newFeeForm.className) || ['Class A', 'Class B', 'Class C1'].includes(newFeeForm.className)) && (
                                                        <option value={newFeeForm.className}>{newFeeForm.className}</option>
                                                    )}
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Package Description (Optional)</label>
                                                <input type="text" value={newFeeForm.description || ''} onChange={e => setNewFeeForm({...newFeeForm, description: e.target.value})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs" placeholder="e.g. Full standard driving curriculum" />
                                            </div>

                                            <div className="space-y-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest ml-1">Fee Vote Items (Heads)</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setNewFeeForm({
                                                                ...newFeeForm,
                                                                items: [...newFeeForm.items, { name: '', amount: 0, priority: newFeeForm.items.length + 1 }]
                                                            });
                                                        }}
                                                        className="flex items-center gap-1 text-[9px] font-black text-indigo-600 uppercase tracking-widest bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-indigo-100 dark:border-indigo-900/40 hover:bg-indigo-50 transition-all"
                                                    >
                                                        <PlusIcon className="w-3 h-3" /> Add Item
                                                    </button>
                                                </div>

                                                {localDsSettings?.votes && Array.isArray(localDsSettings.votes) && localDsSettings.votes.length > 0 && (
                                                    <div className="flex flex-wrap gap-1.5 pt-1 items-center">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mr-1">Quick Add Vote:</span>
                                                        {localDsSettings.votes.map((vt: any) => (
                                                            <button
                                                                key={vt.id || vt.voteName}
                                                                type="button"
                                                                onClick={() => {
                                                                    const current = Array.isArray(newFeeForm.items) ? newFeeForm.items : [];
                                                                    const nextItems = [...current, { 
                                                                        name: vt.voteName || vt.vote_name || '', 
                                                                        amount: vt.defaultAmount ?? (vt as any).default_amount ?? 0, 
                                                                        priority: current.length + 1 
                                                                    }];
                                                                    setNewFeeForm({ 
                                                                        ...newFeeForm, 
                                                                        items: nextItems
                                                                    });
                                                                }}
                                                                className="px-3 py-1 bg-white dark:bg-slate-850 text-slate-600 dark:text-slate-300 hover:text-indigo-600 rounded-lg text-[9px] font-bold border border-slate-200 dark:border-slate-700 hover:border-indigo-500 transition-all flex items-center gap-1"
                                                            >
                                                                <PlusIcon className="w-2.5 h-2.5 text-indigo-500" />
                                                                {vt.voteName || vt.vote_name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                <div className="space-y-2">
                                                    {newFeeForm.items.length > 0 && (
                                                        <div className="flex gap-4 px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 select-none">
                                                            <div className="flex-1 min-w-[220px]">Vote Head / Label</div>
                                                            <div className="w-32">Amount (KES)</div>
                                                            <div className="w-12 text-center">Priority</div>
                                                            <div className="w-9"></div>
                                                        </div>
                                                    )}
                                                    {(Array.isArray(newFeeForm.items) ? newFeeForm.items : []).map((it, idx) => {
                                                        return (
                                                            <div key={idx} className="flex gap-4 items-center bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                                                                <div className="flex-[3] min-w-[220px]">
                                                                    <select
                                                                        required
                                                                        value={it.name || ''}
                                                                        onChange={e => {
                                                                            const val = e.target.value;
                                                                            const nextItems = [...newFeeForm.items];
                                                                            const matchedVote = (localDsSettings?.votes || []).find((v: any) => (v.voteName || v.vote_name)?.toLowerCase().trim() === val.toLowerCase().trim());
                                                                            nextItems[idx] = { 
                                                                                ...it, 
                                                                                name: val,
                                                                                amount: (matchedVote && it.amount === 0) ? (matchedVote.defaultAmount ?? (matchedVote as any).default_amount ?? 0) : it.amount
                                                                            };
                                                                            setNewFeeForm({ ...newFeeForm, items: nextItems });
                                                                        }}
                                                                        className="form-select w-full px-4 py-2 bg-white dark:bg-slate-900 rounded-xl outline-none border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                                    >
                                                                        <option value="" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Select Vote Head</option>
                                                                        {(!localDsSettings?.votes || localDsSettings.votes.length === 0) ? (
                                                                            <>
                                                                                <option value="Tuition Fee" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Tuition Fee</option>
                                                                                <option value="PDL" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">PDL</option>
                                                                                <option value="Assessment" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Assessment</option>
                                                                                <option value="Exam Fee" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Exam Fee</option>
                                                                                <option value="Licensing Fee" className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">Licensing Fee</option>
                                                                            </>
                                                                        ) : (
                                                                            (localDsSettings.votes || []).map((vt: any) => {
                                                                                const n = vt.voteName || vt.vote_name;
                                                                                return n ? <option key={vt.id || n} value={n} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{n}</option> : null;
                                                                            })
                                                                        )}
                                                                        {it.name && !((localDsSettings?.votes || []).some((v: any) => (v.voteName || v.vote_name) === it.name) || (!localDsSettings?.votes || localDsSettings.votes.length === 0) && ['Tuition Fee', 'PDL', 'Assessment', 'Exam Fee', 'Licensing Fee'].includes(it.name)) && (
                                                                            <option value={it.name} className="text-slate-900 dark:text-white bg-white dark:bg-slate-900">{it.name}</option>
                                                                        )}
                                                                    </select>
                                                                </div>
                                                                <input
                                                                    type="number"
                                                                    required
                                                                    value={it.amount === 0 ? '' : it.amount}
                                                                    onChange={e => {
                                                                        const nextItems = [...newFeeForm.items];
                                                                        nextItems[idx] = { ...it, amount: Number(e.target.value) };
                                                                        setNewFeeForm({ ...newFeeForm, items: nextItems });
                                                                    }}
                                                                    placeholder="Amount"
                                                                    className="w-32 px-4 py-2 bg-white dark:bg-slate-900 rounded-xl outline-none border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                                />
                                                                <input
                                                                    type="number"
                                                                    min="1"
                                                                    max="9"
                                                                    value={it.priority || idx + 1}
                                                                    onChange={e => {
                                                                        const nextItems = [...newFeeForm.items];
                                                                        nextItems[idx] = { ...it, priority: Number(e.target.value) };
                                                                        setNewFeeForm({ ...newFeeForm, items: nextItems });
                                                                    }}
                                                                    placeholder="#"
                                                                    className="w-12 px-2 py-2 text-center bg-white dark:bg-slate-900 rounded-xl outline-none border border-slate-200 dark:border-slate-700 font-bold text-sm text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                                                                    title="Priority weight (lowest priority gets paid first)"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        setNewFeeForm({
                                                                            ...newFeeForm,
                                                                            items: newFeeForm.items.filter((_, i) => i !== idx)
                                                                        });
                                                                    }}
                                                                    className="p-2 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/20 rounded-xl transition-all"
                                                                >
                                                                    <TrashIcon className="w-5 h-5" />
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                    {newFeeForm.items.length === 0 && (
                                                        <p className="text-center text-xs text-slate-400 py-4 font-medium italic">No fee items assigned yet. Click Quick Add or Add Item above.</p>
                                                    )}
                                                </div>

                                                {newFeeForm.items.length > 0 && (
                                                    <div className="flex justify-end pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                                        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/20 px-4 py-2 rounded-xl">
                                                            <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Calculated Total:</span>
                                                            <span className="text-sm font-black text-slate-900 dark:text-white">
                                                                KES {newFeeForm.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0)?.toLocaleString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={() => { setIsAddingFee(false); setEditingFeeId(null); setNewFeeForm({ className: '', description: '', items: [{ name: 'Tuition Fee', amount: 15000, priority: 1 }, { name: 'PDL', amount: 1500, priority: 2 }, { name: 'Assessment', amount: 2000, priority: 3 }] }); }} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                                            <button 
                                                onClick={() => {
                                                    const calculatedTotal = newFeeForm.items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);
                                                    const feeData = {
                                                        id: editingFeeId || Math.random().toString(36).substr(2, 9),
                                                        institutionId: props.currentInstitution?.id || '',
                                                        className: newFeeForm.className,
                                                        description: newFeeForm.description || `${newFeeForm.className} Premium Package`,
                                                        items: newFeeForm.items,
                                                        totalAmount: calculatedTotal,
                                                        updatedAt: new Date().toISOString()
                                                    };
                                                    let nextStructures = [...(localDsSettings?.feeStructures || [])];
                                                    if (editingFeeId) { nextStructures = nextStructures.map(f => f.id === editingFeeId ? { ...f, ...feeData } : f); } 
                                                    else { nextStructures.push({ ...feeData, createdAt: new Date().toISOString() } as any); }
                                                    const baseSettings = localDsSettings || props.dsSettings || { 
                                                        institutionId: props.currentInstitution?.id || '', 
                                                        id: `ds_settings_${props.currentInstitution?.id || Date.now()}`,
                                                        feeStructures: [] 
                                                    };
                                                    const next = { 
                                                        ...baseSettings, 
                                                        feeStructures: nextStructures 
                                                    } as DSSettings;
                                                    setLocalDsSettings(next);
                                                    setIsAddingFee(false);
                                                    setEditingFeeId(null);
                                                    setNewFeeForm({ className: '', description: '', items: [{ name: 'Tuition Fee', amount: 15000, priority: 1 }, { name: 'PDL', amount: 1500, priority: 2 }, { name: 'Assessment', amount: 2000, priority: 3 }] });
                                                }}
                                                className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                {editingFeeId ? 'Update Class Fee' : 'Save Class Fee'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button 
                                        onClick={() => setIsAddingFee(true)}
                                        className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span>Add Class Fee</span>
                                    </button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                                {(localDsSettings?.feeStructures || []).map((fee) => (
                                    <div key={fee.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center justify-between mb-4">
                                            <span className="text-sm font-black text-indigo-600 uppercase tracking-widest">{fee.className}</span>
                                            <span className="text-lg font-black text-slate-900 dark:text-white">KSH {(fee.totalAmount ?? 0)?.toLocaleString()}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {(Array.isArray(fee.items) ? fee.items : []).map((item, i) => (
                                                <div key={i} className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/40 last:border-none">
                                                    <span className="text-[11px] font-black text-slate-950 dark:text-slate-50 uppercase tracking-wider">{item.name}</span>
                                                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400">KSH {(item.amount ?? 0)?.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-4 flex items-center gap-4">
                                            <button 
                                                onClick={() => {
                                                    setEditingFeeId(fee.id);
                                                    const loadedItems = Array.isArray(fee.items) && fee.items.length > 0 
                                                        ? fee.items.map(it => ({ name: it.name, amount: it.amount, priority: it.priority ?? 1 })) 
                                                        : [
                                                            { name: 'Tuition Fee', amount: (fee as any).tuition || 0, priority: (fee as any).tuitionPriority || 1 },
                                                            { name: 'PDL', amount: (fee as any).pdl || 0, priority: (fee as any).pdlPriority || 2 },
                                                            { name: 'Assessment', amount: (fee as any).assessment || 0, priority: (fee as any).assessmentPriority || 3 }
                                                        ].filter(it => it.amount > 0);
                                                    setNewFeeForm({
                                                        className: fee.className,
                                                        description: (fee as any).description || '',
                                                        items: loadedItems.length > 0 ? loadedItems : [{ name: 'Standard Course Fee', amount: fee.totalAmount || 0, priority: 1 }]
                                                    });
                                                    setIsAddingFee(true);
                                                }}
                                                className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                            >
                                                Edit Structure
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    const next = { ...localDsSettings, feeStructures: localDsSettings?.feeStructures?.filter(f => f.id !== fee.id) } as DSSettings;
                                                    setLocalDsSettings(next);
                                                }}
                                                className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                            >
                                                Remove Structure
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(localDsSettings?.feeStructures || []).length === 0 && (
                                    <div className="md:col-span-2 py-12 text-center bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No fee structures defined yet</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {dsConfigSubTab === 'license_category' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">License Categories</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Define customizable driving license classes (e.g. Class A, Class B, Class C1)</p>
                                </div>
                                {!isAddingLicenseCategory && (
                                    <button 
                                        onClick={() => {
                                            setIsAddingLicenseCategory(true);
                                            setEditingLicenseCategoryId(null);
                                            setNewLicenseCategoryForm({ code: '', name: '', description: '', isActive: true, parentCategory: 'Driving' });
                                        }}
                                        className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span>Add Category</span>
                                    </button>
                                )}
                            </div>

                            {isAddingLicenseCategory && (
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 animate-fade-in-up">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Class Code</label>
                                            <input required type="text" value={newLicenseCategoryForm.code} onChange={e => setNewLicenseCategoryForm({...newLicenseCategoryForm, code: e.target.value})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Class C1" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category Name</label>
                                            <input required type="text" value={newLicenseCategoryForm.name} onChange={e => setNewLicenseCategoryForm({...newLicenseCategoryForm, name: e.target.value})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Light Truck / Commercial" />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Parent Category (Group)</label>
                                            <select 
                                                value={newLicenseCategoryForm.parentCategory || 'Driving'} 
                                                onChange={e => setNewLicenseCategoryForm({...newLicenseCategoryForm, parentCategory: e.target.value})} 
                                                className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs text-slate-900 dark:text-slate-100 appearance-none"
                                            >
                                                {Array.from(new Set([
                                                    'Driving',
                                                    ...(localDsSettings?.licenseGroups || ['Driving', 'Computer Classes', 'IELTS']),
                                                    ...Array.from(new Set((localDsSettings?.licenseCategories || []).map((c: any) => c.parentCategory).filter(Boolean)))
                                                ])).map((parent: any) => (
                                                    <option key={parent} value={parent}>{parent}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description & Vehicles Covered</label>
                                            <input type="text" value={newLicenseCategoryForm.description} onChange={e => setNewLicenseCategoryForm({...newLicenseCategoryForm, description: e.target.value})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold text-xs" placeholder="e.g. Motor vehicles of gross vehicle weight exceeding 3500kg..." />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => { setIsAddingLicenseCategory(false); setEditingLicenseCategoryId(null); setNewLicenseCategoryForm({ code: '', name: '', description: '', isActive: true, parentCategory: '' }); }} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                                        <button 
                                            onClick={async () => {
                                                if (!newLicenseCategoryForm.code || !newLicenseCategoryForm.name) {
                                                    alert("Please provide both Class Code and Category Name.");
                                                    return;
                                                }
                                                const catData = {
                                                    id: editingLicenseCategoryId || `cat_${Date.now()}`,
                                                    code: newLicenseCategoryForm.code.trim(),
                                                    name: newLicenseCategoryForm.name.trim(),
                                                    description: newLicenseCategoryForm.description.trim(),
                                                    isActive: newLicenseCategoryForm.isActive,
                                                    parentCategory: newLicenseCategoryForm.parentCategory.trim() || 'Driving'
                                                };
                                                let nextList = [...(localDsSettings?.licenseCategories || [])];
                                                if (editingLicenseCategoryId) {
                                                    nextList = nextList.map(c => c.id === editingLicenseCategoryId ? { ...c, ...catData } : c);
                                                } else {
                                                    nextList.push(catData);
                                                }
                                                const baseSettings = localDsSettings || props.dsSettings || { 
                                                    institutionId: props.currentInstitution?.id || '', 
                                                    id: `ds_settings_${props.currentInstitution?.id || Date.now()}`,
                                                    licenseCategories: [] 
                                                };
                                                const next = { ...baseSettings, licenseCategories: nextList } as DSSettings;
                                                setLocalDsSettings(next);
                                                setIsAddingLicenseCategory(false);
                                                setEditingLicenseCategoryId(null);
                                                setNewLicenseCategoryForm({ code: '', name: '', description: '', isActive: true, parentCategory: '' });
                                                // Immediately persist to DB so parentCategory and all fields are saved
                                                try {
                                                    await props.onUpdateDSSettings?.(next);
                                                } catch (err) {
                                                    console.error('[SettingsManager] Failed to persist license category to DB:', err);
                                                }
                                            }}
                                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            {editingLicenseCategoryId ? 'Update License Category' : 'Save License Category'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-12">
                                {(() => {
                                    const grouped: Record<string, any[]> = {};
                                    (localDsSettings?.licenseCategories || []).forEach((cat: any) => {
                                        const parent = cat.parentCategory || 'Driving';
                                        if (!grouped[parent]) grouped[parent] = [];
                                        grouped[parent].push(cat);
                                    });
                                    const entries = Object.entries(grouped);
                                    if (entries.length === 0) {
                                        return (
                                            <div className="py-12 text-center bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No custom license categories configured</p>
                                                <p className="text-[9px] text-slate-400">System will use standard legacy defaults (Class A, Class B, Class C1)</p>
                                            </div>
                                        );
                                    }
                                    return entries.map(([parent, cats]) => (
                                        <div key={parent} className="space-y-4">
                                            <h4 className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.2em] border-b border-slate-100 dark:border-slate-800 pb-2">{parent}</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                {cats.map((cat) => (
                                                    <div key={cat.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                                        <div>
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-black text-xs rounded-xl uppercase tracking-widest">{cat.code}</span>
                                                            </div>
                                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{cat.name}</h4>
                                                            {cat.description && (
                                                                <p className="text-xs text-slate-500 font-medium mt-2 leading-relaxed">{cat.description}</p>
                                                            )}
                                                        </div>
                                                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between gap-2">
                                                            <button
                                                                onClick={() => setManagingFeeForCategory(managingFeeForCategory === cat.id ? null : cat.id)}
                                                                className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl transition-all ${
                                                                    managingFeeForCategory === cat.id
                                                                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                                                                        : 'bg-slate-100 dark:bg-slate-700/60 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'
                                                                }`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                Fee Structure
                                                            </button>
                                                            <div className="flex items-center gap-4">
                                                                <button 
                                                                    onClick={() => {
                                                                        setEditingLicenseCategoryId(cat.id);
                                                                        setNewLicenseCategoryForm({
                                                                            code: cat.code,
                                                                            name: cat.name,
                                                                            description: cat.description || '',
                                                                            isActive: cat.isActive ?? true,
                                                                            parentCategory: cat.parentCategory || 'Driving'
                                                                        });
                                                                        setIsAddingLicenseCategory(true);
                                                                        setManagingFeeForCategory(null);
                                                                    }}
                                                                    className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                                >
                                                                    Edit Category
                                                                </button>
                                                                <button 
                                                                    onClick={() => {
                                                                        const next = { ...localDsSettings, licenseCategories: localDsSettings?.licenseCategories?.filter(c => c.id !== cat.id) } as DSSettings;
                                                                        setLocalDsSettings(next);
                                                                    }}
                                                                    className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                                                >
                                                                    Delete
                                                                </button>
                                                            </div>
                                                        </div>
                                                        {/* Inline Fee Structure Panel */}
                                                        {managingFeeForCategory === cat.id && (() => {
                                                            const catFees = (localDsSettings?.feeStructures || []).filter(
                                                                (f: any) => f.className?.toLowerCase().trim() === cat.code?.toLowerCase().trim() ||
                                                                            f.className?.toLowerCase().trim() === cat.name?.toLowerCase().trim()
                                                            );
                                                            return (
                                                                <div className="mt-4 pt-4 border-t border-emerald-100 dark:border-emerald-900/30 animate-fade-in-up">
                                                                    <div className="flex items-center justify-between mb-3">
                                                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Fee Structures — {cat.code}: {cat.name}</p>
                                                                        <button
                                                                            onClick={() => {
                                                                                setNewFeeForm({ className: cat.code, description: `${cat.name} Fee Package`, items: [{ name: 'Tuition Fee', amount: 15000, priority: 1 }, { name: 'PDL', amount: 1500, priority: 2 }, { name: 'Assessment', amount: 2000, priority: 3 }] });
                                                                                setEditingFeeId(null);
                                                                                setIsAddingFee(true);
                                                                                setManagingFeeForCategory(null);
                                                                                setDsConfigSubTab('fee_structures');
                                                                            }}
                                                                            className="flex items-center gap-1 text-[9px] font-black text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl hover:bg-emerald-100 transition-all uppercase tracking-widest"
                                                                        >
                                                                            <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                                                                            Add New
                                                                        </button>
                                                                    </div>
                                                                    {catFees.length > 0 ? (
                                                                        <div className="space-y-2">
                                                                            {catFees.map((fee: any) => (
                                                                                <div key={fee.id} className="bg-white dark:bg-slate-900/60 rounded-2xl px-4 py-3 border border-slate-100 dark:border-slate-700/50">
                                                                                    <div className="flex items-center justify-between mb-2">
                                                                                        <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{fee.className}</span>
                                                                                        <span className="text-xs font-black text-emerald-600">KES {(fee.totalAmount ?? 0)?.toLocaleString()}</span>
                                                                                    </div>
                                                                                    <div className="space-y-1 mb-3">
                                                                                        {(Array.isArray(fee.items) ? fee.items : []).map((item: any, i: number) => (
                                                                                            <div key={i} className="flex items-center justify-between text-[10px]">
                                                                                                <span className="text-slate-400 font-medium">{item.name}</span>
                                                                                                <span className="text-slate-600 dark:text-slate-300 font-bold">KES {(item.amount ?? 0)?.toLocaleString()}</span>
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-700/40">
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setEditingFeeId(fee.id);
                                                                                                const loadedItems = Array.isArray(fee.items) && fee.items.length > 0
                                                                                                    ? fee.items.map((it: any) => ({ name: it.name, amount: it.amount, priority: it.priority ?? 1 }))
                                                                                                    : [{ name: 'Standard Course Fee', amount: fee.totalAmount || 0, priority: 1 }];
                                                                                                setNewFeeForm({ className: fee.className, description: (fee as any).description || '', items: loadedItems });
                                                                                                setIsAddingFee(true);
                                                                                                setManagingFeeForCategory(null);
                                                                                                setDsConfigSubTab('fee_structures');
                                                                                            }}
                                                                                            className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                                                        >Edit</button>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                const next = { ...localDsSettings, feeStructures: localDsSettings?.feeStructures?.filter((f: any) => f.id !== fee.id) } as DSSettings;
                                                                                                setLocalDsSettings(next);
                                                                                            }}
                                                                                            className="text-[9px] font-black text-red-400 uppercase tracking-widest hover:underline"
                                                                                        >Remove</button>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <div className="py-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">No fee structure for {cat.code} yet</p>
                                                                            <p className="text-[9px] text-slate-400 mt-1">Click &quot;Add New&quot; to create one</p>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })()}

                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    )}

                    {dsConfigSubTab === 'license_groups' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Category Groups</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage groupings for your courses (e.g. Driving, IELTS, Computer classes)</p>
                                </div>
                            </div>

                            {/* Add Group Form */}
                            <div className="p-8 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-[2.5rem] border border-indigo-100/50 dark:border-indigo-900/20 space-y-4">
                                <div className="flex items-center gap-2">
                                    <PlusIcon className="w-4 h-4 text-indigo-600" />
                                    <h4 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Add Category Group</h4>
                                </div>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <input 
                                        type="text" 
                                        value={newLicenseGroupForm}
                                        onChange={e => setNewLicenseGroupForm(e.target.value)}
                                        placeholder="e.g. Computer Classes"
                                        className="flex-1 px-5 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold text-xs"
                                    />
                                    <button
                                        onClick={() => {
                                            const name = newLicenseGroupForm.trim();
                                            if (!name) return;
                                            
                                            const currentGroups = localDsSettings?.licenseGroups || ['Driving', 'Computer Classes', 'IELTS'];
                                            if (currentGroups.map(g => g.toLowerCase()).includes(name.toLowerCase())) {
                                                alert("Group name already exists.");
                                                return;
                                            }
                                            
                                            const next = {
                                                ...(localDsSettings || props.dsSettings || {}),
                                                licenseGroups: [...currentGroups, name]
                                            } as DSSettings;
                                            setLocalDsSettings(next);
                                            setNewLicenseGroupForm('');
                                        }}
                                        className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:scale-105 transition-all"
                                    >
                                        Add Group
                                    </button>
                                </div>
                            </div>

                            {/* Groups List View */}
                            <div className="space-y-4">
                                <h5 className="text-xs font-black text-slate-400 uppercase tracking-widest ml-1">Active Groups</h5>
                                {(() => {
                                    const currentGroups = localDsSettings?.licenseGroups || ['Driving', 'Computer Classes', 'IELTS'];
                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {currentGroups.map((group, idx) => {
                                                const isEditing = editingLicenseGroupOriginalName === group;
                                                // Count categories assigned to this group
                                                const count = (localDsSettings?.licenseCategories || []).filter(c => (c.parentCategory || 'Driving') === group).length;

                                                return (
                                                    <div key={idx} className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                                                        <div className="flex-1">
                                                            {isEditing ? (
                                                                <input 
                                                                    type="text" 
                                                                    value={editingLicenseGroupForm}
                                                                    onChange={e => setEditingLicenseGroupForm(e.target.value)}
                                                                    className="w-full px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl font-bold text-xs"
                                                                />
                                                            ) : (
                                                                <div>
                                                                    <h6 className="font-bold text-sm text-slate-900 dark:text-white">{group}</h6>
                                                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1">{count} {count === 1 ? 'Category' : 'Categories'}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            {isEditing ? (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newName = editingLicenseGroupForm.trim();
                                                                            if (!newName || newName === group) {
                                                                                setEditingLicenseGroupOriginalName(null);
                                                                                return;
                                                                            }
                                                                            // Check duplicates
                                                                            if (currentGroups.filter(g => g !== group).map(g => g.toLowerCase()).includes(newName.toLowerCase())) {
                                                                                alert("Another group with this name already exists.");
                                                                                return;
                                                                            }
                                                                            
                                                                            // Rename group and update categories parentCategory field
                                                                            const nextGroups = currentGroups.map(g => g === group ? newName : g);
                                                                            const nextCategories = (localDsSettings?.licenseCategories || []).map(c => 
                                                                                (c.parentCategory || 'Driving') === group ? { ...c, parentCategory: newName } : c
                                                                            );
                                                                            
                                                                            setLocalDsSettings(prev => ({
                                                                                ...(prev || props.dsSettings || {}),
                                                                                licenseGroups: nextGroups,
                                                                                licenseCategories: nextCategories
                                                                            } as DSSettings));
                                                                            setEditingLicenseGroupOriginalName(null);
                                                                        }}
                                                                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                                    >
                                                                        Save
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingLicenseGroupOriginalName(null)}
                                                                        className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:underline"
                                                                    >
                                                                        Cancel
                                                                    </button>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingLicenseGroupOriginalName(group);
                                                                            setEditingLicenseGroupForm(group);
                                                                        }}
                                                                        className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                                                    >
                                                                        Edit
                                                                    </button>
                                                                    {group !== 'Driving' && (
                                                                        <button
                                                                            onClick={() => {
                                                                                if (!confirm(`Are you sure you want to delete the group "${group}"? All categories under this group will be moved to the default "Driving" group.`)) {
                                                                                    return;
                                                                                }
                                                                                
                                                                                const nextGroups = currentGroups.filter(g => g !== group);
                                                                                const nextCategories = (localDsSettings?.licenseCategories || []).map(c => 
                                                                                    (c.parentCategory || 'Driving') === group ? { ...c, parentCategory: 'Driving' } : c
                                                                                );
                                                                                
                                                                                setLocalDsSettings(prev => ({
                                                                                    ...(prev || props.dsSettings || {}),
                                                                                    licenseGroups: nextGroups,
                                                                                    licenseCategories: nextCategories
                                                                                } as DSSettings));
                                                                            }}
                                                                            className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                                                        >
                                                                            Delete
                                                                        </button>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    )}

                    {dsConfigSubTab === 'vote_heads' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Votes (Fee Heads)</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manage institutional revenue streams and tuition fee components</p>
                                </div>
                                {!isAddingVoteHead && (
                                    <button 
                                        onClick={() => {
                                            setIsAddingVoteHead(true);
                                            setEditingVoteHeadId(null);
                                            setNewVoteHeadForm({ name: '', allocatedAmount: 0, priority: 1 });
                                        }}
                                        className="flex items-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all"
                                    >
                                        <PlusIcon className="w-4 h-4" />
                                        <span>Add Vote Head</span>
                                    </button>
                                )}
                            </div>

                            {isAddingVoteHead && (
                                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-[2.5rem] border border-indigo-100 dark:border-indigo-900/30 animate-fade-in-up">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vote Head Name</label>
                                            <input required type="text" value={newVoteHeadForm.name} onChange={e => setNewVoteHeadForm({...newVoteHeadForm, name: e.target.value})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="e.g. Tuition Fee" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Allocated Budget (KES)</label>
                                            <input type="number" min="0" value={newVoteHeadForm.allocatedAmount} onChange={e => setNewVoteHeadForm({...newVoteHeadForm, allocatedAmount: parseFloat(e.target.value) || 0})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="0.00" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Priority / Order</label>
                                            <input required type="number" min="1" value={newVoteHeadForm.priority} onChange={e => setNewVoteHeadForm({...newVoteHeadForm, priority: parseInt(e.target.value) || 1})} className="w-full px-6 py-4 bg-white dark:bg-slate-800 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 font-bold" placeholder="1" />
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <button onClick={() => { setIsAddingVoteHead(false); setEditingVoteHeadId(null); }} className="flex-1 py-4 bg-white dark:bg-slate-800 text-slate-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all">Cancel</button>
                                        <button 
                                            onClick={async () => {
                                                if (!newVoteHeadForm.name) {
                                                    alert("Please provide a Vote Head Name.");
                                                    return;
                                                }
                                                const vData = {
                                                    id: editingVoteHeadId || `vote_${Date.now()}`,
                                                    name: newVoteHeadForm.name.trim(),
                                                    allocatedAmount: newVoteHeadForm.allocatedAmount || 0,
                                                    amountSpent: 0,
                                                    academicYearId: props.academicYears?.[0]?.id || 'default_year',
                                                    priority: newVoteHeadForm.priority || 1,
                                                    institutionId: props.currentInstitution?.id || ''
                                                };
                                                let nextList = [...(props.voteHeads || [])];
                                                if (editingVoteHeadId) {
                                                    nextList = nextList.map(v => v.id === editingVoteHeadId ? { ...v, ...vData } : v);
                                                } else {
                                                    nextList.push(vData);
                                                }
                                                
                                                console.log("[SettingsManager] Initiating Vote Head update persistence flow. Payload:", nextList);
                                                props.onUpdateVoteHeads?.(nextList);

                                                if (props.isDS && props.onUpdateDSSettings) {
                                                    const dsVoteObj = {
                                                        id: vData.id,
                                                        institutionId: vData.institutionId || 'inst',
                                                        voteName: vData.name,
                                                        defaultAmount: vData.allocatedAmount,
                                                        isMandatory: false
                                                    };
                                                    const currentSettings = (localDsSettings || props.dsSettings || {}) as DSSettings;
                                                    const existingDsVotes = currentSettings.votes || [];
                                                    let nextDsVotes = [...existingDsVotes];
                                                    if (editingVoteHeadId) {
                                                        nextDsVotes = nextDsVotes.map(v => v.id === editingVoteHeadId ? { ...v, ...dsVoteObj } : v);
                                                    } else {
                                                        nextDsVotes.push(dsVoteObj);
                                                    }
                                                    const dsPayload = {
                                                        ...currentSettings,
                                                        id: currentSettings.id || `ds_settings_${props.currentInstitution?.id}`,
                                                        institutionId: props.currentInstitution?.id || 'inst',
                                                        votes: nextDsVotes
                                                    } as DSSettings;
                                                    console.log("[SettingsManager] Synchronizing vote head to Driving School sub-collection. Payload structure:", dsPayload);
                                                    setLocalDsSettings(dsPayload);
                                                    await props.onUpdateDSSettings(dsPayload).catch(err => {
                                                        console.error("[SettingsManager] DS Settings sub-collection persistence error:", err);
                                                    });
                                                }

                                                setIsAddingVoteHead(false);
                                                setEditingVoteHeadId(null);
                                                setNewVoteHeadForm({ name: '', allocatedAmount: 0, priority: 1 });
                                            }}
                                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                        >
                                            {editingVoteHeadId ? 'Update Vote Head' : 'Save Vote Head'}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {(props.voteHeads || []).map((vote) => (
                                    <div key={vote.id} className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-black text-xs rounded-xl uppercase tracking-widest">Priority {vote.priority}</span>
                                                {vote.allocatedAmount > 0 && (
                                                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">Budget: KES {(vote.allocatedAmount ?? 0)?.toLocaleString()}</span>
                                                )}
                                            </div>
                                            <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{vote.name}</h4>
                                        </div>
                                        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-end gap-4">
                                            <button 
                                                onClick={() => {
                                                    setEditingVoteHeadId(vote.id);
                                                    setNewVoteHeadForm({
                                                        name: vote.name,
                                                        allocatedAmount: vote.allocatedAmount || 0,
                                                        priority: vote.priority || 1
                                                    });
                                                    setIsAddingVoteHead(true);
                                                }}
                                                className="text-[9px] font-black text-indigo-600 uppercase tracking-widest hover:underline"
                                            >
                                                Edit
                                            </button>
                                            <button 
                                                onClick={async () => {
                                                    if (confirm(`Are you sure you want to remove ${vote.name}?`)) {
                                                        const nextList = (props.voteHeads || []).filter(v => v.id !== vote.id);
                                                        console.log(`[SettingsManager] Deleting Vote Head ID ${vote.id}. Remaining payload structure:`, nextList);
                                                        props.onUpdateVoteHeads?.(nextList);

                                                        if (props.isDS && props.onUpdateDSSettings) {
                                                            const currentSettings = (localDsSettings || props.dsSettings || {}) as DSSettings;
                                                            const nextDsVotes = (currentSettings.votes || []).filter((v: any) => v.id !== vote.id);
                                                            const dsPayload = {
                                                                ...currentSettings,
                                                                id: currentSettings.id || `ds_settings_${props.currentInstitution?.id}`,
                                                                institutionId: props.currentInstitution?.id || 'inst',
                                                                votes: nextDsVotes
                                                            } as DSSettings;
                                                            console.log("[SettingsManager] Deleting vote head from Driving School sub-collection. Payload:", dsPayload);
                                                            setLocalDsSettings(dsPayload);
                                                            await props.onUpdateDSSettings(dsPayload).catch(err => console.error(err));
                                                        }
                                                    }
                                                }}
                                                className="text-[9px] font-black text-red-500 uppercase tracking-widest hover:underline"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {(props.voteHeads || []).length === 0 && (
                                    <div className="md:col-span-2 py-12 text-center bg-slate-50/50 dark:bg-slate-800/50 rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">No vote heads configured</p>
                                        <p className="text-[9px] text-slate-400">Click 'Add Vote Head' above to register components like Tuition Fee.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="pt-8 border-t border-slate-50 dark:border-slate-800 mt-12">
                        <button 
                            onClick={async () => { 
                                if (localDsSettings) {
                                    setIsSaving(true);
                                    try {
                                        await props.onUpdateDSSettings?.(localDsSettings);
                                        props.onRefreshData?.(); 
                                        alert("Settings saved successfully.");
                                    } catch (err) {
                                        alert("Failed to save settings.");
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }
                            }}
                            disabled={isSaving}
                            className={`w-full py-5 text-white rounded-3xl font-black text-sm uppercase tracking-[0.2em] shadow-xl transition-all ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.01] active:scale-[0.98] shadow-indigo-600/30'}`}
                        >
                            {isSaving ? 'Processing Persistence...' : 'Save Configuration'}
                        </button>
                    </div>
                </div>
            )}
            {/* General Tab */}
            {
                activeTab === 'general' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                            {(() => {
                                if (isRetailAgency || props.activeScope === 'inventory') {
                                    const filtered = ['profile', 'location', 'branding'];
                                    if (props.currentUser.role === 'admin') {
                                        filtered.push('billing');
                                        filtered.push('integrations');
                                        filtered.push('sms');
                                    }
                                    return filtered;
                                }
                                if (isCoop || !isEdu || isDS) {
                                    const filtered = ['profile', 'location', 'branding'];
                                    if (isDS) {
                                        filtered.push('security_policy');
                                    }
                                    if (props.currentUser.role === 'admin' || isCoop) {
                                        filtered.push('billing');
                                        filtered.push('integrations');
                                        filtered.push('sms');
                                        filtered.push('whatsapp');
                                        if (isCoop) filtered.push('farmer_billing');
                                    }
                                    return filtered;
                                }
                                const subs = ['profile', 'exam_config', 'grading', 'subject_grouping', 'kcpe_scores', 'security_policy', 'location', 'branding'];
                                if (props.currentUser.role === 'admin') { 
                                    subs.push('billing'); 
                                    subs.push('integrations');
                                    subs.push('sms'); 
                                    subs.push('whatsapp');
                                }
                                return subs;
                            })().map((sub: string) => (
                                <button key={sub} onClick={() => setGeneralSubTab(sub as any)} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${generalSubTab === sub ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                    {sub === 'profile' && <InformationCircleIcon className="w-4 h-4" />}
                                    {sub === 'academic_settings' && <ChartBarIcon className="w-4 h-4 text-amber-500" />}
                                    {sub === 'exam_config' && <AcademicCapIcon className="w-4 h-4 text-indigo-600" />}
                                    {sub === 'grading' && <AcademicCapIcon className="w-4 h-4 text-indigo-500" />}
                                    {sub === 'subject_grouping' && <BookOpenIcon className="w-4 h-4 text-emerald-500" />}
                                    {sub === 'kcpe_scores' && <AcademicCapIcon className="w-4 h-4 text-purple-500" />}
                                    {sub === 'security_policy' && <ShieldIcon className="w-4 h-4 text-rose-500" />}
                                    {sub === 'location' && <MapPinIcon className="w-4 h-4 text-emerald-500" />}
                                    {sub === 'branding' && <SparklesIcon className="w-4 h-4 text-purple-500" />}
                                    {sub === 'billing' && <CreditCardIcon className="w-4 h-4 text-blue-500" />}
                                    {sub === 'integrations' && <ArrowsRightLeftIcon className="w-4 h-4 text-slate-500" />}
                                    {sub === 'sms' && <PaperAirplaneIcon className="w-4 h-4 text-sky-500" />}
                                    {sub === 'whatsapp' && <ChatBubbleBottomCenterTextIcon className="w-4 h-4 text-emerald-500" />}

                                    {sub === 'exam_config' ? 'Exam' : sub === 'grading' ? 'Grade Map' : sub === 'subject_grouping' ? 'Subject Grouping' : sub === 'kcpe_scores' ? 'KCPE Scores' : sub === 'integrations' ? 'Billing Map' : sub === 'whatsapp' ? 'WhatsApp Gateway' : sub.replace('_', ' ')}
                                </button>
                            ))}
                        </div>
                        {generalSubTab === 'profile' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                                <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><BuildingOfficeIcon className="w-5 h-5 text-indigo-500" /> Institutional Records</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Official Name</label><input type="text" value={props.currentInstitution?.name || ''} readOnly className="form-input bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed font-bold" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Identity Code</label><input type="text" value={props.currentInstitution?.institutionCode || ''} readOnly className="form-input bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed font-mono text-indigo-600" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">System Email</label><input type="email" value={instProfile.email} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstProfile({ ...instProfile, email: e.target.value })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Admin Phone</label><input type="tel" value={instProfile.phoneNumber} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstProfile({ ...instProfile, phoneNumber: e.target.value })} className="form-input" /></div>
                                </div>

                                <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
                                    <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-indigo-500" /> AI System Architecture</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                                        <button
                                            onClick={() => setInstProfile({ ...instProfile, aiModelTier: 'premium' })}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${instProfile.aiModelTier === 'premium' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white">Premium Tier (Gemini 3.0 Pro)</span>
                                                {instProfile.aiModelTier === 'premium' && <CheckIcon className="w-5 h-5 text-indigo-600" />}
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Utilises Gemini 3.0 Pro for elite reasoning and high-fidelity logical constraints.</p>
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800">
                                    <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><StoreIcon className="w-5 h-5 text-indigo-500" /> {isCampaign ? 'Campaign Public Presence' : 'Storefront & Digital Identity'}</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Custom Store URL Slug</label>
                                                <div className="relative group">
                                                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400 font-mono text-[10px] uppercase">?shop=</div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="e.g. nairobi-agrovet"
                                                        value={instProfile.slug || ''}
                                                        onChange={(e) => {
                                                            const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                            setInstProfile({ ...instProfile, slug: val });
                                                        }}
                                                        className="form-input pl-16 font-mono text-xs font-bold"
                                                    />
                                                </div>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 ml-1">Lowercase alphanumeric and hyphens only.</p>
                                            </div>

                                            <div>
                                                 <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Kiosk URL</label>
                                                 <input 
                                                     type="url" 
                                                     placeholder="https://kiosk.yourdomain.com"
                                                     value={instProfile.kioskUrl || (
                                                         instProfile.useSubdomain && instProfile.customSubdomain
                                                             ? `https://${instProfile.customSubdomain}.eduai.co.ke/kiosk`
                                                             : `${window.location.origin}${window.location.pathname}?view=ds&tab=portal&kiosk=checkin&shop=${instProfile.slug || props.currentInstitution?.slug || props.currentInstitution?.id}`
                                                     )}
                                                     onChange={(e) => setInstProfile({ ...instProfile, kioskUrl: e.target.value })}
                                                     className="form-input font-mono text-xs font-bold"
                                                 />
                                                 <p className="text-[9px] text-slate-400 font-bold uppercase mt-2 ml-1">Kiosk display site configuration link (Autogenerated if left empty)</p>
                                             </div>

                                            <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="checkbox"
                                                        id="use-subdomain"
                                                        checked={instProfile.useSubdomain || false}
                                                        onChange={(e) => setInstProfile({ ...instProfile, useSubdomain: e.target.checked })}
                                                        className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    />
                                                    <div>
                                                        <label htmlFor="use-subdomain" className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer">Enable Custom Subdomain</label>
                                                        <p className="text-[10px] text-slate-400">Map your institution to a custom subdomain (e.g. schoolname.eduai.co.ke)</p>
                                                    </div>
                                                </div>

                                                {(instProfile.useSubdomain || false) && (
                                                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800 animate-fade-in">
                                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 ml-1">Subdomain Name</label>
                                                        <div className="relative">
                                                            <input 
                                                                type="text" 
                                                                placeholder="subdomain"
                                                                value={instProfile.customSubdomain || ''}
                                                                onChange={(e) => {
                                                                    const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                                                                    setInstProfile({ ...instProfile, customSubdomain: val });
                                                                }}
                                                                className="form-input pr-32 font-mono text-xs font-bold"
                                                            />
                                                            <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400 font-mono text-[10px] uppercase">.eduai.co.ke</div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        
                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-2">
                                                    {props.currentInstitution?.institutionType === 'Hospitality' ? 'Public Booking Portal' : isCampaign ? 'Join Campaign Link' : 'Public Storefront Link'}
                                                </p>
                                                <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 truncate">
                                                    {instProfile.useSubdomain && instProfile.customSubdomain 
                                                        ? `https://${instProfile.customSubdomain}.eduai.co.ke` 
                                                        : `${window.location.origin}/?shop=${instProfile.slug || props.currentInstitution?.id}`}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const url = instProfile.useSubdomain && instProfile.customSubdomain 
                                                            ? `https://${instProfile.customSubdomain}.eduai.co.ke` 
                                                            : `${window.location.origin}/?shop=${instProfile.slug || props.currentInstitution?.id}`;
                                                        navigator.clipboard.writeText(url);
                                                        alert(isCampaign ? 'Campaign link copied to clipboard!' : 'Storefront link copied to clipboard!');
                                                    }}
                                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                                                >
                                                    Copy Link
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const url = instProfile.useSubdomain && instProfile.customSubdomain 
                                                            ? `https://${instProfile.customSubdomain}.eduai.co.ke` 
                                                            : `${window.location.origin}/?shop=${instProfile.slug || props.currentInstitution?.id}`;
                                                        window.open(url, '_blank');
                                                    }}
                                                    className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-colors shadow-md"
                                                >
                                                    Preview
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end">
                                    <button 
                                        disabled={isSavingProfile}
                                        onClick={handleSaveInstitutionProfile} 
                                        className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100 flex items-center gap-3"
                                    >
                                        {isSavingProfile && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                        {isSavingProfile ? 'Updating Profile...' : 'Update Profile'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {generalSubTab === 'security_policy' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in">
                                <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                                    <ShieldIcon className="w-5 h-5 text-indigo-500" /> Administrative Constraints & Security
                                </h4>
                                <div className="space-y-4">
                                    {isEdu && (
                                        <>
                                            <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <input
                                                    type="checkbox"
                                                    id="use-alloc-reqs"
                                                    checked={instProfile.useAllocationRequests}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstProfile({ ...instProfile, useAllocationRequests: e.target.checked })}
                                                    className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                                <div>
                                                    <label htmlFor="use-alloc-reqs" className="text-sm font-bold text-slate-700 dark:text-slate-300">Enable Collaborative Allocation Requests</label>
                                                    <p className="text-xs text-slate-400">Allows {isSchool ? 'teachers' : 'lecturers'} to submit unit preferences before generation.</p>
                                                </div>
                                            </div>

                                            <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="checkbox"
                                                        id="enforce-store-hours"
                                                        checked={instProfile.storeHoursEnforced}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstProfile({ ...instProfile, storeHoursEnforced: e.target.checked })}
                                                        className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div>
                                                        <label htmlFor="enforce-store-hours" className="text-sm font-bold text-slate-700 dark:text-slate-300">Enforce Store Operational Hours Policy</label>
                                                        <p className="text-xs text-slate-400">Restricts storekeepers from issuing or receiving inventory items outside of the designated hours.</p>
                                                    </div>
                                                </div>
                                                {instProfile.storeHoursEnforced && (
                                                    <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Opening Time</label>
                                                            <input
                                                                type="time"
                                                                value={instProfile.storeOpenTime}
                                                                onChange={(e) => setInstProfile({ ...instProfile, storeOpenTime: e.target.value })}
                                                                className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-xs font-bold text-slate-500 mb-1">Closing Time</label>
                                                            <input
                                                                type="time"
                                                                value={instProfile.storeCloseTime}
                                                                onChange={(e) => setInstProfile({ ...instProfile, storeCloseTime: e.target.value })}
                                                                className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                            />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {isSchool && (
                                        <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <input
                                                type="checkbox"
                                                id="enable-parent-notifications"
                                                checked={instProfile.parentAbsenceNotificationsEnabled}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstProfile({ ...instProfile, parentAbsenceNotificationsEnabled: e.target.checked })}
                                                className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div>
                                                <label htmlFor="enable-parent-notifications" className="text-sm font-bold text-slate-700 dark:text-slate-300">Parent Absence Notifications</label>
                                                <p className="text-xs text-slate-400">Automatically notify parents via SMS/Email when a student is marked as absent.</p>
                                            </div>
                                        </div>
                                    )}

                                    {isSuperAdmin && (
                                        <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <input
                                                type="checkbox"
                                                id="enable-2fa"
                                                checked={instProfile.isOtpEnabled}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInstProfile({ ...instProfile, isOtpEnabled: e.target.checked })}
                                                className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div>
                                                <label htmlFor="enable-2fa" className="text-sm font-bold text-slate-700 dark:text-slate-300">Two-Factor Authentication (2FA)</label>
                                                <p className="text-xs text-slate-400">Require users to verify their identity via SMS or Email OTP when signing in.</p>
                                            </div>
                                        </div>
                                    )}

                                    {!isSuperAdmin && instProfile.isOtpEnabled && (
                                        <div className="flex items-center gap-4 p-5 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
                                            <ShieldIcon className="w-6 h-6 text-indigo-500" />
                                            <div>
                                                <p className="text-sm font-bold text-slate-700 dark:text-slate-300">2FA Protection Active</p>
                                                <p className="text-xs text-slate-400">Two-factor authentication is enforced by system security policy.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Security Kiosk Controller */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4 mt-6 animate-fade-in">
                                        <div>
                                            <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">Security Gate Kiosk Controller</h5>
                                            <p className="text-xs text-slate-400">Configure remote lockdown state and passcodes for the self-service visitor gate terminals.</p>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2">
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-slate-500">Kiosk Terminal Status</label>
                                                <select
                                                    value={instProfile.kioskStatus || 'active'}
                                                    onChange={(e) => setInstProfile({ ...instProfile, kioskStatus: e.target.value as any })}
                                                    className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                                                >
                                                    <option value="active">Active (Unlocked)</option>
                                                    <option value="locked">Emergency Lockout (Locked)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="block text-xs font-bold text-slate-500">Security Kiosk Exit PIN</label>
                                                <input
                                                    type="text"
                                                    maxLength={8}
                                                    value={instProfile.kioskSecurityPin || ''}
                                                    onChange={(e) => setInstProfile({ ...instProfile, kioskSecurityPin: e.target.value.replace(/\D/g, '') })}
                                                    placeholder="e.g. 1234"
                                                    className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-xs font-mono"
                                                />
                                            </div>
                                        </div>
                                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">Gate Kiosk Access Link</p>
                                                <p className="text-[10px] text-slate-500 truncate">Launch on security gate Android tablets: <span className="font-bold select-all">{window.location.origin}/?view=security_kiosk</span></p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`${window.location.origin}/?view=security_kiosk`);
                                                    alert("Gate Kiosk link copied to clipboard!");
                                                }}
                                                className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0"
                                            >
                                                Copy Kiosk Link
                                            </button>
                                        </div>
                                    </div>

                                    {/* Gate Attendance & Staff Self Check-In QR Signboard */}
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4 mt-4 animate-fade-in">
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div>
                                                <h5 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                                    <QrCodeIcon className="w-5 h-5 text-indigo-500" />
                                                    Staff Gate Attendance & Check-In QR Signboard
                                                </h5>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    Print official entrance signboard QR posters. Teachers and staff scan this physical poster with their mobile devices upon arrival to complete self check-in.
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => printGateQrSignboard(props.currentInstitution?.name || 'School Entrance', props.currentInstitution?.id || '')}
                                                className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all font-black uppercase text-xs tracking-widest shrink-0 hover:scale-[1.02] active:scale-[0.98]"
                                                title="Print Gate Attendance Signboard"
                                            >
                                                <PrinterIcon className="w-4 h-4 text-white" />
                                                Print Gate QR Signboard
                                            </button>
                                        </div>
                                        <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between text-xs">
                                            <span className="text-slate-500 font-medium">Entrance Gate QR Payload:</span>
                                            <code className="text-indigo-600 dark:text-indigo-400 font-mono font-bold bg-white dark:bg-slate-800 px-2.5 py-1 rounded-md border border-indigo-200/50">
                                                school_gate_id:{props.currentInstitution?.id || 'N/A'}
                                            </code>
                                        </div>
                                    </div>

                                    {/* Visitor Auto-Finalize */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4 mt-2 animate-fade-in">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                id="visitor-auto-finalize"
                                                checked={instProfile.visitorAutoFinalizeEnabled}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const checked = e.target.checked;
                                                    setInstProfile(prev => ({ ...prev, visitorAutoFinalizeEnabled: checked }));
                                                    try {
                                                        const id = props.currentInstitution?.id;
                                                        const existingRaw = (id && localStorage.getItem(`eduai_visitor_settings_${id}`)) || localStorage.getItem('eduai_visitor_settings');
                                                        const existing = existingRaw ? JSON.parse(existingRaw) : {};
                                                        const payload = {
                                                            ...existing,
                                                            visitorAutoFinalizeEnabled: checked,
                                                            visitor_auto_finalize_enabled: checked,
                                                            visitorAutoFinalizeTime: instProfile.visitorAutoFinalizeTime || '18:00',
                                                            visitor_auto_finalize_time: instProfile.visitorAutoFinalizeTime || '18:00'
                                                        };
                                                        if (id) localStorage.setItem(`eduai_visitor_settings_${id}`, JSON.stringify(payload));
                                                        localStorage.setItem('eduai_visitor_settings', JSON.stringify(payload));
                                                    } catch (_) {}
                                                }}
                                                className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div>
                                                <label htmlFor="visitor-auto-finalize" className="text-sm font-bold text-slate-700 dark:text-slate-300">Auto-Finalize Walk-in Visitor Exits</label>
                                                <p className="text-xs text-slate-400">Automatically mark all active walk-in visitors as checked-out at the configured cutoff time each day. Useful when security forgets to finalize exits.</p>
                                            </div>
                                        </div>
                                        {instProfile.visitorAutoFinalizeEnabled && (
                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 animate-fade-in">
                                                <label className="block text-xs font-bold text-slate-500 mb-1">Daily Cutoff Time</label>
                                                <input
                                                    type="time"
                                                    value={instProfile.visitorAutoFinalizeTime || '18:00'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        setInstProfile(prev => ({ ...prev, visitorAutoFinalizeTime: val }));
                                                        try {
                                                            const id = props.currentInstitution?.id;
                                                            const existingRaw = (id && localStorage.getItem(`eduai_visitor_settings_${id}`)) || localStorage.getItem('eduai_visitor_settings');
                                                            const existing = existingRaw ? JSON.parse(existingRaw) : {};
                                                            const payload = {
                                                                ...existing,
                                                                visitorAutoFinalizeTime: val,
                                                                visitor_auto_finalize_time: val,
                                                                visitorAutoFinalizeEnabled: instProfile.visitorAutoFinalizeEnabled,
                                                                visitor_auto_finalize_enabled: instProfile.visitorAutoFinalizeEnabled
                                                            };
                                                            if (id) localStorage.setItem(`eduai_visitor_settings_${id}`, JSON.stringify(payload));
                                                            localStorage.setItem('eduai_visitor_settings', JSON.stringify(payload));
                                                        } catch (_) {}
                                                    }}
                                                    className="w-40 h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1">All visitors still active after this time will be auto-checked-out by the system.</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Visitor Arrival SMS Notifications to Host */}
                                    <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4 mt-2 animate-fade-in">
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="checkbox"
                                                id="notify-host-visitor-arrival"
                                                checked={instProfile.notifyHostOnVisitorArrival}
                                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                                    const checked = e.target.checked;
                                                    setInstProfile(prev => ({ ...prev, notifyHostOnVisitorArrival: checked }));
                                                    try {
                                                        const id = props.currentInstitution?.id;
                                                        const existingRaw = (id && localStorage.getItem(`eduai_visitor_settings_${id}`)) || localStorage.getItem('eduai_visitor_settings');
                                                        const existing = existingRaw ? JSON.parse(existingRaw) : {};
                                                        const payload = {
                                                            ...existing,
                                                            notifyHostOnVisitorArrival: checked,
                                                            notify_host_on_visitor_arrival: checked
                                                        };
                                                        if (id) localStorage.setItem(`eduai_visitor_settings_${id}`, JSON.stringify(payload));
                                                        localStorage.setItem('eduai_visitor_settings', JSON.stringify(payload));
                                                    } catch (_) {}
                                                }}
                                                className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                            <div>
                                                <label htmlFor="notify-host-visitor-arrival" className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                                    📱 Notify Host via SMS upon Visitor Arrival
                                                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Security Gate SMS</span>
                                                </label>
                                                <p className="text-xs text-slate-400">
                                                    Automatically send an SMS text message to the staff member or office tenant as soon as a visitor checks in at the gate, checkpoint, or self-service kiosk.
                                                </p>
                                            </div>
                                        </div>
                                        {instProfile.notifyHostOnVisitorArrival && (
                                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-3 animate-fade-in">
                                                <div>
                                                    <label className="block text-xs font-bold text-slate-500 mb-1">Custom SMS Message Template (Optional)</label>
                                                    <input
                                                        type="text"
                                                        value={instProfile.visitorArrivalSmsTemplate || ''}
                                                        placeholder="Hi {host}, visitor {visitor} has arrived at the security gate for {purpose}. Tap here to authorize: {link}"
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setInstProfile(prev => ({ ...prev, visitorArrivalSmsTemplate: val }));
                                                            try {
                                                                const id = props.currentInstitution?.id;
                                                                const existingRaw = (id && localStorage.getItem(`eduai_visitor_settings_${id}`)) || localStorage.getItem('eduai_visitor_settings');
                                                                const existing = existingRaw ? JSON.parse(existingRaw) : {};
                                                                const payload = {
                                                                    ...existing,
                                                                    visitorArrivalSmsTemplate: val,
                                                                    visitor_arrival_sms_template: val
                                                                };
                                                                if (id) localStorage.setItem(`eduai_visitor_settings_${id}`, JSON.stringify(payload));
                                                                localStorage.setItem('eduai_visitor_settings', JSON.stringify(payload));
                                                            } catch (_) {}
                                                        }}
                                                        className="w-full h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 outline-none text-xs"
                                                    />
                                                    <p className="text-[10px] text-slate-400 mt-1">Available placeholders: <code className="text-indigo-500 font-bold">{'{host}'}</code>, <code className="text-indigo-500 font-bold">{'{visitor}'}</code>, <code className="text-indigo-500 font-bold">{'{purpose}'}</code>, <code className="text-indigo-500 font-bold">{'{institution}'}</code>, <code className="text-indigo-500 font-bold">{'{link}'}</code></p>
                                                </div>
                                                <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/30 text-[11px] text-slate-600 dark:text-slate-300">
                                                    Ensure your <strong>Institution SMS Gateway</strong> (Zettatel, Sematime, or ABMIS) has an active credit balance under the <em>SMS Gateway</em> settings tab.
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="mt-8 flex justify-end">
                                    <button onClick={handleSaveInstitutionProfile} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Synchronize Policies</button>
                                </div>

                                {/* Data Management for Admins */}
                                {(props.onGenerateDemoData || props.onClearDemoData) && (
                                    <div className="mt-10 pt-10 border-t border-slate-100 dark:border-slate-800 space-y-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 rounded-lg">
                                                <SparklesIcon className="w-5 h-5 text-amber-600" />
                                            </div>
                                            <h4 className="font-bold text-lg uppercase tracking-tight">Data & Sample Management</h4>
                                        </div>
                                        
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-tight italic">Populate your workspace with sample patients, staff, and academic records to explore system features.</p>
                                                <button
                                                    onClick={props.onGenerateDemoData}
                                                    disabled={props.isGeneratingDemoData}
                                                    className="btn-secondary w-full h-11 flex items-center justify-center gap-2 text-xs font-bold"
                                                >
                                                    <SparklesIcon className="w-5 h-5 text-amber-500" />
                                                    {props.isGeneratingDemoData ? 'Populating...' : 'Generate Sample Data'}
                                                </button>
                                            </div>

                                            <div className="bg-red-50/30 dark:bg-red-900/10 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
                                                <p className="text-xs text-slate-500 mb-4 font-bold uppercase tracking-tight italic">Clear all demo data to start fresh. This action is permanent and cannot be undone.</p>
                                                <button
                                                    onClick={props.onClearDemoData}
                                                    disabled={props.isGeneratingDemoData}
                                                    className="w-full h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                                                >
                                                    <XIcon className="w-5 h-5" />
                                                    {props.isGeneratingDemoData ? 'Clearing...' : 'Clear All Data'}
                                                </button>
                                            </div>
                                        </div>

                                        {props.isGeneratingDemoData && (
                                            <div className="mt-6 space-y-3 p-4 bg-indigo-50/30 dark:bg-indigo-900/10 rounded-2xl animate-fade-in border border-indigo-100/50">
                                                <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-indigo-600">
                                                    <span>{props.demoDataGenerationMessage}</span>
                                                    <span>{props.demoDataGenerationProgress}%</span>
                                                </div>
                                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-600 transition-all duration-500 shadow-[0_0_10px_rgba(79,70,229,0.3)]"
                                                        style={{ width: `${props.demoDataGenerationProgress}%` }}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}
                        {generalSubTab === 'location' && <LocationSettings institution={props.currentInstitution} onSave={(id: string, data: any) => props.onUpdateInstitution && props.onUpdateInstitution(id, data)} />}
                        {generalSubTab === 'branding' && (
                            <div className="space-y-6 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-8">
                                        <h4 className="font-bold text-lg flex items-center gap-2">
                                            <SparklesIcon className="w-5 h-5 text-indigo-500" /> Visual Brand Identity & Letterhead
                                        </h4>
                                        <button
                                            type="button"
                                            onClick={() => setShowPaperPreview(!showPaperPreview)}
                                            className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-1 cursor-pointer"
                                        >
                                            <EyeIcon className="w-4 h-4" /> {showPaperPreview ? 'Hide Paper' : 'Preview Documents'}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">
                                                    Accent Theme Color
                                                </label>
                                                <div className="flex gap-4 items-center">
                                                    <input
                                                        type="color"
                                                        value={props.themeColor}
                                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onUpdateThemeColor && props.onUpdateThemeColor(e.target.value)}
                                                        className="h-12 w-24 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer"
                                                    />
                                                    <span className="font-mono text-sm font-bold text-slate-500 uppercase">{props.themeColor}</span>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">
                                                    Corporate Seal / Logo
                                                </label>
                                                <div className="flex items-center gap-6">
                                                    <div className="h-20 w-20 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
                                                        {props.logoUrl ? (
                                                            <img loading="lazy" src={props.logoUrl} alt="Logo" className="h-full w-full object-contain" />
                                                        ) : (
                                                            <BuildingOfficeIcon className="w-8 h-8 text-slate-200" />
                                                        )}
                                                    </div>
                                                    <label className="btn-secondary text-[10px] h-10 px-4 flex items-center justify-center cursor-pointer">
                                                        Update Emblem
                                                        <input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'logo')} />
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Official Rubber Stamp Card */}
                                            <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">
                                                        Official Rubber Stamp & Dater
                                                    </label>
                                                    <span className="text-[9px] font-bold uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full">
                                                        {props.letterheadConfig?.stampConfig?.mode === 'uploaded' ? 'Custom Upload' : (props.letterheadConfig?.stampConfig?.mode === 'none' ? 'Disabled' : 'Dynamic Auto-Dater')}
                                                    </span>
                                                </div>

                                                <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-14 h-14 bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 overflow-hidden shadow-sm flex-shrink-0">
                                                            <KenyanOfficialStamp
                                                                institution={props.currentInstitution}
                                                                config={props.letterheadConfig?.stampConfig}
                                                                date={new Date()}
                                                                size={48}
                                                            />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-black uppercase text-slate-900 dark:text-white">
                                                                {props.letterheadConfig?.stampConfig?.mode === 'uploaded' ? 'Uploaded Custom Stamp' : (props.letterheadConfig?.stampConfig?.mode === 'none' ? 'No Stamp' : 'Kenyan Circular Stamp')}
                                                            </p>
                                                            <p className="text-[10px] text-slate-400 font-medium">
                                                                {props.letterheadConfig?.stampConfig?.mode === 'uploaded' ? 'Custom image stamp active' : 'Auto-updates date on receipts & vouchers'}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <button
                                                        type="button"
                                                        onClick={() => setIsStampModalOpen(true)}
                                                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shadow-sm flex-shrink-0"
                                                    >
                                                        Configure
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">
                                                    Document Header (LPO/Receipts)
                                                </label>
                                                <label className="btn-secondary h-24 w-full flex flex-col items-center justify-center gap-2 cursor-pointer border-dashed">
                                                    <ArrowUpTrayIcon className="w-6 h-6 text-slate-300" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Header Banner</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'letterhead')} />
                                                </label>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">
                                                    Official Report Footer
                                                </label>
                                                <label className="btn-secondary h-16 w-full flex items-center justify-center gap-2 cursor-pointer border-dashed">
                                                    <ArrowUpTrayIcon className="w-4 h-4 text-slate-300" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Footer Strip</span>
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'footer')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {showPaperPreview && (
                                    <div className="mt-12 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-6 bg-slate-50 animate-scale-in origin-top">
                                        <BrandedPaper
                                            institution={props.currentInstitution}
                                            letterheadConfig={props.letterheadConfig}
                                            footerImageUrl={props.footerImageUrl}
                                        >
                                            <div className="h-96 flex flex-col items-center justify-center opacity-10 py-32">
                                                <ClipboardListIcon className="w-24 h-24 text-slate-900 mb-6" />
                                                <p className="text-2xl font-black text-slate-900 uppercase tracking-[0.2em]">Live Document Preview</p>
                                            </div>
                                        </BrandedPaper>
                                    </div>
                                )}
                            </div>
                        )}
                        {generalSubTab === 'exam_config' && <div className="animate-fade-in"><ExamConfigManager currentInstitution={props.currentInstitution} onUpdateInstitution={props.onUpdateInstitution} subjects={props.subjects} academicLevels={props.academicLevels} courses={props.courses} users={props.users} /></div>}
                        {generalSubTab === 'grading' && <div className="animate-fade-in"><GradingSystemManager currentInstitution={props.currentInstitution} onUpdateInstitution={props.onUpdateInstitution} courses={props.courses} users={props.users} subjects={props.subjects} academicLevels={props.academicLevels} /></div>}
                        {generalSubTab === 'subject_grouping' && <div className="animate-fade-in"><SubjectGroupingManager currentInstitution={props.currentInstitution} onUpdateInstitution={props.onUpdateInstitution} academicLevels={props.academicLevels} courses={props.courses} subjects={props.subjects} /></div>}
                        {generalSubTab === 'kcpe_scores' && <div className="animate-fade-in"><KcpeScoresManager currentInstitution={props.currentInstitution} onUpdateInstitution={props.onUpdateInstitution} users={props.users} /></div>}
                        {generalSubTab === 'billing' && props.currentUser.role === 'admin' && (
                            <div className="animate-fade-in">
                                <SubscriptionManager
                                    institution={props.currentInstitution as Institution}
                                    companyDetails={props.companyDetails as CompanyDetails}
                                    transactions={props.transactions || []}
                                    onAddTransaction={props.onAddTransaction || (async () => 'failed')}
                                    invoices={props.invoices || []}
                                    receipts={props.receipts || []}
                                    logoUrl={props.logoUrl || null}
                                    onRefreshData={props.onRefreshData}
                                    extensionRequests={props.extensionRequests || []}
                                    onAddExtensionRequest={props.onAddExtensionRequest}
                                    smsConfig={props.companyDetails?.smsConfig || { provider: 'ABMIS', apiKey: '', apiSecret: '', fromNumber: '' }}
                                    onActivateModuleTrial={props.onActivateModuleTrial}
                                />
                            </div>
                        )}
                        {generalSubTab === 'integrations' && (
                            <div className="space-y-8 animate-fade-in">
                                <h3 className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                                    <ArrowsRightLeftIcon className="w-6 h-6 text-indigo-500" />
                                    External System Integrations
                                </h3>

                                 <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl shadow-inner inline-flex mb-8">
                                    <button
                                        onClick={() => setInstIntegrationTab('mpesa')}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${instIntegrationTab === 'mpesa' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        M-Pesa
                                    </button>
                                    <button
                                        onClick={() => setInstIntegrationTab('ncba')}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${instIntegrationTab === 'ncba' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        NCBA Bank
                                    </button>
                                    <button
                                        onClick={() => setInstIntegrationTab('googledrive')}
                                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${instIntegrationTab === 'googledrive' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        Google Drive
                                    </button>
                                    {isSchool && (
                                        <button
                                            onClick={() => setInstIntegrationTab('itax')}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${instIntegrationTab === 'itax' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            KRA iTax
                                        </button>
                                    )}
                                </div>

                                <div className="space-y-8">
                                    {instIntegrationTab === 'mpesa' && (
                                        <div className="animate-fade-in space-y-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-2xl text-green-600">
                                                    <MpesaIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tight">M-Pesa Daraja Integration</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Configuring Lipa Na M-Pesa for this Institution</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem]">
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Short Code (Paybill)</label>
                                                    <input 
                                                        type="text" 
                                                        value={localInstMpesaConfig.paybillNumber || ''} 
                                                        onChange={(e) => setLocalInstMpesaConfig({ ...localInstMpesaConfig, paybillNumber: e.target.value })}
                                                        className="form-input" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Account Number (Reference)</label>
                                                    <input 
                                                        type="text" 
                                                        value={localInstMpesaConfig.accountNumber || ''} 
                                                        onChange={(e) => setLocalInstMpesaConfig({ ...localInstMpesaConfig, accountNumber: e.target.value })}
                                                        className="form-input" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Lipa Na M-Pesa Passkey</label>
                                                    <input 
                                                        type="password" 
                                                        value={localInstMpesaConfig.passkey || ''} 
                                                        onChange={(e) => setLocalInstMpesaConfig({ ...localInstMpesaConfig, passkey: e.target.value })}
                                                        className="form-input" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Consumer Key</label>
                                                    <input 
                                                        type="text" 
                                                        value={localInstMpesaConfig.consumerKey || ''} 
                                                        onChange={(e) => setLocalInstMpesaConfig({ ...localInstMpesaConfig, consumerKey: e.target.value })}
                                                        className="form-input" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Consumer Secret</label>
                                                    <input 
                                                        type="password" 
                                                        value={localInstMpesaConfig.consumerSecret || ''} 
                                                        onChange={(e) => setLocalInstMpesaConfig({ ...localInstMpesaConfig, consumerSecret: e.target.value })}
                                                        className="form-input" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Environment</label>
                                                    <select 
                                                        value={localInstMpesaConfig.environment || 'sandbox'} 
                                                        onChange={(e) => setLocalInstMpesaConfig({ ...localInstMpesaConfig, environment: e.target.value as any })}
                                                        className="form-select"
                                                    >
                                                        <option value="sandbox">Sandbox (Test)</option>
                                                        <option value="production">Production (Live)</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {instIntegrationTab === 'ncba' && (
                                        <div className="animate-fade-in space-y-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                                                    <NcbaIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tight">NCBA Bank Integration</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Configuring NCBA C2B STK & Open Banking for this Institution</p>
                                                </div>
                                            </div>

                                            {/* C2B STK Push Section */}
                                            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 space-y-4">
                                                <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300">C2B STK Push Credentials</h4>
                                                    <span className="text-[9px] font-bold px-2.5 py-1 bg-blue-100/70 text-blue-700 rounded-full uppercase">Collections</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Environment</label>
                                                        <select 
                                                            value={localInstNcbaConfig.environment || 'sandbox'} 
                                                            onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, environment: e.target.value as any })}
                                                            className="form-select"
                                                        >
                                                            <option value="sandbox">Sandbox (Test)</option>
                                                            <option value="production">Production (Live)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">C2B Base URL</label>
                                                        <input type="text" value={localInstNcbaConfig.baseUrl} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, baseUrl: e.target.value })} className="form-input font-mono text-xs" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Username</label>
                                                        <input type="text" value={localInstNcbaConfig.username || localInstNcbaConfig.clientId || ''} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, username: e.target.value, clientId: e.target.value })} className="form-input font-mono text-xs" placeholder="e.g. NCBA API Username" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Secret Key</label>
                                                        <input type="password" value={localInstNcbaConfig.clientSecret || localInstNcbaConfig.password || ''} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientSecret: e.target.value, password: e.target.value })} className="form-input font-mono text-xs" placeholder="e.g. NCBA Secret Key" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Paybill Number</label>
                                                        <input type="text" value={localInstNcbaConfig.paybill || ''} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, paybill: e.target.value })} className="form-input font-mono text-xs" placeholder="880100" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Account No / Reference</label>
                                                        <input type="text" value={localInstNcbaConfig.accountNumber || ''} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, accountNumber: e.target.value })} className="form-input font-mono text-xs" placeholder="e.g. 9115310018 or EDUAI" />
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Open Banking APIM Section */}
                                            <div className="p-6 bg-emerald-500/5 dark:bg-emerald-950/20 rounded-[2rem] border border-emerald-500/20 space-y-4">
                                                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/20">
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-emerald-800 dark:text-emerald-300">NCBA Open Banking Gateway (APIM)</h4>
                                                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Enterprise Mobile Money Transfer (B2C), Bank Transits (EFT/IFT/PesaLink) & Statements</p>
                                                    </div>
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase">Enable</span>
                                                        <input 
                                                            type="checkbox" 
                                                            checked={!!localInstNcbaConfig.isOpenBankingEnabled} 
                                                            onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, isOpenBankingEnabled: e.target.checked })} 
                                                            className="rounded text-emerald-600 focus:ring-emerald-500" 
                                                        />
                                                    </label>
                                                </div>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Open Banking User ID</label>
                                                        <input 
                                                            type="text" 
                                                            value={localInstNcbaConfig.openBankingUserId || ''} 
                                                            onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, openBankingUserId: e.target.value })} 
                                                            className="form-input font-mono text-xs" 
                                                            placeholder="e.g. NCBA_ENT_USER" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Open Banking Password</label>
                                                        <input 
                                                            type="password" 
                                                            value={localInstNcbaConfig.openBankingPassword || ''} 
                                                            onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, openBankingPassword: e.target.value })} 
                                                            className="form-input font-mono text-xs" 
                                                            placeholder="••••••••" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Ocp-Apim-Subscription-Key</label>
                                                        <input 
                                                            type="password" 
                                                            value={localInstNcbaConfig.subscriptionKey || ''} 
                                                            onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, subscriptionKey: e.target.value })} 
                                                            className="form-input font-mono text-xs" 
                                                            placeholder="32-character Azure APIM Key" 
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Debit Account Number</label>
                                                        <input 
                                                            type="text" 
                                                            value={localInstNcbaConfig.debitAccount || ''} 
                                                            onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, debitAccount: e.target.value, senderCif: e.target.value.slice(0, 6) })} 
                                                            className="form-input font-mono text-xs" 
                                                            placeholder="e.g. 9115310018" 
                                                        />
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Open Banking Base URL</label>
                                                        <input 
                                                            type="text" 
                                                            value={localInstNcbaConfig.openBankingBaseUrl || ''} 
                                                            onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, openBankingBaseUrl: e.target.value })} 
                                                            className="form-input font-mono text-xs" 
                                                            placeholder="https://openbankingtest.api.ncbagroup.com/test/apigateway/" 
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
                                                <button 
                                                    onClick={async () => {
                                                        setIsTestingNcba(true);
                                                        try {
                                                            const res = await apiService.testNcbaAuth(localInstNcbaConfig);
                                                            if (res.success) {
                                                                alert(`C2B Integration Success: ${res.message || 'Authentication successful'}`);
                                                            } else {
                                                                alert(`C2B Integration Failed: ${res.message || 'Check your credentials'}`);
                                                            }
                                                        } catch(err: any) {
                                                            alert(`Connection Error: ${err.message}`);
                                                        } finally {
                                                            setIsTestingNcba(false);
                                                        }
                                                    }}
                                                    disabled={isTestingNcba}
                                                    className="h-12 px-6 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isTestingNcba ? 'Verifying...' : 'Test C2B STK Auth'}
                                                </button>

                                                <button 
                                                    onClick={async () => {
                                                        setIsTestingNcba(true);
                                                        try {
                                                            const res = await apiService.testNcbaOpenBankingAuth(localInstNcbaConfig);
                                                            if (res.success || res.accessToken) {
                                                                alert(`🎉 Open Banking Connected! Bearer Token issued successfully.${res.isMock ? ' (Mock Mode Active)' : ''}`);
                                                            } else {
                                                                alert(`Open Banking Handshake Failed: ${res.message || 'Check your User ID, Password and Subscription Key'}`);
                                                            }
                                                        } catch(err: any) {
                                                            alert(`Connection Error: ${err.message}`);
                                                        } finally {
                                                            setIsTestingNcba(false);
                                                        }
                                                    }}
                                                    disabled={isTestingNcba}
                                                    className="h-12 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                                                >
                                                    {isTestingNcba ? 'Connecting Gateway...' : 'Test Open Banking Gateway'}
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {instIntegrationTab === 'googledrive' && (
                                        <div className="animate-fade-in space-y-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-2xl text-blue-600">
                                                    <SparklesIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tight">Institutional Google Drive</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Automated Cloud Backups for Student & Asset Records</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                                                <div className="md:col-span-2 flex items-center justify-between mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                                                    <div>
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Connectivity Status</h4>
                                                        <p className="text-[10px] text-slate-500 mt-1">Institutions can override global storage with their own cloud credentials.</p>
                                                    </div>
                                                    <button 
                                                        onClick={() => setLocalInstGoogleDriveConfig({...localInstGoogleDriveConfig, isActive: !localInstGoogleDriveConfig.isActive})}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${localInstGoogleDriveConfig.isActive ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}
                                                    >
                                                        {localInstGoogleDriveConfig.isActive ? 'Active & Routing' : 'Offline / Inactive'}
                                                    </button>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">GCP Client ID</label>
                                                    <input 
                                                        type="text" 
                                                        value={localInstGoogleDriveConfig.clientId || ''} 
                                                        onChange={(e) => setLocalInstGoogleDriveConfig({ ...localInstGoogleDriveConfig, clientId: e.target.value })}
                                                        className="form-input font-mono text-xs" 
                                                        placeholder="722xxxxxx-xxxx.apps.googleusercontent.com"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">GCP Client Secret</label>
                                                    <input 
                                                        type="password" 
                                                        value={localInstGoogleDriveConfig.clientSecret || ''} 
                                                        onChange={(e) => setLocalInstGoogleDriveConfig({ ...localInstGoogleDriveConfig, clientSecret: e.target.value })}
                                                        className="form-input font-mono text-xs" 
                                                    />
                                                </div>
                                                <div className="md:col-span-2">
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">OAuth Refresh Token</label>
                                                    <input 
                                                        type="password" 
                                                        value={localInstGoogleDriveConfig.refreshToken || ''} 
                                                        onChange={(e) => setLocalInstGoogleDriveConfig({ ...localInstGoogleDriveConfig, refreshToken: e.target.value })}
                                                        className="form-input font-mono text-xs" 
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Target Folder ID (Drive Path)</label>
                                                    <input 
                                                        type="text" 
                                                        value={localInstGoogleDriveConfig.folderId || ''} 
                                                        onChange={(e) => setLocalInstGoogleDriveConfig({ ...localInstGoogleDriveConfig, folderId: e.target.value })}
                                                        className="form-input font-mono text-xs" 
                                                        placeholder="1Abc_def_Ghi..."
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                    {instIntegrationTab === 'itax' && (
                                        <div className="animate-fade-in space-y-8">
                                            <div className="flex items-center gap-3">
                                                <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-2xl text-red-600">
                                                    <Cog8ToothIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-black uppercase tracking-tight">KRA iTax Integration</h3>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Manage KRA Withholding & MRI filing activation requests</p>
                                                </div>
                                            </div>

                                            <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-6">
                                                {props.currentInstitution?.itaxIntegrationStatus === 'active' ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 p-4 rounded-2xl">
                                                            <CheckCircleIcon className="w-6 h-6" />
                                                            <div>
                                                                <p className="text-sm font-black uppercase tracking-wider">iTax Integration Active</p>
                                                                <p className="text-xs text-emerald-500 font-bold uppercase mt-0.5">Your school is authorized to sync direct withholding tax certificates and file MRI.</p>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 mt-6">
                                                            <div>
                                                                <h4 className="text-xs font-black uppercase text-slate-750 dark:text-white">Enable Automated iTax Filings</h4>
                                                                <p className="text-[10px] text-slate-400 mt-1 uppercase font-bold">Synchronise invoice payments directly to KRA ledger records</p>
                                                            </div>
                                                            <label className="relative inline-flex items-center cursor-pointer">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={props.currentInstitution?.itaxEnabled ?? false} 
                                                                    onChange={async (e) => {
                                                                        if (!props.onUpdateInstitution || !props.currentInstitution) return;
                                                                        try {
                                                                            await props.onUpdateInstitution(props.currentInstitution.id, {
                                                                                itaxEnabled: e.target.checked
                                                                            });
                                                                        } catch (err: any) {
                                                                            alert("Failed to toggle iTax: " + err.message);
                                                                        }
                                                                    }}
                                                                    className="sr-only peer" 
                                                                />
                                                                <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-305 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-650"></div>
                                                            </label>
                                                        </div>
                                                    </div>
                                                ) : props.currentInstitution?.itaxIntegrationStatus === 'requested' || props.currentInstitution?.itaxIntegrationStatus === 'pending_activation' ? (
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-3 text-amber-600 bg-amber-50 dark:bg-amber-955/20 p-4 rounded-2xl">
                                                            <ClockIcon className="w-6 h-6 animate-pulse" />
                                                            <div>
                                                                <p className="text-sm font-black uppercase tracking-wider">iTax Activation Pending</p>
                                                                <p className="text-xs text-amber-500 font-bold uppercase mt-0.5">Request has been submitted to the Super Admin for authorization.</p>
                                                            </div>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase leading-relaxed pt-2">
                                                            KRA iTax endpoints require official security clearance. You will be notified via email or SMS once the Super Admin completes verification of your KRA Pin and certificate credentials.
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-6">
                                                        <div className="flex items-center gap-3 text-slate-500 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl">
                                                            <ExclamationTriangleIcon className="w-6 h-6" />
                                                            <div>
                                                                <p className="text-sm font-black uppercase tracking-wider">iTax Integration Offline</p>
                                                                <p className="text-xs text-slate-400 font-bold uppercase mt-0.5">Integrations are disabled until requested and approved.</p>
                                                            </div>
                                                        </div>

                                                        <div className="pt-2">
                                                            <button
                                                                type="button"
                                                                onClick={async () => {
                                                                    if (!props.onUpdateInstitution || !props.currentInstitution) return;
                                                                    try {
                                                                        await props.onUpdateInstitution(props.currentInstitution.id, {
                                                                            itaxIntegrationStatus: 'requested'
                                                                        });
                                                                        alert("iTax activation request submitted successfully!");
                                                                    } catch (err: any) {
                                                                        alert("Failed to submit request: " + err.message);
                                                                    }
                                                                }}
                                                                className="px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md shadow-indigo-100"
                                                            >
                                                                Request Activation from Super Admin
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center justify-end gap-4 pt-4">
                                    {saveInstGatewaysStatus === 'success' && (
                                        <div className="flex items-center gap-2 text-green-600 animate-scale-in">
                                            <CheckCircleIcon className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Integrations Map Secured</span>
                                        </div>
                                    )}
                                    {saveInstGatewaysStatus === 'error' && (
                                        <div className="flex items-center gap-2 text-rose-500 animate-shake">
                                            <ExclamationTriangleIcon className="w-5 h-5" />
                                            <span className="text-[10px] font-black uppercase tracking-wider">Storage Failure</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={async () => {
                                            if (!props.currentInstitution || !props.onUpdateInstitution) return;
                                            setIsSavingInstGateways(true);
                                            setSaveInstGatewaysStatus('idle');
                                            try {
                                                await props.onUpdateInstitution(props.currentInstitution.id, { 
                                                    mpesaConfig: localInstMpesaConfig,
                                                    ncbaConfig: localInstNcbaConfig,
                                                    googleDriveConfig: localInstGoogleDriveConfig
                                                });
                                                setSaveInstGatewaysStatus('success');
                                                setTimeout(() => setSaveInstGatewaysStatus('idle'), 3000);
                                            } catch (err) {
                                                setSaveInstGatewaysStatus('error');
                                                setTimeout(() => setSaveInstGatewaysStatus('idle'), 4000);
                                            } finally {
                                                setIsSavingInstGateways(false);
                                            }
                                        }}
                                        disabled={isSavingInstGateways}
                                        className={`btn-primary h-12 px-10 shadow-lg uppercase tracking-widest text-xs transition-all ${
                                            saveInstGatewaysStatus === 'success' ? 'bg-green-600 shadow-green-100' : 
                                            saveInstGatewaysStatus === 'error' ? 'bg-rose-600 shadow-rose-100' : 
                                            'shadow-indigo-100 dark:shadow-none'
                                        }`}
                                    >
                                        {isSavingInstGateways ? 'Persisting...' : 
                                         saveInstGatewaysStatus === 'success' ? 'Map Saved' : 
                                         saveInstGatewaysStatus === 'error' ? 'Retry Save' : 
                                         'Save Gateway Map'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {generalSubTab === 'sms' && props.currentUser.role === 'admin' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                        <PaperAirplaneIcon className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Institution SMS Gateway</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Override the system-wide gateway with your own credentials</p>
                                    </div>
                                </div>
                                <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-100 dark:border-indigo-800/50 flex items-start gap-3">
                                    <InformationCircleIcon className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
                                    <div className="text-xs">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">Security Gate &amp; Visitor Arrival SMS Notifications</p>
                                        <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                                            When visitors check in at Security, automatic SMS text messages are sent to the host via this gateway. You can toggle this on/off or customize the SMS template under{' '}
                                            <button type="button" onClick={() => setGeneralSubTab('security_policy')} className="font-bold text-indigo-600 hover:underline">
                                                Security Policy Settings &rarr;
                                            </button>
                                        </p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Service Provider</label>
                                        <select
                                            value={localInstSmsConfig.provider || 'Zettatel'}
                                            onChange={(e) => setLocalInstSmsConfig({ ...localInstSmsConfig, provider: e.target.value })}
                                            className="form-select h-12 font-bold text-sm"
                                        >
                                            <option value="ABMIS">ABMIS (Legacy)</option>
                                            <option value="Sematime">Sematime (Modern)</option>
                                            <option value="Zettatel">Zettatel (Default)</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 space-y-4">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Connection Settings</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Gateway API URL (optional override)</label>
                                                <input
                                                    type="text"
                                                    value={localInstSmsConfig.baseUrl || localInstSmsConfig.api_url || ''}
                                                    placeholder="e.g., https://sms.abmis.co.ke/SMSApi/send"
                                                    onChange={(e) => setLocalInstSmsConfig({ ...localInstSmsConfig, baseUrl: e.target.value })}
                                                    className="form-input font-mono text-xs h-10"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Request Method</label>
                                                <select
                                                    value={localInstSmsConfig.method || 'GET'}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLocalInstSmsConfig({ ...localInstSmsConfig, method: e.target.value as any })}
                                                    className="form-select h-10 font-bold text-xs"
                                                >
                                                    <option value="GET">HTTP GET (Standard)</option>
                                                    <option value="POST">HTTP POST (JSON/Form)</option>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                            {localInstSmsConfig.provider === 'Zettatel' ? 'User ID' : localInstSmsConfig.provider === 'Sematime' ? 'Account ID' : 'User ID / API Key'}
                                        </label>
                                        <input type="text" value={localInstSmsConfig.apiKey} onChange={(e) => setLocalInstSmsConfig({ ...localInstSmsConfig, apiKey: e.target.value })} className="form-input h-10" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                            {localInstSmsConfig.provider === 'Zettatel' ? 'Password' : localInstSmsConfig.provider === 'Sematime' ? 'Auth Token' : 'API Password / Secret'}
                                        </label>
                                        <input type="password" value={localInstSmsConfig.apiSecret} onChange={(e) => setLocalInstSmsConfig({ ...localInstSmsConfig, apiSecret: e.target.value })} className="form-input h-10" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Sender ID / Shortcode</label>
                                        <input type="text" value={localInstSmsConfig.fromNumber} onChange={(e) => setLocalInstSmsConfig({ ...localInstSmsConfig, fromNumber: e.target.value })} className="form-input h-10" />
                                    </div>

                                    <div className="md:col-span-2 pt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Custom HTTP Headers</label>
                                            <button
                                                onClick={() => setLocalInstSmsConfig(prev => ({ ...prev, headers: [...(prev.headers || []), { name: '', value: '' }] }))}
                                                className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"
                                            >
                                                <PlusIcon className="w-3 h-3" /> Add Header
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(localInstSmsConfig.headers || []).map((header, idx) => (
                                                <div key={idx} className="flex gap-2 items-center animate-fade-in">
                                                    <input
                                                        type="text"
                                                        value={header.name}
                                                        placeholder="Name (e.g. Accept)"
                                                        onChange={(e) => {
                                                            const newHeaders = [...(localInstSmsConfig.headers || [])];
                                                            newHeaders[idx].name = e.target.value;
                                                            setLocalInstSmsConfig({ ...localInstSmsConfig, headers: newHeaders });
                                                        }}
                                                        className="form-input text-xs font-mono h-10"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={header.value}
                                                        placeholder="Value (e.g. application/json)"
                                                        onChange={(e) => {
                                                            const newHeaders = [...(localInstSmsConfig.headers || [])];
                                                            newHeaders[idx].value = e.target.value;
                                                            setLocalInstSmsConfig({ ...localInstSmsConfig, headers: newHeaders });
                                                        }}
                                                        className="form-input text-xs font-mono h-10"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newHeaders = (localInstSmsConfig.headers || []).filter((_, i) => i !== idx);
                                                            setLocalInstSmsConfig({ ...localInstSmsConfig, headers: newHeaders });
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <XIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(localInstSmsConfig.headers || []).length === 0 && (
                                                <p className="text-[10px] text-slate-400 uppercase font-medium italic py-2 ml-1">No custom headers defined.</p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="md:col-span-2 pt-4">
                                        <div className="flex justify-between items-center mb-3">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Custom Parameters / Body</label>
                                            <button
                                                onClick={() => setLocalInstSmsConfig(prev => ({ ...prev, params: [...(prev.params || []), { name: '', value: '' }] }))}
                                                className="text-[10px] font-black uppercase text-indigo-600 flex items-center gap-1 hover:underline"
                                            >
                                                <PlusIcon className="w-3 h-3" /> Add Parameter
                                            </button>
                                        </div>
                                        <div className="space-y-2">
                                            {(localInstSmsConfig.params || []).map((param, idx) => (
                                                <div key={idx} className="flex gap-2 items-center animate-fade-in">
                                                    <input
                                                        type="text"
                                                        value={param.name}
                                                        placeholder="Parameter Name"
                                                        onChange={(e) => {
                                                            const newParams = [...(localInstSmsConfig.params || [])];
                                                            newParams[idx].name = e.target.value;
                                                            setLocalInstSmsConfig({ ...localInstSmsConfig, params: newParams });
                                                        }}
                                                        className="form-input text-xs font-mono h-10"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={param.value}
                                                        placeholder="Value"
                                                        onChange={(e) => {
                                                            const newParams = [...(localInstSmsConfig.params || [])];
                                                            newParams[idx].value = e.target.value;
                                                            setLocalInstSmsConfig({ ...localInstSmsConfig, params: newParams });
                                                        }}
                                                        className="form-input text-xs font-mono h-10"
                                                    />
                                                    <button
                                                        onClick={() => {
                                                            const newParams = (localInstSmsConfig.params || []).filter((_, i) => i !== idx);
                                                            setLocalInstSmsConfig({ ...localInstSmsConfig, params: newParams });
                                                        }}
                                                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <XIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                            {(localInstSmsConfig.params || []).length === 0 && (
                                                <p className="text-[10px] text-slate-400 uppercase font-medium italic py-2 ml-1">No custom parameters defined.</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="md:col-span-2 pt-6 border-t border-slate-100 dark:border-slate-700">
                                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-3">Test SMS Delivery</h4>
                                        <div className="flex items-center gap-3 max-w-md">
                                            <input
                                                type="text"
                                                placeholder="Recipient Phone (e.g. 2547XXXXXXXX)"
                                                value={instSmsTestPhone}
                                                onChange={e => setInstSmsTestPhone(e.target.value)}
                                                className="flex-1 h-10 px-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold focus:ring-2 focus:ring-indigo-500"
                                            />
                                            <button
                                                onClick={handleSendInstTestSms}
                                                disabled={isTestingInstSms}
                                                className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest disabled:opacity-50 transition-all shadow-md"
                                            >
                                                {isTestingInstSms ? 'Sending...' : 'Test Gateway'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="pt-6 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                    <button
                                        onClick={() => {
                                            if (confirm('Revert to system default gateway? This will clear your custom credentials.')) {
                                                const systemConfig = props.companyDetails?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' };
                                                setLocalInstSmsConfig(systemConfig);
                                                props.onUpdateInstitution?.(props.currentInstitution!.id, { smsConfig: undefined });
                                            }
                                        }}
                                        className="text-[10px] font-black uppercase text-red-400 hover:text-red-600 transition-colors"
                                    >
                                        Use System Default
                                    </button>
                                    <div className="flex items-center gap-4">
                                        {saveInstSmsStatus === 'success' && (
                                            <div className="flex items-center gap-2 text-green-600 animate-scale-in">
                                                <CheckCircleIcon className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">SMS Route Secured</span>
                                            </div>
                                        )}
                                        {saveInstSmsStatus === 'error' && (
                                            <div className="flex items-center gap-2 text-rose-500 animate-shake">
                                                <ExclamationTriangleIcon className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase tracking-wider">SMS Persistence Failed</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={async () => {
                                                if (!props.currentInstitution || !props.onUpdateInstitution) return;
                                                setIsSavingInstSms(true);
                                                setSaveInstSmsStatus('idle');
                                                try {
                                                    await props.onUpdateInstitution(props.currentInstitution.id, { smsConfig: localInstSmsConfig });
                                                    setSaveInstSmsStatus('success');
                                                    setTimeout(() => setSaveInstSmsStatus('idle'), 3000);
                                                } catch {
                                                    setSaveInstSmsStatus('error');
                                                    setTimeout(() => setSaveInstSmsStatus('idle'), 4000);
                                                } finally {
                                                    setIsSavingInstSms(false);
                                                }
                                            }}
                                            disabled={isSavingInstSms}
                                            className={`btn-primary px-10 h-12 shadow-lg uppercase tracking-widest text-xs transition-all ${
                                                saveInstSmsStatus === 'success' ? 'bg-green-600 shadow-green-100' : 
                                                saveInstSmsStatus === 'error' ? 'bg-rose-600 shadow-rose-100' : 
                                                'shadow-indigo-100 dark:shadow-none'
                                            }`}
                                        >
                                            {isSavingInstSms ? 'Syncing...' : 
                                             saveInstSmsStatus === 'success' ? 'Route Updated' : 
                                             saveInstSmsStatus === 'error' ? 'Retry' : 
                                             'Save SMS Route'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {generalSubTab === 'whatsapp' && props.currentUser.role === 'admin' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6 animate-fade-in">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl text-emerald-600 dark:text-emerald-400">
                                            <ChatBubbleBottomCenterTextIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Institution WhatsApp Gateway</h3>
                                            <p className="text-xs font-medium text-slate-500">Dispatch fee receipts, payment reminders, and report cards straight to parents' phones</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={loadWhatsAppStatus}
                                            disabled={isLoadingWaStatus}
                                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-xl text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 transition-all flex items-center gap-2"
                                        >
                                            <span className={isLoadingWaStatus ? 'animate-spin' : ''}>🔄</span>
                                            {isLoadingWaStatus ? 'Checking...' : 'Refresh Status'}
                                        </button>
                                    </div>
                                </div>

                                {/* Live Connection Status Badge & QR Pairing */}
                                <div className={`p-6 rounded-2xl border transition-all ${
                                    waLiveStatus?.isConnected
                                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50'
                                        : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                                }`}>
                                    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <div className={`w-4 h-4 rounded-full ${
                                                    waLiveStatus?.isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                                                }`} />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                                        {waLiveStatus?.isConnected ? 'Session Connected & Online' : 'Session Disconnected / Pairing Required'}
                                                    </span>
                                                    {waLiveStatus?.phoneNumber && (
                                                        <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 rounded-full text-[10px] font-black">
                                                            +{waLiveStatus.phoneNumber}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                                                    {waLiveStatus?.isConnected
                                                        ? 'Ready to dispatch automated notifications and direct messages to recipients.'
                                                        : 'Scan the QR code below using your school or accounts office handset to pair your WhatsApp account.'}
                                                </p>
                                            </div>
                                        </div>

                                        {waLiveStatus?.isConnected ? (
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!props.currentInstitution?.id) return;
                                                    if (confirm('Disconnect this WhatsApp session? Messages will pause until repaired.')) {
                                                        await whatsappService.disconnect(props.currentInstitution.id);
                                                        await loadWhatsAppStatus();
                                                    }
                                                }}
                                                className="px-4 py-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                                            >
                                                Disconnect WhatsApp
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={loadWhatsAppStatus}
                                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/20"
                                            >
                                                Generate Pairing QR
                                            </button>
                                        )}
                                    </div>

                                    {/* QR Code Display if available and not connected */}
                                    {!waLiveStatus?.isConnected && waLiveStatus?.qrCode && (
                                        <div className="mt-6 pt-6 border-t border-amber-200 dark:border-amber-800/40 flex flex-col items-center justify-center text-center">
                                            <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200">
                                                {waLiveStatus.qrCode.startsWith('data:image') || waLiveStatus.qrCode.startsWith('http') ? (
                                                    <img src={waLiveStatus.qrCode} alt="WhatsApp QR Code" className="w-56 h-56 object-contain" />
                                                ) : (
                                                    <img src={`data:image/png;base64,${waLiveStatus.qrCode}`} alt="WhatsApp QR Code" className="w-56 h-56 object-contain" />
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-3">
                                                Open WhatsApp &gt; Linked Devices &gt; Link a Device &gt; Scan Code
                                            </p>
                                            <p className="text-[11px] text-slate-400">QR codes refresh automatically every 45 seconds for security</p>
                                        </div>
                                    )}
                                </div>

                                {/* Connection Architecture Settings */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">WhatsApp Provider Type</label>
                                        <select
                                            value={localInstWhatsAppConfig.provider_type || 'gateway'}
                                            onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, provider_type: e.target.value as any })}
                                            className="form-select h-12 font-bold text-sm"
                                        >
                                            <option value="gateway">Gateway (Evolution API / Baileys / QR Code Device Pairing - Zero SMS fee)</option>
                                            <option value="meta_cloud">Meta Cloud API (Official WhatsApp Business API Platform)</option>
                                        </select>
                                    </div>

                                    {localInstWhatsAppConfig.provider_type === 'gateway' ? (
                                        <>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Gateway Base URL</label>
                                                <input
                                                    type="text"
                                                    value={localInstWhatsAppConfig.gateway_url || ''}
                                                    placeholder="e.g. https://wa.school.ac.ke or https://api.myserver.com"
                                                    onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, gateway_url: e.target.value })}
                                                    className="form-input h-11 text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Gateway API Key / Token</label>
                                                <input
                                                    type="password"
                                                    value={localInstWhatsAppConfig.api_key || ''}
                                                    placeholder="Gateway auth token / apikey"
                                                    onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, api_key: e.target.value })}
                                                    className="form-input h-11 text-xs"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Instance / Session Name</label>
                                                <input
                                                    type="text"
                                                    value={localInstWhatsAppConfig.instance_name || ''}
                                                    placeholder={`eduai_${props.currentInstitution?.id?.replace(/[^a-zA-Z0-9]/g, '_') || 'school'}`}
                                                    onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, instance_name: e.target.value })}
                                                    className="form-input h-11 text-xs font-mono"
                                                />
                                                <span className="text-[11px] text-slate-400 mt-1 block">Leave empty to use automatic institution instance identifier.</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Meta Phone Number ID</label>
                                                <input
                                                    type="text"
                                                    value={localInstWhatsAppConfig.meta_phone_number_id || ''}
                                                    placeholder="e.g. 104928374829104"
                                                    onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, meta_phone_number_id: e.target.value })}
                                                    className="form-input h-11 text-xs font-mono"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">WhatsApp Business Account ID (WABA ID)</label>
                                                <input
                                                    type="text"
                                                    value={localInstWhatsAppConfig.meta_waba_id || ''}
                                                    placeholder="e.g. 293847582938471"
                                                    onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, meta_waba_id: e.target.value })}
                                                    className="form-input h-11 text-xs font-mono"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Meta Permanent Access Token</label>
                                                <input
                                                    type="password"
                                                    value={localInstWhatsAppConfig.meta_access_token || ''}
                                                    placeholder="EAAG..."
                                                    onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, meta_access_token: e.target.value })}
                                                    className="form-input h-11 text-xs font-mono"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                {/* Channel Automation Settings */}
                                <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700/60 space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                                        Automated Communication Rules
                                    </h4>
                                    <div className="space-y-3">
                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(localInstWhatsAppConfig.auto_send_receipts)}
                                                onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, auto_send_receipts: e.target.checked })}
                                                className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Auto-send Instant WhatsApp Receipt upon Fee Posting</span>
                                                <p className="text-[11px] text-slate-500">Automatically sends a formatted payment acknowledgment and link to the stamped PDF receipt whenever a payment is registered.</p>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(localInstWhatsAppConfig.auto_send_fee_reminders)}
                                                onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, auto_send_fee_reminders: e.target.checked })}
                                                className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Include WhatsApp channel in Fee Balance Reminders</span>
                                                <p className="text-[11px] text-slate-500">Allows finance department to dispatch balance notices and M-Pesa paybill instructions via WhatsApp.</p>
                                            </div>
                                        </label>

                                        <label className="flex items-start gap-3 cursor-pointer select-none">
                                            <input
                                                type="checkbox"
                                                checked={Boolean(localInstWhatsAppConfig.auto_send_academic_results)}
                                                onChange={(e) => setLocalInstWhatsAppConfig({ ...localInstWhatsAppConfig, auto_send_academic_results: e.target.checked })}
                                                className="mt-1 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">Enable WhatsApp Academic Progress & Report Cards</span>
                                                <p className="text-[11px] text-slate-500">Enables one-click academic term result delivery with direct PDF report card downloads.</p>
                                            </div>
                                        </label>
                                    </div>
                                </div>

                                {/* Test Dispatcher & Save */}
                                <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <input
                                            type="text"
                                            value={testWaRecipient}
                                            placeholder="Test phone (e.g. 0712345678)"
                                            onChange={(e) => setTestWaRecipient(e.target.value)}
                                            className="form-input h-11 text-xs w-48 font-mono"
                                        />
                                        <button
                                            type="button"
                                            onClick={async () => {
                                                if (!testWaRecipient.trim() || !props.currentInstitution?.id) {
                                                    alert('Please enter a recipient number to test.');
                                                    return;
                                                }
                                                setIsSendingTestWa(true);
                                                try {
                                                    const res = await whatsappService.sendMessage({
                                                        institutionId: props.currentInstitution.id,
                                                        recipient: testWaRecipient.trim(),
                                                        message: `🔔 *Test from ${props.currentInstitution.name || 'EduAI Automation'}*\n\nYour school WhatsApp messaging service is connected and ready to send official notices!`
                                                    });
                                                    if (res.success) {
                                                        alert('Test WhatsApp message sent successfully!');
                                                    } else {
                                                        alert(`Notice: ${res.message || 'Check gateway connection.'}`);
                                                    }
                                                } catch (err: any) {
                                                    alert('Error sending test message: ' + err.message);
                                                } finally {
                                                    setIsSendingTestWa(false);
                                                }
                                            }}
                                            disabled={isSendingTestWa}
                                            className="px-4 h-11 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-all whitespace-nowrap"
                                        >
                                            {isSendingTestWa ? 'Sending...' : 'Test WhatsApp'}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (!props.currentInstitution?.id || !supabase) return;
                                            setIsSavingWhatsApp(true);
                                            setSaveWaStatus('idle');
                                            try {
                                                const instId = props.currentInstitution.id;
                                                const configId = `wacfg_${instId.replace(/[^a-zA-Z0-9]/g, '_')}`;
                                                const payload = {
                                                    id: configId,
                                                    institution_id: instId,
                                                    provider_type: localInstWhatsAppConfig.provider_type || 'gateway',
                                                    gateway_url: localInstWhatsAppConfig.gateway_url || null,
                                                    api_key: localInstWhatsAppConfig.api_key || null,
                                                    instance_name: localInstWhatsAppConfig.instance_name || `eduai_${instId.replace(/[^a-zA-Z0-9]/g, '_')}`,
                                                    phone_number: localInstWhatsAppConfig.phone_number || null,
                                                    meta_phone_number_id: localInstWhatsAppConfig.meta_phone_number_id || null,
                                                    meta_access_token: localInstWhatsAppConfig.meta_access_token || null,
                                                    meta_waba_id: localInstWhatsAppConfig.meta_waba_id || null,
                                                    auto_send_receipts: Boolean(localInstWhatsAppConfig.auto_send_receipts),
                                                    auto_send_fee_reminders: Boolean(localInstWhatsAppConfig.auto_send_fee_reminders),
                                                    auto_send_academic_results: Boolean(localInstWhatsAppConfig.auto_send_academic_results),
                                                    updated_at: new Date().toISOString()
                                                };

                                                try {
                                                    await whatsappService.saveConfig(payload as any);
                                                } catch (apiErr) {
                                                    console.warn('[SettingsManager WA] Server API save notice:', apiErr);
                                                }
                                                try {
                                                    await supabase.from('whatsapp_configs').upsert(payload);
                                                } catch (sbErr) {
                                                    console.warn('[SettingsManager WA] Direct Supabase upsert notice:', sbErr);
                                                }

                                                if (props.onUpdateInstitution) {
                                                    await props.onUpdateInstitution(instId, {
                                                        whatsappConfig: { ...localInstWhatsAppConfig, ...payload } as any
                                                    });
                                                }
                                                setSaveWaStatus('success');
                                                setTimeout(() => setSaveWaStatus('idle'), 3000);
                                                await loadWhatsAppStatus();
                                            } catch (err: any) {
                                                console.error('Failed to save WhatsApp config:', err);
                                                setSaveWaStatus('error');
                                                setTimeout(() => setSaveWaStatus('idle'), 4000);
                                            } finally {
                                                setIsSavingWhatsApp(false);
                                            }
                                        }}
                                        disabled={isSavingWhatsApp}
                                        className={`px-8 h-12 rounded-xl text-white text-xs font-black uppercase tracking-wider transition-all shadow-md ${
                                            saveWaStatus === 'success'
                                                ? 'bg-green-600 shadow-green-600/20'
                                                : saveWaStatus === 'error'
                                                ? 'bg-rose-600 shadow-rose-600/20'
                                                : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                                        }`}
                                    >
                                        {isSavingWhatsApp ? 'Saving...' : saveWaStatus === 'success' ? 'Settings Saved' : saveWaStatus === 'error' ? 'Retry Save' : 'Save WhatsApp Gateway'}
                                    </button>
                                </div>
                            </div>
                        )}
                        {generalSubTab === 'farmer_billing' && isCoop && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                                        <CreditCardIcon className="w-8 h-8" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">Farmer Communication Billing</h3>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">Manage monthly SMS billing preferences for cooperative members</p>
                                    </div>
                                </div>

                                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700/50 space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm transition-all hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className={`p-3 rounded-xl transition-colors ${instProfile.farmerSmsBillingEnabled ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                                <PaperAirplaneIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">Monthly SMS Billing</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Toggle automated billing for SMS notifications</p>
                                            </div>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={instProfile.farmerSmsBillingEnabled}
                                                onChange={(e) => setInstProfile({ ...instProfile, farmerSmsBillingEnabled: e.target.checked })}
                                                className="sr-only peer" 
                                            />
                                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all dark:border-slate-600 peer-checked:bg-indigo-600 shadow-inner"></div>
                                        </label>
                                    </div>

                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30">
                                        <div className="flex items-start gap-3">
                                            <InformationCircleIcon className="w-5 h-5 text-amber-600 mt-0.5" />
                                            <div>
                                                <p className="text-[11px] font-bold text-amber-700 dark:bg-amber-400 uppercase tracking-widest mb-1">Billing Policy Note</p>
                                                <p className="text-[11px] text-amber-600 dark:text-amber-500/80 leading-relaxed italic">
                                                    When enabled, farmers will be automatically billed for SMS notifications sent to them throughout the month. This balance will be deducted from their payouts or added to their monthly statement.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <button 
                                        disabled={isSavingProfile}
                                        onClick={handleSaveInstitutionProfile}
                                        className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100 dark:shadow-none bg-indigo-600 border-none uppercase tracking-[0.2em] text-[10px] font-black flex items-center gap-3"
                                    >
                                        {isSavingProfile && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>}
                                        {isSavingProfile ? 'Updating Registrar...' : 'Update Billing Registry'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            {/* Calendar Manager Tab */}
            {
                activeTab === 'calendar' && (
                    <div className="animate-fade-in-up">
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
                            isExamCalendarOnly={props.isExamCalendarOnly}
                        />
                    </div>
                )
            }

            {/* Timetable Tab (Rules etc) */}
            {
                activeTab === 'timetable' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex border-b border-slate-200 dark:border-slate-700">
                            {([{ id: 'hours', label: 'Day & Time Span' }, { id: 'periods', label: 'Period Slots' }, { id: 'constraints', label: 'Subject Constraints' }, { id: 'teacher_logic', label: 'Teacher Rules' }, { id: 'exams', label: 'Exam Settings' }] as const).map((sub) => (<button key={sub.id} onClick={() => setTimetableSubTab(sub.id as any)} className={`py-2 px-4 border-b-2 font-black text-[10px] uppercase tracking-widest transition-colors ${timetableSubTab === sub.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>{sub.label}</button>))}
                        </div>

                        {/* Shared Grid Profile Selector for Timetable Sections */}
                        {(timetableSubTab === 'hours' || timetableSubTab === 'periods') && (
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in">
                                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                    <div className="flex items-center gap-6 flex-1 w-full">
                                        <div className="flex-1 min-w-[200px]">
                                            <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1 flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                                Active Schedule Profile
                                            </label>
                                            <div className="flex items-center gap-2">
                                                <select
                                                    value={selectedProfileId}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSelectedProfileId(e.target.value)}
                                                    className="form-select h-12 text-xs font-bold border-slate-200 bg-slate-50/50"
                                                >
                                                    <option value="default">Global Default (All Registry)</option>
                                                    {(props.currentInstitution?.scheduleProfiles || []).map((p: ScheduleProfile) => (
                                                        <option key={p.id} value={p.id}>{p.name}</option>
                                                    ))}
                                                </select>
                                                {selectedProfileId !== 'default' && (
                                                    <button
                                                        onClick={() => handleDeleteProfile(selectedProfileId)}
                                                        className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors border border-red-100"
                                                        title="Purge Profile"
                                                    >
                                                        <XIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <div className="w-px h-10 bg-slate-100 dark:bg-slate-700 hidden md:block" />

                                        <div className="flex-1 min-w-[240px]">
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Spawn New Grid Configuration</label>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={newProfileName}
                                                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewProfileName(e.target.value)}
                                                    placeholder="e.g. ECDE / Lower Primary"
                                                    className="form-input h-12 text-xs border-slate-200"
                                                />
                                                <button
                                                    onClick={handleAddProfile}
                                                    className="h-12 w-12 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:scale-105 transition-transform"
                                                    disabled={!newProfileName.trim()}
                                                >
                                                    <PlusIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {timetableSubTab === 'hours' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-fade-in">
                                <div className="mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                    <h3 className="text-lg font-bold">Operational Timing Registry</h3>
                                    <p className="text-xs text-slate-500">Define opening hours and working days for the active profile.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Operating Days</label>
                                        <div className="flex flex-wrap gap-2">
                                            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day: string) => (
                                                <button key={day} onClick={() => handleToggleOperatingDay(day)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${localTimetableSettings.operatingDays?.includes(day as any) ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'}`}>{day.substring(0, 3)}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Opening Time</label><input type="time" value={localTimetableSettings.startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalTimetableSettings({ ...localTimetableSettings, startTime: e.target.value })} className="form-input" /></div>
                                        <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Closing Time</label><input type="time" value={localTimetableSettings.endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalTimetableSettings({ ...localTimetableSettings, endTime: e.target.value })} className="form-input" /></div>
                                    </div>
                                </div>

                                <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="text-lg font-bold">Standard Breaks</h3>
                                        <div className="flex gap-2">
                                            <input type="text" placeholder="Name" value={newBreak.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBreak({ ...newBreak, name: e.target.value })} className="form-input text-xs w-32" />
                                            <input type="time" value={newBreak.startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBreak({ ...newBreak, startTime: e.target.value })} className="form-input text-xs w-28" />
                                            <input type="time" value={newBreak.endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewBreak({ ...newBreak, endTime: e.target.value })} className="form-input text-xs w-28" />
                                            <button onClick={() => { if (newBreak.name) { setLocalTimetableSettings((p: TimetableSettings) => ({ ...p, breaks: [...(p.breaks || []), { id: `b_${Date.now()}`, ...newBreak, status: 'active' }] })); setNewBreak({ name: '', startTime: '', endTime: '' }); } }} className="p-2 bg-indigo-600 text-white rounded-lg"><PlusIcon className="w-5 h-5" /></button>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {localTimetableSettings.breaks?.map((b: Break) => (
                                            <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
                                                <span className="font-bold text-sm uppercase tracking-tight">{b.name} <span className="text-slate-400 font-normal ml-2">({b.startTime} - {b.endTime})</span></span>
                                                <button onClick={() => setLocalTimetableSettings((p: TimetableSettings) => ({ ...p, breaks: (p.breaks || []).filter((x: Break) => x.id !== b.id) }))} className="text-red-500 font-black text-[10px] uppercase tracking-widest">Purge</button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                                    {/* Default Profile Selector */}
                                    <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30 mb-6">
                                        <div className="flex items-center gap-3 mb-4">
                                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                                            <div>
                                                <h4 className="text-sm font-black uppercase tracking-tight">Institutional Default</h4>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Baseline profile for all courses without an override.</p>
                                            </div>
                                        </div>
                                        <select 
                                            value={localTimetableSettings.defaultScheduleProfileId || ''} 
                                            onChange={(e) => setLocalTimetableSettings({ ...localTimetableSettings, defaultScheduleProfileId: e.target.value || undefined })}
                                            className="form-select"
                                        >
                                            <option value="">-- Use Specific Global Operating Hours --</option>
                                            {(props.currentInstitution?.scheduleProfiles || []).map(p => (
                                                <option key={p.id} value={p.id}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex justify-end pt-4">
                                        <button onClick={handleSaveTimetable} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-200">
                                            {selectedProfileId === 'default' ? 'Commit Global Defaults' : `Sync ${props.currentInstitution?.scheduleProfiles?.find((p: ScheduleProfile) => p.id === selectedProfileId)?.name || 'Profile'} Registry`}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {timetableSubTab === 'periods' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in">
                                <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4 mb-2">
                                    <div>
                                        <h3 className="text-xl font-bold">Standardized Period Slots</h3>
                                        <p className="text-sm text-slate-500">Define the granular lesson windows for the active profile.</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Label (e.g. Period 1)" value={newPeriod.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPeriod({ ...newPeriod, name: e.target.value })} className="form-input text-xs w-40" />
                                        <input type="time" value={newPeriod.startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPeriod({ ...newPeriod, startTime: e.target.value })} className="form-input text-xs w-28" />
                                        <input type="time" value={newPeriod.endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPeriod({ ...newPeriod, endTime: e.target.value })} className="form-input text-xs w-28" />
                                        <button onClick={() => { if (newPeriod.name) { setLocalTimetableSettings((p: TimetableSettings) => ({ ...p, periods: [...(p.periods || []), { id: `p_${Date.now()}`, ...newPeriod }] })); setNewPeriod({ name: '', startTime: '', endTime: '' }); } }} className="btn-primary h-10 px-4">Add Period</button>
                                    </div>
                                </div>
                                <div className="overflow-hidden border rounded-2xl">
                                    <table className="min-w-full divide-y divide-slate-100">
                                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                                            <tr>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Label</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Time</th>
                                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">End Time</th>
                                                <th className="px-6 py-4 text-right"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {(localTimetableSettings.periods || []).sort((a: TimetablePeriod, b: TimetablePeriod) => a.startTime.localeCompare(b.startTime)).map((p: TimetablePeriod) => (
                                                <tr key={p.id}>
                                                    <td className="px-6 py-4 text-sm font-bold">{p.name}</td>
                                                    <td className="px-6 py-4 font-mono text-xs">{p.startTime}</td>
                                                    <td className="px-6 py-4 font-mono text-xs">{p.endTime}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <button onClick={() => setLocalTimetableSettings((prev: TimetableSettings) => ({ ...prev, periods: (prev.periods || []).filter((x: TimetablePeriod) => x.id !== p.id) }))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><XIcon className="w-5 h-5" /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-end mt-4"><button onClick={handleSaveTimetable} className="btn-primary">Save Periods</button></div>
                            </div>
                        )}
                        {timetableSubTab === 'constraints' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-fade-in">
                                <div className="bg-slate-50 dark:bg-slate-900/40 p-8 rounded-3xl border border-slate-100 dark:border-slate-800">
                                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><ShieldIcon className="w-5 h-5 text-indigo-500" /> Subject Association Constraints</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Constraint Blueprint</label>
                                                <select
                                                    value={newConstraint.type}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewConstraint({ ...newConstraint, type: e.target.value as any })}
                                                    className="form-select w-full text-sm"
                                                >
                                                    {Object.entries(CONSTRAINT_TYPE_LABELS).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Target Subjects</label>
                                                <select
                                                    multiple
                                                    value={newConstraint.subjectIds}
                                                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewConstraint({ ...newConstraint, subjectIds: Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value) })}
                                                    className="form-input h-32 py-2 text-sm"
                                                >
                                                    {props.subjects.map((s: Subject) => (
                                                        <option key={s.id} value={s.id}>{s.code} - {s.name}</option>
                                                    ))}
                                                </select>
                                                <p className="text-[10px] text-slate-400 mt-1 italic">Ctrl + Click for bulk selection.</p>
                                            </div>
                                        </div>
                                        {newConstraint.type === 'subject_time_off' && (
                                            <div className="p-6 bg-white dark:bg-slate-800 rounded-2xl border-2 border-indigo-100 dark:border-indigo-900/40 animate-fade-in-up">
                                                <h5 className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-4">Restriction Parameters</h5>
                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Restricted Day</label>
                                                        <select
                                                            value={newConstraint.day}
                                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewConstraint({ ...newConstraint, day: e.target.value })}
                                                            className="form-select w-full text-xs"
                                                        >
                                                            {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).map(d => <option key={d}>{d}</option>)}
                                                        </select>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div><label className="block text-[10px] font-bold text-slate-400 mb-1">From</label><input type="time" value={newConstraint.startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewConstraint({ ...newConstraint, startTime: e.target.value })} className="form-input text-xs" /></div>
                                                        <div><label className="block text-[10px] font-bold text-slate-400 mb-1">Until</label><input type="time" value={newConstraint.endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewConstraint({ ...newConstraint, endTime: e.target.value })} className="form-input text-xs" /></div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="mt-8 flex justify-end"><button onClick={handleAddConstraint} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Append Constraint</button></div>
                                </div>
                                <div className="space-y-3">
                                    <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-1">Active AI Constraints</h5>
                                    {localTimetableSettings.constraints?.map((c: TimetableConstraint) => (
                                        <div key={c.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl hover:border-indigo-100 transition-all group">
                                            <div className="flex gap-4 items-start">
                                                <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-lg group-hover:bg-indigo-50 transition-colors">
                                                    <ShieldIcon className="w-4 h-4 text-slate-400 group-hover:text-indigo-600" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{c.description}</p>
                                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">{c.type.replace(/_/g, ' ')}</p>
                                                </div>
                                            </div>
                                            <button onClick={() => setLocalTimetableSettings((p: TimetableSettings) => ({ ...p, constraints: (p.constraints || []).filter((x: TimetableConstraint) => x.id !== c.id) }))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg"><XIcon className="w-5 h-5" /></button>
                                        </div>
                                    ))}
                                    {(!localTimetableSettings.constraints || localTimetableSettings.constraints.length === 0) && (
                                        <p className="text-center py-20 text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] border-2 border-dashed rounded-3xl">No Logical Constraints Defined</p>
                                    )}
                                </div>
                                <div className="flex justify-end mt-4"><button onClick={handleSaveTimetable} className="btn-primary">Save Rules & Constraints</button></div>
                            </div>
                        )}

                        {timetableSubTab === 'teacher_logic' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-fade-in">
                                <div className="border-b border-slate-100 dark:border-slate-700 pb-4">
                                    <h3 className="text-xl font-bold">Faculty Operational Logic</h3>
                                    <p className="text-sm text-slate-500">Define global or individual rules for how teachers are allocated (e.g. maximum consecutive periods).</p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Rule Blueprint</label>
                                            <select
                                                value={newTeacherRule.type}
                                                onChange={(e) => setNewTeacherRule({ ...newTeacherRule, type: e.target.value as TeacherRuleType })}
                                                className="form-select w-full text-sm"
                                            >
                                                {Object.entries(TEACHER_RULE_TYPE_LABELS).map(([val, label]) => (
                                                    <option key={val} value={val}>{label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Threshold Value</label>
                                            {newTeacherRule.type === 'preferred_start_time' || newTeacherRule.type === 'preferred_end_time' || newTeacherRule.type === 'no_lessons_after' ? (
                                                <input
                                                    type="time"
                                                    value={newTeacherRule.value}
                                                    onChange={(e) => setNewTeacherRule({ ...newTeacherRule, value: e.target.value })}
                                                    className="form-input"
                                                />
                                            ) : (
                                                <input
                                                    type="number"
                                                    value={newTeacherRule.value}
                                                    onChange={(e) => setNewTeacherRule({ ...newTeacherRule, value: Number(e.target.value) })}
                                                    className="form-input"
                                                    min="1"
                                                />
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Target Faculty (Optional)</label>
                                            <select
                                                value={newTeacherRule.lecturerId || ''}
                                                onChange={(e) => setNewTeacherRule({ ...newTeacherRule, lecturerId: e.target.value || undefined })}
                                                className="form-select w-full text-sm font-bold"
                                            >
                                                <option value="">Global (All Faculty)</option>
                                                {props.users.filter(u => u.role === 'lecturer' || u.role === 'teacher').map(u => (
                                                    <option key={u.id} value={u.id}>{u.name}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <button onClick={handleAddTeacherRule} className="btn-primary w-full h-12 shadow-indigo-100 flex items-center justify-center gap-2 mt-4">
                                            <PlusIcon className="w-5 h-5" /> Deploy Logic Rule
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Active Faculty Rules</label>
                                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                            {localTimetableSettings.teacherRules?.map(rule => (
                                                <div key={rule.id} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl flex justify-between items-start border border-slate-100 dark:border-slate-800 group hover:border-amber-200 transition-all shadow-sm">
                                                    <div>
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Governance Rule</span>
                                                        </div>
                                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-relaxed">{rule.description}</p>
                                                    </div>
                                                    <button onClick={() => setLocalTimetableSettings((prev) => ({ ...prev, teacherRules: (prev.teacherRules || []).filter(x => x.id !== rule.id) }))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-red-50 rounded-lg"><XIcon className="w-4 h-4" /></button>
                                                </div>
                                            ))}
                                            {(!localTimetableSettings.teacherRules || localTimetableSettings.teacherRules.length === 0) && (
                                                <div className="text-center py-12 border-2 border-dashed border-slate-100 rounded-[2rem]">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">Default AI heuristic active (No overrides)</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end pt-4 border-t mt-6"><button onClick={handleSaveTimetable} className="btn-primary px-8">Synchronize Teacher Logic</button></div>
                            </div>
                        )}
                        {timetableSubTab === 'exams' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-lg font-bold mb-6">Assessment Windows</h3>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Session Name</label><input type="text" placeholder="e.g. Mid Morning" value={newExamSession.name} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExamSession({ ...newExamSession, name: e.target.value })} className="form-input text-sm" /></div>
                                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Start</label><input type="time" value={newExamSession.startTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExamSession({ ...newExamSession, startTime: e.target.value })} className="form-input text-sm" /></div>
                                            <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">End</label><input type="time" value={newExamSession.endTime} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewExamSession({ ...newExamSession, endTime: e.target.value })} className="form-input text-sm" /></div>
                                            <button onClick={handleAddExamSession} className="btn-primary h-[42px] flex items-center justify-center gap-2"><PlusIcon className="w-5 h-5" /> Add Window</button>
                                        </div>
                                        <div className="space-y-2">
                                            {localExamSettings.sessionsPerDay?.map(s => (
                                                <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl">
                                                    <span className="font-bold text-sm uppercase tracking-tight">{s.name} <span className="text-slate-400 font-normal ml-2">({s.startTime} - {s.endTime})</span></span>
                                                    <button onClick={() => handleDeleteExamSession(s.id)} className="text-red-500 font-black text-[10px] uppercase tracking-widest">Purge</button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                                    <h3 className="text-lg font-bold mb-4">Assessment Logic & Rules</h3>
                                    <textarea rows={8} value={localExamSettings.rules?.join('\n')} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setLocalExamSettings({ ...localExamSettings, rules: e.target.value.split('\n') })} className="form-input w-full font-mono text-xs leading-loose" placeholder="One rule per line (e.g. No student should sit for more than two exams a day)"></textarea>
                                    <p className="mt-3 text-[10px] text-slate-400 italic">These natural language rules guide the AI during exam schedule generation.</p>
                                </div>
                                <div className="flex justify-end pt-4"><button onClick={handleSaveExams} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Persist Exam Settings</button></div>
                            </div>
                        )}
                    </div>
                )
            }

            {
                activeTab === 'facilities' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                            <nav className="-mb-px flex space-x-6">
                                {!isDS && (
                                    <button
                                        onClick={() => setFacilitiesSubTab('departments')}
                                        className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${facilitiesSubTab === 'departments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <RectangleStackIcon className="w-4 h-4" /> Departments
                                    </button>
                                )}
                                <button
                                    onClick={() => setFacilitiesSubTab('buildings')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${facilitiesSubTab === 'buildings' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <BuildingOfficeIcon className="w-4 h-4" /> {isSchool ? 'Blocks' : 'Buildings'}
                                </button>
                                <button
                                    onClick={() => setFacilitiesSubTab('rooms')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${facilitiesSubTab === 'rooms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <MapPinIcon className="w-4 h-4" /> Rooms
                                </button>
                                {!isSchool && !isDS && (
                                    <button
                                        onClick={() => setFacilitiesSubTab('levels')}
                                        className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${facilitiesSubTab === 'levels' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <AcademicCapIcon className="w-4 h-4" /> Academic Levels
                                    </button>
                                )}
                                {isSchool && (
                                    <button
                                        onClick={() => setFacilitiesSubTab('streams')}
                                        className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${facilitiesSubTab === 'streams' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                    >
                                        <RectangleStackIcon className="w-4 h-4" /> Stream Registry
                                    </button>
                                )}
                            </nav>
                        </div>

                        <div className="mt-6">
                            {facilitiesSubTab === 'departments' && (
                                <DepartmentManager
                                    departments={props.departments}
                                    onAddDepartment={props.onAddDepartment}
                                    onUpdateDepartment={props.onUpdateDepartment}
                                    onDeleteDepartment={props.onDeleteDepartment}
                                    onImportDepartments={props.onImportDepartments}
                                />
                            )}

                            {facilitiesSubTab === 'buildings' && (
                                <BuildingManager
                                    activeView="buildings"
                                    buildings={Array.isArray(props.buildings) ? props.buildings : []}
                                    rooms={Array.isArray(props.rooms) ? props.rooms : []}
                                    subjects={props.subjects}
                                    courses={props.courses}
                                    onAddBuilding={props.onAddBuilding!}
                                    onUpdateBuilding={props.onUpdateBuilding!}
                                    onDeleteBuilding={props.onDeleteBuilding!}
                                    onAddRoom={props.onAddRoom!}
                                    onUpdateRoom={props.onUpdateRoom!}
                                    onDeleteRoom={props.onDeleteRoom!}
                                    onImportRooms={props.onImportRooms!}
                                    currentInstitution={props.currentInstitution as Institution}
                                />
                            )}

                            {facilitiesSubTab === 'rooms' && (
                                <BuildingManager
                                    activeView="rooms"
                                    buildings={Array.isArray(props.buildings) ? props.buildings : []}
                                    rooms={Array.isArray(props.rooms) ? props.rooms : []}
                                    subjects={props.subjects}
                                    courses={props.courses}
                                    onAddBuilding={props.onAddBuilding!}
                                    onUpdateBuilding={props.onUpdateBuilding!}
                                    onDeleteBuilding={props.onDeleteBuilding!}
                                    onAddRoom={props.onAddRoom!}
                                    onUpdateRoom={props.onUpdateRoom!}
                                    onDeleteRoom={props.onDeleteRoom!}
                                    onImportRooms={props.onImportRooms!}
                                    currentInstitution={props.currentInstitution as Institution}
                                />
                            )}

                            {facilitiesSubTab === 'levels' && !isSchool && !isDS && (
                                <AcademicLevelManager onAdd={props.onAddAcademicLevel} onUpdate={props.onUpdateAcademicLevel} onDelete={props.onDeleteAcademicLevel} academicLevels={props.academicLevels || []} currentInstitution={props.currentInstitution} />
                            )}

                            {facilitiesSubTab === 'streams' && isSchool && (
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="text-xl font-bold uppercase tracking-tight">Stream Registry</h3>
                                            <p className="text-sm text-slate-500">Define the global list of streams (e.g., East, West, North) for your institution.</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                const name = prompt("Enter new stream name (e.g., North, Stream A):");
                                                if (name && props.currentInstitution && props.onUpdateInstitution) {
                                                    const current = props.currentInstitution.streamDefinitions || [];
                                                    if (current.includes(name)) return alert("Stream already exists.");
                                                    props.onUpdateInstitution(props.currentInstitution.id, { streamDefinitions: [...current, name] });
                                                }
                                            }}
                                            className="btn-primary flex items-center gap-2"
                                        >
                                            <PlusIcon className="w-5 h-5" /> Define Stream
                                        </button>
                                    </div>


                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                        {(props.currentInstitution?.streamDefinitions || []).map((stream, idx) => (
                                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group">
                                                <span className="font-bold text-sm uppercase tracking-tight">{stream}</span>
                                                <button
                                                    onClick={() => {
                                                        if (confirm(`Remove "${stream}" from registry? This will NOT automatically delete existing levels, but they will be flagged as stale.`)) {
                                                            const filtered = (props.currentInstitution!.streamDefinitions || []).filter(s => s !== stream);
                                                            props.onUpdateInstitution?.(props.currentInstitution!.id, { streamDefinitions: filtered });
                                                        }
                                                    }}
                                                    className="p-2 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                        {(props.currentInstitution?.streamDefinitions || []).length === 0 && (
                                            <div className="col-span-full py-12 text-center text-slate-400">
                                                <RectangleStackIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                                <p className="text-sm">No streams defined yet. Start by defining your school's streams.</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                                        <div className="bg-amber-50 dark:bg-amber-900/20 p-6 rounded-3xl border border-amber-100 dark:border-amber-800/30">
                                            <div className="flex items-start gap-4">
                                                <div className="p-3 bg-amber-100 dark:bg-amber-900 rounded-2xl text-amber-600">
                                                    <ExclamationTriangleIcon className="w-6 h-6" />
                                                </div>
                                                <div className="flex-1">
                                                    <h4 className="text-sm font-black uppercase tracking-tight text-amber-800 dark:text-amber-200">Database Integrity Audit</h4>
                                                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400 mt-1">
                                                        Detect and eliminate "ghost" streams (e.g., classes assigned to streams no longer in the registry). This resolves room utilization discrepancies.
                                                    </p>
                                                    <button
                                                        onClick={() => {
                                                            const streams = props.currentInstitution?.streamDefinitions || [];
                                                            const coursesToUpdate: { id: string, levels: any[] }[] = [];
                                                            let ghostCount = 0;

                                                            props.courses.forEach(course => {
                                                                const validLevels = (course.levels || []).filter(level => {
                                                                    // A level is valid if its name contains one of the allowed streams
                                                                    // or if it's not a school institution (where streams are less strict)
                                                                    const isGhost = streams.length > 0 && !streams.some(s => level.name.includes(s));
                                                                    if (isGhost) {
                                                                        ghostCount++;
                                                                        return false;
                                                                    }
                                                                    return true;
                                                                });

                                                                if (validLevels.length !== (course.levels || []).length) {
                                                                    coursesToUpdate.push({ id: course.id, levels: validLevels });
                                                                }
                                                            });

                                                            if (ghostCount === 0) {
                                                                alert("Registry Audit Complete: No ghost data detected. Your database is 100% synchronized.");
                                                            } else if (confirm(`Audit found ${ghostCount} ghost class(es) (e.g., Grade 1 West) not in the current registry. Purge them now?`)) {
                                                                coursesToUpdate.forEach(c => {
                                                                    props.onUpdateCourse?.(c.id, { levels: c.levels });
                                                                });
                                                                alert(`Successfully purged ${ghostCount} ghost records. Room utilization reports are now synchronized.`);
                                                            }
                                                        }}
                                                        className="mt-4 px-6 py-2 bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-amber-700 transition-all shadow-lg active:scale-95"
                                                    >
                                                        Run Integrity Sync
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {
                activeTab === 'staff' && (
                    <UserManager
                        {...props}
                        logoUrl={props.logoUrl || null}
                        footerImageUrl={props.footerImageUrl || null}
                        isDS={isDS}
                        user={props.currentUser}
                        showOnly="staff"
                        currentInstitution={props.currentInstitution}
                        smsConfig={props.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' }}
                        onWithdrawRequest={props.onWithdrawRequest || (async () => { })}
                        onDeleteUser={props.onDeleteUser || (async () => { })}
                        onEditUser={props.onEditUser || (async (id, data) => { })}
                        letterheadConfig={props.letterheadConfig || props.companyDetails?.letterheadConfig || {
                            headerImageUrl: props.currentInstitution?.logoUrl || null,
                            stampImageUrl: null
                        }}
                        onAccessAlumnaPortal={() => { }}
                    />
                )
            }

            {
                activeTab === 'subjects' && (
                    <SubjectManager
                        {...props}
                        subjects={props.subjects || []}
                        departments={props.departments || []}
                        rooms={props.rooms || []}
                        courses={props.courses || []}
                        onAddSubject={props.onAddSubject}
                        onUpdateSubject={props.onUpdateSubject}
                        onDeleteSubject={props.onDeleteSubject}
                        onEditSubject={props.onEditSubject}
                        onImportSubjectsAndAssociate={props.onImportSubjectsAndAssociate}
                        onSaveTimetableSettings={props.onSaveTimetableSettings!}
                        letterheadConfig={props.letterheadConfig || props.companyDetails?.letterheadConfig || {
                            headerImageUrl: props.currentInstitution?.logoUrl || null,
                            stampImageUrl: null
                        }}
                        logoUrl={props.logoUrl || null}
                        footerImageUrl={props.footerImageUrl || null}
                        buildings={props.buildings || []}
                        currentUser={props.currentUser}
                    />
                )
            }

            {
                activeTab === 'courses' && (
                    <CourseManager
                        {...props}
                        logoUrl={props.logoUrl || null}
                        footerImageUrl={props.footerImageUrl || null}
                        academicLevels={props.academicLevels || []}
                        courses={props.courses || []}
                        onAddCourse={props.onAddCourse}
                        onImportCourses={props.onImportCourses}
                        onUpdateCourse={props.onUpdateCourse}
                        onDeleteCourse={props.onDeleteCourse}
                        onAssociateSubjectToCourseLevel={props.onAssociateSubjectToCourseLevel}
                        onDisassociateSubjectFromCourseLevel={props.onDisassociateSubjectFromCourseLevel}
                        allocations={props.allocations || []}
                        currentUser={props.currentUser}
                    />
                )
            }

            <StampCustomizerModal
                isOpen={isStampModalOpen}
                onClose={() => setIsStampModalOpen(false)}
                currentInstitution={props.currentInstitution ?? null}
                letterheadConfig={props.letterheadConfig}
                onSaveConfig={(updatedConfig) => {
                    props.onSaveLetterheadConfig?.(updatedConfig);
                }}
            />

            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.625rem 1.5rem; border-radius: 0.75rem; cursor: pointer; transition: all 0.2s; border: none; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2); }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
                .btn-secondary { background-color: #f1f5f9; color: #475569; font-weight: 600; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
            `}</style>
        </div >
    );
};

