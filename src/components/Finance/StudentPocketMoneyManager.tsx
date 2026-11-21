import React, { useState, useEffect, useMemo } from 'react';
import type { User, Institution, SmsConfig } from '../../types';
import { apiService } from '../../services/apiService';
import { WalletIcon } from '../icons/WalletIcon';
import { BanknotesIcon } from '../icons/BanknotesIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XIcon } from '../icons/XIcon';
import { UserGroupIcon } from '../icons/UserGroupIcon';

export interface PocketMoneyAccount {
    id: string;
    institutionId: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    className: string;
    balance: number;
    dailyLimit?: number;
    weeklyLimit?: number;
    status: 'active' | 'frozen';
    parentName?: string;
    parentPhone?: string;
    updatedAt: string;
}

export interface PocketMoneyTransaction {
    id: string;
    institutionId: string;
    accountId: string;
    studentId: string;
    studentName: string;
    admissionNumber: string;
    className?: string;
    type: 'deposit' | 'withdrawal' | 'refund';
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    paymentMode: 'cash' | 'mpesa' | 'bank';
    referenceNumber?: string;
    purpose?: string;
    issuedBy: string;
    parentNotified?: boolean;
    createdAt: string;
}

interface StudentPocketMoneyManagerProps {
    institution: Institution;
    currentUser?: User | null;
    students: User[];
    smsConfig?: SmsConfig;
    onSendSms?: (recipient: string, message: string, config?: SmsConfig, units?: number, institutionId?: string) => Promise<any>;
    onLogAction?: (action: string) => Promise<void> | void;
}

const getStudentClass = (s: any): string =>
    String(s?.studentClass || s?.classLevel || s?.courseName || s?.grade || s?.form || 'Unassigned').trim() || 'Unassigned';

const getStudentAdm = (s: any): string =>
    String(s?.admissionNumber || s?.admission_number || s?.admNo || s?.registrationNumber || s?.id?.slice(-6) || '').trim();

const getParentPhone = (s: any): string =>
    String(s?.parentPhone || s?.guardianPhone || s?.guardian_phone || s?.phoneNumber || s?.phone || '').trim();

const getParentName = (s: any): string =>
    String(s?.parentName || s?.guardianName || s?.guardian_name || '').trim();

