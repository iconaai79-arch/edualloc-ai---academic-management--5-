import React, { useState, useEffect, useMemo } from 'react';
import type { User, Institution, CompanyDetails } from '../../types';
import { apiService } from '../../services/apiService';
import { PayNowModal } from '../PayNowModal';
import type {
    EduSaccoMember,
    EduSaccoLoanProduct,
    EduSaccoLoan,
    EduSaccoTransaction,
    EduSaccoGuarantor
} from './EduStaffSaccoManager';
import { WalletIcon } from '../icons/WalletIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';
import { XIcon } from '../icons/XIcon';

interface StaffSaccoSelfServicePanelProps {
    currentUser: User;
    institution?: Institution | null;
    companyDetails?: CompanyDetails;
}

const DEFAULT_PRODUCTS = (instId: string): EduSaccoLoanProduct[] => [
    {
        id: `sacco_prod_emergency_${instId}`,
        institutionId: instId,
        name: 'Emergency Staff Loan',
        savingsMultiplier: 1,
        monthlyInterestRate: 1.0,
        interestType: 'reducing',
        maxMonths: 6,
        processingFeePercent: 1,
        isActive: true
    },
    {
        id: `sacco_prod_dev_${instId}`,
        institutionId: instId,
        name: 'Normal / Development Loan',
        savingsMultiplier: 3,
        monthlyInterestRate: 1.0,
        interestType: 'reducing',
        maxMonths: 24,
        processingFeePercent: 1.5,
        isActive: true
    },
    {
        id: `sacco_prod_fees_${instId}`,
        institutionId: instId,
        name: 'School Fees / Salary Advance',
        savingsMultiplier: 1.5,
        monthlyInterestRate: 1.5,
        interestType: 'flat',
        maxMonths: 12,
        processingFeePercent: 1,
        isActive: true
    }
];

const computeLoanMath = (
    principal: number,
    monthlyRatePct: number,
    months: number,
    interestType: 'reducing' | 'flat',
    processingFeePct: number
) => {
    const p = Math.max(0, Number(principal) || 0);
    const m = Math.max(1, Math.floor(Number(months) || 1));
    const r = Math.max(0, Number(monthlyRatePct) || 0) / 100;
    const processingFee = Math.round((p * Math.max(0, Number(processingFeePct) || 0)) / 100);
    const totalInterest = interestType === 'flat'
        ? Math.round(p * r * m)
        : Math.round(p * r * ((m + 1) / 2));
    const totalRepayable = p + totalInterest;
    const monthlyInstallment = Math.ceil(totalRepayable / m);
    return { processingFee, totalInterest, totalRepayable, monthlyInstallment };
};

