import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
    AlertTriangle, Trash2, CheckCircle2, X, RefreshCw, Check, 
    Copy, Clock, ShieldCheck, ChevronRight, CheckCheck, Square, 
    AlertCircle, Sparkles, User, Layers
} from 'lucide-react';
import type { RemedialSession } from '../types';
import { 
    DuplicateCluster, 
    detectDuplicateRemedialSessions 
} from '../utils/remedialDuplicateUtils';
import { apiService } from '../services/apiService';

interface DuplicateRemedialSessionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    sessions: RemedialSession[];
    institutionId?: string;
    onSessionsRemoved: (deletedIds: string[]) => void;
    onLogAction?: (msg: string) => void;
}

export const DuplicateRemedialSessionsModal: React.FC<DuplicateRemedialSessionsModalProps> = ({
    isOpen,
    onClose,
    sessions,
    institutionId,
    onSessionsRemoved,
    onLogAction
}) => {
    const detectionResult = useMemo(() => {
        return detectDuplicateRemedialSessions(sessions);
    }, [sessions]);

    const { clusters, totalDuplicatesCount } = detectionResult;

    // Track which duplicate session IDs are selected for removal
    const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
        return new Set(detectionResult.duplicateSessionIds);
    });

    // Update selection when clusters change
    React.useEffect(() => {
        setSelectedIds(new Set(detectionResult.duplicateSessionIds));
    }, [detectionResult.duplicateSessionIds]);

    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === detectionResult.duplicateSessionIds.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(detectionResult.duplicateSessionIds));
        }
    };

    const handleRemoveSelected = async () => {
        const idsArray = Array.from(selectedIds);
        if (idsArray.length === 0) {
            alert('Please select at least one duplicate session to remove.');
            return;
        }

        const confirmMsg = `Permanently remove ${idsArray.length} duplicate remedial session log(s)?\n\nThis will purge redundant entries from the database, preventing double payouts and duplicate hours on reports. The primary kept sessions will remain safely intact.`;
        if (!window.confirm(confirmMsg)) return;

        setIsDeleting(true);
        try {
            await apiService.deleteRemedialSession(idsArray, institutionId);
            onLogAction?.(`Removed ${idsArray.length} duplicate remedial session logs`);
            onSessionsRemoved(idsArray);
            setDeleteSuccessMsg(`Successfully removed ${idsArray.length} duplicate session log(s)!`);
            setTimeout(() => {
                setDeleteSuccessMsg(null);
                onClose();
            }, 1200);
        } catch (err: any) {
            alert(err.message || 'Failed to remove duplicate sessions');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSingleDelete = async (sessionId: string, sessionName: string) => {
        if (!window.confirm(`Permanently delete duplicate session log for ${sessionName}?`)) return;
        setIsDeleting(true);
        try {
            await apiService.deleteRemedialSession(sessionId, institutionId);
            onLogAction?.(`Removed duplicate remedial session ${sessionId}`);
            onSessionsRemoved([sessionId]);
            setSelectedIds(prev => {
                const next = new Set(prev);
                next.delete(sessionId);
                return next;
            });
        } catch (err: any) {
            alert(err.message || 'Failed to delete duplicate session');
        } finally {
            setIsDeleting(false);
        }
    };

    // Calculate total hours of selected duplicates
    const totalSelectedHours = detectionResult.duplicateSessions
        .filter(s => selectedIds.has(s.id))
        .reduce((acc, s) => {
            const h = Number(s.hours || (s as any).durationHours || (s as any).duration_hours || 1) || 1;
            return acc + h;
        }, 0);

    return createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] my-auto">
                {/* Header */}
                <div className="p-6 sm:p-8 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-indigo-500/10 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-indigo-950/30 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <div className="p-3.5 bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-2xl shadow-lg shadow-amber-500/20 shrink-0">
                            <Layers className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white">
                                    Check &amp; Remove Duplicate Remedial Hours
                                </h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                                    {totalDuplicatesCount} Detected
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
                                Scan for double-logged remedial hours, ghost in-progress sessions, and duplicate entries.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="p-2.5 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Success Banner */}
                {deleteSuccessMsg && (
                    <div className="mx-6 mt-4 p-4 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-fade-in">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{deleteSuccessMsg}</span>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 sm:p-8 overflow-y-auto space-y-6 custom-scrollbar flex-1">
                    {clusters.length === 0 ? (
                        <div className="py-16 text-center space-y-4">
                            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-3xl mx-auto flex items-center justify-center shadow-inner">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                    No Duplicate Sessions Found!
                                </h4>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                                    All {sessions.length} logged remedial session records have unique teachers, subjects, classes, and time slots. Your remedial hours log is completely clean.
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all cursor-pointer"
                            >
                                Close &amp; Return
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Summary Metrics */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duplicate Clusters</p>
                                    <p className="text-xl font-black text-slate-900 dark:text-white">{clusters.length}</p>
                                    <p className="text-[10px] text-slate-500">Across {new Set(clusters.map(c => c.teacherName)).size} teacher(s)</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 dark:text-amber-400">Redundant Logs to Purge</p>
                                    <p className="text-xl font-black text-amber-900 dark:text-amber-200">{totalDuplicatesCount}</p>
                                    <p className="text-[10px] text-amber-700 dark:text-amber-400">{selectedIds.size} selected for removal</p>
                                </div>
                                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 space-y-1">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">Redundant Hours Claimed</p>
                                    <p className="text-xl font-black text-indigo-900 dark:text-indigo-200">~{totalSelectedHours.toFixed(1)} hrs</p>
                                    <p className="text-[10px] text-indigo-700 dark:text-indigo-400">Will be cleaned from liability</p>
                                </div>
                            </div>

                            {/* Batch Selection Bar */}
                            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
                                <button
                                    onClick={toggleSelectAll}
                                    className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-indigo-600 transition-colors cursor-pointer px-2 py-1"
                                >
                                    {selectedIds.size === detectionResult.duplicateSessionIds.length ? (
                                        <CheckCheck className="w-4 h-4 text-indigo-600" />
                                    ) : (
                                        <Square className="w-4 h-4 text-slate-400" />
                                    )}
                                    <span>
                                        {selectedIds.size === detectionResult.duplicateSessionIds.length 
                                            ? 'Deselect All Duplicates' 
                                            : `Select All Duplicates (${detectionResult.duplicateSessionIds.length})`}
                                    </span>
                                </button>
                                <span className="text-[11px] font-medium text-slate-500">
                                    {selectedIds.size} of {totalDuplicatesCount} marked for removal
                                </span>
                            </div>

                            {/* Duplicate Clusters List */}
                            <div className="space-y-4">
                                {clusters.map((cluster, clusterIdx) => {
                                    const canonical = cluster.canonicalSession;
                                    const cDate = cluster.dateStr ? new Date(cluster.dateStr).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown Date';

                                    return (
                                        <div 
                                            key={cluster.clusterKey + '_' + clusterIdx}
                                            className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-4 shadow-sm"
                                        >
                                            {/* Cluster Header */}
                                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-700/80 pb-3">
                                                <div>
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <h5 className="text-sm font-black uppercase text-slate-900 dark:text-white">
                                                            {cluster.teacherName}
                                                        </h5>
                                                        <span className="text-slate-400">•</span>
                                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                                            {cluster.subjectName}
                                                        </span>
                                                        <span className="text-slate-400">•</span>
                                                        <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                                                            {cluster.className} {cluster.stream && cluster.stream !== 'All Streams' ? `(${cluster.stream})` : ''}
                                                        </span>
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                        📅 {cDate} • {cluster.reason}
                                                    </p>
                                                </div>
                                                <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                                                    {cluster.duplicateSessions.length} Redundant Duplicate{cluster.duplicateSessions.length > 1 ? 's' : ''}
                                                </span>
                                            </div>

                                            {/* Sessions comparison grid */}
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {/* 1. Canonical session (KEPT) */}
                                                <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/20 border-2 border-emerald-300 dark:border-emerald-800/80 space-y-2 relative">
                                                    <div className="flex items-center justify-between gap-2">
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white flex items-center gap-1 shadow-xs">
                                                            <Check className="w-2.5 h-2.5" /> Keep (Primary Record)
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                                            canonical.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' :
                                                            canonical.status === 'Approved' ? 'bg-indigo-100 text-indigo-700' :
                                                            canonical.status === 'Prefect Confirmed' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-slate-200 text-slate-700'
                                                        }`}>
                                                            {canonical.status}
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] space-y-1 text-slate-700 dark:text-slate-300 font-medium pt-1">
                                                        <p className="flex items-center justify-between">
                                                            <span className="text-slate-400">Duration:</span>
                                                            <strong className="text-slate-900 dark:text-white font-mono">
                                                                {canonical.hours || 1} hrs {canonical.durationMinutes ? `(${canonical.durationMinutes}m)` : ''}
                                                            </strong>
                                                        </p>
                                                        <p className="flex items-center justify-between">
                                                            <span className="text-slate-400">Time:</span>
                                                            <span className="font-mono text-[10px]">
                                                                {canonical.startTime ? new Date(canonical.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                {canonical.endTime ? ` – ${new Date(canonical.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                                                            </span>
                                                        </p>
                                                        <p className="flex items-center justify-between">
                                                            <span className="text-slate-400">Validation:</span>
                                                            <span className="text-[10px]">
                                                                {canonical.prefectName ? `Prefect: ${canonical.prefectName}` : 'Logged'}
                                                            </span>
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* 2. Redundant Duplicate sessions (TO REMOVE) */}
                                                <div className="space-y-2">
                                                    {cluster.duplicateSessions.map((dup) => {
                                                        const isSelected = selectedIds.has(dup.id);
                                                        return (
                                                            <div 
                                                                key={dup.id}
                                                                className={`p-3.5 rounded-2xl border-2 transition-all space-y-2 ${
                                                                    isSelected
                                                                        ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-400 dark:border-rose-800'
                                                                        : 'bg-slate-100/70 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700 opacity-60'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between gap-2">
                                                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={isSelected}
                                                                            onChange={() => toggleSelect(dup.id)}
                                                                            className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 cursor-pointer"
                                                                        />
                                                                        <span className="text-[9px] font-black uppercase tracking-wider text-rose-700 dark:text-rose-400">
                                                                            Duplicate Log #{dup.id.slice(-6)}
                                                                        </span>
                                                                    </label>
                                                                    <div className="flex items-center gap-1.5">
                                                                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${
                                                                            dup.status === 'In Progress' ? 'bg-amber-100 text-amber-800' :
                                                                            dup.status?.toLowerCase().includes('reject') ? 'bg-rose-100 text-rose-700' :
                                                                            'bg-slate-200 text-slate-700'
                                                                        }`}>
                                                                            {dup.status}
                                                                        </span>
                                                                        <button
                                                                            onClick={() => handleSingleDelete(dup.id, `${cluster.subjectName} (${cluster.className})`)}
                                                                            disabled={isDeleting}
                                                                            className="p-1 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors cursor-pointer"
                                                                            title="Remove this duplicate immediately"
                                                                        >
                                                                            <Trash2 className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    </div>
                                                                </div>

                                                                <div className="text-[10px] space-y-0.5 text-slate-600 dark:text-slate-400 font-medium pl-6">
                                                                    <p className="flex justify-between">
                                                                        <span>Duration: {dup.hours || 1} hrs</span>
                                                                        <span>
                                                                            {dup.startTime ? new Date(dup.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                                                                        </span>
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="p-6 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium text-center sm:text-left">
                        {selectedIds.size > 0 
                            ? `Ready to purge ${selectedIds.size} duplicate log(s). This will restore clean hours balance.`
                            : 'No duplicates selected.'}
                    </p>
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <button
                            onClick={onClose}
                            disabled={isDeleting}
                            className="flex-1 sm:flex-none px-5 py-2.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                            Cancel
                        </button>
                        {clusters.length > 0 && (
                            <button
                                onClick={handleRemoveSelected}
                                disabled={isDeleting || selectedIds.size === 0}
                                className="flex-1 sm:flex-none px-6 py-2.5 bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                            >
                                {isDeleting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Purging Duplicates…</span>
                                    </>
                                ) : (
                                    <>
                                        <Trash2 className="w-4 h-4" />
                                        <span>Remove Selected Duplicates ({selectedIds.size})</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
