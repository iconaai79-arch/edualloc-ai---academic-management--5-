
import React, { useState, useMemo } from 'react';
import type { AllocationRequest, User, Subject, AbsenceRequest, TimetableEntry, TimeOffRequest, TimeOffRequestStatus, LecturerContract, Semester, Institution, LetterheadConfig, FeedbackSubmission, LessonRating, EnrollmentRequest, StudentAbsenceRequest, StudentAbsenceRequestStatus, Department, Course, RequestStatus } from '../types';
import { LecturerInteractionManager } from './LecturerInteractionManager';
import { StudentInteractionManager } from './StudentInteractionManager';
import { UserGroupIcon } from './icons/UserGroupIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';


interface InteractionsManagerProps {
    // Lecturer Props
    requests?: AllocationRequest[];
    allocations?: AllocationRequest[]; // Added allocations prop
    onUpdateRequestStatus?: (requestId: string, newStatus: RequestStatus) => Promise<void>;
    onBulkUpdateRequestStatus?: (newStatus: 'hod_approved' | 'approved', departmentId?: string) => Promise<void>;
    onOpenDirectAssign?: () => void;
    absenceRequests?: AbsenceRequest[];
    onUpdateAbsenceRequest?: (requestId: string, newStatus: 'approved' | 'rejected') => void;
    timeOffRequests?: TimeOffRequest[];
    onUpdateTimeOffRequestStatus?: (requestId: string, newStatus: TimeOffRequestStatus) => Promise<void>;
    contracts?: LecturerContract[];

    // Student Props
    feedbackSubmissions?: FeedbackSubmission[];
    onUpdateFeedbackStatus?: (submissionId: string, status: FeedbackSubmission['status']) => void;
    lessonRatings?: LessonRating[];
    enrollmentRequests?: EnrollmentRequest[];
    onUpdateEnrollmentRequest?: (requestId: string, newStatus: 'approved' | 'rejected') => void;
    studentAbsenceRequests?: StudentAbsenceRequest[];
    onUpdateStudentAbsenceRequestStatus?: (requestId: string, newStatus: StudentAbsenceRequestStatus) => void;

    // Common Props
    currentUser: User;
    users: User[];
    subjects: Subject[];
    departments: Department[];
    courses: Course[];
    generatedTimetable: TimetableEntry[];
    getLecturerById: (id: string) => User | undefined;
    getSubjectById?: (id: string) => Subject | undefined;
    activeSemester?: Semester | null;
    currentInstitution?: Institution | null;
    letterheadConfig: LetterheadConfig;
    footerImageUrl: string | null;
    onUpdateRequest?: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
}

export const InteractionsManager: React.FC<InteractionsManagerProps> = (props) => {
    const [activeInteractionTab, setActiveTab] = useState('lecturer');

    const isSchool = (props.currentInstitution?.institutionType === 'Education' && (props.currentInstitution?.category === 'Primary' || props.currentInstitution?.category === 'Secondary')) || (props.currentInstitution?.institutionType as any) === 'Primary' || (props.currentInstitution?.institutionType as any) === 'Secondary';

    const workloadStats = useMemo(() => {
        const approved = (props.allocations || []).filter(a => a && a.status === 'approved');
        let totalLessons = 0;
        let totalPeriods = 0;

        approved.forEach(a => {
            const subject = (props.subjects || []).find(s => s && s.id === a.subjectId);
            if (subject) {
                const lessonsPerStream = (subject.lessonStructure || []).reduce((sum, ls) => sum + (ls.count || 0), 0);
                const periodsPerStream = (subject.lessonStructure || []).reduce((sum, ls) => sum + (ls.periods || 0) * (ls.count || 0), 0);
                const streams = (a.courseLevelIds || []).length || 1;
                
                totalLessons += (lessonsPerStream * streams);
                totalPeriods += (periodsPerStream * streams);
            }
        });

        return { totalLessons, totalPeriods, staffCount: new Set(approved.map(a => a.lecturerId)).size };
    }, [props.allocations, props.subjects]);

    const interactionTabs = useMemo(() => {
        const tabs = [
            { key: 'lecturer', label: isSchool ? 'Teacher Interactions' : 'Lecturer Interactions', icon: <UserGroupIcon className="w-5 h-5 mr-3" /> },
        ];
        if (!isSchool) {
            tabs.push({ key: 'student', label: 'Student Interactions', icon: <AcademicCapIcon className="w-5 h-5 mr-3" /> });
        }
        return tabs;
    }, [isSchool]);

    return (
        <div className="space-y-8">
            {/* Registry Meta-Analysis Header */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl text-indigo-600">
                        <UserGroupIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Active Faculty</p>
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{workloadStats.staffCount}</h4>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-900/30 rounded-3xl text-emerald-600">
                        <CheckCircleIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Total Lessons</p>
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{workloadStats.totalLessons}</h4>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 flex items-center gap-6">
                    <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-3xl text-amber-600">
                        <ClockIcon className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Weekly Periods</p>
                        <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{workloadStats.totalPeriods}</h4>
                    </div>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-8">
            <aside className="md:w-64 flex-shrink-0">
                <nav className="flex flex-col space-y-1" aria-label="Interaction Type Tabs">
                    {interactionTabs.map(tabInfo => (
                        <button
                            key={tabInfo.key}
                            onClick={() => setActiveTab(tabInfo.key)}
                            className={`${activeInteractionTab === tabInfo.key ? 'bg-slate-100 dark:bg-slate-700 text-[var(--color-primary)]' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'} group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left transition-colors`}
                        >
                            {tabInfo.icon}
                            {tabInfo.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 min-w-0">
                {activeInteractionTab === 'lecturer' && <LecturerInteractionManager
                    {...props}
                    onUpdateRequestStatus={props.onUpdateRequestStatus || (async () => { })}
                    onBulkUpdateRequestStatus={props.onBulkUpdateRequestStatus || (async () => { })}
                    onOpenDirectAssign={props.onOpenDirectAssign || (() => { })}
                    onUpdateRequest={props.onUpdateRequest || (() => { })}
                    onUpdateTimeOffRequestStatus={props.onUpdateTimeOffRequestStatus || (async () => { })}
                    requests={props.requests || []}
                    allocations={props.allocations || []}
                    absenceRequests={props.absenceRequests || []}
                    timeOffRequests={props.timeOffRequests || []}
                    contracts={props.contracts || []}
                />}
                {activeInteractionTab === 'student' && !isSchool && <StudentInteractionManager
                    {...props}
                    onUpdateFeedbackStatus={props.onUpdateFeedbackStatus || (() => { })}
                    onUpdateEnrollmentRequest={props.onUpdateEnrollmentRequest || (() => { })}
                    onUpdateStudentAbsenceRequestStatus={props.onUpdateStudentAbsenceRequestStatus || (() => { })}
                    feedbackSubmissions={props.feedbackSubmissions || []}
                    lessonRatings={props.lessonRatings || []}
                    enrollmentRequests={props.enrollmentRequests || []}
                    studentAbsenceRequests={props.studentAbsenceRequests || []}
                    absenceRequests={props.absenceRequests || []}
                />}
            </main>
        </div>
    </div>
    );
};
