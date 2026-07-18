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

    useEffect(() => {
        const loadDrugs = async () => {
             if (isOpen && institutionId) {
                 const data = await apiService.fetchModuleRecords('his_pharmacy_inventory', institutionId);
                 setDrugs(data || []);
             }
        };
        loadDrugs();
    }, [isOpen, institutionId]);

    if (!isOpen) return null;

    const filteredDrugs = drugs.filter(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const addItem = (drug: any) => {
        if (selectedItems.find(i => i.drugId === drug.id)) return;
        setSelectedItems([...selectedItems, {
            drugId: drug.id,
            drugName: drug.name,
            dosage: '',
            frequency: '1x Daily',
            duration: '5 Days',
            quantity: 1,
            unitPrice: drug.unitPrice,
            totalPrice: drug.unitPrice
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

            alert("Prescription synchronized with Pharmacy.");
            onAdd?.();
            onClose();
            setSelectedItems([]);
            setNotes('');
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
                            {filteredDrugs.map(drug => (
                                <button 
                                    key={drug.id} 
                                    onClick={() => addItem(drug)}
                                    className="w-full p-6 hover:bg-slate-100 rounded-2xl text-left border border-transparent hover:border-slate-100 transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-black uppercase italic tracking-tighter text-slate-900 group-hover:text-indigo-600">{drug.name}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{drug.unit} • KES {drug.unitPrice}</p>
                                        </div>
                                        <PlusIcon className="w-4 h-4 text-slate-600 group-hover:text-indigo-600 transition-colors" />
                                    </div>
                                </button>
                            ))}
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
                                className="w-full bg-slate-50 border border-slate-200 rounded-3xl p-6 text-xs text-slate-800 outline-none focus:border-indigo-500/50 transition-all min-h-[120px]"
                                placeholder="E.g. Take with food, watch for allergic signals..."
                             ></textarea>
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

