


import React, { useState, useEffect, useMemo, useCallback, useTransition, Suspense } from 'react';
import type { User, Subject, Course, Room, Department, AcademicYear, Semester, ExamTimetableEntry, TimetableSettings, Building, AcademicLevel, LetterheadConfig, EmailConfig, Institution, SmsConfig, ExamTimetableSettings, AllocationRequest, TimeOffRequest, TimetableEntry, Assessment, AssessmentMark, ActivityLog, DisciplineIncident } from '../types';
import { isSuperAdminUser } from '../types';
import { generateExamTimetable } from '../services/geminiService';
import { generateExamTimetablePdf } from '../services/pdfService';
import { apiService } from '../services/apiService';
import { ExamTimetableGrid } from './ExamTimetableGrid';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { Cog8ToothIcon } from './icons/Cog8ToothIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { DocumentArrowDownIcon } from './icons/DocumentArrowDownIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CommandLineIcon } from './icons/CommandLineIcon';
import { BeakerIcon } from './icons/BeakerIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { BarChart3Icon } from './icons/BarChart3Icon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { UserPlusIcon } from './icons/UserPlusIcon';
import { ShieldExclamationIcon } from './icons/ShieldExclamationIcon';
import { HomeIcon } from './icons/HomeIcon';
import { WrenchIcon } from './icons/WrenchIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';
import { generateStandardExamTimetable } from '../utils/examUtils';

// Branded loading fallback for asynchronously loaded academic sub-modules
const AcademicTabLoader: React.FC<{ label?: string }> = ({ label = 'Loading Academic Module...' }) => (
    <div className="flex flex-col items-center justify-center p-12 min-h-[360px] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-500 dark:text-slate-400 font-semibold tracking-wide animate-pulse">{label}</p>
    </div>
);

// Lazy-load heavy components so they parse asynchronously without blocking initial load or tab switching
const ExamUnitsManager = React.lazy(() =>
    import('./Academics/ExamUnitsManager').then(m => ({ default: m.ExamUnitsManager }))
);
const StudentEnrollmentManager = React.lazy(() =>
    import('./common/StudentEnrollmentManager').then(m => ({ default: m.StudentEnrollmentManager }))
);
const Futuristic3DExamAnalyticsDashboard = React.lazy(() =>
    import('./Academics/Futuristic3DExamAnalyticsDashboard').then(m => ({ default: m.Futuristic3DExamAnalyticsDashboard }))
);
const AcademicReportsHub = React.lazy(() =>
    import('./Academics/AcademicReportsHub').then(m => ({ default: m.AcademicReportsHub }))
);
const TimetableManagerModule = React.lazy(() =>
    import('./Academics/TimetableManagerModule').then(m => ({ default: m.TimetableManagerModule }))
);
const CbeStrandRubricManager = React.lazy(() =>
    import('./Academics/CbeStrandRubricManager').then(m => ({ default: m.CbeStrandRubricManager }))
);
const CbeCoreCompetenciesManager = React.lazy(() =>
    import('./Academics/CbeCoreCompetenciesManager').then(m => ({ default: m.CbeCoreCompetenciesManager }))
);
const CbePortfolioVaultManager = React.lazy(() =>
    import('./Academics/CbePortfolioVaultManager').then(m => ({ default: m.CbePortfolioVaultManager }))
);
const MontessoriAssessmentManager = React.lazy(() =>
    import('./Academics/MontessoriAssessmentManager').then(m => ({ default: m.MontessoriAssessmentManager }))
);
const AdvancedAttendanceManager = React.lazy(() =>
    import('./Academics/AdvancedAttendanceManager').then(m => ({ default: m.AdvancedAttendanceManager }))
);
const LessonsAllocationManager = React.lazy(() =>
    import('./Academics/LessonsAllocationManager').then(m => ({ default: m.LessonsAllocationManager }))
);
const TeacherLessonPlanManager = React.lazy(() =>
    import('./Academics/TeacherLessonPlanManager').then(m => ({ default: m.TeacherLessonPlanManager }))
);
const RevisionMarketplaceManager = React.lazy(() =>
    import('./Academics/RevisionMarketplaceManager').then(m => ({ default: m.RevisionMarketplaceManager }))
);
const LeavingCertificateManager = React.lazy(() =>
    import('./Academics/LeavingCertificateManager').then(m => ({ default: m.LeavingCertificateManager }))
);
const StudentSubscriptionPlanManager = React.lazy(() =>
    import('./common/StudentSubscriptionPlanManager').then(m => ({ default: m.StudentSubscriptionPlanManager }))
);
const ExamInsights = React.lazy(() =>
    import('./Academics/ExamInsights').then(m => ({ default: m.ExamInsights }))
);
const DisciplineManager = React.lazy(() =>
    import('./Academics/DisciplineManager').then(m => ({ default: m.DisciplineManager }))
);
const SettingsManager = React.lazy(() =>
    import('./SettingsManager').then(m => ({ default: m.SettingsManager }))
);
const TimetableWizard = React.lazy(() =>
    import('./TimetableWizard').then(m => ({ default: m.TimetableWizard }))
);
const StudentPromotionWizard = React.lazy(() =>
    import('./Academics/StudentPromotionWizard').then(m => ({ default: m.StudentPromotionWizard }))
);

