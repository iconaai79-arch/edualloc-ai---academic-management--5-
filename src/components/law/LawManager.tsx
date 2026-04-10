import React, { useState, useMemo } from 'react';
import { 
    User, 
    LawClient, 
    LawMatter, 
    LawDocument, 
    LawTimeEntry, 
    LawInvoice, 
    LawTrustTransaction,
    Institution
} from '../../types';
import { 
    BriefcaseIcon as Briefcase, 
    UsersIcon as Users, 
    FileTextIcon as FileText, 
    ClockIcon as Clock, 
    CreditCardIcon as CreditCard, 
    ShieldCheckIcon as ShieldCheck,
    TrendingUpIcon as TrendingUp,
    PlusIcon as Plus,
    SearchIcon as Search,
    FilterIcon as Filter,
    CalendarDaysIcon as Calendar,
    AlertTriangleIcon as AlertIcon,
    ChevronRightIcon as ChevronRight,
    ArrowUpRightIcon as ArrowUpRight,
    WalletIcon as Wallet,
    CheckCircleIcon as CheckCircle,
    XIcon as X
} from '../icons';

interface LawManagerProps {
    currentUser: User;
    currentInstitution: Institution | null;
    clients: LawClient[];
    matters: LawMatter[];
    documents: LawDocument[];
    timeEntries: LawTimeEntry[];
    invoices: LawInvoice[];
    trustTransactions: LawTrustTransaction[];
    users: User[];
    onAddClient: (data: Partial<LawClient>) => Promise<void>;
    onAddMatter: (data: Partial<LawMatter>) => Promise<void>;
    onAddTimeEntry: (data: Partial<LawTimeEntry>) => Promise<void>;
    onAddTrustTransaction: (data: Partial<LawTrustTransaction>) => Promise<void>;
    onAddInvoice: (data: Partial<LawInvoice>) => Promise<void>;
    onUpdateMatter: (id: string, data: Partial<LawMatter>) => Promise<void>;
}

