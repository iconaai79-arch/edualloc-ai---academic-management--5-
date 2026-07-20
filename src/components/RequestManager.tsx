
import React, { useMemo, useState } from 'react';
import type { AllocationRequest, User, Subject, RequestStatus, Priority, LessonStructure } from '../types';
import { CheckIcon } from './icons/CheckIcon';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { ClockIcon } from './icons/ClockIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';

interface RequestManagerProps {
    requests: AllocationRequest[];
    onUpdateRequestStatus: (requestId: string, newStatus: RequestStatus) => Promise<void>;
    onBulkUpdateRequestStatus: (newStatus: 'hod_approved' | 'approved', departmentId?: string) => Promise<void>;
    onOpenDirectAssign: () => void;
    getLecturerById: (id: string) => User | undefined;
    getSubjectById: (id: string) => Subject | undefined;
    currentUser: User;
    subjects: Subject[];
    onUpdateRequest: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    currentInstitution?: any;
    allocations: AllocationRequest[];
}

const RequestTypeBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
    if (status === 'deallocation_pending') {
        return <span className="px-3 py-1 bg-rose-100 text-rose-700 text-[10px] font-black uppercase rounded-lg border border-rose-200 shadow-sm animate-pulse flex items-center gap-1"><ExclamationTriangleIcon className="w-3 h-3" /> Withdrawal</span>;
    }
    if (status === 'change_request_pending') {
        return <span className="px-3 py-1 bg-orange-100 text-orange-700 text-[10px] font-black uppercase rounded-lg border border-orange-200 shadow-sm flex items-center gap-1"><ArrowsRightLeftIcon className="w-3 h-3" /> Modification</span>;
    }
    if (status === 'approved') {
        return <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black uppercase rounded-lg border border-green-200 shadow-sm flex items-center gap-1"><CheckCircleIcon className="w-3 h-3" /> Active</span>;
    }
    return <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-lg border border-blue-200 shadow-sm flex items-center gap-1"><PlusIcon className="w-3 h-3" /> New Entry</span>;
};

