import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { HeartIcon } from './HealthIcons';
import { HISPatient } from '../../types';

interface EmergencyTransferModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: HISPatient | null | undefined;
    vitals: any[];
    onGenerate: (receivingFacility: string, reasonForTransfer: string, nurseNotes: string) => Promise<void>;
}

export function EmergencyTransferModal({ 
    isOpen, 
    onClose, 
    patient, 
    vitals, 
    onGenerate 
}: EmergencyTransferModalProps) {
    const [receivingFacility, setReceivingFacility] = useState('');
    const [reasonForTransfer, setReasonForTransfer] = useState('');
    const [nurseNotes, setNurseNotes] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    if (!isOpen || !patient) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!receivingFacility.trim() || !reasonForTransfer.trim()) {
            alert("Please specify the receiving facility and the reason for transfer.");
            return;
        }
        setIsGenerating(true);
        try {
            await onGenerate(receivingFacility, reasonForTransfer, nurseNotes);
            onClose();
        } catch (error) {
            console.error("Failed to generate transfer letter:", error);
            alert("Failed to compile transfer document.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={onClose}></div>
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-white/10 shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Accent Warning Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 blur-[100px] rounded-full -mr-32 -mt-32"></div>

                <div className="flex items-center justify-between p-8 border-b border-slate-100 dark:border-white/5 relative z-10">
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tighter italic text-rose-600 dark:text-rose-450">Emergency <span className="text-slate-800 dark:text-white">Patient Dispatch</span></h2>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mt-1">Generate Official Transfer Letter</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-slate-100 dark:bg-white/5 rounded-2xl text-slate-400 hover:text-red-500 transition-all">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-6 relative z-10 max-h-[70vh] overflow-y-auto no-scrollbar">
                    {/* Patient Context Card */}
                    <div className="p-6 bg-slate-50 dark:bg-white/5 rounded-3xl border border-slate-100 dark:border-white/5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[9px] font-black text-slate-450 uppercase tracking-widest">Patient Name</p>
                                <h3 className="text-lg font-black uppercase tracking-tight text-slate-800 dark:text-white">{patient.fullName}</h3>
                            </div>
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-450 uppercase tracking-widest">Blood Registry</p>
                                <span className="text-sm font-black text-rose-550 uppercase">{patient.bloodGroup || 'UNKNOWN'}</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/50 dark:border-white/5">
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Known Allergies</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {patient.allergies && patient.allergies.length > 0 
                                        ? patient.allergies.join(", ").toUpperCase() 
                                        : "NO KNOWN ALLERGIES"}
                                </p>
                            </div>
                            <div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Chronic Conditions</p>
                                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    {patient.chronicConditions && patient.chronicConditions.length > 0 
                                        ? patient.chronicConditions.join(", ").toUpperCase() 
                                        : "NO CHRONIC CONDITIONS"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Transfer Details */}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-450 ml-1">Receiving Facility / Hospital</label>
                            <input
                                required
                                type="text"
                                placeholder="E.G. NAIROBI HOSPITAL, KENYATTA NATIONAL HOSPITAL..."
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-rose-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-800 dark:text-white"
                                value={receivingFacility}
                                onChange={e => setReceivingFacility(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-450 ml-1">Reason for Transfer / Diagnosis</label>
                            <textarea
                                required
                                rows={3}
                                placeholder="DESCRIBE THE CRITICAL EMERGENCY / SYMPTOMS PRESENTED..."
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-rose-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-800 dark:text-white no-scrollbar"
                                value={reasonForTransfer}
                                onChange={e => setReasonForTransfer(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-slate-450 ml-1">Sickbay Intervention & Nurse Notes</label>
                            <textarea
                                rows={3}
                                placeholder="DESCRIBE FIRST AID / MEDICATION ADMINISTERED AND STUDENT STATUS..."
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-rose-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all shadow-inner text-slate-800 dark:text-white no-scrollbar"
                                value={nurseNotes}
                                onChange={e => setNurseNotes(e.target.value)}
                            />
                        </div>
                    </div>
                </form>

                <div className="p-8 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/5 relative z-10 flex justify-end gap-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-8 py-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-lg text-slate-700 dark:text-slate-350"
                    >
                        Abandon Transfer
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isGenerating}
                        className="px-8 py-4 bg-rose-600 text-white rounded-2xl flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-rose-500/20 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                            <PlusIcon className="w-4 h-4" />
                        )}
                        Compile Transfer Letter
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmergencyTransferModal;
