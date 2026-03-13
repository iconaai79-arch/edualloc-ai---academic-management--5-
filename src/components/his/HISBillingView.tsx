import React, { useState } from 'react';
import { 
    CreditCardIcon, 
    PlusIcon, 
    SparklesIcon,
    ArrowPathIcon,
    SearchIcon,
    FileTextIcon,
    MpesaIcon,
    ShieldIcon,
    CheckCircleIcon,
    ChartBarIcon
} from '../icons/index';

interface Claim {
    id: string;
    patient: string;
    provider: string;
    amount: number;
    status: 'Pending' | 'Approved' | 'Paid' | 'Queried';
    date: string;
    shaId?: string;
}

const MOCK_CLAIMS: Claim[] = [
    { id: 'cl_1', patient: 'John Kamau', provider: 'SHA (Social Health Authority)', amount: 45000, status: 'Approved', date: '2025-03-10', shaId: 'SHA-00982-K' },
    { id: 'cl_2', patient: 'Mary Wambui', provider: 'Jubilee Insurance', amount: 12500, status: 'Pending', date: '2025-03-12' },
    { id: 'cl_3', patient: 'David Njenga', provider: 'SHA (Social Health Authority)', amount: 8000, status: 'Paid', date: '2025-03-05', shaId: 'SHA-00712-B' },
    { id: 'cl_4', patient: 'Sarah Atieno', provider: 'UAP Old Mutual', amount: 95400, status: 'Queried', date: '2025-03-08' },
];

export const HISBillingView: React.FC = () => {
    return (
        <div className="animate-fade-in-up space-y-8">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter">Universal <span className="text-rose-400">Ledger</span></h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px] mt-2">Centralized Revenue & Claims Management Console</p>
                </div>
                <div className="flex gap-4">
                    <button className="glass-morphism px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all text-rose-400 border border-rose-400/30">
                        <ChartBarIcon className="w-4 h-4" /> Financial Reports
                    </button>
                    <button className="bg-white text-slate-950 px-8 py-3 rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                        <PlusIcon className="w-4 h-4" /> Generate Invoice
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                 {[
                    { label: 'Total Revenue', value: 'KES 1.2M', icon: CreditCardIcon, color: 'text-white' },
                    { label: 'SHA Pending', value: 'KES 450K', icon: ShieldIcon, color: 'text-rose-400' },
                    { label: 'Self-Pay Recieved', value: 'KES 680K', icon: MpesaIcon, color: 'text-emerald-400' },
                    { label: 'Rejection Rate', value: '2.4%', icon: SparklesIcon, color: 'text-amber-400' }
                 ].map((stat, i) => (
                    <div key={i} className="glass-morphism p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{stat.label}</p>
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-xl bg-white/5 border border-white/10 ${stat.color}`}>
                                    <stat.icon className="w-6 h-6" />
                                </div>
                                <span className="text-2xl font-black">{stat.value}</span>
                            </div>
                        </div>
                    </div>
                 ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Claims Monitoring Board */}
                <div className="md:col-span-2 glass-morphism rounded-[3.5rem] border border-white/5 overflow-hidden">
                    <div className="p-10 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                        <h3 className="text-xl font-black uppercase tracking-tighter">Claims <span className="text-rose-400">Monitoring</span></h3>
                        <div className="flex gap-3">
                             <button className="text-[9px] font-black px-4 py-2 bg-rose-500/10 text-rose-400 rounded-full border border-rose-400/20 uppercase tracking-widest">SHA Integration Active</button>
                        </div>
                    </div>
                    
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-white/5">
                                <tr>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Beneficiary</th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Payer</th>
                                    <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">Amount</th>
                                    <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {MOCK_CLAIMS.map((claim, idx) => (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group cursor-pointer">
                                        <td className="px-10 py-8">
                                            <p className="text-sm font-black text-white">{claim.patient}</p>
                                            {claim.shaId && <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mt-1">ID: {claim.shaId}</p>}
                                        </td>
                                        <td className="px-6 py-8">
                                            <span className="text-xs font-bold text-slate-300">{claim.provider}</span>
                                        </td>
                                        <td className="px-6 py-8 text-sm font-black">
                                            KES {claim.amount.toLocaleString()}
                                        </td>
                                        <td className="px-10 py-8 text-right">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                claim.status === 'Approved' ? 'bg-emerald-500/20 text-emerald-400' :
                                                claim.status === 'Paid' ? 'bg-blue-500/20 text-blue-400' :
                                                claim.status === 'Queried' ? 'bg-rose-500/20 text-rose-400' :
                                                'bg-white/5 text-slate-400'
                                            }`}>
                                                {claim.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Instant Invoicing / M-Pesa Integration Point */}
                <div className="space-y-8">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic">Instant <span className="text-indigo-400">Checkout</span></h3>
                        
                        <div className="mb-8 p-6 bg-black/40 rounded-2xl border border-white/5">
                            <div className="flex justify-between items-center mb-4">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Item</p>
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active Stay</span>
                            </div>
                            <h4 className="text-lg font-black uppercase italic">Room 304 - ICU Admission</h4>
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Ref: INV-882109</p>
                            
                            <div className="mt-6 flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-slate-400 uppercase">Subtotal</p>
                                    <p className="text-2xl font-black">KES 14,200</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-bold text-slate-500 uppercase">Est. SHA Cover</p>
                                    <p className="text-sm font-black text-rose-400">- KES 10,500</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <button className="w-full flex items-center justify-between px-8 py-5 bg-emerald-500 text-slate-950 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-[1.02] transition-all shadow-xl shadow-emerald-500/10">
                                <span>Pay with M-Pesa</span>
                                <MpesaIcon className="w-8 h-8" />
                            </button>
                            <button className="w-full py-5 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-white/5 transition-all">
                                Bill to Insurance
                            </button>
                        </div>
                    </div>

                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-white/[0.02]">
                         <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 text-center">Encryption Link Active</p>
                         <div className="flex justify-center gap-8 opacity-40">
                             <CheckCircleIcon className="w-6 h-6 text-emerald-400" />
                             <ShieldIcon className="w-6 h-6 text-blue-400" />
                             <SparklesIcon className="w-6 h-6 text-amber-400" />
                         </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
