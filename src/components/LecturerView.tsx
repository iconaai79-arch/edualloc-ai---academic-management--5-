

import React, { useState, useMemo } from 'react';
import type {
    Subject, User, AllocationRequest, Department, Priority,
    TimetableEntry, AcademicYear, Semester, TimetableSettings,
    Course, LetterheadConfig, AllocationRequestPreferences, UserTask, Institution,
    Assignment, Submission, Assessment, AssessmentMark
} from '../types';
import { SubjectCard } from './SubjectCard';
import { RequestModal } from './RequestModal';
import { DeallocationModal } from './DeallocationModal';
import { ChangeRequestModal } from './ChangeRequestModal';
import { LecturerDashboard } from './LecturerDashboard';
import { TimetableGrid } from './TimetableGrid';
import { LecturerAssignmentManager } from './LecturerAssignmentManager';
import { AssessmentManager } from './AssessmentManager';
import {
    CalendarPlusIcon, ArrowsRightLeftIcon, MagnifyingGlassIcon,
    BookOpenIcon, ClockIcon, CheckIcon, XIcon, CheckCircleIcon,
    ExclamationTriangleIcon, ClipboardListIcon, AcademicCapIcon
} from './icons';

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

    // Assignment & Assessment Props
    assignments: Assignment[];
    submissions: Submission[];
    onAddAssignment: (data: Omit<Assignment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssignment: (id: string) => void;
    onUpdateSubmission: (id: string, data: Partial<Submission>) => void;

    assessments: Assessment[];
    assessmentMarks: AssessmentMark[];
    onAddAssessment: (data: Omit<Assessment, 'id' | 'institutionId' | 'createdAt'>) => void;
    onDeleteAssessment: (id: string) => void;
    onSaveAssessmentMarks: (assessmentId: string, marksData: { studentId: string; marks: number | null; comments?: string }[]) => void;
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
        user, users = [], subjects = [], departments = [], courses = [], requests = [], allocations = [],
        onSubmitRequest, onWithdrawRequest, onDeallocationRequest, onAllocationChangeRequest,
        getSubjectById, getRoomById, getLecturerById, generatedTimetable = [],
        activeAcademicYear, activeSemester, academicYears = [], semesters = [], timetableSettings,
        userTasks = [], onAddTask, onUpdateTask, onDeleteTask, currentInstitution,
        assignments, submissions, onAddAssignment, onDeleteAssignment, onUpdateSubmission,
        assessments, assessmentMarks, onAddAssessment, onDeleteAssessment, onSaveAssessmentMarks
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

    const myAllocatedSubjects = useMemo(() => {
        return allocations.map(a => subjects.find(s => s.id === a.subjectId)).filter((s): s is Subject => !!s);
    }, [allocations, subjects]);

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
        const base = [
            { id: 'dashboard', label: 'Dashboard', icon: <BookOpenIcon className="w-4 h-4" /> },
            { id: 'my_timetable', label: 'My Schedule', icon: <CalendarPlusIcon className="w-4 h-4" /> }
        ];
        if (useRequests) base.push({ id: 'my_requests', label: 'Allocations', icon: <ClockIcon className="w-4 h-4" /> });

        // Add Assignments and Assessments tabs
        base.push({ id: 'assignments', label: 'Assignments', icon: <ClipboardListIcon className="w-4 h-4" /> });
        base.push({ id: 'assessments', label: 'Assessments', icon: <AcademicCapIcon className="w-4 h-4" /> });

        return base;
    }, [useRequests]);

    return (
        <div className="space-y-6 font-sans text-slate-900 dark:text-slate-100">
            <div className="border-b border-slate-200 dark:border-slate-700 no-print bg-white dark:bg-slate-800 rounded-2xl shadow-sm px-2 overflow-x-auto no-scrollbar">
                <nav className="-mb-px flex space-x-8">
                    {menuTabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'} whitespace-nowrap py-4 px-4 border-b-2 font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2`}
                        >
                            {tab.icon} {tab.label}
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
                    onRequestChange={(alloc) => setChangingAllocation(alloc)}
                />
            )}

            {activeTab === 'my_timetable' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-6">Staff Schedule</h3>
                        <TimetableGrid
                            entries={lecturerTimetable}
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
                                                        {isLocked ? <ExclamationTriangleIcon className="w-10 h-10" /> : <CheckCircleIcon className="w-10 h-10" />}
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

            {activeTab === 'assignments' && (
                <LecturerAssignmentManager
                    user={user}
                    users={users}
                    assignments={assignments || []}
                    submissions={submissions || []}
                    allocatedSubjects={myAllocatedSubjects}
                    onAddAssignment={onAddAssignment}
                    onDeleteAssignment={onDeleteAssignment}
                    onUpdateSubmission={onUpdateSubmission}
                />
            )}

            {activeTab === 'assessments' && (
                <AssessmentManager
                    user={user}
                    assessments={assessments || []}
                    assessmentMarks={assessmentMarks || []}
                    allocatedSubjects={myAllocatedSubjects}
                    users={users}
                    courses={courses}
                    onAddAssessment={onAddAssessment}
                    onDeleteAssessment={onDeleteAssessment}
                    onSaveAssessmentMarks={onSaveAssessmentMarks}
                />
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

            <style>{`
        .btn-primary { background: var(--color-primary); color: white; padding: 0.5rem 1rem; border-radius: 0.75rem; border: none; transition: all 0.2s; }
        .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(1.1); }
        .btn-secondary { background: white; color: #475569; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; transition: all 0.2s; }
        .dark .btn-secondary { background: #0f172a; color: #f1f5f9; border-color: #334155; }
      `}</style>
        </div>
    );
};
