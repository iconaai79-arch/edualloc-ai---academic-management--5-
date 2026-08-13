import React, { useState, useEffect } from 'react';
import type { HISPharmacyInventory, HISPharmacyBatch } from '../../types';
import { XIcon } from '../icons/XIcon';
import { ArchiveBoxIcon } from '../icons/ArchiveBoxIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { CurrencyIcon } from '../icons/CurrencyIcon';
import { TruckIcon } from '../icons/TruckIcon';

interface AddPharmacyBatchModalProps {
    onClose: () => void;
    onAddBatch: (batchData: {
        medicationId: string;
        batchNumber: string;
        expiryDate: string;
        quantity: number;
        unitCost: number;
        supplierInfo: string;
    }) => Promise<void>;
    inventory: HISPharmacyInventory[];
    selectedMedicationId?: string;
    suppliers?: { id?: string; name: string }[];
}

export function AddPharmacyBatchModal({
    onClose,
    onAddBatch,
    inventory,
    selectedMedicationId,
    suppliers = []
}: AddPharmacyBatchModalProps) {
    const defaultMedId = selectedMedicationId || (inventory.length > 0 ? inventory[0].id : '');
    
    const generateBatchNumber = () => {
        const dateStr = new Date().toISOString().slice(2, 7).replace('-', '');
        const randomNum = Math.floor(1000 + Math.random() * 9000);
        return `BCH-${dateStr}-${randomNum}`;
    };

    // Default expiry date 1 year from now
    const getDefaultExpiryDate = () => {
        const d = new Date();
        d.setFullYear(d.getFullYear() + 1);
        return d.toISOString().split('T')[0];
    };

    const [medicationId, setMedicationId] = useState(defaultMedId);
    const [batchNumber, setBatchNumber] = useState(generateBatchNumber());
    const [expiryDate, setExpiryDate] = useState(getDefaultExpiryDate());
    const [quantity, setQuantity] = useState<number>(100);
    const [unitCost, setUnitCost] = useState<number>(0);
    const [supplierInfo, setSupplierInfo] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (selectedMedicationId) {
            setMedicationId(selectedMedicationId);
        }
    }, [selectedMedicationId]);

    // Update suggested unit cost when medication changes
    useEffect(() => {
        const selectedMed = inventory.find(m => m.id === medicationId);
        if (selectedMed && selectedMed.unitPrice) {
            // Suggest cost at ~70% of retail unit price if unitCost not entered
            if (unitCost === 0) {
                setUnitCost(Math.round(selectedMed.unitPrice * 0.7 * 100) / 100);
            }
        }
    }, [medicationId, inventory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!medicationId) {
            alert('Please select a medication.');
            return;
        }
        if (!batchNumber.trim()) {
            alert('Batch Number is required.');
            return;
        }
        if (!expiryDate) {
            alert('Expiry date is required.');
            return;
        }
        if (quantity <= 0) {
            alert('Batch quantity must be greater than zero.');
            return;
        }

        setIsSaving(true);
        try {
            await onAddBatch({
                medicationId,
                batchNumber: batchNumber.trim(),
                expiryDate,
                quantity,
                unitCost,
                supplierInfo: supplierInfo.trim()
            });
            onClose();
        } catch (err: any) {
            console.error('Failed to add batch:', err);
            alert(`Failed to register batch: ${err?.message || 'Unknown error'}`);
        } finally {
            setIsSaving(false);
        }
    };

    const selectedMed = inventory.find(m => m.id === medicationId);

    return (
        <div className="fixed inset-0 bg-black/60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-emerald-950 text-white">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
                            <ArchiveBoxIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black uppercase tracking-tight">Receive & Register New Batch</h3>
                            <p className="text-xs text-emerald-300 font-medium">Log medication batch number, expiry date & stock intake</p>
                        </div>
                    </div>
                    <button 
                        type="button"
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-emerald-800 transition-colors text-emerald-300 hover:text-white"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto max-h-[80vh]">
                    {/* Medication Selection */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center justify-between">
                            <span>Select Medication / Drug</span>
                            {selectedMed && (
                                <span className="text-emerald-600 normal-case font-bold">
                                    Current Stock: {selectedMed.stockQuantity} {selectedMed.unit || 'units'}
                                </span>
                            )}
                        </label>
                        <select
                            required
                            value={medicationId}
                            onChange={e => setMedicationId(e.target.value)}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800"
                        >
                            <option value="" disabled>-- Select Medication --</option>
                            {inventory.map(med => (
                                <option key={med.id} value={med.id}>
                                    {med.name} {med.category ? `(${med.category})` : ''} — Stock: {med.stockQuantity}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Batch Number */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Batch / Lot Number</label>
                            <div className="relative">
                                <input
                                    required
                                    type="text"
                                    value={batchNumber}
                                    onChange={e => setBatchNumber(e.target.value)}
                                    className="w-full pl-5 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold uppercase text-slate-800"
                                    placeholder="e.g. BCH-2026-0045"
                                />
                                <button
                                    type="button"
                                    onClick={() => setBatchNumber(generateBatchNumber())}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"
                                    title="Generate Random Batch Number"
                                >
                                    Auto
                                </button>
                            </div>
                        </div>

                        {/* Expiry Date */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center space-x-1">
                                <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span>Expiry Date</span>
                            </label>
                            <input
                                required
                                type="date"
                                value={expiryDate}
                                min={new Date().toISOString().split('T')[0]}
                                onChange={e => setExpiryDate(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800"
                            />
                        </div>

                        {/* Quantity Received */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                                Batch Quantity Received ({selectedMed?.unit || 'Units'})
                            </label>
                            <input
                                required
                                type="number"
                                min="1"
                                value={quantity || ''}
                                onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800"
                                placeholder="100"
                            />
                        </div>

                        {/* Unit Cost */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center space-x-1">
                                <CurrencyIcon className="w-3.5 h-3.5 text-slate-400" />
                                <span>Wholesale Unit Cost per Item</span>
                            </label>
                            <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={unitCost || ''}
                                onChange={e => setUnitCost(parseFloat(e.target.value) || 0)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    {/* Supplier Information */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center space-x-1">
                            <TruckIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>Supplier / Manufacturer Info</span>
                        </label>
                        {suppliers.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <select
                                    value={suppliers.some(s => s.name === supplierInfo) ? supplierInfo : ''}
                                    onChange={e => setSupplierInfo(e.target.value)}
                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                                >
                                    <option value="">-- Select Registered Supplier --</option>
                                    {suppliers.map((sup, idx) => (
                                        <option key={sup.id || idx} value={sup.name}>
                                            {sup.name}
                                        </option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={supplierInfo}
                                    onChange={e => setSupplierInfo(e.target.value)}
                                    className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm"
                                    placeholder="Or type custom supplier name..."
                                />
                            </div>
                        ) : (
                            <input
                                type="text"
                                value={supplierInfo}
                                onChange={e => setSupplierInfo(e.target.value)}
                                className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 outline-none transition-all font-bold text-slate-800"
                                placeholder="e.g. MedPharm Wholesalers Ltd / Pfizer Kenya"
                            />
                        )}
                    </div>

                    {/* Summary Box */}
                    {selectedMed && quantity > 0 && (
                        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-emerald-900">Batch Summary Preview</p>
                                <p className="text-xs text-emerald-700">
                                    New Total Stock: <span className="font-black text-emerald-950">{selectedMed.stockQuantity + quantity} {selectedMed.unit || 'units'}</span> (+{quantity})
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-emerald-700">Total Batch Cost</p>
                                <p className="text-sm font-black text-emerald-950">
                                    {(quantity * unitCost).toLocaleString('en-KE', { style: 'currency', currency: 'KES' })}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSaving}
                            className="px-6 py-3.5 border border-slate-200 rounded-2xl text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-emerald-600/20 transition-all flex items-center space-x-2"
                        >
                            {isSaving ? (
                                <span>Registering Batch...</span>
                            ) : (
                                <>
                                    <ArchiveBoxIcon className="w-5 h-5" />
                                    <span>Register & Update Stock</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