export const StudentPocketMoneyManager: React.FC<StudentPocketMoneyManagerProps> = ({
    institution,
    currentUser,
    students,
    smsConfig,
    onSendSms,
    onLogAction
}) => {
    const instId = institution?.id || 'default_inst';
    const [subTab, setSubTab] = useState<'wallets' | 'bulk' | 'ledger' | 'statement'>('wallets');
    const [accounts, setAccounts] = useState<PocketMoneyAccount[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_pocket_accounts_${instId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
    });
    const [transactions, setTransactions] = useState<PocketMoneyTransaction[]>(() => {
        try {
            const raw = localStorage.getItem(`eduai_pocket_txns_${instId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch (_) {}
        return [];
    });
    const [autoSendParentSms, setAutoSendParentSms] = useState<boolean>(true);
    const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [classFilter, setClassFilter] = useState('All');
    const [walletFilter, setWalletFilter] = useState<'all' | 'positive' | 'zero' | 'frozen'>('all');
    const [ledgerTypeFilter, setLedgerTypeFilter] = useState<'all' | 'deposit' | 'withdrawal' | 'refund'>('all');
    const [ledgerModeFilter, setLedgerModeFilter] = useState<'all' | 'cash' | 'mpesa' | 'bank'>('all');
    const [ledgerSearch, setLedgerSearch] = useState('');

    // Single Transaction Modal State
    const [txModal, setTxModal] = useState<{ student: User; account: PocketMoneyAccount; mode: 'deposit' | 'withdrawal' | 'refund' } | null>(null);
    const [txAmount, setTxAmount] = useState<string>('');
    const [txPaymentMode, setTxPaymentMode] = useState<'cash' | 'mpesa' | 'bank'>('cash');
    const [txRef, setTxRef] = useState('');
    const [txPurpose, setTxPurpose] = useState('');
    const [isProcessingTx, setIsProcessingTx] = useState(false);

    // Limits & Freeze Modal State
    const [limitsModal, setLimitsModal] = useState<PocketMoneyAccount | null>(null);
    const [editDailyLimit, setEditDailyLimit] = useState<string>('');
    const [editWeeklyLimit, setEditWeeklyLimit] = useState<string>('');
    const [editParentPhone, setEditParentPhone] = useState<string>('');
    const [editStatus, setEditStatus] = useState<'active' | 'frozen'>('active');

    // Bulk Disbursement State
    const [bulkClass, setBulkClass] = useState('All');
    const [bulkAmount, setBulkAmount] = useState<number>(300);
    const [bulkPurpose, setBulkPurpose] = useState('Weekend Pocket Money Allowance');
    const [selectedBulkIds, setSelectedBulkIds] = useState<Record<string, boolean>>({});
    const [isBulkDisbursing, setIsBulkDisbursing] = useState(false);
    const [lastBulkDisbursement, setLastBulkDisbursement] = useState<PocketMoneyTransaction[]>([]);

    // Statement State
    const [statementStudentId, setStatementStudentId] = useState<string>('');

    useEffect(() => {
        if (!instId) return;
        apiService.fetchModuleRecords<PocketMoneyAccount>('pocket_money_accounts', instId)
            .then(records => {
                if (Array.isArray(records)) {
                    setAccounts(records);
                    try { localStorage.setItem(`eduai_pocket_accounts_${instId}`, JSON.stringify(records)); } catch (_) {}
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<PocketMoneyTransaction>('pocket_money_transactions', instId)
            .then(records => {
                if (Array.isArray(records)) {
                    const sorted = [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setTransactions(sorted);
                    try { localStorage.setItem(`eduai_pocket_txns_${instId}`, JSON.stringify(sorted)); } catch (_) {}
                }
            })
            .catch(() => {});
    }, [instId]);

    const showBanner = (type: 'success' | 'error', text: string) => {
        setStatusBanner({ type, text });
        setTimeout(() => setStatusBanner(null), 4000);
    };

    const studentUsers = useMemo(() => {
        return (students || []).filter(s => !s.role || s.role === 'student');
    }, [students]);

    const accountByStudentId = useMemo(() => {
        const map = new Map<string, PocketMoneyAccount>();
        accounts.forEach(a => map.set(a.studentId, a));
        return map;
    }, [accounts]);

    const mergedWallets = useMemo(() => {
        return studentUsers.map(s => {
            const existing = accountByStudentId.get(s.id);
            const account: PocketMoneyAccount = existing || {
                id: `pm_acc_${s.id}`,
                institutionId: instId,
                studentId: s.id,
                studentName: s.name,
                admissionNumber: getStudentAdm(s),
                className: getStudentClass(s),
                balance: 0,
                status: 'active',
                parentName: getParentName(s),
                parentPhone: getParentPhone(s),
                updatedAt: new Date().toISOString()
            };
            return { student: s, account };
        });
    }, [studentUsers, accountByStudentId, instId]);

    const uniqueClasses = useMemo(() => {
        const set = new Set<string>();
        mergedWallets.forEach(w => {
            if (w.account.className) set.add(w.account.className);
        });
        return ['All', ...Array.from(set).sort()];
    }, [mergedWallets]);

    const filteredWallets = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        return mergedWallets.filter(({ account }) => {
            if (classFilter !== 'All' && account.className !== classFilter) return false;
            if (walletFilter === 'positive' && account.balance <= 0) return false;
            if (walletFilter === 'zero' && account.balance > 0) return false;
            if (walletFilter === 'frozen' && account.status !== 'frozen') return false;
            if (q) {
                const hay = `${account.studentName} ${account.admissionNumber} ${account.className} ${account.parentPhone || ''}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [mergedWallets, searchQuery, classFilter, walletFilter]);

    // KPI Metrics
    const kpis = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const totalCustodialBalance = mergedWallets.reduce((sum, w) => sum + (Number(w.account.balance) || 0), 0);
        const activeFundedWallets = mergedWallets.filter(w => w.account.balance > 0).length;
        const depositsToday = transactions
            .filter(t => t.type === 'deposit' && (t.createdAt || '').startsWith(todayStr))
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const withdrawalsToday = transactions
            .filter(t => (t.type === 'withdrawal' || t.type === 'refund') && (t.createdAt || '').startsWith(todayStr))
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        return { totalCustodialBalance, activeFundedWallets, depositsToday, withdrawalsToday };
    }, [mergedWallets, transactions]);

    const getStudentSpentStats = (studentId: string) => {
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];
        const weekAgoMs = now.getTime() - 7 * 24 * 60 * 60 * 1000;
        let spentToday = 0;
        let spentWeek = 0;
        transactions.forEach(t => {
            if (t.studentId !== studentId || t.type !== 'withdrawal') return;
            const amt = Number(t.amount) || 0;
            if ((t.createdAt || '').startsWith(todayStr)) spentToday += amt;
            if (new Date(t.createdAt).getTime() >= weekAgoMs) spentWeek += amt;
        });
        return { spentToday, spentWeek };
    };

    const persistAccountAndTx = async (nextAccount: PocketMoneyAccount, nextTx: PocketMoneyTransaction) => {
        const updatedAccounts = [
            nextAccount,
            ...accounts.filter(a => a.studentId !== nextAccount.studentId)
        ];
        const updatedTxns = [nextTx, ...transactions];
        setAccounts(updatedAccounts);
        setTransactions(updatedTxns);
        try {
            localStorage.setItem(`eduai_pocket_accounts_${instId}`, JSON.stringify(updatedAccounts));
            localStorage.setItem(`eduai_pocket_txns_${instId}`, JSON.stringify(updatedTxns));
        } catch (_) {}
        await apiService.saveModuleRecord('pocket_money_accounts', nextAccount).catch(() => {});
        await apiService.saveModuleRecord('pocket_money_transactions', nextTx).catch(() => {});
    };

    const notifyParent = async (account: PocketMoneyAccount, tx: PocketMoneyTransaction) => {
        if (!autoSendParentSms || !onSendSms || !account.parentPhone) return false;
        const actionLabel = tx.type === 'deposit' ? 'deposited to' : tx.type === 'refund' ? 'refunded from' : 'withdrawn from';
        const msg = `${institution.name}: KES ${tx.amount.toLocaleString()} ${actionLabel} ${account.studentName}'s pocket money${tx.purpose ? ` (${tx.purpose})` : ''}. New Balance: KES ${tx.balanceAfter.toLocaleString()}.`;
        try {
            await onSendSms(account.parentPhone, msg, smsConfig || institution.smsConfig, 1, instId);
            return true;
        } catch (_) {
            return false;
        }
    };

    const handleSubmitSingleTx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!txModal) return;
        const amt = Number(txAmount);
        if (Number.isNaN(amt) || amt <= 0) {
            showBanner('error', 'Please enter a valid positive amount.');
            return;
        }

        const { account, mode } = txModal;
        const currentBal = Number(account.balance) || 0;

        if (mode === 'withdrawal') {
            if (account.status === 'frozen') {
                showBanner('error', `${account.studentName}'s pocket money wallet is currently FROZEN.`);
                return;
            }
            if (amt > currentBal) {
                showBanner('error', `Insufficient pocket money balance (Available: KES ${currentBal.toLocaleString()}).`);
                return;
            }
            const { spentToday, spentWeek } = getStudentSpentStats(account.studentId);
            if (account.dailyLimit && account.dailyLimit > 0 && spentToday + amt > account.dailyLimit) {
                showBanner('error', `Exceeds daily limit of KES ${account.dailyLimit.toLocaleString()} (Spent today: KES ${spentToday.toLocaleString()}).`);
                return;
            }
            if (account.weeklyLimit && account.weeklyLimit > 0 && spentWeek + amt > account.weeklyLimit) {
                showBanner('error', `Exceeds weekly limit of KES ${account.weeklyLimit.toLocaleString()} (Spent last 7 days: KES ${spentWeek.toLocaleString()}).`);
                return;
            }
        } else if (mode === 'refund' && amt > currentBal) {
            showBanner('error', `Refund amount exceeds current balance (KES ${currentBal.toLocaleString()}).`);
            return;
        }

        setIsProcessingTx(true);
        try {
            const nextBal = mode === 'deposit' ? currentBal + amt : currentBal - amt;
            const nowIso = new Date().toISOString();
            const nextAccount: PocketMoneyAccount = {
                ...account,
                balance: nextBal,
                updatedAt: nowIso
            };
            const tx: PocketMoneyTransaction = {
                id: `pm_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                institutionId: instId,
                accountId: nextAccount.id,
                studentId: account.studentId,
                studentName: account.studentName,
                admissionNumber: account.admissionNumber,
                className: account.className,
                type: mode,
                amount: amt,
                balanceBefore: currentBal,
                balanceAfter: nextBal,
                paymentMode: txPaymentMode,
                referenceNumber: txRef.trim() || `PM-${Date.now().toString().slice(-6)}`,
                purpose: txPurpose.trim() || (mode === 'deposit' ? 'Parent Pocket Money Top-Up' : mode === 'refund' ? 'End-of-Term Balance Refund' : 'Student Cash Withdrawal'),
                issuedBy: currentUser?.name || 'Bursar / Matron',
                createdAt: nowIso
            };

            const notified = await notifyParent(nextAccount, tx);
            tx.parentNotified = notified;

            await persistAccountAndTx(nextAccount, tx);
            onLogAction?.(`Pocket Money ${mode}: KES ${amt} for ${account.studentName} (Bal: KES ${nextBal})`);

            setTxModal(null);
            setTxAmount('');
            setTxRef('');
            setTxPurpose('');
            showBanner('success', `${mode === 'deposit' ? 'Deposit' : mode === 'refund' ? 'Refund' : 'Withdrawal'} of KES ${amt.toLocaleString()} recorded for ${account.studentName}. New balance: KES ${nextBal.toLocaleString()}.`);
        } finally {
            setIsProcessingTx(false);
        }
    };

    const handleSaveLimits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!limitsModal) return;
        const updated: PocketMoneyAccount = {
            ...limitsModal,
            dailyLimit: editDailyLimit.trim() ? Math.max(0, Number(editDailyLimit) || 0) : undefined,
            weeklyLimit: editWeeklyLimit.trim() ? Math.max(0, Number(editWeeklyLimit) || 0) : undefined,
            parentPhone: editParentPhone.trim() || limitsModal.parentPhone,
            status: editStatus,
            updatedAt: new Date().toISOString()
        };
        const updatedAccounts = [updated, ...accounts.filter(a => a.studentId !== updated.studentId)];
        setAccounts(updatedAccounts);
        try { localStorage.setItem(`eduai_pocket_accounts_${instId}`, JSON.stringify(updatedAccounts)); } catch (_) {}
        await apiService.saveModuleRecord('pocket_money_accounts', updated).catch(() => {});
        setLimitsModal(null);
        showBanner('success', `Updated wallet controls for ${updated.studentName}.`);
    };

    // Bulk Disbursement Helpers
    const bulkCandidates = useMemo(() => {
        return mergedWallets.filter(({ account }) => {
            if (bulkClass !== 'All' && account.className !== bulkClass) return false;
            return true;
        });
    }, [mergedWallets, bulkClass]);

    const handleBulkDisburse = async () => {
        const amt = Number(bulkAmount) || 0;
        if (amt <= 0) {
            showBanner('error', 'Enter a valid payout amount.');
            return;
        }
        const selected = bulkCandidates.filter(({ account }) =>
            selectedBulkIds[account.studentId] && account.status !== 'frozen' && account.balance >= amt
        );
        if (selected.length === 0) {
            showBanner('error', 'Select at least one eligible student with sufficient balance.');
            return;
        }
        setIsBulkDisbursing(true);
        try {
            const nowIso = new Date().toISOString();
            const newAccountsMap = new Map<string, PocketMoneyAccount>(accounts.map(a => [a.studentId, a]));
            const createdTxns: PocketMoneyTransaction[] = [];

            for (const { account } of selected) {
                const nextBal = account.balance - amt;
                const nextAcc: PocketMoneyAccount = { ...account, balance: nextBal, updatedAt: nowIso };
                const tx: PocketMoneyTransaction = {
                    id: `pm_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                    institutionId: instId,
                    accountId: nextAcc.id,
                    studentId: account.studentId,
                    studentName: account.studentName,
                    admissionNumber: account.admissionNumber,
                    className: account.className,
                    type: 'withdrawal',
                    amount: amt,
                    balanceBefore: account.balance,
                    balanceAfter: nextBal,
                    paymentMode: 'cash',
                    referenceNumber: `BULK-${Date.now().toString().slice(-5)}`,
                    purpose: bulkPurpose.trim() || 'Bulk Pocket Money Payout',
                    issuedBy: currentUser?.name || 'Bursar / Matron',
                    createdAt: nowIso
                };
                newAccountsMap.set(account.studentId, nextAcc);
                createdTxns.push(tx);
                await apiService.saveModuleRecord('pocket_money_accounts', nextAcc).catch(() => {});
                await apiService.saveModuleRecord('pocket_money_transactions', tx).catch(() => {});
                await notifyParent(nextAcc, tx);
            }

            const updatedAccounts = Array.from(newAccountsMap.values());
            const updatedTxns = [...createdTxns, ...transactions];
            setAccounts(updatedAccounts);
            setTransactions(updatedTxns);
            setLastBulkDisbursement(createdTxns);
            setSelectedBulkIds({});
            try {
                localStorage.setItem(`eduai_pocket_accounts_${instId}`, JSON.stringify(updatedAccounts));
                localStorage.setItem(`eduai_pocket_txns_${instId}`, JSON.stringify(updatedTxns));
            } catch (_) {}
            showBanner('success', `Disbursed KES ${amt.toLocaleString()} each to ${createdTxns.length} students (Total: KES ${(amt * createdTxns.length).toLocaleString()}).`);
        } finally {
            setIsBulkDisbursing(false);
        }
    };

    const printSignOffSheet = (rows: PocketMoneyTransaction[]) => {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;
        const total = rows.reduce((s, r) => s + r.amount, 0);
        win.document.write(`
            <html><head><title>Pocket Money Sign-Off Sheet</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                h2, p { margin: 0 0 6px; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background: #f1f5f9; }
            </style></head><body>
            <h2>${institution.name} — Student Pocket Money Disbursement Sign-Off Sheet</h2>
            <p>Date: ${new Date().toLocaleDateString()} • Purpose: ${rows[0]?.purpose || bulkPurpose} • Issued By: ${currentUser?.name || 'Bursar / Matron'}</p>
            <table>
                <thead><tr><th>#</th><th>Adm No</th><th>Student Name</th><th>Class</th><th>Amount Issued (KES)</th><th>Balance After (KES)</th><th>Student Signature</th></tr></thead>
                <tbody>
                    ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.admissionNumber}</td><td>${r.studentName}</td><td>${r.className || '-'}</td><td>${r.amount.toLocaleString()}</td><td>${r.balanceAfter.toLocaleString()}</td><td style="width:160px;"></td></tr>`).join('')}
                    <tr><td colspan="4"><strong>TOTAL (${rows.length} Students)</strong></td><td><strong>KES ${total.toLocaleString()}</strong></td><td colspan="2"></td></tr>
                </tbody>
            </table>
            <script>window.print();</script>
            </body></html>
        `);
        win.document.close();
    };

    // Ledger Filtering & CSV Export
    const filteredLedger = useMemo(() => {
        const q = ledgerSearch.trim().toLowerCase();
        return transactions.filter(t => {
            if (ledgerTypeFilter !== 'all' && t.type !== ledgerTypeFilter) return false;
            if (ledgerModeFilter !== 'all' && t.paymentMode !== ledgerModeFilter) return false;
            if (q) {
                const hay = `${t.studentName} ${t.admissionNumber} ${t.referenceNumber || ''} ${t.purpose || ''} ${t.issuedBy}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            return true;
        });
    }, [transactions, ledgerTypeFilter, ledgerModeFilter, ledgerSearch]);

    const exportLedgerCsv = () => {
        const headers = ['Date', 'Student', 'Adm No', 'Type', 'Mode', 'Reference', 'Purpose', 'Amount (KES)', 'Balance After (KES)', 'Issued By'];
        const lines = [
            headers.join(','),
            ...filteredLedger.map(t => [
                new Date(t.createdAt).toLocaleString().replace(/,/g, ''),
                `"${t.studentName}"`,
                `"${t.admissionNumber}"`,
                t.type,
                t.paymentMode,
                `"${t.referenceNumber || ''}"`,
                `"${(t.purpose || '').replace(/"/g, '""')}"`,
                t.amount,
                t.balanceAfter,
                `"${t.issuedBy}"`
            ].join(','))
        ];
        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pocket_money_ledger_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Student Statement Data
    const statementAccount = useMemo(() => {
        if (!statementStudentId && mergedWallets.length > 0) return mergedWallets[0].account;
        return mergedWallets.find(w => w.account.studentId === statementStudentId)?.account || null;
    }, [statementStudentId, mergedWallets]);

    const statementTxns = useMemo(() => {
        if (!statementAccount) return [];
        return transactions.filter(t => t.studentId === statementAccount.studentId);
    }, [transactions, statementAccount]);

    const printStudentStatement = () => {
        if (!statementAccount) return;
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;
        const totalIn = statementTxns.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
        const totalOut = statementTxns.filter(t => t.type !== 'deposit').reduce((s, t) => s + t.amount, 0);
        win.document.write(`
            <html><head><title>Pocket Money Statement - ${statementAccount.studentName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background: #f1f5f9; }
            </style></head><body>
            <h2>${institution.name} — Student Pocket Money Statement</h2>
            <p><strong>Student:</strong> ${statementAccount.studentName} (${statementAccount.admissionNumber}) • <strong>Class:</strong> ${statementAccount.className}</p>
            <p><strong>Total Deposited:</strong> KES ${totalIn.toLocaleString()} • <strong>Total Withdrawn:</strong> KES ${totalOut.toLocaleString()} • <strong>Current Balance:</strong> KES ${statementAccount.balance.toLocaleString()}</p>
            <table>
                <thead><tr><th>Date</th><th>Type</th><th>Mode / Ref</th><th>Purpose</th><th>Amount (KES)</th><th>Balance (KES)</th></tr></thead>
                <tbody>
                    ${statementTxns.map(t => `<tr><td>${new Date(t.createdAt).toLocaleString()}</td><td style="text-transform:uppercase">${t.type}</td><td>${t.paymentMode.toUpperCase()} / ${t.referenceNumber || '-'}</td><td>${t.purpose || '-'}</td><td>${t.type === 'deposit' ? '+' : '-'}${t.amount.toLocaleString()}</td><td>${t.balanceAfter.toLocaleString()}</td></tr>`).join('')}
                </tbody>
            </table>
            <script>window.print();</script>
            </body></html>
        `);
        win.document.close();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header & Sub-Navigation */}
            <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-900 rounded-3xl p-6 text-white shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Custodial Trust Account • Separate from School Fees
                    </span>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5 mt-1">
                        <WalletIcon className="w-7 h-7 text-emerald-400" />
                        Student Pocket Money Manager
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                        Manage student deposits, controlled withdrawals, bulk boarding payouts, and parent statements without mixing with fee revenue.
                    </p>
                </div>
                <label className="flex items-center gap-2.5 bg-white/10 px-4 py-2.5 rounded-2xl border border-white/15 cursor-pointer self-start lg:self-auto">
                    <input
                        type="checkbox"
                        checked={autoSendParentSms}
                        onChange={e => setAutoSendParentSms(e.target.checked)}
                        className="w-4 h-4 accent-emerald-400"
                    />
                    <span className="text-xs font-bold">Auto-SMS Parent Alerts</span>
                </label>
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Custodial Liability Held</span>
                    <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">
                        KES {kpis.totalCustodialBalance.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500">Total student pocket money held</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Deposits Today</span>
                    <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                        KES {kpis.depositsToday.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500">Parent top-ups received today</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-600">Withdrawals Today</span>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                        KES {kpis.withdrawalsToday.toLocaleString()}
                    </div>
                    <span className="text-[10px] text-slate-500">Cash issued &amp; refunds today</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Funded Wallets</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                        {kpis.activeFundedWallets} / {mergedWallets.length}
                    </div>
                    <span className="text-[10px] text-slate-500">Students with positive balance</span>
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                {[
                    { id: 'wallets', label: 'Student Wallets' },
                    { id: 'bulk', label: 'Bulk Payout & Sign-Off' },
                    { id: 'ledger', label: `Trust Cashbook (${transactions.length})` },
                    { id: 'statement', label: 'Student Statement' }
                ].map(t => (
                    <button
                        key={t.id}
                        type="button"
                        onClick={() => setSubTab(t.id as any)}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            subTab === t.id
                                ? 'bg-indigo-600 text-white shadow-sm'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* TAB 1: STUDENT WALLETS */}
            {subTab === 'wallets' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search student name, admission no, or parent phone..."
                            className="flex-1 min-w-[220px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                        />
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={classFilter}
                                onChange={e => setClassFilter(e.target.value)}
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            >
                                {uniqueClasses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>)}
                            </select>
                            <select
                                value={walletFilter}
                                onChange={e => setWalletFilter(e.target.value as any)}
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            >
                                <option value="all">All Wallets</option>
                                <option value="positive">With Balance (&gt; 0)</option>
                                <option value="zero">Zero Balance</option>
                                <option value="frozen">Frozen Wallets</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3.5">Student</th>
                                    <th className="p-3.5">Class</th>
                                    <th className="p-3.5">Balance (KES)</th>
                                    <th className="p-3.5">Limits / Status</th>
                                    <th className="p-3.5 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredWallets.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="p-10 text-center text-slate-400 font-medium">
                                            No matching students found.
                                        </td>
                                    </tr>
                                ) : filteredWallets.map(({ student, account }) => (
                                    <tr key={account.studentId} className="hover:bg-slate-50/70 dark:hover:bg-slate-900/30">
                                        <td className="p-3.5">
                                            <div className="font-black text-slate-900 dark:text-white">{account.studentName}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">
                                                Adm: {account.admissionNumber || '-'} {account.parentPhone ? `• Parent: ${account.parentPhone}` : ''}
                                            </div>
                                        </td>
                                        <td className="p-3.5 font-bold text-slate-600 dark:text-slate-300">{account.className}</td>
                                        <td className="p-3.5">
                                            <span className={`text-sm font-black ${account.balance > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                                                KES {account.balance.toLocaleString()}
                                            </span>
                                        </td>
                                        <td className="p-3.5">
                                            <div className="flex flex-wrap items-center gap-1.5">
                                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                    account.status === 'frozen'
                                                        ? 'bg-rose-100 text-rose-700'
                                                        : 'bg-emerald-100 text-emerald-700'
                                                }`}>
                                                    {account.status}
                                                </span>
                                                {account.dailyLimit ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold">
                                                        Day: KES {account.dailyLimit}
                                                    </span>
                                                ) : null}
                                                {account.weeklyLimit ? (
                                                    <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold">
                                                        Wk: KES {account.weeklyLimit}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </td>
                                        <td className="p-3.5 text-right">
                                            <div className="flex flex-wrap justify-end gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTxModal({ student, account, mode: 'deposit' });
                                                        setTxAmount('');
                                                        setTxPaymentMode('cash');
                                                        setTxPurpose('Parent Pocket Money Top-Up');
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase cursor-pointer"
                                                >
                                                    + Deposit
                                                </button>
                                                <button
                                                    type="button"
                                                    disabled={account.balance <= 0 || account.status === 'frozen'}
                                                    onClick={() => {
                                                        setTxModal({ student, account, mode: 'withdrawal' });
                                                        setTxAmount('');
                                                        setTxPaymentMode('cash');
                                                        setTxPurpose('Student Cash Withdrawal');
                                                    }}
                                                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-black text-[10px] uppercase disabled:opacity-40 cursor-pointer"
                                                >
                                                    - Withdraw
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setLimitsModal(account);
                                                        setEditDailyLimit(account.dailyLimit ? String(account.dailyLimit) : '');
                                                        setEditWeeklyLimit(account.weeklyLimit ? String(account.weeklyLimit) : '');
                                                        setEditParentPhone(account.parentPhone || '');
                                                        setEditStatus(account.status);
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-[10px] uppercase cursor-pointer"
                                                >
                                                    Limits
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setStatementStudentId(account.studentId);
                                                        setSubTab('statement');
                                                    }}
                                                    className="px-2.5 py-1.5 rounded-lg border border-indigo-200 text-indigo-600 hover:bg-indigo-50 font-bold text-[10px] uppercase cursor-pointer"
                                                >
                                                    Statement
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 2: BULK DISBURSEMENT & SIGN-OFF SHEET */}
            {subTab === 'bulk' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div>
                            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <UserGroupIcon className="w-5 h-5 text-indigo-600" />
                                Bulk Pocket Money Disbursement &amp; Sign-Off Sheet
                            </h3>
                            <p className="text-xs text-slate-500">Issue a standard allowance to multiple students at once and print a physical signature sheet.</p>
                        </div>
                        {lastBulkDisbursement.length > 0 && (
                            <button
                                type="button"
                                onClick={() => printSignOffSheet(lastBulkDisbursement)}
                                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white font-black text-xs uppercase flex items-center gap-2 cursor-pointer"
                            >
                                <PrinterIcon className="w-4 h-4" />
                                Print Last Sign-Off Sheet ({lastBulkDisbursement.length})
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Filter Class</label>
                            <select
                                value={bulkClass}
                                onChange={e => setBulkClass(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                {uniqueClasses.map(c => <option key={c} value={c}>{c === 'All' ? 'All Classes' : c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Amount Per Student (KES)</label>
                            <input
                                type="number"
                                min={1}
                                value={bulkAmount}
                                onChange={e => setBulkAmount(Math.max(1, Number(e.target.value) || 0))}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Disbursement Purpose</label>
                            <input
                                type="text"
                                value={bulkPurpose}
                                onChange={e => setBulkPurpose(e.target.value)}
                                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            />
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => {
                                const next: Record<string, boolean> = {};
                                bulkCandidates.forEach(({ account }) => {
                                    if (account.status !== 'frozen' && account.balance >= bulkAmount) {
                                        next[account.studentId] = true;
                                    }
                                });
                                setSelectedBulkIds(next);
                            }}
                            className="text-xs font-black text-indigo-600 hover:underline cursor-pointer"
                        >
                            Select All Eligible ({bulkCandidates.filter(c => c.account.status !== 'frozen' && c.account.balance >= bulkAmount).length})
                        </button>
                        <button
                            type="button"
                            disabled={isBulkDisbursing}
                            onClick={handleBulkDisburse}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer"
                        >
                            {isBulkDisbursing ? 'Disbursing...' : `Disburse KES ${bulkAmount.toLocaleString()} to Selected`}
                        </button>
                    </div>

                    <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead className="sticky top-0 bg-slate-50 dark:bg-slate-900 text-slate-400 font-black uppercase text-[10px]">
                                <tr>
                                    <th className="p-3 w-10">Pick</th>
                                    <th className="p-3">Student</th>
                                    <th className="p-3">Class</th>
                                    <th className="p-3">Current Balance</th>
                                    <th className="p-3">Eligibility</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {bulkCandidates.map(({ account }) => {
                                    const eligible = account.status !== 'frozen' && account.balance >= bulkAmount;
                                    return (
                                        <tr key={account.studentId} className={eligible ? '' : 'opacity-50'}>
                                            <td className="p-3">
                                                <input
                                                    type="checkbox"
                                                    disabled={!eligible}
                                                    checked={Boolean(selectedBulkIds[account.studentId])}
                                                    onChange={e => setSelectedBulkIds(prev => ({ ...prev, [account.studentId]: e.target.checked }))}
                                                    className="w-4 h-4 accent-emerald-600"
                                                />
                                            </td>
                                            <td className="p-3 font-bold text-slate-900 dark:text-white">
                                                {account.studentName} <span className="text-[10px] font-mono text-slate-400">({account.admissionNumber})</span>
                                            </td>
                                            <td className="p-3">{account.className}</td>
                                            <td className="p-3 font-black text-emerald-600">KES {account.balance.toLocaleString()}</td>
                                            <td className="p-3">
                                                {account.status === 'frozen' ? (
                                                    <span className="text-rose-600 font-bold text-[10px]">Frozen</span>
                                                ) : account.balance < bulkAmount ? (
                                                    <span className="text-amber-600 font-bold text-[10px]">Insufficient Balance</span>
                                                ) : (
                                                    <span className="text-emerald-600 font-bold text-[10px]">Eligible</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 3: TRUST CASHBOOK LEDGER */}
            {subTab === 'ledger' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex flex-wrap gap-3 items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
                        <input
                            type="text"
                            value={ledgerSearch}
                            onChange={e => setLedgerSearch(e.target.value)}
                            placeholder="Search student, reference, purpose, or issuer..."
                            className="flex-1 min-w-[200px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                        />
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={ledgerTypeFilter}
                                onChange={e => setLedgerTypeFilter(e.target.value as any)}
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            >
                                <option value="all">All Types</option>
                                <option value="deposit">Deposits</option>
                                <option value="withdrawal">Withdrawals</option>
                                <option value="refund">Refunds</option>
                            </select>
                            <select
                                value={ledgerModeFilter}
                                onChange={e => setLedgerModeFilter(e.target.value as any)}
                                className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                            >
                                <option value="all">All Modes</option>
                                <option value="cash">Cash</option>
                                <option value="mpesa">M-Pesa</option>
                                <option value="bank">Bank</option>
                            </select>
                            <button
                                type="button"
                                onClick={exportLedgerCsv}
                                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase cursor-pointer"
                            >
                                Export CSV
                            </button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3.5">Date</th>
                                    <th className="p-3.5">Student</th>
                                    <th className="p-3.5">Type</th>
                                    <th className="p-3.5">Mode / Ref</th>
                                    <th className="p-3.5">Purpose</th>
                                    <th className="p-3.5">Amount</th>
                                    <th className="p-3.5">Balance After</th>
                                    <th className="p-3.5">Issued By</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {filteredLedger.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="p-10 text-center text-slate-400">No pocket money transactions recorded yet.</td>
                                    </tr>
                                ) : filteredLedger.map(t => (
                                    <tr key={t.id}>
                                        <td className="p-3.5 font-mono text-[11px] text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                                        <td className="p-3.5 font-bold text-slate-900 dark:text-white">{t.studentName}</td>
                                        <td className="p-3.5">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                t.type === 'deposit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className="p-3.5 font-mono text-[11px]">{t.paymentMode.toUpperCase()} • {t.referenceNumber || '-'}</td>
                                        <td className="p-3.5 text-slate-600 dark:text-slate-300">{t.purpose || '-'}</td>
                                        <td className={`p-3.5 font-black ${t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                            {t.type === 'deposit' ? '+' : '-'}KES {t.amount.toLocaleString()}
                                        </td>
                                        <td className="p-3.5 font-bold">KES {t.balanceAfter.toLocaleString()}</td>
                                        <td className="p-3.5 text-slate-500">{t.issuedBy}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB 4: STUDENT STATEMENT */}
            {subTab === 'statement' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                        <div className="flex items-center gap-3 flex-1 w-full sm:w-auto">
                            <label className="text-xs font-black uppercase text-slate-500 whitespace-nowrap">Student:</label>
                            <select
                                value={statementAccount?.studentId || ''}
                                onChange={e => setStatementStudentId(e.target.value)}
                                className="flex-1 max-w-md px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                            >
                                {mergedWallets.map(({ account }) => (
                                    <option key={account.studentId} value={account.studentId}>
                                        {account.studentName} ({account.admissionNumber}) — KES {account.balance.toLocaleString()}
                                    </option>
                                ))}
                            </select>
                        </div>
                        {statementAccount && (
                            <button
                                type="button"
                                onClick={printStudentStatement}
                                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase flex items-center gap-2 cursor-pointer"
                            >
                                <PrinterIcon className="w-4 h-4" />
                                Print Statement
                            </button>
                        )}
                    </div>

                    {statementAccount && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                                    <span className="text-[10px] font-black uppercase text-emerald-700">Total Deposited</span>
                                    <div className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                                        KES {statementTxns.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                                    <span className="text-[10px] font-black uppercase text-rose-700">Total Withdrawn / Refunded</span>
                                    <div className="text-xl font-black text-rose-700 dark:text-rose-400">
                                        KES {statementTxns.filter(t => t.type !== 'deposit').reduce((s, t) => s + t.amount, 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800">
                                    <span className="text-[10px] font-black uppercase text-indigo-700">Current Balance</span>
                                    <div className="text-xl font-black text-indigo-700 dark:text-indigo-400">
                                        KES {statementAccount.balance.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                            <th className="p-3">Date</th>
                                            <th className="p-3">Type</th>
                                            <th className="p-3">Mode / Ref</th>
                                            <th className="p-3">Purpose</th>
                                            <th className="p-3">Amount</th>
                                            <th className="p-3">Balance After</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {statementTxns.length === 0 ? (
                                            <tr><td colSpan={6} className="p-8 text-center text-slate-400">No transactions yet for this student.</td></tr>
                                        ) : statementTxns.map(t => (
                                            <tr key={t.id}>
                                                <td className="p-3 font-mono text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                                                <td className="p-3 uppercase font-black">{t.type}</td>
                                                <td className="p-3 font-mono">{t.paymentMode.toUpperCase()} • {t.referenceNumber || '-'}</td>
                                                <td className="p-3">{t.purpose || '-'}</td>
                                                <td className={`p-3 font-black ${t.type === 'deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {t.type === 'deposit' ? '+' : '-'}KES {t.amount.toLocaleString()}
                                                </td>
                                                <td className="p-3 font-bold">KES {t.balanceAfter.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* DEPOSIT / WITHDRAW / REFUND MODAL */}
            {txModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <BanknotesIcon className="w-5 h-5 text-emerald-600" />
                                    {txModal.mode === 'deposit' ? 'Deposit Pocket Money' : txModal.mode === 'refund' ? 'Refund Pocket Money' : 'Withdraw Pocket Money'}
                                </h3>
                                <p className="text-xs text-slate-500">
                                    {txModal.account.studentName} • Current Balance: <strong>KES {txModal.account.balance.toLocaleString()}</strong>
                                </p>
                            </div>
                            <button type="button" onClick={() => setTxModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitSingleTx} className="p-5 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Amount (KES) *</label>
                                <input
                                    type="number"
                                    min={1}
                                    required
                                    value={txAmount}
                                    onChange={e => setTxAmount(e.target.value)}
                                    placeholder="e.g. 500"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-base font-black"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Payment Mode</label>
                                    <select
                                        value={txPaymentMode}
                                        onChange={e => setTxPaymentMode(e.target.value as any)}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                    >
                                        <option value="cash">Cash</option>
                                        <option value="mpesa">M-Pesa</option>
                                        <option value="bank">Bank</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Reference (Optional)</label>
                                    <input
                                        type="text"
                                        value={txRef}
                                        onChange={e => setTxRef(e.target.value)}
                                        placeholder="M-Pesa / Slip #"
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Purpose / Narration</label>
                                <input
                                    type="text"
                                    value={txPurpose}
                                    onChange={e => setTxPurpose(e.target.value)}
                                    placeholder="e.g. Weekend allowance, toiletries, parent deposit"
                                    className="w-full px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setTxModal(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isProcessingTx}
                                    className={`px-5 py-2.5 rounded-xl text-white text-xs font-black uppercase tracking-wider shadow-md disabled:opacity-50 cursor-pointer ${
                                        txModal.mode === 'deposit' ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-amber-600 hover:bg-amber-500'
                                    }`}
                                >
                                    {isProcessingTx ? 'Processing...' : txModal.mode === 'deposit' ? 'Record Deposit' : 'Issue Withdrawal'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* LIMITS & FREEZE MODAL */}
            {limitsModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Wallet Controls &amp; Limits</h3>
                                <p className="text-xs text-slate-500">{limitsModal.studentName}</p>
                            </div>
                            <button type="button" onClick={() => setLimitsModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveLimits} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Daily Limit (KES)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={editDailyLimit}
                                        onChange={e => setEditDailyLimit(e.target.value)}
                                        placeholder="No limit"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Weekly Limit (KES)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={editWeeklyLimit}
                                        onChange={e => setEditWeeklyLimit(e.target.value)}
                                        placeholder="No limit"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Parent Alert Phone</label>
                                <input
                                    type="text"
                                    value={editParentPhone}
                                    onChange={e => setEditParentPhone(e.target.value)}
                                    placeholder="07XXXXXXXX"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Wallet Status</label>
                                <select
                                    value={editStatus}
                                    onChange={e => setEditStatus(e.target.value as any)}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                >
                                    <option value="active">Active (Withdrawals Allowed)</option>
                                    <option value="frozen">Frozen (Block All Withdrawals)</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setLimitsModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase cursor-pointer">
                                    Save Controls
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
