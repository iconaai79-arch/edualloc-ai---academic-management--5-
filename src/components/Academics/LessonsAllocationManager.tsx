import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Institution, User, Subject, Course } from '../../types';
import { UserGroupIcon } from '../icons/UserGroupIcon';
import { PlusIcon } from '../icons/PlusIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { SparklesIcon } from '../icons/SparklesIcon';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { BookOpenIcon } from '../icons/BookOpenIcon';
import { BuildingOfficeIcon } from '../icons/BuildingOfficeIcon';
import { RectangleStackIcon } from '../icons/RectangleStackIcon';
import { apiService } from '../../services/apiService';
import { isSubjectApplicableToClass } from '../ClassSubjectAllocationModal';

export interface SubjectAllocationRecord {
    id: string;
    institutionId: string;
    className: string; // e.g. Form 1 North, Form 3 Central
    subjectName: string; // e.g. Mathematics, English
    subjectCode?: string;
    teacherId?: string; // User ID
    teacherName?: string;
    lessonsPerWeek: number; // e.g. 6
    room?: string;
    status: 'allocated' | 'unassigned';
}

interface LessonsAllocationManagerProps {
    currentInstitution: Institution;
    users: User[];
    subjects: Subject[];
    courses?: Course[];
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    onDeleteSubject?: (subjectId: string) => void;
}

