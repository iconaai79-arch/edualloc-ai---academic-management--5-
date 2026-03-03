
import React, { useState } from 'react';
import {
    FileText as FileIcon,
    Plus as PlusIcon,
    Search as SearchIcon,
    Clock as ClockIcon,
    CheckCircle as CheckCircleIcon,
    XCircle as XCircleIcon,
    Package as PackageIcon,
    Trash2 as TrashIcon
} from 'lucide-react';
import { Requisition, RetailStore, User, RetailInventoryItem } from '../../types';

interface RetailRequisitionsProps {
    institutionId: string;
    currentUser: User;
    retailStores: RetailStore[];
    requisitions: Requisition[];
    inventory: RetailInventoryItem[];
    onAddRequisition: (req: Omit<Requisition, 'id' | 'status' | 'requestedDate' | 'institutionId'>) => Promise<void>;
}

export function RetailRequisitions({
    institutionId,
    currentUser,
    retailStores,
    requisitions,
    inventory,
    onAddRequisition
}: RetailRequisitionsProps) {
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedStoreId, setSelectedStoreId] = useState<string>(retailStores[0]?.id || '');

    const [items, setItems] = useState<{ name: string, quantity: number, unit: string, unitCost: number }[]>([]);
    const [newItem, setNewItem] = useState({ name: '', quantity: 1, unit: 'pcs', unitCost: 0 });

    const handleAddItem = () => {
        if (!newItem.name || newItem.quantity <= 0) return;
        setItems([...items, newItem]);
        setNewItem({ name: '', quantity: 1, unit: 'pcs', unitCost: 0 });
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async () => {
        if (items.length === 0 || !selectedStoreId) {
            alert('Please add at least one item');
            return;
        }

        const totalCost = items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

        await onAddRequisition({
            storeId: selectedStoreId,
            requestedBy: currentUser.id,
            items,
            totalEstimatedCost: totalCost
        });

        setIsAddModalOpen(false);
        setItems([]);
        alert('Requisition submitted for approval!');
    };

    const myRequisitions = requisitions.filter(r =>
        retailStores.some(s => s.id === r.storeId) // Show all stores this manager can see
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Stock Requisitions</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Request new inventory from central management</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Request
                </button>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-700">
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Store</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Items</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">LPO #</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {myRequisitions.map(req => (
                                <tr key={req.id} className="group hover:bg-slate-50 transition-colors">
                                    <td className="py-5 text-xs font-bold text-slate-500">{new Date(req.requestedDate).toLocaleDateString()}</td>
                                    <td className="py-5">
                                        <span className="text-xs font-black uppercase tracking-tight text-slate-900">
                                            {retailStores.find(s => s.id === req.storeId)?.name || 'Central'}
                                        </span>
                                    </td>
                                    <td className="py-5 text-xs font-medium text-slate-600">
                                        {req.items.length} Product(s)
                                    </td>
                                    <td className="py-5">
                                        <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${req.status === 'pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                req.status === 'received' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                    'bg-slate-50 text-slate-500 border-slate-100'
                                            }`}>
                                            {req.status}
                                        </span>
                                    </td>
                                    <td className="py-5 text-right font-black text-slate-900 text-xs">
                                        {req.lpoNumber || '-'}
                                    </td>
                                </tr>
                            ))}
                            {myRequisitions.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <FileIcon className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">No requisitions submitted yet</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

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
                                    {retailStores.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Add Items</label>
                                <div className="grid grid-cols-4 gap-2">
                                    <div className="col-span-2">
                                        <select
                                            value={newItem.name}
                                            onChange={(e) => {
                                                const prod = inventory.find(i => i.id === e.target.value);
                                                setNewItem({ ...newItem, name: prod?.name || '', unit: prod?.unit || 'pcs' })
                                            }}
                                            className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold outline-none"
                                        >
                                            <option value="">Select Product...</option>
                                            {inventory.map(i => (
                                                <option key={i.id} value={i.id}>{i.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <input
                                        type="number"
                                        placeholder="Qty"
                                        value={newItem.quantity}
                                        onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                                        className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-black outline-none"
                                    />
                                    <button
                                        onClick={handleAddItem}
                                        className="bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest"
                                    >
                                        Add
                                    </button>
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
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all underline"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={items.length === 0}
                                    onClick={handleSubmit}
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 transition-all active:scale-95"
                                >
                                    Submit Request
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
