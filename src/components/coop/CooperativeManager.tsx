
import React, { useState, useMemo } from 'react';
import { 
    Users as UsersIcon, 
    ClipboardList as CollectionIcon, 
    Truck as LogisticsIcon, 
    PieChart as ReportsIcon,
    Plus as PlusIcon,
    Search as SearchIcon,
    Filter as FilterIcon,
    CheckCircle2 as SuccessIcon,
    AlertCircle as AlertIcon,
    ChevronRight as ChevronRightIcon,
    ShoppingCart as StoreIcon,
    CreditCard as SaccoIcon,
    Banknote as PayoutIcon,
    Leaf as FarmerIcon,
    DollarSign as FinanceIcon,
    UserCheck as ApprovalIcon
} from 'lucide-react';
import { 
    CoopFarmer, 
    CoopCollection, 
    CoopRider, 
    User,
    CoopAgrovetInventory,
    CoopAgrovetSales,
    SaccoAccount,
    CoopMonthlyPayout,
    SaccoTransaction,
    CoopExpense,
    CoopIncome
} from '../../types';

interface CooperativeManagerProps {
    farmers: CoopFarmer[];
    collections: CoopCollection[];
    riders: CoopRider[];
    currentUser: User;
    inventory: CoopAgrovetInventory[];
    sales: CoopAgrovetSales[];
    saccoAccounts: SaccoAccount[];
    payouts: CoopMonthlyPayout[];
    expenses: CoopExpense[];
    income: CoopIncome[];
    onAddFarmer: (data: Partial<CoopFarmer>) => Promise<void>;
    onLogCollection: (data: Partial<CoopCollection>) => Promise<void>;
    onAddRider: (data: Partial<CoopRider>) => Promise<void>;
    onConfirmCollection?: (id: string, qty: number) => Promise<void>;
    onApproveCollection?: (id: string, status: 'approved' | 'rejected') => Promise<void>;
    onAddExpense?: (data: Partial<CoopExpense>) => Promise<void>;
    onAddIncome?: (data: Partial<CoopIncome>) => Promise<void>;
    onLogAction?: (action: string) => Promise<void>;
    onInitiatePayouts?: (payoutIds: string[]) => Promise<void>;
    onApprovePayouts?: (payoutIds: string[]) => Promise<void>;
}

