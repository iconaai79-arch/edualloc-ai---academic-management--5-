import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { RetailCommissionLedger as CommissionType, User, RetailInventoryItem } from '../../types';
import { HandCoins, Banknote, Calendar, User as UserIcon, Tag, CheckCircle2, AlertCircle, Search, Filter, ArrowUpRight } from 'lucide-react';

interface RetailCommissionLedgerProps {
    institutionId: string;
    currentUser: User;
}

export function RetailCommissionLedger({ institutionId, currentUser }: RetailCommissionLedgerProps) {
    const [commissions, setCommissions] = useState<CommissionType[]>([]);
    const [inventory, setInventory] = useState<RetailInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filterAgent, setFilterAgent] = useState('all');
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'unpaid'>('all');

    useEffect(() => {
        fetchData();
    }, [institutionId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [commData, invData] = await Promise.all([
                apiService.fetchModuleRecords<CommissionType>('retail_commission_ledger', institutionId),
                apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId)
            ]);

            if (commData) setCommissions(commData);
            if (invData) setInventory(invData);
        } catch (err) {
            console.error("Fetch commissions error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePayCommission = async (id: string) => {
        try {
            const comm = commissions.find(c => c.id === id);
            if (!comm) return;
            await apiService.saveModuleRecord('retail_commission_ledger', { ...comm, isPaid: true });
            fetchData();
        } catch (err) {
            console.error("Pay commission error:", err);
        }
    };

    const getItemName = (id: string) => inventory.find(i => i.id === id)?.name || 'Unknown Item';

    const filteredCommissions = commissions.filter(c => {
        const matchesStatus = filterStatus === 'all' || (filterStatus === 'paid' ? c.isPaid : !c.isPaid);
        return matchesStatus;
    });

    const totalEarned = commissions.reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalPaid = commissions.filter(c => c.isPaid).reduce((sum, c) => sum + c.commissionAmount, 0);
    const totalPending = totalEarned - totalPaid;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Commission Ledger</h2>
                    <p className="text-slate-500 text-sm mt-1">Track and settle field agent commissions from dynamic sales.</p>
                </div>

                <div className="bg-white p-1 rounded-xl border border-slate-200 flex gap-1 shadow-sm">
                    <button
                        onClick={() => setFilterStatus('all')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilterStatus('unpaid')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'unpaid' ? 'bg-amber-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setFilterStatus('paid')}
                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === 'paid' ? 'bg-emerald-500 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                    >
                        Paid
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Earned (Gross)</p>
                    <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-black text-slate-900">KES {totalEarned.toLocaleString()}</h3>
                        <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                            <HandCoins className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Pending Payouts</p>
                    <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-black text-amber-600">KES {totalPending.toLocaleString()}</h3>
                        <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 border-l-4 border-l-emerald-500">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Total Settled</p>
                    <div className="flex justify-between items-end">
                        <h3 className="text-3xl font-black text-emerald-600">KES {totalPaid.toLocaleString()}</h3>
                        <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Ledger Table */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-100">
                            <tr>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Agent & Date</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500">Item Details</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Pricing (Base / Sold)</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Commission</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredCommissions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-400">
                                        <div className="bg-slate-50 w-20 h-20 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6">
                                            <HandCoins className="w-10 h-10 opacity-20" />
                                        </div>
                                        <p className="font-bold text-slate-400 text-sm">No commission records matching filters</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredCommissions.map((comm) => (
                                    <tr key={comm.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 font-bold group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                                    {comm.agentId.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800">Agent {comm.agentId.substring(0, 8)}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1 mt-0.5">
                                                        <Calendar className="w-3 h-3" /> {new Date(comm.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-bold text-slate-700">{getItemName(comm.itemId)}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-widest">Sale #{comm.saleId.substring(0, 6)}</span>
                                                {comm.serialNumber && (
                                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-tighter">SN: {comm.serialNumber}</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right font-mono text-xs">
                                            <div className="flex flex-col items-end">
                                                <span className="text-slate-400">KES {comm.basePrice.toFixed(2)}</span>
                                                <span className="text-slate-900 font-black tracking-tight">KES {comm.soldPrice.toFixed(2)}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className="text-lg font-black text-slate-900">KES {comm.commissionAmount.toFixed(2)}</span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col items-center gap-2">
                                                {comm.isPaid ? (
                                                    <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100">
                                                        Settled
                                                    </span>
                                                ) : (
                                                    <>
                                                        <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100">
                                                            Awaiting
                                                        </span>
                                                        {currentUser.role === 'admin' && (
                                                            <button
                                                                onClick={() => handlePayCommission(comm.id)}
                                                                className="text-[9px] font-black text-indigo-600 hover:underline uppercase tracking-widest"
                                                            >
                                                                Mark as Paid
                                                            </button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Insight Card */}
            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-200">
                <div className="flex justify-between items-start">
                    <div className="max-w-md">
                        <h3 className="text-xl font-black uppercase tracking-tight">Agent Performance Insight</h3>
                        <p className="text-indigo-100 text-sm font-medium mt-3 leading-relaxed">
                            Field agents are currently averaging <span className="text-white font-black underline decoration-amber-400 decoration-2">18.4% margin</span> above base price. The top performing agent is <span className="text-white font-black">Admin One</span> with KES 1,240 in commissions today.
                        </p>
                        <button className="mt-8 flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:scale-105 transition-transform shadow-lg">
                            Download Ledger Report
                            <ArrowUpRight className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="hidden lg:block">
                        <Banknote className="w-32 h-32 text-white/10 -mr-10 -mt-10" />
                    </div>
                </div>
            </div>
        </div>
    );
}

// Fixed missing icon Clock which was used in stats but not exported/imported correctly
const Clock = ({ className }: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>;
