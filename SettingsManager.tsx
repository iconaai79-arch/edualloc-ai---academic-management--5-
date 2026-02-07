import React, { useState, useMemo, useEffect } from 'react';
import type {
    User, Department, Subject, Building, Room, AllocationRequest,
    TimetableEntry, SmsConfig, EmailConfig, LetterheadConfig,
    TimetableSettings, Course, EnrollmentRequest, AbsenceRequest, AcademicYear, Semester, Unavailability, RequestStatus, Institution, LessonRating, Conflict, FeedbackSubmission, AcademicLevel, StudentAttendance, Assessment, AssessmentMark, TimeOffRequest, TimeOffRequestStatus, StudentAbsenceRequest, StudentAbsenceRequestStatus, LecturerContract, ExamTimetableEntry, Role, CompanyDetails, MpesaTransaction, TransactionStatus, InvoiceItem, Invoice, Receipt, TimetableConstraint, TimetableConstraintType, Break, TimetablePeriod, ExtensionRequest, ExamTimetableSettings, UserUpdateData, BiometricConfig, SecurityAlert, ActivityLog, Visitor, Requisition, MpesaConfig, VoteHead, FeeStructure, FinancialPeriod, ScheduleProfile
} from './types';
import { AcademicYearManager } from './components/AcademicYearManager';
import { LocationSettings } from './components/LocationSettings';

import { BrandedPaper } from './components/BrandedPaper';
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
    MpesaIcon as MpesaIconIcon,
    CurrencyIcon as CurrencyIconIcon,
    RectangleStackIcon as RectangleStackIconIcon,
    ArrowUpTrayIcon as ArrowUpTrayIconIcon,
    EyeIcon as EyeIconIcon,
    ChevronDownIcon,
    MapIcon,
    PencilIcon
} from './components/icons';
import { SubjectManager } from './components/SubjectManager';
import { CourseManager } from './components/CourseManager';
import { DepartmentManager } from './components/DepartmentManager';
import { BuildingManager } from './components/BuildingManager';
import { AcademicLevelManager } from './components/AcademicLevelManager';
import { Tooltip } from './components/Tooltip';
import { timeToMinutes } from './utils/timeUtils';

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
    onAddTransaction?: (data: Omit<MpesaTransaction, 'id' | 'transactionId' | 'timestamp' | 'status'>, items: InvoiceItem[]) => Promise<TransactionStatus>;
    onAddExtensionRequest?: (reason: string) => void;
    onLogAction?: (action: string) => void;
    letterheadConfig: LetterheadConfig;
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
}

const CONSTRAINT_TYPE_LABELS: Record<TimetableConstraintType, string> = {
    consecutive_subjects: 'Must be consecutive',
    same_day_subjects: 'Must be on the same day',
    same_day_must_subjects: 'Must be on the same day (Strict)',
    no_break_between_subjects: 'No break between',
    subject_time_off: 'Specific Time Restriction',
    non_consecutive_subjects: 'Cannot be consecutive',
    different_day_subjects: 'Must be on different days',
    // FIXED: Added missing 'same_time_subjects' property to satisfy Record<TimetableConstraintType, string>
    same_time_subjects: 'Option Block (Concurrent)'
};

