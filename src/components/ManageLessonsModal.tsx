import React, { useState, useMemo } from 'react';
import type { User, Subject, AllocationRequest, Priority, Department, Course, CourseLevel } from '../types';
import { XIcon, PlusIcon, PencilIcon, BookOpenIcon, CheckIcon, MagnifyingGlassIcon, CheckCircleIcon, UserIcon, InformationCircleIcon } from './icons';

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

export const ManageLessonsModal: React.FC<ManageLessonsModalProps> = ({ 
    teacher, 
    subjects, 
    departments, 
    allocations, 
    onClose, 
    onAssign, 
    onDeallocate, 
    courses, 
    onUpdateAllocation 
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState<'overview' | 'assign_new' | 'edit_classes'>('overview');
    const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
    const [selectedClassIds, setSelectedClassIds] = useState<Set<string>>(new Set());
    const [editingRequestId, setEditingRequestId] = useState<string | null>(null);

    const departmentMap = useMemo(() => new Map((departments || []).map(d => [d.id, d.name])), [departments]);

    // Get current approved allocations for this specific teacher
    const currentTeacherAllocations = useMemo(() => {
        return (allocations || []).filter(a => a.lecturerId === teacher.id && a.status === 'approved');
    }, [allocations, teacher.id]);

    const { availableSubjects } = useMemo(() => {
        const assignedSubjectIds = new Set(currentTeacherAllocations.map(a => a.subjectId));
        const available = (subjects || [])
            .filter(s => !assignedSubjectIds.has(s.id))
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()));

        return { availableSubjects: available };
    }, [currentTeacherAllocations, subjects, searchTerm]);
    
    const subjectCourseLevels = useMemo(() => {
        const targetSubject = selectedSubject;
        if (!targetSubject) return [];
        const associated: { courseName: string, levelId: string, levelName: string }[] = [];
        (courses || []).forEach(course => {
            // Find if this course contains the subject in any level
            const isRelevant = (course.levels || []).some(level => (level.subjectIds || []).includes(targetSubject.id));
            if (isRelevant) {
                (course.levels || []).forEach(level => {
                    if ((level.subjectIds || []).includes(targetSubject.id)) {
                        associated.push({ courseName: course.name, levelId: level.id, levelName: level.name });
                    }
                });
            }
        });
        return associated;
    }, [selectedSubject, courses]);

    const handleAssignClick = (subject: Subject) => {
        setSelectedSubject(subject);
        setSelectedClassIds(new Set());
        setView('assign_new');
    };

    const handleEditClassesClick = (allocation: AllocationRequest) => {
        const subject = (subjects || []).find(s => s.id === allocation.subjectId);
        if (subject) {
            setSelectedSubject(subject);
            setEditingRequestId(allocation.id);
            setSelectedClassIds(new Set(allocation.courseLevelIds || []));
            setView('edit_classes');
        }
    };

    const handleDeallocateClick = (requestId: string) => {
        if (window.confirm("Are you sure you want to remove this subject from the teacher's workload?")) {
            onDeallocate(requestId);
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
        
        if (view === 'edit_classes' && editingRequestId) {
            onUpdateAllocation(editingRequestId, { courseLevelIds: Array.from(selectedClassIds) });
        } else {
            const subjectIds = [selectedSubject.id];
            const selections = { [selectedSubject.id]: Array.from(selectedClassIds) };
            onAssign(teacher.id, subjectIds, 'Medium', `Directly assigned by admin.`, selections);
        }
        
        resetSelection();
    };

    const resetSelection = () => {
        setView('overview');
        setSelectedSubject(null);
        setEditingRequestId(null);
        setSelectedClassIds(new Set());
    };

    const renderOverview = () => (
        <div className="flex flex-col h-full space-y-6">
            <div className="flex justify-between items-center">
                <h4 className="font-black text-xs uppercase tracking-widest text-slate-500">Currently Assigned Lessons</h4>
                <button onClick={() => setView('assign_new')} className="btn-primary text-xs flex items-center gap-1">
                    <PlusIcon className="w-4 h-4" /> New Allocation
                </button>
            </div>
            
            <div className="flex-grow overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                {currentTeacherAllocations.length > 0 ? currentTeacherAllocations.map(alloc => {
                    const subject = subjects.find(s => s.id === alloc.subjectId);
                    if (!subject) return null;
                    return (
                        <div key={alloc.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-100 dark:border-slate-700 flex justify-between items-start">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-1.5 py-0.5 rounded uppercase">{subject.code}</span>
                                    <h5 className="font-bold text-slate-900 dark:text-white">{subject.name}</h5>
                                </div>
                                <p className="text-xs text-slate-500 mb-2">{departmentMap.get(subject.departmentId)}</p>
                                <div className="flex flex-wrap gap-1">
                                    {(alloc.courseLevelIds || []).map(clId => {
                                        let label = 'Unknown Class';
                                        for (const c of (courses || [])) {
                                            const l = (c.levels || []).find(lvl => lvl.id === clId);
                                            if (l) { label = `${c.code} - ${l.name}`; break; }
                                        }
                                        return <span key={clId} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 rounded-md border border-slate-200 dark:border-slate-600">{label}</span>;
                                    })}
                                    {(alloc.courseLevelIds || []).length === 0 && <span className="text-[10px] italic text-slate-400">Assigned Globally</span>}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => handleEditClassesClick(alloc)} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit Classes">
                                    <PencilIcon className="w-4 h-4" />
                                </button>
                                <button onClick={() => handleDeallocateClick(alloc.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Remove Lesson">
                                    <XIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    );
                }) : (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-40 py-10">
                        <BookOpenIcon className="w-12 h-12 mb-2" />
                        <p className="text-sm font-bold uppercase tracking-widest">No Active Lessons</p>
                    </div>
                )}
            </div>
        </div>
    );

    const renderAssignNew = () => (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={resetSelection} className="text-slate-400 hover:text-slate-600">&larr; Back</button>
                <h4 className="font-bold text-lg">Assign New Subject</h4>
            </div>
            
            {selectedSubject ? (
                <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1">Target Unit</p>
                        <p className="font-bold text-slate-900 dark:text-white text-lg">{selectedSubject.name} ({selectedSubject.code})</p>
                    </div>
                    
                    <div className="space-y-2">
                        <label className="text-xs font-black uppercase text-slate-500 tracking-widest ml-1">Select Applicable Streams</label>
                        <div className="grid grid-cols-1 gap-2 max-h-[40vh] overflow-y-auto pr-2">
                            {subjectCourseLevels.length > 0 ? subjectCourseLevels.map(level => (
                                <label key={level.levelId} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedClassIds.has(level.levelId) ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-white dark:bg-slate-800 shadow-sm'}`}>
                                    <input
                                        type="checkbox"
                                        checked={selectedClassIds.has(level.levelId)}
                                        onChange={() => handleClassSelection(level.levelId)}
                                        className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <div>
                                        <span className="font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight">{level.courseName}</span>
                                        <p className="text-xs font-medium text-slate-500">{level.levelName}</p>
                                    </div>
                                </label>
                            )) : (
                                <div className="p-8 text-center bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-dashed">
                                    <InformationCircleIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                                    <p className="text-xs text-slate-500 italic">This unit isn't linked to any specific courses. It will be assigned to the teacher's general workload.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="pt-4 border-t mt-4">
                        <button onClick={handleConfirmAssignment} className="w-full btn-primary h-12 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100">
                            <CheckIcon className="w-5 h-5" /> Commit Allocation
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    <div className="relative mb-4">
                        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Filter institutional catalog..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="form-input pl-10 h-12"
                        />
                    </div>
                    <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2">
                        {(availableSubjects || []).map(subject => (
                            <div key={subject.id} className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 flex justify-between items-center shadow-sm hover:shadow-md transition-all group">
                                <div>
                                    <p className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{subject.name}</p>
                                    <p className="text-[10px] font-mono text-slate-500 uppercase tracking-tighter">{subject.code} • {departmentMap.get(subject.departmentId)}</p>
                                </div>
                                <button onClick={() => handleAssignClick(subject)} className="px-4 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-black uppercase tracking-widest transition-all">Assign</button>
                            </div>
                        ))}
                        {(availableSubjects || []).length === 0 && (
                            <p className="text-center py-10 text-slate-400 text-sm italic">No unassigned subjects matching your search.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );

    const renderEditClasses = () => (
        <div className="flex flex-col h-full animate-fade-in-up">
            <div className="flex items-center gap-2 mb-4">
                <button onClick={resetSelection} className="text-slate-400 hover:text-slate-600">&larr; Back</button>
                <h4 className="font-bold text-lg">Modify Stream Links</h4>
            </div>

            <div className="p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-2xl border border-indigo-100 dark:border-indigo-800 mb-6 shadow-sm">
                <p className="text-[10px] font-black uppercase text-indigo-600 tracking-widest mb-1">Active Allocation</p>
                <p className="font-bold text-slate-900 dark:text-white text-lg">{selectedSubject?.name} ({selectedSubject?.code})</p>
            </div>

            <div className="flex-grow space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                 {(subjectCourseLevels || []).map(level => (
                    <label key={level.levelId} className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedClassIds.has(level.levelId) ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 bg-white dark:bg-slate-800 shadow-sm'}`}>
                        <input
                            type="checkbox"
                            checked={selectedClassIds.has(level.levelId)}
                            onChange={() => handleClassSelection(level.levelId)}
                            className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                            <span className="font-black text-sm text-slate-800 dark:text-slate-200 uppercase tracking-tight">{level.courseName}</span>
                            <p className="text-xs font-medium text-slate-500">{level.levelName}</p>
                        </div>
                    </label>
                ))}
            </div>

            <div className="pt-6 border-t mt-4">
                <button onClick={handleConfirmAssignment} className="w-full btn-primary h-12 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100">
                    <CheckCircleIcon className="w-5 h-5" /> Persist Changes
                </button>
            </div>
        </div>
    );

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl h-[85vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                             <UserIcon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter uppercase">{teacher.name}</h3>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{teacher.role.replace('_', ' ')} • Staff ID: {teacher.staffId || 'N/A'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-grow p-8 overflow-hidden">
                    {view === 'overview' && renderOverview()}
                    {view === 'assign_new' && renderAssignNew()}
                    {view === 'edit_classes' && renderEditClasses()}
                </div>

                <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-4 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Total Load: <span className="text-indigo-600 dark:text-indigo-400 font-black">{currentTeacherAllocations.length} Active Units</span>
                    </p>
                    <button onClick={onClose} className="btn-secondary h-10 px-6 font-black text-[10px] uppercase tracking-widest">Exit Manager</button>
                </div>
            </div>
            <style>{`
                .form-input { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; }
                .dark .form-input { border-color: #334155; background-color: #0f172a; color: #fff; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; transition: all 0.2s; }
                .btn-secondary { background-color: #fff; color: #475569; font-weight: 700; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
            `}</style>
        </div>
    );
};