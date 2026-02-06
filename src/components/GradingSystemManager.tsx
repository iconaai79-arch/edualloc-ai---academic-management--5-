
import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, GradeDefinition, GradingSystem } from '../types';
import { PlusIcon, XIcon, CheckIcon, AcademicCapIcon, ArrowPathIcon, CheckCircleIcon } from './icons/index.ts';
import { DEFAULT_GRADING_SYSTEMS } from '../constants.ts';

interface GradingSystemManagerProps {
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => Promise<void> | void;
}

export const GradingSystemManager: React.FC<GradingSystemManagerProps> = ({ currentInstitution, onUpdateInstitution }) => {
    const [systems, setSystems] = useState<GradingSystem[]>([]);
    const [activeSystemId, setActiveSystemId] = useState<string>('');
    const [selectedSystemId, setSelectedSystemId] = useState<string>('');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [newSystemName, setNewSystemName] = useState('');
    const [isAddingSystem, setIsAddingSystem] = useState(false);

    useEffect(() => {
        if (currentInstitution) {
            let initSystems = currentInstitution.gradingSystems || [];
            if (initSystems.length === 0) {
                initSystems = DEFAULT_GRADING_SYSTEMS;
            }

            setSystems(initSystems);
            const active = currentInstitution.activeGradingSystemId || initSystems[0]?.id || '';
            setActiveSystemId(active);
            
            if (!selectedSystemId) {
                setSelectedSystemId(active || initSystems[0]?.id || '');
            }
        }
    }, [currentInstitution]);

    const selectedSystem = useMemo(() => systems.find(s => s.id === selectedSystemId), [systems, selectedSystemId]);

    const handleSystemNameChange = (name: string) => {
        setSystems(prev => prev.map(s => s.id === selectedSystemId ? { ...s, name } : s));
    };

    const handleGradeChange = (gradeId: string, field: keyof GradeDefinition, value: string | number) => {
        setSystems(prev => prev.map(s => {
            if (s.id === selectedSystemId) {
                return {
                    ...s,
                    definitions: s.definitions.map(g => g.id === gradeId ? { ...g, [field]: value } : g)
                };
            }
            return s;
        }));
    };

    const handleAddGrade = () => {
        const newGrade: GradeDefinition = {
            id: `grade_${Date.now()}`,
            grade: 'New',
            minScore: 0,
            maxScore: 0,
            points: 0,
            comment: ''
        };
        setSystems(prev => prev.map(s => {
            if (s.id === selectedSystemId) {
                return { ...s, definitions: [...s.definitions, newGrade] };
            }
            return s;
        }));
    };

    const handleDeleteGrade = (gradeId: string) => {
        setSystems(prev => prev.map(s => {
            if (s.id === selectedSystemId) {
                return { ...s, definitions: s.definitions.filter(g => g.id !== gradeId) };
            }
            return s;
        }));
    };

    const handleAddSystem = (e: React.FormEvent) => {
        e.preventDefault();
        if (newSystemName.trim()) {
            const newSystem: GradingSystem = {
                id: `gs_${Date.now()}`,
                name: newSystemName.trim(),
                definitions: []
            };
            setSystems(prev => [...prev, newSystem]);
            setSelectedSystemId(newSystem.id);
            setNewSystemName('');
            setIsAddingSystem(false);
        }
    };

    const handleDeleteSystem = (systemId: string) => {
        if (window.confirm('Are you sure you want to delete this grading system?')) {
            const newSystems = systems.filter(s => s.id !== systemId);
            setSystems(newSystems);
            if (selectedSystemId === systemId) {
                setSelectedSystemId(newSystems[0]?.id || '');
            }
            if (activeSystemId === systemId) {
                setActiveSystemId(newSystems[0]?.id || '');
            }
        }
    };

    const handleSaveChanges = async () => {
        if (!currentInstitution || !onUpdateInstitution) return;
        
        if (selectedSystem) {
            for (const g of selectedSystem.definitions) {
                if (g.minScore > g.maxScore) {
                    alert(`Logic Error in grade "${g.grade}": Min score > Max score.`);
                    return;
                }
            }
        }

        setSaveStatus('saving');
        try {
            await onUpdateInstitution(currentInstitution.id, { 
                gradingSystems: systems,
                activeGradingSystemId: activeSystemId
            });
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2500);
        } catch (err) {
            console.error("Grading save failed:", err);
            setSaveStatus('idle');
            alert("Failed to sync grading changes with the cloud registry.");
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in">
            <div className="lg:col-span-1 space-y-4">
                <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">Grading Map</h3>
                    <button onClick={() => setIsAddingSystem(true)} className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-colors">
                        <PlusIcon className="w-4 h-4" />
                    </button>
                </div>
                
                {isAddingSystem && (
                    <form onSubmit={handleAddSystem} className="flex gap-2 p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-indigo-100 animate-scale-in">
                        <input 
                            type="text" 
                            value={newSystemName} 
                            onChange={e => setNewSystemName(e.target.value)} 
                            className="form-input text-xs py-1 px-2 border-none" 
                            placeholder="Scheme Name..." 
                            autoFocus
                        />
                        <button type="submit" className="btn-primary text-[10px] p-1 h-8 w-8"><CheckIcon className="w-4 h-4"/></button>
                        <button type="button" onClick={() => setIsAddingSystem(false)} className="btn-secondary text-[10px] p-1 h-8 w-8 flex items-center justify-center"><XIcon className="w-4 h-4"/></button>
                    </form>
                )}

                <div className="space-y-2">
                    {systems.map(system => (
                        <button 
                            key={system.id} 
                            onClick={() => setSelectedSystemId(system.id)}
                            className={`w-full text-left p-4 rounded-2xl border-2 transition-all group ${
                                selectedSystemId === system.id 
                                    ? 'bg-white dark:bg-slate-800 border-indigo-600 shadow-xl shadow-indigo-100 dark:shadow-none' 
                                    : 'bg-white dark:bg-slate-800 border-slate-50 dark:border-slate-700 hover:border-indigo-200'
                            }`}
                        >
                            <div className="flex justify-between items-center">
                                <span className={`text-sm font-black uppercase tracking-tight ${selectedSystemId === system.id ? 'text-indigo-600' : 'text-slate-700 dark:text-slate-300'}`}>
                                    {system.name}
                                </span>
                                {activeSystemId === system.id && (
                                    <div className="w-2 h-2 bg-green-500 rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                                )}
                            </div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{system.definitions.length} Grade Tiers</p>
                        </button>
                    ))}
                </div>
            </div>

            <div className="lg:col-span-3">
                {selectedSystem ? (
                    <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                            <div className="flex-grow w-full">
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Scheme Designation</label>
                                <input 
                                    type="text" 
                                    value={selectedSystem.name} 
                                    onChange={e => handleSystemNameChange(e.target.value)} 
                                    className="form-input font-black text-xl uppercase tracking-tighter"
                                />
                            </div>
                            <div className="flex gap-2 shrink-0">
                                {activeSystemId !== selectedSystem.id && (
                                    <button onClick={() => setActiveSystemId(selectedSystem.id)} className="btn-secondary h-11 text-[10px] font-black uppercase tracking-widest bg-white">Set Default</button>
                                )}
                                <button onClick={() => handleDeleteSystem(selectedSystem.id)} className="h-11 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 transition-all">Delete</button>
                            </div>
                        </div>

                        <div className="p-8">
                            <div className="overflow-hidden border border-slate-100 dark:border-slate-800 rounded-3xl">
                                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Symbol</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Range (%)</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Points</th>
                                            <th className="px-6 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Descriptor</th>
                                            <th className="px-6 py-4"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {selectedSystem.definitions.sort((a,b) => b.minScore - a.minScore).map(grade => (
                                            <tr key={grade.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-3"><input type="text" value={grade.grade} onChange={e => handleGradeChange(grade.id, 'grade', e.target.value)} className="form-input-sm w-16 font-black text-indigo-600" /></td>
                                                <td className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <input type="number" value={grade.minScore} onChange={e => handleGradeChange(grade.id, 'minScore', parseInt(e.target.value) || 0)} className="form-input-sm w-16 text-center" />
                                                        <span className="text-slate-300">-</span>
                                                        <input type="number" value={grade.maxScore} onChange={e => handleGradeChange(grade.id, 'maxScore', parseInt(e.target.value) || 0)} className="form-input-sm w-16 text-center" />
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3"><input type="number" value={grade.points} onChange={e => handleGradeChange(grade.id, 'points', parseFloat(e.target.value) || 0)} step="0.1" className="form-input-sm w-16 text-center" /></td>
                                                <td className="px-6 py-3"><input type="text" value={grade.comment} onChange={e => handleGradeChange(grade.id, 'comment', e.target.value)} className="form-input-sm w-full" placeholder="Excellent..." /></td>
                                                <td className="px-6 py-3 text-right"><button onClick={() => handleDeleteGrade(grade.id)} className="p-1.5 text-slate-300 hover:text-red-500 transition-colors"><XIcon className="w-5 h-5" /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-6">
                                <button onClick={handleAddGrade} className="btn-secondary h-12 flex items-center gap-2 px-6 shadow-sm">
                                    <PlusIcon className="w-5 h-5"/> Add Threshold
                                </button>
                                <div className="flex items-center gap-6">
                                    {saveStatus === 'saved' && (
                                        <span className="text-sm font-black text-green-600 uppercase tracking-widest flex items-center gap-2 animate-fade-in">
                                            <CheckCircleIcon className="w-6 h-6"/> Registry Updated
                                        </span>
                                    )}
                                    <button 
                                        onClick={handleSaveChanges} 
                                        className={`btn-primary h-14 px-12 shadow-xl shadow-indigo-100 ${saveStatus === 'saving' ? 'opacity-70 animate-pulse' : ''}`} 
                                        disabled={saveStatus === 'saving'}
                                    >
                                        {saveStatus === 'saving' ? (
                                            <><ArrowPathIcon className="w-5 h-5 animate-spin"/> Syncing Registry...</>
                                        ) : 'Commit Grading Scheme'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-32 bg-white dark:bg-slate-800 rounded-[3rem] border-4 border-dashed border-slate-50 dark:border-slate-800 text-center opacity-40">
                        <AcademicCapIcon className="w-16 h-16 text-slate-200 mb-4" />
                        <h4 className="text-xl font-black text-slate-300 uppercase tracking-[0.3em]">Initialize a Grading Scale</h4>
                    </div>
                )}
            </div>

            <style>{`
                .form-input-sm { display: block; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; background-color: #f8fafc; font-size: 0.75rem; font-weight: bold; transition: all 0.2s; outline: none; }
                .dark .form-input-sm { border-color: #334155; background-color: #0f172a; color: white; }
                .form-input-sm:focus { border-color: #4f46e5; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
            `}</style>
        </div>
    );
};
