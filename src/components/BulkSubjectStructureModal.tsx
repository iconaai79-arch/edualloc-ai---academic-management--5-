import React, { useState, useMemo } from 'react';
import type { Subject, Department, LessonStructure } from '../types';
import { XIcon } from './icons/XIcon';
import { PlusIcon } from './icons/PlusIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';

interface BulkSubjectStructureModalProps {
    onClose: () => void;
    departments: Department[];
    subjects: Subject[];
    onBulkUpdate: (updates: Record<string, Partial<Subject>>) => Promise<void>;
}

export const BulkSubjectStructureModal: React.FC<BulkSubjectStructureModalProps> = ({ onClose, departments, subjects, onBulkUpdate }) => {
    const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
    const [lessonStructure, setLessonStructure] = useState<LessonStructure[]>([{ count: 1, periods: 1 }]);
    const [overwriteExisting, setOverwriteExisting] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [step, setStep] = useState<'config' | 'success'>('config');

    const filteredSubjects = useMemo(() => {
        return subjects.filter(s => {
            if (selectedDeptId !== 'all' && s.departmentId !== selectedDeptId) return false;
            // If not overlapping, we only care about those with empty structures
            if (!overwriteExisting) {
                return !s.lessonStructure || s.lessonStructure.length === 0;
            }
            return true;
        });
    }, [subjects, selectedDeptId, overwriteExisting]);

    const handleStructureChange = (index: number, field: 'count' | 'periods', value: string) => {
        const newStructure = [...lessonStructure];
        const numValue = parseInt(value, 10);
        newStructure[index] = { ...newStructure[index], [field]: isNaN(numValue) || numValue < 1 ? 1 : numValue };
        setLessonStructure(newStructure);
    };

    const addStructure = () => {
        setLessonStructure([...lessonStructure, { count: 1, periods: 1 }]);
    };

    const removeStructure = (index: number) => {
        setLessonStructure(lessonStructure.filter((_, i) => i !== index));
    };

    const handleApply = async () => {
        setIsSubmitting(true);
        try {
            const updates: Record<string, Partial<Subject>> = {};
            filteredSubjects.forEach(s => {
                updates[s.id] = { lessonStructure };
            });

            await onBulkUpdate(updates);
            setStep('success');
        } catch (error) {
            console.error(error);
            alert("Failed to apply bulk updates.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>

                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">Bulk Instruction Matrix</h3>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mt-1">Apply standard teaching patterns</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="p-8">
                    {step === 'config' && (
                        <div className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Target Department</label>
                                    <select
                                        value={selectedDeptId}
                                        onChange={e => setSelectedDeptId(e.target.value)}
                                        className="form-select w-full"
                                    >
                                        <option value="all">All Departments</option>
                                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                                <div className="flex items-center pt-6">
                                    <label className="flex items-center gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={overwriteExisting}
                                            onChange={e => setOverwriteExisting(e.target.checked)}
                                            className="w-5 h-5 rounded-lg text-indigo-600 border-slate-300 focus:ring-indigo-500 transition-all"
                                        />
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-indigo-600 transition-colors">Overwrite existing matrices?</span>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-xs font-black uppercase text-slate-900 dark:text-white mb-3 ml-1">Define Standard Pattern</h4>
                                <div className="space-y-3">
                                    {lessonStructure.map((ls, index) => (
                                        <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                            <div className="flex items-center gap-3">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={ls.count}
                                                    onChange={e => handleStructureChange(index, 'count', e.target.value)}
                                                    className="w-16 text-center font-black bg-white dark:bg-slate-900 rounded-xl py-2 border-slate-200 dark:border-slate-700 outline-none"
                                                />
                                                <span className="text-xs font-black text-slate-300">×</span>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={ls.periods}
                                                    onChange={e => handleStructureChange(index, 'periods', e.target.value)}
                                                    className="w-16 text-center font-black bg-white dark:bg-slate-900 rounded-xl py-2 border-slate-200 dark:border-slate-700 outline-none"
                                                />
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Periods</span>
                                            </div>
                                            {lessonStructure.length > 1 && (
                                                <button onClick={() => removeStructure(index)} className="ml-auto p-2 text-slate-300 hover:text-red-500 transition-colors">
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    <button
                                        onClick={addStructure}
                                        className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add Slot
                                    </button>
                                </div>
                            </div>

                            <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-800">
                                <p className="text-center text-indigo-800 dark:text-indigo-200 text-xs font-bold">
                                    Action will update <span className="text-lg mx-1">{filteredSubjects.length}</span> subjects
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={onClose} className="btn-secondary h-12 px-6">Cancel</button>
                                <button
                                    onClick={handleApply}
                                    disabled={isSubmitting || filteredSubjects.length === 0}
                                    className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100 flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                                >
                                    {isSubmitting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                                    {isSubmitting ? 'Applying...' : 'Apply Matrix'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-10">
                            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                                <CheckCircleIcon className="w-10 h-10" />
                            </div>
                            <h4 className="text-2xl font-black uppercase tracking-tighter mb-2">Updates Applied</h4>
                            <p className="text-slate-500 mb-8 font-medium">Successfully updated instruction matrix for {filteredSubjects.length} subjects.</p>
                            <button onClick={onClose} className="btn-primary h-12 px-10 uppercase tracking-widest text-xs">Done</button>
                        </div>
                    )}
                </div>
            </div>
            <style>{`
                .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
                .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
            `}</style>
        </div>
    );
};
