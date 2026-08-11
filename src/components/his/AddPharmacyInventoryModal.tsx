
import React, { useState } from 'react';
import type { HISPharmacyInventory } from '../../types';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';

interface AddPharmacyInventoryModalProps {
    onClose: () => void;
    onAdd: (item: Partial<HISPharmacyInventory>) => Promise<void>;
    institutionId: string;
    item?: Partial<HISPharmacyInventory>;
}

export function AddPharmacyInventoryModal({
    onClose, onAdd, institutionId, item
}: AddPharmacyInventoryModalProps) {
    const [formData, setFormData] = useState({
        name: item?.name || '',
        category: item?.category || 'General',
        sku: item?.sku || '',
        unit: item?.unit || 'Units',
        stockQuantity: item?.stockQuantity || 0,
        unitPrice: item?.unitPrice || 0,
        reorderLevel: item?.reorderLevel || 10,
        isNarcotic: item?.isNarcotic || false
    });
    const [isSaving, setIsSaving] = useState(false);

    React.useEffect(() => {
        if (item) {
            setFormData({
                name: item.name || '',
                category: item.category || 'General',
                sku: item.sku || '',
                unit: item.unit || 'Units',
                stockQuantity: item.stockQuantity || 0,
                unitPrice: item.unitPrice || 0,
                reorderLevel: item.reorderLevel || 10,
                isNarcotic: item.isNarcotic || false
            });
        }
    }, [item]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        setIsSaving(true);
        try {
            await onAdd({
                ...formData,
                institutionId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
            onClose();
        } catch (error) {
            console.error("Failed to add inventory:", error);
            alert("Failed to add inventory item.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in-up">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="text-xl font-black uppercase tracking-tight">{item ? 'Edit Medication' : 'Add New Medication'}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="col-span-2 space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Medication Name</label>
                            <input
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                                placeholder="e.g. Paracetamol 500mg"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Category</label>
                            <select
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                            >
                                <option value="General">General</option>
                                <option value="Antibiotics">Antibiotics</option>
                                <option value="Analgesics">Analgesics</option>
                                <option value="Antipyretics">Antipyretics</option>
                                <option value="Narcotics">Narcotics</option>
                                <option value="Consumables">Consumables</option>
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SKU / Barcode</label>
                            <input
                                type="text"
                                value={formData.sku}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                                placeholder="Auto-generated if empty"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Base Unit</label>
                            <input
                                type="text"
                                value={formData.unit}
                                onChange={e => setFormData({ ...formData, unit: e.target.value })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold"
                                placeholder="e.g. Tablet, Bottle, Box"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Initial Stock</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={formData.stockQuantity}
                                onChange={e => setFormData({ ...formData, stockQuantity: parseInt(e.target.value) })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-indigo-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Unit Price (KES)</label>
                            <input
                                required
                                type="number"
                                min="0"
                                step="0.01"
                                value={formData.unitPrice}
                                onChange={e => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-emerald-600"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reorder Level</label>
                            <input
                                required
                                type="number"
                                min="0"
                                value={formData.reorderLevel}
                                onChange={e => setFormData({ ...formData, reorderLevel: parseInt(e.target.value) })}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all font-bold text-rose-500"
                            />
                        </div>

                        <div className="col-span-2 flex items-center gap-3 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                            <input
                                type="checkbox"
                                id="isNarcotic"
                                checked={formData.isNarcotic}
                                onChange={e => setFormData({ ...formData, isNarcotic: e.target.checked, category: e.target.checked ? 'Narcotics' : formData.category })}
                                className="w-5 h-5 rounded-lg text-indigo-600 focus:ring-indigo-500"
                            />
                            <label htmlFor="isNarcotic" className="text-sm font-bold text-indigo-900 select-none cursor-pointer">
                                This is a Narcotic / Controlled Substance
                                <span className="block text-[10px] font-medium text-indigo-500/70">Requires witnesses and dual-witness logging during dispensing</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-8 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest transition-all hover:bg-slate-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="flex-3 px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:scale-100"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <><PlusIcon className="w-5 h-5" /> Save Medication</>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddPharmacyInventoryModal;
