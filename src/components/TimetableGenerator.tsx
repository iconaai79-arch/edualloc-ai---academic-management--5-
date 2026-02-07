
import React, { useState, useMemo, useRef } from 'react';
import type { AllocationRequest, Subject, User, Room, TimetableEntry, LetterheadConfig, TimetableSettings, Department, Course, Building, AcademicYear, Semester, Conflict, TimeOffRequest, ExamTimetableEntry, ExamTimetableSettings } from '../types';
import { generateTimetable, generateExamTimetable } from '../services/geminiService';
import { generateTimetablePdf, generateExamTimetablePdf } from '../services/pdfService';
import { CheckIcon, ExclamationTriangleIcon, ArrowUpTrayIcon, DocumentArrowDownIcon, CalendarDaysIcon, SparklesIcon, PrinterIcon, CheckCircleIcon, CommandLineIcon } from './icons/index';
import { TimetablesView } from './TimetablesView';
import { TimetableImporter } from './TimetableImporter';
import { Tooltip } from './Tooltip';
import { ExamTimetableGrid } from './ExamTimetableGrid';
import { generateStandardExamTimetable } from '../utils/examUtils';
import { generateStandardTimetable } from '../utils/timetableLogic';
import { WallPosterView } from './WallPosterView';

declare var XLSX: any;

interface TimetableGeneratorProps {
    allocations: AllocationRequest[];
    subjects: Subject[];
    lecturers: User[];
    rooms: Room[];
    getLecturerById?: (id: string) => User | undefined;
    getSubjectById?: (id: string) => Subject | undefined;
    getRoomById?: (id: string) => Room | undefined;
    onTimetableGenerated: (timetable: Omit<TimetableEntry, 'id' | 'institutionId' | 'academicYearId' | 'semesterId'>[], academicYearId: string, semesterId: string) => Promise<void>;
    generatedTimetable: TimetableEntry[];
    onPublishTimetable?: (fileUrl: string) => void;
    finalTimetableUrl: string | null;
    onRemovePublishedTimetable?: () => void;
    letterheadConfig: LetterheadConfig;
    logoUrl: string | null;
    footerImageUrl: string | null;
    timetableSettings: TimetableSettings;
    onSaveTimetableSettings?: (config: TimetableSettings) => void;
    departments: Department[];
    courses: Course[];
    buildings: Building[];
    currentUser: User;
    academicYears: AcademicYear[];
    activeAcademicYear?: AcademicYear | null;
    activeSemester?: Semester | null;
    timetableConflicts: Conflict[];
    setActiveTab: (tab: string) => void;
    courseSizes: Map<string, number>;
    timeOffRequests: TimeOffRequest[];
    onLogAction?: (action: string) => void;
    currentInstitution?: any;
    examTimetable: ExamTimetableEntry[];
    onExamTimetableGenerated: (entries: any[], ay: string, sem: string) => Promise<void>;
    examTimetableSettings: ExamTimetableSettings;
}

