import React, { useState, useMemo, useEffect } from 'react';
import type { Subject, Course, Institution } from '../types';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { apiService } from '../services/apiService';

interface ClassSubjectAllocationModalProps {
    onClose: () => void;
    subjects: Subject[];
    courses: Course[];
    classOptions: string[];
    currentInstitution?: Institution | null;
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    onUpdateCourse?: (courseId: string, updatedData: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
}

export const ClassSubjectAllocationModal: React.FC<ClassSubjectAllocationModalProps> = ({
    onClose,
    subjects = [],
    courses = [],
    classOptions = [],
    currentInstitution,
    onUpdateSubject,
    onUpdateCourse
}) => {
    const [selectedClass, setSelectedClass] = useState<string>(classOptions[0] || 'Form 1 Central');
    const [searchQuery, setSearchQuery] = useState('');
    const [copyFromClass, setCopyFromClass] = useState<string>('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Map of subjectId -> set of classNames assigned
    const [assignments, setAssignments] = useState<Record<string, Set<string>>>(() => {
        const initial: Record<string, Set<string>> = {};
        
        subjects.forEach(s => {
            const set = new Set<string>();
            const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;
            if (Array.isArray(targetCls)) {
                targetCls.forEach(c => set.add(c));
            } else {
                // If no specific class assignments set, default to all classOptions
                classOptions.forEach(c => set.add(c));
            }
            
            // Check course levels
            courses.forEach(c => {
                if (c.levels) {
                    c.levels.forEach(l => {
                        const ids = l.subjectIds || (l as any).subject_ids || [];
                        if (ids.includes(s.id)) {
                            set.add(l.name || c.name);
                        }
                    });
                }
            });
            initial[s.id] = set;
        });

        return initial;
    });

    useEffect(() => {
        if (classOptions.length > 0 && !selectedClass) {
            setSelectedClass(classOptions[0]);
        }
    }, [classOptions, selectedClass]);

    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return subjects;
        const q = searchQuery.toLowerCase();
        return subjects.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }, [subjects, searchQuery]);

    // Count assigned subjects for selectedClass
    const assignedCountForSelectedClass = useMemo(() => {
        return subjects.filter(s => assignments[s.id]?.has(selectedClass)).length;
    }, [subjects, assignments, selectedClass]);

