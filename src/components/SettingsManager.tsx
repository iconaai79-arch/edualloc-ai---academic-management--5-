
import React, { useState, useMemo, useEffect } from 'react';
import type {
    User, Department, Subject, Building, Room, AllocationRequest,
    TimetableEntry, SmsConfig, EmailConfig, LetterheadConfig,
    TimetableSettings, Course, AcademicYear, Semester, Institution,
    ExamTimetableSettings, BiometricConfig, VoteHead, FeeStructure, FinancialPeriod,
    MpesaTransaction, InvoiceItem, TransactionStatus, ExtensionRequest,
    CompanyDetails, MpesaConfig, SubscriptionConfig, ScheduleProfile,
    TimetableConstraint, TimetableConstraintType, Break, TimetablePeriod, AcademicLevel,
    TeacherLogicRule, TeacherRuleType, Invoice, Receipt, NcbaConfig, FtpConfig, GoogleDriveConfig
} from '../types';
import { RETAIL_SUBTYPES } from '../constants';
import { AcademicYearManager } from './AcademicYearManager';
import { LocationSettings } from './LocationSettings';
import { BrandedPaper } from './BrandedPaper';
import { GradingSystemManager } from './GradingSystemManager';
import { SubscriptionManager } from './SubscriptionManager';
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

interface SettingsManagerProps {
    currentUser: User;
    departments: Department[];
    subjects: Subject[];
    buildings: Building[];
    rooms: Room[];
    courses: Course[];
    academicLevels: AcademicLevel[];
    timetableSettings: TimetableSettings;
    examTimetableSettings: ExamTimetableSettings;
    logoUrl: string | null;
    footerImageUrl: string | null;
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

    const [activeTab, setActiveTab] = useState<SettingsTab>((isSuperAdmin && !isCoop) ? 'global_config' : 'general');
    const [timetableSubTab, setTimetableSubTab] = useState<'hours' | 'periods' | 'constraints' | 'exams' | 'teacher_logic'>('hours');
    const [generalSubTab, setGeneralSubTab] = useState<'profile' | 'academic_settings' | 'security_policy' | 'location' | 'branding' | 'grading' | 'billing' | 'integrations' | 'sms' | 'email' | 'farmer_billing'>('profile');
    const [globalSubTab, setGlobalSubTab] = useState<'profile' | 'infrastructure' | 'branding' | 'sms' | 'email' | 'billing' | 'integrations' | 'showcase' | 'storage' | 'googledrive'>('profile');
    const [billingSubTab, setBillingSubTab] = useState<'mpesa' | 'gateways' | 'ncba'>('mpesa');
    const [instIntegrationTab, setInstIntegrationTab] = useState<'mpesa' | 'ncba' | 'googledrive'>('mpesa');
    const [facilitiesSubTab, setFacilitiesSubTab] = useState<'departments' | 'buildings' | 'rooms' | 'levels' | 'streams'>('departments');
    const [showPaperPreview, setShowPaperPreview] = useState(false);



    // External tab navigation sync
    useEffect(() => {
        if (props.initialTab) {
            setActiveTab(props.initialTab as SettingsTab);
        }
    }, [props.initialTab]);

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

