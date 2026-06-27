import React, { useState, useEffect, useMemo } from 'react';
import { HISPharmacyInventory, RetailInventoryItem } from '../../types';
import { apiService } from '../../services/apiService';
import { SearchIcon } from '../icons/SearchIcon';
import { ArrowUpRightIcon as LinkIcon } from '../icons/ArrowUpRightIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { XIcon } from '../icons/XIcon';

interface LinkDrugToInventoryModalProps {
    drug: HISPharmacyInventory;
    institutionId: string;
    onClose: () => void;
    onLinked: (drugId: string, linkedItemId: string | null, unitPrice: number) => void;
}

export const LinkDrugToInventoryModal: React.FC<LinkDrugToInventoryModalProps> = ({
    drug,
    institutionId,
    onClose,
    onLinked
}) => {
    const [retailItems, setRetailItems] = useState<RetailInventoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItemId, setSelectedItemId] = useState<string | null>(drug.linkedInventoryItemId || null);
    const [unitPrice, setUnitPrice] = useState<number>(drug.unitPrice || 0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const load = async () => {
            setIsLoading(true);
            try {
                const items = await apiService.fetchModuleRecords<RetailInventoryItem>('retail_inventory_items', institutionId);
                // Only show items in a medical/health-related category, or all if none match
                setRetailItems(items || []);
            } catch (e) {
                console.error('Failed to load retail inventory:', e);
            } finally {
                setIsLoading(false);
            }
        };
        load();
    }, [institutionId]);

    const filteredItems = useMemo(() =>
        retailItems.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (item.category || '').toLowerCase().includes(searchTerm.toLowerCase())
        ),
        [retailItems, searchTerm]
    );

    const selectedItem = retailItems.find(i => i.id === selectedItemId);

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await apiService.updateModuleRecord('his_pharmacy_inventory', drug.id, {
                linkedInventoryItemId: selectedItemId || null,
                unitPrice: unitPrice,
                updatedAt: new Date().toISOString(),
            });
            onLinked(drug.id, selectedItemId, unitPrice);
            onClose();
        } catch (e) {
            console.error('Failed to link drug:', e);
            alert('Failed to save link. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleUnlink = async () => {
        setIsSaving(true);
        try {
            await apiService.updateModuleRecord('his_pharmacy_inventory', drug.id, {
                linkedInventoryItemId: null,
                updatedAt: new Date().toISOString(),
            });
            onLinked(drug.id, null, unitPrice);
            onClose();
        } catch (e) {
            console.error('Failed to unlink drug:', e);
            alert('Failed to remove link. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-white">
                            Link <span className="text-emerald-400">Drug</span> to School Inventory
                        </h2>
                        <p className="text-slate-400 text-xs mt-1 font-semibold uppercase tracking-widest">
                            {drug.name} — {drug.unit || 'units'}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Current link banner */}
                {drug.linkedInventoryItemId && (
                    <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                            <CheckCircleIcon className="w-4 h-4" />
                            Currently linked to school store
                        </div>
                        <button
                            onClick={handleUnlink}
                            disabled={isSaving}
                            className="text-xs text-red-400 hover:text-red-300 font-semibold transition-colors disabled:opacity-50"
                        >
                            Remove Link
                        </button>
                    </div>
                )}

                {/* Price input */}
                <div className="px-6 pt-4 shrink-0">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-1">
                        Student Billing Price (per unit)
                    </label>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                        <span className="text-slate-400 font-bold text-sm">KES</span>
                        <input
                            type="number"
                            min={0}
                            step={0.50}
                            value={unitPrice}
                            onChange={e => setUnitPrice(parseFloat(e.target.value) || 0)}
                            className="flex-1 bg-transparent text-white font-bold focus:outline-none"
                            placeholder="0.00"
                        />
                    </div>
                    <p className="text-slate-500 text-xs mt-1">
                        This amount will be billed to the student's account when this drug is dispensed.
                    </p>
                </div>

                {/* Search */}
                <div className="px-6 pt-4 shrink-0">
                    <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-2">
                        Select Matching School Inventory Item
                    </label>
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                        <SearchIcon className="w-4 h-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            placeholder="Search by name, SKU or category..."
                            className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500"
                        />
                    </div>
                </div>

                {/* Items list */}
                <div className="flex-1 overflow-y-auto px-6 pb-6 mt-3 space-y-2">
                    {isLoading ? (
                        <div className="text-center py-12 text-slate-500 text-sm">Loading school inventory...</div>
                    ) : filteredItems.length === 0 ? (
                        <div className="text-center py-12 text-slate-500 text-sm">
                            No inventory items found.
                            {searchTerm && ' Try a different search term.'}
                        </div>
                    ) : (
                        filteredItems.map(item => {
                            const isSelected = item.id === selectedItemId;
                            const isLow = item.quantity <= (item.reorderLevel || 5);
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setSelectedItemId(isSelected ? null : item.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left ${
                                        isSelected
                                            ? 'bg-emerald-500/15 border-emerald-500/50 text-white'
                                            : 'bg-white/3 border-white/8 text-slate-300 hover:bg-white/8 hover:border-white/20'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg font-black shrink-0 ${
                                            isSelected ? 'bg-emerald-500/20' : 'bg-white/5'
                                        }`}>
                                            {item.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm">{item.name}</p>
                                            <p className="text-xs text-slate-400">
                                                {item.category || 'General'} · SKU: {item.sku || 'N/A'} · {item.unit || 'pcs'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className="text-right">
                                            <p className={`text-sm font-bold ${isLow ? 'text-amber-400' : 'text-emerald-400'}`}>
                                                {item.quantity} in stock
                                            </p>
                                            {isLow && (
                                                <p className="text-xs text-amber-500">Low stock</p>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                                        )}
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/10 flex items-center justify-between gap-3 shrink-0">
                    {selectedItem ? (
                        <p className="text-sm text-slate-400">
                            Linking to: <span className="text-emerald-400 font-bold">{selectedItem.name}</span>
                            {' '}({selectedItem.quantity} in store)
                        </p>
                    ) : (
                        <p className="text-xs text-slate-500">Select an item above to link</p>
                    )}
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-5 py-2 rounded-xl text-sm font-black uppercase tracking-widest text-slate-400 hover:text-white border border-white/10 hover:border-white/30 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || (!selectedItemId && !drug.linkedInventoryItemId)}
                            className="px-6 py-2 rounded-xl text-sm font-black uppercase tracking-widest bg-emerald-500 text-slate-950 hover:bg-emerald-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {isSaving ? (
                                <span className="animate-spin">⟳</span>
                            ) : (
                                <LinkIcon className="w-4 h-4" />
                            )}
                            {isSaving ? 'Saving...' : 'Save Link'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
