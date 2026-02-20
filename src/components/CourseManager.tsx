
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Course, Department, Subject, User, CourseLevel, AcademicLevel, LetterheadConfig, Institution, Room, AllocationRequest, Priority, ScheduleProfile, TimetableConstraint, TimetableConstraintType, TimetableSettings, TimetableEntry, LessonStructure } from '../types';
import { PlusIcon, XIcon, CheckIcon, PrinterIcon, DocumentArrowDownIcon, SparklesIcon, AcademicCapIcon, ClipboardListIcon, CheckCircleIcon, MagnifyingGlassIcon, PencilIcon, ArchiveBoxIcon, BookOpenIcon, UserIcon, RectangleStackIcon, ArrowUpTrayIcon, ClockIcon, ArrowsRightLeftIcon, ListIcon, TrashIcon, ChartBarIcon, EyeIcon } from './icons/index';
import { analyzeCourseSpreadsheet } from '../services/geminiService';
import { ManageLessonsModal } from './ManageLessonsModal';
import { CourseProgressReport } from './CourseProgressReport';
import { PdfPreviewModal } from './PdfPreviewModal';

import * as XLSX from 'xlsx';

type CourseMappingField = 'name' | 'code' | 'departmentName' | 'academicLevelName';
const ALL_COURSE_MAPPING_FIELDS: CourseMappingField[] = ['name', 'code', 'departmentName', 'academicLevelName'];
const REQUIRED_COURSE_MAPPING_FIELDS: CourseMappingField[] = ['name', 'code', 'departmentName', 'academicLevelName'];

