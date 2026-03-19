
import React, { useState, useMemo } from 'react';
import { 
    User, 
    CoopCollection, 
    SaccoAccount, 
    CoopMonthlyPayout, 
    CoopAgrovetSales 
} from '../../types';
import { 
    LayoutDashboard, 
    ClipboardList, 
    Wallet, 
    FileText, 
    ShoppingBag,
    Bell,
    Settings,
    LogOut,
    TrendingUp,
    Droplets,
    ChevronRight,
    ArrowUpRight,
    CreditCard
} from 'lucide-react';

interface FarmerPortalProps {
    currentUser: User;
    collections: CoopCollection[];
    saccoAccounts: SaccoAccount[];
    payouts: CoopMonthlyPayout[];
    agrovetSales: CoopAgrovetSales[];
    onLogout: () => void;
}

export const FarmerPortal: React.FC<FarmerPortalProps> = ({
    currentUser,
    collections = [],
    saccoAccounts = [],
    payouts = [],
    agrovetSales = [],
    onLogout
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'collections' | 'sacco' | 'agrovet' | 'statements'>('dashboard');

    const stats = useMemo(() => {
        const totalQty = collections.reduce((sum, c) => sum + Number(c.quantity), 0);
        const saccoBalance = saccoAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
        const latestPayout = payouts.sort((a, b) => b.monthYear.localeCompare(a.monthYear))[0];
        
        return {
            totalQty,
            saccoBalance,
            lastMonthNet: latestPayout ? latestPayout.netAmount : 0,
            pendingCredit: agrovetSales.filter(s => s.paymentStatus === 'credit').reduce((sum, s) => sum + s.amount, 0)
        };
    }, [collections, saccoAccounts, payouts, agrovetSales]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans flex">
            {/* Sidebar */}
            <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 hidden lg:flex flex-col p-8 h-screen sticky top-0">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 dark:shadow-none">
                        <Droplets className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white">Farmer Portal</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Coop Registry</p>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                        { id: 'collections', label: 'Collections', icon: <ClipboardList className="w-4 h-4" /> },
                        { id: 'sacco', label: 'SACCO Wallet', icon: <Wallet className="w-4 h-4" /> },
                        { id: 'agrovet', label: 'Store Credit', icon: <ShoppingBag className="w-4 h-4" /> },
                        { id: 'statements', label: 'Statements', icon: <FileText className="w-4 h-4" /> }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                activeTab === item.id 
                                ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800' 
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            {item.icon}
                            {item.label}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto space-y-4">
                    <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-6 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/20 blur-3xl rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-[9px] font-bold text-indigo-300 uppercase tracking-widest mb-4">Total Earnings</p>
                        <h3 className="text-xl font-black tracking-tighter mb-1">KES {stats.lastMonthNet.toLocaleString()}</h3>
                        <p className="text-[9px] text-slate-400 font-medium">Last Month Payout</p>
                    </div>

                    <button 
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                    >
                        <LogOut className="w-4 h-4" />
                        Log Out
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 p-6 lg:p-12 overflow-y-auto">
                {/* Top Bar */}
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1 text-glow">Welcome Back</p>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                            {currentUser.name} 
                            <span className="text-xs bg-emerald-100 text-emerald-600 px-3 py-1 rounded-full uppercase tracking-widest font-black">Verified</span>
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-slate-500 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 font-black shadow-inner border border-white">
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                </div>

                {activeTab === 'dashboard' && (
                    <div className="space-y-10 animate-fade-in-up">
                        {/* Highlights Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all duration-500">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-6 font-black border border-blue-100 dark:border-blue-800">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Quantity</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {stats.totalQty.toLocaleString()} <span className="text-xs text-slate-400 font-bold ml-1">Units</span>
                                </h3>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all duration-500">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 font-black border border-indigo-100 dark:border-indigo-800">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SACCO Balance</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    KES {stats.saccoBalance.toLocaleString()}
                                </h3>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all duration-500">
                                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 mb-6 font-black border border-orange-100 dark:border-orange-800">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Credit</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    KES {stats.pendingCredit.toLocaleString()}
                                </h3>
                            </div>

                            <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden scroll-reveal">
                                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>
                                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-6">Active Savings Account</p>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-[9px] font-bold text-white/50 uppercase mb-1">Acc No.</p>
                                        <p className="text-lg font-black tracking-widest">**** 8291</p>
                                    </div>
                                    <CreditCard className="w-8 h-8 opacity-50" />
                                </div>
                            </div>
                        </div>

                        {/* Recent Collections */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Recent Collections</h3>
                                    <button onClick={() => setActiveTab('collections')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All Records</button>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Product</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Quantity</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {collections.slice(0, 5).map(c => (
                                                <tr key={c.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-4 px-8 text-sm font-bold text-slate-700 dark:text-slate-300">{c.collectionDate}</td>
                                                    <td className="py-4 px-8 text-sm font-medium text-slate-600 dark:text-slate-400">{c.productType}</td>
                                                    <td className="py-4 px-8 text-sm font-black text-slate-900 dark:text-white">{c.quantity} {c.unit}</td>
                                                    <td className="py-4 px-8">
                                                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-[9px] font-black uppercase tracking-tighter rounded-full">Confirmed</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {collections.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No collection records found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Account Actions</h3>
                                <div className="space-y-4">
                                    <button className="w-full bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-indigo-500 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600">
                                                <Wallet className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Request Loan</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Based on Shares</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 transform group-hover:translate-x-1 transition-all" />
                                    </button>

                                    <button className="w-full bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:border-orange-500 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600">
                                                <ShoppingBag className="w-6 h-6" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">Order Supplies</p>
                                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Store Credit Link</p>
                                            </div>
                                        </div>
                                        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-orange-500 transform group-hover:translate-x-1 transition-all" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'collections' && (
                    <div className="animate-fade-in space-y-8">
                         <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Full Collection History</h3>
                         <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                            <table className="w-full text-left font-medium">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Time</th>
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Product / Type</th>
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</th>
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Quality Grade</th>
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {collections.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-5 px-10 text-slate-600 dark:text-slate-400">{c.collectionDate}</td>
                                            <td className="py-5 px-10 font-bold text-slate-900 dark:text-white">{c.productType}</td>
                                            <td className="py-5 px-10 font-black text-indigo-600">{c.quantity} {c.unit}</td>
                                            <td className="py-5 px-10"><span className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">{c.qualityGrade || 'A'}</span></td>
                                            <td className="py-5 px-10">
                                                <span className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px]">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                    Verified
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                         </div>
                    </div>
                )}

                {activeTab === 'sacco' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">SACCO Transactions</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {saccoAccounts.map(acc => (
                                 <div key={acc.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 p-8">
                                         <ArrowUpRight className="w-10 h-10 text-slate-100 dark:text-slate-800 transition-colors group-hover:text-indigo-500" />
                                     </div>
                                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{acc.accountType} ACCOUNT</p>
                                     <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">KES {acc.balance.toLocaleString()}</h4>
                                     <div className="flex gap-4">
                                         <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full">Interest: 8.5% p.a</span>
                                         <span className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-[9px] font-black uppercase tracking-widest rounded-full">{acc.status}</span>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};
