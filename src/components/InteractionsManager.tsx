
import React, { useState, useMemo } from 'react';
import type { AllocationRequest, User, Subject, AbsenceRequest, TimetableEntry, TimeOffRequest, TimeOffRequestStatus, LecturerContract, Semester, Institution, LetterheadConfig, FeedbackSubmission, LessonRating, EnrollmentRequest, StudentAbsenceRequest, StudentAbsenceRequestStatus, Department, Course, RequestStatus } from '../types';
import { LecturerInteractionManager } from './LecturerInteractionManager';
import { StudentInteractionManager } from './StudentInteractionManager';
import { UserGroupIcon, AcademicCapIcon } from './icons/index';

interface InteractionsManagerProps {
    // Lecturer Props
    requests: AllocationRequest[];
    allocations?: AllocationRequest[]; // Added allocations prop
    onUpdateRequestStatus?: (requestId: string, newStatus: RequestStatus) => Promise<void>;
    onBulkUpdateRequestStatus?: (newStatus: 'hod_approved' | 'approved', departmentId?: string) => Promise<void>;
    onOpenDirectAssign: () => void;
    absenceRequests: AbsenceRequest[];
    onUpdateAbsenceRequest?: (requestId: string, newStatus: 'approved' | 'rejected') => void;
    timeOffRequests: TimeOffRequest[];
    onUpdateTimeOffRequestStatus?: (requestId: string, newStatus: TimeOffRequestStatus) => void;
    contracts: LecturerContract[];

    // Student Props
    feedbackSubmissions: FeedbackSubmission[];
    onUpdateFeedbackStatus?: (submissionId: string, status: FeedbackSubmission['status']) => void;
    lessonRatings: LessonRating[];
    enrollmentRequests: EnrollmentRequest[];
    onUpdateEnrollmentRequest?: (requestId: string, newStatus: 'approved' | 'rejected') => void;
    studentAbsenceRequests: StudentAbsenceRequest[];
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

    const isSchool = props.currentInstitution?.institutionType === 'Primary' || props.currentInstitution?.institutionType === 'Secondary';

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
                    allocations={props.allocations || []} // Pass allocations
                    onUpdateRequestStatus={props.onUpdateRequestStatus || (async () => { })}
                    onBulkUpdateRequestStatus={props.onBulkUpdateRequestStatus || (async () => { })}
                    onOpenDirectAssign={props.onOpenDirectAssign || (() => { })}
                    onUpdateRequest={props.onUpdateRequest || (() => { })}
                    onUpdateTimeOffRequestStatus={props.onUpdateTimeOffRequestStatus || (() => { })}
                />}
                {activeInteractionTab === 'student' && !isSchool && <StudentInteractionManager
                    {...props}
                    onUpdateFeedbackStatus={props.onUpdateFeedbackStatus || (() => { })}
                    onUpdateEnrollmentRequest={props.onUpdateEnrollmentRequest || (() => { })}
                    onUpdateStudentAbsenceRequestStatus={props.onUpdateStudentAbsenceRequestStatus || (() => { })}
                />}
            </main>
        </div>
    );
};
