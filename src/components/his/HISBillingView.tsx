import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { FileTextIcon } from '../icons/FileTextIcon';
import { MpesaIcon } from '../icons/MpesaIcon';
import { ShieldIcon } from '../icons/ShieldIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ChartBarIcon } from '../icons/ChartBarIcon';
import { ClaimsManager } from './ClaimsManager';

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

export const HISBillingView: React.FC<{ institutionId?: string }> = ({ institutionId }) => {
    const [billingItems, setBillingItems] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadBilling = async () => {
            if (!institutionId) return;
            try {
                const items = await apiService.fetchModuleRecords('his_billing_items', institutionId, undefined, { order: 'created_at.desc' });
                const patients = await apiService.fetchModuleRecords('his_patients', institutionId);
                const enhanced = items.map((i: any) => ({
                    ...i,
                    patientName: patients.find((p: any) => p.id === i.patientId)?.fullName || 'Unknown'
                }));
                setBillingItems(enhanced);
            } catch (e) { console.error(e); } finally { setIsLoading(false); }
        };
        loadBilling();
    }, [institutionId]);
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

            <div className="grid grid-cols-1 gap-8">
                <ClaimsManager institutionId={institutionId} />
            </div>

                {/* Instant Invoicing / M-Pesa Integration Point */}
                <div className="space-y-8">
                    <div className="glass-morphism p-10 rounded-[3rem] border border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-8 italic italic">Patient <span className="text-indigo-400">Checkout</span></h3>
                        
                        <div className="space-y-4 mb-10 max-h-[400px] overflow-y-auto pr-2">
                            {billingItems.filter(i => i.status === 'pending').map((item, idx) => (
                                <div key={idx} className="p-6 bg-black/40 rounded-2xl border border-white/5 group hover:border-indigo-500/30 transition-all">
                                    <div className="flex justify-between items-center mb-4">
                                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.sourceType}</p>
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-1 rounded-md">Pending</span>
                                    </div>
                                    <h4 className="text-sm font-black uppercase italic tracking-tighter text-white">{item.itemName}</h4>
                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Patient: {item.patientName}</p>
                                    
                                    <div className="mt-4 flex justify-between items-end border-t border-white/5 pt-4">
                                        <div>
                                            <p className="text-[8px] text-slate-500 uppercase">Unit Price: {item.unitPrice}</p>
                                            <p className="text-lg font-black text-white">KES {item.totalAmount?.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[8px] font-bold text-slate-600 uppercase">QTY</p>
                                            <p className="text-sm font-black text-slate-400">x{item.quantity}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {billingItems.filter(i => i.status === 'pending').length === 0 && (
                                <div className="p-10 text-center opacity-30 italic font-black uppercase tracking-widest text-[9px]">No pending items for checkout</div>
                            )}
                        </div>

                        <div className="mb-8 p-6 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                             <div className="flex justify-between items-end">
                                <div>
                                    <p className="text-xs text-indigo-300 uppercase font-black italic">Total Payable</p>
                                    <p className="text-3xl font-black text-white italic">KES {billingItems.filter(i => i.status === 'pending').reduce((s, i) => s + i.totalAmount, 0)?.toLocaleString()}</p>
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
    );
};

