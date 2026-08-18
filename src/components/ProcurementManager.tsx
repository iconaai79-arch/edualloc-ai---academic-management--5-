
import React, { useState } from 'react';
import { ShoppingBagIcon as ShoppingBagIcon } from './icons/ShoppingBagIcon';
import { PlusIcon as PlusIcon } from './icons/PlusIcon';
import { DocumentTextIcon as FileIcon } from './icons/DocumentTextIcon';
import { TruckIcon as TruckIcon } from './icons/TruckIcon';
import { ClockIcon as ClockIcon } from './icons/ClockIcon';
import { PrinterIcon as PrinterIcon } from './icons/PrinterIcon';
import { EnvelopeIcon as MailIcon } from './icons/EnvelopeIcon';
import { UserIcon as UserIcon } from './icons/UserIcon';
import { BuildingOfficeIcon as BuildingIcon } from './icons/BuildingOfficeIcon';
import { MoreVerticalIcon as MoreVerticalIcon } from './icons/MoreVerticalIcon';
import { EyeIcon as EyeIcon } from './icons/EyeIcon';
import { ArrowRightIcon as ArrowRightIcon } from './icons/ArrowRightIcon';
import { DocumentMagnifyingGlassIcon as FileSearchIcon } from './icons/DocumentMagnifyingGlassIcon';
import { MagnifyingGlassIcon as SearchIcon } from './icons/MagnifyingGlassIcon';
import { TrashIcon as TrashIcon } from './icons/TrashIcon';
import { XCircleIcon as XCircleIcon } from './icons/XCircleIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';

import { Requisition, RetailStore, RetailInventoryItem, RetailExpense, Supplier, Institution, CompanyDetails } from '../types';
import { generateLpoPdf } from '../services/pdfService';
import { apiService } from '../services/apiService';

interface ProcurementManagerProps {
    requisitions: Requisition[];
    onAddRequisition: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
    onUpdateRequisition: (reqId: string, data: Partial<Requisition>) => Promise<void>;
    inventory: RetailInventoryItem[];
    suppliers: Supplier[];
    retailStores: RetailStore[];
    institution?: Institution;
    companyDetails?: CompanyDetails;
}

