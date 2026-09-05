
import React, { useState, useMemo, lazy, Suspense, useEffect } from 'react';
import type {
    Subject, User, AllocationRequest, Department, Priority,
    TimetableEntry, AcademicYear, Semester, TimetableSettings,
    Course, LetterheadConfig, AllocationRequestPreferences, UserTask, Institution,
    CountyInventoryItem, RemedialSession, RemedialPayout
} from '../types';
import { apiService } from '../services/apiService';
import { SynergyHub } from './SynergyHub';
import { Sparkles, Play, Square, DollarSign, QrCode, CheckCircle2, Award, Clock } from 'lucide-react';

import { SubjectCard } from './SubjectCard';
import { RequestModal } from './RequestModal';
import { DeallocationModal } from './DeallocationModal';
import { ChangeRequestModal } from './ChangeRequestModal';
import { LecturerDashboard } from './LecturerDashboard';
import { TimetableGrid } from './TimetableGrid';
import { CalendarPlusIcon } from './icons/CalendarPlusIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ArchiveBoxIcon } from './icons/ArchiveBoxIcon';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { AssessmentManager } from './AssessmentManager';
import { AssessmentReports } from './AssessmentReports';
import TeacherCheckInView from './TeacherCheckInView';
import { ClockInIcon } from './icons/ClockInIcon';
import { ChartBarIcon } from './icons/ChartBarIcon';
import { ClipboardListIcon } from './icons/ClipboardListIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { AscScannerPanel } from './AscScannerPanel';
import { ClassSupervisorAttendanceManager } from './common/ClassSupervisorAttendanceManager';
import { TeacherLessonPlanManager } from './Academics/TeacherLessonPlanManager';

const EduFlowManager = lazy(() => import('./common/EduFlowManager').then(m => ({ default: m.EduFlowManager })));


const renderTabIcon = (tab: string, className = "w-5 h-5") => {
    switch (tab) {
        case 'dashboard': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
        );
        case 'class_supervisor_attendance': return <CheckCircleIcon className={className} />;
        case 'academic_hub': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
        );
        case 'my_timetable': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        case 'scan_session': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
        );
        case 'eduflow': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        );
        case 'synergy_hub': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
        );
        case 'my_requests': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
        );
        case 'inventory': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
        );
        case 'self_checkin': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        case 'remedials': return (
            <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        );
        default: return null;
    }
};

interface LecturerViewProps {
    user?: User;
    users?: User[];
    subjects?: Subject[];
    departments?: Department[];
    courses?: Course[];
    rooms?: any[];
    requests?: AllocationRequest[];
    allocations?: AllocationRequest[];
    timeOffRequests?: any[];
    onSubmitRequest?: (subjectIds: string[], justification: string, signatureUrl: string | null, priority: Priority, academicYearId: string, semesterId: string, preferences: AllocationRequestPreferences | undefined, courseLevelSelections: Record<string, string[]>) => Promise<boolean>;
    onWithdrawRequest?: (requestId: string) => void;
    onDeallocationRequest?: (requestId: string, justification: string) => void;
    onAllocationChangeRequest?: (requestId: string, justification: string, newPriority: Priority) => void;
    getSubjectById?: (id: string) => Subject | undefined;
    getRoomById?: (id: string) => any | undefined;
    getLecturerById?: (id: string) => User | undefined;
    generatedTimetable?: TimetableEntry[];
    allTimetableEntries?: TimetableEntry[];
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    academicYears?: AcademicYear[];
    semesters?: Semester[];
    timetableSettings?: TimetableSettings;
    letterheadConfig?: LetterheadConfig;
    footerImageUrl?: string | null;
    userTasks?: UserTask[];
    onAddTask?: (data: { title: string; dueDate?: string; }) => void;
    onUpdateTask?: (taskId: string, isComplete: boolean) => void;
    onDeleteTask?: (taskId: string) => void;
    currentInstitution?: Institution | null;
    onShareLesson?: (entryId: string, teacherId: string | null) => void;
    assignments?: any[];
    submissions?: any[];
    onAddAssignment?: (data: any) => void;
    onDeleteAssignment?: (id: string) => void;
    onUpdateSubmission?: (id: string, data: any) => void;
    assessments?: any[];
    assessmentMarks?: any[];
    onAddAssessment?: (data: any) => void;
    onDeleteAssessment?: (id: string) => void;
    onSaveAssessmentMarks?: (id: string, marks: any) => Promise<void>;
    inventoryItems?: CountyInventoryItem[];
    onIssueInventoryItem?: (itemId: string, quantity: number, recipientId: string, recipientName: string) => Promise<void>;
    studentAttendances?: any[];
    studentAbsenceRequests?: any[];
    onSaveAttendance?: (lessonId: string, attendance: any[]) => Promise<void>;
    onSaveScanSession?: (placeholderEntry: any, attendanceRows: any[]) => Promise<void>;
    onAccessAlumnaPortal?: (school: any) => void;
    schoolRegistry?: any[];
    onLogAction?: (msg: string) => Promise<void> | void;
    onTeacherLessonCheckIn?: (timetableEntryId: string) => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const base = "flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium shadow-sm border";
    if (status === 'approved') return <span className={`${base} bg-green-50 text-green-700 border-green-100 dark:bg-green-900/40 dark:text-green-300`}><CheckIcon className="w-3.5 h-3.5 mr-1" /> Approved</span>;
    if (status === 'disapproved') return <span className={`${base} bg-red-50 text-red-700 border-red-100 dark:bg-red-900/40 dark:text-red-300`}><XIcon className="w-3.5 h-3.5 mr-1" /> Disapproved</span>;
    if (status === 'change_request_pending') return <span className={`${base} bg-orange-50 text-orange-700 border-orange-100 dark:bg-orange-900/40 dark:text-orange-300`}><ArrowsRightLeftIcon className="w-3.5 h-3.5 mr-1" /> Modification Pending</span>;
    if (status === 'deallocation_pending') return <span className={`${base} bg-rose-50 text-rose-700 border-rose-100 dark:bg-rose-900/40 dark:text-rose-300`}><ExclamationTriangleIcon className="w-3.5 h-3.5 mr-1" /> Removal Pending</span>;
    return <span className={`${base} bg-yellow-50 text-yellow-700 border-yellow-100 dark:bg-yellow-900/40 dark:text-yellow-300`}><ClockIcon className="w-3.5 h-3.5 mr-1" /> {status.replace(/_/g, ' ')}</span>;
};

