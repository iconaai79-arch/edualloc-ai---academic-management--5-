
import React, { useState, useMemo } from 'react';
import type { User, Subject, AllocationRequest, Priority, Department, Course } from '../types';
import { XIcon, MagnifyingGlassIcon, PlusIcon, ClipboardListIcon, ChevronRightIcon, CheckCircleIcon, ArrowPathIcon } from './icons/index';

interface ManageLessonsModalProps {
    teacher: User;
    subjects: Subject[];
    departments: Department[];
    allocations: AllocationRequest[];
    courses: Course[];
    onClose: () => void;
    onAssign: (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections: Record<string, string[]>) => void;
    onDeallocate: (requestId: string) => void;
    onUpdateAllocation: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
}

export const ManageLessonsModal: React.FC<ManageLessonsModalProps> = ({ teacher, subjects, departments, allocations, onClose, onAssign, onDeallocate, courses, onUpdateAllocation }) => {
    const [activeTab, setActiveTab] = useState<'available' | 'assigned'>('available');
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'subjects' | 'classes'>('subjects');
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());

    const departmentMap = useMemo(() => new Map(departments.map(d => [d.id, d.name])), [departments]);

    const { assignedSubjects, availableSubjects } = useMemo(() => {
        const assignedSubjectIds = new Set(
            allocations
                .filter(a => a.lecturerId === teacher.id && a.status === 'approved')
                .map(a => a.subjectId)
        );

        const assigned = subjects.filter(s => assignedSubjectIds.has(s.id));
        const available = (subjects || [])
            .filter(s => s && !assignedSubjectIds.has(s.id))
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()));

        return { assignedSubjects: assigned, availableSubjects: available };
    }, [allocations, subjects, teacher.id, searchTerm]);

    const subjectCourseLevels = useMemo(() => {
        if (!selectedSubject) return [];
        const associated: { courseName: string, levelId: string, levelName: string, isMapped: boolean }[] = [];
        courses.forEach(course => {
            if (course && course.departmentId === selectedSubject.departmentId) {
                (course.levels || []).forEach(level => {
                    const isMapped = (level.subjectIds || []).includes(selectedSubject.id);
                    associated.push({
                        courseName: course.name,
                        levelId: level.id,
                        levelName: level.name,
                        isMapped
                    });
                });
            }
        });
        return associated;
    }, [selectedSubject, courses]);

    const handleAssignClick = (subject: Subject) => {
        setSelectedSubject(subject);

        const defaults = new Set<string>();
        courses.forEach(course => {
            if (course.departmentId === subject.departmentId) {
                (course.levels || []).forEach(level => {
                    if ((level.subjectIds || []).includes(subject.id)) {
                        defaults.add(level.id);
                    }
                });
            }
        });

        setSelectedClassIds(defaults);
        setView('classes');
    };

    const handleDeallocateClick = (subjectId: string) => {
        const requestToDeallocate = allocations.find(a => a.lecturerId === teacher.id && a.subjectId === subjectId && a.status === 'approved');
        if (requestToDeallocate) {
            onUpdateAllocation(requestToDeallocate.id, { status: 'deallocation_pending', justification: `De-allocation requested by admin for ${teacher.name}` });
            alert("De-allocation request submitted.");
        }
    };

    const handleClassSelection = (classId: string) => {
        setSelectedClassIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(classId)) newSet.delete(classId);
            else newSet.add(classId);
            return newSet;
        });
    };

    const handleConfirmAssignment = () => {
        if (!selectedSubject) return;
        const subjectIds = [selectedSubject.id];
        const selections = { [selectedSubject.id]: Array.from(selectedClassIds) };
        onAssign(teacher.id, subjectIds, 'Medium', `Directly assigned to ${teacher.name} by admin.`, selections);

        setView('subjects');
        setSelectedSubject(null);
        setSelectedClassIds(new Set());
        setActiveTab('assigned');
    };

    const renderAvailableTab = () => (
        <div className="space-y-6 animate-fade-in-up">
            {view === 'subjects' ? (
                <>
                    <div className="relative group">
                        <MagnifyingGlassIcon className="absolute left-4 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Find subjects by name or code..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="form-input pl-12 h-12 bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 rounded-2xl group-focus-within:ring-4 group-focus-within:ring-indigo-500/10 text-sm"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-3 max-h-[45vh] overflow-y-auto pr-2 custom-scrollbar">
                        {availableSubjects.map(subject => (
                            <div key={subject.id} className="p-4 bg-white dark:bg-slate-800/50 rounded-[1.5rem] flex justify-between items-center border border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900 group transition-all shadow-sm">
                                <div>
                                    <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{subject.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{departmentMap.get(subject.departmentId)} • {subject.code}</p>
                                </div>
                                <button
                                    onClick={() => handleAssignClick(subject)}
                                    className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-indigo-600 hover:text-white active:scale-95"
                                >
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))}
                        {availableSubjects.length === 0 && (
                            <div className="text-center py-12">
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No matching subjects found</p>
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-6 rounded-[2rem] border border-indigo-100 dark:border-indigo-800">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{selectedSubject?.name}</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select target classes & groups</p>
                            </div>
                            <span className="text-[10px] font-mono font-bold text-indigo-600 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">{selectedSubject?.code}</span>
                        </div>

                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                            {subjectCourseLevels.length > 0 ? subjectCourseLevels.map(level => (
                                <label key={level.levelId} className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${selectedClassIds.has(level.levelId) ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white dark:bg-slate-900 border-slate-50 dark:border-slate-800 hover:bg-slate-50'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedClassIds.has(level.levelId)}
                                        onChange={() => handleClassSelection(level.levelId)}
                                        className="h-5 w-5 rounded-lg border-slate-200 text-white focus:ring-0"
                                    />
                                    <div>
                                        <p className="font-black text-xs uppercase tracking-tight">{level.courseName}</p>
                                        <div className="flex items-center gap-2">
                                            <p className={`text-[9px] font-bold uppercase tracking-widest ${selectedClassIds.has(level.levelId) ? 'text-indigo-200' : 'text-slate-400'}`}>{level.levelName}</p>
                                            {level.isMapped && (
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider ${selectedClassIds.has(level.levelId) ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'}`}>Official</span>
                                            )}
                                        </div>
                                    </div>
                                </label>
                            )) : (
                                <div className="text-center py-8">
                                    <p className="text-xs font-bold text-slate-500 italic">No classes available in this department.</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button onClick={() => setView('subjects')} className="flex-1 px-6 py-3 rounded-2xl bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95 shadow-sm">Back to List</button>
                        <button onClick={handleConfirmAssignment} className="flex-[2] px-6 py-3 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-800 active:scale-95 shadow-xl flex items-center justify-center gap-2">
                            Commit Assignment <CheckCircleIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );

    const renderAssignedTab = () => (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-inner">
                <div className="flex justify-between items-center mb-6 pl-1">
                    <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Active Portfolio</h4>
                    <span className="text-[10px] font-black text-slate-400 bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">{assignedSubjects.length} Units</span>
                </div>

                <div className="grid grid-cols-1 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                    {assignedSubjects.map(subject => (
                        <div key={subject.id} className="p-4 bg-white dark:bg-slate-800 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-800 group transition-all shadow-sm">
                            <div className="flex gap-4 items-center">
                                <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl flex items-center justify-center text-xs font-black">
                                    {subject.code.substring(0, 2)}
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight">{subject.name}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{departmentMap.get(subject.departmentId)}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => handleDeallocateClick(subject.id)}
                                className="p-2.5 rounded-xl bg-red-50 dark:bg-red-900/10 text-red-500 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white active:scale-95"
                            >
                                <ArrowPathIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {assignedSubjects.length === 0 && (
                        <div className="text-center py-20">
                            <ClipboardListIcon className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No active assignments</p>
                            <button onClick={() => setActiveTab('available')} className="text-[10px] font-black uppercase text-indigo-600 mt-2 hover:underline">Browse Catalog</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[300] flex items-center justify-center p-4 backdrop-blur-md" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden border border-white/20 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>

                {/* Header Section */}
                <div className="p-10 pb-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex gap-4">
                        <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-xl shadow-indigo-200 dark:shadow-indigo-900/40">
                            <ClipboardListIcon className="w-7 h-7 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Manage Load</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Portfolio for {teacher.name}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2.5 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-all active:scale-95 group">
                        <XIcon className="w-6 h-6 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200" />
                    </button>
                </div>

                {/* Tab Navigation */}
                <div className="px-10 border-b border-slate-100 dark:border-slate-800 flex gap-8 bg-slate-50/30 dark:bg-slate-900/30">
                    {(['available', 'assigned'] as const).map((tab) => (
                        <button
                            key={tab}
                            type="button"
                            onClick={() => setActiveTab(tab)}
                            className={`pb-4 pt-6 text-[10px] font-black uppercase tracking-widest transition-all relative flex items-center gap-2 ${activeTab === tab ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            {tab === 'available' ? 'Subject Catalog' : 'Current Load'}
                            {activeTab === tab && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.4)]" />
                            )}
                        </button>
                    ))}
                </div>

                {/* Content Section */}
                <div className="p-10 overflow-y-auto custom-scrollbar flex-grow">
                    {activeTab === 'available' ? renderAvailableTab() : renderAssignedTab()}
                </div>

                {/* Footer Section */}
                <div className="p-10 pt-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-10 py-4 rounded-2xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest transition-all hover:bg-slate-800 active:scale-95 shadow-xl shadow-slate-200 dark:shadow-none"
                    >
                        Review Completed
                    </button>
                </div>
            </div>

            <style>{`
                .form-input { display: block; width: 100%; border-radius: 1.25rem; border: 1px solid #f1f5f9; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); color: #0f172a; }
                .dark .form-input { border-color: #1e293b; background-color: #020617; color: #f1f5f9; }
                .form-input:focus { border-color: #4f46e5; outline: none; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; }
                @keyframes fade-in-up {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                .animate-fade-in-up { animation: fade-in-up 0.4s ease-out forwards; }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
            `}</style>
        </div>
    );
};
