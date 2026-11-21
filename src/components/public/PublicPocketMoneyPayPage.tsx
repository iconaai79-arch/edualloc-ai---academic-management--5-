import React, { useState, useEffect } from 'react';
import type { CompanyDetails } from '../../types';
import { apiService } from '../../services/apiService';
import { formatPhoneNumber } from '../../utils/stringUtils';
import type {
    PocketMoneyAccount,
    PocketMoneyTransaction,
    PocketMoneyWalletConfig,
    PocketMoneyPaymentRequest
} from '../Finance/StudentPocketMoneyManager';
import {
    DEFAULT_POCKET_MONEY_FEE_CONFIG,
    calculatePocketMoneyCharges,
    type PocketMoneyFeeConfig,
    type PocketMoneyRevenueLog
} from '../SuperAdminPocketMoneyManager';
import { Wallet, ShieldCheck, CheckCircle2, AlertCircle, Smartphone, Loader2, ArrowRight } from 'lucide-react';

interface PublicPocketMoneyPayPageProps {
    shortCode: string;
    companyDetails?: CompanyDetails;
}

export const PublicPocketMoneyPayPage: React.FC<PublicPocketMoneyPayPageProps> = ({
    shortCode,
    companyDetails
}) => {
    const [request, setRequest] = useState<PocketMoneyPaymentRequest | null>(null);
    const [feeConfig, setFeeConfig] = useState<PocketMoneyFeeConfig>(DEFAULT_POCKET_MONEY_FEE_CONFIG);
    const [systemSettings, setSystemSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [phoneInput, setPhoneInput] = useState('');
    const [payerName, setPayerName] = useState('');
    const [payState, setPayState] = useState<'idle' | 'initiating' | 'polling' | 'paid' | 'failed'>('idle');
    const [statusMessage, setStatusMessage] = useState('');
    const [receiptRef, setReceiptRef] = useState('');

    useEffect(() => {
        const loadRequest = async () => {
            setLoading(true);
            try {
                // 1. Load system settings & fee config
                const { data: sData } = await apiService.getSystemSettings().catch(() => ({ data: null }));
                if (sData) setSystemSettings(sData);

                const feeRecs = await apiService.fetchModuleRecords<PocketMoneyFeeConfig>('pocket_money_fee_config', 'SYSTEM').catch(() => []);
                if (Array.isArray(feeRecs) && feeRecs.length > 0) {
                    setFeeConfig({ ...DEFAULT_POCKET_MONEY_FEE_CONFIG, ...feeRecs[0] });
                } else {
                    try {
                        const rawFee = localStorage.getItem('eduai_pocket_money_fee_config');
                        if (rawFee) setFeeConfig({ ...DEFAULT_POCKET_MONEY_FEE_CONFIG, ...JSON.parse(rawFee) });
                    } catch (_) {}
                }

                // 2. Load payment request by shortCode
                let found: PocketMoneyPaymentRequest | null = null;
                try {
                    const allReqs = await apiService.fetchModuleRecords<PocketMoneyPaymentRequest>('pocket_money_payment_requests').catch(() => []);
                    if (Array.isArray(allReqs)) {
                        found = allReqs.find(
                            r => (r.shortCode || r.id || '').toUpperCase() === shortCode.toUpperCase()
                        ) || null;
                    }
                } catch (_) {}

                if (!found) {
                    try {
                        for (let i = 0; i < localStorage.length; i++) {
                            const k = localStorage.key(i);
                            if (k && k.startsWith('eduai_pocket_pay_reqs_')) {
                                const arr = JSON.parse(localStorage.getItem(k) || '[]');
                                if (Array.isArray(arr)) {
                                    const match = arr.find((r: any) => (r.shortCode || r.id || '').toUpperCase() === shortCode.toUpperCase());
                                    if (match) { found = match; break; }
                                }
                            }
                        }
                    } catch (_) {}
                }

                if (found) {
                    setRequest(found);
                    setPhoneInput(found.parentPhone || '');
                    setPayerName(found.parentName || 'Parent / Guardian');
                    if (found.status === 'paid') {
                        setPayState('paid');
                        setReceiptRef(found.receiptReference || '');
                    }
                }
            } finally {
                setLoading(false);
            }
        };
        loadRequest();
    }, [shortCode]);

    const finalizePaidRequest = async (req: PocketMoneyPaymentRequest, confirmedRef: string) => {
        const nowIso = new Date().toISOString();
        const breakdown = calculatePocketMoneyCharges(req.netAmount, feeConfig);

        // 1. Mark request paid
        const paidReq: PocketMoneyPaymentRequest = {
            ...req,
            status: 'paid',
            paidAt: nowIso,
            receiptReference: confirmedRef
        };
        setRequest(paidReq);
        await apiService.saveModuleRecord('pocket_money_payment_requests', paidReq).catch(() => {});

        // 2. Credit student pocket money account + transaction
        const accounts = await apiService.fetchModuleRecords<PocketMoneyAccount>('pocket_money_accounts', req.institutionId).catch(() => []);
        const existing = Array.isArray(accounts) ? accounts.find(a => a.studentId === req.studentId) : null;
        const currentBal = Number(existing?.balance) || 0;
        const nextBal = currentBal + req.netAmount;

        const nextAccount: PocketMoneyAccount = {
            id: existing?.id || `pm_acc_${req.studentId}`,
            institutionId: req.institutionId,
            studentId: req.studentId,
            studentName: req.studentName,
            admissionNumber: req.admissionNumber,
            className: req.className,
            balance: nextBal,
            dailyLimit: existing?.dailyLimit,
            weeklyLimit: existing?.weeklyLimit,
            status: existing?.status || 'active',
            parentName: payerName || req.parentName,
            parentPhone: formatPhoneNumber(phoneInput) || req.parentPhone,
            updatedAt: nowIso
        };

        const tx: PocketMoneyTransaction = {
            id: `pm_tx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            institutionId: req.institutionId,
            accountId: nextAccount.id,
            studentId: req.studentId,
            studentName: req.studentName,
            admissionNumber: req.admissionNumber,
            className: req.className,
            type: 'deposit',
            amount: req.netAmount,
            balanceBefore: currentBal,
            balanceAfter: nextBal,
            paymentMode: 'ncba',
            referenceNumber: confirmedRef,
            purpose: `${req.category}: ${req.title}`,
            issuedBy: payerName || 'Parent Short-Link Pay',
            parentNotified: true,
            createdAt: nowIso
        };

        await apiService.saveModuleRecord('pocket_money_accounts', nextAccount).catch(() => {});
        await apiService.saveModuleRecord('pocket_money_transactions', tx).catch(() => {});

        // 3. Credit school NCBA float
        const cfgs = await apiService.fetchModuleRecords<PocketMoneyWalletConfig>('pocket_money_wallet_configs', req.institutionId).catch(() => []);
        if (Array.isArray(cfgs) && cfgs.length > 0) {
            const cfg = cfgs[0];
            await apiService.saveModuleRecord('pocket_money_wallet_configs', {
                ...cfg,
                ncbaFloatBalance: (Number(cfg.ncbaFloatBalance) || 0) + req.netAmount,
                totalCollectedViaNcba: (Number(cfg.totalCollectedViaNcba) || 0) + req.netAmount,
                updatedAt: nowIso
            }).catch(() => {});
        }

        // 4. Log Super Admin platform revenue
        if (breakdown.totalExtraCharges > 0) {
            const revLog: PocketMoneyRevenueLog = {
                id: `pm_rev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
                institutionId: 'SYSTEM',
                schoolInstitutionId: req.institutionId,
                schoolName: req.institutionName,
                studentName: req.studentName,
                netPocketMoney: breakdown.netPocketMoney,
                processingFee: breakdown.processingFee,
                transferCharge: breakdown.transferCharge,
                mpesaAgentWithdrawalCharge: breakdown.mpesaAgentWithdrawalCharge,
                smsCharge: breakdown.smsCharge,
                totalExtraCharges: breakdown.totalExtraCharges,
                totalPaidByParent: breakdown.totalPayableByParent,
                referenceNumber: confirmedRef,
                createdAt: nowIso
            };
            await apiService.saveModuleRecord('pocket_money_revenue_logs', revLog).catch(() => {});
        }
    };

    const handleTriggerStkPush = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!request) return;

        const formattedPhone = formatPhoneNumber(phoneInput);
        if (!/^254\d{9}$/.test(formattedPhone)) {
            setStatusMessage('Please enter a valid Safaricom/Airtel phone number (e.g. 0712345678).');
            setPayState('failed');
            return;
        }

        const breakdown = calculatePocketMoneyCharges(request.netAmount, feeConfig);
        const totalToPay = breakdown.totalPayableByParent;

        setPayState('initiating');
        setStatusMessage('Sending STK Push prompt to your phone...');

        try {
            const metadata = {
                type: 'pocket_money_request',
                shortCode: request.shortCode,
                studentId: request.studentId,
                studentName: request.studentName,
                institutionId: request.institutionId,
                institution_id: request.institutionId,
                institutionName: request.institutionName
            };

            const ncbaCfg = systemSettings?.ncbaConfig || (systemSettings as any)?.ncba_config || companyDetails?.ncbaConfig;
            const mpesaCfg = systemSettings?.mpesaConfig || companyDetails?.mpesaConfig;
            const useNcba = Boolean(ncbaCfg && (ncbaCfg.isMock === true || ncbaCfg.clientId || ncbaCfg.client_id || ncbaCfg.username || ncbaCfg.consumerKey));

            const initResult: any = useNcba
                ? await apiService.initiateNcbaPayment(totalToPay, formattedPhone, metadata, ncbaCfg)
                : await apiService.initiateMpesaPayment(totalToPay, formattedPhone, metadata, mpesaCfg);

            const checkoutId = initResult?.data?.CheckoutRequestID || initResult?.checkoutRequestId || initResult?.transactionId;
            if (!initResult?.success || !checkoutId) {
                setPayState('failed');
                setStatusMessage(initResult?.message || 'Unable to trigger STK Push. Please check your phone number and try again.');
                return;
            }

            setPayState('polling');
            setStatusMessage(`STK Push sent to ${formattedPhone}! Enter your M-Pesa PIN to complete KES ${totalToPay.toLocaleString()}.`);

            let attempts = 0;
            const maxAttempts = 60;
            const provider = useNcba ? 'ncba' : 'mpesa';
            const pollCfg = useNcba ? ncbaCfg : mpesaCfg;

            const interval = setInterval(async () => {
                attempts++;
                try {
                    const res: any = await apiService.checkPaymentStatus(provider, checkoutId, pollCfg);
                    const status = String(res?.status || '').toLowerCase();
                    if (status === 'completed' || status === 'success' || status === 'successful') {
                        clearInterval(interval);
                        const ref = res?.mpesaReceiptNumber || res?.receiptNumber || res?.transactionId || checkoutId;
                        setReceiptRef(ref);
                        await finalizePaidRequest(request, ref);
                        setPayState('paid');
                        setStatusMessage('Payment confirmed and credited immediately!');
                    } else if (status === 'failed' || status === 'error' || status === 'rejected' || attempts >= maxAttempts) {
                        clearInterval(interval);
                        setPayState('failed');
                        setStatusMessage(
                            attempts >= maxAttempts
                                ? 'Payment confirmation timed out. If money was deducted, please contact the school bursar.'
                                : 'Transaction was cancelled or failed. You can tap Pay Now to try again.'
                        );
                    }
                } catch (_) {}
            }, 3000);
        } catch (err: any) {
            setPayState('failed');
            setStatusMessage(err?.message || 'Error triggering STK Push.');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-300">Loading payment request…</p>
            </div>
        );
    }

    if (!request) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 max-w-md w-full text-center space-y-4 shadow-2xl">
                    <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                    <h2 className="text-xl font-black text-slate-900 dark:text-white">Payment Link Not Found</h2>
                    <p className="text-xs text-slate-500">
                        This payment code (<span className="font-mono font-bold">{shortCode}</span>) is invalid or has expired. Please contact your school bursar.
                    </p>
                </div>
            </div>
        );
    }

    const breakdown = calculatePocketMoneyCharges(request.netAmount, feeConfig);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950 to-emerald-950 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-200 dark:border-slate-800 max-w-md w-full overflow-hidden">
                {/* Top Brand Banner */}
                <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-emerald-900 p-6 text-white space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" /> Verified School Pay Link
                        </span>
                        <span className="font-mono text-[10px] text-slate-300">#{request.shortCode}</span>
                    </div>
                    <h1 className="text-xl font-black tracking-tight">{request.institutionName}</h1>
                    <p className="text-xs text-emerald-300 font-bold uppercase tracking-wider">
                        {request.category} • {request.title}
                    </p>
                </div>

                <div className="p-6 space-y-5">
                    {/* Student Info */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-black uppercase text-slate-400 block">Student</span>
                            <span className="text-base font-black text-slate-900 dark:text-white">{request.studentName}</span>
                            <span className="text-[11px] text-slate-500 block font-mono">
                                Adm: {request.admissionNumber} • {request.className}
                            </span>
                        </div>
                        <Wallet className="w-8 h-8 text-emerald-600 shrink-0" />
                    </div>

                    {/* Itemized Breakdown */}
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                        <div className="flex justify-between">
                            <span className="text-slate-500">{request.title} (100% to Student)</span>
                            <span className="font-bold text-slate-900 dark:text-white">KES {breakdown.netPocketMoney.toLocaleString()}</span>
                        </div>
                        {breakdown.processingFee > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">Processing Fee</span>
                                <span className="font-bold text-amber-600">+ KES {breakdown.processingFee.toLocaleString()}</span>
                            </div>
                        )}
                        {breakdown.transferCharge > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">NCBA Transfer Charge</span>
                                <span className="font-bold text-amber-600">+ KES {breakdown.transferCharge.toLocaleString()}</span>
                            </div>
                        )}
                        {breakdown.mpesaAgentWithdrawalCharge > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">M-Pesa Agent Withdrawal Fee</span>
                                <span className="font-bold text-amber-600">+ KES {breakdown.mpesaAgentWithdrawalCharge.toLocaleString()}</span>
                            </div>
                        )}
                        {breakdown.smsCharge > 0 && (
                            <div className="flex justify-between">
                                <span className="text-slate-500">SMS Notification Fee</span>
                                <span className="font-bold text-amber-600">+ KES {breakdown.smsCharge.toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between pt-2.5 border-t border-slate-200 dark:border-slate-700 text-base">
                            <span className="font-black text-slate-900 dark:text-white">Total Payable</span>
                            <span className="font-black text-emerald-600">KES {breakdown.totalPayableByParent.toLocaleString()}</span>
                        </div>
                    </div>

                    {payState === 'paid' ? (
                        <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
                            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                            <h3 className="text-lg font-black text-emerald-800 dark:text-emerald-300">Payment Confirmed!</h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                                KES {breakdown.netPocketMoney.toLocaleString()} has been credited to <strong>{request.studentName}</strong>.
                            </p>
                            {receiptRef && (
                                <p className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                    Receipt Ref: {receiptRef}
                                </p>
                            )}
                        </div>
                    ) : payState === 'initiating' || payState === 'polling' ? (
                        <div className="p-6 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 text-center space-y-3">
                            <Loader2 className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
                            <h3 className="text-sm font-black text-indigo-900 dark:text-indigo-200 uppercase">
                                {payState === 'initiating' ? 'Sending STK Push...' : 'Waiting for M-Pesa PIN'}
                            </h3>
                            <p className="text-xs text-slate-600 dark:text-slate-300">{statusMessage}</p>
                        </div>
                    ) : (
                        <form onSubmit={handleTriggerStkPush} className="space-y-4">
                            {payState === 'failed' && statusMessage && (
                                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
                                    {statusMessage}
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">
                                    M-Pesa Phone Number to Prompt (STK Push) *
                                </label>
                                <div className="relative">
                                    <Smartphone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                                    <input
                                        type="tel"
                                        required
                                        value={phoneInput}
                                        onChange={e => setPhoneInput(e.target.value)}
                                        placeholder="0712345678"
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm font-mono font-black"
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="w-full py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm uppercase tracking-wider shadow-xl shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <span>Pay Now — KES {breakdown.totalPayableByParent.toLocaleString()}</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                            <p className="text-[10px] text-center text-slate-400">
                                Clicking Pay Now triggers an instant M-Pesa STK Push to your phone via EduAI NCBA Custodial Checkout.
                            </p>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
