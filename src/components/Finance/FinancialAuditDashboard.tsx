/**
 * FinancialAuditDashboard.tsx
 * Full automated financial auditor dashboard for EduAI.
 * Plugs into the "Fiscal Audit" tab of FinanceManager.tsx.
 */
import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Invoice, Receipt, Expense } from '../../types';
import {
    runFullAudit,
    computeTrialBalance,
    computeVariance,
    scoreReceiptAnomalies,
    getInvoiceAmount,
    getReceiptAmount,
    type AuditReport,
    type AuditIssue,
    type AuditSeverity,
    type BudgetLine,
    DEFAULT_POLICY,
} from '../../services/auditEngine';
import { apiService } from '../../services/apiService';

// ─── Icon helpers (inline SVG to avoid import churn) ─────────────────────────
const Icon = ({ d, className = 'w-5 h-5' }: { d: string; className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" className={className}>
        <path d={d} />
    </svg>
);
const IcoShield  = () => <Icon d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />;
const IcoZap     = () => <Icon d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />;
const IcoAlert   = () => <Icon d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01" />;
const IcoCheck   = () => <Icon d="M22 11.08V12a10 10 0 1 1-5.93-9.14 M22 4L12 14.01l-3-3" />;
const IcoBalance = () => <Icon d="M12 3v18 M3 6h18 M3 18h18 M6 10h3 M15 10h3 M6 14h3 M15 14h3" />;
const IcoRefresh = () => <Icon d="M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />;
const IcoDownload = () => <Icon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3" />;
const IcoHistory  = () => <Icon d="M12 8v4l3 3 M3.05 11a9 9 0 1 0 .5-3" />;
const IcoResolve  = () => <Icon d="M9 12l2 2 4-4 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />;

// ─── Severity config ──────────────────────────────────────────────────────────
const SEV: Record<AuditSeverity, { bg: string; text: string; border: string; dot: string; label: string }> = {
    CRITICAL: { bg: 'bg-rose-50 dark:bg-rose-900/20',    text: 'text-rose-700 dark:text-rose-300',   border: 'border-rose-200 dark:border-rose-700',   dot: 'bg-rose-500',    label: 'Critical' },
    HIGH:     { bg: 'bg-orange-50 dark:bg-orange-900/20', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-700', dot: 'bg-orange-500',  label: 'High' },
    MEDIUM:   { bg: 'bg-amber-50 dark:bg-amber-900/20',  text: 'text-amber-700 dark:text-amber-300',  border: 'border-amber-200 dark:border-amber-700',   dot: 'bg-amber-500',   label: 'Medium' },
    LOW:      { bg: 'bg-blue-50 dark:bg-blue-900/20',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-200 dark:border-blue-700',     dot: 'bg-blue-500',    label: 'Low' },
    INFO:     { bg: 'bg-slate-50 dark:bg-slate-800',     text: 'text-slate-600 dark:text-slate-400',  border: 'border-slate-200 dark:border-slate-700',   dot: 'bg-slate-400',   label: 'Info' },
};

// ─── Props ────────────────────────────────────────────────────────────────────
interface FinancialAuditDashboardProps {
    invoices: Invoice[];
    receipts: Receipt[];
    expenses: Expense[];
    students?: any[];
    openingBalances?: number;
    institutionId: string;
    currencySymbol?: string;
}

// ─── Stat card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, color = 'slate' }: { label: string; value: string | number; sub?: string; color?: string }) => (
    <div className={`p-6 rounded-3xl border bg-white dark:bg-slate-800 border-${color}-100 dark:border-${color}-800 shadow-sm`}>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>
        <p className={`text-2xl font-black text-${color}-600 dark:text-${color}-400 tracking-tight`}>{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-1 font-medium">{sub}</p>}
    </div>
);

// ─── Past report row ─────────────────────────────────────────────────────────
const PastReportRow = ({ r, onSelect }: { r: any; onSelect: (r: any) => void }) => {
    const risk = (r.overall_risk || r.overallRisk || r.summary?.overallRisk || r.summary_json?.overallRisk || 'INFO') as AuditSeverity;
    const s = SEV[risk] ?? SEV.INFO;
    const totalIssues = r.total_issues ?? r.totalIssues ?? r.summary?.totalIssues ?? r.summary_json?.totalIssues ?? 0;
    const criticalCount = r.critical_count ?? r.criticalCount ?? r.summary?.critical ?? r.summary_json?.critical ?? 0;
    const highCount = r.high_count ?? r.highCount ?? r.summary?.high ?? r.summary_json?.high ?? 0;
    const collectionRate = r.collection_rate ?? r.collectionRate ?? r.summary?.collectionRate ?? r.summary_json?.collectionRate ?? 0;

    const rawDate = r.run_at || r.runAt || r.created_at || r.createdAt || r.updated_at || r.updatedAt || r.timestamp;
    let formattedDate = 'Recent';
    if (rawDate) {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
            formattedDate = d.toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    } else if (r.period) {
        const parts = String(r.period).split('-');
        if (parts.length >= 2) {
            const year = parseInt(parts[0]);
            const month = parseInt(parts[1]) - 1;
            const d = new Date(year, month, 1);
            if (!isNaN(d.getTime())) {
                formattedDate = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short' });
            }
        }
    }

    const triggeredBy = r.triggered_by || r.triggeredBy || 'manual';

    return (
        <button
            onClick={() => onSelect(r)}
            className={`w-full text-left p-4 rounded-2xl border flex items-center gap-4 transition-all hover:scale-[1.01] ${s.bg} ${s.border}`}
        >
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${s.dot}`} />
            <div className="flex-1 min-w-0">
                <p className={`text-xs font-black uppercase tracking-widest ${s.text}`}>
                    {r.period || 'Period'} — {risk}
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5 font-medium">
                    {totalIssues} issue{totalIssues !== 1 ? 's' : ''} · {criticalCount} critical · {highCount} high
                    · Collection {collectionRate}%
                </p>
            </div>
            <div className="text-right flex-shrink-0">
                <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{formattedDate}</p>
                <p className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold">{triggeredBy}</p>
            </div>
        </button>
    );
};

// ─── Issue row with resolve button ───────────────────────────────────────────
const IssueRow = ({ issue, onResolve }: { issue: AuditIssue; onResolve?: (id: string) => void }) => {
    const s = SEV[issue.severity];
    return (
        <div className={`p-4 rounded-2xl border ${s.bg} ${s.border} flex items-start gap-3`}>
            <span className={`w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0 ${s.dot}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${s.bg} ${s.text} border ${s.border}`}>
                        {s.label}
                    </span>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{issue.type.replace(/_/g, ' ')}</span>
                    {issue.amount !== undefined && (
                        <span className="text-[9px] font-black text-slate-500 ml-auto">
                            KES {issue.amount.toLocaleString()}
                        </span>
                    )}
                </div>
                <p className={`text-xs mt-1 font-medium ${s.text}`}>{issue.message}</p>
            </div>
            {onResolve && (
                <button
                    onClick={() => onResolve(issue.id)}
                    title="Mark as resolved"
                    className="flex-shrink-0 p-1.5 rounded-xl bg-white/60 dark:bg-slate-700/60 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-slate-400 hover:text-emerald-600 transition-all"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 12l2 2 4-4 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z"/></svg>
                </button>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export const FinancialAuditDashboard: React.FC<FinancialAuditDashboardProps> = ({
    invoices, receipts, expenses, students, openingBalances, institutionId, currencySymbol = 'KES',
}) => {
    const [activeView, setActiveView] = useState<'overview' | 'issues' | 'trial' | 'anomalies' | 'variance' | 'history'>('overview');
    const [filterSeverity, setFilterSeverity] = useState<AuditSeverity | 'ALL'>('ALL');
    const [isRunning, setIsRunning] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [report, setReport] = useState<AuditReport | null>(null);
    const [hasRun, setHasRun] = useState(false);
    const [pastReports, setPastReports] = useState<any[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [resolvedIds, setResolvedIds] = useState<Set<string>>(new Set());

    // Compute live metrics factoring opening balances
    const totalOpeningBalances = useMemo(() => {
        if (typeof openingBalances === 'number' && openingBalances >= 0) return openingBalances;
        return (students || []).reduce((acc: number, s: any) => {
            const ob = s?.metadata?.openingBalance ?? s?.openingBalance ?? s?.metadata?.balanceBf ?? s?.metadata?.balance ?? 0;
            return acc + (Number(ob) || 0);
        }, 0);
    }, [openingBalances, students]);

    const totalInvoiced = useMemo(() => {
        return invoices.reduce((s, i) => s + getInvoiceAmount(i), 0);
    }, [invoices]);

    const totalBilled = totalInvoiced + totalOpeningBalances;

    const totalCollected = useMemo(() => {
        return receipts.reduce((s, r) => s + getReceiptAmount(r), 0);
    }, [receipts]);

    const totalExpenses = useMemo(() => {
        return expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    }, [expenses]);

    // Simple default budget for variance view (editable)
    const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([
        { category: 'Salaries',     budgetedAmount: 500_000 },
        { category: 'Utilities',    budgetedAmount: 50_000  },
        { category: 'Maintenance',  budgetedAmount: 80_000  },
        { category: 'Supplies',     budgetedAmount: 30_000  },
        { category: 'Marketing',    budgetedAmount: 20_000  },
        { category: 'Other',        budgetedAmount: 40_000  },
    ]);

    const runAudit = useCallback(async () => {
        setIsRunning(true);
        await new Promise(r => setTimeout(r, 120));
        try {
            const result = runFullAudit({ 
                invoices, 
                receipts, 
                expenses, 
                students, 
                openingBalances: totalOpeningBalances, 
                institutionId 
            });
            setReport(result);
            setHasRun(true);

            // ── Persist to DB via save_audit_run RPC ──────────────────────
            setIsSaving(true);
            try {
                if (apiService.isConfigured()) {
                    await apiService.invokeRpc('save_audit_run', {
                        p_institution_id: institutionId,
                        p_period:          result.period,
                        p_triggered_by:    'manual',
                        p_summary:         result.summary,
                        p_issues:          result.issues,
                    });
                } else {
                    await apiService.saveModuleRecords('audit_reports', [{
                        institution_id:  institutionId,
                        period:          result.period,
                        triggered_by:    'manual',
                        overall_risk:    result.summary.overallRisk,
                        total_issues:    result.summary.totalIssues,
                        critical_count:  result.summary.critical,
                        high_count:      result.summary.high,
                        medium_count:    result.summary.medium,
                        low_count:       result.summary.low,
                        info_count:      result.summary.info,
                        total_billed:    result.summary.totalBilled,
                        total_collected: result.summary.totalCollected,
                        collection_rate: result.summary.collectionRate,
                        outstanding:     result.summary.outstandingDebt,
                        issues_json:     result.issues,
                        summary_json:    result.summary,
                    }]);
                }
                // Push in-app notification for CRITICAL issues
                const criticals = result.issues.filter(i => i.severity === 'CRITICAL');
                if (criticals.length > 0) {
                    await apiService.saveModuleRecords('app_notifications', criticals.slice(0, 3).map(iss => ({
                        id: `audit-${iss.id}`,
                        institution_id: institutionId,
                        message: `🔴 AUDIT: ${iss.message}`,
                        type: 'audit_alert',
                        is_read: false,
                        timestamp: new Date().toISOString(),
                    })));
                }
            } catch (saveErr) {
                console.warn('[AuditDashboard] Could not persist report:', saveErr);
            } finally {
                setIsSaving(false);
            }
            // ─────────────────────────────────────────────────────────────
        } finally {
            setIsRunning(false);
        }
    }, [invoices, receipts, expenses, students, totalOpeningBalances, institutionId]);

    // ── Load history from DB ──────────────────────────────────────────────────
    const loadHistory = useCallback(async () => {
        setLoadingHistory(true);
        try {
            const rows = await apiService.fetchModuleRecords<any>('audit_reports', institutionId, undefined, {
                limit: 20,
                order: 'run_at.desc',
            });
            setPastReports(rows ?? []);
        } catch (e) {
            console.warn('[AuditDashboard] Could not load history:', e);
        } finally {
            setLoadingHistory(false);
        }
    }, [institutionId]);

    useEffect(() => { loadHistory(); }, [loadHistory]);

    // ── Resolve an issue (mark in DB + local) ─────────────────────────────────
    const handleResolve = useCallback(async (issueId: string) => {
        setResolvedIds(prev => new Set([...prev, issueId]));
        try {
            await apiService.saveModuleRecords('audit_issues', [{
                id: issueId,
                is_resolved: true,
                resolved_at: new Date().toISOString(),
            }]);
        } catch (e) {
            console.warn('[AuditDashboard] Could not mark issue resolved:', e);
        }
    }, []);

    // Trial balance — computed directly, no need to run audit first
    const trialBalance = useMemo(() => computeTrialBalance(invoices, receipts, expenses, totalOpeningBalances), [invoices, receipts, expenses, totalOpeningBalances]);

    // Anomaly scores
    const scoredReceipts = useMemo(() => scoreReceiptAnomalies(receipts), [receipts]);
    const anomalies = useMemo(() => scoredReceipts.filter(r => r.isAnomaly), [scoredReceipts]);

    // Variance
    const varianceLines = useMemo(() => computeVariance(budgetLines, expenses), [budgetLines, expenses]);

    // Filtered issues
    const filteredIssues = useMemo(() => {
        if (!report) return [];
        const activeIssues = report.issues.filter(i => !resolvedIds.has(i.id));
        return filterSeverity === 'ALL'
            ? activeIssues
            : activeIssues.filter(i => i.severity === filterSeverity);
    }, [report, filterSeverity, resolvedIds]);

    const fmt = (n: number) => `${currencySymbol} ${n.toLocaleString()}`;

    // ─── TABS ──────────────────────────────────────────────────────────────
    const views = [
        { id: 'overview',   label: 'Overview'     },
        { id: 'issues',     label: 'Issues'        },
        { id: 'trial',      label: 'Trial Balance' },
        { id: 'anomalies',  label: 'Anomalies'     },
        { id: 'variance',   label: 'Variance'      },
        { id: 'history',    label: 'History'       },
    ] as const;

    const riskColor = report
        ? { CRITICAL: 'rose', HIGH: 'orange', MEDIUM: 'amber', LOW: 'blue', INFO: 'emerald' }[report.summary.overallRisk]
        : 'slate';

    // ─── EXPORT ────────────────────────────────────────────────────────────
    const exportCSV = () => {
        if (!report) return;
        const rows = [
            ['Severity', 'Type', 'Message', 'Record ID', 'Amount', 'Detected At'],
            ...report.issues.map(i => [
                i.severity, i.type, `"${i.message}"`, i.recordId ?? '', i.amount ?? '', i.detectedAt
            ]),
        ];
        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-report-${report.period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // ─── RENDER ─────────────────────────────────────────────────────────────
    return (
        <div className="space-y-6 animate-in fade-in duration-300">

            {/* ── Header ── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight italic">
                        Automated Financial Audit
                    </h2>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                        Reconciliation · Policy Checks · Anomaly Detection · Trial Balance
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Undo Last Import Button – visible only when a log exists */}
                            {isSaving && (
                                <span className="flex items-center gap-1.5 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    <span className="w-3 h-3 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                                    Saving…
                                </span>
                            )}
                            {report && (
                        <button
                            onClick={exportCSV}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            <IcoDownload /> Export CSV
                        </button>
                    )}
                    <button
                        onClick={runAudit}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                    >
                        {isRunning
                            ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Running…</>
                            : <><IcoZap /> {hasRun ? 'Re-run Audit' : 'Run Audit Now'}</>
                        }
                    </button>
                </div>
            </div>

            {/* ── Risk Banner (after run) ── */}
            {report && (
                <div className={`p-5 rounded-3xl border flex items-center gap-4 ${SEV[report.summary.overallRisk].bg} ${SEV[report.summary.overallRisk].border}`}>
                    <div className={`p-3 rounded-2xl ${SEV[report.summary.overallRisk].bg} border ${SEV[report.summary.overallRisk].border}`}>
                        <IcoShield />
                    </div>
                    <div className="flex-1">
                        <p className={`text-sm font-black uppercase tracking-tight ${SEV[report.summary.overallRisk].text}`}>
                            Overall Risk: {report.summary.overallRisk}
                        </p>
                        <p className={`text-xs mt-0.5 font-medium ${SEV[report.summary.overallRisk].text} opacity-80`}>
                            {report.summary.totalIssues} issue{report.summary.totalIssues !== 1 ? 's' : ''} found
                            · {report.summary.critical} critical · {report.summary.high} high
                            · Collection rate {report.summary.collectionRate}%
                            · Run at {(() => {
                                const raw = report.runAt || (report as any).createdAt || (report as any).run_at;
                                const d = raw ? new Date(raw) : new Date();
                                return !isNaN(d.getTime()) ? d.toLocaleTimeString() : 'Just now';
                            })()}
                        </p>
                    </div>
                    {report.summary.totalIssues === 0 && (
                        <div className="text-emerald-600 dark:text-emerald-400"><IcoCheck /></div>
                    )}
                </div>
            )}

            {/* ── Sub-tabs ── */}
            <div className="flex gap-2 flex-wrap">
                {views.map(v => (
                    <button
                        key={v.id}
                        onClick={() => setActiveView(v.id)}
                        className={`px-5 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${
                            activeView === v.id
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-700'
                        }`}
                    >
                        {v.label}
                        {v.id === 'issues' && report && report.summary.totalIssues > 0 && (
                            <span className="ml-1.5 bg-white/20 text-white text-[9px] px-1.5 py-0.5 rounded-full">
                                {report.summary.totalIssues}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* ════════════════════════════════════════════════════════════════
                OVERVIEW
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'overview' && (
                <div className="space-y-6">
                    {/* KPI grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <StatCard 
                            label="Total Billed" 
                            value={fmt(report ? report.summary.totalBilled : totalBilled)} 
                            sub={totalOpeningBalances > 0 ? `Incl. ${fmt(totalOpeningBalances)} Opening Bal.` : (totalInvoiced > 0 ? `${invoices.length} invoices` : undefined)} 
                            color="indigo" 
                        />
                        <StatCard 
                            label="Total Collected" 
                            value={fmt(report ? report.summary.totalCollected : totalCollected)} 
                            sub={`${receipts.length} receipts`} 
                            color="emerald" 
                        />
                        <StatCard 
                            label="Total Expenses" 
                            value={fmt(totalExpenses)} 
                            sub={`${expenses.length} records`} 
                            color="amber" 
                        />
                        <StatCard 
                            label="Anomalous Receipts" 
                            value={anomalies.length}
                            sub={`out of ${receipts.length} total`} 
                            color={anomalies.length > 0 ? 'rose' : 'slate'} 
                        />
                    </div>

                    {/* Issue breakdown (if run) */}
                    {report ? (
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                            {(['CRITICAL','HIGH','MEDIUM','LOW','INFO'] as AuditSeverity[]).map(sev => (
                                <button
                                    key={sev}
                                    onClick={() => { setFilterSeverity(sev); setActiveView('issues'); }}
                                    className={`p-5 rounded-3xl border text-left transition-all hover:scale-[1.02] ${SEV[sev].bg} ${SEV[sev].border}`}
                                >
                                    <p className={`text-2xl font-black ${SEV[sev].text}`}>
                                        {report.summary[sev.toLowerCase() as 'critical' | 'high' | 'medium' | 'low' | 'info']}
                                    </p>
                                    <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${SEV[sev].text}`}>{SEV[sev].label}</p>
                                </button>
                            ))}
                        </div>
                    ) : (
                        <div className="p-12 bg-slate-50 dark:bg-slate-800/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4">
                            <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-[1.5rem] flex items-center justify-center mx-auto text-indigo-600">
                                <IcoShield />
                            </div>
                            <div>
                                <p className="font-black text-slate-900 dark:text-white uppercase text-lg tracking-tight">
                                    Audit Not Yet Run
                                </p>
                                <p className="text-slate-400 text-sm mt-1">
                                    Click <strong>Run Audit Now</strong> to analyse {invoices.length} invoices,
                                    {' '}{receipts.length} receipts and {expenses.length} expenses.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                ISSUES
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'issues' && (
                <div className="space-y-4">
                    {/* Severity filter */}
                    <div className="flex gap-2 flex-wrap">
                        {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilterSeverity(f)}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
                                    filterSeverity === f
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    {!hasRun && (
                        <div className="p-8 text-center text-slate-400 font-medium">
                            Run the audit first to see issues.
                        </div>
                    )}

                    {hasRun && filteredIssues.length === 0 && (
                        <div className="p-8 text-center text-emerald-600 font-black uppercase tracking-wide">
                            ✓ No issues found for this filter.
                        </div>
                    )}

                    <div className="space-y-2">
                        {filteredIssues.map(issue => (
                            <IssueRow key={issue.id} issue={issue} onResolve={handleResolve} />
                        ))}
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                TRIAL BALANCE
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'trial' && (
                <div className="space-y-4">
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 ${
                        trialBalance.isBalanced
                            ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-700'
                            : 'bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700'
                    }`}>
                        <IcoBalance />
                        <span className={`text-sm font-black uppercase ${trialBalance.isBalanced ? 'text-emerald-700' : 'text-rose-700'}`}>
                            {trialBalance.isBalanced
                                ? '✓ Books are balanced'
                                : `⚠ Imbalance detected — ${fmt(trialBalance.imbalance)}`}
                        </span>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    <th className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">Category</th>
                                    <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Debit</th>
                                    <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Credit</th>
                                    <th className="p-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Net</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trialBalance.lines.map((line, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                        <td className="p-4 font-bold text-slate-900 dark:text-white">{line.category}</td>
                                        <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-300">{line.debit > 0 ? fmt(line.debit) : '—'}</td>
                                        <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-300">{line.credit > 0 ? fmt(line.credit) : '—'}</td>
                                        <td className={`p-4 text-right font-black font-mono ${line.net >= 0 ? 'text-slate-900 dark:text-white' : 'text-emerald-600'}`}>
                                            {fmt(Math.abs(line.net))} {line.net < 0 ? 'Cr' : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot className="bg-slate-900 dark:bg-slate-700">
                                <tr>
                                    <td className="p-4 font-black text-white text-[10px] uppercase tracking-widest">Total</td>
                                    <td className="p-4 text-right font-black text-white font-mono">{fmt(trialBalance.totalDebit)}</td>
                                    <td className="p-4 text-right font-black text-white font-mono">{fmt(trialBalance.totalCredit)}</td>
                                    <td className="p-4 text-right font-black text-white font-mono">{fmt(trialBalance.totalDebit - trialBalance.totalCredit)}</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                ANOMALIES
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'anomalies' && (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <StatCard label="Total Receipts"   value={receipts.length}    color="slate" />
                        <StatCard label="Anomalous"        value={anomalies.length}   color={anomalies.length > 0 ? 'rose' : 'emerald'}
                            sub={`${((anomalies.length / Math.max(receipts.length, 1)) * 100).toFixed(1)}% of total`} />
                        <StatCard label="Highest z-score"  value={scoredReceipts.length > 0 ? Math.max(...scoredReceipts.map(r => r.zScore)).toFixed(2) : '—'} color="orange" />
                    </div>

                    {anomalies.length === 0 ? (
                        <div className="p-12 text-center text-emerald-600 font-black uppercase tracking-wide rounded-3xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700">
                            ✓ No statistical anomalies detected in {receipts.length} receipts.
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                    <tr>
                                        {['Receipt #','Amount','Date','z-Score','Risk'].map(h => (
                                            <th key={h} className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {anomalies.map(r => (
                                        <tr key={r.id} className="border-b border-slate-50 dark:border-slate-800 bg-rose-50/30 dark:bg-rose-900/10">
                                            <td className="p-4 font-bold text-slate-900 dark:text-white">{r.receiptNumber}</td>
                                            <td className="p-4 font-black font-mono text-rose-600">{fmt(r.amountPaid)}</td>
                                            <td className="p-4 text-slate-500">{r.paymentDate?.split('T')[0] ?? '—'}</td>
                                            <td className="p-4 font-black text-orange-600">{r.zScore}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${r.zScore > 4 ? 'bg-rose-100 text-rose-700' : 'bg-orange-100 text-orange-700'}`}>
                                                    {r.zScore > 4 ? 'CRITICAL' : 'HIGH'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                VARIANCE
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'variance' && (
                <div className="space-y-4">
                    <p className="text-xs text-slate-400 font-medium">
                        Edit budget figures to match your institution's budget. Variances &gt;10% are flagged automatically.
                    </p>
                    <div className="overflow-x-auto rounded-3xl border border-slate-100 dark:border-slate-700">
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <tr>
                                    {['Category','Budget','Actual','Variance','%','Flag'].map(h => (
                                        <th key={h} className="p-4 text-left text-[10px] font-black uppercase tracking-widest text-slate-400">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {varianceLines.map((line, i) => {
                                    const flagColors = {
                                        OK:       'bg-emerald-100 text-emerald-700',
                                        WATCH:    'bg-blue-100 text-blue-700',
                                        REVIEW:   'bg-amber-100 text-amber-700',
                                        CRITICAL: 'bg-rose-100 text-rose-700',
                                    };
                                    return (
                                        <tr key={i} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                            <td className="p-4 font-bold text-slate-900 dark:text-white">{line.category}</td>
                                            <td className="p-4 font-mono text-slate-500">
                                                <input
                                                    type="number"
                                                    value={line.budgetedAmount}
                                                    onChange={e => setBudgetLines(prev => prev.map((b, bi) => bi === i ? { ...b, budgetedAmount: parseFloat(e.target.value) || 0 } : b))}
                                                    className="w-28 bg-transparent border-b border-slate-200 dark:border-slate-600 outline-none text-xs font-black text-slate-900 dark:text-white py-0.5"
                                                />
                                            </td>
                                            <td className="p-4 font-mono font-black text-slate-900 dark:text-white">{fmt(line.actual)}</td>
                                            <td className={`p-4 font-black font-mono ${line.variance > 0 ? 'text-rose-600' : line.variance < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {line.variance > 0 ? '+' : ''}{fmt(line.variance)}
                                            </td>
                                            <td className={`p-4 font-black ${line.variance > 0 ? 'text-rose-600' : line.variance < 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {line.variancePct > 0 ? '+' : ''}{line.variancePct}%
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${flagColors[line.flag]}`}>
                                                    {line.flag}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════════════════════════════════════════════════════════════════
                HISTORY
            ════════════════════════════════════════════════════════════════ */}
            {activeView === 'history' && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 font-medium">
                            Historical audit reports generated manually or scheduled.
                        </p>
                        <button
                            onClick={loadHistory}
                            disabled={loadingHistory}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                        >
                            <IcoRefresh /> Refresh
                        </button>
                    </div>

                    {loadingHistory ? (
                        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                            Loading audit history...
                        </div>
                    ) : pastReports.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest rounded-3xl bg-slate-50 dark:bg-slate-800/50 border border-dashed border-slate-200 dark:border-slate-700">
                            No past audit reports found.
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {pastReports.map(r => (
                                <PastReportRow
                                    key={r.id}
                                    r={r}
                                    onSelect={(selectedReport) => {
                                        const rawDate = selectedReport.run_at || selectedReport.runAt || selectedReport.created_at || selectedReport.createdAt || new Date().toISOString();
                                        const sum = selectedReport.summary_json || selectedReport.summary || {};
                                        setReport({
                                            period: selectedReport.period || 'Period',
                                            runAt: rawDate,
                                            institutionId: selectedReport.institution_id || selectedReport.institutionId || institutionId,
                                            issues: selectedReport.issues_json || selectedReport.issues || [],
                                            summary: {
                                                totalIssues: selectedReport.total_issues ?? selectedReport.totalIssues ?? sum.totalIssues ?? 0,
                                                critical: selectedReport.critical_count ?? selectedReport.criticalCount ?? sum.critical ?? 0,
                                                high: selectedReport.high_count ?? selectedReport.highCount ?? sum.high ?? 0,
                                                medium: selectedReport.medium_count ?? selectedReport.mediumCount ?? sum.medium ?? 0,
                                                low: selectedReport.low_count ?? selectedReport.lowCount ?? sum.low ?? 0,
                                                info: selectedReport.info_count ?? selectedReport.infoCount ?? sum.info ?? 0,
                                                overallRisk: selectedReport.overall_risk || selectedReport.overallRisk || sum.overallRisk || 'INFO',
                                                totalBilled: selectedReport.total_billed ?? selectedReport.totalBilled ?? sum.totalBilled ?? 0,
                                                totalCollected: selectedReport.total_collected ?? selectedReport.totalCollected ?? sum.totalCollected ?? 0,
                                                collectionRate: selectedReport.collection_rate ?? selectedReport.collectionRate ?? sum.collectionRate ?? 0,
                                                outstandingDebt: selectedReport.outstanding ?? selectedReport.outstandingDebt ?? sum.outstandingDebt ?? 0,
                                            }
                                        });
                                        setHasRun(true);
                                        setActiveView('overview');
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
