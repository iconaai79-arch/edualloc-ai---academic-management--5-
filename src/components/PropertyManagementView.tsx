import React, { useState, useEffect } from 'react';
import {
    User, Institution, PMProperty, PMUnit, PMTenant, PMLease, PMPayment, PMTicket,
    PMPropertyType, PMUnitStatus, PMLeaseStatus, PMPaymentMethod, PMPaymentType,
    PMPriority, PMTicketStatus
} from '../types';
import { apiService } from '../services/apiService';
import {
    PlusIcon, XIcon, CheckCircleIcon, SparklesIcon, UserGroupIcon,
    ChartBarIcon, Cog8ToothIcon, ArchiveBoxIcon, UserIcon, ArrowPathIcon,
    ClockIcon, CurrencyIcon, ChartPieIcon, TrashIcon, EyeIcon, SearchIcon,
    HomeIcon, GridIcon, ListIcon, CreditCardIcon, AlertTriangleIcon,
    TrendingUpIcon, BuildingOfficeIcon, UserPlusIcon
} from './icons/index';

interface PropertyManagementViewProps {
    currentUser: User;
    currentInstitution: Institution;
    users: User[];
    onDataChange: () => void;
}

export const PropertyManagementView: React.FC<PropertyManagementViewProps> = ({ currentUser, currentInstitution, users, onDataChange }) => {
    const institutionId = currentInstitution.id;
    const [activeTab, setActiveTab] = useState<'dashboard' | 'properties' | 'tenants' | 'leases' | 'payments' | 'maintenance'>('dashboard');

    const [properties, setProperties] = useState<PMProperty[]>([]);
    const [units, setUnits] = useState<PMUnit[]>([]);
    const [tenants, setTenants] = useState<PMTenant[]>([]);
    const [leases, setLeases] = useState<PMLease[]>([]);
    const [payments, setPayments] = useState<PMPayment[]>([]);
    const [tickets, setTickets] = useState<PMTicket[]>([]);
    const [loading, setLoading] = useState(true);

    // Modals
    const [showPropertyModal, setShowPropertyModal] = useState(false);
    const [showUnitModal, setShowUnitModal] = useState(false);
    const [showTenantModal, setShowTenantModal] = useState(false);
    const [showLeaseModal, setShowLeaseModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showTicketModal, setShowTicketModal] = useState(false);

    const [search, setSearch] = useState('');

    const loadData = async () => {
        setLoading(true);
        try {
            const [propList, unitList, tenantList, leaseList, paymentList, ticketList] = await Promise.all([
                apiService.fetchModuleRecords<PMProperty>('pm_properties', institutionId),
                apiService.fetchModuleRecords<PMUnit>('pm_units', institutionId),
                apiService.fetchModuleRecords<PMTenant>('pm_tenants', institutionId),
                apiService.fetchModuleRecords<PMLease>('pm_leases', institutionId),
                apiService.fetchModuleRecords<PMPayment>('pm_payments', institutionId),
                apiService.fetchModuleRecords<PMTicket>('pm_maintenance', institutionId),
            ]);
            setProperties(propList || []);
            setUnits(unitList || []);
            setTenants(tenantList || []);
            setLeases(leaseList || []);
            setPayments(paymentList || []);
            setTickets(ticketList || []);
            onDataChange();
        } catch (e) { console.error(e); }
        setLoading(false);
    };

    useEffect(() => { loadData(); }, [institutionId]);

    // Derived Stats
    const totalRentCollected = payments.filter(p => p.paymentType === 'Rent').reduce((sum, p) => sum + p.amount, 0);
    const activeLeases = leases.filter(l => l.status === 'Active');
    const vacantUnits = units.filter(u => u.status === 'Vacant');
    const openTickets = tickets.filter(t => t.status !== 'Resolved' && t.status !== 'Closed');

    const handleSaveProperty = async (data: Partial<PMProperty>) => {
        try {
            const newProperty: PMProperty = {
                id: `prop_${Date.now()}`,
                name: data.name || '',
                address: data.address,
                propertyType: data.propertyType || 'Apartment',
                totalUnits: 0,
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_properties', newProperty);
            setShowPropertyModal(false);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleSaveUnit = async (data: Partial<PMUnit>) => {
        try {
            const newUnit: PMUnit = {
                id: `unit_${Date.now()}`,
                propertyId: data.propertyId || '',
                unitNumber: data.unitNumber || '',
                unitType: data.unitType || '',
                floorNumber: data.floorNumber,
                rentAmount: data.rentAmount || 0,
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_units', newUnit);

            setShowUnitModal(false);
            loadData();
        } catch (e) { console.error(e); }
    };

    const PropertiesTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                {properties.map(property => (
                    <div key={property.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden group hover:shadow-2xl transition-all duration-500 border-b-8 border-b-blue-600">
                        <div className="p-8">
                            <div className="flex justify-between items-start mb-6">
                                <div className="p-4 bg-blue-600/10 rounded-2xl text-blue-600 group-hover:scale-110 transition-transform duration-500">
                                    <BuildingOfficeIcon className="w-8 h-8" />
                                </div>
                                <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest">{property.propertyType}</span>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic mb-2 group-hover:text-blue-600 transition-colors">{property.name}</h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-tight flex items-center gap-2">
                                <SearchIcon className="w-4 h-4" /> {property.address || 'No Address Provided'}
                            </p>

                            <div className="mt-8 pt-8 border-t border-slate-50 dark:border-slate-700 grid grid-cols-2 gap-4">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Units</p>
                                    <p className="text-2xl font-black text-slate-900 dark:text-white italic">{property.totalUnits || 0}</p>
                                </div>
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Available</p>
                                    <p className="text-2xl font-black text-blue-600 italic">
                                        {units.filter(u => u.propertyId === property.id && u.status === 'Vacant').length}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex gap-3">
                                <button className="flex-1 bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2">
                                    <ListIcon className="w-4 h-4" /> Manage Units
                                </button>
                                <button
                                    onClick={() => setShowUnitModal(true)}
                                    className="w-14 h-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-lg shadow-blue-500/30"
                                >
                                    <PlusIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Master Unit Registry</h3>
                    <div className="relative">
                        <SearchIcon className="absolute left-4 top-3 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="SEARCH BY UNIT NO..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl pl-12 pr-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-blue-500 transition-all w-64"
                        />
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                            <tr>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Unit Details</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Property</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Type / Floor</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Rent (KES)</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Status</th>
                                <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {units.filter(u => !search || u.unitNumber.toUpperCase().includes(search.toUpperCase())).map(unit => (
                                <tr key={unit.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 dark:hover:bg-slate-700/20 transition-colors group">
                                    <td className="p-6">
                                        <div className="flex items-center gap-4 text-slate-900 dark:text-white font-black italic">
                                            <div className="w-10 h-10 bg-blue-600/10 rounded-xl flex items-center justify-center text-blue-600">
                                                <GridIcon className="w-5 h-5" />
                                            </div>
                                            {unit.unitNumber}
                                        </div>
                                    </td>
                                    <td className="p-6 text-sm font-bold text-slate-600 dark:text-slate-400">
                                        {properties.find(p => p.id === unit.propertyId)?.name || 'N/A'}
                                    </td>
                                    <td className="p-6">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{unit.unitType}</span>
                                        <p className="text-xs font-bold text-slate-500 italic mt-1">Floor {unit.floorNumber || 'G'}</p>
                                    </td>
                                    <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">
                                        {unit.rentAmount.toLocaleString()}
                                    </td>
                                    <td className="p-6">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest italic ${unit.status === 'Vacant' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' :
                                            unit.status === 'Occupied' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' :
                                                'bg-rose-100 text-rose-600 dark:bg-rose-900/30'
                                            }`}>
                                            {unit.status}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right space-x-2">
                                        <button className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-xl hover:text-blue-600 transition-colors">
                                            <EyeIcon className="w-4 h-4" />
                                        </button>
                                        <button className="p-3 bg-slate-100 dark:bg-slate-700 text-slate-400 rounded-xl hover:text-rose-600 transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const handleSavePayment = async (data: Partial<PMPayment>) => {
        try {
            const newPayment: PMPayment = {
                id: `pay_${Date.now()}`,
                leaseId: data.leaseId || '',
                amount: data.amount || 0,
                paymentDate: data.paymentDate || new Date().toISOString().split('T')[0],
                paymentMethod: data.paymentMethod || 'M-Pesa',
                paymentType: data.paymentType || 'Rent',
                remarks: data.remarks,
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_payments', newPayment);
            setShowPaymentModal(false);
            loadData();
        } catch (e) { console.error(e); }
    };

    const handleSaveTicket = async (data: Partial<PMTicket>) => {
        try {
            const newTicket: PMTicket = {
                id: `tick_${Date.now()}`,
                unitId: data.unitId || '',
                title: data.title || '',
                description: data.description || '',
                priority: data.priority || 'Medium',
                status: 'Open',
                institutionId,
                createdAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('pm_maintenance', newTicket);
            setShowTicketModal(false);
            loadData();
        } catch (e) { console.error(e); }
    };

    const PaymentsTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden">
                <div className="p-8 border-b border-slate-50 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                    <div>
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">Collection Ledger</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Real-time financial tracking</p>
                    </div>
                </div>
                <table className="w-full text-left">
                    <thead className="border-b border-slate-100 dark:border-slate-700">
                        <tr>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Transaction ID</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Lease Ref</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Amount</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Method</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {payments.map(payment => {
                            const lease = leases.find(l => l.id === payment.leaseId);
                            const tenant = lease ? tenants.find(t => t.id === lease.tenantId) : null;
                            return (
                                <tr key={payment.id} className="border-b border-slate-50 dark:border-slate-700/50 hover:bg-slate-50/50 transition-colors">
                                    <td className="p-6 font-mono text-xs font-bold text-slate-400">#{payment.id.split('_')[1]}</td>
                                    <td className="p-6">
                                        <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter italic">{tenant?.name || 'N/A'}</p>
                                        <p className="text-[9px] text-blue-600 font-bold uppercase">{payment.paymentType}</p>
                                    </td>
                                    <td className="p-6 text-lg font-black text-slate-900 dark:text-white italic">KES {payment.amount.toLocaleString()}</td>
                                    <td className="p-6 font-bold text-slate-500 uppercase text-[10px]">{payment.paymentMethod}</td>
                                    <td className="p-6 text-xs font-bold text-slate-500 uppercase">{new Date(payment.paymentDate).toLocaleDateString()}</td>
                                    <td className="p-6 text-right">
                                        <span className="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest italic">Success</span>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );

    const MaintenanceTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
                {tickets.map(ticket => (
                    <div key={ticket.id} className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl group hover:-translate-y-2 transition-all duration-500 relative overflow-hidden">
                        <div className={`absolute top-0 right-10 w-12 h-2 rounded-b-full ${ticket.priority === 'Urgent' ? 'bg-rose-500' : ticket.priority === 'High' ? 'bg-amber-500' : 'bg-blue-500'}`}></div>
                        <h4 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic mb-2">{ticket.title}</h4>
                        <p className="text-slate-500 text-xs font-bold leading-relaxed mb-6">{ticket.description}</p>
                        <div className="flex justify-between items-center pt-6 border-t border-slate-50 dark:border-slate-700">
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Unit</p>
                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase italic">UNIT {units.find(u => u.id === ticket.unitId)?.unitNumber || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const ReportsTab = () => (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Rent Collection Trend (Monthly)</h4>
                    <div className="h-64 flex items-end gap-2 px-4 shadow-inner bg-slate-50 dark:bg-slate-900/50 rounded-3xl p-6">
                        {[45, 60, 85, 30, 95, 70, 90, 100].map((h, i) => (
                            <div key={i} className="flex-1 bg-blue-600 rounded-t-xl hover:bg-blue-400 transition-all cursor-pointer relative group" style={{ height: `${h}%` }}>
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[9px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                    KES {(h * 1000).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6">Unit Status Distribution</h4>
                    <div className="flex items-center justify-around h-64">
                        <div className="w-40 h-40 rounded-full border-[20px] border-blue-600 border-r-emerald-500 border-b-rose-500 relative flex items-center justify-center">
                            <span className="font-black text-xs text-slate-900 dark:text-white uppercase italic">Overview</span>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-blue-600"></div><span className="text-xs font-bold text-slate-500">Occupied</span></div>
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-emerald-500"></div><span className="text-xs font-bold text-slate-500">Vacant</span></div>
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded bg-rose-500"></div><span className="text-xs font-bold text-slate-500">Under Repair</span></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTabs = () => (
        <div className="flex bg-slate-100 dark:bg-slate-800/50 p-1.5 rounded-2xl mb-8 w-fit border border-slate-200 dark:border-slate-700/50 shadow-inner">
            {[
                { id: 'dashboard', label: 'Dashboard', icon: ChartBarIcon },
                { id: 'properties', label: 'Properties & Units', icon: BuildingOfficeIcon },
                { id: 'tenants', label: 'Tenant Directory', icon: UserGroupIcon },
                { id: 'leases', label: 'Lease Manager', icon: ArchiveBoxIcon },
                { id: 'payments', label: 'Payments', icon: CurrencyIcon },
                { id: 'maintenance', label: 'Maintenance', icon: Cog8ToothIcon },
                { id: 'reports', label: 'Reports', icon: ChartBarIcon },
            ].map(tab => (
                <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                    {tab.label}
                </button>
            ))}
        </div>
    );

    const Modal = ({ show, onClose, title, children }: { show: boolean, onClose: () => void, title: string, children: React.ReactNode }) => {
        if (!show) return null;
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
                    <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-widest uppercase italic">{title}</h3>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors">
                            <XIcon className="w-6 h-6 text-slate-400" />
                        </button>
                    </div>
                    <div className="p-8 max-h-[70vh] overflow-y-auto">
                        {children}
                    </div>
                </div>
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] italic">Synchronizing Assets...</p>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-[1600px] mx-auto animate-in fade-in duration-500">
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter uppercase italic flex items-center gap-4">
                        <HomeIcon className="w-10 h-10 text-blue-600" />
                        Property Management
                        <span className="text-sm bg-blue-600/10 text-blue-600 px-3 py-1 rounded-full tracking-widest not-italic">RENTAL HUB</span>
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em] mt-2">Managing {currentInstitution.name}</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={loadData} className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 shadow-sm">
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                    {activeTab === 'properties' && (
                        <button onClick={() => setShowPropertyModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                            <PlusIcon className="w-5 h-5" /> Add Property
                        </button>
                    )}
                    {(activeTab === 'tenants' || activeTab === 'leases') && (
                        <button onClick={() => activeTab === 'tenants' ? setShowTenantModal(true) : setShowLeaseModal(true)} className="flex items-center gap-2 bg-blue-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-blue-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                            <PlusIcon className="w-5 h-5" /> {activeTab === 'tenants' ? 'Onboard Tenant' : 'New Lease'}
                        </button>
                    )}
                    {activeTab === 'payments' && (
                        <button onClick={() => setShowPaymentModal(true)} className="flex items-center gap-2 bg-emerald-600 text-white px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                            <CurrencyIcon className="w-5 h-5" /> Record Payment
                        </button>
                    )}
                </div>
            </div>

            {renderTabs()}

            {activeTab === 'dashboard' && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in slide-in-from-bottom-4 duration-500 mt-4">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
                        <h4 className="text-blue-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Total Collection</h4>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">KES {totalRentCollected.toLocaleString()}</p>
                        <div className="mt-4 flex items-center gap-2 text-emerald-500 font-bold text-xs">
                            <TrendingUpIcon className="w-4 h-4" /> +12% vs last month
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                        <h4 className="text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Active Leases</h4>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{activeLeases.length}</p>
                        <div className="mt-4 flex items-center gap-2 text-slate-400 font-bold text-xs">
                            Occupancy: {units.length > 0 ? ((activeLeases.length / units.length) * 100).toFixed(1) : 0}%
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                        <h4 className="text-amber-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Vacant Units</h4>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{vacantUnits.length}</p>
                        <div className="mt-4 text-xs font-bold text-slate-400">Ready for onboarding</div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/50 relative overflow-hidden group">
                        <h4 className="text-rose-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Open Tickets</h4>
                        <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter italic">{openTickets.length}</p>
                    </div>
                </div>
            )}

            {activeTab === 'properties' && <PropertiesTab />}
            {activeTab === 'tenants' && <TenantsTab />}
            {activeTab === 'leases' && <LeasesTab />}
            {activeTab === 'payments' && <PaymentsTab />}
            {activeTab === 'maintenance' && <MaintenanceTab />}
            {activeTab === 'reports' && <ReportsTab />}

            <Modal show={showPropertyModal} onClose={() => setShowPropertyModal(false)} title="Register New Property">
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    handleSaveProperty({
                        name: formData.get('name') as string,
                        address: formData.get('address') as string,
                        propertyType: formData.get('propertyType') as PMPropertyType,
                    });
                }} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Property Name</label>
                        <input name="name" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="e.g. Blue Lagoon Apartments" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Physical Address</label>
                        <input name="address" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all" placeholder="Street, City, Block" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Type</label>
                        <select name="propertyType" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none transition-all">
                            <option value="Apartment">Apartment</option>
                            <option value="Commercial">Commercial</option>
                            <option value="Mixed-use">Mixed-use</option>
                            <option value="Warehouse">Warehouse</option>
                        </select>
                    </div>
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-500/20 mt-4">Save Asset</button>
                </form>
            </Modal>

            <Modal show={showUnitModal} onClose={() => setShowUnitModal(false)} title="Register New Unit">
                <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleSaveUnit({ propertyId: formData.get('propertyId') as string, unitNumber: formData.get('unitNumber') as string, rentAmount: parseFloat(formData.get('rentAmount') as string) || 0 }); }} className="space-y-6">
                    <select name="propertyId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none"><option value="">Select Property</option>{properties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
                    <input name="unitNumber" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Unit Number" />
                    <input name="rentAmount" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Monthly Rent" />
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Deploy Unit</button>
                </form>
            </Modal>

            <Modal show={showTenantModal} onClose={() => setShowTenantModal(false)} title="Tenant Onboarding">
                <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleSaveTenant({ name: formData.get('name') as string, phone: formData.get('phone') as string, idNumber: formData.get('idNumber') as string }); }} className="space-y-6">
                    <input name="name" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Full Name" />
                    <input name="phone" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Phone Number" />
                    <input name="idNumber" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="ID / Passport Number" />
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Complete Onboarding</button>
                </form>
            </Modal>

            <Modal show={showLeaseModal} onClose={() => setShowLeaseModal(false)} title="Create Lease Agreement">
                <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleSaveLease({ unitId: formData.get('unitId') as string, tenantId: formData.get('tenantId') as string, monthlyRent: parseFloat(formData.get('monthlyRent') as string) || 0, depositAmount: parseFloat(formData.get('depositAmount') as string) || 0 }); }} className="space-y-6">
                    <select name="tenantId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">{tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select>
                    <select name="unitId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">{units.filter(u => u.status === 'Vacant').map(u => <option key={u.id} value={u.id}>{u.unitNumber} - {properties.find(p => p.id === u.propertyId)?.name}</option>)}</select>
                    <input name="monthlyRent" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Agreed Rent" />
                    <input name="depositAmount" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Security Deposit" />
                    <button type="submit" className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Activate Lease</button>
                </form>
            </Modal>

            <Modal show={showPaymentModal} onClose={() => setShowPaymentModal(false)} title="Record Transaction">
                <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleSavePayment({ leaseId: formData.get('leaseId') as string, amount: parseFloat(formData.get('amount') as string) || 0, paymentType: formData.get('paymentType') as PMPaymentType }); }} className="space-y-6">
                    <select name="leaseId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">{leases.filter(l => l.status === 'Active').map(l => <option key={l.id} value={l.id}>{tenants.find(t => t.id === l.tenantId)?.name} - Unit {units.find(u => u.id === l.unitId)?.unitNumber}</option>)}</select>
                    <select name="paymentType" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none"><option value="Rent">Rent</option><option value="Utility">Utility Bill</option><option value="Deposit">Deposit</option></select>
                    <input name="amount" type="number" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Amount Paid" />
                    <button type="submit" className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Finalize Payment</button>
                </form>
            </Modal>

            <Modal show={showTicketModal} onClose={() => setShowTicketModal(false)} title="Maintenance Request">
                <form onSubmit={(e) => { e.preventDefault(); const formData = new FormData(e.currentTarget); handleSaveTicket({ unitId: formData.get('unitId') as string, title: formData.get('title') as string, description: formData.get('description') as string, priority: formData.get('priority') as PMPriority }); }} className="space-y-6">
                    <select name="unitId" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none">{units.map(u => <option key={u.id} value={u.id}>Unit {u.unitNumber} - {properties.find(p => p.id === u.propertyId)?.name}</option>)}</select>
                    <input name="title" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none" placeholder="Issue Title" />
                    <textarea name="description" required className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none h-32" placeholder="Describe the maintenance issue..."></textarea>
                    <select name="priority" className="w-full bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-blue-500 rounded-2xl p-4 font-bold outline-none"><option value="Low">Low</option><option value="Medium">Medium</option><option value="High">High</option><option value="Urgent">Urgent</option></select>
                    <button type="submit" className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4">Submit Request</button>
                </form>
            </Modal>
        </div>
    );
};
