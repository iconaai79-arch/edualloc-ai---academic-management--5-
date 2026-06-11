import React, { useState, useEffect, useMemo } from 'react';
import { StockReceipt, StockReceiptItem, Supplier, RetailInventoryItem, User } from '../../types';
import { apiService } from '../../services/apiService';
import { PlusIcon } from '../icons/PlusIcon';
import { ArchiveBoxIcon as Package } from '../icons/ArchiveBoxIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { MagnifyingGlassIcon as SearchIcon } from '../icons/MagnifyingGlassIcon';
import { TruckIcon } from '../icons/TruckIcon';
import { DocumentTextIcon as ReceiptIcon } from '../icons/DocumentTextIcon';

interface RetailStockReceiptsProps {
    institutionId: string;
    currentUser: User;
}

export function RetailStockReceipts({ institutionId, currentUser }: RetailStockReceiptsProps) {
    const [receipts, setReceipts] = useState<StockReceipt[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [inventoryItems, setInventoryItems] = useState<RetailInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const [formData, setFormData] = useState<Partial<StockReceipt>>({
        supplierId: '',
        referenceNumber: '',
        receiptDate: new Date().toISOString().split('T')[0],
        notes: '',
        items: []
    });

    const [itemSearchQuery, setItemSearchQuery] = useState('');
    const [showItemDropdown, setShowItemDropdown] = useState(false);

    useEffect(() => {
        // Auto-migration to ensure retail_stock_receipts table exists
        const migrationSql = `
            CREATE TABLE IF NOT EXISTS public.retail_stock_receipts (
                id TEXT PRIMARY KEY,
                institution_id TEXT NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
                supplier_id TEXT REFERENCES public.suppliers(id) ON DELETE SET NULL,
                supplier_name TEXT,
                reference_number TEXT NOT NULL,
                receipt_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
                items JSONB NOT NULL DEFAULT '[]'::jsonb,
                recorded_by TEXT REFERENCES public.users(id) ON DELETE SET NULL,
                status TEXT DEFAULT 'completed',
                notes TEXT,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );

            -- Enable RLS
            ALTER TABLE public.retail_stock_receipts ENABLE ROW LEVEL SECURITY;

            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE tablename = 'retail_stock_receipts' 
                    AND policyname = 'Users can view their institution''s retail_stock_receipts'
                ) THEN
                    CREATE POLICY "Users can view their institution''s retail_stock_receipts"
                        ON public.retail_stock_receipts FOR SELECT
                        USING (institution_id IN (
                            SELECT institution_id FROM public.users WHERE id::TEXT = auth.uid()::TEXT
                        ));
                END IF;

                IF NOT EXISTS (
                    SELECT 1 FROM pg_policies 
                    WHERE tablename = 'retail_stock_receipts' 
                    AND policyname = 'Admins/Agents can manage their institution''s retail_stock_receipts'
                ) THEN
                    CREATE POLICY "Admins/Agents can manage their institution''s retail_stock_receipts"
                        ON public.retail_stock_receipts FOR ALL
                        USING (institution_id IN (
                            SELECT institution_id FROM public.users WHERE id::TEXT = auth.uid()::TEXT
                        ));
                END IF;
            END $$;

            GRANT ALL ON TABLE public.retail_stock_receipts TO anon, authenticated, service_role;
        `;
        apiService.runMigration(migrationSql)
            .then(() => fetchData())
            .catch(() => fetchData());
    }, [institutionId]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [receiptsData, suppliersData, itemsData] = await Promise.all([
                apiService.fetchModuleRecords<StockReceipt>('retail_stock_receipts', institutionId),
                apiService.fetchModuleRecords<Supplier>('suppliers', institutionId),
                apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId)
            ]);
            setReceipts(receiptsData || []);
            setSuppliers(suppliersData || []);
            setInventoryItems(itemsData || []);
        } catch (error) {
            console.error('Failed to load stock receipts data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddItem = (inventoryItem: RetailInventoryItem) => {
        const currentItems = formData.items || [];
        const existingItemIndex = currentItems.findIndex(i => i.itemId === inventoryItem.id);

        if (existingItemIndex >= 0) {
            const newItems = [...currentItems];
            newItems[existingItemIndex].quantity += 1;
            setFormData({ ...formData, items: newItems });
        } else {
            setFormData({
                ...formData,
                items: [
                    ...currentItems,
                    {
                        itemId: inventoryItem.id,
                        itemName: inventoryItem.name,
                        sku: inventoryItem.sku,
                        quantity: 1,
                        unitCost: inventoryItem.costPrice || 0
                    }
                ]
            });
        }
        setItemSearchQuery('');
        setShowItemDropdown(false);
    };

    const handleUpdateItem = (index: number, field: keyof StockReceiptItem, value: number) => {
        const newItems = [...(formData.items || [])];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...(formData.items || [])];
        newItems.splice(index, 1);
        setFormData({ ...formData, items: newItems });
    };

    const calculateTotal = () => {
        return (formData.items || []).reduce((total, item) => total + (item.quantity * item.unitCost), 0);
    };

    const handleSaveReceipt = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.supplierId) {
            alert('Please select a supplier.');
            return;
        }

        if (!formData.items || formData.items.length === 0) {
            alert('Please add at least one item to the receipt.');
            return;
        }

        try {
            const supplier = suppliers.find(s => s.id === formData.supplierId);
            const totalAmount = calculateTotal();
            
            const receipt: StockReceipt = {
                id: `SR-${Date.now()}`,
                institutionId,
                supplierId: formData.supplierId,
                supplierName: supplier?.name || 'Unknown',
                referenceNumber: formData.referenceNumber || `REF-${Date.now()}`,
                receiptDate: formData.receiptDate || new Date().toISOString(),
                totalAmount,
                items: formData.items,
                recordedBy: currentUser.id,
                status: 'completed',
                notes: formData.notes,
                createdAt: new Date().toISOString()
            };

            // Save the receipt
            await apiService.saveModuleRecord('retail_stock_receipts', receipt);

            // Update inventory quantities
            for (const receiptItem of receipt.items) {
                // Fetch latest to avoid race conditions as much as possible
                const inventoryItemArr = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId);
                const item = inventoryItemArr.find(i => i.id === receiptItem.itemId);
                
                if (item) {
                    item.quantity += receiptItem.quantity;
                    item.lastUpdated = new Date().toISOString();
                    // Optionally update cost price here if desired (e.g. weighted average), skipping for now to just update qty
                    await apiService.saveModuleRecord('retail_inventory_items', item);
                }
            }

            setIsAddModalOpen(false);
            setFormData({
                supplierId: '',
                referenceNumber: '',
                receiptDate: new Date().toISOString().split('T')[0],
                notes: '',
                items: []
            });
            fetchData();
            alert('Stock receipt saved and inventory updated successfully!');
        } catch (error) {
            console.error('Failed to save receipt:', error);
            alert('Failed to save stock receipt. Please try again.');
        }
    };

    const filteredReceipts = useMemo(() => {
        return receipts.filter(r => 
            (r.referenceNumber || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (r.supplierName || '').toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [receipts, searchQuery]);

    const filteredInventoryItems = useMemo(() => {
        if (!itemSearchQuery) return inventoryItems;
        return inventoryItems.filter(i => 
            i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
            i.sku.toLowerCase().includes(itemSearchQuery.toLowerCase())
        );
    }, [inventoryItems, itemSearchQuery]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Receive Stock</h2>
                    <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Log incoming deliveries and auto-update inventory</p>
                </div>
                <button
                    onClick={() => {
                        setFormData({
                            supplierId: '',
                            referenceNumber: '',
                            receiptDate: new Date().toISOString().split('T')[0],
                            notes: '',
                            items: []
                        });
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <PlusIcon className="w-4 h-4" />
                    New Receipt
                </button>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-white dark:border-slate-700 shadow-sm relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-indigo-100/50 dark:bg-indigo-900/20 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                    <div className="relative z-10">
                        <div className="p-3 bg-white dark:bg-slate-700 rounded-2xl w-fit shadow-sm mb-4">
                            <TruckIcon className="w-5 h-5 text-indigo-600" />
                        </div>
                        <p className="text-3xl font-black text-slate-900 dark:text-white">{receipts.length}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Total Deliveries</p>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-[2rem] border border-white dark:border-slate-700 shadow-sm relative overflow-hidden group md:col-span-2">
                    <div className="relative z-10 flex h-full items-center gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH RECEIPTS..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-700 rounded-2xl border-none text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Receipts List */}
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 p-8 shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 dark:border-slate-700">
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Date & Ref</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Supplier</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Items</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Total Value</th>
                                <th className="pb-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-4">Loading receipts...</p>
                                    </td>
                                </tr>
                            ) : filteredReceipts.map(receipt => (
                                <tr key={receipt.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                                <ReceiptIcon className="w-4 h-4" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white">{new Date(receipt.receiptDate).toLocaleDateString()}</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{receipt.referenceNumber}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="py-5">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{receipt.supplierName}</span>
                                    </td>
                                    <td className="py-5">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-tight">{receipt.items.length} unique item(s)</span>
                                    </td>
                                    <td className="py-5">
                                        <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">KES {receipt.totalAmount.toLocaleString()}</span>
                                    </td>
                                    <td className="py-5 text-right">
                                        <span className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                            {receipt.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {!isLoading && filteredReceipts.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        No receipts found
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add Receipt Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[500] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] w-full max-w-4xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[90vh]">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center shrink-0">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">
                                    Receive Stock
                                </h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Log delivery & update inventory</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-black uppercase tracking-widest transition-colors">
                                Close
                            </button>
                        </div>

                        <div className="p-8 overflow-y-auto flex-1 space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Supplier *</label>
                                    <select
                                        value={formData.supplierId}
                                        onChange={(e) => setFormData({...formData, supplierId: e.target.value})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
                                    >
                                        <option value="">-- Select Supplier --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Reference / Invoice No. *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.referenceNumber}
                                        onChange={(e) => setFormData({...formData, referenceNumber: e.target.value})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. INV-20234"
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-1">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Date Received *</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.receiptDate}
                                        onChange={(e) => setFormData({...formData, receiptDate: e.target.value})}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border-none text-xs font-bold uppercase tracking-tight focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">Received Items</h4>
                                    </div>
                                    <div className="relative w-72">
                                        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="text"
                                            placeholder="SEARCH INVENTORY..."
                                            value={itemSearchQuery}
                                            onChange={(e) => {
                                                setItemSearchQuery(e.target.value);
                                                setShowItemDropdown(true);
                                            }}
                                            onFocus={() => setShowItemDropdown(true)}
                                            className="w-full pl-10 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border-none text-[10px] font-black uppercase tracking-widest focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                        {showItemDropdown && itemSearchQuery && (
                                            <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto">
                                                {filteredInventoryItems.length > 0 ? (
                                                    filteredInventoryItems.slice(0, 10).map(item => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onClick={() => handleAddItem(item)}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                                        >
                                                            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase truncate">{item.name}</div>
                                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.sku}</div>
                                                        </button>
                                                    ))
                                                ) : (
                                                    <div className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">No items found</div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {formData.items && formData.items.length > 0 ? (
                                    <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl overflow-hidden border border-slate-100 dark:border-slate-700">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="border-b border-slate-200 dark:border-slate-700">
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-24">Qty Recv</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-32 text-right">Unit Cost (KES)</th>
                                                    <th className="px-4 py-3 text-[9px] font-black uppercase tracking-widest text-slate-400 w-32 text-right">Total (KES)</th>
                                                    <th className="px-4 py-3 w-12"></th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                {formData.items.map((item, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-3">
                                                            <div className="text-xs font-bold text-slate-900 dark:text-white uppercase truncate">{item.itemName}</div>
                                                            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.sku}</div>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) => handleUpdateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                                                                className="w-full p-2 bg-white dark:bg-slate-900 rounded-lg border-none text-xs font-bold text-center focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.unitCost}
                                                                onChange={(e) => handleUpdateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                                                className="w-full p-2 bg-white dark:bg-slate-900 rounded-lg border-none text-xs font-bold text-right focus:ring-2 focus:ring-indigo-500 outline-none"
                                                            />
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                                                                {(item.quantity * item.unitCost).toLocaleString()}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleRemoveItem(index)}
                                                                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                            >
                                                                <TrashIcon className="w-4 h-4" />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                            <tfoot>
                                                <tr className="border-t border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                                                    <td colSpan={3} className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 text-right">Grand Total:</td>
                                                    <td className="px-4 py-4 text-right">
                                                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                                                            KES {calculateTotal().toLocaleString()}
                                                        </span>
                                                    </td>
                                                    <td></td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl text-center">
                                        <Package className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Search and select items above to add to receipt</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-8 border-t border-slate-100 dark:border-slate-800 shrink-0">
                            <button
                                type="button"
                                onClick={handleSaveReceipt}
                                className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                            >
                                Save & Process Inventory Update
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
