import React, { useState, useMemo } from 'react';
import type { 
    Institution, 
    User as UserType, 
    TransportSaccoAccount, 
    TransportSaccoTransaction, 
    SaccoRemittanceSettings, 
    SaccoDailyRemittanceRecord, 
    SaccoLoanSettings 
} from '../types';
import { 
    TruckIcon, 
    WalletIcon, 
    CreditCardIcon, 
    CheckCircleIcon, 
    QrCodeIcon, 
    DocumentTextIcon, 
    DownloadIcon, 
    ShieldCheckIcon, 
    PhoneIcon, 
    ZapIcon, 
    ArrowTrendingUpIcon, 
    SmartphoneIcon, 
    ArrowPathIcon,
    ExclamationTriangleIcon,
    XIcon
} from './icons';

export interface SaccoDriverPortalViewProps {
    currentInstitution: Institution;
    currentUser?: UserType;
    users?: UserType[];
    saccoAccounts?: TransportSaccoAccount[];
    saccoTransactions?: TransportSaccoTransaction[];
    remittanceSettings?: SaccoRemittanceSettings;
    remittanceRecords?: SaccoDailyRemittanceRecord[];
    loanSettings?: SaccoLoanSettings;
    initialDriverId?: string;
    onRecordRemittance?: (record: SaccoDailyRemittanceRecord) => void;
    onRecordSavingsDeposit?: (accountId: string, amount: number, method: 'mpesa' | 'bank' | 'cash' | 'daily_deduction', ref?: string, notes?: string) => void;
    onApplyLoan?: (application: any) => void;
    onClose?: () => void;
}