export const CooperativeManager: React.FC<CooperativeManagerProps> = ({
    farmers = [],
    collections = [],
    riders = [],
    currentUser,
    inventory = [],
    sales = [],
    saccoAccounts = [],
    payouts = [],
    expenses = [],
    income = [],
    onAddFarmer,
    onLogCollection,
    onAddRider,
    onConfirmCollection,
    onApproveCollection,
    onAddExpense,
    onAddIncome,
    onLogAction,
    onInitiatePayouts,
    onApprovePayouts
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'farmers' | 'collections' | 'logistics' | 'agrovet' | 'sacco' | 'payouts' | 'finances' | 'approvals' | 'reports'>('farmers');
    const [payoutRate, setPayoutRate] = useState<number>(50); // Default rate KES 50 per Unit
    const [filterMonth, setFilterMonth] = useState<number>(new Date().getMonth());
    const [filterYear, setFilterYear] = useState<number>(new Date().getFullYear());
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPayouts, setSelectedPayouts] = useState<string[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);

    const filteredFarmers = useMemo(() => {
        return farmers.filter(f => 
            f.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            f.phone.includes(searchTerm)
        );
    }, [farmers, searchTerm]);

    const stats = useMemo(() => {
        const today = new Date().toISOString().split('T')[0];
        const todayCollections = collections.filter(c => c.collectionDate === today);
        const todayQty = todayCollections.reduce((sum, c) => sum + Number(c.quantity), 0);
        const totalSaccoAssets = saccoAccounts.reduce((sum, a) => sum + a.balance, 0);
        const totalPayouts = payouts.reduce((sum, p) => sum + p.netAmount, 0);

        return {
            todayQty,
            totalFarmers: farmers.length,
            activeRiders: riders.filter(r => r.status === 'active').length,
            totalSaccoAssets,
            totalPayouts
        };
    }, [collections, farmers, riders, saccoAccounts, payouts]);

    const getFarmerName = (id: string) => farmers.find(f => f.id === id)?.name || 'Unknown Farmer';
    const getRiderName = (id?: string) => riders.find(r => r.id === id)?.name || 'N/A';

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 bg-indigo-50 dark:bg-indigo-900/20 w-16 h-16 rounded-full" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Intake</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                        {stats.todayQty.toLocaleString()} <span className="text-xs text-slate-400 font-bold ml-1">Units</span>
                    </h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 bg-emerald-50 dark:bg-emerald-900/20 w-16 h-16 rounded-full" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Active Farmers</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.totalFarmers}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 bg-amber-50 dark:bg-amber-900/20 w-16 h-16 rounded-full" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Monthly Payouts</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">KES {stats.totalPayouts.toLocaleString()}</h3>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden relative">
                    <div className="absolute -right-4 -top-4 bg-blue-50 dark:bg-blue-900/20 w-16 h-16 rounded-full" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">SACCO Assets</p>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">KES {stats.totalSaccoAssets.toLocaleString()}</h3>
                </div>
            </div>

            {/* Navigation & Search */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/50 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
                    {[
                        { id: 'farmers', label: 'Farmers', icon: <FarmerIcon className="w-4 h-4" /> },
                        { id: 'collections', label: 'Collections', icon: <CollectionIcon className="w-4 h-4" /> },
                        { id: 'logistics', label: 'Logistics', icon: <LogisticsIcon className="w-4 h-4" /> },
                        { id: 'agrovet', label: 'Agrovet', icon: <StoreIcon className="w-4 h-4" /> },
                        { id: 'sacco', label: 'SACCO', icon: <SaccoIcon className="w-4 h-4" /> },
                        { id: 'payouts', label: 'Payouts', icon: <PayoutIcon className="w-4 h-4" /> },
                        { id: 'finances', label: 'Finances', icon: <FinanceIcon className="w-4 h-4" /> },
                        { id: 'approvals', label: 'Approvals', icon: <ApprovalIcon className="w-4 h-4" /> },
                        { id: 'reports', label: 'Analytics', icon: <ReportsIcon className="w-4 h-4" /> }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveSubTab(tab.id as any)}
                            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                activeSubTab === tab.id 
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-slate-700' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative group min-w-[300px]">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="search"
                        placeholder="Search farmers, collections, or records..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-white dark:bg-slate-800 border-none rounded-2xl py-3.5 pl-11 pr-4 text-sm focus:ring-2 focus:ring-indigo-500/20 shadow-sm"
                    />
                </div>
            </div>

            {/* Main Content Area */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm min-h-[500px]">
                {activeSubTab === 'farmers' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black tracking-tighter uppercase">Farmer Registry</h2>
                            <button 
                                onClick={() => onAddFarmer({})}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg hover:shadow-indigo-500/20 active:scale-95"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Onboard Farmer
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {filteredFarmers.map(farmer => (
                                <div key={farmer.id} className="group p-6 rounded-3xl border border-slate-100 dark:border-slate-700 hover:border-indigo-100 dark:hover:border-indigo-900/30 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all duration-300 cursor-pointer">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center font-black text-slate-400 uppercase tracking-tighter">
                                            {farmer.name.substring(0, 2)}
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-full ${
                                            farmer.status === 'active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20' : 'bg-amber-50 text-amber-600 dark:bg-amber-900/20'
                                        }`}>
                                            {farmer.status}
                                        </span>
                                    </div>
                                    <h4 className="font-black text-slate-900 dark:text-white text-lg tracking-tighter mb-1 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                                        {farmer.name}
                                    </h4>
                                    <p className="text-xs text-slate-500 mb-4 font-medium">{farmer.phone}</p>
                                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                                            <p className="text-xs font-bold">{farmer.location || 'Main'}</p>
                                        </div>
                                        <ChevronRightIcon className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 translate-x-0 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSubTab === 'collections' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black tracking-tighter uppercase">Daily Intake Log</h2>
                            <button 
                                onClick={() => onLogCollection({})}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Log Collection
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-4">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        <th className="px-6 pb-2">Farmer</th>
                                        <th className="px-6 pb-2">Product</th>
                                        <th className="px-6 pb-2 text-right">Rider Qty</th>
                                        <th className="px-6 pb-2 text-right">Final Qty</th>
                                        <th className="px-6 pb-2">Status</th>
                                        <th className="px-6 pb-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {collections.slice(0, 30).map(col => (
                                        <tr key={col.id} className="group bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm hover:shadow-md border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                                            <td className="px-6 py-5 rounded-l-3xl">
                                                <p className="font-black text-slate-900 dark:text-white tracking-tighter text-sm">{getFarmerName(col.farmerId)}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{col.collectionDate}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded-full">
                                                    {col.productType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-slate-400">{col.quantity}</td>
                                            <td className="px-6 py-5 text-right font-black text-indigo-600 dark:text-indigo-400">
                                                {col.factoryConfirmed ? col.finalQuantity : '-'}
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${
                                                        col.factoryConfirmed 
                                                            ? col.requiresApproval 
                                                                ? col.approvalStatus === 'approved' ? 'bg-emerald-500' : col.approvalStatus === 'rejected' ? 'bg-rose-500' : 'bg-amber-500'
                                                                : 'bg-emerald-500'
                                                            : 'bg-slate-300'
                                                    }`} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                                                        {col.factoryConfirmed 
                                                            ? col.requiresApproval 
                                                                ? col.approvalStatus === 'pending' ? 'Pending Approval' : col.approvalStatus
                                                                : 'Confirmed'
                                                            : 'Pending Intake'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right rounded-r-3xl">
                                                {!col.factoryConfirmed && (
                                                    <button 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const finalQty = prompt(`Confirm quantity for ${getFarmerName(col.farmerId)} (Rider recorded: ${col.quantity})`, col.quantity.toString());
                                                            if (finalQty !== null) onConfirmCollection?.(col.id, parseFloat(finalQty));
                                                        }}
                                                        className="bg-slate-900 dark:bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95"
                                                    >
                                                        Confirm
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeSubTab === 'approvals' && (
                    <div className="p-8">
                        <div className="mb-8">
                            <h2 className="text-xl font-black tracking-tighter uppercase">Board Approvals</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Review quantity discrepancies and factory modifications</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-6">
                            {collections.filter(c => c.requiresApproval && c.approvalStatus === 'pending').map(col => (
                                <div key={col.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-8 animate-fade-in-up">
                                    <div className="flex items-center gap-6">
                                        <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                                            <AlertIcon className="w-8 h-8 text-amber-600" />
                                        </div>
                                        <div>
                                            <h4 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">Discrepancy: {getFarmerName(col.farmerId)}</h4>
                                            <div className="flex items-center gap-4 mt-1">
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Date: {col.collectionDate}</p>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Product: {col.productType}</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-12 bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Rider Recorded</p>
                                            <p className="text-xl font-black text-slate-600 dark:text-slate-400">{col.quantity}</p>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Factory Confirmed</p>
                                            <p className="text-xl font-black text-indigo-600">{col.finalQuantity}</p>
                                        </div>
                                        <div className="h-8 w-px bg-slate-200 dark:bg-slate-800" />
                                        <div className="text-center">
                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Variance</p>
                                            <p className={`text-xl font-black ${Number(col.finalQuantity) - Number(col.quantity) < 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                {(Number(col.finalQuantity) - Number(col.quantity)).toFixed(2)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button 
                                            onClick={() => onApproveCollection?.(col.id, 'rejected')}
                                            className="px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-95 text-slate-400"
                                        >
                                            Reject Change
                                        </button>
                                        <button 
                                            onClick={() => onApproveCollection?.(col.id, 'approved')}
                                            className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
                                        >
                                            Approve Quantity
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {collections.filter(c => c.requiresApproval && c.approvalStatus === 'pending').length === 0 && (
                                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-20 rounded-[3rem] border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center text-center">
                                    <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
                                        <SuccessIcon className="w-10 h-10 text-emerald-500" />
                                    </div>
                                    <h3 className="text-lg font-black tracking-tight text-slate-900 dark:text-white uppercase mb-2">Queue Fully Cleared</h3>
                                    <p className="text-xs font-medium text-slate-500 max-w-sm">There are no pending collection approvals at this moment. All discrepancies have been resolved.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSubTab === 'finances' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter uppercase">Financial Ledger</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tracking Cooperative Expenses & Income flows</p>
                            </div>
                            <div className="flex gap-4">
                                <button 
                                    onClick={() => onAddExpense?.({})}
                                    className="px-6 py-3 rounded-2xl border-2 border-slate-100 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 text-slate-900 dark:text-white flex items-center gap-2"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Record Expense
                                </button>
                                <button 
                                    onClick={() => onAddIncome?.({})}
                                    className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:scale-105 transition-all shadow-lg active:scale-95 flex items-center gap-2"
                                >
                                    <PlusIcon className="w-4 h-4" />
                                    Record Income
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mt-12">
                            {/* Expenses List */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-rose-500 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-rose-500" />
                                    Recent Expenditures
                                </h3>
                                <div className="space-y-4">
                                    {expenses.slice(0, 10).map(exp => (
                                        <div key={exp.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{exp.description}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{exp.date} • {exp.category}</p>
                                            </div>
                                            <p className="text-lg font-black text-rose-600">- KES {exp.amount.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Income List */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-black uppercase tracking-widest text-emerald-500 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    Revenue Generation
                                </h3>
                                <div className="space-y-4">
                                    {income.slice(0, 10).map(inc => (
                                        <div key={inc.id} className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm">
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white text-sm tracking-tight">{inc.companyName}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{inc.date} • {inc.productType} ({inc.quantity} {inc.unit})</p>
                                            </div>
                                            <p className="text-lg font-black text-emerald-600">+ KES {inc.amount.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeSubTab === 'agrovet' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black tracking-tighter uppercase">Agrovet Inventory & Sales</h2>
                            <div className="flex gap-4">
                                <button className="text-xs font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-900/30 px-6 py-3 rounded-2xl transition-all">Stocks</button>
                                <button className="text-xs font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl transition-all shadow-lg active:scale-95">Record Sale</button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                            {inventory.slice(0, 6).map(item => (
                                <div key={item.id} className="p-6 rounded-3xl border border-slate-100 dark:border-slate-700">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
                                            <StoreIcon className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                                            Number(item.quantity) < item.reorderLevel ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-slate-50 text-slate-500 dark:bg-slate-900/20'
                                        }`}>
                                            {item.quantity} In Stock
                                        </span>
                                    </div>
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tighter text-sm mb-1">{item.productName}</h4>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{item.category}</p>
                                    <p className="text-lg font-black text-indigo-600 mt-4 tracking-tighter">KES {item.unitPrice.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSubTab === 'sacco' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black tracking-tighter uppercase">SACCO Accounts</h2>
                            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95">Open Account</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-4">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        <th className="px-6 pb-2">Account Holder</th>
                                        <th className="px-6 pb-2">Acc Type</th>
                                        <th className="px-6 pb-2 text-right">Balance</th>
                                        <th className="px-6 pb-2">Status</th>
                                        <th className="px-6 pb-2 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {saccoAccounts.map(acc => (
                                        <tr key={acc.id} className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                                            <td className="px-6 py-5 rounded-l-3xl">
                                                <p className="font-black text-slate-900 dark:text-white tracking-tighter text-sm">{getFarmerName(acc.farmerId)}</p>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-black uppercase bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 px-3 py-1.5 rounded-full">
                                                    {acc.accountType}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right font-black text-emerald-600">KES {acc.balance.toLocaleString()}</td>
                                            <td className="px-6 py-5">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{acc.status}</span>
                                            </td>
                                            <td className="px-6 py-5 text-right rounded-r-3xl">
                                                <button className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline">View Statement</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeSubTab === 'payouts' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter uppercase">Monthly Payout Processing</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                                    {selectedPayouts.length} Payouts selected for processing
                                </p>
                            </div>
                            <div className="flex items-center gap-4">
                                {(currentUser.role === 'cooperative_manager' || currentUser.role === 'admin') && (
                                    <button 
                                        disabled={selectedPayouts.length === 0 || isProcessing}
                                        onClick={async () => {
                                            if (window.confirm(`Initiate monthly dues for ${selectedPayouts.length} farmers?`)) {
                                                setIsProcessing(true);
                                                await onInitiatePayouts?.(selectedPayouts);
                                                setSelectedPayouts([]);
                                                setIsProcessing(false);
                                                onLogAction?.(`Initiated bulk payout for ${selectedPayouts.length} farmers`);
                                            }
                                        }}
                                        className="flex items-center gap-2 bg-indigo-600 disabled:bg-slate-300 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                    >
                                        <PayoutIcon className="w-4 h-4" />
                                        Initiate Bulk Dues
                                    </button>
                                )}
                                {(currentUser.role === 'coop_chairman' || currentUser.role === 'super_admin') && (
                                    <button 
                                        disabled={selectedPayouts.length === 0 || isProcessing}
                                        onClick={async () => {
                                            if (window.confirm(`Approve and Disburse funds via M-PESA for ${selectedPayouts.length} farmers?`)) {
                                                setIsProcessing(true);
                                                await onApprovePayouts?.(selectedPayouts);
                                                setSelectedPayouts([]);
                                                setIsProcessing(false);
                                                onLogAction?.(`Approved and Disbursed bulk M-Pesa payout to ${selectedPayouts.length} farmers`);
                                            }
                                        }}
                                        className="flex items-center gap-2 bg-emerald-600 disabled:bg-slate-300 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                                    >
                                        <SuccessIcon className="w-4 h-4" />
                                        Approve & Play (M-PESA)
                                    </button>
                                )}
                                <button className="flex items-center gap-2 border-2 border-slate-100 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50">
                                    <PlusIcon className="w-4 h-4" />
                                    Generate Drafts
                                </button>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-separate border-spacing-y-4">
                                <thead>
                                    <tr className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                        <th className="px-6 pb-2">
                                            <input 
                                                type="checkbox" 
                                                checked={selectedPayouts.length > 0 && selectedPayouts.length === payouts.length}
                                                onChange={(e) => {
                                                    if (e.target.checked) setSelectedPayouts(payouts.map(p => p.id));
                                                    else setSelectedPayouts([]);
                                                }}
                                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                            />
                                        </th>
                                        <th className="px-6 pb-2">Farmer</th>
                                        <th className="px-6 pb-2 text-right">Gross</th>
                                        <th className="px-6 pb-2 text-right text-rose-500">Deductions</th>
                                        <th className="px-6 pb-2 text-right text-emerald-600 font-black">Net Amount</th>
                                        <th className="px-6 pb-2">Status</th>
                                        <th className="px-6 pb-2">Workflow</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payouts.map(p => (
                                        <tr key={p.id} className="bg-slate-50/50 dark:bg-slate-900/30 hover:bg-white dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm">
                                            <td className="px-6 py-5 rounded-l-3xl">
                                                <input 
                                                    type="checkbox" 
                                                    checked={selectedPayouts.includes(p.id)}
                                                    onChange={(e) => {
                                                        if (e.target.checked) setSelectedPayouts(prev => [...prev, p.id]);
                                                        else setSelectedPayouts(prev => prev.filter(id => id !== p.id));
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                />
                                            </td>
                                            <td className="px-6 py-5">
                                                <p className="font-black text-slate-900 dark:text-white tracking-tighter text-sm">{getFarmerName(p.farmerId)}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{p.monthYear}</p>
                                            </td>
                                            <td className="px-6 py-5 text-right font-bold text-slate-600">KES {p.grossAmount.toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right font-medium text-rose-500">- KES {(p.deductionsAgrovet + p.deductionsSacco + p.deductionsTransport).toLocaleString()}</td>
                                            <td className="px-6 py-5 text-right font-black text-emerald-700 text-lg tracking-tighter">KES {p.netAmount.toLocaleString()}</td>
                                            <td className="px-6 py-5">
                                                <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full ${
                                                    p.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 
                                                    p.status === 'approved' ? 'bg-indigo-50 text-indigo-600' :
                                                    p.status === 'initiated' ? 'bg-amber-50 text-amber-600' :
                                                    'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {p.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 rounded-r-3xl">
                                                <div className="flex flex-col gap-1">
                                                    {p.initiatedAt && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">Initiated: {new Date(p.initiatedAt).toLocaleDateString()}</p>}
                                                    {p.approvedAt && <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter text-emerald-600">Approved: {new Date(p.approvedAt).toLocaleDateString()}</p>}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeSubTab === 'logistics' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-xl font-black tracking-tighter uppercase">Logistics & Riders</h2>
                            <button 
                                onClick={() => onAddRider({})}
                                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                            >
                                <PlusIcon className="w-4 h-4" />
                                Register Rider
                            </button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {riders.map(rider => (
                                <div key={rider.id} className="p-6 rounded-3xl border border-slate-100 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-900/20">
                                    <div className="flex items-center gap-4 mb-6">
                                        <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center">
                                            <LogisticsIcon className="w-6 h-6 text-white" />
                                        </div>
                                        <div>
                                            <h4 className="font-black text-slate-900 dark:text-white tracking-tighter">{rider.name}</h4>
                                            <p className="text-xs text-indigo-500 font-bold tracking-widest uppercase">{rider.vehiclePlate || 'NO PLATE'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                            <p className="text-xs font-black uppercase text-emerald-500">{rider.status}</p>
                                        </div>
                                        <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ID Number</p>
                                            <p className="text-xs font-black">{rider.nationalId}</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSubTab === 'reports' && (
                    <div className="p-8">
                        <div className="flex items-center justify-between mb-12">
                            <div>
                                <h2 className="text-xl font-black tracking-tighter uppercase">Operational Intelligence</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advanced Financial Reporting & Yield Analytics</p>
                            </div>
                        </div>

                        {/* Top Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                            <div className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-indigo-500/20">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-2">Net Cash Position</p>
                                <h4 className="text-3xl font-black tracking-tighter">
                                    KES {(income.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                                </h4>
                                <div className="mt-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest bg-white/10 w-fit px-3 py-1.5 rounded-full">
                                    Cashbook Balance
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Receivables</p>
                                <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    KES {income.reduce((s, i) => s + i.amount, 0).toLocaleString()}
                                </h4>
                                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mt-2">+ Gross Income</p>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Total Payables</p>
                                <h4 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                                    KES {expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}
                                </h4>
                                <p className="text-[10px] font-bold text-rose-500 uppercase tracking-widest mt-2">- Operating Expenses</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-12">
                            {/* Yield Analytics */}
                            <div className="bg-slate-50 dark:bg-slate-900/50 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-800">
                                <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                    <FarmerIcon className="w-5 h-5 text-indigo-500" />
                                    Yield Production Analytics
                                </h3>
                                <div className="space-y-6">
                                    {['Milk', 'Coffee', 'Tea', 'Pyrethrum'].map(prod => {
                                        const prodTotal = collections.filter(c => c.productType === prod && c.factoryConfirmed).reduce((s, c) => s + Number(c.finalQuantity), 0);
                                        const maxProd = Math.max(...['Milk', 'Coffee', 'Tea', 'Pyrethrum'].map(p => collections.filter(c => c.productType === p && c.factoryConfirmed).reduce((s, c) => s + Number(c.finalQuantity), 0)), 1);
                                        const percentage = (prodTotal / maxProd) * 100;
                                        
                                        return (
                                            <div key={prod}>
                                                <div className="flex justify-between items-end mb-2">
                                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{prod}</p>
                                                    <p className="text-sm font-black tracking-tight">{prodTotal.toLocaleString()} Units</p>
                                                </div>
                                                <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                                    <div 
                                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                                        style={{ width: `${percentage}%` }}
                                                    />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Trial Balance / Modern Report */}
                            <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                                <h3 className="text-sm font-black uppercase tracking-widest mb-8 flex items-center gap-3 text-slate-900 dark:text-white">
                                    <PayoutIcon className="w-5 h-5 text-indigo-500" />
                                    Snapshot: Trial Balance
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-700/50">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Income (Credit)</p>
                                        <p className="text-sm font-black text-emerald-600">KES {income.reduce((s, i) => s + i.amount, 0).toLocaleString()}</p>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-700/50">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Total Expenses (Debit)</p>
                                        <p className="text-sm font-black text-rose-600">KES {expenses.reduce((s, e) => s + e.amount, 0).toLocaleString()}</p>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-700/50">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">SACCO Assets</p>
                                        <p className="text-sm font-black text-indigo-600">KES {saccoAccounts.reduce((s, a) => s + a.balance, 0).toLocaleString()}</p>
                                    </div>
                                    <div className="flex justify-between items-center py-4 border-b border-slate-50 dark:border-slate-700/50">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Agrovet Inventory Value</p>
                                        <p className="text-sm font-black text-slate-600 dark:text-slate-400">KES {(inventory.reduce((s, i) => s + (i.quantity * i.unitPrice), 0)).toLocaleString()}</p>
                                    </div>
                                    <div className="flex justify-between items-center pt-8">
                                        <div className="bg-slate-900 dark:bg-indigo-600 px-6 py-4 rounded-2xl w-full flex justify-between items-center shadow-xl shadow-indigo-500/10">
                                            <p className="text-[10px] font-black uppercase text-white/60 tracking-[0.2em]">Retained Earnings</p>
                                            <p className="text-xl font-black text-white tracking-widest">
                                                KES {(income.reduce((s, i) => s + i.amount, 0) - expenses.reduce((s, e) => s + e.amount, 0)).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/* Payment Schedule Section */}
                        <div id="payment-schedule" className="mt-12 bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
                                <div>
                                    <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white mb-1">Payment Schedule Report</h3>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Monthly Settlement Summary</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-4">
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl flex items-center gap-2">
                                        <select 
                                            value={filterMonth} 
                                            onChange={e => setFilterMonth(Number(e.target.value))}
                                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-2 dark:text-white"
                                        >
                                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                                <option key={i} value={i} className="dark:bg-slate-800">{m}</option>
                                            ))}
                                        </select>
                                        <select 
                                            value={filterYear} 
                                            onChange={e => setFilterYear(Number(e.target.value))}
                                            className="bg-transparent text-[10px] font-black uppercase tracking-widest outline-none border-none p-2 dark:text-white"
                                        >
                                            {[2024, 2025, 2026].map(y => (
                                                <option key={y} value={y} className="dark:bg-slate-800">{y}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="bg-slate-50 dark:bg-slate-900/50 p-2 rounded-2xl flex items-center gap-3">
                                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Rate (KES/Unit):</label>
                                        <input 
                                            type="number" 
                                            value={payoutRate} 
                                            onChange={e => setPayoutRate(Number(e.target.value))}
                                            className="w-20 bg-white dark:bg-slate-800 rounded-xl px-3 py-1.5 text-xs font-black outline-none border border-slate-100 dark:border-slate-700 dark:text-white" 
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                            <th className="pb-4">Farmer Name</th>
                                            <th className="pb-4">Total Qty</th>
                                            <th className="pb-4">Gross Payout</th>
                                            <th className="pb-4">Advances</th>
                                            <th className="pb-4">Deductions</th>
                                            <th className="pb-4 text-right">Net Payout</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                                        {farmers.map(farmer => {
                                            const farmerCollections = collections.filter(c => 
                                                c.farmerId === farmer.id && 
                                                c.factoryConfirmed && 
                                                new Date(c.collectionDate).getMonth() === filterMonth &&
                                                new Date(c.collectionDate).getFullYear() === filterYear
                                            );
                                            const totalQty = farmerCollections.reduce((s, c) => s + Number(c.finalQuantity), 0);
                                            const gross = totalQty * payoutRate;
                                            
                                            const advances = expenses.filter(ex => 
                                                ex.farmerId === farmer.id && 
                                                ex.category.toLowerCase().includes('advance') &&
                                                new Date(ex.date).getMonth() === filterMonth &&
                                                new Date(ex.date).getFullYear() === filterYear
                                            ).reduce((s, ex) => s + ex.amount, 0);

                                            const deductions = sales.filter(s => 
                                                s.farmerId === farmer.id && 
                                                new Date(s.saleDate).getMonth() === filterMonth &&
                                                new Date(s.saleDate).getFullYear() === filterYear
                                            ).reduce((acc, sa) => acc + sa.amount, 0);

                                            const net = gross - advances - deductions;

                                            if (totalQty === 0 && advances === 0 && deductions === 0) return null;

                                            return (
                                                <tr key={farmer.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                                                    <td className="py-5">
                                                        <p className="text-sm font-black text-slate-900 dark:text-white tracking-tight">{farmer.name}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{farmer.phone}</p>
                                                    </td>
                                                    <td className="py-5">
                                                        <span className="text-sm font-bold dark:text-slate-300">{totalQty.toLocaleString()}</span>
                                                    </td>
                                                    <td className="py-5 font-bold dark:text-slate-200">KES {gross.toLocaleString()}</td>
                                                    <td className="py-5 text-rose-500 font-bold">- KES {advances.toLocaleString()}</td>
                                                    <td className="py-5 text-rose-500 font-bold">- KES {deductions.toLocaleString()}</td>
                                                    <td className="py-5 text-right">
                                                        <span className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black shadow-lg shadow-emerald-500/20 uppercase tracking-widest">
                                                            KES {net.toLocaleString()}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {farmers.filter(farmer => {
                                    const c = collections.some(col => col.farmerId === farmer.id && col.factoryConfirmed && new Date(col.collectionDate).getMonth() === filterMonth && new Date(col.collectionDate).getFullYear() === filterYear);
                                    const e = expenses.some(ex => ex.farmerId === farmer.id && ex.category.toLowerCase().includes('advance') && new Date(ex.date).getMonth() === filterMonth && new Date(ex.date).getFullYear() === filterYear);
                                    const s = sales.some(sa => sa.farmerId === farmer.id && new Date(sa.saleDate).getMonth() === filterMonth && new Date(sa.saleDate).getFullYear() === filterYear);
                                    return c || e || s;
                                }).length === 0 && (
                                    <div className="py-12 text-center border-t border-slate-50 dark:border-slate-800">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No payout data for selected period</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Recent Activity Mini Ledger */}
                        <div className="mt-12 bg-white dark:bg-slate-800 p-10 rounded-[3rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                            <h3 className="text-sm font-black uppercase tracking-widest mb-8">Consolidated Cashbook (Latest Activities)</h3>
                            <div className="space-y-3">
                                {[...income.map(i => ({...i, type: 'income'})), ...expenses.map(e => ({...e, type: 'expense'}))]
                                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                    .slice(0, 8)
                                    .map((item, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-4 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-1 h-8 rounded-full ${item.type === 'income' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                                <div>
                                                    <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-tight">{(item as any).companyName || (item as any).description}</p>
                                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{item.date}</p>
                                                </div>
                                            </div>
                                            <p className={`text-sm font-black ${item.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {item.type === 'income' ? '+' : '-'} KES {item.amount.toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
