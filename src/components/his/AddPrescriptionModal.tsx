import React, { useState, useEffect } from 'react';
import { 
    XIcon, 
    PlusIcon, 
    TrashIcon, 
    BeakerIcon, 
    SparklesIcon, 
    CheckCircleIcon,
    SearchIcon,
    ExclamationTriangleIcon
} from '../icons/index';
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
            await apiService.saveModuleRecord('his_prescriptions', {
                id: prescId,
                institutionId,
                patientId,
                doctorName: doctorName || 'Attending Physician',
                notes,
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
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-xl animate-fade-in">
            <div className="bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[3.5rem] shadow-2xl border border-white/10 overflow-hidden flex flex-col animate-zoom-in">
                {/* Header */}
                <div className="p-10 border-b border-white/5 flex justify-between items-center bg-indigo-600/10 backdrop-blur-md">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Digital <span className="text-indigo-400">Prescription Center</span></h2>
                        <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest mt-1 opacity-80 italic">Issuing electronic orders for {patientName}</p>
                    </div>
                    <button onClick={onClose} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-1 overflow-hidden flex">
                    {/* Drug Picker */}
                    <div className="w-1/3 border-r border-white/5 flex flex-col bg-black/20">
                        <div className="p-6">
                            <div className="flex items-center gap-4 bg-white/5 px-6 py-4 rounded-2xl border border-white/10 focus-within:border-indigo-500/50 transition-all">
                                <SearchIcon className="w-4 h-4 text-slate-500" />
                                <input 
                                    type="text" 
                                    placeholder="SEARCH DRUG CATALOGUE..." 
                                    className="bg-transparent border-none outline-none text-[10px] font-black uppercase tracking-widest w-full text-white placeholder:text-slate-600"
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
                                    className="w-full p-6 hover:bg-white/5 rounded-2xl text-left border border-transparent hover:border-white/5 transition-all group"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-sm font-black uppercase italic tracking-tighter group-hover:text-indigo-400">{drug.name}</p>
                                            <p className="text-[9px] font-bold text-slate-500 uppercase mt-1">{drug.unit} • KES {drug.unitPrice}</p>
                                        </div>
                                        <PlusIcon className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Prescription Form */}
                    <div className="flex-1 flex flex-col p-10 overflow-y-auto space-y-8 bg-black/40">
                         <div className="flex justify-between items-center">
                             <h3 className="text-xl font-black uppercase tracking-tighter italic">Order <span className="text-indigo-400">Line Items</span></h3>
                             <span className="text-[9px] font-black px-4 py-2 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-400/20 uppercase tracking-widest">{selectedItems.length} meds selected</span>
                         </div>

                         <div className="space-y-4">
                             {selectedItems.map((item, idx) => (
                                 <div key={idx} className="p-8 bg-white/5 rounded-[2rem] border border-white/10 relative group animate-scale-in">
                                     <button onClick={() => removeItem(idx)} className="absolute top-6 right-6 p-2 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"><TrashIcon className="w-4 h-4" /></button>
                                     <div className="grid grid-cols-2 gap-8">
                                         <div className="space-y-4">
                                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block italic">Medication Formulation</label>
                                             <p className="text-lg font-black uppercase italic tracking-tighter text-indigo-400">{item.drugName}</p>
                                         </div>
                                         <div className="space-y-4">
                                             <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest block italic">Dosage Strategy (e.g. 500mg)</label>
                                             <input 
                                                type="text" 
                                                value={item.dosage}
                                                onChange={(e) => updateItem(idx, 'dosage', e.target.value)}
                                                className="bg-black/60 border border-white/5 rounded-xl px-4 py-2 w-full text-xs font-black text-white outline-none focus:border-indigo-500/50 transition-all"
                                             />
                                         </div>
                                         <div className="grid grid-cols-3 gap-4 col-span-2">
                                             <div>
                                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Freq</label>
                                                 <input type="text" value={item.frequency} onChange={(e) => updateItem(idx, 'frequency', e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 w-full text-xs text-white" />
                                             </div>
                                             <div>
                                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Duration</label>
                                                 <input type="text" value={item.duration} onChange={(e) => updateItem(idx, 'duration', e.target.value)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 w-full text-xs text-white" />
                                             </div>
                                             <div>
                                                 <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2 block">Qty</label>
                                                 <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 w-full text-xs text-white font-black" />
                                             </div>
                                         </div>
                                     </div>
                                 </div>
                             ))}
                             {selectedItems.length === 0 && (
                                 <div className="p-20 border-2 border-dashed border-white/5 rounded-[3rem] text-center opacity-30 italic font-black uppercase tracking-widest text-[10px]">
                                     Pick medications from the left to build the prescription
                                 </div>
                             )}
                         </div>

                         <div className="space-y-4">
                             <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] italic">Clinical Notes & Addendum</label>
                             <textarea 
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 text-xs text-white outline-none focus:border-indigo-500/50 transition-all min-h-[120px]"
                                placeholder="E.g. Take with food, watch for allergic signals..."
                             ></textarea>
                         </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-10 border-t border-white/5 flex justify-between items-center bg-black/40">
                    <div>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Estimated Financial Impact</p>
                        <p className="text-2xl font-black text-indigo-400 italic">KES {selectedItems.reduce((s, i) => s + i.totalPrice, 0).toLocaleString()}</p>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="px-10 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all text-slate-400">Abort</button>
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
