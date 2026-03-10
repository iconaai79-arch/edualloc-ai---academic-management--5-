import React, { useState, useEffect } from 'react';
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
    Banknote,
    X,
    CheckCircle2,
    Image as ImageIcon,
    Upload
} from 'lucide-react';
import { apiService } from '../../services/apiService';
import { SmartRetailInventoryImporterModal } from './SmartRetailInventoryImporterModal';

interface RetailInventoryManagerProps {
    institutionId: string;
}

export function RetailInventoryManager({ institutionId }: RetailInventoryManagerProps) {
    const [items, setItems] = useState<RetailInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<RetailInventoryItem | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

    // Electronics Categories
    const categories = [
        'Smartphones',
        'Laptops',
        'Computing',
        'Audio & Sound Systems',
        'Home Appliances',
        'Cameras',
        'Gaming',
        'Accessories',
        'Other'
    ];

    // Form state
    const [formData, setFormData] = useState<Partial<RetailInventoryItem>>({
        name: '',
        sku: '',
        category: 'Smartphones',
        srpPrice: 0,
        basePrice: 0,
        costPrice: 0,
        quantity: 0,
        reorderLevel: 5,
        unit: 'pcs',
        imageUrl: '',
        description: '',
        barcode: '',
        marketplaceEnabled: true
    });

    useEffect(() => {
        fetchInventory();
    }, [institutionId]);

    // Barcode Scanner Listener
    useEffect(() => {
        let buffer = '';
        let lastKeyTime = Date.now();

        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if focus is within an input or textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
                return;
            }

            const currentTime = Date.now();

            // If more than 50ms has passed since the last key, it's likely human typing, so clear the buffer
            if (currentTime - lastKeyTime > 50) {
                buffer = '';
            }

            if (e.key === 'Enter' && buffer.length > 3) {
                // A barcode was likely scanned
                e.preventDefault();
                const scannedBarcode = buffer;

                const existingItem = items.find(item => item.barcode === scannedBarcode);

                if (existingItem) {
                    // Item exists, open edit modal
                    setEditingItem(existingItem);
                    setFormData(existingItem);
                    setIsAddModalOpen(true);
                } else {
                    // New item
                    setEditingItem(null);
                    setFormData({
                        name: '',
                        sku: `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                        category: 'Smartphones',
                        srpPrice: 0,
                        costPrice: 0,
                        quantity: 1, // Default to 1 for quick scanning
                        reorderLevel: 5,
                        unit: 'pcs',
                        imageUrl: '',
                        description: '',
                        barcode: scannedBarcode,
                        marketplaceEnabled: true
                    });
                    setIsAddModalOpen(true);
                }

                buffer = ''; // Reset buffer after successful scan
            } else if (e.key.length === 1) {
                // Add regular characters to the buffer
                buffer += e.key;
            }

            lastKeyTime = currentTime;
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items]); // Re-bind when items change so we have the latest list to search

    const fetchInventory = async () => {
        setIsLoading(true);
        try {
            const data = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId);
            setItems(data);
        } catch (err) {
            console.error("Fetch error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const timestamp = Date.now();
            const ext = file.name.split('.').pop() || 'png';
            const path = `retail/${institutionId}/products/${timestamp}.${ext}`;

            const publicUrl = await apiService.uploadFile('eduai', path, file);

            if (publicUrl) {
                setFormData(prev => ({ ...prev, imageUrl: publicUrl }));
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload image");
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            const payload = {
                ...formData,
                institutionId,
                lastUpdated: new Date().toISOString()
            };

            await apiService.saveModuleRecord('retail_inventory_items', payload);

            setIsAddModalOpen(false);
            setEditingItem(null);
            setFormData({
                name: '',
                sku: '',
                category: 'Smartphones',
                srpPrice: 0,
                basePrice: 0,
                costPrice: 0,
                quantity: 0,
                reorderLevel: 5,
                unit: 'pcs',
                imageUrl: '',
                description: '',
                barcode: '',
                marketplaceEnabled: true
            });
            fetchInventory();
        } catch (err) {
            console.error("Save error:", err);
            alert('Failed to save item');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this item?')) return;
        try {
            await apiService.deleteModuleRecord('retail_inventory_items', id);
            fetchInventory();
        } catch (err) {
            console.error("Delete error:", err);
            alert('Failed to delete item');
        }
    };

    const handleBulkImport = async (items: Partial<RetailInventoryItem>[]) => {
        try {
            // Save each item
            for (const item of items) {
                await apiService.saveModuleRecord('retail_inventory_items', item);
            }
            fetchInventory();
            setIsImportModalOpen(false);
        } catch (err) {
            console.error("Bulk save error:", err);
            throw new Error("Failed to save some items.");
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
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-slate-900 dark:text-white">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
                        <ImageIcon className="w-8 h-8 text-indigo-600" />
                        Gadget & Electronics Hub
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 uppercase text-[10px] font-black tracking-widest">Premium Inventory & Marketplace Management业务</p>
                </div>

                <button
                    onClick={() => {
                        setEditingItem(null);
                        setFormData({
                            name: '',
                            sku: `SKU-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
                            category: 'Smartphones',
                            srpPrice: 0,
                            costPrice: 0,
                            quantity: 0,
                            reorderLevel: 5,
                            unit: 'pcs',
                            imageUrl: '',
                            description: '',
                            barcode: '',
                            marketplaceEnabled: true
                        });
                        setIsAddModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 group"
                >
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                    List New Product
                </button>

                <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95 group"
                >
                    <Upload className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
                    Import Excel
                </button>
            </div>

            {/* Premium Controls */}
            <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-6 rounded-[2.5rem] shadow-xl border border-white dark:border-slate-700 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="relative w-full md:w-[30rem]">
                    <Search className="w-5 h-5 absolute left-5 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Search phones, computers, audio systems..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-14 pr-6 py-4 bg-slate-100 dark:bg-slate-900/50 border-none rounded-[1.5rem] focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold placeholder:text-slate-400"
                    />
                </div>

                <div className="flex items-center gap-3 bg-slate-100 dark:bg-slate-900/50 p-2 rounded-2xl">
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                        <Layers className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`p-2 rounded-xl transition-all ${viewMode === 'table' ? 'bg-white dark:bg-slate-800 shadow-sm text-indigo-600' : 'text-slate-400'}`}
                    >
                        <Search className="w-5 h-5 rotate-90" />
                    </button>
                </div>
            </div>

            {/* Inventory Display */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 space-y-4">
                    <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin"></div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading your showcase...</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                    {filteredItems.map(item => (
                        <div key={item.id} className="group bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 relative">
                            {/* Product Image Section */}
                            <div className="h-64 bg-slate-50 dark:bg-slate-900/50 relative overflow-hidden">
                                {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Package className="w-16 h-16 text-slate-200" />
                                    </div>
                                )}
                                <div className="absolute top-4 left-4">
                                    <span className="px-4 py-1.5 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm">
                                        {item.category}
                                    </span>
                                </div>
                                {item.marketplaceEnabled && (
                                    <div className="absolute top-4 right-4">
                                        <span className="p-2 bg-emerald-500 text-white rounded-full shadow-lg">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Details Section */}
                            <div className="p-8">
                                <div className="flex justify-between items-start mb-3">
                                    <h3 className="font-black text-slate-900 dark:text-white uppercase text-sm tracking-tight leading-tight flex-1 line-clamp-1">
                                        {item.name}
                                    </h3>
                                    <p className="font-black text-indigo-600 text-sm ml-4">
                                        KES {item.srpPrice?.toLocaleString()}
                                    </p>
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-2 mb-6 font-medium leading-relaxed uppercase tracking-wide">
                                    {item.description || 'No detailed description provided for this premium gadget.'}
                                </p>

                                <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-700">
                                    <div className="flex flex-col">
                                        <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1">Stock Status</span>
                                        <span className={`text-xs font-black ${item.quantity <= (item.reorderLevel || 5) ? 'text-red-600' : 'text-slate-900 dark:text-white'}`}>
                                            {item.quantity} {item.unit}
                                        </span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => openEdit(item)}
                                            className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="p-3 bg-rose-50 text-rose-600 rounded-2xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 overflow-hidden shadow-sm">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700">
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Premium Item</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">SKU</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Price</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Stock</th>
                                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                            {filteredItems.map(item => (
                                <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-5">
                                            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 overflow-hidden flex-shrink-0">
                                                {item.imageUrl ? (
                                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <Package className="w-full h-full p-4 text-slate-300" />
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-black text-slate-900 dark:text-white uppercase text-xs mb-1">{item.name}</p>
                                                <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-[8px] font-black uppercase tracking-[0.2em] rounded-full">
                                                    {item.category}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center text-[10px] font-mono font-black text-slate-400">{item.sku}</td>
                                    <td className="px-8 py-6 text-center font-black text-slate-900 dark:text-white text-xs">
                                        {item.srpPrice?.toLocaleString()}
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`text-xs font-black ${item.quantity <= (item.reorderLevel || 5) ? 'text-red-500' : 'text-emerald-500'}`}>
                                            {item.quantity}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEdit(item)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><Edit2 className="w-4 h-4" /></button>
                                            <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Redesigned Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[500] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-[0_0_100px_rgba(0,0,0,0.4)] animate-in fade-in zoom-in duration-500">
                        <div className="p-10 sticky top-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-md z-10 flex justify-between items-center border-b border-slate-50 dark:border-slate-700">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">{editingItem ? 'Refine Product' : 'Registry Entry'}</h3>
                                <p className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.3em] mt-1">Premium Gadget Catalog业务</p>
                            </div>
                            <button onClick={() => setIsAddModalOpen(false)} className="p-4 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full transition-all active:scale-90">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-12 space-y-10">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                                {/* Left Side: Media Upload */}
                                <div className="space-y-6">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 flex items-center gap-2">
                                        <ImageIcon className="w-4 h-4" /> Product Visuals
                                    </label>
                                    <div className="aspect-square bg-slate-50 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-700 relative group overflow-hidden flex flex-col items-center justify-center">
                                        {formData.imageUrl ? (
                                            <>
                                                <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <button type="button" onClick={() => setFormData({ ...formData, imageUrl: '' })} className="p-3 bg-rose-600 text-white rounded-2xl shadow-xl hover:scale-110 transition-transform"><Trash2 className="w-5 h-5" /></button>
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-center p-8 pointer-events-none">
                                                <div className="w-20 h-20 bg-white dark:bg-slate-800 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl group-hover:scale-110 transition-transform duration-500">
                                                    {isUploading ? <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <Upload className="w-10 h-10 text-indigo-400" />}
                                                </div>
                                                <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight mb-1">Drag high-res photo</p>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Recommended 800x800 PNG or JPG</p>
                                            </div>
                                        )}
                                        <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" disabled={isUploading} />
                                    </div>
                                </div>

                                {/* Right Side: Details */}
                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Model Name</label>
                                        <input
                                            required
                                            type="text"
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl text-sm font-black focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-300"
                                            placeholder="e.g. iPhone 15 Pro Max"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Category</label>
                                            <select
                                                value={formData.category}
                                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                                className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none uppercase tracking-widest"
                                            >
                                                {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                            </select>
                                        </div>
                                        <div className="space-y-3">
                                            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Stock Unit</label>
                                            <input
                                                type="text"
                                                value={formData.unit}
                                                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                                                className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-xs font-black focus:ring-2 focus:ring-indigo-500 outline-none uppercase"
                                                placeholder="Pcs/Units"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Marketplace Description</label>
                                        <textarea
                                            rows={4}
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-3xl text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none resize-none placeholder:text-slate-300"
                                            placeholder="Highlight specs, storage, warranty, and condition..."
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-6 border-t border-slate-50 dark:border-slate-700">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Cost Price (KES)</label>
                                    <div className="relative">
                                        <Banknote className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-rose-400" />
                                        <input
                                            required
                                            type="number"
                                            value={formData.costPrice}
                                            onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                                            className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-rose-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Base Price (KES)</label>
                                    <div className="relative">
                                        <Banknote className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-amber-400" />
                                        <input
                                            required
                                            type="number"
                                            value={formData.basePrice}
                                            onChange={(e) => setFormData({ ...formData, basePrice: Number(e.target.value) })}
                                            className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-amber-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Retail Price (KES)</label>
                                    <div className="relative">
                                        <Banknote className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" />
                                        <input
                                            required
                                            type="number"
                                            value={formData.srpPrice}
                                            onChange={(e) => setFormData({ ...formData, srpPrice: Number(e.target.value) })}
                                            className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Stock Qty</label>
                                    <input
                                        type="number"
                                        value={formData.quantity}
                                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                        className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">SKU / ID</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.sku}
                                        onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                                        className="w-full p-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-[10px] font-mono font-black placeholder:text-slate-300"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Barcode</label>
                                    <div className="relative">
                                        <Tag className="w-5 h-5 absolute left-5 top-1/2 -translate-y-1/2 text-indigo-400" />
                                        <input
                                            type="text"
                                            value={formData.barcode || ''}
                                            onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                                            className="w-full pl-14 pr-5 py-5 bg-slate-50 dark:bg-slate-900 border-none rounded-2xl text-sm font-black focus:ring-2 focus:ring-indigo-500"
                                            placeholder="Scan to scan..."
                                        />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Market Visibility</label>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, marketplaceEnabled: !formData.marketplaceEnabled })}
                                        className={`w-full py-5 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${formData.marketplaceEnabled ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-200' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                                    >
                                        {formData.marketplaceEnabled ? 'LIVE ON MARKET' : 'PRIVATE ENTRY'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-4 pt-10">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="flex-1 py-5 rounded-3xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-all border border-slate-200 dark:border-slate-700"
                                >
                                    Dismiss
                                </button>
                                <button
                                    type="submit"
                                    className="flex-[2] py-5 bg-slate-900 dark:bg-indigo-600 text-white rounded-3xl text-[10px] font-black uppercase tracking-widest shadow-2xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <CheckCircle2 className="w-5 h-5" />
                                    Finalize Publication
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isImportModalOpen && (
                <SmartRetailInventoryImporterModal
                    onClose={() => setIsImportModalOpen(false)}
                    onImport={handleBulkImport}
                    institutionId={institutionId}
                />
            )}
        </div>
    );
}
