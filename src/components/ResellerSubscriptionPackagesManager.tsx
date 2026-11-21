import React, { useState, useEffect, useMemo } from 'react';
import type {
    Institution,
    CompanyDetails,
    ResellerPackageConfig,
    ResellerSubscriptionOrder
} from '../types';
import { apiService } from '../services/apiService';
import { billingService } from '../services/billingService';
import { PayNowModal } from './PayNowModal';
import {
    GLOBAL_DEFAULT_PLANS,
    type StudentSubscriptionPlan
} from './common/StudentSubscriptionPlanManager';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { BanknotesIcon } from './icons/BanknotesIcon';
import { TagIcon } from './icons/TagIcon';

interface ResellerSubscriptionPackagesManagerProps {
    resellerId: string;
    resellerInstitution: Institution;
    tenants: Institution[];
    companyDetails: CompanyDetails;
    orders: ResellerSubscriptionOrder[];
    onOrdersChange: (orders: ResellerSubscriptionOrder[]) => void;
}

const createDefaultConfig = (resellerId: string): ResellerPackageConfig => ({
    id: `reseller_pkg_cfg_${resellerId}`,
    institutionId: resellerId,
    resellerId,
    collectionMode: 'platform_ncba',
    directPaymentInstructions: {
        paybill: '',
        accountNumber: '',
        tillNumber: '',
        bankDetails: '',
        phoneNumber: '',
        notes: 'Pay using the details above and enter your M-Pesa / Bank reference to submit your renewal.'
    },
    packageAdjustments: {},
    institutionOverrides: {},
    updatedAt: new Date().toISOString()
});

