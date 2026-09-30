import React, { useState, useEffect, useCallback } from 'react';
import { 
    Wallet, ArrowUpRight, Smartphone, AlertTriangle, ShieldCheck, 
    RefreshCw, CheckCircle2, History, X, PlusCircle, CreditCard, Sparkles, AlertCircle
} from 'lucide-react';
import type { InstitutionWallet, WalletTransaction } from '../../types';
import { walletService } from '../../services/walletService';

interface SchoolFloatWalletCardProps {
    institutionId: string;
    institutionName?: string;
    adminPhone?: string;
    onBalanceChange?: () => void;
}

export const SchoolFloatWalletCard: React.FC<SchoolFloatWalletCardProps> = ({
    institutionId,
    institutionName = 'Institution',
    adminPhone = '',
    onBalanceChange
}) => {
    const [wallet, setWallet] = useState<InstitutionWallet | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isTopUpModalOpen, setIsTopUpModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Top-Up Form States
    const [topUpAmount, setTopUpAmount] = useState<number>(25000);
    const [phoneNumber, setPhoneNumber] = useState<string>(adminPhone);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [topUpMethod, setTopUpMethod] = useState<'STK_PUSH' | 'MANUAL_PAYBILL'>('STK_PUSH');
    const [manualMpesaCode, setManualMpesaCode] = useState<string>('');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // Ledger States
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const loadWallet = useCallback(async () => {
        setIsLoading(true);
        try {
            const w = await walletService.getInstitutionWallet(institutionId);
            setWallet(w);
        } catch (e) {
            console.error('[SchoolFloatWalletCard] Error loading wallet:', e);
        } finally {
            setIsLoading(false);
        }
    }, [institutionId]);

    useEffect(() => {
        loadWallet();
    }, [loadWallet]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const txns = await walletService.getWalletTransactions({
                institutionId,
                walletType: 'INSTITUTION',
                limit: 50
            });
            setTransactions(txns);
        } catch (e) {
            console.error('[SchoolFloatWalletCard] Error loading ledger:', e);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const handleExecuteTopUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (topUpAmount <= 0) {
            setErrorMsg('Top-up amount must be greater than zero.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (topUpMethod === 'STK_PUSH') {
                if (!phoneNumber || phoneNumber.length < 10) {
                    setErrorMsg('Please enter a valid Safaricom phone number for STK Push.');
                    setIsSubmitting(false);
                    return;
                }

                const res = await walletService.initiateFloatTopUpViaMpesa(
                    institutionId,
                    topUpAmount,
                    phoneNumber,
                    `Float pre-fund top-up for ${institutionName}`
                );

                if (res.success) {
                    setSuccessMsg(res.message);
                    // Also auto credit local wallet state for immediate responsiveness
                    await walletService.creditInstitutionWallet(
                        institutionId,
                        topUpAmount,
                        res.checkoutRequestId || `STK_${Date.now()}`,
                        phoneNumber,
                        'M-Pesa STK Push Float Top-Up'
                    );
                    await loadWallet();
                    if (onBalanceChange) onBalanceChange();
                    setTimeout(() => {
                        setIsTopUpModalOpen(false);
                        setSuccessMsg(null);
                    }, 3000);
                } else {
                    setErrorMsg(res.message);
                }
            } else {
                // Manual Paybill Confirmation
                if (!manualMpesaCode.trim()) {
                    setErrorMsg('Please enter the M-Pesa transaction reference code (e.g. QK872XX99).');
                    setIsSubmitting(false);
                    return;
                }

                const res = await walletService.creditInstitutionWallet(
                    institutionId,
                    topUpAmount,
                    manualMpesaCode.trim().toUpperCase(),
                    phoneNumber || undefined,
                    'Manual Paybill Verification Float Top-Up'
                );

                if (res.success) {
                    setSuccessMsg(res.message);
                    await loadWallet();
                    if (onBalanceChange) onBalanceChange();
                    setTimeout(() => {
                        setIsTopUpModalOpen(false);
                        setSuccessMsg(null);
                        setManualMpesaCode('');
                    }, 2500);
                } else {
                    setErrorMsg(res.message);
                }
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to process top-up.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const isLowFloat = wallet && wallet.currentBalance < wallet.lowFloatThreshold;

    return (
        <>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[2.5rem] p-7 shadow-sm transition-all hover:shadow-md">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                    {/* Left: Info & Balance */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-2xl border border-indigo-100 dark:border-indigo-900/50">
                                <Wallet className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider">
                                        School Payout Float Wallet
                                    </h3>
                                    {isLowFloat && (
                                        <span className="px-2.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                                            <AlertTriangle className="w-3 h-3" /> Low Float
                                        </span>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Pre-funded balance used for instant teacher remedial disbursements.
                                </p>
                            </div>
                        </div>

                        {/* Balance display */}
                        <div className="flex flex-wrap items-baseline gap-3 pt-1">
                            <span className="text-xs font-black text-slate-400 uppercase">Current Float:</span>
                            <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                                KES {isLoading ? '...' : (wallet?.currentBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-slate-400 font-bold">
                                (Alert Threshold: KES {(wallet?.lowFloatThreshold ?? 10000).toLocaleString()})
                            </span>
                        </div>

                        {isLowFloat && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center gap-2.5 text-amber-800 dark:text-amber-300 text-xs font-bold">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                                <span>
                                    Float is running low. Please top up to prevent interruption to teacher remedial payouts.
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => {
                                setIsHistoryModalOpen(true);
                                loadHistory();
                            }}
                            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl text-xs font-black transition-all flex items-center gap-2"
                        >
                            <History className="w-4 h-4 text-indigo-500" />
                            <span>Float Ledger</span>
                        </button>

                        <button
                            onClick={() => {
                                setErrorMsg(null);
                                setSuccessMsg(null);
                                setIsTopUpModalOpen(true);
                            }}
                            className="px-6 py-3.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-2xl text-xs font-black shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 group"
                        >
                            <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                            <span>Top Up Float via M-Pesa</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* TOP-UP MODAL */}
            {isTopUpModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-lg rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-wider">
                                        Top Up School Payout Float
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Direct M-Pesa Funding
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsTopUpModalOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs font-bold">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleExecuteTopUp} className="space-y-5">
                            {/* Method Toggle */}
                            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                <button
                                    type="button"
                                    onClick={() => setTopUpMethod('STK_PUSH')}
                                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                                        topUpMethod === 'STK_PUSH'
                                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    Instant STK Push
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setTopUpMethod('MANUAL_PAYBILL')}
                                    className={`py-2.5 rounded-xl text-xs font-black transition-all ${
                                        topUpMethod === 'MANUAL_PAYBILL'
                                            ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                                    }`}
                                >
                                    Paybill Code Verification
                                </button>
                            </div>

                            {/* Amount input */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                    Top-Up Amount (KES)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                                        KES
                                    </span>
                                    <input
                                        type="number"
                                        min={100}
                                        value={topUpAmount || ''}
                                        onChange={(e) => setTopUpAmount(Math.max(0, Number(e.target.value)))}
                                        className="w-full pl-14 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-black text-base focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                {/* Preset Chips */}
                                <div className="flex items-center gap-2 mt-2">
                                    {[10000, 25000, 50000, 100000].map((amt) => (
                                        <button
                                            type="button"
                                            key={amt}
                                            onClick={() => setTopUpAmount(amt)}
                                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg text-[10px] font-bold transition-colors"
                                        >
                                            +{amt.toLocaleString()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {topUpMethod === 'STK_PUSH' ? (
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                        Admin Safaricom Phone Number
                                    </label>
                                    <div className="relative">
                                        <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            className="w-full pl-11 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                            placeholder="07XXXXXXXX or 2547XXXXXXXX"
                                            required
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-400 mt-1">
                                        A prompt will be sent to this phone asking for your M-Pesa PIN.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 text-xs">
                                        <p className="font-bold text-slate-600 dark:text-slate-300">
                                            Pay via School Paybill, then enter the Safaricom confirmation code below.
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                                            M-Pesa Receipt Number
                                        </label>
                                        <input
                                            type="text"
                                            value={manualMpesaCode}
                                            onChange={(e) => setManualMpesaCode(e.target.value.toUpperCase())}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono font-bold text-sm focus:outline-none focus:border-indigo-500 uppercase transition-colors"
                                            placeholder="e.g. QK872AB123"
                                            required
                                        />
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || topUpAmount <= 0}
                                className="w-full py-4 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Processing Float Top-Up...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>Confirm Top-Up of KES {topUpAmount.toLocaleString()}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* FLOAT LEDGER MODAL */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col p-6 sm:p-8 space-y-4 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
                                    <History className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-wider">
                                        School Payout Float Ledger
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Top-Ups &amp; Teacher Disbursements
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {isLoadingHistory ? (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                                    Loading float ledger...
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    No float transactions recorded yet.
                                </div>
                            ) : (
                                transactions.map((t) => (
                                    <div
                                        key={t.id}
                                        className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        t.flowType === 'CREDIT'
                                                            ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'
                                                            : 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300'
                                                    }`}
                                                >
                                                    {t.flowType === 'CREDIT' ? '+ Top-Up' : '- Teacher Payout'}
                                                </span>
                                                <span className="font-bold">{t.transactionCategory}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">
                                                {t.notes || 'Float ledger entry'}
                                            </p>
                                            <p className="text-[9px] text-slate-400 font-medium">
                                                {new Date(t.createdAt || Date.now()).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`text-sm font-black ${
                                                    t.flowType === 'CREDIT' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                                                }`}
                                            >
                                                {t.flowType === 'CREDIT' ? '+' : '-'} KES {t.amount.toLocaleString()}
                                            </span>
                                            <p className="text-[9px] text-slate-400 font-mono">
                                                Bal: KES {t.balanceAfter.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
