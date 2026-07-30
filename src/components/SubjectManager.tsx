import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Department, Subject, TimetableSettings, LessonStructure, LetterheadConfig, Room, Building, Course, Institution, TimetableConstraint, TimetableConstraintType, User } from '../types';
import { PlusIcon } from './icons/PlusIcon';
import { XIcon } from './icons/XIcon';
import { SparklesIcon } from './icons/SparklesIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { MagnifyingGlassIcon } from './icons/MagnifyingGlassIcon';
import { BookOpenIcon } from './icons/BookOpenIcon';
import { ArrowUpTrayIcon } from './icons/ArrowUpTrayIcon';
import { InformationCircleIcon } from './icons/InformationCircleIcon';
import { ArrowsRightLeftIcon } from './icons/ArrowsRightLeftIcon';
import { ClockIcon } from './icons/ClockIcon';

import { SmartSubjectImporterModal } from './SmartSubjectImporterModal';
import { generatePastelColor } from '../utils/colorUtils';
import { EditSubjectModal } from './EditSubjectModal';
import { PathwayUpdateModal } from './PathwayUpdateModal';
import { SubjectConstraintsModal } from './SubjectConstraintsModal';
import { BulkSubjectStructureModal } from './BulkSubjectStructureModal';
import { isSchoolInstitution } from '../utils/roleUtils';
import { apiService } from '../services/apiService';

import * as XLSX from 'xlsx';