export const LawManager: React.FC<LawManagerProps> = ({
    currentUser,
    currentInstitution,
    clients = [],
    matters = [],
    documents = [],
    timeEntries = [],
    invoices = [],
    trustTransactions = [],
    users = [],
    onAddClient,
    onAddMatter,
    onAddTimeEntry,
    onAddTrustTransaction,
    onAddInvoice,
    onUpdateMatter
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'matters' | 'clients' | 'billing' | 'accounting' | 'conflicts'>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [isAddingClient, setIsAddingClient] = useState(false);
    const [isAddingMatter, setIsAddingMatter] = useState(false);
    const [isAddingTime, setIsAddingTime] = useState(false);
    const [isAddingTrustTx, setIsAddingTrustTx] = useState(false);

    const stats = useMemo(() => {
        const activeMatters = matters.filter(m => m.status === 'open').length;
        const totalBilled = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
        const trustBalance = trustTransactions.reduce((sum, t) => sum + (t.transactionType === 'deposit' ? t.amount : -t.amount), 0);
        const unbilledMinutes = timeEntries.filter(t => t.billingStatus === 'unbilled').reduce((sum, t) => sum + t.durationMinutes, 0);

        return {
            activeMatters,
            totalBilled,
            trustBalance,
            unbilledHours: (unbilledMinutes / 60).toFixed(1)
        };
    }, [matters, invoices, trustTransactions, timeEntries]);

    const filteredMatters = useMemo(() => {
        return matters.filter(m => 
            m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
            m.caseNumber?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [matters, searchQuery]);

    const getClientName = (id: string) => clients.find(c => c.id === id)?.name || 'Unknown Client';
    const getStaffName = (id: string) => users.find(u => u.id === id)?.name || 'Unknown Staff';

    return (
        <div className="flex h-screen bg-[#F8FAFC] dark:bg-slate-950 font-sans overflow-hidden">
            {/* Sidebar */}
            <aside className={`${isSidebarOpen ? 'w-72' : 'w-24'} bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-all duration-500 flex flex-col p-6 z-[100]`}>
                <div className="flex items-center gap-4 mb-12 px-2">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20 shrink-0">
                        <ShieldCheck className="w-7 h-7" />
                    </div>
                    {isSidebarOpen && (
                        <div className="animate-fade-in whitespace-nowrap">
                            <h2 className="text-[13px] font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none mb-1">Elite Legal</h2>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Management Pro</p>
                        </div>
                    )}
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: 'dashboard', label: 'Command Center', icon: <TrendingUp className="w-5 h-5" /> },
                        { id: 'matters', label: 'Matter Lifecycle', icon: <Briefcase className="w-5 h-5" /> },
                        { id: 'clients', label: 'Client Vault', icon: <Users className="w-5 h-5" /> },
                        { id: 'billing', label: 'Time & Invoicing', icon: <CreditCard className="w-5 h-5" /> },
                        { id: 'accounting', label: 'Trust Accounting', icon: <Wallet className="w-5 h-5" /> },
                        { id: 'conflicts', label: 'Conflict Check', icon: <ShieldCheck className="w-5 h-5" /> }
                    ].map(item => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id as any)}
                            className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all duration-300 relative group ${
                                activeTab === item.id 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                                : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                            }`}
                        >
                            <div className={`${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'} transition-transform duration-300`}>
                                {item.icon}
                            </div>
                            {isSidebarOpen && <span className="text-[11px] font-black uppercase tracking-widest">{item.label}</span>}
                            {activeTab === item.id && isSidebarOpen && (
                                <div className="absolute right-4 w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            )}
                        </button>
                    ))}
                </nav>

                <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800 text-center">
                    <button 
                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                    >
                        {isSidebarOpen ? <X className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    </button>
                    {isSidebarOpen && (
                        <div className="mt-8 p-6 bg-slate-950 rounded-[2rem] text-left relative overflow-hidden group">
                           <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 blur-3xl rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-700"></div>
                           <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-4">Firm Security</p>
                           <h4 className="text-sm font-black text-white mb-1">Encrypted Vault</h4>
                           <p className="text-[10px] text-slate-500 font-medium">All legal records are secured globally.</p>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="h-24 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-12 shrink-0 z-[90]">
                   <div className="flex items-center gap-12 flex-1">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Legal Workspace</p>
                            <h1 className="text-2xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">
                                {activeTab.replace('_', ' ')}
                            </h1>
                        </div>

                        <div className="hidden md:flex flex-1 max-w-md relative group">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search matters, clients, or documents..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 pl-14 pr-6 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                            />
                        </div>
                   </div>

                   <div className="flex items-center gap-6">
                        <button className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm text-slate-400 hover:text-indigo-600 hover:border-indigo-100 transition-all relative">
                            <ShieldCheck className="w-5 h-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-800"></span>
                        </button>
                        <div className="flex items-center gap-4 bg-white dark:bg-slate-800 p-2 pr-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center text-indigo-600 font-black shadow-inner">
                                {currentUser.name.charAt(0)}
                            </div>
                            <div className="hidden sm:block">
                                <p className="text-[11px] font-black text-slate-900 dark:text-white leading-tight uppercase">{currentUser.name}</p>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{currentUser.role.replace('_', ' ')}</p>
                            </div>
                        </div>
                   </div>
                </header>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-12 scrollbar-hide">
                    {activeTab === 'dashboard' && (
                        <div className="space-y-12 animate-fade-in-up">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                {[
                                    { label: 'Active Matters', value: stats.activeMatters, icon: <Briefcase />, color: 'indigo', trend: '+2 this week' },
                                    { label: 'Unbilled Hours', value: `${stats.unbilledHours}h`, icon: <Clock />, color: 'amber', trend: 'KES 450k pending' },
                                    { label: 'Trust Balance', value: `KES ${(stats.trustBalance / 1000).toFixed(0)}k`, icon: <Wallet />, color: 'emerald', trend: 'Secure Isolation' },
                                    { label: 'Total Revenue', value: `KES ${(stats.totalBilled / 1000000).toFixed(1)}M`, icon: <TrendingUp />, color: 'blue', trend: '+12% vs last month' }
                                ].map((stat, i) => (
                                    <div key={i} className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-2xl hover:scale-[1.02] transition-all duration-500">
                                        <div className={`w-14 h-14 bg-${stat.color}-50 dark:bg-${stat.color}-900/30 rounded-2xl flex items-center justify-center text-${stat.color}-600 mb-6 font-black border border-${stat.color}-100 dark:border-${stat.color}-800 group-hover:rotate-6 transition-transform`}>
                                            {stat.icon}
                                        </div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{stat.label}</p>
                                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">{stat.value}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[9px] font-black uppercase px-3 py-1 bg-${stat.color}-50 dark:bg-${stat.color}-900/40 text-${stat.color}-600 rounded-full tracking-tighter`}>
                                                {stat.trend}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                                {/* Recent Matters */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="flex items-center justify-between px-2">
                                        <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Priority Matters</h3>
                                        <button onClick={() => setActiveTab('matters')} className="text-[11px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All Lifecycle</button>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                    <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Matter / Case No.</th>
                                                    <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Client</th>
                                                    <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                    <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Lead Council</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                {matters.slice(0, 5).map(m => (
                                                    <tr key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="py-6 px-10">
                                                            <p className="text-sm font-black text-slate-900 dark:text-white mb-0.5">{m.title}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{m.caseNumber || 'Internal Ref'}</p>
                                                        </td>
                                                        <td className="py-6 px-10 text-[11px] font-black text-indigo-600 uppercase">{getClientName(m.clientId)}</td>
                                                        <td className="py-6 px-10">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                                m.status === 'open' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {m.status}
                                                            </span>
                                                        </td>
                                                        <td className="py-6 px-10">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black">
                                                                    {getStaffName(m.managerId).charAt(0)}
                                                                </div>
                                                                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">{getStaffName(m.managerId)}</span>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {matters.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="py-24 text-center">
                                                            <Briefcase className="w-12 h-12 text-slate-200 mx-auto mb-6" />
                                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No active matters found</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                {/* Task Command Center */}
                                <div className="space-y-8">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Compliance Alert</h3>
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-8 rounded-[3rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-all">
                                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                                            <ShieldCheck className="w-10 h-10 text-white/30 mb-8" />
                                            <h4 className="text-2xl font-black tracking-tighter mb-2">Conflict Check</h4>
                                            <p className="text-xs text-white/70 font-medium mb-8 leading-relaxed">Run a secure screening across the whole database before onboarding new clients.</p>
                                            <button 
                                                onClick={() => setActiveTab('conflicts')}
                                                className="w-full bg-white text-indigo-600 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-900/20 active:scale-95 transition-all"
                                            >
                                                Start Screening
                                            </button>
                                        </div>

                                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6">
                                            <div className="flex items-center justify-between">
                                                <h4 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Immediate Actions</h4>
                                                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                                            </div>
                                            {[
                                                { label: 'Waitangi Tribunal Briefing', client: 'Oceania Corp', time: 'Overdue 2h' },
                                                { label: 'Draft Lease Agreement', client: 'Summit Estates', time: 'Due today' }
                                            ].map((task, i) => (
                                                <div key={i} className="flex items-center gap-4 p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-2xl transition-all group">
                                                    <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/30 rounded-xl flex items-center justify-center text-rose-600 group-hover:rotate-12 transition-transform">
                                                        <Clock className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-tighter">{task.label}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 flex items-center gap-2">
                                                            <span className="text-indigo-500">{task.client}</span>
                                                            <span className="text-rose-500">• {task.time}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'matters' && (
                        <div className="animate-fade-in space-y-12">
                            <div className="flex justify-between items-end px-2">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Portfolio Control</p>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Matter Lifecycle Management</h2>
                                </div>
                                <button 
                                    onClick={() => setIsAddingMatter(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3"
                                >
                                    <Plus className="w-4 h-4" />
                                    Initiate New Matter
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredMatters.map(m => (
                                    <div key={m.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-indigo-500 transition-all">
                                        <div className="absolute top-0 right-0 p-8">
                                            <ArrowUpRight className="w-8 h-8 text-slate-100 dark:text-slate-800 transition-colors group-hover:text-indigo-500" />
                                        </div>
                                        <div className="flex items-center gap-3 mb-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                                m.priority === 'urgent' ? 'bg-rose-100 text-rose-600' :
                                                m.priority === 'high' ? 'bg-orange-100 text-orange-600' : 'bg-slate-100 text-slate-600'
                                            }`}>
                                                {m.priority} Priority
                                            </span>
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{m.practiceArea}</span>
                                        </div>
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mb-2 pr-12">{m.title}</h4>
                                        <p className="text-[11px] font-black text-indigo-600 uppercase mb-8">{getClientName(m.clientId)}</p>
                                        
                                        <div className="pt-8 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Fixed Fee</p>
                                                <p className="text-sm font-black text-slate-900 dark:text-white">KES 250,000</p>
                                            </div>
                                            <div className="flex -space-x-3">
                                                {[1, 2].map(j => (
                                                    <div key={j} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black">
                                                        U{j}
                                                    </div>
                                                ))}
                                                <div className="w-10 h-10 rounded-xl bg-indigo-600 border-4 border-white dark:border-slate-900 flex items-center justify-center text-[10px] font-black text-white">
                                                    +3
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Additional tabs will be implemented similarly */}
                </div>
            </main>

            {/* Modals for creation would go here */}
            {isAddingClient && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setIsAddingClient(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Onboard New Client</h3>
                            <button onClick={() => setIsAddingClient(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X/></button>
                        </div>
                        {/* Form content */}
                    </div>
                </div>
            )}
        </div>
    );
};
