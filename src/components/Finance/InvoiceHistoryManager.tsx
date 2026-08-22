import React, { useState, useMemo } from 'react';
import type { Invoice, User, Institution } from '../../types';
import { apiService } from '../../services/apiService';
import { SearchIcon } from '../icons/SearchIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { XIcon } from '../icons/XIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { PencilIcon } from '../icons/PencilIcon';
import * as pdfService from '../../services/pdfService';

export interface InvoiceBatch {
    id: string;
    description: string;
    totalValue: number;
    noOfRecords: number;
    addedOn: string;
    addedBy: string;
    invoiceIds: string[];
    status: 'active' | 'reversed';
    createdAt?: string;
    reversedAt?: string;
    reversedBy?: string;
}

interface InvoiceHistoryManagerProps {
    invoices: Invoice[];
    students: User[];
    institution: Institution;
    currentUserName?: string;
    onRefreshData?: () => Promise<void>;
    onOpenWizard?: () => void;
    onOpenExcelImporter?: () => void;
}

const parseMoney = (amt: any): number => {
    if (amt === null || amt === undefined) return 0;
    if (typeof amt === 'number') return amt;
    const clean = String(amt).replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
};

const formatDateDisplay = (dateStr?: string): string => {
    if (!dateStr) return 'N/A';
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    } catch {
        return dateStr;
    }
};