export const ProcurementManager: React.FC<ProcurementManagerProps> = ({
    requisitions,
    onAddRequisition,
    onUpdateRequisition,
    inventory,
    suppliers,
    retailStores,
    institution,
    companyDetails
}) => {
    const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'requisitions' | 'lpos' | 'suppliers'>('dashboard');
    const [selectedRequisition, setSelectedRequisition] = useState<Requisition | null>(null);
    const [isLPOModalOpen, setIsLPOModalOpen] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [previewReq, setPreviewReq] = useState<Requisition | null>(null);

    // New Requisition States
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [items, setItems] = useState<{ name: string; quantity: number; unit: string; unitCost: number }[]>([]);
    const [newItem, setNewItem] = useState({ id: '', name: '', quantity: 1, unit: 'pcs', unitCost: 0 });
    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    // Ensure selectedStoreId is initialized when retailStores are loaded
    React.useEffect(() => {
        if (!selectedStoreId && retailStores && retailStores.length > 0) {
            setSelectedStoreId(retailStores[0].id);
        }
    }, [retailStores, selectedStoreId]);

    const handleCreateLPO = async () => {
        if (!selectedRequisition || !selectedSupplierId) return;

        const lpoNumber = `LPO-${Math.floor(10000 + Math.random() * 90000)}`;
        await onUpdateRequisition(selectedRequisition.id, {
            status: 'ordered',
            supplierId: selectedSupplierId,
            lpoNumber
        });

        setIsLPOModalOpen(false);
        setSelectedRequisition(null);
        setSelectedSupplierId('');
    };

    const handleReceiveItems = async (req: Requisition) => {
        if (!window.confirm(`Are you sure you have received items for ${req.lpoNumber}?`)) return;

        await onUpdateRequisition(req.id, {
            status: 'received',
            receivedDate: new Date().toISOString()
        });

        // Note: The logic to actually update the inventory quantities in the database 
        // should be handled in the App.tsx onUpdateRequisition handler or a dedicated 
        // onMarkLPOReceived handler to ensure atomicity.
    };

    const handleIngestIntoCountyInventory = async (req: Requisition) => {
        try {
            const supplier = suppliers.find(s => s.id === req.supplierId);
            const nowIso = new Date().toISOString();
            
            const rawCountyInv = localStorage.getItem('county_inventory_items_v1');
            const existingCountyInv: any[] = rawCountyInv ? JSON.parse(rawCountyInv) : [];

            const newItems: any[] = req.items.map((item, idx) => ({
                id: `county-item-${Date.now()}-${idx + 1}`,
                countyId: institution?.countyId || 'county-default',
                name: item.name,
                category: 'Procured Supplies & Curriculum',
                quantity: Number(item.quantity),
                unit: item.unit || 'Units',
                unitPrice: item.unitCost || 0,
                minimumThreshold: Math.floor(Number(item.quantity) * 0.2),
                status: 'at_hq',
                at_hq_date: nowIso,
                storeLocation: 'Central County Logistics Warehouse',
                notes: `Ingested from Procurement LPO #${req.lpoNumber || req.id.slice(0, 8)} | Supplier: ${supplier?.name || 'Local Vendor'}`
            }));

            const updatedCountyInv = [...newItems, ...existingCountyInv];
            localStorage.setItem('county_inventory_items_v1', JSON.stringify(updatedCountyInv));

            for (const item of newItems) {
                try {
                    await apiService.saveModuleRecord('county_inventory', item);
                } catch (e) {
                    console.warn("Could not push item to county_inventory backend:", e);
                }
            }

            window.dispatchEvent(new CustomEvent('inventory_updated'));
            alert(`✓ Successfully ingested ${req.items.length} product lines (${req.items.reduce((s, i) => s + i.quantity, 0)} total units) from LPO #${req.lpoNumber || req.id.slice(0, 8)} into the County Central Logistics Warehouse!`);
        } catch (err: any) {
            console.error("Failed to ingest LPO into county inventory:", err);
            alert("Error ingesting into County Inventory: " + (err.message || 'Unknown error'));
        }
    };

    const handleAddItem = () => {
        if (!newItem.name || newItem.quantity <= 0) return;
        setItems([...items, { name: newItem.name, quantity: newItem.quantity, unit: newItem.unit, unitCost: newItem.unitCost }]);
        setNewItem({ id: '', name: '', quantity: 1, unit: 'pcs', unitCost: 0 });
        setItemSearchQuery('');
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmitRequisition = async () => {
        if (items.length === 0 || !selectedStoreId) {
            setSubmitError('Please add at least one item using the Add button above.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        try {
            const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

            const resolvedStoreId = retailStores.some(s => s.id === selectedStoreId)
                ? selectedStoreId
                : (retailStores.length > 0 ? retailStores[0].id : undefined);

            await onAddRequisition({
                storeId: resolvedStoreId,
                requestedBy: 'System', // This should ideally come from currentUser if available
                items,
                totalEstimatedCost: totalCost
            });

            setIsAddModalOpen(false);
            setItems([]);
            setSubmitError('');
        } catch (err: any) {
            console.error('Requisition submit error:', err);
            const detailedError = err?.details || err?.hint || err?.message || JSON.stringify(err);
            setSubmitError(`Failed to save: ${detailedError}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrintLpo = async (req: Requisition) => {
        if (!institution || !companyDetails) {
            alert("Institution or company details missing.");
            return;
        }
        try {
            const supplier = suppliers.find(s => s.id === req.supplierId);
            const dataUri = await generateLpoPdf(req, institution, companyDetails, companyDetails.logoUrl || null, supplier);
            
            const response = await fetch(dataUri);
            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);
            
            const win = window.open(blobUrl);
            if (win) {
                win.focus();
                setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
            } else {
                alert("Please allow pop-ups to view the LPO.");
            }
        } catch (err) {
            console.error("Failed to generate/print LPO:", err);
            alert("Failed to generate LPO.");
        }
    };

    const getStatusColor = (status: Requisition['status']) => {
        switch (status) {
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'ordered': return 'bg-indigo-100 text-indigo-700 border-indigo-200';
            case 'received': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'rejected': return 'bg-red-100 text-red-700 border-red-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-end mb-8">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Procurement Center</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">Manage Requisitions, LPOs and Vendor Relations</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => setIsAddModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                    >
                        <PlusIcon className="w-4 h-4" />
                        Quick Requisition
                    </button>
                </div>
            </div>

            <div className="flex gap-4 border-b border-slate-200 dark:border-slate-700 mb-8 overflow-x-auto pb-1 no-scrollbar">
                {[
                    { id: 'dashboard', label: 'Overview', icon: <ShoppingBagIcon className="w-4 h-4" /> },
                    { id: 'requisitions', label: 'Requisitions', icon: <FileIcon className="w-4 h-4" /> },
                    { id: 'lpos', label: 'Purchase Orders', icon: <TruckIcon className="w-4 h-4" /> },
                    { id: 'suppliers', label: 'Vendors', icon: <BuildingIcon className="w-4 h-4" /> },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveSubTab(tab.id as any)}
                        className={`flex items-center gap-2 px-4 py-3 border-b-2 font-black uppercase text-[10px] tracking-widest transition-all whitespace-nowrap ${activeSubTab === tab.id
                            ? 'border-indigo-600 text-indigo-600'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                            }`}
                    >
                        {tab.icon}
                        {tab.label}
                    </button>
                ))}
            </div>

            {activeSubTab === 'dashboard' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {[
                            { label: 'Waitlist Approval', value: requisitions.filter(r => r.status === 'pending').length, icon: <ClockIcon className="text-amber-500" />, bg: 'bg-amber-50' },
                            { label: 'Active LPOs', value: requisitions.filter(r => r.status === 'ordered').length, icon: <TruckIcon className="text-blue-500" />, bg: 'bg-blue-50' },
                            { label: 'Received (MTD)', value: requisitions.filter(r => r.status === 'received').length, icon: <CheckCircleIcon className="text-green-500" />, bg: 'bg-green-50' },
                            { label: 'Total Suppliers', value: suppliers.length, icon: <BuildingIcon className="text-slate-500" />, bg: 'bg-slate-50' },
                        ].map((stat, i) => (
                            <div key={i} className={`${stat.bg} p-6 rounded-[2rem] border border-white shadow-sm`}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-white rounded-2xl shadow-sm">{stat.icon}</div>
                                </div>
                                <p className="text-4xl font-black text-slate-900">{stat.value}</p>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">{stat.label}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-black uppercase tracking-tight">Recent Pending Requisitions</h3>
                            <button onClick={() => setActiveSubTab('requisitions')} className="text-indigo-600 text-[10px] font-black uppercase tracking-widest hover:underline">View All</button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="border-b border-slate-50 dark:border-slate-700">
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Source</th>
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Items</th>
                                        <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                                    {requisitions.filter(r => r.status === 'pending').slice(0, 5).map(req => (
                                        <tr key={req.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="py-4 text-xs font-bold text-slate-600">{new Date(req.requestedDate).toLocaleDateString()}</td>
                                            <td className="py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                        <StoreIcon className="w-3.5 h-3.5" />
                                                    </div>
                                                    <span className="text-xs font-black uppercase tracking-tight">{retailStores.find(s => s.id === req.storeId)?.name || 'Central'}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-xs font-medium text-slate-500">
                                                {req.items.length} Product(s)
                                            </td>
                                            <td className="py-4 text-right">
                                                <button
                                                    onClick={() => { setSelectedRequisition(req); setIsLPOModalOpen(true); }}
                                                    className="px-4 py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-600 hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                                                >
                                                    Generate LPO
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {requisitions.filter(r => r.status === 'pending').length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-12 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">No pending requisitions</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {(activeSubTab === 'requisitions' || activeSubTab === 'lpos') && (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50">
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">ID / LPO</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Requested By</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Items</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {requisitions
                                .filter(r => activeSubTab === 'requisitions' ? r.status === 'pending' || r.status === 'rejected' : r.status !== 'pending' && r.status !== 'rejected')
                                .map(req => (
                                    <tr key={req.id} className="group hover:bg-slate-50 transition-colors">
                                        <td className="py-5">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-900">{req.lpoNumber || req.id.slice(0, 8)}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{new Date(req.requestedDate).toLocaleDateString()}</span>
                                            </div>
                                        </td>
                                        <td className="py-5">
                                            <span className="text-xs font-bold text-slate-600 tracking-tight">{retailStores.find(s => s.id === req.storeId)?.name || 'Central Admin'}</span>
                                        </td>
                                        <td className="py-5">
                                            <span className="text-xs font-bold text-slate-600 tracking-tight">{suppliers.find(s => s.id === req.supplierId)?.name || 'Not Assigned'}</span>
                                        </td>
                                        <td className="py-5">
                                            <span className="text-xs font-medium text-slate-500">{req.items.length} items</span>
                                        </td>
                                        <td className="py-5">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getStatusColor(req.status)}`}>
                                                {req.status}
                                            </span>
                                        </td>
                                        <td className="py-5 text-right">
                                            <div className="flex justify-end gap-2">
                                                {req.status === 'pending' && (
                                                    <button
                                                        onClick={() => { setSelectedRequisition(req); setIsLPOModalOpen(true); }}
                                                        className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm" title="Generate LPO"
                                                    >
                                                        <TruckIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {req.status === 'ordered' && (
                                                    <button
                                                        onClick={() => handleReceiveItems(req)}
                                                        className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm" title="Mark as Received"
                                                    >
                                                        <CheckCircleIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {(req.status === 'received' || req.status === 'ordered') && (
                                                    <button
                                                        onClick={() => handleIngestIntoCountyInventory(req)}
                                                        className="p-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-600 hover:text-white transition-all shadow-sm flex items-center gap-1 text-[10px] font-bold"
                                                        title="Ingest into County Central Logistics Warehouse"
                                                    >
                                                        <BuildingIcon className="w-4 h-4" />
                                                        <span className="hidden xl:inline">To County Depot</span>
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => { setPreviewReq(req); setIsPreviewModalOpen(true); }}
                                                    className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-200 transition-all shadow-sm" title="Preview LPO"
                                                >
                                                    <FileSearchIcon className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => handlePrintLpo(req)}
                                                    className="p-2 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-200 transition-all shadow-sm" title="Print LPO"
                                                >
                                                    <PrinterIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* New Requisition Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">New Stock Request</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Inventory Replenishment</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <PlusIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-10 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Requesting Store</label>
                                <select
                                    value={selectedStoreId}
                                    onChange={(e) => setSelectedStoreId(e.target.value)}
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold uppercase focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="">- Select a Store -</option>
                                    {retailStores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Items</label>
                                <div className="space-y-3">
                                    <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-100 rounded-xl">
                                        <SearchIcon className="w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="Search inventory..."
                                            value={itemSearchQuery}
                                            onChange={(e) => setItemSearchQuery(e.target.value)}
                                            className="bg-transparent border-none text-[10px] font-bold outline-none flex-1"
                                        />
                                    </div>
                                    <div className="grid grid-cols-12 gap-2">
                                        <div className="col-span-12">
                                            <select
                                                value={newItem.id}
                                                onChange={(e) => {
                                                    const prod = inventory.find(i => i.id === e.target.value);
                                                    setNewItem({ 
                                                        ...newItem, 
                                                        id: prod?.id || '', 
                                                        name: prod?.name || '', 
                                                        unit: prod?.unit || 'pcs', 
                                                        unitCost: prod?.costPrice || 0 
                                                    })
                                                }}
                                                className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                            >
                                                <option value="">Select Product...</option>
                                                {inventory
                                                    .filter(i => i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) || i.sku.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                                                    .map(i => (
                                                        <option key={i.id} value={i.id}>{i.name} ({i.quantity} {i.unit} in stock)</option>
                                                    ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            placeholder="Qty"
                                            value={newItem.quantity}
                                            onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                            className="w-32 p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black outline-none"
                                        />
                                        <button
                                            onClick={handleAddItem}
                                            disabled={!newItem.id || newItem.quantity <= 0}
                                            className="flex-1 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest disabled:opacity-50"
                                        >
                                            Add Item
                                        </button>
                                    </div>
                                </div>

                                <div className="max-h-[200px] overflow-y-auto border border-slate-50 rounded-2xl">
                                    <table className="w-full text-left text-[10px]">
                                        <thead className="bg-slate-50 sticky top-0">
                                            <tr>
                                                <th className="p-3 font-black uppercase text-slate-400">Item</th>
                                                <th className="p-3 font-black uppercase text-slate-400 text-center">Qty</th>
                                                <th className="p-3 font-black uppercase text-slate-400 text-right">Action</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="p-3 font-bold text-slate-700">{item.name}</td>
                                                    <td className="p-3 font-black text-slate-900 text-center">{item.quantity} {item.unit}</td>
                                                    <td className="p-3 text-right">
                                                        <button onClick={() => handleRemoveItem(idx)} className="text-red-500 hover:text-red-700">
                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                            {items.length === 0 && (
                                                <tr>
                                                    <td colSpan={3} className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest">No items added yet</td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {submitError && (
                                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                                    <XCircleIcon className="w-5 h-5 text-red-500" />
                                    <p className="text-[10px] font-black uppercase tracking-tight text-red-600">{submitError}</p>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={items.length === 0 || isSubmitting || !selectedStoreId}
                                    onClick={handleSubmitRequisition}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <ClockIcon className="w-4 h-4 animate-spin" />
                                            Submitting...
                                        </>
                                    ) : 'Submit Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* LPO Generation Modal */}
            {isLPOModalOpen && selectedRequisition && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">Review & Generate LPO</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Transforming Requisition into Purchase Order</p>
                            </div>
                            <button onClick={() => setIsLPOModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <PlusIcon className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        <div className="p-10 space-y-8">
                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Requesting Location</label>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-3">
                                        <StoreIcon className="w-5 h-5 text-indigo-600" />
                                        <span className="font-black text-slate-900 uppercase text-xs tracking-tight">
                                            {retailStores.find(s => s.id === selectedRequisition.storeId)?.name || 'Central Admin'}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Select Supplier</label>
                                    <select
                                        value={selectedSupplierId}
                                        onChange={(e) => setSelectedSupplierId(e.target.value)}
                                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    >
                                        <option value="">- Choose a Vendor -</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name} ({s.contactPerson})</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Order Items</label>
                                <div className="border border-slate-100 rounded-3xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Item Name</th>
                                                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                                <th className="px-6 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Est. Unit Cost</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {selectedRequisition.items.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-6 py-4 text-xs font-bold text-slate-700 uppercase tracking-tight">{item.name}</td>
                                                    <td className="px-6 py-4 text-xs font-black text-slate-900 text-center">{item.quantity} {item.unit}</td>
                                                    <td className="px-6 py-4 text-xs font-black text-slate-900 text-right">KES {item.unitCost?.toLocaleString() || '0'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsLPOModalOpen(false)}
                                    className="flex-1 px-8 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all font-sans"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!selectedSupplierId}
                                    onClick={handleCreateLPO}
                                    className="flex-[2] px-8 py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-sans"
                                >
                                    Confirm & Generate LPO
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Preview Modal */}
            {isPreviewModalOpen && previewReq && (
                <LPOPreviewModal 
                    req={previewReq} 
                    suppliers={suppliers} 
                    onClose={() => setIsPreviewModalOpen(false)} 
                    onPrint={handlePrintLpo} 
                />
            )}
        </div>
    );
};

// Preview Modal
const LPOPreviewModal = ({ req, suppliers, onClose, onPrint }: { req: Requisition, suppliers: Supplier[], onClose: () => void, onPrint: (req: Requisition) => void }) => {
    const supplier = suppliers.find(s => s.id === req.supplierId);
    
    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[400] flex items-center justify-center p-4">
            <div className="bg-white rounded-[3rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Purchase Order Preview</h3>
                        <p className="text-indigo-200 text-[10px] font-black uppercase tracking-[0.2em] mt-1">LPO #{req.lpoNumber || 'DRAFT'}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <PlusIcon className="w-6 h-6 rotate-45" />
                    </button>
                </div>

                <div className="p-10 space-y-8">
                    <div className="flex justify-between items-start">
                        <div className="space-y-1">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Date</p>
                            <p className="text-sm font-black text-slate-900">{new Date(req.requestedDate).toLocaleDateString()}</p>
                        </div>
                        <div className="space-y-1 text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Value</p>
                            <p className="text-sm font-black text-indigo-600">KES {(req.items?.reduce((acc, item) => acc + (item.quantity * (item.unitCost || 0)), 0))?.toLocaleString()}</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Vendor</p>
                        <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
                            <p className="text-xs font-black text-slate-900">{supplier?.name || 'Not Assigned'}</p>
                            <p className="text-[10px] font-bold text-slate-500 mt-1">{supplier?.email || 'No email set'}</p>
                        </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                    <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Qty</th>
                                    <th className="px-4 py-2 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Total</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {req.items.map((item, i) => (
                                    <tr key={i}>
                                        <td className="px-4 py-3 text-[10px] font-bold text-slate-700 uppercase">{item.name}</td>
                                        <td className="px-4 py-3 text-[10px] font-black text-slate-900 text-center">{item.quantity} {item.unit}</td>
                                        <td className="px-4 py-3 text-[10px] font-black text-slate-900 text-right">KES {(item.quantity * (item.unitCost || 0))?.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <button
                        onClick={() => { onPrint(req); onClose(); }}
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3"
                    >
                        <PrinterIcon className="w-4 h-4" />
                        Generate & Print PDF
                    </button>
                </div>
            </div>
        </div>
    );
};

// Helper Icon for clarity within the component
const StoreIcon = ({ className }: { className?: string }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
);

