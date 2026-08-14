import React, { useState } from 'react';

interface FarmerCreditRecord {
    id: string;
    farmerName: string;
    farmerCode: string;
    routeLocation: string;
    avgDailyLiters: number;
    avgFatContentPct: number;
    creditScore: number; // 300 to 850
    approvedCreditLimit: number;
    activeLoanBalance: number;
    status: 'EXCELLENT_CREDIT' | 'GOOD_CREDIT' | 'RISK_WARN';
}

export const FarmerMilkQualityCreditEngine: React.FC = () => {
    const [farmers, setFarmers] = useState<FarmerCreditRecord[]>([
        { id: 'f_1', farmerName: 'Joseph Kiptoo', farmerCode: 'FARM-089', routeLocation: 'Kipkaren Route', avgDailyLiters: 48, avgFatContentPct: 4.2, creditScore: 780, approvedCreditLimit: 120000, activeLoanBalance: 15000, status: 'EXCELLENT_CREDIT' },
        { id: 'f_2', farmerName: 'Mary Chebet', farmerCode: 'FARM-112', routeLocation: 'Nandi Hills Route', avgDailyLiters: 32, avgFatContentPct: 3.9, creditScore: 690, approvedCreditLimit: 75000, activeLoanBalance: 8000, status: 'GOOD_CREDIT' },
        { id: 'f_3', farmerName: 'Peter Wanyonyi', farmerCode: 'FARM-045', routeLocation: 'Turbo Route', avgDailyLiters: 15, avgFatContentPct: 3.2, creditScore: 540, approvedCreditLimit: 25000, activeLoanBalance: 22000, status: 'RISK_WARN' },
    ]);

    const [selectedFarmer, setSelectedFarmer] = useState<FarmerCreditRecord | null>(null);
    const [loanAmount, setLoanAmount] = useState('');

    const issueAgrovetLoan = () => {
        if (!selectedFarmer || !loanAmount) return;
        const requested = parseFloat(loanAmount);
        if (requested > selectedFarmer.approvedCreditLimit - selectedFarmer.activeLoanBalance) {
            alert('⚠️ Requested amount exceeds approved credit limit!');
            return;
        }

        setFarmers(prev => prev.map(f => f.id === selectedFarmer.id ? {
            ...f,
            activeLoanBalance: f.activeLoanBalance + requested
        } : f));

        alert(`🌾 KES ${requested.toLocaleString()} Agrovet Input Loan approved for ${selectedFarmer.farmerName}! Deductions will occur on monthly milk payout.`);
        setSelectedFarmer(null);
        setLoanAmount('');
    };

    return (
        <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-8 animate-fade-in">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 border border-emerald-500/30 p-8 rounded-[3rem] text-white shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-black rounded-full border border-emerald-500/30 uppercase tracking-wider">
                        Dairy Cooperative & Financial Analytics
                    </span>
                    <h2 className="text-3xl font-black italic mt-2">Farmer Milk Quality & Agrovet Credit Engine</h2>
                    <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mt-1">
                        Log milk density & fat content %, calculate 3-month credit scores, and approve instant Agrovet input loans
                    </p>
                </div>
            </div>

            {/* Farmers Credit Table */}
            <div className="bg-slate-900 p-8 rounded-[3rem] border border-slate-800 space-y-6 shadow-xl text-white">
                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-400 italic">
                    FARMER CREDIT SCORES & AGROVET LOAN ELIGIBILITY LEDGER
                </h3>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-400">
                                <th className="py-4">Farmer & Code</th>
                                <th className="py-4">Route Location</th>
                                <th className="py-4 font-mono">Daily Supply</th>
                                <th className="py-4 font-mono">Fat Content %</th>
                                <th className="py-4 text-center">Credit Score</th>
                                <th className="py-4 font-mono">Credit Limit (KES)</th>
                                <th className="py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {farmers.map(f => (
                                <tr key={f.id} className="border-b border-slate-800/60">
                                    <td className="py-4 font-black italic text-sm">
                                        {f.farmerName}
                                        <div className="text-[10px] text-slate-400 font-bold">{f.farmerCode}</div>
                                    </td>
                                    <td className="py-4 text-xs font-bold text-slate-300">{f.routeLocation}</td>
                                    <td className="py-4 font-mono font-bold text-xs text-indigo-300">{f.avgDailyLiters} Liters/Day</td>
                                    <td className="py-4 font-mono font-bold text-xs text-amber-400">{f.avgFatContentPct}% Fat</td>
                                    <td className="py-4 text-center font-mono font-black text-sm">
                                        <span className={`px-3 py-1 rounded-full text-xs font-black ${
                                            f.creditScore >= 700 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : f.creditScore >= 600 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                        }`}>
                                            {f.creditScore} PTS
                                        </span>
                                    </td>
                                    <td className="py-4 font-mono font-black text-sm text-emerald-400">
                                        KES {f.approvedCreditLimit.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right">
                                        <button
                                            onClick={() => setSelectedFarmer(f)}
                                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer"
                                        >
                                            🌾 Issue Input Credit
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Loan Approval Modal */}
            {selectedFarmer && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center z-50 p-4">
                    <div className="bg-slate-900 border border-emerald-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 text-white">
                        <h3 className="text-lg font-black text-white text-center italic">Issue Agrovet Input Loan for {selectedFarmer.farmerName}</h3>
                        <p className="text-xs text-slate-300 text-center">
                            Available Credit Limit: <strong className="text-emerald-400">KES {(selectedFarmer.approvedCreditLimit - selectedFarmer.activeLoanBalance).toLocaleString()}</strong>
                        </p>
                        <div className="space-y-3">
                            <input
                                type="number"
                                placeholder="Loan Amount for Fertilizer/Seeds (KES)"
                                value={loanAmount}
                                onChange={e => setLoanAmount(e.target.value)}
                                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <button onClick={() => setSelectedFarmer(null)} className="flex-1 py-3 bg-slate-800 text-slate-400 rounded-xl text-xs font-black uppercase">Cancel</button>
                            <button onClick={issueAgrovetLoan} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-black uppercase">Approve Credit Loan</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
