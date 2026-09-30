import React, { useState, useEffect, useCallback } from 'react';
import { 
    Wallet, ArrowDownRight, Smartphone, ShieldCheck, RefreshCw, 
    AlertCircle, CheckCircle2, History, ChevronRight, X, Sparkles, DollarSign, Lock
} from 'lucide-react';
import type { TeacherWallet, ConvenienceFeeConfig, WalletTransaction } from '../types';
import { walletService } from '../services/walletService';

interface TeacherWalletCardProps {
    teacherId: string;
    institutionId: string;
    teacherName?: string;
    defaultPhone?: string;
    onBalanceChange?: () => void;
}

export const TeacherWalletCard: React.FC<TeacherWalletCardProps> = ({
    teacherId,
    institutionId,
    teacherName = 'Teacher',
    defaultPhone = '',
    onBalanceChange
}) => {
    const [wallet, setWallet] = useState<TeacherWallet | null>(null);
    const [feeConfig, setFeeConfig] = useState<ConvenienceFeeConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

    // Withdrawal Form States
    const [withdrawAmount, setWithdrawAmount] = useState<number>(0);
    const [phoneNumber, setPhoneNumber] = useState<string>(defaultPhone);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);

    // History States
    const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);

    const loadWalletData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [w, f] = await Promise.all([
                walletService.getTeacherWallet(teacherId, institutionId),
                walletService.getActiveConvenienceFeeConfig('TEACHER_WITHDRAWAL')
            ]);
            setWallet(w);
            setFeeConfig(f);
            if (!phoneNumber && w.mpesaPhoneNumber) {
                setPhoneNumber(w.mpesaPhoneNumber);
            }
        } catch (e) {
            console.error('[TeacherWalletCard] Error loading wallet:', e);
        } finally {
            setIsLoading(false);
        }
    }, [teacherId, institutionId, phoneNumber]);

    useEffect(() => {
        loadWalletData();
    }, [loadWalletData]);

    const loadHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const txns = await walletService.getWalletTransactions({
                teacherId,
                institutionId,
                walletType: 'TEACHER',
                limit: 30
            });
            setTransactions(txns);
        } catch (e) {
            console.error('[TeacherWalletCard] Error loading transactions:', e);
        } finally {
            setIsLoadingHistory(false);
        }
    };

    const feeBreakdown = feeConfig && withdrawAmount > 0 
        ? walletService.calculateFeeBreakdown(withdrawAmount, feeConfig)
        : { feeAmount: 0, netAmount: withdrawAmount, grossAmount: withdrawAmount, feeBearer: 'TEACHER' as const };

    const handleOpenWithdraw = () => {
        setErrorMsg(null);
        setSuccessMsg(null);
        if (wallet && wallet.availableBalance > 0) {
            setWithdrawAmount(wallet.availableBalance);
        } else {
            setWithdrawAmount(0);
        }
        setIsWithdrawModalOpen(true);
    };

    const handleExecuteWithdrawal = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);

        if (!wallet || wallet.availableBalance < withdrawAmount) {
            setErrorMsg('Requested withdrawal exceeds your available wallet balance.');
            return;
        }

        if (withdrawAmount <= feeBreakdown.feeAmount) {
            setErrorMsg(`Withdrawal must be greater than the convenience fee (KES ${feeBreakdown.feeAmount}).`);
            return;
        }

        if (!phoneNumber || phoneNumber.length < 10) {
            setErrorMsg('Please enter a valid Safaricom phone number.');
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await walletService.withdrawTeacherWalletToMpesa({
                institutionId,
                teacherId,
                amount: withdrawAmount,
                phoneNumber,
                notes: `Remedial Earnings Cash-Out for ${teacherName}`
            });

            if (result.success) {
                setSuccessMsg(result.message);
                await loadWalletData();
                if (onBalanceChange) onBalanceChange();
                setTimeout(() => {
                    setIsWithdrawModalOpen(false);
                    setSuccessMsg(null);
                }, 2500);
            } else {
                setErrorMsg(result.message);
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Withdrawal failed. Please check network.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <>
            {/* Wallet Overview Card */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-[2.5rem] p-7 text-white shadow-2xl border border-indigo-900/40">
                {/* Decorative glow */}
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 -mb-8 -ml-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-3">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                                <Wallet className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-300 block">
                                    Teacher E-Wallet &bull; Remedials Float
                                </span>
                                <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                                    {teacherName}
                                    {wallet?.isLocked && (
                                        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-full text-[9px] font-bold flex items-center gap-1">
                                            <Lock className="w-3 h-3" /> Locked
                                        </span>
                                    )}
                                </h3>
                            </div>
                        </div>

                        {/* Balance display */}
                        <div className="pt-2">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                                Available for Instant Cash-Out
                            </span>
                            <div className="flex items-baseline gap-2 mt-0.5">
                                <span className="text-xs font-bold text-emerald-400">KES</span>
                                <span className="text-3xl sm:text-4xl font-black tracking-tight text-emerald-400">
                                    {isLoading ? '...' : (wallet?.availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>

                        {/* Secondary stats */}
                        <div className="flex items-center gap-6 text-[11px] text-slate-300 pt-1">
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Earned</span>
                                <span className="font-black text-slate-200">
                                    KES {(wallet?.totalEarned ?? 0).toLocaleString()}
                                </span>
                            </div>
                            <div className="w-px h-6 bg-slate-800" />
                            <div>
                                <span className="text-slate-400 block text-[10px] uppercase font-bold">Total Withdrawn</span>
                                <span className="font-black text-slate-200">
                                    KES {(wallet?.totalWithdrawn ?? 0).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <button
                            onClick={() => {
                                setIsHistoryModalOpen(true);
                                loadHistory();
                            }}
                            className="px-4 py-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white rounded-2xl text-xs font-bold border border-slate-700/60 transition-all flex items-center justify-center gap-2"
                        >
                            <History className="w-4 h-4 text-indigo-400" />
                            <span>Ledger</span>
                        </button>

                        <button
                            onClick={handleOpenWithdraw}
                            disabled={isLoading || !wallet || wallet.availableBalance <= 0 || wallet.isLocked}
                            className="px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs font-black shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
                        >
                            <Smartphone className="w-4 h-4 text-emerald-100 group-hover:scale-110 transition-transform" />
                            <span>Withdraw to M-Pesa</span>
                            <ChevronRight className="w-4 h-4 ml-0.5 group-hover:translate-x-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>

            {/* WITHDRAW TO M-PESA MODAL */}
            {isWithdrawModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 text-white w-full max-w-lg rounded-[2.5rem] border border-slate-800 shadow-2xl p-6 sm:p-8 space-y-6 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-wider text-white">
                                        M-Pesa Express Cash-Out
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Instant B2C Disbursement to Safaricom
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsWithdrawModalOpen(false)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {errorMsg && (
                            <div className="p-4 bg-rose-500/20 border border-rose-500/40 rounded-2xl flex items-center gap-3 text-rose-300 text-xs font-bold">
                                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                                <span>{errorMsg}</span>
                            </div>
                        )}

                        {successMsg && (
                            <div className="p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-2xl flex items-center gap-3 text-emerald-300 text-xs font-bold">
                                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                                <span>{successMsg}</span>
                            </div>
                        )}

                        <form onSubmit={handleExecuteWithdrawal} className="space-y-5">
                            {/* Available Balance pill */}
                            <div className="p-4 bg-slate-800/70 rounded-2xl border border-slate-700/60 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400">Available Wallet Float:</span>
                                <span className="text-sm font-black text-emerald-400">
                                    KES {(wallet?.availableBalance ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>

                            {/* Amount input */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                                    Amount to Cash Out (KES)
                                </label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">
                                        KES
                                    </span>
                                    <input
                                        type="number"
                                        min={10}
                                        max={wallet?.availableBalance ?? 0}
                                        value={withdrawAmount || ''}
                                        onChange={(e) => setWithdrawAmount(Math.max(0, Number(e.target.value)))}
                                        className="w-full pl-14 pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-white font-black text-base focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="0"
                                        required
                                    />
                                </div>
                                {/* Quick amount chips */}
                                <div className="flex items-center gap-2 mt-2">
                                    {[0.25, 0.5, 0.75, 1.0].map((frac) => {
                                        const calc = Math.floor((wallet?.availableBalance ?? 0) * frac);
                                        return (
                                            <button
                                                type="button"
                                                key={frac}
                                                onClick={() => setWithdrawAmount(calc)}
                                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[10px] font-bold border border-slate-700 transition-colors"
                                            >
                                                {frac === 1 ? '100% (Max)' : `${frac * 100}%`}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Phone number */}
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                                    M-Pesa Registered Mobile Number
                                </label>
                                <div className="relative">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="tel"
                                        value={phoneNumber}
                                        onChange={(e) => setPhoneNumber(e.target.value)}
                                        className="w-full pl-11 pr-4 py-3 bg-slate-800/90 border border-slate-700 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="07XXXXXXXX or 2547XXXXXXXX"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Real-time Convenience Fee Breakdown */}
                            {withdrawAmount > 0 && (
                                <div className="p-4 bg-indigo-950/40 rounded-2xl border border-indigo-800/40 space-y-2 text-xs">
                                    <div className="flex justify-between items-center text-slate-300">
                                        <span>Gross Requested:</span>
                                        <span className="font-bold">KES {withdrawAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-indigo-300">
                                        <span className="flex items-center gap-1">
                                            Platform Convenience Fee
                                            <span className="text-[10px] text-indigo-400">({feeConfig?.feeType})</span>
                                        </span>
                                        <span className="font-bold">- KES {feeBreakdown.feeAmount.toLocaleString()}</span>
                                    </div>
                                    <div className="border-t border-indigo-800/40 pt-2 flex justify-between items-center text-emerald-400 font-black text-sm">
                                        <span>Net Disbursed to M-Pesa:</span>
                                        <span>KES {feeBreakdown.netAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={isSubmitting || withdrawAmount <= 0 || (wallet?.availableBalance ?? 0) < withdrawAmount}
                                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                {isSubmitting ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        <span>Dispatching M-Pesa Payout...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="w-4 h-4" />
                                        <span>Confirm &amp; Withdraw KES {feeBreakdown.netAmount.toLocaleString()}</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* TRANSACTION LEDGER MODAL */}
            {isHistoryModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-slate-900 text-white w-full max-w-2xl max-h-[85vh] rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col p-6 sm:p-8 space-y-4 animate-scale-up">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-xl">
                                    <History className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-black uppercase tracking-wider text-white">
                                        Teacher Earnings &amp; Withdrawal Ledger
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        Immutable Double-Entry Records
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
                            {isLoadingHistory ? (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-400" />
                                    Loading wallet ledger...
                                </div>
                            ) : transactions.length === 0 ? (
                                <div className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                    No ledger transactions recorded yet.
                                </div>
                            ) : (
                                transactions.map((t) => (
                                    <div
                                        key={t.id}
                                        className="p-4 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center justify-between text-xs"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        t.flowType === 'CREDIT'
                                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                            : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                    }`}
                                                >
                                                    {t.flowType === 'CREDIT' ? '+ Credited' : '- Withdrawn'}
                                                </span>
                                                <span className="text-white font-bold">{t.transactionCategory}</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-1">
                                                {t.notes || 'Transaction processed'}
                                            </p>
                                            <p className="text-[9px] text-slate-500 font-medium">
                                                {new Date(t.createdAt || Date.now()).toLocaleString()}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span
                                                className={`text-sm font-black ${
                                                    t.flowType === 'CREDIT' ? 'text-emerald-400' : 'text-slate-200'
                                                }`}
                                            >
                                                {t.flowType === 'CREDIT' ? '+' : '-'} KES {t.amount.toLocaleString()}
                                            </span>
                                            {t.convenienceFee > 0 && (
                                                <p className="text-[10px] text-indigo-300 font-bold">
                                                    Fee: KES {t.convenienceFee}
                                                </p>
                                            )}
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
