
import React, { useState, useMemo, useEffect } from 'react';
import type {
    User, Department, Subject, Building, Room, AllocationRequest,
    TimetableEntry, SmsConfig, EmailConfig, LetterheadConfig,
    TimetableSettings, Course, AcademicYear, Semester, Institution,
    ExamTimetableSettings, BiometricConfig, VoteHead, FeeStructure, FinancialPeriod,
    MpesaTransaction, InvoiceItem, TransactionStatus, ExtensionRequest,
    CompanyDetails, MpesaConfig, SubscriptionConfig, ScheduleProfile,
    TimetableConstraint, TimetableConstraintType, Break, TimetablePeriod, AcademicLevel,
    TeacherLogicRule, TeacherRuleType, Invoice, Receipt
} from '../types';
import { RETAIL_SUBTYPES } from '../constants';
import { AcademicYearManager } from './AcademicYearManager';
import { LocationSettings } from './LocationSettings';
import { BrandedPaper } from './BrandedPaper';
import { GradingSystemManager } from './GradingSystemManager';
import { SubscriptionManager } from './SubscriptionManager';
import { supabase } from '../lib/supabase';
import { apiService } from '../services/apiService';
import {
    PrinterIcon,
    MapPinIcon,
    ArrowTrendingUpIcon,
    CalendarDaysIcon,
    ClipboardListIcon,
    BuildingOfficeIcon,
    ChatBubbleBottomCenterTextIcon,
    CheckIcon,
    XIcon,
    PlusIcon,
    CreditCardIcon,
    SparklesIcon,
    Cog8ToothIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    InformationCircleIcon,
    ClockIcon,
    BookOpenIcon,
    AcademicCapIcon,
    ShieldIcon,
    MpesaIcon,
    ArrowsRightLeftIcon,
    CurrencyIcon,
    RectangleStackIcon,
    ArrowUpTrayIcon,
    EyeIcon,
    DocumentArrowDownIcon,
    CommandLineIcon,
    EnvelopeIcon,
    PhoneIcon,
    PaperAirplaneIcon
} from './icons/index';
import { SubjectManager } from './SubjectManager';
import { CourseManager } from './CourseManager';
import { DepartmentManager } from './DepartmentManager';
import { BuildingManager } from './BuildingManager';
import { AcademicLevelManager } from './AcademicLevelManager';
import { DatabaseSettings } from './DatabaseSettings';

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
    transactions?: MpesaTransaction[];
    receipts?: Receipt[];
    invoices?: Invoice[];
    extensionRequests?: ExtensionRequest[];
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

type SettingsTab = 'global_config' | 'general' | 'timetable' | 'calendar' | 'subjects' | 'courses' | 'facilities';

