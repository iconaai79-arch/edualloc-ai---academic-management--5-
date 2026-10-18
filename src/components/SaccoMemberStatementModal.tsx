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
    CheckCircle2, 
    FileText, 
    Search,
    Landmark,
    ZoomIn,
    ZoomOut,
    Maximize2,
    Eye,
    Table as TableIcon
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
    // View mode: 'a4_preview' (true paper sheet) vs 'ledger_table' (responsive list)
    const [viewMode, setViewMode] = useState<'a4_preview' | 'ledger_table'>('a4_preview');
    // Zoom scale for A4 paper preview: 0.75, 0.85, 1.0, 1.15
    const [zoomScale, setZoomScale] = useState<number>(1.0);

    const [dateRangeFilter, setDateRangeFilter] = useState<'30' | '90' | 'year' | 'all' | 'custom'>('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
    const [searchMemberQuery, setSearchMemberQuery] = useState('');

    if (!isOpen || !memberAccount) return null;

    // Resolve Letterhead & Branding assets with institutional fallbacks
    const letterheadImage = brandingLetterhead || currentInstitution.letterheadUrl || (currentInstitution as any).letterhead_url;
    const logoImage = brandingLogo || currentInstitution.logoUrl || (currentInstitution as any).logo_url;
    const stampImage = brandingStampUrl || currentInstitution.stampUrl || currentInstitution.sealUrl || (currentInstitution as any).stamp_url;
    const signatureImage = currentInstitution.signatureUrl || (currentInstitution as any).signature_url;

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

    // Filter member transactions & remittances
    const memberTransactions = useMemo(() => {
        return transactions.filter(t => t.accountId === memberAccount.id);
    }, [transactions, memberAccount.id]);

    const memberRemittances = useMemo(() => {
        const plate = (memberAccount.vehiclePlate || '').trim().toLowerCase();
        const driver = (memberAccount.memberName || '').trim().toLowerCase();
        return remittanceRecords.filter(r => {
            const rPlate = (r.vehiclePlate || '').trim().toLowerCase();
            const rDriver = (r.driverName || '').trim().toLowerCase();
            return (plate && rPlate === plate) || (driver && rDriver.includes(driver));
        });
    }, [remittanceRecords, memberAccount.vehiclePlate, memberAccount.memberName]);

    // Build unified chronological ledger entries
    interface LedgerRow {
        id: string;
        date: string;
        timestamp: number;
        category: string;
        type: 'savings' | 'sinking' | 'remittance' | 'welfare' | 'penalty' | 'other';
        description: string;
        reference: string;
        debit: number;
        credit: number;
        runningBalance?: number;
    }

    const statementLedger = useMemo(() => {
        const rows: LedgerRow[] = [];

        // 1. Transactions from SACCO accounts
        memberTransactions.forEach(t => {
            const txDate = new Date(t.recordedAt);
            if (minDate && txDate < minDate) return;
            if (maxDate && txDate > maxDate) return;

            const isDeposit = t.transactionType === 'deposit' || t.transactionType === 'dividend';
            const cat = t.savingsCategory;

            if (categoryFilter !== 'ALL') {
                if (categoryFilter === 'savings' && cat !== 'savings' && cat !== 'share_capital') return;
                if (categoryFilter === 'sinking' && cat !== 'sinking_fund') return;
                if (categoryFilter === 'welfare' && cat !== 'welfare') return;
                if (categoryFilter === 'remittance') return;
            }

            rows.push({
                id: t.id,
                date: txDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                timestamp: txDate.getTime(),
                category: cat === 'savings' ? 'Voluntary Savings' :
                          cat === 'sinking_fund' ? 'Sinking Fund' :
                          cat === 'share_capital' ? 'Share Capital' :
                          cat === 'welfare' ? 'Welfare & Emergency' : 'General Sacco',
                type: cat === 'sinking_fund' ? 'sinking' : cat === 'welfare' ? 'welfare' : 'savings',
                description: `${isDeposit ? 'Deposit' : 'Withdrawal'} via ${(t.reference || 'Sacco Check-Off')}`,
                reference: t.reference || 'CHECK-OFF',
                debit: isDeposit ? 0 : t.amount,
                credit: isDeposit ? t.amount : 0
            });
        });

        // 2. Remittances check-offs
        if (categoryFilter === 'ALL' || categoryFilter === 'remittance') {
            memberRemittances.forEach(r => {
                const rDate = new Date(r.scheduledDate);
                if (minDate && rDate < minDate) return;
                if (maxDate && rDate > maxDate) return;

                if (r.paidAmount > 0) {
                    rows.push({
                        id: `remit-${r.id}`,
                        date: rDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                        timestamp: rDate.getTime(),
                        category: 'Daily Remittance',
                        type: 'remittance',
                        description: `Daily Check-off remittance (${r.vehiclePlate}) - Target KES ${r.targetAmount.toLocaleString()}`,
                        reference: r.mpesaCode || (r.paymentMethod ? r.paymentMethod.toUpperCase() : 'CASH-STAGE'),
                        debit: 0,
                        credit: r.paidAmount
                    });
                }

                if (r.penaltyAmount > 0) {
                    rows.push({
                        id: `pen-${r.id}`,
                        date: rDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                        timestamp: rDate.getTime() + 1000,
                        category: 'Remittance Penalty',
                        type: 'penalty',
                        description: `Late check-off penalty fee (${r.penaltyReason || 'Past remittance cutoff'})`,
                        reference: `PEN-${r.vehiclePlate}`,
                        debit: r.penaltyAmount,
                        credit: 0
                    });
                }
            });
        }

        // Sort ascending chronologically
        rows.sort((a, b) => a.timestamp - b.timestamp);

        // Calculate running balance
        let balance = 0;
        return rows.map(r => {
            balance += (r.credit - r.debit);
            return {
                ...r,
                runningBalance: balance
            };
        });
    }, [memberTransactions, memberRemittances, minDate, maxDate, categoryFilter]);

    // Financial totals
    const totalCredits = useMemo(() => statementLedger.reduce((sum, r) => sum + r.credit, 0), [statementLedger]);
    const totalDebits = useMemo(() => statementLedger.reduce((sum, r) => sum + r.debit, 0), [statementLedger]);
    const netLedgerMovement = totalCredits - totalDebits;

    const sinkingFundBalance = Number((memberAccount as any).sinkingFundBalance || 0);
    const totalMemberEquity = memberAccount.savingsBalance + memberAccount.shareCapital + memberAccount.welfareBalance + sinkingFundBalance;
    const loanCeiling = memberAccount.savingsBalance * 3;
    const statementRef = `STMT-${new Date().getFullYear()}-${memberAccount.memberNumber.replace(/[^a-zA-Z0-9]/g, '')}`;

    // One-click Print/PDF
    const handlePrint = () => {
        window.print();
    };

    // One-click Excel Export
    const handleExportExcel = () => {
        const exportData = statementLedger.map(r => ({
            'Date': r.date,
            'Reference / Code': r.reference,
            'Scheme Category': r.category,
            'Description': r.description,
            'Debit (KES)': r.debit,
            'Credit (KES)': r.credit,
            'Running Balance (KES)': r.runningBalance || 0
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Member Statement');
        XLSX.writeFile(wb, `Statement_${memberAccount.memberNumber}_${memberAccount.memberName.replace(/\s+/g, '_')}.xlsx`);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md overflow-hidden p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto">
            {/* Embedded Print Styles for flawless A4 output */}
            <style>{`
                @media print {
                    @page {
                        size: A4 portrait;
                        margin: 8mm 10mm 10mm 10mm;
                    }
                    html, body {
                        background: white !important;
                        color: black !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    body * {
                        visibility: hidden !important;
                    }
                    #sacco-statement-a4-sheet, #sacco-statement-a4-sheet * {
                        visibility: visible !important;
                    }
                    #sacco-statement-a4-sheet {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: auto !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                        color: black !important;
                        transform: none !important;
                    }
                    .no-print {
                        display: none !important;
                    }
                    tr {
                        page-break-inside: avoid !important;
                    }
                }
            `}</style>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-7xl max-h-[96vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 print:border-none print:shadow-none print:max-w-none print:max-h-none print:w-full print:rounded-none">
                
                {/* Modal Top Control Bar (Hidden on Print) */}
                <div className="no-print p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                            <FileText className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                                    Official SACCO Account Statement
                                </h3>
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    A4 Letterhead Standard
                                </span>
                            </div>
                            <p className="text-xs text-slate-400">
                                Member: <span className="font-bold text-white">{memberAccount.memberName}</span> ({memberAccount.memberNumber}) • Role: <span className="text-amber-400 font-bold">{memberAccount.memberRole}</span> • Plate: <span className="font-mono text-emerald-400 font-bold">{memberAccount.vehiclePlate || 'N/A'}</span>
                            </p>
                        </div>
                    </div>

                    {/* View Switcher, Zoom Controls & Actions */}
                    <div className="flex items-center flex-wrap gap-2">
                        {/* Member Quick Switcher Dropdown */}
                        <div className="relative">
                            <select
                                value={memberAccount.id}
                                onChange={(e) => {
                                    const selected = allMembers.find(m => m.id === e.target.value);
                                    if (selected) onSelectMember(selected);
                                }}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-bold rounded-xl outline-none transition-colors max-w-[210px] truncate"
                            >
                                {allMembers.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.memberName} ({m.memberRole} - {m.vehiclePlate || m.memberNumber})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* View Mode Toggle */}
                        <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700">
                            <button
                                onClick={() => setViewMode('a4_preview')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === 'a4_preview'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="A4 Letterhead PDF View"
                            >
                                <Eye className="w-3.5 h-3.5" />
                                <span>A4 PDF Preview</span>
                            </button>
                            <button
                                onClick={() => setViewMode('ledger_table')}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                    viewMode === 'ledger_table'
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                                title="Data Ledger Table View"
                            >
                                <TableIcon className="w-3.5 h-3.5" />
                                <span>Data Ledger</span>
                            </button>
                        </div>

                        {/* Zoom Controls for A4 Mode */}
                        {viewMode === 'a4_preview' && (
                            <div className="hidden lg:flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-xl border border-slate-700">
                                <button
                                    onClick={() => setZoomScale(prev => Math.max(0.65, prev - 0.1))}
                                    className="p-1 hover:text-white text-slate-400 transition-colors"
                                    title="Zoom Out"
                                >
                                    <ZoomOut className="w-3.5 h-3.5" />
                                </button>
                                <span className="text-[11px] font-mono text-slate-300 font-bold px-1.5">
                                    {Math.round(zoomScale * 100)}%
                                </span>
                                <button
                                    onClick={() => setZoomScale(prev => Math.min(1.3, prev + 0.1))}
                                    className="p-1 hover:text-white text-slate-400 transition-colors"
                                    title="Zoom In"
                                >
                                    <ZoomIn className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setZoomScale(1.0)}
                                    className="text-[10px] uppercase font-bold text-slate-400 hover:text-white px-1.5 border-l border-slate-700"
                                >
                                    Reset
                                </button>
                            </div>
                        )}

                        {/* Action Buttons: Print / PDF & Excel */}
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95"
                            title="Print or Save as Official A4 PDF"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print / PDF</span>
                        </button>

                        <button
                            onClick={handleExportExcel}
                            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-emerald-500/40"
                            title="Export statement as spreadsheet"
                        >
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Excel</span>
                        </button>

                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-slate-800 text-slate-400 hover:text-white rounded-xl transition-colors ml-1"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Filter Controls Bar (Hidden on Print) */}
                <div className="no-print p-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
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
                <div className="flex-1 overflow-y-auto overflow-x-auto p-2 sm:p-6 lg:p-8 bg-slate-900/90 dark:bg-slate-950 flex justify-center items-start print:bg-white print:p-0 print:overflow-visible">
                    
                    {/* A4 Paper Canvas */}
                    <div 
                        id="sacco-statement-a4-sheet" 
                        style={{
                            transform: viewMode === 'a4_preview' ? `scale(${zoomScale})` : 'none',
                            transformOrigin: 'top center'
                        }}
                        className={`bg-white text-slate-900 border border-slate-200 rounded-none sm:rounded-xl shadow-2xl space-y-6 mx-auto transition-transform print:border-none print:shadow-none print:rounded-none print:transform-none print:mx-0 ${
                            viewMode === 'a4_preview' 
                                ? 'w-[210mm] min-h-[297mm] p-[10mm] sm:p-[12mm]' 
                                : 'w-full max-w-5xl p-6 sm:p-8'
                        }`}
                    >
                        {/* ========================================================================= */}
                        {/* 1. OFFICIAL SACCO LETTERHEAD HEADER */}
                        {/* ========================================================================= */}
                        {letterheadImage ? (
                            <div className="w-full border-b border-slate-200 pb-2">
                                <img
                                    src={letterheadImage}
                                    alt="Official Sacco Letterhead Banner"
                                    className="w-full max-h-36 object-contain mx-auto"
                                />
                            </div>
                        ) : (
                            <div className="border-b-2 border-slate-900 pb-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        {logoImage ? (
                                            <img 
                                                src={logoImage} 
                                                alt="SACCO Crest Logo" 
                                                className="w-20 h-20 object-contain rounded-xl border border-slate-200 p-1 bg-white shrink-0" 
                                            />
                                        ) : (
                                            <div className="w-20 h-20 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center p-2 text-center shrink-0">
                                                <Landmark className="w-7 h-7 text-amber-400 mb-0.5" />
                                                <span className="text-[8px] font-black uppercase tracking-tighter">SACCO</span>
                                            </div>
                                        )}
                                        <div>
                                            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">
                                                {currentInstitution.name}
                                            </h1>
                                            <p className="text-xs font-black uppercase tracking-wider text-indigo-700 mt-1">
                                                {brandingTagline || currentInstitution.motto || 'Transport SACCO & Savings Society Ltd.'}
                                            </p>
                                            <p className="text-[10px] text-slate-600 font-medium mt-1">
                                                Regulated by NTSA & Sacco Societies Regulatory Authority (SASRA) • Co-op Reg No: CS/{new Date().getFullYear()}/TRANSIT
                                            </p>
                                            <p className="text-[9px] text-slate-500 mt-0.5">
                                                Head Office: {currentInstitution.address || 'Central Terminal Commercial Plaza, Stage Office'} • Tel: {currentInstitution.phoneNumber || currentInstitution.phone || '+254 700 000 000'} • Email: {currentInstitution.email || 'info@sacco.co.ke'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Document Badge */}
                                    <div className="text-right shrink-0">
                                        <div className="inline-block px-3 py-1.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-lg shadow-sm">
                                            Member Statement
                                        </div>
                                        <p className="text-[10px] font-mono text-slate-500 font-bold mt-1">
                                            Ref: {statementRef}
                                        </p>
                                        <p className="text-[10px] font-mono text-slate-400">
                                            Date: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>

                                {/* Tri-color Kenyan transit accent line */}
                                <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-indigo-600 to-emerald-600 rounded-full mt-4"></div>
                            </div>
                        )}

                        {/* ========================================================================= */}
                        {/* 2. MEMBER ACCOUNT IDENTIFICATION & PROFILE BANNER */}
                        {/* ========================================================================= */}
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5 mb-3">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                        Statement of Account & Thrift Holdings
                                    </span>
                                    <h2 className="text-base font-black text-slate-900 uppercase tracking-wide">
                                        {memberAccount.memberName}
                                    </h2>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-slate-400">Account Standing:</span>
                                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                                        {memberAccount.status || 'Active in Good Standing'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Member No.</span>
                                    <span className="font-mono font-black text-slate-900">{memberAccount.memberNumber}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Member Role</span>
                                    <span className="font-bold text-indigo-700 uppercase">{memberAccount.memberRole}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Assigned Vehicle</span>
                                    <span className="font-mono font-bold text-slate-900">{memberAccount.vehiclePlate || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Phone Contact</span>
                                    <span className="font-bold text-slate-700">{memberAccount.phoneNumber || 'N/A'}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Remittance Tier</span>
                                    <span className="font-bold text-slate-800">{memberAccount.remittanceTier || 'Standard Transit Tier'}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Daily Target</span>
                                    <span className="font-mono font-bold text-slate-900">KES {(memberAccount.dailyTarget || 0).toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Statement Period</span>
                                    <span className="font-bold text-slate-700">
                                        {dateRangeFilter === '30' ? 'Last 30 Days' :
                                         dateRangeFilter === '90' ? 'Last 90 Days' :
                                         dateRangeFilter === 'year' ? 'Current Year' :
                                         dateRangeFilter === 'custom' ? `${startDate} to ${endDate}` : 'All Available Records'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[9px] font-black uppercase text-slate-400 block">Selected Scheme</span>
                                    <span className="font-bold text-slate-700 uppercase">{categoryFilter === 'ALL' ? 'All Schemes' : categoryFilter}</span>
                                </div>
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* 3. CONSOLIDATED SCHEME BALANCES SUMMARY CARDS */}
                        {/* ========================================================================= */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div className="p-3 rounded-xl bg-slate-900 text-white">
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-300 block">Total Member Equity</span>
                                <div className="text-base sm:text-lg font-black font-mono text-white mt-0.5">
                                    KES {totalMemberEquity.toLocaleString()}
                                </div>
                                <span className="text-[8px] text-slate-400 block mt-0.5">Cumulative Across All Funds</span>
                            </div>

                            <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200">
                                <span className="text-[9px] font-black uppercase tracking-wider text-indigo-900 block">Voluntary Savings</span>
                                <div className="text-base sm:text-lg font-black font-mono text-indigo-950 mt-0.5">
                                    KES {memberAccount.savingsBalance.toLocaleString()}
                                </div>
                                <span className="text-[8px] text-indigo-700 block mt-0.5">3x Loan Limit: KES {loanCeiling.toLocaleString()}</span>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-900 block">Sinking Fund</span>
                                <div className="text-base sm:text-lg font-black font-mono text-emerald-950 mt-0.5">
                                    KES {sinkingFundBalance.toLocaleString()}
                                </div>
                                <span className="text-[8px] text-emerald-700 block mt-0.5">Vehicle Maintenance Buffer</span>
                            </div>

                            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                                <span className="text-[9px] font-black uppercase tracking-wider text-amber-900 block">Share Capital & Welfare</span>
                                <div className="text-base sm:text-lg font-black font-mono text-amber-950 mt-0.5">
                                    KES {(memberAccount.shareCapital + memberAccount.welfareBalance).toLocaleString()}
                                </div>
                                <span className="text-[8px] text-amber-700 block mt-0.5">Statutory Shares: KES {memberAccount.shareCapital.toLocaleString()}</span>
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* 4. ITEMIZED CHRONOLOGICAL TRANSACTION & REMITTANCE LEDGER */}
                        {/* ========================================================================= */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
                                    Itemized Financial Ledger & Check-Off Records
                                </h3>
                                <span className="text-[10px] font-mono text-slate-400">
                                    {statementLedger.length} Transactions
                                </span>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-[10px]">
                                    <thead>
                                        <tr className="border-b-2 border-slate-900 bg-slate-100">
                                            <th className="p-2 font-black uppercase text-slate-700">Date</th>
                                            <th className="p-2 font-black uppercase text-slate-700">Ref / Code</th>
                                            <th className="p-2 font-black uppercase text-slate-700">Scheme</th>
                                            <th className="p-2 font-black uppercase text-slate-700">Particulars / Description</th>
                                            <th className="p-2 font-black uppercase text-slate-700 text-right">Debit (KES)</th>
                                            <th className="p-2 font-black uppercase text-slate-700 text-right">Credit (KES)</th>
                                            <th className="p-2 font-black uppercase text-slate-700 text-right">Balance (KES)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200">
                                        {statementLedger.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="p-6 text-center text-slate-400 font-bold text-xs">
                                                    No financial records found for this member within the selected period.
                                                </td>
                                            </tr>
                                        ) : (
                                            statementLedger.map((row) => (
                                                <tr key={row.id} className="hover:bg-slate-50">
                                                    <td className="p-2 font-mono whitespace-nowrap text-slate-600">
                                                        {row.date}
                                                    </td>
                                                    <td className="p-2 font-mono font-bold text-slate-900 whitespace-nowrap">
                                                        {row.reference}
                                                    </td>
                                                    <td className="p-2 whitespace-nowrap">
                                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase ${
                                                            row.type === 'remittance' ? 'bg-indigo-100 text-indigo-800' :
                                                            row.type === 'sinking' ? 'bg-emerald-100 text-emerald-800' :
                                                            row.type === 'welfare' ? 'bg-amber-100 text-amber-800' :
                                                            row.type === 'penalty' ? 'bg-rose-100 text-rose-800' :
                                                            'bg-slate-200 text-slate-800'
                                                        }`}>
                                                            {row.category}
                                                        </span>
                                                    </td>
                                                    <td className="p-2 text-slate-800 max-w-xs truncate">
                                                        {row.description}
                                                    </td>
                                                    <td className="p-2 text-right font-mono font-bold text-rose-600 whitespace-nowrap">
                                                        {row.debit > 0 ? row.debit.toLocaleString() : '-'}
                                                    </td>
                                                    <td className="p-2 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                                                        {row.credit > 0 ? row.credit.toLocaleString() : '-'}
                                                    </td>
                                                    <td className="p-2 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                                                        {(row.runningBalance || 0).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                    {statementLedger.length > 0 && (
                                        <tfoot>
                                            <tr className="border-t-2 border-slate-900 bg-slate-100 font-black">
                                                <td colSpan={4} className="p-2 uppercase text-slate-900">
                                                    Period Totals & Net Ledger Movement
                                                </td>
                                                <td className="p-2 text-right font-mono text-rose-700">
                                                    KES {totalDebits.toLocaleString()}
                                                </td>
                                                <td className="p-2 text-right font-mono text-emerald-700">
                                                    KES {totalCredits.toLocaleString()}
                                                </td>
                                                <td className="p-2 text-right font-mono text-slate-900">
                                                    KES {netLedgerMovement.toLocaleString()}
                                                </td>
                                            </tr>
                                        </tfoot>
                                    )}
                                </table>
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* 5. OFFICIAL VERIFICATION, SIGNATURES & SACCO SEAL */}
                        {/* ========================================================================= */}
                        <div className="pt-6 border-t-2 border-slate-900 flex justify-between items-end gap-6 text-xs">
                            <div className="space-y-6 flex-1 max-w-sm">
                                <div>
                                    <div className="border-b border-slate-400 pb-1 h-8 flex items-end">
                                        {signatureImage && (
                                            <img src={signatureImage} alt="Official Signature" className="h-7 object-contain" />
                                        )}
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-700 mt-1">
                                        Certified By: Sacco Finance Director / Treasurer
                                    </p>
                                    <p className="text-[8px] text-slate-500 font-mono">Date: {new Date().toLocaleDateString('en-GB')}</p>
                                </div>
                                <div>
                                    <div className="border-b border-slate-400 pb-1 h-8"></div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-700 mt-1">
                                        Member Acknowledgment / Acceptance Signature
                                    </p>
                                    <p className="text-[8px] text-slate-500 font-mono">Date: ________________________</p>
                                </div>
                            </div>

                            {/* Official Seal / Stamp */}
                            <div className="shrink-0 flex flex-col items-center justify-center">
                                {stampImage ? (
                                    <div className="relative -rotate-6 transition-transform">
                                        <img
                                            src={stampImage}
                                            alt="Official Seal"
                                            className="w-24 h-24 object-contain drop-shadow"
                                        />
                                    </div>
                                ) : brandingStampMode === 'system' ? (
                                    <div className="relative w-24 h-24 rounded-full border-2 border-indigo-800 text-indigo-800 flex flex-col items-center justify-center text-center p-1 -rotate-6 select-none bg-indigo-50/50">
                                        <div className="w-20 h-20 rounded-full border border-dashed border-indigo-600 flex flex-col items-center justify-center">
                                            <span className="text-[7px] font-black uppercase tracking-tighter">OFFICIAL SEAL</span>
                                            <span className="text-[9px] font-black uppercase tracking-tight text-indigo-950 leading-none my-0.5">VERIFIED</span>
                                            <span className="text-[6px] font-bold tracking-widest">{new Date().getFullYear()} NTSA REG</span>
                                        </div>
                                    </div>
                                ) : null}
                                <span className="text-[8px] font-mono text-slate-500 mt-1">Official Document Seal</span>
                            </div>
                        </div>

                        {/* ========================================================================= */}
                        {/* 6. OFFICIAL SACCO FOOTER BANNER & DISCLAIMER */}
                        {/* ========================================================================= */}
                        <div className="pt-3 border-t border-slate-200 text-center space-y-1">
                            {brandingFooter && (
                                <img
                                    src={brandingFooter}
                                    alt="Footer Banner"
                                    className="w-full max-h-12 object-contain mx-auto mb-1"
                                />
                            )}
                            <p className="text-[8px] text-slate-600 uppercase tracking-widest font-black">
                                {brandingFooterText || `${currentInstitution.name} • Official Member Account & Thrift Statement • Regulated by NTSA / SASRA`}
                            </p>
                            <p className="text-[7px] text-slate-400 font-mono">
                                This computer-generated statement is an official accounting document issued without alterations. Any discrepancy must be reported to the SACCO management within 14 calendar days.
                            </p>
                            <p className="text-[7px] text-slate-400 font-mono">
                                Page 1 of 1 • Generated On: {new Date().toLocaleString('en-GB')}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
