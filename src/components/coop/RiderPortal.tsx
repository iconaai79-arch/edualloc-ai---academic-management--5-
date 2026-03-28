
import React, { useState, useMemo } from 'react';
import { 
    User, 
    CoopCollection, 
    SaccoAccount, 
    CoopRider,
    CoopMonthlyPayout
} from '../../types';
import { 
    LayoutDashboard, 
    Truck, 
    Wallet, 
    FileText, 
    Bell,
    LogOut,
    TrendingUp,
    ChevronRight,
    ArrowUpRight,
    CreditCard,
    Calendar
} from 'lucide-react';
import { CheckCircleIcon as CircleCheck } from '../icons/index';

interface RiderPortalProps {
    currentUser: User;
    rider?: CoopRider;
    collections: CoopCollection[];
    saccoAccounts: SaccoAccount[];
    payouts: CoopMonthlyPayout[];
    onLogout: () => void;
}

export const RiderPortal: React.FC<RiderPortalProps> = ({
    currentUser,
    rider,
    collections = [],
    saccoAccounts = [],
    payouts = [],
    onLogout
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'deliveries' | 'sacco' | 'statements'>('dashboard');

    const myDeliveries = useMemo(() => 
        collections.filter(c => c.riderId === currentUser.id || c.riderId === rider?.id),
    [collections, currentUser.id, rider?.id]);

    const stats = useMemo(() => {
        const totalDeliveries = myDeliveries.length;
        const totalQty = myDeliveries.reduce((sum, c) => sum + Number(c.quantity), 0);
        const saccoBalance = saccoAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
        
        // Assume a base commission or look at payouts
        // For now, we'll show delivery count as primary stat
        return {
            totalDeliveries,
            totalQty,
            saccoBalance,
            lastMonthDeliveries: myDeliveries.filter(c => {
                if (!c.collectionDate) return false;
                const now = new Date();
                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const compareStr = lastMonth.toISOString().substring(0, 7); // YYYY-MM
                return c.collectionDate.substring(0, 7) === compareStr;
            }).length
        };
    }, [myDeliveries, saccoAccounts]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans flex">
            {/* Sidebar */}
            <aside className="w-72 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 hidden lg:flex flex-col p-8 h-screen sticky top-0">
                <div className="flex items-center gap-3 mb-12">
                    <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-200 dark:shadow-none">
                        <Truck className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-sm font-black uppercase tracking-tighter text-slate-900 dark:text-white">Rider Portal</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Logistics Division</p>
                    </div>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
                        { id: 'deliveries', label: 'My Deliveries', icon: <Truck className="w-4 h-4" /> },
                        { id: 'sacco', label: 'SACCO Wallet', icon: <Wallet className="w-4 h-4" /> },
                        { id: 'statements', label: 'Statements', icon: <FileText className="w-4 h-4" /> }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                                activeTab === item.id 
                                ? 'bg-orange-50 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800' 
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
                        <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/20 blur-3xl rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                        <p className="text-[9px] font-bold text-orange-300 uppercase tracking-widest mb-4">Total Deliveries</p>
                        <h3 className="text-xl font-black tracking-tighter mb-1">{stats.totalDeliveries}</h3>
                        <p className="text-[9px] text-slate-400 font-medium">Lifetime Achievement</p>
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
                <div className="flex justify-between items-center mb-12">
                    <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1 text-glow">Transporter Dashboard</p>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-3">
                            {currentUser.name} 
                            {rider && <span className="text-[10px] bg-orange-100 text-orange-600 px-3 py-1 rounded-full uppercase tracking-widest font-black">{rider.vehiclePlate}</span>}
                        </h1>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        <button className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-slate-500 relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                        </button>
                        <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 font-black shadow-inner border border-white">
                            {currentUser.name.charAt(0)}
                        </div>
                    </div>
                </div>

                {activeTab === 'dashboard' && (
                    <div className="space-y-10 animate-fade-in-up">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all duration-500">
                                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 mb-6 font-black border border-orange-100 dark:border-orange-800">
                                    <Truck className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deliveries</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    {stats.totalDeliveries.toLocaleString()}
                                </h3>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all duration-500">
                                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 mb-6 font-black border border-blue-100 dark:border-blue-800">
                                    <TrendingUp className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Volume</p>
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

                            <div className="bg-gradient-to-br from-orange-600 to-red-700 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
                                <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 blur-3xl rounded-full"></div>
                                <p className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-6">License Status</p>
                                <div className="flex items-end justify-between">
                                    <div>
                                        <p className="text-[9px] font-bold text-white/50 uppercase mb-1">Valid Until</p>
                                        <p className="text-lg font-black tracking-widest">31 DEC 2026</p>
                                    </div>
                                    <CircleCheck className="w-8 h-8 opacity-50" />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 space-y-6">
                                <div className="flex items-center justify-between px-2">
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter">Recent Deliveries</h3>
                                    <button onClick={() => setActiveTab('deliveries')} className="text-[10px] font-black text-orange-600 uppercase tracking-widest hover:underline">View All</button>
                                </div>
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Product</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {myDeliveries.slice(0, 5).map(c => (
                                                <tr key={c.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-4 px-8 text-sm font-bold text-slate-700 dark:text-slate-300">{c.collectionDate}</td>
                                                    <td className="py-4 px-8 text-sm font-medium text-slate-600 dark:text-slate-400">{c.productType}</td>
                                                    <td className="py-4 px-8 text-sm font-black text-slate-900 dark:text-white">{c.quantity} {c.unit}</td>
                                                    <td className="py-4 px-8">
                                                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 text-[9px] font-black uppercase tracking-tighter rounded-full">Delivered</span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {myDeliveries.length === 0 && (
                                                <tr>
                                                    <td colSpan={4} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No delivery records found</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Rider Stats</h3>
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/30 rounded-xl flex items-center justify-center text-orange-600">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency</p>
                                            <p className="text-sm font-bold text-slate-900 dark:text-white">98% Ontime</p>
                                        </div>
                                    </div>
                                    <div className="pt-6 border-t border-slate-100 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Commission Trend</p>
                                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-orange-500 w-[75%]"></div>
                                        </div>
                                        <p className="text-[9px] font-bold text-slate-400 mt-2 uppercase">75% of Monthly Target</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'deliveries' && (
                    <div className="animate-fade-in space-y-8">
                         <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Delivery Log</h3>
                         <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                            <table className="w-full text-left font-medium">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Farmer ID</th>
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Product</th>
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Quantity</th>
                                        <th className="py-6 px-10 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                    {myDeliveries.map(c => (
                                        <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                                            <td className="py-5 px-10 text-slate-600 dark:text-slate-400">{c.collectionDate}</td>
                                            <td className="py-5 px-10 font-bold text-slate-900 dark:text-white">{c.farmerId}</td>
                                            <td className="py-5 px-10 font-bold text-slate-900 dark:text-white">{c.productType}</td>
                                            <td className="py-5 px-10 font-black text-orange-600">{c.quantity} {c.unit}</td>
                                            <td className="py-5 px-10">
                                                <span className="flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px]">
                                                    <CircleCheck className="w-3.3 h-3.3" />
                                                    Confirmed
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
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">SACCO Accounts</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {saccoAccounts.map(acc => (
                                 <div key={acc.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 p-8">
                                         <ArrowUpRight className="w-10 h-10 text-slate-100 dark:text-slate-800 transition-colors group-hover:text-orange-500" />
                                     </div>
                                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{acc.accountType} ACCOUNT</p>
                                     <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">KES {acc.balance.toLocaleString()}</h4>
                                     <div className="flex gap-4">
                                         <span className="px-4 py-1.5 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[9px] font-black uppercase tracking-widest rounded-full">{acc.status}</span>
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
