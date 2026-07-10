import React, { useState, useEffect } from 'react';
import type { User, RetailInventoryItem } from '../../types';
import { apiService } from '../../services/apiService';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XCircleIcon } from '../icons/XCircleIcon';

interface GoodsInLieuProposalsManagerProps {
    institutionId: string;
    users: User[];
    inventory: RetailInventoryItem[];
    onRefreshData?: () => void;
}

export const GoodsInLieuProposalsManager: React.FC<GoodsInLieuProposalsManagerProps> = ({
    institutionId,
    users,
    inventory: initialInventory = [],
    onRefreshData
}) => {
    const [proposals, setProposals] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>(initialInventory);
    const [isLoading, setIsLoading] = useState(false);

    // Modal state for Confirm Delivery
    const [selectedProposal, setSelectedProposal] = useState<any | null>(null);
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);
    const [deliveryForm, setDeliveryForm] = useState({
        mapToItemId: '', // 'new' or existing inventory item ID
        newItemName: '',
        newItemUnit: 'Bags',
        newItemValue: 0,
        receivedQuantity: 0,
        creditAmount: 0
    });

    const loadProposals = async () => {
        setIsLoading(true);
        try {
            const res = await apiService.fetchModuleRecords<any>('fee_goods_proposals', institutionId);
            setProposals(res || []);
        } catch (e) {
            console.error("Failed to load fee goods proposals:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const loadInventory = async () => {
        try {
            const res = await apiService.fetchModuleRecords<any>('inventory', institutionId);
            setInventoryItems(res || []);
        } catch (e) {
            console.error("Failed to load school inventory:", e);
        }
    };

    useEffect(() => {
        loadProposals();
        loadInventory();
    }, [institutionId]);

    const handleUpdateStatus = async (proposalId: string, status: 'approved' | 'rejected') => {
        try {
            const existing = proposals.find(p => p.id === proposalId);
            if (!existing) return;
            const updated = {
                ...existing,
                status: status,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('fee_goods_proposals', updated);
            alert(`Proposal status successfully marked as ${status}.`);
            loadProposals();
        } catch (e) {
            console.error("Failed to update proposal status:", e);
            alert("Failed to update status.");
        }
    };

    const handleOpenDeliveryModal = (proposal: any) => {
        setSelectedProposal(proposal);
        setDeliveryForm({
            mapToItemId: 'new',
            newItemName: proposal.itemName,
            newItemUnit: proposal.unit,
            newItemValue: proposal.unitValue,
            receivedQuantity: proposal.quantity,
            creditAmount: proposal.totalValue
        });
        setIsDeliveryModalOpen(true);
    };

    const handleConfirmDelivery = async () => {
        if (!selectedProposal) return;
        const { mapToItemId, newItemName, newItemUnit, newItemValue, receivedQuantity, creditAmount } = deliveryForm;

        if (mapToItemId === 'new' && !newItemName.trim()) {
            alert("Please specify a name for the new inventory item.");
            return;
        }
        if (!receivedQuantity || receivedQuantity <= 0) {
            alert("Please specify a valid received quantity.");
            return;
        }

        try {
            // 1. Update Inventory item stock
            if (mapToItemId === 'new') {
                const newItem = {
                    id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
                    name: newItemName.trim(),
                    category: 'School Supplies',
                    quantity: Number(receivedQuantity),
                    unit: newItemUnit.trim(),
                    reorderLevel: 5,
                    institutionId: institutionId,
                    price: Number(newItemValue),
                    itemType: 'consumable' as const,
                    lastUpdated: new Date().toISOString()
                };
                await apiService.saveModuleRecord('inventory', newItem);
            } else {
                const matchedItem = inventoryItems.find(i => i.id === mapToItemId);
                if (matchedItem) {
                    const updatedItem = {
                        ...matchedItem,
                        quantity: Number(matchedItem.quantity || 0) + Number(receivedQuantity),
                        lastUpdated: new Date().toISOString()
                    };
                    await apiService.saveModuleRecord('inventory', updatedItem);
                }
            }

            // 2. Mark proposal as delivered (pending accounts clearance)
            const updatedProposal = {
                ...selectedProposal,
                status: 'delivered' as const,
                notes: `${selectedProposal.notes || ''}\n[Delivery verified by Storekeeper on ${new Date().toLocaleDateString()}]`,
                updatedAt: new Date().toISOString()
            };
            await apiService.saveModuleRecord('fee_goods_proposals', updatedProposal);

            alert("Delivery successfully processed! Inventory stock updated. The proposal is now pending accounts/bursar clearance for receipt generation.");
            setIsDeliveryModalOpen(false);
            setSelectedProposal(null);
            loadProposals();
            loadInventory();
            if (onRefreshData) onRefreshData();
        } catch (e) {
            console.error("Failed to confirm delivery:", e);
            alert("Failed to process delivery.");
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm space-y-6 text-left">
            <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Goods / Services Payment Proposals</h3>
                <p className="text-xs text-slate-400">Review parent proposals to supply school stores or perform services in exchange for student fee credits.</p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center p-12">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                </div>
            ) : proposals.length === 0 ? (
                <p className="text-center text-xs text-slate-400 py-10 bg-slate-50 dark:bg-slate-950/20 rounded-2xl">No goods payment proposals registered.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="border-b dark:border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                <th className="p-4">Date</th>
                                <th className="p-4">Student Name</th>
                                <th className="p-4">Item Name</th>
                                <th className="p-4 text-right">Quantity</th>
                                <th className="p-4 text-right">Unit Value</th>
                                <th className="p-4 text-right">Total Value</th>
                                <th className="p-4 text-center">Status</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {proposals.map((p) => {
                                const studentUser = users.find(u => u.id === p.studentId);
                                const statusColors: Record<string, string> = {
                                    pending: 'bg-amber-50 border-amber-200 text-amber-750 dark:bg-amber-950/20 dark:text-amber-400',
                                    approved: 'bg-indigo-50 border-indigo-200 text-indigo-750 dark:bg-indigo-950/20 dark:text-indigo-400',
                                    delivered: 'bg-sky-50 border-sky-200 text-sky-750 dark:bg-sky-950/20 dark:text-sky-400',
                                    credited: 'bg-emerald-50 border-emerald-200 text-emerald-750 dark:bg-emerald-950/20 dark:text-emerald-400',
                                    rejected: 'bg-rose-50 border-rose-200 text-rose-750 dark:bg-rose-950/20 dark:text-rose-400'
                                };
                                return (
                                    <tr key={p.id} className="border-b dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-950/25 transition-colors">
                                        <td className="p-4 text-xs font-bold text-slate-650 dark:text-slate-350">
                                            {p.createdAt ? new Date(p.createdAt).toLocaleDateString() : '—'}
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-black text-slate-800 dark:text-white">{studentUser?.name || 'Unknown student'}</p>
                                            <p className="text-[10px] text-slate-400 font-bold">{studentUser?.email || ''}</p>
                                        </td>
                                        <td className="p-4">
                                            <p className="text-xs font-black text-slate-800 dark:text-white">{p.itemName}</p>
                                            {p.notes && <p className="text-[10px] text-slate-450 italic mt-0.5">"{p.notes}"</p>}
                                        </td>
                                        <td className="p-4 text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                                            {p.quantity} {p.unit}
                                        </td>
                                        <td className="p-4 text-xs font-bold text-slate-700 dark:text-slate-300 text-right">
                                            KES {p.unitValue?.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-xs font-black text-slate-900 dark:text-white text-right">
                                            KES {p.totalValue?.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-center">
                                            <span className={`px-2.5 py-1 text-[9px] font-black uppercase tracking-wider rounded-lg border ${statusColors[p.status] || 'bg-slate-50'}`}>
                                                {p.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-center">
                                            <div className="flex gap-2 justify-center">
                                                {p.status === 'pending' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(p.id, 'approved')}
                                                            title="Approve Proposal"
                                                            className="p-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950 text-indigo-650 rounded-lg transition-colors border dark:border-indigo-800"
                                                        >
                                                            <CheckCircleIcon className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(p.id, 'rejected')}
                                                            title="Reject Proposal"
                                                            className="p-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-955 text-rose-655 rounded-lg transition-colors border dark:border-rose-800"
                                                        >
                                                            <XCircleIcon className="w-4 h-4" />
                                                        </button>
                                                    </>
                                                )}
                                                {p.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleOpenDeliveryModal(p)}
                                                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-md"
                                                    >
                                                        Confirm Delivery
                                                    </button>
                                                )}
                                                {p.status === 'delivered' && (
                                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold italic">Pending Finance Approval</span>
                                                )}
                                                {p.status === 'credited' && (
                                                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold italic">Cleared & Credited</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Delivery Confirmation Dialog */}
            {isDeliveryModalOpen && selectedProposal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 space-y-6 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center border-b pb-4">
                            <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-wider">Verify Inventory Intake</h4>
                            <button onClick={() => { setIsDeliveryModalOpen(false); setSelectedProposal(null); }} className="text-slate-400 hover:text-slate-650 text-lg">×</button>
                        </div>

                        <div className="space-y-4 text-left">
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl space-y-1.5 text-xs text-slate-600 dark:text-slate-400 font-bold border">
                                <p>Parent Proposal: <span className="font-extrabold text-slate-800 dark:text-white">{selectedProposal.itemName} ({selectedProposal.quantity} {selectedProposal.unit})</span></p>
                                <p>Proposed Valuation: <span className="font-extrabold text-indigo-650">KES {selectedProposal.totalValue?.toLocaleString()}</span></p>
                            </div>

                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Map to Inventory Record</label>
                                <select
                                    value={deliveryForm.mapToItemId}
                                    onChange={e => setDeliveryForm(prev => ({ ...prev, mapToItemId: e.target.value }))}
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                >
                                    <option value="new">+ Create New School Supply Inventory Item</option>
                                    {inventoryItems.map(item => (
                                        <option key={item.id} value={item.id}>{item.name} ({item.quantity} {item.unit} in stock)</option>
                                    ))}
                                </select>
                            </div>

                            {deliveryForm.mapToItemId === 'new' && (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">New Inventory Item Name</label>
                                    <input
                                        type="text"
                                        value={deliveryForm.newItemName}
                                        onChange={e => setDeliveryForm(prev => ({ ...prev, newItemName: e.target.value }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Actual Qty Received</label>
                                    <input
                                        type="number"
                                        value={deliveryForm.receivedQuantity}
                                        onChange={e => setDeliveryForm(prev => ({ ...prev, receivedQuantity: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Total Fee Credit (KES)</label>
                                    <input
                                        type="number"
                                        value={deliveryForm.creditAmount}
                                        onChange={e => setDeliveryForm(prev => ({ ...prev, creditAmount: Number(e.target.value) }))}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs text-slate-900 dark:text-white"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 border-t pt-4">
                            <button
                                onClick={() => { setIsDeliveryModalOpen(false); setSelectedProposal(null); }}
                                className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl text-xs font-black uppercase tracking-wider"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelivery}
                                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md"
                            >
                                Verify & Accept Intake
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
