
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Subject, Department, Room, Course, Institution, TimetableSettings, TimetableConstraint, TimetableConstraintType, User, CourseLevel } from '../types.ts';
import { XIcon, PlusIcon, MagnifyingGlassIcon, CheckIcon, InformationCircleIcon } from './icons/index.ts';

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

const CONSTRAINT_TYPE_LABELS: Record<TimetableConstraintType, string> = {
    consecutive_subjects: 'Subjects must be consecutive',
    same_day_subjects: 'Subjects must be on the same day',
    same_day_must_subjects: 'Subjects must be on the same day (strict)',
    no_break_between_subjects: 'No break between subjects',
    subject_time_off: 'Subject has time off / specific time',
    non_consecutive_subjects: 'Subjects cannot be consecutive on the same day',
    different_day_subjects: 'Subjects must be on different days',
    same_time_subjects: 'Subjects taught simultaneously (Option Block)'
};

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
    
    // For new subjects, we store associations locally until the subject is created
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
        const associations: { courseName: string, levelName: string, courseId: string, levelId: string, isPending: boolean }[] = [];
        
        // 1. Add existing associations from the DB
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
                        isPending: false
                    });
                }
            });
        });

        // 2. Add pending associations from local state
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
                            isPending: true
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
                c && (c.name.toLowerCase().includes(query) || c.code.toLowerCase().includes(query))
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
        if (!selectedCourseId) {
            alert('Please select a grade/course first.');
            return;
        }

        const course = (courses || []).find(c => c && c.id === selectedCourseId);
        if (!course || (course.levels || []).length === 0) {
            alert('This grade has no streams configured. Please initialize a stream first.');
            return;
        }

        const levelId = selectedLevelId || (course.levels[0] ? course.levels[0].id : '');
        
        if (!levelId) {
            alert("No valid stream found.");
            return;
        }

        if (isNew) {
            if (!pendingLevelIds.includes(levelId)) {
                setPendingLevelIds(prev => [...prev, levelId]);
            }
        } else {
            onAssociateSubjectToCourseLevel(subject.id, levelId);
        }

        setSelectedCourseId('');
        setSelectedLevelId('');
        setCourseSearchQuery('');
    };

    const handleRemoveAssociation = (levelId: string) => {
        if (isNew) {
            setPendingLevelIds(prev => prev.filter(id => id !== levelId));
        } else {
            onDisassociateSubjectFromCourseLevel(subject.id, levelId);
        }
    };

    const handleAddDefaultStream = async (courseId: string) => {
        const course = (courses || []).find(c => c && c.id === courseId);
        if (course && onUpdateCourse) {
            const defaultLevel: CourseLevel = {
                id: `cl_${Date.now()}`,
                name: 'Main Stream',
                subjectIds: []
            };
            await onUpdateCourse(courseId, { levels: [defaultLevel] });
            setSelectedCourseId(courseId); // Refresh selection
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
        <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">
                            {isNew ? 'Define New Unit' : `Edit Unit: ${subject.code}`}
                        </h3>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Curriculum Management</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-8 space-y-6 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Official Name</label>
                                    <input type="text" name="name" value={formData.name || ''} onChange={handleChange} className="form-input" placeholder="e.g. Integral Calculus" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Subject Code</label>
                                    <input type="text" name="code" value={formData.code || ''} onChange={handleChange} className="form-input font-mono font-bold text-indigo-600 dark:text-indigo-400" placeholder="MATH101" required />
                                </div>
                            </div>
                            
                            <div className="space-y-4">
                                {!isSchool && (
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Academic Department</label>
                                        <select name="departmentId" value={formData.departmentId || ''} onChange={handleChange} className="form-select" required disabled={isRestrictedToDept}>
                                            <option value="" disabled>-- Select Department --</option>
                                            {(departments || []).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                )}
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Short Label</label>
                                    <input type="text" name="shortName" value={formData.shortName || ''} onChange={handleChange} className="form-input" placeholder="Calculus" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
                             <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-3 ml-1">Associated {isSchool ? 'Grades & Streams' : 'Courses & Levels'}</h4>
                             {associatedCourses.length > 0 ? (
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {associatedCourses.map((assoc, i) => (
                                        <span key={i} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${assoc.isPending ? 'bg-amber-50 border-amber-200 text-amber-600' : 'bg-indigo-50 border-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:border-indigo-800 dark:text-indigo-400'}`}>
                                            {assoc.courseName} - {assoc.levelName}
                                            <button type="button" onClick={() => handleRemoveAssociation(assoc.levelId)} className="hover:text-red-500 transition-colors"><XIcon className="w-3 h-3" /></button>
                                        </span>
                                    ))}
                                </div>
                             ) : <p className="mb-4 text-xs text-slate-500 italic">No associations defined yet.</p>}
                             
                            <div className="bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4">Link to Registry</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">Search {isSchool ? 'Grade' : 'Course'}</label>
                                        <input 
                                            type="text" 
                                            placeholder="Type to filter..."
                                            value={courseSearchQuery}
                                            onChange={(e) => setCourseSearchQuery(e.target.value)}
                                            className="form-input text-xs mb-2"
                                        />
                                        <select value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)} className="form-select text-sm">
                                            <option value="">-- Select {isSchool ? 'Grade' : 'Course'} --</option>
                                            {availableCoursesForAssociation.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="flex flex-col">
                                        <label className="block text-[9px] font-black text-slate-500 uppercase mb-1">{isSchool ? 'Stream' : 'Level'}</label>
                                        {selectedCourseId && levelsForSelectedCourse.length === 0 ? (
                                            <button type="button" onClick={() => handleAddDefaultStream(selectedCourseId)} className="flex-grow border-2 border-dashed rounded-xl text-[10px] font-black uppercase text-amber-600 hover:bg-amber-50 transition-all">+ Add Stream</button>
                                        ) : (
                                            <select value={selectedLevelId} onChange={e => setSelectedLevelId(e.target.value)} className="form-select text-sm" disabled={!selectedCourseId}>
                                                <option value="">-- Choose {isSchool ? 'Stream' : 'Level'} --</option>
                                                {levelsForSelectedCourse.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                            </select>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    type="button" 
                                    onClick={handleAddAssociation} 
                                    disabled={!selectedCourseId || (levelsForSelectedCourse.length > 0 && !selectedLevelId)}
                                    className="mt-4 w-full btn-primary h-11 shadow-lg disabled:opacity-50"
                                >
                                    Add Registry Link
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Weekly Lesson Configuration</label>
                            <div className="grid grid-cols-1 gap-3">
                                {(formData.lessonStructure || []).map((ls, index) => (
                                    <div key={index} className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                                        <div className="flex items-center gap-3">
                                            <input type="number" min="1" value={ls.count} onChange={e => handleStructureChange(index, 'count', e.target.value)} className="w-14 text-center font-bold bg-white dark:bg-slate-700 rounded-lg p-1.5 border" />
                                            <span className="text-[10px] font-black text-slate-300">X</span>
                                            <input type="number" min="1" value={ls.periods} onChange={e => handleStructureChange(index, 'periods', e.target.value)} className="w-14 text-center font-bold bg-white dark:bg-slate-700 rounded-lg p-1.5 border" />
                                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Periods</span>
                                        </div>
                                        <div className="flex-grow">
                                            <select value={ls.dedicatedRoomId || ''} onChange={e => handleStructureChange(index, 'dedicatedRoomId', e.target.value)} className="form-select w-full text-xs py-1.5">
                                                <option value="">Auto-Assign Room</option>
                                                {(rooms || []).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        </div>
                                        <button type="button" onClick={() => removeStructure(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors"><XIcon className="w-5 h-5" /></button>
                                    </div>
                                ))}
                                <button type="button" onClick={addStructure} className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 hover:border-indigo-200 transition-all flex items-center justify-center gap-2">
                                    <PlusIcon className="w-4 h-4" /> Add Structured Session
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Learning Description</label>
                            <textarea name="description" value={formData.description || ''} onChange={handleChange} rows={3} className="form-input resize-none" placeholder="Key learning outcomes..." required />
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-5 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
                        <div>
                             {!isNew && onDeleteSubject && (
                                <button type="button" onClick={() => onDeleteSubject(subject.id)} className="text-[10px] font-black uppercase text-red-500 hover:underline transition-all">Purge Unit</button>
                             )}
                        </div>
                        <div className="flex items-center gap-3">
                            <button type="button" onClick={onClose} className="btn-secondary h-12 px-6">Discard</button>
                            <button type="submit" className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Save Unit Records</button>
                        </div>
                    </div>
                </form>
            </div>
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 1rem; border: 1px solid #e2e8f0; padding: 0.75rem 1rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .btn-primary { background-color: #4f46e5; color: #fff; font-weight: 700; padding: 0.5rem 1.5rem; border-radius: 0.75rem; border: none; cursor: pointer; transition: all 0.2s; }
                .btn-secondary { background-color: #fff; color: #475569; font-weight: 700; padding: 0.5rem 1rem; border-radius: 0.75rem; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
            `}</style>
        </div>
    );
};