export const SaccoDriverPortalView: React.FC<SaccoDriverPortalViewProps> = ({
    currentInstitution,
    currentUser,
    users = [],
    saccoAccounts = [],
    saccoTransactions = [],
    remittanceSettings,
    remittanceRecords = [],
    loanSettings,
    initialDriverId,
    onRecordRemittance,
    onRecordSavingsDeposit,
    onApplyLoan,
    onClose
}) => {
    // ═════════════════════════════════════════════════════════════════════════
    // ACTIVE DRIVER PROFILE RESOLUTION
    // ═════════════════════════════════════════════════════════════════════════
    const availableDrivers = useMemo(() => {
        const driversFromAccounts = saccoAccounts
            .filter(a => a.memberRole === 'Driver' || (a as any).role === 'Driver')
            .map(a => ({
                id: a.id,
                accountNumber: a.memberNumber || `SACCO-${a.id.slice(-4)}`,
                memberId: a.memberId || a.id,
                memberName: a.memberName,
                nationalId: (a as any).nationalId || '30492819',
                phoneNumber: a.phoneNumber || '0712345678',
                role: 'Driver' as const,
                vehicleRegNumber: a.vehiclePlate || 'KDA 482Y',
                vehicleModel: a.vehicleModel || 'PSV Matatu',
                savingsCategory: a.savingsCategory,
                currentSavingsBalance: a.savingsBalance || 0,
                shareCapitalAmount: a.shareCapital || 20000,
                dailySavingsTarget: a.dailyTarget || 500,
                dailyRemittanceTarget: 1500,
                remittanceTier: a.remittanceTier || 'Silver',
                loanEligibilityLimit: a.loanEligibility || 0,
                status: a.status,
                joinedDate: a.joinedDate
            }));

        if (driversFromAccounts.length > 0) return driversFromAccounts;
        // Fallback mock driver if no accounts registered yet
        return [{
            id: 'mock_driver_1',
            accountNumber: 'SACCO-DRV-0482',
            memberId: 'drv_juma_mwangi',
            memberName: 'Juma Mwangi',
            nationalId: '30492819',
            phoneNumber: '0712345678',
            role: 'Driver' as const,
            vehicleRegNumber: 'KDA 482Y',
            vehicleModel: 'Toyota HiAce (14-Seater)',
            savingsCategory: 'Daily Sinking Fund' as const,
            currentSavingsBalance: 14500,
            shareCapitalAmount: 20000,
            dailySavingsTarget: 500,
            dailyRemittanceTarget: 1500,
            remittanceTier: 'Silver',
            loanEligibilityLimit: 43500,
            status: 'Active' as const,
            joinedDate: '2023-04-15'
        }];
    }, [saccoAccounts]);

    const [selectedDriverId, setSelectedDriverId] = useState<string>(() => {
        if (initialDriverId) {
            const match = availableDrivers.find(d => d.id === initialDriverId || d.memberId === initialDriverId);
            if (match) return match.id;
        }
        if (currentUser?.id) {
            const match = availableDrivers.find(d => d.memberId === currentUser.id || d.id === currentUser.id);
            if (match) return match.id;
        }
        return availableDrivers[0]?.id || 'mock_driver_1';
    });

    React.useEffect(() => {
        if (initialDriverId) {
            const match = availableDrivers.find(d => d.id === initialDriverId || d.memberId === initialDriverId);
            if (match) setSelectedDriverId(match.id);
        }
    }, [initialDriverId, availableDrivers]);

    const activeDriver = useMemo(() => {
        return availableDrivers.find(d => d.id === selectedDriverId) || availableDrivers[0];
    }, [availableDrivers, selectedDriverId]);

    // Active bottom navigation tab
    const [activeTab, setActiveTab] = useState<'home' | 'pay' | 'loans' | 'statements' | 'support'>('home');
    const [viewMode, setViewMode] = useState<'handset' | 'expanded'>('handset');

    // ═════════════════════════════════════════════════════════════════════════
    // LOAN QUALIFICATION & REPAYMENT COMPUTATION
    // ═════════════════════════════════════════════════════════════════════════
    const minThreshold = loanSettings?.roleMinSavingsThresholds?.driver ?? 10000;
    const loanMultiplier = loanSettings?.loanMultiplier ?? 3.0;
    const currentSavings = activeDriver?.currentSavingsBalance || 0;
    const isLoanQualified = currentSavings >= minThreshold;
    const maxLoanLimit = isLoanQualified ? Math.round(currentSavings * loanMultiplier) : 0;
    const savingsShortfall = Math.max(0, minThreshold - currentSavings);

    // Loan Application Form State
    const [appliedLoanAmount, setAppliedLoanAmount] = useState<number>(() => Math.min(30000, maxLoanLimit || 20000));
    const [loanTenureMonths, setLoanTenureMonths] = useState<number>(6);
    const [loanPurpose, setLoanPurpose] = useState<'emergency_repairs' | 'school_fees' | 'asset_financing' | 'welfare'>('emergency_repairs');
    const [guarantorPhone1, setGuarantorPhone1] = useState<string>('0722123456 (Peter Otieno - KCA 312B)');
    const [isSubmittingLoan, setIsSubmittingLoan] = useState<boolean>(false);
    const [loanApplicationSuccess, setLoanApplicationSuccess] = useState<string | null>(null);

    // Calculate Repayment
    const interestRateAnnual = loanSettings?.interestRate ?? 12.0;
    const calculationMethod = loanSettings?.interestCalculationMethod ?? 'reducing_balance';
    const processingFeePercent = loanSettings?.processingFeePercent ?? 1.5;

    const loanCalculation = useMemo(() => {
        const principal = appliedLoanAmount;
        const n = loanTenureMonths;
        const processingFee = Math.round((principal * processingFeePercent) / 100);

        if (principal <= 0 || n <= 0) {
            return { monthlyPayment: 0, totalInterest: 0, totalPayable: 0, processingFee: 0 };
        }

        if (calculationMethod === 'reducing_balance') {
            const monthlyRate = (interestRateAnnual / 100) / 12;
            if (monthlyRate === 0) {
                const emi = Math.round(principal / n);
                return { monthlyPayment: emi, totalInterest: 0, totalPayable: principal, processingFee };
            }
            const factor = Math.pow(1 + monthlyRate, n);
            const monthlyEmi = Math.round((principal * monthlyRate * factor) / (factor - 1));
            const totalPayable = monthlyEmi * n;
            const totalInterest = Math.max(0, totalPayable - principal);
            return { monthlyPayment: monthlyEmi, totalInterest, totalPayable, processingFee };
        } else {
            const totalInterest = Math.round((principal * (interestRateAnnual / 100) * (n / 12)));
            const totalPayable = principal + totalInterest;
            const monthlyPayment = Math.round(totalPayable / n);
            return { monthlyPayment, totalInterest, totalPayable, processingFee };
        }
    }, [appliedLoanAmount, loanTenureMonths, interestRateAnnual, calculationMethod, processingFeePercent]);

    // ═════════════════════════════════════════════════════════════════════════
    // DAILY REMITTANCE & M-PESA STK PAYMENT STATE
    // ═════════════════════════════════════════════════════════════════════════
    const [includeDailyLevy, setIncludeDailyLevy] = useState(true);
    const [includeWelfare, setIncludeWelfare] = useState(true);
    const [includeSavingsDeposit, setIncludeSavingsDeposit] = useState(true);
    const [customSavingsAmount, setCustomSavingsAmount] = useState<number>(500);
    const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState<string>(activeDriver?.phoneNumber || '0712345678');
    const [isStkPromptOpen, setIsStkPromptOpen] = useState(false);
    const [stkStatus, setStkStatus] = useState<'idle' | 'sending' | 'waiting_pin' | 'success'>('idle');
    const [paymentReceiptModal, setPaymentReceiptModal] = useState<any | null>(null);

    const dailyLevyAmount = 300;
    const welfareAmount = 100;
    const totalPaymentAmount = useMemo(() => {
        let total = 0;
        if (includeDailyLevy) total += dailyLevyAmount;
        if (includeWelfare) total += welfareAmount;
        if (includeSavingsDeposit) total += customSavingsAmount;
        return total;
    }, [includeDailyLevy, includeWelfare, includeSavingsDeposit, customSavingsAmount]);

    // Handle M-Pesa STK Push Simulation
    const handleTriggerStkPush = () => {
        setIsStkPromptOpen(true);
        setStkStatus('sending');

        setTimeout(() => {
            setStkStatus('waiting_pin');
        }, 1200);
    };

    const handleConfirmStkPin = () => {
        setStkStatus('success');
        const refNo = `MP-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newRecord: SaccoDailyRemittanceRecord = {
            id: `rem_${Date.now()}`,
            date: new Date().toISOString().split('T')[0],
            accountId: activeDriver?.id || '',
            memberName: activeDriver?.memberName || 'Driver',
            vehicleRegNumber: activeDriver?.vehicleRegNumber || 'KDA 482Y',
            role: 'Driver',
            tierName: activeDriver?.remittanceTier || 'Silver',
            targetAmount: totalPaymentAmount,
            amountPaid: totalPaymentAmount,
            balance: 0,
            status: 'cleared',
            paymentMethod: 'mpesa',
            mpesaRef: refNo,
            recordedBy: 'Driver Self-Service M-Pesa',
            timestamp: new Date().toISOString()
        };

        if (onRecordRemittance) {
            onRecordRemittance(newRecord);
        }

        if (includeSavingsDeposit && onRecordSavingsDeposit && activeDriver?.id) {
            onRecordSavingsDeposit(activeDriver.id, customSavingsAmount, 'mpesa', refNo, 'Daily Remittance Bundle Savings');
        }

        setTimeout(() => {
            setIsStkPromptOpen(false);
            setPaymentReceiptModal(newRecord);
        }, 1000);
    };

    // ═════════════════════════════════════════════════════════════════════════
    // STATEMENTS & AUDIT LEDGER
    // ═════════════════════════════════════════════════════════════════════════
    const [statementFilter, setStatementFilter] = useState<'all' | 'remittance' | 'savings' | 'loan'>('all');

    // Aggregate driver transactions
    const driverTransactions = useMemo(() => {
        const txs: Array<{
            id: string;
            date: string;
            type: 'remittance' | 'savings' | 'loan';
            description: string;
            amount: number;
            ref: string;
            status: string;
        }> = [];

        // 1. Remittance records
        remittanceRecords
            .filter(r => r.vehicleRegNumber === activeDriver?.vehicleRegNumber || r.accountId === activeDriver?.id)
            .forEach(r => {
                txs.push({
                    id: r.id,
                    date: r.date || r.timestamp || new Date().toISOString().split('T')[0],
                    type: 'remittance',
                    description: `Daily Remittance Levy (${r.tierName || 'Standard'})`,
                    amount: r.amountPaid,
                    ref: r.mpesaRef || `REM-${r.id.slice(-6)}`,
                    status: 'Verified'
                });
            });

        // 2. Savings deposits
        saccoTransactions
            .filter(t => t.accountId === activeDriver?.id)
            .forEach(t => {
                txs.push({
                    id: t.id,
                    date: t.date,
                    type: 'savings',
                    description: `${t.type} (${t.category})`,
                    amount: t.amount,
                    ref: t.referenceNumber || `SAV-${t.id.slice(-6)}`,
                    status: 'Completed'
                });
            });

        // Default seed data if newly initiated
        if (txs.length === 0) {
            return [
                { id: 'tx_1', date: '2026-10-17', type: 'remittance' as const, description: 'Daily Stage Levy & Route Clearance', amount: 300, ref: 'SD982X3', status: 'Verified' },
                { id: 'tx_2', date: '2026-10-16', type: 'savings' as const, description: 'Voluntary Sinking Fund Deposit', amount: 500, ref: 'QW110P9', status: 'Verified' },
                { id: 'tx_3', date: '2026-10-15', type: 'remittance' as const, description: 'Daily Stage Levy & Route Clearance', amount: 300, ref: 'KJ881A2', status: 'Verified' },
                { id: 'tx_4', date: '2026-10-14', type: 'savings' as const, description: 'Voluntary Sinking Fund Deposit', amount: 500, ref: 'TY449L0', status: 'Verified' },
                { id: 'tx_5', date: '2026-10-01', type: 'loan' as const, description: 'Monthly Loan Repayment (EMI)', amount: 2150, ref: 'LN90281', status: 'Verified' }
            ];
        }

        return txs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [remittanceRecords, saccoTransactions, activeDriver]);

    const filteredTransactions = useMemo(() => {
        if (statementFilter === 'all') return driverTransactions;
        return driverTransactions.filter(t => t.type === statementFilter);
    }, [driverTransactions, statementFilter]);

    // Handle Loan Submission
    const handleApplyLoanSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoanQualified) return;
        setIsSubmittingLoan(true);

        setTimeout(() => {
            setIsSubmittingLoan(false);
            setLoanApplicationSuccess(`Loan Application for KES ${appliedLoanAmount.toLocaleString()} submitted successfully to SACCO Credit Desk! Ref: LN-${Date.now().toString().slice(-6)}`);
            if (onApplyLoan) {
                onApplyLoan({
                    driverId: activeDriver?.id,
                    driverName: activeDriver?.memberName,
                    vehicleReg: activeDriver?.vehicleRegNumber,
                    amount: appliedLoanAmount,
                    tenure: loanTenureMonths,
                    monthlyEmi: loanCalculation.monthlyPayment,
                    interestRate: interestRateAnnual,
                    purpose: loanPurpose,
                    guarantor: guarantorPhone1,
                    status: 'pending_disbursement'
                });
            }
        }, 1000);
    };

    return (
        <div className="relative min-h-screen bg-slate-950 text-slate-100 p-2 sm:p-6 font-sans">
            {/* Top Toolbar */}
            <div className="max-w-5xl mx-auto mb-6 flex flex-wrap items-center justify-between gap-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                        <SmartphoneIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white tracking-wide">SACCO Driver Android App</h2>
                            <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full">
                                Mobile Client v2.4
                            </span>
                        </div>
                        <p className="text-xs text-slate-400">
                            {currentInstitution?.name || 'Logistics SACCO Management'} • Matatu &amp; Transit Portal
                        </p>
                    </div>
                </div>

                {/* Driver Profile Switcher for Testing & Viewport Toggle */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                        <TruckIcon className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs text-slate-400">Driver:</span>
                        <select
                            value={selectedDriverId}
                            onChange={(e) => setSelectedDriverId(e.target.value)}
                            aria-label="Select Driver Profile"
                            className="bg-transparent text-xs text-white font-medium focus:outline-none cursor-pointer"
                        >
                            {availableDrivers.map(drv => (
                                <option key={drv.id} value={drv.id} className="bg-slate-900 text-white">
                                    {drv.memberName} ({drv.vehicleRegNumber})
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center bg-slate-950 rounded-xl border border-slate-800 p-1">
                        <button
                            onClick={() => setViewMode('handset')}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                viewMode === 'handset' 
                                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20' 
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            📱 Mobile Handset
                        </button>
                        <button
                            onClick={() => setViewMode('expanded')}
                            className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                                viewMode === 'expanded' 
                                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-lg shadow-emerald-500/20' 
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            💻 Expanded View
                        </button>
                    </div>

                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
                            title="Close Driver Portal"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* Handset Frame or Expanded Container */}
            <div className={`mx-auto transition-all duration-300 ${
                viewMode === 'handset' 
                    ? 'max-w-[420px] rounded-[44px] p-3 bg-slate-900 shadow-2xl border-4 border-slate-800 ring-1 ring-slate-700/50' 
                    : 'max-w-4xl rounded-3xl p-6 bg-slate-900/60 border border-slate-800'
            }`}>
                {/* Handset Top Notch & Status Bar (in handset view) */}
                {viewMode === 'handset' && (
                    <div className="flex items-center justify-between px-6 pt-2 pb-3 text-xs text-slate-400">
                        <span className="font-semibold text-slate-300">09:41</span>
                        <div className="w-24 h-4 bg-slate-950 rounded-full mx-auto border border-slate-800/80"></div>
                        <div className="flex items-center gap-1.5">
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">5G</span>
                            <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5">
                                <div className="w-full h-full bg-emerald-400 rounded-2xs"></div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mobile Viewport Screen */}
                <div className="bg-[#0B0F19] rounded-[32px] overflow-hidden border border-slate-800/80 flex flex-col min-h-[720px] relative">
                    {/* Screen Header */}
                    <div className="p-4 bg-slate-900/90 border-b border-slate-800/80 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-11 h-11 rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
                                        {activeDriver?.memberName.split(' ').map((n: string) => n[0]).join('') || 'JM'}
                                    </div>
                                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-950 rounded-full"></div>
                                </div>
                                <div>
                                    <h3 className="font-bold text-white text-sm tracking-tight">{activeDriver?.memberName}</h3>
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <span className="font-mono text-emerald-400 font-semibold">{activeDriver?.vehicleRegNumber}</span>
                                        <span>•</span>
                                        <span className="text-slate-400">{activeDriver?.remittanceTier} Tier</span>
                                    </div>
                                </div>
                            </div>

                            {/* Daily Clearance Badge */}
                            <div className="text-right">
                                <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-400" />
                                    <span>Remittance Cleared</span>
                                </div>
                                <p className="text-[10px] text-slate-500 mt-0.5">Valid until 23:59</p>
                            </div>
                        </div>
                    </div>

                    {/* Scrollable Main Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
                        {/* ═════════════════════════════════════════════════════ */}
                        {/* TAB 1: HOME DASHBOARD */}
                        {/* ═════════════════════════════════════════════════════ */}
                        {activeTab === 'home' && (
                            <div className="space-y-4">
                                {/* Hero Card: SACCO Savings & Loan Eligibility Badge */}
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-600/30 via-slate-900 to-indigo-950/40 border border-emerald-500/30 shadow-lg relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-medium text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                                            <WalletIcon className="w-3.5 h-3.5" />
                                            SACCO Savings Balance
                                        </span>
                                        <span className="text-[11px] text-slate-400 font-mono">
                                            {activeDriver?.accountNumber}
                                        </span>
                                    </div>

                                    <div className="text-2xl font-black text-white tracking-tight my-1">
                                        KES {currentSavings.toLocaleString()}
                                    </div>

                                    {/* Loan Qualification Rule Indicator */}
                                    <div className="mt-3 p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                                                <ShieldCheckIcon className="w-3.5 h-3.5 text-indigo-400" />
                                                Loan Eligibility Status
                                            </span>
                                            {isLoanQualified ? (
                                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                    ✓ Qualified (&gt; KES {minThreshold.toLocaleString()})
                                                </span>
                                            ) : (
                                                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                    Shortfall of KES {savingsShortfall.toLocaleString()}
                                                </span>
                                            )}
                                        </div>

                                        {isLoanQualified ? (
                                            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                                                <span className="text-slate-400">Borrowing Capacity (3x):</span>
                                                <span className="font-bold text-emerald-400 text-sm">
                                                    Up to KES {maxLoanLimit.toLocaleString()}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="text-xs text-amber-400/90 pt-1">
                                                Drivers must save above KES {minThreshold.toLocaleString()} to qualify for cooperative credit.
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Action Shortcuts */}
                                <div className="grid grid-cols-3 gap-2.5">
                                    <button
                                        onClick={() => setActiveTab('pay')}
                                        className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-center transition-all group hover:border-emerald-500/40"
                                    >
                                        <div className="w-10 h-10 mx-auto mb-1.5 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <CreditCardIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-semibold text-white block">Pay Daily</span>
                                        <span className="text-[10px] text-slate-400">M-Pesa STK</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('loans')}
                                        className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-center transition-all group hover:border-indigo-500/40"
                                    >
                                        <div className="w-10 h-10 mx-auto mb-1.5 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ZapIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-semibold text-white block">Apply Loan</span>
                                        <span className="text-[10px] text-indigo-300">Instant Approval</span>
                                    </button>

                                    <button
                                        onClick={() => setActiveTab('statements')}
                                        className="p-3 rounded-xl bg-slate-900/90 hover:bg-slate-850 border border-slate-800 text-center transition-all group hover:border-blue-500/40"
                                    >
                                        <div className="w-10 h-10 mx-auto mb-1.5 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <DocumentTextIcon className="w-5 h-5" />
                                        </div>
                                        <span className="text-xs font-semibold text-white block">Statements</span>
                                        <span className="text-[10px] text-slate-400">PDF &amp; Audit</span>
                                    </button>
                                </div>

                                {/* Active Loan & EMI Status Card */}
                                <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-slate-900 border border-indigo-500/30 flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center gap-1.5 text-xs text-indigo-300 font-medium">
                                            <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                                            Active Development Loan
                                        </div>
                                        <div className="text-lg font-bold text-white mt-0.5">
                                            KES 2,150 <span className="text-xs font-normal text-slate-400">/ month</span>
                                        </div>
                                        <div className="text-[11px] text-slate-400 mt-0.5">
                                            Rate: 12% reducing balance • Next due: 1st Nov
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setActiveTab('loans')}
                                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-md transition-all"
                                    >
                                        View Terms
                                    </button>
                                </div>

                                {/* Stage Clearance & QR Pass */}
                                <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                                            <QrCodeIcon className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <span className="text-xs font-bold text-white block">Digital Route Permit QR</span>
                                            <span className="text-[11px] text-slate-400">Show to stage marshal on inspection</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => alert(`Digital Route Clearance QR Code for ${activeDriver?.vehicleRegNumber} is active and verified by SACCO Inspectorate.`)}
                                        className="px-2.5 py-1 text-xs text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg font-medium transition-all"
                                    >
                                        Inspect
                                    </button>
                                </div>

                                {/* Recent Activity Mini-Feed */}
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-slate-300 uppercase tracking-wide">Recent Transactions</span>
                                        <button onClick={() => setActiveTab('statements')} className="text-xs text-emerald-400 hover:underline">
                                            View all
                                        </button>
                                    </div>
                                    <div className="space-y-2">
                                        {driverTransactions.slice(0, 3).map((tx) => (
                                            <div key={tx.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/60 flex items-center justify-between text-xs">
                                                <div>
                                                    <span className="font-semibold text-slate-200 block">{tx.description}</span>
                                                    <span className="text-[10px] text-slate-500 font-mono">{tx.ref} • {tx.date}</span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`font-bold ${tx.type === 'savings' ? 'text-emerald-400' : 'text-slate-200'}`}>
                                                        KES {tx.amount.toLocaleString()}
                                                    </span>
                                                    <span className="block text-[10px] text-emerald-400/80 font-medium">✓ Verified</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ═════════════════════════════════════════════════════ */}
                        {/* TAB 2: DAILY PAYMENTS & M-PESA STK */}
                        {/* ═════════════════════════════════════════════════════ */}
                        {activeTab === 'pay' && (
                            <div className="space-y-4">
                                <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                                    <div className="flex items-center gap-2 mb-1">
                                        <CheckCircleIcon className="w-4 h-4 text-emerald-400" />
                                        <h4 className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                                            Daily Remittance &amp; M-Pesa STK Push
                                        </h4>
                                    </div>
                                    <p className="text-xs text-slate-300">
                                        Clear your daily route fee and make voluntary savings in one tap. Your M-Pesa phone will prompt for PIN.
                                    </p>
                                </div>

                                {/* Payment Breakdown Card */}
                                <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                        Select Remittance Items:
                                    </span>

                                    {/* 1. Daily Stage Levy */}
                                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                checked={includeDailyLevy}
                                                onChange={(e) => setIncludeDailyLevy(e.target.checked)}
                                                className="w-4 h-4 text-emerald-500 rounded focus:ring-0 bg-slate-900 border-slate-700"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-white block">Daily Stage Levy</span>
                                                <span className="text-[10px] text-slate-400">Route operations &amp; marshal fee</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-white font-mono">KES {dailyLevyAmount}</span>
                                    </label>

                                    {/* 2. Driver Welfare */}
                                    <label className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800 cursor-pointer">
                                        <div className="flex items-center gap-2.5">
                                            <input
                                                type="checkbox"
                                                checked={includeWelfare}
                                                onChange={(e) => setIncludeWelfare(e.target.checked)}
                                                className="w-4 h-4 text-emerald-500 rounded focus:ring-0 bg-slate-900 border-slate-700"
                                            />
                                            <div>
                                                <span className="text-xs font-bold text-white block">Driver Welfare Fund</span>
                                                <span className="text-[10px] text-slate-400">Medical emergency &amp; roadside support</span>
                                            </div>
                                        </div>
                                        <span className="text-xs font-bold text-white font-mono">KES {welfareAmount}</span>
                                    </label>

                                    {/* 3. Voluntary SACCO Savings */}
                                    <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                                        <div className="flex items-center justify-between">
                                            <label className="flex items-center gap-2.5 cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={includeSavingsDeposit}
                                                    onChange={(e) => setIncludeSavingsDeposit(e.target.checked)}
                                                    className="w-4 h-4 text-emerald-500 rounded focus:ring-0 bg-slate-900 border-slate-700"
                                                />
                                                <div>
                                                    <span className="text-xs font-bold text-white block">Voluntary SACCO Savings</span>
                                                    <span className="text-[10px] text-emerald-400">Builds loan borrowing limit (3x)</span>
                                                </div>
                                            </label>
                                            <span className="text-xs font-bold text-emerald-400 font-mono">
                                                KES {customSavingsAmount}
                                            </span>
                                        </div>

                                        {includeSavingsDeposit && (
                                            <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                                                <span className="text-[11px] text-slate-400">Quick:</span>
                                                {[200, 300, 500, 1000].map(amt => (
                                                    <button
                                                        key={amt}
                                                        type="button"
                                                        onClick={() => setCustomSavingsAmount(amt)}
                                                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-lg border transition-all ${
                                                            customSavingsAmount === amt
                                                                ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                                                        }`}
                                                    >
                                                        KES {amt}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Total Payable Summary */}
                                <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 to-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                                    <div>
                                        <span className="text-xs text-slate-400 block">Total Today Remittance:</span>
                                        <span className="text-2xl font-black text-white">
                                            KES {totalPaymentAmount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="text-right text-[11px] text-slate-400">
                                        <span>Target Vehicle:</span>
                                        <span className="block font-bold text-emerald-400 font-mono text-xs">
                                            {activeDriver?.vehicleRegNumber}
                                        </span>
                                    </div>
                                </div>

                                {/* Phone number prompt & Button */}
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-slate-400 block">
                                        M-Pesa Safaricom Mobile Line:
                                    </label>
                                    <div className="relative">
                                        <PhoneIcon className="w-4 h-4 text-emerald-400 absolute left-3 top-3" />
                                        <input
                                            type="tel"
                                            value={mpesaPhoneNumber}
                                            onChange={(e) => setMpesaPhoneNumber(e.target.value)}
                                            placeholder="07XX XXX XXX"
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                                        />
                                    </div>
                                </div>

                                <button
                                    onClick={handleTriggerStkPush}
                                    disabled={totalPaymentAmount <= 0}
                                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                                >
                                    <div className="w-5 h-5 rounded-full bg-slate-950 text-emerald-400 flex items-center justify-center font-bold text-xs">
                                        M
                                    </div>
                                    Pay KES {totalPaymentAmount.toLocaleString()} via M-Pesa STK Push
                                </button>
                            </div>
                        )}

                        {/* ═════════════════════════════════════════════════════ */}
                        {/* TAB 3: LOAN APPLICATION & ELIGIBILITY */}
                        {/* ═════════════════════════════════════════════════════ */}
                        {activeTab === 'loans' && (
                            <div className="space-y-4">
                                {/* Rule Threshold Verification Card */}
                                <div className={`p-4 rounded-2xl border ${
                                    isLoanQualified 
                                        ? 'bg-emerald-950/20 border-emerald-500/30' 
                                        : 'bg-amber-950/20 border-amber-500/30'
                                }`}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheckIcon className={`w-5 h-5 ${isLoanQualified ? 'text-emerald-400' : 'text-amber-400'}`} />
                                            <div>
                                                <h4 className="text-xs font-bold text-white">SACCO Driver Credit Desk</h4>
                                                <p className="text-[11px] text-slate-400">Savings-based cooperative financing</p>
                                            </div>
                                        </div>
                                        {isLoanQualified ? (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                ✓ Qualified
                                            </span>
                                        ) : (
                                            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                                Ineligible
                                            </span>
                                        )}
                                    </div>

                                    {/* Criteria Breakdown */}
                                    <div className="space-y-1.5 text-xs pt-2 border-t border-slate-800">
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Current Savings:</span>
                                            <span className="font-bold text-white">KES {currentSavings.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Driver Qualification Threshold:</span>
                                            <span className="font-bold text-emerald-400">KES {minThreshold.toLocaleString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400">Maximum Borrowing Power (3x):</span>
                                            <span className="font-bold text-indigo-400 text-sm">
                                                KES {maxLoanLimit.toLocaleString()}
                                            </span>
                                        </div>
                                    </div>

                                    {!isLoanQualified && (
                                        <div className="mt-3 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                                            <ExclamationTriangleIcon className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                            <div>
                                                <strong>Notice:</strong> As per SACCO policy, drivers must hold at least KES {minThreshold.toLocaleString()} in savings to unlock credit. You need <strong>KES {savingsShortfall.toLocaleString()}</strong> more to qualify.
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {loanApplicationSuccess && (
                                    <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs text-emerald-300 flex items-center justify-between">
                                        <span>{loanApplicationSuccess}</span>
                                        <button onClick={() => setLoanApplicationSuccess(null)} className="text-white hover:text-emerald-400">
                                            <XIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}

                                {/* Loan Calculator Form (if qualified or for simulation) */}
                                <form onSubmit={handleApplyLoanSubmit} className="space-y-3 p-4 rounded-2xl bg-slate-900 border border-slate-800">
                                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                                        Configure Loan Request:
                                    </span>

                                    {/* Amount Slider */}
                                    <div>
                                        <div className="flex items-center justify-between text-xs mb-1">
                                            <span className="text-slate-400">Loan Amount:</span>
                                            <span className="text-base font-black text-emerald-400 font-mono">
                                                KES {appliedLoanAmount.toLocaleString()}
                                            </span>
                                        </div>
                                        <input
                                            type="range"
                                            min={1000}
                                            max={Math.max(5000, maxLoanLimit || 50000)}
                                            step={500}
                                            value={appliedLoanAmount}
                                            onChange={(e) => setAppliedLoanAmount(Number(e.target.value))}
                                            className="w-full accent-emerald-500 h-2 bg-slate-950 rounded-lg cursor-pointer"
                                        />
                                        <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                                            <span>KES 1,000</span>
                                            <span>Max: KES {maxLoanLimit.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    {/* Tenure Chips */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 block mb-1.5">
                                            Repayment Tenure (Months):
                                        </label>
                                        <div className="grid grid-cols-4 gap-1.5">
                                            {[3, 6, 12, 18].map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setLoanTenureMonths(m)}
                                                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                                                        loanTenureMonths === m
                                                            ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30'
                                                            : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                                                    }`}
                                                >
                                                    {m} Mos
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Loan Purpose */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 block mb-1">
                                            Loan Purpose:
                                        </label>
                                        <select
                                            value={loanPurpose}
                                            onChange={(e) => setLoanPurpose(e.target.value as any)}
                                            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                                        >
                                            <option value="emergency_repairs">Emergency Vehicle Repairs / Tyres</option>
                                            <option value="school_fees">School Fees Assistance</option>
                                            <option value="asset_financing">Asset &amp; Matatu Share Financing</option>
                                            <option value="welfare">Family Medical &amp; Welfare</option>
                                        </select>
                                    </div>

                                    {/* Guarantor Details */}
                                    <div>
                                        <label className="text-xs font-medium text-slate-400 block mb-1">
                                            SACCO Guarantor:
                                        </label>
                                        <input
                                            type="text"
                                            value={guarantorPhone1}
                                            onChange={(e) => setGuarantorPhone1(e.target.value)}
                                            className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                                            placeholder="Fellow SACCO Member Name / Reg"
                                        />
                                    </div>

                                    {/* Repayment Breakdown Box */}
                                    <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5">
                                        <div className="flex justify-between text-slate-400">
                                            <span>Monthly Installment (EMI):</span>
                                            <span className="font-bold text-emerald-400 text-sm">
                                                KES {loanCalculation.monthlyPayment.toLocaleString()}
                                            </span>
                                        </div>
                                        <div className="flex justify-between text-slate-400">
                                            <span>Interest Rate:</span>
                                            <span className="text-slate-200">{interestRateAnnual}% p.a. ({calculationMethod === 'reducing_balance' ? 'Reducing Balance' : 'Flat Rate'})</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400">
                                            <span>Appraisal Fee (1.5%):</span>
                                            <span className="text-slate-200">KES {loanCalculation.processingFee.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between text-slate-400 pt-1 border-t border-slate-800">
                                            <span className="font-semibold text-white">Total Repayable:</span>
                                            <span className="font-bold text-white">KES {loanCalculation.totalPayable.toLocaleString()}</span>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={!isLoanQualified || isSubmittingLoan}
                                        className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                                            isLoanQualified 
                                                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white shadow-indigo-600/30' 
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        }`}
                                    >
                                        {isSubmittingLoan ? (
                                            <>
                                                <ArrowPathIcon className="w-4 h-4 animate-spin" />
                                                <span>Submitting to Credit Desk...</span>
                                            </>
                                        ) : (
                                            <>
                                                <ZapIcon className="w-4 h-4" />
                                                <span>Request Instant Loan to M-Pesa</span>
                                            </>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ═════════════════════════════════════════════════════ */}
                        {/* TAB 4: STATEMENTS & AUDIT LEDGER */}
                        {/* ═════════════════════════════════════════════════════ */}
                        {activeTab === 'statements' && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                                        SACCO Statements &amp; Receipts
                                    </h4>
                                    <button
                                        onClick={() => {
                                            alert(`Exporting complete official SACCO statement for ${activeDriver?.memberName} (${activeDriver?.vehicleRegNumber}). PDF downloaded!`);
                                        }}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-emerald-400 font-semibold transition-all"
                                    >
                                        <DownloadIcon className="w-3.5 h-3.5" />
                                        <span>Download PDF</span>
                                    </button>
                                </div>

                                {/* Filter Chips */}
                                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                                    {[
                                        { id: 'all', label: 'All Entries' },
                                        { id: 'remittance', label: 'Remittances' },
                                        { id: 'savings', label: 'Savings' },
                                        { id: 'loan', label: 'Loans' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setStatementFilter(tab.id as any)}
                                            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                                                statementFilter === tab.id
                                                    ? 'bg-emerald-500 text-slate-950 font-bold'
                                                    : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                                            }`}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Statements List */}
                                <div className="space-y-2">
                                    {filteredTransactions.map((tx) => (
                                        <div key={tx.id} className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/80 space-y-2">
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <span className="text-xs font-bold text-white block">{tx.description}</span>
                                                    <span className="text-[11px] text-slate-400 font-mono">
                                                        Ref: {tx.ref} • {tx.date}
                                                    </span>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-sm font-black ${
                                                        tx.type === 'savings' ? 'text-emerald-400' : 'text-slate-100'
                                                    }`}>
                                                        KES {tx.amount.toLocaleString()}
                                                    </span>
                                                    <span className="block text-[10px] text-emerald-400 font-semibold">
                                                        ✓ {tx.status}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-[11px]">
                                                <span className="text-slate-500">Method: M-Pesa Daraja</span>
                                                <button
                                                    onClick={() => setPaymentReceiptModal({
                                                        id: tx.id,
                                                        mpesaRef: tx.ref,
                                                        date: tx.date,
                                                        amountPaid: tx.amount,
                                                        vehicleRegNumber: activeDriver?.vehicleRegNumber,
                                                        memberName: activeDriver?.memberName,
                                                        tierName: tx.description
                                                    })}
                                                    className="text-emerald-400 hover:underline font-medium flex items-center gap-1"
                                                >
                                                    <DocumentTextIcon className="w-3.5 h-3.5" />
                                                    View Receipt
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* ═════════════════════════════════════════════════════ */}
                        {/* TAB 5: SUPPORT & HELPDESK */}
                        {/* ═════════════════════════════════════════════════════ */}
                        {activeTab === 'support' && (
                            <div className="space-y-3">
                                <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                                        SACCO Emergency Hotlines
                                    </h4>
                                    <p className="text-xs text-slate-400">
                                        Direct priority lines for vehicle breakdowns, stage disputes, or insurance assistance.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    {[
                                        { title: 'Stage Marshal Dispatch', phone: '+254 700 123 456', desc: 'Route clearance & queue coordination' },
                                        { title: 'Towing & Roadside Breakdown', phone: '+254 711 999 888', desc: 'Emergency mechanical & puncture recovery' },
                                        { title: 'SACCO Credit & Welfare Desk', phone: '+254 722 345 678', desc: 'Loan enquiries & M-Pesa deposit clearance' }
                                    ].map((hotline, idx) => (
                                        <div key={idx} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
                                            <div>
                                                <span className="text-xs font-bold text-white block">{hotline.title}</span>
                                                <span className="text-[10px] text-slate-400">{hotline.desc}</span>
                                            </div>
                                            <a
                                                href={`tel:${hotline.phone}`}
                                                className="px-3 py-1.5 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5"
                                            >
                                                <PhoneIcon className="w-3.5 h-3.5" />
                                                Call
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bottom App Navigation Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur-lg px-4 flex items-center justify-around z-20">
                        {[
                            { id: 'home', label: 'Home', icon: TruckIcon },
                            { id: 'pay', label: 'Pay Daily', icon: CreditCardIcon },
                            { id: 'loans', label: 'Loans', icon: ZapIcon },
                            { id: 'statements', label: 'Statements', icon: DocumentTextIcon },
                            { id: 'support', label: 'Support', icon: PhoneIcon }
                        ].map((item) => {
                            const IconComponent = item.icon;
                            const isActive = activeTab === item.id;
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveTab(item.id as any)}
                                    className={`flex flex-col items-center justify-center transition-all ${
                                        isActive ? 'text-emerald-400 scale-105' : 'text-slate-500 hover:text-slate-300'
                                    }`}
                                >
                                    <IconComponent className="w-5 h-5 mb-0.5" />
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                    {isActive && <div className="w-1 h-1 rounded-full bg-emerald-400 mt-0.5"></div>}
                                </button>
                            );
                        })}
                    </div>

                    {/* M-Pesa STK Prompt Modal Simulation */}
                    {isStkPromptOpen && (
                        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                            <div className="w-full max-w-xs bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 shadow-2xl text-center space-y-4">
                                <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 border-2 border-emerald-500/40 flex items-center justify-center text-emerald-400 font-black text-xl">
                                    M
                                </div>

                                {stkStatus === 'sending' && (
                                    <>
                                        <h4 className="text-sm font-bold text-white">Sending STK Push...</h4>
                                        <p className="text-xs text-slate-400">Prompting Safaricom M-Pesa on {mpesaPhoneNumber}...</p>
                                        <ArrowPathIcon className="w-6 h-6 text-emerald-400 mx-auto animate-spin" />
                                    </>
                                )}

                                {stkStatus === 'waiting_pin' && (
                                    <>
                                        <h4 className="text-sm font-bold text-white">Enter M-Pesa PIN</h4>
                                        <p className="text-xs text-slate-300">
                                            Pay <strong>KES {totalPaymentAmount.toLocaleString()}</strong> to {currentInstitution?.name || 'SACCO'}
                                        </p>
                                        <div className="flex justify-center gap-2 my-2">
                                            {[1, 2, 3, 4].map(dot => (
                                                <div key={dot} className="w-3 h-3 rounded-full bg-slate-700"></div>
                                            ))}
                                        </div>
                                        <button
                                            onClick={handleConfirmStkPin}
                                            className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs shadow-lg"
                                        >
                                            Confirm PIN &amp; Pay
                                        </button>
                                    </>
                                )}

                                {stkStatus === 'success' && (
                                    <>
                                        <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                                        <h4 className="text-sm font-bold text-white">Payment Confirmed!</h4>
                                        <p className="text-xs text-emerald-300">Transit Clearance Activated</p>
                                    </>
                                )}

                                <button
                                    onClick={() => setIsStkPromptOpen(false)}
                                    className="text-xs text-slate-500 hover:text-slate-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Digital Receipt Modal */}
                    {paymentReceiptModal && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                            <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-3xl p-5 shadow-2xl space-y-3">
                                <div className="text-center">
                                    <div className="w-10 h-10 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-1">
                                        <CheckCircleIcon className="w-6 h-6" />
                                    </div>
                                    <h4 className="text-sm font-bold text-white uppercase tracking-tight">Official Transit Receipt</h4>
                                    <p className="text-[11px] text-slate-400">{currentInstitution?.name}</p>
                                </div>

                                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1 font-mono">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">M-Pesa Ref:</span>
                                        <span className="text-white font-bold">{paymentReceiptModal.mpesaRef}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Vehicle:</span>
                                        <span className="text-emerald-400">{paymentReceiptModal.vehicleRegNumber}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Driver:</span>
                                        <span className="text-white">{paymentReceiptModal.memberName}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Amount Paid:</span>
                                        <span className="text-emerald-400 font-bold">KES {paymentReceiptModal.amountPaid?.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Status:</span>
                                        <span className="text-emerald-400 font-bold">CLEARED TODAY</span>
                                    </div>
                                </div>

                                <div className="text-center">
                                    <div className="inline-block p-2 bg-white rounded-lg">
                                        <QrCodeIcon className="w-16 h-16 text-black" />
                                    </div>
                                    <span className="block text-[10px] text-slate-500 mt-1">Anti-tamper digital pass</span>
                                </div>

                                <button
                                    onClick={() => setPaymentReceiptModal(null)}
                                    className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
                                >
                                    Dismiss Receipt
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
