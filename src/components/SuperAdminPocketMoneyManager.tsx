import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/apiService';
import type {
    PocketMoneyWalletConfig,
    PocketMoneySettlementRequest
} from './Finance/StudentPocketMoneyManager';
import { WalletIcon } from './icons/WalletIcon';
import { BanknotesIcon } from './icons/BanknotesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ShieldCheckIcon } from './icons/ShieldCheckIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';

export interface MpesaAgentWithdrawalBand {
    min: number;
    max: number;
    charge: number;
}

export const DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS: MpesaAgentWithdrawalBand[] = [
    { min: 1, max: 49, charge: 0 },
    { min: 50, max: 100, charge: 11 },
    { min: 101, max: 500, charge: 29 },
    { min: 501, max: 1000, charge: 29 },
    { min: 1001, max: 1500, charge: 29 },
    { min: 1501, max: 2500, charge: 29 },
    { min: 2501, max: 3500, charge: 52 },
    { min: 3501, max: 5000, charge: 69 },
    { min: 5001, max: 7500, charge: 87 },
    { min: 7501, max: 10000, charge: 115 },
    { min: 10001, max: 15000, charge: 167 },
    { min: 15001, max: 20000, charge: 185 },
    { min: 20001, max: 35000, charge: 197 },
    { min: 35001, max: 50000, charge: 278 },
    { min: 50001, max: 250000, charge: 309 }
];

export interface PocketMoneyFeeConfig {
    id: string;
    institutionId: string; // 'SYSTEM'
    processingFeeType: 'fixed' | 'percentage' | 'both';
    processingFeeFixed: number; // KES flat processing fee
    processingFeePercent: number; // % of pocket money amount
    transferChargeFixed: number; // KES transfer/disbursement charge paid upfront by parent
    smsCharge: number; // KES parent SMS alert fee
    includeMpesaAgentWithdrawalCharge: boolean;
    mpesaAgentWithdrawalBands: MpesaAgentWithdrawalBand[];
    minDepositAmount: number;
    maxDepositAmount: number;
    passChargesToParent: boolean; // Always true: parent pays all extra charges
    updatedAt?: string;
}

export interface PocketMoneyRevenueLog {
    id: string;
    institutionId: string; // 'SYSTEM' for Super Admin ledger
    schoolInstitutionId: string;
    schoolName: string;
    studentName: string;
    netPocketMoney: number;
    processingFee: number;
    transferCharge: number;
    mpesaAgentWithdrawalCharge?: number;
    smsCharge: number;
    totalExtraCharges: number;
    totalPaidByParent: number;
    referenceNumber: string;
    createdAt: string;
}

export const DEFAULT_POCKET_MONEY_FEE_CONFIG: PocketMoneyFeeConfig = {
    id: 'pocket_money_fee_config_system',
    institutionId: 'SYSTEM',
    processingFeeType: 'both',
    processingFeeFixed: 20,
    processingFeePercent: 1.5,
    transferChargeFixed: 30,
    smsCharge: 5,
    includeMpesaAgentWithdrawalCharge: true,
    mpesaAgentWithdrawalBands: DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS,
    minDepositAmount: 100,
    maxDepositAmount: 50000,
    passChargesToParent: true
};

export interface PocketMoneyChargeBreakdown {
    netPocketMoney: number;
    processingFee: number;
    transferCharge: number;
    mpesaAgentWithdrawalCharge: number;
    smsCharge: number;
    totalExtraCharges: number;
    totalPayableByParent: number;
}

export const lookupMpesaAgentWithdrawalCharge = (
    amount: number,
    bands?: MpesaAgentWithdrawalBand[]
): number => {
    const amt = Math.max(0, Number(amount) || 0);
    if (amt <= 0) return 0;
    const list = Array.isArray(bands) && bands.length > 0 ? bands : DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS;
    const sorted = [...list].sort((a, b) => a.min - b.min);
    const matched = sorted.find(b => amt >= b.min && amt <= b.max);
    if (matched) return Math.max(0, Number(matched.charge) || 0);
    const highest = sorted[sorted.length - 1];
    if (highest && amt > highest.max) return Math.max(0, Number(highest.charge) || 0);
    return 0;
};