export const InvoiceHistoryManager: React.FC<InvoiceHistoryManagerProps> = ({
    invoices,
    students,
    institution,
    currentUserName = 'Finance Officer',
    onRefreshData,
    onOpenWizard,
    onOpenExcelImporter
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'reversed'>('all');
    const [selectedBatchIds, setSelectedBatchIds] = useState<Set<string>>(new Set());

    // Undo / Rollback Modal state
    const [batchToUndo, setBatchToUndo] = useState<InvoiceBatch | null>(null);
    const [isUndoing, setIsUndoing] = useState(false);
    const [undoSuccessMsg, setUndoSuccessMsg] = useState<string | null>(null);

    // Batch Drilldown View Modal
    const [viewingBatch, setViewingBatch] = useState<InvoiceBatch | null>(null);

    // Edit Added Date Modal state (Batch level)
    const [batchToEditDate, setBatchToEditDate] = useState<InvoiceBatch | null>(null);
    const [newBatchDate, setNewBatchDate] = useState('');
    const [isSavingBatchDate, setIsSavingBatchDate] = useState(false);

    // Edit Added Date Modal state (Single invoice level)
    const [invoiceToEditDate, setInvoiceToEditDate] = useState<Invoice | null>(null);
    const [newInvoiceDate, setNewInvoiceDate] = useState('');
    const [isSavingInvoiceDate, setIsSavingInvoiceDate] = useState(false);

    // Build student lookup
    const studentMap = useMemo(() => {
        const map = new Map<string, User>();
        (students || []).forEach(s => {
            if (s && s.id) map.set(s.id, s);
        });
        return map;
    }, [students]);

    // Local manually persisted batches
    const [persistedBatches, setPersistedBatches] = useState<InvoiceBatch[]>(() => {
        try {
            const instId = institution?.id;
            if (instId) {
                const stored = localStorage.getItem(`eduai_invoice_batches_${instId}`);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    if (Array.isArray(parsed)) return parsed;
                }
            }
        } catch (e) {}
        return [];
    });

    // Save batch helper
    const saveBatches = (batches: InvoiceBatch[]) => {
        setPersistedBatches(batches);
        try {
            const instId = institution?.id;
            if (instId) {
                localStorage.setItem(`eduai_invoice_batches_${instId}`, JSON.stringify(batches));
                apiService.saveModuleRecord('institution_module_states', {
                    institution_id: instId,
                    module_id: 'invoice_batches_history',
                    state_data: batches,
                    updated_at: new Date().toISOString()
                }).catch(err => console.warn('[InvoiceHistoryManager] Sync warn:', err));
            }
        } catch (e) {}
    };

    // Synthesize / group invoices into batches (from persisted records + dynamic grouping)
    const allBatches = useMemo<InvoiceBatch[]>(() => {
        const invoiceMap = new Map<string, Invoice>();
        (invoices || []).forEach(inv => {
            if (inv && inv.id) invoiceMap.set(inv.id, inv);
        });

        const result: InvoiceBatch[] = [];
        const processedInvoiceIds = new Set<string>();

        // 1. Process explicitly stored batches
        persistedBatches.forEach(b => {
            // Check active invoices that still exist in database
            const existingInvIds = b.invoiceIds.filter(id => invoiceMap.has(id));
            const existingInvoices = existingInvIds.map(id => invoiceMap.get(id)!);

            existingInvIds.forEach(id => processedInvoiceIds.add(id));

            if (b.status === 'reversed') {
                result.push(b);
            } else if (existingInvIds.length > 0) {
                const totalVal = existingInvoices.reduce((sum, inv) => sum + parseMoney(inv.totalAmount || (inv as any).total_amount || 0), 0);
                result.push({
                    ...b,
                    totalValue: totalVal,
                    noOfRecords: existingInvIds.length,
                    invoiceIds: existingInvIds
                });
            }
        });

        // 2. Group remaining invoices by (description + issueDate/createdAt minute)
        const groups = new Map<string, { desc: string; addedOn: string; invoices: Invoice[] }>();

        invoices.forEach(inv => {
            if (processedInvoiceIds.has(inv.id)) return;

            let desc = 'School Fees Billing';
            if (inv.items && inv.items.length > 0 && inv.items[0]?.description) {
                desc = inv.items[0].description;
            } else if ((inv as any).description) {
                desc = (inv as any).description;
            }

            const rawDate = (inv as any).createdAt || (inv as any).created_at || inv.issueDate || new Date().toISOString();
            // group by minute bucket
            const dateBucket = rawDate.slice(0, 16);
            const groupKey = `${desc.toUpperCase()}___${dateBucket}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    desc: desc.toUpperCase(),
                    addedOn: rawDate,
                    invoices: []
                });
            }
            groups.get(groupKey)!.invoices.push(inv);
        });

        groups.forEach((grp, key) => {
            const totalVal = grp.invoices.reduce((sum, inv) => sum + parseMoney(inv.totalAmount || (inv as any).total_amount || 0), 0);
            const batchId = `batch_auto_${key.replace(/[^a-zA-Z0-9]/g, '_')}`;

            result.push({
                id: batchId,
                description: grp.desc,
                totalValue: totalVal,
                noOfRecords: grp.invoices.length,
                addedOn: grp.addedOn,
                addedBy: currentUserName || 'Finance Officer',
                invoiceIds: grp.invoices.map(i => i.id),
                status: 'active',
                createdAt: grp.addedOn
            });
        });

        // Sort descending by added date
        return result.sort((a, b) => new Date(b.addedOn || '').getTime() - new Date(a.addedOn || '').getTime());
    }, [invoices, persistedBatches, currentUserName]);

    // Filtered batches
    const filteredBatches = useMemo(() => {
        return allBatches.filter(b => {
            const matchesQuery = 
                b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.addedBy.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.id.toLowerCase().includes(searchQuery.toLowerCase());

            if (!matchesQuery) return false;

            if (statusFilter === 'active') return b.status === 'active';
            if (statusFilter === 'reversed') return b.status === 'reversed';
            return true;
        });
    }, [allBatches, searchQuery, statusFilter]);

    // Statistics
    const stats = useMemo(() => {
        const totalBatches = allBatches.length;
        const activeBatches = allBatches.filter(b => b.status === 'active');
        const reversedBatches = allBatches.filter(b => b.status === 'reversed');
        const totalValue = activeBatches.reduce((sum, b) => sum + b.totalValue, 0);
        const totalRecords = activeBatches.reduce((sum, b) => sum + b.noOfRecords, 0);

        return { totalBatches, activeCount: activeBatches.length, reversedCount: reversedBatches.length, totalValue, totalRecords };
    }, [allBatches]);

    // Select all / toggle
    const toggleSelectAll = (select: boolean) => {
        if (select) {
            setSelectedBatchIds(new Set(filteredBatches.filter(b => b.status === 'active').map(b => b.id)));
        } else {
            setSelectedBatchIds(new Set());
        }
    };

    const toggleBatchSelect = (id: string) => {
        const next = new Set(selectedBatchIds);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelectedBatchIds(next);
    };

    // Execute Undo / Rollback
    const handleConfirmUndoBatch = async () => {
        if (!batchToUndo) return;

        setIsUndoing(true);
        try {
            const idsToDelete = batchToUndo.invoiceIds.filter(Boolean);
            if (idsToDelete.length > 0) {
                await apiService.deleteModuleRecord('invoices', idsToDelete.join(','));
            }

            // Update persisted batch status
            const updatedPersisted = persistedBatches.filter(b => b.id !== batchToUndo.id);
            updatedPersisted.unshift({
                ...batchToUndo,
                status: 'reversed',
                reversedAt: new Date().toISOString(),
                reversedBy: currentUserName
            });
            saveBatches(updatedPersisted);

            if (onRefreshData) {
                await onRefreshData();
            }

            setUndoSuccessMsg(`Successfully reversed and rolled back "${batchToUndo.description}" (${idsToDelete.length} invoice transactions deleted).`);
            setBatchToUndo(null);
            setTimeout(() => setUndoSuccessMsg(null), 5000);
        } catch (err) {
            console.error('[InvoiceHistoryManager] Failed to undo batch:', err);
            alert('Failed to undo and reverse invoice batch. Please try again.');
        } finally {
            setIsUndoing(false);
        }
    };

    // Edit Batch Added Date
    const handleSaveBatchDate = async () => {
        if (!batchToEditDate || !newBatchDate) return;
        setIsSavingBatchDate(true);
        try {
            const isoDate = new Date(newBatchDate).toISOString();
            const dateStr = newBatchDate;

            // 1. Update batch in state and localStorage / institution_module_states
            const updatedBatches = persistedBatches.map(b => {
                if (b.id === batchToEditDate.id) {
                    return { ...b, addedOn: isoDate, createdAt: isoDate };
                }
                return b;
            });
            saveBatches(updatedBatches);

            // 2. Update all matching invoices in database
            const matchingInvoices = invoices.filter(inv => batchToEditDate.invoiceIds.includes(inv.id));
            if (matchingInvoices.length > 0) {
                const updatedInvoices = matchingInvoices.map(inv => ({
                    ...inv,
                    issueDate: dateStr,
                    issue_date: dateStr,
                    createdAt: isoDate,
                    created_at: isoDate,
                    updatedAt: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }));
                await apiService.saveModuleRecords('invoices', updatedInvoices);
            }

            if (onRefreshData) {
                await onRefreshData();
            }

            setUndoSuccessMsg(`Successfully updated added date for batch "${batchToEditDate.description}" to ${dateStr}.`);
            setBatchToEditDate(null);
            setTimeout(() => setUndoSuccessMsg(null), 5000);
        } catch (err) {
            console.error('[InvoiceHistoryManager] Failed to update batch date:', err);
            alert('Failed to update batch added date. Please try again.');
        } finally {
            setIsSavingBatchDate(false);
        }
    };

    // Edit Single Invoice Added Date
    const handleSaveInvoiceDate = async () => {
        if (!invoiceToEditDate || !newInvoiceDate) return;
        setIsSavingInvoiceDate(true);
        try {
            const isoDate = new Date(newInvoiceDate).toISOString();
            const dateStr = newInvoiceDate;

            await apiService.updateModuleRecord('invoices', invoiceToEditDate.id, {
                ...invoiceToEditDate,
                issueDate: dateStr,
                issue_date: dateStr,
                createdAt: isoDate,
                created_at: isoDate,
                updatedAt: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });

            if (onRefreshData) {
                await onRefreshData();
            }

            setUndoSuccessMsg(`Invoice date updated to ${dateStr}.`);
            setInvoiceToEditDate(null);
            setTimeout(() => setUndoSuccessMsg(null), 5000);
        } catch (err) {
            console.error('[InvoiceHistoryManager] Failed to update invoice date:', err);
            alert('Failed to update invoice date. Please try again.');
        } finally {
            setIsSavingInvoiceDate(false);
        }
    };

    // Print Batch Invoices
    const handlePrintBatchInvoices = (batch: InvoiceBatch) => {
        const batchInvoices = invoices.filter(inv => batch.invoiceIds.includes(inv.id));
        if (batchInvoices.length === 0) {
            alert('No active invoice records found in this batch to print.');
            return;
        }

        // Print batch summary / invoices
        window.print();
    };

    return (
        <div className="space-y-6 text-left animate-in fade-in duration-300">
            
            {/* Header notification banner if undo performed */}
            {undoSuccessMsg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in slide-in-from-top duration-200">
                    <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                        <span>{undoSuccessMsg}</span>
                    </div>
                    <button onClick={() => setUndoSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-700">
                        <XIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* KPI Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Invoice Batches</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.totalBatches}</h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">{stats.activeCount} active • {stats.reversedCount} reversed</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400 tracking-wider">Total Billed Value</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        KES {stats.totalValue.toLocaleString()}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Cumulative value across active batches</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 tracking-wider">Total Students Invoiced</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {stats.totalRecords.toLocaleString()}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Total billing records issued</p>
                </div>
                <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                    <span className="text-[10px] font-black uppercase text-rose-600 dark:text-rose-400 tracking-wider">Audit & Reversals</span>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {stats.reversedCount}
                    </h3>
                    <p className="text-[10px] text-slate-500 font-semibold mt-1">Undone runs with ledger rollback</p>
                </div>
            </div>

            {/* Main History Table Card */}
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                
                {/* Header Action Bar */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                Invoice Generation History & Audit Log
                            </h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                                Batch Ledger
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">
                            Audit history of all generated student invoice batches with instant rollback & undo capability.
                        </p>
                    </div>

                    <div className="flex items-center flex-wrap gap-2.5">
                        {selectedBatchIds.size > 0 && (
                            <button
                                type="button"
                                onClick={() => {
                                    const selectedBatches = filteredBatches.filter(b => selectedBatchIds.has(b.id));
                                    if (selectedBatches.length > 0) {
                                        setBatchToUndo(selectedBatches[0]);
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer"
                            >
                                <Trash2Icon className="w-4 h-4" />
                                <span>↩️ Undo Selected ({selectedBatchIds.size})</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                        >
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>Print Batch Invoices</span>
                        </button>

                        {onOpenExcelImporter && (
                            <button
                                type="button"
                                onClick={onOpenExcelImporter}
                                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer"
                            >
                                <span>📥 Import Excel</span>
                            </button>
                        )}

                        {onOpenWizard && (
                            <button
                                type="button"
                                onClick={onOpenWizard}
                                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-500/20 active:scale-95 cursor-pointer"
                            >
                                <SparklesIcon className="w-4 h-4" />
                                <span>⚡ Billing Wizard</span>
                            </button>
                        )}
                    </div>
                </div>

                {/* Filter and Search Bar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 w-full sm:w-80">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter by description or added by..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold">
                            <button
                                type="button"
                                onClick={() => setStatusFilter('all')}
                                className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'all' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500'}`}
                            >
                                All ({stats.totalBatches})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('active')}
                                className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'active' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-500'}`}
                            >
                                Active ({stats.activeCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setStatusFilter('reversed')}
                                className={`px-3 py-1.5 rounded-xl transition-all ${statusFilter === 'reversed' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500'}`}
                            >
                                Reversed ({stats.reversedCount})
                            </button>
                        </div>
                    </div>
                </div>

                {/* History Table (Matching screenshot layout) */}
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-3xl">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60">
                            <tr>
                                <th className="px-5 py-4 w-10">
                                    <input
                                        type="checkbox"
                                        checked={filteredBatches.length > 0 && filteredBatches.filter(b => b.status === 'active').every(b => selectedBatchIds.has(b.id))}
                                        onChange={(e) => toggleSelectAll(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"
                                    />
                                </th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    Description
                                </th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">
                                    Total Value
                                </th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">
                                    No of Records
                                </th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    Added On
                                </th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                                    Added By
                                </th>
                                <th className="px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                            {filteredBatches.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-bold">
                                        No invoice generation history records found.
                                    </td>
                                </tr>
                            ) : (
                                filteredBatches.map(batch => {
                                    const isReversed = batch.status === 'reversed';
                                    const isChecked = selectedBatchIds.has(batch.id);

                                    return (
                                        <tr 
                                            key={batch.id} 
                                            className={`hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors ${isReversed ? 'bg-rose-50/30 dark:bg-rose-950/20 opacity-70' : ''}`}
                                        >
                                            <td className="px-5 py-4">
                                                <input
                                                    type="checkbox"
                                                    disabled={isReversed}
                                                    checked={isChecked}
                                                    onChange={() => toggleBatchSelect(batch.id)}
                                                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-30"
                                                />
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                        {batch.description}
                                                    </span>
                                                    {isReversed && (
                                                        <span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[9px] font-black uppercase rounded-full border border-rose-200 dark:border-rose-800">
                                                            Reversed / Undone
                                                        </span>
                                                    )}
                                                </div>
                                                <span className="text-[10px] font-mono text-slate-400 block mt-0.5">
                                                    Batch ID: {batch.id}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 font-mono font-black text-right text-slate-900 dark:text-white">
                                                KES {batch.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-5 py-4 text-center font-black text-slate-700 dark:text-slate-300">
                                                <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black">
                                                    {batch.noOfRecords}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">
                                                {formatDateDisplay(batch.addedOn)}
                                            </td>
                                            <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">
                                                {batch.addedBy || 'System Automated'}
                                                                                    <td className="px-5 py-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    
                                                    {/* Edit Batch Added Date */}
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setBatchToEditDate(batch);
                                                            const curDate = batch.addedOn ? new Date(batch.addedOn).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
                                                            setNewBatchDate(curDate);
                                                        }}
                                                        disabled={isReversed}
                                                        className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
                                                        title="Edit Added Date for this batch and its invoices"
                                                    >
                                                        <CalendarDaysIcon className="w-4 h-4" />
                                                    </button>

                                                    {/* View Records */}
                                                    <button
                                                        type="button"
                                                        onClick={() => setViewingBatch(batch)}
                                                        className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="View individual invoices in this batch"
                                                    >
                                                        <EyeIcon className="w-4 h-4" />
                                                    </button>

                                                    {/* Print Batch */}
                                                    <button
                                                        type="button"
                                                        onClick={() => handlePrintBatchInvoices(batch)}
                                                        disabled={isReversed}
                                                        className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30"
                                                        title="Print invoices in this batch"
                                                    >
                                                        <DocumentTextIcon className="w-4 h-4" />
                                                    </button>

                                                    {/* Undo / Rollback Batch Button */}
                                                    {!isReversed ? (
                                                        <button
                                                            type="button"
                                                            onClick={() => setBatchToUndo(batch)}
                                                            className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 dark:border-rose-800 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer"
                                                            title="Undo and reverse all invoice transactions from this run"
                                                        >
                                                            <span>↩️ Undo</span>
                                                        </button>
                                                    ) : (
                                                        <span className="text-[10px] font-bold text-rose-500 italic pr-2">
                                                            Rolled back
                                                        </span>
                                                    )}

                                                </div>
                                             </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

            </div>

            {/* Edit Batch Added Date Modal */}
            {batchToEditDate && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-left animate-in zoom-in-95 duration-200">
                        
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                                <CalendarDaysIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Edit Batch Added Date
                                </h4>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    {batchToEditDate.description}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                                    New Added Date / Issue Date
                                </label>
                                <input
                                    type="date"
                                    value={newBatchDate}
                                    onChange={(e) => setNewBatchDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-xs font-black text-slate-800 dark:text-white outline-none"
                                />
                            </div>

                            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-850 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                                ℹ️ Updating this date will update the issue date and timestamp for all <strong>{batchToEditDate.noOfRecords}</strong> student invoices in this batch.
                            </p>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setBatchToEditDate(null)}
                                disabled={isSavingBatchDate}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveBatchDate}
                                disabled={isSavingBatchDate || !newBatchDate}
                                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>{isSavingBatchDate ? 'Saving...' : 'Update Batch Date'}</span>
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Edit Individual Invoice Added Date Modal */}
            {invoiceToEditDate && (
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-left animate-in zoom-in-95 duration-200">
                        
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                <CalendarDaysIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Edit Invoice Added Date
                                </h4>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
                                    Invoice No: {invoiceToEditDate.invoiceNumber || (invoiceToEditDate as any).invoice_number}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">
                                    New Added Date / Issue Date
                                </label>
                                <input
                                    type="date"
                                    value={newInvoiceDate}
                                    onChange={(e) => setNewInvoiceDate(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-indigo-600 text-xs font-black text-slate-800 dark:text-white outline-none"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setInvoiceToEditDate(null)}
                                disabled={isSavingInvoiceDate}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSaveInvoiceDate}
                                disabled={isSavingInvoiceDate || !newInvoiceDate}
                                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <CheckCircleIcon className="w-4 h-4" />
                                <span>{isSavingInvoiceDate ? 'Saving...' : 'Update Date'}</span>
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* Undo Confirmation Modal */}
            {batchToUndo && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-left animate-in zoom-in-95 duration-200">
                        
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
                                <ExclamationTriangleIcon className="w-8 h-8" />
                            </div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Undo & Rollback Invoice Batch?
                                </h4>
                                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                                    Reversing transactions due to error or duplicate generation
                                </p>
                            </div>
                        </div>

                        <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase text-[10px]">Description:</span>
                                <span className="font-black text-slate-900 dark:text-white">{batchToUndo.description}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase text-[10px]">Total Invoiced Value:</span>
                                <span className="font-mono font-black text-rose-600">KES {batchToUndo.totalValue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase text-[10px]">Invoices to Delete:</span>
                                <span className="font-black text-slate-900 dark:text-white">{batchToUndo.noOfRecords} student records</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400 font-bold uppercase text-[10px]">Generated On:</span>
                                <span className="font-semibold text-slate-600 dark:text-slate-300">{formatDateDisplay(batchToUndo.addedOn)}</span>
                            </div>
                        </div>

                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 leading-relaxed">
                            ⚠️ <strong>Warning</strong>: This action will permanently remove and delete all <strong>{batchToUndo.noOfRecords}</strong> generated invoices from the ledger and recalculate all student account balances immediately.
                        </p>

                        <div className="flex items-center justify-end gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setBatchToUndo(null)}
                                className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmUndoBatch}
                                disabled={isUndoing}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                            >
                                <Trash2Icon className="w-4 h-4" />
                                <span>{isUndoing ? 'Rolling back...' : 'Confirm & Undo Batch'}</span>
                            </button>
                        </div>

                    </div>
                </div>
            )}

            {/* View Batch Invoices Modal */}
            {viewingBatch && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 flex flex-col space-y-6 text-left animate-in zoom-in-95 duration-200">
                        
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Batch Details: {viewingBatch.description}
                                </h4>
                                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                    {viewingBatch.noOfRecords} Invoices • Total KES {viewingBatch.totalValue.toLocaleString()} • Added by {viewingBatch.addedBy}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewingBatch(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Invoice No</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Student Name</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Admission No</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Class</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">Date Added</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right">Amount (KES)</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-center">Status</th>
                                        <th className="px-4 py-3 text-[10px] font-black uppercase text-slate-400 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                    {invoices.filter(i => viewingBatch.invoiceIds.includes(i.id)).map(inv => {
                                        const st = studentMap.get(inv.studentId || '');
                                        const adm = st?.admissionNumber || st?.admission_number || (st?.metadata as any)?.admissionNumber || '—';
                                        const cls = inv.className || (st?.metadata as any)?.className || '—';
                                        const amt = parseMoney(inv.totalAmount || (inv as any).total_amount || 0);
                                        const invDate = inv.issueDate || (inv as any).issue_date || (inv as any).createdAt || '—';

                                        return (
                                            <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                                                    {inv.invoiceNumber || (inv as any).invoice_number}
                                                </td>
                                                <td className="px-4 py-3 font-black text-slate-900 dark:text-white">
                                                    {st?.name || (inv as any).studentName || 'Student'}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-semibold text-slate-600 dark:text-slate-400">
                                                    {adm}
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                                                    {cls}
                                                </td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">
                                                    {formatDateDisplay(invDate)}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-black text-right text-indigo-600 dark:text-indigo-400">
                                                    {amt.toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                        inv.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                                        inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                        {inv.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setInvoiceToEditDate(inv);
                                                            const curDate = inv.issueDate || (inv as any).issue_date || ((inv as any).createdAt ? new Date((inv as any).createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
                                                            setNewInvoiceDate(curDate);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                                        title="Edit Added Date"
                                                    >
                                                        <PencilIcon className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button
                                type="button"
                                onClick={() => setViewingBatch(null)}
                                className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all"
                            >
                                Close
                            </button>
                        </div>

                    </div>
                </div>
            )}

        </div>
    );
};