export const TimetableGenerator: React.FC<TimetableGeneratorProps> = ({
    allocations = [], subjects = [], lecturers = [], rooms = [], getLecturerById, getSubjectById, getRoomById, onTimetableGenerated, generatedTimetable = [], onPublishTimetable, finalTimetableUrl, onRemovePublishedTimetable, letterheadConfig, logoUrl, footerImageUrl, timetableSettings,
    onSaveTimetableSettings, departments = [], courses = [], buildings = [], currentUser, activeAcademicYear, activeSemester, timetableConflicts = [], setActiveTab, courseSizes, timeOffRequests = [], academicYears = [], onLogAction, currentInstitution, examTimetable = [], onExamTimetableGenerated, examTimetableSettings
}) => {
    const [subTab, setSubTab] = useState<'lessons' | 'exams' | 'wall_poster'>('lessons');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isPublishing, setIsPublishing] = useState(false);
    const [publishSuccess, setPublishSuccess] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [publishFile, setPublishFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
    const [generationMode, setGenerationMode] = useState<'ai' | 'standard'>('ai');

    const handlePublishUpload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!publishFile) {
            alert("Please select a file to upload.");
            return;
        }
        setIsUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(publishFile);
        reader.onload = () => {
            onPublishTimetable?.(reader.result as string);
            setIsUploading(false);
            setPublishFile(null);
            onLogAction?.('Uploaded & Published Timetable');
        };
        reader.onerror = () => {
            alert("Failed to read file.");
            setIsUploading(false);
        };
    };

    const handleRemovePublication = () => {
        if (window.confirm("Are you sure you want to remove the published timetable? This will make it unavailable to all users.")) {
            onRemovePublishedTimetable?.();
            onLogAction?.('Removed Published Timetable');
        }
    };

    const handleGenerateLessons = async () => {
        if (!activeAcademicYear || !activeSemester) {
            setError("Configuration incomplete. Ensure you have an active academic year and semester defined.");
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const safeAllocations = Array.isArray(allocations) ? allocations : [];
            const safeSubjects = Array.isArray(subjects) ? subjects : [];
            const safeLecturers = Array.isArray(lecturers) ? lecturers : [];
            const safeRooms = Array.isArray(rooms) ? rooms : [];
            const safeCourses = Array.isArray(courses) ? courses : [];
            const safeTimeOff = Array.isArray(timeOffRequests) ? timeOffRequests : [];

            if (generationMode === 'ai') {
                const rawTimetable = await generateTimetable(safeAllocations, safeSubjects, safeLecturers, safeRooms, timetableSettings, courseSizes, safeCourses, safeTimeOff, currentInstitution?.scheduleProfiles || [], currentInstitution?.aiModelTier);
                await onTimetableGenerated(rawTimetable, activeAcademicYear.id, activeSemester.id);
            } else {
                const standardEntries = generateStandardTimetable(
                    safeAllocations, safeSubjects, safeLecturers, safeRooms,
                    timetableSettings, activeAcademicYear.id, activeSemester.id,
                    safeCourses, currentInstitution?.scheduleProfiles || []
                );
                await onTimetableGenerated(standardEntries, activeAcademicYear.id, activeSemester.id);
            }
            onLogAction?.(`Generated New Timetable (${generationMode.toUpperCase()})`);
        } catch (err: any) {
            console.error("Timetable generation failure:", err);
            setError(err.message || "An unexpected error occurred during timetable generation.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleGenerateExams = async () => {
        if (!activeAcademicYear || !activeSemester) {
            setError("Configuration incomplete. Ensure you have an active academic year and semester defined.");
            return;
        }

        const allExamPeriods = activeSemester.sessions?.flatMap(s => s.examPeriods || []) || [];
        if (allExamPeriods.length === 0) {
            setError("No exam periods are defined for the active semester's sessions. Configure this in Settings > Calendar.");
            return;
        }

        setIsLoading(true);
        setError(null);
        try {
            const safeSubjects = Array.isArray(subjects) ? subjects : [];
            const subjectsWithExams = safeSubjects.filter(s => s && s.hasExam !== false);

            if (generationMode === 'ai') {
                const allStartDates = allExamPeriods.map(p => new Date(p.startDate));
                const allEndDates = allExamPeriods.map(p => new Date(p.endDate));
                const earliestStart = new Date(Math.min(...allStartDates.map(d => d.getTime())));
                const latestEnd = new Date(Math.max(...allEndDates.map(d => d.getTime())));

                const examPeriod = {
                    start: earliestStart.toISOString().split('T')[0],
                    end: latestEnd.toISOString().split('T')[0]
                };

                const rawTimetable = await generateExamTimetable(subjectsWithExams, courses, lecturers, rooms, examPeriod, courseSizes, examTimetableSettings, currentInstitution?.aiModelTier);
                await onExamTimetableGenerated(rawTimetable, activeAcademicYear.id, activeSemester.id);
            } else {
                const standardEntries = generateStandardExamTimetable(subjectsWithExams, courses, lecturers, rooms, activeSemester, examTimetableSettings);
                await onExamTimetableGenerated(standardEntries, activeAcademicYear.id, activeSemester.id);
            }
            onLogAction?.(`Generated New Exam Timetable (${generationMode.toUpperCase()})`);
        } catch (err: any) {
            console.error("Exam generation failure:", err);
            setError(err.message || "An error occurred during exam timetable generation.");
        } finally {
            setIsLoading(false);
        }
    };

    const exportToExcel = () => {
        if (!Array.isArray(generatedTimetable) || generatedTimetable.length === 0) return;

        const data = generatedTimetable.map(entry => ({
            Day: entry.day,
            'Start Time': entry.startTime,
            'End Time': entry.endTime,
            Subject: getSubjectById?.(entry.subjectId)?.shortName || getSubjectById?.(entry.subjectId)?.name || 'N/A',
            'Subject Code': getSubjectById?.(entry.subjectId)?.code || 'N/A',
            Lecturer: getLecturerById?.(entry.lecturerId)?.name || 'N/A',
            Room: getRoomById?.(entry.roomId)?.name || 'N/A',
        }));

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");
        XLSX.writeFile(workbook, "GeneratedTimetable.xlsx");
        onLogAction?.('Exported Timetable to Excel');
    };

    const handlePublish = async () => {
        if (!Array.isArray(generatedTimetable) || generatedTimetable.length === 0) return;
        setIsPublishing(true);
        setPublishSuccess(false);
        try {
            const pdfUrl = await generateTimetablePdf(
                generatedTimetable,
                getSubjectById || (id => undefined),
                getLecturerById || (id => undefined),
                getRoomById || (id => undefined),
                letterheadConfig,
                footerImageUrl,
                "Official Weekly Timetable",
                courses,
                activeSemester || null,
                timetableSettings
            );
            onPublishTimetable?.(pdfUrl);
            setPublishSuccess(true);
            setTimeout(() => setPublishSuccess(false), 5000);
            onLogAction?.('Published Generated Timetable');
        } catch (error) {
            console.error("Failed to publish timetable:", error);
            alert("An error occurred while publishing the timetable.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDownloadExamPdf = async () => {
        if (!Array.isArray(examTimetable) || examTimetable.length === 0) return;
        setIsGeneratingPdf(true);
        try {
            const pdfUrl = await generateExamTimetablePdf(
                examTimetable,
                getSubjectById || (id => undefined),
                getLecturerById || (id => undefined),
                getRoomById || (id => undefined),
                buildings,
                courses,
                `Official Exam Timetable - ${activeSemester?.name || ''}`,
                letterheadConfig,
                footerImageUrl,
                logoUrl
            );
            const link = document.createElement('a');
            link.href = pdfUrl;
            link.download = `Exam_Timetable_${activeSemester?.name || 'Semester'}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            onLogAction?.('Downloaded Exam Timetable PDF');
        } catch (error) {
            console.error("Failed to generate PDF:", error);
        } finally {
            setIsGeneratingPdf(false);
        }
    };

    const [visibleCoursesForManager, visibleSubjectsForManager, visibleDeptsForManager] = useMemo(() => {
        const safeDepts = departments || [];
        const safeCourses = courses || [];
        const safeSubjects = subjects || [];

        if (currentUser?.role === 'hod') {
            const hodDeptId = currentUser.departmentId;
            const depts = safeDepts.filter(d => d && d.id === hodDeptId);
            const coursesInDept = safeCourses.filter(c => c && c.departmentId === hodDeptId);
            const subjectsInDept = safeSubjects.filter(s => s && s.departmentId === hodDeptId);
            return [coursesInDept, subjectsInDept, depts];
        }
        return [safeCourses, safeSubjects, safeDepts];
    }, [currentUser, courses, subjects, departments]);

    const conflictSummary = useMemo(() => {
        const safeConflicts = Array.isArray(timetableConflicts) ? timetableConflicts : [];
        if (safeConflicts.length === 0) return { total: 0, room: 0, lecturer: 0 };
        return {
            total: safeConflicts.length,
            room: safeConflicts.filter(c => c.type === 'room').length,
            lecturer: safeConflicts.filter(c => c.type === 'lecturer').length,
        };
    }, [timetableConflicts]);

    const isSchool = currentInstitution?.institutionType === 'Primary' || currentInstitution?.institutionType === 'Secondary';

    return (
        <div className="space-y-8">
            <style>{`
                .btn-primary { padding: 0.5rem 1rem; background-color: var(--color-primary); color: white; border-radius: 1rem; font-weight: 800; transition: all 0.2s; border: none; cursor: pointer; }
                .btn-primary:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); } .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
                .btn-secondary { padding: 0.5rem 1rem; background-color: #f1f5f9; color: #475569; border-radius: 1rem; font-weight: 700; transition: all 0.2s; border: 1px solid #e2e8f0; cursor: pointer; }
                .dark .btn-secondary { background-color: #1e293b; color: #f1f5f9; border-color: #334155; }
                .file-input { display: block; width: 100%; text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)]/10 file:text-[var(--color-primary)] hover:file:bg-[var(--color-primary)]/20 dark:file:bg-slate-700 dark:file:text-slate-200 dark:hover:file:bg-slate-600; }
            `}</style>

            <div className="flex border-b border-slate-200 dark:border-slate-700 no-print bg-white dark:bg-slate-800 rounded-3xl p-1 shadow-sm overflow-x-auto no-scrollbar">
                <button
                    onClick={() => { setSubTab('lessons'); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${subTab === 'lessons' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <CalendarDaysIcon className="w-4 h-4" /> Lesson Schedule
                </button>
                <button
                    onClick={() => { setSubTab('exams'); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${subTab === 'exams' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <SparklesIcon className="w-4 h-4" /> Exam Schedule
                </button>
                <button
                    onClick={() => { setSubTab('wall_poster'); setError(null); }}
                    className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${subTab === 'wall_poster' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100' : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    <PrinterIcon className="w-4 h-4" /> Wall Posters
                </button>
            </div>

            {subTab === 'lessons' ? (
                <>
                    <section className="animate-fade-in">
                        <h3 className="text-xl font-black uppercase tracking-tighter mb-4 text-slate-900 dark:text-white">Authorised Timetable Publication</h3>
                        <div className="bg-white dark:bg-slate-800 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-700">
                            {finalTimetableUrl ? (
                                <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-green-100 dark:bg-green-900/40 text-green-600 rounded-3xl shadow-sm">
                                            <CheckCircleIcon className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-black uppercase text-slate-900 dark:text-white tracking-tight">Master Document Published</p>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Active for all faculty and student portals Portals.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <a href={finalTimetableUrl} download="Final_Timetable" className="btn-secondary flex items-center gap-2 h-11 px-8 uppercase text-[10px] font-black" onClick={() => onLogAction?.('Downloaded Final Timetable')}>
                                            <DocumentArrowDownIcon className="w-4 h-4" /> Download
                                        </a>
                                        <button onClick={handleRemovePublication} className="text-red-600 font-black text-[10px] uppercase tracking-widest px-6 hover:bg-red-50 h-11 rounded-xl transition-all">Revoke</button>
                                    </div>
                                </div>
                            ) : (
                                <form onSubmit={handlePublishUpload} className="space-y-6">
                                    <div>
                                        <p className="text-sm text-slate-500 font-medium">
                                            Upload the official authorised master timetable (PDF/Excel) for the institution.
                                        </p>
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-6 items-end">
                                        <div className="flex-grow">
                                            <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 ml-1">Document Source</label>
                                            <input
                                                type="file"
                                                onChange={e => setPublishFile(e.target.files ? e.target.files[0] : null)}
                                                className="mt-1 file-input"
                                            />
                                        </div>
                                        <button type="submit" disabled={isUploading || !publishFile} className="btn-primary h-12 px-12 shadow-lg shadow-indigo-200">
                                            {isUploading ? 'Syncing...' : 'Authorise & Publish'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </section>

                    <section className="animate-fade-in-up">
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                            <h3 className="text-xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">AI Generation Hub</h3>
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={() => setIsImportModalOpen(true)}
                                    disabled={isLoading || !activeAcademicYear || !activeSemester}
                                    className="btn-secondary h-11 flex items-center gap-2 text-xs font-black uppercase"
                                >
                                    <ArrowUpTrayIcon className="w-5 h-5" /> Import Datalink
                                </button>
                                <Tooltip text={isSchool ? "AI generates an optimal grade-based schedule." : "AI optimizes lecturer and room allocations."}>
                                    <button
                                        onClick={handleGenerateLessons}
                                        disabled={isLoading || allocations.length === 0 || !activeAcademicYear || !activeSemester}
                                        className="btn-primary h-11 flex items-center gap-2 shadow-lg shadow-indigo-100"
                                    >
                                        <SparklesIcon className="w-5 h-5" />
                                        {isLoading ? 'Processing Neural Graph...' : 'Execute AI Generation'}
                                    </button>
                                </Tooltip>
                            </div>
                        </div>

                        {isLoading && (
                            <div className="mb-6 p-12 bg-white dark:bg-slate-800 rounded-[3rem] shadow-sm border text-center border-slate-100 dark:border-slate-700">
                                <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                                <h4 className="text-xl font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Consulting AI Knowledge Base</h4>
                                <p className="text-sm text-slate-500 mt-2 font-medium">Resolving multi-resource constraints and workload balancing...</p>
                            </div>
                        )}

                        {error && <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-2xl border border-red-100 text-xs font-black uppercase tracking-widest flex items-center gap-3"><ExclamationTriangleIcon className="w-5 h-5" /> {error}</div>}

                        {!isLoading && generatedTimetable && generatedTimetable.length > 0 && (
                            <div className={`mt-4 p-4 rounded-lg shadow-sm ${conflictSummary.total > 0 ? 'bg-red-100 dark:bg-red-950/40' : 'bg-green-100 dark:bg-green-950/40'}`}>
                                <div className="flex items-start">
                                    <div className="flex-shrink-0">
                                        {conflictSummary.total > 0 ? (
                                            <ExclamationTriangleIcon className="h-6 w-6 text-red-500" aria-hidden="true" />
                                        ) : (
                                            <CheckIcon className="h-6 w-6 text-green-500" aria-hidden="true" />
                                        )}
                                    </div>
                                    <div className="ml-3">
                                        <h3 className={`text-lg font-medium ${conflictSummary.total > 0 ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'}`}>
                                            {conflictSummary.total > 0 ? `Detected ${conflictSummary.total} Conflict(s)` : 'No Conflicts Detected'}
                                        </h3>
                                        <div className={`mt-2 text-sm ${conflictSummary.total > 0 ? 'text-red-700 dark:text-red-300' : 'text-green-700 dark:text-green-300'}`}>
                                            {conflictSummary.total > 0 ? (
                                                <ul className="list-disc pl-5 space-y-1">
                                                    {conflictSummary.lecturer > 0 && <li>{conflictSummary.lecturer} lecturer double booking(s)</li>}
                                                    {conflictSummary.room > 0 && <li>{conflictSummary.room} room double booking(s)</li>}
                                                </ul>
                                            ) : (
                                                <p>The generated timetable has no lecturer or room double bookings.</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {generatedTimetable && generatedTimetable.length > 0 && !isLoading && (
                            <div className="animate-fade-in-up">
                                <div className="flex justify-between items-center mb-6">
                                    <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Generation Preview Matrix</h4>
                                    <div className="flex gap-2">
                                        <button onClick={handlePublish} disabled={isPublishing} className="btn-primary bg-indigo-600 shadow-indigo-200 text-[10px] uppercase tracking-widest h-10">
                                            {isPublishing ? 'Publishing...' : 'Commit & Authorise'}
                                        </button>
                                        <button onClick={exportToExcel} className="btn-secondary text-[10px] uppercase tracking-widest h-10">Export Datalink</button>
                                    </div>
                                </div>
                                <TimetablesView
                                    generatedTimetable={generatedTimetable}
                                    subjects={visibleSubjectsForManager}
                                    lecturers={lecturers || []}
                                    departments={visibleDeptsForManager}
                                    courses={visibleCoursesForManager}
                                    buildings={buildings || []}
                                    rooms={rooms || []}
                                    allocations={allocations || []}
                                    getSubjectById={getSubjectById || (id => undefined)}
                                    getLecturerById={getLecturerById || (id => undefined)}
                                    getRoomById={getRoomById || (id => undefined)}
                                    letterheadConfig={letterheadConfig}
                                    logoUrl={logoUrl}
                                    footerImageUrl={footerImageUrl}
                                    currentUser={currentUser}
                                    timetableSettings={timetableSettings}
                                    onSaveTimetableSettings={onSaveTimetableSettings || (() => { })}
                                    academicYears={academicYears || []}
                                    activeSemester={activeSemester || null}
                                    onLogAction={onLogAction}
                                    currentInstitution={currentInstitution}
                                />
                            </div>
                        )}
                    </section>
                </>
            ) : subTab === 'exams' ? (
                <section className="animate-fade-in space-y-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8 bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700">
                        <div>
                            <h3 className="text-3xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Exam Timetable Engine</h3>
                            <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mt-1">Authorising assessments for {activeSemester?.name || 'Academic Period'}</p>
                        </div>
                        <button
                            onClick={handleGenerateExams}
                            disabled={isLoading || (subjects || []).length === 0 || !activeAcademicYear || !activeSemester}
                            className="btn-primary h-14 flex items-center gap-3 shadow-xl shadow-indigo-200 px-12"
                        >
                            <SparklesIcon className="w-6 h-6" />
                            {isLoading ? 'Architecting Matrix...' : 'Run Exam AI'}
                        </button>
                    </div>

                    {isLoading && (
                        <div className="p-16 bg-white dark:bg-slate-800 rounded-[3rem] border border-slate-100 dark:border-slate-700 text-center shadow-sm">
                            <div className="w-20 h-20 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-8"></div>
                            <h4 className="text-xl font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Designing Assessment Matrix</h4>
                            <p className="text-sm text-slate-500 mt-2 font-medium">Validating invigilator loads and room capacities across cycles...</p>
                        </div>
                    )}

                    {error && <div className="p-5 bg-red-50 text-red-700 rounded-[2rem] border border-red-100 text-xs font-black uppercase tracking-widest flex items-center gap-3"><ExclamationTriangleIcon className="w-6 h-6" /> {error}</div>}

                    {examTimetable && examTimetable.length > 0 && !isLoading && (
                        <div className="space-y-6 animate-fade-in-up">
                            <div className="flex justify-between items-center">
                                <h4 className="font-black text-xs uppercase tracking-widest text-slate-400">Exam Schedule Registry</h4>
                                <div className="flex gap-3">
                                    <button onClick={() => window.print()} className="btn-secondary flex items-center gap-2 h-11 text-[10px] font-black px-6 uppercase tracking-widest">
                                        <PrinterIcon className="w-4 h-4" /> Print Registry
                                    </button>
                                    <button onClick={handleDownloadExamPdf} disabled={isGeneratingPdf} className="btn-primary flex items-center gap-2 h-11 text-[10px] font-black px-8 shadow-indigo-100 uppercase tracking-widest">
                                        <DocumentArrowDownIcon className="w-4 h-4" />
                                        {isGeneratingPdf ? 'Compiling...' : 'Export PDF'}
                                    </button>
                                </div>
                            </div>
                            <div className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
                                <ExamTimetableGrid
                                    entries={examTimetable}
                                    getSubjectById={getSubjectById || (id => undefined)}
                                    getLecturerById={getLecturerById || (id => undefined)}
                                    getRoomById={getRoomById || (id => undefined)}
                                    buildings={buildings}
                                    courses={courses}
                                    title={`Official Assessment Registry - ${activeSemester?.name || ''}`}
                                />
                            </div>
                        </div>
                    )}

                    {(!examTimetable || examTimetable.length === 0) && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-40 bg-white dark:bg-slate-800 rounded-[4rem] border-4 border-dashed border-slate-50 dark:border-slate-800 text-center opacity-40">
                            <CalendarDaysIcon className="w-24 h-24 text-slate-200 dark:text-slate-700 mb-6" />
                            <h4 className="text-2xl font-black text-slate-300 uppercase tracking-[0.3em]">No Assessment Data Found</h4>
                            <p className="text-sm font-bold uppercase tracking-widest mt-2">Execute AI Generation to architect the exam matrix</p>
                        </div>
                    )}
                </section>
            ) : (
                <WallPosterView
                    generatedTimetable={generatedTimetable}
                    subjects={subjects}
                    lecturers={lecturers}
                    rooms={rooms}
                    courses={courses}
                    departments={departments}
                    timetableSettings={timetableSettings}
                    institution={currentInstitution}
                    academicYear={activeAcademicYear}
                    semester={activeSemester}
                />
            )}

            {isImportModalOpen && activeAcademicYear && activeSemester && (
                <TimetableImporter
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    subjects={subjects || []}
                    lecturers={lecturers || []}
                    rooms={rooms || []}
                    onImport={async (entries) => {
                        await onTimetableGenerated(entries, activeAcademicYear.id, activeSemester.id);
                        onLogAction?.('Imported Timetable from Excel');
                    }}
                    academicYearId={activeAcademicYear.id}
                    semesterId={activeSemester.id}
                    timetableSettings={timetableSettings}
                />
            )}
        </div>
    );
};