export const calculatePocketMoneyCharges = (
    netAmount: number,
    config?: PocketMoneyFeeConfig | null
): PocketMoneyChargeBreakdown => {
    const cfg = config || DEFAULT_POCKET_MONEY_FEE_CONFIG;
    const net = Math.max(0, Number(netAmount) || 0);
    if (net <= 0) {
        return {
            netPocketMoney: 0,
            processingFee: 0,
            transferCharge: 0,
            mpesaAgentWithdrawalCharge: 0,
            smsCharge: 0,
            totalExtraCharges: 0,
            totalPayableByParent: 0
        };
    }

    let processingFee = 0;
    if (cfg.processingFeeType === 'fixed') {
        processingFee = Math.max(0, Number(cfg.processingFeeFixed) || 0);
    } else if (cfg.processingFeeType === 'percentage') {
        processingFee = Math.ceil((net * Math.max(0, Number(cfg.processingFeePercent) || 0)) / 100);
    } else {
        processingFee =
            Math.max(0, Number(cfg.processingFeeFixed) || 0) +
            Math.ceil((net * Math.max(0, Number(cfg.processingFeePercent) || 0)) / 100);
    }

    const transferCharge = Math.max(0, Number(cfg.transferChargeFixed) || 0);
    const mpesaAgentWithdrawalCharge = cfg.includeMpesaAgentWithdrawalCharge !== false
        ? lookupMpesaAgentWithdrawalCharge(net, cfg.mpesaAgentWithdrawalBands)
        : 0;
    const smsCharge = Math.max(0, Number(cfg.smsCharge) || 0);
    const totalExtraCharges = processingFee + transferCharge + mpesaAgentWithdrawalCharge + smsCharge;

    return {
        netPocketMoney: net,
        processingFee,
        transferCharge,
        mpesaAgentWithdrawalCharge,
        smsCharge,
        totalExtraCharges,
        totalPayableByParent: net + totalExtraCharges
    };
};

