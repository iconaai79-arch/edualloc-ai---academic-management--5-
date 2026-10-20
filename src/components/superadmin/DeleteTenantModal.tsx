import React, { useState, useEffect } from 'react';
import { 
    AlertTriangle, Download, Trash2, X, Database, CheckCircle2, 
    Loader2, ShieldAlert, Building2, Users, GitBranch, Layers
} from 'lucide-react';
import type { Institution, User, Branch } from '../../types';
import { collectAndDownloadTenantBackup } from '../../utils/tenantSqlBackup';
import { useToast } from '../../services/ToastContext';

interface DeleteTenantModalProps {
    isOpen: boolean;
    institution: Institution | null;
    branches?: Branch[];
    users?: User[];
    onClose: () => void;
    onConfirmDelete: (institutionId: string, backupDownloaded: boolean) => Promise<void>;
}

export const DeleteTenantModal: React.FC<DeleteTenantModalProps> = ({
    isOpen,
    institution,
    branches = [],
    users = [],
    onClose,
    onConfirmDelete
}) => {
    const { success, error: toastError, info } = useToast();

    const [confirmText, setConfirmText] = useState('');
    const [autoDownloadBackup, setAutoDownloadBackup] = useState(true);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [downloadedFileName, setDownloadedFileName] = useState<string | null>(null);
    const [downloadedCount, setDownloadedCount] = useState<number | null>(null);

    // Reset state when opening a new institution
    useEffect(() => {
        if (isOpen && institution) {
            setConfirmText('');
            setAutoDownloadBackup(true);
            setIsDownloading(false);
            setIsDeleting(false);
            setDownloadedFileName(null);
            setDownloadedCount(null);
        }
    }, [isOpen, institution?.id]);

    if (!isOpen || !institution) return null;

    const targetConfirmation = (institution.institutionCode || institution.name || '').trim();
    const isConfirmationMatched = confirmText.trim().toLowerCase() === targetConfirmation.toLowerCase();

    // Stats
    const tenantBranches = branches.filter(b => b && (b.institution_id === institution.id || (b as any).institutionId === institution.id));
    const tenantUsers = users.filter(u => u && (u.institutionId === institution.id || (u as any).institution_id === institution.id));

    // Handle manual on-demand SQL backup download
    const handleDownloadBackup = async () => {
        if (!institution || isDownloading) return;
        setIsDownloading(true);
        try {
            info(`Generating SQL backup snapshot for "${institution.name}"...`);
            const res = await collectAndDownloadTenantBackup(institution, users, branches);
            setDownloadedFileName(res.fileName);
            setDownloadedCount(res.totalRecords);
            success(`SQL backup downloaded: ${res.fileName} (${res.totalRecords} records)`);
        } catch (err: any) {
            console.error('Failed to generate SQL backup:', err);
            toastError(err?.message || 'Failed to download SQL backup script.');
        } finally {
            setIsDownloading(false);
        }
    };

    // Handle final delete trigger
    const handleDelete = async () => {
        if (!institution || !isConfirmationMatched || isDeleting) return;

        setIsDeleting(true);
        let backupSucceeded = Boolean(downloadedFileName);

        try {
            // If user checked auto-download and hasn't downloaded yet, trigger download first
            if (autoDownloadBackup && !downloadedFileName) {
                try {
                    info(`Generating pre-deletion SQL backup for "${institution.name}"...`);
                    const res = await collectAndDownloadTenantBackup(institution, users, branches);
                    setDownloadedFileName(res.fileName);
                    setDownloadedCount(res.totalRecords);
                    backupSucceeded = true;
                    success(`Pre-deletion backup saved: ${res.fileName}`);
                } catch (bErr: any) {
                    console.error('Pre-delete backup failed:', bErr);
                    toastError('Pre-deletion SQL backup failed. Aborting deletion to prevent data loss.');
                    setIsDeleting(false);
                    return;
                }
            }

            await onConfirmDelete(institution.id, backupSucceeded);
            success(`Tenant "${institution.name}" has been permanently removed.`);
            onClose();
        } catch (err: any) {
            console.error('Failed to delete tenant:', err);
            toastError(err?.message || 'Failed to delete tenant from database.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-red-200 dark:border-red-900/50 space-y-6 max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 rounded-2xl">
                            <ShieldAlert className="w-7 h-7" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
                                Danger Zone • Super Admin Action
                            </span>
                            <h2 className="text-xl font-black text-slate-900 dark:text-white">
                                Remove Tenant & Purge Database
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isDeleting || isDownloading}
                        className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Target Institution Card */}
                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            <span className="font-black text-base text-slate-900 dark:text-white">
                                {institution.name}
                            </span>
                        </div>
                        <span className="px-2.5 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold rounded-lg">
                            {institution.institutionCode || 'NO-CODE'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Layers className="w-3.5 h-3.5 text-slate-400" />
                            <span>Type: <strong className="text-slate-800 dark:text-slate-200">{institution.institutionType || 'General'}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <GitBranch className="w-3.5 h-3.5 text-slate-400" />
                            <span>Branches: <strong className="text-slate-800 dark:text-slate-200">{tenantBranches.length}</strong></span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            <span>Users: <strong className="text-slate-800 dark:text-slate-200">{tenantUsers.length}</strong></span>
                        </div>
                    </div>
                </div>

                {/* SQL Backup Section */}
                <div className="p-5 bg-indigo-50/70 dark:bg-indigo-950/30 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-indigo-600 text-white rounded-xl mt-0.5">
                                <Database className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-indigo-950 dark:text-indigo-200">
                                    Account SQL Database Backup
                                </h4>
                                <p className="text-xs text-indigo-700 dark:text-indigo-300/80 mt-0.5">
                                    Generates a complete PostgreSQL SQL script with table data and schemas to archive or restore this account later.
                                </p>
                            </div>
                        </div>
                    </div>

                    {downloadedFileName ? (
                        <div className="flex items-center gap-2 p-2.5 bg-emerald-100/70 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-200 font-medium">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span className="truncate">
                                Downloaded: <strong>{downloadedFileName}</strong> {downloadedCount ? `(${downloadedCount} records)` : ''}
                            </span>
                        </div>
                    ) : null}

                    <div className="flex items-center justify-between flex-wrap gap-3 pt-1">
                        <button
                            type="button"
                            onClick={handleDownloadBackup}
                            disabled={isDownloading || isDeleting}
                            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
                        >
                            {isDownloading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    <span>Generating SQL Snapshot...</span>
                                </>
                            ) : (
                                <>
                                    <Download className="w-3.5 h-3.5" />
                                    <span>{downloadedFileName ? 'Download Again' : 'Download SQL Backup Now'}</span>
                                </>
                            )}
                        </button>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={autoDownloadBackup}
                                onChange={(e) => setAutoDownloadBackup(e.target.checked)}
                                className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 border-slate-300 dark:border-slate-600"
                            />
                            <span>Auto-download backup before delete</span>
                        </label>
                    </div>
                </div>

                {/* Irreversible Warning */}
                <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-2xl text-xs text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <div>
                        <strong className="block font-black mb-0.5">Warning: This action is permanent!</strong>
                        Deleting this tenant purges all database tables referencing this institution (branches, users, academic records, and transactional history).
                    </div>
                </div>

                {/* Confirmation Input Field */}
                <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                        To confirm deletion, type <strong className="text-red-600 dark:text-red-400 font-mono select-all bg-red-50 dark:bg-red-950/50 px-1.5 py-0.5 rounded border border-red-200 dark:border-red-900/60">{targetConfirmation}</strong> below:
                    </label>
                    <input
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder={`Type "${targetConfirmation}"`}
                        disabled={isDeleting}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono transition-all"
                    />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isDeleting || isDownloading}
                        className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={!isConfirmationMatched || isDeleting || isDownloading}
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-600/30 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Purging Tenant...</span>
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-4 h-4" />
                                <span>
                                    {autoDownloadBackup && !downloadedFileName ? 'Download SQL Backup & Delete' : 'Purge Tenant Account'}
                                </span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