interface AcademicsOfficerViewProps {
    currentUser?: User;
    subjects?: Subject[];
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    courses?: Course[];
    onUpdateCourse?: (courseId: string, updatedData: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
    users?: User[];
    rooms?: Room[];
    assessments?: Assessment[];
    marks?: AssessmentMark[];
    activityLog?: ActivityLog[];
    incidents?: DisciplineIncident[];
    onAddIncident?: (incident: any) => Promise<void>;
    // Added add/delete/update room
    onAddRoom?: (roomData: Omit<Room, 'id' | 'institutionId'>) => void;
    onUpdateRoom?: (roomId: string, data: Partial<Omit<Room, 'id' | 'institutionId'>>) => void;
    onDeleteRoom?: (roomId: string) => void;
    onImportRooms?: (rooms: Omit<Room, 'id' | 'institutionId'>[]) => void;

    departments?: Department[];
    onAddDepartment?: (name: string) => Promise<void> | void;
    onUpdateDepartment?: (id: string, name: string) => void;
    onDeleteDepartment?: (id: string) => void;
    onImportDepartments?: (departments: Omit<Department, 'id' | 'institutionId'>[]) => Promise<void>;

    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    // Updated to accept full ExamTimetableEntry array
    onExamTimetableGenerated?: (entries: ExamTimetableEntry[], academicYearId: string, semesterId: string) => Promise<void>;
    examTimetable?: ExamTimetableEntry[];
    getSubjectById?: (id: string) => Subject | undefined;
    getLecturerById?: (id: string) => User | undefined;
    getRoomById?: (id: string) => Room | undefined;
    courseSizes?: Map<string, number>;
    academicYears?: AcademicYear[];
    onAddAcademicYear?: (data: Omit<AcademicYear, 'id' | 'institutionId' | 'status'>) => void;
    onUpdateAcademicYear?: (yearId: string, data: Partial<Omit<AcademicYear, 'id' | 'institutionId'>>) => Promise<void>;
    onDeleteAcademicYear?: (yearId: string) => void;
    semesters?: Semester[];
    onAddSemester?: (data: Omit<Semester, 'id' | 'institutionId'>) => void;
    onUpdateSemester?: (semesterId: string, data: Partial<Omit<Semester, 'id' | 'institutionId' | 'academicYearId'>>) => Promise<void>;
    onDeleteSemester?: (semesterId: string) => void;
    timetableSettings?: TimetableSettings;
    onSaveTimetableSettings?: (config: TimetableSettings) => void;
    onPublishTimetable?: (config: any) => void;
    onAssociateSubjectToCourseLevel?: (subjectId: string, levelId: string) => void;
    onDisassociateSubjectFromCourseLevel?: (subjectId: string, levelId: string) => void;
    lessonRatings?: any[];
    buildings?: Building[];
    onAddBuilding?: (name: string) => Promise<boolean>;
    onAddBuildings?: (buildings: Omit<Building, 'id' | 'institutionId'>[]) => Promise<void>;
    onUpdateBuilding?: (buildingId: string, data: Partial<Omit<Building, 'id' | 'institutionId'>>) => void;
    onDeleteBuilding?: (buildingId: string) => void;

    academicLevels?: AcademicLevel[];
    letterheadConfig?: LetterheadConfig;
    logoUrl?: string | null;
    footerImageUrl?: string | null;
    onUpdateLogo?: (url: string | null) => void;
    onUpdateFooterImage?: (url: string | null) => void;
    onSaveLetterheadConfig?: (config: LetterheadConfig) => void;
    emailConfig?: EmailConfig;
    onSaveEmailConfig?: (config: EmailConfig) => void;
    onSendTestEmail?: (recipient: string) => Promise<{ success?: boolean; message?: string; }>;
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
    smsConfig?: SmsConfig;
    studentAttendances?: any[];
    onSaveAttendance?: (lessonIdOrAttendances: any, data?: any) => Promise<void>;
    onAddAssessment?: (assessment: Assessment) => Promise<void>;
    onDeleteAssessment?: (assessmentId: string) => Promise<void>;
    onSaveAssessmentMarks?: (assessmentId: string, marks: AssessmentMark[]) => Promise<void>;
    onAccessAlumnaPortal?: (school?: any) => void;
    schoolRegistry?: any[];
    onTimetableGenerated?: (entries: any, academicYearId?: string, semesterId?: string) => Promise<void>;
    allocations?: any[];
    companyDetails?: any;
    examTimetableSettings?: any;
    onLogAction?: (message: string) => Promise<void> | void;
    themeColor?: string;
    timeOffRequests?: any[];
}

export const AcademicsOfficerView: React.FC<AcademicsOfficerViewProps> = (props) => {
    const {
        currentInstitution,
        currentUser,
        companyDetails,
        subjects = [],
        courses = [],
        rooms = [],
        users = [],
        departments = [],
        examTimetable = [],
        activeAcademicYear,
        activeSemester,
        courseSizes = new Map(),
        examTimetableSettings,
        timetableSettings,
        buildings = [],
        onExamTimetableGenerated,
        getSubjectById,
        getLecturerById,
        getRoomById,
        onLogAction,
        letterheadConfig,
        emailConfig,
        smsConfig,
        logoUrl,
        footerImageUrl,
        assessments = [],
        marks = [],
        activityLog = [],
        incidents = [], 
        onAddIncident = async () => {}, 
        onAddAssessment = async () => {}, 
        onDeleteAssessment = async () => {}, 
        onSaveAssessmentMarks = async () => {},
        onAccessAlumnaPortal = () => {}, 
        schoolRegistry = [], 
        onTimetableGenerated = async () => {},
        onAssociateSubjectToCourseLevel,
        onDisassociateSubjectFromCourseLevel,
        academicLevels = [],
        allocations = []
    } = props;

    const handleLogAction = useCallback(async (msg: string) => {
        if (onLogAction) {
            await onLogAction(msg);
        }
    }, [onLogAction]);

    const [activeTab, setActiveTab] = useState<'home' | 'timetable' | 'exam_units' | 'attendance' | 'students' | 'teachers' | 'lessons' | 'settings' | 'exam_insights' | 'reports' | 'people' | 'discipline' | 'revision_marketplace' | 'student_subscriptions' | 'lesson_plans' | 'tools'>('home');
    const [isTabPending, startTabTransition] = useTransition();
    const [hasLoadedExamUnits, setHasLoadedExamUnits] = useState(false);

    // Wrap tab changes in startTransition so React can keep the UI interactive
    // while the expensive ExamUnitsManager initializes in the background
    const handleTabChange = useCallback((tab: typeof activeTab) => {
        if (tab === 'exam_units') {
            setHasLoadedExamUnits(true);
        }
        startTabTransition(() => setActiveTab(tab));
    }, []);

    // Automatically pre-load ExamUnitsManager after a short idle timeout,
    // so it is already warm in memory before the user clicks
    useEffect(() => {
        if (activeTab === 'exam_units') {
            setHasLoadedExamUnits(true);
            return;
        }
        const timer = setTimeout(() => {
            setHasLoadedExamUnits(true);
        }, 1200);
        return () => clearTimeout(timer);
    }, [activeTab]);

    // Pre-warm academic records using the debounced background prefetcher
    useEffect(() => {
        if (!currentInstitution?.id) return;
        apiService.prefetchAcademicRecords(currentInstitution.id).catch(() => {});
    }, [currentInstitution?.id]);
    const [toolsSubTab, setToolsSubTab] = useState<'lesson_plans' | 'revision_marketplace' | 'leaving_certificates'>('lesson_plans');
    const [examViewSubTab, setExamViewSubTab] = useState<'summative' | 'cbe_strands' | 'cbe_competencies' | 'cbe_portfolio' | 'montessori'>('summative');
    const [isBulkWizardOpen, setIsBulkWizardOpen] = useState(false);
    const [bulkType, setBulkType] = useState<'students' | 'teachers'>('students');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [examUnitSearch, setExamUnitSearch] = useState('');
    const [generationMode, setGenerationMode] = useState<'ai' | 'standard'>('ai');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isPromotionWizardOpen, setIsPromotionWizardOpen] = useState(false);