export const SuperAdminPocketMoneyManager: React.FC = () => {
    const [subTab, setSubTab] = useState<'fees' | 'transfers' | 'schools'>('fees');
    const [feeConfig, setFeeConfig] = useState<PocketMoneyFeeConfig>(() => {
        try {
            const raw = localStorage.getItem('eduai_pocket_money_fee_config');
            if (raw) return { ...DEFAULT_POCKET_MONEY_FEE_CONFIG, ...JSON.parse(raw) };
        } catch (_) {}
        return DEFAULT_POCKET_MONEY_FEE_CONFIG;
    });
    const [schoolWallets, setSchoolWallets] = useState<PocketMoneyWalletConfig[]>([]);
    const [settlements, setSettlements] = useState<PocketMoneySettlementRequest[]>([]);
    const [revenueLogs, setRevenueLogs] = useState<PocketMoneyRevenueLog[]>(() => {
        try {
            const raw = localStorage.getItem('eduai_pocket_money_revenue_logs');
            if (raw) return JSON.parse(raw);
        } catch (_) {}
        return [];
    });

    const [previewAmount, setPreviewAmount] = useState<number>(1000);
    const [isSaving, setIsSaving] = useState(false);
    const [statusBanner, setStatusBanner] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [transferRefById, setTransferRefById] = useState<Record<string, string>>({});

    useEffect(() => {
        apiService.fetchModuleRecords<PocketMoneyFeeConfig>('pocket_money_fee_config', 'SYSTEM')
            .then(records => {
                if (Array.isArray(records) && records.length > 0) {
                    const merged = { ...DEFAULT_POCKET_MONEY_FEE_CONFIG, ...records[0] };
                    setFeeConfig(merged);
                    try { localStorage.setItem('eduai_pocket_money_fee_config', JSON.stringify(merged)); } catch (_) {}
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<PocketMoneyWalletConfig>('pocket_money_wallet_configs')
            .then(records => {
                if (Array.isArray(records)) setSchoolWallets(records);
            })
            .catch(() => {});

        apiService.fetchModuleRecords<PocketMoneySettlementRequest>('pocket_money_settlements')
            .then(records => {
                if (Array.isArray(records)) {
                    setSettlements([...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
                }
            })
            .catch(() => {});

        apiService.fetchModuleRecords<PocketMoneyRevenueLog>('pocket_money_revenue_logs', 'SYSTEM')
            .then(records => {
                if (Array.isArray(records)) {
                    const sorted = [...records].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
                    setRevenueLogs(sorted);
                    try { localStorage.setItem('eduai_pocket_money_revenue_logs', JSON.stringify(sorted)); } catch (_) {}
                }
            })
            .catch(() => {});
    }, []);

    const showBanner = (type: 'success' | 'error', text: string) => {
        setStatusBanner({ type, text });
        setTimeout(() => setStatusBanner(null), 4000);
    };

    const handleSaveFeeConfig = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const payload: PocketMoneyFeeConfig = {
                ...feeConfig,
                id: 'pocket_money_fee_config_system',
                institutionId: 'SYSTEM',
                passChargesToParent: true,
                updatedAt: new Date().toISOString()
            };
            setFeeConfig(payload);
            try { localStorage.setItem('eduai_pocket_money_fee_config', JSON.stringify(payload)); } catch (_) {}
            await apiService.saveModuleRecord('pocket_money_fee_config', payload);
            showBanner('success', 'Pocket Money fee & transfer charge schedule saved globally. Parents will pay all configured charges on top-up.');
        } catch (err: any) {
            showBanner('error', `Saved locally (sync warning: ${err?.message || 'network error'})`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleMarkTransferCompleted = async (req: PocketMoneySettlementRequest) => {
        const ref = (transferRefById[req.id] || '').trim() || `NCBA_B2C_${Date.now().toString().slice(-6)}`;
        const updated: PocketMoneySettlementRequest = {
            ...req,
            status: 'completed',
            referenceNumber: ref,
            completedAt: new Date().toISOString()
        };
        setSettlements(prev => prev.map(s => (s.id === req.id ? updated : s)));
        await apiService.saveModuleRecord('pocket_money_settlements', updated).catch(() => {});
        showBanner('success', `Marked KES ${req.amount.toLocaleString()} transfer to ${req.destinationPhone} (${req.institutionName}) as COMPLETED (Ref: ${ref}).`);
    };

    const preview = useMemo(
        () => calculatePocketMoneyCharges(previewAmount, feeConfig),
        [previewAmount, feeConfig]
    );

    const metrics = useMemo(() => {
        const totalRevenue = revenueLogs.reduce((s, r) => s + (Number(r.totalExtraCharges) || 0), 0);
        const totalFloatHeld = schoolWallets.reduce((s, w) => s + (Number(w.ncbaFloatBalance) || 0), 0);
        const activeSchools = schoolWallets.filter(w => w.isActivated).length;
        const pendingTransfers = settlements.filter(s => s.status === 'pending_transfer');
        const pendingTransferTotal = pendingTransfers.reduce((s, r) => s + (Number(r.amount) || 0), 0);
        return { totalRevenue, totalFloatHeld, activeSchools, pendingTransferCount: pendingTransfers.length, pendingTransferTotal };
    }, [revenueLogs, schoolWallets, settlements]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-emerald-950 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
                        Super Admin Monetization &amp; Custodial Settlement Hub
                    </span>
                    <h2 className="text-2xl font-black tracking-tight flex items-center gap-2.5 mt-1">
                        <WalletIcon className="w-7 h-7 text-emerald-400" />
                        Pocket Money Business &amp; Charges Control
                    </h2>
                    <p className="text-xs text-slate-300 mt-1">
                        Configure processing fees, transfer charges, and SMS fees paid by parents — while schools receive 100% of student pocket money.
                    </p>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-2xl px-5 py-3 text-right">
                    <span className="text-[10px] uppercase tracking-widest text-emerald-300 font-black block">Platform Fee Revenue</span>
                    <span className="text-2xl font-black text-emerald-400">KES {metrics.totalRevenue.toLocaleString()}</span>
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

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Platform Revenue Earned</span>
                    <div className="text-2xl font-black text-emerald-600 mt-1">KES {metrics.totalRevenue.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-500">{revenueLogs.length} parent top-ups processed</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600">Custodial Float Held</span>
                    <div className="text-2xl font-black text-indigo-600 mt-1">KES {metrics.totalFloatHeld.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-500">Across {metrics.activeSchools} active schools</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Pending School Transfers</span>
                    <div className="text-2xl font-black text-amber-600 mt-1">KES {metrics.pendingTransferTotal.toLocaleString()}</div>
                    <span className="text-[10px] text-slate-500">{metrics.pendingTransferCount} transfer request(s) awaiting payout</span>
                </div>
                <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Activated School Wallets</span>
                    <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{metrics.activeSchools}</div>
                    <span className="text-[10px] text-slate-500">Terms accepted &amp; dedicated # verified</span>
                </div>
            </div>

            {/* Sub-Tabs */}
            <div className="flex flex-wrap gap-2 bg-white dark:bg-slate-800 p-2 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                <button
                    type="button"
                    onClick={() => setSubTab('fees')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                        subTab === 'fees' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                >
                    Fee &amp; Charges Setup
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('transfers')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer ${
                        subTab === 'transfers' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                >
                    <span>School Transfer Requests</span>
                    {metrics.pendingTransferCount > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-black">
                            {metrics.pendingTransferCount}
                        </span>
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => setSubTab('schools')}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider cursor-pointer ${
                        subTab === 'schools' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                >
                    Activated Schools &amp; Revenue Log
                </button>
            </div>

            {/* SUB-TAB 1: FEE & CHARGES SETUP */}
            {subTab === 'fees' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <form
                        onSubmit={handleSaveFeeConfig}
                        className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-4">
                            <div>
                                <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    <CreditCardIcon className="w-5 h-5 text-indigo-600" />
                                    Parent-Paid Processing &amp; Transfer Charges
                                </h3>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    All charges below are automatically added to the parent&apos;s NCBA checkout total so students receive 100% of their pocket money.
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Processing Fee Model</label>
                                <select
                                    value={feeConfig.processingFeeType}
                                    onChange={e => setFeeConfig(prev => ({ ...prev, processingFeeType: e.target.value as any }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                >
                                    <option value="fixed">Fixed Flat Fee (KES)</option>
                                    <option value="percentage">Percentage Fee (%)</option>
                                    <option value="both">Both (Fixed KES + Percentage %)</option>
                                </select>
                            </div>
                            {(feeConfig.processingFeeType === 'fixed' || feeConfig.processingFeeType === 'both') && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Processing Fee Fixed (KES)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={feeConfig.processingFeeFixed}
                                        onChange={e => setFeeConfig(prev => ({ ...prev, processingFeeFixed: Math.max(0, Number(e.target.value) || 0) }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black"
                                    />
                                </div>
                            )}
                            {(feeConfig.processingFeeType === 'percentage' || feeConfig.processingFeeType === 'both') && (
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Processing Fee Percentage (%)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        step="0.1"
                                        value={feeConfig.processingFeePercent}
                                        onChange={e => setFeeConfig(prev => ({ ...prev, processingFeePercent: Math.max(0, Number(e.target.value) || 0) }))}
                                        className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black"
                                    />
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Transfer / Disbursement Charge (KES)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={feeConfig.transferChargeFixed}
                                    onChange={e => setFeeConfig(prev => ({ ...prev, transferChargeFixed: Math.max(0, Number(e.target.value) || 0) }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black"
                                />
                                <span className="text-[10px] text-slate-400">Covers NCBA-to-School dedicated number transfer cost</span>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Parent SMS Notification Fee (KES)</label>
                                <input
                                    type="number"
                                    min={0}
                                    value={feeConfig.smsCharge}
                                    onChange={e => setFeeConfig(prev => ({ ...prev, smsCharge: Math.max(0, Number(e.target.value) || 0) }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-black"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Minimum Deposit (KES)</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={feeConfig.minDepositAmount}
                                    onChange={e => setFeeConfig(prev => ({ ...prev, minDepositAmount: Math.max(1, Number(e.target.value) || 1) }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Maximum Deposit (KES)</label>
                                <input
                                    type="number"
                                    min={100}
                                    value={feeConfig.maxDepositAmount}
                                    onChange={e => setFeeConfig(prev => ({ ...prev, maxDepositAmount: Math.max(100, Number(e.target.value) || 50000) }))}
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold"
                                />
                            </div>
                        </div>

                        {/* M-Pesa Agent Withdrawal Tariff Table */}
                        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-800 dark:text-white cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={feeConfig.includeMpesaAgentWithdrawalCharge !== false}
                                        onChange={e => setFeeConfig(prev => ({ ...prev, includeMpesaAgentWithdrawalCharge: e.target.checked }))}
                                        className="w-4 h-4 accent-emerald-600"
                                    />
                                    Include M-Pesa Agent Withdrawal Charge (Paid by Parent)
                                </label>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setFeeConfig(prev => ({
                                            ...prev,
                                            mpesaAgentWithdrawalBands: [
                                                ...(prev.mpesaAgentWithdrawalBands || DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS),
                                                { min: 0, max: 0, charge: 0 }
                                            ]
                                        }))}
                                        className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase cursor-pointer"
                                    >
                                        + Add Range
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFeeConfig(prev => ({ ...prev, mpesaAgentWithdrawalBands: DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS }))}
                                        className="px-3 py-1 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[10px] uppercase cursor-pointer"
                                    >
                                        Reset Tariff
                                    </button>
                                </div>
                            </div>

                            {feeConfig.includeMpesaAgentWithdrawalCharge !== false && (
                                <div className="max-h-64 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800">
                                    <table className="w-full text-left border-collapse text-xs">
                                        <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 text-slate-500 font-black uppercase text-[10px]">
                                            <tr>
                                                <th className="p-2">Min (KES)</th>
                                                <th className="p-2">Max (KES)</th>
                                                <th className="p-2">Agent Withdrawal Fee (KES)</th>
                                                <th className="p-2 text-right">Remove</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                            {(feeConfig.mpesaAgentWithdrawalBands || DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS).map((band, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={band.min}
                                                            onChange={e => {
                                                                const val = Math.max(0, Number(e.target.value) || 0);
                                                                setFeeConfig(prev => {
                                                                    const copy = [...(prev.mpesaAgentWithdrawalBands || DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS)];
                                                                    copy[idx] = { ...copy[idx], min: val };
                                                                    return { ...prev, mpesaAgentWithdrawalBands: copy };
                                                                });
                                                            }}
                                                            className="w-24 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold"
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={band.max}
                                                            onChange={e => {
                                                                const val = Math.max(0, Number(e.target.value) || 0);
                                                                setFeeConfig(prev => {
                                                                    const copy = [...(prev.mpesaAgentWithdrawalBands || DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS)];
                                                                    copy[idx] = { ...copy[idx], max: val };
                                                                    return { ...prev, mpesaAgentWithdrawalBands: copy };
                                                                });
                                                            }}
                                                            className="w-28 px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-mono font-bold"
                                                        />
                                                    </td>
                                                    <td className="p-1.5">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={band.charge}
                                                            onChange={e => {
                                                                const val = Math.max(0, Number(e.target.value) || 0);
                                                                setFeeConfig(prev => {
                                                                    const copy = [...(prev.mpesaAgentWithdrawalBands || DEFAULT_MPESA_AGENT_WITHDRAWAL_BANDS)];
                                                                    copy[idx] = { ...copy[idx], charge: val };
                                                                    return { ...prev, mpesaAgentWithdrawalBands: copy };
                                                                });
                                                            }}
                                                            className="w-24 px-2 py-1 rounded-lg border border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/30 text-xs font-mono font-black text-emerald-700 dark:text-emerald-300"
                                                        />
                                                    </td>
                                                    <td className="p-1.5 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => setFeeConfig(prev => ({
                                                                ...prev,
                                                                mpesaAgentWithdrawalBands: (prev.mpesaAgentWithdrawalBands || []).filter((_, i) => i !== idx)
                                                            }))}
                                                            className="text-rose-500 hover:underline text-[10px] font-bold cursor-pointer"
                                                        >
                                                            Delete
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                            <ShieldCheckIcon className="w-4 h-4 shrink-0" />
                            <span>Parent-Pays-All Policy Active: Extra charges are added on top of the student&apos;s pocket money so neither the student nor school loses a cent.</span>
                        </div>

                        <button
                            type="submit"
                            disabled={isSaving}
                            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-lg disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? 'Saving Fee Schedule...' : 'Save Global Pocket Money Charges'}
                        </button>
                    </form>

                    {/* Live Checkout Simulator */}
                    <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white rounded-3xl p-6 shadow-xl space-y-5">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Live Fee Preview</span>
                            <h3 className="text-base font-black mt-1">Parent Checkout Simulator</h3>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Sample Student Pocket Money (KES)</label>
                            <input
                                type="number"
                                min={1}
                                value={previewAmount}
                                onChange={e => setPreviewAmount(Math.max(0, Number(e.target.value) || 0))}
                                className="w-full px-4 py-2.5 rounded-xl bg-white/10 border border-white/20 text-white text-base font-black"
                            />
                        </div>

                        <div className="space-y-2.5 text-xs border-t border-white/10 pt-4">
                            <div className="flex justify-between">
                                <span className="text-slate-300">Student Receives (100%)</span>
                                <span className="font-bold">KES {preview.netPocketMoney.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300">Processing Fee</span>
                                <span className="font-bold text-amber-300">+ KES {preview.processingFee.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300">Transfer Charge</span>
                                <span className="font-bold text-amber-300">+ KES {preview.transferCharge.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300">M-Pesa Agent Withdrawal Fee</span>
                                <span className="font-bold text-amber-300">+ KES {preview.mpesaAgentWithdrawalCharge.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-300">SMS Alert Fee</span>
                                <span className="font-bold text-amber-300">+ KES {preview.smsCharge.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-white/15 text-sm">
                                <span className="font-black uppercase">Parent Pays Total</span>
                                <span className="font-black text-white">KES {preview.totalPayableByParent.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between p-3 rounded-xl bg-emerald-500/20 border border-emerald-400/30">
                                <span className="font-black text-emerald-300 uppercase text-[11px]">Your Platform Revenue</span>
                                <span className="font-black text-emerald-300">KES {preview.totalExtraCharges.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SUB-TAB 2: SCHOOL TRANSFER REQUESTS */}
            {subTab === 'transfers' && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                    <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                        <BanknotesIcon className="w-5 h-5 text-emerald-600" />
                        School Dedicated-Number Transfer Requests ({settlements.length})
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">School</th>
                                    <th className="p-3">Verified Dedicated Number</th>
                                    <th className="p-3">Amount (KES)</th>
                                    <th className="p-3">Status</th>
                                    <th className="p-3 text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {settlements.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-slate-400">No school transfer requests yet.</td></tr>
                                ) : settlements.map(req => (
                                    <tr key={req.id}>
                                        <td className="p-3 font-mono text-slate-500">{new Date(req.createdAt).toLocaleString()}</td>
                                        <td className="p-3 font-bold text-slate-900 dark:text-white">{req.institutionName}</td>
                                        <td className="p-3 font-mono font-black text-emerald-700 dark:text-emerald-400">
                                            {req.destinationPhone} <span className="text-slate-500 font-sans font-normal">({req.custodianName}{req.className ? ` • ${req.className}` : ''})</span>
                                            {req.otpVerified && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[9px] font-black">OTP ✓</span>}
                                        </td>
                                        <td className="p-3 font-black">KES {req.amount.toLocaleString()}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                                req.status === 'completed' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-800'
                                            }`}>
                                                {req.status.replace('_', ' ')}
                                            </span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {req.status === 'pending_transfer' ? (
                                                <div className="flex items-center justify-end gap-2">
                                                    <input
                                                        type="text"
                                                        value={transferRefById[req.id] || ''}
                                                        onChange={e => setTransferRefById(prev => ({ ...prev, [req.id]: e.target.value }))}
                                                        placeholder="NCBA/M-Pesa Ref"
                                                        className="w-32 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 text-[11px] font-mono"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMarkTransferCompleted(req)}
                                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[10px] uppercase cursor-pointer"
                                                    >
                                                        Mark Transferred
                                                    </button>
                                                </div>
                                            ) : (
                                                <span className="font-mono text-[11px] text-slate-500">Ref: {req.referenceNumber}</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* SUB-TAB 3: ACTIVATED SCHOOLS & REVENUE LEDGER */}
            {subTab === 'schools' && (
                <div className="space-y-6">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-3">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Activated School Pocket Money Wallets ({schoolWallets.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3">School</th>
                                        <th className="p-3">Dedicated Number</th>
                                        <th className="p-3">Terms Accepted</th>
                                        <th className="p-3">Float Held</th>
                                        <th className="p-3">Total Collected</th>
                                        <th className="p-3">Total Transferred</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {schoolWallets.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-slate-400">No schools have activated their Pocket Money NCBA Wallet yet.</td></tr>
                                    ) : schoolWallets.map(w => (
                                        <tr key={w.id}>
                                            <td className="p-3 font-bold text-slate-900 dark:text-white">{w.institutionName}</td>
                                            <td className="p-3 font-mono font-bold text-emerald-700">{w.dedicatedWithdrawalPhone} ({w.dedicatedCustodianName})</td>
                                            <td className="p-3 text-slate-500">{w.termsAcceptedBy} • {w.termsAcceptedAt ? new Date(w.termsAcceptedAt).toLocaleDateString() : '-'}</td>
                                            <td className="p-3 font-black text-indigo-600">KES {(w.ncbaFloatBalance || 0).toLocaleString()}</td>
                                            <td className="p-3 font-bold">KES {(w.totalCollectedViaNcba || 0).toLocaleString()}</td>
                                            <td className="p-3 text-slate-500">KES {(w.totalWithdrawnToDedicatedNumber || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-3">
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">Platform Fee Revenue Ledger ({revenueLogs.length})</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                        <th className="p-3">Date</th>
                                        <th className="p-3">School / Student</th>
                                        <th className="p-3">Student Net</th>
                                        <th className="p-3">Processing</th>
                                        <th className="p-3">Transfer</th>
                                        <th className="p-3">Agent Fee</th>
                                        <th className="p-3">SMS</th>
                                        <th className="p-3">Parent Paid</th>
                                        <th className="p-3">Platform Revenue</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                    {revenueLogs.length === 0 ? (
                                        <tr><td colSpan={8} className="p-8 text-center text-slate-400">No pocket money fee revenue logged yet.</td></tr>
                                    ) : revenueLogs.map(r => (
                                        <tr key={r.id}>
                                            <td className="p-3 font-mono text-slate-500">{new Date(r.createdAt).toLocaleString()}</td>
                                            <td className="p-3 font-bold">{r.schoolName} — {r.studentName}</td>
                                            <td className="p-3">KES {r.netPocketMoney.toLocaleString()}</td>
                                            <td className="p-3">KES {r.processingFee.toLocaleString()}</td>
                                            <td className="p-3">KES {r.transferCharge.toLocaleString()}</td>
                                            <td className="p-3">KES {(r.mpesaAgentWithdrawalCharge || 0).toLocaleString()}</td>
                                            <td className="p-3">KES {r.smsCharge.toLocaleString()}</td>
                                            <td className="p-3 font-bold">KES {r.totalPaidByParent.toLocaleString()}</td>
                                            <td className="p-3 font-black text-emerald-600">+KES {r.totalExtraCharges.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
