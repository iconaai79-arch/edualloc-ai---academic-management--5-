import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { RetailStockTransfer, RetailStore, RetailInventoryItem, RetailStockTransferItem, User } from '../../types';
import { Truck, ArrowRight, Plus, CheckCircle2, Clock, AlertCircle, Search, MapPin, Package, X, ChevronRight } from 'lucide-react';

interface RetailStockTransfersProps {
    institutionId: string;
    currentUser: User;
}

export function RetailStockTransfers({ institutionId, currentUser }: RetailStockTransfersProps) {
    const [transfers, setTransfers] = useState<RetailStockTransfer[]>([]);
    const [stores, setStores] = useState<RetailStore[]>([]);
    const [inventory, setInventory] = useState<RetailInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // New Transfer Form State
    const [sourceStoreId, setSourceStoreId] = useState('');
    const [destStoreId, setDestStoreId] = useState('');
    const [selectedItems, setSelectedItems] = useState<{ itemId: string, quantity: number }[]>([]);
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    useEffect(() => {
        fetchData();
    }, [institutionId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [transfersData, storesData, inventoryData] = await Promise.all([
                apiService.fetchModuleRecords<RetailStockTransfer>('retail_stock_transfers', institutionId),
                apiService.fetchModuleRecords<RetailStore>('retail_stores', institutionId),
                apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId)
            ]);

            if (transfersData) setTransfers(transfersData);
            if (storesData) setStores(storesData);
            if (inventoryData) setInventory(inventoryData);
        } catch (err) {
            console.error("Fetch transfers error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateTransfer = async () => {
        if (!sourceStoreId || !destStoreId || selectedItems.length === 0) {
            setSubmitError(!sourceStoreId ? 'Please select a Source Store.' : !destStoreId ? 'Please select a Destination Store.' : 'Please add at least one item to transfer.');
            return;
        }
        if (sourceStoreId === destStoreId) {
            setSubmitError('Source and Destination stores cannot be the same.');
            return;
        }

        setIsSubmitting(true);
        setSubmitError('');
        try {
            const newTransfer = {
                institutionId,
                sourceStoreId,
                destinationStoreId: destStoreId,
                requestedById: currentUser.id,
                status: 'pending' as any,
                notes,
                createdAt: new Date().toISOString()
            } as RetailStockTransfer;

            const savedTransfer = await apiService.saveModuleRecord<RetailStockTransfer>('retail_stock_transfers', newTransfer);

            if (savedTransfer && (savedTransfer as any).id) {
                const transferItems = selectedItems.map(item => ({
                    transferId: (savedTransfer as any).id,
                    itemId: item.itemId,
                    quantity: item.quantity
                }));

                await Promise.all(transferItems.map(ti => apiService.saveModuleRecord('retail_stock_transfer_items', ti)));

                setIsCreateModalOpen(false);
                fetchData();
                resetForm();
            } else {
                setSubmitError('Transfer could not be saved. Please check your store setup and try again.');
            }
        } catch (err: any) {
            console.error("Create transfer error:", err);
            const msg = err?.message || 'Unknown error';
            setSubmitError(`Error: ${msg}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStatusUpdate = async (transferId: string, newStatus: 'approved' | 'completed' | 'rejected') => {
        try {
            const transfer = transfers.find(t => t.id === transferId);
            if (!transfer) return;

            await apiService.saveModuleRecord('retail_stock_transfers', {
                ...transfer,
                status: newStatus,
                approvedById: newStatus === 'approved' ? currentUser.id : transfer.approvedById,
                completedAt: newStatus === 'completed' ? new Date().toISOString() : transfer.completedAt
            });
            fetchData();
        } catch (err) {
            console.error("Update status error:", err);
        }
    };

    const resetForm = () => {
        setSourceStoreId('');
        setDestStoreId('');
        setSelectedItems([]);
        setNotes('');
        setSubmitError('');
    };

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
            case 'approved': return 'bg-blue-100 text-blue-700 border-blue-200';
            case 'pending': return 'bg-amber-100 text-amber-700 border-amber-200';
            case 'rejected': return 'bg-rose-100 text-rose-700 border-rose-200';
            default: return 'bg-slate-100 text-slate-700 border-slate-200';
        }
    };

    const getStoreName = (id: string) => stores.find(s => s.id === id)?.name || 'Unknown Store';

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Stock Transfers</h2>
                    <p className="text-slate-500 text-sm mt-1">Move inventory between stores and field agents.</p>
                </div>

                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg shadow-md hover:bg-indigo-700 transition-all text-sm font-medium"
                >
                    <Plus className="w-4 h-4" />
                    New Transfer
                </button>
            </div>

            {/* Transfers List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Date</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Route</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Items</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Status</th>
                                <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {transfers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                        <Truck className="w-12 h-12 mx-auto mb-3 opacity-20" />
                                        <p>No stock transfers found</p>
                                    </td>
                                </tr>
                            ) : (
                                transfers.map((transfer) => (
                                    <tr key={transfer.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-medium text-slate-900">{new Date(transfer.createdAt).toLocaleDateString()}</p>
                                            <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><Clock className="w-3 h-3" /> {new Date(transfer.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="text-xs">
                                                    <p className="font-semibold text-slate-700">{getStoreName(transfer.sourceStoreId)}</p>
                                                    <div className="flex items-center gap-2 text-slate-400 my-1">
                                                        <ArrowRight className="w-3 h-3" />
                                                    </div>
                                                    <p className="font-semibold text-indigo-600">{getStoreName(transfer.destinationStoreId)}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded">
                                                Loading...
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${getStatusStyles(transfer.status)}`}>
                                                {transfer.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex gap-2">
                                                {transfer.status === 'pending' && currentUser.role === 'admin' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(transfer.id, 'approved')}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="Approve"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {transfer.status === 'approved' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(transfer.id, 'completed')}
                                                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                        title="Complete Delivery"
                                                    >
                                                        <Package className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {transfer.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleStatusUpdate(transfer.id, 'rejected')}
                                                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                        title="Reject"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal - Simplified for now */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Initiate Stock Transfer</h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Select source and destination stores</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white rounded-xl transition-colors">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Source Store</label>
                                    <select
                                        value={sourceStoreId}
                                        onChange={(e) => setSourceStoreId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select Source</option>
                                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Destination Agent/Store</label>
                                    <select
                                        value={destStoreId}
                                        onChange={(e) => setDestStoreId(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        <option value="">Select Destination</option>
                                        {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Transfer Notes</label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 outline-none h-20"
                                    placeholder="Reasons for transfer, instructions for agent, etc."
                                />
                            </div>

                            {/* Item Selection */}
                            <div>
                                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-3">
                                    Items to Transfer <span className="text-rose-500">*</span>
                                </label>
                                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                                    <div className="max-h-48 overflow-y-auto divide-y divide-slate-100">
                                        {inventory.length === 0 ? (
                                            <div className="p-4 text-center text-slate-400 text-sm">No inventory items found</div>
                                        ) : inventory.map(item => {
                                            const existing = selectedItems.find(si => si.itemId === item.id);
                                            return (
                                                <div key={item.id} className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{item.name}</p>
                                                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">{item.sku || item.category} • Stock: {item.quantity ?? 0}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {existing ? (
                                                            <>
                                                                <input
                                                                    type="number"
                                                                    min={1}
                                                                    max={item.quantity ?? 999}
                                                                    value={existing.quantity}
                                                                    onChange={e => {
                                                                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                                                                        setSelectedItems(prev => prev.map(si => si.itemId === item.id ? { ...si, quantity: qty } : si));
                                                                    }}
                                                                    className="w-16 text-center bg-white border border-indigo-300 rounded-lg px-2 py-1 text-sm font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-400 outline-none"
                                                                />
                                                                <button
                                                                    onClick={() => setSelectedItems(prev => prev.filter(si => si.itemId !== item.id))}
                                                                    className="p-1 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                                                >
                                                                    <X className="w-4 h-4" />
                                                                </button>
                                                            </>
                                                        ) : (
                                                            <button
                                                                onClick={() => setSelectedItems(prev => [...prev, { itemId: item.id, quantity: 1 }])}
                                                                className="px-3 py-1.5 bg-indigo-50 text-indigo-600 text-xs font-black uppercase tracking-widest rounded-lg hover:bg-indigo-600 hover:text-white transition-all"
                                                            >
                                                                + Add
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                                {selectedItems.length > 0 && (
                                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-2">
                                        ✓ {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                                    </p>
                                )}
                            </div>

                            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                <p className="text-xs font-bold text-amber-800 leading-relaxed">
                                    Once submitted, the Warehouse Manager must approve this transfer before stock is released. Ensure items are physically packed.
                                </p>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50 border-t border-slate-100 flex flex-col gap-3">
                            {submitError && (
                                <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
                                    <AlertCircle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                                    <p className="text-xs font-bold text-rose-700">{submitError}</p>
                                </div>
                            )}
                            <div className="flex justify-end gap-3">
                                <button
                                    onClick={() => { setIsCreateModalOpen(false); resetForm(); }}
                                    className="px-6 py-3 text-sm font-bold text-slate-500 uppercase tracking-widest hover:text-slate-800 transition-colors"
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateTransfer}
                                    disabled={isSubmitting}
                                    className={`px-8 py-3 text-sm font-black uppercase tracking-widest rounded-xl shadow-lg transition-all flex items-center gap-2 ${isSubmitting
                                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                        : 'bg-indigo-600 text-white hover:shadow-indigo-200/50 hover:-translate-y-0.5'
                                        }`}
                                >
                                    {isSubmitting && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                                    {isSubmitting ? 'Submitting...' : 'Submit Transfer Request'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline missing icon
const Globe = ({ className }: any) => <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" /><path d="M2 12h20" /></svg>;
