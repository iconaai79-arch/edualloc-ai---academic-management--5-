import React, { useState, useCallback, useMemo } from 'react';
import type { User, Subject, Priority, Course } from '../types';
import { generateBulkJustification, generateJustification } from '../services/geminiService';
import { SparklesIcon, XIcon, PlusIcon, CheckIcon, MagnifyingGlassIcon, ChevronDownIcon, UserGroupIcon, Cog8ToothIcon, ClipboardListIcon } from './icons/index';

interface DirectAssignModalProps {
    lecturers: User[];
    subjects: Subject[];
    courses: Course[];
    onClose: () => void;
    onAssign: (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections: Record<string, string[]>) => void;
}

export const DirectAssignModal: React.FC<DirectAssignModalProps> = ({ lecturers = [], subjects = [], courses = [], onClose, onAssign }) => {
    const [activeTab, setActiveTab] = useState<'subjects' | 'config'>('subjects');
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
        <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 dark:border-slate-800 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>

                {/* Header Section */}
                <div className="p-10 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40">
                            <PlusIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Direct Allocation</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Manual registry override protocol</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 group">
                        <XIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="px-10 border-b border-slate-100 dark:border-slate-800 flex gap-8 bg-slate-50/30 dark:bg-slate-900/30">
                    {(['subjects', 'config'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 pt-6 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab === 'subjects' ? <ClipboardListIcon className="w-4 h-4" /> : <Cog8ToothIcon className="w-4 h-4" />}
                            {tab === 'subjects' ? 'Subject Selection' : 'Allocation Rules'}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />
                            )}
                        </button>
                    ))}
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-10 overflow-y-auto custom-scrollbar">

                        {activeTab === 'subjects' && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between ml-1">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Available Catalog</label>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{selectedSubjectIds.size} Units Selected</p>
                                    </div>
                                    <div className="relative group">
                                        <MagnifyingGlassIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                                        <input
                                            type="text"
                                            placeholder="Search subjects by name or code..."
                                            value={subjectSearchQuery}
                                            onChange={e => setSubjectSearchQuery(e.target.value)}
                                            className="form-input pl-12 h-12 text-sm bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 rounded-2xl group-focus-within:ring-4 group-focus-within:ring-indigo-500/10"
                                        />
                                    </div>
                                    <div className="border border-slate-100 dark:border-slate-800 rounded-[2rem] max-h-80 overflow-y-auto bg-slate-50/50 dark:bg-slate-950/50 p-4 space-y-2 shadow-inner">
                                        {(filteredSubjects || []).map(s => {
                                            if (!s) return null;
                                            const isSelected = selectedSubjectIds.has(s.id);
                                            const isExpanded = expandedSubjectId === s.id;
                                            const levels = subjectCourseLevels.get(s.id) || [];
                                            const selectedLevelCount = (courseLevelSelections[s.id] || []).length;

                                            return (
                                                <div key={s.id} className={`rounded-2xl transition-all duration-300 ${isSelected ? 'bg-white dark:bg-slate-800 shadow-xl shadow-indigo-500/5 ring-1 ring-slate-200 dark:ring-slate-700' : 'hover:bg-white/50 dark:hover:bg-slate-900/50'}`}>
                                                    <div className="flex items-center p-4">
                                                        <div
                                                            onClick={() => handleSubjectToggle(s.id)}
                                                            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600 shadow-lg shadow-indigo-200' : 'border-slate-200 dark:border-slate-700'}`}
                                                        >
                                                            {isSelected && <CheckIcon className="w-4 h-4 text-white" />}
                                                        </div>
                                                        <div className="flex-grow ml-4 cursor-pointer" onClick={() => handleSubjectToggle(s.id)}>
                                                            <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{s.name}</p>
                                                            <p className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">{s.code}</p>
                                                        </div>
                                                        {isSelected && levels.length > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setExpandedSubjectId(isExpanded ? null : s.id)}
                                                                className={`p-2 rounded-xl transition-all ${isExpanded ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600'}`}
                                                            >
                                                                {selectedLevelCount > 0 && !isExpanded && <span className="text-[10px] font-black bg-white text-indigo-600 px-2 py-0.5 rounded-lg mr-2 shadow-sm">{selectedLevelCount}</span>}
                                                                <ChevronDownIcon className={`w-4 h-4 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                                                            </button>
                                                        )}
                                                    </div>
                                                    {isExpanded && isSelected && levels.length > 0 && (
                                                        <div className="px-6 pb-6 space-y-3 animate-fade-in ml-10">
                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1 border-b border-slate-50 dark:border-slate-700 pb-2">Target Registry Context:</p>
                                                            <div className="grid grid-cols-1 gap-2">
                                                                {levels.map(level => (
                                                                    <label key={level.levelId} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${courseLevelSelections[s.id]?.includes(level.levelId) ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-50 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm'}`}>
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={courseLevelSelections[s.id]?.includes(level.levelId) || false}
                                                                            onChange={() => handleLevelSelectionChange(s.id, level.levelId)}
                                                                            className="h-5 w-5 rounded-lg border-slate-200 text-indigo-600 focus:ring-4 focus:ring-indigo-500/10"
                                                                        />
                                                                        <div className="min-w-0">
                                                                            <span className="font-bold text-[11px] text-slate-700 dark:text-slate-200 uppercase truncate block">{level.courseName}</span>
                                                                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{level.levelName}</p>
                                                                        </div>
                                                                    </label>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="flex justify-end px-1">
                                        {selectedSubjectIds.size > 0 && <button type="button" onClick={() => setSelectedSubjectIds(new Set())} className="text-[10px] font-black uppercase text-red-500 hover:text-red-700 transition-colors">Reset Selections</button>}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'config' && (
                            <div className="space-y-8 animate-fade-in-up">
                                <div className="bg-slate-50 dark:bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 space-y-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1 flex items-center gap-2">
                                                <UserGroupIcon className="w-4 h-4 text-indigo-500" />
                                                Assigned Faculty Member
                                            </label>
                                            <select
                                                id="lecturer-select"
                                                value={lecturerId}
                                                onChange={e => setLecturerId(e.target.value)}
                                                className="form-select h-12 rounded-2xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm"
                                                required
                                            >
                                                <option value="" disabled>Select a faculty member...</option>
                                                {(lecturers || []).map(l => l && <option key={l.id} value={l.id}>{l.name} ({l.role?.replace('_', ' ')})</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1 flex items-center gap-2">
                                                <Cog8ToothIcon className="w-4 h-4 text-indigo-500" />
                                                Workload Priority
                                            </label>
                                            <div className="flex p-1 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                                                {(['Low', 'Medium', 'High'] as const).map((p) => (
                                                    <button
                                                        key={p}
                                                        type="button"
                                                        onClick={() => setPriority(p)}
                                                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${priority === p ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}
                                                    >
                                                        {p}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center ml-1">
                                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest">Administrative Registry Notes</label>
                                            <button
                                                type="button"
                                                onClick={handleGenerate}
                                                disabled={isGenerating || !lecturerId || selectedSubjectIds.size === 0}
                                                className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700 disabled:opacity-50 transition-all bg-white dark:bg-slate-800 px-3 py-1.5 rounded-full border border-indigo-50 shadow-sm"
                                            >
                                                <SparklesIcon className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                                                {isGenerating ? 'Analyzing...' : 'AI Neural Drafter'}
                                            </button>
                                        </div>
                                        <textarea
                                            rows={4}
                                            className="form-input resize-none p-6 text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-[2rem] shadow-sm italic leading-relaxed"
                                            value={justification}
                                            onChange={(e) => setJustification(e.target.value)}
                                            placeholder="Explain the technical or strategic rationale for this manual assignment override..."
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="bg-slate-50 dark:bg-slate-900/50 p-10 border-t border-slate-100 dark:border-slate-800 flex gap-4">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary h-14 uppercase text-[10px] font-black tracking-widest bg-white dark:bg-slate-800 rounded-2xl shadow-sm hover:translate-y-[-1px] transition-all">Discard</button>
                        {activeTab === 'subjects' ? (
                            <button
                                type="button"
                                onClick={() => setActiveTab('config')}
                                className="flex-[2] btn-primary h-14 uppercase text-[10px] font-black tracking-widest shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/20 rounded-2xl flex items-center justify-center gap-3 transition-all hover:translate-y-[-1px]"
                            >
                                Continue To Settings <PlusIcon className="w-4 h-4" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                className="flex-[2] btn-primary h-14 uppercase text-[10px] font-black tracking-widest shadow-2xl shadow-indigo-200 dark:shadow-indigo-900/20 rounded-2xl flex items-center justify-center gap-3 transition-all hover:translate-y-[-1px]"
                            >
                                Commit to Registry <CheckIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </form>
            </div>
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1.25rem; border: 1px solid #f1f5f9; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #0f172a; }
                .dark .form-input, .dark .form-select { border-color: #1e293b; background-color: #020617; color: #f1f5f9; }
                .form-input:focus, .form-select:focus { border-color: #4f46e5; outline: none; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
                .btn-primary { background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); color: #fff; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { box-shadow: 0 10px 25px -5px rgba(79, 70, 229, 0.4); }
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
            `}</style>
        </div>
    );
};