import React, { useState, useEffect } from 'react';
import {
    User, PMProperty, PMUnit, PMTenant, PMLease, PMPayment, PMTicket,
    Institution
} from '../types';
import { apiService } from '../services/apiService';
import {
    HomeIcon, CreditCardIcon, WrenchIcon, FileTextIcon,
    BellIcon, UserIcon, ArrowRightOnRectangleIcon, ArrowRightIcon
} from './icons/index';

interface TenantPortalViewProps {
    currentUser: User;
    currentInstitution: Institution;
    onLogout: () => void;
}

export const TenantPortalView: React.FC<TenantPortalViewProps> = ({ currentUser, currentInstitution, onLogout }) => {
    const [activeTab, setActiveTab] = useState<'dashboard' | 'lease' | 'payments' | 'maintenance' | 'profile'>('dashboard');
    const [loading, setLoading] = useState(true);

    // Data states
    const [tenant, setTenant] = useState<PMTenant | null>(null);
    const [leases, setLeases] = useState<PMLease[]>([]);
    const [payments, setPayments] = useState<PMPayment[]>([]);
    const [tickets, setTickets] = useState<PMTicket[]>([]);
    const [units, setUnits] = useState<PMUnit[]>([]);
    const [properties, setProperties] = useState<PMProperty[]>([]);

    useEffect(() => {
        const loadTenantData = async () => {
            setLoading(true);
            try {
                const instId = currentInstitution.id;
                // Find the tenant record associated with this user's email
                const allTenants = await apiService.fetchModuleRecords<PMTenant>('pm_tenants', instId);
                const myTenant = allTenants.find(t => t.email?.toLowerCase() === currentUser.email.toLowerCase());

                if (myTenant) {
                    setTenant(myTenant);
                    // Fetch related records
                    const [leaseList, paymentList, ticketList, unitList, propList] = await Promise.all([
                        apiService.fetchModuleRecords<PMLease>('pm_leases', instId),
                        apiService.fetchModuleRecords<PMPayment>('pm_payments', instId),
                        apiService.fetchModuleRecords<PMTicket>('pm_maintenance', instId),
                        apiService.fetchModuleRecords<PMUnit>('pm_units', instId),
                        apiService.fetchModuleRecords<PMProperty>('pm_properties', instId)
                    ]);

                    setLeases(leaseList.filter(l => l.tenantId === myTenant.id));
                    const myLeaseIds = new Set(leaseList.filter(l => l.tenantId === myTenant.id).map(l => l.id));
                    setPayments(paymentList.filter(p => myLeaseIds.has(p.leaseId)));
                    const myUnitIds = new Set(leaseList.filter(l => l.tenantId === myTenant.id).map(l => l.unitId));
                    setTickets(ticketList.filter(t => myUnitIds.has(t.unitId || '')));
                    setUnits(unitList);
                    setProperties(propList);
                }
            } catch (err) {
                console.error("Failed to load tenant portal data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadTenantData();
    }, [currentUser, currentInstitution]);

    const activeLease = leases.find(l => l.status === 'Active');
    const property = activeLease ? properties.find(p => p.id === (units.find(u => u.id === activeLease.unitId)?.propertyId)) : null;
    const unit = activeLease ? units.find(u => u.id === activeLease.unitId) : null;

    const totalPaid = payments.filter(p => p.paymentType === 'Rent').reduce((sum, p) => sum + p.amount, 0);
    // Rough balance calculation based on months since start
    const monthsActive = activeLease ? Math.max(1, Math.ceil((new Date().getTime() - new Date(activeLease.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;
    const totalDue = activeLease ? (monthsActive * activeLease.rentAmount) + activeLease.depositAmount : 0;
    const balance = totalDue - totalPaid;

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Setting up your portal...</p>
            </div>
        );
    }

    if (!tenant) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 max-w-md">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <HomeIcon className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">No Tenant Profile Found</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        We couldn't find a tenant record linked to your email <strong>{currentUser.email}</strong>.
                        Please contact your property manager to link your account.
                    </p>
                    <button onClick={onLogout} className="flex items-center justify-center gap-2 w-full py-4 bg-slate-800 text-white rounded-2xl font-bold hover:bg-slate-900 transition-all">
                        <ArrowRightOnRectangleIcon className="w-5 h-5" /> Logout
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafbff] flex">
            {/* Sidebar */}
            <aside className="w-80 bg-white border-r border-slate-100 flex flex-col p-8 fixed h-full z-10">
                <div className="mb-12">
                    <h1 className="text-2xl font-black text-indigo-600 tracking-tighter italic">TENANT<span className="text-slate-800">CONNECT</span></h1>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Premium Property Access</p>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: 'dashboard', label: 'Dashboard', icon: HomeIcon },
                        { id: 'lease', label: 'My Lease', icon: FileTextIcon },
                        { id: 'payments', label: 'Payments', icon: CreditCardIcon },
                        { id: 'maintenance', label: 'Maintenance', icon: WrenchIcon },
                        { id: 'profile', label: 'Settings', icon: UserIcon },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-4 w-full p-4 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-indigo-50 text-indigo-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            {tab.id === 'maintenance' ? <WrenchIcon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} /> : <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />}
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="pt-8 mt-auto border-t border-slate-50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center font-black text-indigo-600 underline">
                            {currentUser.name[0]}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 truncate max-w-[140px] uppercase italic">{currentUser.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">Tenant</p>
                        </div>
                    </div>
                    <button onClick={onLogout} className="flex items-center gap-3 text-red-500 font-bold hover:bg-red-50 w-full p-3 rounded-xl transition-all">
                        <ArrowRightOnRectangleIcon className="w-4 h-4" /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 ml-80 p-12">
                <header className="flex items-center justify-between mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic capitalize">
                            {activeTab}
                        </h2>
                        <p className="text-slate-400 font-medium">Welcome back, {currentUser.name.split(' ')[0]}!</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center relative shadow-sm hover:shadow-md transition-all">
                            <BellIcon className="w-5 h-5 text-slate-400" />
                            <span className="absolute top-3 right-3 w-2 h-2 bg-indigo-600 rounded-full border-2 border-white"></span>
                        </button>
                    </div>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Rental Balance</p>
                                <h3 className={`text-4xl font-black tracking-tighter ${balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    KES {Math.abs(balance).toLocaleString()}
                                </h3>
                                <p className="text-xs font-bold text-slate-400 mt-2">{balance > 0 ? 'Outstanding Dues' : 'Account in Good Standing'}</p>
                            </div>
                            <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-8 rounded-[2.5rem] shadow-xl text-white group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mb-4 italic">Current Apartment</p>
                                <h3 className="text-2xl font-black leading-tight italic">
                                    {unit ? `${unit.unitNumber}, ${property?.name || 'Loading...'}` : 'No Active Lease'}
                                </h3>
                                <div className="mt-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                                    <p className="text-xs font-black text-indigo-100 tracking-wider">ACTIVE RESIDENT</p>
                                </div>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Next Rent Due</p>
                                <h3 className="text-3xl font-black text-slate-800 tracking-tighter">
                                    {activeLease ? 'Apr 1st, 2026' : 'N/A'}
                                </h3>
                                <p className="text-xs font-bold text-indigo-600 mt-2 hover:underline cursor-pointer flex items-center gap-1 group">
                                    Pay Now <ArrowRightIcon className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                                </p>
                            </div>
                        </div>

                        {/* Recent Activity & Maintenance */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest italic">Recent Transactions</h4>
                                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">View All</button>
                                </div>
                                <div className="space-y-4">
                                    {payments.slice(0, 4).map(payment => (
                                        <div key={payment.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-emerald-500 italic font-black">
                                                    $
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 italic uppercase">Rent Payment</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{new Date(payment.paymentDate).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <p className="font-black text-slate-800">+{payment.amount.toLocaleString()}</p>
                                        </div>
                                    ))}
                                    {payments.length === 0 && <p className="text-center text-slate-400 py-8 font-bold italic">No recent payments found.</p>}
                                </div>
                            </div>

                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest italic">Active Tickets</h4>
                                    <button className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">New Request</button>
                                </div>
                                <div className="space-y-4">
                                    {tickets.slice(0, 4).map(ticket => (
                                        <div key={ticket.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center ${ticket.status === 'Resolved' ? 'text-emerald-500' : 'text-amber-500'}`}>
                                                    <WrenchIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 italic uppercase">{ticket.title}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold">{ticket.status} • {ticket.priority}</p>
                                                </div>
                                            </div>
                                            <ArrowRightIcon className="w-4 h-4 text-slate-300" />
                                        </div>
                                    ))}
                                    {tickets.length === 0 && <p className="text-center text-slate-400 py-8 font-bold italic">No active maintenance tickets.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'lease' && (
                    <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-500">
                        {activeLease ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                <div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-8 italic uppercase tracking-tighter">Agreement Details</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Lease ID</p>
                                            <p className="font-black text-slate-800 uppercase">{activeLease.id}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Start Date</p>
                                            <p className="font-black text-slate-800">{new Date(activeLease.startDate).toLocaleDateString()}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Rent Amount</p>
                                            <p className="font-black text-indigo-600">KES {activeLease.rentAmount.toLocaleString()}/mo</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Deposit Paid</p>
                                            <p className="font-black text-slate-800">KES {activeLease.depositAmount.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="mt-12 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                            "Your lease is governed by the standard residential agreement terms.
                                            Contact management for renewal or termination notice periods."
                                        </p>
                                    </div>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-2xl font-black text-slate-800 mb-8 italic uppercase tracking-tighter">Property Rules</h3>
                                    <ul className="space-y-4">
                                        {['No loud music after 10 PM', 'Dispose of waste in designated bins', 'Report damages immediately', 'Guest overnight stays limit: 3 days'].map((rule, i) => (
                                            <li key={i} className="flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl text-slate-700 font-bold text-sm italic">
                                                <div className="w-2 h-2 bg-indigo-500 rounded-full"></div> {rule}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ) : (
                            <p className="text-center py-20 text-slate-400 font-black italic">No active lease agreement found.</p>
                        )}
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                            <table className="w-full text-left">
                                <thead className="border-b border-slate-50">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Date</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Description</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Method</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(p => (
                                        <tr key={p.id} className="border-b border-slate-50/50 hover:bg-slate-50/50 transition-colors">
                                            <td className="p-6 font-bold text-slate-600 text-sm">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                            <td className="p-6 font-black text-slate-800 uppercase italic text-sm">{p.paymentType}</td>
                                            <td className="p-6">
                                                <span className="bg-white border border-slate-100 px-3 py-1 rounded-lg text-[10px] font-black text-slate-400 uppercase">{p.paymentMethod}</span>
                                            </td>
                                            <td className="p-6 text-right font-black text-slate-800">KES {p.amount.toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {payments.length === 0 && <p className="text-center py-20 text-slate-400 font-black italic">No transaction history.</p>}
                        </div>
                    </div>
                )}

                {activeTab === 'maintenance' && (
                    <div className="space-y-8 animate-in slide-in-from-right-8 duration-500">
                        <div className="flex justify-end">
                            <button className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all italic tracking-tighter uppercase">
                                + Log New Ticket
                            </button>
                        </div>
                        <div className="grid grid-cols-1 gap-6">
                            {tickets.map(t => (
                                <div key={t.id} className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center justify-between group hover:border-indigo-200 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center shadow-inner ${t.status === 'Resolved' ? 'bg-emerald-50 text-emerald-500' : 'bg-amber-50 text-amber-500'}`}>
                                            <WrenchIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h4 className="text-xl font-black text-slate-800 tracking-tighter uppercase italic">{t.title}</h4>
                                            <p className="text-sm text-slate-400 font-bold mt-1 max-w-md line-clamp-1">{t.description}</p>
                                            <div className="flex items-center gap-4 mt-3">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${t.priority === 'High' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>{t.priority}</span>
                                                <span className="text-[10px] font-bold text-slate-300 uppercase underline decoration-dotted">{new Date(t.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-6 py-2 rounded-2xl text-xs font-black uppercase italic ${t.status === 'Resolved' ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-500'}`}>
                                            {t.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {tickets.length === 0 && <p className="text-center py-20 bg-white rounded-[3rem] text-slate-400 font-black italic shadow-inner">You haven't raised any maintenance requests yet.</p>}
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};