export const ResellerSubscriptionPackagesManager: React.FC<ResellerSubscriptionPackagesManagerProps> = ({
    resellerId,
    resellerInstitution,
    tenants,
    companyDetails,
    orders,
    onOrdersChange
}) => {
    const [basePlans, setBasePlans] = useState<StudentSubscriptionPlan[]>(() => {
        try {
            const raw = localStorage.getItem('eduai_global_student_sub_plans');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed;
            }
        } catch (_) {}
        return GLOBAL_DEFAULT_PLANS;
    });

    const [config, setConfig] = useState<ResellerPackageConfig>(() => {
        try {
            const raw = localStorage.getItem(`eduai_reseller_pkg_cfg_${resellerId}`);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed && parsed.resellerId) return { ...createDefaultConfig(resellerId), ...parsed };
            }
        } catch (_) {}
        return createDefaultConfig(resellerId);
    });

    const [selectedTenantId, setSelectedTenantId] = useState<string>(() => tenants[0]?.id || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState<string | null>(null);
    const [settlingOrder, setSettlingOrder] = useState<ResellerSubscriptionOrder | null>(null);

    useEffect(() => {
        if (!selectedTenantId && tenants.length > 0) {
            setSelectedTenantId(tenants[0].id);
        }
    }, [tenants, selectedTenantId]);

    useEffect(() => {
        // Load Super Admin global packages
        apiService.fetchModuleRecords<StudentSubscriptionPlan>('student_subscription_plans', 'SYSTEM')
            .then(records => {
                if (Array.isArray(records) && records.length > 0) {
                    setBasePlans(records);
                    try { localStorage.setItem('eduai_global_student_sub_plans', JSON.stringify(records)); } catch (_) {}
                }
            })
            .catch(() => {});

        // Load reseller package config
        if (resellerId) {
            apiService.fetchModuleRecords<ResellerPackageConfig>('reseller_package_configs', resellerId)
                .then(records => {
                    if (Array.isArray(records) && records.length > 0) {
                        const latest = records[0];
                        const merged: ResellerPackageConfig = {
                            ...createDefaultConfig(resellerId),
                            ...latest,
                            id: latest.id || `reseller_pkg_cfg_${resellerId}`,
                            institutionId: resellerId,
                            resellerId,
                            packageAdjustments: latest.packageAdjustments || {},
                            institutionOverrides: latest.institutionOverrides || {},
                            directPaymentInstructions: {
                                ...createDefaultConfig(resellerId).directPaymentInstructions,
                                ...(latest.directPaymentInstructions || {})
                            }
                        };
                        setConfig(merged);
                        try { localStorage.setItem(`eduai_reseller_pkg_cfg_${resellerId}`, JSON.stringify(merged)); } catch (_) {}
                    }
                })
                .catch(() => {});
        }
    }, [resellerId]);

    const saveConfig = async (nextConfig: ResellerPackageConfig, label = 'Settings saved successfully.') => {
        setIsSaving(true);
        setSaveMessage(null);
        const payload: ResellerPackageConfig = {
            ...nextConfig,
            id: nextConfig.id || `reseller_pkg_cfg_${resellerId}`,
            institutionId: resellerId,
            resellerId,
            updatedAt: new Date().toISOString()
        };
        setConfig(payload);
        try {
            localStorage.setItem(`eduai_reseller_pkg_cfg_${resellerId}`, JSON.stringify(payload));
        } catch (_) {}
        try {
            await apiService.saveModuleRecord('reseller_package_configs', payload);
            setSaveMessage(label);
            setTimeout(() => setSaveMessage(null), 3500);
        } catch (err: any) {
            console.error('Failed to save reseller package config:', err);
            setSaveMessage(`Saved locally (sync warning: ${err?.message || 'network error'})`);
        } finally {
            setIsSaving(false);
        }
    };

    const updateAdjustment = (planId: string, patch: Partial<{ adjustmentAmount: number; customName: string; isActive: boolean }>) => {
        setConfig(prev => {
            const existing = prev.packageAdjustments[planId] || {
                basePlanId: planId,
                adjustmentAmount: 0,
                isActive: true
            };
            return {
                ...prev,
                packageAdjustments: {
                    ...prev.packageAdjustments,
                    [planId]: {
                        ...existing,
                        ...patch,
                        basePlanId: planId,
                        adjustmentAmount: Math.max(0, Number(patch.adjustmentAmount !== undefined ? patch.adjustmentAmount : existing.adjustmentAmount) || 0)
                    }
                }
            };
        });
    };

    const updateInstitutionOverride = (tenantId: string, planId: string, rawValue: string) => {
        setConfig(prev => {
            const nextOverrides = { ...(prev.institutionOverrides || {}) };
            const tenantMap = { ...(nextOverrides[tenantId] || {}) };
            if (rawValue.trim() === '') {
                delete tenantMap[planId];
            } else {
                const num = Number(rawValue);
                if (!Number.isNaN(num) && num >= 0) {
                    tenantMap[planId] = num;
                }
            }
            if (Object.keys(tenantMap).length === 0) {
                delete nextOverrides[tenantId];
            } else {
                nextOverrides[tenantId] = tenantMap;
            }
            return { ...prev, institutionOverrides: nextOverrides };
        });
    };

    const pendingOrders = useMemo(
        () => orders.filter(o => o.status === 'pending_reseller_settlement'),
        [orders]
    );
    const completedOrders = useMemo(
        () => orders.filter(o => o.status === 'completed'),
        [orders]
    );

    const handleCompleteResellerSettlement = async () => {
        if (!settlingOrder) return;
        const targetOrder = settlingOrder;
        const settledRef = `SA_SETTLED_${Date.now()}`;
        const completedOrder: ResellerSubscriptionOrder = {
            ...targetOrder,
            status: 'completed',
            superAdminPaymentReference: settledRef,
            completedAt: new Date().toISOString()
        };

        try {
            await apiService.saveModuleRecord('reseller_subscription_orders', completedOrder);
        } catch (err) {
            console.warn('Order save warning:', err);
        }

        const updatedOrders = orders.map(o => (o.id === completedOrder.id ? completedOrder : o));
        onOrdersChange(updatedOrders);
        try {
            localStorage.setItem(`eduai_reseller_sub_orders_${resellerId}`, JSON.stringify(updatedOrders));
        } catch (_) {}

        // Activate the client school subscription & allocate SMS
        const clientInst = tenants.find(t => t.id === targetOrder.clientInstitutionId);
        if (clientInst) {
            try {
                await billingService.processSuccessfulPaymentAndAutoEmail({
                    institution: clientInst,
                    companyDetails,
                    amount: targetOrder.clientTotalAmount,
                    phoneNumber: targetOrder.clientPayerPhone || clientInst.phoneNumber || '',
                    payerName: targetOrder.clientPayerName || clientInst.name,
                    payerEmail: clientInst.email,
                    transactionId: targetOrder.clientPaymentReference || settledRef,
                    provider: 'mpesa',
                    items: [{
                        description: `${targetOrder.planName} for ${targetOrder.studentCount} Students (${targetOrder.billingCycle.replace('_', ' ')})`,
                        quantity: targetOrder.studentCount,
                        unitPrice: targetOrder.clientRatePerStudent,
                        amount: targetOrder.clientTotalAmount
                    }],
                    packageName: targetOrder.planName,
                    billingCycle: targetOrder.billingCycle,
                    studentCount: targetOrder.studentCount,
                    smsAllocated: targetOrder.smsAllocated
                });
            } catch (err) {
                console.error('Client school activation error:', err);
            }
        }

        setSettlingOrder(null);
        alert(
            `Settlement complete! KES ${targetOrder.baseTotalAmount.toLocaleString()} paid to Super Admin. ` +
            `${targetOrder.clientInstitutionName} is now active with ${targetOrder.smsAllocated.toLocaleString()} SMS allocated. ` +
            `Your retained profit: KES ${targetOrder.resellerProfit.toLocaleString()}.`
        );
    };

    const selectedTenant = tenants.find(t => t.id === selectedTenantId);
    const negotiatedInstitutionsCount = Object.keys(config.institutionOverrides || {}).length;

    return (
        <div className="space-y-6 animate-fade-in">
            {saveMessage && (
                <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 shrink-0" />
                    <span>{saveMessage}</span>
                </div>
            )}

            {/* 1. PENDING DIRECT-COLLECTION ORDERS AWAITING SUPER ADMIN SETTLEMENT */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <BanknotesIcon className="w-5 h-5 text-amber-500" />
                            Direct Collection Renewals — Pay Super Admin to Activate
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            When you collect directly from a school, settle only the Super Admin base amount here to immediately activate their subscription.
                        </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                        pendingOrders.length > 0
                            ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                    }`}>
                        {pendingOrders.length} Pending Settlement
                    </span>
                </div>

                {pendingOrders.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400 font-medium">
                        No pending direct-collection renewal orders right now.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {pendingOrders.map(order => (
                            <div
                                key={order.id}
                                className="p-4 rounded-2xl border border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-sm text-slate-900 dark:text-white">{order.clientInstitutionName}</span>
                                        <span className="px-2 py-0.5 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase">
                                            {order.planName}
                                        </span>
                                        <span className="text-[11px] font-mono text-slate-500">
                                            {order.studentCount} students • {order.smsAllocated.toLocaleString()} SMS
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                                        <span>Client Ref: <strong className="font-mono">{order.clientPaymentReference || 'N/A'}</strong></span>
                                        {order.clientPayerName && <span>Payer: <strong>{order.clientPayerName}</strong></span>}
                                        <span>Submitted: {new Date(order.createdAt).toLocaleString()}</span>
                                    </div>
                                    <div className="flex flex-wrap gap-3 pt-1 text-xs">
                                        <span className="px-2.5 py-1 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold text-slate-700 dark:text-slate-200">
                                            Collected from School: KES {order.clientTotalAmount.toLocaleString()}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 font-black text-rose-700 dark:text-rose-300">
                                            Pay Super Admin: KES {order.baseTotalAmount.toLocaleString()}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 font-black text-emerald-700 dark:text-emerald-300">
                                            Your Profit: KES {order.resellerProfit.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSettlingOrder(order)}
                                    className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-md flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                                >
                                    <CreditCardIcon className="w-4 h-4" />
                                    Pay Super Admin (KES {order.baseTotalAmount.toLocaleString()}) & Activate
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 2. COLLECTION MODE SELECTION */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <CreditCardIcon className="w-5 h-5 text-indigo-600" />
                            Subscription Payment Collection Mode
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Choose whether your schools pay via Super Admin NCBA/M-Pesa (auto-commission) or pay you directly first.
                        </p>
                    </div>
                    <button
                        onClick={() => saveConfig(config, 'Collection mode & payment settings saved.')}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                        {isSaving ? 'Saving...' : 'Save Collection Mode'}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, collectionMode: 'platform_ncba' }))}
                        className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                            config.collectionMode === 'platform_ncba'
                                ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/30'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-sm text-slate-900 dark:text-white">Use Super Admin NCBA / M-Pesa</span>
                            {config.collectionMode === 'platform_ncba' && (
                                <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-white text-[10px] font-black uppercase">Active</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Schools pay your retail/negotiated amount directly via Super Admin&apos;s NCBA / M-Pesa checkout. Schools activate instantly and your markup is credited to your Commissions wallet.
                        </p>
                    </button>

                    <button
                        type="button"
                        onClick={() => setConfig(prev => ({ ...prev, collectionMode: 'reseller_direct' }))}
                        className={`text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                            config.collectionMode === 'reseller_direct'
                                ? 'border-emerald-600 bg-emerald-50/60 dark:bg-emerald-950/30'
                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                        }`}
                    >
                        <div className="flex items-center justify-between mb-1">
                            <span className="font-black text-sm text-slate-900 dark:text-white">Collect Direct &amp; Settle Super Admin</span>
                            {config.collectionMode === 'reseller_direct' && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black uppercase">Active</span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Schools pay directly to your Paybill/Till/Bank/Phone and submit their payment reference. You keep your margin upfront and pay only the Super Admin base cost to activate the school.
                        </p>
                    </button>
                </div>

                {config.collectionMode === 'reseller_direct' && (
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 space-y-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                            Your Direct Payment Instructions (Shown to Client Schools on Renewal)
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">M-Pesa Paybill</label>
                                <input
                                    type="text"
                                    value={config.directPaymentInstructions?.paybill || ''}
                                    onChange={e => setConfig(prev => ({
                                        ...prev,
                                        directPaymentInstructions: { ...prev.directPaymentInstructions, paybill: e.target.value }
                                    }))}
                                    placeholder="e.g. 522522"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Account Number</label>
                                <input
                                    type="text"
                                    value={config.directPaymentInstructions?.accountNumber || ''}
                                    onChange={e => setConfig(prev => ({
                                        ...prev,
                                        directPaymentInstructions: { ...prev.directPaymentInstructions, accountNumber: e.target.value }
                                    }))}
                                    placeholder="e.g. School Name / Acct #"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Buy Goods Till</label>
                                <input
                                    type="text"
                                    value={config.directPaymentInstructions?.tillNumber || ''}
                                    onChange={e => setConfig(prev => ({
                                        ...prev,
                                        directPaymentInstructions: { ...prev.directPaymentInstructions, tillNumber: e.target.value }
                                    }))}
                                    placeholder="e.g. 889900"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Direct Phone / M-Pesa</label>
                                <input
                                    type="text"
                                    value={config.directPaymentInstructions?.phoneNumber || ''}
                                    onChange={e => setConfig(prev => ({
                                        ...prev,
                                        directPaymentInstructions: { ...prev.directPaymentInstructions, phoneNumber: e.target.value }
                                    }))}
                                    placeholder={resellerInstitution.phoneNumber || 'e.g. 0712345678'}
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                                />
                            </div>
                            <div className="sm:col-span-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">Bank Details / Extra Notes</label>
                                <input
                                    type="text"
                                    value={config.directPaymentInstructions?.bankDetails || ''}
                                    onChange={e => setConfig(prev => ({
                                        ...prev,
                                        directPaymentInstructions: { ...prev.directPaymentInstructions, bankDetails: e.target.value }
                                    }))}
                                    placeholder="e.g. KCB Bank Acct 1234567890 - Reseller Agency Ltd"
                                    className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-xs font-bold"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. SUPER ADMIN PACKAGES — ADD RESELLER ADJUSTMENT */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <SparklesIcon className="w-5 h-5 text-emerald-500" />
                            Super Admin Packages — Add Your Adjustment (Markup)
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Add your per-student markup on top of Super Admin&apos;s base package prices. Your schools will see the adjusted retail price on renewal.
                        </p>
                    </div>
                    <button
                        onClick={() => saveConfig(config, 'Package adjustments saved.')}
                        disabled={isSaving}
                        className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
                    >
                        {isSaving ? 'Saving...' : 'Save Adjustments'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-700">
                                <th className="p-3">Super Admin Package</th>
                                <th className="p-3">Module Scope</th>
                                <th className="p-3">Super Admin Base</th>
                                <th className="p-3">Your Adjustment (+ KES)</th>
                                <th className="p-3">Your Retail Price</th>
                                <th className="p-3">Custom Package Name (Optional)</th>
                                <th className="p-3 text-center">Active</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                            {basePlans.map(plan => {
                                const adj = config.packageAdjustments[plan.id];
                                const adjustmentAmount = adj?.adjustmentAmount ?? 0;
                                const retailAmount = plan.amount + adjustmentAmount;
                                const isActive = adj?.isActive !== false;
                                return (
                                    <tr key={plan.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                                        <td className="p-3">
                                            <div className="font-black text-slate-900 dark:text-white">{plan.name}</div>
                                            <div className="text-[10px] text-slate-400 font-mono">
                                                {plan.billingCycle.replace('_', ' ')} • {plan.smsAllocatedPerStudent} SMS/student
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[10px] font-bold uppercase">
                                                {plan.smsUsageType === 'finance_receipts_only' ? 'Finance' : plan.smsUsageType === 'academic_results_only' ? 'Academics' : 'All-Access'}
                                            </span>
                                        </td>
                                        <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">
                                            KES {plan.amount.toLocaleString()}
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                min={0}
                                                value={adjustmentAmount}
                                                onChange={e => updateAdjustment(plan.id, { adjustmentAmount: Math.max(0, Number(e.target.value) || 0) })}
                                                className="w-28 px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 font-black text-emerald-600 dark:text-emerald-400 text-xs"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <span className="font-black text-slate-900 dark:text-white text-sm">
                                                KES {retailAmount.toLocaleString()}
                                            </span>
                                            <span className="text-[10px] text-slate-400 block">/ student</span>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="text"
                                                value={adj?.customName || ''}
                                                onChange={e => updateAdjustment(plan.id, { customName: e.target.value })}
                                                placeholder={plan.name}
                                                className="w-full min-w-[180px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                                            />
                                        </td>
                                        <td className="p-3 text-center">
                                            <input
                                                type="checkbox"
                                                checked={isActive}
                                                onChange={e => updateAdjustment(plan.id, { isActive: e.target.checked })}
                                                className="w-4 h-4 accent-emerald-600 cursor-pointer"
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 4. PER-INSTITUTION NEGOTIATED RATES */}
            <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 dark:border-slate-700 pb-4">
                    <div>
                        <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <TagIcon className="w-5 h-5 text-purple-600" />
                            Per-Institution Negotiated Package Rates
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Override your default adjusted rate with a custom negotiated rate per student for a specific school (minimum is Super Admin&apos;s base rate).
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="px-3 py-1 rounded-full bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 text-[11px] font-black">
                            {negotiatedInstitutionsCount} School{negotiatedInstitutionsCount === 1 ? '' : 's'} with Negotiated Rates
                        </span>
                        <button
                            onClick={() => saveConfig(config, 'Negotiated institution rates saved.')}
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-black text-xs uppercase tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
                        >
                            {isSaving ? 'Saving...' : 'Save Negotiated Rates'}
                        </button>
                    </div>
                </div>

                {tenants.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-400">
                        Onboard client institutions first to configure per-institution negotiated rates.
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <label className="text-xs font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                <BuildingOfficeIcon className="w-4 h-4" /> Select Client Institution:
                            </label>
                            <select
                                value={selectedTenantId}
                                onChange={e => setSelectedTenantId(e.target.value)}
                                className="flex-1 max-w-md px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-xs font-bold text-slate-900 dark:text-white"
                            >
                                {tenants.map(t => {
                                    const hasOverrides = Boolean(config.institutionOverrides?.[t.id] && Object.keys(config.institutionOverrides[t.id]).length > 0);
                                    return (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({t.institutionType}){hasOverrides ? ' ★ Negotiated' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        {selectedTenant && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {basePlans.map(plan => {
                                    const defaultRetail = plan.amount + (config.packageAdjustments[plan.id]?.adjustmentAmount || 0);
                                    const negotiatedVal = config.institutionOverrides?.[selectedTenant.id]?.[plan.id];
                                    const isBelowBase = negotiatedVal !== undefined && negotiatedVal < plan.amount;
                                    const effectiveRate = negotiatedVal !== undefined ? Math.max(plan.amount, negotiatedVal) : defaultRetail;
                                    const profitPerStudent = Math.max(0, effectiveRate - plan.amount);

                                    return (
                                        <div key={plan.id} className="p-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 space-y-2.5">
                                            <div>
                                                <div className="font-black text-xs text-slate-900 dark:text-white">
                                                    {config.packageAdjustments[plan.id]?.customName || plan.name}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-0.5">
                                                    Super Admin Base: <strong>KES {plan.amount}</strong> • Default Retail: <strong>KES {defaultRetail}</strong>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-black uppercase text-purple-600 dark:text-purple-400 mb-1">
                                                    Negotiated Rate / Student (KES)
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="number"
                                                        min={plan.amount}
                                                        value={negotiatedVal !== undefined ? negotiatedVal : ''}
                                                        placeholder={`Default (${defaultRetail})`}
                                                        onChange={e => updateInstitutionOverride(selectedTenant.id, plan.id, e.target.value)}
                                                        className={`flex-1 px-3 py-2 rounded-xl border text-xs font-black bg-white dark:bg-slate-800 ${
                                                            isBelowBase
                                                                ? 'border-rose-500 text-rose-600'
                                                                : 'border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white'
                                                        }`}
                                                    />
                                                    {negotiatedVal !== undefined && (
                                                        <button
                                                            type="button"
                                                            onClick={() => updateInstitutionOverride(selectedTenant.id, plan.id, '')}
                                                            className="px-2.5 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[10px] font-bold hover:bg-slate-300 cursor-pointer"
                                                        >
                                                            Reset
                                                        </button>
                                                    )}
                                                </div>
                                                {isBelowBase ? (
                                                    <p className="text-[10px] text-rose-600 font-bold mt-1">
                                                        Cannot be lower than Super Admin base (KES {plan.amount}).
                                                    </p>
                                                ) : (
                                                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mt-1">
                                                        Your Profit: KES {profitPerStudent.toLocaleString()} / student
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* 5. COMPLETED RENEWAL ORDERS HISTORY */}
            {completedOrders.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 p-6 shadow-sm space-y-3">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white">Completed Reseller Package Renewals</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-400 font-black uppercase text-[10px] border-b border-slate-200 dark:border-slate-700">
                                    <th className="p-3">Date</th>
                                    <th className="p-3">School</th>
                                    <th className="p-3">Package</th>
                                    <th className="p-3">Mode</th>
                                    <th className="p-3">School Paid</th>
                                    <th className="p-3">Super Admin Base</th>
                                    <th className="p-3">Your Profit</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {completedOrders.map(order => (
                                    <tr key={order.id}>
                                        <td className="p-3 font-mono text-slate-500">
                                            {new Date(order.completedAt || order.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="p-3 font-bold text-slate-900 dark:text-white">{order.clientInstitutionName}</td>
                                        <td className="p-3">{order.planName} ({order.studentCount})</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                order.collectionMode === 'reseller_direct'
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : 'bg-indigo-100 text-indigo-700'
                                            }`}>
                                                {order.collectionMode === 'reseller_direct' ? 'Direct Settled' : 'Super Admin NCBA'}
                                            </span>
                                        </td>
                                        <td className="p-3 font-bold">KES {order.clientTotalAmount.toLocaleString()}</td>
                                        <td className="p-3 text-slate-500">KES {order.baseTotalAmount.toLocaleString()}</td>
                                        <td className="p-3 font-black text-emerald-600">+KES {order.resellerProfit.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* PAY SUPER ADMIN MODAL TO COMPLETE DIRECT-COLLECTION ORDER */}
            {settlingOrder && (
                <PayNowModal
                    isOpen={Boolean(settlingOrder)}
                    onClose={() => setSettlingOrder(null)}
                    institutionId={settlingOrder.clientInstitutionId}
                    institutionName={`Reseller Settlement: ${settlingOrder.clientInstitutionName}`}
                    forceAmount={settlingOrder.baseTotalAmount}
                    forcedItems={[{
                        description: `Super Admin Base Settlement — ${settlingOrder.planName} for ${settlingOrder.clientInstitutionName} (${settlingOrder.studentCount} Students)`,
                        quantity: settlingOrder.studentCount,
                        unitPrice: settlingOrder.baseRatePerStudent,
                        amount: settlingOrder.baseTotalAmount
                    }]}
                    mpesaConfig={companyDetails?.mpesaConfig!}
                    airtelMoneyConfig={(companyDetails as any)?.airtelMoneyConfig}
                    intasendConfig={(companyDetails as any)?.intasendConfig}
                    ncbaConfig={companyDetails?.ncbaConfig}
                    onSuccess={handleCompleteResellerSettlement}
                />
            )}
        </div>
    );
};