    // --- Institution Profile State ---
    const [instProfile, setInstProfile] = useState({
        email: props.currentInstitution?.email || '',
        phoneNumber: props.currentInstitution?.phoneNumber || '',
        useAllocationRequests: props.currentInstitution?.useAllocationRequests ?? true,
        aiModelTier: props.currentInstitution?.aiModelTier || 'premium',
        isOtpEnabled: props.currentInstitution?.isOtpEnabled ?? false,
        parentAbsenceNotificationsEnabled: props.currentInstitution?.parentAbsenceNotificationsEnabled ?? false,
        farmerSmsBillingEnabled: props.currentInstitution?.farmerSmsBillingEnabled ?? false,
        slug: props.currentInstitution?.slug || ''
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
            setInstProfile({
                email: props.currentInstitution.email || '',
                phoneNumber: props.currentInstitution.phoneNumber || '',
                useAllocationRequests: props.currentInstitution.useAllocationRequests ?? true,
                aiModelTier: props.currentInstitution.aiModelTier || 'premium',
                isOtpEnabled: props.currentInstitution.isOtpEnabled ?? false,
                parentAbsenceNotificationsEnabled: props.currentInstitution.parentAbsenceNotificationsEnabled ?? false,
                farmerSmsBillingEnabled: props.currentInstitution.farmerSmsBillingEnabled ?? false,
                slug: props.currentInstitution.slug || ''
            });
        }
    }, [props.currentInstitution]);

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

    const [isTestingStk, setIsTestingStk] = useState(false);
    const [isTestingNcba, setIsTestingNcba] = useState(false);
    const [isTestingFtp, setIsTestingFtp] = useState(false);

    useEffect(() => {
        setLocalInstSmsConfig(props.currentInstitution?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });

        setLocalInstMpesaConfig(props.currentInstitution?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
        setLocalInstNcbaConfig(props.currentInstitution?.ncbaConfig || { clientId: '', clientSecret: '', username: '', password: '', baseUrl: 'https://sandbox.ncbagroup.com', environment: 'sandbox' });
        
        // Sync instProfile
        setInstProfile({
            email: props.currentInstitution?.email || '',
            phoneNumber: props.currentInstitution?.phoneNumber || '',
            useAllocationRequests: props.currentInstitution?.useAllocationRequests ?? true,
            aiModelTier: props.currentInstitution?.aiModelTier || 'premium',
            isOtpEnabled: props.currentInstitution?.isOtpEnabled ?? false,
            parentAbsenceNotificationsEnabled: props.currentInstitution?.parentAbsenceNotificationsEnabled ?? false,
            farmerSmsBillingEnabled: props.currentInstitution?.farmerSmsBillingEnabled ?? false,
            slug: props.currentInstitution?.slug || '',
            googleDriveConfig: props.currentInstitution?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false }
        });
        setLocalInstGoogleDriveConfig(props.currentInstitution?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false });
    }, [props.currentInstitution]);
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
            await props.onUpdateInstitution?.(props.currentInstitution.id, instProfile);
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
        address: props.companyDetails?.address || '',
        logoUrl: props.companyDetails?.logoUrl || '',
        footerImageUrl: props.companyDetails?.footerImageUrl || '',
        letterheadConfig: props.companyDetails?.letterheadConfig || { headerImageUrl: null, stampImageUrl: null },
        welcomeMessage: props.companyDetails?.chatAssistantConfig?.welcomeMessage || '',
        chatEnabled: props.companyDetails?.chatAssistantConfig?.enabled ?? true,
        enforceGlobalOtp: props.currentInstitution?.institutionType === 'Business' ? props.companyDetails?.enforceGlobalOtp ?? false : props.companyDetails?.enforceGlobalOtp ?? false,
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
    const [localSubConfig, setLocalSubConfig] = useState<SubscriptionConfig>(props.companyDetails?.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });
    const [localFtpConfig, setLocalFtpConfig] = useState<FtpConfig>(props.companyDetails?.ftpConfig || { host: '', port: 21, user: '', password: '', remoteRoot: '/', publicUrlRoot: '' });
    const [localGoogleDriveConfig, setLocalGoogleDriveConfig] = useState<GoogleDriveConfig>(props.companyDetails?.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false });

    const [isSavingConfigs, setIsSavingConfigs] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

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
                address: props.companyDetails.address || '',
                logoUrl: props.companyDetails.logoUrl || '',
                footerImageUrl: props.companyDetails.footerImageUrl || '',
                letterheadConfig: props.companyDetails.letterheadConfig || { headerImageUrl: null, stampImageUrl: null },
                welcomeMessage: props.companyDetails.chatAssistantConfig?.welcomeMessage || '',
                chatEnabled: props.companyDetails.chatAssistantConfig?.enabled ?? true,
                enforceGlobalOtp: props.companyDetails.enforceGlobalOtp ?? false,
                enabledGateways: props.companyDetails.enabledGateways || ['mpesa'],
                showcaseConfig: props.companyDetails.showcaseConfig || { enabled: true, showLoginLink: true },
                alumnaeJoiningFee: props.companyDetails.alumnaeJoiningFee || 0
            });
            setLocalSmsConfig(props.companyDetails.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
            setLocalEmailConfig(props.companyDetails.emailConfig || { provider: 'smtp', host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
            setLocalMpesaConfig(props.companyDetails.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
            setLocalNcbaConfig(props.companyDetails.ncbaConfig || { clientId: '', clientSecret: '', username: '', password: '', baseUrl: 'https://c2bapis.ncbagroup.com', environment: 'production' });
            setLocalSubConfig(props.companyDetails.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });
            setLocalFtpConfig(props.companyDetails.ftpConfig || { host: '', port: 21, user: '', password: '', remoteRoot: '/', publicUrlRoot: '' });
            setLocalGoogleDriveConfig(props.companyDetails.googleDriveConfig || { clientId: '', clientSecret: '', refreshToken: '', isActive: false });
        }
    }, [props.companyDetails]);



    const handleSaveGlobalConfigs = async () => {
        if (!props.onUpdateCompanyDetails || !props.companyDetails) return;
        setIsSavingConfigs(true);
        try {
            // Sanitize NCBA Credentials before saving to prevent invisible character 401s
            const sanitizedNcba = {
                ...localNcbaConfig,
                clientId: (localNcbaConfig.clientId || '').replace(/[^\x20-\x7E]/g, '').trim(),
                clientSecret: (localNcbaConfig.clientSecret || '').replace(/[^\x20-\x7E]/g, '').trim(),
                username: (localNcbaConfig.username || '').replace(/[^\x20-\x7E]/g, '').trim(),
                password: (localNcbaConfig.password || '').replace(/[^\x20-\x7E]/g, '').trim()
            };

            await props.onUpdateCompanyDetails({
                ...props.companyDetails,
                ...localCompanyInfo,
                smsConfig: localSmsConfig,
                emailConfig: localEmailConfig,
                mpesaConfig: localMpesaConfig,
                ncbaConfig: sanitizedNcba,
                subscriptionConfig: localSubConfig,
                ftpConfig: localFtpConfig,
                googleDriveConfig: localGoogleDriveConfig,
                enforceGlobalOtp: localCompanyInfo.enforceGlobalOtp,
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

        if (isSuperAdmin && !isCoop && !props.isAcademicsOfficer) {
            tabs.push({ id: 'global_config', label: 'Global Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> });
        } else {
            tabs.push({ id: 'general', label: 'General', icon: <InformationCircleIcon className="w-5 h-5 mr-2" /> });
            if (!isRetailAgency && isEdu && !isCoop) {
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
            if (isCoop || isAutoSales) {
                tabs.push({ id: 'staff', label: isAutoSales ? 'Manage Users' : 'Staff & Roles', icon: <UserGroupIcon className="w-5 h-5 mr-2" /> });
            }
        }

        return tabs;
    }, [props.currentUser.role, isSchool, isEdu, isSuperAdmin, isRetailAgency, isCoop, isAutoSales, isChurch]);

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
                                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Alumnae Joining Fee (KES)</label>
                                                <div className="relative">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <CurrencyIcon className="w-4 h-4 text-slate-400" />
                                                    </div>
                                                    <input 
                                                        type="number" 
                                                        value={(localCompanyInfo as any).alumnaeJoiningFee} 
                                                        onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, alumnaeJoiningFee: Number(e.target.value) } as any)}
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
                                        <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Password</label><input type="password" value={localEmailConfig.password || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalEmailConfig({ ...localEmailConfig, password: e.target.value })} className="form-input" /></div>
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

                                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl shadow-inner">
                                        <button
                                            onClick={() => setBillingSubTab('mpesa')}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingSubTab === 'mpesa' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            M-Pesa
                                        </button>

                                        <button
                                            onClick={() => setBillingSubTab('ncba')}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingSubTab === 'ncba' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            NCBA Bank
                                        </button>

                                        <button
                                            onClick={() => setBillingSubTab('gateways')}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingSubTab === 'gateways' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
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
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Client ID</label><input type="text" value={localNcbaConfig.clientId} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, clientId: e.target.value })} className="form-input" placeholder="10 characters" /></div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Client Secret</label><input type="password" value={localNcbaConfig.clientSecret} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, clientSecret: e.target.value })} className="form-input" placeholder="32 characters" /></div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">API Username</label><input type="text" value={localNcbaConfig.username || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, username: e.target.value })} className="form-input" /></div>
                                            <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">API Password</label><input type="password" value={localNcbaConfig.password || ''} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalNcbaConfig({ ...localNcbaConfig, password: e.target.value })} className="form-input" /></div>
                                        </div>
                                        <div className="space-y-6 pt-10">
                                            <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[2rem] border border-blue-100 dark:border-blue-800">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <InformationCircleIcon className="w-5 h-5 text-blue-500" />
                                                    <span className="text-[10px] font-black uppercase text-blue-600">Bank Integration Policy</span>
                                                </div>
                                                <p className="text-xs text-blue-700/70 leading-relaxed">NCBA Bank integration utilizes OAuth2 authentication. Ensure the Client ID and Secret match your registered application in the NCBA Developer Portal.</p>
                                            </div>
                                            <button onClick={handleSaveGlobalConfigs} className="btn-primary w-full h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save NCBA Configuration</button>
                                            
                                            <button 
                                                onClick={async () => {
                                                    setIsTestingNcba(true);
                                                    try {
                                                        const res = await apiService.testNcbaAuth(localNcbaConfig);
                                                        if (res.success) {
                                                            alert(`Integration Success: ${res.message || 'Authentication successful'}`);
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
                                                className="w-full h-12 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                            >
                                                {isTestingNcba ? 'Verifying...' : 'Test Global Connection'}
                                            </button>
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
                                                { id: 'ncba', name: 'NCBA Bank', icon: NcbaIcon, color: 'text-blue-600', bg: 'bg-blue-50' }
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
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* General Tab */}
            {
                activeTab === 'general' && (
                    <div className="space-y-8 animate-fade-in-up">
                        <div className="flex border-b border-slate-200 dark:border-slate-700 overflow-x-auto no-scrollbar">
                            {(() => {
                                if (isRetailAgency) return ['profile', 'location', 'branding'];
                                if (isCoop || !isEdu) {
                                    const filtered = ['profile', 'location', 'branding'];
                                    if (props.currentUser.role === 'admin' || isCoop) {
                                        filtered.push('billing');
                                        filtered.push('integrations');
                                        filtered.push('sms');
                                        if (isCoop) filtered.push('farmer_billing');
    
                                    }
                                    return filtered;
                                }
                                const subs = ['profile', 'grading', 'security_policy', 'location', 'branding'];
                                 if (props.currentUser.role === 'admin') { 
                                    subs.push('billing'); 
                                    subs.push('integrations');
                                    subs.push('sms'); 
                                }
                                return subs;
                            })().map((sub: string) => (
                                <button key={sub} onClick={() => setGeneralSubTab(sub as any)} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${generalSubTab === sub ? 'border-indigo-600 text-indigo-600 font-black' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
                                    {sub === 'profile' && <InformationCircleIcon className="w-4 h-4" />}
                                    {sub === 'academic_settings' && <ChartBarIcon className="w-4 h-4 text-amber-500" />}
                                    {sub === 'grading' && <AcademicCapIcon className="w-4 h-4 text-indigo-500" />}
                                    {sub === 'security_policy' && <ShieldIcon className="w-4 h-4 text-rose-500" />}
                                    {sub === 'location' && <MapPinIcon className="w-4 h-4 text-emerald-500" />}
                                    {sub === 'branding' && <SparklesIcon className="w-4 h-4 text-purple-500" />}
                                    {sub === 'billing' && <CreditCardIcon className="w-4 h-4 text-blue-500" />}
                                    {sub === 'integrations' && <ArrowsRightLeftIcon className="w-4 h-4 text-slate-500" />}
                                    {sub === 'sms' && <PaperAirplaneIcon className="w-4 h-4 text-sky-500" />}

                                    {sub === 'grading' ? 'Grade Map' : sub === 'integrations' ? 'Billing Map' : sub.replace('_', ' ')}
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
                                        <div className="space-y-4">
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
                                        </div>
                                        
                                        <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex flex-col justify-between">
                                            <div>
                                                <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-2">
                                                    {props.currentInstitution?.institutionType === 'Hospitality' ? 'Public Booking Portal' : isCampaign ? 'Join Campaign Link' : 'Public Storefront Link'}
                                                </p>
                                                <p className="text-xs font-mono font-bold text-slate-600 dark:text-slate-400 truncate">
                                                    {window.location.origin}/?shop={instProfile.slug || props.currentInstitution?.id}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 mt-4">
                                                <button 
                                                    type="button"
                                                    onClick={() => {
                                                        const url = `${window.location.origin}/?shop=${instProfile.slug || props.currentInstitution?.id}`;
                                                        navigator.clipboard.writeText(url);
                                                        alert(isCampaign ? 'Campaign link copied to clipboard!' : 'Storefront link copied to clipboard!');
                                                    }}
                                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors shadow-sm"
                                                >
                                                    Copy Link
                                                </button>
                                                <button 
                                                    type="button"
                                                    onClick={() => window.open(`/?shop=${instProfile.slug || props.currentInstitution?.id}`, '_blank')}
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
                        {generalSubTab === 'branding' && ( /* ... branding UI ... */ <div className="space-y-6"><div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700"><div className="flex justify-between items-center mb-8"><h4 className="font-bold text-lg flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-indigo-500" /> Visual Brand Identity</h4><button onClick={() => setShowPaperPreview(!showPaperPreview)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-1"><EyeIcon className="w-4 h-4" /> {showPaperPreview ? 'Hide Paper' : 'Preview Documents'}</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-10"><div className="space-y-6"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Accent Theme Color</label><div className="flex gap-4 items-center"><input type="color" value={props.themeColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onUpdateThemeColor && props.onUpdateThemeColor(e.target.value)} className="h-12 w-24 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer" /><span className="font-mono text-sm font-bold text-slate-500 uppercase">{props.themeColor}</span></div></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Corporate Seal / Logo</label><div className="flex items-center gap-6"><div className="h-20 w-20 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">{props.logoUrl ? <img loading="lazy" src={props.logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <BuildingOfficeIcon className="w-8 h-8 text-slate-200" />}</div><label className="btn-secondary text-[10px] h-10 px-4 flex items-center justify-center cursor-pointer">Update Emblem<input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'logo')} /></label></div></div></div><div className="space-y-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Document Header (LPO/Receipts)</label><label className="btn-secondary h-24 w-full flex flex-col items-center justify-center gap-2 cursor-pointer border-dashed"><ArrowUpTrayIcon className="w-6 h-6 text-slate-300" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Header Banner</span><input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'letterhead')} /></label></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Official Report Footer</label><label className="btn-secondary h-16 w-full flex items-center justify-center gap-2 cursor-pointer border-dashed"><ArrowUpTrayIcon className="w-4 h-4 text-slate-300" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Footer Strip</span><input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'footer')} /></label></div></div></div></div>{showPaperPreview && (<div className="mt-12 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-6 bg-slate-50 animate-scale-in origin-top"><BrandedPaper institution={props.currentInstitution} letterheadConfig={props.letterheadConfig} footerImageUrl={props.footerImageUrl}><div className="h-96 flex flex-col items-center justify-center opacity-10 py-32"><ClipboardListIcon className="w-24 h-24 text-slate-900 mb-6" /><p className="text-2xl font-black text-slate-900 uppercase tracking-[0.2em]">Live Document Preview</p></div></BrandedPaper></div>)}</div>)}
                        {generalSubTab === 'grading' && <div className="animate-fade-in"><GradingSystemManager currentInstitution={props.currentInstitution} onUpdateInstitution={props.onUpdateInstitution} /></div>}
                        {generalSubTab === 'billing' && props.currentUser.role === 'admin' && (
                            <div className="animate-fade-in">
                                <SubscriptionManager
                                    institution={props.currentInstitution as Institution}
                                    companyDetails={props.companyDetails as CompanyDetails}
                                    transactions={props.transactions || []}
                                    onAddTransaction={props.onAddTransaction || (async () => 'failed')}
                                    invoices={props.invoices || []}
                                    receipts={props.receipts || []}
                                    logoUrl={props.logoUrl}
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
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">Configuring NCBA Gateway for this Institution</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem]">
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
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Base URL</label>
                                                    <input type="text" value={localInstNcbaConfig.baseUrl} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, baseUrl: e.target.value })} className="form-input font-mono text-xs" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Client ID</label>
                                                    <input type="text" value={localInstNcbaConfig.clientId} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientId: e.target.value })} className="form-input" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Client Secret</label>
                                                    <input type="password" value={localInstNcbaConfig.clientSecret} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, clientSecret: e.target.value })} className="form-input" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">API Username</label>
                                                    <input type="text" value={localInstNcbaConfig.username || ''} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, username: e.target.value })} className="form-input" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">API Password</label>
                                                    <input type="password" value={localInstNcbaConfig.password || ''} onChange={(e) => setLocalInstNcbaConfig({ ...localInstNcbaConfig, password: e.target.value })} className="form-input" />
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 mt-6">
                                                <button 
                                                    onClick={async () => {
                                                        setIsTestingNcba(true);
                                                        try {
                                                            const res = await apiService.testNcbaAuth(localInstNcbaConfig);
                                                            if (res.success) {
                                                                alert(`Integration Success: ${res.message || 'Authentication successful'}`);
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
                                                    className="h-12 px-6 border-2 border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                                                >
                                                    {isTestingNcba ? 'Verifying...' : 'Test NCBA Integration'}
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
                                <button
                                    onClick={() => setFacilitiesSubTab('departments')}
                                    className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${facilitiesSubTab === 'departments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                                >
                                    <RectangleStackIcon className="w-4 h-4" /> Departments
                                </button>
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
                                {!isSchool && (
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

                            {facilitiesSubTab === 'levels' && !isSchool && (
                                <AcademicLevelManager onAdd={props.onAddAcademicLevel} onUpdate={props.onUpdateAcademicLevel} onDelete={props.onDeleteAcademicLevel} academicLevels={props.academicLevels} currentInstitution={props.currentInstitution} />
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
}

