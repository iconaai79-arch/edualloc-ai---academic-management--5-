import React, { useState, useMemo } from 'react';
import { 
    User, 
    LawClient, 
    LawMatter, 
    LawDocument, 
    LawTimeEntry, 
    LawInvoice, 
    LawTrustTransaction,
    Institution,
    LawAgreement,
    LawAgreementTemplate
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
    XIcon as X,
    EyeIcon
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
    agreementTemplates: LawAgreementTemplate[];
    agreements: LawAgreement[];
    onAddAgreementTemplate: (data: Partial<LawAgreementTemplate>) => Promise<void>;
    onGenerateAgreement: (data: Partial<LawAgreement>) => Promise<void>;
    onApproveAgreement: (id: string, notes: string) => Promise<void>;
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
    agreementTemplates = [],
    agreements = [],
    onAddClient,
    onAddMatter,
    onAddTimeEntry,
    onAddTrustTransaction,
    onAddInvoice,
    onUpdateMatter,
    onAddAgreementTemplate,
    onGenerateAgreement,
    onApproveAgreement
}) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'matters' | 'clients' | 'billing' | 'accounting' | 'conflicts' | 'agreements'>('dashboard');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const [isAddingClient, setIsAddingClient] = useState(false);
    const [isAddingMatter, setIsAddingMatter] = useState(false);
    const [isAddingTime, setIsAddingTime] = useState(false);
    const [isAddingTrustTx, setIsAddingTrustTx] = useState(false);
    const [isAddingInvoice, setIsAddingInvoice] = useState(false);

    // Form inputs state
    const [clientForm, setClientForm] = useState<Partial<LawClient>>({
        name: '',
        email: '',
        phone: '',
        address: '',
        clientType: 'individual'
    });

    const [matterForm, setMatterForm] = useState<Partial<LawMatter>>({
        clientId: '',
        title: '',
        description: '',
        caseNumber: '',
        practiceArea: 'Litigation',
        priority: 'medium',
        status: 'open',
        managerId: currentUser.id
    });

    const [timeForm, setTimeForm] = useState<Partial<LawTimeEntry>>({
        matterId: '',
        staffId: currentUser.id,
        activityDate: new Date().toISOString().split('T')[0],
        description: '',
        durationMinutes: 60,
        ratePerHour: 5000,
        billingStatus: 'unbilled'
    });

    const [trustForm, setTrustForm] = useState<Partial<LawTrustTransaction>>({
        clientId: '',
        matterId: '',
        amount: 0,
        transactionType: 'deposit',
        reference: ''
    });

    const [invoiceForm, setInvoiceForm] = useState<Partial<LawInvoice>>({
        matterId: '',
        clientId: '',
        invoiceNumber: '',
        totalAmount: 0,
        taxAmount: 0,
        status: 'pending',
        dueDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0]
    });

    // Conflict Check screening state
    const [conflictSearchQuery, setConflictSearchQuery] = useState('');
    const [conflictResults, setConflictResults] = useState<{
        hasConflict: boolean;
        matches: { type: 'client' | 'matter'; name: string; detail: string }[];
        checked: boolean;
    }>({ hasConflict: false, matches: [], checked: false });

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

    const handleSubmitClient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!clientForm.name) return;
        await onAddClient(clientForm);
        setIsAddingClient(false);
        setClientForm({ name: '', email: '', phone: '', address: '', clientType: 'individual' });
    };

    const handleSubmitMatter = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!matterForm.title || !matterForm.clientId) return;
        await onAddMatter(matterForm);
        setIsAddingMatter(false);
        setMatterForm({ clientId: '', title: '', description: '', caseNumber: '', practiceArea: 'Litigation', priority: 'medium', status: 'open', managerId: currentUser.id });
    };

    const handleSubmitTime = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!timeForm.matterId || !timeForm.description) return;
        await onAddTimeEntry(timeForm);
        setIsAddingTime(false);
        setTimeForm({ matterId: '', staffId: currentUser.id, activityDate: new Date().toISOString().split('T')[0], description: '', durationMinutes: 60, ratePerHour: 5000, billingStatus: 'unbilled' });
    };

    const handleSubmitTrustTx = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!trustForm.clientId || !trustForm.amount) return;
        await onAddTrustTransaction(trustForm);
        setIsAddingTrustTx(false);
        setTrustForm({ clientId: '', matterId: '', amount: 0, transactionType: 'deposit', reference: '' });
    };

    const handleSubmitInvoice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invoiceForm.clientId || !invoiceForm.matterId || !invoiceForm.totalAmount) return;
        await onAddInvoice({
            ...invoiceForm,
            invoiceNumber: invoiceForm.invoiceNumber || `INV-LAW-${Date.now().toString().slice(-6)}`
        });
        setIsAddingInvoice(false);
        setInvoiceForm({ matterId: '', clientId: '', invoiceNumber: '', totalAmount: 0, taxAmount: 0, status: 'pending', dueDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0] });
    };

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
                        { id: 'agreements', label: 'Contract Studio', icon: <FileText className="w-5 h-5" /> },
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

                    {activeTab === 'agreements' && (
                        <div className="animate-fade-in space-y-12">
                            <div className="flex justify-between items-end px-2">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Contract Studio</p>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">E-Agreement Center</h2>
                                </div>
                                <div className="flex gap-4">
                                    <button className="bg-slate-100 dark:bg-slate-800 text-slate-600 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200">
                                        Manage Templates
                                    </button>
                                    <button 
                                        onClick={() => {/* Trigger self-generation flow */}}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-3"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Self-Generate Contract
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
                                {/* Templates Section */}
                                <div className="lg:col-span-1 space-y-6">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Professional Templates</h3>
                                    <div className="space-y-4">
                                        {(agreementTemplates.length > 0 ? agreementTemplates : [
                                            { name: 'Standard Lease Agreement', category: 'Real Estate', fee: '5,000' },
                                            { name: 'Commercial Sales Contract', category: 'Commercial', fee: '15,000' },
                                            { name: 'Non-Disclosure (NDA)', category: 'General', fee: '2,500' }
                                        ]).map((t: any, i) => (
                                            <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 transition-all cursor-pointer group">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <span className="text-[8px] font-black uppercase px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-slate-500">{t.category}</span>
                                                </div>
                                                <h4 className="text-[13px] font-black text-slate-900 dark:text-white uppercase mb-1">{t.name}</h4>
                                                <p className="text-[10px] font-bold text-indigo-600">KES {t.baseFee || t.fee}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Active Agreements & Approvals */}
                                <div className="lg:col-span-3 space-y-8">
                                    <div className="flex items-center gap-6">
                                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Approvals Queue</h3>
                                        <span className="px-3 py-1 bg-amber-100 text-amber-600 rounded-full text-[9px] font-black uppercase tracking-tighter">
                                            {agreements.filter(a => a.reviewStatus === 'pending_approval').length} Pending Review
                                        </span>
                                    </div>

                                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                    <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Agreement Title</th>
                                                    <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Payment Status</th>
                                                    <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Review Status</th>
                                                    <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                {agreements.map(a => (
                                                    <tr key={a.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="py-6 px-10">
                                                            <p className="text-sm font-black text-slate-900 dark:text-white mb-0.5">{a.title}</p>
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Client: {getClientName(a.clientId)}</p>
                                                        </td>
                                                        <td className="py-6 px-10">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                                a.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                                                            }`}>
                                                                {a.paymentStatus}
                                                            </span>
                                                        </td>
                                                        <td className="py-6 px-10">
                                                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                                a.reviewStatus === 'pending_approval' ? 'bg-amber-100 text-amber-600' :
                                                                a.reviewStatus === 'approved' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {a.reviewStatus.replace('_', ' ')}
                                                            </span>
                                                        </td>
                                                        <td className="py-6 px-10">
                                                            <div className="flex items-center gap-2">
                                                                <button className="p-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl hover:text-indigo-600 transition-all">
                                                                    <EyeIcon className="w-4 h-4" />
                                                                </button>
                                                                {a.reviewStatus === 'pending_approval' && (
                                                                    <button 
                                                                        onClick={() => onApproveAgreement(a.id, 'Verified and Approved.')}
                                                                        className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-500/20"
                                                                    >
                                                                        <CheckCircle className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {agreements.length === 0 && (
                                                    <tr>
                                                        <td colSpan={4} className="py-24 text-center">
                                                            <FileText className="w-12 h-12 text-slate-200 mx-auto mb-6" />
                                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No contract generated yet</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'clients' && (
                        <div className="animate-fade-in space-y-12">
                            <div className="flex justify-between items-end px-2">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Onboard & Manage</p>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Client Vault</h2>
                                </div>
                                <button 
                                    onClick={() => setIsAddingClient(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3"
                                >
                                    <Plus className="w-4 h-4" />
                                    Onboard New Client
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Client Name</th>
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Contact Email</th>
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Phone</th>
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Address</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {clients.map(c => (
                                            <tr key={c.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-6 px-10">
                                                    <p className="text-sm font-black text-slate-900 dark:text-white">{c.name}</p>
                                                </td>
                                                <td className="py-6 px-10">
                                                    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                        c.clientType === 'corporate' ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30' : 'bg-slate-100 text-slate-600 dark:bg-slate-800'
                                                    }`}>
                                                        {c.clientType}
                                                    </span>
                                                </td>
                                                <td className="py-6 px-10 text-[11px] text-slate-600 dark:text-slate-400 font-bold">{c.email || 'N/A'}</td>
                                                <td className="py-6 px-10 text-[11px] text-slate-600 dark:text-slate-400 font-bold">{c.phone || 'N/A'}</td>
                                                <td className="py-6 px-10 text-[11px] text-slate-500 font-medium">{c.address || 'N/A'}</td>
                                            </tr>
                                        ))}
                                        {clients.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-24 text-center">
                                                    <Users className="w-12 h-12 text-slate-200 mx-auto mb-6" />
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No clients onboarded yet</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div className="animate-fade-in space-y-12">
                            <div className="flex justify-between items-end px-2">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Time Logs & Billing</p>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Time & Invoicing</h2>
                                </div>
                                <div className="flex gap-4">
                                    <button 
                                        onClick={() => setIsAddingTime(true)}
                                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-200 flex items-center gap-2"
                                    >
                                        <Clock className="w-4 h-4" />
                                        Log Hours
                                    </button>
                                    <button 
                                        onClick={() => setIsAddingInvoice(true)}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Invoice
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                <div className="space-y-6">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Time Registry</h3>
                                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                    <th className="py-6 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Activity / Matter</th>
                                                    <th className="py-6 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Duration</th>
                                                    <th className="py-6 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                {timeEntries.map(t => {
                                                    const matterTitle = matters.find(m => m.id === t.matterId)?.title || 'Unknown Matter';
                                                    return (
                                                        <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                            <td className="py-6 px-8">
                                                                <p className="text-xs font-black text-slate-900 dark:text-white">{t.description}</p>
                                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{matterTitle}</p>
                                                            </td>
                                                            <td className="py-6 px-8">
                                                                <p className="text-xs font-black text-slate-800 dark:text-slate-200">{(t.durationMinutes / 60).toFixed(1)}h</p>
                                                                <p className="text-[10px] text-slate-400 font-medium">@ KES {t.ratePerHour}/hr</p>
                                                            </td>
                                                            <td className="py-6 px-8">
                                                                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                                    t.billingStatus === 'unbilled' ? 'bg-amber-100 text-amber-600' :
                                                                    t.billingStatus === 'billed' ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {t.billingStatus}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {timeEntries.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="py-20 text-center">
                                                            <Clock className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No logged hours found</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Invoices Queue</h3>
                                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                    <th className="py-6 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Invoice No. / Client</th>
                                                    <th className="py-6 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                                    <th className="py-6 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                                {invoices.map(inv => (
                                                    <tr key={inv.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                        <td className="py-6 px-8">
                                                            <p className="text-xs font-black text-slate-900 dark:text-white">{inv.invoiceNumber}</p>
                                                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{getClientName(inv.clientId)}</p>
                                                        </td>
                                                        <td className="py-6 px-8">
                                                            <p className="text-xs font-black text-slate-800 dark:text-slate-200">KES {inv.totalAmount.toLocaleString()}</p>
                                                            {inv.dueDate && <p className="text-[10px] text-slate-400 font-medium">Due: {inv.dueDate}</p>}
                                                        </td>
                                                        <td className="py-6 px-8">
                                                            <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                                inv.status === 'paid' ? 'bg-emerald-100 text-emerald-600' :
                                                                inv.status === 'pending' ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                                                            }`}>
                                                                {inv.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {invoices.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} className="py-20 text-center">
                                                            <CreditCard className="w-10 h-10 text-slate-200 mx-auto mb-4" />
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No invoices generated yet</p>
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'accounting' && (
                        <div className="animate-fade-in space-y-12">
                            <div className="flex justify-between items-end px-2">
                                <div>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Escrow & Trust Records</p>
                                    <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Trust Accounting Ledger</h2>
                                </div>
                                <button 
                                    onClick={() => setIsAddingTrustTx(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95 flex items-center gap-3"
                                >
                                    <Plus className="w-4 h-4" />
                                    Post Trust Transaction
                                </button>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-sm max-w-md animate-fade-in-up">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Aggregate Escrow Balance</p>
                                <h3 className="text-4xl font-black text-emerald-600 tracking-tighter">KES {stats.trustBalance.toLocaleString()}</h3>
                                <p className="text-[10px] text-slate-400 mt-2 font-medium">Legally isolated and fully audited client trust funds.</p>
                            </div>

                            <div className="bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Client / Matter</th>
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                            <th className="py-6 px-10 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {trustTransactions.map(tx => {
                                            const matterTitle = matters.find(m => m.id === tx.matterId)?.title || 'General Account';
                                            return (
                                                <tr key={tx.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-6 px-10 text-xs font-bold text-slate-500">
                                                        {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString() : 'N/A'}
                                                    </td>
                                                    <td className="py-6 px-10">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white">{getClientName(tx.clientId)}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{matterTitle}</p>
                                                    </td>
                                                    <td className="py-6 px-10 text-xs text-slate-600 dark:text-slate-400 font-medium">{tx.reference || 'N/A'}</td>
                                                    <td className="py-6 px-10">
                                                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                            tx.transactionType === 'deposit' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20' :
                                                            tx.transactionType === 'disbursement' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/20' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                            {tx.transactionType}
                                                        </span>
                                                    </td>
                                                    <td className={`py-6 px-10 text-right text-sm font-black ${
                                                        tx.transactionType === 'deposit' ? 'text-emerald-600' : 'text-rose-600'
                                                    }`}>
                                                        {tx.transactionType === 'deposit' ? '+' : '-'} KES {tx.amount.toLocaleString()}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {trustTransactions.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="py-24 text-center">
                                                    <Wallet className="w-12 h-12 text-slate-200 mx-auto mb-6" />
                                                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No ledger transactions posted yet</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {activeTab === 'conflicts' && (
                        <div className="animate-fade-in space-y-12">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Ethical Screening</p>
                                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Compliance Conflict Screening</h2>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm max-w-xl space-y-6">
                                <p className="text-sm text-slate-500 font-medium">Verify that introducing a new entity or matter does not conflict with our current client database and active matter registry.</p>
                                <div className="flex gap-4">
                                    <input 
                                        type="text" 
                                        placeholder="Enter client name, counterparty, or key keyword..." 
                                        value={conflictSearchQuery}
                                        onChange={e => setConflictSearchQuery(e.target.value)}
                                        className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    />
                                    <button 
                                        onClick={() => {
                                            if (!conflictSearchQuery.trim()) return;
                                            const matches: { type: 'client' | 'matter'; name: string; detail: string }[] = [];
                                            
                                            clients.forEach(c => {
                                                if (c.name.toLowerCase().includes(conflictSearchQuery.toLowerCase())) {
                                                    matches.push({ type: 'client', name: c.name, detail: `Onboarded as ${c.clientType} client` });
                                                }
                                            });

                                            matters.forEach(m => {
                                                if (m.title.toLowerCase().includes(conflictSearchQuery.toLowerCase()) || m.description?.toLowerCase().includes(conflictSearchQuery.toLowerCase())) {
                                                    matches.push({ type: 'matter', name: m.title, detail: `Active Case Ref: ${m.caseNumber || 'Internal'}` });
                                                }
                                            });

                                            setConflictResults({
                                                hasConflict: matches.length > 0,
                                                matches,
                                                checked: true
                                            });
                                        }}
                                        className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase text-[10px] tracking-widest px-8 py-4 rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                                    >
                                        Screen Database
                                    </button>
                                </div>
                            </div>

                            {conflictResults.checked && (
                                <div className="space-y-6 max-w-xl animate-fade-in-up">
                                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest px-2">Screening Results</h3>
                                    
                                    {conflictResults.hasConflict ? (
                                        <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900 p-8 rounded-[3rem] space-y-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-rose-100 dark:bg-rose-900 rounded-2xl text-rose-600">
                                                    <AlertIcon className="w-6 h-6" />
                                                </div>
                                                <div>
                                                    <h4 className="font-black text-rose-800 dark:text-rose-200 uppercase tracking-wide leading-none mb-1">Potential Conflict Detected</h4>
                                                    <p className="text-xs text-rose-700 dark:text-rose-400 font-medium">Matches found in the client or case directory. Proceed with caution.</p>
                                                </div>
                                            </div>

                                            <div className="divide-y divide-rose-100 dark:divide-rose-900/50">
                                                {conflictResults.matches.map((m, idx) => (
                                                    <div key={idx} className="py-4 first:pt-0 last:pb-0 flex justify-between items-center">
                                                        <div>
                                                            <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{m.name}</p>
                                                            <p className="text-[10px] text-slate-500 font-medium">{m.detail}</p>
                                                        </div>
                                                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-rose-100 dark:bg-rose-900 text-rose-600 rounded-lg">{m.type}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900 p-8 rounded-[3rem] flex items-center gap-4">
                                            <div className="p-3 bg-emerald-100 dark:bg-emerald-900 rounded-2xl text-emerald-600">
                                                <CheckCircle className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-emerald-800 dark:text-emerald-200 uppercase tracking-wide leading-none mb-1">Clear to Onboard</h4>
                                                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">No conflict matches found for "{conflictSearchQuery}" in our system records.</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {/* Modals for creation */}
            {isAddingClient && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setIsAddingClient(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Onboard New Client</h3>
                            <button onClick={() => setIsAddingClient(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmitClient} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Client Name *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={clientForm.name || ''} 
                                        onChange={e => setClientForm({ ...clientForm, name: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        placeholder="Full Name / Company Name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Client Type</label>
                                    <select 
                                        value={clientForm.clientType || 'individual'} 
                                        onChange={e => setClientForm({ ...clientForm, clientType: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="individual">Individual</option>
                                        <option value="corporate">Corporate</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={clientForm.email || ''} 
                                        onChange={e => setClientForm({ ...clientForm, email: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        placeholder="client@example.com"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Phone Number</label>
                                    <input 
                                        type="text" 
                                        value={clientForm.phone || ''} 
                                        onChange={e => setClientForm({ ...clientForm, phone: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        placeholder="e.g. 0712345678"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Physical Address</label>
                                    <textarea 
                                        value={clientForm.address || ''} 
                                        onChange={e => setClientForm({ ...clientForm, address: e.target.value })}
                                        rows={3}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                        placeholder="Office location, building, street..."
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                                <button type="button" onClick={() => setIsAddingClient(false)} className="px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Onboard Client</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddingMatter && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setIsAddingMatter(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Initiate New Legal Matter</h3>
                            <button onClick={() => setIsAddingMatter(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmitMatter} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Matter Title *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={matterForm.title || ''} 
                                        onChange={e => setMatterForm({ ...matterForm, title: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        placeholder="e.g. Land Acquisition - Runda Phase 2"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Client *</label>
                                    <select 
                                        required
                                        value={matterForm.clientId || ''} 
                                        onChange={e => setMatterForm({ ...matterForm, clientId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="">Select a Client...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Case Number / Reference</label>
                                    <input 
                                        type="text" 
                                        value={matterForm.caseNumber || ''} 
                                        onChange={e => setMatterForm({ ...matterForm, caseNumber: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        placeholder="e.g. MAT-2025-001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Practice Area *</label>
                                    <select 
                                        value={matterForm.practiceArea || 'Litigation'} 
                                        onChange={e => setMatterForm({ ...matterForm, practiceArea: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="Conveyancing">Conveyancing</option>
                                        <option value="Succession">Succession</option>
                                        <option value="Litigation">Litigation</option>
                                        <option value="Corporate">Corporate</option>
                                        <option value="Family Law">Family Law</option>
                                        <option value="Commercial">Commercial</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Priority</label>
                                    <select 
                                        value={matterForm.priority || 'medium'} 
                                        onChange={e => setMatterForm({ ...matterForm, priority: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Lead Counsel</label>
                                    <select 
                                        value={matterForm.managerId || ''} 
                                        onChange={e => setMatterForm({ ...matterForm, managerId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Status</label>
                                    <select 
                                        value={matterForm.status || 'open'} 
                                        onChange={e => setMatterForm({ ...matterForm, status: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="open">Open</option>
                                        <option value="pending">Pending</option>
                                        <option value="closed">Closed</option>
                                        <option value="archived">Archived</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Description</label>
                                    <textarea 
                                        value={matterForm.description || ''} 
                                        onChange={e => setMatterForm({ ...matterForm, description: e.target.value })}
                                        rows={3}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                        placeholder="Key objectives, milestones, details..."
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                                <button type="button" onClick={() => setIsAddingMatter(false)} className="px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Initiate Matter</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddingTime && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setIsAddingTime(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Log Hours</h3>
                            <button onClick={() => setIsAddingTime(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmitTime} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Select Matter *</label>
                                    <select 
                                        required
                                        value={timeForm.matterId || ''} 
                                        onChange={e => setTimeForm({ ...timeForm, matterId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="">Choose Matter...</option>
                                        {matters.map(m => (
                                            <option key={m.id} value={m.id}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Activity Date *</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={timeForm.activityDate || ''} 
                                        onChange={e => setTimeForm({ ...timeForm, activityDate: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Duration (Minutes) *</label>
                                    <input 
                                        type="number" 
                                        required
                                        min={15}
                                        step={15}
                                        value={timeForm.durationMinutes || 60} 
                                        onChange={e => setTimeForm({ ...timeForm, durationMinutes: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Hourly Rate (KES) *</label>
                                    <input 
                                        type="number" 
                                        required
                                        min={0}
                                        value={timeForm.ratePerHour || 5000} 
                                        onChange={e => setTimeForm({ ...timeForm, ratePerHour: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Billing Status</label>
                                    <select 
                                        value={timeForm.billingStatus || 'unbilled'} 
                                        onChange={e => setTimeForm({ ...timeForm, billingStatus: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="unbilled">Unbilled</option>
                                        <option value="billed">Billed</option>
                                        <option value="waived">Waived</option>
                                        <option value="pro-bono">Pro-Bono</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Activity Description *</label>
                                    <textarea 
                                        required
                                        value={timeForm.description || ''} 
                                        onChange={e => setTimeForm({ ...timeForm, description: e.target.value })}
                                        rows={3}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all resize-none"
                                        placeholder="Briefly describe the task completed..."
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                                <button type="button" onClick={() => setIsAddingTime(false)} className="px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Log Time</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddingTrustTx && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setIsAddingTrustTx(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Post Trust Ledger Record</h3>
                            <button onClick={() => setIsAddingTrustTx(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmitTrustTx} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Client *</label>
                                    <select 
                                        required
                                        value={trustForm.clientId || ''} 
                                        onChange={e => setTrustForm({ ...trustForm, clientId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="">Select Client...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Associated Matter</label>
                                    <select 
                                        value={trustForm.matterId || ''} 
                                        onChange={e => setTrustForm({ ...trustForm, matterId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="">General Account (No Matter)</option>
                                        {matters.filter(m => !trustForm.clientId || m.clientId === trustForm.clientId).map(m => (
                                            <option key={m.id} value={m.id}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Transaction Type</label>
                                    <select 
                                        value={trustForm.transactionType || 'deposit'} 
                                        onChange={e => setTrustForm({ ...trustForm, transactionType: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="deposit">Deposit (Inflow)</option>
                                        <option value="disbursement">Disbursement (Outflow)</option>
                                        <option value="transfer">Transfer</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Amount (KES) *</label>
                                    <input 
                                        type="number" 
                                        required
                                        min={1}
                                        value={trustForm.amount || 0} 
                                        onChange={e => setTrustForm({ ...trustForm, amount: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Reference / Note *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={trustForm.reference || ''} 
                                        onChange={e => setTrustForm({ ...trustForm, reference: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        placeholder="e.g. Bank Slip Reference, Cheque No, Purpose"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                                <button type="button" onClick={() => setIsAddingTrustTx(false)} className="px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Post Transaction</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAddingInvoice && (
                <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[1000] flex items-center justify-center p-6 animate-fade-in" onClick={() => setIsAddingInvoice(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Generate Legal Invoice</h3>
                            <button onClick={() => setIsAddingInvoice(false)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 hover:text-slate-800 dark:hover:text-white"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleSubmitInvoice} className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Associated Client *</label>
                                    <select 
                                        required
                                        value={invoiceForm.clientId || ''} 
                                        onChange={e => setInvoiceForm({ ...invoiceForm, clientId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="">Select Client...</option>
                                        {clients.map(c => (
                                            <option key={c.id} value={c.id}>{c.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Associated Matter *</label>
                                    <select 
                                        required
                                        value={invoiceForm.matterId || ''} 
                                        onChange={e => setInvoiceForm({ ...invoiceForm, matterId: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    >
                                        <option value="">Choose Matter...</option>
                                        {matters.filter(m => !invoiceForm.clientId || m.clientId === invoiceForm.clientId).map(m => (
                                            <option key={m.id} value={m.id}>{m.title}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Invoice Number *</label>
                                    <input 
                                        type="text" 
                                        required
                                        value={invoiceForm.invoiceNumber || ''} 
                                        onChange={e => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                        placeholder="e.g. INV-LAW-1001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Due Date *</label>
                                    <input 
                                        type="date" 
                                        required
                                        value={invoiceForm.dueDate || ''} 
                                        onChange={e => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Total Fee Amount (KES) *</label>
                                    <input 
                                        type="number" 
                                        required
                                        min={1}
                                        value={invoiceForm.totalAmount || 0} 
                                        onChange={e => setInvoiceForm({ ...invoiceForm, totalAmount: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Tax Amount (KES)</label>
                                    <input 
                                        type="number" 
                                        min={0}
                                        value={invoiceForm.taxAmount || 0} 
                                        onChange={e => setInvoiceForm({ ...invoiceForm, taxAmount: parseInt(e.target.value) })}
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-2xl py-4 px-6 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                                <button type="button" onClick={() => setIsAddingInvoice(false)} className="px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">Cancel</button>
                                <button type="submit" className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all">Create Invoice</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

