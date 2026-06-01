
import React, { useMemo, useState } from 'react';
import type { FeedbackSubmission, User } from '../types';
import { EyeOffIcon } from './icons/EyeOffIcon';
import { UserIcon } from './icons/UserIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { EyeIcon } from './icons/EyeIcon';

import { ClockIcon } from './icons/ClockIcon';

interface FeedbackManagerProps {
    submissions: FeedbackSubmission[];
    users: User[];
    onUpdateStatus: (submissionId: string, status: FeedbackSubmission['status']) => void;
}

const StatusBadge: React.FC<{ status: FeedbackSubmission['status'] }> = ({ status }) => {
    switch (status) {
        case 'new':
            return <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300"><ClockIcon className="w-3 h-3"/> New</span>;
        case 'viewed':
            return <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300"><EyeIcon className="w-3 h-3"/> Viewed</span>;
        case 'resolved':
            return <span className="inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"><CheckCircleIcon className="w-3 h-3"/> Resolved</span>;
        default:
            return null;
    }
};

export const FeedbackManager: React.FC<FeedbackManagerProps> = ({ submissions, users, onUpdateStatus }) => {
    const userMap = useMemo(() => new Map(users.map(u => [u.id, u.name])), [users]);
    const [statusFilter, setStatusFilter] = useState<'all' | FeedbackSubmission['status']>('all');

    const filteredSubmissions = useMemo(() => {
        if (statusFilter === 'all') {
            return submissions;
        }
        return submissions.filter(s => s.status === statusFilter);
    }, [submissions, statusFilter]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-xl font-semibold">Student Feedback Submissions</h3>
                <div>
                    <label htmlFor="status-filter" className="sr-only">Filter by status</label>
                    <select
                        id="status-filter"
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="form-select"
                    >
                        <option value="all">All Statuses</option>
                        <option value="new">New</option>
                        <option value="viewed">Viewed</option>
                        <option value="resolved">Resolved</option>
                    </select>
                </div>
            </div>

            {filteredSubmissions.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-slate-500 dark:text-slate-400">No feedback submissions match the current filter.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredSubmissions.map(submission => (
                        <div key={submission.id} className="bg-white dark:bg-slate-800 rounded-lg shadow-sm overflow-hidden">
                            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div>
                                    <h4 className="font-bold text-lg text-slate-900 dark:text-white">{submission.title}</h4>
                                    <div className="mt-1 flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                                        {submission.isAnonymous ? (
                                            <span className="inline-flex items-center gap-2">
                                                <EyeOffIcon className="w-4 h-4" /> Anonymous
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-2">
                                                <UserIcon className="w-4 h-4" /> {userMap.get(submission.studentId) || 'Unknown Student'}
                                            </span>
                                        )}
                                        <span>&bull;</span>
                                        <span>{new Date(submission.timestamp)?.toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <StatusBadge status={submission.status} />
                                    <select
                                        value={submission.status}
                                        onChange={e => onUpdateStatus(submission.id, e.target.value as FeedbackSubmission['status'])}
                                        className="form-select-sm"
                                        aria-label="Change status"
                                    >
                                        <option value="new">New</option>
                                        <option value="viewed">Viewed</option>
                                        <option value="resolved">Resolved</option>
                                    </select>
                                </div>
                            </div>
                            <div className="p-4">
                                <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{submission.content}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <style>{`
                .form-select { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 2.5rem 0.5rem 0.75rem; background-color: white; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; }
                .dark .form-select { border-color: #4b5563; background-color: #374151; color: white; }
                .form-select-sm { padding: 0.25rem 2rem 0.25rem 0.5rem; font-size: 0.75rem; line-height: 1rem; }
            `}</style>
        </div>
    );
};

