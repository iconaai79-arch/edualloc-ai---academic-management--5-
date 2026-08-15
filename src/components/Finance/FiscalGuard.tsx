import React, { useState, useEffect } from 'react';
import type { Invoice, Receipt, Expense, User } from '../../types';
import { FinancialAuditDashboard } from './FinancialAuditDashboard';
import { apiService } from '../../services/apiService';

// Inline SVGs for clean imports
const Icon = ({ d, className = 'w-5 h-5' }: { d: string; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" className={className}>
        <path d={d} />
    </svg>
);
const IcoShield  = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcoList    = () => <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />;
const IcoUser    = () => <Icon d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M12 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />;
const IcoRefresh = () => <Icon d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />;

interface FiscalGuardProps {
    invoices: Invoice[];
    receipts: Receipt[];
    expenses: Expense[];
    students?: User[] | any[];
    openingBalances?: number;
    institutionId: string;
    onRefreshData?: () => void;
}

export const FiscalGuard: React.FC<FiscalGuardProps> = ({
    invoices,
    receipts,
    expenses,
    students,
    openingBalances,
    institutionId,
    onRefreshData,
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'audit_trail'>('dashboard');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [logFilter, setLogFilter] = useState<'ALL' | 'DELETE' | 'LARGE_AMOUNT' | 'AMOUNT_CHANGED' | 'STATUS_CHANGED'>('ALL');

    // Fetch live tamper-evident DB logs
    const fetchAuditLogs = async () => {
        setLoadingLogs(true);
        try {
            // Fetch v_audit_feed view records
            const logs = await apiService.fetchModuleRecords<any>('v_audit_feed', institutionId, undefined, {
                limit: 100,
            });
            setAuditLogs(logs || []);
        } catch (err) {
            console.error('[FiscalGuard] Failed to fetch audit logs:', err);
        } finally {
            setLoadingLogs(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'audit_trail') {
            fetchAuditLogs();
        }
    }, [activeTab, institutionId]);

    const filteredLogs = auditLogs.filter(log => {
        if (logFilter === 'ALL') return true;
        return log.flag === logFilter;
    });

    const formatDiff = (log: any) => {
        if (log.action === 'DELETE') {
            return <span className="text-rose-600 font-bold">Record Deleted permanent trace saved</span>;
        }
        if (log.action === 'INSERT') {
            return <span className="text-emerald-600 font-bold">New Record created (Amount: KES {Number(log.new_amount || 0).toLocaleString()})</span>;
        }
        // Update checks
        if (log.old_amount !== log.new_amount) {
            return (
                <span>
                    Amount changed: <span className="line-through text-slate-400">KES {Number(log.old_amount || 0).toLocaleString()}</span> →{' '}
                    <span className="font-bold text-slate-800 dark:text-white">KES {Number(log.new_amount || 0).toLocaleString()}</span>
                </span>
            );
        }
        if (log.old_status !== log.new_status) {
            return (
                <span>
                    Status changed: <span className="line-through text-slate-400">{log.old_status || 'none'}</span> →{' '}
                    <span className="font-bold text-slate-800 dark:text-white">{log.new_status}</span>
                </span>
            );
        }
        return <span className="text-slate-500">Record metadata / non-monetary fields updated</span>;
    };

    return (
        <div className="space-y-6">
            {/* ── Sub Header / Internal Navigation ── */}
            <div className="bg-slate-50 dark:bg-slate-800 p-2 rounded-2xl flex items-center justify-between border border-slate-100 dark:border-slate-700">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'dashboard'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <IcoShield /> Auditor Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('audit_trail')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            activeTab === 'audit_trail'
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-800'
                        }`}
                    >
                        <IcoList /> Tamper-Evident DB Logs
                    </button>
                </div>
                {activeTab === 'audit_trail' && (
                    <button
                        onClick={fetchAuditLogs}
                        disabled={loadingLogs}
                        className="p-2 text-slate-500 hover:text-indigo-600 transition-all rounded-lg"
                        title="Reload live logs"
                    >
                        <IcoRefresh />
                    </button>
                )}
            </div>

            {/* ── Tab Views ── */}
            {activeTab === 'dashboard' ? (
                <FinancialAuditDashboard
                    invoices={invoices}
                    receipts={receipts}
                    expenses={expenses}
                    students={students}
                    openingBalances={openingBalances}
                    institutionId={institutionId}
                />
            ) : (
                <div className="space-y-4">
                    {/* Log filter bar */}
                    <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex gap-1.5 flex-wrap">
                            {(['ALL', 'DELETE', 'LARGE_AMOUNT', 'AMOUNT_CHANGED', 'STATUS_CHANGED'] as const).map(filter => (
                                <button
                                    key={filter}
                                    onClick={() => setLogFilter(filter)}
                                    className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${
                                        logFilter === filter
                                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-950'
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                    }`}
                                >
                                    {filter.replace(/_/g, ' ')}
                                </button>
                            ))}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                            Showing {filteredLogs.length} logs
                        </p>
                    </div>

                    {/* Live Log Timeline */}
                    {loadingLogs ? (
                        <div className="p-12 text-center text-slate-400 font-medium">
                            <span className="inline-block w-6 h-6 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin mr-2 align-middle" />
                            Loading live tamper-evident logs...
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-medium border border-dashed border-slate-200 dark:border-slate-700 rounded-3xl">
                            No logs found matching this filter.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredLogs.map(log => {
                                const flagColor = {
                                    DELETE:         'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-700',
                                    LARGE_AMOUNT:   'bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800 text-orange-700',
                                    AMOUNT_CHANGED: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800 text-amber-700',
                                    STATUS_CHANGED: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-700',
                                    NORMAL:         'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }[log.flag as string || 'NORMAL'] || 'bg-white border-slate-200 text-slate-700';

                                return (
                                    <div key={log.id} className={`p-4 rounded-2xl border flex items-start gap-4 transition-all ${flagColor}`}>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                                                    {log.table_name}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400">
                                                    {log.action}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-400 ml-auto">
                                                    {new Date(log.created_at).toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-xs font-semibold mt-1">
                                                {formatDiff(log)}
                                            </p>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                                                <IcoUser />
                                                <span>Changed by: {log.changed_by || 'system/API key'}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
