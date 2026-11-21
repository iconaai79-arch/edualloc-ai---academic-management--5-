import React, { useState, useEffect, useMemo } from 'react';
import type { User, Institution, SmsConfig } from '../../types';
import { apiService } from '../../services/apiService';
import { WalletIcon } from '../icons/WalletIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ShieldCheckIcon } from '../icons/ShieldCheckIcon';

export interface EduSaccoMember {
    id: string;
    institutionId: string;
    userId: string;
    memberNumber: string;
    name: string;
    role: string;
    phoneNumber: string;
    email?: string;
    shareCapital: number;
    savingsBalance: number;
    monthlyContribution: number;
    nextOfKinName?: string;
    nextOfKinPhone?: string;
    status: 'active' | 'suspended' | 'exited';
    joinedAt: string;
    updatedAt: string;
}

export interface EduSaccoLoanProduct {
    id: string;
    institutionId: string;
    name: string;
    savingsMultiplier: number; // e.g. 3 => up to 3x savings
    monthlyInterestRate: number; // % per month e.g. 1.0
    interestType: 'reducing' | 'flat';
    maxMonths: number;
    processingFeePercent: number;
    isActive: boolean;
}

export interface EduSaccoLoan {
    id: string;
    institutionId: string;
    memberId: string;
    memberName: string;
    memberNumber: string;
    productId: string;
    productName: string;
    principal: number;
    interestRate: number;
    interestType: 'reducing' | 'flat';
    months: number;
    processingFee: number;
    totalInterest: number;
    totalRepayable: number;
    monthlyInstallment: number;
    amountPaid: number;
    balanceRemaining: number;
    guarantors: { memberId: string; memberName: string; guaranteedAmount: number }[];
    status: 'pending_approval' | 'active' | 'cleared' | 'rejected';
    disbursementMode?: 'cash' | 'bank' | 'mpesa' | 'ncba';
    disbursementRef?: string;
    disbursedAt?: string;
    approvedBy?: string;
    purpose?: string;
    createdAt: string;
}

export interface EduSaccoTransaction {
    id: string;
    institutionId: string;
    memberId: string;
    memberName: string;
    memberNumber: string;
    type: 'savings_deposit' | 'share_capital' | 'loan_disbursement' | 'loan_repayment' | 'dividend' | 'withdrawal';
    amount: number;
    mode: 'payroll_checkoff' | 'cash' | 'mpesa' | 'bank' | 'ncba' | 'internal';
    reference: string;
    notes?: string;
    recordedBy: string;
    createdAt: string;
}

