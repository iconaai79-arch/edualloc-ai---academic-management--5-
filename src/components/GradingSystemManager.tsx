
import React, { useState, useEffect, useMemo } from 'react';
import type { Institution, GradeDefinition, GradingSystem } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { AcademicCapIcon } from './icons/AcademicCapIcon';

import { DEFAULT_GRADING_SYSTEMS } from '../constants';

interface GradingSystemManagerProps {
    currentInstitution?: Institution | null;
    onUpdateInstitution?: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
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
            // Migration logic: If no gradingSystems but has deprecated gradingSystem, convert it.
            // Otherwise default.
            let initSystems = currentInstitution.gradingSystems || [];
            if (initSystems.length === 0 && currentInstitution.gradingSystem) {
                 initSystems = [{
                    id: 'gs_default_migrated',
                    name: 'Default Grading System',
                    definitions: currentInstitution.gradingSystem
                 }];
            } else if (initSystems.length === 0) {
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

    const handleSaveChanges = () => {
        if (!currentInstitution || !onUpdateInstitution) return;
        setSaveStatus('saving');
        
        // Validate current system ranges
        if (selectedSystem) {
            for (let i = 0; i < selectedSystem.definitions.length; i++) {
                const g = selectedSystem.definitions[i];
                if (g.minScore > g.maxScore) {
                    alert(`Error in grade "${g.grade}": Minimum score cannot be greater than maximum score.`);
                    setSaveStatus('idle');
                    return;
                }
            }
        }

        onUpdateInstitution(currentInstitution.id, { 
            gradingSystems: systems,
            activeGradingSystemId: activeSystemId
        });
        
        setTimeout(() => {
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        }, 500);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar list of systems */}
            <div className="lg:col-span-1 space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">Grading Systems</h3>
                    <button onClick={() => setIsAddingSystem(true)} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-[var(--color-primary)]">
                        <PlusIcon className="w-5 h-5" />
                    </button>
                </div>
                
                {isAddingSystem && (
                    <form onSubmit={handleAddSystem} className="flex gap-2">
                        <input 
                            type="text" 
                            value={newSystemName} 
                            onChange={e => setNewSystemName(e.target.value)} 
                            className="form-input text-sm py-1 px-2" 
                            placeholder="System Name" 
                            autoFocus
                        />
                        <button type="submit" className="btn-primary text-xs px-2">Add</button>
                    </form>
                )}

                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {systems.map(system => (
                        <div 
                            key={system.id} 
                            onClick={() => setSelectedSystemId(system.id)}
                            className={`p-3 rounded-lg cursor-pointer border transition-all ${
                                selectedSystemId === system.id 
                                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 ring-1 ring-blue-300' 
                                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-blue-300'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <span className="font-medium text-sm text-slate-800 dark:text-slate-200">{system.name}</span>
                                {activeSystemId === system.id && (
                                    <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-0.5 rounded-full">Active</span>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">{system.definitions.length} grades defined</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Area */}
            <div className="lg:col-span-3 space-y-6">
                {selectedSystem ? (
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-200 dark:border-slate-700 pb-4">
                            <div className="flex-grow w-full sm:w-auto">
                                <label className="block text-xs text-slate-500 uppercase font-bold mb-1">System Name</label>
                                <input 
                                    type="text" 
                                    value={selectedSystem.name} 
                                    onChange={e => handleSystemNameChange(e.target.value)} 
                                    className="form-input font-bold text-lg w-full"
                                />
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                                {activeSystemId !== selectedSystem.id && (
                                    <button 
                                        onClick={() => setActiveSystemId(selectedSystem.id)} 
                                        className="btn-secondary text-xs"
                                    >
                                        Set as Default
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleDeleteSystem(selectedSystem.id)} 
                                    className="btn-danger text-xs bg-red-100 text-red-600 hover:bg-red-200 border-none px-3 py-2 rounded"
                                    disabled={systems.length <= 1}
                                >
                                    Delete System
                                </button>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
                                <thead className="bg-slate-50 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300">Grade</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300">Min Score (%)</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300">Max Score (%)</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300">Points</th>
                                        <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 dark:text-slate-300">Comment</th>
                                        <th className="px-4 py-2"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {[...selectedSystem.definitions].sort((a,b) => b.minScore - a.minScore).map(grade => (
                                        <tr key={grade.id}>
                                            <td className="px-4 py-2">
                                                <input type="text" value={grade.grade} onChange={e => handleGradeChange(grade.id, 'grade', e.target.value)} className="form-input text-sm w-20" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" value={grade.minScore} onChange={e => handleGradeChange(grade.id, 'minScore', parseInt(e.target.value) || 0)} className="form-input text-sm w-24" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" value={grade.maxScore} onChange={e => handleGradeChange(grade.id, 'maxScore', parseInt(e.target.value) || 0)} className="form-input text-sm w-24" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="number" value={grade.points} onChange={e => handleGradeChange(grade.id, 'points', parseFloat(e.target.value) || 0)} step="0.1" className="form-input text-sm w-24" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <input type="text" value={grade.comment} onChange={e => handleGradeChange(grade.id, 'comment', e.target.value)} className="form-input text-sm w-full" />
                                            </td>
                                            <td className="px-4 py-2">
                                                <button onClick={() => handleDeleteGrade(grade.id)} className="text-red-500 hover:text-red-700 p-1">
                                                    <XIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 flex justify-between items-center border-t border-slate-200 dark:border-slate-700 pt-4">
                            <button onClick={handleAddGrade} className="btn-secondary inline-flex items-center gap-2 text-sm">
                                <PlusIcon className="w-4 h-4"/> Add Grade Level
                            </button>
                            <div className="flex items-center gap-4">
                                {saveStatus === 'saved' && <span className="text-sm font-medium text-green-600 flex items-center gap-2"><CheckIcon className="w-5 h-5"/> Saved!</span>}
                                {onUpdateInstitution && (
                                    <button onClick={handleSaveChanges} className="btn-primary" disabled={saveStatus === 'saving'}>
                                        {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-64 bg-slate-50 dark:bg-slate-800 rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-700 text-slate-400">
                        <div className="text-center">
                            <AcademicCapIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                            <p>Select a grading system to edit or create a new one.</p>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .form-input { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 600; border: none; cursor: pointer; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: white; }
            `}</style>
        </div>
    );
};

