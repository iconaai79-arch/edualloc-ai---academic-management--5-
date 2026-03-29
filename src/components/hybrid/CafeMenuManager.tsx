import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { CafeMenuItem } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { XIcon } from '../icons/XIcon';
import { SearchIcon } from '../icons/SearchIcon';


interface CafeMenuManagerProps {
    institutionId: string;
    onDataChange?: () => void;
}

export const CafeMenuManager: React.FC<CafeMenuManagerProps> = ({ institutionId, onDataChange }) => {
    const [items, setItems] = useState<CafeMenuItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<CafeMenuItem | null>(null);

    const [formData, setFormData] = useState<Partial<CafeMenuItem>>({
        name: '',
        description: '',
        basePrice: 0,
        category: 'Cafe',
        isAvailable: true,
        sku: ''
    });

    useEffect(() => {
        loadMenu();
    }, [institutionId]);

    const loadMenu = async () => {
        try {
            const menuItems = await apiService.fetchModuleRecords<CafeMenuItem>('cafe_menu_items', institutionId);
            setItems(menuItems);
        } catch (error) {
            console.error("Failed to load cafe menu:", error);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                id: editingItem?.id || `cafe_${Date.now()}`,
                sku: formData.sku || `CAFE-${Date.now()}`,
                institutionId,
                lastUpdated: new Date().toISOString()
            };
            await apiService.saveModuleRecord('cafe_menu_items', payload);
            setIsModalOpen(false);
            setEditingItem(null);
            loadMenu();
            if (onDataChange) onDataChange();
        } catch (error: any) {
            console.error("Failed to save menu item:", error);
            alert(`Error saving item: ${error?.message || JSON.stringify(error)}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this menu item?")) return;
        try {
            await apiService.deleteModuleRecord('cafe_menu_items', id);
            loadMenu();
            if (onDataChange) onDataChange();
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
                            setFormData({ name: '', description: '', basePrice: 0, category: 'Cafe', isAvailable: true, sku: '' });
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
                                    <div className="flex flex-col">
                                        <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase tracking-tight">{item.name}</h3>
                                        {!item.isAvailable && <span className="text-red-500 text-[10px] font-black uppercase">Sold Out</span>}
                                    </div>
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
                                        onChange={e => setFormData({ ...formData, basePrice: Number(e.target.value) })}
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
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isAvailable"
                                    checked={formData.isAvailable}
                                    onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
                                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="isAvailable" className="text-sm font-bold text-slate-700 dark:text-slate-300">Available for Sale</label>
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