export const LessonsAllocationManager: React.FC<LessonsAllocationManagerProps> = ({
    currentInstitution,
    users = [],
    subjects = [],
    courses = [],
    onUpdateSubject,
    onDeleteSubject
}) => {
    const [viewMode, setViewMode] = useState<'per_class' | 'per_teacher' | 'matrix'>('per_class');
    // Dynamically compute registered classes from all available sources
    const classOptions = useMemo(() => {
        const set = new Set<string>();

        // 1. From courses prop
        if (courses && courses.length > 0) {
            courses.forEach(c => {
                const name = typeof c === 'string' ? c : (c.name || (c as any).title || c.code);
                if (name) set.add(name);
            });
        }

        // 2. From users prop
        if (users && users.length > 0) {
            users.forEach(u => {
                const cl = (u as any).studentClass || (u as any).classLevel || (u as any).class_name || (u as any).class;
                if (cl && typeof cl === 'string' && cl.trim()) {
                    set.add(cl.trim());
                }
            });
        }

        // 3. From currentInstitution properties
        if (currentInstitution) {
            if ((currentInstitution as any).classes && Array.isArray((currentInstitution as any).classes)) {
                (currentInstitution as any).classes.forEach((c: any) => {
                    const name = typeof c === 'string' ? c : c.name;
                    if (name) set.add(name);
                });
            }
            if ((currentInstitution as any).courses && Array.isArray((currentInstitution as any).courses)) {
                (currentInstitution as any).courses.forEach((c: any) => {
                    const name = typeof c === 'string' ? c : (c.name || c.title);
                    if (name) set.add(name);
                });
            }
        }

        // 4. From LocalStorage cached registered classes
        try {
            const instId = currentInstitution?.id || 'default_inst';
            const savedClasses = localStorage.getItem(`eduai_registered_classes_${instId}`);
            if (savedClasses) {
                const parsed = JSON.parse(savedClasses);
                if (Array.isArray(parsed)) parsed.forEach(c => set.add(c));
            }
        } catch(e) {}

        // 5. Fallback defaults if no custom classes registered
        if (set.size === 0) {
            const isPrimary = (currentInstitution?.institutionType || '').toLowerCase().includes('primary') || (currentInstitution?.name || '').toLowerCase().includes('primary');
            if (isPrimary) {
                ['Grade 1 Central', 'Grade 2 Central', 'Grade 3 Central', 'Grade 4 Central', 'Grade 5 Central', 'Grade 6 Central', 'Grade 7 Central'].forEach(c => set.add(c));
            } else {
                ['Form 1 Central', 'Form 2 Central', 'Form 3 Central', 'Form 4 Central'].forEach(c => set.add(c));
            }
        }

        const standaloneStreams = new Set(['east', 'west', 'north', 'south', 'central', 'red', 'blue', 'green', 'yellow', 'stream a', 'stream b', 'stream c']);
        return Array.from(set).filter(cName => !standaloneStreams.has(cName.trim().toLowerCase()));
    }, [courses, users, currentInstitution]);

    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [saveToast, setSaveToast] = useState<string | null>(null);
    const [isAddAllocationModalOpen, setIsAddAllocationModalOpen] = useState(false);

    // Form modal state
    const [modalClassName, setModalClassName] = useState('');
    const [modalSubjectName, setModalSubjectName] = useState('Mathematics');
    const [modalTeacherId, setModalTeacherId] = useState('');
    const [modalLessons, setModalLessons] = useState(6);

    // List of teachers
    const teacherUsers = useMemo(() => {
        const list = users.filter(u => u.role === 'teacher' || u.role === 'lecturer' || u.role === 'admin' || u.role === 'academics_officer');
        if (list.length > 0) return list;
        return [
            { id: 't_1', name: 'Mr. Justus (Maths)', email: 'justus@school.com', role: 'teacher' as const },
            { id: 't_2', name: 'Mdm. Faith Kanguha', email: 'faith@school.com', role: 'teacher' as const },
            { id: 't_3', name: 'Chome Ngala', email: 'chome@school.com', role: 'teacher' as const },
            { id: 't_4', name: 'Mdm Romana', email: 'romana@school.com', role: 'teacher' as const },
        ];
    }, [users]);

    // List of available subjects
    const subjectList = useMemo(() => {
        if (subjects.length > 0) return subjects.map(s => s.name);
        return ['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'CRE', 'Computer Studies', 'Business Studies', 'Agriculture'];
    }, [subjects]);

    // Helper to get applicable subjects for any given class name
    const getApplicableSubjectsForClass = useCallback((clsName: string) => {
        if (!clsName) return [];
        
        if (subjects && subjects.length > 0) {
            const applicable = subjects.filter(s => {
                const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;
                if (Array.isArray(targetCls) && targetCls.length > 0) {
                    return targetCls.some((c: string) => 
                        c.toLowerCase().trim() === clsName.toLowerCase().trim() ||
                        clsName.toLowerCase().trim().startsWith(c.toLowerCase().trim()) ||
                        c.toLowerCase().trim().startsWith(clsName.toLowerCase().trim())
                    );
                }
                return isSubjectApplicableToClass(s, clsName);
            });
            if (applicable.length > 0) return applicable;
        }

        return [
            { id: 'sub_math', name: 'Mathematics', code: 'MATH 101', periodsPerWeek: 6 },
            { id: 'sub_eng', name: 'English', code: 'ENGL 101', periodsPerWeek: 6 },
            { id: 'sub_kisw', name: 'Kiswahili', code: 'KISW 101', periodsPerWeek: 5 },
            { id: 'sub_sci', name: 'Integrated Science', code: 'SCI 101', periodsPerWeek: 5 },
            { id: 'sub_soc', name: 'Social Studies', code: 'SST 101', periodsPerWeek: 4 },
            { id: 'sub_cre', name: 'Religious Education', code: 'CRE 101', periodsPerWeek: 3 }
        ];
    }, [subjects]);

    const [allocations, setAllocations] = useState<SubjectAllocationRecord[]>([]);
    const [removedFromClassKeys, setRemovedFromClassKeys] = useState<Set<string>>(new Set());

    // Sync selectedClass and modalClassName when classOptions resolves
    useEffect(() => {
        if (classOptions.length > 0 && (!selectedClass || !classOptions.includes(selectedClass))) {
            setSelectedClass(classOptions[0]);
            setModalClassName(classOptions[0]);
        }
    }, [classOptions, selectedClass]);

    // Load allocations from DB if available
    useEffect(() => {
        if (currentInstitution?.id) {
            apiService.fetchModuleRecords<SubjectAllocationRecord>('subject_allocations', currentInstitution.id)
                .then(dbAllocations => {
                    if (dbAllocations && dbAllocations.length > 0) {
                        setAllocations(dbAllocations);
                    }
                })
                .catch(err => console.log('Using initial allocation records:', err));
        }
    }, [currentInstitution]);

    // Initialize selected teacher if empty
    useEffect(() => {
        if (!selectedTeacherId && teacherUsers.length > 0) {
            setSelectedTeacherId(teacherUsers[0].id);
        }
    }, [teacherUsers, selectedTeacherId]);

    // Handle Assigning Teacher to a subject row
    const handleAssignTeacher = async (allocId: string, newTeacherId: string, classNameOverride?: string, subjectNameOverride?: string, subjectCodeOverride?: string, lessonsOverride?: number) => {
        const teacherObj = teacherUsers.find(t => t.id === newTeacherId);
        
        let found = false;
        const updatedAllocations = allocations.map(a => {
            if (a.id === allocId || (classNameOverride && a.className === classNameOverride && a.subjectName === subjectNameOverride)) {
                found = true;
                return {
                    ...a,
                    teacherId: newTeacherId,
                    teacherName: teacherObj ? teacherObj.name : 'Unassigned',
                    status: newTeacherId ? ('allocated' as const) : ('unassigned' as const)
                };
            }
            return a;
        });

        if (!found && classNameOverride && subjectNameOverride) {
            const newAlloc: SubjectAllocationRecord = {
                id: allocId || `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                institutionId: currentInstitution?.id || 'inst_1',
                className: classNameOverride,
                subjectName: subjectNameOverride,
                subjectCode: subjectCodeOverride || `${subjectNameOverride.substring(0, 4).toUpperCase()} 101`,
                teacherId: newTeacherId,
                teacherName: teacherObj ? teacherObj.name : 'Unassigned',
                lessonsPerWeek: lessonsOverride || 6,
                status: newTeacherId ? 'allocated' : 'unassigned'
            };
            updatedAllocations.push(newAlloc);
        }

        setAllocations(updatedAllocations);
        const targetRecord = updatedAllocations.find(a => a.id === allocId || (a.className === classNameOverride && a.subjectName === subjectNameOverride));
        if (targetRecord && currentInstitution?.id) {
            await apiService.saveModuleRecord('subject_allocations', targetRecord).catch(() => {});
        }

        setSaveToast(`Updated allocation for ${targetRecord?.subjectName || subjectNameOverride} (${targetRecord?.className || classNameOverride})`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Handle Updating Lessons Count
    const handleUpdateLessonsCount = async (allocId: string, lessons: number, classNameOverride?: string, subjectNameOverride?: string) => {
        let found = false;
        const updatedAllocations = allocations.map(a => {
            if (a.id === allocId || (classNameOverride && a.className === classNameOverride && a.subjectName === subjectNameOverride)) {
                found = true;
                return { ...a, lessonsPerWeek: lessons };
            }
            return a;
        });

        if (!found && classNameOverride && subjectNameOverride) {
            const newAlloc: SubjectAllocationRecord = {
                id: allocId || `alloc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
                institutionId: currentInstitution?.id || 'inst_1',
                className: classNameOverride,
                subjectName: subjectNameOverride,
                lessonsPerWeek: lessons,
                status: 'unassigned'
            };
            updatedAllocations.push(newAlloc);
        }

        setAllocations(updatedAllocations);
        const targetRecord = updatedAllocations.find(a => a.id === allocId || (a.className === classNameOverride && a.subjectName === subjectNameOverride));
        if (targetRecord && currentInstitution?.id) {
            await apiService.saveModuleRecord('subject_allocations', targetRecord).catch(() => {});
        }
    };

    // Add New Allocation
    const handleCreateAllocation = async (e: React.FormEvent) => {
        e.preventDefault();
        const teacherObj = teacherUsers.find(t => t.id === modalTeacherId);
        const newRecord: SubjectAllocationRecord = {
            id: `alloc_${Date.now()}`,
            institutionId: currentInstitution?.id || 'inst_1',
            className: modalClassName,
            subjectName: modalSubjectName,
            subjectCode: `${modalSubjectName.substring(0, 4).toUpperCase()} 101`,
            teacherId: modalTeacherId,
            teacherName: teacherObj ? teacherObj.name : 'Unassigned',
            lessonsPerWeek: modalLessons,
            status: modalTeacherId ? 'allocated' : 'unassigned'
        };

        const nextAllocations = [newRecord, ...allocations];
        setAllocations(nextAllocations);
        if (currentInstitution?.id) {
            await apiService.saveModuleRecord('subject_allocations', newRecord).catch(() => {});
        }

        setIsAddAllocationModalOpen(false);
        setSaveToast(`Added allocation for ${modalSubjectName} in ${modalClassName}`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Handle Deleting / Unallocating a subject allocation from a class
    const handleDeleteAllocation = async (alloc: SubjectAllocationRecord) => {
        const confirmDelete = window.confirm(`Are you sure you want to remove the subject allocation for "${alloc.subjectName}" in ${alloc.className}?`);
        if (!confirmDelete) return;

        const key = `${alloc.className}_${alloc.subjectName}`;
        setRemovedFromClassKeys(prev => {
            const next = new Set(prev);
            next.add(key);
            return next;
        });

        setAllocations(prev => prev.filter(a => a.id !== alloc.id && !(a.className === alloc.className && a.subjectName === alloc.subjectName)));

        // Delete from DB subject_allocations table if record exists
        if (currentInstitution?.id && alloc.id && !alloc.id.startsWith('alloc_') && alloc.id.length > 5) {
            await apiService.deleteModuleRecord('subject_allocations', alloc.id).catch(() => {});
        }

        // Unassign class stream from subject's targetClasses / assignedClasses
        const subjObj = (subjects || []).find(s => 
            s.name.toLowerCase().trim() === alloc.subjectName.toLowerCase().trim() || 
            (alloc.subjectCode && s.code.toLowerCase().trim() === alloc.subjectCode.toLowerCase().trim())
        );

        if (subjObj) {
            const existingClasses = (subjObj as any).targetClasses || (subjObj as any).assignedClasses || (subjObj as any).classes || [];
            const updatedClasses = Array.isArray(existingClasses) 
                ? existingClasses.filter((c: string) => c.toLowerCase().trim() !== alloc.className.toLowerCase().trim())
                : [];
            
            if (onUpdateSubject) {
                onUpdateSubject(subjObj.id, { targetClasses: updatedClasses, assignedClasses: updatedClasses } as any);
            }
            if (currentInstitution?.id) {
                await apiService.saveSubject({ ...subjObj, targetClasses: updatedClasses, assignedClasses: updatedClasses } as Subject).catch(() => {});
            }
        }

        setSaveToast(`Removed ${alloc.subjectName} allocation from ${alloc.className}`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Selected Class Allocations (dynamically populated based on subjects assigned to selectedClass)
    const classAllocations = useMemo(() => {
        if (!selectedClass) return [];

        const q = searchQuery.toLowerCase().trim();
        const applicableSubjects = getApplicableSubjectsForClass(selectedClass);

        return applicableSubjects.map((subj, idx) => {
            const existing = allocations.find(a => 
                a.className === selectedClass && 
                (a.subjectName === subj.name || (subj.code && a.subjectCode === subj.code))
            );

            if (existing) {
                return existing;
            }

            const defaultTeacher = teacherUsers[idx % teacherUsers.length];
            return {
                id: `alloc_${selectedClass.replace(/\s+/g, '_')}_${subj.id || idx}`,
                institutionId: currentInstitution?.id || 'inst_1',
                className: selectedClass,
                subjectName: subj.name,
                subjectCode: subj.code || `${subj.name.substring(0, 4).toUpperCase()} 101`,
                teacherId: defaultTeacher ? defaultTeacher.id : '',
                teacherName: defaultTeacher ? defaultTeacher.name : 'Unassigned',
                lessonsPerWeek: (subj as any).periodsPerWeek || (subj as any).lessonsPerWeek || (idx % 2 === 0 ? 7 : 6),
                status: defaultTeacher ? ('allocated' as const) : ('unassigned' as const)
            };
        }).filter(a => {
            if (removedFromClassKeys.has(`${a.className}_${a.subjectName}`)) return false;
            if (!q) return true;
            return a.className.toLowerCase().includes(q) ||
                   a.subjectName.toLowerCase().includes(q) ||
                   (a.teacherName && a.teacherName.toLowerCase().includes(q));
        });
    }, [getApplicableSubjectsForClass, selectedClass, allocations, teacherUsers, currentInstitution, searchQuery, removedFromClassKeys]);

    // All allocations dynamically gathered across classOptions + saved DB allocations
    const allAllocations = useMemo(() => {
        const q = searchQuery.toLowerCase().trim();
        const map = new Map<string, SubjectAllocationRecord>();

        // 1. First add all DB/state saved allocations
        (allocations || []).forEach(a => {
            map.set(`${a.className}_${a.subjectName}`, a);
        });

        // 2. Add dynamically derived class allocations for all classOptions
        (classOptions || []).forEach(cls => {
            const applicable = getApplicableSubjectsForClass(cls);
            applicable.forEach((subj, idx) => {
                const key = `${cls}_${subj.name}`;
                if (!map.has(key)) {
                    const defaultTeacher = teacherUsers[idx % teacherUsers.length];
                    map.set(key, {
                        id: `alloc_${cls.replace(/\s+/g, '_')}_${subj.id || idx}`,
                        institutionId: currentInstitution?.id || 'inst_1',
                        className: cls,
                        subjectName: subj.name,
                        subjectCode: subj.code || `${subj.name.substring(0, 4).toUpperCase()} 101`,
                        teacherId: defaultTeacher ? defaultTeacher.id : '',
                        teacherName: defaultTeacher ? defaultTeacher.name : 'Unassigned',
                        lessonsPerWeek: (subj as any).periodsPerWeek || (subj as any).lessonsPerWeek || (idx % 2 === 0 ? 7 : 6),
                        status: defaultTeacher ? ('allocated' as const) : ('unassigned' as const)
                    });
                }
            });
        });

        const list = Array.from(map.values());
        if (!q) return list;
        return list.filter(a =>
            a.className.toLowerCase().includes(q) ||
            a.subjectName.toLowerCase().includes(q) ||
            (a.teacherName && a.teacherName.toLowerCase().includes(q))
        );
    }, [allocations, classOptions, getApplicableSubjectsForClass, teacherUsers, currentInstitution, searchQuery]);

    // Selected Teacher Allocations & Workload
    const selectedTeacherObj = teacherUsers.find(t => t.id === selectedTeacherId);
    const teacherAllocations = useMemo(() => {
        return allAllocations.filter(a => a.teacherId === selectedTeacherId);
    }, [allAllocations, selectedTeacherId]);

    const totalTeacherLessons = useMemo(() => {
        return teacherAllocations.reduce((sum, a) => sum + (a.lessonsPerWeek || 0), 0);
    }, [teacherAllocations]);

    return (
        <div className="space-y-6 animate-fade-in w-full text-left">
            {/* Toast Banner */}
            {saveToast && (
                <div className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-bold text-xs flex justify-between items-center shadow-lg animate-in slide-in-from-top-2">
                    <span className="flex items-center gap-2">
                        <CheckIcon className="w-4 h-4" /> {saveToast}
                    </span>
                    <button type="button" onClick={() => setSaveToast(null)} className="hover:opacity-80">✕</button>
                </div>
            )}

            {/* Top Banner Header */}
            <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-[2.5rem] shadow-2xl border border-indigo-900/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <span className="text-[10px] font-black tracking-widest uppercase text-indigo-400 bg-indigo-900/60 px-3 py-1 rounded-full border border-indigo-700/50">
                        📚 Cyber Academic Curriculum
                    </span>
                    <h2 className="text-2xl font-black uppercase tracking-tight text-white mt-2 flex items-center gap-2">
                        <RectangleStackIcon className="w-7 h-7 text-indigo-400" /> Lessons & Subject Allocations
                    </h2>
                    <p className="text-xs text-slate-300 mt-1 max-w-xl">
                        Manage subject teaching assignments per class stream or per teacher. Monitor weekly lesson workloads and allocate teaching staff in real-time.
                    </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                    <button
                        type="button"
                        onClick={() => setIsAddAllocationModalOpen(true)}
                        className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-xl shadow-indigo-900/40 active:scale-95 flex items-center gap-2 cursor-pointer"
                    >
                        <PlusIcon className="w-4 h-4 stroke-[3]" /> Add Lesson Allocation
                    </button>
                </div>
            </div>

            {/* Mode Selector & Filter Toolbar */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center gap-4">
                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl">
                    <button
                        type="button"
                        onClick={() => setViewMode('per_class')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            viewMode === 'per_class'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
                        }`}
                    >
                        📌 Manage Per Class
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('per_teacher')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            viewMode === 'per_teacher'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        👨‍🏫 Manage Per Teacher
                    </button>
                    <button
                        type="button"
                        onClick={() => setViewMode('matrix')}
                        className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                            viewMode === 'matrix'
                                ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                                : 'text-slate-500 hover:text-slate-900'
                        }`}
                    >
                        📊 Allocation Matrix
                    </button>
                </div>

                {/* Search Bar */}
                <div className="relative flex items-center w-full md:w-72">
                    <MagnifyingGlassIcon className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search class, subject or teacher..."
                        className="pl-9 pr-8 py-2 w-full bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                    />
                    {searchQuery && (
                        <button type="button" onClick={() => setSearchQuery('')} className="absolute right-3 text-slate-400 hover:text-slate-600 text-xs font-bold">✕</button>
                    )}
                </div>
            </div>

            {/* TAB MODE 1: MANAGE PER CLASS */}
            {viewMode === 'per_class' && (
                <div className="space-y-6">
                    {/* Class Selector Pills */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 custom-scrollbar-horizontal">
                        {classOptions.map(cls => {
                            const applicable = getApplicableSubjectsForClass(cls);
                            const count = applicable.length;
                            const unassigned = applicable.filter(subj => {
                                const alloc = allocations.find(a => a.className === cls && (a.subjectName === subj.name || (subj.code && a.subjectCode === subj.code)));
                                return !alloc || alloc.status === 'unassigned' || !alloc.teacherId;
                            }).length;
                            const isSelected = selectedClass === cls;
                            return (
                                <button
                                    key={cls}
                                    type="button"
                                    onClick={() => setSelectedClass(cls)}
                                    className={`px-4 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shrink-0 border text-left cursor-pointer ${
                                        isSelected
                                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-100 dark:shadow-none scale-105'
                                            : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                                    }`}
                                >
                                    <div>{cls}</div>
                                    <div className="text-[9px] font-mono opacity-80 mt-0.5">
                                        {count} subjects {unassigned > 0 && <span className="text-amber-300 font-bold">({unassigned} unassigned)</span>}
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Class Allocations Table */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/40">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    Class Stream: {selectedClass}
                                </h3>
                                <p className="text-xs text-slate-500">Subject teacher assignments and weekly lesson count for {selectedClass}.</p>
                            </div>
                            <span className="text-xs font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-800">
                                {classAllocations.reduce((sum, a) => sum + (a.lessonsPerWeek || 0), 0)} Weekly Lessons
                            </span>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4 text-left">Code</th>
                                        <th className="px-6 py-4 text-left">Subject Offered</th>
                                        <th className="px-6 py-4 text-left">Allocated Teacher</th>
                                        <th className="px-6 py-4 text-center">Lessons / Wk</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                    {classAllocations.map(alloc => (
                                        <tr key={alloc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                            <td className="px-6 py-4 font-mono font-bold text-slate-500">{alloc.subjectCode || 'SUB-100'}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-sm">{alloc.subjectName}</td>
                                            <td className="px-6 py-4">
                                                <select
                                                    value={alloc.teacherId || ''}
                                                    onChange={(e) => handleAssignTeacher(alloc.id, e.target.value, alloc.className, alloc.subjectName, alloc.subjectCode, alloc.lessonsPerWeek)}
                                                    className="w-full max-w-xs py-2 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 text-xs cursor-pointer"
                                                >
                                                    <option value="">-- Select Teacher --</option>
                                                    {teacherUsers.map(t => (
                                                        <option key={t.id} value={t.id}>{t.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={15}
                                                    value={alloc.lessonsPerWeek}
                                                    onChange={(e) => handleUpdateLessonsCount(alloc.id, parseInt(e.target.value) || 1, alloc.className, alloc.subjectName)}
                                                    className="w-16 py-1.5 text-center font-mono font-black text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs"
                                                />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 text-[10px] font-black uppercase rounded-lg border ${
                                                    alloc.status === 'allocated'
                                                        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200'
                                                        : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 animate-pulse'
                                                }`}>
                                                    {alloc.status === 'allocated' ? '✓ Allocated' : '⚠️ Unassigned'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeleteAllocation(alloc)}
                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                                    title="Remove allocation"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}

                                    {classAllocations.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                                                No subject allocations created for {selectedClass} yet. Click "Add Lesson Allocation" above to assign subjects & teachers.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB MODE 2: MANAGE PER TEACHER */}
            {viewMode === 'per_teacher' && (
                <div className="space-y-6">
                    {/* Teacher Cards Horizontal Selection */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {teacherUsers.map(t => {
                            const allocs = allocations.filter(a => a.teacherId === t.id);
                            const totalLessons = allocs.reduce((sum, a) => sum + a.lessonsPerWeek, 0);
                            const isSelected = selectedTeacherId === t.id;
                            const isOverloaded = totalLessons > 30;

                            return (
                                <button
                                    key={t.id}
                                    type="button"
                                    onClick={() => setSelectedTeacherId(t.id)}
                                    className={`p-5 rounded-[2rem] border text-left transition-all cursor-pointer flex flex-col justify-between h-32 ${
                                        isSelected
                                            ? 'bg-gradient-to-r from-indigo-900 to-slate-900 text-white border-indigo-700 shadow-xl scale-105'
                                            : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-slate-200 dark:border-slate-800 hover:border-indigo-300'
                                    }`}
                                >
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-sm font-black truncate max-w-[140px]">{t.name}</span>
                                            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                isOverloaded ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'
                                            }`}>
                                                {totalLessons} lessons/wk
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-1">{t.email || 'Staff Educator'}</p>
                                    </div>
                                    <div className="text-[10px] font-mono text-indigo-400 font-bold">
                                        Assigned to {allocs.length} class streams
                                    </div>
                                </button>
                            );
                        })}
                    </div>

                    {/* Teacher Workload Summary & Assigned Classes Table */}
                    {selectedTeacherObj && (
                        <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50 dark:bg-slate-950/40">
                                <div>
                                    <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
                                        👨‍🏫 Educator Workload: {selectedTeacherObj.name}
                                    </h3>
                                    <p className="text-xs text-slate-500">List of all class streams and subjects assigned to {selectedTeacherObj.name}.</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-950 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                                        Total Workload: {totalTeacherLessons} Lessons / Week
                                    </span>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                                    <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4 text-left">Class Stream</th>
                                            <th className="px-6 py-4 text-left">Subject Assigned</th>
                                            <th className="px-6 py-4 text-left">Subject Code</th>
                                            <th className="px-6 py-4 text-center">Lessons / Wk</th>
                                            <th className="px-6 py-4 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                        {teacherAllocations.map(alloc => (
                                            <tr key={alloc.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                                <td className="px-6 py-4 font-bold text-slate-900 dark:text-white text-sm">{alloc.className}</td>
                                                <td className="px-6 py-4 font-bold text-indigo-600 dark:text-indigo-400">{alloc.subjectName}</td>
                                                <td className="px-6 py-4 font-mono text-slate-500">{alloc.subjectCode || 'SUB-100'}</td>
                                                <td className="px-6 py-4 text-center font-mono font-black text-slate-900 dark:text-white text-sm">{alloc.lessonsPerWeek}</td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleAssignTeacher(alloc.id, '')}
                                                        className="px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg text-[10px] uppercase tracking-wider border border-amber-200 transition-colors"
                                                    >
                                                        Unassign
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}

                                        {teacherAllocations.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold uppercase text-xs tracking-wider">
                                                    No subject allocations assigned to {selectedTeacherObj.name} yet. Click "Add Lesson Allocation" above to assign classes to this educator.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB MODE 3: ALLOCATION MATRIX */}
            {viewMode === 'matrix' && (
                <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                            📊 School-Wide Subject Allocation Matrix
                        </h3>
                        <p className="text-xs text-slate-500">Comprehensive grid showing class streams vs subjects and assigned teachers across the school.</p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                            <thead className="bg-slate-900 text-white font-black uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 text-left w-36">Class Stream</th>
                                    {['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics'].map(sub => (
                                        <th key={sub} className="px-4 py-3 text-center border-x border-slate-800">{sub}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                                {classOptions.slice(0, 7).map(cls => (
                                    <tr key={cls} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-900 dark:text-white bg-slate-50/50 dark:bg-slate-950/50">{cls}</td>
                                        {['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics'].map(sub => {
                                            const alloc = allocations.find(a => a.className === cls && a.subjectName === sub);
                                            return (
                                                <td key={sub} className="px-3 py-3 text-center border-x border-slate-100 dark:border-slate-800">
                                                    {alloc && alloc.teacherName && alloc.teacherName !== 'Unassigned' ? (
                                                        <div className="space-y-0.5">
                                                            <div className="font-bold text-indigo-600 dark:text-indigo-400 truncate max-w-[120px] mx-auto" title={alloc.teacherName}>{alloc.teacherName}</div>
                                                            <div className="text-[10px] font-mono text-slate-400">{alloc.lessonsPerWeek} les/wk</div>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setModalClassName(cls);
                                                                setModalSubjectName(sub);
                                                                setIsAddAllocationModalOpen(true);
                                                            }}
                                                            className="text-[10px] font-bold text-amber-600 hover:text-amber-800 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded-md border border-amber-200 transition-all cursor-pointer"
                                                        >
                                                            + Assign
                                                        </button>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* MODAL: ADD LESSON ALLOCATION */}
            {isAddAllocationModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 z-[300] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setIsAddAllocationModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-indigo-50/50 dark:bg-indigo-950/20">
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Add Lesson Allocation</h3>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Assign subject & educator to class stream</p>
                            </div>
                            <button type="button" onClick={() => setIsAddAllocationModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold p-1">✕</button>
                        </div>

                        <form onSubmit={handleCreateAllocation} className="p-6 space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Class Stream</label>
                                <select
                                    value={modalClassName}
                                    onChange={e => setModalClassName(e.target.value)}
                                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                >
                                    {classOptions.map(c => (
                                        <option key={c} value={c}>{c}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Subject</label>
                                <select
                                    value={modalSubjectName}
                                    onChange={e => setModalSubjectName(e.target.value)}
                                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                >
                                    {subjectList.map(s => (
                                        <option key={s} value={s}>{s}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Assign Educator (Teacher)</label>
                                <select
                                    value={modalTeacherId}
                                    onChange={e => setModalTeacherId(e.target.value)}
                                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                >
                                    <option value="">-- Leave Unassigned --</option>
                                    {teacherUsers.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Lessons / Week</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={15}
                                    value={modalLessons}
                                    onChange={e => setModalLessons(parseInt(e.target.value) || 1)}
                                    className="w-full py-2.5 px-3 bg-slate-50 dark:bg-slate-800 font-mono font-bold text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs"
                                />
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-800">
                                <button type="button" onClick={() => setIsAddAllocationModalOpen(false)} className="px-5 py-2.5 text-xs font-bold uppercase text-slate-500 hover:text-slate-700">Cancel</button>
                                <button type="submit" className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-indigo-100 dark:shadow-none">
                                    Save Allocation
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