interface EduStaffSaccoManagerProps {
    institution: Institution;
    currentUser?: User | null;
    users: User[];
    smsConfig?: SmsConfig;
    onSendSms?: (recipient: string, message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
    onLogAction?: (msg: string) => Promise<void> | void;
}

const DEFAULT_LOAN_PRODUCTS = (instId: string): EduSaccoLoanProduct[] => [
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

    let totalInterest = 0;
    if (interestType === 'flat') {
        totalInterest = Math.round(p * r * m);
    } else {
        // Simple reducing-balance approximation: average principal = p * (m + 1) / (2 * m)
        totalInterest = Math.round(p * r * ((m + 1) / 2));
    }
    const totalRepayable = p + totalInterest;
    const monthlyInstallment = Math.ceil(totalRepayable / m);
    return { processingFee, totalInterest, totalRepayable, monthlyInstallment };
};

export const EduStaffSaccoManager: React.FC<EduStaffSaccoManagerProps> = ({
    institution,
    currentUser,
    users,
    smsConfig,
    onSendSms,
    onLogAction
}) => {
    const instId = institution?.id || 'default_inst';
    const [subTab, setSubTab] = useState<'members' | 'loans' | 'checkoff' | 'products' | 'ledger'>('members');
    const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const [members, setMembers] = useState<EduSaccoMember[]>(() => {
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
        return DEFAULT_LOAN_PRODUCTS(instId);
    });
    const [loans, setLoans] = useState<EduSaccoLoan[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_sacco_loans_${instId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    });
    const [transactions, setTransactions] = useState<EduSaccoTransaction[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_sacco_txns_${instId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    });

    // Strictly Teachers & Staff Only (exclude students and parents)
    const eligibleStaffUsers = useMemo(() => {
        return (users || []).filter(u => {
            const role = String(u.role || '').toLowerCase();
            return role !== 'student' && role !== 'parent';
        });
    }, [users]);

    const unenrolledStaff = useMemo(() => {
        const enrolledUserIds = new Set(members.map(m => m.userId));
        return eligibleStaffUsers.filter(u => !enrolledUserIds.has(u.id));
    }, [eligibleStaffUsers, members]);

    // Modals & Form States
    const [isEnrollOpen, setIsEnrollOpen] = useState(false);
    const [enrollUserId, setEnrollUserId] = useState('');
    const [enrollMonthlyContrib, setEnrollMonthlyContrib] = useState(2000);
    const [enrollInitialShares, setEnrollInitialShares] = useState(1000);
    const [enrollKinName, setEnrollKinName] = useState('');
    const [enrollKinPhone, setEnrollKinPhone] = useState('');

    const [depositModalMember, setDepositModalMember] = useState<EduSaccoMember | null>(null);
    const [depositType, setDepositType] = useState<'savings_deposit' | 'share_capital'>('savings_deposit');
    const [depositAmount, setDepositAmount] = useState('');
    const [depositMode, setDepositMode] = useState<'cash' | 'mpesa' | 'bank' | 'ncba'>('mpesa');
    const [depositRef, setDepositRef] = useState('');

    const [isLoanModalOpen, setIsLoanModalOpen] = useState(false);
    const [loanMemberId, setLoanMemberId] = useState('');
    const [loanProductId, setLoanProductId] = useState(products[0]?.id || '');
    const [loanPrincipal, setLoanPrincipal] = useState<number>(10000);
    const [loanMonths, setLoanMonths] = useState<number>(6);
    const [loanPurpose, setLoanPurpose] = useState('');
    const [loanGuarantorIds, setLoanGuarantorIds] = useState<string[]>([]);

    const [repayLoan, setRepayLoan] = useState<EduSaccoLoan | null>(null);
    const [repayAmount, setRepayAmount] = useState('');
    const [repayMode, setRepayMode] = useState<'payroll_checkoff' | 'mpesa' | 'bank' | 'cash'>('mpesa');
    const [repayRef, setRepayRef] = useState('');

    // Check-Off Month & Dividend State
    const [checkOffMonth, setCheckOffMonth] = useState(() => new Date().toISOString().slice(0, 7));
    const [dividendRatePct, setDividendRatePct] = useState<number>(10);
    const [rebateRatePct, setRebateRatePct] = useState<number>(8);
    const [searchMember, setSearchMember] = useState('');

    useEffect(() => {
        if (!instId) return;
        apiService.fetchModuleRecords<EduSaccoMember>('edu_sacco_members', instId)
            .then(recs => {
                if (Array.isArray(recs)) {
                    setMembers(recs);
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
                    setLoans([...recs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                    try { localStorage.setItem(`eduai_sacco_loans_${instId}`, JSON.stringify(recs)); } catch (_) {}
                }
            }).catch(() => {});

        apiService.fetchModuleRecords<EduSaccoTransaction>('edu_sacco_txns', instId)
            .then(recs => {
                if (Array.isArray(recs)) {
                    setTransactions([...recs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                    try { localStorage.setItem(`eduai_sacco_txns_${instId}`, JSON.stringify(recs)); } catch (_) {}
                }
            }).catch(() => {});
    }, [instId]);

    const showBanner = (type: 'success' | 'error', text: string) => {
        setStatusBanner({ type, text });
        setTimeout(() => setStatusBanner(null), 4000);
    };

    const persistMembers = async (next: EduSaccoMember[], changed?: EduSaccoMember) => {
        setMembers(next);
        try { localStorage.setItem(`eduai_sacco_members_${instId}`, JSON.stringify(next)); } catch (_) {}
        if (changed) await apiService.saveModuleRecord('edu_sacco_members', changed).catch(() => {});
    };

    const persistTx = async (tx: EduSaccoTransaction) => {
        const next = [tx, ...transactions];
        setTransactions(next);
        try { localStorage.setItem(`eduai_sacco_txns_${instId}`, JSON.stringify(next)); } catch (_) {}
        await apiService.saveModuleRecord('edu_sacco_txns', tx).catch(() => {});
    };

    const persistLoans = async (next: EduSaccoLoan[], changed?: EduSaccoLoan) => {
        setLoans(next);
        try { localStorage.setItem(`eduai_sacco_loans_${instId}`, JSON.stringify(next)); } catch (_) {}
        if (changed) await apiService.saveModuleRecord('edu_sacco_loans', changed).catch(() => {});
    };

    const handleEnrollStaff = async (e: React.FormEvent) => {
        e.preventDefault();
        const staff = unenrolledStaff.find(u => u.id === enrollUserId);
        if (!staff) {
            showBanner('error', 'Select a teacher or staff member to enroll.');
            return;
        }
        const nowIso = new Date().toISOString();
        const memberNumber = `SAC-${String(members.length + 1).padStart(4, '0')}`;
        const newMember: EduSaccoMember = {
            id: `sacco_mem_${staff.id}`,
            institutionId: instId,
            userId: staff.id,
            memberNumber,
            name: staff.name,
            role: staff.role || 'staff',
            phoneNumber: (staff as any).phoneNumber || (staff as any).phone || '',
            email: staff.email,
            shareCapital: Math.max(0, Number(enrollInitialShares) || 0),
            savingsBalance: 0,
            monthlyContribution: Math.max(0, Number(enrollMonthlyContrib) || 0),
            nextOfKinName: enrollKinName.trim(),
            nextOfKinPhone: enrollKinPhone.trim(),
            status: 'active',
            joinedAt: nowIso,
            updatedAt: nowIso
        };

        await persistMembers([newMember, ...members], newMember);
        if (newMember.shareCapital > 0) {
            await persistTx({
                id: `sacco_tx_${Date.now()}`,
                institutionId: instId,
                memberId: newMember.id,
                memberName: newMember.name,
                memberNumber: newMember.memberNumber,
                type: 'share_capital',
                amount: newMember.shareCapital,
                mode: 'cash',
                reference: `REG-${memberNumber}`,
                notes: 'Initial SACCO Share Capital on Enrollment',
                recordedBy: currentUser?.name || 'SACCO Treasurer',
                createdAt: nowIso
            });
        }
        setIsEnrollOpen(false);
        setEnrollUserId('');
        setEnrollKinName('');
        setEnrollKinPhone('');
        onLogAction?.(`Enrolled staff member ${newMember.name} (${memberNumber}) into School Staff SACCO`);
        showBanner('success', `Enrolled ${newMember.name} (${memberNumber}) into Staff SACCO.`);
    };

    const handleRecordDeposit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!depositModalMember) return;
        const amt = Number(depositAmount);
        if (Number.isNaN(amt) || amt <= 0) {
            showBanner('error', 'Enter a valid deposit amount.');
            return;
        }
        const nowIso = new Date().toISOString();
        const updated: EduSaccoMember = {
            ...depositModalMember,
            savingsBalance: depositType === 'savings_deposit' ? depositModalMember.savingsBalance + amt : depositModalMember.savingsBalance,
            shareCapital: depositType === 'share_capital' ? depositModalMember.shareCapital + amt : depositModalMember.shareCapital,
            updatedAt: nowIso
        };
        await persistMembers(members.map(m => (m.id === updated.id ? updated : m)), updated);
        await persistTx({
            id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            institutionId: instId,
            memberId: updated.id,
            memberName: updated.name,
            memberNumber: updated.memberNumber,
            type: depositType,
            amount: amt,
            mode: depositMode,
            reference: depositRef.trim() || `DEP-${Date.now().toString().slice(-6)}`,
            notes: depositType === 'share_capital' ? 'Share Capital Top-Up' : 'Member Savings Deposit',
            recordedBy: currentUser?.name || 'SACCO Treasurer',
            createdAt: nowIso
        });
        if (onSendSms && updated.phoneNumber) {
            const msg = `${institution.name} Staff SACCO: KES ${amt.toLocaleString()} credited to your ${depositType === 'share_capital' ? 'Share Capital' : 'Savings'}. New Savings: KES ${updated.savingsBalance.toLocaleString()}.`;
            onSendSms(updated.phoneNumber, msg, smsConfig || institution.smsConfig, 1, instId).catch(() => {});
        }
        setDepositModalMember(null);
        setDepositAmount('');
        setDepositRef('');
        showBanner('success', `Recorded KES ${amt.toLocaleString()} for ${updated.name}.`);
    };

    const handleApplyLoan = async (e: React.FormEvent) => {
        e.preventDefault();
        const member = members.find(m => m.id === loanMemberId);
        const product = products.find(p => p.id === loanProductId);
        if (!member || !product) {
            showBanner('error', 'Select both a staff member and a loan product.');
            return;
        }
        const maxAllowed = member.savingsBalance * product.savingsMultiplier;
        if (loanPrincipal <= 0) {
            showBanner('error', 'Enter a valid loan amount.');
            return;
        }
        if (loanPrincipal > maxAllowed) {
            showBanner('error', `Requested KES ${loanPrincipal.toLocaleString()} exceeds ${product.savingsMultiplier}x savings limit (Max: KES ${maxAllowed.toLocaleString()}).`);
            return;
        }
        const months = Math.max(1, Math.min(product.maxMonths, Math.floor(loanMonths)));
        const math = computeLoanMath(loanPrincipal, product.monthlyInterestRate, months, product.interestType, product.processingFeePercent);
        const guarantors = loanGuarantorIds
            .map(gid => members.find(m => m.id === gid))
            .filter(Boolean)
            .map(g => ({
                memberId: g!.id,
                memberName: g!.name,
                guaranteedAmount: Math.round(loanPrincipal / Math.max(1, loanGuarantorIds.length))
            }));

        const newLoan: EduSaccoLoan = {
            id: `sacco_loan_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            institutionId: instId,
            memberId: member.id,
            memberName: member.name,
            memberNumber: member.memberNumber,
            productId: product.id,
            productName: product.name,
            principal: loanPrincipal,
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

        await persistLoans([newLoan, ...loans], newLoan);
        setIsLoanModalOpen(false);
        setLoanPurpose('');
        setLoanGuarantorIds([]);
        showBanner('success', `Loan application of KES ${loanPrincipal.toLocaleString()} submitted for ${member.name} (Monthly: KES ${math.monthlyInstallment.toLocaleString()}).`);
    };

    const handleApproveAndDisburseLoan = async (loan: EduSaccoLoan) => {
        const nowIso = new Date().toISOString();
        const ref = `DISB-${Date.now().toString().slice(-6)}`;
        const activeLoan: EduSaccoLoan = {
            ...loan,
            status: 'active',
            disbursementMode: 'mpesa',
            disbursementRef: ref,
            disbursedAt: nowIso,
            approvedBy: currentUser?.name || 'SACCO Committee'
        };
        await persistLoans(loans.map(l => (l.id === loan.id ? activeLoan : l)), activeLoan);
        await persistTx({
            id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            institutionId: instId,
            memberId: loan.memberId,
            memberName: loan.memberName,
            memberNumber: loan.memberNumber,
            type: 'loan_disbursement',
            amount: loan.principal,
            mode: 'mpesa',
            reference: ref,
            notes: `${loan.productName} Disbursed (${loan.months} months)`,
            recordedBy: currentUser?.name || 'SACCO Committee',
            createdAt: nowIso
        });
        showBanner('success', `Approved & disbursed KES ${loan.principal.toLocaleString()} to ${loan.memberName} (Ref: ${ref}).`);
    };

    const handleRecordRepayment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!repayLoan) return;
        const amt = Number(repayAmount);
        if (Number.isNaN(amt) || amt <= 0) {
            showBanner('error', 'Enter a valid repayment amount.');
            return;
        }
        const nowIso = new Date().toISOString();
        const nextPaid = repayLoan.amountPaid + amt;
        const nextBal = Math.max(0, repayLoan.totalRepayable - nextPaid);
        const updatedLoan: EduSaccoLoan = {
            ...repayLoan,
            amountPaid: nextPaid,
            balanceRemaining: nextBal,
            status: nextBal <= 0 ? 'cleared' : 'active'
        };
        await persistLoans(loans.map(l => (l.id === updatedLoan.id ? updatedLoan : l)), updatedLoan);
        await persistTx({
            id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
            institutionId: instId,
            memberId: repayLoan.memberId,
            memberName: repayLoan.memberName,
            memberNumber: repayLoan.memberNumber,
            type: 'loan_repayment',
            amount: amt,
            mode: repayMode,
            reference: repayRef.trim() || `REP-${Date.now().toString().slice(-6)}`,
            notes: `Loan Repayment (${repayLoan.productName})`,
            recordedBy: currentUser?.name || 'SACCO Treasurer',
            createdAt: nowIso
        });
        setRepayLoan(null);
        setRepayAmount('');
        setRepayRef('');
        showBanner('success', `Recorded KES ${amt.toLocaleString()} repayment for ${repayLoan.memberName}. Remaining balance: KES ${nextBal.toLocaleString()}.`);
    };

    const handlePostPayrollCheckOff = async () => {
        const activeMembers = members.filter(m => m.status === 'active');
        if (activeMembers.length === 0) {
            showBanner('error', 'No active SACCO staff members to post check-off for.');
            return;
        }
        const nowIso = new Date().toISOString();
        const nextMembers = [...members];
        const nextLoans = [...loans];
        const createdTxns: EduSaccoTransaction[] = [];

        for (let i = 0; i < nextMembers.length; i++) {
            const m = nextMembers[i];
            if (m.status !== 'active') continue;
            if (m.monthlyContribution > 0) {
                nextMembers[i] = { ...m, savingsBalance: m.savingsBalance + m.monthlyContribution, updatedAt: nowIso };
                await apiService.saveModuleRecord('edu_sacco_members', nextMembers[i]).catch(() => {});
                const tx: EduSaccoTransaction = {
                    id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    institutionId: instId,
                    memberId: m.id,
                    memberName: m.name,
                    memberNumber: m.memberNumber,
                    type: 'savings_deposit',
                    amount: m.monthlyContribution,
                    mode: 'payroll_checkoff',
                    reference: `CHK-${checkOffMonth}`,
                    notes: `Payroll Check-Off Savings (${checkOffMonth})`,
                    recordedBy: currentUser?.name || 'Payroll Check-Off',
                    createdAt: nowIso
                };
                createdTxns.push(tx);
                await apiService.saveModuleRecord('edu_sacco_txns', tx).catch(() => {});
            }

            // Deduct active loans
            for (let j = 0; j < nextLoans.length; j++) {
                const l = nextLoans[j];
                if (l.memberId === m.id && l.status === 'active' && l.balanceRemaining > 0) {
                    const deduction = Math.min(l.monthlyInstallment, l.balanceRemaining);
                    const nextPaid = l.amountPaid + deduction;
                    const nextBal = Math.max(0, l.totalRepayable - nextPaid);
                    nextLoans[j] = {
                        ...l,
                        amountPaid: nextPaid,
                        balanceRemaining: nextBal,
                        status: nextBal <= 0 ? 'cleared' : 'active'
                    };
                    await apiService.saveModuleRecord('edu_sacco_loans', nextLoans[j]).catch(() => {});
                    const tx: EduSaccoTransaction = {
                        id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                        institutionId: instId,
                        memberId: m.id,
                        memberName: m.name,
                        memberNumber: m.memberNumber,
                        type: 'loan_repayment',
                        amount: deduction,
                        mode: 'payroll_checkoff',
                        reference: `CHK-LN-${checkOffMonth}`,
                        notes: `Payroll Loan Check-Off (${l.productName} - ${checkOffMonth})`,
                        recordedBy: currentUser?.name || 'Payroll Check-Off',
                        createdAt: nowIso
                    };
                    createdTxns.push(tx);
                    await apiService.saveModuleRecord('edu_sacco_txns', tx).catch(() => {});
                }
            }
        }

        setMembers(nextMembers);
        setLoans(nextLoans);
        const allTxns = [...createdTxns, ...transactions];
        setTransactions(allTxns);
        try {
            localStorage.setItem(`eduai_sacco_members_${instId}`, JSON.stringify(nextMembers));
            localStorage.setItem(`eduai_sacco_loans_${instId}`, JSON.stringify(nextLoans));
            localStorage.setItem(`eduai_sacco_txns_${instId}`, JSON.stringify(allTxns));
        } catch (_) {}
        showBanner('success', `Posted ${createdTxns.length} Payroll Check-Off entries for ${checkOffMonth}!`);
    };

    const handlePostDividends = async () => {
        const activeMembers = members.filter(m => m.status === 'active');
        if (activeMembers.length === 0) return;
        const nowIso = new Date().toISOString();
        let totalPosted = 0;
        const nextMembers = [...members];
        const createdTxns: EduSaccoTransaction[] = [];

        for (let i = 0; i < nextMembers.length; i++) {
            const m = nextMembers[i];
            if (m.status !== 'active') continue;
            const shareDiv = Math.round((m.shareCapital * dividendRatePct) / 100);
            const savingsRebate = Math.round((m.savingsBalance * rebateRatePct) / 100);
            const totalCredit = shareDiv + savingsRebate;
            if (totalCredit <= 0) continue;
            totalPosted += totalCredit;
            nextMembers[i] = { ...m, savingsBalance: m.savingsBalance + totalCredit, updatedAt: nowIso };
            await apiService.saveModuleRecord('edu_sacco_members', nextMembers[i]).catch(() => {});
            const tx: EduSaccoTransaction = {
                id: `sacco_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                institutionId: instId,
                memberId: m.id,
                memberName: m.name,
                memberNumber: m.memberNumber,
                type: 'dividend',
                amount: totalCredit,
                mode: 'internal',
                reference: `DIV-${new Date().getFullYear()}`,
                notes: `Annual Dividend (${dividendRatePct}%) + Savings Rebate (${rebateRatePct}%)`,
                recordedBy: currentUser?.name || 'SACCO AGM',
                createdAt: nowIso
            };
            createdTxns.push(tx);
            await apiService.saveModuleRecord('edu_sacco_txns', tx).catch(() => {});
        }

        setMembers(nextMembers);
        const allTxns = [...createdTxns, ...transactions];
        setTransactions(allTxns);
        try {
            localStorage.setItem(`eduai_sacco_members_${instId}`, JSON.stringify(nextMembers));
            localStorage.setItem(`eduai_sacco_txns_${instId}`, JSON.stringify(allTxns));
        } catch (_) {}
        showBanner('success', `Posted KES ${totalPosted.toLocaleString()} in annual dividends & interest rebates across ${createdTxns.length} staff members!`);
    };

    const printMemberStatement = (member: EduSaccoMember) => {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;
        const mTxns = transactions.filter(t => t.memberId === member.id);
        const mLoans = loans.filter(l => l.memberId === member.id && l.status === 'active');
        win.document.write(`
            <html><head><title>Staff SACCO Statement - ${member.name}</title>
            <style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}table{width:100%;border-collapse:collapse;margin-top:14px;font-size:12px}th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}th{background:#f1f5f9}</style>
            </head><body>
            <h2>${institution.name} — Staff SACCO Member Statement</h2>
            <p><strong>Member:</strong> ${member.name} (${member.memberNumber}) • <strong>Role:</strong> ${member.role}</p>
            <p><strong>Share Capital:</strong> KES ${member.shareCapital.toLocaleString()} • <strong>Savings Balance:</strong> KES ${member.savingsBalance.toLocaleString()} • <strong>Active Loan Balance:</strong> KES ${mLoans.reduce((s, l) => s + l.balanceRemaining, 0).toLocaleString()}</p>
            <table><thead><tr><th>Date</th><th>Type</th><th>Mode / Ref</th><th>Notes</th><th>Amount (KES)</th></tr></thead><tbody>
            ${mTxns.map(t => `<tr><td>${new Date(t.createdAt).toLocaleString()}</td><td>${t.type.replace('_', ' ').toUpperCase()}</td><td>${t.mode.toUpperCase()} / ${t.reference}</td><td>${t.notes || '-'}</td><td>KES ${t.amount.toLocaleString()}</td></tr>`).join('')}
            </tbody></table><script>window.print();</script></body></html>
        `);
        win.document.close();
    };

    const kpis = useMemo(() => {
        const totalSavings = members.reduce((s, m) => s + (Number(m.savingsBalance) || 0), 0);
        const totalShares = members.reduce((s, m) => s + (Number(m.shareCapital) || 0), 0);
        const activeLoanBalance = loans.filter(l => l.status === 'active').reduce((s, l) => s + (Number(l.balanceRemaining) || 0), 0);
        const pendingLoansCount = loans.filter(l => l.status === 'pending_approval').length;
        return { totalSavings, totalShares, activeLoanBalance, pendingLoansCount };
    }, [members, loans]);

    const filteredMembers = useMemo(() => {
        const q = searchMember.trim().toLowerCase();
        if (!q) return members;
        return members.filter(m => `${m.name} ${m.memberNumber} ${m.role} ${m.phoneNumber}`.toLowerCase().includes(q));
    }, [members, searchMember]);

    const selectedLoanProduct = products.find(p => p.id === loanProductId) || products[0];
    const selectedLoanMember = members.find(m => m.id === loanMemberId);
    const liveLoanMath = selectedLoanProduct
        ? computeLoanMath(loanPrincipal, selectedLoanProduct.monthlyInterestRate, loanMonths, selectedLoanProduct.interestType, selectedLoanProduct.processingFeePercent)
        : null;

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-teal-950 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-400 flex items-center gap-1.5">
                        <ShieldCheckIcon className="w-4 h-4" /> Teachers &amp; Staff Only • Custodial Welfare SACCO
                    </span>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5 mt-1">
                        <WalletIcon className="w-7 h-7 text-teal-400" />
                        {institution.name} — Staff SACCO Savings &amp; Loans
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                        Manage staff share capital, monthly payroll check-off savings, guarantor-backed loans, repayments, and annual dividends.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setEnrollUserId(unenrolledStaff[0]?.id || '');
                            setIsEnrollOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                        <PlusIcon className="w-4 h-4" /> Enroll Staff
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setLoanMemberId(members[0]?.id || '');
                            setLoanProductId(products[0]?.id || '');
                            setIsLoanModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-lg cursor-pointer"
                    >
                        <BanknotesIcon className="w-4 h-4" /> New Loan
                    </button>
                </div>
            </div>

            {statusBanner && (
                <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                    statusBanner.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}>
                    <CheckCircleIcon className="w-4 h-4 shrink-0" />
                    <span>{statusBanner.text}</span>
                </div>
            )}

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-600">Total Staff Savings</span>
                    <div className="text-2xl font-black text-teal-600 mt-1">KES {kpis.totalSavings.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-500">{members.length} enrolled staff members</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Share Capital Pool</span>
                    <div className="text-2xl font-black text-indigo-600 mt-1">KES {kpis.totalShares.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-500">Non-withdrawable member equity</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Active Loan Portfolio</span>
                    <div className="text-2xl font-black text-amber-600 mt-1">KES {kpis.activeLoanBalance.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-500">{loans.filter(l => l.status === 'active').length} active loan(s)</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Pending Loan Approvals</span>
                    <div className="text-2xl font-black text-rose-600 mt-1">{kpis.pendingLoansCount}</div>
                    <span className="text-[10px] text-slate-500">Awaiting committee approval</span>
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {[
                    { id: 'members', label: `Staff Members (${members.length})` },
                    { id: 'loans', label: `Loans (${loans.length})` },
                    { id: 'checkoff', label: 'Payroll Check-Off Batch' },
                    { id: 'products', label: 'Loan Products' },
                    { id: 'ledger', label: `Ledger & Dividends (${transactions.length})` }
                ].map(t => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setSubTab(t.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                            subTab === t.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: STAFF MEMBERS */}
            {subTab === 'members' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/40">
                        <input
                            type="text"
                            value={searchMember}
                            onChange={e => setSearchMember(e.target.value)}
                            placeholder="Search teacher or staff name, member #, phone..."
                            className="flex-1 min-w-[220px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                        />
                        <span className="text-xs font-bold text-slate-500">
                            {unenrolledStaff.length} staff eligible to enroll
                        </span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3.5">Member</th>
                                    <th className="p-3.5">Role</th>
                                    <th className="p-3.5">Share Capital</th>
                                    <th className="p-3.5">Savings Balance</th>
                                    <th className="p-3.5">Monthly Check-Off</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredMembers.length === 0 ? (
                                    <tr><td colSpan={6} className="p-10 text-center text-slate-400">No staff members enrolled yet. Click &ldquo;Enroll Staff&rdquo; above to begin.</td></tr>
                                ) : filteredMembers.map(m => (
                                    <tr key={m.id}>
                                        <td className="p-3.5">
                                            <div className="font-black text-slate-900 dark:text-white">{m.name}</div>
                                            <div className="text-[10px] font-mono text-slate-500">{m.memberNumber} • {m.phoneNumber || 'No phone'}</div>
                                        </td>
                                        <td className="p-3.5 uppercase text-[10px] font-bold text-slate-500">{m.role.replace('_', ' ')}</td>
                                        <td className="p-3.5 font-bold text-indigo-600">KES {m.shareCapital.toLocaleString()}</td>
                                        <td className="p-3.5 font-black text-teal-600 text-sm">KES {m.savingsBalance.toLocaleString()}</td>
                                        <td className="p-3.5 font-mono">KES {m.monthlyContribution.toLocaleString()} / mo</td>
                                        <td className="p-3.5 text-right space-x-1.5">
                                            <button
                                                type="button"
                                                onClick={() => { setDepositModalMember(m); setDepositType('savings_deposit'); setDepositAmount(''); }}
                                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase cursor-pointer"
                                            >
                                                + Deposit
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => printMemberStatement(m)}
                                                className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-bold text-[10px] uppercase cursor-pointer"
                                            >
                                                Statement
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: LOANS */}
            {subTab === 'loans' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3">Staff Member</th>
                                    <th className="p-3">Product / Tenure</th>
                                    <th className="p-3">Principal</th>
                                    <th className="p-3">Monthly Inst.</th>
                                    <th className="p-3">Balance</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {loans.length === 0 ? (
                                    <tr><td colSpan={7} className="p-8 text-center text-slate-400">No staff loans recorded yet.</td></tr>
                                ) : loans.map(l => (
                                    <tr key={l.id}>
                                        <td className="p-3">
                                            <div className="font-black text-slate-900 dark:text-white">{l.memberName}</div>
                                            <div className="text-[10px] text-slate-500">{l.memberNumber} • {l.guarantors.length} guarantor(s)</div>
                                        </td>
                                        <td className="p-3 font-bold">{l.productName} ({l.months}m @ {l.interestRate}%/mo)</td>
                                        <td className="p-3 font-bold">KES {l.principal.toLocaleString()}</td>
                                        <td className="p-3 font-mono">KES {l.monthlyInstallment.toLocaleString()}</td>
                                        <td className="p-3 font-black text-amber-600">KES {l.balanceRemaining.toLocaleString()}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                l.status === 'active' ? 'bg-indigo-100 text-indigo-700' : l.status === 'cleared' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {l.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {l.status === 'pending_approval' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleApproveAndDisburseLoan(l)}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase cursor-pointer"
                                                >
                                                    Approve &amp; Disburse
                                                </button>
                                            )}
                                            {l.status === 'active' && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setRepayLoan(l); setRepayAmount(String(Math.min(l.monthlyInstallment, l.balanceRemaining))); }}
                                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-black text-[10px] uppercase cursor-pointer"
                                                >
                                                    Record Repayment
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: PAYROLL CHECK-OFF BATCH */}
            {subTab === 'checkoff' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                                Monthly Payroll Check-Off Deduction Batch
                            </h3>
                            <p className="text-xs text-slate-500">Post monthly staff savings &amp; active loan installments from payroll in a single click.</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <input
                                type="month"
                                value={checkOffMonth}
                                onChange={e => setCheckOffMonth(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                            <button
                                type="button"
                                onClick={handlePostPayrollCheckOff}
                                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase cursor-pointer"
                            >
                                Post {checkOffMonth} Check-Off
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3">Staff Member</th>
                                    <th className="p-3">Monthly Savings</th>
                                    <th className="p-3">Active Loan Deduction</th>
                                    <th className="p-3">Total Payroll Deduction</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {members.filter(m => m.status === 'active').map(m => {
                                    const loanDed = loans
                                        .filter(l => l.memberId === m.id && l.status === 'active')
                                        .reduce((s, l) => s + Math.min(l.monthlyInstallment, l.balanceRemaining), 0);
                                    return (
                                        <tr key={m.id}>
                                            <td className="p-3 font-bold">{m.name} ({m.memberNumber})</td>
                                            <td className="p-3">KES {m.monthlyContribution.toLocaleString()}</td>
                                            <td className="p-3">KES {loanDed.toLocaleString()}</td>
                                            <td className="p-3 font-black text-indigo-600">KES {(m.monthlyContribution + loanDed).toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: LOAN PRODUCTS */}
            {subTab === 'products' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {products.map(p => (
                        <div key={p.id} className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-2">
                            <h4 className="font-black text-base text-slate-900 dark:text-white">{p.name}</h4>
                            <div className="text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                <div>Max Loan: <strong>{p.savingsMultiplier}× Member Savings</strong></div>
                                <div>Interest: <strong>{p.monthlyInterestRate}% / month ({p.interestType})</strong></div>
                                <div>Max Tenure: <strong>{p.maxMonths} months</strong></div>
                                <div>Processing Fee: <strong>{p.processingFeePercent}%</strong></div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* TAB 5: LEDGER & ANNUAL DIVIDENDS */}
            {subTab === 'ledger' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="space-y-2 flex-1">
                            <h3 className="text-sm font-black text-slate-900 dark:text-white">Declare Annual Dividends &amp; Savings Rebates</h3>
                            <div className="grid grid-cols-2 gap-3 max-w-md">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Share Dividend (%)</label>
                                    <input type="number" step="0.5" min={0} value={dividendRatePct} onChange={e => setDividendRatePct(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Savings Rebate (%)</label>
                                    <input type="number" step="0.5" min={0} value={rebateRatePct} onChange={e => setRebateRatePct(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black" />
                                </div>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={handlePostDividends}
                            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase cursor-pointer"
                        >
                            Post Annual Dividends
                        </button>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">Member</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3">Mode / Ref</th>
                                    <th className="p-3">Amount</th>
                                    <th className="p-3">Notes</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {transactions.map(t => (
                                    <tr key={t.id}>
                                        <td className="p-3 font-mono text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                                        <td className="p-3 font-bold">{t.memberName}</td>
                                        <td className="p-3 uppercase text-[10px] font-black">{t.type.replace('_', ' ')}</td>
                                        <td className="p-3 font-mono">{t.mode.toUpperCase()} • {t.reference}</td>
                                        <td className="p-3 font-black text-emerald-600">KES {t.amount.toLocaleString()}</td>
                                        <td className="p-3 text-slate-500">{t.notes || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ENROLL STAFF MODAL */}
            {isEnrollOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">Enroll Teacher / Staff in SACCO</h3>
                            <button type="button" onClick={() => setIsEnrollOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleEnrollStaff} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Select Teacher / Staff Member *</label>
                                <select required value={enrollUserId} onChange={e => setEnrollUserId(e.target.value)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="">-- Choose Staff Member --</option>
                                    {unenrolledStaff.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Monthly Check-Off (KES)</label>
                                    <input type="number" min={0} value={enrollMonthlyContrib} onChange={e => setEnrollMonthlyContrib(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black" />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Initial Share Capital (KES)</label>
                                    <input type="number" min={0} value={enrollInitialShares} onChange={e => setEnrollInitialShares(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black" />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" value={enrollKinName} onChange={e => setEnrollKinName(e.target.value)} placeholder="Next of Kin Name" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold" />
                                <input type="tel" value={enrollKinPhone} onChange={e => setEnrollKinPhone(e.target.value)} placeholder="Next of Kin Phone" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold" />
                            </div>
                            <button type="submit" className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-black text-xs uppercase cursor-pointer">
                                Complete Staff Enrollment
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* DEPOSIT MODAL */}
            {depositModalMember && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Record Staff SACCO Deposit</h3>
                                <p className="text-xs text-slate-500">{depositModalMember.name} ({depositModalMember.memberNumber})</p>
                            </div>
                            <button type="button" onClick={() => setDepositModalMember(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleRecordDeposit} className="p-5 space-y-4">
                            <select value={depositType} onChange={e => setDepositType(e.target.value as any)} className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                <option value="savings_deposit">Monthly Savings Deposit</option>
                                <option value="share_capital">Share Capital Contribution</option>
                            </select>
                            <input type="number" min={1} required value={depositAmount} onChange={e => setDepositAmount(e.target.value)} placeholder="Amount (KES)" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-base font-black" />
                            <div className="grid grid-cols-2 gap-3">
                                <select value={depositMode} onChange={e => setDepositMode(e.target.value as any)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="mpesa">M-Pesa</option>
                                    <option value="ncba">NCBA</option>
                                    <option value="bank">Bank</option>
                                    <option value="cash">Cash</option>
                                </select>
                                <input type="text" value={depositRef} onChange={e => setDepositRef(e.target.value)} placeholder="Ref #" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold" />
                            </div>
                            <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase cursor-pointer">
                                Post Deposit
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* NEW LOAN APPLICATION MODAL */}
            {isLoanModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-lg overflow-hidden max-h-[90vh] overflow-y-auto">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <h3 className="text-base font-black text-slate-900 dark:text-white">New Staff SACCO Loan Application</h3>
                            <button type="button" onClick={() => setIsLoanModalOpen(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleApplyLoan} className="p-5 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Borrower (Staff) *</label>
                                    <select required value={loanMemberId} onChange={e => setLoanMemberId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                        <option value="">Select Member</option>
                                        {members.map(m => <option key={m.id} value={m.id}>{m.name} (Sav: KES {m.savingsBalance.toLocaleString()})</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Loan Product *</label>
                                    <select required value={loanProductId} onChange={e => setLoanProductId(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                        {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.savingsMultiplier}×)</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Principal (KES) *</label>
                                    <input type="number" min={100} required value={loanPrincipal} onChange={e => setLoanPrincipal(Number(e.target.value) || 0)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-black" />
                                    {selectedLoanMember && selectedLoanProduct && (
                                        <span className="text-[10px] text-indigo-600 font-bold">Max eligible: KES {(selectedLoanMember.savingsBalance * selectedLoanProduct.savingsMultiplier).toLocaleString()}</span>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Repayment Months *</label>
                                    <input type="number" min={1} max={selectedLoanProduct?.maxMonths || 24} required value={loanMonths} onChange={e => setLoanMonths(Number(e.target.value) || 1)} className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-sm font-black" />
                                </div>
                            </div>
                            {liveLoanMath && (
                                <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-xs space-y-1">
                                    <div className="flex justify-between"><span>Total Interest</span><strong>KES {liveLoanMath.totalInterest.toLocaleString()}</strong></div>
                                    <div className="flex justify-between"><span>Total Repayable</span><strong>KES {liveLoanMath.totalRepayable.toLocaleString()}</strong></div>
                                    <div className="flex justify-between text-indigo-700 dark:text-indigo-300"><span>Monthly Installment</span><strong>KES {liveLoanMath.monthlyInstallment.toLocaleString()} / mo</strong></div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Select Staff Guarantors (Optional)</label>
                                <div className="max-h-28 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl p-2 space-y-1">
                                    {members.filter(m => m.id !== loanMemberId).map(g => (
                                        <label key={g.id} className="flex items-center gap-2 text-xs cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={loanGuarantorIds.includes(g.id)}
                                                onChange={e => setLoanGuarantorIds(prev => e.target.checked ? [...prev, g.id] : prev.filter(id => id !== g.id))}
                                                className="accent-indigo-600"
                                            />
                                            <span>{g.name} (Sav: KES {g.savingsBalance.toLocaleString()})</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <input type="text" value={loanPurpose} onChange={e => setLoanPurpose(e.target.value)} placeholder="Loan Purpose (e.g. Emergency, School Fees, Home)" className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold" />
                            <button type="submit" className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase cursor-pointer">
                                Submit Loan Application
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* REPAYMENT MODAL */}
            {repayLoan && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Record Loan Repayment</h3>
                                <p className="text-xs text-slate-500">{repayLoan.memberName} • Balance: KES {repayLoan.balanceRemaining.toLocaleString()}</p>
                            </div>
                            <button type="button" onClick={() => setRepayLoan(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><XIcon className="w-5 h-5" /></button>
                        </div>
                        <form onSubmit={handleRecordRepayment} className="p-5 space-y-4">
                            <input type="number" min={1} max={repayLoan.balanceRemaining} required value={repayAmount} onChange={e => setRepayAmount(e.target.value)} placeholder="Repayment Amount (KES)" className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-base font-black" />
                            <div className="grid grid-cols-2 gap-3">
                                <select value={repayMode} onChange={e => setRepayMode(e.target.value as any)} className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold">
                                    <option value="payroll_checkoff">Payroll Check-Off</option>
                                    <option value="mpesa">M-Pesa</option>
                                    <option value="bank">Bank</option>
                                    <option value="cash">Cash</option>
                                </select>
                                <input type="text" value={repayRef} onChange={e => setRepayRef(e.target.value)} placeholder="Ref #" className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold" />
                            </div>
                            <button type="submit" className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase cursor-pointer">
                                Confirm Repayment
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
