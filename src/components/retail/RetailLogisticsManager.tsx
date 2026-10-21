import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { TruckIcon as Truck, PlusIcon as Plus, TrashIcon as Trash, MapPinIcon as MapPin, CurrencyIcon as Currency, UserIcon as UserCircle, EnvelopeIcon as Envelope, PhoneIcon as Phone, CheckCircleIcon as CheckCircle, XCircleIcon as XCircle, PencilIcon as Pencil } from '../icons';

interface Courier {
    id: string;
    name: string;
    companyName?: string;
    company_name?: string;
    courierName?: string;
    courier_name?: string;
    phone: string;
    email: string;
    status: 'Pending' | 'Active' | 'Rejected' | string;
    created_at?: string;
    createdAt?: string;
}

interface DeliveryRate {
    id: string;
    courier_id?: string;
    courierId?: string;
    courier_name?: string;
    courierName?: string;
    destination: string;
    rate: number;
    estimated_days?: number;
    estimatedDays?: number;
    status: 'Active' | 'Inactive';
}

interface Props {
    institutionId: string;
}

export function RetailLogisticsManager({ institutionId }: Props) {
    const [couriers, setCouriers] = useState<Courier[]>([]);
    const [rates, setRates] = useState<DeliveryRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddCourier, setShowAddCourier] = useState(false);
    const [showAddRate, setShowAddRate] = useState(false);
    const [activeTab, setActiveTab] = useState<'couriers' | 'rates'>('couriers');

    const [newCourier, setNewCourier] = useState<Partial<Courier>>({ status: 'Active' });
    const [newRate, setNewRate] = useState<Partial<DeliveryRate>>({ status: 'Active', estimated_days: 1 });
    const [editingRateId, setEditingRateId] = useState<string | null>(null);
    const [savingRate, setSavingRate] = useState(false);

    const closeRateModal = () => {
        setShowAddRate(false);
        setEditingRateId(null);
        setNewRate({ status: 'Active', estimated_days: 1 });
    };

    const openAddRate = () => {
        setEditingRateId(null);
        setNewRate({ status: 'Active', estimated_days: 1 });
        setShowAddRate(true);
    };

    const openEditRate = (r: DeliveryRate, resolvedCourierId: string) => {
        setEditingRateId(r.id);
        setNewRate({
            ...r,
            courier_id: resolvedCourierId,
            courierId: resolvedCourierId,
            destination: r.destination || '',
            rate: Number(r.rate ?? 0),
            estimated_days: Number(r.estimated_days ?? r.estimatedDays ?? 1),
            status: r.status || 'Active'
        });
        setShowAddRate(true);
    };

    useEffect(() => {
        fetchData();
    }, [institutionId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [cData, rData] = await Promise.all([
                apiService.fetchModuleRecords('retail_couriers', institutionId),
                apiService.fetchModuleRecords('retail_delivery_rates', institutionId)
            ]);
            setCouriers(Array.isArray(cData) ? cData : []);
            setRates(Array.isArray(rData) ? rData : []);
        } catch (error) {
            console.error('Failed to fetch logistics data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getCourierDisplayName = (c: any): string => {
        if (!c) return '';
        return c.name || c.companyName || c.company_name || c.courierName || c.courier_name || c.fullName || c.full_name || 'Courier Partner';
    };

    const isCourierActive = (c: any): boolean => {
        const s = String(c?.status || '').toLowerCase();
        return s === 'active' || s === 'approved' || (!s && Boolean(getCourierDisplayName(c)));
    };

    const isCourierPending = (c: any): boolean => {
        const s = String(c?.status || '').toLowerCase();
        return s === 'pending';
    };

    const activeCouriers = couriers.filter(isCourierActive);
    const pendingCouriers = couriers.filter(isCourierPending);

    const resolveCourier = (r: DeliveryRate) => {
        const courierId = r.courier_id || (r as any).courierId;
        const explicitName = (r as any).courierName || (r as any).courier_name;

        // 1. Direct ID match
        let matched = couriers.find(c => 
            courierId && (c.id === courierId || String(c.id).toLowerCase() === String(courierId).toLowerCase())
        );

        // 2. Name match
        if (!matched && courierId) {
            matched = couriers.find(c => 
                getCourierDisplayName(c).toLowerCase() === String(courierId).toLowerCase()
            );
        }
        if (!matched && explicitName && explicitName.toLowerCase() !== 'unknown') {
            matched = couriers.find(c => 
                getCourierDisplayName(c).toLowerCase() === explicitName.toLowerCase()
            );
        }

        // 3. Smart association: If only 1 courier exists (Active or total), associate it
        if (!matched && (activeCouriers.length === 1 || couriers.length === 1)) {
            matched = activeCouriers[0] || couriers[0];
        }

        const resolvedName = matched 
            ? getCourierDisplayName(matched) 
            : (explicitName && explicitName.toLowerCase() !== 'unknown' 
                ? explicitName 
                : (courierId && !courierId.includes('-') && courierId.length > 2 && courierId.toLowerCase() !== 'unknown' ? courierId : 'Unknown'));

        return {
            matched,
            name: resolvedName,
            id: matched?.id || courierId
        };
    };

    const handleReassignCourier = async (rateId: string, newCourierId: string) => {
        if (!newCourierId) return;
        try {
            const selectedCourier = couriers.find(c => c.id === newCourierId);
            const courierName = getCourierDisplayName(selectedCourier);
            const existing = rates.find(r => r.id === rateId);
            await apiService.saveModuleRecord('retail_delivery_rates', {
                id: rateId,
                institution_id: institutionId,
                institutionId,
                ...(existing ? {
                    destination: existing.destination,
                    rate: Number(existing.rate ?? 0),
                    estimated_days: Number(existing.estimated_days ?? existing.estimatedDays ?? 1),
                    estimatedDays: Number(existing.estimated_days ?? existing.estimatedDays ?? 1),
                    status: existing.status || 'Active'
                } : {}),
                courier_id: newCourierId,
                courierId: newCourierId,
                courier_name: courierName,
                courierName: courierName
            });
            fetchData();
        } catch (error) {
            console.error('Failed to reassign courier:', error);
        }
    };

    const handleAddCourier = async () => {
        const courierName = (newCourier.name || (newCourier as any).companyName || '').trim();
        if (!courierName) return;
        try {
            const id = crypto.randomUUID();
            await apiService.saveModuleRecord('retail_couriers', {
                id,
                institution_id: institutionId,
                institutionId,
                name: courierName,
                company_name: courierName,
                courier_name: courierName,
                companyName: courierName,
                courierName: courierName,
                phone: newCourier.phone || '',
                email: newCourier.email || '',
                status: 'Active'
            });
            setShowAddCourier(false);
            setNewCourier({ status: 'Active' });
            fetchData();
        } catch (error) {
            console.error('Save failed:', error);
        }
    };

    const handleSaveRate = async () => {
        const courierId = newRate.courier_id || (newRate as any).courierId;
        if (!courierId || !(newRate.destination || '').trim()) {
            alert('Please select a courier partner and enter a destination.');
            return;
        }
        if (savingRate) return;
        setSavingRate(true);
        try {
            const selectedCourier = couriers.find(c => c.id === courierId);
            const courierName = getCourierDisplayName(selectedCourier);
            const estDays = Number(newRate.estimated_days ?? (newRate as any).estimatedDays ?? 1);
            const rateFee = Number(newRate.rate || 0);

            await apiService.saveModuleRecord('retail_delivery_rates', {
                id: editingRateId || crypto.randomUUID(),
                institution_id: institutionId,
                institutionId,
                courier_id: courierId,
                courierId: courierId,
                courier_name: courierName,
                courierName: courierName,
                destination: (newRate.destination || '').trim(),
                rate: rateFee,
                estimated_days: estDays,
                estimatedDays: estDays,
                status: newRate.status || 'Active'
            });
            closeRateModal();
            fetchData();
        } catch (error) {
            console.error('Save failed:', error);
            alert('Failed to save delivery rate. Please try again.');
        } finally {
            setSavingRate(false);
        }
    };

    const handleDelete = async (module: string, id: string) => {
        if (!confirm('Are you sure you want to delete this?')) return;
        try {
            await apiService.deleteModuleRecord(module, id);
            fetchData();
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const handleUpdateStatus = async (id: string, status: Courier['status']) => {
        try {
            await apiService.saveModuleRecord('retail_couriers', { id, status });
            fetchData();
        } catch (error) {
            console.error('Update failed:', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                        <Truck className="w-8 h-8 text-indigo-600" />
                        Logistics & Fulfillment
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium">Manage couriers and destination rates</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shadow-inner">
                    <button
                        onClick={() => setActiveTab('couriers')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'couriers' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Couriers
                    </button>
                    <button
                        onClick={() => setActiveTab('rates')}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'rates' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                    >
                        Rate Card
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="h-64 flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
            ) : (
                <div className="grid gap-6 animate-fade-in">
                    {activeTab === 'couriers' ? (
                        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800/50 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold flex items-center gap-2">
                                    <UserCircle className="w-5 h-5 text-slate-400" />
                                    Registered Couriers
                                </h3>
                                <button
                                    onClick={() => setShowAddCourier(true)}
                                    className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                                {pendingCouriers.length > 0 && (
                                    <div className="mb-8 overflow-hidden rounded-2xl border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-900/10">
                                        <div className="bg-amber-100/50 dark:bg-amber-900/20 px-4 py-2 border-b border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400 italic">Partner Inbound (Pending Approval)</h4>
                                            <span className="bg-amber-600 text-white text-[9px] font-black px-2 py-0.5 rounded-full">{pendingCouriers.length}</span>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <tbody className="divide-y divide-amber-100/30 dark:divide-amber-900/10">
                                                    {pendingCouriers.map(c => (
                                                        <tr key={c.id} className="group hover:bg-white/50 dark:hover:bg-white/5 transition-all">
                                                            <td className="py-3 px-4">
                                                                <div className="font-bold text-slate-800 dark:text-white uppercase tracking-tight">{getCourierDisplayName(c)}</div>
                                                                <div className="text-[10px] text-slate-500 font-medium">{new Date(c.created_at || c.createdAt || '').toLocaleDateString()}</div>
                                                            </td>
                                                            <td className="py-3 px-4">
                                                                <div className="flex flex-col text-[10px] text-slate-500 font-bold italic">
                                                                    <span>{c.phone || 'No phone'}</span>
                                                                    <span>{c.email || 'No email'}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-3 px-4 text-right space-x-2">
                                                                <button
                                                                    onClick={() => handleUpdateStatus(c.id, 'Active')}
                                                                    className="p-1 text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                                                                    title="Approve Partner"
                                                                >
                                                                    <CheckCircle className="w-6 h-6" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleUpdateStatus(c.id, 'Rejected')}
                                                                    className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all"
                                                                    title="Reject Application"
                                                                >
                                                                    <XCircle className="w-6 h-6" />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}

                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">
                                                <th className="pb-4 px-2 tracking-tighter">Courier Name</th>
                                                <th className="pb-4 px-2 tracking-tighter">Contact Info</th>
                                                <th className="pb-4 px-2 tracking-tighter">Status</th>
                                                <th className="pb-4 px-2 tracking-tighter text-right">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                            {activeCouriers.map(c => (
                                                <tr key={c.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                                    <td className="py-4 px-2 font-bold text-slate-700 dark:text-slate-200">{getCourierDisplayName(c)}</td>
                                                    <td className="py-4 px-2">
                                                        <div className="flex flex-col text-[10px] text-slate-500">
                                                            <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {c.phone || 'No phone'}</span>
                                                            <span className="flex items-center gap-1"><Envelope className="w-3 h-3" /> {c.email || 'No email'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2">
                                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${isCourierActive(c) ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                                                            {c.status || 'Active'}
                                                        </span>
                                                    </td>
                                                    <td className="py-4 px-2 text-right">
                                                        <button onClick={() => handleDelete('retail_couriers', c.id)} className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-lg">
                                                            <Trash className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                        </div>
                    ) : (
                        <div className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-3xl border border-white/20 dark:border-slate-800/50 p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="font-bold flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-slate-400" />
                                    Delivery Rate Matrix
                                </h3>
                                <button
                                    onClick={openAddRate}
                                    className="p-2 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] uppercase tracking-widest text-slate-400 font-black border-b border-slate-100 dark:border-slate-800">
                                            <th className="pb-4 px-2 tracking-tighter">Destination</th>
                                            <th className="pb-4 px-2 tracking-tighter">Courier</th>
                                            <th className="pb-4 px-2 tracking-tighter">Rate (KES)</th>
                                            <th className="pb-4 px-2 tracking-tighter">Timeline</th>
                                            <th className="pb-4 px-2 tracking-tighter text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                                        {rates.map(r => {
                                            const courierInfo = resolveCourier(r);
                                            const estDays = Number(r.estimated_days ?? (r as any).estimatedDays ?? 1);
                                            const rateFee = Number(r.rate ?? 0);
                                            const assignedCourierId = courierInfo.matched?.id || r.courier_id || (r as any).courierId || '';

                                            return (
                                                <tr key={r.id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-all">
                                                    <td className="py-4 px-2 font-bold text-slate-700 dark:text-slate-200">{r.destination}</td>
                                                    <td className="py-4 px-2">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-tighter">
                                                                {courierInfo.name}
                                                            </span>
                                                            {couriers.length > 0 && (
                                                                <select
                                                                    value={assignedCourierId}
                                                                    onChange={(e) => handleReassignCourier(r.id, e.target.value)}
                                                                    className="text-[10px] bg-slate-100 dark:bg-slate-800 border-none rounded-lg px-2 py-1 text-slate-500 font-bold cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 opacity-60 group-hover:opacity-100 transition-opacity"
                                                                    title="Assign / Switch Courier"
                                                                >
                                                                    <option value="">Switch partner...</option>
                                                                    {couriers.map(c => (
                                                                        <option key={c.id} value={c.id}>{getCourierDisplayName(c)}</option>
                                                                    ))}
                                                                </select>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="py-4 px-2 font-black text-indigo-600">
                                                        {new Intl.NumberFormat().format(rateFee)}
                                                    </td>
                                                    <td className="py-4 px-2 text-[10px] font-bold text-slate-400">
                                                        {estDays} Work days
                                                    </td>
                                                    <td className="py-4 px-2 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => openEditRate(r, assignedCourierId)}
                                                            className="p-2 text-indigo-500 opacity-60 group-hover:opacity-100 transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg"
                                                            title="Edit rate"
                                                            aria-label={`Edit rate for ${r.destination}`}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => handleDelete('retail_delivery_rates', r.id)} title="Delete rate" className="p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 rounded-lg">
                                                            <Trash className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Logistics Stats */}
            {!loading && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-up">
                    <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-all">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic block mb-1">Active Couriers</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white">{activeCouriers.length || couriers.length}</span>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-all">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic block mb-1">Mapped Zones</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white">{rates.length}</span>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-all">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic block mb-1">Avg Delivery Day</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                            {rates.length > 0 ? Math.round(rates.reduce((a, b) => a + Number(b.estimated_days ?? (b as any).estimatedDays ?? 0), 0) / rates.length) : 0}
                        </span>
                    </div>
                    <div className="bg-white/50 dark:bg-slate-900/50 p-4 rounded-3xl border border-white/20 dark:border-slate-800/50 shadow-sm hover:shadow-md transition-all">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic block mb-1">Avg Rate</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-white">
                            {rates.length > 0 ? Math.round(rates.reduce((a, b) => a + Number(b.rate ?? 0), 0) / rates.length) : 0}
                        </span>
                    </div>
                </div>
            )}

            {/* Modals */}
            {showAddCourier && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-slate-800 transition-all overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8">
                            <button onClick={() => setShowAddCourier(false)} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <h3 className="text-xl font-black mb-6 italic tracking-tight">Register Courier</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1 block italic opacity-60">Company Name</label>
                                <input
                                    type="text"
                                    value={newCourier.name || ''}
                                    onChange={e => setNewCourier({ ...newCourier, name: e.target.value })}
                                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 ring-indigo-500 transition-all font-bold"
                                    placeholder="e.g. Agency Internal Logistics"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest mb-1 block italic opacity-60">Phone</label>
                                    <input
                                        type="text"
                                        value={newCourier.phone || ''}
                                        onChange={e => setNewCourier({ ...newCourier, phone: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 ring-indigo-500 transition-all font-bold"
                                        placeholder="+254..."
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest mb-1 block italic opacity-60">Email</label>
                                    <input
                                        type="text"
                                        value={newCourier.email || ''}
                                        onChange={e => setNewCourier({ ...newCourier, email: e.target.value })}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 ring-indigo-500 transition-all font-bold"
                                        placeholder="courier@mail.com"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleAddCourier}
                                className="w-full py-4 mt-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-500/30 active:scale-95 transition-all"
                            >
                                Save Courier Partner
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddRate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
                    <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 border border-white/20 dark:border-slate-800 transition-all overflow-hidden relative">
                        <div className="absolute top-0 right-0 p-8">
                            <button onClick={closeRateModal} className="text-slate-400 hover:text-rose-500 transition-colors">
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>
                        <h3 className="text-xl font-black mb-6 italic tracking-tight">{editingRateId ? 'Edit Delivery Fee' : 'Add Delivery Fee'}</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1 block italic opacity-60">Courier Partner</label>
                                <select
                                    value={newRate.courier_id || (newRate as any).courierId || ''}
                                    onChange={e => setNewRate({ ...newRate, courier_id: e.target.value, courierId: e.target.value })}
                                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 ring-indigo-500 transition-all font-bold appearance-none cursor-pointer"
                                >
                                    <option value="">Select Partner</option>
                                    {couriers.map(c => (
                                        <option key={c.id} value={c.id}>
                                            {getCourierDisplayName(c)} {c.status && c.status !== 'Active' ? `(${c.status})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-black uppercase tracking-widest mb-1 block italic opacity-60">Destination / Zone</label>
                                <input
                                    type="text"
                                    value={newRate.destination || ''}
                                    onChange={e => setNewRate({ ...newRate, destination: e.target.value })}
                                    className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 ring-indigo-500 transition-all font-bold"
                                    placeholder="e.g. Nairobi Central"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest mb-1 block italic opacity-60">Fee (KES)</label>
                                    <input
                                        type="number"
                                        min={0}
                                        value={newRate.rate ?? ''}
                                        onChange={e => setNewRate({ ...newRate, rate: e.target.value === '' ? undefined : parseFloat(e.target.value) })}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 ring-indigo-500 transition-all font-bold"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-black uppercase tracking-widest mb-1 block italic opacity-60">Days</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={newRate.estimated_days || ''}
                                        onChange={e => setNewRate({ ...newRate, estimated_days: parseInt(e.target.value) })}
                                        className="w-full px-5 py-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none focus:ring-2 ring-indigo-500 transition-all font-bold"
                                        placeholder="1"
                                    />
                                </div>
                            </div>
                            <button
                                onClick={handleSaveRate}
                                disabled={savingRate}
                                className="w-full py-4 mt-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-indigo-500/30 active:scale-95 transition-all disabled:opacity-60 disabled:cursor-wait"
                            >
                                {savingRate ? 'Saving...' : editingRateId ? 'Update Rate' : 'Publish Rate to Marketplace'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