const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(word => word[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
};

const SmartCourseImporterModal: React.FC<{
    onClose: () => void;
    onImport: (courses: Omit<Course, 'id' | 'institutionId'>[]) => Promise<void>;
    existingCourses: Course[];
    departments: Department[];
    academicLevels: AcademicLevel[];
    isSchool: boolean;
    aiModelTier?: string;
    onLogAction?: (action: string) => Promise<void>;
}> = ({ onClose, onImport, existingCourses, departments, academicLevels, isSchool, aiModelTier, onLogAction }) => {
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'finalizing' | 'success' | 'error'>('upload');
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [userMapping, setUserMapping] = useState<Record<CourseMappingField, string | null>>(ALL_COURSE_MAPPING_FIELDS.reduce((acc, field) => ({ ...acc, [field]: null }), {} as Record<CourseMappingField, string | null>));
    const [parsedData, setParsedData] = useState<{ valid: Omit<Course, 'id' | 'institutionId'>[], invalid: { row: any, error: string }[] } | null>(null);
    const [errorMessage, setErrorMessage] = useState('');
    const [rawData, setRawData] = useState<any[]>([]);
    const [importProgress, setImportProgress] = useState(0);

    const departmentNameMap = useMemo(() => new Map((departments || []).map(d => [d.name.toLowerCase().trim(), d.id])), [departments]);
    const academicLevelNameMap = useMemo(() => new Map((academicLevels || []).map(l => [l.name.toLowerCase().trim(), l.id])), [academicLevels]);
    const existingCourseCodes = useMemo(() => new Set((existingCourses || []).map(c => c.code.toLowerCase().trim())), [existingCourses]);

    const handleFileSelect = (selectedFile: File) => {
        setStep('importing');
        setErrorMessage('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const jsonHeaders: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                if (jsonHeaders.length < 1) throw new Error("Spreadsheet is empty.");

                const headers = jsonHeaders[0].filter((h: any) => h != null && h !== '');
                setFileHeaders(headers);

                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                setRawData(jsonData);

                const mapping = await analyzeCourseSpreadsheet(headers, isSchool, aiModelTier);
                setUserMapping(mapping as Record<CourseMappingField, string | null>);
                setStep('mapping');
            } catch (error: any) {
                setErrorMessage(error.message || 'Failed to process spreadsheet.');
                setStep('error');
            }
        };
        reader.readAsArrayBuffer(selectedFile);
    };

    const handleMappingChange = (field: CourseMappingField, value: string | null) => {
        setUserMapping(prev => ({ ...prev!, [field]: value }));
    };

    const handleConfirmMapping = () => {
        if (!userMapping) return;

        const missingFields = REQUIRED_COURSE_MAPPING_FIELDS.filter(f => !userMapping[f]);
        if (missingFields.length > 0) {
            alert(`Please map: ${missingFields.map(f => f.replace(/([A-Z])/g, ' $1')).join(', ')}.`);
            return;
        }

        setStep('importing');

        const validCourses: Omit<Course, 'id' | 'institutionId'>[] = [];
        const invalidRows: { row: any, error: string }[] = [];
        const currentBatchCodes = new Set<string>();

        (rawData || []).forEach((row, index) => {
            try {
                const name = row[userMapping.name!];
                const code = row[userMapping.code!];
                const departmentName = row[userMapping.departmentName!];
                const academicLevelName = row[userMapping.academicLevelName!];

                if (!name || !code || !departmentName || !academicLevelName) {
                    throw new Error("Missing required fields.");
                }

                const deptId = departmentNameMap.get(String(departmentName).toLowerCase().trim());
                if (!deptId) throw new Error(`Department "${departmentName}" not found.`);

                const levelId = academicLevelNameMap.get(String(academicLevelName).toLowerCase().trim());
                if (!levelId) throw new Error(`Academic Level "${academicLevelName}" not found.`);

                if (existingCourseCodes.has(String(code).toLowerCase().trim()) || currentBatchCodes.has(String(code).toLowerCase().trim())) {
                    throw new Error(`Course code "${code}" already exists.`);
                }
                currentBatchCodes.add(String(code).toLowerCase().trim());

                validCourses.push({
                    name: String(name).trim(),
                    code: String(code).trim(),
                    departmentId: deptId,
                    academicLevelId: levelId,
                    shortName: '',
                    levels: []
                });

            } catch (e: any) {
                invalidRows.push({ row, error: e.message });
            }
        });

        setParsedData({ valid: validCourses, invalid: invalidRows });
        setStep('preview');
    };

    const handleFinalImport = async () => {
        if (!parsedData?.valid) return;
        setStep('finalizing');
        setImportProgress(0);

        try {
            await onImport(parsedData.valid);
            onLogAction?.(`Bulk imported ${parsedData.valid.length} curriculum records`);
            setImportProgress(100);
            setStep('success');
        } catch (err: any) {
            console.error("Import failure:", err);
            setErrorMessage(err.message || "Failed to save course data to the database.");
            setStep('error');
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-[70] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <h3 className="text-xl font-black uppercase tracking-tight">Smart Registry Importer</h3>
                    {step !== 'finalizing' && <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>}
                </div>

                <div className="p-8 flex-grow overflow-y-auto">
                    {step === 'upload' && (
                        <div className="text-center p-12 border-4 border-dashed border-slate-200 dark:border-slate-700 rounded-[2.5rem] bg-slate-50 dark:bg-slate-900/20">
                            <ArrowUpTrayIcon className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h4 className="text-lg font-bold mb-2">Upload Excel Spreadsheet</h4>
                            <p className="text-sm text-slate-500 mb-8">Select an Excel (.xlsx) or CSV file with your curriculum data.</p>
                            <label className="btn-primary cursor-pointer px-10 py-3 inline-block shadow-lg shadow-indigo-100">
                                Select File
                                <input type="file" onChange={e => e.target.files && e.target.files[0] && handleFileSelect(e.target.files[0])} accept=".xlsx, .xls, .csv" className="hidden" />
                            </label>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-2 mb-4">
                                <SparklesIcon className="w-6 h-6 text-indigo-500" />
                                <h4 className="font-bold text-lg">Map Your Data Columns</h4>
                            </div>
                            <div className="grid grid-cols-1 gap-4">
                                {ALL_COURSE_MAPPING_FIELDS.map(field => (
                                    <div key={field} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                        <label className="text-sm font-bold capitalize text-slate-700 dark:text-slate-300">
                                            {field.replace(/([A-Z])/g, ' $1')}
                                        </label>
                                        <select value={userMapping[field] || ''} onChange={e => handleMappingChange(field, e.target.value || null)} className="form-select sm:w-64">
                                            <option value="">-- Choose Header --</option>
                                            {fileHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-end pt-4">
                                <button onClick={handleConfirmMapping} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-200">Review Import</button>
                            </div>
                        </div>
                    )}

                    {step === 'preview' && (
                        <div className="space-y-6 animate-fade-in-up">
                            <h4 className="font-black text-xl tracking-tight">Ready to Import ({parsedData?.valid.length})</h4>
                            <div className="overflow-hidden border border-slate-100 dark:border-slate-700 rounded-2xl">
                                <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                                    <thead className="bg-slate-50 dark:bg-slate-900/50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Name</th>
                                            <th className="px-6 py-3 text-left text-[10px] font-black uppercase text-slate-500 tracking-widest">Code</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                        {parsedData?.valid.slice(0, 5).map((v, i) => (
                                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                                <td className="px-6 py-3 text-sm font-bold">{v.name}</td>
                                                <td className="px-6 py-3 text-sm font-mono text-indigo-600 dark:text-indigo-400">{v.code}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex justify-end pt-4 gap-3">
                                <button onClick={() => setStep('mapping')} className="btn-secondary">Back to Mapping</button>
                                <button onClick={handleFinalImport} className="btn-primary px-10 h-12 shadow-lg shadow-indigo-200">Commit to Database</button>
                            </div>
                        </div>
                    )}

                    {step === 'finalizing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold mb-2">Syncing institutional records...</h4>
                            <p className="text-sm text-slate-500">Connecting to cloud infrastructure</p>
                        </div>
                    )}

                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-pulse">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                            <h4 className="text-xl font-bold mb-2">Analyzing Spreadsheet...</h4>
                            <p className="text-sm text-slate-500">AI is mapping your data structure</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-green-100 text-green-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-green-100">
                                <CheckCircleIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight mb-2 uppercase">Import Complete</h4>
                            <p className="text-slate-500 mb-10">All curriculum records have been successfully added.</p>
                            <button onClick={onClose} className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Return to Portal</button>
                        </div>
                    )}

                    {step === 'error' && (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
                            <div className="w-24 h-24 bg-red-100 text-red-600 rounded-[2rem] flex items-center justify-center mb-6 shadow-xl shadow-red-100">
                                <XIcon className="w-12 h-12" />
                            </div>
                            <h4 className="text-3xl font-black tracking-tight mb-2 uppercase text-red-600">Import Failed</h4>
                            <p className="text-slate-500 mb-10 max-w-md mx-auto">{errorMessage || "An unexpected error occurred during the import process."}</p>
                            <div className="flex gap-4">
                                <button onClick={() => setStep('upload')} className="btn-secondary h-12 px-8">Try Again</button>
                                <button onClick={onClose} className="btn-primary h-12 px-8 bg-slate-900 shadow-lg shadow-slate-200">Close</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

interface CourseManagerProps {
    courses: Course[];
    subjects: Subject[];
    departments: Department[];
    academicLevels: AcademicLevel[];
    letterheadConfig?: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    onAddCourse?: (courseData: Omit<Course, 'id' | 'institutionId'>) => void;
    onImportCourses?: (courses: Omit<Course, 'id' | 'institutionId'>[]) => Promise<void>;
    onUpdateCourse?: (courseId: string, updatedData: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
    onDeleteCourse?: (courseId: string) => void;
    onAssociateSubjectToCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onDisassociateSubjectFromCourseLevel?: (subjectId: string, courseLevelId: string) => void;
    onDirectAssign?: (lecturerId: string, subjectIds: string[], priority: Priority, justification: string, courseLevelSelections: Record<string, string[]>) => void;
    onWithdrawRequest?: (requestId: string) => void;
    onUpdateRequest?: (requestId: string, data: Partial<Omit<AllocationRequest, 'id'>>) => void;
    currentUser: User;
    currentInstitution?: Institution | null;
    rooms?: Room[];
    users?: User[];
    allocations?: AllocationRequest[];
    timetableSettings?: TimetableSettings;
    allTimetableEntries?: TimetableEntry[];
    onSaveTimetableSettings?: (settings: TimetableSettings) => void;
    onLogAction?: (action: string) => Promise<void>;
}

export const CourseManager: React.FC<CourseManagerProps> = ({
    courses = [], subjects = [], departments = [], academicLevels = [], letterheadConfig, logoUrl, footerImageUrl,
    onAddCourse, onUpdateCourse, onDeleteCourse, onImportCourses, onAssociateSubjectToCourseLevel, onDisassociateSubjectFromCourseLevel,
    onDirectAssign, onWithdrawRequest, onUpdateRequest,
    currentUser, currentInstitution,
    rooms = [], users = [], allocations = [], allTimetableEntries = [],
    timetableSettings, onSaveTimetableSettings, onLogAction
}) => {
    const [managerTab, setManagerTab] = useState<'courses' | 'streams' | 'pathways' | 'lessons'>('courses');
    const [isAdding, setIsAdding] = useState(false);
    const [isAddingStream, setIsAddingStream] = useState(false);
    const [isAddingLesson, setIsAddingLesson] = useState(false);
    const [isSmartImportOpen, setIsSmartImportOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<Course | null>(null);
    const [editingStream, setEditingStream] = useState<{ courseId: string, streamId: string, name: string, classTeacherId?: string, roomId?: string } | null>(null);
    const [assigningSubjectsTo, setAssigningSubjectsTo] = useState<Course | null>(null);
    const [managingLessonsFor, setManagingLessonsFor] = useState<User | null>(null);
    const [managingLessonsForCourse, setManagingLessonsForCourse] = useState<Course | null>(null);
    const [managingLessonsForStreamId, setManagingLessonsForStreamId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [departmentFilter, setDepartmentFilter] = useState('all');
    const [academicLevelFilter, setAcademicLevelFilter] = useState('all');
    const [deletingCourse, setDeletingCourse] = useState<{ id: string; name: string } | null>(null);

    const [newStreamCourseId, setNewStreamCourseId] = useState('');
    const [newStreamName, setNewStreamName] = useState('');
    const [newStreamRoomId, setNewStreamRoomId] = useState('');

    const [editingStructureFor, setEditingStructureFor] = useState<{ course: Course, level: CourseLevel, subject: Subject, currentStructure: LessonStructure[] } | null>(null);

    const [newLessonCourseId, setNewLessonCourseId] = useState('');
    const [newLessonLevelId, setNewLessonLevelId] = useState('');
    const [newLessonSubjectId, setNewLessonSubjectId] = useState('');
    const [newLessonStructure, setNewLessonStructure] = useState<string>('Single');

    // Pathway (Option Block) States
    const [selectedPathwayCourseId, setSelectedPathwayCourseId] = useState('');
    const [newPathwaySubjectIds, setNewPathwaySubjectIds] = useState<string[]>([]);
    const [pathwayProcessing, setPathwayProcessing] = useState(false);

    const [viewingProgressOf, setViewingProgressOf] = useState<Course | null>(null);
    const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
    const [previewPdfFilename, setPreviewPdfFilename] = useState<string | null>(null);

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';
    const isPrimary = currentInstitution?.institutionType === 'Primary';
    const isSecondary = currentInstitution?.institutionType === 'Secondary';
    const courseLabel = isSchool ? 'Grade' : 'Course';
    const streamOrLevelLabel = isSchool ? 'Stream' : 'Level';
    const streamOrLevelLabelPlural = isSchool ? 'Streams' : 'Levels';

    const visibleDepartments = useMemo(() => {
        if (currentUser?.role === 'tto' && currentUser?.departmentId) return (departments || []).filter(d => d.id === currentUser.departmentId);
        return departments || [];
    }, [departments, currentUser]);

    const pathwayConstraints = useMemo(() => {
        return (timetableSettings?.constraints || []).filter(c => c.type === 'same_time_subjects');
    }, [timetableSettings]);

    const getAdjustedItemCount = (itemIds: string[], constraints: TimetableConstraint[]) => {
        if (!itemIds || itemIds.length === 0) return 0;
        const accountedForIds = new Set<string>();
        let distinctCount = 0;
        constraints.forEach(c => {
            const blockMembersInList = c.subjectIds.filter(id => itemIds.includes(id));
            if (blockMembersInList.length > 0) {
                distinctCount += 1;
                blockMembersInList.forEach(id => accountedForIds.add(id));
            }
        });
        itemIds.forEach(id => {
            if (!accountedForIds.has(id)) {
                distinctCount += 1;
            }
        });
        return distinctCount;
    };

    const getAdjustedLessonCount = (lessons: any[], constraints: TimetableConstraint[]) => {
        if (!lessons || lessons.length === 0) return 0;
        let distinctCount = 0;
        const byLevel = new Map<string, any[]>();
        lessons.forEach(l => {
            if (!byLevel.has(l.levelId)) byLevel.set(l.levelId, []);
            byLevel.get(l.levelId)!.push(l);
        });
        byLevel.forEach((levelLessons) => {
            const accountedInLevel = new Set<string>();
            constraints.forEach(c => {
                const blockMembersInLevel = levelLessons.filter(l => c.subjectIds.includes(l.subjectId));
                if (blockMembersInLevel.length > 0) {
                    distinctCount += 1;
                    blockMembersInLevel.forEach(l => accountedInLevel.add(l.id));
                }
            });
            levelLessons.forEach(l => {
                if (!accountedInLevel.has(l.id)) {
                    distinctCount += 1;
                }
            });
        });
        return distinctCount;
    };

    const visibleCourses = useMemo(() => {
        if (currentUser?.role === 'tto' && currentUser?.departmentId) return (courses || []).filter(c => c.departmentId === currentUser.departmentId);
        return courses || [];
    }, [courses, currentUser]);

    const departmentMap = useMemo(() => new Map((departments || []).map(d => [d.id, d.name])), [departments]);
    const userMap = useMemo(() => new Map((users || []).map(u => [u.id, u.name])), [users]);
    const subjectMap = useMemo(() => new Map((subjects || []).map(s => [s.id, s])), [subjects]);

    const filteredCourses = useMemo(() => {
        return (visibleCourses || []).filter(course => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = (course.name || "").toLowerCase().includes(query) || (course.code || "").toLowerCase().includes(query);
            const matchesDept = departmentFilter === 'all' || course.departmentId === departmentFilter;
            const matchesLevel = academicLevelFilter === 'all' || course.academicLevelId === academicLevelFilter;
            return matchesSearch && matchesDept && matchesLevel;
        });
    }, [visibleCourses, searchQuery, departmentFilter, academicLevelFilter]);

    const allStreams = useMemo(() => {
        const streams: any[] = [];
        (visibleCourses || []).forEach(course => {
            (course.levels || []).forEach(level => {
                streams.push({
                    courseId: course.id,
                    courseName: course.name,
                    courseCode: course.code,
                    streamId: level.id,
                    streamName: level.name,
                    subjectCount: getAdjustedItemCount(level.subjectIds || [], pathwayConstraints),

                    departmentId: course.departmentId,
                    classTeacherId: level.classTeacherId,
                    roomId: level.roomId
                });
            });
        });
        return streams;
    }, [visibleCourses]);

    const filteredStreams = useMemo(() => {
        return (allStreams || []).filter(stream => {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                stream.streamName.toLowerCase().includes(query) ||
                stream.courseName.toLowerCase().includes(query) ||
                stream.courseCode.toLowerCase().includes(query);
            const matchesDept = departmentFilter === 'all' || stream.departmentId === departmentFilter;
            return matchesSearch && matchesDept;
        });
    }, [allStreams, searchQuery, departmentFilter]);

    const lessonsList = useMemo(() => {
        const lessons: any[] = [];
        (visibleCourses || []).forEach(course => {
            (course.levels || []).forEach(level => {
                (level.subjectIds || []).forEach(subjectId => {
                    const subject = subjectMap.get(subjectId);
                    if (subject) {
                        const relatedAllocations = (allocations || []).filter(a =>
                            a.subjectId === subject.id &&
                            a.status === 'approved' &&
                            (!a.courseLevelIds || a.courseLevelIds.length === 0 || a.courseLevelIds.includes(level.id))
                        );

                        const firstLecturerId = relatedAllocations[0]?.lecturerId;
                        const lecturersNames = relatedAllocations.map(a => userMap.get(a.lecturerId)).filter(Boolean).join(', ');

                        const meta = (level.subjectMetadata || []).find(m => m.subjectId === subject.id);
                        const structureSource = meta?.lessonStructure || subject.lessonStructure || [];
                        const structure = (structureSource)
                            .map(ls => `${ls.count}x ${ls.periods === 1 ? 'Single' : ls.periods === 2 ? 'Double' : ls.periods + ' Periods'}`).join(', ') || 'N/A';

                        lessons.push({
                            id: `${course.id}-${level.id}-${subject.id}`,
                            courseId: course.id,
                            levelId: level.id,
                            subjectId: subject.id,
                            subjectName: subject.name,
                            subjectCode: subject.code,
                            lecturer: lecturersNames || 'Unassigned',
                            lecturerId: firstLecturerId,
                            courseName: course.name,
                            levelName: level.name,
                            structure: structure,
                            isOverride: !!meta?.lessonStructure,
                            structureSource: structureSource,
                            departmentId: course.departmentId
                        });
                    }
                });
            });
        });
        return lessons;
    }, [visibleCourses, allocations, userMap, subjectMap]);

    const filteredLessons = useMemo(() => {
        return (lessonsList || []).filter(lesson => {
            const query = searchQuery.toLowerCase();
            const matchesSearch =
                lesson.subjectName.toLowerCase().includes(query) ||
                lesson.subjectCode.toLowerCase().includes(query) ||
                lesson.lecturer.toLowerCase().includes(query) ||
                lesson.courseName.toLowerCase().includes(query);

            const matchesDept = departmentFilter === 'all' || lesson.departmentId === departmentFilter;
            return matchesSearch && matchesDept;
        });
    }, [lessonsList, searchQuery, departmentFilter]);

    const handleAddStream = (e: React.FormEvent) => {
        e.preventDefault();
        const course = (courses || []).find(c => c.id === newStreamCourseId);
        if (course && newStreamName.trim()) {
            const newLevel: CourseLevel = {
                id: `stream_${Date.now()}`,
                name: newStreamName.trim(),
                subjectIds: [],
                roomId: newStreamRoomId || undefined
            };
            onUpdateCourse?.(course.id, { levels: [...(course.levels || []), newLevel] });
            setNewStreamName('');
            setNewStreamCourseId('');
            setIsAddingStream(false);
        }
    };

    const handleUpdateStream = () => {
        if (!editingStream) return;
        const course = courses.find(c => c.id === editingStream.courseId);
        if (!course) return;

        const updatedLevels = (course.levels || []).map(l =>
            l.id === editingStream.streamId ? { ...l, name: editingStream.name, classTeacherId: (editingStream as any).classTeacherId, roomId: (editingStream as any).roomId } : l
        );

        if (onUpdateCourse) {
            onUpdateCourse(course.id, { levels: updatedLevels });
            setEditingStream(null);
        }
    };

    const handleDeleteStream = (courseId: string, streamId: string) => {
        const course = (courses || []).find(c => c.id === courseId);
        if (course && window.confirm("Are you sure you want to delete this stream? This will remove all subject associations for this stream.")) {
            const updatedLevels = (course.levels || []).filter(l => l.id !== streamId);
            onUpdateCourse?.(courseId, { levels: updatedLevels });
        }
    };

    const handleUpdateCourseSubmit = (id: string, data: Partial<Omit<Course, 'id' | 'institutionId'>>) => {
        onUpdateCourse?.(id, data);
        setEditingCourse(null);
    };

    const handleStructureSave = (courseId: string, updatedLevels: CourseLevel[]) => {
        onUpdateCourse?.(courseId, { levels: updatedLevels });
    };

    const handleDeleteCourseSubmit = (courseId: string, courseName: string) => {
        setDeletingCourse({ id: courseId, name: courseName });
    };

    const handleSaveStructureOverride = (data: { lessonStructure?: LessonStructure[], dedicatedRoomId?: string }) => {
        if (!editingStructureFor) return;
        const { course, level, subject } = editingStructureFor;

        const currentMeta = level.subjectMetadata || [];
        const existingIndex = currentMeta.findIndex(m => m.subjectId === subject.id);

        let updatedMeta;
        if (existingIndex >= 0) {
            updatedMeta = [...currentMeta];
            updatedMeta[existingIndex] = { ...updatedMeta[existingIndex], ...data };
        } else {
            updatedMeta = [...currentMeta, { subjectId: subject.id, lessonStructure: data.lessonStructure || [], dedicatedRoomId: data.dedicatedRoomId }];
        }

        const updatedLevels = course.levels.map(l => l.id === level.id ? { ...l, subjectMetadata: updatedMeta } : l);
        handleStructureSave(course.id, updatedLevels);
        setEditingStructureFor(null);
    };

    const handleUpdateStructure = (structureString: string) => {
        if (!editingStructureFor) return;
        // Parse structure string e.g., "Single" -> [{ periods: 1, count: 1 }]
        let structure: LessonStructure[] = [];
        if (structureString === 'Single') structure = [{ periods: 1, count: 1 }];
        else if (structureString === 'Double') structure = [{ periods: 2, count: 1 }];
        else if (structureString === 'Triple') structure = [{ periods: 3, count: 1 }];
        else if (structureString === 'Quad') structure = [{ periods: 4, count: 1 }];
        else if (structureString === 'Double + Single') structure = [{ periods: 2, count: 1 }, { periods: 1, count: 1 }];
        else structure = [{ periods: 1, count: 1 }]; // Default

        handleSaveStructureOverride({ lessonStructure: structure });
    };

    const confirmDelete = async () => {
        if (deletingCourse && onDeleteCourse) {
            await onDeleteCourse(deletingCourse.id);
            onLogAction?.(`Archived curriculum record: ${deletingCourse.name}`);
            setDeletingCourse(null);
        }
    };

    const handleAddLessonSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newLessonSubjectId && newLessonLevelId && onAssociateSubjectToCourseLevel) {
            onAssociateSubjectToCourseLevel(newLessonSubjectId, newLessonLevelId);

            // Should also apply structure if not default
            if (newLessonStructure !== 'Single') {
                const course = managingLessonsForCourse;
                const level = course?.levels.find(l => l.id === newLessonLevelId);
                const subject = subjects.find(s => s.id === newLessonSubjectId);
                if (course && level && subject) {
                    // Defer structure update slightly to ensure association happens first (if async)
                    // or update local state immediately. 
                    // Since we don't have a direct "AssociateAndSetStructure", we'll simulate it by setting editingStructureFor
                    setEditingStructureFor({ course, level, subject, currentStructure: [] });
                    setTimeout(() => handleUpdateStructure(newLessonStructure), 100);
                }
            }

            setIsAddingLesson(false);
            setNewLessonCourseId('');
            setNewLessonLevelId('');
            setNewLessonSubjectId('');
            setNewLessonStructure('Single');
        }
    };

    const handleRemoveLesson = (lesson: any) => {
        if (window.confirm(`Are you sure you want to remove ${lesson.subjectName} from ${lesson.courseName} (${lesson.levelName})?`)) {
            onDisassociateSubjectFromCourseLevel?.(lesson.subjectId, lesson.levelId);
        }
    };

    const handleEditLesson = (lesson: any) => {
        if (lesson.lecturerId) {
            const teacher = (users || []).find(u => u.id === lesson.lecturerId);
            if (teacher) setManagingLessonsFor(teacher);
        } else {
            const course = (courses || []).find(c => c.id === lesson.courseId);
            if (course) setAssigningSubjectsTo(course);
        }
    };



    const handleAddPathway = () => {
        if (!selectedPathwayCourseId || newPathwaySubjectIds.length < 2 || !onSaveTimetableSettings) {
            alert("Please select a course and at least two subjects to create an option block.");
            return;
        }

        setPathwayProcessing(true);
        const subjectNames = newPathwaySubjectIds.map(id => (subjects || []).find(s => s && s.id === id)?.name || id).join(', ');
        const course = (courses || []).find(c => c && c.id === selectedPathwayCourseId);
        const description = `Option Block for ${course?.name || 'Academic Course'}: ${subjectNames}`;

        const newConstraint: TimetableConstraint = {
            id: `const_path_${Date.now()}`,
            type: 'same_time_subjects',
            subjectIds: newPathwaySubjectIds,
            description
        };

        const currentSettings = timetableSettings || {
            operatingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
            startTime: '08:00',
            endTime: '17:00',
            periods: [],
            periodLengthMinutes: 60,
            cellSpanMinutes: 60,
            maxPeriodsPerDay: 8,
            minWeeklyPeriods: 10,
            maxWeeklyPeriods: 40,
            breaks: [],
            constraints: []
        };

        const updatedSettings = {
            ...currentSettings,
            constraints: [...(currentSettings.constraints || []), newConstraint]
        };

        onSaveTimetableSettings(updatedSettings);
        setPathwayProcessing(false);
        setNewPathwaySubjectIds([]);
    };

    const handleDeletePathway = (constraintId: string) => {
        if (!onSaveTimetableSettings || !timetableSettings) return;
        const updatedSettings = {
            ...timetableSettings,
            constraints: (timetableSettings.constraints || []).filter(c => c.id !== constraintId)
        };
        onSaveTimetableSettings(updatedSettings);
    };

    const levelsForNewLesson = useMemo(() => {
        if (!newLessonCourseId) return [];
        return (courses || []).find(c => c.id === newLessonCourseId)?.levels || [];
    }, [newLessonCourseId, courses]);

    const subjectsForNewLesson = useMemo(() => {
        if (!newLessonCourseId) return subjects || [];
        const course = (courses || []).find(c => c.id === newLessonCourseId);
        if (!course) return subjects || [];
        // Relax filtering for schools or if department IDs are missing
        return (subjects || []).filter(s => isSchool || !course.departmentId || !s.departmentId || s.departmentId === course.departmentId);
    }, [newLessonCourseId, courses, subjects, isSchool]);

    const EditCourseModal: React.FC<{
        course: Course;
        departments: Department[];
        academicLevels: AcademicLevel[];
        onClose: () => void;
        onSave: (courseId: string, data: Partial<Omit<Course, 'id' | 'institutionId'>>) => void;
        currentUser: User;
        scheduleProfiles: ScheduleProfile[];
    }> = ({ course, departments, academicLevels, onClose, onSave, currentUser, scheduleProfiles }) => {
        const [formData, setFormData] = useState({
            name: course.name,
            code: course.code,
            shortName: course.shortName || '',
            departmentId: course.departmentId,
            academicLevelId: course.academicLevelId,
            scheduleProfileId: course.scheduleProfileId || '',
            curriculumType: course.curriculumType || '8-4-4'
        });

        const isRestricted = currentUser?.role === 'tto' && !!currentUser?.departmentId;

        useEffect(() => {
            setFormData({
                name: course.name,
                code: course.code,
                shortName: course.shortName || '',
                departmentId: course.departmentId,
                academicLevelId: course.academicLevelId,
                scheduleProfileId: course.scheduleProfileId || '',
                curriculumType: course.curriculumType || '8-4-4'
            });
        }, [course]);

        const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
            const { name, value } = e.target;
            setFormData(prev => ({ ...prev, [name]: value }));
        };

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            onSave(course.id, { ...formData, curriculumType: formData.curriculumType as '8-4-4' | 'CBC' | 'Other' });
        };

        return (
            <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                    <form onSubmit={handleSubmit}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                            <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tighter">Edit {courseLabel}: {course.name}</h3>
                        </div>
                        <div className="p-8 space-y-5 overflow-y-auto max-h-[60vh]">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">{courseLabel} Name</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="form-input" required />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">{courseLabel} Code</label>
                                    <input type="text" name="code" value={formData.code} onChange={handleChange} className="form-input font-mono font-bold text-indigo-600 dark:text-indigo-400" required />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Curriculum Type</label>
                                    <select name="curriculumType" value={formData.curriculumType} onChange={handleChange} className="form-select">
                                        <option value="8-4-4">8-4-4 System</option>
                                        <option value="CBC">CBC System</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Time Profile</label>
                                    <select name="scheduleProfileId" value={formData.scheduleProfileId} onChange={handleChange} className="form-select">
                                        <option value="">Global Default</option>
                                        {(scheduleProfiles || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            {!isSchool && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Department</label>
                                        <select name="departmentId" value={formData.departmentId} onChange={handleChange} className="form-select" required disabled={isRestricted}>
                                            {(departments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Academic Level</label>
                                        <select name="academicLevelId" value={formData.academicLevelId} onChange={handleChange} className="form-select" required>
                                            {(academicLevels || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Reporting Label</label>
                                <input type="text" name="shortName" value={formData.shortName} onChange={handleChange} className="form-input" placeholder="e.g. GRADE 1" />
                            </div>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-900/50 px-8 py-5 flex flex-row-reverse border-t border-slate-100 dark:border-slate-800">
                            <button type="submit" className="btn-primary px-10 h-12 shadow-lg shadow-indigo-100">Commit Changes</button>
                            <button type="button" onClick={onClose} className="btn-secondary h-12 px-6 mr-3">Discard</button>
                        </div>
                    </form>
                </div>
            </div>
        );
    };

    const AddCourseForm: React.FC<{
        departments: Department[];
        academicLevels: AcademicLevel[];
        onAddCourse: (courseData: Omit<Course, 'id' | 'institutionId'>) => void;
        onCancel: () => void;
        currentUser: User;
        isPrimary: boolean;
        isSecondary: boolean;
        scheduleProfiles: ScheduleProfile[];
    }> = ({ departments, academicLevels, onAddCourse, onCancel, currentUser, isPrimary, isSecondary, scheduleProfiles }) => {
        const isRestricted = currentUser?.role === 'tto' && !!currentUser?.departmentId;

        const [name, setName] = useState('');
        const [code, setCode] = useState('');
        const [shortName, setShortName] = useState('');
        const [curriculumType, setCurriculumType] = useState<'8-4-4' | 'CBC' | 'Other'>('8-4-4');
        const [scheduleProfileId, setScheduleProfileId] = useState('');
        const [departmentId, setDepartmentId] = useState(isRestricted ? currentUser.departmentId! : (departments || [])[0]?.id || '');
        const [academicLevelId, setAcademicLevelId] = useState((academicLevels || [])[0]?.id || '');

        const [initialStreams, setInitialStreams] = useState<string[]>([]);
        const [customStreamName, setCustomStreamName] = useState('');

        const streamTemplates = [
            { label: 'None', values: [] },
            { label: 'Alphabetic (A, B, C)', values: ['Stream A', 'Stream B', 'Stream C'] },
            { label: 'Numbers (1, 2, 3)', values: ['Class 1', 'Class 2', 'Class 3'] },
            { label: 'Cardinal (North, South, East, West)', values: ['North', 'South', 'East', 'West'] },
            { label: 'Colors (Red, Blue, Green)', values: ['Red', 'Blue', 'Green'] },
            { label: 'Precious Stones (Gold, Diamond)', values: ['Gold', 'Diamond', 'Silver'] },
            { label: 'Register Streams', values: currentInstitution?.streamDefinitions || [] },
        ];

        const standardGrades = useMemo(() => {
            if (isPrimary) {
                return Array.from({ length: 9 }, (_, i) => ({ name: `Grade ${i + 1}`, code: `G${i + 1}` }));
            }
            if (isSecondary) {
                return [
                    { name: 'Grade 10', code: 'G10' },
                    { name: 'Form 3', code: 'F3' },
                    { name: 'Form 4', code: 'F4' },
                    { name: 'Grade 11', code: 'G11' },
                    { name: 'Grade 12', code: 'G12' },
                ];
            }
            return [];
        }, [isPrimary, isSecondary]);

        const handleGradeSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
            const selected = standardGrades.find(g => g.name === e.target.value);
            if (selected) {
                setName(selected.name);
                setCode(selected.code);
                setShortName(selected.name.toUpperCase());
            } else {
                setName('');
                setCode('');
                setShortName('');
            }
        };

        const handleTemplateSelect = (template: string[]) => {
            setInitialStreams([...template]);
        };

        const addCustomStream = () => {
            if (customStreamName.trim() && !initialStreams.includes(customStreamName.trim())) {
                setInitialStreams([...initialStreams, customStreamName.trim()]);
                setCustomStreamName('');
            }
        };

        const removeStream = (s: string) => {
            setInitialStreams(initialStreams.filter(item => item !== s));
        };

        const handleSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            if (name.trim() && code.trim() && (departmentId || isSchool) && (academicLevelId || isSchool)) {
                const newLevels: CourseLevel[] = initialStreams.map((s, idx) => ({
                    id: `cl_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 5)}`,
                    name: s,
                    subjectIds: []
                }));
                onAddCourse({
                    name,
                    code,
                    shortName,
                    departmentId,
                    curriculumType,
                    scheduleProfileId,
                    academicLevelId: isSchool ? academicLevels[0]?.id || '' : academicLevelId,
                    levels: newLevels
                });
                onCancel();
            }
        };

        return (
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-slate-100 dark:border-slate-700 space-y-8 my-6 animate-fade-in-up">
                <h5 className="font-black text-xs uppercase tracking-[0.2em] text-slate-400">Initialize New {courseLabel}</h5>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {isSchool && (
                        <div className="md:col-span-2">
                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Template Selection</label>
                            <select onChange={handleGradeSelect} value={name} required className="form-select w-full">
                                <option value="">-- Choose {courseLabel} --</option>
                                {standardGrades.map(g => <option key={g.code} value={g.name}>{g.name}</option>)}
                                <option value="custom">-- Custom Entry --</option>
                            </select>
                        </div>
                    )}

                    {(name === 'custom' || !isSchool) && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Official Name</label>
                                <input type="text" value={name === 'custom' ? '' : name} onChange={e => setName(e.target.value)} required className="form-input" placeholder="e.g. Form 1" />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">ID Code</label>
                                <input type="text" value={code} onChange={e => setCode(e.target.value)} required className="form-input font-mono font-bold text-indigo-600" placeholder="e.g. F1" />
                            </div>
                        </>
                    )}

                    <div className="md:col-span-2 grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Curriculum Type</label>
                            <select value={curriculumType} onChange={e => setCurriculumType(e.target.value as any)} className="form-select">
                                <option value="8-4-4">8-4-4</option>
                                <option value="CBC">CBC</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Schedule Grid Profile</label>
                            <select value={scheduleProfileId} onChange={e => setScheduleProfileId(e.target.value)} className="form-select">
                                <option value="">Global Default</option>
                                {(scheduleProfiles || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {!isSchool && (
                        <>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Department</label>
                                <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} required className="form-select" disabled={isRestricted}>
                                    {(departments || []).map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Academic Level</label>
                                <select value={academicLevelId} onChange={e => setAcademicLevelId(e.target.value)} required className="form-select">
                                    {(academicLevels || []).map(level => <option key={level.id} value={level.id}>{level.name}</option>)}
                                </select>
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-8 border-t border-slate-100 dark:border-slate-700 space-y-4">
                    <div className="flex justify-between items-end">
                        <h6 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Assign Class {streamOrLevelLabelPlural}</h6>
                        <div className="w-64">
                            <label className="block text-[9px] font-black uppercase text-indigo-500 tracking-widest mb-1.5 ml-1">Quick Apply Template</label>
                            <select
                                onChange={e => {
                                    const template = streamTemplates.find(t => t.label === e.target.value);
                                    if (template) handleTemplateSelect(template.values);
                                }}
                                className="form-select text-[10px] h-9"
                            >
                                <option value="">-- Apply Template --</option>
                                {streamTemplates.map(t => <option key={t.label} value={t.label}>{t.label}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={customStreamName}
                            onChange={e => setCustomStreamName(e.target.value)}
                            placeholder={`New ${streamOrLevelLabel} Name...`}
                            className="form-input flex-grow h-10 text-xs"
                        />
                        <button type="button" onClick={addCustomStream} className="btn-secondary h-10 px-6 text-xs font-bold">Add</button>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {initialStreams.map(s => (
                            <span key={s} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold border border-indigo-100 flex items-center gap-2">
                                {s} <button type="button" onClick={() => removeStream(s)}><XIcon className="w-3 h-3" /></button>
                            </span>
                        ))}
                    </div>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <button type="button" onClick={onCancel} className="btn-secondary h-12 px-6">Discard</button>
                    <button type="submit" className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Initialize {courseLabel}</button>
                </div>
            </form>
        );
    };

    const handleExport = () => {
        if (typeof XLSX !== 'undefined') {
            const data = filteredCourses.map(c => ({
                Name: c.name,
                Code: c.code,
                Streams: (c.levels || []).map(l => l.name).join(', ')
            }));
            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Courses");
            XLSX.writeFile(wb, "Courses_List.xlsx");
        } else {
            alert("Export library not loaded.");
        }
    };

    return (
        <div className="space-y-6">
            <style>{`
                .form-input, .form-select { display: block; width: 100%; border-radius: 0.75rem; border: 1px solid #e2e8f0; padding: 0.625rem 0.875rem; background-color: #fff; font-size: 0.875rem; transition: all 0.2s; color: #1e293b; outline: none; }
                .dark .form-input, .dark .form-select { border-color: #334155; background-color: #0f172a; color: #fff; }
                .form-select { appearance: none; background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e"); background-position: right 0.5rem center; background-repeat: no-repeat; background-size: 1.5em 1.5em; padding-right: 2.5rem; }
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 0.75rem; font-weight: 700; border: none; cursor: pointer; transition: all 0.2s; }
                .btn-primary:hover:not(:disabled) { filter: brightness(0.9); transform: translateY(-1px); }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #475569; border-radius: 0.75rem; font-weight: 600; border: 1px solid #e2e8f0; cursor: pointer; transition: all 0.2s; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
                .file-input{display:block;width:100%;font-size:.875rem;line-height:1.25rem;color:#6b7280;file:mr-4;file:px-4;file:py-2;file:rounded-full;file:border-0;file:text-sm;file:font-semibold;file:bg-[var(--color-primary)]/10;file:text-[var(--color-primary)];hover:file:bg-[var(--color-primary)]/20}.dark .file-input{color:#9ca3af;file:bg-slate-700;file:text-slate-200;hover:file:bg-slate-600}
            `}</style>

            <div className="flex flex-wrap gap-4 justify-between items-center bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                <div>
                    <h3 className="text-2xl font-black uppercase tracking-tighter">{courseLabel} Registry</h3>
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-1">Institutional Academic Map</p>
                </div>
                <div className="flex space-x-2 bg-slate-100 dark:bg-slate-700/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                        onClick={() => setManagerTab('courses')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${managerTab === 'courses' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        Active {isSchool ? 'Grades' : 'Courses'}
                    </button>
                    <button
                        onClick={() => setManagerTab('streams')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${managerTab === 'streams' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        {streamOrLevelLabelPlural}
                    </button>
                    <button
                        onClick={() => setManagerTab('pathways')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${managerTab === 'pathways' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        Pathways
                    </button>
                    <button
                        onClick={() => setManagerTab('lessons')}
                        className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${managerTab === 'lessons' ? 'bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-lg' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}
                    >
                        Registry
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 min-w-fit">
                    {managerTab === 'courses' && onImportCourses && (
                        <button onClick={() => setIsSmartImportOpen(true)} className="btn-secondary h-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm">
                            <SparklesIcon className="w-5 h-5 text-indigo-500" /> Excel Smart Import
                        </button>
                    )}
                    {managerTab === 'courses' && (
                        <>
                            <button onClick={() => window.print()} className="btn-secondary h-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm">
                                <PrinterIcon className="w-5 h-5" /> Print
                            </button>
                            <button onClick={handleExport} className="btn-secondary h-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest hover:border-indigo-200 transition-all shadow-sm">
                                <DocumentArrowDownIcon className="w-5 h-5" /> Export
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    if (onAddCourse) setIsAdding(!isAdding);
                                    else alert("Permission denied or feature unavailable.");
                                }}
                                className="btn-primary h-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-indigo-100"
                                disabled={!onAddCourse}
                                title={!onAddCourse ? "Feature unavailable" : ""}
                            >
                                {isAdding ? <XIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />} {isAdding ? 'Cancel' : `New ${courseLabel}`}
                            </button>
                        </>
                    )}
                    {managerTab === 'streams' && onUpdateCourse && (
                        <button onClick={() => setIsAddingStream(!isAddingStream)} className="btn-primary h-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-indigo-100">
                            {isAddingStream ? <XIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />} {isAddingStream ? 'Cancel' : `New ${streamOrLevelLabel}`}
                        </button>
                    )}
                    {managerTab === 'lessons' && (
                        <button onClick={() => setIsAddingLesson(!isAddingLesson)} className="btn-primary h-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-indigo-100">
                            {isAddingLesson ? <XIcon className="w-5 h-5" /> : <PlusIcon className="w-5 h-5" />} Link Content
                        </button>
                    )}
                </div>
            </div>

            {isAdding && onAddCourse && managerTab === 'courses' && (
                <AddCourseForm
                    departments={visibleDepartments}
                    academicLevels={academicLevels}
                    onAddCourse={onAddCourse}
                    onCancel={() => setIsAdding(false)}
                    currentUser={currentUser}
                    isPrimary={isPrimary}
                    isSecondary={isSecondary}
                    scheduleProfiles={currentInstitution?.scheduleProfiles || []}
                />
            )}

            {isAddingLesson && managerTab === 'lessons' && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <BookOpenIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h4 className="font-bold text-lg">Define New Subject Link</h4>
                    </div>
                    <form onSubmit={handleAddLessonSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">{courseLabel}</label>
                            <select value={newLessonCourseId} onChange={e => setNewLessonCourseId(e.target.value)} required className="form-select">
                                <option value="">-- Choose {courseLabel} --</option>
                                {(visibleCourses || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">{streamOrLevelLabel}</label>
                            <select value={newLessonLevelId} onChange={e => setNewLessonLevelId(e.target.value)} disabled={!newLessonCourseId} required className="form-select">
                                <option value="">-- Choose {streamOrLevelLabel} --</option>
                                {(levelsForNewLesson || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Subject Matter</label>
                            <select value={newLessonSubjectId} onChange={e => setNewLessonSubjectId(e.target.value)} disabled={!newLessonCourseId} required className="form-select">
                                <option value="">-- Choose Subject --</option>
                                {(subjectsForNewLesson || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setIsAddingLesson(false)} className="btn-secondary h-12 px-6">Discard</button>
                            <button type="submit" className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Commit Subject Link</button>
                        </div>
                    </form>
                </div>
            )}

            {isAddingStream && managerTab === 'streams' && (
                <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm animate-fade-in-up">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                            <PlusIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h4 className="font-bold text-lg">Initialize New {streamOrLevelLabel}</h4>
                    </div>
                    <form onSubmit={handleAddStream} className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Target {courseLabel}</label>
                            <select value={newStreamCourseId} onChange={e => setNewStreamCourseId(e.target.value)} required className="form-select">
                                <option value="">-- Choose {courseLabel} --</option>
                                {(visibleCourses || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">{streamOrLevelLabel} Title</label>
                            <input
                                type="text"
                                value={newStreamName}
                                onChange={e => setNewStreamName(e.target.value)}
                                placeholder={`e.g. ${isSchool ? 'West' : 'Level 1'}`}
                                required
                                className="form-input"
                            />
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Home Room (Optional)</label>
                            <select value={newStreamRoomId} onChange={e => setNewStreamRoomId(e.target.value)} className="form-select">
                                <option value="">-- No Home Room --</option>
                                {(rooms || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                            </select>
                        </div>

                        {isSchool && (currentInstitution?.streamDefinitions || []).length > 0 && (
                            <div className="md:col-span-2 space-y-2">
                                <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Registry Quick Select</label>
                                <div className="flex flex-wrap gap-2">
                                    {(currentInstitution?.streamDefinitions || []).map(s => (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => setNewStreamName(s)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${newStreamName === s ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 hover:border-indigo-400'}`}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t">
                            <button type="button" onClick={() => setIsAddingStream(false)} className="btn-secondary h-12 px-6">Discard</button>
                            <button type="submit" className="btn-primary h-12 px-10 shadow-lg shadow-indigo-100">Create {streamOrLevelLabel}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Search Registry</label>
                    <div className="relative">
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Type name, code or keyword..." className="form-input pl-10" />
                        <MagnifyingGlassIcon className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                    </div>
                </div>
                {!isSchool && (
                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Department View</label>
                        <select value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)} className="form-select">
                            <option value="all">All Departments</option>
                            {(visibleDepartments || []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1.5 ml-1">Academic Level View</label>
                    <select value={academicLevelFilter} onChange={e => setAcademicLevelFilter(e.target.value)} className="form-select">
                        <option value="all">All Levels</option>
                        {(academicLevels || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                    </select>
                </div>
            </div>

            {managerTab === 'courses' && (
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 overflow-x-auto animate-fade-in">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{courseLabel}</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Code</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">System</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Profile</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Count</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {filteredCourses.map(course => (
                                <tr key={course.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl text-indigo-600">
                                                <AcademicCapIcon className="w-5 h-5" />
                                            </div>
                                            <span className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{course.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <span className="text-[10px] font-mono font-bold text-indigo-600 uppercase tracking-widest">{course.code}</span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${course.curriculumType === 'CBC' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                                            {course.curriculumType || '8-4-4'}
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-[11px] font-bold text-slate-400 uppercase">
                                        {(currentInstitution?.scheduleProfiles || []).find(p => p.id === course.scheduleProfileId)?.name || 'Default'}
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">{(course.levels || []).length} {streamOrLevelLabelPlural}</span>
                                            <span className="text-[10px] text-slate-400">{[...new Set((course.levels || []).flatMap(l => l.subjectIds || []))].length} Units</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => setEditingCourse(course)} className="px-3 py-1.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Edit</button>
                                            <button onClick={() => setManagingLessonsForCourse(course)} className="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Lessons</button>
                                            <button onClick={() => setViewingProgressOf(course)} className="px-3 py-1.5 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Progress</button>
                                            <button onClick={() => setAssigningSubjectsTo(course)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Registry</button>
                                            <button onClick={() => handleDeleteCourseSubmit(course.id, course.name)} className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {managerTab === 'streams' && (
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 overflow-x-auto animate-fade-in">
                    <table className="min-w-full border-collapse">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{courseLabel}</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">{streamOrLevelLabel} Title</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Class Teacher</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Home Room</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Linked Units</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(filteredStreams || []).map((stream: any) => (
                                <tr key={`${stream.courseId}-${stream.streamId}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tighter">{stream.courseName}</div>
                                        <div className="text-[10px] font-mono text-indigo-600 font-bold uppercase">{stream.courseCode}</div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {editingStream?.streamId === stream.streamId ? (
                                            <div className="flex gap-2 items-center">
                                                <input
                                                    type="text"
                                                    value={editingStream ? editingStream.name : ''}
                                                    onChange={e => {
                                                        if (editingStream) {
                                                            setEditingStream({ ...editingStream, name: e.target.value });
                                                        }
                                                    }}
                                                    className="form-input py-1 h-8 text-xs font-bold"
                                                    autoFocus
                                                />
                                                <button onClick={handleUpdateStream} className="p-1.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100"><CheckIcon className="w-3 h-3" /></button>
                                                <button onClick={() => setEditingStream(null)} className="p-1.5 bg-slate-50 text-slate-500 rounded-lg hover:bg-slate-100"><XIcon className="w-3 h-3" /></button>
                                            </div>
                                        ) : (
                                            stream.streamName
                                        )}
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {editingStream?.streamId === stream.streamId ? (
                                            <select
                                                value={(editingStream as any).classTeacherId || ''}
                                                onChange={e => setEditingStream({ ...editingStream, classTeacherId: e.target.value } as any)}
                                                className="form-select py-1 h-8 text-xs font-bold w-48"
                                            >
                                                <option value="">-- Unassigned --</option>
                                                {(users || [])
                                                    .filter(u => u.role === 'lecturer' || u.role === 'teacher' || u.role === 'boarding_master') // Expanded roles for flexibility
                                                    .map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                                            </select>
                                        ) : (
                                            <span className={`${stream.classTeacherId ? 'text-indigo-600' : 'text-slate-400 italic'}`}>
                                                {stream.classTeacherId ? (users.find(u => u.id === stream.classTeacherId)?.name || 'Unknown') : 'Unassigned'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-sm font-bold text-slate-700 dark:text-slate-300">
                                        {editingStream?.streamId === stream.streamId ? (
                                            <select
                                                value={(editingStream as any).roomId || ''}
                                                onChange={e => setEditingStream({ ...editingStream, roomId: e.target.value } as any)}
                                                className="form-select py-1 h-8 text-xs font-bold w-48"
                                            >
                                                <option value="">-- No Home Room --</option>
                                                {(rooms || []).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                            </select>
                                        ) : (
                                            <span className={`${stream.roomId ? 'text-indigo-600' : 'text-slate-400 italic'}`}>
                                                {stream.roomId ? (rooms.find(r => r.id === stream.roomId)?.name || 'Unknown Room') : 'Not Set'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-[10px] font-black uppercase text-slate-500 dark:text-slate-400">
                                            {stream.subjectCount} Units
                                        </span>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingStream({ courseId: stream.courseId, streamId: stream.streamId, name: stream.streamName, classTeacherId: stream.classTeacherId, roomId: stream.roomId } as any)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white dark:bg-blue-900/30 dark:text-blue-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const course = courses.find(c => c.id === stream.courseId);
                                                    if (course) setAssigningSubjectsTo(course);
                                                }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white dark:bg-indigo-900/30 dark:text-indigo-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Registry
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const course = courses.find(c => c.id === stream.courseId);
                                                    if (course) {
                                                        setManagingLessonsForCourse(course);
                                                        setManagingLessonsForStreamId(stream.streamId);
                                                        setNewLessonLevelId(stream.streamId);
                                                    }
                                                }}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-900/30 dark:text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Lessons
                                            </button>
                                            <button
                                                onClick={() => setViewingProgressOf(courses.find(c => c.id === stream.courseId) || null)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white dark:bg-amber-900/30 dark:text-amber-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Progress
                                            </button>
                                            <button
                                                onClick={() => handleDeleteStream(stream.courseId, stream.streamId)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-900/30 dark:text-red-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {managerTab === 'pathways' && (
                <div className="space-y-6 animate-fade-in-up">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm">
                        <h4 className="font-bold text-lg mb-4">Option Blocks (Pathways)</h4>
                        <p className="text-sm text-slate-500 mb-6">Group subjects that are taught simultaneously. Students will choose one subject from each block.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Target {courseLabel}</label>
                                <select
                                    value={selectedPathwayCourseId}
                                    onChange={e => setSelectedPathwayCourseId(e.target.value)}
                                    className="form-select h-12"
                                >
                                    <option value="">-- Select {courseLabel} --</option>
                                    {(visibleCourses || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1.5 ml-1">Subjects in Block</label>
                                <select
                                    multiple
                                    value={newPathwaySubjectIds}
                                    onChange={e => setNewPathwaySubjectIds(Array.from(e.target.selectedOptions, (option: HTMLOptionElement) => option.value))}
                                    className="form-input h-32"
                                    disabled={!selectedPathwayCourseId}
                                >
                                    {(subjects || []).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                </select>
                                <p className="text-[10px] text-slate-400 mt-1 italic">Hold Ctrl/Cmd to select multiple subjects.</p>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={handleAddPathway}
                                disabled={pathwayProcessing || !selectedPathwayCourseId || newPathwaySubjectIds.length < 2}
                                className="btn-primary h-11 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest shadow-indigo-100 disabled:opacity-50"
                            >
                                <SparklesIcon className="w-5 h-5" /> Create Option Block
                            </button>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <h5 className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Active Blocks</h5>
                        {(pathwayConstraints || []).map(constraint => (
                            <div key={constraint.id} className="flex justify-between items-center p-4 bg-white dark:bg-slate-800 border-2 border-slate-50 dark:border-slate-700 rounded-2xl hover:border-indigo-100 transition-all group">
                                <div className="flex gap-4 items-start">
                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg text-indigo-600">
                                        <RectangleStackIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{constraint.description}</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {constraint.subjectIds.map(sid => {
                                                const s = subjects.find(sub => sub.id === sid);
                                                return s ? <span key={sid} className="text-[10px] font-mono bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{s.code}</span> : null;
                                            })}
                                        </div>
                                    </div>
                                </div>
                                <button onClick={() => handleDeletePathway(constraint.id)} className="text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-50 rounded-lg"><XIcon className="w-5 h-5" /></button>
                            </div>
                        ))}
                        {(!pathwayConstraints || pathwayConstraints.length === 0) && (
                            <div className="text-center py-12 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl">
                                <p className="text-sm text-slate-400 font-medium">No option blocks defined.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {managerTab === 'lessons' && (
                <div className="bg-white dark:bg-slate-800 shadow-sm rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-700 overflow-x-auto animate-fade-in">
                    <table className="min-w-full divide-y divide-slate-100 dark:divide-slate-800">
                        <thead className="bg-slate-50 dark:bg-slate-900/50">
                            <tr>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Educational Unit</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Assigned Faculty</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Class Context</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Structure</th>
                                <th className="px-8 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Registry</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {(filteredLessons || []).map((lesson: any) => (
                                <tr key={lesson.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors group">
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-tight">{lesson.subjectName}</div>
                                        <div className="text-[10px] font-mono text-indigo-600 font-bold uppercase">{lesson.subjectCode}</div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div className={`h-8 w-8 rounded-xl flex items-center justify-center text-xs font-black shadow-sm ${lesson.lecturerId ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                                {lesson.lecturerId ? lesson.lecturer.charAt(0) : '?'}
                                            </div>
                                            <span className={`text-sm ${lesson.lecturerId ? 'font-bold text-slate-700 dark:text-slate-300' : 'text-slate-400 italic'}`}>{lesson.lecturer}</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap">
                                        <div className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tighter">{lesson.courseName}</div>
                                        <div className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{lesson.levelName}</div>
                                    </td>
                                    <td className="px-8 py-5 whitespace-nowrap text-[11px] font-bold text-slate-500 uppercase tracking-tight">{lesson.structure}</td>
                                    <td className="px-8 py-5 whitespace-nowrap text-right">
                                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => handleEditLesson(lesson)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white dark:bg-emerald-900/30 dark:text-emerald-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                <PencilIcon className="w-3.5 h-3.5" />
                                                Modify
                                            </button>
                                            <button
                                                onClick={() => handleRemoveLesson(lesson)}
                                                className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white dark:bg-red-900/30 dark:text-red-300 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                                            >
                                                <XIcon className="w-3.5 h-3.5" />
                                                Unlink
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {managingLessonsFor && (
                <ManageLessonsModal
                    teacher={managingLessonsFor}
                    subjects={subjects}
                    departments={departments}
                    allocations={allocations || []}
                    courses={courses}
                    onClose={() => setManagingLessonsFor(null)}
                    onAssign={onDirectAssign!}
                    onUpdateAllocation={onUpdateRequest!}
                    onDeallocate={onWithdrawRequest!}
                    isSchool={isSchool}
                />
            )}

            {managingLessonsForCourse && (
                <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => {
                    setManagingLessonsForCourse(null);
                    setManagingLessonsForStreamId(null);
                    setNewLessonLevelId('');
                }}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-2xl">
                                    <ClipboardListIcon className="w-8 h-8" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase">
                                        {managingLessonsForStreamId
                                            ? `${managingLessonsForCourse.levels.find(l => l.id === managingLessonsForStreamId)?.name} Lessons`
                                            : `${managingLessonsForCourse.name} Lessons`}
                                    </h3>

                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Manage Class Subject Allocations</p>
                                        <span className="bg-indigo-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                                            {getAdjustedLessonCount(
                                                lessonsList
                                                    .filter(l => l.courseId === managingLessonsForCourse.id)
                                                    .filter(l => !managingLessonsForStreamId || l.levelId === managingLessonsForStreamId),
                                                pathwayConstraints
                                            )} Total
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => {
                                setManagingLessonsForCourse(null);
                                setManagingLessonsForStreamId(null);
                                setNewLessonLevelId('');
                            }} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>
                        </div>

                        <div className="flex-grow overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
                            <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm mb-8">
                                <h4 className="font-bold text-lg mb-4 flex items-center gap-2">
                                    <PlusIcon className="w-5 h-5 text-indigo-600" />
                                    Add New Lesson
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                                    <div className="md:col-span-5">
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Stream / Level</label>
                                        <select
                                            value={newLessonLevelId}
                                            onChange={e => setNewLessonLevelId(e.target.value)}
                                            disabled={!!managingLessonsForStreamId}
                                            className="form-select w-full disabled:bg-slate-100 disabled:text-slate-500"
                                        >
                                            <option value="">-- Select --</option>
                                            {(managingLessonsForCourse.levels || []).map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-3">
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Subject</label>
                                        <select
                                            value={newLessonSubjectId}
                                            onChange={e => setNewLessonSubjectId(e.target.value)}
                                            className="form-select w-full"
                                        >
                                            <option value="">-- Select Subject --</option>
                                            {(subjects || [])
                                                .filter(s => !managingLessonsForCourse.departmentId || s.departmentId === managingLessonsForCourse.departmentId)
                                                .map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Structure</label>
                                        <select
                                            value={newLessonStructure}
                                            onChange={e => setNewLessonStructure(e.target.value)}
                                            className="form-select w-full"
                                        >
                                            <option value="Single">Single</option>
                                            <option value="Double">Double</option>
                                            <option value="Triple">Triple</option>
                                            <option value="Quad">Quad</option>
                                            <option value="Double + Single">Dbl + Single</option>
                                        </select>
                                    </div>
                                    <div className="md:col-span-2">
                                        <button
                                            onClick={() => {
                                                if (newLessonLevelId && newLessonSubjectId && onAssociateSubjectToCourseLevel) {
                                                    let subjectIdsToAdd: string[] = [newLessonSubjectId];
                                                    const group = pathwayConstraints.find(c => c.subjectIds.includes(newLessonSubjectId));
                                                    if (group) {
                                                        subjectIdsToAdd = group.subjectIds;
                                                        const subjectName = (subjects || []).find(sub => sub.id === newLessonSubjectId)?.name || newLessonSubjectId;
                                                        alert(`Notice: "${subjectName}" is part of an Option Block (${group.description}). All members of this group have been associated.`);
                                                    }

                                                    onAssociateSubjectToCourseLevel(subjectIdsToAdd as any, newLessonLevelId);
                                                    setNewLessonLevelId('');
                                                    setNewLessonSubjectId('');
                                                }
                                            }}
                                            disabled={!newLessonLevelId || !newLessonSubjectId}
                                            className="btn-primary w-full h-11 flex items-center justify-center shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:shadow-none"
                                        >
                                            Add
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {lessonsList
                                    .filter(l => l.courseId === managingLessonsForCourse.id)
                                    .filter(l => !managingLessonsForStreamId || l.levelId === managingLessonsForStreamId)
                                    .map(lesson => (
                                        <div key={lesson.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-indigo-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black shadow-sm ${lesson.lecturerId ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                                                    {(lesson.subjectCode || "??").substring(0, 2)}
                                                </div>
                                                <div>
                                                    <h5 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">{lesson.subjectName}</h5>
                                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                                        <span>{lesson.levelName}</span>
                                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                        <button
                                                            onClick={() => {
                                                                const course = (courses || []).find(c => c.id === lesson.courseId);
                                                                const level = course?.levels.find(l => l.id === lesson.levelId);
                                                                const subject = (subjects || []).find(s => s.id === lesson.subjectId);
                                                                if (course && level && subject) {
                                                                    setEditingStructureFor({ course, level, subject, currentStructure: [] });
                                                                }
                                                            }}
                                                            className="flex items-center gap-1.5 hover:text-indigo-600 transition-colors group/edit-str"
                                                        >
                                                            <span className={`${lesson.isOverride ? 'text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 font-black' : 'text-slate-500'}`}>
                                                                {lesson.structure}
                                                            </span>
                                                            <PencilIcon className="w-3 h-3 opacity-0 group-hover/edit-str:opacity-100 transition-opacity" />
                                                            {lesson.isOverride && (
                                                                <span className="text-[7px] font-black uppercase tracking-tighter text-indigo-400 bg-white border border-indigo-100 px-1 rounded shadow-sm">Overriden</span>
                                                            )}
                                                        </button>
                                                        {(() => {
                                                            const group = pathwayConstraints.find(c => c.subjectIds.includes(lesson.subjectId));
                                                            return group ? (
                                                                <>
                                                                    <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                                                    <span className="text-[7px] font-black uppercase tracking-tighter text-indigo-400 bg-white border border-indigo-100 px-1 rounded shadow-sm" title={group.description}>Grouped</span>
                                                                </>
                                                            ) : null;
                                                        })()}
                                                    </p>
                                                    {editingStructureFor && editingStructureFor.subject.id === lesson.subjectId && editingStructureFor.level.id === lesson.levelId && (
                                                        <div className="mt-2 flex gap-2 items-center animate-fade-in-up md:absolute md:z-10 bg-white dark:bg-slate-800 p-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-700">
                                                            <select
                                                                autoFocus
                                                                className="form-select h-8 text-xs py-1 w-32"
                                                                onChange={(e) => handleUpdateStructure(e.target.value)}
                                                                defaultValue={lesson.structure.includes('Double') ? 'Double' : 'Single'}
                                                            >
                                                                <option value="Single">Single</option>
                                                                <option value="Double">Double</option>
                                                                <option value="Triple">Triple</option>
                                                                <option value="Quad">Quad</option>
                                                                <option value="Double + Single">Dbl + Single</option>
                                                            </select>
                                                            <button onClick={() => setEditingStructureFor(null)} className="p-1 hover:bg-slate-100 rounded-lg"><XIcon className="w-4 h-4" /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6">
                                                <div className="hidden md:block text-right">
                                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Assigned To</p>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <span className={`text-xs font-bold ${lesson.lecturerId ? 'text-indigo-600' : 'text-slate-400 italic'}`}>
                                                            {lesson.lecturer}
                                                        </span>
                                                        {lesson.lecturerId && (
                                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[9px] font-black text-slate-500">
                                                                {getInitials(lesson.lecturer)}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 border-l border-slate-100 dark:border-slate-800 pl-4">
                                                    <button
                                                        onClick={() => handleRemoveLesson(lesson)}
                                                        className="p-2 bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                                                        title="Remove Lesson"
                                                    >
                                                        <XIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                {lessonsList.filter(l => l.courseId === managingLessonsForCourse.id).length === 0 && (
                                    <div className="text-center py-12 opacity-50">
                                        <p className="text-xs font-black uppercase tracking-widest">No lessons configured for this course yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {
                editingCourse && onUpdateCourse && (
                    <EditCourseModal
                        course={editingCourse}
                        departments={visibleDepartments}
                        academicLevels={academicLevels}
                        onClose={() => setEditingCourse(null)}
                        onSave={handleUpdateCourseSubmit}
                        currentUser={currentUser}
                        scheduleProfiles={currentInstitution?.scheduleProfiles || []}
                    />
                )
            }

            {
                editingStructureFor && (
                    <SubjectStructureEditorModal
                        course={editingStructureFor.course}
                        level={editingStructureFor.level}
                        subject={editingStructureFor.subject}
                        rooms={rooms || []}
                        onClose={() => setEditingStructureFor(null)}
                        onSave={handleSaveStructureOverride}
                    />
                )
            }

            {
                assigningSubjectsTo && onUpdateCourse && (
                    <div className="fixed inset-0 bg-slate-900/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setAssigningSubjectsTo(null)}>
                        <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                                <div>
                                    <h3 className="text-2xl font-black tracking-tighter uppercase">{assigningSubjectsTo.name} Structure</h3>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Registry Alignment</p>
                                </div>
                                <button onClick={() => setAssigningSubjectsTo(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>
                            </div>
                            <div className="flex-grow overflow-y-auto p-8 space-y-10 bg-slate-50 dark:bg-slate-950">
                                {(assigningSubjectsTo.levels || []).map((level) => (
                                    <div key={level.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-8 shadow-sm">
                                        <div className="flex justify-between items-center mb-8">
                                            <h4 className="text-xl font-black uppercase tracking-tight text-indigo-600 dark:text-indigo-400">{level.name}</h4>
                                            <span className="px-4 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">{getAdjustedItemCount(level.subjectIds || [], pathwayConstraints)} Linked Units</span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {(level.subjectIds || []).map(sid => {
                                                const s = subjects.find(sub => sub.id === sid);
                                                return s ? (
                                                    <div key={sid} className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 flex justify-between items-center group hover:border-indigo-200 transition-all shadow-sm">
                                                        <div className="min-w-0">
                                                            <p className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate">{s.name}</p>
                                                            <div className="flex items-center gap-2">
                                                                <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-black">{s.code}</p>
                                                                {(() => {
                                                                    const group = pathwayConstraints.find(c => c.subjectIds.includes(sid));
                                                                    return group ? (
                                                                        <span className="text-[8px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full font-black uppercase tracking-widest border border-indigo-100 dark:border-indigo-800" title={group.description}>Grouped</span>
                                                                    ) : null;
                                                                })()}
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button
                                                                onClick={() => setEditingStructureFor({ course: assigningSubjectsTo, level, subject: s, currentStructure: [] })}
                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700"
                                                                title="Modify Structure for this class"
                                                            >
                                                                <ListIcon className="w-5 h-5" />
                                                            </button>
                                                            <button
                                                                onClick={() => {
                                                                    const updated = assigningSubjectsTo.levels.map(l => l.id === level.id ? { ...l, subjectIds: (l.subjectIds || []).filter(id => id !== sid) } : l);
                                                                    handleStructureSave(assigningSubjectsTo.id, updated);
                                                                }}
                                                                className="p-1.5 text-slate-300 hover:text-red-500 transition-all"
                                                            >
                                                                <XIcon className="w-5 h-5" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null;
                                            })}
                                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex items-center p-2 bg-white/50 dark:bg-slate-900/20 group hover:border-indigo-300 transition-all">
                                                <select
                                                    className="w-full bg-transparent border-none text-[10px] font-black uppercase text-slate-400 focus:ring-0 cursor-pointer"
                                                    onChange={e => {
                                                        const val = e.target.value;
                                                        if (!val) return;

                                                        let subjectIdsToAdd: string[] = [];
                                                        if (val.startsWith('GROUP:')) {
                                                            const groupId = val.replace('GROUP:', '');
                                                            const group = pathwayConstraints.find(c => c.id === groupId);
                                                            if (group) subjectIdsToAdd = group.subjectIds;
                                                        } else {
                                                            const sid = val;
                                                            // Automatically reflect associated pathway groups
                                                            const group = pathwayConstraints.find(c => c.subjectIds.includes(sid));
                                                            if (group) {
                                                                subjectIdsToAdd = group.subjectIds;
                                                                const subjectName = (subjects || []).find(sub => sub.id === sid)?.name || sid;
                                                                alert(`Notice: "${subjectName}" is part of an Option Block (${group.description}). All members of this group have been associated.`);
                                                            } else {
                                                                subjectIdsToAdd = [sid];
                                                            }
                                                        }

                                                        const updated = assigningSubjectsTo.levels.map(l =>
                                                            l.id === level.id
                                                                ? { ...l, subjectIds: [...new Set([...(l.subjectIds || []), ...subjectIdsToAdd])] }
                                                                : l
                                                        );
                                                        handleStructureSave(assigningSubjectsTo.id, updated);
                                                        e.target.value = '';
                                                    }}
                                                >
                                                    <option value="">+ Link Unit / Group</option>
                                                    {pathwayConstraints.length > 0 && (
                                                        <optgroup label="Defined Option Blocks (Pathways)">
                                                            {pathwayConstraints.map(c => (
                                                                <option key={c.id} value={`GROUP:${c.id}`}>{c.description}</option>
                                                            ))}
                                                        </optgroup>
                                                    )}
                                                    <optgroup label="All Subjects">
                                                        {(subjects || []).filter(s => !(level.subjectIds || []).includes(s.id)).map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
                                                    </optgroup>
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )
            }

            {
                isSmartImportOpen && (
                    <SmartCourseImporterModal
                        onClose={() => setIsSmartImportOpen(false)}
                        onImport={async (courses) => {
                            if (onImportCourses) await onImportCourses(courses);
                        }}
                        existingCourses={courses}
                        departments={departments}
                        academicLevels={academicLevels}
                        isSchool={isSchool}
                        aiModelTier={currentInstitution?.aiModelTier}
                        onLogAction={onLogAction}
                    />
                )
            }

            {
                deletingCourse && (
                    <div className="fixed inset-0 bg-slate-900/90 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
                        <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-2xl w-full max-w-md p-10 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                            <div className="w-20 h-20 bg-red-100 rounded-[2rem] flex items-center justify-center text-red-600 mb-8 shadow-xl shadow-red-100">
                                <ArchiveBoxIcon className="w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2 uppercase tracking-tighter">Confirm Purge</h3>
                            <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium">
                                Archiving <span className="text-red-600 font-bold">"{deletingCourse.name}"</span> will permanently detach all associated stream metadata. This process is destructive and cannot be reversed.
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setDeletingCourse(null)} className="flex-1 btn-secondary h-12">Cancel</button>
                                <button onClick={confirmDelete} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black rounded-2xl shadow-lg shadow-red-100 py-3 uppercase text-xs tracking-widest transition-all active:scale-[0.98]">Purge Now</button>
                            </div>
                        </div>
                    </div>
                )
            }
            {viewingProgressOf && (
                <div className="fixed inset-0 bg-slate-900/80 z-[150] flex items-center justify-center p-4 backdrop-blur-sm" onClick={() => setViewingProgressOf(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight">Academic Progress: {viewingProgressOf.name}</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Real-time Coverage & Syllabus Analytics</p>
                            </div>
                            <button onClick={() => setViewingProgressOf(null)} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-6 h-6" /></button>
                        </div>
                        <div className="p-8 flex-grow overflow-y-auto custom-scrollbar">
                            <CourseProgressReport
                                subjects={subjects}
                                courses={[viewingProgressOf]}
                                allTimetableEntries={allTimetableEntries}
                                letterheadConfig={letterheadConfig}
                                footerImageUrl={footerImageUrl}
                                onPreviewPdf={(url, filename) => {
                                    setPreviewPdfUrl(url);
                                    setPreviewPdfFilename(filename);
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {previewPdfUrl && (
                <PdfPreviewModal
                    url={previewPdfUrl}
                    filename={previewPdfFilename || 'Report.pdf'}
                    onClose={() => setPreviewPdfUrl(null)}
                />
            )}
        </div >

    );
};

const SubjectStructureEditorModal = ({ course, level, subject, rooms, onClose, onSave }: {
    course: Course,
    level: CourseLevel,
    subject: Subject,
    rooms: Room[],
    onClose: () => void,
    onSave: (data: { lessonStructure?: LessonStructure[], dedicatedRoomId?: string }) => void
}) => {
    const meta = (level.subjectMetadata || []).find(m => m.subjectId === subject.id);
    const [tempStructure, setTempStructure] = useState<LessonStructure[]>(meta?.lessonStructure || subject.lessonStructure || []);
    const [dedicatedRoomId, setDedicatedRoomId] = useState<string>(meta?.dedicatedRoomId || '');

    const addRow = () => setTempStructure([...tempStructure, { periods: 1, count: 1 }]);
    const removeRow = (index: number) => setTempStructure(tempStructure.filter((_, i) => i !== index));
    const updateRow = (index: number, field: keyof LessonStructure, value: any) => {
        const updated = [...tempStructure];
        updated[index] = { ...updated[index], [field]: value };
        setTempStructure(updated);
    };

    return (
        <div className="fixed inset-0 bg-slate-900/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div>
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">{subject.name}</h3>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Refining for: {level.name}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><XIcon className="w-5 h-5 text-slate-400" /></button>
                </div>
                <div className="p-8 space-y-6">
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/50">
                        <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-tight leading-relaxed">
                            Customizing the lesson structure here will override the subject's default settings specifically for this class.
                        </p>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase text-slate-400 mb-1.5 ml-1">Dedicated Room (Optional)</label>
                        <select
                            value={dedicatedRoomId}
                            onChange={(e) => setDedicatedRoomId(e.target.value)}
                            className="form-select h-11 text-xs font-bold w-full"
                        >
                            <option value="">-- Use Class Default: {level.roomId ? (rooms.find(r => r.id === level.roomId)?.name || 'Unknown Room') : 'Not Set'} --</option>
                            {rooms.map(r => (
                                <option key={r.id} value={r.id}>{r.name} ({r.capacity} pax)</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-400 mt-1 italic">
                            Select a specific room for this subject (e.g. Science Lab). If set, it will override the class home room.
                        </p>
                    </div>

                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar border-t border-slate-100 dark:border-slate-800 pt-4">
                        <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black uppercase text-slate-400 ml-1">Lesson Structure</label>
                        </div>
                        {tempStructure.map((row, idx) => (
                            <div key={idx} className="flex flex-wrap gap-3 items-end p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div className="flex-1 min-w-[100px]">
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1">Pattern</label>
                                    <input type="number" value={row.periods} min={1} onChange={e => updateRow(idx, 'periods', parseInt(e.target.value))} className="form-input h-10 text-xs font-bold" placeholder="Periods" />
                                </div>
                                <div className="flex-1 min-w-[100px]">
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1">Freq/Week</label>
                                    <input type="number" value={row.count} min={1} onChange={e => updateRow(idx, 'count', parseInt(e.target.value))} className="form-input h-10 text-xs font-bold" placeholder="Count" />
                                </div>
                                <div className="flex-[2] min-w-[150px]">
                                    <label className="block text-[9px] font-black uppercase text-slate-400 mb-1.5 ml-1">Room (Optional)</label>
                                    <select
                                        value={row.dedicatedRoomId || ''}
                                        onChange={(e) => updateRow(idx, 'dedicatedRoomId', e.target.value || undefined)}
                                        className="form-select h-10 text-[10px] font-bold"
                                    >
                                        <option value="">-- Default --</option>
                                        {rooms.map(r => (
                                            <option key={r.id} value={r.id}>{r.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <button onClick={() => removeRow(idx)} className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"><TrashIcon className="w-4 h-4" /></button>
                            </div>
                        ))}
                        {tempStructure.length === 0 && (
                            <div className="text-center py-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">No structure defined</p>
                            </div>
                        )}
                        <button onClick={addRow} className="w-full py-3 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:border-indigo-300 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                            <PlusIcon className="w-4 h-4" /> Add Lesson Block
                        </button>
                    </div>
                </div>
                <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-700 flex gap-3">
                    <button onClick={onClose} className="btn-secondary flex-1 h-12 uppercase text-[10px] font-black tracking-widest">Cancel</button>
                    <button onClick={() => onSave({ lessonStructure: tempStructure, dedicatedRoomId })} className="btn-primary flex-[2] h-12 shadow-lg shadow-indigo-100 uppercase text-[10px] font-black tracking-widest">Apply Class Overrides</button>
                </div>
            </div>
        </div>
    );
};