export const StaffSaccoSelfServicePanel: React.FC<StaffSaccoSelfServicePanelProps> = ({
    currentUser,
    institution,
    companyDetails
}) => {
    const instId = institution?.id || currentUser?.institutionId || 'default_inst';
    const instName = institution?.name || 'School';

    const [allMembers, setAllMembers] = useState<EduSaccoMember[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_sacco_members_${instId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    });
    const [products, setProducts] = useState<EduSaccoLoanProduct[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_sacco_products_${instId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return DEFAULT_PRODUCTS(instId);
    });
    const [allLoans, setAllLoans] = useState<EduSaccoLoan[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_sacco_loans_${instId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    });
    const [allTxns, setAllTxns] = useState<EduSaccoTransaction[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_sacco_txns_${instId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    });

    const [banner, setBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Self-Enrollment Form
    const [joinMonthlyContrib, setJoinMonthlyContrib] = useState<number>(2000);
    const [joinKinName, setJoinKinName] = useState('');
    const [joinKinPhone, setJoinKinPhone] = useState('');
    const [isJoining, setIsJoining] = useState(false);

    // Self-Service Loan Application Modal
    const [isApplyLoanOpen, setIsApplyLoanOpen] = useState(false);
    const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
    const [loanAmount, setLoanAmount] = useState<number>(5000);
    const [loanMonths, setLoanMonths] = useState<number>(6);
    const [loanPurpose, setLoanPurpose] = useState('');
    const [selectedGuarantorIds, setSelectedGuarantorIds] = useState<string[]>([]);

    // Self-Service Savings Top-Up / STK Push State
    const [isTopUpOpen, setIsTopUpOpen] = useState(false);
    const [topUpAmount, setTopUpAmount] = useState('');
    const [topUpMode, setTopUpMode] = useState<'stk_push' | 'mpesa' | 'ncba' | 'bank'>('stk_push');
    const [topUpRef, setTopUpRef] = useState('');
    const [stkPayContext, setStkPayContext] = useState<{
        kind: 'savings' | 'loan_repayment';
        amount: number;
        loan?: EduSaccoLoan;
        label: string;
    } | null>(null);
    const [guarantorOtpInputs, setGuarantorOtpInputs] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!instId) return;
        apiService.fetchModuleRecords<EduSaccoMember>('edu_sacco_members', instId)
            .then(recs => {
                if (Array.isArray(recs)) {
                    setAllMembers(recs);
                    try { localStorage.setItem(`eduai_sacco_members_${instId}`, JSON.stringify(recs)); } catch (_) {}
                }
            }).catch(() => {});

        apiService.fetchModuleRecords<EduSaccoLoanProduct>('edu_sacco_loan_products', instId)
            .then(recs => {
                if (Array.isArray(recs) && recs.length > 0) {
                    setProducts(recs);
                    try { localStorage.setItem(`eduai_sacco_products_${instId}`, JSON.stringify(recs)); } catch (_) {}
                }
            }).catch(() => {});

        apiService.fetchModuleRecords<EduSaccoLoan>('edu_sacco_loans', instId)
            .then(recs => {
                if (Array.isArray(recs)) {
                    setAllLoans([...recs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                    try { localStorage.setItem(`eduai_sacco_loans_${instId}`, JSON.stringify(recs)); } catch (_) {}
                }
            }).catch(() => {});

        apiService.fetchModuleRecords<EduSaccoTransaction>('edu_sacco_txns', instId)
            .then(recs => {
                if (Array.isArray(recs)) {
                    setAllTxns([...recs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                    try { localStorage.setItem(`eduai_sacco_txns_${instId}`, JSON.stringify(recs)); } catch (_) {}
                }
            }).catch(() => {});
    }, [instId]);

    const showBanner = (type: 'success' | 'error', text: string) => {
        setBanner({ type, text });
        setTimeout(() => setBanner(null), 4000);
    };

    const myMember = useMemo(() => {
        return allMembers.find(
            m => m.userId === currentUser.id || (currentUser.email && m.email && m.email.toLowerCase() === currentUser.email.toLowerCase())
        ) || null;
    }, [allMembers, currentUser]);

    const myLoans = useMemo(
        () => (myMember ? allLoans.filter(l => l.memberId === myMember.id) : []),
        [allLoans, myMember]
    );

    const myTxns = useMemo(
        () => (myMember ? allTxns.filter(t => t.memberId === myMember.id) : []),
        [allTxns, myMember]
    );

    const otherMembers = useMemo(
        () => allMembers.filter(m => m.status === 'active' && (!myMember || m.id !== myMember.id)),
        [allMembers, myMember]
    );

    const activeLoanBalance = useMemo(
        () => myLoans.filter(l => l.status === 'active').reduce((s, l) => s + (Number(l.balanceRemaining) || 0), 0),
        [myLoans]
    );

    const pendingGuarantorRequests = useMemo(() => {
        if (!myMember) return [];
        return allLoans.filter(
            l => (l.status === 'pending_approval' || l.status === 'active') &&
                (l.guarantors || []).some(g => g.memberId === myMember.id && (g.status || 'pending') === 'pending')
        );
    }, [allLoans, myMember]);

    const lockedGuarantorAmount = useMemo(() => {
        if (!myMember) return 0;
        return allLoans
            .filter(l => l.status === 'active' || l.status === 'pending_approval')
            .reduce((sum, l) => {
                const g = (l.guarantors || []).find(x => x.memberId === myMember.id && x.status === 'accepted');
                return sum + (g ? Number(g.guaranteedAmount) || 0 : 0);
            }, 0);
    }, [allLoans, myMember]);

    const handleRespondGuarantorRequest = async (loan: EduSaccoLoan, decision: 'accepted' | 'declined') => {
        if (!myMember) return;
        const entry = (loan.guarantors || []).find(g => g.memberId === myMember.id);
        if (!entry) return;

        if (decision === 'accepted' && entry.otpCode) {
            const entered = (guarantorOtpInputs[loan.id] || '').trim();
            if (entered !== entry.otpCode) {
                showBanner('error', 'Invalid 6-digit SMS OTP. Enter the OTP sent to your phone to confirm guarantee.');
                return;
            }
        }

        const updatedLoan: EduSaccoLoan = {
            ...loan,
            guarantors: (loan.guarantors || []).map(g =>
                g.memberId === myMember.id
                    ? { ...g, status: decision, acceptedAt: decision === 'accepted' ? new Date().toISOString() : undefined }
                    : g
            )
        };
        const nextLoans = allLoans.map(l => (l.id === loan.id ? updatedLoan : l));
        setAllLoans(nextLoans);
        try { localStorage.setItem(`eduai_sacco_loans_${instId}`, JSON.stringify(nextLoans)); } catch (_) {}
        await apiService.saveModuleRecord('edu_sacco_loans', updatedLoan).catch(() => {});
        showBanner(
            'success',
            decision === 'accepted'
                ? `Confirmed guarantee of KES ${entry.guaranteedAmount.toLocaleString()} for ${loan.memberName}.`
                : `Declined guarantee request from ${loan.memberName}.`
        );
    };

    const handleStkPushSuccess = async (receiptRef?: string) => {
        if (!stkPayContext || !myMember) return;
        const nowIso = new Date().toISOString();
        const ref = receiptRef || `STK-${Date.now().toString().slice(-6)}`;

        if (stkPayContext.kind === 'savings') {
            const updatedMember: EduSaccoMember = {
                ...myMember,
                savingsBalance: myMember.savingsBalance + stkPayContext.amount,
                updatedAt: nowIso
            };
            const tx: EduSaccoTransaction = {
                id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                institutionId: instId,
                memberId: myMember.id,
                memberName: myMember.name,
                memberNumber: myMember.memberNumber,
                type: 'savings_deposit',
                amount: stkPayContext.amount,
                mode: 'ncba',
                reference: ref,
                notes: 'Self-Service STK Push Savings Top-Up',
                recordedBy: currentUser.name,
                createdAt: nowIso
            };
            const nextMembers = allMembers.map(m => (m.id === updatedMember.id ? updatedMember : m));
            const nextTxns = [tx, ...allTxns];
            setAllMembers(nextMembers);
            setAllTxns(nextTxns);
            try {
                localStorage.setItem(`eduai_sacco_members_${instId}`, JSON.stringify(nextMembers));
                localStorage.setItem(`eduai_sacco_txns_${instId}`, JSON.stringify(nextTxns));
            } catch (_) {}
            await apiService.saveModuleRecord('edu_sacco_members', updatedMember).catch(() => {});
            await apiService.saveModuleRecord('edu_sacco_txns', tx).catch(() => {});
            showBanner('success', `STK Push confirmed! KES ${stkPayContext.amount.toLocaleString()} added to your SACCO savings (Ref: ${ref}).`);
        } else if (stkPayContext.kind === 'loan_repayment' && stkPayContext.loan) {
            const targetLoan = stkPayContext.loan;
            const nextPaid = targetLoan.amountPaid + stkPayContext.amount;
            const nextBal = Math.max(0, targetLoan.totalRepayable - nextPaid);
            const updatedLoan: EduSaccoLoan = {
                ...targetLoan,
                amountPaid: nextPaid,
                balanceRemaining: nextBal,
                status: nextBal <= 0 ? 'cleared' : 'active'
            };
            const tx: EduSaccoTransaction = {
                id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
                institutionId: instId,
                memberId: myMember.id,
                memberName: myMember.name,
                memberNumber: myMember.memberNumber,
                type: 'loan_repayment',
                amount: stkPayContext.amount,
                mode: 'ncba',
                reference: ref,
                notes: `Self-Service STK Loan Repayment (${targetLoan.productName})`,
                recordedBy: currentUser.name,
                createdAt: nowIso
            };
            const nextLoans = allLoans.map(l => (l.id === updatedLoan.id ? updatedLoan : l));
            const nextTxns = [tx, ...allTxns];
            setAllLoans(nextLoans);
            setAllTxns(nextTxns);
            try {
                localStorage.setItem(`eduai_sacco_loans_${instId}`, JSON.stringify(nextLoans));
                localStorage.setItem(`eduai_sacco_txns_${instId}`, JSON.stringify(nextTxns));
            } catch (_) {}
            await apiService.saveModuleRecord('edu_sacco_loans', updatedLoan).catch(() => {});
            await apiService.saveModuleRecord('edu_sacco_txns', tx).catch(() => {});
            showBanner('success', `Loan repayment of KES ${stkPayContext.amount.toLocaleString()} confirmed (Ref: ${ref})! Remaining: KES ${nextBal.toLocaleString()}.`);
        }
        setStkPayContext(null);
        setIsTopUpOpen(false);
        setTopUpAmount('');
    };

    const handleSelfJoinSacco = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsJoining(true);
        try {
            const nowIso = new Date().toISOString();
            const memberNumber = `SAC-${String(allMembers.length + 1).padStart(4, '0')}`;
            const newMember: EduSaccoMember = {
                id: `sacco_mem_${currentUser.id}`,
                institutionId: instId,
                userId: currentUser.id,
                memberNumber,
                name: currentUser.name,
                role: currentUser.role || 'staff',
                phoneNumber: (currentUser as any).phoneNumber || (currentUser as any).phone || '',
                email: currentUser.email,
                shareCapital: 0,
                savingsBalance: 0,
                monthlyContribution: Math.max(0, Number(joinMonthlyContrib) || 0),
                nextOfKinName: joinKinName.trim(),
                nextOfKinPhone: joinKinPhone.trim(),
                status: 'active',
                joinedAt: nowIso,
                updatedAt: nowIso
            };
            const next = [newMember, ...allMembers];
            setAllMembers(next);
            try { localStorage.setItem(`eduai_sacco_members_${instId}`, JSON.stringify(next)); } catch (_) {}
            await apiService.saveModuleRecord('edu_sacco_members', newMember).catch(() => {});
            showBanner('success', `Welcome to ${instName} Staff SACCO! Your Member Number is ${memberNumber}.`);
        } finally {
            setIsJoining(false);
        }
    };

    const handleSelfApplyLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myMember) return;
        const product = products.find(p => p.id === selectedProductId) || products[0];
        if (!product) return;

        const maxAllowed = myMember.savingsBalance * product.savingsMultiplier;
        if (loanAmount <= 0) {
            showBanner('error', 'Enter a valid loan amount.');
            return;
        }
        if (loanAmount > maxAllowed) {
            showBanner('error', `Requested KES ${loanAmount.toLocaleString()} exceeds your ${product.savingsMultiplier}× savings eligibility (Max: KES ${maxAllowed.toLocaleString()}).`);
            return;
        }

        const months = Math.max(1, Math.min(product.maxMonths, Math.floor(loanMonths)));
        const math = computeLoanMath(loanAmount, product.monthlyInterestRate, months, product.interestType, product.processingFeePercent);
        const guarantors: EduSaccoGuarantor[] = selectedGuarantorIds
            .map(id => allMembers.find(m => m.id === id))
            .filter(Boolean)
            .map(g => ({
                memberId: g!.id,
                memberName: g!.name,
                phoneNumber: g!.phoneNumber,
                guaranteedAmount: Math.round(loanAmount / Math.max(1, selectedGuarantorIds.length)),
                status: 'pending' as const,
                otpCode: String(Math.floor(100000 + Math.random() * 900000))
            }));

        // Dispatch SMS OTP consent prompt to each selected guarantor
        for (const g of guarantors) {
            if (g.phoneNumber) {
                const msg = `${instName} Staff SACCO: ${myMember.name} listed you to guarantee KES ${g.guaranteedAmount.toLocaleString()} for a ${product.name}. Approve in My SACCO using OTP: ${g.otpCode}.`;
                fetch('/api/integrations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'sendSms', recipient: g.phoneNumber, phone: g.phoneNumber, message: msg, institutionId: instId })
                }).catch(() => {});
            }
        }

        const newLoan: EduSaccoLoan = {
            id: `sacco_loan_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            institutionId: instId,
            memberId: myMember.id,
            memberName: myMember.name,
            memberNumber: myMember.memberNumber,
            productId: product.id,
            productName: product.name,
            principal: loanAmount,
            interestRate: product.monthlyInterestRate,
            interestType: product.interestType,
            months,
            processingFee: math.processingFee,
            totalInterest: math.totalInterest,
            totalRepayable: math.totalRepayable,
            monthlyInstallment: math.monthlyInstallment,
            amountPaid: 0,
            balanceRemaining: math.totalRepayable,
            guarantors,
            status: 'pending_approval',
            purpose: loanPurpose.trim() || product.name,
            createdAt: new Date().toISOString()
        };

        const nextLoans = [newLoan, ...allLoans];
        setAllLoans(nextLoans);
        try { localStorage.setItem(`eduai_sacco_loans_${instId}`, JSON.stringify(nextLoans)); } catch (_) {}
        await apiService.saveModuleRecord('edu_sacco_loans', newLoan).catch(() => {});

        setIsApplyLoanOpen(false);
        setLoanPurpose('');
        setSelectedGuarantorIds([]);
        showBanner('success', `Loan application of KES ${loanAmount.toLocaleString()} submitted to the SACCO Committee for approval!`);
    };

    const handleSelfDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!myMember) return;
        const amt = Number(topUpAmount);
        if (Number.isNaN(amt) || amt <= 0) {
            showBanner('error', 'Enter a valid deposit amount.');
            return;
        }
        if (topUpMode === 'stk_push') {
            setStkPayContext({
                kind: 'savings',
                amount: amt,
                label: `Staff SACCO Savings Top-Up — ${myMember.name} (${myMember.memberNumber})`
            });
            return;
        }
        const nowIso = new Date().toISOString();
        const updatedMember: EduSaccoMember = {
            ...myMember,
            savingsBalance: myMember.savingsBalance + amt,
            updatedAt: nowIso
        };
        const tx: EduSaccoTransaction = {
            id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            institutionId: instId,
            memberId: myMember.id,
            memberName: myMember.name,
            memberNumber: myMember.memberNumber,
            type: 'savings_deposit',
            amount: amt,
            mode: topUpMode,
            reference: topUpRef.trim() || `SELF-${Date.now().toString().slice(-6)}`,
            notes: 'Member Self-Service Savings Top-Up',
            recordedBy: currentUser.name,
            createdAt: nowIso
        };

        const nextMembers = allMembers.map(m => (m.id === updatedMember.id ? updatedMember : m));
        const nextTxns = [tx, ...allTxns];
        setAllMembers(nextMembers);
        setAllTxns(nextTxns);
        try {
            localStorage.setItem(`eduai_sacco_members_${instId}`, JSON.stringify(nextMembers));
            localStorage.setItem(`eduai_sacco_txns_${instId}`, JSON.stringify(nextTxns));
        } catch (_) {}
        await apiService.saveModuleRecord('edu_sacco_members', updatedMember).catch(() => {});
        await apiService.saveModuleRecord('edu_sacco_txns', tx).catch(() => {});

        setIsTopUpOpen(false);
        setTopUpAmount('');
        setTopUpRef('');
        showBanner('success', `Savings top-up of KES ${amt.toLocaleString()} recorded! New Savings: KES ${updatedMember.savingsBalance.toLocaleString()}.`);
    };

    const printMyStatement = () => {
        if (!myMember) return;
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;
        win.document.write(`
            <html><head><title>My SACCO Statement - ${myMember.name}</title>
            <style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}</style>
            </head><body>
            <h2>${instName} Staff SACCO — Personal Member Statement</h2>
            <p><strong>Member:</strong> ${myMember.name} (${myMember.memberNumber}) • <strong>Monthly Check-Off:</strong> KES ${myMember.monthlyContribution.toLocaleString()}</p>
            <p><strong>Share Capital:</strong> KES ${myMember.shareCapital.toLocaleString()} • <strong>Savings:</strong> KES ${myMember.savingsBalance.toLocaleString()} • <strong>Active Loan Balance:</strong> KES ${activeLoanBalance.toLocaleString()}</p>
            <table><thead><tr><th>Date</th><th>Type</th><th>Mode / Ref</th><th>Notes</th><th>Amount (KES)</th></tr></thead><tbody>
            ${myTxns.map(t => `<tr><td>${new Date(t.createdAt).toLocaleString()}</td><td>${t.type.replace('_', ' ').toUpperCase()}</td><td>${t.mode.toUpperCase()} / ${t.reference}</td><td>${t.notes || '-'}</td><td>KES ${t.amount.toLocaleString()}</td></tr>`).join('')}
            </tbody></table><script>window.print();</script></body></html>
        `);
        win.document.close();
    };

    const selectedProduct = products.find(p => p.id === selectedProductId) || products[0];
    const liveLoanPreview = selectedProduct
        ? computeLoanMath(loanAmount, selectedProduct.monthlyInterestRate, loanMonths, selectedProduct.interestType, selectedProduct.processingFeePercent)
        : null;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Banner Header */}
            <div className="bg-gradient-to-r from-teal-900 via-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-300 flex items-center gap-1.5">
                        <ShieldCheckIcon className="w-4 h-4" /> Staff Self-Service SACCO Portal
                    </span>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2 mt-1">
                        <WalletIcon className="w-7 h-7 text-teal-400" />
                        My Staff SACCO
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                        {myMember
                            ? `Member #${myMember.memberNumber} • Monthly Check-Off: KES ${myMember.monthlyContribution.toLocaleString()}`
                            : `Join ${instName} Staff SACCO to build monthly savings and access low-interest staff loans.`}
                    </p>
                </div>
                {myMember && (
                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            onClick={() => setIsTopUpOpen(true)}
                            className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider cursor-pointer"
                        >
                            + Top Up Savings
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setSelectedProductId(products[0]?.id || '');
                                setIsApplyLoanOpen(true);
                            }}
                            className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider cursor-pointer"
                        >
                            Apply for Loan
                        </button>
                        <button
                            type="button"
                            onClick={printMyStatement}
                            className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-black text-xs uppercase flex items-center gap-1.5 cursor-pointer"
                        >
                            <PrinterIcon className="w-4 h-4" /> Statement
                        </button>
                    </div>
                )}
            </div>

            {banner && (
                <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                    banner.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}>
                    <CheckCircleIcon className="w-4 h-4 shrink-0" />
                    <span>{banner.text}</span>
                </div>
            )}

            {!myMember ? (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm max-w-xl mx-auto space-y-4">
                    <h3 className="text-lg font-black text-slate-900 dark:text-white">Join {instName} Staff SACCO</h3>
                    <p className="text-xs text-slate-500">
                        Activate your Staff SACCO membership to start saving via monthly payroll check-off or M-Pesa and qualify for staff loans up to 3× your savings.
                    </p>
                    <form onSubmit={handleSelfJoinSacco} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Monthly Payroll Check-Off Savings (KES) *</label>
                            <input
                                type="number"
                                min={100}
                                required
                                value={joinMonthlyContrib}
                                onChange={e => setJoinMonthlyContrib(Number(e.target.value) || 0)}
                                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-black"
                            />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Next of Kin Name *</label>
                                <input
                                    type="text"
                                    required
                                    value={joinKinName}
                                    onChange={e => setJoinKinName(e.target.value)}
                                    placeholder="Full Name"
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Next of Kin Phone *</label>
                                <input
                                    type="tel"
                                    required
                                    value={joinKinPhone}
                                    onChange={e => setJoinKinPhone(e.target.value)}
                                    placeholder="07XXXXXXXX"
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={isJoining}
                            className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                            {isJoining ? 'Enrolling...' : 'Activate My Staff SACCO Membership'}
                        </button>
                    </form>
                </div>
            ) : (
                <>
                    {/* Personal Balances */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-teal-600">My Savings</span>
                            <div className="text-xl font-black text-teal-600 mt-1">KES {myMember.savingsBalance.toLocaleString()}</div>
                            {lockedGuarantorAmount > 0 && (
                                <span className="text-[10px] font-bold text-amber-600 block mt-0.5">
                                    Locked Guarantee: KES {lockedGuarantorAmount.toLocaleString()}
                                </span>
                            )}
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-indigo-600">Share Capital</span>
                            <div className="text-xl font-black text-indigo-600 mt-1">KES {myMember.shareCapital.toLocaleString()}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-emerald-600">Max Loan Limit (3×)</span>
                            <div className="text-xl font-black text-emerald-600 mt-1">KES {(myMember.savingsBalance * 3).toLocaleString()}</div>
                        </div>
                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-amber-600">Active Loan Balance</span>
                            <div className="text-xl font-black text-amber-600 mt-1">KES {activeLoanBalance.toLocaleString()}</div>
                        </div>
                    </div>

                    {/* Pending Guarantor OTP Consent Requests */}
                    {pendingGuarantorRequests.length > 0 && (
                        <div className="bg-amber-50 dark:bg-amber-950/30 rounded-3xl border border-amber-200 dark:border-amber-800 p-5 shadow-sm space-y-3">
                            <h3 className="text-sm font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                                <ShieldCheckIcon className="w-5 h-5 text-amber-600" />
                                Guarantor Approval Requests ({pendingGuarantorRequests.length})
                            </h3>
                            {pendingGuarantorRequests.map(loan => {
                                const myG = (loan.guarantors || []).find(g => g.memberId === myMember.id);
                                return (
                                    <div key={loan.id} className="p-4 rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="text-xs space-y-0.5">
                                            <div className="font-black text-slate-900 dark:text-white">
                                                {loan.memberName} requested you to guarantee KES {(myG?.guaranteedAmount || 0).toLocaleString()}
                                            </div>
                                            <div className="text-slate-500">
                                                {loan.productName} • Principal KES {loan.principal.toLocaleString()} ({loan.months} months)
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            {myG?.otpCode && (
                                                <input
                                                    type="text"
                                                    maxLength={6}
                                                    value={guarantorOtpInputs[loan.id] || ''}
                                                    onChange={e => setGuarantorOtpInputs(prev => ({ ...prev, [loan.id]: e.target.value.replace(/\D/g, '') }))}
                                                    placeholder="SMS OTP"
                                                    className="w-24 px-2.5 py-1.5 rounded-lg border border-amber-300 bg-amber-50/40 text-center font-mono font-black text-xs"
                                                />
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => handleRespondGuarantorRequest(loan, 'accepted')}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase cursor-pointer"
                                            >
                                                Verify &amp; Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRespondGuarantorRequest(loan, 'declined')}
                                                className="px-3 py-1.5 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 font-black text-[10px] uppercase cursor-pointer"
                                            >
                                                Decline
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* My Loans */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <BanknotesIcon className="w-5 h-5 text-indigo-600" />
                            My SACCO Loans ({myLoans.length})
                        </h3>
                        {myLoans.length === 0 ? (
                            <p className="text-xs text-slate-400 py-4 text-center">You have no active or pending SACCO loans.</p>
                        ) : (
                            <div className="space-y-3">
                                {myLoans.map(l => {
                                    const pct = l.totalRepayable > 0 ? Math.min(100, Math.round((l.amountPaid / l.totalRepayable) * 100)) : 0;
                                    return (
                                        <div key={l.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 space-y-2">
                                            <div className="flex items-center justify-between flex-wrap gap-2">
                                                <div>
                                                    <span className="font-black text-sm text-slate-900 dark:text-white">{l.productName}</span>
                                                    <span className="text-[11px] text-slate-500 ml-2">
                                                        Principal: KES {l.principal.toLocaleString()} • {l.months} mo • KES {l.monthlyInstallment.toLocaleString()}/mo
                                                    </span>
                                                </div>
                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                    l.status === 'active' ? 'bg-indigo-100 text-indigo-700' : l.status === 'cleared' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                    {l.status.replace('_', ' ')}
                                                </span>
                                            </div>
                                            <div className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                                            </div>
                                            <div className="flex justify-between items-center text-[11px] font-bold text-slate-500">
                                                <span>Paid: KES {l.amountPaid.toLocaleString()} ({pct}%)</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-amber-600">Remaining: KES {l.balanceRemaining.toLocaleString()}</span>
                                                    {l.status === 'active' && l.balanceRemaining > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setStkPayContext({
                                                                kind: 'loan_repayment',
                                                                loan: l,
                                                                amount: Math.min(l.monthlyInstallment, l.balanceRemaining),
                                                                label: `SACCO Loan Installment — ${l.productName} (${myMember.memberNumber})`
                                                            })}
                                                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase cursor-pointer"
                                                        >
                                                            Pay Now (STK)
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* My Transaction History */}
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-5 shadow-sm space-y-3">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">My SACCO Transactions ({myTxns.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-2.5">Date</th>
                                        <th className="p-2.5">Type</th>
                                        <th className="p-2.5">Mode / Ref</th>
                                        <th className="p-2.5">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {myTxns.length === 0 ? (
                                        <tr><td colSpan={4} className="p-6 text-center text-slate-400">No SACCO transactions yet.</td></tr>
                                    ) : myTxns.map(t => (
                                        <tr key={t.id}>
                                            <td className="p-2.5 font-mono text-slate-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                                            <td className="p-2.5 uppercase font-black text-[10px]">{t.type.replace('_', ' ')}</td>
                                            <td className="p-2.5 font-mono">{t.mode.toUpperCase()} • {t.reference}</td>
                                            <td className="p-2.5 font-black text-emerald-600">KES {t.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* SELF-SERVICE LOAN APPLICATION MODAL */}
            {isApplyLoanOpen && myMember && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Apply for Staff SACCO Loan</h3>
                            <button type="button" onClick={() => setIsApplyLoanOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSelfApplyLoan} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Loan Product *</label>
                                <select value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Up to {p.savingsMultiplier}× savings • {p.monthlyInterestRate}%/mo)</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Amount (KES) *</label>
                                    <input type="number" min={100} required value={loanAmount} onChange={e => setLoanAmount(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-black" />
                                    {selectedProduct && (
                                        <span className="text-[10px] text-teal-600 font-bold">Eligible: KES {(myMember.savingsBalance * selectedProduct.savingsMultiplier).toLocaleString()}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Months *</label>
                                    <input type="number" min={1} max={selectedProduct?.maxMonths || 24} required value={loanMonths} onChange={e => setLoanMonths(Number(e.target.value) || 1)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-black" />
                                </div>
                            </div>
                            {liveLoanPreview && (
                                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                                    <div className="flex justify-between"><span>Total Interest</span><strong>KES {liveLoanPreview.totalInterest.toLocaleString()}</strong></div>
                                    <div className="flex justify-between"><span>Total Repayable</span><strong>KES {liveLoanPreview.totalRepayable.toLocaleString()}</strong></div>
                                    <div className="flex justify-between text-indigo-700 dark:text-indigo-300"><span>Monthly Deduction</span><strong>KES {liveLoanPreview.monthlyInstallment.toLocaleString()} / mo</strong></div>
                                </div>
                            )}
                            {otherMembers.length > 0 && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Select Colleague Guarantors (Optional)</label>
                                    <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1">
                                        {otherMembers.map(g => (
                                            <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGuarantorIds.includes(g.id)}
                                                    onChange={e => setSelectedGuarantorIds(prev => e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id))}
                                                    className="accent-indigo-600"
                                                />
                                                <span>{g.name}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            )}
                            <input type="text" value={loanPurpose} onChange={e => setLoanPurpose(e.target.value)} placeholder="Purpose of loan" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold" />
                            <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase cursor-pointer">
                                Submit Loan Application
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* SELF-SERVICE SAVINGS TOP-UP MODAL */}
            {isTopUpOpen && myMember && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Top Up My SACCO Savings</h3>
                            <button type="button" onClick={() => setIsTopUpOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleSelfDeposit} className="p-5 space-y-4">
                            <input type="number" min={1} required value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)} placeholder="Amount (KES)" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-base font-black" />
                            <div className="grid grid-cols-2 gap-3">
                                <select value={topUpMode} onChange={e => setTopUpMode(e.target.value as any)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="stk_push">Instant STK Push (NCBA / M-Pesa)</option>
                                    <option value="mpesa">M-Pesa (Manual Ref)</option>
                                    <option value="ncba">NCBA (Manual Ref)</option>
                                    <option value="bank">Bank (Manual Ref)</option>
                                </select>
                                {topUpMode !== 'stk_push' && (
                                    <input type="text" value={topUpRef} onChange={e => setTopUpRef(e.target.value)} placeholder="M-Pesa / Bank Ref" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold" />
                                )}
                            </div>
                            <button type="submit" className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase cursor-pointer">
                                {topUpMode === 'stk_push' ? 'Pay Now via STK Push' : 'Record Savings Top-Up'}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* LIVE STK PUSH CHECKOUT MODAL FOR SAVINGS & LOAN REPAYMENTS */}
            {stkPayContext && (
                <PayNowModal
                    isOpen={Boolean(stkPayContext)}
                    onClose={() => setStkPayContext(null)}
                    institutionId={instId}
                    institutionName={`${instName} Staff SACCO`}
                    forceAmount={stkPayContext.amount}
                    forcedItems={[{
                        description: stkPayContext.label,
                        quantity: 1,
                        unitPrice: stkPayContext.amount,
                        amount: stkPayContext.amount
                    }]}
                    mpesaConfig={companyDetails?.mpesaConfig || institution?.mpesaConfig!}
                    ncbaConfig={companyDetails?.ncbaConfig || institution?.ncbaConfig}
                    onSuccess={(ref) => handleStkPushSuccess(ref)}
                />
            )}
        </div>
    );
};
