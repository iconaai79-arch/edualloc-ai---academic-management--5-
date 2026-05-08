import React, { useState, useEffect } from 'react';
import {
    User, PMProperty, PMUnit, PMTenant, PMLease, PMPayment, PMTicket,
    Institution, PMLandlord, PMDisbursement
} from '../types';
import { apiService } from '../services/apiService';
import { HomeIcon } from './icons/HomeIcon';
import { BuildingOfficeIcon } from './icons/BuildingOfficeIcon';
import { CurrencyIcon } from './icons/CurrencyIcon';
import { WrenchIcon } from './icons/WrenchIcon';
import { BellIcon } from './icons/BellIcon';
import { UserIcon } from './icons/UserIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { ChartPieIcon } from './icons/ChartPieIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { EnvelopeIcon } from './icons/EnvelopeIcon';
import { ArrowTrendingUpIcon } from './icons/ArrowTrendingUpIcon';
import { ExclamationTriangleIcon } from './icons/ExclamationTriangleIcon';
import { ChatBubbleBottomCenterTextIcon } from './icons/ChatBubbleBottomCenterTextIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { XIcon } from './icons/XIcon';
import { PaperAirplaneIcon } from './icons/PaperAirplaneIcon';

interface LandlordPortalViewProps {
    currentUser?: User;
    currentInstitution?: Institution;
    onLogout?: () => void; onLogAction?: (action: string) => Promise<void>;
}

