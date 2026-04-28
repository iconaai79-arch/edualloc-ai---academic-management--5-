
import React, { useState, useMemo } from 'react';
import type {
    Subject, User, AllocationRequest, Department, Priority,
    TimetableEntry, AcademicYear, Semester, TimetableSettings,
    Course, LetterheadConfig, AllocationRequestPreferences, UserTask, Institution,
    CountyInventoryItem
} from '../types';
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
import { ChartBarIcon } from './icons/ChartBarIcon';


interface LecturerViewProps {
    user: User;
    users: User[];
    subjects: Subject[];
    departments: Department[];
    courses: Course[];
    rooms: any[];
    requests: AllocationRequest[];
    allocations: AllocationRequest[];
    timeOffRequests: any[];
    onSubmitRequest: (subjectIds: string[], justification: string, signatureUrl: string | null, priority: Priority, academicYearId: string, semesterId: string, preferences: AllocationRequestPreferences | undefined, courseLevelSelections: Record<string, string[]>) => Promise<boolean>;
    onWithdrawRequest: (requestId: string) => void;
    onDeallocationRequest: (requestId: string, justification: string) => void;
    onAllocationChangeRequest: (requestId: string, justification: string, newPriority: Priority) => void;
    getSubjectById: (id: string) => Subject | undefined;
    getRoomById: (id: string) => any | undefined;
    getLecturerById: (id: string) => User | undefined;
    generatedTimetable: TimetableEntry[];
    allTimetableEntries: TimetableEntry[];
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    academicYears: AcademicYear[];
    semesters: Semester[];
    timetableSettings: TimetableSettings;
    letterheadConfig: LetterheadConfig;
    footerImageUrl: string | null;
    userTasks: UserTask[];
    onAddTask: (data: { title: string; dueDate?: string; }) => void;
    onUpdateTask: (taskId: string, isComplete: boolean) => void;
    onDeleteTask: (taskId: string) => void;
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
    onAccessAlumnaPortal: (school: any) => void;
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
        user, subjects = [], departments = [], courses = [], requests = [], allocations = [],
        onSubmitRequest, onWithdrawRequest, onDeallocationRequest, onAllocationChangeRequest,
        getSubjectById, getRoomById, getLecturerById, generatedTimetable = [],
        activeAcademicYear, activeSemester, academicYears = [], semesters = [], timetableSettings,
        userTasks = [], onAddTask, onUpdateTask, onDeleteTask, currentInstitution,
        onAccessAlumnaPortal, schoolRegistry
    } = props;

    const [activeTab, setActiveTab] = useState('dashboard');
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
        (generatedTimetable || []).filter(entry => entry && entry.lecturerId === user.id),
        [generatedTimetable, user.id]
    );

    const myPendingRequests = useMemo(() =>
        (requests || []).filter(r => r && r.lecturerId === user.id && r.status !== 'approved' && r.status !== 'disapproved' && r.status !== 'change_request_pending' && r.status !== 'deallocation_pending'),
        [requests, user.id]
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
        const base = ['dashboard', 'academic_hub', 'my_timetable'];
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

        const recipient = props.users.find(u => u.id === issueForm.recipientId);
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
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
            <div className="border-b border-slate-200 dark:border-slate-700 no-print bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-2">
                <nav className="-mb-px flex space-x-8 overflow-x-auto no-scrollbar">
                    {menuTabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === tab ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                        >
                            {tab === 'dashboard' && <CalendarPlusIcon className="w-4 h-4" />}
                            {tab === 'academic_hub' && <ChartBarIcon className="w-4 h-4 text-amber-500" />}
                            {tab === 'my_timetable' && <ClockIcon className="w-4 h-4 text-indigo-500" />}
                            {tab === 'my_requests' && <BookOpenIcon className="w-4 h-4 text-emerald-500" />}
                            {tab === 'inventory' && <ArchiveBoxIcon className="w-4 h-4 text-rose-500" />}
                            {tab.replace(/_/g, ' ')}
                        </button>
                    ))}
                </nav>
            </div>

            {submitSuccess === true && (
                <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 p-4 rounded-2xl flex items-center gap-3 animate-fade-in shadow-sm">
                    <CheckCircleIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    <p className="text-sm font-bold text-green-800 dark:text-green-200">Registry records successfully updated.</p>
                </div>
            )}

            {activeTab === 'dashboard' && (
                <LecturerDashboard
                    user={user}
                    requests={requests}
                    allocations={allocations}
                    subjects={subjects}
                    getSubjectById={getSubjectById}
                    getRoomById={getRoomById}
                    setActiveTab={setActiveTab}
                    generatedTimetable={generatedTimetable}
                    onLessonCheckIn={() => { }}
                    onAbsenceRequest={() => { }}
                    userTasks={userTasks}
                    onAddTask={onAddTask}
                    onUpdateTask={onUpdateTask}
                    onDeleteTask={onDeleteTask}
                    onNavigateToNearby={() => setActiveTab('my_timetable')}
                    currentInstitution={currentInstitution}
                    onRequestChange={(alloc) => {
                        setChangingAllocation(alloc);
                    }}
                    studentAttendances={props.studentAttendances}
                    studentAbsenceRequests={props.studentAbsenceRequests}
                    onSaveAttendance={props.onSaveAttendance}
                    users={props.users}
                    onAccessAlumnaPortal={onAccessAlumnaPortal}
                    schoolRegistry={schoolRegistry}
                />
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
                                    allocatedSubjects={allocations.map(a => getSubjectById(a.subjectId)!).filter(Boolean)}
                                    users={props.users}
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
                                    users={props.users}
                                    subjects={subjects}
                                    courses={courses}
                                    departments={departments}
                                    letterheadConfig={props.letterheadConfig}
                                    logoUrl={currentInstitution?.logoUrl || null}
                                    footerImageUrl={props.footerImageUrl}
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
                                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Code or Name..." className="form-input pl-10" />
                                        <MagnifyingGlassIcon className="w-5 h-5 absolute left-3.5 top-3.5 text-slate-400" />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Department</label>
                                    <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="form-select">
                                        <option value="all">All Departments</option>
                                        {(departments || []).map(d => d && <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <button
                                    onClick={() => setIsRequestModalOpen(true)}
                                    disabled={selectedSubjectIds.size === 0 || isSubmitting}
                                    className="btn-primary h-12 flex items-center justify-center gap-2 disabled:opacity-50 shadow-xl shadow-indigo-100"
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
                                        isRequested={requests.some(r => r && r.subjectId === subject.id && r.lecturerId === user.id)}
                                        isAllocated={allocations.some(a => a && a.subjectId === subject.id && a.lecturerId === user.id && a.status === 'approved')}
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
                                        <li key={alloc.id} className={`p-8 hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-all ${isLocked ? 'bg-slate-50/80 dark:bg-slate-800/80' : ''}`}>
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
                    onSubmit={(id, just, prio) => { onAllocationChangeRequest(id, just, prio); setChangingAllocation(null); }}
                />
            )}

            {deallocatingRequest && (
                <DeallocationModal
                    subject={getSubjectById(deallocatingRequest.subjectId)!}
                    onClose={() => setDeallocatingRequest(null)}
                    onSubmit={(justification) => { onDeallocationRequest(deallocatingRequest.id, justification); setDeallocatingRequest(null); }}
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
                                        {props.users.map(u => (
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
