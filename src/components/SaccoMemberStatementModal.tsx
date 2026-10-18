import React, { useState, useMemo } from 'react';
import { 
    X, 
    Printer, 
    Download, 
    User, 
    Truck, 
    Phone, 
    Calendar, 
    PiggyBank, 
    Shield, 
    Coins, 
    Wallet, 
    Clock3, 
    CheckCircle2, 
    AlertCircle, 
    ArrowDownRight, 
    ArrowUpRight, 
    FileText, 
    Search,
    Landmark
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { 
    Institution, 
    TransportSaccoAccount, 
    TransportSaccoTransaction, 
    SaccoDailyRemittanceRecord 
} from '../types';

export interface SaccoMemberStatementModalProps {
    isOpen: boolean;
    onClose: () => void;
    memberAccount: TransportSaccoAccount | null;
    allMembers: TransportSaccoAccount[];
    onSelectMember: (account: TransportSaccoAccount) => void;
    transactions: TransportSaccoTransaction[];
    remittanceRecords: SaccoDailyRemittanceRecord[];
    currentInstitution: Institution;
    brandingLogo?: string;
    brandingLetterhead?: string;
    brandingFooter?: string;
    brandingFooterText?: string;
    brandingTagline?: string;
    brandingStampMode?: 'system' | 'custom' | 'none';
    brandingStampUrl?: string;
}

export const SaccoMemberStatementModal: React.FC<SaccoMemberStatementModalProps> = ({
    isOpen,
    onClose,
    memberAccount,
    allMembers,
    onSelectMember,
    transactions,
    remittanceRecords,
    currentInstitution,
    brandingLogo,
    brandingLetterhead,
    brandingFooter,
    brandingFooterText,
    brandingTagline,
    brandingStampMode = 'system',
    brandingStampUrl
}) => {
    const [dateRangeFilter, setDateRangeFilter] = useState<'30' | '90' | 'year' | 'all' | 'custom'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [searchMemberQuery, setSearchMemberQuery] = useState('');

    if (!isOpen || !memberAccount) return null;

    // Filter members for the quick-switcher search
    const filteredMembers = useMemo(() => {
        if (!searchMemberQuery) return allMembers;
        const q = searchMemberQuery.toLowerCase();
        return allMembers.filter(m => 
            m.memberName.toLowerCase().includes(q) ||
            m.memberNumber.toLowerCase().includes(q) ||
            (m.vehiclePlate || '').toLowerCase().includes(q) ||
            (m.phoneNumber || '').toLowerCase().includes(q)
        );
    }, [allMembers, searchMemberQuery]);

    // Compute date cutoff based on filter
    const now = new Date();
    let minDate: Date | null = null;
    let maxDate: Date | null = null;

    if (dateRangeFilter === '30') {
        minDate = new Date();
        minDate.setDate(minDate.getDate() - 30);
    } else if (dateRangeFilter === '90') {
        minDate = new Date();
        minDate.setDate(minDate.getDate() - 90);
    } else if (dateRangeFilter === 'year') {
        minDate = new Date(now.getFullYear(), 0, 1);
    } else if (dateRangeFilter === 'custom') {
        if (startDate) minDate = new Date(startDate);
        if (endDate) {
            maxDate = new Date(endDate);
            maxDate.setHours(23, 59, 59, 999);
        }
    }

    // Consolidated Statement Ledger for this member
    const statementLedger = useMemo(() => {
        const ledgerItems: Array<{
            id: string;
            date: string;
            timestamp: number;
            type: 'deposit' | 'remittance' | 'penalty' | 'withdrawal' | 'welfare' | 'sinking';
            category: string;
            description: string;
            reference: string;
            debit: number;
            credit: number;
            runningBalance?: number;
        }> = [];

        // 1. Ingest Sacco Transactions
        transactions.forEach(tx => {
            const isMatch = tx.accountId === memberAccount.id || 
                (tx.vehiclePlate && memberAccount.vehiclePlate && tx.vehiclePlate.toLowerCase() === memberAccount.vehiclePlate.toLowerCase());
            if (!isMatch) return;

            const txDate = tx.recordedAt ? new Date(tx.recordedAt) : new Date();
            const timeMs = txDate.getTime();

            // Date filtering
            if (minDate && timeMs < minDate.getTime()) return;
            if (maxDate && timeMs > maxDate.getTime()) return;

            const isWithdrawal = tx.transactionType === 'withdrawal' || tx.transactionType === 'welfare_claim';
            const cat = tx.savingsCategory || 'Member Savings';

            ledgerItems.push({
                id: tx.id,
                date: txDate.toISOString().split('T')[0],
                timestamp: timeMs,
                type: isWithdrawal ? 'withdrawal' : cat === 'Daily Sinking Fund' ? 'sinking' : cat === 'Welfare & Emergency' ? 'welfare' : 'deposit',
                category: cat,
                description: tx.notes || `${cat} - ${tx.transactionType.toUpperCase()}`,
                reference: tx.reference || 'Auto-Ref',
                debit: isWithdrawal ? tx.amount : 0,
                credit: !isWithdrawal ? tx.amount : 0
            });
        });

        // 2. Ingest Remittance Records
        remittanceRecords.forEach(rem => {
            const isMatch = rem.accountId === memberAccount.id || 
                (rem.vehiclePlate && memberAccount.vehiclePlate && rem.vehiclePlate.toLowerCase() === memberAccount.vehiclePlate.toLowerCase());
            if (!isMatch) return;

            const remDate = rem.scheduledDate ? new Date(rem.scheduledDate) : new Date(rem.timestamp || Date.now());
            const timeMs = remDate.getTime();

            if (minDate && timeMs < minDate.getTime()) return;
            if (maxDate && timeMs > maxDate.getTime()) return;

            // Credit for payment made
            if ((rem.paidAmount || 0) > 0) {
                ledgerItems.push({
                    id: `${rem.id}_paid`,
                    date: rem.scheduledDate,
                    timestamp: timeMs,
                    type: 'remittance',
                    category: 'Daily Remittance Check-Off',
                    description: `Daily Check-off (Target: KES ${(rem.targetAmount || 0).toLocaleString()})`,
                    reference: rem.mpesaCode || rem.paymentMethod || 'Stage Cash',
                    debit: 0,
                    credit: rem.paidAmount || 0
                });
            }

            // Debit for penalties if incurred
            if ((rem.penaltyAmount || 0) > 0) {
                ledgerItems.push({
                    id: `${rem.id}_pen`,
                    date: rem.scheduledDate,
                    timestamp: timeMs + 10,
                    type: 'penalty',
                    category: 'Late Remittance Surcharge',
                    description: `Shortfall Penalty (Due: ${rem.scheduledDate})`,
                    reference: 'SYSTEM-PENALTY',
                    debit: rem.penaltyAmount || 0,
                    credit: 0
                });
            }
        });

        // Category filter
        const categoryFiltered = ledgerItems.filter(item => {
            if (categoryFilter === 'ALL') return true;
            if (categoryFilter === 'remittance') return item.type === 'remittance' || item.type === 'penalty';
            if (categoryFilter === 'savings') return item.type === 'deposit' && item.category.includes('Savings');
            if (categoryFilter === 'sinking') return item.type === 'sinking' || item.category.includes('Sinking');
            if (categoryFilter === 'welfare') return item.type === 'welfare' || item.category.includes('Welfare');
            return true;
        });

        // Sort chronologically ascending to compute running balance
        categoryFiltered.sort((a, b) => a.timestamp - b.timestamp);

        let running = 0;
        categoryFiltered.forEach(item => {
            running += (item.credit - item.debit);
            item.runningBalance = running;
        });

        // Return descending for presentation (latest first)
        return [...categoryFiltered].reverse();
    }, [transactions, remittanceRecords, memberAccount, minDate, maxDate, categoryFilter]);

    // Financial Totals for Member
    const shareCapital = memberAccount.shareCapital || 0;
    const savingsBalance = memberAccount.savingsBalance || 0;
    const sinkingFundBalance = (memberAccount as any).sinkingFundBalance || 0;
    const welfareBalance = memberAccount.welfareBalance || 0;
    const totalConsolidatedEquity = shareCapital + savingsBalance + sinkingFundBalance + welfareBalance;
    const loanEligibility = savingsBalance * 3;

    // Period Totals from Ledger
    const totalCreditsInPeriod = statementLedger.reduce((sum, item) => sum + item.credit, 0);
    const totalDebitsInPeriod = statementLedger.reduce((sum, item) => sum + item.debit, 0);
    const netCashflowInPeriod = totalCreditsInPeriod - totalDebitsInPeriod;

    // Export Excel Handler
    const handleExportExcel = () => {
        const rows = statementLedger.map((item, idx) => ({
            '#': idx + 1,
            'Date': item.date,
            'Transaction Ref': item.reference,
            'Category': item.category,
            'Description': item.description,
            'Debit / Surcharge (KES)': item.debit || 0,
            'Credit / Inflow (KES)': item.credit || 0,
            'Cumulative Balance (KES)': item.runningBalance || 0
        }));

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Member Statement');
        
        // Append Summary Sheet
        const summaryData = [
            { 'Item': 'Member Number', 'Detail': memberAccount.memberNumber },
            { 'Item': 'Member Name', 'Detail': memberAccount.memberName },
            { 'Item': 'Role', 'Detail': memberAccount.memberRole },
            { 'Item': 'Vehicle Plate', 'Detail': memberAccount.vehiclePlate || 'Unassigned' },
            { 'Item': 'Phone Number', 'Detail': memberAccount.phoneNumber },
            { 'Item': 'Remittance Tier', 'Detail': memberAccount.remittanceTier || 'Silver' },
            { 'Item': 'Daily Target (KES)', 'Detail': memberAccount.dailyTarget || 1500 },
            { 'Item': 'Share Capital (KES)', 'Detail': shareCapital },
            { 'Item': 'Voluntary Savings (KES)', 'Detail': savingsBalance },
            { 'Item': 'Sinking Fund Reserve (KES)', 'Detail': sinkingFundBalance },
            { 'Item': 'Welfare Pool (KES)', 'Detail': welfareBalance },
            { 'Item': 'Total Consolidated Equity (KES)', 'Detail': totalConsolidatedEquity },
            { 'Item': '3x Loan Borrowing Limit (KES)', 'Detail': loanEligibility },
            { 'Item': 'Statement Generated', 'Detail': new Date().toLocaleString() }
        ];
        const wsSummary = XLSX.utils.json_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Member Profile');

        const cleanName = memberAccount.memberName.replace(/[^a-zA-Z0-9]/g, '_');
        XLSX.writeFile(wb, `SACCO_Statement_${memberAccount.memberNumber}_${cleanName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
            <style>{`
                @media print {
                    body * {
                        visibility: hidden !important;
                    }
                    #sacco-statement-print-sheet, #sacco-statement-print-sheet * {
                        visibility: visible !important;
                    }
                    #sacco-statement-print-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 10mm 12mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        background: white !important;
                    }
                }
            `}</style>

            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Modal Header & Quick Member Switcher */}
                <div className="p-4 sm:p-6 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-600/30">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Member Account Statement
                                </h2>
                                <span className="px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                    Official SACCO Record
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 font-bold">
                                {memberAccount.memberName} • {memberAccount.memberNumber} • {memberAccount.memberRole}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Member Dropdown Switcher */}
                        <div className="relative">
                            <select
                                value={memberAccount.id}
                                onChange={e => {
                                    const target = allMembers.find(m => m.id === e.target.value);
                                    if (target) onSelectMember(target);
                                }}
                                className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-sm"
                            >
                                {allMembers.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.memberName} ({m.memberRole} - {m.vehiclePlate || m.memberNumber})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Export Buttons */}
                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 hover:bg-emerald-100 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                            title="Export statement as Excel spreadsheet"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Excel</span>
                        </button>

                        <button
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/20"
                            title="Print or save as official PDF statement"
                        >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Print / PDF</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filter Controls Bar */}
                <div className="p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[10px] font-black uppercase text-slate-400 mr-1">Period:</span>
                        {[
                            { id: 'all', label: 'All Time' },
                            { id: '30', label: 'Last 30 Days' },
                            { id: '90', label: 'Last 90 Days' },
                            { id: 'year', label: 'This Year' },
                            { id: 'custom', label: 'Custom' }
                        ].map(t => (
                            <button
                                key={t.id}
                                onClick={() => setDateRangeFilter(t.id as any)}
                                className={`px-3 py-1.5 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all ${
                                    dateRangeFilter === t.id
                                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-sm'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {dateRangeFilter === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={startDate}
                                onChange={e => setStartDate(e.target.value)}
                                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                            />
                            <span className="text-slate-400 font-bold">to</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={e => setEndDate(e.target.value)}
                                className="px-2.5 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                            />
                        </div>
                    )}

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Scheme:</span>
                        <select
                            value={categoryFilter}
                            onChange={e => setCategoryFilter(e.target.value)}
                            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none"
                        >
                            <option value="ALL">All Schemes & Remittances</option>
                            <option value="savings">Member Voluntary Savings</option>
                            <option value="sinking">Daily Sinking Fund</option>
                            <option value="remittance">Daily Check-Off Remittances</option>
                            <option value="welfare">Welfare & Benevolent Pool</option>
                        </select>
                    </div>
                </div>

                {/* Printable Document Sheet View */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 dark:bg-slate-950/40">
                    <div 
                        id="sacco-statement-print-sheet" 
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-sm space-y-8 max-w-4xl mx-auto"
                    >
                        {/* Letterhead Header Banner */}
                        {brandingLetterhead ? (
                            <img
                                src={brandingLetterhead}
                                alt="Official Letterhead Header"
                                className="w-full max-h-32 object-contain mx-auto"
                            />
                        ) : (
                            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6">
                                <div className="flex items-center gap-4">
                                    {brandingLogo && (
                                        <img src={brandingLogo} alt="Logo" className="w-16 h-16 object-contain rounded-2xl" />
                                    )}
                                    <div>
                                        <h1 className="text-xl sm:text-2xl font-black uppercase text-slate-900 tracking-tight">
                                            {currentInstitution.name}
                                        </h1>
                                        <p className="text-xs font-bold text-slate-600">
                                            {brandingTagline || (currentInstitution as any).tagline || 'Transport SACCO & Savings Society'}
                                        </p>
                                        <p className="text-[10px] text-slate-500 mt-1">
                                            {currentInstitution.address || 'NTSA Registered Transport Sacco'} • Tel: {currentInstitution.phoneNumber || currentInstitution.phone || 'N/A'} • Email: {currentInstitution.email || 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="inline-block px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-900 text-[10px] font-black uppercase tracking-wider rounded-lg">
                                        Official Member Statement
                                    </span>
                                    <p className="text-[10px] font-mono text-slate-400 mt-1">
                                        Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Statement Title Strip */}
                        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-4">
                            <div>
                                <h2 className="text-base font-black uppercase tracking-wider text-slate-900">
                                    Member Thrift, Sinking Fund &amp; Remittance Ledger
                                </h2>
                                <p className="text-xs text-slate-500">
                                    Statement Period: {dateRangeFilter === '30' ? 'Last 30 Days' : dateRangeFilter === '90' ? 'Last 90 Days' : dateRangeFilter === 'year' ? 'Year to Date' : 'All Historical Records'}
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="text-xs font-bold text-slate-400">Account Status: </span>
                                <span className="text-xs font-black uppercase text-emerald-600">
                                    {memberAccount.status || 'Active Member'}
                                </span>
                            </div>
                        </div>

                        {/* Member Profile Grid */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Member Name</span>
                                <span className="font-black text-slate-900 uppercase text-sm">{memberAccount.memberName}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Member Number</span>
                                <span className="font-mono font-black text-indigo-700 text-sm">{memberAccount.memberNumber}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Designated Role</span>
                                <span className="font-black text-slate-800 uppercase px-2 py-0.5 rounded bg-white border border-slate-200 inline-block text-[11px] mt-0.5">
                                    {memberAccount.memberRole}
                                </span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Vehicle</span>
                                <span className="font-mono font-black text-slate-900 text-sm">{memberAccount.vehiclePlate || 'Unassigned'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Phone Contact</span>
                                <span className="font-bold text-slate-700">{memberAccount.phoneNumber || 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Remittance Tier</span>
                                <span className="font-black text-slate-800">{memberAccount.remittanceTier || 'Silver'}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Daily Target</span>
                                <span className="font-mono font-bold text-slate-800">KES {(memberAccount.dailyTarget || 1500).toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase text-slate-400 block">Member Since</span>
                                <span className="font-medium text-slate-700">{memberAccount.joinedDate || 'Standard Registration'}</span>
                            </div>
                        </div>

                        {/* Balances Summary Cards */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-100">
                                <span className="text-[9px] font-black uppercase text-indigo-700 block">Total Member Equity</span>
                                <span className="text-xl font-black text-indigo-950 font-mono">KES {totalConsolidatedEquity.toLocaleString()}</span>
                                <span className="text-[9px] text-indigo-600 block mt-1 font-medium">All ring-fenced funds</span>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[9px] font-black uppercase text-slate-500 block">Voluntary Savings</span>
                                <span className="text-xl font-black text-indigo-700 font-mono">KES {savingsBalance.toLocaleString()}</span>
                                <span className="text-[9px] text-slate-400 block mt-1 font-medium">Dividend-earning deposit</span>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[9px] font-black uppercase text-slate-500 block">Sinking Fund Reserve</span>
                                <span className="text-xl font-black text-emerald-700 font-mono">KES {sinkingFundBalance.toLocaleString()}</span>
                                <span className="text-[9px] text-emerald-600 block mt-1 font-medium">Maintenance & tires</span>
                            </div>

                            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                                <span className="text-[9px] font-black uppercase text-slate-500 block">Loan Ceiling (3x)</span>
                                <span className="text-xl font-black text-slate-900 font-mono">KES {loanEligibility.toLocaleString()}</span>
                                <span className="text-[9px] text-slate-500 block mt-1 font-medium">Based on savings balance</span>
                            </div>
                        </div>

                        {/* Sub-schemes row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Share Capital</span>
                                <span className="font-mono font-black text-slate-800">KES {shareCapital.toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Welfare &amp; Benevolent</span>
                                <span className="font-mono font-black text-amber-700">KES {welfareBalance.toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Period Inflows (Credits)</span>
                                <span className="font-mono font-black text-emerald-700">KES {totalCreditsInPeriod.toLocaleString()}</span>
                            </div>
                            <div className="p-3 bg-white border border-slate-200 rounded-lg">
                                <span className="text-[9px] font-bold uppercase text-slate-400 block">Period Debits (Outflows)</span>
                                <span className="font-mono font-black text-rose-700">KES {totalDebitsInPeriod.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* Detailed Chronological Statement Table */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                Chronological Transaction &amp; Remittance Activity
                            </h3>
                            <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                <table className="w-full text-left text-xs border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase text-slate-500">
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Reference / Code</th>
                                            <th className="p-3">Scheme / Category</th>
                                            <th className="p-3">Description</th>
                                            <th className="p-3 text-right">Debit (KES)</th>
                                            <th className="p-3 text-right">Credit (KES)</th>
                                            <th className="p-3 text-right">Balance (KES)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-medium">
                                        {statementLedger.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-8 text-center text-slate-400 font-bold">
                                                    No transaction or remittance activity recorded for this member in the selected period.
                                                </td>
                                            </tr>
                                        ) : (
                                            statementLedger.map((row) => (
                                                <tr key={row.id} className="hover:bg-slate-50/60">
                                                    <td className="p-3 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                                                        {row.date}
                                                    </td>
                                                    <td className="p-3 font-mono font-bold text-slate-800 text-[11px] whitespace-nowrap">
                                                        {row.reference}
                                                    </td>
                                                    <td className="p-3">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                            row.type === 'remittance' ? 'bg-indigo-50 text-indigo-700' :
                                                            row.type === 'sinking' ? 'bg-emerald-50 text-emerald-700' :
                                                            row.type === 'welfare' ? 'bg-amber-50 text-amber-700' :
                                                            row.type === 'penalty' ? 'bg-rose-50 text-rose-700' :
                                                            'bg-slate-100 text-slate-700'
                                                        }`}>
                                                            {row.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-3 text-slate-700 text-xs">
                                                        {row.description}
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                                                        {row.debit > 0 ? `KES ${row.debit.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                                                        {row.credit > 0 ? `KES ${row.credit.toLocaleString()}` : '-'}
                                                    </td>
                                                    <td className="p-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                                                        KES {(row.runningBalance || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures & Certification Area */}
                        <div className="pt-8 border-t border-slate-200 flex justify-between items-end gap-6 text-xs">
                            <div className="space-y-6 flex-1 max-w-md">
                                <div>
                                    <div className="border-b border-slate-400 pb-1 h-8"></div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mt-1">
                                        Certified By: Head of SACCO Operations / Treasurer
                                    </p>
                                </div>
                                <div>
                                    <div className="border-b border-slate-400 pb-1 h-8"></div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600 mt-1">
                                        Member Acknowledgment / Acceptance Signature
                                    </p>
                                </div>
                            </div>

                            {/* Verification Seal */}
                            <div className="shrink-0 flex flex-col items-center justify-center">
                                {brandingStampMode === 'custom' && brandingStampUrl ? (
                                    <div className="relative -rotate-6 transition-transform">
                                        <img
                                            src={brandingStampUrl}
                                            alt="Official Seal"
                                            className="w-24 h-24 object-contain drop-shadow"
                                        />
                                    </div>
                                ) : brandingStampMode === 'system' ? (
                                    <div className="relative w-24 h-24 rounded-full border-2 border-indigo-700 text-indigo-700 flex flex-col items-center justify-center text-center p-1 -rotate-6 select-none bg-indigo-50/40">
                                        <div className="w-20 h-20 rounded-full border border-dashed border-indigo-500 flex flex-col items-center justify-center">
                                            <span className="text-[7px] font-black uppercase tracking-tighter">OFFICIAL SEAL</span>
                                            <span className="text-[9px] font-black uppercase tracking-tight text-indigo-900 leading-none my-0.5">VERIFIED</span>
                                            <span className="text-[6px] font-bold tracking-widest">{new Date().getFullYear()} NTSA REG</span>
                                        </div>
                                    </div>
                                ) : null}
                                <span className="text-[8px] font-mono text-slate-400 mt-1">Certified Official</span>
                            </div>
                        </div>

                        {/* Document Footer & Disclaimer */}
                        <div className="pt-4 border-t border-slate-200 text-center space-y-1">
                            {brandingFooter && (
                                <img
                                    src={brandingFooter}
                                    alt="Footer Banner"
                                    className="w-full max-h-16 object-contain mx-auto mb-2"
                                />
                            )}
                            <p className="text-[9px] text-slate-500 uppercase tracking-widest font-bold">
                                {brandingFooterText || `${currentInstitution.name} • Official SACCO Thrift, Sinking Fund & Remittance Statement • Regulated by NTSA / SASRA`}
                            </p>
                            <p className="text-[8px] text-slate-400 font-mono">
                                This computer-generated statement is issued without alteration. Inquiries must be logged within 14 days of issue date.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
