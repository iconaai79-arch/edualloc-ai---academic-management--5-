
import React, { useState } from 'react';
import type { HISPrescription, HISPharmacyInventory, HISPharmacyBatch } from '../../types';
import { XIcon } from '../icons/XIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { BeakerIcon } from '../icons/BeakerIcon';
import { ClipboardListIcon } from '../icons/ClipboardListIcon';

interface DispenseMedicationModalProps {
    prescription: HISPrescription;
    inventory: HISPharmacyInventory[];
    batches: HISPharmacyBatch[];
    onClose: () => void;
    onDispense: (prescriptionId: string, data: {
        clinicalNotes: string;
        attachedFiles: string[];
        medicationImage: string;
        dispensedItems: { medicationId: string, quantity: number, unitPrice: number }[];
    }) => Promise<void>;
}

export const DispenseMedicationModal: React.FC<DispenseMedicationModalProps> = ({
    prescription, inventory, batches, onClose, onDispense
}) => {
    const [clinicalNotes, setClinicalNotes] = useState('');
    const [medicationImage, setMedicationImage] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
    const [newFileUrl, setNewFileUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const dispensedItems = (prescription.items || []).map(item => ({
                medicationId: item.drugId,
                quantity: item.quantity,
                unitPrice: item.unitPrice
            }));

            await onDispense(prescription.id, {
                clinicalNotes,
                attachedFiles,
                medicationImage,
                dispensedItems
            });
            onClose();
        } catch (error) {
            console.error("Dispense error:", error);
            alert("Failed to dispense medication.");
        } finally {
            setIsSaving(false);
        }
    };

    const addFile = () => {
        if (newFileUrl) {
            setAttachedFiles([...attachedFiles, newFileUrl]);
            setNewFileUrl('');
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
            <div className="bg-[#0a0a0f] border border-white/10 rounded-[3rem] w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl shadow-indigo-500/10 animate-fade-in-up">
                <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tighter italic text-white flex items-center gap-3">
                            Dispense <span className="text-indigo-400">Matrix</span>
                            <span className="text-[10px] font-black bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full border border-indigo-500/30 not-italic tracking-widest ml-4">
                                PRESCRIPTION #{prescription.id.slice(0, 8)}
                            </span>
                        </h3>
                    </div>
                    <button onClick={onClose} className="p-3 rounded-full hover:bg-white/5 text-slate-500 hover:text-white transition-all"><XIcon className="w-6 h-6" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 flex-grow overflow-y-auto space-y-10 no-scrollbar">
                    {/* Prescription Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 border-l-2 border-indigo-500 pl-4">Biological Loadout</h4>
                            <div className="space-y-4">
                                {(prescription.items || []).map((item, idx) => {
                                    const invItem = inventory.find(i => i.id === item.drugId);
                                    return (
                                        <div key={idx} className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex justify-between items-center group hover:border-indigo-500/30 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                                    <BeakerIcon className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black uppercase italic text-white">{item.drugName}</p>
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Dosage: {item.dosage} • Freq: {item.frequency}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-xs font-black text-white italic">{item.quantity} Units Required</p>
                                                <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${(invItem?.stockQuantity || 0) < item.quantity ? 'text-rose-400' : 'text-emerald-400'}`}>
                                                    Stock: {invItem?.stockQuantity || 0}
                                                </p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 border-l-2 border-emerald-500 pl-4">Clinical Documentation</h4>
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Molecular Observation / Clinical Notes</label>
                                    <textarea 
                                        value={clinicalNotes}
                                        onChange={e => setClinicalNotes(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-6 text-white text-xs outline-none focus:border-indigo-500/50 h-32 transition-all"
                                        placeholder="Enter clinical observations, contraindications, or specific dispensing instructions..."
                                    ></textarea>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Medication Dispatch Image URL</label>
                                    <input 
                                        type="text"
                                        value={medicationImage}
                                        onChange={e => setMedicationImage(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-white text-xs outline-none focus:border-indigo-500/50"
                                        placeholder="https://..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* File Attachment Section */}
                    <div className="space-y-6 p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                        <h4 className="text-xs font-black uppercase tracking-[0.3em] text-slate-500">Prescription Files & Scans</h4>
                        <div className="flex gap-4">
                            <input 
                                type="text"
                                value={newFileUrl}
                                onChange={e => setNewFileUrl(e.target.value)}
                                className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-6 py-4 text-white text-xs outline-none focus:border-indigo-500/50"
                                placeholder="Link scanned documents or lab reports (URL)..."
                            />
                            <button 
                                type="button" 
                                onClick={addFile}
                                className="px-8 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-500 hover:text-white transition-all border border-white/10"
                            >
                                Link Object
                            </button>
                        </div>
                        <div className="flex flex-wrap gap-3">
                            {attachedFiles.map((file, i) => (
                                <div key={i} className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center gap-3">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest truncate max-w-[200px]">{file}</span>
                                    <button type="button" onClick={() => setAttachedFiles(attachedFiles.filter((_, idx) => idx !== i))} className="text-rose-500 hover:text-rose-400"><XIcon className="w-3 h-3" /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </form>

                <div className="p-8 border-t border-white/5 bg-white/[0.02] flex justify-between items-center">
                    <div className="px-8 py-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/20">
                        <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em]">Total Yield Matrix</p>
                        <h4 className="text-2xl font-black italic text-white tracking-tighter">KES {(prescription.items || []).reduce((s, i) => s + i.totalPrice, 0).toLocaleString()}</h4>
                    </div>
                    <div className="flex gap-4">
                        <button type="button" onClick={onClose} className="px-10 py-5 rounded-[2rem] bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-all">Abort</button>
                        <button 
                            onClick={handleSubmit}
                            disabled={isSaving}
                            className="px-12 py-5 rounded-[2rem] bg-indigo-500 text-white text-[10px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-indigo-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50"
                        >
                            {isSaving ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <><CheckCircleIcon className="w-5 h-5" /> Commit Dispense Matrix</>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
