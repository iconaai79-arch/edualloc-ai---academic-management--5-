import React, { useState, useEffect } from 'react';
import { 
    Coins, DollarSign, Settings, Percent, ShieldCheck, 
    RefreshCw, CheckCircle2, AlertCircle, X, Sparkles, TrendingUp
} from 'lucide-react';
import type { ConvenienceFeeConfig, SuperAdminRevenueWallet, ConvenienceFeeType, ConvenienceFeeBearer, ConvenienceFeeAppliesTo } from '../../types';
import { walletService } from '../../services/walletService';

interface ConvenienceFeeSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

export const ConvenienceFeeSettingsModal: React.FC<ConvenienceFeeSettingsModalProps> = ({
    isOpen,
    onClose,
    onSaved
}) => {
    const [config, setConfig] = useState<ConvenienceFeeConfig | null>(null);
    const [revenueWallet, setRevenueWallet] = useState<SuperAdminRevenueWallet | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form fields
    const [feeType, setFeeType] = useState<ConvenienceFeeType>('HYBRID');
    const [fixedAmount, setFixedAmount] = useState<number>(10);
    const [percentageRate, setPercentageRate] = useState<number>(1.0);
    const [minFee, setMinFee] = useState<number>(10);
    const [maxFee, setMaxFee] = useState<number>(75);
    const [feeBearer, setFeeBearer] = useState<ConvenienceFeeBearer>('TEACHER');
    const [appliesTo, setAppliesTo] = useState<ConvenienceFeeAppliesTo>('TEACHER_WITHDRAWAL');

    // Simulator
    const [simAmount, setSimAmount] = useState<number>(5000);

    useEffect(() => {
        if (!isOpen) return;

        const load = async () => {
            setIsLoading(true);
            try {
                const [cfg, rev] = await Promise.all([
                    walletService.getActiveConvenienceFeeConfig('TEACHER_WITHDRAWAL'),
                    walletService.getSuperAdminRevenueWallet()
                ]);
                setConfig(cfg);
                setRevenueWallet(rev);
                setFeeType(cfg.feeType);
                setFixedAmount(cfg.fixedAmount);
                setPercentageRate(cfg.percentageRate);
                setMinFee(cfg.minFee);
                setMaxFee(cfg.maxFee);
                setFeeBearer(cfg.feeBearer);
                setAppliesTo(cfg.appliesTo);
            } catch (e) {
                console.error('[ConvenienceFeeSettingsModal] load error:', e);
            } finally {
                setIsLoading(false);
            }
        };

        load();
    }, [isOpen]);

    if (!isOpen) return null;

    // Live calculation for preview
    const tempConfig: ConvenienceFeeConfig = {
        id: 'temp',
        name: 'Preview',
        feeType,
        fixedAmount,
        percentageRate,
        minFee,
        maxFee,
        feeBearer,
        appliesTo,
        isActive: true
    };
    const simBreakdown = walletService.calculateFeeBreakdown(simAmount, tempConfig);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMsg(null);
        setSuccessMsg(null);
        setIsSaving(true);

        try {
            await walletService.saveConvenienceFeeConfig({
                id: config?.id,
                feeType,
                fixedAmount,
                percentageRate,
                minFee,
                maxFee,
                feeBearer,
                appliesTo,
                isActive: true,
                description: `Super Admin Config: ${feeType} (${fixedAmount} fixed + ${percentageRate}%, cap: ${maxFee}) bearer: ${feeBearer}`
            });

            setSuccessMsg('Convenience fee configuration updated successfully!');
            if (onSaved) onSaved();
            setTimeout(() => {
                setSuccessMsg(null);
                onClose();
            }, 1800);
        } catch (err: any) {
            setErrorMsg(err.message || 'Failed to save fee settings.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 text-white w-full max-w-2xl max-h-[90vh] rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col p-6 sm:p-8 space-y-6 animate-scale-up">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/30">
                            <Coins className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-black uppercase tracking-wider text-white">
                                Super Admin Convenience Fee Engine
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                Transaction Monetization &amp; Platform Revenue Controls
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Revenue stats banner */}
                <div className="p-4 bg-gradient-to-r from-amber-950/40 via-slate-900 to-indigo-950/40 rounded-2xl border border-amber-800/30 flex items-center justify-between">
                    <div>
                        <span className="text-[10px] uppercase font-black text-amber-400 block tracking-wider">
                            Total Platform Convenience Fees Collected
                        </span>
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                            <span className="text-xs font-bold text-amber-300">KES</span>
                            <span className="text-2xl font-black text-amber-400">
                                {(revenueWallet?.totalFeesCollected ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] uppercase font-black text-indigo-400 block tracking-wider">
                            Available Platform Balance
                        </span>
                        <span className="text-base font-black text-white">
                            KES {(revenueWallet?.availableBalance ?? 0).toLocaleString()}
                        </span>
                    </div>
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

                {/* Main Settings Form */}
                <form onSubmit={handleSave} className="flex-1 overflow-y-auto space-y-5 custom-scrollbar pr-1">
                    {/* Fee Model Selector */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-2">
                            Convenience Fee Model
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {(['FIXED', 'PERCENTAGE', 'HYBRID', 'FREE'] as ConvenienceFeeType[]).map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFeeType(type)}
                                    className={`py-3 px-3 rounded-2xl text-xs font-black border transition-all text-center ${
                                        feeType === type
                                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-lg shadow-amber-500/20'
                                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                                    }`}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Rates grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {(feeType === 'FIXED' || feeType === 'HYBRID') && (
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                                    Fixed Amount per Payout (KES)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    value={fixedAmount}
                                    onChange={(e) => setFixedAmount(Math.max(0, Number(e.target.value)))}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                    required
                                />
                            </div>
                        )}

                        {(feeType === 'PERCENTAGE' || feeType === 'HYBRID') && (
                            <div>
                                <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                                    Percentage Rate (%)
                                </label>
                                <input
                                    type="number"
                                    min={0}
                                    max={100}
                                    step={0.1}
                                    value={percentageRate}
                                    onChange={(e) => setPercentageRate(Math.max(0, Number(e.target.value)))}
                                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                    required
                                />
                            </div>
                        )}

                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                                Minimum Fee Floor (KES)
                            </label>
                            <input
                                type="number"
                                min={0}
                                value={minFee}
                                onChange={(e) => setMinFee(Math.max(0, Number(e.target.value)))}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                                Maximum Fee Cap (KES)
                            </label>
                            <input
                                type="number"
                                min={minFee}
                                value={maxFee}
                                onChange={(e) => setMaxFee(Math.max(0, Number(e.target.value)))}
                                className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-2xl text-white font-bold text-sm focus:outline-none focus:border-amber-500 transition-colors"
                                required
                            />
                        </div>
                    </div>

                    {/* Fee Bearer Selection */}
                    <div>
                        <label className="block text-xs font-black uppercase tracking-wider text-slate-300 mb-1.5">
                            Who Bears the Convenience Fee?
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => setFeeBearer('TEACHER')}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    feeBearer === 'TEACHER'
                                        ? 'bg-amber-500/10 border-amber-500/50 text-white'
                                        : 'bg-slate-800 border-slate-700 text-slate-400'
                                }`}
                            >
                                <span className="text-xs font-black uppercase tracking-wider block text-amber-400">
                                    Teacher (On Withdrawal)
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Fee is subtracted from teacher's cash-out payout into M-Pesa.
                                </span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setFeeBearer('SCHOOL')}
                                className={`p-4 rounded-2xl border text-left transition-all ${
                                    feeBearer === 'SCHOOL'
                                        ? 'bg-amber-500/10 border-amber-500/50 text-white'
                                        : 'bg-slate-800 border-slate-700 text-slate-400'
                                }`}
                            >
                                <span className="text-xs font-black uppercase tracking-wider block text-amber-400">
                                    School (On Float Disbursement)
                                </span>
                                <span className="text-[10px] text-slate-400 mt-1 block">
                                    Fee is paid by the school float; teacher receives 100% full amount.
                                </span>
                            </button>
                        </div>
                    </div>

                    {/* LIVE SIMULATOR */}
                    <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4 text-emerald-400" /> Live Fee Simulator
                            </span>
                            <span className="text-xs text-slate-400 font-mono">
                                Simulating KES {simAmount.toLocaleString()}
                            </span>
                        </div>
                        <input
                            type="range"
                            min={500}
                            max={50000}
                            step={500}
                            value={simAmount}
                            onChange={(e) => setSimAmount(Number(e.target.value))}
                            className="w-full accent-amber-500"
                        />
                        <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                            <div className="p-2.5 bg-slate-900 rounded-xl">
                                <span className="text-[9px] uppercase text-slate-400 font-bold block">Gross Amount</span>
                                <span className="font-black text-slate-200">KES {simAmount.toLocaleString()}</span>
                            </div>
                            <div className="p-2.5 bg-amber-950/60 border border-amber-800/40 rounded-xl">
                                <span className="text-[9px] uppercase text-amber-400 font-bold block">Platform Fee</span>
                                <span className="font-black text-amber-400">KES {simBreakdown.feeAmount.toLocaleString()}</span>
                            </div>
                            <div className="p-2.5 bg-emerald-950/60 border border-emerald-800/40 rounded-xl">
                                <span className="text-[9px] uppercase text-emerald-400 font-bold block">Teacher Receives</span>
                                <span className="font-black text-emerald-400">KES {simBreakdown.netAmount.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isSaving}
                        className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:opacity-50 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span>Saving Engine Config...</span>
                            </>
                        ) : (
                            <>
                                <ShieldCheck className="w-4 h-4" />
                                <span>Save Platform Convenience Fee Engine</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};