    // O(1) Indexed Maps to eliminate expensive array scans across renders
    const subjectsMap = useMemo(() => {
        const map = new Map<string, Subject>();
        (subjects || []).forEach(s => { if (s && s.id) map.set(s.id, s); });
        return map;
    }, [subjects]);

    const usersMap = useMemo(() => {
        const map = new Map<string, User>();
        (users || []).forEach(u => { if (u && u.id) map.set(u.id, u); });
        return map;
    }, [users]);

    const roomsMap = useMemo(() => {
        const map = new Map<string, Room>();
        (rooms || []).forEach(r => { if (r && r.id) map.set(r.id, r); });
        return map;
    }, [rooms]);

    const students = useMemo(() => (users || []).filter(u => u && u.role === 'student'), [users]);
    const teachers = useMemo(() => (users || []).filter(u => u && (u.role === 'lecturer' || u.role === 'teacher') && !isSuperAdminUser(u)), [users]);

    const safeGetSubjectById = useCallback((id: string) => {
        if (typeof getSubjectById === 'function') {
            const found = getSubjectById(id);
            if (found) return found;
        }
        return subjectsMap.get(id);
    }, [getSubjectById, subjectsMap]);

    const safeGetLecturerById = useCallback((id: string) => {
        if (typeof getLecturerById === 'function') {
            const found = getLecturerById(id);
            if (found) return found;
        }
        return usersMap.get(id);
    }, [getLecturerById, usersMap]);

    const safeGetRoomById = useCallback((id: string) => {
        if (typeof getRoomById === 'function') {
            const found = getRoomById(id);
            if (found) return found;
        }
        return roomsMap.get(id);
    }, [getRoomById, roomsMap]);

    const canGenerate = useMemo(() => {
        return activeAcademicYear && activeSemester && (activeSemester.sessions || []).some(s => (s.examPeriods || []).length > 0);
    }, [activeAcademicYear, activeSemester]);