const StatusBadge: React.FC<{ status: RequestStatus }> = ({ status }) => {
    const styles: Record<RequestStatus, string> = {
        pending: "bg-yellow-50 text-yellow-700 border-yellow-100",
        hod_approved: "bg-sky-50 text-sky-700 border-sky-100",
        approved: "bg-green-50 text-green-700 border-green-100",
        disapproved: "bg-slate-50 text-slate-700 border-slate-100",
        deallocation_pending: "bg-rose-50 text-rose-700 border-rose-100",
        change_request_pending: "bg-orange-50 text-orange-700 border-orange-100",
    };
    const text: Record<RequestStatus, string> = {
        pending: "Pending Dept. Review",
        hod_approved: "Pending Final Registry",
        approved: "Allocated",
        disapproved: "Registry Declined",
        deallocation_pending: "Awaiting Removal",
        change_request_pending: "Awaiting Sync",
    };
    return <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${styles[status]}`}>{text[status]}</span>;
};

export const RequestManager: React.FC<RequestManagerProps> = ({
    requests,
    onUpdateRequestStatus,
    onBulkUpdateRequestStatus,
    onOpenDirectAssign,
    getLecturerById,
    getSubjectById,
    currentUser,
    subjects,
    onUpdateRequest,
    currentInstitution,
    allocations = []
}) => {
    const [statusFilter, setStatusFilter] = useState<RequestStatus | 'all' | 'action_required'>('action_required');
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';

    const calculateTotalPeriods = (structure: LessonStructure[] | undefined) => {
        if (!structure || !Array.isArray(structure)) return 0;
        return structure.reduce((sum, s) => sum + (s.periods || 0) * (s.count || 0), 0);
    };

    const getLecturerWorkload = (lecturerId: string) => {
        const lecturerAllocations = (allocations || []).filter(a => a && a.lecturerId === lecturerId && a.status === 'approved');
        return lecturerAllocations.reduce((total, alloc) => {
            const subject = (subjects || []).find(s => s && s.id === alloc.subjectId);
            return total + (subject ? calculateTotalPeriods(subject.lessonStructure) : 0);
        }, 0);
    };

    const { filteredRequests, title, canBulkApprove, bulkApproveAction, bulkApproveText } = useMemo(() => {
        let relevantRequests = (Array.isArray(requests) ? requests : []).filter(r => r);

        if (currentUser && (currentUser.role === 'hod' || currentUser.role === 'tto') && currentUser.departmentId) {
            const hodDeptId = currentUser.departmentId;
            const subjectsInHodDepartment = new Set(
                (subjects || []).filter(s => s && s.departmentId === hodDeptId).map(s => s.id)
            );
            relevantRequests = relevantRequests.filter(req => req && subjectsInHodDepartment.has(req.subjectId));
        }

        if (statusFilter === 'action_required') {
            if (['admin', 'head_teacher', 'deputy', 'dos', 'super_admin', 'managing_director', 'hoi'].includes(currentUser?.role)) {
                relevantRequests = relevantRequests.filter(req => req && ['pending', 'hod_approved', 'deallocation_pending', 'change_request_pending'].includes(req.status));
            } else if (currentUser?.role === 'hod' || currentUser?.role === 'tto') {
                relevantRequests = relevantRequests.filter(req => req && req.status === 'pending');
            }
        } else if (statusFilter !== 'all') {
            relevantRequests = relevantRequests.filter(req => req && req.status === statusFilter);
        }

        const sortedRequests = [...relevantRequests].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        let newTitle = "Registry Requests";
        switch (statusFilter) {
            case 'action_required': newTitle = 'Awaiting Authorisation'; break;
            case 'pending': newTitle = 'HOD Review Queue'; break;
            case 'hod_approved': newTitle = 'Final Registry Queue'; break;
            case 'approved': newTitle = 'Processed Registry'; break;
            case 'deallocation_pending': newTitle = 'Withdrawal Requests'; break;
            case 'change_request_pending': newTitle = 'Modification Requests'; break;
        }

        const standardPendingRequests = (Array.isArray(requests) ? requests : []).filter(r => r && (r.status === 'pending' || r.status === 'hod_approved'));
        
        // Ensure user sees the button even in 'all' view if they have permission to act on the pending items
        const isHodViewingPending = currentUser && (currentUser.role === 'hod' || currentUser.role === 'tto');
        const isAdminViewingFinal = currentUser && ['admin', 'head_teacher', 'deputy', 'dos', 'super_admin', 'managing_director', 'hoi'].includes(currentUser.role);

        const allowBulk = (isHodViewingPending || isAdminViewingFinal) && standardPendingRequests.length > 0;

        return {
            filteredRequests: sortedRequests,
            title: newTitle,
            canBulkApprove: allowBulk,
            bulkApproveAction: async () => {
                const ids = standardPendingRequests.map(r => r.id);
                setProcessingIds(prev => new Set([...Array.from(prev), ...ids]));
                await onBulkUpdateRequestStatus('approved', isHodViewingPending ? currentUser.departmentId : undefined);
                setProcessingIds(prev => {
                    const next = new Set(prev);
                    ids.forEach(id => next.delete(id));
                    return next;
                });
            },
            bulkApproveText: `Batch Authorise (${standardPendingRequests.length})`,
        };

    }, [requests, currentUser, subjects, statusFilter, onBulkUpdateRequestStatus]);

    const handleAction = async (requestId: string, action: 'approve' | 'reject', request: AllocationRequest) => {
        setProcessingIds(prev => new Set(prev).add(requestId));
        try {
            if (request.status === 'deallocation_pending') {
                await onUpdateRequestStatus(requestId, action === 'approve' ? 'disapproved' : 'approved');
            } else if (request.status === 'change_request_pending') {
                if (action === 'approve') {
                    await onUpdateRequestStatus(requestId, 'approved');
                } else {
                    await onUpdateRequest(requestId, { status: 'approved', proposedChanges: null } as any);
                }
            } else {
                let nextStatus: RequestStatus = action === 'approve' ? 'approved' : 'disapproved';
                if (action === 'approve' && currentUser && (currentUser.role === 'hod' || currentUser.role === 'tto') && !['admin', 'head_teacher', 'deputy', 'super_admin'].includes(currentUser.role)) {
                    nextStatus = 'hod_approved';
                }
                await onUpdateRequestStatus(requestId, nextStatus);
            }
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(requestId);
                return next;
            });
        }
    };

    return (
        <div className="space-y-6 animate-fade-in text-slate-900 dark:text-slate-100">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">{title}</h3>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">{filteredRequests.length} MATCHING ENTRIES</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <select
                        value={statusFilter}
                        onChange={e => setStatusFilter(e.target.value as any)}
                        className="form-select text-[10px] font-black uppercase tracking-widest h-11"
                    >
                        <option value="action_required">Awaiting Processing</option>
                        <option value="all">Full Registry</option>
                        <option value="pending">HOD Step</option>
                        <option value="hod_approved">Final Step</option>
                        <option value="approved">Allocated</option>
                        <option value="deallocation_pending">Withdrawals</option>
                        <option value="change_request_pending">Modifications</option>
                    </select>

                    {canBulkApprove && (
                        <button
                            onClick={bulkApproveAction}
                            disabled={processingIds.size > 0}
                            className="btn-primary h-11 flex items-center gap-2 bg-emerald-600 shadow-emerald-100 disabled:opacity-50"
                        >
                            <SparklesIcon className="w-5 h-5" />
                            {bulkApproveText}
                        </button>
                    )}

                    <button onClick={onOpenDirectAssign} className="btn-secondary h-11 flex items-center gap-2 shadow-sm border-slate-200 bg-white dark:bg-slate-700">
                        <PlusIcon className="w-5 h-5" /> Direct Assign
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {filteredRequests.map(req => {
                    const lecturer = getLecturerById(req.lecturerId);
                    const subject = getSubjectById(req.subjectId);
                    if (!lecturer || !subject) return null;

                    const currentLoad = getLecturerWorkload(req.lecturerId);
                    const isProcessing = processingIds.has(req.id);
                    const canAct = currentUser && (((currentUser.role === 'hod' || currentUser.role === 'tto') && req.status === 'pending') ||
                        (['admin', 'head_teacher', 'deputy', 'dos', 'super_admin'].includes(currentUser.role) && (req.status === 'hod_approved' || req.status === 'deallocation_pending' || req.status === 'pending' || req.status === 'change_request_pending')));

                    return (
                        <div key={req.id} className={`bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 transition-all hover:shadow-xl ${req.status === 'deallocation_pending' ? 'border-rose-100 dark:border-rose-900/30' :
                                req.status === 'change_request_pending' ? 'border-orange-100 dark:border-orange-900/30' :
                                    'border-slate-50 dark:border-slate-700'
                            } ${isProcessing ? 'opacity-70 grayscale' : ''}`}>
                            <div className="p-8">
                                <div className="flex flex-col xl:flex-row justify-between gap-8">
                                    <div className="flex-1 space-y-5">
                                        <div className="flex flex-wrap items-center gap-4">
                                            <RequestTypeBadge status={req.status} />
                                            <h5 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-none">{subject.name}</h5>
                                            <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg border border-indigo-100 dark:border-indigo-800 uppercase">{subject.code}</span>
                                        </div>

                                        <div className="flex flex-wrap items-center gap-6">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 flex items-center justify-center text-xs font-black text-indigo-600 border border-indigo-100">
                                                    {lecturer.name.charAt(0)}
                                                </div>
                                                <div>
                                                    <span className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-tight">{lecturer.name}</span>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{lecturer.role.replace('_', ' ')}</p>
                                                        <span className="text-slate-300">•</span>
                                                        <span className={`text-[10px] font-black uppercase ${currentLoad > 12 ? 'text-amber-600' : 'text-slate-400'}`}>Load: {currentLoad} PDS/WK</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="h-8 w-px bg-slate-100 dark:bg-slate-700"></div>
                                            <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Weight</span>
                                                <span className={`text-[10px] font-black uppercase ${req.priority === 'High' ? 'text-red-600' : 'text-indigo-600'}`}>
                                                    {req.status === 'change_request_pending' && req.proposedChanges?.priority ? (
                                                        <span className="flex items-center gap-1.5">
                                                            <span className="line-through opacity-40">{req.priority}</span>
                                                            <ArrowsRightLeftIcon className="w-3 h-3 text-orange-500" />
                                                            <span className="text-orange-600 font-black">{req.proposedChanges.priority}</span>
                                                        </span>
                                                    ) : req.priority}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{new Date(req.timestamp).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</span>
                                        </div>

                                        {req.status === 'change_request_pending' && req.proposedChanges?.justification && (
                                            <div className="p-5 bg-orange-50 dark:bg-orange-900/20 rounded-3xl border border-orange-100 dark:border-orange-800 space-y-2">
                                                <p className="text-[9px] font-black uppercase text-orange-600 tracking-widest flex items-center gap-1">
                                                    <InformationCircleIcon className="w-3 h-3" /> Proposed Amendment Reason
                                                </p>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">
                                                    "{req.proposedChanges.justification}"
                                                </p>
                                            </div>
                                        )}

                                        {req.status !== 'change_request_pending' && req.justification && (
                                            <div className="p-5 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-slate-100 dark:border-slate-800 text-sm text-slate-600 dark:text-slate-400 italic font-medium leading-relaxed">
                                                "{req.justification}"
                                            </div>
                                        )}

                                        {req.status === 'deallocation_pending' && (
                                            <div className="p-5 bg-rose-50 dark:bg-rose-900/20 rounded-3xl border border-rose-100 dark:border-rose-800 space-y-2">
                                                <p className="text-[9px] font-black uppercase text-rose-600 tracking-widest flex items-center gap-1">
                                                    <ExclamationTriangleIcon className="w-3 h-3" /> Removal Request
                                                </p>
                                                <p className="text-sm text-rose-700 dark:text-rose-300 font-medium">Lecturer has requested to be removed from this unit.</p>
                                            </div>
                                        )}
                                    </div>

                                    {canAct && (
                                        <div className="xl:w-64 flex flex-col gap-3 justify-center">
                                            <button
                                                onClick={() => handleAction(req.id, 'approve', req)}
                                                disabled={isProcessing}
                                                className={`w-full h-14 flex items-center justify-center gap-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 ${req.status === 'deallocation_pending' ? 'bg-rose-600 shadow-rose-200' :
                                                        req.status === 'change_request_pending' ? 'bg-orange-600 shadow-orange-100' :
                                                            'bg-indigo-600 shadow-indigo-100'
                                                    }`}
                                            >
                                                {isProcessing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <CheckIcon className="w-5 h-5" />}
                                                {req.status === 'deallocation_pending' ? 'Confirm Removal' : (req.status === 'change_request_pending' ? 'Accept Changes' : 'Authorise')}
                                            </button>
                                            <button
                                                onClick={() => handleAction(req.id, 'reject', req)}
                                                disabled={isProcessing}
                                                className="w-full h-14 flex items-center justify-center gap-3 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-300 hover:bg-slate-50 transition-all disabled:opacity-50"
                                            >
                                                <XIcon className="w-5 h-5" />
                                                {req.status === 'change_request_pending' ? 'Reject Change' : (req.status === 'deallocation_pending' ? 'Deny Removal' : 'Decline')}
                                            </button>
                                        </div>
                                    )}

                                    {!canAct && (
                                        <div className="flex items-center justify-center px-8">
                                            <StatusBadge status={req.status} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
                {filteredRequests.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-800 rounded-[4rem] border-4 border-dashed border-slate-50 dark:border-slate-800 text-center opacity-40">
                        <CheckCircleIcon className="w-20 h-20 text-slate-200 dark:text-slate-700 mb-6" />
                        <h4 className="text-2xl font-black text-slate-300 uppercase tracking-[0.3em]">Registry Synced</h4>
                        <p className="text-sm font-bold uppercase tracking-widest mt-2">All applications have been processed for this cycle</p>
                    </div>
                )}
            </div>
        </div>
    );
};

