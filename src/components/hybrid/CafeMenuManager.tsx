import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { RetailInventoryItem } from '../../types';
import { PlusIcon, TrashIcon, PencilIcon, XIcon, SearchIcon } from '../icons';

interface CafeMenuManagerProps {
    institutionId: string;
}

export const CafeMenuManager: React.FC<CafeMenuManagerProps> = ({ institutionId }) => {
    const [items, setItems] = useState<RetailInventoryItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RetailInventoryItem | null>(null);

    const [formData, setFormData] = useState<Partial<RetailInventoryItem>>({
        name: '',
        costPrice: 0,
        basePrice: 0,
        srpPrice: 0,
        category: 'Cafe',
        quantity: 100, // Default to a high number for non-tracked stock like coffee
        reorderLevel: 10,
        unit: 'serving',
        sku: '',
        marketplaceEnabled: false
    });

    useEffect(() => {
        loadMenu();
    }, [institutionId]);

    const loadMenu = async () => {
        try {
            const allInventory = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory', institutionId);
            // Filter to only show items that are likely cafe/restaurant items
            const cafeItems = allInventory.filter((item: RetailInventoryItem) =>
                item.category?.toLowerCase().includes('cafe') ||
                item.category?.toLowerCase().includes('food') ||
                item.category?.toLowerCase().includes('beverage') ||
                item.category?.toLowerCase().includes('restaurant')
            );
            setItems(cafeItems);
        } catch (error) {
            console.error("Failed to load cafe menu:", error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                costPrice: 0,
                reorderLevel: 10,
                quantity: 100,
                ...formData,
                sku: formData.sku || `CAFE-${Date.now()}`,
                institutionId,
                lastUpdated: new Date().toISOString()
            };
            await apiService.saveModuleRecord('retail_inventory', payload);
            setIsModalOpen(false);
            setEditingItem(null);
            loadMenu();
        } catch (error: any) {
            console.error("Failed to save menu item:", error);
            alert(`Error saving item: ${error?.message || JSON.stringify(error)}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this menu item?")) return;
        try {
            await apiService.deleteModuleRecord('retail_inventory', id);
            loadMenu();
        } catch (error) {
            console.error("Failed to delete item:", error);
        }
    };

    const filteredItems = items.filter(i => i.name.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-[800px] overflow-hidden">
            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Cafe & Restaurant Menu</h2>
                    <p className="text-slate-500 font-medium text-sm mt-1">Manage food and drinks for the Hybrid POS.</p>
                </div>

                <div className="flex gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search menu..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-2 outline-none"
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingItem(null);
                            setFormData({ name: '', costPrice: 0, basePrice: 0, srpPrice: 0, category: 'Cafe', quantity: 100, reorderLevel: 10, unit: 'serving', marketplaceEnabled: false, sku: '' });
                            setIsModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg transition-all"
                    >
                        <PlusIcon className="w-4 h-4" /> Add Item
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
                {filteredItems.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <p className="font-bold text-lg">No menu items found.</p>
                        <p className="text-sm">Click "Add Item" to start building your cafe menu.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredItems.map(item => (
                            <div key={item.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 flex flex-col hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
                                <div className="flex justify-between items-start mb-4">
                                    <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</h3>
                                    <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[10px] font-black uppercase rounded-full">{item.category}</span>
                                </div>

                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                                    <div className="font-black text-xl text-indigo-600">KES {item.basePrice}</div>
                                    <div className="flex gap-2">
                                        <button onClick={() => {
                                            setEditingItem(item);
                                            setFormData(item);
                                            setIsModalOpen(true);
                                        }} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                            <h3 className="font-black text-xl uppercase tracking-tight">{editingItem ? 'Edit Menu Item' : 'Add New Item'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 transition-colors">
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Item Name</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                                    placeholder="e.g. Latte"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Price (KES)</label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.basePrice}
                                        onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value), srpPrice: Number(e.target.value) })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full p-4 bg-slate-50 dark:bg-slate-900 border-none rounded-xl font-bold focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="Cafe">Cafe / Drinks</option>
                                        <option value="Food & Beverage">Food & Snacks</option>
                                        <option value="Restaurant">Restaurant Main</option>
                                    </select>
                                </div>
                            </div>
                            <div className="pt-6">
                                <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest rounded-xl transition-all">
                                    {editingItem ? 'Save Changes' : 'Create Item'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
