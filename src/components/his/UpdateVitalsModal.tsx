import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { HeartIcon, ActivityIcon } from './HealthIcons';

interface UpdateVitalsModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientName?: string;
    patientId: string;
    onUpdate: (vitals: any[]) => Promise<void>;
}

export function UpdateVitalsModal({ isOpen, onClose, patientName, patientId, onUpdate }: UpdateVitalsModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [vitals, setVitals] = useState([
        { label: 'Blood Pressure', value: '120/80', unit: 'mmHg', color: 'text-emerald-400' },
        { label: 'Heart Rate', value: '72', unit: 'BPM', color: 'text-white' },
        { label: 'Oxygen Saturation', value: '98%', unit: 'SpO2', color: 'text-blue-400' },
        { label: 'Body Temp', value: '36.8', unit: '°C', color: 'text-white' }
    ]);

    if (!isOpen) return null;

    const handleChange = (index: number, val: string) => {
        const newVitals = [...vitals];
        newVitals[index].value = val;
        setVitals(newVitals);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onUpdate(vitals.map(v => ({ ...v, patientId, id: `v_${Date.now()}_${Math.random()}` })));
            onClose();
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl" onClick={onClose} />
            
            <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-white/5 shadow-2xl overflow-hidden animate-fade-in-up">
                {/* Header */}
                <div className="p-8 pb-4 border-b border-slate-50 dark:border-white/5 flex justify-between items-start">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 shadow-xl shadow-indigo-500/10">
                            <HeartIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter italic">Update <span className="text-indigo-600">Vital Diagnostics</span></h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Acquiring clinical metrics for {patientName || 'Patient'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {vitals.map((v, i) => (
                            <label key={i} className="block space-y-3 group">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 group-focus-within:text-indigo-500 transition-colors italic">{v.label} ({v.unit})</span>
                                <div className="relative">
                                    <ActivityIcon className={`absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 ${v.color} opacity-50`} />
                                    <input 
                                        required
                                        type="text"
                                        value={v.value}
                                        onChange={e => handleChange(i, e.target.value)}
                                        className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-inner italic"
                                        placeholder={`Enter ${v.label}...`}
                                    />
                                </div>
                            </label>
                        ))}
                    </div>

                    <div className="pt-4 border-t border-slate-50 dark:border-white/5 flex flex-col md:flex-row gap-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all italic"
                        >
                            Abort
                        </button>
                        <button 
                            disabled={isSubmitting}
                            className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 disabled:opacity-50 italic"
                        >
                            {isSubmitting ? (
                                <SparklesIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <>Commit Diagnostic Bio-Data <SparklesIcon className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UpdateVitalsModal;