    const handleToggleSubject = async (subjectId: string) => {
        const currentSet = new Set(assignments[subjectId] || []);
        if (currentSet.has(selectedClass)) {
            currentSet.delete(selectedClass);
        } else {
            currentSet.add(selectedClass);
        }

        const updatedAssignments = {
            ...assignments,
            [subjectId]: currentSet
        };
        setAssignments(updatedAssignments);

        const targetClassesArr = Array.from(currentSet);
        const subj = subjects.find(s => s.id === subjectId);
        if (subj) {
            const updatedData = { ...subj, targetClasses: targetClassesArr, assignedClasses: targetClassesArr };
            if (onUpdateSubject) {
                onUpdateSubject(subjectId, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject(updatedData as Subject).catch(() => {});
            }
        }
    };

    const handleSelectAll = async () => {
        const next = { ...assignments };
        subjects.forEach(s => {
            const set = new Set(next[s.id] || []);
            set.add(selectedClass);
            next[s.id] = set;
        });
        setAssignments(next);

        for (const s of subjects) {
            const targetClassesArr = Array.from(next[s.id]);
            if (onUpdateSubject) {
                onUpdateSubject(s.id, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...s, targetClasses: targetClassesArr } as Subject).catch(() => {});
            }
        }
        setToastMessage(`Assigned all ${subjects.length} subjects to ${selectedClass}`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleClearAll = async () => {
        const next = { ...assignments };
        subjects.forEach(s => {
            const set = new Set(next[s.id] || []);
            set.delete(selectedClass);
            next[s.id] = set;
        });
        setAssignments(next);

        for (const s of subjects) {
            const targetClassesArr = Array.from(next[s.id]);
            if (onUpdateSubject) {
                onUpdateSubject(s.id, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...s, targetClasses: targetClassesArr } as Subject).catch(() => {});
            }
        }
        setToastMessage(`Removed all subjects from ${selectedClass}`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleCopyFromClass = async () => {
        if (!copyFromClass || copyFromClass === selectedClass) return;
        const next = { ...assignments };
        
        subjects.forEach(s => {
            const sourceSet = assignments[s.id] || new Set();
            const targetSet = new Set(next[s.id] || []);
            if (sourceSet.has(copyFromClass)) {
                targetSet.add(selectedClass);
            } else {
                targetSet.delete(selectedClass);
            }
            next[s.id] = targetSet;
        });
        setAssignments(next);

        for (const s of subjects) {
            const targetClassesArr = Array.from(next[s.id]);
            if (onUpdateSubject) {
                onUpdateSubject(s.id, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...s, targetClasses: targetClassesArr } as Subject).catch(() => {});
            }
        }
        setToastMessage(`Copied subject allocations from ${copyFromClass} to ${selectedClass}`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-200 dark:border-indigo-800">
                                Class Curriculum Allocation
                            </span>
                        </div>
                        <h3 className="text-xl md:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-1">
                            Manage Subjects per Class Stream
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                            Configure which learning areas and subjects are active for each specific class grade/stream.
                        </p>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl transition-all"
                    >
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Top Controls Bar */}
                <div className="p-6 bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                            Select Active Class
                        </label>
                        <select
                            value={selectedClass}
                            onChange={e => setSelectedClass(e.target.value)}
                            className="form-select font-bold text-indigo-600 dark:text-indigo-400"
                        >
                            {classOptions.map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>

                    <div className="relative">
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                            Search Subjects
                        </label>
                        <div className="relative">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Filter code or title..."
                                className="form-input pl-10"
                            />
                            <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">
                            Copy Settings From
                        </label>
                        <div className="flex gap-2">
                            <select
                                value={copyFromClass}
                                onChange={e => setCopyFromClass(e.target.value)}
                                className="form-select text-xs"
                            >
                                <option value="">Select source class...</option>
                                {classOptions.filter(c => c !== selectedClass).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleCopyFromClass}
                                disabled={!copyFromClass}
                                className="btn-secondary px-3 py-2 text-[10px] font-black uppercase tracking-wider disabled:opacity-50 flex items-center gap-1"
                            >
                                <ArrowsRightLeftIcon className="w-4 h-4" /> Copy
                            </button>
                        </div>
                    </div>
                </div>

                {/* Stats & Quick Actions */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Active for {selectedClass}</span>
                            <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                                {assignedCountForSelectedClass} / {subjects.length} Subjects
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSelectAll}
                            className="px-4 py-2 bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            ✓ Assign All to {selectedClass}
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="px-4 py-2 bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            ✕ Remove All
                        </button>
                    </div>
                </div>

                {/* Toast message */}
                {toastMessage && (
                    <div className="mx-6 mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-2xl border border-emerald-200 text-xs font-bold animate-fade-in flex items-center justify-between">
                        <span>✨ {toastMessage}</span>
                        <button onClick={() => setToastMessage(null)} className="text-emerald-600 font-bold">✕</button>
                    </div>
                )}

                {/* Subject List Grid */}
                <div className="p-6 overflow-y-auto flex-1 divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredSubjects.length === 0 ? (
                        <div className="py-12 text-center text-slate-400">
                            <BookOpenIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-bold uppercase tracking-wider">No subjects match search criteria.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredSubjects.map(subject => {
                                const isAssigned = assignments[subject.id]?.has(selectedClass);
                                return (
                                    <div
                                        key={subject.id}
                                        onClick={() => handleToggleSubject(subject.id)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                                            isAssigned
                                                ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60 shadow-sm'
                                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700/60 hover:bg-slate-50'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 ${
                                                isAssigned ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'
                                            }`}>
                                                {subject.code.slice(0, 4)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white truncate">
                                                    {subject.name}
                                                </h4>
                                                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                                    {subject.code} • {subject.lessonStructure && subject.lessonStructure.length > 0 ? `${subject.lessonStructure.reduce((a, b) => a + b.count, 0)} p/wk` : 'N/A'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="shrink-0">
                                            <button
                                                type="button"
                                                className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none ${
                                                    isAssigned ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-700'
                                                }`}
                                            >
                                                <span className={`block w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                                                    isAssigned ? 'translate-x-6' : 'translate-x-1'
                                                }`} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-400">
                        Changes are automatically saved to your institution database.
                    </span>

                    <button
                        onClick={onClose}
                        className="btn-primary px-8 py-3 text-xs font-black uppercase tracking-widest"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};
