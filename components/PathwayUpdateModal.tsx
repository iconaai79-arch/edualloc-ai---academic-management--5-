import React, { useState, useMemo } from 'react';
import type { Subject, Department, LessonStructure } from '../types.ts';
import { suggestPathwaySubjectUpdates } from '../services/geminiService';
import { SparklesIcon, XIcon, CheckCircleIcon, ArrowPathIcon, InformationCircleIcon } from './icons/index.ts';

interface PathwayUpdateModalProps {
    onClose: () => void;
    departments: Department[];
    subjects: Subject[];
    onBulkUpdate: (updates: Record<string, Partial<Subject>>) => Promise<void>;
}

interface ProposedUpdate {
    lessonStructure: LessonStructure[];
    hasExam: boolean;
    description: string;
}

export const PathwayUpdateModal: React.FC<PathwayUpdateModalProps> = ({ onClose, departments = [], subjects = [], onBulkUpdate }) => {
    const [step, setStep] = useState<'config' | 'review' | 'applying' | 'success'>('config');
    const [selectedDeptId, setSelectedDeptId] = useState(departments[0]?.id || '');
    const [targetProfile, setTargetProfile] = useState('Senior Secondary CBC');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [proposedUpdates, setProposedUpdates] = useState<Record<string, ProposedUpdate>>({});
    const [selectedUpdateIds, setSelectedUpdateIds] = useState<Set<string>>(new Set());

    const pathwaySubjects = useMemo(() => {
        return (subjects || []).filter(s => s.departmentId === selectedDeptId);
    }, [subjects, selectedDeptId]);

    const handleAnalyze = async () => {
        if (!selectedDeptId || pathwaySubjects.length === 0) return;
        
        setIsAnalyzing(true);
        try {
            const deptName = (departments || []).find(d => d.id === selectedDeptId)?.name || '';
            const updates = await suggestPathwaySubjectUpdates(pathwaySubjects, deptName, targetProfile);
            setProposedUpdates(updates);
            setSelectedUpdateIds(new Set(Object.keys(updates)));
            setStep('review');
        } catch (err) {
            alert("Analysis failed. Please check your connection.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleToggleSelection = (id: string) => {
        const next = new Set(selectedUpdateIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedUpdateIds(next);
    };

    const handleApply = async () => {
        const finalUpdates: Record<string, Partial<Subject>> = {};
        selectedUpdateIds.forEach(id => {
            finalUpdates[id] = proposedUpdates[id];
        });

        setStep('applying');
        try {
            await onBulkUpdate(finalUpdates);
            setStep('success');
        } catch (err) {
            alert("Application failed.");
            setStep('review');
        }
    };

    const formatStructure = (ls: LessonStructure[]) => {
        return ls.map(s => `${s.count}x${s.periods}`).join(', ');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200">
                             <SparklesIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black uppercase tracking-tight">Pathway Synchronizer</h3>
                            <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">AI-Powered Curriculum Alignment</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-8 overflow-y-auto max-h-[70vh]">
                    {step === 'config' && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Target Pathway (Dept)</label>
                                    <select 
                                        value={selectedDeptId} 
                                        onChange={e => setSelectedDeptId(e.target.value)}
                                        className="form-select w-full h-14"
                                    >
                                        {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase italic">Affects {pathwaySubjects.length} subjects in this registry.</p>
                                </div>
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Curriculum Profile</label>
                                    <select 
                                        value={targetProfile} 
                                        onChange={e => setTargetProfile(e.target.value)}
                                        className="form-select w-full h-14"
                                    >
                                        <option>Senior Secondary CBC</option>
                                        <option>Junior Secondary CBC</option>
                                        <option>University Standard (Undergrad)</option>
                                        <option>Polytechnic TVET</option>
                                    </select>
                                </div>
                            </div>

                            <div className="p-6 bg-indigo-50 dark:bg-indigo-900/30 rounded-3xl border border-indigo-100 dark:border-indigo-800 flex gap-4">
                                <InformationCircleIcon className="w-6 h-6 text-indigo-600 shrink-0" />
                                <div className="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed font-medium">
                                    AI will analyze the titles of your subjects (e.g., "Inorganic Chemistry") and recommend standard weekly lesson counts, durations, and assessment policies based on the selected curriculum profile.
                                </div>
                            </div>

                            <button 
                                onClick={handleAnalyze} 
                                disabled={isAnalyzing || pathwaySubjects.length === 0}
                                className="w-full btn-primary h-14 shadow-indigo-100 uppercase tracking-widest text-sm font-black flex items-center justify-center gap-3 disabled:opacity-50"
                            >
                                {isAnalyzing ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                                {isAnalyzing ? 'Analyzing Registry Matrix...' : 'Execute Intelligent Analysis'}
                            </button>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Proposed Neural Alignments</h4>
                            <div className="grid grid-cols-1 gap-3">
                                {Object.keys(proposedUpdates).map((id) => {
                                    const update = proposedUpdates[id];
                                    const subject = (subjects || []).find(s => s.id === id);
                                    if (!subject) return null;
                                    const isSelected = selectedUpdateIds.has(id);
                                    return (
                                        <div 
                                            key={id} 
                                            onClick={() => handleToggleSelection(id)}
                                            className={`p-5 rounded-[2rem] border-2 cursor-pointer transition-all flex items-center justify-between group ${isSelected ? 'border-indigo-500 bg-indigo-50/30 dark:bg-indigo-900/20' : 'border-slate-50 dark:border-slate-800 opacity-60 hover:opacity-100'}`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div className={`p-3 rounded-2xl transition-all ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                                                    <CheckCircleIcon className="w-6 h-6" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{subject.name}</p>
                                                    <div className="flex gap-4 mt-1">
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Structure: <span className="text-indigo-600">{formatStructure(update.lessonStructure)}</span></span>
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Exam: <span className={update.hasExam ? 'text-green-600' : 'text-red-600'}>{update.hasExam ? 'Required' : 'Excluded'}</span></span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="max-w-[200px] text-right hidden md:block">
                                                <p className="text-[9px] text-slate-500 italic line-clamp-2">"{update.description}"</p>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex justify-end gap-3 pt-6 border-t">
                                <button onClick={() => setStep('config')} className="btn-secondary h-12 px-6">Modify Params</button>
                                <button onClick={handleApply} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Commit {selectedUpdateIds.size} Changes</button>
                            </div>
                        </div>
                    )}

                    {step === 'applying' && (
                        <div className="flex flex-col items-center justify-center py-20 animate-pulse">
                            <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-black uppercase tracking-tighter">Syncing Registry...</h4>
                            <p className="text-sm text-slate-500">Executing batch database updates</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-16 animate-scale-in">
                            <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-green-100 dark:shadow-none">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black uppercase tracking-tighter mb-2">Pathway Synced</h4>
                            <p className="text-slate-500 mb-10 font-medium">All selected units have been updated to the intelligent curriculum standard.</p>
                            <button onClick={onClose} className="btn-primary h-14 px-12 uppercase tracking-widest text-xs shadow-indigo-100">Finish</button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .form-select { display: block; width: 100%; border-radius: 1.25rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
                .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
            `}</style>
        </div>
    );
};