export const LecturerView: React.FC<LecturerViewProps> = (props) => {
    const {
        user = { name: 'User', id: 'user_1' } as any,
        subjects = [],
        departments = [],
        courses = [],
        requests = [],
        allocations = [],
        onSubmitRequest = async () => true,
        onWithdrawRequest = () => {},
        onDeallocationRequest,
        onAllocationChangeRequest,
        getSubjectById = () => undefined,
        getRoomById = () => undefined,
        getLecturerById = () => undefined,
        generatedTimetable = [],
        activeAcademicYear,
        activeSemester,
        academicYears = [],
        semesters = [],
        timetableSettings = {} as any,
        userTasks = [],
        onAddTask,
        onUpdateTask,
        onDeleteTask,
        currentInstitution,
        onAccessAlumnaPortal,
        schoolRegistry
    } = props;

    const [activeTab, setActiveTab] = useState('dashboard');
    const [showMoreDrawer, setShowMoreDrawer] = useState(false);

    // Remedial States
    const [remedialSessions, setRemedialSessions] = useState<RemedialSession[]>([]);
    const [remedialPayouts, setRemedialPayouts] = useState<RemedialPayout[]>([]);
    const [selectedSubjectId, setSelectedSubjectId] = useState('');
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedPrefectId, setSelectedPrefectId] = useState('');
    const [signingPayout, setSigningPayout] = useState<RemedialPayout | null>(null);
    const [anonymousToken, setAnonymousToken] = useState('');

    const loadRemedialData = async () => {
        try {
            const instId = currentInstitution?.id || user?.institutionId || '';
            const [sessList, payList] = await Promise.all([
                apiService.fetchRemedialSessions(instId),
                apiService.fetchRemedialPayouts(instId)
            ]);
            setRemedialSessions((sessList || []).filter((s: RemedialSession) => s && s.teacherId === user?.id));
            setRemedialPayouts((payList || []).filter((p: RemedialPayout) => p && p.teacherId === user?.id));
        } catch (e) {
            console.error('Failed to load remedial data', e);
        }
    };

    useEffect(() => {
        if (activeTab === 'remedials') {
            loadRemedialData();
        }
    }, [activeTab, currentInstitution?.id, user?.institutionId]);
    const [myRequestsSubTab, setMyRequestsSubTab] = useState<'catalog' | 'pending' | 'allocations'>('catalog');
    const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('all');

    const [deallocatingRequest, setDeallocatingRequest] = useState<AllocationRequest | null>(null);
    const [changingAllocation, setChangingAllocation] = useState<AllocationRequest | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState<boolean | null>(null);

    const useRequests = currentInstitution?.useAllocationRequests ?? true;

    const filteredSubjects = useMemo(() => {
        return (subjects || []).filter(s => {
            const matchesDept = selectedDepartment === 'all' || s.departmentId === selectedDepartment;
            const q = searchQuery.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
            return matchesDept && matchesSearch;
        });
    }, [subjects, selectedDepartment, searchQuery]);

    const lecturerTimetable = useMemo(() =>
        (generatedTimetable || []).filter(entry => entry && entry.lecturerId === user?.id),
        [generatedTimetable, user?.id]
    );

    const myPendingRequests = useMemo(() =>
        (requests || []).filter(r => r && r.lecturerId === user?.id && r.status !== 'approved' && r.status !== 'disapproved' && r.status !== 'change_request_pending' && r.status !== 'deallocation_pending'),
        [requests, user?.id]
    );

    const handleSubjectSelect = (subjectId: string) => {
        setSelectedSubjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subjectId)) newSet.delete(subjectId);
            else newSet.add(subjectId);
            return newSet;
        });
    };

    const handleRequestSubmit = async (just: string, sig: string | null, prio: Priority, prefs: AllocationRequestPreferences, levels: Record<string, string[]>) => {
        setIsSubmitting(true);
        setSubmitSuccess(null);
        const success = await onSubmitRequest(Array.from(selectedSubjectIds), just, sig, prio, activeAcademicYear?.id || '', activeSemester?.id || '', prefs, levels);
        setIsSubmitting(false);
        setSubmitSuccess(success);

        if (success) {
            setIsRequestModalOpen(false);
            setSelectedSubjectIds(new Set());
            setMyRequestsSubTab('pending');
            setTimeout(() => setSubmitSuccess(null), 5000);
        } else {
            alert("Registry sync error. Attempted local update.");
            setTimeout(() => setSubmitSuccess(null), 5000);
        }
    };

    const menuTabs = useMemo(() => {
        const base = ['dashboard', 'lesson_plans', 'class_supervisor_attendance', 'academic_hub', 'my_timetable', 'scan_session', 'eduflow', 'synergy_hub', 'self_checkin', 'remedials'];
        if (useRequests) base.push('my_requests');
        if (props.inventoryItems && props.inventoryItems.length > 0) base.push('inventory');
        return base;
    }, [useRequests, props.inventoryItems]);


    const [showIssueModal, setShowIssueModal] = useState(false);
    const [selectedItem, setSelectedItem] = useState<CountyInventoryItem | null>(null);
    const [issueForm, setIssueForm] = useState({ quantity: 1, recipientId: '' });

    const handleIssueSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedItem || !props.onIssueInventoryItem) return;

        const recipient = props.users?.find(u => u.id === issueForm.recipientId);
        if (!recipient) return;

        if (issueForm.quantity > selectedItem.quantity) {
            alert(`Cannot issue more than available quantity (${selectedItem.quantity})`);
            return;
        }

        setIsSubmitting(true);
        await props.onIssueInventoryItem(selectedItem.id, issueForm.quantity, recipient.id, recipient.name);
        setIsSubmitting(false);
        setShowIssueModal(false);
        setSelectedItem(null);
        setIssueForm({ quantity: 1, recipientId: '' });
        alert('Item issued successfully');
    };

    return (
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100 pb-24 lg:pb-6">
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Desktop Glassmorphic Sidebar */}
                <aside className="hidden lg:flex flex-col w-72 bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/50 dark:border-slate-800/50 rounded-[2.5rem] p-6 shadow-xl shrink-0 h-fit sticky top-6 space-y-6 animate-fade-in no-print">
                    <div className="px-4 py-2 border-b border-slate-150 dark:border-slate-800/60">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 rounded-full text-[9px] font-black uppercase tracking-wider mb-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            Academic Portal
                        </div>
                        <h2 className="text-xl font-black tracking-tight text-slate-950 dark:text-white uppercase">Faculty Command</h2>
                    </div>
                    
                    <nav className="flex flex-col gap-2">
                        {menuTabs.map((tab) => {
                            const isActive = activeTab === tab;
                            return (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`w-full flex items-center justify-between px-5 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 relative overflow-hidden group ${
                                        isActive 
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                    }`}
                                >
                                    <div className="flex items-center gap-3.5 relative z-10">
                                        {renderTabIcon(tab, "w-4.5 h-4.5")}
                                        <span>{tab.replace(/_/g, ' ')}</span>
                                    </div>
                                    {isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <div className="flex-1 min-w-0 space-y-6">
                    {submitSuccess === true && (
                        <div className="bg-green-50 dark:bg-green-955/20 border border-green-200 dark:border-green-900/40 p-5 rounded-3xl flex items-center gap-3.5 animate-fade-in shadow-sm">
                            <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" />
                            <p className="text-xs font-black text-green-800 dark:text-green-200 uppercase tracking-wider">Registry database records updated successfully.</p>
                        </div>
                    )}

                    {activeTab === 'dashboard' && (
                        <div className="animate-fade-in-up">
                            <LecturerDashboard
                                user={user}
                                requests={requests}
                                allocations={allocations}
                                subjects={subjects}
                                getSubjectById={getSubjectById}
                                getRoomById={getRoomById}
                                setActiveTab={setActiveTab}
                                generatedTimetable={generatedTimetable}
                                onLessonCheckIn={props.onTeacherLessonCheckIn || (() => {})}
                                onAbsenceRequest={() => { }}
                                userTasks={userTasks}
                                onAddTask={onAddTask || (() => {})}
                                onUpdateTask={onUpdateTask || (() => {})}
                                onDeleteTask={onDeleteTask || (() => {})}
                                onNavigateToNearby={() => setActiveTab('my_timetable')}
                                currentInstitution={currentInstitution}
                                onRequestChange={(alloc) => {
                                    setChangingAllocation(alloc);
                                }}
                                studentAttendances={props.studentAttendances}
                                studentAbsenceRequests={props.studentAbsenceRequests}
                                onSaveAttendance={props.onSaveAttendance}
                                users={props.users}
                                onAccessAlumnaPortal={onAccessAlumnaPortal || (() => {})}
                                schoolRegistry={schoolRegistry}
                            />
                        </div>
                    )}

                    {activeTab === 'class_supervisor_attendance' && (
                        <div className="animate-fade-in-up">
                            <ClassSupervisorAttendanceManager
                                currentUser={user}
                                students={props.users ? props.users.filter(u => u.role === 'student') : []}
                                users={props.users || []}
                                currentInstitution={currentInstitution}
                                activeAcademicYear={props.activeAcademicYear}
                                activeSemester={props.activeSemester}
                                onSaveAttendance={props.onSaveAttendance}
                            />
                        </div>
                    )}

                    {activeTab === 'academic_hub' && (
                        <div className="space-y-8 animate-fade-in-up">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6 text-center md:text-left">
                                    <div>
                                        <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Academic Performance Hub</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage Marks, Assessments & Student Reports</p>
                                    </div>
                                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-[2rem] text-amber-600 shadow-inner">
                                        <ChartBarIcon className="w-10 h-10" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100 dark:border-slate-700 pb-3">Record Marks & Assessments</h4>
                                        <AssessmentManager
                                            user={user}
                                            assessments={props.assessments || []}
                                            assessmentMarks={props.assessmentMarks || []}
                                            allocatedSubjects={(allocations || []).map(a => a && a.subjectId ? getSubjectById(a.subjectId)! : null).filter(Boolean) as Subject[]}
                                            users={props.users || []}
                                            courses={courses}
                                            onAddAssessment={props.onAddAssessment || (() => { })}
                                            onDeleteAssessment={props.onDeleteAssessment || (() => { })}
                                            onSaveAssessmentMarks={props.onSaveAssessmentMarks || (async () => { })}
                                        />
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest border-b border-slate-100 dark:border-slate-700 pb-3">Generate Documents & Results</h4>
                                        <AssessmentReports
                                            currentUser={user}
                                            assessments={props.assessments || []}
                                            assessmentMarks={props.assessmentMarks || []}
                                            users={props.users || []}
                                            subjects={subjects}
                                            courses={courses}
                                            departments={departments}
                                            letterheadConfig={props.letterheadConfig || {} as LetterheadConfig}
                                            logoUrl={currentInstitution?.logoUrl || null}
                                            footerImageUrl={props.footerImageUrl || null}
                                            currentInstitution={currentInstitution}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'my_timetable' && (
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Staff Schedule</h3>
                                <TimetableGrid
                                    entries={lecturerTimetable}
                                    subjects={subjects || []}
                                    courses={courses || []}
                                    rooms={props.rooms || []}
                                    getSubjectById={getSubjectById}
                                    getLecturerById={id => user}
                                    getRoomById={getRoomById}
                                    timetableSettings={timetableSettings}
                                />
                            </div>
                        </div>
                    )}

                    {activeTab === 'scan_session' && (
                        <div className="animate-fade-in-up">
                            <AscScannerPanel
                                currentUser={user}
                                users={props.users || []}
                                subjects={subjects}
                                courses={courses}
                                allocations={(allocations || []).map(a => ({ subjectId: a?.subjectId, lecturerId: user?.id || '' }))}
                                activeAcademicYear={activeAcademicYear}
                                activeSemester={activeSemester}
                                onSaveSession={props.onSaveScanSession || (async () => { alert('Save handler not configured. Please contact admin.'); })}
                            />
                        </div>
                    )}

                    {activeTab === 'my_requests' && useRequests && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex space-x-2 bg-white dark:bg-slate-800 p-1.5 rounded-2xl w-fit shadow-sm border">
                                {[
                                    { id: 'catalog', label: 'Unit Catalog', count: filteredSubjects.length },
                                    { id: 'pending', label: 'In Review', count: myPendingRequests.length },
                                    { id: 'allocations', label: 'Active Load', count: allocations.length }
                                ].map((sub) => (
                                    <button
                                        key={sub.id}
                                        onClick={() => setMyRequestsSubTab(sub.id as any)}
                                        className={`px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${myRequestsSubTab === sub.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-700'}`}
                                    >
                                        {sub.label}
                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${myRequestsSubTab === sub.id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>{sub.count}</span>
                                    </button>
                                ))}
                            </div>

                            {myRequestsSubTab === 'catalog' && (
                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                                        <div className="relative">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Unit Search</label>
                                            <div className="relative">
                                                <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Code or Name..." className="form-input pl-10 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 text-xs text-slate-800 dark:text-slate-100" />
                                                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Department</label>
                                            <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="form-select bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs text-slate-800 dark:text-slate-100 w-full outline-none">
                                                <option value="all">All Departments</option>
                                                {(departments || []).map(d => d && <option key={d.id} value={d.id}>{d.name}</option>)}
                                            </select>
                                        </div>
                                        <button
                                            onClick={() => setIsRequestModalOpen(true)}
                                            disabled={selectedSubjectIds.size === 0 || isSubmitting}
                                            className="btn-primary h-12 flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-100 w-full"
                                        >
                                            <CalendarPlusIcon className="w-5 h-5" />
                                            {isSubmitting ? 'Syncing...' : `Submit Request (${selectedSubjectIds.size})`}
                                        </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {filteredSubjects.map(subject => (
                                            <SubjectCard
                                                key={subject.id}
                                                subject={subject}
                                                onSelect={() => handleSubjectSelect(subject.id)}
                                                isSelected={selectedSubjectIds.has(subject.id)}
                                                isRequested={requests.some(r => r && r.subjectId === subject.id && r.lecturerId === user?.id)}
                                                isAllocated={allocations.some(a => a && a.subjectId === subject.id && a.lecturerId === user?.id && a.status === 'approved')}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {myRequestsSubTab === 'pending' && (
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                                        <h4 className="font-black text-xs uppercase tracking-widest">Active Application Tracking</h4>
                                    </div>
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {myPendingRequests.length > 0 ? myPendingRequests.map(req => {
                                            const subject = getSubjectById(req.subjectId);
                                            return (
                                                <li key={req.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-700/30 flex justify-between items-center transition-all">
                                                    <div className="flex items-center gap-5">
                                                        <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl text-indigo-600 shadow-sm">
                                                            <BookOpenIcon className="w-7 h-7" />
                                                        </div>
                                                        <div>
                                                            <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-lg">{subject?.name}</p>
                                                            <div className="flex items-center gap-4 mt-1">
                                                                <span className="text-xs font-mono text-slate-400 font-black uppercase">{subject?.code}</span>
                                                                <StatusBadge status={req.status} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <button onClick={() => { if (window.confirm('Withdraw this application?')) onWithdrawRequest(req.id) }} className="text-red-600 hover:text-red-800 text-[10px] font-black uppercase tracking-widest px-6 py-2 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-100">Withdraw</button>
                                                </li>
                                            );
                                        }) : <li className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">No pending applications found</li>}
                                    </ul>
                                </div>
                            )}

                            {myRequestsSubTab === 'allocations' && (
                                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden">
                                    <div className="p-6 border-b dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30">
                                        <h4 className="font-black text-xs uppercase tracking-widest">Confirmed Academic Load</h4>
                                    </div>
                                    <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {(allocations || []).length > 0 ? allocations.map(alloc => {
                                            const subject = getSubjectById(alloc.subjectId);
                                            const isLocked = alloc.status === 'change_request_pending' || alloc.status === 'deallocation_pending';

                                            return (
                                                <li key={alloc.id} className={`p-8 hover:bg-slate-50 dark:hover:bg-slate-750/30 transition-all ${isLocked ? 'bg-slate-50/85 dark:bg-slate-800/80 font-medium' : ''}`}>
                                                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                                                        <div className="flex items-center gap-6">
                                                            <div className={`p-5 rounded-[2rem] shadow-sm ${isLocked ? 'bg-amber-50 text-amber-600' : 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400'}`}>
                                                                {isLocked ? <ClockIcon className="w-10 h-10 text-amber-600 animate-pulse" /> : <CheckCircleIcon className="w-10 h-10" />}
                                                            </div>
                                                            <div>
                                                                <div className="flex items-center gap-3">
                                                                    <p className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">{subject?.name}</p>
                                                                    {isLocked && <StatusBadge status={alloc.status} />}
                                                                </div>
                                                                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                                                                    {(academicYears || []).find(y => y && y.id === alloc.academicYearId)?.name || 'N/A'} • {(semesters || []).find(s => s && s.id === alloc.semesterId)?.name || 'N/A'}
                                                                </p>
                                                                {alloc.proposedChanges?.justification && (
                                                                    <p className="text-xs text-orange-600 mt-2 italic font-medium">Pending Justification: "{alloc.proposedChanges.justification}"</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-3 w-full sm:w-auto pt-4 sm:pt-0">
                                                            <button
                                                                onClick={() => !isLocked && setChangingAllocation(alloc)}
                                                                disabled={isLocked}
                                                                className={`flex-1 btn-secondary text-[10px] h-11 flex items-center justify-center gap-2 border-slate-200 uppercase tracking-widest shadow-sm ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                <ArrowsRightLeftIcon className="w-4 h-4" /> Request Change
                                                            </button>
                                                            <button
                                                                onClick={() => !isLocked && setDeallocatingRequest(alloc)}
                                                                disabled={isLocked}
                                                                className={`flex-1 text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 hover:bg-red-100 h-11 px-6 rounded-2xl border border-red-100 transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                                                            >
                                                                Request Removal
                                                            </button>
                                                        </div>
                                                    </div>
                                                </li>
                                            );
                                        }) : <li className="p-20 text-center text-slate-400 font-bold uppercase text-xs tracking-widest opacity-50">No confirmed allocations for this period</li>}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'inventory' && props.inventoryItems && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">School Inventory</h3>
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Manage & Issue Stock Items</p>
                                    </div>
                                    <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                        <ArchiveBoxIcon className="w-6 h-6" />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {props.inventoryItems.map(item => (
                                        <div key={item.id} className="group bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors">
                                                    <ArchiveBoxIcon className="w-5 h-5" />
                                                </div>
                                                <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${item.quantity > 10 ? 'bg-emerald-50 text-emerald-600' :
                                                    item.quantity > 0 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                    {item.quantity} {item.unit}
                                                </span>
                                            </div>

                                            <h4 className="font-bold text-slate-900 dark:text-white mb-1">{item.name}</h4>
                                            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-4">{item.category}</p>

                                            <button
                                                onClick={() => { setSelectedItem(item); setShowIssueModal(true); }}
                                                disabled={item.quantity <= 0}
                                                className="w-full py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                Issue Item
                                            </button>
                                        </div>
                                    ))}
                                    {props.inventoryItems.length === 0 && (
                                        <div className="col-span-full py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-widest">
                                            No inventory items available to issue.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'eduflow' && (
                        <div className="animate-fade-in-up">
                            <Suspense fallback={<div className="h-96 flex items-center justify-center"><ArrowPathIcon className="w-8 h-8 animate-spin text-slate-350" /></div>}>
                                <EduFlowManager
                                    context="academic"
                                    currentUser={user}
                                    currentInstitution={currentInstitution || null}
                                    subjects={subjects}
                                    users={props.users || []}
                                    courses={courses}
                                />
                            </Suspense>
                        </div>
                    )}

                    {activeTab === 'synergy_hub' && (
                        <div className="animate-fade-in-up">
                            <SynergyHub
                                role="teacher"
                                currentUser={user!}
                                users={props.users || []}
                                subjects={subjects}
                                courses={courses}
                                studentAttendances={props.studentAttendances}
                                assessments={props.assessments}
                                assessmentMarks={props.assessmentMarks}
                            />
                        </div>
                    )}

                    {activeTab === 'self_checkin' && (
                        <div className="animate-fade-in-up bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            <TeacherCheckInView
                                currentUser={user}
                                currentInstitution={currentInstitution || ({ id: user?.institutionId || '', name: 'Institution', checkinRadiusEnabled: false } as Institution)}
                                onLogAction={async (action: string) => {
                                    if (props.onLogAction) {
                                        await props.onLogAction(action);
                                    }
                                }}
                            />
                        </div>
                    )}

                    {activeTab === 'remedials' && (() => {
                        const activeSession = remedialSessions.find(s => s.status === 'In Progress');
                        const coursePrefects = props.users?.filter(
                            u => u.role === 'student' && u.courseId === selectedCourseId
                        ) || [];

                        const handleStartRemedial = async () => {
                            if (!selectedSubjectId || !selectedCourseId || !selectedPrefectId) {
                                return alert('Please select subject, class stream, and prefect.');
                            }

                            // Check daily max limit configuration
                            const todayStr = new Date().toDateString();
                            const existingTeacherSessionsToday = remedialSessions.filter(s =>
                                s.teacherId === user?.id && new Date(s.startTime).toDateString() === todayStr
                            );

                            try {
                                const ratesList = await apiService.fetchRemedialRateSettings(currentInstitution?.id || user?.institutionId || '');
                                const maxLimit = (ratesList && ratesList.length > 0 && ratesList[0].maxLessonsPerDay !== undefined) ? ratesList[0].maxLessonsPerDay : 1;

                                if (existingTeacherSessionsToday.length >= maxLimit) {
                                    return alert(`Daily Remedial Limit Reached: You have already conducted the maximum limit of ${maxLimit} remedial lesson(s) allowed per day.`);
                                }

                                const prefect = props.users?.find(u => u.id === selectedPrefectId);
                                const course = courses?.find(c => c.id === selectedCourseId);
                                const subject = subjects?.find(s => s.id === selectedSubjectId);

                                const newSession: RemedialSession = {
                                    id: `rem_${Date.now()}`,
                                    teacherId: user?.id || '',
                                    teacherName: user?.name || 'Teacher',
                                    subjectId: selectedSubjectId,
                                    subjectName: subject?.name || 'Subject',
                                    courseId: selectedCourseId,
                                    className: course?.name || 'Class',
                                    prefectId: selectedPrefectId,
                                    prefectName: prefect?.name || 'Prefect',
                                    prefectToken: `prefect_remedial_token_class_${selectedCourseId}`,
                                    startTime: new Date().toISOString(),
                                    status: 'In Progress',
                                    createdAt: new Date().toISOString(),
                                    institutionId: currentInstitution?.id || user?.institutionId || ''
                                };

                                await apiService.saveRemedialSession(newSession);
                                props.onLogAction?.(`Started remedial lesson: ${subject?.name} for ${course?.name}`);
                                alert('Remedial lesson started! Prefect card token verified.');
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to start remedial session');
                            }
                        };

                        const handleEndRemedial = async (session: RemedialSession) => {
                            try {
                                const end = new Date();
                                const start = new Date(session.startTime);
                                const diffMs = end.getTime() - start.getTime();
                                const calculatedHours = Math.max(1, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);

                                const updated = {
                                    ...session,
                                    endTime: end.toISOString(),
                                    hours: calculatedHours,
                                    status: 'Prefect Confirmed' as const
                                };

                                await apiService.saveRemedialSession(updated);
                                props.onLogAction?.(`Ended remedial lesson: ${session.subjectName} (${calculatedHours} hrs)`);
                                alert(`Remedial class completed successfully!\nVerified hours: ${calculatedHours} hrs.\nSent for admin approval.`);
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to end remedial session');
                            }
                        };

                        const handleSignVoucher = async (e: React.FormEvent) => {
                            e.preventDefault();
                            if (!signingPayout) return;
                            if (!anonymousToken.trim()) {
                                return alert('Please enter an anonymous signature token.');
                            }

                            try {
                                const updatedPayout = {
                                    ...signingPayout,
                                    status: 'Paid' as const,
                                    anonymousSignature: anonymousToken.trim(),
                                    signedAt: new Date().toISOString()
                                };
                                await apiService.saveRemedialPayout(updatedPayout);
                                alert('Payment voucher signed anonymously. Status updated to Paid!');
                                setSigningPayout(null);
                                setAnonymousToken('');
                                loadRemedialData();
                            } catch (err: any) {
                                alert(err.message || 'Failed to sign voucher');
                            }
                        };

                        return (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-6">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                        <QrCode className="w-5 h-5 text-indigo-500" /> Prefect Card Scanner Control Panel
                                    </h3>
                                    
                                    {activeSession ? (
                                        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/40 space-y-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
                                                <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-300 uppercase tracking-wider">Lesson Currently In Progress</h4>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600 dark:text-slate-400">
                                                <div>Subject: <span className="text-slate-900 dark:text-white font-black">{activeSession.subjectName}</span></div>
                                                <div>Stream: <span className="text-slate-900 dark:text-white font-black">{activeSession.className}</span></div>
                                                <div>Prefect: <span className="text-slate-900 dark:text-white font-black">{activeSession.prefectName}</span></div>
                                                <div>Started: <span className="text-slate-900 dark:text-white font-black">{new Date(activeSession.startTime).toLocaleTimeString()}</span></div>
                                            </div>

                                            <div className="pt-4 border-t border-indigo-100 dark:border-indigo-900/40 space-y-3">
                                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">End Session Scan simulation</p>
                                                <button 
                                                    onClick={() => handleEndRemedial(activeSession)}
                                                    className="px-5 py-3 bg-rose-650 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2"
                                                >
                                                    <Square className="w-4 h-4" /> Scan Prefect Card & End Lesson
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end bg-slate-50 dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Subject</label>
                                                <select 
                                                    value={selectedSubjectId}
                                                    onChange={e => setSelectedSubjectId(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none dark:text-white"
                                                >
                                                    <option value="">-- Subject --</option>
                                                    {subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Class Stream</label>
                                                <select 
                                                    value={selectedCourseId}
                                                    onChange={e => { setSelectedCourseId(e.target.value); setSelectedPrefectId(''); }}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none dark:text-white"
                                                >
                                                    <option value="">-- Stream --</option>
                                                    {courses?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Prefect Present</label>
                                                <select 
                                                    value={selectedPrefectId}
                                                    onChange={e => setSelectedPrefectId(e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-xs font-bold outline-none dark:text-white"
                                                    disabled={!selectedCourseId}
                                                >
                                                    <option value="">-- Prefect --</option>
                                                    {coursePrefects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>

                                            <div className="md:col-span-3 pt-4 flex justify-start">
                                                <button 
                                                    onClick={handleStartRemedial}
                                                    disabled={!selectedSubjectId || !selectedCourseId || !selectedPrefectId}
                                                    className="px-6 py-3.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <Play className="w-4 h-4" /> Scan Prefect Card to Start
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider italic flex items-center gap-2">
                                            <Clock className="w-4.5 h-4.5 text-indigo-500" /> Remedial Hours Logged
                                        </h4>
                                        <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
                                            {remedialSessions.length === 0 ? (
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider py-8 text-center">No logs recorded.</p>
                                            ) : (
                                                remedialSessions.map(s => (
                                                    <div key={s.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase">{s.subjectName}</p>
                                                            <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{s.className} • pref. {s.prefectName}</p>
                                                            <p className="text-[9px] text-slate-400 font-medium">{new Date(s.startTime).toLocaleDateString()}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="text-xs font-black text-slate-900 dark:text-white">{s.hours ? `${s.hours} hrs` : 'In Progress'}</p>
                                                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest inline-block mt-1 ${
                                                                s.status === 'Approved' ? 'bg-indigo-150 text-indigo-600' :
                                                                s.status === 'Prefect Confirmed' ? 'bg-amber-100 text-amber-600' :
                                                                s.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' :
                                                                'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {s.status}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-4">
                                        <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider italic flex items-center gap-2">
                                            <DollarSign className="w-4.5 h-4.5 text-indigo-500" /> My Payout Vouchers
                                        </h4>
                                        <div className="max-h-[300px] overflow-y-auto space-y-3 custom-scrollbar">
                                            {remedialPayouts.length === 0 ? (
                                                <p className="text-slate-400 font-bold text-xs uppercase tracking-wider py-8 text-center">No payout history.</p>
                                            ) : (
                                                remedialPayouts.map(p => (
                                                    <div key={p.id} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                                        <div>
                                                            <p className="text-xs font-black text-purple-650 font-mono">Voucher #{p.id.split('_')[1] || p.id}</p>
                                                            <p className="text-[10px] font-black text-indigo-650 font-mono mt-0.5">KES {p.totalAmount.toLocaleString()}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase mt-0.5">Period: {p.totalHours} hrs @ KES {p.hourlyRate}/hr</p>
                                                        </div>
                                                        <div className="text-right">
                                                            {p.status === 'Pending' ? (
                                                                <button 
                                                                    onClick={() => setSigningPayout(p)}
                                                                    className="px-3.5 py-2 bg-indigo-650 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-sm"
                                                                >
                                                                    Sign Voucher
                                                                </button>
                                                            ) : (
                                                                <span className="text-[9px] text-emerald-600 font-black uppercase tracking-widest flex items-center gap-1 justify-end">
                                                                    <CheckCircle2 className="w-3.5 h-3.5" /> Signed Anonymous
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {signingPayout && (
                                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-2xl max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-200">
                                            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/20">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Sign Payment Voucher Anonymously</h3>
                                                <button onClick={() => setSigningPayout(null)} className="text-slate-400 hover:text-slate-650">&times;</button>
                                            </div>
                                            <form onSubmit={handleSignVoucher} className="p-6 space-y-4">
                                                <div className="text-center p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Payout Amount</p>
                                                    <p className="text-2xl font-black text-indigo-650 mt-0.5">KES {signingPayout.totalAmount.toLocaleString()}</p>
                                                </div>

                                                <div>
                                                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Anonymous Signature Token</label>
                                                    <div className="flex gap-2">
                                                        <input 
                                                            type="text"
                                                            value={anonymousToken}
                                                            onChange={e => setAnonymousToken(e.target.value)}
                                                            placeholder="Enter signature (e.g. SIG-XXXXXX)"
                                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 transition-all dark:text-white"
                                                            required
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setAnonymousToken(`SIG-${Math.random().toString(36).substring(2, 8).toUpperCase()}`)}
                                                            className="px-3 py-2 bg-slate-800 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all"
                                                        >
                                                            Generate
                                                        </button>
                                                    </div>
                                                    <p className="text-[9px] text-slate-500 mt-1.5 leading-relaxed">
                                                        Your teacher identification details will **not** be recorded in the final signed voucher list to maintain complete anonymity.
                                                    </p>
                                                </div>

                                                <button 
                                                    type="submit"
                                                    className="w-full py-4 bg-indigo-650 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-md transition-all mt-4"
                                                >
                                                    Confirm & Sign Anonymously
                                                </button>
                                            </form>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })()}
                    {activeTab === 'lesson_plans' && (
                        <div className="animate-fade-in space-y-6 w-full">
                            <TeacherLessonPlanManager
                                currentInstitution={currentInstitution}
                                currentUser={user}
                                subjects={subjects}
                                courses={courses}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile Glassmorphic Bottom Navigation Bar */}
            <div className="lg:hidden fixed bottom-6 left-4 right-4 z-40 bg-white/80 dark:bg-slate-900/85 backdrop-blur-lg border border-slate-200/40 dark:border-slate-800/45 rounded-3xl p-2.5 shadow-2xl flex justify-around items-center no-print">
                {[
                    { id: 'dashboard', label: 'Home', icon: <CalendarPlusIcon className="w-5.5 h-5.5" /> },
                    { id: 'my_timetable', label: 'Schedule', icon: <ClockIcon className="w-5.5 h-5.5" /> },
                    { id: 'self_checkin', label: 'Check-In', icon: <ClockInIcon className="w-5.5 h-5.5" /> },
                    { id: 'eduflow', label: 'Tasks', icon: <ClipboardListIcon className="w-5.5 h-5.5" /> },
                    { id: 'more', label: 'More', icon: (
                        <svg className="w-5.5 h-5.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                    ) }
                ].map((item) => {
                    const isMore = item.id === 'more';
                    const mainTabs = ['dashboard', 'my_timetable', 'self_checkin', 'eduflow'];
                    const isActive = isMore 
                        ? !mainTabs.includes(activeTab) 
                        : activeTab === item.id;
                    
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (isMore) {
                                    setShowMoreDrawer(true);
                                } else {
                                    setActiveTab(item.id);
                                    setShowMoreDrawer(false);
                                }
                            }}
                            className={`flex flex-col items-center gap-1 p-2 rounded-2xl transition-all duration-300 ${
                                isActive 
                                    ? 'text-indigo-600 dark:text-indigo-400 scale-110' 
                                    : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-300'
                            }`}
                        >
                            <div className="relative">
                                {item.icon}
                                {isActive && (
                                    <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full shadow-lg shadow-indigo-500" />
                                )}
                            </div>
                            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Mobile Bottom Sheets - "More" Options Drawer */}
            {showMoreDrawer && (
                <div className="lg:hidden fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm animate-fade-in flex items-end no-print">
                    <div className="absolute inset-0" onClick={() => setShowMoreDrawer(false)} />
                    
                    <div className="w-full bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl rounded-t-[2.5rem] border-t border-slate-200/50 dark:border-slate-800/50 shadow-2xl relative z-10 animate-slide-up max-h-[80vh] flex flex-col">
                        <div className="w-12 h-1.5 bg-slate-250 dark:bg-slate-800 rounded-full mx-auto my-4 cursor-pointer shrink-0" onClick={() => setShowMoreDrawer(false)} />
                        
                        <div className="px-6 pb-2 shrink-0">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Additional Services</h3>
                            <p className="text-slate-850 dark:text-white text-md font-black uppercase tracking-tight mt-0.5 font-bold">Academic Control Panel</p>
                        </div>
                        
                        <div className="overflow-y-auto p-6">
                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { id: 'academic_hub', label: 'Academic Hub' },
                                    { id: 'scan_session', label: 'Scanner Module' },
                                    { id: 'synergy_hub', label: 'Synergy Hub' },
                                    { id: 'my_requests', label: 'Load Requests', enabled: useRequests },
                                    { id: 'inventory', label: 'Inventory Desk', enabled: props.inventoryItems && props.inventoryItems.length > 0 }
                                ]
                                .filter(x => x.enabled !== false)
                                .map((item) => {
                                    const isActive = activeTab === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                setActiveTab(item.id);
                                                setShowMoreDrawer(false);
                                            }}
                                            className={`flex flex-col items-center justify-center p-5 rounded-2xl transition-all duration-300 border ${
                                                isActive
                                                    ? 'bg-indigo-600/5 dark:bg-indigo-950/20 border-indigo-500/40 text-indigo-600 dark:text-indigo-400 scale-102 font-bold'
                                                    : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/60 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                                            }`}
                                        >
                                            <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-750">
                                                {renderTabIcon(item.id, "w-6 h-6")}
                                            </div>
                                            <span className="text-[9px] font-black uppercase tracking-widest mt-3 text-center">{item.label}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                        
                        <div className="p-6 border-t border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/20 shrink-0">
                            <button
                                onClick={() => setShowMoreDrawer(false)}
                                className="w-full py-3.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                            >
                                Close Panels
                            </button>
                        </div>
                    </div>
                </div>
            )}



            {isRequestModalOpen && (
                <RequestModal
                    subjects={Array.from(selectedSubjectIds).map(id => getSubjectById(id)!).filter(Boolean)}
                    user={user}
                    courses={courses || []}
                    timetableSettings={timetableSettings}
                    onClose={() => setIsRequestModalOpen(false)}
                    onSubmit={handleRequestSubmit}
                />
            )}

            {changingAllocation && (
                <ChangeRequestModal
                    allocation={changingAllocation}
                    subject={getSubjectById(changingAllocation.subjectId)!}
                    user={user}
                    onClose={() => setChangingAllocation(null)}
                    onSubmit={(id, just, prio) => { onAllocationChangeRequest?.(id, just, prio); setChangingAllocation(null); }}
                />
            )}

            {deallocatingRequest && (
                <DeallocationModal
                    subject={getSubjectById(deallocatingRequest.subjectId)!}
                    onClose={() => setDeallocatingRequest(null)}
                    onSubmit={(justification) => { onDeallocationRequest?.(deallocatingRequest.id, justification); setDeallocatingRequest(null); }}
                />
            )}

            {showIssueModal && selectedItem && (
                <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">Issue Item</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedItem.name}</p>
                            </div>
                            <button onClick={() => setShowIssueModal(false)} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                <XIcon className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <form onSubmit={handleIssueSubmit} className="p-8 space-y-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Recipient (Student/Staff)</label>
                                <div className="relative">
                                    <select
                                        required
                                        value={issueForm.recipientId}
                                        onChange={e => setIssueForm({ ...issueForm, recipientId: e.target.value })}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold appearance-none"
                                    >
                                        <option value="">Select Recipient...</option>
                                        {(props.users || []).map(u => (
                                            <option key={u.id} value={u.id}>{u.name} ({u.role.replace('_', ' ')})</option>
                                        ))}
                                    </select>
                                    <UserGroupIcon className="w-5 h-5 text-slate-400 absolute left-3 top-3" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1">Quantity to Issue</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={selectedItem.quantity}
                                    required
                                    value={issueForm.quantity}
                                    onChange={e => setIssueForm({ ...issueForm, quantity: parseInt(e.target.value) || 1 })}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                                />
                                <p className="text-[10px] font-bold text-slate-400 mt-2 text-right uppercase tracking-wider">Available: {selectedItem.quantity} {selectedItem.unit}</p>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowIssueModal(false)}
                                    className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-black uppercase tracking-widest transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-200 dark:shadow-none transition-colors disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Issuing...' : 'Confirm Issue'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
        .btn-primary { background: var(--color-primary); color: white; padding: 0.5rem 1rem; border-radius: 0.75rem; border: none; transition: all 0.2s; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .btn-secondary { background: white; color: #475569; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .dark .btn-secondary { background: #0f172a; color: #f1f5f9; border-color: #334155; }
      `}</style>
        </div>
    );
};

