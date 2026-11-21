import React, { useState, useEffect, useMemo } from 'react';
import type { User, CompanyDetails } from '../../types';
import { apiService } from '../../services/apiService';
import { PayNowModal } from '../PayNowModal';
import type {
    PocketMoneyAccount,
    PocketMoneyTransaction,
    PocketMoneyWalletConfig
} from './StudentPocketMoneyManager';
import {
    DEFAULT_POCKET_MONEY_FEE_CONFIG,
    calculatePocketMoneyCharges,
    type PocketMoneyFeeConfig,
    type PocketMoneyRevenueLog
} from '../SuperAdminPocketMoneyManager';
import { Wallet, CreditCard, ShieldCheck, Printer, Lock, Unlock, CheckCircle, AlertCircle, X } from 'lucide-react';

interface ParentPocketMoneyPanelProps {
    parentUser?: User;
    childrenList: User[];
    institutionId: string;
    institutionName?: string;
    companyDetails?: CompanyDetails;
}

export const ParentPocketMoneyPanel: React.FC<ParentPocketMoneyPanelProps> = ({
    parentUser,
    childrenList,
    institutionId,
    institutionName = 'School',
    companyDetails
}) => {
    const [accounts, setAccounts] = useState<PocketMoneyAccount[]>(() => {
        if (!institutionId) return [];
        try {
            const raw = localStorage.getItem(`eduai_pocket_accounts_${institutionId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    });
    const [transactions, setTransactions] = useState<PocketMoneyTransaction[]>(() => {
        if (!institutionId) return [];
        try {
            const raw = localStorage.getItem(`eduai_pocket_txns_${institutionId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    });
    const [walletConfig, setWalletConfig] = useState<PocketMoneyWalletConfig | null>(() => {
        if (!institutionId) return null;
        try {
            const raw = localStorage.getItem(`eduai_pocket_wallet_cfg_${institutionId}`);
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return null;
    });
    const [feeConfig, setFeeConfig] = useState<PocketMoneyFeeConfig>(() => {
        try {
            const raw = localStorage.getItem('eduai_pocket_money_fee_config');
            if (raw) return { ...DEFAULT_POCKET_MONEY_FEE_CONFIG, ...JSON.parse(raw) };
        } catch (_) {}
        return DEFAULT_POCKET_MONEY_FEE_CONFIG;
    });

    const [selectedChildId, setSelectedChildId] = useState<string>(childrenList[0]?.id || '');
    const [topUpModal, setTopUpModal] = useState<{ child: User; account: PocketMoneyAccount } | null>(null);
    const [topUpAmount, setTopUpAmount] = useState<string>('500');
    const [topUpNote, setTopUpNote] = useState<string>('Parent Pocket Money Top-Up');
    const [ncbaPayContext, setNcbaPayContext] = useState<{ child: User; account: PocketMoneyAccount; amount: number; note: string } | null>(null);

    const [limitsModal, setLimitsModal] = useState<PocketMoneyAccount | null>(null);
    const [dailyLimitInput, setDailyLimitInput] = useState<string>('');
    const [weeklyLimitInput, setWeeklyLimitInput] = useState<string>('');
    const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        if (!selectedChildId && childrenList.length > 0) {
            setSelectedChildId(childrenList[0].id);
        }
    }, [childrenList, selectedChildId]);

    useEffect(() => {
        if (!institutionId) return;
        apiService.fetchModuleRecords<PocketMoneyAccount>('pocket_money_accounts', institutionId)
            .then(records => {
                if (Array.isArray(records)) {
                    setAccounts(records);
                    try { localStorage.setItem(`eduai_pocket_accounts_${institutionId}`, JSON.stringify(records)); } catch (_) {}
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<PocketMoneyTransaction>('pocket_money_transactions', institutionId)
            .then(records => {
                if (Array.isArray(records)) {
                    const sorted = [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setTransactions(sorted);
                    try { localStorage.setItem(`eduai_pocket_txns_${institutionId}`, JSON.stringify(sorted)); } catch (_) {}
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<PocketMoneyWalletConfig>('pocket_money_wallet_configs', institutionId)
            .then(records => {
                if (Array.isArray(records) && records.length > 0) {
                    setWalletConfig(records[0]);
                    try { localStorage.setItem(`eduai_pocket_wallet_cfg_${institutionId}`, JSON.stringify(records[0])); } catch (_) {}
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<PocketMoneyFeeConfig>('pocket_money_fee_config', 'SYSTEM')
            .then(records => {
                if (Array.isArray(records) && records.length > 0) {
                    const merged = { ...DEFAULT_POCKET_MONEY_FEE_CONFIG, ...records[0] };
                    setFeeConfig(merged);
                    try { localStorage.setItem('eduai_pocket_money_fee_config', JSON.stringify(merged)); } catch (_) {}
                }
            })
            .catch(() => {});
    }, [institutionId]);

    const showBanner = (type: 'success' | 'error', text: string) => {
        setStatusBanner({ type, text });
        setTimeout(() => setStatusBanner(null), 4500);
    };

    const childWallets = useMemo(() => {
        const byStudent = new Map<string, PocketMoneyAccount>();
        accounts.forEach(a => byStudent.set(a.studentId, a));

        return childrenList.map(child => {
            const existing = byStudent.get(child.id);
            const account: PocketMoneyAccount = existing || {
                id: `pm_acc_${child.id}`,
                institutionId,
                studentId: child.id,
                studentName: child.name,
                admissionNumber: String((child as any).admissionNumber || (child as any).admission_number || child.id.slice(-6)),
                className: String((child as any).studentClass || (child as any).classLevel || 'Student'),
                balance: 0,
                status: 'active',
                parentName: parentUser?.name,
                parentPhone: parentUser?.phoneNumber,
                updatedAt: new Date().toISOString()
            };
            const childTxns = transactions.filter(t => t.studentId === child.id);
            return { child, account, txns: childTxns };
        });
    }, [childrenList, accounts, transactions, institutionId, parentUser]);

    const activeChildWallet = useMemo(() => {
        return childWallets.find(c => c.child.id === selectedChildId) || childWallets[0] || null;
    }, [childWallets, selectedChildId]);

    const totalFamilyPocketBalance = useMemo(
        () => childWallets.reduce((sum, w) => sum + (Number(w.account.balance) || 0), 0),
        [childWallets]
    );

    const handleNcbaTopUpSuccess = async (receiptRef?: string) => {
        if (!ncbaPayContext) return;
        const { account, amount, note } = ncbaPayContext;
        const currentBal = Number(account.balance) || 0;
        const nextBal = currentBal + amount;
        const nowIso = new Date().toISOString();

        const nextAccount: PocketMoneyAccount = {
            ...account,
            balance: nextBal,
            parentName: parentUser?.name || account.parentName,
            parentPhone: parentUser?.phoneNumber || account.parentPhone,
            updatedAt: nowIso
        };

        const tx: PocketMoneyTransaction = {
            id: `pm_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            institutionId,
            accountId: nextAccount.id,
            studentId: account.studentId,
            studentName: account.studentName,
            admissionNumber: account.admissionNumber,
            className: account.className,
            type: 'deposit',
            amount,
            balanceBefore: currentBal,
            balanceAfter: nextBal,
            paymentMode: 'ncba',
            referenceNumber: receiptRef || `NCBA-${Date.now().toString().slice(-6)}`,
            purpose: note || 'Parent Online NCBA Pocket Money Top-Up',
            issuedBy: parentUser?.name || 'Parent Portal',
            parentNotified: true,
            createdAt: nowIso
        };

        const nextAccounts = [nextAccount, ...accounts.filter(a => a.studentId !== nextAccount.studentId)];
        const nextTxns = [tx, ...transactions];
        setAccounts(nextAccounts);
        setTransactions(nextTxns);
        try {
            localStorage.setItem(`eduai_pocket_accounts_${institutionId}`, JSON.stringify(nextAccounts));
            localStorage.setItem(`eduai_pocket_txns_${institutionId}`, JSON.stringify(nextTxns));
        } catch (_) {}

        await apiService.saveModuleRecord('pocket_money_accounts', nextAccount).catch(() => {});
        await apiService.saveModuleRecord('pocket_money_transactions', tx).catch(() => {});

        if (walletConfig) {
            const nextCfg: PocketMoneyWalletConfig = {
                ...walletConfig,
                ncbaFloatBalance: (Number(walletConfig.ncbaFloatBalance) || 0) + amount,
                totalCollectedViaNcba: (Number(walletConfig.totalCollectedViaNcba) || 0) + amount,
                updatedAt: nowIso
            };
            setWalletConfig(nextCfg);
            try { localStorage.setItem(`eduai_pocket_wallet_cfg_${institutionId}`, JSON.stringify(nextCfg)); } catch (_) {}
            await apiService.saveModuleRecord('pocket_money_wallet_configs', nextCfg).catch(() => {});
        }

        // Log Super Admin platform revenue from parent-paid charges
        const breakdown = calculatePocketMoneyCharges(amount, feeConfig);
        if (breakdown.totalExtraCharges > 0) {
            const revLog: PocketMoneyRevenueLog = {
                id: `pm_rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                institutionId: 'SYSTEM',
                schoolInstitutionId: institutionId,
                schoolName: institutionName,
                studentName: account.studentName,
                netPocketMoney: breakdown.netPocketMoney,
                processingFee: breakdown.processingFee,
                transferCharge: breakdown.transferCharge,
                mpesaAgentWithdrawalCharge: breakdown.mpesaAgentWithdrawalCharge,
                smsCharge: breakdown.smsCharge,
                totalExtraCharges: breakdown.totalExtraCharges,
                totalPaidByParent: breakdown.totalPayableByParent,
                referenceNumber: tx.referenceNumber || '',
                createdAt: nowIso
            };
            await apiService.saveModuleRecord('pocket_money_revenue_logs', revLog).catch(() => {});
            try {
                const rawRev = localStorage.getItem('eduai_pocket_money_revenue_logs');
                const arr = rawRev ? JSON.parse(rawRev) : [];
                localStorage.setItem('eduai_pocket_money_revenue_logs', JSON.stringify([revLog, ...(Array.isArray(arr) ? arr : [])]));
            } catch (_) {}
        }

        setNcbaPayContext(null);
        setTopUpModal(null);
        showBanner('success', `Top-up of KES ${amount.toLocaleString()} confirmed for ${account.studentName} (Ref: ${tx.referenceNumber}). New balance: KES ${nextBal.toLocaleString()}.`);
    };

    const handleToggleFreeze = async (account: PocketMoneyAccount) => {
        const nextStatus: 'active' | 'frozen' = account.status === 'frozen' ? 'active' : 'frozen';
        const updated: PocketMoneyAccount = {
            ...account,
            status: nextStatus,
            updatedAt: new Date().toISOString()
        };
        const nextAccounts = [updated, ...accounts.filter(a => a.studentId !== updated.studentId)];
        setAccounts(nextAccounts);
        try { localStorage.setItem(`eduai_pocket_accounts_${institutionId}`, JSON.stringify(nextAccounts)); } catch (_) {}
        await apiService.saveModuleRecord('pocket_money_accounts', updated).catch(() => {});
        showBanner('success', `${account.studentName}'s pocket money wallet is now ${nextStatus.toUpperCase()}.`);
    };

    const handleSaveLimits = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!limitsModal) return;
        const updated: PocketMoneyAccount = {
            ...limitsModal,
            dailyLimit: dailyLimitInput.trim() ? Math.max(0, Number(dailyLimitInput) || 0) : undefined,
            weeklyLimit: weeklyLimitInput.trim() ? Math.max(0, Number(weeklyLimitInput) || 0) : undefined,
            updatedAt: new Date().toISOString()
        };
        const nextAccounts = [updated, ...accounts.filter(a => a.studentId !== updated.studentId)];
        setAccounts(nextAccounts);
        try { localStorage.setItem(`eduai_pocket_accounts_${institutionId}`, JSON.stringify(nextAccounts)); } catch (_) {}
        await apiService.saveModuleRecord('pocket_money_accounts', updated).catch(() => {});
        setLimitsModal(null);
        showBanner('success', `Spending limits updated for ${updated.studentName}.`);
    };

    const printChildStatement = (account: PocketMoneyAccount, txns: PocketMoneyTransaction[]) => {
        const win = window.open('', '_blank', 'width=900,height=700');
        if (!win) return;
        const totalIn = txns.filter(t => t.type === 'deposit').reduce((s, t) => s + t.amount, 0);
        const totalOut = txns.filter(t => t.type !== 'deposit').reduce((s, t) => s + t.amount, 0);
        win.document.write(`
            <html><head><title>Pocket Money Statement - ${account.studentName}</title>
            <style>
                body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
                th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
                th { background: #f1f5f9; }
            </style></head><body>
            <h2>${institutionName} — Student Pocket Money Statement</h2>
            <p><strong>Student:</strong> ${account.studentName} (${account.admissionNumber}) • <strong>Class:</strong> ${account.className}</p>
            <p><strong>Total Deposited:</strong> KES ${totalIn.toLocaleString()} • <strong>Total Spent/Withdrawn:</strong> KES ${totalOut.toLocaleString()} • <strong>Current Balance:</strong> KES ${account.balance.toLocaleString()}</p>
            <table>
                <thead><tr><th>Date</th><th>Type</th><th>Mode / Ref</th><th>Purpose</th><th>Amount (KES)</th><th>Balance (KES)</th></tr></thead>
                <tbody>
                    ${txns.map(t => `<tr><td>${new Date(t.createdAt).toLocaleString()}</td><td style="text-transform:uppercase">${t.type}</td><td>${t.paymentMode.toUpperCase()} / ${t.referenceNumber || '-'}</td><td>${t.purpose || '-'}</td><td>${t.type === 'deposit' ? '+' : '-'}${t.amount.toLocaleString()}</td><td>${t.balanceAfter.toLocaleString()}</td></tr>`).join('')}
                </tbody>
            </table>
            <script>window.print();</script>
            </body></html>
        `);
        win.document.close();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-900 via-slate-900 to-indigo-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Student Custodial Pocket Money
                    </span>
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-2.5 mt-1">
                        <Wallet className="w-7 h-7 text-emerald-400" />
                        Children&apos;s Pocket Money
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                        Top up your children&apos;s pocket money securely, set daily/weekly spending limits, and track every withdrawal in real time.
                    </p>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-right">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-black block">Total Family Balance</span>
                    <span className="text-2xl font-black">KES {totalFamilyPocketBalance.toLocaleString()}</span>
                </div>
            </div>

            {statusBanner && (
                <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2 ${
                    statusBanner.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                }`}>
                    {statusBanner.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                    <span>{statusBanner.text}</span>
                </div>
            )}

            {!walletConfig?.isActivated && (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                    <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5 text-amber-600" />
                    <div>
                        <strong>Online NCBA Top-Up Not Yet Activated by School:</strong> You can still view live balances, statements, and set spending limits here. Online NCBA top-ups will activate automatically once your school enables its Pocket Money NCBA Wallet.
                    </div>
                </div>
            )}

            {childWallets.length === 0 ? (
                <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 text-slate-400 text-sm font-medium">
                    No linked students found on your parent account.
                </div>
            ) : (
                <>
                    {/* Child Wallet Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {childWallets.map(({ child, account, txns }) => {
                            const isSelected = activeChildWallet?.child.id === child.id;
                            return (
                                <div
                                    key={child.id}
                                    onClick={() => setSelectedChildId(child.id)}
                                    className={`bg-white dark:bg-slate-800 rounded-3xl p-5 border-2 transition-all cursor-pointer space-y-4 shadow-sm ${
                                        isSelected
                                            ? 'border-emerald-500 shadow-lg shadow-emerald-500/10'
                                            : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div>
                                            <h3 className="font-black text-base text-slate-900 dark:text-white">{account.studentName}</h3>
                                            <p className="text-[11px] text-slate-500 font-mono">
                                                Adm: {account.admissionNumber} • {account.className}
                                            </p>
                                        </div>
                                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                            account.status === 'frozen'
                                                ? 'bg-rose-100 text-rose-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {account.status}
                                        </span>
                                    </div>

                                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-700">
                                        <span className="text-[10px] font-black uppercase text-slate-400 block">Available Balance</span>
                                        <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                            KES {account.balance.toLocaleString()}
                                        </span>
                                        <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-bold text-slate-500">
                                            <span>Daily Limit: {account.dailyLimit ? `KES ${account.dailyLimit.toLocaleString()}` : 'None'}</span>
                                            <span>•</span>
                                            <span>Weekly Limit: {account.weeklyLimit ? `KES ${account.weeklyLimit.toLocaleString()}` : 'None'}</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-2" onClick={e => e.stopPropagation()}>
                                        {walletConfig?.isActivated && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTopUpModal({ child, account });
                                                    setTopUpAmount('500');
                                                    setTopUpNote('Parent Online NCBA Pocket Money Top-Up');
                                                }}
                                                className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                                            >
                                                <CreditCard className="w-3.5 h-3.5" />
                                                Top Up (NCBA)
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setLimitsModal(account);
                                                setDailyLimitInput(account.dailyLimit ? String(account.dailyLimit) : '');
                                                setWeeklyLimitInput(account.weeklyLimit ? String(account.weeklyLimit) : '');
                                            }}
                                            className="py-2.5 px-3 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-bold text-[11px] uppercase cursor-pointer"
                                        >
                                            Limits
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleToggleFreeze(account)}
                                            className={`py-2.5 px-3 rounded-xl font-bold text-[11px] uppercase flex items-center gap-1 cursor-pointer ${
                                                account.status === 'frozen'
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                    : 'bg-rose-50 text-rose-700 border border-rose-200'
                                            }`}
                                        >
                                            {account.status === 'frozen' ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                                            {account.status === 'frozen' ? 'Unfreeze' : 'Freeze'}
                                        </button>
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-medium">
                                        {txns.length} recorded transaction{txns.length === 1 ? '' : 's'}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Selected Child Statement */}
                    {activeChildWallet && (
                        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                                <div>
                                    <h3 className="text-base font-black text-slate-900 dark:text-white">
                                        Pocket Money Statement — {activeChildWallet.account.studentName}
                                    </h3>
                                    <p className="text-xs text-slate-500">
                                        Complete chronological log of deposits and school disbursements.
                                    </p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => printChildStatement(activeChildWallet.account, activeChildWallet.txns)}
                                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase flex items-center gap-2 cursor-pointer"
                                >
                                    <Printer className="w-4 h-4" />
                                    Print Statement
                                </button>
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
                                        {activeChildWallet.txns.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-slate-400">
                                                    No pocket money transactions recorded yet for {activeChildWallet.account.studentName}.
                                                </td>
                                            </tr>
                                        ) : activeChildWallet.txns.map(t => (
                                            <tr key={t.id}>
                                                <td className="p-3 font-mono text-slate-500">{new Date(t.createdAt).toLocaleString()}</td>
                                                <td className="p-3">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                        t.type === 'deposit' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {t.type}
                                                    </span>
                                                </td>
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
                        </div>
                    )}
                </>
            )}

            {/* TOP-UP AMOUNT MODAL */}
            {topUpModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Top Up Pocket Money (NCBA)</h3>
                                <p className="text-xs text-slate-500">{topUpModal.account.studentName} • Current: KES {topUpModal.account.balance.toLocaleString()}</p>
                            </div>
                            <button type="button" onClick={() => setTopUpModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form
                            onSubmit={e => {
                                e.preventDefault();
                                const amt = Number(topUpAmount);
                                if (Number.isNaN(amt) || amt <= 0) return;
                                if (feeConfig.minDepositAmount && amt < feeConfig.minDepositAmount) {
                                    showBanner('error', `Minimum pocket money deposit is KES ${feeConfig.minDepositAmount.toLocaleString()}.`);
                                    return;
                                }
                                if (feeConfig.maxDepositAmount && amt > feeConfig.maxDepositAmount) {
                                    showBanner('error', `Maximum pocket money deposit is KES ${feeConfig.maxDepositAmount.toLocaleString()}.`);
                                    return;
                                }
                                setNcbaPayContext({ child: topUpModal.child, account: topUpModal.account, amount: amt, note: topUpNote });
                            }}
                            className="p-5 space-y-4"
                        >
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Student Pocket Money Amount (KES) *</label>
                                <input
                                    type="number"
                                    min={feeConfig.minDepositAmount || 1}
                                    max={feeConfig.maxDepositAmount || 50000}
                                    required
                                    value={topUpAmount}
                                    onChange={e => setTopUpAmount(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-base font-black"
                                />
                            </div>
                            {(() => {
                                const b = calculatePocketMoneyCharges(Number(topUpAmount) || 0, feeConfig);
                                return (
                                    <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-slate-500">Student Receives (100%)</span>
                                            <span className="font-bold text-slate-900 dark:text-white">KES {b.netPocketMoney.toLocaleString()}</span>
                                        </div>
                                        {b.processingFee > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Processing Fee</span>
                                                <span className="font-bold text-amber-600">+ KES {b.processingFee.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {b.transferCharge > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Transfer Charge</span>
                                                <span className="font-bold text-amber-600">+ KES {b.transferCharge.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {b.mpesaAgentWithdrawalCharge > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">M-Pesa Agent Withdrawal Charge</span>
                                                <span className="font-bold text-amber-600">+ KES {b.mpesaAgentWithdrawalCharge.toLocaleString()}</span>
                                            </div>
                                        )}
                                        {b.smsCharge > 0 && (
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">SMS Notification Fee</span>
                                                <span className="font-bold text-amber-600">+ KES {b.smsCharge.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between pt-2 border-t border-slate-200 dark:border-slate-700 text-sm">
                                            <span className="font-black text-slate-900 dark:text-white">Total You Pay</span>
                                            <span className="font-black text-emerald-600">KES {b.totalPayableByParent.toLocaleString()}</span>
                                        </div>
                                    </div>
                                );
                            })()}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Note / Purpose</label>
                                <input
                                    type="text"
                                    value={topUpNote}
                                    onChange={e => setTopUpNote(e.target.value)}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setTopUpModal(null)} className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase cursor-pointer">
                                    Pay KES {calculatePocketMoneyCharges(Number(topUpAmount) || 0, feeConfig).totalPayableByParent.toLocaleString()} (NCBA)
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* SUPER ADMIN NCBA CHECKOUT MODAL */}
            {ncbaPayContext && (() => {
                const breakdown = calculatePocketMoneyCharges(ncbaPayContext.amount, feeConfig);
                return (
                    <PayNowModal
                        isOpen={Boolean(ncbaPayContext)}
                        onClose={() => setNcbaPayContext(null)}
                        institutionId={institutionId}
                        institutionName={`${institutionName} — Pocket Money`}
                        forceAmount={breakdown.totalPayableByParent}
                        forcedItems={[{
                            description: `Pocket Money Top-Up — ${ncbaPayContext.account.studentName} (Net KES ${breakdown.netPocketMoney.toLocaleString()} + Charges KES ${breakdown.totalExtraCharges.toLocaleString()})`,
                            quantity: 1,
                            unitPrice: breakdown.totalPayableByParent,
                            amount: breakdown.totalPayableByParent
                        }]}
                        mpesaConfig={companyDetails?.mpesaConfig!}
                        ncbaConfig={companyDetails?.ncbaConfig}
                        onlyProvider="ncba"
                        onSuccess={(receiptRef) => handleNcbaTopUpSuccess(receiptRef)}
                    />
                );
            })()}

            {/* PARENT SPENDING LIMITS MODAL */}
            {limitsModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md overflow-hidden">
                        <div className="p-5 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white">Set Spending Limits</h3>
                                <p className="text-xs text-slate-500">{limitsModal.studentName}</p>
                            </div>
                            <button type="button" onClick={() => setLimitsModal(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSaveLimits} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Daily Limit (KES)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={dailyLimitInput}
                                        onChange={e => setDailyLimitInput(e.target.value)}
                                        placeholder="No limit"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Weekly Limit (KES)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={weeklyLimitInput}
                                        onChange={e => setWeeklyLimitInput(e.target.value)}
                                        placeholder="No limit"
                                        className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <button type="button" onClick={() => setLimitsModal(null)} className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold cursor-pointer">
                                    Cancel
                                </button>
                                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase cursor-pointer">
                                    Save Limits
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
