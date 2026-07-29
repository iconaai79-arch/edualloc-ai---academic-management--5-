import React, { useState, useMemo, useEffect } from 'react';
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
}

export const LessonsAllocationManager: React.FC<LessonsAllocationManagerProps> = ({
    currentInstitution,
    users = [],
    subjects = [],
    courses = []
}) => {
    const [viewMode, setViewMode] = useState<'per_class' | 'per_teacher' | 'matrix'>('per_class');
    const [selectedClass, setSelectedClass] = useState<string>('Form 3 Central');
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [saveToast, setSaveToast] = useState<string | null>(null);
    const [isAddAllocationModalOpen, setIsAddAllocationModalOpen] = useState(false);

    // Form modal state
    const [modalClassName, setModalClassName] = useState('Form 3 Central');
    const [modalSubjectName, setModalSubjectName] = useState('Mathematics');
    const [modalTeacherId, setModalTeacherId] = useState('');
    const [modalLessons, setModalLessons] = useState(6);

    // Initial dummy / default allocations
    const [allocations, setAllocations] = useState<SubjectAllocationRecord[]>([
        { id: 'alloc_1', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 3 Central', subjectName: 'Mathematics', subjectCode: 'MATH 101', teacherId: 't_1', teacherName: 'Mr. Justus (Maths)', lessonsPerWeek: 7, status: 'allocated' },
        { id: 'alloc_2', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 3 Central', subjectName: 'English', subjectCode: 'ENG 102', teacherId: 't_2', teacherName: 'Mdm. Faith Kanguha', lessonsPerWeek: 6, status: 'allocated' },
        { id: 'alloc_3', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 3 Central', subjectName: 'Kiswahili', subjectCode: 'KISW 103', teacherId: 't_3', teacherName: 'Chome Ngala', lessonsPerWeek: 5, status: 'allocated' },
        { id: 'alloc_4', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 3 Central', subjectName: 'Biology', subjectCode: 'BIO 104', teacherId: 't_4', teacherName: 'Mdm Romana', lessonsPerWeek: 5, status: 'allocated' },
        { id: 'alloc_5', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 3 Central', subjectName: 'Chemistry', subjectCode: 'CHEM 105', teacherId: '', teacherName: 'Unassigned', lessonsPerWeek: 5, status: 'unassigned' },
        
        { id: 'alloc_6', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 3 South', subjectName: 'Mathematics', subjectCode: 'MATH 101', teacherId: 't_1', teacherName: 'Mr. Justus (Maths)', lessonsPerWeek: 7, status: 'allocated' },
        { id: 'alloc_7', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 3 South', subjectName: 'English', subjectCode: 'ENG 102', teacherId: 't_2', teacherName: 'Mdm. Faith Kanguha', lessonsPerWeek: 6, status: 'allocated' },
        
        { id: 'alloc_8', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 2 East', subjectName: 'Physics', subjectCode: 'PHYS 106', teacherId: 't_1', teacherName: 'Mr. Justus (Maths)', lessonsPerWeek: 5, status: 'allocated' },
        { id: 'alloc_9', institutionId: currentInstitution?.id || 'inst_1', className: 'Form 1 North', subjectName: 'Mathematics', subjectCode: 'MATH 101', teacherId: 't_1', teacherName: 'Mr. Justus (Maths)', lessonsPerWeek: 6, status: 'allocated' },
    ]);

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

    // List of available class streams
    const classOptions = [
        'Form 1 North', 'Form 1 South', 'Form 1 East',
        'Form 2 Central', 'Form 2 East', 'Form 2 West',
        'Form 3 Central', 'Form 3 South', 'Form 3 East', 'Form 3 West',
        'Form 4 Central', 'Form 4 North', 'Grade 10 Central'
    ];

    // List of available subjects
    const subjectList = useMemo(() => {
        if (subjects.length > 0) return subjects.map(s => s.name);
        return ['Mathematics', 'English', 'Kiswahili', 'Biology', 'Chemistry', 'Physics', 'Geography', 'History', 'CRE', 'Computer Studies', 'Business Studies', 'Agriculture'];
    }, [subjects]);

    // Initialize selected teacher if empty
    useEffect(() => {
        if (!selectedTeacherId && teacherUsers.length > 0) {
            setSelectedTeacherId(teacherUsers[0].id);
        }
    }, [teacherUsers, selectedTeacherId]);

    // Handle Assigning Teacher to a subject row
    const handleAssignTeacher = async (allocId: string, newTeacherId: string) => {
        const teacherObj = teacherUsers.find(t => t.id === newTeacherId);
        const updatedAllocations = allocations.map(a => {
            if (a.id === allocId) {
                return {
                    ...a,
                    teacherId: newTeacherId,
                    teacherName: teacherObj ? teacherObj.name : 'Unassigned',
                    status: newTeacherId ? ('allocated' as const) : ('unassigned' as const)
                };
            }
            return a;
        });

        setAllocations(updatedAllocations);
        const targetRecord = updatedAllocations.find(a => a.id === allocId);
        if (targetRecord && currentInstitution?.id) {
            await apiService.saveModuleRecord('subject_allocations', targetRecord).catch(() => {});
        }

        setSaveToast(`Updated allocation for ${targetRecord?.subjectName} (${targetRecord?.className})`);
        setTimeout(() => setSaveToast(null), 3000);
    };

    // Handle Updating Lessons Count
    const handleUpdateLessonsCount = async (allocId: string, lessons: number) => {
        const updatedAllocations = allocations.map(a => {
            if (a.id === allocId) {
                return { ...a, lessonsPerWeek: lessons };
            }
            return a;
        });
        setAllocations(updatedAllocations);
        const targetRecord = updatedAllocations.find(a => a.id === allocId);
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

    // Filtered Allocations based on search
    const filteredAllocations = useMemo(() => {
        if (!searchQuery.trim()) return allocations;
        const q = searchQuery.toLowerCase().trim();
        return allocations.filter(a =>
            a.className.toLowerCase().includes(q) ||
            a.subjectName.toLowerCase().includes(q) ||
            (a.teacherName && a.teacherName.toLowerCase().includes(q))
        );
    }, [allocations, searchQuery]);

    // Selected Class Allocations
    const classAllocations = useMemo(() => {
        return filteredAllocations.filter(a => a.className === selectedClass);
    }, [filteredAllocations, selectedClass]);

    // Selected Teacher Allocations & Workload
    const selectedTeacherObj = teacherUsers.find(t => t.id === selectedTeacherId);
    const teacherAllocations = useMemo(() => {
        return filteredAllocations.filter(a => a.teacherId === selectedTeacherId);
    }, [filteredAllocations, selectedTeacherId]);

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
                            const count = allocations.filter(a => a.className === cls).length;
                            const unassigned = allocations.filter(a => a.className === cls && a.status === 'unassigned').length;
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
                                                    onChange={(e) => handleAssignTeacher(alloc.id, e.target.value)}
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
                                                    onChange={(e) => handleUpdateLessonsCount(alloc.id, parseInt(e.target.value) || 1)}
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
                                                    onClick={() => {
                                                        setAllocations(prev => prev.filter(a => a.id !== alloc.id));
                                                    }}
                                                    className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
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
