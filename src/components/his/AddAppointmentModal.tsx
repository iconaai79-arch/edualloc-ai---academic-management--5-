import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { SearchIcon } from '../icons/SearchIcon';

interface AddAppointmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (appointmentData: any) => Promise<void>;
}

export const AddAppointmentModal: React.FC<AddAppointmentModalProps> = ({ isOpen, onClose, onAdd }) => {
    const [formData, setFormData] = useState({
        patientName: '',
        patientId: '',
        doctorName: '',
        specialty: 'General Medicine',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        type: 'Initial Consultation',
        status: 'Scheduled'
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
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden animate-zoom-in">
                <div className="p-10 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-indigo-600">
                    <div>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Schedule <span className="text-indigo-200">Patient Visit</span></h2>
                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mt-1 opacity-80">Synchronizing Clinical Timeline</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"><XIcon className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-6">
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <UsersIcon className="w-3 h-3" /> Patient Identity
                        </label>
                        <div className="relative">
                            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input 
                                type="text"
                                required
                                placeholder="PATIENT NAME OR REGISTRY ID..."
                                value={formData.patientName}
                                onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value, patientId: e.target.value.toLowerCase().replace(/\s/g, '_') }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl pl-12 pr-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UsersIcon className="w-3 h-3" /> Attending Practitioner
                            </label>
                            <input 
                                type="text"
                                required
                                placeholder="E.G. DR. SMITH"
                                value={formData.doctorName}
                                onChange={(e) => setFormData(prev => ({ ...prev, doctorName: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <SparklesIcon className="w-3 h-3" /> Specialty
                            </label>
                            <select 
                                value={formData.specialty}
                                onChange={(e) => setFormData(prev => ({ ...prev, specialty: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white appearance-none"
                            >
                                <option value="General Medicine">General OPD</option>
                                <option value="Dental">Dental Hub</option>
                                <option value="Ophthalmology">Eye / Ocular</option>
                                <option value="Diagnostics">Lab / Imaging</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <CalendarDaysIcon className="w-3 h-3" /> Target Date
                            </label>
                            <input 
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-xs font-bold outline-none transition-all dark:text-white"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <ClockIcon className="w-3 h-3" /> Sync Time
                            </label>
                            <input 
                                type="time"
                                required
                                value={formData.time}
                                onChange={(e) => setFormData(prev => ({ ...prev, time: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-xs font-bold outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <SparklesIcon className="w-3 h-3" /> Visit Category
                        </label>
                        <select 
                            value={formData.type}
                            onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                            className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white appearance-none"
                        >
                            <option value="Initial Consultation">Initial Consultation</option>
                            <option value="Follow-up">Follow-up Visit</option>
                            <option value="Emergency">Urgent Care</option>
                            <option value="Procedure">Surgical/Minor Procedure</option>
                        </select>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-3 italic"
                    >
                        {isSubmitting ? 'ESTABLISHING RECORD...' : 'QUEUE APPOINTMENT'} <SparklesIcon className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
};
