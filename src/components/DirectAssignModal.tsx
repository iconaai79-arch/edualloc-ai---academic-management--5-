import React, { useState, useCallback, useMemo } from 'react';
import type { User, Subject, Priority, Course } from '../types';
import { generateBulkJustification, generateJustification } from '../services/geminiService';
import { SparklesIcon, XIcon, PlusIcon, CheckIcon, MagnifyingGlassIcon, ChevronDownIcon } from './icons/index.ts';

interface DirectAssignModalProps {
    lecturers: User[];
    subjects: Subject[];
    courses: Course[];
    onClose: () => void;
    onAssign: (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections: Record<string, string[]>) => void;
}

export const DirectAssignModal: React.FC<DirectAssignModalProps> = ({ lecturers = [], subjects = [], courses = [], onClose, onAssign }) => {
    const [lecturerId, setLecturerId] = useState<string>(lecturers[0]?.id || '');
    const [selectedSubjectIds, setSelectedSubjectIds] = useState<Set<string>>(new Set());
    const [courseLevelSelections, setCourseLevelSelections] = useState<Record<string, string[]>>({});
    const [priority, setPriority] = useState<Priority>('Medium');
    const [justification, setJustification] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
    const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(null);

    const selectedSubjects = useMemo(() => (subjects || []).filter(s => s && selectedSubjectIds.has(s.id)), [subjects, selectedSubjectIds]);

    const filteredSubjects = useMemo(() => {
        const list = subjects || [];
        if (!subjectSearchQuery.trim()) return list;
        const q = subjectSearchQuery.toLowerCase();
        return list.filter(s => s && (s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)));
    }, [subjects, subjectSearchQuery]);

    const subjectCourseLevels = useMemo(() => {
        const map = new Map<string, { courseName: string, levelId: string, levelName: string }[]>();
        const safeSubjects = subjects || [];
        const safeCourses = courses || [];

        safeSubjects.forEach(subject => {
            if (!subject) return;
            const associated: { courseName: string, levelId: string, levelName: string }[] = [];
            safeCourses.forEach(course => {
                if (course && course.departmentId === subject.departmentId) {
                    (course.levels || []).forEach(level => {
                        if (level && (level.subjectIds || []).includes(subject.id)) {
                            associated.push({ courseName: course.name, levelId: level.id, levelName: level.name });
                        }
                    });
                }
            });
            map.set(subject.id, associated);
        });
        return map;
    }, [subjects, courses]);

    const handleSubjectToggle = (subjectId: string) => {
        setSelectedSubjectIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(subjectId)) {
                newSet.delete(subjectId);
                setCourseLevelSelections(curr => {
                    const copy = { ...curr };
                    delete copy[subjectId];
                    return copy;
                });
            } else {
                newSet.add(subjectId);
            }
            return newSet;
        });
    };
    
    const handleLevelSelectionChange = (subjectId: string, levelId: string) => {
        setCourseLevelSelections(prev => {
            const currentSelection = prev[subjectId] || [];
            const newSelection = currentSelection.includes(levelId)
                ? currentSelection.filter(id => id !== levelId)
                : [...currentSelection, levelId];
            return { ...prev, [subjectId]: newSelection };
        });
    };

    const handleGenerate = useCallback(async () => {
        if (!lecturerId || selectedSubjects.length === 0) return;
        const lecturer = (lecturers || []).find(l => l && l.id === lecturerId);
        if (!lecturer) return;

        setIsGenerating(true);
        try {
            const generatedText = selectedSubjects.length === 1 
                ? await generateJustification(lecturer, selectedSubjects[0])
                : await generateBulkJustification(lecturer, selectedSubjects);
            setJustification(generatedText || "");
        } catch (error) {
            console.error("Error generating justification:", error);
        } finally {
             setIsGenerating(false);
        }
    }, [lecturerId, selectedSubjects, lecturers]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lecturerId || selectedSubjectIds.size === 0) {
            alert("Please select a lecturer and at least one subject.");
            return;
        }
        onAssign(lecturerId, Array.from(selectedSubjectIds), priority, justification, courseLevelSelections);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">Direct Allocation</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Manual registry override</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-8 overflow-y-auto space-y-6">
                        <div>
                            <label htmlFor="lecturer-select" className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Assigned Faculty Member</label>
                            <select id="lecturer-select" value={lecturerId} onChange={e => setLecturerId(e.target.value)} className="form-select" required>
                                <option value="" disabled>Select a faculty member...</option>
                                {(lecturers || []).map(l => l && <option key={l.id} value={l.id}>{l.name} ({l.role?.replace('_',' ')})</option>)}
                            </select>
                        </div>
                        
                        <div className="space-y-3">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Target Subjects</label>
                             <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Filter subjects..." 
                                    value={subjectSearchQuery}
                                    onChange={e => setSubjectSearchQuery(e.target.value)}
                                    className="form-input pl-10 text-sm h-11"
                                />
                             </div>
                            <div className="border border-slate-100 dark:border-slate-800 rounded-3xl max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-3 space-y-1 shadow-inner">
                                {(filteredSubjects || []).map(s => {
                                     if (!s) return null;
                                     const isSelected = selectedSubjectIds.has(s.id);
                                     const isExpanded = expandedSubjectId === s.id;
                                     const levels = subjectCourseLevels.get(s.id) || [];
                                     const selectedLevelCount = (courseLevelSelections[s.id] || []).length;

                                     return (
                                        <div key={s.id} className={`rounded-2xl transition-all ${isSelected ? 'bg-white dark:bg-slate-800 shadow-md ring-2 ring-indigo-500/20' : 'hover:bg-white/50'}`}>
                                            <div className="flex items-center p-3">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => handleSubjectToggle(s.id)}
                                                    className="h-5 w-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-4 focus:ring-indigo-500/10 mr-3"
                                                />
                                                <div className="flex-grow cursor-pointer" onClick={() => handleSubjectToggle(s.id)}>
                                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{s.name}</p>
                                                    <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{s.code}</p>
                                                </div>
                                                {isSelected && levels.length > 0 && (
                                                    <button type="button" onClick={() => setExpandedSubjectId(isExpanded ? null : s.id)} className="p-2 bg-indigo-50 dark:bg-indigo-900/40 rounded-xl transition-all">
                                                        {selectedLevelCount > 0 && <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-lg mr-2 shadow-sm">{selectedLevelCount}</span>}
                                                        <ChevronDownIcon className={`w-4 h-4 text-indigo-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                                    </button>
                                                )}
                                            </div>
                                            {isExpanded && isSelected && levels.length > 0 && (
                                                <div className="px-10 pb-4 space-y-2 animate-fade-in">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Target Registry Context:</p>
                                                    {levels.map(level => (
                                                        <label key={level.levelId} className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer ${courseLevelSelections[s.id]?.includes(level.levelId) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-50 dark:border-slate-700 bg-white dark:bg-slate-900'}`}>
                                                            <input
                                                                type="checkbox"
                                                                checked={courseLevelSelections[s.id]?.includes(level.levelId) || false}
                                                                onChange={() => handleLevelSelectionChange(s.id, level.levelId)}
                                                                className="h-4 w-4 rounded border-slate-200 text-indigo-600 focus:ring-4"
                                                            />
                                                            <div className="min-w-0">
                                                                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase truncate block">{level.courseName}</span>
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{level.levelName}</p>
                                                            </div>
                                                        </label>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                     );
                                })}
                            </div>
                            <div className="flex justify-between items-center px-1">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedSubjectIds.size} Units Selected</p>
                                {selectedSubjectIds.size > 0 && <button type="button" onClick={() => setSelectedSubjectIds(new Set())} className="text-[10px] font-black uppercase text-red-500 hover:underline">Clear All</button>}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Workload Priority</label>
                                <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} className="form-select">
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                            <div className="flex flex-col justify-end">
                                <button
                                    type="button"
                                    onClick={handleGenerate}
                                    disabled={isGenerating || !lecturerId || selectedSubjectIds.size === 0}
                                    className="btn-secondary h-11 flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest border-indigo-100 text-indigo-600 disabled:opacity-50"
                                >
                                    <SparklesIcon className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                                    {isGenerating ? 'Analyzing...' : 'Neural Drafter'}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-2 ml-1">Admin Registry Notes</label>
                            <textarea
                                rows={3}
                                className="form-input resize-none p-4"
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                placeholder="Explain this manual assignment..."
                            ></textarea>
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 p-8 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary h-12 uppercase text-[10px] font-black tracking-widest bg-white">Discard</button>
                        <button type="submit" className="flex-[2] btn-primary h-12 uppercase text-[10px] font-black tracking-widest shadow-xl shadow-indigo-100">Commit to Registry</button>
                    </div>
                </form>
            </div>
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; transition: all 0.2s; }
                .btn-primary:hover:not(:disabled) { transform: translateY(-1px); filter: brightness(0.9); }
                .btn-secondary { background-color: #fff; color: #475569; font-weight: 700; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
            `}</style>
        </div>
    );
};