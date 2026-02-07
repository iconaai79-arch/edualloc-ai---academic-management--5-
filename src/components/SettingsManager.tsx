

import React, { useState, useEffect, useMemo } from 'react';
import type {
    DatabaseConfig, Institution, Department, Subject, Building, Room,
    Course, AcademicLevel, TimetableSettings, ExamTimetableSettings,
    AllocationRequest, AcademicYear, Semester, SmsConfig, EmailConfig,
    LetterheadConfig, MpesaConfig, SubscriptionConfig, CompanyDetails,
    VoteHead, FeeStructure, FinancialPeriod, User,
    TimetableConstraint, TimetableConstraintType,
    InvoiceItem, TransactionStatus, BiometricConfig
} from '../types';
import { AcademicYearManager } from './AcademicYearManager';
import { LocationSettings } from './LocationSettings';

import { BrandedPaper } from './BrandedPaper';
import { GradingSystemManager } from './GradingSystemManager';
import { DatabaseSettings } from './DatabaseSettings';
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
import { apiService } from '../services/apiService';

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
    onAddDepartment?: (name: string) => void;
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
    onUpdateAcademicYear?: (yearId: string, data: Partial<Omit<AcademicYear, 'id' | 'institutionId'>>) => void;
    onDeleteAcademicYear?: (yearId: string) => void;
    onAddSemester?: (data: Omit<Semester, 'id' | 'institutionId'>) => void;
    onUpdateSemester?: (semesterId: string, data: Partial<Omit<Semester, 'id' | 'institutionId' | 'academicYearId'>>) => void;
    onDeleteSemester?: (semesterId: string) => void;
    onUpdateThemeColor?: (color: string) => void;
    allocations: AllocationRequest[];
    isExamCalendarOnly?: boolean;
    onSaveSmsConfig?: (config: SmsConfig) => void;
    onSaveEmailConfig?: (config: EmailConfig) => void;
    onSaveLetterheadConfig?: (config: LetterheadConfig) => void;
    onUpdateLogo?: (logoUrl: string | null) => void;
    onUpdateFooterImage?: (footerUrl: string | null) => void;
    onGenerateDemoData?: () => void;
    onClearDemoData?: () => void;
    onAddTransaction?: (data: any, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onAddExtensionRequest?: (reason: string) => void;
    onLogAction?: (action: string) => void;
    letterheadConfig?: LetterheadConfig;
    isGeneratingDemoData?: boolean;
    demoDataGenerationProgress?: number;
    demoDataGenerationMessage?: string;
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

export const SettingsManager: React.FC<SettingsManagerProps> = (props) => {
    const isSuperAdmin = props.currentUser.role === 'super_admin';
    const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'global_config' : 'general');
    const [timetableSubTab, setTimetableSubTab] = useState<'hours' | 'periods' | 'constraints' | 'exams'>('hours');
    const [generalSubTab, setGeneralSubTab] = useState<'profile' | 'academic_config' | 'location' | 'branding' | 'grading'>('profile');
    const [globalSubTab, setGlobalSubTab] = useState<'profile' | 'infrastructure' | 'branding' | 'sms' | 'email' | 'billing' | 'ai'>('profile');
    const [facilitiesSubTab, setFacilitiesSubTab] = useState<'departments' | 'buildings' | 'rooms' | 'levels'>('departments');
    const [showPaperPreview, setShowPaperPreview] = useState(false);

    const isSchool = props.currentInstitution?.institutionType === 'Primary' || props.currentInstitution?.institutionType === 'Secondary';

    useEffect(() => {
        if (props.initialTab) {
            setActiveTab(props.initialTab as any);
        }
    }, [props.initialTab]);

    // --- Timetable Rules State ---
    const [selectedProfileId, setSelectedProfileId] = useState<string>('default');
    const [localTimetableSettings, setLocalTimetableSettings] = useState<TimetableSettings>(props.timetableSettings);
    const [newBreak, setNewBreak] = useState({ name: '', startTime: '', endTime: '' });
    const [newPeriod, setNewPeriod] = useState({ name: '', startTime: '', endTime: '' });

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

    // --- Institution Profile State ---
    const [instProfile, setInstProfile] = useState({
        email: props.currentInstitution?.email || '',
        phoneNumber: props.currentInstitution?.phoneNumber || '',
        useAllocationRequests: props.currentInstitution?.useAllocationRequests ?? true
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
                useAllocationRequests: props.currentInstitution.useAllocationRequests ?? true
            });
        }
    }, [props.currentInstitution]);

    // Update local state when profile changes
    useEffect(() => {
        if (selectedProfileId === 'default') {
            setLocalTimetableSettings(props.timetableSettings);
        } else if (props.currentInstitution?.scheduleProfiles) {
            const profile = props.currentInstitution.scheduleProfiles.find(p => p.id === selectedProfileId);
            if (profile) {
                setLocalTimetableSettings({
                    ...props.timetableSettings,
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
            if (props.currentInstitution && props.onUpdateInstitution) {
                const updatedProfiles = (props.currentInstitution.scheduleProfiles || []).map(p => {
                    if (p.id === selectedProfileId) {
                        return {
                            ...p,
                            operatingDays: localTimetableSettings.operatingDays,
                            startTime: localTimetableSettings.startTime,
                            endTime: localTimetableSettings.endTime,
                            periods: localTimetableSettings.periods,
                            breaks: localTimetableSettings.breaks,
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

    const handleSaveExams = () => {
        props.onSaveExamTimetableSettings?.(localExamSettings);
        alert('Exam settings synchronized with cloud.');
    };

    const handleToggleOperatingDay = (day: string) => {
        setLocalTimetableSettings(prev => {
            const current = prev.operatingDays || [];
            const next = current.includes(day as any)
                ? current.filter(d => d !== day)
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
        setLocalExamSettings(prev => ({
            ...prev,
            sessionsPerDay: [...(prev.sessionsPerDay || []), sessionObj]
        }));
        setNewExamSession({ name: '', startTime: '', endTime: '' });
    };

    const handleDeleteExamSession = (id: string) => {
        setLocalExamSettings(prev => ({
            ...prev,
            sessionsPerDay: (prev.sessionsPerDay || []).filter(s => s.id !== id)
        }));
    };

    const handleAddConstraint = () => {
        if (newConstraint.subjectIds.length === 0) return;

        const subjectNames = newConstraint.subjectIds.map(id => props.subjects.find(s => s.id === id)?.name || 'Unknown').join(', ');
        const description = `${CONSTRAINT_TYPE_LABELS[newConstraint.type]}: ${subjectNames}${newConstraint.day ? ` on ${newConstraint.day}` : ''}`;

        const constraint: TimetableConstraint = {
            id: `const_${Date.now()}`,
            ...newConstraint,
            description
        };

        setLocalTimetableSettings(prev => ({
            ...prev,
            constraints: [...(prev.constraints || []), constraint]
        }));
        setNewConstraint({ type: 'consecutive_subjects', subjectIds: [] });
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead' | 'footer') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (type === 'logo') props.onUpdateLogo?.(dataUrl);
            if (type === 'letterhead') {
                const currentConfig = props.letterheadConfig || { headerImageUrl: null, stampImageUrl: null };
                props.onSaveLetterheadConfig?.({ ...currentConfig, headerImageUrl: dataUrl });
            }
            if (type === 'footer') props.onUpdateFooterImage?.(dataUrl);
        };
        reader.readAsDataURL(file);
    };

    // State for Global Configs (Super Admin)
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
        chatEnabled: props.companyDetails?.chatAssistantConfig?.enabled ?? true
    });

    const [localSmsConfig, setLocalSmsConfig] = useState<SmsConfig>(props.companyDetails?.smsConfig || { provider: 'ABMIS', apiKey: '', apiSecret: '', fromNumber: '' });
    const [localEmailConfig, setLocalEmailConfig] = useState<EmailConfig>(props.companyDetails?.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
    const [localMpesaConfig, setLocalMpesaConfig] = useState<MpesaConfig>(props.companyDetails?.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
    const [localSubConfig, setLocalSubConfig] = useState<SubscriptionConfig>(props.companyDetails?.subscriptionConfig || { defaultMonthlyPrice: 5000, defaultYearlyPrice: 50000 });

    const [isSavingConfigs, setIsSavingConfigs] = useState(false);

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
                chatEnabled: props.companyDetails.chatAssistantConfig?.enabled ?? true
            });
            setLocalSmsConfig(props.companyDetails.smsConfig || { provider: 'ABMIS', apiKey: '', apiSecret: '', fromNumber: '' });
            setLocalEmailConfig(props.companyDetails.emailConfig || { host: '', port: 587, username: '', password: '', encryption: 'tls', fromName: '', fromEmail: '' });
            setLocalMpesaConfig(props.companyDetails.mpesaConfig || { paybillNumber: '', accountNumber: '', consumerKey: '', consumerSecret: '', passkey: '' });
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
                chatAssistantConfig: {
                    ...props.companyDetails.chatAssistantConfig,
                    welcomeMessage: localCompanyInfo.welcomeMessage,
                    enabled: localCompanyInfo.chatEnabled
                }
            });
        } catch (e) {
            alert("Failed to save configurations.");
        } finally {
            setIsSavingConfigs(false);
        }
    };

    const handleLocalImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'letterhead' | 'footer') => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const dataUrl = event.target?.result as string;
            if (type === 'logo') setLocalCompanyInfo(prev => ({ ...prev, logoUrl: dataUrl }));
            if (type === 'letterhead') {
                setLocalCompanyInfo(prev => ({
                    ...prev,
                    letterheadConfig: { ...prev.letterheadConfig, headerImageUrl: dataUrl }
                }));
            }
            if (type === 'footer') setLocalCompanyInfo(prev => ({ ...prev, footerImageUrl: dataUrl }));
        };
        reader.readAsDataURL(file);
    };

    const mainTabs = useMemo(() => {
        const isFinanceRole = props.currentUser.role === 'finance';
        if (isFinanceRole) {
            return [];
        }

        const tabs = [];

        if (isSuperAdmin) {
            tabs.push({ id: 'global_config', label: 'Global Config', icon: <Cog8ToothIcon className="w-5 h-5 mr-2" /> });
        } else {
            tabs.push({ id: 'general', label: 'General', icon: <InformationCircleIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'timetable', label: 'Timetable Rules', icon: <ClockIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'calendar', label: 'Calendar', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'subjects', label: 'Subjects', icon: <BookOpenIcon className="w-5 h-5 mr-2" /> });
            tabs.push({ id: 'courses', label: isSchool ? 'Grades' : 'Courses', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> });

            tabs.push({ id: 'facilities', label: 'Facilities', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> });
        }

        return tabs;
    }, [props.currentUser.role, isSchool, isSuperAdmin]);

    const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
        <div className="space-y-6">
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-4 overflow-x-auto no-scrollbar" aria-label="Settings Tabs">
                    {mainTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
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
                            <button onClick={() => setGlobalSubTab('ai')} className={`py-4 px-1 border-b-2 font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${globalSubTab === 'ai' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}><ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> EduAi Assistant</button>
                        </nav>
                    </div>

                    <div className="mt-6">
                        {globalSubTab === 'profile' && (
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
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                                        {localCompanyInfo.logoUrl ? <img src={localCompanyInfo.logoUrl} className="h-20 object-contain mb-4" alt="Logo" /> : <BuildingOfficeIcon className="w-10 h-10 text-slate-200 mb-2" />}
                                        <p className="text-[10px] font-bold text-slate-400 uppercase">System Logo</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'infrastructure' && (
                            <div className="animate-fade-in">
                                <DatabaseSettings
                                    dbConfig={props.companyDetails!.databaseConfig}
                                    onSave={async (newDbConfig) => {
                                        if (props.onUpdateCompanyDetails) {
                                            await props.onUpdateCompanyDetails({ ...props.companyDetails!, databaseConfig: newDbConfig });
                                        }
                                    }}
                                />
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
                                                        onChange={(e) => props.onUpdateThemeColor && props.onUpdateThemeColor(e.target.value)}
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
                                <div className="pt-6 border-t flex justify-end">
                                    <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Sync Gateway</button>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'email' && (
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
                                <div className="pt-6 border-t flex justify-end">
                                    <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Authorize SMTP</button>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'billing' && (
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

                                <div className="pt-6 border-t flex justify-end">
                                    <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Save Billing Map</button>
                                </div>
                            </div>
                        )}

                        {globalSubTab === 'ai' && (
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm space-y-8 animate-fade-in">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                                        <SparklesIcon className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tight">EduAi Assistant Configuration</h3>
                                        <p className="text-xs text-slate-500 mt-1">Manage the AI chatbot availability and personality.</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-8">
                                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                                        <div>
                                            <label className="text-sm font-bold text-slate-800 dark:text-slate-200">Enable Global Chatbot</label>
                                            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Allow users to interact with the AI assistant across the platform.</p>
                                        </div>
                                        <label className="flex items-center cursor-pointer relative">
                                            <input
                                                type="checkbox"
                                                checked={localCompanyInfo.chatEnabled}
                                                onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, chatEnabled: e.target.checked })}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                                        </label>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Welcome Message</label>
                                        <textarea
                                            value={localCompanyInfo.welcomeMessage}
                                            onChange={e => setLocalCompanyInfo({ ...localCompanyInfo, welcomeMessage: e.target.value })}
                                            className="form-input h-24 p-4 resize-none"
                                            placeholder="Hello! I am the EduAi Assistant. How can I help you today?"
                                        />
                                        <p className="text-[10px] text-slate-400 mt-2 italic">This message appears when a user opens the chat window.</p>
                                    </div>
                                </div>

                                <div className="pt-6 border-t flex justify-end">
                                    <button onClick={handleSaveGlobalConfigs} className="btn-primary px-10 h-12 shadow-indigo-100 uppercase tracking-widest text-xs">Update Assistant</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* General Tab */}
            {activeTab === 'general' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        {['profile', 'academic_config', 'location', 'branding', 'grading'].map((sub) => (
                            <button key={sub} onClick={() => setGeneralSubTab(sub as any)} className={`py-2 px-4 border-b-2 font-black text-[10px] uppercase tracking-widest transition-colors capitalize ${generalSubTab === sub ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{sub.replace('_', ' ')}</button>
                        ))}
                    </div>
                    {generalSubTab === 'profile' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <h4 className="font-bold text-lg mb-6 flex items-center gap-2"><BuildingOfficeIcon className="w-5 h-5 text-indigo-500" /> Institutional Records</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Official Name</label><input type="text" value={props.currentInstitution?.name || ''} readOnly className="form-input bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed font-bold" /></div>
                                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Identity Code</label><input type="text" value={props.currentInstitution?.institutionCode || ''} readOnly className="form-input bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed font-mono text-indigo-600" /></div>
                                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">System Email</label><input type="email" value={instProfile.email} onChange={e => setInstProfile({ ...instProfile, email: e.target.value })} className="form-input" /></div>
                                <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Admin Phone</label><input type="tel" value={instProfile.phoneNumber} onChange={e => setInstProfile({ ...instProfile, phoneNumber: e.target.value })} className="form-input" /></div>
                            </div>
                            <div className="mt-8 flex justify-end"><button onClick={handleSaveInstitutionProfile} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Update Profile</button></div>
                        </div>
                    )}
                    {generalSubTab === 'academic_config' && <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700"><h4 className="font-bold text-lg mb-6 flex items-center gap-2"><ShieldIcon className="w-5 h-5 text-indigo-500" /> Governance Policies</h4><div className="space-y-4"><div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700"><input type="checkbox" id="use-alloc-reqs" checked={instProfile.useAllocationRequests} onChange={e => setInstProfile({ ...instProfile, useAllocationRequests: e.target.checked })} className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" /><div><label htmlFor="use-alloc-reqs" className="text-sm font-bold text-slate-700 dark:text-slate-300">Enable Collaborative Allocation Requests</label><p className="text-xs text-slate-400">Allows {isSchool ? 'teachers' : 'lecturers'} to submit unit preferences before generation.</p></div></div></div><div className="mt-8 flex justify-end"><button onClick={handleSaveInstitutionProfile} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Synchronize Policies</button></div></div>}
                    {generalSubTab === 'location' && <LocationSettings institution={props.currentInstitution} onSave={(id, data) => props.onUpdateInstitution && props.onUpdateInstitution(id, data)} />}
                    {generalSubTab === 'branding' && ( /* ... branding UI ... */ <div className="space-y-6"><div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700"><div className="flex justify-between items-center mb-8"><h4 className="font-bold text-lg flex items-center gap-2"><SparklesIcon className="w-5 h-5 text-indigo-500" /> Visual Brand Identity</h4><button onClick={() => setShowPaperPreview(!showPaperPreview)} className="text-[10px] font-black uppercase text-indigo-600 hover:underline flex items-center gap-1"><EyeIcon className="w-4 h-4" /> {showPaperPreview ? 'Hide Paper' : 'Preview Documents'}</button></div><div className="grid grid-cols-1 md:grid-cols-2 gap-10"><div className="space-y-6"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Accent Theme Color</label><div className="flex gap-4 items-center"><input type="color" value={props.themeColor} onChange={(e) => props.onUpdateThemeColor && props.onUpdateThemeColor(e.target.value)} className="h-12 w-24 p-1 rounded-xl border border-slate-200 bg-white cursor-pointer" /><span className="font-mono text-sm font-bold text-slate-500 uppercase">{props.themeColor}</span></div></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Corporate Seal / Logo</label><div className="flex items-center gap-6"><div className="h-20 w-20 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">{props.logoUrl ? <img src={props.logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <BuildingOfficeIcon className="w-8 h-8 text-slate-200" />}</div><label className="btn-secondary text-[10px] h-10 px-4 flex items-center justify-center cursor-pointer">Update Emblem<input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} /></label></div></div></div><div className="space-y-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Document Header (LPO/Receipts)</label><label className="btn-secondary h-24 w-full flex flex-col items-center justify-center gap-2 cursor-pointer border-dashed"><ArrowUpTrayIcon className="w-6 h-6 text-slate-300" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Header Banner</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'letterhead')} /></label></div><div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Official Report Footer</label><label className="btn-secondary h-16 w-full flex items-center justify-center gap-2 cursor-pointer border-dashed"><ArrowUpTrayIcon className="w-4 h-4 text-slate-300" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Footer Strip</span><input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'footer')} /></label></div></div></div></div>{showPaperPreview && (<div className="mt-12 border-4 border-dashed border-slate-100 rounded-[3.5rem] p-6 bg-slate-50 animate-scale-in origin-top"><BrandedPaper institution={props.currentInstitution} letterheadConfig={props.letterheadConfig} footerImageUrl={props.footerImageUrl}><div className="h-96 flex flex-col items-center justify-center opacity-10 py-32"><ClipboardListIcon className="w-24 h-24 text-slate-900 mb-6" /><p className="text-2xl font-black text-slate-900 uppercase tracking-[0.2em]">Live Document Preview</p></div></BrandedPaper></div>)}</div>)}
                    {generalSubTab === 'grading' && <div className="animate-fade-in"><GradingSystemManager currentInstitution={props.currentInstitution} onUpdateInstitution={props.onUpdateInstitution} /></div>}
                </div>
            )}

            {/* Calendar Manager Tab */}
            {activeTab === 'calendar' && (
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
            )}

            {/* Timetable Tab (Rules etc) */}
            {activeTab === 'timetable' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        {[{ id: 'hours', label: 'Day & Time Span' }, { id: 'periods', label: 'Period Slots' }, { id: 'constraints', label: 'Logic Constraints' }, { id: 'exams', label: 'Exam Settings' }].map((sub) => (<button key={sub.id} onClick={() => setTimetableSubTab(sub.id as any)} className={`py-2 px-4 border-b-2 font-black text-[10px] uppercase tracking-widest transition-colors ${timetableSubTab === sub.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'}`}>{sub.label}</button>))}
                    </div>

                    {timetableSubTab === 'hours' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-fade-in">
                            <div className="flex justify-between items-start mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                <div>
                                    <h3 className="text-lg font-bold">Operational Schedule</h3>
                                    <p className="text-xs text-slate-500">Configure global timing or select a specific grid profile.</p>
                                </div>
                                <div className="w-64">
                                    <label className="block text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1.5">Editing Grid Profile</label>
                                    <select
                                        value={selectedProfileId}
                                        onChange={e => setSelectedProfileId(e.target.value)}
                                        className="form-select h-10 text-xs font-bold"
                                    >
                                        <option value="default">Global Default (All)</option>
                                        {(props.currentInstitution?.scheduleProfiles || []).map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Operating Days</label>
                                    <div className="flex flex-wrap gap-2">
                                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                            <button key={day} onClick={() => handleToggleOperatingDay(day)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${localTimetableSettings.operatingDays?.includes(day as any) ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'}`}>{day.substring(0, 3)}</button>
                                        ))}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Opening Time</label><input type="time" value={localTimetableSettings.startTime} onChange={e => setLocalTimetableSettings({ ...localTimetableSettings, startTime: e.target.value })} className="form-input" /></div>
                                    <div><label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Closing Time</label><input type="time" value={localTimetableSettings.endTime} onChange={e => setLocalTimetableSettings({ ...localTimetableSettings, endTime: e.target.value })} className="form-input" /></div>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-bold">Standard Breaks</h3>
                                    <div className="flex gap-2">
                                        <input type="text" placeholder="Name" value={newBreak.name} onChange={e => setNewBreak({ ...newBreak, name: e.target.value })} className="form-input text-xs w-32" />
                                        <input type="time" value={newBreak.startTime} onChange={e => setNewBreak({ ...newBreak, startTime: e.target.value })} className="form-input text-xs w-28" />
                                        <input type="time" value={newBreak.endTime} onChange={e => setNewBreak({ ...newBreak, endTime: e.target.value })} className="form-input text-xs w-28" />
                                        <button onClick={() => { if (newBreak.name) { setLocalTimetableSettings(p => ({ ...p, breaks: [...(p.breaks || []), { id: `b_${Date.now()}`, ...newBreak, status: 'active' }] })); setNewBreak({ name: '', startTime: '', endTime: '' }); } }} className="p-2 bg-indigo-600 text-white rounded-lg"><PlusIcon className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {localTimetableSettings.breaks?.map(b => (
                                        <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl">
                                            <span className="font-bold text-sm uppercase tracking-tight">{b.name} <span className="text-slate-400 font-normal ml-2">({b.startTime} - {b.endTime})</span></span>
                                            <button onClick={() => setLocalTimetableSettings(p => ({ ...p, breaks: p.breaks.filter(x => x.id !== b.id) }))} className="text-red-500 font-black text-[10px] uppercase tracking-widest">Purge</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end pt-4 border-t">
                                <button onClick={handleSaveTimetable} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-100">
                                    {selectedProfileId === 'default' ? 'Commit Core Schedule' : 'Update Profile Schedule'}
                                </button>
                            </div>
                        </div>
                    )}
                    {timetableSubTab === 'periods' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 className="text-xl font-bold">Standardized Period Slots</h3>
                                    <p className="text-sm text-slate-500">Define the granular lesson windows for the institution.</p>
                                </div>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Label (e.g. Period 1)" value={newPeriod.name} onChange={e => setNewPeriod({ ...newPeriod, name: e.target.value })} className="form-input text-xs w-40" />
                                    <input type="time" value={newPeriod.startTime} onChange={e => setNewPeriod({ ...newPeriod, startTime: e.target.value })} className="form-input text-xs w-28" />
                                    <input type="time" value={newPeriod.endTime} onChange={e => setNewPeriod({ ...newPeriod, endTime: e.target.value })} className="form-input text-xs w-28" />
                                    <button onClick={() => { if (newPeriod.name) { setLocalTimetableSettings(p => ({ ...p, periods: [...(p.periods || []), { id: `p_${Date.now()}`, ...newPeriod }] })); setNewPeriod({ name: '', startTime: '', endTime: '' }); } }} className="btn-primary h-10 px-4">Add Period</button>
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
                                        {localTimetableSettings.periods?.sort((a, b) => a.startTime.localeCompare(b.startTime)).map(p => (
                                            <tr key={p.id}>
                                                <td className="px-6 py-4 text-sm font-bold">{p.name}</td>
                                                <td className="px-6 py-4 font-mono text-xs">{p.startTime}</td>
                                                <td className="px-6 py-4 font-mono text-xs">{p.endTime}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button onClick={() => setLocalTimetableSettings(prev => ({ ...prev, periods: prev.periods.filter(x => x.id !== p.id) }))} className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"><XIcon className="w-5 h-5" /></button>
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
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2"><ShieldIcon className="w-5 h-5 text-indigo-500" /> Logic Constraint Builder</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Constraint Blueprint</label>
                                            <select value={newConstraint.type} onChange={e => setNewConstraint({ ...newConstraint, type: e.target.value as any })} className="form-select w-full text-sm">
                                                {Object.entries(CONSTRAINT_TYPE_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Target Subjects</label>
                                            <select multiple value={newConstraint.subjectIds} onChange={e => setNewConstraint({ ...newConstraint, subjectIds: Array.from(e.target.selectedOptions, (opt: HTMLOptionElement) => opt.value) })} className="form-input h-32 py-2 text-sm">
                                                {props.subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
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
                                                    <select value={newConstraint.day} onChange={e => setNewConstraint({ ...newConstraint, day: e.target.value })} className="form-select w-full text-xs">{(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']).map(d => <option key={d}>{d}</option>)}</select>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1">From</label><input type="time" value={newConstraint.startTime} onChange={e => setNewConstraint({ ...newConstraint, startTime: e.target.value })} className="form-input text-xs" /></div>
                                                    <div><label className="block text-[10px] font-bold text-slate-400 mb-1">Until</label><input type="time" value={newConstraint.endTime} onChange={e => setNewConstraint({ ...newConstraint, endTime: e.target.value })} className="form-input text-xs" /></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="mt-8 flex justify-end"><button onClick={handleAddConstraint} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Append Constraint</button></div>
                            </div>
                            <div className="space-y-3">
                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-1">Active AI Constraints</h5>
                                {localTimetableSettings.constraints?.map(c => (
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
                                        <button onClick={() => setLocalTimetableSettings(p => ({ ...p, constraints: p.constraints.filter(x => x.id !== c.id) }))} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg"><XIcon className="w-5 h-5" /></button>
                                    </div>
                                ))}
                                {(!localTimetableSettings.constraints || localTimetableSettings.constraints.length === 0) && (
                                    <p className="text-center py-20 text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] border-2 border-dashed rounded-3xl">No Logical Constraints Defined</p>
                                )}
                            </div>
                            <div className="flex justify-end mt-4"><button onClick={handleSaveTimetable} className="btn-primary">Save Rules & Constraints</button></div>
                        </div>
                    )}
                    {timetableSubTab === 'exams' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-lg font-bold mb-6">Assessment Windows</h3>
                                <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end bg-slate-50 dark:bg-slate-900/40 p-6 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Session Name</label><input type="text" placeholder="e.g. Mid Morning" value={newExamSession.name} onChange={e => setNewExamSession({ ...newExamSession, name: e.target.value })} className="form-input text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">Start</label><input type="time" value={newExamSession.startTime} onChange={e => setNewExamSession({ ...newExamSession, startTime: e.target.value })} className="form-input text-sm" /></div>
                                        <div><label className="block text-xs font-bold text-slate-400 uppercase mb-1.5">End</label><input type="time" value={newExamSession.endTime} onChange={e => setNewExamSession({ ...newExamSession, endTime: e.target.value })} className="form-input text-sm" /></div>
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
                                <textarea rows={8} value={localExamSettings.rules?.join('\n')} onChange={e => setLocalExamSettings({ ...localExamSettings, rules: e.target.value.split('\n') })} className="form-input w-full font-mono text-xs leading-loose" placeholder="One rule per line (e.g. No student should sit for more than two exams a day)"></textarea>
                                <p className="mt-3 text-[10px] text-slate-400 italic">These natural language rules guide the AI during exam schedule generation.</p>
                            </div>
                            <div className="flex justify-end pt-4"><button onClick={handleSaveExams} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Persist Exam Settings</button></div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'facilities' && (
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
                    </div>
                </div>
            )}

            {activeTab === 'subjects' && (
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
                    onSaveTimetableSettings={props.onSaveTimetableSettings!}
                    letterheadConfig={props.letterheadConfig || { headerImageUrl: null, stampImageUrl: null }}
                    onUpdateCompanyDetails={props.onUpdateCompanyDetails}
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
                    currentUser={props.currentUser}
                    timetableSettings={props.timetableSettings}
                    onSaveTimetableSettings={props.onSaveTimetableSettings}
                />
            )}



            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.625rem 1.5rem; border-radius: 0.75rem; cursor: pointer; transition: all 0.2s; border: none; box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.2); }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
                .btn-secondary { background-color: #f1f5f9; color: #475569; font-weight: 600; padding: 0.625rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
            `}</style>
        </div>
    );
};