const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) {
        return <>{text}</>;
    }
    try {
        const escapedQuery = query.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedQuery})`, 'gi');
        const parts = text.split(regex);
        return (
            <>
                {parts.map((part, index) =>
                    index % 2 === 1 ? (
                        <mark key={index} className="bg-yellow-200 dark:bg-yellow-700/50 px-0 py-0 rounded">{part}</mark>
                    ) : (
                        <>{part}</>
                    ))}
            </>
        );
    } catch (e) { return <>{text}</>; }
};

import { ClassSubjectAllocationModal } from './ClassSubjectAllocationModal';

interface SubjectManagerProps {
    subjects: Subject[];
    departments: Department[];
    rooms: Room[];
    courses: Course[];
    onAddSubject?: (subjectData: Omit<Subject, 'id' | 'institutionId'>, initialCourseLevelIds?: string[]) => void;
    onUpdateSubject?: (subjectId: string, updatedData: Partial<Omit<Subject, 'id' | 'institutionId'>>) => void;
    onDeleteSubject?: (subjectId: string) => void;
    onEditSubject?: (subject: Subject) => void;
    onImportSubjectsAndAssociate?: (subjects: (Omit<Subject, 'id' | 'institutionId'> & { targetCourseLevelId?: string })[]) => Promise<void>;
    onAssociateSubjectToCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onDisassociateSubjectFromCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    timetableSettings: TimetableSettings;
    onSaveTimetableSettings?: (config: TimetableSettings) => void;
    letterheadConfig?: LetterheadConfig;
    logoUrl?: string | null;
    footerImageUrl?: string | null;
    buildings: Building[];
    currentInstitution?: Institution | null;
    currentUser: User;
    onUpdateCourse?: (courseId: string, data: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
    onLogAction?: (action: string) => Promise<void>;
}

const formatLessonStructure = (structure: LessonStructure[] | undefined): string => {
    if (!structure || structure.length === 0) return 'N/A';
    return structure.map(s => {
        let periodName: string;
        switch (s.periods) {
            case 1: periodName = 'Single'; break;
            case 2: periodName = 'Double'; break;
            case 3: periodName = 'Triple'; break;
            default: periodName = `${s.periods}-period`;
        }
        return `${s.count}x ${periodName}`;
    }).join(', ');
};

export const SubjectManager: React.FC<SubjectManagerProps> = ({
    subjects, departments, onAddSubject, onUpdateSubject, onDeleteSubject, currentInstitution, courses = [], onImportSubjectsAndAssociate,
    onAssociateSubjectToCourseLevel, onDisassociateSubjectFromCourseLevel, timetableSettings, onSaveTimetableSettings, rooms, currentUser, onUpdateCourse,
    onLogAction
}) => {
    const [isPathwaySyncOpen, setIsPathwaySyncOpen] = useState(false);
    const [isClassAllocationOpen, setIsClassAllocationOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
    const [classFilter, setClassFilter] = useState<string>('all');
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [constraintSubject, setConstraintSubject] = useState<Subject | null>(null);
    const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
    const [isBulkStructureOpen, setIsBulkStructureOpen] = useState(false);
    // Locally-added subjects (via direct apiService save) that haven't propagated to parent state yet
    const [locallyAddedSubjects, setLocallyAddedSubjects] = useState<Subject[]>([]);
    const [groupByLevel, setGroupByLevel] = useState(false);
    const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

    const isSchool = isSchoolInstitution(currentInstitution);
    const isChurch = currentInstitution?.institutionType === 'Church';

    const isPrimarySchool = useMemo(() => {
        const type = (currentInstitution?.institutionType || '').toLowerCase();
        const name = (currentInstitution?.name || '').toLowerCase();
        return type === 'primary' || name.includes('primary') || name.includes('academy') || name.includes('cbc') || name.includes('cbe');
    }, [currentInstitution]);

    const visibleDepartments = useMemo(() => {
        if (currentUser.role === 'tto' && currentUser.departmentId) return departments.filter(d => d.id === currentUser.departmentId);
        return departments;
    }, [departments, currentUser]);

    // Dynamic list of registered classes
    const classOptions = useMemo(() => {
        const set = new Set<string>();

        if (courses && courses.length > 0) {
            courses.forEach(c => {
                const name = typeof c === 'string' ? c : (c.name || (c as any).title || c.code);
                if (name) set.add(name);
                if (c.levels && Array.isArray(c.levels)) {
                    c.levels.forEach(l => {
                        if (l.name) {
                            const streamName = String(l.name).trim();
                            if (streamName) {
                                if (streamName.toLowerCase().startsWith(name.toLowerCase())) {
                                    set.add(streamName);
                                } else {
                                    set.add(`${name} ${streamName}`);
                                }
                            }
                        }
                    });
                }
            });
        }

        if (currentInstitution) {
            if ((currentInstitution as any).classes && Array.isArray((currentInstitution as any).classes)) {
                (currentInstitution as any).classes.forEach((c: any) => {
                    const name = typeof c === 'string' ? c : c.name;
                    if (name) set.add(name);
                });
            }
        }

        try {
            const instId = currentInstitution?.id || 'default_inst';
            const savedClasses = localStorage.getItem(`eduai_registered_classes_${instId}`);
            if (savedClasses) {
                const parsed = JSON.parse(savedClasses);
                if (Array.isArray(parsed)) parsed.forEach(c => set.add(c));
            }
        } catch(e) {}

        if (set.size === 0) {
            if (isPrimarySchool) {
                ['Grade 1 Central', 'Grade 2 Central', 'Grade 3 Central', 'Grade 4 Central', 'Grade 5 Central', 'Grade 6 Central', 'Grade 7 Central', 'Grade 8 Central'].forEach(c => set.add(c));
            } else {
                ['Form 1 Central', 'Form 2 Central', 'Form 3 Central', 'Form 4 Central'].forEach(c => set.add(c));
            }
        }

        const standaloneStreams = new Set(['east', 'west', 'north', 'south', 'central', 'red', 'blue', 'green', 'yellow', 'stream a', 'stream b', 'stream c']);
        return Array.from(set).filter(cName => !standaloneStreams.has(cName.trim().toLowerCase()));
    }, [courses, currentInstitution, isPrimarySchool]);

    const filteredSubjects = useMemo(() => {
        // Merge prop subjects with any locally added ones (from direct apiService save)
        const existingIds = new Set(subjects.map(s => s.id));
        const merged = [...subjects, ...locallyAddedSubjects.filter(s => !existingIds.has(s.id))];
        let list = merged;
        if (currentUser.role === 'tto' && currentUser.departmentId) list = list.filter(s => s.departmentId === currentUser.departmentId);
        return list.filter(s => {
            const matchesDept = departmentFilter === 'all' || s.departmentId === departmentFilter;
            const matchesComp = completionFilter === 'all' || (completionFilter === 'complete' && s.isComplete) || (completionFilter === 'incomplete' && !s.isComplete);
            
            // Filter by Class stream if selected
            let matchesClass = true;
            if (classFilter !== 'all') {
                const targetCls = (s as any).targetClasses || (s as any).assignedClasses || (s as any).classes;
                if (Array.isArray(targetCls) && targetCls.length > 0) {
                    matchesClass = targetCls.includes(classFilter);
                }
            }

            const q = searchQuery.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
            return matchesDept && matchesComp && matchesClass && matchesSearch;
        });
    }, [subjects, locallyAddedSubjects, searchQuery, departmentFilter, completionFilter, classFilter, currentUser.departmentId]);

    const handleSaveSubject = (id: string, data: Partial<Omit<Subject, 'id' | 'institutionId'>>, initialCourseLevelIds?: string[]) => {
        if (id && onUpdateSubject) {
            onUpdateSubject(id, data);
            onLogAction?.(`Updated subject record: ${data.name || 'Unknown'}`);
        } else if (onAddSubject) {
            onAddSubject(data as Omit<Subject, 'id' | 'institutionId'>, initialCourseLevelIds);
            onLogAction?.(`Added new subject: ${data.name || 'Unknown'}`);
        }
        setEditingSubject(null);
    };



    const handleBulkPathwayUpdate = async (updates: Record<string, Partial<Subject>>) => {
        if (!onUpdateSubject) return;
        for (const [id, data] of Object.entries(updates)) {
            await onUpdateSubject(id, data);
        }
    };

    const handlePrepopulateKenyaCBESubjects = async () => {
        // All three paths are acceptable — use whichever is available

        const defaultDeptId = visibleDepartments[0]?.id || (departments.length > 0 ? departments[0].id : 'dept_primary');

        const primarySubjects: Array<Omit<Subject, 'id' | 'institutionId'>> = [
            // Lower Primary (Grade 1-3)
            { name: 'Mathematics Activities', code: 'MATH-LP', departmentId: defaultDeptId, description: 'Lower Primary CBE Mathematics Activities (Grade 1-3)', isComplete: true, lessonStructure: [{ count: 5, periods: 1 }] },
            { name: 'English Language Activities', code: 'ENG-LP', departmentId: defaultDeptId, description: 'Lower Primary CBE English Language Activities (Grade 1-3)', isComplete: true, lessonStructure: [{ count: 5, periods: 1 }] },
            { name: 'Kiswahili Language Activities', code: 'KISW-LP', departmentId: defaultDeptId, description: 'Lower Primary CBE Kiswahili Language Activities (Grade 1-3)', isComplete: true, lessonStructure: [{ count: 4, periods: 1 }] },
            { name: 'Environmental Activities', code: 'ENV-LP', departmentId: defaultDeptId, description: 'Lower Primary CBE Environmental Activities (Grade 1-3)', isComplete: true, lessonStructure: [{ count: 4, periods: 1 }] },
            { name: 'Hygiene & Nutrition Activities', code: 'HYG-LP', departmentId: defaultDeptId, description: 'Lower Primary CBE Hygiene & Nutrition Activities (Grade 1-3)', isComplete: true, lessonStructure: [{ count: 3, periods: 1 }] },
            { name: 'Religious Education Activities', code: 'CRE-LP', departmentId: defaultDeptId, description: 'Lower Primary CBE Religious Education Activities (CRE/IRE)', isComplete: true, lessonStructure: [{ count: 3, periods: 1 }] },
            { name: 'Movement & Creative Activities', code: 'CREAT-LP', departmentId: defaultDeptId, description: 'Lower Primary CBE Movement & Creative Activities (Art, Music, PE)', isComplete: true, lessonStructure: [{ count: 5, periods: 1 }] },

            // Upper Primary (Grade 4-6) & Junior School
            { name: 'Mathematics', code: 'MATH-UP', departmentId: defaultDeptId, description: 'Upper Primary CBE Mathematics (Grade 4-6)', isComplete: true, lessonStructure: [{ count: 5, periods: 1 }] },
            { name: 'English', code: 'ENG-UP', departmentId: defaultDeptId, description: 'Upper Primary CBE English Language (Grade 4-6)', isComplete: true, lessonStructure: [{ count: 5, periods: 1 }] },
            { name: 'Kiswahili', code: 'KISW-UP', departmentId: defaultDeptId, description: 'Upper Primary CBE Kiswahili / Sign Language (Grade 4-6)', isComplete: true, lessonStructure: [{ count: 4, periods: 1 }] },
            { name: 'Science & Technology', code: 'SCI-TECH', departmentId: defaultDeptId, description: 'Upper Primary CBE Science and Technology (Grade 4-6)', isComplete: true, lessonStructure: [{ count: 4, periods: 1 }] },
            { name: 'Social Studies', code: 'SOC-ST', departmentId: defaultDeptId, description: 'Upper Primary CBE Social Studies & Citizenship (Grade 4-6)', isComplete: true, lessonStructure: [{ count: 3, periods: 1 }] },
            { name: 'Agriculture & Nutrition', code: 'AGRI-NUT', departmentId: defaultDeptId, description: 'Upper Primary CBE Agriculture & Home Science (Grade 4-6)', isComplete: true, lessonStructure: [{ count: 4, periods: 1 }] },
            { name: 'Creative Arts', code: 'CREAT-ARTS', departmentId: defaultDeptId, description: 'Upper Primary CBE Creative Arts (Art, Craft & Music)', isComplete: true, lessonStructure: [{ count: 3, periods: 1 }] },
            { name: 'Physical & Health Education (PHE)', code: 'PHE', departmentId: defaultDeptId, description: 'Upper Primary CBE Physical & Health Education (Grade 4-6)', isComplete: true, lessonStructure: [{ count: 3, periods: 1 }] },
            { name: 'Christian Religious Education (CRE)', code: 'CRE-UP', departmentId: defaultDeptId, description: 'Upper Primary CBE Religious Education (CRE)', isComplete: true, lessonStructure: [{ count: 3, periods: 1 }] },
            { name: 'Islamic Religious Education (IRE)', code: 'IRE-UP', departmentId: defaultDeptId, description: 'Upper Primary CBE Religious Education (IRE)', isComplete: true, lessonStructure: [{ count: 3, periods: 1 }] },
            { name: 'Pastoral Instruction Programme (PIP)', code: 'PIP', departmentId: defaultDeptId, description: 'Upper Primary Pastoral Instruction (PIP)', isComplete: true, lessonStructure: [{ count: 1, periods: 1 }] }
        ];

        if (onImportSubjectsAndAssociate) {
            // Preferred: bulk import with course-level association
            await onImportSubjectsAndAssociate(primarySubjects as any);
        } else if (onAddSubject) {
            // Fallback: add subjects one by one via parent handler
            for (const subj of primarySubjects) {
                onAddSubject(subj);
            }
        } else {
            // Last resort: save directly via apiService (works in any view)
            const instId = currentInstitution?.id;
            if (!instId) {
                alert('Institution ID not found. Please ensure you are logged in correctly.');
                return;
            }
            const newlyCreated: Subject[] = [];
            for (const subj of primarySubjects) {
                const newId = `sub_cbe_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
                const fullSubject: Subject = { ...subj, id: newId, institutionId: instId } as Subject;
                await apiService.saveSubject(fullSubject);
                newlyCreated.push(fullSubject);
            }
            // Immediately surface them in the local list without waiting for parent state refresh
            setLocallyAddedSubjects(prev => [...prev, ...newlyCreated]);
        }

        alert(`✨ Successfully pre-populated ${primarySubjects.length} Kenya CBE Primary School Subjects!`);
    };

    return (
        <div className="space-y-6">
            {/* Primary School CBC/CBE Pre-populate Prompt Banner */}
            {isPrimarySchool && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-3xl shadow-lg border border-emerald-500/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 animate-fade-in">
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/30">
                                🇰🇪 Kenya Primary School CBE Framework
                            </span>
                        </div>
                        <h4 className="text-lg font-black uppercase tracking-tight mt-2 flex items-center gap-2">
                            Pre-populate Kenya Primary CBE Curriculum Subjects
                        </h4>
                        <p className="text-xs text-emerald-100 mt-1">
                            Registered Primary Institution detected. Automatically populate official Kenya CBE Lower & Upper Primary learning areas (Mathematics Activities, Science & Tech, Environmental Activities, Creative Arts & PHE).
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={handlePrepopulateKenyaCBESubjects}
                        className="px-6 py-3 bg-white text-emerald-800 hover:bg-emerald-50 font-black text-xs uppercase tracking-wider rounded-2xl shadow-md transition-all whitespace-nowrap cursor-pointer hover:scale-105 active:scale-95"
                    >
                        ✨ Load Kenya CBE Subjects
                    </button>
                </div>
            )}

            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{isChurch ? 'Ministries' : 'Academic Subjects'}</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{isChurch ? 'Ministry Registry Control' : 'Curriculum Registry Control'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 min-w-fit">
                    <button
                        onClick={() => setIsClassAllocationOpen(true)}
                        className="btn-secondary h-11 flex items-center gap-2 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm text-indigo-600 dark:text-indigo-400"
                    >
                        <BookOpenIcon className="w-5 h-5 text-indigo-500" /> Manage Subjects per Class
                    </button>

                    <button
                        type="button"
                        onClick={handlePrepopulateKenyaCBESubjects}
                        className="btn-secondary h-11 flex items-center gap-2 px-6 text-[10px] font-black uppercase tracking-widest hover:border-emerald-300 transition-all shadow-sm text-emerald-600 dark:text-emerald-400"
                    >
                        <SparklesIcon className="w-5 h-5 text-emerald-500" /> Kenya CBE Primary
                    </button>

                    <button
                        onClick={() => setIsPathwaySyncOpen(true)}
                        className="btn-secondary h-11 flex items-center gap-2 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm"
                    >
                        <ArrowsRightLeftIcon className="w-5 h-5 text-indigo-500" /> Pathway Sync
                    </button>

                    <button
                        onClick={() => setIsBulkStructureOpen(true)}
                        className="btn-secondary h-11 flex items-center gap-2 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm"
                    >
                        <ClockIcon className="w-5 h-5 text-indigo-500" /> Default Matrix
                    </button>

                    <button
                        onClick={() => setIsSmartImportOpen(true)}
                        disabled={!onImportSubjectsAndAssociate}
                        className="btn-secondary h-11 flex items-center gap-2 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm disabled:opacity-50"
                    >
                        <SparklesIcon className="w-5 h-5 text-indigo-500" />
                        Smart Import
                    </button>

                    {onAddSubject && (
                        <button
                            onClick={() => {
                                const defaultDeptId = visibleDepartments[0]?.id || (departments.length > 0 ? departments[0].id : '');
                                setEditingSubject({
                                    id: '',
                                    name: '',
                                    code: '',
                                    departmentId: defaultDeptId,
                                    institutionId: '',
                                    lessonStructure: [],
                                    description: '',
                                    isComplete: false
                                } as Subject);
                            }}
                            className="btn-primary h-11 flex items-center gap-2 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100"
                        >
                            <PlusIcon className="w-5 h-5" /> New {isChurch ? 'Ministry' : 'Subject'}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="relative">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Keyword Search</label>
                    <div className="relative">
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Code or title..." className="form-input pl-10" />
                        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    </div>
                </div>

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Class Stream Filter</label>
                    <select value={classFilter} onChange={e => setClassFilter(e.target.value)} className="form-select text-indigo-600 dark:text-indigo-400 font-bold">
                        <option value="all">All Classes (Full Registry)</option>
                        {classOptions.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {departments.length > 0 && (
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Department Filter</label>
                        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="form-select" disabled={currentUser.role === 'tto'}>
                            <option value="all">All Departments</option>
                            {visibleDepartments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                )}

                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Learning Status</label>
                    <select value={completionFilter} onChange={e => setCompletionFilter(e.target.value as any)} className="form-select">
                        <option value="all">All Units</option>
                        <option value="incomplete">Active Only</option>
                        <option value="complete">Concluded Only</option>
                    </select>
                </div>
            </div>

            {/* Group by Level toggle (for Primary CBE schools) */}
            {isPrimarySchool && (
                <div className="flex items-center justify-end gap-3">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">View Mode:</span>
                    <button
                        onClick={() => setGroupByLevel(false)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            !groupByLevel ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                        Flat List
                    </button>
                    <button
                        onClick={() => setGroupByLevel(true)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            groupByLevel ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                        🏫 Group by Level
                    </button>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 overflow-x-auto">
                {groupByLevel && isPrimarySchool ? (() => {
                    // Classify subjects into CBE grade level buckets
                    const LOWER_PRIMARY_CODES = ['MATH-LP','ENG-LP','KISW-LP','ENV-LP','HYG-LP','CRE-LP','CREAT-LP'];
                    const UPPER_PRIMARY_CODES = ['MATH-UP','ENG-UP','KISW-UP','SCI-TECH','SOC-ST','AGRI-NUT','CREAT-ARTS','PHE','CRE-UP','IRE-UP','PIP'];
                    const groups: { label: string; badge: string; color: string; subjects: Subject[] }[] = [
                        {
                            label: 'Lower Primary — Grade 1 to 3',
                            badge: 'Grade 1–3',
                            color: 'from-sky-500 to-blue-600',
                            subjects: filteredSubjects.filter(s => LOWER_PRIMARY_CODES.includes(s.code))
                        },
                        {
                            label: 'Upper Primary — Grade 4 to 6',
                            badge: 'Grade 4–6',
                            color: 'from-violet-500 to-indigo-600',
                            subjects: filteredSubjects.filter(s => UPPER_PRIMARY_CODES.includes(s.code))
                        },
                        {
                            label: 'Other Subjects',
                            badge: 'Other',
                            color: 'from-slate-500 to-slate-600',
                            subjects: filteredSubjects.filter(s => !LOWER_PRIMARY_CODES.includes(s.code) && !UPPER_PRIMARY_CODES.includes(s.code))
                        }
                    ].filter(g => g.subjects.length > 0);

                    const toggleGroup = (label: string) => {
                        setCollapsedGroups(prev => {
                            const next = new Set(prev);
                            next.has(label) ? next.delete(label) : next.add(label);
                            return next;
                        });
                    };

                    return (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800">
                            {groups.map(group => (
                                <div key={group.label}>
                                    {/* Group header */}
                                    <button
                                        onClick={() => toggleGroup(group.label)}
                                        className={`w-full flex items-center justify-between px-8 py-4 bg-gradient-to-r ${group.color} text-white hover:brightness-110 transition-all`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-white/30">
                                                {group.badge}
                                            </span>
                                            <span className="text-sm font-black uppercase tracking-tight">{group.label}</span>
                                            <span className="text-xs font-bold opacity-70">({group.subjects.length} subjects)</span>
                                        </div>
                                        <span className="text-white text-lg font-black">{collapsedGroups.has(group.label) ? '▶' : '▼'}</span>
                                    </button>
                                    {/* Group rows */}
                                    {!collapsedGroups.has(group.label) && (
                                        <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {group.subjects.map(subject => (
                                                    <tr key={subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                                        <td className="px-8 py-4 whitespace-nowrap text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono uppercase w-32">
                                                            {highlightMatch(subject.code, searchQuery)}
                                                        </td>
                                                        <td className="px-8 py-4 whitespace-nowrap">
                                                            <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">{highlightMatch(subject.name, searchQuery)}</div>
                                                            {subject.description && <p className="text-[10px] text-slate-400 mt-0.5 max-w-xs truncate">{subject.description}</p>}
                                                        </td>
                                                        <td className="px-8 py-4 whitespace-nowrap text-[11px] font-black text-slate-500 uppercase">
                                                            {formatLessonStructure(subject.lessonStructure)}
                                                        </td>
                                                        <td className="px-8 py-4 whitespace-nowrap text-right">
                                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <button onClick={() => setEditingSubject(subject)} className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Edit</button>
                                                                <button onClick={async () => { if (window.confirm(`Archive ${subject.name}?`)) { await onDeleteSubject?.(subject.id); setLocallyAddedSubjects(prev => prev.filter(s => s.id !== subject.id)); } }} className="px-4 py-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Archive</button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            ))}
                        </div>
                    );
                })() : (
                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                        <tr>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Code</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{isChurch ? 'Ministry Name' : 'Subject Title'}</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Instruction Matrix</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredSubjects.map(subject => (
                            <tr key={subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                <td className="px-8 py-5 whitespace-nowrap text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono uppercase">
                                    {highlightMatch(subject.code, searchQuery)}
                                </td>
                                <td className="px-8 py-5 whitespace-nowrap">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                        {highlightMatch(subject.name, searchQuery)}
                                    </div>
                                    {!isSchool && <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{visibleDepartments.find(d => d.id === subject.departmentId)?.name}</p>}
                                </td>
                                <td className="px-8 py-5 whitespace-nowrap text-[11px] font-black text-slate-500 uppercase">
                                    {formatLessonStructure(subject.lessonStructure)}
                                </td>
                                <td className="px-8 py-5 whitespace-nowrap text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setConstraintSubject(subject)} className="px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1">
                                            <ClockIcon className="w-4 h-4" /> Time Off
                                        </button>
                                        <button onClick={() => setEditingSubject(subject)} className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Edit Registry</button>
                                        <button
                                            onClick={async () => {
                                                if (window.confirm(`Archive ${subject.name}?`)) {
                                                    await onDeleteSubject?.(subject.id);
                                                    onLogAction?.(`Archived subject record: ${subject.name}`);
                                                }
                                            }}
                                            className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                        >
                                            Archive
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                )}
            </div>

            {isPathwaySyncOpen && createPortal(
                <PathwayUpdateModal
                    onClose={() => setIsPathwaySyncOpen(false)}
                    departments={visibleDepartments}
                    subjects={subjects}
                    onBulkUpdate={handleBulkPathwayUpdate}
                />,
                document.body
            )}

            {isSmartImportOpen && onImportSubjectsAndAssociate && createPortal(
                <SmartSubjectImporterModal
                    onClose={() => setIsSmartImportOpen(false)}
                    onImport={onImportSubjectsAndAssociate}
                    existingSubjects={subjects}
                    departments={departments}
                    courses={courses}
                    aiModelTier={currentInstitution?.aiModelTier}
                    currentUserDepartmentId={currentUser.departmentId}
                />,
                document.body
            )}

            {editingSubject && createPortal(
                <EditSubjectModal
                    subject={editingSubject}
                    departments={visibleDepartments}
                    rooms={rooms}
                    courses={courses}
                    onClose={() => setEditingSubject(null)}
                    onSave={handleSaveSubject}
                    onAssociateSubjectToCourseLevel={onAssociateSubjectToCourseLevel!}
                    onDisassociateSubjectFromCourseLevel={onDisassociateSubjectFromCourseLevel!}
                    currentInstitution={currentInstitution}
                    timetableSettings={timetableSettings}
                    onSaveTimetableSettings={onSaveTimetableSettings!}
                    subjects={subjects}
                    onDeleteSubject={onDeleteSubject}
                    currentUser={currentUser}
                    onUpdateCourse={onUpdateCourse}
                />,
                document.body
            )}

            {constraintSubject && createPortal(
                <SubjectConstraintsModal
                    subject={constraintSubject}
                    timetableSettings={timetableSettings}
                    onSaveTimetableSettings={onSaveTimetableSettings!}
                    onClose={() => setConstraintSubject(null)}
                />,
                document.body
            )}

            {isBulkStructureOpen && createPortal(
                <BulkSubjectStructureModal
                    onClose={() => setIsBulkStructureOpen(false)}
                    departments={visibleDepartments}
                    subjects={subjects}
                    onBulkUpdate={handleBulkPathwayUpdate}
                />,
                document.body
            )}

            {isClassAllocationOpen && createPortal(
                <ClassSubjectAllocationModal
                    onClose={() => setIsClassAllocationOpen(false)}
                    subjects={subjects}
                    courses={courses}
                    classOptions={classOptions}
                    currentInstitution={currentInstitution}
                    onUpdateSubject={onUpdateSubject}
                    onUpdateCourse={onUpdateCourse}
                />,
                document.body
            )}
        </div>
    );
};