export const SettingsManager: React.FC<SettingsManagerProps> = (props) => {
    const [activeTab, setActiveTab] = useState('general');
    const [timetableSubTab, setTimetableSubTab] = useState<'hours' | 'periods' | 'constraints' | 'exams'>('hours');
    const [generalSubTab, setGeneralSubTab] = useState<'profile' | 'academic_config' | 'location' | 'branding'>('profile');
    const [showPaperPreview, setShowPaperPreview] = useState(false);

    const isSchool = props.currentInstitution?.institutionType === 'Primary' || props.currentInstitution?.institutionType === 'Secondary';

    // External tab navigation sync
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
    const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);

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
        setInstProfile({
            email: props.currentInstitution?.email || '',
            phoneNumber: props.currentInstitution?.phoneNumber || '',
            useAllocationRequests: props.currentInstitution?.useAllocationRequests ?? true
        });
    }, [props.currentInstitution]);

    // --- Profile Switching Logic ---
    useEffect(() => {
        if (selectedProfileId === 'default') {
            setLocalTimetableSettings(props.timetableSettings);
        } else {
            const profile = props.currentInstitution?.scheduleProfiles?.find(p => p.id === selectedProfileId);
            if (profile) {
                // Merge profile settings with default settings for missing fields
                setLocalTimetableSettings(prev => ({
                    ...prev,
                    ...profile,
                    // Ensure arrays are not undefined if missing in profile
                    operatingDays: profile.operatingDays || prev.operatingDays,
                    periods: profile.periods || [],
                    breaks: profile.breaks || [],
                }));
            }
        }
    }, [selectedProfileId, props.currentInstitution]);

    const handleSaveInstitutionProfile = () => {
        if (!props.currentInstitution) return;
        props.onUpdateInstitution?.(props.currentInstitution.id, instProfile);
        alert('Institution records updated.');
    };

    const handleSaveTimetable = () => {
        // Feature: Intelligent Save Routing
        // 1. If we are saving constraints, we always save to global settings (preserving default hours)
        if (timetableSubTab === 'constraints') {
            props.onSaveTimetableSettings?.({
                ...props.timetableSettings, // Keep default hours/breaks safe
                constraints: localTimetableSettings.constraints
            });
            alert('Generation rules usage updated globally.');
            return;
        }

        // 2. If we are saving hours/periods/breaks
        if (selectedProfileId === 'default') {
            props.onSaveTimetableSettings?.(localTimetableSettings);
            alert('Default timetable configuration updated.');
        } else {
            if (props.currentInstitution && props.onUpdateInstitution) {
                const updatedProfiles = (props.currentInstitution.scheduleProfiles || []).map(p =>
                    p.id === selectedProfileId
                        ? {
                            ...p,
                            operatingDays: localTimetableSettings.operatingDays,
                            startTime: localTimetableSettings.startTime,
                            endTime: localTimetableSettings.endTime,
                            periods: localTimetableSettings.periods,
                            cellSpanMinutes: localTimetableSettings.cellSpanMinutes,
                            breaks: localTimetableSettings.breaks
                        }
                        : p
                );
                props.onUpdateInstitution(props.currentInstitution.id, { scheduleProfiles: updatedProfiles });

                const profileName = props.currentInstitution.scheduleProfiles?.find(p => p.id === selectedProfileId)?.name;
                alert(`Profile "${profileName}" updated.`);
            }
        }
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

    const mainTabs = useMemo(() => {
        return [
            { id: 'general', label: 'General', icon: <InformationCircleIcon className="w-5 h-5 mr-2" /> },
            { id: 'timetable', label: 'Timetable Rules', icon: <ClockIcon className="w-5 h-5 mr-2" /> },
            { id: 'calendar', label: 'Calendar', icon: <CalendarDaysIcon className="w-5 h-5 mr-2" /> },
            { id: 'subjects', label: 'Subjects', icon: <BookOpenIcon className="w-5 h-5 mr-2" /> },
            { id: 'courses', label: isSchool ? 'Grades' : 'Courses', icon: <AcademicCapIcon className="w-5 h-5 mr-2" /> },
            { id: 'facilities', label: 'Facilities', icon: <BuildingOfficeIcon className="w-5 h-5 mr-2" /> },
        ];
    }, [props.currentUser.role, isSchool]);

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

            {activeTab === 'general' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        {['profile', 'academic_config', 'location', 'branding', 'ai_assistant'].map((sub) => (
                            <button
                                key={sub}
                                onClick={() => setGeneralSubTab(sub as any)}
                                className={`py-2 px-4 border-b-2 font-black text-[10px] uppercase tracking-widest transition-colors capitalize ${generalSubTab === sub ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'
                                    }`}
                            >
                                {sub.replace('_', ' ')}
                            </button>
                        ))}
                    </div>

                    {generalSubTab === 'profile' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <BuildingOfficeIcon className="w-5 h-5 text-indigo-500" />
                                Institutional Records
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Official Name</label>
                                    <input type="text" value={props.currentInstitution?.name || ''} readOnly className="form-input bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed font-bold" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Identity Code</label>
                                    <input type="text" value={props.currentInstitution?.institutionCode || ''} readOnly className="form-input bg-slate-50 dark:bg-slate-900/50 cursor-not-allowed font-mono text-indigo-600" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">System Email</label>
                                    <input type="email" value={instProfile.email} onChange={e => setInstProfile({ ...instProfile, email: e.target.value })} className="form-input" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Admin Phone</label>
                                    <input type="tel" value={instProfile.phoneNumber} onChange={e => setInstProfile({ ...instProfile, phoneNumber: e.target.value })} className="form-input" />
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button onClick={handleSaveInstitutionProfile} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Update Profile</button>
                            </div>
                        </div>
                    )}

                    {generalSubTab === 'academic_config' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                            <h4 className="font-bold text-lg mb-6 flex items-center gap-2">
                                <ShieldIcon className="w-5 h-5 text-indigo-500" />
                                Governance Policies
                            </h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <input
                                        type="checkbox"
                                        id="use-alloc-reqs"
                                        checked={instProfile.useAllocationRequests}
                                        onChange={e => setInstProfile({ ...instProfile, useAllocationRequests: e.target.checked })}
                                        className="h-6 w-6 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <label htmlFor="use-alloc-reqs" className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                            Enable Collaborative Allocation Requests
                                        </label>
                                        <p className="text-xs text-slate-400">Allows {isSchool ? 'teachers' : 'lecturers'} to submit unit preferences before generation.</p>
                                    </div>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-end">
                                <button onClick={handleSaveInstitutionProfile} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Synchronize Policies</button>
                            </div>
                        </div>
                    )}

                    {generalSubTab === 'location' && (
                        <LocationSettings
                            institution={props.currentInstitution}
                            onSave={(id, data) => props.onUpdateInstitution && props.onUpdateInstitution(id, data)}
                        />
                    )}

                    {generalSubTab === 'branding' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex justify-between items-center mb-8">
                                    <h4 className="font-bold text-lg flex items-center gap-2">
                                        <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                        Visual Brand Identity
                                    </h4>
                                    <button onClick={() => setShowPaperPreview(!showPaperPreview)} className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline flex items-center gap-1">
                                        <EyeIcon className="w-4 h-4" />
                                        {showPaperPreview ? 'Hide Paper' : 'Preview Documents'}
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
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
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Corporate Seal / Logo</label>
                                            <div className="flex items-center gap-6">
                                                <div className="h-20 w-20 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
                                                    {props.logoUrl ? <img src={props.logoUrl} alt="Logo" className="h-full w-full object-contain" /> : <BuildingOfficeIcon className="w-8 h-8 text-slate-200" />}
                                                </div>
                                                <label className="btn-secondary text-[10px] h-10 px-4 flex items-center justify-center cursor-pointer">
                                                    Update Emblem
                                                    <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} />
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Document Header (LPO/Receipts)</label>
                                            <label className="btn-secondary h-24 w-full flex flex-col items-center justify-center gap-2 cursor-pointer border-dashed">
                                                <ArrowUpTrayIcon className="w-6 h-6 text-slate-300" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Header Banner</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'letterhead')} />
                                            </label>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Official Report Footer</label>
                                            <label className="btn-secondary h-16 w-full flex items-center justify-center gap-2 cursor-pointer border-dashed">
                                                <ArrowUpTrayIcon className="w-4 h-4 text-slate-300" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Upload Footer Strip</span>
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleImageUpload(e, 'footer')} />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {showPaperPreview && (
                                <div className="animate-fade-in-up bg-slate-200 dark:bg-slate-950 p-12 rounded-3xl flex justify-center border-4 border-dashed border-slate-300 dark:border-slate-800">
                                    <BrandedPaper
                                        institution={props.currentInstitution}
                                        letterheadConfig={props.letterheadConfig}
                                        footerImageUrl={props.footerImageUrl}
                                    >
                                        <div className="flex flex-col items-center justify-center h-full text-center opacity-10 py-32">
                                            <InformationCircleIcon className="w-24 h-24 text-slate-900 mb-6" />
                                            <p className="text-2xl font-black text-slate-900 uppercase tracking-[0.2em]">Live Document Preview</p>
                                        </div>
                                    </BrandedPaper>
                                </div>
                            )}
                        </div>
                    )}

                    {generalSubTab === 'ai_assistant' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 animate-fade-in-up">
                            <div className="flex justify-between items-center mb-8">
                                <h4 className="font-bold text-lg flex items-center gap-2">
                                    <SparklesIcon className="w-5 h-5 text-indigo-500" />
                                    AI Intelligence Settings
                                </h4>
                            </div>

                            <div className="space-y-8">
                                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 ml-1">AI Reasoning Engine</label>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setInstProfile({ ...instProfile, aiModelTier: 'free' })}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${instProfile.aiModelTier === 'free' || !instProfile.aiModelTier ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold">Efficiency (Flash)</span>
                                                {(!instProfile.aiModelTier || instProfile.aiModelTier === 'free') && <CheckIcon className="w-5 h-5 text-indigo-600" />}
                                            </div>
                                            <p className="text-xs text-slate-500">Best for quick responses and low-cost basic automation. Uses Gemini Flash models.</p>
                                        </button>

                                        <button
                                            onClick={() => setInstProfile({ ...instProfile, aiModelTier: 'premium' })}
                                            className={`p-4 rounded-xl border-2 text-left transition-all ${instProfile.aiModelTier === 'premium' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'}`}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-bold">Reasoning (Pro)</span>
                                                {instProfile.aiModelTier === 'premium' && <CheckIcon className="w-5 h-5 text-indigo-600" />}
                                            </div>
                                            <p className="text-xs text-slate-500">Enhanced intelligence for complex timetable generation and deep reasoning. Uses Gemini Pro models.</p>
                                        </button>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 p-5 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                                    <InformationCircleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
                                    <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                                        Note: "Reasoning" models may take longer to process complex generation requests but provide significantly better optimized results for dense conflict scenarios.
                                    </p>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button onClick={handleSaveInstitutionProfile} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Update Intelligence Configuration</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'timetable' && (
                <div className="space-y-8 animate-fade-in-up">
                    <div className="flex border-b border-slate-200 dark:border-slate-700">
                        {[
                            { id: 'hours', label: 'Day & Time Span' },
                            { id: 'periods', label: 'Period Slots' },
                            { id: 'constraints', label: 'Logic Constraints' },
                            { id: 'exams', label: 'Exam Settings' },
                        ].map((sub) => (
                            <button
                                key={sub.id}
                                onClick={() => setTimetableSubTab(sub.id as any)}
                                className={`py-2 px-4 border-b-2 font-black text-[10px] uppercase tracking-widest transition-colors ${timetableSubTab === sub.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent text-slate-500'
                                    }`}
                            >
                                {sub.label}
                            </button>
                        ))}
                    </div>

                    {timetableSubTab === 'hours' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-fade-in">
                            {/* Grid Profile Selector */}
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div>
                                    <h4 className="font-bold text-sm text-slate-700 dark:text-slate-300">Configuration Profile</h4>
                                    <p className="text-xs text-slate-400">Manage different schedule variations (e.g. Regular, Exam, Holiday)</p>
                                </div>
                                <div className="flex gap-3 items-center">
                                    <select
                                        value={selectedProfileId}
                                        onChange={(e) => {
                                            setSelectedProfileId(e.target.value);
                                            // Ideally, switch the displayed settings to match the selected profile
                                        }}
                                        className="form-select py-2 pl-3 pr-8 text-xs font-bold uppercase tracking-wide bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg"
                                    >
                                        <option value="default">Default Schedule</option>
                                        {props.currentInstitution?.scheduleProfiles?.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={() => {
                                            const name = prompt("Enter name for new profile (e.g., 'Exam Week', 'Ramadhan Schedule'):");
                                            if (name && props.currentInstitution && props.onUpdateInstitution) {
                                                const newProfile: ScheduleProfile = {
                                                    id: `profile_${Date.now()}`,
                                                    name: name.trim(),
                                                    operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                                                    startTime: '08:00',
                                                    endTime: '17:00',
                                                    periods: [],
                                                    cellSpanMinutes: 60,
                                                    breaks: []
                                                };
                                                props.onUpdateInstitution(props.currentInstitution.id, {
                                                    scheduleProfiles: [...(props.currentInstitution.scheduleProfiles || []), newProfile]
                                                });
                                            }
                                        }}
                                        className="btn-primary h-9 w-9 flex items-center justify-center p-0 rounded-full shadow-lg shadow-indigo-100 transition-transform hover:scale-105"
                                        title="Add New Profile"
                                    >
                                        <PlusIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="text-lg font-bold mb-4">Operational Schedule</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-3 ml-1">Operating Days</label>
                                        <div className="flex flex-wrap gap-2">
                                            {allDays.map(day => (
                                                <button
                                                    key={day}
                                                    onClick={() => handleToggleOperatingDay(day)}
                                                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${localTimetableSettings.operatingDays?.includes(day as any) ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    {day.substring(0, 3)}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Opening Time</label>
                                            <input type="time" value={localTimetableSettings.startTime} onChange={e => setLocalTimetableSettings({ ...localTimetableSettings, startTime: e.target.value })} className="form-input" />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Closing Time</label>
                                            <input type="time" value={localTimetableSettings.endTime} onChange={e => setLocalTimetableSettings({ ...localTimetableSettings, endTime: e.target.value })} className="form-input" />
                                        </div>
                                    </div>
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
                                <div className="space-y-3">
                                    {(localTimetableSettings.breaks || []).map(b => (
                                        <div key={b.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <span className="font-bold text-sm">{b.name}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs font-mono bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">{b.startTime} - {b.endTime}</span>
                                                <button onClick={() => setLocalTimetableSettings(p => ({ ...p, breaks: p.breaks.filter(x => x.id !== b.id) }))} className="text-red-500 hover:text-red-700"><XIcon className="w-4 h-4" /></button>
                                            </div>
                                        </div>
                                    ))}
                                    {(localTimetableSettings.breaks || []).length === 0 && <p className="text-sm text-slate-400 italic text-center py-4">No breaks defined.</p>}
                                </div>
                            </div>

                            <div className="flex justify-end pt-4">
                                <button onClick={handleSaveTimetable} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Synchronize Operations</button>
                            </div>
                        </div>
                    )}

                    {timetableSubTab === 'periods' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 animate-fade-in">
                            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 p-6 rounded-2xl">
                                <div>
                                    <h3 className="text-lg font-bold">Defined Lesson Slots</h3>
                                    <p className="text-xs text-slate-500">Fixed duration blocks for {isSchool ? 'classes' : 'lectures'}.</p>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 ml-1">Period Name</label>
                                        <input type="text" placeholder="e.g. Morning 1" value={newPeriod.name} onChange={e => setNewPeriod({ ...newPeriod, name: e.target.value })} className="form-input text-xs w-32" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 ml-1">Start</label>
                                        <input type="time" value={newPeriod.startTime} onChange={e => setNewPeriod({ ...newPeriod, startTime: e.target.value })} className="form-input text-xs w-28" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 ml-1">End</label>
                                        <input type="time" value={newPeriod.endTime} onChange={e => setNewPeriod({ ...newPeriod, endTime: e.target.value })} className="form-input text-xs w-28" />
                                    </div>
                                    <button
                                        onClick={() => {
                                            if (newPeriod.name && newPeriod.startTime && newPeriod.endTime) {
                                                if (editingPeriodId) {
                                                    // Update existing period
                                                    setLocalTimetableSettings(p => ({
                                                        ...p,
                                                        periods: (p.periods || []).map(period =>
                                                            period.id === editingPeriodId
                                                                ? { ...period, ...newPeriod }
                                                                : period
                                                        ).sort((a, b) => a.startTime.localeCompare(b.startTime))
                                                    }));
                                                    setEditingPeriodId(null);
                                                    setNewPeriod({ name: '', startTime: '', endTime: '' });
                                                } else {
                                                    // Add new period
                                                    const newItem: TimetablePeriod = { id: `p_${Date.now()}`, ...newPeriod };
                                                    setLocalTimetableSettings(p => ({ ...p, periods: [...(p.periods || []), newItem].sort((a, b) => a.startTime.localeCompare(b.startTime)) }));
                                                    setNewPeriod({ name: '', startTime: '', endTime: '' });
                                                }
                                            }
                                        }}
                                        disabled={!newPeriod.name || !newPeriod.startTime || !newPeriod.endTime}
                                        className={`h-9 px-4 mb-[2px] shadow-indigo-100 transition-colors flex items-center justify-center gap-2 ${editingPeriodId
                                                ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200'
                                                : 'btn-primary'
                                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                                        title={editingPeriodId ? "Update Period Slot" : "Add Period Slot"}
                                    >
                                        {editingPeriodId ? (
                                            <>
                                                <CheckIcon className="w-5 h-5" />
                                                <span className="text-xs font-bold">Update</span>
                                            </>
                                        ) : (
                                            <PlusIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                    {editingPeriodId && (
                                        <button
                                            onClick={() => {
                                                setEditingPeriodId(null);
                                                setNewPeriod({ name: '', startTime: '', endTime: '' });
                                            }}
                                            className="h-9 px-3 mb-[2px] text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all flex items-center gap-1"
                                            title="Cancel Editing"
                                        >
                                            <XIcon className="w-4 h-4" />
                                            <span className="text-xs font-bold">Cancel</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-3">
                                {(localTimetableSettings.periods || []).map(p => (
                                    <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors">
                                        <div className="flex items-center gap-4">
                                            <div className="h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 font-bold text-xs">
                                                {p.startTime.replace(':', '')}
                                            </div>
                                            <div>
                                                <span className="font-bold text-sm block text-slate-700 dark:text-slate-200">{p.name}</span>
                                                <span className="text-xs font-mono text-slate-400">{p.startTime} - {p.endTime}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-1">
                                            <button
                                                onClick={() => {
                                                    setEditingPeriodId(p.id);
                                                    setNewPeriod({ name: p.name, startTime: p.startTime, endTime: p.endTime });
                                                }}
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                title="Edit Period"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => setLocalTimetableSettings(prev => ({ ...prev, periods: prev.periods.filter(x => x.id !== p.id) }))} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><XIcon className="w-4 h-4" /></button>
                                        </div>
                                    </div>
                                ))}
                                {(localTimetableSettings.periods || []).length === 0 && (
                                    <div className="text-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                        <ClockIcon className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                                        <p className="text-sm text-slate-400 font-bold">No periods defined yet</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-end pt-4">
                                <button onClick={handleSaveTimetable} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Save Periods</button>
                            </div>
                        </div>
                    )}

                    {timetableSubTab === 'constraints' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold">Generation Logic Constraints</h3>
                                <div className="flex gap-2">
                                    <select
                                        value={newConstraint.type}
                                        onChange={e => setNewConstraint({ ...newConstraint, type: e.target.value as any })}
                                        className="form-select text-xs w-48"
                                    >
                                        {(Object.keys(CONSTRAINT_TYPE_LABELS) as TimetableConstraintType[]).map(key => (
                                            <option key={key} value={key}>{CONSTRAINT_TYPE_LABELS[key]}</option>
                                        ))}
                                    </select>
                                    <button onClick={handleAddConstraint} className="btn-primary px-4 text-xs">Add Rule</button>
                                </div>
                            </div>
                            <div className="space-y-4">
                                {(localTimetableSettings.constraints || []).map(c => (
                                    <div key={c.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                        <div>
                                            <span className="text-xs font-black uppercase text-indigo-500 tracking-widest block mb-1">{CONSTRAINT_TYPE_LABELS[c.type]}</span>
                                            <p className="text-sm font-bold">{c.description}</p>
                                        </div>
                                        <button onClick={() => setLocalTimetableSettings(prev => ({ ...prev, constraints: prev.constraints.filter(x => x.id !== c.id) }))} className="text-slate-400 hover:text-red-500"><XIcon className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                {(localTimetableSettings.constraints || []).length === 0 && <div className="text-center py-10 text-slate-400 italic">No constraints defined.</div>}
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={handleSaveTimetable} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Save Rules</button>
                            </div>
                        </div>
                    )}

                    {timetableSubTab === 'exams' && (
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-8">
                            <div>
                                <h3 className="text-lg font-bold mb-4">Exam Session Windows</h3>
                                <div className="flex gap-2 mb-6">
                                    <input type="text" placeholder="Session Name (e.g. Morning)" value={newExamSession.name} onChange={e => setNewExamSession({ ...newExamSession, name: e.target.value })} className="form-input flex-grow" />
                                    <input type="time" value={newExamSession.startTime} onChange={e => setNewExamSession({ ...newExamSession, startTime: e.target.value })} className="form-input w-32" />
                                    <input type="time" value={newExamSession.endTime} onChange={e => setNewExamSession({ ...newExamSession, endTime: e.target.value })} className="form-input w-32" />
                                    <button onClick={handleAddExamSession} className="btn-primary px-6">Add</button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {(localExamSettings.sessionsPerDay || []).map(sess => (
                                        <div key={sess.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center">
                                            <div>
                                                <p className="font-bold">{sess.name}</p>
                                                <p className="text-xs font-mono text-slate-500">{sess.startTime} - {sess.endTime}</p>
                                            </div>
                                            <button onClick={() => handleDeleteExamSession(sess.id)} className="text-red-500"><XIcon className="w-4 h-4" /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={handleSaveExams} className="btn-primary h-12 px-8 shadow-lg shadow-indigo-100">Update Configuration</button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Other main tabs (Finance, etc.) would go here if not already handled by structure above */}
        </div>
    );
};