export const LandlordPortalView: React.FC<LandlordPortalViewProps> = (props) => {
    const { 
        currentUser, 
        currentInstitution = {} as any, 
        onLogout = () => {} 
    } = props;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'financials' | 'maintenance' | 'marketing' | 'profile'>('dashboard');
    const [loading, setLoading] = useState(true);

    // Data states
    const [landlord, setLandlord] = useState<PMLandlord | null>(null);
    const [properties, setProperties] = useState<PMProperty[]>([]);
    const [units, setUnits] = useState<PMUnit[]>([]);
    const [tenants, setTenants] = useState<PMTenant[]>([]);
    const [leases, setLeases] = useState<PMLease[]>([]);
    const [payments, setPayments] = useState<PMPayment[]>([]);
    const [tickets, setTickets] = useState<PMTicket[]>([]);
    const [disbursements, setDisbursements] = useState<PMDisbursement[]>([]);

    // Expansion states
    const [showBroadcastModal, setShowBroadcastModal] = useState(false);
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isSendingBroadcast, setIsSendingBroadcast] = useState(false);
    const [broadcastSuccess, setBroadcastSuccess] = useState(false);

    useEffect(() => {
        const loadLandlordData = async () => {
            setLoading(true);
            try {
                const instId = currentInstitution.id;
                // 1. Fetch all required datasets
                const [landlordList, propList, unitList, tenantList, leaseList, paymentList, ticketList, disbursementList] = await Promise.all([
                    apiService.fetchModuleRecords<PMLandlord>('pm_landlords', instId),
                    apiService.fetchModuleRecords<PMProperty>('pm_properties', instId),
                    apiService.fetchModuleRecords<PMUnit>('pm_units', instId),
                    apiService.fetchModuleRecords<PMTenant>('pm_tenants', instId),
                    apiService.fetchModuleRecords<PMLease>('pm_leases', instId),
                    apiService.fetchModuleRecords<PMPayment>('pm_payments', instId),
                    apiService.fetchModuleRecords<PMTicket>('pm_maintenance', instId),
                    apiService.fetchModuleRecords<PMDisbursement>('pm_disbursements', instId),
                ]);

                // 2. Identify the current landlord
                const currentLandlord = landlordList.find(l => l.email?.toLowerCase() === currentUser.email.toLowerCase());
                setLandlord(currentLandlord || null);

                if (currentLandlord) {
                    // 3. Filter data for this specific landlord's portfolio
                    const myProperties = propList.filter(p => p.landlordId === currentLandlord.id);
                    const myPropIds = new Set(myProperties.map(p => p.id));
                    const myUnits = unitList.filter(u => myPropIds.has(u.propertyId));
                    const myUnitIds = new Set(myUnits.map(u => u.id));
                    const myLeases = leaseList.filter(l => myUnitIds.has(l.unitId));
                    const myLeaseIds = new Set(myLeases.map(l => l.id));
                    const myTenantIds = new Set(myLeases.map(l => l.tenantId));

                    setProperties(myProperties);
                    setUnits(myUnits);
                    setLeases(myLeases);
                    setPayments(paymentList.filter(p => myLeaseIds.has(p.leaseId)));
                    setTenants(tenantList.filter(t => myTenantIds.has(t.id)));
                    setTickets(ticketList.filter(t => myPropIds.has(t.propertyId)));
                    setDisbursements(disbursementList.filter(d => d.landlordId === currentLandlord.id));
                }
            } catch (err) {
                console.error("Failed to load landlord portal data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadLandlordData();
    }, [currentUser, currentInstitution]);

    const totalRevenue = payments.filter(p => p.paymentType === 'Rent').reduce((sum, p) => sum + p.amount, 0);
    const totalCommission = payments.reduce((sum, p) => sum + (p.commissionAmount || 0), 0);
    const netEarnings = totalRevenue - totalCommission;
    const occupancyRate = units.length > 0 ? Math.round((units.filter(u => u.status === 'Occupied').length / units.length) * 100) : 0;

    const today = new Date();
    const sixtyDaysFromNow = new Date();
    sixtyDaysFromNow.setDate(today.getDate() + 60);

    const expiringLeases = leases.filter(l => {
        if (l.status !== 'Active' || !l.endDate) return false;
        const endDateObj = new Date(l.endDate);
        return endDateObj > today && endDateObj <= sixtyDaysFromNow;
    });

    const handleBroadcast = async () => {
        if (!broadcastMessage.trim()) return;
        setIsSendingBroadcast(true);
        try {
            // Simulate API call to send broadcasts to all tenants
            await new Promise(resolve => setTimeout(resolve, 1500));
            setBroadcastSuccess(true);
            setBroadcastMessage('');
            setTimeout(() => {
                setBroadcastSuccess(false);
                setShowBroadcastModal(false);
            }, 2000);
        } catch (err) {
            console.error("Broadcast failed:", err);
        } finally {
            setIsSendingBroadcast(false);
        }
    };

    const handleWithdrawalRequest = async () => {
        if (!landlord) return;

        // Calculate amount from pending payouts
        const pendingPayouts = payments.filter(p => p.landlordPayoutStatus === 'pending' || !p.landlordPayoutStatus);
        const amount = pendingPayouts.reduce((sum, p) => sum + (p.amount - (p.commissionAmount || 0)), 0);

        if (amount <= 0) {
            alert("No funds available for withdrawal at this time.");
            return;
        }

        try {
            const newDisbursement: PMDisbursement = {
                id: `disb_${Date.now()}`,
                landlordId: landlord.id,
                amount,
                status: 'Pending',
                requestDate: new Date().toISOString(),
                bankDetails: landlord.bankDetails,
                institutionId: currentInstitution.id,
                paymentIds: pendingPayouts.map(p => p.id)
            };

            await apiService.saveModuleRecord('pm_disbursements', newDisbursement);

            // Update local state
            setDisbursements([newDisbursement, ...disbursements]);

            // Optimistically update payments in local state (UI only)
            const updatedPayments = payments.map(p =>
                pendingPayouts.some(pp => pp.id === p.id)
                    ? { ...p, landlordPayoutStatus: 'pending' as any }
                    : p
            );
            setPayments(updatedPayments);

            setShowWithdrawModal(false);
            alert(`Withdrawal request for KES ${amount.toLocaleString()} has been submitted. Status: Pending.`);
        } catch (err) {
            console.error("Withdrawal request failed:", err);
            alert("Failed to submit withdrawal request. Please try again later.");
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
                <div className="w-16 h-16 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Preparing your portfolio...</p>
            </div>
        );
    }

    if (!landlord) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 p-6 text-center">
                <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 max-w-md">
                    <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <BuildingOfficeIcon className="w-10 h-10 text-amber-500" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight">No Landlord Profile</h2>
                    <p className="text-slate-500 mb-8 leading-relaxed">
                        We couldn't find a landlord record linked to your email <strong>{currentUser.email}</strong>.
                        Please contact the system administrator.
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
                    <h1 className="text-2xl font-black text-emerald-600 tracking-tighter italic">LL<span className="text-slate-800">PORTAL</span></h1>
                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1 italic">Vested Interests Management</p>
                </div>

                <nav className="space-y-2 flex-1">
                    {[
                        { id: 'dashboard', label: 'Overview', icon: HomeIcon },
                        { id: 'properties', label: 'Properties', icon: BuildingOfficeIcon },
                        { id: 'financials', label: 'Financials', icon: CurrencyIcon },
                        { id: 'maintenance', label: 'Maintenance', icon: WrenchIcon },
                        { id: 'marketing', label: 'Marketing', icon: EnvelopeIcon },
                        { id: 'profile', label: 'Settings', icon: UserIcon },
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-4 w-full p-4 rounded-2xl font-bold transition-all ${activeTab === tab.id ? 'bg-emerald-50 text-emerald-600 shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}
                        >
                            {tab.id === 'maintenance' ? <WrenchIcon className={`w-5 h-5 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'}`} /> :
                                tab.id === 'marketing' ? <EnvelopeIcon className={`w-5 h-5 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'}`} /> :
                                    <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-emerald-600' : 'text-slate-400'}`} />}
                            {tab.label}
                        </button>
                    ))}
                </nav>

                <div className="pt-8 mt-auto border-t border-slate-50">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center font-black text-emerald-600 underline">
                            {currentUser.name[0]}
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 truncate max-w-[140px] uppercase italic">{currentUser.name}</p>
                            <p className="text-[10px] font-bold text-slate-400">Landlord</p>
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
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic capitalize underline decoration-emerald-200 decoration-4 underline-offset-8">
                            {activeTab}
                        </h2>
                        <p className="text-slate-400 font-medium mt-2">Managing your wealth, {currentUser.name.split(' ')[0]}.</p>
                    </div>
                    <div className="flex flex-col items-end mr-4">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Net Portfolio Value</p>
                        <p className="text-xl font-black text-slate-800">KES {netEarnings.toLocaleString()}</p>
                    </div>
                    <button className="w-12 h-12 bg-white rounded-2xl border border-slate-100 flex items-center justify-center relative shadow-sm hover:shadow-md transition-all">
                        <BellIcon className="w-5 h-5 text-slate-400" />
                    </button>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-700">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Total Earnings</p>
                                <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">KES {totalRevenue.toLocaleString()}</h3>
                                <p className="text-[10px] font-bold text-emerald-500 mt-2 flex items-center gap-1"><TrendingUpIcon className="w-3 h-3" /> +12.5% this month</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Commission Paid</p>
                                <h3 className="text-2xl font-black text-red-400 tracking-tighter uppercase italic">KES {totalCommission.toLocaleString()}</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-2 italic">Standard Agency Rates</p>
                            </div>
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Occupancy</p>
                                <h3 className="text-4xl font-black text-slate-800 tracking-tighter italic">{occupancyRate}%</h3>
                                <div className="w-full bg-slate-50 h-1.5 rounded-full mt-4 overflow-hidden">
                                    <div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${occupancyRate}%` }}></div>
                                </div>
                            </div>
                            <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-xl text-white group hover:scale-[1.02] transition-transform relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <SparklesIcon className="w-20 h-20" />
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Net Portfolio Payout</p>
                                <h3 className="text-2xl font-black tracking-tighter uppercase italic">KES {netEarnings.toLocaleString()}</h3>
                                <button
                                    onClick={() => setShowWithdrawModal(true)}
                                    className="mt-4 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-lg shadow-emerald-900/40"
                                >
                                    WITHDRAW FUNDS
                                </button>
                            </div>
                        </div>

                        {/* Lease Renewal Alert */}
                        {expiringLeases.length > 0 && (
                            <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                                        <ExclamationTriangleIcon className="w-6 h-6 text-amber-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest italic">Lease Renewal Pipeline</h4>
                                        <p className="text-slate-500 text-xs mt-1">
                                            <strong>{expiringLeases.length} leases</strong> are expiring within the next 60 days. Start renewals to avoid vacancy.
                                        </p>
                                    </div>
                                </div>
                                <button className="px-6 py-3 bg-white border border-amber-200 text-amber-700 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm">
                                    VIEW EXPIRING LEASES
                                </button>
                            </div>
                        )}

                        {/* Analysis Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                                <div className="flex items-center justify-between mb-10">
                                    <div>
                                        <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest italic">Portfolio Performance</h4>
                                        <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Growth Index & Occupancy Heatmap</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button className="px-3 py-1 bg-slate-50 rounded-lg text-[9px] font-black text-slate-400 uppercase hover:bg-slate-100 transition-all">Month</button>
                                        <button className="px-3 py-1 bg-emerald-600 rounded-lg text-[9px] font-black text-white uppercase shadow-lg shadow-emerald-100">Year</button>
                                    </div>
                                </div>

                                <div className="h-64 flex items-end justify-between gap-4 px-4 border-b border-slate-50 mb-8">
                                    {[65, 40, 85, 95, 70, 90, 80, 60, 75, 85, 95, 100].map((val, i) => (
                                        <div key={i} className="flex-1 flex flex-col items-center gap-3">
                                            <div className="w-full bg-emerald-50 rounded-t-xl relative group cursor-pointer" style={{ height: `${val}%` }}>
                                                <div className="absolute inset-0 bg-emerald-500 opacity-20 rounded-t-xl group-hover:opacity-40 transition-opacity"></div>
                                                {val > 90 && <div className="absolute inset-0 bg-gradient-to-t from-emerald-600/0 to-emerald-400/30 rounded-t-xl"></div>}
                                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-black px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                                    {val}% FULL
                                                </div>
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 uppercase">{['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}</span>
                                        </div>
                                    ))}
                                </div>

                                <div className="space-y-4">
                                    {properties.map(p => {
                                        const pUnits = units.filter(u => u.propertyId === p.id);
                                        const occ = pUnits.length > 0 ? (pUnits.filter(u => u.status === 'Occupied').length / pUnits.length) * 100 : 0;
                                        return (
                                            <div key={p.id} className="p-6 bg-slate-50 rounded-[2rem] hover:bg-emerald-50/50 transition-colors border border-transparent hover:border-emerald-100 flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
                                                        <BuildingOfficeIcon className="w-6 h-6 text-slate-400" />
                                                    </div>
                                                    <div>
                                                        <h5 className="font-black text-slate-800 italic uppercase mb-1">{p.name}</h5>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.address}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-slate-800 italic">{Math.round(occ)}%</p>
                                                    <div className="w-24 bg-slate-200 h-1.5 rounded-full mt-1 overflow-hidden">
                                                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${occ}%` }}></div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col">
                                <div className="flex items-center justify-between mb-8">
                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest italic">Maintenance Desk</h4>
                                    <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[9px] font-black uppercase">{tickets.filter(t => t.status !== 'Resolved').length} Active</span>
                                </div>
                                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                                    {tickets.filter(t => t.status !== 'Resolved').slice(0, 6).map(t => (
                                        <div key={t.id} className="p-4 border border-slate-50 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer group">
                                            <div className="flex items-center justify-between mb-2">
                                                <p className="text-xs font-black text-slate-800 uppercase italic group-hover:text-emerald-600 transition-colors">{t.title}</p>
                                                <span className={`text-[8px] font-black px-2 py-0.5 rounded uppercase ${t.priority === 'High' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>{t.priority}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-4 h-4 bg-slate-100 rounded-full flex items-center justify-center">
                                                        <UserIcon className="w-2 h-2 text-slate-400" />
                                                    </div>
                                                    <p className="text-[10px] text-slate-400 font-bold">Unit {units.find(u => u.id === t.unitId)?.unitNumber || 'N/A'}</p>
                                                </div>
                                                <span className="text-[9px] font-bold text-slate-300">{new Date(t.createdAt).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {tickets.filter(t => t.status !== 'Resolved').length === 0 && (
                                        <div className="flex flex-col items-center justify-center h-full opacity-30 italic font-black text-slate-400">
                                            <WrenchIcon className="w-12 h-12 mb-4" />
                                            <p>All cleared up!</p>
                                        </div>
                                    )}
                                </div>
                                <button className="mt-8 w-full py-4 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-100 transition-all" onClick={() => setActiveTab('maintenance')}>
                                    Full Maintenance Hub
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {activeTab === 'properties' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-in zoom-in-95 duration-500">
                        {units.map(u => {
                            const p = properties.find(prop => prop.id === u.propertyId);
                            const activeLease = leases.find(l => l.unitId === u.id && l.status === 'Active');
                            const tenant = activeLease ? tenants.find(t => t.id === activeLease.tenantId) : null;

                            return (
                                <div key={u.id} className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden flex flex-col hover:shadow-2xl transition-all h-[400px]">
                                    <div className="p-8 flex-1">
                                        <div className="flex justify-between items-start mb-6">
                                            <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${u.status === 'Occupied' ? 'bg-indigo-50 text-indigo-500' : 'bg-emerald-50 text-emerald-500'}`}>
                                                {u.status}
                                            </span>
                                            <p className="font-black text-slate-800 text-lg italic uppercase">{u.unitNumber}</p>
                                        </div>
                                        <h4 className="text-sm font-black text-slate-800 uppercase italic mb-1">{p?.name}</h4>
                                        <p className="text-xs font-bold text-slate-400 mb-6 italic">{u.unitType}</p>

                                        <div className="space-y-4 pt-4 border-t border-slate-50">
                                            <div className="flex items-center justify-between text-xs">
                                                <p className="font-bold text-slate-400 uppercase italic">Monthly Rent</p>
                                                <p className="font-black text-slate-800">KES {u.rentAmount.toLocaleString()}</p>
                                            </div>
                                            <div className="flex items-center justify-between text-xs">
                                                <p className="font-bold text-slate-400 uppercase italic">Current Tenant</p>
                                                <p className="font-black text-indigo-600 truncate max-w-[120px] uppercase italic">{tenant?.name || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-6 flex justify-between items-center">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Commission: {p?.commissionRate || 0}%</p>
                                        <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:underline flex items-center gap-1">Details <ArrowRightIcon className="w-3 h-3" /></button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {activeTab === 'marketing' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                            <div className="flex items-center justify-between mb-12">
                                <div>
                                    <h4 className="font-black text-slate-800 uppercase text-xs tracking-widest italic">Tenant Communications</h4>
                                    <p className="text-slate-400 text-[10px] font-bold uppercase mt-1">Broadcast announcements & alerts to your entire portfolio</p>
                                </div>
                                <button
                                    onClick={() => setShowBroadcastModal(true)}
                                    className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-emerald-100"
                                >
                                    <ChatBubbleBottomCenterTextIcon className="w-4 h-4" /> New Broadcast
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Total Tenants</p>
                                    <h3 className="text-2xl font-black text-slate-800 italic">{tenants.length}</h3>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Active Reach</p>
                                    <h3 className="text-2xl font-black text-emerald-600 italic">100%</h3>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Delivery Method</p>
                                    <h3 className="text-2xl font-black text-slate-800 italic uppercase">PORTAL + SMS</h3>
                                </div>
                            </div>

                            <h5 className="font-black text-slate-800 uppercase text-[10px] tracking-widest mb-6 italic underline decoration-emerald-200 decoration-2 underline-offset-4">Recent Broadcasts</h5>
                            <div className="space-y-4">
                                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between hover:shadow-md transition-shadow">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                            <BellIcon className="w-5 h-5 text-indigo-500" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase italic">Water Maintenance Scheduled</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Sent to all units • 2 days ago</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-emerald-500 uppercase">Delivered</span>
                                </div>
                                <div className="p-6 bg-white border border-slate-100 rounded-[2rem] flex items-center justify-between hover:shadow-md transition-shadow opacity-60">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center">
                                            <SparklesIcon className="w-5 h-5 text-slate-400" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-slate-800 uppercase italic">New Year Greetings</p>
                                            <p className="text-[9px] text-slate-400 font-bold uppercase">Sent to all units • Jan 1, 2026</p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase">Archived</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financials' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="bg-white overflow-hidden rounded-[3rem] border border-slate-100 shadow-2xl">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Tx Date</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Unit / Property</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Gross Rent</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Commission</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-right">Net Received</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {payments.map(p => {
                                        const lease = leases.find(l => l.id === p.leaseId);
                                        const u = units.find(u => u.id === lease?.unitId);
                                        const prop = properties.find(prop => prop.id === u?.propertyId);
                                        return (
                                            <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                                <td className="p-6 text-sm font-bold text-slate-600">{new Date(p.paymentDate).toLocaleDateString()}</td>
                                                <td className="p-6">
                                                    <p className="text-xs font-black text-slate-800 uppercase italic">{u?.unitNumber}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{prop?.name}</p>
                                                </td>
                                                <td className="p-6 font-bold text-slate-600">KES {p.amount.toLocaleString()}</td>
                                                <td className="p-6 font-bold text-red-400">-{(p.commissionAmount || 0).toLocaleString()}</td>
                                                <td className="p-6 text-right font-black text-emerald-600">KES {(p.amount - (p.commissionAmount || 0)).toLocaleString()}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {payments.length === 0 && <p className="text-center py-32 text-slate-400 font-black italic">No transaction records found.</p>}
                        </div>
                    </div>
                )}

            </main>

            {/* Broadcast Modal */}
            {showBroadcastModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowBroadcastModal(false)}
                            className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>

                        <div className="mb-8">
                            <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center mb-6">
                                <EnvelopeIcon className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 italic uppercase underline decoration-emerald-200 decoration-4 underline-offset-4">New Portfolio Broadcast</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-2">Reaching {tenants.length} tenants across {properties.length} properties</p>
                        </div>

                        {!broadcastSuccess ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Broadcast Message</label>
                                    <textarea
                                        value={broadcastMessage}
                                        onChange={(e) => setBroadcastMessage(e.target.value)}
                                        placeholder="Type your announcement here..."
                                        rows={6}
                                        className="w-full p-6 bg-slate-50 border border-slate-100 rounded-3xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all text-slate-800 font-medium placeholder:text-slate-300 resize-none"
                                    />
                                </div>

                                <div className="flex gap-4">
                                    <button
                                        onClick={handleBroadcast}
                                        disabled={isSendingBroadcast || !broadcastMessage.trim()}
                                        className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 disabled:opacity-50 flex items-center justify-center gap-2"
                                    >
                                        {isSendingBroadcast ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                Broadcasting...
                                            </>
                                        ) : (
                                            <>
                                                <PaperAirplaneIcon className="w-4 h-4" /> Send Now
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="py-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-500">
                                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
                                    <CheckCircleIcon className="w-10 h-10 text-white" />
                                </div>
                                <h4 className="text-xl font-black text-slate-800 uppercase italic">Message Sent!</h4>
                                <p className="text-slate-400 text-xs font-bold uppercase mt-2">Broadcast successfully delivered to all tenant portals.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* Withdrawal Modal */}
            {showWithdrawModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl p-10 relative animate-in zoom-in-95 duration-300">
                        <button
                            onClick={() => setShowWithdrawModal(false)}
                            className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <XIcon className="w-5 h-5" />
                        </button>

                        <div className="mb-8">
                            <div className="w-16 h-16 bg-emerald-50 rounded-[1.5rem] flex items-center justify-center mb-6">
                                <CurrencyIcon className="w-8 h-8 text-emerald-600" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-800 italic uppercase underline decoration-emerald-200 decoration-4 underline-offset-4">Request Portfolio Payout</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase mt-2">Available for withdrawal: <span className="text-emerald-600">KES {netEarnings.toLocaleString()}</span></p>
                        </div>

                        <div className="space-y-6">
                            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Settlement Destination</h4>
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                        <BuildingOfficeIcon className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-800 uppercase italic">Bank Transfer</p>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase">{landlord.bankDetails || 'No bank details provided'}</p>
                                    </div>
                                </div>
                                {!landlord.bankDetails && (
                                    <p className="mt-4 text-[9px] font-black text-rose-500 uppercase italic flex items-center gap-1">
                                        <InformationCircleIcon className="w-3 h-3" /> Please update your bank details in settings
                                    </p>
                                )}
                            </div>

                            <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100">
                                <p className="text-[10px] font-bold text-amber-700 leading-relaxed italic">
                                    Requests are processed within 24-48 business hours. You will receive an SMS and Portal notification once the funds are disbursed.
                                </p>
                            </div>

                            <button
                                onClick={handleWithdrawalRequest}
                                disabled={netEarnings <= 0 || !landlord.bankDetails}
                                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-100 disabled:opacity-50"
                            >
                                CONFIRM WITHDRAWAL
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

