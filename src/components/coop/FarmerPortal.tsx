import React, { useState, useMemo } from 'react';
import { 
    User, 
    CoopCollection, 
    SaccoAccount, 
    CoopMonthlyPayout, 
    CoopAgrovetSales,
    CoopAgrovetInventory,
    SaccoTransaction,
    AppNotification,
    CoopFarmer
} from '../../types';
import { GridIcon as LayoutDashboard } from '../icons/GridIcon';
import { ClipboardListIcon as ClipboardList } from '../icons/ClipboardListIcon';
import { WalletIcon as Wallet } from '../icons/WalletIcon';
import { FileTextIcon as FileText } from '../icons/FileTextIcon';
import { ShoppingBagIcon as ShoppingBag } from '../icons/ShoppingBagIcon';
import { BellIcon as Bell } from '../icons/BellIcon';
import { SettingsIcon as Settings } from '../icons/SettingsIcon';
import { ArrowRightOnRectangleIcon as LogOut } from '../icons/ArrowRightOnRectangleIcon';
import { TrendingUpIcon as TrendingUp } from '../icons/TrendingUpIcon';
import { DropletsIcon as Droplets } from '../icons/DropletsIcon';
import { ChevronRightIcon as ChevronRight } from '../icons/ChevronRightIcon';
import { ArrowUpRightIcon as ArrowUpRight } from '../icons/ArrowUpRightIcon';
import { CreditCardIcon as CreditCard } from '../icons/CreditCardIcon';
import { ChatBubbleLeftRightIcon as MessageSquare } from '../icons/ChatBubbleLeftRightIcon';
import { Cog8ToothIcon as CogIcon } from '../icons/Cog8ToothIcon';
import { CheckCircleIcon as CheckCircle } from '../icons/CheckCircleIcon';
import { XIcon } from '../icons/XIcon';
import { ExclamationIcon as AlertIcon } from '../icons/ExclamationIcon';

interface FarmerPortalProps {
    currentUser?: User;
    collections: CoopCollection[];
    saccoAccounts: SaccoAccount[];
    saccoTransactions: SaccoTransaction[];
    payouts: CoopMonthlyPayout[];
    agrovetSales: CoopAgrovetSales[];
    agrovetInventory: CoopAgrovetInventory[];
    notifications?: AppNotification[];
    farmer?: CoopFarmer | null;
    onUpdateFarmer?: (id: string, data: Partial<CoopFarmer>) => Promise<void>;
    onAddSaccoAccount?: (data: Partial<SaccoAccount>) => Promise<void>;
    onLogout: () => void;
}