    const handleGenerate = async () => {
        if (!canGenerate || !activeAcademicYear || !activeSemester) {
            setError("Configuration incomplete. Set active semester and exam periods in Settings.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const subjectsWithExams = (Array.isArray(subjects) ? subjects : []).filter(s => s && s.hasExam !== false);

            if (generationMode === 'ai') {
                const lecturers = (Array.isArray(users) ? users : []).filter(u => u && u.role !== 'student' && u.role !== 'super_admin');
                const allExamPeriods = (activeSemester.sessions || []).flatMap(s => s.examPeriods || []);
                if (allExamPeriods.length === 0) throw new Error("No exam periods defined.");

                const allStartDates = allExamPeriods.map(p => new Date(p.startDate));
                const allEndDates = allExamPeriods.map(p => new Date(p.endDate));
                const examPeriod = {
                    start: new Date(Math.min(...allStartDates.map(d => d.getTime()))).toISOString().split('T')[0],
                    end: new Date(Math.max(...allEndDates.map(d => d.getTime()))).toISOString().split('T')[0]
                };

                const rawTimetable = await generateExamTimetable(subjectsWithExams, Array.isArray(courses) ? courses : [], lecturers, Array.isArray(rooms) ? rooms : [], examPeriod, (courseSizes || new Map()), (examTimetableSettings || {} as any));
                await onExamTimetableGenerated?.(rawTimetable, (activeAcademicYear?.id || ""), (activeSemester?.id || ""));
                onLogAction?.(`Generated AI exam timetable for ${activeSemester?.name || 'Term'} (${activeAcademicYear?.name || 'Year'})`);
            } else {
                const standardEntries = generateStandardExamTimetable(subjectsWithExams, Array.isArray(courses) ? courses : [], Array.isArray(users) ? users : [], Array.isArray(rooms) ? rooms : [], activeSemester, (examTimetableSettings || {} as any), allocations);
                await onExamTimetableGenerated?.(standardEntries, (activeAcademicYear?.id || ""), (activeSemester?.id || ""));
                onLogAction?.(`Generated standard exam timetable for ${activeSemester?.name || 'Term'} (${activeAcademicYear?.name || 'Year'})`);
            }
        } catch (err: any) {
            setError(err.message || "An error occurred during generation.");
        } finally {
            setIsLoading(false);
        }
    };

    const filteredExamTimetable = useMemo(() => {
        const list = Array.isArray(examTimetable) ? examTimetable : [];
        if (departmentFilter === 'all') return list;
        const subjectIdsInDept = new Set((Array.isArray(subjects) ? subjects : []).filter(s => s && s.departmentId === departmentFilter).map(s => s.id));
        return list.filter(entry => entry && subjectIdsInDept.has(entry.subjectId));
    }, [examTimetable, departmentFilter, subjects]);

    const title = useMemo(() => {
        if (departmentFilter === 'all') return 'Exam Timetable (All Departments)';
        const dept = (Array.isArray(departments) ? departments : []).find(d => d && d.id === departmentFilter);
        return `Exam Timetable for ${dept?.name || 'Unknown Department'}`;
    }, [departmentFilter, departments]);

    const filteredExamUnits = useMemo(() => {
        let filtered = Array.isArray(subjects) ? subjects : [];
        if (departmentFilter !== 'all') filtered = filtered.filter(s => s && s.departmentId === departmentFilter);
        if (examUnitSearch.trim()) {
            const q = examUnitSearch.toLowerCase();
            filtered = filtered.filter(s => s && ((s.name || "").toLowerCase().includes(q) || (s.code || "").toLowerCase().includes(q)));
        }
        return filtered;
    }, [subjects, departmentFilter, examUnitSearch]);

    const handleDownloadPdf = async () => {
        setIsGeneratingPdf(true);
        try {
            const pdfUrl = await generateExamTimetablePdf(filteredExamTimetable, safeGetSubjectById, safeGetLecturerById, safeGetRoomById, buildings, courses, title, letterheadConfig, footerImageUrl || null, logoUrl || null);
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Exam_Timetable.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Failed to generate PDF:", error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const tabs = [
        { id: 'home', label: 'Home', icon: HomeIcon },
        { id: 'exam_units', label: 'Exam Units', icon: BookOpenIcon },
        { id: 'timetable', label: 'Timetable', icon: CalendarDaysIcon },
        { id: 'attendance', label: 'Attendance', icon: CheckCircleIcon },
        { id: 'lessons', label: 'Lessons & Allocations', icon: RectangleStackIcon },
        { id: 'discipline', label: 'Discipline', icon: ShieldExclamationIcon },
        { id: 'tools', label: 'Tools', icon: WrenchIcon },
        { id: 'settings', label: 'Settings', icon: Cog8ToothIcon },
    ] as const;

    const horizontalTabs = [
        { id: 'home', label: 'Home', icon: HomeIcon },
        { id: 'students', label: 'Students Registry', icon: UserPlusIcon },
        { id: 'teachers', label: 'Teachers Registry', icon: UserGroupIcon },
        { id: 'lessons', label: 'Lessons & Allocations', icon: RectangleStackIcon },
        { id: 'reports', label: 'Reports', icon: ChartBarIcon },
    ] as const;

    return (
        <div className="flex flex-col lg:flex-row gap-8 items-start min-h-[750px] w-full text-left">
            {/* Sidebar (Vertical Menu) */}
            <div className={`${isSidebarOpen ? 'w-full lg:w-72' : 'w-full lg:w-24'} bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 rounded-[2.5rem] shadow-sm transition-all duration-500 flex flex-col p-6 shrink-0 no-print`}>
                <div className="flex items-center gap-4 mb-8 px-2">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-indigo-600 shadow-xl shadow-indigo-500/20 flex items-center justify-center text-white shrink-0">
                        <BookOpenIcon className="w-7 h-7" />
                    </div>
                    {isSidebarOpen && (
                        <div className="animate-fade-in whitespace-nowrap">
                            <h2 className="text-[13px] font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-1">
                                ⚡ Cyber Academic HUD
                            </h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">
                                AI Operations & Governance
                            </p>
                        </div>
                    )}
                </div>

                {/* Top Subscription Expiry Banner */}
                <SubscriptionExpiryBanner
                    institution={currentInstitution}
                    isCollapsed={!isSidebarOpen}
                />

                <nav className="space-y-1.5 flex-1 overflow-y-auto max-h-[calc(100vh-200px)] pr-1 custom-scrollbar">
                    {tabs.filter(item => item.id !== 'lessons').map(item => (
                        <button
                            key={item.id}
                            onClick={() => handleTabChange(item.id as any)}
                            onMouseEnter={() => { if (item.id === 'exam_units') setHasLoadedExamUnits(true); }}
                            className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-300 relative group cursor-pointer ${
                                activeTab === item.id 
                                ? 'bg-gradient-to-r from-emerald-500 via-teal-600 to-indigo-600 text-white shadow-lg shadow-emerald-500/30 scale-105' 
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-750 dark:text-slate-400 dark:hover:text-white'
                            }`}
                        >
                            <div className={`${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-400'}`} />
                            </div>
                            {isSidebarOpen && (
                                <span className="font-extrabold text-xs tracking-wide uppercase transition-colors duration-300">
                                    {item.label}
                                </span>
                            )}
                            {activeTab === item.id && isSidebarOpen && (
                                <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            )}
                            {isTabPending && item.id === 'exam_units' && activeTab !== 'exam_units' && isSidebarOpen && (
                                <div className="absolute right-4 w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            )}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 w-full min-w-0 space-y-6">
                {/* Primary Horizontal Navigation Menu Bar */}
                <div className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 p-4 rounded-[2.5rem] shadow-sm shrink-0 gap-4">
                    <div className="flex flex-nowrap items-center gap-2 overflow-x-auto custom-scrollbar-horizontal max-w-[70vw] md:max-w-full pb-1">
                        {horizontalTabs.map(sub => (
                            <button
                                key={sub.id}
                                onClick={() => handleTabChange(sub.id as any)}
                                onMouseEnter={() => { if ((sub.id as string) === 'exam_units') setHasLoadedExamUnits(true); }}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl transition-all duration-300 whitespace-nowrap cursor-pointer ${
                                    activeTab === sub.id
                                    ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 dark:shadow-none scale-105 font-black'
                                    : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600 font-semibold'
                                }`}
                            >
                                <sub.icon className={`w-4 h-4 ${activeTab === sub.id ? 'text-white' : 'text-slate-400'}`} />
                                <span className="text-[11px] uppercase tracking-widest">{sub.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {activeTab === 'home' && (
                <div className="space-y-6">
                    {/* 3D Futuristic Graphical Analysis & Exam Performance Dashboard */}
                    <Suspense fallback={<AcademicTabLoader label="Loading Analytics Dashboard..." />}>
                        <Futuristic3DExamAnalyticsDashboard
                            assessments={assessments}
                            marks={marks}
                            students={students}
                            subjects={subjects}
                            courses={courses}
                            currentInstitution={currentInstitution}
                            onNavigateToReports={() => setActiveTab('reports')}
                        />
                    </Suspense>

                    {/* ACADEMICS PORTAL HUB - EASY SWITCHER */}
                    <section className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl border border-indigo-900/50 space-y-6">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400 bg-indigo-900/60 px-3 py-1 rounded-full border border-indigo-700/50">
                                    🚀 Cyber Academic Operations
                                </span>
                                <h3 className="text-2xl font-black tracking-tight uppercase mt-2 text-white flex items-center gap-2">
                                    Academics Portal Hub
                                </h3>
                                <p className="text-xs text-slate-300">
                                    Instant 1-click portal switching across exam management, registries, reports & settings.
                                </p>
                            </div>
                        </div>

                        {/* Portal Hub Cards Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                            {tabs.filter(portal => portal.id !== 'exam_units').map(portal => (
                                <button
                                    key={portal.id}
                                    onClick={() => setActiveTab(portal.id as any)}
                                    className={`p-4 rounded-2xl transition-all duration-300 text-left border flex flex-col justify-between h-28 group cursor-pointer ${
                                        activeTab === portal.id
                                            ? 'bg-gradient-to-r from-emerald-500 to-indigo-600 border-white/30 text-white shadow-lg scale-105 font-bold'
                                            : 'bg-white/10 hover:bg-white/20 border-white/10 text-slate-200 hover:text-white'
                                    }`}
                                >
                                    <div className="flex justify-between items-center">
                                        <div className="p-2 rounded-xl bg-white/10 group-hover:scale-110 transition-transform">
                                            <portal.icon className="w-5 h-5 text-white" />
                                        </div>
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-black/20 px-2 py-0.5 rounded-full text-slate-300">
                                            Switch &rarr;
                                        </span>
                                    </div>

                                    <div>
                                        <span className="text-xs font-black uppercase tracking-wide block truncate">{portal.label}</span>
                                        <span className="text-[9px] opacity-75 font-medium block">Click to open portal</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </section>

                    <section className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-xl font-black tracking-tighter uppercase mb-6 flex items-center gap-2 text-slate-900 dark:text-white">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            Operational Hub
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <button
                                onClick={() => setIsWizardOpen(true)}
                                className="flex flex-col items-start p-6 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-200 hover:shadow-indigo-300 transition-all group text-left hover:-translate-y-1"
                            >
                                <div className="p-3 bg-white/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                    <BeakerIcon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-tight">Timetable Wizard</span>
                                <p className="text-[10px] opacity-80 uppercase mt-1">Guided Generation</p>
                            </button>
                            <button
                                onClick={() => setIsPromotionWizardOpen(true)}
                                className="flex flex-col items-start p-6 bg-emerald-600 text-white rounded-3xl shadow-xl shadow-emerald-200 hover:shadow-emerald-300 transition-all group text-left hover:-translate-y-1"
                            >
                                <div className="p-3 bg-white/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                    🎓
                                </div>
                                <span className="font-black text-sm uppercase tracking-tight">Student Promotion</span>
                                <p className="text-[10px] opacity-80 uppercase mt-1">End-of-Year Rollover</p>
                            </button>
                            <button
                                onClick={() => {
                                    const school = (schoolRegistry || []).find(s => s.institutionId === currentInstitution?.id || s.id === currentInstitution?.id);
                                    if (school) onAccessAlumnaPortal(school);
                                    else alert("School registry record not found for this institution.");
                                }}
                                className="flex flex-col items-start p-6 bg-rose-600 text-white rounded-3xl shadow-xl shadow-rose-200 hover:shadow-rose-300 transition-all group text-left hover:-translate-y-1"
                            >
                                <div className="p-3 bg-white/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                    <SparklesIcon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-sm uppercase tracking-tight">Alumnae Portal</span>
                                <p className="text-[10px] opacity-80 uppercase mt-1">Connect with Graduates</p>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('exam_units');
                                    setExamViewSubTab('montessori');
                                }}
                                className="flex flex-col items-start p-6 bg-teal-600 text-white rounded-3xl shadow-xl shadow-teal-200 hover:shadow-teal-300 transition-all group text-left hover:-translate-y-1"
                            >
                                <div className="p-3 bg-white/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform text-lg">
                                    👶
                                </div>
                                <span className="font-black text-sm uppercase tracking-tight">Montessori Checklist</span>
                                <p className="text-[10px] opacity-80 uppercase mt-1">British & EYFS Rubrics</p>
                            </button>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">Exam Timetable Generator</h3>
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                            {!canGenerate || !activeAcademicYear || !activeSemester ? (
                                <p className="p-4 text-center text-amber-600 bg-amber-50 dark:bg-amber-900/50 rounded-lg">
                                    Please set an active academic year and semester with at least one defined <strong>Exam Period</strong> in the Admin's <span className="font-bold">Settings &rarr; Academic Calendar</span> tab to enable generation.
                                </p>
                            ) : (
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">Ready to generate for:</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">{activeSemester?.name || 'Current Term'} ({activeAcademicYear?.name || 'Current Year'})</p>
                                        <div className="text-sm text-slate-500 dark:text-slate-400">
                                            {activeSemester?.sessions?.map(session => (
                                                session?.examPeriods?.map(examPeriod => (
                                                    <div key={examPeriod?.id || `${session?.id || 'session'}_${examPeriod?.name || 'ep'}`}>- {session?.name || 'Session'} / {examPeriod?.name || 'Period'}: {examPeriod?.startDate} to {examPeriod?.endDate}</div>
                                                ))
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGenerationMode('ai')}
                                            className={`btn-secondary ${generationMode === 'ai' ? 'ring-2 ring-indigo-500' : ''}`}
                                        >
                                            <SparklesIcon className="w-4 h-4 inline mr-1" /> AI Mode
                                        </button>
                                        <button
                                            onClick={() => setGenerationMode('standard')}
                                            className={`btn-secondary ${generationMode === 'standard' ? 'ring-2 ring-indigo-500' : ''}`}
                                        >
                                            <CommandLineIcon className="w-4 h-4 inline mr-1" /> Std Mode
                                        </button>
                                        <button onClick={handleGenerate} disabled={isLoading} className="btn-primary">
                                            {isLoading ? 'Generating...' : `Generate (${generationMode.toUpperCase()})`}
                                        </button>
                                    </div>
                                </div>
                            )}
                            {isLoading && <div className="mt-4"><div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden"><div className="bg-[var(--color-primary)] h-2.5 rounded-full animate-pulse"></div></div></div>}
                            {error && <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">{error}</div>}
                        </div>
                    </section>

                    <section>
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                            <div className="flex items-center gap-4">
                                <label htmlFor="dept-filter" className="text-sm font-medium text-slate-700 dark:text-slate-300">Filter by Department:</label>
                                <select
                                    id="dept-filter"
                                    value={departmentFilter}
                                    onChange={e => setDepartmentFilter(e.target.value)}
                                    className="form-select"
                                >
                                    <option value="all">All Departments</option>
                                    {(departments || []).map(d => d ? <option key={d.id} value={d.id}>{d.name || d.id}</option> : null)}
                                </select>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => window.print()} className="btn-secondary inline-flex items-center gap-2"><PrinterIcon className="w-5 h-5" /> Print</button>
                                <button onClick={handleDownloadPdf} disabled={isGeneratingPdf} className="btn-secondary inline-flex items-center gap-2">
                                    <DocumentArrowDownIcon className="w-5 h-5" /> {isGeneratingPdf ? 'Generating...' : 'PDF'}
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            {/* FIXED: currentInstitution is now correctly passed to ExamTimetableGrid */}
                            <ExamTimetableGrid
                                entries={filteredExamTimetable}
                                getSubjectById={safeGetSubjectById}
                                getLecturerById={safeGetLecturerById}
                                getRoomById={safeGetRoomById}
                                buildings={props.buildings || []}
                                courses={courses}
                                title={title}
                                currentInstitution={currentInstitution}
                            />
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'timetable' && (
                <div className="space-y-6 animate-fade-in w-full">
                    <Suspense fallback={<AcademicTabLoader label="Loading Timetable Manager..." />}>
                        <TimetableManagerModule
                            entries={filteredExamTimetable}
                            getSubjectById={safeGetSubjectById}
                            getLecturerById={safeGetLecturerById}
                            getRoomById={safeGetRoomById}
                            buildings={props.buildings || []}
                            courses={courses}
                            departments={departments || []}
                            currentInstitution={currentInstitution}
                            activeAcademicYear={activeAcademicYear}
                            activeSemester={activeSemester}
                            generationMode={generationMode}
                            setGenerationMode={setGenerationMode}
                            isLoading={isLoading}
                            isGeneratingPdf={isGeneratingPdf}
                            error={error}
                            onGenerate={handleGenerate}
                            onDownloadPdf={handleDownloadPdf}
                            onOpenWizard={() => setIsWizardOpen(true)}
                        />
                    </Suspense>
                </div>
            )}

            {(hasLoadedExamUnits || activeTab === 'exam_units') && (
                <div className={activeTab === 'exam_units' ? "space-y-6 animate-fade-in w-full" : "hidden"}>
                    {/* View Mode Sub-Navigation Toggle */}
                    <div className="bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between gap-4 overflow-x-auto custom-scrollbar">
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setExamViewSubTab('summative')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                    examViewSubTab === 'summative'
                                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                📖 Summative Exams & Marksheet Engine
                            </button>
                            <button
                                onClick={() => setExamViewSubTab('cbe_strands')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                    examViewSubTab === 'cbe_strands'
                                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                🎯 CBE Formative Strands & Rubrics (EE / ME / AE / BE)
                            </button>
                            <button
                                onClick={() => setExamViewSubTab('cbe_competencies')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                    examViewSubTab === 'cbe_competencies'
                                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                🌟 7 Core Competencies & 8 Values HUD
                            </button>
                            <button
                                onClick={() => setExamViewSubTab('cbe_portfolio')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                    examViewSubTab === 'cbe_portfolio'
                                        ? 'bg-cyan-600 text-white shadow-md shadow-cyan-500/20'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                📸 Learner CBE e-Portfolio Vault (SBA)
                            </button>
                            <button
                                onClick={() => setExamViewSubTab('montessori')}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                                    examViewSubTab === 'montessori'
                                        ? 'bg-teal-600 text-white shadow-md shadow-teal-500/20'
                                        : 'text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                            >
                                👶 British & Montessori Checklist (EYFS)
                            </button>
                        </div>
                    </div>

                    {examViewSubTab === 'summative' ? (
                        <Suspense fallback={<AcademicTabLoader label="Loading Summative Exam Engine..." />}>
                            <ExamUnitsManager
                                currentInstitution={currentInstitution}
                                subjects={subjects}
                                users={users}
                                students={students}
                                assessments={assessments}
                                marks={marks}
                                courses={courses}
                                academicLevels={academicLevels}
                                allocations={props.allocations}
                                currentUser={currentUser}
                            />
                        </Suspense>
                    ) : examViewSubTab === 'cbe_strands' ? (
                        <Suspense fallback={<AcademicTabLoader label="Loading CBE Strands & Rubrics..." />}>
                            <CbeStrandRubricManager
                                currentInstitution={currentInstitution}
                                subjects={subjects}
                                users={users}
                                courses={courses}
                                academicLevels={academicLevels}
                                currentUser={currentUser}
                                onLogAction={onLogAction}
                            />
                        </Suspense>
                    ) : examViewSubTab === 'cbe_competencies' ? (
                        <Suspense fallback={<AcademicTabLoader label="Loading Core Competencies HUD..." />}>
                            <CbeCoreCompetenciesManager
                                currentInstitution={currentInstitution}
                                users={users}
                                courses={courses}
                                academicLevels={academicLevels}
                                currentUser={currentUser}
                                onLogAction={onLogAction}
                            />
                        </Suspense>
                    ) : examViewSubTab === 'montessori' ? (
                        <Suspense fallback={<AcademicTabLoader label="Loading Montessori Assessment Engine..." />}>
                            <MontessoriAssessmentManager
                                currentInstitution={currentInstitution}
                                users={users}
                                courses={courses}
                                academicLevels={academicLevels}
                                currentUser={currentUser}
                                onLogAction={onLogAction}
                            />
                        </Suspense>
                    ) : (
                        <Suspense fallback={<AcademicTabLoader label="Loading Learner CBE Portfolio Vault..." />}>
                            <CbePortfolioVaultManager
                                currentInstitution={currentInstitution}
                                subjects={subjects}
                                users={users}
                                courses={courses}
                                academicLevels={academicLevels}
                                currentUser={currentUser}
                                onLogAction={onLogAction}
                            />
                        </Suspense>
                    )}
                </div>
            )}

            {activeTab === 'attendance' && (
                <div className="space-y-6 animate-fade-in w-full">
                    <Suspense fallback={<AcademicTabLoader label="Loading Advanced Attendance Engine..." />}>
                        <AdvancedAttendanceManager
                            users={users}
                            students={students}
                            currentInstitution={currentInstitution}
                            activeAcademicYear={activeAcademicYear}
                            activeSemester={activeSemester}
                            studentAttendances={props.studentAttendances}
                            onSaveAttendance={props.onSaveAttendance as any}
                            onLogAction={onLogAction}
                        />
                    </Suspense>
                </div>
            )}

            {(activeTab === 'students' || activeTab === 'teachers') && (
                <div className="animate-fade-in space-y-6">
                    <Suspense fallback={<AcademicTabLoader label="Loading Students Registry..." />}>
                        <StudentEnrollmentManager
                            context="academic"
                            currentInstitution={currentInstitution!}
                            activeTab={activeTab}
                            companyDetails={companyDetails}
                            currentUser={currentUser!}
                            onLogAction={handleLogAction}
                            initialUsers={users}
                            initialSubjects={subjects}
                            initialCourses={courses}
                        />
                    </Suspense>
                </div>
            )}

            {activeTab === 'lessons' && (
                <div className="animate-fade-in space-y-6 w-full">
                    <Suspense fallback={<AcademicTabLoader label="Loading Lessons Allocation Engine..." />}>
                        <LessonsAllocationManager
                            currentInstitution={currentInstitution!}
                            users={users}
                            subjects={subjects}
                            courses={courses}
                        />
                    </Suspense>
                </div>
            )}

            {(activeTab === 'tools' || activeTab === 'lesson_plans' || activeTab === 'revision_marketplace') && (
                <div className="animate-fade-in space-y-6 w-full">
                    {/* Subtabs Header Switcher */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 p-4 rounded-3xl shadow-sm flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold">
                                <WrenchIcon className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">
                                    Academic AI & Pedagogical Tools
                                </h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                    Lesson planning, schemes of work & AI automated revision test generator
                                </p>
                            </div>
                        </div>

                        {/* Subtab Navigation Pills */}
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/60 dark:border-slate-800">
                            <button
                                onClick={() => {
                                    setActiveTab('tools');
                                    setToolsSubTab('lesson_plans');
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                                    (activeTab === 'lesson_plans' || (activeTab === 'tools' && toolsSubTab === 'lesson_plans'))
                                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20 scale-105'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <BookOpenIcon className="w-4 h-4" />
                                <span>Lesson Plans & Schemes</span>
                            </button>

                            <button
                                onClick={() => {
                                    setActiveTab('tools');
                                    setToolsSubTab('revision_marketplace');
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                                    (activeTab === 'revision_marketplace' || (activeTab === 'tools' && toolsSubTab === 'revision_marketplace'))
                                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 scale-105'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>AI Revision Generator</span>
                            </button>

                            <button
                                onClick={() => {
                                    setActiveTab('tools');
                                    setToolsSubTab('leaving_certificates');
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                                    (activeTab === 'tools' && toolsSubTab === 'leaving_certificates')
                                        ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20 scale-105'
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                                }`}
                            >
                                <AcademicCapIcon className="w-4 h-4" />
                                <span>Leaving Certificates</span>
                            </button>
                        </div>
                    </div>

                    {/* Subtab 1: Lesson Plans & Schemes */}
                    {(activeTab === 'lesson_plans' || (activeTab === 'tools' && toolsSubTab === 'lesson_plans')) && (
                        <div className="animate-fade-in space-y-6 w-full">
                            <Suspense fallback={<AcademicTabLoader label="Loading Lesson Plans & Schemes..." />}>
                                <TeacherLessonPlanManager
                                    currentInstitution={currentInstitution}
                                    currentUser={currentUser}
                                    subjects={subjects}
                                    courses={courses}
                                />
                            </Suspense>
                        </div>
                    )}

                    {/* Subtab 2: AI Revision Generator */}
                    {(activeTab === 'revision_marketplace' || (activeTab === 'tools' && toolsSubTab === 'revision_marketplace')) && (
                        <div className="animate-fade-in space-y-6 w-full">
                            <Suspense fallback={<AcademicTabLoader label="Loading AI Revision Generator..." />}>
                                <RevisionMarketplaceManager
                                    currentInstitution={currentInstitution}
                                    currentUser={currentUser}
                                    subjects={subjects}
                                />
                            </Suspense>
                        </div>
                    )}

                    {/* Subtab 3: School Leaving Certificates */}
                    {(activeTab === 'tools' && toolsSubTab === 'leaving_certificates') && (
                        <div className="animate-fade-in space-y-6 w-full">
                            <Suspense fallback={<AcademicTabLoader label="Loading Leaving Certificates Manager..." />}>
                                <LeavingCertificateManager
                                    currentInstitution={currentInstitution}
                                    currentUser={currentUser}
                                    users={users}
                                    courses={courses}
                                    letterheadConfig={letterheadConfig}
                                />
                            </Suspense>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'student_subscriptions' && (
                <div className="animate-fade-in space-y-6 w-full">
                    <Suspense fallback={<AcademicTabLoader label="Loading Student Subscriptions..." />}>
                        <StudentSubscriptionPlanManager
                            currentInstitution={currentInstitution}
                            currentUser={currentUser}
                            users={users}
                            courses={courses}
                            moduleContext="academics"
                        />
                    </Suspense>
                </div>
            )}

            {activeTab === 'exam_insights' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-black tracking-tighter uppercase mb-2 text-slate-900 dark:text-white">Exam Performance Monitor</h3>
                    {assessments.length > 0 ? (
                        <Suspense fallback={<AcademicTabLoader label="Loading Exam Insights..." />}>
                            <ExamInsights 
                                assessment={assessments[0]} 
                                marks={marks} 
                                students={students} 
                                teachers={teachers} 
                                subjects={subjects} 
                            />
                        </Suspense>
                    ) : (
                        <div className="p-12 bg-white rounded-[2.5rem] text-center border-2 border-dashed border-slate-100">
                            <SparklesIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest">No active assessments found to track.</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'reports' && (
                <div className="space-y-6">
                    <Suspense fallback={<AcademicTabLoader label="Loading Academic Reports Hub..." />}>
                        <AcademicReportsHub 
                            assessments={assessments} 
                            marks={marks} 
                            students={students} 
                            users={users} 
                            subjects={subjects} 
                            activityLogs={activityLog} 
                            currentInstitution={currentInstitution}
                            courses={courses}
                            academicLevels={academicLevels}
                        />
                    </Suspense>
                </div>
            )}

            {activeTab === 'people' && (
                <div className="space-y-6">
                    <section className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-700">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Directory Management</h3>
                                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Bulk Operations & Enrollment</p>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => { setBulkType('students'); setIsBulkWizardOpen(true); }}
                                    className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all"
                                >
                                    Bulk Admit Students
                                </button>
                                <button 
                                    onClick={() => { setBulkType('teachers'); setIsBulkWizardOpen(true); }}
                                    className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-200 hover:bg-slate-800 transition-all"
                                >
                                    Bulk Add Teachers
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <h4 className="font-black text-slate-900 mb-2 uppercase tracking-tighter">Student Population</h4>
                                <p className="text-3xl font-black text-indigo-600">{students.length}</p>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Total Enrolled</p>
                            </div>
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <h4 className="font-black text-slate-900 mb-2 uppercase tracking-tighter">Teaching Staff</h4>
                                <p className="text-3xl font-black text-slate-900">{teachers.length}</p>
                                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Active Faculty</p>
                            </div>
                        </div>
                    </section>
                </div>
            )}

            {activeTab === 'discipline' && (
                <div className="space-y-6">
                    <Suspense fallback={<AcademicTabLoader label="Loading Discipline Manager..." />}>
                        <DisciplineManager 
                            incidents={incidents} 
                            students={students} 
                            onAddIncident={onAddIncident || (async () => {})} 
                        />
                    </Suspense>
                </div>
            )}

            {activeTab === 'settings' && (
                <Suspense fallback={<AcademicTabLoader label="Loading Academic Settings..." />}>
                    <SettingsManager
                        {...props}
                        departments={props.departments || []}
                        subjects={props.subjects || []}
                        buildings={props.buildings || []}
                        rooms={props.rooms || []}
                        courses={props.courses || []}
                        academicYears={props.academicYears || []}
                        semesters={props.semesters || []}
                        themeColor={props.themeColor || '#4f46e5'}
                        timetableSettings={props.timetableSettings || {} as any}
                        examTimetableSettings={props.examTimetableSettings || {} as any}
                        users={props.users || []}
                        currentUser={props.currentUser!}
                        onAssociateSubjectToCourseLevel={onAssociateSubjectToCourseLevel}
                        onDisassociateSubjectFromCourseLevel={onDisassociateSubjectFromCourseLevel}
                        isAcademicsOfficer={true}
                        isInstitutionalView={true}
                        allocations={[]}
                    />
                </Suspense>
            )}

            {isWizardOpen && (
                <Suspense fallback={<AcademicTabLoader label="Launching Timetable Wizard..." />}>
                    <TimetableWizard
                        onClose={() => setIsWizardOpen(false)}
                        allocations={(props.allocations || []).filter(r => r.status === 'approved')}
                        subjects={subjects}
                        lecturers={teachers}
                        rooms={rooms}
                        courses={courses}
                        timetableSettings={timetableSettings || {} as any}
                        activeAcademicYear={activeAcademicYear || null}
                        activeSemester={activeSemester || null}
                        currentInstitution={currentInstitution}
                        courseSizes={courseSizes}
                        timeOffRequests={props.timeOffRequests || []}
                        onTimetableGenerated={props.onTimetableGenerated ? ((entries: any, ay?: any, sem?: any) => (props.onTimetableGenerated as any)(entries, ay, sem)) : (async () => { })}
                        onLogAction={handleLogAction}
                    />
                </Suspense>
            )}

            {isPromotionWizardOpen && (
                <Suspense fallback={<AcademicTabLoader label="Launching Promotion Wizard..." />}>
                    <StudentPromotionWizard
                        isOpen={isPromotionWizardOpen}
                        onClose={() => setIsPromotionWizardOpen(false)}
                        activeAcademicYear={activeAcademicYear || null}
                        semesters={props.semesters || []}
                        students={users || []}
                        courses={courses || []}
                        institution={currentInstitution || ({ id: 'inst_demo', name: 'School' } as Institution)}
                        currentUser={(users || [])[0] || ({ id: 'admin', name: 'Admin', role: 'super_admin' } as User)}
                        onPromotionSuccess={() => {
                            setIsPromotionWizardOpen(false);
                            onLogAction?.('Executed batch student promotion & academic year rollover');
                        }}
                    />
                </Suspense>
            )}
            </div>

            <style>{`
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 600; border: none; cursor: pointer; } 
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); } .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
                .form-input { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input { border-color: #4b5563; background-color: #374151; color: white; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; display: block; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
            `}</style>
        </div>
    );
};

