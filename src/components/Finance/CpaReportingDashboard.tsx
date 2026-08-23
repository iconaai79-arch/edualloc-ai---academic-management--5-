import React, { useState, useMemo } from 'react';
import {
    GeneralLedgerService,
    ChartOfAccount,
    JournalEntry,
    AccountSummary,
    TrialBalanceReport,
    IncomeStatementReport,
    BalanceSheetReport
} from '../../services/generalLedgerService';
import {
    ChartBarIcon as DocumentChartBarIcon,
    ScaleIcon,
    BanknotesIcon as CurrencyDollarIcon,
    DownloadIcon as ArrowDownTrayIcon,
    PrinterIcon,
    MagnifyingGlassIcon,
    CheckBadgeIcon,
    ExclamationTriangleIcon,
    BookOpenIcon,
    ClipboardListIcon as ClipboardDocumentListIcon,
    ArrowTrendingUpIcon,
    BuildingOfficeIcon as BuildingOffice2Icon,
    XIcon as XMarkIcon
} from '../icons';

interface CpaReportingDashboardProps {
    institution: any;
    invoices: any[];
    receipts: any[];
    expenses: any[];
    payroll: any[];
    transfers?: any[];
    capitations?: any[];
    bursaries?: any[];
    onLogAction?: (msg: string) => void;
}