export const SettingsManager: React.FC<SettingsManagerProps> = (props) => {
    const isSuperAdmin = props.currentUser.role === 'super_admin';
    const isRetailAgency = useMemo(() => RETAIL_SUBTYPES.includes(props.currentInstitution?.businessSubType || ''), [props.currentInstitution]);

    const isSchool = props.currentInstitution?.institutionType === 'Primary' || props.currentInstitution?.institutionType === 'Secondary';
    const isEdu = useMemo(() => {
        const type = props.currentInstitution?.institutionType;
        return ['Primary', 'Secondary', 'University', 'College', 'Institute', 'Polytechnic', 'ECD', 'International', 'TVET', 'Kindergarten'].includes(type || '');
    }, [props.currentInstitution]);

    const isCoop = useMemo(() => {
        const type = props.currentInstitution?.institutionType;
        const subType = props.currentInstitution?.businessSubType?.toLowerCase() || '';
        return type === 'Cooperative' || subType.includes('cooperative') || subType.includes('sacco') || subType.includes('agrovet');
    }, [props.currentInstitution]);

    const [activeTab, setActiveTab] = useState<SettingsTab>((isSuperAdmin && !isCoop) ? 'global_config' : 'general');
    const [timetableSubTab, setTimetableSubTab] = useState<'hours' | 'periods' | 'constraints' | 'exams' | 'teacher_logic'>('hours');
    const [generalSubTab, setGeneralSubTab] = useState<'profile' | 'academic_config' | 'location' | 'branding' | 'grading' | 'billing' | 'gateways'>('profile');
    const [globalSubTab, setGlobalSubTab] = useState<'profile' | 'infrastructure' | 'branding' | 'sms' | 'email' | 'billing'>('profile');
    const [billingSubTab, setBillingSubTab] = useState<'mpesa' | 'ncba'>('mpesa');
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
        parentAbsenceNotificationsEnabled: props.currentInstitution?.parentAbsenceNotificationsEnabled ?? false
    });

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
                parentAbsenceNotificationsEnabled: props.currentInstitution.parentAbsenceNotificationsEnabled ?? false
            });
        }
    }, [props.currentInstitution]);

    // Per-institution SMS gateway config state (for admin SMS Gateway sub-tab)
    const [localInstSmsConfig, setLocalInstSmsConfig] = useState<SmsConfig>(
        props.currentInstitution?.smsConfig || props.companyDetails?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' }
    );
    const [isSavingInstSms, setIsSavingInstSms] = useState(false);

    useEffect(() => {
        setLocalInstSmsConfig(props.currentInstitution?.smsConfig || props.companyDetails?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
    }, [props.currentInstitution, props.companyDetails?.smsConfig]);
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


    const handleSaveInstitutionProfile = () => {
        if (!props.currentInstitution) return;
        props.onUpdateInstitution?.(props.currentInstitution.id, instProfile);
        alert('Institution records updated.');
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
        ncbaConfig: (props.companyDetails as any)?.ncbaConfig || { clientId: '', clientSecret: '', apiKey: '', baseUrl: '', environment: 'sandbox' }
    });

    const [localSmsConfig, setLocalSmsConfig] = useState<SmsConfig>(props.companyDetails?.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
    const [localEmailConfig, setLocalEmailConfig] = useState<EmailConfig>(props.companyDetails?.emailConfig || { provider: 'smtp', host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
    const [localMpesaConfig, setLocalMpesaConfig] = useState<MpesaConfig>(props.companyDetails?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
    const [localSubConfig, setLocalSubConfig] = useState<SubscriptionConfig>(props.companyDetails?.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });

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
                ncbaConfig: (props.companyDetails as any).ncbaConfig || { clientId: '', clientSecret: '', apiKey: '', baseUrl: '', environment: 'sandbox' }
            });
            setLocalSmsConfig(props.companyDetails.smsConfig || { provider: 'Zettatel', apiKey: '', apiSecret: '', fromNumber: '' });
            setLocalEmailConfig(props.companyDetails.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
            setLocalMpesaConfig(props.companyDetails.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '', environment: 'sandbox' });
            setLocalSubConfig(props.companyDetails.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });
        }
    }, [props.companyDetails]);


    const handleSaveGlobalConfigs = async () => {
        if (!props.onUpdateCompanyDetails || !props.companyDetails) return;
        setIsSavingConfigs(true);
        try {
            await props.onUpdateCompanyDetails({
                ...props.companyDetails,
                ...localCompanyInfo,
                smsConfig: localSmsConfig,
                emailConfig: localEmailConfig,
                mpesaConfig: localMpesaConfig,
                subscriptionConfig: localSubConfig,
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

        if (isSuperAdmin && !isCoop) {
            tabs.push({ id: 'global_config', label: 'Global Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> });
        } else {
            tabs.push({ id: 'general', label: 'General', icon: <InformationCircleIcon className="w-5 h-5 mr-2" /> });
            if (!isRetailAgency && isEdu) {
                tabs.push({ id: 'timetable', label: 'Timetable Rules', icon: <ClockIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'calendar', label: 'Calendar', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'subjects', label: 'Subjects', icon: <BookOpenIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'courses', label: isSchool ? 'Grades' : 'Courses', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> });
                tabs.push({ id: 'facilities', label: 'Facilities', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> });
            }
        }

        return tabs;
    }, [props.currentUser.role, isSchool, isEdu, isSuperAdmin, isRetailAgency]);

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
                            <button onClick={() => setGlobalSubTab('branding')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'branding' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><SparklesIcon className="w-4 h-4" /> Visual Identity</button>
                            <button onClick={() => setGlobalSubTab('sms')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'sms' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><PaperAirplaneIcon className="w-4 h-4" /> SMS Gateway</button>
                            <button onClick={() => setGlobalSubTab('email')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'email' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><EnvelopeIcon className="w-4 h-4" /> Email Relay</button>
                            <button onClick={() => setGlobalSubTab('billing')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'billing' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><CreditCardIcon className="w-4 h-4" /> Platform Billing</button>
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
                                        {localCompanyInfo.logoUrl ? <img src={localCompanyInfo.logoUrl} className="h-20 object-contain mb-4" alt="Logo" /> : <BuildingOfficeIcon className="w-10 h-10 text-slate-200 mb-2" />}
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">System Logo</p>
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

                                <DatabaseSettings
                                    dbConfig={props.companyDetails!.databaseConfig}
                                    onSave={async (newDbConfig: any) => {
                                        if (props.onUpdateCompanyDetails) {
                                            await props.onUpdateCompanyDetails({ ...props.companyDetails!, databaseConfig: newDbConfig });
                                        }
                                    }}
                                />

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
                                        <button onClick={() => setShowPaperPreview(!showPaperPreview)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-2">
                                            <EyeIcon className="w-4 h-4" /> {showPaperPreview ? 'Hide Preview' : 'Show Document Map'}
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
                                    {showPaperPreview && (
                                        <div className="mt-12 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-6 bg-slate-50 animate-scale-in origin-top">
                                            <BrandedPaper
                                                institution={null}
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
                                            {localSmsConfig.provider === 'Zettatel' ? 'User ID' : localSmsConfig.provider === 'Sematime' ? 'API Key' : 'User ID / API Key'}
                                        </label>
                                        <input type="text" value={localSmsConfig.apiKey} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSmsConfig({ ...localSmsConfig, apiKey: e.target.value })} className="form-input h-10" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                            {localSmsConfig.provider === 'Zettatel' ? 'Password' : localSmsConfig.provider === 'Sematime' ? 'Client ID' : 'API Password / Secret'}
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

                        {globalSubTab === 'billing' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600">
                                            <CreditCardIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">Platform Billing Map</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Configure Global Payment Gateways & Licensing</p>
                                        </div>
                                    </div>

                                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1.5 rounded-2xl shadow-inner">
                                        <button
                                            onClick={() => setBillingSubTab('mpesa')}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingSubTab === 'mpesa' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            Global M-Pesa
                                        </button>
                                        <button
                                            onClick={() => setBillingSubTab('ncba')}
                                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${billingSubTab === 'ncba' ? 'bg-white dark:bg-slate-600 text-indigo-600 shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            NCBA Config
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
                                            <h4 className="text-sm font-bold uppercase text-slate-500 border-b pb-1">Standard Subscription Pricing</h4>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Monthly License (KES)</label><input type="number" value={localSubConfig.defaultMonthlyPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSubConfig({ ...localSubConfig, defaultMonthlyPrice: Number(e.target.value) })} className="form-input font-bold" /></div>
                                                <div><label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Yearly License (KES)</label><input type="number" value={localSubConfig.defaultYearlyPrice} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSubConfig({ ...localSubConfig, defaultYearlyPrice: Number(e.target.value) })} className="form-input font-bold" /></div>
                                            </div>
                                            <div><label className="block text-[10px] font-black uppercase text-indigo-600 mb-1.5 ml-1">Base Cost Per Additional Student (KES)</label><input type="number" value={localSubConfig.baseCostPerStudent || 0} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLocalSubConfig({ ...localSubConfig, baseCostPerStudent: Number(e.target.value) })} className="form-input font-bold border-indigo-200 focus:ring-indigo-500" /></div>
                                            
                                            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-200">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <InformationCircleIcon className="w-5 h-5 text-indigo-500" />
                                                    <span className="text-[10px] font-black uppercase text-slate-600">Gateway Policy</span>
                                                </div>
                                                <p className="text-xs text-slate-500 leading-relaxed">Incoming payments are validated against the Paybill and Account Reference (Institution Code). Subscriptions are automatically extended upon successful callback.</p>
                                            </div>
                                            <div className="pt-4">
                                                <button onClick={handleSaveGlobalConfigs} className="btn-primary w-full h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save Billing Map</button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {billingSubTab === 'ncba' && (
                                    <div className="animate-fade-in space-y-8">
                                        <div className="p-8 bg-teal-50/50 dark:bg-teal-900/10 rounded-[2.5rem] border border-teal-100 dark:border-teal-800/50">
                                            <div className="flex items-center gap-4 mb-8">
                                                <div className="p-4 bg-teal-600 rounded-2xl text-white shadow-lg shadow-teal-100 dark:shadow-none">
                                                    <BuildingOfficeIcon className="w-8 h-8" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xl font-black uppercase tracking-tight text-teal-900 dark:text-teal-200">NCBA Direct Settlement</h4>
                                                    <p className="text-[10px] font-bold text-teal-600 uppercase tracking-widest mt-0.5">Global Banking Gateway Configuration</p>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">OAuth Client ID</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.clientId || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, clientId: e.target.value } as any })}
                                                            className="form-input h-14 bg-white dark:bg-slate-900 font-mono text-sm" 
                                                            placeholder="Enter Client ID"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">OAuth Client Secret</label>
                                                        <input 
                                                            type="password" 
                                                            value={localCompanyInfo.ncbaConfig?.clientSecret || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, clientSecret: e.target.value } as any })}
                                                            className="form-input h-14 bg-white dark:bg-slate-900" 
                                                            placeholder="••••••••••••••••"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">NCBA API Key (Primary)</label>
                                                        <input 
                                                            type="password" 
                                                            value={localCompanyInfo.ncbaConfig?.apiKey || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, apiKey: e.target.value } as any })}
                                                            className="form-input h-14 bg-white dark:bg-slate-900" 
                                                            placeholder="••••••••••••••••"
                                                        />
                                                    </div>
                                                </div>

                                                <div className="space-y-6">
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Gateway Base URL</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.baseUrl || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, baseUrl: e.target.value } as any })}
                                                            className="form-input h-14 bg-white dark:bg-slate-900 font-mono text-sm text-teal-600" 
                                                            placeholder="https://api.ncbagroup.com"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Disbursement Account Number</label>
                                                        <input 
                                                            type="text" 
                                                            value={localCompanyInfo.ncbaConfig?.accountNumber || ''} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, accountNumber: e.target.value } as any })}
                                                            className="form-input h-14 bg-white dark:bg-slate-900 font-bold" 
                                                            placeholder="0000000000"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">API Environment</label>
                                                        <select 
                                                            value={localCompanyInfo.ncbaConfig?.environment || 'sandbox'} 
                                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, ncbaConfig: { ...localCompanyInfo.ncbaConfig, environment: e.target.value as any } as any })}
                                                            className="form-select h-14 bg-white dark:bg-slate-900 font-black uppercase tracking-widest text-[10px]"
                                                        >
                                                            <option value="sandbox">Sandbox / Staging</option>
                                                            <option value="production">Live Production</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 p-6 bg-white/50 dark:bg-slate-900/50 rounded-3xl border border-teal-100 dark:border-teal-800/30">
                                                <div className="flex items-center gap-3">
                                                    <InformationCircleIcon className="w-5 h-5 text-teal-600" />
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed max-w-md">
                                                        These credentials allow the platform to initiate settlements and query transaction statuses directly from NCBA bank APIs. Ensure they are kept confidential.
                                                    </p>
                                                </div>
                                                <button onClick={handleSaveGlobalConfigs} className="btn-primary h-14 px-12 shadow-xl shadow-teal-100 dark:shadow-none bg-teal-600 border-none uppercase tracking-widest text-[10px]">Save NCBA Config</button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )
            }

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
                                        filtered.push('sms');
                                        filtered.push('gateways');
                                    }
                                    return filtered;
                                }
                                const subs = ['profile', 'academic_config', 'location', 'branding', 'grading'];
                                if (props.currentUser.role === 'admin') { subs.push('billing'); subs.push('sms'); subs.push('gateways'); }
                                return subs;
                            })().map((sub: string) => (
                                <button key={sub} onClick={() => setGeneralSubTab(sub as any)} className={`py-2 px-4 border-b-2 font-black text-[10px] uppercase tracking-widest transition-colors whitespace-nowrap capitalize ${generalSubTab === sub ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{sub.replace('_', ' ')}</button>
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

                                <div className="mt-8 flex justify-end"><button onClick={handleSaveInstitutionProfile} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Update Profile</button></div>
                            </div>
                        )}
                        {generalSubTab === 'academic_config' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
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
                        {generalSubTab === 'branding' && ( /* ... branding UI ... */ <div className="space-y-6"><div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700"><div className="flex justify-between items-center mb-8"><h4 className="font-bold text-lg flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-indigo-500" /> Visual Brand Identity</h4><button onClick={() => setShowPaperPreview(!showPaperPreview)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-1"><EyeIcon className="w-4 h-4" /> {showPaperPreview ? 'Hide Paper' : 'Preview Documents'}</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-10"><div className="space-y-6"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Accent Theme Color</label><div className="flex gap-4 items-center"><input type="color" value={props.themeColor} onChange={(e: React.ChangeEvent<HTMLInputElement>) => props.onUpdateThemeColor && props.onUpdateThemeColor(e.target.value)} className="h-12 w-24 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer" /><span className="font-mono text-sm font-bold text-slate-500 uppercase">{props.themeColor}</span></div></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Corporate Seal / Logo</label><div className="flex items-center gap-6"><div className="h-20 w-20 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">{props.logoUrl ? <img src={props.logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <BuildingOfficeIcon className="w-8 h-8 text-slate-200" />}</div><label className="btn-secondary text-[10px] h-10 px-4 flex items-center justify-center cursor-pointer">Update Emblem<input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'logo')} /></label></div></div></div><div className="space-y-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Document Header (LPO/Receipts)</label><label className="btn-secondary h-24 w-full flex flex-col items-center justify-center gap-2 cursor-pointer border-dashed"><ArrowUpTrayIcon className="w-6 h-6 text-slate-300" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Header Banner</span><input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'letterhead')} /></label></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Official Report Footer</label><label className="btn-secondary h-16 w-full flex items-center justify-center gap-2 cursor-pointer border-dashed"><ArrowUpTrayIcon className="w-4 h-4 text-slate-300" /><span className="text-[10px) font-black uppercase tracking-widest text-slate-400">Upload Footer Strip</span><input type="file" className="hidden" accept="image/*" onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleImageUpload(e, 'footer')} /></label></div></div></div></div>{showPaperPreview && (<div className="mt-12 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-6 bg-slate-50 animate-scale-in origin-top"><BrandedPaper institution={props.currentInstitution} letterheadConfig={props.letterheadConfig} footerImageUrl={props.footerImageUrl}><div className="h-96 flex flex-col items-center justify-center opacity-10 py-32"><ClipboardListIcon className="w-24 h-24 text-slate-900 mb-6" /><p className="text-2xl font-black text-slate-900 uppercase tracking-[0.2em]">Live Document Preview</p></div></BrandedPaper></div>)}</div>)}
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
                                />
                            </div>
                        )}
                        {generalSubTab === 'gateways' && (
                            <div className="space-y-8 animate-fade-in">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-teal-50 dark:bg-teal-900/30 rounded-2xl text-teal-600">
                                            <BuildingOfficeIcon className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black uppercase tracking-tight">NCBA Bank Integration</h3>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">Connect your NCBA Direct Debit & Settlement Gateway</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem]">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Client ID</label>
                                            <input 
                                                type="text" 
                                                value={props.currentInstitution?.ncbaConfig?.clientId || ''} 
                                                onChange={(e) => props.onUpdateInstitution?.(props.currentInstitution!.id, { ncbaConfig: { ...props.currentInstitution?.ncbaConfig, clientId: e.target.value } as any })}
                                                className="form-input" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Client Secret</label>
                                            <input 
                                                type="password" 
                                                value={props.currentInstitution?.ncbaConfig?.clientSecret || ''} 
                                                onChange={(e) => props.onUpdateInstitution?.(props.currentInstitution!.id, { ncbaConfig: { ...props.currentInstitution?.ncbaConfig, clientSecret: e.target.value } as any })}
                                                className="form-input" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">API Key</label>
                                            <input 
                                                type="text" 
                                                value={props.currentInstitution?.ncbaConfig?.apiKey || ''} 
                                                onChange={(e) => props.onUpdateInstitution?.(props.currentInstitution!.id, { ncbaConfig: { ...props.currentInstitution?.ncbaConfig, apiKey: e.target.value } as any })}
                                                className="form-input" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Base URL</label>
                                            <input 
                                                type="text" 
                                                value={props.currentInstitution?.ncbaConfig?.baseUrl || ''} 
                                                placeholder="https://api.ncbagroup.com"
                                                onChange={(e) => props.onUpdateInstitution?.(props.currentInstitution!.id, { ncbaConfig: { ...props.currentInstitution?.ncbaConfig, baseUrl: e.target.value } as any })}
                                                className="form-input" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Account Number</label>
                                            <input 
                                                type="text" 
                                                value={props.currentInstitution?.ncbaConfig?.accountNumber || ''} 
                                                onChange={(e) => props.onUpdateInstitution?.(props.currentInstitution!.id, { ncbaConfig: { ...props.currentInstitution?.ncbaConfig, accountNumber: e.target.value } as any })}
                                                className="form-input" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-2 ml-1">Environment</label>
                                            <select 
                                                value={props.currentInstitution?.ncbaConfig?.environment || 'sandbox'} 
                                                onChange={(e) => props.onUpdateInstitution?.(props.currentInstitution!.id, { ncbaConfig: { ...props.currentInstitution?.ncbaConfig, environment: e.target.value } as any })}
                                                className="form-select"
                                            >
                                                <option value="sandbox">Sandbox / Testing</option>
                                                <option value="production">Live Production</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex justify-end pt-4">
                                        <button className="btn-primary h-12 px-10 shadow-lg shadow-teal-100 dark:shadow-none bg-teal-600 border-none">Secure NCBA Link</button>
                                    </div>
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
                                            {localInstSmsConfig.provider === 'Zettatel' ? 'User ID' : localInstSmsConfig.provider === 'Sematime' ? 'API Key' : 'User ID / API Key'}
                                        </label>
                                        <input type="text" value={localInstSmsConfig.apiKey} onChange={(e) => setLocalInstSmsConfig({ ...localInstSmsConfig, apiKey: e.target.value })} className="form-input h-10" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">
                                            {localInstSmsConfig.provider === 'Zettatel' ? 'Password' : localInstSmsConfig.provider === 'Sematime' ? 'Client ID' : 'API Password / Secret'}
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
                                    <button
                                        onClick={async () => {
                                            if (!props.currentInstitution || !props.onUpdateInstitution) return;
                                            setIsSavingInstSms(true);
                                            try {
                                                await props.onUpdateInstitution(props.currentInstitution.id, { smsConfig: localInstSmsConfig });
                                                alert('SMS gateway saved for this institution.');
                                            } catch {
                                                alert('Failed to save SMS gateway.');
                                            } finally {
                                                setIsSavingInstSms(false);
                                            }
                                        }}
                                        disabled={isSavingInstSms}
                                        className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs"
                                    >
                                        {isSavingInstSms ? 'Saving...' : 'Save Gateway'}
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
                                <div className="flex justify-end pt-4 border-t">
                                    <button onClick={handleSaveTimetable} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-100">
                                        {selectedProfileId === 'default' ? 'Commit Global Defaults' : `Sync ${props.currentInstitution?.scheduleProfiles?.find((p: ScheduleProfile) => p.id === selectedProfileId)?.name || 'Profile'} Registry`}
                                    </button>
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
                                                        if (confirm(`Remove "${stream}" from registry?`)) {
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
                                </div>
                            )}
                        </div>
                    </div>
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
