import React, { useState, useMemo } from 'react';
import { EventParticipant, EventPledge } from '../../types';
import { BanknotesIcon, PlusIcon, SparklesIcon, CheckCircleIcon, UserIcon } from '../icons';

interface FundraisingTrackerProps {
    participants: EventParticipant[];
    pledges: EventPledge[];
    onAddPledge: (data: Partial<EventPledge>) => Promise<void>;
    onConfirmPledgePayment: (id: string) => Promise<void>;
}

export const FundraisingTracker: React.FC<FundraisingTrackerProps> = ({
    participants,
    pledges,
    onAddPledge,
    onConfirmPledgePayment
}) => {
    const [sponsorName, setSponsorName] = useState('');
    const [amount, setAmount] = useState('');
    const [selectedRunnerId, setSelectedRunnerId] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Calculate aggregated fundraising totals
    const metrics = useMemo(() => {
        const total = pledges.reduce((sum, p) => sum + Number(p.amount), 0);
        const collected = pledges.filter(p => p.paymentStatus === 'paid').reduce((sum, p) => sum + Number(p.amount), 0);
        const pending = total - collected;
        return { total, collected, pending };
    }, [pledges]);

    // Leaderboard of top fundraising participants
    const topFundraisers = useMemo(() => {
        const list = participants.map(p => {
            const runnerPledges = pledges.filter(pl => pl.participantId === p.id);
            const totalRaised = runnerPledges.reduce((sum, pl) => sum + Number(pl.amount), 0);
            return {
                ...p,
                totalRaised
            };
        });

        // Filter and sort
        return list.filter(p => p.totalRaised > 0).sort((a, b) => b.totalRaised - a.totalRaised);
    }, [participants, pledges]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedRunnerId || !sponsorName || !amount) return;

        setIsSubmitting(true);
        try {
            await onAddPledge({
                participantId: selectedRunnerId,
                sponsorName,
                amount: parseFloat(amount),
                paymentStatus: 'pending'
            });

            alert('Pledge successfully added!');
            setSponsorName('');
            setAmount('');
            setSelectedRunnerId('');
        } catch (err: any) {
            alert('Failed to save pledge: ' + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Financial Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 bg-indigo-600 text-white rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-200">Total Funds Pledged</span>
                        <div className="text-3xl font-black mt-1">KES {metrics.total.toLocaleString()}</div>
                    </div>
                    <BanknotesIcon className="w-12 h-12 text-indigo-300/40" />
                </div>
                <div className="p-6 bg-emerald-600 text-white rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-200">Total Collected</span>
                        <div className="text-3xl font-black mt-1">KES {metrics.collected.toLocaleString()}</div>
                    </div>
                    <CheckCircleIcon className="w-12 h-12 text-emerald-300/40" />
                </div>
                <div className="p-6 bg-slate-800 text-white rounded-3xl shadow-xl flex items-center justify-between relative overflow-hidden">
                    <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-xl"></div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Outstanding Pledges</span>
                        <div className="text-3xl font-black mt-1">KES {metrics.pending.toLocaleString()}</div>
                    </div>
                    <div className="w-12 h-12 flex items-center justify-center bg-slate-700/40 rounded-full font-black text-xl text-slate-400">?</div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Form to log a new pledge */}
                <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm space-y-4 lg:col-span-1">
                    <div className="flex items-center gap-2">
                        <PlusIcon className="w-5 h-5 text-indigo-500" />
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-bold">Log Sponsor Pledge</h4>
                    </div>

                    <form onSubmit={handleFormSubmit} className="space-y-3 text-xs">
                        <div>
                            <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Select Runner Sponsored</label>
                            <select
                                required
                                value={selectedRunnerId}
                                onChange={e => setSelectedRunnerId(e.target.value)}
                                className="w-full px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">-- Choose Runner --</option>
                                {participants.map(p => (
                                    <option key={p.id} value={p.id}>
                                        BIB {p.bibNumber || 'N/A'} - {p.firstName} {p.lastName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Sponsor / Company Name</label>
                            <input
                                type="text"
                                required
                                value={sponsorName}
                                onChange={e => setSponsorName(e.target.value)}
                                placeholder="e.g. Acme Corp or John's Family"
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <div>
                            <label className="block font-bold text-slate-500 dark:text-slate-400 mb-1">Pledge Amount (KES)</label>
                            <input
                                type="number"
                                required
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                                placeholder="1000"
                                min="1"
                                className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedRunnerId}
                            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white rounded-xl font-bold transition-all shadow-md"
                        >
                            {isSubmitting ? 'Saving...' : 'Add Pledge'}
                        </button>
                    </form>
                </div>

                {/* Top fundraisers and active pledge log */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Top Fundraisers list */}
                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                        <div className="flex items-center gap-2 mb-4">
                            <SparklesIcon className="w-5 h-5 text-amber-500" />
                            <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-bold">Top Fundraiser Standings</h4>
                        </div>

                        <div className="space-y-3">
                            {topFundraisers.slice(0, 5).map((runner, index) => (
                                <div key={runner.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                    <div className="flex items-center gap-3">
                                        <span className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 flex items-center justify-center text-xs font-black">
                                            #{index + 1}
                                        </span>
                                        <div>
                                            <div className="text-xs font-bold text-slate-800 dark:text-white">
                                                {runner.firstName} {runner.lastName}
                                            </div>
                                            <div className="text-[10px] text-slate-400">BIB {runner.bibNumber}</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs font-black text-indigo-600 dark:text-indigo-400">KES {runner.totalRaised.toLocaleString()}</div>
                                        <div className="text-[9px] text-slate-400">raised</div>
                                    </div>
                                </div>
                            ))}
                            {topFundraisers.length === 0 && (
                                <div className="text-center py-8 text-slate-400 text-xs">No funds raised yet.</div>
                            )}
                        </div>
                    </div>

                    {/* Pledge Log Table */}
                    <div className="p-6 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl shadow-sm">
                        <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider font-bold mb-4">Active Pledge Audit Log</h4>
                        
                        <div className="overflow-x-auto text-xs">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase text-[10px]">
                                        <th className="pb-2">Sponsor</th>
                                        <th className="pb-2">Runner Supported</th>
                                        <th className="pb-2">Amount</th>
                                        <th className="pb-2">Status</th>
                                        <th className="pb-2 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {pledges.map(pl => {
                                        const runner = participants.find(p => p.id === pl.participantId);
                                        return (
                                            <tr key={pl.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                <td className="py-2.5 font-bold text-slate-700 dark:text-slate-300">{pl.sponsorName}</td>
                                                <td className="py-2.5">
                                                    {runner ? `${runner.firstName} ${runner.lastName} (BIB ${runner.bibNumber})` : 'Unknown'}
                                                </td>
                                                <td className="py-2.5 font-bold text-slate-800 dark:text-white font-mono">
                                                    KES {Number(pl.amount).toLocaleString()}
                                                </td>
                                                <td className="py-2.5">
                                                    {pl.paymentStatus === 'paid' ? (
                                                        <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 rounded text-[9px] font-bold">PAID</span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded text-[9px] font-bold">PENDING</span>
                                                    )}
                                                </td>
                                                <td className="py-2.5 text-right">
                                                    {pl.paymentStatus !== 'paid' && (
                                                        <button
                                                            onClick={() => onConfirmPledgePayment(pl.id)}
                                                            className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded font-bold text-[9px]"
                                                        >
                                                            Confirm Payment
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {pledges.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400">No pledges logged yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
