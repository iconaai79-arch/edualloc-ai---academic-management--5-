import React, { useState, useEffect } from 'react';
import {
    User, PMProperty, PMUnit, PMTenant, PMLease, PMPayment, PMTicket,
    Institution, AppNotification, PMInvoice
} from '../types';
import { apiService } from '../services/apiService';
import { HomeIcon } from './icons/HomeIcon';
import { CreditCardIcon } from './icons/CreditCardIcon';
import { WrenchIcon } from './icons/WrenchIcon';
import { FileTextIcon } from './icons/FileTextIcon';
import { BellIcon } from './icons/BellIcon';
import { UserIcon } from './icons/UserIcon';
import { ArrowRightOnRectangleIcon } from './icons/ArrowRightOnRectangleIcon';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

import { NotificationBell } from './NotificationBell';

interface TenantPortalViewProps {
    currentUser?: User;
    currentInstitution?: Institution;
    onLogout?: () => void;
    onLogAction?: (action: string) => Promise<void>;
}

export const TenantPortalView: React.FC<TenantPortalViewProps> = (props) => {
    const { 
        currentUser, 
        currentInstitution = {} as any, 
        onLogout = () => {} 
    } = props;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'lease' | 'payments' | 'maintenance' | 'profile'>('dashboard');
    const [paymentSubTab, setPaymentSubTab] = useState<'history' | 'invoices'>('history');
    const [loading, setLoading] = useState(true);

    const [showVacateModal, setShowVacateModal] = useState(false);
    const [submittingNotice, setSubmittingNotice] = useState(false);
    const [vacateDate, setVacateDate] = useState('');
    const [poBox, setPoBox] = useState('Eldoret');
    const [waterAcc, setWaterAcc] = useState('');
    const [electricityAcc, setElectricityAcc] = useState('');
    const [bankName, setBankName] = useState('');
    const [bankAccName, setBankAccName] = useState('');
    const [bankAccNo, setBankAccNo] = useState('');
    const [bankBranch, setBankBranch] = useState('');

    const handleSubmitNotice = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeLease || !tenant) return;
        setSubmittingNotice(true);
        try {
            const noticeId = `ntc_${Date.now()}`;
            const messageBodyObj = {
                poBox,
                waterAccount: waterAcc,
                electricityAccount: electricityAcc,
                bankDetails: {
                    bankName,
                    accountName: bankAccName,
                    accountNumber: bankAccNo,
                    branch: bankBranch
                }
            };
            const newNotice = {
                id: noticeId,
                leaseId: activeLease.id,
                tenantId: tenant.id,
                noticeType: 'Vacate' as any,
                issueDate: new Date().toISOString(),
                effectiveDate: new Date(vacateDate).toISOString(),
                subject: `Vacation Notice - Unit ${unit?.unitNumber || '—'}`,
                messageBody: JSON.stringify(messageBodyObj),
                status: 'Issued' as any,
                institutionId: currentInstitution.id!,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_notices', newNotice);
            alert("Vacation notice submitted successfully!");
            setShowVacateModal(false);
            setVacateDate('');
            setWaterAcc('');
            setElectricityAcc('');
            setBankName('');
            setBankAccName('');
            setBankAccNo('');
            setBankBranch('');
        } catch (err: any) {
            alert("Failed to submit notice: " + (err.message || err));
        } finally {
            setSubmittingNotice(false);
        }
    };

    const handleSubmitWhtCert = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!selectedInvoiceForWht) return;
        if (!whtFile) {
            alert("Please select a certificate document to upload.");
            return;
        }

        setUploadingWht(true);
        try {
            const formData = new FormData(e.currentTarget);
            const certNo = formData.get('certNo') as string;
            const certDate = formData.get('certDate') as string;

            if (!certNo.trim() || !certDate) {
                alert("Please fill in all required fields.");
                return;
            }

            const fileUrl = await apiService.uploadFile(
                'eduai', 
                `leases/wht_certs/${selectedInvoiceForWht.id}_${Date.now()}`, 
                whtFile
            );

            const updatedInvoice: PMInvoice = {
                ...selectedInvoiceForWht,
                withholdingStatus: 'submitted',
                withholdingCertificateNumber: certNo,
                withholdingCertificateDate: certDate,
                withholdingCertificateUrl: fileUrl || undefined
            };

            await apiService.saveModuleRecord('pm_invoices', updatedInvoice);
            alert("Withholding Tax certificate submitted successfully! Your property manager will verify it shortly.");
            setShowUploadWhtModal(false);
            setSelectedInvoiceForWht(null);
            setWhtFile(null);
            loadTenantData();
        } catch (err: any) {
            alert("Failed to submit certificate: " + (err.message || err));
        } finally {
            setUploadingWht(false);
        }
    };

    // Data states
    const [tenant, setTenant] = useState<PMTenant | null>(null);
    const [leases, setLeases] = useState<PMLease[]>([]);
    const [payments, setPayments] = useState<PMPayment[]>([]);
    const [tickets, setTickets] = useState<PMTicket[]>([]);
    const [units, setUnits] = useState<PMUnit[]>([]);
    const [properties, setProperties] = useState<PMProperty[]>([]);
    const [invoices, setInvoices] = useState<PMInvoice[]>([]);
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [showUploadWhtModal, setShowUploadWhtModal] = useState(false);
    const [selectedInvoiceForWht, setSelectedInvoiceForWht] = useState<PMInvoice | null>(null);
    const [uploadingWht, setUploadingWht] = useState(false);
    const [whtFile, setWhtFile] = useState<File | null>(null);

    const loadTenantData = async () => {
        if (!currentUser) return;
        setLoading(true);
        try {
            const instId = currentInstitution.id;
            const allTenants = await apiService.fetchModuleRecords<PMTenant>('pm_tenants', instId);
            const myTenant = allTenants.find(t => t.email?.toLowerCase() === currentUser.email.toLowerCase());

            if (myTenant) {
                setTenant(myTenant);
                const [leaseList, paymentList, ticketList, unitList, propList, invoiceList] = await Promise.all([
                    apiService.fetchModuleRecords<PMLease>('pm_leases', instId),
                    apiService.fetchModuleRecords<PMPayment>('pm_payments', instId),
                    apiService.fetchModuleRecords<PMTicket>('pm_maintenance', instId),
                    apiService.fetchModuleRecords<PMUnit>('pm_units', instId),
                    apiService.fetchModuleRecords<PMProperty>('pm_properties', instId),
                    apiService.fetchModuleRecords<PMInvoice>('pm_invoices', instId)
                ]);

                const myLeases = leaseList.filter(l => l.tenantId === myTenant.id);
                setLeases(myLeases);
                const myLeaseIds = new Set(myLeases.map(l => l.id));
                setPayments(paymentList.filter(p => myLeaseIds.has(p.leaseId)));
                setInvoices(invoiceList.filter(i => myLeaseIds.has(i.leaseId)));
                const myUnitIds = new Set(myLeases.map(l => l.unitId));
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

    useEffect(() => {
        const loadNotifications = async () => {
            if (!currentUser) return;
            try {
                const data = await apiService.fetchNotifications(currentUser.id);
                setNotifications(data);
            } catch (err) {
                console.error("Failed to load notifications:", err);
            }
        };

        loadTenantData();
        loadNotifications();
    }, [currentUser, currentInstitution]);

    const handleMarkAsRead = async (id?: string) => {
        if (!currentUser) return;
        try {
            if (id) {
                await apiService.markNotificationAsRead(id);
                setNotifications(notifications.map(n => n.id === id ? { ...n, isRead: true } : n));
            } else {
                await apiService.markAllNotificationsAsRead(currentUser.id);
                setNotifications(notifications.map(n => ({ ...n, isRead: true })));
            }
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    const activeLease = leases.find(l => l.status === 'Active');
    const property = activeLease ? properties.find(p => p.id === (units.find(u => u.id === activeLease.unitId)?.propertyId)) : null;
    const unit = activeLease ? units.find(u => u.id === activeLease.unitId) : null;

    const totalPaid = payments.filter(p => p.paymentType === 'Rent').reduce((sum, p) => sum + p.amount, 0);
    // Rough balance calculation based on months since start
    const monthsActive = activeLease ? Math.max(1, Math.ceil((new Date().getTime() - new Date(activeLease.startDate).getTime()) / (1000 * 60 * 60 * 24 * 30))) : 0;
    const totalDue = activeLease ? (monthsActive * activeLease.rentAmount) + activeLease.depositAmount : 0;
    const balance = totalDue - totalPaid;

    if (loading || !currentUser) {
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
        <div className="min-h-screen bg-[#fafbff] flex flex-col md:flex-row">
            {/* Sidebar (Desktop Only) */}
            <aside className="hidden md:flex w-80 bg-white border-r border-slate-100 flex-col p-8 fixed h-full z-10">
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

            {/* Bottom Navigation (Mobile/Android App Only) */}
            <div className="flex md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 items-center justify-around z-40 shadow-lg px-2">
                {[
                    { id: 'dashboard', label: 'Home', icon: HomeIcon },
                    { id: 'lease', label: 'Lease', icon: FileTextIcon },
                    { id: 'payments', label: 'Pay', icon: CreditCardIcon },
                    { id: 'maintenance', label: 'Fix', icon: WrenchIcon },
                    { id: 'profile', label: 'Settings', icon: UserIcon },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex flex-col items-center justify-center gap-1 flex-1 py-1 rounded-xl transition-all ${
                            activeTab === tab.id ? 'text-indigo-600 font-black' : 'text-slate-400 font-medium'
                        }`}
                    >
                        {tab.id === 'maintenance' ? (
                            <WrenchIcon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        ) : (
                            <tab.icon className={`w-5 h-5 ${activeTab === tab.id ? 'text-indigo-600' : 'text-slate-400'}`} />
                        )}
                        <span className="text-[9px] uppercase tracking-wider">{tab.label}</span>
                    </button>
                ))}
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-80 p-4 md:p-12 pb-24 md:pb-12">
                <header className="flex items-center justify-between mb-12">
                    <div>
                        <h2 className="text-4xl font-black text-slate-800 tracking-tighter italic capitalize">
                            {activeTab}
                        </h2>
                        <p className="text-slate-400 font-medium">Welcome back, {(currentUser?.name || 'User').split(' ')[0]}!</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <NotificationBell
                            notifications={notifications}
                            onMarkAsRead={handleMarkAsRead}
                        />
                    </div>
                </header>

                {activeTab === 'dashboard' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 group hover:scale-[1.02] transition-transform">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 italic">Rental Balance</p>
                                <h3 className={`text-4xl font-black tracking-tighter ${balance > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    KES {Math.abs(balance)?.toLocaleString()}
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
                                            <p className="font-black text-slate-800">+{payment.amount?.toLocaleString()}</p>
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
                                            <p className="font-black text-indigo-600">KES {activeLease.rentAmount?.toLocaleString()}/mo</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Deposit Paid</p>
                                            <p className="font-black text-slate-800">KES {activeLease.depositAmount?.toLocaleString()}</p>
                                        </div>
                                    </div>

                                    <div className="mt-12 p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                                        <p className="text-xs font-bold text-slate-600 leading-relaxed italic">
                                            "Your lease is governed by the standard residential agreement terms.
                                            Contact management for renewal or termination notice periods."
                                        </p>
                                    </div>
                                    <div className="mt-6">
                                        <button
                                            onClick={() => setShowVacateModal(true)}
                                            className="w-full bg-rose-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-rose-700 transition-all shadow-lg shadow-rose-100 italic"
                                        >
                                            Submit Vacation Notice
                                        </button>
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
                        {/* Sub-tabs */}
                        <div className="flex bg-slate-100 p-1 rounded-2xl w-fit">
                            <button 
                                onClick={() => setPaymentSubTab('history')}
                                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentSubTab === 'history' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-400'}`}
                            >
                                Payment History
                            </button>
                            <button 
                                onClick={() => setPaymentSubTab('invoices')}
                                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${paymentSubTab === 'invoices' ? 'bg-white text-indigo-650 shadow-sm' : 'text-slate-400'}`}
                            >
                                Rent Invoices & WHT Offsets
                            </button>
                        </div>

                        {paymentSubTab === 'history' ? (
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
                                                <td className="p-6 text-right font-black text-slate-800">KES {p.amount?.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {payments.length === 0 && <p className="text-center py-20 text-slate-400 font-black italic">No transaction history.</p>}
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                                <table className="w-full text-left">
                                    <thead className="border-b border-slate-50">
                                        <tr>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Invoice #</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Issue Date</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Due Date</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Rent (KES)</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">WHT (10%)</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-center">Status</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">WHT Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {invoices.map(inv => {
                                            const expectedWht = inv.withholdingTaxAmount || (tenant?.isWithholdingAgent ? Math.round(inv.amount * 0.1) : 0);
                                            return (
                                                <tr key={inv.id} className="border-b border-slate-50/50 hover:bg-slate-50/50 transition-colors">
                                                    <td className="p-6 font-black text-slate-800 font-mono text-sm">{inv.invoiceNumber}</td>
                                                    <td className="p-6 font-bold text-slate-500 text-xs">{new Date(inv.issueDate).toLocaleDateString()}</td>
                                                    <td className="p-6 font-bold text-slate-500 text-xs">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                                    <td className="p-6 text-right font-black text-slate-800">KES {inv.amount?.toLocaleString()}</td>
                                                    <td className="p-6 text-right font-black text-amber-600">KES {expectedWht.toLocaleString()}</td>
                                                    <td className="p-6 text-center">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>{inv.status}</span>
                                                    </td>
                                                    <td className="p-6 text-right">
                                                        {inv.withholdingStatus === 'approved' && (
                                                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Cert Approved & Offset</span>
                                                        )}
                                                        {inv.withholdingStatus === 'submitted' && (
                                                            <span className="text-[10px] font-black uppercase text-indigo-650 tracking-wider animate-pulse">Awaiting Verification</span>
                                                        )}
                                                        {(inv.withholdingStatus === 'rejected' || !inv.withholdingStatus || inv.withholdingStatus === 'pending') && expectedWht > 0 && (
                                                            <div className="flex flex-col gap-1 items-end">
                                                                <button 
                                                                    onClick={() => {
                                                                        setSelectedInvoiceForWht(inv);
                                                                        setShowUploadWhtModal(true);
                                                                    }}
                                                                    className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-600 transition-all"
                                                                >
                                                                    Upload Certificate
                                                                </button>
                                                                {inv.withholdingStatus === 'rejected' && (
                                                                    <p className="text-[8px] text-rose-500 font-bold max-w-[200px] text-right italic">
                                                                        Rejected: {inv.withholdingRejectionReason || 'Invalid details'}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}
                                                        {expectedWht === 0 && (
                                                            <span className="text-slate-400 font-bold italic text-xs">N/A</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                {invoices.length === 0 && <p className="text-center py-20 text-slate-400 font-black italic">No invoices found.</p>}
                            </div>
                        )}
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
                                                <span className="text-[10px] font-bold text-slate-300 uppercase underline decoration-dotted">{new Date(t.createdAt)?.toLocaleString()}</span>
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

                {/* Vacation Notice Form Modal */}
                {showVacateModal && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-2xl max-h-[90vh] overflow-y-auto p-8 relative animate-in zoom-in-95 duration-250">
                            <button
                                onClick={() => setShowVacateModal(false)}
                                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                            >
                                ✕
                            </button>
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic mb-6">
                                Submit Vacation Notice
                            </h3>

                            <form onSubmit={handleSubmitNotice} className="space-y-6">
                                {/* Auto-filled Previews */}
                                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl grid grid-cols-2 gap-4 text-xs font-bold">
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-400 tracking-wider">Tenant Name</p>
                                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">{tenant.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-400 tracking-wider">Mobile Number</p>
                                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">{tenant.phoneNumber || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-400 tracking-wider">Estate / Property</p>
                                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">{property?.name || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase text-slate-400 tracking-wider">House / Unit Number</p>
                                        <p className="text-slate-800 dark:text-slate-200 mt-0.5">{unit?.unitNumber || '—'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">P.O. Box</label>
                                        <input
                                            type="text"
                                            value={poBox}
                                            onChange={(e) => setPoBox(e.target.value)}
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                            placeholder="E.g. Eldoret"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Intended Vacate Date</label>
                                        <input
                                            type="date"
                                            value={vacateDate}
                                            onChange={(e) => setVacateDate(e.target.value)}
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Water Account Number</label>
                                        <input
                                            type="text"
                                            value={waterAcc}
                                            onChange={(e) => setWaterAcc(e.target.value)}
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                            placeholder="E.g. W-12345"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Electricity Account Number</label>
                                        <input
                                            type="text"
                                            value={electricityAcc}
                                            onChange={(e) => setElectricityAcc(e.target.value)}
                                            required
                                            className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                            placeholder="E.g. E-54321"
                                        />
                                    </div>
                                </div>

                                {/* Bank details (Optional) */}
                                <div className="border-t border-slate-100 dark:border-slate-800 pt-6 space-y-4">
                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">
                                        Refund Bank Details <span className="text-[10px] font-normal text-slate-400 capitalize">(Optional)</span>
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Bank Name</label>
                                            <input
                                                type="text"
                                                value={bankName}
                                                onChange={(e) => setBankName(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-550 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                                placeholder="E.g. KCB"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Account Name</label>
                                            <input
                                                type="text"
                                                value={bankAccName}
                                                onChange={(e) => setBankAccName(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-550 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                                placeholder="E.g. CHARLES OTIENO"
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Account Number</label>
                                            <input
                                                type="text"
                                                value={bankAccNo}
                                                onChange={(e) => setBankAccNo(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-550 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                                placeholder="E.g. 1209384820"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Branch</label>
                                            <input
                                                type="text"
                                                value={bankBranch}
                                                onChange={(e) => setBankBranch(e.target.value)}
                                                className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-550 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white"
                                                placeholder="E.g. Eldoret Main"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={submittingNotice}
                                    className="w-full bg-rose-600 hover:bg-rose-700 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4 transition-colors disabled:opacity-50"
                                >
                                    {submittingNotice ? 'Submitting Notice...' : 'Submit Vacation Notice Letter'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {showUploadWhtModal && selectedInvoiceForWht && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800 w-full max-w-lg p-8 relative animate-in zoom-in-95 duration-250">
                            <button
                                onClick={() => {
                                    setShowUploadWhtModal(false);
                                    setSelectedInvoiceForWht(null);
                                    setWhtFile(null);
                                }}
                                className="absolute right-6 top-6 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold"
                            >
                                ✕
                            </button>
                            <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter italic mb-2">
                                Upload KRA Withholding Certificate
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mb-6">
                                Invoice {selectedInvoiceForWht.invoiceNumber} • KES {selectedInvoiceForWht.amount.toLocaleString()}
                            </p>

                            <form onSubmit={handleSubmitWhtCert} className="space-y-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Certificate Number (from KRA iTax)</label>
                                    <input
                                        type="text"
                                        name="certNo"
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-850 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white text-xs"
                                        placeholder="E.g. WHT2026090812"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Certificate Date</label>
                                    <input
                                        type="date"
                                        name="certDate"
                                        required
                                        className="w-full bg-slate-50 dark:bg-slate-850 border-2 border-transparent focus:border-indigo-500 rounded-2xl p-4 font-bold outline-none text-slate-900 dark:text-white text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Upload Certificate File (PDF or Image)</label>
                                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer transition-colors relative">
                                        <input 
                                            type="file" 
                                            accept="image/*,application/pdf"
                                            required
                                            onChange={(e) => {
                                                if (e.target.files && e.target.files[0]) {
                                                    setWhtFile(e.target.files[0]);
                                                }
                                            }}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <p className="text-xs font-black text-slate-700 dark:text-slate-350 uppercase">
                                            {whtFile ? whtFile.name : 'Select or Drop Certificate Document'}
                                        </p>
                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                            Max Size: 5MB (Image or PDF)
                                        </p>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={uploadingWht}
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest mt-4 transition-colors disabled:opacity-50"
                                >
                                    {uploadingWht ? 'Uploading Certificate...' : 'Submit Certificate to Manager'}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

            </main>
        </div>
    );
};

