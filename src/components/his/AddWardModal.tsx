import React, { useState } from 'react';
import { XIcon, BuildingOfficeIcon, SparklesIcon, BedIcon } from '../icons/index';

interface AddWardModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (wardData: any) => Promise<void>;
}

export const AddWardModal: React.FC<AddWardModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        name: '',
        wardType: 'General',
        capacity: 20,
        floorLevel: 1
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onAdd(formData);
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
                        <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/10">
                            <BuildingOfficeIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Initialize <span className="text-emerald-500">Ward Unit</span></h2>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.3em] mt-1">Expanding clinical facility infrastructure</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <label className="block space-y-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Ward Designation</span>
                            <input 
                                required
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner"
                                placeholder="e.g. ICU Alpha, Maternity Wing..."
                            />
                        </label>
                        <label className="block space-y-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Specialization Hub</span>
                            <select 
                                value={formData.wardType}
                                onChange={e => setFormData({ ...formData, wardType: e.target.value })}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner appearance-none"
                            >
                                <option value="General">General Facility</option>
                                <option value="ICU">Critical Care (ICU)</option>
                                <option value="Maternity">Maternity Unit</option>
                                <option value="Pediatric">Pediatric Hub</option>
                                <option value="Surgical">Surgical Ward</option>
                            </select>
                        </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <label className="block space-y-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Total Bed Nodes</span>
                            <div className="relative">
                                <BedIcon className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input 
                                    type="number"
                                    value={formData.capacity}
                                    onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl pl-14 pr-6 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner"
                                />
                            </div>
                        </label>
                        <label className="block space-y-3">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Facility Floor Level</span>
                            <input 
                                type="number"
                                value={formData.floorLevel}
                                onChange={e => setFormData({ ...formData, floorLevel: parseInt(e.target.value) })}
                                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-2xl px-6 py-4 text-sm font-bold focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all shadow-inner"
                            />
                        </label>
                    </div>

                    <div className="pt-4 border-t border-slate-50 dark:border-white/5 flex flex-col md:flex-row gap-4">
                        <button 
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-5 rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                            Cancel
                        </button>
                        <button 
                            disabled={isSubmitting}
                            className="flex-[2] py-5 bg-emerald-500 text-slate-950 rounded-3xl text-[11px] font-black uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <SparklesIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <>Deploy Ward Registry <SparklesIcon className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
