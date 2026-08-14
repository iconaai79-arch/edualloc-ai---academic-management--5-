import React, { useState } from 'react';
import { SparklesIcon } from '../icons/SparklesIcon';
import { PrinterIcon } from '../icons/PrinterIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';

interface CampaignPromise {
    id: string;
    pledgeTitle: string;
    category: 'Infrastructure & Roads' | 'Bursary & Education' | 'Water & Sanitation' | 'Youth & Innovation';
    wardLocation: string;
    allocatedBudget: number;
    completionPct: number;
    status: 'NOT_STARTED' | 'IN_PROGRESS' | 'FULFILLED' | 'BROKEN';
    proofDescription: string;
}

export const CampaignPromiseTracker: React.FC = () => {
    const [promises, setPromises] = useState<CampaignPromise[]>([
        { id: 'pledge_1', pledgeTitle: 'Constituency Bursary Expansion (KES 20M to Tertiary Students)', category: 'Bursary & Education', wardLocation: 'Central Ward', allocatedBudget: 20000000, completionPct: 100, status: 'FULFILLED', proofDescription: 'Disbursed bursary cheques to 1,200 university & TVET candidates.' },
        { id: 'pledge_2', pledgeTitle: 'Construction of Solar Water Boreholes in 4 Sub-Locations', category: 'Water & Sanitation', wardLocation: 'North Ward', allocatedBudget: 8500000, completionPct: 65, status: 'IN_PROGRESS', proofDescription: 'Drilling complete at 3 sites; solar pump installation underway.' },
        { id: 'pledge_3', pledgeTitle: 'Establishment of Youth Innovation & Coding Lab', category: 'Youth & Innovation', wardLocation: 'East Ward', allocatedBudget: 12000000, completionPct: 40, status: 'IN_PROGRESS', proofDescription: 'Building renovation complete; computers being installed.' },
    ]);

    const openPublicPortalLink = () => {
        window.open('/?view=public-promise-tracker', '_blank');
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-black rounded-full border border-indigo-500/30 uppercase tracking-wider">
                        Political Campaign & Constituency NG-CDF Hub
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Manifesto & Campaign Promise Tracker</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Track campaign manifesto pledges, Ward budget allocations, project proof, and citizen transparency
                    </p>
                </div>
                <button
                    onClick={openPublicPortalLink}
                    className="px-6 py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/30 flex items-center gap-2 cursor-pointer active:scale-95"
                >
                    <span>🌐 Open Public Citizen Portal</span>
                </button>
            </div>

            {/* Campaign Promises Ledger */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-black uppercase tracking-widest text-indigo-400 italic">
                        CONSTITUENCY MANIFESTO PLEDGES & WARD PROJECTS
                    </h3>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4">Pledge Title</th>
                                <th className="py-4">Category</th>
                                <th className="py-4">Ward Location</th>
                                <th className="py-4 font-mono">Budget (KES)</th>
                                <th className="py-4 text-center">Progress %</th>
                                <th className="py-4 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {promises.map(p => (
                                <tr key={p.id} className="border-b border-slate-800/60">
                                    <td className="py-4 font-black italic text-sm">
                                        {p.pledgeTitle}
                                        <div className="text-[10px] text-slate-400 font-bold">{p.proofDescription}</div>
                                    </td>
                                    <td className="py-4 text-xs font-bold text-indigo-400 uppercase">{p.category}</td>
                                    <td className="py-4 text-xs font-bold text-slate-300 uppercase">{p.wardLocation}</td>
                                    <td className="py-4 font-mono font-black text-sm text-emerald-400">
                                        KES {p.allocatedBudget.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-center">
                                        <div className="w-24 h-2 bg-slate-800 rounded-full mx-auto overflow-hidden">
                                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${p.completionPct}%` }} />
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 mt-1 block">{p.completionPct}%</span>
                                    </td>
                                    <td className="py-4 text-right">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                            p.status === 'FULFILLED'
                                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                                : p.status === 'IN_PROGRESS'
                                                ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                            {p.status.replace('_', ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
