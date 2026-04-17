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
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
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
    subjects, departments, onAddSubject, onUpdateSubject, onDeleteSubject, currentInstitution, courses, onImportSubjectsAndAssociate,
    onAssociateSubjectToCourseLevel, onDisassociateSubjectFromCourseLevel, timetableSettings, onSaveTimetableSettings, rooms, currentUser, onUpdateCourse,
    onLogAction
}) => {
    const [isPathwaySyncOpen, setIsPathwaySyncOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [constraintSubject, setConstraintSubject] = useState<Subject | null>(null);
    const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
    const [isBulkStructureOpen, setIsBulkStructureOpen] = useState(false);

    const isSchool = isSchoolInstitution(currentInstitution);
    const isChurch = currentInstitution?.institutionType === 'Church';

    const visibleDepartments = useMemo(() => {
        if (currentUser.role === 'tto' && currentUser.departmentId) return departments.filter(d => d.id === currentUser.departmentId);
        return departments;
    }, [departments, currentUser]);

    const filteredSubjects = useMemo(() => {
        let list = subjects;
        if (currentUser.role === 'tto' && currentUser.departmentId) list = list.filter(s => s.departmentId === currentUser.departmentId);
        return list.filter(s => {
            const matchesDept = departmentFilter === 'all' || s.departmentId === departmentFilter;
            const matchesComp = completionFilter === 'all' || (completionFilter === 'complete' && s.isComplete) || (completionFilter === 'incomplete' && !s.isComplete);
            const q = searchQuery.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
            return matchesDept && matchesComp && matchesSearch;
        });
    }, [subjects, searchQuery, departmentFilter, completionFilter, isSchool, currentUser.departmentId]);

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

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{isChurch ? 'Ministries' : 'Academic Subjects'}</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">{isChurch ? 'Ministry Registry Control' : 'Curriculum Registry Control'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 min-w-fit">
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

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="relative">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Keyword Search</label>
                    <div className="relative">
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Code or title..." className="form-input pl-10" />
                        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    </div>
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

            <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 overflow-x-auto">
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
        </div>
    );
};