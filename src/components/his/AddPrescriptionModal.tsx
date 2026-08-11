import React, { useState, useEffect } from 'react';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { SearchIcon } from '../icons/SearchIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { apiService } from '../../services/apiService';

interface AddPrescriptionModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId: string;
    patientName?: string;
    institutionId: string;
    doctorName?: string;
    onAdd?: () => void;
}

export const AddPrescriptionModal: React.FC<AddPrescriptionModalProps> = ({ 
    isOpen, onClose, patientId, patientName, institutionId, doctorName, onAdd 
}) => {
    const [drugs, setDrugs] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
    const [remindersEnabled, setRemindersEnabled] = useState(true);
    const [revisitEnabled, setRevisitEnabled] = useState(false);
    const [revisit, setRevisit] = useState({
        date: '',
        time: '09:00',
        reason: 'Follow-up / Review',
        doctorName: doctorName || '',
    });

    useEffect(() => {
        const loadDrugs = async () => {
             if (isOpen && institutionId) {
                 // Load from HIS pharmacy inventory first
                 const hisData = await apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId);
                 // Also load from retail inventory (pharmacy store) as fallback/supplement
                 let retailData: any[] = [];
                 try {
                     const stores = await apiService.fetchModuleRecords('retail_stores', institutionId);
                     const pharmStore = (stores || []).find((s: any) =>
                         s.storeType === 'pharmacy_store' || (s.name || '').toLowerCase().includes('pharmacy')
                     );
                     if (pharmStore) {
                         retailData = await apiService.fetchModuleRecords('retail_inventory', institutionId);
                         retailData = (retailData || []).filter((r: any) => r.storeId === pharmStore.id || r.store_id === pharmStore.id);
                     }
                 } catch { /* retail pharmacy optional */ }

                 // Merge: HIS pharmacy items take priority; retail items supplement with stock quantity
                 const hisDrugs = (hisData || []).map((d: any) => ({ ...d, _source: 'his' }));
                 const existingNames = new Set(hisDrugs.map((d: any) => (d.name || '').toLowerCase()));
                 const retailDrugs = retailData
                     .filter((r: any) => !existingNames.has((r.name || r.itemName || '').toLowerCase()))
                     .map((r: any) => ({
                         id: r.id,
                         name: r.name || r.itemName,
                         unit: r.unit || r.unitOfMeasure || 'unit',
                         unitPrice: r.unitPrice || r.sellingPrice || r.price || 0,
                         quantityInStock: r.quantityInStock || r.quantity || r.stock || 0,
                         category: r.category || 'Pharmacy',
                         _source: 'retail',
                     }));

                 setDrugs([...hisDrugs, ...retailDrugs]);
             }
        };
        loadDrugs();
    }, [isOpen, institutionId]);

    if (!isOpen) return null;

    const filteredDrugs = drugs.filter(d =>
        (d.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStock = (drug: any): number | null => {
        const qty = drug.quantityInStock ?? drug.quantity_in_stock ?? drug.stock ?? null;
        return qty !== null ? Number(qty) : null;
    };

    const isOutOfStock = (drug: any): boolean => {
        const qty = getStock(drug);
        return qty !== null && qty <= 0;
    };

    const addItem = (drug: any) => {
        if (isOutOfStock(drug)) return;
        if (selectedItems.find(i => i.drugId === drug.id)) return;
        setSelectedItems([...selectedItems, {
            drugId: drug.id,
            drugName: drug.name,
            dosage: '',
            frequency: '1x Daily',
            duration: '5 Days',
            quantity: 1,
            unitPrice: drug.unitPrice || 0,
            totalPrice: drug.unitPrice || 0,
            availableStock: getStock(drug),
        }]);
        setSearchTerm('');
    };

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...selectedItems];
        newItems[index] = { ...newItems[index], [field]: value };
        if (field === 'quantity') {
            newItems[index].totalPrice = newItems[index].unitPrice * value;
        }
        setSelectedItems(newItems);
    };

    const removeItem = (index: number) => {
        setSelectedItems(selectedItems.filter((_, i) => i !== index));
    };

    const handleSave = async () => {
        if (selectedItems.length === 0) return alert("Please select at least one medication.");
        setIsSaving(true);
        try {
            const prescId = `prc_${Date.now()}`;
            
            // Upload files first if any
            const fileUrls = [];
            for (const file of attachedFiles) {
                const path = `presc_${prescId}_${file.name}`;
                const url = await apiService.uploadFile('prescriptions', path, file);
                if (url) fileUrls.push(url);
            }

            await apiService.saveModuleRecord('his_prescriptions', {
                id: prescId,
                institutionId,
                patientId,
                doctorName: doctorName || 'Attending Physician',
                notes,
                attached_files: fileUrls,
                status: 'pending'
            });

            for (const item of selectedItems) {
                await apiService.saveModuleRecord('his_prescription_items', {
                    id: `pri_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                    prescriptionId: prescId,
                    ...item
                });
            }

            // Save revisit appointment if scheduled
            if (revisitEnabled && revisit.date) {
                await apiService.saveModuleRecord('his_appointments', {
                    id: `app_rev_${Date.now()}`,
                    institutionId,
                    patientId,
                    patientName,
                    doctorName: revisit.doctorName || doctorName || 'Attending Physician',
                    date: revisit.date,
                    time: revisit.time,
                    type: 'Revisit / Follow-up',
                    reason: revisit.reason,
                    status: 'Scheduled',
                    linkedPrescriptionId: prescId,
                    createdAt: new Date().toISOString(),
                });
            }

            alert(revisitEnabled && revisit.date
                ? `Prescription dispatched & revisit booked for ${revisit.date}.`
                : "Prescription synchronized with Pharmacy."
            );
            onAdd?.();
            onClose();
            setSelectedItems([]);
            setNotes('');
            setRevisitEnabled(false);
            setRevisit({ date: '', time: '09:00', reason: 'Follow-up / Review', doctorName: doctorName || '' });
        } catch (e) {
            alert("Digital prescription failure. Check hospital connectivity.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
            <div className="bg-white w-full max-w-5xl h-[90vh] rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-zoom-in">
                {/* Header */}
                <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-indigo-50">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">Digital <span className="text-indigo-600">Prescription Center</span></h2>
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mt-1 opacity-80 italic">Issuing electronic orders for {patientName}</p>
                    </div>
                    <button onClick={onClose} className="p-4 bg-slate-200/60 hover:bg-slate-200 rounded-2xl text-slate-700 transition-all"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Drug Picker */}
                    <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/50">
                        <div className="p-6">
                            <div className="flex items-center gap-4 bg-slate-100 px-6 py-4 rounded-2xl border border-slate-200 focus-within:border-indigo-500/50 transition-all">
                                <SearchIcon className="w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH DRUG CATALOGUE..." 
                                    className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-full text-slate-800 placeholder:text-slate-400"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {filteredDrugs.length === 0 && (
                                <div className="p-8 text-center text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-50">
                                    {searchTerm ? 'No drugs matching search' : 'No pharmacy inventory loaded'}
                                </div>
                            )}
                            {filteredDrugs.map(drug => {
                                const stock = getStock(drug);
                                const outOfStock = isOutOfStock(drug);
                                const alreadyAdded = selectedItems.some(i => i.drugId === drug.id);
                                return (
                                    <button 
                                        key={drug.id} 
                                        onClick={() => addItem(drug)}
                                        disabled={outOfStock}
                                        className={`w-full p-4 rounded-2xl text-left border transition-all group ${
                                            outOfStock
                                                ? 'opacity-50 cursor-not-allowed border-rose-100 bg-rose-50/50'
                                                : alreadyAdded
                                                    ? 'border-indigo-200 bg-indigo-50 cursor-default'
                                                    : 'hover:bg-slate-100 border-transparent hover:border-slate-100'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-black uppercase italic tracking-tighter truncate ${
                                                    outOfStock ? 'text-rose-400' : alreadyAdded ? 'text-indigo-600' : 'text-slate-900 group-hover:text-indigo-600'
                                                }`}>{drug.name}</p>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase mt-0.5">{drug.unit} &bull; KES {(drug.unitPrice || 0).toLocaleString()}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                                                {stock !== null && (
                                                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${
                                                        outOfStock
                                                            ? 'bg-rose-100 text-rose-600 border-rose-200'
                                                            : stock <= 5
                                                                ? 'bg-amber-100 text-amber-700 border-amber-200'
                                                                : 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                    }`}>
                                                        {outOfStock ? 'Out of Stock' : `${stock} left`}
                                                    </span>
                                                )}
                                                {alreadyAdded && !outOfStock && (
                                                    <span className="text-[8px] font-black text-indigo-500 uppercase">✓ Added</span>
                                                )}
                                                {!alreadyAdded && !outOfStock && (
                                                    <PlusIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Prescription Form */}
                    <div className="flex-1 flex flex-col p-10 overflow-y-auto space-y-8 bg-white">
                         <div className="flex justify-between items-center">
                             <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">Order <span className="text-indigo-600">Line Items</span></h3>
                             <span className="text-[9px] font-black px-4 py-2 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 uppercase tracking-widest">{selectedItems.length} meds selected</span>
                         </div>

                         <div className="space-y-4">
                             {selectedItems.map((item, idx) => (
                                 <div key={idx} className="p-8 bg-slate-50 rounded-[2rem] border border-slate-200 relative group animate-scale-in">
                                     <button onClick={() => removeItem(idx)} className="absolute top-6 right-6 p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                                     <div className="grid grid-cols-2 gap-8">
                                         <div className="space-y-4">
                                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block italic">Medication Formulation</label>
                                             <p className="text-lg font-black uppercase italic tracking-tighter text-indigo-600">{item.drugName}</p>
                                         </div>
                                         <div className="space-y-4">
                                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block italic">Dosage Strategy (e.g. 500mg)</label>
                                             <input 
                                                type="text" 
                                                value={item.dosage}
                                                onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                                                className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-full text-xs font-black text-slate-800 outline-none focus:border-indigo-500/50 transition-all"
                                             />
                                         </div>
                                         <div className="grid grid-cols-3 gap-4 col-span-2">
                                             <div>
                                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Freq</label>
                                                 <input type="text" value={item.frequency} onChange={(e) => updateItem(idx, 'frequency', e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-full text-xs text-slate-800" />
                                             </div>
                                             <div>
                                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Duration</label>
                                                 <input type="text" value={item.duration} onChange={(e) => updateItem(idx, 'duration', e.target.value)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-full text-xs text-slate-800" />
                                             </div>
                                             <div>
                                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Qty</label>
                                                 <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="bg-white border border-slate-200 rounded-xl px-4 py-2 w-full text-xs text-slate-800 font-black" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {selectedItems.length === 0 && (
                                 <div className="p-20 border-2 border-dashed border-slate-200 rounded-[3rem] text-center text-slate-400 italic font-black uppercase tracking-widest text-[10px]">
                                     Pick medications from the left to build the prescription
                                 </div>
                             )}
                         </div>

                         <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Clinical Notes & Addendum</label>
                             <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-xs text-slate-800 outline-none focus:border-indigo-500/50 transition-all min-h-[100px]"
                                placeholder="E.g. Take with food, watch for allergic signals..."
                             ></textarea>
                         </div>

                         {/* ── Schedule Revisit ──────────────────────────────────── */}
                         <div className="rounded-3xl border-2 border-dashed border-indigo-200 overflow-hidden">
                             <button
                                 type="button"
                                 onClick={() => setRevisitEnabled(v => !v)}
                                 className={`w-full flex items-center justify-between px-6 py-4 transition-all ${
                                     revisitEnabled ? 'bg-indigo-600 text-white' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'
                                 }`}
                             >
                                 <div className="flex items-center gap-3">
                                     <CalendarDaysIcon className="w-4 h-4" />
                                     <span className="text-[10px] font-black uppercase tracking-widest">Schedule Revisit / Follow-up</span>
                                 </div>
                                 <div className={`w-10 h-5 rounded-full p-0.5 transition-all flex items-center ${
                                     revisitEnabled ? 'bg-white/30 justify-end' : 'bg-indigo-200 justify-start'
                                 }`}>
                                     <div className="w-4 h-4 rounded-full bg-white shadow" />
                                 </div>
                             </button>

                             {revisitEnabled && (
                                 <div className="p-6 space-y-4 bg-indigo-50/50">
                                     <div className="grid grid-cols-2 gap-4">
                                         <div className="space-y-2">
                                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Revisit Date</label>
                                             <input
                                                 type="date"
                                                 value={revisit.date}
                                                 min={new Date().toISOString().split('T')[0]}
                                                 onChange={e => setRevisit(v => ({ ...v, date: e.target.value }))}
                                                 className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                                             />
                                         </div>
                                         <div className="space-y-2">
                                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Preferred Time</label>
                                             <input
                                                 type="time"
                                                 value={revisit.time}
                                                 onChange={e => setRevisit(v => ({ ...v, time: e.target.value }))}
                                                 className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                                             />
                                         </div>
                                     </div>
                                     <div className="space-y-2">
                                         <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Reason / Instructions</label>
                                         <input
                                             type="text"
                                             value={revisit.reason}
                                             onChange={e => setRevisit(v => ({ ...v, reason: e.target.value }))}
                                             placeholder="E.g. Review blood pressure, wound check..."
                                             className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                                         />
                                     </div>
                                     <div className="space-y-2">
                                         <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block">Assigned Doctor</label>
                                         <input
                                             type="text"
                                             value={revisit.doctorName}
                                             onChange={e => setRevisit(v => ({ ...v, doctorName: e.target.value }))}
                                             placeholder="Dr. Name (leave blank to keep same doctor)"
                                             className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-black text-slate-800 outline-none focus:border-indigo-500 transition-all"
                                         />
                                     </div>
                                     {revisit.date && (
                                         <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-2.5">
                                             <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                             <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">
                                                 Revisit will be booked for {revisit.date} at {revisit.time} &mdash; auto-added to appointment schedule
                                             </p>
                                         </div>
                                     )}
                                 </div>
                             )}
                         </div>

                         <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Prescription Documentation (Scans/Files)</label>
                             <div className="flex items-center justify-between gap-4">
                                 <div className="flex items-center gap-4">
                                     <input 
                                         type="file" 
                                         multiple 
                                         onChange={(e) => setAttachedFiles([...attachedFiles, ...Array.from(e.target.files || [])])}
                                         className="hidden" 
                                         id="presc-upload" 
                                     />
                                     <label htmlFor="presc-upload" className="px-8 py-4 bg-slate-50 border border-dashed border-slate-300 rounded-2xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-100 transition-all text-slate-600">
                                         Upload Archive Node
                                     </label>
                                     <div className="flex gap-2">
                                         {attachedFiles.map((f, i) => (
                                             <div key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[8px] rounded-lg border border-indigo-100 flex items-center gap-2 font-bold">
                                                 {f.name}
                                                 <button onClick={() => setAttachedFiles(attachedFiles.filter((_, idx) => idx !== i))} className="text-rose-500 font-bold">×</button>
                                             </div>
                                         ))}
                                     </div>
                                 </div>

                                 <div className="flex items-center gap-3 bg-indigo-50 px-6 py-3 rounded-2xl border border-indigo-100">
                                     <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Bio-Adherence GSM Reminders</p>
                                     <button 
                                         onClick={() => setRemindersEnabled(!remindersEnabled)}
                                         className={`w-10 h-5 rounded-full p-1 transition-all flex items-center ${remindersEnabled ? 'bg-indigo-500 justify-end' : 'bg-slate-200 justify-start'}`}
                                     >
                                         <div className="w-3 h-3 rounded-full bg-white shadow-lg"></div>
                                     </button>
                                 </div>
                             </div>
                         </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-10 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimated Financial Impact</p>
                        <p className="text-2xl font-black text-indigo-600 italic">KES {selectedItems.reduce((s, i) => s + i.totalPrice, 0)?.toLocaleString()}</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-10 py-4 bg-slate-100 hover:bg-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-500">Abort</button>
                        <button 
                            onClick={handleSave}
                            disabled={isSaving}
                            className="bg-indigo-600 text-white px-12 py-5 rounded-2xl flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.2em] hover:scale-105 transition-all shadow-xl shadow-indigo-600/20 disabled:opacity-50"
                        >
                            {isSaving ? "Encrypting & Syncing..." : <><SparklesIcon className="w-5 h-5" /> Dispatch Electronic Order</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

