
import React, { useMemo } from 'react';
import type { Invoice, Receipt, Expense, FinancialGoal, User, Institution } from '../../types';
import { CurrencyDollarIcon } from '../icons/CurrencyDollarIcon';
import { ArrowTrendingUpIcon } from '../icons/ArrowTrendingUpIcon';
import { ArrowTrendingDownIcon } from '../icons/ArrowTrendingDownIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';

interface RevenueWarRoomProps {
    invoices: Invoice[];
    receipts: Receipt[];
    expenses: Expense[];
    goals: FinancialGoal[];
    students: User[];
    institution: Institution;
}

export const RevenueWarRoom: React.FC<RevenueWarRoomProps> = ({
    invoices,
    receipts,
    expenses,
    goals,
    students,
    institution
}) => {
    const stats = useMemo(() => {
        const totalBilled = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
        const totalCollected = receipts.reduce((acc, rec) => acc + rec.amountPaid, 0);
        const totalExpenses = expenses.reduce((acc, exp) => acc + exp.amount, 0);
        const outstanding = totalBilled - totalCollected;
        const collectionRate = totalBilled > 0 ? (totalCollected / totalBilled) * 100 : 0;
        
        return {
            totalBilled,
            totalCollected,
            totalExpenses,
            outstanding,
            collectionRate,
            netCashFlow: totalCollected - totalExpenses
        };
    }, [invoices, receipts, expenses]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header / Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Revenue', value: stats.totalCollected, icon: CurrencyDollarIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', trend: '+12%' },
                    { label: 'Outstanding Debt', value: stats.outstanding, icon: ArrowTrendingUpIcon, color: 'text-rose-600', bg: 'bg-rose-50', trend: '-5%' },
                    { label: 'Total Expenses', value: stats.totalExpenses, icon: ArrowTrendingDownIcon, color: 'text-amber-600', bg: 'bg-amber-50', trend: '+8%' },
                    { label: 'Net Cash Flow', value: stats.netCashFlow, icon: ChartBarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', trend: 'Stable' },
                ].map((stat, i) => (
                    <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                        <div className={`absolute top-0 right-0 w-24 h-24 ${stat.bg} rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-150 transition-transform duration-700`} />
                        <div className="relative">
                            <div className={`${stat.bg} ${stat.color} w-12 h-12 rounded-2xl flex items-center justify-center mb-4`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">{stat.label}</p>
                            <h4 className="text-2xl font-black text-slate-900 tracking-tight">KES {stat.value.toLocaleString()}</h4>
                            <div className="mt-4 flex items-center gap-2">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${stat.color} ${stat.bg}`}>{stat.trend}</span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">vs last term</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Collection Performance & Expense Analytics */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="text-xl font-black text-slate-900 tracking-tight">Collection Intelligence</h3>
                            <p className="text-xs font-bold text-slate-400">Real-time revenue tracking & goal alignment</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Collection Rate</p>
                            <p className="text-2xl font-black text-emerald-600">{stats.collectionRate.toFixed(1)}%</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="h-4 bg-slate-100 rounded-full overflow-hidden flex">
                        <div className="bg-emerald-500 h-full transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.4)]" style={{ width: `${stats.collectionRate}%` }} />
                    </div>

                    <div className="grid grid-cols-3 gap-6 pt-4">
                        {goals.map((goal, i) => {
                            const progress = (stats.totalCollected / goal.targetAmount) * 100;
                            return (
                                <div key={i} className="space-y-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{goal.period} Goal</p>
                                    <p className="text-lg font-black text-slate-900">KES {goal.targetAmount.toLocaleString()}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div className="bg-indigo-600 h-full" style={{ width: `${Math.min(progress, 100)}%` }} />
                                        </div>
                                        <span className="text-[10px] font-black text-indigo-600">{progress.toFixed(0)}%</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[3rem] text-white space-y-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-indigo-500/20 via-transparent to-transparent" />
                    <div className="relative">
                        <h3 className="text-xl font-black tracking-tight">Expense Allocation</h3>
                        <p className="text-xs font-bold text-slate-400">Category-wise spending distribution</p>
                        
                        <div className="mt-8 space-y-6">
                            {['Salaries', 'Utilities', 'Maintenance', 'Supplies'].map(cat => {
                                const amount = expenses.filter(e => e.category === cat).reduce((acc, e) => acc + e.amount, 0);
                                const perc = stats.totalExpenses > 0 ? (amount / stats.totalExpenses) * 100 : 0;
                                return (
                                    <div key={cat} className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-slate-400">{cat}</span>
                                            <span>KES {amount.toLocaleString()}</span>
                                        </div>
                                        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                                            <div className="bg-white h-full" style={{ width: `${perc}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-10 pt-6 border-t border-white/10">
                            <button className="w-full py-4 bg-white text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 transition-colors">
                                Download Full Audit Report
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Recent Transactions List */}
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 border-b border-slate-50 flex justify-between items-center">
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase tracking-widest text-sm">Recent Financial Flux</h3>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-xl border border-slate-100">Filter By Date</button>
                        <button className="px-4 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg">New Entry</button>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50">
                            <tr>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Reference</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Type</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Description</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Amount</th>
                                <th className="px-8 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[...receipts, ...expenses].sort((a, b) => new Date((b as any).paymentDate || (b as any).date).getTime() - new Date((a as any).paymentDate || (a as any).date).getTime()).slice(0, 10).map((tx, i) => {
                                const isExpense = 'category' in tx;
                                return (
                                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-slate-900">{(tx as any).receiptNumber || (tx as any).referenceNumber || 'TX-'+Math.random().toString(36).substr(2,6).toUpperCase()}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{(tx as any).paymentDate || (tx as any).date}</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${isExpense ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
                                                {isExpense ? 'Expense' : 'Income'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-xs font-bold text-slate-600 leading-tight">{(tx as any).paidFor || (tx as any).description}</p>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className={`text-sm font-black ${isExpense ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {isExpense ? '-' : '+'}KES {((tx as any).amountPaid || (tx as any).amount).toLocaleString()}
                                            </p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[10px] font-black uppercase text-slate-400">Verified</span>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
