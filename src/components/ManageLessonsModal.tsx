
import React, { useState, useMemo } from 'react';
import type { User, Subject, AllocationRequest, Priority, Department, Course } from '../types';
import { XIcon } from './icons';

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
        const available = subjects
            .filter(s => !assignedSubjectIds.has(s.id))
            .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.code.toLowerCase().includes(searchTerm.toLowerCase()));

        return { assignedSubjects: assigned, availableSubjects: available };
    }, [allocations, subjects, teacher.id, searchTerm]);
    
    const subjectCourseLevels = useMemo(() => {
        if (!selectedSubject) return [];
        const associated: { courseName: string, levelId: string, levelName: string }[] = [];
        courses.forEach(course => {
            if (course.departmentId === selectedSubject.departmentId) {
                course.levels.forEach(level => {
                    if (level.subjectIds.includes(selectedSubject.id)) {
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
        setView('classes');
    };

    const handleDeallocateClick = (subjectId: string) => {
        const requestToDeallocate = allocations.find(a => a.lecturerId === teacher.id && a.subjectId === subjectId && a.status === 'approved');
        if (requestToDeallocate) {
            onUpdateAllocation(requestToDeallocate.id, { status: 'deallocation_pending', justification: `De-allocation requested by admin for ${teacher.name}` });
        }
    };
    
    const handleClassSelection = (classId: string) => {
        setSelectedClassIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(classId)) {
                newSet.delete(classId);
            } else {
                newSet.add(classId);
            }
            return newSet;
        });
    };

    const handleConfirmAssignment = () => {
        if (!selectedSubject) return;
        // Wrap single subject in array and create selection map
        const subjectIds = [selectedSubject.id];
        const selections = { [selectedSubject.id]: Array.from(selectedClassIds) };
        onAssign(teacher.id, subjectIds, 'Medium', `Directly assigned to ${teacher.name} by admin.`, selections);
        
        setView('subjects');
        setSelectedSubject(null);
        setSelectedClassIds(new Set());
    };

    const renderSubjectsView = () => (
        <div className="flex flex-col h-full">
            <h4 className="font-semibold mb-2">Available Subjects ({availableSubjects.length})</h4>
            <input
                type="text"
                placeholder="Search subjects..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="form-input mb-4"
            />
            <ul className="space-y-2 overflow-y-auto flex-grow">
                {availableSubjects.map(subject => (
                    <li key={subject.id} className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md flex justify-between items-center text-sm">
                        <div>
                            <p className="font-semibold">{subject.name}</p>
                            <p className="text-xs text-slate-500">{departmentMap.get(subject.departmentId)}</p>
                        </div>
                        <button onClick={() => handleAssignClick(subject)} className="btn-secondary text-xs">Assign</button>
                    </li>
                ))}
            </ul>
        </div>
    );

    const renderClassesView = () => (
        <div className="flex flex-col h-full">
            <h4 className="font-semibold mb-2">Select Classes for {selectedSubject?.name}</h4>
            <p className="text-sm text-slate-500 mb-4">Choose which classes/streams {teacher.name.split(' ')[0]} will teach for this subject.</p>
            <div className="space-y-2 overflow-y-auto flex-grow bg-slate-100 dark:bg-slate-900/30 p-2 rounded-md">
                {subjectCourseLevels.length > 0 ? subjectCourseLevels.map(level => (
                    <label key={level.levelId} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-700 rounded-md cursor-pointer hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={selectedClassIds.has(level.levelId)}
                            onChange={() => handleClassSelection(level.levelId)}
                            className="h-5 w-5 rounded border-slate-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                        />
                        <span className="font-medium text-sm">{level.courseName} - {level.levelName}</span>
                    </label>
                )) : (
                    <p className="text-sm text-center text-slate-500 py-4">No specific classes found for this subject. It will be assigned generally.</p>
                )}
            </div>
            <div className="mt-4 flex justify-between items-center">
                <button onClick={() => setView('subjects')} className="btn-secondary">Back to Subjects</button>
                <button onClick={handleConfirmAssignment} className="btn-primary">Confirm Assignment</button>
            </div>
        </div>
    );


    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-4xl h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold">Manage Lessons for {teacher.name}</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700"><XIcon className="w-6 h-6" /></button>
                </div>

                <div className="flex-grow p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden">
                    {view === 'subjects' ? renderSubjectsView() : renderClassesView()}
                    
                    <div className="flex flex-col">
                        <h4 className="font-semibold mb-2">Assigned Subjects ({assignedSubjects.length})</h4>
                        <ul className="space-y-2 overflow-y-auto flex-grow bg-slate-100 dark:bg-slate-900/50 p-4 rounded-md">
                            {assignedSubjects.map(subject => (
                                <li key={subject.id} className="p-3 bg-white dark:bg-slate-700 rounded-md flex justify-between items-center text-sm shadow-sm">
                                    <div>
                                        <p className="font-semibold">{subject.name}</p>
                                        <p className="text-xs text-slate-500">{departmentMap.get(subject.departmentId)}</p>
                                    </div>
                                    <button onClick={() => handleDeallocateClick(subject.id)} className="btn-danger text-xs">De-allocate</button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-700/50 px-4 py-3 sm:px-6 flex flex-row-reverse">
                    <button onClick={onClose} className="btn-primary">Done</button>
                </div>
            </div>
            <style>{`
                .form-input { display: block; width: 100%; border-radius: 0.375rem; border: 1px solid #d1d5db; padding: 0.5rem 0.75rem; background-color: white; }
                .dark .form-input { border-color: #4b5563; background-color: #374151; color: white; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #e5e7eb; color: #1f2937; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-secondary { background-color: #4b5563; color: #e5e7eb; }
                .btn-danger { padding: 0.5rem 1rem; background-color: #fee2e2; color: #b91c1c; border-radius: 0.375rem; font-weight: 500; border: none; cursor: pointer; }
                .dark .btn-danger { background-color: #450a0a; color: #fecaca; }
            `}</style>
        </div>
    );
};
