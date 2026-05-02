import React, { useState } from 'react';
import { XIcon } from '../icons/XIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { UsersIcon } from '../icons/UsersIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { CalendarIcon, ClockIcon } from './HealthIcons';
import { DiagnosisSelector } from './DiagnosisSelector';
import { suggestDiagnosis } from '../../services/geminiService';
import { apiService } from '../../services/apiService';

interface AddVisitModalProps {
    isOpen: boolean;
    onClose: () => void;
    patientId?: string;
    patientName?: string;
    patientAge?: number;
    patientGender?: string;
    onAdd: (visitData: any) => Promise<void>;
}

export const AddVisitModal: React.FC<AddVisitModalProps> = ({ isOpen, onClose, patientId, patientName, patientAge, patientGender, onAdd }) => {
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        event: '',
        dept: 'General Medicine',
        provider: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

    if (!isOpen) return null;

    const handleAiDiagnose = async () => {
        if (!patientId || !formData.event) {
            alert("Please enter clinical notes first for AI analysis.");
            return;
        }
        setIsAnalyzing(true);
        try {
            // Fetch latest vitals for context
            const vitals = await apiService.fetchModuleRecords('his_vital_statistics', 'ALL', undefined, { 
                filter: { patient_id: patientId }, 
                limit: 5,
                order: 'recorded_at.desc'
            });

            const result = await suggestDiagnosis({
                fullName: patientName || 'Unknown',
                age: patientAge || 30,
                gender: patientGender || 'Other',
                vitals: vitals || [],
                notes: formData.event
            });

            setAiSuggestions(result.suggestions);
            if (result.warning) alert(`⚠️ CLINICAL WARNING: ${result.warning}`);
        } catch (error) {
            console.error(error);
        } finally {
            setIsAnalyzing(false);
        }
    };

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
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Record <span className="text-indigo-200">Clinical Visit</span></h2>
                        <p className="text-[10px] font-black text-indigo-100 uppercase tracking-widest mt-1 opacity-80">New Entry for {patientName || 'Patient'}</p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all"><XIcon className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <CalendarIcon className="w-3 h-3" /> Visit Date
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
                                <ClockIcon className="w-3 h-3" /> Time
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
                            <SparklesIcon className="w-3 h-3" /> Clinical Event / Diagnosis
                        </label>
                        <DiagnosisSelector 
                            value={formData.event}
                            onChange={(val) => setFormData(prev => ({ ...prev, event: val }))}
                            placeholder="SEARCH BY ICD CODE OR DIAGNOSIS..."
                        />
                        <div className="flex justify-between items-center px-1">
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Powered by Quantum AI Physician</p>
                            <button 
                                type="button"
                                onClick={handleAiDiagnose}
                                disabled={isAnalyzing}
                                className="flex items-center gap-2 text-[9px] font-black text-indigo-500 uppercase tracking-widest hover:text-indigo-600 transition-all disabled:opacity-50"
                            >
                                <SparklesIcon className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} /> 
                                {isAnalyzing ? 'SYNCHRONIZING SYMPTOMS...' : 'AI SUGGEST DIAGNOSIS'}
                            </button>
                        </div>

                        {aiSuggestions.length > 0 && (
                            <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-3xl p-6 border border-indigo-100 dark:border-indigo-900/50 space-y-4 animate-in fade-in slide-in-from-top-4">
                                <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                    <SparklesIcon className="w-3 h-3" /> Clinical Suggestions
                                </p>
                                <div className="grid grid-cols-1 gap-3">
                                    {aiSuggestions.map((s, i) => (
                                        <button 
                                            key={i}
                                            type="button"
                                            onClick={() => setFormData(prev => ({ ...prev, event: `${s.code} - ${s.diagnosis}` }))}
                                            className="w-full text-left p-4 bg-white dark:bg-white/5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30 hover:border-indigo-500 transition-all group"
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] font-black text-indigo-600">{s.code}</span>
                                                <span className="text-[8px] font-black text-emerald-500">{s.confidence}% Match</span>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-600 dark:text-white uppercase">{s.diagnosis}</p>
                                            <p className="text-[8px] font-medium text-slate-400 mt-1 italic">"{s.reasoning}"</p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <BuildingOfficeIcon className="w-3 h-3" /> Department
                            </label>
                            <select 
                                value={formData.dept}
                                onChange={(e) => setFormData(prev => ({ ...prev, dept: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white appearance-none"
                            >
                                <option value="General Medicine">OPD / General</option>
                                <option value="Emergency">A&E / Emergency</option>
                                <option value="Dental">Dental Hub</option>
                                <option value="Ophthalmology">Eye / Ocular</option>
                                <option value="Inpatient">Ward / Inpatient</option>
                                <option value="Diagnostics">Lab / Imaging</option>
                            </select>
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <UsersIcon className="w-3 h-3" /> Attending Provider
                            </label>
                            <input 
                                placeholder="E.G. DR. JANE DOE"
                                required
                                value={formData.provider}
                                onChange={(e) => setFormData(prev => ({ ...prev, provider: e.target.value }))}
                                className="w-full bg-slate-50 dark:bg-white/5 border-2 border-transparent focus:border-indigo-500/50 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest outline-none transition-all dark:text-white"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-3 italic"
                    >
                        {isSubmitting ? 'SAVING RECORD...' : 'COMMIT CLINICAL ENTRY'} <SparklesIcon className="w-4 h-4" />
                    </button>
                </form>
            </div>
        </div>
    );
};

