
import React, { useState, useEffect, useMemo } from 'react';
import type { Subject, Department, Room, Course, Institution, TimetableSettings, TimetableConstraintType, User, CourseLevel } from '../types.ts';
import { XIcon, PlusIcon, MagnifyingGlassIcon, CheckIcon, InformationCircleIcon, BookOpenIcon, BuildingOfficeIcon, RectangleStackIcon, AcademicCapIcon, ArchiveBoxIcon } from './icons/index.ts';

interface EditSubjectModalProps {
    subject: Subject;
    departments: Department[];
    rooms: Room[];
    courses: Course[];
    onClose: () => void;
    onSave: (subjectId: string, data: Partial<Omit<Subject, 'id' | 'institutionId'>>, initialCourseLevelIds?: string[]) => void;
    onAssociateSubjectToCourseLevel: (subjectId: string, courseLevelId: string) => void;
    onDisassociateSubjectFromCourseLevel: (subjectId: string, courseLevelId: string) => void;
    currentInstitution?: Institution | null;
    timetableSettings: TimetableSettings;
    onSaveTimetableSettings: (settings: TimetableSettings) => void;
    subjects: Subject[];
    onDeleteSubject?: (subjectId: string) => void;
    currentUser: User;
    onUpdateCourse?: (courseId: string, data: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
}

export const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
    subject, departments, rooms, courses, onClose, onSave,
    onAssociateSubjectToCourseLevel, onDisassociateSubjectFromCourseLevel,
    currentInstitution, timetableSettings, onSaveTimetableSettings, subjects,
    onDeleteSubject, currentUser, onUpdateCourse
}) => {
    const isNew = !subject.id;
    const [formData, setFormData] = useState({ ...subject });
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [selectedLevelId, setSelectedLevelId] = useState('');
    const [courseSearchQuery, setCourseSearchQuery] = useState('');
    const [pendingLevelIds, setPendingLevelIds] = useState<string[]>([]);

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
    const isRestrictedToDept = currentUser.role === 'tto' && !!currentUser.departmentId;

    useEffect(() => {
        setFormData({
            ...subject,
            lessonStructure: Array.isArray(subject.lessonStructure) ? subject.lessonStructure : [],
        });
    }, [subject]);

    useEffect(() => {
        const course = (courses || []).find(c => c && c.id === selectedCourseId);
        if (course && (course.levels || []).length === 1 && course.levels[0]) {
            setSelectedLevelId(course.levels[0].id);
        } else {
            setSelectedLevelId('');
        }
    }, [selectedCourseId, courses]);

    const associatedCourses = useMemo(() => {
        const associations: { courseName: string, levelName: string, courseId: string, levelId: string, isPending: boolean, courseCode?: string }[] = [];
        (courses || []).forEach(course => {
            if (!course) return;
            (course.levels || []).forEach(level => {
                if (!level) return;
                if ((level.subjectIds || []).includes(subject.id)) {
                    associations.push({
                        courseName: course.name,
                        levelName: level.name,
                        courseId: course.id,
                        levelId: level.id,
                        isPending: false,
                        courseCode: course.code
                    });
                }
            });
        });
        (pendingLevelIds || []).forEach(pId => {
            (courses || []).forEach(course => {
                if (!course) return;
                (course.levels || []).forEach(level => {
                    if (level && level.id === pId) {
                        associations.push({
                            courseName: course.name,
                            levelName: level.name,
                            courseId: course.id,
                            levelId: level.id,
                            isPending: true,
                            courseCode: course.code
                        });
                    }
                });
            });
        });
        return associations;
    }, [courses, subject.id, pendingLevelIds]);

    const availableCoursesForAssociation = useMemo(() => {
        let available = isSchool ? (courses || []) : (courses || []).filter(c => c && c.departmentId === (formData.departmentId || subject.departmentId));
        if (courseSearchQuery.trim()) {
            const query = courseSearchQuery.toLowerCase();
            available = (available || []).filter(c => 
                c && (c.name.toLowerCase().includes(query) || (c.code || "").toLowerCase().includes(query))
            );
        }
        return available || [];
    }, [courses, subject.departmentId, formData.departmentId, isSchool, courseSearchQuery]);

    const levelsForSelectedCourse = useMemo(() => {
        if (!selectedCourseId) return [];
        const course = (courses || []).find(c => c && c.id === selectedCourseId);
        return (course?.levels || []);
    }, [selectedCourseId, courses]);

    const handleAddAssociation = () => {
        if (!selectedCourseId) return;
        const course = (courses || []).find(c => c && c.id === selectedCourseId);
        if (!course || (course.levels || []).length === 0) return;
        const levelId = selectedLevelId || (course.levels[0] ? course.levels[0].id : '');
        if (!levelId) return;
        if (isNew) {
            if (!pendingLevelIds.includes(levelId)) setPendingLevelIds(prev => [...prev, levelId]);
        } else {
            onAssociateSubjectToCourseLevel(subject.id, levelId);
        }
        setSelectedCourseId('');
        setSelectedLevelId('');
        setCourseSearchQuery('');
    };

    const handleRemoveAssociation = (levelId: string) => {
        if (isNew) setPendingLevelIds(prev => prev.filter(id => id !== levelId));
        else onDisassociateSubjectFromCourseLevel(subject.id, levelId);
    };

    const handleAddDefaultStream = async (courseId: string) => {
        const course = (courses || []).find(c => c && c.id === courseId);
        if (course && onUpdateCourse) {
            const defaultLevel: CourseLevel = { id: `cl_${Date.now()}`, name: 'Main Stream', subjectIds: [] };
            await onUpdateCourse(courseId, { levels: [defaultLevel] });
            setSelectedCourseId(courseId);
            setSelectedLevelId(defaultLevel.id);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleStructureChange = (index: number, field: 'count' | 'periods' | 'dedicatedRoomId', value: string) => {
        const newStructure = [...formData.lessonStructure];
        if (field === 'dedicatedRoomId') {
            newStructure[index] = { ...newStructure[index], dedicatedRoomId: value || undefined };
        } else {
            const numValue = parseInt(value, 10);
            newStructure[index] = { ...newStructure[index], [field]: isNaN(numValue) || numValue < 1 ? 1 : numValue };
        }
        setFormData({ ...formData, lessonStructure: newStructure });
    };

    const addStructure = () => {
        setFormData(prev => ({
            ...prev,
            lessonStructure: [...prev.lessonStructure, { count: 1, periods: 1 }]
        }));
    };

    const removeStructure = (index: number) => {
        setFormData(prev => ({
            ...prev,
            lessonStructure: prev.lessonStructure.filter((_, i) => i !== index)
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(subject.id, formData, pendingLevelIds);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
                            <BookOpenIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter leading-tight">
                                {isNew ? 'New Subject Unit' : `Modify Unit: ${subject.code}`}
                            </h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Curriculum Definitions & Registry Mapping</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <XIcon className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-8 overflow-y-auto space-y-10">
                        {/* Section 1: Basic Identity */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            <div className="lg:col-span-4 space-y-1">
                                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight">Core Identity</h4>
                                <p className="text-xs text-slate-500">Standard institutional identifiers for this unit.</p>
                            </div>
                            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Official Descriptive Title</label>
                                    <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="form-input-clean text-lg font-bold" placeholder="e.g. Theoretical Physics" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Registry Code</label>
                                    <input type="text" name="code" value={formData.code || ''} onChange={handleChange} className="form-input-clean font-mono font-black text-indigo-600" placeholder="PHY101" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Shorthand Label</label>
                                    <input type="text" name="shortName" value={formData.shortName || ''} onChange={handleChange} className="form-input-clean" placeholder="Physics" />
                                </div>
                                {!isSchool && (
                                    <div className="sm:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1.5 ml-1">Parent Department</label>
                                        <select name="departmentId" value={formData.departmentId || ''} onChange={handleChange} className="form-select-clean" required disabled={isRestrictedToDept}>
                                            <option value="" disabled>-- Assign Department --</option>
                                            {(departments || []).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Section 2: Instruction Matrix */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-10 border-t border-slate-100 dark:border-slate-800">
                            <div className="lg:col-span-4 space-y-1">
                                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight">Instruction Matrix</h4>
                                <p className="text-xs text-slate-500">Weekly period load and facility requirements.</p>
                            </div>
                            <div className="lg:col-span-8 space-y-3">
                                {(formData.lessonStructure || []).map((ls, index) => (
                                    <div key={index} className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-indigo-200 group">
                                        <div className="flex items-center gap-2 bg-white dark:bg-slate-700 p-1.5 rounded-xl border">
                                            <input type="number" min="1" value={ls.count} onChange={e => handleStructureChange(index, 'count', e.target.value)} className="w-10 text-center font-black text-indigo-600 bg-transparent outline-none text-sm" />
                                            <span className="text-[10px] font-black text-slate-300">x</span>
                                            <input type="number" min="1" value={ls.periods} onChange={e => handleStructureChange(index, 'periods', e.target.value)} className="w-10 text-center font-black text-indigo-600 bg-transparent outline-none text-sm" />
                                            <span className="text-[9px] font-black uppercase text-slate-400 pr-2">Periods</span>
                                        </div>
                                        <div className="flex-grow min-w-[200px]">
                                            <select value={ls.dedicatedRoomId || ''} onChange={e => handleStructureChange(index, 'dedicatedRoomId', e.target.value)} className="form-select-clean-sm w-full text-[11px] font-bold">
                                                <option value="">Dynamic Room Assignment</option>
                                                {(rooms || []).map(r=><option key={r.id} value={r.id}>{r.name} ({r.capacity})</option>)}
                                            </select>
                                        </div>
                                        <button type="button" onClick={() => removeStructure(index)} className="p-2 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                                            <XIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                ))}
                                <button type="button" onClick={addStructure} className="w-full py-3 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all flex items-center justify-center gap-2">
                                    <PlusIcon className="w-4 h-4" /> Add Instructional Layer
                                </button>
                            </div>
                        </div>

                        {/* Section 3: Registry Links */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-10 border-t border-slate-100 dark:border-slate-800">
                            <div className="lg:col-span-4 space-y-1">
                                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight">Active Stream Links</h4>
                                <p className="text-xs text-slate-500">Which specific grades or courses study this unit.</p>
                            </div>
                            <div className="lg:col-span-8 space-y-6">
                                <div className="flex flex-wrap gap-2">
                                    {associatedCourses.map((assoc, i) => (
                                        <div key={i} className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all ${assoc.isPending ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
                                            <span className="text-[10px] font-black uppercase tracking-tight">{assoc.courseCode || assoc.courseName} &rarr; {assoc.levelName}</span>
                                            <button type="button" onClick={() => handleRemoveAssociation(assoc.levelId)} className="text-slate-400 hover:text-red-500"><XIcon className="w-3.5 h-3.5" /></button>
                                        </div>
                                    ))}
                                    {associatedCourses.length === 0 && <p className="text-xs text-slate-400 italic">No registry links established.</p>}
                                </div>
                                
                                <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-[2rem] border border-slate-100 dark:border-slate-800">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                                        <div>
                                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1">Search Registry</label>
                                            <div className="relative mb-2">
                                                <MagnifyingGlassIcon className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                                                <input type="text" placeholder="Grade/Course..." value={courseSearchQuery} onChange={(e) => setCourseSearchQuery(e.target.value)} className="form-input-clean-sm pl-9" />
                                            </div>
                                            <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="form-select-clean-sm">
                                                <option value="">-- Choose {isSchool ? 'Grade' : 'Course'} --</option>
                                                {availableCoursesForAssociation.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                        <div className="flex flex-col h-full">
                                            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1">Specific Stream</label>
                                            {selectedCourseId && levelsForSelectedCourse.length === 0 ? (
                                                <button type="button" onClick={() => handleAddDefaultStream(selectedCourseId)} className="flex-grow bg-white dark:bg-slate-800 border-2 border-dashed border-amber-200 text-amber-600 rounded-xl text-[10px] font-black uppercase hover:bg-amber-50 transition-all">+ Initialize Stream</button>
                                            ) : (
                                                <select value={selectedLevelId} onChange={e => setSelectedLevelId(e.target.value)} className="form-select-clean-sm" disabled={!selectedCourseId}>
                                                    <option value="">-- Choose {isSchool ? 'Stream' : 'Level'} --</option>
                                                    {levelsForSelectedCourse.map(l => l && <option key={l.id} value={l.id}>{l.name}</option>)}
                                                </select>
                                            )}
                                        </div>
                                        <div className="sm:col-span-2">
                                            <button type="button" onClick={handleAddAssociation} disabled={!selectedCourseId} className="w-full h-11 bg-slate-900 dark:bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg disabled:opacity-30">Link to Stream</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 4: Objectives */}
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 pt-10 border-t border-slate-100 dark:border-slate-800">
                            <div className="lg:col-span-4 space-y-1">
                                <h4 className="text-sm font-black uppercase text-slate-900 dark:text-white tracking-tight">Learning Outcomes</h4>
                                <p className="text-xs text-slate-500">A brief summary of the instructional goals.</p>
                            </div>
                            <div className="lg:col-span-8">
                                <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={4} className="form-input-clean min-h-[120px] resize-none" placeholder="Primary learning objectives..." required />
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-8 py-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center flex-shrink-0">
                        <div>
                             {!isNew && onDeleteSubject && (
                                <button type="button" onClick={() => onDeleteSubject(subject.id)} className="text-[10px] font-black uppercase text-red-500 hover:underline flex items-center gap-2">
                                    <ArchiveBoxIcon className="w-4 h-4" /> Purge Records
                                </button>
                             )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-slate-700 transition-all">Discard</button>
                            <button type="submit" className="btn-primary h-12 px-10 shadow-indigo-200">Commit to Registry</button>
                        </div>
                    </div>
                </form>
            </div>
            <style>{`
                .form-input-clean { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #f8fafc; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
                .dark .form-input-clean { border-color: #334155; background-color: #0f172a; color: white; }
                .form-input-clean:focus { border-color: #4f46e5; background-color: white; box-shadow: 0 0 0 4px rgba(79, 70, 229, 0.1); }
                
                .form-input-clean-sm { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; background-color: white; font-size: 0.75rem; transition: all 0.2s; outline: none; }
                .dark .form-input-clean-sm { border-color: #334155; background-color: #1e293b; color: white; }

                .form-select-clean { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #f8fafc; font-size: 0.875rem; transition: all 0.2s; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 1rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; outline: none; }
                .dark .form-select-clean { border-color: #334155; background-color: #0f172a; color: white; }

                .form-select-clean-sm { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.5rem 0.75rem; background-color: white; font-size: 0.75rem; transition: all 0.2s; appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.75rem center; background-repeat: no-repeat; background-size: 1.25em 1.25em; padding-right: 2.25rem; outline: none; }
                .dark .form-select-clean-sm { border-color: #334155; background-color: #1e293b; color: white; }
            `}</style>
        </div>
    );
};