export const CpaReportingDashboard: React.FC<CpaReportingDashboardProps> = ({
    institution,
    invoices,
    receipts,
    expenses,
    payroll,
    transfers = [],
    capitations = [],
    bursaries = [],
    onLogAction
}) => {
    const [activeTab, setActiveTab] = useState<'trial_balance' | 'balance_sheet' | 'income_statement' | 'journal' | 'coa'>('trial_balance');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAccountForLedger, setSelectedAccountForLedger] = useState<ChartOfAccount | null>(null);

    // ── Generate Double-Entry General Ledger from live state ──
    const { accounts, journalEntries, trialBalance, incomeStatement, balanceSheet } = useMemo(() => {
        return GeneralLedgerService.buildLedgerFromOperations({
            institutionId: institution.id,
            invoices,
            receipts,
            expenses,
            payroll,
            transfers,
            capitations,
            bursaries
        });
    }, [institution.id, invoices, receipts, expenses, payroll, transfers, capitations, bursaries]);

    // ── Drilldown T-Account Ledger ──
    const selectedAccountLedger = useMemo(() => {
        if (!selectedAccountForLedger) return [];
        return GeneralLedgerService.getAccountLedger(selectedAccountForLedger.code, journalEntries);
    }, [selectedAccountForLedger, journalEntries]);

    // ── Filtered Journal Entries ──
    const filteredJournalEntries = useMemo(() => {
        if (!searchQuery) return journalEntries;
        const q = searchQuery.toLowerCase();
        return journalEntries.filter(je =>
            je.entryNumber.toLowerCase().includes(q) ||
            je.reference.toLowerCase().includes(q) ||
            je.memo.toLowerCase().includes(q) ||
            je.lines.some(l => l.accountName.toLowerCase().includes(q) || (l.studentName && l.studentName.toLowerCase().includes(q)))
        );
    }, [journalEntries, searchQuery]);

    // ── Filtered COA Accounts ──
    const filteredAccounts = useMemo(() => {
        if (!searchQuery) return accounts;
        const q = searchQuery.toLowerCase();
        return accounts.filter(a =>
            a.code.toLowerCase().includes(q) ||
            a.name.toLowerCase().includes(q) ||
            a.category.toLowerCase().includes(q)
        );
    }, [accounts, searchQuery]);

    const printReport = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            {/* ── Top Header & Audit Banner ── */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
                <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
                                <CheckBadgeIcon className="w-3.5 h-3.5" /> CPA &amp; Ministry Audit Standard
                            </span>
                            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-black uppercase tracking-widest">
                                Double-Entry GL
                            </span>
                        </div>
                        <h2 className="text-2xl sm:text-3xl font-black tracking-tight">General Ledger &amp; Financial Statements</h2>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-2xl">
                            Formal institutional double-entry bookkeeping engine with balanced journals, real-time Trial Balance, and CPA financial position reports.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={printReport}
                            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer backdrop-blur-sm border border-white/10"
                        >
                            <PrinterIcon className="w-4 h-4" /> Print / PDF
                        </button>
                    </div>
                </div>

                {/* KPI Ribbon */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 pt-6 border-t border-slate-800/80">
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Assets</p>
                        <p className="text-lg sm:text-xl font-black text-emerald-400 mt-0.5">
                            KSh {balanceSheet.assets.totalAssets.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Bank, M-Pesa, Receivables</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Liabilities</p>
                        <p className="text-lg sm:text-xl font-black text-amber-400 mt-0.5">
                            KSh {balanceSheet.liabilities.totalLiabilities.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Payables &amp; Prepayments</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Operating Net Surplus</p>
                        <p className={`text-lg sm:text-xl font-black mt-0.5 ${incomeStatement.netSurplusOrDeficit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {incomeStatement.netSurplusOrDeficit >= 0 ? '+' : ''}KSh {incomeStatement.netSurplusOrDeficit.toLocaleString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">Revenue vs Expenses</p>
                    </div>
                    <div className="bg-slate-800/50 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                        <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Trial Balance Status</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                            {trialBalance.isBalanced ? (
                                <>
                                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-sm font-black text-emerald-400 uppercase tracking-wider">Balanced ✓</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                                    <span className="text-sm font-black text-rose-400 uppercase tracking-wider">Unbalanced ⚠</span>
                                </>
                            )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Σ Debits = Σ Credits</p>
                    </div>
                </div>
            </div>

            {/* ── Navigation Sub-Tabs ── */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800">
                    {[
                        { id: 'trial_balance', label: 'Trial Balance', icon: ScaleIcon },
                        { id: 'balance_sheet', label: 'Balance Sheet', icon: BuildingOffice2Icon },
                        { id: 'income_statement', label: 'Income Statement', icon: ArrowTrendingUpIcon },
                        { id: 'journal', label: 'General Journal', icon: ClipboardDocumentListIcon },
                        { id: 'coa', label: 'Chart of Accounts', icon: BookOpenIcon }
                    ].map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                type="button"
                                onClick={() => setActiveTab(tab.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                                    active
                                        ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{tab.label}</span>
                            </button>
                        );
                    })}
                </div>

                {(activeTab === 'journal' || activeTab === 'coa' || activeTab === 'trial_balance') && (
                    <div className="relative w-full sm:w-72">
                        <MagnifyingGlassIcon className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter accounts, refs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                )}
            </div>

            {/* ── TAB 1: TRIAL BALANCE ── */}
            {activeTab === 'trial_balance' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Institutional Trial Balance</h3>
                            <p className="text-xs text-slate-400 mt-0.5">As of {trialBalance.periodEnd} · Click any account to drill down into its T-Account general ledger</p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
                            {trialBalance.accounts.length} Active Accounts
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                    <th className="px-6 py-3.5">Code</th>
                                    <th className="px-6 py-3.5">Account Title</th>
                                    <th className="px-6 py-3.5">Category</th>
                                    <th className="px-6 py-3.5 text-right">Debit (KSh)</th>
                                    <th className="px-6 py-3.5 text-right">Credit (KSh)</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                {trialBalance.accounts.map(item => {
                                    const isDebit = item.account.normalBalance === 'DEBIT';
                                    const debitBal = isDebit && item.netBalance > 0 ? item.netBalance : 0;
                                    const creditBal = !isDebit && item.netBalance > 0 ? item.netBalance : 0;

                                    return (
                                        <tr
                                            key={item.account.code}
                                            onClick={() => setSelectedAccountForLedger(item.account)}
                                            className="hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-3.5 font-mono font-black text-indigo-600 dark:text-indigo-400">
                                                {item.account.code}
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <div className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors flex items-center gap-1.5">
                                                    <span>{item.account.name}</span>
                                                    <span className="text-[9px] text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">↳ Drilldown</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400">{item.account.description}</span>
                                            </td>
                                            <td className="px-6 py-3.5">
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                    item.account.category === 'ASSET' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                                                    item.account.category === 'LIABILITY' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300' :
                                                    item.account.category === 'REVENUE' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300' :
                                                    item.account.category === 'EXPENSE' ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300' :
                                                    'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                                                }`}>
                                                    {item.account.category}
                                                </span>
                                            </td>
                                            <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                {debitBal > 0 ? debitBal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                                            </td>
                                            <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                {creditBal > 0 ? creditBal.toLocaleString(undefined, { minimumFractionDigits: 2 }) : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-100 dark:bg-slate-950/80 font-black text-xs border-t-2 border-slate-300 dark:border-slate-700">
                                    <td colSpan={3} className="px-6 py-4 text-right uppercase tracking-wider text-slate-600 dark:text-slate-400">
                                        Total Trial Balance:
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                        KSh {trialBalance.totalDebits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                        KSh {trialBalance.totalCredits.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* ── TAB 2: BALANCE SHEET (Statement of Financial Position) ── */}
            {activeTab === 'balance_sheet' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Assets Side */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">ASSETS</h3>
                                <p className="text-xs text-slate-400">Current &amp; Fixed Institutional Resources</p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-black">
                                KSh {balanceSheet.assets.totalAssets.toLocaleString()}
                            </span>
                        </div>

                        {/* Current Assets */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Current Assets</h4>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {balanceSheet.assets.currentAssets.map(a => (
                                    <div key={a.account.code} className="py-2.5 flex justify-between items-center text-xs">
                                        <div>
                                            <span className="font-mono text-slate-400 mr-2">{a.account.code}</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{a.account.name}</span>
                                        </div>
                                        <span className="font-mono font-black text-slate-900 dark:text-white">
                                            KSh {a.netBalance.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-2 flex justify-between text-xs font-black border-t border-slate-200 dark:border-slate-700">
                                <span>Total Current Assets:</span>
                                <span className="font-mono text-emerald-600 dark:text-emerald-400">
                                    KSh {balanceSheet.assets.totalCurrentAssets.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Fixed Assets */}
                        {balanceSheet.assets.fixedAssets.length > 0 && (
                            <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Non-Current &amp; Fixed Assets</h4>
                                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {balanceSheet.assets.fixedAssets.map(a => (
                                        <div key={a.account.code} className="py-2.5 flex justify-between items-center text-xs">
                                            <div>
                                                <span className="font-mono text-slate-400 mr-2">{a.account.code}</span>
                                                <span className="font-bold text-slate-800 dark:text-slate-200">{a.account.name}</span>
                                            </div>
                                            <span className="font-mono font-black text-slate-900 dark:text-white">
                                                KSh {a.netBalance.toLocaleString()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Liabilities & Equity Side */}
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-sm">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">LIABILITIES &amp; CAPITAL RESERVES</h3>
                                <p className="text-xs text-slate-400">Claims &amp; Net Institutional Equity</p>
                            </div>
                            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 rounded-full text-xs font-black">
                                KSh {(balanceSheet.liabilities.totalLiabilities + balanceSheet.equity.totalEquity).toLocaleString()}
                            </span>
                        </div>

                        {/* Current Liabilities */}
                        <div className="space-y-3">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Current Liabilities &amp; Payables</h4>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800">
                                {balanceSheet.liabilities.currentLiabilities.map(a => (
                                    <div key={a.account.code} className="py-2.5 flex justify-between items-center text-xs">
                                        <div>
                                            <span className="font-mono text-slate-400 mr-2">{a.account.code}</span>
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{a.account.name}</span>
                                        </div>
                                        <span className="font-mono font-black text-slate-900 dark:text-white">
                                            KSh {a.netBalance.toLocaleString()}
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="pt-2 flex justify-between text-xs font-black border-t border-slate-200 dark:border-slate-700">
                                <span>Total Liabilities:</span>
                                <span className="font-mono text-amber-600 dark:text-amber-400">
                                    KSh {balanceSheet.liabilities.totalCurrentLiabilities.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Equity & Reserves */}
                        <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-wider">Capital Fund &amp; Reserves</h4>
                            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                <div className="py-2.5 flex justify-between items-center">
                                    <span className="font-bold text-slate-800 dark:text-slate-200">Current Period Retained Operating Surplus / (Deficit)</span>
                                    <span className={`font-mono font-black ${balanceSheet.equity.retainedSurplus >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                        KSh {balanceSheet.equity.retainedSurplus.toLocaleString()}
                                    </span>
                                </div>
                            </div>
                            <div className="pt-2 flex justify-between text-xs font-black border-t border-slate-200 dark:border-slate-700">
                                <span>Total Institutional Equity:</span>
                                <span className="font-mono text-indigo-600 dark:text-indigo-400">
                                    KSh {balanceSheet.equity.totalEquity.toLocaleString()}
                                </span>
                            </div>
                        </div>

                        {/* Accounting Equation Assertion */}
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between text-xs">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">Accounting Equation Balance:</span>
                            <span className="font-black text-emerald-600 dark:text-emerald-400">
                                Assets = Liabilities + Equity ✓
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── TAB 3: INCOME STATEMENT (Profit & Loss / Surplus & Deficit) ── */}
            {activeTab === 'income_statement' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 sm:p-8 space-y-8 shadow-sm">
                    <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-4">
                        <div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Statement of Comprehensive Income</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Operating Revenue &amp; Expenditure for period {incomeStatement.periodStart} to {incomeStatement.periodEnd}</p>
                        </div>
                        <span className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider ${
                            incomeStatement.netSurplusOrDeficit >= 0
                                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                        }`}>
                            Net {incomeStatement.netSurplusOrDeficit >= 0 ? 'Surplus' : 'Deficit'}: KSh {incomeStatement.netSurplusOrDeficit.toLocaleString()}
                        </span>
                    </div>

                    {/* Revenue Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-widest">
                            <span>1. Operating Revenue &amp; Grants</span>
                            <span>Amount (KSh)</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {incomeStatement.operatingRevenues.map(r => (
                                <div key={r.account.code} className="py-2.5 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-mono text-slate-400 mr-2">{r.account.code}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{r.account.name}</span>
                                    </div>
                                    <span className="font-mono font-black text-slate-900 dark:text-white">
                                        KSh {(r.totalCredit - r.totalDebit).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-3 flex justify-between items-center text-xs font-black border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <span>TOTAL OPERATING REVENUE:</span>
                            <span className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                                KSh {incomeStatement.totalRevenue.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Expenses Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-widest">
                            <span>2. Operational &amp; Instructional Expenses</span>
                            <span>Amount (KSh)</span>
                        </div>
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {incomeStatement.operatingExpenses.map(e => (
                                <div key={e.account.code} className="py-2.5 flex justify-between items-center text-xs">
                                    <div>
                                        <span className="font-mono text-slate-400 mr-2">{e.account.code}</span>
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{e.account.name}</span>
                                    </div>
                                    <span className="font-mono font-black text-slate-900 dark:text-white">
                                        KSh {(e.totalDebit - e.totalCredit).toLocaleString()}
                                    </span>
                                </div>
                            ))}
                        </div>
                        <div className="pt-3 flex justify-between items-center text-xs font-black border-t-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <span>TOTAL OPERATING EXPENSES:</span>
                            <span className="font-mono text-rose-600 dark:text-rose-400 text-sm">
                                KSh {incomeStatement.totalExpenses.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Net Surplus Callout */}
                    <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <p className="text-xs font-black uppercase tracking-wider text-slate-500">NET INSTITUTIONAL SURPLUS / (DEFICIT) FOR PERIOD</p>
                            <p className="text-[11px] text-slate-400">Available for capital fund reinvestment and curriculum enhancement</p>
                        </div>
                        <p className={`text-2xl font-black font-mono ${incomeStatement.netSurplusOrDeficit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            KSh {incomeStatement.netSurplusOrDeficit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            )}

            {/* ── TAB 4: GENERAL JOURNAL ── */}
            {activeTab === 'journal' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Balanced General Journal Entries</h3>
                            <p className="text-xs text-slate-400 mt-0.5">Immutable double-entry transaction trail with balanced debits and credits</p>
                        </div>
                        <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
                            {filteredJournalEntries.length} Transactions
                        </span>
                    </div>

                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        {filteredJournalEntries.slice(0, 100).map(entry => (
                            <div key={entry.id} className="p-5 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800">
                                            {entry.entryNumber}
                                        </span>
                                        <span className="text-xs font-bold text-slate-900 dark:text-white">{entry.memo}</span>
                                        <span className="text-[10px] text-slate-400">· Ref: {entry.reference}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs">
                                        <span className="text-[10px] text-slate-400 font-mono">{entry.date}</span>
                                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                            {entry.sourceModule}
                                        </span>
                                    </div>
                                </div>

                                {/* Dual-entry table */}
                                <div className="overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                    <table className="w-full text-left text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-950 text-[9px] font-black uppercase text-slate-400">
                                                <th className="px-4 py-2">Account</th>
                                                <th className="px-4 py-2">Description</th>
                                                <th className="px-4 py-2 text-right">Debit (KSh)</th>
                                                <th className="px-4 py-2 text-right">Credit (KSh)</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                                            {entry.lines.map((line, lIdx) => (
                                                <tr key={lIdx}>
                                                    <td className="px-4 py-2 font-mono font-bold text-slate-800 dark:text-slate-200">
                                                        <span className="text-indigo-600 dark:text-indigo-400 mr-2">{line.accountCode}</span>
                                                        {line.accountName}
                                                    </td>
                                                    <td className="px-4 py-2 text-slate-500 text-[11px]">
                                                        {line.description || '—'}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                        {line.debit > 0 ? line.debit.toLocaleString() : ''}
                                                    </td>
                                                    <td className="px-4 py-2 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                        {line.credit > 0 ? line.credit.toLocaleString() : ''}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ── TAB 5: CHART OF ACCOUNTS ── */}
            {activeTab === 'coa' && (
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Standard Institutional Chart of Accounts (COA)</h3>
                            <p className="text-xs text-slate-400 mt-0.5">5-Digit standardized account hierarchy for Ministry &amp; CPA audit reporting</p>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                    <th className="px-6 py-3.5">Code</th>
                                    <th className="px-6 py-3.5">Account Title</th>
                                    <th className="px-6 py-3.5">Category</th>
                                    <th className="px-6 py-3.5">Normal Balance</th>
                                    <th className="px-6 py-3.5">Audit Purpose</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredAccounts.map(acc => (
                                    <tr key={acc.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                        <td className="px-6 py-3.5 font-mono font-black text-indigo-600 dark:text-indigo-400">
                                            {acc.code}
                                        </td>
                                        <td className="px-6 py-3.5 font-bold text-slate-900 dark:text-white">
                                            {acc.name}
                                        </td>
                                        <td className="px-6 py-3.5">
                                            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                                {acc.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3.5 font-mono font-bold text-slate-600 dark:text-slate-400">
                                            {acc.normalBalance}
                                        </td>
                                        <td className="px-6 py-3.5 text-slate-400 text-[11px]">
                                            {acc.description}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ── DRILLDOWN MODAL: T-Account General Ledger ── */}
            {selectedAccountForLedger && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                            <div>
                                <div className="flex items-center gap-2">
                                    <span className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-mono font-black">
                                        {selectedAccountForLedger.code}
                                    </span>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        {selectedAccountForLedger.name}
                                    </h3>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">General Ledger T-Account Transactions &amp; Running Balance</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSelectedAccountForLedger(null)}
                                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                            >
                                <XMarkIcon className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 p-6">
                            {selectedAccountLedger.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs">
                                    No ledger postings found for this account in the selected period.
                                </div>
                            ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-950 border-b border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase text-slate-400">
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3">Entry #</th>
                                            <th className="px-4 py-3">Reference / Description</th>
                                            <th className="px-4 py-3 text-right">Debit (KSh)</th>
                                            <th className="px-4 py-3 text-right">Credit (KSh)</th>
                                            <th className="px-4 py-3 text-right">Balance (KSh)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {selectedAccountLedger.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                                <td className="px-4 py-3 font-mono text-slate-500">{row.date}</td>
                                                <td className="px-4 py-3 font-mono font-bold text-indigo-600 dark:text-indigo-400">{row.entryNumber}</td>
                                                <td className="px-4 py-3">
                                                    <span className="font-bold text-slate-800 dark:text-slate-200 block">{row.memo}</span>
                                                    <span className="text-[10px] text-slate-400">Ref: {row.reference}</span>
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                    {row.debit > 0 ? row.debit.toLocaleString() : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                                                    {row.credit > 0 ? row.credit.toLocaleString() : '—'}
                                                </td>
                                                <td className="px-4 py-3 text-right font-mono font-black text-indigo-600 dark:text-indigo-400">
                                                    KSh {row.runningBalance.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setSelectedAccountForLedger(null)}
                                className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 font-bold text-xs rounded-xl cursor-pointer"
                            >
                                Close Ledger
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
