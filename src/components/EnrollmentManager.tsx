
import React, { useMemo } from 'react';
import type { EnrollmentRequest, User, Subject } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';


interface EnrollmentManagerProps {
    requests: EnrollmentRequest[];
    onUpdateRequest: (requestId: string, newStatus: 'approved' | 'rejected') => void;
    currentUser: User;
    users: User[];
    subjects: Subject[];
}

export const EnrollmentManager: React.FC<EnrollmentManagerProps> = ({
    requests,
    onUpdateRequest,
    currentUser,
    users,
    subjects,
}) => {

    const pendingRequests = useMemo(() => {
        let visibleRequests = requests.filter(r => r.status === 'pending');

        // HODs/TTOs can only see requests for subjects in their department
        if ((currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            const subjectsInHodDepartment = new Set(
                subjects.filter(s => s.departmentId === currentUser.departmentId).map(s => s.id)
            );
            visibleRequests = visibleRequests.filter(req => subjectsInHodDepartment.has(req.subjectId));
        }

        return visibleRequests.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    }, [requests, currentUser, subjects]);

    return (
        <section>
            <h3 className="text-xl font-semibold mb-4">Pending Student Enrollments ({pendingRequests.length})</h3>
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                {pendingRequests.length > 0 ? (
                    <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                        {pendingRequests.map(req => {
                            const student = users.find(u => u.id === req.studentId);
                            const subject = subjects.find(s => s.id === req.subjectId);

                            if (!student || !subject) return null;

                            const canAct = currentUser.role === 'admin' || currentUser.role === 'head_teacher' || currentUser.role === 'dos' || ((currentUser.role === 'hod' || currentUser.role === 'tto') && subject.departmentId === currentUser.departmentId);

                            return (
                                <li key={req.id} className="p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1">
                                            <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                                                {subject.name} <span className="font-normal text-slate-500 dark:text-slate-400">({subject.code})</span>
                                            </p>
                                            <p className="text-sm font-medium text-[var(--color-primary)]">
                                                Requested by: {student.name} ({student.staffId})
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                Submitted on: {new Date(req.timestamp)?.toLocaleString()}
                                            </p>
                                            
                                            <div className="mt-3">
                                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                                    <ClockIcon className="w-4 h-4 mr-1.5" /> Pending Approval
                                                </span>
                                            </div>
                                        </div>
                                        {canAct && (
                                            <div className="mt-4 sm:mt-0 sm:ml-6 flex-shrink-0 flex space-x-2">
                                                <button 
                                                    onClick={() => onUpdateRequest(req.id, 'approved')} 
                                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                                                >
                                                    <CheckIcon className="w-5 h-5 mr-1.5"/> Approve
                                                </button>
                                                <button 
                                                    onClick={() => onUpdateRequest(req.id, 'rejected')} 
                                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none"
                                                >
                                                    <XIcon className="w-5 h-5 mr-1.5"/> Reject
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="p-6 text-center text-slate-500 dark:text-slate-400">
                        There are no pending student enrollment requests for your review.
                    </p>
                )}
            </div>
        </section>
    );
};

