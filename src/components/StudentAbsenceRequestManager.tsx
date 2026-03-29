
import React, { useMemo } from 'react';
import type { StudentAbsenceRequest, StudentAbsenceRequestStatus, User, Course } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';


interface StudentAbsenceRequestManagerProps {
    requests: StudentAbsenceRequest[];
    onUpdateRequest: (requestId: string, newStatus: StudentAbsenceRequestStatus) => void;
    currentUser: User;
    users: User[];
    courses: Course[];
}

export const StudentAbsenceRequestManager: React.FC<StudentAbsenceRequestManagerProps> = ({ requests, onUpdateRequest, currentUser, users, courses }) => {
    const pendingRequests = useMemo(() => {
        let visibleRequests = requests.filter(r => r.status === 'pending');

        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            const coursesInDept = new Set(courses.filter(c => c.departmentId === currentUser.departmentId).map(c => c.id));
            const studentsInDept = new Set(users.filter(u => u.role === 'student' && u.courseId && coursesInDept.has(u.courseId)).map(u => u.id));
            visibleRequests = visibleRequests.filter(req => studentsInDept.has(req.studentId));
        }

        return visibleRequests.sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [requests, currentUser, users, courses]);

    return (
        <section>
            <h3 className="text-xl font-semibold mb-4">Pending Student Absence Requests ({pendingRequests.length})</h3>
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                {pendingRequests.length > 0 ? (
                    <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                        {pendingRequests.map(req => {
                            const user = users.find(u => u.id === req.studentId);
                            return (
                                <li key={req.id} className="p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-[var(--color-primary)]">Requested by: {user?.name}</p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 font-semibold">
                                                {req.startDate} to {req.endDate}
                                                <span className="ml-2 font-normal">({req.isFullDay ? "Full Day(s)" : `${req.startTime} - ${req.endTime}`})</span>
                                            </p>
                                            {req.reason && <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">"{req.reason}"</p>}
                                            {req.supportingDocumentUrl && <a href={req.supportingDocumentUrl} target="_blank" rel="noopener noreferrer" className="mt-2 text-sm font-medium text-blue-600 hover:underline">View Supporting Document</a>}
                                        </div>
                                         <div className="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0 flex space-x-2">
                                            <button onClick={() => onUpdateRequest(req.id, 'approved')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"><CheckIcon className="w-5 h-5 mr-1.5"/> Approve</button>
                                            <button onClick={() => onUpdateRequest(req.id, 'rejected')} className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700"><XIcon className="w-5 h-5 mr-1.5"/> Reject</button>
                                        </div>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="p-6 text-center text-slate-500 dark:text-slate-400">There are no pending student absence requests.</p>
                )}
            </div>
        </section>
    );
};
