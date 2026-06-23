import React, { useState, useMemo, useEffect } from 'react';
import { 
    LayoutDashboard, School, Settings, Wallet, LogOut, Plus, 
    Search, Filter, CheckCircle2, AlertCircle, Info, ArrowRight, Sparkles
} from 'lucide-react';
import { 
    ArrowPathIcon, ChevronRightIcon, UserIcon, MapPinIcon 
} from './icons';
import { 
    User, Institution, Role, NGCdfFund, NGCdfBursary, ActivityLog 
} from '../types';
import { apiService } from '../services/apiService';

interface ConstituencyAdminViewProps {
    currentUser: User;
    institutions: Institution[];
    users: User[];
    onLogout: () => void;
    onLogAction?: (action: string) => void;
}

export const ConstituencyAdminView: React.FC<ConstituencyAdminViewProps> = ({
    currentUser,
    institutions = [],
    users = [],
    onLogout,
    onLogAction
}) => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [ngCdfFunds, setNgCdfFunds] = useState<NGCdfFund[]>([]);
    const [ngCdfBursaries, setNgCdfBursaries] = useState<NGCdfBursary[]>([]);
    const [isLoadingNgCdf, setIsLoadingNgCdf] = useState(false);

    // Form states
    const [ngCdfFormFY, setNgCdfFormFY] = useState('2025/2026');
    const [ngCdfFormBudget, setNgCdfFormBudget] = useState('');
    const [filterSearch, setFilterSearch] = useState('');

    // Constituency identifier from user session (e.g. 'Kigumo')
    const myConstituency = currentUser.institutionId || 'Kigumo';

    const fetchNgCdfData = async () => {
        setIsLoadingNgCdf(true);
        try {
            // Fetch records from backend.
            // If offline/local, the custom apiService filter maps constituencyId/constituencyName.
            const [funds, applications] = await Promise.all([
                apiService.fetchModuleRecords<any>('ng_cdf_funds', myConstituency).catch(() => []),
                apiService.fetchModuleRecords<any>('ng_cdf_bursaries', myConstituency).catch(() => [])
            ]);
            
            // Apply a secondary client-side check to guarantee strict constituency scoping
            const filteredFunds = (funds || []).filter(
                (f: any) => f.constituencyName?.toLowerCase() === myConstituency.toLowerCase() || 
                           f.constituencyId?.toLowerCase() === myConstituency.toLowerCase()
            );
            const filteredBursaries = (applications || []).filter(
                (b: any) => b.constituencyName?.toLowerCase() === myConstituency.toLowerCase()
            );

            setNgCdfFunds(filteredFunds);
            setNgCdfBursaries(filteredBursaries);
        } catch (e) {
            console.error("Failed to fetch NG-CDF data:", e);
        } finally {
            setIsLoadingNgCdf(false);
        }
    };

    useEffect(() => {
        fetchNgCdfData();
    }, [myConstituency]);

    const handleSaveNgCdfFund = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!ngCdfFormBudget) return;
        try {
            const budgetVal = Number(ngCdfFormBudget);
            const payload: NGCdfFund = {
                id: `ng_fund_${Date.now()}`,
                constituencyId: myConstituency,
                constituencyName: myConstituency,
                financialYear: ngCdfFormFY,
                totalBudget: budgetVal,
                allocatedAmount: 0,
                remainingAmount: budgetVal
            };
            await apiService.saveModuleRecord('ng_cdf_funds', payload);
            setNgCdfFormBudget('');
            fetchNgCdfData();
            if (onLogAction) onLogAction(`Registered NG-CDF Fund budget of KES ${budgetVal} for FY ${ngCdfFormFY}`);
            alert("NG-CDF Constituency Fund budget registered successfully!");
        } catch (err) {
            console.error("Failed to save fund:", err);
            alert("Error registering fund.");
        }
    };

    const handleUpdateBursaryStatus = async (id: string, status: 'disbursed' | 'rejected') => {
        try {
            const bur = ngCdfBursaries.find(b => b.id === id);
            if (!bur) return;
            
            const updated = {
                ...bur,
                status: status,
                vettedAt: new Date().toISOString(),
                vettedBy: currentUser.name || 'CDF Officer',
                disbursedAt: status === 'disbursed' ? new Date().toISOString() : undefined,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('ng_cdf_bursaries', updated);
            
            if (status === 'disbursed') {
                // Find budget fund matching the financial year
                const matchingFund = ngCdfFunds.find(f => f.financialYear === (bur.notes || '2025/2026')); // fallback FY mapping
                const fundToUpdate = matchingFund || ngCdfFunds[0];

                if (fundToUpdate) {
                    const allocated = (fundToUpdate.allocatedAmount || 0) + (bur.amountApproved || 0);
                    const remaining = Math.max(0, fundToUpdate.totalBudget - allocated);
                    await apiService.saveModuleRecord('ng_cdf_funds', {
                        ...fundToUpdate,
                        allocatedAmount: allocated,
                        remainingAmount: remaining
                    });
                }
            }
            
            fetchNgCdfData();
            if (onLogAction) onLogAction(`Vetted bursary application for student ${bur.studentName} as ${status}`);
            alert(`Bursary status updated to ${status}!`);
        } catch (err) {
            console.error("Failed to update status:", err);
            alert("Error updating status.");
        }
    };

    // Filtered lists
    const constituencyInstitutions = useMemo(() => {
        return institutions.filter(inst => 
            inst.constituency?.toLowerCase() === myConstituency.toLowerCase()
        );
    }, [institutions, myConstituency]);

    const filteredBursariesList = useMemo(() => {
        if (!filterSearch) return ngCdfBursaries;
        return ngCdfBursaries.filter(b => 
            b.studentName.toLowerCase().includes(filterSearch.toLowerCase()) ||
            b.institutionName.toLowerCase().includes(filterSearch.toLowerCase()) ||
            (b.chequeNumber || '').toLowerCase().includes(filterSearch.toLowerCase())
        );
    }, [ngCdfBursaries, filterSearch]);

    return (
        <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
            {/* Sidebar */}
            <aside className="fixed left-0 top-0 bottom-0 w-72 bg-slate-900 text-white p-6 flex flex-col z-50">
                <div className="flex items-center gap-3 mb-10 px-2">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/30 text-white font-black text-lg">
                        C
                    </div>
                    <div>
                        <h1 className="text-sm font-black uppercase tracking-tight leading-none text-slate-100">NG-CDF Office</h1>
                        <p className="text-[11px] font-bold text-indigo-400 mt-1 uppercase tracking-wider">
                            {myConstituency}
                        </p>
                    </div>
                </div>

                <nav className="flex-1 space-y-2">
                    <button
                        onClick={() => setActiveTab('dashboard')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'dashboard'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <LayoutDashboard className="w-4 h-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => setActiveTab('institutions')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'institutions'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <School className="w-4 h-4" />
                        Constituency Schools
                        <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full font-mono">
                            {constituencyInstitutions.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('funds')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'funds'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <Wallet className="w-4 h-4" />
                        Allocated Budgets
                        <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full font-mono">
                            {ngCdfFunds.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('vetting')}
                        className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest ${
                            activeTab === 'vetting'
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <CheckCircle2 className="w-4 h-4" />
                        Vetting Board
                        <span className="ml-auto bg-black/20 text-white text-[10px] py-0.5 px-2 rounded-full font-mono">
                            {ngCdfBursaries.filter(b => b.status === 'pending' || b.status === 'vetted').length}
                        </span>
                    </button>
                </nav>

                <div className="pt-6 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-2 mb-4">
                        <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 text-indigo-300 font-bold text-sm uppercase">
                            {currentUser.name?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold truncate text-slate-100">{currentUser.name}</p>
                            <p className="text-[10px] text-slate-500 truncate">{currentUser.email}</p>
                        </div>
                    </div>
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/20 hover:text-red-400 text-slate-400 transition-all text-xs font-black uppercase tracking-widest"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="ml-72 flex-1 p-8 overflow-y-auto min-h-screen">
                {activeTab === 'dashboard' && (
                    <div className="space-y-6">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">
                                {myConstituency} constituency dashboard
                            </h2>
                            <p className="text-slate-500 font-medium">
                                Manage independent Constituency Development Fund (NG-CDF) allocations and clear student bursary vouchers.
                            </p>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-blue-50 text-indigo-600 rounded-xl">
                                        <Wallet className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Budget</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900">
                                    KES {ngCdfFunds.reduce((sum, f) => sum + (f.totalBudget || 0), 0).toLocaleString()}
                                </h3>
                                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Seeded limits</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                                        <CheckCircle2 className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cleared Cheques</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-950">
                                    KES {ngCdfBursaries.filter(b => b.status === 'disbursed').reduce((sum, b) => sum + (b.amountApproved || 0), 0).toLocaleString()}
                                </h3>
                                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Disbursed to schools</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
                                        <AlertCircle className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vetting Pipeline</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 font-mono">
                                    {ngCdfBursaries.filter(b => b.status === 'pending' || b.status === 'vetted').length}
                                </h3>
                                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Pending approval</p>
                            </div>

                            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                                        <School className="w-5 h-5" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Schools</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-900 font-mono">
                                    {constituencyInstitutions.length}
                                </h3>
                                <p className="text-slate-500 font-bold uppercase text-[9px] tracking-widest mt-1">Constituency registry</p>
                            </div>
                        </div>

                        {/* Recent pipeline action */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-6">
                            <div className="lg:col-span-2 bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-slate-900">Vetting board snippet</h3>
                                    <button 
                                        onClick={() => setActiveTab('vetting')} 
                                        className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5"
                                    >
                                        Vette All Applications <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="divide-y divide-slate-100">
                                    {ngCdfBursaries.slice(0, 5).length === 0 ? (
                                        <div className="py-8 text-center text-slate-400 text-xs font-bold uppercase tracking-wider">
                                            No recent applications reported
                                        </div>
                                    ) : (
                                        ngCdfBursaries.slice(0, 5).map(bur => (
                                            <div key={bur.id} className="py-4 flex justify-between items-center">
                                                <div>
                                                    <h4 className="text-xs font-black uppercase text-slate-900">{bur.studentName}</h4>
                                                    <p className="text-[10px] text-slate-400 mt-0.5">{bur.institutionName} • Cheque: {bur.chequeNumber || '—'}</p>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="text-xs font-bold text-slate-800">KES {bur.amountApproved?.toLocaleString()}</span>
                                                    <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                        bur.status === 'disbursed' ? 'bg-green-100 text-green-700' :
                                                        bur.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                    }`}>
                                                        {bur.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-slate-900 rounded-[2rem] p-8 text-white flex flex-col justify-between">
                                <div>
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-400 font-mono">Consolidated Budget</span>
                                    <h3 className="text-2xl font-black mt-2">
                                        KES {ngCdfFunds.reduce((sum, f) => sum + (f.remainingAmount || 0), 0).toLocaleString()}
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-medium mt-1">Remaining balance across all financial years</p>
                                </div>
                                <div className="space-y-4 mt-8">
                                    <button 
                                        onClick={() => setActiveTab('funds')}
                                        className="w-full py-3 bg-white text-indigo-600 hover:bg-slate-100 rounded-xl text-xs font-black uppercase tracking-wider text-center transition-colors"
                                    >
                                        Allocate Budget
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'institutions' && (
                    <div className="space-y-6">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Schools & Institutions</h2>
                            <p className="text-slate-500 font-medium">Educational centers registered under the {myConstituency} constituency office scope.</p>
                        </div>

                        <div className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">School Name</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Type / Category</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Contact Info</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">SubCounty</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {constituencyInstitutions.length === 0 ? (
                                            <tr>
                                                <td colSpan={4} className="py-6 text-center text-xs text-slate-400 font-medium">No schools configured under {myConstituency} yet.</td>
                                            </tr>
                                        ) : (
                                            constituencyInstitutions.map(inst => (
                                                <tr key={inst.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-4">
                                                        <div className="text-xs font-bold text-slate-900 uppercase">{inst.name}</div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">Code: {inst.institutionCode || inst.id}</div>
                                                    </td>
                                                    <td className="py-4 px-4 text-xs text-slate-600 font-medium">
                                                        {inst.institutionType} — {inst.category || 'General'}
                                                    </td>
                                                    <td className="py-4 px-4">
                                                        <div className="text-xs text-slate-700 font-semibold">{inst.email}</div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">{inst.phoneNumber}</div>
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-medium text-slate-600">
                                                        {inst.subCounty || '—'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'funds' && (
                    <div className="space-y-6">
                        <div className="mb-8">
                            <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">NG-CDF Budgets</h2>
                            <p className="text-slate-500 font-medium">Manage yearly funding limits allocated to the constituency development funds.</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6 h-fit">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Allocate Fund Budget</h3>
                                    <p className="text-xs text-slate-400 font-medium mt-1">Define budget envelopes per financial year.</p>
                                </div>

                                <form onSubmit={handleSaveNgCdfFund} className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Constituency</label>
                                        <input 
                                            type="text" 
                                            disabled 
                                            value={myConstituency}
                                            className="w-full px-4 py-3 bg-slate-100 border-2 border-transparent rounded-xl outline-none font-bold text-slate-500 text-sm cursor-not-allowed"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Financial Year</label>
                                        <select
                                            value={ngCdfFormFY}
                                            onChange={e => setNgCdfFormFY(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                        >
                                            <option value="2025/2026">2025/2026</option>
                                            <option value="2026/2027">2026/2027</option>
                                            <option value="2027/2028">2027/2028</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Allocated Budget (KES)</label>
                                        <input 
                                            type="number" 
                                            placeholder="0.00" 
                                            required
                                            value={ngCdfFormBudget}
                                            onChange={e => setNgCdfFormBudget(e.target.value)}
                                            className="w-full px-4 py-3 bg-slate-50 border-2 border-transparent focus:border-indigo-600 rounded-xl outline-none font-bold text-slate-700 text-sm"
                                        />
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition-all"
                                    >
                                        Register Allocation
                                    </button>
                                </form>
                            </div>

                            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm h-fit">
                                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight mb-4">Constituency Budgets</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider">Financial Year</th>
                                                <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Total Budget</th>
                                                <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Allocated</th>
                                                <th className="py-3 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Remaining</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {ngCdfFunds.length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="py-4 text-xs text-slate-400 font-medium">No budgets initialized for {myConstituency} yet.</td>
                                                </tr>
                                            ) : (
                                                ngCdfFunds.map(fund => (
                                                    <tr key={fund.id}>
                                                        <td className="py-3 text-xs font-bold text-slate-800">{fund.financialYear}</td>
                                                        <td className="py-3 text-xs text-right font-bold text-slate-700">KES {fund.totalBudget?.toLocaleString()}</td>
                                                        <td className="py-3 text-xs text-right text-slate-500">KES {fund.allocatedAmount?.toLocaleString() || 0}</td>
                                                        <td className="py-3 text-xs text-right font-black text-indigo-600">KES {fund.remainingAmount?.toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'vetting' && (
                    <div className="space-y-6">
                        <div className="mb-8 flex justify-between items-end">
                            <div>
                                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900">Vetting Board & Pipeline</h2>
                                <p className="text-slate-500 font-medium">Verify, approve, or reject student bursary applications linked to this constituency.</p>
                            </div>
                            <div className="relative w-64">
                                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search student or school..."
                                    value={filterSearch}
                                    onChange={e => setFilterSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl outline-none font-medium text-xs text-slate-700"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Student</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Institution</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider">Cheque #</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Amount</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-center">Status</th>
                                            <th className="py-3 px-4 text-[10px] font-black uppercase text-slate-400 tracking-wider text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredBursariesList.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-6 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">No applications reported in this queue.</td>
                                            </tr>
                                        ) : (
                                            filteredBursariesList.map(bur => (
                                                <tr key={bur.id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="py-4 px-4">
                                                        <div className="text-xs font-bold text-slate-900 uppercase">{bur.studentName}</div>
                                                        <div className="text-[10px] text-slate-400 mt-0.5">Applied: {bur.appliedAt ? new Date(bur.appliedAt).toLocaleDateString() : 'Recent'}</div>
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-medium text-slate-600">
                                                        {bur.institutionName}
                                                    </td>
                                                    <td className="py-4 px-4 text-xs font-mono text-indigo-600">
                                                        {bur.chequeNumber || '—'}
                                                    </td>
                                                    <td className="py-4 px-4 text-xs text-right font-black text-slate-800">
                                                        KES {bur.amountApproved?.toLocaleString()}
                                                    </td>
                                                    <td className="py-4 px-4 text-center">
                                                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                                                            bur.status === 'disbursed' || bur.status === 'approved' ? 'bg-green-100 text-green-700' :
                                                            bur.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                            {bur.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-4 text-right">
                                                        {bur.status !== 'disbursed' && bur.status !== 'rejected' ? (
                                                            <div className="flex gap-2 justify-end">
                                                                <button 
                                                                    onClick={() => handleUpdateBursaryStatus(bur.id, 'disbursed')}
                                                                    className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                                                                >
                                                                    Approve
                                                                </button>
                                                                <button 
                                                                    onClick={() => handleUpdateBursaryStatus(bur.id, 'rejected')}
                                                                    className="px-3 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors"
                                                                >
                                                                    Reject
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="text-[10px] text-slate-400 font-medium">
                                                                Cleared by {bur.vettedBy || 'CDF Officer'}
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
