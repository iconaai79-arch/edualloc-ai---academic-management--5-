import React, { useState } from 'react';

interface CitizenPetition {
    id: string;
    ticketNo: string;
    citizenName: string;
    citizenPhone: string;
    wardLocation: string;
    category: 'Water & Sanitation' | 'Roads & Infrastructure' | 'Bursary & Education' | 'Security';
    description: string;
    submittedDate: string;
    status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED';
    assignedOfficer: string;
}

export const CitizenGrievancePetitionDesk: React.FC = () => {
    const [petitions, setPetitions] = useState<CitizenPetition[]>([
        { id: 't_1', ticketNo: 'TKT-2026-901', citizenName: 'Moses Wanjala', citizenPhone: '+254712998877', wardLocation: 'Central Ward', category: 'Water & Sanitation', description: 'Borehole solar pump failure in Chepkubei village.', submittedDate: '2026-08-12', status: 'INVESTIGATING', assignedOfficer: 'Eng. David Cheruiyot' },
        { id: 't_2', ticketNo: 'TKT-2026-902', citizenName: 'Alice Muthoni', citizenPhone: '+254722554433', wardLocation: 'East Ward', category: 'Roads & Infrastructure', description: 'Culvert blockage along Market-Bridge feeder road.', submittedDate: '2026-08-10', status: 'PENDING', assignedOfficer: 'Unassigned' },
        { id: 't_3', ticketNo: 'TKT-2026-903', citizenName: 'Samuel Ochieng', citizenPhone: '+254733119988', wardLocation: 'North Ward', category: 'Bursary & Education', description: 'Disbursement status inquiry for secondary school bursary.', submittedDate: '2026-08-05', status: 'RESOLVED', assignedOfficer: 'Grace Wambui (CDF Secretary)' },
    ]);

    const markResolved = (id: string) => {
        setPetitions(prev => prev.map(p => p.id === id ? { ...p, status: 'RESOLVED' } : p));
        alert('✅ Petition marked RESOLVED! Citizen notified via SMS alert.');
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-full border border-emerald-500/30 uppercase tracking-wider">
                        Constituency NG-CDF & Citizen Governance
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Citizen Grievance & Ward Petition Desk</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Track Ward citizen petitions (roads, water, bursaries) and manage MP Office resolution progress
                    </p>
                </div>
            </div>

            {/* Petitions Table */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 italic">
                    ACTIVE CITIZEN PETITIONS & WARD GRIEVANCES
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4">Ticket & Citizen</th>
                                <th className="py-4">Ward Location</th>
                                <th className="py-4">Category</th>
                                <th className="py-4">Description</th>
                                <th className="py-4 text-center">Status</th>
                                <th className="py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {petitions.map(p => (
                                <tr key={p.id} className="border-b border-slate-800/60">
                                    <td className="py-4 font-black italic text-sm">
                                        {p.ticketNo}
                                        <div className="text-[10px] text-slate-400 font-bold">{p.citizenName} ({p.citizenPhone})</div>
                                    </td>
                                    <td className="py-4 text-xs font-bold text-slate-300 uppercase">{p.wardLocation}</td>
                                    <td className="py-4 text-xs font-bold text-emerald-400">{p.category}</td>
                                    <td className="py-4 text-xs text-slate-300 max-w-xs truncate">{p.description}</td>
                                    <td className="py-4 text-center">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${
                                            p.status === 'RESOLVED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : p.status === 'INVESTIGATING' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}>
                                            {p.status}
                                        </span>
                                    </td>
                                    <td className="py-4 text-right">
                                        {p.status !== 'RESOLVED' && (
                                            <button
                                                onClick={() => markResolved(p.id)}
                                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                            >
                                                ✓ Mark Resolved
                                            </button>
                                        )}
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
