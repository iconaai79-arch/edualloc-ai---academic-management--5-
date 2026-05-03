
import React, { useMemo } from 'react';
import { 
    CarListing, 
    CarInvoice, 
    CarPayment, 
    TestDriveBooking, 
    User,
    Institution
} from '../../types';
import { 
    CarIcon, 
    CurrencyIcon, 
    UsersIcon, 
    CalendarDaysIcon,
    ArrowPathIcon,
    PlusIcon,
    CreditCardIcon,
    ChartBarIcon,
    SparklesIcon,
    EyeIcon
} from '../icons';

interface CarShowroomDashboardProps {
    listings: CarListing[];
    invoices: CarInvoice[];
    payments: CarPayment[];
    testDrives: TestDriveBooking[];
    users: User[];
    institution: Institution;
    onAction: (tab: string, subTab?: string) => void;
    onAddListing: () => void;
    onAddInvoice: () => void;
    onAddPayment: () => void;
    onAddLead: () => void;
    onSwitchPerspective: () => void;
}

export const CarShowroomDashboard: React.FC<CarShowroomDashboardProps> = ({
    listings = [],
    invoices = [],
    payments = [],
    testDrives = [],
    users = [],
    institution,
    onAction,
    onAddListing,
    onAddInvoice,
    onAddPayment,
    onAddLead,
    onSwitchPerspective
}) => {
    const stats = useMemo(() => {
        const activeListings = listings.filter(l => l.status === 'active').length;
        const totalSales = invoices.filter(inv => inv.status !== 'cancelled').reduce((sum, inv) => sum + inv.totalAmount, 0);
        const revenueCollected = payments.reduce((sum, pay) => sum + pay.amount, 0);
        const pendingDrives = testDrives.filter(td => td.status === 'pending').length;
        const totalCustomers = new Set(invoices.map(inv => inv.clientName)).size;
        const totalLeads = users.filter(u => u.role === 'lead').length;

        return {
            totalInventory: listings.length,
            activeListings,
            totalSales,
            revenueCollected,
            pendingDrives,
            totalCustomers,
            totalLeads
        };
    }, [listings, invoices, payments, testDrives, users]);

    return (
        <div className="space-y-10 animate-fade-in">
            {/* Header / Brand Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">
                        {institution.name} <span className="text-indigo-600">Showroom Control</span>
                    </h2>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Automotive Operations Command Center</p>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button 
                        onClick={onAddLead}
                        className="flex items-center gap-2 px-6 py-3 bg-amber-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-amber-200 hover:bg-amber-600 transition-all active:scale-95"
                    >
                        <PlusIcon className="w-4 h-4" /> Log Walk-in
                    </button>
                    <button 
                        onClick={onAddListing}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        <PlusIcon className="w-4 h-4" /> Add Vehicle
                    </button>
                    <button 
                        onClick={onAddInvoice}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 text-slate-700 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95"
                    >
                        <CreditCardIcon className="w-4 h-4 text-indigo-600" /> New Invoice
                    </button>
                </div>
            </div>

            {/* KPI Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-50 dark:bg-indigo-900/20 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CarIcon className="w-4 h-4 text-indigo-600" /> Live Inventory
                        </p>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.activeListings}</h3>
                        <p className="text-[10px] font-bold text-slate-400 mt-2">OUT OF {stats.totalInventory} TOTAL UNITS</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-emerald-50 dark:bg-emerald-900/20 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CurrencyIcon className="w-4 h-4 text-emerald-600" /> Revenue Flow
                        </p>
                        <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">KES {stats.revenueCollected.toLocaleString()}</h3>
                        <p className="text-[10px] font-bold text-emerald-600 mt-2 uppercase tracking-widest">Total Collected</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-amber-50 dark:bg-amber-900/20 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <CalendarDaysIcon className="w-4 h-4 text-amber-600" /> Test Drives
                        </p>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.pendingDrives}</h3>
                        <p className="text-[10px] font-bold text-amber-600 mt-2 uppercase tracking-widest">Pending Sessions</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-sky-50 dark:bg-sky-900/20 rounded-full group-hover:scale-125 transition-transform"></div>
                    <div className="relative z-10">
                        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                            <UsersIcon className="w-4 h-4 text-sky-600" /> Showroom Leads
                        </p>
                        <h3 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter">{stats.totalLeads}</h3>
                        <p className="text-[10px] font-bold text-sky-600 mt-2 uppercase tracking-widest">Total Enquiries</p>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Operational Hub */}
                <div className="lg:col-span-8 space-y-8">
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-xl font-black tracking-tighter uppercase mb-8 flex items-center gap-3">
                            <SparklesIcon className="w-5 h-5 text-indigo-600" />
                            Showroom Operations Hub
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <button 
                                onClick={() => onAction('auto_marketplace', 'inventory')}
                                className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-400 transition-all group text-left"
                            >
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                    <CarIcon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-xs uppercase tracking-tight text-slate-900 dark:text-white">Vehicle Registry</span>
                                <p className="text-[9px] text-slate-400 uppercase mt-1">Manage unit details & photos</p>
                            </button>

                            <button 
                                onClick={() => onAction('auto_marketplace', 'financials')}
                                className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-emerald-400 transition-all group text-left"
                            >
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-emerald-600 mb-4 group-hover:scale-110 transition-transform">
                                    <ChartBarIcon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-xs uppercase tracking-tight text-slate-900 dark:text-white">Sales Ledger</span>
                                <p className="text-[9px] text-slate-400 uppercase mt-1">Audit invoices & payments</p>
                            </button>

                            <button 
                                onClick={() => onAction('reports')}
                                className="flex flex-col items-start p-6 bg-indigo-600 text-white rounded-[2rem] shadow-xl shadow-indigo-100 hover:shadow-indigo-300 transition-all group text-left hover:-translate-y-1"
                            >
                                <div className="p-4 bg-white/20 rounded-2xl mb-4 group-hover:scale-110 transition-transform">
                                    <ChartBarIcon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-xs uppercase tracking-tight">Market Analytics</span>
                                <p className="text-[9px] opacity-80 uppercase mt-1">Performance insights</p>
                            </button>



                            <button 
                                onClick={() => onAction('users')}
                                className="flex flex-col items-start p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:border-indigo-400 transition-all group text-left"
                            >
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm text-indigo-600 mb-4 group-hover:scale-110 transition-transform">
                                    <UsersIcon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-xs uppercase tracking-tight text-slate-900 dark:text-white">Sales Agents</span>
                                <p className="text-[9px] text-slate-400 uppercase mt-1">Staff & permissions</p>
                            </button>
                        </div>
                    </div>

                    {/* Recent Unit Sales */}
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xl font-black tracking-tighter uppercase flex items-center gap-3">
                                <ArrowPathIcon className="w-5 h-5 text-emerald-600" />
                                Recent Vehicle Sales
                            </h3>
                            <button 
                                onClick={() => onAction('auto_marketplace', 'financials')}
                                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:underline"
                            >
                                View All
                            </button>
                        </div>
                        <div className="space-y-4">
                            {invoices.slice(0, 5).map(inv => {
                                const listing = listings.find(l => l.id === inv.listingId);
                                return (
                                    <div key={inv.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-50 dark:border-slate-800 group hover:border-indigo-100 transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-indigo-600 transition-colors shadow-sm">
                                                <CarIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                                    {listing ? `${listing.year} ${listing.make} ${listing.model}` : 'Unknown Vehicle'}
                                                </p>
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">
                                                    {inv.clientName} • #{inv.invoiceNumber}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="mt-4 sm:mt-0 text-left sm:text-right">
                                            <p className="text-sm font-black text-slate-900 dark:text-white italic">KES {inv.totalAmount.toLocaleString()}</p>
                                            <span className={`inline-block px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-[0.2em] mt-1 ${
                                                inv.status === 'fully_paid' ? 'bg-emerald-50 text-emerald-600' : 
                                                inv.status === 'partially_paid' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                            }`}>
                                                {inv.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                            {invoices.length === 0 && (
                                <div className="text-center py-12">
                                    <CarIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                    <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">No sales recorded yet</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Sidebar Insights */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Inventory Health */}
                    <div className="bg-slate-900 rounded-[3rem] p-10 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/20 rounded-full blur-3xl"></div>
                        <h3 className="text-lg font-black uppercase tracking-widest mb-8 relative z-10">Inventory Health</h3>
                        <div className="space-y-6 relative z-10">
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400">Active Units</span>
                                    <span>{Math.round((stats.activeListings / (stats.totalInventory || 1)) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(stats.activeListings / (stats.totalInventory || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-400">Collection Rate</span>
                                    <span>{Math.round((stats.revenueCollected / (stats.totalSales || 1)) * 100)}%</span>
                                </div>
                                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(stats.revenueCollected / (stats.totalSales || 1)) * 100}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="mt-10 p-6 bg-white/5 rounded-[2rem] border border-white/10 relative z-10">
                            <p className="text-[10px] font-bold text-slate-300 italic leading-relaxed">
                                "The showroom is currently operating at <span className="text-white font-black">{Math.round((stats.activeListings / (stats.totalInventory || 1)) * 100)}%</span> inventory visibility. Expanding your digital reach could improve lead conversion."
                            </p>
                        </div>
                    </div>

                    {/* Pending Actions Drive */}
                    <div className="bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <h3 className="text-lg font-black uppercase tracking-tighter mb-6">Hot Leads</h3>
                        <div className="space-y-4">
                            {testDrives.filter(td => td.status === 'pending').slice(0, 3).map(td => (
                                <div key={td.id} className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-50 dark:border-slate-800">
                                    <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest">Test Drive Request</p>
                                    <p className="text-sm font-black text-slate-800 dark:text-white mt-1">{td.buyerName || 'Anonymous Client'}</p>
                                    <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(td.bookingDate).toLocaleDateString()} @ {new Date(td.bookingDate).toLocaleTimeString()}</p>
                                    <button 
                                        onClick={() => onAction('auto_marketplace')}
                                        className="mt-4 w-full py-3 bg-white dark:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-500 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 transition-all"
                                    >
                                        Handle Request
                                    </button>
                                </div>
                            ))}
                            {testDrives.filter(td => td.status === 'pending').length === 0 && (
                                <p className="text-center py-8 text-slate-300 text-[10px] font-black uppercase tracking-widest italic">All leads handled</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
