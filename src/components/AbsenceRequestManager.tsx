import React, { useMemo } from 'react';
import type { AbsenceRequest, User, Subject, TimetableEntry, Role } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';


interface AbsenceRequestManagerProps {
    requests: AbsenceRequest[];
    onUpdateRequest: (requestId: string, newStatus: 'approved' | 'rejected') => void;
    currentUser: User;
    users: User[];
    subjects: Subject[];
    generatedTimetable: TimetableEntry[];
}

export const AbsenceRequestManager: React.FC<AbsenceRequestManagerProps> = ({
    requests,
    onUpdateRequest,
    currentUser,
    users,
    subjects,
    generatedTimetable,
}) => {

    const pendingRequests = useMemo(() => {
        let visibleRequests = requests.filter(r => r.status === 'pending');

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
            <h3 className="text-xl font-semibold mb-4">Pending Absence Requests ({pendingRequests.length})</h3>
            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-lg overflow-hidden">
                {pendingRequests.length > 0 ? (
                    <ul role="list" className="divide-y divide-slate-200 dark:divide-slate-700">
                        {pendingRequests.map(req => {
                            const user = users.find(l => l.id === req.lecturerId);
                            const subject = subjects.find(s => s.id === req.subjectId);
                            const timetableEntry = generatedTimetable.find(e => e.id === req.timetableEntryId);

                            if (!user || !subject || !timetableEntry) return null;

                            return (
                                <li key={req.id} className="p-4 sm:p-6">
                                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex-1">
                                            <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                                                {subject.name} <span className="font-normal text-slate-500 dark:text-slate-400">({subject.code})</span>
                                            </p>
                                            <p className="text-sm font-medium text-[var(--color-primary)]">
                                                Requested by: {user.name}
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                                For lesson on: <span className="font-semibold">{timetableEntry.day}, {timetableEntry.startTime} - {timetableEntry.endTime}</span>
                                            </p>
                                            
                                            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 italic">
                                                <span className="font-semibold not-italic text-slate-700 dark:text-slate-200">Reason:</span> "{req.reason}"
                                            </p>

                                            <div className="mt-3">
                                                 <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                                    <ClockIcon className="w-4 h-4 mr-1.5" /> Pending
                                                </span>
                                            </div>
                                        </div>
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
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                ) : (
                    <p className="p-6 text-center text-slate-500 dark:text-slate-400">
                        There are no pending absence requests for your review.
                    </p>
                )}
            </div>
        </section>
    );
};
