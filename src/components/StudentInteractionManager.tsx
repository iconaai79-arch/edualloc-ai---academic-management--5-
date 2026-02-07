
import React, { useState } from 'react';
import type { FeedbackSubmission, User, LessonRating, Subject, Department, EnrollmentRequest, Course, StudentAbsenceRequest, StudentAbsenceRequestStatus } from '../types';

import { FeedbackManager } from './FeedbackManager';
import { LecturerRatingReport } from './LecturerRatingReport';
import { EnrollmentManager } from './EnrollmentManager';
import { StudentAbsenceRequestManager } from './StudentAbsenceRequestManager';
import {
    ChatBubbleBottomCenterTextIcon,
    StarIcon,
    AcademicCapIcon,
    ClipboardListIcon,
} from './icons';

interface StudentInteractionManagerProps {
    feedbackSubmissions: FeedbackSubmission[];
    onUpdateFeedbackStatus: (submissionId: string, status: FeedbackSubmission['status']) => void;
    lessonRatings: LessonRating[];
    enrollmentRequests: EnrollmentRequest[];
    onUpdateEnrollmentRequest: (requestId: string, newStatus: 'approved' | 'rejected') => void;
    studentAbsenceRequests: StudentAbsenceRequest[];
    onUpdateStudentAbsenceRequestStatus: (requestId: string, newStatus: StudentAbsenceRequestStatus) => void;
    users: User[];
    subjects: Subject[];
    departments: Department[];
    courses: Course[];
    currentUser: User;
}

export const StudentInteractionManager: React.FC<StudentInteractionManagerProps> = (props) => {
    const [subTab, setSubTab] = useState('feedback');
    const { 
        feedbackSubmissions, onUpdateFeedbackStatus, 
        lessonRatings, 
        enrollmentRequests, onUpdateEnrollmentRequest,
        studentAbsenceRequests, onUpdateStudentAbsenceRequestStatus,
        users, subjects, departments, courses, currentUser 
    } = props;

    const subTabs = [
        { key: 'feedback', label: 'Feedback & Suggestions', icon: <ChatBubbleBottomCenterTextIcon className="w-5 h-5 mr-3" /> },
        { key: 'ratings', label: 'Lecturer Ratings', icon: <StarIcon className="w-5 h-5 mr-3" /> },
        { key: 'enrollments', label: 'Enrollment Requests', icon: <AcademicCapIcon className="w-5 h-5 mr-3" /> },
        { key: 'student_absences', label: 'Student Absences', icon: <ClipboardListIcon className="w-5 h-5 mr-3" /> },
    ];

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <aside className="md:w-64 flex-shrink-0">
                <nav className="flex flex-col space-y-1" aria-label="Student Interaction Tabs">
                    {subTabs.map(tabInfo => (
                         <button
                            key={tabInfo.key}
                            onClick={() => setSubTab(tabInfo.key)}
                            className={`${subTab === tabInfo.key ? 'bg-slate-100 dark:bg-slate-700 text-[var(--color-primary)]' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300'} group flex items-center px-3 py-2 text-sm font-medium rounded-md w-full text-left transition-colors`}
                        >
                            {tabInfo.icon}
                            {tabInfo.label}
                        </button>
                    ))}
                </nav>
            </aside>
            <main className="flex-1 min-w-0">
                {subTab === 'feedback' && (
                    <FeedbackManager 
                        submissions={feedbackSubmissions} 
                        users={users} 
                        onUpdateStatus={onUpdateFeedbackStatus} 
                    />
                )}
                {subTab === 'ratings' && (
                    <LecturerRatingReport 
                        ratings={lessonRatings} 
                        lecturers={users} 
                        subjects={subjects} 
                        departments={departments} 
                        currentUser={currentUser} 
                    />
                )}
                {subTab === 'enrollments' && (
                    <EnrollmentManager 
                        requests={enrollmentRequests} 
                        onUpdateRequest={onUpdateEnrollmentRequest} 
                        currentUser={currentUser} 
                        users={users} 
                        subjects={subjects} 
                    />
                )}
                {subTab === 'student_absences' && (
                    <StudentAbsenceRequestManager
                        requests={studentAbsenceRequests}
                        onUpdateRequest={onUpdateStudentAbsenceRequestStatus}
                        currentUser={currentUser}
                        users={users}
                        courses={courses}
                    />
                )}
            </main>
        </div>
    );
};
