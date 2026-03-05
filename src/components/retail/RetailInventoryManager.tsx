import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { RetailInventoryItem, RetailStore } from '../../types';
import {
    Package,
    Plus,
    Search,
    Edit2,
    Trash2,
    AlertTriangle,
    Tag,
    Layers,
    DollarSign,
    X,
    CheckCircle2
} from 'lucide-react';

interface RetailInventoryManagerProps {
    institutionId: string;
}

export function RetailInventoryManager({ institutionId }: RetailInventoryManagerProps) {
    const [items, setItems] = useState<RetailInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RetailInventoryItem | null>(null);

    // Form state
    const [formData, setFormData] = useState<Partial<RetailInventoryItem>>({
        name: '',
        sku: '',
        category: '',
        srpPrice: 0,
        costPrice: 0,
        quantity: 0,
        reorderLevel: 5,
        unit: 'pcs'
    });

    useEffect(() => {
        fetchInventory();
    }, [institutionId]);

    const fetchInventory = async () => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('retail_inventory')
                .select('*')
                .eq('institution_id', institutionId);

            if (data) setItems(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!supabase) return;

        try {
            const payload = {
                ...formData,
                institution_id: institutionId,
                last_updated: new Date().toISOString()
            };

            if (editingItem) {
                const { error } = await supabase
                    .from('retail_inventory')
                    .update(payload)
                    .eq('id', editingItem.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('retail_inventory')
                    .insert([payload]);
                if (error) throw error;
            }

            setIsAddModalOpen(false);
            setEditingItem(null);
            setFormData({ name: '', sku: '', category: '', srpPrice: 0, costPrice: 0, quantity: 0, reorderLevel: 5, unit: 'pcs' });
            fetchInventory();
        } catch (err) {
            console.error("Save error:", err);
            alert('Failed to save item');
        }
    };

    const handleDelete = async (id: string) => {
        if (!supabase || !window.confirm('Are you sure you want to delete this item?')) return;
        try {
            const { error } = await supabase
                .from('retail_inventory')
                .delete()
                .eq('id', id);
            if (error) throw error;
            fetchInventory();
        } catch (err) {
            console.error("Delete error:", err);
        }
    };

    const openEdit = (item: RetailInventoryItem) => {
        setEditingItem(item);
        setFormData(item);
        setIsAddModalOpen(true);
    };

    const filteredItems = items.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center text-slate-900 dark:text-white">
                <div>
                    <h2 className="text-xl font-bold tracking-tight">Product Catalog & Inventory</h2>
                    <p className="text-slate-500 text-sm mt-1 uppercase text-[10px] font-black tracking-widest">Manage your items, pricing and stock levels</p>
                </div>

                <button
                    onClick={() => { setEditingItem(null); setFormData({ name: '', sku: '', category: '', srpPrice: 0, costPrice: 0, quantity: 0, reorderLevel: 5, unit: 'pcs' }); setIsAddModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                    <Plus className="w-4 h-4" />
                    New Item
                </button>
            </div>

            {/* Filters */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-96">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search by name, SKU or category..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold"
                    />
                </div>
            </div>

            {/* Inventory List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">Item Details</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">SKU</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Category</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Price (KES)</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Stock</th>
                                <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                                <Package className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase text-xs tracking-tight">{item.name}</p>
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{item.unit || 'pcs'}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center text-xs font-mono text-slate-500 font-bold">{item.sku}</td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                            {item.category || 'General'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center font-black text-slate-900 dark:text-white text-xs">
                                        {(item.srpPrice || 0).toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center gap-1">
                                            <span className={`text-xs font-black ${(item.quantity || 0) <= (item.reorderLevel || 5) ? 'text-red-600' : 'text-emerald-600'}`}>
                                                {item.quantity || 0}
                                            </span>
                                            {(item.quantity || 0) <= (item.reorderLevel || 5) && (
                                                <div className="flex items-center gap-1 text-[8px] font-black uppercase tracking-tighter text-red-500">
                                                    <AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(item)}
                                                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(item.id)}
                                                className="p-2 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredItems.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <Package className="w-16 h-16 text-slate-100 dark:text-slate-700 mx-auto mb-4" />
                                        <p className="text-slate-400 font-black uppercase text-[10px] tracking-widest">No products found in catalog</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                        <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tight">{editingItem ? 'Edit Product' : 'Add New Product'}</h3>
                                <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Define item characteristics and pricing</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Item Name</label>
                                    <div className="relative">
                                        <Tag className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. Fertilizer X 50kg"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">SKU / Code</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="FERT-50"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Category</label>
                                    <div className="relative">
                                        <Layers className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="e.g. Supplements"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Selling Price (KES)</label>
                                    <div className="relative">
                                        <DollarSign className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                                        <input
                                            required
                                            type="number"
                                            value={formData.srpPrice}
                                            onChange={(e) => setFormData({ ...formData, srpPrice: Number(e.target.value) })}
                                            className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Initial Stock Level</label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-4 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all underline"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 className="w-4 h-4" />
                                    {editingItem ? 'Update Catalog' : 'Add to Catalog'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
