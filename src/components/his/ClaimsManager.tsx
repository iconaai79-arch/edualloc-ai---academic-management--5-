
import React, { useState, useEffect } from 'react';
import { HISClaim, HISPatient } from '../../types';
import { apiService } from '../../services/apiService';
import { CreditCardIcon } from '../icons/CreditCardIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';
import { ClockIcon } from '../icons/ClockIcon';

interface ClaimsManagerProps {
    institutionId?: string;
}

export const ClaimsManager: React.FC<ClaimsManagerProps> = ({ institutionId }) => {
    const [claims, setClaims] = useState<HISClaim[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [patients, setPatients] = useState<HISPatient[]>([]);

    const fetchClaims = async () => {
        if (!institutionId) return;
        setIsLoading(true);
        try {
            const [claimsData, patientsData] = await Promise.all([
                apiService.fetchModuleRecords('his_claims', institutionId),
                apiService.fetchModuleRecords('his_patients', institutionId)
            ]);
            setClaims(claimsData || []);
            setPatients(patientsData || []);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, [institutionId]);

    const getPatientName = (id: string) => patients.find(p => p.id === id)?.fullName || 'Unknown Patient';

    const handleUpdateStatus = async (claimId: string, status: HISClaim['status']) => {
        const claim = claims.find(c => c.id === claimId);
        if (!claim) return;
        try {
            await apiService.saveModuleRecord('his_claims', { ...claim, status });
            fetchClaims();
        } catch (error) {
            alert("Failed to update claim status");
        }
    };

    return (
        <div className="space-y-10 animate-fade-in-up">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter italic text-indigo-600">Revenue <span className="text-slate-900 dark:text-white">& Claims</span></h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-2">SHA / SHIF / Private Insurance Gateway</p>
                </div>
                <button 
                    onClick={fetchClaims}
                    className="p-4 bg-slate-100 dark:bg-white/5 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all text-slate-400"
                >
                    <ArrowPathIcon className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 bg-white dark:bg-slate-900 rounded-[3.5rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden p-10">
                    <div className="overflow-x-auto no-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-white/5">
                                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Claim Reference</th>
                                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Beneficiary</th>
                                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">ICD Code</th>
                                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                                    <th className="pb-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Phase</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                {claims.length > 0 ? claims.map(claim => (
                                    <tr key={claim.id} className="group hover:bg-slate-50 dark:hover:bg-white/5 transition-all">
                                        <td className="py-6">
                                            <p className="text-xs font-black tracking-tight">{claim.claimNumber}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{new Date(claim.createdAt).toLocaleDateString()}</p>
                                        </td>
                                        <td className="py-6">
                                            <p className="text-xs font-bold uppercase">{getPatientName(claim.patientId)}</p>
                                            <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest mt-1">{claim.serviceType}</p>
                                        </td>
                                        <td className="py-6">
                                            <span className="px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-lg text-[9px] font-black text-slate-600 dark:text-slate-400">{claim.icdCode}</span>
                                        </td>
                                        <td className="py-6">
                                            <p className="text-sm font-black italic">KES {claim.amount.toLocaleString()}</p>
                                        </td>
                                        <td className="py-6 text-right">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${
                                                    claim.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    claim.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500' :
                                                    'bg-amber-500/10 text-amber-500'
                                                }`}>
                                                    {claim.status}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan={5} className="py-20 text-center opacity-30 grayscale italic">
                                            <div className="flex flex-col items-center gap-4">
                                                <CreditCardIcon className="w-12 h-12" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">No claims detected in cycle</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="p-10 rounded-[3rem] bg-indigo-600 text-white shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl"></div>
                        <h4 className="text-xl font-black italic mb-2">SHA Gateway</h4>
                        <p className="text-[9px] font-black text-indigo-200 uppercase tracking-widest mb-8">Integrated Claims Node</p>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black">ACTIVE SESSION</p>
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                            </div>
                            <button className="w-full py-4 bg-white text-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all">
                                SECURE RECONCILIATION
                            </button>
                        </div>
                    </div>

                    <div className="p-10 rounded-[3rem] bg-slate-900 border border-white/10 text-white">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6">Financial Analytics</p>
                        <div className="space-y-6">
                            {[
                                { label: 'TOTAL INVOICED', value: 'KES 2.4M', color: 'text-white' },
                                { label: 'REVENUE COLLECTED', value: 'KES 1.8M', color: 'text-emerald-400' },
                                { label: 'PENDING CLAIMS', value: 'KES 600K', color: 'text-amber-400' }
                            ].map((stat, i) => (
                                <div key={i} className="flex justify-between items-end border-b border-white/5 pb-4 last:border-0 last:pb-0">
                                    <p className="text-[9px] font-bold text-slate-500 uppercase">{stat.label}</p>
                                    <p className={`text-xl font-black italic ${stat.color}`}>{stat.value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

