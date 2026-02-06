
import React, { useState, useMemo } from 'react';
import type { Department, Subject, TimetableSettings, LessonStructure, LetterheadConfig, Room, Building, Course, Institution, User } from '../types.ts';
import { PlusIcon, XIcon, ArrowsRightLeftIcon, MagnifyingGlassIcon, SparklesIcon, CheckCircleIcon, ArrowUpTrayIcon, InformationCircleIcon } from './icons/index.ts';
import { generatePastelColor } from '../utils/colorUtils.ts';
import { EditSubjectModal } from './EditSubjectModal.tsx';
import { PathwayUpdateModal } from './PathwayUpdateModal.tsx';
import { analyzeSubjectSpreadsheet } from '../services/geminiService.ts';

declare var XLSX: any;

const highlightMatch = (text: string, query: string) => {
    const trimmed = (query || "").trim();
    if (!trimmed) {
        return <>{text}</>;
    }
    try {
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escaped})`, 'gi');
        const parts = text.split(regex);
        return (
            <>
                {parts.map((part, index) => {
                    if (index % 2 === 1) {
                        return <mark key={index} className="bg-yellow-200 dark:bg-yellow-700/50 px-0 py-0 rounded">{part}</mark>;
                    }
                    return <React.Fragment key={index}>{part}</React.Fragment>;
                })}
            </>
        );
    } catch(e) { 
        return <>{text}</>; 
    }
};

const formatLessonStructure = (structure: LessonStructure[] | undefined): string => {
    if (!structure || !Array.isArray(structure) || structure.length === 0) return 'N/A';
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

const parseLessonStructure = (str: string): LessonStructure[] => {
    const parts = str.split(',').map(s => s.trim());
    const structures: LessonStructure[] = [];
    parts.forEach(p => {
        const match = p.match(/(\d+)x\s*(\w+)/i);
        if (match) {
            const count = parseInt(match[1]);
            const type = match[2].toLowerCase();
            let periods = 1;
            if (type.includes('double')) periods = 2;
            else if (type.includes('triple')) periods = 3;
            else if (type.includes('period') && /\d/.test(type)) periods = parseInt(type.replace(/\D/g,'')) || 1;
            
            structures.push({ count, periods });
        }
    });
    if (structures.length === 0) return [{ count: 1, periods: 1 }]; 
    return structures;
}

const SmartSubjectImporterModal: React.FC<{
    onClose: () => void;
    onImport: (subjects: (Omit<Subject, 'id' | 'institutionId'> & { targetCourseLevelId?: string })[]) => Promise<void>;
    departments: Department[];
    courses: Course[];
}> = ({ onClose, onImport, departments, courses }) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'success'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string | null>>({});
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [rawData, setRawData] = useState<any[]>([]);

    const departmentMap = useMemo(() => new Map(departments.map(d => [d.name.toLowerCase().trim(), d.id])), [departments]);
    const courseLevelMap = useMemo(() => {
        const map = new Map<string, string>();
        courses.forEach(c => {
            c.levels.forEach(l => {
                map.set(`${c.name} ${l.name}`.toLowerCase().trim(), l.id);
                map.set(l.name.toLowerCase().trim(), l.id); 
            });
        });
        return map;
    }, [courses]);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: 'array' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
                const headers = data[0];
                setFileHeaders(headers);
                setRawData(XLSX.utils.sheet_to_json(ws));
                
                const aiMapping = await analyzeSubjectSpreadsheet(headers);
                setMapping(aiMapping);
                setStep('mapping');
            };
            reader.readAsArrayBuffer(e.target.files[0]);
        }
    };

    const handleConfirmMapping = () => {
        const mapped = rawData.map(row => {
            const name = row[mapping['name'] || ''];
            if (!name) return null;
            
            const deptName = String(row[mapping['departmentName'] || ''] || '').toLowerCase().trim();
            const deptId = departmentMap.get(deptName) || (departments.length > 0 ? departments[0].id : '');
            
            const levelName = String(row[mapping['targetCourseLevel'] || ''] || '').toLowerCase().trim();
            const levelId = courseLevelMap.get(levelName);

            const structureStr = String(row[mapping['lessonStructure'] || ''] || '');
            const lessonStructure = structureStr ? parseLessonStructure(structureStr) : [{ count: 1, periods: 1 }];

            return { 
                name: String(name).trim(),
                code: String(row[mapping['code'] || ''] || name.substring(0,3).toUpperCase()).trim(),
                departmentId: deptId,
                description: String(row[mapping['description'] || ''] || ''),
                shortName: String(row[mapping['shortName'] || ''] || ''),
                lessonStructure,
                targetCourseLevelId: levelId
            };
        }).filter(Boolean);
        setParsedData(mapped);
        setStep('preview');
    };

    const handleFinalImport = async () => {
        setStep('importing');
        await onImport(parsedData);
        setStep('success');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
             <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <SparklesIcon className="w-5 h-5 text-indigo-500"/> Import Subjects
                    </h3>
                    <button onClick={onClose}><XIcon className="w-5 h-5"/></button>
                </div>
                <div className="p-6">
                    {step === 'upload' && (
                        <div className="text-center p-8 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl">
                            <ArrowUpTrayIcon className="w-12 h-12 mx-auto text-slate-400 mb-4"/>
                            <p className="text-sm text-slate-500 mb-4">Upload Excel (.xlsx) file</p>
                            <input type="file" onChange={handleFileSelect} accept=".xlsx, .xls" className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"/>
                        </div>
                    )}
                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Confirm Column Mapping</p>
                            {['name', 'code', 'departmentName', 'lessonStructure'].map(f => (
                                <div key={f} className="flex items-center gap-4">
                                    <label className="w-32 text-xs font-bold uppercase text-slate-500">{f.replace(/([A-Z])/g, ' $1')}</label>
                                    <select value={mapping[f] || ''} onChange={e => setMapping({...mapping, [f]: e.target.value})} className="form-select flex-grow h-9 text-xs">
                                        <option value="">-- Select Column --</option>
                                        {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                </div>
                            ))}
                            <button onClick={handleConfirmMapping} className="btn-primary w-full mt-4">Review Preview</button>
                        </div>
                    )}
                    {step === 'preview' && (
                        <div className="space-y-4">
                            <p className="text-sm text-slate-600 dark:text-slate-300">Ready to import {parsedData.length} subjects.</p>
                            <div className="max-h-40 overflow-y-auto border rounded-lg p-2 bg-slate-50 dark:bg-slate-900">
                                {parsedData.slice(0, 5).map((d, i) => (
                                    <div key={i} className="text-xs p-1 border-b last:border-0 flex justify-between">
                                        <span className="font-bold">{d.code}</span>
                                        <span>{d.name}</span>
                                    </div>
                                ))}
                            </div>
                            <button onClick={handleFinalImport} className="btn-primary w-full">Import Now</button>
                        </div>
                    )}
                    {step === 'importing' && (
                        <div className="text-center py-8">
                            <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Importing...</p>
                        </div>
                    )}
                    {step === 'success' && (
                        <div className="text-center py-8">
                            <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                            <h4 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">Import Successful!</h4>
                            <p className="text-sm text-slate-500 mb-6">{parsedData.length} subjects added.</p>
                            <button onClick={onClose} className="btn-primary w-full">Close</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
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
}

export const SubjectManager: React.FC<SubjectManagerProps> = ({
    subjects = [], departments = [], onAddSubject, onUpdateSubject, onDeleteSubject, currentInstitution, courses = [], onImportSubjectsAndAssociate,
    onAssociateSubjectToCourseLevel, onDisassociateSubjectFromCourseLevel, timetableSettings, onSaveTimetableSettings, rooms = [], currentUser, onUpdateCourse
}) => {
    const [isPathwaySyncOpen, setIsPathwaySyncOpen] = useState(false);
    const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';

    const visibleDepartments = useMemo(() => {
        const allDepts = Array.isArray(departments) ? departments : [];
        if (currentUser.role === 'tto' && currentUser.departmentId) return allDepts.filter(d => d.id === currentUser.departmentId);
        return allDepts;
    }, [departments, currentUser]);

    const filteredSubjects = useMemo(() => {
        let list = Array.isArray(subjects) ? subjects : [];
        if (currentUser.role === 'tto' && currentUser.departmentId) list = list.filter(s => s.departmentId === currentUser.departmentId);
        return list.filter(s => {
            const matchesDept = isSchool ? true : departmentFilter === 'all' || s.departmentId === departmentFilter;
            const matchesComp = completionFilter === 'all' || (completionFilter === 'complete' && s.isComplete) || (completionFilter === 'incomplete' && !s.isComplete);
            const q = searchQuery.toLowerCase();
            const matchesSearch = s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q);
            return matchesDept && matchesComp && matchesSearch;
        });
    }, [subjects, searchQuery, departmentFilter, completionFilter, isSchool, currentUser.departmentId]);

    const handleSaveSubject = (id: string, data: any, initialCourseLevelIds?: string[]) => {
        if (id && onUpdateSubject) onUpdateSubject(id, data);
        else if (onAddSubject) onAddSubject(data, initialCourseLevelIds);
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
                    <h3 className="text-2xl font-black uppercase tracking-tighter">Academic Subjects</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Curriculum Registry Control ({filteredSubjects.length} Found)</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 min-w-fit">
                    {onImportSubjectsAndAssociate && (
                        <button 
                            type="button"
                            onClick={() => setIsSmartImportOpen(true)}
                            className="btn-secondary h-11 flex items-center gap-2 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm"
                        >
                            <SparklesIcon className="w-5 h-5 text-indigo-500"/> Smart Import
                        </button>
                    )}

                    <button 
                        type="button"
                        onClick={() => setIsPathwaySyncOpen(true)} 
                        className="btn-secondary h-11 flex items-center gap-2 px-6 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm"
                    >
                        <ArrowsRightLeftIcon className="w-5 h-5 text-indigo-500"/> Pathway Sync
                    </button>
                    
                    {onAddSubject && (
                        <button 
                            type="button"
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
                            <PlusIcon className="w-5 h-5"/> New Subject
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
                {!isSchool && (
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
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Subject Title</th>
                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Instruction Matrix</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredSubjects.map(subject => (
                            <tr key={subject.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                <td className="px-8 py-5 whitespace-nowrap text-sm font-black text-indigo-600 dark:text-indigo-400 font-mono uppercase">
                                    {highlightMatch(subject.code || "", searchQuery)}
                                </td>
                                <td className="px-8 py-5 whitespace-nowrap">
                                    <div className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight">
                                        {highlightMatch(subject.name || "", searchQuery)}
                                    </div>
                                    {!isSchool && <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{visibleDepartments.find(d => d.id === subject.departmentId)?.name}</p>}
                                </td>
                                <td className="px-8 py-5 whitespace-nowrap text-[11px] font-black text-slate-500 uppercase">
                                    {formatLessonStructure(subject.lessonStructure)}
                                </td>
                                <td className="px-8 py-5 whitespace-nowrap text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => setEditingSubject(subject)} className="px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Edit Registry</button>
                                        <button onClick={() => onDeleteSubject?.(subject.id)} className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">Archive</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                         {filteredSubjects.length === 0 && (
                            <tr>
                                <td colSpan={4} className="px-8 py-10 text-center text-sm font-bold text-slate-400 uppercase tracking-widest opacity-60">No subjects found matching your filters.</td>
                            </tr>
                        )}
                    </tbody>
                 </table>
            </div>

            {isPathwaySyncOpen && (
                <PathwayUpdateModal
                    onClose={() => setIsPathwaySyncOpen(false)}
                    departments={visibleDepartments}
                    subjects={subjects}
                    onBulkUpdate={handleBulkPathwayUpdate}
                />
            )}

            {isSmartImportOpen && onImportSubjectsAndAssociate && (
                <SmartSubjectImporterModal
                    onClose={() => setIsSmartImportOpen(false)}
                    onImport={onImportSubjectsAndAssociate}
                    departments={visibleDepartments}
                    courses={courses}
                />
            )}

            {editingSubject && (
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
                />
            )}
        </div>
    );
};
