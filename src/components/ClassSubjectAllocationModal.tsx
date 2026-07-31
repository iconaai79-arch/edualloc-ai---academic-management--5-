import React, { useState, useMemo, useEffect } from 'react';
import type { Subject, Course, Institution, Department } from '../types';
import { XIcon } from './icons/XIcon';
import { CheckIcon } from './icons/CheckIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { PlusIcon } from './icons/PlusIcon';
import { PencilIcon } from './icons/PencilIcon';
import { TrashIcon } from './icons/TrashIcon';
import { apiService } from '../services/apiService';

interface ClassSubjectAllocationModalProps {
    onClose: () => void;
    subjects: Subject[];
    courses: Course[];
    classOptions: string[];
    departments?: Department[];
    currentInstitution?: Institution | null;
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    onUpdateCourse?: (courseId: string, updatedData: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
    onAddSubject?: (newSubject: Omit<Subject, 'id' | 'institutionId'>, initialCourseLevelIds?: string[]) => void;
    onDeleteSubject?: (subjectId: string) => void;
}

export const isSubjectApplicableToClass = (
    subject: { code?: string; name?: string; description?: string; targetClasses?: string[]; assignedClasses?: string[] },
    className: string
): boolean => {
    if (!className || !className.trim()) return true;

    // 0. If explicit targetClasses or assignedClasses array is defined and non-empty, use exact match
    const targetCls = subject.targetClasses || subject.assignedClasses || (subject as any).classes;
    if (Array.isArray(targetCls) && targetCls.length > 0) {
        return targetCls.some(c => 
            c.toLowerCase().trim() === className.toLowerCase().trim() ||
            className.toLowerCase().trim().startsWith(c.toLowerCase().trim()) ||
            c.toLowerCase().trim().startsWith(className.toLowerCase().trim())
        );
    }

    const cLower = className.toLowerCase().trim();
    const code = (subject.code || '').toUpperCase().trim();
    const name = (subject.name || '').toLowerCase().trim();
    const desc = (subject.description || '').toLowerCase().trim();

    // 1. Pre-Primary (PP1, PP2, Playgroup, Nursery, KG)
    const isPPClass = cLower.includes('pp1') || cLower.includes('pp2') || cLower.includes('pp 1') || cLower.includes('pp 2') || cLower.includes('playgroup') || cLower.includes('nursery') || cLower.includes('kindergarten') || cLower.includes('kg') || cLower === 'pp';
    const isPPSubject = code.endsWith('-PP') || name.includes('pre-primary') || desc.includes('pre-primary') || desc.includes('pp1') || desc.includes('pp2') || desc.includes('playgroup') || (name.includes('activities') && (name.includes('language') || name.includes('mathematical') || name.includes('environmental') || name.includes('psychomotor') || name.includes('religious')));

    if (isPPSubject) return isPPClass;
    if (isPPClass) return isPPSubject;

    // 2. Lower Primary (Grade 1 - 3)
    const isLPClass = /\b(grade|std|standard|class)\s*[1-3]\b/i.test(className) || cLower.includes('lower primary') || cLower === 'g1' || cLower === 'g2' || cLower === 'g3';
    const isLPSubject = code.endsWith('-LP') || desc.includes('lower primary') || desc.includes('grade 1-3') || desc.includes('grade 1 - 3');

    if (isLPSubject) return isLPClass;
    if (isLPClass && (code.endsWith('-UP') || code.endsWith('-JSS') || desc.includes('upper primary') || desc.includes('junior secondary') || desc.includes('jss'))) return false;

    // 3. Upper Primary (Grade 4 - 6)
    const isUPClass = /\b(grade|std|standard|class)\s*[4-6]\b/i.test(className) || cLower.includes('upper primary') || cLower === 'g4' || cLower === 'g5' || cLower === 'g6';
    const isUPSubject = code.endsWith('-UP') || desc.includes('upper primary') || desc.includes('grade 4-6') || desc.includes('grade 4 - 6');

    if (isUPSubject) return isUPClass;
    if (isUPClass && (code.endsWith('-PP') || code.endsWith('-LP') || code.endsWith('-JSS') || desc.includes('pre-primary') || desc.includes('lower primary') || desc.includes('junior secondary') || desc.includes('jss'))) return false;

    // 4. Junior Secondary / JSS (Grade 7 - 9)
    const isJSSClass = /\b(grade|std|standard|class)\s*[7-9]\b/i.test(className) || cLower.includes('jss') || cLower.includes('junior') || cLower === 'g7' || cLower === 'g8' || cLower === 'g9';
    const isJSSSubject = code.endsWith('-JSS') || code === 'INT-SCI' || code === 'PRE-TECH' || code === 'HEALTH-ED' || code === 'LIFE-SKILLS' || code === 'ARTS-SPORTS' || desc.includes('junior') || desc.includes('jss') || desc.includes('grade 7-9') || desc.includes('grade 7 - 9');

    if (isJSSSubject) return isJSSClass;
    if (isJSSClass && (code.endsWith('-PP') || code.endsWith('-LP') || code.endsWith('-UP') || desc.includes('pre-primary') || desc.includes('lower primary') || desc.includes('upper primary') || (name.includes('activities') && !name.includes('creative arts')))) return false;

    // Default: General subjects apply to all Primary and Secondary classes (Grade 1 through Form 4)
    return true;
};

export const ClassSubjectAllocationModal: React.FC<ClassSubjectAllocationModalProps> = ({
    onClose,
    subjects = [],
    courses = [],
    classOptions = [],
    departments = [],
    currentInstitution,
    onUpdateSubject,
    onUpdateCourse,
    onAddSubject,
    onDeleteSubject
}) => {
    const [selectedClass, setSelectedClass] = useState<string>(classOptions[0] || 'Form 1 Central');
    const [searchQuery, setSearchQuery] = useState('');
    const [copyFromClass, setCopyFromClass] = useState<string>('');
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [localSubjects, setLocalSubjects] = useState<Subject[]>(subjects);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        departmentId: '',
        periodsPerWeek: 4
    });

    useEffect(() => {
        setLocalSubjects(subjects);
    }, [subjects]);

    // Map of subjectId -> set of classNames assigned
    const [assignments, setAssignments] = useState<Record<string, Set<string>>>(() => {
        const initial: Record<string, Set<string>> = {};
        
        subjects.forEach(s => {
            const set = new Set<string>();
            const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;
            if (Array.isArray(targetCls) && targetCls.length > 0) {
                targetCls.forEach(c => set.add(c));
            } else {
                // Default subject assignment based on Grade level (PP1 to Grade 9)
                classOptions.filter(c => isSubjectApplicableToClass(s, c)).forEach(c => set.add(c));
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
        if (!searchQuery.trim()) return localSubjects;
        const q = searchQuery.toLowerCase();
        return localSubjects.filter(s => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q));
    }, [localSubjects, searchQuery]);

    // Count assigned subjects for selectedClass
    const assignedCountForSelectedClass = useMemo(() => {
        return localSubjects.filter(s => assignments[s.id]?.has(selectedClass)).length;
    }, [localSubjects, assignments, selectedClass]);

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
        const subj = localSubjects.find(s => s.id === subjectId);
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
        localSubjects.forEach(s => {
            const set = new Set(next[s.id] || []);
            set.add(selectedClass);
            next[s.id] = set;
        });
        setAssignments(next);

        for (const s of localSubjects) {
            const targetClassesArr = Array.from(next[s.id]);
            if (onUpdateSubject) {
                onUpdateSubject(s.id, { targetClasses: targetClassesArr, assignedClasses: targetClassesArr } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...s, targetClasses: targetClassesArr } as Subject).catch(() => {});
            }
        }
        setToastMessage(`Assigned all ${localSubjects.length} subjects to ${selectedClass}`);
        setTimeout(() => setToastMessage(null), 3000);
    };

    const handleClearAll = async () => {
        const next = { ...assignments };
        localSubjects.forEach(s => {
            const set = new Set(next[s.id] || []);
            set.delete(selectedClass);
            next[s.id] = set;
        });
        setAssignments(next);

        for (const s of localSubjects) {
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
        
        localSubjects.forEach(s => {
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

        for (const s of localSubjects) {
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

    // Add / Edit Handlers
    const handleOpenAdd = () => {
        setEditingSubject(null);
        setFormData({
            name: '',
            code: '',
            departmentId: departments[0]?.id || '',
            periodsPerWeek: 4
        });
        setIsAddModalOpen(true);
    };

    const handleOpenEdit = (subject: Subject, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setEditingSubject(subject);
        const periods = subject.lessonStructure && subject.lessonStructure.length > 0
            ? subject.lessonStructure.reduce((a, b) => a + b.count, 0)
            : 4;
        setFormData({
            name: subject.name,
            code: subject.code,
            departmentId: subject.departmentId || departments[0]?.id || '',
            periodsPerWeek: periods
        });
        setIsAddModalOpen(true);
    };

    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim() || !formData.code.trim()) {
            alert('Subject Title and Subject Code are required.');
            return;
        }

        const lessonStructure = [{ count: Number(formData.periodsPerWeek) || 4, periods: 1 }];

        if (editingSubject) {
            // Edit existing subject
            const updatedData = {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
                departmentId: formData.departmentId || undefined,
                lessonStructure
            };

            if (onUpdateSubject) {
                onUpdateSubject(editingSubject.id, updatedData as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...editingSubject, ...updatedData } as Subject).catch(() => {});
            }

            setLocalSubjects(prev => prev.map(s => s.id === editingSubject.id ? { ...s, ...updatedData } : s));
            setToastMessage(`Subject "${formData.name.trim()}" updated successfully.`);
        } else {
            // Add new subject & allocate to selectedClass
            const newSubjData: Omit<Subject, 'id' | 'institutionId'> = {
                name: formData.name.trim(),
                code: formData.code.trim().toUpperCase(),
                departmentId: formData.departmentId || departments[0]?.id || 'dept_1',
                lessonStructure,
                isComplete: true,
                targetClasses: [selectedClass],
                assignedClasses: [selectedClass]
            };

            const newId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

            if (onAddSubject) {
                onAddSubject(newSubjData);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...newSubjData, id: newId, institutionId: currentInstitution.id } as Subject).catch(() => {});
            }

            const fullCreated: Subject = { ...newSubjData, id: newId, institutionId: currentInstitution?.id || 'default' } as Subject;
            setLocalSubjects(prev => [...prev, fullCreated]);
            setAssignments(prev => ({
                ...prev,
                [newId]: new Set([selectedClass])
            }));

            setToastMessage(`New subject "${formData.name.trim()}" created and allocated to ${selectedClass}.`);
        }

        setIsAddModalOpen(false);
        setEditingSubject(null);
        setTimeout(() => setToastMessage(null), 3500);
    };

    const handleDeleteSubject = async (subjectId: string, subjectName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!window.confirm(`Are you sure you want to delete "${subjectName}"? This action cannot be undone.`)) {
            return;
        }

        if (onDeleteSubject) {
            onDeleteSubject(subjectId);
        }
        if (currentInstitution?.id) {
            await apiService.deleteSubject(subjectId).catch(() => {});
        }

        setLocalSubjects(prev => prev.filter(s => s.id !== subjectId));
        setAssignments(prev => {
            const next = { ...prev };
            delete next[subjectId];
            return next;
        });

        setToastMessage(`Subject "${subjectName}" deleted.`);
        setTimeout(() => setToastMessage(null), 3500);
    };

    return (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden relative">
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
                            Configure, edit, add, or delete learning areas and subject allocations for each specific class grade/stream.
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

                {/* Stats & Quick Actions Bar */}
                <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-700 flex flex-wrap justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-2xl border border-indigo-100 dark:border-indigo-800">
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block">Active for {selectedClass}</span>
                            <span className="text-lg font-black text-indigo-700 dark:text-indigo-300">
                                {assignedCountForSelectedClass} / {localSubjects.length} Subjects
                            </span>
                        </div>

                        <button
                            type="button"
                            onClick={handleOpenAdd}
                            className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-200 dark:shadow-none hover:scale-105 active:scale-95"
                        >
                            <PlusIcon className="w-4 h-4" /> + Add New Subject
                        </button>
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
                            <button
                                onClick={handleOpenAdd}
                                className="mt-4 px-4 py-2 bg-indigo-600 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-md"
                            >
                                + Add First Subject
                            </button>
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

                                        <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                                            <button
                                                type="button"
                                                onClick={e => handleOpenEdit(subject, e)}
                                                title="Edit subject details"
                                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                            >
                                                <PencilIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={e => handleDeleteSubject(subject.id, subject.name, e)}
                                                title="Delete subject"
                                                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-slate-700 rounded-xl transition-colors"
                                            >
                                                <TrashIcon className="w-4 h-4" />
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => handleToggleSubject(subject.id)}
                                                className={`w-12 h-7 rounded-full transition-colors relative focus:outline-none ml-1 ${
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

                {/* Add / Edit Subject Sub-Modal Form Overlay */}
                {isAddModalOpen && (
                    <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 w-full max-w-md p-6 space-y-6 animate-fade-in">
                            <div className="flex justify-between items-center border-b border-slate-100 dark:border-slate-700 pb-4">
                                <h4 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                                    {editingSubject ? <PencilIcon className="w-5 h-5 text-indigo-500" /> : <PlusIcon className="w-5 h-5 text-indigo-500" />}
                                    {editingSubject ? 'Edit Subject' : `Add Subject for ${selectedClass}`}
                                </h4>
                                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                    <XIcon className="w-5 h-5" />
                                </button>
                            </div>

                            <form onSubmit={handleSaveForm} className="space-y-4 text-xs">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                        Subject Name / Learning Area *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                        placeholder="e.g. Integrated Science, Kiswahili Language"
                                        className="form-input font-bold"
                                    />
                                </div>

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                        Subject Code *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.code}
                                        onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        placeholder="e.g. INT-SCI, KISW-01"
                                        className="form-input font-mono uppercase font-bold"
                                    />
                                </div>

                                {departments && departments.length > 0 && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                            Department
                                        </label>
                                        <select
                                            value={formData.departmentId}
                                            onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                                            className="form-select font-bold text-slate-700 dark:text-slate-200"
                                        >
                                            {departments.map(d => (
                                                <option key={d.id} value={d.id}>{d.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                )}

                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">
                                        Periods per Week
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.periodsPerWeek}
                                        onChange={e => setFormData({ ...formData, periodsPerWeek: Number(e.target.value) || 1 })}
                                        className="form-input font-bold"
                                    />
                                </div>

                                <div className="pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddModalOpen(false)}
                                        className="px-4 py-2.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-bold uppercase tracking-wider"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="btn-primary px-6 py-2.5 text-xs font-black uppercase tracking-wider"
                                    >
                                        {editingSubject ? 'Save Changes' : 'Create & Allocate'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