export const FarmerPortal: React.FC<FarmerPortalProps> = (props) => {
    const {
        currentUser = { name: 'User', institutionId: '' } as any,
        collections = [],
        saccoAccounts = [],
        saccoTransactions = [],
        payouts = [],
        agrovetSales = [],
        agrovetInventory = [],
        notifications = [],
        farmer = null,
        onUpdateFarmer,
        onAddSaccoAccount,
        onLogout = () => {}
    } = props;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'collections' | 'sacco' | 'agrovet' | 'statements' | 'notifications' | 'settings'>('dashboard');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<string>(farmer?.paymentMethod || 'mpesa');
    const [isOpeningAccount, setIsOpeningAccount] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [newSaccoAccount, setNewSaccoAccount] = useState<Partial<SaccoAccount>>({
        accountType: 'savings',
        status: 'active'
    });

    const stats = useMemo(() => {
        const totalQty = collections.reduce((sum, c) => sum + Number(c.quantity), 0);
        const saccoBalance = saccoAccounts.reduce((sum, a) => sum + Number(a.balance), 0);
        const latestPayout = payouts.sort((a, b) => b.payoutMonth.localeCompare(a.payoutMonth))[0];
        
        return {
            totalQty,
            saccoBalance,
            lastMonthNet: latestPayout ? latestPayout.netPayout : 0,
            pendingCredit: agrovetSales.filter(s => s.paymentStatus === 'credit').reduce((sum, s) => sum + s.amount, 0)
        };
    }, [collections, saccoAccounts, payouts, agrovetSales]);

    const handleSubmitSaccoAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSaccoAccount.accountType) {
            alert("Please select an account type");
            return;
        }
        if (!farmer) {
            alert("No cooperative farmer profile found. Please contact administration to register as a member first.");
            setIsProcessing(false);
            return;
        }

        setIsProcessing(true);
        try {
            await onAddSaccoAccount?.({
                ...newSaccoAccount,
                id: `sa_${Date.now()}`,
                farmerId: farmer.id,
                institutionId: currentUser.institutionId || ''
            });
            setIsOpeningAccount(false);
            setNewSaccoAccount({ accountType: 'savings', status: 'active' });
        } catch (err) {
            console.error(err);
            alert("Failed to open SACCO account");
        } finally {
            setIsProcessing(false);
        }
    };

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
                        { id: 'statements', label: 'Statements', icon: <FileText className="w-4 h-4" /> },
                        { id: 'notifications', label: 'Notifications', icon: <MessageSquare className="w-4 h-4" /> },
                        { id: 'settings', label: 'Account Settings', icon: <Settings className="w-4 h-4" /> }
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
                        <h3 className="text-xl font-black tracking-tighter mb-1">KES {stats.lastMonthNet?.toLocaleString()}</h3>
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
                                    {stats.totalQty?.toLocaleString()} <span className="text-xs text-slate-400 font-bold ml-1">Units</span>
                                </h3>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all duration-500">
                                <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl flex items-center justify-center text-indigo-600 mb-6 font-black border border-indigo-100 dark:border-indigo-800">
                                    <Wallet className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SACCO Balance</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    KES {(stats.saccoBalance || 0)?.toLocaleString()}
                                </h3>
                            </div>

                            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all duration-500">
                                <div className="w-12 h-12 bg-orange-50 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 mb-6 font-black border border-orange-100 dark:border-orange-800">
                                    <ShoppingBag className="w-6 h-6" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Pending Credit</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    KES {stats.pendingCredit?.toLocaleString()}
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
                    <div className="animate-fade-in space-y-10">
                        <div className="flex justify-between items-end px-2">
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Financial Overview</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">SACCO Accounts</h3>
                             </div>
                             <div className="flex gap-4">
                                 <button className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all">
                                    Apply for Loan
                                </button>
                                <button 
                                    onClick={() => setIsOpeningAccount(true)}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 dark:shadow-none"
                                >
                                    Join SACCO / Open Account
                                </button>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                             {saccoAccounts.map(acc => (
                                 <div key={acc.id} className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group">
                                     <div className="absolute top-0 right-0 p-8">
                                         <ArrowUpRight className="w-10 h-10 text-slate-100 dark:text-slate-800 transition-colors group-hover:text-indigo-500" />
                                     </div>
                                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{acc.accountType} ACCOUNT</p>
                                     <h4 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">KES {(acc.balance || 0)?.toLocaleString()}</h4>
                                     <div className="flex gap-4">
                                         <span className="px-4 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-full">{acc.status || 'active'}</span>
                                     </div>
                                 </div>
                             ))}
                        </div>

                        <div className="space-y-6">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Transaction History</h3>
                            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                            <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                            <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Type</th>
                                            <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                                            <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                        {saccoTransactions.map(txn => (
                                            <tr key={txn.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="py-4 px-8 text-sm font-bold text-slate-700 dark:text-slate-300">{txn.transactionDate}</td>
                                                <td className="py-4 px-8">
                                                    <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-tighter rounded-full ${
                                                        txn.transactionType === 'deposit' || txn.transactionType === 'dividend' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                                                    }`}>
                                                        {txn.transactionType}
                                                    </span>
                                                </td>
                                                <td className="py-4 px-8 text-sm font-medium text-slate-600 dark:text-slate-400">{txn.reference || 'N/A'}</td>
                                                <td className={`py-4 px-8 text-sm font-black ${
                                                    txn.transactionType === 'deposit' || txn.transactionType === 'dividend' ? 'text-emerald-600' : 'text-red-600'
                                                }`}>
                                                    {txn.transactionType === 'deposit' || txn.transactionType === 'dividend' ? '+' : '-'} {txn.amount?.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {saccoTransactions.length === 0 && (
                                            <tr>
                                                <td colSpan={4} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No transaction history found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'agrovet' && (
                    <div className="animate-fade-in space-y-10">
                        <div className="flex justify-between items-end px-2">
                             <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Store Credit & Supplies</p>
                                <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Agrovet Purchases</h3>
                             </div>
                             <div className="bg-indigo-50 dark:bg-indigo-900/40 px-6 py-4 rounded-[2rem] border border-indigo-100 dark:border-indigo-800">
                                 <p className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Total Credit Limit</p>
                                 <p className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">KES 50,000</p>
                             </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 space-y-6">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Recent Sales</h3>
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50">
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Qty</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Total</th>
                                                <th className="py-5 px-8 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                                            {agrovetSales.map(sale => (
                                                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                    <td className="py-4 px-8 text-sm font-bold text-slate-700 dark:text-slate-300">{sale.saleDate}</td>
                                                    <td className="py-4 px-8 text-sm font-medium text-slate-600 dark:text-slate-400">
                                                        {agrovetInventory.find(i => i.id === sale.itemId)?.itemName || 'Product'}
                                                    </td>
                                                    <td className="py-4 px-8 text-sm font-black text-slate-900 dark:text-white">{sale.quantity}</td>
                                                    <td className="py-4 px-8 text-sm font-black text-slate-900 dark:text-white">KES {sale.amount?.toLocaleString()}</td>
                                                    <td className="py-4 px-8">
                                                        <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-tighter rounded-full ${
                                                            sale.paymentStatus === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                                                            sale.paymentStatus === 'credit' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                                        }`}>
                                                            {sale.paymentStatus}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                            {agrovetSales.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="py-12 text-center text-slate-400 text-xs font-bold uppercase tracking-widest italic">No purchase history</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Store Highlights</h3>
                                <div className="space-y-4">
                                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Savings</p>
                                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">KES 12,450</h4>
                                        <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest mt-1">Saved on member discounts</p>
                                    </div>
                                    <button className="w-full bg-indigo-600 p-6 rounded-[2.5rem] text-white shadow-xl shadow-indigo-100 dark:shadow-none flex items-center justify-between group transition-all hover:bg-indigo-700">
                                        <div className="text-left">
                                            <p className="text-[11px] font-black uppercase tracking-tighter">Browse Store</p>
                                            <p className="text-[9px] text-indigo-200 font-bold uppercase tracking-widest">Digital Catalog</p>
                                        </div>
                                        <TrendingUp className="w-6 h-6 text-indigo-300" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'statements' && (
                    <div className="animate-fade-in space-y-10">
                        <div className="px-2">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Earnings Reports</p>
                             <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Production Statements</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {payouts.map(payout => (
                                <div key={payout.id} className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                                     <div className="absolute top-0 right-0 w-2 h-full bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                     <div className="flex items-center justify-between mb-8">
                                         <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center">
                                             <FileText className="w-6 h-6 text-slate-400" />
                                         </div>
                                         <span className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-full ${
                                             payout.status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                         }`}>{payout.status}</span>
                                     </div>
                                     <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">{payout.payoutMonth}</p>
                                     <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-4">KES {payout.netPayout?.toLocaleString()}</h4>
                                     
                                     <div className="pt-6 border-t border-slate-50 dark:border-slate-800 flex justify-between items-center">
                                         <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-2">
                                             <FileText className="w-4 h-4" />
                                             Full Breakdown
                                         </button>
                                         <button className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 transition-colors">
                                             PDF
                                         </button>
                                     </div>
                                </div>
                            ))}
                            {payouts.length === 0 && (
                                <div className="col-span-full py-24 bg-white dark:bg-slate-900 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 mb-6">
                                        <FileText className="w-10 h-10" />
                                    </div>
                                    <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter mb-2">No Statements Found</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Your monthly production reports will appear here</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'notifications' && (
                    <div className="animate-fade-in space-y-8">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Notifications & Announcements</h2>
                        </div>
                        
                        <div className="space-y-4">
                            {notifications.length > 0 ? (
                                notifications.map(n => (
                                    <div key={n.id} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-indigo-500 transition-all group">
                                        <div className="flex items-start gap-5">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                                                n.type === 'alert' ? 'bg-red-50 text-red-600' :
                                                n.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                                                'bg-indigo-50 text-indigo-600'
                                            }`}>
                                                <Bell className="w-6 h-6" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{n.type}</h4>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                                        {new Date(n.timestamp).toLocaleDateString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{n.message}</p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-16 text-center">
                                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-300">
                                        <Bell className="w-10 h-10" />
                                    </div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">No Notifications</h3>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">You're all caught up with the cooperative!</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {activeTab === 'settings' && (
                    <div className="animate-fade-in space-y-10">
                        <div className="px-2">
                             <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-1">Account & Preferences</p>
                             <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Portal Settings</h3>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                            <div className="lg:col-span-2 space-y-8">
                                {/* Profile Card */}
                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center text-indigo-600">
                                            <Settings className="w-4 h-4" />
                                        </div>
                                        Personal Information
                                    </h4>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Full Name</label>
                                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold dark:text-white opacity-60 cursor-not-allowed">
                                                {currentUser.name}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Member ID</label>
                                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold dark:text-white opacity-60 cursor-not-allowed">
                                                {farmer?.memberId || 'N/A'}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold dark:text-white opacity-60 cursor-not-allowed">
                                                {currentUser.phoneNumber}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
                                            <div className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-bold dark:text-white opacity-60 cursor-not-allowed">
                                                {currentUser.email}
                                            </div>
                                        </div>
                                    </div>
                                    <p className="mt-8 text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl inline-block">
                                        To update personal details, please contact the cooperative office.
                                    </p>
                                </div>

                                {/* Settlement Section */}
                                <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-8">
                                        <CreditCard className="w-12 h-12 text-slate-100 dark:text-slate-800" />
                                    </div>
                                    <h4 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">Preferred Settlement Method</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-8">How you receive your monthly payouts</p>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'mpesa', label: 'M-PESA Pay', desc: 'Secure phone settlement', color: 'emerald' },
                                            { id: 'bank', label: 'Bank Transfer', desc: 'Direct bank deposit', color: 'blue' },
                                            { id: 'cash', label: 'Physical Cash', desc: 'Collect at office', color: 'orange' }
                                        ].map(method => (
                                            <button 
                                                key={method.id}
                                                onClick={() => setSelectedMethod(method.id)}
                                                className={`p-6 rounded-[2rem] border transition-all text-left group relative ${
                                                    selectedMethod === method.id 
                                                    ? `bg-${method.color}-50 dark:bg-${method.color}-900/20 border-${method.color}-200 dark:border-${method.color}-800` 
                                                    : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700'
                                                }`}
                                            >
                                                {selectedMethod === method.id && (
                                                    <div className={`absolute top-4 right-4 w-5 h-5 bg-${method.color}-500 rounded-full flex items-center justify-center text-white scale-110 shadow-lg`}>
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                    </div>
                                                )}
                                                <p className={`text-[11px] font-black uppercase tracking-tighter mb-1 ${
                                                    selectedMethod === method.id ? `text-${method.color}-600 dark:text-${method.color}-400` : 'text-slate-900 dark:text-white'
                                                }`}>{method.label}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{method.desc}</p>
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-12 flex items-center gap-6">
                                        <button 
                                            disabled={isSaving || !farmer || selectedMethod === farmer.paymentMethod}
                                            onClick={async () => {
                                                if (!farmer || !onUpdateFarmer) return;
                                                setIsSaving(true);
                                                try {
                                                    await onUpdateFarmer(farmer.id, { paymentMethod: selectedMethod as any });
                                                    setShowSuccess(true);
                                                    setTimeout(() => setShowSuccess(false), 3000);
                                                } catch (err) {
                                                    console.error("Failed to update settlement method", err);
                                                } finally {
                                                    setIsSaving(false);
                                                }
                                            }}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-200 dark:shadow-none flex items-center gap-3 active:scale-95"
                                        >
                                            {isSaving ? (
                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            ) : (
                                                <CogIcon className="w-4 h-4" />
                                            )}
                                            {isSaving ? 'Saving Changes...' : 'Save Preferences'}
                                        </button>
                                        
                                        {showSuccess && (
                                            <div className="flex items-center gap-2 text-emerald-500 animate-bounce-in">
                                                <CheckCircle className="w-5 h-5" />
                                                <p className="text-[10px] font-black uppercase tracking-widest">Update Successful</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tighter px-2">Security</h3>
                                <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Password Management</p>
                                    <button className="w-full bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 transition-all text-left">
                                        Change Portal Password
                                    </button>
                                    <p className="mt-6 text-[9px] text-slate-400 font-medium leading-relaxed leading-4">
                                        Last updated: {currentUser.passwordLastUpdated ? new Date(currentUser.passwordLastUpdated).toLocaleDateString() : 'Never'}
                                    </p>
                                </div>

                                <div className="bg-indigo-900 p-8 rounded-[2.5rem] text-white">
                                    <h4 className="text-sm font-black uppercase tracking-tight mb-2 text-indigo-300">Need Help?</h4>
                                    <p className="text-xs text-indigo-100 font-medium leading-relaxed mb-6">If you encounter issues with your settlement, please reach out to our support team.</p>
                                    <button className="w-full bg-white/10 hover:bg-white/20 p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white transition-all">
                                        Contact Support
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {isOpeningAccount && (
                <div className="fixed inset-0 bg-slate-900/40 dark:bg-slate-900/80 z-[300] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in" onClick={() => setIsOpeningAccount(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Open SACCO Account</h3>
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Join the Cooperative SACCO</p>
                            </div>
                            <button onClick={() => setIsOpeningAccount(false)} className="p-3 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                                <XIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmitSaccoAccount} className="p-10 space-y-6">
                            <div className="space-y-4">
                                <p className="text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                                    Hello <span className="text-indigo-600">{currentUser.name}</span>, you are about to open a SACCO account with <span className="font-black">Icona Cooperative SACCO</span>.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Account Type</label>
                                <div className="grid grid-cols-2 gap-4">
                                    {(['savings', 'shares'] as const).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => setNewSaccoAccount({...newSaccoAccount, accountType: type})}
                                            className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                newSaccoAccount.accountType === type 
                                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 dark:shadow-none' 
                                                : 'bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-slate-100'
                                            }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-6 rounded-3xl space-y-2">
                                <div className="flex items-center gap-2">
                                    <AlertIcon className="w-4 h-4 text-amber-600" />
                                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-800 dark:text-amber-200">Registration Notice</span>
                                </div>
                                <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold leading-relaxed uppercase">
                                    Account opening is free for all active farmers. Your account will be activated instantly upon submission.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={isProcessing}
                                className="w-full bg-slate-900 dark:bg-white dark:text-slate-900 text-white py-5 rounded-[2rem] text-xs font-black uppercase tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50"
                            >
                                {isProcessing ? 'Processing...' : 'Confirm & Open Account'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

